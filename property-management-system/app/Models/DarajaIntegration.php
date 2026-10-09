<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaIntegration extends Model
{
    protected $fillable = [
        'organization_id', 'environment', 'shortcode', 'shortcode_type',
        'consumer_key', 'consumer_secret', 'passkey', 'enabled', 'c2b_registered_at',
    ];

    protected $casts = [
        'consumer_key' => 'encrypted',
        'consumer_secret' => 'encrypted',
        'passkey' => 'encrypted',
        'enabled' => 'boolean',
        'c2b_registered_at' => 'datetime',
    ];

    protected $hidden = ['consumer_key', 'consumer_secret', 'passkey'];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
