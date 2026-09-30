<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Deposit extends Model
{
    protected $fillable = [
        'organization_id',
        'lease_id',
        'tenant_id',
        'amount_required',
        'amount_paid',
        'payment_date',
        'status',
        'tenant_marked_paid_at',
        'refundable_amount',
        'deductions',
        'deduction_reason',
        'refund_amount',
        'refund_date',
    ];

    protected $casts = [
        'amount_required' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'payment_date' => 'date',
        'tenant_marked_paid_at' => 'datetime',
        'refundable_amount' => 'decimal:2',
        'deductions' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'refund_date' => 'date',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function lease()
    {
        return $this->belongsTo(Leases::class, 'lease_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
