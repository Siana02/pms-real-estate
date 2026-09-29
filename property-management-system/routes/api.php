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

use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::get('username-available', [AuthController::class, 'usernameAvailable']);
Route::get('organizations', [OrganizationController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('organizations', OrganizationController::class);
    Route::apiResource('properties', PropertyController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('tenants', TenantController::class);
    Route::apiResource('leases', LeasesController::class);
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('maintenance-requests', MaintenanceRequestController::class);
    Route::get('dashboard', [DashboardController::class, 'index']);
});

Route::middleware('auth:sanctum')->prefix('tenant')->group(function () {
    Route::get('overview', [TenantPortalController::class, 'overview']);
    Route::get('payments', [TenantPortalController::class, 'payments']);
    Route::post('payments', [TenantPortalController::class, 'storePayment']);
    Route::get('maintenance-requests', [TenantPortalController::class, 'maintenanceRequests']);
    Route::post('maintenance-requests', [TenantPortalController::class, 'storeMaintenanceRequest']);
    Route::get('notifications', [TenantPortalController::class, 'notifications']);
    Route::get('vacancies', [TenantPortalController::class, 'vacancies']);
});