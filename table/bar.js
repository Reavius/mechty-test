/* Экран бармена: оплаченные заказы со столов (неоплаченные сюда не попадают), бегунок, статусы и время готовности,
   стоп-лист и отзывы гостей. Адрес — /bar/<ключ> из окна сервера; новые заказы — каждые 2,5 секунды, со звуком. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
const hhmm = t => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const KEY = (location.pathname.match(/^\/bar\/([\w-]+)$/) || [])[1] || "";
const NAME = { paid: "Новый", cooking: "Готовится", ready: "Готов — отнести", done: "Отдан" };

let D = null, seen = null, fresh = new Map(), pane = "orders", menuD = null, ac = null, timer = 0;

async function call(url, body){
  const r = await fetch(url, { method: body ? "POST" : "GET", cache: "no-store",
    headers: Object.assign({ "x-bar-key": KEY }, body ? { "Content-Type": "application/json" } : {}), body: body ? JSON.stringify(body) : undefined });
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(d.error || "Нет связи с сервером заказов");
  return d;
}

/* новый оплаченный заказ — два коротких сигнала (браузер разрешает звук только после нажатия кнопки) */
function beep(){
  if (!ac) return;
  [0, 0.22].forEach(t => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.4, ac.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.18);
    o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.2);
  });
}

async function poll(){
  clearTimeout(timer);
  try {
    D = await call("/api/bar");
    const now = Date.now(), ids = D.orders.filter(o => o.status === "paid").map(o => o.id);
    if (seen){ const nw = ids.filter(id => !seen.has(id)); nw.forEach(id => fresh.set(id, now)); if (nw.length) beep(); }
    seen = new Set(D.orders.map(o => o.id));
    for (const [id, t] of fresh) if (now - t > 8000) fresh.delete(id);
    draw();
  } catch (e) {
    $("bOrders").innerHTML = '<p class="empty">' + esc(e.message) + '</p>';
  }
  timer = setTimeout(poll, 2500);
}

function card(o){
  const act = o.status === "paid" || o.status === "cooking", left = Math.round((o.eta - D.now) / 60e3);
  const btn = (a, t, cls) => '<button type="button" data-act="' + a + '" data-id="' + o.id + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + t + '</button>';
  const acts = { paid: btn("cook", "Готовлю", "main") + btn("ready", "Готово") + btn("eta", "+5 мин", "small"),
    cooking: btn("ready", "Готово", "main") + btn("eta", "+5 мин", "small"),
    ready: btn("done", "Отдан", "main") + btn("cook", "Вернуть в работу", "small"), done: "" }[o.status];
  return '<article class="bord ' + o.status + (fresh.has(o.id) ? " fresh" : "") + '">' +
    '<div class="btop"><h3>№ ' + o.no + '</h3><span class="btab">Стол ' + o.table + '</span></div>' +
    '<div class="bmeta"><b>' + NAME[o.status] + '</b> · оплачен в ' + hhmm(o.paid) + ' · ' + money(o.total) +
    (act ? '<br>готовность к <b' + (left < 0 ? ' class="late"' : '') + '>' + hhmm(o.eta) + '</b> — ' + (left >= 0 ? 'через ' + left + ' мин' : 'опаздывает на ' + -left + ' мин') : '') +
    (o.status === "done" ? '<br>отдан в ' + hhmm(o.done) : '') + '</div>' +
    '<ul class="blines">' + o.lines.map(l => '<li><b>' + l.q + ' ×</b>' + esc(l.n) + (l.v ? ' <span class="bmeta">' + l.v + ' ' + esc(l.u) + '</span>' : '') +
      (l.note ? '<small>! ' + esc(l.note) + '</small>' : '') + '</li>').join("") + '</ul>' +
    (o.comment ? '<p class="bcom">Комментарий: ' + esc(o.comment) + '</p>' : '') +
    (o.review ? '<p class="bmeta">Отзыв: <span class="st">' + "★".repeat(o.review.stars) + '</span>' + (o.review.text ? ' — ' + esc(o.review.text) : '') + '</p>' : '') +
    '<p class="brk' + (o.rkErr ? " err" : "") + '">' + (o.rkErr ? "R-Keeper: ошибка — " + esc(o.rkErr) : "R-Keeper: " + esc(o.rk || "—")) + '</p>' +
    '<div class="bact">' + acts + btn("slip", "Бегунок", "small") + '</div></article>';
}

