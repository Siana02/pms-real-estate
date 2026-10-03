<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_request_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')
                ->constrained('maintenance_requests')
                ->cascadeOnDelete();
            $table->string('type')->default('status');
            $table->string('status')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('tenant_read_at')->nullable();
            $table->timestamps();

            $table->index(['maintenance_request_id', 'created_at']);
        });

        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dateTime('availability_start_at')->nullable()->after('tenant_availability');
            $table->dateTime('availability_end_at')->nullable()->after('availability_start_at');
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropColumn(['availability_start_at', 'availability_end_at']);
        });

        Schema::dropIfExists('maintenance_request_updates');
    }
};
