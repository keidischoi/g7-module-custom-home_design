<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use App\Http\Controllers\Api\Base\PublicBaseController;
use Illuminate\Http\JsonResponse;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

/**
 * 공개 설정 API — home-design.js 가 CSS/DOM 적용에 사용.
 * Must not 500 the page pipeline if table/service missing.
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
            $bi = null;
            try {
                if ($row->business_info_enabled) {
                    $bi = $this->service->getEcommerceBusinessInfo();
                }
            } catch (\Throwable) {
                $bi = null;
            }

            $payload = $row->toPublicArray(is_array($bi) ? $bi : null);
            foreach (['hide_desktop_top_nav', 'header_search_icon_mode', 'header_theme_click_toggle', 'business_info_enabled', 'enabled'] as $k) {
                if (array_key_exists($k, $payload)) {
                    $payload[$k] = (bool) $payload[$k];
                }
            }

            return $this->success(
                'custom-home_design::messages.settings.fetch_success',
                $payload
            );
        } catch (\Throwable $e) {
            // Soft defaults — never HTML/JSON 500 for public settings (home JS tolerates this)
            return $this->success(
                'custom-home_design::messages.settings.fetch_success',
                [
                    'enabled' => true,
                    'content_max_width_px' => 1240,
                    'hide_desktop_top_nav' => false,
                    'header_search_icon_mode' => true,
                    'header_theme_click_toggle' => true,
                    'hide_header_board_slugs' => [],
                    'footer_link_groups' => null,
                    'business_info_enabled' => false,
                    'business_info' => [
                        'companyName' => '',
                        'representative' => '',
                        'businessNumber' => '',
                        'mailOrderNumber' => '',
                        'address' => '',
                        'phone' => '',
                        'email' => '',
                    ],
                ]
            );
        }
    }
}
