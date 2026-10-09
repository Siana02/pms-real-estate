<?php

namespace App\Console\Commands;

use App\Models\DarajaStkCheckout;
use App\Services\DarajaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class QueryDarajaStkCheckout extends Command
{
    protected $signature = 'daraja:query-stk
        {checkout_id : Existing Daraja STK checkout record ID}';

    protected $description = 'Query Safaricom for the latest status of a pending M-PESA STK checkout';

    public function handle(DarajaService $daraja): int
    {
        $checkout = DarajaStkCheckout::with('paymentDestination')
            ->find($this->argument('checkout_id'));

        if (!$checkout) {
            $this->error('STK checkout not found.');

            return self::FAILURE;
        }

        if (!in_array($checkout->status, ['pending', 'requesting'], true)) {
            $this->warn("Checkout {$checkout->id} is {$checkout->status}; only pending/requesting checkouts can be queried.");

            return self::FAILURE;
        }

        if (!filled($checkout->checkout_request_id)) {
            $this->error('This checkout has no Safaricom CheckoutRequestID yet.');

            return self::FAILURE;
        }

        $destination = $checkout->paymentDestination;
        if (!$destination) {
            $this->error('The checkout has no linked payment destination.');

            return self::FAILURE;
        }

        try {
            $result = $daraja->queryStk($destination, (string) $checkout->checkout_request_id);
        } catch (Throwable $exception) {
            // The exception message from DarajaService contains only the upstream
            // status/reason, not request credentials or the STK password.
            $safeMessage = mb_substr($exception->getMessage(), 0, 500);
            Log::warning('Daraja STK status query failed.', [
                'checkout_id' => $checkout->id,
                'exception' => $exception::class,
                'reason' => $safeMessage,
            ]);
            $this->error('STK status query failed: ' . $safeMessage);
            $this->line('Checkout was left unchanged.');

            return self::FAILURE;
        }

        if (!array_key_exists('ResultCode', $result)) {
            $this->warn('Safaricom accepted the query but did not return a definitive transaction result. The checkout remains pending.');

            return self::FAILURE;
        }

        $resultCode = (string) $result['ResultCode'];
        $resultDescription = mb_substr(
            (string) ($result['ResultDesc'] ?? 'Safaricom returned an STK status result.'),
            0,
            1000
        );

        // A callback may finish the checkout while the query is in flight. Lock and
        // re-check its state so this fallback can never downgrade a completed payment.
        $outcome = DB::transaction(function () use ($checkout, $resultCode, $resultDescription): string {
            $locked = DarajaStkCheckout::query()->lockForUpdate()->findOrFail($checkout->id);

            if (!in_array($locked->status, ['pending', 'requesting'], true)) {
                return 'already_resolved';
            }

            if ($resultCode !== '0') {
                $locked->update([
                    'status' => 'failed',
                    'result_code' => $resultCode,
                    'result_description' => $resultDescription,
                ]);

                return 'failed';
            }

            // STK Query generally confirms status without the receipt and amount metadata
            // required to safely create a ledger transaction. Never infer payment from status alone.
            $locked->update([
                'status' => 'needs_review',
                'result_code' => '0',
                'result_description' => 'Safaricom reports a successful STK result, but the query did not supply payment receipt metadata. Await the callback or verify the receipt before reconciliation.',
            ]);

            return 'needs_review';
        }, 3);

        if ($outcome === 'already_resolved') {
            $this->info('The checkout was updated by another process while the query was running; its existing status was preserved.');

            return self::SUCCESS;
        }

        if ($outcome === 'failed') {
            $this->warn("Safaricom reports this STK request did not complete (ResultCode {$resultCode}).");
            $this->line($resultDescription);

            return self::SUCCESS;
        }

        $this->warn('Safaricom reports success, but the query did not provide the receipt/amount metadata needed to reconcile safely.');
        $this->line('Checkout moved to needs_review. No paid payment or rent-ledger entry was created.');

        return self::SUCCESS;
    }
}
