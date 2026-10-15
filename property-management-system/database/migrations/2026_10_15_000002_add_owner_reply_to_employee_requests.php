<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_requests', function (Blueprint $table) {
            $table->text('owner_reply')->nullable();
            $table->unsignedBigInteger('replied_by')->nullable()->index();
            $table->timestamp('replied_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('employee_requests', function (Blueprint $table) {
            $table->dropColumn(['owner_reply', 'replied_by', 'replied_at']);
        });
    }
};
