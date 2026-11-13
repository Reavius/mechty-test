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
const ufa = () => { const d = new Date(Date.now() + 5 * 3600e3); return {iso: d.toISOString().slice(0, 10), wd: d.getUTCDay(), h: d.getUTCHours(), mins: d.getUTCHours() * 60 + d.getUTCMinutes()}; };
const tm = e => e.time ? ", " + e.time : "";                                     // у события без времени — только день
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
    (e.vid ? '<span class="pvid">видео</span>' : '') +
    '<span class="pd"><span>' + WD[d.getUTCDay()] + esc(tm(e)) + '</span><b>' + d.getUTCDate() + '</b><span>' + MON3[d.getUTCMonth()] + '</span></span></div>';
}
function drawEvents(){
  const list = S.events;
  $("evList").innerHTML = list.length ? list.map(e => '<button type="button" class="ev" data-ev="' + esc(e.id) + '">' + poster(e) +
    '<div class="eb"><h3>' + esc(e.title) + '</h3><p>' + esc(dayTx(e.date)) + esc(tm(e)) + '</p>' + (e.price ? '<p class="epr">' + esc(e.price) + '</p>' : "") + '</div></button>').join("")
    : '<p class="empty">Скоро здесь появятся новые события.</p>';
  $("evPast").innerHTML = S.past.length ? "Прошли недавно: " + S.past.slice(0, 3).map(e => esc(e.title) + " (" + esc(dayTx(e.date)) + ")").join(", ") +
    (S.albums.length ? ' — <a href="#photo">фотоотчёты</a>' : "") : "";
}
$("evList").addEventListener("click", e => { const b = e.target.closest("[data-ev]"); if (b) location.hash = "event-" + b.dataset.ev; });

