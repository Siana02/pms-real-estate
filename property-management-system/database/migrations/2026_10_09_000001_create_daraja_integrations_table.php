<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daraja_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained('organizations')->cascadeOnDelete();
            $table->string('environment', 20)->default('sandbox');
            $table->string('shortcode', 20);
            $table->string('shortcode_type', 20)->default('PayBill');
            $table->text('consumer_key');
            $table->text('consumer_secret');
            $table->text('passkey')->nullable();
            $table->boolean('enabled')->default(false);
            $table->timestamps();
            $table->unique('shortcode', 'daraja_integrations_shortcode_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daraja_integrations');
    }
};
