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