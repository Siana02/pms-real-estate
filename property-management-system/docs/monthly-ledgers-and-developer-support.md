# Monthly rent ledgers and developer support

## Monthly rent ledger email

- Scheduler command: `rent:email-monthly-ledgers`
- Schedule: the 6th of every month at 06:00 Africa/Nairobi.
- Output: one UTF-8 CSV attachment per organization, with every rent obligation through the report month and payment transaction rows recorded through the report cutoff.
- Each rent row includes property, unit, tenant, lease, rent period, due date, amount due, confirmed allocations, outstanding balance, status and days overdue. Transaction rows include provider/receipt references, amount, status and allocation periods.
- The report respects each lease's `rent_due_day` and `rent_grace_period_days`; it does not assume every lease has a fifth-day deadline.
- Recipient: organization email first, then the organization owner's email as a fallback.
- `monthly_rent_ledger_reports` tracks one run per organization/month. A successful report is not sent again on retry unless `--force` is explicitly supplied.
- Reports are read-only except that the existing rent ledger service safely creates any missing obligation for the report month. Existing payments and allocations are not rewritten.
- The command refuses to run unless the active database driver is MySQL.

Manual run / validation:

```sh
php artisan rent:email-monthly-ledgers --period=2026-10
php artisan rent:email-monthly-ledgers --period=2026-10 --organization=123
php artisan rent:email-monthly-ledgers --period=2026-10 --organization=123 --force
php artisan schedule:list
```

The host must run Laravel's scheduler (for example, a cron entry that runs `php artisan schedule:run` every minute). Outbound email must be configured in the deployment environment. `MAIL_FROM_ADDRESS` defaults to `hello@marswebz.com`; `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_MAILER` must match the mailbox provider. No paid email SDK or PDF package is introduced; the report is CSV so it opens in Excel and spreadsheet applications.

## Developer support requests

- Authenticated users submit through `POST /api/developer-support-requests`; support is not blocked by an expired organization subscription.
- The request is stored in `developer_support_requests` before email delivery is attempted. Email status and failure details are stored for the platform-admin queue.
- Notification destination is `DEVELOPER_SUPPORT_EMAIL`, defaulting to `hello@marswebz.com`.
- Platform administrators review tickets at `/platform-admin/support` and can change status, priority and internal notes.
- The floating Need help? widget appears throughout manager, tenant and platform-admin portal pages. The full support page is `/support`.
- WhatsApp link: `https://wa.me/254101907239`.
- The UI describes 30–60 minutes as a response target, not a guaranteed SLA.
