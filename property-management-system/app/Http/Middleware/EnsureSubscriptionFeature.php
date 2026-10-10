<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionFeature
{
    private const PLAN_FEATURES = [
        'basic' => ['payment_matching'],
        'standard' => ['payment_matching', 'tenant_payment_links'],
        'premium' => ['payment_matching', 'tenant_payment_links', 'tenant_portal', 'payment_ledger', 'premium_operations'],
    ];

    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $subscription = $request->user()?->organization?->platformSubscription;
        if (!$subscription || !$subscription->isActive()) {
            return response()->json(['message' => 'An active platform subscription is required.', 'code' => 'PLATFORM_SUBSCRIPTION_REQUIRED'], 402);
        }

        $allowed = self::PLAN_FEATURES[$subscription->plan_code] ?? [];
        if (!in_array($feature, $allowed, true)) {
            return response()->json([
                'message' => 'This feature is not included in your organization’s current subscription tier.',
                'code' => 'SUBSCRIPTION_FEATURE_NOT_INCLUDED',
                'required_feature' => $feature,
                'current_plan' => $subscription->plan_code,
            ], 403);
        }

        return $next($request);
    }
}
