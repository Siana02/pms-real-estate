<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Unit;
use App\Models\Tenant;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request)
    {
        $requests = MaintenanceRequest::where(
            'organization_id',
            $request->user()->organization_id
        )
        ->with(['property', 'unit', 'tenant'])
        ->latest('reported_date')
        ->get();

        return response()->json($requests);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'unit_id' => 'nullable|exists:units,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:open,in_progress,completed,cancelled',
            'assigned_to' => 'nullable|string|max:255',
            'estimated_cost' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'reported_date' => 'required|date',
            'completed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $property = Property::findOrFail($validated['property_id']);

        if ($property->organization_id !== $request->user()->organization_id) {
            abort(403, 'You do not have access to this property.');
        }

        if (isset($validated['unit_id'])) {
            $unit = Unit::findOrFail($validated['unit_id']);

            if ($unit->property_id !== $property->id) {
                abort(422, 'The selected unit does not belong to this property.');
            }
        }

        if (isset($validated['tenant_id'])) {
            $tenant = Tenant::findOrFail($validated['tenant_id']);

            if ($tenant->organization_id !== $request->user()->organization_id) {
                abort(403, 'You do not have access to this tenant.');
            }
        }

        $maintenanceRequest = MaintenanceRequest::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json([
            'message' => 'Maintenance request created successfully.',
            'maintenance_request' => $maintenanceRequest->load([
                'property',
                'unit',
                'tenant',
            ]),
        ], 201);
    }

    public function show(
        Request $request,
        MaintenanceRequest $maintenanceRequest
    ) {
        $this->authorizeOrganization($request, $maintenanceRequest);

        return response()->json(
            $maintenanceRequest->load([
                'property',
                'unit',
                'tenant',
            ])
        );
    }

    public function update(
        Request $request,
        MaintenanceRequest $maintenanceRequest
    ) {
        $this->authorizeOrganization($request, $maintenanceRequest);

        $validated = $request->validate([
            'property_id' => 'sometimes|required|exists:properties,id',
            'unit_id' => 'nullable|exists:units,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:open,in_progress,completed,cancelled',
            'assigned_to' => 'nullable|string|max:255',
            'estimated_cost' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
            'reported_date' => 'sometimes|required|date',
            'completed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['property_id'])) {
            $property = Property::findOrFail($validated['property_id']);

            if ($property->organization_id !== $request->user()->organization_id) {
                abort(403, 'You do not have access to this property.');
            }
        }

        if (isset($validated['unit_id'])) {
            $unit = Unit::findOrFail($validated['unit_id']);

            $propertyId = $validated['property_id']
                ?? $maintenanceRequest->property_id;

            if ($unit->property_id !== $propertyId) {
                abort(422, 'The selected unit does not belong to this property.');
            }
        }

        if (isset($validated['tenant_id'])) {
            $tenant = Tenant::findOrFail($validated['tenant_id']);

            if ($tenant->organization_id !== $request->user()->organization_id) {
                abort(403, 'You do not have access to this tenant.');
            }
        }

        $maintenanceRequest->update($validated);

        return response()->json([
            'message' => 'Maintenance request updated successfully.',
            'maintenance_request' => $maintenanceRequest->load([
                'property',
                'unit',
                'tenant',
            ]),
        ]);
    }

    public function destroy(
        Request $request,
        MaintenanceRequest $maintenanceRequest
    ) {
        $this->authorizeOrganization($request, $maintenanceRequest);

        $maintenanceRequest->delete();

        return response()->json([
            'message' => 'Maintenance request deleted successfully.',
        ]);
    }

    private function authorizeOrganization(
        Request $request,
        MaintenanceRequest $maintenanceRequest
    ) {
        abort_if(
            $maintenanceRequest->organization_id !==
            $request->user()->organization_id,
            403,
            'You do not have access to this maintenance request.'
        );
    }
}