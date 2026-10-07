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
  const body = u.searchParams.has("rev") ? { ok: true, rev } : { ok: true, log: [{ t: Date.now(), n: "Тест" }] };
  return r.fulfill({ contentType: "application/javascript", body: cb + "(" + JSON.stringify(body) + ")" });
});

await page.goto(BASE + "index.html");
await page.waitForSelector("#out article", { timeout: 10000 });
const cards = await page.locator("#out article").count();
ok(cards >= 30, `открытая карта: ${cards} позиций`);
ok(await page.locator("#out img.cph").count() >= 10, "фото в карте");
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
  for (const s of ["calc", "order", "rev", "lab", "ttk"]) {
    await page.click(`[data-s="${s}"]`); await page.waitForTimeout(400);
  }
  await page.click('[data-s="calc"]');
  ok((await page.textContent("#res")).trim().length > 0, "калькулятор считает");
  await page.click('[data-s="order"]');
  ok(await page.locator("#olist input[type=checkbox]").count() > 10, "заявка");
  await page.click('[data-s="lab"]'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => document.getElementById("lback").width > 100), "этикетки рисуются");
  await page.click('[data-s="rev"]'); await page.waitForTimeout(800);
  ok(await page.locator("#rlist li").count() > 0, "ревизия");
  ok(await page.locator("#log li").count() > 0, "журнал входов");
}

ok(errs.length === 0, "без ошибок в консоли" + (errs.length ? ": " + errs.join(" | ") : ""));
await browser.close();
if (fail.length) { console.log(`\nНе прошло: ${fail.length}`); process.exit(1); }
console.log("\nВсё в порядке");
