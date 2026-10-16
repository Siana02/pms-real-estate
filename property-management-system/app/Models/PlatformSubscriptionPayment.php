<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformSubscriptionPayment extends Model
{
    protected $hidden = ['callback_payload', 'checkout_request_id', 'merchant_request_id'];

    protected $fillable = [
        'platform_subscription_id', 'organization_id', 'amount', 'method',
        'reference', 'status', 'paid_at', 'verified_by', 'notes',
        'checkout_request_id', 'merchant_request_id', 'mpesa_receipt', 'phone',
        'callback_payload', 'result_description',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'callback_payload' => 'array',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(PlatformSubscription::class, 'platform_subscription_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
