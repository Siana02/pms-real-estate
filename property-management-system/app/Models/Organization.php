<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'username',
        'email',
        'phone',
        'address',
        'city',
        'country',
        'currency',
    ];

    /**
     * Users belonging to this organization.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Properties belonging to this organization.
     */
    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    /**
     * Tenants belonging to this organization.
     */
    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);       
    }

    /**
     * Leases belonging to this organization.
     */
    public function leases(): HasMany
    {
        return $this->hasMany(Lease::class);
    }

}