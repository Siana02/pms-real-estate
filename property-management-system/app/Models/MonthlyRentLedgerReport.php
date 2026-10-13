<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyRentLedgerReport extends Model
{
    protected $fillable = [
        'organization_id',
        'report_period',
        'status',
        'recipient_email',
        'rent_rows',
        'payment_rows',
        'file_sha256',
        'sent_at',
        'last_error',
    ];

    protected $casts = [
        'report_period' => 'date',
        'sent_at' => 'datetime',
        'rent_rows' => 'integer',
        'payment_rows' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
