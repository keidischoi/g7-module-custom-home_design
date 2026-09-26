/*! custom-home_design module.iife — user site only */
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

  function applyUserFavicon(url) {
    try {
      url = String(url || "").trim();
      if (!url) return;
      var id = "chd-home-favicon";
      var link = document.getElementById(id);
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "icon";
        (document.head || document.documentElement).appendChild(link);
      }
      link.setAttribute("href", url);
      var nodes = document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute("href", url);
      }
    } catch (eF) {}
  }

  function favFromSettings(s) {
    s = s || {};
    return String(s.favicon_url || s.favicon || "").trim();
  }

  try {
    applyUserFavicon(favFromSettings(window.__CHD_HOME_DESIGN__ || {}));
  } catch (eFav0) {}

  try {
    fetch("/api/modules/custom-home_design/settings", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var data = (j && j.data && j.data.data) || (j && j.data) || j || {};
        if (data && typeof data === "object") {
          window.__CHD_HOME_DESIGN__ = Object.assign({}, window.__CHD_HOME_DESIGN__ || {}, data);
          applyUserFavicon(favFromSettings(data));
        }
      })
      .catch(function () {});
  } catch (eFetch) {}

  function resolveAssetVersion() {
    return "0.2.65";
  }

  function injectHomeDesignJs() {
    var sid = "chd-hd-js-dom";
    if (document.getElementById(sid)) return;
    if (window.__chdHomeDesignJsLoading) return;
    var existing = document.querySelector('script[src*="custom-home_design/assets/home-design"]');
    if (existing) return;
    window.__chdHomeDesignJsLoading = true;
    var ver = resolveAssetVersion();
    var urls = [
      "/api/modules/custom-home_design/assets/home-design.js?v=" + encodeURIComponent(ver),
      "/api/modules/custom-home_design/assets/home-design?v=" + encodeURIComponent(ver),
    ];
    var idx = 0;
    function tryNext() {
      if (idx >= urls.length) {
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
        try { scr.remove(); } catch (e) {}
        tryNext();
      };
      (document.head || document.documentElement).appendChild(scr);
    }
    tryNext();
  }

  injectHomeDesignJs();
})();
