/* Холодильники: журнал температуры, как бумажный — начало и конец смены, ФИО и подпись (кто внёс с сайта и во сколько). */
/* ════════════ Холодильники ════════════
   Только ручной ввод: пустое остаётся пустым. Бармен вносит и поправляет только текущий день — с 14:00 (открытие) до 14:00
   по Астане; в 14:00 он закрывается, и запоздавшее показание не пройдёт даже из очереди. Без связи показание ждёт на телефоне
   и уйдёт само. Прошедший день исправляет только бар-менеджер (вход в «Менеджере»): показание или «не работали» — с причиной,
   в журнале видно, кто, когда и почему. Рабочие дни (чт–сб) присылает таблица: пустое в прошедший рабочий день — «пропуск».
   QR на холодильнике — ссылка #fridge-<id>: после входа в «Бартендерам» сразу открывается этот холодильник.
   Названия, зоны, нормы и схемы — здесь: таблица получает этот список с каждым запросом и по нему строит лист месяца.
   Схема (parts — слева направо): door — дверь, drawers — ящики (n штук, h — доли высоты); справа блок с решёткой и табло,
   unit:"bottom" — решётка снизу во всю ширину, табло слева. Норма: lo/hi (°C), у склада ещё hlo/hhi (влажность, %);
   нет нормы — не подсвечиваем. room — склад, как его бланк: один замер в день (время, температура, влажность), день — тот же,
   с 14:00 до 14:00. frz — морозильник: поле сразу с минусом. До FR_START внести нельзя — карточка говорит, когда начало. */
const FR_ZONES = [["cafe", "Кафе"], ["sklad", "Склад"], ["club", "Клуб"], ["mans", "Мансарда"]];
const FR_FIO = ["Вавилин", "Иванов", "Журавлев", "Фахрутдинов"];
const FR = [
  {id: "caf1", z: "cafe", n: "Холодильник Хайколд Кафе 1", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.1, 1]}]},
  {id: "caf2", z: "cafe", n: "Холодильник Хайколд Кафе 2", parts: [{t: "door"}, {t: "door"}, {t: "drawers", n: 3}]},
  {id: "caf3", z: "cafe", n: "Холодильник Хайколд Кафе 3", parts: [{t: "door"}, {t: "drawers", n: 3}]},
  {id: "sklad", z: "sklad", n: "Склад", room: 1},
  {id: "clb1", z: "club", n: "Холодильник Хайколд Клуб 1", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.5, 1]}, {t: "drawers", n: 2, h: [1.5, 1]}]},
  {id: "clb2", z: "club", n: "Холодильник Хайколд Клуб 2", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.5, 1]}, {t: "drawers", n: 2, h: [1.5, 1]}]},
  {id: "clb3", z: "club", n: "Холодильник Хайколд Клуб 3", parts: [{t: "door"}, {t: "drawers", n: 3}]},
  {id: "clb4", z: "club", n: "Холодильник Хайколд Клуб 4", parts: [{t: "door"}, {t: "door"}, {t: "drawers", n: 3}, {t: "drawers", n: 3}]},
  {id: "clb5", z: "club", n: "Холодильник Хайколд Клуб 5", unit: "bottom", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.2, 1]}, {t: "drawers", n: 2, h: [1.2, 1]}]},
  {id: "man1", z: "mans", n: "Холодильник Хайколд Мансарда 1", unit: "bottom", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.6, 1]}]},
  {id: "man2", z: "mans", n: "Морозильник Хайколд Мансарда 2", frz: 1, unit: "bottom", parts: [{t: "door"}, {t: "door"}, {t: "drawers", n: 2, h: [1.2, 1]}]},
  {id: "man3", z: "mans", n: "Холодильник Хайколд Мансарда 3", unit: "bottom", parts: [{t: "door"}, {t: "drawers", n: 2, h: [1.2, 1]}]}
];
const FR_START = "2026-11-01", FR_FROM = FR_START.slice(0, 7);   // журнал на сайте — с 1 ноября (тот же день — в Code.gs); октябрь и раньше — бумажный архив
const FR_MON = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const FRS = "mechty-fr", FRQ = "mechty-frq", FRZ = "mechty-fr-z", FRF = "mechty-fr-fio";
let frSt = null, frAsk = {}, frZone = "cafe", frId = "", frM = "", frWant = "", frBusy = false, frState = "load", frLost = [], frTimer = 0, frRetry = 0;
try { const z = localStorage.getItem(FRZ); if (FR_ZONES.some(x => x[0] === z)) frZone = z; } catch (e) {}

/* день холодильников: с 14:00 (открытие) до 14:00 по Астане (UTC+5); с 6:00 до 14:00 ещё идёт вчерашний */
const frDayNow = () => new Date(Date.now() + 5 * 3600e3 - 14 * 3600e3).toISOString().slice(0, 10);
const frMorning = () => { const h = new Date(Date.now() + 5 * 3600e3).getUTCHours(); return h >= 6 && h < 14; };
const frWork = day => ((frSt && frSt.work) || []).indexOf(new Date(day + "T12:00:00Z").getUTCDay()) >= 0;
/* пропуск: прошедший рабочий день, холодильник уже вели (есть записи раньше), показания нет и не «не работали» */
const frGap = (id, day, r) => day < frDayNow() && frWork(day) && !!frSt.fst && !!frSt.fst[id] && day >= frSt.fst[id] && !r.off;
const frKs = f => f.room ? ["s"] : ["s", "e"];                                    // у склада один замер
const frSlot = (f, k) => f && f.room ? "замер" : k === "s" ? "начало смены" : "конец смены";
const frEarly = () => frDayNow() < FR_START;
const frCurM = () => frEarly() ? FR_FROM : frDayNow().slice(0, 7);          // месяц журнала, который открыт сейчас
const frStartTx = () => Number(FR_START.slice(8, 10)) + " " + ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"][Number(FR_START.slice(5, 7)) - 1];
const frMgr = () => typeof mgrKey === "function" && !!mgrKey();
const frFmt = n => n == null || n === "" ? "" : (n < 0 ? "−" : "") + String(Math.abs(n)).replace(".", ",");
const frZn = z => (FR_ZONES.find(x => x[0] === z) || [z, z])[1];
const frGet = id => FR.find(f => f.id === id);
const frOut = (v, lo, hi) => v != null && ((lo != null && v < lo) || (hi != null && v > hi));
const frBad = (f, x) => !!x && (frOut(x.t, f.lo, f.hi) || (f.room && frOut(x.h, f.hlo, f.hhi)));
const frSig = n => (n > 0 ? "+" : n < 0 ? "−" : "") + String(Math.abs(n)).replace(".", ",");
const frNormOne = (lo, hi, u) => lo == null && hi == null ? "" : lo != null && hi != null ? frSig(lo) + "…" + frSig(hi) + " " + u
  : (lo != null ? "не ниже " + frSig(lo) : "не выше " + frSig(hi)) + " " + u;
