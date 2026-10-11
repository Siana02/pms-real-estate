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

        $indexes = DB::select(
            'SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR \,\') AS columns_list
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
             GROUP BY INDEX_NAME',
            ['maintenance_request_updates']
        );

        foreach ($indexes as $index) {
            if ($index->columns_list === 'maintenance_request_id,created_at') {
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
