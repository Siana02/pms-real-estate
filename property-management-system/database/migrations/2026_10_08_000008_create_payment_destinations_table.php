<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_destinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->string('method', 50);
            $table->string('label')->nullable();
            $table->json('details');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'property_id', 'is_active']);
        });

        $legacy = DB::table('organization_payment_settings')->get();

        foreach ($legacy as $settings) {
            if (!$settings->property_id || !$settings->preferred_method) {
                continue;
            }

            $details = match ($settings->preferred_method) {
                'mpesa_number' => ['number' => $settings->mpesa_number],
                'mpesa_till' => ['till' => $settings->mpesa_till],
                'mpesa_paybill' => [
                    'paybill' => $settings->mpesa_paybill,
                    'account' => $settings->mpesa_paybill_account,
                ],
                'bank' => [
                    'bank_name' => $settings->bank_name,
                    'account_name' => $settings->bank_account_name,
                    'account_number' => $settings->bank_account_number,
                    'branch' => $settings->bank_branch,
                ],
                default => null,
            };

            if ($details === null) {
                continue;
            }

            DB::table('payment_destinations')->insert([
                'organization_id' => $settings->organization_id,
                'property_id' => $settings->property_id,
                'method' => $settings->preferred_method,
                'label' => null,
                'details' => json_encode($details),
                'is_active' => true,
                'created_at' => $settings->created_at ?? now(),
                'updated_at' => $settings->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_destinations');
    }
};