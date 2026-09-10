/*! custom-home_design — max-width CSS var, hide desktop top nav, business info,
 *  header search icon+slide panel, dark-mode click toggle (feat UX port)
 * 0.2.1: MutationObserver removed (was fighting React footer remounts → infinite loop).
 * 0.2.2: business_info from sirsoft-ecommerce basic_info (public settings API).
 * 0.2.4: content_max_width_px also drives #main_content_area / home lower columns;
 *        settings.enabled gate removed (module manager activation is enough).
 * 0.2.5: header search/dark UX; home mid Container maxWidth; admin bool round-trip;
 *        expanded mid-home width selectors; icons in right header cluster.
 * 0.2.6: remove business block when disabled; broader desktop top-nav hide selectors;
 *        body.chd-hide-desktop-top-nav class; settings fetch failure never breaks page.
 * CSS applied on settings fetch; SPA popstate/pushState debounced re-apply CSS only.
 * Business HTML: prefer PHP-filled mount; JS injects only once when mount is empty.
 * Header widgets: ensure-if-missing on load + SPA debounce (no MutationObserver).
 */
(function () {
  if (window.__chdHomeDesignInstalled) return;
  window.__chdHomeDesignInstalled = true;

  var SETTINGS_URL = "/api/modules/custom-home_design/settings";
  var STYLE_ID = "chd-home-design-style";
  var BUSINESS_ID = "chd_business_info_block";
  var MOUNT_ID = "chd_business_info_mount";
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
      "#main_content_area .max-w-7xl," +
      "#main_content .max-w-7xl," +
      "[data-chd-max-width]," +
      "#desktop_header .max-w-7xl," +
      "#footer .max-w-7xl," +
      "#chd_business_info_mount .max-w-7xl," +
      "#chd_business_info_block .chd-bi-inner," +
      "#main_content_area [class*='max-w-']," +
      "#main_content [class*='max-w-']," +
      /* home mid/lower: root Container + nested width-constrained wrappers */
      "#main_content > div," +
      "#main_content > section," +
      "#main_content [data-chd-max-width]," +
      "#main_content .mx-auto[class*='px-']," +
      "#main_content_area [data-chd-max-width]"
    );
  }

  function applyInlineMaxWidth(n) {
    var sel = contentColumnSelector();
    var nodes;
    try {
      nodes = document.querySelectorAll(sel);
    } catch (e) {
      nodes = [];
    }
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute && el.getAttribute("data-chd-full-bleed") === "1") continue;
      try {
        el.style.maxWidth = n + "px";
        el.style.marginInline = "auto";
      } catch (err) {}
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
      "width:100%;margin-inline:auto;}" +
      /* Force Tailwind max-w-* under main home content to honor CSS var */
      "#main_content [class*='max-w-']," +
      "#main_content_area [class*='max-w-']{" +
      "max-width:var(--chd-content-max-width)!important;}" +
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
      // Hide official center search form; show our right-cluster icon + slide panel.
      css +=
        "#desktop_header form.flex.flex-1.max-w-lg," +
        "#desktop_header form.max-w-lg," +
        "#desktop_header .flex.items-center.justify-between.h-16 > form{" +
        "display:none!important;}" +
        "#" +
        PANEL_ID +
        "{overflow:hidden;transition:max-height .3s ease,opacity .3s ease;" +
        "border-color:rgb(229 231 235);background:#fff;}" +
        ".dark #" +
        PANEL_ID +
        "{border-color:rgb(31 41 55);background:rgb(17 24 39);}" +
        "#" +
        PANEL_ID +
        ".chd-search-open{max-height:96px;opacity:1;pointer-events:auto;border-top-width:1px;border-top-style:solid;}" +
        "#" +
        PANEL_ID +
        ":not(.chd-search-open){max-height:0;opacity:0;pointer-events:none;border-top-width:0;}" +
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
        '#desktop_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute.w-48,' +
        '#mobile_header .relative:has(>[aria-label="Toggle theme"]) > div.absolute.w-48,' +
        "#mobile_theme_btn > div.absolute{" +
        "display:none!important;visibility:hidden!important;pointer-events:none!important;}";
    }

    ensureStyleEl().textContent = css;
    applyInlineMaxWidth(n);
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
    var existing = document.getElementById(BUSINESS_ID);
    if (existing && existing.parentNode) {
      try {
        existing.parentNode.removeChild(existing);
      } catch (e) {}
    }
    var mount = document.getElementById(MOUNT_ID);
    if (mount) {
      try {
        mount.innerHTML = "";
      } catch (e2) {}
    }
    lastBusinessSig = "";
    businessInjectedOnce = false;
  }

  function injectBusinessInfoOnce(settings) {
    if (!settings || !coerceBool(settings.business_info_enabled, false)) {
      clearBusinessInfo();
      return;
    }

    var sig = businessSignature(settings);
    if (!sig) return;

    var existing = document.getElementById(BUSINESS_ID);
    if (existing) {
      var existingSig = existing.getAttribute("data-chd-sig") || "";
      if (existingSig === sig || existing.textContent.trim() === sig) {
        lastBusinessSig = sig;
        businessInjectedOnce = true;
        return;
      }
      if (existingSig || existing.textContent.trim()) {
        lastBusinessSig = existingSig || existing.textContent.trim();
        businessInjectedOnce = true;
        return;
      }
    }

    var mount = document.getElementById(MOUNT_ID);
    if (mount && mount.children && mount.children.length > 0) {
      lastBusinessSig = sig;
      businessInjectedOnce = true;
      return;
    }

    if (businessInjectedOnce && lastBusinessSig === sig) {
      return;
    }

    var html =
      '<div id="' +
      BUSINESS_ID +
      '" class="w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900" data-chd-role="business-info" data-chd-sig="' +
      escapeHtml(sig) +
      '">' +
      '<div class="chd-bi-inner mx-auto px-4 sm:px-6 lg:px-8 py-3" style="max-width:var(--chd-content-max-width,1240px)">' +
      '<p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400 text-left">' +
      escapeHtml(sig) +
      "</p></div></div>";

    if (mount) {
      mount.innerHTML = html;
      lastBusinessSig = sig;
      businessInjectedOnce = true;
      return;
    }

    if (businessInjectedOnce) return;
    var footer =
      document.getElementById("footer") ||
      document.querySelector('[id="footer"]') ||
      document.querySelector("footer");
    if (footer && footer.parentNode) {
      var wrap = document.createElement("div");
      wrap.innerHTML = html;
      var node = wrap.firstChild;
      footer.parentNode.insertBefore(node, footer);
      lastBusinessSig = sig;
      businessInjectedOnce = true;
    }
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
          !btn.closest("#mobile_theme_btn")
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
      panel.hidden = !searchOpen;
    }
    [desk, mob].forEach(function (btn) {
      if (!btn) return;
      btn.setAttribute("aria-expanded", searchOpen ? "true" : "false");
      if (searchOpen) btn.classList.add("chd-search-active");
      else btn.classList.remove("chd-search-active");
    });
    if (searchOpen && panel) {
      var input = panel.querySelector("input[type='search'], input[type='text']");
      if (input) {
        try {
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

  function findDesktopRightCluster() {
    var header = document.getElementById("desktop_header");
    if (!header) return null;
    // Official: .flex.items-center.justify-between.h-16 > last .flex.items-center (gap-2)
    var row = header.querySelector(".flex.items-center.justify-between.h-16");
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
          b.querySelector('[class*="shopping"], [data-icon*="cart"], .fa-shopping-cart'))
      ) {
        return b;
      }
    }
    return null;
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
    // After theme toggle if present, else append
    var themeBtn = cluster.querySelector('[aria-label="Toggle theme"]');
    if (themeBtn && themeBtn.parentNode) {
      var after = themeBtn.parentNode.nextSibling;
      // If theme is wrapped in .relative, insert after that wrapper's next sibling notification, or after wrapper
      var themeWrap = themeBtn.closest(".relative") || themeBtn;
      if (themeWrap.parentNode === cluster) {
        // Prefer before cart; else after notifications: insert near end but before user menu — append is OK fallback
        cluster.appendChild(node);
        return;
      }
    }
    cluster.appendChild(node);
  }

  function ensureDesktopSearchToggle() {
    if (!settingOn(lastSettings, "header_search_icon_mode", true)) return;
    if (document.getElementById(DESKTOP_TOGGLE_ID)) return;
    var cluster = findDesktopRightCluster();
    if (!cluster) return;
    insertBeforeCartOrAppend(cluster, buildSearchButton(DESKTOP_TOGGLE_ID));
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
    if (document.getElementById(PANEL_ID)) return;
    var panel = buildSearchPanel();
    // Prefer attach under desktop sticky header so it slides below the bar (feat).
    var desktop = document.getElementById("desktop_header");
    if (desktop) {
      desktop.appendChild(panel);
      return;
    }
    var mobile = document.getElementById("mobile_header");
    if (mobile && mobile.parentNode) {
      if (mobile.nextSibling) {
        mobile.parentNode.insertBefore(panel, mobile.nextSibling);
      } else {
        mobile.parentNode.appendChild(panel);
      }
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
    renderStyle(lastSettings);
    injectBusinessInfoOnce(lastSettings);
    bindThemeClickToggle();
    bindOutsideSearchClose();
    scheduleEnsureHeaderUx();
    // One delayed ensure for late React header mount (no MutationObserver).
    setTimeout(ensureHeaderUx, 600);
    setTimeout(ensureHeaderUx, 1500);
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
