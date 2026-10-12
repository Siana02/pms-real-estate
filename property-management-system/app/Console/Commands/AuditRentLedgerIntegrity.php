<?php

namespace App\\Console\\Commands;

use App\\Models\\Payment;
use App\\Models\\PaymentAllocation;
use App\\Models\\PaymentTransaction;
use App\\Models\\RentLedgerReviewFlag;
use App\\Models\\RentObligation;
use Illuminate\\Console\\Command;

class AuditRentLedgerIntegrity extends Command
{
    protected $signature = 'rent:ledger-audit';

    protected $description = 'Audit confirmed rent ledger records and persist review flags without modifying the ledger';

    public function handle(): int
    {
        $findings = [];
        $flag = function (string $type, int $id, string $issue, string $details) use (&$findings): void {
            $findings[] = [$type, $id, $issue, $details];
        };

        Payment::query()
            ->where('status', 'paid')
            ->where('payment_type', 'rent')
            ->with([
                'lease',
                'rentObligation.lease',
                'allocations.rentObligation.lease',
                'rentPaymentCredits.lease',
                'rentPaymentCredits.allocations.rentObligation.lease',
            ])
            ->chunkById(200, function ($payments) use ($flag): void {
                foreach ($payments as $payment) {
                    $lease = $payment->lease;
                    $allocations = $payment->allocations;
                    $credits = $payment->rentPaymentCredits;
                    $allocatedCents = (int) round((float) $allocations->sum('amount') * 100);
                    $creditCents = (int) round((float) $credits->sum('amount') * 100);
                    $legacyCents = 0;

                    if (!$lease || (int) $lease->organization_id !== (int) $payment->organization_id) {
                        $flag('payment', (int) $payment->id, 'payment_lease_scope', 'Paid rent payment has no lease in the same organization.');
                    }

                    if ($lease && $allocations->isEmpty() && $credits->isEmpty() && $payment->rent_obligation_id) {
                        $obligation = $payment->rentObligation;
                        if (!$obligation
                            || (int) $obligation->lease_id !== (int) $lease->id
                            || (int) $obligation->organization_id !== (int) $lease->organization_id
                            || (int) $obligation->property_id !== (int) $lease->property_id
                            || (int) $obligation->unit_id !== (int) $lease->unit_id
                            || (int) $obligation->tenant_id !== (int) $lease->tenant_id) {
                            $flag('payment', (int) $payment->id, 'legacy_obligation_scope', 'Legacy single-month link does not match the payment lease ownership fields.');
                        } else {
                            $legacyCents = (int) round((float) $payment->amount * 100);
                        }
                    }

                    $paymentCents = (int) round((float) $payment->amount * 100);
                    if ($paymentCents <= 0 || $allocatedCents + $creditCents + $legacyCents !== $paymentCents) {
                        $flag('payment', (int) $payment->id, 'payment_not_represented_once', 'Payment amount does not equal direct allocations plus original rent credits (or a valid legacy single-month link).');
                    }

                    foreach ($allocations as $allocation) {
                        $obligation = $allocation->rentObligation;
                        if ($allocation->rent_payment_credit_id !== null
                            || (float) $allocation->amount <= 0
                            || !$obligation
                            || !$lease
                            || (int) $obligation->lease_id !== (int) $lease->id
                            || (int) $obligation->organization_id !== (int) $lease->organization_id
                            || (int) $obligation->property_id !== (int) $lease->property_id
                            || (int) $obligation->unit_id !== (int) $lease->unit_id
                            || (int) $obligation->tenant_id !== (int) $lease->tenant_id) {
                            $flag('payment_allocation', (int) $allocation->id, 'allocation_scope_or_source', 'Allocation has an invalid source, non-positive amount, or obligation outside the payment lease scope.');
                        }
                    }

                    foreach ($credits as $credit) {
                        if (!$lease
                            || (int) $credit->lease_id !== (int) $lease->id
                            || (int) $credit->organization_id !== (int) $lease->organization_id
                            || (int) $credit->tenant_id !== (int) $lease->tenant_id
                            || (int) $credit->source_payment_id !== (int) $payment->id
                            || (float) $credit->amount <= 0
                            || (float) $credit->remaining_amount < 0
                            || (float) $credit->remaining_amount > (float) $credit->amount) {
                            $flag('rent_payment_credit', (int) $credit->id, 'credit_scope_or_amount', 'Credit has mismatched ownership/source or an invalid remaining amount.');
                        }

                        $creditAllocatedCents = (int) round((float) $credit->allocations->sum('amount') * 100);
                        if ($creditAllocatedCents > (int) round((float) $credit->amount * 100)) {
                            $flag('rent_payment_credit', (int) $credit->id, 'credit_overallocated', 'Credit allocations exceed the credit’s original amount.');
                        }

                        foreach ($credit->allocations as $allocation) {
                            $obligation = $allocation->rentObligation;
                            if ($allocation->payment_id !== null
                                || (float) $allocation->amount <= 0
                                || !$obligation
                                || (int) $obligation->lease_id !== (int) $credit->lease_id
                                || (int) $obligation->organization_id !== (int) $credit->organization_id
                                || (int) $obligation->property_id !== (int) $lease?->property_id
                                || (int) $obligation->unit_id !== (int) $lease?->unit_id
                                || (int) $obligation->tenant_id !== (int) $credit->tenant_id) {
                                $flag('credit_allocation', (int) $allocation->id, 'credit_allocation_scope_or_source', 'Credit allocation has an invalid source or points outside the credit lease/property/unit/tenant scope.');
                            }
                        }
                    }
                }
            });

        RentObligation::query()->with('lease')->chunkById(200, function ($obligations) use ($flag): void {
            foreach ($obligations as $obligation) {
                $lease = $obligation->lease;
                if (!$lease
                    || (int) $obligation->organization_id !== (int) $lease->organization_id
                    || (int) $obligation->property_id !== (int) $lease->property_id
                    || (int) $obligation->unit_id !== (int) $lease->unit_id
                    || (int) $obligation->tenant_id !== (int) $lease->tenant_id) {
                    $flag('rent_obligation', (int) $obligation->id, 'obligation_scope', 'Rent obligation ownership fields do not match its lease.');
                }

                if ((float) $obligation->amount_paid > (float) $obligation->amount_due) {
                    $flag('rent_obligation', (int) $obligation->id, 'obligation_overallocated', 'Recorded payments exceed the rent obligation amount due.');
                }
            }
        });

        PaymentAllocation::query()
            ->where(function ($query): void {
                $query->where(function ($source): void {
                    $source->whereNull('payment_id')->whereNull('rent_payment_credit_id');
                })->orWhere(function ($source): void {
                    $source->whereNotNull('payment_id')->whereNotNull('rent_payment_credit_id');
                });
            })
            ->chunkById(200, function ($allocations) use ($flag): void {
                foreach ($allocations as $allocation) {
                    $flag('payment_allocation', (int) $allocation->id, 'allocation_source_cardinality', 'Allocation must belong to exactly one source: a payment or a rent payment credit.');
                }
            });

        PaymentTransaction::query()
            ->whereIn('status', ['reconciled', 'reconciled_with_credit'])
            ->with(['payment.lease', 'matchedLease'])
            ->chunkById(200, function ($transactions) use ($flag): void {
                foreach ($transactions as $transaction) {
                    $payment = $transaction->payment;
                    if (!$payment
                        || (int) $payment->organization_id !== (int) $transaction->organization_id
                        || abs(round((float) $payment->amount, 2) - round((float) $transaction->amount, 2)) >= 0.001
                        || (int) $payment->lease_id !== (int) $transaction->matched_lease_id) {
                        $flag('payment_transaction', (int) $transaction->id, 'reconciled_transaction_mismatch', 'Reconciled provider transaction does not point to a payment with the same organization, amount and matched lease.');
                    }
                }
            });

        foreach ($findings as [$recordType, $recordId, $issueCode, $details]) {
            $reviewFlag = RentLedgerReviewFlag::query()->firstOrNew([
                'record_type' => $recordType,
                'record_id' => $recordId,
                'issue_code' => $issueCode,
            ]);

            $timestamp = now();
            if (!$reviewFlag->exists) {
                $reviewFlag->first_flagged_at = $timestamp;
            }
            $reviewFlag->details = $details;
            $reviewFlag->last_flagged_at = $timestamp;

            // If the same problem reappears after being marked resolved, reopen it.
            if (!$reviewFlag->exists || $reviewFlag->status === 'resolved') {
                $reviewFlag->status = 'open';
                $reviewFlag->reviewed_at = null;
                $reviewFlag->reviewed_by = null;
                $reviewFlag->resolution_notes = null;
            }

            $reviewFlag->save();
        }

        if ($findings === []) {
            $this->info('PASS: no current rent-ledger integrity findings were detected. Existing review flags are not auto-resolved.');
            return self::SUCCESS;
        }

        $this->warn('REVIEW REQUIRED: found ' . count($findings) . ' rent-ledger integrity issue(s). Review flags were saved; no payment, allocation, credit or obligation was changed.');
        $this->table(['Record type', 'ID', 'Issue', 'Details'], $findings);

        return self::FAILURE;
    }
}
