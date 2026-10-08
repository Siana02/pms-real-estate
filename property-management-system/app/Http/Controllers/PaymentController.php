<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Leases;
use Illuminate\Http\Request;
use App\Services\PermissionService;
use App\Services\AuditLogService;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $payments = Payment::where('organization_id', $request->user()->organization_id)
            ->with(['lease.tenant', 'lease.property', 'lease.unit', 'paymentDestination'])
            ->latest('payment_date')
            ->get();

        return response()->json($payments);
    }

    public function store(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.record'), 403);
        $validated = $request->validate([
            'lease_id' => 'required|exists:leases,id',
            'amount' => 'required|numeric|min:0',
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

        $payment = Payment::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment->load('lease'),
        ], 201);
    }

    public function verify(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403, 'Payment verification requires payment editing permission.');
        $this->authorizeOrganization($request, $payment);
        abort_if($payment->status !== 'pending', 422, 'Only payments awaiting verification can be confirmed.');

        $payment->update([
            'status' => 'paid',
            'payment_date' => $payment->payment_date ?: now()->toDateString(),
        ]);

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
            'amount' => 'sometimes|required|numeric|min:0',
            'payment_date' => 'sometimes|required|date',
            'payment_method' => 'sometimes|required|in:cash,mpesa,bank_transfer,card,other',
            'reference' => 'nullable|string|max:255',
            'payment_type' => 'nullable|in:rent,deposit,utility,other',
            'notes' => 'nullable|string',
        ]);

        $payment->update($validated);

        return response()->json([
            'message' => 'Payment updated successfully.',
            'payment' => $payment->load('lease'),
        ]);
    }

    public function destroy(Request $request, Payment $payment)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.void'), 403, 'Payment voiding requires owner approval.');
        $this->authorizeOrganization($request, $payment);

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