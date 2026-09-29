<?php

namespace App\Http\Controllers;

use App\Models\Leases;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\LeaseProvisioner;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeasesController extends Controller
{
    public function index(Request $request)
    {
        $leases = Leases::where('organization_id', $request->user()->organization_id)
            ->with(['property', 'unit', 'tenant', 'deposit'])
            ->get();

        return response()->json($leases);
    }

    public function store(Request $request, LeaseProvisioner $provisioner)
    {
        $validated = $request->validate([
            'property_id' => 'required|integer|exists:properties,id',
            'unit_id' => 'required|integer|exists:units,id',
            'tenant_id' => 'required|integer|exists:tenants,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'monthly_rent' => 'required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'deposit_paid' => 'nullable|boolean',
            'deposit_paid_amount' => 'nullable|numeric|min:0',
            'deposit_payment_date' => 'nullable|date',
            'status' => 'nullable|in:upcoming,active,notice,ended,terminated',
            'notes' => 'nullable|string',
        ]);

        $lease = $provisioner->create(
            $validated,
            (int) $request->user()->organization_id,
            Tenant::findOrFail($validated['tenant_id'])
        );

        return response()->json([
            'message' => 'Lease created successfully.',
            'lease' => $lease,
        ], 201);
    }

    public function show(Request $request, Leases $lease)
    {
        $this->authorizeOrganization($request, $lease);

        return response()->json(
            $lease->load(['property', 'unit', 'tenant', 'deposit'])
        );
    }

    public function update(Request $request, Leases $lease, LeaseProvisioner $provisioner)
    {
        $this->authorizeOrganization($request, $lease);

        $validated = $request->validate([
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date',
            'monthly_rent' => 'sometimes|required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'deposit_paid_amount' => 'nullable|numeric|min:0',
            'deposit_payment_date' => 'nullable|date',
            'status' => 'nullable|in:upcoming,active,notice,ended,terminated',
            'notice_date' => 'nullable|date',
            'intended_move_out_date' => 'nullable|date|after_or_equal:notice_date',
            'notice_period_months' => 'nullable|integer|min:1|max:12',
            'notice_charge_amount' => 'nullable|numeric|min:0',
            'termination_reason' => 'nullable|string|max:255',
            'actual_move_out_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $lease = DB::transaction(function () use ($validated, $lease, $provisioner) {
            $unit = Unit::whereKey($lease->unit_id)
                ->lockForUpdate()
                ->firstOrFail();
            $startDate = CarbonImmutable::parse(
                $validated['start_date'] ?? $lease->start_date
            )->toDateString();
            $endDate = array_key_exists('end_date', $validated)
                ? ($validated['end_date']
                    ? CarbonImmutable::parse($validated['end_date'])->toDateString()
                    : null)
                : ($lease->end_date?->toDateString());

            abort_if(
                $endDate !== null && $endDate < $startDate,
                422,
                'The lease end date must be on or after its start date.'
            );

            $provisioner->assertNoOverlap($unit, $startDate, $endDate, $lease->id);

            $status = $provisioner->statusForDates(
                $startDate,
                $endDate,
                $validated['status'] ?? $lease->status
            );

            $noticeDate = $validated['notice_date'] ?? $lease->notice_date?->toDateString();
            $intendedMoveOutDate = $validated['intended_move_out_date']
                ?? $lease->intended_move_out_date?->toDateString();
            $noticeMonths = $validated['notice_period_months']
                ?? $lease->notice_period_months;

            $lease->update([
                ...$validated,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => $status,
                'notice_period_months' => $noticeMonths,
                'notice_timely' => $noticeDate && $intendedMoveOutDate
                    ? CarbonImmutable::parse($noticeDate)
                        ->addMonthsNoOverflow($noticeMonths)
                        ->toDateString() <= $intendedMoveOutDate
                    : null,
            ]);

            $deposit = $lease->deposit;
            if ($deposit) {
                $amountRequired = (float) ($validated['deposit_amount'] ?? $deposit->amount_required);
                $amountPaid = (float) ($validated['deposit_paid_amount'] ?? $deposit->amount_paid);
                abort_if(
                    $amountPaid > $amountRequired,
                    422,
                    'The amount paid cannot exceed the required deposit.'
                );
                $deposit->update([
                    'amount_required' => $amountRequired,
                    'amount_paid' => $amountPaid,
                    'payment_date' => $validated['deposit_payment_date']
                        ?? ($amountPaid > 0 ? $deposit->payment_date : null),
                    'status' => $amountRequired <= 0
                        ? 'not_required'
                        : ($amountPaid >= $amountRequired
                            ? 'paid'
                            : ($amountPaid > 0 ? 'partially_paid' : 'unpaid')),
                ]);
            }

            $provisioner->syncUnitStatus($unit);

            return $lease->fresh()->load(['property', 'unit', 'tenant', 'deposit']);
        });

        return response()->json([
            'message' => 'Lease updated successfully.',
            'lease' => $lease,
        ]);
    }

    public function destroy(Request $request, Leases $lease, LeaseProvisioner $provisioner)
    {
        $this->authorizeOrganization($request, $lease);
        $unit = $lease->unit;
        $lease->delete();
        $provisioner->syncUnitStatus($unit);

        return response()->json([
            'message' => 'Lease deleted successfully.',
        ]);
    }

    private function authorizeOrganization(Request $request, Leases $lease)
    {
        abort_if(
            $lease->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this lease.'
        );
    }
}
