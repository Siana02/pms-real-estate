<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentPaymentCredit extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'tenant_id',
        'lease_id',
        'source_payment_id',
        'amount',
        'remaining_amount',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lease()
    {
        return $this->belongsTo(Leases::class, 'lease_id');
    }

    public function sourcePayment()
    {
        return $this->belongsTo(Payment::class, 'source_payment_id');
    }
}
