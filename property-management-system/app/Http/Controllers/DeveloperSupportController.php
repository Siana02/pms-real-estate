<?php

namespace App\Http\Controllers;

use App\Models\DeveloperSupportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class DeveloperSupportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'in:payment_not_received,mpesa_callback,login_access,server_outage,bug_report,account_help,other'],
            'subject' => ['required', 'string', 'min:4', 'max:200'],
            'message' => ['required', 'string', 'min:15', 'max:5000'],
            'page_url' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        $organization = $user?->organization;
        $item = DeveloperSupportRequest::create([
            'organization_id' => $user?->organization_id,
            'user_id' => $user?->id,
            'requester_name' => mb_substr((string) ($user?->name ?? $request->input('requester_name', 'Portal user')), 0, 160),
            'requester_email' => $user?->email,
            'requester_role' => $user?->role,
            'category' => $validated['category'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'page_url' => $validated['page_url'] ?? null,
            'status' => 'open',
            'priority' => in_array($validated['category'], ['server_outage', 'payment_not_received'], true) ? 'high' : 'normal',
            'email_status' => 'pending',
        ]);

        try {
            $body = implode("\n", [
                'New MARSWebz PMS developer support request',
                '',
                'Ticket: #' . $item->id,
                'Category: ' . $item->category,
                'Priority: ' . $item->priority,
                'Requester: ' . $item->requester_name,
                'Email: ' . ($item->requester_email ?: 'Not available'),
                'Role: ' . ($item->requester_role ?: 'Not available'),
                'Organization: ' . ($organization?->name ?? 'Not associated with an organization'),
                'Organization ID: ' . ($item->organization_id ?? 'N/A'),
                'Page: ' . ($item->page_url ?: 'Not supplied'),
                '',
                'Message:',
                $item->message,
                '',
                'This request is stored in the PMS database. Review it in the platform-admin support inbox.',
            ]);

            Mail::raw($body, function ($mail) use ($item) {
                $mail->to(config('support.developer_email', 'hello@marswebz.com'))
                    ->subject('[PMS Support #' . $item->id . '] ' . $item->subject);
            });

            $item->forceFill(['email_status' => 'sent', 'email_sent_at' => now(), 'email_error' => null])->save();
        } catch (Throwable $exception) {
            $item->forceFill([
                'email_status' => 'failed',
                'email_error' => mb_substr($exception->getMessage(), 0, 2000),
            ])->save();

            Log::error('Developer support request was saved but its email notification failed.', [
                'support_request_id' => $item->id,
                'organization_id' => $item->organization_id,
                'exception' => $exception::class,
            ]);
        }

        return response()->json([
            'message' => 'Your support request has been saved. The development team has been notified by email when mail delivery is configured. Keep ticket #' . $item->id . ' for reference.',
            'request' => [
                'id' => $item->id,
                'status' => $item->status,
                'email_status' => $item->email_status,
                'created_at' => $item->created_at,
            ],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'platform_admin', 403);

        $query = DeveloperSupportRequest::query()
            ->with(['organization:id,name,email', 'requester:id,name,email'])
            ->latest();

        if ($request->filled('status') && in_array($request->string('status')->toString(), ['open', 'in_progress', 'resolved', 'closed'], true)) {
            $query->where('status', $request->string('status')->toString());
        }

        return response()->json($query->paginate(50));
    }

    public function update(Request $request, DeveloperSupportRequest $developerSupportRequest): JsonResponse
    {
        abort_unless($request->user()?->role === 'platform_admin', 403);

        $validated = $request->validate([
            'status' => ['required', 'in:open,in_progress,resolved,closed'],
            'priority' => ['sometimes', 'required', 'in:low,normal,high,urgent'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $developerSupportRequest->forceFill([
            ...$validated,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Support ticket updated.',
            'request' => $developerSupportRequest->fresh()->load(['organization:id,name,email', 'requester:id,name,email']),
        ]);
    }
