<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentObligation extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'unit_id',
        'tenant_id',
        'lease_id',
        'period',
        'due_date',
        'amount_due',
    ];

    protected $casts = [
        'period' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
    ];

    protected $appends = ['amount_paid', 'balance', 'status', 'days_overdue'];

    public function lease()
    {
        return $this->belongsTo(Leases::class, 'lease_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'rent_obligation_id');
    }

    public function getAmountPaidAttribute(): float
    {
        $allocated = (float) $this->payments()
            ->where('status', 'paid')
            ->whereHas('allocations', fn ($query) => $query->where('rent_obligation_id', $this->id))
            ->with('allocations')
            ->get()
            ->sum(fn (Payment $payment) => (float) $payment->allocations
                ->where('rent_obligation_id', $this->id)
                ->sum(fn (PaymentAllocation $allocation) => (float) $allocation->amount));

        $legacy = (float) $this->payments()
            ->where('status', 'paid')
            ->whereDoesntHave('allocations')
            ->sum('amount');

        return $allocated + $legacy;
    }

    public function getBalanceAttribute(): float
    {
        return max((float) $this->amount_due - $this->amount_paid, 0);
    }

    public function getStatusAttribute(): string
    {
        $paid = $this->amount_paid;
        $due = (float) $this->amount_due;

        if ($paid >= $due && $due > 0) {
            return 'paid';
        }

        if ($paid > 0) {
            return 'partial';
        }

        $today = CarbonImmutable::today();
        $dueDate = CarbonImmutable::parse($this->due_date);
        $grace = (int) ($this->lease?->rent_grace_period_days ?? 0);
        $overdueFrom = $dueDate->addDays($grace);

        return $today->greaterThan($overdueFrom) ? 'overdue' : ($today->equalTo($dueDate) || $today->greaterThan($dueDate) ? 'due' : 'upcoming');
    }

    public function getDaysOverdueAttribute(): int
    {
        if (!in_array($this->status, ['overdue', 'partial'], true)) {
            return 0;
        }

        $today = CarbonImmutable::today();
        $dueDate = CarbonImmutable::parse($this->due_date);
        return max($dueDate->diffInDays($today, false), 0);
    }
}
