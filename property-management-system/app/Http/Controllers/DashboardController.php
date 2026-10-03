<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Unit;
use App\Models\Tenant;
use App\Models\Leases;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\MaintenanceRequest;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $organizationId = $user->organization_id;

        $properties = Property::where(
            'organization_id',
            $organizationId
        )->count();

        $units = Unit::whereHas('property', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })->count();

        $activeTenants = Tenant::where(
            'organization_id',
            $organizationId
        )
        ->where('status', 'active')
        ->count();

        $activeLeases = Leases::where(
            'organization_id',
            $organizationId
        )
        ->where('status', 'active')
        ->count();

        $monthlyRevenue = Payment::whereHas('lease', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->whereMonth('payment_date', now()->month)
        ->whereYear('payment_date', now()->year)
        ->sum('amount');

        // Keep the dashboard chart grounded in real payment history rather than
        // estimating or repeating the current month's revenue.
        $trendStart = now()->copy()->startOfMonth()->subMonths(5);
        $trendEnd = now()->copy()->endOfMonth();

        $revenueByMonth = Payment::whereHas('lease', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->whereBetween('payment_date', [$trendStart, $trendEnd])
        ->selectRaw('YEAR(payment_date) as year, MONTH(payment_date) as month, SUM(amount) as total')
        ->groupByRaw('YEAR(payment_date), MONTH(payment_date)')
        ->get()
        ->keyBy(fn ($row) => sprintf('%04d-%02d', $row->year, $row->month));

        $revenueTrend = collect(range(5, 0))
            ->map(function ($monthsAgo) use ($revenueByMonth) {
                $date = now()->copy()->startOfMonth()->subMonths($monthsAgo);
                $key = $date->format('Y-m');
                return [
                    'label' => $date->format('M'),
                    'value' => (float) ($revenueByMonth->get($key)?->total ?? 0),
                ];
            })
            ->values()
            ->all();

        $totalExpenses = Expense::where(
            'organization_id',
            $organizationId
        )
        ->whereMonth('expense_date', now()->month)
        ->whereYear('expense_date', now()->year)
        ->sum('amount');

        $maintenanceRequests = MaintenanceRequest::where(
            'organization_id',
            $organizationId
        )
        ->whereIn('status', ['pending', 'in_progress'])
        ->count();

        return response()->json([
            'organization' => $user->organization_id,

            'stats' => [
                'properties' => $properties,
                'units' => $units,
                'active_tenants' => $activeTenants,
                'active_leases' => $activeLeases,
                'monthly_revenue' => $monthlyRevenue,
                'monthly_expenses' => $totalExpenses,
                'maintenance_requests' => $maintenanceRequests,
            ],
        ]);
    }
}