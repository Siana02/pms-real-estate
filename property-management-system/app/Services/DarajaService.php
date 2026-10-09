<?php

namespace App\Services;

use App\Models\PaymentDestination;
use App\Models\OrganizationDarajaCredential;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class DarajaService
{
    public function accessToken(PaymentDestination $destination): string
    {
        $environment = (string) config('daraja.environment', 'sandbox');
        $credential = OrganizationDarajaCredential::where('organization_id', $destination->organization_id)->first();

        if (!$credential || !$credential->isConfigured()) {
            throw new RuntimeException('This organization has not configured its own Daraja consumer key and consumer secret.');
        }

        $consumerKey = (string) $credential->consumer_key;
        $consumerSecret = (string) $credential->consumer_secret;
        $cacheKey = 'daraja:organization-token:' . $environment . ':' . $destination->organization_id . ':' . hash('sha256', $consumerKey);

        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($consumerKey, $consumerSecret) {
            $response = Http::withBasicAuth($consumerKey, $consumerSecret)
                ->acceptJson()->timeout(15)
                ->get($this->baseUrl() . '/oauth/v1/generate', ['grant_type' => 'client_credentials']);
            $response->throw();
            $token = $response->json('access_token');
            if (!is_string($token) || $token === '') {
                throw new RuntimeException('Daraja did not return an access token.');
            }
            return $token;
        });
    }

    public function initiateStk(PaymentDestination $destination, string $phone, int $amount, string $reference): array
    {
        if (!$destination->stkPushReady()) {
            throw new RuntimeException('M-PESA STK Push is not ready for this property payment destination.');
        }

        $shortcode = $destination->darajaShortcode();
        $passkey = $destination->daraja_passkey;
        $callbackToken = $destination->daraja_callback_token;
        $this->assertEnvironmentShortcode($destination, $shortcode);

        if (!filled($shortcode) || !filled($passkey) || !filled($callbackToken)) {
            throw new RuntimeException('The property merchant configuration is incomplete.');
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode($shortcode . $passkey . $timestamp);
        $payload = [
            'BusinessShortCode' => $shortcode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => $destination->daraja_shortcode_type === 'Till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
            'Amount' => $amount,
            'PartyA' => $phone,
            'PartyB' => $shortcode,
            'PhoneNumber' => $phone,
            'CallBackURL' => rtrim((string) config('app.url'), '/') . '/api/webhooks/daraja/' . rawurlencode($callbackToken) . '/stk',
            'AccountReference' => Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $reference) ?: 'RENT', 12, ''),
            'TransactionDesc' => 'Rent payment',
        ];

        $response = Http::withToken($this->accessToken($destination))
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/stkpush/v1/processrequest', $payload);
        $response->throw();
        $data = $response->json();

        if ((string) ($data['ResponseCode'] ?? '') !== '0' || empty($data['CheckoutRequestID'])) {
            throw new RuntimeException($data['ResponseDescription'] ?? 'Safaricom could not start the STK Push.');
        }

        return $data;
    }

    /**
     * Query Safaricom for the current state of an existing STK checkout.
     *
     * A successful query response confirms transaction status but may not include the
     * M-PESA receipt/amount metadata required for ledger reconciliation. Callers must
     * never create a paid ledger entry from ResultCode alone.
     */
    public function queryStk(PaymentDestination $destination, string $checkoutRequestId): array
    {
        $shortcode = $destination->darajaShortcode();
        $passkey = $destination->daraja_passkey;
        $this->assertEnvironmentShortcode($destination, $shortcode);

        if (!filled($shortcode) || !filled($passkey)) {
            throw new RuntimeException('The property merchant shortcode or STK passkey is missing.');
        }

        if (trim($checkoutRequestId) === '') {
            throw new RuntimeException('A checkout request ID is required to query an STK request.');
        }

        $timestamp = now()->format('YmdHis');
        $payload = [
            'BusinessShortCode' => $shortcode,
            'Password' => base64_encode($shortcode . $passkey . $timestamp),
            'Timestamp' => $timestamp,
            'CheckoutRequestID' => $checkoutRequestId,
        ];

        $response = Http::withToken($this->accessToken($destination))
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/stkpushquery/v1/query', $payload);
        $response->throw();
        $data = $response->json();

        if (!is_array($data) || (string) ($data['ResponseCode'] ?? '') !== '0') {
            throw new RuntimeException('Safaricom rejected the STK status query (ResponseCode ' . (string) ($data['ResponseCode'] ?? 'missing') . '): ' . (string) ($data['ResponseDescription'] ?? 'No response description was supplied.'));
        }

        return $data;
    }

    /**
     * Register the shared C2B callback pair using the owning organization's Daraja app.
     */
    public function registerC2BUrls(PaymentDestination $destination, string $confirmationUrl, string $validationUrl): array
    {
        $shortcode = $destination->darajaShortcode();
        if (!filled($shortcode)) {
            throw new RuntimeException('A merchant shortcode is required for C2B registration.');
        }

        $response = Http::withToken($this->accessToken($destination))
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/c2b/v1/registerurl', [
                'ShortCode' => $shortcode,
                'ResponseType' => 'Completed',
                'ConfirmationURL' => $confirmationUrl,
                'ValidationURL' => $validationUrl,
            ]);
        $response->throw();
        $data = $response->json();

        if ((string) ($data['ResponseCode'] ?? '') !== '0') {
            throw new RuntimeException($data['ResponseDescription'] ?? 'Safaricom did not register the C2B callback URLs.');
        }

        return $data;
    }

    /**
     * Sandbox STK requests must use Safaricom's published Lipa Na M-Pesa Online
     * test shortcode/passkey, not a real merchant shortcode.
     */
    private function assertEnvironmentShortcode(PaymentDestination $destination, ?string $shortcode): void
    {
        if (config('daraja.environment', 'sandbox') !== 'sandbox') {
            return;
        }

        if ($destination->daraja_shortcode_type !== 'PayBill' || $shortcode !== '174379') {
            throw new RuntimeException(
                'Daraja sandbox STK testing requires the Safaricom sandbox PayBill shortcode 174379 and its sandbox passkey. A real PayBill/Till must use verified production credentials and authorization.'
            );
        }
    }

    public function baseUrl(): string
    {
        return config('daraja.environment', 'sandbox') === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    public function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (preg_match('/^0[17]\d{8}$/', $digits)) {
            $digits = '254' . substr($digits, 1);
        } elseif (preg_match('/^[17]\d{8}$/', $digits)) {
            $digits = '254' . $digits;
        }

        if (!preg_match('/^254[17]\d{8}$/', $digits)) {
            throw new RuntimeException('Enter a valid Kenyan M-Pesa phone number.');
        }

        return $digits;
    }
}
