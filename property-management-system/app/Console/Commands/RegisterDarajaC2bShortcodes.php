<?php

namespace App\Console\Commands;

use App\Models\DarajaC2bRegistration;
use App\Models\PaymentDestination;
use App\Services\DarajaService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Throwable;

class RegisterDarajaC2bShortcodes extends Command
{
    protected $signature = 'daraja:register-c2b
        {--shortcode= : Register one shortcode only}
        {--force : Re-register callbacks even if already registered}';

    protected $description = 'Register shared C2B callbacks once per shortcode using MARSWebz platform credentials';

    public function handle(DarajaService $daraja): int
    {
        if (!config('daraja.platform_enabled') || !filled(config('daraja.consumer_key')) || !filled(config('daraja.consumer_secret'))) {
            $this->error('The MARSWebz platform Daraja credentials are not configured.');
            return self::FAILURE;
        }

        $base = rtrim((string) config('app.url'), '/');
        if (!str_starts_with($base, 'https://')) {
            $this->error('C2B registration requires a public HTTPS APP_URL.');
            return self::FAILURE;
        }

        $destinations = PaymentDestination::query()
            ->where('is_active', true)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])
            ->where('c2b_authorization_status', 'ready')
            ->get()
            ->filter(fn (PaymentDestination $destination) => filled($destination->darajaShortcode()));

        $shortcodes = $destinations->map(fn (PaymentDestination $destination) => $destination->darajaShortcode())->filter()->unique()->values();
        if ($this->option('shortcode')) {
            $shortcodes = $shortcodes->filter(fn ($value) => $value === (string) $this->option('shortcode'))->values();
        }

        if ($shortcodes->isEmpty()) {
            $this->warn('No active, verified merchant shortcodes are eligible for C2B registration.');
            return self::SUCCESS;
        }

        $failed = 0;
        foreach ($shortcodes as $shortcode) {
            $registration = DarajaC2bRegistration::firstOrNew([
                'environment' => config('daraja.environment', 'sandbox'),
                'shortcode' => $shortcode,
            ]);

            if ($registration->exists && $registration->status === 'registered' && !$this->option('force')) {
                $this->line("Skipping {$shortcode}: already registered in {$registration->environment}.");
                continue;
            }

            $token = $registration->callback_token ?: Str::random(48);
            $registration->callback_token = $token;
            $registration->callback_token_hash = hash('sha256', $token);
            $registration->status = 'pending';
            $registration->last_error = null;
            $registration->save();

            $tokenPath = rawurlencode($token);
            $confirmationUrl = $base . '/api/webhooks/daraja/' . $tokenPath . '/confirm';
            $validationUrl = $base . '/api/webhooks/daraja/' . $tokenPath . '/validate';

            try {
                $result = $daraja->registerC2BUrls((string) $shortcode, $confirmationUrl, $validationUrl);
                $registration->update([
                    'status' => 'registered',
                    'registered_at' => now(),
                    'last_error' => null,
                ]);

                PaymentDestination::query()
                    ->where('is_active', true)
                    ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])
                    ->get()
                    ->filter(fn (PaymentDestination $destination) => $destination->darajaShortcode() === (string) $shortcode)
                    ->each(fn (PaymentDestination $destination) => $destination->update([
                        'c2b_registration_status' => 'registered',
                        'c2b_registered_at' => now(),
                    ]));

                $this->info("Registered C2B callbacks for shortcode {$shortcode}.");
                $this->line((string) ($result['ResponseDescription'] ?? 'Safaricom accepted the registration.'));
                $this->line('The shared callback endpoint is registered once for this shortcode and environment.');
            } catch (Throwable $exception) {
                $failed++;
                $registration->update([
                    'status' => 'action_required',
                    'last_error' => mb_substr($exception::class . ': ' . $exception->getMessage(), 0, 2000),
                ]);
                $this->error("Registration failed for shortcode {$shortcode}; check app permissions, environment and merchant authorization.");
            }
        }

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
