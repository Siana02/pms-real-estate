<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FlutterwaveIntegration extends Model
{
    protected $fillable = [
        'organization_id',
        'secret_key',
        'webhook_secret',
        'environment',
        'merchant_name',
        'currency',
        'connected_at',
    ];

    protected $casts = [
        'secret_key' => 'encrypted',
        'webhook_secret' => 'encrypted',
        'connected_at' => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}