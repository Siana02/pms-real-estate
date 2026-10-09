<?php

namespace App\Http\Controllers;

use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Models\PaymentTransaction;
use App\Models\DarajaC2bEvent;
use App\Services\AuditLogService;
use App\Services\PaymentReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\PermissionService;

class PaymentReconciliationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $transactions=PaymentTransaction::where('organization_id',$request->user()->organization_id)
            ->with(['paymentDestination.property:id,name','matchedLease.tenant','matchedLease.property','matchedLease.unit','matchedRentObligation','payment.allocations.rentObligation','payment.rentPaymentCredits'])
            ->latest('transaction_at')->get();
        return response()->json(['data'=>$transactions]);
    }

    public function ingest(Request $request, PaymentReconciliationService $service): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.record'), 403);
        $validated=$request->validate([
            'payment_destination_id'=>['nullable','integer','exists:payment_destinations,id'],
            'provider'=>['required','string','max:50'],'external_transaction_id'=>['required','string','max:100'],
            'amount'=>['required','numeric','gt:0'],'currency'=>['nullable','string','size:3'],'payer_phone'=>['nullable','string','max:30'],
            'payment_reference'=>['nullable','string','max:255'],'transaction_at'=>['required','date'],'raw_payload'=>['nullable','array'],
        ]);
        if(!empty($validated['payment_destination_id'])) {
            $destination=PaymentDestination::where('organization_id',$request->user()->organization_id)->findOrFail($validated['payment_destination_id']);
            $validated['payment_destination_id']=$destination->id;
        }
        $validated['organization_id']=$request->user()->organization_id;
        $transaction=$service->ingest($validated);
        return response()->json(['message'=>match($transaction->status){'reconciled'=>'Payment automatically reconciled.','needs_review'=>'Payment received but needs manager review.',default=>'Payment received but could not be matched automatically.'},'data'=>$transaction],201);
    }

    public function resolve(Request $request, PaymentTransaction $paymentTransaction, PaymentReconciliationService $service): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.edit'), 403, 'Payment reconciliation requires payment editing permission.');
        abort_if((int) $paymentTransaction->organization_id !== (int) $request->user()->organization_id, 403);

        $validated = $request->validate([
            'lease_id' => ['required', 'integer', 'exists:leases,id'],
            'payment_destination_id' => ['nullable', 'integer', 'exists:payment_destinations,id'],
        ]);
        $lease = Leases::where('organization_id', $request->user()->organization_id)
            ->findOrFail($validated['lease_id']);

        $payload = $paymentTransaction->raw_payload ?? [];
        $isC2b = ($payload['source'] ?? null) === 'c2b_confirmation';
        $destination = null;

        if (!empty($validated['payment_destination_id'])) {
            $destination = PaymentDestination::where('organization_id', $request->user()->organization_id)
                ->findOrFail($validated['payment_destination_id']);
        } elseif ($paymentTransaction->payment_destination_id) {
            $destination = $paymentTransaction->paymentDestination;
        }

        if ($isC2b) {
            abort_if(!$destination, 422, 'Select the correct property payment destination before resolving this C2B payment.');
            abort_if(!$destination->is_active || $destination->c2b_authorization_status !== 'ready', 422, 'The selected destination is not active and verified for C2B.');
            abort_if((string) $destination->darajaShortcode() !== (string) ($payload['business_short_code'] ?? ''),
                422, 'The selected destination shortcode does not match the received M-PESA payment.');

            $candidateIds = $payload['candidate_destination_ids'] ?? [];
            if (is_array($candidateIds) && $candidateIds !== []) {
                abort_unless(in_array((int) $destination->id, array_map('intval', $candidateIds), true),
                    422, 'The selected destination was not among the destinations identified for this payment.');
            }

            if ($paymentTransaction->payment_destination_id
                && (int) $paymentTransaction->payment_destination_id !== (int) $destination->id) {
                abort(422, 'This payment is already associated with a different destination.');
            }

        }

        if ($destination) {
            abort_if((int) $destination->organization_id !== (int) $lease->organization_id
                || (int) $destination->property_id !== (int) $lease->property_id,
                422, 'The selected lease does not belong to the selected payment destination.');
        }

        $before = $paymentTransaction->status;
        $transaction = DB::transaction(function () use ($isC2b, $paymentTransaction, $destination, $lease, $service, $payload) {
            if ($isC2b && !$paymentTransaction->payment_destination_id) {
                $paymentTransaction->update(['payment_destination_id' => $destination->id]);
            }

            $resolved = $service->resolve($paymentTransaction->fresh(), $lease);

            if ($isC2b && !empty($payload['c2b_event_id'])) {
                DarajaC2bEvent::whereKey((int) $payload['c2b_event_id'])->update([
                    'organization_id' => $resolved->organization_id,
                    'payment_destination_id' => $destination?->id,
                    'payment_transaction_id' => $resolved->id,
                    'status' => 'routed',
                    'review_reason' => null,
                ]);
            }

            return $resolved;
        });

        app(AuditLogService::class)->record(
            'PAYMENT_TRANSACTION_RECONCILED',
            'Manually matched an external payment transaction to a tenant rent obligation.',
            $transaction,
            ['status' => $before],
            ['status' => $transaction->status, 'lease_id' => $lease->id, 'payment_destination_id' => $destination?->id],
            $request
        );

        return response()->json(['message' => 'Payment transaction reconciled.','data' => $transaction]);
    }
}
