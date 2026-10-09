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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use RuntimeException;
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
            'c2b_registered_at' => $integration?->c2b_registered_at?->toIso8601String(),
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

        if ($validated['environment'] === 'production' && !str_starts_with((string) config('app.url'), 'https://')) {
            return response()->json([
                'message' => 'Production Daraja requires APP_URL to use HTTPS so Safaricom can reach the callbacks.',
            ], 422);
        }

        $organizationId = $request->user()->organization_id;
        $existing = DarajaIntegration::where('organization_id', $organizationId)->first();
        $environmentChanged = $existing && $existing->environment !== $validated['environment'];
        $shortcodeChanged = $existing && $existing->shortcode !== $validated['shortcode'];
        $configurationChanged = $environmentChanged || $shortcodeChanged;
        $consumerKey = filled($validated['consumer_key'] ?? null)
            ? trim($validated['consumer_key'])
            : ($environmentChanged ? null : $existing?->consumer_key);
        $consumerSecret = filled($validated['consumer_secret'] ?? null)
            ? trim($validated['consumer_secret'])
            : ($environmentChanged ? null : $existing?->consumer_secret);
        $passkey = filled($validated['passkey'] ?? null)
            ? trim($validated['passkey'])
            : ($configurationChanged ? null : $existing?->passkey);

        abort_if(!filled($consumerKey) || !filled($consumerSecret), 422,
            'Consumer key and consumer secret are required for this Daraja environment.');
        abort_if($validated['enabled'] && !filled($passkey), 422,
            'Enter the passkey for the selected shortcode to enable STK Push.');

        $integration = DarajaIntegration::updateOrCreate(
            ['organization_id' => $organizationId],
            [
                'environment' => $validated['environment'],
                'shortcode' => $validated['shortcode'],
                'shortcode_type' => $validated['shortcode_type'],
                'callback_token' => $existing?->callback_token ?: Str::random(48),
                'consumer_key' => $consumerKey,
                'consumer_secret' => $consumerSecret,
                'passkey' => $passkey,
                'enabled' => $validated['enabled'],
                'c2b_registered_at' => $configurationChanged ? null : $existing?->c2b_registered_at,
            ]
        );

        Cache::forget('daraja:token:' . $organizationId . ':sandbox');
        Cache::forget('daraja:token:' . $organizationId . ':production');

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
            'c2b_registered_at' => $integration->c2b_registered_at?->toIso8601String(),
            ...$this->callbackUrls($integration),
        ]);
    }

    public function registerC2B(Request $request, DarajaService $daraja): JsonResponse
    {
        $this->authorizeManager($request);
        $integration = DarajaIntegration::where('organization_id', $request->user()->organization_id)->firstOrFail();
        abort_if(!$integration->enabled, 422, 'Enable Daraja before registering C2B callbacks.');

        if (!str_starts_with((string) config('app.url'), 'https://')) {
            return response()->json(['message' => 'C2B callback registration requires APP_URL to use HTTPS.'], 422);
        }

        $urls = $this->callbackUrls($integration);
        try {
            $result = $daraja->registerC2BUrls($integration, $urls['c2b_confirmation_url'], $urls['c2b_validation_url']);
        } catch (Throwable $exception) {
            Log::warning('Daraja C2B URL registration failed.', [
                'organization_id' => $integration->organization_id,
                'exception' => $exception::class,
            ]);
            return response()->json([
                'message' => 'Safaricom could not register the C2B URLs. Check the shortcode, Daraja app permissions, environment and callback URL, then try again.',
            ], 502);
        }

        $integration->update(['c2b_registered_at' => now()]);

        return response()->json([
            'message' => 'C2B confirmation and validation URLs registered with Safaricom.',
            'c2b_registered_at' => $integration->fresh()->c2b_registered_at?->toIso8601String(),
            'response_description' => $result['ResponseDescription'] ?? 'Success',
            ...$urls,
        ]);
    }

    public function initiateStk(Request $request, DarajaService $daraja): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'tenant', 403, 'Only tenant accounts can initiate rent payments.');

        $tenant = $user->tenant;
        if (!$tenant && $user->email) {
            $tenant = Tenant::where('organization_id', $user->organization_id)
                ->where('email', $user->email)->first();
        }
        abort_if(!$tenant || (int) $tenant->organization_id !== (int) $user->organization_id, 404, 'No tenant record is linked to your account.');

        $today = CarbonImmutable::today();
        $lease = Leases::query()
            ->where('organization_id', $tenant->organization_id)
            ->where('tenant_id', $tenant->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $today->toDateString())
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $today->toDateString()))
            ->orderByDesc('start_date')->first();
        abort_if(!$lease, 422, 'You do not have an active lease to pay rent against.');

        $readyDestinations = PaymentDestination::where('organization_id', $lease->organization_id)
            ->where('property_id', $lease->property_id)
            ->where('is_active', true)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])
            ->get()
            ->filter(fn (PaymentDestination $destination) => $destination->stkPushReady())
            ->values();

        abort_if($readyDestinations->isEmpty(), 422,
            'M-PESA STK Push is not ready for this property. The merchant configuration must be verified first.');

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:250000'],
            'phone' => ['required', 'string', 'max:30'],
            'payment_destination_id' => ['nullable', 'integer'],
        ]);

        if (!empty($validated['payment_destination_id'])) {
            $destination = $readyDestinations->firstWhere('id', (int) $validated['payment_destination_id']);
            abort_if(!$destination, 422, 'The selected payment destination is not available for this lease.');
        } else {
            abort_if($readyDestinations->count() !== 1, 422,
                'This property has multiple STK-ready destinations. Select the payment destination before paying.');
            $destination = $readyDestinations->first();
        }

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
            'payment_destination_id' => $destination?->id,
            'account_reference' => substr($shortReference, 0, 12),
            'tenant_payment_reference' => $fullReference,
            'phone' => $phone,
            'amount' => $amount,
            'status' => 'requesting',
        ]);

        try {
            $response = $daraja->initiateStk($destination, $phone, $amount, $checkout->account_reference);
            $checkout->update([
                'checkout_request_id' => $response['CheckoutRequestID'],
                'merchant_request_id' => $response['MerchantRequestID'] ?? null,
                'status' => 'pending',
                'result_description' => $response['CustomerMessage'] ?? 'STK Push sent to phone.',
            ]);
        } catch (Throwable $exception) {
            $checkout->update([
                'status' => 'failed',
                'result_description' => 'Daraja could not start the STK Push request.',
            ]);
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
        $payload = $request->except(['callbackToken', 'token']);
        $callback = data_get($payload, 'Body.stkCallback');
        if (!is_array($callback) || empty($callback['CheckoutRequestID'])) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload'], 400);
        }

        $checkout = DarajaStkCheckout::where('checkout_request_id', $callback['CheckoutRequestID'])->first();
        if (!$checkout) {
            Log::warning('Daraja STK callback did not match a checkout request.');
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        $destination = $checkout->paymentDestination;
        if ($destination && filled($destination->daraja_callback_token)) {
            abort_unless($this->validDestinationCallbackToken($request, $destination), 403, 'Invalid callback token.');
        } else {
            // Backward compatibility for callbacks from checkouts created before destination-level tokens.
            $integration = DarajaIntegration::where('organization_id', $checkout->organization_id)->first();
            abort_unless($this->validCallbackToken($request, $integration), 403, 'Invalid callback token.');
        }

        $resultCode = (string) ($callback['ResultCode'] ?? '');
        if ($resultCode !== '0') {
            $checkout->update([
                'status' => 'failed',
                'result_code' => $resultCode,
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
        $transactionAt = $this->transactionDate($items->get('TransactionDate'));

        if ($receipt === '' || $amount <= 0) {
            $checkout->update(['status' => 'needs_review', 'callback_payload' => $payload]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        try {
            DB::transaction(function () use ($checkout, $payload, $receipt, $amount, $phone, $transactionAt, $reconciliation) {
                $locked = DarajaStkCheckout::whereKey($checkout->id)->lockForUpdate()->firstOrFail();
                if ($locked->status === 'completed') {
                    return;
                }

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

                $reconciliation->ingest([
                    'organization_id' => $locked->organization_id,
                    'payment_destination_id' => $locked->payment_destination_id,
                    'provider' => 'mpesa_daraja',
                    'external_transaction_id' => $receipt,
                    'amount' => $amount,
                    'currency' => 'KES',
                    'payer_phone' => $matchesAmount ? $phone : null,
                    'payment_reference' => $matchesAmount ? $locked->tenant_payment_reference : ('DAR-REVIEW-' . $locked->id),
                    'transaction_at' => $transactionAt,
                    'raw_payload' => [
                        'source' => 'stk_callback',
                        'checkout_id' => $locked->id,
                        'amount_matches' => $matchesAmount,
                    ],
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

    public function c2bConfirmation(
        Request $request,
        PaymentReconciliationService $reconciliation,
        \App\Services\DarajaC2bRoutingService $routing
    ): JsonResponse {
        $payload = $request->except(['callbackToken', 'token']);
        $registration = $this->c2bRegistrationForCallback($request);
        if (!$registration) {
            Log::warning('Daraja C2B callback received with an invalid global registration token.');
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback registration'], 403);
        }

        if ((string) ($payload['BusinessShortCode'] ?? '') !== $registration->shortcode) {
            Log::warning('Daraja C2B callback shortcode did not match its registration.', [
                'registration_id' => $registration->id,
            ]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Shortcode does not match callback registration'], 400);
        }

        try {
            $event = $routing->receive($registration, $payload, $reconciliation);
            if ($event->status === 'needs_review') {
                Log::notice('Daraja C2B accepted into review queue.', [
                    'event_id' => $event->id,
                    'organization_id' => $event->organization_id,
                    'receipt' => $event->receipt,
                ]);
            }

            // Safaricom callbacks are acknowledged once the immutable event is persisted.
            // Allocation may be pending review; the callback must not guess an owner.
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        } catch (Throwable $exception) {
            Log::error('Daraja C2B event persistence/routing failed.', [
                'registration_id' => $registration->id,
                'exception' => $exception::class,
            ]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Processing failed; retry callback'], 500);
        }
    }

    public function c2bValidation(Request $request): JsonResponse
    {
        $registration = $this->c2bRegistrationForCallback($request);
        $shortcode = (string) ($request->input('BusinessShortCode')
            ?? $request->input('ShortCode')
            ?? $request->input('BillRefNumber')
            ?? '');

        if (!$registration || ($shortcode !== '' && $shortcode !== $registration->shortcode)) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback registration']);
        }

        // Validation only authenticates the registered shortcode. Reference matching and allocation
        // happen from the confirmation event, where the full transaction is persisted for review.
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    private function c2bRegistrationForCallback(Request $request): ?\App\Models\DarajaC2bRegistration
    {
        $provided = (string) $request->route('callbackToken', '');
        if ($provided === '') {
            return null;
        }

        $environment = (string) config('daraja.environment', 'sandbox');
        return \App\Models\DarajaC2bRegistration::query()
            ->where('environment', $environment)
            ->where('callback_token_hash', hash('sha256', $provided))
            ->where('status', 'registered')
            ->first();
    }

    private function callbackUrls(?DarajaIntegration $integration): array
    {
        $base = rtrim((string) config('app.url'), '/');
        if (!$integration || !$integration->callback_token) {
            return [
                'stk_callback_url' => null,
                'c2b_confirmation_url' => null,
                'c2b_validation_url' => null,
            ];
        }

        $tokenPath = rawurlencode($integration->callback_token);
        return [
            'stk_callback_url' => $base . '/api/webhooks/daraja/' . $tokenPath . '/stk',
            'c2b_confirmation_url' => $base . '/api/webhooks/daraja/' . $tokenPath . '/confirm',
            'c2b_validation_url' => $base . '/api/webhooks/daraja/' . $tokenPath . '/validate',
        ];
    }

    private function validCallbackToken(Request $request, ?DarajaIntegration $integration): bool
    {
        $provided = (string) $request->route('callbackToken', '');
        $expected = (string) ($integration?->callback_token ?? '');
        return $provided !== '' && $expected !== '' && hash_equals($expected, $provided);
    }

    private function validDestinationCallbackToken(Request $request, PaymentDestination $destination): bool
    {
        $provided = (string) $request->route('callbackToken', '');
        $expected = (string) ($destination->daraja_callback_token ?? '');
        return $provided !== '' && $expected !== '' && hash_equals($expected, $provided);
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
