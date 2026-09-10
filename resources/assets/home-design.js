/*! custom-home_design — max-width CSS var, hide desktop top nav, business info (once)
 * 0.2.1: MutationObserver removed (was fighting React footer remounts → infinite loop).
 * CSS applied on settings fetch; SPA popstate/pushState debounced re-apply CSS only.
 * Business HTML: prefer PHP-filled mount; JS injects only once when mount is empty.
 */
(function () {
  if (window.__chdHomeDesignInstalled) return;
  window.__chdHomeDesignInstalled = true;

  var SETTINGS_URL = "/api/modules/custom-home_design/settings";
  var STYLE_ID = "chd-home-design-style";
  var BUSINESS_ID = "chd_business_info_block";
  var MOUNT_ID = "chd_business_info_mount";
  var DEFAULT_MAX = 1240;
  var SPA_DEBOUNCE_MS = 300;

  /** @type {object|null} */
  var lastSettings = null;
  /** @type {string} */
  var lastBusinessSig = "";
  /** @type {number|null} */
  var spaTimer = null;
  var businessInjectedOnce = false;

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
        if (data && data.data && typeof data.data === "object" && data.enabled === undefined) {
          data = data.data;
        }
        return data || {};
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

  function renderStyle(settings) {
    var n = parseInt(settings && settings.content_max_width_px, 10);
    if (!n || n < 320) n = DEFAULT_MAX;
    var hide = !!(settings && settings.hide_desktop_top_nav);
    document.documentElement.style.setProperty("--chd-content-max-width", n + "px");

    var css =
      ":root{--chd-content-max-width:" +
      n +
      "px;}" +
      "#main_content," +
      "#main_content.max-w-7xl," +
      "[data-chd-max-width]," +
      "#desktop_header nav .max-w-7xl," +
      "#desktop_header .max-w-7xl," +
      "#footer .max-w-7xl," +
      "#chd_business_info_mount .max-w-7xl," +
      "#chd_business_info_block .chd-bi-inner{" +
      "max-width:var(--chd-content-max-width)!important;}";

    if (hide) {
      css +=
        "@media (min-width:1024px){" +
        "#desktop_header nav.border-t," +
        "#desktop_header nav[class*='border-t']," +
        "#desktop_header nav:has([data-testid='nav-home'])," +
        "#desktop_header nav:has([data-testid='nav-popular']){" +
        "display:none!important;}" +
        "}";
    }

    ensureStyleEl().textContent = css;

    var mc = document.getElementById("main_content");
    if (mc) {
      try {
        mc.style.maxWidth = n + "px";
      } catch (e) {}
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
    if (!settings || !settings.business_info_enabled) return "";
    return buildBusinessParts(settings.business_info).join("  |  ");
  }

  /**
   * Inject business HTML only when mount is empty (or missing block).
   * Never wipe/rebuild if the same signature is already present.
   * Prefer PHP listener server-rendered children; this is a one-shot fallback.
   */
  function injectBusinessInfoOnce(settings) {
    if (!settings || !settings.business_info_enabled) return;

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
      // Different signature already in DOM (e.g. PHP) — leave it alone.
      if (existingSig || existing.textContent.trim()) {
        lastBusinessSig = existingSig || existing.textContent.trim();
        businessInjectedOnce = true;
        return;
      }
    }

    var mount = document.getElementById(MOUNT_ID);
    if (mount && mount.children && mount.children.length > 0) {
      // PHP (or prior inject) already filled mount — do not wipe/rebuild.
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

    // No mount (extension missing): one-shot insert before footer, never again.
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

  function applyCssOnly(settings) {
    lastSettings = settings || {};
    if (!lastSettings.enabled) {
      clearStyle();
      return;
    }
    renderStyle(lastSettings);
  }

  function applyInitial(settings) {
    lastSettings = settings || {};
    if (!lastSettings.enabled) {
      clearStyle();
      return;
    }
    renderStyle(lastSettings);
    injectBusinessInfoOnce(lastSettings);
  }

  function refresh() {
    fetchSettings()
      .then(applyInitial)
      .catch(function () {
        /* module may be inactive */
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  // SPA route changes — re-apply CSS only (debounced). Do NOT rebuild business HTML.
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

  // MutationObserver intentionally removed in 0.2.1 (infinite remount loop with React footer).
})();
