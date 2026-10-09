<?php

return [
    // Consumer keys and secrets are stored encrypted per organization.
    // Only the environment is deployment-configured to avoid mixing sandbox and live endpoints.
    'environment' => env('DARAJA_ENVIRONMENT', 'sandbox'),
];
