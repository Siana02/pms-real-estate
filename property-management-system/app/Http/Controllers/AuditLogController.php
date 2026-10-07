<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'owner'], true), 403);
        $logs = AuditLog::with(['actor:id,name,email,role'])
            ->where('organization_id', $request->user()->organization_id)
            ->latest()
            ->paginate(50);
        return response()->json($logs);
    }
}
