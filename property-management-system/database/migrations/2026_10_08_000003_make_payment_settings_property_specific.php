<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // This migration may have been interrupted after adding property_id.
        // Keep the steps idempotent enough to recover safely from that state.
        if (! Schema::hasColumn('organization_payment_settings', 'property_id')) {
            Schema::table('organization_payment_settings', function (Blueprint $table) {
                $table->foreignId('property_id')->nullable()->after('organization_id');
            });
        }

        // MySQL may be using the old unique organization_id index to support
        // the existing organization foreign key. Remove that FK first so the
        // old unique index can be replaced by the property-scoped key.
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
        });

        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropUnique('organization_payment_settings_organization_id_unique');
            $table->unique(['organization_id', 'property_id']);
        });

        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->cascadeOnDelete();

            // Only add the property FK if this migration has not already
            // reached that step after a previous partial run.
            $table->foreign('property_id')
                ->references('id')
                ->on('properties')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropForeign(['property_id']);
            $table->dropForeign(['organization_id']);
            $table->dropUnique('organization_payment_settings_organization_id_property_id_unique');
        });

        Schema::table('organization_payment_settings', function (Blueprint $table) {
            $table->dropColumn('property_id');
            $table->unique('organization_id');
            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->cascadeOnDelete();
        });
    }
};
