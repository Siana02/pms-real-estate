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
            'requested_move_in_date' => now()->addMonth()->toDateString(),
            'requested_move_out_date' => now()->addYear()->toDateString(),
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
        $this->assertSame('reserved', $unit->fresh()->status);
        $this->assertDatabaseCount('organizations', 1);
        $this->assertDatabaseCount('leases', 1);
        $this->assertDatabaseCount('deposits', 1);
        $lease = $tenant->leases()->with('deposit')->firstOrFail();
        $this->assertSame('pending', $lease->status);
        $this->assertNull($lease->start_date);
        $this->assertSame(now()->addMonth()->toDateString(), $lease->requested_move_in_date->toDateString());
        $this->assertSame('25000.00', $lease->monthly_rent);
        $this->assertSame('25000.00', $lease->deposit->amount_required);
        $this->assertSame('unpaid', $lease->deposit->status);
    }

    public function test_self_registered_tenant_lease_portal_populates_selected_organization_property_unit_rent_and_deposit(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $registration = $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'requested_move_in_date' => now()->addMonth()->toDateString(),
            'name' => 'Portal Tenant',
            'email' => 'portal-tenant@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $token = $registration->json('token');

        $this->withToken($token)
            ->getJson('/api/tenant/lease-agreement')
            ->assertOk()
            ->assertJsonPath('data.organization.id', $organization->id)
            ->assertJsonPath('data.organization.name', $organization->name)
            ->assertJsonPath('data.property.id', $property->id)
            ->assertJsonPath('data.property.name', $property->name)
            ->assertJsonPath('data.unit.id', $unit->id)
            ->assertJsonPath('data.unit.unit_number', $unit->unit_number)
            ->assertJsonPath('data.monthly_rent', '25000.00')
            ->assertJsonPath('data.deposit_amount', '25000.00');
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

    public function test_manager_can_create_a_property_with_generated_units_and_default_rents(): void
    {
        [$organization] = $this->createPropertyInventory();
        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Property Manager',
            'username' => 'inventory-manager',
            'email' => 'inventory-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);

        $response = $this->withToken($manager->createToken('inventory-manager')->plainTextToken)
            ->postJson('/api/properties', [
                'name' => 'ABC Plaza',
                'property_type' => 'residential',
                'units' => [
                    ['unit_number' => 'OB01', 'unit_type' => 'One Bedroom', 'status' => 'vacant', 'monthly_rent' => 25000],
                    ['unit_number' => 'OB02', 'unit_type' => 'One Bedroom', 'status' => 'vacant', 'monthly_rent' => 25000],
                    ['unit_number' => 'BS01', 'unit_type' => 'Bedsitter', 'status' => 'vacant', 'monthly_rent' => 12000],
                ],
            ]);

        $response->assertCreated();
        $propertyId = $response->json('property.id');
        $this->assertSame(3, Unit::where('property_id', $propertyId)->count());
        $this->assertDatabaseHas('units', [
            'property_id' => $propertyId,
            'unit_number' => 'OB01',
            'unit_type' => 'One Bedroom',
            'monthly_rent' => 25000,
            'status' => 'vacant',
        ]);
        $this->assertDatabaseHas('units', [
            'property_id' => $propertyId,
            'unit_number' => 'BS01',
            'unit_type' => 'Bedsitter',
            'monthly_rent' => 12000,
            'status' => 'vacant',
        ]);
    }

    public function test_manager_cannot_view_or_assign_another_organizations_property_or_unit(): void
    {
        [$organization, $property] = $this->createPropertyInventory();
        $foreignOrganization = Organization::create([
            'name' => 'Other Organization',
            'email' => 'foreign@example.test',
        ]);
        $foreignProperty = Property::create([
            'organization_id' => $foreignOrganization->id,
            'name' => 'Foreign Plaza',
        ]);
        $foreignUnit = Unit::create([
            'property_id' => $foreignProperty->id,
            'unit_number' => 'X01',
            'monthly_rent' => 10000,
            'status' => 'vacant',
        ]);
        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Scoped Manager',
            'username' => 'scoped-manager',
            'email' => 'scoped-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);
        $token = $manager->createToken('scoped-manager')->plainTextToken;

        $this->withToken($token)->getJson('/api/properties')
            ->assertOk()
            ->assertJsonMissing(['id' => $foreignProperty->id, 'name' => $foreignProperty->name]);

        $this->withToken($token)->getJson("/api/properties/{$foreignProperty->id}")
            ->assertForbidden();

        $this->withToken($token)->postJson('/api/units', [
            'property_id' => $foreignProperty->id,
            'unit_number' => 'X02',
            'monthly_rent' => 10000,
            'status' => 'vacant',
        ])->assertForbidden();

        $this->assertDatabaseMissing('units', [
            'property_id' => $foreignProperty->id,
            'unit_number' => 'X02',
        ]);
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
            ->assertJsonPath('data.home.property_name', $property->name)
            ->assertJsonPath('data.home.unit_number', $unit->unit_number);
    }

    public function test_future_reservation_can_start_on_current_tenants_end_date(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Reservation Manager',
            'username' => 'reservation-manager',
            'email' => 'reservation-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);
        $managerToken = $manager->createToken('reservation-manager')->plainTextToken;

        $this->withToken($managerToken)->postJson('/api/tenants', [
            'first_name' => 'Current',
            'last_name' => 'Tenant',
            'email' => 'current@example.test',
            'phone' => '+254700000001',
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'start_date' => '2026-09-01',
            'end_date' => '2026-10-01',
            'monthly_rent' => 25000,
            'deposit_amount' => 25000,
            'create_login' => true,
        ])->assertCreated();

        $registration = $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'requested_move_in_date' => '2026-10-01',
            'requested_move_out_date' => '2027-10-01',
            'name' => 'Future Tenant',
            'phone' => '+254700000002',
            'email' => 'future@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $futureTenant = Tenant::where('email', 'future@example.test')->firstOrFail();
        $this->assertDatabaseHas('leases', [
            'tenant_id' => $futureTenant->id,
            'unit_id' => $unit->id,
            'status' => 'pending',
            'requested_move_in_date' => '2026-10-01',
        ]);
    }

    public function test_self_registered_lease_is_one_canonical_agreement_and_locks_after_manager_signature(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $registration = $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'requested_move_in_date' => now()->addMonth()->toDateString(),
            'requested_move_out_date' => now()->addYear()->toDateString(),
            'name' => 'Agreement Tenant',
            'phone' => '+254711111111',
            'national_id' => '12345678',
            'employer_name' => 'Example Ltd',
            'employer_phone' => '+254722222222',
            'next_of_kin_name' => 'Example Kin',
            'next_of_kin_phone' => '+254733333333',
            'email' => 'agreement@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $tenantToken = $registration->json('token');
        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Agreement Manager',
            'username' => 'agreement-manager',
            'email' => 'agreement-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);
        $managerToken = $manager->createToken('agreement-manager')->plainTextToken;

        $tenantAgreement = $this->withToken($tenantToken)
            ->getJson('/api/tenant/lease-agreement')
            ->assertOk();

        $leaseId = $tenantAgreement->json('data.lease_id');
        $this->assertSame($property->name, $tenantAgreement->json('data.property.name'));
        $this->assertSame($unit->unit_number, $tenantAgreement->json('data.unit.unit_number'));

        $this->withToken($tenantToken)
            ->patchJson('/api/tenant/lease-agreement', [
                'tenant_terms' => 'Tenant accepts the current lease terms.',
            ])
            ->assertOk();

        $this->withToken($tenantToken)
            ->patchJson('/api/tenant/lease-agreement', [
                'requested_move_in_date' => now()->addMonths(2)->toDateString(),
                'requested_move_out_date' => now()->addMonths(14)->toDateString(),
            ])
            ->assertOk()
            ->assertJsonPath('data.requested_move_in_date', now()->addMonths(2)->toDateString())
            ->assertJsonPath('data.requested_move_out_date', now()->addMonths(14)->toDateString());

        $this->assertDatabaseHas('leases', [
            'id' => $leaseId,
            'requested_move_in_date' => now()->addMonths(2)->toDateString(),
            'requested_move_out_date' => now()->addMonths(14)->toDateString(),
        ]);

        $this->withToken($tenantToken)
            ->patchJson('/api/tenant/lease-agreement', [
                'tenant_signature' => 'AT',
            ])
            ->assertOk()
            ->assertJsonPath('data.agreement_status', 'awaiting_manager_signature');

        $this->withToken($managerToken)
            ->patchJson('/api/leases/' . $leaseId, [
                'start_date' => now()->addMonth()->toDateString(),
                'end_date' => now()->addYear()->toDateString(),
                'monthly_rent' => 27000,
                'deposit_amount' => 25000,
            ])
            ->assertOk();

        $this->assertDatabaseHas('leases', [
            'id' => $leaseId,
            'start_date' => now()->addMonth()->toDateString(),
            'monthly_rent' => 27000,
            'deposit_amount' => 25000,
            'tenant_signature' => null,
        ]);

        $this->withToken($tenantToken)
            ->patchJson('/api/tenant/lease-agreement', [
                'tenant_signature' => 'AT',
            ])
            ->assertOk();

        $this->withToken($managerToken)
            ->patchJson('/api/leases/' . $leaseId, [
                'manager_signature' => 'AM',
            ])
            ->assertOk()
            ->assertJsonPath('data.agreement_finalized', true);

        $this->withToken($tenantToken)
            ->patchJson('/api/tenant/lease-agreement', [
                'tenant_terms' => 'Attempted post-signature edit.',
            ])
            ->assertUnprocessable();

        $this->withToken($managerToken)
            ->patchJson('/api/leases/' . $leaseId, [
                'monthly_rent' => 28000,
            ])
            ->assertUnprocessable();
    }

    public function test_manager_deposit_confirmation_is_visible_to_tenant_from_same_deposit_record(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Deposit Manager',
            'username' => 'deposit-manager',
            'email' => 'deposit-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);
        $managerToken = $manager->createToken('deposit-manager')->plainTextToken;

        $tenantResponse = $this->withToken($managerToken)->postJson('/api/tenants', [
            'first_name' => 'Deposit',
            'last_name' => 'Tenant',
            'email' => 'deposit@example.test',
            'phone' => '+254744444444',
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'start_date' => now()->addDay()->toDateString(),
            'monthly_rent' => 25000,
            'deposit_amount' => 20000,
            'create_login' => true,
        ])->assertCreated();

        $tenant = Tenant::where('email', 'deposit@example.test')->firstOrFail();
        $tenantUser = User::where('tenant_id', $tenant->id)->firstOrFail();
        $tenantToken = $tenantUser->createToken('deposit-tenant')->plainTextToken;
        $leaseId = $tenant->leases()->value('id');

        $this->withToken($tenantToken)
            ->postJson('/api/tenant/deposit/mark-paid')
            ->assertOk();

        $this->withToken($managerToken)
            ->patchJson('/api/leases/' . $leaseId . '/deposit', [
                'amount_paid' => 20000,
                'payment_date' => now()->toDateString(),
            ])
            ->assertOk();

        $this->withToken($tenantToken)
            ->getJson('/api/tenant/lease-agreement')
            ->assertOk()
            ->assertJsonPath('data.deposit.status', 'paid')
            ->assertJsonPath('data.deposit.amount_paid', '20000.00');
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

    public function test_self_registered_pending_lease_is_visible_in_manager_lease_register(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();

        $registration = $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'requested_move_in_date' => now()->addMonth()->toDateString(),
            'requested_move_out_date' => now()->addYear()->toDateString(),
            'name' => 'Visible Tenant',
            'email' => 'visible@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Lease Manager',
            'username' => 'lease-register-manager',
            'email' => 'lease-register-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);

        $this->withToken($manager->createToken('lease-register')->plainTextToken)
            ->getJson('/api/leases')
            ->assertOk()
            ->assertJsonFragment([
                'status' => 'pending',
                'tenant_id' => Tenant::where('email', 'visible@example.test')->value('id'),
                'property_id' => $property->id,
                'unit_id' => $unit->id,
            ]);
    }

    public function test_manager_can_confirm_a_pending_registration_without_duplicating_its_tenant(): void
    {
        [$organization, $property, $unit] = $this->createPropertyInventory();
        $this->postJson('/api/register', [
            'role' => 'tenant',
            'organization_id' => $organization->id,
            'property_id' => $property->id,
            'unit_id' => $unit->id,
            'requested_move_in_date' => now()->addMonth()->toDateString(),
            'requested_move_out_date' => null,
            'name' => 'Pending Tenant',
            'email' => 'pending@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $manager = User::create([
            'organization_id' => $organization->id,
            'name' => 'Property Manager',
            'username' => 'pending-manager',
            'email' => 'pending-manager@example.test',
            'password' => Hash::make('ManagerPass123!'),
            'role' => 'admin',
        ]);

        $this->withToken($manager->createToken('pending-manager')->plainTextToken)
            ->postJson('/api/tenants', [
                'first_name' => 'Pending',
                'last_name' => 'Tenant',
                'email' => 'pending@example.test',
                'phone' => '+254700000000',
                'create_login' => true,
                'property_id' => $property->id,
                'unit_id' => $unit->id,
                'start_date' => now()->addMonth()->toDateString(),
                'monthly_rent' => 25000,
                'deposit_amount' => 0,
            ])
            ->assertCreated()
            ->assertJsonPath('account.created', false);

        $this->assertDatabaseCount('tenants', 1);
        $this->assertDatabaseCount('leases', 1);
        $this->assertDatabaseHas('tenants', [
            'email' => 'pending@example.test',
            'status' => 'active',
            'property_id' => $property->id,
            'unit_id' => $unit->id,
        ]);
        $this->assertSame('reserved', $unit->fresh()->status);
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
