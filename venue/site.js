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
const seats = n => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "место" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "места" : "мест");
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
    '<span class="pd"><span>' + WD[d.getUTCDay()] + ", " + esc(e.time || "") + '</span><b>' + d.getUTCDate() + '</b><span>' + MON3[d.getUTCMonth()] + '</span></span></div>';
}
function drawEvents(){
  const zs = [{id: "", name: "Все"}].concat(S.zones.filter(z => S.events.some(e => e.zone === z.id)));
  $("evZones").innerHTML = zs.map(z => '<button type="button" class="chip" data-z="' + esc(z.id) + '" aria-pressed="' + (z.id === evZone) + '">' + esc(z.name) + '</button>').join("");
  const list = S.events.filter(e => !evZone || e.zone === evZone);
  $("evList").innerHTML = list.length ? list.map(e => '<button type="button" class="ev" data-ev="' + esc(e.id) + '">' + poster(e) +
    '<div class="eb"><h3>' + esc(e.title) + '</h3><p>' + esc(dayTx(e.date)) + ", " + esc(e.time) + '</p>' + (e.price ? '<p class="epr">' + esc(e.price) + '</p>' : "") + '</div></button>').join("")
    : '<p class="empty">Скоро здесь появятся новые события.</p>';
  $("evPast").innerHTML = S.past.length ? "Прошли недавно: " + S.past.slice(0, 3).map(e => esc(e.title) + " (" + esc(dayTx(e.date)) + ")").join(", ") +
    (S.albums.length ? ' — <a href="#photo">фотоотчёты</a>' : "") : "";
}
$("evZones").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (b){ evZone = b.dataset.z; drawEvents(); } });
$("evList").addEventListener("click", e => { const b = e.target.closest("[data-ev]"); if (b) location.hash = "event-" + b.dataset.ev; });

function sheetOpen(e){
  const z = zoneOf(e.zone), sh = $("sheet");
  sh.innerHTML = '<div class="sb"><button type="button" class="x" data-x aria-label="Закрыть">×</button>' + poster(e, true) +
    '<div class="sc"><h3 id="shTitle">' + esc(e.title) + '</h3><p class="meta">' + esc(WDF[dd(e.date).getUTCDay()]) + ", " + esc(dayTx(e.date)) + ", " + esc(e.time) +
    '<br>' + esc(z.name || "Все залы") + (e.price ? ", " + esc(e.price) : "") + '</p><p>' + esc(e.text || "") + '</p>' +
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
  const url = location.href.split("#")[0] + "#event-" + e.id;
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
  if (b) b.addEventListener("click", () => { box.remove(); form.reset(); form.hidden = false; $("bkTable").value = ""; planKey = ""; drawBookZones(); });
};

