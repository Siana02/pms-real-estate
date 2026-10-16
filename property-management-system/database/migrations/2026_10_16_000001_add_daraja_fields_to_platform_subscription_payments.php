<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('platform_subscription_payments', function (Blueprint $table) {
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('merchant_request_id')->nullable();
            $table->string('mpesa_receipt')->nullable()->unique();
            $table->string('phone', 20)->nullable();
            $table->json('callback_payload')->nullable();
            $table->string('result_description', 1000)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('platform_subscription_payments', function (Blueprint $table) {
            $table->dropUnique(['checkout_request_id']);
            $table->dropUnique(['mpesa_receipt']);
            $table->dropColumn([
                'checkout_request_id', 'merchant_request_id', 'mpesa_receipt',
                'phone', 'callback_payload', 'result_description',
            ]);
        });
    }
};
