<?php

namespace App\Console\Commands;

use App\Models\DarajaC2bEvent;
use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Models\PaymentTransaction;
use App\Services\PaymentReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class ReviewDarajaC2bEvents extends Command
{
    protected $signature = 'daraja:c2b-review
        {event_id? : C2B event ID to resolve; omit to list pending events}
        {--destination= : Verified payment destination ID}
        {--lease= : Lease ID to credit}
        {--confirmed : Confirm the M-PESA receipt and ownership were independently verified}';

    protected $description = 'Review unresolved global C2B payments; cross-organization cases require explicit verified resolution';

    public function handle(PaymentReconciliationService $reconciliation): int
    {
        $eventId = $this->argument('event_id');
        if (!$eventId) {
            $events = DarajaC2bEvent::where('status', 'needs_review')->orderBy('created_at')->get();
            if ($events->isEmpty()) {
                $this->info('No C2B events are awaiting review.');
                return self::SUCCESS;
            }

            $this->table(
                ['ID', 'Environment', 'Shortcode', 'Receipt', 'Amount (KES)', 'Reference', 'Organization', 'Reason', 'Candidate destinations'],
                $events->map(fn (DarajaC2bEvent $event) => [
                    $event->id, $event->environment, $event->shortcode, $event->receipt,
                    number_format((float) $event->amount, 2), $event->payment_reference ?: '(missing)',
                    $event->organization_id ?: '(cross-organization / unknown)',
                    $event->review_reason,
                    implode(',', $event->candidate_destination_ids ?? []),
                ])->all()
            );
            $this->line('Resolve only after verifying the M-PESA receipt and destination ownership independently.');
            return self::SUCCESS;
        }

        if (!$this->option('confirmed') || !$this->option('destination') || !$this->option('lease')) {
            $this->error('Resolution requires --destination=ID --lease=ID --confirmed after independent receipt verification.');
            return self::FAILURE;
        }

        $event = DarajaC2bEvent::find($eventId);
        if (!$event) {
            $this->error('C2B event not found.');
            return self::FAILURE;
        }
        if ($event->status === 'routed') {
            $this->error('This C2B event has already been routed.');
            return self::FAILURE;
        }

        $destination = PaymentDestination::find($this->option('destination'));
        $lease = Leases::find($this->option('lease'));

        if (!$destination || !$lease) {
            $this->error('Destination or lease not found.');
            return self::FAILURE;
        }

        if (!$destination->is_active
            || $destination->c2b_authorization_status !== 'ready'
            || $destination->darajaShortcode() !== $event->shortcode) {
            $this->error('Destination must be active, verified, and use the exact callback shortcode.');
            return self::FAILURE;
        }

        $candidateIds = $event->candidate_destination_ids ?? [];
        if ($candidateIds !== [] && !in_array((int) $destination->id, array_map('intval', $candidateIds), true)) {
            $this->error('Selected destination is not in the candidate set captured for this event.');
            return self::FAILURE;
        }

        if ((int) $lease->organization_id !== (int) $destination->organization_id
            || (int) $lease->property_id !== (int) $destination->property_id) {
            $this->error('Lease must belong to the selected destination property and organization.');
            return self::FAILURE;
        }

        $at = CarbonImmutable::parse($event->transaction_at);
        if (in_array($lease->status, ['ended', 'terminated'], true)
            || CarbonImmutable::parse($lease->start_date)->greaterThan($at)
            || ($lease->end_date && CarbonImmutable::parse($lease->end_date)->lessThan($at))) {
            $this->error('Lease was not active on the payment date.');
            return self::FAILURE;
        }

        $payload = [
            'source' => 'c2b_confirmation',
            'business_short_code' => $event->shortcode,
            'bill_reference' => $event->payment_reference,
            'c2b_event_id' => $event->id,
            'candidate_destination_ids' => $candidateIds,
            'manually_verified' => true,
        ];

        $existingReceipt = PaymentTransaction::where('provider', 'mpesa_daraja')
            ->where('external_transaction_id', $event->receipt)
            ->first();
        if ($existingReceipt && (int) $existingReceipt->organization_id !== (int) $destination->organization_id) {
            $this->error('This M-PESA receipt is already recorded under another organization; refusing cross-organization duplication.');
            return self::FAILURE;
        }

        $transaction = $event->payment_transaction_id
            ? PaymentTransaction::find($event->payment_transaction_id)
            : $existingReceipt;

        if (!$transaction) {
            $transaction = PaymentTransaction::firstOrCreate(
                [
                    'organization_id' => $destination->organization_id,
                    'provider' => 'mpesa_daraja',
                    'external_transaction_id' => $event->receipt,
                ],
                [
                    'payment_destination_id' => $destination->id,
                    'amount' => $event->amount,
                    'currency' => $event->currency,
                    'payer_phone' => $event->payer_phone,
                    'payment_reference' => $event->payment_reference,
                    'transaction_at' => $event->transaction_at,
                    'status' => 'needs_review',
                    'reconciliation_note' => 'Platform operator selected this destination and lease after independent receipt verification.',
                    'raw_payload' => $payload,
                ]
            );
        }

        if ((int) $transaction->organization_id !== (int) $destination->organization_id) {
            $this->error('Existing transaction belongs to another organization; refusing to move it.');
            return self::FAILURE;
        }

        $transaction->update([
            'payment_destination_id' => $destination->id,
            'raw_payload' => array_merge($transaction->raw_payload ?? [], $payload),
            'status' => in_array($transaction->status, ['reconciled', 'reconciled_with_credit'], true)
                ? $transaction->status
                : 'needs_review',
        ]);

        $resolved = $reconciliation->resolve($transaction->fresh(), $lease);

        $event->update([
            'organization_id' => $destination->organization_id,
            'payment_destination_id' => $destination->id,
            'payment_transaction_id' => $resolved->id,
            'status' => 'routed',
            'review_reason' => null,
        ]);

        $this->info("C2B event {$event->id} routed to destination {$destination->id}, lease {$lease->id}.");
        $this->warn('Confirm the rent ledger entry and audit record against the source M-PESA statement.');
        return self::SUCCESS;
    }
}
