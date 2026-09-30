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

            $agreement = $this->buildAgreementTemplate(
                $organizationId,
                $property,
                $unit,
                $tenant,
                $data['monthly_rent'],
                $startDate,
                $endDate,
                $data['deposit_amount'] ?? 0
            );

            $lease = Leases::create([
                'organization_id' => $organizationId,
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'tenant_id' => $tenant->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'monthly_rent' => $data['monthly_rent'],
                'deposit_amount' => $data['deposit_amount'] ?? 0,
                'status' => $status,
                'notes' => $data['notes'] ?? null,
                'manager_terms' => $agreement,
                'tenant_terms' => $agreement,
            ]);

            $amountRequired = (float) ($data['deposit_amount'] ?? 0);
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
        $query = Leases::where('unit_id', $unit->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->when($exceptLeaseId, fn ($leases) => $leases->where('id', '<>', $exceptLeaseId))
            ->whereDate('start_date', '<=', $endDate ?? '9999-12-31')
            ->where(function ($leases) use ($startDate) {
                $leases->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $startDate);
            });

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'unit_id' => 'This unit is already booked for part of those dates.',
            ]);
        }
    }

    public function syncUnitStatus(Unit $unit): void
    {
        $today = CarbonImmutable::today()->toDateString();
        $leases = $unit->leases()
            ->whereNotIn('status', ['ended', 'terminated'])
            ->get(['start_date', 'end_date']);

        $occupied = $leases->contains(fn (Leases $lease) =>
            $lease->start_date->toDateString() <= $today &&
            ($lease->end_date === null || $lease->end_date->toDateString() >= $today)
        );
        $reserved = $leases->contains(fn (Leases $lease) =>
            $lease->start_date->toDateString() > $today
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
            'Monthly rent: ' . number_format((float) $monthlyRent, 2),
            'Security deposit: ' . number_format((float) $depositAmount, 2),
            "Lease start date: {$startDate}",
            'Lease end date: ' . ($endDate ?: 'Open-ended (not yet known)'),
            '',
            'Terms:',
            '1. Rent is due on the 1st of each calendar month.',
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
