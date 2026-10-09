# Daraja platform and property onboarding

## Platform credentials

Configure these secrets in the backend deployment environment or secret manager. Do not place them in React/Vite environment variables and do not collect them from property managers.

- `DARAJA_PLATFORM_ENABLED=true` only after the platform credentials and callback HTTPS endpoint are configured.
- `DARAJA_ENVIRONMENT=sandbox` for sandbox, or `production` for live payments.
- `DARAJA_CONSUMER_KEY` and `DARAJA_CONSUMER_SECRET` are the MARSWebz platform Daraja app credentials.

After changing the environment, clear Laravel's cached configuration and restart the backend workers/application. Production callbacks require a public HTTPS `APP_URL`.

## Property merchant configuration

An organization owner/admin configures a PayBill or Till destination on the relevant property. The merchant passkey is encrypted at rest and is never returned in API responses. The platform consumer key/secret are not stored on property records.

A configured shortcode and passkey do not prove Safaricom has authorized the platform app to transact against that merchant. A new or changed merchant configuration therefore enters `awaiting_merchant_authorization` and STK Push stays disabled.

After independently verifying the merchant shortcode, shortcode type, passkey and Safaricom app/merchant authorization for the currently configured environment, an authorized backend operator may run:

```sh
php artisan daraja:mark-destination-ready DESTINATION_ID --confirmed
```

Do not use `--confirmed` just because a manager entered a passkey. The command records that verification was performed externally; it does not grant Safaricom permission.

The destination returns to awaiting verification when the shortcode/type/passkey changes. STK Push is available only when the destination is active, complete, marked ready, and platform credentials are enabled.

## Reference templates

The optional account-reference template supports `{unit}` and `{lease}`, for example `51683/{unit}`. The template must match the merchant's actual account-reference rules. The follow-up C2B reconciliation implementation must normalize and match it without relying on payer phone as the sole identifier.

## Scope note

This stage moves STK initiation to platform-level app credentials and property-level merchant configuration. C2B callback registration and multi-organization routing for a shortcode shared by multiple merchants require a separate safe implementation; they must not be inferred from this STK configuration.
