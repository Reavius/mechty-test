#!/usr/bin/env node
// Шифрование рецептур раздела «Бартендерам».
//
//   Зашифровать и записать в js/data.js:
//     MECHTY_PASSWORD='пароль' node tools/vault.mjs encrypt vault.json [--token <hex>]
//   Расшифровать текущие данные из js/data.js (для правки):
//     MECHTY_PASSWORD='пароль' node tools/vault.mjs decrypt > vault.json
//
// vault.json — {"r": [...рецептуры калькулятора], "k": [...технологические карты], "z": [...заявка заготовщиков],
//   "zo": [...общая заявка], "pub": [...открытая карта заготовок]}. pub пишется в js/data.js открытым текстом,
//   остальное — в шифровку. Состав для гостей (m) — из tools/menu.json, как в меню бара. Состав карты (rid) и замесы техкарт (c) берутся из рецептур r, состав коктейлей карты (kid) — из техкарт k.
// Файл с открытыми данными НЕ кладите в репозиторий.
// Токен журнала живёт внутри шифровки. Без --token берётся токен текущей шифровки,
// если пароль прежний, иначе создаётся новый — тогда в Apps Script нужно заменить
// TOKEN_SHA256 на значение, которое напечатает скрипт.

import fs from "node:fs";
import path from "node:path";
import { webcrypto as wc, randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ITER = 600000;
const MENU = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "menu.json"), "utf8"));
const ABV = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "abv.json"), "utf8"));
const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "data.js");
const LINE = /^const BLOB = .*;$/m;
const PUB = /\/\* PUB:BEGIN \*\/\n[\s\S]*?\n\/\* PUB:END \*\//;

/* Крепость — из крепости сырья (tools/abv.json). Рецептура (премикс, настойка, п/ф): спирт / вся жидкость,
   вместе с соком ягод и растворённым сахаром. Коктейль при подаче: спирт / жидкость в бокале по техкарте подачи —
   с содовой, игристым, сидром, белком (талый лёд не считается). П/ф и премиксы внутри — по их рецептурам. */
const low = s => String(s).toLowerCase().replace(/ё/g, "е");
const ALC = /водк|джин|(^|[\s«])ром([\s»]|$)|ромом|текил|виски|вермут|ликер|(^|\s)вин[оа]|биттер|настойка горькая|сидр|соджу|спиртн|коньяк|бренди|пиво|мартини/;
function abvKit(rec){
  const byName = {}, key = s => low(s).replace(/\s*(п\/ф|\(премикс\))\s*/g, " ").replace(/\s+/g, " ").trim();
  for (const id in rec) byName[key(rec[id].n)] = rec[id];
  const one = (n, seen) => {
    const r = byName[key(n)];
    if (r && !seen.includes(r.id)) return mix(r, seen.concat(r.id));
    const a = ABV.abv.find(x => low(n).includes(x[0]));
    if (a) return a[1];
    if (ALC.test(low(n))) throw new Error("Нет крепости в tools/abv.json: " + n);
    return 0;
  };
  const mix = (r, seen = [r.id]) => {
    let al = 0, vol = 0;
    for (const [n, q, u] of r.i){
      if (u === "мл"){ al += q * one(n, seen); vol += q; continue; }
      const w = ABV.water.find(x => low(n).includes(x[0]));
      if (w) vol += q * w[1];
    }
    return vol ? al / vol : 0;
  };
  return mix;
}

/* Один источник: состав открытой карты и замесы в техкартах берутся из рецептур. */
function fromRecipes(body){
  const rec = {}, premix = {};
  for (const g of body.r || []) for (const it of g.items){ rec[it.id] = it; if (/^премикс/i.test(g.g)) premix[it.id] = 1; }
  const mix = abvKit(rec), pct = x => Math.round(x);
  for (const id in rec){ const a = pct(mix(rec[id])); if (a) rec[id].abv = a; else delete rec[id].abv; }
  for (const g of body.k || []) for (const it of g.items){
    const r = it.c && rec[it.c];
    if (r && r.basis === "batch"){
      it.i = r.i.map(x => x.slice());
      if (r.m) it.m = r.m;
      it.out = [r.out, "мл"];
    }
  }
  const tk = {};
  for (const g of body.k || []) for (const it of g.items) tk[it.id] = it;
  for (const g of body.pub || []) for (const it of g.items){
    const r = it.rid && rec[it.rid], t = it.kid && tk[it.kid];
    if (r) it.c = r.i.map(x => x[0]);
    else if (t) it.c = t.i.map(x => x[0]);                 // коктейли при подаче — состав из техкарты, без граммовок
    /* крепость в карточке — как в бокале: по техкарте подачи (у премикса — коктейль с тем же id);
       нет её — по рецептуре, но не у премикса: его доливают при подаче (Лонг Айленд — колой) */
    const sv = t || tk[it.id], sr = sv && sv.out ? rec[sv.c] : null;
    const a = sr ? mix(sr) : sv ? mix({ id: "@" + sv.id, i: sv.i.filter(x => x[2] === "мл") }) : r && !premix[r.id] ? mix(r) : 0;
    if (pct(a)) it.abv = pct(a); else delete it.abv;
    /* m — состав для гостей, как в меню бара (tools/menu.json); c — полный, для этикеток */
    if (!MENU[it.id]) throw new Error("Нет состава для гостей в tools/menu.json: " + it.id + " (" + it.n + ")");
    it.m = MENU[it.id];
    delete it.s;
  }
  return body;
}

