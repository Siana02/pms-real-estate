<?php

namespace Tests\Unit;

use App\Models\Organization;
use App\Models\OrganizationDarajaCredential;
use App\Models\PaymentDestination;
use App\Services\DarajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentDestinationDarajaConfigurationTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        config(['daraja.environment' => 'sandbox']);
        $this->organization = Organization::create(['name' => 'Daraja Test Organization', 'email' => 'daraja-test.invalid']);
        OrganizationDarajaCredential::create([
            'organization_id' => $this->organization->id,
            'consumer_key' => 'organization-consumer-key',
            'consumer_secret' => 'organization-consumer-secret',
            'enabled' => true,
        ]);
    }

    public function test_destination_is_not_stk_ready_until_merchant_authorization_is_verified(): void
    {
        $destination = $this->configuredDestination('awaiting_merchant_authorization');

        $this->assertFalse($destination->stkPushReady());

        $destination->daraja_authorization_status = 'ready';

        $this->assertTrue($destination->stkPushReady());
    }

    public function test_destination_is_not_ready_when_organization_credentials_are_missing(): void
    {
        OrganizationDarajaCredential::where('organization_id', $this->organization->id)->delete();

        $destination = $this->configuredDestination('ready');

        $this->assertFalse($destination->stkPushReady());
    }

    public function test_merchant_secrets_are_encrypted_and_hidden_from_serialization(): void
    {
        $destination = $this->configuredDestination('awaiting_merchant_authorization');
        $credential = OrganizationDarajaCredential::where('organization_id', $this->organization->id)->firstOrFail();

        $this->assertNotSame('merchant-passkey-secret', $destination->getAttributes()['daraja_passkey']);
        $this->assertNotSame('organization-consumer-secret', $credential->getAttributes()['consumer_secret']);
        $this->assertArrayNotHasKey('daraja_passkey', $destination->toArray());
        $this->assertArrayNotHasKey('daraja_callback_token', $destination->toArray());
        $this->assertArrayNotHasKey('consumer_key', $credential->toArray());
        $this->assertArrayNotHasKey('consumer_secret', $credential->toArray());
    }

    public function test_stk_query_uses_organization_token_and_destination_merchant_credentials(): void
    {
        Cache::flush();
        Http::fake([
            'sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'test-organization-token'], 200),
            'sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query' => Http::response([
                'ResponseCode' => '0',
                'ResponseDescription' => 'The service request has been accepted successfully',
                'CheckoutRequestID' => 'ws_CO_test_query',
                'ResultCode' => '0',
                'ResultDesc' => 'The service request is processed successfully.',
            ], 200),
        ]);

        $result = app(DarajaService::class)->queryStk(
            $this->configuredDestination('ready'),
            'ws_CO_test_query'
        );

        $this->assertSame('0', (string) $result['ResultCode']);
        Http::assertSent(fn (Request $request) =>
            str_contains($request->url(), '/mpesa/stkpushquery/v1/query')
            && $request->hasHeader('Authorization', 'Bearer test-organization-token')
            && $request['BusinessShortCode'] === '174379'
            && $request['CheckoutRequestID'] === 'ws_CO_test_query'
            && filled($request['Password'])
            && filled($request['Timestamp'])
        );
    }

    public function test_stk_push_sends_the_prompt_request_with_the_organization_token_and_merchant_passkey(): void
    {
        Cache::flush();
        config(['app.url' => 'https://pms.example.test']);
        Http::fake([
            'sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'test-organization-token'], 200),
            'sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest' => Http::response([
                'ResponseCode' => '0',
                'ResponseDescription' => 'Success. Request accepted for processing',
                'MerchantRequestID' => 'merchant-request-test',
                'CheckoutRequestID' => 'ws_CO_test_stk_push',
                'CustomerMessage' => 'Success. Request accepted for processing',
            ], 200),
        ]);

        $result = app(DarajaService::class)->initiateStk(
            $this->configuredDestination('ready'),
            '254712345678',
            2500,
            'P1A'
        );

        $this->assertSame('ws_CO_test_stk_push', $result['CheckoutRequestID']);
        Http::assertSent(fn (Request $request) =>
            str_contains($request->url(), '/mpesa/stkpush/v1/processrequest')
            && $request->hasHeader('Authorization', 'Bearer test-organization-token')
            && $request['BusinessShortCode'] === '174379'
            && $request['PartyA'] === '254712345678'
            && $request['PhoneNumber'] === '254712345678'
            && $request['PartyB'] === '174379'
            && $request['TransactionType'] === 'CustomerPayBillOnline'
            && $request['Amount'] === 2500
            && $request['AccountReference'] === 'P1A'
            && $request['TransactionDesc'] === 'Rent payment'
            && $request['CallBackURL'] === 'https://pms.example.test/api/webhooks/daraja/callback-token-secret/stk'
            && filled($request['Password'])
            && preg_match('/^\\d{14}$/', (string) $request['Timestamp']) === 1
        );
    }

    public function test_stk_push_rejects_unverified_destination_before_calling_safaricom(): void
    {
        Http::fake();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('M-PESA STK Push is not ready for this property payment destination.');

        try {
            app(DarajaService::class)->initiateStk(
                $this->configuredDestination('awaiting_merchant_authorization'),
                '254712345678',
                2500,
                'P1A'
            );
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_stk_push_propagates_gateway_rejection_instead_of_reporting_a_prompt_as_sent(): void
    {
        Cache::flush();
        Http::fake([
            'sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'test-organization-token'], 200),
            'sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest' => Http::response([
                'ResponseCode' => '1',
                'ResponseDescription' => 'Invalid Access Token',
            ], 200),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Invalid Access Token');

        app(DarajaService::class)->initiateStk(
            $this->configuredDestination('ready'),
            '254712345678',
            2500,
            'P1A'
        );
    }

    public function test_sandbox_query_rejects_a_real_merchant_shortcode(): void
    {
        $destination = $this->configuredDestination('ready');
        $destination->details = ['paybill' => '123456', 'account' => 'Rent'];

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Daraja sandbox STK testing requires the Safaricom sandbox PayBill shortcode 174379');

        app(DarajaService::class)->queryStk($destination, 'ws_CO_test_query');
    }

    private function configuredDestination(string $status): PaymentDestination
    {
        return new PaymentDestination([
            'organization_id' => $this->organization->id,
            'property_id' => 20,
            'method' => 'mpesa_paybill',
            'details' => ['paybill' => '174379', 'account' => 'Rent'],
            'is_active' => true,
            'daraja_shortcode_type' => 'PayBill',
            'daraja_passkey' => 'merchant-passkey-secret',
            'daraja_callback_token' => 'callback-token-secret',
            'daraja_authorization_status' => $status,
        ]);
    }
}
