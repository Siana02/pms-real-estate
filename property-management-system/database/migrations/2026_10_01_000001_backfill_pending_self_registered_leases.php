<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Repair self-registered tenants created before the canonical pending
     * lease workflow was fully enforced. A pending tenant with a property and
     * unit but no non-terminated lease receives exactly one canonical lease
     * and deposit record.
     */
    public function up(): void
    {
        DB::table('tenants')
            ->where('status', 'pending')
            ->whereNotNull('property_id')
            ->whereNotNull('unit_id')
            ->orderBy('id')
            ->eachById(function ($tenant): void {
                $hasLease = DB::table('leases')
                    ->where('tenant_id', $tenant->id)
                    ->whereNotIn('status', ['ended', 'terminated'])
                    ->exists();

                if ($hasLease) {
                    return;
                }

                $unit = DB::table('units')
                    ->where('id', $tenant->unit_id)
                    ->where('property_id', $tenant->property_id)
                    ->first();

                if ($unit === null) {
                    return;
                }

                $rent = (float) $unit->monthly_rent;
                $organizationName = DB::table('organizations')
                    ->where('id', $tenant->organization_id)
                    ->value('name');
                $propertyName = DB::table('properties')
                    ->where('id', $tenant->property_id)
                    ->value('name');

                $agreement = implode("\n", [
                    'RESIDENTIAL LEASE AGREEMENT — PENDING MANAGER CONFIRMATION',
                    '',
                    'Landlord/Organization: ' . ($organizationName ?? ''),
                    'Property: ' . ($propertyName ?? ''),
                    'Unit: ' . $unit->unit_number,
                    'Tenant: ' . trim($tenant->first_name . ' ' . $tenant->last_name),
                    'Monthly rent: ' . number_format($rent, 2),
                    'Security deposit: ' . number_format($rent, 2),
                    'Requested lease start: Not provided',
                    'Requested lease end: Open-ended / to be confirmed',
                    '',
                    'Terms:',
                    '1. Rent is due on the 5th of each calendar month.',
                    '2. The security deposit is refundable, subject to the condition of the unit at move-out.',
                    '3. The property manager confirms the official lease dates and may adjust rent, deposit and manager terms before final execution.',
                    '4. The tenant may review and sign their side before the manager completes the final signature.',
                    '5. The agreement becomes locked after the manager signs the final reviewed version.',
                ]);

                $leaseId = DB::table('leases')->insertGetId([
                    'organization_id' => $tenant->organization_id,
                    'property_id' => $tenant->property_id,
                    'unit_id' => $tenant->unit_id,
                    'tenant_id' => $tenant->id,
                    'start_date' => null,
                    'requested_move_in_date' => null,
                    'requested_move_out_date' => null,
                    'end_date' => null,
                    'monthly_rent' => $rent,
                    'deposit_amount' => $rent,
                    'status' => 'pending',
                    'manager_terms' => $agreement,
                    'tenant_terms' => $agreement,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('deposits')->insert([
                    'organization_id' => $tenant->organization_id,
                    'lease_id' => $leaseId,
                    'tenant_id' => $tenant->id,
                    'amount_required' => $rent,
                    'amount_paid' => 0,
                    'status' => $rent > 0 ? 'unpaid' : 'not_required',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                if ($unit->status === 'vacant') {
                    DB::table('units')
                        ->where('id', $unit->id)
                        ->update([
                            'status' => 'reserved',
                            'updated_at' => now(),
                        ]);
                }
            });
    }

    public function down(): void
    {
        // Deliberately no destructive rollback: these repaired leases are
        // canonical application data once created.
    }
};
