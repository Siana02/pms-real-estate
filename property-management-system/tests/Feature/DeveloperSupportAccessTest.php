<?php

namespace Tests\Feature;

use Tests\TestCase;

class DeveloperSupportAccessTest extends TestCase
{
    public function test_support_request_submission_requires_an_authenticated_portal_user(): void
    {
        $this->postJson('/api/developer-support-requests', [
            'category' => 'other',
            'subject' => 'A technical problem',
            'message' => 'Something is not working as expected on this page.',
        ])->assertUnauthorized();
    }

    public function test_support_notification_status_requires_authentication(): void
    {
        $this->patchJson('/api/developer-support-requests/1/notification-status', [
            'provider' => 'formspree',
            'status' => 'sent',
        ])->assertUnauthorized();
    }

    public function test_platform_admin_support_queue_requires_authentication(): void
    {
        $this->getJson('/api/platform-admin/developer-support-requests')
            ->assertUnauthorized();
    }
}
