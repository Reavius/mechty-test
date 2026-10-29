/* Заказ со стола — страница гостя: меню стола, корзина с заметками, оплата, затем статус, время готовности, чек и отзыв.
   Адрес — из QR стола: /t/<стол>/<ключ>. Корзина и текущий заказ хранятся на телефоне гостя; цены и сумму считает сервер. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const money = n => num(n) + " ₽";
const hhmm = t => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c;
const [, TABLE, KEY] = location.pathname.match(/^\/t\/(\d+)\/([\w-]+)$/) || [];
const SK = "mechty-t" + TABLE, ACTIVE = ["new", "paid", "cooking", "ready"];

let MENU = [], ITEMS = new Map(), STOP = new Set(), cat = "all", oData = null, oTimer = 0, oStars = 0;
let st = (() => { try { const v = JSON.parse(localStorage.getItem(SK)); if (v && Array.isArray(v.cart)) return v; } catch (e) {} return { cart: [], com: "", cur: null }; })();
const keep = () => { try { localStorage.setItem(SK, JSON.stringify(st)); } catch (e) {} };

async function call(url, body){
  let r;
  try { r = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" }); }
  catch (e) { throw new Error("Нет связи с баром — проверьте интернет и попробуйте ещё раз"); }
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(d.error || "Что-то пошло не так — попробуйте ещё раз");
  return d;
}

/* ── меню ── */
const qty = (id, o) => { const l = st.cart.find(x => x.id === id && x.o === o); return l ? l.q : 0; };
const vol = (it, o) => o.v ? o.v + " " + it.u : "";
const stepper = (id, o, q) => '<span class="tstep"><button type="button" data-dec="' + esc(id) + '" data-o="' + o + '" aria-label="Меньше">−</button><b>' + q +
  '</b><button type="button" data-add="' + esc(id) + '" data-o="' + o + '" aria-label="Больше">+</button></span>';
