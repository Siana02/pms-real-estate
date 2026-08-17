<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $properties = Property::where(
            'organization_id',
            $request->user()->organization_id
        )->get();

        return response()->json(
            $properties->map(fn (Property $property) => $this->withMetrics($property))
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'property_type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'monthly_rent' => 'nullable|numeric|min:0',

            'units' => 'array',
            'units.*.unit_number' => 'required|string|max:255|distinct:ignore_case',
            'units.*.unit_type' => 'nullable|string|max:255',
            'units.*.status' => 'required|in:vacant,occupied,maintenance',
            'units.*.monthly_rent' => 'nullable|numeric|min:0',
            'units.*.description' => 'nullable|string',

            'units.*.tenant' => 'nullable|array',
            'units.*.tenant.first_name' => 'required_with:units.*.tenant|string|max:255',
            'units.*.tenant.last_name' => 'required_with:units.*.tenant|string|max:255',
            'units.*.tenant.email' => 'nullable|email|max:255',
            'units.*.tenant.phone' => 'required_with:units.*.tenant|string|max:50',
            'units.*.tenant.national_id' => 'nullable|string|max:50',

            'units.*.lease' => 'nullable|array',
            'units.*.lease.start_date' => 'required_with:units.*.lease|date',
            'units.*.lease.end_date' => 'nullable|date|after_or_equal:units.*.lease.start_date',
            'units.*.lease.monthly_rent' => 'nullable|numeric|min:0',
            'units.*.lease.deposit_amount' => 'nullable|numeric|min:0',
            'units.*.lease.notes' => 'nullable|string',
        ]);

        $organizationId = $request->user()->organization_id;

        $property = DB::transaction(function () use ($validated, $organizationId) {
            $property = Property::create([
                'organization_id' => $organizationId,
                'name' => $validated['name'],
                'property_type' => $validated['property_type'] ?? null,
                'description' => $validated['description'] ?? null,
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'] ?? null,
                'country' => $validated['country'] ?? null,
                'monthly_rent' => $validated['monthly_rent'] ?? 0,
            ]);

            foreach ($validated['units'] ?? [] as $payload) {
                $unit = Unit::create([
                    'property_id' => $property->id,
                    'unit_number' => $payload['unit_number'],
                    'unit_type' => $payload['unit_type'] ?? null,
                    'monthly_rent' => $payload['monthly_rent'] ?? 0,
                    'status' => $payload['status'],
                    'description' => $payload['description'] ?? null,
                ]);

                if ($payload['status'] !== 'occupied') {
                    continue;
                }

                $tenantPayload = $payload['tenant'] ?? null;
                $leasePayload = $payload['lease'] ?? null;

                if (!$tenantPayload || !$leasePayload) {
                    continue;
                }

                $tenant = $this->resolveTenant($organizationId, $tenantPayload);

                Lease::create([
                    'organization_id' => $organizationId,
                    'property_id' => $property->id,
                    'unit_id' => $unit->id,
                    'tenant_id' => $tenant->id,
                    'start_date' => $leasePayload['start_date'],
                    'end_date' => $leasePayload['end_date'] ?? null,
                    'monthly_rent' => $leasePayload['monthly_rent'] ?? $unit->monthly_rent,
                    'deposit_amount' => $leasePayload['deposit_amount'] ?? 0,
                    'status' => 'active',
                    'notes' => $leasePayload['notes'] ?? null,
                ]);
            }

            $property->update([
                'monthly_rent' => $this->metrics($property)['monthly_revenue'],
            ]);

            return $property;
        });

        return response()->json([
            'message' => 'Property created successfully.',
            'property' => $this->withMetrics($property->fresh()),
        ], 201);
    }

    public function show(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        return response()->json($this->withMetrics($property));
    }

    public function update(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'property_type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'monthly_rent' => 'nullable|numeric|min:0',
        ]);

        $property->update($validated);

        return response()->json([
            'message' => 'Property updated successfully.',
            'property' => $this->withMetrics($property),
        ]);
    }

    public function destroy(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully.',
        ]);
    }

    private function resolveTenant(int $organizationId, array $payload): Tenant
    {
        $email = $payload['email'] ?? null;

        if ($email) {
            $existing = Tenant::where('organization_id', $organizationId)
                ->where('email', $email)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        return Tenant::create([
            'organization_id' => $organizationId,
            'first_name' => $payload['first_name'],
            'last_name' => $payload['last_name'],
            'email' => $email,
            'phone' => $payload['phone'],
            'national_id' => $payload['national_id'] ?? null,
            'status' => 'active',
        ]);
    }

    private function metrics(Property $property): array
    {
        $units = Unit::where('property_id', $property->id)->get();
        $activeLeases = Lease::where('property_id', $property->id)
            ->where('status', 'active')
            ->get();

        $unitsCount = $units->count();
        $occupiedUnits = $units->where('status', 'occupied')->count();

        return [
            'units_count' => $unitsCount,
            'occupied_units' => $occupiedUnits,
            'vacant_units' => $unitsCount - $occupiedUnits,
            'active_tenants' => $activeLeases->pluck('tenant_id')->unique()->count(),
            'active_leases' => $activeLeases->count(),
            'monthly_revenue' => (float) $activeLeases->sum('monthly_rent'),
            'potential_monthly_revenue' => (float) $units->sum('monthly_rent'),
            'occupancy' => $unitsCount > 0
                ? round($occupiedUnits / $unitsCount * 100, 1)
                : 0,
        ];
    }

    private function withMetrics(Property $property): array
    {
        return $property->toArray() + $this->metrics($property);
    }

    private function authorizeOrganization(Request $request, Property $property)
    {
        abort_if(
            $property->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this property.'
        );
    }
}
