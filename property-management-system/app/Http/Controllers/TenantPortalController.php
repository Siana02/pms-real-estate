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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

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
        $unit = $lease?->unit_id ? Unit::find($lease->unit_id) : null;
        $property = $lease?->property_id ? Property::find($lease->property_id) : null;
        $organization = Organization::find($tenant->organization_id);

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
    public function updateLeaseAgreement(Request $request): JsonResponse
    {
        $tenant = $this->currentTenant($request);
        $lease = $this->latestLease($tenant);

        abort_if($lease === null, 404, 'No lease agreement is available yet.');
        abort_if(
            $lease->manager_signed_at !== null,
            422,
            'This lease is locked because the manager has signed the final version.'
        );

        $validated = $request->validate([
            'requested_move_in_date' => ['nullable', 'date'],
            'requested_move_out_date' => ['nullable', 'date', 'after_or_equal:requested_move_in_date'],
            'tenant_terms' => 'nullable|string',
            'tenant_signature' => 'nullable|string|max:20',
        ]);

        $hasContentChange =
            (array_key_exists('requested_move_in_date', $validated)
                && ($validated['requested_move_in_date']
                    ? CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString()
                    : null) !== $lease->requested_move_in_date?->toDateString()) ||
            (array_key_exists('requested_move_out_date', $validated)
                && ($validated['requested_move_out_date']
                    ? CarbonImmutable::parse($validated['requested_move_out_date'])->toDateString()
                    : null) !== $lease->requested_move_out_date?->toDateString()) ||
            (array_key_exists('tenant_terms', $validated)
                && $validated['tenant_terms'] !== $lease->tenant_terms);

        abort_if(
            $lease->tenant_signed_at !== null && $hasContentChange,
            422,
            'You have already signed this version. The manager must review it before any further changes can be made.'
        );

        $signing = ! empty($validated['tenant_signature']);

        if ($signing) {
            abort_if(
                $lease->tenant_signed_at !== null,
                422,
                'You have already signed this agreement.'
            );

            abort_if(
                $lease->manager_signed_at !== null,
                422,
                'The manager has already signed the final version.'
            );

            abort_if(
                empty($validated['requested_move_in_date'])
                    && $lease->requested_move_in_date === null,
                422,
                'Enter your requested lease start date before signing.'
            );
        }

        $updates = [];

        if (array_key_exists('requested_move_in_date', $validated)) {
            $updates['requested_move_in_date'] = $validated['requested_move_in_date']
                ? CarbonImmutable::parse($validated['requested_move_in_date'])->toDateString()
                : null;
        }

        if (array_key_exists('requested_move_out_date', $validated)) {
            $updates['requested_move_out_date'] = $validated['requested_move_out_date']
                ? CarbonImmutable::parse($validated['requested_move_out_date'])->toDateString()
                : null;
        }

        if (array_key_exists('tenant_terms', $validated)) {
            $updates['tenant_terms'] = $validated['tenant_terms'];
        }

        if ($signing) {
            $updates['tenant_signature'] = trim($validated['tenant_signature']);
            $updates['tenant_signed_at'] = CarbonImmutable::now();
        }

        if ($updates !== []) {
            $lease->update($updates);
            $lease->refresh();
        }

        return response()->json([
            'message' => $signing
                ? 'Your side of the lease has been signed and sent to the manager for final review.'
                : 'Your lease information was updated.',
            'data' => $this->agreementPayload($lease),
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

        abort_if($lease === null || $lease->deposit === null, 404, 'No deposit record is available yet.');
        abort_if((float) $lease->deposit->amount_required <= 0, 422, 'No security deposit is required for this lease.');

        $lease->deposit->update([
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

        $lease->loadMissing(['property', 'unit', 'deposit', 'tenant.organization']);
        $deposit = $lease->deposit;
        $status = $lease->manager_signed_at !== null
            ? 'locked'
            : ($lease->tenant_signed_at !== null
                ? 'awaiting_manager_signature'
                : 'awaiting_tenant_signature');

        return [
            'lease_id' => $lease->id,
            'status' => $lease->status,
            'agreement_status' => $status,
            'start_date' => $lease->start_date?->toDateString(),
            'end_date' => $lease->end_date?->toDateString(),
            'requested_move_in_date' => $lease->requested_move_in_date?->toDateString(),
            'requested_move_out_date' => $lease->requested_move_out_date?->toDateString(),
            'monthly_rent' => $lease->monthly_rent,
            'deposit_amount' => $lease->deposit_amount,
            'rent_due_day' => 5,
            'organization' => $lease->tenant?->organization ? [
                'id' => $lease->tenant->organization->id,
                'name' => $lease->tenant->organization->name,
            ] : null,
            'property' => $lease->property ? [
                'id' => $lease->property->id,
                'name' => $lease->property->name,
                'property_type' => $lease->property->property_type,
                'address' => $lease->property->address,
                'city' => $lease->property->city,
                'country' => $lease->property->country,
            ] : null,
            'unit' => $lease->unit ? [
                'id' => $lease->unit->id,
                'unit_number' => $lease->unit->unit_number,
                'unit_type' => $lease->unit->unit_type,
                'default_rent' => $lease->unit->monthly_rent,
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

        return [
            'id' => $lease->id,
            'status' => $lease->status,
            'start_date' => $lease->start_date?->toDateString(),
            'end_date' => $lease->end_date?->toDateString(),
            'monthly_rent' => $lease->monthly_rent,
            'deposit_amount' => $lease->deposit_amount,
            'notes' => $lease->notes,
        ];
    }

    /** @return array<string, mixed> */
    private function rentPayload(Tenant $tenant, ?Lease $lease): array
    {
        $payments = $lease
            ? $lease->payments()->orderByDesc('payment_date')->orderByDesc('id')->get()
            : collect();
        $monthlyRent = (float) ($lease->monthly_rent ?? 0);
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
