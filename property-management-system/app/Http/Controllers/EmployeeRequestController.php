<?php

namespace App\Http\Controllers;

use App\Models\EmployeeRequest;
use App\Models\Leases;
use Illuminate\Http\Request;

class EmployeeRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = EmployeeRequest::with(['creator:id,name,email,role','assignee:id,name,email','lease:id,unit_id,tenant_id,end_date'])
            ->where('organization_id', $user->organization_id)
            ->latest();

        if (!in_array($user->role, ['admin', 'owner'], true)) {
            $query->where('created_by', $user->id);
        }

        return response()->json($query->paginate(30));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required','in:deposit_refund,lease_expiry,payment_correction,general'],
            'title' => ['required','string','max:255'],
            'description' => ['required','string','max:5000'],
            'priority' => ['nullable','in:low,normal,high,urgent'],
            'lease_id' => ['nullable','integer','exists:leases,id'],
        ]);

        $user = $request->user();

        if (!empty($validated['lease_id'])) {
            abort_unless(Leases::where('organization_id', $user->organization_id)->whereKey($validated['lease_id'])->exists(), 403);
        }

        $item = EmployeeRequest::create([
            ...$validated,
            'organization_id' => $user->organization_id,
            'created_by' => $user->id,
            'status' => 'open',
        ]);

        return response()->json(['message' => 'Request sent to the organization owner.', 'request' => $item->load('creator')], 201);
    }

    public function update(Request $request, EmployeeRequest $employeeRequest)
    {
        $user = $request->user();
        abort_if($employeeRequest->organization_id !== $user->organization_id, 403);
        abort_unless(in_array($user->role, ['admin','owner'], true), 403, 'Only the owner or administrator can manage requests.');

        $validated = $request->validate([
            'status' => ['required','in:open,in_progress,approved,rejected,resolved'],
            'priority' => ['sometimes','required','in:low,normal,high,urgent'],
            'assigned_to' => ['nullable','integer','exists:users,id'],
        ]);

        if (!empty($validated['assigned_to'])) {
            abort_unless(User::where('organization_id',$user->organization_id)->whereKey($validated['assigned_to'])->exists(), 422);
        }

        $employeeRequest->update([
            ...$validated,
            'resolved_at' => in_array($validated['status'], ['approved','rejected','resolved'], true) ? now() : null,
            'resolved_by' => in_array($validated['status'], ['approved','rejected','resolved'], true) ? $user->id : null,
        ]);

        return response()->json(['message' => 'Request updated.', 'request' => $employeeRequest->fresh()->load(['creator','assignee'])]);
    }
}