<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PropertyTenantWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_options_and_pending_tenant_selection_are_scoped(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $this->getJson('/api/organizations')
            ->assertOk()
            ->assertJsonFragment(['id' => $organization->id, 'name' => $organization->name]);

        $this->getJson("/api/organizations/{$organization->id}/properties")
            ->assertOk()
            ->assertJsonFragment(['id' => $property->id, 'name' => $property->name]);

        $this->getJson("/api/properties/{$property->id}/available-units")
            ->assertOk()
            ->assertJsonFragment(['id' => $unit->id, 'unit_number' => $unit->unit_number]);

        $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'name' => 'Self Registering Tenant',
            'email' => 'self@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated()
            ->assertJsonPath('user.organization_id', $organization->id);

        $tenant = Tenant::where('email', 'self@example.test')->firstOrFail();
        $this->assertSame('pending', $tenant->status);
        $this->assertSame($property->id, $tenant->property_id);
        $this->assertSame($unit->id, $tenant->unit_id);
        $this->assertSame('vacant', $unit->fresh()->status);
        $this->assertDatabaseCount('organizations', 1);
        $this->assertDatabaseCount('leases', 0);
        $this->assertDatabaseCount('deposits', 0);
    }

    public function test_registration_rejects_a_property_or_unit_outside_the_selected_relationship(): void
    {
        [$organization, $property] = $this->createPropertyInventory();
        $otherOrganization = Organization::create([
            'name' => 'Other Properties',
            'email' => 'other@example.test',
        ]);
        $foreignProperty = Property::create([
            'organization_id' => $otherOrganization->id,
            'name' => 'Foreign Building',
        ]);
        $foreignUnit = Unit::create([
            'property_id' => $foreignProperty->id,
            'unit_number' => 'F01',
            'unit_type' => 'Bedsitter',
            'monthly_rent' => 12000,
            'status' => 'vacant',
        ]);
        $otherUnit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'A02',
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 25000,
            'status' => 'vacant',
        ]);

        $base = [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'name' => 'Cross Boundary Tenant',
            'email' => 'cross@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $this->postJson('/api/register', [
            ...$base,
            'property_id' => $foreignProperty->id,
            'unit_id' => $foreignUnit->id,
        ])->assertUnprocessable();

        $this->postJson('/api/register', [
            ...$base,
            'property_id' => $property->id,
            'unit_id' => $otherUnit->id,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('tenants', ['email' => 'cross@example.test']);
    }

    public function test_manager_tenant_creation_keeps_lease_and_deposit_dates_separate_and_preserves_temporary_password(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();
        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Property Manager',
            'username' => 'manager',
            'email' => 'manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);
        $managerToken = $manager->createToken('test-manager')->plainTextToken;
        $leaseStart = now()->addMonthsNoOverflow(2)->toDateString();
        $depositDate = now()->subMonth()->toDateString();

        $response = $this->withToken($managerToken)->postJson('/api/tenants', [
            'first_name' => 'Amina',
            'last_name' => 'Wanjiru',
            'email' => 'amina@example.test',
            'phone' => '+254700000000',
            'create_login' => true,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'start_date' => $leaseStart,
            'monthly_rent' => 27000,
            'deposit_amount' => 25000,
            'deposit_paid' => true,
            'deposit_payment_date' => $depositDate,
        ]);
        $response->assertCreated()->assertJsonPath('account.created', true);
        $temporaryPassword = $response->json('account.temporary_password');
        $this->assertNotEmpty($temporaryPassword);

        $tenant = Tenant::where('email', 'amina@example.test')->firstOrFail();
        $lease = $tenant->leases()->firstOrFail();
        $this->assertSame($leaseStart, $lease->start_date->toDateString());
        $this->assertSame($depositDate, $lease->deposit->payment_date->toDateString());
        $this->assertSame($leaseStart, $lease->deposit->lease->start_date->toDateString());
        $this->assertSame('27000.00', $lease->monthly_rent);
        $this->assertSame('25000.00', $lease->deposit->amount_required);
        $this->assertSame('reserved', $unit->fresh()->status);

        $this->withToken($managerToken)->postJson('/api/leases', [
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'tenant_id' => $tenant->id,
            'start_date' => $leaseStart,
            'monthly_rent' => 25000,
        ])->assertUnprocessable();

        $tenantLogin = $this->postJson('/api/login', [
            'login' => $response->json('account.username'),
            'password' => $temporaryPassword,
        ])->assertOk()->assertJsonPath('user.must_change_password', true);
        $tenantToken = $tenantLogin->json('token');

        $this->withToken($tenantToken)->postJson('/api/change-password', [
            'current_password' => $temporaryPassword,
            'password' => 'PermanentPass123!',
            'password_confirmation' => 'PermanentPass123!',
        ])->assertOk()->assertJsonPath('user.must_change_password', false);

        $this->postJson('/api/login', [
            'login' => $response->json('account.username'),
            'password' => 'PermanentPass123!',
        ])->assertOk()->assertJsonPath('user.role', 'tenant');

        $this->withToken($tenantToken)->getJson('/api/tenant/overview')
            ->assertOk()
            ->assertJsonPath('data.home', null);
    }

    public function test_manager_registration_and_shared_login_remain_available(): void
    {
        $this->postJson('/api/register', [
            'role' => 'manager',
            'organization_name' => 'New Properties',
            'username' => 'new-properties',
            'name' => 'New Manager',
            'email' => 'new-manager@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'country' => 'Kenya',
        ])->assertCreated();

        $this->postJson('/api/login', [
            'login' => 'new-manager@example.test',
            'password' => 'Password123!',
        ])->assertOk()->assertJsonPath('user.role', 'admin');
    }

    private function createPropertyInventory(): array
    {
        $organization = Organization::create([
            'name' => 'Biscuit Properties',
            'email' => 'biscuit@example.test',
        ]);
        $property = Property::create([
            'organization_id' => $organization->id,
            'name' => 'ABC Plaza',
            'property_type' => 'residential',
        ]);
        $unit = Unit::create([
            'property_id' => $property->id,
            'unit_number' => 'OB01',
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 25000,
            'status' => 'vacant',
        ]);

        return [$organization, $property, $unit];
    }
}
