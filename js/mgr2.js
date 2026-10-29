/* Бар-менеджер: сводки чеклиста, холодильников и ревизий; бланки ревизий и технологичка (правка менеджером).
   Общие помощники — из js/mgr.js (mgrKey, mgrRange, mgrPl, api, pubPost…). */

/* период сводки: быстрые кнопки и свои даты — как у списаний */
const SUM_Q = [["w", "7 дней"], ["m", "Этот месяц"], ["pm", "Прошлый месяц"], ["d30", "30 дней"]];
const sumR = mgrj("mechty-mgr-sum", {ck: "w", fr: "w"});
const sumHead = (key, title, from, to) => '<div class="result tcard wo"><div class="tname"><em>' + mgrRu(from) + " — " + mgrRu(to) + '</em><h2 class="h3">' + title + '</h2></div><div class="wobody">' +
  '<div class="wo2 mgrd"><div><label class="label" for="' + key + 'F">С</label><input id="' + key + 'F" type="date" value="' + from + '" data-sum="' + key + '"></div>' +
  '<div><label class="label" for="' + key + 'T">По</label><input id="' + key + 'T" type="date" value="' + to + '" data-sum="' + key + '"></div></div>' +
  '<div class="quick">' + SUM_Q.map(([k, t]) => '<button type="button" data-sumr="' + key + ":" + k + '" aria-pressed="' + (sumR[key] === k) + '">' + t + '</button>').join("") + '</div>' +
  '<p class="warn" id="' + key + 'Warn" role="status"></p></div></div>';
const sumDates = key => { const r = sumR[key]; return typeof r === "string" ? mgrRange(r) : [r.from, r.to]; };
const sumCard = (title, em, head, body, foot) => '<div class="result tcard mgrt"><div class="tname"><em>' + em + '</em><h3>' + title + '</h3></div>' +
  '<table><thead><tr>' + head.map(h => '<th>' + h + '</th>').join("") + '</tr></thead><tbody>' + body + '</tbody></table>' + (foot || "") + '</div>';
const sumWd = iso => ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(iso + "T00:00:00Z").getUTCDay()];
const sumDay = iso => sumWd(iso) + " " + mgrRu(iso).slice(0, 5);
const sumErr = (d, retry) => d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
  : 'Нет связи с таблицей. <button type="button" class="link" data-retry="' + retry + '">Повторить</button>';
const SUM_LOAD = {ck: () => ckSumLoad(), fr: () => frSumLoad()};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-sumr]");
  if (b){ const [k, r] = b.dataset.sumr.split(":"); sumR[k] = r; mgrs("mechty-mgr-sum", sumR); buzz(8); return SUM_LOAD[k](); }
  const rt = e.target.closest("[data-retry]");
  if (rt && SUM_LOAD[rt.dataset.retry]) SUM_LOAD[rt.dataset.retry]();
  else if (rt && rt.dataset.retry === "rv") rvSumLoad();
});
document.addEventListener("change", e => {
  const k = e.target.dataset && e.target.dataset.sum;
  if (!k) return;
  const f = $(k + "F").value, t = $(k + "T").value;
  if (!f || !t || f > t){ $(k + "Warn").textContent = "Проверьте даты: «с» не позже «по»."; return; }
  sumR[k] = {from: f, to: t}; mgrs("mechty-mgr-sum", sumR); SUM_LOAD[k]();
});

/* ── сводка чеклиста: дни из «Открытий смен», отметки из «Чеклист журнал»; что пропустили — по пунктам этого сайта ── */
let ckSum = null;
async function ckSumLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  const [from, to] = sumDates("ck");
  $("mgrCk").innerHTML = sumHead("ck", "Чеклист открытия", from, to) + '<ul class="olist mgrskel">' + skel(5) + '</ul>';
  const d = await api({mgr: "cksum", mk, from, to});
  if (d.error === "mgr") return mgrExpired();
  if (mgrGrp !== "ck") return;
  if (!d.ok){ $("ckWarn").innerHTML = sumErr(d, "ck"); $("mgrCk").querySelector(".mgrskel").remove(); return; }
  ckSum = d; ckSumDraw();
}
function ckSumDraw(){
  const d = ckSum, items = CK.flatMap(g => g.items.map(x => ({g: g.t, id: x[0], t: x[1], days: x[2] || null})));
  const norm = s => String(s).toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const by = {};                                                          // день → пункт → кто отметил (последнее действие)
  d.log.forEach(([iso, hm, who, tx, on]) => { const m = by[iso] || (by[iso] = {}); m[norm(tx)] = on ? who || "?" : null; });
  const isoSet = new Set(d.days.map(x => x.iso).concat(Object.keys(by)));
  const days = [...isoSet].sort().map(iso => {
    const x = d.days.find(y => y.iso === iso) || {iso, ready: "", by: "", who: ""}, wd = new Date(iso + "T00:00:00Z").getUTCDay(), m = by[iso] || {};
    const want = items.filter(it => !it.days || it.days.includes(wd));
    return Object.assign({}, x, {want: want.length, miss: want.filter(it => !m[norm(it.t)])});
  });
  const missCnt = {}, who = {};
  days.forEach(x => x.miss.forEach(it => { missCnt[it.t] = (missCnt[it.t] || 0) + 1; }));
  d.log.forEach(([, , w, , on]) => { if (on && w) (who[w] = who[w] || {m: 0, r: 0}).m++; });
  days.forEach(x => { if (x.ready && x.by) (who[x.by] = who[x.by] || {m: 0, r: 0}).r++; });
  const ready = days.filter(x => x.ready), tm = ready.map(x => x.ready).filter(t => /^\d{1,2}:\d{2}$/.test(t)).sort();
  const med = tm.length ? tm[tm.length >> 1] : "", missAll = days.reduce((a, x) => a + x.miss.length, 0);
  const top = Object.entries(missCnt).sort((a, b) => b[1] - a[1]);
  const [from, to] = [d.from, d.to];
  let html = sumHead("ck", "Чеклист открытия", from, to);
  if (!days.length){ $("mgrCk").innerHTML = html + '<p class="empty">За эти дни чеклист не открывали.</p>'; return; }
  html += '<p class="mgrsum"><b>' + mgrPl(days.length, "смена", "смены", "смен") + '</b> · «Бар готов» — в ' + ready.length + (med ? ' · обычно к ' + med : "") +
    ' · пропущено пунктов: <b' + (missAll ? ' class="salshort"' : "") + '>' + missAll + '</b></p>';
  html += '<div class="result tcard mgrt"><div class="tname"><em>новые сверху</em><h3>По дням</h3></div><ul class="olist usel">' + days.slice().reverse().map(x =>
    '<li class="' + (x.miss.length ? "perneg" : "per0") + '"><div class="userow"><span class="usen"><span class="refn">' + esc(sumDay(x.iso)) + '</span><small class="mgrwhy">' +
      esc((x.ready ? "бар готов " + x.ready + (x.by ? " · " + x.by : "") : "«Бар готов» не нажали") + (x.who ? " · отмечали: " + x.who : "")) + '</small>' +
      (x.miss.length ? '<details class="ckmiss"><summary>Не отмечено: ' + x.miss.length + '</summary><p class="wnhint">' + x.miss.map(it => esc(it.t)).join("; ") + '</p></details>' : "") +
    '</span><span class="usev"><b>' + (x.want - x.miss.length) + ' из ' + x.want + '</b></span></div></li>').join("") + '</ul></div>';
  if (top.length) html += sumCard("Чаще всего пропускали", "по пунктам", ["Пункт", "Раз"],
    top.slice(0, 15).map(([t, n]) => '<tr><td class="n">' + esc(t) + '</td><td class="v">' + n + '</td></tr>').join(""));
  const W = Object.entries(who).sort((a, b) => b[1].m - a[1].m);
  if (W.length) html += sumCard("Кто отмечал", "отметки и «Бар готов»", ["Кто", "Отметок", "Бар готов"],
    W.map(([w, x]) => '<tr><td class="n">' + esc(w) + '</td><td class="v">' + x.m + '</td><td class="v">' + x.r + '</td></tr>').join(""));
  $("mgrCk").innerHTML = html;
}

