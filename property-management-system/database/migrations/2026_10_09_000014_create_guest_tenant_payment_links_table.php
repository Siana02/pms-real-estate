<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'guest_tenant_payment_links';

        // MySQL can retain a table created outside Laravel's migration history.
        // Never drop or recreate that table: it may already contain live payment links.
        if (Schema::hasTable($tableName)) {
            $requiredColumns = [
                'id',
                'organization_id',
                'property_id',
                'unit_id',
                'lease_id',
                'token_hash',
                'token',
                'email_sent_to',
                'last_emailed_at',
                'revoked_at',
                'created_by',
                'created_at',
                'updated_at',
            ];

            $missingColumns = array_values(array_filter(
                $requiredColumns,
                static fn (string $column): bool => ! Schema::hasColumn($tableName, $column),
            ));

            if ($missingColumns !== []) {
                throw new \RuntimeException(
                    'The existing guest_tenant_payment_links table is missing required columns: '
                    . implode(', ', $missingColumns)
                    . '. No changes were made; repair the existing table before rerunning migrations.'
                );
            }

            // The table and its required columns already exist, so let Laravel record
            // this migration instead of failing with "table already exists".
            return;
        }

        Schema::create($tableName, function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lease_id')->unique()->constrained('leases')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->text('token');
            $table->string('email_sent_to')->nullable();
            $table->timestamp('last_emailed_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['organization_id', 'property_id', 'unit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_tenant_payment_links');
    }
};
