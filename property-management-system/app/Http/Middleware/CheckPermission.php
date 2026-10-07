<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        abort_if(! $user, 401);
        abort_unless(app(PermissionService::class)->has($user, $permission), 403, 'You do not have permission to perform this action. You can request owner approval if needed.');
        return $next($request);
    }
}
