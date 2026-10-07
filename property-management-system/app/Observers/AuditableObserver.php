<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Services\AuditLogService;
use App\Models\OrganizationPaymentSetting;
use Illuminate\Database\Eloquent\Model;

class AuditableObserver
{
    public function created(Model $model): void
    {
        if (! auth()->check() || ! $model->getAttribute('organization_id')) return;

        app(AuditLogService::class)->record(
            'CREATED',
            class_basename($model).' created.',
            $model,
            null,
            $this->safeValues($model->getAttributes())
        );
    }

    public function updated(Model $model): void
    {
        if (! auth()->check() || ! $model->getAttribute('organization_id')) return;

        $changes = $model->getChanges();
        if (empty($changes)) return;

        $old = [];
        foreach (array_keys($changes) as $key) {
            $old[$key] = $model->getOriginal($key);
        }

        app(AuditLogService::class)->record(
            'UPDATED',
            class_basename($model).' updated.',
            $model,
            $this->safeValues($old),
            $this->safeValues($changes)
        );
    }

    public function deleted(Model $model): void
    {
        if (! auth()->check() || ! $model->getAttribute('organization_id')) return;

        app(AuditLogService::class)->record(
            'DELETED',
            class_basename($model).' deleted.',
            $model,
            $this->safeValues($model->getOriginal()),
            null
        );

    private function safeValues(array $values): array
    {
        foreach (['password', 'remember_token', 'token', 'token_hash', 'raw_token', 'mpesa_number', 'bank_name', 'bank_account_name', 'bank_account_number', 'bank_branch'] as $key) {
            unset($values[$key]);
        }

        return $values;
    }
}