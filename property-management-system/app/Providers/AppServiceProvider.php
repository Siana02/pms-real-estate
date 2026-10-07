<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Laravel\Passkeys\Contracts\PasskeyLoginResponse as PasskeyLoginResponseContract;
use App\Http\Responses\PasskeyLoginResponse;
use App\Observers\AuditableObserver;
use App\Models\Property;
use App\Models\Unit;
use App\Models\Tenant;
use App\Models\Leases;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\MaintenanceRequest;
use App\Models\EmployeeRequest;
use App\Models\User;
use App\Models\OrganizationPaymentSetting;
use App\Models\Deposit;
use App\Models\TeamInvitation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach ([Property::class, Unit::class, Tenant::class, Leases::class, Payment::class, Expense::class, MaintenanceRequest::class, EmployeeRequest::class, User::class, OrganizationPaymentSetting::class, Deposit::class, TeamInvitation::class] as $model) {
            $model::observe(AuditableObserver::class);
        }

        $this->app->singleton(PasskeyLoginResponseContract::class, PasskeyLoginResponse::class);

        Event::listen(function (\SocialiteProviders\Manager\SocialiteWasCalled $event) {
            $event->extendSocialite('apple', \SocialiteProviders\Apple\Provider::class);
        });
    }

}
