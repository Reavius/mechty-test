/* Демо «Заказ со стола»: страница-оболочка. Вставляется в демо целиком (table/demo.mjs); до неё там уже объявлены
   createApp и Fail (table/core.mjs), payCreate (table/pay.mjs), PAY_NAME, RK_NAME, CSS, TPL, CODE, MENU, PHOTOS.
   Гость, оплата и бармен — в рамках-песочницах; «сервер» — table/core.mjs здесь, связь — сообщениями. */
"use strict";
const ITEMS = new Map();
for (const c of MENU) for (const s of c.secs) for (const it of s.items) ITEMS.set(it.id, it);
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(n / 2))), b => b.toString(16).padStart(2, "0")).join("").slice(0, n);
let DB, app, LS;
function reset(){
  DB = { orders: [], stop: [], seq: {} }; LS = new Map();
  app = createApp({ db: DB, menu: () => ({ menu: MENU, items: ITEMS }), now: () => Date.now(), rand: hex,
    tableOk: (t, k) => k === "demo", barOk: k => k === "demo", qr: () => ({ base: "", tables: [] }),
    pay: { name: PAY_NAME, demo: true, create: payCreate },
    rk: { name: RK_NAME, send: async o => ({ ref: "демо-" + o.no }) }, save(){} });
}
/* «сервер» для страниц в рамках: тот же table/core.mjs, ответы — как у fetch */
function demoFetch(u, o){
  o = o || {};
  const url = new URL(u, "http://demo"), h = o.headers || {};
  let body = {};
  try { body = o.body ? JSON.parse(o.body) : {}; } catch (e) {}
  const out = (status, d) => { const j = JSON.parse(JSON.stringify(d)); return { ok: status < 400, status, json: async () => j }; };
  return app.route(o.method || "GET", url.pathname, url.searchParams, body, h["x-bar-key"])
    .then(d => out(200, d), e => out(e instanceof Fail ? e.code : 500, { error: e instanceof Fail ? e.message : "Ошибка сервера" }));
}
/* страницы в рамках — в песочнице со своим происхождением: говорят с «сервером» только сообщениями */
const PRE = (kind, p, search) => "(function(){" +
  "const W = new Map(), LS = new Map(Object.entries(" + JSON.stringify(Object.fromEntries(LS)) + ")), PH = " + (kind === "guest" ? JSON.stringify(PHOTOS) : "{}") + ";" +
  "addEventListener('message', e => { const m = e.data; if (e.source !== parent || !m || m.t !== 'res' || !W.has(m.id)) return; const r = W.get(m.id); W.delete(m.id);" +
  " r({ ok: m.status < 400, status: m.status, json: async () => m.d }); });" +
  "window.fetch = (u, o) => new Promise(r => { const id = Math.random(); W.set(id, r); o = o || {};" +
  " parent.postMessage({ t: 'api', id, u: String(u), o: { method: o.method, body: o.body, headers: o.headers } }, '*'); });" +
  "window.DEMO = { path: " + JSON.stringify(p) + ", search: " + JSON.stringify(search || "") + ", go: u => parent.postMessage({ t: 'go', u: String(u) }, '*')," +
  " img: k => PH[k] || '', ls: { getItem: k => LS.has(k) ? LS.get(k) : null, setItem: (k, v) => { LS.set(k, String(v)); parent.postMessage({ t: 'ls', k, v: String(v) }, '*'); } } };" +
  "})();";
function load(kind, p, search){
  const doc = TPL[kind].split("__CSS__").join(CSS).split("__JS__").join("<script>" + PRE(kind, p, search).replace(/<\//g, "<\\/") + "<\/script><script>" + CODE[kind] + "<\/script>");
  document.getElementById(kind === "bar" ? "fB" : "fG").srcdoc = doc;
}
function demoGo(u){
  const url = new URL(u, "http://demo");
  if (url.pathname === "/table/pay.html") load("pay", url.pathname, url.search);
  else if (/^\/t\/\d+\/demo$/.test(url.pathname)) load("guest", url.pathname, url.search);
}
addEventListener("message", e => {
  const m = e.data, fG = document.getElementById("fG").contentWindow, fB = document.getElementById("fB").contentWindow;
  if (!m || (e.source !== fG && e.source !== fB)) return;
  if (m.t === "api") demoFetch(m.u, m.o).then(async r => e.source.postMessage({ t: "res", id: m.id, status: r.status, d: await r.json() }, "*"));
  else if (m.t === "go" && e.source === fG) demoGo(m.u);
  else if (m.t === "ls") LS.set(String(m.k), String(m.v));
});
async function seed(){
  const call = (p, b, key) => demoFetch(p, { method: "POST", body: JSON.stringify(b), headers: key ? { "x-bar-key": key } : {} }).then(r => r.json());
  const first = ITEMS.has("c-aperol") ? "c-aperol" : ITEMS.keys().next().value;
  const o = await call("/api/order", { t: 2, k: "demo", lines: [{ id: first, o: 0, q: 2, note: "" }], adult: true });
  await call("/api/demo/pay", { id: o.id, s: o.s });
  await call("/api/bar/order/" + o.id, { act: "cook" }, "demo");
}
async function start(){
  reset(); await seed();
  load("guest", "/t/" + document.getElementById("dT").value + "/demo", ""); load("bar", "/bar/demo", "");
}
document.getElementById("dT").addEventListener("change", e => load("guest", "/t/" + e.target.value + "/demo", ""));
document.getElementById("dReset").addEventListener("click", start);
document.getElementById("dTabs").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  document.getElementById("dWrap").dataset.v = b.dataset.v;
  document.querySelectorAll("#dTabs button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
});
setInterval(() => { const n = DB ? DB.orders.filter(o => o.status === "paid").length : 0; document.getElementById("dNew").textContent = n || ""; }, 1000);
start();
