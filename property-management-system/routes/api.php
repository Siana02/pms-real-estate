<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\LeasesController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\MaintenanceRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TenantPortalController;
use App\Http\Controllers\TenantMaintenanceController;
use App\Http\Controllers\TenantNotificationController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\EmployeeRequestController;
use App\Http\Controllers\OrganizationPaymentSettingsController;
use App\Http\Controllers\FlutterwaveController;
use App\Http\Controllers\PaymentDestinationController;
use App\Http\Controllers\PaymentReconciliationController;
use App\Http\Controllers\DarajaController;
use App\Http\Controllers\OrganizationDarajaCredentialController;

use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('password/forgot', [AuthController::class, 'requestPasswordReset'])->middleware('throttle:5,1');
Route::post('password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::get('username-available', [AuthController::class, 'usernameAvailable']);
Route::get('organizations', [OrganizationController::class, 'index']);
Route::post('oauth/exchange', [AuthController::class, 'exchangeOauthCode']);
Route::get('oauth/pending/{code}', [AuthController::class, 'pendingOauthRegistration']);
Route::get('organizations/{organization}/logo', [OrganizationController::class, 'logo']);
Route::get('organizations/{organization}/properties', [OrganizationController::class, 'properties']);
Route::get('team/invitations/{token}', [TeamController::class, 'showInvitation']);
Route::post('team/invitations/{token}/accept', [TeamController::class, 'acceptInvitation']);
Route::get('properties/{property}/available-units', [UnitController::class, 'availableForRegistration']);
Route::get('properties/{property}/registration-availability', [UnitController::class, 'registrationAvailability']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('change-password', [AuthController::class, 'changePassword']);
});

