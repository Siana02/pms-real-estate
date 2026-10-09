<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_destinations', function (Blueprint $table) {
            $table->string('c2b_authorization_status', 40)->default('not_configured')->after('c2b_registration_status');
            $table->timestamp('c2b_authorization_checked_at')->nullable()->after('c2b_authorization_status');
            $table->index(['organization_id', 'property_id', 'c2b_authorization_status'], 'payment_dest_c2b_auth_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payment_destinations', function (Blueprint $table) {
            $table->dropIndex('payment_dest_c2b_auth_status_idx');
            $table->dropColumn(['c2b_authorization_status', 'c2b_authorization_checked_at']);
        });
    }
};
