<?php

namespace App\Http\Controllers;

use App\Models\PlatformSubscription;
use App\Models\PlatformSubscriptionMpesaEvent;
use App\Models\PlatformSubscriptionPayment;
use App\Services\PlatformSubscriptionDarajaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PlatformSubscriptionPaymentController extends Controller
{
    public function initiateStk(Request $request, PlatformSubscriptionDarajaService $daraja): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403,
            'Only the organization owner or primary administrator can pay the platform subscription.');

        $validated = $request->validate(['phone' => ['required', 'string', 'max:30']]);
        $organization = $request->user()->organization;
        $subscription = $organization?->platformSubscription;
        abort_if(!$subscription, 422, 'Choose a subscription plan before paying.');
        abort_if($subscription->monthly_amount === null || (float) $subscription->monthly_amount <= 0, 422,
            'The subscription quote must be greater than zero before payment.');
        abort_if($subscription->status === 'active' && $subscription->current_period_ends_at?->isFuture(), 409,
            'Your subscription is already active. Contact platform support for renewal or plan changes.');

        abort_unless($daraja->ready(), 409,
            'STK Push is not configured yet. The platform Till is available for manual payment, but STK requires approved production Daraja credentials, the Safaricom-provided STK business shortcode and matching passkey, callback token and a public HTTPS callback URL.');

        $payment = PlatformSubscriptionPayment::create([
            'platform_subscription_id' => $subscription->id,
            'organization_id' => $organization->id,
            'amount' => (int) ceil((float) $subscription->monthly_amount),
            'method' => 'mpesa_stk',
            'status' => 'pending_verification',
            'phone' => $validated['phone'],
            'notes' => 'Waiting for Safaricom STK callback.',
        ]);

        try {
            $response = $daraja->initiate($payment, $validated['phone']);
            $payment->update([
                'checkout_request_id' => $response['CheckoutRequestID'],
                'merchant_request_id' => $response['MerchantRequestID'] ?? null,
                'result_description' => $response['CustomerMessage'] ?? 'STK Push sent to phone.',
            ]);
        } catch (Throwable $exception) {
            $payment->update([
                'status' => 'rejected',
                'result_description' => 'Safaricom could not start the STK request.',
            ]);
            Log::warning('Platform subscription STK initiation failed.', [
                'payment_id' => $payment->id,
                'organization_id' => $organization->id,
                'environment' => config('daraja.environment'),
                'exception' => $exception::class,
                'reason' => mb_substr($exception->getMessage(), 0, 400),
            ]);
            return response()->json([
                'message' => $exception instanceof RuntimeException
                    ? $exception->getMessage()
                    : 'Safaricom could not start the M-PESA prompt. Please try again or use the manual Till option.',
            ], 502);
        }

        return response()->json([
            'message' => 'M-PESA prompt sent. Complete payment on your phone; access activates only after Safaricom confirms it.',
            'payment' => $payment->fresh(),
        ], 202);
    }

    public function stkCallback(Request $request, string $token): JsonResponse
    {
        $expected = (string) config('services.platform_billing.callback_token');
        abort_unless($expected !== '' && hash_equals($expected, $token), 403, 'Invalid platform subscription callback token.');

        $payload = $request->all();
        $callback = data_get($payload, 'Body.stkCallback');
        if (!is_array($callback) || empty($callback['CheckoutRequestID'])) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload'], 400);
        }

        $payment = PlatformSubscriptionPayment::where('checkout_request_id', $callback['CheckoutRequestID'])->first();
        if (!$payment) {
            Log::warning('Platform subscription STK callback did not match a checkout.');
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ((string) ($callback['ResultCode'] ?? '') !== '0') {
            DB::transaction(function () use ($payment, $callback, $payload) {
                $locked = PlatformSubscriptionPayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
                // A late failure callback must never downgrade an already confirmed payment.
                if (in_array($locked->status, ['confirmed', 'needs_review'], true)) {
                    return;
                }
                $locked->update([
                    'status' => 'rejected',
                    'result_description' => mb_substr((string) ($callback['ResultDesc'] ?? 'Payment not completed.'), 0, 1000),
                    'callback_payload' => $payload,
                ]);
            }, 3);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        $items = collect(data_get($callback, 'CallbackMetadata.Item', []))
            ->mapWithKeys(fn ($item) => isset($item['Name']) ? [$item['Name'] => ($item['Value'] ?? null)] : []);
        $receipt = trim((string) $items->get('MpesaReceiptNumber', ''));
        $amount = (float) $items->get('Amount', 0);
        $phone = (string) ($items->get('PhoneNumber') ?? $payment->phone);
        if ($receipt === '' || $amount <= 0) {
            $payment->update([
                'status' => 'needs_review',
                'result_description' => 'Successful callback did not include a receipt and amount.',
                'callback_payload' => $payload,
            ]);
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        DB::transaction(function () use ($payment, $payload, $receipt, $amount, $phone) {
            $locked = PlatformSubscriptionPayment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'confirmed') {
                return;
            }
            $duplicate = PlatformSubscriptionPayment::where('mpesa_receipt', $receipt)
                ->where('id', '!=', $locked->id)->exists();
            $matchesAmount = abs((float) $locked->amount - $amount) < 0.001;
            if ($duplicate || !$matchesAmount) {
                $locked->update([
                    'status' => 'needs_review',
                    'mpesa_receipt' => $duplicate ? null : $receipt,
                    'reference' => $receipt,
                    'phone' => $phone,
                    'callback_payload' => $payload,
                    'result_description' => $duplicate
                        ? 'Receipt was already used for another platform payment; manual review required.'
                        : 'Callback amount differs from the requested subscription amount; manual review required.',
                ]);
                return;
            }

            $locked->update([
                'status' => 'confirmed',
                'mpesa_receipt' => $receipt,
                'reference' => $receipt,
                'phone' => $phone,
                'paid_at' => now(),
                'callback_payload' => $payload,
                'result_description' => 'Payment confirmed by Safaricom.',
                'notes' => 'Confirmed automatically by Daraja STK callback.',
            ]);
            $this->activateSubscription((int) $locked->platform_subscription_id);
        }, 3);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bCallback(Request $request, string $token): JsonResponse
    {
        $expected = (string) config('services.platform_billing.callback_token');
        abort_unless($expected !== '' && hash_equals($expected, $token), 403, 'Invalid platform subscription callback token.');

        $payload = $request->all();
        $shortcode = (string) config('services.platform_billing.till_number');
        if ($shortcode === '' || (string) ($payload['BusinessShortCode'] ?? '') !== $shortcode) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Business shortcode mismatch'], 400);
        }

        $receipt = strtoupper(trim((string) ($payload['TransID'] ?? '')));
        $amount = (float) ($payload['TransAmount'] ?? 0);
        if ($receipt === '' || $amount <= 0) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Missing transaction reference or amount'], 400);
        }

        $event = PlatformSubscriptionMpesaEvent::firstOrCreate(
            ['transaction_id' => $receipt],
            [
                'shortcode' => $shortcode,
                'amount' => $amount,
                'bill_reference' => filled($payload['BillRefNumber'] ?? null) ? strtoupper(trim((string) $payload['BillRefNumber'])) : null,
                'phone' => isset($payload['MSISDN']) ? (string) $payload['MSISDN'] : null,
                'transaction_at' => $this->transactionDate($payload['TransTime'] ?? null),
                'status' => 'unmatched',
                'raw_payload' => $payload,
            ]
        );

        try {
            DB::transaction(function () use ($event, $receipt, $amount) {
                $lockedEvent = PlatformSubscriptionMpesaEvent::whereKey($event->id)->lockForUpdate()->firstOrFail();
                if ($lockedEvent->status === 'matched') {
                    return;
                }
                $payment = PlatformSubscriptionPayment::whereRaw('UPPER(reference) = ?', [$receipt])
                    ->where('status', 'pending_verification')
                    ->lockForUpdate()->first();
                if (!$payment || abs((float) $payment->amount - $amount) >= 0.001) {
                    return;
                }
                $receiptAlreadyUsed = PlatformSubscriptionPayment::where('mpesa_receipt', $receipt)
                    ->where('id', '!=', $payment->id)->exists();
                if ($receiptAlreadyUsed) {
                    $payment->update([
                        'status' => 'needs_review',
                        'result_description' => 'This receipt is already attached to another subscription payment; manual review required.',
                    ]);
                    $lockedEvent->update(['status' => 'needs_review']);
                    return;
                }
                $payment->update([
                    'status' => 'confirmed',
                    'mpesa_receipt' => $receipt,
                    'paid_at' => now(),
                    'phone' => $lockedEvent->phone,
                    'callback_payload' => $lockedEvent->raw_payload,
                    'result_description' => 'Payment matched automatically against the platform Till callback.',
                    'notes' => 'Confirmed automatically by Daraja C2B callback.',
                ]);
                $lockedEvent->update([
                    'platform_subscription_payment_id' => $payment->id,
                    'status' => 'matched',
                    'matched_at' => now(),
                ]);
                $this->activateSubscription((int) $payment->platform_subscription_id);
            }, 3);
        } catch (Throwable $exception) {
            Log::error('Platform subscription C2B callback matching failed.', [
                'receipt' => $receipt,
                'exception' => $exception::class,
            ]);
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Processing failed; retry callback'], 500);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function c2bValidation(Request $request, string $token): JsonResponse
    {
        $expected = (string) config('services.platform_billing.callback_token');
        abort_unless($expected !== '' && hash_equals($expected, $token), 403, 'Invalid platform subscription callback token.');
        $shortcode = (string) config('services.platform_billing.till_number');
        $incoming = (string) ($request->input('BusinessShortCode') ?? $request->input('ShortCode') ?? '');
        if ($shortcode === '' || $incoming !== $shortcode) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Business shortcode mismatch']);
        }
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    public function submitReference(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403,
            'Only the organization owner or primary administrator can submit subscription payment details.');
        $validated = $request->validate([
            'reference' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);

        $organization = $request->user()->organization;
        $subscription = $organization?->platformSubscription;
        abort_if(!$subscription, 422, 'Choose a subscription plan first.');
        abort_if(!filled(config('services.platform_billing.till_number')), 409,
            'The platform M-Pesa Till has not been configured yet.');
        abort_if((float) $validated['amount'] < (float) $subscription->monthly_amount, 422,
            'The payment amount is below the current monthly subscription quote.');

        $reference = strtoupper(trim($validated['reference']));
        $existing = PlatformSubscriptionPayment::whereRaw('UPPER(reference) = ?', [$reference])
            ->whereIn('status', ['pending_verification', 'confirmed', 'needs_review'])->exists();
        abort_if($existing, 409, 'This M-PESA receipt reference has already been submitted.');

        $payment = DB::transaction(function () use ($subscription, $organization, $validated, $reference) {
            $payment = PlatformSubscriptionPayment::create([
                'platform_subscription_id' => $subscription->id,
                'organization_id' => $organization->id,
                'amount' => $validated['amount'],
                'method' => 'mpesa_till',
                'reference' => $reference,
                'status' => 'pending_verification',
            ]);

            $event = PlatformSubscriptionMpesaEvent::where('transaction_id', $reference)
                ->where('status', 'unmatched')->lockForUpdate()->first();
            if ($event) {
                if (abs((float) $event->amount - (float) $payment->amount) < 0.001) {
                    $payment->update([
                        'status' => 'confirmed',
                        'mpesa_receipt' => $event->transaction_id,
                        'paid_at' => $event->transaction_at ?? now(),
                        'phone' => $event->phone,
                        'callback_payload' => $event->raw_payload,
                        'result_description' => 'Receipt matched against a previously received platform Till callback.',
                        'notes' => 'Confirmed automatically by previously received Daraja C2B callback.',
                    ]);
                    $event->update([
                        'platform_subscription_payment_id' => $payment->id,
                        'status' => 'matched',
                        'matched_at' => now(),
                    ]);
                    $this->activateSubscription((int) $payment->platform_subscription_id);
                } else {
                    $payment->update([
                        'status' => 'needs_review',
                        'result_description' => 'The receipt exists, but its callback amount does not match the submitted amount.',
                    ]);
                }
            }
            return $payment->fresh();
        });

        return response()->json([
            'message' => $payment->status === 'confirmed'
                ? 'M-PESA receipt matched automatically and your subscription is now active.'
                : ($payment->status === 'needs_review'
                    ? 'The receipt was found, but the amount does not match. Platform support will review it.'
                    : 'Reference saved. It will be matched automatically if Safaricom sends a callback; otherwise a platform administrator must verify it before access activates.'),
            'payment' => $payment,
        ], 201);
    }

    private function activateSubscription(int $subscriptionId): void
    {
        $subscription = PlatformSubscription::whereKey($subscriptionId)->lockForUpdate()->firstOrFail();
        $starts = now();
        $subscription->update([
            'status' => 'active',
            'current_period_starts_at' => $starts,
            'current_period_ends_at' => $starts->copy()->addMonth(),
            'last_payment_at' => $starts,
        ]);
    }

    private function transactionDate(mixed $value): ?\Carbon\CarbonImmutable
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (strlen($digits) !== 14) {
            return null;
        }
        try {
            return \Carbon\CarbonImmutable::createFromFormat('YmdHis', $digits);
        } catch (Throwable) {
            return null;
        }
    }
}
