<?php

namespace App\Support;

class PlatformSubscriptionTestingBypass
{
    public static function allows(?int $organizationId): bool
    {
        if (!config('platform_subscription.testing_bypass_enabled', false) || !$organizationId) {
            return false;
        }

        $allowedIds = config('platform_subscription.testing_bypass_organization_ids', []);

        return in_array((int) $organizationId, array_map('intval', $allowedIds), true);
    }
}
