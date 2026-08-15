<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = Tenant::where(
            'organization_id',
            $request->user()->organization_id
        )->get();

        return response()->json($tenants);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'required|string|max:50',
            'national_id' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['organization_id'] = $request->user()->organization_id;

        $tenant = Tenant::create($validated);

        return response()->json([
            'message' => 'Tenant created successfully.',
            'tenant' => $tenant,
        ], 201);
    }

    public function show(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        return response()->json($tenant);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        $validated = $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'sometimes|required|string|max:50',
            'national_id' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Tenant updated successfully.',
            'tenant' => $tenant,
        ]);
    }

    public function destroy(Request $request, Tenant $tenant)
    {
        $this->authorizeOrganization($request, $tenant);

        $tenant->delete();

        return response()->json([
            'message' => 'Tenant deleted successfully.',
        ]);
    }

    private function authorizeOrganization(Request $request, Tenant $tenant)
    {
        abort_if(
            $tenant->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this tenant.'
        );
    }
}