const frNorm = f => [frNormOne(f.lo, f.hi, "°C"), f.room ? frNormOne(f.hlo, f.hhi, "%") : ""].filter(Boolean).join(", ");
const frNul = v => v == null ? null : v;
const frMeta = () => FR.map(f => [f.id, f.n, frZn(f.z), frNul(f.lo), frNul(f.hi), f.room ? 1 : 0, frNul(f.hlo), frNul(f.hhi)]);
/* «4,1» → 4.1, «−18» → −18; не число или вне пределов — null (так же проверяет таблица) */
function frNum(v, lo, hi){
  const s = String(v).trim().replace(",", ".").replace(/^(\d.*)[-−–]$/, "-$1").replace(/^[−–]/, "-");   // «11−» — тоже минус
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Math.round(Number(s) * 10) / 10;
  return n >= lo && n <= hi ? n : null;
}
const frWdDay = day => CK_WD[new Date(day + "T12:00:00Z").getUTCDay()] + ", " + day.slice(8, 10) + "." + day.slice(5, 7);

/* схема: силуэт с дверями, ящиками, решёткой радиатора и табло (на табло — последнее показание) */
function fridgeSvg(f, txt){
  const W = 360, H = 190, top = 14, base = 172, x0 = 10, x1 = W - 10, gap = 4;
  const low = f.unit === "bottom", plinth = low ? 34 : 0;
  const parts = f.parts.concat(low ? [] : [{t: "unit"}]);
  const units = parts.map(p => p.t === "door" ? 1.15 : p.t === "drawers" ? 1 : 0.95), sum = units.reduce((a, b) => a + b, 0);
  const inner = x1 - x0 - 8, y = top + 16, h = base - y - 6 - plinth;
  let x = x0 + 4, s = "";
  const grill = (gx, gy, gw, gh, c) => {
    let g = "";
    for (let r = 0; r * c < gh - 4; r++) for (let q = 0; q * c < gw - 4; q++){
      const cx = gx + q * c, cy = gy + r * c, hor = (r + q) % 2 === 0;
      for (let m = 0; m < 3; m++) g += hor ? '<line x1="' + (cx + 2) + '" y1="' + (cy + 3 + m * 3.5) + '" x2="' + (cx + c - 3) + '" y2="' + (cy + 3 + m * 3.5) + '" class="fs-grill"/>'
                                         : '<line x1="' + (cx + 3 + m * 3.5) + '" y1="' + (cy + 2) + '" x2="' + (cx + 3 + m * 3.5) + '" y2="' + (cy + c - 3) + '" class="fs-grill"/>';
    }
    return g;
  };
  const disp = (dx, dy) => '<rect x="' + dx + '" y="' + dy + '" width="32" height="13" rx="2" class="fs-disp"/><text x="' + (dx + 16) + '" y="' + (dy + 10) + '" class="fs-num">' + esc(txt || "--") + '</text>';
  s += '<rect x="' + (x0 - 4) + '" y="' + top + '" width="' + (x1 - x0 + 8) + '" height="10" rx="2" class="fs-top"/>';
  s += '<rect x="' + x0 + '" y="' + (top + 10) + '" width="' + (x1 - x0) + '" height="' + (base - top - 10) + '" rx="3" class="fs-body"/>';
  parts.forEach((p, i) => {
    const w = (inner - gap * (parts.length - 1)) * units[i] / sum;
    if (p.t === "door"){
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" class="fs-panel"/>';
      s += '<rect x="' + (x + w * .3) + '" y="' + (y + 8) + '" width="' + (w * .4) + '" height="7" rx="2" class="fs-handle"/>';
    } else if (p.t === "drawers"){
      const k = p.h || Array(p.n).fill(1), tot = k.reduce((a, b) => a + b, 0), room = h - gap * (k.length - 1);
      let yy = y;
      k.forEach(v => {
        const dh = room * v / tot;
        s += '<rect x="' + x + '" y="' + yy + '" width="' + w + '" height="' + dh + '" rx="3" class="fs-panel"/>';
        s += '<rect x="' + (x + w * .32) + '" y="' + (yy + 7) + '" width="' + (w * .36) + '" height="6" rx="2" class="fs-handle"/>';
        yy += dh + gap;
      });
    } else {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" class="fs-unit"/>' + disp(x + w - 46, y + 6);
      s += '<rect x="' + (x + w - 12) + '" y="' + (y + 8) + '" width="6" height="8" rx="1.5" class="fs-handle"/>' + grill(x + 8, y + 26, w - 16, h - 34, 14);
    }
    x += w + gap;
  });
  if (low){
    const py = base - 6 - plinth + gap;
    s += '<rect x="' + (x0 + 4) + '" y="' + py + '" width="' + inner + '" height="' + (plinth - gap) + '" rx="3" class="fs-unit"/>' + disp(x0 + 12, py + 5);
    s += grill(x0 + 52, py + 3, inner - 56, plinth - gap - 4, 12);
  }
  s += '<line x1="' + (x0 + 6) + '" y1="' + base + '" x2="' + (x0 + 6) + '" y2="' + (base + 8) + '" class="fs-leg"/><line x1="' + (x1 - 6) + '" y1="' + base + '" x2="' + (x1 - 6) + '" y2="' + (base + 8) + '" class="fs-leg"/>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Схема: ' + esc(f.n) + '">' + s + '</svg>';
}

