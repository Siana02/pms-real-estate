<?php

namespace App\Services;

use App\Models\DarajaIntegration;
use App\Models\PaymentDestination;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class DarajaService
{
    public function accessToken(?DarajaIntegration $legacyIntegration = null): string
    {
        $environment = (string) config('daraja.environment', 'sandbox');
        $consumerKey = config('daraja.consumer_key');
        $consumerSecret = config('daraja.consumer_secret');

        if (!config('daraja.platform_enabled') || !filled($consumerKey) || !filled($consumerSecret)) {
            throw new RuntimeException('The MARSWebz Daraja platform integration is not configured.');
        }

        $cacheKey = 'daraja:platform-token:' . $environment;
        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($consumerKey, $consumerSecret, $environment) {
            $response = Http::withBasicAuth((string) $consumerKey, (string) $consumerSecret)
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

        $response = Http::withToken($this->accessToken())
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
     * C2B registration is retained for the legacy registration workflow while
     * C2B is migrated to shared shortcode registrations. Platform credentials
     * are still used; the organization model supplies only the merchant shortcode.
     */
    public function registerC2BUrls(DarajaIntegration $integration, string $confirmationUrl, string $validationUrl): array
    {
        $response = Http::withToken($this->accessToken())
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/c2b/v1/registerurl', [
                'ShortCode' => $integration->shortcode,
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

    public function baseUrl(?DarajaIntegration $legacyIntegration = null): string
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
