#!/usr/bin/env node
/* Онлайн-пример сайта заведения — папка для Netlify (отдельный сайт, не барный гид):
     node venue/build-static.mjs              → venue-online/ в папке сайта
     node venue/build-static.mjs путь/к/папке
     node venue/build-static.mjs ../demo     → обновить репозиторий Reavius/demo (GitHub Pages); .git, README и CNAME не трогаются
   Без сервера: заявки и правки в админке хранятся в браузере того, кто открыл (venue/local.js), — для показа.
   Пути относительные — работает и в корне домена (Netlify), и в подпапке (reavius.github.io/demo/).
   Карта бара — снимок из файлов барного гида на момент сборки. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { readBar } from "./barfile.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "venue-online"));
/* папка — git-репозиторий сайта (например, Reavius/demo для GitHub Pages): обновляем файлы, не трогая .git, README и CNAME */
const KEEP = new Set([".git", "README.md", "CNAME", ".nojekyll"]);
if (fs.existsSync(path.join(OUT, ".git"))) for (const e of fs.readdirSync(OUT)){ if (!KEEP.has(e)) fs.rmSync(path.join(OUT, e), { recursive: true, force: true }); }
else fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const put = (rel, data) => { fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true }); fs.writeFileSync(path.join(OUT, rel), data); };
const copy = (from, rel) => put(rel, fs.readFileSync(from));

/* страницы: модуль онлайн-примера — перед скриптом страницы; не для поисковиков; лента — про хранение в браузере */
const RIBBON = f => f === "index.html" ? '<div class="demo dsite"><b>Демо-версия сайта</b><span class="dmore">: бронь и заявки пока не работают</span></div>'
  : '<div class="demo">Онлайн-пример: <b>заявки и правки сохраняются только в этом браузере</b> — у каждого свои.</div>';
for (const f of ["index.html", "admin.html", "privacy.html"]){
  let s = fs.readFileSync(path.join(HERE, f), "utf8");
  if (!/<meta name="robots"/.test(s)) s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">');
  if (f !== "privacy.html") s = s.replace(/<div class="demo[^"]*">[\s\S]*?<\/div>/, RIBBON(f));
  const at = s.search(/<script src="(site|admin)\.js" defer><\/script>|<script src="vendor\/qrcode\.js"><\/script>/);
  if (f !== "privacy.html"){
    if (at < 0) throw new Error("Не нашёл, куда подключить онлайн-пример: " + f);
    s = s.slice(0, at) + '<script type="module" src="local.js"></script>\n' + s.slice(at);
  }
  put(f, s);
}
for (const f of ["venue.css", "site.js", "admin.js", "local.js", "sw.js", "manifest.webmanifest"]) copy(path.join(HERE, f), f);
copy(path.join(HERE, "core.mjs"), "core.js");                                  // .js — любой хостинг отдаёт как JavaScript
copy(path.join(HERE, "seed.mjs"), "seed.js");
copy(path.join(HERE, "pass.mjs"), "pass.js");
put("admin-pass.js", "/* Отпечаток пароля редактора (PBKDF2-SHA256) — сам пароль здесь не хранится. Сменить: node venue/set-pass.mjs */\nexport const PASS = " + fs.readFileSync(path.join(HERE, "admin-pass.json"), "utf8").trim() + ";\n");
put("bar-data.js", "/* Карта бара — снимок из барного гида на момент сборки */\nexport const BAR = " + JSON.stringify(readBar(ROOT)) + ";\n");
for (const f of fs.readdirSync(path.join(ROOT, "photos"))) if (/\.webp$/.test(f)) copy(path.join(ROOT, "photos", f), "photos/" + f);
for (const f of fs.readdirSync(path.join(HERE, "media"))) copy(path.join(HERE, "media", f), "media/" + f);   // фото залов, видео первого экрана
for (const f of fs.readdirSync(path.join(ROOT, "icons"))) copy(path.join(ROOT, "icons", f), "icons/" + f);
copy(path.join(ROOT, "vendor", "qrcode.js"), "vendor/qrcode.js");
copy(path.join(ROOT, "vendor", "gsap.min.js"), "vendor/gsap.min.js");
put(".nojekyll", "");                                                           // GitHub Pages: отдать файлы как есть
put("_headers", "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n  X-Robots-Tag: noindex\n/sw.js\n  Cache-Control: no-cache\n");
/* метка версии у своих скриптов и стилей: телефон с прежней версией в кэше сразу берёт новые файлы, а не через 10 минут
   (столько GitHub Pages разрешает браузеру хранить файлы) */
const VER = crypto.createHash("sha1").update(["site.js", "venue.css", "local.js", "core.js", "seed.js", "bar-data.js", "admin.js"].concat(["pass.js", "admin-pass.js"]).map(f => fs.readFileSync(path.join(OUT, f))).join("")).digest("hex").slice(0, 8);
for (const f of ["index.html", "admin.html", "privacy.html"]){
  const s = fs.readFileSync(path.join(OUT, f), "utf8").replace(/(src|href)="((?:site|admin|local)\.js|venue\.css|vendor\/(?:gsap\.min|qrcode)\.js)"/g, (m, a, u) => a + '="' + u + "?v=" + VER + '"');
  put(f, s);
}
put("local.js", fs.readFileSync(path.join(OUT, "local.js"), "utf8").replace(/from "\.\/(core|seed|bar-data|admin-pass|pass)\.js"/g, (m, f) => 'from "./' + f + ".js?v=" + VER + '"'));
const n = (function count(d){ return fs.readdirSync(d, { withFileTypes: true }).filter(e => e.name !== ".git").reduce((a, e) => a + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0); })(OUT);
console.log("Онлайн-пример собран: " + OUT + " (" + n + " файлов). " + (fs.existsSync(path.join(OUT, ".git"))
  ? "Это репозиторий — закоммитьте и отправьте: GitHub Pages обновит сайт сам."
  : "Перетащите эту папку на https://app.netlify.com/drop — получится отдельный сайт."));
