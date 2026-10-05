<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider'])
    ->where('provider', 'google|apple');
Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback'])
    ->where('provider', 'google|apple');
