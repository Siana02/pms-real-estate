<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use App\Models\Tenant;
use App\Models\Unit;
use App\Services\LeaseProvisioner;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                'requested_move_in_date' => ['required', 'date'],
                'requested_move_out_date' => ['nullable', 'date', 'after_or_equal:requested_move_in_date'],
                'name' => ['required', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:50'],
                'national_id' => ['nullable', 'string', 'max:100'],
                'employer_name' => ['nullable', 'string', 'max:255'],
                'employer_phone' => ['nullable', 'string', 'max:50'],
                'next_of_kin_name' => ['nullable', 'string', 'max:255'],
                'next_of_kin_phone' => ['nullable', 'string', 'max:50'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
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

                // Availability is date-based. A future tenant may reserve a unit
                // that is currently occupied, provided their requested dates do
                // not overlap an existing reservation/tenancy.
                app(LeaseProvisioner::class)->assertNoOverlap(
                    $unit,
                    CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString(),
                    !empty($validated['requested_move_out_date'])
                        ? CarbonImmutable::parse($validated['requested_move_out_date'])->toDateString()
                        : null
                );

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
                        'requested_move_in_date' => $validated['requested_move_in_date'],
                        'requested_move_out_date' => $validated['requested_move_out_date'] ?? null,
                    ], (int) $validated['organization_id'], $tenant);
                }

                return $user;
            });

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
    $credentials = $request->validate([
        'login' => ['required', 'string'],
        'password' => ['required', 'string'],
    ]);

    $user = User::where('email', $credentials['login'])
        ->orWhere('username', $credentials['login'])
        ->first();

    if (!$user || !Hash::check($credentials['password'], $user->password)) {
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