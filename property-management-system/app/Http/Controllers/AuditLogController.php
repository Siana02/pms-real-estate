<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use App\Services\PermissionService;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'audit.view'), 403);
        $logs = AuditLog::with(['actor:id,name,email,role'])
            ->where('organization_id', $request->user()->organization_id)
            ->latest()
            ->paginate(50);
        return response()->json($logs);
    }
}
