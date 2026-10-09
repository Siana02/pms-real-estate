<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestTenantPaymentLink extends Model
{
    protected $fillable = [
        'organization_id', 'property_id', 'unit_id', 'lease_id',
        'token_hash', 'token', 'email_sent_to', 'last_emailed_at',
        'revoked_at', 'created_by',
    ];

    protected $hidden = ['token', 'token_hash'];

    protected $casts = [
        'token' => 'encrypted',
        'last_emailed_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function organization() { return $this->belongsTo(Organization::class); }
    public function property() { return $this->belongsTo(Property::class); }
    public function unit() { return $this->belongsTo(Unit::class); }
    public function lease() { return $this->belongsTo(Leases::class, 'lease_id'); }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }
}