/* ── сводка холодильников: показания за даты (лист записей), выход за норму и пропуски — по списку холодильников сайта ── */
async function frSumLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  const [from, to] = sumDates("fr");
  $("mgrFrs").innerHTML = sumHead("fr", "Холодильники", from, to) + '<ul class="olist mgrskel">' + skel(5) + '</ul>';
  if (to < FR_START){
    $("mgrFrs").innerHTML = sumHead("fr", "Холодильники", from, to) + '<p class="empty">Журнал на сайте ведётся с ' + mgrRu(FR_START) + ' — раньше бумажный.</p>';
    return;
  }
  const months = [];
  for (let m = (from < FR_START ? FR_START : from).slice(0, 7); m <= to.slice(0, 7); m = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1)).toISOString().slice(0, 7)) months.push(m);
  const res = await Promise.all(months.map(m => frPost({fr: "get", m})));
  if (mgrGrp !== "fr") return;
  const bad = res.find(x => !x.ok);
  if (bad){ $("frWarn").innerHTML = sumErr(bad, "fr"); const sk = $("mgrFrs").querySelector(".mgrskel"); if (sk) sk.remove(); return; }
  frSumDraw(from, to, res);
}
function frSumDraw(from, to, res){
  const R = {}, fst = {}, work = res[0].work || [4, 5, 6], today = res[0].day;
  res.forEach(x => { Object.entries(x.r || {}).forEach(([id, days]) => { R[id] = Object.assign(R[id] || {}, days); }); Object.assign(fst, x.fst || {}); });
  const isoList = [];
  for (let t = Date.parse((from < FR_START ? FR_START : from) + "T00:00:00Z"); t <= Date.parse(to + "T00:00:00Z"); t += 864e5) isoList.push(new Date(t).toISOString().slice(0, 10));
  const out = [], gaps = [], per = [];
  FR.forEach(f => {
    let n = 0, b = 0, g = 0, lo = null, hi = null;
    isoList.forEach(iso => {
      const r = (R[f.id] || {})[iso] || {};
      frKs(f).forEach(k => {
        const x = r[k];
        if (x && x.t != null && x.t !== ""){
          n++; lo = lo == null ? x.t : Math.min(lo, x.t); hi = hi == null ? x.t : Math.max(hi, x.t);
          if (frBad(f, x)){ b++; out.push({iso, f, k, x}); }
        } else if (iso < today && work.indexOf(new Date(iso + "T12:00:00Z").getUTCDay()) >= 0 && fst[f.id] && iso >= fst[f.id] && !r.off){ g++; gaps.push({iso, f, k}); }
      });
    });
    per.push({f, n, b, g, lo, hi});
  });
  const tot = k => per.reduce((a, x) => a + x[k], 0);
  let html = sumHead("fr", "Холодильники", from, to) +
    '<p class="mgrsum"><b>' + mgrPl(tot("n"), "показание", "показания", "показаний") + '</b> · вне нормы: <b' + (tot("b") ? ' class="salshort"' : "") + '>' + tot("b") + '</b>' +
      ' · пропусков: <b' + (tot("g") ? ' class="salshort"' : "") + '>' + tot("g") + '</b> · рабочие дни — ' + work.map(w => ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][w]).join(", ") + '</p>';
  if (out.length) html += sumCard("Вне нормы", "новые сверху", ["Когда", "Холодильник", "Показание"],
    out.sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 60).map(o => '<tr><td class="n">' + esc(sumDay(o.iso)) + '<small class="mgrwhy">' + esc(frSlot(o.f, o.k) + (o.x.f ? " · " + o.x.f : "")) + '</small></td>' +
      '<td class="n">' + esc(o.f.n) + '<small class="mgrwhy">норма ' + esc(frNorm(o.f)) + '</small></td><td class="v salshort">' + esc(frFmt(o.x.t)) + '°' + (o.f.room && o.x.h != null ? " · " + esc(frFmt(o.x.h)) + "%" : "") + '</td></tr>').join(""));
  if (gaps.length) html += sumCard("Пропуски", "рабочий день, показания нет", ["Когда", "Холодильник"],
    gaps.sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 60).map(o => '<tr><td class="n">' + esc(sumDay(o.iso)) + '<small class="mgrwhy">' + esc(frSlot(o.f, o.k)) + '</small></td><td class="n">' + esc(o.f.n) + '</td></tr>').join(""));
  html += sumCard("По холодильникам", "за эти дни", ["Холодильник", "Показ.", "Мин…макс", "Вне нормы"],
    per.map(x => '<tr><td class="n">' + esc(x.f.n) + '<small class="mgrwhy">' + esc(frZn(x.f.z) + (frNorm(x.f) ? " · норма " + frNorm(x.f) : "")) + '</small></td><td class="v">' + x.n + '</td>' +
      '<td class="v">' + (x.lo == null ? "—" : esc(frFmt(x.lo) + "…" + frFmt(x.hi))) + '</td><td class="v' + (x.b ? " salshort" : "") + '">' + (x.b || "") + (x.g ? '<small class="mgrwhy">пропусков ' + x.g + '</small>' : "") + '</td></tr>').join(""));
  if (!tot("n") && !gaps.length) html += '<p class="empty">За эти дни показаний нет.</p>';
  $("mgrFrs").innerHTML = html;
}

