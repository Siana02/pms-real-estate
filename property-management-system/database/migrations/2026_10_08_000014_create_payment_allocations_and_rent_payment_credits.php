<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_allocations')) {
            Schema::create('payment_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
                $table->foreignId('rent_obligation_id')->constrained('rent_obligations')->cascadeOnDelete();
                $table->decimal('amount', 15, 2);
                $table->timestamps();

                $table->unique(
                    ['payment_id', 'rent_obligation_id'],
                    'payment_allocations_payment_obligation_unique'
                );
                $table->index(['rent_obligation_id', 'created_at']);
            });
        }

        if (!Schema::hasTable('rent_payment_credits')) {
            Schema::create('rent_payment_credits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignId('lease_id')->constrained('leases')->cascadeOnDelete();
                $table->foreignId('source_payment_id')->constrained('payments')->cascadeOnDelete();
                $table->decimal('amount', 15, 2);
                $table->decimal('remaining_amount', 15, 2);
                $table->string('status', 20)->default('available');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['lease_id', 'status']);
                $table->index(['tenant_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_payment_credits');
        Schema::dropIfExists('payment_allocations');
    }
};