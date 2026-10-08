/* Ревизия: переключатель «Ежедневная / Месячная» и месячная ревизия. */
/* ════════════ Месячная ревизия ════════════
   Весь бар по бланку — лист «Месячная ревизия» в таблице ревизии. Одна ревизия идёт несколько дней:
   первый её столбец — «Итог» (сумма), дальше — столбцы барменов: у каждого свой, с фамилией и датой
   («Начать мой подсчёт» → считаю → «Завершить»). Считать можно одновременно. Числа складывает Apps Script;
   добавления уходят с id, без связи копятся в очереди на устройстве. Поиск — по названию и разделу.
   Позиции, которых нет в бланке, добавляются вниз — в «Новые позиции». */
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
const mblock = () => MREVS && MREVS.block;
/* мой открытый столбец: по фамилии того, кто вошёл */
const mmine = () => { const b = mblock(); return b && b.open && me ? b.cols.find(c => c.open && mnorm(c.name) === mnorm(me.name)) : null; };
const mmineIdx = () => { const b = mblock(), c = mmine(); return c ? b.cols.indexOf(c) : -1; };
const mhk = () => { const b = mblock(); return b ? b.title + "|" + b.started : ""; };   // ключ истории отмены — ревизия

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
const mitems = () => { if (MREVS) msections(); return MREVS ? MREVS.rows.filter(x => x.t === "i") : []; };
/* ключ позиции для истории и очереди: раздел + название — не меняется, если в листе сдвинули строки */
const mkey = it => (it.sec || "") + "|" + it.n;
const mround = v => Math.round(v * 1000) / 1000;

async function mrevLoad(quiet){
  if (!MREVS){
    const c = rjson(MS, null);
    if (c && c.rows && "block" in c){ MREVS = c; mcached = true; mApplyQueue(); mrevDraw(true); }
    else if (!quiet){
      $("minfo").innerHTML = '<span class="skel line" aria-hidden="true"><i style="width:70%"></i></span><span class="sr">Загружаем…</span>';
      $("mlist").innerHTML = '<div class="result tcard"><ul class="rlist">' + skel(8, "rrow") + '</ul></div>'; $("mbody").hidden = false;
    }
  }
  const d = await api({mrev:"state"});
  if (d.ok && d.mrev && "block" in d.mrev){
    rsync(d.mrev);
    const old = MREVS;
    MREVS = d.mrev; mcached = false;
    rsave(MS, MREVS);                                       // в копии на устройстве — только данные таблицы, без очереди
    mApplyQueue();
    /* тихая сверка: если список тот же — обновляем только изменившиеся строки (ввод и клавиатура не сбиваются) */
    if (quiet && old && msame(old, MREVS)){ mrevDraw(false); mpatchChanged(old); }
    else if (quiet && mtyping()){ mrevDraw(false); mpatchChanged(old); }
    else mrevDraw(true);
    mFlush();
  } else if (quiet){
    $("mqueue").textContent = "нет связи";
  } else {
    if (!MREVS) $("mbody").hidden = true;
    $("minfo").textContent = d.ok ? "Месячная ревизия ждёт новый Apps Script: вставьте код из apps-script/Code.gs и выпустите новую версию (см. README)."
      : d.error === "net" ? "Таблица не отвечает." + (MREVS ? " Показана сохранённая копия — добавления отправятся, когда появится связь." : "")
      : "Ошибка таблицы: " + (d.error || "нет ответа") + ".";
  }
}

/* тот же набор строк и столбцов — можно обновить точечно */
function msame(a, b){
  if (!a || !b || !a.block || !b.block || a.block.open !== b.block.open || a.block.cols.length !== b.block.cols.length) return false;
  if (a.block.cols.some((c, i) => c.id !== b.block.cols[i].id || c.open !== b.block.cols[i].open)) return false;
  return a.rows.length === b.rows.length && a.rows.every((x, i) => x.r === b.rows[i].r && x.n === b.rows[i].n);
}
function mpatchChanged(old){
  const prev = {};
  if (old) old.rows.forEach(x => { if (x.t === "i") prev[x.r + "|" + x.n] = JSON.stringify([x.tot, x.c, x.p, x.pend]); });
  mitems().forEach(x => { if (prev[x.r + "|" + x.n] !== JSON.stringify([x.tot, x.c, x.p, x.pend])) mpatch(x); });
}
/* копия на устройстве: подтверждённое сервером добавление — в неё же (чтобы без связи не потерять и не задвоить) */
function msnap(row, pos, ci, v, tot){
  const sn = rjson(MS, null);
  const x = sn && sn.rows && sn.rows.find(y => y.r === row && y.n === pos);
  if (!x || !x.c) return;
  x.c[ci] = v; if (tot !== undefined) x.tot = tot;
  rsave(MS, sn);
}

