<?php

use Illuminate\Support\Facades\Route;
use Modules\Custom\HomeDesign\Http\Controllers\Admin\FaviconUploadController;
use Modules\Custom\HomeDesign\Http\Controllers\Admin\HomeDesignSettingController;
use Modules\Custom\HomeDesign\Http\Controllers\Public\AssetController;
use Modules\Custom\HomeDesign\Http\Controllers\Public\SettingsController;

Route::get('settings', [SettingsController::class, 'show'])
    ->middleware(['throttle:600,1'])
    ->name('settings.show');

Route::get('assets/boot.js', [AssetController::class, 'bootJs'])
    ->middleware(['throttle:600,1'])
    ->name('assets.boot');
Route::get('assets/boot', [AssetController::class, 'bootJs'])
    ->middleware(['throttle:600,1'])
    ->name('assets.boot.alias');

Route::get('assets/home-design.js', [AssetController::class, 'homeDesignJs'])
    ->middleware(['throttle:600,1'])
    ->name('assets.home_design');
Route::get('assets/home-design', [AssetController::class, 'homeDesignJs'])
    ->middleware(['throttle:600,1'])
    ->name('assets.home_design.alias');

Route::prefix('admin/settings')
    ->middleware(['auth:sanctum', 'throttle:600,1'])
    ->name('admin.settings.')
    ->group(function () {
        Route::get('/', [HomeDesignSettingController::class, 'show'])
            ->middleware('permission:admin,custom-home_design.design.read')
            ->name('show');

        Route::put('/', [HomeDesignSettingController::class, 'update'])
            ->middleware('permission:admin,custom-home_design.design.update')
            ->name('update');

        Route::post('/', [HomeDesignSettingController::class, 'update'])
            ->middleware('permission:admin,custom-home_design.design.update')
            ->name('update.post');
    });

Route::prefix('admin/uploads')
    ->middleware(['auth:sanctum', 'throttle:60,1'])
    ->name('admin.uploads.')
    ->group(function () {
        Route::post('/', [FaviconUploadController::class, 'store'])
            ->middleware('permission:admin,custom-home_design.design.update')
            ->name('store');
        Route::delete('{uploadId}', [FaviconUploadController::class, 'destroy'])
            ->middleware('permission:admin,custom-home_design.design.update')
            ->name('destroy');
    });
