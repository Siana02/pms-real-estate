<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->foreignId('property_id')
                ->nullable()
                ->after('organization_id')
                ->constrained()
                ->nullOnDelete();
            $table->foreignId('unit_id')
                ->nullable()
                ->after('property_id')
                ->constrained()
                ->nullOnDelete();
        });

        Schema::table('leases', function (Blueprint $table) {
            $table->date('notice_date')->nullable();
            $table->date('intended_move_out_date')->nullable();
            $table->unsignedTinyInteger('notice_period_months')->default(1);
            $table->boolean('notice_timely')->nullable();
            $table->string('termination_reason')->nullable();
            $table->date('actual_move_out_date')->nullable();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE leases MODIFY status ENUM('upcoming', 'active', 'notice', 'ended', 'terminated') NOT NULL DEFAULT 'upcoming'"
            );
            DB::statement(
                "ALTER TABLE units MODIFY status ENUM('vacant', 'occupied', 'reserved', 'maintenance') NOT NULL DEFAULT 'vacant'"
            );
        }

        Schema::create('deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lease_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount_required', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->date('payment_date')->nullable();
            $table->string('status')->default('unpaid');
            $table->decimal('refundable_amount', 12, 2)->nullable();
            $table->decimal('deductions', 12, 2)->default(0);
            $table->text('deduction_reason')->nullable();
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->date('refund_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deposits');

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE leases MODIFY status ENUM('active', 'ended', 'terminated') NOT NULL DEFAULT 'active'"
            );
            DB::statement(
                "ALTER TABLE units MODIFY status ENUM('vacant', 'occupied', 'maintenance') NOT NULL DEFAULT 'vacant'"
            );
        }

        Schema::table('leases', function (Blueprint $table) {
            $table->dropColumn([
                'notice_date',
                'intended_move_out_date',
                'notice_period_months',
                'notice_timely',
                'termination_reason',
                'actual_move_out_date',
            ]);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('unit_id');
            $table->dropConstrainedForeignId('property_id');
        });
    }
};
