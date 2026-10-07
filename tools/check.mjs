#!/usr/bin/env node
// Быстрые проверки без браузера: код разбирается, все файлы на месте, данные целы,
// в открытую часть не утекли граммовки. Запуск: node tools/check.mjs
// С MECHTY_PASSWORD дополнительно расшифровывает данные и проверяет техкарты.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { webcrypto as wc } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const has = f => fs.existsSync(path.join(ROOT, f.split(/[?#]/)[0]));
const fail = [];
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) fail.push(msg); };

/* 1. код разбирается */
const code = ["fx.js", "sw.js", ...fs.readdirSync(path.join(ROOT, "js")).map(f => "js/" + f)];
const bad = code.filter(f => { try { new vm.Script(rd(f), { filename: f }); return false; } catch (e) { console.log("  " + f + ": " + e.message); return true; } });
ok(!bad.length, `код разбирается (${code.length} файлов)`);
for (const f of fs.readdirSync(path.join(ROOT, "tools")).filter(f => f.endsWith(".mjs"))) {
  try { execFileSync(process.execPath, ["--check", path.join(ROOT, "tools", f)]); } catch (e) { ok(false, "tools/" + f + " разбирается"); }
}

/* 2. ссылки страницы на свои файлы */
const html = rd("index.html");
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(u => !u.startsWith("//"));
const missing = refs.filter(u => !has(u));
ok(!missing.length, `файлы, на которые ссылается index.html, на месте (${refs.length})` + (missing.length ? ": " + missing.join(", ") : ""));
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
ok(scripts.length === fs.readdirSync(path.join(ROOT, "js")).length, "все модули js/ подключены в index.html");
ok(/http-equiv="Content-Security-Policy"/.test(html), "CSP на месте");

/* 3. офлайн-кэш: всё из списка существует, все модули в списке */
const sw = rd("sw.js");
const listed = [...sw.matchAll(/"([^"]+\.(?:js|css|html|png|webmanifest|jpg|webp))"/g)].map(m => m[1]);
const swMissing = listed.filter(f => !has(f));
ok(!swMissing.length, `файлы офлайн-кэша на месте (${listed.length})` + (swMissing.length ? ": " + swMissing.join(", ") : ""));
const notCached = ["css/app.css", ...scripts].filter(f => !listed.includes(f));
ok(!notCached.length, "все модули есть в офлайн-кэше" + (notCached.length ? ": " + notCached.join(", ") : ""));

/* 4. манифест и превью ссылки */
const man = JSON.parse(rd("manifest.webmanifest"));
ok(man.icons.every(i => has(i.src)), "иконки манифеста на месте");
const og = (html.match(/property="og:image" content="https:\/\/[^/]+\/([^"]+)"/) || [])[1];
ok(og && has(og) && fs.statSync(path.join(ROOT, og)).size < 300 * 1024, "картинка превью ссылки на месте и меньше 300 КБ (WhatsApp)");