/* ── сводка ревизий: дни ежедневной и месячные; месячная против продаж ── */
let rvSum = null, rvM = null;
async function rvSumLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  if (!rvSum) $("mgrRvs").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  const d = await api({mgr: "rvsum", mk});
  if (d.error === "mgr") return mgrExpired();
  if (mgrGrp !== "rv") return;
  if (!d.ok){ $("mgrRvs").innerHTML = '<p class="warn">' + sumErr(d, "rv") + '</p>'; return; }
  rvSum = d; rvSumDraw();
}
function rvSumDraw(){
  const d = rvSum, D = d.daily.slice().reverse(), M = d.monthly.slice().reverse(), nz = d.zones.length;
  let html = '<details class="mgrhelp"><summary>Как это работает</summary><p class="wnhint">Ежедневная — день с 9:00 до 9:00: зоны, кто считал. «Не все зоны» — пересчёт части бара: ' +
    'в «Расходе» его можно выбрать днём начала или конца, прочерки вписать вручную. Месячная — весь бар по бланку; её можно сверить с продажами между двумя ' +
    'месячными. Бланки (какие позиции считать) — во вкладке «Бланки».</p></details>';
  html += '<p class="mgrsum">Ежедневных: <b>' + D.length + '</b>' + (d.open ? ' · идёт сейчас: ' + esc(d.open) : "") + ' · месячных: <b>' + M.length + '</b>' + (d.mopen ? ' · идёт: ' + esc(d.mopen.title) : "") + '</p>';
  html += '<div class="result tcard mgrt"><div class="tname"><em>новые сверху</em><h3>Ежедневные</h3></div>' + (D.length ? '<ul class="olist usel">' + D.slice(0, 40).map((x, i) =>
    '<li class="' + (x.full ? "per0" : "perpos") + '"><div class="userow"><span class="usen"><span class="refn">' + esc(x.wd + " " + x.d.slice(0, 5)) + '</span><small class="mgrwhy">' +
      esc((x.who || "—") + (x.z ? " · " + x.z.split(",").map(z => z.trim()).join(", ") : "")) + '</small></span><span class="usev"><b>' + (x.man ? "вручную" : x.full ? "все зоны" : (x.nz || 0) + " из " + nz) + '</b>' +
      (i + 1 < D.length ? '<small><button type="button" class="link" data-rvd="' + esc(D[i + 1].d) + "|" + esc(x.d) + '">расход →</button></small>' : "") + '</span></div></li>').join("") + '</ul>' : '<p class="empty">Ежедневных ревизий пока нет.</p>') + '</div>';
  html += '<div class="result tcard mgrt"><div class="tname"><em>посчитанные целиком</em><h3>Месячные</h3></div>' + (M.length ? '<ul class="olist usel">' + M.map((x, i) =>
    '<li><div class="userow"><span class="usen"><span class="refn">' + esc(x.d) + '</span><small class="mgrwhy">' + esc((x.who || "") + (x.sheet ? " · лист «" + x.sheet + "»" : "")) + '</small></span>' +
      (i + 1 < M.length ? '<span class="usev"><small><button type="button" class="link" data-rvm="' + (M.length - 1 - i) + '">против продаж →</button></small></span>' : "") + '</div></li>').join("") + '</ul>' : '<p class="empty">Месячных, посчитанных целиком, пока нет.</p>') + '</div>';
  html += '<div id="rvMonth"></div>';
  $("mgrRvs").innerHTML = html;
  if (rvM) rvMonthDraw();
}
$("mgrRvs").addEventListener("click", async e => {
  const b = e.target.closest("button[data-rvd],button[data-rvm]");
  if (!b) return;
  if (b.dataset.rvd){ const [a, z] = b.dataset.rvd.split("|"); perSel = {a, b: z}; perDays = null; perData = null; buzz(8); return mgrGo("use"); }
  b.disabled = true; $("rvMonth").innerHTML = '<p class="wnhint">Считаем месячную против продаж…</p>';
  const d = await api({mgr: "period", mk: mgrKey(), kind: "m", i: b.dataset.rvm});
  b.disabled = false;
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){ $("rvMonth").innerHTML = '<p class="warn">' + sumErr(d, "rv") + '</p>'; return; }
  rvM = d; rvMonthDraw();
  $("rvMonth").scrollIntoView({block: "start", behavior: "smooth"});
});
function rvMonthDraw(){
  const d = rvM, n = x => mgrNum(r2(x)), rows = d.rows.filter(r => !r.info && !r.miss && !r.loose && Math.abs(r.diff) > 1e-9);
  if (!d.from){ $("rvMonth").innerHTML = '<p class="empty">Нужны две месячные, посчитанные целиком.</p>'; return; }
  $("rvMonth").innerHTML = '<div class="result tcard mgrt"><div class="tname"><em>' + perLab(d.from, d.to) + '</em><h3>Месячная против продаж</h3></div>' +
    '<p class="mgrsum salsum">Недостача <b class="salshort">' + perMoney(d.short) + ' ₽</b> · излишек <b>' + perMoney(d.over) + ' ₽</b></p>' +
    (rows.length ? '<ul class="olist usel">' + rows.map(r => '<li class="' + (r.diff < 0 ? "perneg" : "perpos") + '"><div class="userow"><span class="usen"><span class="refn">' + esc(r.n) + '</span>' +
      '<small class="mgrwhy">было ' + n(r.was) + (r.inc ? " + приход " + n(r.inc) : "") + (r.wo ? " − списано " + n(r.wo) : "") + (r.pr ? " − проработки " + n(r.pr) : "") + " − стало " + n(r.now) +
      " = ушло " + n(r.use) + " · по продажам " + n(r.sold) + '</small></span><span class="usev"><b>' + (r.diff < 0 ? "−" : "+") + n(Math.abs(r.diff)) + " " + useU(r.u) + '</b>' +
      (r.money ? '<small>' + (r.money < 0 ? "−" : "+") + perMoney(r.money) + ' ₽</small>' : "") + '</span></div></li>').join("") + '</ul>' : '<p class="empty">Всё сходится.</p>') +
    (((d.sales || {}).miss || []).length ? '<p class="wnhint">Нет продаж за ' + d.sales.miss.length + ' раб. дн. — загрузите во вкладке «Расход».</p>' : "") + '</div>';
}

