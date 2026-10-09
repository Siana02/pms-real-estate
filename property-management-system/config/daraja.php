<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform-level Daraja application credentials
    |--------------------------------------------------------------------------
    |
    | These credentials belong to the MARSWebz integration platform, not to
    | any organization or property manager. Configure them in the deployment
    | secret store / environment; never accept them from tenant-facing APIs.
    |
    | A shared app does not itself authorize every merchant shortcode.
    | Merchant authorization must be verified separately before enabling STK.
    */
    'consumer_key' => env('DARAJA_CONSUMER_KEY'),
    'consumer_secret' => env('DARAJA_CONSUMER_SECRET'),
    'environment' => env('DARAJA_ENVIRONMENT', 'sandbox'),
    'platform_enabled' => (bool) env('DARAJA_PLATFORM_ENABLED', false),
];
