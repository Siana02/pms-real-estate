<?php

namespace Tests\Feature;

use App\Models\Leases;
use App\Models\Organization;
use App\Models\PlatformSubscription;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PhysicalLeaseSignatureConfirmationTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_can_confirm_both_physical_copies_without_fabricating_digital_signatures(): void
    {
        [$organization, $lease, $manager] = $this->createLeaseWorkspace('physical-one');

        $response = $this->withFreshToken($manager->createToken('physical-signatures')->plainTextToken)
            ->patchJson('/api/leases/' . $lease->id . '/physical-signatures', [
                'manager_copy_signed_on' => now()->subDays(2)->toDateString(),
                'tenant_copy_signed_on' => now()->subDay()->toDateString(),
                'physical_signing_notes' => 'Both original printed copies were checked in person.',
            ]);

        $response->assertOk()
            ->assertJsonPath('lease.agreement_finalized', true)
            ->assertJsonPath('lease.manager_physical_confirmed_by.id', $manager->id)
            ->assertJsonPath('lease.tenant_physical_confirmed_by.id', $manager->id);

        // Eloquent serializes date casts as ISO timestamps in model responses;
        // the stored MySQL columns remain DATE values.
        $this->assertSame(
            now()->subDays(2)->toDateString(),
            substr((string) $response->json('lease.manager_copy_physical_signed_on'), 0, 10)
        );
        $this->assertSame(
            now()->subDay()->toDateString(),
            substr((string) $response->json('lease.tenant_copy_physical_signed_on'), 0, 10)
        );

        $fresh = $lease->fresh();
        $this->assertNull($fresh->manager_signature);
        $this->assertNull($fresh->manager_signed_at);
        $this->assertNull($fresh->tenant_signature);
        $this->assertNull($fresh->tenant_signed_at);
        $this->assertTrue($fresh->agreement_finalized);
        $this->assertSame('Both original printed copies were checked in person.', $fresh->physical_signing_notes);
        $this->assertDatabaseHas('leases', [
            'id' => $lease->id,
            'manager_copy_physical_confirmed_by' => $manager->id,
            'tenant_copy_physical_confirmed_by' => $manager->id,
        ]);
    }

    public function test_physical_confirmation_is_idempotent_and_conflicting_dates_are_rejected(): void
    {
        [, $lease, $manager] = $this->createLeaseWorkspace('physical-two');
        $token = $manager->createToken('physical-idempotency')->plainTextToken;
        $managerDate = now()->subDays(3)->toDateString();

        $this->withFreshToken($token)->patchJson('/api/leases/' . $lease->id . '/physical-signatures', [
            'manager_copy_signed_on' => $managerDate,
        ])->assertOk();

        $confirmedAt = $lease->fresh()->manager_copy_physical_confirmed_at?->toDateTimeString();

        $this->withFreshToken($token)->patchJson('/api/leases/' . $lease->id . '/physical-signatures', [
            'manager_copy_signed_on' => $managerDate,
        ])->assertOk();

        $this->assertSame($confirmedAt, $lease->fresh()->manager_copy_physical_confirmed_at?->toDateTimeString());

        $this->withFreshToken($token)->patchJson('/api/leases/' . $lease->id . '/physical-signatures', [
            'manager_copy_signed_on' => now()->subDays(4)->toDateString(),
        ])->assertUnprocessable();

        $this->assertSame($managerDate, $lease->fresh()->manager_copy_physical_signed_on?->toDateString());
    }

    public function test_physical_confirmation_locks_lease_terms_and_prevents_deletion(): void
    {
        [, $lease, $manager] = $this->createLeaseWorkspace('physical-three');
        $token = $manager->createToken('physical-lock')->plainTextToken;

        $this->withFreshToken($token)->patchJson('/api/leases/' . $lease->id . '/physical-signatures', [
            'tenant_copy_signed_on' => now()->toDateString(),
        ])->assertOk();

        $this->withFreshToken($token)->patchJson('/api/leases/' . $lease->id, [
            'monthly_rent' => 22000,
        ])->assertUnprocessable();

        $this->withFreshToken($token)->deleteJson('/api/leases/' . $lease->id)
            ->assertUnprocessable();

        $this->assertSame('20000.00', $lease->fresh()->monthly_rent);
    }

    public function test_manager_cannot_confirm_physical_signatures_for_another_organization(): void
    {
        [, , $manager] = $this->createLeaseWorkspace('physical-four');
        [, $foreignLease] = $this->createLeaseWorkspace('physical-foreign');
        $token = $manager->createToken('physical-scope')->plainTextToken;

        $this->withFreshToken($token)->patchJson('/api/leases/' . $foreignLease->id . '/physical-signatures', [
            'manager_copy_signed_on' => now()->toDateString(),
            'tenant_copy_signed_on' => now()->toDateString(),
        ])->assertForbidden();

        $this->assertNull($foreignLease->fresh()->manager_copy_physical_confirmed_at);
        $this->assertNull($foreignLease->fresh()->tenant_copy_physical_confirmed_at);
    }

    private function createLeaseWorkspace(string $suffix): array
    {
        $organization = Organization::create([
            'name' => 'Physical Lease ' . $suffix,
            'email' => $suffix . '@example.test',
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
            'name' => 'Physical Lease Property ' . $suffix,
            'property_type' => 'residential',
        ]);

        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'U-' . substr($suffix, 0, 8),
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 20000,
            'status' => 'occupied',
        ]);

        $tenant = Tenant::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'first_name' => 'Physical',
            'last_name' => 'Tenant ' . $suffix,
            'email' => $suffix . '-tenant@example.test',
            'phone' => '+254700000001',
            'status' => 'active',
        ]);

        $lease = Leases::create([
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addYear()->toDateString(),
            'monthly_rent' => 20000,
            'deposit_amount' => 0,
            'status' => 'active',
            'manager_terms' => 'Physical signing test lease terms.',
            'tenant_terms' => 'Physical signing test lease terms.',
        ]);

        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Physical Lease Manager',
            'username' => 'manager-' . $suffix,
            'email' => $suffix . '-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);

        return [$organization, $lease, $manager];
    }

    private function withFreshToken(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }
}
