<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Admin;

use App\Http\Controllers\Api\Base\AdminBaseController;
use Illuminate\Http\JsonResponse;
use Modules\Custom\HomeDesign\Http\Requests\Admin\UpdateHomeDesignSettingRequest;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

class HomeDesignSettingController extends AdminBaseController
{
    public function __construct(
        private HomeDesignSettingService $service,
    ) {
        parent::__construct();
    }

    public function show(): JsonResponse
    {
        try {
            $row = $this->service->get();

            return $this->success(
                'custom-home_design::messages.settings.fetch_success',
                $row->toAdminArray()
            );
        } catch (\Exception $e) {
            return $this->error('custom-home_design::messages.settings.fetch_failed', 500, $e->getMessage());
        }
    }

    public function update(UpdateHomeDesignSettingRequest $request): JsonResponse
    {
        try {
            // validated() after prepareForValidation — bools always present (missing ⇒ false).
            $payload = $request->validated();
            $row = $this->service->update($payload);

            // Re-read admin array from persisted row (not request echo).
            return $this->success(
                'custom-home_design::messages.settings.update_success',
                $row->toAdminArray()
            );
        } catch (\InvalidArgumentException $e) {
            return $this->error('custom-home_design::messages.settings.invalid_json', 422, $e->getMessage());
        } catch (\RuntimeException $e) {
            // e.g. table missing — surface message so admin toast/errors show migrate hint
            return $this->error('custom-home_design::messages.settings.update_failed', 500, $e->getMessage());
        } catch (\Exception $e) {
            return $this->error('custom-home_design::messages.settings.update_failed', 500, $e->getMessage());
        }
    }
}
