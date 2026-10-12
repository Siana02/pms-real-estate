<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DarajaCallbackMonitoringEvent extends Model
{
    protected $fillable = [
        'environment',
        'shortcode',
        'receipt',
        'organization_id',
        'payment_destination_id',
        'c2b_event_id',
        'source',
        'delivery_status',
        'processing_status',
        'transaction_at',
        'received_at',
        'latency_seconds',
        'is_delayed',
        'error_code',
        'error_message',
        'recovery_notes',
        'statement_fingerprint',
        'recorded_by',
    ];

    protected $casts = [
        'transaction_at' => 'datetime',
        'received_at' => 'datetime',
        'is_delayed' => 'boolean',
    ];
}
