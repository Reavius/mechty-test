/* Сайт заведения «Мечты» — установка на телефон и работа без сети.
   Страницы, скрипты, стили — сначала из сети (всегда свежие), без сети — сохранённая копия.
   Фото и иконки — из сохранённых. Заявки (/api/) и видео не сохраняются. */
const CACHE = "mechty-venue-v2";
const CORE = ["./", "index.html", "venue.css", "site.js", "vendor/gsap.min.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache: "reload"})))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("mechty-venue-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || /\/api\//.test(u.pathname) || /\/video\/|\.mp4$/.test(u.pathname) || r.headers.has("range")) return;
  const asset = /\/(photos|icons|uploads)\/|\.(webp|png|jpe?g|svg)$/.test(u.pathname);
  if (asset){
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === "basic"){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r, {ignoreSearch: true}).then(hit => hit || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
