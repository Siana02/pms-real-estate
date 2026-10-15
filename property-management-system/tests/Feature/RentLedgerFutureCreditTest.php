<?php

namespace Tests\Feature;

use App\Models\Leases;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PlatformSubscription;
use App\Models\Property;
use App\Models\RentObligation;
use App\Models\RentPaymentCredit;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\RentLedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RentLedgerFutureCreditTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmed_overpayment_creates_and_credits_the_next_month_obligation(): void
    {
        $organization = Organization::create([
            'name' => 'Future Credit Test',
            'email' => 'future-credit@example.test',
        ]);

        PlatformSubscription::create([
            'organization_id' => $organization->id,
            'plan_code' => 'premium',
            'status' => 'active',
            'billable_units' => 1,
            'monthly_amount' => 150,
            'current_period_starts_at' => now()->subDay(),
            'current_period_ends_at' => now()->addMonth(),
        ]);

        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Future Credit Property',
            'property_type' => 'residential',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'FC-01',
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 15000,
            'status' => 'occupied',
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane-future-credit@example.test',
            'phone' => '+254700000002',
            'status' => 'active',
        ]);

        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'monthly_rent' => 15000,
            'deposit_amount' => 0,
            'status' => 'active',
            'manager_terms' => 'Rent credit test terms.',
            'tenant_terms' => 'Rent credit test terms.',
        ]);

        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 20000,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
            'reference' => 'FC-RECEIPT-001',
        ]);

        app(RentLedgerService::class)->allocateConfirmedPayment($payment);

        $currentPeriod = now()->startOfMonth()->toDateString();
        $nextPeriod = now()->addMonth()->startOfMonth()->toDateString();

        $current = RentObligation::where('lease_id', $lease->id)
            ->whereDate('period', $currentPeriod)->firstOrFail();
        $next = RentObligation::where('lease_id', $lease->id)
            ->whereDate('period', $nextPeriod)->firstOrFail();

        $this->assertSame(0.0, round($current->balance, 2));
        $this->assertSame(5000.0, round($next->amount_paid, 2));
        $this->assertSame(10000.0, round($next->balance, 2));

        $credit = RentPaymentCredit::where('source_payment_id', $payment->id)->firstOrFail();
        $this->assertSame('consumed', $credit->status);
        $this->assertSame(0.0, round((float) $credit->remaining_amount, 2));
        $this->assertDatabaseHas('payment_allocations', [
            'rent_payment_credit_id' => $credit->id,
            'rent_obligation_id' => $next->id,
            'amount' => 5000,
        ]);
    }

    public function test_rent_credit_does_not_generate_obligations_after_lease_end(): void
    {
        $organization = Organization::create([
            'name' => 'Lease End Credit Test',
            'email' => 'lease-end-credit@example.test',
        ]);
        PlatformSubscription::create([
            'organization_id' => $organization->id,
            'plan_code' => 'premium',
            'status' => 'active',
            'billable_units' => 1,
            'monthly_amount' => 150,
            'current_period_starts_at' => now()->subDay(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'Lease End Property',
            'property_type' => 'residential',
        ]);
        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'LE-01',
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 15000,
            'status' => 'occupied',
        ]);
        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Lease',
            'last_name' => 'End',
            'email' => 'lease-end-credit-tenant@example.test',
            'phone' => '+254700000003',
            'status' => 'active',
        ]);
        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => now()->startOfMonth()->toDateString(),
            'end_date' => now()->endOfMonth()->toDateString(),
            'monthly_rent' => 15000,
            'deposit_amount' => 0,
            'status' => 'active',
            'manager_terms' => 'Lease end test terms.',
            'tenant_terms' => 'Lease end test terms.',
        ]);
        $payment = Payment::create([
            'organization_id' => $organization->id,
            'lease_id' => $lease->id,
            'amount' => 20000,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'mpesa',
            'status' => 'paid',
            'payment_type' => 'rent',
            'reference' => 'LE-RECEIPT-001',
        ]);

        app(RentLedgerService::class)->allocateConfirmedPayment($payment);

        $this->assertDatabaseMissing('rent_obligations', [
            'lease_id' => $lease->id,
            'period' => now()->addMonth()->startOfMonth()->toDateString(),
        ]);
        $credit = RentPaymentCredit::where('source_payment_id', $payment->id)->firstOrFail();
        $this->assertSame(5000.0, round((float) $credit->remaining_amount, 2));
    }
}
