<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Remove legacy implementation-level CRUD entries from the
        // organization-facing audit history. Business events now replace
        // these messages with human-readable activity.
        DB::table('audit_logs')
            ->whereIn('description', [
                'User created.',
                'User updated.',
                'User deleted.',
                'Tenant created.',
                'Tenant updated.',
                'Tenant deleted.',
                'Leases created.',
                'Leases updated.',
                'Leases deleted.',
                'Deposit created.',
                'Deposit updated.',
                'Deposit deleted.',
            ])
            ->delete();
    }

    public function down(): void
    {
        // Legacy generic entries cannot be reconstructed faithfully.
    }
};
