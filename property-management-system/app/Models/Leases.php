<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\CarbonImmutable;

class Leases extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'unit_id',
        'tenant_id',
        'start_date',
        'requested_move_in_date',
        'requested_move_out_date',
        'end_date',
        'monthly_rent',
        'deposit_amount',
        'status',
        'notes',
        'manager_terms',
        'tenant_terms',
        'manager_signature',
        'manager_signed_at',
        'tenant_signature',
        'tenant_signed_at',
        'notice_date',
        'intended_move_out_date',
        'notice_period_months',
        'notice_timely',
        'notice_charge_amount',
        'termination_reason',
        'actual_move_out_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'requested_move_in_date' => 'date',
        'requested_move_out_date' => 'date',
        'end_date' => 'date',
        'monthly_rent' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'manager_signed_at' => 'datetime',
        'tenant_signed_at' => 'datetime',
        'notice_date' => 'date',
        'intended_move_out_date' => 'date',
        'notice_period_months' => 'integer',
        'notice_timely' => 'boolean',
        'notice_charge_amount' => 'decimal:2',
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

    public function getStatusAttribute($value): string
    {
        if (in_array($value, ['ended', 'terminated'], true)) {
            return $value;
        }

        $today = CarbonImmutable::today()->toDateString();
        $startDate = $this->attributes['start_date'] ?? null;
        $endDate = $this->attributes['end_date'] ?? null;

        if ($value === 'pending') {
            return 'pending';
        }

        if ($endDate && CarbonImmutable::parse($endDate)->toDateString() < $today) {
            return 'ended';
        }

        if ($value === 'notice') {
            return 'notice';
        }

        if ($startDate === null) {
            return 'pending';
        }

        return $startDate > $today ? 'upcoming' : 'active';
    }

    protected $appends = ['agreement_finalized'];

    public function getAgreementFinalizedAttribute(): bool
    {
        return $this->manager_signed_at !== null && $this->tenant_signed_at !== null;
    }
}
