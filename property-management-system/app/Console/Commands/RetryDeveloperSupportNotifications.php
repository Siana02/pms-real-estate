<?php

namespace App\Console\Commands;

use App\Models\DeveloperSupportRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class RetryDeveloperSupportNotifications extends Command
{
    protected $signature = 'support:retry-failed-email-notifications {--limit=50 : Maximum number of notifications to retry in one run}';

    protected $description = 'Retry stored developer support notifications that failed during a temporary mail outage.';

    public function handle(): int
    {
        if (!in_array(config('mail.default'), ['smtp', 'sendmail'], true)) {
            $this->warn('Outbound email is not configured for delivery. Set MAIL_MAILER=smtp and configure mailbox SMTP credentials.');
            return self::FAILURE;
        }

        $limit = min(max((int) $this->option('limit'), 1), 200);
        $tickets = DeveloperSupportRequest::query()
            ->with(['organization:id,name,email', 'requester:id,name,email'])
            ->where(function ($query) {
                $query->whereIn('email_status', ['pending', 'failed'])
                    ->orWhere(function ($stale) {
                        $stale->where('email_status', 'sending')
                            ->where('updated_at', '<=', now()->subMinutes(15));
                    });
            })
            ->orderBy('created_at')
            ->limit($limit)
            ->get();

        $sent = 0;
        $failed = 0;
        foreach ($tickets as $ticket) {
            try {
                $locked = DB::transaction(function () use ($ticket) {
                    $current = DeveloperSupportRequest::query()->lockForUpdate()->find($ticket->id);
                    if (!$current || $current->email_status === 'sent') {
                        return null;
                    }
                    $current->forceFill(['email_status' => 'sending', 'email_error' => null])->save();
                    return $current;
                }, 3);
                if (!$locked) {
                    continue;
                }

                $body = implode("\n", [
                    'Developer support request notification retry',
                    '',
                    'Ticket: #' . $locked->id,
                    'Category: ' . $locked->category,
                    'Priority: ' . $locked->priority,
                    'Requester: ' . $locked->requester_name,
                    'Email: ' . ($locked->requester_email ?: 'Not available'),
                    'Role: ' . ($locked->requester_role ?: 'Not available'),
                    'Organization: ' . ($locked->organization?->name ?? 'Not associated with an organization'),
                    'Organization ID: ' . ($locked->organization_id ?? 'N/A'),
                    'Page: ' . ($locked->page_url ?: 'Not supplied'),
                    '',
                    'Message:',
                    $locked->message,
                    '',
                    'This is an automatically retried notification. The request remains stored in the PMS support queue.',
                ]);

                Mail::raw($body, function ($mail) use ($locked) {
                    $mail->to(config('support.developer_email', 'hello@marswebz.com'))
                        ->subject('[PMS Support #' . $locked->id . '] ' . $locked->subject);
                });

                $locked->forceFill(['email_status' => 'sent', 'email_sent_at' => now(), 'email_error' => null])->save();
                $sent++;
            } catch (Throwable $exception) {
                $failed++;
                $ticket->forceFill([
                    'email_status' => 'failed',
                    'email_error' => mb_substr($exception->getMessage(), 0, 2000),
                ])->save();
                Log::error('Developer support email retry failed.', [
                    'support_request_id' => $ticket->id,
                    'exception' => $exception::class,
                ]);
            }
        }

        $this->info("Support email retry run complete. Sent: {$sent}; failed: {$failed}.");
        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
