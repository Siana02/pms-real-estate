<?php

namespace Tests\Feature;

use App\Models\EmployeeRequest;
use App\Models\Organization;
use App\Models\PlatformSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeRequestReplyTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_owner_can_reply_and_reply_is_saved_separately_from_request(): void
    {
        [$organization, $owner] = $this->workspace('reply-owner');
        $request = EmployeeRequest::create([
            'organization_id' => $organization->id,
            'created_by' => $this->staff($organization->id, 'reply-staff')->id,
            'type' => 'payment_correction',
            'title' => 'October rent receipt missing',
            'description' => 'The tenant paid but the receipt is not visible.',
            'priority' => 'high',
            'status' => 'open',
        ]);

        $response = $this->withToken($owner->createToken('request-reply')->plainTextToken)
            ->patchJson('/api/requests/' . $request->id, [
                'owner_reply' => 'We are checking the M-Pesa statement and will update the ledger after verification.',
            ]);

        $response->assertOk()
            ->assertJsonPath('request.owner_reply', 'We are checking the M-Pesa statement and will update the ledger after verification.')
            ->assertJsonPath('request.replier.id', $owner->id)
            ->assertJsonPath('request.status', 'open');

        $this->assertDatabaseHas('employee_requests', [
            'id' => $request->id,
            'description' => 'The tenant paid but the receipt is not visible.',
            'owner_reply' => 'We are checking the M-Pesa statement and will update the ledger after verification.',
            'replied_by' => $owner->id,
            'status' => 'open',
        ]);
    }

    public function test_staff_cannot_write_an_owner_reply(): void
    {
        [$organization] = $this->workspace('reply-permissions');
        $staff = $this->staff($organization->id, 'reply-permissions-staff');
        $request = EmployeeRequest::create([
            'organization_id' => $organization->id,
            'created_by' => $staff->id,
            'type' => 'general',
            'title' => 'Need approval',
            'description' => 'Please approve this request.',
            'priority' => 'normal',
            'status' => 'open',
        ]);

        $this->withToken($staff->createToken('staff-request')->plainTextToken)
            ->patchJson('/api/requests/' . $request->id, [
                'owner_reply' => 'Approved.',
            ])->assertForbidden();

        $this->assertNull($request->fresh()->owner_reply);
        $this->assertNull($request->fresh()->replied_by);
    }

    private function workspace(string $suffix): array
    {
        $organization = Organization::create([
            'name' => 'Request Reply ' . $suffix,
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
        $owner = User::create([
            'organization_id' => $organization->id,
            'name' => 'Request Owner',
            'username' => 'owner-' . $suffix,
            'email' => $suffix . '-owner@example.test',
            'password' => Hash::make('OwnerPass123!'),
            'role' => 'admin',
        ]);
        return [$organization, $owner];
    }

    private function staff(int $organizationId, string $suffix): User
    {
        return User::create([
            'organization_id' => $organizationId,
            'name' => 'Request Staff',
            'username' => $suffix,
            'email' => $suffix . '@example.test',
            'password' => Hash::make('StaffPass123!'),
            'role' => 'staff',
        ]);
    }
}
