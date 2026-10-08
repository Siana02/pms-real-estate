<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->foreignId('property_id')->nullable()->after('organization_id');
        });

        // Existing organization-level settings are legacy configuration.
        // New payment destinations are saved against an individual property.
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropUnique('organization_payment_settings_organization_id_unique');
            $table->foreign('property_id')->references('id')->on('properties')->cascadeOnDelete();
            $table->unique(['organization_id', 'property_id']);
        });
    }

    public function down(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropUnique('organization_payment_settings_organization_id_property_id_unique');
            $table->dropForeign(['property_id']);
            $table->dropColumn('property_id');
            $table->unique('organization_id');
        });
    }
};