/* бронь */
function times(){
  const out = [];
  for (let h = 13; h < 27; h++) for (const m of ["00", "30"]) out.push(String(h % 24).padStart(2, "0") + ":" + m);
  return out;
}
function drawBookZones(){
  if (!bkZone && S.zones[0]) bkZone = S.zones[0].id;
  if (!$("bkDate").value) $("bkDate").value = S.today;                        // после «Ещё одна бронь» форма сброшена
  $("bkZones").innerHTML = S.zones.map(z => '<button type="button" class="chip" data-z="' + esc(z.id) + '" aria-pressed="' + (z.id === bkZone) + '">' + esc(z.name) + '</button>').join("");
  drawPlan();
}
$("bkZones").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (b && b.dataset.z !== bkZone){ bkZone = b.dataset.z; $("bkTable").value = ""; drawBookZones(); } });
document.querySelector("#bookF .stepper").addEventListener("click", e => {
  const b = e.target.closest("[data-step]"); if (!b) return;
  const i = $("bkGuests"); i.value = Math.max(1, Math.min(300, (parseInt(i.value, 10) || 1) + +b.dataset.step)); planTxt();
});
function bookFor(zone, date, ev){
  const form = $("bookF");
  if (form.hidden){ const d = form.parentNode.querySelector(".done"); if (d) d.remove(); form.hidden = false; }
  if (zone && zone !== bkZone){ bkZone = zone; $("bkTable").value = ""; }
  if (date) $("bkDate").value = date;
  $("bkEvent").value = ev || "";
  if (ev){ const e = S.events.find(x => x.id === ev); if (e && e.time) $("bkTime").value = e.time; }
  drawBookZones();
  $("book").scrollIntoView({behavior: "smooth"});
}
wire($("bookF"), "/api/book", (d, f) => doneBox(f, "Заявка отправлена", "Администратор перезвонит и подтвердит бронь. В рабочей версии заявка сразу приходит ему в Telegram.", "Ещё одна бронь"),
  () => ({zone: bkZone, guests: +$("bkGuests").value || 0, table: $("bkTable").value}));

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
    '<div class="mi' + (x.img ? "" : " noimg") + '">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : "") +
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
    esc(dayTx(a.date)) + ", " + a.photos.length + " фото</small></div></button>").join("") || '<p class="empty">Скоро здесь будут фото.</p>';
}
function lbDraw(){
  const a = lbA, p = a.photos[lbI];
  $("lb").innerHTML = '<span class="lbt">' + esc(a.title) + ", " + (lbI + 1) + " из " + a.photos.length + '</span><img src="' + esc(p) + '" alt="Фото ' + (lbI + 1) + '">' +
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
  $("cPrevTo").textContent = ($("cTo").value.trim() ? "Кому: " + $("cTo").value.trim() : "Для самого близкого") + ($("cFrom").value.trim() ? ", от: " + $("cFrom").value.trim() : "");
  $("cSums").innerHTML = SUMS.map(v => '<button type="button" class="chip" data-v="' + v + '" aria-pressed="' + (v === s) + '">' + rub(v) + '</button>').join("");
}
$("cSums").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b){ $("cAmount").value = b.dataset.v; certPrev(); } });
["cAmount", "cTo", "cFrom"].forEach(id => $(id).addEventListener("input", certPrev));
wire($("certF"), "/api/cert", d => { location.href = "cert.html#" + d.code; }, () => ({amount: parseInt(String($("cAmount").value).replace(/\D/g, ""), 10) || 0}));

/* подписка, вакансии */
wire($("subF"), "/api/subscribe", (d, f) => { const m = f.querySelector(".fmsg"); f.reset(); m.className = "fmsg ok"; m.textContent = "Готово — первое письмо придёт в четверг."; });
function drawJobs(){
  $("jobList").innerHTML = S.vacancies.map(v => '<article class="card vac"><h3>' + esc(v.title) + '</h3><span class="pay">' + esc(v.pay || "") + '</span><p>' + esc(v.text || "") + '</p>' +
    '<button type="button" class="link" data-job="' + esc(v.id) + '">Откликнуться</button></article>').join("") || '<p class="empty">Сейчас открытых вакансий нет.</p>';
  $("jbVac").innerHTML = S.vacancies.map(v => '<option value="' + esc(v.id) + '">' + esc(v.title) + '</option>').join("");
}
$("jobList").addEventListener("click", e => { const b = e.target.closest("[data-job]"); if (!b) return; $("jobBox").hidden = false; $("jbVac").value = b.dataset.job; $("jobBox").scrollIntoView({behavior: "smooth", block: "center"}); });
wire($("jobF"), "/api/job", (d, f) => doneBox(f, "Отклик отправлен", "Управляющий посмотрит и перезвонит."));

/* контакты и шапка */
function drawInfo(){
  const I = S.info, q = encodeURIComponent((I.city ? I.city + " " : "") + (I.mapq || I.name));
  document.title = "«" + I.name + "»" + (I.kicker ? " — " + I.kicker : "");
  $("lgName").textContent = I.name.toUpperCase(); $("hName").textContent = I.name; $("hTag").textContent = I.tagline || "";
  $("ctAddr").textContent = (I.city ? I.city + ", " : "") + I.address; $("ctTel").textContent = I.phone; $("ctTel").href = "tel:" + I.phone.replace(/[^\d+]/g, "");
  $("ctHours").innerHTML = (I.hours || []).map(h => '<tr><td>' + esc(h.zone) + '</td><td>' + esc(h.text) + '</td></tr>').join("");
  $("ctDress").textContent = I.dress || ""; $("ctPark").textContent = I.parking || "";
  $("ctSoc").innerHTML = [I.tg ? '<a class="btn small ghost" href="' + esc(I.tg) + '" target="_blank" rel="noopener">Telegram</a>' : "", I.ig ? '<a class="btn small ghost" href="' + esc(I.ig) + '" target="_blank" rel="noopener">Instagram</a>' : ""].join("");
  $("tgBtn").href = I.tg || "#"; $("ftGuide").href = I.guide || "#";
  $("mapName").textContent = "«" + I.name + "»";
  $("mapY").href = $("revY").href = "https://yandex.ru/maps/?text=" + q; $("map2").href = $("rev2").href = "https://2gis.ru/search/" + q;
}

