<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_destinations', function (Blueprint $table) {
            $table->string('daraja_shortcode_type', 20)->nullable()->after('details');
            $table->text('daraja_passkey')->nullable()->after('daraja_shortcode_type');
            $table->string('daraja_authorization_status', 40)->default('not_configured')->after('daraja_passkey');
            $table->timestamp('daraja_authorization_checked_at')->nullable()->after('daraja_authorization_status');
            $table->string('account_reference_format', 120)->nullable()->after('daraja_authorization_checked_at');
            $table->string('c2b_registration_status', 40)->default('not_registered')->after('account_reference_format');
            $table->timestamp('c2b_registered_at')->nullable()->after('c2b_registration_status');
            $table->index(['organization_id', 'property_id', 'daraja_authorization_status'], 'payment_dest_daraja_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('payment_destinations', function (Blueprint $table) {
            $table->dropIndex('payment_dest_daraja_status_idx');
            $table->dropColumn([
                'daraja_shortcode_type',
                'daraja_passkey',
                'daraja_authorization_status',
                'daraja_authorization_checked_at',
                'account_reference_format',
                'c2b_registration_status',
                'c2b_registered_at',
            ]);
        });
    }
};
