<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'maintenance_updates_request_created_idx';

    public function up(): void
    {
        if (! Schema::hasTable('maintenance_request_updates')) {
            return;
        }

        $indexRows = DB::select(
            'SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
             ORDER BY INDEX_NAME, SEQ_IN_INDEX',
            ['maintenance_request_updates']
        );

        $indexes = [];
        foreach ($indexRows as $row) {
            $indexes[$row->INDEX_NAME][] = $row->COLUMN_NAME;
        }

        foreach ($indexes as $columns) {
            if ($columns === ['maintenance_request_id', 'created_at']) {
                return;
            }
        }

        Schema::table('maintenance_request_updates', function (Blueprint $table) {
            $table->index(['maintenance_request_id', 'created_at'], self::INDEX_NAME);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('maintenance_request_updates')) {
            return;
        }

        $exists = DB::selectOne(
            'SELECT INDEX_NAME
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ?
             LIMIT 1',
            ['maintenance_request_updates', self::INDEX_NAME]
        );

        if ($exists) {
            Schema::table('maintenance_request_updates', function (Blueprint $table) {
                $table->dropIndex(self::INDEX_NAME);
            });
        }
    }
};
