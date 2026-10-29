/* Ревизия: переключатель «Ежедневная / Месячная» и месячная ревизия. */
/* ════════════ Месячная ревизия ════════════
   Весь бар по бланку — лист «Месячная ревизия» в таблице ревизии. Одна ревизия идёт несколько дней:
   первый её столбец — «Итог» (сумма), дальше — столбцы барменов: «Войти в ревизию» → бармен выбирает зоны
   подсчёта (одну или несколько) → его столбец «Куклин · Клуб и VIP» → считаю («Добавить зону» — ещё столбец) →
   «Отправить результаты». Каждая зона считается один раз и одним барменом; поправить посчитанную может только он.
   Ревизия идёт несколько дней, пока не отправлены все зоны, — тогда она готова; поправки — до начала следующей. Числа складывает Apps Script;
   добавления уходят с id, без связи копятся в очереди на устройстве. Поиск — по названию и разделу.
   Позиции, которых нет в бланке, добавляются вниз — в «Новые позиции». */
const MQ = "mechty-mrev-q", MH = "mechty-mrev-hist", MS = "mechty-mrev-state", RK = "mechty-rkind", MA = "mechty-mrev-act";
let MREVS = null, mbusy = false, rkind = "day", mcached = false, mnewTry = null, mpicking = false, mpickNew = false, msel = [], mnote = "";
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
/* мои открытые столбцы (по фамилии того, кто вошёл); числа идут в выбранный («Ваш подсчёт») */
const mmineAll = () => { const b = mblock(); return b && b.open && me ? b.cols.filter(c => c.open && mnorm(c.name) === mnorm(me.name)) : []; };
const mmine = () => { const all = mmineAll(), a = rjson(MA, ""); return all.find(c => c.id === a) || all[0] || null; };
const mmineIdx = () => { const b = mblock(), c = mmine(); return c ? b.cols.indexOf(c) : -1; };
const mhk = () => { const c = mmine(); return c ? c.id : ""; };   // ключ истории отмены — свой столбец (новый день — новая история)
/* зоны столбца: «Клуб и VIP», «Кафе, Клуб и VIP» */
const mzl = zl => zl.length < 2 ? zl.join("") : zl.slice(0, -1).join(", ") + " и " + zl[zl.length - 1];
const mcolName = c => c.name + (c.zones && c.zones.length ? " · " + mzl(c.zones) : "");
const MZONES = ["Кафе", "Склад и проход", "Клуб", "VIP", "Мансарда", "Синий контейнер"];   // если Apps Script старый

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
  b.cols.forEach((c, k) => { if (k !== mi && it.c[k] != null) sub.push((c.zones && c.zones.length ? mcolName(c) : c.name + " " + String(c.date).slice(0, 5)) + ": " + rfmt(it.c[k])); });
  if (it.p != null) sub.push("прошлая: " + mfmt(it.p, it.u));
  return '<li class="rrow' + (it.tot == null ? " mnone" : "") + '" data-r="' + it.r + '">' +
    '<div class="rtop"><span class="rn">' + esc(it.n) + (it.u ? '<small class="mu">, ' + esc(it.u) + '</small>' : '') + '</span>' +
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
  const b = r.block, open = !!(b && b.open), done = open && !!b.done, mine = mmine(), all = mitems(), cnt = all.filter(x => x.tot != null).length;
  const zones = r.zones || MZONES, zst = open && b.zst || {}, meN = me ? mnorm(me.name) : "";
  const mySent = open && zones.some(z => zst[z] && zst[z].st === "sent" && mnorm(zst[z].who) === meN);
  $("mtitle").textContent = b && open ? b.title.replace(/^Ревизия/, "Месячная ревизия") : "Месячная ревизия не начата";
  /* зоны: кто считает, кто посчитал, что осталось */
  const zl = open ? '<ul class="mwho">' + zones.map(z => {
    const x = zst[z];
    return '<li' + (x && mnorm(x.who) === meN ? ' class="me"' : '') + '>' + esc(z) + ' — ' + (!x ? 'свободна'
      : '<b>' + esc(x.who) + '</b> · ' + (x.st === "count" ? '<span class="on">считает</span>' : 'посчитана')) + '</li>';
  }).join("") + '</ul>' : "";
  const left = zones.filter(z => !zst[z] || zst[z].st !== "sent");
  $("minfo").innerHTML = '<span class="rtoday">Сегодня ' + rday(rnow()) + '</span>' + (mnote ? '<b>' + esc(mnote) + '</b> ' : '') + (open
    ? (done ? '<b>Все зоны посчитаны — итог готов.</b> Поправить свою зону можно до начала следующей ревизии. '
        : 'Начата ' + esc(b.date) + '. Ревизия идёт, пока не посчитаны все зоны' + (left.length < zones.length ? ' — осталось: ' + esc(left.join(", ")) : '') + '. ') +
      'Позиций с числами: <b>' + cnt + '</b> из ' + all.length + '.' + zl +
      (mine || done ? '' : '<span class="mhint">Нажмите «Войти в ревизию» и выберите зону, которую будете считать.</span>')
    : (b ? 'Прошлая — «' + esc(b.title) + '», закрыта. ' : (r.prev ? 'Прошлая — «' + esc(r.prev) + '». ' : '')) +
      'Нажмите «Войти в ревизию» и выберите зону — с неё начнётся месячная ревизия. Она идёт несколько дней, пока не посчитаны все зоны. ' + all.length + ' позиций.');
  $("mstart").textContent = done ? "Поправить свою зону" : "Войти в ревизию";
  $("mstart").hidden = !!mine || mpicking || (done && !mySent);
  $("mfresh").hidden = !done || !!mine || mpicking;
  $("mzones").hidden = !mine || mpicking;
  $("mfinish").hidden = $("msendb").hidden = !mine;
  $("mend").hidden = !open || done;
  $("mnew").hidden = !mine;
  $("mpick").hidden = !mpicking;
  $("mbody").hidden = !open || mpicking;
  if (mpicking) mpickDraw();
  if (!open || mpicking) return;
  mmyDraw();
  if (full !== false) mlistDraw();
}

