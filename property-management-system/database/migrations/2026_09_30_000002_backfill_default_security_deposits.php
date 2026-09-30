<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Facades\DB;

return new class extends Migration
{
    /**
     * Older leases were created before the default deposit rule existed.
     * Backfill those zero-value records to one month's unit rent. Managers can
     * subsequently change an individual lease to a different amount, including
     * zero when they explicitly waive the deposit.
     */
    public function up(): void
    {
        DB::statement(
            'UPDATE leases l
             INNER JOIN units u ON u.id = l.unit_id
             SET l.deposit_amount = u.monthly_rent
             WHERE l.deposit_amount = 0
               AND u.monthly_rent > 0'
        );

        DB::statement(
            'UPDATE deposits d
             INNER JOIN leases l ON l.id = d.lease_id
             SET d.amount_required = l.deposit_amount,
                 d.status = CASE
                    WHEN d.amount_paid >= l.deposit_amount THEN "paid"
                    ELSE "unpaid"
                 END
             WHERE d.amount_required = 0
               AND l.deposit_amount > 0'
        );
    }

    public function down(): void
    {
        // The original zero-value deposits cannot be distinguished safely from
        // deposits a manager may have intentionally changed after this migration.
    }
};
