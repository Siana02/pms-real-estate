<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Leases;
use App\Models\MaintenanceRequest;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $organizationId = $request->user()->organization_id;
        $now = CarbonImmutable::now();
        $monthStart = $now->startOfMonth();
        $monthEnd = $now->endOfMonth();
        $trendStart = $monthStart->subMonths(5);

        $organization = Organization::find($organizationId);

        $properties = Property::where('organization_id', $organizationId)
            ->orderBy('name')
            ->get();

        $units = Unit::whereHas('property', fn ($query) =>
            $query->where('organization_id', $organizationId)
        )->get();

        $activeLeases = Leases::where('organization_id', $organizationId)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $now->toDateString())
            ->where(fn ($query) =>
                $query->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $now->toDateString())
            )
            ->get();

        $activeTenants = Tenant::where('organization_id', $organizationId)
            ->where('status', 'active')
            ->count();

        $paymentsThisMonth = Payment::where('organization_id', $organizationId)
            ->whereBetween('payment_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $paymentsByMonth = Payment::where('organization_id', $organizationId)
            ->whereBetween('payment_date', [$trendStart->toDateString(), $monthEnd->toDateString()])
            ->selectRaw('YEAR(payment_date) as year, MONTH(payment_date) as month, SUM(amount) as total')
            ->groupByRaw('YEAR(payment_date), MONTH(payment_date)')
            ->get()
            ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->year, $row->month));

        $revenueTrend = collect(range(5, 0))
            ->map(function ($monthsAgo) use ($paymentsByMonth, $now) {
                $date = $now->startOfMonth()->subMonths($monthsAgo);
                $key = $date->format('Y-m');

                return [
                    'label' => $date->format('M'),
                    'value' => (float) ($paymentsByMonth->get($key)?->total ?? 0),
                ];
            })
            ->values()
            ->all();

        $completedMaintenanceThisMonth = MaintenanceRequest::where('organization_id', $organizationId)
            ->where('status', 'completed')
            ->whereBetween('completed_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();

        $maintenanceCostThisMonth = $completedMaintenanceThisMonth->sum(
            fn (MaintenanceRequest $item) => (float) ($item->actual_cost ?? $item->estimated_cost ?? 0)
        );

        $expensesThisMonth = Expense::where('organization_id', $organizationId)
            ->whereBetween('expense_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $maintenance = MaintenanceRequest::where('organization_id', $organizationId)
            ->with(['property:id,name', 'unit:id,unit_number', 'tenant:id,first_name,last_name,phone'])
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderBy('reported_date')
            ->get();

        $openMaintenance = $maintenance->whereIn('status', ['open', 'in_progress']);
        $committedMaintenance = $openMaintenance->sum(
            fn (MaintenanceRequest $item) => (float) ($item->estimated_cost ?? 0)
        );

        // The dashboard is an operational overview, so only active maintenance work belongs here.
        // Completed/cancelled requests remain available from the full Maintenance workspace.
        $dashboardMaintenanceItems = $openMaintenance
            ->values()
            ->take(5)
            ->values();

        $propertiesPayload = $properties->map(function (Property $property) use ($activeLeases, $units) {
            $propertyUnits = $units->where('property_id', $property->id);
            $leases = $activeLeases->where('property_id', $property->id);
            $occupiedUnitIds = $leases->pluck('unit_id')->unique();

            $unitsCount = $propertyUnits->count();
            $occupied = $occupiedUnitIds->count();
            $potential = (float) $propertyUnits->sum('monthly_rent');
            $rent = (float) $leases->sum('monthly_rent');

            return [
                'id' => $property->id,
                'name' => $property->name,
                'city' => $property->city,
                'country' => $property->country,
                'units_count' => $unitsCount,
                'occupied_units' => $occupied,
                'vacant_units' => max($unitsCount - $occupied, 0),
                'active_tenants' => $leases->pluck('tenant_id')->unique()->count(),
                'monthly_revenue' => $rent,
                'potential_monthly_revenue' => $potential,
                'occupancy' => $unitsCount > 0 ? round(($occupied / $unitsCount) * 100, 1) : 0,
            ];
        })->values();

        $totalUnits = $units->count();
        $occupiedUnits = $activeLeases->pluck('unit_id')->unique()->count();
        $monthlyRent = (float) $activeLeases->sum('monthly_rent');
        $netRevenue = $monthlyRent;

        return response()->json([
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'currency' => $organization->currency ?: 'KES',
            ] : [
                'id' => $organizationId,
                'name' => 'Organization',
                'currency' => 'KES',
            ],
            'stats' => [
                'properties' => $properties->count(),
                'units' => $totalUnits,
                'occupied_units' => $occupiedUnits,
                'vacant_units' => max($totalUnits - $occupiedUnits, 0),
                'occupancy' => $totalUnits > 0 ? round(($occupiedUnits / $totalUnits) * 100) : 0,
                'active_tenants' => $activeTenants,
                'active_leases' => $activeLeases->count(),
                'monthly_rent' => $monthlyRent,
                'monthly_revenue' => $monthlyRent,
                'monthly_maintenance' => (float) $maintenanceCostThisMonth,
                'monthly_expenses' => (float) $expensesThisMonth,
                'net_revenue' => $netRevenue,
                'cash_collected_this_month' => (float) $paymentsThisMonth,
                'idle_rent' => max((float) $units->sum('monthly_rent') - $monthlyRent, 0),
                'committed_maintenance' => (float) $committedMaintenance,
            ],
            'revenue_trend' => $revenueTrend,
            'maintenance' => [
                'needs_action' => $openMaintenance->count(),
                'open' => $maintenance->where('status', 'open')->count(),
                'in_progress' => $maintenance->where('status', 'in_progress')->count(),
                'completed' => $maintenance->where('status', 'completed')->count(),
                'cancelled' => $maintenance->where('status', 'cancelled')->count(),
                'committed_cost' => (float) $committedMaintenance,
                'items' => $dashboardMaintenanceItems,
            ],
            'properties_list' => $propertiesPayload,
        ]);
    }
}
