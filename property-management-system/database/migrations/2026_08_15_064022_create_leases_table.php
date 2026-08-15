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
    Schema::create('leases', function (Blueprint $table) {
        $table->id();

        $table->foreignId('organization_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('property_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('unit_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('tenant_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->date('start_date');
        $table->date('end_date')->nullable();

        $table->decimal('monthly_rent', 12, 2);

        $table->decimal('deposit_amount', 12, 2)
            ->default(0);

        $table->enum('status', [
            'active',
            'ended',
            'terminated',
        ])->default('active');

        $table->text('notes')->nullable();

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leases');
    }
};
