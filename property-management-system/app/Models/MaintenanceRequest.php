<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'unit_id',
        'tenant_id',
        'title',
        'description',
        'priority',
        'status',
        'assigned_to',
        'scheduled_date',
        'scheduled_time',
        'tenant_availability',
        'availability_start_at',
        'availability_end_at',
        'estimated_cost',
        'actual_cost',
        'cost_responsibility',
        'reported_date',
        'completed_date',
        'notes',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'reported_date' => 'date',
        'scheduled_date' => 'date',
        'availability_start_at' => 'datetime',
        'availability_end_at' => 'datetime',
        'completed_date' => 'date',
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

    public function updates()
    {
        return $this->hasMany(MaintenanceRequestUpdate::class);
    }
}
