<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daraja_stk_checkouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('lease_id')->constrained('leases')->cascadeOnDelete();
            $table->foreignId('payment_destination_id')->nullable()->constrained('payment_destinations')->nullOnDelete();
            $table->string('checkout_request_id', 100)->unique();
            $table->string('merchant_request_id', 100)->nullable();
            $table->string('account_reference', 20);
            $table->string('phone', 20);
            $table->decimal('amount', 15, 2);
            $table->string('status', 30)->default('pending');
            $table->string('mpesa_receipt', 40)->nullable()->unique();
            $table->json('callback_payload')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daraja_stk_checkouts');
    }
};
