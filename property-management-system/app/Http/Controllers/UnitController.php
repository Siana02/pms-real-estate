<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\Property;
use App\Models\Leases as Lease;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function availableForRegistration(Property $property)
    {
        $today = CarbonImmutable::today()->toDateString();

        $units = Unit::query()
            ->where('property_id', $property->id)
            ->where('status', '!=', 'maintenance')
            ->whereDoesntHave('leases', function ($query) use ($today) {
                $query->whereNotIn('status', ['ended', 'terminated'])
                    ->where(function ($dates) use ($today) {
                        $dates->whereNull('end_date')
                            ->orWhereDate('end_date', '>=', $today);
                    });
            })
            ->whereDoesntHave('tenants', fn ($query) => $query->where('status', 'pending'))
            ->orderBy('unit_number')
            ->get(['id', 'property_id', 'unit_number', 'unit_type', 'monthly_rent', 'deposit_amount']);

        return response()->json($units);
    }

    /**
     * Check whether a selected unit will be available on the tenant's
     * requested move-in date and return same-type, similarly priced
     * alternatives when it is not.
     */
    public function registrationAvailability(Request $request, Property $property)
    {
        $validated = $request->validate([
            'requested_move_in_date' => ['required', 'date'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
        ]);

        $requestedStart = CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString();
        $selectedUnit = Unit::where('property_id', $property->id)
            ->findOrFail($validated['unit_id']);

        $availability = function (Unit $unit) use ($requestedStart): array {
            $leases = Lease::where('unit_id', $unit->id)
                ->whereNotIn('status', ['ended', 'terminated'])
                ->get(['start_date', 'end_date', 'requested_move_in_date', 'requested_move_out_date', 'status']);

            $conflicts = $leases->filter(function (Lease $lease) use ($requestedStart) {
                $start = $lease->start_date?->toDateString() ?? $lease->requested_move_in_date?->toDateString();
                $end = $lease->end_date?->toDateString() ?? $lease->requested_move_out_date?->toDateString();

                if ($start === null) {
                    return $lease->status === 'pending';
                }

                if ($end !== null && $end <= $requestedStart) {
                    return false;
                }

                return $start <= $requestedStart;
            });

            $nextAvailable = $conflicts
                ->map(fn (Lease $lease) => $lease->end_date?->toDateString() ?? $lease->requested_move_out_date?->toDateString())
                ->filter()
                ->sort()
                ->first();

            return [
                'available' => $conflicts->isEmpty(),
                'next_available_date' => $nextAvailable,
            ];
        };

        $selectedAvailability = $availability($selectedUnit);

        $suggestions = collect();
        if (! $selectedAvailability['available']) {
            $selectedRent = (float) $selectedUnit->monthly_rent;
            $minRent = $selectedRent * 0.90;
            $maxRent = $selectedRent * 1.10;

            $suggestions = Unit::where('property_id', $property->id)
                ->where('id', '<>', $selectedUnit->id)
                ->where('status', '!=', 'maintenance')
                ->where('unit_type', $selectedUnit->unit_type)
                ->whereBetween('monthly_rent', [$minRent, $maxRent])
                ->whereDoesntHave('tenants', fn ($query) => $query->where('status', 'pending'))
                ->orderBy('monthly_rent')
                ->orderBy('unit_number')
                ->get(['id', 'property_id', 'unit_number', 'unit_type', 'monthly_rent', 'deposit_amount'])
                ->filter(fn (Unit $unit) => $availability($unit)['available'])
                ->values()
                ->take(5)
                ->values();
        }

        return response()->json([
            'selected_unit' => [
                'id' => $selectedUnit->id,
                'unit_number' => $selectedUnit->unit_number,
                'unit_type' => $selectedUnit->unit_type,
                'monthly_rent' => $selectedUnit->monthly_rent,
                'deposit_amount' => $selectedUnit->deposit_amount,
            ],
            'available' => $selectedAvailability['available'],
            'next_available_date' => $selectedAvailability['next_available_date'],
            'suggestions' => $suggestions,
        ]);
    }

    public function index(Request $request)
    {
        $units = Unit::whereHas('property', function ($query) use ($request) {
            $query->where(
                'organization_id',
                $request->user()->organization_id
            );
        })->with(['property', 'leases.tenant', 'leases.deposit.tenant', 'tenants'])->get();

        $today = CarbonImmutable::today()->toDateString();
        $units->each(function (Unit $unit) use ($today) {
            $pendingTenant = $unit->tenants->firstWhere('status', 'pending');

            if ($unit->status === 'maintenance') {
                $unit->setAttribute('pending_registration', false);
                $unit->setAttribute('pending_email', null);
                $unit->setAttribute('current_tenant', null);
                $unit->setAttribute('upcoming_tenant', null);
                $unit->setAttribute('tenant', null);
                $unit->setAttribute('lease_id', null);
                $unit->setAttribute('lease_start_date', null);
                $unit->setAttribute('lease_end_date', null);
                return;
            }

            $activeLease = $unit->leases
                ->filter(fn ($lease) => ! in_array($lease->status, ['ended', 'terminated'], true))
                ->filter(fn ($lease) =>
                    $lease->start_date !== null &&
                    $lease->start_date->toDateString() <= $today &&
                    ($lease->end_date === null || $lease->end_date->toDateString() >= $today)
                )
                ->sortByDesc('start_date')
                ->first();

            // A reservation can be represented by an upcoming lease, a pending
            // lease with a future start/requested move-in date, or a pending
            // registration that has not yet produced a lease.
            $reservedLease = $unit->leases
                ->filter(fn ($lease) => ! in_array($lease->status, ['ended', 'terminated'], true))
                ->filter(function ($lease) use ($today) {
                    if ($lease->status === 'upcoming') {
                        return true;
                    }

                    if ($lease->start_date !== null) {
                        return $lease->start_date->toDateString() > $today;
                    }

                    return $lease->status === 'pending';
                })
                ->sortBy(function ($lease) {
                    $reservationStart = $lease->start_date?->timestamp
                        ?? $lease->requested_move_in_date?->timestamp
                        ?? PHP_INT_MAX;

                    return $reservationStart;
                })
                ->first();

            // An active lease always wins. A future reservation must never replace
            // the tenant who is currently living in the unit.
            $currentTenant = $activeLease?->tenant ?? $activeLease?->deposit?->tenant;
            $upcomingTenant = $reservedLease?->tenant
                ?? $reservedLease?->deposit?->tenant
                ?? $pendingTenant;

            if ($activeLease) {
                $status = 'occupied';
                $displayLease = $activeLease;
                $displayTenant = $currentTenant;
            } elseif ($reservedLease || $pendingTenant !== null) {
                $status = 'reserved';
                $displayLease = $reservedLease;
                $displayTenant = $upcomingTenant;
            } else {
                $status = 'vacant';
                $displayLease = null;
                $displayTenant = null;
            }

            $tenantReference = $displayTenant ? [
                'id' => $displayTenant->id,
                'name' => trim(implode(' ', array_filter([
                    $displayTenant->first_name ?? null,
                    $displayTenant->last_name ?? null,
                ]))) ?: ($displayTenant->name ?? $displayTenant->email ?? 'Tenant'),
            ] : null;

            $unit->setAttribute('status', $status);
            $unit->setAttribute('current_tenant', $currentTenant ? [
                'id' => $currentTenant->id,
                'name' => trim(implode(' ', array_filter([
                    $currentTenant->first_name ?? null,
                    $currentTenant->last_name ?? null,
                ]))) ?: ($currentTenant->name ?? $currentTenant->email ?? 'Tenant'),
            ] : null);
            $unit->setAttribute('upcoming_tenant', $upcomingTenant ? [
                'id' => $upcomingTenant->id,
                'name' => trim(implode(' ', array_filter([
                    $upcomingTenant->first_name ?? null,
                    $upcomingTenant->last_name ?? null,
                ]))) ?: ($upcomingTenant->name ?? $upcomingTenant->email ?? 'Tenant'),
            ] : null);
            // tenant remains the display tenant for compatibility with existing
            // consumers: current tenant when occupied, incoming tenant when reserved.
            $unit->setAttribute('tenant', $tenantReference);
            $unit->setAttribute('lease_id', $displayLease?->id);
            $unit->setAttribute(
                'lease_start_date',
                $displayLease?->start_date?->toDateString()
                    ?? $displayLease?->requested_move_in_date?->toDateString()
            );
            $unit->setAttribute('lease_end_date', $displayLease?->end_date?->toDateString());
            $unit->setAttribute('pending_registration', $pendingTenant !== null);
            $unit->setAttribute('pending_email', $pendingTenant?->email);
        });

        return response()->json($units);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'unit_number' => 'required|string|max:255',
            'unit_type' => 'nullable|string|max:255',
            'monthly_rent' => 'required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:vacant,occupied,reserved,maintenance',
            'description' => 'nullable|string',
        ]);

        $property = Property::findOrFail($validated['property_id']);

        if ($property->organization_id !== $request->user()->organization_id) {
            abort(403, 'You do not have access to this property.');
        }

        $unit = Unit::create([
            ...$validated,
            'deposit_amount' => $validated['deposit_amount'] ?? $validated['monthly_rent'],
        ]);

        return response()->json([
            'message' => 'Unit created successfully.',
            'unit' => $unit,
        ], 201);
    }

    public function show(Request $request, Unit $unit)
    {
        $this->authorizeOrganization($request, $unit);

        return response()->json(
            $unit->load('property')
        );
    }

    public function update(Request $request, Unit $unit)
    {
        $this->authorizeOrganization($request, $unit);

        $validated = $request->validate([
            'property_id' => 'sometimes|required|exists:properties,id',
            'unit_number' => 'sometimes|required|string|max:255',
            'unit_type' => 'nullable|string|max:255',
            'monthly_rent' => 'sometimes|required|numeric|min:0',
            'deposit_amount' => 'sometimes|required|numeric|min:0',
            'status' => 'nullable|in:vacant,occupied,reserved,maintenance',
            'description' => 'nullable|string',
        ]);

        if (isset($validated['property_id'])) {
            Property::where('organization_id', $request->user()->organization_id)
                ->findOrFail($validated['property_id']);
        }

        $unit->update($validated);

        return response()->json([
            'message' => 'Unit updated successfully.',
            'unit' => $unit,
        ]);
    }

    public function destroy(Request $request, Unit $unit)
    {
        $this->authorizeOrganization($request, $unit);

        $unit->delete();

        return response()->json([
            'message' => 'Unit deleted successfully.',
        ]);
    }

    private function authorizeOrganization(Request $request, Unit $unit)
    {
        abort_if(
            $unit->property->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this unit.'
        );
    }
}