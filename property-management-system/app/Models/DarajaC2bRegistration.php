<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaC2bRegistration extends Model
{
    protected $fillable = [
        'environment', 'shortcode', 'callback_token_hash', 'callback_token',
        'status', 'registered_at', 'last_error',
    ];

    protected $hidden = ['callback_token', 'callback_token_hash'];

    protected $casts = [
        'callback_token' => 'encrypted',
        'registered_at' => 'datetime',
    ];

    public function events()
    {
        return $this->hasMany(DarajaC2bEvent::class, 'shortcode', 'shortcode')
            ->where('environment', $this->environment);
    }
}
