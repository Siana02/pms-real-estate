<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daraja_callback_monitoring_events', function (Blueprint $table) {
            $table->id();
            $table->string('environment', 20);
            $table->string('shortcode', 32)->index();
            $table->string('receipt', 100)->nullable()->index();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->unsignedBigInteger('payment_destination_id')->nullable()->index();
            $table->unsignedBigInteger('c2b_event_id')->nullable()->index();
            $table->string('source', 40)->default('c2b_confirmation');
            $table->string('delivery_status', 24)->default('received');
            $table->string('processing_status', 24)->default('pending');
            $table->timestamp('transaction_at')->nullable();
            $table->timestamp('received_at');
            $table->unsignedInteger('latency_seconds')->nullable();
            $table->boolean('is_delayed')->default(false);
            $table->string('error_code', 100)->nullable();
            $table->text('error_message')->nullable();
            $table->text('recovery_notes')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->string('statement_fingerprint', 64)->nullable()->index();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'received_at'], 'daraja_monitor_org_received_idx');
            $table->index(['delivery_status', 'processing_status', 'received_at'], 'daraja_monitor_status_received_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daraja_callback_monitoring_events');
    }
};
