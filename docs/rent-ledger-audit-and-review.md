# Rent-ledger audit and manager review

## Safety contract

- The audit is read-only against payments, provider transactions, payment allocations, rent credits, leases and rent obligations. It writes only findings to `rent_ledger_review_flags`.
- `php artisan rent:ledger-audit` reports the active Laravel database driver and database name, and refuses to run unless the active driver is MySQL. Check this output against the intended environment before relying on a production result.
- The migration `2026_10_12_000001_create_rent_ledger_review_flags_table.php` creates only the review-flag table and its indexes. It does not rewrite historical ledger rows.
- A clean audit means no issue covered by the current checks was detected. It is not proof that every external bank statement or M-PESA statement has been independently verified.
- Review decisions never edit ledger amounts. A flag that is found again by a later audit is reopened.

## Run safely

1. Confirm the application is pointed at the intended MySQL host/database using the deployment's protected environment configuration. Never paste credentials into tickets or logs.
2. Run `php artisan migrate:status` and confirm `2026_10_12_000001_create_rent_ledger_review_flags_table` is marked as run.
3. Run `php artisan rent:ledger-audit`. Verify the printed `driver=mysql` and database name are the intended target before interpreting PASS/REVIEW REQUIRED.
4. Export or otherwise retain the command output in the deployment/change record. The audit persists new or refreshed flags but does not resolve stale flags automatically.
5. Review findings in **Payment Reconciliation → Rent ledger integrity review**.

## Manager review procedure

For each open flag:

1. Open the underlying payment, provider transaction, allocation, rent credit, lease or rent obligation.
2. Compare the receipt/provider transaction ID, destination/shortcode, amount, transaction date and account reference with the trusted M-PESA/provider statement and the relevant lease.
3. Reconcile the payment amount in integer cents against direct month allocations and original rent credit. Check the credit's remaining balance and the rent obligation's paid/balance figures. Confirm the lease, property, unit, tenant and organization all agree.
4. Do not guess which tenant or month should receive money. Do not edit/delete a confirmed payment to make the warning disappear. Escalate unclear ownership, conflicting receipts or historical allocation questions through the approved accounting process.
5. If a correction is authorized, perform it only through a separately reviewed and audited correction procedure. The review panel itself never changes ledger data.
6. Enter notes describing the evidence checked, decision, approver/ticket if applicable, and any separately completed correction. Then record the review decision.
7. Run the audit again after the separately authorized correction. If the underlying issue remains, the audit will reopen the flag. Marking a flag reviewed is an accountability record, not proof that the underlying data was automatically fixed.

## Callback idempotency

MySQL unique keys protect one payment transaction per organization/provider/external receipt and one C2B event per environment/receipt. The reconciliation service also locks the transaction row and re-checks terminal status before allocation. Regression tests exercise repeated C2B callback delivery, repeated provider ingestion/reconciliation, and the presence of the MySQL uniqueness constraints. Production-like parallel callback testing should still be performed against an isolated MySQL staging database before enabling live collections.
