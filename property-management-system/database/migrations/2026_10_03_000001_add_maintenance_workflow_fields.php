<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->date('scheduled_date')->nullable()->after('assigned_to');
            $table->time('scheduled_time')->nullable()->after('scheduled_date');
            $table->enum('tenant_availability', ['pending', 'confirmed', 'unavailable'])
                ->nullable()
                ->after('scheduled_time');
            $table->enum('cost_responsibility', ['tenant', 'landlord'])
                ->nullable()
                ->after('estimated_cost');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropColumn([
                'scheduled_date',
                'scheduled_time',
                'tenant_availability',
                'cost_responsibility',
            ]);
        });
    }
};
