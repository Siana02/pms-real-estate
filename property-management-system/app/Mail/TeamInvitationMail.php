<?php

namespace App\Mail;

use App\Models\TeamInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TeamInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public TeamInvitation $invitation,
        public string $invitationUrl,
    ) {
    }

    public function build()
    {
        $employee = $this->invitation->user;
        $organization = $this->invitation->organization;

        return $this
            ->subject('You have been invited to join ' . $organization->name)
            ->html(
                '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#24313d;max-width:620px;margin:0 auto;padding:32px;">' .
                '<h1 style="margin:0 0 12px;">You\'re invited to join ' . e($organization->name) . '</h1>' .
                '<p>Hello ' . e($employee->name) . ',</p>' .
                '<p>You have been invited to join <strong>' . e($organization->name) . '</strong> as a <strong>' .
                e(ucwords(str_replace('_', ' ', $employee->role))) . '</strong>.</p>' .
                '<p>Use the button below to accept the invitation and create your password.</p>' .
                '<p style="margin:28px 0;"><a href="' . e($this->invitationUrl) . '" style="display:inline-block;padding:12px 20px;background:#315f8a;color:#fff;text-decoration:none;border-radius:8px;">Accept invitation</a></p>' .
                '<p>This invitation expires in 7 days. If you were not expecting it, you can ignore this email.</p>' .
                '<p style="margin-top:32px;color:#6f7b86;font-size:13px;">Property Management Portal</p>' .
                '</div>'
            );
    }
}
