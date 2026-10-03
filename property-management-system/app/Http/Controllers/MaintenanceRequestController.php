<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
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
            ->when(isset($filters['property_id']), fn ($query) => $query->where('property_id', $filters['property_id']))
            ->when(isset($filters['unit_id']), fn ($query) => $query->where('unit_id', $filters['unit_id']))
            ->when(isset($filters['tenant_id']), fn ($query) => $query->where('tenant_id', $filters['tenant_id']))
            ->when(isset($filters['priority']), fn ($query) => $query->where('priority', $filters['priority']))
            ->when(isset($filters['status']), fn ($query) => $query->where('status', $filters['status']))
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
            'reported_date' => 'nullable|date',
            'completed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $property = Property::findOrFail($validated['property_id']);
        abort_if($property->organization_id !== $request->user()->organization_id, 403, 'You do not have access to this property.');

        if (isset($validated['unit_id'])) {
            $unit = Unit::findOrFail($validated['unit_id']);
            abort_if($unit->property_id !== $property->id, 422, 'The selected unit does not belong to this property.');
        }

        if (isset($validated['tenant_id'])) {
            $tenant = Tenant::findOrFail($validated['tenant_id']);
            abort_if($tenant->organization_id !== $request->user()->organization_id, 403, 'You do not have access to this tenant.');
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
            'maintenance_request' => $maintenanceRequest->load(['property', 'unit', 'tenant']),
        ], 201);
    }

    public function show(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $this->authorizeOrganization($request, $maintenanceRequest);

        return response()->json($maintenanceRequest->load(['property', 'unit', 'tenant']));
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $this->authorizeOrganization($request, $maintenanceRequest);

        // Tenant-submitted fields (title, description, priority, property, unit,
        // tenant) are intentionally immutable from the manager workflow. The
        // manager controls the operational side of the request instead.
        $validated = $request->validate([
            'status' => 'sometimes|required|in:open,in_progress,completed,cancelled',
            'assigned_to' => 'nullable|string|max:255',
            'scheduled_date' => 'nullable|date',
            'scheduled_time' => 'nullable|date_format:H:i',
            'estimated_cost' => 'nullable|numeric|min:0',
            'cost_responsibility' => 'nullable|in:tenant,landlord',
            'completed_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $validated = $this->applyWorkflowRules($maintenanceRequest, $validated);
        $maintenanceRequest->update($validated);

        return response()->json([
            'message' => 'Maintenance request updated successfully.',
            'maintenance_request' => $maintenanceRequest->fresh()->load(['property', 'unit', 'tenant']),
            'summary' => $this->summary($request->user()->organization_id),
        ]);
    }

    public function destroy(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $this->authorizeOrganization($request, $maintenanceRequest);
        $maintenanceRequest->delete();

        return response()->json(['message' => 'Maintenance request deleted successfully.']);
    }

    /** @param array<string, mixed> $validated */
    private function applyWorkflowRules(MaintenanceRequest $item, array $validated): array
    {
        if (array_key_exists('scheduled_date', $validated)) {
            if ($validated['scheduled_date'] === null) {
                $validated['scheduled_time'] = null;
                $validated['tenant_availability'] = null;
            } else {
                // Any new/rescheduled visit needs a fresh tenant confirmation.
                $validated['tenant_availability'] = 'pending';
            }
        } elseif (array_key_exists('scheduled_time', $validated) && $item->scheduled_date !== null) {
            // Changing only the time also invalidates a previous confirmation.
            $validated['tenant_availability'] = 'pending';
        }

        if (($validated['status'] ?? null) === 'completed') {
            $validated['completed_date'] = $validated['completed_date']
                ?? $item->completed_date?->toDateString()
                ?? now()->toDateString();
        }

        if (in_array($validated['status'] ?? null, ['open', 'in_progress', 'cancelled'], true)) {
            $validated['completed_date'] = null;
        }

        return $validated;
    }

    /** @return array<string, float|int> */
    private function summary(int $organizationId): array
    {
        $requests = MaintenanceRequest::where('organization_id', $organizationId)
            ->whereIn('status', ['open', 'in_progress', 'completed'])
            ->get();

        $estimatedCost = fn (MaintenanceRequest $item): float => (float) ($item->estimated_cost ?? 0);
        $outstanding = $requests->whereIn('status', ['open', 'in_progress']);
        $completedThisMonth = $requests
            ->where('status', 'completed')
            ->filter(fn (MaintenanceRequest $item) => $item->completed_date
                && $item->completed_date->isSameMonth(now()));

        return [
            'open_requests' => $outstanding->count(),
            'urgent_requests' => $outstanding->where('priority', 'urgent')->count(),
            'unassigned_requests' => $outstanding->whereNull('assigned_to')->count(),
            'committed_cost' => round($outstanding->sum($estimatedCost), 2),
            'spent_this_month' => round($completedThisMonth->sum($estimatedCost), 2),
        ];
    }

    private function authorizeOrganization(Request $request, MaintenanceRequest $maintenanceRequest): void
    {
        abort_if(
            $maintenanceRequest->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this maintenance request.'
        );
    }
}
