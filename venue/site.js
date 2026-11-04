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
let S = null, mTab = "kitchen", mSec = "", bkZone = "", bkWant = "";

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
  const list = S.events;
  $("evList").innerHTML = list.length ? list.map(e => '<button type="button" class="ev" data-ev="' + esc(e.id) + '">' + poster(e) +
    '<div class="eb"><h3>' + esc(e.title) + '</h3><p>' + esc(dayTx(e.date)) + ", " + esc(e.time) + '</p>' + (e.price ? '<p class="epr">' + esc(e.price) + '</p>' : "") + '</div></button>').join("")
    : '<p class="empty">Скоро здесь появятся новые события.</p>';
  $("evPast").innerHTML = S.past.length ? "Прошли недавно: " + S.past.slice(0, 3).map(e => esc(e.title) + " (" + esc(dayTx(e.date)) + ")").join(", ") +
    (S.albums.length ? ' — <a href="#photo">фотоотчёты</a>' : "") : "";
}
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
function wire(form, path, done, extra, check){
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = form.querySelector(".fmsg"), btn = form.querySelector("button[type=submit]");
    const bad = check && check();
    if (bad){ msg.className = "fmsg bad"; msg.textContent = bad; return; }
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
/* ответ на заявку: что дальше и как гостю удобнее связаться — звонок, СМС, Telegram, WhatsApp */
const HOW = [["call", "Звонок", "Позвоним"], ["sms", "СМС", "Напишем СМС"], ["tg", "Telegram", "Напишем в Telegram"], ["wa", "WhatsApp", "Напишем в WhatsApp"]];
function doneBox(form, o){
  const box = document.createElement("div"); box.className = "done";
  box.innerHTML = '<b tabindex="-1">' + esc(o.title) + '</b><p>' + esc(o.text) + '</p>' +
    (o.box ? '<div class="how"><span class="fl" id="how-' + o.box + '">Как с вами удобнее связаться?</span><div class="chips" role="group" aria-labelledby="how-' + o.box + '">' +
      HOW.map(([k, t]) => '<button type="button" class="chip" data-how="' + k + '" aria-pressed="false">' + t + '</button>').join("") + '</div><p class="fmsg" role="status"></p></div>' : "") +
    (o.again ? '<button type="button" class="btn ghost small" data-again>' + esc(o.again) + '</button>' : "");
  form.hidden = true; form.parentNode.appendChild(box);
  box.querySelector("b").focus({preventScroll: true});
  box.addEventListener("click", async e => {
    const h = e.target.closest("[data-how]");
    if (h){
      const msg = box.querySelector(".how .fmsg");
      box.querySelectorAll("[data-how]").forEach(b => b.setAttribute("aria-pressed", String(b === h)));
      const d = await api("/api/contact", {box: o.box, id: o.id, how: h.dataset.how});
      msg.className = "fmsg " + (d.error ? "bad" : "ok");
      msg.textContent = d.error || "Спасибо! " + HOW.find(x => x[0] === h.dataset.how)[2] + ".";
      return;
    }
    if (e.target.closest("[data-again]")){ box.remove(); form.reset(); form.hidden = false; if (o.onAgain) o.onAgain(); }
  });
}

/* правила брони зоны: дни (как в админке: «чт, пт, сб, вс») и часы */
const WDN = {"вс": 0, "пн": 1, "вт": 2, "ср": 3, "чт": 4, "пт": 5, "сб": 6};
const ACC = ["воскресенье", "понедельник", "вторник", "среду", "четверг", "пятницу", "субботу"];
const GEN = ["воскресенья", "понедельника", "вторника", "среды", "четверга", "пятницы", "субботы"];
const daysOf = s => [...new Set(String(s || "").toLowerCase().split(/[^а-яё]+/).map(w => WDN[w.slice(0, 2)]).filter(n => n != null))]
  .sort((a, b) => (a + 6) % 7 - (b + 6) % 7);                                  // с понедельника
const hmin = s => { const m = /^(\d{2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : -1; };
const mmhh = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const vo = d => (d === 2 ? "во " : "в ") + ACC[d];
const seqDays = ds => ds.length >= 3 && ds.every((d, i) => !i || (ds[i - 1] + 1) % 7 === d);
function daysTx(s){
  const ds = daysOf(s);
  if (ds.length === 7) return "каждый день";
  if (seqDays(ds)) return "с " + GEN[ds[0]] + " по " + ACC[ds[ds.length - 1]];
  if (ds.length === 1) return vo(ds[0]);
  return ds.slice(0, -1).map(vo).join(", ") + " и " + ACC[ds[ds.length - 1]];
}
const daysShort = s => { const ds = daysOf(s); return seqDays(ds) ? WD[ds[0]] + "–" + WD[ds[ds.length - 1]] : ds.map(d => WD[d]).join(", "); };
const ruleTx = z => "Бронь " + daysTx(z.days) + (z.from ? ", с " + z.from + " до " + z.to : "");
const bookable = () => S.zones.filter(z => !z.nobook);
const nameIn = n => n === n.toUpperCase() ? n : n.toLowerCase();                 // «кафе», но «VIP»

/* бронь: сперва зона — у каждой свои дни и часы, — потом дата, время и гости; стол выбирает администратор */
function bookTimes(z, iso){
  const a = hmin(z.from || "14:00"), b = hmin(z.to || "23:00"), out = [];
  let min = -1;
  if (iso === S.today){ const n = new Date(); min = n.getHours() * 60 + n.getMinutes() + 30; }   // сегодня — не раньше чем через полчаса
  for (let m = a; m <= b; m += 30) if (m >= min) out.push(mmhh(m));
  return out;
}
function bookDates(z){
  const ds = daysOf(z.days), out = [], t0 = dd(S.today).getTime();
  for (let i = 0; i < 70 && out.length < 24; i++){
    const iso = new Date(t0 + i * 864e5).toISOString().slice(0, 10);
    if ((!ds.length || ds.includes(dd(iso).getUTCDay())) && bookTimes(z, iso).length) out.push(iso);
  }
  return out;
}
function drawBook(){
  const zs = bookable(), z = zs.find(x => x.id === bkZone);
  $("bkZones").innerHTML = zs.map(x => '<button type="button" class="chip big" data-z="' + esc(x.id) + '" aria-pressed="' + (x.id === bkZone) + '">' + esc(x.name) + '</button>').join("");
  const off = S.zones.filter(x => x.nobook).map(x => "«" + x.name + "»");
  if (!z){
    $("bkRest").hidden = true;
    $("bkNote").innerHTML = "У каждой зоны свои дни и часы брони." + (off.length ? " " + esc(off.join(", ")) + " не бронируется — туда приходите без брони." : "");
    return;
  }
  $("bkNote").innerHTML = '<b>' + esc(ruleTx(z)) + '.</b>' + (z.deposit ? '<span class="dep">Зона с депозитом — сумму подскажет администратор.</span>' : "") + (z.text ? '<span>' + esc(z.text) + '</span>' : "");
  const ds = bookDates(z), want = bkWant && ds.includes(bkWant) ? bkWant : "";
  if (want) bkWant = "";
  if (want || !ds.includes($("bkDate").value)) $("bkDate").value = want || ds[0] || "";
  $("bkDays").innerHTML = ds.length ? ds.map(iso => '<button type="button" class="dchip" data-d="' + iso + '" aria-pressed="' + (iso === $("bkDate").value) + '" aria-label="' + esc(WDF[dd(iso).getUTCDay()] + ", " + dayTx(iso)) + '"><small>' + wdOf(iso) + '</small><b>' + dd(iso).getUTCDate() + '</b><small>' + MON3[dd(iso).getUTCMonth()] + '</small></button>').join("")
    : '<p class="empty">Ближайших дат нет — позвоните нам.</p>';
  drawTimes(z);
  const was = $("bkRest").hidden;
  $("bkRest").hidden = false;
  if (was && window.gsap && !RM()) gsap.from("#bkRest", {opacity: 0, y: 12, duration: .35, ease: "power2.out"});
}
function drawTimes(z){
  const ts = bookTimes(z, $("bkDate").value), cur = $("bkTime").value, pick = ts.includes(cur) ? cur : ts.includes("19:00") ? "19:00" : ts[0];
  $("bkTime").innerHTML = ts.map(t => '<option' + (t === pick ? " selected" : "") + '>' + t + '</option>').join("");
}
$("bkZones").addEventListener("click", e => { const b = e.target.closest("[data-z]"); if (b && b.dataset.z !== bkZone){ bkZone = b.dataset.z; drawBook(); } });
$("bkDays").addEventListener("click", e => {
  const b = e.target.closest("[data-d]"); if (!b) return;
  $("bkDate").value = b.dataset.d;
  $("bkDays").querySelectorAll("[data-d]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  drawTimes(bookable().find(x => x.id === bkZone));
});
document.querySelector("#bookF .stepper").addEventListener("click", e => {
  const b = e.target.closest("[data-step]"); if (!b) return;
  const i = $("bkGuests"); i.value = Math.max(1, Math.min(300, (parseInt(i.value, 10) || 1) + +b.dataset.step));
});
/* «Забронировать» из афиши, сторис и залов: зона и дата подставляются, если зону можно бронировать */
function bookFor(zone, date, ev){
  const form = $("bookF");
  if (form.hidden){ const d = form.parentNode.querySelector(".done"); if (d) d.remove(); form.reset(); form.hidden = false; }
  const z = S.zones.find(x => x.id === zone);
  bkZone = z && !z.nobook ? z.id : "";
  bkWant = date || "";
  $("bkEvent").value = ev || "";
  drawBook();
  if (z && z.nobook) $("bkNote").innerHTML = "«" + esc(z.name) + "» не бронируется. На этот вечер можно забронировать стол в другой зоне — выберите её выше.";
  if (ev && bkZone){ const e = S.events.find(x => x.id === ev); if (e && e.time) { const o = [...$("bkTime").options].find(x => x.value === e.time); if (o) $("bkTime").value = e.time; } }
  $("book").scrollIntoView({behavior: "smooth"});
}
wire($("bookF"), "/api/book", (d, f) => doneBox(f, {title: "Ваша бронь зафиксирована", box: "book", id: d.id, again: "Ещё одна бронь",
    text: "Мы свяжемся с вами, чтобы подтвердить бронь" + (d.deposit ? " и рассказать о депозите" : "") + ".", onAgain: () => { bkZone = ""; drawBook(); }}),
  () => ({zone: bkZone, guests: +$("bkGuests").value || 0}),
  () => !bkZone ? "Выберите зону." : !$("bkDate").value ? "Выберите дату." : "");

/* залы: фото, правило брони; танцпол — без брони */
function drawZones(){
  $("zoneList").innerHTML = S.zones.map(z => '<article class="card zone"><div class="zart' + (z.img ? " ph" : "") + '" style="--z:' + esc(z.color) + '">' +
    (z.img ? '<img src="' + esc(z.img) + '" alt="' + esc(z.name) + '" loading="lazy">' : "") + '<h3>' + esc(z.name) + '</h3></div><div class="zb">' +
    '<div class="zm">' + (z.nobook ? '<span>Без брони — приходите танцевать</span>' : '<span><b>Бронь</b> ' + esc(daysShort(z.days)) + (z.from ? ", " + esc(z.from) + "–" + esc(z.to) : "") + '</span>') +
    (z.deposit ? '<span class="dep">Депозит</span>' : "") + '</div><p>' + esc(z.text || "") + '</p>' +
    '<div class="tags">' + String(z.feats || "").split(",").map(s => s.trim()).filter(Boolean).map(s => '<span>' + esc(s) + '</span>').join("") + '</div>' +
    (z.nobook ? "" : '<button type="button" class="btn small ghost" data-zb="' + esc(z.id) + '">Забронировать здесь</button>') + '</div></article>').join("");
}
$("zoneList").addEventListener("click", e => { const b = e.target.closest("[data-zb]"); if (b) bookFor(b.dataset.zb); });

/* банкеты: форматы без цен — их обсуждает менеджер */
function drawBanquet(){
  $("packList").innerHTML = S.packages.map(p => '<article class="card pack"><h3>' + esc(p.title) + '</h3><p>' + esc(p.text || "") + '</p></article>').join("");
  $("bqZone").innerHTML = '<option value="">Подскажите</option>' + S.zones.map(z => '<option value="' + esc(z.id) + '">' + esc(z.name) + '</option>').join("");
  $("bqFormat").innerHTML = S.packages.map(p => '<option>' + esc(p.title) + '</option>').join("") + '<option>Другое</option>';
}
wire($("bqF"), "/api/banquet", (d, f) => doneBox(f, {title: "Заявка отправлена", box: "banquet", id: d.id, again: "Ещё одна заявка",
  text: "Менеджер по банкетам свяжется с вами, обсудит меню и программу."}));

/* меню: «Кухня» (из админки) и «Бар» (из барного гида), внутри — разделы; выбор разделов и сверху, и снизу */
function menuData(){
  if (mTab === "kitchen"){
    const by = {};
    S.kitchen.forEach(x => { (by[x.sec || "Меню"] = by[x.sec || "Меню"] || []).push(x); });
    const secs = Object.keys(by).map(n => ({n, items: by[n].map(x => ({n: x.name, d: x.desc, p: x.price, v: x.out}))}));
    if (!secs.some(s => s.n === mSec)) mSec = "";
    return {subs: [{k: "", n: "Всё"}].concat(secs.map(s => ({k: s.n, n: s.n}))), cur: mSec, secs: secs.filter(s => !mSec || s.n === mSec)};
  }
  const cats = S.bar || [], cur = cats.find(c => c.k === mSec) || cats[0] || {k: "", secs: []};
  return {subs: cats.map(c => ({k: c.k, n: c.n})), cur: cur.k, secs: cur.secs.map(s => ({n: s.n, items: s.items.map(x => ({id: x.id, n: x.n, d: x.d, img: x.img,
    p: x.opts && x.opts[0] ? x.opts[0].p : null, v: x.opts && x.opts[0] && x.opts[0].v ? x.opts.map(o => o.v).join(" / ") + " " + (x.u || "мл") : ""}))}))};
}
function menuNav(md, where){
  return '<div class="chips mtabs" role="group" aria-label="Меню">' + [["kitchen", "Кухня"], ["bar", "Бар"]].map(([k, t]) =>
      '<button type="button" class="chip big" data-t="' + k + '" data-w="' + where + '" aria-pressed="' + (k === mTab) + '">' + t + '</button>').join("") + '</div>' +
    '<div class="chips msecs" role="group" aria-label="Раздел">' + md.subs.map(s => '<button type="button" class="chip" data-s="' + esc(s.k) + '" data-w="' + where + '" aria-pressed="' + (s.k === md.cur) + '">' + esc(s.n) + '</button>').join("") + '</div>';
}
function drawMenu(){
  const md = menuData(), g = S.info.guide || "";
  $("mNavTop").innerHTML = menuNav(md, "top"); $("mNavBot").innerHTML = menuNav(md, "bot");
  $("mList").innerHTML = md.secs.map(s => '<h3 class="msec">' + esc(s.n) + '</h3>' + s.items.map(x =>
    '<div class="mi' + (x.img ? " tall" : " noimg") + '">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : "") +
    '<div><div class="mn">' + esc(x.n) + '</div>' + (x.d ? '<div class="md">' + esc(x.d) + '</div>' : "") +
    (x.img && g ? '<a class="more" href="' + esc(g) + '#' + esc(x.id) + '" target="_blank" rel="noopener">Узнать больше</a>' : "") + '</div>' +
    '<div class="mp">' + (x.p != null ? rub(x.p) : "") + (x.v ? '<small>' + esc(x.v) + '</small>' : "") + '</div></div>').join("")).join("") || '<p class="empty">Скоро здесь будет меню.</p>';
  $("mNote").innerHTML = mTab === "kitchen" ? "Меню кухни в примере — для образца; настоящее вносится в админке по разделам." :
    'Карта бара — та же, что в <a href="' + esc(g) + '" target="_blank" rel="noopener">барном гиде</a>: «Узнать больше» открывает карточку коктейля — история, вкус и состав. Поменяли карту в гиде — здесь обновится само.';
}
$("menu").addEventListener("click", e => {
  const t = e.target.closest("[data-t]"), s = e.target.closest("[data-s]"), b = t || s;
  if (!b) return;
  if (t && t.dataset.t !== mTab){ mTab = t.dataset.t; mSec = mTab === "bar" ? ((S.bar || [])[0] || {}).k || "" : ""; }
  if (s) mSec = s.dataset.s;
  drawMenu();
  if (b.dataset.w === "bot") $("mNavTop").scrollIntoView({behavior: RM() ? "auto" : "smooth", block: "start"});
});

/* акции: условия — по строкам, сноска — мелко; новости */
function drawPromoNews(){
  $("promoList").innerHTML = S.promos.length ? S.promos.map(p => '<article class="card promo"><h3>' + esc(p.title) + '</h3><p class="ptx">' + esc(p.text || "") + '</p>' +
    (p.note ? '<small class="pnote">' + esc(p.note) + '</small>' : "") + (p.until ? '<small>до ' + esc(dayTx(p.until)) + '</small>' : "") + '</article>').join("") : '<p class="empty">Скоро здесь появятся акции.</p>';
  $("newsList").innerHTML = S.news.slice(0, 6).map(n => '<article class="card news"><time datetime="' + esc(n.date) + '">' + esc(dayTx(n.date)) + '</time><h3>' + esc(n.title) + '</h3><p>' + esc(n.text || "") + '</p></article>').join("");
}

/* фотоотчёты: альбом фотографа — по ссылке; свои фото — просмотр с листанием */
const ACOL = ["#C9A24B", "#FF4FA3", "#9A5CF0", "#5FB3A1"];
let lbA = null, lbI = 0;
function drawAlbums(){
  $("albList").innerHTML = S.albums.map((a, i) => {
    const d = dd(a.date), cover = a.img || (a.photos || [])[0] || "";
    const inner = '<div class="acov" style="--z:' + ACOL[i % ACOL.length] + '">' + (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' : '<span class="adate"><b>' + d.getUTCDate() + '</b>' + MON3[d.getUTCMonth()] + '</span>') + '</div>' +
      '<div class="ainf"><b>' + esc(a.title) + ', ' + esc(dayTx(a.date)) + '</b><small>' + (a.by ? "Фото: " + esc(a.by) : (a.photos || []).length ? a.photos.length + " фото" : "Фотоотчёт") + '</small></div>';
    return a.url ? '<a class="alb" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<button type="button" class="alb" data-a="' + esc(a.id) + '">' + inner + '</button>';
  }).join("") || '<p class="empty">Скоро здесь будут фото.</p>';
}
function lbDraw(){
  const a = lbA, p = a.photos[lbI];
  $("lb").innerHTML = '<span class="lbt">' + esc(a.title) + ", " + (lbI + 1) + " из " + a.photos.length + '</span><img src="' + esc(p) + '" alt="Фото ' + (lbI + 1) + '">' +
    '<button type="button" class="lx" data-lx aria-label="Закрыть">×</button><button type="button" class="lp" data-lp aria-label="Предыдущее">‹</button><button type="button" class="ln" data-ln aria-label="Следующее">›</button>';
}
const lbClose = () => { if (!$("lb").hidden){ $("lb").hidden = true; document.body.style.overflow = ""; } };
const lbGo = d => { lbI = (lbI + d + lbA.photos.length) % lbA.photos.length; lbDraw(); };
$("albList").addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (!b) return; lbA = S.albums.find(a => a.id === b.dataset.a); if (!lbA || !(lbA.photos || []).length) return; lbI = 0; lbDraw(); $("lb").hidden = false; document.body.style.overflow = "hidden"; });
$("lb").addEventListener("click", e => { if (e.target.closest("[data-lx]") || e.target === $("lb")) return lbClose(); if (e.target.closest("[data-lp]")) lbGo(-1); if (e.target.closest("[data-ln]")) lbGo(1); });
let tx = 0;
$("lb").addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive: true});
$("lb").addEventListener("touchend", e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) lbGo(d < 0 ? 1 : -1); });
document.addEventListener("keydown", e => { if ($("lb").hidden) return; if (e.key === "ArrowRight") lbGo(1); if (e.key === "ArrowLeft") lbGo(-1); });

