<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'status' => 'nullable|in:active,inactive',
            'active_only' => 'nullable|boolean',
        ]);

        $organizationId = $request->user()->organization_id;

        $tenants = Tenant::where('organization_id', $organizationId)
            ->when(
                isset($filters['status']),
                fn ($query) => $query->where('status', $filters['status'])
            )
            ->when(
                filter_var($filters['active_only'] ?? false, FILTER_VALIDATE_BOOL),
                fn ($query) => $query->where('status', 'active')
            )
            ->when(isset($filters['property_id']), function ($query) use ($filters) {
                $tenantIds = Lease::where('property_id', $filters['property_id'])
                    ->pluck('tenant_id');

                $query->whereIn('id', $tenantIds);
            })
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        $context = $this->contextFor($tenants->pluck('id')->all());

        return response()->json([
            'data' => $tenants->map(
                fn (Tenant $tenant) => $this->present($tenant, $context)
            )->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:50',
            'national_id' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['organization_id'] = $request->user()->organization_id;
        $validated['status'] = $validated['status'] ?? 'active';

        $tenant = Tenant::create($validated);

        return response()->json([
            'message' => 'Tenant created successfully.',
            'tenant' => $this->present($tenant, $this->contextFor([$tenant->id])),
        ], 201);
    }

    public function show(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        return response()->json(
            $this->present($tenant, $this->contextFor([$tenant->id]))
        );
    }

    public function update(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'sometimes|required|string|max:50',
            'national_id' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Tenant updated successfully.',
            'tenant' => $this->present($tenant, $this->contextFor([$tenant->id])),
        ]);
    }

    public function destroy(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        $tenant->delete();

        return response()->json([
            'message' => 'Tenant deleted successfully.',
        ]);
    }

    /**
     * Leases, units, payments and maintenance keyed by tenant so a list of
     * tenants costs a fixed number of queries.
     *
     * @param  array<int, int>  $tenantIds
     * @return array<string, \Illuminate\Support\Collection>
     */
    private function contextFor(array $tenantIds): array
    {
        $leases = Lease::with('property')
            ->whereIn('tenant_id', $tenantIds)
            ->get();

        return [
            'leases' => $leases->groupBy('tenant_id'),
            'units' => Unit::whereIn('id', $leases->pluck('unit_id')->filter())
                ->get()
                ->keyBy('id'),
            'payments' => Payment::whereIn('lease_id', $leases->pluck('id'))
                ->get()
                ->groupBy('lease_id'),
            'requests' => MaintenanceRequest::whereIn('tenant_id', $tenantIds)
                ->get()
                ->groupBy('tenant_id'),
        ];
    }

    /**
     * @param  array<string, \Illuminate\Support\Collection>  $context
     * @return array<string, mixed>
     */
    private function present(Tenant $tenant, array $context): array
    {
        $leases = $context['leases']->get($tenant->id, collect());
        $requests = $context['requests']->get($tenant->id, collect());

        $activeLease = $leases->firstWhere('status', 'active');
        $unit = $activeLease
            ? $context['units']->get($activeLease->unit_id)
            : null;

        $openRequests = $requests->whereIn('status', ['open', 'in_progress']);

        $paid = $leases->sum(
            fn ($lease) => (float) $context['payments']
                ->get($lease->id, collect())
                ->sum('amount')
        );

        return [
            'id' => $tenant->id,
            'organization_id' => $tenant->organization_id,
            'first_name' => $tenant->first_name,
            'last_name' => $tenant->last_name,
            'name' => trim("{$tenant->first_name} {$tenant->last_name}"),
            'email' => $tenant->email,
            'phone' => $tenant->phone,
            'national_id' => $tenant->national_id,
            'status' => $tenant->status,
            'notes' => $tenant->notes,
            'created_at' => $tenant->created_at,
            'updated_at' => $tenant->updated_at,
            'property' => $activeLease?->property,
            'unit' => $unit,
            'lease' => $activeLease,
            'leases' => $leases->values(),
            'active_leases' => $leases->where('status', 'active')->count(),
            'monthly_rent' => (float) ($activeLease->monthly_rent ?? 0),
            'total_paid' => round($paid, 2),
            'maintenance_requests' => $requests->values(),
            'open_maintenance_requests' => $openRequests->count(),
            'urgent_maintenance_requests' => $openRequests
                ->where('priority', 'urgent')
                ->count(),
        ];
    }

    private function authorizeOrganization(Request $request, Tenant $tenant)
    {
        abort_if(
            $tenant->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this tenant.'
        );
    }
}
