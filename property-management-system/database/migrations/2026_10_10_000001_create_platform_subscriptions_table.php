<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('plan_code', 30);
            $table->string('status', 30)->default('pending_payment');
            $table->string('billing_cycle', 20)->default('monthly');
            $table->unsignedInteger('billable_units')->default(0);
            $table->decimal('monthly_amount', 12, 2)->default(0);
            $table->json('pricing_overrides')->nullable();
            $table->json('unit_mix')->nullable();
            $table->timestamp('current_period_starts_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('last_payment_at')->nullable();
            $table->foreignId('selected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('platform_subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_subscription_id')->constrained('platform_subscriptions')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('method', 30)->default('mpesa_till');
            $table->string('reference', 120)->nullable();
            $table->string('status', 30)->default('pending_verification');
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_subscription_payments');
        Schema::dropIfExists('platform_subscriptions');
    }
};
