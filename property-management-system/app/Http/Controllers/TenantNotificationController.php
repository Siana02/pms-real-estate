<?php

namespace App\Http\Controllers;

use App\Models\Leases as Lease;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
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

        foreach (MaintenanceRequest::where('tenant_id', $tenant->id)->orderByDesc('updated_at')->limit(10)->get() as $item) {
            $notifications[] = [
                'id' => 'request-' . $item->id . '-' . $item->status . '-' . optional($item->updated_at)->timestamp,
                'type' => 'maintenance_update',
                'title' => $item->title . ' is now ' . $this->statusLabel($item->status),
                'body' => $this->maintenanceBody($item),
                'created_at' => optional($item->updated_at)->toIso8601String(),
                'read_at' => $item->status === 'completed' ? optional($item->updated_at)->toIso8601String() : null,
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

    private function maintenanceBody(MaintenanceRequest $item): ?string
    {
        $parts = [];
        if ($item->assigned_to) $parts[] = $item->assigned_to . ' is handling this request.';
        if ($item->scheduled_date) {
            $when = CarbonImmutable::parse($item->scheduled_date)->format('D, j M Y');
            if ($item->scheduled_time) $when .= ' at ' . CarbonImmutable::createFromFormat('H:i:s', $item->scheduled_time)->format('g:i A');
            $parts[] = 'Visit scheduled for ' . $when . '.';
        }
        if ($item->tenant_availability === 'confirmed') $parts[] = 'You confirmed that you will be available.';
        if ($item->tenant_availability === 'unavailable') $parts[] = 'You marked the scheduled time as unavailable.';
        return $parts ? implode(' ', $parts) : null;
    }
}
