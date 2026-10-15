/**
 * panel.js – collects XHR/fetch requests from the DevTools network log
 * (chrome.devtools.network) and renders them. Nothing runs in the page.
 */

let entries         = [];
let selected        = null;
let filterVal       = "";
let selectedDomains = new Set(); // empty = all domains shown
let preserveLog     = false;
let currentPage     = "";
let nextId          = 1;
let renderQueued    = false;

const CAPTURED_TYPES = new Set(["xhr", "fetch"]);
const TEXT_MIME      = /json|text|xml|javascript|graphql|x-www-form-urlencoded/i;
// Headers Postman sets itself; HTTP/2 pseudo-headers (":authority" …) are dropped too.
const POSTMAN_SKIP_HEADERS = new Set(["host", "content-length", "connection", "accept-encoding"]);

// ── Capture ───────────────────────────────────────────────────────────────────
// Seed with requests DevTools already recorded, then listen for new ones.
chrome.devtools.inspectedWindow.eval("location.href", (href) => {
  if (typeof href === "string") currentPage = href;
  chrome.devtools.network.getHAR((log) => {
    (log?.entries || []).forEach(capture);
    chrome.devtools.network.onRequestFinished.addListener(capture);
  });
});

// Clears logs on page change unless Preserve Log is ON
chrome.devtools.network.onNavigated.addListener((url) => {
  currentPage = url;
  if (!preserveLog) clearAll();
});

function capture(har) {
  if (!CAPTURED_TYPES.has(har._resourceType)) return;
  const entry = toEntry(har);
  entries.push(entry);
  scheduleRender();
  if (typeof har.getContent !== "function") return;
  har.getContent((content, encoding) => {
    entry.responseBody = decodeBody(content, encoding, entry.mimeType);
    if (entry.id === selected) renderDetail();
  });
}

function toEntry(har) {
  const { request, response } = har;
  let domain = "";
  try { domain = new URL(request.url).hostname; } catch { domain = ""; }
  return {
    id: nextId++,
    type: har._resourceType === "xhr" ? "XHR" : "Fetch",
    method: request.method,
    url: request.url,
    domain,
    page: currentPage,
    status: response.status,
    durationMs: Math.max(0, Math.round(har.time || 0)),
    requestHeaders: request.headers || [],
    responseHeaders: response.headers || [],
    requestPayload: parseMaybeJSON(request.postData?.text),
    responseBody: null,
    mimeType: response.content?.mimeType || "",
    timestamp: har.startedDateTime,
  };
}

function parseMaybeJSON(text) {
  if (text == null || text === "") return null;
  try { return JSON.parse(text); } catch { return text; }
}

function decodeBody(content, encoding, mimeType) {
  if (content == null) return null;
  if (encoding === "base64") {
    if (!TEXT_MIME.test(mimeType)) {
      return `[binary ${mimeType || "data"}, ~${Math.floor(content.length * 3 / 4)} bytes]`;
    }
    try {
      content = new TextDecoder().decode(Uint8Array.from(atob(content), c => c.charCodeAt(0)));
    } catch { return "[body could not be decoded]"; }
  }
  return parseMaybeJSON(content);
}

// Batches renders so busy pages don't redraw the list once per request
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => {
    renderQueued = false;
    buildDomainFilter(); renderList(); updateCount();
  }, 100);
}

function clearAll() {
  entries = []; selected = null;
  selectedDomains.clear();
  buildDomainFilter(); renderList(); renderDetail(); updateCount();
}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const listEl             = document.getElementById("list");
const detailEl           = document.getElementById("detail");
const countEl            = document.getElementById("count");
const filterEl           = document.getElementById("filter");
const btnPostmanSelected = document.getElementById("btnPostmanSelected");

document.getElementById("btnClear").addEventListener("click", clearAll);

// ── Preserve Log toggle ────────────────────────────────────────────────────────
const btnPreserve = document.getElementById("btnPreserve");
btnPreserve.addEventListener("click", () => {
  preserveLog = !preserveLog;
  btnPreserve.classList.toggle("active", preserveLog);
  btnPreserve.title = preserveLog
    ? "Preserve Log: ON — logs are kept across page navigations"
    : "Preserve Log: OFF — logs clear on navigation";
});

// ── Domain multiselect ─────────────────────────────────────────────────────────
const domainFilterBtn  = document.getElementById("domainFilterBtn");
const domainDropdown   = document.getElementById("domainDropdown");
const domainListEl     = document.getElementById("domainList");
const domainBadge      = document.getElementById("domainBadge");

domainFilterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  domainDropdown.classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!domainDropdown.contains(e.target) && e.target !== domainFilterBtn) {
    domainDropdown.classList.remove("open");
  }
});

document.getElementById("ddSelectAll").addEventListener("click", () => {
  domainListEl.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.checked = true;
    selectedDomains.add(cb.value);
  });
  updateDomainBadge();
  renderList(); updateCount();
});