/* видео на первом экране — без «уменьшить движение» и не при экономии трафика */
function heroVideo(){
  const v = $("hvid"), c = navigator.connection;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || (c && (c.saveData || /2g$/.test(c.effectiveType || "")))) return;
  v.play().catch(() => {});
}

/* ── «Сейчас в Мечтах»: кто открыт, кто скоро, что дальше; ночью (клуб открыт или после 20:00) — неон ── */
const hm = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
const DAYW = ["в воскресенье", "в понедельник", "во вторник", "в среду", "в четверг", "в пятницу", "в субботу"];
function zoneNow(z, now){
  const wd = now.getDay(), mins = now.getHours() * 60 + now.getMinutes(), rows = (S.info.sched || []).filter(r => r.zone === z);
  for (const r of rows){
    const a = hm(r.from), b = hm(r.to), night = b <= a;
    if (r.d.includes(wd) && mins >= a && (night || mins < b)) return {open: true, to: r.to};
    if (night && r.d.includes((wd + 6) % 7) && mins < b) return {open: true, to: r.to};
  }
  for (let k = 0; k < 7; k++){                                                    // когда откроется
    const d = (wd + k) % 7, cand = rows.filter(r => r.d.includes(d) && (k > 0 || hm(r.from) > mins)).sort((x, y) => hm(x.from) - hm(y.from))[0];
    if (cand) return {open: false, at: cand.from, day: k === 0 ? "" : k === 1 ? "завтра" : DAYW[d]};
  }
  return null;
}
const evAt = e => new Date(e.date + "T" + (e.time || "20:00") + ":00");
/* «через 40 мин», «через 2 ч 10 мин», «сегодня в 22:00», «завтра в 22:00»; дальше — null (покажем дату) */
function relTx(t, now){
  const m = Math.round((t - now) / 60000);
  if (m < 60) return "через " + Math.max(1, m) + " мин";
  if (m < 180) return "через " + Math.floor(m / 60) + " ч" + (m % 60 ? " " + (m % 60) + " мин" : "");
  const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
  const days = Math.floor((t - d0) / 864e5), at = String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0");
  return days === 0 ? "сегодня в " + at : days === 1 ? "завтра в " + at : null;
}
function live(){
  const now = new Date(), zones = [...new Set((S.info.sched || []).map(r => r.zone))], open = [], later = [], parts = [];
  let anyNight = false;
  zones.forEach(z => {
    const st = zoneNow(z, now); if (!st) return;
    if (st.open){ open.push(esc(z.toLowerCase()) + " до " + esc(st.to)); if (z !== "Кафе") anyNight = true; }
    else later.push(esc(z.toLowerCase()) + " " + (st.day ? esc(st.day) + " " : "") + "в " + esc(st.at));
  });
  if (open.length) parts.push('<span class="on"><i></i>Открыто: ' + open.join(", ") + '</span>');
  if (later.length) parts.push('<span>Откроются: ' + later.join(", ") + '</span>');
  const html = parts.join("");
  if ($("live").innerHTML !== html) $("live").innerHTML = html;
  const n = S.events.find(e => evAt(e) > now) || S.events[0], rt = n && relTx(evAt(n), now);       // ближайшее событие — со временем «через …»
  const nx = n ? '<a class="nextev" href="#event-' + esc(n.id) + '"><em>Ближайшее</em> ' + esc(rt || wdOf(n.date) + ", " + dayTx(n.date)) + " — " + esc(n.title) + "</a>" : "";
  if ($("hNext").innerHTML !== nx) $("hNext").innerHTML = nx;
  const h = now.getHours(), night = anyNight || h >= 20 || h < 6;
  document.body.classList.toggle("night", night);
  document.querySelector('meta[name="theme-color"]').content = night ? "#120A12" : "#0E1014";
}

