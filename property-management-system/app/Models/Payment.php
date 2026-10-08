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
        'rent_obligation_id',
        'payment_destination_id',
        'amount',
        'payment_date',
        'payment_method',
        'status',
        'provider',
        'provider_transaction_id',
        'tx_ref',
        'receipt_url',
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

    public function rentObligation()
    {
        return $this->belongsTo(RentObligation::class, 'rent_obligation_id');
    }

    public function allocations()
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function paymentDestination()
    {
        return $this->belongsTo(PaymentDestination::class, 'payment_destination_id');
    }
}