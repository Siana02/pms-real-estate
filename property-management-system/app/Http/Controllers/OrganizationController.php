<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Property;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    /**
     * Display a listing of organizations.
     */
    public function index()
    {
        $organizations = Organization::all();

        return response()->json($organizations);
    }

    public function properties(Organization $organization)
    {
        return response()->json(
            Property::query()
                ->where('organization_id', $organization->id)
                ->orderBy('name')
                ->get(['id', 'organization_id', 'name', 'property_type', 'city'])
        );
    }

    /**
     * Store a newly created organization.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:organizations,email',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
        ]);

        $organization = Organization::create($validated);

        return response()->json([
            'message' => 'Organization created successfully',
            'organization' => $organization
        ], 201);
    }
}