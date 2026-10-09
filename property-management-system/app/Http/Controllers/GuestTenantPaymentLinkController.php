<?php

namespace App\Http\Controllers;

use App\Models\DarajaStkCheckout;
use App\Models\GuestTenantPaymentLink;
use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Services\DarajaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\CarbonImmutable;
use RuntimeException;
use Throwable;

class GuestTenantPaymentLinkController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organizationId = (int) $request->user()->organization_id;
        $leases = Leases::query()
            ->where('organization_id', $organizationId)
            ->with(['tenant:id,first_name,last_name,email,phone', 'property:id,name', 'unit:id,unit_number'])
            ->orderByDesc('id')->get()
            ->filter(fn (Leases $lease) => $this->leaseIsCurrent($lease))
            ->values();

        $links = GuestTenantPaymentLink::where('organization_id', $organizationId)
            ->get()->keyBy('lease_id');

        return response()->json([
            'data' => $leases->map(function (Leases $lease) use ($links) {
                $link = $links->get($lease->id);
                $active = $link && !$link->isRevoked();
                return [
                    'lease_id' => $lease->id,
                    'tenant_name' => trim(($lease->tenant?->first_name ?? '') . ' ' . ($lease->tenant?->last_name ?? '')) ?: 'Tenant',
                    'tenant_email' => $lease->tenant?->email,
                    'property_name' => $lease->property?->name,
                    'unit_number' => $lease->unit?->unit_number,
                    'monthly_rent' => (float) $lease->monthly_rent,
                    'start_date' => $lease->start_date?->toDateString(),
                    'end_date' => $lease->end_date?->toDateString(),
                    'link_created' => (bool) $active,
                    'guest_url' => $active ? $this->guestUrl($link->token) : null,
                    'email_sent_to' => $active ? $link->email_sent_to : null,
                    'last_emailed_at' => $active ? $link->last_emailed_at?->toIso8601String() : null,
                ];
            }),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'lease_id' => ['required', 'integer'],
            'email' => ['nullable', 'email:rfc', 'max:255'],
            'send_email' => ['sometimes', 'boolean'],
        ]);

        $lease = Leases::query()
            ->where('organization_id', $request->user()->organization_id)
            ->with(['tenant', 'property', 'unit', 'organization'])
            ->findOrFail((int) $request->input('lease_id'));

        abort_unless($this->leaseIsCurrent($lease), 422, 'Guest payment links can only be created for a current tenancy.');
        abort_unless($lease->property && $lease->unit
            && (int) $lease->property->organization_id === (int) $lease->organization_id
            && (int) $lease->unit->property_id === (int) $lease->property_id, 422,
            'This lease is not linked to a valid property and unit.');
        
        $link = GuestTenantPaymentLink::where('lease_id', $lease->id)->first();
        if (!$link || $link->isRevoked()) {
            $token = Str::random(64);
            $link = GuestTenantPaymentLink::updateOrCreate(
                ['lease_id' => $lease->id],
                [
                    'organization_id' => $lease->organization_id,
                    'property_id' => $lease->property_id,
                    'unit_id' => $lease->unit_id,
                    'token_hash' => hash('sha256', $token),
                    'token' => $token,
                    'created_by' => $request->user()->id,
                    'revoked_at' => null,
                    'email_sent_to' => null,
                    'last_emailed_at' => null,
                ]
            );
        }

        $url = $this->guestUrl($link->token);
        $recipient = trim((string) $request->input('email', $lease->tenant?->email));
        $sent = false;
        $emailError = null;

        if ($request->boolean('send_email', true) && $recipient !== '' && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            $tenantName = trim(($lease->tenant?->first_name ?? '') . ' ' . ($lease->tenant?->last_name ?? '')) ?: 'Tenant';
            $organizationName = $lease->organization?->name ?? 'Property management';
            try {
                Mail::raw(
                    "Hello {$tenantName},\n\nUse this secure link to make rent payments for {$lease->property->name}, unit {$lease->unit->unit_number}. You do not need to create an account or sign in.\n\n{$url}\n\nKeep this link private. It remains valid while your tenancy is active and becomes unavailable when the lease ends or is terminated. If you receive this in error, contact {$organizationName}.",
                    function ($message) use ($recipient, $organizationName) {
                        $message->to($recipient)->subject("Your rent payment link — {$organizationName}");
                    }
                );
                $link->update(['email_sent_to' => $recipient, 'last_emailed_at' => now()]);
                $sent = true;
            } catch (Throwable $exception) {
                report($exception);
                $emailError = 'The link was created, but email delivery failed. Copy the link and share it securely, or check the mail configuration.';
            }
        } elseif ($request->boolean('send_email', true)) {
            $emailError = 'No valid tenant email is saved. The link is ready to copy; add an email address to send it from this page.';
        }

        return response()->json([
            'message' => $sent ? 'Secure guest payment link created and emailed.' : ($emailError ?: 'Secure guest payment link is ready to copy.'),
            'guest_url' => $url,
            'email_sent' => $sent,
            'email_error' => $emailError,
            'email_sent_to' => $link->email_sent_to,
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $link = $this->findValidLink($token);
        $lease = $link->lease()->with(['organization:id,name,logo_path', 'property:id,name,address,city,country,organization_id', 'unit:id,unit_number,property_id'])->firstOrFail();
        $destinations = PaymentDestination::where('organization_id', $lease->organization_id)
            ->where('property_id', $lease->property_id)->where('is_active', true)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])->get()
            ->filter(fn (PaymentDestination $destination) => $destination->stkPushReady())
            ->map(fn (PaymentDestination $destination) => [
                'id' => $destination->id,
                'label' => $destination->label ?: ($destination->method === 'mpesa_till' ? 'M-PESA Till' : 'M-PESA PayBill'),
                'method' => $destination->method,
            ])->values();

        return response()->json([
            'data' => [
                'organization' => $lease->organization?->name,
                'property' => $lease->property?->name,
                'address' => trim(implode(', ', array_filter([$lease->property?->address, $lease->property?->city, $lease->property?->country]))),
                'unit' => $lease->unit?->unit_number,
                'monthly_rent' => (float) $lease->monthly_rent,
                'currency' => $lease->organization?->currency ?: 'KES',
                'tenant_name' => trim(($lease->tenant?->first_name ?? '') . ' ' . ($lease->tenant?->last_name ?? '')) ?: 'Tenant',
                'lease_start' => $lease->start_date?->toDateString(),
                'lease_end' => $lease->end_date?->toDateString(),
                'payment_destinations' => $destinations,
            ],
        ]);
    }

    public function initiateStk(Request $request, string $token, DarajaService $daraja): JsonResponse
    {
        $link = $this->findValidLink($token);
        $lease = $link->lease()->with(['property', 'unit'])->firstOrFail();
        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:250000'],
            'phone' => ['required', 'string', 'max:30'],
            'payment_destination_id' => ['required', 'integer'],
        ]);

        $destination = PaymentDestination::where('id', $validated['payment_destination_id'])
            ->where('organization_id', $lease->organization_id)
            ->where('property_id', $lease->property_id)
            ->where('is_active', true)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])->first();
        abort_if(!$destination || !$destination->stkPushReady(), 422,
            'M-PESA payments are not currently available for this property.');

        try {
            $phone = $daraja->normalizePhone($validated['phone']);
        } catch (RuntimeException) {
            abort(422, 'Enter a valid Kenyan M-PESA phone number.');
        }

        $reference = 'P' . strtoupper(base_convert((string) $lease->id, 10, 36));
        $checkout = DarajaStkCheckout::create([
            'organization_id' => $lease->organization_id,
            'lease_id' => $lease->id,
            'payment_destination_id' => $destination->id,
            'account_reference' => substr($reference, 0, 12),
            'tenant_payment_reference' => (string) ($lease->tenant_payment_reference ?: ('LEASE' . $lease->id)),
            'phone' => $phone,
            'amount' => (int) $validated['amount'],
            'status' => 'requesting',
        ]);

        try {
            $response = $daraja->initiateStk($destination, $phone, (int) $validated['amount'], $checkout->account_reference);
            $checkout->update([
                'checkout_request_id' => $response['CheckoutRequestID'],
                'merchant_request_id' => $response['MerchantRequestID'] ?? null,
                'status' => 'pending',
                'result_description' => $response['CustomerMessage'] ?? 'STK Push sent to phone.',
            ]);
        } catch (Throwable $exception) {
            $checkout->update(['status' => 'failed', 'result_description' => 'Daraja could not start the STK Push request.']);
            report($exception);
            return response()->json(['message' => 'Safaricom could not start the M-PESA prompt. Check the number and try again.'], 502);
        }

        return response()->json(['message' => 'M-PESA prompt sent. Enter your PIN on your phone to complete payment.', 'status' => 'pending'], 202);
    }

    public function revoke(Request $request, GuestTenantPaymentLink $guestTenantPaymentLink): JsonResponse
    {
        abort_unless((int) $guestTenantPaymentLink->organization_id === (int) $request->user()->organization_id, 404);
        $guestTenantPaymentLink->update(['revoked_at' => now()]);
        return response()->json(['message' => 'Guest payment link revoked.']);
    }

    private function findValidLink(string $token): GuestTenantPaymentLink
    {
        abort_unless(preg_match('/^[A-Za-z0-9]{64}$/', $token) === 1, 404, 'This payment link is invalid or no longer available.');
        $link = GuestTenantPaymentLink::where('token_hash', hash('sha256', $token))->first();
        abort_if(!$link || $link->isRevoked(), 404, 'This payment link is invalid or no longer available.');
        $lease = $link->lease()->with(['property', 'unit'])->first();
        abort_if(!$lease || !$this->leaseIsCurrent($lease)
            || (int) $lease->organization_id !== (int) $link->organization_id
            || (int) $lease->property_id !== (int) $link->property_id
            || (int) $lease->unit_id !== (int) $link->unit_id
            || !$lease->property || !$lease->unit
            || (int) $lease->property->organization_id !== (int) $link->organization_id
            || (int) $lease->unit->property_id !== (int) $link->property_id,
            404, 'This payment link is no longer active for this tenancy.');
        return $link;
    }

    private function leaseIsCurrent(Leases $lease): bool
    {
        $today = CarbonImmutable::today();
        if (in_array($lease->getRawOriginal('status'), ['ended', 'terminated', 'pending'], true)) return false;
        if (!$lease->start_date || CarbonImmutable::parse($lease->start_date)->greaterThan($today)) return false;
        if ($lease->end_date && CarbonImmutable::parse($lease->end_date)->lessThan($today)) return false;
        return true;
    }

    private function guestUrl(string $token): string
    {
        $base = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        return $base . '/guest-payment/' . $token;
    }
}
