<?php

namespace App\Http\Controllers;

use App\Models\EmployeeRequest;
use App\Models\Leases;
use App\Models\User;
use Illuminate\Http\Request;

class EmployeeRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = EmployeeRequest::with(['creator:id,name,email,role','assignee:id,name,email','resolver:id,name','replier:id,name','lease:id,unit_id,tenant_id,end_date'])
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
        abort_if((int) $employeeRequest->organization_id !== (int) $user->organization_id, 403);
        abort_unless(in_array($user->role, ['admin', 'owner'], true), 403, 'Only the organization owner can reply to or action requests.');

        $validated = $request->validate([
            'status' => ['sometimes', 'required', 'in:open,in_progress,approved,rejected,resolved'],
            'priority' => ['sometimes', 'required', 'in:low,normal,high,urgent'],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'owner_reply' => ['sometimes', 'required', 'string', 'min:2', 'max:5000'],
        ]);
        abort_if($validated === [], 422, 'Provide a reply or a request status update.');

        if (!empty($validated['assigned_to'])) {
            abort_unless(User::where('organization_id', $user->organization_id)->whereKey($validated['assigned_to'])->exists(), 422, 'Assignee must belong to this organization.');
        }

        $changes = [];
        foreach (['status', 'priority', 'assigned_to'] as $field) {
            if (array_key_exists($field, $validated)) $changes[$field] = $validated[$field];
        }
        if (array_key_exists('owner_reply', $validated)) {
            $changes['owner_reply'] = trim($validated['owner_reply']);
            $changes['replied_by'] = $user->id;
            $changes['replied_at'] = now();
        }
        if (array_key_exists('status', $validated)) {
            $changes['resolved_at'] = in_array($validated['status'], ['approved', 'rejected', 'resolved'], true) ? now() : null;
            $changes['resolved_by'] = in_array($validated['status'], ['approved', 'rejected', 'resolved'], true) ? $user->id : null;
        }

        $employeeRequest->update($changes);

        return response()->json([
            'message' => array_key_exists('owner_reply', $validated) ? 'Reply saved and attached to the request.' : 'Request updated.',
            'request' => $employeeRequest->fresh()->load(['creator', 'assignee', 'resolver:id,name', 'replier:id,name']),
        ]);
    }
}
