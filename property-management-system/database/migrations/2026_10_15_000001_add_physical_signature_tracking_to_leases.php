<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->date('manager_copy_physical_signed_on')->nullable();
            $table->timestamp('manager_copy_physical_confirmed_at')->nullable();
            $table->unsignedBigInteger('manager_copy_physical_confirmed_by')->nullable();
            $table->date('tenant_copy_physical_signed_on')->nullable();
            $table->timestamp('tenant_copy_physical_confirmed_at')->nullable();
            $table->unsignedBigInteger('tenant_copy_physical_confirmed_by')->nullable();
            $table->text('physical_signing_notes')->nullable();

            $table->index(['organization_id', 'manager_copy_physical_confirmed_at'], 'leases_org_manager_physical_signed_idx');
            $table->index(['organization_id', 'tenant_copy_physical_confirmed_at'], 'leases_org_tenant_physical_signed_idx');
        });
    }

    public function down(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->dropIndex('leases_org_manager_physical_signed_idx');
            $table->dropIndex('leases_org_tenant_physical_signed_idx');
            $table->dropColumn([
                'manager_copy_physical_signed_on',
                'manager_copy_physical_confirmed_at',
                'manager_copy_physical_confirmed_by',
                'tenant_copy_physical_signed_on',
                'tenant_copy_physical_confirmed_at',
                'tenant_copy_physical_confirmed_by',
                'physical_signing_notes',
            ]);
        });
    }
};
