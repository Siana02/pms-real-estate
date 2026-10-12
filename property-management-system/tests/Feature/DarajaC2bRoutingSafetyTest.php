<?php

namespace Tests\Feature;

use App\Models\DarajaC2bRegistration;
use App\Models\DarajaC2bEvent;
use App\Models\DarajaCallbackMonitoringEvent;
use App\Models\PaymentTransaction;
use App\Models\Payment;
use App\Models\RentPaymentCredit;
use App\Services\DarajaC2bRoutingService;
use App\Services\PaymentReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DarajaC2bRoutingSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_shortcode_with_distinct_reference_templates_identifies_one_property(): void
    {
        $first = $this->createDestinationAndLease('First Properties', 'first@example.test', '51683/{unit}');
        $this->createDestinationAndLease('Second Properties', 'second@example.test', '99872/{unit}');

        $result = app(DarajaC2bRoutingService::class)->findMatches(
            '123456',
            '51683/18',
            CarbonImmutable::parse('2026-10-09')
        );

        $this->assertCount(2, $result['destinations'], 'Both organizations share the shortcode and must be considered.');
        $this->assertCount(1, $result['matches'], 'Only the exact account-reference template may match.');
        $this->assertSame($first['destination_id'], $result['matches']->first()['destination']->id);
        $this->assertSame($first['lease_id'], $result['matches']->first()['lease']->id);
    }

    public function test_shared_shortcode_with_identical_reference_templates_is_ambiguous(): void
    {
        $this->createDestinationAndLease('First Properties', 'first-ambiguous@example.test', '51683/{unit}');
        $this->createDestinationAndLease('Second Properties', 'second-ambiguous@example.test', '51683/{unit}');

        $result = app(DarajaC2bRoutingService::class)->findMatches(
            '123456',
            '51683/18',
            CarbonImmutable::parse('2026-10-09')
        );

        $this->assertCount(2, $result['matches']);
        $this->assertNotCount(1, $result['matches'], 'Identical references under a shared shortcode must never auto-route.');
    }

    public function test_unverified_shortcode_owner_still_counts_as_a_potential_ambiguous_match(): void
    {
        $this->createDestinationAndLease('First Properties', 'first-unverified@example.test', '51683/{unit}', 'ready');
        $this->createDestinationAndLease('Second Properties', 'second-unverified@example.test', '51683/{unit}', 'awaiting_merchant_authorization');

        $result = app(DarajaC2bRoutingService::class)->findMatches(
            '123456',
            '51683/18',
            CarbonImmutable::parse('2026-10-09')
        );

        $this->assertCount(2, $result['matches'], 'An unverified destination must not be ignored when checking shared-shortcode ambiguity.');
    }

    public function test_missing_reference_never_matches_a_lease_by_phone_or_shortcode_alone(): void
    {
        $this->createDestinationAndLease('First Properties', 'first-missing@example.test', '51683/{unit}');
        $this->createDestinationAndLease('Second Properties', 'second-missing@example.test', '99872/{unit}');

        $result = app(DarajaC2bRoutingService::class)->findMatches(
            '123456',
            null,
            CarbonImmutable::parse('2026-10-09')
        );

        $this->assertCount(2, $result['destinations']);
        $this->assertCount(0, $result['matches']);
    }

    public function test_missing_reference_is_persisted_for_review_and_duplicate_callbacks_are_idempotent(): void
    {
        $this->createDestinationAndLease('Review Properties', 'review@example.test', '51683/{unit}');
        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'test-callback-token'),
            'callback_token' => 'test-callback-token',
            'status' => 'registered',
            'registered_at' => now(),
        ]);

        $payload = [
            'BusinessShortCode' => '123456',
            'TransID' => 'QAB12345678',
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => '',
            'TransTime' => '20261009120000',
        ];

        $routing = app(DarajaC2bRoutingService::class);
        $first = $routing->receive($registration, $payload, app(PaymentReconciliationService::class));
        $second = $routing->receive($registration, $payload, app(PaymentReconciliationService::class));

        $this->assertSame('needs_review', $first->status);
        $this->assertSame('needs_review', $second->status);
        $this->assertSame('The M-PESA transaction has no account reference; automatic allocation is disabled.', $first->review_reason);
        $this->assertSame(1, DarajaC2bEvent::count());
        $this->assertSame(1, PaymentTransaction::count());
        $this->assertNull(PaymentTransaction::first()->matched_lease_id);

        $conflictingPayload = array_merge($payload, ['TransAmount' => '30000.00']);
        $conflict = $routing->receive($registration, $conflictingPayload, app(PaymentReconciliationService::class));
        $this->assertSame('needs_review', $conflict->status);
        $this->assertStringContainsString('conflicting amount, reference or timestamp data', $conflict->review_reason);
        $this->assertSame(1, DarajaC2bEvent::count());
        $this->assertSame(1, PaymentTransaction::count());
    }

    public function test_c2b_callback_can_link_to_the_same_verified_stk_receipt_when_reference_is_shortened(): void
    {
        $created = $this->createDestinationAndLease('STK Properties', 'stk-properties@example.test', '51683/{unit}');
        $now = now();

        $transactionId = DB::table('payment_transactions')->insertGetId([
            'organization_id' => $created['organization_id'],
            'payment_destination_id' => $created['destination_id'],
            'provider' => 'mpesa_daraja',
            'external_transaction_id' => 'STKRECEIPT01',
            'amount' => 25000,
            'currency' => 'KES',
            'payer_phone' => '254712345678',
            'payment_reference' => 'LEASE-' . $created['organization_id'],
            'transaction_at' => '2026-10-09 12:00:00',
            'status' => 'reconciled',
            'matched_lease_id' => $created['lease_id'],
            'reconciliation_note' => 'Confirmed by authenticated STK callback.',
            'raw_payload' => json_encode(['source' => 'stk_callback', 'environment' => 'sandbox']),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'stk-callback-token'),
            'callback_token' => 'stk-callback-token',
            'status' => 'registered',
            'registered_at' => $now,
        ]);

        $event = app(DarajaC2bRoutingService::class)->receive($registration, [
            'BusinessShortCode' => '123456',
            'TransID' => 'STKRECEIPT01',
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => 'P1A',
            'TransTime' => '20261009120000',
        ], app(PaymentReconciliationService::class));

        $this->assertSame('routed', $event->status);
        $this->assertSame($transactionId, $event->payment_transaction_id);
        $this->assertSame(1, PaymentTransaction::count());
    }

    public function test_pending_lease_is_not_eligible_for_automatic_c2b_routing(): void
    {
        $created = $this->createDestinationAndLease('Pending Properties', 'pending-properties@example.test', '51683/{unit}');
        DB::table('leases')->where('id', $created['lease_id'])->update(['status' => 'pending']);

        $result = app(DarajaC2bRoutingService::class)->findMatches(
            '123456',
            'LEASE-' . $created['organization_id'],
            CarbonImmutable::parse('2026-10-09')
        );

        $this->assertCount(0, $result['matches'], 'Pending leases must not receive automatic rent allocations.');
    }

    public function test_direct_c2b_payment_reconciles_once_and_replayed_callback_does_not_duplicate_ledger_entries(): void
    {
        $created = $this->createDestinationAndLease('Direct Rent Properties', 'direct-rent@example.test', '51683/{unit}');
        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'direct-callback-token'),
            'callback_token' => 'direct-callback-token',
            'status' => 'registered',
            'registered_at' => now(),
        ]);
        $payload = [
            'BusinessShortCode' => '123456',
            'TransID' => 'DIRECTC2B123',
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => 'LEASE-' . $created['organization_id'],
            'TransTime' => '20261009120000',
        ];

        $routing = app(DarajaC2bRoutingService::class);
        $first = $routing->receive($registration, $payload, app(PaymentReconciliationService::class));
        $second = $routing->receive($registration, $payload, app(PaymentReconciliationService::class));

        $this->assertSame('routed', $first->status);
        $this->assertSame('routed', $second->status);
        $this->assertSame('123456', $first->shortcode);
        $this->assertSame('LEASE-' . $created['organization_id'], $first->payment_reference);
        $this->assertSame('2026-10-09 12:00:00', $first->transaction_at->toDateTimeString());

        $transaction = PaymentTransaction::where('external_transaction_id', 'DIRECTC2B123')->firstOrFail();
        $this->assertSame('reconciled', $transaction->status);
        $this->assertSame($created['lease_id'], $transaction->matched_lease_id);
        $this->assertSame('123456', data_get($transaction->raw_payload, 'business_short_code'));
        $this->assertSame(1, DarajaC2bEvent::count());
        $this->assertSame(1, PaymentTransaction::count());
        $this->assertSame(1, Payment::where('provider_transaction_id', 'DIRECTC2B123')->count());
        $this->assertSame(1, DB::table('payment_allocations')->count());
        $this->assertEquals(0.0, (float) $transaction->matchedRentObligation->fresh()->balance);
    }

    public function test_c2b_confirmation_reuses_tenant_portal_payment_claim_instead_of_counting_it_twice(): void
    {
        $created = $this->createDestinationAndLease('Cross Channel Properties', 'cross-channel@example.test', '51683/{unit}');
        $claim = Payment::create([
            'organization_id' => $created['organization_id'],
            'lease_id' => $created['lease_id'],
            'payment_destination_id' => $created['destination_id'],
            'amount' => 25000,
            'payment_date' => '2026-10-09',
            'payment_method' => 'mpesa',
            'payment_type' => 'rent',
            'status' => 'pending',
            'reference' => 'CROSSCH123',
            'notes' => 'Submitted by tenant in the portal.',
        ]);
        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'cross-channel-token'),
            'callback_token' => 'cross-channel-token',
            'status' => 'registered',
            'registered_at' => now(),
        ]);
        $payload = [
            'BusinessShortCode' => '123456',
            'TransID' => 'CROSSCH123',
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => 'LEASE-' . $created['organization_id'],
            'TransTime' => '20261009120000',
        ];

        $event = app(DarajaC2bRoutingService::class)->receive(
            $registration,
            $payload,
            app(PaymentReconciliationService::class)
        );

        $claim->refresh();
        $transaction = PaymentTransaction::where('external_transaction_id', 'CROSSCH123')->firstOrFail();

        $this->assertSame('routed', $event->status);
        $this->assertSame('paid', $claim->status);
        $this->assertSame('mpesa_daraja', $claim->provider);
        $this->assertSame('CROSSCH123', $claim->provider_transaction_id);
        $this->assertSame($claim->id, $transaction->payment_id);
        $this->assertSame(1, Payment::where('organization_id', $created['organization_id'])->count());
        $this->assertSame(1, DB::table('payment_allocations')->count());
        $this->assertSame('reconciled', $transaction->status);
    }

    public function test_paid_claim_without_complete_ledger_representation_is_not_marked_reconciled(): void
    {
        $created = $this->createDestinationAndLease('Incomplete Paid Claim Properties', 'incomplete-paid-claim@example.test', '51683/{unit}');
        $receipt = 'PAIDCLAIM001';

        // Simulate a tenant payment that was marked paid before a rent obligation
        // existed, so it has no allocation, no rent credit and no linked obligation.
        $claim = Payment::create([
            'organization_id' => $created['organization_id'],
            'lease_id' => $created['lease_id'],
            'payment_destination_id' => $created['destination_id'],
            'amount' => 25000,
            'payment_date' => '2026-10-09',
            'payment_method' => 'mpesa',
            'payment_type' => 'rent',
            'status' => 'paid',
            'reference' => $receipt,
        ]);

        $registration = DarajaC2bRegistration::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'callback_token_hash' => hash('sha256', 'incomplete-paid-claim-token'),
            'callback_token' => 'incomplete-paid-claim-token',
            'status' => 'registered',
            'registered_at' => now(),
        ]);

        $event = app(DarajaC2bRoutingService::class)->receive($registration, [
            'BusinessShortCode' => '123456',
            'TransID' => $receipt,
            'TransAmount' => '25000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => '51683/18',
            'TransTime' => '20261009120000',
        ], app(PaymentReconciliationService::class));

        $transaction = PaymentTransaction::where('external_transaction_id', $receipt)->firstOrFail();

        $this->assertSame('needs_review', $event->status);
        $this->assertSame('needs_review', $transaction->status);
        $this->assertSame($claim->id, $transaction->payment_id);
        $this->assertStringContainsString('ledger amounts are incomplete', $transaction->reconciliation_note);
        $this->assertSame(0, DB::table('payment_allocations')->count());
        $this->assertSame(0, RentPaymentCredit::count());
        $this->assertSame('paid', $claim->fresh()->status);
    }


    public function test_provider_retries_and_repeated_reconciliation_do_not_duplicate_payments_allocations_or_credits(): void
    {
        $created = $this->createDestinationAndLease('Retry Safety Properties', 'retry-safety@example.test', '51683/{unit}');
        $service = app(PaymentReconciliationService::class);
        $payload = [
            'organization_id' => $created['organization_id'],
            'payment_destination_id' => $created['destination_id'],
            'provider' => 'mpesa_daraja',
            'external_transaction_id' => 'RETRYSAFE123',
            'amount' => 30000,
            'currency' => 'KES',
            'payer_phone' => '254712345678',
            'payment_reference' => 'LEASE-' . $created['organization_id'],
            'transaction_at' => '2026-01-09 12:00:00',
            'raw_payload' => ['source' => 'c2b_confirmation', 'environment' => 'sandbox'],
        ];

        $first = $service->ingest($payload);
        $retry = $service->ingest($payload);
        $service->reconcile($retry);
        $service->reconcile($first);

        $this->assertSame($first->id, $retry->id);
        $this->assertSame(1, PaymentTransaction::where('provider', 'mpesa_daraja')->where('external_transaction_id', 'RETRYSAFE123')->count());
        $this->assertSame(1, Payment::where('provider_transaction_id', 'RETRYSAFE123')->count());
        $this->assertSame(1, DB::table('payment_allocations')->whereNotNull('payment_id')->count());
        $this->assertSame(1, RentPaymentCredit::whereHas('sourcePayment', fn ($query) => $query->where('provider_transaction_id', 'RETRYSAFE123'))->count());

        $payment = Payment::where('provider_transaction_id', 'RETRYSAFE123')->firstOrFail();
        $this->assertEquals(25000.00, (float) $payment->allocations()->sum('amount'));
        $credit = RentPaymentCredit::where('source_payment_id', $payment->id)->firstOrFail();
        $this->assertEquals(5000.00, (float) $credit->amount);
        $this->assertEquals(0.00, (float) $credit->remaining_amount + (float) $credit->allocations()->sum('amount') - 5000.00);
    }

    public function test_mysql_unique_receipt_keys_are_present_to_reject_concurrent_duplicate_inserts(): void
    {
        $indexes = collect(DB::select("SHOW INDEX FROM payment_transactions"))
            ->groupBy('Key_name')
            ->map(fn ($rows) => [
                'unique' => (int) $rows->first()->Non_unique === 0,
                'columns' => $rows->sortBy('Seq_in_index')->pluck('Column_name')->values()->all(),
            ]);

        $this->assertTrue(
            $indexes->contains(fn ($index) => $index['unique']
                && $index['columns'] === ['organization_id', 'provider', 'external_transaction_id']),
            'MySQL must enforce one provider transaction row per organization/provider/receipt, including concurrent callback races.'
        );

        $eventIndexes = collect(DB::select("SHOW INDEX FROM daraja_c2b_events"))
            ->groupBy('Key_name')
            ->map(fn ($rows) => [
                'unique' => (int) $rows->first()->Non_unique === 0,
                'columns' => $rows->sortBy('Seq_in_index')->pluck('Column_name')->values()->all(),
            ]);

        $this->assertTrue(
            $eventIndexes->contains(fn ($index) => $index['unique']
                && $index['columns'] === ['environment', 'receipt']),
            'MySQL must enforce one immutable C2B event per environment/receipt.'
        );
    }


    public function test_statement_recovery_uses_the_same_idempotent_routing_and_ledger_path(): void
    {
        $created = $this->createDestinationAndLease('Statement Recovery Properties', 'statement-recovery@example.test', '51683/{unit}');
        $registration = new DarajaC2bRegistration([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'status' => 'registered',
        ]);
        $payload = [
            'BusinessShortCode' => '123456',
            'TransID' => 'STATEMENT123',
            'TransAmount' => '30000.00',
            'MSISDN' => '254712345678',
            'BillRefNumber' => 'LEASE-' . $created['organization_id'],
            'TransTime' => '20260109120000',
        ];

        $routing = app(DarajaC2bRoutingService::class);
        $first = $routing->receive($registration, $payload, app(PaymentReconciliationService::class), 'statement_recovery');
        $retry = $routing->receive($registration, $payload, app(PaymentReconciliationService::class), 'statement_recovery');

        $transaction = PaymentTransaction::where('external_transaction_id', 'STATEMENT123')->firstOrFail();
        $this->assertSame('routed', $first->status);
        $this->assertSame($first->id, $retry->id);
        $this->assertSame('reconciled_with_credit', $transaction->status);
        $this->assertSame('statement_recovery', data_get($transaction->raw_payload, 'source'));
        $this->assertSame(1, DarajaC2bEvent::where('receipt', 'STATEMENT123')->count());
        $this->assertSame(1, PaymentTransaction::where('external_transaction_id', 'STATEMENT123')->count());
        $this->assertSame(1, Payment::where('provider_transaction_id', 'STATEMENT123')->count());
        $this->assertSame(1, DB::table('payment_allocations')->whereNotNull('payment_id')->count());
        $this->assertSame(1, RentPaymentCredit::whereHas('sourcePayment', fn ($query) => $query->where('provider_transaction_id', 'STATEMENT123'))->count());
    }

    public function test_callback_monitoring_records_are_additive_and_can_be_reviewed_by_organization(): void
    {
        $created = $this->createDestinationAndLease('Callback Monitor Properties', 'callback-monitor@example.test', '51683/{unit}');

        $record = DarajaCallbackMonitoringEvent::create([
            'environment' => 'sandbox',
            'shortcode' => '123456',
            'receipt' => 'MONITOR123',
            'organization_id' => $created['organization_id'],
            'payment_destination_id' => $created['destination_id'],
            'source' => 'statement_recovery',
            'delivery_status' => 'recovered',
            'processing_status' => 'needs_review',
            'transaction_at' => '2026-10-09 12:00:00',
            'received_at' => now(),
            'latency_seconds' => 3600,
            'is_delayed' => true,
            'statement_fingerprint' => str_repeat('a', 64),
            'recorded_by' => 1,
            'recovery_notes' => 'Compared against the official merchant statement.',
            'error_message' => 'Reference did not match a unique lease.',
        ]);

        $this->assertDatabaseHas('daraja_callback_monitoring_events', [
            'id' => $record->id,
            'organization_id' => $created['organization_id'],
            'receipt' => 'MONITOR123',
            'processing_status' => 'needs_review',
            'is_delayed' => 1,
        ]);
        $this->assertSame('Compared against the official merchant statement.', $record->fresh()->recovery_notes);
    }

    private function createDestinationAndLease(string $organizationName, string $email, string $referenceFormat, string $c2bAuthorizationStatus = 'ready'): array
    {
        $now = now();
        $organizationId = DB::table('organizations')->insertGetId([
            'name' => $organizationName,
            'email' => $email,
            'country' => 'Kenya',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $propertyId = DB::table('properties')->insertGetId([
            'organization_id' => $organizationId,
            'name' => $organizationName . ' Block A',
            'country' => 'Kenya',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $unitId = DB::table('units')->insertGetId([
            'property_id' => $propertyId,
            'unit_number' => '18',
            'monthly_rent' => 25000,
            'status' => 'occupied',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $tenantId = DB::table('tenants')->insertGetId([
            'organization_id' => $organizationId,
            'first_name' => 'Test',
            'last_name' => 'Tenant',
            'email' => 'tenant-' . $organizationId . '@example.test',
            'phone' => '0712345678',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $leaseId = DB::table('leases')->insertGetId([
            'organization_id' => $organizationId,
            'property_id' => $propertyId,
            'unit_id' => $unitId,
            'tenant_id' => $tenantId,
            'tenant_payment_reference' => 'LEASE-' . $organizationId,
            'start_date' => '2026-01-01',
            'end_date' => null,
            'monthly_rent' => 25000,
            'deposit_amount' => 0,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $destinationId = DB::table('payment_destinations')->insertGetId([
            'organization_id' => $organizationId,
            'property_id' => $propertyId,
            'method' => 'mpesa_paybill',
            'label' => 'Rent PayBill',
            'details' => json_encode(['paybill' => '123456', 'account' => 'Rent']),
            'is_active' => true,
            'daraja_shortcode_type' => 'PayBill',
            'daraja_passkey' => null,
            'daraja_callback_token' => null,
            'daraja_authorization_status' => 'awaiting_merchant_authorization',
            'account_reference_format' => $referenceFormat,
            'c2b_registration_status' => 'registered',
            'c2b_authorization_status' => $c2bAuthorizationStatus,
            'c2b_authorization_checked_at' => $now,
            'c2b_registered_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return [
            'organization_id' => $organizationId,
            'property_id' => $propertyId,
            'unit_id' => $unitId,
            'lease_id' => $leaseId,
            'destination_id' => $destinationId,
        ];
    }
}
