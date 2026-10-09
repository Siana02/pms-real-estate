<?php

namespace Tests\Unit;

use App\Models\PaymentDestination;
use App\Services\DarajaService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentDestinationDarajaConfigurationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'daraja.platform_enabled' => true,
            'daraja.consumer_key' => 'platform-consumer-key',
            'daraja.consumer_secret' => 'platform-consumer-secret',
            'daraja.environment' => 'sandbox',
        ]);
    }

    public function test_destination_is_not_stk_ready_until_merchant_authorization_is_verified(): void
    {
        $destination = $this->configuredDestination('awaiting_merchant_authorization');

        $this->assertFalse($destination->stkPushReady());

        $destination->daraja_authorization_status = 'ready';

        $this->assertTrue($destination->stkPushReady());
    }

    public function test_destination_is_not_ready_when_platform_credentials_are_missing(): void
    {
        config(['daraja.platform_enabled' => false]);

        $destination = $this->configuredDestination('ready');

        $this->assertFalse($destination->stkPushReady());
    }

    public function test_merchant_secrets_are_encrypted_and_hidden_from_serialization(): void
    {
        $destination = $this->configuredDestination('awaiting_merchant_authorization');

        $this->assertNotSame('merchant-passkey-secret', $destination->getAttributes()['daraja_passkey']);
        $this->assertNotSame('callback-token-secret', $destination->getAttributes()['daraja_callback_token']);
        $this->assertArrayNotHasKey('daraja_passkey', $destination->toArray());
        $this->assertArrayNotHasKey('daraja_callback_token', $destination->toArray());
    }

    public function test_stk_query_uses_platform_token_and_destination_merchant_credentials(): void
    {
        Cache::forget('daraja:platform-token:sandbox');
        Http::fake([
            'sandbox.safaricom.co.ke/oauth/v1/generate*' => Http::response(['access_token' => 'test-platform-token'], 200),
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
            && $request->hasHeader('Authorization', 'Bearer test-platform-token')
            && $request['BusinessShortCode'] === '174379'
            && $request['CheckoutRequestID'] === 'ws_CO_test_query'
            && filled($request['Password'])
            && filled($request['Timestamp'])
        );
    }

    public function test_sandbox_query_rejects_a_real_merchant_shortcode(): void
    {
        $destination = $this->configuredDestination('ready');
        $destination->details = ['paybill' => '123456', 'account' => 'Rent'];

        $this->expectException(\\RuntimeException::class);
        $this->expectExceptionMessage('Daraja sandbox STK testing requires the Safaricom sandbox PayBill shortcode 174379');

        app(DarajaService::class)->queryStk($destination, 'ws_CO_test_query');
    }

    private function configuredDestination(string $status): PaymentDestination
    {
        return new PaymentDestination([
            'organization_id' => 10,
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
