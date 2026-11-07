/* График барменов и барбеков: недели строго пн–вс, текущий и следующий месяц. Смотрят все; «Внести правки» — внизу
   каждой недели, правится одна неделя за раз; менять может любой бармен, прошедшие недели — только просмотр. Смены — в лист «График» (Apps Script): правки уходят пачкой, без связи ждут
   на телефоне. Часы за неделю — по всей неделе, часовка за месяц — только по дням этого месяца, по имени. */
const GR_NAMES = ["Вячеслав", "Александр", "Кирилл", "Артем Кувайцев", "Даниил", "Денис", "Артем Тарасов"];
/* прежние имена в таблице → как показывать (в прошедших неделях имя не меняется в таблице, только на экране и в часовке) */
const GR_ALIAS = {"артем": "Артем Кувайцев"};
/* новые люди: в текущей и следующих неделях — пустая строка с именем (появится в таблице, когда поставят смену) */
const GR_NEW = ["Артем Тарасов"];
const GR_WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"], GR_WDF = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const GR_MON = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const GR_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
/* обычный конец смены по дню недели (0 — пн … 6 — вс) — подставляется, но его можно поменять: чт — утро до 20:00, вечер
   до 02:00; пт и сб — утро до 20:00, вечер до 06:00; вс — и утро, и вечер до 02:00. Пн–ср — начало и конец вручную */
const GR_END = {3: ["20:00", "02:00"], 4: ["20:00", "06:00"], 5: ["20:00", "06:00"], 6: ["02:00", "02:00"]};
const GR_MORN = "13:00", GR_EVE = ["18:00", "20:00"];
const GR_S = "mechty-gr", GR_Q = "mechty-gr-q";
let grSt = null, grMonth = 0, grEdit = "", grOpen = null, grBusy = false, grState = "load", grTimer = 0, grSoon = 0;

