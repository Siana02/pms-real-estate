<?php

namespace Tests\Feature;

use App\Models\Leases;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Property;
use App\Models\RentObligation;
use App\Models\RentPaymentCredit;
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

    public function test_reapplying_credit_extends_an_existing_partial_allocation_without_losing_credit(): void
    {
        $period = CarbonImmutable::now()->startOfMonth();

        $organization = Organization::create([
            'name' => 'Credit Retry Properties',
            'email' => 'credit-retry@example.test',
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Credit Retry Building',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'CR-01',
            'monthly_rent' => 10000,
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Credit',
            'last_name' => 'Retry',
            'phone' => '+254700000302',
        ]);

        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => $period->toDateString(),
            'monthly_rent' => 10000,
            'status' => 'active',
        ]);

        $obligation = RentObligation::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'lease_id' => $lease->id,
            'period' => $period->toDateString(),
            'due_date' => $period->addDays(4)->toDateString(),
            'amount_due' => 10000,
        ]);

        $sourcePayment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 10000,
            'payment_date' => $period->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
        ]);

        $credit = RentPaymentCredit::create([
            'organization_id' => $organization->id,
            'tenant_id' => $tenant->id,
            'lease_id' => $lease->id,
            'source_payment_id' => $sourcePayment->id,
            'amount' => 10000,
            'remaining_amount' => 5000,
            'status' => 'available',
            'notes' => 'Fixture for retrying a partial allocation.',
        ]);

        $allocation = PaymentAllocation::create([
            'payment_id' => null,
            'rent_payment_credit_id' => $credit->id,
            'rent_obligation_id' => $obligation->id,
            'amount' => 5000,
        ]);

        app(RentLedgerService::class)->applyAvailableCredits($lease, $period);

        $this->assertSame(10000.0, (float) $allocation->fresh()->amount);
        $this->assertSame(0.0, (float) $credit->fresh()->remaining_amount);
        $this->assertSame('consumed', $credit->fresh()->status);
        $this->assertSame(0.0, $obligation->fresh()->balance);
        $this->assertSame(1, PaymentAllocation::where('rent_payment_credit_id', $credit->id)
            ->where('rent_obligation_id', $obligation->id)
            ->count());
    }

}