/* работа: одна форма для всех — без выбора должности */
wire($("jobF"), "/api/job", (d, f) => doneBox(f, {title: "Спасибо!", text: "Мы прочитаем и перезвоним."}));

/* контакты, отзывы и шапка */
function drawInfo(){
  const I = S.info, addr = (I.city ? I.city + ", " : "") + I.address, q = encodeURIComponent(I.mapq || addr);
  document.title = "«" + I.name + "»" + (I.kicker ? " — " + I.kicker : "");
  $("lgName").textContent = I.name.toUpperCase(); $("hName").textContent = I.name; $("hTag").textContent = I.tagline || "";
  $("ctAddr").textContent = addr; $("ctTel").textContent = I.phone; $("ctTel").href = "tel:" + I.phone.replace(/[^\d+]/g, "");
  $("ctSoc").innerHTML = [I.tg ? '<a class="btn small ghost" href="' + esc(I.tg) + '" target="_blank" rel="noopener">Telegram</a>' : "", I.ig ? '<a class="btn small ghost" href="' + esc(I.ig) + '" target="_blank" rel="noopener">Instagram</a>' : ""].join("");
  $("tgBtn").href = I.tg || "#"; $("ftGuide").href = I.guide || "#";
  $("mapY").href = $("revY").href = "https://yandex.ru/maps/?text=" + q; $("map2").href = $("rev2").href = "https://2gis.ru/search/" + q;
  const r = parseFloat(String(I.rating || "").replace(",", "."));
  $("revRate").innerHTML = r ? '<b>' + esc(I.rating) + '</b><span class="stars" style="--r:' + Math.min(1, r / 5).toFixed(3) + '" aria-hidden="true"></span><small>оценка гостей на Яндекс Картах</small>' : "";
}

