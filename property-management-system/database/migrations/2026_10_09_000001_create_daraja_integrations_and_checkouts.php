<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daraja_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('environment', 20)->default('sandbox');
            $table->string('shortcode', 20)->index();
            $table->text('callback_token');
            $table->string('shortcode_type', 20)->default('PayBill');
            $table->text('consumer_key');
            $table->text('consumer_secret');
            $table->text('passkey')->nullable();
            $table->boolean('enabled')->default(false);
            $table->timestamp('c2b_registered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('daraja_stk_checkouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lease_id')->constrained('leases')->cascadeOnDelete();
            $table->foreignId('payment_destination_id')->nullable()->constrained('payment_destinations')->nullOnDelete();
            $table->string('checkout_request_id', 100)->nullable()->unique();
            $table->string('merchant_request_id', 100)->nullable();
            $table->string('account_reference', 12);
            $table->string('tenant_payment_reference', 32);
            $table->string('phone', 20);
            $table->decimal('amount', 15, 2);
            $table->string('status', 24)->default('initiated');
            $table->string('result_code', 20)->nullable();
            $table->text('result_description')->nullable();
            $table->string('mpesa_receipt', 30)->nullable()->unique();
            $table->timestamp('completed_at')->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'lease_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daraja_stk_checkouts');
        Schema::dropIfExists('daraja_integrations');
    }
};
