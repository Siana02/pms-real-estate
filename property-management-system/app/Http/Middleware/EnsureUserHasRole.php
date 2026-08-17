<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level authorization: `->middleware('role:property_manager,admin')`.
 *
 * Register in bootstrap/app.php (Laravel 11+):
 *
 *   $middleware->alias(['role' => \App\Http\Middleware\EnsureUserHasRole::class]);
 *
 * or in app/Http/Kernel.php $middlewareAliases for Laravel 10.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_if($user === null, 401, 'Unauthenticated.');

        abort_if(
            $user->organization_id === null,
            403,
            'Your account is not linked to an organization.'
        );

        abort_if(
            ! in_array((string) $user->role, $roles, true),
            403,
            'Your account does not have access to this area.'
        );

        return $next($request);
    }
}