/* видео на первом экране — без «уменьшить движение» и не при экономии трафика */
function heroVideo(){
  const v = $("hvid"), c = navigator.connection;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || (c && (c.saveData || /2g$/.test(c.effectiveType || "")))) return;
  v.play().catch(() => {});
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
/* ── живая строка на первом экране: где сегодня принимаем бронь, ближайшее событие; ночью (после 20:00) — неон ── */
function live(){
  const now = new Date(), wd = now.getDay(), mins = now.getHours() * 60 + now.getMinutes(), parts = [], open = [], later = [];
  bookable().forEach(z => {
    if (!daysOf(z.days).includes(wd)) return;
    const a = hmin(z.from), b = hmin(z.to);
    if (mins < a) later.push(esc(nameIn(z.name)) + " с " + esc(z.from));
    else if (mins <= b) open.push(esc(nameIn(z.name)) + " до " + esc(z.to));
  });
  if (open.length) parts.push('<span class="on"><i></i>Бронируем сегодня: ' + open.concat(later).join(", ") + '</span>');
  else if (later.length) parts.push('<span>Бронь сегодня: ' + later.join(", ") + '</span>');
  else {
    for (let k = 1; k <= 7; k++){                                                // ближайший день брони
      const d = (wd + k) % 7;
      if (bookable().some(z => daysOf(z.days).includes(d))){ parts.push('<span>Бронь столов — ' + (k === 1 ? "завтра" : esc(vo(d))) + '</span>'); break; }
    }
  }
  const html = parts.join("");
  if ($("live").innerHTML !== html) $("live").innerHTML = html;
  const n = S.events.find(e => evAt(e) > now) || S.events[0], rt = n && relTx(evAt(n), now);       // ближайшее событие — со временем «через …»
  const nx = n ? '<a class="nextev" href="#event-' + esc(n.id) + '"><em>Ближайшее</em> ' + esc(rt || wdOf(n.date) + ", " + dayTx(n.date)) + " — " + esc(n.title) + "</a>" : "";
  if ($("hNext").innerHTML !== nx) $("hNext").innerHTML = nx;
  const h = now.getHours(), night = h >= 20 || h < 6;
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
    (g ? '<a href="' + esc(g) + (x.img ? '#' : '#menu-') + esc(x.id) + '" target="_blank" rel="noopener">' + (x.img ? "Узнать больше" : "Состав в барном гиде") + '</a>' : "") + '</div></article>').join("") + '</div>' +
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
  const d = await api("/api/site");
  if (d.error){ document.querySelector("main").insertAdjacentHTML("afterbegin", '<p class="wrap empty">' + esc(d.error) + '</p>'); return; }
  S = d;
  $("bqDate").min = S.today;
  drawInfo(); drawEvents(); drawBook(); drawZones(); drawBanquet(); drawMenu(); drawPromoNews(); drawAlbums(); drawStories(); drawQuiz();
  live(); setInterval(live, 30000);
  heroVideo(); neonOn(); route();
})();
