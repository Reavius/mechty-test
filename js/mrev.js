/* Ревизия: переключатель «Ежедневная / Месячная» и месячная ревизия. */
/* ════════════ Месячная ревизия ════════════
   Весь бар по бланку — лист «Месячная ревизия» в таблице ревизии (разделы, позиции, ед. изм.).
   Каждая ревизия — новый столбец с датой и фамилией. Числа складывает Apps Script;
   добавления уходят с id, без связи копятся в очереди на устройстве. Поиск — по названию и разделу. */
const MQ = "mechty-mrev-q", MH = "mechty-mrev-hist", MS = "mechty-mrev-state", RK = "mechty-rkind";
let MREVS = null, mbusy = false, rkind = "day", mcached = false;
try { if (localStorage.getItem(RK) === "month") rkind = "month"; } catch (e) {}

/* ── переключатель ── */
function rkindShow(){
  $("revDay").hidden = rkind !== "day";
  $("revMonth").hidden = rkind !== "month";
  document.querySelectorAll("#rkind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === rkind)));
}
function rkindLoad(){
  rkindShow();
  rkind === "month" ? mrevLoad() : revLoad();
}
$("rkind").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || b.dataset.k === rkind) return;
  rkind = b.dataset.k;
  try { localStorage.setItem(RK, rkind); } catch (e2) {}
  if (R) rkindLoad(); else rkindShow();
});
rkindShow();

