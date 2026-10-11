<?php

namespace Tests\Feature;

use App\Models\Leases;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseRelationshipIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_unit_payments_relationship_follows_lease_foreign_key(): void
    {
        $organization = Organization::create([
            'name' => 'Relationship Test Properties',
            'email' => 'relationship-test@example.test',
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Relationship Test Building',
        ]);

        $unitA = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'A-01',
            'monthly_rent' => 20000,
        ]);

        $unitB = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'B-01',
            'monthly_rent' => 25000,
        ]);

        $tenantA = Tenant::create([
            'organization_id' => $organization->id,
            'first_name' => 'Tenant',
            'last_name' => 'A',
            'phone' => '+254700000101',
        ]);

        $tenantB = Tenant::create([
            'organization_id' => $organization->id,
            'first_name' => 'Tenant',
            'last_name' => 'B',
            'phone' => '+254700000102',
        ]);

        $leaseA = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unitA->id,
            'tenant_id' => $tenantA->id,
            'start_date' => now()->toDateString(),
            'monthly_rent' => 20000,
            'status' => 'active',
        ]);

        $leaseB = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unitB->id,
            'tenant_id' => $tenantB->id,
            'start_date' => now()->toDateString(),
            'monthly_rent' => 25000,
            'status' => 'active',
        ]);

        $paymentA = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $leaseA->id,
            'amount' => 20000,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'mpesa',
            'payment_type' => 'rent',
        ]);

        Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $leaseB->id,
            'amount' => 25000,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'payment_type' => 'rent',
        ]);

        $this->assertSame(
            [$paymentA->id],
            $unitA->payments()->pluck('payments.id')->all()
        );
        $this->assertSame(1, $unitA->payments()->count());
        $this->assertSame(1, $unitB->payments()->count());
    }
}