document.getElementById("ddClearAll").addEventListener("click", () => {
  domainListEl.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  selectedDomains.clear();
  updateDomainBadge();
  renderList(); updateCount();
});

function buildDomainFilter() {
  const allDomains = [...new Set(entries.map(e => e.domain || "").filter(Boolean))].sort();
  // Remove options for domains no longer present
  [...selectedDomains].forEach(d => { if (!allDomains.includes(d)) selectedDomains.delete(d); });

  if (allDomains.length === 0) {
    const empty = el("div", "domain-option", "No domains yet");
    empty.style.cssText = "color:#555;cursor:default";
    domainListEl.replaceChildren(empty);
    updateDomainBadge();
    return;
  }
  domainListEl.replaceChildren();
  allDomains.forEach(domain => {
    const label = document.createElement("label");
    label.className = "domain-option";
    const cb = document.createElement("input");
    cb.type  = "checkbox";
    cb.value = domain;
    cb.checked = selectedDomains.has(domain);
    cb.addEventListener("change", () => {
      if (cb.checked) selectedDomains.add(domain);
      else            selectedDomains.delete(domain);
      updateDomainBadge();
      renderList(); updateCount();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(domain));
    domainListEl.appendChild(label);
  });
  updateDomainBadge();
}

function updateDomainBadge() {
  if (selectedDomains.size > 0) {
    domainBadge.textContent = selectedDomains.size;
    domainBadge.style.display = "inline";
  } else {
    domainBadge.style.display = "none";
  }
}

document.getElementById("btnExportJSON").addEventListener("click", exportJSON);
document.getElementById("btnExportCSV").addEventListener("click", exportCSV);
document.getElementById("btnPostmanAll").addEventListener("click", exportPostmanAll);
btnPostmanSelected.addEventListener("click", exportPostmanSelected);

filterEl.addEventListener("input", () => {
  filterVal = filterEl.value.toLowerCase();
  renderList();
  updateCount();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function filtered() {
  return entries.filter(e => {
    if (filterVal && !e.url?.toLowerCase().includes(filterVal)) return false;
    if (selectedDomains.size > 0 && !selectedDomains.has(e.domain || "")) return false;
    return true;
  });
}

function statusClass(s) {
  if (!s)       return "status-err";
  if (s < 400)  return "status-ok";
  return "status-err";
}

// Builds an element with text set via textContent, so captured data is never parsed as HTML
function el(tag, className, text, title) {
  const node = document.createElement(tag);
  if (className)  node.className = className;
  if (text != null) node.textContent = String(text);
  if (title)      node.title = title;
  return node;
}

function shortPath(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch { return url || "—"; }
}

function renderList() {
  const header = listEl.querySelector(".header-row");
  listEl.replaceChildren(header);

  filtered().forEach((e) => {
    const row = el("div", "row" + (e.id === selected ? " selected" : ""));
    row.append(
      el("span", `badge ${e.type}`, e.type),
      el("span", "method", e.method),
      el("span", "url-cell", shortPath(e.url), e.url),
      el("span", "page-cell", e.page ? shortPath(e.page) : "—", e.page),
      el("span", "domain-cell", e.domain || "—", e.domain),
      el("span", statusClass(e.status), e.status || "ERR"),
    );
    row.addEventListener("click", () => { selected = e.id; renderList(); renderDetail(); });
    listEl.appendChild(row);
  });
}

function fmt(v) {
  if (v == null) return "—";
  return typeof v === "string" ? v : JSON.stringify(v, null, 2);
}

function metaGrid(pairs) {
  const grid = el("div", "meta-grid");
  pairs.forEach(([k, v]) => grid.append(el("span", "meta-key", k), el("span", "meta-val", v)));
  return grid;
}

function headersSection(title, headers) {
  const box = el("details", "headers");
  box.append(el("summary", "section-title", `${title} (${headers.length})`));
  box.append(headers.length
    ? metaGrid(headers.map(h => [h.name, h.value]))
    : el("p", "placeholder", "None"));
  return box;
}

function renderDetail() {
  const e = entries.find(x => x.id === selected);
  btnPostmanSelected.disabled = !e;
  if (!e) {
    detailEl.replaceChildren(el("p", "placeholder", "← Select a request to inspect"));
    return;
  }
  detailEl.replaceChildren(
    el("div", "section-title", "Request"),
    metaGrid([
      ["URL", e.url],
      ["Method", e.method],
      ["Type", e.type],
      ["Status", e.status || "Error"],
      ["Duration", `${e.durationMs} ms`],
      ["Domain", e.domain || "—"],
      ["Page", e.page || "—"],
      ["Time", e.timestamp],
    ]),
    headersSection("Request Headers", e.requestHeaders),
    el("div", "section-title", "Request Payload"),
    el("pre", null, fmt(e.requestPayload)),
    headersSection("Response Headers", e.responseHeaders),
    el("div", "section-title", "Response Body"),
    el("pre", null, fmt(e.responseBody)),
  );
}

function updateCount() {
  countEl.textContent = `${filtered().length} requests`;
}

// ── Export ────────────────────────────────────────────────────────────────────
function download(filename, content, mime) {
  const a  = document.createElement("a");
  const bl = new Blob([content], { type: mime });
  a.href   = URL.createObjectURL(bl);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJSON() {
  download("xhr-capture.json", JSON.stringify(filtered(), null, 2), "application/json");
}

function exportCSV() {
  const cols = ["timestamp","type","method","url","domain","page","status","durationMs","requestPayload","responseBody"];
  const esc  = (v) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g,'""')}"`;
  };
  const rows = [cols.join(","), ...filtered().map(e => cols.map(c => esc(e[c])).join(","))];
  download("xhr-capture.csv", rows.join("\n"), "text/csv");
}

// ── Postman Collection v2.1 export ────────────────────────────────────────────
function urlToPostman(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const result = {
      raw: rawUrl,
      protocol: u.protocol.replace(":", ""),
      host: u.hostname.split("."),
      path: u.pathname.split("/").filter(Boolean),
    };
    const qp = [...u.searchParams.entries()];
    if (qp.length) result.query = qp.map(([key, value]) => ({ key, value }));
    return result;
  } catch {
    return { raw: rawUrl };
  }
}