function sheetOpen(e){
  const z = zoneOf(e.zone), sh = $("sheet");
  sh.innerHTML = '<div class="sb"><button type="button" class="x" data-x aria-label="Закрыть">×</button>' + poster(e, true) +
    '<div class="sc"><h3 id="shTitle">' + esc(e.title) + '</h3><p class="meta">' + esc(WDF[dd(e.date).getUTCDay()]) + ", " + esc(dayTx(e.date)) + esc(tm(e)) +
    '<br>' + esc(z.name || "Все залы") + (e.price ? ", " + esc(e.price) : "") + '</p><p>' + esc(e.text || "") + '</p>' +
    '<div class="acts"><button type="button" class="btn" data-bk="' + esc(e.id) + '">Забронировать стол</button>' +
    (e.vid ? '<button type="button" class="btn ghost" data-vid="' + esc(e.id) + '">Смотреть видео</button>' : '') +
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
  const t = (e.time || "").replace(":", ""), d = e.date.replace(/-/g, "");
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mechty//RU", "BEGIN:VEVENT", "UID:" + e.id + "@mechty", ...(t ? ["DTSTART:" + d + "T" + t + "00", "DURATION:PT4H"] : ["DTSTART;VALUE=DATE:" + d]),
    "SUMMARY:" + e.title.replace(/[,;\n]/g, " "), "LOCATION:" + (S.info.name + ", " + S.info.address).replace(/[,;\n]/g, " "), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(txt); a.download = "mechty-" + e.date + ".ics";
  document.body.appendChild(a); a.click(); a.remove();
}
$("sheet").addEventListener("click", async ev => {
  if (ev.target === $("sheet") || ev.target.closest("[data-x]")) return sheetClose();
  const all = S.events.concat(S.past), b = ev.target.closest("[data-bk],[data-ics],[data-share],[data-vid]");
  if (!b) return;
  const e = all.find(x => x.id === (b.dataset.bk || b.dataset.ics || b.dataset.share || b.dataset.vid));
  if (b.dataset.vid){ sheetClose(); return stOpen(0, [{k: "e", x: e}]); }
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
  const u = ufa();
  if (iso === u.iso) min = u.mins + 30;                                          // сегодня — не раньше чем через 30 минут (19:59 → с 20:30)
  for (let m = a; m <= b; m += 15) if (m >= min) out.push(mmhh(m));            // шаг 15 минут: 19:00, 19:15, 19:30, 19:45
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
  $("bkZones").innerHTML = zs.map(x => '<button type="button" data-z="' + esc(x.id) + '" aria-pressed="' + (x.id === bkZone) + '">' + esc(x.name) + '</button>').join("");
  $("bkZones").style.setProperty("--n", zs.length);
  const off = S.zones.filter(x => x.nobook).map(x => "«" + x.name + "»");
  if (!z){
    $("bkRest").hidden = true;
    $("bkNote").innerHTML = '<span>У каждой зоны свои дни и часы брони.' + (off.length ? " " + esc(off.join(", ")) + " не бронируется — туда приходите без брони." : "") + '</span>';
    return;
  }
  $("bkNote").innerHTML = '<b>' + esc(ruleTx(z)) + '</b>' + (z.text ? '<span>' + esc(z.text) + '</span>' : "") +
    (z.deposit ? '<span class="dep">Зона с депозитом — сумму подскажет администратор.</span>' : "");
  const ds = bookDates(z), want = bkWant && ds.includes(bkWant) ? bkWant : "";
  if (want) bkWant = "";
  if (want || !ds.includes($("bkDate").value)) $("bkDate").value = want || ds[0] || "";
  calDays = ds; calM = ($("bkDate").value || S.today).slice(0, 7);
  drawCal();
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
/* календарь брони: месяц сеткой, можно выбрать только дни, когда зону бронируют */
const MONN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const CHEV = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (d < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let calM = "", calDays = [];
function drawCal(){
  const box = $("bkCal");
  if (!calDays.length){ box.innerHTML = '<p class="empty">Ближайших дат нет — позвоните нам.</p>'; return; }
  const [y, m] = calM.split("-").map(Number), first = new Date(Date.UTC(y, m - 1, 1)), n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const min = calDays[0].slice(0, 7), max = calDays[calDays.length - 1].slice(0, 7), sel = $("bkDate").value, ok = new Set(calDays);
  let cells = "";
  for (let i = 0; i < (first.getUTCDay() + 6) % 7; i++) cells += '<span class="cd pad"></span>';
  for (let d = 1; d <= n; d++){
    const iso = calM + "-" + String(d).padStart(2, "0"), cls = "cd" + (iso === S.today ? " today" : "");
    cells += ok.has(iso) ? '<button type="button" class="' + cls + '" data-d="' + iso + '" aria-pressed="' + (iso === sel) + '" aria-label="' + esc(WDF[dd(iso).getUTCDay()] + ", " + dayTx(iso)) + '">' + d + '</button>'
      : '<span class="' + cls + ' off" aria-hidden="true">' + d + '</span>';
  }
  box.innerHTML = '<div class="calh"><button type="button" class="calnav" data-m="-1" aria-label="Предыдущий месяц"' + (calM <= min ? " disabled" : "") + '>' + CHEV(-1) + '</button>' +
    '<b aria-live="polite">' + MONN[m - 1] + " " + y + '</b><button type="button" class="calnav" data-m="1" aria-label="Следующий месяц"' + (calM >= max ? " disabled" : "") + '>' + CHEV(1) + '</button></div>' +
    '<div class="calw" aria-hidden="true"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div><div class="calg">' + cells + '</div>' +
    (sel ? '<p class="calsel">' + esc(WDF[dd(sel).getUTCDay()].replace(/^./, c => c.toUpperCase()) + ", " + dayTx(sel)) + '</p>' : "");
}
$("bkCal").addEventListener("click", e => {
  const nav = e.target.closest("[data-m]"), b = e.target.closest("[data-d]");
  if (nav && !nav.disabled){
    const [y, m] = calM.split("-").map(Number), t = new Date(Date.UTC(y, m - 1 + +nav.dataset.m, 1));
    calM = t.toISOString().slice(0, 7); drawCal();
    const f = $("bkCal").querySelector('[data-m="' + nav.dataset.m + '"]'); if (f && !f.disabled) f.focus();
    return;
  }
  if (!b) return;
  $("bkDate").value = b.dataset.d; drawCal();
  const again = $("bkCal").querySelector('[data-d="' + b.dataset.d + '"]'); if (again) again.focus();
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
    if (!secs.some(s => s.n === mSec)) mSec = secs[0] ? secs[0].n : "";              // как в карте бара: один раздел, без «Всё»
    return {subs: secs.map(s => ({k: s.n, n: s.n})), cur: mSec, secs: secs.filter(s => s.n === mSec)};
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
  $("mNote").innerHTML = mTab === "kitchen" ? "Если у вас есть аллергия на продукты, пожалуйста, сообщите об этом официанту." :
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
  $("newsList").innerHTML = S.news.slice(0, 6).map(n => '<article class="card news' + (hasM(n) ? " hasm" : "") + '">' +
    (hasM(n) ? '<button type="button" class="nmed" data-nm="' + esc(n.id) + '" aria-label="' + (n.vid ? "Смотреть видео" : "Открыть") + ': ' + esc(n.title) + '">' +
      (n.img ? '<img src="' + esc(n.img) + '" alt="" loading="lazy">' : '') + (n.vid ? '<span class="nplay" aria-hidden="true"></span>' : '') + '</button>' : '') +
    '<div class="nb"><time datetime="' + esc(n.date) + '">' + esc(dayTx(n.date)) + '</time><h3>' + esc(n.title) + '</h3><p>' + esc(n.text || "") + '</p></div></article>').join("");
}
/* фото или видео новости — сторис по всем новостям с фото и видео, с этой */
$("newsList").addEventListener("click", e => {
  const b = e.target.closest("[data-nm]"); if (!b) return;
  const L = S.news.slice(0, 6).filter(hasM).map(x => ({k: "n", x}));
  stOpen(L.findIndex(s => s.x.id === b.dataset.nm), L);
});

/* фотоотчёты: альбом фотографа — по ссылке; свои фото — просмотр с листанием */
const ACOL = ["#C9A24B", "#FF4FA3", "#9A5CF0", "#5FB3A1"];
let lbA = null, lbI = 0;
/* сверху — 4 новых альбома; остальные дни (за последние 3 месяца) — по кнопке, столбиком по датам */
const ALB_TOP = 4;
let albOpen = false;
function drawAlbums(){
  albMoreDraw();
  $("albList").innerHTML = S.albums.slice(0, ALB_TOP).map((a, i) => {
    const d = dd(a.date), cover = a.img || (a.photos || [])[0] || "";
    const inner = '<div class="acov" style="--z:' + ACOL[i % ACOL.length] + '">' + (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' : '<span class="adate"><b>' + d.getUTCDate() + '</b>' + MON3[d.getUTCMonth()] + '</span>') + '</div>' +
      '<div class="ainf"><b>' + esc(a.title) + ', ' + esc(dayTx(a.date)) + '</b><small>' + (a.by ? "Фото: " + esc(a.by) : (a.photos || []).length ? a.photos.length + " фото" : "Фотоотчёт") + '</small></div>';
    return a.url ? '<a class="alb" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<button type="button" class="alb" data-a="' + esc(a.id) + '">' + inner + '</button>';
  }).join("") || '<p class="empty">Скоро здесь будут фото.</p>';
}
const nDays = n => n + " " + (n % 10 === 1 && n % 100 !== 11 ? "день" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "дня" : "дней");
function albMoreDraw(){
  const rest = S.albums.slice(ALB_TOP), by = [];
  rest.forEach(a => { const g = by.find(x => x.d === a.date); if (g) g.a.push(a); else by.push({d: a.date, a: [a]}); });
  if (!by.length){ $("albMore").innerHTML = ""; return; }
  const row = a => { const cov = a.img || (a.photos || [])[0] || "";
    const inner = '<span class="alth">' + (cov ? '<img src="' + esc(cov) + '" alt="" loading="lazy">' : '') + '</span>' +
      '<span class="altx"><b>' + esc(a.title) + '</b><small>' + (a.by ? "Фото: " + esc(a.by) : (a.photos || []).length ? a.photos.length + " фото" : "Фотоотчёт") + '</small></span><span class="algo" aria-hidden="true">→</span>';
    return a.url ? '<a class="alr" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + inner + '</a>' : '<button type="button" class="alr" data-a="' + esc(a.id) + '">' + inner + '</button>'; };
  $("albMore").innerHTML = '<button type="button" class="btn ghost albtgl" aria-expanded="' + albOpen + '" aria-controls="albDays">' +
      (albOpen ? "Свернуть" : "Смотреть остальные дни") + ' <small>' + nDays(by.length) + '</small></button>' +
    '<ol class="albdays" id="albDays"' + (albOpen ? "" : " hidden") + '>' + by.map(g => { const d = dd(g.d);
      return '<li><time datetime="' + g.d + '"><b>' + d.getUTCDate() + '</b><span>' + MON3[d.getUTCMonth()] + ', ' + WD[d.getUTCDay()] + '</span></time><div class="alrs">' + g.a.map(row).join("") + '</div></li>'; }).join("") +
    '</ol>' + (albOpen ? '<p class="albnote">Фотоотчёты за последние 3 месяца.</p>' : '');
}
$("albMore").addEventListener("click", e => {
  if (e.target.closest(".albtgl")){ albOpen = !albOpen; albMoreDraw(); if (!albOpen) $("photo").scrollIntoView({behavior: "smooth"}); return; }
  const b = e.target.closest("button[data-a]"); if (b) albPhotos(b.dataset.a);
});
function lbDraw(){
  const a = lbA, p = a.photos[lbI];
  $("lb").innerHTML = '<span class="lbt">' + esc(a.title) + ", " + (lbI + 1) + " из " + a.photos.length + '</span><img src="' + esc(p) + '" alt="Фото ' + (lbI + 1) + '">' +
    '<button type="button" class="lx" data-lx aria-label="Закрыть">×</button><button type="button" class="lp" data-lp aria-label="Предыдущее">‹</button><button type="button" class="ln" data-ln aria-label="Следующее">›</button>';
}
const lbClose = () => { if (!$("lb").hidden){ $("lb").hidden = true; document.body.style.overflow = ""; } };
const lbGo = d => { lbI = (lbI + d + lbA.photos.length) % lbA.photos.length; lbDraw(); };
function albPhotos(id){ lbA = S.albums.find(a => a.id === id); if (!lbA || !(lbA.photos || []).length) return; lbI = 0; lbDraw(); $("lb").hidden = false; document.body.style.overflow = "hidden"; }
$("albList").addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (b) albPhotos(b.dataset.a); });
$("lb").addEventListener("click", e => { if (e.target.closest("[data-lx]") || e.target === $("lb")) return lbClose(); if (e.target.closest("[data-lp]")) lbGo(-1); if (e.target.closest("[data-ln]")) lbGo(1); });
let tx = 0;
$("lb").addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, {passive: true});
$("lb").addEventListener("touchend", e => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) lbGo(d < 0 ? 1 : -1); });
document.addEventListener("keydown", e => { if ($("lb").hidden) return; if (e.key === "ArrowRight") lbGo(1); if (e.key === "ArrowLeft") lbGo(-1); });

/* работа: одна форма для всех — без выбора должности */
wire($("jobF"), "/api/job", (d, f) => doneBox(f, {title: "Спасибо!", text: "Мы прочитаем и перезвоним."}));

/* контакты, отзывы и шапка */
function drawInfo(){
  const I = S.info, addr = (I.city ? I.city + ", " : "") + I.address + (I.floor ? ", " + I.floor : ""), q = encodeURIComponent(I.mapq || addr);
  document.title = "«" + I.name + "»" + (I.kicker ? " — " + I.kicker : "");
  $("hNameTx").textContent = I.name; $("hTag").textContent = I.tagline || "";
  $("ctCity").textContent = I.city ? I.city + ", самый центр" : "";
  $("ctAddr").textContent = String(I.address || "").replace(/(^|\s)(ул|д|корп|стр|пр)\. /g, "$1$2.\u00a0").replace(/, (\d)/g, ",\u00a0$1");      /* «корп. 1» не разрывается */
  $("ctFloor").textContent = I.floor || ""; $("ctTel").textContent = I.phone; $("ctTel").href = "tel:" + I.phone.replace(/[^\d+]/g, "");
  $("ctSoc").innerHTML = [I.tg ? '<a href="' + esc(I.tg) + '" target="_blank" rel="noopener">Telegram</a>' : "", I.ig ? '<a href="' + esc(I.ig) + '" target="_blank" rel="noopener">Instagram</a>' : ""].join("");
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

const evAt = e => new Date(e.date + "T" + (e.time || "23:59") + ":00");     // без времени — событие идёт весь день
const evEnd = e => { const d = new Date(e.date + "T06:00:00"); d.setDate(d.getDate() + 1); return d; };   // вечеринка — до 6 утра
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
  const now = new Date(), u = ufa(), wd = u.wd, mins = u.mins, parts = [], open = [], later = [];
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
  const cur = S.events.find(e => e.time && evAt(e) <= now && now < evEnd(e));       // уже началось и идёт до утра
  const n = cur || S.events.find(e => evAt(e) > now) || S.events[0];
  let rt = n && n.time ? relTx(evAt(n), now) : null;
  if (n && !n.time){ const k = Math.round((dd(n.date) - dd(ufa().iso)) / 864e5); rt = k === 0 ? "сегодня" : k === 1 ? "завтра" : null; }       // ближайшее событие — со временем «через …»
  const nx = cur ? '<a class="nextev" href="#event-' + esc(cur.id) + '"><em>Сейчас</em> ' + esc(cur.title) + "</a>"
    : n ? '<a class="nextev" href="#event-' + esc(n.id) + '"><em>Ближайшее</em> ' + esc(rt || wdOf(n.date) + ", " + dayTx(n.date)) + " — " + esc(n.title) + "</a>" : "";
  if ($("hNext").innerHTML !== nx) $("hNext").innerHTML = nx;
  const h = u.h, night = h >= 20 || h < 6;
  const z = bkZone && bookable().find(x => x.id === bkZone);                     // открытая форма брони: время «сегодня» сдвигается само
  if (z && !$("bkRest").hidden && $("bkDate").value === u.iso) drawTimes(z);
  document.body.classList.toggle("night", night);
  document.querySelector('meta[name="theme-color"]').content = night ? "#120A12" : "#0E1014";
}


/* ── сторис: свежие новости с фото или видео (за 3 дня) и ближайшие события — кружки над афишей, экран на весь телефон.
   Картинка — 6 секунд, видео — до конца (не дольше 30 с), сначала без звука; «Включить звук» — для этого и следующих.
   Экономия трафика или 2G — вместо видео его кадр. Листаются касанием, удержание — пауза, свайп вниз — закрыть ── */
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const SLOW = () => { const c = navigator.connection; return !!(c && (c.saveData || /2g/.test(c.effectiveType || ""))); };
const NEWSC = "#FF4FA3";
let stL = [], stI = 0, stT = 0, stHold = false, stLong = false, stDown = 0, stRet = null, stDur = 6000, stSnd = false;
const STD = 6000;
const hasM = x => !!(x.img || x.vid);
function stFeed(){
  const used = new Set(S.events.flatMap(e => [e.img, e.vid]).filter(Boolean));          // те же кадры, что у события, — в сторис один раз
  const fresh = S.news.filter(n => hasM(n) && !used.has(n.vid || n.img) && n.date <= S.today && (dd(S.today) - dd(n.date)) / 864e5 <= 3).map(x => ({k: "n", x}));
  return fresh.concat(S.events.map(x => ({k: "e", x}))).slice(0, 12);
}
function drawStories(){
  const L = stFeed();
  $("stories").hidden = !L.length;
  $("stories").innerHTML = L.map((s, i) => { const x = s.x, d = dd(x.date), c = s.k === "e" ? zoneOf(x.zone).color : NEWSC;
    return '<button type="button" class="sring' + (x.vid ? " isv" : "") + '" data-st="' + i + '" style="--z:' + esc(c) + '" aria-label="' + esc(x.title) + (x.vid ? ", видео" : "") + '"><span class="sav">' +
      (x.img ? '<img src="' + esc(x.img) + '" alt="">' : '<b>' + d.getUTCDate() + '</b>') + '</span><small>' +
      (s.k === "n" ? (x.date === S.today ? "сегодня" : "новое") : esc(WD[d.getUTCDay()]) + ", " + d.getUTCDate() + " " + MON3[d.getUTCMonth()]) + '</small></button>'; }).join("");
}
const stVid = () => $("story").querySelector("video");
function stRun(ms){
  stDur = ms; clearTimeout(stT);
  const bar = $("story").querySelector(".sbars i.run");
  if (RM()){ if (bar) bar.className = "full"; return; }
  if (bar){ bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; bar.style.animationDuration = ms + "ms"; }
  stT = setTimeout(() => stGo(1), ms);
}
function stSndDraw(){ const b = $("story").querySelector("[data-ssnd]"); if (b){ b.setAttribute("aria-pressed", String(stSnd)); b.textContent = stSnd ? "Звук включён" : "Включить звук"; } }
/* видео сторис: файл из media/ — три кодека, как у видео первого экрана (X.av1.mp4 — Android и компьютер, X.hevc.mp4 — iPhone,
   X.mp4 — запасной; браузер берёт первый, который умеет, и не качает остальные) и кадр X.jpg — виден сразу, пока ролик грузится;
   файл из uploads/ — как есть. Пока смотрят одну сторис, следующее видео уже грузится */
const VSRC = [[".av1.mp4", 'video/mp4; codecs="av01.0.05M.08"'], [".hevc.mp4", 'video/mp4; codecs="hvc1.1.6.L93.B0"'], [".mp4", "video/mp4"]];
const vMedia = v => /^media\/[\w.-]+\.mp4$/.test(v || "") && !/\.(av1|hevc)\.mp4$/.test(v);
const vPoster = x => vMedia(x.vid) ? x.vid.replace(/\.mp4$/, ".jpg") : x.img || "";
let stPre = null;
function vEl(x){
  const v = document.createElement("video");
  v.className = "svid"; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.muted = true;
  const p = vPoster(x); if (p) v.poster = p;
  if (vMedia(x.vid)) VSRC.forEach(([ext, type]) => { const so = document.createElement("source"); so.src = x.vid.replace(/\.mp4$/, ext); so.type = type; v.appendChild(so); });
  else v.src = x.vid;
  return v;
}
function stPrep(i){                                                            // следующая сторис с видео — грузим заранее
  const n = stL[i];
  if (!n || !n.x.vid || SLOW() || (stPre && stPre.vid === n.x.vid)) return;
  stPre = {vid: n.x.vid, el: vEl(n.x)}; stPre.el.load();
}
function stDraw(){
  const s = stL[stI], x = s.x, ev = s.k === "e", z = ev ? zoneOf(x.zone) : {name: "Новости", color: NEWSC}, box = $("story"), d = dd(x.date);
  const vid = x.vid && !SLOW();
  box.style.setProperty("--z", z.color);
  box.classList.toggle("sv", !!vid);
  box.innerHTML = '<div class="sbars">' + stL.map((_, i) => '<span><i class="' + (i < stI ? "full" : i === stI ? "run" + (vid ? " v" : "") : "") + '"></i></span>').join("") + '</div>' +
    '<button type="button" class="sx" data-sx aria-label="Закрыть">×</button>' +
    (vid ? '<button type="button" class="ssnd" data-ssnd aria-pressed="false">Включить звук</button>' : '') +
    '<div class="sbg' + (vid ? " hasv load" : "") + '">' + (vid ? ''
      : x.img ? '<img src="' + esc(x.img) + '" alt="">' : '<span class="sbig" aria-hidden="true">' + d.getUTCDate() + '</span>') + '</div>' +
    '<div class="sbody"><p class="szone">' + esc(ev ? (z.name || "Все залы") : "Новости") + '</p><p class="sdate">' + (ev ? esc(WDF[d.getUTCDay()]) + ', ' + esc(dayTx(x.date)) + esc(tm(x)) : esc(dayTx(x.date))) + '</p>' +
    '<h3>' + esc(x.title) + '</h3><p class="stx">' + esc(x.text || "") + '</p>' + (ev && x.price ? '<p class="spr">' + esc(x.price) + '</p>' : '') +
    '<div class="sacts"><button type="button" class="btn" data-sbk>Забронировать стол</button>' + (ev ? '<button type="button" class="btn ghost" data-smore>Подробнее</button>' : '') + '</div></div>' +
    '<button type="button" class="stap prev" data-sp aria-label="Предыдущее"></button><button type="button" class="stap next" data-sn aria-label="Следующее"></button>';
  stSndDraw();
  if (vid){
    clearTimeout(stT);
    const bg = box.querySelector(".sbg"), bar = box.querySelector(".sbars i.run");
    const v = stPre && stPre.vid === x.vid ? stPre.el : vEl(x);
    stPre = null;
    v.muted = !stSnd; v.controls = RM();
    bg.appendChild(v);
    /* полоска идёт за видео; пока грузится — кадр и кружок загрузки; не загрузилось — кадр, как у картинки */
    const fail = () => { if (bar) bar.classList.remove("v"); bg.classList.remove("load"); stRun(STD); };
    v.addEventListener("timeupdate", () => { if (bar && v.duration) bar.style.width = Math.min(100, v.currentTime / Math.min(v.duration, 30) * 100) + "%"; if (v.currentTime >= 30) stGo(1); });
    v.addEventListener("ended", () => stGo(1));
    v.addEventListener("playing", () => { bg.classList.remove("load"); stPrep(stI + 1); });
    v.addEventListener("waiting", () => bg.classList.add("load"));
    v.addEventListener("error", fail);
    const last = v.querySelector("source:last-of-type"); if (last) last.addEventListener("error", fail);
    if (v.readyState >= 3) bg.classList.remove("load");
    if (!RM()) v.play().catch(() => { v.muted = true; stSnd = false; stSndDraw(); v.play().catch(() => {}); });
  } else { stRun(STD); stPrep(stI + 1); }
  box.querySelector("[data-sx]").focus({preventScroll: true});
  if (window.gsap && !RM()) gsap.from(box.querySelector(".sbody"), {y: 24, opacity: 0, duration: .35, ease: "power2.out"});
}
function stOpen(i, list){ stL = list || stFeed(); if (!stL.length) return; stRet = document.activeElement; stI = Math.max(0, Math.min(i, stL.length - 1)); $("story").hidden = false; document.body.style.overflow = "hidden"; stDraw(); }
function stClose(){ if ($("story").hidden) return; clearTimeout(stT); stHold = false; stPre = null; const v = stVid(); if (v) v.pause(); $("story").innerHTML = ""; $("story").hidden = true; document.body.style.overflow = ""; if (stRet && stRet.focus) stRet.focus({preventScroll: true}); }
function stGo(d){ if (stI + d >= stL.length) return stClose(); const v = stVid(); if (v) v.pause(); stI = Math.max(0, stI + d); stDraw(); }
function stPause(on){
  if (RM()) return; stHold = on;
  const v = stVid();
  if (v){ if (on) v.pause(); else v.play().catch(() => {}); return; }
  const i = $("story").querySelector(".sbars i.run"); if (i) i.style.animationPlayState = on ? "paused" : "running";
  if (on) clearTimeout(stT); else { const left = stDur * (1 - (i ? i.getBoundingClientRect().width / i.parentNode.getBoundingClientRect().width : 0)); stT = setTimeout(() => stGo(1), Math.max(300, left)); }
}
$("stories").addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) stOpen(+b.dataset.st); });
$("story").addEventListener("click", e => {
  if ($("story").hidden) return;
  const s = stL[stI], x = s && s.x;
  if (e.target.closest("[data-ssnd]")){ stSnd = !stSnd; const v = stVid(); if (v){ v.muted = !stSnd; if (v.paused) v.play().catch(() => {}); } stSndDraw(); return; }
  if (stLong){ stLong = false; if (e.target.closest("[data-sp],[data-sn]")) return; }
  if (e.target.closest("[data-sx]")) return stClose();
  if (e.target.closest("[data-sp]")) return stGo(-1);
  if (e.target.closest("[data-sn]")) return stGo(1);
  if (e.target.closest("[data-sbk]")){ stClose(); return s.k === "e" ? bookFor(x.zone, x.date, x.id) : bookFor("", "", ""); }
  if (e.target.closest("[data-smore]")){ stClose(); location.hash = "event-" + x.id; }
});
let sy = 0;
$("story").addEventListener("pointerdown", e => { if (!e.target.closest(".btn,[data-sx],[data-ssnd]")){ sy = e.clientY; stDown = Date.now(); stPause(true); } });
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

