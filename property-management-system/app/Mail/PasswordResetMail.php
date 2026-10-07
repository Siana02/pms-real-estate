<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token
    ) {
    }

    public function build(): self
    {
        $frontend = rtrim((string) config('services.frontend.url'), '/');
        $link = $frontend . '/reset-password?email=' . rawurlencode($this->user->email) . '&token=' . rawurlencode($this->token);

        return $this
            ->subject('Reset your PMS password')
            ->html(
                '<p>Hello ' . e($this->user->name) . ',</p>' .
                '<p>We received a request to reset your Property Management System password.</p>' .
                '<p><a href="' . e($link) . '">Reset your password</a></p>' .
                '<p>This link expires in 60 minutes. If you did not request this, you can safely ignore this email.</p>'
            );
    }
}