/* ── бланки ревизий: ежедневная (лист «Итог») и месячная (лист «Месячная ревизия») — правит менеджер ──
   Убрать — строка уходит вниз, в «Не считаем»: прошлые числа остаются в таблице, в бланке и расчётах позиции нет; вернуть — обратно. */
let bl = null, blKind = mgrj("mechty-mgr-bl", "d") === "m" ? "m" : "d", blOpen = "", blBusy = false;
const BL_U = ["литр", "кг", "г", "шт"];
async function blLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  if (!bl) $("mgrBl").innerHTML = '<ul class="olist mgrskel">' + skel(8) + '</ul>';
  const [d] = await Promise.all([api({mgr: "blank", mk}), refRows ? null : api({mgr: "ref", mk}).then(x => { if (x.ok) refRows = x.rows; })]);
  if (d.error === "mgr") return mgrExpired();
  if (mgrGrp !== "bl") return;
  if (!d.ok){ $("mgrBl").innerHTML = '<p class="warn">' + sumErr(d, "bl") + '</p>'; return; }
  bl = d; blDraw();
}
SUM_LOAD.bl = () => blLoad();
const blBtn = (op, x, t, lab) => '<button type="button" class="link" data-blo="' + op + '" data-r="' + x.r + '" data-n="' + esc(x.n) + '"' + (lab ? ' aria-label="' + esc(lab) + '"' : "") + '>' + t + '</button>';
function blDraw(){
  const d = bl, m = blKind === "m", open = m ? d.mopen : d.dopen;
  let html = '<details class="mgrhelp"><summary>Как это работает</summary><p class="wnhint">Здесь — какие позиции бармены считают. Ежедневная — лист «Итог», месячная — лист «' + esc(d.sheet || "Месячная ревизия") + '». ' +
    '«Убрать» — позиция уходит в «Не считаем»: в бланке и расчётах её нет, прошлые числа остаются в таблице, вернуть можно в любой момент. ' +
    'Переименование и перенос в другой раздел месячной переносят за собой справочник, приход, рецепты и расход на блюдо. Изменения сразу видны барменам — даже во время ревизии.</p></details>' +
    '<div class="mgrseg" role="group" aria-label="Какой бланк"><button type="button" data-blk="d" aria-pressed="' + !m + '">Ежедневная</button><button type="button" data-blk="m" aria-pressed="' + m + '">Месячная</button></div>' +
    (open ? '<p class="wnhint blnow">Сейчас идёт ' + (m ? "месячная" : "ежедневная") + ' ревизия — правки сразу видны тем, кто считает.</p>' : "") + '<p class="warn" id="blMsg" role="status"></p>';
  if (!m){
    const act = d.daily.filter(x => !x.off), off = d.daily.filter(x => x.off);
    html += '<div class="result tcard mgrt"><div class="tname"><em>' + mgrPl(act.length, "позиция", "позиции", "позиций") + '</em><h3>Ежедневная ревизия</h3></div><ul class="olist bll">' +
      act.map((x, i) => blLine(x, i, act.length)).join("") + '</ul>' + blAddForm("d") + '</div>';
    if (off.length) html += '<details class="incmapd"><summary>Не считаем (' + off.length + ')</summary><ul class="olist bll">' +
      off.map(x => '<li><span class="refn">' + esc(x.n) + '</span><span class="blbtns">' + blBtn("on", x, "Вернуть") + '</span></li>').join("") + '</ul></details>';
  } else {
    const secs = [], off = [];
    d.monthly.forEach(x => { if (x.off){ if (x.t === "i") off.push(x); return; } if (x.t !== "i") secs.push({h: x, items: []}); else if (secs.length) secs[secs.length - 1].items.push(x); });
    html += secs.map(s => '<div class="result tcard mgrt blsec"><div class="tname"><em>' + mgrPl(s.items.length, "позиция", "позиции", "позиций") + '</em><h3>' + esc(s.h.n) + '</h3></div>' +
      '<ul class="olist bll">' + s.items.map((x, i) => blLine(x, i, s.items.length, secs)).join("") + '</ul>' + blAddForm("m", s.h.n) + '</div>').join("") +
      '<div class="result tcard wo"><div class="wobody"><form class="bladd" data-k="sec" autocomplete="off" novalidate><label class="label" for="blSecN">Новый раздел</label>' +
      '<div class="bladdrow"><input type="text" id="blSecN" maxlength="60" placeholder="Например: Настойки"><button type="submit" class="wogo">Добавить раздел</button></div></form></div></div>';
    if (off.length) html += '<details class="incmapd"><summary>Не считаем (' + off.length + ')</summary><ul class="olist bll">' +
      off.map(x => '<li><span class="refn">' + esc(x.n) + (x.u ? ' <small>' + esc(x.u) + '</small>' : "") + '</span><span class="blbtns"><select class="blsel" aria-label="Раздел для ' + esc(x.n) + '">' +
        secs.map(s => '<option>' + esc(s.h.n) + '</option>').join("") + '</select>' + blBtn("on", x, "Вернуть") + '</span></li>').join("") + '</ul></details>';
  }
  $("mgrBl").innerHTML = html;
  $("mgrBl").querySelectorAll("datalist").length || refRows && $("mgrBl").insertAdjacentHTML("beforeend", '<datalist id="blRefs">' +
    [...new Set(refRows.filter(r => +r[9] === 1).map(r => r[1]))].map(n => '<option value="' + esc(n) + '">').join("") + '</datalist>');
}
function blLine(x, i, n, secs){
  const key = blKind + x.r, m = blKind === "m";
  if (blOpen === key) return '<li class="open"><form class="bled" data-r="' + x.r + '" data-n="' + esc(x.n) + '" autocomplete="off" novalidate>' +
    '<label class="label" for="blEdN">Название</label><input type="text" id="blEdN" maxlength="80" value="' + esc(x.n) + '">' +
    (m ? '<div class="wo2 mgrd"><div><label class="label" for="blEdU">Ед. изм.</label><select id="blEdU">' + BL_U.concat(BL_U.includes(x.u) || !x.u ? [] : [x.u]).map(u => '<option' + (u === (x.u || "литр") ? " selected" : "") + '>' + esc(u) + '</option>').join("") + '</select></div>' +
      '<div><label class="label" for="blEdS">Раздел</label><select id="blEdS">' + secs.map(s => '<option' + (s.h.n === x.sec ? " selected" : "") + '>' + esc(s.h.n) + '</option>').join("") + '</select></div></div>' : "") +
    '<p class="wnhint">' + (m ? "Справочник, приход, рецепты и расход на блюдо переходят на новое название и раздел." : "Название — как в месячном бланке и справочнике: по нему считается расход.") + '</p>' +
    '<div class="refbtns"><button type="submit" class="wogo">Сохранить</button><button type="button" class="link" data-blx="1">Отмена</button></div></form></li>';
  return '<li><span class="refn">' + esc(x.n) + (m && x.u ? ' <small>' + esc(x.u) + '</small>' : "") + '</span><span class="blbtns">' +
    (i > 0 ? blBtn("up", x, "↑", "Выше: " + x.n) : '<span class="blsp"></span>') + (i < n - 1 ? blBtn("down", x, "↓", "Ниже: " + x.n) : '<span class="blsp"></span>') +
    '<button type="button" class="link" data-ble="' + key + '">Изменить</button>' + blBtn("off", x, "Убрать") + '</span></li>';
}
const blAddForm = (k, sec) => '<form class="bladd" data-k="' + k + '"' + (sec ? ' data-sec="' + esc(sec) + '"' : "") + ' autocomplete="off" novalidate><div class="bladdrow">' +
  '<input type="text" class="bladdn" maxlength="80" placeholder="Новая позиция' + (k === "d" ? " — как в месячном бланке" : "") + '"' + (k === "d" ? ' list="blRefs"' : "") + ' aria-label="Новая позиция">' +
  (k === "m" ? '<select class="bladdu" aria-label="Единица">' + BL_U.map(u => '<option>' + u + '</option>').join("") + '</select>' : "") +
  '<button type="submit" class="wogo">Добавить</button></div></form>';
