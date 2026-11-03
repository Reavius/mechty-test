#!/usr/bin/env node
/* Сайт заведения «Мечты» — локальный пример (этот компьютер и Wi-Fi). Запуск из папки сайта:
     node venue/server.mjs            порт 8090; другой: node venue/server.mjs 8095
   Гостям — главная (/), событие (/#event-…), сертификат (/cert.html#КОД), политика (/privacy.html).
   Управляющему — /admin.html: заявки (брони, банкеты, сертификаты, отклики, подписки) и правка всех разделов.
   Пароль админки — в окне, где запущен сервер (и в venue/data/admin.txt).
   Данные — venue/data/ (site.json — содержимое, inbox.json — заявки, uploads/ — фото); в репозиторий не кладутся.
   Первый запуск — содержимое из venue/seed.mjs. Карта бара — из файлов барного гида (js/menu.js, js/data.js). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { SEED } from "./seed.mjs";
import { readMenu } from "../table/menufile.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, ".."), DATA = path.join(HERE, "data"), UP = path.join(DATA, "uploads");
const PORT = +(process.argv.slice(2).find(a => /^\d+$/.test(a)) || process.env.PORT || 8090);
fs.mkdirSync(UP, { recursive: true });

/* ── хранилище: JSON-файлы, запись через временный файл (не испортится при обрыве) ── */
const F = { site: path.join(DATA, "site.json"), inbox: path.join(DATA, "inbox.json"), pw: path.join(DATA, "admin.txt"), key: path.join(DATA, "secret.txt") };
const load = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return def; } };
const save = (f, v) => { const t = f + ".tmp"; fs.writeFileSync(t, JSON.stringify(v, null, 1)); fs.renameSync(t, f); };
let site = load(F.site, null);
if (!site){ site = JSON.parse(JSON.stringify(SEED)); save(F.site, site); }
let inbox = load(F.inbox, { book: [], banquet: [], cert: [], job: [], sub: [] });
for (const k of ["book", "banquet", "cert", "job", "sub"]) if (!Array.isArray(inbox[k])) inbox[k] = [];
if (!fs.existsSync(F.pw)) fs.writeFileSync(F.pw, crypto.randomBytes(4).toString("hex"));
if (!fs.existsSync(F.key)) fs.writeFileSync(F.key, crypto.randomBytes(32).toString("hex"));
const PW = fs.readFileSync(F.pw, "utf8").trim(), KEY = fs.readFileSync(F.key, "utf8").trim();
const TOKEN = crypto.createHmac("sha256", KEY).update("admin:" + PW).digest("base64url");
const same = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ── проверка полей: всё — строки ограниченной длины; телефон — цифры; дата — ГГГГ-ММ-ДД ── */
class Fail extends Error {}
const str = (v, n = 300) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
const need = (v, msg) => { if (!v) throw new Fail(msg); return v; };
const phone = v => { const s = str(v, 40); if ((s.match(/\d/g) || []).length < 10) throw new Fail("Проверьте телефон — нужно 10–11 цифр."); return s; };
const day = (v, msg) => { const s = str(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw new Fail(msg || "Выберите дату."); return s; };
const consent = v => { if (v !== true) throw new Fail("Нужно согласие на обработку персональных данных."); };
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);   // день по местному времени (UTC+5) — как в барном гиде
const uid = p => p + crypto.randomBytes(4).toString("hex");

/* ── публичные данные: скрытое не уходит, события — по дате, прошедшие — отдельно ── */
let barMenu = null, barAt = 0;
function bar(){
  try {
    const t = Math.max(...["js/menu.js", "js/data.js"].map(f => fs.statSync(path.join(ROOT, f)).mtimeMs));
    if (!barMenu || t !== barAt){ barMenu = readMenu(ROOT).menu; barAt = t; }       // поменяли карту в барном гиде — подхватится
  } catch (e) { barMenu = barMenu || []; }
  return barMenu;
}
const vis = a => (a || []).filter(x => !x.hidden);
function publicSite(){
  const t = today(), ev = vis(site.events).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { info: site.info, zones: vis(site.zones), events: ev.filter(e => e.date >= t), past: ev.filter(e => e.date < t).reverse(),
    promos: vis(site.promos).filter(p => !p.until || p.until >= t), news: vis(site.news).slice().sort((a, b) => b.date.localeCompare(a.date)),
    albums: vis(site.albums).slice().sort((a, b) => b.date.localeCompare(a.date)), packages: vis(site.packages), kitchen: vis(site.kitchen),
    vacancies: vis(site.vacancies), bar: bar(), today: t };
}

