<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Leases as Lease;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'unit_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'national_id',
        'employer_name',
        'employer_phone',
        'next_of_kin_name',
        'next_of_kin_phone',
        'status',
        'notes',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function leases()
    {
        return $this->hasMany(Lease::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function deposits()
    {
        return $this->hasMany(Deposit::class);
    }

}