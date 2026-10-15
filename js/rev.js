/* Ревизия. */
/* ════════════ Ревизия ════════════
   Числа складывает Apps Script в таблице. Каждое добавление уходит с id, поэтому
   повтор после обрыва связи не прибавится дважды. Без связи добавления копятся
   в очереди на этом устройстве и отправляются, когда сеть вернётся. */
const RQ = "mechty-rev-q", RH = "mechty-rev-hist", RZ = "mechty-rev-zone";
let REV = null, rzone = "", rbusy = false;
try { rzone = localStorage.getItem(RZ) || ""; } catch (e) {}

const rjson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const rsave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const rnum = v => { const x = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isFinite(x) ? x : NaN; };
/* «37×0,85», «37*0,85», «37х0,85» — множители перемножаются; одно число — как есть */
function rcalc(s){
  const t = String(s).replace(/\s/g, "");
  if (!t) return {v:NaN};
  const f = t.split(/[*×xXхХ]/);
  if (f.some(x => !/^-?\d*[.,]?\d+$|^-?\d+[.,]?$/.test(x))) return {v:NaN};
  const n = f.map(rnum);
  const v = n.reduce((a, b) => a * b, 1);
  return {v: Math.round(v * 1000) / 1000, e: n.length > 1 ? n.map(rfmt).join("×") : ""};
}
const hv = x => typeof x === "number" ? x : x.v;                  // элемент истории: число или {v, e}
const hl = x => typeof x === "number" ? rfmt(x) : x.e + "=" + rfmt(x.v);
const rfmt = v => String(Math.round(v * 1000) / 1000).replace(".", ",");
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

/* Дата — по времени Астаны (UTC+5, без перехода на летнее время), часы — по серверу Google:
   часы и часовой пояс телефона могут быть любыми. rskew — поправка к часам устройства. */
const RTZ = "Etc/GMT-5";                          // = UTC+5, Астана (знак в названии обратный)
let rskew = 0, rsynced = 0;
const rnow = () => Date.now() + rskew;
function rtime(ms, opts){
  const o = Object.assign({timeZone: RTZ}, opts);
  try { return new Intl.DateTimeFormat("ru-RU", o).format(new Date(ms)); }
  catch (e) { return new Date(ms + 5 * 3600000).toISOString().slice(0, 10).split("-").reverse().join("."); }
}
const rday = ms => rtime(ms, Object.assign({day:"numeric", month:"long"},
  rtime(ms, {year:"numeric"}) !== rtime(rnow(), {year:"numeric"}) ? {year:"numeric"} : {}));
