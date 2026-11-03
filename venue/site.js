/* Сайт заведения «Мечты»: всё содержимое — с сервера (/api/site), правится в админке. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MON3 = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"], WDF = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const dd = s => new Date(s + "T12:00:00Z");
const dayTx = s => dd(s).getUTCDate() + " " + MON[dd(s).getUTCMonth()];
const wdOf = s => WD[dd(s).getUTCDay()];
const rub = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
let S = null, evZone = "", mTab = "kitchen", mSec = "", bkZone = "";

async function api(p, body){
  if (window.VENUE_LOCAL) return window.VENUE_LOCAL(p, body);                 // онлайн-пример: всё в этом браузере (venue/local.js)
  try {
    const r = await fetch(p, body ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)} : {});
    const d = await r.json().catch(() => ({}));
    return r.ok ? d : {error: d.error || "Не получилось — попробуйте ещё раз."};
  } catch (e) { return {error: "Нет связи — попробуйте ещё раз."}; }
}
const zoneOf = id => (S.zones || []).find(z => z.id === id) || {name: "", color: "#C9A24B"};

/* шторка разделов */
function drawer(on){
  $("drawer").classList.toggle("on", on); $("drawer").setAttribute("aria-hidden", String(!on));
  $("burger").setAttribute("aria-expanded", String(on));
}
$("burger").addEventListener("click", () => drawer(true));
$("drawer").addEventListener("click", e => { if (e.target.closest("[data-close]") || e.target.closest("a")) drawer(false); });

/* афиша: плакат — фото события или цвет зала с крупной датой */
function poster(e, big){
  const z = zoneOf(e.zone), d = dd(e.date);
  const bg = "background:radial-gradient(120% 90% at 85% 10%," + z.color + "cc 0%,transparent 60%),radial-gradient(90% 80% at 0% 100%," + z.color + "55 0%,transparent 65%),#16181D";
  return '<div class="poster" style="' + bg + '">' + (e.img ? '<img src="' + esc(e.img) + '" alt="" loading="lazy">' : "") +
    '<span class="pz">' + esc(z.name || "Все залы") + '</span>' +
    '<span class="pd"><span>' + WD[d.getUTCDay()] + " · " + esc(e.time || "") + '</span><b>' + d.getUTCDate() + '</b><span>' + MON3[d.getUTCMonth()] + '</span></span></div>';
}
function drawEvents(){
  const zs = [{id: "", name: "Все"}].concat(S.zones.filter(z => S.events.some(e => e.zone === z.id)));
  $("evZones").innerHTML = zs.map(z => '<button type="button" class="chip" data-z="' + esc(z.id) + '" aria-pressed="' + (z.id === evZone) + '">' + esc(z.name) + '</button>').join("");
  const list = S.events.filter(e => !evZone || e.zone === evZone);
  $("evList").innerHTML = list.length ? list.map(e => '<button type="button" class="ev" data-ev="' + esc(e.id) + '">' + poster(e) +
    '<div class="eb"><h3>' + esc(e.title) + '</h3><p>' + esc(dayTx(e.date)) + ", " + esc(e.time) + " · " + esc(e.price || "") + '</p></div></button>').join("")
    : '<p class="empty">Скоро здесь появятся новые события.</p>';
  $("evPast").innerHTML = S.past.length ? "Прошли недавно: " + S.past.slice(0, 3).map(e => esc(e.title) + " (" + esc(dayTx(e.date)) + ")").join(", ") +
    (S.albums.length ? ' — <a href="#photo">фотоотчёты</a>' : "") : "";
}
$("evZones").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (b){ evZone = b.dataset.z; drawEvents(); } });
$("evList").addEventListener("click", e => { const b = e.target.closest("[data-ev]"); if (b) location.hash = "event-" + b.dataset.ev; });

