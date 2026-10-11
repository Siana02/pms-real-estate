<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('tenants') || ! Schema::hasColumn('users', 'tenant_id')) {
            return;
        }

        // The production database may already have this constraint from the
        // earlier migration. Fresh MySQL installs add it here after tenants exists.
        $constraint = DB::selectOne(
            'SELECT CONSTRAINT_NAME
             FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?',
            ['users', 'users_tenant_id_foreign']
        );

        if (! $constraint) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreign('tenant_id', 'users_tenant_id_foreign')
                    ->references('id')
                    ->on('tenants')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $constraint = DB::selectOne(
            'SELECT CONSTRAINT_NAME
             FROM information_schema.REFERENTIAL_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?',
            ['users', 'users_tenant_id_foreign']
        );

        if ($constraint) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign('users_tenant_id_foreign');
            });
        }
    }
};
