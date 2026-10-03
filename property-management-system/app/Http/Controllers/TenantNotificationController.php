<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\MaintenanceRequestUpdate;
use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class TenantNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $notifications = [];
        $leaseIds = Lease::where('tenant_id', $tenant->id)->pluck('id');

        foreach (Payment::whereIn('lease_id', $leaseIds)->orderByDesc('created_at')->limit(5)->get() as $payment) {
            $notifications[] = [
                'id' => 'payment-' . $payment->id,
                'type' => 'payment_received',
                'title' => 'Payment received — ' . number_format((float) $payment->amount),
                'body' => $payment->reference ? 'Reference ' . $payment->reference . '.' : null,
                'created_at' => optional($payment->created_at)->toIso8601String() ?? (string) $payment->payment_date,
                'read_at' => optional($payment->created_at)->toIso8601String(),
            ];
        }

        $updates = MaintenanceRequestUpdate::whereHas('maintenanceRequest', fn ($query) => $query->where('tenant_id', $tenant->id))
            ->with('maintenanceRequest')
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        foreach ($updates as $update) {
            $item = $update->maintenanceRequest;
            $notifications[] = [
                'id' => 'maintenance-update-' . $update->id,
                'type' => 'maintenance_update',
                'maintenance_request_id' => $item?->id,
                'title' => $item?->title ?? 'Maintenance update',
                'status' => $update->status,
                'status_label' => $this->statusLabel($update->status),
                'body' => $update->message,
                'created_at' => optional($update->created_at)->toIso8601String(),
                'read_at' => optional($update->tenant_read_at)->toIso8601String(),
            ];
        }

        usort($notifications, fn (array $a, array $b) => strcmp((string) $b['created_at'], (string) $a['created_at']));
        return response()->json(['data' => array_values($notifications)]);
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

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'in_progress' => 'in progress',
            'completed' => 'resolved',
            'cancelled' => 'closed',
            default => 'received',
        };
    }
}
