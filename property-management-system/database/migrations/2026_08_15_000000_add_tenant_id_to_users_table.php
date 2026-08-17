<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `users.role` already exists, so the only missing link is the one between a
 * login and the tenancy record it represents.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'tenant_id')) {
                $table->foreignId('tenant_id')
                    ->nullable()
                    ->after('organization_id')
                    ->constrained('tenants')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'tenant_id')) {
                $table->dropConstrainedForeignId('tenant_id');
            }
        });
    }
};
