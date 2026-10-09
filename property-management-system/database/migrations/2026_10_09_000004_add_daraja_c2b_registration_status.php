<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daraja_integrations', function (Blueprint $table) {
            $table->timestamp('c2b_registered_at')->nullable()->after('webhook_token');
        });
    }

    public function down(): void
    {
        Schema::table('daraja_integrations', function (Blueprint $table) {
            $table->dropColumn('c2b_registered_at');
        });
    }
};
