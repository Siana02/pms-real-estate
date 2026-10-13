<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('developer_support_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('requester_name', 160);
            $table->string('requester_email', 255)->nullable();
            $table->string('requester_role', 40)->nullable();
            $table->string('category', 40)->default('technical_issue')->index();
            $table->string('subject', 200);
            $table->text('message');
            $table->string('page_url', 1000)->nullable();
            $table->string('status', 24)->default('open')->index();
            $table->string('priority', 24)->default('normal')->index();
            $table->string('email_status', 24)->default('pending')->index();
            $table->timestamp('email_sent_at')->nullable();
            $table->text('email_error')->nullable();
            $table->text('admin_notes')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at'], 'dev_support_org_created_idx');
            $table->index(['status', 'priority', 'created_at'], 'dev_support_queue_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developer_support_requests');
    }
};
