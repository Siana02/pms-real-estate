<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Leases as Lease;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'unit_number',
        'unit_type',
        'monthly_rent',
        'deposit_amount',
        'status',
        'description',
    ];

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function leases()
    {
        return $this->hasMany(Lease::class);
    }

    /**
     * Payments are recorded against leases, not directly against units.
     */
    public function payments()
    {
        return $this->hasManyThrough(
            Payment::class,
            Lease::class,
            'unit_id',
            'lease_id',
            'id',
            'id'
        );
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }
}
