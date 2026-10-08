#!/usr/bin/env node
// Дымовой тест в настоящем браузере: страница открывается без ошибок, карта рисуется,
// вход и все разделы «Бартендерам» работают (если задан MECHTY_PASSWORD).
//
//   node tools/smoke.mjs http://localhost:8765/
//
// Браузер: CHROME=/путь/к/chrome (по умолчанию — Chromium из Playwright).
// Google Sheets подменяется заглушкой — настоящий журнал и ревизия не трогаются.

import { chromium } from "playwright-core";

const BASE = (process.argv[2] || "http://localhost:8765/").replace(/\/?$/, "/");
const PW = process.env.MECHTY_PASSWORD || "";
const fail = [];
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) fail.push(msg); };

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, serviceWorkers: "block", reducedMotion: "reduce" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error" && !/ERR_|fonts\.g|Failed to load resource/.test(m.text())) errs.push(m.text()); });

// заглушка Apps Script: журнал и ревизия
const Z5 = ["Кафе", "Склад и проход", "Клуб", "VIP", "Мансарда"];
const rev = { zones: Z5, open: { date: "05.10.2026", name: "Тест", key: "t1" }, prev: null,
  items: [{ n: "Джин", u: "л", z: [1.5, 0, 0, 0, 0], t: 1.5, p: null }, { n: "Корона", u: "шт", z: [0, 3, 0, 0, 0], t: 3, p: 2 }] };
await page.route("https://script.google.com/**", r => {
  const u = new URL(r.request().url()), cb = u.searchParams.get("callback");
  const mrev = { now: Date.now(), prev: null,
    block: { title: "Ревизия · Октябрь 2026", date: "01.10.2026", open: true, started: 1, cols: [{ id: "c1", name: "Тест", date: "01.10.2026", open: true }] },
    rows: [{ r: 7, t: "h", n: "Виски" }, { r: 8, t: "i", n: "Джемесон", u: "литр", tot: null, c: [null], p: 2 },
      { r: 9, t: "h", n: "Водка" }, { r: 10, t: "i", n: "Беленькая", u: "", tot: 1, c: [1], p: null }] };
  const body = u.searchParams.has("rev") ? { ok: true, rev } : u.searchParams.has("mrev") ? { ok: true, mrev }
    : { ok: true, log: [{ t: Date.now(), n: "Тест" }] };
  return r.fulfill({ contentType: "application/javascript", body: cb + "(" + JSON.stringify(body) + ")" });
});

await page.goto(BASE + "index.html");
await page.waitForSelector("#out article", { timeout: 10000 });
const cards = await page.locator("#out article").count();
ok(cards >= 30, `открытая карта: ${cards} позиций`);
ok(await page.locator("#out img.cph").count() >= 10, "фото в карте");
ok(await page.locator("#out .abv").count() === 0, "в карте нет крепости");
const pantera = (await page.locator("#pantera .mcomp li").allTextContents().catch(() => [])).join(" · ");
ok(pantera === "Груша · Сарти · Содовая", "состав как в меню, столбиком: " + pantera);
const leaks = await page.evaluate(() => [...document.querySelectorAll("#out .mcomp")].map(p => p.textContent).filter(t => /«|п\/ф|с\/м|Беленьк|Барристер|Девис/.test(t)));
ok(!leaks.length, "в составах карты нет внутренних названий" + (leaks.length ? ": " + leaks.slice(0, 5).join(", ") : ""));
await page.fill("#q", "негрони");
ok(await page.locator("#out article").count() >= 1 && await page.locator("#out article").count() < cards, "поиск по карте");
await page.fill("#q", "");

// ссылки из QR (#id) ведут на позицию
const ids = await page.evaluate(() => data.flatMap(g => g.items.map(i => i.id)));
ok(new Set(ids).size === ids.length, `id позиций уникальны (${ids.length})`);
await page.goto(BASE + "index.html#" + ids[0]); await page.waitForTimeout(600);
ok(await page.locator("article.hit").count() === 1, "ссылка #id подсвечивает позицию");

// вход
await page.goto(BASE + "index.html#bartenders");
await page.waitForSelector("#login[open]", { timeout: 5000 });
ok(true, "окно входа открывается");
await page.fill("#who", "Тест"); await page.fill("#mail", "test@example.ru"); await page.fill("#pw", "неверный-пароль");
await page.click("#go");
await page.waitForFunction(() => document.getElementById("gmsg").textContent.trim().length > 0, null, { timeout: 15000 });
ok(await page.locator("#viewBt").isHidden(), "неверный пароль не пускает");

