<?php

namespace App\Http\Controllers;

use App\Models\Leases;
use App\Models\Property;
use App\Models\Unit;
use App\Models\Tenant;
use Illuminate\Http\Request;

class LeasesController extends Controller
{
    public function index(Request $request)
    {
        $leases = Leases::where('organization_id', $request->user()->organization_id)
            ->with(['property', 'unit', 'tenant'])
            ->get();

        return response()->json($leases);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'unit_id' => 'required|exists:units,id',
            'tenant_id' => 'required|exists:tenants,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'monthly_rent' => 'required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,ended,terminated',
            'notes' => 'nullable|string',
        ]);

        $organizationId = $request->user()->organization_id;

        $property = Property::findOrFail($validated['property_id']);
        $unit = Unit::findOrFail($validated['unit_id']);
        $tenant = Tenant::findOrFail($validated['tenant_id']);

        if (
            $property->organization_id !== $organizationId ||
            $unit->property_id !== $property->id ||
            $tenant->organization_id !== $organizationId
        ) {
            abort(403, 'You do not have access to these resources.');
        }

        $validated['organization_id'] = $organizationId;

        $lease = Leases::create($validated);

        return response()->json([
            'message' => 'Lease created successfully.',
            'lease' => $lease->load(['property', 'unit', 'tenant']),
        ], 201);
    }

    public function show(Request $request, Leases $lease)
    {
        $this->authorizeOrganization($request, $lease);

        return response()->json(
            $lease->load(['property', 'unit', 'tenant'])
        );
    }

    public function update(Request $request, Leases $lease)
    {
        $this->authorizeOrganization($request, $lease);

        $validated = $request->validate([
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after:start_date',
            'monthly_rent' => 'sometimes|required|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,ended,terminated',
            'notes' => 'nullable|string',
        ]);

        $lease->update($validated);

        return response()->json([
            'message' => 'Lease updated successfully.',
            'lease' => $lease->load(['property', 'unit', 'tenant']),
        ]);
    }

    public function destroy(Request $request, Leases $lease)
    {
        $this->authorizeOrganization($request, $lease);

        $lease->delete();

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