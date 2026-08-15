<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Property;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $expenses = Expense::where(
            'organization_id',
            $request->user()->organization_id
        )
        ->with('property')
        ->latest('expense_date')
        ->get();

        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'property_id' => 'required|exists:properties,id',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'category' => 'required|string|max:255',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,mpesa,bank_transfer,card,other',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $property = Property::findOrFail($validated['property_id']);

        if ($property->organization_id !== $request->user()->organization_id) {
            abort(403, 'You do not have access to this property.');
        }

        $expense = Expense::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
        ]);

        return response()->json([
            'message' => 'Expense created successfully.',
            'expense' => $expense->load('property'),
        ], 201);
    }

    public function show(Request $request, Expense $expense)
    {
        $this->authorizeOrganization($request, $expense);

        return response()->json(
            $expense->load('property')
        );
    }

    public function update(Request $request, Expense $expense)
    {
        $this->authorizeOrganization($request, $expense);

        $validated = $request->validate([
            'property_id' => 'sometimes|required|exists:properties,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'expense_date' => 'sometimes|required|date',
            'category' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,mpesa,bank_transfer,card,other',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['property_id'])) {
            $property = Property::findOrFail($validated['property_id']);

            if ($property->organization_id !== $request->user()->organization_id) {
                abort(403, 'You do not have access to this property.');
            }
        }

        $expense->update($validated);

        return response()->json([
            'message' => 'Expense updated successfully.',
            'expense' => $expense->load('property'),
        ]);
    }

    public function destroy(Request $request, Expense $expense)
    {
        $this->authorizeOrganization($request, $expense);

        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted successfully.',
        ]);
    }

    private function authorizeOrganization(
        Request $request,
        Expense $expense
    ) {
        abort_if(
            $expense->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this expense.'
        );
    }
}