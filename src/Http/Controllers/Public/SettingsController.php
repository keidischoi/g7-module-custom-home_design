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
            $bi = $row->business_info_enabled
                ? $this->service->getEcommerceBusinessInfo()
                : null;

            $payload = $row->toPublicArray($bi);
            foreach (['hide_desktop_top_nav', 'header_search_icon_mode', 'header_theme_click_toggle', 'business_info_enabled', 'enabled'] as $k) {
                if (array_key_exists($k, $payload)) {
                    $payload[$k] = (bool) $payload[$k]; // Force JSON booleans (tinyint 1 → true)
                }
            }

            return $this->success(
                'custom-home_design::messages.settings.fetch_success',
                $payload
            );
        } catch (\Exception $e) {
            return $this->error('custom-home_design::messages.settings.fetch_failed', 500, $e->getMessage());
        }
    }
}
