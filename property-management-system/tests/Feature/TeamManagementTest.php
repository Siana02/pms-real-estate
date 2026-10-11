<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\PlatformSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TeamManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_invite_accept_deactivate_and_reactivate_an_employee(): void
    {
        Mail::fake();

        $organization = Organization::create([
            'name' => 'ABC Properties Limited',
            'username' => 'abc-properties',
            'email' => 'owner@example.com',
            'country' => 'Kenya',
        ]);

        $this->activateSubscription($organization);

        $owner = User::create([
            'organization_id' => $organization->id,
            'name' => 'Owner User',
            'username' => 'owneruser',
            'email' => 'owner@example.com',
            'password' => Hash::make('OwnerPass123!'),
            'role' => 'admin',
        ]);

        $organization->update(['owner_user_id' => $owner->id]);

        $ownerToken = $owner->createToken('test')->plainTextToken;

        $invite = $this->withFreshToken($ownerToken)->postJson('/api/team/invite', [
            'name' => 'Jane Wanjiku',
            'email' => 'jane@example.com',
            'role' => 'property_manager',
        ]);

        $invite->assertCreated()
            ->assertJsonPath('employee.name', 'Jane Wanjiku')
            ->assertJsonPath('employee.role', 'property_manager')
            ->assertJsonPath('employee.status', 'invited')
            ->assertJsonPath('email_sent', true);

        Mail::assertSent(\App\Mail\TeamInvitationMail::class);

        $employee = User::where('email', 'jane@example.com')->firstOrFail();
        $invitationUrl = $invite->json('invitation_url');
        $token = parse_url($invitationUrl, PHP_URL_QUERY);
        parse_str((string) $token, $query);
        $rawInvitationToken = $query['token'] ?? null;

        $this->assertNotEmpty($rawInvitationToken);

        $this->getJson('/api/team/invitations/' . $rawInvitationToken)
            ->assertOk()
            ->assertJsonPath('employee.email', 'jane@example.com');

        $accepted = $this->postJson('/api/team/invitations/' . $rawInvitationToken . '/accept', [
            'password' => 'EmployeePass123!',
            'password_confirmation' => 'EmployeePass123!',
        ]);

        $accepted->assertOk()
            ->assertJsonPath('user.status', 'active')
            ->assertJsonPath('user.role', 'property_manager');

        $employee->refresh();
        $this->assertSame('active', $employee->status);
        $this->assertTrue(Hash::check('EmployeePass123!', $employee->password));

        $deactivate = $this->withFreshToken($ownerToken)
            ->patchJson('/api/team/' . $employee->id . '/deactivate');

        $deactivate->assertOk()
            ->assertJsonPath('employee.status', 'deactivated');

        $this->assertDatabaseHas('users', [
            'id' => $employee->id,
            'organization_id' => $organization->id,
            'status' => 'deactivated',
        ]);

        $reactivate = $this->withFreshToken($ownerToken)
            ->patchJson('/api/team/' . $employee->id . '/reactivate');

        $reactivate->assertOk()
            ->assertJsonPath('employee.status', 'active');

        $this->assertDatabaseHas('users', [
            'id' => $employee->id,
            'status' => 'active',
        ]);
    }

    public function test_employee_cannot_manage_the_team(): void
    {
        $organization = Organization::create([
            'name' => 'ABC Properties Limited',
            'username' => 'abc-properties-2',
            'email' => 'owner2@example.com',
            'country' => 'Kenya',
        ]);

        $this->activateSubscription($organization);

        $employee = User::create([
            'organization_id' => $organization->id,
            'name' => 'Staff User',
            'username' => 'staffuser',
            'email' => 'staff@example.com',
            'password' => Hash::make('StaffPass123!'),
            'role' => 'staff',
        ]);

        $token = $employee->createToken('test')->plainTextToken;

        $this->withFreshToken($token)
            ->getJson('/api/team')
            ->assertForbidden();
    }
    private function withFreshToken(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function activateSubscription(Organization $organization): void
    {
        PlatformSubscription::create([
            'organization_id' => $organization->id,
            'plan_code' => 'premium',
            'status' => 'active',
            'billable_units' => 1,
            'monthly_amount' => 150,
            'current_period_starts_at' => now()->subDay(),
            'current_period_ends_at' => now()->addMonth(),
        ]);
    }

}