/* ── афиша-сторис: кружки над афишей, экран на весь телефон, 6 секунд на событие, листаются касанием ── */
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let stI = 0, stT = 0, stHold = false, stLong = false, stDown = 0, stRet = null;
const STD = 6000;
function drawStories(){
  $("stories").innerHTML = S.events.slice(0, 10).map((e, i) => { const z = zoneOf(e.zone), d = dd(e.date);
    return '<button type="button" class="sring" data-st="' + i + '" style="--z:' + esc(z.color) + '" aria-label="' + esc(e.title) + '"><span class="sav">' +
      (e.img ? '<img src="' + esc(e.img) + '" alt="">' : '<b>' + d.getUTCDate() + '</b>') + '</span><small>' + esc(WD[d.getUTCDay()]) + ", " + d.getUTCDate() + " " + MON3[d.getUTCMonth()] + '</small></button>'; }).join("");
}
function stDraw(){
  const e = S.events[stI], z = zoneOf(e.zone), box = $("story");
  box.style.setProperty("--z", z.color);
  box.innerHTML = '<div class="sbars">' + S.events.slice(0, 10).map((x, i) => '<span><i class="' + (i < stI ? "full" : i === stI ? "run" : "") + '"></i></span>').join("") + '</div>' +
    '<button type="button" class="sx" data-sx aria-label="Закрыть">×</button>' +
    '<div class="sbg">' + (e.img ? '<img src="' + esc(e.img) + '" alt="">' : '<span class="sbig" aria-hidden="true">' + dd(e.date).getUTCDate() + '</span>') + '</div>' +
    '<div class="sbody"><p class="szone">' + esc(z.name || "") + '</p><p class="sdate">' + esc(WDF[dd(e.date).getUTCDay()]) + ', ' + esc(dayTx(e.date)) + ', ' + esc(e.time) + '</p>' +
    '<h3>' + esc(e.title) + '</h3><p class="stx">' + esc(e.text || "") + '</p><p class="spr">' + esc(e.price || "") + '</p>' +
    '<div class="sacts"><button type="button" class="btn" data-sbk>Забронировать стол</button><button type="button" class="btn ghost" data-smore>Подробнее</button></div></div>' +
    '<button type="button" class="stap prev" data-sp aria-label="Предыдущее"></button><button type="button" class="stap next" data-sn aria-label="Следующее"></button>';
  const bar = box.querySelector(".sbars i.run");
  clearTimeout(stT);
  if (RM()){ if (bar) bar.className = "full"; }
  else { if (bar) bar.style.animationDuration = STD + "ms"; stT = setTimeout(() => stGo(1), STD); }
  box.querySelector("[data-sx]").focus({preventScroll: true});
  if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.from(box.querySelector(".sbody"), {y: 24, opacity: 0, duration: .35, ease: "power2.out"});
}
function stOpen(i){ stRet = document.activeElement; stI = i; $("story").hidden = false; document.body.style.overflow = "hidden"; stDraw(); }
function stClose(){ if ($("story").hidden) return; clearTimeout(stT); stHold = false; $("story").hidden = true; document.body.style.overflow = ""; if (stRet && stRet.focus) stRet.focus({preventScroll: true}); }
function stGo(d){ const n = Math.min(S.events.length, 10); if (stI + d >= n) return stClose(); stI = Math.max(0, stI + d); stDraw(); }
function stPause(on){ if (RM()) return; stHold = on; const i = $("story").querySelector(".sbars i.run"); if (i) i.style.animationPlayState = on ? "paused" : "running";
  if (on) clearTimeout(stT); else { const left = STD * (1 - (i ? i.getBoundingClientRect().width / i.parentNode.getBoundingClientRect().width : 0)); stT = setTimeout(() => stGo(1), Math.max(300, left)); } }
