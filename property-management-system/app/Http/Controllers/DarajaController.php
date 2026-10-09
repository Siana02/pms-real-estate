<?php

namespace App\Http\Controllers;

use App\Models\DarajaIntegration;
use App\Models\DarajaStkCheckout;
use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Models\Tenant;
use App\Services\DarajaService;
use App\Services\PaymentReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class DarajaController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeManager($request);
        $integration = DarajaIntegration::where('organization_id', $request->user()->organization_id)->first();
        $base = rtrim((string) config('app.url'), '/');

        return response()->json([
            'configured' => (bool) $integration,
            'enabled' => (bool) $integration?->enabled,
            'environment' => $integration?->environment ?? 'sandbox',
            'shortcode' => $integration?->shortcode,
            'shortcode_type' => $integration?->shortcode_type ?? 'PayBill',
            'has_consumer_key' => (bool) $integration?->consumer_key,
            'has_consumer_secret' => (bool) $integration?->consumer_secret,
            'has_passkey' => (bool) $integration?->passkey,
            'c2b_registered_at' => $integration?->c2b_registered_at?->toIso8601String(),
            'stk_callback_url' => $base . '/api/webhooks/daraja/stk',
            'c2b_confirmation_url' => $base . '/api/webhooks/daraja/confirm',
            'c2b_validation_url' => $base . '/api/webhooks/daraja/validate',
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $this->authorizeManager($request);
        $organizationId = $request->user()->organization_id;
        $existing = DarajaIntegration::where('organization_id', $organizationId)->first();

        $validated = $request->validate([
            'environment' => ['required', Rule::in(['sandbox', 'production'])],
            'shortcode' => ['required', 'string', 'regex:/^\d{5,7}$/'],
            'shortcode_type' => ['required', Rule::in(['PayBill', 'Till'])],
            'consumer_key' => ['nullable', 'string', 'max:500'],
            'consumer_secret' => ['nullable', 'string', 'max:500'],
            'passkey' => ['nullable', 'string', 'max:1000'],
            'enabled' => ['required', 'boolean'],
        ]);

        if ($validated['environment'] === 'production' && !str_starts_with((string) config('app.url'), 'https://')) {
            return response()->json([
                'message' => 'Production Daraja requires APP_URL to use HTTPS so Safaricom can reach the callbacks.',
            ], 422);
        }

        $consumerKey = filled($validated['consumer_key'] ?? null) ? trim($validated['consumer_key']) : $existing?->consumer_key;
        $consumerSecret = filled($validated['consumer_secret'] ?? null) ? trim($validated['consumer_secret']) : $existing?->consumer_secret;
        $passkey = filled($validated['passkey'] ?? null) ? trim($validated['passkey']) : $existing?->passkey;

        abort_if(!filled($consumerKey) || !filled($consumerSecret), 422, 'Consumer key and consumer secret are required the first time you connect Daraja.');
        abort_if($validated['enabled'] && !filled($passkey), 422, 'A passkey is required to enable STK Push.');

        $integration = DarajaIntegration::updateOrCreate(
            ['organization_id' => $organizationId],
            [
                'environment' => $validated['environment'],
                'shortcode' => $validated['shortcode'],
                'shortcode_type' => $validated['shortcode_type'],
                'consumer_key' => $consumerKey,
                'consumer_secret' => $consumerSecret,
                'passkey' => $passkey,
                'enabled' => $validated['enabled'],
            ]
        );

        \Illuminate\Support\Facades\Cache::forget('daraja:token:' . $organizationId . ':' . $integration->environment);

        return response()->json([
            'message' => 'Daraja settings saved. Credentials are encrypted at rest and never returned by the API.',
            'configured' => true,
            'enabled' => $integration->enabled,
            'environment' => $integration->environment,
            'shortcode' => $integration->shortcode,
            'shortcode_type' => $integration->shortcode_type,
            'has_consumer_key' => (bool) $integration->consumer_key,
            'has_consumer_secret' => (bool) $integration->consumer_secret,
            'has_passkey' => (bool) $integration->passkey,
        ]);
    }

    public function registerC2B(Request $request, DarajaService $daraja): JsonResponse
    {
        $this->authorizeManager($request);
        $integration = DarajaIntegration::where('organization_id', $request->user()->organization_id)
            ->where('enabled', true)->firstOrFail();

        $base = rtrim((string) config('app.url'), '/');
        abort_if($integration->environment === 'production' && !str_starts_with($base, 'https://'), 422,
            'Production C2B registration requires an HTTPS APP_URL.');

        try {
            $response = \Illuminate\Support\Facades\Http::withToken($daraja->accessToken($integration))
                ->acceptJson()->asJson()->timeout(20)
                ->post($daraja->baseUrl($integration) . '/mpesa/c2b/v1/registerurl', [
                    'ShortCode' => $integration->shortcode,
                    'ResponseType' => 'Completed',
                    'ConfirmationURL' => $base . '/api/webhooks/daraja/confirm',
                    'ValidationURL' => $base . '/api/webhooks/daraja/validate',
                ]);
        } catch (Throwable $exception) {
            Log::warning('Daraja C2B URL registration request failed.', [
                'organization_id' => $integration->organization_id,
                'exception' => $exception::class,
            ]);
            return response()->json(['message' => 'Safaricom could not be reached to register C2B callbacks.'], 502);
        }

        if (!$response->successful() || (string) $response->json('ResponseCode') !== '0') {
            Log::warning('Daraja C2B URL registration was rejected.', [
                'organization_id' => $integration->organization_id,
                'http_status' => $response->status(),
                'response_code' => $response->json('ResponseCode'),
            ]);
            return response()->json([
                'message' => 'Safaricom did not accept the callback URLs. Check your Daraja environment, shortcode, and callback HTTPS availability.',
            ], 502);
        }

        $integration->update(['c2b_registered_at' => now()]);
        return response()->json([
            'message' => 'C2B confirmation and validation URLs registered with Safaricom.',
            'c2b_registered_at' => $integration->fresh()->c2b_registered_at?->toIso8601String(),
        ]);
    }

    public function initiateStk(Request $request, DarajaService $daraja): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'tenant', 403, 'Only tenant accounts can initiate rent payments.');

        $tenant = null;
        if (Schema::hasColumn('users', 'tenant_id') && $user->tenant_id) {
            $tenant = Tenant::where('id', $user->tenant_id)->where('organization_id', $user->organization_id)->first();
        }
        if (!$tenant && $user->email) {
            $tenant = Tenant::where('organization_id', $user->organization_id)->where('email', $user->email)->first();
        }
        abort_if(!$tenant, 404, 'No tenant record is linked to your account.');

        $today = CarbonImmutable::today();
        $lease = Leases::query()
            ->where('organization_id', $tenant->organization_id)
            ->where('tenant_id', $tenant->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $today->toDateString())
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $today->toDateString()))
            ->orderByDesc('start_date')->first();
        abort_if(!$lease, 422, 'You do not have an active lease to pay rent against.');

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:250000'],
            'phone' => ['required', 'string', 'max:30'],
            'payment_destination_id' => ['required', 'integer'],
        ]);

        $destination = PaymentDestination::where('id', $validated['payment_destination_id'])
            ->where('organization_id', $lease->organization_id)
            ->where('property_id', $lease->property_id)
            ->where('is_active', true)
            ->whereIn('method', ['mpesa_till', 'mpesa_paybill'])->firstOrFail();

        $integration = DarajaIntegration::where('organization_id', $lease->organization_id)
            ->where('enabled', true)->first();
        abort_if(!$integration, 422, 'M-PESA STK Push has not been connected by your property manager.');

        $destinationShortcode = $destination->method === 'mpesa_till'
            ? ($destination->details['till'] ?? null)
            : ($destination->details['paybill'] ?? null);
        abort_unless((string) $destinationShortcode === (string) $integration->shortcode, 422,
            'This payment destination does not match the organization’s connected Daraja shortcode.');

        try {
            $phone = $daraja->normalizePhone($validated['phone']);
        } catch (RuntimeException) {
            abort(422, 'Enter a valid Kenyan M-PESA phone number.');
        }

        $amount = (int) $validated['amount'];
        $fullReference = (string) ($lease->tenant_payment_reference ?: ('LEASE' . $lease->id));
        $shortReference = 'P' . strtoupper(base_convert((string) $lease->id, 10, 36));

        $checkout = DarajaStkCheckout::create([
            'organization_id' => $lease->organization_id,
            'lease_id' => $lease->id,
            'payment_destination_id' => $destination->id,
            'account_reference' => substr($shortReference, 0, 12),
            'tenant_payment_reference' => $fullReference,
            'phone' => $phone,
            'amount' => $amount,
            'status' => 'requesting',
        ]);

        try {
            $response = $daraja->initiateStk($integration, $phone, $amount, $checkout->account_reference);
            $checkout->update([
                'checkout_request_id' => $response['CheckoutRequestID'],
                'merchant_request_id' => $response['MerchantRequestID'] ?? null,
                'status' => 'pending',
                'result_description' => $response['CustomerMessage'] ?? 'STK Push sent to phone.',
            ]);
        } catch (Throwable $exception) {
            $checkout->update(['status' => 'failed', 'result_description' => 'Daraja could not start the STK Push request.']);
            Log::warning('Daraja STK initiation failed.', [
                'organization_id' => $lease->organization_id,
                'exception' => $exception::class,
            ]);
            return response()->json(['message' => 'Safaricom could not start the M-PESA prompt. Check the number and try again.'], 502);
        }

        return response()->json([
            'message' => 'M-PESA prompt sent. Enter your PIN on your phone to complete payment.',
            'status' => 'pending',
        ], 202);
    }

    public function stkCallback(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        $payload = $request->all();
        $callback = data_get($payload, 'Body.stkCallback');
        if (!is_array($callback) || empty($callback['CheckoutRequestID'])) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload'], 400);
        }

        $checkout = DarajaStkCheckout::where('checkout_request_id', $callback['CheckoutRequestID'])->first();
        if (!$checkout) {
            Log::warning('Daraja STK callback did not match a checkout request.');
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ((string) ($callback['ResultCode'] ?? '') !== '0') {
            $checkout->update([
                'status' => 'failed',
                'result_code' => (string) ($callback['ResultCode'] ?? ''),
                'result_description' => mb_substr((string) ($callback['ResultDesc'] ?? 'Payment not completed.'), 0, 1000),
                'callback_payload' => $payload,
            ]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        $items = collect(data_get($callback, 'CallbackMetadata.Item', []))
            ->mapWithKeys(fn ($item) => isset($item['Name']) ? [$item['Name'] => ($item['Value'] ?? null)] : []);
        $receipt = (string) ($items->get('MpesaReceiptNumber') ?? '');
        $amount = (float) ($items->get('Amount') ?? 0);
        $phone = (string) ($items->get('PhoneNumber') ?? $checkout->phone);

        if ($receipt === '' || $amount <= 0) {
            $checkout->update(['status' => 'needs_review', 'callback_payload' => $payload]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        try {
            DB::transaction(function () use ($checkout, $payload, $receipt, $amount, $phone, $items, $reconciliation) {
                $locked = DarajaStkCheckout::whereKey($checkout->id)->lockForUpdate()->firstOrFail();
                if ($locked->status === 'completed' && $locked->mpesa_receipt === $receipt) return;

                $matchesAmount = abs($amount - (float) $locked->amount) < 0.001;
                $locked->update([
                    'status' => $matchesAmount ? 'completed' : 'needs_review',
                    'result_code' => '0',
                    'result_description' => $matchesAmount
                        ? 'Payment confirmed by Safaricom.'
                        : 'Callback amount differs from the requested amount; manager review is required.',
                    'mpesa_receipt' => $receipt,
                    'completed_at' => now(),
                    'callback_payload' => $payload,
                ]);

                if (!$matchesAmount) {
                    $reconciliation->ingest([
                        'organization_id' => $locked->organization_id,
                        'payment_destination_id' => $locked->payment_destination_id,
                        'provider' => 'mpesa_daraja',
                        'external_transaction_id' => $receipt,
                        'amount' => $amount,
                        'currency' => 'KES',
                        'payer_phone' => null,
                        'payment_reference' => 'DAR-REVIEW-' . $locked->id,
                        'transaction_at' => now(),
                        'raw_payload' => ['source' => 'stk_callback', 'amount_mismatch' => true],
                    ]);
                    return;
                }

                $reconciliation->ingest([
                    'organization_id' => $locked->organization_id,
                    'payment_destination_id' => $locked->payment_destination_id,
                    'provider' => 'mpesa_daraja',
                    'external_transaction_id' => $receipt,
                    'amount' => $amount,
                    'currency' => 'KES',
                    'payer_phone' => $phone,
                    'payment_reference' => $locked->tenant_payment_reference,
                    'transaction_at' => $this->transactionDate($items->get('TransactionDate')),
                    'raw_payload' => ['source' => 'stk_callback', 'checkout_id' => $locked->id],
                ]);
            }, 3);
        } catch (Throwable $exception) {
            Log::error('Daraja STK callback reconciliation failed.', [
                'checkout_id' => $checkout->id,
                'exception' => $exception::class,
            ]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Processing failed; retry callback'], 500);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bConfirmation(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        $payload = $request->all();
        $shortcode = (string) ($payload['BusinessShortCode'] ?? '');
        $receipt = trim((string) ($payload['TransID'] ?? ''));
        $amount = (float) ($payload['TransAmount'] ?? 0);
        if ($shortcode === '' || $receipt === '' || $amount <= 0) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Required transaction fields are missing'], 400);
        }

        $integration = DarajaIntegration::where('shortcode', $shortcode)->where('enabled', true)->first();
        if (!$integration) {
            Log::warning('Daraja C2B callback received for an unconfigured shortcode.');
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Shortcode is not configured.']);
        }

        $destination = PaymentDestination::where('organization_id', $integration->organization_id)
            ->where('is_active', true)->whereIn('method', ['mpesa_till', 'mpesa_paybill'])
            ->where(function ($query) use ($shortcode) {
                $query->whereJsonContains('details->paybill', $shortcode)
                    ->orWhereJsonContains('details->till', $shortcode);
            })->first();

        try {
            $reconciliation->ingest([
                'organization_id' => $integration->organization_id,
                'payment_destination_id' => $destination?->id,
                'provider' => 'mpesa_daraja',
                'external_transaction_id' => $receipt,
                'amount' => $amount,
                'currency' => 'KES',
                'payer_phone' => (string) ($payload['MSISDN'] ?? ''),
                'payment_reference' => trim((string) ($payload['BillRefNumber'] ?? '')) ?: null,
                'transaction_at' => $this->transactionDate($payload['TransTime'] ?? null),
                'raw_payload' => [
                    'source' => 'c2b_confirmation',
                    'business_short_code' => $shortcode,
                    'bill_reference' => trim((string) ($payload['BillRefNumber'] ?? '')),
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('Daraja C2B reconciliation failed.', [
                'organization_id' => $integration->organization_id,
                'receipt' => $receipt,
                'exception' => $exception::class,
            ]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Processing failed; retry callback'], 500);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bValidation(Request $request): JsonResponse
    {
        // Keep validation permissive so a missing tenant reference cannot cause a genuine
        // incoming payment to be rejected before the confirmation callback reaches us.
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    private function transactionDate(mixed $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (strlen($digits) === 14) {
            try {
                return CarbonImmutable::createFromFormat('YmdHis', $digits)?->toDateTimeString() ?? now()->toDateTimeString();
            } catch (Throwable) {
                return now()->toDateTimeString();
            }
        }
        try {
            return $value ? CarbonImmutable::parse($value)->toDateTimeString() : now()->toDateTimeString();
        } catch (Throwable) {
            return now()->toDateTimeString();
        }
    }

    private function authorizeManager(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403,
            'Only an organization owner or administrator can manage Daraja.');
    }
}
