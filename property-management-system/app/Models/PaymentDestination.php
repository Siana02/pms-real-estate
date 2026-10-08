<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentDestination extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'method',
        'label',
        'details',
        'is_active',
    ];

    protected $casts = [
        'details' => 'array',
        'is_active' => 'boolean',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}