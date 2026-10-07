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
/* «05.10» / «05.10.2026» из таблицы → ключ дня для сравнения */
const rkey = ms => rtime(ms, {year:"numeric", month:"2-digit", day:"2-digit"});
/* дата ревизии словами: «5 октября» */
function rdate(open){
  if (open.started) return rday(open.started);
  const m = String(open.date).match(/^(\d{2})\.(\d{2})(?:\.(\d{4}))?/);
  if (!m) return open.date;
  const y = m[3] ? +m[3] : +rtime(rnow(), {year:"numeric"});
  return rday(Date.UTC(y, m[2] - 1, m[1], 7));
}
function rsameDay(open){
  const today = rkey(rnow());
  if (open.started) return rkey(open.started) === today;
  const m = String(open.date).match(/^(\d{2})\.(\d{2})(?:\.(\d{4}))?/);
  return !m || today.startsWith(m[1] + "." + m[2]);
}
const rday = ms => rtime(ms, Object.assign({day:"numeric", month:"long"},
  rtime(ms, {year:"numeric"}) !== rtime(rnow(), {year:"numeric"}) ? {year:"numeric"} : {}));
function rsync(rev){
  if (!rev || !rev.now) return;
  rskew = rev.now - Date.now();
  rsynced = Date.now();
}

async function revLoad(quiet){
  if (!REV && !quiet){
    $("rinfo").innerHTML = '<span class="skel line" aria-hidden="true"><i style="width:70%"></i></span><span class="sr">Загружаем…</span>';
    $("rlist").innerHTML = skel(6, "rrow"); $("rbody").hidden = false; $("rzone").innerHTML = "";
  }
  const d = await api({rev:"state"});
  if (d.ok && d.rev){ rsync(d.rev); REV = d.rev; revApplyQueue(); revDraw(); revFlush(); }
  else if (quiet){ $("rqueue").textContent = "нет связи"; }
  else {
    if (!REV) $("rbody").hidden = true;
    $("rinfo").textContent = d.error === "net" ? "Таблица не отвечает. Если интернет есть — в Apps Script запустите checkRevision, дайте разрешение и выпустите новую версию." : "Ошибка таблицы: " + (d.error || "нет ответа") + ".";
  }
}

/* неотправленные добавления — поверх данных с сервера */
function revApplyQueue(){
  if (!REV || !REV.open) return;
  for (const q of rjson(RQ, [])){
    if (q.rk !== REV.open.key) continue;
    const it = REV.items.find(x => x.n === q.pos);
    const zi = REV.zones.indexOf(q.zone);
    if (it && zi >= 0){ it.z[zi] += q.v; it.t += q.v; it.pend = true; }
  }
}

function revDraw(){
  const r = REV;
  const q = rjson(RQ, []);
  $("rqueue").textContent = q.length ? "не отправлено: " + q.length : "";
  if (!r) return;
  const open = r.open;
  $("rtitle").textContent = open ? "Ревизия · " + rdate(open) : "Ревизия не начата";
  const old = open && !rsameDay(open);
  $("rinfo").innerHTML = '<span class="rtoday">Сегодня ' + rday(rnow()) + '</span> ' + (open
    ? (old ? '<b class="rold">Эта ревизия начата не сегодня</b> — для сегодняшнего пересчёта нажмите «Начать новую». ' : '') +
      'Считает <b>' + esc(open.name) + '</b>.' + (r.prev ? ' Для сравнения — пересчёт ' + esc(r.prev.date) + ' · ' + esc(r.prev.name) + '.' : '')
    : (r.prev ? 'Последний пересчёт — ' + esc(r.prev.date) + ' · ' + esc(r.prev.name) + '. ' : '') + 'Нажмите «Начать ревизию» — в таблице появятся новые колонки с сегодняшней датой и вашей фамилией.');
  $("rstart").textContent = open ? "Начать новую" : "Начать ревизию";
  $("rclose").hidden = !open;
  $("rbody").hidden = !open;
  if (!open) return;

  if (!r.zones.includes(rzone)) rzone = r.zones[0];
  $("rzone").innerHTML = r.zones.map(z =>
    '<button type="button" data-z="' + esc(z) + '" aria-pressed="' + (z === rzone) + '">' + esc(z) + '</button>').join("");

  const zi = r.zones.indexOf(rzone);
  const hist = rjson(RH, {})[open.key] || {};
  $("rlist").innerHTML = r.items.length ? r.items.map((it, i) => {
    const parts = hist[rzone + "|" + it.n] || [];
    const sub = [];
    if (parts.length) sub.push(parts.map(hl).join(" + ").replace(/\+ -/g, "− "));
    sub.push("все зоны: " + rfmt(it.t) + " " + it.u);
    if (it.p != null) sub.push("прошлый: " + rfmt(it.p));
    return '<li class="rrow" data-i="' + i + '">' +
      '<div class="rtop"><span class="rn">' + esc(it.n) + '<small>' + esc(it.u) + '</small></span>' +
      '<b' + (it.pend ? ' class="pend"' : '') + '>' + rfmt(it.z[zi]) + '<small>' + esc(it.u) + '</small></b></div>' +
      '<div class="rsub">' + esc(sub.join(" · ")) + '</div>' +
      '<form class="rin"><input type="text" inputmode="decimal" autocomplete="off" placeholder="Напр. 3 или 37×0,85" aria-label="Добавить: ' + esc(it.n) + '">' +
      '<button type="button" class="ghost mul" aria-label="Умножить">×</button>' +
      '<button type="submit" aria-label="Прибавить">+</button>' +
      '<button type="button" class="ghost undo"' + (parts.length ? '' : ' disabled') + ' aria-label="Отменить последнее">↶</button>' +
      '<span class="rprev"></span></form></li>';
  }).join("") : '<li class="rrow">В столбце A листа «Итог» нет позиций.</li>';
}

