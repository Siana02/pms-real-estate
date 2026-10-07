<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPermission extends Model
{
    protected $fillable = ['user_id', 'permission_id', 'granted', 'granted_by'];
    protected $casts = ['granted' => 'boolean'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function permission(): BelongsTo { return $this->belongsTo(Permission::class); }
    public function grantedBy(): BelongsTo { return $this->belongsTo(User::class, 'granted_by'); }
}
