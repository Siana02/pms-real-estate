<?php

namespace Tests\Unit;

use App\Support\PlatformSubscriptionTestingBypass;
use Tests\TestCase;

class PlatformSubscriptionTestingBypassTest extends TestCase
{
    public function test_bypass_is_disabled_by_default(): void
    {
        config([
            'platform_subscription.testing_bypass_enabled' => false,
            'platform_subscription.testing_bypass_organization_ids' => [7],
        ]);

        $this->assertFalse(PlatformSubscriptionTestingBypass::allows(7));
    }

    public function test_bypass_only_applies_to_explicitly_allowlisted_organizations(): void
    {
        config([
            'platform_subscription.testing_bypass_enabled' => true,
            'platform_subscription.testing_bypass_organization_ids' => [7, 12],
        ]);

        $this->assertTrue(PlatformSubscriptionTestingBypass::allows(7));
        $this->assertTrue(PlatformSubscriptionTestingBypass::allows(12));
        $this->assertFalse(PlatformSubscriptionTestingBypass::allows(8));
        $this->assertFalse(PlatformSubscriptionTestingBypass::allows(null));
    }
}
