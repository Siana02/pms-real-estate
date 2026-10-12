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

        $pendingPayment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 5000,
            'payment_date' => $period->addDays(4)->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'pending',
            'payment_type' => 'rent',
        ]);

        $attached = $ledger->attachPayment($pendingPayment);
        $this->assertSame($obligation->id, $attached?->id);
        $this->assertSame($obligation->id, $pendingPayment->fresh()->rent_obligation_id);

        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 5000,
            'payment_date' => $period->addDays(4)->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
        ]);

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

        $sourceObligation = RentObligation::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'lease_id' => $lease->id,
            'period' => $period->subMonth()->toDateString(),
            'due_date' => $period->subMonth()->addDays(4)->toDateString(),
            'amount_due' => 10000,
        ]);

        // Mark the source payment as allocated elsewhere so it is not counted
        // as an unallocated legacy payment against the obligation under test.
        PaymentAllocation::create([
            'payment_id' => $sourcePayment->id,
            'rent_obligation_id' => $sourceObligation->id,
            'amount' => 10000,
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

    public function test_confirmed_payment_is_allocated_by_rent_month_and_excess_is_kept_as_credit(): void
    {
        $currentPeriod = CarbonImmutable::now()->startOfMonth();
        $previousPeriod = $currentPeriod->subMonth();

        $organization = Organization::create([
            'name' => 'Monthly Allocation Properties',
            'email' => 'monthly-allocation@example.test',
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Monthly Allocation Building',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'MA-01',
            'monthly_rent' => 10000,
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Monthly',
            'last_name' => 'Tenant',
            'phone' => '+254700000303',
        ]);

        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => $previousPeriod->toDateString(),
            'monthly_rent' => 10000,
            'status' => 'active',
        ]);

        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 25000,
            'payment_date' => $currentPeriod->addDays(3)->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
            'reference' => 'MONTHLY-ALLOC-001',
        ]);

        app(RentLedgerService::class)->allocateConfirmedPayment($payment);

        $allocations = PaymentAllocation::where('payment_id', $payment->id)
            ->with('rentObligation')
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $allocations);
        $this->assertSame($previousPeriod->toDateString(), CarbonImmutable::parse($allocations[0]->rentObligation->period)->toDateString());
        $this->assertSame($currentPeriod->toDateString(), CarbonImmutable::parse($allocations[1]->rentObligation->period)->toDateString());
        $this->assertSame(10000.0, (float) $allocations[0]->amount);
        $this->assertSame(10000.0, (float) $allocations[1]->amount);

        $credit = RentPaymentCredit::where('source_payment_id', $payment->id)->firstOrFail();
        $this->assertSame(5000.0, (float) $credit->amount);
        $this->assertSame(5000.0, (float) $credit->remaining_amount);
        $this->assertSame('available', $credit->status);

        // A retry must not duplicate month allocations or create a second credit.
        app(RentLedgerService::class)->allocateConfirmedPayment($payment->fresh());
        $this->assertSame(2, PaymentAllocation::where('payment_id', $payment->id)->count());
        $this->assertSame(1, RentPaymentCredit::where('source_payment_id', $payment->id)->count());
    }

    public function test_inconsistent_historical_payment_allocation_is_held_for_review_without_rewriting_it(): void
    {
        $period = CarbonImmutable::now()->startOfMonth();

        $organization = Organization::create([
            'name' => 'Historical Review Organization',
            'email' => 'historical-review@example.test',
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Lease Property',
        ]);
        $otherProperty = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Mismatched Historical Property',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'HR-01',
            'monthly_rent' => 10000,
        ]);
        $otherUnit = Unit::create([
            'property_id' => $otherProperty->id,
            'unit_number' => 'HR-02',
            'monthly_rent' => 10000,
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Historical',
            'last_name' => 'Review',
            'phone' => '+254700000304',
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
            'property_id' => $otherProperty->id,
            'unit_id' => $otherUnit->id,
            'tenant_id' => $tenant->id,
            'lease_id' => $lease->id,
            'period' => $period->toDateString(),
            'due_date' => $period->addDays(4)->toDateString(),
            'amount_due' => 10000,
        ]);

        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 10000,
            'payment_date' => $period->addDays(3)->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
            'reference' => 'HISTORICAL-SCOPE-001',
        ]);

        $allocation = PaymentAllocation::create([
            'payment_id' => $payment->id,
            'rent_obligation_id' => $obligation->id,
            'amount' => 10000,
        ]);

        try {
            app(RentLedgerService::class)->allocateConfirmedPayment($payment);
            $this->fail('An inconsistent historical allocation must not be silently accepted.');
        } catch (\RuntimeException $exception) {
            $this->assertStringContainsString('requires review', $exception->getMessage());
        }

        // Review is non-destructive: the original records remain exactly as found.
        $this->assertSame($otherProperty->id, $obligation->fresh()->property_id);
        $this->assertSame($otherUnit->id, $obligation->fresh()->unit_id);
        $this->assertSame(10000.0, (float) $allocation->fresh()->amount);
        $this->assertSame(1, PaymentAllocation::where('payment_id', $payment->id)->count());
        $this->assertSame(0, RentPaymentCredit::where('source_payment_id', $payment->id)->count());
    }

}
