<?php

namespace App\Http\Controllers;

use App\Models\DarajaCallbackMonitoringEvent;
use App\Models\DarajaC2bEvent;
use App\Models\DarajaC2bRegistration;
use App\Models\PaymentDestination;
use App\Services\DarajaC2bRoutingService;
use App\Services\PaymentReconciliationService;
use App\Services\PermissionService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class DarajaCallbackMonitoringController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.view'), 403);

        $organizationId = (int) $request->user()->organization_id;
        $events = DarajaCallbackMonitoringEvent::query()
            ->where('organization_id', $organizationId)
            ->latest('received_at')
            ->limit(100)
            ->get();

        $destinations = PaymentDestination::query()
            ->where('organization_id', $organizationId)
            ->whereIn('method', ['mpesa_paybill', 'mpesa_till'])
            ->get();

        $shortcodes = $destinations->map(fn (PaymentDestination $destination) => $destination->darajaShortcode())
            ->filter()->unique()->values();

        $latestByShortcode = $shortcodes->map(function (string $shortcode) use ($organizationId) {
            $latest = DarajaCallbackMonitoringEvent::query()
                ->where('organization_id', $organizationId)
                ->where('shortcode', $shortcode)
                ->latest('received_at')
                ->first();

            return [
                'shortcode' => $shortcode,
                'last_callback_at' => $latest?->received_at,
                'seconds_since_last_callback' => $latest?->received_at?->diffInSeconds(now()),
                'registered' => DarajaC2bRegistration::query()
                    ->where('environment', config('daraja.environment', 'sandbox'))
                    ->where('shortcode', $shortcode)
                    ->where('status', 'registered')
                    ->exists(),
                'note' => $latest
                    ? 'Last observed callback only. This does not prove that all payments were notified.'
                    : 'No callback has been observed by this monitor yet. Check URL registration and compare against the official statement.',
            ];
        })->values();

        return response()->json([
            'data' => $events,
            'shortcodes' => $latestByShortcode,
            'summary' => [
                'delayed' => $events->where('is_delayed', true)->count(),
                'failed' => $events->where('delivery_status', 'failed')->count(),
                'needs_review' => $events->where('processing_status', 'needs_review')->count(),
                'recovered' => $events->where('source', 'statement_recovery')->where('processing_status', 'routed')->count(),
            ],
        ]);
    }

    public function recoverFromStatement(Request $request, DarajaC2bRoutingService $routing, PaymentReconciliationService $reconciliation): JsonResponse
    {
        abort_unless(app(PermissionService::class)->has($request->user(), 'payments.record'), 403);

        $validated = $request->validate([
            'statement' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'confirm_official_statement' => ['required', 'accepted'],
            'statement_period_start' => ['required', 'date'],
            'statement_period_end' => ['required', 'date', 'after_or_equal:statement_period_start'],
            'recovery_notes' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $path = $validated['statement']->getRealPath();
        $handle = fopen($path, 'rb');
        abort_if($handle === false, 422, 'The uploaded statement could not be read.');

        $headers = fgetcsv($handle);
        if (!is_array($headers) || $headers === []) {
            fclose($handle);
            return response()->json(['message' => 'The CSV is empty or has no header row.'], 422);
        }

        $headers = array_map(fn ($header) => strtolower(trim((string) $header)), $headers);
        $required = ['transid', 'transtime', 'transamount', 'businessshortcode', 'billrefnumber'];
        $missing = array_values(array_diff($required, $headers));
        if ($missing !== []) {
            fclose($handle);
            return response()->json([
                'message' => 'The CSV must contain the normalized columns TransID, TransTime, TransAmount, BusinessShortCode and BillRefNumber. MSISDN is optional. Export the official statement and map its verified transaction fields to these headers before uploading.',
                'missing_columns' => $missing,
            ], 422);
        }

        $column = array_flip($headers);
        $start = CarbonImmutable::parse($validated['statement_period_start'])->startOfDay();
        $end = CarbonImmutable::parse($validated['statement_period_end'])->endOfDay();
        $fingerprint = hash_file('sha256', $path);
        $processed = 0;
        $recovered = 0;
        $review = 0;
        $errors = [];
        $line = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $line++;
            if (count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }
            if (++$processed > 1000) {
                $errors[] = ['line' => $line, 'error' => 'Maximum 1,000 transactions per recovery upload. Split the verified statement into smaller files.'];
                break;
            }

            $at = null;
            $value = fn (string $key): string => trim((string) ($row[$column[$key]] ?? ''));
            $payload = [
                'TransID' => $value('transid'),
                'TransTime' => preg_replace('/\D+/', '', $value('transtime')),
                'TransAmount' => $value('transamount'),
                'BusinessShortCode' => $value('businessshortcode'),
                'BillRefNumber' => $value('billrefnumber'),
                'MSISDN' => isset($column['msisdn']) ? $value('msisdn') : '',
            ];

            try {
                if ($payload['TransID'] === '' || $payload['BusinessShortCode'] === '' || $payload['TransAmount'] === '' || $payload['TransTime'] === '') {
                    throw new RuntimeException('Receipt, shortcode, amount and transaction time are required.');
                }

                $at = CarbonImmutable::createFromFormat('!YmdHis', $payload['TransTime']);
                if (!$at || $at->format('YmdHis') !== $payload['TransTime'] || $at->lt($start) || $at->gt($end)) {
                    throw new RuntimeException('Transaction timestamp is invalid or outside the declared statement period.');
                }
                if (!is_numeric($payload['TransAmount']) || (float) $payload['TransAmount'] <= 0) {
                    throw new RuntimeException('Transaction amount must be a positive numeric value.');
                }
                if (!preg_match('/^[A-Za-z0-9]{5,100}$/', $payload['TransID'])) {
                    throw new RuntimeException('Receipt format is invalid; verify it against the official statement.');
                }

                $destinationExists = PaymentDestination::query()
                    ->where('organization_id', $request->user()->organization_id)
                    ->where('is_active', true)
                    ->where(function ($query) use ($payload) {
                        $query->where(fn ($q) => $q->where('method', 'mpesa_paybill')->where('details->paybill', $payload['BusinessShortCode']))
                            ->orWhere(fn ($q) => $q->where('method', 'mpesa_till')->where('details->till', $payload['BusinessShortCode']));
                    })->exists();

                if (!$destinationExists) {
                    throw new RuntimeException('This shortcode is not an active payment destination for your organization. The row was not imported.');
                }

                $registration = new DarajaC2bRegistration([
                    'environment' => config('daraja.environment', 'sandbox'),
                    'shortcode' => $payload['BusinessShortCode'],
                    'status' => 'registered',
                ]);

                $receivedAt = now();
                $event = DB::transaction(function () use ($routing, $registration, $payload, $reconciliation, $fingerprint, $request, $validated, $at, $receivedAt) {
                    $event = $routing->receive($registration, $payload, $reconciliation, 'statement_recovery');
                    $latency = max(0, $receivedAt->getTimestamp() - $at->getTimestamp());
                    DarajaCallbackMonitoringEvent::create([
                    'environment' => $registration->environment,
                    'shortcode' => $payload['BusinessShortCode'],
                    'receipt' => $payload['TransID'],
                    'organization_id' => $event->organization_id,
                    'payment_destination_id' => $event->payment_destination_id,
                    'c2b_event_id' => $event->id,
                    'source' => 'statement_recovery',
                    'delivery_status' => $event->status === 'routed' ? 'recovered' : 'statement_uploaded',
                    'processing_status' => $event->status === 'routed' ? 'routed' : 'needs_review',
                    'transaction_at' => $at,
                    'received_at' => $receivedAt,
                    'latency_seconds' => $latency,
                    'is_delayed' => true,
                    'statement_fingerprint' => $fingerprint,
                    'recorded_by' => $request->user()->id,
                    'recovery_notes' => $validated['recovery_notes'],
                    'error_message' => $event->status === 'routed' ? null : $event->review_reason,
                    ]);
                    return $event;
                }, 3);
                $status = $event->status === 'routed' ? 'recovered' : 'needs_review';
                $status === 'recovered' ? $recovered++ : $review++;
            } catch (Throwable $exception) {
                $errors[] = ['line' => $line, 'receipt' => $payload['TransID'] ?? null, 'error' => mb_substr($exception->getMessage(), 0, 400)];
                if (!empty($payload['BusinessShortCode']) && !empty($payload['TransID'])) {
                    try {
                        $receivedAt = now();
                        $monitorAt = isset($at) && $at instanceof CarbonImmutable ? $at : null;
                        DarajaCallbackMonitoringEvent::create([
                            'environment' => config('daraja.environment', 'sandbox'),
                            'shortcode' => mb_substr($payload['BusinessShortCode'], 0, 32),
                            'receipt' => mb_substr($payload['TransID'], 0, 100),
                            'organization_id' => $request->user()->organization_id,
                            'source' => 'statement_recovery',
                            'delivery_status' => 'statement_uploaded',
                            'processing_status' => 'needs_review',
                            'transaction_at' => $monitorAt,
                            'received_at' => $receivedAt,
                            'latency_seconds' => $monitorAt ? max(0, $receivedAt->getTimestamp() - $monitorAt->getTimestamp()) : null,
                            'is_delayed' => true,
                            'statement_fingerprint' => $fingerprint,
                            'recorded_by' => $request->user()->id,
                            'recovery_notes' => $validated['recovery_notes'],
                            'error_message' => mb_substr($exception->getMessage(), 0, 1000),
                        ]);
                    } catch (Throwable $monitorException) {
                        Log::critical('Rejected statement row could not be added to the review monitor.', [
                            'organization_id' => $request->user()->organization_id,
                            'line' => $line,
                            'exception' => $monitorException::class,
                        ]);
                    }
                }
                Log::warning('M-PESA statement recovery row was rejected.', [
                    'organization_id' => $request->user()->organization_id,
                    'line' => $line,
                    'receipt' => $payload['TransID'] ?? null,
                    'exception' => $exception::class,
                ]);
            }
        }
        fclose($handle);

        Log::notice('M-PESA statement recovery upload processed.', [
            'organization_id' => $request->user()->organization_id,
            'user_id' => $request->user()->id,
            'fingerprint' => $fingerprint,
            'processed_rows' => $processed,
            'recovered_rows' => $recovered,
            'review_rows' => $review,
            'rejected_rows' => count($errors),
        ]);

        return response()->json([
            'message' => 'Statement recovery finished. Rows marked recovered were routed through the normal idempotent reconciliation service; review and rejected rows require attention.',
            'summary' => ['processed' => $processed, 'recovered' => $recovered, 'needs_review' => $review, 'rejected' => count($errors)],
            'errors' => $errors,
        ]);
    }
}