/* показания дня: ответ таблицы (или копия на телефоне) + неотправленные поверх */
function frRec(id, day){
  const m = frSt && frSt.m[day.slice(0, 7)], b = (m && m[id] && m[id][day]) || {}, v = {s: b.s || null, e: b.e || null};
  for (const q of ckj(FRQ, [])) if (q.id === id && q.d === day)
    v[q.k] = q.t === "" ? null : {t: Number(q.t), h: q.h === "" ? null : Number(q.h), f: q.f, w: q.w, at: ckTime(q.at), pend: 1};
  return v;
}
function frPut(d){
  frEnsure();
  frSt.day = d.day; frSt.m[d.m] = d.r || {};
  if (d.fst) frSt.fst = d.fst;
  if (d.work) frSt.work = d.work;
  const keep = [d.day.slice(0, 7), frCurM(), frM].filter(Boolean);       // на телефоне — текущий месяц и открытый
  Object.keys(frSt.m).forEach(k => { if (keep.indexOf(k) < 0 && k !== d.m) delete frSt.m[k]; });
  cks(FRS, {day: frSt.day, fst: frSt.fst, work: frSt.work, m: {[frCurM()]: frSt.m[frCurM()] || {}}});
}
async function frPost(body){
  try {
    const r = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(Object.assign({token: TOKEN, meta: frMeta()}, body))});
    return await r.json();
  } catch (e) { return {error: "net"}; }
}

/* показания — в таблицу по одному, по порядку; день закрылся, пока ждали связи, — не пройдёт и покажется отдельно */
async function frFlush(){
  if (frBusy || !TOKEN || !me) return;
  frBusy = true;
  try {
    for (;;){
      const q = ckj(FRQ, []);
      if (!q.length) break;
      const a = q[0];
      const d = await frPost({fr: "set", id: a.id, k: a.k, t: a.t, h: a.h, f: a.f, rn: a.w, d: a.d});
      if (d.error === "net" || d.error === "busy" || d.error === "denied"){
        frState = "net";
        if (d.error !== "denied" && !frRetry) frRetry = setTimeout(() => { frRetry = 0; frFlush(); }, 15e3);
        break;
      }
      if (d.error === "action"){ frState = "old"; break; }
      cks(FRQ, ckj(FRQ, []).filter(x => x.n !== a.n));
      if (d.ok){ frPut(d); frState = "ok"; }
      else frLost.push(Object.assign({why: d.error === "closed" || d.error === "early" ? d.error : "bad"}, a));
    }
  } finally { frBusy = false; frDraw(); }
}
async function frLoad(m){
  if (!TOKEN || !me) return;
  if (ckj(FRQ, []).length) await frFlush();
  if (frBusy) return;
  const d = await frPost({fr: "get", m: m || frCurM()});
  if (d.ok){ frPut(d); frState = "ok"; }
  else frState = d.error === "action" ? "old" : "net";
  frDraw();
}
const frEnsure = () => { if (!frSt) frSt = ckj(FRS, null); if (!frSt || !frSt.m) frSt = {day: "", m: {}}; };
function frInit(){
  frEnsure(); frAsk = {};
  if (frWant){ const f = frGet(frWant); frWant = ""; if (f){ frZone = f.z; frId = f.id; frM = ""; } }
  frDraw(); frLoad();
  if (frM && frM !== frCurM()) frLoad(frM);
  if (!frTimer){
    frTimer = setInterval(() => { if (sect === "fr" && R && !document.hidden && !frBusy && !frTyping()) frLoad(); }, 60e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && sect === "fr" && R) frLoad(); });
  }
}
/* QR на холодильнике: #fridge-<id> — вход (если ещё не вошли) и сразу этот холодильник */
function frRoute(id){
  frWant = id; sect = "fr";
  history.replaceState(null, "", location.pathname + location.search + "#bartenders");   // тот же QR ещё раз — снова сработает
  if (R){ showView("bt"); setSect("fr"); return; }
  goBt();
}
const frTyping = () => { const a = document.activeElement; return !!a && a.closest && !!a.closest("#frOne") && a.tagName === "INPUT"; };

/* ФИО: выбранное на этом телефоне, иначе — по фамилии входа */
function frFio(){
  let v = "";
  try { v = localStorage.getItem(FRF) || ""; } catch (e) {}
  if (FR_FIO.indexOf(v) >= 0) return v;
  const n = me ? String(me.name).toLowerCase().replace(/ё/g, "е") : "";
  return FR_FIO.find(x => n.indexOf(x.toLowerCase()) >= 0) || "";
}

