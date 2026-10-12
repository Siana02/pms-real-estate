<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class RentLedgerReviewFlag extends Model
{
    protected $fillable = [
        'record_type',
        'record_id',
        'issue_code',
        'details',
        'status',
        'first_flagged_at',
        'last_flagged_at',
        'reviewed_at',
        'reviewed_by',
        'resolution_notes',
    ];

    protected $casts = [
        'first_flagged_at' => 'datetime',
        'last_flagged_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];
}
