<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'organization_id', 'actor_user_id', 'event', 'auditable_type',
        'auditable_id', 'description', 'old_values', 'new_values',
        'ip_address', 'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_user_id'); }

    protected static function booted(): void
    {
        static::updating(fn () => abort(403, 'Audit logs are immutable.'));
        static::deleting(fn () => abort(403, 'Audit logs cannot be deleted.'));
    }
}