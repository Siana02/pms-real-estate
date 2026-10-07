<?php

namespace App\Http\Controllers;

use App\Mail\TeamInvitationMail;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    private const MANAGER_ROLES = ['admin', 'owner'];

    private const EMPLOYEE_ROLES = ['property_manager', 'staff'];

    public function index(Request $request)
    {
        $this->authorizeTeamManagement($request);

        $organizationId = $request->user()->organization_id;

        $employees = User::query()
            ->where('organization_id', $organizationId)
            ->whereIn('role', self::EMPLOYEE_ROLES)
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 WHEN status = 'invited' THEN 1 ELSE 2 END")
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->presentUser($user));

        return response()->json(['data' => $employees->values()]);
    }

    public function invite(Request $request)
    {
        $this->authorizeTeamManagement($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(self::EMPLOYEE_ROLES)],
        ]);

        $organizationId = $request->user()->organization_id;
        $email = strtolower(trim($validated['email']));

        $existing = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($existing) {
            abort_if(
                $existing->organization_id !== $organizationId,
                422,
                'That email address already belongs to another organization.'
            );

            abort_if(
                $existing->role === 'tenant',
                422,
                'That email address belongs to a tenant account and cannot be added as an employee.'
            );

            abort_if(
                $existing->status !== 'deactivated',
                422,
                'That employee already has an active or pending team account.'
            );
        }

        $baseUsername = Str::slug($validated['name'], '') ?: 'staff';
        $username = $baseUsername;
        $counter = 1;

        while (
            User::where('username', $username)
                ->when($existing, fn ($query) => $query->where('id', '!=', $existing->id))
                ->exists()
        ) {
            $username = $baseUsername . $counter;
            $counter++;
        }

        $temporaryPassword = Str::random(40);

        $user = $existing ?: new User();
        $user->fill([
            'organization_id' => $organizationId,
            'name' => trim($validated['name']),
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($temporaryPassword),
            'role' => $validated['role'],
            'status' => 'invited',
            'last_active_at' => null,
            'must_change_password' => true,
            'tenant_id' => null,
        ]);
        $user->save();

        $invitation = $this->createInvitation($user, $request->user());
        $delivery = $this->sendInvitation($invitation);

        return response()->json([
            'message' => $delivery['email_sent']
                ? 'Invitation sent successfully.'
                : 'Invitation created, but the email could not be sent. You can copy the invitation link and send it manually.',
            'employee' => $this->presentUser($user->fresh()),
            'email_sent' => $delivery['email_sent'],
            'invitation_url' => $delivery['invitation_url'],
        ], 201);
    }

    public function updateRole(Request $request, User $user)
    {
        $this->authorizeTeamManagement($request);
        $this->authorizeEmployee($request, $user);

        $validated = $request->validate([
            'role' => ['required', Rule::in(self::EMPLOYEE_ROLES)],
        ]);

        $user->update(['role' => $validated['role']]);

        return response()->json([
            'message' => 'Employee role updated.',
            'employee' => $this->presentUser($user->fresh()),
        ]);
    }

    public function deactivate(Request $request, User $user)
    {
        $this->authorizeTeamManagement($request);
        $this->authorizeEmployee($request, $user);

        abort_if($user->status === 'deactivated', 422, 'This employee is already deactivated.');

        $user->update(['status' => 'deactivated']);
        $user->tokens()->delete();
        $user->teamInvitations()
            ->whereNull('accepted_at')
            ->update(['expires_at' => now()]);

        return response()->json([
            'message' => 'Employee deactivated. Their historical activity remains attached to their account.',
            'employee' => $this->presentUser($user->fresh()),
        ]);
    }

    public function reactivate(Request $request, User $user)
    {
        $this->authorizeTeamManagement($request);
        $this->authorizeEmployee($request, $user);

        abort_if($user->status !== 'deactivated', 422, 'This employee is not deactivated.');

        $user->update(['status' => 'active']);

        return response()->json([
            'message' => 'Employee reactivated.',
            'employee' => $this->presentUser($user->fresh()),
        ]);
    }

    public function resendInvitation(Request $request, User $user)
    {
        $this->authorizeTeamManagement($request);
        $this->authorizeEmployee($request, $user);

        abort_if($user->status !== 'invited', 422, 'This employee does not have a pending invitation.');

        $invitation = $this->createInvitation($user, $request->user());
        $delivery = $this->sendInvitation($invitation);

        return response()->json([
            'message' => $delivery['email_sent']
                ? 'Invitation resent successfully.'
                : 'Invitation refreshed, but the email could not be sent. You can copy the invitation link and send it manually.',
            'employee' => $this->presentUser($user->fresh()),
            'email_sent' => $delivery['email_sent'],
            'invitation_url' => $delivery['invitation_url'],
        ]);
    }

    public function showInvitation(string $token)
    {
        $invitation = $this->findInvitation($token);

        return response()->json([
            'valid' => true,
            'expires_at' => $invitation->expires_at,
            'employee' => [
                'name' => $invitation->user->name,
                'email' => $invitation->user->email,
                'role' => $invitation->user->role,
            ],
            'organization' => [
                'id' => $invitation->organization->id,
                'name' => $invitation->organization->name,
                'logo_url' => $invitation->organization->logo_url,
            ],
        ]);
    }

    public function acceptInvitation(Request $request, string $token)
    {
        $invitation = $this->findInvitation($token);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $invitation->user;

        abort_if($user->status === 'suspended', 422, 'This account is suspended. Contact the organization administrator.');
        abort_if($user->status === 'deactivated', 422, 'This account has been deactivated. Contact the organization administrator.');

        $user->update([
            'password' => Hash::make($validated['password']),
            'status' => 'active',
            'must_change_password' => false,
            'email_verified_at' => $user->email_verified_at ?? now(),
            'last_active_at' => now(),
        ]);

        $invitation->update(['accepted_at' => now()]);

        $user->teamInvitations()
            ->whereNull('accepted_at')
            ->whereKeyNot($invitation->id)
            ->update(['expires_at' => now()]);

        $tokenValue = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Invitation accepted successfully.',
            'token' => $tokenValue,
            'organization' => $user->organization,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'organization_id' => $user->organization_id,
                'tenant_id' => $user->tenant_id,
                'must_change_password' => false,
            ],
        ]);
    }

    private function authorizeTeamManagement(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, self::MANAGER_ROLES, true),
            403,
            'Only the organization owner or administrator can manage team accounts.'
        );
    }

    private function authorizeEmployee(Request $request, User $user): void
    {
        abort_if(
            $user->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this employee.'
        );

        abort_if(
            ! in_array($user->role, self::EMPLOYEE_ROLES, true),
            422,
            'Owner and administrator accounts cannot be managed from the employee list.'
        );

        abort_if(
            $user->id === $request->user()->id,
            422,
            'You cannot manage your own employee account from this page.'
        );
    }

    private function createInvitation(User $user, User $inviter): TeamInvitation
    {
        TeamInvitation::query()
            ->where('user_id', $user->id)
            ->whereNull('accepted_at')
            ->update(['expires_at' => now()]);

        $rawToken = Str::random(64);

        return TeamInvitation::create([
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
            'invited_by' => $inviter->id,
            'token_hash' => hash('sha256', $rawToken),
            'expires_at' => now()->addDays(7),
            'last_sent_at' => now(),
        ])->tap(function (TeamInvitation $invitation) use ($rawToken) {
            $invitation->setAttribute('raw_token', $rawToken);
        });
    }

    private function sendInvitation(TeamInvitation $invitation): array
    {
        $rawToken = (string) $invitation->getAttribute('raw_token');
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $invitationUrl = $frontendUrl . '/accept-invite?token=' . rawurlencode($rawToken);

        $emailSent = true;

        try {
            Mail::to($invitation->user->email)->send(
                new TeamInvitationMail($invitation, $invitationUrl)
            );
        } catch (\Throwable $e) {
            $emailSent = false;
            Log::warning('Team invitation email could not be sent.', [
                'user_id' => $invitation->user_id,
                'email' => $invitation->user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return [
            'email_sent' => $emailSent,
            'invitation_url' => $invitationUrl,
        ];
    }

    private function findInvitation(string $token): TeamInvitation
    {
        abort_if(
            ! preg_match('/^[A-Za-z0-9]{64}$/', $token),
            404,
            'This invitation link is invalid.'
        );

        $invitation = TeamInvitation::with(['user', 'organization'])
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->first();

        abort_if($invitation === null, 404, 'This invitation link is invalid or has already been used.');
        abort_if($invitation->expires_at->isPast(), 410, 'This invitation link has expired. Ask the administrator to resend it.');

        return $invitation;
    }

    private function presentUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'last_active_at' => $user->last_active_at?->toIso8601String(),
            'invited_at' => $user->teamInvitations()->latest('id')->value('created_at'),
            'invitation_expires_at' => $user->teamInvitations()
                ->whereNull('accepted_at')
                ->latest('id')
                ->value('expires_at'),
        ];
    }
}
