#!/usr/bin/env node
/* Сайт заведения «Мечты» — локальный пример (этот компьютер и Wi-Fi). Запуск из папки сайта:
     node venue/server.mjs            порт 8090; другой: node venue/server.mjs 8095
   Гостям — главная (/), событие (/#event-…), политика (/privacy.html).
   Управляющему — /admin.html: заявки (брони, банкеты, отклики) и правка всех разделов.
   Пароль редактора — пять слов, у управляющего (в venue/admin-pass.json — только отпечаток; без него — venue/data/admin.txt).
   Данные — venue/data/ (site.json — содержимое, inbox.json — заявки, uploads/ — фото); в репозиторий не кладутся.
   Первый запуск — содержимое из venue/seed.mjs. Карта бара — из файлов барного гида (js/menu.js, js/data.js). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { SEED } from "./seed.mjs";
import { venueCore, Fail } from "./core.mjs";
import { checkPass } from "./pass.mjs";
import { readBar } from "./barfile.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, ".."), DATA = path.join(HERE, "data"), UP = path.join(DATA, "uploads");
const PORT = +(process.argv.slice(2).find(a => /^\d+$/.test(a)) || process.env.PORT || 8090);
fs.mkdirSync(UP, { recursive: true });

/* ── хранилище: JSON-файлы, запись через временный файл (не испортится при обрыве); логика — venue/core.mjs ── */
const F = { site: path.join(DATA, "site.json"), inbox: path.join(DATA, "inbox.json"), pw: path.join(DATA, "admin.txt"), key: path.join(DATA, "secret.txt") };
const load = (f, def) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return def; } };
const save = (f, v) => { const t = f + ".tmp"; fs.writeFileSync(t, JSON.stringify(v, null, 1)); fs.renameSync(t, f); };
if (!fs.existsSync(F.pw)) fs.writeFileSync(F.pw, crypto.randomBytes(4).toString("hex"));
if (!fs.existsSync(F.key)) fs.writeFileSync(F.key, crypto.randomBytes(32).toString("hex"));
const PW = fs.readFileSync(F.pw, "utf8").trim(), KEY = fs.readFileSync(F.key, "utf8").trim();
/* пароль редактора — пять слов (отпечаток в venue/admin-pass.json, сменить: node venue/set-pass.mjs); нет файла — пароль из venue/data/admin.txt */
const PASS = load(path.join(HERE, "admin-pass.json"), null);
const TOKEN = crypto.createHmac("sha256", KEY).update("admin:" + (PASS ? PASS.hash : PW)).digest("base64url");
const passOk = async pw => PASS ? checkPass(pw, PASS) : same(String(pw || "").trim(), PW);
const same = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* карта бара — из файлов барного гида; поменяли карту в гиде — подхватится */
let barMenu = null, barAt = 0;
function bar(){
  try {
    const t = Math.max(...["js/menu.js", "js/data.js"].map(f => fs.statSync(path.join(ROOT, f)).mtimeMs));
    if (!barMenu || t !== barAt){ barMenu = readBar(ROOT); barAt = t; }
  } catch (e) { barMenu = barMenu || []; }
  return barMenu;
}
/* фото — в venue/data/uploads (сайт уменьшает перед отправкой) */
function upload(type, b64){
  const name = Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex") + "." + (type === "jpeg" ? "jpg" : type);
  fs.writeFileSync(path.join(UP, name), Buffer.from(b64, "base64"));
  return "/uploads/" + name;
}
const V = venueCore({ seed: SEED, bar, upload, rnd: n => crypto.randomBytes(n),
  store: { get: (k, def) => load(F[k], def), set: (k, v) => save(F[k], v) } });

/* ── HTTP ── */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".mp4": "video/mp4", ".ico": "image/x-icon", ".ics": "text/calendar; charset=utf-8", ".webmanifest": "application/manifest+json" };
/* из папки сайта бара — только картинки, видео, иконки, QR-библиотека и GSAP; всё остальное — из venue/ */
const SHARED = [/^\/photos\/[\w.-]+$/, /^\/video\/[\w.-]+$/, /^\/icons\/[\w.-]+$/, /^\/vendor\/(qrcode|gsap\.min)\.js$/];
const PAGES = new Set(["/index.html", "/admin.html", "/privacy.html", "/site.js", "/admin.js", "/venue.css", "/sw.js", "/manifest.webmanifest"]);
function fileFor(p){
  if (p === "/") p = "/index.html";
  if (/^\/uploads\/[\w.-]+$/.test(p)) return path.join(UP, p.slice(9));
  if (SHARED.some(re => re.test(p))) return path.join(ROOT, p);
  if (PAGES.has(p)) return path.join(HERE, p);
  if (/^\/media\/[\w.-]+$/.test(p)) return path.join(HERE, p);             // фото залов и видео первого экрана — venue/media
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
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), key = req.method + " " + u.pathname;
  try {
    if (u.pathname.startsWith("/api/")){
      if (key === "POST /api/admin/login"){
        const b = await body(req);
        if (!(await passOk(b.pw))) return send(res, 403, { error: "Неверный пароль." });
        return send(res, 200, { ok: true }, { "Set-Cookie": "vadm=" + TOKEN + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000" });
      }
      if (key === "POST /api/admin/logout") return send(res, 200, { ok: true }, { "Set-Cookie": "vadm=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" });
      const r = V.handle(req.method, u.pathname, req.method === "POST" ? await body(req) : {}, isAdmin(req));
      return send(res, r.code, r.body);
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
  console.log("\n  Сайт «" + V.name() + "» — пример\n");
  console.log("  На этом компьютере:  http://localhost:" + PORT + "/");
  console.log("  С телефона (тот же Wi-Fi):  " + lan + "/");
  console.log("  Админка:  http://localhost:" + PORT + "/admin.html   " + (PASS ? "пароль редактора — у управляющего (пять слов)" : "пароль: " + PW) + "\n");
  console.log("  Остановить — закройте это окно (или Ctrl+C).\n");
});
