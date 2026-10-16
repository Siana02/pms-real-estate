<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_subscription_mpesa_events', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_id', 64)->unique();
            $table->string('shortcode', 20)->index();
            $table->decimal('amount', 12, 2);
            $table->string('bill_reference', 64)->nullable()->index();
            $table->string('phone', 20)->nullable();
            $table->timestamp('transaction_at')->nullable();
            $table->foreignId('platform_subscription_payment_id')->nullable()
                ->constrained('platform_subscription_payments')->nullOnDelete();
            $table->string('status', 32)->default('unmatched')->index();
            $table->json('raw_payload')->nullable();
            $table->timestamp('matched_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_subscription_mpesa_events');
    }
};
