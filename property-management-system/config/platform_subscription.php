<?php

return [
    // A narrowly scoped testing exception. Disabled unless explicitly enabled
    // in the deployment environment and restricted to listed organization IDs.
    'testing_bypass_enabled' => (bool) env('PLATFORM_SUBSCRIPTION_TEST_BYPASS_ENABLED', false),
    'testing_bypass_organization_ids' => array_values(array_filter(array_map(
        'intval',
        explode(',', (string) env('PLATFORM_SUBSCRIPTION_TEST_BYPASS_ORGANIZATION_IDS', ''))
    ), fn (int $id): bool => $id > 0)),
];