function sheetOpen(e){
  const z = zoneOf(e.zone), sh = $("sheet");
  sh.innerHTML = '<div class="sb"><button type="button" class="x" data-x aria-label="Закрыть">×</button>' + poster(e, true) +
    '<div class="sc"><h3 id="shTitle">' + esc(e.title) + '</h3><p class="meta">' + esc(WDF[dd(e.date).getUTCDay()]) + ", " + esc(dayTx(e.date)) + " · " + esc(e.time) +
    " · " + esc(z.name || "") + (e.price ? " · " + esc(e.price) : "") + '</p><p>' + esc(e.text || "") + '</p>' +
    '<div class="acts"><button type="button" class="btn" data-bk="' + esc(e.id) + '">Забронировать стол</button>' +
    '<button type="button" class="btn ghost" data-ics="' + esc(e.id) + '">В календарь</button><button type="button" class="btn ghost" data-share="' + esc(e.id) + '">Поделиться</button></div>' +
    '<p class="fmsg" id="shMsg" role="status"></p></div></div>';
  sh.hidden = false; document.body.style.overflow = "hidden";
  sh.querySelector("[data-x]").focus();
}
function sheetClose(){
  if ($("sheet").hidden) return;
  $("sheet").hidden = true; document.body.style.overflow = "";
  if (/^#event-/.test(location.hash)) history.replaceState(null, "", location.pathname + "#afisha");
}
function route(){
  const m = /^#event-([\w-]+)$/.exec(location.hash);
  if (!m || !S) return sheetClose();
  const e = S.events.concat(S.past).find(x => x.id === m[1]);
  if (e) sheetOpen(e);
}
window.addEventListener("hashchange", route);
/* событие в календарь телефона: файл .ics, время местное */
function ics(e){
  const t = (e.time || "20:00").replace(":", ""), d = e.date.replace(/-/g, "");
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mechty//RU", "BEGIN:VEVENT", "UID:" + e.id + "@mechty", "DTSTART:" + d + "T" + t + "00", "DURATION:PT4H",
    "SUMMARY:" + e.title.replace(/[,;\n]/g, " "), "LOCATION:" + (S.info.name + ", " + S.info.address).replace(/[,;\n]/g, " "), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(txt); a.download = "mechty-" + e.date + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
}
$("sheet").addEventListener("click", async ev => {
  if (ev.target === $("sheet") || ev.target.closest("[data-x]")) return sheetClose();
  const all = S.events.concat(S.past), b = ev.target.closest("[data-bk],[data-ics],[data-share]");
  if (!b) return;
  const e = all.find(x => x.id === (b.dataset.bk || b.dataset.ics || b.dataset.share));
  if (b.dataset.bk){ sheetClose(); bookFor(e.zone, e.date, e.id); return; }
  if (b.dataset.ics) return ics(e);
  const url = location.origin + "/#event-" + e.id;
  if (navigator.share) { try { await navigator.share({title: e.title, url}); } catch (x) {} return; }
  try { await navigator.clipboard.writeText(url); $("shMsg").textContent = "Ссылка скопирована"; } catch (x) { $("shMsg").textContent = url; }
});
document.addEventListener("keydown", e => { if (e.key === "Escape"){ sheetClose(); lbClose(); drawer(false); } });

/* формы: поля → объект, согласие — галочка; ответ — вместо формы */
function wire(form, path, done, extra){
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = form.querySelector(".fmsg"), btn = form.querySelector("button[type=submit]");
    const o = Object.fromEntries(new FormData(form).entries());
    o.consent = !!form.querySelector("[name=consent]") && form.querySelector("[name=consent]").checked;
    if (extra) Object.assign(o, extra());
    btn.disabled = true; msg.className = "fmsg"; msg.textContent = "Отправляем…";
    const d = await api(path, o);
    btn.disabled = false;
    if (d.error){ msg.className = "fmsg bad"; msg.textContent = d.error; return; }
    msg.textContent = "";
    done(d, form);
  });
}
const doneBox = (form, title, text, again) => {
  const box = document.createElement("div"); box.className = "done";
  box.innerHTML = '<b>' + esc(title) + '</b><p>' + esc(text) + '</p>' + (again ? '<button type="button" class="btn ghost small">' + esc(again) + '</button>' : "");
  form.hidden = true; form.parentNode.appendChild(box);
  const b = box.querySelector("button");
  if (b) b.addEventListener("click", () => { box.remove(); form.reset(); form.hidden = false; drawBookZones(); });
};

