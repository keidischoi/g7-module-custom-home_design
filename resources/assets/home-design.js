/*! custom-home_design — max-width CSS var, hide desktop top nav, business info,
 *  header search icon+slide panel, dark-mode click toggle (feat UX port)
 * 0.2.13: boards hide consistent ALL pages; business BESIDE brand H3; emoji+SVG footer icons;
 *        empty hide list UNHIDES (never merge stale data-attr); NO layout scripts[];
 * 0.2.12: business under H3 (superseded); board hide apply; module.iife loader;
 *        read #chd_home_design_cfg data-chd-settings for boot.
 * 0.2.11: search panel form; business sibling (superseded); boards restore when empty.
 * 0.2.37: when header_search_icon_mode is OFF, restore always-visible search.
 * 0.2.38: icon mode ON — mount toggle first, then hide original form; force-show
 *        #chd_header_search_toggle so boot CSS cannot leave a blank header.
 * 0.2.46: home-only hide retries + debounced MutationObserver (ensureHiddenHomeBoxes
 *        ONLY — not full header UX; avoids 0.2.1 remount loop). Progressive SPA
 *        home cards appear after first paint.
 * 0.2.47: title/href split for hide matching; short EN needles (board/post/…) use
 *        whole-word match so /board/… hrefs do not hide every board summary card.
 * 0.2.48: short KO needles (웰컴/회원/게시글/댓글/게시판) use Hangul-boundary match
 *        so 게시판 does not match 자유게시판; board cards hide via slug only.
 * 0.2.49: exclusive home-box classification — each leaf maps to exactly one kind
 *        (welcome|users|posts|…|board:slug); tokens map 1:1 to kinds (no fuzzy
 *        multi-token all-or-nothing). 게시판 = stats card only; board cards need slug.
 * 0.2.50: resolveHomeBoxRoot (outermost card; nested data-chd-home-box safe);
 *        collect outermost marked only; boardname: Korean title match for
 *        공지사항/자유게시판/웹진 when navigate Buttons lack href slug.
 * 0.2.51: after hide, collapse empty layout wrappers / force lone grid child
 *        full width (grid-column 1/-1) so empty sibling columns and tall blank
 *        bands disappear; clear restores; set HTML hidden on boxes.
 * 0.2.52: revert lone-card full-width (no grid-column 1/-1 / force 1-col).
 *        Collapse .grid/flex ONLY when zero visible non-ad home children;
 *        walk up empty parents; keep HTML hidden + min-height/border harden;
 *        clear still undoes collapsed wrappers and any leftover span attrs.
 * 0.2.53: CSS-first compact partial grids — when 1+ visible home children remain
 *        in a multi-col .grid but some siblings are hidden, set
 *        data-chd-home-grid-compact + --chd-home-visible-cols/orig-cols/gap so
 *        the row shrinks to N/orig width (NOT full-bleed). Also collapse bare
 *        iteration wrappers around hidden cards so empty grid tracks vanish.
 */
