#!/usr/bin/env node
// Сверка техкарт подачи с меню бара (напечатанное меню, ноябрь 2026): название, фото, посуда, украшение и сколько
// жидкости в бокале по техкарте против объёма в меню.
//
//   Отчёт:   MECHTY_PASSWORD='пароль' node tools/ttk-menu.mjs
//   Правки:  MECHTY_PASSWORD='пароль' node tools/ttk-menu.mjs --fix ~/vault.json
//            → расшифрованные данные с правками (фото, посуда, украшение, название — как в меню) в ~/vault.json,
//              затем MECHTY_PASSWORD='пароль' node tools/vault.mjs encrypt ~/vault.json  и удалить ~/vault.json
//   По уже расшифрованному файлу: node tools/ttk-menu.mjs --from ~/vault.json [--fix ~/vault2.json]
//
// Граммовки не печатаются и не меняются: в отчёте только итог в бокале против меню — решает бар-менеджер.
// Правки менеджера на сайте (лист «Техкарты» таблицы) стоят поверх шифровки — их скрипт не видит.
// vault.json не кладите в репозиторий.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto as wc } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");

/* как в меню: посуда и украшение — по фото коктейлей в напечатанном меню (фото карточек — те же, photos/<id>.webp).
   Ключ — id карточки «Состава и аллергенов»; техкарта подачи — с тем же id (премиксы) или по kid карточки (bar) */
const REF = {
  pantera:      ["бокал для вина", "сахарная вата"],
  pornstar:     ["коктейльная рюмка", "половинка маракуйи"],
  tropiki:      ["хайбол", "половинка маракуйи"],
  sexbeach:     ["хайбол", "коктейльная вишня, зонтик"],
  mandarin:     ["бокал для вина", "долька мандарина на шпажке"],
  granat:       ["рокс", "гроздья граната"],
  tequila:      ["хайбол", "нити чили"],
  yuzu:         ["коктейльная рюмка", "съедобный цветок"],
  ananas:       ["хайбол", "лист бамбука"],
  vnegroni:     ["рокс", "коктейльная вишня"],
  negroni:      ["рокс", "долька апельсина"],
  "c-fiero":    ["бокал-баллон", "долька апельсина"],
  "c-bosford":  ["хайбол", "долька лайма"],
  "c-watermelon": ["бокал для вина", "без украшения, подаётся с банкой Red Bull The Red Edition"],
  "c-aperol":   ["бокал для вина", "долька апельсина"],
  "c-campari":  ["бокал для вина", "долька апельсина"],
  "c-sarti":    ["бокал для вина", "кружок лайма"]
};
/* прежние названия в шифровке, которые меню сменило, и снятое с карты */
const OLD = [/юдзу\s*персик/i, /ананас\s*петрушк/i, /май\s*тай/i, /грейпфрут/i];

/* вид посуды — по словам: «Хайбол 350», «стакан хайбол» и «highball» — одно и то же; в баре говорят «коктейльная рюмка»,
   не «купе» — техкарта с «купе» правится */
const GLASS = [["хайбол", /хайбол|highball|коллинз|collins|высок/], ["рокс", /рокс|rocks|олд\s*фэшн|old\s*fashion|тумблер|низк/],
  ["коктейльная рюмка", /рюмк/], ["бокал-баллон", /баллон|ballon|копа|джин.?тоник|gin/],
  ["бокал для вина", /вин|wine|тюльпан/]];
const glassKind = s => { const l = low(s); const g = GLASS.find(([, re]) => re.test(l)); return g ? g[0] : ""; };
/* украшение — главные слова должны быть в техкарте (текст «Украшение» или строки украшения с граммовкой) */
const GAR = [["маракуй", /маракуй/], ["вата", /ват/], ["вишн", /вишн|черри|мараскин/], ["зонт", /зонт/], ["мандарин", /мандарин/],
  ["шпаж", /шпаж|пик/], ["ягод", /ягод|клюкв|брусник/], ["гранат", /гранат/], ["бамбук", /бамбук/], ["чили", /чили|перц/], ["цвет", /цвет|эдибл|фиалк|орхиде/],
  ["лист", /лист/], ["лайм", /лайм/], ["апельсин", /апельсин/], ["red bull", /red\s*bull|ред\s*булл|банк/]];