/* бронь */
function times(){
  const out = [];
  for (let h = 13; h < 27; h++) for (const m of ["00", "30"]) out.push(String(h % 24).padStart(2, "0") + ":" + m);
  return out;
}
function drawBookZones(){
  if (!bkZone && S.zones[0]) bkZone = S.zones[0].id;
  $("bkZones").innerHTML = S.zones.map(z => '<button type="button" class="chip" data-z="' + esc(z.id) + '" aria-pressed="' + (z.id === bkZone) + '">' + esc(z.name) + '</button>').join("");
}
$("bkZones").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (b){ bkZone = b.dataset.z; drawBookZones(); } });
document.querySelector("#bookF .stepper").addEventListener("click", e => {
  const b = e.target.closest("[data-step]"); if (!b) return;
  const i = $("bkGuests"); i.value = Math.max(1, Math.min(300, (parseInt(i.value, 10) || 1) + +b.dataset.step));
});
function bookFor(zone, date, ev){
  const form = $("bookF");
  if (form.hidden){ const d = form.parentNode.querySelector(".done"); if (d) d.remove(); form.hidden = false; }
  if (zone) bkZone = zone;
  if (date) $("bkDate").value = date;
  $("bkEvent").value = ev || "";
  if (ev){ const e = S.events.find(x => x.id === ev); if (e && e.time) $("bkTime").value = e.time; }
  drawBookZones();
  $("book").scrollIntoView({behavior: "smooth"});
}
wire($("bookF"), "/api/book", (d, f) => doneBox(f, "Заявка отправлена", "Администратор перезвонит и подтвердит бронь. В рабочей версии заявка сразу приходит ему в Telegram.", "Ещё одна бронь"),
  () => ({zone: bkZone, guests: +$("bkGuests").value || 0}));

/* залы */
function drawZones(){
  $("zoneList").innerHTML = S.zones.map(z => '<article class="card zone"><div class="zart" style="background:radial-gradient(130% 120% at 100% 0%,' + z.color + 'bb 0%,transparent 60%),radial-gradient(80% 90% at 0% 100%,' + z.color + '44 0%,transparent 70%),#16181D">' +
    (z.img ? '<img src="' + esc(z.img) + '" alt="" loading="lazy">' : "") + '<h3>' + esc(z.name) + '</h3></div><div class="zb">' +
    '<div class="zm"><span><b>' + esc(z.cap || "") + '</b></span><span>' + esc(z.hours || "") + '</span></div><p>' + esc(z.text || "") + '</p>' +
    '<div class="tags">' + String(z.feats || "").split(",").map(s => s.trim()).filter(Boolean).map(s => '<span>' + esc(s) + '</span>').join("") + '</div>' +
    '<button type="button" class="btn small ghost" data-zb="' + esc(z.id) + '">Забронировать здесь</button></div></article>').join("");
}
$("zoneList").addEventListener("click", e => { const b = e.target.closest("[data-zb]"); if (b) bookFor(b.dataset.zb); });

/* банкеты */
function drawBanquet(){
  $("packList").innerHTML = S.packages.map(p => '<article class="card pack"><h3>' + esc(p.title) + '</h3><p class="pp">' + esc(p.price || "") + '</p><p>' + esc(p.text || "") + '</p></article>').join("");
  $("bqZone").innerHTML = '<option value="">Подскажите</option>' + S.zones.map(z => '<option value="' + esc(z.id) + '">' + esc(z.name) + '</option>').join("");
  $("bqFormat").innerHTML = S.packages.map(p => '<option>' + esc(p.title) + '</option>').join("") + '<option>Другое</option>';
}
wire($("bqF"), "/api/banquet", (d, f) => doneBox(f, "Спасибо!", "Менеджер по банкетам свяжется с вами, обсудит меню и пришлёт расчёт.", "Ещё одна заявка"));

