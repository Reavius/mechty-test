#!/usr/bin/env node
/* Заказ со стола — локальный прототип (этот компьютер и Wi-Fi бара). Запуск из папки сайта:
     node table/server.mjs              порт 8080; другой: node table/server.mjs 8090
     node table/server.mjs --base https://order.example.ru   адрес для QR, если сервер стоит не в локальной сети
   Гость сканирует QR стола → каталог как на сайте → корзина и заметки → оплата → чек, время готовности, отзыв.
   Бармену заказ попадает только после полной оплаты; цены и сумма считаются здесь, а не в браузере гостя.
   Данные — table/data/ (заказы, отзывы, стоп-лист, секрет для ключей столов); в репозиторий не кладутся. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PAY_NAME, PAY_DEMO, payCreate } from "./pay.mjs";
import { RK_NAME, rkSend } from "./rkeeper.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, ".."), DATA = path.join(HERE, "data");
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] || "" : ""; };
const PORT = +(argv.find(a => /^\d+$/.test(a)) || process.env.PORT || 8080);
const TABLES = 10;
const UNPAID = 15 * 60e3;                                           // неоплаченный заказ через 15 минут отменяется
const PREP = { cocktails: 2.5, wine: 0.8, spirits: 0.6, beer: 1, soft: 1.5, hot: 2.5 };   // минут бармена на позицию

/* ключи: QR стола несёт свой ключ — заказать «за другой стол» из дома не выйдет; экран бармена — по своему ключу */
fs.mkdirSync(DATA, { recursive: true });
const SECRET_F = path.join(DATA, "secret.txt");
if (!fs.existsSync(SECRET_F)) fs.writeFileSync(SECRET_F, crypto.randomBytes(32).toString("hex"));
const SECRET = fs.readFileSync(SECRET_F, "utf8").trim();
const mac = s => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");
const tableKey = n => mac("table:" + n).slice(0, 10);
const BAR_KEY = mac("bar").slice(0, 16);
const same = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function lanIp(){
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === "IPv4" && !a.internal) return a.address;
  return "localhost";
}
const BASE = (opt("--base") || "http://" + lanIp() + ":" + PORT).replace(/\/$/, "");

