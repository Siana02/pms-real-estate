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
use Illuminate\Support\Facades\Log;

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
        if ($issue = $this->leaseScopeIssue($lease)) {
            Log::warning('Rent ledger obligation generation held for review.', [
                'lease_id' => $lease->id,
                'issue' => $issue,
            ]);
            throw new \RuntimeException($issue . ' Rent obligations were not generated.');
        }

        $period = CarbonImmutable::parse($lease->start_date)->startOfMonth();
        $lastPeriod = $through->startOfMonth();
        $existingPeriods = RentObligation::query()
            ->where('lease_id', $lease->id)
            ->whereBetween('period', [$period->toDateString(), $lastPeriod->toDateString()])
            ->pluck('period')
            ->map(fn ($value) => CarbonImmutable::parse($value)->toDateString())
            ->flip();

        while ($period->lessThanOrEqualTo($lastPeriod)) {
            // Existing periods are already represented. Skip repeat firstOrCreate
            // calls for every historical month on each payment/page load.
            if (!$existingPeriods->has($period->toDateString())) {
                $this->ensureLeaseObligationForPeriod($lease, $period);
            }
            $period = $period->addMonth();
        }

        // Also applies newly-created or previously unconsumed credits to existing
        // obligations, including a next-month obligation already prepared by the scheduler.
        $this->applyAvailableCredits($lease, $lastPeriod);

        if ($this->obligationScopeMismatchExists($lease, $lastPeriod)) {
            // Callers that reconcile a provider transaction must persist needs_review
            // on that transaction. Log here, but let the caller make that decision.
            Log::warning('Rent ledger contains historical obligations with mismatched ownership fields.', [
                'lease_id' => $lease->id,
                'organization_id' => $lease->organization_id,
                'property_id' => $lease->property_id,
                'unit_id' => $lease->unit_id,
                'tenant_id' => $lease->tenant_id,
                'through' => $lastPeriod->toDateString(),
            ]);
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

        if ($issue = $this->leaseScopeIssue($lease)) {
            Log::warning('Skipped rent-obligation generation for an inconsistent lease.', [
                'lease_id' => $lease->id,
                'period' => $monthStart->toDateString(),
                'issue' => $issue,
            ]);
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

    private function leaseScopeIssue(Leases $lease): ?string
    {
        $property = $lease->property()->first();
        if (!$property || (int) $property->organization_id !== (int) $lease->organization_id) {
            return 'The lease property is missing or belongs to a different organization.';
        }

        $unit = $lease->unit()->first();
        if (!$unit || (int) $unit->property_id !== (int) $lease->property_id) {
            return 'The lease unit is missing or belongs to a different property.';
        }

        $tenant = $lease->tenant()->first();
        if (!$tenant || (int) $tenant->organization_id !== (int) $lease->organization_id) {
            return 'The lease tenant is missing or belongs to a different organization.';
        }

        return null;
    }

    private function obligationScopeMismatchExists(Leases $lease, CarbonImmutable $through): bool
    {
        return RentObligation::query()
            ->where('lease_id', $lease->id)
            ->whereDate('period', '<=', $through->startOfMonth()->toDateString())
            ->where(fn ($query) => $query
                ->where('organization_id', '!=', $lease->organization_id)
                ->orWhere('property_id', '!=', $lease->property_id)
                ->orWhere('unit_id', '!=', $lease->unit_id)
                ->orWhere('tenant_id', '!=', $lease->tenant_id))
            ->exists();
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

            $lease = Leases::query()
                ->where('organization_id', $payment->organization_id)
                ->findOrFail($payment->lease_id);

            if ($issue = $this->leaseScopeIssue($lease)) {
                Log::warning('Confirmed payment allocation held for review because lease ownership is inconsistent.', [
                    'payment_id' => $payment->id,
                    'lease_id' => $lease->id,
                    'issue' => $issue,
                ]);
                throw new \RuntimeException($issue . ' Confirmed payment was not reallocated.');
            }

            $paidAt = CarbonImmutable::parse($payment->payment_date ?: now());
            $through = $paidAt->startOfMonth();

            // Existing rows are immutable evidence until reviewed. Verify their
            // representation and ownership before treating a retry as successful.
            if ($payment->allocations()->exists() || $payment->rentPaymentCredits()->exists()) {
                $allocations = $payment->allocations()->with('rentObligation')->get();
                $credits = $payment->rentPaymentCredits()->with('allocations.rentObligation')->get();
                $allocatedCents = (int) round((float) $allocations->sum('amount') * 100);
                $creditCents = (int) round((float) $credits->sum('amount') * 100);
                $paymentCents = (int) round((float) $payment->amount * 100);
                $invalidAllocation = $allocations->contains(function (PaymentAllocation $allocation) use ($lease) {
                    $obligation = $allocation->rentObligation;
                    return !$obligation
                        || (int) $obligation->lease_id !== (int) $lease->id
                        || (int) $obligation->organization_id !== (int) $lease->organization_id
                        || (int) $obligation->property_id !== (int) $lease->property_id
                        || (int) $obligation->unit_id !== (int) $lease->unit_id
                        || (int) $obligation->tenant_id !== (int) $lease->tenant_id
                        || $allocation->rent_payment_credit_id !== null
                        || (float) $allocation->amount <= 0
                        || (float) $obligation->amount_paid > (float) $obligation->amount_due;
                });
                $invalidCredit = $credits->contains(fn (RentPaymentCredit $credit) =>
                    (int) $credit->lease_id !== (int) $lease->id
                    || (int) $credit->organization_id !== (int) $lease->organization_id
                    || (int) $credit->tenant_id !== (int) $lease->tenant_id
                    || (int) $credit->source_payment_id !== (int) $payment->id
                    || (float) $credit->amount <= 0
                    || (float) $credit->remaining_amount < 0
                    || (float) $credit->remaining_amount > (float) $credit->amount
                    || ((int) round((float) $credit->allocations->sum('amount') * 100)
                        + (int) round((float) $credit->remaining_amount * 100)
                        !== (int) round((float) $credit->amount * 100))
                    || $credit->allocations->contains(function (PaymentAllocation $allocation) use ($lease) {
                        $obligation = $allocation->rentObligation;
                        return $allocation->payment_id !== null
                            || (float) $allocation->amount <= 0
                            || !$obligation
                            || (int) $obligation->lease_id !== (int) $lease->id
                            || (int) $obligation->organization_id !== (int) $lease->organization_id
                            || (int) $obligation->property_id !== (int) $lease->property_id
                            || (int) $obligation->unit_id !== (int) $lease->unit_id
                            || (int) $obligation->tenant_id !== (int) $lease->tenant_id
                            || (float) $obligation->amount_paid > (float) $obligation->amount_due;
                    }));

                if ($allocatedCents + $creditCents !== $paymentCents
                    || $paymentCents <= 0
                    || $invalidAllocation
                    || $invalidCredit
                    || $this->obligationScopeMismatchExists($lease, $through)) {
                    Log::warning('Confirmed payment has an inconsistent existing ledger representation; no automatic repair was made.', [
                        'payment_id' => $payment->id,
                        'lease_id' => $lease->id,
                    ]);
                    throw new \RuntimeException('This confirmed payment has inconsistent ledger records and requires review. No automatic correction was made.');
                }

                return $payment->rentObligation()->first();
            }

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

            if ($this->obligationScopeMismatchExists($lease, $through)) {
                Log::warning('Confirmed payment allocation stopped because historical obligations have inconsistent ownership fields.', [
                    'payment_id' => $payment->id,
                    'lease_id' => $lease->id,
                ]);
                throw new \RuntimeException('Historical rent obligations have inconsistent ownership fields and require review. No allocation was created.');
            }

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

                // Generate enough future monthly obligations to visibly carry this
                // credit forward, then allocate it against those months immediately.
                // The helper respects the lease end date and remains idempotent.
                $monthlyRent = max((float) $lease->monthly_rent, 1.0);
                $monthsToCover = max(1, min(24, (int) ceil(($remainingCents / 100) / $monthlyRent)));
                $this->ensureForLeaseThrough($lease, $through->addMonths($monthsToCover));
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

        // This is only a pending-payment convenience link, never a way to repair a
        // confirmed payment's history. Confirmed rent payments must use explicit
        // allocations; legacy paid rows are left for the read-only integrity audit.
        if ($payment->status !== 'pending') {
            return $payment->rentObligation()->first();
        }

        $paymentLease = Leases::query()
            ->where('organization_id', $payment->organization_id)
            ->find($payment->lease_id);
        if (!$paymentLease || $this->leaseScopeIssue($paymentLease)) {
            Log::warning('Skipped attaching pending payment to a rent obligation because lease ownership is inconsistent.', [
                'payment_id' => $payment->id,
                'lease_id' => $payment->lease_id,
            ]);
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
            ->where('status', 'pending')
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