if (PW) {
  await page.waitForTimeout(2200);                 // пауза после неверного пароля
  await page.fill("#pw", PW); await page.click("#go");
  await page.waitForSelector("#viewBt:not([hidden])", { timeout: 15000 });
  ok(true, "вход по паролю");
  ok(await page.locator("#tres .tcard").count() >= 30, `технологическая карта: ${await page.locator("#tres .tcard").count()}`);
  for (const s of ["calc", "order", "zone", "rev", "lab", "ttk"]) {
    await page.click(`[data-s="${s}"]`); await page.waitForTimeout(400);
  }
  await page.click('[data-s="calc"]');
  ok((await page.textContent("#res")).trim().length > 0, "калькулятор считает");
  await page.selectOption("#pos", "grapefruit").catch(() => {});
  ok((await page.textContent("#res")).includes("Балтика"), "лимонад «Грейпфрут» в калькуляторе");
  await page.click('[data-s="order"]');
  ok(await page.locator("#olist input[type=checkbox]").count() > 10, "заявка");
  // количество в заявке: отметить → вписать → в копии «позиция количество»
  await page.click('#okind [data-o="gen"]');
  const first = page.locator("#olist input[type=checkbox]").first();
  const fname = await first.getAttribute("data-n");
  await first.check();
  await page.fill("#osum input.oq", "5 кг");
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.click("#ocopy");
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(clip.includes("— " + fname + " 5 кг"), "количество попадает в копию заявки");
  await page.reload(); await page.waitForSelector("#viewBt:not([hidden])", { timeout: 15000 });
  await page.click('[data-s="order"]');
  ok(await page.inputValue("#osum input.oq") === "5 кг", "количество сохраняется");
  await page.click("#osum button.x");
  ok(await page.locator("#osum input.oq").count() === 0, "позиция убирается из сводки");
  await page.click('#okind [data-o="prep"]');
  // «Взять на бар»: отметить → количество только числом → в копии по разделам
  await page.click('[data-s="zone"]');
  ok(await page.locator("#zlist input[type=checkbox]").count() > 50, "взять на бар: список по разделам");
  const zf = page.locator("#zlist input[type=checkbox]").first(), zname = await zf.getAttribute("data-n");
  await zf.check();
  await page.fill("#zsum input.oq", "2шт");
  ok(await page.inputValue("#zsum input.oq") === "2", "взять на бар: количество — числом");
  await page.click("#zcopy");
  const zclip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  ok(/^Взять на бар \d\d\.\d\d\.\d{4}\n\n[^\n]+\n— /.test(zclip) && zclip.includes("— " + zname + " 2"), "взять на бар: копия по разделам с количеством");
  await page.click("#zsum button.x");
  ok(await page.locator("#zsum input.oq").count() === 0 && await page.locator("#olist input:checked").count() === 0, "взять на бар: отметка убирается, заявку не трогает");
  await page.click('[data-s="lab"]'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.getElementById("lback").width > 100), "этикетки рисуются");
  await page.click('[data-s="rev"]'); await page.waitForTimeout(800);
  ok(await page.locator("#rlist li").count() > 0, "ревизия");
  await page.click('#rkind [data-k="month"]'); await page.waitForTimeout(600);
  ok(await page.locator("#mlist li.rrow").count() === 2, "месячная ревизия: позиции по разделам");
  await page.fill("#mq", "виски"); await page.waitForTimeout(300);   // поиск срабатывает после паузы в наборе
  ok(await page.locator("#mlist li.rrow").count() === 1, "месячная ревизия: поиск по разделу");
  ok(await page.isVisible("#mnew") && await page.locator("#mlist .rin").count() === 1, "месячная ревизия: свой столбец и новая позиция");
  await page.fill("#mq", "");
  await page.click('#rkind [data-k="day"]');
  ok(await page.locator("#log li").count() > 0, "журнал входов");
  await page.click('[data-s="wo"]'); await page.waitForTimeout(300);
  ok(await page.inputValue("#woName") === "Тест" && await page.locator("#woRows .worow").count() >= 1, "списания: форма акта");
  ok(await page.isVisible("#wnBox") && await page.locator("#wnList li").count() >= 1 && await page.isDisabled("#wnMove"), "списания: заметка к списанию");
  await page.click("#woPasteOpen");
  await page.fill("#woPasteT", "Алко\n- Водка Беленькая — 170 мл\nКлавис 20 + 30мл\n40 мл окхарт — Порча");
  await page.click("#woPasteGo");
  const pasted = await page.evaluate(() => woRowsData().filter(r => r.n).map(r => [r.n, r.q, r.u, r.why].join("|")).join(";"));
  ok(pasted === "Водка Беленькая|170|мл|;Клавис|50|мл|;Окхарт|40|мл|Порча", "списания: вставка списком" + (pasted === "Водка Беленькая|170|мл|;Клавис|50|мл|;Окхарт|40|мл|Порча" ? "" : ": " + pasted));
  await page.click('#wokind [data-k="pr"]'); await page.waitForTimeout(200);
  ok(await page.textContent("#woTitle") === "Акт проработки" && await page.textContent("#woRows .woy") === "Проработка", "списания: акт проработки");
  await page.click('#wokind [data-k="wo"]');
}

ok(errs.length === 0, "без ошибок в консоли" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
if (fail.length) { console.log(`\nНе прошло: ${fail.length}`); process.exit(1); }
console.log("\nВсё в порядке");
