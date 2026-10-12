<?php

namespace App\Http\Controllers;

use App\Models\Leases;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentTransaction;
use App\Models\RentLedgerReviewFlag;
use App\Models\RentObligation;
use App\Models\RentPaymentCredit;
use App\Services\AuditLogService;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RentLedgerReviewController extends Controller
{
    /**
     * Return only flags whose underlying record belongs to the signed-in organization.
     * The flag table intentionally has no organization_id because it can refer to
     * several ledger record types; ownership is derived from the source record.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);

        $organizationId = (int) $request->user()->organization_id;
        $flags = RentLedgerReviewFlag::query()
            ->latest('last_flagged_at')
            ->limit(1000)
            ->get()
            ->filter(fn (RentLedgerReviewFlag $flag) => $this->recordBelongsToOrganization($flag, $organizationId))
            ->values();

        return response()->json(['data' => $flags]);
    }

    /**
     * Resolution records a human review decision only. It never mutates the
     * payment, allocation, credit, obligation, or provider transaction itself.
     */
    public function resolve(Request $request, RentLedgerReviewFlag $flag): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403);
        $organizationId = (int) $request->user()->organization_id;
        abort_unless($this->recordBelongsToOrganization($flag, $organizationId), 404);

        $validated = $request->validate([
            'resolution_notes' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $before = $flag->status;
        $resolved = DB::transaction(function () use ($flag, $request, $validated, $organizationId) {
            $locked = RentLedgerReviewFlag::query()->lockForUpdate()->findOrFail($flag->id);
            abort_unless($this->recordBelongsToOrganization($locked, $organizationId), 404);

            $locked->update([
                'status' => 'resolved',
                'reviewed_at' => now(),
                'reviewed_by' => $request->user()->id,
                'resolution_notes' => trim($validated['resolution_notes']),
            ]);

            return $locked->fresh();
        });

        app(AuditLogService::class)->record(
            'RENT_LEDGER_REVIEW_FLAG_RESOLVED',
            'Recorded a manager review decision for a rent-ledger integrity flag. Ledger records were not changed.',
            $resolved,
            ['status' => $before],
            ['status' => $resolved->status, 'record_type' => $resolved->record_type, 'record_id' => $resolved->record_id, 'issue_code' => $resolved->issue_code],
            $request
        );

        return response()->json([
            'message' => 'Review decision recorded. No ledger values were changed; run the audit again after any separately authorized correction.',
            'data' => $resolved,
        ]);
    }

    private function recordBelongsToOrganization(RentLedgerReviewFlag $flag, int $organizationId): bool
    {
        return match ($flag->record_type) {
            'payment' => Payment::query()->whereKey($flag->record_id)->where('organization_id', $organizationId)->exists(),
            'payment_transaction' => PaymentTransaction::query()->whereKey($flag->record_id)->where('organization_id', $organizationId)->exists(),
            'rent_payment_credit' => RentPaymentCredit::query()->whereKey($flag->record_id)->where('organization_id', $organizationId)->exists(),
            'rent_obligation' => RentObligation::query()->whereKey($flag->record_id)->where('organization_id', $organizationId)->exists(),
            'lease' => Leases::query()->whereKey($flag->record_id)->where('organization_id', $organizationId)->exists(),
            'payment_allocation' => $this->allocationBelongsToOrganization($flag->record_id, $organizationId),
            'credit_allocation' => $this->creditAllocationBelongsToOrganization($flag->record_id, $organizationId),
            default => false,
        };
    }

    private function allocationBelongsToOrganization(int $allocationId, int $organizationId): bool
    {
        $allocation = PaymentAllocation::query()->with(['payment', 'rentObligation'])->find($allocationId);
        if (!$allocation) {
            return false;
        }

        if ($allocation->payment) {
            return (int) $allocation->payment->organization_id === $organizationId;
        }

        return (int) ($allocation->rentObligation?->organization_id ?? 0) === $organizationId;
    }

    private function creditAllocationBelongsToOrganization(int $allocationId, int $organizationId): bool
    {
        $allocation = PaymentAllocation::query()->with(['rentPaymentCredit', 'rentObligation'])->find($allocationId);
        if (!$allocation) {
            return false;
        }

        if ($allocation->rentPaymentCredit) {
            return (int) $allocation->rentPaymentCredit->organization_id === $organizationId;
        }

        return (int) ($allocation->rentObligation?->organization_id ?? 0) === $organizationId;
    }
}
