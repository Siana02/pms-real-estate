<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaIntegration extends Model
{
    protected $fillable = [
        'organization_id', 'environment', 'shortcode', 'shortcode_type', 'callback_token',
        'consumer_key', 'consumer_secret', 'passkey', 'webhook_token', 'enabled',
    ];

    protected $casts = [
        'consumer_key' => 'encrypted',
        'consumer_secret' => 'encrypted',
        'passkey' => 'encrypted',
        'webhook_token' => 'encrypted',
        'enabled' => 'boolean',
    ];

    protected $hidden = ['consumer_key', 'consumer_secret', 'passkey', 'webhook_token'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
