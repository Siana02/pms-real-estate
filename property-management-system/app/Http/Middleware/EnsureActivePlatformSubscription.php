<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActivePlatformSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || !$user->organization_id) {
            return response()->json(['message' => 'An active organization subscription is required.'], 402);
        }

        $subscription = $user->organization?->platformSubscription;
        if (!$subscription || !$subscription->isActive()) {
            if ($subscription && $subscription->status === 'active') {
                $subscription->update(['status' => 'past_due']);
            }

            return response()->json([
                'message' => 'Your organization needs an active platform subscription to use this area.',
                'code' => 'PLATFORM_SUBSCRIPTION_REQUIRED',
                'subscription_status' => $subscription?->status ?? 'not_selected',
            ], 402);
        }

        return $next($request);
    }
}