function frDraw(){
  if (!$("secFr")) return;
  frEnsure();
  const day = frDayNow(), recs = FR.map(f => frRec(f.id, day)), fr = FR.filter(f => !f.room), room = FR.find(f => f.room);
  const sN = fr.filter(f => recs[FR.indexOf(f)].s).length, eN = fr.filter(f => recs[FR.indexOf(f)].e).length, pend = ckj(FRQ, []).length;
  $("frInfo").innerHTML = frEarly() ? "Журнал на сайте начнётся <b>" + frStartTx() + " в 14:00</b>. До этого — бумажный журнал." +
    (frState === "old" ? " Журнал заработает после обновления Apps Script." : "") : "День — <b>" + frWdDay(day) + "</b>, до 14:00" + (frSt.work && !frWork(day) ? " (не рабочий)" : "") +
    ". Начало смены внесено у <b>" + sN + " из " + fr.length + "</b> холодильников, конец — у <b>" + eN + "</b>" +
    (room ? "; склад — " + (recs[FR.indexOf(room)].s ? "<b>замер внесён</b>" : "замер ещё не внесён") : "") + "." +
    (frMorning() ? " <b>До 14:00 идёт ещё вчерашний день</b> — сюда конец его смены; начало новой — после 14:00." : "") +
    (pend && frState === "net" ? " Нет связи — " + pend + " " + (pend === 1 ? "показание уйдёт" : "показания уйдут") + ", когда появится." :
     pend ? " Отправляем…" : frState === "net" ? " Нет связи — показаны сохранённые данные." :
     frState === "old" ? " Журнал заработает после обновления Apps Script." : "");
  $("frLost").hidden = !frLost.length;
  if (frLost.length) $("frLostT").innerHTML = "<b>Не записалось</b> — " + (frLost.some(x => x.why === "closed") ? "день уже закрыт в 14:00" : frLost.some(x => x.why === "early") ? "журнал ещё не начался" : "таблица не приняла число") + ": " +
    frLost.map(x => { const f = frGet(x.id); return esc(f ? f.n : x.id) + ", " + frSlot(f, x.k) + " " + frWdDay(x.d) + " — " + (x.t === "" ? "стереть" : frFmt(Number(x.t)) + " °C"); }).join("; ") +
    ". Исправить может бар-менеджер — с причиной.";
  $("frZones").innerHTML = FR_ZONES.map(([z, t]) => {
    const list = FR.filter(f => f.z === z), n = list.filter(f => recs[FR.indexOf(f)].s).length;
    return '<button type="button" data-z="' + z + '" aria-pressed="' + (z === frZone) + '">' + t + ' <b>' + n + "/" + list.length + '</b></button>';
  }).join("");
  $("frList").hidden = !!frId; $("frOne").hidden = !frId; $("frTools").hidden = !!frId;
  if (frId) return frDrawOne();
  $("frList").innerHTML = FR.filter(f => f.z === frZone).map(f => {
    const r = recs[FR.indexOf(f)], last = r.e || r.s;
    const cell = (x, k) => '<span class="frv' + (frBad(f, x) ? " bad" : "") + (x && x.pend ? " pend" : "") + '"><small>' + (f.room ? "Замер" + (x && x.at ? " · " + esc(x.at) : "") : k === "s" ? "Начало" : "Конец") + '</small>' +
      (x ? frFmt(x.t) + "°" + (f.room && x.h != null ? " · " + frFmt(x.h) + "%" : "") : "—") + '</span>';
    return '<button type="button" class="frcard' + (f.room ? " room" : "") + '" data-id="' + f.id + '">' +
      (f.room ? "" : '<span class="frth" aria-hidden="true">' + fridgeSvg(f, last ? frFmt(last.t) : "") + '</span>') +
      '<span class="frtx"><b>' + esc(f.n) + '</b><span class="frvs">' + frKs(f).map(k => cell(r[k], k)).join("") + '</span>' +
      (frBad(f, r.s) || frBad(f, r.e) ? '<em class="frbadt">вне нормы</em>' : "") + '</span></button>';
  }).join("");
}

