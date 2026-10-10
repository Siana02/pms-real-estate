<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([__DIR__.'/../app/Console/Commands'])
    ->withMiddleware(function (Middleware $middleware): void {
    $middleware->append(HandleCors::class);
    $middleware->redirectGuestsTo(function ($request) {
        if ($request->is('api/*')) {
            return null;
        }

        return route('login');
    });

    $middleware->validateCsrfTokens(except: [
        'passkeys/login',
        'passkeys/login/options',
    ]);

    $middleware->alias([
        'role' => \App\Http\Middleware\EnsureUserHasRole::class,
        'permission' => \App\Http\Middleware\CheckPermission::class,
        'subscription.feature' => \App\Http\Middleware\EnsureSubscriptionFeature::class,
    ]);
})
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('rent:generate --months=2')->dailyAt('00:10');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
