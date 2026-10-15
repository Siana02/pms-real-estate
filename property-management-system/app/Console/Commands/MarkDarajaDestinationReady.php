<?php

namespace App\Console\Commands;

use App\Models\PaymentDestination;
use Illuminate\Console\Command;

class MarkDarajaDestinationReady extends Command
{
    protected $signature = 'daraja:mark-destination-ready
        {destination_id : Payment destination ID}
        {--confirmed : Confirm merchant authorization was independently verified with Safaricom}';

    protected $description = 'Mark a property Daraja destination ready after independent merchant authorization verification';

    public function handle(): int
    {
        if (!$this->option('confirmed')) {
            $this->error('Refusing to mark this destination ready without --confirmed.');
            $this->line('Only use this after independently verifying the merchant shortcode, shortcode type, passkey and Daraja app authorization.');
            return self::FAILURE;
        }

        $destination = PaymentDestination::find($this->argument('destination_id'));
        if (!$destination) {
            $this->error('Payment destination not found.');
            return self::FAILURE;
        }

        if (!filled(config('daraja.consumer_key')) || !filled(config('daraja.consumer_secret'))) {
            $this->error('MARSWebz platform Daraja consumer credentials are not configured in the server environment.');
            return self::FAILURE;
        }

        // Production merchant passkeys are shortcode-specific. Never silently
        // reuse one platform-wide passkey for unrelated merchant PayBills.
        if (config('daraja.environment', 'sandbox') === 'production' && !filled($destination->daraja_passkey)) {
            $passkey = trim((string) $this->secret('Enter this merchant PayBill STK passkey (input is hidden)'));
            if ($passkey === '') {
                $this->error('A destination-specific production passkey is required.');
                return self::FAILURE;
            }

            $destination->daraja_passkey = $passkey;
            $destination->save();
            $destination->refresh();
        }

        if (!$destination->is_active || !$destination->hasMerchantStkConfiguration() || !filled($destination->daraja_callback_token)) {
            $this->error('This destination is inactive or its merchant STK configuration is incomplete. Verify the PayBill, destination-specific passkey and callback token.');
            return self::FAILURE;
        }

        $destination->update([
            'daraja_authorization_status' => 'ready',
            'daraja_authorization_checked_at' => now(),
        ]);

        $this->info("Payment destination {$destination->id} is marked ready for the configured Daraja environment.");
        $this->warn('This records an operator verification; it does not itself grant Safaricom permissions.');
        return self::SUCCESS;
    }
}
