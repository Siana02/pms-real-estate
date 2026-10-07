<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationOwnershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_manager_registration_becomes_the_organization_owner(): void
    {
        $response = $this->postJson('/api/register', [
            'role' => 'manager',
            'organization_name' => 'Owner Test Properties',
            'username' => 'owner-test-properties',
            'name' => 'Primary Owner',
            'email' => 'owner@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'country' => 'Kenya',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'admin');

        $user = User::where('email', 'owner@example.test')->firstOrFail();
        $organization = Organization::where('name', 'Owner Test Properties')->firstOrFail();

        $this->assertSame($user->id, $organization->owner_user_id);
        $this->assertSame($user->id, $organization->owner->id);
        $this->assertSame($organization->id, $user->organization_id);
    }
}