function draw(){
  const s = D.stats;
  $("bStats").innerHTML = '<span>Сегодня заказов: <b>' + s.n + '</b></span><span>Сумма: <b>' + money(s.sum) + '</b></span>' +
    '<span>Оценка сегодня: <b>' + (s.avgToday || "—") + '</b></span><span>Отзывов всего: <b>' + s.nRev + '</b>' + (s.avgAll ? ', в среднем <b>' + s.avgAll + '</b>' : '') + '</span>';
  $("bFoot").textContent = "Оплата: " + D.pay + " · R-Keeper: " + D.rkName + " · стоп-лист: " + D.stop.length;
  if (pane === "orders") $("bOrders").innerHTML = D.orders.length ? D.orders.map(card).join("") : '<p class="empty">Оплаченных заказов пока нет</p>';
  if (pane === "rev") $("bRev").innerHTML = D.reviews.length ? D.reviews.map(r => '<li><span class="st">' + "★".repeat(r.stars) + "☆".repeat(5 - r.stars) + '</span> <small>· стол ' + r.table + ' · заказ № ' + r.no +
    ' · ' + esc(r.day.split("-").reverse().join(".")) + ' ' + hhmm(r.at) + '</small>' + (r.text ? '<p>' + esc(r.text) + '</p>' : '') + '</li>').join("") : '<li class="empty">Отзывов пока нет</li>';
}

async function drawStop(){
  if (!menuD) menuD = await call("/api/bar/menu");
  const f = $("gq").value.trim().toLowerCase(), stop = new Set(D ? D.stop : menuD.stop);
  let h = "";
  for (const c of menuD.menu) for (const s of c.secs){
    const items = s.items.filter(it => !f || it.n.toLowerCase().includes(f));
    if (items.length) h += '<h4>' + esc(c.n + " · " + s.n) + '</h4><ul class="bstop">' + items.map(it => '<li><label><input type="checkbox" data-stop="' + esc(it.id) + '"' +
      (stop.has(it.id) ? " checked" : "") + '> ' + esc(it.n) + '</label></li>').join("") + '</ul>';
  }
  $("bStop").innerHTML = h || '<p class="empty">Ничего не нашлось</p>';
}

function setPane(p){
  pane = p;
  $("pOrders").hidden = p !== "orders"; $("pStop").hidden = p !== "stop"; $("pRev").hidden = p !== "rev";
  document.querySelectorAll("#bTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.p === p)));
  if (p === "stop") drawStop().catch(e => { $("bStop").innerHTML = '<p class="empty">' + esc(e.message) + '</p>'; });
  else if (D) draw();
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]");
  if (b){
    const o = D.orders.find(x => x.id === b.dataset.id);
    if (!o) return;
    if (b.dataset.act === "slip"){ $("bSlipText").textContent = o.slip; $("bSlip").hidden = false; $("bPrint").focus(); return; }
    const body = { act: b.dataset.act };
    if (body.act === "eta") body.min = Math.max(0, Math.ceil((o.eta - D.now) / 60e3)) + 5;
    b.disabled = true;
    try { D = await call("/api/bar/order/" + o.id, body); draw(); } catch (err) { alert(err.message); b.disabled = false; }
    return;
  }
  const t = e.target.closest("#bTabs button");
  if (t) setPane(t.dataset.p);
});
document.addEventListener("change", async e => {
  if (!e.target.dataset.stop) return;
  try { const r = await call("/api/bar/stop", { id: e.target.dataset.stop, on: e.target.checked }); if (D) D.stop = r.stop; }
  catch (err) { alert(err.message); e.target.checked = !e.target.checked; }
});
$("gq").addEventListener("input", () => drawStop());
$("bSound").addEventListener("click", () => {
  const on = $("bSound").getAttribute("aria-pressed") !== "true";
  if (on && !ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) {}
  if (ac && on) ac.resume();
  if (on) beep();
  $("bSound").setAttribute("aria-pressed", String(on));
  $("bSound").textContent = "Звук нового заказа: " + (on ? "вкл" : "выкл");
  if (!on && ac){ ac.close(); ac = null; }
});
$("bPrint").addEventListener("click", () => window.print());
$("bSlipClose").addEventListener("click", () => { $("bSlip").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("bSlip").hidden = true; });
document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
poll();