/* меню: кухня — из админки, бар — из барного гида */
function drawMenu(){
  const tabs = [{k: "kitchen", n: "Кухня"}].concat((S.bar || []).map(c => ({k: c.k, n: c.n})));
  $("mTabs").innerHTML = tabs.map(t => '<button type="button" class="chip" data-t="' + esc(t.k) + '" aria-pressed="' + (t.k === mTab) + '">' + esc(t.n) + '</button>').join("");
  let secs;
  if (mTab === "kitchen"){
    const by = {};
    S.kitchen.forEach(x => { (by[x.sec || "Меню"] = by[x.sec || "Меню"] || []).push(x); });
    secs = Object.keys(by).map(n => ({n, items: by[n].map(x => ({n: x.name, d: x.desc, p: x.price, v: x.out}))}));
  } else {
    const ch = (S.bar || []).find(c => c.k === mTab) || {secs: []};
    secs = ch.secs.map(s => ({n: s.n, items: s.items.map(x => ({n: x.n, d: x.d, img: x.img, p: x.opts && x.opts[0] ? x.opts[0].p : null, v: x.opts && x.opts[0] && x.opts[0].v ? x.opts[0].v + " " + (x.u || "мл") : ""}))}));
  }
  if (!secs.some(s => s.n === mSec)) mSec = "";
  $("mSecs").innerHTML = secs.length > 1 ? ['<button type="button" class="chip" data-s="" aria-pressed="' + (!mSec) + '">Всё</button>'].concat(secs.map(s => '<button type="button" class="chip" data-s="' + esc(s.n) + '" aria-pressed="' + (s.n === mSec) + '">' + esc(s.n) + '</button>')).join("") : "";
  $("mList").innerHTML = secs.filter(s => !mSec || s.n === mSec).map(s => '<h3 class="msec">' + esc(s.n) + '</h3>' + s.items.map(x =>
    '<div class="mi' + (x.img ? "" : " noimg") + '">' + (x.img ? '<img src="/' + esc(x.img) + '" alt="" loading="lazy">' : "") +
    '<div><div class="mn">' + esc(x.n) + '</div>' + (x.d ? '<div class="md">' + esc(x.d) + '</div>' : "") + '</div>' +
    '<div class="mp">' + (x.p != null ? rub(x.p) : "") + (x.v ? '<small>' + esc(x.v) + '</small>' : "") + '</div></div>').join("")).join("") || '<p class="empty">Скоро здесь будет меню.</p>';
  $("mNote").innerHTML = mTab === "kitchen" ? "Меню кухни в примере — для образца; настоящее вносится в админке." :
    'Карта бара — та же, что в <a href="' + esc(S.info.guide) + '" target="_blank" rel="noopener">барном гиде</a>: там истории коктейлей, состав и аллергены. Поменяли карту в гиде — здесь обновится само.';
}
$("mTabs").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (b){ mTab = b.dataset.t; mSec = ""; drawMenu(); } });
$("mSecs").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (b){ mSec = b.dataset.s; drawMenu(); } });

/* акции, новости */
function drawPromoNews(){
  $("promoList").innerHTML = S.promos.length ? S.promos.map(p => '<article class="card promo"><h3>' + esc(p.title) + '</h3><p>' + esc(p.text || "") + '</p>' +
    (p.until ? '<small>до ' + esc(dayTx(p.until)) + '</small>' : "") + '</article>').join("") : '<p class="empty">Скоро здесь появятся акции.</p>';
  $("newsList").innerHTML = S.news.slice(0, 6).map(n => '<article class="card news"><time datetime="' + esc(n.date) + '">' + esc(dayTx(n.date)) + '</time><h3>' + esc(n.title) + '</h3><p>' + esc(n.text || "") + '</p></article>').join("");
}

