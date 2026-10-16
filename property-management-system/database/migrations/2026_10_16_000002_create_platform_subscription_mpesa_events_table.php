<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('platform_subscription_mpesa_events')) {
            Schema::create('platform_subscription_mpesa_events', function (Blueprint $table) {
                $table->id();
                $table->string('transaction_id', 64)->unique();
                $table->string('shortcode', 20)->index();
                $table->decimal('amount', 12, 2);
                $table->string('bill_reference', 64)->nullable()->index();
                $table->string('phone', 20)->nullable();
                $table->timestamp('transaction_at')->nullable();
                // Use a short explicit foreign-key name to stay below MySQL's 64-char limit.
                $table->unsignedBigInteger('platform_subscription_payment_id')->nullable();
                $table->string('status', 32)->default('unmatched')->index();
                $table->json('raw_payload')->nullable();
                $table->timestamp('matched_at')->nullable();
                $table->timestamps();
            });
        }

        // Also recover safely if an earlier MySQL attempt created the table but
        // failed while adding Laravel's automatically generated (overlong) FK name.
        $foreignKeyExists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', 'platform_subscription_mpesa_events')
            ->where('CONSTRAINT_NAME', 'psme_payment_fk')
            ->where('CONSTRAINT_TYPE', 'FOREIGN KEY')
            ->exists();
        if (!$foreignKeyExists) {
            Schema::table('platform_subscription_mpesa_events', function (Blueprint $table) {
                $table->foreign('platform_subscription_payment_id', 'psme_payment_fk')
                    ->references('id')->on('platform_subscription_payments')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_subscription_mpesa_events');
    }
};