$("stories").addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) stOpen(+b.dataset.st); });
$("story").addEventListener("click", e => {
  const ev = S.events[stI];
  if ($("story").hidden) return;
  if (stLong){ stLong = false; if (e.target.closest("[data-sp],[data-sn]")) return; }
  if (e.target.closest("[data-sx]")) return stClose();
  if (e.target.closest("[data-sp]")) return stGo(-1);
  if (e.target.closest("[data-sn]")) return stGo(1);
  if (e.target.closest("[data-sbk]")){ stClose(); return bookFor(ev.zone, ev.date, ev.id); }
  if (e.target.closest("[data-smore]")){ stClose(); location.hash = "event-" + ev.id; }
});
let sy = 0;
$("story").addEventListener("pointerdown", e => { if (!e.target.closest(".btn,[data-sx]")){ sy = e.clientY; stDown = Date.now(); stPause(true); } });
$("story").addEventListener("pointerup", e => { if (!stHold) return; stLong = Date.now() - stDown > 350 || Math.abs(e.clientY - sy) > 30; stPause(false); if (e.clientY - sy > 90) stClose(); });
$("story").addEventListener("pointercancel", () => { if (stHold) stPause(false); });
document.addEventListener("keydown", e => { if ($("story").hidden) return; if (e.key === "Escape") stClose(); if (e.key === "ArrowRight") stGo(1); if (e.key === "ArrowLeft") stGo(-1); });

