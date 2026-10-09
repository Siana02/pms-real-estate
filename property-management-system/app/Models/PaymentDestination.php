<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\OrganizationDarajaCredential;

class PaymentDestination extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'property_id',
        'method',
        'label',
        'details',
        'is_active',
        'daraja_shortcode_type',
        'daraja_passkey',
        'daraja_callback_token',
        'daraja_authorization_status',
        'daraja_authorization_checked_at',
        'account_reference_format',
        'c2b_registration_status',
        'c2b_authorization_status',
        'c2b_authorization_checked_at',
        'c2b_registered_at',
    ];

    protected $hidden = ['daraja_passkey', 'daraja_callback_token'];

    protected $casts = [
        'details' => 'array',
        'is_active' => 'boolean',
        'daraja_passkey' => 'encrypted',
        'daraja_callback_token' => 'encrypted',
        'daraja_authorization_checked_at' => 'datetime',
        'c2b_authorization_checked_at' => 'datetime',
        'c2b_registered_at' => 'datetime',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function darajaShortcode(): ?string
    {
        return match ($this->method) {
            'mpesa_paybill' => (string) ($this->details['paybill'] ?? ''),
            'mpesa_till' => (string) ($this->details['till'] ?? ''),
            default => null,
        };
    }

    public function darajaMethod(): ?string
    {
        return match ($this->method) {
            'mpesa_paybill' => 'PayBill',
            'mpesa_till' => 'Till',
            default => null,
        };
    }

    public function hasMerchantStkConfiguration(): bool
    {
        return in_array($this->method, ['mpesa_paybill', 'mpesa_till'], true)
            && filled($this->darajaShortcode())
            && $this->daraja_shortcode_type === $this->darajaMethod()
            && filled($this->daraja_passkey);
    }

    public function stkPushReady(): bool
    {
        $credentials = OrganizationDarajaCredential::where('organization_id', $this->organization_id)->first();

        return in_array(config('daraja.environment'), ['sandbox', 'production'], true)
            && $credentials?->isConfigured() === true
            && $this->is_active
            && $this->hasMerchantStkConfiguration()
            && $this->daraja_authorization_status === 'ready';
    }
}