/* неотправленные добавления — поверх данных с сервера (в свой столбец и в итог) */
function mApplyQueue(){
  const b = mblock();
  if (!b || !b.open) return;
  for (const q of rjson(MQ, [])){
    const ci = b.cols.findIndex(c => c.id === q.cid);
    if (ci < 0) continue;
    const it = mitems().find(x => mkey(x) === q.k) || mitems().find(x => x.r === q.row && x.n === q.pos);
    if (!it) continue;
    it.c[ci] = mround((it.c[ci] || 0) + q.v);
    it.tot = mround((it.tot || 0) + q.v);
    it.pend = true;
  }
}

/* ── отрисовка ── */
const mfmt = (v, u) => rfmt(v) + (u ? " " + u : "");
function mrow(it, hist, mi){
  const b = mblock(), parts = mi >= 0 ? hist[mkey(it)] || [] : [];
  const sub = [];
  if (mi >= 0 && it.c[mi] != null) sub.push("моё: " + mfmt(it.c[mi], it.u) + (parts.length ? " (" + parts.map(hl).join(" + ").replace(/\+ -/g, "− ") + ")" : ""));
  b.cols.forEach((c, k) => { if (k !== mi && it.c[k] != null) sub.push(c.name + " " + String(c.date).slice(0, 5) + ": " + rfmt(it.c[k])); });
  if (it.p != null) sub.push("прошлая: " + mfmt(it.p, it.u));
  return '<li class="rrow' + (it.tot == null ? " mnone" : "") + '" data-r="' + it.r + '">' +
    '<div class="rtop"><span class="rn">' + esc(it.n) + (it.u ? '<small>' + esc(it.u) + '</small>' : '') + '</span>' +
    '<b' + (it.pend ? ' class="pend"' : '') + ' title="Итог">' + (it.tot == null ? '—' : rfmt(it.tot) + (it.u ? '<small>' + esc(it.u) + '</small>' : '')) + '</b></div>' +
    '<div class="rsub">' + esc(sub.join(" · ")) + '</div>' +
    (mi >= 0 ? '<form class="rin"><input type="text" inputmode="decimal" autocomplete="off" placeholder="Напр. 3 или 0,7×6" aria-label="Добавить: ' + esc(it.n) + '">' +
      '<button type="button" class="ghost mul" aria-label="Умножить">×</button>' +
      '<button type="submit" aria-label="Прибавить">+</button>' +
      '<button type="button" class="ghost undo"' + (parts.length ? '' : ' disabled') + ' aria-label="Отменить последнее">↶</button>' +
      '<span class="rprev"></span></form>' : '') + '</li>';
}

function mrevDraw(full){
  const r = MREVS;
  const q = rjson(MQ, []);
  $("mqueue").textContent = q.length ? "не отправлено: " + q.length : mcached ? "сохранённая копия" : "";
  if (!r) return;
  const b = r.block, open = !!(b && b.open), mine = mmine(), all = mitems(), done = all.filter(x => x.tot != null).length;
  $("mtitle").textContent = b && open ? b.title.replace(/^Ревизия/, "Месячная ревизия") : "Месячная ревизия не начата";
  const who = open ? b.cols.map(c => '<li' + (c === mine ? ' class="me"' : '') + '><b>' + esc(c.name) + '</b> · ' + esc(c.date) +
    (c.open ? ' · <span class="on">считает</span>' : ' · завершено') + '</li>').join("") : "";
  $("minfo").innerHTML = '<span class="rtoday">Сегодня ' + rday(rnow()) + '</span>' + (open
    ? 'Начата ' + esc(b.date) + '. Посчитано <b>' + done + '</b> из ' + all.length + '. Первый столбец ревизии — «Итог».' +
      (who ? '<ul class="mwho">' + who + '</ul>' : '') +
      (mine ? '' : '<span class="mhint">Нажмите «Начать мой подсчёт» — в таблице появится ваш столбец с сегодняшней датой.</span>')
    : (b ? 'Прошлая — «' + esc(b.title) + '», закрыта. ' : (r.prev ? 'Прошлая — «' + esc(r.prev) + '». ' : '')) +
      'Нажмите «Начать ревизию» — в листе «Месячная ревизия» появятся столбец «Итог» и ваш столбец. ' + all.length + ' позиций.');
  $("mstart").textContent = !open ? "Начать ревизию" : "Начать мой подсчёт";
  $("mstart").hidden = !!mine;
  $("mfinish").hidden = !mine;
  $("mend").hidden = !open;
  $("mnew").hidden = !mine;
  $("mbody").hidden = !open;
  if (!open) return;
  if (full !== false) mlistDraw();
}

