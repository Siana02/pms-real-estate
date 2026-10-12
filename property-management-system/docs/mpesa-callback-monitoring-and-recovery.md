# M-Pesa callback monitoring and missed-payment recovery

## What the monitor can and cannot prove

The monitor records authenticated C2B callback attempts after the callback registration token is validated. It stores the shortcode, receipt, transaction time, received time, observed latency, processing outcome and bounded error details. A callback is marked delayed when it reaches the application more than five minutes after the transaction timestamp.

The latest callback time is a heartbeat, not proof that every payment was delivered. Safaricom can complete a payment even when no callback URL is registered or a notification cannot reach the application. Operators must compare the monitor with the official M-Pesa organization statement.

## Recovery using an official statement

1. Download the relevant transaction statement from the merchant's official M-Pesa organization portal.
2. Verify the merchant shortcode, transaction receipt, amount, timestamp and account reference against that source. Do not upload screenshots, edited amounts, or tenant-submitted SMS text as a merchant statement.
3. Map the verified rows to a CSV with these exact headers: `TransID,TransTime,TransAmount,BusinessShortCode,BillRefNumber,MSISDN`. The `MSISDN` column is optional. `TransTime` must be in Safaricom's `YYYYMMDDHHmmss` format. Keep the uploaded rows within the declared statement period.
4. In Payment Reconciliation → M-Pesa callback monitoring & recovery, upload the CSV, declare the statement period, attest that it was checked against the official statement, and write the evidence/reason for recovery.
5. Review the result counts. A uniquely matched transaction is routed through the existing reconciliation service. Missing/ambiguous references, an unverified destination, conflicting receipt details, or an incomplete prior ledger entry stay in review. Rejected rows are recorded in the monitoring queue when receipt and shortcode are available.
6. Check the transaction in Incoming transactions and compare its receipt, amount, destination, lease and rent-month allocations against the source statement.

The import is not a direct Safaricom API call. It is a controlled statement-reconciliation workflow. The supported Safaricom Transaction Status API is asynchronous and requires a receipt or original conversation ID plus merchant initiator/security credentials; the current organization credential model stores Daraja consumer key/secret only, so automated status-query requests are not enabled by this change.

## Idempotency and ledger safety

- C2B events are keyed by environment and receipt; provider transactions are keyed by organization, provider and external receipt in MySQL.
- Statement recovery calls the same routing and reconciliation service as a live C2B callback. It does not insert payments or allocations directly.
- Repeated statement rows or callback deliveries reuse the existing event/transaction. Conflicting data remains in review.
- Rent allocations continue to apply to the oldest outstanding obligations first; overpayment is retained as rent credit.
- The monitor and review queue are additive. No existing payment, allocation, credit, lease or obligation is rewritten or deleted.

## Operational checks

- Confirm the actual production confirmation URL is publicly reachable over HTTPS and registered against the merchant shortcode.
- Verify the correct production Daraja environment and merchant authorization before relying on callback delivery.
- Review delayed and failed events, and compare statement periods regularly.
- Run tests against MySQL and perform a production-like staging exercise with a real merchant-authorized callback before live collections.
