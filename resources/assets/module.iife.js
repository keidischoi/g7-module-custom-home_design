/*! custom-home_design module.iife — loaded ONLY while module is active (ModuleAssetLoader).
 * 0.2.46: asset cache-bust; boot must NOT hide the original search form — home-design.js hides it only
 * after the search icon toggle is mounted (avoids blank header if JS is slow/fails).
 */
(function () {
  if (window.__chdHomeDesignIife) return;
  try {
    var p = String((window.location && window.location.pathname) || "");
    if (p === "/admin" || p.indexOf("/admin/") === 0) {
      window.__chdHomeDesignIife = true;
      return;
    }
  } catch (eAdmin) {}
  window.__chdHomeDesignIife = true;

  try {
    var el = document.getElementById("chd_home_design_cfg");
    if (el) {
      var raw = el.getAttribute("data-chd-settings");
      if (raw) {
        try {
          window.__CHD_HOME_DESIGN__ = JSON.parse(raw);
        } catch (e) {
          window.__CHD_HOME_DESIGN__ = window.__CHD_HOME_DESIGN__ || {};
        }
      }
    }
  } catch (e2) {}

  try {
    var s = window.__CHD_HOME_DESIGN__ || {};
    var hide =
      s.hide_desktop_top_nav === true ||
      s.hide_desktop_top_nav === 1 ||
      s.hide_desktop_top_nav === "1";
    if (hide) {
      try {
        document.documentElement.classList.add("chd-hide-desktop-top-nav");
      } catch (e3) {}
      if (document.body) {
        try {
          document.body.classList.add("chd-hide-desktop-top-nav");
        } catch (e4) {}
      }
    }
    var cssParts = [];
    if (hide) {
      cssParts.push(
        "@media (min-width:1024px){" +
          "html.chd-hide-desktop-top-nav #desktop_header nav," +
          "body.chd-hide-desktop-top-nav #desktop_header nav," +
          "html.chd-hide-desktop-top-nav header.sticky nav," +
          "body.chd-hide-desktop-top-nav header.sticky nav," +
          "#desktop_header nav,header.sticky nav," +
          "header[data-chd-hide-top-nav='1'] nav,header.chd-hide-top-nav nav," +
          "[data-chd-hide-top-nav='1'] nav{" +
          "display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;}" +
          "}"
      );
    }
    // 0.2.46: never hide header search form here
    var st = document.getElementById("chd-home-design-boot-style");
    if (!st) {
      st = document.createElement("style");
      st.id = "chd-home-design-boot-style";
      (document.head || document.documentElement).appendChild(st);
    }
    st.textContent = cssParts.join("");
  } catch (e5) {}

  function injectHomeDesignJs() {
    var sid = "chd-hd-js-dom";
    if (document.getElementById(sid)) return;
    if (window.__chdHomeDesignJsLoading) return;
    var existing = document.querySelector('script[src*="custom-home_design/assets/home-design"]');
    if (existing) return;
    window.__chdHomeDesignJsLoading = true;
    var urls = [
      "/api/modules/custom-home_design/assets/home-design.js?v=0.2.46",
      "/api/modules/custom-home_design/assets/home-design?v=0.2.46",
    ];
    var idx = 0;
    function tryNext() {
      if (idx >= urls.length) {
        try {
          console.warn("[custom-home_design] home-design.js failed to load");
        } catch (eW) {}
        window.__chdHomeDesignJsLoading = false;
        return;
      }
      var scr = document.createElement("script");
      if (idx === 0) scr.id = sid;
      scr.src = urls[idx++];
      scr.async = true;
      scr.onload = function () {
        window.__chdHomeDesignJsLoading = false;
      };
      scr.onerror = function () {
        try {
          scr.remove();
        } catch (e) {}
        tryNext();
      };
      (document.head || document.documentElement).appendChild(scr);
    }
    tryNext();
  }

  injectHomeDesignJs();
})();
