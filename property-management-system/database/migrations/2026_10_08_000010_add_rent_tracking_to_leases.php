<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->unsignedTinyInteger('rent_due_day')->default(5)->after('monthly_rent');
            $table->unsignedTinyInteger('rent_grace_period_days')->default(0)->after('rent_due_day');
        });
    }

    public function down(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->dropColumn(['rent_due_day', 'rent_grace_period_days']);
        });
    }
};
