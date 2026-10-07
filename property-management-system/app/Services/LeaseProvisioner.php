<?php

namespace App\Services;

use App\Models\Deposit;
use App\Models\Leases;
use App\Models\Organization;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaseProvisioner
{
    /**
     * Create the canonical lease/agreement immediately for a tenant who
     * self-registers. Official dates and manager-controlled financial terms
     * remain unset/pending until the manager reviews the submission.
     */
    public function createPending(array $data, int $organizationId, Tenant $tenant): Leases
    {
        return DB::transaction(function () use ($data, $organizationId, $tenant) {
            $property = Property::where('organization_id', $organizationId)
                ->findOrFail($data['property_id']);
            $unit = Unit::where('property_id', $property->id)
                ->whereKey($data['unit_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($unit->status === 'maintenance') {
                throw ValidationException::withMessages([
                    'unit_id' => 'A unit under maintenance cannot be requested.',
                ]);
            }

            if ($tenant->organization_id !== $organizationId) {
                abort(403, 'You do not have access to this tenant.');
            }

            $requestedStart = !empty($data['requested_move_in_date'])
                ? CarbonImmutable::parse($data['requested_move_in_date'])->toDateString()
                : null;
            $requestedEnd = !empty($data['requested_move_out_date'])
                ? CarbonImmutable::parse($data['requested_move_out_date'])->toDateString()
                : null;

            if ($requestedEnd !== null && ($requestedStart === null || $requestedEnd < $requestedStart)) {
                throw ValidationException::withMessages([
                    'requested_move_out_date' => 'The requested end date must be on or after the requested start date.',
                ]);
            }

            if ($requestedStart !== null) {
                $this->assertNoOverlap($unit, $requestedStart, $requestedEnd);
            }

            $agreement = $this->buildPendingAgreementTemplate(
                $organizationId,
                $property,
                $unit,
                $tenant,
                $unit->monthly_rent,
                $requestedStart,
                $requestedEnd
            );

            $lease = Leases::create([
                'organization_id' => $organizationId,
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'tenant_id' => $tenant->id,
                'start_date' => null,
                'requested_move_in_date' => $requestedStart,
                'requested_move_out_date' => $requestedEnd,
                'end_date' => null,
                'monthly_rent' => $unit->monthly_rent,
                'deposit_amount' => ((float) $unit->deposit_amount > 0 ? $unit->deposit_amount : $unit->monthly_rent),
                'status' => 'pending',
                'manager_terms' => $agreement,
                'tenant_terms' => $agreement,
            ]);

            DB::table('leases')->where('id', $lease->id)->update([
                'requested_move_in_date' => $requestedStart,
                'requested_move_out_date' => $requestedEnd,
            ]);

            Deposit::create([
                'organization_id' => $organizationId,
                'lease_id' => $lease->id,
                'tenant_id' => $tenant->id,
                'amount_required' => ((float) $unit->deposit_amount > 0 ? $unit->deposit_amount : $unit->monthly_rent),
                'amount_paid' => 0,
                'status' => 'unpaid',
            ]);

            if (DB::getDriverName() === 'sqlite') {
                DB::statement(
                    "UPDATE leases SET requested_move_in_date = substr(requested_move_in_date, 1, 10), requested_move_out_date = substr(requested_move_out_date, 1, 10) WHERE id = ?",
                    [$lease->id]
                );
            }

            $this->syncUnitStatus($unit);

            return $lease->load(['property', 'unit', 'tenant', 'deposit']);
        });
    }

    public function create(array $data, int $organizationId, Tenant $tenant): Leases
    {
        return DB::transaction(function () use ($data, $organizationId, $tenant) {
            $property = Property::where('organization_id', $organizationId)
                ->findOrFail($data['property_id']);
            $unit = Unit::where('property_id', $property->id)
                ->whereKey($data['unit_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($unit->status === 'maintenance') {
                throw ValidationException::withMessages([
                    'unit_id' => 'A unit under maintenance cannot be leased.',
                ]);
            }

            if ($tenant->organization_id !== $organizationId) {
                abort(403, 'You do not have access to this tenant.');
            }

            $otherPendingTenant = $unit->tenants()
                ->where('status', 'pending')
                ->where('id', '<>', $tenant->id)
                ->exists();
            if ($otherPendingTenant) {
                throw ValidationException::withMessages([
                    'unit_id' => 'This unit has another tenant registration awaiting review.',
                ]);
            }

            $startDate = CarbonImmutable::parse($data['start_date'])->toDateString();
            $endDate = isset($data['end_date'])
                ? CarbonImmutable::parse($data['end_date'])->toDateString()
                : null;

            $this->assertNoOverlap($unit, $startDate, $endDate);

            $status = $this->statusForDates(
                $startDate,
                $endDate,
                $data['status'] ?? null
            );

            $monthlyRent = array_key_exists('monthly_rent', $data) && $data['monthly_rent'] !== null
                ? (float) $data['monthly_rent']
                : (float) $unit->monthly_rent;
            $depositAmount = array_key_exists('deposit_amount', $data) && $data['deposit_amount'] !== null
                ? (float) $data['deposit_amount']
                : (float) $unit->deposit_amount;

            $agreement = $this->buildAgreementTemplate(
                $organizationId,
                $property,
                $unit,
                $tenant,
                $monthlyRent,
                $startDate,
                $endDate,
                $depositAmount
            );

            $lease = Leases::create([
                'organization_id' => $organizationId,
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'tenant_id' => $tenant->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'monthly_rent' => $monthlyRent,
                'deposit_amount' => $depositAmount,
                'status' => $status,
                'notes' => $data['notes'] ?? null,
                'manager_terms' => $agreement,
                'tenant_terms' => $agreement,
            ]);

            $amountRequired = $depositAmount;
            $amountPaid = (float) ($data['deposit_paid_amount'] ?? (
                filter_var($data['deposit_paid'] ?? false, FILTER_VALIDATE_BOOL)
                    ? $amountRequired
                    : 0
            ));
            if ($amountPaid > $amountRequired) {
                throw ValidationException::withMessages([
                    'deposit_paid_amount' => 'The amount paid cannot exceed the required deposit.',
                ]);
            }
            if ($amountPaid > 0 && empty($data['deposit_payment_date'])) {
                throw ValidationException::withMessages([
                    'deposit_payment_date' => 'Enter the date the deposit was paid.',
                ]);
            }
            $depositStatus = $amountRequired <= 0
                ? 'not_required'
                : ($amountPaid >= $amountRequired
                    ? 'paid'
                    : ($amountPaid > 0 ? 'partially_paid' : 'unpaid'));

            Deposit::create([
                'organization_id' => $organizationId,
                'lease_id' => $lease->id,
                'tenant_id' => $tenant->id,
                'amount_required' => $amountRequired,
                'amount_paid' => $amountPaid,
                'payment_date' => $amountPaid > 0
                    ? ($data['deposit_payment_date'] ?? null)
                    : null,
                'status' => $depositStatus,
            ]);

            $tenant->update([
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'status' => 'active',
            ]);

            $this->syncUnitStatus($unit);

            return $lease->load(['property', 'unit', 'tenant', 'deposit']);
        });
    }

    /**
     * Convert a self-registration's pending lease into the manager-confirmed
     * canonical lease without creating a duplicate record.
     */
    public function confirmPending(Leases $lease, array $data, int $organizationId, Tenant $tenant): Leases
    {
        return DB::transaction(function () use ($lease, $data, $organizationId, $tenant) {
            if ($lease->status !== 'pending') {
                throw ValidationException::withMessages([
                    'lease' => 'This lease is no longer pending manager confirmation.',
                ]);
            }

            $property = Property::where('organization_id', $organizationId)
                ->findOrFail($data['property_id']);
            $unit = Unit::where('property_id', $property->id)
                ->whereKey($data['unit_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $startDate = CarbonImmutable::parse($data['start_date'])->toDateString();
            $endDate = !empty($data['end_date'])
                ? CarbonImmutable::parse($data['end_date'])->toDateString()
                : null;

            if ($endDate !== null && $endDate < $startDate) {
                throw ValidationException::withMessages([
                    'end_date' => 'The lease end date must be on or after the start date.',
                ]);
            }

            $this->assertNoOverlap($unit, $startDate, $endDate, $lease->id);

            $monthlyRent = $data['monthly_rent'] ?? $unit->monthly_rent;
            $depositAmount = $data['deposit_amount'] ?? (((float) $unit->deposit_amount > 0) ? $unit->deposit_amount : $unit->monthly_rent);
            $agreement = $this->buildAgreementTemplate(
                $organizationId,
                $property,
                $unit,
                $tenant,
                $monthlyRent,
                $startDate,
                $endDate,
                $depositAmount
            );

            $authoritativeChanged =
                $lease->property_id !== $property->id ||
                $lease->unit_id !== $unit->id ||
                $lease->start_date?->toDateString() !== $startDate ||
                $lease->end_date?->toDateString() !== $endDate ||
                (float) $lease->monthly_rent !== (float) $monthlyRent ||
                (float) $lease->deposit_amount !== (float) $depositAmount;

            $tenantTerms = $lease->tenant_terms;
            if ($lease->manager_terms === $lease->tenant_terms) {
                $tenantTerms = $agreement;
            }

            $lease->update([
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'monthly_rent' => $monthlyRent,
                'deposit_amount' => $depositAmount,
                'status' => $this->statusForDates($startDate, $endDate),
                'manager_terms' => $agreement,
                'tenant_terms' => $tenantTerms,
                ...($authoritativeChanged ? [
                    'tenant_signature' => null,
                    'tenant_signed_at' => null,
                ] : []),
            ]);

            DB::table('leases')->where('id', $lease->id)->update([
                'requested_move_in_date' => $lease->requested_move_in_date?->toDateString(),
                'requested_move_out_date' => $lease->requested_move_out_date?->toDateString(),
            ]);

            $amountRequired = (float) $depositAmount;
            $amountPaid = (float) ($data['deposit_paid_amount'] ?? 0);
            if ($amountPaid > $amountRequired) {
                throw ValidationException::withMessages([
                    'deposit_paid_amount' => 'The amount paid cannot exceed the required deposit.',
                ]);
            }

            $lease->deposit()->updateOrCreate(
                ['lease_id' => $lease->id],
                [
                    'organization_id' => $organizationId,
                    'tenant_id' => $tenant->id,
                    'amount_required' => $amountRequired,
                    'amount_paid' => $amountPaid,
                    'payment_date' => $amountPaid > 0 ? ($data['deposit_payment_date'] ?? null) : null,
                    'status' => $amountRequired <= 0
                        ? 'not_required'
                        : ($amountPaid >= $amountRequired
                            ? 'paid'
                            : ($amountPaid > 0 ? 'partially_paid' : 'unpaid')),
                ]
            );

            $tenant->update([
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'status' => 'active',
            ]);

            $this->syncUnitStatus($unit);

            return $lease->fresh()->load(['property', 'unit', 'tenant', 'deposit']);
        });
    }

    private function dateRangesOverlap(
        ?string $existingStart,
        ?string $existingEnd,
        string $newStart,
        ?string $newEnd
    ): bool {
        if ($existingStart === null) {
            return false;
        }

        // Lease end dates are treated as checkout dates: a new tenancy may
        // start on the same calendar day the previous tenancy ends.
        if ($newEnd !== null && $existingStart >= $newEnd) {
            return false;
        }
        if ($existingEnd !== null && $existingEnd <= $newStart) {
            return false;
        }

        return true;
    }

    public function statusForDates(
        string $startDate,
        ?string $endDate,
        ?string $requestedStatus = null
    ): string {
        if (in_array($requestedStatus, ['notice', 'ended', 'terminated'], true)) {
            return $requestedStatus;
        }

        $today = CarbonImmutable::today()->toDateString();
        if ($endDate !== null && $endDate < $today) {
            return 'ended';
        }

        return $startDate > $today ? 'upcoming' : 'active';
    }

    public function assertNoOverlap(
        Unit $unit,
        string $startDate,
        ?string $endDate,
        ?int $exceptLeaseId = null
    ): void {
        $leases = Leases::where('unit_id', $unit->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->when($exceptLeaseId, fn ($query) => $query->where('id', '<>', $exceptLeaseId))
            ->get();

        foreach ($leases as $existing) {
            $existingStart = $existing->start_date?->toDateString()
                ?? $existing->requested_move_in_date?->toDateString();
            $existingEnd = $existing->end_date?->toDateString()
                ?? $existing->requested_move_out_date?->toDateString();

            if ($this->dateRangesOverlap($existingStart, $existingEnd, $startDate, $endDate)) {
                throw ValidationException::withMessages([
                    'unit_id' => 'This unit is already reserved or occupied for part of those dates.',
                ]);
            }
        }

        return;
    }

    public function syncUnitStatus(Unit $unit): void
    {
        $today = CarbonImmutable::today()->toDateString();
        $leases = $unit->leases()
            ->whereNotIn('status', ['ended', 'terminated'])
            ->get(['start_date', 'end_date', 'status']);

        $occupied = $leases->contains(fn (Leases $lease) =>
            $lease->start_date !== null &&
            $lease->start_date->toDateString() <= $today &&
            ($lease->end_date === null || $lease->end_date->toDateString() >= $today)
        );
        $reserved = $leases->contains(fn (Leases $lease) =>
            $lease->status === 'pending' ||
            ($lease->start_date !== null && $lease->start_date->toDateString() > $today)
        );

        $unit->update([
            'status' => $occupied ? 'occupied' : ($reserved ? 'reserved' : 'vacant'),
        ]);
    }

    /**
     * Auto-populated lease agreement text, generated once when a lease is
     * provisioned (manager onboarding or a manager confirming a
     * self-registration). Both the manager's and the tenant's copies start
     * identical; each side edits their own copy from there and signs with
     * their initials.
     */
    public function buildPendingAgreementTemplate(
        int $organizationId,
        Property $property,
        Unit $unit,
        Tenant $tenant,
        float|string $monthlyRent,
        ?string $requestedStart,
        ?string $requestedEnd
    ): string {
        $organization = Organization::find($organizationId);
        $tenantName = trim("{$tenant->first_name} {$tenant->last_name}");

        $lines = [
            'RESIDENTIAL LEASE AGREEMENT — PENDING MANAGER CONFIRMATION',
            '',
            "Landlord/Organization: {$organization?->name}",
            "Property: {$property->name}",
            "Unit: {$unit->unit_number}" . ($unit->unit_type ? " ({$unit->unit_type})" : ''),
            "Tenant: {$tenantName}",
            "Tenant email: {$tenant->email}",
            "Tenant phone: {$tenant->phone}",
            "National ID: {$tenant->national_id}",
            "Employer: " . ($tenant->employer_name ?: 'Not provided'),
            "Employer phone: " . ($tenant->employer_phone ?: 'Not provided'),
            "Next of kin: " . ($tenant->next_of_kin_name ?: 'Not provided'),
            "Next of kin phone: " . ($tenant->next_of_kin_phone ?: 'Not provided'),
            'Monthly rent (unit default): ' . number_format((float) $monthlyRent, 2),
            'Security deposit (default): ' . number_format((float) $unit->deposit_amount, 2),
            'Requested lease start: ' . ($requestedStart ?: 'Not provided'),
            'Requested lease end: ' . ($requestedEnd ?: 'Open-ended / to be confirmed'),
            '',
            'Terms:',
            '1. Rent is due on the 5th of each calendar month.',
            '2. The security deposit is refundable, subject to the condition of the unit at move-out.',
            '3. The property manager confirms the official lease dates and may adjust rent, deposit and manager terms before final execution.',
            '4. The tenant may review and sign their side before the manager completes the final signature.',
            '5. The agreement becomes locked after the manager signs the final reviewed version.',
        ];

        return implode("\n", $lines);
    }

    public function buildAgreementTemplate(
        int $organizationId,
        Property $property,
        Unit $unit,
        Tenant $tenant,
        float|string $monthlyRent,
        string $startDate,
        ?string $endDate,
        float|string $depositAmount = 0
    ): string {
        $organization = Organization::find($organizationId);
        $tenantName = trim("{$tenant->first_name} {$tenant->last_name}");

        $lines = [
            'RESIDENTIAL LEASE AGREEMENT',
            '',
            "Landlord/Organization: {$organization?->name}",
            "Property: {$property->name}",
            "Unit: {$unit->unit_number}" . ($unit->unit_type ? " ({$unit->unit_type})" : ''),
            "Tenant: {$tenantName}",
            "Tenant email: {$tenant->email}",
            "Tenant phone: {$tenant->phone}",
            "National ID: {$tenant->national_id}",
            "Employer: " . ($tenant->employer_name ?: 'Not provided'),
            "Employer phone: " . ($tenant->employer_phone ?: 'Not provided'),
            "Next of kin: " . ($tenant->next_of_kin_name ?: 'Not provided'),
            "Next of kin phone: " . ($tenant->next_of_kin_phone ?: 'Not provided'),
            'Monthly rent: ' . number_format((float) $monthlyRent, 2),
            'Security deposit: ' . number_format((float) $depositAmount, 2),
            "Lease start date: {$startDate}",
            'Lease end date: ' . ($endDate ?: 'Open-ended (not yet known)'),
            '',
            'Terms:',
            '1. Rent is due on the 5th of each calendar month. Payments made from the 1st through the 5th are within the due period; unpaid rent is overdue from the 6th.',
            '2. The security deposit is refundable, subject to the condition of the unit at move-out.',
            '3. Either party must give written notice before ending this tenancy, per the notice period agreed with the manager.',
            '4. The tenant is responsible for reporting maintenance issues promptly through the tenant portal.',
            '',
            'This agreement is provisionally generated from the details above. Either party may propose edits to their '
                . 'own copy below; it is only officially binding once both the manager and the tenant have signed with '
                . 'their initials.',
        ];

        return implode("\n", $lines);
    }
}
