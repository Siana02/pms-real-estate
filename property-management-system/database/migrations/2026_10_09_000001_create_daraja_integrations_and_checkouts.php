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
            $table->string('business_short_code', 20)->unique();
            $table->string('environment', 20)->default('sandbox');
            $table->string('account_type', 20)->default('paybill');
            $table->text('consumer_key');
            $table->text('consumer_secret');
            $table->text('passkey');
            $table->boolean('is_active')->default(true);
            $table->timestamp('c2b_registered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('daraja_stk_checkouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_destination_id')->nullable()->constrained('payment_destinations')->nullOnDelete();
            $table->foreignId('lease_id')->constrained('leases')->cascadeOnDelete();
            $table->string('merchant_request_id', 100)->nullable();
            $table->string('checkout_request_id', 100)->nullable()->unique();
            $table->string('account_reference', 12);
            $table->string('tenant_payment_reference', 32);
            $table->string('phone_number', 20);
            $table->unsignedBigInteger('amount');
            $table->string('status', 24)->default('initiated');
            $table->string('result_code', 20)->nullable();
            $table->text('result_description')->nullable();
            $table->string('mpesa_receipt_number', 30)->nullable()->unique();
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
