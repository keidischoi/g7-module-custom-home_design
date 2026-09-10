/*! custom-home_design — max-width CSS var, hide desktop top nav, business info before footer
 * Behavior ported from keidischoi/g7-template-sirsoft-basic feat/open-in-new-tab-1.1.51
 * without requiring feat Header/Footer React components on official sirsoft-basic.
 */
(function () {
  if (window.__chdHomeDesignInstalled) return;
  window.__chdHomeDesignInstalled = true;

  var SETTINGS_URL = "/api/modules/custom-home_design/settings";
  var STYLE_ID = "chd-home-design-style";
  var BUSINESS_ID = "chd_business_info_block";
  var DEFAULT_MAX = 1240;

  /** @type {object|null} */
  var lastSettings = null;

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
        // G7 success envelope: { success, data: {...} } or data nested
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

  function applyMaxWidth(px) {
    renderStyle(Object.assign({}, lastSettings || {}, { content_max_width_px: px }));
  }

  function applyHideDesktopTopNav(hide) {
    renderStyle(Object.assign({}, lastSettings || {}, { hide_desktop_top_nav: hide }));
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * feat Footer businessInfo — 번개장터형 "A  |  B  |  C"
   */
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

  function removeBusinessBlock() {
    var old = document.getElementById(BUSINESS_ID);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var mount = document.getElementById("chd_business_info_mount");
    if (mount) mount.innerHTML = "";
  }

  function injectBusinessInfo(settings) {
    removeBusinessBlock();
    if (!settings || !settings.business_info_enabled) return;

    var parts = buildBusinessParts(settings.business_info);
    if (!parts.length) return;

    var html =
      '<div id="' +
      BUSINESS_ID +
      '" class="w-full border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900" data-chd-role="business-info">' +
      '<div class="chd-bi-inner mx-auto px-4 sm:px-6 lg:px-8 py-3" style="max-width:var(--chd-content-max-width,1240px)">' +
      '<p class="text-xs leading-relaxed text-gray-500 dark:text-gray-400 text-left">' +
      escapeHtml(parts.join("  |  ")) +
      "</p></div></div>";

    var mount = document.getElementById("chd_business_info_mount");
    if (mount) {
      mount.innerHTML = html;
      return;
    }

    var footer =
      document.getElementById("footer") ||
      document.querySelector('[id="footer"]') ||
      document.querySelector("footer");
    if (footer && footer.parentNode) {
      var wrap = document.createElement("div");
      wrap.innerHTML = html;
      var node = wrap.firstChild;
      footer.parentNode.insertBefore(node, footer);
      return;
    }
  }

  function applyAll(settings) {
    lastSettings = settings || {};
    if (!lastSettings.enabled) {
      removeBusinessBlock();
      var el = document.getElementById(STYLE_ID);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      try {
        document.documentElement.style.removeProperty("--chd-content-max-width");
      } catch (e) {}
      return;
    }
    renderStyle(lastSettings);
    injectBusinessInfo(lastSettings);
  }

  function refresh() {
    fetchSettings()
      .then(applyAll)
      .catch(function () {
        /* module may be inactive */
      });
  }

  function schedule() {
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }

  // SPA route changes — re-apply DOM injections
  try {
    var _push = history.pushState;
    history.pushState = function () {
      var r = _push.apply(this, arguments);
      setTimeout(function () {
        if (lastSettings) applyAll(lastSettings);
        else refresh();
      }, 50);
      return r;
    };
    window.addEventListener("popstate", function () {
      setTimeout(function () {
        if (lastSettings) applyAll(lastSettings);
        else refresh();
      }, 50);
    });
  } catch (e) {}

  // Mutation: footer remounts
  try {
    var obs = new MutationObserver(function () {
      if (!lastSettings || !lastSettings.enabled) return;
      if (lastSettings.business_info_enabled && !document.getElementById(BUSINESS_ID)) {
        injectBusinessInfo(lastSettings);
      }
      var mc = document.getElementById("main_content");
      if (mc && lastSettings.content_max_width_px) {
        applyMaxWidth(lastSettings.content_max_width_px);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e2) {}
})();
