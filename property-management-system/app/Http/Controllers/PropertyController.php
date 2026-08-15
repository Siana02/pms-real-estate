<?php

namespace App\Http\Controllers;

use App\Models\Property;
use Illuminate\Http\Request;

class PropertyController extends Controller
{
    public function index(Request $request)
    {
        $properties = Property::where(
            'organization_id',
            $request->user()->organization_id
        )->get();

        return response()->json($properties);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'property_type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'monthly_rent' => 'nullable|numeric|min:0',
        ]);

        $validated['organization_id'] = $request->user()->organization_id;

        $property = Property::create($validated);

        return response()->json([
            'message' => 'Property created successfully.',
            'property' => $property,
        ], 201);
    }

    public function show(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        return response()->json($property);
    }

    public function update(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'property_type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'monthly_rent' => 'nullable|numeric|min:0',
        ]);

        $property->update($validated);

        return response()->json([
            'message' => 'Property updated successfully.',
            'property' => $property,
        ]);
    }

    public function destroy(Request $request, Property $property)
    {
        $this->authorizeOrganization($request, $property);

        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully.',
        ]);
    }

    private function authorizeOrganization(Request $request, Property $property)
    {
        abort_if(
            $property->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this property.'
        );
    }
}