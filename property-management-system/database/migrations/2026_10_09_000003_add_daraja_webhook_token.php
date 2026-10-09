<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daraja_integrations', function (Blueprint $table) {
            $table->text('webhook_token')->nullable()->after('passkey');
        });
    }

    public function down(): void
    {
        Schema::table('daraja_integrations', function (Blueprint $table) {
            $table->dropColumn('webhook_token');
        });
    }
};