/* ── заставка входа, как у барного гида: контур логотипа прорисовывается, заливка, свечение, блик (один раз за вкладку) ── */
function intro(then){
  const ov = $("vintro"), on = document.documentElement.classList.contains("intro-on");
  if (!on || !window.gsap || RM()){ document.documentElement.classList.remove("intro-on"); then(); return; }
  try { sessionStorage.setItem("mv-intro", 1); } catch (e) {}
  const line = ov.querySelector(".vi-line");
  line.setAttribute("d", $("mlogo").getAttribute("d"));
  let done = false;
  const len = line.getTotalLength(), end = () => { if (done) return; done = true; document.documentElement.classList.remove("intro-on"); then(); };
  setTimeout(end, 5000);                                                         // если анимация не дошла (вкладка в фоне) — сайт всё равно открывается
  gsap.set(line, {strokeDasharray: len, strokeDashoffset: len});
  gsap.set([".vi-fill", ".vi-glow"], {opacity: 0});
  const tl = gsap.timeline({defaults: {ease: "sine.inOut"}, onComplete: end});
  tl.fromTo(".vi-logo", {scale: .94, opacity: 0}, {scale: 1, opacity: 1, duration: .5, ease: "power2.out", transformOrigin: "50% 50%"})
    .to(line, {strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut"}, "<")
    .to(".vi-fill", {opacity: 1, duration: .55}, "-=.25")
    .to(".vi-glow", {opacity: .5, duration: .6}, "<")
    .to(line, {opacity: 0, duration: .4}, "<.2")
    .fromTo(".vi-shine", {x: 0}, {x: 1000, duration: 1, ease: "power2.inOut"}, "-=.35")
    .to(".vi-glow", {opacity: .22, duration: .8}, "<")
    .fromTo(".vi-word", {opacity: 0, y: 10, letterSpacing: ".5em"}, {opacity: 1, y: 0, letterSpacing: ".28em", duration: .8, ease: "power3.out"}, "-=.8")
    .to(ov, {opacity: 0, duration: .6, ease: "power2.inOut", delay: .35})
    .to(".vi-logo", {scale: 1.05, duration: .6, ease: "power2.in"}, "<");
  ov.addEventListener("click", () => tl.progress(1), {once: true});                // нажали — сразу к сайту
}

/* ── окно «Это демо-версия сайта» — при каждом заходе на сайт, закрывается кнопкой «Ознакомлен» ── */
function demoNote(then){
  const m = $("dmodal"), ok = $("dmOk"), tel = $("dmTel"), ret = document.activeElement;
  tel.textContent = S.info.phone; tel.href = "tel:" + S.info.phone.replace(/[^\d+]/g, "");
  m.hidden = false; document.body.style.overflow = "hidden";
  if (window.gsap && !RM()) gsap.from(m.querySelector(".dmb"), {y: 24, opacity: 0, duration: .45, ease: "power2.out"});
  ok.focus({preventScroll: true});
  const keys = e => {                                                            // фокус — только внутри окна
    if (e.key !== "Tab") return;
    const f = [tel, ok], i = f.indexOf(document.activeElement);
    e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
  };
  m.addEventListener("keydown", keys);
  ok.addEventListener("click", () => {
    m.removeEventListener("keydown", keys); m.hidden = true; document.body.style.overflow = "";
    if (ret && ret.focus && ret !== document.body) ret.focus({preventScroll: true});
    then();
  }, {once: true});
}

/* ── неон названия на первом экране зажигается, как вывеска (без «уменьшить движение») ── */
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
  heroVideo(); intro(() => demoNote(neonOn)); route();
})();
