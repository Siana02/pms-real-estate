<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\MaintenanceRequest;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class TenantMaintenanceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $requests = MaintenanceRequest::where('tenant_id', $tenant->id)->orderByDesc('reported_date')->orderByDesc('id')->get();

        return response()->json([
            'data' => $requests->map(fn (MaintenanceRequest $item) => $this->payload($item))->values(),
            'summary' => [
                'open' => $requests->where('status', 'open')->count(),
                'in_progress' => $requests->where('status', 'in_progress')->count(),
                'resolved' => $requests->where('status', 'completed')->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = Lease::where('tenant_id', $tenant->id)
            ->where('organization_id', $tenant->organization_id)
            ->whereIn('status', ['active', 'upcoming', 'notice'])
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderByDesc('start_date')
            ->first();

        abort_if($lease === null, 422, 'You need a confirmed active or upcoming lease before you can submit a maintenance request.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'min:10'],
            'category' => ['nullable', 'string', 'max:100'],
            'priority' => ['required', 'in:low,medium,high,urgent'],
            'reported_date' => ['nullable', 'date'],
        ]);

        $description = $validated['description'];
        if (!empty($validated['category'])) $description = ucfirst($validated['category']) . ': ' . $description;

        $item = MaintenanceRequest::create([
            'organization_id' => $lease->organization_id,
            'property_id' => $lease->property_id,
            'unit_id' => $lease->unit_id,
            'tenant_id' => $tenant->id,
            'title' => $validated['title'],
            'description' => $description,
            'priority' => $validated['priority'],
            'status' => 'open',
            'reported_date' => $validated['reported_date'] ?? CarbonImmutable::today()->toDateString(),
        ]);

        return response()->json(['message' => 'Request submitted. Your property manager has been notified.', 'data' => $this->payload($item)], 201);
    }

    public function availability(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        abort_if($maintenanceRequest->tenant_id !== $tenant->id, 403, 'You do not have access to this maintenance request.');
        abort_if($maintenanceRequest->scheduled_date === null, 422, 'No maintenance visit has been scheduled yet.');
        abort_if($maintenanceRequest->status === 'completed', 422, 'This maintenance request is already completed.');

        $validated = $request->validate(['availability' => ['required', 'in:confirmed,unavailable']]);
        $maintenanceRequest->update(['tenant_availability' => $validated['availability']]);

        return response()->json([
            'message' => $validated['availability'] === 'confirmed' ? 'Your maintenance visit has been confirmed.' : 'Your property manager has been notified that you are unavailable at that time.',
            'data' => $this->payload($maintenanceRequest->fresh()),
        ]);
    }

    private function currentTenant(Request $request): Tenant
    {
        $user = $request->user();
        $tenant = null;
        if (Schema::hasColumn('users', 'tenant_id') && $user->tenant_id) {
            $tenant = Tenant::whereKey($user->tenant_id)->where('organization_id', $user->organization_id)->first();
        }
        if ($tenant === null && $user->email) {
            $tenant = Tenant::where('organization_id', $user->organization_id)->where('email', $user->email)->first();
        }
        abort_if($tenant === null, 404, 'No tenant record is linked to your account.');
        return $tenant;
    }

    /** @return array<string, mixed> */
    private function payload(MaintenanceRequest $item): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'description' => $item->description,
            'priority' => $item->priority,
            'status' => $item->status,
            'assigned_to' => $item->assigned_to,
            'scheduled_date' => $item->scheduled_date?->toDateString(),
            'scheduled_time' => $item->scheduled_time,
            'tenant_availability' => $item->tenant_availability,
            'estimated_cost' => $item->estimated_cost,
            'cost_responsibility' => $item->cost_responsibility,
            'reported_date' => $item->reported_date?->toDateString(),
            'completed_date' => $item->completed_date?->toDateString(),
            'updated_at' => optional($item->updated_at)->toIso8601String(),
            'notes' => $item->notes,
        ];
    }
}
