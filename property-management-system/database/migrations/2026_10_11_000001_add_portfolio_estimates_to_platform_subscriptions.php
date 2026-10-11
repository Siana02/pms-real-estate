<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('platform_subscriptions', function (Blueprint $table) {
            $table->unsignedInteger('estimated_properties_count')->default(0)->after('unit_mix');
            $table->unsignedInteger('estimated_units_count')->default(0)->after('estimated_properties_count');
        });
    }

    public function down(): void
    {
        Schema::table('platform_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['estimated_properties_count', 'estimated_units_count']);
        });
    }
};
