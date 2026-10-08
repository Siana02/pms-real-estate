<?php

namespace App\Http\Controllers;

use App\Models\FlutterwaveIntegration;
use App\Models\Organization;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class FlutterwaveController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);

        $integration = FlutterwaveIntegration::where('organization_id', $request->user()->organization_id)->first();

        return response()->json([
            'configured' => (bool) $integration,
            'environment' => $integration?->environment,
            'merchant_name' => $integration?->merchant_name,
            'currency' => $integration?->currency ?? 'KES',
            'connected_at' => $integration?->connected_at?->toIso8601String(),
            'webhook_secret_configured' => filled($integration?->webhook_secret),
        ]);
    }

    public function connect(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);

        $validated = $request->validate([
            'secret_key' => ['required', 'string', 'min:20'],
            'environment' => ['required', 'in:test,live'],
        ]);

        $response = Http::withToken($validated['secret_key'])
            ->acceptJson()
            ->get('https://api.flutterwave.com/v3/merchants/profile');

        if (!$response->successful() || ($response->json('status') !== 'success')) {
            return response()->json([
                'message' => 'Flutterwave could not verify that API key. Check the key and environment and try again.',
            ], 422);
        }

        $organization = Organization::findOrFail($request->user()->organization_id);
        $integration = FlutterwaveIntegration::updateOrCreate(
            ['organization_id' => $organization->id],
            [
                'secret_key' => $validated['secret_key'],
                'environment' => $validated['environment'],
                'merchant_name' => $response->json('data.business_name')
                    ?? $response->json('data.name')
                    ?? $organization->name,
                'currency' => 'KES',
                'connected_at' => now(),
                'webhook_secret' => FlutterwaveIntegration::where('organization_id', $organization->id)->value('webhook_secret')
                    ?: Str::random(48),
            ]
        );

        app(AuditLogService::class)->record(
            'FLUTTERWAVE_CONNECTED',
            "Connected Flutterwave payments for {$organization->name}.",
            $integration,
            ['configured' => false],
            ['configured' => true, 'environment' => $integration->environment],
            $request
        );

        return response()->json([
            'message' => 'Flutterwave connected successfully.',
            'configured' => true,
            'environment' => $integration->environment,
            'merchant_name' => $integration->merchant_name,
            'webhook_secret' => $integration->webhook_secret,
            'webhook_url' => rtrim((string) config('app.url'), '/') . '/api/webhooks/flutterwave',
        ]);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $this->authorizeOwner($request);

        $integration = FlutterwaveIntegration::where('organization_id', $request->user()->organization_id)->firstOrFail();
        $integration->delete();

        app(AuditLogService::class)->record(
            'FLUTTERWAVE_DISCONNECTED',
            'Disconnected Flutterwave online payments.',
            null,
            ['configured' => true],
            ['configured' => false],
            $request
        );

        return response()->json(['message' => 'Flutterwave disconnected.']);
    }

    public function webhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $txRef = data_get($payload, 'data.tx_ref');

        if (!is_string($txRef) || !preg_match('/^PMS-ORG-(\d+)-/', $txRef, $matches)) {
            return response()->json(['message' => 'Invalid transaction reference.'], 400);
        }

        $integration = FlutterwaveIntegration::where('organization_id', (int) $matches[1])->first();

        if (!$integration || !hash_equals((string) $integration->webhook_secret, (string) $request->header('verif-hash'))) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $this->verifyAndComplete($integration, $payload);

        return response()->json(['received' => true]);
    }

    public function callback(Request $request): JsonResponse
    {
        $txRef = $request->query('tx_ref');

        if (!is_string($txRef) || !preg_match('/^PMS-ORG-(\d+)-/', $txRef, $matches)) {
            return response()->json(['message' => 'Invalid transaction reference.'], 400);
        }

        $integration = FlutterwaveIntegration::where('organization_id', (int) $matches[1])->firstOrFail();

        $result = $this->verifyTransaction(
            $integration,
            (string) $request->query('transaction_id'),
            $txRef
        );

        return response()->json($result);
    }

    private function verifyAndComplete(FlutterwaveIntegration $integration, array $payload): void
    {
        $data = data_get($payload, 'data', []);
        $id = data_get($data, 'id');
        $txRef = data_get($data, 'tx_ref');

        if (!$id || !$txRef) {
            return;
        }

        $this->verifyTransaction($integration, (string) $id, (string) $txRef);
    }

    private function verifyTransaction(FlutterwaveIntegration $integration, string $transactionId, string $txRef): array
    {
        $payment = \App\Models\Payment::where('tx_ref', $txRef)
            ->where('organization_id', $integration->organization_id)
            ->first();

        if (!$payment) {
            return ['status' => 'not_found'];
        }

        $response = Http::withToken($integration->secret_key)
            ->acceptJson()
            ->get("https://api.flutterwave.com/v3/transactions/{$transactionId}/verify");

        if (!$response->successful() || $response->json('status') !== 'success') {
            return ['status' => 'verification_failed'];
        }

        $tx = $response->json('data', []);
        $valid = ($tx['status'] ?? null) === 'successful'
            && ($tx['tx_ref'] ?? null) === $payment->tx_ref
            && ($tx['currency'] ?? null) === $integration->currency
            && (float) ($tx['amount'] ?? 0) >= (float) $payment->amount;

        if (!$valid) {
            $payment->update([
                'status' => ($tx['status'] ?? '') === 'failed' ? 'failed' : 'pending',
                'provider_transaction_id' => (string) ($tx['id'] ?? $transactionId),
            ]);
            return ['status' => $payment->status];
        }

        $payment->update([
            'status' => 'paid',
            'provider_transaction_id' => (string) ($tx['id'] ?? $transactionId),
            'reference' => $tx['flw_ref'] ?? $payment->reference,
            'receipt_url' => $tx['receipt_url'] ?? null,
            'payment_date' => now()->toDateString(),
        ]);

        return ['status' => 'paid', 'payment_id' => $payment->id];
    }

    private function authorizeOwner(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, ['admin', 'owner'], true),
            403,
            'Only the organization owner or administrator can manage Flutterwave.'
        );
    }
}