/* список с учётом поиска и фильтров */
function mlistDraw(){
  const secs = msections(), mi = mmineIdx();
  const sel = $("msec"), keep = sel.value;
  sel.innerHTML = '<option value="">Все разделы</option>' + secs.filter(s => s.items.length).map(s =>
    '<option value="' + esc(s.n) + '">' + esc(s.n) + ' · ' + s.items.length + '</option>').join("");
  sel.value = secs.some(s => s.n === keep) ? keep : "";

  const words = mnorm($("mq").value).split(" ").filter(Boolean);
  const todo = $("mtodo").checked, only = sel.value;
  const filtering = words.length || todo || only;
  const hist = rjson(MH, {})[mhk()] || {};
  let html = "", found = 0;
  for (const s of secs){
    if (!s.items.length){ if (!filtering) html += '<p class="mgroup">' + esc(s.n) + '</p>'; continue; }
    if (only && s.n !== only) continue;
    const hay = mnorm(s.n);
    const items = s.items.filter(it => (!todo || it.tot == null) &&
      words.every(w => mnorm(it.n).includes(w) || hay.includes(w)));
    if (!items.length) continue;
    found += items.length;
    html += '<section class="msec"><div class="sechead"><h2>' + esc(s.n) + '</h2><em>' +
      (items.length < s.items.length ? items.length + ' из ' + s.items.length : s.items.length) + '</em></div>' +
      '<div class="result tcard"><ul class="rlist">' + items.map(it => mrow(it, hist, mi)).join("") + '</ul></div></section>';
  }
  const q = $("mq").value.trim();
  $("mlist").innerHTML = html || '<p class="empty">Ничего не найдено.' +
    (q && mi >= 0 ? ' <button type="button" class="link" id="mnewq">Добавить «' + esc(q) + '» в ревизию</button>' : ' Проверьте написание или сбросьте фильтры.') + '</p>';
  $("mfound").textContent = filtering ? "Найдено: " + found : "";
}

/* обновить одну строку, не трогая остальные (фокус и ввод не теряются) */
function mpatch(it){
  const li = $("mlist").querySelector('li[data-r="' + it.r + '"]');
  if (!li) return;
  const tmp = document.createElement("ul");
  tmp.innerHTML = mrow(it, rjson(MH, {})[mhk()] || {}, mmineIdx());
  const fresh = tmp.firstChild;
  li.className = fresh.className;
  li.querySelector(".rtop").replaceWith(fresh.querySelector(".rtop"));
  li.querySelector(".rsub").replaceWith(fresh.querySelector(".rsub"));
  const u = li.querySelector("button.undo"), fu = fresh.querySelector("button.undo");
  if (u && fu) u.disabled = fu.disabled;
}

