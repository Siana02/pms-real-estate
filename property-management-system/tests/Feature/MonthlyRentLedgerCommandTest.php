<?php

namespace Tests\Feature;

use Tests\TestCase;

class MonthlyRentLedgerCommandTest extends TestCase
{
    public function test_invalid_report_period_fails_before_touching_the_database(): void
    {
        $this->artisan('rent:email-monthly-ledgers', ['--period' => 'not-a-month'])
            ->expectsOutput('The --period option must be a valid month in YYYY-MM format.')
            ->assertExitCode(1);
    }
}