/* фото: альбом → просмотр с листанием */
let lbA = null, lbI = 0;
function drawAlbums(){
  $("albList").innerHTML = S.albums.map(a => '<button type="button" class="alb" data-a="' + esc(a.id) + '"><img src="' + esc(a.photos[0] || "") + '" alt="" loading="lazy"><div><b>' + esc(a.title) + '</b><small>' +
    esc(dayTx(a.date)) + " · " + a.photos.length + " фото</small></div></button>").join("") || '<p class="empty">Скоро здесь будут фото.</p>';
}
function lbDraw(){
  const a = lbA, p = a.photos[lbI];
  $("lb").innerHTML = '<span class="lbt">' + esc(a.title) + " · " + (lbI + 1) + " / " + a.photos.length + '</span><img src="' + esc(p) + '" alt="Фото ' + (lbI + 1) + '">' +
    '<button type="button" class="lx" data-lx aria-label="Закрыть">×</button><button type="button" class="lp" data-lp aria-label="Предыдущее">‹</button><button type="button" class="ln" data-ln aria-label="Следующее">›</button>';
}
const lbClose = () => { if (!$("lb").hidden){ $("lb").hidden = true; document.body.style.overflow = ""; } };
const lbGo = d => { lbI = (lbI + d + lbA.photos.length) % lbA.photos.length; lbDraw(); };
$("albList").addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (!b) return; lbA = S.albums.find(a => a.id === b.dataset.a); lbI = 0; lbDraw(); $("lb").hidden = false; document.body.style.overflow = "hidden"; });
$("lb").addEventListener("click", e => { if (e.target.closest("[data-lx]") || e.target === $("lb")) return lbClose(); if (e.target.closest("[data-lp]")) lbGo(-1); if (e.target.closest("[data-ln]")) lbGo(1); });
let tx = 0;
$("lb").addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive: true});
$("lb").addEventListener("touchend", e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) lbGo(d < 0 ? 1 : -1); });
document.addEventListener("keydown", e => { if ($("lb").hidden) return; if (e.key === "ArrowRight") lbGo(1); if (e.key === "ArrowLeft") lbGo(-1); });

/* сертификат */
const SUMS = [2000, 3000, 5000, 10000];
function certPrev(){
  const s = parseInt(String($("cAmount").value).replace(/\D/g, ""), 10) || 0;
  $("cPrevSum").textContent = s ? rub(s) : "— ₽";
  $("cPrevTo").textContent = ($("cTo").value.trim() ? "Для: " + $("cTo").value.trim() : "Для самого близкого") + ($("cFrom").value.trim() ? " · от " + $("cFrom").value.trim() : "");
  $("cSums").innerHTML = SUMS.map(v => '<button type="button" class="chip" data-v="' + v + '" aria-pressed="' + (v === s) + '">' + rub(v) + '</button>').join("");
}
$("cSums").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b){ $("cAmount").value = b.dataset.v; certPrev(); } });
["cAmount", "cTo", "cFrom"].forEach(id => $(id).addEventListener("input", certPrev));
wire($("certF"), "/api/cert", d => { location.href = "/cert.html#" + d.code; }, () => ({amount: parseInt(String($("cAmount").value).replace(/\D/g, ""), 10) || 0}));

