<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('status')->default('paid')->after('payment_method');
            $table->string('provider')->nullable()->after('status');
            $table->string('provider_transaction_id')->nullable()->after('provider');
            $table->string('tx_ref')->nullable()->unique()->after('provider_transaction_id');
            $table->string('receipt_url')->nullable()->after('tx_ref');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['tx_ref']);
            $table->dropColumn(['status', 'provider', 'provider_transaction_id', 'tx_ref', 'receipt_url']);
        });
    }
};