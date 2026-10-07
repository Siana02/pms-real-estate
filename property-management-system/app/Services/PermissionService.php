<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\User;

class PermissionService
{
    public static function syncCatalog(): void
    {
        foreach (config('permissions.catalog', []) as $key => [$name, $group]) {
            Permission::updateOrCreate(['key' => $key], ['name' => $name, 'group' => $group]);
        }
    }

    public function has(User $user, string $permission): bool
    {
        if (in_array($user->role, ['admin', 'owner'], true)) {
            return true;
        }

        if (!array_key_exists($permission, config('permissions.catalog', []))) {
            return false;
        }

        self::syncCatalog();
        $permissionId = Permission::where('key', $permission)->value('id');
        $override = $user->userPermissions()->where('permission_id', $permissionId)->first();

        if ($override) {
            return (bool) $override->granted;
        }

        return in_array($permission, config("permissions.role_defaults.{$user->role}", []), true);
    }

    public function keys(User $user): array
    {
        if (in_array($user->role, ['admin', 'owner'], true)) {
            return array_keys(config('permissions.catalog', []));
        }

        self::syncCatalog();
        $defaults = collect(config("permissions.role_defaults.{$user->role}", []));
        $overrides = $user->userPermissions()->with('permission')->get()
            ->mapWithKeys(fn ($item) => [$item->permission->key => (bool) $item->granted]);

        return $defaults->merge($overrides->keys())->unique()
            ->filter(fn ($key) => $overrides->has($key) ? $overrides->get($key) : true)
            ->values()->all();
    }

    public function grant(User $actor, User $target, string $permission, bool $granted): void
    {
        abort_unless(in_array($actor->role, ['admin', 'owner'], true), 403);
        abort_if($actor->organization_id !== $target->organization_id, 403);
        abort_if($target->role === 'tenant', 422, 'Tenant accounts cannot receive manager permissions.');

        self::syncCatalog();
        $permissionModel = Permission::where('key', $permission)->firstOrFail();

        $target->userPermissions()->updateOrCreate(
            ['permission_id' => $permissionModel->id],
            ['granted' => $granted, 'granted_by' => $actor->id]
        );
    }
}