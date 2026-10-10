<?php

namespace App\Http\Controllers;

use App\Models\PlatformSubscription;
use App\Models\PlatformSubscriptionPayment;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlatformSubscriptionController extends Controller
{
    private function plans(): array
    {
        return [
            'basic' => [
                'code' => 'basic', 'name' => 'Basic', 'price_model' => 'flat',
                'base_rate' => 100, 'description' => 'Essential property and unit records with database payment matching.',
                'features' => ['Property, unit, tenancy and lease records', 'Incoming payment matching to the organization database', 'Monthly reconciliation and payment status overview', 'Core reporting and exports', 'No tenant portal or tenant payment links'],
            ],
            'standard' => [
                'code' => 'standard', 'name' => 'Standard', 'price_model' => 'flat',
                'base_rate' => 125, 'description' => 'Payment matching plus shareable tenant payment links, without tenant portal accounts.',
                'features' => ['Everything in Basic', 'Shareable tenant payment links', 'Payment destination instructions for tenants', 'Database matching and reconciliation ledger', 'No tenant portal registration or self-service tenant dashboard'],
            ],
            'premium' => [
                'code' => 'premium', 'name' => 'Premium', 'price_model' => 'unit_type',
                'base_rate' => null, 'description' => 'Full tenant-facing experience and the complete management toolkit, priced by unit type.',
                'features' => ['Everything in Standard', 'Tenant portal registration and onboarding', 'Tenant dashboard, lease and payment views', 'Tenant payment links', 'Full payment matching, reconciliation and ledger', 'Maintenance requests, notifications and tenant self-service', 'Expanded reporting, audit history and management workflows'],
            ],
        ];
    }

    private function normalizedType(?string $type): string
    {
        return strtolower(trim((string) $type));
    }

    private function rateFor(string $plan, ?string $type, array $overrides = []): int
    {
        $normalized = $this->normalizedType($type);
        foreach ($overrides as $key => $rate) {
            if ($this->normalizedType((string) $key) === $normalized && is_numeric($rate)) {
                return max(0, (int) $rate);
            }
        }

        if ($plan === 'basic') return 100;
        if ($plan === 'standard') return 125;
        if (str_contains($normalized, 'bed-sit') || str_contains($normalized, 'bedsitter') || str_contains($normalized, 'studio')) return 100;
        if (preg_match('/(\d+)\s*[- ]?\s*(?:bed|bedroom)/', $normalized, $matches)) {
            $bedrooms = max(1, (int) $matches[1]);
            return $bedrooms === 1 ? 150 : 200 + (($bedrooms - 2) * 50);
        }
        if (str_contains($normalized, 'one bedroom') || str_contains($normalized, '1 bedroom')) return 150;
        if (str_contains($normalized, 'two bedroom') || str_contains($normalized, '2 bedroom')) return 200;
        return 150;
    }

    private function quote(Organization $organization, string $planCode, array $overrides = []): array
    {
        $units = $organization->properties()->with('units:id,property_id,unit_type')->get()
            ->flatMap(fn ($property) => $property->units);
        $amount = $units->sum(fn ($unit) => $this->rateFor($planCode, $unit->unit_type, $overrides));
        return ['billable_units' => $units->count(), 'monthly_amount' => $amount];
    }

    public function status(Request $request)
    {
        $organization = $request->user()->organization;
        if (!$organization) return response()->json(['message' => 'No organization is associated with this account.'], 422);

        $subscription = $organization->platformSubscription;
        $plans = array_values($this->plans());
        $quote = $subscription ? $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? []) : null;
        return response()->json([
            'plans' => $plans,
            'subscription' => $subscription,
            'quote' => $quote,
            'till_number' => config('services.platform_billing.till_number'),
            'payment_setup_ready' => filled(config('services.platform_billing.till_number')),
            'payments' => $subscription ? $subscription->payments()->latest()->limit(10)->get() : [],
        ]);
    }

    public function select(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403, 'Only the organization owner or primary administrator can manage the platform subscription.');
        $validated = $request->validate(['plan_code' => ['required', Rule::in(array_keys($this->plans()))]]);
        $organization = $request->user()->organization;
        abort_if(!$organization, 422, 'No organization is associated with this account.');

        $subscription = DB::transaction(function () use ($organization, $validated, $request) {
            $subscription = PlatformSubscription::firstOrNew(['organization_id' => $organization->id]);
            if ($subscription->exists && $subscription->status === 'active' && $subscription->current_period_ends_at?->isFuture()) {
                abort(409, 'Your subscription is active. Contact platform support to change plans or negotiate a custom quote.');
            }
            $subscription->fill([
                'plan_code' => $validated['plan_code'],
                'status' => 'pending_payment',
                'billing_cycle' => 'monthly',
                'selected_by' => $request->user()->id,
                'current_period_starts_at' => null,
                'current_period_ends_at' => null,
            ]);
            $quote = $this->quote($organization, $validated['plan_code'], $subscription->pricing_overrides ?? []);
            $subscription->billable_units = $quote['billable_units'];
            $subscription->monthly_amount = $quote['monthly_amount'];
            $subscription->save();
            return $subscription;
        });

        return response()->json([
            'message' => 'Plan selected. Payment is required before organization onboarding can continue.',
            'subscription' => $subscription->fresh(),
            'quote' => $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? []),
            'payment_setup_ready' => filled(config('services.platform_billing.till_number')),
        ], 201);
    }

    public function submitPayment(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403, 'Only the organization owner or primary administrator can submit subscription payment details.');
        $validated = $request->validate([
            'reference' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:1'],
        ]);
        $organization = $request->user()->organization;
        $subscription = $organization?->platformSubscription;
        abort_if(!$subscription, 422, 'Choose a subscription plan first.');
        abort_if(!filled(config('services.platform_billing.till_number')), 409, 'The platform M-Pesa Till has not been configured yet.');
        abort_if((float) $validated['amount'] < (float) $subscription->monthly_amount, 422, 'The payment amount is below the current monthly subscription quote.');

        $payment = PlatformSubscriptionPayment::create([
            'platform_subscription_id' => $subscription->id,
            'organization_id' => $organization->id,
            'amount' => $validated['amount'],
            'method' => 'mpesa_till',
            'reference' => strtoupper(trim($validated['reference'])),
            'status' => 'pending_verification',
        ]);

        return response()->json(['message' => 'Payment reference submitted for verification. Access will activate after the payment is confirmed.', 'payment' => $payment], 201);
    }

    public function verifyPayment(Request $request, PlatformSubscriptionPayment $payment)
    {
        abort_unless($request->user()->role === 'platform_admin', 403, 'Platform administrator access is required.');
        $validated = $request->validate(['approved' => ['required', 'boolean'], 'notes' => ['nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($payment, $request, $validated) {
            $payment->refresh();
            if ($payment->status !== 'pending_verification') abort(409, 'This payment has already been reviewed.');
            $payment->update([
                'status' => $validated['approved'] ? 'confirmed' : 'rejected',
                'verified_by' => $request->user()->id,
                'paid_at' => $validated['approved'] ? now() : null,
                'notes' => $validated['notes'] ?? null,
            ]);
            if ($validated['approved']) {
                $subscription = PlatformSubscription::whereKey($payment->platform_subscription_id)->lockForUpdate()->firstOrFail();
                $organization = Organization::findOrFail($subscription->organization_id);
                $quote = $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? []);
                $starts = now();
                $subscription->update([
                    'status' => 'active',
                    'billable_units' => $quote['billable_units'],
                    'monthly_amount' => $quote['monthly_amount'],
                    'current_period_starts_at' => $starts,
                    'current_period_ends_at' => $starts->copy()->addMonth(),
                    'last_payment_at' => $starts,
                ]);
            }
        });
        return response()->json(['message' => $validated['approved'] ? 'Payment confirmed and subscription activated.' : 'Payment rejected.', 'payment' => $payment->fresh()]);
    }

    public function setCustomPricing(Request $request, Organization $organization)
    {
        abort_unless($request->user()->role === 'platform_admin', 403, 'Platform administrator access is required.');
        $validated = $request->validate([
            'pricing_overrides' => ['required', 'array'],
            'pricing_overrides.*' => ['required', 'numeric', 'min:0', 'max:100000'],
        ]);
        $subscription = $organization->platformSubscription;
        abort_if(!$subscription, 404, 'The organization has not selected a subscription.');
        $subscription->update(['pricing_overrides' => $validated['pricing_overrides']]);
        $quote = $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? []);
        $subscription->update(['billable_units' => $quote['billable_units'], 'monthly_amount' => $quote['monthly_amount']]);
        return response()->json(['message' => 'Negotiated unit rates saved.', 'subscription' => $subscription->fresh(), 'quote' => $quote]);
    }
}