/* ── заявки гостей ── */
const zoneName = id => ((site.zones || []).find(z => z.id === id) || {}).name || "";
function addBook(b){
  const z = str(b.zone, 20), r = { id: uid("b"), at: new Date().toISOString(), st: "new",
    zone: need(zoneName(z) ? z : "", "Выберите зал."), date: day(b.date), time: str(b.time, 5), guests: Math.round(+b.guests || 0),
    name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), comment: str(b.comment, 500), event: str(b.event, 20) };
  if (r.date < today()) throw new Fail("Эта дата уже прошла.");
  if (!/^\d{2}:\d{2}$/.test(r.time)) throw new Fail("Выберите время.");
  if (!(r.guests >= 1 && r.guests <= 300)) throw new Fail("Сколько будет гостей?");
  consent(b.consent);
  inbox.book.unshift(r); save(F.inbox, inbox);
  return { ok: true, id: r.id };
}
function addBanquet(b){
  const r = { id: uid("q"), at: new Date().toISOString(), st: "new", date: day(b.date), guests: Math.round(+b.guests || 0), zone: str(b.zone, 20),
    format: str(b.format, 80), name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), comment: str(b.comment, 800) };
  if (r.date < today()) throw new Fail("Эта дата уже прошла.");
  if (!(r.guests >= 1 && r.guests <= 500)) throw new Fail("Сколько будет гостей?");
  consent(b.consent);
  inbox.banquet.unshift(r); save(F.inbox, inbox);
  return { ok: true, id: r.id };
}
/* сертификат: в примере оплата — заглушка «оплачено»; в рабочей версии здесь — платёжная страница банка (ЮKassa, СБП) */
function addCert(b){
  const sum = Math.round(+b.amount || 0);
  if (!(sum >= 500 && sum <= 100000)) throw new Fail("Сумма — от 500 до 100 000 ₽.");
  const code = "M-" + crypto.randomBytes(3).toString("hex").toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
  const t = today(), till = new Date(Date.parse(t) + 183 * 864e5).toISOString().slice(0, 10);
  const r = { id: uid("c"), code, at: new Date().toISOString(), st: "paid", sum, from: str(b.from, 60), to: str(b.to, 60), wish: str(b.wish, 200),
    name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), till };
  consent(b.consent);
  inbox.cert.unshift(r); save(F.inbox, inbox);
  return { ok: true, code };
}
function addJob(b){
  const v = str(b.vacancy, 20), r = { id: uid("j"), at: new Date().toISOString(), st: "new", vacancy: ((site.vacancies || []).find(x => x.id === v) || {}).title || "",
    name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), about: str(b.about, 800) };
  need(r.vacancy, "Выберите вакансию.");
  consent(b.consent);
  inbox.job.unshift(r); save(F.inbox, inbox);
  return { ok: true };
}
function addSub(b){
  const e = str(b.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Fail("Проверьте почту.");
  consent(b.consent);
  if (!inbox.sub.some(s => s.email === e)){ inbox.sub.unshift({ id: uid("s"), at: new Date().toISOString(), st: "new", email: e }); save(F.inbox, inbox); }
  return { ok: true };
}

/* ── админка: правка разделов (поля — по схеме, лишнее отбрасывается), статусы заявок, фото ── */
const COLS = {
  events: ["title", "date", "time", "zone", "price", "text", "img", "hidden"],
  promos: ["title", "until", "text", "img", "hidden"],
  news: ["title", "date", "text", "img", "hidden"],
  albums: ["title", "date", "photos", "hidden"],
  zones: ["name", "cap", "hours", "text", "feats", "color", "img", "hidden"],
  packages: ["title", "price", "text", "hidden"],
  kitchen: ["sec", "name", "desc", "out", "price", "hidden"],
  vacancies: ["title", "pay", "text", "hidden"]
};
const INFO = ["name", "kicker", "tagline", "address", "city", "phone", "mapq", "tg", "ig", "guide", "dress", "parking"];
const BOX_ST = { book: ["new", "ok", "no"], banquet: ["new", "call", "ok", "no"], cert: ["paid", "used"], job: ["new", "call", "no"], sub: ["new"] };
function clean(col, it){
  const out = {};
  for (const k of COLS[col]){
    const v = it[k];
    if (k === "hidden") out[k] = !!v;
    else if (k === "photos") out[k] = (Array.isArray(v) ? v : []).map(x => str(x, 200)).filter(x => /^\/(uploads|photos)\/[\w.-]+$/.test(x)).slice(0, 60);
    else if (k === "price" && col === "kitchen") out[k] = Math.max(0, Math.round(+v || 0));
    else if (k === "date" || k === "until") out[k] = str(v, 10) && /^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : "";
    else if (k === "img") out[k] = /^\/(uploads|photos)\/[\w.-]+$/.test(str(v, 200)) ? str(v, 200) : "";
    else if (k === "color") out[k] = /^#[0-9a-f]{6}$/i.test(str(v, 7)) ? str(v, 7) : "#C9A24B";
    else out[k] = str(v, k === "text" ? 2000 : 200);
  }
  if ((col === "events" || col === "news" || col === "albums") && !out.date) throw new Fail("Укажите дату.");
  if (!(out.title || out.name)) throw new Fail("Укажите название.");
  return out;
}
function adminSave(b){
  const col = str(b.col, 20);
  if (col === "info"){
    const it = b.item || {}, out = {};
    for (const k of INFO) out[k] = str(it[k], k === "tagline" || k === "dress" ? 400 : 200);
    out.hours = (Array.isArray(it.hours) ? it.hours : []).slice(0, 10).map(h => ({ zone: str(h && h.zone, 40), text: str(h && h.text, 120) })).filter(h => h.zone || h.text);
    site.info = out; save(F.site, site); return { ok: true };
  }
  if (!COLS[col]) throw new Fail("Нет такого раздела.");
  const it = clean(col, b.item || {}), list = site[col] = site[col] || [], id = str(b.id, 40);
  const i = id ? list.findIndex(x => x.id === id) : -1;
  if (i >= 0) list[i] = Object.assign({ id }, it);
  else list.unshift(Object.assign({ id: uid(col[0]) }, it));
  save(F.site, site);
  return { ok: true, id: i >= 0 ? id : list[0].id };
}
function adminDel(b){
  const col = str(b.col, 20), id = str(b.id, 40);
  if (!COLS[col]) throw new Fail("Нет такого раздела.");
  site[col] = (site[col] || []).filter(x => x.id !== id); save(F.site, site);
  return { ok: true };
}
function adminSt(b){
  const box = str(b.box, 10), id = str(b.id, 40), st = str(b.st, 10);
  if (!BOX_ST[box] || !BOX_ST[box].includes(st)) throw new Fail("Нет такого статуса.");
  const r = inbox[box].find(x => x.id === id);
  if (!r) throw new Fail("Заявки уже нет.");
  r.st = st; r.stAt = new Date().toISOString(); save(F.inbox, inbox);
  return { ok: true };
}
/* фото: JPEG/PNG/WebP до 4 МБ — в venue/data/uploads (сайт уменьшает перед отправкой) */
function adminUpload(b){
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
  if (!m) throw new Fail("Нужна картинка JPEG, PNG или WebP.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 4 * 1024 * 1024) throw new Fail("Картинка больше 4 МБ.");
  const name = Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex") + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  fs.writeFileSync(path.join(UP, name), buf);
  return { ok: true, url: "/uploads/" + name };
}

/* ── HTTP ── */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".ico": "image/x-icon", ".ics": "text/calendar; charset=utf-8" };
/* из папки сайта бара — только картинки, видео, иконки и QR-библиотека; всё остальное — из venue/ */
const SHARED = [/^\/photos\/[\w.-]+$/, /^\/video\/[\w.-]+$/, /^\/icons\/[\w.-]+$/, /^\/vendor\/qrcode\.js$/];
const PAGES = new Set(["/index.html", "/admin.html", "/cert.html", "/privacy.html", "/site.js", "/admin.js", "/venue.css"]);
function fileFor(p){
  if (p === "/") p = "/index.html";
  if (/^\/uploads\/[\w.-]+$/.test(p)) return path.join(UP, p.slice(9));
  if (SHARED.some(re => re.test(p))) return path.join(ROOT, p);
  if (PAGES.has(p)) return path.join(HERE, p);
  return null;
}
const isAdmin = req => same((/(?:^|;\s*)vadm=([\w-]+)/.exec(req.headers.cookie || "") || [])[1], TOKEN);
function body(req){
  return new Promise((res, rej) => { let n = 0; const a = [];
    req.on("data", c => { n += c.length; if (n > 6 * 1024 * 1024){ rej(new Fail("Слишком большой запрос.")); req.destroy(); } else a.push(c); });
    req.on("end", () => { try { res(a.length ? JSON.parse(Buffer.concat(a).toString("utf8")) : {}); } catch (e) { rej(new Fail("Неверный запрос.")); } });
    req.on("error", rej); });
}
const send = (res, code, obj, head) => { res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, head || {})); res.end(JSON.stringify(obj)); };
const API = {
  "GET /api/site": () => Object.assign({ ok: true }, publicSite()),
  "POST /api/book": addBook, "POST /api/banquet": addBanquet, "POST /api/cert": addCert, "POST /api/job": addJob, "POST /api/subscribe": addSub
};
const ADMIN = {
  "GET /api/admin/all": () => ({ ok: true, site, inbox }),
  "POST /api/admin/save": adminSave, "POST /api/admin/del": adminDel, "POST /api/admin/status": adminSt, "POST /api/admin/upload": adminUpload
};
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), key = req.method + " " + u.pathname;
  try {
    if (u.pathname.startsWith("/api/")){
      if (key === "POST /api/admin/login"){
        const b = await body(req);
        if (!same(String(b.pw || "").trim(), PW)) return send(res, 403, { error: "Неверный пароль." });
        return send(res, 200, { ok: true }, { "Set-Cookie": "vadm=" + TOKEN + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000" });
      }
      if (key === "POST /api/admin/logout") return send(res, 200, { ok: true }, { "Set-Cookie": "vadm=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" });
      const m = /^GET \/api\/cert\/(M-[0-9A-F]{6}-[0-9A-F]{4})$/.exec(key);
      if (m){ const c = inbox.cert.find(x => x.code === m[1]); return c ? send(res, 200, { ok: true, cert: { code: c.code, sum: c.sum, from: c.from, to: c.to, wish: c.wish, till: c.till, used: c.st === "used" }, info: { name: site.info.name, address: site.info.address, phone: site.info.phone } }) : send(res, 404, { error: "Сертификат не найден." }); }
      if (ADMIN[key]){ if (!isAdmin(req)) return send(res, 401, { error: "Войдите в админку." }); return send(res, 200, await ADMIN[key](req.method === "POST" ? await body(req) : {})); }
      if (API[key]) return send(res, 200, await API[key](req.method === "POST" ? await body(req) : {}));
      return send(res, 404, { error: "Нет такого запроса." });
    }
    const f = fileFor(u.pathname);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()){ res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    const ext = path.extname(f).toLowerCase(), st = fs.statSync(f);
    if (ext === ".mp4" && req.headers.range){                                  // видео — по частям, как ждёт Safari
      const [a, b] = req.headers.range.replace(/bytes=/, "").split("-"), s = +a || 0, e = b ? +b : st.size - 1;
      res.writeHead(206, { "Content-Type": "video/mp4", "Content-Range": "bytes " + s + "-" + e + "/" + st.size, "Accept-Ranges": "bytes", "Content-Length": e - s + 1 });
      return fs.createReadStream(f, { start: s, end: e }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": /\.(html|js|css)$/.test(ext) ? "no-cache" : "max-age=3600",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    if (e instanceof Fail) return send(res, 400, { error: e.message });
    console.error(e); send(res, 500, { error: "Ошибка сервера." });
  }
});
function lanIp(){
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === "IPv4" && !a.internal) return a.address;
  return "localhost";
}
server.listen(PORT, () => {
  const lan = "http://" + lanIp() + ":" + PORT;
  console.log("\n  Сайт «" + site.info.name + "» — пример\n");
  console.log("  На этом компьютере:  http://localhost:" + PORT + "/");
  console.log("  С телефона (тот же Wi-Fi):  " + lan + "/");
  console.log("  Админка:  http://localhost:" + PORT + "/admin.html   пароль: " + PW + "\n");
  console.log("  Остановить — закройте это окно (или Ctrl+C).\n");
});