/* 5. данные: открытая карта и шифровка */
const data = rd("js/data.js");
const pubM = data.match(/\/\* PUB:BEGIN \*\/\nconst data = ([\s\S]*);\n\/\* PUB:END \*\//);
let pub = [];
try { pub = JSON.parse(pubM[1]); ok(true, "открытая карта — корректный JSON"); } catch (e) { ok(false, "открытая карта — корректный JSON"); }
const items = pub.flatMap(g => g.items);
const ids = items.map(i => i.id);
ok(items.length > 0 && new Set(ids).size === ids.length, `id позиций уникальны (${ids.length}) — QR-коды ведут на разные позиции`);
ok(items.every(i => i.n && Array.isArray(i.c) && i.c.length), "у каждой позиции есть название и состав");
const leak = items.filter(i => i.c.some(x => /\d\s*(мл|гр?|кг|л|шт)(?![а-яё])/i.test(x)));
ok(!leak.length, "в открытой карте нет граммовок" + (leak.length ? ": " + leak.map(i => i.n).join(", ") : ""));
const MENU = JSON.parse(rd("tools/menu.json"));
const menuBad = items.filter(i => !i.m || i.m !== MENU[i.id] || /п\/ф|с\/м|«/.test(i.m));
ok(!menuBad.length, "состав для гостей — как в меню (tools/menu.json)" + (menuBad.length ? ": " + menuBad.map(i => i.n).join(", ") : ""));
const noImg = items.filter(i => i.img && !has(i.img));
ok(!noImg.length, "фото открытой карты на месте" + (noImg.length ? ": " + noImg.map(i => i.img).join(", ") : ""));

const core = rd("js/core.js");
const PHW = JSON.parse(core.match(/const PHW = (\{.*\});/)[1]);
const photos = fs.readdirSync(path.join(ROOT, "photos")).filter(f => f.endsWith(".webp")).map(f => f.slice(0, -5));
ok(photos.every(p => PHW[p]), "размеры всех фото записаны в PHW (js/core.js)");

const blobM = data.match(/^const BLOB = (.*);$/m);
let B = null;
try { B = JSON.parse(blobM[1]); } catch (e) {}
ok(B && B.s && B.i && B.c && B.n >= 600000, "шифровка на месте (PBKDF2 ≥ 600 000)");

/* 6. этикетки: значки на месте и привязаны к существующим позициям */
const lab = rd("js/labels.js");
const LICON = vm.runInNewContext("(" + lab.match(/const LICON = (\{[\s\S]*?\});/)[1] + ")");
ok(Object.values(LICON).every(n => has("labels/" + n + ".png")), "значки этикеток на месте");
const strays = Object.keys(LICON).filter(k => !ids.includes(k));
ok(!strays.length, "значки этикеток привязаны к существующим позициям" + (strays.length ? ": " + strays.join(", ") : ""));

/* 7. закрытое не попало в репозиторий */
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n");
ok(!tracked.some(f => /(^|\/)vault.*\.json$|recipes.*\.json$|newpw|\.env$/i.test(f)), "в репозитории нет расшифрованных данных и паролей");

/* 8. с паролем — расшифровка и проверка техкарт */
if (process.env.MECHTY_PASSWORD && B) {
  try {
    const u = s => Buffer.from(s, "base64");
    const base = await wc.subtle.importKey("raw", new TextEncoder().encode(process.env.MECHTY_PASSWORD), "PBKDF2", false, ["deriveKey"]);
    const key = await wc.subtle.deriveKey({ name: "PBKDF2", salt: u(B.s), iterations: B.n, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const P = JSON.parse(new TextDecoder().decode(await wc.subtle.decrypt({ name: "AES-GCM", iv: u(B.i) }, key, u(B.c))));
    ok(["r", "k", "z", "zo"].every(k => Array.isArray(P[k])) && P.t, "шифровка открывается паролем, все разделы на месте");
    const K = P.k.flatMap(g => g.items);
    ok(K.every(t => !t.img || has(t.img)), `фото техкарт на месте (${K.length} карт)`);
    const R = P.r.flatMap(g => g.items).map(r => r.id);
    const lost = items.filter(i => i.rid && !R.includes(i.rid)).concat(K.filter(t => t.c && !R.includes(t.c)));
    const RI = P.r.flatMap(g => g.items);
    ok(RI.every(r => r.out > 0 && r.i.every(x => x[1] > 0) && (r.basis !== "por" || Math.abs(r.i.filter(x => x[2] === "мл").reduce((a, x) => a + x[1], 0) - r.out) < 1e-6 || r.i.some(x => x[2] !== "мл"))),
      `рецептуры калькулятора целы (${RI.length})`);
    ok(!lost.length, "ссылки карты и техкарт на рецептуры целы" + (lost.length ? ": " + lost.map(i => i.n).join(", ") : ""));
  } catch (e) { ok(false, "шифровка открывается паролем: " + e.message); }
} else console.log("· без MECHTY_PASSWORD шифровка не открывается — проверена только её форма");

if (fail.length) { console.log(`\nНе прошло: ${fail.length}`); process.exit(1); }
console.log("\nВсё в порядке");
