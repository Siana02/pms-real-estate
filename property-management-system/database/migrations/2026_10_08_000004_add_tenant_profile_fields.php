<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'profile_photo_path')) {
                $table->string('profile_photo_path')->nullable()->after('phone');
            }
            if (! Schema::hasColumn('tenants', 'residential_address')) {
                $table->text('residential_address')->nullable()->after('national_id');
            }
            if (! Schema::hasColumn('tenants', 'postal_address')) {
                $table->string('postal_address')->nullable()->after('residential_address');
            }
            if (! Schema::hasColumn('tenants', 'nationality')) {
                $table->string('nationality', 100)->nullable()->after('postal_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            foreach (['profile_photo_path', 'residential_address', 'postal_address', 'nationality'] as $column) {
                if (Schema::hasColumn('tenants', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
