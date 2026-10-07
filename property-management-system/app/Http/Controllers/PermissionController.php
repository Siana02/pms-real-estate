<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PermissionService;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function catalog(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403);

        app(PermissionService::class)::syncCatalog();

        return response()->json([
            'permissions' => collect(config('permissions.catalog', []))
                ->map(fn ($value, $key) => ['key' => $key, 'name' => $value[0], 'group' => $value[1]])
                ->values(),
        ]);
    }

    public function user(Request $request, User $user)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403);
        $this->authorizeEmployee($request, $user);

        return response()->json([
            'permissions' => app(PermissionService::class)->keys($user),
            'overrides' => $user->userPermissions()->with('permission')->get()
                ->map(fn ($item) => ['key' => $item->permission->key, 'granted' => $item->granted])
                ->values(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403);
        $this->authorizeEmployee($request, $user);

        $validated = $request->validate([
            'permission' => ['required', 'string'],
            'granted' => ['required', 'boolean'],
        ]);

        app(PermissionService::class)->grant(
            $request->user(),
            $user,
            $validated['permission'],
            $validated['granted']
        );

        return response()->json([
            'message' => 'Permission updated.',
            'permissions' => app(PermissionService::class)->keys($user->fresh()),
        ]);
    }

    private function authorizeEmployee(Request $request, User $user): void
    {
        abort_if($user->organization_id !== $request->user()->organization_id, 403);
        abort_unless(in_array($user->role, ['property_manager', 'staff'], true), 422, 'Only employee accounts can be customized.');
    }
}