/* ── бронь по схеме зала: свободные столы светятся, занятые — серые, нажатие выбирает ── */
let planBusy = [], planKey = "";
const PLEG = '<p class="pleg" aria-hidden="true"><span class="g-free">свободен</span><span class="g-busy">занят</span><span class="g-sel">ваш стол</span></p>';
function planSvg(zone){
  const P = (S.plans || {})[zone];
  if (!P) return "";
  const area = P.area.map(a => '<g class="pa ' + a.t + '"><rect x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="1.5"/>' +
    (a.n ? '<text x="' + (a.x + a.w / 2) + '" y="' + (a.y + a.h / 2 + 1.3) + '">' + esc(a.n) + '</text>' : "") + '</g>').join("");
  const tbl = P.tables.map((t, i) => {
    const w = t.shape === "sofa" ? 11 : t.shape === "rect" ? 7 + t.seats * 0.9 : 0, h = t.shape === "sofa" ? 9 : 7, r = 3 + t.seats * 0.35;
    const st = planBusy.includes(t.id) ? "busy" : $("bkTable").value === t.id ? "sel" : "free";
    const shape = t.shape === "round" ? '<circle cx="' + t.x + '" cy="' + t.y + '" r="' + r.toFixed(1) + '"/>' : '<rect x="' + (t.x - w / 2) + '" y="' + (t.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (t.shape === "sofa" ? 3 : 1.5) + '"/>';
    return '<g class="pt ' + st + '" data-t="' + esc(t.id) + '" role="button" tabindex="' + (st === "busy" ? -1 : 0) + '" aria-label="Стол ' + (i + 1) + ', ' + seats(t.seats) + (st === "busy" ? ", занят" : "") + '">' +
      shape + '<text x="' + t.x + '" y="' + (t.y + 1.2) + '">' + (i + 1) + '</text><text class="ps" x="' + t.x + '" y="' + (t.y + (t.shape === "round" ? r : h / 2) + 3.2) + '">' + seats(t.seats) + '</text></g>';
  }).join("");
  return '<svg viewBox="0 0 100 64" role="group" aria-label="Схема зала">' + '<rect class="pw" x="0.5" y="0.5" width="99" height="63" rx="3"/>' + area + tbl + '</svg>';
}
async function drawPlan(){
  const zone = bkZone, date = $("bkDate").value, key = zone + "|" + date;
  if (!(S.plans || {})[zone]){ $("plan").innerHTML = ""; $("planTx").textContent = ""; return; }
  if (key !== planKey){
    planKey = key; planBusy = [];
    const d = date ? await api("/api/busy", {zone, date}) : {busy: []};
    if (planKey !== key) return;
    planBusy = d.busy || [];
    if (planBusy.includes($("bkTable").value)) $("bkTable").value = "";
  }
  $("plan").innerHTML = planSvg(zone) + PLEG;
  planTxt();
}
function planTxt(){
  const P = (S.plans || {})[bkZone];
  if (!P){ $("planTx").textContent = ""; return; }
  const id = $("bkTable").value, t = P && P.tables.find(x => x.id === id), g = +$("bkGuests").value || 0;
  const free = P.tables.filter(x => !planBusy.includes(x.id)).length;
  $("planTx").innerHTML = t ? 'Стол ' + (P.tables.indexOf(t) + 1) + ', ' + seats(t.seats) + (g > t.seats ? ' — <b>для ' + g + ' гостей тесновато, выберите стол побольше</b>' : " — отлично") :
    'Свободно столов: ' + free + ' из ' + P.tables.length + '. Нажмите на стол — или оставьте выбор администратору.' + (S.info.demoBusy !== false ? ' <small>В примере часть столов занята для наглядности.</small>' : "");
}
$("plan").addEventListener("click", e => {
  const g = e.target.closest("[data-t]"); if (!g || g.classList.contains("busy")) return;
  $("bkTable").value = $("bkTable").value === g.dataset.t ? "" : g.dataset.t;
  $("plan").innerHTML = planSvg(bkZone) + PLEG; planTxt();
  const sel = $("plan").querySelector(".pt.sel");
  if (sel && window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(sel, {scale: .8, transformOrigin: "50% 50%"}, {scale: 1, duration: .35, ease: "back.out(3)"});
});
$("plan").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-t]")){ e.preventDefault(); e.target.dispatchEvent(new MouseEvent("click", {bubbles: true})); } });
$("bkDate").addEventListener("change", drawPlan);
$("bkGuests").addEventListener("input", planTxt);

/* ── «Подберём коктейль»: три вопроса — и три коктейля из карты бара (по составу и крепости из барного гида) ── */
const QZ = [
  {q: "Какой вкус ближе?", a: [["sweet", "Сладкий и фруктовый"], ["sour", "Кислый и свежий"], ["bitter", "С горчинкой"]]},
  {q: "Насколько крепко?", a: [["light", "Легко, на весь вечер"], ["mid", "Средне"], ["strong", "Покрепче"]]},
  {q: "Что по настроению?", a: [["fizz", "Пузырьки"], ["silk", "Бархатный, сливочный"], ["herb", "Травы и пряности"]]}
];
const QK = {
  sweet: /ваниль|маракуй|ананас|персик|клубник|арбуз|вишн|сироп|пюре|мандарин|малин|сгущ|карамел|пломбир|мёд|мед/i,
  sour: /лайм|лимон|цитрус|юдзу|гранат|кисл|грейпфрут|фейхоа|облепих/i,
  bitter: /апероль|кампари|биттер|вермут|негрони|ангостур|тоник|сарти|фиеро/i,
  fizz: /игрист|тоник|содов|сидр|кола|спритц|спритс|ред булл/i, silk: /белок|сливк|пломбир|молок|ваниль|кокос|фисташ/i, herb: /трав|мят|базилик|тархун|розмарин|чили|имбир|шисо|джин|корица/i
};
let qzA = [];
function quizCands(){
  const out = [];
  (S.bar || []).forEach(c => c.secs.forEach(s => s.items.forEach(x => { if (x.alc && x.img && c.k === "cocktails" && !/шот/i.test(s.n)) out.push(x); })));
  (S.bar || []).forEach(c => c.secs.forEach(s => s.items.forEach(x => { if (x.alc && !x.img && c.k === "cocktails" && !/шот/i.test(s.n) && !out.includes(x)) out.push(x); })));
  return out;
}
function quizScore(x){
  const t = x.n + " " + (x.d || ""), [taste, power, mood] = qzA, a = x.abv || 0;
  let sc = QK[taste].test(t) ? 3 : 0;
  sc += power === "light" ? (a && a <= 9 ? 2 : a > 14 ? -2 : 0) : power === "strong" ? (a >= 14 ? 2 : a && a < 9 ? -2 : 0) : (a >= 9 && a <= 14 ? 2 : 0);
  sc += QK[mood].test(t) ? 2 : 0;
  if (x.img) sc += 1.5;                                                          // с фото — нагляднее
  return sc;
}
function drawQuiz(){
  const box = $("quizBox"), step = qzA.length;
  if (step < QZ.length){
    const Q = QZ[step];
    box.innerHTML = '<div class="qz"><div class="qstep">' + QZ.map((_, i) => '<i class="' + (i < step ? "done" : i === step ? "now" : "") + '"></i>').join("") + '</div>' +
      '<h3>' + esc(Q.q) + '</h3><div class="qa">' + Q.a.map(([k, t]) => '<button type="button" class="qbtn" data-qa="' + k + '">' + esc(t) + '</button>').join("") + '</div>' +
      (step ? '<button type="button" class="link" data-qback>Назад</button>' : "") + '</div>';
    return;
  }
  const res = quizCands().map(x => ({x, s: quizScore(x)})).sort((p, q) => q.s - p.s).slice(0, 3).map(r => r.x), g = S.info.guide || "";
  box.innerHTML = '<div class="qz"><h3>Вам понравится</h3><div class="qres">' + res.map(x => '<article class="qr">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : '<span class="qph" aria-hidden="true">' + esc(x.n.charAt(0)) + '</span>') +
    '<div><b>' + esc(x.n) + '</b><p>' + esc(x.d || "") + '</p><span>' + (x.opts && x.opts[0] ? rub(x.opts[0].p) : "") + (x.abv ? ", " + x.abv + "%" : "") + '</span>' +
    (g ? '<a href="' + esc(g) + '#menu-' + esc(x.id) + '" target="_blank" rel="noopener">История и состав в барном гиде</a>' : "") + '</div></article>').join("") + '</div>' +
    '<button type="button" class="btn ghost small" data-qagain>Подобрать заново</button></div>';
  if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.from(box.querySelectorAll(".qr"), {y: 18, opacity: 0, duration: .4, stagger: .08, ease: "power2.out"});
}
$("quizBox").addEventListener("click", e => {
  const a = e.target.closest("[data-qa]");
  if (a){ qzA.push(a.dataset.qa); return drawQuiz(); }
  if (e.target.closest("[data-qback]")){ qzA.pop(); return drawQuiz(); }
  if (e.target.closest("[data-qagain]")){ qzA = []; drawQuiz(); }
});

/* ── установка на телефон: Android — кнопка, iPhone — подсказка «Поделиться → На экран Домой» ── */
let instEv = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); instEv = e; $("installBtn").hidden = false; });
if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) $("installBtn").hidden = false;
$("installBtn").addEventListener("click", async () => {
  if (instEv){ instEv.prompt(); await instEv.userChoice.catch(() => {}); instEv = null; $("installBtn").hidden = true; return; }
  alert("На iPhone: нажмите «Поделиться» внизу Safari и выберите «На экран Домой» — «Мечты» появятся среди приложений.");
});
if ("serviceWorker" in navigator && location.protocol !== "file:") addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* ── одна заставка: неон названия зажигается, как вывеска (без «уменьшить движение») ── */
function neonOn(){
  const t = $("hName");
  if (!window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches){ t.classList.add("lit"); return; }
  setTimeout(() => t.classList.add("lit"), 1800);                               // если анимация не дошла (вкладка в фоне) — всё равно горит
  gsap.timeline({onComplete: () => t.classList.add("lit")})
    .set(t, {opacity: .25})
    .to(t, {opacity: 1, duration: .06}).to(t, {opacity: .3, duration: .08}).to(t, {opacity: 1, duration: .05})
    .to(t, {opacity: .45, duration: .12, delay: .12}).to(t, {opacity: 1, duration: .3, ease: "power1.in"});
}

(async function init(){
  $("bkTime").innerHTML = times().map(t => '<option' + (t === "19:00" ? " selected" : "") + '>' + t + '</option>').join("");
  const d = await api("/api/site");
  if (d.error){ document.querySelector("main").insertAdjacentHTML("afterbegin", '<p class="wrap empty">' + esc(d.error) + '</p>'); return; }
  S = d;
  $("bkDate").min = $("bqDate").min = S.today; $("bkDate").value = S.today;
  drawInfo(); drawEvents(); drawBookZones(); drawZones(); drawBanquet(); drawMenu(); drawPromoNews(); drawAlbums(); certPrev(); drawJobs(); drawStories(); drawQuiz();
  live(); setInterval(live, 30000);
  heroVideo(); neonOn(); route();
})();
