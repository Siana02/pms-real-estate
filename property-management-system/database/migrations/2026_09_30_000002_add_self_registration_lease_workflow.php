<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make self-registration a real pending lease workflow and capture the
     * tenant's proposed tenancy dates. The existing leases row remains the
     * single canonical agreement record.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('employer_name')->nullable()->after('national_id');
            $table->string('employer_phone')->nullable()->after('employer_name');
            $table->string('next_of_kin_name')->nullable()->after('employer_phone');
            $table->string('next_of_kin_phone')->nullable()->after('next_of_kin_name');
        });

        Schema::table('leases', function (Blueprint $table) {
            $table->date('requested_move_in_date')->nullable()->after('start_date');
            $table->date('requested_move_out_date')->nullable()->after('requested_move_in_date');
            $table->date('start_date')->nullable()->change();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE leases MODIFY status ENUM('pending', 'upcoming', 'active', 'notice', 'ended', 'terminated') NOT NULL DEFAULT 'upcoming'"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('leases')
                ->where('status', 'pending')
                ->update([
                    'status' => 'upcoming',
                    'start_date' => DB::raw('COALESCE(requested_move_in_date, CURDATE())'),
                ]);

            DB::statement(
                "ALTER TABLE leases MODIFY status ENUM('upcoming', 'active', 'notice', 'ended', 'terminated') NOT NULL DEFAULT 'upcoming'"
            );
        } else {
            DB::table('leases')
                ->where('status', 'pending')
                ->update([
                    'status' => 'upcoming',
                    'start_date' => DB::raw('COALESCE(requested_move_in_date, date(\'now\'))'),
                ]);
        }

        Schema::table('leases', function (Blueprint $table) {
            $table->date('start_date')->nullable(false)->change();
            $table->dropColumn(['requested_move_in_date', 'requested_move_out_date']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'employer_name',
                'employer_phone',
                'next_of_kin_name',
                'next_of_kin_phone',
            ]);
        });
    }
};