/* ── добавление в свой столбец ── */
function mrevAdd(row, v, undo, e){
  const mine = mmine(), mi = mmineIdx(), it = mitems().find(x => x.r === row);
  if (!it || !mine || !isFinite(v)) return;                 // 0 можно: «посчитано, ноль»
  it.c[mi] = mround((it.c[mi] || 0) + v); it.tot = mround((it.tot || 0) + v); it.pend = true;
  buzz(undo ? 8 : 14);

  const hk = mhk(), all = rjson(MH, {});
  const h = all[hk] = all[hk] || {};
  const k = mkey(it);
  h[k] = h[k] || [];
  undo ? h[k].pop() : h[k].push(e ? {v, e} : v);
  const clr = undo && !h[k].length;                         // отменили всё своё — ячейка снова пустая
  if (clr && it.c[mi] === 0){ it.c[mi] = null; if (!it.c.some(x => x != null)) it.tot = null; }
  for (const key of Object.keys(all)) if (key !== hk) delete all[key];
  rsave(MH, all);

  const q = rjson(MQ, []);
  q.push({id: rid(), cid: mine.id, row, k, sec: it.sec || "", pos: it.n, v, clr: clr ? 1 : 0});
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
      const d = await api({mrev:"add", id:a.id, cid:a.cid, row:String(a.row), sec:a.sec || "", pos:a.pos, v:String(a.v), clr: a.clr ? "1" : "", rn: me ? me.name : ""});
      if (d.error === "net" || d.error === "denied") break;
      const final = !d.ok && /^(closed|position|bad)$|^Это столбец/.test(String(d.error));
      if (!d.ok && !final){                                  // таблица занята или временная ошибка — повторим позже
        $("mwarn").textContent = "Таблица не ответила — добавления отправятся повторно.";
        break;
      }
      rsave(MQ, rjson(MQ, []).filter(x => x.id !== a.id));
      if (!d.ok){
        bad = true;
        mhistDrop(a);
        $("mwarn").textContent = a.pos + ": " + (d.error === "closed" ? "ваш подсчёт уже завершён — добавление не записано." : "не записано (" + d.error + ").");
        continue;
      }
      $("mwarn").textContent = "";
      const b = mblock(), ci = b ? b.cols.findIndex(c => c.id === a.cid) : -1;
      if (d.add && ci >= 0 && d.add.v !== null && d.add.v !== undefined){
        msnap(d.add.row, a.pos, ci, d.add.v === "" ? null : d.add.v, d.add.tot);
        const it = mitems().find(x => x.r === d.add.row && x.n === a.pos) || mitems().find(x => mkey(x) === a.k);
        const left = it ? rjson(MQ, []).filter(x => x.k === mkey(it)) : [];
        if (it && !left.length){ it.c[ci] = d.add.v === "" ? null : d.add.v; if (d.add.tot !== undefined) it.tot = d.add.tot; it.pend = false; mpatch(it); }
      }
    }
    if (MREVS) mrevDraw(false);
  } finally { mbusy = false; }
  if (bad) mrevLoad(true);                                 // не записалось — сверяемся с таблицей
}

/* не записалось окончательно — убрать из истории отмены (иначе «↶» вычтет то, чего нет) */
function mhistDrop(a){
  const all = rjson(MH, {}), h = all[mhk()];
  if (!h || !a.k) return;
  const parts = h[a.k] = h[a.k] || [];
  if (a.v > 0 || (a.v === 0 && !a.clr)){
    for (let i = parts.length - 1; i >= 0; i--) if (hv(parts[i]) === a.v){ parts.splice(i, 1); break; }
  } else parts.push(-a.v);                                   // не прошла отмена — вернуть запись
  rsave(MH, all);
}

/* ── новая позиция: наименование, количество, ед. изм. → вниз ревизии ── */
async function mnewSend(){
  const mine = mmine();
  let name = $("mnn").value.replace(/\s+/g, " ").trim(), unit = $("mnu").value.trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);       // в листе — с большой буквы, как остальные
  const c = $("mnq").value.trim() ? rcalc($("mnq").value) : {v: 0};
  if (!mine){ $("mwarn").textContent = "Сначала нажмите «Начать мой подсчёт»."; return; }
  if (!name){ $("mnn").focus(); return; }
  if (!isFinite(c.v)){ $("mnq").focus(); return; }
  const btn = $("mnadd"); btn.disabled = true; btn.textContent = "Добавляем…";
  const d = await api({mrev:"new", id:rid(), cid:mine.id, pos:name, unit, v:String(c.v), rn: me ? me.name : ""});
  btn.disabled = false; btn.textContent = "Добавить в ревизию";
  if (!d.ok){
    $("mwarn").textContent = d.error === "net" ? "Нет связи — новую позицию добавить не получилось, попробуйте ещё раз." : "Не добавлено: " + (d.error === "closed" ? "ваш подсчёт завершён" : d.error) + ".";
    return;
  }
  buzz(14);
  $("mwarn").textContent = "";
  $("mnn").value = ""; $("mnq").value = ""; $("mnu").value = ""; $("mnprev").textContent = "";
  $("mq").value = name;                                     // сразу показать её в списке
  await mrevLoad(true);
  $("mfound").textContent = "Добавлено вниз ревизии: " + name + (c.v ? " — " + rfmt(c.v) + (unit ? " " + unit : "") : "");
}

/* ── события ── */
/* только при наборе: «change» при уходе из поиска перерисовал бы список под пальцем */
$("mq").addEventListener("input", () => { if (mblock() && mblock().open) mlistDraw(); });
$("msec").addEventListener("change", () => { if (mblock() && mblock().open) mlistDraw(); });
$("mtodo").addEventListener("change", () => { if (mblock() && mblock().open) mlistDraw(); });

