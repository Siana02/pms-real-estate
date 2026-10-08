<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('rent_obligation_id')
                ->nullable()
                ->after('lease_id')
                ->constrained('rent_obligations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['rent_obligation_id']);
            $table->dropColumn('rent_obligation_id');
        });
    }
};
