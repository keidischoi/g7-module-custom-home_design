<?php

namespace Modules\Custom\HomeDesign\Http\Controllers\Public;

use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Modules\Custom\HomeDesign\Services\HomeDesignSettingService;

/**
 * Serve module static assets (JS) from resources/assets,
 * plus a dynamic boot.js that embeds current settings for instant apply.
 */
class AssetController extends Controller
{
    public function homeDesignJs(): Response
    {
        $path = $this->resolveAssetPath('home-design.js');
        if ($path === null) {
            return response('/* custom-home_design: home-design.js missing */', 200, [
                'Content-Type' => 'application/javascript; charset=UTF-8',
                'Cache-Control' => 'no-store',
            ]);
        }

        $js = (string) file_get_contents($path);

        return response($js, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'public, max-age=60',
        ]);
    }

    /**
     * Dynamic boot: embed settings + critical hide-nav CSS so flags apply
     * even before home-design.js finishes /settings fetch.
     */
    public function bootJs(HomeDesignSettingService $service): Response
    {
        try {
            $row = $service->get();
            $bi = $row->business_info_enabled
                ? $service->getEcommerceBusinessInfo()
                : null;
            $payload = $row->toPublicArray($bi);
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

        // Force real JSON booleans (not 0/1) for JS consumers
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
            $cssParts[] = '#desktop_header form.flex.flex-1.max-w-lg,'
                .'#desktop_header form.max-w-lg,'
                .'header.sticky form.flex.flex-1.max-w-lg,'
                .'header.sticky form.max-w-lg,'
                .'header.chd-desktop-header form,'
                .'header.sticky .flex.items-center.justify-between.h-16 > form{'
                .'display:none!important;}';
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
    var css = {$this->jsString($bootCss)};
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

        return response($js, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    private function jsString(string $s): string
    {
        return json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '""';
    }

    private function resolveAssetPath(string $file): ?string
    {
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