/* день ревизии «2026-10-12» → «12 октября» */
const rdayName = day => { const m = String(day || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? rday(Date.UTC(+m[1], m[2] - 1, +m[3], 7)) : ""; };
function rsync(rev){
  if (!rev || !rev.now) return;
  rskew = rev.now - Date.now();
  rsynced = Date.now();
}

/* День ревизии — с 9:00 до 9:00, один на всех. Вход — только на этом телефоне (ничего не создаёт):
   столбец зоны появляется в таблице с первым добавленным числом и закрепляется за тем, кто начал.
   «Завершить» — личное: сворачивает ревизию у себя, остальные продолжают; вернуться можно до 9:00. */
const RIN = "mechty-rev-in", RF = "mechty-rev-fin";
let rview = "";                                                  // lobby — вход, work — подсчёт, sum — завершил
const rme = () => me ? mnorm(me.name) : "";
const rowner = z => REV && REV.open && REV.open.zones[z] ? REV.open.zones[z].who : "";
const rfinOf = who => !!(REV && REV.open && REV.open.fin && REV.open.fin[mnorm(who)]);
function rstate(){
  const r = REV, day = r.day, open = r.open;
  if (open ? rfinOf(me ? me.name : "") : rjson(RF, "") === day) return "sum";
  const mineZone = open && r.zones.some(z => open.zones[z] && mnorm(open.zones[z].who) === rme());
  return mineZone || rjson(RIN, "") === day ? "work" : "lobby";
}

async function revLoad(quiet){
  if (!REV && !quiet){
    $("rinfo").innerHTML = '<span class="skel line" aria-hidden="true"><i style="width:70%"></i></span><span class="sr">Загружаем…</span>';
    $("rlist").innerHTML = skel(6, "rrow"); $("rbody").hidden = false; $("rzblock").hidden = true;
  }
  const d = await api({rev:"state"});
  if (d.ok && d.rev && d.rev.day){
    /* сверка, пока бармен вводит число: тот же день и список — обновить только цифры и зоны (поле и клавиатура на месте);
       список в «Итоге» поменялся — перерисовать, если ничего не набрано */
    const same = quiet && REV && rview === "work" && REV.day === d.rev.day &&
      REV.items.map(x => x.n).join("\n") === d.rev.items.map(x => x.n).join("\n");
    if (quiet && rtyping() && (same || rtyped())) {
      if (!same) return;                                       // список другой, но в поле есть цифры — после ввода
      rsync(d.rev); REV = d.rev; revApplyQueue();
      if (rstate() !== "work") { revDraw(); revFlush(); return; }
      rhead(); rzoneDraw(); REV.items.forEach((_, i) => rpatch(i)); revFlush();
      return;
    }
    rsync(d.rev); REV = d.rev; revApplyQueue(); revDraw(); revFlush();
  }
  else if (quiet){ $("rqueue").textContent = "нет связи"; }
  else {
    if (!REV) $("rbody").hidden = true;
    $("rinfo").textContent = d.ok ? "Ревизия ждёт новый Apps Script: вставьте код из apps-script/Code.gs и выпустите новую версию (см. README)."
      : d.error === "net" ? "Таблица не отвечает. Если интернет есть — в Apps Script запустите checkRevision, дайте разрешение и выпустите новую версию."
      : "Ошибка таблицы: " + (d.error || "нет ответа") + ".";
  }
}

/* неотправленные добавления — поверх данных с сервера; зона, которую начал этот телефон, — уже «моя» */
function revApplyQueue(){
  if (!REV) return;
  for (const q of rjson(RQ, [])){
    if (q.rk !== REV.day) continue;
    const it = REV.items.find(x => x.n === q.pos);
    const zi = REV.zones.indexOf(q.zone);
    if (it && zi >= 0){ it.z[zi] += q.v; it.t += q.v; it.pend = true; rclaim(q.zone); }
  }
}
function rclaim(z){
  if (!me) return;
  if (!REV.open) REV.open = {date: REV.day.split("-").reverse().join("."), key: REV.day, zones: {}, fin: {}};
  if (!REV.open.zones[z]) REV.open.zones[z] = {who: me.name};
}

const rqueueDraw = () => { const q = rjson(RQ, []); $("rqueue").textContent = q.length ? "не отправлено: " + q.length : ""; };
/* строка под позицией: что добавлено в этой зоне, все зоны, прошлый пересчёт */
function rsubText(it, parts){
  const sub = [];
  if (parts.length) sub.push("моё: " + parts.map(hl).join(" + ").replace(/\+ -/g, "− "));
  sub.push("все зоны: " + rfmt(it.t) + " " + it.u);
  if (it.p != null) sub.push("прошлый: " + rfmt(it.p));
  return sub.join(" · ");
}
/* одна позиция — без перерисовки всего списка: поле ввода, фокус и клавиатура на месте */
function rpatch(i){
  const r = REV, it = r && rview === "work" && r.items[i], li = it && document.querySelector('#rlist li[data-i="' + i + '"]');
  if (!li) return;
  const zi = r.zones.indexOf(rzone), parts = (rjson(RH, {})[r.day] || {})[rzone + "|" + it.n] || [];
  const b = li.querySelector(".rtop > b");
  b.className = it.pend ? "pend" : "";
  b.innerHTML = rfmt(it.z[zi]) + '<small>' + esc(it.u) + '</small>';
  li.querySelector(".rsub").textContent = rsubText(it, parts);
  li.querySelector("button.undo").disabled = !parts.length;
}

/* кто какую зону считает: «Кафе — Куклин · 23 поз. · завершил» */
function rwho(){
  const r = REV, open = r.open;
  if (!open || !r.zones.some(z => open.zones[z])) return "";
  return '<ul class="mwho">' + r.zones.map((z, zi) => {
    const who = rowner(z);
    if (!who) return "";
    const n = r.items.filter(it => it.z[zi]).length;
    return '<li' + (mnorm(who) === rme() ? ' class="me"' : '') + '>' + esc(z) + ' — <b>' + esc(who) + '</b> · ' + n + ' поз. · ' +
      (rfinOf(who) ? 'завершил' : '<span class="on">считает</span>') + '</li>';
  }).join("") + '</ul>';
}

function rhead(){
  const r = REV, open = r.open, v = rview;
  $("rtitle").textContent = "Ревизия · " + rdayName(r.day);
  const prev = r.prev ? 'Для сравнения — пересчёт ' + esc(r.prev.date) + (r.prev.name ? ' · ' + esc(r.prev.name) : '') + '.' : '';
  $("rinfo").innerHTML = '<span class="rtoday">День ревизии — с 9:00 до 9:00 · сегодня ' + rday(rnow()) + '</span>' +
    (v === "lobby" ? (open ? 'Ревизия идёт. Войдите — увидите, что уже посчитано, и добавите своё.' : 'Сегодня ещё никто не считал. Войдите и выберите зону — её столбец появится в таблице с первым числом.') + ' ' + prev
    : v === "sum" ? '<b>Вы завершили свой подсчёт.</b> Ниже — итог дня по всем зонам; другие могут добавлять до 9:00. ' + prev
    : prev) + rwho();
  $("rstart").textContent = v === "sum" ? "Вернуться в ревизию" : "Войти в ревизию";
  $("rstart").hidden = v === "work";
  $("rclose").hidden = v !== "work";
}

function rzoneDraw(){
  const r = REV;
  $("rzone").innerHTML = r.zones.map(z => {
    const who = rowner(z);
    return '<button type="button" data-z="' + esc(z) + '" aria-pressed="' + (z === rzone) + '">' + esc(z) +
      '<small>' + (who ? esc(who) + (rfinOf(who) ? ' ✓' : '') : 'свободна') + '</small></button>';
  }).join("");
  const who = rowner(rzone);
  $("rznote").textContent = !who ? "Зона свободна — первое число закрепит её столбец за вами."
    : mnorm(who) === rme() ? "Ваша зона."
    : "Зону считает " + who + ". Добавить можно — число прибавится в её столбец, в журнале — под вашей фамилией. Отменить можно только своё.";
}

function revDraw(){
  const r = REV;
  rqueueDraw();
  if (!r) return;
  rview = rstate();
  rhead();
  $("rbody").hidden = rview === "lobby";
  $("rzblock").hidden = rview !== "work";
  if (rview === "lobby") return;
  if (rview === "sum") return rsumDraw();

  if (!r.zones.includes(rzone)) rzone = r.zones[0];
  rzoneDraw();
  const zi = r.zones.indexOf(rzone);
  const hist = rjson(RH, {})[r.day] || {};
  $("rlist").innerHTML = r.items.length ? r.items.map((it, i) => {
    const parts = hist[rzone + "|" + it.n] || [];
    return '<li class="rrow" data-i="' + i + '">' +
      '<div class="rtop"><span class="rn">' + esc(it.n) + '<small>' + esc(it.u) + '</small></span>' +
      '<b' + (it.pend ? ' class="pend"' : '') + '>' + rfmt(it.z[zi]) + '<small>' + esc(it.u) + '</small></b></div>' +
      '<div class="rsub">' + esc(rsubText(it, parts)) + '</div>' +
      '<form class="rin"><input type="text" inputmode="decimal" autocomplete="off" placeholder="Напр. 3 или 37×0,85" aria-label="Добавить: ' + esc(it.n) + '">' +
      '<button type="button" class="ghost mul" aria-label="Умножить">×</button>' +
      '<button type="submit" aria-label="Прибавить">+</button>' +
      '<button type="button" class="ghost undo"' + (parts.length ? '' : ' disabled') + ' aria-label="Отменить последнее">↶</button>' +
      '<span class="rprev"></span></form></li>';
  }).join("") : '<li class="rrow">В столбце A листа «Итог» нет позиций.</li>';
}

/* итог дня: позиции с числами — сумма и по зонам; без чисел — одной строкой */
function rsumDraw(){
  const r = REV, done = r.items.filter(it => it.t), left = r.items.length - done.length;
  $("rlist").innerHTML = (done.length ? done.map(it => {
    const sub = r.zones.map((z, zi) => it.z[zi] ? z + " " + rfmt(it.z[zi]) : "").filter(Boolean);
    if (it.p != null) sub.push("прошлый: " + rfmt(it.p));
    return '<li class="rrow"><div class="rtop"><span class="rn">' + esc(it.n) + '<small>' + esc(it.u) + '</small></span>' +
      '<b' + (it.pend ? ' class="pend"' : '') + '>' + rfmt(it.t) + '<small>' + esc(it.u) + '</small></b></div>' +
      '<div class="rsub">' + esc(sub.join(" · ")) + '</div></li>';
  }).join("") : '<li class="rrow">Сегодня ещё ничего не посчитано.</li>') +
    (left && done.length ? '<li class="rrow rleft">Без чисел: ' + left + ' поз.</li>' : '');
}

function revAdd(i, v, undo, e){
  const r = REV, it = r && r.items[i];
  if (!it || rview !== "work" || !isFinite(v)) return;                  // 0 — «посчитано, ноль» (позиция кончилась)
  const zi = r.zones.indexOf(rzone);
  it.z[zi] += v; it.t += v; it.pend = true;
  buzz(undo ? 8 : 14);

  const all = rjson(RH, {});
  const h = all[r.day] = all[r.day] || {};
  const k = rzone + "|" + it.n;
  h[k] = h[k] || [];
  undo ? h[k].pop() : h[k].push(e ? {v, e} : v);
  for (const key of Object.keys(all)) if (key !== r.day) delete all[key];
  rsave(RH, all);

  const q = rjson(RQ, []);
  q.push({id:rid(), rk:r.day, pos:it.n, zone:rzone, v, clr: undo && !h[k].length ? 1 : 0});   // отменили всё своё — ячейка снова пустая
  rsave(RQ, q);
  if (!rowner(rzone)){ rclaim(rzone); rzoneDraw(); rhead(); }
  rpatch(i); rqueueDraw();
  revFlush();
}

/* отправка очереди по одному, по порядку */
async function revFlush(){
  if (rbusy) return;
  rbusy = true;
  const lost = [];
  try {
    for (;;){
      const q = rjson(RQ, []);
      if (!q.length) break;
      const a = q[0];
      const d = await api({rev:"add", id:a.id, rk:a.rk, pos:a.pos, zone:a.zone, v:String(a.v), clr: a.clr ? "1" : "", rn: me ? me.name : ""});
      if (d.error === "net" || d.error === "denied") break;
      if (!d.ok && !/^(closed|position|bad)$/.test(String(d.error))){   // таблица занята или временная ошибка — повторим, не теряя
        $("rwarn").textContent = "Таблица не ответила — добавления отправятся повторно.";
        break;
      }
      if (d.ok && /повторно/.test($("rwarn").textContent)) $("rwarn").textContent = "";
      rsave(RQ, rjson(RQ, []).filter(x => x.id !== a.id));
      if (d.ok && d.add && REV && REV.day === a.rk){
        const it = REV.items.find(x => x.n === d.add.pos);
        if (it && d.add.z && d.add.z.length === REV.zones.length){ it.z = d.add.z; it.t = d.add.t; }
        if (d.add.who && REV.open && REV.open.zones[a.zone] && REV.open.zones[a.zone].who !== d.add.who){
          REV.open.zones[a.zone].who = d.add.who;                // зону успел начать другой — столбец его
          if (rview === "work"){ rzoneDraw(); rhead(); }
        }
      }
      if (!d.ok){
        rhistDrop(a);
        lost.push(a.pos + ", " + a.zone + " " + rfmt(a.v));
        $("rwarn").textContent = (d.error === "closed" ? "День ревизии закончился в 9:00 — не записано: " : "Не записано: ") + lost.join("; ") +
          (d.error === "closed" ? "." : " (" + d.error + ").");
      }
    }
    if (REV){
      const left = rjson(RQ, []);
      REV.items.forEach((it, i) => { it.pend = left.some(x => x.pos === it.n && x.rk === REV.day); rpatch(i); });
      rqueueDraw();
      if (rview === "sum") rsumDraw();
    }
  } finally { rbusy = false; }
}
/* не записалось — убрать из истории отмены, иначе «↶» вычтет то, чего нет */
function rhistDrop(a){
  const all = rjson(RH, {}), h = all[a.rk], parts = h && h[a.zone + "|" + a.pos];
  if (!parts) return;
  if (a.v > 0){ for (let i = parts.length - 1; i >= 0; i--) if (hv(parts[i]) === a.v){ parts.splice(i, 1); break; } }
  else parts.push(-a.v);
  rsave(RH, all);
}

$("rzone").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  rzone = b.dataset.z;
  try { localStorage.setItem(RZ, rzone); } catch (e2) {}
  revDraw();
});

