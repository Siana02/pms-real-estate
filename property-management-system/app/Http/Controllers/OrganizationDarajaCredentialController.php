<?php

namespace App\\Http\\Controllers;

use App\\Models\\OrganizationDarajaCredential;
use App\\Services\\AuditLogService;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;

class OrganizationDarajaCredentialController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $credential = OrganizationDarajaCredential::where('organization_id', $request->user()->organization_id)->first();

        return response()->json([
            'configured' => $credential?->isConfigured() ?? false,
            'has_consumer_key' => $credential !== null && filled($credential->consumer_key),
            'has_consumer_secret' => $credential !== null && filled($credential->consumer_secret),
            'environment' => config('daraja.environment', 'sandbox'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403,
            'Only the organization owner or administrator can manage Daraja credentials.');

        $validated = $request->validate([
            'consumer_key' => ['required', 'string', 'max:1000'],
            'consumer_secret' => ['required', 'string', 'max:1000'],
        ]);

        $credential = OrganizationDarajaCredential::updateOrCreate(
            ['organization_id' => $request->user()->organization_id],
            [
                'consumer_key' => trim($validated['consumer_key']),
                'consumer_secret' => trim($validated['consumer_secret']),
                'enabled' => true,
            ]
        );

        app(AuditLogService::class)->record(
            'DARAJA_ORGANIZATION_CREDENTIALS_UPDATED',
            'Updated organization Daraja application credentials.',
            $credential,
            [],
            ['configured' => $credential->isConfigured()],
            $request
        );

        return response()->json([
            'message' => 'Organization Daraja credentials saved securely.',
            'configured' => $credential->isConfigured(),
            'has_consumer_key' => true,
            'has_consumer_secret' => true,
        ]);
    }
}
