<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rent_ledger_review_flags', function (Blueprint $table) {
            $table->id();
            $table->string('record_type', 50);
            $table->unsignedBigInteger('record_id');
            $table->string('issue_code', 100);
            $table->text('details');
            $table->string('status', 20)->default('open');
            $table->timestamp('first_flagged_at');
            $table->timestamp('last_flagged_at');
            $table->timestamp('reviewed_at')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();

            $table->unique(
                ['record_type', 'record_id', 'issue_code'],
                'rent_ledger_review_flags_record_issue_unique'
            );
            $table->index(['status', 'last_flagged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rent_ledger_review_flags');
    }
};
