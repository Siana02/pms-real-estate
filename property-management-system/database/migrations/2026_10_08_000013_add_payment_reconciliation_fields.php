<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leases', function (Blueprint $table) {
            $table->string('tenant_payment_reference', 32)->nullable()->unique()->after('tenant_id');
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('payment_destination_id')->nullable()->constrained('payment_destinations')->nullOnDelete();
            $table->string('provider', 50);
            $table->string('external_transaction_id', 100);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('KES');
            $table->string('payer_phone', 30)->nullable();
            $table->string('payment_reference', 255)->nullable();
            $table->dateTime('transaction_at');
            $table->string('status', 30)->default('pending');
            $table->foreignId('matched_lease_id')->nullable()->constrained('leases')->nullOnDelete();
            $table->foreignId('matched_rent_obligation_id')->nullable()->constrained('rent_obligations')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->text('reconciliation_note')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'external_transaction_id']);
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'transaction_at']);
            $table->index(['organization_id', 'payment_reference']);
        });

        DB::table('leases')->whereNull('tenant_payment_reference')->orderBy('id')->eachById(function ($lease) {
            do {
                $reference = 'PMS-' . Str::upper(Str::random(10));
            } while (DB::table('leases')->where('tenant_payment_reference', $reference)->exists());
            DB::table('leases')->where('id', $lease->id)->update(['tenant_payment_reference' => $reference]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::table('leases', function (Blueprint $table) {
            $table->dropUnique(['tenant_payment_reference']);
            $table->dropColumn('tenant_payment_reference');
        });
    }
};