/* ── данные ── */
const mnorm = s => String(s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const mitems = () => { if (MREVS) msections(); return MREVS ? MREVS.rows.filter(x => x.t === "i") : []; };
/* ключ позиции для истории и очереди: раздел + название — не меняется, если в листе сдвинули строки */
const mkey = it => (it.sec || "") + "|" + it.n;

/* строки листа → разделы; раздел без своих позиций (П/ф бар) — заголовок группы */
function msections(){
  const out = [];
  let cur = null;
  for (const x of MREVS ? MREVS.rows : []){
    if (x.t !== "i"){ cur = {n: x.n, t: x.t, items: []}; out.push(cur); continue; }
    if (!cur){ cur = {n: "Без раздела", t: "h", items: []}; out.push(cur); }
    x.sec = cur.n;
    cur.items.push(x);
  }
  return out;
}

async function mrevLoad(quiet){
  if (!MREVS){
    const c = rjson(MS, null);
    if (c && c.rows){ MREVS = c; mcached = true; mApplyQueue(); mrevDraw(true); }
    else if (!quiet){
      $("minfo").innerHTML = '<span class="skel line" aria-hidden="true"><i style="width:70%"></i></span><span class="sr">Загружаем…</span>';
      $("mlist").innerHTML = '<div class="result tcard"><ul class="rlist">' + skel(8, "rrow") + '</ul></div>'; $("mbody").hidden = false;
    }
  }
  const d = await api({mrev:"state"});
  if (d.ok && d.mrev){
    rsync(d.mrev);
    MREVS = d.mrev; mcached = false;
    rsave(MS, MREVS);
    mApplyQueue(); mrevDraw(true); mFlush();
  } else if (quiet){
    $("mqueue").textContent = "нет связи";
  } else {
    if (!MREVS) $("mbody").hidden = true;
    $("minfo").textContent = d.ok ? "Месячной ревизии пока нет в Apps Script: вставьте новый код из apps-script/Code.gs и выпустите новую версию (см. README)."
      : d.error === "net" ? "Таблица не отвечает." + (MREVS ? " Показана сохранённая копия — добавления отправятся, когда появится связь." : "")
      : "Ошибка таблицы: " + (d.error || "нет ответа") + ".";
  }
}

/* неотправленные добавления — поверх данных с сервера */
function mApplyQueue(){
  if (!MREVS || !MREVS.open) return;
  for (const q of rjson(MQ, [])){
    if (q.rk !== MREVS.open.key) continue;
    const it = mitems().find(x => mkey(x) === q.k) || mitems().find(x => x.r === q.row && x.n === q.pos);
    if (it){ it.v = Math.round(((it.v || 0) + q.v) * 1000) / 1000; it.pend = true; }
  }
}

/* ── отрисовка ── */
function mrow(it, hist){
  const parts = hist[mkey(it)] || [];
  const sub = [];
  if (parts.length) sub.push(parts.map(hl).join(" + ").replace(/\+ -/g, "− "));
  if (it.p != null) sub.push("прошлый: " + rfmt(it.p) + (it.u ? " " + it.u : ""));
  return '<li class="rrow' + (it.v == null ? " mnone" : "") + '" data-r="' + it.r + '">' +
    '<div class="rtop"><span class="rn">' + esc(it.n) + (it.u ? '<small>' + esc(it.u) + '</small>' : '') + '</span>' +
    '<b' + (it.pend ? ' class="pend"' : '') + '>' + (it.v == null ? '—' : rfmt(it.v) + (it.u ? '<small>' + esc(it.u) + '</small>' : '')) + '</b></div>' +
    '<div class="rsub">' + esc(sub.join(" · ")) + '</div>' +
    '<form class="rin"><input type="text" inputmode="decimal" autocomplete="off" placeholder="Напр. 3 или 0,7×6" aria-label="Добавить: ' + esc(it.n) + '">' +
    '<button type="button" class="ghost mul" aria-label="Умножить">×</button>' +
    '<button type="submit" aria-label="Прибавить">+</button>' +
    '<button type="button" class="ghost undo"' + (parts.length ? '' : ' disabled') + ' aria-label="Отменить последнее">↶</button>' +
    '<span class="rprev"></span></form></li>';
}

function mrevDraw(full){
  const r = MREVS;
  const q = rjson(MQ, []);
  $("mqueue").textContent = q.length ? "не отправлено: " + q.length : mcached ? "сохранённая копия" : "";
  if (!r) return;
  const open = r.open, all = mitems(), done = all.filter(x => x.v != null).length;
  $("mtitle").textContent = open ? "Месячная ревизия · " + rdate(open) : "Месячная ревизия не начата";
  $("minfo").innerHTML = '<span class="rtoday">Сегодня ' + rday(rnow()) + '</span> ' + (open
    ? 'Считает <b>' + esc(open.name) + '</b>. Посчитано <b>' + done + '</b> из ' + all.length + '.' +
      (r.prev ? ' Для сравнения — ' + esc(r.prev.date) + (r.prev.name ? ' · ' + esc(r.prev.name) : '') + '.' : '')
    : (r.prev ? 'Последняя — ' + esc(r.prev.date) + (r.prev.name ? ' · ' + esc(r.prev.name) : '') + '. ' : '') +
      'Нажмите «Начать ревизию» — в листе «Месячная ревизия» появится столбец с сегодняшней датой и вашей фамилией. ' + all.length + ' позиций.');
  $("mstart").textContent = open ? "Начать новую" : "Начать ревизию";
  $("mclose").hidden = !open;
  $("mbody").hidden = !open;
  if (!open) return;
  if (full !== false) mlistDraw();
}

/* список с учётом поиска и фильтров */
function mlistDraw(){
  const secs = msections();
  const sel = $("msec"), keep = sel.value;
  sel.innerHTML = '<option value="">Все разделы</option>' + secs.filter(s => s.items.length).map(s =>
    '<option value="' + esc(s.n) + '">' + esc(s.n) + ' · ' + s.items.length + '</option>').join("");
  sel.value = secs.some(s => s.n === keep) ? keep : "";

  const words = mnorm($("mq").value).split(" ").filter(Boolean);
  const todo = $("mtodo").checked, only = sel.value;
  const filtering = words.length || todo || only;
  const hist = (rjson(MH, {})[MREVS.open.key]) || {};
  let html = "", found = 0;
  for (const s of secs){
    if (!s.items.length){ if (!filtering) html += '<p class="mgroup">' + esc(s.n) + '</p>'; continue; }
    if (only && s.n !== only) continue;
    const hay = mnorm(s.n);
    const items = s.items.filter(it => (!todo || it.v == null) &&
      words.every(w => mnorm(it.n).includes(w) || hay.includes(w)));
    if (!items.length) continue;
    found += items.length;
    html += '<section class="msec"><div class="sechead"><h2>' + esc(s.n) + '</h2><em>' +
      (items.length < s.items.length ? items.length + ' из ' + s.items.length : s.items.length) + '</em></div>' +
      '<div class="result tcard"><ul class="rlist">' + items.map(it => mrow(it, hist)).join("") + '</ul></div></section>';
  }
  $("mlist").innerHTML = html || '<p class="empty">Ничего не найдено — проверьте написание или сбросьте фильтры.</p>';
  $("mfound").textContent = filtering ? "Найдено: " + found : "";
}

/* обновить одну строку, не трогая остальные (фокус и ввод не теряются) */
function mpatch(it){
  const li = $("mlist").querySelector('li[data-r="' + it.r + '"]');
  if (!li) return;
  const hist = (rjson(MH, {})[MREVS.open.key]) || {};
  const tmp = document.createElement("ul");
  tmp.innerHTML = mrow(it, hist);
  const fresh = tmp.firstChild;
  li.className = fresh.className;
  li.querySelector(".rtop").replaceWith(fresh.querySelector(".rtop"));
  li.querySelector(".rsub").replaceWith(fresh.querySelector(".rsub"));
  li.querySelector("button.undo").disabled = fresh.querySelector("button.undo").disabled;
}

/* ── добавление ── */
function mrevAdd(row, v, undo, e){
  const r = MREVS, it = mitems().find(x => x.r === row);
  if (!it || !r.open || !isFinite(v) || !v) return;
  it.v = Math.round(((it.v || 0) + v) * 1000) / 1000; it.pend = true;
  buzz(undo ? 8 : 14);

  const all = rjson(MH, {});
  const h = all[r.open.key] = all[r.open.key] || {};
  const k = mkey(it);
  h[k] = h[k] || [];
  undo ? h[k].pop() : h[k].push(e ? {v, e} : v);
  for (const key of Object.keys(all)) if (key !== r.open.key) delete all[key];
  rsave(MH, all);

  const q = rjson(MQ, []);
  q.push({id: rid(), rk: r.open.key, row, k, sec: it.sec || "", pos: it.n, v});
  rsave(MQ, q);
  mpatch(it); mrevDraw(false);
  mFlush();
}

/* отправка очереди по одному, по порядку */
async function mFlush(){
  if (mbusy) return;
  mbusy = true;
  let bad = false;
  try {
    for (;;){
      const q = rjson(MQ, []);
      if (!q.length) break;
      const a = q[0];
      const d = await api({mrev:"add", id:a.id, rk:a.rk, row:String(a.row), sec:a.sec || "", pos:a.pos, v:String(a.v), rn: me ? me.name : ""});
      if (d.error === "net" || d.error === "denied") break;
      rsave(MQ, rjson(MQ, []).filter(x => x.id !== a.id));
      if (!d.ok){ bad = true; $("mwarn").textContent = a.pos + ": " + (d.error === "closed" ? "ревизия уже завершена — добавление не записано." : "не записано (" + d.error + ")."); continue; }
      if (d.add && MREVS && MREVS.open && MREVS.open.key === a.rk){
        const it = mitems().find(x => x.r === d.add.row && x.n === a.pos) || mitems().find(x => a.k && mkey(x) === a.k);
        const left = it ? rjson(MQ, []).filter(x => x.k ? x.k === mkey(it) : x.row === it.r) : [];
        if (it && !left.length && d.add.v != null){ it.v = d.add.v; it.pend = false; mpatch(it); }
      }
    }
    if (MREVS){ rsave(MS, MREVS); mrevDraw(false); }
  } finally { mbusy = false; }
  if (bad) mrevLoad(true);                                 // не записалось — сверяемся с таблицей
}

/* ── события ── */
/* только при наборе: «change» при уходе из поиска перерисовал бы список под пальцем */
$("mq").addEventListener("input", () => { if (MREVS && MREVS.open) mlistDraw(); });
$("msec").addEventListener("change", () => { if (MREVS && MREVS.open) mlistDraw(); });
$("mtodo").addEventListener("change", () => { if (MREVS && MREVS.open) mlistDraw(); });

$("mlist").addEventListener("submit", e => {
  e.preventDefault();
  const li = e.target.closest("li"), inp = e.target.querySelector("input");
  const c = rcalc(inp.value);
  if (!isFinite(c.v) || !c.v){ inp.focus(); return; }
  mrevAdd(+li.dataset.r, c.v, false, c.e);
  inp.value = ""; li.querySelector(".rprev").textContent = "";
  inp.focus();
});
$("mlist").addEventListener("click", e => {
  const m = e.target.closest("button.mul");
  if (m){
    const inp = m.closest("form").querySelector("input");
    if (inp.value && !/[×*]\s*$/.test(inp.value)) inp.value = inp.value.replace(/\s+$/, "") + "×";
    inp.focus();
    inp.dispatchEvent(new Event("input", {bubbles:true}));
    return;
  }
  const u = e.target.closest("button.undo");
  if (!u) return;
  const row = +u.closest("li").dataset.r, it = mitems().find(x => x.r === row);
  const parts = it ? ((rjson(MH, {})[MREVS.open.key] || {})[mkey(it)]) || [] : [];
  if (!it || !parts.length) return;
  const last = parts[parts.length - 1];
  if (confirm("Отменить последнее добавление (" + hl(last) + (it.u ? " " + it.u : "") + ") — " + it.n + "?")) mrevAdd(row, -hv(last), true);
});
$("mlist").addEventListener("input", e => {
  const inp = e.target.closest(".rin input");
  if (!inp) return;
  const c = rcalc(inp.value), out = inp.closest("form").querySelector(".rprev");
  out.textContent = c.e && isFinite(c.v) ? "= " + rfmt(c.v) : "";
});

$("mstart").addEventListener("click", async () => {
  if (MREVS && MREVS.open && !confirm("Сейчас идёт месячная ревизия " + MREVS.open.date + " (" + MREVS.open.name + "). Начать новую? Старая останется в таблице.")) return;
  if (rjson(MQ, []).length && !confirm("Есть неотправленные добавления. Начать новую ревизию всё равно?")) return;
  $("minfo").textContent = "Создаём столбец в таблице…";
  const d = await api({mrev:"start", rn: me ? me.name : ""});
  if (d.ok && d.mrev){ rsync(d.mrev); MREVS = d.mrev; mcached = false; rsave(MQ, []); rsave(MS, MREVS); $("mq").value = ""; $("mtodo").checked = false; $("msec").value = ""; mrevDraw(true); }
  else $("minfo").textContent = "Не удалось начать: " + (d.error === "net" ? "нет связи" : d.error || "обновите Apps Script") + ".";
});
$("mclose").addEventListener("click", async () => {
  if (rjson(MQ, []).length){ alert("Сначала дождитесь отправки всех добавлений."); return; }
  if (!confirm("Завершить месячную ревизию? Добавлять в неё больше будет нельзя.")) return;
  const d = await api({mrev:"close"});
  if (d.ok && d.mrev){ MREVS = d.mrev; rsave(MS, MREVS); mrevDraw(true); }
  else $("minfo").textContent = "Не удалось завершить: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});
$("mreload").addEventListener("click", () => mrevLoad());
window.addEventListener("online", () => { if (R) mFlush(); });

/* синхронизация раз в 30 секунд, пока открыт раздел; не мешаем вводу */
const mtyping = () => [...document.querySelectorAll("#mlist input, #mq")].some(i => i === document.activeElement || (i.id !== "mq" && i.value));
setInterval(() => {
  if (sect !== "rev" || rkind !== "month" || !R || !MREVS || document.hidden || !navigator.onLine || mbusy) return;
  if (rjson(MQ, []).length || mtyping()) return;
  mrevLoad(true);
}, 30000);