async function blPost(body){
  if (blBusy) return null;
  blBusy = true;
  const d = await pubPost(Object.assign({mgr: "blankset", kind: blKind}, body));
  blBusy = false;
  if (!d) return null;
  if (!d.ok){
    $("blMsg").textContent = d.error === "moved" ? "Бланк изменился, пока вы правили, — показан свежий." : d.error === "dup" ? "Такая позиция уже есть." :
      d.error === "nosheet" ? "Листа месячной ревизии ещё нет — он появится с первой месячной ревизией." : d.error === "action" ? "Нужна новая версия Apps Script." : pubErr(d);
    if (d.error === "moved") blLoad();
    return null;
  }
  bl = d; buzz(14); refRows = null; perData = null; perDays = null;
  return d;
}
$("mgrBl").addEventListener("click", async e => {
  const k = e.target.closest("[data-blk]");
  if (k){ blKind = k.dataset.blk; blOpen = ""; mgrs("mechty-mgr-bl", blKind); buzz(8); return blDraw(); }
  const ed = e.target.closest("[data-ble]");
  if (ed){ blOpen = blOpen === ed.dataset.ble ? "" : ed.dataset.ble; return blDraw(); }
  if (e.target.closest("[data-blx]")){ blOpen = ""; return blDraw(); }
  const b = e.target.closest("[data-blo]");
  if (!b) return;
  const body = {op: b.dataset.blo, r: +b.dataset.r, n: b.dataset.n};
  if (body.op === "on" && blKind === "m"){ const sel = b.parentElement.querySelector(".blsel"); body.sec = sel ? sel.value : ""; }
  if (body.op === "off" && !confirm("Убрать «" + body.n + "» из бланка? Прошлые числа останутся в таблице, вернуть можно в «Не считаем».")) return;
  if (await blPost(body)) blDraw();
});
$("mgrBl").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  if (f.classList.contains("bladd")){
    if (f.dataset.k === "sec"){ const n = $("blSecN").value.trim(); if (!n) return; if (await blPost({op: "secadd", to: n, kind: "m"})) blDraw(); return; }
    const n = f.querySelector(".bladdn").value.trim();
    if (!n){ f.querySelector(".bladdn").focus(); return; }
    if (await blPost({op: "add", to: n, sec: f.dataset.sec || "", u: f.querySelector(".bladdu") ? f.querySelector(".bladdu").value : ""})) blDraw();
    return;
  }
  if (!f.classList.contains("bled")) return;
  const r = +f.dataset.r, n = f.dataset.n, to = $("blEdN").value.trim(), m = blKind === "m";
  const x = m ? bl.monthly.find(y => y.r === r) : bl.daily.find(y => y.r === r);
  if (!to){ $("blEdN").focus(); return; }
  let cur = {r, n};
  if (to !== n){ const d = await blPost({op: "ren", r, n, to}); if (!d) return; cur = {r, n: to}; }
  if (m && x){
    const u = $("blEdU") ? $("blEdU").value : x.u, s = $("blEdS") ? $("blEdS").value : x.sec;
    const find = () => bl.monthly.find(y => y.t === "i" && !y.off && y.n === cur.n && y.sec === (x.sec));
    if (u !== (x.u || "литр")){ const y = find(); if (y && !(await blPost({op: "unit", r: y.r, n: y.n, u}))) return; }
    if (s !== x.sec){ const y = find(); if (y && !(await blPost({op: "move", r: y.r, n: y.n, sec: s}))) return; }
  }
  blOpen = ""; blDraw();
  $("blMsg").textContent = "Сохранено ✓";
});

