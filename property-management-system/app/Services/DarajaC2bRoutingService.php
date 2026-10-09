<?php

namespace App\Services;

use App\Models\DarajaC2bEvent;
use App\Models\DarajaC2bRegistration;
use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Models\PaymentTransaction;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class DarajaC2bRoutingService
{
    public function receive(DarajaC2bRegistration $registration, array $payload, PaymentReconciliationService $reconciliation): DarajaC2bEvent
    {
        $shortcode = trim((string) ($payload['BusinessShortCode'] ?? ''));
        $receipt = trim((string) ($payload['TransID'] ?? ''));
        $amount = round((float) ($payload['TransAmount'] ?? 0), 2);
        $reference = $this->normalizeReference($payload['BillRefNumber'] ?? null);
        $transactionAt = $this->transactionDate($payload['TransTime'] ?? null);

        if ($shortcode !== $registration->shortcode || $receipt === '' || $amount <= 0) {
            throw new RuntimeException('C2B callback shortcode, receipt or amount is invalid.');
        }

        return DB::transaction(function () use ($registration, $payload, $shortcode, $receipt, $amount, $reference, $transactionAt, $reconciliation) {
            $event = DarajaC2bEvent::firstOrCreate(
                [
                    'environment' => $registration->environment,
                    'shortcode' => $shortcode,
                    'receipt' => $receipt,
                ],
                [
                    'amount' => $amount,
                    'currency' => 'KES',
                    'payer_phone' => $this->normalizePhone($payload['MSISDN'] ?? null),
                    'payment_reference' => $reference,
                    'transaction_at' => $transactionAt,
                    'status' => 'received',
                    'raw_payload' => $payload,
                ]
            );

            if (!$event->wasRecentlyCreated && in_array($event->status, ['routed', 'needs_review'], true)) {
                return $event->fresh();
            }

            $event = DarajaC2bEvent::whereKey($event->id)->lockForUpdate()->firstOrFail();
            $routing = $this->findMatches($shortcode, $reference, CarbonImmutable::parse($transactionAt));
            $destinations = $routing['destinations'];
            $matches = $routing['matches'];
            $organizations = $destinations->pluck('organization_id')->unique()->values();
            $event->candidate_destination_ids = $destinations->pluck('id')->values()->all();

            if ($matches->count() === 1) {
                $match = $matches->first();
                $destination = $match['destination'];
                $lease = $match['lease'];
                $transaction = $reconciliation->ingest([
                    'organization_id' => $destination->organization_id,
                    'payment_destination_id' => $destination->id,
                    'provider' => 'mpesa_daraja',
                    'external_transaction_id' => $receipt,
                    'amount' => $amount,
                    'currency' => 'KES',
                    'payer_phone' => $payload['MSISDN'] ?? null,
                    'payment_reference' => $reference,
                    'transaction_at' => $transactionAt,
                    'raw_payload' => [
                        'source' => 'c2b_confirmation',
                        'business_short_code' => $shortcode,
                        'bill_reference' => $reference,
                        'c2b_event_id' => $event->id,
                    ],
                ]);

                $event->organization_id = $destination->organization_id;
                $event->payment_destination_id = $destination->id;
                $event->payment_transaction_id = $transaction->id;
                $event->status = in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true) ? 'routed' : 'needs_review';
                $event->review_reason = $event->status === 'routed'
                    ? null
                    : ($transaction->reconciliation_note ?: 'The transaction was routed to the property but could not be safely allocated automatically.');
                $event->save();

                return $event->fresh();
            }

            $reason = match (true) {
                !$reference => 'The M-PESA transaction has no account reference; automatic allocation is disabled.',
                $matches->count() > 1 => 'The account reference matches more than one active lease or property destination.',
                $destinations->isEmpty() => 'No active property destination is configured for this shortcode.',
                $destinations->every(fn (PaymentDestination $destination) => $destination->c2b_authorization_status !== 'ready') => 'No destination for this shortcode has verified C2B merchant authorization.',
                default => 'The account reference did not match a verified property lease.',
            };

            $event->organization_id = $organizations->count() === 1 ? (int) $organizations->first() : null;
            $event->payment_destination_id = $destinations->count() === 1 ? $destinations->first()->id : null;
            $event->status = 'needs_review';
            $event->review_reason = $reason;

            if ($event->organization_id) {
                $transaction = PaymentTransaction::firstOrCreate(
                    [
                        'organization_id' => $event->organization_id,
                        'provider' => 'mpesa_daraja',
                        'external_transaction_id' => $receipt,
                    ],
                    [
                        'payment_destination_id' => $event->payment_destination_id,
                        'amount' => $amount,
                        'currency' => 'KES',
                        'payer_phone' => $this->normalizePhone($payload['MSISDN'] ?? null),
                        'payment_reference' => $reference,
                        'transaction_at' => $transactionAt,
                        'status' => 'needs_review',
                        'reconciliation_note' => $reason,
                        'raw_payload' => [
                            'source' => 'c2b_confirmation',
                            'business_short_code' => $shortcode,
                            'bill_reference' => $reference,
                            'c2b_event_id' => $event->id,
                            'candidate_destination_ids' => $event->candidate_destination_ids,
                        ],
                    ]
                );
                $event->payment_transaction_id = $transaction->id;
            }

            $event->save();
            Log::notice('Daraja C2B payment requires review.', [
                'event_id' => $event->id,
                'shortcode' => $shortcode,
                'receipt' => $receipt,
                'organization_id' => $event->organization_id,
                'candidate_destination_count' => $destinations->count(),
                'match_count' => $matches->count(),
            ]);

            return $event->fresh();
        }, 3);
    }

    public function findMatches(string $shortcode, ?string $reference, CarbonImmutable $at): array
    {
        $destinations = PaymentDestination::query()
            ->where('is_active', true)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])
            ->get()
            ->filter(fn (PaymentDestination $destination) => $destination->darajaShortcode() === $shortcode)
            ->values();

        $matches = collect();
        if ($reference !== null) {
            foreach ($destinations->where('c2b_authorization_status', 'ready') as $destination) {
                $leases = Leases::query()
                    ->where('organization_id', $destination->organization_id)
                    ->where('property_id', $destination->property_id)
                    ->whereNotIn('status', ['ended', 'terminated'])
                    ->whereDate('start_date', '<=', $at->toDateString())
                    ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $at->toDateString()))
                    ->with('unit')
                    ->get();

                foreach ($leases as $lease) {
                    $leaseReference = $this->normalizeReference($lease->tenant_payment_reference);
                    $configuredReference = $this->renderAccountReference($destination, $lease);
                    if ($reference === $leaseReference || ($configuredReference !== null && $reference === $configuredReference)) {
                        $matches->push(['destination' => $destination, 'lease' => $lease]);
                    }
                }
            }
        }

        return ['destinations' => $destinations, 'matches' => $matches];
    }

    public function renderAccountReference(PaymentDestination $destination, Leases $lease): ?string
    {
        $format = trim((string) $destination->account_reference_format);
        if ($format === '') {
            return null;
        }

        $unit = trim((string) ($lease->unit?->unit_number ?? ''));
        $rendered = str_replace(['{unit}', '{lease}'], [$unit, (string) $lease->id], $format);
        if (str_contains($rendered, '{') || str_contains($rendered, '}') || trim($unit) === '' && str_contains($format, '{unit}')) {
            return null;
        }

        return $this->normalizeReference($rendered);
    }

    public function normalizeReference(mixed $value): ?string
    {
        $normalized = Str::upper(preg_replace('/\s+/', '', trim((string) $value)));
        return $normalized === '' ? null : $normalized;
    }

    private function normalizePhone(mixed $value): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if ($digits === '') return null;
        if (preg_match('/^0[17]\d{8}$/', $digits)) return '254' . substr($digits, 1);
        if (preg_match('/^[17]\d{8}$/', $digits)) return '254' . $digits;
        return $digits;
    }

    private function transactionDate(mixed $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if (strlen($digits) === 14) {
            try { return CarbonImmutable::createFromFormat('YmdHis', $digits)?->toDateTimeString() ?? now()->toDateTimeString(); }
            catch (\Throwable) { return now()->toDateTimeString(); }
        }
        try { return $value ? CarbonImmutable::parse($value)->toDateTimeString() : now()->toDateTimeString(); }
        catch (\Throwable) { return now()->toDateTimeString(); }
    }
}
