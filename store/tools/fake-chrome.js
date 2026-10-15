// Stubs chrome.devtools with sample requests so panel.html renders outside DevTools for screenshots.
(function () {
  const PAGE = "https://www.example.com/shoes/trail-runner?size=10";
  const API  = "https://api.example.com";
  const t0   = Date.parse("2026-10-15T09:41:00.000Z");

  const reqHeaders = (extra = []) => [
    { name: ":authority", value: "api.example.com" },
    { name: "accept", value: "application/json" },
    { name: "authorization", value: "Bearer eyJhbGciOi…" },
    { name: "content-type", value: "application/json" },
    { name: "origin", value: "https://www.example.com" },
    { name: "referer", value: PAGE },
    { name: "user-agent", value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
    { name: "x-request-id", value: "9f2c1a7e-41b0-4d8e-b2a1-0c6f1e7d3a55" },
    ...extra,
  ];
  const resHeaders = [
    { name: "access-control-allow-origin", value: "https://www.example.com" },
    { name: "cache-control", value: "no-store" },
    { name: "content-type", value: "application/json; charset=utf-8" },
    { name: "date", value: "Thu, 15 Oct 2026 09:41:02 GMT" },
    { name: "server-timing", value: "app;dur=38" },
    { name: "x-request-id", value: "9f2c1a7e-41b0-4d8e-b2a1-0c6f1e7d3a55" },
  ];

  const samples = [
    ["xhr",   "GET",    `${API}/v1/session`, 200, null, { user: { id: "u_1042", name: "Sam Rivera" }, expiresIn: 3600 }, 84],
    ["fetch", "GET",    "https://cdn.example.com/config/flags.json", 200, null, { newCheckout: true, reviewsV2: false }, 31],
    ["fetch", "GET",    `${API}/v1/products?category=shoes&page=1`, 200, null, { page: 1, total: 128, items: [{ sku: "sku_4821", name: "Trail Runner", price: 89.0 }] }, 142],
    ["fetch", "GET",    `${API}/v1/products/sku_4821/reviews?limit=5`, 200, null, { rating: 4.6, count: 312, reviews: [] }, 97],
    ["fetch", "POST",   `${API}/v1/cart/items`, 201,
      { productId: "sku_4821", qty: 1, size: "10", color: "slate" },
      { cartId: "c_7731", item: { id: "ci_93", productId: "sku_4821", qty: 1, size: "10", color: "slate", price: 89.0 }, subtotal: 89.0, currency: "USD" }, 118],
    ["fetch", "GET",    `${API}/v1/cart`, 200, null, { cartId: "c_7731", items: 1, subtotal: 89.0 }, 46],
    ["fetch", "POST",   `${API}/graphql`, 200, { query: "query Recs($sku: ID!) { recommendations(sku: $sku) { sku name price } }", variables: { sku: "sku_4821" } }, { data: { recommendations: [{ sku: "sku_5110", name: "Road Glide", price: 99.0 }] } }, 163],
    ["xhr",   "POST",   "https://events.example.org/collect", 204, { event: "add_to_cart", sku: "sku_4821" }, null, 22],
    ["fetch", "PATCH",  `${API}/v1/cart/items/ci_93`, 200, { qty: 2 }, { id: "ci_93", qty: 2, subtotal: 178.0 }, 74],
    ["fetch", "POST",   `${API}/v1/checkout/quote`, 422, { cartId: "c_7731", shipTo: { zip: "" } }, { error: "validation_failed", fields: { "shipTo.zip": "required" } }, 58],
    ["fetch", "GET",    `${API}/v1/user/addresses`, 200, null, { addresses: [{ id: "a_1", city: "Portland", zip: "97201" }] }, 66],
    ["fetch", "POST",   `${API}/v1/checkout/quote`, 200, { cartId: "c_7731", shipTo: { zip: "97201" } }, { subtotal: 178.0, shipping: 0, tax: 0, total: 178.0 }, 131],
    ["xhr",   "POST",   "https://events.example.org/collect", 204, { event: "begin_checkout", value: 178.0 }, null, 19],
    ["fetch", "DELETE", `${API}/v1/cart/items/ci_77`, 204, null, null, 41],
  ];

  const entries = samples.map(([type, method, url, status, payload, body, time], i) => ({
    _resourceType: type,
    startedDateTime: new Date(t0 + i * 850).toISOString(),
    time,
    request: {
      method, url,
      headers: reqHeaders(),
      postData: payload ? { text: JSON.stringify(payload) } : undefined,
    },
    response: { status, headers: resHeaders, content: { mimeType: "application/json" } },
    getContent: (cb) => cb(body ? JSON.stringify(body) : "", null),
  }));

  window.chrome = {
    devtools: {
      inspectedWindow: { eval: (_expr, cb) => cb(PAGE) },
      network: {
        getHAR: (cb) => cb({ entries }),
        onRequestFinished: { addListener() {} },
        onNavigated: { addListener() {} },
      },
    },
  };
})();
