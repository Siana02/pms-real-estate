<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\Property;
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
            ->get(['id', 'property_id', 'unit_number', 'unit_type', 'monthly_rent']);

        return response()->json($units);
    }

    public function index(Request $request)
    {
        $units = Unit::whereHas('property', function ($query) use ($request) {
            $query->where(
                'organization_id',
                $request->user()->organization_id
            );
        })->with(['property', 'leases', 'tenants'])->get();

        $today = CarbonImmutable::today()->toDateString();
        $units->each(function (Unit $unit) use ($today) {
            if ($unit->status === 'maintenance') {
                return;
            }

            $status = $unit->leases
                ->filter(fn ($lease) => ! in_array($lease->status, ['ended', 'terminated'], true))
                ->contains(fn ($lease) =>
                    $lease->start_date->toDateString() <= $today &&
                    ($lease->end_date === null || $lease->end_date->toDateString() >= $today)
                )
                ? 'occupied'
                : ($unit->leases
                    ->contains(fn ($lease) => $lease->status === 'upcoming') ||
                    $unit->tenants->contains(fn ($tenant) => $tenant->status === 'pending')
                    ? 'reserved'
                    : 'vacant');

            $unit->setAttribute('status', $status);
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
            'status' => 'nullable|in:vacant,occupied,reserved,maintenance',
            'description' => 'nullable|string',
        ]);

        $property = Property::findOrFail($validated['property_id']);

        if ($property->organization_id !== $request->user()->organization_id) {
            abort(403, 'You do not have access to this property.');
        }

        $unit = Unit::create($validated);

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