<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use App\Http\Controllers\Api\Base\PublicBaseController;
use Illuminate\Http\JsonResponse;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

/**
 * 공개 설정 API — home-design.js 가 CSS/DOM 적용에 사용
 */
class SettingsController extends PublicBaseController
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
                $row->toPublicArray()
            );
        } catch (\Exception $e) {
            return $this->error('custom-home_design::messages.settings.fetch_failed', 500, $e->getMessage());
        }
    }
}
