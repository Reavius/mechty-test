/* Офлайн-режим: страница, код и иконки кэшируются. Страница и свой код (css/, js/, fx.js) —
   «сначала сеть», чтобы обновления сайта приходили сразу и целиком; без сети открывается из кэша.
   Сеть есть, но еле дышит (слабый сигнал в баре): страница ждёт сеть не дольше 4 секунд, дальше — сохранённая копия,
   и тогда весь её код тоже из кэша (версии не смешиваются); свежая версия скачивается в фоне — к следующему открытию.
   Запросы к Google (журнал, ревизия) не кэшируются. */
const CACHE = "mechty-v32";
const SLOW = 4000;
const STALE = new Set();                                      // вкладки, открытые из сохранённой копии
const CODE = ["css/app.css", "js/core.js", "js/data.js", "js/card.js", "js/auth.js", "js/ttk.js", "js/wo.js", "js/lart.js", "js/labels.js",
  "js/rev.js", "js/mrev.js", "js/order.js", "js/calc.js", "js/swipe.js", "fx.js"];
const CORE = ["./", "index.html", "manifest.webmanifest", ...CODE, "vendor/qrcode.js", "vendor/gsap.min.js", "vendor/ScrollTrigger.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* страница: сначала сеть, без сети — кэш */
  if (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname)) {
    e.respondWith(page(e));
    return;
  }
  /* другие страницы (старые адреса calc.html, preview.html — переадресация) — своим адресом, не вместо index.html */
  if (req.mode === "navigate") {
    e.respondWith(fresh(req, req));
    return;
  }
  /* свой код — тоже сначала сеть: страница и скрипты всегда одной версии (страница из копии — и код из копии) */
  if (url.origin === location.origin && /\.(js|css)$/.test(url.pathname) && !url.pathname.includes("/vendor/")) {
    e.respondWith(STALE.has(e.clientId) ? caches.match(req).then(hit => hit || fresh(req, req)) : fresh(req, req));
    return;
  }

  /* свои файлы и шрифты Google: из кэша, в фоне обновляем */
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* страница: сеть; не ответила за SLOW — сохранённая копия (если есть). Тогда и код вкладки — из копии, а поздний ответ сети
   в кэш не кладём: новая страница со старым кодом не смешается (обновится при следующем открытии с нормальной сетью). */
function page(e){
  const req = e.request, stale = () => { if (e.resultingClientId) STALE.add(e.resultingClientId); };
  return new Promise(ok => {
    let done = false;
    const t = setTimeout(() => caches.match("index.html").then(hit => {
      if (!hit || done) return;
      done = true; stale(); ok(hit);
    }), SLOW);
    const net = fetch(req, {cache: "no-cache"}).then(res => {
      if (done) return;
      done = true; clearTimeout(t);
      const copy = res.ok ? res.clone() : null;                 // копию — до того, как страница прочитает ответ
      ok(res);
      if (copy) return caches.open(CACHE).then(c => c.put("index.html", copy));
    }, () => {
      if (done) return;
      done = true; clearTimeout(t); stale();                    // без сети — страница и код из копии
      ok(caches.match("index.html"));
    });
    e.waitUntil(net.catch(() => {}));
  });
}

/* сеть мимо HTTP-кэша; удачный ответ — в кэш; без сети — из кэша */
function fresh(req, key){
  return fetch(req, {cache: "no-cache"}).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key));
}
