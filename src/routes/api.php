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

Route::get('admin/form-defaults', [FaviconUploadController::class, 'formDefaults'])
    ->middleware(['auth:sanctum', 'throttle:60,1'])
    ->name('admin.form-defaults');

Route::post('admin/uploads', [FaviconUploadController::class, 'store'])
    ->middleware(['auth:sanctum', 'throttle:180,1'])
    ->name('admin.uploads.store');

Route::delete('admin/uploads/{uploadId}', [FaviconUploadController::class, 'destroy'])
    ->where('uploadId', '.*')
    ->middleware(['auth:sanctum', 'throttle:180,1'])
    ->name('admin.uploads.destroy');