const grP = v => { const m = /^(?:(утро|вечер) )?(\d\d:\d\d)–(\d\d:\d\d)$/.exec(v || ""); return m ? {k: m[1] || "", a: m[2], b: m[3]} : null; };
const grMin = t => /^\d\d:\d\d$/.test(t || "") ? +t.slice(0, 2) * 60 + +t.slice(3) : NaN;
const grLen = (a, b) => { let d = grMin(b) - grMin(a); if (d <= 0) d += 1440; return d / 60; };
const grH = v => { const s = grP(v); return s ? grLen(s.a, s.b) : 0; };
const grNum = h => String(Math.round(h * 10) / 10).replace(".", ",");
const grT = t => t.endsWith(":00") ? t.slice(0, 2) : t;                      // 13:00 → 13, 13:30 — как есть
const grCls = v => { const s = grP(v); return !s ? "" : s.k === "утро" ? "gr-m" : s.k === "вечер" ? "gr-e" : "gr-x"; };
const grKey = n => String(n || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
const grIso = t => new Date(t).toISOString().slice(0, 10);
const grDay = (w, d) => new Date(Date.parse(w + "T00:00:00Z") + d * 864e5);

/* месяц (по времени Астаны): 0 — текущий, 1 — следующий; недели — все пн–вс, где есть хоть один его день */
function grMonthOf(k){
  const n = new Date(Date.now() + 5 * 3600e3), y = n.getUTCFullYear(), m = n.getUTCMonth() + k;
  return {y: y + Math.floor(m / 12), m: (m % 12 + 12) % 12};
}
function grWeeks(k){
  const {y, m} = grMonthOf(k), first = Date.UTC(y, m, 1), last = Date.UTC(y, m + 1, 0), out = [];
  for (let t = first - ((new Date(first).getUTCDay() + 6) % 7) * 864e5; t <= last; t += 7 * 864e5) out.push(grIso(t));
  return out;
}
const grToday = () => grIso(Date.now() + 5 * 3600e3);
/* прошедшие недели не меняются — только текущая (пн–вс по Астане) и следующие */
const grMonNow = () => { const t = Date.parse(grToday() + "T00:00:00Z"); return grIso(t - ((new Date(t).getUTCDay() + 6) % 7) * 864e5); };
const grPast = w => w < grMonNow();
const grInMonth = (w, d, k) => { const x = grDay(w, d), {y, m} = grMonthOf(k); return x.getUTCFullYear() === y && x.getUTCMonth() === m; };

/* неделя = ответ таблицы (или копия на телефоне) + неотправленные правки поверх; новой недели в таблице нет —
   имена по умолчанию */
function grRows(w){
  const base = grSt && grSt.weeks && grSt.weeks[w];
  const rows = base ? base.rows.map(r => ({n: r.n, d: r.d.slice()})) : GR_NAMES.map(n => ({n, d: ["", "", "", "", "", "", ""]}));
  for (const c of ckj(GR_Q, [])){
    if (c.w !== w) continue;
    while (rows.length <= c.r) rows.push({n: "", d: ["", "", "", "", "", "", ""]});
    if (c.n != null) rows[c.r].n = c.n;
    if (c.d != null) rows[c.r].d[c.d] = c.v;
  }
  rows.forEach(r => { const a = GR_ALIAS[grKey(r.n)]; if (a) r.n = a; });
  if (base && !grPast(w)) for (const n of GR_NEW) if (!rows.some(r => grKey(r.n) === grKey(n)) && rows.length < 20) rows.push({n, d: ["", "", "", "", "", "", ""], virt: true});
  return rows;
}
const grUsed = r => (r.n.trim() && !r.virt) || r.d.some(Boolean);
const grWeekH = r => r.d.reduce((s, v) => s + grH(v), 0);

function grTitle(w, year){
  const a = grDay(w, 0), b = grDay(w, 6), y = year ? " " + b.getUTCFullYear() : "";
  return a.getUTCMonth() === b.getUTCMonth() ? a.getUTCDate() + "–" + b.getUTCDate() + " " + GR_GEN[b.getUTCMonth()] + y
    : a.getUTCDate() + " " + GR_GEN[a.getUTCMonth()] + (year && a.getUTCFullYear() !== b.getUTCFullYear() ? " " + a.getUTCFullYear() : "") + " – " + b.getUTCDate() + " " + GR_GEN[b.getUTCMonth()] + y;
}

/* часовка за месяц: по имени (одно имя в разных неделях складывается), только дни этого месяца */
function grMonthSum(k){
  const by = new Map();
  for (const w of grWeeks(k)) for (const r of grRows(w)){
    const key = grKey(r.n);
    if (!key) continue;
    const e = by.get(key) || {n: r.n.trim(), h: 0, s: 0};
    r.d.forEach((v, d) => { if (v && grInMonth(w, d, k)){ e.h += grH(v); e.s++; } });
    by.set(key, e);
  }
  const order = GR_NAMES.map(grKey);
  return [...by.entries()].sort((a, b) => { const i = order.indexOf(a[0]), j = order.indexOf(b[0]); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }).map(x => x[1]);
}

/* перерисовка не сбивает набор и прокрутку: поле имени или времени в фокусе остаётся с тем же текстом и курсором,
   неделя, пролистанная вбок до субботы, так и остаётся на субботе (на телефоне таблица правки шире экрана) */
function grDraw(){
  const ae = document.activeElement, keep = ae && ae.closest && ae.closest("#grWeeks") && ae.tagName === "INPUT"
    ? {sel: ae.classList.contains("grname") ? '.grname[data-w="' + ae.dataset.w + '"][data-r="' + ae.dataset.r + '"]' : '.grf input[name="' + ae.name + '"]', v: ae.value, c: ae.selectionStart} : null;
  const sx = {};
  document.querySelectorAll("#grWeeks .grw").forEach(w => { const s = w.querySelector(".grwrap"); if (s && s.scrollLeft) sx[w.dataset.w] = s.scrollLeft; });
  grPaint();
  Object.keys(sx).forEach(w => { const s = document.querySelector('#grWeeks .grw[data-w="' + w + '"] .grwrap'); if (s) s.scrollLeft = sx[w]; });
  const inp = keep && document.querySelector(keep.sel);
  if (inp){ inp.value = keep.v; inp.focus(); try { if (keep.c != null) inp.setSelectionRange(keep.c, keep.c); } catch (e) {} }
}
function grPaint(){
  const {y, m} = grMonthOf(grMonth), q = ckj(GR_Q, []).length;
  $("grMon").innerHTML = [0, 1].map(k => { const x = grMonthOf(k); return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === grMonth) + '">' + GR_MON[x.m] + " " + x.y + '</button>'; }).join("");
  $("grInfo").innerHTML = (grEdit ? "Нажмите на клетку дня, чтобы поставить смену. Имя меняется только в своей неделе. " : "Правки — кнопкой «Внести правки» под неделей. Прошедшие недели не меняются. ") +
    (q ? "Правок ждут отправки: <b>" + q + "</b>. " : "") +
    (grState === "net" ? "Нет связи — правки уйдут, когда появится." : grState === "old" ? "График заработает после обновления Apps Script." : grState === "load" && !grSt ? "Загружаем…" : "");
  const sum = grMonthSum(grMonth), tot = sum.reduce((s, x) => s + x.h, 0);
  $("grSum").innerHTML = '<div class="result tcard grsum"><div class="tname"><em>только дни: ' + GR_MON[m].toLowerCase() + '</em><h3>Ориентировочная часовка за месяц</h3></div>' +
    '<table><thead><tr><th>Имя</th><th>Смен</th><th>Часов</th></tr></thead><tbody>' +
    sum.map(x => '<tr><td class="n">' + esc(x.n) + '</td><td class="v">' + x.s + '</td><td class="v">' + grNum(x.h) + '</td></tr>').join("") +
    '<tr class="grtot"><td class="n">Всего</td><td class="v">' + sum.reduce((s, x) => s + x.s, 0) + '</td><td class="v">' + grNum(tot) + '</td></tr></tbody></table>' +
    '<p class="grleg"><span class="gr-m">утро</span> до 20:00, в вс до 02:00 · <span class="gr-e">вечер</span> чт и вс до 02:00, пт и сб до 06:00 — конец можно поменять · <span class="gr-x">пн–ср</span> начало и конец вручную</p></div>';
  const today = grToday();
  $("grWeeks").innerHTML = grWeeks(grMonth).map(w => {
    const ed = grEdit === w && !grPast(w);                                     // правится одна неделя; прошедшая — только просмотр
    const rows = grRows(w), show = rows.map((r, i) => ({r, i})).filter(x => ed || grUsed(x.r)), wh = rows.reduce((s, r) => s + grWeekH(r), 0);
    const head = '<tr><th class="grn">Имя</th>' + GR_WD.map((x, d) => {
      const day = grDay(w, d), iso = grIso(day);
      return '<th class="grd' + (grInMonth(w, d, grMonth) ? "" : " grx") + (iso === today ? " grnow" : "") + '"><span>' + x + '</span><b>' + day.getUTCDate() + (day.getUTCDate() === 1 || d === 0 ? "." + String(day.getUTCMonth() + 1).padStart(2, "0") : "") + '</b></th>';
    }).join("") + '<th class="grh">Часы</th></tr>';
    const body = show.map(({r, i}) => '<tr><th class="grn" scope="row">' + (ed ? '<input type="text" class="grname" data-w="' + w + '" data-r="' + i + '" value="' + esc(r.n) + '" placeholder="Имя" aria-label="Имя, строка ' + (i + 1) + '">' : esc(r.n)) + '</th>' +
      r.d.map((v, d) => { const s = grP(v), txt = s ? '<span>' + grT(s.a) + '</span><span class="grb">' + grT(s.b) + '</span>' : "", on = grOpen && grOpen.w === w && grOpen.r === i && grOpen.d === d;
        return '<td class="grc ' + grCls(v) + (on ? " gron" : "") + '">' + (ed ? '<button type="button" data-w="' + w + '" data-r="' + i + '" data-d="' + d + '" aria-label="' + esc((r.n || "Строка " + (i + 1)) + ", " + GR_WD[d] + " " + grDay(w, d).getUTCDate() + ": " + (v || "выходной")) + '">' + (txt || "+") + '</button>' : txt) + '</td>'; }).join("") +
      '<td class="grh">' + (grWeekH(r) ? grNum(grWeekH(r)) : "") + '</td></tr>').join("");
    return '<div class="result tcard grw" data-w="' + w + '"><div class="tname"><em>' + (wh ? "≈ " + grNum(wh) + " ч за неделю" : "смен нет") + '</em><h3>' + grTitle(w) + '</h3></div>' +
      '<div class="grwrap"><table class="grt' + (ed ? " ed" : "") + '"><thead>' + head + '</thead><tbody>' + (body || '<tr><td class="grnone" colspan="9">Смен нет</td></tr>') + '</tbody></table></div>' +
      (grOpen && grOpen.w === w ? grForm() : "") +
      '<div class="grfoot">' + (grPast(w) ? '<span class="grlock">прошедшая неделя — только просмотр</span>'
          : (ed ? '<button type="button" class="link" data-add="' + w + '">+ строка</button>' : "") +
            '<button type="button" class="wogo grgo grwe' + (ed ? " on" : "") + '" data-edit="' + w + '">' + (ed ? "Готово" : "Внести правки") + '</button>') +
        '<button type="button" class="link" data-png="' + w + '">Сохранить картинкой</button></div></div>';
  }).join("");
}

