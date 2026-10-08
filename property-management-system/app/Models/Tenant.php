<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Leases as Lease;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'preferred_location',
        'organization_id',
        'property_id',
        'unit_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'profile_photo_path',
        'national_id',
        'residential_address',
        'postal_address',
        'nationality',
        'employer_name',
        'employer_phone',
        'next_of_kin_name',
        'next_of_kin_phone',
        'status',
        'notes',
    ];

    public function user()
    {
        return $this->hasOne(User::class);
    }

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