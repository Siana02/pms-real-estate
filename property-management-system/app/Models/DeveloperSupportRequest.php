<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperSupportRequest extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'requester_name',
        'requester_email',
        'requester_role',
        'category',
        'subject',
        'message',
        'page_url',
        'status',
        'priority',
        'email_status',
        'email_sent_at',
        'email_error',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'email_sent_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    protected $hidden = ['email_error'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
