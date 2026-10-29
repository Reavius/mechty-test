#!/usr/bin/env node
/* Заказ со стола — локальный прототип (этот компьютер и Wi-Fi бара). Запуск из папки сайта:
     node table/server.mjs              порт 8080; другой: node table/server.mjs 8090
     node table/server.mjs --base https://order.example.ru   адрес для QR, если сервер стоит не в локальной сети
   Гость сканирует QR стола → каталог как на сайте → корзина и заметки → оплата → чек, время готовности, отзыв.
   Бармену заказ попадает только после полной оплаты; цены и сумма считаются здесь, а не в браузере гостя.
   Логика заказов — table/core.mjs; здесь — файлы, ключи и HTTP.
   Данные — table/data/ (заказы, отзывы, стоп-лист, секрет для ключей столов); в репозиторий не кладутся. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Fail, TABLES, createApp } from "./core.mjs";
import { readMenu } from "./menufile.mjs";
import { PAY_NAME, PAY_DEMO, payCreate } from "./pay.mjs";
import { RK_NAME, rkSend } from "./rkeeper.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, ".."), DATA = path.join(HERE, "data");
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] || "" : ""; };
const PORT = +(argv.find(a => /^\d+$/.test(a)) || process.env.PORT || 8080);

/* ключи: QR стола несёт свой ключ — заказать «за другой стол» из дома не выйдет; экран бармена — по своему ключу */
fs.mkdirSync(DATA, { recursive: true });
const SECRET_F = path.join(DATA, "secret.txt");
if (!fs.existsSync(SECRET_F)) fs.writeFileSync(SECRET_F, crypto.randomBytes(32).toString("hex"));
const SECRET = fs.readFileSync(SECRET_F, "utf8").trim();
const mac = s => crypto.createHmac("sha256", SECRET).update(s).digest("base64url");
const tableKey = n => mac("table:" + n).slice(0, 10);
const BAR_KEY = mac("bar").slice(0, 16);
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function lanIp(){
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === "IPv4" && !a.internal) return a.address;
  return "localhost";
}
const BASE = (opt("--base") || "http://" + lanIp() + ":" + PORT).replace(/\/$/, "");

/* меню — из файлов сайта; поменяли файлы — подхватится само */
let MENU = null, MENU_T = 0;
function menu(){
  const t = Math.max(fs.statSync(path.join(ROOT, "js", "menu.js")).mtimeMs, fs.statSync(path.join(ROOT, "js", "data.js")).mtimeMs);
  if (!MENU || t !== MENU_T){ MENU = readMenu(ROOT); MENU_T = t; }
  return MENU;
}

const DB_F = path.join(DATA, "orders.json");
const db = fs.existsSync(DB_F) ? JSON.parse(fs.readFileSync(DB_F, "utf8")) : { orders: [], stop: [], seq: {} };
const app = createApp({
  db, menu, same,
  now: () => Date.now(),
  rand: n => crypto.randomBytes(Math.ceil(n / 2)).toString("hex").slice(0, n),
  tableOk: (t, k) => same(k, tableKey(t)),
  barOk: k => same(k, BAR_KEY),
  qr: () => ({ base: BASE, tables: Array.from({ length: TABLES }, (_, i) => ({ n: i + 1, url: BASE + "/t/" + (i + 1) + "/" + tableKey(i + 1) })) }),
  pay: { name: PAY_NAME, demo: PAY_DEMO, create: payCreate },
  rk: { name: RK_NAME, send: (o, slip) => rkSend(o, slip, path.join(DATA, "slips")) },
  save(){ const tmp = DB_F + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_F); }
});

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

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  try {
    if (u.pathname.startsWith("/api/")){
      const body = req.method === "POST" ? await readBody(req) : {};
      return json(res, 200, await app.route(req.method, u.pathname, u.searchParams, body, req.headers["x-bar-key"]));
    }
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

menu();
server.listen(PORT, () => {
  console.log("\nЗаказ со стола — прототип. Оплата: " + PAY_NAME + ", R-Keeper: " + RK_NAME + "\n");
  console.log("  Экран бармена:  " + BASE + "/bar/" + BAR_KEY);
  console.log("  QR для столов:  " + BASE + "/qr/" + BAR_KEY);
  console.log("  Стол 1:         " + BASE + "/t/1/" + tableKey(1));
  console.log("\nТелефон должен быть в той же сети Wi-Fi, что и этот компьютер. Остановить — Ctrl+C.\n");
});
