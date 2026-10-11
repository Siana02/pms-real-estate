<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'guest_pay_links_org_property_unit_idx';

    public function up(): void
    {
        if (! Schema::hasTable('guest_tenant_payment_links')) {
            return;
        }

        $indexRows = DB::select(
            'SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
             ORDER BY INDEX_NAME, SEQ_IN_INDEX',
            ['guest_tenant_payment_links']
        );

        $indexes = [];
        foreach ($indexRows as $row) {
            $indexes[$row->INDEX_NAME][] = $row->COLUMN_NAME;
        }

        foreach ($indexes as $columns) {
            if ($columns === ['organization_id', 'property_id', 'unit_id']) {
                return;
            }
        }

        Schema::table('guest_tenant_payment_links', function (Blueprint $table) {
            $table->index(['organization_id', 'property_id', 'unit_id'], self::INDEX_NAME);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('guest_tenant_payment_links')) {
            return;
        }

        $exists = DB::selectOne(
            'SELECT INDEX_NAME
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?
             LIMIT 1',
            ['guest_tenant_payment_links', self::INDEX_NAME]
        );

        if ($exists) {
            Schema::table('guest_tenant_payment_links', function (Blueprint $table) {
                $table->dropIndex(self::INDEX_NAME);
            });
        }
    }
};
