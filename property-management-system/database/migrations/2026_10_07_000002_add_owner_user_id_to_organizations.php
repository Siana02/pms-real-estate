<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->foreignId('owner_user_id')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->nullOnDelete();
        });

        // Existing organizations were created with their first manager/admin
        // as the organization owner. Preserve that relationship explicitly.
        DB::table('organizations')
            ->whereNull('owner_user_id')
            ->orderBy('id')
            ->eachById(function ($organization) {
                $ownerId = DB::table('users')
                    ->where('organization_id', $organization->id)
                    ->whereIn('role', ['admin', 'owner'])
                    ->orderBy('id')
                    ->value('id');

                if ($ownerId) {
                    DB::table('organizations')
                        ->where('id', $organization->id)
                        ->update(['owner_user_id' => $ownerId]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['owner_user_id']);
            $table->dropColumn('owner_user_id');
        });
    }
};