/* подписка, вакансии */
wire($("subF"), "/api/subscribe", (d, f) => { const m = f.querySelector(".fmsg"); f.reset(); m.className = "fmsg ok"; m.textContent = "Готово — первое письмо придёт в четверг."; });
function drawJobs(){
  $("jobList").innerHTML = S.vacancies.map(v => '<article class="card vac"><h3>' + esc(v.title) + '</h3><span class="pay">' + esc(v.pay || "") + '</span><p>' + esc(v.text || "") + '</p>' +
    '<button type="button" class="link" data-job="' + esc(v.id) + '">Откликнуться →</button></article>').join("") || '<p class="empty">Сейчас открытых вакансий нет.</p>';
  $("jbVac").innerHTML = S.vacancies.map(v => '<option value="' + esc(v.id) + '">' + esc(v.title) + '</option>').join("");
}
$("jobList").addEventListener("click", e => { const b = e.target.closest("[data-job]"); if (!b) return; $("jobBox").hidden = false; $("jbVac").value = b.dataset.job; $("jobBox").scrollIntoView({behavior: "smooth", block: "center"}); });
wire($("jobF"), "/api/job", (d, f) => doneBox(f, "Отклик отправлен", "Управляющий посмотрит и перезвонит."));

/* контакты и шапка */
function drawInfo(){
  const I = S.info, q = encodeURIComponent((I.city ? I.city + " " : "") + (I.mapq || I.name));
  document.title = "«" + I.name + "» — " + (I.kicker || "").toLowerCase();
  $("lgName").textContent = I.name.toUpperCase(); $("hName").textContent = I.name; $("hKick").textContent = I.kicker || ""; $("hTag").textContent = I.tagline || "";
  $("ctAddr").textContent = (I.city ? I.city + ", " : "") + I.address; $("ctTel").textContent = I.phone; $("ctTel").href = "tel:" + I.phone.replace(/[^\d+]/g, "");
  $("ctHours").innerHTML = (I.hours || []).map(h => '<tr><td>' + esc(h.zone) + '</td><td>' + esc(h.text) + '</td></tr>').join("");
  $("ctDress").textContent = I.dress || ""; $("ctPark").textContent = I.parking || "";
  $("ctSoc").innerHTML = [I.tg ? '<a class="btn small ghost" href="' + esc(I.tg) + '" target="_blank" rel="noopener">Telegram</a>' : "", I.ig ? '<a class="btn small ghost" href="' + esc(I.ig) + '" target="_blank" rel="noopener">Instagram</a>' : ""].join("");
  $("tgBtn").href = I.tg || "#"; $("ftGuide").href = I.guide || "#";
  $("mapName").textContent = "«" + I.name + "»";
  $("mapY").href = $("revY").href = "https://yandex.ru/maps/?text=" + q; $("map2").href = $("rev2").href = "https://2gis.ru/search/" + q;
  const n = S.events[0];
  $("hNext").innerHTML = n ? '<a class="nextev" href="#event-' + esc(n.id) + '"><em>Ближайшее</em> ' + esc(wdOf(n.date)) + ", " + esc(dayTx(n.date)) + " — " + esc(n.title) + "&nbsp;→</a>" : "";
  $("hNow").innerHTML = (I.hours || []).slice(0, 2).map(h => '<span>' + esc(h.zone) + ': <b>' + esc(h.text) + '</b></span>').join("");
}

/* видео на первом экране — без «уменьшить движение» и не при экономии трафика */
function heroVideo(){
  const v = $("hvid"), c = navigator.connection;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || (c && (c.saveData || /2g$/.test(c.effectiveType || "")))) return;
  v.play().catch(() => {});
}

(async function init(){
  $("bkTime").innerHTML = times().map(t => '<option' + (t === "19:00" ? " selected" : "") + '>' + t + '</option>').join("");
  const d = await api("/api/site");
  if (d.error){ document.querySelector("main").insertAdjacentHTML("afterbegin", '<p class="wrap empty">' + esc(d.error) + '</p>'); return; }
  S = d;
  $("bkDate").min = $("bqDate").min = S.today; $("bkDate").value = S.today;
  drawInfo(); drawEvents(); drawBookZones(); drawZones(); drawBanquet(); drawMenu(); drawPromoNews(); drawAlbums(); certPrev(); drawJobs();
  heroVideo(); route();
})();
