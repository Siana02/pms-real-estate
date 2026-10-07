<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

    public function profile(Request $request)
    {
        return response()->json($request->user()->organization);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,svg', 'max:512'],
        ]);

        $organization = $request->user()->organization;
        abort_if($organization === null, 404, 'Organization not found.');

        if ($organization->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
        }

        $path = $request->file('logo')->store('organization-logos', 'public');

        $organization->update(['logo_path' => $path]);

        return response()->json([
            'message' => 'Organization logo updated successfully.',
            'organization' => $organization->fresh(),
        ]);
    }

    public function removeLogo(Request $request)
    {
        $organization = $request->user()->organization;
        abort_if($organization === null, 404, 'Organization not found.');

        if ($organization->logo_path) {
            Storage::disk('public')->delete($organization->logo_path);
            $organization->update(['logo_path' => null]);
        }

        return response()->json([
            'message' => 'Organization logo removed.',
            'organization' => $organization->fresh(),
        ]);
    }

    public function logo(Organization $organization)
    {
        abort_if(! $organization->logo_path, 404, 'Organization logo not found.');

        $disk = Storage::disk('public');

        if (! $disk->exists($organization->logo_path)) {
            abort(404, 'Organization logo not found.');
        }

        $response = response()->file($disk->path($organization->logo_path));

        if ($origin = request()->header('Origin')) {
            $allowedOrigin = config('cors.allowed_origins', []);

            if (in_array($origin, $allowedOrigin, true)) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                $response->headers->set('Vary', 'Origin');
            }
        }

        return $response;
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