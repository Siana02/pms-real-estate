<?php

namespace App\Console\Commands;

use App\Models\RentObligation;
use App\Services\RentLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class GenerateRentObligations extends Command
{
    protected $signature = 'rent:generate {--months=1 : Number of future months to prepare}';

    protected $description = 'Generate monthly rent obligations for active leases.';

    public function handle(RentLedgerService $ledger): int
    {
        $months = max((int) $this->option('months'), 1);
        $start = CarbonImmutable::now()->startOfMonth();

        for ($offset = 0; $offset < $months; $offset++) {
            $period = $start->addMonths($offset);
            $countBefore = RentObligation::where('period', $period->toDateString())->count();
            $ledger->ensureForPeriod($period);
            $ledger->syncExistingPayments($period);
            $countAfter = RentObligation::where('period', $period->toDateString())->count();

            $this->line($period->format('F Y').': '.($countAfter - $countBefore).' new obligations.');
        }

        return self::SUCCESS;
    }
}
