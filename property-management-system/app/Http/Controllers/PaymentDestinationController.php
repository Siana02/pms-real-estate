<?php

namespace App\Http\Controllers;

use App\Models\FlutterwaveIntegration;
use App\Models\PaymentDestination;
use App\Models\Property;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentDestinationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $propertyId = $request->query('property_id');

        if ($propertyId) {
            Property::where('organization_id', $user->organization_id)->findOrFail($propertyId);
        }

        $destinations = PaymentDestination::where('organization_id', $user->organization_id)
            ->when($propertyId, fn ($query) => $query->where('property_id', $propertyId))
            ->with('property:id,name')
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $destinations->map(fn (PaymentDestination $destination) => $this->payload($destination)),
            'online' => [
                'available' => FlutterwaveIntegration::where('organization_id', $user->organization_id)->exists(),
                'label' => 'Online payment',
                'description' => 'M-PESA, card or bank transfer through secure checkout.',
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);

        $validated = $request->validate([
            'property_id' => ['required', 'integer', 'exists:properties,id'],
            'method' => ['required', 'in:mpesa_number,mpesa_till,mpesa_paybill,bank'],
            'label' => ['nullable', 'string', 'max:100'],
            'details' => ['required', 'array'],
            'is_active' => ['nullable', 'boolean'],
            'daraja_shortcode_type' => ['nullable', 'in:PayBill,Till'],
            'daraja_passkey' => ['nullable', 'string', 'max:1000'],
            'account_reference_format' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9\/{}_-]+$/'],
        ]);

        $property = Property::where('organization_id', $request->user()->organization_id)
            ->findOrFail($validated['property_id']);

        $details = $this->validateDetails($validated['method'], $validated['details']);
        $isDarajaMethod = in_array($validated['method'], ['mpesa_till', 'mpesa_paybill'], true);
        $shortcodeType = $validated['daraja_shortcode_type'] ?? ($validated['method'] === 'mpesa_till' ? 'Till' : ($validated['method'] === 'mpesa_paybill' ? 'PayBill' : null));
        abort_if($isDarajaMethod && $shortcodeType !== ($validated['method'] === 'mpesa_till' ? 'Till' : 'PayBill'), 422,
            'The Daraja shortcode type must match the selected payment destination.');

        $passkey = filled($validated['daraja_passkey'] ?? null) ? trim($validated['daraja_passkey']) : null;
        $hasConfig = $isDarajaMethod && filled($passkey) && filled($shortcodeType);
        $referenceFormat = $this->validateReferenceFormat($validated['account_reference_format'] ?? null);

        $destination = PaymentDestination::create([
            'organization_id' => $request->user()->organization_id,
            'property_id' => $property->id,
            'method' => $validated['method'],
            'label' => $validated['label'] ?? null,
            'details' => $details,
            'is_active' => $validated['is_active'] ?? true,
            'daraja_shortcode_type' => $isDarajaMethod ? $shortcodeType : null,
            'daraja_passkey' => $isDarajaMethod ? $passkey : null,
            'daraja_authorization_status' => $hasConfig ? 'awaiting_merchant_authorization' : 'not_configured',
            'account_reference_format' => $isDarajaMethod ? $referenceFormat : null,
            'c2b_registration_status' => 'not_registered',
        ]);

        app(AuditLogService::class)->record(
            'PAYMENT_DESTINATION_CONFIGURED',
            "Added {$this->methodLabel($destination->method)} payment destination for {$property->name}.",
            $destination,
            [],
            ['method' => $destination->method, 'active' => $destination->is_active, 'daraja_status' => $destination->daraja_authorization_status],
            $request
        );

        return response()->json([
            'message' => 'Payment destination added. Daraja merchant authorization is not yet verified.',
            'data' => $this->payload($destination->load('property:id,name')),
        ], 201);
    }

    public function update(Request $request, PaymentDestination $paymentDestination): JsonResponse
    {
        $this->authorizeOwner($request);
        $this->authorizeDestination($request, $paymentDestination);

        $validated = $request->validate([
            'method' => ['sometimes', 'required', 'in:mpesa_number,mpesa_till,mpesa_paybill,bank'],
            'label' => ['nullable', 'string', 'max:100'],
            'details' => ['sometimes', 'required', 'array'],
            'is_active' => ['sometimes', 'boolean'],
            'daraja_shortcode_type' => ['sometimes', 'nullable', 'in:PayBill,Till'],
            'daraja_passkey' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'account_reference_format' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9\/{}_-]+$/'],
        ]);

        $method = $validated['method'] ?? $paymentDestination->method;
        $details = array_key_exists('details', $validated)
            ? $this->validateDetails($method, $validated['details'])
            : $paymentDestination->details;
        $isDarajaMethod = in_array($method, ['mpesa_till', 'mpesa_paybill'], true);
        $expectedType = $method === 'mpesa_till' ? 'Till' : ($method === 'mpesa_paybill' ? 'PayBill' : null);
        $shortcodeType = array_key_exists('daraja_shortcode_type', $validated)
            ? $validated['daraja_shortcode_type']
            : ($isDarajaMethod ? ($paymentDestination->daraja_shortcode_type ?: $expectedType) : null);
        abort_if($isDarajaMethod && $shortcodeType !== $expectedType, 422,
            'The Daraja shortcode type must match the selected payment destination.');

        $oldShortcode = $paymentDestination->darajaShortcode();
        $newShortcode = match ($method) {
            'mpesa_paybill' => (string) ($details['paybill'] ?? ''),
            'mpesa_till' => (string) ($details['till'] ?? ''),
            default => null,
        };
        $merchantChanged = $method !== $paymentDestination->method
            || $oldShortcode !== $newShortcode
            || $shortcodeType !== $paymentDestination->daraja_shortcode_type;
        $passkeyWasSubmitted = array_key_exists('daraja_passkey', $validated);
        $passkey = $passkeyWasSubmitted
            ? (filled($validated['daraja_passkey']) ? trim($validated['daraja_passkey']) : null)
            : ($merchantChanged ? null : $paymentDestination->daraja_passkey);
        $hasConfig = $isDarajaMethod && filled($newShortcode) && filled($passkey) && filled($shortcodeType);
        $referenceFormat = array_key_exists('account_reference_format', $validated)
            ? $this->validateReferenceFormat($validated['account_reference_format'])
            : $paymentDestination->account_reference_format;

        $old = [
            'method' => $paymentDestination->method,
            'is_active' => $paymentDestination->is_active,
            'daraja_authorization_status' => $paymentDestination->daraja_authorization_status,
        ];

        $paymentDestination->update([
            'method' => $method,
            'label' => array_key_exists('label', $validated) ? $validated['label'] : $paymentDestination->label,
            'details' => $details,
            'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $paymentDestination->is_active,
            'daraja_shortcode_type' => $isDarajaMethod ? $shortcodeType : null,
            'daraja_passkey' => $isDarajaMethod ? $passkey : null,
            'daraja_authorization_status' => $hasConfig
                ? (($merchantChanged || $passkeyWasSubmitted) ? 'awaiting_merchant_authorization' : $paymentDestination->daraja_authorization_status)
                : 'not_configured',
            'daraja_authorization_checked_at' => ($merchantChanged || $passkeyWasSubmitted) ? null : $paymentDestination->daraja_authorization_checked_at,
            'account_reference_format' => $isDarajaMethod ? $referenceFormat : null,
            'c2b_registration_status' => ($merchantChanged || $passkeyWasSubmitted) ? 'not_registered' : $paymentDestination->c2b_registration_status,
            'c2b_registered_at' => ($merchantChanged || $passkeyWasSubmitted) ? null : $paymentDestination->c2b_registered_at,
        ]);

        app(AuditLogService::class)->record(
            'PAYMENT_DESTINATION_UPDATED',
            "Updated {$this->methodLabel($paymentDestination->method)} payment destination.",
            $paymentDestination,
            $old,
            ['method' => $paymentDestination->method, 'is_active' => $paymentDestination->is_active, 'daraja_authorization_status' => $paymentDestination->daraja_authorization_status],
            $request
        );

        return response()->json([
            'message' => 'Payment destination updated. Any changed Daraja merchant configuration must be re-verified.',
            'data' => $this->payload($paymentDestination->fresh('property:id,name')),
        ]);
    }

    public function destroy(Request $request, PaymentDestination $paymentDestination): JsonResponse
    {
        $this->authorizeOwner($request);
        $this->authorizeDestination($request, $paymentDestination);

        $paymentDestination->update(['is_active' => false]);

        app(AuditLogService::class)->record(
            'PAYMENT_DESTINATION_DISABLED',
            "Disabled {$this->methodLabel($paymentDestination->method)} payment destination.",
            $paymentDestination,
            ['is_active' => true],
            ['is_active' => false],
            $request
        );

        return response()->json(['message' => 'Payment destination disabled.']);
    }

    private function validateDetails(string $method, array $details): array
    {
        return match ($method) {
            'mpesa_number' => ['number' => $this->validateNumber($details['number'] ?? null)],
            'mpesa_till' => ['till' => $this->validateTill($details['till'] ?? null)],
            'mpesa_paybill' => [
                'paybill' => $this->validatePaybill($details['paybill'] ?? null),
                'account' => $this->requiredString($details['account'] ?? null, 'PayBill account'),
            ],
            'bank' => [
                'bank_name' => $this->requiredString($details['bank_name'] ?? null, 'Bank name'),
                'account_name' => $this->requiredString($details['account_name'] ?? null, 'Account name'),
                'account_number' => $this->requiredString($details['account_number'] ?? null, 'Account number'),
                'branch' => isset($details['branch']) ? trim((string) $details['branch']) : null,
            ],
        };
    }

    private function validateNumber(mixed $value): string
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        abort_unless(preg_match('/^(?:2547\d{8}|07\d{8})$/', $digits), 422, 'Enter a valid Kenyan M-PESA number.');
        return $digits;
    }

    private function validateTill(mixed $value): string
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        abort_unless(preg_match('/^\d{5,7}$/', $digits), 422, 'Enter a valid M-PESA Till number.');
        return $digits;
    }

    private function validatePaybill(mixed $value): string
    {
        $digits = preg_replace('/\D/', '', (string) $value);
        abort_unless(preg_match('/^\d{5,7}$/', $digits), 422, 'Enter a valid M-PESA PayBill number.');
        return $digits;
    }

    private function validateReferenceFormat(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        abort_if(!str_contains($value, '{unit}') && !str_contains($value, '{lease}'), 422,
            'Account-reference format must contain {unit} or {lease}, for example 51683/{unit}.');
        abort_if(preg_match('/\{(?!unit\}|lease\})/', $value), 422,
            'Only the {unit} and {lease} placeholders are supported.');
        return $value;
    }

    private function requiredString(mixed $value, string $label): string
    {
        $value = trim((string) $value);
        abort_if($value === '', 422, "{$label} is required.");
        return $value;
    }

    private function payload(PaymentDestination $destination): array
    {
        $platformConfigured = (bool) config('daraja.platform_enabled')
            && filled(config('daraja.consumer_key'))
            && filled(config('daraja.consumer_secret'));

        return [
            'id' => $destination->id,
            'property_id' => $destination->property_id,
            'property_name' => $destination->property?->name,
            'method' => $destination->method,
            'label' => $destination->label,
            'details' => $destination->details,
            'is_active' => $destination->is_active,
            'account_reference_format' => $destination->account_reference_format,
            'daraja' => [
                'shortcode_type' => $destination->daraja_shortcode_type,
                'has_passkey' => filled($destination->daraja_passkey),
                'authorization_status' => $destination->daraja_authorization_status,
                'authorization_checked_at' => $destination->daraja_authorization_checked_at?->toIso8601String(),
                'c2b_registration_status' => $destination->c2b_registration_status,
                'c2b_registered_at' => $destination->c2b_registered_at?->toIso8601String(),
                'platform_configured' => $platformConfigured,
                'stk_push_available' => $destination->stkPushReady(),
            ],
        ];
    }

    private function methodLabel(string $method): string
    {
        return match ($method) {
            'mpesa_number' => 'M-PESA number',
            'mpesa_till' => 'M-PESA Till',
            'mpesa_paybill' => 'M-PESA PayBill',
            'bank' => 'bank',
            default => $method,
        };
    }

    private function authorizeOwner(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, ['admin', 'owner'], true),
            403,
            'Only the organization owner or administrator can manage payment destinations.'
        );
    }

    private function authorizeDestination(Request $request, PaymentDestination $destination): void
    {
        abort_unless($destination->organization_id === $request->user()->organization_id, 403);
    }
}