/* ── технологичка: правки менеджера (лист «Техкарты») поверх техкарт шифровки ──
   TK0 — техкарты из шифровки как есть; правка заменяет поля карты (название, состав, украшение, посуда, метод, выход, фото),
   остальное (связь с калькулятором и т. п.) остаётся. Скрытая — у барменов её нет, у менеджера — с пометкой. */
let TK0 = null, tkOv = null, tkEd = null, tkQ = "", tkHid = false, tkBusy = false, tkPhoto = null;
const TK_F = ["n", "i", "dec", "gar", "glass", "m", "out", "img"], TK_U = ["мл", "г", "шт", "дэш", "капли", "л", "кг"];
async function tkSync(fresh){
  if (fresh || !TK0) TK0 = JSON.parse(JSON.stringify(K));
  if (!TOKEN) return;
  const d = await api({tk: "list"});
  if (!d || !d.ok) return;                                                // старый Apps Script или нет связи — как в шифровке
  tkOv = d; tkApply();
}
function tkMerged(){
  const G = JSON.parse(JSON.stringify(TK0 || [])), at = {};
  G.forEach(g => g.items.forEach(it => { at[it.id] = g; }));
  const grp = name => G.find(g => g.g === name) || (G.push({g: name, items: []}), G[G.length - 1]);
  ((tkOv && tkOv.cards) || []).forEach(c => {
    const g0 = at[c.id], i0 = g0 ? g0.items.findIndex(x => x.id === c.id) : -1;
    if (c.card){
      const base = i0 >= 0 ? g0.items[i0] : {id: c.id}, it = Object.assign({}, base);
      TK_F.forEach(k => { delete it[k]; });
      Object.assign(it, c.card, {id: c.id, _ov: 1, _new: i0 < 0 ? 1 : 0});
      if (i0 >= 0 && (!c.g || c.g === g0.g)) g0.items[i0] = it;
      else { if (i0 >= 0) g0.items.splice(i0, 1); const g = grp(c.g || "Новые"); g.items.push(it); at[c.id] = g; }
    }
    const g = at[c.id];
    if (c.hid && g){ const it = g.items.find(x => x.id === c.id); if (it) it._hid = 1; }
  });
  return G.filter(g => g.items.length);
}
function tkApply(){
  const M = tkMerged();
  K = M.map(g => ({g: g.g, items: g.items.filter(it => !it._hid)})).filter(g => g.items.length);
  KALL = K.flatMap(g => g.items);
  fillTtk();
  if (mgrGrp === "tk" && !$("mgrTk").hidden) tkDraw();
}
async function tkLoad(){
  if (!mgrKey()) return mgrInit();
  if (!tkOv) $("mgrTk").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  await tkSync();
  if (!tkOv){ $("mgrTk").innerHTML = '<p class="warn">Нужна новая версия Apps Script или нет связи. <button type="button" class="link" data-tkr="1">Повторить</button></p>'; return; }
  tkDraw();
}
function tkDraw(){
  if (tkEd) return tkFormDraw();
  const M = tkMerged(), q = tkQ.trim().toLowerCase().replace(/ё/g, "е");
  const hit = it => !q || (it.n + " " + (it.i || []).map(x => x[0]).join(" ")).toLowerCase().replace(/ё/g, "е").includes(q);
  const nh = M.reduce((a, g) => a + g.items.filter(x => x._hid).length, 0);
  let html = '<details class="mgrhelp"><summary>Как это работает</summary><p class="wnhint">Технологичка барменов: добавляйте коктейли, меняйте состав, граммовки, посуду, украшение, метод и фото. ' +
    'Изменения сохраняются в таблице (лист «Техкарты») и видны барменам сразу после входа. «Скрыть» — убрать старую техкарту у барменов, вернуть можно в любой момент; ' +
    '«Вернуть как было» — снова исходная. По составу техкарт сайт предлагает и расход на блюдо в «Рецептах».</p></details>' +
    '<div class="tkbar"><input id="tkQ" class="tq" type="search" placeholder="Поиск по названию или ингредиенту" autocomplete="off" value="' + esc(tkQ) + '" aria-label="Поиск по техкартам">' +
    '<button type="button" class="wogo" data-tkn="1">+ Новая техкарта</button></div>' +
    (nh ? '<p class="wnhint"><button type="button" class="link" data-tkh="1">' + (tkHid ? "Не показывать скрытые" : "Показать скрытые (" + nh + ")") + '</button></p>' : "") +
    '<p class="warn" id="tkMsg" role="status"></p>';
  M.forEach(g => {
    const items = g.items.filter(it => hit(it) && (tkHid || !it._hid));
    if (!items.length) return;
    html += '<section class="refsec"><h3 class="reft">' + esc(g.g) + '</h3><ul class="olist refl tkl">' + items.map(it =>
      '<li class="refli' + (it._hid ? " pubhid" : "") + '"><button type="button" class="refrow tkrow" data-tke="' + esc(it.id) + '">' +
        (it.img ? '<img class="tkth" src="' + esc(it.img) + '" alt="" loading="lazy">' : '<span class="tkth"></span>') +
        '<span><span class="refn">' + esc(it.n) + '</span><small>' + esc([mgrPl((it.i || []).length, "ингредиент", "ингредиента", "ингредиентов"), it.glass || "",
          it._new ? "новая" : it._ov ? "изменена" : "", it._hid ? "скрыта" : ""].filter(Boolean).join(" · ")) + '</small></span></button></li>').join("") + '</ul></section>';
  });
  $("mgrTk").innerHTML = html;
}
const tkRowHtml = (k, x) => '<li class="tkir"><input type="text" class="tkin" data-k="' + k + '" value="' + esc(x[0] || "") + '" maxlength="80" list="tkIngs" placeholder="Ингредиент" aria-label="Ингредиент">' +
  '<input type="text" class="tkiq" value="' + esc(x[1] == null ? "" : String(x[1]).replace(".", ",")) + '" maxlength="12" inputmode="decimal" placeholder="0" aria-label="Количество">' +
  '<select class="tkiu" aria-label="Единица">' + TK_U.concat(x[2] && !TK_U.includes(x[2]) ? [x[2]] : []).map(u => '<option' + (u === (x[2] || "мл") ? " selected" : "") + '>' + esc(u) + '</option>').join("") + '</select>' +
  '<button type="button" class="link tkdel" data-tkdel="1" aria-label="Убрать строку">×</button></li>';
