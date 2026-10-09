<?php

namespace App\Console\Commands;

use App\Models\PaymentDestination;
use Illuminate\Console\Command;

class MarkDarajaC2bDestinationReady extends Command
{
    protected $signature = 'daraja:mark-c2b-destination-ready
        {destination_id : Payment destination ID}
        {--confirmed : Confirm C2B merchant authorization was independently verified with Safaricom}';

    protected $description = 'Mark a property destination authorized for C2B after independent merchant verification';

    public function handle(): int
    {
        if (!$this->option('confirmed')) {
            $this->error('Refusing to mark C2B authorization ready without --confirmed.');
            return self::FAILURE;
        }

        $destination = PaymentDestination::find($this->argument('destination_id'));
        if (!$destination) {
            $this->error('Payment destination not found.');
            return self::FAILURE;
        }

        if (!$destination->is_active
            || !in_array($destination->method, ['mpesa_paybill', 'mpesa_till'], true)
            || !filled($destination->darajaShortcode())) {
            $this->error('Destination must be active and contain a valid PayBill or Till shortcode.');
            return self::FAILURE;
        }

        $destination->update([
            'c2b_authorization_status' => 'ready',
            'c2b_authorization_checked_at' => now(),
        ]);

        $this->info("C2B merchant authorization recorded for destination {$destination->id}.");
        $this->line("Next run: php artisan daraja:register-c2b --shortcode={$destination->darajaShortcode()}");
        $this->warn('This command records an external verification; it does not grant Safaricom permissions by itself.');
        return self::SUCCESS;
    }
}
