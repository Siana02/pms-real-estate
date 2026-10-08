<?php

namespace App\Http\Controllers;

use App\Models\Leases;
use App\Models\PaymentDestination;
use App\Models\PaymentTransaction;
use App\Services\AuditLogService;
use App\Services\PaymentReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\PermissionService;

class PaymentReconciliationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);
        $transactions=PaymentTransaction::where('organization_id',$request->user()->organization_id)
            ->with(['paymentDestination.property:id,name','matchedLease.tenant','matchedLease.property','matchedLease.unit','matchedRentObligation','payment.allocations.rentObligation'])
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
        abort_if($paymentTransaction->organization_id!==$request->user()->organization_id,403);
        $validated=$request->validate(['lease_id'=>['required','integer','exists:leases,id']]);
        $lease=Leases::where('organization_id',$request->user()->organization_id)->findOrFail($validated['lease_id']);
        $before=$paymentTransaction->status; $transaction=$service->resolve($paymentTransaction,$lease);
        app(AuditLogService::class)->record('PAYMENT_TRANSACTION_RECONCILED','Manually matched an external payment transaction to a tenant rent obligation.',$transaction,['status'=>$before],['status'=>'reconciled','lease_id'=>$lease->id],$request);
        return response()->json(['message'=>'Payment transaction reconciled.','data'=>$transaction]);
    }
}
