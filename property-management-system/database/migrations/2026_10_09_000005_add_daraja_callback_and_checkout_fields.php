<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('daraja_integrations', 'callback_token')) {
            Schema::table('daraja_integrations', function (Blueprint $table) {
                $table->text('callback_token')->nullable()->after('webhook_token');
            });
        }

        if (Schema::hasColumn('daraja_stk_checkouts', 'checkout_request_id')) {
            Schema::table('daraja_stk_checkouts', function (Blueprint $table) {
                $table->string('checkout_request_id', 100)->nullable()->change();
            });
        }

        if (!Schema::hasColumn('daraja_stk_checkouts', 'tenant_payment_reference')) {
            Schema::table('daraja_stk_checkouts', function (Blueprint $table) {
                $table->string('tenant_payment_reference', 40)->nullable()->after('account_reference');
            });
        }
        if (!Schema::hasColumn('daraja_stk_checkouts', 'result_code')) {
            Schema::table('daraja_stk_checkouts', function (Blueprint $table) {
                $table->string('result_code', 30)->nullable();
            });
        }
        if (!Schema::hasColumn('daraja_stk_checkouts', 'result_description')) {
            Schema::table('daraja_stk_checkouts', function (Blueprint $table) {
                $table->text('result_description')->nullable();
            });
        }
        if (!Schema::hasColumn('daraja_stk_checkouts', 'completed_at')) {
            Schema::table('daraja_stk_checkouts', function (Blueprint $table) {
                $table->timestamp('completed_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        // Keep payment/audit data intact; rollback is intentionally non-destructive.
    }
};