function tkFormDraw(){
  const e = tkEd, it = e.it, M = tkMerged(), groups = M.map(g => g.g), ings = [...new Set(M.flatMap(g => g.items.flatMap(x => (x.i || []).concat(x.dec || []).map(y => y[0]))))].sort((a, b) => a.localeCompare(b, "ru"));
  const img = tkPhoto ? tkPhoto.data : it.img || "";
  $("mgrTk").innerHTML = '<p class="mgrback"><button type="button" class="link" data-tkx="1">← Все техкарты</button></p>' +
    '<form class="result tcard wo tkf" id="tkForm" autocomplete="off" novalidate><div class="tname"><em>' + (e.id ? (it._new ? "новая" : it._ov ? "изменена" : "из шифровки") : "новая") + '</em><h2 class="h3">' + esc(it.n || "Новая техкарта") + '</h2></div><div class="wobody">' +
    '<div class="wo2 mgrd"><div><label class="label" for="tkG">Группа</label><input type="text" id="tkG" list="tkGroups" maxlength="60" value="' + esc(e.g || "") + '" placeholder="Коктейли"></div>' +
      '<div><label class="label" for="tkN">Название</label><input type="text" id="tkN" maxlength="80" value="' + esc(it.n || "") + '"></div></div>' +
    '<div class="wo2 mgrd"><div><label class="label" for="tkGl">Посуда</label><input type="text" id="tkGl" maxlength="200" value="' + esc(it.glass || "") + '" placeholder="Хайбол 350 мл"></div>' +
      '<div><label class="label" for="tkGa">Украшение</label><input type="text" id="tkGa" maxlength="200" value="' + esc(it.gar || "") + '" placeholder="Долька лайма"></div></div>' +
    '<p class="label">Состав</p><ul class="olist tkis" id="tkI">' + (it.i || []).map(x => tkRowHtml("i", x)).join("") + '</ul><button type="button" class="link" data-tkadd="i">+ ингредиент</button>' +
    '<p class="label">Украшение — по граммам (если нужно)</p><ul class="olist tkis" id="tkD">' + (it.dec || []).map(x => tkRowHtml("dec", x)).join("") + '</ul><button type="button" class="link" data-tkadd="dec">+ в украшение</button>' +
    '<div class="wo2 mgrd"><div><label class="label" for="tkOq">Выход замеса (для заготовок)</label><input type="text" id="tkOq" inputmode="decimal" maxlength="10" value="' + esc(it.out ? String(it.out[0]).replace(".", ",") : "") + '" placeholder="пусто — порция"></div>' +
      '<div><label class="label" for="tkOu">Ед. выхода</label><select id="tkOu">' + ["мл", "г", "л", "кг", "шт"].map(u => '<option' + (it.out && it.out[1] === u ? " selected" : "") + '>' + u + '</option>').join("") + '</select></div></div>' +
    '<label class="label" for="tkM">Метод</label><textarea id="tkM" rows="4" maxlength="3000" placeholder="Шейк со льдом, двойное процеживание…">' + esc(it.m || "") + '</textarea>' +
    '<p class="label">Фото</p><div class="tkph">' + (img ? '<img src="' + esc(img) + '" alt="Фото: ' + esc(it.n || "") + '">' : '<span class="wnhint">Фото нет</span>') + '</div>' +
    '<div class="refbtns"><label class="link tkfile">Загрузить фото<input type="file" id="tkFile" accept="image/*"></label>' + (img ? '<button type="button" class="link" data-tkpx="1">Убрать фото</button>' : "") + '</div>' +
    '<p class="warn" id="tkMsg" role="status"></p>' +
    '<div class="refbtns"><button type="submit" class="wogo" id="tkSave">Сохранить</button><button type="button" class="link" data-tkx="1">Отмена</button></div>' +
    (e.id ? '<div class="refbtns tkdanger"><button type="button" class="link" data-tkop="' + (it._hid ? "show" : "hide") + '">' + (it._hid ? "Вернуть барменам" : "Скрыть у барменов") + '</button>' +
      (it._ov ? '<button type="button" class="link red" data-tkop="reset">' + (it._new ? "Удалить техкарту" : "Вернуть как было") + '</button>' : "") + '</div>' : "") +
    '</div></form><datalist id="tkGroups">' + groups.map(g => '<option value="' + esc(g) + '">').join("") + '</datalist><datalist id="tkIngs">' + ings.map(n => '<option value="' + esc(n) + '">').join("") + '</datalist>';
}
function tkFormCard(){
  const rows = id => [...document.querySelectorAll("#" + id + " .tkir")].map(li => [li.querySelector(".tkin").value.trim(), li.querySelector(".tkiq").value.trim().replace(",", "."), li.querySelector(".tkiu").value]).filter(x => x[0]);
  const card = {n: $("tkN").value.trim(), i: rows("tkI"), dec: rows("tkD"), glass: $("tkGl").value.trim(), gar: $("tkGa").value.trim(), m: $("tkM").value.trim(),
    img: tkPhoto ? "" : tkEd.it.img || ""};
  const oq = $("tkOq").value.trim().replace(",", ".");
  if (oq) card.out = [+oq, $("tkOu").value];
  return card;
}
/* фото — до 1000 пикселей по длинной стороне, JPEG */
function tkShrink(file){
  return new Promise((ok, no) => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL("image/jpeg", 0.85)); };
      im.onerror = () => no(new Error("img")); im.src = fr.result; };
    fr.onerror = () => no(new Error("read")); fr.readAsDataURL(file);
  });
}
async function tkPost(body){
  if (tkBusy) return null;
  tkBusy = true;
  const d = await pubPost(Object.assign({who: me ? me.name : ""}, body));
  tkBusy = false;
  if (!d) return null;
  if (!d.ok){ $("tkMsg").textContent = d.error === "share" ? "Диск не разрешает доступ по ссылке — фото не сохранилось (настройки домена Google)." : d.error === "size" ? "Фото слишком большое." :
    d.error === "bad" ? "Проверьте название, группу и состав." : pubErr(d); return null; }
  return d;
}
$("mgrTk").addEventListener("input", e => { if (e.target.id === "tkQ"){ tkQ = e.target.value; clearTimeout(tkDraw.t); tkDraw.t = setTimeout(() => { tkDraw(); const q = $("tkQ"); if (q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 200); } });
$("mgrTk").addEventListener("change", async e => {
  if (e.target.id !== "tkFile" || !e.target.files[0]) return;
  try { tkPhoto = {data: await tkShrink(e.target.files[0])}; } catch (err) { $("tkMsg").textContent = "Не удалось прочитать фото — выберите JPEG или PNG."; return; }
  const keep = tkFormCard(); Object.assign(tkEd.it, keep, {img: tkEd.it.img}); tkEd.g = $("tkG").value.trim();
  tkFormDraw();
});
$("mgrTk").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.tkr) return tkLoad();
  if (b.dataset.tkh){ tkHid = !tkHid; return tkDraw(); }
  if (b.dataset.tkn){ tkEd = {id: "", g: "", it: {n: "", i: [["", "", "мл"]]}}; tkPhoto = null; buzz(8); return tkDraw(); }
  if (b.dataset.tke){
    const M = tkMerged(), g = M.find(x => x.items.some(y => y.id === b.dataset.tke)), it = g.items.find(y => y.id === b.dataset.tke);
    tkEd = {id: it.id, g: g.g, it: JSON.parse(JSON.stringify(it))}; tkPhoto = null; buzz(8); tkDraw(); window.scrollTo({top: $("mgrTk").getBoundingClientRect().top + scrollY - 80}); return;
  }
  if (b.dataset.tkx){ tkEd = null; tkPhoto = null; return tkDraw(); }
  if (b.dataset.tkadd){ $(b.dataset.tkadd === "i" ? "tkI" : "tkD").insertAdjacentHTML("beforeend", tkRowHtml(b.dataset.tkadd, ["", "", b.dataset.tkadd === "i" ? "мл" : "г"])); return; }
  if (b.dataset.tkdel){ b.closest("li").remove(); return; }
  if (b.dataset.tkpx){ const keep = tkFormCard(); Object.assign(tkEd.it, keep, {img: ""}); tkEd.g = $("tkG").value.trim(); tkPhoto = null; return tkFormDraw(); }
  if (b.dataset.tkop){
    if (b.dataset.tkop === "reset" && !confirm(tkEd.it._new ? "Удалить эту техкарту?" : "Вернуть техкарту как было? Правки пропадут.")) return;
    const d = await tkPost({mgr: "tkset", op: b.dataset.tkop, id: tkEd.id});
    if (!d) return;
    tkOv = d; tkEd = null; buzz(14); tkApply(); tkDraw();
    $("tkMsg").textContent = b.dataset.tkop === "hide" ? "Скрыта у барменов." : b.dataset.tkop === "show" ? "Снова видна барменам." : "Готово.";
  }
});
$("mgrTk").addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id !== "tkForm") return;
  const card = tkFormCard(), g = $("tkG").value.trim();
  if (!g || !card.n){ $("tkMsg").textContent = "Укажите группу и название."; (g ? $("tkN") : $("tkG")).focus(); return; }
  if (!card.i.length){ $("tkMsg").textContent = "Добавьте хотя бы один ингредиент."; return; }
  if (card.i.concat(card.dec).some(x => x[1] !== "" && !/^\d+(\.\d+)?$/.test(x[1]))){ $("tkMsg").textContent = "Количество — числом, например 40 или 0,5."; return; }
  $("tkSave").disabled = true; $("tkMsg").textContent = "Сохраняем…";
  if (tkPhoto){
    const ph = await tkPost({mgr: "tkphoto", id: tkEd.id || "new", type: "image/jpeg", data: tkPhoto.data});
    if (!ph){ $("tkSave").disabled = false; return; }
    card.img = ph.url;
  }
  const d = await tkPost({mgr: "tkset", op: "set", id: tkEd.id, g, card});
  if (!d){ $("tkSave").disabled = false; return; }
  tkOv = d; tkEd = null; tkPhoto = null; buzz(14); tkApply(); tkDraw();
  $("tkMsg").textContent = "Сохранено ✓ Бармены увидят после обновления страницы.";
});
