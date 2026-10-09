<?php

namespace Tests\Feature;

use App\Models\DarajaC2bRegistration;
use App\Models\DarajaC2bEvent;
use App\Models\PaymentTransaction;
use App\Models\Payment;
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