function postmanHeaders(headers) {
  return (headers || [])
    .filter(h => !h.name.startsWith(":") && !POSTMAN_SKIP_HEADERS.has(h.name.toLowerCase()))
    .map(h => ({ key: h.name, value: h.value }));
}

function postmanRequest(e) {
  const request = { method: e.method, header: postmanHeaders(e.requestHeaders), url: urlToPostman(e.url || "") };
  if (e.requestPayload != null) {
    const isJSON = typeof e.requestPayload !== "string";
    request.body = {
      mode: "raw",
      raw: isJSON ? JSON.stringify(e.requestPayload, null, 2) : e.requestPayload,
      options: { raw: { language: isJSON ? "json" : "text" } },
    };
  }
  return request;
}

function postmanResponse(e, name, originalRequest) {
  return {
    name,
    originalRequest,
    status: String(e.status || "Error"),
    code: e.status || 0,
    header: postmanHeaders(e.responseHeaders),
    body: e.responseBody != null ? fmt(e.responseBody) : "",
    _postman_previewlanguage: typeof e.responseBody === "string" ? "text" : "json",
  };
}

function toPostmanCollection(items, name) {
  return {
    info: {
      _postman_id: `xhr-${Date.now()}`,
      name,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
  };
}

// Deduplicated export: one item per unique method+url,
// with one example response per distinct status code.
function groupedEntriesToPostmanItems(list) {
  // Preserve first-seen order while grouping
  const order  = [];
  const groups = new Map();
  list.forEach(e => {
    const key = `${e.method} ${e.url}`;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key).push(e);
  });

  return order.map(key => {
    const group = groups.get(key);

    // Representative entry for the request definition:
    // prefer a successful entry with a payload, fall back to first entry
    const rep = group.find(e => e.requestPayload != null && e.status && e.status < 400)
             || group.find(e => e.requestPayload != null)
             || group[0];
    const request = postmanRequest(rep);

    // One example response per distinct status code.
    // Within the same status code prefer the entry that has a response body.
    const seenStatus = new Map();
    group.forEach(e => {
      const s = e.status || 0;
      if (!seenStatus.has(s)) {
        seenStatus.set(s, e);
      } else if (e.responseBody != null && seenStatus.get(s).responseBody == null) {
        seenStatus.set(s, e);
      }
    });

    const responses = [...seenStatus.values()]
      .sort((a, b) => (a.status || 0) - (b.status || 0))
      .map(e => {
        const ok    = e.status && e.status < 400;
        const label = e.status
          ? `${e.status} ${ok ? "Success" : "Error"}`
          : "Network Error";
        return postmanResponse(e, label, request);
      });

    return { name: key, request, response: responses };
  });
}

function exportPostmanAll() {
  const col = toPostmanCollection(groupedEntriesToPostmanItems(filtered()), "XHR Capture – All Requests");
  download("xhr-capture-postman.json", JSON.stringify(col, null, 2), "application/json");
}

function exportPostmanSelected() {
  const e = entries.find(x => x.id === selected);
  if (!e) return;
  const request = postmanRequest(e);
  const item    = { name: `${e.method} ${e.url}`, request, response: [postmanResponse(e, "Captured Response", request)] };
  download("xhr-capture-selected-postman.json", JSON.stringify(toPostmanCollection([item], item.name), null, 2), "application/json");
}

renderList();
updateCount();
