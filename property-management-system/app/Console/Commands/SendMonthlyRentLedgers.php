<?php

namespace App\Console\Commands;

use App\Models\MonthlyRentLedgerReport;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\RentPaymentCredit;
use App\Models\RentObligation;
use App\Services\RentLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendMonthlyRentLedgers extends Command
{
    protected $signature = 'rent:email-monthly-ledgers {--period= : Month to report in YYYY-MM format; defaults to the current month} {--organization= : Process only one organization ID} {--force : Re-send even if a report for this period was already sent}';

    protected $description = 'Email each organization its full rent ledger and payment reconciliation as a CSV on the monthly close date.';

    public function handle(RentLedgerService $ledger): int
    {
        $periodInput = $this->option('period') ?: now()->format('Y-m');
        try {
            $period = CarbonImmutable::createFromFormat('!Y-m', $periodInput)->startOfMonth();
        } catch (Throwable) {
            $this->error('The --period option must be a valid month in YYYY-MM format.');
            return self::FAILURE;
        }
        if (!$period || $period->format('Y-m') !== $periodInput) {
            $this->error('The --period option must be a valid month in YYYY-MM format.');
            return self::FAILURE;
        }

        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->error('Monthly rent ledger reporting is restricted to MySQL. No report was generated.');
            Log::critical('Monthly rent ledger report refused because the active database driver is not MySQL.', [
                'driver' => DB::connection()->getDriverName(),
            ]);
            return self::FAILURE;
        }

        // Ensure the selected month has an obligation for every lease whose dates
        // cover that month. Existing obligations are preserved with firstOrCreate.
        $ledger->ensureForPeriod($period);

        $organizations = Organization::query()->with('owner:id,name,email')
            ->when($this->option('organization'), fn ($query, $id) => $query->whereKey((int) $id))
            ->orderBy('id')
            ->get();

        $failed = 0;
        $sent = 0;
        $skipped = 0;
        foreach ($organizations as $organization) {
            $run = null;
            try {
                $run = DB::transaction(function () use ($organization, $period) {
                    $row = MonthlyRentLedgerReport::query()->firstOrCreate(
                        ['organization_id' => $organization->id, 'report_period' => $period->toDateString()],
                        ['status' => 'pending']
                    );
                    return MonthlyRentLedgerReport::query()->whereKey($row->id)->lockForUpdate()->firstOrFail();
                }, 3);

                if ($run->status === 'sent' && !$this->option('force')) {
                    $skipped++;
                    continue;
                }

                $recipient = trim((string) ($organization->email ?: $organization->owner?->email));
                if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
                    $run->forceFill([
                        'status' => 'failed',
                        'recipient_email' => null,
                        'last_error' => 'No valid organization email or owner email is configured.',
                    ])->save();
                    $failed++;
                    $this->warn("Organization {$organization->id}: no valid recipient email; report was not sent.");
                    continue;
                }

                $asOf = $period->isSameMonth(now()) ? CarbonImmutable::today() : $period->endOfMonth();
                [$csv, $rentRows, $paymentRows, $creditRows] = $this->buildCsv($organization->id, $period, $asOf);
                $hash = hash('sha256', $csv);
                $filename = sprintf(
                    'MARSWebz-Rent-Ledger-%s-%s.csv',
                    preg_replace('/[^A-Za-z0-9_-]+/', '-', $organization->name ?: 'Organization'),
                    $period->format('Y-m')
                );

                $run->forceFill([
                    'status' => 'sending',
                    'recipient_email' => $recipient,
                    'rent_rows' => $rentRows,
                    'payment_rows' => $paymentRows,
                    'credit_rows' => $creditRows,
                    'file_sha256' => $hash,
                    'last_error' => null,
                ])->save();

                $body = implode("\n", [
                    'Hello ' . ($organization->name ?: 'there') . ',',
                    '',
                    'Attached is your full rent ledger and payment reconciliation report as of ' . $asOf->toFormattedDateString() . '.',
                    'The report includes each rent obligation by property, unit, tenant and lease, rent due dates, allocated payments, outstanding balances and overdue status, together with the payment transaction history recorded in the PMS through the report date.',
                    '',
                    'Overdue status is calculated from each lease rent due date and configured grace period. A payment is only reflected as received when its status is confirmed in the PMS; pending or unverified submissions are not counted as paid.',
                    '',
                    'Please review the report against your M-Pesa/bank statement and contact support from inside the PMS if you find a mismatch.',
                    '',
                    'MARSWebz Property Management System',
                ]);

                Mail::raw($body, function ($message) use ($recipient, $organization, $period, $filename, $csv) {
                    $message->to($recipient)
                        ->subject('Monthly Rent Ledger & Payment Reconciliation — ' . $organization->name . ' — ' . $period->format('F Y'))
                        ->attachData($csv, $filename, ['mime' => 'text/csv; charset=UTF-8']);
                });

                $run->forceFill([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'last_error' => null,
                ])->save();

                $sent++;
                $this->info("Organization {$organization->id}: emailed {$filename} to {$recipient}.");
            } catch (Throwable $exception) {
                $failed++;
                if (isset($run)) {
                    $run->forceFill([
                        'status' => 'failed',
                        'last_error' => mb_substr($exception->getMessage(), 0, 4000),
                    ])->save();
                }
                Log::error('Monthly rent ledger email failed.', [
                    'organization_id' => $organization->id,
                    'period' => $period->toDateString(),
                    'exception' => $exception::class,
                ]);
                $this->error("Organization {$organization->id}: report failed. See application logs.");
            }
        }

        $this->info("Monthly ledger run complete. Sent: {$sent}; skipped: {$skipped}; failed: {$failed}.");
        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Build one CSV containing all rent obligations through the close month and
     * all payment transaction records through the close date. Nothing is mutated
     * here other than first-time obligation generation by the ledger service.
     *
     * @return array{0:string,1:int,2:int,3:int}
     */
    private function buildCsv(int $organizationId, CarbonImmutable $period, CarbonImmutable $asOf): array
    {
        $obligations = RentObligation::query()
            ->where('organization_id', $organizationId)
            ->whereDate('period', '<=', $period->endOfMonth()->toDateString())
            ->with(['organization:id,name', 'property:id,name,address', 'unit:id,property_id,unit_number', 'tenant:id,first_name,last_name,email,phone', 'lease:id,rent_due_day,rent_grace_period_days'])
            ->orderBy('period')
            ->orderBy('property_id')
            ->orderBy('unit_id')
            ->get();

        $obligationIds = $obligations->pluck('id');
        $allocations = PaymentAllocation::query()
            ->whereIn('rent_obligation_id', $obligationIds)
            ->with(['payment:id,lease_id,amount,payment_date,payment_method,status,provider_transaction_id,reference,provider', 'rentPaymentCredit:id,source_payment_id,amount,remaining_amount,status'])
            ->get()
            ->groupBy('rent_obligation_id');

        $payments = Payment::query()
            ->where('organization_id', $organizationId)
            ->where(fn ($query) => $query->whereDate('payment_date', '<=', $asOf->toDateString())->orWhereNull('payment_date'))
            ->with(['lease.property:id,name', 'lease.unit:id,unit_number', 'lease.tenant:id,first_name,last_name', 'allocations.rentObligation:id,period', 'rentPaymentCredits.allocations.rentObligation:id,period'])
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get();

        $paymentDetailsByObligation = [];
        foreach ($allocations as $obligationId => $items) {
            foreach ($items as $allocation) {
                $payment = $allocation->payment ?: $allocation->rentPaymentCredit?->sourcePayment;
                if (!$payment) {
                    continue;
                }
                $paymentDetailsByObligation[$obligationId][] = sprintf(
                    '%s %s KES %s (%s)',
                    $payment->provider_transaction_id ?: $payment->reference ?: ('Payment #' . $payment->id),
                    $payment->payment_date?->format('Y-m-d') ?: 'date n/a',
                    number_format((float) $allocation->amount, 2, '.', ''),
                    $payment->status
                );
            }
        }

        $legacyPaid = Payment::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'paid')
            ->where(fn ($query) => $query->whereDate('payment_date', '<=', $asOf->toDateString())->orWhereNull('payment_date'))
            ->whereIn('rent_obligation_id', $obligationIds)
            ->whereDoesntHave('allocations')
            ->selectRaw('rent_obligation_id, SUM(amount) as total')
            ->groupBy('rent_obligation_id')
            ->pluck('total', 'rent_obligation_id');

        $credits = RentPaymentCredit::query()
            ->where('organization_id', $organizationId)
            ->whereDate('created_at', '<=', $asOf->toDateString())
            ->with(['organization:id,name', 'lease.property:id,name', 'lease.unit:id,unit_number', 'lease.tenant:id,first_name,last_name,email,phone', 'sourcePayment:id,amount,payment_date,payment_method,status,provider_transaction_id,reference,provider', 'allocations.rentObligation:id,period'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        $stream = fopen('php://temp', 'w+');
        if ($stream === false) {
            throw new \RuntimeException('Could not open temporary report stream.');
        }
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, [
            'record_type', 'organization_id', 'organization_name', 'report_period', 'property', 'property_address',
            'unit', 'tenant', 'tenant_email', 'tenant_phone', 'lease_id', 'rent_period', 'rent_due_date',
            'monthly_rent_due', 'amount_paid_allocated', 'outstanding_balance', 'rent_status', 'days_overdue',
            'payment_id', 'payment_date', 'payment_method', 'provider', 'provider_receipt_or_reference',
            'payment_amount', 'payment_status', 'allocation_details', 'report_as_of',
        ]);

        $rentRowCount = 0;
        $asOfDate = $asOf->toDateString();
        foreach ($obligations as $obligation) {
            $rentRowCount++;
            $paid = 0.0;
            foreach ($allocations->get($obligation->id, collect()) as $allocation) {
                $paid += (float) $allocation->amount;
            }
            $paid += (float) ($legacyPaid[$obligation->id] ?? 0);
            $due = (float) $obligation->amount_due;
            $balance = max(0, $due - $paid);
            $dueDate = CarbonImmutable::parse($obligation->due_date);
            $grace = (int) ($obligation->lease?->rent_grace_period_days ?? 0);
            $overdue = $balance > 0 && $asOf->greaterThan($dueDate->addDays($grace));
            $status = $balance <= 0.009 ? 'paid' : ($paid > 0 ? ($overdue ? 'partially_paid_overdue' : 'partially_paid') : ($overdue ? 'overdue' : ($dueDate->greaterThan($asOf) ? 'upcoming' : 'due')));
            $daysOverdue = $overdue ? max(0, $dueDate->addDays($grace)->diffInDays($asOf, false)) : 0;

            fputcsv($stream, [
                'rent_obligation', $organizationId, $obligation->organization?->name ?? '',
                $period->format('Y-m'), $obligation->property?->name ?? 'Property unavailable',
                $obligation->property?->address ?? '', $obligation->unit?->unit_number ?? 'Unit unavailable',
                trim(($obligation->tenant?->first_name ?? '') . ' ' . ($obligation->tenant?->last_name ?? '')),
                $obligation->tenant?->email ?? '', $obligation->tenant?->phone ?? '', $obligation->lease_id,
                CarbonImmutable::parse($obligation->period)->format('Y-m'), $obligation->due_date,
                number_format($due, 2, '.', ''), number_format($paid, 2, '.', ''),
                number_format($balance, 2, '.', ''), $status, $daysOverdue,
                '', '', '', '', '', '', '', implode(' | ', $paymentDetailsByObligation[$obligation->id] ?? []), $asOfDate,
            ]);
        }

        $paymentRowCount = 0;
        foreach ($payments as $payment) {
            $paymentRowCount++;
            $allocationDetails = [];
            foreach ($payment->allocations as $allocation) {
                $allocationDetails[] = sprintf('%s KES %s', $allocation->rentObligation?->period ?? 'period unknown', number_format((float) $allocation->amount, 2, '.', ''));
            }
            foreach ($payment->rentPaymentCredits as $credit) {
                foreach ($credit->allocations as $allocation) {
                    $allocationDetails[] = sprintf('%s (credit) KES %s', $allocation->rentObligation?->period ?? 'period unknown', number_format((float) $allocation->amount, 2, '.', ''));
                }
            }
            fputcsv($stream, [
                'payment_transaction', $organizationId, $payment->organization?->name ?? '',
                $period->format('Y-m'), $payment->lease?->property?->name ?? '',
                '', $payment->lease?->unit?->unit_number ?? '',
                trim(($payment->lease?->tenant?->first_name ?? '') . ' ' . ($payment->lease?->tenant?->last_name ?? '')),
                '', '', $payment->lease_id, '', '', '', '', '', '', '',
                $payment->id, $payment->payment_date?->format('Y-m-d') ?? '', $payment->payment_method ?? '',
                $payment->provider ?? '', $payment->provider_transaction_id ?: $payment->reference ?: $payment->tx_ref ?: '',
                number_format((float) $payment->amount, 2, '.', ''), $payment->status,
                implode(' | ', $allocationDetails), $asOfDate,
            ]);
        }

        $creditRowCount = 0;
        foreach ($credits as $credit) {
            $creditRowCount++;
            $source = $credit->sourcePayment;
            $creditAllocations = $credit->allocations
                ->map(fn (PaymentAllocation $allocation) => sprintf(
                    '%s KES %s',
                    $allocation->rentObligation?->period ?? 'period unknown',
                    number_format((float) $allocation->amount, 2, '.', '')
                ))->implode(' | ');
            fputcsv($stream, [
                'rent_credit', $organizationId, $credit->organization?->name ?? '',
                $period->format('Y-m'), $credit->lease?->property?->name ?? '',
                '', $credit->lease?->unit?->unit_number ?? '',
                trim(($credit->lease?->tenant?->first_name ?? '') . ' ' . ($credit->lease?->tenant?->last_name ?? '')),
                $credit->lease?->tenant?->email ?? '', $credit->lease?->tenant?->phone ?? '',
                $credit->lease_id, '', '', number_format((float) $credit->amount, 2, '.', ''),
                '', number_format((float) $credit->remaining_amount, 2, '.', ''),
                $credit->status, '', $source?->id ?? '', $source?->payment_date?->format('Y-m-d') ?? '',
                $source?->payment_method ?? '', $source?->provider ?? '',
                $source?->provider_transaction_id ?: $source?->reference ?: '',
                number_format((float) $credit->amount, 2, '.', ''), $source?->status ?? $credit->status,
                'Credit allocations: ' . $creditAllocations . '; remaining credit KES ' . number_format((float) $credit->remaining_amount, 2, '.', ''),
                $asOfDate,
            ]);
        }

        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        return [$csv === false ? '' : $csv, $rentRowCount, $paymentRowCount, $creditRowCount];
    }
}
