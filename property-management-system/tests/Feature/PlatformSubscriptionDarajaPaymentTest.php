<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\PlatformSubscription;
use App\Models\PlatformSubscriptionPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlatformSubscriptionDarajaPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_stk_callback_confirms_payment_and_activates_the_selected_plan(): void
    {
        $organization = $this->organization('stk-owner');
        $subscription = $this->pendingSubscription($organization);
        $owner = $this->owner($organization, 'stk-owner');
        config([
            'daraja.environment' => 'production',
            'daraja.consumer_key' => 'consumer-key',
            'daraja.consumer_secret' => 'consumer-secret',
            'services.platform_billing.till_number' => '1820937',
            'services.platform_billing.passkey' => 'platform-passkey',
            'services.platform_billing.callback_token' => 'test-callback-token',
            'app.url' => 'https://pms.example.test',
        ]);

        Http::fake([
            'https://api.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'test-token'], 200),
            'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest' => Http::response([
                'ResponseCode' => '0',
                'CheckoutRequestID' => 'ws_CO_platform_123',
                'MerchantRequestID' => 'mr_platform_123',
                'CustomerMessage' => 'Prompt sent',
            ], 200),
        ]);

        $token = $owner->createToken('test')->plainTextToken;
        $started = $this->withToken($token)->postJson('/api/platform-subscription/stk-push', [
            'phone' => '0712345678',
        ]);
        $started->assertAccepted()->assertJsonPath('payment.checkout_request_id', 'ws_CO_platform_123');

        $this->postJson('/api/webhooks/daraja/platform-subscriptions/test-callback-token/stk', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => 'mr_platform_123',
                    'CheckoutRequestID' => 'ws_CO_platform_123',
                    'ResultCode' => 0,
                    'ResultDesc' => 'The service request is processed successfully.',
                    'CallbackMetadata' => ['Item' => [
                        ['Name' => 'Amount', 'Value' => 125],
                        ['Name' => 'MpesaReceiptNumber', 'Value' => 'QWE1234567'],
                        ['Name' => 'PhoneNumber', 'Value' => 254712345678],
                    ]],
                ],
            ],
        ])->assertOk()->assertJsonPath('ResultCode', 0);

        $this->assertDatabaseHas('platform_subscription_payments', [
            'platform_subscription_id' => $subscription->id,
            'checkout_request_id' => 'ws_CO_platform_123',
            'mpesa_receipt' => 'QWE1234567',
            'status' => 'confirmed',
        ]);
        $this->assertSame('active', $subscription->fresh()->status);
        $this->assertSame('premium', $subscription->fresh()->plan_code);
    }

    public function test_c2b_receipt_received_before_submission_matches_exact_reference_and_amount(): void
    {
        $organization = $this->organization('c2b-owner');
        $subscription = $this->pendingSubscription($organization);
        $owner = $this->owner($organization, 'c2b-owner');
        config([
            'services.platform_billing.till_number' => '1820937',
            'services.platform_billing.callback_token' => 'test-callback-token',
        ]);

        $this->postJson('/api/webhooks/daraja/platform-subscriptions/test-callback-token/c2b', [
            'TransactionType' => 'Buy Goods',
            'TransID' => 'ABC1234567',
            'TransTime' => '20261016123000',
            'TransAmount' => '125.00',
            'BusinessShortCode' => '1820937',
            'BillRefNumber' => '',
            'MSISDN' => '254712345678',
        ])->assertOk()->assertJsonPath('ResultCode', 0);

        $token = $owner->createToken('test')->plainTextToken;
        $response = $this->withToken($token)->postJson('/api/platform-subscription/payment-reference', [
            'reference' => 'ABC1234567',
            'amount' => 125,
        ]);
        $response->assertCreated()->assertJsonPath('payment.status', 'confirmed');

        $this->assertDatabaseHas('platform_subscription_mpesa_events', [
            'transaction_id' => 'ABC1234567',
            'platform_subscription_payment_id' => $response->json('payment.id'),
            'status' => 'matched',
        ]);
        $this->assertSame('active', $subscription->fresh()->status);
    }

    public function test_staff_cannot_initiate_platform_subscription_stk(): void
    {
        $organization = $this->organization('staff-owner');
        $this->pendingSubscription($organization);
        $staff = User::create([
            'organization_id' => $organization->id,
            'name' => 'Staff Member',
            'username' => 'staff-member',
            'email' => 'staff-member@example.test',
            'password' => Hash::make('StaffPass123!'),
            'role' => 'staff',
        ]);

        $token = $staff->createToken('test')->plainTextToken;
        $this->withToken($token)->postJson('/api/platform-subscription/stk-push', [
            'phone' => '0712345678',
        ])->assertForbidden();
    }

    private function organization(string $slug): Organization
    {
        return Organization::create([
            'name' => 'Property Group ' . $slug,
            'username' => $slug,
            'email' => $slug . '@example.test',
            'country' => 'Kenya',
        ]);
    }

    private function owner(Organization $organization, string $slug): User
    {
        $owner = User::create([
            'organization_id' => $organization->id,
            'name' => 'Owner ' . $slug,
            'username' => $slug . '-owner',
            'email' => $slug . '-owner@example.test',
            'password' => Hash::make('OwnerPass123!'),
            'role' => 'owner',
        ]);
        $organization->update(['owner_user_id' => $owner->id]);
        return $owner;
    }

    private function pendingSubscription(Organization $organization): PlatformSubscription
    {
        return PlatformSubscription::create([
            'organization_id' => $organization->id,
            'plan_code' => 'premium',
            'status' => 'pending_payment',
            'billing_cycle' => 'monthly',
            'billable_units' => 1,
            'monthly_amount' => 125,
            'unit_mix' => ['Portfolio units' => 1],
        ]);
    }
}
