<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('payment_allocations', 'rent_payment_credit_id')) {
            Schema::table('payment_allocations', function (Blueprint $table) {
                $table->foreignId('rent_payment_credit_id')
                    ->nullable()
                    ->after('payment_id')
                    ->constrained('rent_payment_credits')
                    ->cascadeOnDelete();

                $table->unique(
                    ['rent_payment_credit_id', 'rent_obligation_id'],
                    'payment_allocations_credit_obligation_unique'
                );
            });
        }

        if (Schema::hasColumn('payment_allocations', 'payment_id')) {
            Schema::table('payment_allocations', function (Blueprint $table) {
                $table->foreignId('payment_id')
                    ->nullable()
                    ->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payment_allocations', 'rent_payment_credit_id')) {
            Schema::table('payment_allocations', function (Blueprint $table) {
                $table->dropUnique('payment_allocations_credit_obligation_unique');
                $table->dropForeign(['rent_payment_credit_id']);
                $table->dropColumn('rent_payment_credit_id');
            });
        }

        if (Schema::hasColumn('payment_allocations', 'payment_id')) {
            Schema::table('payment_allocations', function (Blueprint $table) {
                $table->foreignId('payment_id')
                    ->nullable(false)
                    ->change();
            });
        }
    }
};