/* «Ваш подсчёт»: свои открытые столбцы — куда идут числа; пустой можно отдать («Не считать») */
function mmyDraw(){
  const all = mmineAll(), act = mmine(), mi = mmineIdx();
  $("mmy").hidden = !all.length;
  if (!all.length) return;
  const empty = mitems().every(it => it.c[mi] == null);
  $("mmy").innerHTML = '<p class="label">Ваш подсчёт — числа идут в выбранный столбец</p><div class="modes zones">' + all.map(c =>
    '<button type="button" data-c="' + esc(c.id) + '" aria-pressed="' + (c === act) + '">' + esc(c.zones ? mzl(c.zones) : c.name) +
    '<small>' + esc(c.date) + '</small></button>').join("") + '</div>' +
    (empty ? '<button type="button" class="link" id="mdrop">Не считать «' + esc(act.zones ? mzl(act.zones) : act.name) + '» — освободить зону</button>' : '');
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
  const keep = mblock().cols.filter(c => me && mnorm(c.name) === mnorm(me.name)).map(c => c.id);   // свои столбцы — на случай поправок
  for (const key of Object.keys(all)) if (!keep.includes(key)) delete all[key];
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
  const lost = [];
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
        lost.push(a.pos + " " + rfmt(a.v) + (d.error === "closed" ? "" : " (" + d.error + ")"));
        $("mwarn").textContent = "Не записано" + (d.error === "closed" ? " — результаты этой зоны уже отправлены или ревизия закрыта" : "") + ": " + lost.join("; ") + ". Впишите заново, если нужно.";
        continue;
      }
      if (!lost.length) $("mwarn").textContent = "";
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
  if (!mine){ $("mwarn").textContent = "Сначала нажмите «Войти в ревизию» и выберите зоны."; return; }
  if (!name){ $("mnn").focus(); return; }
  if (!isFinite(c.v)){ $("mnq").focus(); return; }
  /* один id на одну и ту же форму: повтор после «нет связи» не задвоит количество */
  const sig = [mine.id, name, unit, c.v].join("|");
  if (!mnewTry || mnewTry.sig !== sig) mnewTry = {sig, id: rid()};
  const btn = $("mnadd"); btn.disabled = true; btn.textContent = "Добавляем…";
  const d = await api({mrev:"new", id:mnewTry.id, cid:mine.id, pos:name, unit, v:String(c.v), rn: me ? me.name : ""});
  btn.disabled = false; btn.textContent = "Добавить в ревизию";
  if (!d.ok){
    $("mwarn").textContent = d.error === "net" || d.error === "busy" ? "Таблица не ответила — нажмите «Добавить» ещё раз (повтор не задвоит количество)." : "Не добавлено: " + (d.error === "closed" ? "результаты уже отправлены" : d.error) + ".";
    return;
  }
  mnewTry = null;
  buzz(14);
  $("mwarn").textContent = "";
  $("mnn").value = ""; $("mnq").value = ""; $("mnu").value = ""; $("mnprev").textContent = "";
  $("mq").value = name; $("msec").value = ""; $("mtodo").checked = false;   // сразу показать её в списке, без фильтров
  await mrevLoad();
  $("mfound").textContent = "Добавлено вниз ревизии: " + name + (c.v ? " — " + rfmt(c.v) + (unit ? " " + unit : "") : "");
  const li = d.add && $("mlist").querySelector('li[data-r="' + d.add.row + '"]');
  if (li) li.scrollIntoView({behavior: "smooth", block: "center"});
}

