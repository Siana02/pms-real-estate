<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daraja_c2b_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('environment', 20);
            $table->string('shortcode', 20);
            $table->string('callback_token_hash', 64)->unique();
            $table->text('callback_token');
            $table->string('status', 30)->default('pending');
            $table->timestamp('registered_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();
            $table->unique(['environment', 'shortcode'], 'daraja_c2b_env_shortcode_unique');
        });

        Schema::create('daraja_c2b_events', function (Blueprint $table) {
            $table->id();
            $table->string('environment', 20);
            $table->string('shortcode', 20);
            $table->string('receipt', 40);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('KES');
            $table->string('payer_phone', 30)->nullable();
            $table->string('payment_reference', 255)->nullable();
            $table->dateTime('transaction_at');
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->foreignId('payment_destination_id')->nullable()->constrained('payment_destinations')->nullOnDelete();
            $table->foreignId('payment_transaction_id')->nullable()->constrained('payment_transactions')->nullOnDelete();
            $table->json('candidate_destination_ids')->nullable();
            $table->string('status', 30)->default('received');
            $table->text('review_reason')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
            $table->unique(['environment', 'receipt'], 'daraja_c2b_env_receipt_unique');
            $table->index(['status', 'created_at']);
            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daraja_c2b_events');
        Schema::dropIfExists('daraja_c2b_registrations');
    }
};
