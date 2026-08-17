<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            $user = DB::transaction(function () use ($validated) {
                return User::create([
                    'organization_id' => $validated['organization_id'],
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'role' => 'tenant',
                ]);
            });

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Account created successfully.',
                'token' => $token,
                'organization' => Organization::find($user->organization_id),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'organization_id' => $user->organization_id,
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
        'email' => ['required', 'email'],
        'password' => ['required'],
    ]);

    $user = User::where('email', $credentials['email'])->first();

    if (!$user || !Hash::check($credentials['password'], $user->password)) {
        return response()->json([
            'message' => 'Invalid email or password.',
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
            'email' => $user->email,
            'role' => $user->role,
            'organization_id' => $user->organization_id,
        ],
    ]);
}}