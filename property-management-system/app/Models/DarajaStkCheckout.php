<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DarajaStkCheckout extends Model
{
    protected $fillable = [
        'organization_id', 'payment_destination_id', 'lease_id', 'merchant_request_id',
        'checkout_request_id', 'account_reference', 'tenant_payment_reference', 'phone_number',
        'amount', 'status', 'result_code', 'result_description', 'mpesa_receipt_number',
        'completed_at', 'callback_payload',
    ];

    protected $casts = [
        'amount' => 'integer',
        'completed_at' => 'datetime',
        'callback_payload' => 'array',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function lease(): BelongsTo { return $this->belongsTo(Leases::class, 'lease_id'); }
    public function paymentDestination(): BelongsTo { return $this->belongsTo(PaymentDestination::class); }
}