function revAdd(i, v, undo, e){
  const r = REV, it = r && r.items[i];
  if (!it || !r.open || !isFinite(v) || !v) return;
  const zi = r.zones.indexOf(rzone);
  it.z[zi] += v; it.t += v; it.pend = true;
  buzz(undo ? 8 : 14);

  const all = rjson(RH, {});
  const h = all[r.open.key] = all[r.open.key] || {};
  const k = rzone + "|" + it.n;
  h[k] = h[k] || [];
  undo ? h[k].pop() : h[k].push(e ? {v, e} : v);
  for (const key of Object.keys(all)) if (key !== r.open.key) delete all[key];
  rsave(RH, all);

  const q = rjson(RQ, []);
  q.push({id:rid(), rk:r.open.key, pos:it.n, zone:rzone, v});
  rsave(RQ, q);
  revDraw();
  revFlush();
}

/* отправка очереди по одному, по порядку */
async function revFlush(){
  if (rbusy) return;
  rbusy = true;
  try {
    for (;;){
      const q = rjson(RQ, []);
      if (!q.length) break;
      const a = q[0];
      const d = await api({rev:"add", id:a.id, rk:a.rk, pos:a.pos, zone:a.zone, v:String(a.v), rn: me ? me.name : ""});
      if (d.error === "net" || d.error === "denied") break;
      rsave(RQ, rjson(RQ, []).filter(x => x.id !== a.id));
      if (d.ok && d.add && REV && REV.open && REV.open.key === a.rk){
        const it = REV.items.find(x => x.n === d.add.pos);
        if (it){ it.z = d.add.z; it.t = d.add.t; }
      }
      if (!d.ok){ $("rwarn").textContent = a.pos + ", " + a.zone + ": " + (d.error === "closed" ? "ревизия уже завершена — добавление не записано." : "не записано (" + d.error + ")."); }
    }
    if (REV){
      const left = rjson(RQ, []);
      for (const it of REV.items) it.pend = left.some(x => x.pos === it.n);
      revDraw();
    }
  } finally { rbusy = false; }
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
  if (!isFinite(c.v) || !c.v){ inp.focus(); return; }
  const i = +li.dataset.i;
  revAdd(i, c.v, false, c.e);
  const again = document.querySelector('#rlist li[data-i="' + i + '"] input');
  if (again) again.focus();
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

$("rlist").addEventListener("click", e => {
  const b = e.target.closest("button.undo");
  if (!b) return;
  const i = +b.closest("li").dataset.i, it = REV.items[i];
  const parts = ((rjson(RH, {})[REV.open.key] || {})[rzone + "|" + it.n]) || [];
  if (!parts.length) return;
  const last = hv(parts[parts.length - 1]);
  if (confirm("Отменить последнее добавление (" + hl(parts[parts.length - 1]) + " " + it.u + ") — " + it.n + ", " + rzone + "?")) revAdd(i, -last, true);
});

$("rstart").addEventListener("click", async () => {
  if (REV && REV.open && !confirm("Сейчас идёт ревизия " + REV.open.date + " (" + REV.open.name + "). Начать новую? Старая останется в таблице.")) return;
  if (rjson(RQ, []).length && !confirm("Есть неотправленные добавления. Начать новую ревизию всё равно?")) return;
  $("rinfo").textContent = "Создаём колонки в таблице…";
  const d = await api({rev:"start", rn: me ? me.name : ""});
  if (d.ok && d.rev){ REV = d.rev; rsave(RQ, []); revDraw(); }
  else $("rinfo").textContent = "Не удалось начать: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});

$("rclose").addEventListener("click", async () => {
  if (rjson(RQ, []).length){ alert("Сначала дождитесь отправки всех добавлений."); return; }
  if (!confirm("Завершить ревизию? Добавлять в неё больше будет нельзя.")) return;
  const d = await api({rev:"close"});
  if (d.ok && d.rev){ REV = d.rev; revDraw(); }
  else $("rinfo").textContent = "Не удалось завершить: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});

$("rreload").addEventListener("click", revLoad);
window.addEventListener("online", () => { if (R) revFlush(); });

/* Синхронизация: пока открыт раздел — раз в 30 секунд сверяемся с таблицей
   (числа от других телефонов и время). Не мешаем, если человек вводит число. */
const rtyping = () => [...document.querySelectorAll("#rlist input")].some(i => i.value || i === document.activeElement);
function rtick(){
  if (sect !== "rev" || !R || !REV || document.hidden || !navigator.onLine || rbusy) return;
  if (rjson(RQ, []).length || rtyping()) return;
  revLoad(true);
}
setInterval(rtick, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && rsynced && Date.now() - rsynced > 15000) rtick(); });
