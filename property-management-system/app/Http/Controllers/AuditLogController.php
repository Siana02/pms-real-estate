<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Leases;
use App\Models\MaintenanceRequest;
use App\Models\Payment;
use App\Models\PaymentDestination;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Http\Request;
use App\Services\PermissionService;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'audit.view'), 403);

        $logs = AuditLog::with(['actor:id,name,email,role'])
            ->where('organization_id', $request->user()->organization_id)
            ->latest()
            ->paginate(50);

        $logs->getCollection()->transform(function (AuditLog $log) {
            $subject = $this->subjectFor($log);

            return [
                'id' => $log->id,
                'event' => $log->event,
                'description' => $log->description,
                'created_at' => $log->created_at,
                'actor' => $log->actor ? [
                    'id' => $log->actor->id,
                    'name' => $log->actor->name,
                    'email' => $log->actor->email,
                    'role' => $log->actor->role,
                ] : null,
                'subject' => $subject,
                'location' => $subject['location'] ?? null,
                'changes' => $this->changesFor($log),
                'note' => $this->noteFor($log),
            ];
        });

        return response()->json($logs);
    }

    private function subjectFor(AuditLog $log): ?array
    {
        if (!$log->auditable_type || !$log->auditable_id) return null;

        $record = match (class_basename($log->auditable_type)) {
            'Tenant' => Tenant::with(['property', 'unit'])->find($log->auditable_id),
            'MaintenanceRequest' => MaintenanceRequest::with(['property', 'unit', 'tenant'])->find($log->auditable_id),
            'Payment' => Payment::with(['lease.property', 'lease.unit', 'lease.tenant'])->find($log->auditable_id),
            'PaymentDestination' => PaymentDestination::with('property')->find($log->auditable_id),
            'Leases' => Leases::with(['property', 'unit', 'tenant'])->find($log->auditable_id),
            'Property' => Property::find($log->auditable_id),
            'Unit' => Unit::with('property')->find($log->auditable_id),
            default => null,
        };

        if (!$record) return null;

        return match (class_basename($log->auditable_type)) {
            'Tenant' => [
                'type' => 'Tenant',
                'id' => $record->id,
                'label' => trim("{$record->first_name} {$record->last_name}"),
                'location' => $record->property?->name
                    ? $record->property->name . ($record->unit?->unit_number ? " · Unit {$record->unit->unit_number}" : '')
                    : null,
            ],
            'MaintenanceRequest' => [
                'type' => 'Maintenance request',
                'id' => $record->id,
                'label' => $record->title ?: "Maintenance request #{$record->id}",
                'location' => $record->property?->name
                    ? $record->property->name . ($record->unit?->unit_number ? " · Unit {$record->unit->unit_number}" : '')
                    : null,
            ],
            'Payment' => [
                'type' => 'Payment',
                'id' => $record->id,
                'label' => 'Payment ' . ($record->reference ?: "#{$record->id}"),
                'location' => $record->lease?->property?->name
                    ? $record->lease->property->name . ($record->lease->unit?->unit_number ? " · Unit {$record->lease->unit->unit_number}" : '')
                    : null,
            ],
            'PaymentDestination' => [
                'type' => 'Payment destination',
                'id' => $record->id,
                'label' => $record->label ?: ucwords(str_replace('_', ' ', $record->method)),
                'location' => $record->property?->name,
            ],
            'Leases' => [
                'type' => 'Lease',
                'id' => $record->id,
                'label' => $record->tenant
                    ? 'Lease for ' . trim("{$record->tenant->first_name} {$record->tenant->last_name}")
                    : "Lease #{$record->id}",
                'location' => $record->property?->name
                    ? $record->property->name . ($record->unit?->unit_number ? " · Unit {$record->unit->unit_number}" : '')
                    : null,
            ],
            'Property' => [
                'type' => 'Property',
                'id' => $record->id,
                'label' => $record->name,
                'location' => $record->city ?: $record->address,
            ],
            'Unit' => [
                'type' => 'Unit',
                'id' => $record->id,
                'label' => 'Unit ' . $record->unit_number,
                'location' => $record->property?->name,
            ],
            default => null,
        };
    }

    private function changesFor(AuditLog $log): array
    {
        $old = is_array($log->old_values) ? $log->old_values : [];
        $new = is_array($log->new_values) ? $log->new_values : [];

        if (isset($new['updated_fields']) && is_array($new['updated_fields'])) {
            return collect($new['updated_fields'])->map(fn ($field) => [
                'field' => $field,
                'from' => 'Previously recorded',
                'to' => 'Updated',
            ])->values()->all();
        }

        $keys = array_values(array_unique(array_merge(array_keys($old), array_keys($new))));
        return collect($keys)
            ->reject(fn ($key) => in_array($key, ['password', 'remember_token', 'token', 'token_hash', 'raw_token'], true))
            ->map(fn ($key) => [
                'field' => $key,
                'from' => audit_value($old[$key] ?? null),
                'to' => audit_value($new[$key] ?? null),
            ])
            ->values()->take(12)->all();
    }

    private function noteFor(AuditLog $log): ?string
    {
        $new = is_array($log->new_values) ? $log->new_values : [];
        foreach (['note', 'notes', 'reason', 'manager_note'] as $key) {
            if (!empty($new[$key]) && is_string($new[$key])) return $new[$key];
        }
        return null;
    }
}

function audit_value($value): string
{
    if ($value === null || $value === '') return 'Not provided';
    if (is_bool($value)) return $value ? 'Yes' : 'No';
    if (is_array($value)) return implode(', ', array_map('strval', $value));
    return (string) $value;
}
