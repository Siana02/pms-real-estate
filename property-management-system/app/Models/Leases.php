<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Leases extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'unit_id',
        'tenant_id',
        'start_date',
        'end_date',
        'monthly_rent',
        'deposit_amount',
        'status',
        'notes',
        'notice_date',
        'intended_move_out_date',
        'notice_period_months',
        'notice_timely',
        'termination_reason',
        'actual_move_out_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'monthly_rent' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'notice_date' => 'date',
        'intended_move_out_date' => 'date',
        'notice_period_months' => 'integer',
        'notice_timely' => 'boolean',
        'actual_move_out_date' => 'date',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'lease_id');
    }

    public function deposit()
    {
        return $this->hasOne(Deposit::class, 'lease_id');
    }
}
