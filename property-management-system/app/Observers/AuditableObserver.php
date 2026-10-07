<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Services\AuditLogService;
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
            $model->getAttributes()
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
            $old,
            $changes
        );
    }

    public function deleted(Model $model): void
    {
        if (! auth()->check() || ! $model->getAttribute('organization_id')) return;

        app(AuditLogService::class)->record(
            'DELETED',
            class_basename($model).' deleted.',
            $model,
            $model->getOriginal(),
            null
        );
    }
}