const low = s => String(s || "").toLowerCase().replace(/ё/g, "е");
const key = s => low(s).replace(/\(премикс\)|премикс|п\/ф/g, " ").replace(/[-–—«»"]/g, " ").replace(/\s+/g, " ").trim();

const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : ""; };
const from = opt("--from"), fix = opt("--fix");

async function load(){
  if (from) return JSON.parse(fs.readFileSync(from, "utf8"));
  const pw = process.env.MECHTY_PASSWORD;
  if (!pw){ console.error("Задайте пароль в MECHTY_PASSWORD или укажите расшифрованный файл: --from vault.json"); process.exit(1); }
  const B = JSON.parse(rd("js/data.js").match(/^const BLOB = (.*);$/m)[1]), u = s => Buffer.from(s, "base64");
  const base = await wc.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const k = await wc.subtle.deriveKey({ name: "PBKDF2", salt: u(B.s), iterations: B.n, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const { v, t, ...body } = JSON.parse(new TextDecoder().decode(await wc.subtle.decrypt({ name: "AES-GCM", iv: u(B.i) }, k, u(B.c))));
  return body;
}

const P = await load();
const PUB = JSON.parse(rd("js/data.js").match(/\/\* PUB:BEGIN \*\/\nconst data = ([\s\S]*);\n\/\* PUB:END \*\//)[1]);
const MENU = vm.runInNewContext("(" + rd("js/menu.js").match(/^const MENU = (\[[\s\S]*?\n\]);$/m)[1] + ")");
const PHW = JSON.parse(rd("js/core.js").match(/const PHW = (\{.*?\});/)[1]);
if (!P.pub) P.pub = PUB;
const card = {}; PUB.forEach(g => g.items.forEach(it => { card[it.id] = it; }));
const vol = {}; for (const c of MENU) for (const s of c.secs) for (const x of s.items) if (x.c) vol[x.c] = x.v;
const K = (P.k || []).flatMap(g => g.items);
const serving = t => !t.out && !t.b && Array.isArray(t.i);

const out = [], fixed = [];
const say = (id, msg) => out.push([id, msg]);
for (const id in REF){
  const it = card[id], [glass, gar] = REF[id];
  if (!it){ say(id, "карточки нет в js/data.js"); continue; }
  const want = it.n, ph = it.img;
  let t = K.find(x => serving(x) && x.id === (it.kid || id));
  if (!t) t = K.find(x => serving(x) && key(x.n) === key(want));
  if (!t){ say(want, "нет техкарты подачи (id «" + (it.kid || id) + "»)"); continue; }
  const ch = [];
  if (key(t.n) !== key(want)){ say(want, "название в техкарте «" + t.n + "» — в меню «" + want + "»"); ch.push(["n", want]); }
  if (ph && t.img !== ph){ say(want, t.img ? "фото в техкарте другое (" + t.img + ") — в меню " + ph : "в техкарте нет фото — из меню " + ph); ch.push(["img", ph]); }
  if (!t.glass){ say(want, "посуда не указана — в меню: " + glass); ch.push(["glass", glass]); }
  else if (glassKind(t.glass) !== glass){ say(want, "посуда «" + t.glass + "» — в меню: " + glass); ch.push(["glass", glass]); }
  const has = low([t.gar].concat((t.dec || []).map(x => x[0])).join(" "));
  const need = GAR.filter(([, re]) => re.test(low(gar))), miss = need.filter(([, re]) => !re.test(has)).map(([w]) => w);
  if (!t.gar && !(t.dec || []).length){ say(want, "украшение не указано — в меню: " + gar); ch.push(["gar", gar]); }
  else if (miss.length){ say(want, "украшение «" + (t.gar || (t.dec || []).map(x => x[0]).join(", ")) + "» — в меню: " + gar); ch.push(["gar", gar]); }
  /* сколько жидкости в бокале: всё в мл по техкарте подачи (лёд и украшение не считаются) */
  const v = parseFloat(String(vol[id] || it.vol || "").split("/")[0]);
  const ml = t.i.filter(x => /^мл$/i.test(x[2] || "")).reduce((a, x) => a + (+x[1] || 0), 0);
  const other = t.i.filter(x => !/^мл$/i.test(x[2] || "")).map(x => x[0]);
  if (v && Math.abs(ml - v) > 5) say(want, "в бокале по техкарте " + ml + " мл" + (other.length ? " (и не в мл: " + other.join(", ") + ")" : "") + " — в меню " + v + " мл");
  if (fix) for (const [f, v0] of ch){ const val = f === "img" ? v0 : v0[0].toUpperCase() + v0.slice(1); fixed.push(want + ": " + f + " «" + (t[f] || "—") + "» → «" + val + "»"); t[f] = val; }
}
/* прежние названия и снятые позиции — где остались */
for (const [sec, name] of [["r", "рецептуры калькулятора"], ["k", "техкарты"], ["z", "заявка заготовщиков"], ["zo", "общая заявка"], ["zn", "«Взять на бар»"]])
  for (const g of P[sec] || []) for (const it of g.items){
    const n = typeof it === "string" ? it : it.n;
    if (OLD.some(re => re.test(n))) say(n, "прежнее название или снято с карты — " + name + (it.hide ? " (скрыто)" : ""));
  }
for (const t of K) if (t.img && !PHW[String(t.img).replace(/^.*\/|\.webp$/g, "")]) say(t.n, "фото " + t.img + " без размера в PHW (js/core.js)");

console.log("Сверено с меню: " + Object.keys(REF).length + " коктейлей, техкарт всего " + K.length);
if (!out.length) console.log("Расхождений нет");
let last = ""; for (const [n, m] of out){ if (n !== last) console.log("\n" + n); console.log("  · " + m); last = n; }
if (fix){
  fs.writeFileSync(fix, JSON.stringify(P, null, 1) + "\n");
  console.log("\nПравки (" + fixed.length + ") записаны в " + fix + (fixed.length ? ":\n  " + fixed.join("\n  ") : "") +
    "\nДальше: MECHTY_PASSWORD='…' node tools/vault.mjs encrypt " + fix + " — и удалить " + fix);
}