function ctl(it){
  if (STOP.has(it.id)) return '<span class="tout">Нет в наличии</span>';
  if (it.opts.length > 1) return it.opts.map((o, i) => { const q = qty(it.id, i);
    return '<button type="button" class="topt' + (q ? " on" : "") + '" data-add="' + esc(it.id) + '" data-o="' + i + '" aria-label="Добавить: ' + esc(it.n + " " + vol(it, o)) + '">' +
      esc(vol(it, o)) + ' · ' + num(o.p) + (q ? ' <b>× ' + q + '</b>' : ' <i aria-hidden="true">+</i>') + '</button>'; }).join("");
  const q = qty(it.id, 0);
  return q ? stepper(it.id, 0, q) : '<button type="button" class="tadd" data-add="' + esc(it.id) + '" data-o="0" aria-label="Добавить: ' + esc(it.n) + '">+</button>';
}
const ctlBox = it => '<span class="tctl' + (it.opts.length > 1 ? " multi" : "") + '" data-ctl="' + esc(it.id) + '">' + ctl(it) + '</span>';
function tile(it){
  const o = it.opts[0], one = it.opts.length === 1;
  return '<article class="mtile' + (STOP.has(it.id) ? " tstop" : "") + '"><div class="chead"><h3>' + esc(it.n) + '</h3></div>' +
    '<div class="cbody">' + (it.img ? '<div class="mtx"><p class="mdesc">' + esc(it.d) + '</p></div><img class="cph" src="/' + esc(it.img) + '" alt="" loading="lazy" decoding="async">'
      : '<p class="mdesc">' + esc(it.d) + '</p>') + '</div>' +
    '<div class="mfoot">' + ctlBox(it) + (one ? '<span class="mvp">' + (o.v ? '<small>' + esc(vol(it, o)) + '</small>' : '') + '<b>' + num(o.p) + '</b></span>' : '') + '</div></article>';
}
function row(it){
  const o = it.opts[0], one = it.opts.length === 1;
  return '<li class="mrow trow' + (STOP.has(it.id) ? " tstop" : "") + '"><div class="mn"><span class="mname">' + esc(it.n) + '</span>' + (it.d ? '<small>' + esc(it.d) + '</small>' : '') +
    (one ? '' : ctlBox(it)) + '</div><span class="mv">' + (one ? esc(vol(it, o)) : '') + '</span><b class="mp">' + (one ? num(o.p) : '') + '</b>' + (one ? ctlBox(it) : '<span></span>') + '</li>';
}
function drawChips(){
  const n = c => c.secs.reduce((a, s) => a + s.items.length, 0);
  $("mchips").innerHTML = [{ k: "all", n: "Все", c: MENU.reduce((a, c) => a + n(c), 0) }].concat(MENU.map(c => ({ k: c.k, n: c.n, c: n(c) })))
    .map(d => '<button type="button" data-cat="' + esc(d.k) + '" aria-pressed="' + (d.k === cat) + '">' + esc(d.n) + '<b>' + d.c + '</b></button>').join("");
}
function drawMenu(){
  const f = $("gq").value.trim().toLowerCase(), ch = f ? "all" : cat;
  let h = "";
  for (const c of MENU){
    if (ch !== "all" && ch !== c.k) continue;
    for (const s of c.secs){
      const items = s.items.filter(it => !f || (it.n + " " + it.d).toLowerCase().includes(f));
      if (!items.length) continue;
      h += '<section class="msec"><div class="sechead"><h2>' + esc(s.n) + '</h2></div>' +
        (s.tiles ? '<div class="grid mgrid">' + items.map(tile).join("") + '</div>' : '<ul class="mlist">' + items.map(row).join("") + '</ul>') + '</section>';
    }
  }
  $("mout").innerHTML = h || '<p class="empty">Ничего не нашлось</p>';
  document.querySelectorAll("#mchips button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cat === ch)));
}
async function loadMenu(quiet){
  try {
    const d = await call("/api/menu?t=" + TABLE + "&k=" + encodeURIComponent(KEY));
    const stop = d.stop.join();
    MENU = d.menu; ITEMS = new Map(); STOP = new Set(d.stop);
    for (const c of MENU) for (const s of c.secs) for (const it of s.items) ITEMS.set(it.id, it);
    st.cart = st.cart.filter(l => ITEMS.has(l.id) && ITEMS.get(l.id).opts[l.o]);    // позиции, которых больше нет в меню, — из корзины
    keep();
    if (!quiet || stop !== loadMenu.stop){ drawChips(); drawMenu(); }
    loadMenu.stop = stop;
    drawBar();
    if (!$("vCart").hidden) drawCart();
  } catch (e) {
    if (!quiet) $("mout").innerHTML = '<p class="empty">' + esc(e.message) + '</p>';
  }
}

/* ── корзина ── */
const sum = () => st.cart.reduce((a, l) => a + ITEMS.get(l.id).opts[l.o].p * l.q, 0);
function add(id, o, d){
  let l = st.cart.find(x => x.id === id && x.o === o);
  if (!l){ if (d < 0 || STOP.has(id)) return; l = { id, o, q: 0, note: "" }; st.cart.push(l); }
  l.q = Math.min(20, l.q + d);
  if (l.q <= 0) st.cart = st.cart.filter(x => x !== l);
  keep();
  const it = ITEMS.get(id);
  document.querySelectorAll(".tctl").forEach(e => { if (e.dataset.ctl === id) e.innerHTML = ctl(it); });
  drawBar();
  if (!$("vCart").hidden){ drawCart(); if (!st.cart.length) cartShow(false); }
}
function drawBar(){
  const n = st.cart.reduce((a, l) => a + l.q, 0);
  $("tBar").hidden = !n || $("vMenu").hidden || !$("vCart").hidden;
  $("tBarN").textContent = n + " " + plural(n, "позиция", "позиции", "позиций");
  $("tBarSum").textContent = n ? money(sum()) : "";
  document.body.classList.toggle("tpad", !!n);
}
function drawCart(){
  $("cartLines").innerHTML = st.cart.map(l => {
    const it = ITEMS.get(l.id), o = it.opts[l.o], out = STOP.has(l.id);
    return '<li class="tline' + (out ? " tstop" : "") + '"><div class="tl-main"><span class="tl-n">' + esc(it.n) + '</span><small>' + esc([vol(it, o), money(o.p)].filter(Boolean).join(" · ")) +
      (out ? ' · <em>закончился — уберите</em>' : '') + '</small></div>' + stepper(l.id, l.o, l.q) + '<b class="tl-s">' + money(o.p * l.q) + '</b>' +
      '<input class="tnote" data-note="' + esc(l.id) + '" data-o="' + l.o + '" maxlength="120" placeholder="Заметка: без льда, послаще…" aria-label="Заметка к позиции ' + esc(it.n) + '" value="' + esc(l.note || "") + '"></li>';
  }).join("");
  $("adultRow").hidden = !st.cart.some(l => ITEMS.get(l.id).alc);
  $("cartSum").textContent = money(sum());
  $("cartPay").textContent = "Оплатить " + money(sum());
  $("cartPay").disabled = !st.cart.length;
}
function cartShow(on){
  $("vCart").hidden = !on;
  document.documentElement.classList.toggle("tlock", on);
  if (on){ $("cartMsg").textContent = ""; drawCart(); $("cartClose").focus(); }
  drawBar();
  if (!on && !$("tBar").hidden) $("tBar").focus({ preventScroll: true });
}
async function pay(){
  const btn = $("cartPay");
  $("cartMsg").textContent = "";
  if (!$("adultRow").hidden && !$("adult").checked){ $("cartMsg").textContent = "Подтвердите, что вам есть 18 лет"; return; }
  if (st.cart.some(l => STOP.has(l.id))){ $("cartMsg").textContent = "Уберите из корзины то, что закончилось"; return; }
  btn.disabled = true; btn.textContent = "Создаём заказ…";
  try {
    const r = await call("/api/order", { t: +TABLE, k: KEY, lines: st.cart.map(({ id, o, q, note }) => ({ id, o, q, note })), comment: st.com, adult: $("adult").checked });
    st.cur = { id: r.id, s: r.s, st: "new" }; keep();
    location.href = r.url + "&r=" + encodeURIComponent(location.pathname);
  } catch (e) {
    $("cartMsg").textContent = e.message;
    drawCart();
    if (/Меню обновилось|закончился/.test(e.message)) loadMenu(true);
  }
}

/* ── заказ: статус, время готовности, чек, отзыв ── */
function view(v){
  $("vMenu").hidden = v !== "menu"; $("vOrder").hidden = v !== "order";
  if (v !== "menu") cartShow(false);
  clearTimeout(oTimer);
  if (v === "order") pollOrder();
  else drawCur();
  drawBar();
  window.scrollTo(0, 0);
}
function drawCur(){
  const c = st.cur, on = c && ACTIVE.includes(c.st);
  $("tCur").hidden = !on;
  if (on) $("tCur").innerHTML = (c.no ? "Заказ № " + c.no : "Заказ") + " · " + esc({ new: "ждёт оплаты", paid: "принят", cooking: "готовится", ready: "готов" }[c.st]) + ' <span aria-hidden="true">→</span>';
}
async function pollOrder(){
  clearTimeout(oTimer);
  if (!st.cur) return view("menu");
  try {
    oData = await call("/api/order/" + encodeURIComponent(st.cur.id) + "?s=" + encodeURIComponent(st.cur.s));
    st.cur.st = oData.status; st.cur.no = oData.no;
    if (oData.paid && !st.cur.clear){ st.cart = []; st.com = ""; $("cartCom").value = ""; st.cur.clear = 1; }   // оплачено — корзина пустая
    keep();
    drawOrder();
  } catch (e) {
    if (/не найден/i.test(e.message)){ st.cur = null; keep(); return view("menu"); }
    $("oEta").textContent = e.message;
  }
  if (!$("vOrder").hidden && (!oData || ACTIVE.includes(oData.status))) oTimer = setTimeout(pollOrder, document.hidden ? 15000 : 4000);
}
function drawOrder(){
  const o = oData, skew = o.now - Date.now(), step = { paid: 0, cooking: 1, ready: 2, done: 3 }[o.status];
  $("oTable").textContent = "Стол " + o.table;
  $("oH").textContent = o.no ? "Заказ № " + o.no : "Заказ";
  $("oSteps").hidden = step === undefined;
  [...$("oSteps").children].forEach((li, i) => { li.className = i < step ? "ok" : i === step ? "now" : ""; });
  $("oLede").textContent = {
    new: "Ждёт оплаты — бармен начнёт готовить, как только придут деньги.", paid: "Оплачен. Бармен уже видит заказ.", cooking: "Бармен готовит ваш заказ.",
    ready: "Готов — несём к вашему столу.", done: "Заказ у вас. Приятного вечера!", expired: "Заказ не оплатили за 15 минут — он отменён. Соберите корзину заново.",
    cancelled: "Заказ отменён." }[o.status] || "";
  const left = Math.ceil((o.eta - (Date.now() + skew)) / 60e3);
  $("oEta").innerHTML = o.status === "paid" || o.status === "cooking"
    ? (left > 0 ? 'Будет готов примерно в <b>' + hhmm(o.eta) + '</b><span>через ' + left + ' ' + plural(left, "минуту", "минуты", "минут") + '</span>' : 'Почти готово — ещё пара минут')
    : o.status === "ready" ? '<b>Готов!</b><span>в ' + hhmm(o.ready) + '</span>' : "";
  $("oEta").hidden = !$("oEta").innerHTML;
  $("oPay").hidden = o.status !== "new";
  $("oLines").innerHTML = o.lines.map(l => '<li class="tline"><div class="tl-main"><span class="tl-n">' + esc(l.n) + '</span><small>' + esc([l.v ? l.v + " " + l.u : "", l.q + " × " + money(l.p)].filter(Boolean).join(" · ")) + '</small>' +
    (l.note ? '<small class="tl-note">' + esc(l.note) + '</small>' : '') + '</div><b class="tl-s">' + money(l.p * l.q) + '</b></li>').join("");
  $("oCom").hidden = !o.comment; $("oCom").textContent = o.comment ? "Комментарий: " + o.comment : "";
  $("oSum").textContent = money(o.total);
  $("oPaid").textContent = o.paid ? "оплачен в " + hhmm(o.paid) + " · " + o.payName : "не оплачен";
  $("oDemo").textContent = o.demo ? "Демо-режим: оплата не настоящая, это не кассовый чек." : "";
  $("oRev").hidden = !o.paid;
  if (o.review && !oStars){ oStars = o.review.stars; $("oText").value = o.review.text; }
  drawStars();
  $("oSend").textContent = o.review ? "Изменить отзыв" : "Отправить отзыв";
}
function drawStars(){
  $("oStars").innerHTML = [1, 2, 3, 4, 5].map(n => '<button type="button" role="radio" aria-checked="' + (n === oStars) + '" aria-label="' + n + ' из 5" data-star="' + n + '" class="' + (n <= oStars ? "on" : "") + '">★</button>').join("");
}

/* ── события ── */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-add],[data-dec],[data-cat],[data-star]");
  if (!a) return;
  if (a.dataset.cat){ cat = a.dataset.cat; $("gq").value = ""; drawMenu(); return; }
  if (a.dataset.star){ oStars = +a.dataset.star; drawStars(); $("oRevMsg").textContent = ""; return; }
  add(a.dataset.add || a.dataset.dec, +a.dataset.o, a.dataset.add ? 1 : -1);
});
document.addEventListener("input", e => {
  if (e.target.matches(".tnote")){ const l = st.cart.find(x => x.id === e.target.dataset.note && x.o === +e.target.dataset.o); if (l){ l.note = e.target.value; keep(); } }
  if (e.target.id === "cartCom"){ st.com = e.target.value; keep(); }
  if (e.target.id === "gq") drawMenu();
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("vCart").hidden) cartShow(false); });
$("tBar").addEventListener("click", () => cartShow(true));
$("cartClose").addEventListener("click", () => cartShow(false));
$("vCart").addEventListener("click", e => { if (e.target === $("vCart")) cartShow(false); });
$("cartPay").addEventListener("click", pay);
$("tCur").addEventListener("click", () => view("order"));
$("oMore").addEventListener("click", () => view("menu"));
$("oPayGo").addEventListener("click", () => { if (oData) location.href = oData.pay + "&r=" + encodeURIComponent(location.pathname); });
$("oCancel").addEventListener("click", async () => {
  try { oData = await call("/api/order/" + encodeURIComponent(st.cur.id) + "/cancel?s=" + encodeURIComponent(st.cur.s), {}); st.cur.st = oData.status; keep(); view("menu"); cartShow(!!st.cart.length); }
  catch (e) { $("oEta").hidden = false; $("oEta").textContent = e.message; }
});
$("oSend").addEventListener("click", async () => {
  if (!oStars){ $("oRevMsg").textContent = "Поставьте оценку — от 1 до 5 звёзд"; return; }
  $("oSend").disabled = true;
  try {
    oData = await call("/api/order/" + encodeURIComponent(st.cur.id) + "/review?s=" + encodeURIComponent(st.cur.s), { stars: oStars, text: $("oText").value });
    drawOrder(); $("oRevMsg").textContent = "Спасибо! Отзыв отправлен.";
  } catch (e) { $("oRevMsg").textContent = e.message; }
  $("oSend").disabled = false;
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("vOrder").hidden) pollOrder(); });
setInterval(() => { if (!document.hidden && !$("vMenu").hidden) loadMenu(true); }, 60000);   // стоп-лист бармена

(async function init(){
  if (!TABLE){ $("mout").innerHTML = '<p class="empty">Отсканируйте QR-код на столе</p>'; return; }
  $("tNo").textContent = "Стол " + TABLE;
  const q = new URLSearchParams(location.search);
  const back = q.get("c");                                             // отменили оплату — назад в корзину
  if (q.get("o") && q.get("s")){                                        // вернулись со страницы оплаты
    if (!st.cur || st.cur.id !== q.get("o")) st.cur = { id: q.get("o"), s: q.get("s"), st: "new" };
  }
  if (back && st.cur && st.cur.id === back) st.cur = null;
  keep(); if (location.search) history.replaceState(null, "", location.pathname);
  $("cartCom").value = st.com || "";
  await loadMenu();
  if (st.cur && ACTIVE.includes(st.cur.st)) view("order"); else { view("menu"); if (back && st.cart.length) cartShow(true); }
})();
