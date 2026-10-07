<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse;

class PasskeyLoginResponse implements PasskeyLoginResponse
{
    public function toResponse($request): JsonResponse
    {
        $user = $request->user();

        abort_if(
            $user->status !== 'active',
            403,
            'Your account is not active. Contact the organization administrator.'
        );

        $user->forceFill(['last_active_at' => now()])->save();

        return response()->json([
            'message' => 'Login successful.',
            'token' => $user->createToken('auth-token')->plainTextToken,
            'organization' => $user->organization,
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
