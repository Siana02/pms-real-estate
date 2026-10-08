<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceRequest;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\Leases as Lease;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Services\LeaseProvisioner;

/**
 * Read/write endpoints for the tenant portal.
 *
 * Every query is scoped to the tenant record that belongs to the authenticated
 * user, so a tenant can only ever see their own unit, lease, payments and
 * maintenance requests.
 */
class TenantPortalController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        // The lease is the canonical source of the tenant's current/reserved
        // home. Independently registered tenants may have older tenant-level
        // property/unit fields, so do not rely on those fields for the portal.
        $lease?->loadMissing(['property', 'unit', 'tenant.organization']);
        $unit = $lease?->unit ?? ($tenant->unit_id ? Unit::find($tenant->unit_id) : null);
        $property = $lease?->property
            ?? ($unit?->property_id ? Property::find($unit->property_id) : null)
            ?? ($tenant->property_id ? Property::find($tenant->property_id) : null);
        $organization = $lease?->tenant?->organization
            ?? Organization::find($lease?->organization_id ?? $tenant->organization_id);

        return response()->json([
            'data' => [
                'tenant' => [
                    'id' => $tenant->id,
                    'first_name' => $tenant->first_name,
                    'last_name' => $tenant->last_name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                ],
                'home' => $this->homePayload($property, $unit, $organization),
                'lease' => $this->leasePayload($lease),
                'rent' => $this->rentPayload($tenant, $lease),
            ],
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->activeLease($tenant);
        $payments = $this->tenantPayments($tenant);

        return response()->json([
            'data' => $payments->map(fn (Payment $payment) => $this->paymentPayload($payment))->values(),
            'summary' => $this->rentPayload($tenant, $lease),
        ]);
    }

    public function storePayment(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->activeLease($tenant);

        abort_if(
            $lease === null,
            422,
            'You do not have an active lease to pay rent against.'
        );

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:mpesa,bank_transfer,card,cash,other',
            'payment_type' => 'nullable|in:rent,deposit,utility,other',
            'phone' => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $payment = Payment::create([
            'organization_id' => $lease->organization_id,
            'lease_id' => $lease->id,
            'amount' => $validated['amount'],
            'payment_date' => CarbonImmutable::now()->toDateString(),
            'payment_method' => $validated['payment_method'],
            'payment_type' => $validated['payment_type'] ?? 'rent',
            'reference' => $validated['reference'] ?? null,
            'notes' => $this->paymentNotes($validated),
        ]);

        return response()->json([
            'message' => 'Payment recorded against your lease.',
            'data' => $this->paymentPayload($payment),
        ], 201);
    }

    public function maintenanceRequests(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);

        $requests = MaintenanceRequest::where('tenant_id', $tenant->id)
            ->orderByDesc('reported_date')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'data' => $requests->map(fn (MaintenanceRequest $item) => $this->requestPayload($item))->values(),
            'summary' => [
                'open' => $requests->where('status', 'open')->count(),
                'in_progress' => $requests->where('status', 'in_progress')->count(),
                'resolved' => $requests->where('status', 'completed')->count(),
            ],
        ]);
    }

    public function storeMaintenanceRequest(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->activeLease($tenant);

        abort_if(
            $lease === null,
            422,
            'You do not have an active lease, so a request cannot be logged against a unit.'
        );

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|min:10',
            'category' => 'nullable|string|max:100',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'reported_date' => 'nullable|date',
        ]);

        $maintenanceRequest = MaintenanceRequest::create([
            'organization_id' => $lease->organization_id,
            'property_id' => $lease->property_id,
            'unit_id' => $lease->unit_id,
            'tenant_id' => $tenant->id,
            'title' => $validated['title'],
            'description' => $this->describeWithCategory($validated),
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'open',
            'reported_date' => $validated['reported_date'] ?? CarbonImmutable::now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Request submitted. Your property manager has been notified.',
            'data' => $this->requestPayload($maintenanceRequest),
        ], 201);
    }

    /**
     * Notifications are derived from real records rather than a separate table,
     * so the tenant sees payment confirmations, maintenance progress and lease
     * expiry warnings without any extra writes.
     */
    public function notifications(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->activeLease($tenant);
        $notifications = [];

        foreach ($this->tenantPayments($tenant)->take(5) as $payment) {
            $notifications[] = [
                'id' => 'payment-' . $payment->id,
                'type' => 'payment_received',
                'title' => 'Payment received — ' . number_format((float) $payment->amount),
                'body' => $payment->reference
                    ? 'Reference ' . $payment->reference . '.'
                    : null,
                'created_at' => optional($payment->created_at)->toIso8601String()
                    ?? (string) $payment->payment_date,
                'read_at' => optional($payment->created_at)?->toIso8601String(),
            ];
        }

        $requests = MaintenanceRequest::where('tenant_id', $tenant->id)
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get();

        foreach ($requests as $item) {
            $notifications[] = [
                'id' => 'request-' . $item->id,
                'type' => 'maintenance_update',
                'title' => $item->title . ' is now ' . $this->statusLabel($item->status),
                'body' => $item->assigned_to
                    ? $item->assigned_to . ' is handling this request.'
                    : null,
                'created_at' => optional($item->updated_at)->toIso8601String(),
                'read_at' => $item->status === 'completed'
                    ? optional($item->updated_at)->toIso8601String()
                    : null,
            ];
        }

        if ($lease && $lease->end_date) {
            $endsAt = CarbonImmutable::parse($lease->end_date);
            $daysLeft = CarbonImmutable::now()->startOfDay()->diffInDays($endsAt, false);

            if ($daysLeft >= 0 && $daysLeft <= 60) {
                $notifications[] = [
                    'id' => 'lease-' . $lease->id,
                    'type' => 'lease_expiring',
                    'title' => 'Your lease ends in ' . $daysLeft . ' days',
                    'body' => 'Talk to your property manager about renewing.',
                    'created_at' => CarbonImmutable::now()->toIso8601String(),
                    'read_at' => null,
                ];
            }
        }

        usort(
            $notifications,
            fn (array $a, array $b) => strcmp((string) $b['created_at'], (string) $a['created_at'])
        );

        return response()->json(['data' => array_values($notifications)]);
    }

    /**
     * Vacant units inside the same organization, so a tenant can browse other
     * homes without leaving the portal.
     */
    public function vacancies(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);

        $propertyIds = Property::where('organization_id', $tenant->organization_id)
            ->pluck('name', 'id');

        $units = Unit::whereIn('property_id', $propertyIds->keys())
            ->where('status', 'vacant')
            ->orderBy('monthly_rent')
            ->limit(12)
            ->get();

        $properties = Property::whereIn('id', $units->pluck('property_id')->unique())
            ->get()
            ->keyBy('id');

        return response()->json([
            'data' => $units->map(function (Unit $unit) use ($properties) {
                $property = $properties->get($unit->property_id);

                return [
                    'id' => $unit->id,
                    'property_name' => $property?->name,
                    'unit_number' => $unit->unit_number,
                    'unit_type' => $unit->unit_type,
                    'city' => $property?->city,
                    'monthly_rent' => $unit->monthly_rent,
                ];
            })->values(),
        ]);
    }

    public function submitMoveOutNotice(Request $request, Lease $lease): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        abort_if(
            $lease->tenant_id !== $tenant->id ||
            $lease->organization_id !== $tenant->organization_id,
            403,
            'You do not have access to this lease.'
        );
        abort_if(
            $lease->end_date !== null ||
            in_array($lease->status, ['ended', 'terminated'], true),
            422,
            'Move-out notice is only available for an open-ended active lease.'
        );

        $validated = $request->validate([
            'intended_move_out_date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $noticeDate = CarbonImmutable::today();
        $noticeMonths = max(1, (int) $lease->notice_period_months);
        $moveOutDate = CarbonImmutable::parse($validated['intended_move_out_date']);

        $lease->update([
            'status' => 'notice',
            'notice_date' => $noticeDate->toDateString(),
            'intended_move_out_date' => $moveOutDate->toDateString(),
            'notice_period_months' => $noticeMonths,
            'notice_timely' => $moveOutDate->greaterThanOrEqualTo(
                $noticeDate->addMonthsNoOverflow($noticeMonths)
            ),
        ]);

        return response()->json([
            'message' => 'Move-out notice recorded.',
            'lease' => $lease->fresh(),
        ]);
    }

    /**
     * Fetch the tenant's own copy of the digitally generated lease
     * agreement, including whichever signatures/terms exist so far.
     */
    public function leaseAgreement(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        return response()->json([
            'data' => $this->agreementPayload($lease),
        ]);
    }

    /**
     * Let the tenant edit their own side of the agreement text and/or sign
     * it with their initials. Tenants who were onboarded by a manager and
     * tenants who self-registered both use this same endpoint — only the
     * `tenant_terms` copy is ever writable here, never `manager_terms`.
     */
    public function updateLeaseAgreement(Request $request, LeaseProvisioner $provisioner): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');
        abort_if($lease->manager_signed_at !== null, 422, 'This lease is locked. Only the lease end date can be changed after final signing.');
        abort_if($lease->tenant_signed_at !== null, 422, 'Your signed copy is locked. Only the lease end date can be changed after signing.');

        $validated = $request->validate([
            'tenant_terms' => ['nullable', 'string'],
            'requested_move_in_date' => ['nullable', 'date'],
            'requested_move_out_date' => ['nullable', 'date', 'after_or_equal:requested_move_in_date'],
            'tenant_signature' => 'nullable|string|max:20',
        ]);

        $signing = ! empty($validated['tenant_signature']);

        if ($signing) {
            abort_if($lease->tenant_signed_at !== null, 422, 'You have already signed this agreement.');
            abort_if(
                blank($tenant->phone) || blank($tenant->national_id) ||
                blank($tenant->employer_name) || blank($tenant->employer_phone) ||
                blank($tenant->next_of_kin_name) || blank($tenant->next_of_kin_phone),
                422,
                'Complete your tenant details before signing the lease.'
            );
        }

        $requestedStart = array_key_exists('requested_move_in_date', $validated)
            ? ($validated['requested_move_in_date']
                ? CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString()
                : null)
            : $lease->requested_move_in_date?->toDateString();

        $requestedEnd = array_key_exists('requested_move_out_date', $validated)
            ? ($validated['requested_move_out_date']
                ? CarbonImmutable::parse($validated['requested_move_out_date'])->toDateString()
                : null)
            : $lease->requested_move_out_date?->toDateString();

        if ($requestedStart !== null) {
            $provisioner->assertNoOverlap(
                $lease->unit,
                $requestedStart,
                $requestedEnd,
                $lease->id
            );
        }

        $updates = [];
        if (array_key_exists('requested_move_in_date', $validated)) {
            $updates['requested_move_in_date'] = $requestedStart;
        }
        if (array_key_exists('requested_move_out_date', $validated)) {
            $updates['requested_move_out_date'] = $requestedEnd;
        }

        if (array_key_exists('tenant_terms', $validated)) {
            $updates['tenant_terms'] = $validated['tenant_terms'];
        }

        // Keep the generated tenant agreement coherent when the tenant changes
        // dates without manually rewriting the agreement text.
        if (
            $lease->status === 'pending' &&
            !array_key_exists('tenant_terms', $validated) &&
            ($requestedStart !== $lease->requested_move_in_date?->toDateString()
                || $requestedEnd !== $lease->requested_move_out_date?->toDateString())
        ) {
            $updates['tenant_terms'] = preg_replace(
                [
                    '/^Requested lease start: .*$/m',
                    '/^Requested lease end: .*$/m',
                ],
                [
                    'Requested lease start: ' . ($requestedStart ?? 'Not provided'),
                    'Requested lease end: ' . ($requestedEnd ?? 'Open-ended / to be confirmed'),
                ],
                (string) $lease->tenant_terms
            );
        }

        if ($signing) {
            $updates['tenant_signature'] = trim($validated['tenant_signature']);
            $updates['tenant_signed_at'] = CarbonImmutable::now();
        }

        if ($updates !== []) {
            $lease->update($updates);

            if (DB::getDriverName() === 'sqlite') {
                DB::statement(
                    "UPDATE leases SET requested_move_in_date = substr(requested_move_in_date, 1, 10), requested_move_out_date = substr(requested_move_out_date, 1, 10) WHERE id = ?",
                    [$lease->id]
                );
            }

            $lease->refresh();
        }

        return response()->json([
            'message' => $signing
                ? 'Your lease has been signed and forwarded to the manager for confirmation and final signature.'
                : 'Your lease information was updated.',
            'data' => $this->agreementPayload($lease),
        ]);
    }

    /**
     * Download the completed lease as a self-contained offline HTML copy.
     * The document combines the canonical agreement text with both signed
     * signature blocks, so the tenant can keep a local copy without relying
     * on the portal being online.
     */
    public function downloadLeaseAgreement(Request $request): Response
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');
        abort_if($lease->manager_signed_at === null || $lease->tenant_signed_at === null, 422, 'The lease must be signed by both parties before it can be downloaded.');

        $deposit = $lease->deposit;
        $depositRequired = (float) ($deposit?->amount_required ?? $lease->deposit_amount ?? 0) > 0;
        $depositConfirmed = ! $depositRequired || $deposit?->status === 'paid';

        abort_if(! $depositConfirmed, 422, 'The deposit must be confirmed by the property manager before the signed lease can be downloaded.');

        $lease->loadMissing(['organization', 'property', 'unit', 'tenant', 'deposit']);
        $organization = $lease->organization;
        $property = $lease->property;
        $unit = $lease->unit;
        $leaseText = $lease->manager_terms ?: $lease->tenant_terms ?: '';
        $tenantName = trim(($lease->tenant?->first_name ?? '') . ' ' . ($lease->tenant?->last_name ?? ''));
        $propertyName = $property?->name ?? 'Property';
        $unitNumber = $unit?->unit_number ?? '—';
        $safeName = preg_replace('/[^A-Za-z0-9_-]+/', '-', trim($tenantName . '-' . $propertyName . '-' . $unitNumber)) ?: 'signed-lease';

        $html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' .
            '<meta name="viewport" content="width=device-width,initial-scale=1">' .
            '<title>Signed Residential Lease Agreement</title>' .
            '<style>body{font-family:Arial,sans-serif;color:#172033;max-width:820px;margin:40px auto;padding:0 24px;line-height:1.55}h1{font-size:24px;margin-bottom:8px}.meta{color:#5b6578;margin-bottom:28px}.agreement{white-space:pre-wrap;border:1px solid #d8dee8;border-radius:10px;padding:24px;background:#fff}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}.signature{border:1px solid #d8dee8;border-radius:10px;padding:20px}.initials{font-size:28px;font-weight:700;letter-spacing:.08em}.stamp{display:inline-block;margin-top:10px;padding:4px 9px;border:1px solid #17834b;color:#17834b;font-size:12px;font-weight:700;letter-spacing:.08em}.muted{color:#667085;font-size:13px}@media print{body{margin:0}.agreement,.signature{break-inside:avoid}}</style></head><body>' .
            '<h1>RESIDENTIAL LEASE AGREEMENT</h1>' .
            '<div class="meta">' . e((string) ($organization?->name ?? '')) . ' · ' . e($propertyName) . ' · Unit ' . e($unitNumber) . '</div>' .
            '<div class="agreement">' . nl2br(e($leaseText)) . '</div>' .
            '<p class="muted"><strong>Current lease end date:</strong> ' . e($lease->end_date?->toDateString() ?? 'Open-ended') . '</p>' .
            '<div class="signatures">' .
            '<section class="signature"><div class="muted">Tenant</div><div class="initials">' . e((string) $lease->tenant_signature) . '</div><div class="stamp">SIGNED</div><p class="muted">' . e((string) $lease->tenant_signed_at) . '</p><p>' . e($tenantName) . '</p></section>' .
            '<section class="signature"><div class="muted">Property Manager / Organization</div><div class="initials">' . e((string) $lease->manager_signature) . '</div><div class="stamp">SIGNED</div><p class="muted">' . e((string) $lease->manager_signed_at) . '</p><p>' . e((string) ($organization?->name ?? '')) . '</p></section>' .
            '</div></body></html>';

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $safeName . '-signed-lease.html"',
        ]);
    }

    /**
     * Store the tenant-entered details and rebuild the same canonical contract
     * shown in both manager and tenant copies before either party signs.
     */
    public function updateLeaseTenantDetails(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');
        abort_if(
            $lease->manager_signed_at !== null || $lease->tenant_signed_at !== null,
            422,
            'Tenant details cannot be changed after the agreement has been signed.'
        );

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:50'],
            'national_id' => ['required', 'string', 'max:100'],
            'employer_name' => ['required', 'string', 'max:255'],
            'employer_phone' => ['required', 'string', 'max:50'],
            'next_of_kin_name' => ['required', 'string', 'max:255'],
            'next_of_kin_phone' => ['required', 'string', 'max:50'],
        ]);

        return DB::transaction(function () use ($tenant, $lease, $validated) {
            $tenant->update($validated);
            $tenant->refresh();

            $contract = app(\App\Services\LeaseProvisioner::class)->buildAgreementTemplate(
                (int) $lease->organization_id,
                $lease->property()->firstOrFail(),
                $lease->unit()->firstOrFail(),
                $tenant,
                $lease->monthly_rent,
                $lease->start_date?->toDateString()
                    ?? $lease->requested_move_in_date?->toDateString()
                    ?? CarbonImmutable::today()->toDateString(),
                $lease->end_date?->toDateString() ?? $lease->requested_move_out_date?->toDateString(),
                $lease->deposit_amount
            );

            $lease->update([
                'manager_terms' => $contract,
                'tenant_terms' => $contract,
            ]);

            return response()->json([
                'message' => 'Your tenant details have been added to the lease agreement.',
                'data' => $this->agreementPayload($lease->fresh()),
            ]);
        });
    }

    /**
     * The signed contract remains immutable. The lease end date is the one
     * lifecycle field the tenant may change after final signing.
     */
    public function updateLeaseEndDate(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');
        abort_if($lease->manager_signed_at === null, 422, 'The lease must be finally signed before its end date can be changed here.');

        $validated = $request->validate(['end_date' => ['nullable', 'date']]);
        $endDate = !empty($validated['end_date']) ? CarbonImmutable::parse($validated['end_date'])->toDateString() : null;
        $startDate = $lease->start_date?->toDateString();

        abort_if($endDate !== null && $startDate !== null && $endDate < $startDate, 422, 'The lease end date must be on or after the lease start date.');

        if ($startDate !== null && $endDate !== null) {
            app(\App\Services\LeaseProvisioner::class)->assertNoOverlap($lease->unit, $startDate, $endDate, $lease->id);
        }

        $status = app(\App\Services\LeaseProvisioner::class)->statusForDates(
            $startDate ?? CarbonImmutable::today()->toDateString(),
            $endDate,
            $lease->status
        );

        $lease->update([
            'end_date' => $endDate,
            'status' => $status,
        ]);

        app(\App\Services\LeaseProvisioner::class)->syncUnitStatus($lease->unit);

        return response()->json([
            'message' => 'Lease end date updated. The signed agreement text remains unchanged.',
            'data' => $this->agreementPayload($lease->fresh()),
        ]);
    }

    /**
     * The tenant's own "I paid the deposit" tick. This is intentionally
     * separate from the manager's authoritative `deposits.status`/
     * `amount_paid` fields — it only records the tenant's claim so the
     * manager can see and confirm it, it never marks the deposit as
     * officially received on its own.
     */
    public function markDepositPaid(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');

        $required = (float) ($lease->deposit_amount ?? 0);
        if ($required <= 0) {
            $lease->loadMissing('unit');
            $required = (float) ($lease->unit?->monthly_rent ?? 0);
        }

        abort_if($required <= 0, 422, 'No security deposit is required for this lease.');

        $deposit = $lease->deposit()->updateOrCreate(
            ['lease_id' => $lease->id],
            [
                'organization_id' => $lease->organization_id,
                'tenant_id' => $tenant->id,
                'amount_required' => $required,
                'amount_paid' => $lease->deposit?->amount_paid ?? 0,
                'status' => $lease->deposit?->status ?? 'unpaid',
            ]
        );

        $deposit->update([
            'tenant_marked_paid_at' => CarbonImmutable::now(),
        ]);

        return response()->json([
            'message' => 'Thanks — your manager has been notified to confirm receipt of your deposit.',
            'data' => $this->agreementPayload($lease->fresh()),
        ]);
    }

    /* ----------------------------------------------------------------- */
    /*  helpers                                                           */
    /* ----------------------------------------------------------------- */

    private function currentTenant(Request $request): Tenant
    {
        $user = $request->user();

        abort_unless($user->role === 'tenant', 403, 'Only tenant accounts can access the tenant portal.');

        $tenant = null;

        if (Schema::hasColumn('users', 'tenant_id') && $user->tenant_id) {
            $tenant = Tenant::where('id', $user->tenant_id)
                ->where('organization_id', $user->organization_id)
                ->first();
        }

        if ($tenant === null && $user->email) {
            $tenant = Tenant::where('organization_id', $user->organization_id)
                ->where('email', $user->email)
                ->first();
        }

        abort_if(
            $tenant === null,
            404,
            'No tenant record is linked to your account. Ask your property manager to link it.'
        );

        return $tenant;
    }

    private function activeLease(Tenant $tenant): ?Lease
    {
        $today = CarbonImmutable::today()->toDateString();

        return Lease::where('tenant_id', $tenant->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->whereDate('start_date', '<=', $today)
            ->where(fn ($query) => $query
                ->whereNull('end_date')
                ->orWhereDate('end_date', '>=', $today))
            ->orderByDesc('start_date')
            ->first();
    }

    /**
     * The tenant's most recent non-terminated lease, regardless of whether
     * its start date has arrived yet. Used for the lease agreement and
     * deposit endpoints, since a tenant should be able to review and sign
     * their agreement before move-in day.
     */
    private function latestLease(Tenant $tenant): ?Lease
    {
        return Lease::where('tenant_id', $tenant->id)
            ->whereNotIn('status', ['ended', 'terminated'])
            ->with('deposit')
            ->orderByDesc('start_date')
            ->first();
    }

    /** @return array<string, mixed>|null */
    private function agreementPayload(?Lease $lease): ?array
    {
        if ($lease === null) {
            return null;
        }

        $lease->loadMissing(['property', 'unit', 'deposit', 'tenant.organization', 'tenant.property', 'tenant.unit']);

        // Self-registered tenants have the organization/property/unit selected
        // during registration on the tenant record. The lease should use those
        // relationships as a fallback so the portal never renders blank tenancy
        // details merely because an older/pending lease row is incomplete.
        $tenant = $lease->tenant;

        // Resolve the canonical tenancy from the lease foreign keys first.
        // This is important for self-registered/pending leases: the selected
        // organization, property and unit already exist when registration
        // succeeds, even if an older Eloquent relationship is not hydrated
        // or the lease snapshot is incomplete.
        $organization = $tenant?->organization
            ?? Organization::find($lease->organization_id);

        $property = $lease->property;
        if ($property === null && $lease->property_id !== null) {
            $property = Property::whereKey($lease->property_id)
                ->where('organization_id', $organization?->id ?? $tenant?->organization_id)
                ->first();
        }
        if ($property === null) {
            $property = $tenant?->property;
        }

        $unit = $lease->unit;
        if ($unit === null && $lease->unit_id !== null) {
            $unit = Unit::whereKey($lease->unit_id)
                ->whereHas('property', function ($query) use ($organization) {
                    if ($organization?->id !== null) {
                        $query->where('organization_id', $organization->id);
                    }
                })
                ->first();
        }
        if ($unit === null) {
            $unit = $tenant?->unit;
        }

        // Unit rent is the source of truth for a newly requested tenancy.
        // The lease stores the contractual snapshot, but if a legacy pending
        // lease has a null/zero amount, populate the portal from the unit.
        $monthlyRent = (float) ($lease->monthly_rent ?? 0);
        if ($monthlyRent <= 0 && $lease?->unit?->monthly_rent !== null) {
            $monthlyRent = (float) $lease->unit->monthly_rent;
        }
        if ($monthlyRent <= 0 && $unit?->monthly_rent !== null) {
            $monthlyRent = (float) $unit->monthly_rent;
        }

        $depositAmount = (float) ($lease->deposit_amount ?? 0);
        if ($depositAmount <= 0 && $monthlyRent > 0) {
            $depositAmount = $monthlyRent;
        }

        $deposit = $lease->deposit;

        $status = $lease->manager_signed_at !== null
            ? 'locked'
            : ($lease->tenant_signed_at !== null
                ? 'awaiting_manager_signature'
                : ($lease->status === 'pending'
                    ? 'pending_manager_confirmation'
                    : 'awaiting_tenant_signature'));

        return [
            'lease_id' => $lease->id,
            'status' => $lease->status,
            'agreement_status' => $status,
            'contract_text' => filled($lease->manager_terms)
                ? $lease->manager_terms
                : (filled($lease->tenant_terms)
                    ? $lease->tenant_terms
                    : ($lease->status === 'pending' && $property && $unit && $tenant
                        ? app(LeaseProvisioner::class)->buildPendingAgreementTemplate(
                            (int) ($organization?->id ?? $tenant->organization_id),
                            $property,
                            $unit,
                            $tenant,
                            $monthlyRent,
                            $lease->requested_move_in_date?->toDateString() ?? CarbonImmutable::today()->toDateString(),
                            $lease->requested_move_out_date?->toDateString()
                        )
                        : null)),
            'start_date' => $lease->start_date?->toDateString(),
            'end_date' => $lease->end_date?->toDateString(),
            'requested_move_in_date' => $lease->requested_move_in_date?->toDateString(),
            'requested_move_out_date' => $lease->requested_move_out_date?->toDateString(),
            'monthly_rent' => number_format($monthlyRent, 2, '.', ''),
            'deposit_amount' => number_format($depositAmount, 2, '.', ''),
            'rent_due_day' => 5,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
            ] : null,
            'property' => $property ? [
                'id' => $property->id,
                'name' => $property->name,
                'property_type' => $property->property_type,
                'address' => $property->address,
                'city' => $property->city,
                'country' => $property->country,
            ] : null,
            'unit' => $unit ? [
                'id' => $unit->id,
                'unit_number' => $unit->unit_number,
                'unit_type' => $unit->unit_type,
                'default_rent' => $unit->monthly_rent,
            ] : null,
            'tenant' => $lease->tenant ? [
                'id' => $lease->tenant->id,
                'name' => trim($lease->tenant->first_name . ' ' . $lease->tenant->last_name),
                'email' => $lease->tenant->email,
                'phone' => $lease->tenant->phone,
                'national_id' => $lease->tenant->national_id,
                'employer_name' => $lease->tenant->employer_name,
                'employer_phone' => $lease->tenant->employer_phone,
                'next_of_kin_name' => $lease->tenant->next_of_kin_name,
                'next_of_kin_phone' => $lease->tenant->next_of_kin_phone,
            ] : null,
            'manager_terms' => $lease->manager_terms,
            'tenant_terms' => $lease->tenant_terms,
            'manager_signature' => $lease->manager_signature,
            'manager_signed_at' => $lease->manager_signed_at?->toDateTimeString(),
            'tenant_signature' => $lease->tenant_signature,
            'tenant_signed_at' => $lease->tenant_signed_at?->toDateTimeString(),
            'agreement_finalized' => $lease->manager_signed_at !== null && $lease->tenant_signed_at !== null,
            'deposit' => $deposit ? [
                'amount_required' => $deposit->amount_required,
                'amount_paid' => $deposit->amount_paid,
                'status' => $deposit->status,
                'tenant_marked_paid_at' => $deposit->tenant_marked_paid_at?->toDateTimeString(),
                'payment_date' => $deposit->payment_date?->toDateString(),
            ] : null,
        ];
    }

    /** @return Collection<int, Payment> */
    private function tenantPayments(Tenant $tenant): Collection
    {
        $leaseIds = Lease::where('tenant_id', $tenant->id)->pluck('id');

        return Payment::whereIn('lease_id', $leaseIds)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();
    }

    /** @return array<string, mixed>|null */
    private function homePayload(
        ?Property $property,
        ?Unit $unit,
        ?Organization $organization
    ): ?array {
        if ($property === null && $unit === null) {
            return null;
        }

        return [
            'property_name' => $property?->name,
            'property_type' => $property?->property_type,
            'unit_number' => $unit?->unit_number,
            'unit_type' => $unit?->unit_type,
            'address' => $property?->address,
            'city' => $property?->city,
            'country' => $property?->country,
            'manager_name' => $organization?->name,
            'manager_logo_url' => $organization?->logo_url,
            'manager_phone' => $this->organizationField($organization, 'phone'),
            'manager_email' => $this->organizationField($organization, 'email'),
        ];
    }

    private function organizationField(?Organization $organization, string $column): ?string
    {
        if ($organization === null || ! Schema::hasColumn('organizations', $column)) {
            return null;
        }

        $value = $organization->getAttribute($column);

        return is_string($value) && $value !== '' ? $value : null;
    }

    /** @return array<string, mixed>|null */
    private function leasePayload(?Lease $lease): ?array
    {
        if ($lease === null) {
            return null;
        }

        $lease->loadMissing(['property', 'unit', 'deposit', 'tenant.organization', 'tenant.property', 'tenant.unit']);

        $tenant = $lease->tenant;
        $organization = $tenant?->organization
            ?? Organization::find($lease->organization_id ?? $tenant?->organization_id);

        $property = $lease->property;
        if ($property === null && $lease->property_id !== null) {
            $property = Property::whereKey($lease->property_id)
                ->where('organization_id', $organization?->id ?? $tenant?->organization_id)
                ->first();
        }
        if ($property === null) {
            $property = $tenant?->property;
        }

        $unit = $lease->unit;
        if ($unit === null && $lease->unit_id !== null) {
            $unit = Unit::whereKey($lease->unit_id)
                ->whereHas('property', function ($query) use ($organization) {
                    if ($organization?->id !== null) {
                        $query->where('organization_id', $organization->id);
                    }
                })
                ->first();
        }
        if ($unit === null) {
            $unit = $tenant?->unit;
        }

        // A pending self-registration already has a canonical lease, but
        // older pending records may have incomplete financial snapshots.
        // The selected unit remains the source of truth for displayed rent
        // and the default deposit until the manager confirms official terms.
        $monthlyRent = (float) ($lease->monthly_rent ?? 0);
        if ($monthlyRent <= 0 && $unit?->monthly_rent !== null) {
            $monthlyRent = (float) $unit->monthly_rent;
        }

        $depositAmount = (float) ($lease->deposit_amount ?? 0);
        if ($depositAmount <= 0 && $monthlyRent > 0) {
            $depositAmount = $monthlyRent;
        }

        $deposit = $lease->deposit;

        return [
            'id' => $lease->id,
            'status' => $lease->status,
            'start_date' => $lease->start_date?->toDateString(),
            'end_date' => $lease->end_date?->toDateString(),
            'requested_move_in_date' => $lease->requested_move_in_date?->toDateString(),
            'requested_move_out_date' => $lease->requested_move_out_date?->toDateString(),
            'monthly_rent' => $monthlyRent,
            'deposit_amount' => $depositAmount,
            'notes' => $lease->notes,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
            ] : null,
            'property' => $property ? [
                'id' => $property->id,
                'name' => $property->name,
                'property_type' => $property->property_type,
                'address' => $property->address,
                'city' => $property->city,
                'country' => $property->country,
            ] : null,
            'unit' => $unit ? [
                'id' => $unit->id,
                'unit_number' => $unit->unit_number,
                'unit_type' => $unit->unit_type,
                'default_rent' => $unit->monthly_rent,
            ] : null,
            'deposit' => $deposit ? [
                'amount_required' => $deposit->amount_required,
                'amount_paid' => $deposit->amount_paid,
                'status' => $deposit->status,
                'tenant_marked_paid_at' => $deposit->tenant_marked_paid_at?->toDateTimeString(),
                'payment_date' => $deposit->payment_date?->toDateString(),
            ] : ($depositAmount > 0 ? [
                'amount_required' => $depositAmount,
                'amount_paid' => 0,
                'status' => 'unpaid',
                'tenant_marked_paid_at' => null,
                'payment_date' => null,
            ] : null),
        ];
    }

    /** @return array<string, mixed> */
    private function rentPayload(Tenant $tenant, ?Lease $lease): array
    {
        $payments = $lease
            ? $lease->payments()->orderByDesc('payment_date')->orderByDesc('id')->get()
            : collect();
        $monthlyRent = (float) ($lease->monthly_rent ?? 0);
        if ($monthlyRent <= 0 && $lease?->unit?->monthly_rent !== null) {
            $monthlyRent = (float) $lease->unit->monthly_rent;
        }
        if ($monthlyRent <= 0 && $tenant->unit_id) {
            $unit = Unit::find($tenant->unit_id);
            if ($unit?->monthly_rent !== null) {
                $monthlyRent = (float) $unit->monthly_rent;
            }
        }

        $now = CarbonImmutable::now();

        if ($lease?->status === 'pending') {
            $dueDay = 5;
            $dueDate = $now->day <= $dueDay
                ? $now->copy()->day($dueDay)->toDateString()
                : $now->addMonthNoOverflow()->day($dueDay)->toDateString();

            return [
                'amount_due' => 0,
                'balance' => 0,
                'due_date' => $dueDate,
                'monthly_rent' => $monthlyRent,
                'paid_this_year' => 0,
                'status' => 'pending_lease',
            ];
        }

        $rentPayments = $payments->filter(
            fn (Payment $payment) => ($payment->payment_type ?? 'rent') === 'rent'
        );

        $paidThisMonth = $rentPayments
            ->filter(fn (Payment $payment) => CarbonImmutable::parse(
                (string) $payment->payment_date
            )->isSameMonth($now))
            ->sum(fn (Payment $payment) => (float) $payment->amount);

        $paidThisYear = $rentPayments
            ->filter(fn (Payment $payment) => CarbonImmutable::parse(
                (string) $payment->payment_date
            )->year === $now->year)
            ->sum(fn (Payment $payment) => (float) $payment->amount);

        $balance = max($monthlyRent - $paidThisMonth, 0);
        $dueDay = 5;
        $dueDate = $now->day <= $dueDay
            ? $now->copy()->day($dueDay)
            : $now->addMonthNoOverflow()->day($dueDay);

        return [
            'amount_due' => $balance,
            'balance' => $balance,
            'due_date' => $dueDate,
            'monthly_rent' => $monthlyRent,
            'paid_this_year' => $paidThisYear,
            'status' => $this->rentStatus($balance, $monthlyRent, $now),
        ];
    }

    private function rentStatus(float $balance, float $monthlyRent, CarbonImmutable $now): string
    {
        if ($monthlyRent <= 0 || $balance <= 0) {
            return 'paid';
        }

        if ($balance < $monthlyRent) {
            return 'partial';
        }

        return $now->day >= 6 ? 'overdue' : 'pending';
    }

    /** @return array<string, mixed> */
    private function paymentPayload(Payment $payment): array
    {
        $date = CarbonImmutable::parse((string) $payment->payment_date);

        return [
            'id' => $payment->id,
            'period' => $date->format('F Y'),
            'amount' => $payment->amount,
            'payment_date' => $date->toDateString(),
            'payment_method' => $payment->payment_method,
            'payment_type' => $payment->payment_type,
            'reference' => $payment->reference,
            'status' => 'paid',
        ];
    }

    /** @param array<string, mixed> $validated */
    private function paymentNotes(array $validated): ?string
    {
        $notes = $validated['notes'] ?? null;
        $phone = $validated['phone'] ?? null;

        if (is_string($phone) && $phone !== '') {
            $notes = trim(((string) $notes) . ' Paid from ' . $phone . '.');
        }

        return is_string($notes) && $notes !== '' ? $notes : null;
    }

    /** @return array<string, mixed> */
    private function requestPayload(MaintenanceRequest $item): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'description' => $item->description,
            'priority' => $item->priority,
            'status' => $item->status,
            'assigned_to' => $item->assigned_to,
            'reported_date' => (string) $item->reported_date,
            'completed_date' => $item->completed_date ? (string) $item->completed_date : null,
            'updated_at' => optional($item->updated_at)->toIso8601String(),
            'notes' => $item->notes,
        ];
    }

    /** @param array<string, mixed> $validated */
    private function describeWithCategory(array $validated): string
    {
        $category = $validated['category'] ?? null;

        if (! is_string($category) || $category === '') {
            return (string) $validated['description'];
        }

        return ucfirst($category) . ': ' . $validated['description'];
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'in_progress' => 'in progress',
            'completed' => 'resolved',
            'cancelled' => 'cancelled',
            default => 'open',
        };
    }
}
