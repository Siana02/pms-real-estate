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
                'base_rate' => 100, 'description' => 'A lean recordkeeping plan focused on matching incoming payments to your property database.',
                'features' => ['Property, unit and tenancy reference records required for matching', 'Incoming payment matching against the organization database', 'Basic matched and unmatched payment status', 'No tenant portal, tenant registration, payment links, full ledger or premium operations'],
            ],
            'standard' => [
                'code' => 'standard', 'name' => 'Standard', 'price_model' => 'flat',
                'base_rate' => 125, 'description' => 'Payment matching plus shareable tenant payment links, without tenant portal accounts.',
                'features' => ['Everything in Basic', 'Shareable tenant payment links', 'Payment destination instructions for tenants', 'Payment matching and basic reconciliation status', 'No tenant portal registration, full payment ledger or premium operations'],
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
        if (str_contains($normalized, '20+ bedroom')) return 1100;
        if (str_contains($normalized, 'bed-sit') || str_contains($normalized, 'bedsitter') || str_contains($normalized, 'studio')) return 100;
        if (preg_match('/(\d+)\s*[- ]?\s*(?:bed|bedroom)/', $normalized, $matches)) {
            $bedrooms = max(1, (int) $matches[1]);
            return $bedrooms === 1 ? 150 : 200 + (($bedrooms - 2) * 50);
        }
        if (str_contains($normalized, 'one bedroom') || str_contains($normalized, '1 bedroom')) return 150;
        if (str_contains($normalized, 'two bedroom') || str_contains($normalized, '2 bedroom')) return 200;
        return 150;
    }

    private function quoteFromMix(string $planCode, array $mix, array $overrides = []): array
    {
        $count = 0; $amount = 0;
        foreach ($mix as $unitType => $quantity) { $quantity = max(0, (int) $quantity); $count += $quantity; $amount += $quantity * $this->rateFor($planCode, (string) $unitType, $overrides); }
        return ['billable_units' => $count, 'monthly_amount' => $amount];
    }

    private function quote(Organization $organization, string $planCode, array $overrides = [], array $fallbackMix = []): array
    {
        $units = $organization->properties()->with('units:id,property_id,unit_type')->get()->flatMap(fn ($property) => $property->units);
        if ($units->isEmpty() && $fallbackMix) return $this->quoteFromMix($planCode, $fallbackMix, $overrides);
        $amount = $units->sum(fn ($unit) => $this->rateFor($planCode, $unit->unit_type, $overrides));
        return ['billable_units' => $units->count(), 'monthly_amount' => $amount];
    }

    public function status(Request $request)
    {
        $organization = $request->user()->organization;
        if (!$organization) return response()->json(['message' => 'No organization is associated with this account.'], 422);

        $subscription = $organization->platformSubscription;
        if ($subscription && $subscription->status === 'active' && (!$subscription->current_period_ends_at || $subscription->current_period_ends_at->isPast())) {
            $subscription->update(['status' => 'past_due']);
        }
        $plans = array_values($this->plans());
        $quote = $subscription ? $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? [], $subscription->unit_mix ?? []) : null;
        if ($subscription && $quote && ($subscription->billable_units !== $quote['billable_units'] || (float) $subscription->monthly_amount !== (float) $quote['monthly_amount'])) {
            $subscription->update(['billable_units' => $quote['billable_units'], 'monthly_amount' => $quote['monthly_amount']]);
            $subscription->refresh();
        }
        return response()->json([
            'plans' => $plans,
            'subscription' => $subscription,
            'quote' => $quote,
            'till_number' => config('services.platform_billing.till_number'),
            'payment_setup_ready' => filled(config('services.platform_billing.till_number')),
            'payments' => $subscription ? $subscription->payments()->latest()->limit(10)->get() : [],
            'features' => match ($subscription?->plan_code) {
                'basic' => ['payment_matching'],
                'standard' => ['payment_matching', 'tenant_payment_links'],
                'premium' => ['payment_matching', 'tenant_payment_links', 'tenant_portal', 'payment_ledger', 'premium_operations'],
                default => [],
            },
        ]);
    }

    public function select(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403, 'Only the organization owner or primary administrator can manage the platform subscription.');
        $validated = $request->validate(['plan_code' => ['required', Rule::in(array_keys($this->plans()))], 'unit_mix' => ['required', 'array'], 'unit_mix.*' => ['required', 'integer', 'min:0', 'max:100000']]);
        abort_if(array_sum($validated['unit_mix']) < 1, 422, 'Enter at least one expected unit before choosing a plan.');
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
            $subscription->unit_mix = $validated['unit_mix'];
            $quote = $this->quote($organization, $validated['plan_code'], $subscription->pricing_overrides ?? [], $validated['unit_mix']);
            $subscription->billable_units = $quote['billable_units'];
            $subscription->monthly_amount = $quote['monthly_amount'];
            $subscription->save();
            return $subscription;
        });

        return response()->json([
            'message' => 'Plan selected. Payment is required before organization onboarding can continue.',
            'subscription' => $subscription->fresh(),
            'quote' => $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? [], $subscription->unit_mix ?? []),
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

    public function pendingPayments(Request $request)
    {
        abort_unless($request->user()->role === 'platform_admin', 403, 'Platform administrator access is required.');
        return response()->json([
            'data' => PlatformSubscriptionPayment::with([
                'organization:id,name,email',
                'subscription:id,organization_id,plan_code,status,billable_units,monthly_amount',
            ])->where('status', 'pending_verification')->latest()->limit(200)->get(),
        ]);
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
                $quote = $this->quote($organization, $subscription->plan_code, $subscription->pricing_overrides ?? [], $subscription->unit_mix ?? []);
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
