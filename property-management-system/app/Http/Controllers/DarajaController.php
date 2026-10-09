<?php

namespace App\Http\Controllers;

use App\Models\DarajaIntegration;
use App\Models\DarajaStkCheckout;
use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Services\DarajaService;
use App\Services\PaymentReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Throwable;

class DarajaController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeManager($request);
        $integration = DarajaIntegration::where('organization_id', $request->user()->organization_id)->first();

        return response()->json([
            'configured' => (bool) $integration,
            'enabled' => (bool) $integration?->enabled,
            'environment' => $integration?->environment ?? 'sandbox',
            'shortcode' => $integration?->shortcode,
            'shortcode_type' => $integration?->shortcode_type ?? 'PayBill',
            'has_consumer_key' => (bool) $integration?->consumer_key,
            'has_consumer_secret' => (bool) $integration?->consumer_secret,
            'has_passkey' => (bool) $integration?->passkey,
            ...$this->callbackUrls($integration),
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $this->authorizeManager($request);
        $validated = $request->validate([
            'environment' => ['required', Rule::in(['sandbox', 'production'])],
            'shortcode' => ['required', 'string', 'regex:/^\d{5,7}$/'],
            'shortcode_type' => ['required', Rule::in(['PayBill', 'Till'])],
            'consumer_key' => ['nullable', 'string', 'max:500'],
            'consumer_secret' => ['nullable', 'string', 'max:500'],
            'passkey' => ['nullable', 'string', 'max:1000'],
            'enabled' => ['required', 'boolean'],
        ]);

        abort_if(
            $validated['environment'] === 'production' && !str_starts_with((string) config('app.url'), 'https://'),
            422,
            'Production Daraja callbacks require APP_URL to use HTTPS.'
        );

        $organizationId = $request->user()->organization_id;
        $existing = DarajaIntegration::where('organization_id', $organizationId)->first();
        $consumerKey = $validated['consumer_key'] ?? null;
        $consumerSecret = $validated['consumer_secret'] ?? null;
        $passkey = $validated['passkey'] ?? null;

        if ($existing) {
            $consumerKey = filled($consumerKey) ? $consumerKey : $existing->consumer_key;
            $consumerSecret = filled($consumerSecret) ? $consumerSecret : $existing->consumer_secret;
            $passkey = filled($passkey) ? $passkey : $existing->passkey;
        }

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
                'webhook_token' => $existing?->webhook_token ?: \Illuminate\Support\Str::random(64),
                'enabled' => $validated['enabled'],
            ]
        );

        Cache::forget('daraja:token:' . $organizationId . ':' . $integration->environment);

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
        ] + $this->callbackUrls($integration));
    }

    public function initiateStk(Request $request, DarajaService $daraja): JsonResponse
    {
        $tenant = $request->user()->tenant;
        abort_if(!$tenant, 403, 'This endpoint is only available to tenant accounts.');

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:250000', 'regex:/^\d+(\.00?)?$/'],
            'phone' => ['required', 'string', 'max:30'],
        ]);

        $lease = Leases::query()
            ->where('tenant_id', $tenant->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', now()->toDateString())
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', now()->toDateString()))
            ->latest('id')->first();
        abort_if(!$lease, 422, 'You do not have an active lease to pay rent against.');

        $integration = DarajaIntegration::where('organization_id', $lease->organization_id)->where('enabled', true)->first();
        abort_if(!$integration, 422, 'M-Pesa STK Push has not been configured by your property manager.');

        $destination = PaymentDestination::where('organization_id', $lease->organization_id)
            ->where('property_id', $lease->property_id)->where('is_active', true)
            ->whereIn('method', ['mpesa_till', 'mpesa_paybill'])
            ->where(function ($query) use ($integration) {
                $query->whereJsonContains('details->paybill', $integration->shortcode)
                    ->orWhereJsonContains('details->till', $integration->shortcode);
            })->first();
        abort_if(!$destination, 422, 'Your property manager has not configured a PayBill or Till destination.');

        $phone = $daraja->normalizePhone($validated['phone']);
        $amount = (int) $validated['amount'];
        $reference = (string) ($lease->tenant_payment_reference ?: ('LEASE' . $lease->id));

        $response = $daraja->initiateStk($integration, $phone, $amount, $reference);

        DarajaStkCheckout::create([
            'organization_id' => $lease->organization_id,
            'lease_id' => $lease->id,
            'payment_destination_id' => $destination->id,
            'checkout_request_id' => $response['CheckoutRequestID'],
            'merchant_request_id' => $response['MerchantRequestID'] ?? null,
            'account_reference' => $reference,
            'phone' => $phone,
            'amount' => $amount,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'STK Push sent. Enter your M-Pesa PIN on your phone to complete payment.',
            'checkout_request_id' => $response['CheckoutRequestID'],
            'customer_message' => $response['CustomerMessage'] ?? null,
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

        $integration = DarajaIntegration::where('organization_id', $checkout->organization_id)->first();
        abort_unless($this->validWebhookToken($request, $integration), 403, 'Invalid callback token.');

        $resultCode = (int) ($callback['ResultCode'] ?? -1);
        if ($resultCode !== 0) {
            $checkout->update(['status' => 'failed', 'callback_payload' => $payload]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        $items = collect(data_get($callback, 'CallbackMetadata.Item', []))
            ->mapWithKeys(fn ($item) => isset($item['Name']) ? [$item['Name'] => ($item['Value'] ?? null)] : []);
        $receipt = (string) ($items->get('MpesaReceiptNumber') ?? '');
        $amount = (float) ($items->get('Amount') ?? 0);
        $phone = (string) ($items->get('PhoneNumber') ?? $checkout->phone);

        if ($receipt === '' || $amount <= 0 || abs($amount - (float) $checkout->amount) > 0.001) {
            $checkout->update(['status' => 'needs_review', 'callback_payload' => $payload]);
            Log::warning('Daraja STK callback had missing receipt or amount mismatch.', ['checkout_id' => $checkout->id]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        DB::transaction(function () use ($checkout, $payload, $receipt, $amount, $phone, $reconciliation) {
            $locked = DarajaStkCheckout::whereKey($checkout->id)->lockForUpdate()->first();
            if ($locked->status === 'completed') {
                return;
            }
            $locked->update(['status' => 'completed', 'mpesa_receipt' => $receipt, 'callback_payload' => $payload]);
            $reconciliation->ingest([
                'organization_id' => $locked->organization_id,
                'payment_destination_id' => $locked->payment_destination_id,
                'provider' => 'mpesa',
                'external_transaction_id' => $receipt,
                'amount' => $amount,
                'currency' => 'KES',
                'payer_phone' => (string) $phone,
                'payment_reference' => $locked->account_reference,
                'transaction_at' => now(),
                'raw_payload' => ['source' => 'stk_callback', 'callback' => $payload],
            ]);
        });

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bConfirmation(Request $request, PaymentReconciliationService $reconciliation): JsonResponse
    {
        $payload = $request->all();
        $shortcode = (string) ($payload['BusinessShortCode'] ?? '');
        $receipt = (string) ($payload['TransID'] ?? '');
        $amount = (float) ($payload['TransAmount'] ?? 0);
        $reference = trim((string) ($payload['BillRefNumber'] ?? ''));

        if ($shortcode === '' || $receipt === '' || $amount <= 0 || $reference === '') {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Required transaction fields are missing'], 400);
        }

        $integration = DarajaIntegration::where('shortcode', $shortcode)->where('enabled', true)->first();
        if (!$integration) {
            Log::warning('Daraja C2B callback received for an unconfigured shortcode.');
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        abort_unless($this->validWebhookToken($request, $integration), 403, 'Invalid callback token.');

        $destination = PaymentDestination::where('organization_id', $integration->organization_id)
            ->where('is_active', true)->whereIn('method', ['mpesa_till', 'mpesa_paybill'])
            ->where(function ($query) use ($shortcode) {
                $query->whereJsonContains('details->paybill', $shortcode)->orWhereJsonContains('details->till', $shortcode);
            })->first();

        try {
            $reconciliation->ingest([
                'organization_id' => $integration->organization_id,
                'payment_destination_id' => $destination?->id,
                'provider' => 'mpesa',
                'external_transaction_id' => $receipt,
                'amount' => $amount,
                'currency' => 'KES',
                'payer_phone' => (string) ($payload['MSISDN'] ?? ''),
                'payment_reference' => $reference,
                'transaction_at' => $this->transactionDate($payload['TransTime'] ?? null),
                'raw_payload' => ['source' => 'c2b_confirmation', 'callback' => $payload],
            ]);
        } catch (Throwable $exception) {
            Log::error('Daraja C2B reconciliation failed.', ['receipt' => $receipt, 'exception' => $exception::class]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Processing failed; retry callback']);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bValidation(Request $request): JsonResponse
    {
        $shortcode = (string) ($request->input('BusinessShortCode') ?? $request->input('ShortCode') ?? '');
        $integration = DarajaIntegration::where('shortcode', $shortcode)->where('enabled', true)->first();
        if (!$integration || !$this->validWebhookToken($request, $integration)) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid shortcode or callback token']);
        }

        // Accept authenticated transactions even if the lease reference needs manager review.
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }


    private function callbackUrls(?DarajaIntegration $integration): array
    {
        if (!$integration || !$integration->webhook_token) {
            return ['stk_callback_url' => null, 'c2b_confirmation_url' => null, 'c2b_validation_url' => null];
        }
        $base = rtrim((string) config('app.url'), '/');
        $query = '?token=' . rawurlencode($integration->webhook_token);
        return [
            'stk_callback_url' => $base . '/api/webhooks/daraja/stk' . $query,
            'c2b_confirmation_url' => $base . '/api/webhooks/daraja/confirm' . $query,
            'c2b_validation_url' => $base . '/api/webhooks/daraja/validate' . $query,
        ];
    }

    private function validWebhookToken(Request $request, ?DarajaIntegration $integration): bool
    {
        $provided = (string) $request->query('token', '');
        $expected = (string) ($integration?->webhook_token ?? '');
        return $provided !== '' && $expected !== '' && hash_equals($expected, $provided);
    }

    private function transactionDate($value): string
    {
        if (is_string($value) && preg_match('/^\d{14}$/', $value)) {
            return \Carbon\CarbonImmutable::createFromFormat('YmdHis', $value)->toDateTimeString();
        }
        return now()->toDateTimeString();
    }

    private function authorizeManager(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403, 'Only an organization owner or administrator can manage Daraja.');
    }
}
