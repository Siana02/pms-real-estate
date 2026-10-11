<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add the tenant link to logins. The tenants table is created later in the
 * migration sequence, so its foreign key is added by a subsequent migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'tenant_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('tenant_id')->nullable()->after('organization_id');
                $table->index('tenant_id', 'users_tenant_id_foreign');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'tenant_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('users_tenant_id_foreign');
                $table->dropColumn('tenant_id');
            });
        }
    }
};
