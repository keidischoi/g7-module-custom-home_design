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
            $cssParts[] = 'html.chd-hide-header-currency [data-testid="currency-switcher"],'
                .'html.chd-hide-header-currency [id^="ext_header_currency_selector"],'
                .'html.chd-hide-header-currency #header_currency_slot_desktop{'
                .'visibility:hidden!important;pointer-events:none!important;}'
                .'html.chd-hide-header-currency #mobile_drawer_currency_wrap{'
                .'display:none!important;visibility:hidden!important;pointer-events:none!important;}';
            $cssParts[] = 'html.chd-auth-page #main_content [data-chd-max-width]:not(#main_content),'
                .'html.chd-auth-page #main_content .chd-content-col:not(#main_content){'
                .'max-width:28rem!important;width:100%!important;margin-inline:auto!important;'
                .'padding-left:unset!important;padding-right:unset!important;}';
            $cssParts[] = '.chd-shop-sort-bar,#chd_shop_sort_bar,'
                .'#main_content .flex.items-center.justify-between.py-3,'
                .'#main_content .flex.items-center.justify-between.py-3.bg-gray-50,'
                .'html.dark .chd-shop-sort-bar,.dark .chd-shop-sort-bar{'
                .'background:transparent!important;background-color:transparent!important;'
                .'background-image:none!important;box-shadow:none!important;}'
                .'html.chd-shop-quiet-nav [data-testid="page-transition-blur"],'
                .'html.chd-shop-quiet-nav [data-testid="page-transition-indicator"],'
                .'html.chd-shop-quiet-nav [aria-label="페이지 전환 중"],'
                .'html.chd-shop-quiet-nav [aria-label="페이지 로딩 중"]{'
                .'display:none!important;opacity:0!important;visibility:hidden!important;'
                .'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}'
                .'.chd-shop-product-grid{gap:0.75rem!important;'
                .'grid-template-columns:repeat(2,minmax(0,1fr))!important;}'
                .'@media (min-width:1024px){.chd-shop-product-grid{'
                .'grid-template-columns:repeat(4,minmax(0,1fr))!important;}}'
                .'.chd-product-card{background:transparent!important;background-color:transparent!important;'
                .'border:none!important;border-radius:0!important;box-shadow:none!important;}'
                .'.chd-product-card .aspect-square{aspect-ratio:81/100!important;height:auto!important;'
                .'border-radius:6px!important;overflow:hidden!important;background:#f6f6f6!important;}'
                .'html.dark .chd-product-card .aspect-square,.dark .chd-product-card .aspect-square{'
                .'background:#2a2a2a!important;}'
                .'.chd-product-card .aspect-square img{width:100%!important;height:100%!important;object-fit:cover!important;}'
                .'.chd-product-card .absolute.top-2.left-2{top:6px!important;left:6px!important;'
                .'right:auto!important;bottom:auto!important;font-size:11px!important;line-height:1.2!important;'
                .'padding:2px 5px!important;border-radius:4px!important;font-weight:700!important;}'
                .'.chd-product-card .absolute.bottom-2.right-2{bottom:6px!important;right:6px!important;}'
                .'.chd-product-card .p-4{padding:0.5rem 0.125rem 0!important;}';

            $widthPx = (int) ($payload['content_max_width_px'] ?? 1240);
            if ($widthPx < 320 || $widthPx > 2560) {
                $widthPx = 1240;
            }
            $cssParts[] = 'html{scrollbar-gutter:stable;}'
                .'@supports not (scrollbar-gutter:stable){html{overflow-y:scroll;}}'
                .':root{--chd-content-max-width:'.$widthPx.'px;}'
                .'#main_content,#main_content.max-w-7xl,[id="main_content"],.chd-content-col,'
                .'#desktop_header .max-w-7xl,header.chd-desktop-header .max-w-7xl,'
                .'.chd-desktop-header .max-w-7xl,#footer .max-w-7xl,footer.chd-footer .max-w-7xl{'
                .'max-width:var(--chd-content-max-width)!important;width:100%!important;'
                .'margin-inline:auto!important;box-sizing:border-box!important;}'
                .'#main_content,.chd-content-col{'
                .'padding-left:1rem!important;padding-right:1rem!important;}'
                .'@media (min-width:640px){#main_content,.chd-content-col{padding-left:1.5rem!important;padding-right:1.5rem!important;}}'
                .'@media (min-width:1024px){#main_content,.chd-content-col{padding-left:2rem!important;padding-right:2rem!important;}}'
                .'#main_content > *:not([data-chd-full-bleed]),#main_content .chd-home-fill,'
                .'#main_content [data-chd-home-fill],#main_content .grid{'
                .'width:100%!important;max-width:100%!important;box-sizing:border-box!important;'
                .'padding-left:0!important;padding-right:0!important;}'
                .'[data-chd-hide-powered-by="1"]{display:none!important;}';
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
    var path = String((window.location && window.location.pathname) || "/").split("?")[0];
    if (path.length > 1) path = path.replace(/\\/+$/, "");
    var shop = path === "/shop" || path.indexOf("/shop/") === 0
      || path === "/mypage/wishlist" || path === "/mypage/mileage" || path === "/mypage/addresses"
      || path === "/mypage/orders" || path.indexOf("/mypage/orders/") === 0;
    if (!shop) {
      try { document.documentElement.classList.add("chd-hide-header-currency"); } catch (eCur1) {}
      if (document.body) { try { document.body.classList.add("chd-hide-header-currency"); } catch (eCur2) {} }
    }
    var auth = path === "/login" || path === "/register" || path === "/forgot-password"
      || path.indexOf("/reset-password") === 0 || path === "/identity-challenge" || path.indexOf("/auth/") === 0;
    if (auth) {
      try { document.documentElement.classList.add("chd-auth-page"); } catch (eAuth1) {}
      if (document.body) { try { document.body.classList.add("chd-auth-page"); } catch (eAuth2) {} }
    }
    if (path === "/shop/products" || path === "/products") {
      try { document.documentElement.classList.add("chd-shop-quiet-nav"); } catch (eQn1) {}
      if (document.body) { try { document.body.classList.add("chd-shop-quiet-nav"); } catch (eQn2) {} }
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