$("rlist").addEventListener("submit", e => {
  e.preventDefault();
  const li = e.target.closest("li"), inp = e.target.querySelector("input");
  const c = rcalc(inp.value);
  if (!isFinite(c.v)){ inp.focus(); return; }
  const i = +li.dataset.i;
  revAdd(i, c.v, false, c.e);
  inp.value = ""; li.querySelector(".rprev").textContent = "";
  inp.focus();
});

/* кнопка «×» — на цифровой клавиатуре телефона знака умножения нет */
$("rlist").addEventListener("click", e => {
  const b = e.target.closest("button.mul");
  if (!b) return;
  const inp = b.closest("form").querySelector("input");
  if (inp.value && !/[×*]\s*$/.test(inp.value)) inp.value = inp.value.replace(/\s+$/, "") + "×";
  inp.focus();
  inp.dispatchEvent(new Event("input", {bubbles:true}));
});
/* подсказка с результатом умножения */
$("rlist").addEventListener("input", e => {
  const inp = e.target.closest(".rin input");
  if (!inp) return;
  const c = rcalc(inp.value), out = inp.closest("form").querySelector(".rprev");
  out.textContent = c.e && isFinite(c.v) ? "= " + rfmt(c.v) : "";
});

/* отменить можно только своё: история — на этом телефоне */
$("rlist").addEventListener("click", e => {
  const b = e.target.closest("button.undo");
  if (!b) return;
  const i = +b.closest("li").dataset.i, it = REV.items[i];
  const parts = ((rjson(RH, {})[REV.day] || {})[rzone + "|" + it.n]) || [];
  if (!parts.length) return;
  const last = hv(parts[parts.length - 1]);
  if (confirm("Отменить последнее добавление (" + hl(parts[parts.length - 1]) + " " + it.u + ") — " + it.n + ", " + rzone + "?")) revAdd(i, -last, true);
});

