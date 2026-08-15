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
    Schema::create('payments', function (Blueprint $table) {
        $table->id();

        $table->foreignId('organization_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->foreignId('lease_id')
            ->constrained()
            ->cascadeOnDelete();

        $table->decimal('amount', 12, 2);

        $table->date('payment_date');

        $table->enum('payment_method', [
            'cash',
            'mpesa',
            'bank_transfer',
            'card',
            'other',
        ]);

        $table->string('reference')->nullable();

        $table->enum('payment_type', [
            'rent',
            'deposit',
            'utility',
            'other',
        ])->default('rent');

        $table->text('notes')->nullable();

        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