(function () {
  if (window.__chdHomeDesignInstalled) return;
  window.__chdHomeDesignInstalled = true;

  var SETTINGS_URL = "/api/modules/custom-home_design/settings";
  var STYLE_ID = "chd-home-design-style";
  var BUSINESS_ID = "chd_business_info_block";
  var INLINE_BUSINESS_ID = "chd_business_info_inline";
  var MOUNT_ID = "chd_business_info_mount";
  var CFG_ID = "chd_home_design_cfg";
  var DESKTOP_TOGGLE_ID = "chd_header_search_toggle";
  var MOBILE_TOGGLE_ID = "chd_mobile_search_toggle";
  var PANEL_ID = "chd_header_search_panel";
  var THEME_STORAGE_KEY = "g7_color_scheme";
  var DEFAULT_MAX = 1240;
  var SPA_DEBOUNCE_MS = 300;
  var ENSURE_DEBOUNCE_MS = 200;
  var lateEnsureBound = false;
  /** Home-box hide retries (progressive SPA cards load after first paint). */
  var HOME_HIDE_RETRY_MS = [0, 300, 800, 1500, 3000, 5000, 8000];
  var HOME_BOX_MO_DEBOUNCE_MS = 200;
  /** @type {number[]} */
  var homeHideRetryTimers = [];
  /** @type {MutationObserver|null} */
  var homeBoxMo = null;
  /** @type {Element|null} */
  var homeBoxMoRoot = null;
  /** @type {number|null} */
  var homeBoxMoDebounce = null;

  /** @type {object|null} */
  var lastSettings = null;
  /** @type {string} */
  var lastBusinessSig = "";
  /** @type {number|null} */
  var spaTimer = null;
  /** @type {number|null} */
  var ensureTimer = null;
  var businessInjectedOnce = false;
  var searchOpen = false;
  var themeClickBound = false;
  var outsideClickBound = false;

  function coerceBool(v, defaultOn) {
    if (v === undefined || v === null) return !!defaultOn;
    if (v === true || v === 1 || v === "1" || v === "true" || v === "on" || v === "yes") return true;
    if (v === false || v === 0 || v === "0" || v === "false" || v === "off" || v === "no" || v === "") return false;
    return !!v;
  }

  function settingOn(settings, key, defaultOn) {
    if (!settings) return !!defaultOn;
    return coerceBool(settings[key], defaultOn);
  }


  function fetchSettings() {
    return fetch(SETTINGS_URL, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        if (!r.ok) throw new Error("settings " + r.status);
        return r.json();
      })
      .then(function (body) {
        var data = body && (body.data !== undefined ? body.data : body);
        if (
          data &&
          data.data &&
          typeof data.data === "object" &&
          data.content_max_width_px === undefined &&
          data.data.content_max_width_px !== undefined
        ) {
          data = data.data;
        }
        data = data || {};
        ["hide_desktop_top_nav", "business_info_enabled", "header_search_icon_mode", "header_theme_click_toggle"].forEach(function (k) {
          if (data[k] !== undefined && data[k] !== null) {
            data[k] = coerceBool(data[k], k.indexOf("header_") === 0);
          }
        });
        return data;
      });
  }

  function ensureStyleEl() {
    var el = document.getElementById(STYLE_ID);
    if (el) return el;
    el = document.createElement("style");
    el.id = STYLE_ID;
    el.type = "text/css";
    (document.head || document.documentElement).appendChild(el);
    return el;
  }

  function contentColumnSelector() {
    return (
      "#main_content," +
      "#main_content.max-w-7xl," +
      "[id='main_content']," +
      ".chd-content-col," +
      "#main_content_area > .max-w-7xl," +
      "#desktop_header .max-w-7xl," +
      "header.chd-desktop-header .max-w-7xl," +
      ".chd-desktop-header .max-w-7xl," +
      "#footer .max-w-7xl," +
      "footer.chd-footer .max-w-7xl," +
      "#chd_business_info_mount .max-w-7xl," +
      "#chd_business_info_block .chd-bi-inner," +
      "[data-chd-max-width]"
    );
  }

  function homeFillSelector() {
    // Do NOT force max-width:100% on nested grids or ad Event Hook mounts —
    // that overrides custom-ad_slots maxWidth (ads blow up full-bleed).
    return (
      "#main_content > *:not([data-chd-full-bleed]):not([data-cas-ad-slot]):not([data-cas-ad-role]):not([data-cas-hero]):not([data-cas-ad-host]):not([id^='cas_']):not([id^='ad_'])," +
      "#main_content .chd-home-fill," +
      "#main_content [data-chd-home-fill]"
    );
  }

  function hasFormScaleMaxWidth(el) {
    var cls = (el && el.className && String(el.className)) || "";
    return /\bmax-w-(?:xs|sm|md|lg|xl|2xl|3xl|4xl)\b/.test(cls);
  }

  function isInsideMainContent(el) {
    if (!el || el.id === "main_content") return false;
    try {
      return !!(el.closest && el.closest("#main_content"));
    } catch (e) {
      return false;
    }
  }

  function applyInlineMaxWidth(n) {
    var auth = isAuthRelatedPath(window.location && window.location.pathname);
    var nodes;
    try {
      nodes = document.querySelectorAll(contentColumnSelector());
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute && (el.getAttribute("data-chd-full-bleed") === "1" || el.getAttribute("data-chd-home-fill") === "1")) continue;
      var id = (el.id || "").toLowerCase();
      var cls = (el.className && String(el.className)) || "";
      if (id.indexOf("carousel") !== -1 || id.indexOf("hero") !== -1) continue;
      if (cls.indexOf("chd-full-bleed") !== -1 || cls.indexOf("chd-home-fill") !== -1) continue;
      if (hasFormScaleMaxWidth(el)) continue;
      if (auth && isInsideMainContent(el)) continue;
      try {
        el.style.setProperty("max-width", n + "px", "important");
        el.style.setProperty("width", "100%", "important");
        el.style.setProperty("margin-inline", "auto");
        el.style.setProperty("box-sizing", "border-box");
      } catch (err) {}
    }

    var fills;
    try {
      fills = document.querySelectorAll(homeFillSelector());
    } catch (e2) {
      fills = [];
    }
    for (var j = 0; j < fills.length; j++) {
      var fill = fills[j];
      if (typeof isCasAdMount === "function" && isCasAdMount(fill)) continue;
      var fillId = (fill.id || "").toLowerCase();
      if (fillId === "main_content") continue;
      if (fillId.indexOf("carousel") !== -1 || fillId.indexOf("hero") !== -1) continue;
      if (fillId.indexOf("cas_") === 0 || fillId.indexOf("ad_") === 0) continue;
      if (hasFormScaleMaxWidth(fill)) continue;
      try {
        fill.style.setProperty("width", "100%", "important");
        fill.style.setProperty("max-width", "100%", "important");
        fill.style.setProperty("box-sizing", "border-box");
      } catch (err2) {}
    }

    restoreAuthFormCards();
  }

  function renderStyle(settings) {
    var n = parseInt(settings && settings.content_max_width_px, 10);
    if (!n || n < 320) n = DEFAULT_MAX;
    var hide = coerceBool(settings && settings.hide_desktop_top_nav, false);
    var searchIcon = settingOn(settings, "header_search_icon_mode", true);
    var themeClick = settingOn(settings, "header_theme_click_toggle", true);
    document.documentElement.style.setProperty("--chd-content-max-width", n + "px");

    var css =
      "html{scrollbar-gutter:stable;}" +
      "@supports not (scrollbar-gutter:stable){html{overflow-y:scroll;}}" +
      ":root{--chd-content-max-width:" +
      n +
      "px;}" +
      contentColumnSelector() +
      "{max-width:var(--chd-content-max-width)!important;" +
      "width:100%!important;margin-inline:auto!important;box-sizing:border-box!important;}" +
      homeFillSelector() +
      "{width:100%!important;max-width:100%!important;box-sizing:border-box!important;" +
      "padding-left:0!important;padding-right:0!important;}" +
      "#main_content [data-cas-ad-slot],#main_content [data-cas-ad-role],#main_content [data-cas-hero]," +
      "#main_content [data-cas-ad-host],#main_content [id^='cas_'],#main_content [id^='ad_']," +
      "#main_content_area [data-cas-ad-slot],#main_content_area [id^='cas_'],#main_content_area [id^='ad_']{" +
      "max-width:var(--chd-content-max-width,80rem)!important;width:100%!important;margin-inline:auto!important;}" +
      "#main_content,.chd-content-col{" +
      "padding-left:1rem!important;padding-right:1rem!important;}" +
      "@media (min-width:640px){#main_content,.chd-content-col{" +
      "padding-left:1.5rem!important;padding-right:1.5rem!important;}}" +
      "@media (min-width:1024px){#main_content,.chd-content-col{" +
      "padding-left:2rem!important;padding-right:2rem!important;}}" +
      "[data-chd-hide-powered-by='1']{display:none!important;}" +"[data-chd-home-box-hidden='1'],[data-chd-home-layout-collapsed='1']{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;}" +"#main_content .grid:has(> [data-chd-home-box-hidden='1']):not(:has(> :not([data-chd-home-box-hidden='1']):not([hidden]):not([data-chd-home-layout-collapsed='1'])))," +"#main_content_area .grid:has(> [data-chd-home-box-hidden='1']):not(:has(> :not([data-chd-home-box-hidden='1']):not([hidden]):not([data-chd-home-layout-collapsed='1']))){" +"display:none!important;min-height:0!important;height:0!important;margin:0!important;padding:0!important;gap:0!important;border:0!important;}" +"#main_content .grid[data-chd-home-grid-compact='1']," +"#main_content_area .grid[data-chd-home-grid-compact='1']{" +"grid-template-columns:repeat(var(--chd-home-visible-cols,1),minmax(0,1fr))!important;" +"width:calc((100% - (var(--chd-home-orig-cols,3) - 1) * var(--chd-home-gap,1rem)) * var(--chd-home-visible-cols,1) / var(--chd-home-orig-cols,3) + (var(--chd-home-visible-cols,1) - 1) * var(--chd-home-gap,1rem))!important;" +"max-width:100%!important;justify-self:start;" +"}" +
      /* Keep full-bleed carousel/hero full width */
      "[data-chd-full-bleed='1']," +
      "#main_content_area [id*='carousel']," +
      "#main_content_area [id*='hero']{" +
      "max-width:none!important;width:100%!important;}" +
      "body{--chd-content-max-width:" +
      n +
      "px;}";

    try {
      document.documentElement.classList.toggle("chd-hide-desktop-top-nav", hide);
      document.body && document.body.classList.toggle("chd-hide-desktop-top-nav", hide);
    } catch (e) {}

    if (hide) {
      css +=
        "@media (min-width:1024px){" +
        "html.chd-hide-desktop-top-nav #desktop_header nav," +
        "body.chd-hide-desktop-top-nav #desktop_header nav," +
        "html.chd-hide-desktop-top-nav header.sticky nav," +
        "body.chd-hide-desktop-top-nav header.sticky nav," +
        "#desktop_header nav," +
        "#desktop_header nav.border-t," +
        "#desktop_header nav[class*='border-t']," +
        "#desktop_header nav:has([data-testid='nav-home'])," +
        "#desktop_header nav:has([data-testid='nav-popular'])," +
        "#desktop_header nav:has([data-testid='nav-shop'])," +
        "header#desktop_header > nav," +
        "#desktop_header > nav," +
        "header[data-chd-hide-top-nav='1'] nav," +
        "header.chd-hide-top-nav nav," +
        "[data-chd-hide-top-nav='1'] nav," +
        ".chd-hide-top-nav nav{" +
        "display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important;}" +
        "}";
    }

    if (searchIcon) {
      // 0.2.38: do NOT hide original forms in CSS until toggles are mounted
      // (hideOriginalSearchFormsAfterIconMount). Always force-show our icon buttons.
      css +=
        "#" +
        DESKTOP_TOGGLE_ID +
        ",#" +
        MOBILE_TOGGLE_ID +
        "{display:inline-flex!important;visibility:visible!important;opacity:1!important;" +
        "pointer-events:auto!important;}" +
        "html.chd-search-icon-ready #desktop_header .flex.items-center.justify-between.h-16 > form," +
        "html.chd-search-icon-ready #desktop_header .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "html.chd-search-icon-ready #desktop_header .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "html.chd-search-icon-ready header.sticky .flex.items-center.justify-between.h-16 > form," +
        "html.chd-search-icon-ready header.sticky .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "html.chd-search-icon-ready header.sticky .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "html.chd-search-icon-ready header.chd-desktop-header .flex.items-center.justify-between.h-16 > form," +
        "html.chd-search-icon-ready header.sticky form.flex.flex-1.max-w-lg.mx-8," +
        "html.chd-search-icon-ready #chd_header_search_always," +
        "html.chd-search-icon-ready #chd_mobile_search_always{" +
        "display:none!important;}" +
        "#" +
        PANEL_ID +
        "{overflow:hidden;transition:max-height .3s ease,opacity .3s ease,padding .3s ease;" +
        "border-color:rgb(229 231 235);background:#fff;z-index:60;position:relative;width:100%;" +
        "box-sizing:border-box;}" +
        ".dark #" +
        PANEL_ID +
        "{border-color:rgb(31 41 55);background:rgb(17 24 39);}" +
        "#" +
        PANEL_ID +
        ".chd-search-open{max-height:160px!important;opacity:1!important;pointer-events:auto;" +
        "border-top-width:1px;border-top-style:solid;visibility:visible!important;display:block!important;}" +
        "#" +
        PANEL_ID +
        ".chd-search-open form," +
        "#" +
        PANEL_ID +
        ".chd-search-open .chd-search-form," +
        "#" +
        PANEL_ID +
        ".chd-search-open input," +
        "#" +
        PANEL_ID +
        ".chd-search-open input[type='search']," +
        "#" +
        PANEL_ID +
        ".chd-search-open input[type='text']{" +
        "display:block!important;visibility:visible!important;opacity:1!important;" +
        "pointer-events:auto!important;max-height:none!important;height:auto!important;" +
        "color:inherit!important;background-color:rgb(255 255 255)!important;width:100%!important;}" +
        ".dark #" +
        PANEL_ID +
        ".chd-search-open input{" +
        "background-color:rgb(31 41 55)!important;color:rgb(255 255 255)!important;}" +
        "#" +
        PANEL_ID +
        ":not(.chd-search-open){max-height:0!important;opacity:0;pointer-events:none;border-top-width:0;" +
        "visibility:hidden;}" +
        "#" +
        DESKTOP_TOGGLE_ID +
        ".chd-search-active," +
        "#" +
        MOBILE_TOGGLE_ID +
        ".chd-search-active{color:rgb(37 99 235);background:rgba(239,246,255,.9);}" +
        ".dark #" +
        DESKTOP_TOGGLE_ID +
        ".chd-search-active," +
        ".dark #" +
        MOBILE_TOGGLE_ID +
        ".chd-search-active{color:rgb(96 165 250);background:rgba(30,58,138,.35);}";
    } else {
      // Mode OFF: hide icon/panel widgets and FORCE original/fallback search visible.
      css +=
        "#" +
        DESKTOP_TOGGLE_ID +
        ",#" +
        MOBILE_TOGGLE_ID +
        ",#" +
        PANEL_ID +
        "{display:none!important;}" +
        "#desktop_header .flex.items-center.justify-between.h-16 > form," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "header.sticky .flex.items-center.justify-between.h-16 > form," +
        "header.sticky .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "header.sticky .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "header.chd-desktop-header .flex.items-center.justify-between.h-16 > form," +
        "header.sticky form.flex.flex-1.max-w-lg.mx-8," +
        "#chd_header_search_always,#chd_mobile_search_always{" +
        "display:flex!important;visibility:visible!important;opacity:1!important;" +
        "pointer-events:auto!important;max-height:none!important;height:auto!important;}" +
        "#chd_header_search_always input,#chd_mobile_search_always input," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form input," +
        "header.sticky .flex.items-center.justify-between.h-16 > form input{" +
        "display:block!important;visibility:visible!important;opacity:1!important;" +
        "pointer-events:auto!important;width:100%!important;}";
    }

    if (themeClick) {
      // Hide ThemeToggle dropdown menus (official has auto/light/dark popup).
      css +=
        '#desktop_header [aria-label="Toggle theme"] ~ div.absolute,' +
        '#mobile_header [aria-label="Toggle theme"] ~ div.absolute,' +
        '#mobile_theme_btn [aria-label="Toggle theme"] ~ div.absolute,' +
        '#desktop_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute,' +
        '#mobile_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute,' +
        'header.sticky .relative:has(>[aria-label="Toggle theme"]) > div.absolute,' +
        'header.chd-desktop-header .relative:has(>[aria-label="Toggle theme"]) > div.absolute,' +
        '.relative:has(>[aria-label="Toggle theme"]) > div.absolute.w-48,' +
        "#mobile_theme_btn > div.absolute{" +
        "display:none!important;visibility:hidden!important;pointer-events:none!important;}";
    }

    css += headerCurrencyHideCss();
    css += authFormCardCss();
    css += shopSortBarCss();
    css += shopBunjangThumbCss();
    syncHeaderCurrencyVisibility();
    syncAuthPageClass();

    ensureStyleEl().textContent = css;
    applyInlineMaxWidth(n);
  }

  function shopSortBarCss() {
    return (
      ".chd-shop-sort-bar," +
      "#chd_shop_sort_bar," +
      "#main_content .flex.items-center.justify-between.py-3," +
      "#main_content .flex.items-center.justify-between.py-3.bg-gray-50," +
      "html.dark .chd-shop-sort-bar," +
      ".dark .chd-shop-sort-bar{" +
      "background:transparent!important;background-color:transparent!important;" +
      "background-image:none!important;box-shadow:none!important;}" +
      "html.chd-shop-quiet-nav [data-testid='page-transition-blur']," +
      "html.chd-shop-quiet-nav [data-testid='page-transition-indicator']," +
      "html.chd-shop-quiet-nav [aria-label='페이지 전환 중']," +
      "html.chd-shop-quiet-nav [aria-label='페이지 로딩 중']{" +
      "display:none!important;opacity:0!important;visibility:hidden!important;" +
      "backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}"
    );
  }

  function shopBunjangThumbCss() {
    return (
      "html.chd-shop-quiet-nav #main_content .grid.grid-cols-2," +
      "html.chd-shop-quiet-nav .chd-shop-product-grid," +
      "html.chd-shop-quiet-nav .chd-shop-carousel-row," +
      ".chd-shop-product-grid,.chd-shop-carousel-row{" +
      "display:grid!important;gap:0.5rem!important;" +
      "grid-auto-flow:row!important;grid-auto-columns:unset!important;" +
      "overflow:visible!important;overflow-x:visible!important;" +
      "grid-template-columns:repeat(3,minmax(0,1fr))!important;}" +
      "@media (min-width:640px){" +
      "html.chd-shop-quiet-nav #main_content .grid.grid-cols-2," +
      "html.chd-shop-quiet-nav .chd-shop-product-grid," +
      "html.chd-shop-quiet-nav .chd-shop-carousel-row," +
      ".chd-shop-product-grid,.chd-shop-carousel-row{" +
      "grid-template-columns:repeat(6,minmax(0,1fr))!important;}}" +
      "html.chd-shop-quiet-nav .chd-shop-carousel-row > *," +
      ".chd-shop-carousel-row > *{" +
      "width:100%!important;min-width:0!important;max-width:none!important;" +
      "flex:none!important;}" +
      "html.chd-shop-quiet-nav .relative:has(.chd-shop-carousel-row) > button{" +
      "display:none!important;}" +
      "html.chd-shop-quiet-nav #main_content .aspect-square," +
      ".chd-product-card .aspect-square{" +
      "aspect-ratio:81/100!important;height:auto!important;" +
      "border-radius:6px!important;overflow:hidden!important;" +
      "background:#f6f6f6!important;}" +
      "html.dark.chd-shop-quiet-nav #main_content .aspect-square," +
      "html.dark .chd-product-card .aspect-square,.dark .chd-product-card .aspect-square{" +
      "background:#2a2a2a!important;}" +
      "html.chd-shop-quiet-nav #main_content .aspect-square img," +
      ".chd-product-card .aspect-square img{" +
      "width:100%!important;height:100%!important;object-fit:cover!important;}" +
      "html.chd-shop-quiet-nav #main_content .aspect-square .absolute.top-2.left-2," +
      ".chd-product-card .absolute.top-2.left-2{" +
      "top:4px!important;left:4px!important;right:auto!important;bottom:auto!important;" +
      "font-size:10px!important;line-height:1.15!important;" +
      "padding:1px 4px!important;border-radius:3px!important;font-weight:700!important;}" +
      "html.chd-shop-quiet-nav #main_content .aspect-square .absolute.bottom-2.right-2," +
      ".chd-product-card .absolute.bottom-2.right-2{" +
      "bottom:4px!important;right:4px!important;}" +
      "html.chd-shop-quiet-nav #main_content .chd-product-card," +
      ".chd-product-card{" +
      "background:transparent!important;background-color:transparent!important;" +
      "border:none!important;border-radius:0!important;box-shadow:none!important;}" +
      "html.chd-shop-quiet-nav #main_content .chd-product-card .p-4," +
      ".chd-product-card .p-4{padding:0.375rem 0.125rem 0!important;}"
    );
  }

  function authFormCardCss() {
    return (
      "html.chd-auth-page #main_content [data-chd-max-width]:not(#main_content)," +
      "html.chd-auth-page #main_content .chd-content-col:not(#main_content){" +
      "max-width:28rem!important;width:100%!important;margin-inline:auto!important;" +
      "padding-left:unset!important;padding-right:unset!important;}"
    );
  }

  function headerCurrencyHideCss() {
    // display:none on the slot itself (a flex child) so siblings slide over.
    // Do not use visibility:hidden — that keeps a blank hole.
    // Scoped to header so share / other menus are not matched.
    return (
      "html.chd-hide-header-currency #desktop_header #header_currency_slot_desktop," +
      "html.chd-hide-header-currency header.sticky #header_currency_slot_desktop," +
      "html.chd-hide-header-currency header.chd-desktop-header #header_currency_slot_desktop," +
      "html.chd-hide-header-currency #desktop_header [data-testid='currency-switcher']," +
      "html.chd-hide-header-currency header.sticky [data-testid='currency-switcher']," +
      "html.chd-hide-header-currency header.chd-desktop-header [data-testid='currency-switcher']," +
      "html.chd-hide-header-currency #desktop_header [id^='ext_header_currency_selector']," +
      "html.chd-hide-header-currency header.sticky [id^='ext_header_currency_selector']," +
      "html.chd-hide-header-currency header.chd-desktop-header [id^='ext_header_currency_selector']," +
      "html.chd-hide-header-currency #mobile_drawer_currency_wrap{" +
      "display:none!important;}"
    );
  }

  function shopBasePath() {
    try {
      var cfg = window.G7Config || {};
      if (cfg.shopBase) return String(cfg.shopBase);
    } catch (e) {}
    return "/shop";
  }

  function isAuthRelatedPath(path) {
    path = normalizePath(path);
    return (
      path === "/login" ||
      path === "/register" ||
      path === "/forgot-password" ||
      path.indexOf("/reset-password") === 0 ||
      path === "/identity-challenge" ||
      path.indexOf("/auth/") === 0
    );
  }

  function isShopRelatedPath(path) {
    path = normalizePath(path);
    var base = normalizePath(shopBasePath());
    if (base === "/") {
      return /\/(products|cart|checkout|category)(\/|$)/.test(path);
    }
    if (path === base || path.indexOf(base + "/") === 0) return true;
    if (
      path === "/mypage/wishlist" ||
      path === "/mypage/mileage" ||
      path === "/mypage/addresses" ||
      path === "/mypage/orders" ||
      path.indexOf("/mypage/orders/") === 0
    ) {
      return true;
    }
    return false;
  }

  function hidePoweredBy() {
    var roots;
    try {
      roots = document.querySelectorAll("#footer, footer, .chd-footer");
    } catch (e) {
      roots = [];
    }
    for (var i = 0; i < roots.length; i++) {
      var ps = roots[i].querySelectorAll("p");
      for (var j = 0; j < ps.length; j++) {
        var text = String(ps[j].textContent || "").replace(/\s+/g, " ").trim();
        if (/^Powered by\s+(그누보드7|Gnuboard7)$/i.test(text)) {
          try {
            ps[j].setAttribute("data-chd-hide-powered-by", "1");
            ps[j].style.setProperty("display", "none", "important");
          } catch (err) {}
        }
      }
    }
  }

  function syncHeaderCurrencyVisibility() {
    var hide = !isShopRelatedPath(window.location && window.location.pathname);
    try {
      document.documentElement.classList.toggle("chd-hide-header-currency", hide);
    } catch (e) {}
    try {
      document.body && document.body.classList.toggle("chd-hide-header-currency", hide);
    } catch (e2) {}
    packHeaderCurrencySlot(hide);
  }

  function isShareRelatedNode(el) {
    if (!el) return false;
    var id = String(el.id || "").toLowerCase();
    var cls = String((el.className && el.className.baseVal) || el.className || "").toLowerCase();
    if (id.indexOf("share") !== -1 || id.indexOf("cdp_share") !== -1) return true;
    if (cls.indexOf("share") !== -1) return true;
    try {
      if (el.querySelector("[id*='share'], [id*='cdp_share'], [class*='share']")) return true;
    } catch (e) {}
    return false;
  }

  /** Hide only the currency flex item so remaining header icons pack. Never touch share. */
  function packHeaderCurrencySlot(hide) {
    var slot = document.getElementById("header_currency_slot_desktop");
    if (!slot) {
      try {
        slot = document.querySelector("[id$='__header_currency_slot_desktop']");
      } catch (e) {
        slot = null;
      }
    }
    if (!slot || isShareRelatedNode(slot)) return;
    try {
      if (hide) {
        slot.style.setProperty("display", "none", "important");
        slot.setAttribute("data-chd-currency-packed", "1");
      } else if (slot.getAttribute("data-chd-currency-packed") === "1") {
        slot.style.removeProperty("display");
        slot.removeAttribute("data-chd-currency-packed");
      }
    } catch (err) {}
  }

  function syncAuthPageClass() {
    var on = isAuthRelatedPath(window.location && window.location.pathname);
    try {
      document.documentElement.classList.toggle("chd-auth-page", on);
    } catch (e) {}
    try {
      document.body && document.body.classList.toggle("chd-auth-page", on);
    } catch (e2) {}
  }

  function restoreAuthFormCards() {
    if (!isAuthRelatedPath(window.location && window.location.pathname)) return;
    var nodes;
    try {
      nodes = document.querySelectorAll(
        "#main_content [data-chd-max-width], #main_content .chd-content-col"
      );
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || el.id === "main_content") continue;
      try {
        el.style.removeProperty("max-width");
        el.style.removeProperty("width");
        el.style.removeProperty("padding-left");
        el.style.removeProperty("padding-right");
        el.style.setProperty("max-width", "28rem", "important");
        el.style.setProperty("width", "100%", "important");
        el.style.setProperty("margin-inline", "auto");
      } catch (err) {}
    }
  }

  function clearStyle() {
    var el = document.getElementById(STYLE_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try {
      document.documentElement.style.removeProperty("--chd-content-max-width");
    } catch (e) {}
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildBusinessParts(bi) {
    if (!bi || typeof bi !== "object") return [];
    var parts = [];
    if (bi.companyName) parts.push(String(bi.companyName));
    if (bi.representative) parts.push("대표 " + bi.representative);
    if (bi.businessNumber) parts.push("사업자등록번호 " + bi.businessNumber);
    if (bi.mailOrderNumber) parts.push("통신판매업신고 " + bi.mailOrderNumber);
    if (bi.address) parts.push(String(bi.address));
    if (bi.phone) parts.push("전화 " + bi.phone);
    if (bi.email) parts.push("이메일 " + bi.email);
    return parts;
  }

  function businessSignature(settings) {
    if (!settings || !coerceBool(settings.business_info_enabled, false)) return "";
    return buildBusinessParts(settings.business_info).join("  |  ");
  }

  function clearBusinessInfo() {
    [BUSINESS_ID, INLINE_BUSINESS_ID].forEach(function (id) {
      var existing = document.getElementById(id);
      if (existing && existing.parentNode) {
        try {
          existing.parentNode.removeChild(existing);
        } catch (e) {}
      }
    });
    document.querySelectorAll('[data-chd-role="business-info"]').forEach(function (n) {
      try {
        if (n && n.parentNode) n.parentNode.removeChild(n);
      } catch (e2) {}
    });
    var mount = document.getElementById(MOUNT_ID);
    if (mount) {
      try {
        mount.innerHTML = "";
        mount.classList.add("hidden");
      } catch (e3) {}
    }
    lastBusinessSig = "";
    businessInjectedOnce = false;
  }

  function findFooterEl() {
    return (
      document.querySelector("footer.chd-footer") ||
      document.getElementById("footer") ||
      document.querySelector('[id="footer"]') ||
      document.querySelector("footer")
    );
  }

  /** 0.2.13: place business notice BESIDE footer brand/logo (H3 "3D Store"), same row. */
  function placeBusinessBesideShopName(settings) {
    // Remove awkward outside-footer sibling from older versions
    var legacy = document.getElementById(BUSINESS_ID);
    if (legacy && legacy.parentNode) {
      var foot0 = findFooterEl();
      if (!foot0 || !foot0.contains(legacy)) {
        try {
          legacy.parentNode.removeChild(legacy);
        } catch (e) {}
      }
    }
    var mount = document.getElementById(MOUNT_ID);
    if (mount) {
      try {
        mount.innerHTML = "";
        mount.classList.add("hidden");
      } catch (eM) {}
    }

    if (!settings || !coerceBool(settings.business_info_enabled, false)) {
      clearBusinessInfo();
      return;
    }

    var sig = businessSignature(settings);
    if (!sig) {
      sig =
        "사업자 고지: 이커머스 기본정보(basic_info)가 비어 있습니다. 관리자 > 이커머스 > 환경설정에서 상호·사업자등록번호를 저장하세요.";
    }

    var footer = findFooterEl();
    if (!footer) return;

    // Find brand: logo img near site name, else first H3 (official Footer siteName)
    var brand =
      footer.querySelector("img[src*='logo'], img[alt*='logo'], img[alt*='Logo']") ||
      footer.querySelector("h3");
    // Prefer H3 text brand ("3D Store") when present — user asked 로고 옆
    var h3 = footer.querySelector("h3");
    var anchor = h3 || brand;
    if (!anchor || !anchor.parentElement) return;

    var existing = document.getElementById(INLINE_BUSINESS_ID);
    if (existing) {
      if ((existing.getAttribute("data-chd-sig") || "") === sig && existing.parentElement === anchor.parentElement) {
        lastBusinessSig = sig;
        businessInjectedOnce = true;
        return;
      }
      try {
        if (existing.parentNode) existing.parentNode.removeChild(existing);
      } catch (eR) {}
    }

    // Ensure brand row is flex so notice sits BESIDE H3/logo
    var row = anchor.parentElement.querySelector(":scope > .chd-brand-row");
    if (!row) {
      row = document.createElement("div");
      row.className =
        "chd-brand-row flex flex-wrap items-center gap-x-3 gap-y-1";
      row.setAttribute("data-chd-role", "brand-row");
      try {
        anchor.parentElement.insertBefore(row, anchor);
        row.appendChild(anchor);
      } catch (eWrap) {
        // If React owns the node move, fall back to sibling insert
        try {
          if (row.parentNode) row.parentNode.removeChild(row);
        } catch (eX) {}
        row = null;
      }
    } else if (anchor.parentElement !== row) {
      try {
        row.appendChild(anchor);
      } catch (eMove) {}
    }

    var span = document.createElement("span");
    span.id = INLINE_BUSINESS_ID;
    span.setAttribute("data-chd-role", "business-info");
    span.setAttribute("data-chd-sig", sig);
    span.className =
      "chd-business-beside text-xs leading-snug text-gray-500 dark:text-gray-400";
    span.style.maxWidth = "42rem";
    span.textContent = sig;

    if (row) {
      row.appendChild(span);
    } else {
      // Fallback: inline immediately after H3
      try {
        anchor.style.display = "inline-block";
        anchor.style.marginRight = "0.75rem";
        span.style.display = "inline";
        if (anchor.nextSibling) {
          anchor.parentNode.insertBefore(span, anchor.nextSibling);
        } else {
          anchor.parentNode.appendChild(span);
        }
      } catch (eIns) {
        return;
      }
    }
    lastBusinessSig = sig;
    businessInjectedOnce = true;
  }

  function injectBusinessInfoOnce(settings) {
    try {
      placeBusinessBesideShopName(settings);
    } catch (e) {}
  }

  /* ========== Footer link icons (feat FooterIcon kinds) ========== */

  var FOOTER_ICON_BY_HREF = {
    "/": "home",
    "/boards/popular": "flame",
    "/boards": "layout",
    "/page/about": "building",
    "/faq": "help",
    "/page/faq": "help",
    "/board/inquiry": "message",
    "/page/contact": "message",
    "/page/terms": "file",
    "/page/privacy": "shield",
    "/page/refund": "refresh",
  };

  var FOOTER_ICON_BY_LABEL = {
    "홈": "home",
    "Home": "home",
    "인기": "flame",
    "Popular": "flame",
    "전체 게시판": "layout",
    "All Boards": "layout",
    "소개": "building",
    "About": "building",
    "FAQ": "help",
    "문의": "message",
    "Contact": "message",
    "이용약관": "file",
    "Terms": "file",
    "개인정보처리방침": "shield",
    "Privacy": "shield",
    "환불정책": "refresh",
    "Refund": "refresh",
  };

  function normalizePath(href) {
    var path = String(href || "").split("?")[0];
    path = path.replace(/\/$/, "") || "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    return path;
  }

  function footerIconSvg(kind) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("class", "w-3.5 h-3.5 shrink-0 opacity-70");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("data-chd-footer-icon", kind);
    var paths = {
      home: ["M3 10.5 12 3l9 7.5", "M5 10v10h14V10", "M10 20v-6h4v6"],
      flame: [
        "M12 3c2 3 1 5 1 7 0 1.5-1 2.5-1 2.5S10 11.5 10 10c0-2 1-4 2-7z",
        "M8.5 12.5C7 14 6.5 16 7.5 18A4.5 4.5 0 0 0 12 21a4.5 4.5 0 0 0 4.5-3c1-2 .5-4-1-5.5",
      ],
      layout: null,
      building: [
        "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16",
        "M15 10h4a1 1 0 0 1 1 1v10",
        "M8 8h2M8 12h2M8 16h2M4 21h16",
      ],
      help: ["M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2", "M12 17h.01"],
      message: ["M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"],
      file: ["M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M9 13h6M9 17h6"],
      shield: ["M12 3 5 6v6c0 5 3.5 8.5 7 9 3.5-.5 7-4 7-9V6l-7-3z"],
      refresh: ["M21 12a9 9 0 1 1-2.6-6.3", "M21 3v6h-6"],
    };
    if (kind === "layout") {
      [[3, 3], [14, 3], [3, 14], [14, 14]].forEach(function (xy) {
        var r = document.createElementNS(ns, "rect");
        r.setAttribute("x", String(xy[0]));
        r.setAttribute("y", String(xy[1]));
        r.setAttribute("width", "7");
        r.setAttribute("height", "7");
        r.setAttribute("rx", "1");
        svg.appendChild(r);
      });
      return svg;
    }
    if (kind === "help") {
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", "12");
      c.setAttribute("cy", "12");
      c.setAttribute("r", "9");
      svg.appendChild(c);
    }
    var arr = paths[kind] || [];
    arr.forEach(function (d) {
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    });
    return svg;
  }

  function iconKindForFooterLink(label, href, settings) {
    var path = normalizePath(href);
    if (FOOTER_ICON_BY_HREF[path]) return FOOTER_ICON_BY_HREF[path];
    // from settings linkGroups icon field
    try {
      var groups = settings && settings.footer_link_groups;
      if (Array.isArray(groups)) {
        for (var g = 0; g < groups.length; g++) {
          var links = (groups[g] && groups[g].links) || [];
          for (var i = 0; i < links.length; i++) {
            var L = links[i] || {};
            if (normalizePath(L.href) === path && L.icon) return String(L.icon);
            if (String(L.label || "").trim() === label && L.icon) return String(L.icon);
          }
        }
      }
    } catch (e) {}
    if (FOOTER_ICON_BY_LABEL[label]) return FOOTER_ICON_BY_LABEL[label];
    return null;
  }

  var FOOTER_EMOJI_BY_KIND = {
    home: "🏠",
    flame: "🔥",
    layout: "📋",
    building: "🏢",
    help: "❓",
    message: "💬",
    file: "📄",
    shield: "🛡️",
    refresh: "🔄",
  };

  function ensureFooterLinkIcons(settings) {
    var footer = findFooterEl();
    if (!footer) return;
    // Official Footer: <ul><li><button>{label}</button> — no href on button.
    var nodes = footer.querySelectorAll(
      "ul li button, ul li a, nav li button, nav li a, .chd-footer button, .chd-footer a"
    );
    nodes.forEach(function (btn) {
      if (!btn) return;
      if (btn.getAttribute("data-chd-footer-iconized") === "1") return;
      if (btn.querySelector && btn.querySelector("[data-chd-footer-icon]")) {
        btn.setAttribute("data-chd-footer-iconized", "1");
        return;
      }
      var label = (btn.textContent || "").trim();
      if (!label) return;
      // Skip if label already starts with emoji (Listener 0.2.13 default groups)
      var emojiKeys = Object.keys(FOOTER_EMOJI_BY_KIND);
      for (var ei = 0; ei < emojiKeys.length; ei++) {
        var em = FOOTER_EMOJI_BY_KIND[emojiKeys[ei]];
        if (em && label.indexOf(em) === 0) {
          btn.setAttribute("data-chd-footer-iconized", "1");
          return;
        }
      }
      var href = btn.getAttribute("href") || btn.getAttribute("data-href") || "";
      var kind = iconKindForFooterLink(label, href, settings);
      if (!kind && FOOTER_ICON_BY_LABEL[label]) kind = FOOTER_ICON_BY_LABEL[label];
      if (!kind) return;
      try {
        var emoji = FOOTER_EMOJI_BY_KIND[kind] || "•";
        // Prefer visible emoji text (survives better / always renders)
        var prefix = document.createElement("span");
        prefix.setAttribute("data-chd-footer-icon", kind);
        prefix.setAttribute("aria-hidden", "true");
        prefix.className = "chd-footer-emoji shrink-0";
        prefix.textContent = emoji + " ";
        if (btn.style && btn.classList && !btn.classList.contains("inline-flex")) {
          btn.classList.add("inline-flex", "items-center", "gap-1");
        }
        btn.insertBefore(prefix, btn.firstChild);
        btn.setAttribute("data-chd-footer-iconized", "1");
      } catch (e) {}
    });
  }

  /* ========== Board slug hide JS fallback ========== */

  function hideSlugList(settings) {
    // 0.2.13: settings array is the ONLY source of truth.
    // Never merge stale data-chd-hide-board-slugs from DOM — that caused
    // qna/inquiry to stay hidden on non-home pages after DB was cleared.
    var raw = settings && settings.hide_header_board_slugs;
    if (raw == null) raw = [];
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch (e) {
        raw = String(raw)
          .split(",")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
      }
    }
    if (!Array.isArray(raw)) return [];
    var out = [];
    raw.forEach(function (s) {
      s = String(s == null ? "" : s).trim();
      if (!s) return;
      s = s.replace(/^\/+boards?\//, "").replace(/^\/+|\/+$/g, "");
      if (s && out.indexOf(s) < 0) out.push(s);
      var low = s.toLowerCase();
      if (low && out.indexOf(low) < 0) out.push(low);
    });
    return out;
  }

  function clearHiddenBoardNav() {
    try {
      document.querySelectorAll("[data-chd-board-hidden='1']").forEach(function (el) {
        try {
          el.style.removeProperty("display");
          el.removeAttribute("data-chd-board-hidden");
        } catch (e) {}
      });
      document.querySelectorAll("[data-chd-hide-board-slugs]").forEach(function (el) {
        try {
          el.removeAttribute("data-chd-hide-board-slugs");
        } catch (e2) {}
      });
    } catch (e3) {}
  }

  function pathMatchesHiddenSlug(path, slugs) {
    path = normalizePath(path);
    for (var i = 0; i < slugs.length; i++) {
      var s = slugs[i];
      if (path === "/board/" + s || path === "/boards/" + s) return true;
      if (path.indexOf("/board/" + s) === 0 || path.indexOf("/boards/" + s) === 0) return true;
    }
    return false;
  }

  function ensureHiddenBoardNav(settings) {
    var slugs = hideSlugList(settings);
    if (!slugs.length) {
      clearHiddenBoardNav();
      return;
    }

    var roots = [];
    var dh =
      document.getElementById("desktop_header") ||
      document.querySelector("header.chd-desktop-header") ||
      document.querySelector("header.sticky");
    var mh = document.getElementById("mobile_header") || document.querySelector("[id*='mobile']");
    if (dh) roots.push(dh);
    if (mh) roots.push(mh);
    // 더보기 dropdown may portal near body
    document.querySelectorAll("header, [role='menu'], .absolute").forEach(function (n) {
      if (roots.indexOf(n) < 0) roots.push(n);
    });

    roots.forEach(function (root) {
      if (!root || !root.querySelectorAll) return;
      root.querySelectorAll("a[href]").forEach(function (a) {
        var href = a.getAttribute("href") || "";
        if (pathMatchesHiddenSlug(href, slugs)) {
          var li = a.closest("li") || a;
          try {
            li.style.setProperty("display", "none", "important");
            li.setAttribute("data-chd-board-hidden", "1");
          } catch (e) {}
        }
      });
      // Official Header uses <button> without href — match text via board-menu names cache
      root.querySelectorAll("button").forEach(function (btn) {
        if (btn.getAttribute("data-chd-board-hidden") === "1") return;
        var label = (btn.textContent || "").trim();
        if (!label) return;
        // slug-as-label (rare) or cached name map
        if (slugs.indexOf(label) >= 0 || slugs.indexOf(label.toLowerCase()) >= 0) {
          try {
            btn.style.setProperty("display", "none", "important");
            btn.setAttribute("data-chd-board-hidden", "1");
          } catch (e2) {}
          return;
        }
        var map = window.__chdBoardNameToSlug || {};
        var slug = map[label];
        if (slug && slugs.indexOf(slug) >= 0) {
          try {
            btn.style.setProperty("display", "none", "important");
            btn.setAttribute("data-chd-board-hidden", "1");
            var wrap = btn.closest("li") || btn.parentElement;
            if (wrap && wrap !== btn) {
              wrap.style.setProperty("display", "none", "important");
            }
          } catch (e3) {}
        }
      });
    });
  }

  function refreshBoardNameMap(settings) {
    var slugs = hideSlugList(settings);
    if (!slugs.length) return;
    if (window.__chdBoardNameMapFetched) {
      ensureHiddenBoardNav(settings);
      return;
    }
    window.__chdBoardNameMapFetched = true;
    try {
      fetch("/api/modules/sirsoft-board/boards/board-menu", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (body) {
          var list =
            (body && (body.data || body.boards || body)) || [];
          if (list && list.data) list = list.data;
          if (!Array.isArray(list)) return;
          var map = {};
          list.forEach(function (b) {
            if (!b) return;
            var slug = String(b.slug || b.bo_table || "").trim();
            var name = String(b.name || "").trim();
            if (slug && name) map[name] = slug;
          });
          window.__chdBoardNameToSlug = map;
          ensureHiddenBoardNav(lastSettings || settings);
        })
        .catch(function () {});
    } catch (e) {}
  }

  /* ========== Theme click toggle (feat ThemeToggle) ========== */

  function getEffectiveTheme(mode) {
    if (mode === "auto") {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } catch (e) {
        return "light";
      }
    }
    return mode === "dark" ? "dark" : "light";
  }

  function applyThemeMode(mode) {
    var effective = getEffectiveTheme(mode);
    try {
      document.documentElement.setAttribute("data-theme", effective);
      if (effective === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {}
  }

  function readStoredTheme() {
    try {
      var saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === "auto" || saved === "light" || saved === "dark")) {
        return saved;
      }
    } catch (e) {}
    return "auto";
  }

  function toggleThemeImmediate() {
    var current = getEffectiveTheme(readStoredTheme());
    var next = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {}
    applyThemeMode(next);
    // Prefer theme handler if present (same mechanism as theme).
    try {
      if (window.G7Core && typeof window.G7Core.dispatch === "function") {
        window.G7Core.dispatch({ handler: "setTheme", target: next });
      }
    } catch (e2) {}
  }

  function bindThemeClickToggle() {
    if (themeClickBound) return;
    themeClickBound = true;
    document.addEventListener(
      "click",
      function (e) {
        if (!settingOn(lastSettings, "header_theme_click_toggle", true)) return;
        var t = e.target;
        if (!t || !t.closest) return;
        var btn = t.closest('[aria-label="Toggle theme"]');
        if (!btn) return;
        // Only intercept header theme buttons (desktop + mobile).
        if (
          !btn.closest("#desktop_header") &&
          !btn.closest("#mobile_header") &&
          !btn.closest("#mobile_theme_btn") &&
          !btn.closest("header.sticky") &&
          !btn.closest("header.chd-desktop-header") &&
          !btn.closest("[data-chd-role='theme-host']")
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
        toggleThemeImmediate();
      },
      true
    );
  }

  /* ========== Search icon + slide panel ========== */

  function searchGlyphSvg(size) {
    size = size || 20;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="16.65" y1="16.65" x2="21" y2="21"></line></svg>'
    );
  }

  function setSearchOpen(open) {
    searchOpen = !!open;
    var panel = document.getElementById(PANEL_ID);
    var desk = document.getElementById(DESKTOP_TOGGLE_ID);
    var mob = document.getElementById(MOBILE_TOGGLE_ID);
    if (panel) {
      if (searchOpen) panel.classList.add("chd-search-open");
      else panel.classList.remove("chd-search-open");
      panel.setAttribute("aria-hidden", searchOpen ? "false" : "true");
      // Feat uses hidden + inline maxHeight so cached CSS cannot keep it collapsed
      try {
        panel.hidden = false; // keep in layout for transition; visibility via class/maxHeight
        panel.style.maxHeight = searchOpen ? "160px" : "0px";
        panel.style.opacity = searchOpen ? "1" : "0";
        panel.style.pointerEvents = searchOpen ? "auto" : "none";
        panel.style.visibility = searchOpen ? "visible" : "hidden";
        panel.style.display = searchOpen ? "block" : "";
      } catch (e0) {
        panel.hidden = !searchOpen;
      }
    }
    [desk, mob].forEach(function (btn) {
      if (!btn) return;
      btn.setAttribute("aria-expanded", searchOpen ? "true" : "false");
      if (searchOpen) btn.classList.add("chd-search-active");
      else btn.classList.remove("chd-search-active");
    });
    if (searchOpen && panel) {
      var form = panel.querySelector("form");
      if (form) {
        try {
          form.style.setProperty("display", "block", "important");
          form.style.setProperty("visibility", "visible", "important");
          form.style.setProperty("opacity", "1", "important");
        } catch (eF) {}
      }
      var input = panel.querySelector("input[type='search'], input[type='text'], input");
      if (input) {
        try {
          input.style.setProperty("display", "block", "important");
          input.style.setProperty("visibility", "visible", "important");
          input.style.setProperty("opacity", "1", "important");
          input.style.setProperty("width", "100%", "important");
          input.focus();
        } catch (e) {}
      }
    }
  }

  function toggleSearch() {
    setSearchOpen(!searchOpen);
  }

  function navigateSearch(q) {
    var query = String(q || "").trim();
    if (!query) return;
    setSearchOpen(false);
    var path = "/search?q=" + encodeURIComponent(query);
    try {
      if (window.G7Core && typeof window.G7Core.dispatch === "function") {
        window.G7Core.dispatch({
          handler: "navigate",
          params: { path: "/search", query: { q: query } },
        });
        return;
      }
    } catch (e) {}
    try {
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
    } catch (e2) {}
    window.location.href = path;
  }

  function buildSearchButton(id) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = id;
    btn.setAttribute("data-chd-role", "header-search-toggle");
    btn.setAttribute("data-header-search-toggle", "true");
    btn.setAttribute("aria-label", "검색");
    btn.setAttribute("title", "검색");
    btn.setAttribute("aria-controls", PANEL_ID);
    btn.setAttribute("aria-expanded", "false");
    btn.className =
      "chd-header-search-btn inline-flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800";
    btn.style.minWidth = "40px";
    btn.style.minHeight = "40px";
    btn.innerHTML = searchGlyphSvg(20);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSearch();
    });
    return btn;
  }

  function buildSearchPanel() {
    var panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.setAttribute("data-chd-role", "header-search-panel");
    panel.setAttribute("aria-hidden", "true");
    panel.hidden = true;
    panel.innerHTML =
      '<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3" style="max-width:var(--chd-content-max-width,1240px)">' +
      '<form class="w-full chd-search-form" action="/search" method="get">' +
      '<div class="relative flex items-center">' +
      '<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">' +
      searchGlyphSvg(16) +
      "</span>" +
      '<input type="search" name="q" autocomplete="off" placeholder="검색어를 입력하세요" ' +
      'class="w-full px-4 py-2.5 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />' +
      '<button type="button" class="chd-search-close absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg cursor-pointer" aria-label="닫기">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      "</button></div></form></div>";

    var form = panel.querySelector("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input");
        navigateSearch(input && input.value);
      });
    }
    var closeBtn = panel.querySelector(".chd-search-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setSearchOpen(false);
      });
    }
    return panel;
  }

  function findDesktopHeader() {
    return (
      document.getElementById("desktop_header") ||
      document.querySelector("header.chd-desktop-header") ||
      document.querySelector("header.sticky.top-0.z-50") ||
      document.querySelector("header.sticky.top-0") ||
      document.querySelector("header.sticky")
    );
  }

  function findDesktopRightCluster() {
    var header = findDesktopHeader();
    if (!header) return null;
    // Official: .flex.items-center.justify-between.h-16 > last .flex.items-center (gap-2)
    var row =
      header.querySelector(".flex.items-center.justify-between.h-16") ||
      header.querySelector(".flex.items-center.justify-between");
    if (!row) return null;
    var clusters = row.querySelectorAll(":scope > .flex.items-center");
    if (clusters && clusters.length) {
      return clusters[clusters.length - 1];
    }
    // Fallback: last direct flex child that is not a form
    var kids = row.children;
    for (var i = kids.length - 1; i >= 0; i--) {
      var el = kids[i];
      if (el.tagName === "FORM") continue;
      if (el.classList && el.classList.contains("flex")) return el;
    }
    return null;
  }

  function findCartAnchor(cluster) {
    if (!cluster) return null;
    var selectors = [
      'a[href*="/cart"]',
      'button[aria-label*="장바구니"]',
      'button[aria-label*="cart" i]',
      'a[aria-label*="장바구니"]',
      'a[aria-label*="cart" i]',
      "#mobile_cart_btn",
    ];
    for (var i = 0; i < selectors.length; i++) {
      try {
        var el = cluster.querySelector(selectors[i]);
        if (el) return el;
      } catch (e) {}
    }
    // Heuristic: button/a containing shopping-cart icon class or svg near relative badge
    var buttons = cluster.querySelectorAll("button, a");
    for (var j = 0; j < buttons.length; j++) {
      var b = buttons[j];
      var cls = (b.className && String(b.className)) || "";
      var html = b.innerHTML || "";
      if (
        cls.indexOf("relative") !== -1 &&
        (html.indexOf("shopping") !== -1 ||
          html.indexOf("cart") !== -1 ||
          html.indexOf("shopping-cart") !== -1 ||
          b.querySelector(
            '[class*="shopping"], [data-icon*="cart"], .fa-shopping-cart, i.fa-shopping-cart, [class*="shopping-cart"]'
          ))
      ) {
        return b;
      }
      // Official Icon name="shopping-cart" often renders as <i class="..."> without href
      if (b.querySelector && b.querySelector(".fa-shopping-cart, [data-icon='shopping-cart']")) {
        return b;
      }
    }
    return null;
  }

  function findThemeHost(cluster) {
    if (!cluster) return null;
    var btn = cluster.querySelector('[aria-label="Toggle theme"]');
    if (!btn) return null;
    // Official ThemeToggle wraps button in .relative
    var wrap = btn.closest(".relative");
    if (wrap && cluster.contains(wrap)) return wrap;
    return btn;
  }

  /** 0.2.9: search BEFORE dark-mode (swap vs previous Theme→Search order). */
  function insertSearchBeforeTheme(cluster, node) {
    if (!cluster || !node) return;
    var themeHost = findThemeHost(cluster);
    if (themeHost && themeHost.parentNode) {
      themeHost.parentNode.insertBefore(node, themeHost);
      return;
    }
    // Fallback: before cart (previous behavior)
    var cart = findCartAnchor(cluster);
    if (cart && cart.parentNode) {
      cart.parentNode.insertBefore(node, cart);
      return;
    }
    cluster.appendChild(node);
  }

  function insertBeforeCartOrAppend(cluster, node) {
    if (!cluster || !node) return;
    if (document.getElementById(node.id)) return;
    var cart = findCartAnchor(cluster);
    if (cart && cart.parentNode === cluster) {
      cluster.insertBefore(node, cart);
      return;
    }
    if (cart && cart.parentNode) {
      cart.parentNode.insertBefore(node, cart);
      return;
    }
    cluster.appendChild(node);
  }


  var ALWAYS_SEARCH_ID = "chd_header_search_always";
  var MOBILE_ALWAYS_SEARCH_ID = "chd_mobile_search_always";

  function originalSearchFormSelectors() {
    return [
      "#desktop_header .flex.items-center.justify-between.h-16 > form",
      "header.sticky .flex.items-center.justify-between.h-16 > form",
      "header.chd-desktop-header .flex.items-center.justify-between.h-16 > form",
      "header.sticky form.flex.flex-1.max-w-lg.mx-8",
    ];
  }

  function findOriginalSearchForm() {
    var sels = originalSearchFormSelectors();
    for (var i = 0; i < sels.length; i++) {
      try {
        var el = document.querySelector(sels[i]);
        if (el && el.id !== ALWAYS_SEARCH_ID && el.id !== PANEL_ID) return el;
      } catch (e) {}
    }
    return null;
  }

  function removeSearchIconWidgets() {
    [DESKTOP_TOGGLE_ID, MOBILE_TOGGLE_ID, PANEL_ID].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) {
        try {
          el.parentNode.removeChild(el);
        } catch (e) {}
      }
    });
    searchOpen = false;
  }

  function clearBootSearchHideCss() {
    try {
      var st = document.getElementById("chd-home-design-boot-style");
      if (!st || !st.textContent) return;
      // Drop form{display:none} rules left from icon-mode boot CSS
      st.textContent = st.textContent.replace(
        /header\.sticky[^\{]*form\{display:none!important;\}/gi,
        ""
      ).replace(
        /header\.chd-desktop-header[^\{]*form\{display:none!important;\}/gi,
        ""
      );
    } catch (e) {}
  }

  function buildAlwaysVisibleSearchForm(id, extraClass) {
    var form = document.createElement("form");
    form.id = id;
    form.setAttribute("data-chd-role", "header-search-always");
    form.setAttribute("action", "/search");
    form.setAttribute("method", "get");
    form.className =
      (extraClass || "flex flex-1 max-w-lg mx-8") +
      " chd-search-form items-center";
    form.innerHTML =
      '<div class="relative flex items-center w-full">' +
      '<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">' +
      searchGlyphSvg(16) +
      "</span>" +
      '<input type="search" name="q" autocomplete="off" placeholder="검색어를 입력하세요" ' +
      'class="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />' +
      "</div>";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input");
      navigateSearch(input && input.value);
    });
    return form;
  }

  function ensureAlwaysVisibleSearch() {
    if (settingOn(lastSettings, "header_search_icon_mode", true)) {
      [ALWAYS_SEARCH_ID, MOBILE_ALWAYS_SEARCH_ID].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) {
          try {
            el.parentNode.removeChild(el);
          } catch (e) {}
        }
      });
      return;
    }
    removeSearchIconWidgets();
    clearBootSearchHideCss();

    var original = findOriginalSearchForm();
    if (original) {
      try {
        original.style.removeProperty("display");
        original.style.setProperty("display", "flex", "important");
        original.style.setProperty("visibility", "visible", "important");
        original.style.setProperty("opacity", "1", "important");
        var inp = original.querySelector("input");
        if (inp) {
          inp.style.setProperty("display", "block", "important");
          inp.style.setProperty("visibility", "visible", "important");
          inp.style.setProperty("opacity", "1", "important");
        }
      } catch (eShow) {}
      var fallback = document.getElementById(ALWAYS_SEARCH_ID);
      if (fallback && fallback.parentNode) {
        try {
          fallback.parentNode.removeChild(fallback);
        } catch (eRm) {}
      }
      return;
    }

    // Official center form missing — inject always-visible desktop search
    if (!document.getElementById(ALWAYS_SEARCH_ID)) {
      var header = findDesktopHeader();
      var row =
        header &&
        (header.querySelector(".flex.items-center.justify-between.h-16") ||
          header.querySelector(".flex.items-center.justify-between"));
      if (row) {
        var form = buildAlwaysVisibleSearchForm(ALWAYS_SEARCH_ID, "flex flex-1 max-w-lg mx-4 sm:mx-8");
        var clusters = row.querySelectorAll(":scope > .flex.items-center");
        if (clusters && clusters.length >= 2) {
          row.insertBefore(form, clusters[1]);
        } else if (clusters && clusters.length === 1) {
          row.appendChild(form);
        } else {
          row.appendChild(form);
        }
      }
    }

    // Mobile: always-visible compact field before right cluster if none exists
    if (!document.getElementById(MOBILE_ALWAYS_SEARCH_ID)) {
      var mob =
        document.getElementById("mobile_header") ||
        document.querySelector("#mobile_header .flex.items-center");
      var mobRow =
        document.querySelector("#mobile_header .flex.items-center.justify-between") ||
        document.querySelector("#mobile_header .flex.items-center");
      if (mobRow) {
        var mform = buildAlwaysVisibleSearchForm(
          MOBILE_ALWAYS_SEARCH_ID,
          "flex flex-1 min-w-0 mx-2 max-w-[50%]"
        );
        var right =
          document.getElementById("mobile_header_right") ||
          mobRow.querySelector(":scope > .flex.items-center:last-child");
        if (right && right.parentNode === mobRow) {
          mobRow.insertBefore(mform, right);
        } else {
          mobRow.appendChild(mform);
        }
      }
    }
  }


  function setSearchIconReady(ready) {
    try {
      document.documentElement.classList.toggle("chd-search-icon-ready", !!ready);
    } catch (e) {}
    try {
      document.body && document.body.classList.toggle("chd-search-icon-ready", !!ready);
    } catch (e2) {}
  }

  function hideOriginalSearchFormsAfterIconMount() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) {
      setSearchIconReady(false);
      return;
    }
    var desk = document.getElementById(DESKTOP_TOGGLE_ID);
    var mob = document.getElementById(MOBILE_TOGGLE_ID);
    var mounted = (desk && document.body.contains(desk)) || (mob && document.body.contains(mob));
    setSearchIconReady(!!mounted);
    if (!mounted) return;
    [desk, mob].forEach(function (btn) {
      if (!btn) return;
      try {
        btn.style.setProperty("display", "inline-flex", "important");
        btn.style.setProperty("visibility", "visible", "important");
        btn.style.setProperty("opacity", "1", "important");
      } catch (e) {}
    });
  }

  function ensureDesktopSearchToggle() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) return;
    var cluster = findDesktopRightCluster();
    if (!cluster) return;
    var existing = document.getElementById(DESKTOP_TOGGLE_ID);
    if (existing && !cluster.contains(existing) && !(existing.parentNode && document.body.contains(existing))) {
      try {
        existing.parentNode && existing.parentNode.removeChild(existing);
      } catch (eDet) {}
      existing = null;
    }
    if (existing) {
      // Reposition if theme is currently before search (swap to search-first)
      var themeHost = findThemeHost(cluster);
      if (themeHost && existing.parentNode && themeHost.parentNode === existing.parentNode) {
        var pos = existing.compareDocumentPosition(themeHost);
        // If theme precedes search, move search before theme
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
          themeHost.parentNode.insertBefore(existing, themeHost);
        }
      }
      try {
        existing.style.setProperty("display", "inline-flex", "important");
        existing.style.setProperty("visibility", "visible", "important");
      } catch (eVis) {}
      return;
    }
    insertSearchBeforeTheme(cluster, buildSearchButton(DESKTOP_TOGGLE_ID));
  }

  function ensureMobileSearchToggle() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) return;
    if (document.getElementById(MOBILE_TOGGLE_ID)) return;
    var cluster =
      document.getElementById("mobile_header_right") ||
      document.querySelector("#mobile_header .flex.items-center");
    if (!cluster) return;
    var btn = buildSearchButton(MOBILE_TOGGLE_ID);
    var cart = document.getElementById("mobile_cart_btn");
    if (cart && cart.parentNode === cluster) {
      cluster.insertBefore(btn, cart);
    } else {
      insertBeforeCartOrAppend(cluster, btn);
    }
  }

  function ensureSearchPanel() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) return;
    var existing = document.getElementById(PANEL_ID);
    var panel = existing || buildSearchPanel();
    // Feat Header order: top bar → search panel → nav (home menu).
    // MUST be BEFORE nav so it opens below sticky bar / above home menu — not under nav.
    var desktop = findDesktopHeader();
    if (desktop) {
      var nav = desktop.querySelector(":scope > nav, nav.border-t, nav");
      if (nav && nav.parentNode === desktop) {
        if (panel.parentNode !== desktop || panel.nextSibling !== nav) {
          desktop.insertBefore(panel, nav);
        }
        return;
      }
      // No nav (or hide_desktop_top_nav): place after first content row (logo/actions bar)
      var first = desktop.firstElementChild;
      if (first) {
        if (panel.parentNode !== desktop || first.nextSibling !== panel) {
          if (first.nextSibling) desktop.insertBefore(panel, first.nextSibling);
          else desktop.appendChild(panel);
        }
        return;
      }
      if (!panel.parentNode) desktop.appendChild(panel);
      return;
    }
    if (existing) return;
    var mobile = document.getElementById("mobile_header");
    if (mobile && mobile.parentNode) {
      if (mobile.nextSibling) mobile.parentNode.insertBefore(panel, mobile.nextSibling);
      else mobile.parentNode.appendChild(panel);
      return;
    }
    var root = document.getElementById("user_layout_root") || document.body;
    if (root) root.insertBefore(panel, root.firstChild);
  }

  function bindOutsideSearchClose() {
    if (outsideClickBound) return;
    outsideClickBound = true;
    document.addEventListener(
      "click",
      function (e) {
        if (!searchOpen) return;
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest("#" + PANEL_ID)) return;
        if (t.closest("[data-header-search-toggle='true']")) return;
        if (t.closest("#" + DESKTOP_TOGGLE_ID) || t.closest("#" + MOBILE_TOGGLE_ID))
          return;
        setSearchOpen(false);
      },
      false
    );
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && searchOpen) setSearchOpen(false);
    });
  }

  var shopScroll = {
    page: 1,
    hasMore: true,
    loading: false,
    key: "",
    observer: null,
    observed: null,
  };

  function isProductDetailPath(path) {
    path = normalizePath(path);
    var base = normalizePath(shopBasePath());
    var prefix = base === '/' ? '/products/' : base + '/products/';
    return path.indexOf(prefix) === 0 && path !== prefix.slice(0, -1);
  }
  function stopShopListRuntime() {
    shopScroll.hasMore = false;shopScroll.loading = false;
    if (shopScroll.observer) {try {shopScroll.observer.disconnect();} catch (eStop) {}shopScroll.observer = null;}
    shopScroll.observed = null;
    try {document.documentElement.classList.remove('chd-shop-quiet-nav');} catch (eCls) {}
    try {document.body && document.body.classList.remove('chd-shop-quiet-nav');} catch (eBody) {}
  }
  function isShopProductsListPath(path) {
    path = normalizePath(path);
    var base = normalizePath(shopBasePath());
    if (base === "/") return path === "/products";
    return path === base + "/products";
  }

  function shopListQuery() {
    var params = new URLSearchParams((window.location && window.location.search) || "");
    return {
      list: params.get("list") || "",
      category: params.get("category") || "",
      sort: params.get("sort") || "latest",
      keyword: params.get("keyword") || "",
    };
  }

  function isShopAllCategoryPage() {
    var q = shopListQuery();
    return !q.list && !q.category;
  }

  function shopScrollKey() {
    var q = shopListQuery();
    return [normalizePath(window.location && window.location.pathname), q.list, q.category, q.sort, q.keyword].join("|");
  }

  function shopProductsQuery(page) {
    var q = shopListQuery();
    var sort = q.sort || "latest";
    var category = q.category;
    if (q.list === "popular") {
      sort = "sales";
      category = "";
    } else if (q.list === "new" || q.list === "all") {
      sort = "latest";
      category = "";
    }
    return {
      page: String(page),
      per_page: "20",
      category_id: category,
      sort: sort,
      search: q.keyword,
    };
  }

  function extractProductPage(payload) {
    var body = payload && payload.data !== undefined ? payload.data : payload;
    var items = [];
    var pagination = {};
    if (body && Array.isArray(body.data)) items = body.data;
    else if (body && body.data && Array.isArray(body.data.data)) items = body.data.data;
    else if (Array.isArray(body)) items = body;
    if (body && body.pagination && typeof body.pagination === "object") pagination = body.pagination;
    else if (body && body.data && body.data.pagination && typeof body.data.pagination === "object") {
      pagination = body.data.pagination;
    } else if (payload && payload.meta && typeof payload.meta === "object") {
      pagination = payload.meta;
    }
    return { items: items, pagination: pagination };
  }

  function appendShopProducts(items) {
    if (!items || !items.length) return;
    try {
      if (window.G7Core && typeof window.G7Core.dispatch === "function") {
        window.G7Core.dispatch({
          handler: "appendDataSource",
          params: {
            dataSourceId: "products",
            dataPath: "data.data",
            newData: items,
          },
        });
      }
    } catch (e) {}
  }

  function fetchShopProducts(query) {
    var G7Core = window.G7Core || {};
    if (G7Core.api && typeof G7Core.api.get === "function") {
      return Promise.resolve(G7Core.api.get("/api/modules/sirsoft-ecommerce/products", { params: query }));
    }
    var headers = { Accept: "application/json" };
    try {
      var token =
        (G7Core.state && G7Core.state.get && G7Core.state.get("_global.token")) ||
        (window.localStorage && (localStorage.getItem("token") || localStorage.getItem("auth_token")));
      if (token) headers.Authorization = "Bearer " + token;
    } catch (eTok) {}
    var usp = new URLSearchParams();
    Object.keys(query).forEach(function (k) {
      if (query[k] !== undefined && query[k] !== null && query[k] !== "") usp.set(k, query[k]);
    });
    return fetch("/api/modules/sirsoft-ecommerce/products?" + usp.toString(), {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
    }).then(function (r) {
      if (!r.ok) throw new Error("products " + r.status);
      return r.json();
    });
  }

  function loadMoreShopProducts() {
    if (!isShopProductsListPath(window.location && window.location.pathname)) return;
    var q = shopListQuery();
    if (q.list === "recent" || isShopAllCategoryPage()) return;
    if (shopScroll.loading || !shopScroll.hasMore) return;
    shopScroll.loading = true;
    var next = shopScroll.page + 1;
    fetchShopProducts(shopProductsQuery(next))
      .then(function (payload) {
        var page = extractProductPage(payload);
        appendShopProducts(page.items);
        shopScroll.page = next;
        shopScroll.hasMore = page.pagination.has_more_pages === true || page.items.length >= 20;
        if (!page.items.length) shopScroll.hasMore = false;
      })
      .catch(function () {
        shopScroll.hasMore = false;
      })
      .then(function () {
        shopScroll.loading = false;
      });
  }

  function bindShopInfiniteScroll() {
    if (isProductDetailPath(window.location && window.location.pathname)) { stopShopListRuntime(); return; }
    var key = shopScrollKey();
    if (shopScroll.key !== key) {
      shopScroll.key = key;
      shopScroll.page = 1;
      shopScroll.hasMore = shopListQuery().list !== "recent" && !isShopAllCategoryPage();
      shopScroll.loading = false;
    }
    if (!isShopProductsListPath(window.location && window.location.pathname) || shopListQuery().list === "recent" || isShopAllCategoryPage()) {
      if (shopScroll.observer && shopScroll.observed) {
        try {
          shopScroll.observer.unobserve(shopScroll.observed);
        } catch (eUn) {}
      }
      shopScroll.observed = null;
      return;
    }
    var el =
      document.getElementById("chd_shop_scroll_sentinel") ||
      document.querySelector("[data-chd-shop-sentinel='1']");
    if (!el || typeof IntersectionObserver !== "function") return;
    if (shopScroll.observed === el && shopScroll.observer) return;
    if (shopScroll.observer) {
      try {
        shopScroll.observer.disconnect();
      } catch (eDisc) {}
    }
    shopScroll.observer = new IntersectionObserver(
      function (entries) {
        if (!entries || !entries.length || !entries[0].isIntersecting) return;
        loadMoreShopProducts();
      },
      { root: null, rootMargin: "80px 0px", threshold: 0 }
    );
    shopScroll.observer.observe(el);
    shopScroll.observed = el;
  }

  function applyShopSortBarTransparent() {
    var nodes = [];
    try {
      var marked = document.getElementById("chd_shop_sort_bar");
      if (marked) return;
      nodes = document.querySelectorAll(".chd-shop-sort-bar");
    } catch (e) {
      nodes = [];
    }
    if (!nodes.length) {
      try {
        var rows = document.querySelectorAll("#main_content .flex.items-center.justify-between");
        for (var r = 0; r < rows.length; r++) {
          var text = String(rows[r].textContent || "");
          if (/총\s*\d+|total/i.test(text) && rows[r].querySelector("select, [role='combobox'], button")) {
            nodes = [rows[r]];
            break;
          }
        }
      } catch (e2) {}
    }
    for (var i = 0; i < nodes.length; i++) {
      try {
        nodes[i].style.setProperty("background", "transparent", "important");
        nodes[i].style.setProperty("background-color", "transparent", "important");
        nodes[i].style.setProperty("background-image", "none", "important");
        nodes[i].style.setProperty("box-shadow", "none", "important");
      } catch (err) {}
    }
  }

  function shopProductGridColumns() {
    var w = window.innerWidth || 0;
    if (w >= 640) return 6;
    return 3;
  }

  function applyShopRowSize(row, cols) {
    if (!row || !row.style) return;
    row.style.setProperty("display", "grid", "important");
    row.style.setProperty("grid-template-columns", "repeat(" + cols + ", minmax(0, 1fr))", "important");
    row.style.setProperty("grid-auto-flow", "row", "important");
    row.style.setProperty("grid-auto-columns", "unset", "important");
    row.style.setProperty("overflow", "visible", "important");
    row.style.setProperty("overflow-x", "visible", "important");
    row.style.setProperty("gap", "0.5rem", "important");
    row.setAttribute("data-chd-cols", String(cols));
    var kids = row.children || [];
    for (var k = 0; k < kids.length; k++) {
      if (!kids[k] || !kids[k].style) continue;
      kids[k].style.setProperty("width", "100%", "important");
      kids[k].style.setProperty("min-width", "0", "important");
      kids[k].style.setProperty("max-width", "none", "important");
      kids[k].style.setProperty("flex", "none", "important");
    }
  }

  function applyShopProductCardMarks() {
    if (!isShopProductsListPath(window.location && window.location.pathname)) return;
    var cols = shopProductGridColumns();
    try {
      var grids = document.querySelectorAll("#main_content .grid");
      for (var g = 0; g < grids.length; g++) {
        var gcls = String(grids[g].className || "");
        if (gcls.indexOf("grid-cols-2") === -1) continue;
        grids[g].classList.add("chd-shop-product-grid");
        applyShopRowSize(grids[g], cols);
      }
    } catch (eGrid) {}
    try {
      var thumbs = document.querySelectorAll("#main_content .aspect-square");
      var seen = [];
      for (var t = 0; t < thumbs.length; t++) {
        if (thumbs[t].getAttribute("data-chd-thumb") === String(cols)) continue;
        thumbs[t].setAttribute("data-chd-thumb", String(cols));
        thumbs[t].style.setProperty("aspect-ratio", "81/100", "important");
        thumbs[t].style.setProperty("height", "auto", "important");
        thumbs[t].style.setProperty("border-radius", "6px", "important");
        var host =
          thumbs[t].closest(".chd-product-card, button, a, [class*='rounded-lg']") ||
          thumbs[t].parentElement;
        if (host) host.classList.add("chd-product-card");
        var badge = thumbs[t].querySelector(".absolute.top-2.left-2, .bg-red-500");
        if (badge) {
          badge.style.setProperty("top", "4px", "important");
          badge.style.setProperty("left", "4px", "important");
          badge.style.setProperty("font-size", "10px", "important");
          badge.style.setProperty("line-height", "1.15", "important");
          badge.style.setProperty("padding", "1px 4px", "important");
        }
        var row = host && host.parentElement;
        while (row && row.id !== "main_content") {
          var rcls = String(row.className || "");
          if (rcls.indexOf("chd-shop-product-grid") !== -1) {
            row = null;
            break;
          }
          var thumbKids = 0;
          for (var c = 0; c < row.children.length; c++) {
            if (row.children[c].querySelector && row.children[c].querySelector(".aspect-square")) {
              thumbKids += 1;
            }
          }
          if (thumbKids >= 2 || rcls.indexOf("chd-shop-carousel-row") !== -1) break;
          row = row.parentElement;
        }
        if (!row || row.id === "main_content" || seen.indexOf(row) !== -1) continue;
        if (String(row.className || "").indexOf("chd-shop-product-grid") !== -1) continue;
        seen.push(row);
        if (row.getAttribute("data-chd-cols") === String(cols)) continue;
        row.classList.add("chd-shop-carousel-row");
        applyShopRowSize(row, cols);
      }
    } catch (eThumb) {}
    try {
      var marked = document.querySelectorAll(
        "#main_content .chd-shop-carousel-row, #main_content [id*='products-scroll']"
      );
      for (var m = 0; m < marked.length; m++) {
        var target = marked[m];
        if (!target.querySelector(".aspect-square") && target.children.length) {
          var inner = target.querySelector(".flex, .grid, [class*='overflow']");
          if (inner && inner.querySelector(".aspect-square")) target = inner;
        }
        if (!target.querySelector(".aspect-square")) continue;
        if (target.getAttribute("data-chd-cols") === String(cols)) continue;
        target.classList.add("chd-shop-carousel-row");
        applyShopRowSize(target, cols);
      }
    } catch (eCar) {}
  }

  var shopThumbResizeBound = false;
  function bindShopThumbResize() {
    if (shopThumbResizeBound) return;
    shopThumbResizeBound = true;
    window.addEventListener("resize", function () {
      applyShopProductCardMarks();
    });
  }

  function syncShopQuietNav() {
    var path = window.location && window.location.pathname;
    if (isProductDetailPath(path) || !isShopProductsListPath(path)) { stopShopListRuntime(); return; }
    var on = true;
    try {
      document.documentElement.classList.toggle("chd-shop-quiet-nav", on);
    } catch (e) {}
    try {
      document.body && document.body.classList.toggle("chd-shop-quiet-nav", on);
    } catch (e2) {}
  }

  var shopQuietNavBound = false;
  function bindShopQuietNavClicks() {
    if (shopQuietNavBound) return;
    shopQuietNavBound = true;
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest("#cdp_share_list, [id*='cdp_share'], .chd-product-card, a[href*='/products/']")) { stopShopListRuntime(); return; }
        if (!t.closest("#chd_shop_category_row, [data-chd-shop-list], #chd_shop_sort_bar, .chd-shop-sort-bar")) {
          return;
        }
        try {
          document.documentElement.classList.add("chd-shop-quiet-nav");
        } catch (err) {}
      },
      true
    );
  }


  function isHomePath(path) {
    path = normalizePath(path || (window.location && window.location.pathname) || "/");
    return path === "/" || path === "";
  }

  function homeBoxTokens(settings) {
    var list = (settings && settings.hide_home_box_ids) || [];
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var t = String(list[i] == null ? "" : list[i]).trim().toLowerCase();
      if (t) out.push(t);
    }
    // Longer tokens first so "최근 게시글" wins over "게시글"
    out.sort(function (a, b) { return b.length - a.length; });
    return out;
  }

  function isCasAdMount(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (
        el.closest &&
        el.closest(
          "[data-cas-ad-slot],[data-cas-ad-role],[data-cas-hero],[data-cas-ad-host],[data-cas-hero-host],[data-cas-hero-slot],[data-cas-page-slot]"
        )
      ) {
        return true;
      }
    } catch (e) {}
    var id = "";
    try {
      id = String(el.id || "").toLowerCase();
    } catch (e2) {}
    if (!id) return false;
    if (id.indexOf("cas_") === 0 || id.indexOf("ad_") === 0) return true;
    if (id.indexOf("carousel") !== -1 || id.indexOf("hero") !== -1) return true;
    return false;
  }

  function getMainContentRoot() {
    return (
      document.getElementById("main_content") ||
      document.getElementById("main_content_area")
    );
  }

  /** Typical home card chrome: rounded-xl + border + shadow. */
  function looksLikeHomeCard(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      var cls = String(el.className || "");
      return /\brounded-xl\b/.test(cls) && /\bborder\b/.test(cls) && /\bshadow/.test(cls);
    } catch (e) {
      return false;
    }
  }

  /**
   * Climb to outermost home-box root within main_content.
   * Prefer outermost [data-chd-home-box] / [data-board-slug]; else card-like ancestor.
   * Never treat a lone H3/header row as the hide target.
   */
  function resolveHomeBoxRoot(el) {
    if (!el || el.nodeType !== 1) return el;
    var main = getMainContentRoot();
    var bestMarked = null;
    var bestCard = null;
    var cur = el;
    while (cur && cur.nodeType === 1) {
      if (main) {
        if (cur === main) break;
        if (!main.contains(cur)) break;
      } else if (cur === document.body || cur === document.documentElement) {
        break;
      }
      try {
        if (
          cur.getAttribute &&
          (cur.getAttribute("data-chd-home-box") ||
            cur.getAttribute("data-board-slug") ||
            cur.getAttribute("data-slug"))
        ) {
          bestMarked = cur;
        }
      } catch (eAttr) {}
      if (looksLikeHomeCard(cur)) bestCard = cur;
      cur = cur.parentElement;
    }
    if (bestMarked) return bestMarked;
    if (bestCard) return bestCard;
    return el;
  }

  function hideHomeBoxElement(el) {
    if (!el || el.nodeType !== 1) return false;
    el = resolveHomeBoxRoot(el);
    if (!el || !el.style) return false;
    if (isCasAdMount(el)) return false;
    try {
      var cls = String(el.className || "");
      // Never collapse a multi-card grid row (would scramble home + fight Event Hook layout).
      if (/\bgrid\b/.test(cls) && el.children && el.children.length >= 2) return false;
    } catch (eGrid) {}
    try {
      el.setAttribute("data-chd-home-box-hidden", "1");
      el.setAttribute("hidden", "");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("min-height", "0", "important");
      el.style.setProperty("overflow", "hidden", "important");
      el.style.setProperty("margin", "0", "important");
      el.style.setProperty("padding", "0", "important");
      el.style.setProperty("border", "0", "important");
      collapseBareWrapperAncestors(el);
      return true;
    } catch (e) {
      return false;
    }
  }

  function isProtectedLayoutRoot(el) {
    if (!el || el.nodeType !== 1) return true;
    try {
      var id = String(el.id || "");
      if (id === "main_content" || id === "main_content_area") return true;
    } catch (eId) {}
    if (el === document.body || el === document.documentElement) return true;
    if (isCasAdMount(el)) return true;
    return false;
  }

  function isLayoutStackClass(cls) {
    cls = String(cls || "");
    if (/\bgrid\b/.test(cls)) return true;
    if (/\bflex\b/.test(cls)) return true;
    if (/\bspace-[xy]-/.test(cls)) return true;
    if (/\bgap-/.test(cls) && (/\bflex\b/.test(cls) || /\bgrid\b/.test(cls))) return true;
    return false;
  }

  /** Iteration / pass-through Div: not a layout stack, not a card root. */
  function isBareHomeWrapper(el) {
    if (!el || el.nodeType !== 1) return false;
    if (isProtectedLayoutRoot(el) || isCasAdMount(el)) return false;
    try {
      if (
        el.getAttribute("data-chd-home-box") ||
        el.getAttribute("data-board-slug") ||
        el.getAttribute("data-slug")
      ) {
        return false;
      }
    } catch (eMark) {}
    if (looksLikeHomeCard(el)) return false;
    var cls = "";
    try {
      cls = String(el.className || "");
    } catch (eCls) {}
    if (isLayoutStackClass(cls)) return false;
    // contents / empty class / plain Div wrappers around partials
    return true;
  }

  function isEffectivelyHiddenHomeChild(el) {
    if (!el || el.nodeType !== 1) return true;
    try {
      if (el.hasAttribute("hidden")) return true;
      if (el.getAttribute("data-chd-home-box-hidden") === "1") return true;
      if (el.getAttribute("data-chd-home-layout-collapsed") === "1") return true;
      if (el.style && el.style.display === "none") return true;
    } catch (e) {}
    // Bare iteration wrapper whose children are all hidden still occupies a grid track
    // unless we treat it as hidden (or collapse it). Prefer both.
    try {
      if (isBareHomeWrapper(el) && el.children && el.children.length > 0) {
        var anyVis = false;
        for (var i = 0; i < el.children.length; i++) {
          var ch = el.children[i];
          if (!ch || ch.nodeType !== 1) continue;
          if (isCasAdMount(ch)) {
            anyVis = true;
            break;
          }
          if (!isEffectivelyHiddenHomeChild(ch)) {
            anyVis = true;
            break;
          }
        }
        if (!anyVis) return true;
      }
    } catch (eBare) {}
    return false;
  }

  function parseGridOrigCols(el) {
    var cls = "";
    try {
      cls = String(el.className || "");
    } catch (e) {}
    var m = cls.match(/(?:^|\s)grid-cols-(\d+)(?:\s|$)/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n >= 1) return n;
    }
    return 3;
  }

  function parseGridGap(el) {
    var cls = "";
    try {
      cls = String(el.className || "");
    } catch (e) {}
    var m = cls.match(/(?:^|\s)gap-(\d+(?:\.\d+)?)(?:\s|$)/);
    if (!m) m = cls.match(/(?:^|\s)gap-x-(\d+(?:\.\d+)?)(?:\s|$)/);
    if (m) {
      var n = parseFloat(m[1]);
      if (!isNaN(n)) return n * 0.25 + "rem";
    }
    try {
      var cs = window.getComputedStyle(el);
      var g = cs.columnGap || cs.gap;
      if (g && g !== "normal" && g !== "0px") return g;
    } catch (eCs) {}
    return "1rem";
  }

  function clearCompactAttr(el) {
    if (!el) return;
    try {
      el.removeAttribute("data-chd-home-grid-compact");
      if (el.style) {
        el.style.removeProperty("--chd-home-visible-cols");
        el.style.removeProperty("--chd-home-orig-cols");
        el.style.removeProperty("--chd-home-gap");
      }
    } catch (e) {}
  }

  function compactPartialHomeGrid(grid, visibleCount, origCols) {
    if (!grid || grid.nodeType !== 1) return;
    if (isProtectedLayoutRoot(grid) || isCasAdMount(grid)) return;
    try {
      grid.setAttribute("data-chd-home-grid-compact", "1");
      grid.style.setProperty("--chd-home-visible-cols", String(visibleCount));
      grid.style.setProperty("--chd-home-orig-cols", String(origCols));
      grid.style.setProperty("--chd-home-gap", parseGridGap(grid));
    } catch (e) {}
  }

  /** After hiding a card, collapse bare parent Divs (Grid3 iteration wrappers). */
  function collapseBareWrapperAncestors(el) {
    if (!el || !el.parentElement) return;
    var parent = el.parentElement;
    var hops = 0;
    while (parent && hops < 5) {
      hops++;
      if (isProtectedLayoutRoot(parent) || isCasAdMount(parent)) break;
      if (!isBareHomeWrapper(parent)) break;
      var vis = countVisibleHomeChildren(parent);
      if (vis.length === 0) {
        collapseLayoutElement(parent);
        parent = parent.parentElement;
        continue;
      }
      break;
    }
  }

  function countVisibleHomeChildren(parent) {
    var visible = [];
    if (!parent || !parent.children) return visible;
    for (var i = 0; i < parent.children.length; i++) {
      var ch = parent.children[i];
      if (!ch || ch.nodeType !== 1) continue;
      if (isCasAdMount(ch)) continue;
      if (isEffectivelyHiddenHomeChild(ch)) continue;
      visible.push(ch);
    }
    return visible;
  }

  function wrapperHasVisibleAdChild(parent) {
    if (!parent || !parent.children) return false;
    for (var i = 0; i < parent.children.length; i++) {
      var ch = parent.children[i];
      if (isCasAdMount(ch) && !isEffectivelyHiddenHomeChild(ch)) return true;
    }
    return false;
  }

  function collapseLayoutElement(el) {
    if (!el || el.nodeType !== 1 || !el.style) return;
    if (isProtectedLayoutRoot(el)) return;
    if (isCasAdMount(el)) return;
    try {
      if (!el.hasAttribute("data-chd-layout-prev-style")) {
        el.setAttribute("data-chd-layout-prev-style", el.getAttribute("style") || "");
      }
      el.setAttribute("data-chd-home-layout-collapsed", "1");
      el.setAttribute("hidden", "");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
      el.style.setProperty("min-height", "0", "important");
      el.style.setProperty("max-height", "0", "important");
      el.style.setProperty("overflow", "hidden", "important");
      el.style.setProperty("margin", "0", "important");
      el.style.setProperty("padding", "0", "important");
      el.style.setProperty("gap", "0", "important");
      el.style.setProperty("border", "0", "important");
    } catch (e) {}
  }

  function restoreStyleFromPrev(el, prevAttr) {
    var prev = el.getAttribute(prevAttr);
    if (prev != null) {
      if (prev === "") el.removeAttribute("style");
      else el.setAttribute("style", prev);
      el.removeAttribute(prevAttr);
      return true;
    }
    return false;
  }

  function clearCollapsedHomeLayouts() {
    try {
      var spans = document.querySelectorAll("[data-chd-home-grid-span='1']");
      for (var i = 0; i < spans.length; i++) {
        var el = spans[i];
        try {
          if (!restoreStyleFromPrev(el, "data-chd-grid-span-prev")) {
            el.style.removeProperty("grid-column");
            el.style.removeProperty("width");
            el.style.removeProperty("max-width");
          }
          el.removeAttribute("data-chd-home-grid-span");
        } catch (eSpan) {}
      }
      var cols = document.querySelectorAll("[data-chd-home-grid-onecol='1']");
      for (var j = 0; j < cols.length; j++) {
        var g = cols[j];
        try {
          if (!restoreStyleFromPrev(g, "data-chd-grid-cols-prev")) {
            g.style.removeProperty("grid-template-columns");
          }
          g.removeAttribute("data-chd-home-grid-onecol");
        } catch (eCol) {}
      }
      var compacts = document.querySelectorAll("[data-chd-home-grid-compact='1']");
      for (var ci = 0; ci < compacts.length; ci++) {
        try {
          clearCompactAttr(compacts[ci]);
        } catch (eComp) {}
      }
      var nodes = document.querySelectorAll("[data-chd-home-layout-collapsed='1']");
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        try {
          if (!restoreStyleFromPrev(n, "data-chd-layout-prev-style")) {
            n.style.removeProperty("display");
            n.style.removeProperty("visibility");
            n.style.removeProperty("height");
            n.style.removeProperty("min-height");
            n.style.removeProperty("max-height");
            n.style.removeProperty("overflow");
            n.style.removeProperty("margin");
            n.style.removeProperty("padding");
            n.style.removeProperty("gap");
            n.style.removeProperty("border");
          }
          n.removeAttribute("hidden");
          n.removeAttribute("data-chd-home-layout-collapsed");
        } catch (eN) {}
      }
    } catch (e) {}
  }

  function collapseEmptyHomeLayouts() {
    var root = getMainContentRoot();
    if (!root) return;

    var wrappers = [];
    try {
      var all = root.querySelectorAll("*");
      for (var i = 0; i < all.length; i++) {
        var w = all[i];
        if (!w || w.nodeType !== 1) continue;
        if (isProtectedLayoutRoot(w) || isCasAdMount(w)) continue;
        var cls = "";
        try {
          cls = String(w.className || "");
        } catch (eCls) {}
        if (!isLayoutStackClass(cls)) continue;
        wrappers.push(w);
      }
    } catch (eAll) {}

    function depthUnderRoot(n) {
      var d = 0;
      var cur = n;
      while (cur && cur !== root) {
        d++;
        cur = cur.parentElement;
      }
      return d;
    }
    wrappers.sort(function (a, b) {
      return depthUnderRoot(b) - depthUnderRoot(a);
    });

    for (var wi = 0; wi < wrappers.length; wi++) {
      var wrap = wrappers[wi];
      try {
        if (wrap.getAttribute("data-chd-home-layout-collapsed") === "1") continue;
      } catch (eSkip) {}
      if (wrapperHasVisibleAdChild(wrap)) continue;

      var visible = countVisibleHomeChildren(wrap);
      if (visible.length === 0) {
        var kids = wrap.children || [];
        var hasHomeSignal = false;
        for (var ki = 0; ki < kids.length; ki++) {
          var kid = kids[ki];
          if (!kid || kid.nodeType !== 1) continue;
          if (isCasAdMount(kid)) continue;
          try {
            if (
              kid.getAttribute("data-chd-home-box-hidden") === "1" ||
              kid.getAttribute("data-chd-home-layout-collapsed") === "1" ||
              kid.hasAttribute("hidden") ||
              kid.getAttribute("data-chd-home-box") ||
              kid.getAttribute("data-board-slug") ||
              looksLikeHomeCard(kid)
            ) {
              hasHomeSignal = true;
              break;
            }
          } catch (eKid) {}
        }
        if (hasHomeSignal || kids.length > 0) {
          // Collapse empty stacks that previously held home cards / nested collapsed rows.
          if (hasHomeSignal || visible.length === 0) {
            // Prefer collapsing only when something was hidden/collapsed under us
            // OR every child is already effectively hidden (blank band).
            var allHidden = kids.length > 0;
            for (var aj = 0; aj < kids.length; aj++) {
              var ck = kids[aj];
              if (!ck || ck.nodeType !== 1) continue;
              if (isCasAdMount(ck)) {
                allHidden = false;
                break;
              }
              if (!isEffectivelyHiddenHomeChild(ck)) {
                allHidden = false;
                break;
              }
            }
            if (allHidden) collapseLayoutElement(wrap);
          }
        }
        continue;
      }

      // 0.2.53: partial grid — compact to visibleCols (NOT full-bleed / grid-column 1/-1).
      var wrapCls = "";
      try {
        wrapCls = String(wrap.className || "");
      } catch (eWc) {}
      if (/\bgrid\b/.test(wrapCls) && visible.length >= 1) {
        var origCols = parseGridOrigCols(wrap);
        if (visible.length < origCols) {
          compactPartialHomeGrid(wrap, visible.length, origCols);
        } else {
          clearCompactAttr(wrap);
        }
      }
    }

    // Walk up from hidden/collapsed nodes: bare wrappers + empty flex/grid parents.
    try {
      var seeds = root.querySelectorAll(
        "[data-chd-home-box-hidden='1'],[data-chd-home-layout-collapsed='1']"
      );
      for (var si = 0; si < seeds.length; si++) {
        var parent = seeds[si].parentElement;
        var hops = 0;
        while (parent && parent !== root && hops < 8) {
          hops++;
          if (isProtectedLayoutRoot(parent) || isCasAdMount(parent)) break;
          if (parent.getAttribute("data-chd-home-layout-collapsed") === "1") {
            parent = parent.parentElement;
            continue;
          }
          if (wrapperHasVisibleAdChild(parent)) break;

          // Bare iteration wrappers: collapse when no visible home kids remain.
          if (isBareHomeWrapper(parent)) {
            var visBare = countVisibleHomeChildren(parent);
            if (visBare.length === 0) {
              collapseLayoutElement(parent);
              parent = parent.parentElement;
              continue;
            }
            break;
          }

          var pCls = "";
          try {
            pCls = String(parent.className || "");
          } catch (ePc) {}
          if (!isLayoutStackClass(pCls) && !/\bspace-[xy]-/.test(pCls) && !/\bgap-/.test(pCls)) {
            parent = parent.parentElement;
            continue;
          }
          var visP = countVisibleHomeChildren(parent);
          if (visP.length === 0) {
            collapseLayoutElement(parent);
            clearCompactAttr(parent);
          } else {
            // Partial grid: compact (leave climb so deeper wrappers already handled).
            if (/\bgrid\b/.test(pCls) && visP.length >= 1) {
              var oc = parseGridOrigCols(parent);
              if (visP.length < oc) compactPartialHomeGrid(parent, visP.length, oc);
              else clearCompactAttr(parent);
            }
            break;
          }
          parent = parent.parentElement;
        }
      }
    } catch (eUp) {}
  }

  function clearHiddenHomeBoxes() {
    clearCollapsedHomeLayouts();
    try {
      var nodes = document.querySelectorAll("[data-chd-home-box-hidden='1']");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        try {
          el.style.removeProperty("display");
          el.style.removeProperty("visibility");
          el.style.removeProperty("height");
          el.style.removeProperty("min-height");
          el.style.removeProperty("overflow");
          el.style.removeProperty("margin");
          el.style.removeProperty("padding");
          el.style.removeProperty("border");
          el.removeAttribute("hidden");
          el.removeAttribute("data-chd-home-box-hidden");
        } catch (e2) {}
      }
    } catch (e) {}
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Fixed chrome kinds (exclusive). Dynamic board cards use board:<slug>. */
  var CHD_FIXED_KINDS = [
    "welcome",
    "users",
    "posts",
    "comments",
    "boards",
    "recent_posts",
    "popular_boards",
    "shop",
    "community_guide"
  ];

  /** Alias → canonical fixed kind (data-chd-home-box + token normalization). */
  var CHD_KIND_ALIASES = {
    welcome: "welcome",
    welcome_card: "welcome",
    "웰컴": "welcome",
    users: "users",
    members: "users",
    member: "users",
    stat_users: "users",
    "회원": "users",
    posts: "posts",
    post: "posts",
    stat_posts: "posts",
    "게시글": "posts",
    comments: "comments",
    comment: "comments",
    stat_comments: "comments",
    "댓글": "comments",
    boards: "boards",
    board: "boards",
    stat_boards: "boards",
    "게시판": "boards",
    recent: "recent_posts",
    recent_posts: "recent_posts",
    "recent-posts": "recent_posts",
    "최근 게시글": "recent_posts",
    popular: "popular_boards",
    popular_boards: "popular_boards",
    "popular-boards": "popular_boards",
    "인기 게시판": "popular_boards",
    shop: "shop",
    shopping: "shop",
    shop_promo: "shop",
    "쇼핑몰": "shop",
    community: "community_guide",
    community_guide: "community_guide",
    "community-guide": "community_guide",
    guide: "community_guide",
    "커뮤니티 가이드": "community_guide",
    "커뮤니티가이드": "community_guide"
  };

  function normalizeHomeBoxKind(raw) {
    if (raw == null) return null;
    var t = String(raw).toLowerCase().trim();
    if (!t) return null;
    if (t.indexOf("board:") === 0) {
      var slugPart = t.slice(6).replace(/[^a-z0-9_-]/gi, "");
      return slugPart ? "board:" + slugPart.toLowerCase() : null;
    }
    if (CHD_KIND_ALIASES[t]) return CHD_KIND_ALIASES[t];
    for (var i = 0; i < CHD_FIXED_KINDS.length; i++) {
      if (CHD_FIXED_KINDS[i] === t) return t;
    }
    return null;
  }

  /** Title/id/attr/heading/text only — NO hrefs. */
  function homeBoxTitleLabel(el) {
    if (!el) return "";
    var parts = [];
    try {
      parts.push(String(el.id || ""));
    } catch (e) {}
    try {
      if (el.getAttribute) {
        parts.push(String(el.getAttribute("data-chd-home-box") || ""));
        parts.push(String(el.getAttribute("data-board-slug") || ""));
        parts.push(String(el.getAttribute("data-slug") || ""));
        parts.push(String(el.getAttribute("data-board") || ""));
      }
    } catch (e2) {}
    try {
      var heads = el.querySelectorAll("h1,h2,h3,h4,.text-lg,.font-semibold,.font-bold");
      for (var i = 0; i < heads.length && i < 6; i++) {
        parts.push(String(heads[i].textContent || "").replace(/\s+/g, " ").trim());
      }
    } catch (e3) {}
    // Short plain text snapshot (welcome / stat labels) without swallowing whole page
    try {
      var raw = String(el.textContent || "").replace(/\s+/g, " ").trim();
      if (raw.length > 180) raw = raw.slice(0, 180);
      parts.push(raw);
    } catch (e4) {}
    return parts.join(" ").toLowerCase();
  }

  /** Heading / prominent title texts for strict scoring. */
  function homeBoxExactHeadings(el) {
    var out = [];
    if (!el) return out;
    try {
      var heads = el.querySelectorAll(
        "h1,h2,h3,h4,.text-lg,.font-semibold,.font-bold,span.text-sm.font-medium,p.text-sm"
      );
      for (var i = 0; i < heads.length && i < 8; i++) {
        var t = String(heads[i].textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (t) out.push(t);
      }
    } catch (eH) {}
    return out;
  }

  /** @deprecated keep name for any external callers — title only (no hrefs). */
  function homeBoxLabel(el) {
    return homeBoxTitleLabel(el);
  }

  function wholeWordEn(needle, label) {
    try {
      return new RegExp("(^|[^a-z0-9_])" + escapeRegex(needle) + "([^a-z0-9_]|$)", "i").test(label);
    } catch (e) {
      return false;
    }
  }

  function hangulBoundary(needle, label) {
    try {
      return new RegExp("(^|[^가-힣])" + escapeRegex(needle) + "([^가-힣]|$)").test(label);
    } catch (e) {
      return false;
    }
  }

  function labelHasRecentPosts(label) {
    return (
      label.indexOf("최근 게시글") !== -1 ||
      label.indexOf("recent posts") !== -1 ||
      label.indexOf("recent post") !== -1
    );
  }

  function labelHasPopularBoards(label) {
    return (
      label.indexOf("인기 게시판") !== -1 ||
      label.indexOf("popular boards") !== -1 ||
      label.indexOf("popular board") !== -1
    );
  }

  /**
   * Strict per-kind score against title/heading label (no hrefs).
   * Higher = stronger. 0 = no match.
   */
  function scoreHomeBoxKind(kind, label, headings) {
    if (!kind || !label) return 0;
    var score = 0;
    var i;
    var h;

    if (kind === "welcome") {
      if (label.indexOf("3d store welcome") !== -1 || label.indexOf("3d store에 오신") !== -1) score = 40;
      else if (label.indexOf("welcome") !== -1 || hangulBoundary("웰컴", label)) score = 30;
      else if (label.indexOf("오신 것을 환영") !== -1) score = 25;
      return score;
    }

    if (kind === "recent_posts") {
      if (
        label.indexOf("최근 게시글") !== -1 ||
        label.indexOf("recent posts") !== -1 ||
        label.indexOf("recent post") !== -1 ||
        label.indexOf("recent_posts") !== -1
      ) {
        return 50;
      }
      return 0;
    }

    if (kind === "popular_boards") {
      if (
        label.indexOf("인기 게시판") !== -1 ||
        label.indexOf("popular boards") !== -1 ||
        label.indexOf("popular board") !== -1 ||
        label.indexOf("popular_boards") !== -1
      ) {
        return 50;
      }
      return 0;
    }

    if (kind === "users") {
      for (i = 0; i < (headings || []).length; i++) {
        h = headings[i];
        if (h === "members" || h === "member" || h === "users" || h === "user" || h === "회원") return 45;
      }
      if (wholeWordEn("members", label) || wholeWordEn("member", label) || hangulBoundary("회원", label)) {
        return 30;
      }
      if (wholeWordEn("users", label) || wholeWordEn("user", label)) return 20;
      return 0;
    }

    if (kind === "posts") {
      if (labelHasRecentPosts(label)) return 0;
      for (i = 0; i < (headings || []).length; i++) {
        h = headings[i];
        if (h === "posts" || h === "post" || h === "게시글") return 45;
      }
      if (wholeWordEn("posts", label) || hangulBoundary("게시글", label)) return 30;
      if (wholeWordEn("post", label)) return 15;
      return 0;
    }

    if (kind === "comments") {
      for (i = 0; i < (headings || []).length; i++) {
        h = headings[i];
        if (h === "comments" || h === "comment" || h === "댓글") return 45;
      }
      if (wholeWordEn("comments", label) || hangulBoundary("댓글", label)) return 30;
      if (wholeWordEn("comment", label)) return 15;
      return 0;
    }

    if (kind === "boards") {
      if (labelHasPopularBoards(label)) return 0;
      for (i = 0; i < (headings || []).length; i++) {
        h = headings[i];
        // Exact heading only — Hangul-boundary so 자유게시판 ≠ 게시판
        if (h === "boards" || h === "board" || h === "게시판") return 45;
      }
      if (wholeWordEn("boards", label) || hangulBoundary("게시판", label)) return 30;
      if (wholeWordEn("board", label)) return 10;
      return 0;
    }

    if (kind === "shop") {
      if (
        label.indexOf("쇼핑몰") !== -1 ||
        label.indexOf("browse fresh products") !== -1 ||
        label.indexOf("신선한 상품") !== -1
      ) {
        return 40;
      }
      if (wholeWordEn("shop", label) || wholeWordEn("shopping", label)) return 25;
      return 0;
    }

    if (kind === "community_guide") {
      if (
        label.indexOf("커뮤니티 가이드") !== -1 ||
        label.indexOf("커뮤니티가이드") !== -1 ||
        label.indexOf("community guide") !== -1 ||
        label.indexOf("community_guide") !== -1
      ) {
        return 45;
      }
      if (wholeWordEn("guide", label) && label.indexOf("community") !== -1) return 30;
      return 0;
    }

    return 0;
  }

  /** True if title strongly identifies a fixed chrome box (blocks board:slug). */
  function isFixedChromeByTitle(label, headings) {
    var best = 0;
    for (var i = 0; i < CHD_FIXED_KINDS.length; i++) {
      var s = scoreHomeBoxKind(CHD_FIXED_KINDS[i], label, headings);
      if (s > best) best = s;
    }
    return best >= 25;
  }

  function isSlugLikeToken(tok) {
    return /^[a-z0-9][a-z0-9_-]*$/i.test(String(tok || ""));
  }

  /** trim / lower / collapse spaces — for boardname: matching. */
  function normalizeBoardName(s) {
    return String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  /**
   * Board card title from first prominent button/heading (item.name).
   * Summary cards use navigate Buttons (no href), so title is required for KO names.
   */
  function extractBoardTitleFromCard(el) {
    if (!el) return "";
    try {
      var preferred = el.querySelector(
        "button.font-semibold, .font-semibold.cursor-pointer, h1, h2, h3, h4"
      );
      if (preferred) {
        var t = String(preferred.textContent || "").replace(/\s+/g, " ").trim();
        if (t) return t;
      }
    } catch (e1) {}
    try {
      var btns = el.querySelectorAll("button");
      for (var i = 0; i < btns.length && i < 4; i++) {
        var bt = String(btns[i].textContent || "").replace(/\s+/g, " ").trim();
        // Skip tiny count badges / icon-only
        if (bt && bt.length >= 2 && bt.length <= 40 && !/^[\d,.]+$/.test(bt)) return bt;
      }
    } catch (e2) {}
    try {
      var heads = homeBoxExactHeadings(el);
      if (heads && heads.length) return heads[0];
    } catch (e3) {}
    return "";
  }

  /** Board home path /board/{slug} (not /board/{slug}/{postId}). */
  function extractBoardSlugFromCard(el) {
    if (!el) return null;
    var slug = "";
    // Prefer attributes on el, then on resolved card root (nested title nodes lack slug).
    var nodes = [el];
    try {
      var root = resolveHomeBoxRoot(el);
      if (root && root !== el) nodes.push(root);
    } catch (eRoot) {}
    try {
      for (var ni = 0; ni < nodes.length; ni++) {
        var node = nodes[ni];
        if (!node || !node.getAttribute) continue;
        slug = String(node.getAttribute("data-board-slug") || node.getAttribute("data-slug") || "").trim();
        // Keep slug-like only (opaque Korean names are matched via boardname:)
        if (slug && isSlugLikeToken(slug)) return slug.toLowerCase();
      }
    } catch (eAttr) {}

    function slugFromHref(href) {
      if (!href) return "";
      var m = String(href)
        .toLowerCase()
        .match(/(?:^|[^a-z0-9_])\/board\/([a-z0-9][a-z0-9_-]*)\/?(?:[?#]|$)/i);
      if (m && m[1]) return m[1].toLowerCase();
      return "";
    }

    try {
      var selfHref =
        (el.getAttribute && (el.getAttribute("href") || el.getAttribute("to") || "")) || "";
      var fromSelf = slugFromHref(selfHref);
      if (fromSelf) return fromSelf;
    } catch (eSelf) {}

    // Prefer a single board-index link on the card (ignore /board/slug/123 post links)
    var found = {};
    var count = 0;
    var last = "";
    try {
      var anchors = el.querySelectorAll("a[href],[to]");
      for (var ai = 0; ai < anchors.length && ai < 16; ai++) {
        var ah =
          (anchors[ai].getAttribute &&
            (anchors[ai].getAttribute("href") || anchors[ai].getAttribute("to") || "")) ||
          "";
        var s = slugFromHref(ah);
        if (!s) continue;
        if (!found[s]) {
          found[s] = 1;
          count++;
          last = s;
        }
      }
    } catch (eA) {}
    // Only accept when exactly one distinct board-home slug (board summary card).
    // Recent Posts has many /board/x/N post links → slugFromHref returns "" → count 0.
    if (count === 1) return last;
    return null;
  }

  /**
   * Exclusive classification: exactly one kind, or null (do not hide).
   * Never classifies multi-child .grid wrappers.
   */
  function classifyHomeBox(el) {
    if (!el || el.nodeType !== 1) return null;
    if (isCasAdMount(el)) return null;
    try {
      var cls = String(el.className || "");
      if (/\bgrid\b/.test(cls) && el.children && el.children.length >= 2) return null;
    } catch (eGrid) {}

    // 1) Explicit data-chd-home-box
    try {
      var attr = el.getAttribute && el.getAttribute("data-chd-home-box");
      if (attr) {
        var norm = normalizeHomeBoxKind(attr);
        if (norm) return norm;
        // Unknown attr value: if board:… shape already handled; else treat as opaque kind key
        var raw = String(attr).toLowerCase().trim();
        if (raw) return raw;
      }
    } catch (eAttr) {}

    var label = homeBoxTitleLabel(el);
    var headings = homeBoxExactHeadings(el);

    // 2) Board summary card (not fixed chrome)
    var boardSlug = extractBoardSlugFromCard(el);
    if (boardSlug && !isFixedChromeByTitle(label, headings)) {
      return "board:" + boardSlug;
    }

    // 3) Score fixed kinds — highest wins; tie or weak → null
    var bestKind = null;
    var bestScore = 0;
    var tie = false;
    for (var i = 0; i < CHD_FIXED_KINDS.length; i++) {
      var kind = CHD_FIXED_KINDS[i];
      var sc = scoreHomeBoxKind(kind, label, headings);
      if (sc > bestScore) {
        bestScore = sc;
        bestKind = kind;
        tie = false;
      } else if (sc > 0 && sc === bestScore) {
        tie = true;
      }
    }
    if (tie || bestScore < 20) return null;
    return bestKind;
  }

  /**
   * Map admin hide tokens → exclusive kind set.
   * 게시판/boards → boards (stats) only — NOT all board:*.
   * Slug tokens / 웹진 / 1:1 문의 / Q&A → board:<slug>.
   */
  function tokensToHideKinds(tokens) {
    var set = {};
    if (!tokens || !tokens.length) return set;

    var tokenKindMap = {
      welcome: "welcome",
      welcome_card: "welcome",
      "웰컴": "welcome",
      users: "users",
      members: "users",
      member: "users",
      stat_users: "users",
      "회원": "users",
      posts: "posts",
      post: "posts",
      stat_posts: "posts",
      "게시글": "posts",
      comments: "comments",
      comment: "comments",
      stat_comments: "comments",
      "댓글": "comments",
      boards: "boards",
      board: "boards",
      stat_boards: "boards",
      "게시판": "boards",
      recent: "recent_posts",
      recent_posts: "recent_posts",
      "recent-posts": "recent_posts",
      "최근 게시글": "recent_posts",
      popular: "popular_boards",
      popular_boards: "popular_boards",
      "popular-boards": "popular_boards",
      "인기 게시판": "popular_boards",
      shop: "shop",
      shopping: "shop",
      shop_promo: "shop",
      "쇼핑몰": "shop",
      community: "community_guide",
      community_guide: "community_guide",
      "community-guide": "community_guide",
      guide: "community_guide",
      "커뮤니티 가이드": "community_guide",
      "커뮤니티가이드": "community_guide",
      // board:* aliases
      webzine: "board:webzine",
      "웹진": "board:webzine",
      inquiry: "board:inquiry",
      "1:1 문의": "board:inquiry",
      "1:1문의": "board:inquiry",
      qna: "board:qna",
      "q&a": "board:qna",
      "q＆a": "board:qna",
      notice: "board:notice",
      "공지사항": "board:notice",
      free: "board:free",
      "자유게시판": "boardname:자유게시판"
    };

    for (var i = 0; i < tokens.length; i++) {
      var tok = String(tokens[i] == null ? "" : tokens[i]).toLowerCase().trim();
      if (!tok || tok.length < 1) continue;

      var mapped = tokenKindMap[tok];
      if (mapped) {
        set[mapped] = 1;
        // Known board display-name aliases (navigate Buttons often lack href)
        if (tok === "웹진" || tok === "webzine") {
          set["board:webzine"] = 1;
          set["boardname:웹진"] = 1;
        } else if (tok === "공지사항" || tok === "notice") {
          set["board:notice"] = 1;
          set["boardname:공지사항"] = 1;
        } else if (tok === "자유게시판" || tok === "free") {
          set["boardname:자유게시판"] = 1;
          if (tok === "free") set["board:free"] = 1;
        }
        continue;
      }

      var asKind = normalizeHomeBoxKind(tok);
      if (asKind) {
        set[asKind] = 1;
        continue;
      }

      // Ascii slug → board:<slug>
      if (isSlugLikeToken(tok) && tok.length >= 2) {
        set["board:" + tok.toLowerCase()] = 1;
        continue;
      }

      // Non-slug token (e.g. Korean board title): boardname:<normalized>
      var bn = normalizeBoardName(tok);
      if (bn) set["boardname:" + bn] = 1;
      // Opaque token: keep as-is for data-chd-home-box exact match
      set[tok] = 1;
    }
    return set;
  }

  function hasMarkedAncestor(el, root, attrName) {
    if (!el || !root) return false;
    var p = el.parentElement;
    while (p && p !== root) {
      if (!root.contains(p)) break;
      try {
        if (p.getAttribute && p.getAttribute(attrName)) return true;
      } catch (e) {}
      p = p.parentElement;
    }
    return false;
  }

  function collectHomeBoxCandidates(root) {
    var out = [];
    if (!root) return out;
    function pushLeaf(el) {
      if (!el || el.nodeType !== 1) return;
      if (isCasAdMount(el)) return;
      var cls = String(el.className || "");
      if (/\bcontents\b/.test(cls)) {
        for (var i = 0; i < el.children.length; i++) pushLeaf(el.children[i]);
        return;
      }
      out.push(el);
    }
    // Direct children of home grid rows (and one nested level for shop+guide column)
    try {
      var grids = root.querySelectorAll(".grid");
      for (var g = 0; g < grids.length; g++) {
        if (isCasAdMount(grids[g])) continue;
        var kids = grids[g].children;
        for (var i = 0; i < kids.length; i++) {
          var kid = kids[i];
          if (isCasAdMount(kid)) continue;
          var kcls = String(kid.className || "");
          if (/\bcontents\b/.test(kcls)) {
            pushLeaf(kid);
          } else if (/\bflex\b/.test(kcls) && kid.children && kid.children.length) {
            // shop + community guide stack
            for (var c = 0; c < kid.children.length; c++) pushLeaf(kid.children[c]);
          } else {
            pushLeaf(kid);
          }
        }
      }
    } catch (e) {}
    try {
      var marked = root.querySelectorAll(
        "[data-chd-home-box],[data-board-slug],[data-slug],.chd-home-fill,[data-chd-home-fill='1']"
      );
      for (var m = 0; m < marked.length; m++) {
        var node = marked[m];
        if (isCasAdMount(node)) continue;
        // Keep outermost only — nested data-chd-home-box (bad template replace) breaks hide
        try {
          if (
            node.getAttribute &&
            node.getAttribute("data-chd-home-box") &&
            hasMarkedAncestor(node, root, "data-chd-home-box")
          ) {
            continue;
          }
          if (
            node.getAttribute &&
            node.getAttribute("data-board-slug") &&
            hasMarkedAncestor(node, root, "data-board-slug")
          ) {
            continue;
          }
          if (
            node.getAttribute &&
            node.getAttribute("data-slug") &&
            hasMarkedAncestor(node, root, "data-slug")
          ) {
            continue;
          }
        } catch (eSkip) {}
        out.push(node);
      }
    } catch (e2) {}
    return out;
  }

  function ensureHiddenHomeBoxes() {
    clearHiddenHomeBoxes();
    if (!lastSettings) return;
    if (!isHomePath()) return;
    var tokens = homeBoxTokens(lastSettings);
    if (!tokens.length) return;

    var root = getMainContentRoot();
    if (!root) return;

    var hideSet = tokensToHideKinds(tokens);
    var candidates = collectHomeBoxCandidates(root);
    var claimed = [];

    for (var c = 0; c < candidates.length; c++) {
      var el = candidates[c];
      if (!el || isCasAdMount(el)) continue;
      // Always operate on outermost card root (nested marked nodes → parent card)
      el = resolveHomeBoxRoot(el);
      if (!el || isCasAdMount(el)) continue;

      // Skip if already hidden this pass (duplicate candidate refs)
      var already = false;
      for (var ci = 0; ci < claimed.length; ci++) {
        if (claimed[ci] === el) {
          already = true;
          break;
        }
      }
      if (already) continue;

      var kind = classifyHomeBox(el);
      var boardSlug = extractBoardSlugFromCard(el);
      var boardTitle = extractBoardTitleFromCard(el);
      var boardTitleNorm = boardTitle ? normalizeBoardName(boardTitle) : "";

      // Prefer board:slug when known; title still used for boardname: match
      if (!kind && boardSlug) {
        var label0 = homeBoxTitleLabel(el);
        var heads0 = homeBoxExactHeadings(el);
        if (!isFixedChromeByTitle(label0, heads0)) kind = "board:" + boardSlug;
      }

      var shouldHide = !!(kind && hideSet[kind]);

      // board:slug — also allow bare slug token match
      if (!shouldHide && kind && kind.indexOf("board:") === 0) {
        var slugOnly = kind.slice(6);
        if (slugOnly && hideSet["board:" + slugOnly]) shouldHide = true;
        else {
          for (var ti = 0; ti < tokens.length; ti++) {
            var tok = String(tokens[ti] || "").toLowerCase().trim();
            if (tok === slugOnly || tok === "board:" + slugOnly) {
              shouldHide = true;
              break;
            }
          }
        }
      }

      // Board display-name match (공지사항 / 자유게시판 / 웹진, etc.)
      if (!shouldHide && boardTitleNorm) {
        if (hideSet["boardname:" + boardTitleNorm]) shouldHide = true;
        else {
          for (var tj = 0; tj < tokens.length; tj++) {
            var tok2 = normalizeBoardName(tokens[tj]);
            if (tok2 && tok2 === boardTitleNorm) {
              shouldHide = true;
              break;
            }
          }
        }
      }

      // Slug present but kind null / not in set yet
      if (!shouldHide && boardSlug && hideSet["board:" + boardSlug]) shouldHide = true;

      if (shouldHide) {
        if (hideHomeBoxElement(el)) claimed.push(el);
      }
    }

    // Collapse empty stacks; compact partial multi-col grids (no full-bleed).
    try {
      collapseEmptyHomeLayouts();
    } catch (eCollapse) {}
  }

  function clearHomeHideRetries() {
    for (var i = 0; i < homeHideRetryTimers.length; i++) {
      try {
        clearTimeout(homeHideRetryTimers[i]);
      } catch (eClr) {}
    }
    homeHideRetryTimers = [];
  }

  function disconnectHomeBoxObserver() {
    if (homeBoxMoDebounce) {
      clearTimeout(homeBoxMoDebounce);
      homeBoxMoDebounce = null;
    }
    if (homeBoxMo) {
      try {
        homeBoxMo.disconnect();
      } catch (eDisc) {}
      homeBoxMo = null;
    }
    homeBoxMoRoot = null;
  }

  function connectHomeBoxObserver() {
    if (!isHomePath()) {
      disconnectHomeBoxObserver();
      return;
    }
    var root =
      document.getElementById("main_content") ||
      document.getElementById("main_content_area");
    if (!root) return;
    if (homeBoxMo && homeBoxMoRoot === root) return;
    disconnectHomeBoxObserver();
    // Progressive home cards appear after first paint via SPA data_sources.
    // Observe only for ensureHiddenHomeBoxes — NOT search remount / full header UX
    // (0.2.1 infinite remount loop came from full-path MutationObserver).
    homeBoxMo = new MutationObserver(function () {
      if (homeBoxMoDebounce) clearTimeout(homeBoxMoDebounce);
      homeBoxMoDebounce = setTimeout(function () {
        homeBoxMoDebounce = null;
        if (!isHomePath()) {
          disconnectHomeBoxObserver();
          return;
        }
        try {
          ensureHiddenHomeBoxes();
        } catch (eMo) {}
      }, HOME_BOX_MO_DEBOUNCE_MS);
    });
    homeBoxMoRoot = root;
    try {
      homeBoxMo.observe(root, { childList: true, subtree: true });
    } catch (eObs) {
      homeBoxMo = null;
      homeBoxMoRoot = null;
    }
  }

  /** Schedule staggered re-hides on home; clear previous timers. Disconnect MO off-home. */
  function scheduleHomeHideRetries() {
    clearHomeHideRetries();
    if (!isHomePath()) {
      disconnectHomeBoxObserver();
      return;
    }
    connectHomeBoxObserver();
    for (var i = 0; i < HOME_HIDE_RETRY_MS.length; i++) {
      (function (delay) {
        var tid = setTimeout(function () {
          if (!isHomePath()) {
            disconnectHomeBoxObserver();
            return;
          }
          try {
            ensureHiddenHomeBoxes();
          } catch (eRetry) {}
          // Root may appear after first paint — reconnect if needed.
          if (!homeBoxMo) connectHomeBoxObserver();
        }, delay);
        homeHideRetryTimers.push(tid);
      })(HOME_HIDE_RETRY_MS[i]);
    }
  }


  function ensureHeaderUx() {
    try {
      bindShopInfiniteScroll();
      bindShopQuietNavClicks();
      syncShopQuietNav();
      applyShopSortBarTransparent();
      bindShopThumbResize();
      applyShopProductCardMarks();
    } catch (eShop) {}
    if (!lastSettings) return;
    try {
      ensureHiddenHomeBoxes();
    } catch (eHomeBox) {}
    if (settingOn(lastSettings, "header_search_icon_mode", true)) {
      // Icon mode: drop always-visible fallback, mount icon+panel, then hide original form
      ensureAlwaysVisibleSearch();
      ensureDesktopSearchToggle();
      ensureMobileSearchToggle();
      ensureSearchPanel();
      hideOriginalSearchFormsAfterIconMount();
      if (searchOpen) setSearchOpen(true);
    } else {
      setSearchIconReady(false);
      ensureAlwaysVisibleSearch();
    }
    try {
      injectBusinessInfoOnce(lastSettings);
    } catch (eBi) {}
    try {
      ensureFooterLinkIcons(lastSettings);
    } catch (eIc) {}
    try {
      ensureHiddenBoardNav(lastSettings);
    } catch (eHb) {}
    try {
      syncHeaderCurrencyVisibility();
    } catch (eCur) {}
    try {
      syncAuthPageClass();
      restoreAuthFormCards();
    } catch (eAuth) {}
    try {
      hidePoweredBy();
    } catch (ePb) {}
  }

  function scheduleEnsureHeaderUx() {
    if (ensureTimer) clearTimeout(ensureTimer);
    ensureTimer = setTimeout(function () {
      ensureTimer = null;
      ensureHeaderUx();
    }, ENSURE_DEBOUNCE_MS);
  }

  function applyCssOnly(settings) {
    lastSettings = settings || {};
    renderStyle(lastSettings);
    scheduleEnsureHeaderUx();
    scheduleHomeHideRetries();
  }

  function applyInitial(settings) {
    lastSettings = settings || {};
    // Prefer inline config Div if fetch returned emptier payload
    try {
      var cfg = document.getElementById(CFG_ID);
      if (cfg) {
        var raw = cfg.getAttribute("data-chd-settings");
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            // 0.2.13: empty [] from API/boot is intentional — do NOT fill from cfg.
            // Only adopt cfg slugs when key is missing/null (not when []).
            if (
              lastSettings.hide_header_board_slugs == null &&
              parsed.hide_header_board_slugs &&
              parsed.hide_header_board_slugs.length
            ) {
              lastSettings.hide_header_board_slugs = parsed.hide_header_board_slugs;
            }
            if (lastSettings.business_info_enabled == null && parsed.business_info_enabled != null) {
              lastSettings.business_info_enabled = parsed.business_info_enabled;
            }
            if (!lastSettings.business_info && parsed.business_info) {
              lastSettings.business_info = parsed.business_info;
            }
            if (!lastSettings.footer_link_groups && parsed.footer_link_groups) {
              lastSettings.footer_link_groups = parsed.footer_link_groups;
            }
          }
        }
      }
    } catch (eCfg) {}
    renderStyle(lastSettings);
    injectBusinessInfoOnce(lastSettings);
    ensureFooterLinkIcons(lastSettings);
    refreshBoardNameMap(lastSettings);
    ensureHiddenBoardNav(lastSettings);
    hidePoweredBy();
    bindThemeClickToggle();
    bindOutsideSearchClose();
    scheduleEnsureHeaderUx();
    scheduleHomeHideRetries();
    if (!lateEnsureBound) {
      lateEnsureBound = true;
      setTimeout(ensureHeaderUx, 600);
    }
  }


  function applyFromBoot() {
    try {
      var boot = window.__CHD_HOME_DESIGN__;
      if (boot && typeof boot === "object") {
        applyInitial(boot);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function refresh() {
    fetchSettings()
      .then(applyInitial)
      .catch(function () {
        /* keep boot settings if API fails */
        applyFromBoot();
      });
  }

  function scheduleSpaCssOnly() {
    var path = window.location && window.location.pathname;
    if (isProductDetailPath(path) || !isShopProductsListPath(path)) { stopShopListRuntime(); }
    if (spaTimer) clearTimeout(spaTimer);
    spaTimer = setTimeout(function () {
      spaTimer = null;
      if (lastSettings) applyCssOnly(lastSettings);
      else refresh();
    }, SPA_DEBOUNCE_MS);
  }

  function start() {
    if (applyFromBoot()) return;
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  try {
    var _push = history.pushState;
    history.pushState = function () {
      var r = _push.apply(this, arguments);
      scheduleSpaCssOnly();
      return r;
    };
    var _replace = history.replaceState;
    if (typeof _replace === "function") {
      history.replaceState = function () {
        var r = _replace.apply(this, arguments);
        scheduleSpaCssOnly();
        return r;
      };
    }
    window.addEventListener("popstate", scheduleSpaCssOnly);
  } catch (e) {}

})();
