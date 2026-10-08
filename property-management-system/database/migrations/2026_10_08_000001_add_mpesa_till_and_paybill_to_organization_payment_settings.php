<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->text('mpesa_till')->nullable()->after('mpesa_number');
            $table->text('mpesa_paybill')->nullable()->after('mpesa_till');
        });
    }

    public function down(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropColumn(['mpesa_till', 'mpesa_paybill']);
        });
    }
};