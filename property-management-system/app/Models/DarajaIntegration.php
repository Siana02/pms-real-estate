<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DarajaIntegration extends Model
{
    protected $fillable = [
        'organization_id', 'business_short_code', 'environment', 'account_type',
        'consumer_key', 'consumer_secret', 'passkey', 'is_active', 'c2b_registered_at',
    ];

    protected $casts = [
        'consumer_key' => 'encrypted',
        'webhook_token' => 'encrypted',
        'consumer_secret' => 'encrypted',
        'passkey' => 'encrypted',
        'is_active' => 'boolean',
        'c2b_registered_at' => 'datetime',
    ];

    protected $hidden = ['consumer_key', 'consumer_secret', 'passkey', 'webhook_token'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
