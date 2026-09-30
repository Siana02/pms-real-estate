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

        $tenant = Tenant::where('organization_id', $request->user()->organization_id)
            ->findOrFail($validated['tenant_id']);

        $lease = $provisioner->create(
            $validated,
            (int) $request->user()->organization_id,
            $tenant
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

    /**
     * Manager is authoritative for official lease details and manager terms.
     * A manager signature is the final lock: after it is recorded, the lease
     * details and agreement wording cannot be changed through this endpoint.
     *
     * If manager changes an authoritative field before signing, any existing
     * tenant signature is cleared so the tenant must review the new version.
     */
    public function update(Request $request, Leases $lease, LeaseProvisioner $provisioner)
    {
        $this->authorizeOrganization($request, $lease);

        abort_if(
            $lease->manager_signed_at !== null,
            422,
            'This lease is locked because the manager has already signed the final version.'
        );

        $validated = $request->validate([
            'property_id' => 'sometimes|required|integer|exists:properties,id',
            'unit_id' => 'sometimes|required|integer|exists:units,id',
            'start_date' => 'sometimes|nullable|date',
            'end_date' => 'nullable|date',
            'monthly_rent' => 'sometimes|required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'deposit_paid_amount' => 'nullable|numeric|min:0',
            'deposit_payment_date' => 'nullable|date',
            'status' => 'nullable|in:pending,upcoming,active,notice,ended,terminated',
            'notice_date' => 'nullable|date',
            'intended_move_out_date' => 'nullable|date|after_or_equal:notice_date',
            'notice_period_months' => 'nullable|integer|min:1|max:12',
            'notice_charge_amount' => 'nullable|numeric|min:0',
            'termination_reason' => 'nullable|string|max:255',
            'actual_move_out_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'manager_terms' => 'nullable|string',
            'manager_signature' => 'nullable|string|max:20',
        ]);

        $signingAsManager = array_key_exists('manager_signature', $validated)
            && trim((string) $validated['manager_signature']) !== '';

        abort_if(
            $signingAsManager && $lease->tenant_signed_at === null,
            422,
            'The tenant must sign the current agreement before the manager can sign and lock it.'
        );

        abort_if(
            $signingAsManager && $lease->start_date === null,
            422,
            'Set and confirm the official lease start date before the manager signs the final version.'
        );

        return DB::transaction(function () use (
            $request,
            $validated,
            $lease,
            $provisioner,
            $signingAsManager
        ) {
            $organizationId = (int) $request->user()->organization_id;

            $propertyId = (int) ($validated['property_id'] ?? $lease->property_id);
            $unitId = (int) ($validated['unit_id'] ?? $lease->unit_id);

            $property = Property::where('organization_id', $organizationId)
                ->findOrFail($propertyId);

            $unit = Unit::where('property_id', $property->id)
                ->whereKey($unitId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($unit->status === 'maintenance') {
                abort(422, 'A unit under maintenance cannot be leased.');
            }

            $startDate = array_key_exists('start_date', $validated)
                ? ($validated['start_date']
                    ? CarbonImmutable::parse($validated['start_date'])->toDateString()
                    : null)
                : $lease->start_date?->toDateString();

            $endDate = array_key_exists('end_date', $validated)
                ? ($validated['end_date']
                    ? CarbonImmutable::parse($validated['end_date'])->toDateString()
                    : null)
                : $lease->end_date?->toDateString();

            abort_if(
                $startDate !== null && $endDate !== null && $endDate < $startDate,
                422,
                'The lease end date must be on or after its start date.'
            );

            if ($startDate !== null) {
                $provisioner->assertNoOverlap($unit, $startDate, $endDate, $lease->id);
            }

            $authoritativeChanged =
                $propertyId !== $lease->property_id ||
                $unitId !== $lease->unit_id ||
                $startDate !== $lease->start_date?->toDateString() ||
                $endDate !== $lease->end_date?->toDateString() ||
                (array_key_exists('monthly_rent', $validated)
                    && (float) $validated['monthly_rent'] !== (float) $lease->monthly_rent) ||
                (array_key_exists('deposit_amount', $validated)
                    && (float) $validated['deposit_amount'] !== (float) $lease->deposit_amount) ||
                (array_key_exists('manager_terms', $validated)
                    && $validated['manager_terms'] !== $lease->manager_terms);

            $tenantSignatureReset = $authoritativeChanged && $lease->tenant_signed_at !== null;

            $status = $startDate === null
                ? 'pending'
                : $provisioner->statusForDates(
                    $startDate,
                    $endDate,
                    $validated['status'] ?? $lease->status
                );

            $noticeDate = $validated['notice_date'] ?? $lease->notice_date?->toDateString();
            $intendedMoveOutDate = $validated['intended_move_out_date']
                ?? $lease->intended_move_out_date?->toDateString();
            $noticeMonths = $validated['notice_period_months']
                ?? $lease->notice_period_months;

            if ($signingAsManager && $tenantSignatureReset) {
                abort(422, 'The agreement changed after the tenant signed. Save the changes first, then have the tenant review and sign again.');
            }

            $signatureUpdates = [];

            if ($tenantSignatureReset) {
                $signatureUpdates['tenant_signature'] = null;
                $signatureUpdates['tenant_signed_at'] = null;
            }

            if ($signingAsManager) {
                $signatureUpdates['manager_signature'] = trim($validated['manager_signature']);
                $signatureUpdates['manager_signed_at'] = CarbonImmutable::now();
            }

            $lease->update([
                'property_id' => $propertyId,
                'unit_id' => $unitId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'monthly_rent' => $validated['monthly_rent'] ?? $lease->monthly_rent,
                'deposit_amount' => $validated['deposit_amount'] ?? $lease->deposit_amount,
                'status' => $status,
                'notice_date' => $noticeDate,
                'intended_move_out_date' => $intendedMoveOutDate,
                'notice_period_months' => $noticeMonths,
                'notice_timely' => $noticeDate && $intendedMoveOutDate
                    ? CarbonImmutable::parse($noticeDate)
                        ->addMonthsNoOverflow($noticeMonths)
                        ->toDateString() <= $intendedMoveOutDate
                    : null,
                'notice_charge_amount' => $validated['notice_charge_amount'] ?? $lease->notice_charge_amount,
                'termination_reason' => $validated['termination_reason'] ?? $lease->termination_reason,
                'actual_move_out_date' => $validated['actual_move_out_date'] ?? $lease->actual_move_out_date,
                'notes' => $validated['notes'] ?? $lease->notes,
                'manager_terms' => $managerTerms,
                'tenant_terms' => $tenantTerms,
                ...$signatureUpdates,
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

            $tenant = $lease->tenant;
            if ($tenant) {
                $tenant->update([
                    'property_id' => $propertyId,
                    'unit_id' => $unitId,
                    'status' => $startDate === null ? 'pending' : 'active',
                ]);
            }

            $provisioner->syncUnitStatus($lease->unit);

            return response()->json([
                'message' => $signingAsManager
                    ? 'Manager signed the final lease. The agreement is now locked.'
                    : 'Lease updated successfully.',
                'lease' => $lease->fresh()->load(['property', 'unit', 'tenant', 'deposit']),
            ]);
        });
    }

    /**
     * Deposit receipt is deliberately separate from lease editing so the
     * canonical agreement can remain locked after the manager signs while the
     * financial receipt status can still be recorded.
     */
    public function recordDeposit(Request $request, Leases $lease)
    {
        $this->authorizeOrganization($request, $lease);

        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
        ]);

        $deposit = $lease->deposit;
        abort_if($deposit === null, 404, 'No deposit record exists for this lease.');

        $amountRequired = (float) $deposit->amount_required;
        $amountPaid = (float) $validated['amount_paid'];

        abort_if(
            $amountPaid > $amountRequired,
            422,
            'The amount paid cannot exceed the required deposit.'
        );

        $deposit->update([
            'amount_paid' => $amountPaid,
            'payment_date' => $validated['payment_date'],
            'status' => $amountRequired <= 0
                ? 'not_required'
                : ($amountPaid >= $amountRequired
                    ? 'paid'
                    : ($amountPaid > 0 ? 'partially_paid' : 'unpaid')),
        ]);

        return response()->json([
            'message' => $amountPaid >= $amountRequired
                ? 'Deposit marked as fully received.'
                : 'Deposit payment recorded.',
            'lease' => $lease->fresh()->load(['property', 'unit', 'tenant', 'deposit']),
        ]);
    }

    public function destroy(Request $request, Leases $lease, LeaseProvisioner $provisioner)
    {
        $this->authorizeOrganization($request, $lease);

        abort_if(
            $lease->manager_signed_at !== null,
            422,
            'A signed lease is locked and cannot be deleted.'
        );

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
