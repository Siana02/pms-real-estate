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

The optional account-reference template supports `{unit}` and `{lease}`, for example `51683/{unit}`. The template must match the merchant's actual account-reference rules. The C2B routing service normalizes and evaluates this template per destination and active lease; payer phone is supporting evidence only and is never sufficient for automatic allocation.

## Scope note

The STK configuration and shared C2B registration/routing are separate readiness paths. C2B callbacks can be registered once per shortcode, while C2B merchant authorization and destination-level reconciliation remain independently verified.

## C2B registration and reconciliation

C2B callbacks are registered once per unique `environment + shortcode`, not once per property or organization. The registration record stores an encrypted callback token and a hash used to authenticate incoming callback paths. Do not restore manager-facing per-organization C2B registration: a shared shortcode must have one canonical callback pair for this platform.

C2B authorization is tracked separately from STK readiness. This allows a verified PayBill/Till to receive C2B payments even if its STK passkey has not been configured.

1. Independently verify that the merchant has authorized this integration to receive C2B callbacks.
2. Mark the property destination as C2B-authorized:

   ```sh
   php artisan daraja:mark-c2b-destination-ready DESTINATION_ID --confirmed
   ```

3. Register or re-register the shared shortcode callback URLs:

   ```sh
   php artisan daraja:register-c2b --shortcode=123456
   ```

   Omit `--shortcode` to process all active, verified shortcodes. Use `--force` only when an intentional re-registration is needed.

4. The backend checks every active destination using the shortcode, including destinations that have not completed authorization, before choosing a property. It auto-routes only when the account reference identifies exactly one lease/destination and that destination has verified C2B authorization.
5. Payer phone is supporting evidence only. A missing reference, unknown reference, shared/ambiguous reference, unverified destination, or conflicting receipt is not automatically allocated.

### Review queues

- If a payment can be associated with exactly one organization but its property/lease cannot be identified safely, the PMS creates a `needs_review` transaction in that organization's existing Payment Reconciliation page. A manager must choose a verified destination and a lease in that destination's property.
- If the shortcode/reference could belong to multiple organizations, or the same receipt conflicts with a transaction already in the ledger, the event stays in the platform-wide queue and is not exposed to an arbitrary organization.
- Platform operators can list global review events with:

  ```sh
  php artisan daraja:c2b-review
  ```

- Resolve a global event only after checking the source M-PESA statement/receipt and destination ownership independently:

  ```sh
  php artisan daraja:c2b-review EVENT_ID --destination=DESTINATION_ID --lease=LEASE_ID --confirmed
  ```

The review command checks the destination, shortcode, organization, property, lease dates, candidate destinations, and duplicate receipt conflicts before allocating. A conflicting receipt already assigned to another organization is deliberately not reassigned by this command; investigate it as a potential ledger conflict.

### Idempotency and isolation

C2B events are deduplicated by environment and M-PESA receipt number across shortcodes. A repeated callback cannot create another event. Receipt reuse under a different shortcode, or a C2B callback that conflicts with an existing STK/C2B ledger allocation, is sent to platform review. A manual resolution cannot cross organization or property boundaries.

C2B reference matching accepts either the unique lease payment reference or the destination's configured account-reference template (for example `51683/{unit}`). Templates are evaluated per destination and lease. If two organizations share a shortcode and both templates produce the same reference, the payment remains ambiguous; phone number is never used to choose one of those leases.
