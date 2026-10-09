<?php

namespace Tests\Unit;

use App\Models\PaymentDestination;
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

    private function configuredDestination(string $status): PaymentDestination
    {
        return new PaymentDestination([
            'organization_id' => 10,
            'property_id' => 20,
            'method' => 'mpesa_paybill',
            'details' => ['paybill' => '123456', 'account' => 'Rent'],
            'is_active' => true,
            'daraja_shortcode_type' => 'PayBill',
            'daraja_passkey' => 'merchant-passkey-secret',
            'daraja_callback_token' => 'callback-token-secret',
            'daraja_authorization_status' => $status,
        ]);
    }
}
