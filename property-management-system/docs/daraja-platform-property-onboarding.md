# Daraja platform and property onboarding

## Environment and organization credentials

Set `DARAJA_ENVIRONMENT=sandbox` for sandbox or `production` for live payments in the backend environment. Production callbacks require a public HTTPS `APP_URL`.

Each organization owner/admin enters their own Daraja consumer key and consumer secret in payment-destination setup. These credentials are stored once per organization, encrypted at rest, and never returned by the API. The same organization app credentials are used for STK initiation, STK status queries, and C2B URL registration. Merchant shortcode and STK passkey remain destination-specific.

Changing organization credentials resets prior STK and C2B authorization checks. Entering credentials does not prove Safaricom has authorized the app for the merchant; authorization must be independently verified.

## Sandbox STK configuration

Safaricom's documented Lipa Na M-Pesa Online sandbox shortcode is `174379`. Sandbox tests must use that shortcode, the sandbox passkey supplied for the Daraja app, and sandbox OAuth credentials. Do not use a real property PayBill/Till shortcode with sandbox app credentials and assume it represents a real receiving account. The service now rejects non-sandbox merchant shortcodes in sandbox mode before making an STK request or status query. Use a separately verified production configuration for a real merchant destination.

## Recovering an STK checkout with a missing callback

If a checkout remains `pending` because its STK callback was not received, an authorized backend operator can query Safaricom directly using the stored checkout request ID:

```sh
php artisan daraja:query-stk CHECKOUT_ID
```

The command uses the checkout's own payment destination shortcode/passkey and the owning organization's encrypted Daraja app credentials. It does not accept a shortcode, checkout request ID, or credentials supplied by a tenant.

- A definitive non-zero Safaricom `ResultCode` changes the pending checkout to `failed`.
- A successful result without receipt/amount metadata changes the checkout to `needs_review`; it does **not** create a paid payment or rent-ledger entry.
- If Safaricom's callback completes the checkout while the query is in flight, the command preserves the callback's resolved status.
- Network/API errors or non-definitive responses leave the checkout unchanged.

STK Query may confirm the transaction result without returning the M-PESA receipt and amount needed for safe ledger reconciliation. In that case, use the Safaricom receipt/statement and wait for the callback or follow the established manual review process. Never treat the query's success code alone as proof sufficient to create a payment record.

## Reference templates

The optional account-reference template supports `{unit}` and `{lease}`, for example `51683/{unit}`. The template must match the merchant's actual account-reference rules. The C2B routing service normalizes and evaluates this template per destination and active lease; payer phone is supporting evidence only and is never sufficient for automatic allocation.

## Scope note

The STK configuration and shared C2B registration/routing are separate readiness paths. C2B callbacks can be registered once per shortcode, while C2B merchant authorization and destination-level reconciliation remain independently verified.

## C2B registration and reconciliation

C2B callbacks are registered once per unique `environment + shortcode`, not once per property. Registration uses the Daraja app credentials belonging to the organization that owns the selected destination. The registration record stores an encrypted callback token and a hash used to authenticate incoming callback paths. Do not restore manager-facing per-organization C2B registration: a shared shortcode must have one canonical callback pair for this platform.

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
