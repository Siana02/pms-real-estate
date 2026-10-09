<?php

namespace App\Services;

use App\Models\Leases;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentTransaction;
use App\Models\RentObligation;
use App\Models\RentPaymentCredit;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentReconciliationService
{
    public function ingest(array $data): PaymentTransaction
    {
        $transaction = PaymentTransaction::firstOrCreate(
            [
                'organization_id' => $data['organization_id'],
                'provider' => $data['provider'],
                'external_transaction_id' => $data['external_transaction_id'],
            ],
            [
                'payment_destination_id' => $data['payment_destination_id'] ?? null,
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? 'KES',
                'payer_phone' => $this->normalizePhone($data['payer_phone'] ?? null),
                'payment_reference' => $this->normalizeReference($data['payment_reference'] ?? null),
                'transaction_at' => $data['transaction_at'],
                'status' => 'pending',
                'raw_payload' => $data['raw_payload'] ?? null,
            ]
        );

        if ($transaction->wasRecentlyCreated || in_array($transaction->status, ['pending', 'unmatched', 'needs_review'], true)) {
            $this->reconcile($transaction);
        }

        return $transaction->fresh([
            'paymentDestination.property',
            'matchedLease.tenant',
            'matchedLease.property',
            'matchedLease.unit',
            'matchedRentObligation',
            'payment.allocations.rentObligation',
        ]);
    }

    public function reconcile(PaymentTransaction $transaction): PaymentTransaction
    {
        if (in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)) {
            return $transaction;
        }

        return DB::transaction(function () use ($transaction) {
            $transaction = PaymentTransaction::query()
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            $at = CarbonImmutable::parse($transaction->transaction_at);
            app(RentLedgerService::class)->ensureForPeriod($at);

            $reference = $this->normalizeReference($transaction->payment_reference);
            $phone = $this->normalizePhone($transaction->payer_phone);

            $query = Leases::query()
                ->where('organization_id', $transaction->organization_id)
                ->whereNotIn('status', ['ended', 'terminated'])
                ->whereDate('start_date', '<=', $at->toDateString())
                ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', $at->toDateString()));

            if ($transaction->payment_destination_id) {
                $destination = $transaction->paymentDestination()->first();
                if ($destination?->property_id) {
                    $query->where('property_id', $destination->property_id);
                }
            }

            $candidates = $reference
                ? $query->with('tenant')->whereRaw('UPPER(tenant_payment_reference) = ?', [$reference])->get()
                : collect();

            if ($candidates->isEmpty() && $phone) {
                $candidates = $query->with('tenant')->whereHas('tenant', function ($q) use ($phone) {
                    $q->where(function ($phoneQuery) use ($phone) {
                        $local = Str::startsWith($phone, '254') ? '0' . substr($phone, 3) : $phone;
                        $phoneQuery
                            ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', '') = ?", [$phone])
                            ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', '') = ?", [$local]);
                    });
                })->get();
            }

            if ($candidates->count() !== 1) {
                $transaction->update([
                    'status' => $candidates->isEmpty() ? 'unmatched' : 'needs_review',
                    'reconciliation_note' => $candidates->isEmpty()
                        ? 'No active lease matched the payment reference or payer phone.'
                        : 'More than one active lease matched; manager review is required.',
                ]);

                return $transaction->fresh();
            }

            /** @var Leases $lease */
            $lease = $candidates->first();
            $this->ensureLeaseObligationsThrough($lease, $at);

            $obligations = $this->outstandingObligations($lease, $at);

            if ($obligations->isEmpty()) {
                return $this->createPaymentAndCredit(
                    $transaction,
                    $lease,
                    $at,
                    [],
                    (float) $transaction->amount,
                    'Payment matched to the lease but there were no outstanding rent obligations through the transaction month; amount recorded as rent credit.'
                );
            }

            $paymentAmount = (float) $transaction->amount;

            if ($paymentAmount <= 0) {
                $transaction->update([
                    'status' => 'needs_review',
                    'matched_lease_id' => $lease->id,
                    'reconciliation_note' => 'Payment amount must be greater than zero.',
                ]);

                return $transaction->fresh();
            }

            return $this->allocatePayment(
                $transaction,
                $lease,
                $at,
                $obligations,
                $paymentAmount
            );
        }, 3);
    }

    public function resolve(PaymentTransaction $transaction, Leases $lease): PaymentTransaction
    {
        if (in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)) {
            return $transaction->fresh(['matchedLease.tenant', 'matchedLease.property', 'matchedLease.unit', 'matchedRentObligation', 'payment.allocations.rentObligation']);
        }

        abort_unless($transaction->organization_id === $lease->organization_id, 403, 'The payment and lease must belong to the same organization.');

        return DB::transaction(function () use ($transaction, $lease) {
            $transaction = PaymentTransaction::query()->lockForUpdate()->findOrFail($transaction->id);
            $at = CarbonImmutable::parse($transaction->transaction_at);

            app(RentLedgerService::class)->ensureForPeriod($at);
            $this->ensureLeaseObligationsThrough($lease, $at);

            $obligations = $this->outstandingObligations($lease, $at);
            $amount = (float) $transaction->amount;

            abort_if($amount <= 0, 422, 'Payment amount must be greater than zero.');

            return $this->allocatePayment(
                $transaction,
                $lease,
                $at,
                $obligations,
                $amount,
                true
            );
        }, 3);
    }

    private function allocatePayment(
        PaymentTransaction $transaction,
        Leases $lease,
        CarbonImmutable $at,
        $obligations,
        float $amount,
        bool $manual = false
    ): PaymentTransaction {
        $allocations = [];
        $remaining = round($amount, 2);

        foreach ($obligations as $obligation) {
            if ($remaining <= 0) {
                break;
            }

            $balance = round((float) $obligation->balance, 2);
            if ($balance <= 0) {
                continue;
            }

            $allocated = min($remaining, $balance);
            $allocations[] = [
                'rent_obligation_id' => $obligation->id,
                'amount' => round($allocated, 2),
            ];
            $remaining = round($remaining - $allocated, 2);
        }

        return $this->createPaymentAndCredit(
            $transaction,
            $lease,
            $at,
            $allocations,
            $remaining,
            $manual
                ? 'Manually resolved and allocated oldest outstanding rent obligations first.'
                : 'Automatically reconciled and allocated oldest outstanding rent obligations first.'
        );
    }

    private function createPaymentAndCredit(
        PaymentTransaction $transaction,
        Leases $lease,
        CarbonImmutable $at,
        array $allocations,
        float $creditAmount,
        string $note
    ): PaymentTransaction {
        $totalAllocated = round(array_sum(array_column($allocations, 'amount')), 2);
        $totalAmount = round((float) $transaction->amount, 2);

        if ($totalAllocated + round($creditAmount, 2) !== $totalAmount) {
            throw new \RuntimeException('Payment allocation total does not equal the transaction amount.');
        }

        $payment = Payment::firstOrCreate(
            [
                'provider' => $transaction->provider,
                'provider_transaction_id' => $transaction->external_transaction_id,
                'organization_id' => $transaction->organization_id,
            ],
            [
                'organization_id' => $transaction->organization_id,
                'lease_id' => $lease->id,
                'rent_obligation_id' => count($allocations) === 1 ? $allocations[0]['rent_obligation_id'] : null,
                'payment_destination_id' => $transaction->payment_destination_id,
                'amount' => $totalAmount,
                'payment_date' => $at->toDateString(),
                'payment_method' => $this->paymentMethod($transaction->provider),
                'status' => 'paid',
                'tx_ref' => 'RECON-PT-' . $transaction->id,
                'reference' => $transaction->payment_reference,
                'payment_type' => 'rent',
                'notes' => 'External payment transaction reconciled into the rent ledger.',
            ]
        );

        foreach ($allocations as $allocation) {
            PaymentAllocation::firstOrCreate(
                [
                    'payment_id' => $payment->id,
                    'rent_obligation_id' => $allocation['rent_obligation_id'],
                ],
                ['amount' => $allocation['amount']]
            );
        }

        if ($creditAmount > 0) {
            RentPaymentCredit::create([
                'organization_id' => $transaction->organization_id,
                'tenant_id' => $lease->tenant_id,
                'lease_id' => $lease->id,
                'source_payment_id' => $payment->id,
                'amount' => $creditAmount,
                'remaining_amount' => $creditAmount,
                'status' => 'available',
                'notes' => 'Automatic rent overpayment credit created during reconciliation.',
            ]);
        }

        $firstAllocation = $allocations[0]['rent_obligation_id'] ?? null;
        $status = $creditAmount > 0 ? 'reconciled_with_credit' : 'reconciled';

        $transaction->update([
            'status' => $status,
            'matched_lease_id' => $lease->id,
            'matched_rent_obligation_id' => $firstAllocation,
            'payment_id' => $payment->id,
            'reconciliation_note' => $creditAmount > 0
                ? $note . ' KSh ' . number_format($creditAmount, 2) . ' was recorded as tenant rent credit.'
                : $note,
        ]);

        return $transaction->fresh([
            'matchedLease.tenant',
            'matchedLease.property',
            'matchedLease.unit',
            'matchedRentObligation',
            'payment.allocations.rentObligation',
        ]);
    }

    private function outstandingObligations(Leases $lease, CarbonImmutable $at)
    {
        return RentObligation::query()
            ->where('lease_id', $lease->id)
            ->whereDate('period', '<=', $at->startOfMonth()->toDateString())
            ->orderBy('due_date')
            ->get()
            ->filter(fn (RentObligation $obligation) => (float) $obligation->balance > 0)
            ->values();
    }

    private function ensureLeaseObligationsThrough(Leases $lease, CarbonImmutable $through): void
    {
        $start = CarbonImmutable::parse($lease->start_date)->startOfMonth();
        $period = $start;

        while ($period->lessThanOrEqualTo($through->startOfMonth())) {
            app(RentLedgerService::class)->ensureForPeriod($period);
            $period = $period->addMonth();
        }
    }

    private function paymentMethod(string $provider): string
    {
        return match (Str::lower($provider)) {
            'mpesa', 'safaricom', 'mpesa_daraja' => 'mpesa',
            'flutterwave' => 'card',
            'bank' => 'bank_transfer',
            default => 'other',
        };
    }

    private function normalizeReference(?string $value): ?string
    {
        $value = trim((string) $value);
        return $value === '' ? null : Str::upper($value);
    }

    private function normalizePhone(?string $value): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        if ($digits === '') {
            return null;
        }

        if ((Str::startsWith($digits, '07') || Str::startsWith($digits, '01')) && strlen($digits) === 10) {
            return '254' . substr($digits, 1);
        }

        return $digits;
    }
}
