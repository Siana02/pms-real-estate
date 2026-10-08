<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rent_obligations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lease_id')->constrained('leases')->cascadeOnDelete();
            $table->date('period');
            $table->date('due_date');
            $table->decimal('amount_due', 12, 2);
            $table->timestamps();

            $table->unique(['lease_id', 'period']);
            $table->index(['organization_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_obligations');
    }
};
