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
            $start = CarbonImmutable::parse($lease->start_date);
            $end = $lease->end_date ? CarbonImmutable::parse($lease->end_date) : null;
            if ($start->greaterThan($monthEnd) || ($end && $end->lessThan($monthStart))) {
                continue;
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

        return RentObligation::whereBetween('period', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();
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

                    PaymentAllocation::firstOrCreate(
                        [
                            'rent_payment_credit_id' => $credit->id,
                            'rent_obligation_id' => $obligation->id,
                        ],
                        [
                            'payment_id' => null,
                            'amount' => round($allocated, 2),
                        ]
                    );

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
