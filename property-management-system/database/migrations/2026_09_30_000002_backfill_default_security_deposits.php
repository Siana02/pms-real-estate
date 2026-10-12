<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Older leases were created before the default deposit rule existed.
     * Backfill those zero-value records to one month's unit rent. Managers can
     * subsequently change an individual lease to a different amount, including
     * zero when they explicitly waive the deposit.
     *
     * Use Laravel's query builder so the backfill remains explicit and
     * deterministic on the required MySQL database.
     */
    public function up(): void
    {
        DB::table('leases')
            ->join('units', 'units.id', '=', 'leases.unit_id')
            ->where('leases.deposit_amount', 0)
            ->where('units.monthly_rent', '>', 0)
            ->select('leases.id', 'units.monthly_rent')
            ->orderBy('leases.id')
            ->get()
            ->each(function ($lease) {
                DB::table('leases')
                    ->where('id', $lease->id)
                    ->update(['deposit_amount' => $lease->monthly_rent]);
            });

        DB::table('deposits')
            ->join('leases', 'leases.id', '=', 'deposits.lease_id')
            ->where('deposits.amount_required', 0)
            ->where('leases.deposit_amount', '>', 0)
            ->select('deposits.id', 'leases.deposit_amount')
            ->orderBy('deposits.id')
            ->get()
            ->each(function ($deposit) {
                DB::table('deposits')
                    ->where('id', $deposit->id)
                    ->update([
                        'amount_required' => $deposit->deposit_amount,
                        'status' => DB::raw(
                            'CASE WHEN amount_paid >= ' .
                            (float) $deposit->deposit_amount .
                            ' THEN "paid" ELSE "unpaid" END'
                        ),
                    ]);
            });
    }

    public function down(): void
    {
        // The original zero-value deposits cannot be distinguished safely from
        // deposits a manager may have intentionally changed after this migration.
    }
};
