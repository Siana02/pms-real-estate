<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id','payment_destination_id','provider','external_transaction_id','amount','currency',
        'payer_phone','payment_reference','transaction_at','status','matched_lease_id','matched_rent_obligation_id',
        'payment_id','reconciliation_note','raw_payload',
    ];

    protected $casts = ['amount' => 'decimal:2', 'transaction_at' => 'datetime', 'raw_payload' => 'array'];

    public function organization() { return $this->belongsTo(Organization::class); }
    public function paymentDestination() { return $this->belongsTo(PaymentDestination::class); }
    public function matchedLease() { return $this->belongsTo(Leases::class, 'matched_lease_id'); }
    public function matchedRentObligation() { return $this->belongsTo(RentObligation::class, 'matched_rent_obligation_id'); }
    public function payment() { return $this->belongsTo(Payment::class); }
}