/* правка одной клетки: чт–вс — утро или вечер, начало и конец можно выбрать (конец подставлен обычный); пн–ср — начало
   и конец только вручную */
function grForm(){
  const o = grOpen, r = grRows(o.w)[o.r] || {n: ""}, day = grDay(o.w, o.d), end = GR_END[o.d], kinds = end ? [["", "Выходной"], ["утро", "Утро"], ["вечер", "Вечер"]] : [["", "Выходной"], ["x", "Смена"]];
  const t = (nm, v, lab) => '<label class="grtime"><span>' + lab + '</span><input type="time" name="' + nm + '" value="' + esc(v || "") + '" step="900" required></label>';
  const usual = () => '<p class="grend" id="grEnd">' + grEndTxt() + '</p>';
  let body = "";
  if (o.k === "утро") body = '<div class="grtimes">' + t("a", o.a, "Начало") + t("b", o.b, "Конец") + '</div>' + usual();
  if (o.k === "вечер") body = '<div class="grq">' + GR_EVE.map(x => '<button type="button" class="link" data-t="' + x + '"' + (o.a === x ? ' aria-pressed="true"' : "") + '>с ' + x + '</button>').join("") + '</div>' +
    '<div class="grtimes">' + t("a", o.a, "Начало") + t("b", o.b, "Конец") + '</div>' + usual();
  if (o.k === "x") body = '<p class="wnhint">В понедельник, вторник и среду конец смены не подставляется — укажите начало и конец.</p><div class="grtimes">' + t("a", o.a, "Начало") + t("b", o.b, "Конец") + '</div>';
  return '<form class="grf" novalidate><p class="grft"><b>' + esc(r.n || "Строка " + (o.r + 1)) + '</b> · ' + GR_WDF[o.d] + ', ' + day.getUTCDate() + " " + GR_GEN[day.getUTCMonth()] + '</p>' +
    '<div class="modes grk" role="group" aria-label="Смена">' + kinds.map(([k, l]) => '<button type="button" data-k="' + k + '" aria-pressed="' + (o.k === k) + '">' + l + '</button>').join("") + '</div>' +
    body + '<p class="grlen" id="grLen">' + grLenTxt() + '</p><p class="warn" id="grMsg" role="status"></p>' +
    '<div class="refbtns"><button type="submit" class="wogo">Сохранить</button><button type="button" class="link" data-cx="1">Отмена</button></div></form>';
}
/* обычный конец этого дня и смены; поменяли — «вернуть» */
function grEndTxt(){
  const o = grOpen, end = GR_END[o.d], e = end && (o.k === "утро" ? end[0] : o.k === "вечер" ? end[1] : "");
  return e ? "обычно до <b>" + e + "</b>" + (o.b && o.b !== e ? ' · <button type="button" class="link" data-tb="' + e + '">вернуть ' + e + '</button>' : "") : "";
}
/* значение клетки из формы или текст ошибки */
function grValue(){
  const o = grOpen;
  if (!o.k) return "";
  if (!(grMin(o.a) >= 0)) return {err: "Укажите время начала."};
  if (!(grMin(o.b) >= 0)) return {err: "Укажите время конца смены."};
  if (o.k === "утро" && (grMin(o.a) < 360 || grMin(o.a) >= 1200)) return {err: "Утренняя смена начинается с 06:00 до 20:00."};
  if (o.k === "вечер" && grMin(o.a) < 720) return {err: "Вечерняя смена начинается не раньше 12:00."};
  if (o.a === o.b) return {err: "Начало и конец совпадают."};
  if (grLen(o.a, o.b) > 16) return {err: "Смена дольше 16 часов — проверьте время."};
  return (o.k === "x" ? "" : o.k + " ") + o.a + "–" + o.b;
}
function grLenTxt(){
  const v = grValue();
  return typeof v === "string" && v ? "≈ " + grNum(grH(v)) + " ч" : "";
}

