<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Leases as Lease;

class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'property_type',
        'description',
        'address',
        'city',
        'country',
        'monthly_rent',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
    public function units()
  {
    return $this->hasMany(Unit::class);
  }

   public function leases()
  {
    return $this->hasMany(Lease::class);  
  }

}  