/* «Войти в ревизию» / «Вернуться в ревизию» */
$("rstart").addEventListener("click", async () => {
  if (!REV) return;
  rsave(RIN, REV.day);
  if (rview === "sum"){
    rsave(RF, "");
    if (REV.open && rfinOf(me ? me.name : "")){
      $("rinfo").textContent = "Возвращаем…";
      const d = await api({rev:"fin", on:"0", rk:REV.day, rn: me ? me.name : ""});
      if (d.ok && d.rev){ rsync(d.rev); REV = d.rev; revApplyQueue(); }
      else { $("rwarn").textContent = "Не удалось вернуться: " + (d.error === "net" ? "нет связи" : d.error) + "."; revDraw(); return; }
    }
  }
  revDraw();
});

/* «Завершить» — только свой подсчёт: остальные продолжают, итог — по всем зонам дня */
$("rclose").addEventListener("click", async () => {
  if (rjson(RQ, []).length) await revFlush();
  if (rjson(RQ, []).length){ alert("Есть неотправленные добавления — нет связи с таблицей. Попробуйте ещё раз, когда связь появится."); return; }
  if (!confirm("Завершить свой подсчёт? Ревизия свернётся у вас, остальные продолжают. Вернуться можно до 9:00 — «Вернуться в ревизию».")) return;
  rsave(RF, REV.day);
  const d = await api({rev:"fin", on:"1", rk:REV.day, rn: me ? me.name : ""});
  if (d.ok && d.rev){ rsync(d.rev); REV = d.rev; revApplyQueue(); }
  else if (d.error !== "net") $("rwarn").textContent = "Не удалось отметить завершение: " + d.error + ".";
  revDraw();
});

$("rreload").addEventListener("click", () => revLoad());
window.addEventListener("online", () => { if (R) revFlush(); });

/* Синхронизация: пока открыт раздел — раз в 30 секунд сверяемся с таблицей
   (числа от других телефонов, кто какую зону начал, смена дня в 9:00). Не мешаем, если человек вводит число. */
const rtyping = () => [...document.querySelectorAll("#rlist input")].some(i => i.value || i === document.activeElement);
const rtyped = () => [...document.querySelectorAll("#rlist input")].some(i => i.value);
function rtick(){
  if (sect !== "rev" || rkind !== "day" || !R || !REV || document.hidden || !navigator.onLine || rbusy) return;
  if (rjson(RQ, []).length){ revFlush(); return; }          // не ушло (нет связи, таблица занята) — отправляем сами
  if (rtyped()) return;                                      // набирает число — не мешаем
  revLoad(true);                                             // курсор в пустом поле — цифры обновятся, поле останется
}
setInterval(rtick, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && rsynced && Date.now() - rsynced > 15000) rtick(); });
