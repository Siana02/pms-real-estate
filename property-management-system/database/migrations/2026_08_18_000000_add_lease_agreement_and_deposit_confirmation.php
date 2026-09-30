<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds the digital lease agreement (auto-populated, dual-signature)
     * fields to `leases`, and the tenant "I paid the deposit" flag to
     * `deposits` so it stays distinct from the manager's official
     * confirmation (which already lives in `deposits.status`).
     */
    public function up(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->text('manager_terms')->nullable()->after('notes');
            $table->text('tenant_terms')->nullable()->after('manager_terms');
            $table->string('manager_signature')->nullable()->after('tenant_terms');
            $table->timestamp('manager_signed_at')->nullable()->after('manager_signature');
            $table->string('tenant_signature')->nullable()->after('manager_signed_at');
            $table->timestamp('tenant_signed_at')->nullable()->after('tenant_signature');
        });

        Schema::table('deposits', function (Blueprint $table) {
            $table->timestamp('tenant_marked_paid_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->dropColumn('tenant_marked_paid_at');
        });

        Schema::table('leases', function (Blueprint $table) {
            $table->dropColumn([
                'manager_terms',
                'tenant_terms',
                'manager_signature',
                'manager_signed_at',
                'tenant_signature',
                'tenant_signed_at',
            ]);
        });
    }
};