$("mlist").addEventListener("submit", e => {
  e.preventDefault();
  const li = e.target.closest("li"), inp = e.target.querySelector("input");
  const c = rcalc(inp.value);
  if (!isFinite(c.v)){ inp.focus(); return; }               // «0» — тоже ответ: позиции нет
  mrevAdd(+li.dataset.r, c.v, false, c.e);
  inp.value = ""; li.querySelector(".rprev").textContent = "";
  inp.focus();
});
$("mlist").addEventListener("click", e => {
  if (e.target.id === "mnewq"){
    $("mnn").value = $("mq").value.trim(); $("mnew").scrollIntoView({behavior: "smooth", block: "center"}); $("mnq").focus();
    return;
  }
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
  const parts = it ? (rjson(MH, {})[mhk()] || {})[mkey(it)] || [] : [];
  if (!it || !parts.length) return;
  const last = parts[parts.length - 1];
  if (confirm("Отменить последнее добавление (" + hl(last) + (it.u ? " " + it.u : "") + ") — " + it.n + "?")) mrevAdd(row, -hv(last) || 0, true);
});
$("mlist").addEventListener("input", e => {
  const inp = e.target.closest(".rin input");
  if (!inp) return;
  const c = rcalc(inp.value), out = inp.closest("form").querySelector(".rprev");
  out.textContent = c.e && isFinite(c.v) ? "= " + rfmt(c.v) : "";
});
$("mnq").addEventListener("input", () => {
  const c = rcalc($("mnq").value);
  $("mnprev").textContent = c.e && isFinite(c.v) ? "= " + rfmt(c.v) : "";
});
$("mnew").addEventListener("submit", e => { e.preventDefault(); mnewSend(); });

$("mstart").addEventListener("click", async () => {
  const b = mblock(), joining = !!(b && b.open);
  if (rjson(MQ, []).length && !joining && !confirm("Есть неотправленные добавления. Начать новую ревизию всё равно?")) return;
  $("minfo").textContent = joining ? "Создаём ваш столбец в таблице…" : "Создаём столбец «Итог» и ваш столбец…";
  const d = await api({mrev: joining ? "mine" : "begin", rn: me ? me.name : ""});
  if (d.ok && d.mrev){
    rsync(d.mrev); MREVS = d.mrev; mcached = false; rsave(MS, MREVS);
    if (!joining){ rsave(MQ, []); $("mq").value = ""; $("mtodo").checked = false; $("msec").value = ""; }
    mrevDraw(true);
  } else $("minfo").textContent = "Не удалось начать: " + (d.error === "net" ? "нет связи" : d.error || "обновите Apps Script") + ".";
});
$("mfinish").addEventListener("click", async () => {
  const mine = mmine();
  if (!mine) return;
  if (rjson(MQ, []).length){ alert("Сначала дождитесь отправки всех добавлений."); return; }
  if (!confirm("Завершить ваш подсчёт (" + mine.date + ")? Добавлять в этот столбец больше будет нельзя. Продолжить потом — «Начать мой подсчёт», это будет новый столбец.")) return;
  const d = await api({mrev:"finish", cid: mine.id, rn: me ? me.name : ""});
  if (d.ok && d.mrev){ MREVS = d.mrev; rsave(MS, MREVS); mrevDraw(true); }
  else $("mwarn").textContent = "Не удалось завершить: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});
$("mend").addEventListener("click", async () => {
  if (rjson(MQ, []).length){ alert("Сначала дождитесь отправки всех добавлений."); return; }
  if (!confirm("Закрыть месячную ревизию для всех? Все столбцы будут завершены, «Итог» зафиксируется. Следующая — «Начать ревизию».")) return;
  const d = await api({mrev:"end"});
  if (d.ok && d.mrev){ MREVS = d.mrev; rsave(MS, MREVS); mrevDraw(true); }
  else $("mwarn").textContent = "Не удалось закрыть: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});
$("mreload").addEventListener("click", () => mrevLoad());
window.addEventListener("online", () => { if (R) mFlush(); });

/* синхронизация раз в 30 секунд, пока открыт раздел: видно, что насчитали другие; не мешаем вводу */
const mtyping = () => [...document.querySelectorAll("#mlist input, #mq, #mnew input")].some(i => i === document.activeElement || (i.id !== "mq" && i.value));
setInterval(() => {
  if (sect !== "rev" || rkind !== "month" || !R || !MREVS || document.hidden || !navigator.onLine || mbusy) return;
  if (rjson(MQ, []).length || mtyping()) return;
  mrevLoad(true);
}, 30000);