/* карточка холодильника: схема, норма, ввод на сегодня и журнал месяца — как бумажный */
function frDrawOne(){
  const f = frGet(frId), box = $("frOne");
  if (!f){ frId = ""; return frDraw(); }
  const day = frDayNow(), r = frRec(f.id, day), last = r.e || r.s, ks = frKs(f), early = frEarly();
  if (box.dataset.id !== f.id || box.dataset.day !== day || box.dataset.mg !== String(frMgr()) || box.dataset.early !== String(early)){
    box.dataset.id = f.id; box.dataset.day = day; box.dataset.mg = String(frMgr()); box.dataset.early = String(early);
    const fio = frFio();
    const sh = k => {
      const lab = f.room ? "Замер — температура и влажность" : k === "s" ? "Начало смены" : "Конец смены";
      return '<div class="frsh" data-k="' + k + '"><p class="label">' + lab + '</p><div class="frin">' +
        '<button type="button" class="frpm" data-pm="' + k + '" aria-label="Плюс или минус">±</button>' +
        '<input id="frT' + k + '" type="text" inputmode="decimal" maxlength="6" autocomplete="off" enterkeyhint="done" placeholder="—" aria-label="' + lab + ': температура"><span class="fru">°C</span>' +
        (f.room ? '<input id="frH' + k + '" type="text" inputmode="decimal" maxlength="5" autocomplete="off" enterkeyhint="done" placeholder="—" aria-label="' + lab + ': влажность"><span class="fru">%</span>' : "") +
        '</div><button type="button" class="wogo frgo" data-go="' + k + '" id="frGo' + k + '">Внести</button><p class="frwho" id="frW' + k + '" role="status"></p></div>';
    };
    box.innerHTML = '<div class="result tcard frone"><div class="tname"><em>' + esc(frZn(f.z)) + '</em><h3>' + esc(f.n) + '</h3></div>' +
      (f.room ? "" : '<div class="frsvg" id="frSvg"></div>') +
      '<p class="frnorm">' + (frNorm(f) ? "Норма: <b>" + esc(frNorm(f)) + "</b>" : "Норма пока не задана — выход за неё не подсвечивается.") + '</p>' +
      (early ? '<p class="frtoday frearly">Журнал на сайте начнётся <b>' + frStartTx() + ' в 14:00</b>. До этого показания — в бумажном журнале.</p>' :
      '<div class="frday"><p class="frtoday">Сегодня — <b>' + frWdDay(day) + '</b>. ' + (f.room ? "Один замер за день, время запишется само. " : "") + "Вносить и править можно до 14:00." +
        (frMorning() ? ' <b>Сейчас утро — это ещё вчерашний день</b>' + (f.room ? ": замер нового дня — после 14:00." : ": сюда конец его смены, начало новой — после 14:00.") : "") + '</p>' +
        '<label class="label" for="frFio">ФИО</label><select id="frFio"><option value="">— выберите —</option>' +
        FR_FIO.map(x => '<option' + (x === fio ? " selected" : "") + '>' + x + '</option>').join("") + '</select>' +
        ks.map(sh).join("") + '</div>') +
      '<div class="frmh"><button type="button" class="frmb" data-mm="-1" aria-label="Предыдущий месяц">‹</button><b id="frMt"></b>' +
        '<button type="button" class="frmb" data-mm="1" aria-label="Следующий месяц">›</button></div><div id="frTab"></div>' + frFixHtml(f) +
      '<div class="otools"><button type="button" class="link" id="frBack">← ' + (f.room ? "Назад" : "Все холодильники") + '</button><button type="button" class="link" id="frQr">QR-код для наклейки</button></div></div>';
    if (!early) ks.forEach(k => frSetIn(k, r[k]));
  } else if (!early) ks.forEach(k => { if (!frDirty(k)) frSetIn(k, r[k]); });
  if ($("frSvg")) $("frSvg").innerHTML = fridgeSvg(f, last ? frFmt(last.t) : "");
  if (!early) ks.forEach(k => { const x = r[k], w = $("frW" + k);
    if (w.dataset.msg) return;
    w.innerHTML = x ? (x.pend ? '<span class="frpend">ждёт отправки</span> · ' : "") +
      "внесено: <b>" + esc(x.w) + "</b> · " + esc(x.at) + " · ФИО: " + esc(x.f) +
      (frBad(f, x) ? ' · <span class="bad">вне нормы — сообщите менеджеру</span>' : "") : "Не внесено.";
  });
  if (!early) frBtns();
  frTable(f); frFixSync();
}
/* поле показывает внесённое; dataset.v — что было внесено (поле поменяли — не затираем при обновлении) */
function frSetIn(k, x){
  const t = $("frT" + k), h = $("frH" + k);
  t.value = t.dataset.v = x ? frFmt(x.t) : "";
  if (h) h.value = h.dataset.v = x && x.h != null ? frFmt(x.h) : "";
}
const frDirty = k => { const t = $("frT" + k), h = $("frH" + k); return t.value !== t.dataset.v || (!!h && h.value !== h.dataset.v); };
function frBtns(){
  const f = frGet(frId), r = frRec(frId, frDayNow());
  frKs(f).forEach(k => {
    const b = $("frGo" + k), had = !!r[k], empty = !$("frT" + k).value.trim().replace(/^[-−]$/, ""), dirty = frDirty(k);
    b.classList.toggle("del", had && empty && dirty);
    b.classList.toggle("done", had && !dirty);
    b.disabled = !dirty || (!had && empty);
    b.textContent = !dirty ? (had ? "Внесено ✓" : "Внести") : had ? (empty ? "Стереть" : "Исправить") : "Внести";
  });
}
function frTable(f){
  const today = frDayNow(), cur = frCurM(), m = frM || cur, y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7));
  $("frMt").textContent = FR_MON[mo - 1] + " " + y;
  document.querySelectorAll("#frOne .frmb").forEach(b => { b.disabled = b.dataset.mm === "1" ? m >= cur : m <= FR_FROM; });
  if (!frSt.m[m] && !frAsk[m]){ frAsk[m] = 1; frLoad(m); }                       // месяц ещё не загружен — один раз
  if (!frSt.m[m]){ $("frTab").innerHTML = '<p class="oempty">' + (frState === "net" ? "Нет связи — журнал месяца загрузится, когда появится." : "Загружаем журнал…") + '</p>'; return; }
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate(), rows = [];
  const mg = frMgr();
  const cell = (x, gap) => x ? '<td class="v' + (frBad(f, x) ? " bad" : "") + (x.pend ? " pend" : "") + (x.m != null ? " fix" : "") + '">' + frFmt(x.t) +
    (f.room && x.h != null ? '<small>' + frFmt(x.h) + ' %</small>' : "") + '</td>' : gap ? '<td class="v gap">пропуск</td>' : '<td class="v nil">—</td>';
  const sig = x => x.m != null ? "исправил " + x.w + " " + (x.on || "") + " " + (x.at || "") + ": " + x.m : x.w + " " + x.at;
  for (let d = 1; d <= n; d++){
    const key = m + "-" + String(d).padStart(2, "0");
    if (key > today) break;
    const r = key === today ? frRec(f.id, key) : ((frSt.m[m][f.id] || {})[key] || {}), fio = [], sign = [], gap = frGap(f.id, key, r);
    [r.s, r.e].forEach(x => { if (!x) return; if (fio.indexOf(x.f) < 0) fio.push(x.f);
      const g = sig(x); if (sign.indexOf(g) < 0) sign.push(g); });
    const date = '<td class="d">' + frWdDay(key).replace(/^(\S+), (.*)$/, "$2<small>$1</small>") + '</td>';
    const tr = '<tr' + (key === today ? ' class="today"' : r.off && !r.s && !r.e ? ' class="off"' : "") + (mg && key < today ? ' data-day="' + key + '"' : "") + '>';
    if (r.off && !r.s && !r.e){
      rows.push(tr + date + '<td class="v nil">—</td><td class="v nil">—</td><td class="f">не работали<small>' + esc(r.off.why + " · " + r.off.w + " " + (r.off.on || "")) + '</small></td></tr>');
      continue;
    }
    const mid = f.room ? '<td class="v' + (r.s ? "" : " nil") + '">' + (r.s && r.s.m == null ? esc(r.s.at || "") : r.s ? "" : "—") + '</td>' + cell(r.s, gap) : cell(r.s, gap) + cell(r.e, gap);
    rows.push(tr + date + mid +
      '<td class="f">' + (fio.length ? esc(fio.join(" / ")) + '<small>' + esc(sign.join(" · ")) + '</small>' : '<span class="nil">—</span>') + '</td></tr>');
  }
  $("frTab").innerHTML = '<table class="frtab' + (mg ? " mg" : "") + '"><thead><tr><th>Дата</th>' + (f.room ? "<th>Время</th><th>Замер</th>" : "<th>Начало</th><th>Конец</th>") + '<th>ФИО · подпись</th></tr></thead><tbody>' +
    (rows.length ? rows.join("") : '<tr><td colspan="4" class="nil">Записей нет</td></tr>') + '</tbody></table>';
}

