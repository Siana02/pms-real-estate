<?php

namespace App\Services;

use App\Models\PlatformSubscriptionPayment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class PlatformSubscriptionDarajaService
{
    public function ready(): bool
    {
        return config('daraja.environment') === 'production'
            && filled(config('services.platform_billing.till_number'))
            && filled(config('daraja.consumer_key'))
            && filled(config('daraja.consumer_secret'))
            && filled(config('services.platform_billing.passkey'))
            && filled(config('services.platform_billing.callback_token'))
            && str_starts_with((string) config('app.url'), 'https://')
            && filter_var(config('app.url'), FILTER_VALIDATE_URL);
    }

    public function initiate(PlatformSubscriptionPayment $payment, string $phone): array
    {
        if (! $this->ready()) {
            throw new RuntimeException('Platform STK Push is not ready. Production Daraja credentials, the Till passkey, callback token and public HTTPS APP_URL must be configured.');
        }

        $shortcode = (string) config('services.platform_billing.till_number');
        $passkey = (string) config('services.platform_billing.passkey');
        $phone = $this->normalizePhone($phone);
        $timestamp = now()->format('YmdHis');
        $token = $this->accessToken();

        $payload = [
            'BusinessShortCode' => $shortcode,
            'Password' => base64_encode($shortcode . $passkey . $timestamp),
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerBuyGoodsOnline',
            'Amount' => (int) ceil((float) $payment->amount),
            'PartyA' => $phone,
            'PartyB' => $shortcode,
            'PhoneNumber' => $phone,
            'CallBackURL' => rtrim((string) config('app.url'), '/') . '/api/webhooks/daraja/platform-subscriptions/' . rawurlencode((string) config('services.platform_billing.callback_token')) . '/stk',
            'AccountReference' => Str::limit('SUB' . $payment->id, 12, ''),
            'TransactionDesc' => 'MARSWebz platform subscription',
        ];

        $response = Http::withToken($token)->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/stkpush/v1/processrequest', $payload);
        $response->throw();
        $data = $response->json();

        if ((string) ($data['ResponseCode'] ?? '') !== '0' || empty($data['CheckoutRequestID'])) {
            throw new RuntimeException((string) ($data['ResponseDescription'] ?? 'Safaricom could not start the subscription STK Push.'));
        }

        return $data;
    }

    public function registerC2bUrls(): array
    {
        if (config('daraja.environment') !== 'production') {
            throw new RuntimeException('Platform Till C2B callback registration requires production Daraja configuration.');
        }
        $shortcode = (string) config('services.platform_billing.till_number');
        $token = (string) config('services.platform_billing.callback_token');
        $base = rtrim((string) config('app.url'), '/');
        if ($shortcode === '' || $token === '' || !str_starts_with($base, 'https://')) {
            throw new RuntimeException('Configure the platform Till, callback token and public HTTPS APP_URL before registering C2B callbacks.');
        }
        $callbackBase = $base . '/api/webhooks/daraja/platform-subscriptions/' . rawurlencode($token);
        $response = Http::withToken($this->accessToken())->acceptJson()->asJson()->timeout(20)
            ->post($this->baseUrl() . '/mpesa/c2b/v1/registerurl', [
                'ShortCode' => $shortcode,
                'ResponseType' => 'Completed',
                'ConfirmationURL' => $callbackBase . '/c2b',
                'ValidationURL' => $callbackBase . '/c2b-validation',
            ]);
        $response->throw();
        $data = $response->json();
        if ((string) ($data['ResponseCode'] ?? '') !== '0') {
            throw new RuntimeException((string) ($data['ResponseDescription'] ?? 'Safaricom rejected platform Till C2B callback registration.'));
        }
        return $data;
    }

    public function accessToken(): string
    {
        $key = trim((string) config('daraja.consumer_key'));
        $secret = trim((string) config('daraja.consumer_secret'));
        if ($key === '' || $secret === '') {
            throw new RuntimeException('MARSWebz Daraja consumer credentials are missing.');
        }

        $cacheKey = 'daraja:platform-subscriptions:' . hash('sha256', $key . "\0" . $secret);
        return Cache::remember($cacheKey, now()->addMinutes(50), function () use ($key, $secret) {
            $response = Http::withBasicAuth($key, $secret)->acceptJson()->timeout(15)
                ->get($this->baseUrl() . '/oauth/v1/generate', ['grant_type' => 'client_credentials']);
            $response->throw();
            $token = $response->json('access_token');
            if (! is_string($token) || $token === '') {
                throw new RuntimeException('Daraja did not return an access token.');
            }
            return $token;
        });
    }

    private function baseUrl(): string
    {
        return 'https://api.safaricom.co.ke';
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (preg_match('/^0[17]\d{8}$/', $digits)) {
            $digits = '254' . substr($digits, 1);
        } elseif (preg_match('/^[17]\d{8}$/', $digits)) {
            $digits = '254' . $digits;
        }
        if (! preg_match('/^254[17]\d{8}$/', $digits)) {
            throw new RuntimeException('Enter a valid Kenyan M-PESA phone number.');
        }
        return $digits;
    }
}
