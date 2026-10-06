<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->decimal('deposit_amount', 12, 2)
                ->default(0)
                ->after('monthly_rent');
        });

        DB::statement(
            'UPDATE units
             SET deposit_amount = monthly_rent
             WHERE deposit_amount = 0
               AND monthly_rent > 0'
        );
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->dropColumn('deposit_amount');
        });
    }
};