/* исправление бар-менеджером: прошедший день — показание (или стереть) либо «не работали»; причина обязательна */
function frFixHtml(f){
  if (frEarly()) return "";
  if (!frMgr()) return '<p class="frfixno">Пропущенный или ошибочный прошлый день исправляет бар-менеджер — с причиной (вход в разделе «Менеджер»).</p>';
  const today = frDayNow(), y = new Date(Date.parse(today + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
  return '<div class="frfix" id="frFix"><p class="label">Исправление бар-менеджера</p>' +
    '<p class="frfixno">Прошлый день: показание или «не работали». Причина обязательна — в журнале будет видно, кто, когда и почему исправил; прежняя запись останется в таблице. Нажмите на день в журнале — он подставится сюда.</p>' +
    '<div class="wo2"><div><label class="label" for="frFxD">День</label><input id="frFxD" type="date" min="' + FR_FROM + '-01" max="' + today + '" value="' + y + '"></div>' +
    '<div><label class="label" for="frFxK">Что</label><select id="frFxK">' + (f.room ? '<option value="s">Замер</option>' : '<option value="s">Начало смены</option><option value="e">Конец смены</option>') + '<option value="off">Не работали</option></select></div></div>' +
    '<div class="frin" id="frFxIn"><button type="button" class="frpm" data-pm="Fx" aria-label="Плюс или минус">±</button>' +
      '<input id="frTFx" type="text" inputmode="decimal" maxlength="6" autocomplete="off" placeholder="—" aria-label="Температура"><span class="fru">°C</span>' +
      (f.room ? '<input id="frHFx" type="text" inputmode="decimal" maxlength="5" autocomplete="off" placeholder="—" aria-label="Влажность"><span class="fru">%</span>' : "") + '</div>' +
    '<select id="frFxF" aria-label="ФИО"><option value="">ФИО — кто снимал показание</option>' + FR_FIO.map(x => '<option>' + x + '</option>').join("") + '</select>' +
    '<input id="frFxW" type="text" maxlength="140" autocomplete="off" placeholder="Причина — обязательно" aria-label="Причина исправления">' +
    '<button type="button" class="wogo" id="frFxGo">Сохранить исправление</button><p class="frwho" id="frFxM" role="status"></p></div>';
}
/* что сейчас записано в выбранный день — подсказка под формой и подпись кнопки */
function frFixSync(){
  if (!$("frFix")) return;
  const f = frGet(frId), d = $("frFxD").value, k = $("frFxK").value, m = d.slice(0, 7), off = k === "off";
  $("frFxIn").hidden = off; $("frFxF").hidden = off;
  const rec = frSt.m[m] ? ((frSt.m[m][f.id] || {})[d] || {}) : null, x = rec && !off ? rec[k] : null;
  $("frFxGo").textContent = off ? (rec && rec.off ? "Снять отметку «не работали»" : "Отметить «не работали»") : "Сохранить исправление";
  if (!$("frFxM").dataset.msg) $("frFxM").textContent = !/^\d{4}-\d{2}-\d{2}$/.test(d) ? "" : !rec ? "Загружаем этот месяц…" :
    off ? (rec.off ? "Отмечено «не работали»: " + rec.off.why : rec.s || rec.e ? "В этот день есть показания — отметка их не сотрёт." : "") :
    x ? "Сейчас записано: " + frFmt(x.t) + " °C" + (x.h != null ? ", " + frFmt(x.h) + " %" : "") + " · " + x.f + ". Пустое поле — стереть." : "Сейчас пусто.";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !frSt.m[m] && !frAsk[m]){ frAsk[m] = 1; frLoad(m); }   // один раз — без связи не зацикливаемся
}
async function frFix(){
  const f = frGet(frId), d = $("frFxD").value, k = $("frFxK").value, why = $("frFxW").value.trim(), msg = $("frFxM"), b = $("frFxGo");
  const say = (t, ok) => { msg.dataset.msg = "1"; msg.innerHTML = ok ? esc(t) : '<span class="bad">' + esc(t) + '</span>'; setTimeout(() => { delete msg.dataset.msg; }, 5000); };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > frDayNow() || d < FR_FROM + "-01") return say("Выберите день — не позже сегодняшнего.");
  if (why.length < 3) { $("frFxW").focus(); return say("Напишите причину исправления."); }
  const body = {fr: "fix", mk: mgrKey(), rn: me ? me.name : "", id: f.id, d, k, why};
  const rec = frSt.m[d.slice(0, 7)] ? ((frSt.m[d.slice(0, 7)][f.id] || {})[d] || {}) : {};
  if (k === "off") body.on = rec.off ? "0" : "1";
  else {
    const tv = $("frTFx").value.trim().replace(/^[-−]$/, ""), hv = f.room ? $("frHFx").value.trim() : "";
    let t = "", h = "";
    if (tv){ const v = frNum(tv, -40, 40); if (v === null) return say("Проверьте температуру — например, 4,1 или −18."); t = String(v); }
    if (hv){ const v = frNum(hv, 0, 100); if (v === null) return say("Проверьте влажность — число от 0 до 100."); h = String(v); }
    if (!t && h) return say("Сначала температура.");
    if (t && !$("frFxF").value) return say("Выберите ФИО — кто снимал показание.");
    if (!t && !rec[k]) return say("Впишите температуру.");
    if (!t && !confirm("Стереть показание за " + frWdDay(d) + "?")) return;
    Object.assign(body, {t, h, f: $("frFxF").value});
  }
  b.disabled = true; delete msg.dataset.msg; msg.textContent = "Сохраняем…";
  const r = await frPost(body);
  b.disabled = false;
  if (r.error === "mgr"){ if (typeof mgrExpired === "function") mgrExpired(); return say("Вход менеджера истёк — войдите в «Менеджере» заново."); }
  if (!r.ok) return say(r.error === "action" ? "Нужна новая версия Apps Script." : r.error === "bad" ? "Таблица не приняла — проверьте поля." : "Не сохранилось — нет связи. Нажмите ещё раз.");
  buzz(14); frPut(r);
  $("frFxW").value = ""; $("frTFx").value = ""; if ($("frHFx")) $("frHFx").value = "";
  say("Исправлено ✓ — " + frWdDay(d) + ".", true);
  frDraw(); frFixSync();
}