/* ── события ── */
/* только при наборе: «change» при уходе из поиска перерисовал бы список под пальцем */
let mqT = 0;                                                 // поиск — после паузы в наборе: список большой
$("mq").addEventListener("input", () => { clearTimeout(mqT); mqT = setTimeout(() => { if (mblock() && mblock().open) mlistDraw(); }, 150); });
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

/* ── «Какая зона подсчёта?» — перед входом в ревизию и при смене зон ── */
/* выбор зон: чужую (считает или посчитал) и ту, что уже считаю, выбрать нельзя; свою посчитанную — можно (поправить).
   mpickNew — «Начать новую ревизию»: все зоны свободны */
function mpickStat(z){
  const b = mblock(), x = !mpickNew && b && b.open && b.zst ? b.zst[z] : null, mine = x && me && mnorm(x.who) === mnorm(me.name);
  return {off: !!x && (!mine || x.st === "count"),
    note: !x ? "свободна" : !mine ? (x.st === "count" ? "считает " : "посчитал ") + x.who : x.st === "count" ? "уже считаете" : "ваша · поправить"};
}
function mpickDraw(){
  const zones = MREVS.zones || MZONES;
  msel = msel.filter(z => !mpickStat(z).off);
  $("mpz").innerHTML = zones.map(z => {
    const st = mpickStat(z);
    return '<button type="button" data-z="' + esc(z) + '" aria-pressed="' + msel.includes(z) + '"' + (st.off ? ' disabled' : '') + '>' + esc(z) +
      '<small>' + esc(st.note) + '</small></button>';
  }).join("");
  $("mpgo").textContent = (mpickNew ? "Начать новую ревизию" : "Начать подсчёт") + (msel.length ? " · " + mzl(msel) : "");
}
function mpickOpen(fresh){
  mpicking = true; mpickNew = !!fresh; msel = []; mnote = "";
  $("mwarn").textContent = "";
  mrevDraw(false);
  $("mpick").scrollIntoView({behavior: "smooth", block: "start"});
}
$("mstart").addEventListener("click", () => mpickOpen(false));
$("mzones").addEventListener("click", () => mpickOpen(false));
$("mfresh").addEventListener("click", () => {
  if (confirm("Начать новую месячную ревизию? Текущая закроется, её «Итог» зафиксируется. Сначала выберите зону, с которой начнёте.")) mpickOpen(true);
});
$("mpno").addEventListener("click", () => { mpicking = false; mrevDraw(true); });
$("mpz").addEventListener("click", e => {
  const bt = e.target.closest("button");
  if (!bt || bt.disabled) return;
  const z = bt.dataset.z;
  msel = msel.includes(z) ? msel.filter(x => x !== z) : msel.concat(z);
  mpickDraw();
});
$("mpick").addEventListener("submit", async e => {
  e.preventDefault();
  if (!msel.length){ $("mwarn").textContent = "Выберите хотя бы одну зону."; return; }
  const b = mblock(), joining = !!(b && b.open) && !mpickNew;
  const zones = (MREVS.zones || MZONES).filter(z => msel.includes(z));
  if (rjson(MQ, []).length && !joining && !confirm("Есть неотправленные добавления. Начать новую ревизию всё равно?")) return;
  const btn = $("mpgo"); btn.disabled = true;
  $("minfo").textContent = joining ? "Открываем ваш столбец в таблице…" : "Создаём столбец «Итог» и ваш столбец…";
  const d = await api({mrev: joining ? "mine" : "begin", rn: me ? me.name : "", zones: zones.join("|"), fresh: mpickNew ? "1" : ""});
  btn.disabled = false;
  if (d.ok && d.mrev){
    rsync(d.mrev); MREVS = d.mrev; mcached = false; rsave(MS, MREVS);
    if (d.cid) rsave(MA, d.cid);
    mpicking = false;
    if (!joining){ rsave(MQ, []); $("mq").value = ""; $("mtodo").checked = false; $("msec").value = ""; }
    mpickNew = false;
    mrevDraw(true);
  } else {
    $("mwarn").textContent = "Не удалось: " + (d.error === "net" ? "нет связи" : d.error || "обновите Apps Script") + ".";
    mrevLoad(true);                                        // зону могли занять — обновить выбор
  }
});
$("mmy").addEventListener("click", async e => {
  const bt = e.target.closest("button");
  if (!bt) return;
  if (bt.id === "mdrop"){
    const c = mmine();
    if (!c || !confirm("Не считать «" + (c.zones ? mzl(c.zones) : c.name) + "»? Пустой столбец уберётся, зона освободится.")) return;
    const d = await api({mrev:"drop", cid: c.id, rn: me ? me.name : ""});
    if (d.ok && d.mrev){ MREVS = d.mrev; rsave(MS, MREVS); mrevDraw(true); }
    else $("mwarn").textContent = "Не удалось: " + (d.error === "net" ? "нет связи" : d.error) + ".";
    return;
  }
  if (!bt.dataset.c) return;
  rsave(MA, bt.dataset.c);
  mrevDraw(true);
});
/* «Отправить результаты» — все свои открытые столбцы посчитаны */
async function msend(){
  const mine = mmineAll();
  if (!mine.length) return;
  if (rjson(MQ, []).length) await mFlush();
  if (rjson(MQ, []).length){ alert("Есть неотправленные добавления — нет связи с таблицей. Попробуйте ещё раз, когда связь появится."); return; }
  const what = mine.map(c => c.zones ? mzl(c.zones) : c.name).join(", ");
  if (!confirm("Отправить результаты: " + what + "? Зоны отметятся посчитанными. Поправить потом — «Войти в ревизию» и выбрать свою зону.")) return;
  const d = await api({mrev:"send", rn: me ? me.name : ""});
  if (d.ok && d.mrev){
    MREVS = d.mrev; rsave(MS, MREVS); mnote = "Отправлено: " + what + ".";
    mrevDraw(true); $("mtitle").scrollIntoView({behavior: "smooth", block: "start"});
  } else $("mwarn").textContent = "Не удалось отправить: " + (d.error === "net" ? "нет связи" : d.error) + ".";
}
$("mfinish").addEventListener("click", msend);
$("msendb").addEventListener("click", msend);
$("mend").addEventListener("click", async () => {
  if (rjson(MQ, []).length) await mFlush();
  if (rjson(MQ, []).length){ alert("Есть неотправленные добавления — нет связи с таблицей. Попробуйте ещё раз, когда связь появится."); return; }
  const others = (mblock().cols || []).filter(c => c.open && c !== mmine()).map(mcolName);
  if (!confirm("Закрыть месячную ревизию для всех, даже если не все зоны посчитаны? Все столбцы будут завершены, «Итог» зафиксируется." +
    (others.length ? "\n\nЕщё считают: " + others.join(", ") + " — их неотправленные числа не запишутся." : "") + "\n\nСледующая — «Войти в ревизию».")) return;
  const d = await api({mrev:"end"});
  if (d.ok && d.mrev){ MREVS = d.mrev; rsave(MS, MREVS); mrevDraw(true); }
  else $("mwarn").textContent = "Не удалось закрыть: " + (d.error === "net" ? "нет связи" : d.error) + ".";
});
$("mreload").addEventListener("click", () => mrevLoad());
window.addEventListener("online", () => { if (R) mFlush(); });

/* синхронизация раз в 30 секунд, пока открыт раздел: видно, что насчитали другие; не мешаем вводу */
const mtyping = () => [...document.querySelectorAll("#mlist input, #mq, #mnew input")].some(i => i === document.activeElement || (i.id !== "mq" && i.value));
setInterval(() => {
  if (sect !== "rev" || rkind !== "month" || !R || !MREVS || document.hidden || mbusy) return;
  if (rjson(MQ, []).length){ mFlush(); return; }          // связь вернулась без события «online» — отправляем сами
  if (!navigator.onLine || mtyping()) return;
  mrevLoad(true);
}, 30000);
