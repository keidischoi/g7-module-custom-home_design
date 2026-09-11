/*! custom-home_design module.iife — loaded ONLY while module is active (ModuleAssetLoader).
 * Does NOT use layout scripts[] ids (avoids G7 AssetFailureNotice toast when disabled).
 * 1) Read inline settings from #chd_home_design_cfg[data-chd-settings]
 * 2) Dynamically inject home-design.js via DOM (not layout script loader)
 */
(function () {
  if (window.__chdHomeDesignIife) return;
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

  // Apply critical hide-nav / search CSS from embedded settings (boot.js replacement)
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
    if (s.header_search_icon_mode !== false && s.header_search_icon_mode !== 0 && s.header_search_icon_mode !== "0") {
      cssParts.push(
        "header.sticky .flex.items-center.justify-between.h-16 > form," +
          "header.chd-desktop-header .flex.items-center.justify-between.h-16 > form{" +
          "display:none!important;}"
      );
    }
    if (cssParts.length) {
      var st = document.getElementById("chd-home-design-boot-style");
      if (!st) {
        st = document.createElement("style");
        st.id = "chd-home-design-boot-style";
        (document.head || document.documentElement).appendChild(st);
      }
      st.textContent = cssParts.join("");
    }
  } catch (e5) {}

  function injectHomeDesignJs() {
    var sid = "chd-hd-js-dom"; // NOT chd_home_design_js (layout script id)
    if (document.getElementById(sid)) return;
    if (window.__chdHomeDesignJsLoading) return;
    var existing = document.querySelector('script[src*="custom-home_design/assets/home-design"]');
    if (existing) return;
    window.__chdHomeDesignJsLoading = true;
    var urls = [
      "/api/modules/custom-home_design/assets/home-design.js?v=0.2.20",
      "/api/modules/custom-home_design/assets/home-design?v=0.2.20",
    ];
    var idx = 0;
    function tryNext() {
      if (idx >= urls.length) {
        try {
          console.warn("[custom-home_design] home-design.js failed to load — footer/board JS inactive. Run: php82 artisan module:update custom-home_design --source=bundled --force && php82 artisan hooks:clear && php82 artisan cache:clear && php82 artisan route:clear");
        } catch (eW) {}
        window.__chdHomeDesignJsLoading = false;
        return;
      }
      var scr = document.createElement("script");
      if (idx === 0) scr.id = sid;
      scr.src = urls[idx++];
      scr.async = false;
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
