<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlatformSubscription extends Model
{
    protected $fillable = [
        'organization_id', 'plan_code', 'status', 'billing_cycle',
        'billable_units', 'monthly_amount', 'pricing_overrides', 'unit_mix',
        'current_period_starts_at', 'current_period_ends_at',
        'last_payment_at', 'selected_by',
    ];

    protected function casts(): array
    {
        return [
            'pricing_overrides' => 'array',
            'unit_mix' => 'array',
            'monthly_amount' => 'decimal:2',
            'current_period_starts_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'last_payment_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PlatformSubscriptionPayment::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->current_period_ends_at !== null
            && $this->current_period_ends_at->isFuture();
    }
}
