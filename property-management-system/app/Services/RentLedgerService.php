<?php

namespace App\Services;

use App\Models\Leases;
use App\Models\Payment;
use App\Models\RentObligation;
use App\Models\PaymentAllocation;
use App\Models\RentPaymentCredit;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RentLedgerService
{
    public function ensureForPeriod(CarbonImmutable $period): Collection
    {
        $monthStart = $period->startOfMonth();
        $monthEnd = $period->endOfMonth();

        $leases = Leases::query()
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $monthEnd->toDateString())
            ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date', '>=', $monthStart->toDateString()))
            ->get();

        foreach ($leases as $lease) {
            $this->ensureLeaseObligationForPeriod($lease, $monthStart);
        }

        return RentObligation::whereBetween('period', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();
    }

    /**
     * Generate rent obligations only for the selected lease. This avoids repeatedly
     * scanning every organization's leases when a single payment is reconciled.
     */
    public function ensureForLeaseThrough(Leases $lease, CarbonImmutable $through): void
    {
        $period = CarbonImmutable::parse($lease->start_date)->startOfMonth();
        $lastPeriod = $through->startOfMonth();

        while ($period->lessThanOrEqualTo($lastPeriod)) {
            $this->ensureLeaseObligationForPeriod($lease, $period);
            $period = $period->addMonth();
        }
    }

    private function ensureLeaseObligationForPeriod(Leases $lease, CarbonImmutable $period): void
    {
        $monthStart = $period->startOfMonth();
        $monthEnd = $period->endOfMonth();
        $start = CarbonImmutable::parse($lease->start_date);
        $end = $lease->end_date ? CarbonImmutable::parse($lease->end_date) : null;

        if (in_array($lease->getRawOriginal('status'), ['ended', 'terminated'], true)
            || $start->greaterThan($monthEnd)
            || ($end && $end->lessThan($monthStart))) {
            return;
        }

        $day = min(max((int) ($lease->rent_due_day ?: 5), 1), $monthEnd->day);
        $dueDate = $monthStart->setDay($day);

        RentObligation::firstOrCreate(
            ['lease_id' => $lease->id, 'period' => $monthStart->toDateString()],
            [
                'organization_id' => $lease->organization_id,
                'property_id' => $lease->property_id,
                'unit_id' => $lease->unit_id,
                'tenant_id' => $lease->tenant_id,
                'due_date' => $dueDate->toDateString(),
                'amount_due' => $lease->monthly_rent,
            ]
        );

        $this->applyAvailableCredits($lease, $monthStart);
    }

    public function ensureCurrentAndNext(): void
    {
        $now = CarbonImmutable::now();
        $this->ensureForPeriod($now);
        $this->ensureForPeriod($now->addMonth());
    }

    public function applyAvailableCredits(Leases $lease, CarbonImmutable $through): void
    {
        DB::transaction(function () use ($lease, $through) {
            $credits = RentPaymentCredit::query()
                ->where('lease_id', $lease->id)
                ->where('status', 'available')
                ->where('remaining_amount', '>', 0)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($credits->isEmpty()) {
                return;
            }

            $firstCreditMonth = CarbonImmutable::parse($credits->min(fn ($credit) => $credit->created_at))->startOfMonth();
            $obligations = RentObligation::query()
                ->where('lease_id', $lease->id)
                ->whereDate('period', '>=', $firstCreditMonth->toDateString())
                ->whereDate('period', '<=', $through->startOfMonth()->toDateString())
                ->orderBy('due_date')
                ->lockForUpdate()
                ->get()
                ->filter(fn (RentObligation $obligation) => (float) $obligation->balance > 0)
                ->values();

            foreach ($credits as $credit) {
                $remainingCredit = round((float) $credit->remaining_amount, 2);

                foreach ($obligations as $obligation) {
                    if ($remainingCredit <= 0) {
                        break;
                    }

                    $balance = round((float) $obligation->balance, 2);
                    if ($balance <= 0) {
                        continue;
                    }

                    $allocated = min($remainingCredit, $balance);

                    $allocation = PaymentAllocation::query()->firstOrNew([
                        'rent_payment_credit_id' => $credit->id,
                        'rent_obligation_id' => $obligation->id,
                    ]);

                    // A prior attempt may have left a partial allocation for this
                    // credit/obligation pair. Extend that allocation instead of
                    // silently ignoring it while consuming the remaining credit.
                    $allocation->amount = round(
                        (float) $allocation->amount + $allocated,
                        2
                    );
                    $allocation->payment_id = null;
                    $allocation->save();

                    $remainingCredit = round($remainingCredit - $allocated, 2);
                    $obligation->refresh();
                }

                $credit->forceFill([
                    'remaining_amount' => $remainingCredit,
                    'status' => $remainingCredit <= 0 ? 'consumed' : 'available',
                ])->save();
            }
        }, 3);
    }

    /**
     * Allocate a confirmed rent payment across the lease's oldest outstanding
     * rent periods. Any remainder is retained as an explicit rent credit.
     *
     * This is the confirmed-payment path for manager-recorded, tenant-recorded,
     * and verified online payments. Pending submissions should only be attached
     * to an expected period; they must not reduce rent balances before confirmation.
     */
    public function allocateConfirmedPayment(Payment $payment): ?RentObligation
    {
        if ($payment->payment_type !== 'rent' || !$payment->lease_id || $payment->status !== 'paid') {
            return null;
        }

        return DB::transaction(function () use ($payment) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($payment->payment_type !== 'rent' || !$payment->lease_id || $payment->status !== 'paid') {
                return null;
            }

            // Do not repeat or silently repair an existing ledger representation.
            // Existing inconsistencies should go through an audited review workflow.
            if ($payment->allocations()->exists() || $payment->rentPaymentCredits()->exists()) {
                return $payment->rentObligation()->first();
            }

            $lease = Leases::query()
                ->where('organization_id', $payment->organization_id)
                ->findOrFail($payment->lease_id);

            $amountCents = (int) round((float) $payment->amount * 100);
            if ($amountCents <= 0) {
                throw new \InvalidArgumentException('A confirmed rent payment must have a positive amount.');
            }

            $paidAt = CarbonImmutable::parse($payment->payment_date ?: now());
            $through = $paidAt->startOfMonth();

            // Remove the old single-month legacy pointer before calculating balances.
            // Otherwise this payment would count against its own obligation before the
            // explicit allocations are created.
            if ($payment->rent_obligation_id !== null) {
                $payment->forceFill(['rent_obligation_id' => null])->saveQuietly();
            }

            $this->ensureForLeaseThrough($lease, $through);

            $obligations = RentObligation::query()
                ->where('lease_id', $lease->id)
                ->whereDate('period', '<=', $through->toDateString())
                ->orderBy('due_date')
                ->lockForUpdate()
                ->get()
                ->filter(fn (RentObligation $obligation) => (float) $obligation->balance > 0)
                ->values();

            $remainingCents = $amountCents;
            $firstObligationId = null;
            $allocationCount = 0;

            foreach ($obligations as $obligation) {
                if ($remainingCents <= 0) {
                    break;
                }

                $balanceCents = (int) round((float) $obligation->balance * 100);
                if ($balanceCents <= 0) {
                    continue;
                }

                $allocatedCents = min($remainingCents, $balanceCents);
                PaymentAllocation::create([
                    'payment_id' => $payment->id,
                    'rent_obligation_id' => $obligation->id,
                    'amount' => $allocatedCents / 100,
                ]);

                $firstObligationId ??= $obligation->id;
                $allocationCount++;
                $remainingCents -= $allocatedCents;
                $obligation->refresh();
            }

            if ($remainingCents > 0) {
                RentPaymentCredit::create([
                    'organization_id' => $payment->organization_id,
                    'tenant_id' => $lease->tenant_id,
                    'lease_id' => $lease->id,
                    'source_payment_id' => $payment->id,
                    'amount' => $remainingCents / 100,
                    'remaining_amount' => $remainingCents / 100,
                    'status' => 'available',
                    'notes' => 'Rent overpayment retained for future rent after confirmed payment allocation.',
                ]);
            }

            $payment->forceFill([
                'rent_obligation_id' => $allocationCount === 1 ? $firstObligationId : null,
            ])->saveQuietly();

            return $firstObligationId
                ? RentObligation::find($firstObligationId)
                : null;
        }, 3);
    }

    public function attachPayment(Payment $payment): ?RentObligation
    {
        if ($payment->payment_type !== 'rent' || !$payment->lease_id) {
            return null;
        }

        $paymentDate = CarbonImmutable::parse($payment->payment_date ?: now());
        $period = $paymentDate->startOfMonth();

        $obligation = RentObligation::where('lease_id', $payment->lease_id)
            ->where('period', $period->toDateString())
            ->first();

        if (!$obligation) {
            return null;
        }

        if ($payment->rent_obligation_id !== $obligation->id) {
            $payment->forceFill(['rent_obligation_id' => $obligation->id])->saveQuietly();
        }

        return $obligation;
    }

    public function syncExistingPayments(CarbonImmutable $period): void
    {
        $payments = Payment::where('payment_type', 'rent')
            ->whereBetween('payment_date', [
                $period->startOfMonth()->toDateString(),
                $period->endOfMonth()->toDateString(),
            ])
            ->whereNull('rent_obligation_id')
            ->get();

        foreach ($payments as $payment) {
            $this->attachPayment($payment);
        }
    }
}
