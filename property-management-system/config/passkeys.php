<?php

return [
    'relying_party_id' => env('PASSKEYS_RP_ID', parse_url(config('app.url'), PHP_URL_HOST)),
    'allowed_origins' => array_values(array_filter([
        env('PASSKEYS_ORIGIN', config('app.url')),
        env('FRONTEND_URL'),
    ])),
    'user_handle_secret' => env('PASSKEYS_USER_HANDLE_SECRET', config('app.key')),
    'timeout' => 60000,
    'guard' => 'web',
    'middleware' => ['web'],
    'management_middleware' => ['password.confirm'],
    'throttle' => 'throttle:6,1',
    'redirect' => '/',
];
