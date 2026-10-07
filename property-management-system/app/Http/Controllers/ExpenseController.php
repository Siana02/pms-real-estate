<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Property;
use Illuminate\Http\Request;
use App\Services\PermissionService;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'financial.reports.view'), 403);
        $filters = $request->validate([
            'property_id' => 'nullable|exists:properties,id',
            'category' => 'nullable|string|max:255',
            'month' => 'nullable|date_format:Y-m',
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);

        $organizationId = $request->user()->organization_id;

        $expenses = Expense::with('property')
            ->where('organization_id', $organizationId)
            ->when(
                isset($filters['property_id']),
                fn ($query) => $query->where('property_id', $filters['property_id'])
            )
            ->when(
                isset($filters['category']),
                fn ($query) => $query->where('category', $filters['category'])
            )
            ->when(isset($filters['month']), function ($query) use ($filters) {
                [$year, $month] = explode('-', $filters['month']);

                $query->whereYear('expense_date', $year)
                    ->whereMonth('expense_date', $month);
            })
            ->when(
                isset($filters['from']),
                fn ($query) => $query->whereDate('expense_date', '>=', $filters['from'])
            )
            ->when(
                isset($filters['to']),
                fn ($query) => $query->whereDate('expense_date', '<=', $filters['to'])
            )
            ->orderByDesc('expense_date')
            ->get();

        return response()->json([
            'data' => $expenses,
            'summary' => $this->summary($organizationId),
        ]);
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

        $organizationId = $request->user()->organization_id;

        $property = Property::findOrFail($validated['property_id']);

        if ($property->organization_id !== $organizationId) {
            abort(403, 'You do not have access to this property.');
        }

        $expense = Expense::create([
            ...$validated,
            'organization_id' => $organizationId,
        ]);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'expense' => $expense->load('property'),
        ], 201);
    }

    public function show(Request $request, Expense $expense)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'financial.reports.view'), 403);
        $this->authorizeOrganization($request, $expense);

        return response()->json($expense->load('property'));
    }

    public function update(Request $request, Expense $expense)
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'expenses.manage'), 403, 'Expense changes require financial access.');
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
        abort_unless(app(PermissionService::class)->has($request->user(), 'expenses.manage'), 403, 'Expense changes require financial access.');
        $this->authorizeOrganization($request, $expense);

        $expense->delete();

        return response()->json([
            'message' => 'Expense deleted successfully.',
        ]);
    }

    /**
     * Spend booked against the current month, in total and per property.
     *
     * @return array<string, mixed>
     */
    private function summary(int $organizationId): array
    {
        $thisMonth = Expense::where('organization_id', $organizationId)
            ->whereYear('expense_date', now()->year)
            ->whereMonth('expense_date', now()->month)
            ->get();

        return [
            'total_this_month' => round((float) $thisMonth->sum('amount'), 2),
            'by_property' => $thisMonth
                ->groupBy('property_id')
                ->map(fn ($group) => round((float) $group->sum('amount'), 2)),
            'by_category' => $thisMonth
                ->groupBy('category')
                ->map(fn ($group) => round((float) $group->sum('amount'), 2)),
        ];
    }

    private function authorizeOrganization(Request $request, Expense $expense)
    {
        abort_if(
            $expense->organization_id !== $request->user()->organization_id,
            403,
            'You do not have access to this expense.'
        );
    }
}
