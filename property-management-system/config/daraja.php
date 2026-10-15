<?php

return [
    // Safaricom app credentials belong to the MARSWebz platform and are deployment secrets.
    // Never expose these values through manager-facing endpoints or pages.
    'environment' => env('DARAJA_ENVIRONMENT', 'sandbox'),
    'consumer_key' => env('PLATFORM_DARAJA_CONSUMER_KEY', env('DARAJA_CONSUMER_KEY')),
    'consumer_secret' => env('PLATFORM_DARAJA_CONSUMER_SECRET', env('DARAJA_CONSUMER_SECRET')),
];
