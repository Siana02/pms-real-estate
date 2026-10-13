<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_rent_ledger_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->date('report_period');
            $table->string('status', 24)->default('pending')->index();
            $table->string('recipient_email', 255)->nullable();
            $table->unsignedInteger('rent_rows')->default(0);
            $table->unsignedInteger('payment_rows')->default(0);
            $table->string('file_sha256', 64)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'report_period'], 'monthly_ledger_org_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_rent_ledger_reports');
    }
};
