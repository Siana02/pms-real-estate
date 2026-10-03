<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // This migration may have partially run before a later schema change failed.
        // Keep the create step safe so an existing table is not recreated.
        if (!Schema::hasTable('maintenance_request_updates')) {
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
        }

        Schema::table('maintenance_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('maintenance_requests', 'availability_start_at')) {
                $table->dateTime('availability_start_at')->nullable()->after('tenant_availability');
            }

            if (!Schema::hasColumn('maintenance_requests', 'availability_end_at')) {
                $table->dateTime('availability_end_at')->nullable()->after('availability_start_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('maintenance_requests', 'availability_start_at')) {
                $columns[] = 'availability_start_at';
            }

            if (Schema::hasColumn('maintenance_requests', 'availability_end_at')) {
                $columns[] = 'availability_end_at';
            }

            if ($columns) {
                $table->dropColumn($columns);
            }
        });

        Schema::dropIfExists('maintenance_request_updates');
    }
};
