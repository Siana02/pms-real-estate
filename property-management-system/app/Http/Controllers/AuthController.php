<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\SocialAccount;
use App\Services\LeaseProvisioner;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{

public function usernameAvailable(Request $request)
{
    $validated = $request->validate([
        'username' => ['required', 'string', 'min:3', 'max:30'],
    ]);

    $username = strtolower(trim($validated['username']));

    $exists = User::where('username', $username)->exists();

    return response()->json([
        'username' => $username,
        'available' => !$exists,
    ]);
}
    public function register(Request $request)
    {
        $role = $request->input('role', 'manager');

        // Tenant registration: join an existing organization
        if ($role === 'tenant') {
            $validated = $request->validate([
                'role' => ['nullable', 'string', 'in:manager,tenant'],
                'organization_id' => ['required', 'integer', 'exists:organizations,id'],
                'property_id' => [
                    'required',
                    'integer',
                    Rule::exists('properties', 'id')
                        ->where('organization_id', $request->input('organization_id')),
                ],
                'unit_id' => [
                    'required',
                    'integer',
                    Rule::exists('units', 'id')
                        ->where('property_id', $request->input('property_id')),
                ],
                'requested_move_in_date' => ['required', 'date', 'after_or_equal:today'],
                'requested_move_out_date' => ['nullable', 'date', 'after_or_equal:requested_move_in_date'],
                'preferred_location' => ['required', 'string', 'in:Nairobi,Watamu'],
                'name' => ['required', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:50'],
                'national_id' => ['nullable', 'string', 'max:100'],
                'employer_name' => ['nullable', 'string', 'max:255'],
                'employer_phone' => ['nullable', 'string', 'max:50'],
                'next_of_kin_name' => ['nullable', 'string', 'max:255'],
                'next_of_kin_phone' => ['nullable', 'string', 'max:50'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
                'oauth_registration_code' => ['nullable', 'string', 'size:64'],
            ]);

            $user = DB::transaction(function () use ($validated) {
                $tenant = Tenant::where('organization_id', $validated['organization_id'])
                    ->where('email', $validated['email'])
                    ->lockForUpdate()
                    ->first();

                $unit = Unit::whereKey($validated['unit_id'])
                    ->where('property_id', $validated['property_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                abort_if(
                    $unit->status === 'maintenance',
                    422,
                    'This unit is under maintenance and cannot be requested.'
                );

                // Availability is date-based when the tenant supplied dates.
                // A pending registration without dates is still a real lease
                // reservation awaiting manager confirmation.
                if (!empty($validated['requested_move_in_date'])) {
                    app(LeaseProvisioner::class)->assertNoOverlap(
                        $unit,
                        CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString(),
                        !empty($validated['requested_move_out_date'])
                            ? CarbonImmutable::parse($validated['requested_move_out_date'])->toDateString()
                            : null
                    );
                }

                $nameParts = preg_split('/\s+/', trim($validated['name']), 2);
                $firstName = $nameParts[0] ?? $validated['name'];
                $lastName = $nameParts[1] ?? '';

                $tenantData = [
                    'property_id' => $validated['property_id'],
                    'unit_id' => $validated['unit_id'],
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? '',
                    'national_id' => $validated['national_id'] ?? null,
                    'employer_name' => $validated['employer_name'] ?? null,
                    'employer_phone' => $validated['employer_phone'] ?? null,
                    'next_of_kin_name' => $validated['next_of_kin_name'] ?? null,
                    'next_of_kin_phone' => $validated['next_of_kin_phone'] ?? null,
                    'preferred_location' => $validated['preferred_location'],
                    'status' => 'pending',
                ];

                if ($tenant) {
                    $existingLease = $tenant->leases()
                        ->whereNotIn('status', ['ended', 'terminated'])
                        ->where(fn ($query) => $query
                            ->whereNull('end_date')
                            ->orWhereDate('end_date', '>=', CarbonImmutable::today()->toDateString()))
                        ->first();

                    abort_if(
                        $existingLease &&
                        ($existingLease->property_id !== $unit->property_id ||
                            $existingLease->unit_id !== $unit->id),
                        422,
                        'This email already has a tenancy assigned to a different unit.'
                    );

                    if ($existingLease) {
                        unset($tenantData['status']);
                    }
                    $tenant->update($tenantData);
                } else {
                    $tenant = Tenant::create([
                        'organization_id' => $validated['organization_id'],
                        ...$tenantData,
                    ]);
                }

                $baseUsername = Str::slug($validated['name'], '') ?: 'tenant';
                $username = $baseUsername;
                $counter = 1;

                while (User::where('username', $username)->exists()) {
                    $username = $baseUsername . $counter;
                    $counter++;
                }

                $user = User::create([
                    'organization_id' => $validated['organization_id'],
                    'tenant_id' => $tenant->id,
                    'name' => $validated['name'],
                    'username' => $username,
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'role' => 'tenant',
                    'must_change_password' => false,
                ]);

                $currentLease = $tenant->leases()
                    ->whereNotIn('status', ['ended', 'terminated'])
                    ->latest('id')
                    ->first();

                if ($currentLease === null) {
                    app(LeaseProvisioner::class)->createPending([
                        'property_id' => $validated['property_id'],
                        'unit_id' => $validated['unit_id'],
                        'requested_move_in_date' => $validated['requested_move_in_date'] ?? null,
                        'requested_move_out_date' => $validated['requested_move_out_date'] ?? null,
                    ], (int) $validated['organization_id'], $tenant);
                }

                return $user;
            });

            $this->linkOauthRegistration($request, $user);

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Account created successfully.',
                'token' => $token,
                'organization' => Organization::find($user->organization_id),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'organization_id' => $user->organization_id,
                    'tenant_id' => $user->tenant_id,
                    'must_change_password' => $user->must_change_password,
                ],
                'tenant' => [
                    'id' => $user->tenant_id,
                    'organization_id' => $user->organization_id,
                    'property_id' => $user->tenant?->property_id,
                    'unit_id' => $user->tenant?->unit_id,
                    'status' => $user->tenant?->status,
                ],
            ], 201);
        }

        // Manager registration: create a new organization + admin user
        $validated = $request->validate([
            'role' => ['nullable', 'string', 'in:manager,tenant'],
            'organization_name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'min:3', 'max:30', 'unique:organizations,username', 'unique:users,username'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'country' => ['required', 'string', 'max:255'],
            'oauth_registration_code' => ['nullable', 'string', 'size:64'],
        ]);

        $result = DB::transaction(function () use ($validated) {
            $organization = Organization::create([
                'name' => $validated['organization_name'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'country' => $validated['country'],
            ]);

            $user = User::create([
                'organization_id' => $organization->id,
                'name' => $validated['name'],
                'username' => $validated['username'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
            ]);

            $token = $user->createToken('auth-token')->plainTextToken;

            return [
                'organization' => $organization,
                'user' => $user,
                'token' => $token,
            ];
        });

        $this->linkOauthRegistration($request, $result['user']);

        return response()->json([
            'message' => 'Account created successfully.',
            'token' => $result['token'],
            'organization' => $result['organization'],
            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'username' => $result['user']->username,
                'email' => $result['user']->email,
                'role' => $result['user']->role,
                'organization_id' => $result['user']->organization_id,
            ],
        ], 201);
    }

   public function login(Request $request)
{
    // Accept the canonical "login" field and the legacy/alternate
    // "username" field so older clients cannot accidentally bypass
    // username authentication.
    $validated = $request->validate([
        'login' => ['nullable', 'string'],
        'username' => ['nullable', 'string'],
        'password' => ['required', 'string'],
    ]);

    $identity = trim((string) ($validated['login'] ?? $validated['username'] ?? ''));

    if ($identity === '') {
        return response()->json([
            'message' => 'Username or email is required.',
        ], 422);
    }

    $login = mb_strtolower($identity, 'UTF-8');

    $user = User::query()
        ->where(function ($query) use ($login) {
            $query->whereRaw('LOWER(TRIM(email)) = ?', [$login])
                ->orWhereRaw('LOWER(TRIM(username)) = ?', [$login]);
        })
        ->first();

    if (!$user || !Hash::check($validated['password'], $user->password)) {
        return response()->json([
            'message' => 'Invalid username/email or password.',
        ], 401);
    }

    $organization = Organization::find($user->organization_id);

    $token = $user->createToken('auth-token')->plainTextToken;

    return response()->json([
        'message' => 'Login successful.',
        'token' => $token,
        'organization' => $organization,
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'organization_id' => $user->organization_id,
            'tenant_id' => $user->tenant_id,
            'must_change_password' => (bool) $user->must_change_password,
        ],
    ]);
}


    public function redirectToProvider(Request $request, string $provider)
    {
        abort_unless(in_array($provider, ['google', 'apple'], true), 404);

        $mode = $request->query('mode', 'login');
        abort_unless(in_array($mode, ['login', 'register'], true), 422);

        session(['oauth_mode' => $mode, 'oauth_role' => $request->query('role')]);

        return Socialite::driver($provider)->redirect();
    }

    public function handleProviderCallback(Request $request, string $provider)
    {
        abort_unless(in_array($provider, ['google', 'apple'], true), 404);

        try {
            $oauthUser = Socialite::driver($provider)->user();
        } catch (\Throwable $e) {
            return redirect()->to($this->frontendUrl() . '/login?oauth_error=' . rawurlencode('We could not complete that sign-in. Please try again.'));
        }

        $providerId = (string) $oauthUser->getId();
        $email = strtolower(trim((string) $oauthUser->getEmail()));
        $name = trim((string) ($oauthUser->getName() ?: $email));

        if ($providerId === '') {
            return redirect()->to($this->frontendUrl() . '/login?oauth_error=' . rawurlencode('The provider did not return a usable identity.'));
        }

        $mode = session()->pull('oauth_mode', 'login');
        $oauthRole = session()->pull('oauth_role', null);
        $account = SocialAccount::with('user')
            ->where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();

        if ($account?->user) {
            $code = Str::random(64);
            Cache::put('oauth:login:' . hash('sha256', $code), ['user_id' => $account->user->id], now()->addMinutes(2));
            return redirect()->to($this->frontendUrl() . '/login?oauth_code=' . rawurlencode($code));
        }

        if ($email === '') {
            return redirect()->to($this->frontendUrl() . '/login?oauth_error=' . rawurlencode('The provider did not return an email address. Please use another sign-in method.'));
        }

        $existingEmail = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existingEmail) {
            return redirect()->to($this->frontendUrl() . '/login?oauth_error=' . rawurlencode('An account already exists with this email. Sign in with your password first, then connect ' . ucfirst($provider) . ' from your account settings.'));
        }

        if ($mode === 'login') {
            return redirect()->to($this->frontendUrl() . '/login?oauth_error=' . rawurlencode('No account is linked to this ' . ucfirst($provider) . ' identity yet. Create an account first.'));
        }

        $code = Str::random(64);
        Cache::put('oauth:registration:' . hash('sha256', $code), [
            'provider' => $provider,
            'provider_id' => $providerId,
            'email' => $email,
            'name' => $name,
            'avatar' => $oauthUser->getAvatar(),
            'role' => in_array($oauthRole, ['manager', 'tenant'], true) ? $oauthRole : 'manager',
        ], now()->addMinutes(10));

        return redirect()->to($this->frontendUrl() . '/register?oauth_code=' . rawurlencode($code));
    }

    public function exchangeOauthCode(Request $request)
    {
        $validated = $request->validate(['code' => ['required', 'string', 'size:64']]);
        $pending = Cache::pull('oauth:login:' . hash('sha256', $validated['code']));
        abort_unless(is_array($pending) && isset($pending['user_id']), 422, 'This sign-in link has expired. Please try again.');

        $user = User::findOrFail((int) $pending['user_id']);
        $organization = Organization::find($user->organization_id);
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'organization' => $organization,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'organization_id' => $user->organization_id,
                'tenant_id' => $user->tenant_id,
                'must_change_password' => (bool) $user->must_change_password,
            ],
        ]);
    }

    public function pendingOauthRegistration(string $code)
    {
        abort_unless(preg_match('/^[A-Za-z0-9]{64}$/', $code) === 1, 422, 'Invalid OAuth registration code.');
        $pending = Cache::get('oauth:registration:' . hash('sha256', $code));
        abort_unless(is_array($pending), 422, 'This registration link has expired. Please start again.');

        return response()->json([
            'provider' => $pending['provider'],
            'email' => $pending['email'],
            'name' => $pending['name'],
            'role' => $pending['role'] ?? 'manager',
        ]);
    }

    private function linkOauthRegistration(Request $request, User $user): void
    {
        $code = trim((string) $request->input('oauth_registration_code', ''));
        if ($code === '') {
            return;
        }

        $pending = Cache::pull('oauth:registration:' . hash('sha256', $code));

        abort_unless(is_array($pending), 422, 'This social registration link has expired. Please start again.');

        SocialAccount::create([
            'user_id' => $user->id,
            'provider' => $pending['provider'],
            'provider_id' => $pending['provider_id'],
            'email' => $pending['email'] ?? $user->email,
            'name' => $pending['name'] ?? $user->name,
            'avatar' => $pending['avatar'] ?? null,
        ]);
    }

    private function frontendUrl(): string
    {
        return rtrim((string) config('services.frontend.url'), '/');
    }

    /**
     * Change the authenticated user's password. Used both for the
     * mandatory first-login flow (temporary -> permanent password) and as
     * a general "change my password" action.
     */
    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Your current password is incorrect.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'organization_id' => $user->organization_id,
                'tenant_id' => $user->tenant_id,
                'must_change_password' => (bool) $user->must_change_password,
            ],
        ]);
    }
}