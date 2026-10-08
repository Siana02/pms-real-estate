<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationPaymentSetting extends Model
{
    protected $fillable = [
        'organization_id','property_id','preferred_method','mpesa_number','mpesa_till','mpesa_paybill','mpesa_paybill_account','bank_name',
        'bank_account_name','bank_account_number','bank_branch',
    ];

    protected $casts = [
        'mpesa_number' => 'encrypted',
        'mpesa_till' => 'encrypted',
        'mpesa_paybill' => 'encrypted',
        'mpesa_paybill_account' => 'encrypted',
        'bank_name' => 'encrypted',
        'bank_account_name' => 'encrypted',
        'bank_account_number' => 'encrypted',
        'bank_branch' => 'encrypted',
    ];

    protected $hidden = [
        'mpesa_number','mpesa_till','mpesa_paybill','mpesa_paybill_account','bank_name','bank_account_name','bank_account_number','bank_branch',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }

    public function property(): BelongsTo { return $this->belongsTo(Property::class); }
}