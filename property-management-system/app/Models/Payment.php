<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'lease_id',
        'amount',
        'payment_date',
        'payment_method',
        'reference',
        'payment_type',
        'notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function lease()
    {
        return $this->belongsTo(Leases::class, 'lease_id');
    }
}