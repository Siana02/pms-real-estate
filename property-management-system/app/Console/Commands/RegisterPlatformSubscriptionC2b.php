<?php

namespace App\Console\Commands;

use App\Services\PlatformSubscriptionDarajaService;
use Illuminate\Console\Command;
use Throwable;

class RegisterPlatformSubscriptionC2b extends Command
{
    protected $signature = 'daraja:register-platform-subscription-c2b';
    protected $description = 'Register Safaricom C2B callbacks for the MARSWebz platform subscription Till.';

    public function handle(PlatformSubscriptionDarajaService $daraja): int
    {
        try {
            $result = $daraja->registerC2bUrls();
            $this->info('Safaricom accepted platform subscription C2B callback registration.');
            $this->line('OriginatorConversationID: ' . (string) ($result['OriginatorConversationID'] ?? 'not supplied'));
            $this->line('ResponseDescription: ' . (string) ($result['ResponseDescription'] ?? 'accepted'));
            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('C2B callback registration failed: ' . $exception->getMessage());
            $this->line('Some Till accounts need Safaricom to enable C2B callback registration. Confirm eligibility with Safaricom if this Till is rejected.');
            return self::FAILURE;
        }
    }
}
