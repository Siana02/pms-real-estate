<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Leases;
use App\Models\RentObligation;
use App\Models\RentPaymentCredit;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\PermissionService;
use App\Services\AuditLogService;
use App\Services\RentLedgerService;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $payments = Payment::where('organization_id', $request->user()->organization_id)
            ->with([
                'lease.tenant',
                'lease.property',
                'lease.unit',
                'paymentDestination',
                'rentObligation:id,period,due_date,amount_due',
                'allocations.rentObligation:id,period,due_date,amount_due',
                'rentPaymentCredits.allocations.rentObligation:id,period,due_date,amount_due',
            ])
            ->latest('payment_date')
            ->get();

        return response()->json($payments);
    }

    public function rentLedger(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $organizationId = (int) $request->user()->organization_id;

        // Backfill missing monthly obligations for active leases so the page can
        // show unpaid months as well as months that already have payments.
        $through = CarbonImmutable::now()->startOfMonth();
        Leases::query()
            ->where('organization_id', $organizationId)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $through->endOfMonth()->toDateString())
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $through->startOfMonth()->toDateString()))
            ->get()
            ->each(function (Leases $lease) use ($through) {
                try {
                    app(RentLedgerService::class)->ensureForLeaseThrough($lease, $through);
                } catch (\Throwable $exception) {
                    // Keep other tenants' ledgers visible when one inconsistent
                    // lease needs separate review; do not fabricate its obligations.
                    \Illuminate\Support\Facades\Log::warning('Rent ledger page could not backfill one lease.', [
                        'lease_id' => $lease->id,
                        'organization_id' => $lease->organization_id,
                        'exception' => $exception::class,
                    ]);
                }
            });

        $obligations = RentObligation::query()
            ->where('organization_id', $organizationId)
            ->with([
                'lease.tenant',
                'lease.property',
                'lease.unit',
                'property:id,name',
                'unit:id,unit_number',
                'tenant:id,first_name,last_name,email',
                'allocations.payment:id,reference,payment_date,amount,status',
                'allocations.rentPaymentCredit.sourcePayment:id,reference,payment_date,amount,status',
                'payments.allocations:id,payment_id,rent_obligation_id',
                'lease:id,organization_id,property_id,unit_id,tenant_id,rent_due_day,rent_grace_period_days',
            ])
            ->orderBy('lease_id')
            ->orderBy('period')
            ->get();

        $ledger = $obligations->map(function (RentObligation $obligation) {
            $allocations = $obligation->allocations;
            $paidFromAllocations = round((float) $allocations->sum('amount'), 2);
            $legacyPayments = $obligation->payments
                ->where('status', 'paid')
                ->filter(fn (Payment $payment) => $payment->allocations->isEmpty());
            $legacyAmount = round((float) $legacyPayments->sum('amount'), 2);
            $amountPaid = round($paidFromAllocations + $legacyAmount, 2);
            $amountDue = round((float) $obligation->amount_due, 2);
            $balance = max(round($amountDue - $amountPaid, 2), 0);
            $dueDate = CarbonImmutable::parse($obligation->due_date);
            $graceDays = (int) ($obligation->lease?->rent_grace_period_days ?? 0);
            $today = CarbonImmutable::today();
            $status = $amountDue > 0 && $amountPaid >= $amountDue
                ? 'paid'
                : ($amountPaid > 0
                    ? 'partial'
                    : ($today->greaterThan($dueDate->addDays($graceDays))
                        ? 'overdue'
                        : ($today->greaterThanOrEqualTo($dueDate) ? 'due' : 'upcoming')));

            $references = $allocations->map(function ($allocation) {
                $payment = $allocation->payment ?? $allocation->rentPaymentCredit?->sourcePayment;
                if (!$payment) return null;
                return [
                    'reference' => $payment->reference,
                    'payment_date' => $payment->payment_date?->toDateString() ?? (string) $payment->payment_date,
                    'amount_applied' => round((float) $allocation->amount, 2),
                    'source' => $allocation->payment_id ? 'payment' : 'rent_credit',
                ];
            })->merge($legacyPayments->map(fn (Payment $payment) => [
                'reference' => $payment->reference,
                'payment_date' => $payment->payment_date?->toDateString() ?? (string) $payment->payment_date,
                'amount_applied' => round((float) $payment->amount, 2),
                'source' => 'legacy_payment',
            ]))->filter()->values();

            $tenant = $obligation->tenant;
            $tenantName = trim(implode(' ', array_filter([$tenant?->first_name, $tenant?->last_name])));
            return [
                'id' => $obligation->id,
                'lease_id' => $obligation->lease_id,
                'tenant_id' => $obligation->tenant_id,
                'tenant_name' => $tenantName !== '' ? $tenantName : ($tenant?->email ?? 'Unknown tenant'),
                'property_name' => $obligation->property?->name ?? 'Property',
                'unit_number' => $obligation->unit?->unit_number ?? '—',
                'period' => $obligation->period?->toDateString() ?? (string) $obligation->period,
                'due_date' => $obligation->due_date?->toDateString() ?? (string) $obligation->due_date,
                'amount_due' => $amountDue,
                'amount_paid' => $amountPaid,
                'balance' => $balance,
                'status' => $status,
                'references' => $references,
            ];
        });

        $credits = RentPaymentCredit::query()
            ->where('organization_id', $organizationId)
            ->where('remaining_amount', '>', 0)
            ->with(['lease.tenant', 'lease.property', 'lease.unit', 'sourcePayment:id,reference,payment_date,amount'])
            ->orderBy('lease_id')
            ->orderBy('id')
            ->get()
            ->map(function (RentPaymentCredit $credit) {
                $tenant = $credit->lease?->tenant;
                $name = trim(implode(' ', array_filter([$tenant?->first_name, $tenant?->last_name])));
                return [
                    'id' => $credit->id,
                    'lease_id' => $credit->lease_id,
                    'tenant_name' => $name !== '' ? $name : ($tenant?->email ?? 'Unknown tenant'),
                    'property_name' => $credit->lease?->property?->name ?? 'Property',
                    'unit_number' => $credit->lease?->unit?->unit_number ?? '—',
                    'original_amount' => round((float) $credit->amount, 2),
                    'remaining_amount' => round((float) $credit->remaining_amount, 2),
                    'source_reference' => $credit->sourcePayment?->reference,
                    'source_payment_date' => $credit->sourcePayment?->payment_date?->toDateString(),
                ];
            })->values();

        return response()->json(['data' => $ledger, 'credits' => $credits]);
    }

    public function store(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.record'), 403);
        $validated = $request->validate([
            'lease_id' => 'required|exists:leases,id',
            'amount' => 'required|numeric|gt:0',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,mpesa,bank_transfer,card,other',
            'reference' => 'nullable|string|max:255',
            'payment_type' => 'nullable|in:rent,deposit,utility,other',
            'notes' => 'nullable|string',
        ]);

        $lease = Leases::findOrFail($validated['lease_id']);

        if ($lease->organization_id !== $request->user()->organization_id) {
            abort(403, 'You do not have access to this lease.');
        }

        $payment = DB::transaction(function () use ($validated, $request) {
            $payment = Payment::create([
                ...$validated,
                'organization_id' => $request->user()->organization_id,
            ]);

            if ($payment->payment_type === 'rent') {
                $ledger = app(RentLedgerService::class);
                if ($payment->status === 'paid') {
                    $ledger->allocateConfirmedPayment($payment);
                } else {
                    $ledger->attachPayment($payment);
                }
            }

            return $payment;
        });

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->fresh()->load('lease'),
        ], 201);
    }

    public function verify(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403, 'Payment verification requires payment editing permission.');
        $this->authorizeOrganization($request, $payment);
        abort_if($payment->status !== 'pending', 422, 'Only payments awaiting verification can be confirmed.');

        $payment = DB::transaction(function () use ($payment) {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            abort_if($payment->status !== 'pending', 422, 'This payment was already processed by another request.');

            $payment->update([
                'status' => 'paid',
                'payment_date' => $payment->payment_date ?: now()->toDateString(),
            ]);
            $payment = $payment->fresh();
            app(RentLedgerService::class)->allocateConfirmedPayment($payment);

            return $payment->fresh();
        });

        app(AuditLogService::class)->record(
            'PAYMENT_VERIFIED',
            'Confirmed a tenant-submitted payment.',
            $payment,
            ['status' => 'pending'],
            ['status' => 'paid', 'reference' => $payment->reference],
            $request
        );

        return response()->json([
            'message' => 'Payment confirmed.',
            'payment' => $payment->fresh()->load(['lease.tenant', 'lease.property', 'lease.unit', 'paymentDestination']),
        ]);
    }

    public function reject(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403, 'Payment verification requires payment editing permission.');
        $this->authorizeOrganization($request, $payment);
        abort_if($payment->status !== 'pending', 422, 'Only payments awaiting verification can be rejected.');

        $payment->update(['status' => 'failed']);

        app(AuditLogService::class)->record(
            'PAYMENT_REJECTED',
            'Rejected a tenant-submitted payment.',
            $payment,
            ['status' => 'pending'],
            ['status' => 'failed', 'reference' => $payment->reference],
            $request
        );

        return response()->json([
            'message' => 'Payment rejected.',
            'payment' => $payment->fresh()->load(['lease.tenant', 'lease.property', 'lease.unit', 'paymentDestination']),
        ]);
    }

    public function show(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $this->authorizeOrganization($request, $payment);

        return response()->json(
            $payment->load(['lease.tenant', 'lease.property', 'lease.unit', 'paymentDestination'])
        );
    }

    public function update(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403, 'Payment edits require owner approval.');
        $this->authorizeOrganization($request, $payment);

        $validated = $request->validate([
            'amount' => 'sometimes|required|numeric|gt:0',
            'payment_date' => 'sometimes|required|date',
            'payment_method' => 'sometimes|required|in:cash,mpesa,bank_transfer,card,other',
            'reference' => 'nullable|string|max:255',
            'payment_type' => 'nullable|in:rent,deposit,utility,other',
            'notes' => 'nullable|string',
        ]);

        // A confirmed payment is part of the financial audit trail. Changing its
        // amount/date/type after allocation can make the payment record disagree
        // with rent-period allocations and overpayment credits. Corrections must
        // use a dedicated audited reversal/adjustment flow instead.
        $immutableFinancialFields = ['amount', 'payment_date', 'payment_type'];
        if ($payment->status === 'paid' && array_intersect($immutableFinancialFields, array_keys($validated))) {
            abort(422, 'Confirmed payments cannot have their amount, date or type edited. Use an audited correction workflow.');
        }

        $payment->update($validated);
        app(RentLedgerService::class)->attachPayment($payment->fresh());

        return response()->json([
            'message' => 'Payment updated successfully.',
            'payment' => $payment->load('lease'),
        ]);
    }

    public function destroy(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.void'), 403, 'Payment voiding requires owner approval.');
        $this->authorizeOrganization($request, $payment);

        // Deleting a payment cascades to its allocations and may also delete
        // rent credits sourced from it. Never erase a confirmed financial record.
        if ($payment->status === 'paid'
            || $payment->allocations()->exists()
            || $payment->rentPaymentCredits()->exists()) {
            abort(422, 'This payment affects the rent ledger and cannot be deleted. Use an audited void/reversal workflow.');
        }

        $payment->delete();

        return response()->json([
            'message' => 'Payment deleted successfully.',
        ]);
    }

    private function authorizeOrganization(Request $request, Payment $payment)
    {
        abort_if(
            $payment->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this payment.'
        );
    }
}