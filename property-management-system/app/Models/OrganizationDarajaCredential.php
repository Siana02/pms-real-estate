<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationDarajaCredential extends Model
{
    protected $fillable = ['organization_id', 'consumer_key', 'consumer_secret', 'enabled'];

    protected $hidden = ['consumer_key', 'consumer_secret'];

    protected $casts = [
        'consumer_key' => 'encrypted',
        'consumer_secret' => 'encrypted',
        'enabled' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function isConfigured(): bool
    {
        return $this->enabled && filled($this->consumer_key) && filled($this->consumer_secret);
    }
}