function readPub(){
  const m = fs.readFileSync(PAGE, "utf8").match(PUB);
  if (!m) return [];
  const j = m[0].match(/const data = ([\s\S]*);\n\/\* PUB:END/);
  return j ? JSON.parse(j[1]) : [];
}

const b64 = buf => Buffer.from(buf).toString("base64");
const unb64 = s => Buffer.from(s, "base64");

async function derive(pw, salt, iter, usage){
  const base = await wc.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return wc.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

function readBlob(){
  const m = fs.readFileSync(PAGE, "utf8").match(LINE);
  if (!m) throw new Error("В js/data.js не найдена строка const BLOB = …;");
  return JSON.parse(m[0].slice("const BLOB = ".length, -1));
}

async function decrypt(pw){
  const B = readBlob();
  const key = await derive(pw, unb64(B.s), B.n, "decrypt");
  const plain = await wc.subtle.decrypt({ name: "AES-GCM", iv: unb64(B.i) }, key, unb64(B.c));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function encrypt(pw, file, token, salt){
  const src = JSON.parse(fs.readFileSync(file, "utf8"));
  const { pub, ...body } = fromRecipes(Array.isArray(src) ? { r: src } : src);
  if (!Array.isArray(body.r)) throw new Error("Ожидается {\"r\": [...], \"k\": [...], ...}");
  token = token || randomBytes(32).toString("hex");

  salt = salt || randomBytes(16);
  const iv = randomBytes(12);
  const key = await derive(pw, salt, ITER, "encrypt");
  const data = new TextEncoder().encode(JSON.stringify({ ...body, v: 5, t: token }));
  const c = await wc.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const blob = { s: b64(salt), i: b64(iv), c: b64(c), n: ITER };

  let html = fs.readFileSync(PAGE, "utf8");
  if (!LINE.test(html)) throw new Error("В js/data.js не найдена строка const BLOB = …;");
  html = html.replace(LINE, () => "const BLOB = " + JSON.stringify(blob) + ";");
  if (pub){
    if (!PUB.test(html)) throw new Error("В js/data.js нет блока PUB:BEGIN … PUB:END");
    html = html.replace(PUB, () => "/* PUB:BEGIN */\nconst data = " + JSON.stringify(pub, null, 1) + ";\n/* PUB:END */");
  }
  fs.writeFileSync(PAGE, html);

  console.error("Рецептуры зашифрованы и записаны в js/data.js");
  console.error("TOKEN_SHA256 для Apps Script: " + createHash("sha256").update(token).digest("hex"));
}

const [cmd, file, ...rest] = process.argv.slice(2);
const pw = process.env.MECHTY_PASSWORD;
if (!pw) { console.error("Задайте пароль в переменной MECHTY_PASSWORD"); process.exit(1); }

try {
  if (cmd === "decrypt") {
    const p = await decrypt(pw);
    const { v, t, ...body } = p;
    process.stdout.write(JSON.stringify({ ...body, pub: readPub() }, null, 1) + "\n");
  } else if (cmd === "encrypt" && file) {
    const i = rest.indexOf("--token");
    let token = i >= 0 ? rest[i + 1] : "";
    // Тот же пароль → та же соль: сохранённые на устройствах входы остаются рабочими.
    let salt = null;
    try { const old = await decrypt(pw); salt = unb64(readBlob().s); if (!token) token = old.t; } catch (e) {}
    await encrypt(pw, file, token, salt);
  } else {
    console.error("Использование: node tools/vault.mjs encrypt <vault.json> [--token <hex>] | decrypt");
    process.exit(1);
  }
} catch (e) {
  console.error("Ошибка: " + (e.message || e));
  process.exit(1);
}
