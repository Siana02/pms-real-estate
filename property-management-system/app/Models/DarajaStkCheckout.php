<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaStkCheckout extends Model
{
    protected $fillable = [
        'organization_id', 'lease_id', 'payment_destination_id', 'checkout_request_id',
        'merchant_request_id', 'account_reference', 'phone', 'amount', 'status',
        'mpesa_receipt', 'callback_payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'callback_payload' => 'array',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function lease()
    {
        return $this->belongsTo(Leases::class, 'lease_id');
    }

    public function paymentDestination()
    {
        return $this->belongsTo(PaymentDestination::class);
    }
}