/* ── меню: то же, что на сайте (js/menu.js + карта из js/data.js); поменяли файлы — подхватится само ── */
let MENU = null, ITEMS = new Map(), MENU_T = 0;
function loadMenu(){
  const fm = path.join(ROOT, "js", "menu.js"), fd = path.join(ROOT, "js", "data.js");
  const t = Math.max(fs.statSync(fm).mtimeMs, fs.statSync(fd).mtimeMs);
  if (MENU && t === MENU_T) return;
  const m = fs.readFileSync(fm, "utf8").match(/^const MENU = (\[[\s\S]*?\n\]);$/m);
  const pub = fs.readFileSync(fd, "utf8").match(/\/\* PUB:BEGIN \*\/\nconst data = ([\s\S]*);\n\/\* PUB:END \*\//);
  if (!m || !pub) throw new Error("Не нашёл меню в js/menu.js или карту в js/data.js");
  const menu = vm.runInNewContext("(" + m[1] + ")", {}, { timeout: 1000 }), card = {};
  for (const g of JSON.parse(pub[1])) for (const it of g.items) if (!it.lo) card[it.id] = it;
  const items = new Map(), out = [];
  for (const c of menu){
    const cat = { k: c.k, n: c.ru, secs: [] };
    for (const s of c.secs){
      const sec = { n: s.ru, tiles: !!s.tiles, items: [] };
      for (const x of s.items){
        const ci = x.c ? card[x.c] : null;
        if (!x.n && !ci) continue;                                       // позиции из карты уже нет — как на сайте
        const n = x.n || ci.n, vs = String(x.v || "").split("/");
        const opts = String(x.p).split("/").map((p, i) => ({ v: +vs[i] || +vs[0] || 0, p: +p })).filter(o => o.p > 0);
        if (!opts.length) continue;
        const id = x.c && !items.has(x.c) ? x.c : "m" + crypto.createHash("sha1").update(c.k + "|" + s.ru + "|" + n).digest("hex").slice(0, 8);
        const alc = c.k === "cocktails" ? (ci ? !!ci.abv : !/безалк/i.test(n + s.ru)) : ["wine", "spirits", "beer"].includes(c.k) && !/безалк/i.test(n);
        const it = { id, n, d: x.d || (ci && ci.m) || "", img: s.tiles && ci && ci.img || "", u: x.u === "pcs" ? "шт" : "мл", opts, alc, k: c.k };
        items.set(id, it); sec.items.push(it);
      }
      if (sec.items.length) cat.secs.push(sec);
    }
    if (cat.secs.length) out.push(cat);
  }
  MENU = out; ITEMS = items; MENU_T = t;
}

/* ── заказы ── */
const DB_F = path.join(DATA, "orders.json");
const db = fs.existsSync(DB_F) ? JSON.parse(fs.readFileSync(DB_F, "utf8")) : { orders: [], stop: [], seq: {} };
function save(){ const tmp = DB_F + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_F); }
const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, n);
/* рабочий день бара — до 6 утра: номера заказов с 1 каждый день */
const dayKey = t => { const d = new Date(t - 6 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const work = o => 1.5 + o.lines.reduce((a, l) => a + l.q * (PREP[l.k] || 1.5), 0);
const hhmm = t => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

class Fail extends Error { constructor(code, msg){ super(msg); this.code = code; } }

function sweep(){
  const now = Date.now();
  let ch = false;
  for (const o of db.orders) if (o.status === "new" && now - o.created > UNPAID){ o.status = "expired"; ch = true; }
  if (ch) save();
}

function orderCreate(b){
  const t = +b.t;
  if (!(Number.isInteger(t) && t >= 1 && t <= TABLES) || !same(String(b.k || ""), tableKey(t))) throw new Fail(403, "QR стола не подошёл — отсканируйте код на столе ещё раз");
  loadMenu();
  const lines = [];
  let total = 0, alc = false;
  for (const l of Array.isArray(b.lines) ? b.lines.slice(0, 40) : []){
    const it = ITEMS.get(String(l && l.id)), o = it && it.opts[+l.o || 0], q = +l.q;
    if (!it || !o) throw new Fail(409, "Меню обновилось — проверьте корзину");
    if (db.stop.includes(it.id)) throw new Fail(409, "«" + it.n + "» закончился — уберите его из корзины");
    if (!(Number.isInteger(q) && q >= 1 && q <= 20)) throw new Fail(400, "Количество — от 1 до 20");
    lines.push({ id: it.id, n: it.n, v: o.v, u: it.u, p: o.p, q, note: clean(l.note, 120), k: it.k });
    total += o.p * q; alc = alc || it.alc;
  }
  if (!lines.length) throw new Fail(400, "Корзина пуста");
  if (alc && b.adult !== true) throw new Fail(400, "Подтвердите, что вам есть 18 лет");
  if (db.orders.filter(o => o.table === t && o.status === "new").length >= 5) throw new Fail(429, "За этим столом уже много неоплаченных заказов — оплатите или подождите");
  const o = { id: crypto.randomBytes(6).toString("hex"), secret: crypto.randomBytes(12).toString("base64url"), no: 0, day: "", table: t,
    lines, comment: clean(b.comment, 300), total, alc, status: "new", created: Date.now() };
  o.pay = payCreate(o);
  db.orders.push(o); save();
  return { id: o.id, s: o.secret, url: o.pay.url };
}

/* оплата пришла (сейчас — демо-кнопка, потом — уведомление банка): номер, очередь, время готовности, в R-Keeper */
async function orderPaid(o, ref){
  if (o.status !== "new") return;
  const now = Date.now();
  o.day = dayKey(now); db.seq[o.day] = (db.seq[o.day] || 0) + 1; o.no = db.seq[o.day];
  const ahead = db.orders.filter(x => x !== o && (x.status === "paid" || x.status === "cooking"))
    .reduce((a, x) => a + Math.max(0, work(x) - (x.status === "cooking" ? (now - x.cook) / 60e3 : 0)), 0);
  Object.assign(o, { status: "paid", paid: now, payRef: ref, eta: now + Math.ceil(ahead + work(o)) * 60e3 });
  save();
  try { const r = await rkSend(o, slipText(o), path.join(DATA, "slips")); o.rk = r.ref; }
  catch (e) { o.rkErr = String(e && e.message || e); }
  save();
}

/* бегунок бармену: 40 знаков в строке, как на 80-мм ленте */
function slipText(o){
  const W = 40, pad = (a, b) => a + " ".repeat(Math.max(1, W - a.length - b.length)) + b, line = "-".repeat(W);
  const wrap = (s, ind) => { const out = []; let cur = ""; for (const w of s.split(" ")){ if ((cur + " " + w).trim().length > W - ind){ out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } out.push(cur); return out.map(x => " ".repeat(ind) + x); };
  const r = [pad("БАР «МЕЧТЫ»", "Заказ № " + o.no), pad("СТОЛ " + o.table, hhmm(o.paid)), "Оплачен: " + PAY_NAME, line];
  for (const l of o.lines){
    r.push(...wrap(l.q + " × " + l.n + (l.v ? " " + l.v + " " + l.u : ""), 0));
    if (l.note) r.push(...wrap("! " + l.note, 4));
  }
  r.push(line);
  if (o.comment) r.push(...wrap("Комментарий: " + o.comment, 0), line);
  r.push(pad("Сумма", money(o.total) + " ₽"), pad("Готовность", "к " + hhmm(o.eta)));
  return r.join("\n") + "\n";
}

const guestView = o => ({ id: o.id, no: o.no, table: o.table, status: o.status, lines: o.lines.map(({ k, id, ...l }) => l), comment: o.comment,
  total: o.total, created: o.created, paid: o.paid || 0, eta: o.eta || 0, cook: o.cook || 0, ready: o.ready || 0, done: o.done || 0,
  review: o.review || null, payName: PAY_NAME, demo: PAY_DEMO, pay: o.status === "new" ? o.pay.url : "", now: Date.now() });
const barView = o => ({ ...guestView(o), rk: o.rk || "", rkErr: o.rkErr || "", etaSet: !!o.etaSet, slip: slipText(o) });

function orderFind(id, s){
  const o = db.orders.find(x => x.id === id);
  if (!o || !same(String(s || ""), o.secret)) throw new Fail(404, "Заказ не найден");
  return o;
}

function barList(){
  const now = Date.now(), from = now - 18 * 3600e3, day = dayKey(now);
  const list = db.orders.filter(o => o.paid && o.paid > from && (o.status !== "done" || now - o.done < 3 * 3600e3));
  const act = { paid: 0, cooking: 1, ready: 2, done: 3 };
  list.sort((a, b) => act[a.status] - act[b.status] || (a.status === "done" ? b.done - a.done : a.paid - b.paid));
  const today = db.orders.filter(o => o.paid && o.day === day), rev = db.orders.filter(o => o.review).sort((a, b) => b.review.at - a.review.at);
  const avg = a => a.length ? Math.round(a.reduce((s, o) => s + o.review.stars, 0) / a.length * 10) / 10 : 0;
  return { orders: list.map(barView), stop: db.stop, now, pay: PAY_NAME, rkName: RK_NAME,
    stats: { n: today.length, sum: today.reduce((a, o) => a + o.total, 0), avgToday: avg(today.filter(o => o.review)), avgAll: avg(rev), nRev: rev.length },
    reviews: rev.slice(0, 40).map(o => ({ no: o.no, day: o.day, table: o.table, stars: o.review.stars, text: o.review.text, at: o.review.at })) };
}

function barAct(o, b){
  const now = Date.now();
  if (!o.paid) throw new Fail(409, "Заказ не оплачен");
  if (b.act === "cook" && (o.status === "paid" || o.status === "ready")){ o.status = "cooking"; o.cook = o.cook || now; o.ready = 0; }
  else if (b.act === "ready" && (o.status === "paid" || o.status === "cooking")){ o.status = "ready"; o.cook = o.cook || now; o.ready = now; }
  else if (b.act === "done" && o.status !== "done"){ o.status = "done"; o.done = now; o.ready = o.ready || now; }
  else if (b.act === "eta"){
    const m = +b.min;
    if (!(Number.isInteger(m) && m >= 0 && m <= 120)) throw new Fail(400, "Время — от 0 до 120 минут");
    o.eta = now + m * 60e3; o.etaSet = true;
  } else throw new Fail(409, "Нельзя: заказ уже в другом статусе");
  save();
}

/* ── HTTP ── */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4", ".webm": "video/webm" };
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
  "img-src 'self' data:; media-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const OPEN = /^\/(css|photos|icons|vendor|video)\/[\w\-]+(\.[\w\-]+)+$|^\/table\/[\w\-]+\.(html|js|css)$/;   // данные, код сервера и остальной сайт — не отдаём

function sendFile(res, f){
  fs.readFile(f, (e, buf) => {
    if (e){ res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Не найдено"); }
    const ext = path.extname(f), h = { "Content-Type": MIME[ext] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-cache" };
    if (ext === ".html") h["Content-Security-Policy"] = CSP;
    res.writeHead(200, h); res.end(buf);
  });
}
function json(res, code, body){
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(body));
}
function readBody(req){
  return new Promise((ok, no) => {
    let n = 0; const parts = [];
    req.on("data", c => { n += c.length; if (n > 64 * 1024){ no(new Fail(413, "Слишком большой запрос")); req.destroy(); } else parts.push(c); });
    req.on("end", () => { try { ok(parts.length ? JSON.parse(Buffer.concat(parts).toString("utf8")) : {}); } catch (e) { no(new Fail(400, "Не JSON")); } });
    req.on("error", no);
  });
}

async function api(req, res, u){
  const p = u.pathname, post = req.method === "POST", b = post ? await readBody(req) : {};
  sweep();
  let m;
  if (p === "/api/menu"){
    const t = +u.searchParams.get("t");
    if (!(t >= 1 && t <= TABLES) || !same(u.searchParams.get("k") || "", tableKey(t))) throw new Fail(403, "QR стола не подошёл — отсканируйте код на столе ещё раз");
    loadMenu();
    return { table: t, menu: MENU, stop: db.stop, pay: PAY_NAME };
  }
  if (p === "/api/order" && post) return orderCreate(b);
  if ((m = p.match(/^\/api\/order\/(\w+)$/))) return guestView(orderFind(m[1], u.searchParams.get("s")));
  if ((m = p.match(/^\/api\/order\/(\w+)\/(review|cancel)$/)) && post){
    const o = orderFind(m[1], u.searchParams.get("s"));
    if (m[2] === "cancel"){ if (o.status !== "new") throw new Fail(409, "Заказ уже оплачен"); o.status = "cancelled"; }
    else {
      const st = +b.stars;
      if (!o.paid) throw new Fail(409, "Отзыв — после оплаты");
      if (!(Number.isInteger(st) && st >= 1 && st <= 5)) throw new Fail(400, "Поставьте от 1 до 5 звёзд");
      o.review = { stars: st, text: clean(b.text, 500), at: Date.now() };
    }
    save();
    return guestView(o);
  }
  if (p === "/api/demo/pay" && post && PAY_DEMO){
    const o = orderFind(String(b.id || ""), b.s);
    if (o.status === "expired" || o.status === "cancelled") throw new Fail(409, "Заказ отменён — соберите корзину заново");
    await orderPaid(o, o.pay.ref);
    return guestView(o);
  }
  if (p.startsWith("/api/bar")){
    if (!same(req.headers["x-bar-key"] || "", BAR_KEY)) throw new Fail(403, "Нет доступа");
    if (p === "/api/bar") return barList();
    if (p === "/api/bar/qr") return { base: BASE, tables: Array.from({ length: TABLES }, (_, i) => ({ n: i + 1, url: BASE + "/t/" + (i + 1) + "/" + tableKey(i + 1) })) };
    if (p === "/api/bar/menu"){ loadMenu(); return { menu: MENU, stop: db.stop }; }
    if (p === "/api/bar/stop" && post){
      loadMenu();
      const id = String(b.id || "");
      if (!ITEMS.has(id)) throw new Fail(404, "Нет такой позиции");
      db.stop = db.stop.filter(x => x !== id && ITEMS.has(x));
      if (b.on) db.stop.push(id);
      save();
      return { stop: db.stop };
    }
    if ((m = p.match(/^\/api\/bar\/order\/(\w+)$/)) && post){
      const o = db.orders.find(x => x.id === m[1]);
      if (!o) throw new Fail(404, "Заказ не найден");
      barAct(o, b);
      return barList();
    }
  }
  throw new Fail(404, "Нет такого адреса");
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname.startsWith("/api/")) return json(res, 200, await api(req, res, u));
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Только GET" });
    if (/^\/t\/\d+\/[\w\-]+$/.test(u.pathname)) return sendFile(res, path.join(HERE, "guest.html"));
    if (/^\/bar\/[\w\-]+$/.test(u.pathname)) return sendFile(res, path.join(HERE, "bar.html"));
    if (/^\/qr\/[\w\-]+$/.test(u.pathname)) return sendFile(res, path.join(HERE, "qr.html"));
    if (u.pathname === "/") return sendFile(res, path.join(HERE, "start.html"));
    if (OPEN.test(u.pathname)) return sendFile(res, path.join(ROOT, u.pathname));
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Не найдено");
  } catch (e) {
    if (!(e instanceof Fail)) console.error(e);
    json(res, e instanceof Fail ? e.code : 500, { error: e instanceof Fail ? e.message : "Ошибка сервера" });
  }
});

loadMenu();
server.listen(PORT, () => {
  console.log("\nЗаказ со стола — прототип. Оплата: " + PAY_NAME + ", R-Keeper: " + RK_NAME + "\n");
  console.log("  Экран бармена:  " + BASE + "/bar/" + BAR_KEY);
  console.log("  QR для столов:  " + BASE + "/qr/" + BAR_KEY);
  console.log("  Стол 1:         " + BASE + "/t/1/" + tableKey(1));
  console.log("\nТелефон должен быть в той же сети Wi-Fi, что и этот компьютер. Остановить — Ctrl+C.\n");
});
