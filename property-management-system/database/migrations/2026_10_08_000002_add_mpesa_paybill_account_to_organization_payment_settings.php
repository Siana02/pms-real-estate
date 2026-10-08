<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->text('mpesa_paybill_account')->nullable()->after('mpesa_paybill');
        });
    }

    public function down(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropColumn('mpesa_paybill_account');
        });
    }
};
