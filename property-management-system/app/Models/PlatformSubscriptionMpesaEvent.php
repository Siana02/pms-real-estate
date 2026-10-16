<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformSubscriptionMpesaEvent extends Model
{
    protected $fillable = [
        'transaction_id', 'shortcode', 'amount', 'bill_reference', 'phone',
        'transaction_at', 'platform_subscription_payment_id', 'status',
        'raw_payload', 'matched_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_at' => 'datetime',
            'raw_payload' => 'array',
            'matched_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(PlatformSubscriptionPayment::class, 'platform_subscription_payment_id');
    }
}
