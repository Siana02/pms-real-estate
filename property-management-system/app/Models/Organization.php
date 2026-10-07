<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Leases as Lease;

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
        'logo_path',
    ];

    /**
     * Users belonging to this organization.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Public URL for the organization's logo.
     */
    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }

        return url('/api/organizations/' . $this->id . '/logo');
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

    public function deposits(): HasMany
    {
        return $this->hasMany(Deposit::class);
    }

}