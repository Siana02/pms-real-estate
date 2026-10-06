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

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }
}