function grPush(c){
  const q = ckj(GR_Q, []);
  const rr = grRows(c.w)[c.r];
  if (rr && rr.virt && c.n == null) c = Object.assign({n: rr.n}, c);           // новый человек: имя уходит вместе с первой сменой
  q.push(Object.assign({id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), ns: grRows(c.w).filter(r => !r.virt).map(r => r.n)}, c));
  cks(GR_Q, q);
  clearTimeout(grSoon); grSoon = setTimeout(grFlush, 400);
}
async function grPost(body){
  try {
    const r = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(Object.assign({token: TOKEN}, body))});
    return await r.json();
  } catch (e) { return {error: "net"}; }
}
/* правки — в таблицу пачками по порядку; ответ таблицы — свежие недели, которых коснулись */
async function grFlush(){
  if (grBusy || !TOKEN || !me) return;
  grBusy = true;
  try {
    for (;;){
      const q = ckj(GR_Q, []);
      if (!q.length) break;
      const part = q.slice(0, 40);
      const d = await grPost({gr: "set", rn: me.name, ch: part.map(({w, r, n, d, v, ns}) => ({w, r, n, d, v, ns}))});
      if (!d.ok){ grState = d.error === "action" ? "old" : "net"; break; }
      const ids = new Set(part.map(x => x.id));
      cks(GR_Q, ckj(GR_Q, []).filter(x => !ids.has(x.id)));
      grSt = grSt || {weeks: {}};
      Object.assign(grSt.weeks, d.weeks || {});
      cks(GR_S, grSt); grState = "ok";
    }
  } finally { grBusy = false; if (sect === "gr") grDraw(); }
}
async function grLoad(){
  if (!TOKEN || !me) return;
  if (ckj(GR_Q, []).length) await grFlush();
  if (grBusy) return;
  const ws = grWeeks(0).concat(grWeeks(1)), d = await grPost({gr: "list", a: ws[0], b: ws[ws.length - 1]});
  if (d.ok && d.weeks){ grSt = {weeks: d.weeks}; cks(GR_S, grSt); grState = "ok"; }
  else grState = d.error === "action" ? "old" : "net";
  if (sect === "gr" && !grOpen) grDraw();
}
function grInit(){
  if (!grSt) grSt = ckj(GR_S, null);
  grDraw(); grLoad();
  if (!grTimer){
    grTimer = setInterval(() => { if (sect === "gr" && R && !document.hidden && !grEdit && !grBusy) grLoad(); }, 60e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && sect === "gr" && R && !grEdit) grLoad(); });
    window.addEventListener("online", () => { if (R && ckj(GR_Q, []).length) grFlush(); });
  }
}

