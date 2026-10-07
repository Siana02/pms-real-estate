<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeRequest extends Model
{
    protected $fillable = ['organization_id','created_by','assigned_to','type','title','description','priority','status','lease_id','resolved_at','resolved_by'];
    protected $casts = ['resolved_at' => 'datetime'];
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function assignee(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
    public function resolver(): BelongsTo { return $this->belongsTo(User::class, 'resolved_by'); }
    public function lease(): BelongsTo { return $this->belongsTo(Leases::class); }
}
