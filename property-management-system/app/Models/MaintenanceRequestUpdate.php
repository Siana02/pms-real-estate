<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRequestUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'maintenance_request_id',
        'type',
        'status',
        'message',
        'tenant_read_at',
    ];

    protected $casts = [
        'tenant_read_at' => 'datetime',
    ];

    public function maintenanceRequest()
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }
}
