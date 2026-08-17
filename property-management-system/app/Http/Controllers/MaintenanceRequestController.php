<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
    /**
     * Priority order the dashboard queue relies on.
     */
    private const PRIORITY_ORDER = "CASE priority
        WHEN 'urgent' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
    END";

    public function index(Request $request)
    {
        $filters = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'unit_id' => 'nullable|exists:units,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:open,in_progress,completed,cancelled',
            'open_only' => 'nullable|boolean',
        ]);

        $organizationId = $request->user()->organization_id;

        $requests = MaintenanceRequest::where('organization_id', $organizationId)
            ->with(['property', 'unit', 'tenant'])
            ->when(
                isset($filters['property_id']),
                fn ($query) => $query->where('property_id', $filters['property_id'])
            )
            ->when(
                isset($filters['unit_id']),
                fn ($query) => $query->where('unit_id', $filters['unit_id'])
            )
            ->when(
                isset($filters['tenant_id']),
                fn ($query) => $query->where('tenant_id', $filters['tenant_id'])
            )
            ->when(
                isset($filters['priority']),
                fn ($query) => $query->where('priority', $filters['priority'])
            )
            ->when(
                isset($filters['status']),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->when(
                filter_var($filters['open_only'] ?? false, FILTER_VALIDATE_BOOL),
                fn ($query) => $query->whereIn('status', ['open', 'in_progress'])
            )
            ->orderByRaw(self::PRIORITY_ORDER)
            ->orderBy('reported_date')
            ->get();

        return response()->json([
            'data' => $requests,
            'summary' => $this->summary($organizationId),
        ]);
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
            'reported_date' => 'nullable|date',
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

            // A request raised by a tenant is attributed to the unit they lease
            // when the reporter did not name one.
            if (!isset($validated['unit_id'])) {
                $lease = Lease::where('tenant_id', $tenant->id)
                    ->where('property_id', $property->id)
                    ->where('status', 'active')
                    ->first();

                if ($lease) {
                    $validated['unit_id'] = $lease->unit_id;
                }
            }
        }

        $maintenanceRequest = MaintenanceRequest::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
            'priority' => $validated['priority'] ?? 'medium',
            'status' => $validated['status'] ?? 'open',
            'reported_date' => $validated['reported_date'] ?? now()->toDateString(),
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

        $validated = $this->applyStatusTransition($maintenanceRequest, $validated);

        $maintenanceRequest->update($validated);

        return response()->json([
            'message' => 'Maintenance request updated successfully.',
            'maintenance_request' => $maintenanceRequest->load([
                'property',
                'unit',
                'tenant',
            ]),
            'summary' => $this->summary($request->user()->organization_id),
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

    /**
     * Completing a request stamps the closing date and books a cost so the
     * dashboard can deduct it from the month's revenue; reopening clears it.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function applyStatusTransition(
        MaintenanceRequest $maintenanceRequest,
        array $validated
    ): array {
        $status = $validated['status'] ?? null;

        if ($status === 'completed') {
            $validated['completed_date'] = $validated['completed_date']
                ?? $maintenanceRequest->completed_date?->toDateString()
                ?? now()->toDateString();

            $validated['actual_cost'] = $validated['actual_cost']
                ?? $maintenanceRequest->actual_cost
                ?? $maintenanceRequest->estimated_cost;
        }

        if (in_array($status, ['open', 'in_progress', 'cancelled'], true)) {
            $validated['completed_date'] = null;
        }

        return $validated;
    }

    /**
     * Workload still owed and the maintenance cost booked against this month.
     *
     * @return array<string, float|int>
     */
    private function summary(int $organizationId): array
    {
        $requests = MaintenanceRequest::where('organization_id', $organizationId)
            ->whereIn('status', ['open', 'in_progress', 'completed'])
            ->get();

        $cost = fn (MaintenanceRequest $item): float => (float) (
            $item->actual_cost ?? $item->estimated_cost ?? 0
        );

        $outstanding = $requests->whereIn('status', ['open', 'in_progress']);

        $completedThisMonth = $requests
            ->where('status', 'completed')
            ->filter(fn (MaintenanceRequest $item) => $item->completed_date
                && $item->completed_date->isSameMonth(now()));

        return [
            'open_requests' => $outstanding->count(),
            'urgent_requests' => $outstanding->where('priority', 'urgent')->count(),
            'committed_cost' => round($outstanding->sum($cost), 2),
            'spent_this_month' => round($completedThisMonth->sum($cost), 2),
        ];
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
