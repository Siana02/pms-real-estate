# Subscription testing exception for ABC Properties / ABC Enterprises

The repository already contains a narrowly scoped backend subscription override. The test organization is organization ID **1**. If the same organization has been renamed from ABC Properties to ABC Enterprises, the ID-based allowlist continues to apply.

## Enable on the test backend only

Set these variables in the **Laravel backend hosting environment**:

```dotenv
PLATFORM_SUBSCRIPTION_TEST_BYPASS_ENABLED=true
PLATFORM_SUBSCRIPTION_TEST_BYPASS_ORGANIZATION_IDS=1
```

Then redeploy/restart the backend and clear cached Laravel configuration if the deployment uses config caching:

```sh
php artisan config:clear
php artisan config:cache
```

If environment variables are managed by the hosting dashboard, change them there rather than committing them to Git. Frontend-only changes are not sufficient: the backend middleware must receive the allowlist too.

The bypass leaves the subscription record and billing state unchanged. It only grants access to the configured organization ID and reports `access_override: true` to the portal guard. Other organizations continue to follow their paid plan and subscription state.

## Public launch safety

Before public launch, set `PLATFORM_SUBSCRIPTION_TEST_BYPASS_ENABLED=false` and clear `PLATFORM_SUBSCRIPTION_TEST_BYPASS_ORGANIZATION_IDS` in production. Do not enable the bypass globally or add customer organization IDs to the allowlist.

## If “Subscription status unavailable” still appears

That screen means the browser could not get a successful response from `/api/platform-subscription/status`; it is not the normal inactive-subscription screen. Check the backend's availability, authentication response, and application logs. The bypass does not turn a database outage or failed HTTP request into a successful status response. The updated UI displays an HTTP response code when one is returned and offers retry, subscription settings for owners, and support.
