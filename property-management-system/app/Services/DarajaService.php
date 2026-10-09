<?php

namespace App\Services;

use App\Models\DarajaIntegration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class DarajaService
{
    public function accessToken(DarajaIntegration $integration): string
    {
        $cacheKey = 'daraja:token:' . $integration->organization_id . ':' . $integration->environment;
        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($integration) {
            $base = $this->baseUrl($integration);
            $response = Http::withBasicAuth($integration->consumer_key, $integration->consumer_secret)
                ->acceptJson()->timeout(15)
                ->get($base . '/oauth/v1/generate', ['grant_type' => 'client_credentials']);
            $response->throw();
            $token = $response->json('access_token');
            if (!is_string($token) || $token === '') {
                throw new RuntimeException('Daraja did not return an access token.');
            }
            return $token;
        });
    }

    public function initiateStk(DarajaIntegration $integration, string $phone, int $amount, string $reference): array
    {
        if (!$integration->enabled || !$integration->passkey) {
            throw new RuntimeException('M-Pesa STK Push is not enabled for this organization.');
        }

        $timestamp = now()->format('YmdHis');
        $password = base64_encode($integration->shortcode . $integration->passkey . $timestamp);
        $payload = [
            'BusinessShortCode' => $integration->shortcode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => $integration->shortcode_type === 'Till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
            'Amount' => $amount,
            'PartyA' => $phone,
            'PartyB' => $integration->shortcode,
            'PhoneNumber' => $phone,
            'CallBackURL' => rtrim((string) config('app.url'), '/') . '/api/webhooks/daraja/' . rawurlencode((string) $integration->callback_token) . '/stk',
            'AccountReference' => Str::limit(preg_replace('/[^A-Za-z0-9]/', '', $reference) ?: 'RENT', 12, ''),
            'TransactionDesc' => 'Rent payment',
        ];

        $response = Http::withToken($this->accessToken($integration))
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl($integration) . '/mpesa/stkpush/v1/processrequest', $payload);
        $response->throw();
        $data = $response->json();

        if (($data['ResponseCode'] ?? null) !== '0' || empty($data['CheckoutRequestID'])) {
            throw new RuntimeException($data['ResponseDescription'] ?? 'Safaricom could not start the STK Push.');
        }

        return $data;
    }


    public function registerC2BUrls(DarajaIntegration $integration, string $confirmationUrl, string $validationUrl): array
    {
        $response = Http::withToken($this->accessToken($integration))
            ->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl($integration) . '/mpesa/c2b/v1/registerurl', [
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

    public function baseUrl(DarajaIntegration $integration): string
    {
        return $integration->environment === 'production'
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
