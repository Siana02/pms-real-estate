<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Safaricom Daraja environment
    |--------------------------------------------------------------------------
    |
    | App credentials are supplied securely by each organization and stored
    | encrypted in organization_daraja_credentials. Only the environment is
    | configured at deployment level so sandbox and production endpoints are
    | never mixed within one running application.
    */
    'environment' => env('DARAJA_ENVIRONMENT', 'sandbox'),
];
