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

use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::get('username-available', [AuthController::class, 'usernameAvailable']);
Route::get('organizations', [OrganizationController::class, 'index']);
Route::get('organizations/{organization}/properties', [OrganizationController::class, 'properties']);
Route::get('properties/{property}/available-units', [UnitController::class, 'availableForRegistration']);
Route::get('properties/{property}/registration-availability', [UnitController::class, 'registrationAvailability']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('change-password', [AuthController::class, 'changePassword']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::apiResource('organizations', OrganizationController::class)->except(['index']);
    Route::apiResource('properties', PropertyController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('tenants', TenantController::class);
    Route::apiResource('leases', LeasesController::class);
    Route::patch('leases/{lease}/deposit', [LeasesController::class, 'recordDeposit']);
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('maintenance-requests', MaintenanceRequestController::class);
    Route::get('dashboard', [DashboardController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'role:tenant'])->prefix('tenant')->group(function () {
    Route::get('overview', [TenantPortalController::class, 'overview']);
    Route::get('payments', [TenantPortalController::class, 'payments']);
    Route::post('payments', [TenantPortalController::class, 'storePayment']);
    Route::get('maintenance-requests', [TenantMaintenanceController::class, 'index']);
    Route::post('maintenance-requests', [TenantMaintenanceController::class, 'store']);
    Route::patch('maintenance-requests/{maintenanceRequest}/availability', [TenantMaintenanceController::class, 'availability']);
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