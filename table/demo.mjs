#!/usr/bin/env node
/* Демо «Заказ со стола» в одном HTML-файле — посмотреть без сервера: слева телефон гостя, справа экран бармена.
     node table/demo.mjs [куда.html]      по умолчанию — table/data/demo.html
   Внутри — те же страницы гостя, оплаты и бармена (table/*.html, *.js), та же логика заказов (table/core.mjs) и меню
   с фото из файлов сайта. Вместо сервера — table/core.mjs прямо в странице; данные живут, пока страница открыта. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMenu } from "./menufile.mjs";
import { PAY_NAME, payCreate } from "./pay.mjs";
import { RK_NAME } from "./rkeeper.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, "..");
const OUT = path.resolve(process.argv[2] || path.join(HERE, "data", "demo.html"));
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

/* правка текста с проверкой: поменяли страницу так, что замена не нашлась, — сборка остановится, а не соберёт сломанное демо */
function swap(src, from, to, n, file){
  const hits = typeof from === "string" ? src.split(from).length - 1 : (src.match(from) || []).length;
  if (hits !== n) throw new Error(file + ": ожидалось " + n + " совпадений «" + from + "», найдено " + hits);
  return typeof from === "string" ? src.split(from).join(to) : src.replace(from, to);
}
const js = {
  guest: [["location.pathname.match(", "DEMO.path.match(", 1], ["encodeURIComponent(location.pathname)", "encodeURIComponent(DEMO.path)", 2],
    [/location\.href = ([^;]+);/g, "DEMO.go($1);", 2], ["new URLSearchParams(location.search)", "new URLSearchParams(DEMO.search)", 1],
    ['if (location.search) history.replaceState(null, "", location.pathname);', 'DEMO.search = "";', 1],
    [`src="/' + esc(it.img)`, `src="' + esc(DEMO.img(it.img))`, 1], ["localStorage.", "DEMO.ls.", 2]],
  pay: [["new URLSearchParams(location.search)", "new URLSearchParams(DEMO.search)", 1], ["location.replace(", "DEMO.go(", 2]],
  bar: [["location.pathname.match(", "DEMO.path.match(", 1]]
};
const tpl = {}, code = {};
for (const k of Object.keys(js)){
  let h = read("table/" + k + ".html");
  h = swap(h, /<link rel="icon"[^>]*>\n/g, "", 1, k + ".html");
  h = swap(h, '<link rel="stylesheet" href="/css/app.css">\n<link rel="stylesheet" href="/table/table.css">\n', "<style>__CSS__</style>\n", 1, k + ".html");
  h = swap(h, '<script src="/table/' + k + '.js" defer></script>\n', "", 1, k + ".html");
  tpl[k] = swap(h, "</body>", "__JS__\n</body>", 1, k + ".html");
  code[k] = js[k].reduce((s, [a, b, n]) => swap(s, a, b, n, k + ".js"), read("table/" + k + ".js"));
}
const core = read("table/core.mjs").replace(/^export /gm, "");
const { menu } = readMenu(ROOT);
const photos = {};
for (const c of menu) for (const s of c.secs) for (const it of s.items) if (it.img) photos[it.img] = "data:image/webp;base64," + fs.readFileSync(path.join(ROOT, it.img)).toString("base64");
const css = read("css/app.css") + "\n" + read("table/table.css");
const J = v => JSON.stringify(v).replace(/<\//g, "<\\/").replace(/[\u2028\u2029]/g, c => "\\u" + c.charCodeAt(0).toString(16));

const page = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="dark">
<title>Заказ со стола — демо</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@400;600;700&display=swap">
<style>
:root{--bg:#0E1014;--surface:#171A20;--fg:#ECEAE4;--muted:#8E9299;--line:#262B33;--accent:#C9A24B;
  --display:"Cormorant Garamond",Georgia,serif;--sans:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 var(--sans)}
.dh{max-width:1320px;margin:0 auto;padding:20px 16px 4px}
.dm{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 8px}
h1{font-family:var(--display);font-weight:600;font-size:clamp(34px,7vw,52px);line-height:1;margin:0}
.dl{color:var(--muted);margin:10px 0 0;max-width:80ch}
.dsteps{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none;counter-reset:s}
.dsteps li{counter-increment:s;font-size:13px;border:1px solid var(--line);background:var(--surface);border-radius:99px;padding:5px 12px}
.dsteps li::before{content:counter(s) ". ";color:var(--accent);font-weight:700}
.dbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 0}
.dbar label{font-size:13px;color:var(--muted)}
.dbar select,.dbar button{font:600 14px var(--sans);color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.dbar button{cursor:pointer}
.dtabs{display:none;gap:6px}
.dtabs button[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
.dtabs b{display:inline-block;min-width:20px;margin-left:6px;border-radius:99px;background:var(--accent);color:var(--bg);font-size:12px;padding:0 6px}
.dtabs b:empty{display:none}
.dwrap{max-width:1320px;margin:0 auto;padding:14px 16px 28px;display:grid;grid-template-columns:400px minmax(0,1fr);gap:18px;align-items:start}
.dcol p{margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700}
.phone{border:10px solid #23262d;border-radius:36px;overflow:hidden;background:#000;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.phone iframe{display:block;width:100%;height:min(780px,calc(100vh - 56px));min-height:520px;border:0;background:var(--bg)}
.desk{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.desk iframe{display:block;width:100%;height:calc(100vh - 36px);min-height:560px;border:0;background:var(--bg)}
@media (max-width:980px){
  .dtabs{display:flex}
  .dwrap{grid-template-columns:minmax(0,1fr)}
  .dwrap[data-v="g"] .dcol.b,.dwrap[data-v="b"] .dcol.g{display:none}
  .dcol.g{max-width:420px;width:100%;margin:0 auto}
  .phone{border-width:6px;border-radius:24px}
}
</style>
</head>
<body>
<header class="dh">
  <p class="dm">Бар «Мечты» · демо</p>
  <h1>Заказ со стола</h1>
  <p class="dl">Слева — телефон гостя, справа — экран бармена. Всё работает внутри этой страницы: оплата ненастоящая, данные пропадут при перезагрузке. Стол 2 уже сделал заказ — он у бармена в работе.</p>
  <ol class="dsteps"><li>Нажмите «+» у напитков</li><li>Корзина → заметка → «Оплатить»</li><li>«Оплатить» на странице банка</li><li>У бармена: «Готовлю» → «Готово» → «Отдан»</li><li>Звёзды и отзыв</li></ol>
  <div class="dbar">
    <label for="dT">Телефон за столом</label>
    <select id="dT">${Array.from({ length: 10 }, (_, i) => '<option value="' + (i + 1) + '"' + (i === 4 ? " selected" : "") + ">" + (i + 1) + "</option>").join("")}</select>
    <button type="button" id="dReset">Начать заново</button>
    <span class="dtabs" id="dTabs"><button type="button" data-v="g" aria-pressed="true">Гость</button><button type="button" data-v="b" aria-pressed="false">Бармен<b id="dNew"></b></button></span>
  </div>
</header>
<main class="dwrap" id="dWrap" data-v="g">
  <div class="dcol g"><p>Телефон гостя</p><div class="phone"><iframe id="fG" title="Телефон гостя"></iframe></div></div>
  <div class="dcol b"><p>Экран бармена</p><div class="desk"><iframe id="fB" title="Экран бармена"></iframe></div></div>
</main>
<script>
"use strict";
${core}
const payCreate = ${payCreate.toString()};
const CSS = ${J(css)}, TPL = ${J(tpl)}, CODE = ${J(code)}, MENU = ${J(menu)}, PHOTOS = ${J(photos)};
const PAY_NAME = ${J(PAY_NAME)}, RK_NAME = ${J(RK_NAME)};
${read("table/demo-page.js")}</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log("Демо: " + OUT + " (" + Math.round(page.length / 1024) + " КБ)");