Route::middleware(['auth:sanctum', 'role:admin,property_manager,owner,staff'])->group(function () {
    Route::get('organization/profile', [OrganizationController::class, 'profile']);
    Route::patch('organization/profile', [OrganizationController::class, 'updateProfile']);
    Route::get('organization/payment-settings', [OrganizationPaymentSettingsController::class, 'show']);
    // Organization owners/admins manage their own encrypted Daraja app credentials.
    Route::get('organization/daraja-credentials', [OrganizationDarajaCredentialController::class, 'show']);
    Route::put('organization/daraja-credentials', [OrganizationDarajaCredentialController::class, 'update']);
    Route::get('organization/payment-destinations', [PaymentDestinationController::class, 'index']);
    Route::post('organization/payment-destinations', [PaymentDestinationController::class, 'store']);
    Route::patch('organization/payment-destinations/{paymentDestination}', [PaymentDestinationController::class, 'update']);
    Route::delete('organization/payment-destinations/{paymentDestination}', [PaymentDestinationController::class, 'destroy']);
    Route::put('organization/payment-settings', [OrganizationPaymentSettingsController::class, 'update']);
    Route::get('organization/flutterwave', [FlutterwaveController::class, 'show']);
    Route::post('organization/flutterwave', [FlutterwaveController::class, 'connect']);
    Route::delete('organization/flutterwave', [FlutterwaveController::class, 'disconnect']);
    Route::post('organization/logo', [OrganizationController::class, 'uploadLogo']);
    Route::delete('organization/logo', [OrganizationController::class, 'removeLogo']);
    Route::get('team', [TeamController::class, 'index']);
    Route::post('team/invite', [TeamController::class, 'invite']);
    Route::patch('team/{user}/role', [TeamController::class, 'updateRole']);
    Route::patch('team/{user}/deactivate', [TeamController::class, 'deactivate']);
    Route::patch('team/{user}/reactivate', [TeamController::class, 'reactivate']);
    Route::post('team/{user}/resend-invitation', [TeamController::class, 'resendInvitation']);
    Route::get('permissions', [PermissionController::class, 'catalog']);
    Route::get('team/{user}/permissions', [PermissionController::class, 'user']);
    Route::patch('team/{user}/permissions', [PermissionController::class, 'update']);
    Route::get('audit-logs', [AuditLogController::class, 'index']);
    Route::get('requests', [EmployeeRequestController::class, 'index']);
    Route::post('requests', [EmployeeRequestController::class, 'store']);
    Route::patch('requests/{employeeRequest}', [EmployeeRequestController::class, 'update']);
    Route::apiResource('organizations', OrganizationController::class)->except(['index', 'destroy']);
    Route::apiResource('properties', PropertyController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('tenants', TenantController::class);
    Route::apiResource('leases', LeasesController::class);
    Route::patch('leases/{lease}/deposit', [LeasesController::class, 'recordDeposit']);
    Route::apiResource('payments', PaymentController::class);
    Route::get('payment-reconciliation', [PaymentReconciliationController::class, 'index']);
    Route::post('payment-reconciliation/transactions', [PaymentReconciliationController::class, 'ingest']);
    Route::post('payment-reconciliation/transactions/{paymentTransaction}/resolve', [PaymentReconciliationController::class, 'resolve']);
    Route::post('payments/{payment}/verify', [PaymentController::class, 'verify']);
    Route::post('payments/{payment}/reject', [PaymentController::class, 'reject']);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('maintenance-requests', MaintenanceRequestController::class);
    Route::get('dashboard', [DashboardController::class, 'index']);
});

Route::get('webhooks/flutterwave', fn () => response()->json(['message' => 'Use POST.'], 405));
Route::post('webhooks/flutterwave', [FlutterwaveController::class, 'webhook']);
Route::post('webhooks/daraja/{callbackToken}/stk', [DarajaController::class, 'stkCallback'])->middleware('throttle:120,1');
Route::post('webhooks/daraja/{callbackToken}/confirm', [DarajaController::class, 'c2bConfirmation'])->middleware('throttle:120,1');
Route::post('webhooks/daraja/{callbackToken}/validate', [DarajaController::class, 'c2bValidation'])->middleware('throttle:120,1');
Route::get('webhooks/flutterwave/callback', [FlutterwaveController::class, 'callback']);

Route::middleware(['auth:sanctum'])->prefix('tenant')->group(function () {
    Route::get('overview', [TenantPortalController::class, 'overview']);
    Route::get('profile', [TenantPortalController::class, 'profile']);
    Route::patch('profile', [TenantPortalController::class, 'updateProfile']);
    Route::post('profile/photo', [TenantPortalController::class, 'uploadProfilePhoto']);
    Route::delete('profile/photo', [TenantPortalController::class, 'removeProfilePhoto']);
    Route::get('payments', [TenantPortalController::class, 'payments']);
    Route::post('payments', [TenantPortalController::class, 'storePayment']);
    Route::post('mpesa/stk-push', [DarajaController::class, 'initiateStk'])->middleware('throttle:6,1');
    Route::get('maintenance-requests', [TenantMaintenanceController::class, 'index']);
    Route::post('maintenance-requests', [TenantMaintenanceController::class, 'store']);
    Route::patch('maintenance-requests/{maintenanceRequest}/availability', [TenantMaintenanceController::class, 'availability']);
    Route::patch('maintenance-requests/{maintenanceRequest}/viewed', [TenantMaintenanceController::class, 'viewed']);
    Route::get('notifications', [TenantNotificationController::class, 'index']);
    Route::get('vacancies', [TenantPortalController::class, 'vacancies']);
    Route::post('leases/{lease}/notice', [TenantPortalController::class, 'submitMoveOutNotice']);
    Route::get('lease-agreement', [TenantPortalController::class, 'leaseAgreement']);
    Route::get('lease-agreement/download', [TenantPortalController::class, 'downloadLeaseAgreement']);
    Route::patch('lease-agreement', [TenantPortalController::class, 'updateLeaseAgreement']);
    Route::patch('lease-agreement/tenant-details', [TenantPortalController::class, 'updateLeaseTenantDetails']);
    Route::patch('lease-agreement/end-date', [TenantPortalController::class, 'updateLeaseEndDate']);
    Route::post('deposit/mark-paid', [TenantPortalController::class, 'markDepositPaid']);
});

