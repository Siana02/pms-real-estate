<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
use App\Models\Organization;
use App\Models\Tenant;
use Laravel\Passkeys\Contracts\PasskeyUser;
use Laravel\Passkeys\PasskeyAuthenticatable;


class User extends Authenticatable implements PasskeyUser
{
    use HasFactory, Notifiable;
    use HasApiTokens, PasskeyAuthenticatable;

    protected $fillable = [
        'organization_id',
        'tenant_id',
        'name',
        'username',
        'email',
        'password',
        'role',
        'must_change_password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The organization this user belongs to.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * The organization this user owns.
     */
    public function ownedOrganization(): HasOne
    {
        return $this->hasOne(Organization::class, 'owner_user_id');
    }
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }   
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
        ];
    }
}