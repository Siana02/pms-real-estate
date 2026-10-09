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

            // Re-check after acquiring the row lock. Duplicate webhooks and concurrent
            // manager actions can otherwise allocate the same receipt more than once.
            if (in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)) {
                return $transaction->fresh([
                    'matchedLease.tenant',
                    'matchedLease.property',
                    'matchedLease.unit',
                    'matchedRentObligation',
                    'payment.allocations.rentObligation',
                ]);
            }

            if (round((float) $transaction->amount, 2) <= 0) {
                $transaction->update([
                    'status' => 'needs_review',
                    'reconciliation_note' => 'Payment amount must be greater than zero.',
                ]);

                return $transaction->fresh();
            }

            $at = CarbonImmutable::parse($transaction->transaction_at);
            app(RentLedgerService::class)->ensureForPeriod($at);

            $reference = $this->normalizeReference($transaction->payment_reference);
            $destination = $transaction->paymentDestination()->first();

            $query = Leases::query()
                ->where('organization_id', $transaction->organization_id)
                ->whereNotIn('status', ['ended', 'terminated', 'pending'])
                ->whereDate('start_date', '<=', $at->toDateString())
                ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', $at->toDateString()));

            if ($destination) {
                $query->where('property_id', $destination->property_id);
            }

            $candidates = collect();
            if ($reference) {
                $leases = $query->with(['tenant', 'unit'])->get();
                if ($destination) {
                    $router = app(DarajaC2bRoutingService::class);
                    $candidates = $leases->filter(function (Leases $lease) use ($reference, $destination, $router) {
                        $tenantReference = $this->normalizeReference($lease->tenant_payment_reference);
                        $configuredReference = $router->renderAccountReference($destination, $lease);
                        return $reference === $tenantReference
                            || ($configuredReference !== null && $reference === $configuredReference);
                    })->values();
                } else {
                    $candidates = $leases->filter(
                        fn (Leases $lease) => $reference === $this->normalizeReference($lease->tenant_payment_reference)
                    )->values();
                }
            }
            if ($candidates->count() !== 1) {
                $transaction->update([
                    'status' => $candidates->isEmpty() ? 'unmatched' : 'needs_review',
                    'reconciliation_note' => $candidates->isEmpty()
                        ? 'No active lease matched the payment reference. Payer phone is supporting information only and is never sufficient for automatic allocation.'
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
        abort_unless((int) $transaction->organization_id === (int) $lease->organization_id, 403, 'The payment and lease must belong to the same organization.');
        $at = CarbonImmutable::parse($transaction->transaction_at);
        abort_if(in_array($lease->getRawOriginal('status'), ['ended', 'terminated', 'pending'], true)
            || CarbonImmutable::parse($lease->start_date)->greaterThan($at)
            || ($lease->end_date && CarbonImmutable::parse($lease->end_date)->lessThan($at)),
            422, 'The selected lease was not active on the payment date.');

        if ($transaction->payment_destination_id) {
            $destination = $transaction->paymentDestination()->first();
            abort_if(!$destination
                || (int) $destination->organization_id !== (int) $lease->organization_id
                || (int) $destination->property_id !== (int) $lease->property_id,
                422, 'The selected lease does not belong to the payment destination property.');
        }

        if (in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)) {
            abort_unless((int) $transaction->matched_lease_id === (int) $lease->id, 422,
                'This payment is already reconciled to a different lease and cannot be reassigned.');
            return $transaction->fresh(['matchedLease.tenant', 'matchedLease.property', 'matchedLease.unit', 'matchedRentObligation', 'payment.allocations.rentObligation']);
        }

        return DB::transaction(function () use ($transaction, $lease) {
            $transaction = PaymentTransaction::query()->lockForUpdate()->findOrFail($transaction->id);

            // A second resolver may have waited for the first one to commit. Re-check
            // status under the lock to keep payment, allocations and credits idempotent.
            if (in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)) {
                abort_unless((int) $transaction->matched_lease_id === (int) $lease->id, 422,
                    'This payment is already reconciled to a different lease and cannot be reassigned.');

                return $transaction->fresh([
                    'matchedLease.tenant',
                    'matchedLease.property',
                    'matchedLease.unit',
                    'matchedRentObligation',
                    'payment.allocations.rentObligation',
                ]);
            }

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

        // Compare integer cents rather than binary floating-point values.
        $allocatedCents = (int) round($totalAllocated * 100);
        $creditCents = (int) round(round($creditAmount, 2) * 100);
        $totalCents = (int) round($totalAmount * 100);

        if ($allocatedCents + $creditCents !== $totalCents || $totalCents <= 0) {
            throw new \RuntimeException('Payment allocation total does not equal a positive transaction amount.');
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
        return $value === '' ? null : Str::upper(preg_replace('/\s+/', '', $value));
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