/* неделя картинкой: светлый лист, чтобы читался в чате и на печати */
async function grPng(w){
  try { await document.fonts.load("700 30px Manrope"); await document.fonts.load("600 52px 'Cormorant Garamond'"); } catch (e) {}
  const rows = grRows(w).filter(grUsed), W = 1680, top = 190, rh = 84, H = top + 92 + Math.max(rows.length, 1) * rh + 120;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), cols = [40, 300].concat([0, 1, 2, 3, 4, 5, 6].map(d => 300 + (d + 1) * 172)), hx = cols[cols.length - 1];
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#1b1d22"; x.font = "600 58px 'Cormorant Garamond', Georgia, serif"; x.fillText("График · " + grTitle(w, true), 40, 92);
  x.fillStyle = "#6b6f76"; x.font = "500 26px Manrope, sans-serif"; x.fillText("Бар «Мечты» · бармены и барбеки · ориентировочная часовка — в столбце «Часы»", 40, 140);
  const cell = (t, cx, cy, cw, align, font, col) => { x.font = font; x.fillStyle = col; x.textAlign = align; x.fillText(t, align === "center" ? cx + cw / 2 : align === "right" ? cx + cw - 16 : cx + 16, cy); x.textAlign = "left"; };
  x.fillStyle = "#f2f0ea"; x.fillRect(40, top, W - 80, 92);
  cell("Имя", 40, top + 56, 260, "left", "700 24px Manrope, sans-serif", "#55585e");
  GR_WD.forEach((d, i) => { const day = grDay(w, i); cell(d + " " + day.getUTCDate() + "." + String(day.getUTCMonth() + 1).padStart(2, "0"), cols[i + 1], top + 56, 172, "center", "700 24px Manrope, sans-serif", "#55585e"); });
  cell("Часы", hx, top + 56, W - 40 - hx, "center", "700 24px Manrope, sans-serif", "#55585e");
  const BG = {"gr-m": "#FBEED3", "gr-e": "#E4E1F7", "gr-x": "#DDEDF6"};
  rows.forEach((r, j) => {
    const y = top + 92 + j * rh;
    x.fillStyle = j % 2 ? "#fbfaf7" : "#fff"; x.fillRect(40, y, W - 80, rh);
    cell(r.n || "—", 40, y + 52, 260, "left", "700 30px Manrope, sans-serif", "#1b1d22");
    r.d.forEach((v, d) => {
      const s = grP(v); if (!s) return;
      x.fillStyle = BG[grCls(v)]; x.fillRect(cols[d + 1] + 6, y + 8, 160, rh - 16);
      cell(s.k || "смена", cols[d + 1], y + 34, 172, "center", "600 19px Manrope, sans-serif", "#6b6f76");
      cell(s.a + "–" + s.b, cols[d + 1], y + 64, 172, "center", "700 25px Manrope, sans-serif", "#1b1d22");
    });
    const h = grWeekH(r);
    cell(h ? grNum(h) : "", hx, y + 52, W - 40 - hx, "center", "800 30px Manrope, sans-serif", "#9a7a2c");
  });
  x.strokeStyle = "#d9d6cf"; x.lineWidth = 2;
  for (let j = 0; j <= Math.max(rows.length, 1); j++){ const y = top + 92 + j * rh; x.beginPath(); x.moveTo(40, y); x.lineTo(W - 40, y); x.stroke(); }
  cols.slice(1).forEach(cx => { x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, top + 92 + Math.max(rows.length, 1) * rh); x.stroke(); });
  x.strokeRect(40, top, W - 80, 92 + Math.max(rows.length, 1) * rh);
  const tot = rows.reduce((s, r) => s + grWeekH(r), 0), fy = top + 92 + Math.max(rows.length, 1) * rh + 56;
  x.fillStyle = "#6b6f76"; x.font = "500 22px Manrope, sans-serif";
  x.fillText("Время смены — в клетке (обычно: утро до 20:00, в вс до 02:00; вечер чт и вс до 02:00, пт и сб до 06:00). Всего за неделю ≈ " + grNum(tot) + " ч", 40, fy);
  const blob = await new Promise(ok => c.toBlob(ok, "image/png"));
  if (!blob) return;
  const name = "grafik-" + w + ".png", file = new File([blob], name, {type: "image/png"});   // латиницей — кириллицу в имени файла теряют некоторые браузеры
  if (navigator.canShare && navigator.canShare({files: [file]})){
    try { await navigator.share({files: [file], title: "График " + grTitle(w, true)}); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

$("grMon").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]");
  if (!b || +b.dataset.k === grMonth) return;
  buzz(8); grMonth = +b.dataset.k; grOpen = null; if (grEdit){ grEdit = ""; grFlush(); } grDraw();
});
$("grWeeks").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.png){ grPng(b.dataset.png); return; }
  if (b.dataset.edit){                                                         // «Внести правки» / «Готово» — под своей неделей
    const w = b.dataset.edit;
    if (grPast(w)) return;
    buzz(10); const was = grEdit; grEdit = grEdit === w ? "" : w; grOpen = null; grDraw();
    if (was) grFlush();
    if (grEdit){ const el = document.querySelector('#grWeeks .grw[data-w="' + w + '"]'); if (el) el.scrollIntoView({block: "nearest", behavior: "smooth"}); }
    return;
  }
  if (b.dataset.add){ if (grPast(b.dataset.add)) return; const w = b.dataset.add, n = grRows(w).length; if (n >= 20) return; grPush({w, r: n, n: ""}); grDraw();
    const inp = document.querySelector('.grname[data-w="' + w + '"][data-r="' + n + '"]'); if (inp) inp.focus(); return; }
  if (b.dataset.cx){ grOpen = null; grDraw(); return; }
  if (b.dataset.t){ grOpen.a = b.dataset.t; grDraw(); return; }
  if (b.dataset.tb){ grOpen.b = b.dataset.tb; grDraw(); return; }
  if (b.dataset.k != null && b.closest(".grf")){
    const k = b.dataset.k, cur = grP(grRows(grOpen.w)[grOpen.r].d[grOpen.d]);
    grOpen.k = k;
    const same = cur && (cur.k || "x") === k, end = GR_END[grOpen.d];                   // своё время смены этого вида — как было
    if (k === "утро"){ grOpen.a = same ? cur.a : GR_MORN; grOpen.b = same ? cur.b : end[0]; }
    if (k === "вечер"){ grOpen.a = same ? cur.a : GR_EVE[1]; grOpen.b = same ? cur.b : end[1]; }
    if (k === "x"){ grOpen.a = same ? cur.a : ""; grOpen.b = same ? cur.b : ""; }
    grDraw(); return;
  }
  if (b.dataset.d != null){
    const w = b.dataset.w, r = +b.dataset.r, d = +b.dataset.d, s = grP(grRows(w)[r].d[d]);
    buzz(8);
    if (grPast(w)) return;
    grOpen = {w, r, d, k: s ? (s.k || "x") : (GR_END[d] ? "утро" : "x"), a: s ? s.a : GR_END[d] ? GR_MORN : "", b: s ? s.b : GR_END[d] ? GR_END[d][0] : ""};
    grDraw();
    const f = document.querySelector(".grf");
    if (f) f.scrollIntoView({block: "nearest", behavior: "smooth"});
  }
});
$("grWeeks").addEventListener("input", e => {
  const t = e.target;
  if (!grOpen || !t.closest(".grf") || !/^[ab]$/.test(t.name)) return;
  grOpen[t.name] = t.value;
  $("grLen").textContent = grLenTxt(); $("grMsg").textContent = "";
  if (t.name === "b" && $("grEnd")) $("grEnd").innerHTML = grEndTxt();
});
$("grWeeks").addEventListener("submit", e => {
  if (!e.target.closest(".grf")) return;
  e.preventDefault();
  const v = grValue();
  if (typeof v !== "string"){ $("grMsg").textContent = v.err; return; }
  buzz(14);
  grPush({w: grOpen.w, r: grOpen.r, d: grOpen.d, v});
  grOpen = null; grDraw();
});
$("grWeeks").addEventListener("change", e => {
  const t = e.target.closest(".grname");
  if (!t) return;
  const w = t.dataset.w, r = +t.dataset.r, n = t.value.replace(/\s+/g, " ").trim().slice(0, 40);
  if (n === (grRows(w)[r] || {}).n) return;
  grPush({w, r, n});
});