function frSave(k){
  const f = frGet(frId), day = frDayNow(), w = $("frW" + k);
  const say = m => { w.dataset.msg = "1"; w.innerHTML = '<span class="bad">' + m + '</span>'; setTimeout(() => { delete w.dataset.msg; }, 4000); };
  const tv = $("frT" + k).value.trim().replace(/^[-−]$/, ""), hv = f.room ? $("frH" + k).value.trim() : "", fio = $("frFio").value;
  let t = "", h = "";
  if (tv){ const v = frNum(tv, -40, 40); if (v === null) return say("Проверьте температуру — например, 4,1 или −18."); t = String(v); }
  if (hv){ const v = frNum(hv, 0, 100); if (v === null) return say("Проверьте влажность — число от 0 до 100."); h = String(v); }
  if (!t && h) return say("Сначала температура.");
  if (t && !fio){ $("frFio").focus(); return say("Выберите ФИО."); }
  if (!t && !frRec(f.id, day)[k]) return;
  if (!t && !confirm("Стереть " + frSlot(f, k) + " у «" + f.n + "»?")) return;
  if (!me) return;
  delete w.dataset.msg;
  /* прежнее неотправленное в ту же клетку — заменяем (кроме того, что уходит прямо сейчас) */
  const q = ckj(FRQ, []).filter((x, i) => (i === 0 && frBusy) || !(x.id === f.id && x.k === k && x.d === day));
  q.push({id: f.id, k, t, h, f: fio, w: me.name, d: day, at: Date.now(), n: Math.random()});
  cks(FRQ, q);
  buzz(14);
  frSetIn(k, t === "" ? null : {t: Number(t), h: h === "" ? null : Number(h)});
  frDraw(); frFlush();
}

/* QR: ссылка на холодильник; наклейка — одна или все на листе A4 */
const frUrl = id => location.origin + location.pathname + "#fridge-" + id;
function frQrDraw(x, f, cx, top, size){
  const q = qrcode(0, "M"); q.addData(frUrl(f.id)); q.make();
  const n = q.getModuleCount(), c = Math.floor(size / (n + 8)), w = c * (n + 8), x0 = Math.round(cx - w / 2) + 4 * c, y0 = Math.round(top) + 4 * c;   // целые пиксели — без полос
  x.fillStyle = "#0E1014";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(x0 + k * c, y0 + r * c, c, c);
  return top + w;
}
function frWrap(x, s, w){
  const lines = []; let cur = "";
  s.split(" ").forEach(wd => { const t = cur ? cur + " " + wd : wd; if (x.measureText(t).width > w && cur){ lines.push(cur); cur = wd; } else cur = t; });
  if (cur) lines.push(cur);
  return lines;
}
function frSticker(x, f, x0, y0, W, H){
  const cx = x0 + W / 2;
  x.fillStyle = "#fff"; x.fillRect(x0, y0, W, H);
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = "#6b6f76"; x.font = "700 " + Math.round(W * .042) + "px Manrope, -apple-system, sans-serif";
  x.fillText(("Бар «Мечты» · " + frZn(f.z)).toUpperCase(), cx, y0 + H * .085);
  x.fillStyle = "#0E1014"; x.font = "800 " + Math.round(W * .062) + "px Manrope, -apple-system, sans-serif";
  const lines = frWrap(x, f.n, W * .86).slice(0, 2);
  lines.forEach((l, i) => x.fillText(l, cx, y0 + H * .16 + i * W * .072));
  const qTop = y0 + H * .16 + lines.length * W * .072 - W * .03, qSize = Math.min(W * .78, H - (qTop - y0) - H * .13);
  const qEnd = frQrDraw(x, f, cx, qTop, qSize);
  x.fillStyle = "#0E1014"; x.font = "700 " + Math.round(W * .046) + "px Manrope, -apple-system, sans-serif";
  x.fillText(f.room ? "Температура и влажность" : "Температура", cx, qEnd + H * .035);
  x.fillStyle = "#6b6f76"; x.font = "500 " + Math.round(W * .038) + "px Manrope, -apple-system, sans-serif";
  x.fillText("в начале и в конце смены — сканируйте", cx, qEnd + H * .085);
}
function frOneCanvas(f){
  const c = document.createElement("canvas"); c.width = 800; c.height = 1000;
  frSticker(c.getContext("2d"), f, 0, 0, 800, 1000);
  return c;
}
/* все 12 наклеек на лист A4 (3 × 4, 200 точек на дюйм), с пунктиром для резки */
function frSheetCanvas(){
  const c = document.createElement("canvas"), W = 1654, H = 2339, m = 70, cols = 3, rows = Math.ceil(FR.length / cols);
  c.width = W; c.height = H;
  const x = c.getContext("2d"), cw = (W - m * 2) / cols, ch = (H - m * 2) / rows;
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  FR.forEach((f, i) => frSticker(x, f, m + (i % cols) * cw + 12, m + Math.floor(i / cols) * ch + 12, cw - 24, ch - 24));
  x.strokeStyle = "#b9bcc2"; x.lineWidth = 2; x.setLineDash([14, 10]);
  for (let i = 0; i <= cols; i++){ x.beginPath(); x.moveTo(m + i * cw, m); x.lineTo(m + i * cw, H - m); x.stroke(); }
  for (let i = 0; i <= rows; i++){ x.beginPath(); x.moveTo(m, m + i * ch); x.lineTo(W - m, m + i * ch); x.stroke(); }
  return c;
}
function frDownload(c, name){
  c.toBlob(b => {
    if (!b) return;
    const a = document.createElement("a"), u = URL.createObjectURL(b);
    a.href = u; a.download = name;                                       // латиницей — кириллицу в имени файла теряют некоторые браузеры
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }, "image/png");
}
function frQrOpen(){
  const f = frGet(frId);
  if (!f || !window.qrcode) return;
  buzz(8);
  const c = frOneCanvas(f);
  c.setAttribute("role", "img"); c.setAttribute("aria-label", "QR-код: " + f.n);
  $("frQrT").textContent = f.n;
  $("frQrImg").replaceChildren(c);
  $("frQrL").textContent = frUrl(f.id);
  $("frQrDlg").showModal();
}

