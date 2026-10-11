<?php

namespace Tests\Feature;

use App\Models\Leases;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Property;
use App\Models\RentObligation;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\RentLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RentLedgerIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_rent_obligation_creation_is_idempotent_and_payment_allocation_updates_the_balance(): void
    {
        $period = CarbonImmutable::now()->startOfMonth();

        $organization = Organization::create([
            'name' => 'Ledger Integrity Properties',
            'email' => 'ledger-integrity@example.test',
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Ledger Integrity Building',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'L-01',
            'monthly_rent' => 15000,
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Ledger',
            'last_name' => 'Tenant',
            'phone' => '+254700000301',
        ]);

        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => $period->toDateString(),
            'monthly_rent' => 15000,
            'status' => 'active',
        ]);

        $ledger = app(RentLedgerService::class);
        $ledger->ensureForPeriod($period);
        $ledger->ensureForPeriod($period);

        $this->assertDatabaseCount('rent_obligations', 1);
        $obligation = RentObligation::where('lease_id', $lease->id)->firstOrFail();

        $this->assertSame($organization->id, $obligation->organization_id);
        $this->assertSame($property->id, $obligation->property_id);
        $this->assertSame($unit->id, $obligation->unit_id);
        $this->assertSame($tenant->id, $obligation->tenant_id);
        $this->assertSame('15000.00', $obligation->amount_due);

        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 5000,
            'payment_date' => $period->addDays(4)->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
        ]);

        $attached = $ledger->attachPayment($payment);
        $this->assertSame($obligation->id, $attached?->id);
        $this->assertSame($obligation->id, $payment->fresh()->rent_obligation_id);

        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'rent_obligation_id' => $obligation->id,
            'amount' => 5000,
        ]);

        $obligation->refresh();
        $this->assertSame(5000.0, $obligation->amount_paid);
        $this->assertSame(10000.0, $obligation->balance);
        $this->assertSame('partial', $obligation->status);
    }
}
