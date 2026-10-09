# Guest tenant payment links

Guest payment links let a manager share a lease-specific payment page with a tenant who does not want a PMS account.

## How the links behave

- A link is created for one lease and is bound to that lease's organization, property and unit.
- Repeated manager requests reuse the same link for that lease. The token is encrypted at rest and its SHA-256 hash is used for public lookup.
- The public page exposes only the tenancy details needed to identify the payment destination and accepts M-PESA STK Push requests. It does not expose the tenant's email, phone number, national ID, lease document or payment history.
- The link is accepted only while its lease is current. A lease marked ended/terminated, a future lease, or a lease whose end date has passed makes the link unusable.
- A new lease for a new tenant receives a different token. Revoking a link disables it immediately.
- Public link reads and STK initiation are rate limited. SMS delivery is not implemented.

## Deployment configuration

Set `FRONTEND_URL` to the public origin where the React application is hosted, without a trailing slash. The generated link uses `/guest-payment/{token}`.

Configure a real Laravel mail transport before expecting automatic email delivery. For SMTP, set `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SCHEME` as required by the provider, and `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME`. The sample environment uses `MAIL_MAILER=log`; in that mode the app intentionally reports that the link is ready to copy rather than claiming it was emailed.

## Apply

From `property-management-system`, run:

```sh
php artisan migrate
```

M-PESA STK Push is available only when the property's payment destination and the owning organization's Daraja credentials are configured and verified.
