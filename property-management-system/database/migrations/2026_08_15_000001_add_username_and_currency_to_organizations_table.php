<?php
 
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
 
/**
 * The organization is the financial boundary, so the currency every amount in
 * the product is expressed in belongs here rather than being hardcoded in the
 * UI. `username` gives the workspace slug the registration form collects a
 * home, and makes `GET /username-available` meaningful.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (! Schema::hasColumn('organizations', 'username')) {
                $table->string('username')->nullable()->unique()->after('name');
            }
 
            if (! Schema::hasColumn('organizations', 'currency')) {
                $table->string('currency', 3)->default('KES')->after('country');
            }
        });
    }
 
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            if (Schema::hasColumn('organizations', 'currency')) {
                $table->dropColumn('currency');
            }
 
            if (Schema::hasColumn('organizations', 'username')) {
                $table->dropUnique(['username']);
                $table->dropColumn('username');
            }
        });
    }
};
 