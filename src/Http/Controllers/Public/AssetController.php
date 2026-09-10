<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

/**
 * Serve module static assets (JS) from resources/assets,
 * plus a dynamic boot.js that embeds current settings for instant apply.
 *
 * Controllers live under Http/Controllers/Public → dirname(__DIR__, 4) = module root
 * (same pattern as custom-ad_slots AssetController).
 */
class AssetController extends Controller
{
    public function homeDesignJs(): Response
    {
        try {
            $path = $this->resolveAssetPath('home-design.js');
            if ($path === null) {
                return $this->jsResponse('/* custom-home_design: home-design.js missing */', true);
            }

            return $this->jsResponse((string) file_get_contents($path), false);
        } catch (\Throwable $e) {
            return $this->jsResponse(
                '/* custom-home_design: home-design.js error: '.addcslashes($e->getMessage(), "\r\n*/\\").' */',
                true
            );
        }
    }

    /**
     * Dynamic boot: embed settings + critical hide-nav CSS so flags apply
     * even before home-design.js finishes /settings fetch.
     * MUST never 500 — G7 surfaces failed layout-script ids in the UI.
     */
    public function bootJs(HomeDesignSettingService $service): Response
    {
        try {
            try {
                $row = $service->get();
                $bi = null;
                try {
                    if ($row->business_info_enabled) {
                        $bi = $service->getEcommerceBusinessInfo();
                    }
                } catch (\Throwable) {
                    $bi = null;
                }
                $payload = $row->toPublicArray(is_array($bi) ? $bi : null);
            } catch (\Throwable) {
                $payload = [
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
                ];
            }

            foreach (['hide_desktop_top_nav', 'header_search_icon_mode', 'header_theme_click_toggle', 'business_info_enabled', 'enabled'] as $k) {
                if (array_key_exists($k, $payload)) {
                    $payload[$k] = (bool) $payload[$k];
                }
            }

            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                $json = '{}';
            }

            $hide = ! empty($payload['hide_desktop_top_nav']);
            $searchIcon = array_key_exists('header_search_icon_mode', $payload)
                ? (bool) $payload['header_search_icon_mode']
                : true;
            $themeClick = array_key_exists('header_theme_click_toggle', $payload)
                ? (bool) $payload['header_theme_click_toggle']
                : true;

            $cssParts = [];
            if ($hide) {
                $cssParts[] = '@media (min-width:1024px){'
                    .'html.chd-hide-desktop-top-nav #desktop_header nav,'
                    .'body.chd-hide-desktop-top-nav #desktop_header nav,'
                    .'html.chd-hide-desktop-top-nav header.sticky nav,'
                    .'body.chd-hide-desktop-top-nav header.sticky nav,'
                    .'#desktop_header nav,'
                    .'header#desktop_header > nav,'
                    .'header.sticky nav,'
                    .'header.sticky.top-0 nav.border-t,'
                    .'header.sticky nav:has([data-testid="nav-home"]),'
                    .'header.sticky nav:has([data-testid="nav-popular"]),'
                    .'header[data-chd-hide-top-nav="1"] nav,'
                    .'header.chd-hide-top-nav nav,'
                    .'[data-chd-hide-top-nav="1"] nav{'
                    .'display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;}'
                    .'}';
            }
            if ($searchIcon) {
                // Hide ONLY the original center search form — never #chd_header_search_panel form
                $cssParts[] = '#desktop_header .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg,'
                    .'#desktop_header .flex.items-center.justify-between.h-16 > form.max-w-lg,'
                    .'#desktop_header .flex.items-center.justify-between.h-16 > form,'
                    .'header.sticky .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg,'
                    .'header.sticky .flex.items-center.justify-between.h-16 > form.max-w-lg,'
                    .'header.sticky .flex.items-center.justify-between.h-16 > form,'
                    .'header.chd-desktop-header .flex.items-center.justify-between.h-16 > form,'
                    .'header.sticky form.flex.flex-1.max-w-lg.mx-8{'
                    .'display:none!important;}'
                    .'#chd_header_search_panel form,'
                    .'#chd_header_search_panel input,'
                    .'#chd_header_search_panel .chd-search-form{'
                    .'display:block!important;visibility:visible!important;opacity:1!important;'
                    .'pointer-events:auto!important;max-height:none!important;height:auto!important;}';
            }
            if ($themeClick) {
                $cssParts[] = 'header.sticky .relative:has(>[aria-label="Toggle theme"]) > div.absolute,'
                    .'#desktop_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute,'
                    .'#mobile_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute,'
                    .'#mobile_theme_btn > div.absolute,'
                    .'.relative:has(>[aria-label="Toggle theme"]) > div.absolute.w-48{'
                    .'display:none!important;visibility:hidden!important;pointer-events:none!important;}';
            }
            $bootCss = implode('', $cssParts);
            $cssJson = json_encode($bootCss, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '""';

            $js = <<<JS
/*! custom-home_design boot — embedded settings + critical CSS */
(function(){
  try {
    window.__CHD_HOME_DESIGN__ = {$json};
  } catch (e) { window.__CHD_HOME_DESIGN__ = {}; }
  try {
    var s = window.__CHD_HOME_DESIGN__ || {};
    var hide = s.hide_desktop_top_nav === true || s.hide_desktop_top_nav === 1 || s.hide_desktop_top_nav === "1";
    if (hide) {
      try { document.documentElement.classList.add("chd-hide-desktop-top-nav"); } catch (e1) {}
      if (document.body) { try { document.body.classList.add("chd-hide-desktop-top-nav"); } catch (e2) {} }
      else {
        document.addEventListener("DOMContentLoaded", function(){
          try { document.body && document.body.classList.add("chd-hide-desktop-top-nav"); } catch (e3) {}
        });
      }
    }
    var css = {$cssJson};
    if (css) {
      var el = document.getElementById("chd-home-design-boot-style");
      if (!el) {
        el = document.createElement("style");
        el.id = "chd-home-design-boot-style";
        (document.head || document.documentElement).appendChild(el);
      }
      el.textContent = css;
    }
  } catch (e4) {}
})();
JS;

            return $this->jsResponse($js, true);
        } catch (\Throwable $e) {
            // Absolute last resort — never HTML 500 for layout scripts
            return $this->jsResponse(
                "/*! custom-home_design boot fallback */\nwindow.__CHD_HOME_DESIGN__=window.__CHD_HOME_DESIGN__||{};",
                true
            );
        }
    }

    private function jsResponse(string $js, bool $noStore): Response
    {
        return response($js, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => $noStore ? 'no-store' : 'public, max-age=60',
        ]);
    }

    private function resolveAssetPath(string $file): ?string
    {
        // Public/ → Controllers → Http → src → module root (= 4)
        $candidates = [
            dirname(__DIR__, 4).'/resources/assets/'.$file,
            dirname(__DIR__, 3).'/resources/assets/'.$file,
        ];

        if (function_exists('base_path')) {
            $candidates[] = base_path('modules/custom-home_design/resources/assets/'.$file);
            $candidates[] = base_path('modules/_bundled/custom-home_design/resources/assets/'.$file);
        }

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }
}
