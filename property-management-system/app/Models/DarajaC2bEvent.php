<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaC2bEvent extends Model
{
    protected $fillable = [
        'environment', 'shortcode', 'receipt', 'amount', 'currency', 'payer_phone',
        'payment_reference', 'transaction_at', 'organization_id', 'payment_destination_id',
        'payment_transaction_id', 'candidate_destination_ids', 'status', 'review_reason', 'raw_payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_at' => 'datetime',
        'candidate_destination_ids' => 'array',
        'raw_payload' => 'array',
    ];

    protected $hidden = ['raw_payload'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function paymentDestination()
    {
        return $this->belongsTo(PaymentDestination::class);
    }

    public function paymentTransaction()
    {
        return $this->belongsTo(PaymentTransaction::class);
    }
}
