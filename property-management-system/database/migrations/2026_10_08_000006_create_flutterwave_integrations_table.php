<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flutterwave_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('secret_key');
            $table->text('webhook_secret')->nullable();
            $table->string('environment')->default('test');
            $table->string('merchant_name')->nullable();
            $table->string('currency', 3)->default('KES');
            $table->timestamp('connected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flutterwave_integrations');
    }
};