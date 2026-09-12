/*! custom-home_design 0.2.36 — load 0.2.35 source then apply detail-page loading fix */
(function () {
  if (window.__chdHomeDesignInstalled) return;

  var SRC =
    "https://cdn.jsdelivr.net/gh/keidischoi/g7-module-custom-home_design@6a79672db28b5f93de7c9c6c3cb1b753c1c9e5b4/resources/assets/home-design.js";

  function inject(src) {
    var stopFn =
      "function isProductDetailPath(path) {" +
      "path = normalizePath(path);" +
      "var base = normalizePath(shopBasePath());" +
      "var prefix = base === \"/\" ? \"/products/\" : base + \"/products/\";" +
      "return path.indexOf(prefix) === 0 && path !== prefix.slice(0, -1);}" +
      "function stopShopListRuntime() {" +
      "shopScroll.hasMore = false;shopScroll.loading = false;" +
      "if (shopScroll.observer) {try {shopScroll.observer.disconnect();} catch (eStop) {}shopScroll.observer = null;}" +
      "shopScroll.observed = null;" +
      "try {document.documentElement.classList.remove(\"chd-shop-quiet-nav\");} catch (eCls) {}" +
      "try {document.body && document.body.classList.remove(\"chd-shop-quiet-nav\");} catch (eBody) {}}";

    src = src.replace(
      "function isShopProductsListPath(path) {",
      stopFn + "\n  function isShopProductsListPath(path) {"
    );

    src = src.replace(
      "function bindShopInfiniteScroll() {\n    var key = shopScrollKey();",
      "function bindShopInfiniteScroll() {\n    if (isProductDetailPath(window.location && window.location.pathname)) { stopShopListRuntime(); return; }\n    var key = shopScrollKey();"
    );

    src = src.replace(
      "function syncShopQuietNav() {\n    var on = isShopProductsListPath(window.location && window.location.pathname);",
      "function syncShopQuietNav() {\n    var path = window.location && window.location.pathname;\n    if (isProductDetailPath(path) || !isShopProductsListPath(path)) { stopShopListRuntime(); return; }\n    var on = true;"
    );

    src = src.replace(
      "if (!t.closest(\"#chd_shop_category_row, [data-chd-shop-list], #chd_shop_sort_bar, .chd-shop-sort-bar\")) {",
      "if (t.closest(\"#cdp_share_list, [id*='cdp_share'], .chd-product-card, a[href*='/products/']\")) { stopShopListRuntime(); return; }\n        if (!t.closest(\"#chd_shop_category_row, [data-chd-shop-list], #chd_shop_sort_bar, .chd-shop-sort-bar\")) {"
    );

    src = src.replace(
      "function scheduleSpaCssOnly() {\n    if (spaTimer) clearTimeout(spaTimer);",
      "function scheduleSpaCssOnly() {\n    var path = window.location && window.location.pathname;\n    if (isProductDetailPath(path) || !isShopProductsListPath(path)) { stopShopListRuntime(); }\n    if (spaTimer) clearTimeout(spaTimer);"
    );

    (0, eval)(src);
  }

  fetch(SRC, { credentials: \"omit\", cache: \"force-cache\" })
    .then(function (r) {
      if (!r.ok) throw new Error(\"home-design source \" + r.status);
      return r.text();
    })
    .then(inject)
    .catch(function (err) {
      try {
        console.warn(\"[custom-home_design] detail-fix loader failed\", err);
      } catch (e) {}
    });
})();
