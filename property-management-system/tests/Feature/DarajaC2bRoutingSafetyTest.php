<?php

namespace Tests\Feature;

use App\Services\DarajaC2bRoutingService;
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

    private function createDestinationAndLease(string $organizationName, string $email, string $referenceFormat): array
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
            'c2b_authorization_status' => 'ready',
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