$("frZones").addEventListener("click", e => {
  const b = e.target.closest("button[data-z]");
  if (!b) return;
  buzz(8); frZone = b.dataset.z; frId = ""; frM = "";
  try { localStorage.setItem(FRZ, frZone); } catch (e2) {}
  frDraw();
});
$("frList").addEventListener("click", e => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  buzz(8); frId = b.dataset.id; frM = "";
  frDraw(); window.scrollTo({top: $("secFr").offsetTop - 12});
});
$("frOne").addEventListener("click", e => {
  const go = e.target.closest("button[data-go]"), pm = e.target.closest("button[data-pm]"), mm = e.target.closest("button[data-mm]");
  if (go) return frSave(go.dataset.go);
  if (pm){
    const t = $("frT" + pm.dataset.pm), v = t.value.trim();
    t.value = /^[-−]/.test(v) ? v.replace(/^[-−]\s*/, "") : "−" + v;
    t.focus(); if (pm.dataset.pm !== "Fx") frBtns(); return;
  }
  if (mm){
    const [y, m] = (frM || frCurM()).split("-").map(Number), d = new Date(Date.UTC(y, m - 1 + Number(mm.dataset.mm), 1));
    frM = d.toISOString().slice(0, 7);
    if (frM === frCurM()) frM = "";
    buzz(8); frTable(frGet(frId));
    if (frM && !frSt.m[frM]) frLoad(frM);
    return;
  }
  if (e.target.closest("#frFxGo")) return frFix();
  const tr = e.target.closest("tr[data-day]");
  if (tr && $("frFix")){ buzz(8); $("frFxD").value = tr.dataset.day; delete $("frFxM").dataset.msg; frFixSync(); $("frFix").scrollIntoView({block: "nearest"}); return; }
  if (e.target.closest("#frBack")){ buzz(8); frId = ""; frM = ""; frDraw(); return; }
  if (e.target.closest("#frQr")) frQrOpen();
});
$("frOne").addEventListener("input", e => {
  const t = e.target;
  if (t.tagName !== "INPUT") return;
  if (/^frT(s|e|Fx)$/.test(t.id) && /^\d[\d.,]*[-−]$/.test(t.value)) t.value = "−" + t.value.slice(0, -1);   // курсор встал перед минусом
  if (/^frT[se]$|^frH[se]$/.test(t.id)) frBtns();
});
$("frOne").addEventListener("focusin", e => {
  const t = e.target;                                                     // морозильник: минус сразу в поле
  if (t.id && /^frT[se]$/.test(t.id) && !t.value && (frGet(frId) || {}).frz){
    t.value = "−";
    setTimeout(() => { try { t.setSelectionRange(1, 1); } catch (e2) {} }, 0);   // курсор — после минуса, а не перед ним
  }
});
$("frOne").addEventListener("focusout", e => {
  const t = e.target;
  if (t.id && /^frT[se]$/.test(t.id) && /^[-−]$/.test(t.value.trim())){ t.value = ""; frBtns(); }
});
$("frOne").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName === "INPUT" && /^fr[TH][se]$/.test(e.target.id)){ e.preventDefault(); const k = e.target.id.slice(-1); if (!$("frGo" + k).disabled) frSave(k); }
});
$("frOne").addEventListener("change", e => {
  if (e.target.id === "frFio") try { localStorage.setItem(FRF, e.target.value); } catch (e2) {}
  if (e.target.id === "frFxD" || e.target.id === "frFxK"){ delete $("frFxM").dataset.msg; frFixSync(); }   // выбрали другое — подсказка о нём
});
$("frLostX").addEventListener("click", () => { frLost = []; frDraw(); });
$("frStick").addEventListener("click", () => { if (window.qrcode){ buzz(8); frDownload(frSheetCanvas(), "QR-holodilniki-A4.png"); } });
$("frQrDl").addEventListener("click", () => { const f = frGet(frId); if (f) frDownload(frOneCanvas(f), "QR-fridge-" + f.id + ".png"); });
$("frQrX").addEventListener("click", () => $("frQrDlg").close());
window.addEventListener("online", () => { if (R && ckj(FRQ, []).length) frFlush(); });
