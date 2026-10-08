<?php

namespace App\Http\Controllers;

use App\Models\OrganizationPaymentSetting;
use Illuminate\Http\Request;

class OrganizationPaymentSettingsController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $canManage = in_array($user->role, ['admin', 'owner'], true);
        $settings = OrganizationPaymentSetting::firstOrCreate([
            'organization_id' => $user->organization_id,
        ]);

        $configured = $settings->preferred_method === 'mpesa'
            ? filled($settings->mpesa_number)
            : ($settings->preferred_method === 'bank'
                ? filled($settings->bank_name) && filled($settings->bank_account_name) && filled($settings->bank_account_number)
                : false);

        if (!$canManage) {
            return response()->json([
                'can_manage' => false,
                'configured' => $configured,
                'preferred_method' => $settings->preferred_method,
            ]);
        }

        return response()->json([
            'can_manage' => true,
            'configured' => $configured,
            'preferred_method' => $settings->preferred_method,
            'mpesa_number' => $settings->mpesa_number ? '••••' . substr($settings->mpesa_number, -4) : null,
            'mpesa_till' => $settings->mpesa_till ? '••••' . substr($settings->mpesa_till, -4) : null,
            'mpesa_paybill' => $settings->mpesa_paybill ? '••••' . substr($settings->mpesa_paybill, -4) : null,
            'bank_name' => $settings->bank_name,
            'bank_account_name' => $settings->bank_account_name,
            'bank_account_number' => $settings->bank_account_number ? '••••' . substr($settings->bank_account_number, -4) : null,
            'bank_branch' => $settings->bank_branch,
        ]);
    }

    public function update(Request $request)
    {
        $this->authorizeOwner($request);

        $validated = $request->validate([
            'preferred_method' => ['nullable', 'in:mpesa_number,mpesa_till,mpesa_paybill,bank'],
            'mpesa_number' => ['nullable', 'string', 'max:30'],
            'mpesa_till' => ['nullable', 'string', 'max:30'],
            'mpesa_paybill' => ['nullable', 'string', 'max:30'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'bank_branch' => ['nullable', 'string', 'max:255'],
        ]);

        $settings = OrganizationPaymentSetting::updateOrCreate(
            ['organization_id' => $request->user()->organization_id],
            $validated
        );

        return response()->json([
            'message' => 'Payment destination settings updated.',
            'preferred_method' => $settings->preferred_method,
            'mpesa_number' => $settings->mpesa_number ? '••••' . substr($settings->mpesa_number, -4) : null,
            'bank_account_number' => $settings->bank_account_number ? '••••' . substr($settings->bank_account_number, -4) : null,
        ]);
    }

    private function authorizeOwner(Request $request): void
    {
        abort_unless(
            in_array($request->user()->role, ['admin', 'owner'], true),
            403,
            'Only the organization owner or administrator can manage payment destinations.'
        );
    }
}