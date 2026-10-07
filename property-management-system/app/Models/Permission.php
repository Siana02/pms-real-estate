<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Permission extends Model
{
    protected $fillable = ['key', 'name', 'group'];

    public function userPermissions(): HasMany
    {
        return $this->hasMany(UserPermission::class);
    }
}