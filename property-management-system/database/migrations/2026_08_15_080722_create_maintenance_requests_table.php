<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
{
    Schema::create('maintenance_requests', function (Blueprint $table) {
        $table->id();

        $table->foreignId('organization_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('property_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('unit_id')
            ->nullable()
            ->constrained()
            ->nullOnDelete();

        $table->foreignId('tenant_id')
            ->nullable()
            ->constrained()
            ->nullOnDelete();

        $table->string('title');

        $table->text('description');

        $table->enum('priority', [
            'low',
            'medium',
            'high',
            'urgent',
        ])->default('medium');

        $table->enum('status', [
            'open',
            'in_progress',
            'completed',
            'cancelled',
        ])->default('open');

        $table->string('assigned_to')->nullable();

        $table->decimal('estimated_cost', 12, 2)->nullable();

        $table->decimal('actual_cost', 12, 2)->nullable();

        $table->date('reported_date');

        $table->date('completed_date')->nullable();

        $table->text('notes')->nullable();

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_requests');
    }
};
