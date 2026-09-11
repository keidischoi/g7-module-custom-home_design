/*! custom-home_design — max-width CSS var, hide desktop top nav, business info,
 *  header search icon+slide panel, dark-mode click toggle (feat UX port)
 * 0.2.13: boards hide consistent ALL pages; business BESIDE brand H3; emoji+SVG footer icons;
 *        empty hide list UNHIDES (never merge stale data-attr); NO layout scripts[];
 * 0.2.12: business under H3 (superseded); board hide apply; module.iife loader;
 *        read #chd_home_design_cfg data-chd-settings for boot.
 * 0.2.11: search panel form; business sibling (superseded); boards restore when empty.
 * MutationObserver intentionally not used (0.2.1 infinite remount loop).
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
    return (
      "#main_content > *:not([data-chd-full-bleed])," +
      "#main_content .chd-home-fill," +
      "#main_content [data-chd-home-fill]," +
      "#main_content .grid"
    );
  }

  function applyInlineMaxWidth(n) {
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
      var fillId = (fill.id || "").toLowerCase();
      if (fillId === "main_content") continue;
      if (fillId.indexOf("carousel") !== -1 || fillId.indexOf("hero") !== -1) continue;
      try {
        fill.style.setProperty("width", "100%", "important");
        fill.style.setProperty("max-width", "100%", "important");
        fill.style.setProperty("box-sizing", "border-box");
      } catch (err2) {}
    }
  }

  function renderStyle(settings) {
    var n = parseInt(settings && settings.content_max_width_px, 10);
    if (!n || n < 320) n = DEFAULT_MAX;
    var hide = coerceBool(settings && settings.hide_desktop_top_nav, false);
    var searchIcon = settingOn(settings, "header_search_icon_mode", true);
    var themeClick = settingOn(settings, "header_theme_click_toggle", true);
    document.documentElement.style.setProperty("--chd-content-max-width", n + "px");

    var css =
      ":root{--chd-content-max-width:" +
      n +
      "px;}" +
      contentColumnSelector() +
      "{max-width:var(--chd-content-max-width)!important;" +
      "width:100%!important;margin-inline:auto!important;box-sizing:border-box!important;}" +
      homeFillSelector() +
      "{width:100%!important;max-width:100%!important;box-sizing:border-box!important;" +
      "padding-left:0!important;padding-right:0!important;}" +
      "#main_content,.chd-content-col{" +
      "padding-left:1rem!important;padding-right:1rem!important;}" +
      "@media (min-width:640px){#main_content,.chd-content-col{" +
      "padding-left:1.5rem!important;padding-right:1.5rem!important;}}" +
      "@media (min-width:1024px){#main_content,.chd-content-col{" +
      "padding-left:2rem!important;padding-right:2rem!important;}}" +
      "[data-chd-hide-powered-by='1']{display:none!important;}" +
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
      // Hide ONLY original center search (h-16 row > form). NEVER hide #chd_header_search_panel form
      // — blanket "header.chd-desktop-header form" made the slide INPUT invisible (0.2.10 bug).
      css +=
        "#desktop_header .flex.items-center.justify-between.h-16 > form," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "header.sticky .flex.items-center.justify-between.h-16 > form," +
        "header.sticky .flex.items-center.justify-between.h-16 > form.flex.flex-1.max-w-lg," +
        "header.sticky .flex.items-center.justify-between.h-16 > form.max-w-lg," +
        "header.chd-desktop-header .flex.items-center.justify-between.h-16 > form," +
        "header.sticky form.flex.flex-1.max-w-lg.mx-8{" +
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
      // Remove our injected widgets if mode off
      css +=
        "#" +
        DESKTOP_TOGGLE_ID +
        ",#" +
        MOBILE_TOGGLE_ID +
        ",#" +
        PANEL_ID +
        "{display:none!important;}";
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
    syncHeaderCurrencyVisibility();

    ensureStyleEl().textContent = css;
    applyInlineMaxWidth(n);
  }

  function headerCurrencyHideCss() {
    return (
      "html.chd-hide-header-currency [data-testid='currency-switcher']," +
      "html.chd-hide-header-currency [id^='ext_header_currency_selector']," +
      "html.chd-hide-header-currency #header_currency_slot_desktop{" +
      "visibility:hidden!important;pointer-events:none!important;}" +
      "html.chd-hide-header-currency #mobile_drawer_currency_wrap{" +
      "display:none!important;visibility:hidden!important;pointer-events:none!important;}"
    );
  }

  function shopBasePath() {
    try {
      var cfg = window.G7Config || {};
      if (cfg.shopBase) return String(cfg.shopBase);
    } catch (e) {}
    return "/shop";
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

  function ensureDesktopSearchToggle() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) return;
    var cluster = findDesktopRightCluster();
    if (!cluster) return;
    var existing = document.getElementById(DESKTOP_TOGGLE_ID);
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

  function ensureHeaderUx() {
    if (!lastSettings) return;
    ensureDesktopSearchToggle();
    ensureMobileSearchToggle();
    ensureSearchPanel();
    // Re-sync open class if panel was remounted
    if (searchOpen) setSearchOpen(true);
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
    // Delayed ensures for late React remount + SPA page switches (home vs other).
    setTimeout(ensureHeaderUx, 400);
    setTimeout(ensureHeaderUx, 1000);
    setTimeout(ensureHeaderUx, 2500);
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
    if (spaTimer) clearTimeout(spaTimer);
    spaTimer = setTimeout(function () {
      spaTimer = null;
      if (lastSettings) applyCssOnly(lastSettings);
      else refresh();
    }, SPA_DEBOUNCE_MS);
  }

  function start() {
    // Instant apply from boot.js embedded settings (DB flags without waiting on fetch)
    applyFromBoot();
    // Then refresh from public API (source of truth)
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

  // MutationObserver intentionally not used (0.2.1 infinite remount loop).
})();
