<?php

namespace App\Services;

use App\Models\Leases;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\RentObligation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

class PaymentReconciliationService
{
    public function ingest(array $data): PaymentTransaction
    {
        $transaction = PaymentTransaction::firstOrCreate(
            ['organization_id' => $data['organization_id'], 'provider' => $data['provider'], 'external_transaction_id' => $data['external_transaction_id']],
            [
                'organization_id' => $data['organization_id'],
                'payment_destination_id' => $data['payment_destination_id'] ?? null,
                'amount' => $data['amount'], 'currency' => $data['currency'] ?? 'KES',
                'payer_phone' => $this->normalizePhone($data['payer_phone'] ?? null),
                'payment_reference' => $this->normalizeReference($data['payment_reference'] ?? null),
                'transaction_at' => $data['transaction_at'], 'status' => 'pending',
                'raw_payload' => $data['raw_payload'] ?? null,
            ]
        );

        if ($transaction->wasRecentlyCreated || $transaction->status === 'pending') {
            $this->reconcile($transaction);
        }

        return $transaction->fresh(['paymentDestination.property','matchedLease.tenant','matchedLease.property','matchedLease.unit','matchedRentObligation','payment']);
    }

    public function reconcile(PaymentTransaction $transaction): PaymentTransaction
    {
        if ($transaction->status === 'reconciled') return $transaction;

        $at = CarbonImmutable::parse($transaction->transaction_at);
        app(RentLedgerService::class)->ensureForPeriod($at);
        $reference = $this->normalizeReference($transaction->payment_reference);
        $phone = $this->normalizePhone($transaction->payer_phone);

        $query = Leases::query()
            ->where('organization_id', $transaction->organization_id)
            ->whereNotIn('status', ['ended','terminated'])
            ->whereDate('start_date','<=',$at->toDateString())
            ->where(fn ($q) => $q->whereNull('end_date')->orWhereDate('end_date','>=',$at->toDateString()));

        if ($transaction->payment_destination_id) {
            $destination = $transaction->paymentDestination()->first();
            if ($destination?->property_id) $query->where('property_id', $destination->property_id);
        }

        $candidates = $reference
            ? $query->with('tenant')->whereRaw('UPPER(tenant_payment_reference) = ?', [$reference])->get()
            : collect();

        if ($candidates->isEmpty() && $phone) {
            $candidates = $query->with('tenant')->whereHas('tenant', function ($q) use ($phone) {
                $q->where(function ($phoneQuery) use ($phone) {
                    $local = Str::startsWith($phone, '254') ? '0' . substr($phone, 3) : $phone;
                    $phoneQuery
                        ->whereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', '') = ?", [$phone])
                        ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '+', ''), '-', ''), '(', '') = ?", [$local]);
                });
            })->get();
        }

        if ($candidates->count() !== 1) {
            $transaction->update([
                'status' => $candidates->isEmpty() ? 'unmatched' : 'needs_review',
                'reconciliation_note' => $candidates->isEmpty() ? 'No active lease matched the payment reference or payer phone.' : 'More than one active lease matched; manager review is required.',
            ]);
            return $transaction;
        }

        $lease = $candidates->first();
        $obligation = RentObligation::where('lease_id',$lease->id)->where('period',$at->startOfMonth()->toDateString())->first();
        if (!$obligation) {
            $transaction->update(['status'=>'needs_review','matched_lease_id'=>$lease->id,'reconciliation_note'=>'Tenant matched, but no rent obligation exists for the transaction month.']);
            return $transaction;
        }

        $amount=(float)$transaction->amount; $balance=(float)$obligation->balance;
        if ($amount <= 0 || $amount > $balance) {
            $transaction->update(['status'=>'needs_review','matched_lease_id'=>$lease->id,'matched_rent_obligation_id'=>$obligation->id,'reconciliation_note'=>$amount>$balance ? 'Payment exceeds the current rent obligation balance and was not auto-applied.' : 'Payment amount must be greater than zero.']);
            return $transaction;
        }

        $payment=Payment::firstOrCreate(
            ['provider'=>$transaction->provider,'provider_transaction_id'=>$transaction->external_transaction_id,'organization_id'=>$transaction->organization_id],
            [
                'organization_id'=>$transaction->organization_id,'lease_id'=>$lease->id,'rent_obligation_id'=>$obligation->id,
                'payment_destination_id'=>$transaction->payment_destination_id,'amount'=>$amount,'payment_date'=>$at->toDateString(),
                'payment_method'=>$this->paymentMethod($transaction->provider),'status'=>'paid','tx_ref'=>$transaction->payment_reference,
                'reference'=>$transaction->payment_reference,'payment_type'=>'rent','notes'=>'Automatically reconciled from external payment transaction.',
            ]
        );

        $transaction->update(['status'=>'reconciled','matched_lease_id'=>$lease->id,'matched_rent_obligation_id'=>$obligation->id,'payment_id'=>$payment->id,'reconciliation_note'=>'Automatically matched to the tenant lease and rent obligation.']);
        return $transaction->fresh();
    }

    public function resolve(PaymentTransaction $transaction, Leases $lease): PaymentTransaction
    {
        abort_unless($transaction->organization_id === $lease->organization_id,403,'The payment and lease must belong to the same organization.');
        $at=CarbonImmutable::parse($transaction->transaction_at); app(RentLedgerService::class)->ensureForPeriod($at);
        $obligation=RentObligation::where('lease_id',$lease->id)->where('period',$at->startOfMonth()->toDateString())->firstOrFail();
        $amount=(float)$transaction->amount; abort_if($amount<=0,422,'Payment amount must be greater than zero.'); abort_if($amount>(float)$obligation->balance,422,'Payment exceeds the current rent obligation balance.');
        $payment=Payment::firstOrCreate(
            ['provider'=>$transaction->provider,'provider_transaction_id'=>$transaction->external_transaction_id],
            ['organization_id'=>$transaction->organization_id,'lease_id'=>$lease->id,'rent_obligation_id'=>$obligation->id,'payment_destination_id'=>$transaction->payment_destination_id,'amount'=>$amount,'payment_date'=>$at->toDateString(),'payment_method'=>$this->paymentMethod($transaction->provider),'status'=>'paid','tx_ref'=>$transaction->payment_reference,'reference'=>$transaction->payment_reference,'payment_type'=>'rent','notes'=>'Manually resolved external payment transaction.']
        );
        $transaction->update(['status'=>'reconciled','matched_lease_id'=>$lease->id,'matched_rent_obligation_id'=>$obligation->id,'payment_id'=>$payment->id,'reconciliation_note'=>'Manually matched by property management.']);
        return $transaction->fresh(['matchedLease.tenant','matchedLease.property','matchedLease.unit','matchedRentObligation','payment']);
    }

    private function paymentMethod(string $provider): string { return match (Str::lower($provider)) { 'mpesa','safaricom' => 'mpesa', 'flutterwave' => 'card', 'bank' => 'bank_transfer', default => 'other' }; }
    private function normalizeReference(?string $value): ?string { $value=trim((string)$value); return $value===''?null:Str::upper($value); }
    private function normalizePhone(?string $value): ?string { $digits=preg_replace('/\D/','',(string)$value); if($digits==='') return null; if((Str::startsWith($digits,'07')||Str::startsWith($digits,'01'))&&strlen($digits)===10) return '254'.substr($digits,1); return Str::startsWith($digits,'254')?$digits:$digits; }
}
