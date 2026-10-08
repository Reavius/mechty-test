/**
 * Раздел «Бартендерам» — Google Sheets.
 *  1. Журнал входов (первый лист этой таблицы): Дата · Фамилия · Почта.
 *  2. Ревизия: лист «Пересчет по зонам» (по колонке на зону) и итоговый «Пересчет».
 *
 * Пишут и читают журнал только те, кто знает пароль: токен лежит внутри
 * шифровки рецептур на сайте, здесь хранится лишь его SHA-256.
 * После смены пароля (tools/vault.mjs) замените TOKEN_SHA256 и выпустите новую версию.
 */
const TOKEN_SHA256 = "8d1a25d23a8211c88fcce095c4d60c492efda24cdfc96bd433a0037080ea8323";
const SHOW = 25;     // сколько последних входов отдавать сайту

/* ── Ревизия ── */
const REV_BOOK_ID = "1OF063GZsdB_eyFRny0006R_y57nfhoZcJGyKcB-T7Ko";  // ID таблицы ревизии из её адреса; пусто — эта же таблица
const REV_TOTAL = "Итог";                    // итог со всех зон; в столбце A — позиции с 3-й строки
const REV_ZONES = "По зонам";                // по колонке на зону; создаётся сам, если его нет
const REV_LOG = "Ревизия журнал";            // каждое добавление отдельной строкой
const ZONES = ["Кафе", "Склад и проход", "Клуб", "VIP", "Мансарда"];
const TZ = "GMT+5";                                                 // время Астаны — для дат ревизии
const PCS = ["корона", "ред булл", "рэд булл", "red bull", "байкал"];   // считаются в штуках
const MREV = "Месячная ревизия";                                    // лист месячной ревизии (в таблице ревизии)                      // позиции в штуках (по вхождению в название); остальные — литры

function doGet(e) {
  const p = (e && e.parameter) || {};
  const cb = /^[A-Za-z_$][\w$]{0,63}$/.test(p.callback || "") ? p.callback : "";
  let out;

  if (!tokenOk(p.token)) {
    out = { error: "denied" };
  } else if (p.rev) {
    try { out = revision(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.mrev) {
    try { out = monthly(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.wo) {
    try { out = writeoffs(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.wn) {
    try { out = wnote(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else {
    const name = clean(p.name, 60);
    const email = clean(p.email, 120).toLowerCase();
    if (name) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) out = { error: "email" };
      else append(name, email);
    }
    if (!out) out = { ok: true, log: recent() };
  }

  const json = JSON.stringify(out);
  if (cb) {
    return ContentService.createTextOutput(cb + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* Лист журнала запоминается по ID, чтобы новые листы не сбили его с места. */
function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const id = Number(props.getProperty("JOURNAL_SHEET_ID"));
  if (id) {
    const found = ss.getSheets().find(s => s.getSheetId() === id);
    if (found) return found;
  }
  const first = ss.getSheets()[0];
  props.setProperty("JOURNAL_SHEET_ID", String(first.getSheetId()));
  return first;
}

function tokenOk(token) {
  if (!token || String(token).length > 200) return false;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token), Utilities.Charset.UTF_8);
  const hex = bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
  return hex === TOKEN_SHA256;
}

/* Обрезка, удаление управляющих символов и защита от формул в таблице. */
function clean(v, max) {
  let s = String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/* Новые входы — сверху, сразу под заголовком (если он есть). */
function firstRow(sh) {
  return sh.getLastRow() >= 1 && !(sh.getRange(1, 1).getValue() instanceof Date) ? 2 : 1;
}

function append(name, email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet(), r = firstRow(sh);
    if (sh.getLastRow() >= r) sh.insertRowBefore(r);
    sh.getRange(r, 1, 1, 3).setValues([[new Date(), name, email]]);
  } finally {
    lock.releaseLock();
  }
}

/* Последние входы: только фамилия и время, почта на сайт не отдаётся.
   Сортировка по дате — на случай старых записей, добавленных снизу. */
function recent() {
  const sh = sheet();
  const last = sh.getLastRow();
  if (last < 1) return [];
  const rows = sh.getRange(1, 1, last, 2).getValues();
  const data = [];
  for (const r of rows) {
    const d = r[0], n = r[1];
    if (!(d instanceof Date) || !n || isNaN(d.getTime())) continue;
    data.push({ n: String(n).replace(/^'/, ""), t: d.getTime() });
  }
  data.sort((a, b) => b.t - a.t);
  return data.slice(0, SHOW);
}

/* Разовая перестановка: выберите sortJournal в списке функций и нажмите «Выполнить» —
   все старые записи журнала встанут по убыванию даты (новые сверху). */
function sortJournal() {
  const sh = sheet(), r = firstRow(sh), last = sh.getLastRow();
  if (last < r) return;
  sh.getRange(r, 1, last - r + 1, Math.max(sh.getLastColumn(), 3)).sort({ column: 1, ascending: false });
  Logger.log("Готово: записей " + (last - r + 1) + ", новые сверху.");
}


/* ═════════════ Ревизия ═════════════
   Состояние открытой ревизии — в свойствах скрипта: колонка итога, первая колонка зон,
   дата и фамилия. Сложение делается здесь, под блокировкой, поэтому повторы и
   одновременные запросы не портят суммы. Каждое добавление имеет id: повтор с тем же id
   не прибавляется второй раз. */

function revision(p) {
  sheet();                                   // закрепить лист журнала до создания новых листов
  const act = String(p.rev);
  if (act === "state") return { ok: true, rev: revState() };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (act === "start") return { ok: true, rev: revStart(clean(p.rn, 60)) };
    if (act === "close") { PropertiesService.getScriptProperties().deleteProperty("REV_OPEN"); return { ok: true, rev: revState() }; }
    if (act === "add") return revAdd(p);
    return { error: "action" };
  } finally {
    lock.releaseLock();
  }
}

function revBook() {
  return REV_BOOK_ID ? SpreadsheetApp.openById(REV_BOOK_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function revTotal(ss) {
  const sh = ss.getSheetByName(REV_TOTAL) || ss.getSheetByName("Пересчет");
  if (!sh) throw new Error("Нет листа «" + REV_TOTAL + "»");
  return sh;
}

function revZones(ss) {
  let sh = ss.getSheetByName(REV_ZONES);
  if (!sh) {
    sh = ss.insertSheet(REV_ZONES, 0);
    sh.getRange(1, 1, 3, 1).setValues([["Дата"], ["Фамилия"], ["Зона"]]);
    sh.setFrozenColumns(1);
    sh.setFrozenRows(3);
  }
  return sh;
}

function revLog(ss) {
  let sh = ss.getSheetByName(REV_LOG);
  if (!sh) {
    sh = ss.insertSheet(REV_LOG);
    sh.appendRow(["Время", "Фамилия", "Ревизия", "Зона", "Позиция", "Добавлено", "id"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function revOpen() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty("REV_OPEN") || "null"); }
  catch (e) { return null; }
}

/* Позиции — из столбца A итогового листа, с 3-й строки. */
function revPositions(ts) {
  const last = ts.getLastRow();
  if (last < 3) return [];
  return ts.getRange(3, 1, last - 2, 1).getValues()
    .map((r, i) => ({ n: String(r[0]).trim(), row: i + 3 }))
    .filter(x => x.n);
}

const unitOf = n => PCS.some(w => n.toLowerCase().indexOf(w) >= 0) ? "шт" : "л";

/* Строка позиции на листе зон (с 4-й строки); нет — дописывается. */
/* Новый лист в Таблицах — 26 столбцов и 1000 строк; писать за край нельзя, поэтому сначала расширяем. */
function ensureCols(sh, last) {
  const max = sh.getMaxColumns();
  if (last > max) sh.insertColumnsAfter(max, last - max);
}
function ensureRows(sh, last) {
  const max = sh.getMaxRows();
  if (last > max) sh.insertRowsAfter(max, last - max);
}

function zoneRow(zs, name) {
  const last = Math.max(zs.getLastRow(), 3);
  const names = last > 3 ? zs.getRange(4, 1, last - 3, 1).getValues().map(r => String(r[0]).trim()) : [];
  const i = names.indexOf(name);
  if (i >= 0) return i + 4;
  ensureRows(zs, last + 1);
  zs.getRange(last + 1, 1).setValue(name);
  return last + 1;
}

function num(v) {
  const x = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isFinite(x) ? x : 0;
}
const round3 = x => Math.round(x * 1000) / 1000;

function revStart(name) {
  if (!name) throw new Error("Нет фамилии");
  const ss = revBook(), ts = revTotal(ss), zs = revZones(ss);
  const started = new Date();
  const date = Utilities.formatDate(started, TZ, "dd.MM.yyyy");

  const tc = ts.getLastColumn() + 1;
  ensureCols(ts, tc);
  ts.getRange(1, tc, 2, 1).setNumberFormat("@").setValues([[date], [name]]);

  revPositions(ts).forEach(x => zoneRow(zs, x.n));
  const zc = Math.max(zs.getLastColumn(), 1) + 1;
  /* дата и фамилия — один раз, объединённой ячейкой над пятью зонами */
  const n = ZONES.length, blank = ZONES.slice(1).map(() => "");
  ensureCols(zs, zc + n - 1);
  zs.getRange(1, zc, 3, n).setNumberFormat("@")
    .setValues([[date].concat(blank), [name].concat(blank), ZONES.slice()])
    .setHorizontalAlignment("center");
  zs.getRange(1, zc, 1, n).merge().setFontWeight("bold");
  zs.getRange(2, zc, 1, n).merge();
  zs.getRange(1, zc, Math.max(zs.getLastRow(), 3), n)
    .setBorder(true, true, true, true, null, null, "#888888", SpreadsheetApp.BorderStyle.SOLID);

  PropertiesService.getScriptProperties().setProperty("REV_OPEN",
    JSON.stringify({ tc: tc, zc: zc, date: date, name: name, started: started.getTime(), key: date + "|" + name + "|" + tc }));
  return revState();
}

function revAdd(p) {
  const open = revOpen();
  if (!open) return { error: "closed" };
  const id = String(p.id || "").slice(0, 64);
  const zi = ZONES.indexOf(String(p.zone || ""));
  const name = String(p.pos || "").trim();
  const v = num(p.v);
  if (!id || zi < 0 || !name || !v || Math.abs(v) > 100000) return { error: "bad" };
  if (p.rk && p.rk !== open.key) return { error: "closed" };

  const ss = revBook(), ts = revTotal(ss), zs = revZones(ss);
  const pos = revPositions(ts).find(x => x.n === name);
  if (!pos) return { error: "position" };
  const zr = zoneRow(zs, name);

  const cache = CacheService.getScriptCache();
  if (!cache.get("rev:" + id)) {
    const cell = zs.getRange(zr, open.zc + zi);
    cell.setValue(round3(num(cell.getValue()) + v));
    revLog(ss).appendRow([new Date(), clean(p.rn, 60), open.date + " · " + open.name, ZONES[zi], name, v, id]);
    cache.put("rev:" + id, "1", 21600);
  }

  const z = zs.getRange(zr, open.zc, 1, ZONES.length).getValues()[0].map(num);
  const t = round3(z.reduce((a, b) => a + b, 0));
  ts.getRange(pos.row, open.tc).setValue(t);
  return { ok: true, add: { pos: name, z: z.map(round3), t: t } };
}

function revState() {
  const open = revOpen();
  const ss = revBook(), ts = revTotal(ss);
  const items = revPositions(ts);
  const lastCol = ts.getLastColumn();

  /* предыдущий пересчёт — колонка перед открытой (или последняя, если ревизия не идёт) */
  const pc = open ? open.tc - 1 : lastCol;
  let prev = null, prevVals = [];
  if (pc >= 2 && items.length) {
    const hd = ts.getRange(1, pc, 2, 1).getDisplayValues();
    prev = { date: hd[0][0], name: hd[1][0] };
    prevVals = ts.getRange(3, pc, items[items.length - 1].row - 2, 1).getValues().map(r => r[0]);
  }

  let zvals = {};
  if (open) {
    const zs = revZones(ss);
    const last = zs.getLastRow();
    if (last >= 4) {
      const names = zs.getRange(4, 1, last - 3, 1).getValues();
      const vals = zs.getRange(4, open.zc, last - 3, ZONES.length).getValues();
      names.forEach((r, i) => { zvals[String(r[0]).trim()] = vals[i].map(x => round3(num(x))); });
    }
  }

  return {
    now: Date.now(),                         // точное время сервера — сайт сверяет по нему часы
    zones: ZONES,
    open: open ? { date: open.date, name: open.name, key: open.key, started: open.started || null } : null,
    prev: prev,
    items: items.map(x => {
      const z = zvals[x.n] || ZONES.map(() => 0);
      const pv = prevVals[x.row - 3];
      return { n: x.n, u: unitOf(x.n), z: z, t: round3(z.reduce((a, b) => a + b, 0)),
               p: pv === "" || pv == null ? null : num(pv) };
    })
  };
}

/* ═════════════ Месячная ревизия ═════════════
   Лист «Месячная ревизия» в таблице ревизии — точь-в-точь бланк бара: столбец A — код или «к»,
   B — наименование, C — ед. изм., разделы — объединёнными строками. Нет листа — создаётся по MREV_ROWS.
   Список правится прямо в листе; позиции, которых нет, бармены добавляют с сайта — вниз, в раздел «Новые позиции».

   Одна месячная ревизия идёт несколько дней и считается несколькими людьми параллельно:
   первый её столбец — «Итог» (формула: сумма столбцов барменов справа; поправлять можно руками),
   дальше — столбцы барменов по порядку: «Начать мой подсчёт» — новый столбец с фамилией и датой,
   «Завершить» — столбец закрыт. У одного человека может быть несколько столбцов (разные дни).
   Шапка столбца: строка 3 — название ревизии (у «Итога»), 4 — служебный id, 5 — фамилия или «Итог», 6 — дата.
   Столбцы находятся по id в строке 4, поэтому вставка столбцов в лист ничего не ломает.
   Числа складываются здесь, под блокировкой; повтор с тем же id не прибавляется. */
const MREV_NEW = "Новые позиции";

function monthly(p) {
  sheet();                                   // закрепить лист журнала до создания новых листов
  const act = String(p.mrev), rn = clean(p.rn, 60);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (act === "state") return { ok: true, mrev: mrevState() };
    if (act === "begin") return mrevBegin(rn);
    if (act === "mine") return mrevMine(rn);
    if (act === "finish") return mrevFinish(String(p.cid || ""), rn);
    if (act === "end") return mrevEnd();
    if (act === "add") return mrevAdd(p, false);
    if (act === "new") return mrevAdd(p, true);
    return { error: "action" };
  } finally {
    lock.releaseLock();
  }
}

function mrevSheet() {
  const ss = revBook();
  let sh = ss.getSheetByName(MREV);
  if (sh) return sh;
  sh = ss.insertSheet(MREV);
  sh.getRange(3, 1, 1, 3).merge().setValue("На дату:");
  sh.getRange(5, 1, 1, 2).merge();
  sh.getRange(5, 1, 2, 3).setValues([["Товар", "", "Ед. изм."], ["", "Наименование", ""]]).setFontWeight("bold");
  const last = MREV_ROWS[MREV_ROWS.length - 1][0];
  const grid = [];
  for (let r = 7; r <= last; r++) grid.push(["", "", ""]);
  MREV_ROWS.forEach(x => { grid[x[0] - 7] = [x[2], x[3], x[4]]; });
  sh.getRange(7, 1, grid.length, 3).setNumberFormat("@").setValues(grid);
  MREV_ROWS.forEach(x => {
    if (x[1] === "h") sh.getRange(x[0], 1, 1, 3).merge().setFontWeight("bold");
    else if (x[5]) sh.getRange(x[0], 1, 1, 3).setFontWeight("bold");
  });
  sh.setFrozenRows(6);
  sh.setFrozenColumns(3);
  sh.setColumnWidth(2, 260);
  return sh;
}

const mprops = () => PropertiesService.getScriptProperties();
function mrevBlock() {
  try { return JSON.parse(mprops().getProperty("MREV_BLOCK") || "null"); } catch (e) { return null; }
}
const mrevSave = b => mprops().setProperty("MREV_BLOCK", JSON.stringify(b));
const mnorm = s => String(s || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
function colA1(c) { let s = ""; for (; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + (c - 1) % 26) + s; return s; }

/* id столбцов (строка 4) → номер столбца */
function mrevIds(sh) {
  const last = sh.getLastColumn(), map = {};
  if (last >= 4) sh.getRange(4, 1, 1, last).getDisplayValues()[0].forEach((v, i) => { if (v) map[String(v).trim()] = i + 1; });
  return map;
}

/* строки листа: разделы (h), подразделы (s) и позиции (i) — по порядку */
function mrevRows(sh) {
  const last = sh.getLastRow();
  if (last < 7) return [];
  const v = sh.getRange(7, 1, last - 6, 3).getDisplayValues();
  const out = [];
  v.forEach((r, i) => {
    const a = String(r[0]).trim(), b = String(r[1]).trim(), c = String(r[2]).trim();
    if (b && !a && !c && /^(Заготовки|Премиксы на коктейли)$/.test(b)) out.push({ r: i + 7, t: "s", n: b });
    else if (b) out.push({ r: i + 7, t: "i", n: b, u: c });
    else if (a) out.push({ r: i + 7, t: "h", n: a });
  });
  return out;
}

/* «Итог» — сумма столбцов барменов справа. Пока ревизия идёт — до конца строки (новые столбцы попадают сами),
   при закрытии — фиксируется на её столбцах. Ячейки, которые поправили руками, не трогаем. */
function totFormula(tc, r, lastCol) {
  const a = colA1(tc + 1) + r + ":" + (lastCol ? colA1(lastCol) + r : r);
  return "=IF(COUNT(" + a + "),SUM(" + a + "),\"\")";
}
/* Открытая ссылка «E72:72» (до конца строки) → закрытая «E72:G72». Ручные правки вида «…+0,5» тоже фиксируются. */
const freezeRefs = (f, last) => String(f).replace(/(\$?)([A-Z]{1,3})(\$?)(\d+):(\$?)(\d+)(?![\d:])/gi,
  (m, d1, col, d2, r1, d3, r2) => r1 === r2 ? d1 + col + d2 + r1 + ":" + colA1(last) + r2 : m);
/* Формулы «Итога» (значения, вписанные руками, не трогаем):
   lastCol = 0 — ревизия идёт: позициям без итога (в том числе строкам, добавленным в лист руками) — открытая формула;
   lastCol > 0 — закрытие: открытые ссылки фиксируются на столбцах ревизии, пустым — закрытая формула. */
function mrevTotals(sh, tc, rows, lastCol) {
  const items = rows.filter(x => x.t === "i");
  if (!items.length) return;
  const top = items[0].r, n = items[items.length - 1].r - top + 1;
  const rg = sh.getRange(top, tc, n, 1), fs = rg.getFormulas(), vs = rg.getValues();
  items.forEach(x => {
    const f = fs[x.r - top][0], v = vs[x.r - top][0];
    if (!f && v === "") sh.getRange(x.r, tc).setFormula(totFormula(tc, x.r, lastCol));
    else if (f && lastCol) { const g = freezeRefs(f, lastCol); if (g !== f) sh.getRange(x.r, tc).setFormula(g); }
  });
}
/* столбец «Итог» открытой ревизии: по id (строка 4), а если id стёрли — по шапке «Итог» + название ревизии.
   Столбец удалили — 0: ревизия закрывается. */
function mrevTotalCol(sh, b, ids) {
  if (ids[b.total]) return ids[b.total];
  const last = sh.getLastColumn();
  if (last < 4) return 0;
  const h = sh.getRange(3, 1, 3, last).getDisplayValues();
  for (let c = last; c >= 4; c--) {                         // только столбец со стёртым id — у прошлых ревизий id на месте
    if (!String(h[1][c - 1]).trim() && String(h[2][c - 1]).trim() === "Итог" && String(h[0][c - 1]).trim() === b.title) {
      sh.getRange(4, c).setValue(b.total);                                 // вернуть id
      ids[b.total] = c;
      return c;
    }
  }
  return 0;
}

function mrevState() {
  const sh = mrevSheet(), rows = mrevRows(sh), ids = mrevIds(sh);
  if (mprops().getProperty("MREV_OPEN")) mprops().deleteProperty("MREV_OPEN");   // старая схема (до «Итога»)
  const b = mrevBlock(), lastRow = Math.max(sh.getLastRow(), 7);
  if (b && b.open) {
    const tc = mrevTotalCol(sh, b, ids);
    if (!tc) { b.open = false; b.cols.forEach(c => { c.open = false; }); mrevSave(b); }   // «Итог» удалили — ревизия закрыта
    else mrevTotals(sh, tc, rows, 0);                                       // строки, добавленные в лист руками
  }
  const colVals = c => c ? sh.getRange(7, c, lastRow - 6, 1).getValues().map(r => r[0]) : [];
  const val = (arr, r) => { const v = arr[r - 7]; return v === "" || v == null ? null : num(v); };
  const tv = b && ids[b.total] ? colVals(ids[b.total]) : [];
  const cols = b ? b.cols.filter(c => ids[c.id]) : [];
  const cv = cols.map(c => colVals(ids[c.id]));
  const prevId = mprops().getProperty("MREV_PREV"), pv = prevId && ids[prevId] ? colVals(ids[prevId]) : [];
  rows.forEach(x => {
    if (x.t !== "i") return;
    x.tot = val(tv, x.r);
    x.c = cv.map(a => val(a, x.r));
    x.p = val(pv, x.r);
  });
  return {
    now: Date.now(),
    block: b && ids[b.total] ? { title: b.title, date: b.date, open: b.open, started: b.started,
      cols: cols.map(c => ({ id: c.id, name: c.name, date: c.date, open: c.open })) } : null,
    prev: mprops().getProperty("MREV_PREV_TITLE") || null,
    rows: rows
  };
}

/* новый столбец справа: шапка в строках 3–6 */
function mrevNewCol(sh, id, title, name, date) {
  const col = Math.max(sh.getLastColumn(), 3) + 1;
  ensureCols(sh, col);
  sh.getRange(3, col, 4, 1).setNumberFormat("@").setValues([[title], [id], [name], [date]]);
  sh.getRange(5, col, 2, 1).setFontWeight("bold").setHorizontalAlignment("center");
  sh.getRange(4, col).setFontColor("#9aa0a6").setFontSize(8);
  return col;
}

function mrevBegin(name) {
  if (!name) return { error: "Нет фамилии" };
  const sh = mrevSheet();
  mrevState();                                              // заодно закрыть «сломанную» ревизию (без «Итога»)
  let b = mrevBlock();
  if (b && b.open) return mrevMine(name);                 // ревизия уже идёт — просто свой столбец
  const started = new Date(), date = Utilities.formatDate(started, TZ, "dd.MM.yyyy");
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const loc = new Date(started.getTime() + 5 * 3600000);   // время Астаны (TZ = GMT+5)
  const key = "m" + started.getTime().toString(36);
  b = { key: key, title: "Ревизия · " + months[loc.getUTCMonth()] + " " + loc.getUTCFullYear(), date: date, started: started.getTime(),
        open: true, total: key + "-t", cols: [], n: 0 };
  const tc = mrevNewCol(sh, b.total, b.title, "Итог", date);
  sh.getRange(7, tc, Math.max(sh.getLastRow(), 7) - 6, 1).setFontWeight("bold");
  mrevTotals(sh, tc, mrevRows(sh), 0);
  mrevSave(b);
  return mrevMine(name);
}

function mrevMine(name) {
  if (!name) return { error: "Нет фамилии" };
  const sh = mrevSheet(), b = mrevBlock();
  if (!b || !b.open) return { error: "closed" };
  const ids = mrevIds(sh);
  const mine = b.cols.find(c => c.open && ids[c.id] && mnorm(c.name) === mnorm(name));
  if (!mine) {
    const date = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy");
    const c = { id: b.key + "-" + (++b.n), name: name, date: date, open: true };
    mrevNewCol(sh, c.id, "", name, date);
    b.cols.push(c);
    mrevSave(b);
  }
  return { ok: true, mrev: mrevState() };
}

function mrevFinish(cid, name) {
  const b = mrevBlock(), c = b && b.cols.find(x => x.id === cid);
  if (!c) return { error: "closed" };
  if (name && mnorm(c.name) !== mnorm(name)) return { error: "Это столбец " + c.name };
  c.open = false;
  mrevSave(b);
  return { ok: true, mrev: mrevState() };
}

function mrevEnd() {
  const sh = mrevSheet(), b = mrevBlock();
  if (!b || !b.open) return { ok: true, mrev: mrevState() };
  const ids = mrevIds(sh), tc = mrevTotalCol(sh, b, ids);
  if (tc) {
    const last = Math.max(tc + 1, ...b.cols.map(c => ids[c.id] || 0));
    mrevTotals(sh, tc, mrevRows(sh), last);               // «Итог» больше не тянет столбцы следующей ревизии
  }
  b.open = false; b.cols.forEach(c => { c.open = false; });
  mrevSave(b);
  mprops().setProperty("MREV_PREV", b.total);
  mprops().setProperty("MREV_PREV_TITLE", b.title);
  return { ok: true, mrev: mrevState() };
}

/* Добавление к позиции (add) или новая позиция (new: название, количество, ед. изм.) —
   в свой открытый столбец. Новая — вниз, в раздел «Новые позиции»; такое название уже есть — прибавляем к нему. */
function mrevAdd(p, isNew) {
  const id = String(p.id || "").slice(0, 64), v = num(p.v);
  const name = String(p.pos || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 200);   // как в листе, без правок
  const text = (x, n) => String(x || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
  if (!id || !name || !isFinite(v) || Math.abs(v) > 100000) return { error: "bad" };   // 0 — «посчитано, ноль»
  const sh = mrevSheet(), cache = CacheService.getScriptCache();
  const seen = cache.get("mrev:" + id);
  if (seen) return { ok: true, add: { row: parseInt(seen, 10), pos: name, v: null } };   // повтор — итог подтянется при сверке
  const b = mrevBlock();
  if (!b || !b.open) return { error: "closed" };
  const c = b.cols.find(x => x.id === String(p.cid || ""));
  if (!c || !c.open) return { error: "closed" };
  const ids = mrevIds(sh), col = ids[c.id], tc = mrevTotalCol(sh, b, ids);
  if (!col || !tc) return { error: "closed" };

  let rows = mrevRows(sh), row = parseInt(p.row, 10);
  if (isNew) {
    const same = rows.filter(x => x.t === "i" && mnorm(x.n) === mnorm(text(name, 80)));
    if (same.length) row = same[same.length - 1].r;
    else {
      let last = Math.max(sh.getLastRow(), 7);
      if (!rows.some(x => x.t === "h" && x.n === MREV_NEW)) {
        last++; ensureRows(sh, last);
        sh.getRange(last, 1, 1, 3).merge().setValue(MREV_NEW).setFontWeight("bold");
      }
      row = last + 1; ensureRows(sh, row);
      sh.getRange(row, 1, 1, 3).setNumberFormat("@").setValues([["", text(name, 80), text(p.unit, 12)]]);
      sh.getRange(row, tc).setFormula(totFormula(tc, row, 0)).setFontWeight("bold");
    }
  } else if (!(row >= 7) || mnorm(sh.getRange(row, 2).getDisplayValue()) !== mnorm(name)) {
    /* строки сдвинули — ищем по названию; одинаковые (Мандарин) — по разделу и ближайшей строке */
    let sec = "";
    const hit = rows.filter(x => { if (x.t !== "i") { sec = x.n; return false; } x.sec = sec; return mnorm(x.n) === mnorm(name); });
    const same = p.sec ? hit.filter(x => x.sec === p.sec) : [];
    const pool = same.length ? same : hit;
    if (!pool.length) return { error: "position" };
    pool.sort((a, z) => Math.abs(a.r - (row || 0)) - Math.abs(z.r - (row || 0)));
    row = pool[0].r;
  }
  const tcell = sh.getRange(row, tc);
  if (!tcell.getFormula() && tcell.getValue() === "") tcell.setFormula(totFormula(tc, row, 0));   // строку добавили руками
  const cell = sh.getRange(row, col);
  if (v || cell.getValue() === "") cell.setValue(round3(num(cell.getValue()) + v));
  if (p.clr && num(cell.getValue()) === 0) cell.setValue("");          // отменили всё — снова «не посчитано»
  revLog(revBook()).appendRow([new Date(), clean(p.rn, 60), b.title + " · " + c.name + " " + c.date, isNew ? "новая" : "—", clean(name, 80), v, id]);
  cache.put("mrev:" + id, String(row), 21600);
  SpreadsheetApp.flush();
  const t = sh.getRange(row, tc).getValue();
  const cv = cell.getValue();
  return { ok: true, add: { row: row, pos: String(sh.getRange(row, 2).getDisplayValue()).trim(), v: cv === "" ? "" : round3(num(cv)), tot: t === "" ? null : round3(num(t)), isNew: isNew } };
}

/* ═════════════ Списания ═════════════
   Акт списания и акт проработки собираются на сайте: PDF создаётся на телефоне (скачать / поделиться) и присылается сюда (POST).
   У каждого вида своя папка на Google Диске — «Бар Мечты — Списания» и «Бар Мечты — Проработки»: в ней PDF актов
   и таблица-журнал («Журнал списаний» / «Журнал проработок»), где каждая позиция — строкой. Таблицу ревизии не трогаем.
   Повтор с тем же id не дублируется (id хранится в журнале). Нужен доступ к Диску: выполните checkWriteoff один раз. */
/* два вида актов — одна форма, разные папки и журналы; у проработки причина у всех позиций — «Проработка» */
const WO_KINDS = {
  wo: { folder: "Бар Мечты — Списания",  log: "Журнал списаний",   sheet: "Списания",   file: "Акт списания" },
  pr: { folder: "Бар Мечты — Проработки", log: "Журнал проработок", sheet: "Проработки", file: "Акт проработки" }
};
const woKind = k => WO_KINDS[k] ? k : "wo";
const WO_HEAD = ["Дата акта", "№", "Наименование", "Ед. изм.", "Кол-во", "Причина", "Кто", "Файл", "Записано", "id"];

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e && e.postData ? e.postData.contents : "{}"); } catch (err) { return jsonOut({ error: "bad" }); }
  if (!tokenOk(p.token)) return jsonOut({ error: "denied" });
  try {
    sheet();
    if (p.wo === "save") return jsonOut(woSave(p));
    return jsonOut({ error: "action" });
  } catch (err) { return jsonOut({ error: String(err && err.message || err) }); }
}
function jsonOut(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* файл в корзине или удалён (в корзине и вся его папка — тоже). fresh — без кэша; иначе ответ помнится 10 минут */
function woTrashed(id, fresh) {
  const cache = CacheService.getScriptCache(), k = "wot:" + id, c = fresh ? null : cache.get(k);
  if (c) return c === "1";
  let gone;
  try { gone = DriveApp.getFileById(id).isTrashed(); }
  catch (e) {                                                   // нет файла / нет доступа — удалён; сбой Диска — не судим и не запоминаем
    if (!/not found|no item|permission|access|не найден|доступ/i.test(String(e && e.message || e))) return false;
    gone = true;
  }
  cache.put(k, gone ? "1" : "0", 600);
  return gone;
}
/* первая не удалённая папка / файл из выдачи Диска */
function woAlive(it) { while (it.hasNext()) { const x = it.next(); if (!x.isTrashed()) return x; } return null; }
function woFolder(kind, create) {
  const name = WO_KINDS[woKind(kind)].folder;
  return woAlive(DriveApp.getFoldersByName(name)) || (create ? DriveApp.createFolder(name) : null);
}
/* лист журнала вида. Журнал — таблица в папке вида; id запоминается в свойствах скрипта.
   Журнала ещё нет: create — завести (и перенести старый лист из таблицы ревизии), иначе — null. */
function woSheet(kind, create) {
  kind = woKind(kind);
  const K = WO_KINDS[kind], props = PropertiesService.getScriptProperties(), key = "WO_LOG_" + kind;
  let ss = null, fresh = false;
  const id = props.getProperty(key);
  if (id) {
    try { if (!woTrashed(id, create)) ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    const folder = woFolder(kind, create);
    const f = folder && woAlive(folder.getFilesByName(K.log));
    if (f) ss = SpreadsheetApp.openById(f.getId());
    else if (!create) return null;
    else {
      ss = SpreadsheetApp.create(K.log);
      DriveApp.getFileById(ss.getId()).moveTo(folder);
      fresh = true;
    }
    props.setProperty(key, ss.getId());
  }
  let sh = ss.getSheetByName(K.sheet);
  if (!sh) {
    /* лист журнала переименовали или удалили: берём первый лист, но не «Заметку»; нет такого — заводим заново */
    sh = ss.getSheets().filter(x => x.getName() !== WN_SHEET)[0] || null;
    if (sh && fresh) sh.setName(K.sheet);
    if (!sh) { if (!create) return null; sh = ss.insertSheet(K.sheet, 0); }
  }
  if (create && String(sh.getRange(1, 1).getValue()) === "") {
    sh.getRange(1, 1, 1, WO_HEAD.length).setValues([WO_HEAD]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}
/* Раньше журнал вёлся листом «Списания» / «Проработки» в таблице ревизии (а без REV_BOOK_ID — в таблице журнала входов).
   Строки такого листа переносятся в журнал (кроме уже перенесённых — по id), а сам лист удаляется.
   Смотрим обе таблицы. Чужой лист с таким же именем не трогаем. */
function woMigrate(kind, sh) {
  const books = [], ids = {};
  [() => SpreadsheetApp.getActiveSpreadsheet(), revBook].forEach(f => {
    try { const b = f(); if (b && !ids[b.getId()]) { ids[b.getId()] = 1; books.push(b); } } catch (e) {}
  });
  return books.map(b => woMigrateFrom(b, kind, sh)).filter(Boolean).join("; ");
}
function woMigrateFrom(book, kind, sh) {
  const old = book.getSheetByName(WO_KINDS[kind].sheet);
  if (!old) return "";
  const name = "лист «" + old.getName() + "»", where = " в таблице «" + book.getName() + "»";  // после удаления лист не прочитать
  const keep = name + where + " не наш (другие столбцы) — оставлен как есть";
  if (old.getMaxColumns() < WO_HEAD.length || old.getLastColumn() > WO_HEAD.length) return keep;
  const head = old.getRange(1, 1, 1, WO_HEAD.length).getDisplayValues()[0];
  if (head.join("|") !== WO_HEAD.join("|")) return keep;
  let moved = 0;
  const last = old.getLastRow();
  if (last >= 2) {
    const have = {}, top = sh.getLastRow();
    if (top >= 2) sh.getRange(2, 10, top - 1, 1).getValues().forEach(r => { have[String(r[0])] = 1; });
    const v = old.getRange(2, 1, last - 1, WO_HEAD.length).getValues().filter(r => String(r.join("")) !== "" && !have[String(r[9])]);
    moved = v.length;
    if (v.length) {
      const from = Math.max(top, 1) + 1;
      ensureRows(sh, from + v.length - 1);
      sh.getRange(from, 1, v.length, 4).setNumberFormat("@");
      sh.getRange(from, 6, v.length, 5).setNumberFormat("@");
      sh.getRange(from, 1, v.length, WO_HEAD.length).setValues(v);
      SpreadsheetApp.flush();
    }
  }
  if (book.getSheets().length < 2) return "строк перенесено: " + moved + "; " + name + where + " — единственный, не удалён";
  book.deleteSheet(old);
  return name + " убран" + where.replace(" в таблице", " из таблицы") + (moved ? ", его строки (" + moved + ") — в журнале" : "");
}
const WO_LIST = 30;
/* PDF акта удалён (по ссылке из журнала); без ссылки — считаем, что есть */
function woFileGone(url) {
  const m = String(url || "").match(/\/d\/([\w-]{10,})/);
  return m ? woTrashed(m[1], false) : false;
}
/* id уже записанного акта → ссылка на файл ("" — без файла); нет — null */
function woFind(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const v = sh.getRange(2, 8, last - 1, 3).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][2]) === id) return String(v[i][0] || "");
  return null;
}

function woSave(p) {
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64), a = p.act || {}, kind = woKind(a.kind);
  const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 200)
    .map(r => [clean(r.n, 120), clean(r.u, 10), num(r.q), kind === "pr" ? "Проработка" : clean(r.why, 120)]).filter(r => r[0]);
  const date = clean(a.date, 20), no = clean(a.no, 20), who = clean(a.who, 80);
  if (!id || !rows.length || !/^\d{2}\.\d{2}\.\d{4}$/.test(date)) return { error: "bad" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = woSheet(kind, true);
    try { woMigrate(kind, sh); } catch (e) {}                              // перенос старого листа не мешает сохранить акт
    /* строки, перенесённые из заметки, — списаны этим актом (и при повторе: отметка могла не записаться) */
    const nids = (Array.isArray(a.rows) ? a.rows : []).map(r => String(r && r.nid || "").replace(/[^\w-]/g, "")).filter(Boolean);
    if (nids.length) wnDone(nids, WO_KINDS[kind].file + " " + date + (no ? " №" + no : "") + " · " + (who || "") + " · " + id, id);
    const seen = woFind(sh, id);
    if (seen !== null) return { ok: true, url: seen, dup: true };
    let url = "";
    if (p.pdf) {
      const name = WO_KINDS[kind].file + " " + date + (no ? " №" + no : "") + " — " + (who || "бар").replace(/\.+$/, "") + ".pdf";
      const blob = Utilities.newBlob(Utilities.base64Decode(String(p.pdf)), "application/pdf", name);
      url = woFolder(kind, true).createFile(blob).getUrl();
    }
    const stamp = new Date(), last = Math.max(sh.getLastRow(), 1);
    ensureRows(sh, last + rows.length);
    const n = rows.length, top = last + 1;
    sh.getRange(top, 1, n, 4).setNumberFormat("@");                       // текст: дата, №, наименование, ед.
    sh.getRange(top, 6, n, 5).setNumberFormat("@");                       // текст: причина, кто, файл, когда, id
    sh.getRange(top, 1, n, WO_HEAD.length)                                // кол-во — числом, чтобы считать суммы
      .setValues(rows.map(r => [date, no, r[0], r[1], r[2], r[3], who, url, Utilities.formatDate(stamp, TZ, "dd.MM.yyyy HH:mm"), id]));
    SpreadsheetApp.flush();                                               // записать до снятия блокировки — повтор увидит id
    return { ok: true, url: url };
  } finally {
    lock.releaseLock();
  }
}

/* JSONP: wo=check — записан ли акт; wo=list — последние акты */
function writeoffs(p) {
  const sh = woSheet(p.k, false), act = String(p.wo);                     // журнала ещё нет — ни одного акта
  if (act === "check") { const u = sh ? woFind(sh, String(p.id || "")) : null; return { ok: true, saved: u !== null, url: u || "" }; }
  if (act === "list") {
    /* последние WO_LIST актов, у каждого — его позиции (на сайте акт раскрывается). Акт, чей PDF удалён
       с Диска, на сайте не показываем: строки в журнале остаются, их можно стереть там же. */
    const last = sh ? sh.getLastRow() : 0, out = [], seen = {};
    if (last >= 2) {
      const from = Math.max(2, last - 1499), v = sh.getRange(from, 1, last - from + 1, WO_HEAD.length).getDisplayValues();
      for (let i = v.length - 1; i >= 0; i--) {                           // строки акта идут подряд; снизу — новые
        const r = v[i], id = r[9];
        if (!id) continue;
        if (!seen[id]) {
          if (out.length >= WO_LIST) break;
          seen[id] = woFileGone(r[7]) ? { gone: true } : { date: r[0], no: r[1], who: r[6], url: r[7], at: r[8], n: 0, rows: [] };
          if (!seen[id].gone) out.push(seen[id]);
        }
        if (seen[id].gone) continue;
        seen[id].n++;
        seen[id].rows.unshift([r[2], r[3], r[4], r[5]]);
      }
    }
    return { ok: true, acts: out };
  }
  return { error: "action" };
}

/* ═════════════ Заметка к списанию ═════════════
   Общий список «что списать» — видят все. Строку нельзя удалить. Перенос в акт закрепляет строку за барменом и его
   телефоном на 24 часа (take): в заметке её больше не видно, в акте её нельзя изменить — только вернуть (back).
   Акт создан на телефоне — строка запечатана (seal: «в акте …, ждёт копии»): больше не возвращается, даже если копия
   акта дойдёт до таблицы позже. Копия дошла (woSave) — «Акт … · кто · id»: списана окончательно.
   Не создал акт за 24 часа — строка сама возвращается в заметку и ждёт следующего акта.
   Отметки прежних версий сайта в «Списано в акте» (без «Акт …») считаются закрытыми, как и были.
   История — лист «Заметка» в «Журнале списаний». Повтор add с тем же id ничего не задваивает. */
const WN_SHEET = "Заметка";
const WN_HEAD = ["id", "Наименование", "Ед. изм.", "Кол-во", "Причина", "Записал", "Когда", "Взял в акт", "Когда взял", "Списано в акте", "Телефон"];
const WN_HOLD = 24 * 3600e3, WN_V = 2;
function wnSheet(create) {
  const log = woSheet("wo", create);
  if (!log) return null;
  const ss = log.getParent();
  let sh = ss.getSheetByName(WN_SHEET);
  if (!sh && create) {
    sh = ss.insertSheet(WN_SHEET);
    sh.setFrozenRows(1);
  }
  if (sh && create && sh.getRange(1, 1, 1, WN_HEAD.length).getDisplayValues()[0].join("|") !== WN_HEAD.join("|"))
    sh.getRange(1, 1, 1, WN_HEAD.length).setValues([WN_HEAD]).setFontWeight("bold");
  return sh;
}
/* «Когда взял» — дата (или текст «дд.мм.гггг чч:мм» по Астане из прежней версии) → мс */
function wnTime(v) {
  if (v instanceof Date) return v.getTime();
  const m = String(v || "").match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4] - 5, +m[5]) : 0;
}
const WN_SEAL = "в акте ";
function wnRows(sh) {
  const last = sh ? sh.getLastRow() : 0, now = Date.now();
  return last < 2 ? [] : sh.getRange(2, 1, last - 1, WN_HEAD.length).getValues()
    .map((r, i) => {
      const x = { row: i + 2, id: String(r[0]), n: String(r[1]), u: String(r[2]), q: r[3], why: String(r[4]), who: String(r[5]),
        at: r[6] instanceof Date ? Utilities.formatDate(r[6], TZ, "dd.MM") : String(r[6]).slice(0, 5), took: String(r[7]), since: wnTime(r[8]),
        done: String(r[9]), dev: String(r[10]) };
      x.closed = !!x.done;                                                 // списана, запечатана в акте или закрыта прежней версией
      x.held = !!x.took && !x.closed && now - x.since < WN_HOLD;           // закреплена за барменом
      return x;
    })
    .filter(x => x.id);
}
const wnItem = x => ({ id: x.id, n: x.n, u: x.u, q: x.q, why: x.why, who: x.who, at: x.at });
const wnOpen = rows => rows.filter(x => !x.closed && !x.held).map(wnItem);
const wnMine = (rows, who) => who ? rows.filter(x => x.held && x.took === who).map(x => Object.assign(wnItem(x), { until: x.since + WN_HOLD, dev: x.dev })) : [];
const wnAns = (rows, who, more) => Object.assign({ ok: true, v: WN_V, items: wnOpen(rows), mine: wnMine(rows, who) }, more || {});
const wnIds = v => String(v || "").split(",").map(x => x.replace(/[^\w-]/g, "").slice(0, 64)).filter(Boolean);

function wnote(p) {
  const act = String(p.wn), who = clean(p.rn, 60), dev = String(p.dev || "").replace(/[^\w-]/g, "").slice(0, 40);
  if (act === "list") return wnAns(wnRows(wnSheet(false)), who);
  if (["add", "take", "back", "seal", "got"].indexOf(act) < 0) return { error: "action" };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = wnSheet(true), rows = wnRows(sh), want = wnIds(p.ids), now = new Date();
    const stamp = Utilities.formatDate(now, TZ, "dd.MM.yyyy HH:mm");
    if (act === "add") {
      const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64), n = clean(p.n, 120), q = num(p.q);
      if (!id || !n || !(q > 0)) return { error: "bad" };
      if (!rows.some(x => x.id === id)) {
        const top = Math.max(sh.getLastRow(), 1) + 1;
        ensureRows(sh, top);
        sh.getRange(top, 1, 1, 3).setNumberFormat("@"); sh.getRange(top, 5, 1, 2).setNumberFormat("@");
        sh.getRange(top, 1, 1, 7).setValues([[id, n, clean(p.u, 10), q, clean(p.why, 120), who, now]]);
        SpreadsheetApp.flush();
        rows.push({ id: id, n: n, u: clean(p.u, 10), q: q, why: clean(p.why, 120), who: who, at: stamp.slice(0, 5), took: "", since: 0, done: "", dev: "", closed: false, held: false });
      }
      return wnAns(rows, who);
    }
    if (!who || !want.length) return { error: "bad" };
    const mine = x => want.indexOf(x.id) >= 0;
    if (act === "take") {
      /* свободные (и вернувшиеся через 24 часа) — закрепить за барменом и телефоном; уже его — оставить; чужие и закрытые — мимо */
      rows.forEach(x => {
        if (!mine(x) || x.closed || x.held) return;
        sh.getRange(x.row, 8).setNumberFormat("@").setValue(who);
        sh.getRange(x.row, 9).setNumberFormat("dd.MM.yyyy HH:mm").setValue(now);
        sh.getRange(x.row, 11).setNumberFormat("@").setValue(dev);
        x.took = who; x.since = now.getTime(); x.dev = dev; x.held = true;
      });
      SpreadsheetApp.flush();
      return wnAns(rows, who, { took: wnMine(rows, who).filter(mine) });
    }
    if (act === "back") {                                                  // бармен отменил перенос — строки снова в заметке
      rows.forEach(x => {
        if (!mine(x) || !x.held || x.took !== who) return;
        sh.getRange(x.row, 8, 1, 2).setValues([["", ""]]); sh.getRange(x.row, 11).setValue("");
        x.took = ""; x.since = 0; x.dev = ""; x.held = false;
      });
      SpreadsheetApp.flush();
      return wnAns(rows, who);
    }
    if (act === "seal") {
      /* акт создан на телефоне: строки больше не возвращаются, даже если копия акта придёт позже */
      const aid = String(p.act || "").replace(/[^\w-]/g, "").slice(0, 64), sealed = [], conflict = [];
      if (!aid) return { error: "bad" };
      rows.forEach(x => {
        if (!mine(x)) return;
        if (x.closed){ (x.done.indexOf(aid) >= 0 ? sealed : conflict).push(x.id); return; }
        if (x.held && x.took !== who){ conflict.push(x.id); return; }
        sh.getRange(x.row, 10).setNumberFormat("@").setValue(WN_SEAL + aid + " · " + who + " · " + stamp + " · ждёт копии на Диске");
        x.done = WN_SEAL + aid; x.closed = true; x.held = false; sealed.push(x.id);
      });
      SpreadsheetApp.flush();
      return wnAns(rows, who, { sealed: sealed, conflict: conflict });
    }
    /* got — от прежней версии сайта: строка дошла до её акта, значит закрыта (та версия не отмечала акты) */
    rows.forEach(x => {
      if (!mine(x) || x.closed || x.took !== who) return;
      sh.getRange(x.row, 10).setNumberFormat("@").setValue("дошло до акта (прежняя версия сайта) " + stamp);
      x.closed = true; x.held = false;
    });
    SpreadsheetApp.flush();
    return wnAns(rows, who);
  } finally {
    lock.releaseLock();
  }
}
/* копия акта дошла — его строки из заметки списаны окончательно (из woSave, под блокировкой; повтор безопасен).
   Строка уже списана другим актом — помечаем «⚠ также в акте …», чтобы двойное списание было видно в листе. */
function wnDone(ids, mark, aid) {
  const sh = wnSheet(false);
  if (!sh || !ids.length) return;
  wnRows(sh).forEach(x => {
    if (ids.indexOf(x.id) < 0) return;
    if (x.done.indexOf(aid) >= 0 && x.done.indexOf(WN_SEAL) !== 0) return;          // уже отмечена этим актом
    const other = /^Акт /.test(x.done) || (x.done.indexOf(WN_SEAL) === 0 && x.done.indexOf(aid) < 0);
    sh.getRange(x.row, 10).setNumberFormat("@").setValue(other ? x.done + " ⚠ также в акте " + mark : mark);
  });
}

/* Один раз в редакторе: выберите checkWriteoff → «Выполнить» → разрешите доступ к Диску.
   Заводит папки и журналы, а старые листы «Списания» / «Проработки» из таблицы ревизии переносит в журналы. */
function checkWriteoff() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    Object.keys(WO_KINDS).forEach(k => {
      const sh = woSheet(k, true), moved = woMigrate(k, sh);
      Logger.log("Папка: «" + woFolder(k, true).getName() + "», журнал: «" + sh.getParent().getName() + "»" + (moved ? "; " + moved : "") + ".");
    });
  } finally {
    lock.releaseLock();
  }
  Logger.log("Всё в порядке.");
}

/* Бланк бара: [строка, тип (h — раздел, s — подраздел, i — позиция), A, B, C, жирный] */
const MREV_ROWS = [[7,"h","Вермуты","","",1],[8,"i","","Вермут Мартини Бьянко","литр",0],[9,"i","","Вермут Мартини Россо","литр",0],[10,"i","","Вермут Мартини Фиеро","литр",0],[11,"i","","Вермут Мартини Экстра Драй","литр",0],[12,"h","Германия","","",1],[13,"i","","Португизер","",0],[14,"i","к","Гевюрцтраминер Ханс Баер","",1],[15,"i","к","Урбан Рислинг","",1],[16,"h","Испания","","",1],[17,"i","к","Сан валентин парельяда","",0],[18,"i","к","Матсу","",1],[19,"h","Италия","","",1],[20,"i","к","Гави Ла Сколько","",0],[21,"i","к","Пфефферер","",0],[22,"i","к","Верментино Вилла Солаис","",0],[23,"i","к","Меро Каза Дкфра","",0],[24,"i","к","Санджовезе Алма Романа","",0],[25,"h","Новая Зеландия","","",1],[26,"i","","мисти клифф совиньон блан","",1],[27,"h","Португалия","","",1],[28,"i","к","Маре Гриль Белое","",0],[29,"i","к","Маре Гриль Розе","",0],[30,"h","Россия","","",1],[31,"i","к","Голубицкое Каберне совиньон","",0],[32,"h","США","","",1],[33,"i","к","Зинфандель Краб энд Мо","",0],[34,"h","Франция","","",1],[35,"i","к","Ле Гранд Нуар Пино Нуар","",0],[36,"i","к","Бордо Ситран Руж","",0],[37,"i","к","Шабли Жан Марк","",0],[38,"h","Чили","","",1],[39,"i","","Токорнал Шардоне","",0],[40,"i","","Токорнал Розе","",0],[41,"i","","Селар Селекшн Совиньон Блан","",1],[42,"i","","Селар Селекшн Карменер","",1],[43,"h","ЮАР","","",1],[44,"i","к","Шенен Блан Кейп ориджинал","",1],[45,"h","Шампанские","","",1],[46,"i","","Дево Кюве","",0],[47,"i","","Вдова Клико","",1],[48,"h","Вина игристые","","",1],[49,"i","1157","Игристое розлив","литр",0],[50,"i","","Тет де Шеваль брют","",0],[51,"i","","Мартини Просекко","",0],[52,"i","","Мартини Просекко Розе","",0],[53,"i","","Мартини Асти","",0],[54,"i","","Мартини Брют","",1],[55,"i","","Бруни Просекко","",1],[56,"i","","Мартини Секко","",1],[57,"i","","Мучо Мас","",1],[58,"h","Виски","","",1],[59,"i","456","Дюарс Уайт Лейбл","литр",0],[60,"i","","Дюарс 8","",0],[61,"i","465","Виски Чивас Ригал 12лет","литр",0],[62,"i","","Талмор Дью","",0],[63,"i","","Джемесон","",0],[64,"i","","Джим Бим","",0],[65,"i","","Манки Шолдер","",0],[66,"i","","Гленфиддик 12 лет","",0],[67,"i","","Виски Хаус","",0],[68,"i","","Аберфелди","",0],[69,"i","","Тилинг","",0],[70,"h","Водка","","",1],[71,"i","","Лаб груша","",0],[72,"i","","Беленькая","",0],[73,"i","","Белуга Нобл","",0],[74,"i","","Белуга Голд Лайн","",0],[75,"i","","Ортодокс","",0],[76,"i","","Грей Гуз","",1],[77,"i","","Арктика","",1],[78,"i","","Онегин","",1],[79,"h","Джин","","",1],[80,"i","589","Джин Хендрикс","литр",0],[81,"i","","Хинт","",0],[82,"i","","Босфорд","",0],[83,"i","","Антидот","",0],[84,"i","","Хопперс оригинал","",0],[85,"i","","Хопперс лаванда","",0],[86,"i","","Хопперс мандарин","",0],[87,"i","","Бомбей Сапфир","",0],[88,"h","Коньяк","","",1],[89,"i","","Бисквит вс","",0],[90,"i","","Бисквит всоп","",0],[91,"i","","Ной 5 зв","",0],[92,"i","","Камю вс","",0],[93,"i","","Камю всоп","",0],[94,"h","Ликеры","","",1],[95,"i","1220","Ликер Амаретто","литр",0],[96,"i","","Ликер Банан","",0],[97,"i","1111","Ликер Бенедиктин","литр",0],[98,"i","198","Ликер Бэйлис","литр",0],[99,"i","","Ликер Какао","",0],[100,"i","","Ликер Кофе","",0],[101,"i","","Ликер мараскино","",0],[102,"i","","Ликер Смородина","",0],[103,"i","346","Ликер Трипл Сек","литр",0],[104,"i","","Ликер Фиалка","",0],[105,"i","479","Ликер Ягермайстер","литр",0],[106,"i","","Италикус","",0],[107,"i","","Ликер мята","",0],[108,"i","","Белуга Хантинг Ягодная","",0],[109,"i","","Белуга Хантинг Травяная","",0],[110,"i","","Белуга Ботаника Роза Лайм","",0],[111,"i","","Белуга Ботаника Огурец Мята","",0],[112,"i","","Фернет Бранка","",0],[113,"i","","Бранка менте","",0],[114,"h","Напитки, настойки","","",1],[115,"i","1031","Ангостура Биттерс","литр",0],[116,"i","343","Апероль","литр",0],[117,"i","1174","Апперитив Земляника","литр",0],[118,"i","1155","Херес","литр",0],[119,"i","","Кампари","",0],[120,"i","","Сарти","",0],[121,"i","","Соджу","",0],[122,"h","Ром","","",1],[123,"i","","Бакарди Оакхарт","",0],[124,"i","","Ром Хаус","",0],[125,"i","","Матусалем платино","",0],[126,"i","","Матусалем 7","",0],[127,"i","","Ангостура Тамбу","",0],[128,"h","Текила","","",1],[129,"i","","Текила Хаус","",0],[130,"i","","Хосе Куэрво сильвер","",0],[131,"i","","Хосе Куэрво Репосадо","",0],[132,"h","Б/алко","","",1],[133,"i","","Сан Бенедето","шт",1],[134,"i","537","Вода Бон аква/Байкал","шт",0],[135,"i","","Байкал стекло","",0],[136,"i","199","Кола тоник литровые","литр",0],[137,"i","6","Вода минеральная розлив","литр",0],[138,"i","627","Кока кола тоник 330 мл","шт",0],[139,"i","626","Ред Булл 250мл","шт",0],[140,"i","139","Сок, л","литр",0],[141,"i","","Лимонад Шихан","",0],[142,"i","","Сок Лайма","",0],[143,"i","","милкис","",0],[144,"i","","Вода кокосовая","",0],[145,"h","Пиво в бутылках","","",1],[146,"i","","Корона","",0],[147,"i","","Блю Мун","",0],[148,"i","","Бакалар темный","",0],[149,"i","","МортСюбите","",0],[150,"i","","Августинер","",0],[151,"i","","Сидр","",0],[152,"i","","Крушовице безалко","",0],[153,"i","","Ла коста фреска","",0],[154,"i","","Балтика нулевка грейпфрут","",1],[155,"h","Пиво разлив","","",1],[156,"i","","Шихан/Жигули","",0],[157,"i","","Мейзон","",0],[158,"i","","Крушовице","",0],[159,"h","Сиропы, пюре","","",1],[160,"i","1319","Пюре Маракуйя с/м","кг",0],[161,"i","","Пюре в ассортименте","",0],[162,"i","","Сироп в ассортименте","",0],[163,"i","","Клавис","",0],[164,"h","Чай, кофе","","",1],[165,"i","1159","Горячиий шоколад","кг",0],[166,"i","11","Кофе","кг",0],[167,"i","613","Чай ассам, кг","кг",0],[168,"i","610","Чай башкирский, кг","кг",0],[169,"i","617","Чай гречишный, кг","кг",0],[170,"i","320","Чай лапсанг сушонг","кг",0],[171,"i","616","Чай молочный улун, кг","кг",0],[172,"i","614","Чай пуэр, кг","кг",0],[173,"i","611","Чай сладкий поцелуй, кг","кг",0],[174,"i","1217","Чай таежный, кг","кг",0],[175,"i","612","Чай татарский, кг","кг",0],[176,"i","615","Чай те гуань инь, кг","кг",0],[177,"i","","Саган Дайля","",0],[178,"i","","Матча","",0],[179,"i","","Каркаде","",0],[180,"i","","Роза","",0],[181,"i","","Ройбуш","",0],[182,"i","","Марокканская мята","",0],[183,"i","","Дикая вишня","",0],[184,"h","Десерты","","",1],[185,"i","56","Мёд","кг",0],[186,"i","301","Сахар","кг",0],[187,"i","121","Сахарная вата","кг",0],[188,"i","","Сахар ванильный","",0],[189,"i","203","Фруктоза","кг",0],[190,"i","215","Шоколад, кг","кг",0],[191,"i","","Конфеты","",0],[192,"i","","варенье шишковое","",0],[193,"i","","Ванилин","",0],[194,"i","","Малина сублимированная","",0],[195,"h","Заправки, соуса, масло","","",1],[196,"i","126","Соус Табаско","литр",0],[197,"i","","ворчестер","",0],[198,"h","Консервация, заморозка","","",1],[199,"i","103","Ягоды с/м","кг",0],[200,"h","Молочные продукты","","",1],[201,"i","109","Молоко","литр",0],[202,"i","15","Молоко кокосовое","литр",0],[203,"i","","Молоко сгущ","",0],[204,"i","110","Сливки 33 % и 11%","литр",0],[205,"i","","Мороженое","",0],[206,"i","14","Яичный белок, желток","литр",0],[207,"h","Специи, зелень","","",1],[208,"i","213","Пищевая кислота","кг",0],[209,"i","125","Соль","кг",0],[210,"i","41","Специи","кг",0],[211,"i","983","Корица в палочках","кг",0],[212,"i","","Желатин","",1],[213,"h","Фрукты, овощи","","",1],[214,"i","20","Апельсин свежий","кг",0],[215,"i","400","Клубника свежая","кг",0],[216,"i","","Малина","",0],[217,"i","18","Лайм свежий","кг",0],[218,"i","13","Лимон свежий","кг",0],[219,"i","147","Огурец свежий","кг",0],[220,"i","17","Яблоко свежее","кг",0],[221,"i","","Фейхоа","",0],[222,"i","","Грейп","",0],[223,"i","","Груша","",0],[224,"i","","Имбирь","",0],[225,"i","","Мандарин","",0],[226,"i","","Маракуйя","",0],[227,"i","319","Тархун","кг",0],[228,"i","318","Щавель, шпинат свежий","кг",0],[229,"i","","Хрен","",0],[230,"i","154","Лимонная трава","кг",0],[231,"i","170","Листья лайма","кг",0],[232,"i","152","Базилик/розмарин/мята/тимьян","кг",0],[233,"i","","Папая сушеная","",0],[234,"h","П/ф бар","","",1],[235,"h","Настойки","","",1],[236,"i","","Малина мята","",0],[237,"i","","Вишня виски","",0],[238,"i","","Айриш","",0],[239,"i","","Лимончелло","",0],[240,"i","","Мандарин","",0],[241,"i","","Маракуйя Пломбир","",0],[242,"i","","Клубника каркаде","",0],[243,"s","","Заготовки","",1],[244,"i","313","Микс кислот","литр",0],[245,"i","326","Сироп сахарный","литр",0],[246,"i","1009","Фреш апельсиновый пф","литр",0],[247,"i","21","Лимонный сок пф","литр",0],[248,"i","","Облепиха шраб","",0],[249,"i","","Кордиал Гибискус","",0],[250,"i","","Пена игристого","",0],[251,"i","","Пена пломбир","",0],[252,"i","","Медовый сироп","",0],[253,"i","","Колд брю","",0],[254,"i","","Сироп Щавель пф","",0],[255,"i","","Сироп Базилик п/ф","",0],[256,"i","","Кордиал чили барбарис","",0],[257,"i","","Кордиал цитрусовый","",0],[258,"i","","Кордиал цитрус тархун","",0],[259,"i","","Пюре вишня п/ф","",0],[260,"i","","Премикс для лимонада вишня персик","",0],[261,"i","","Лимонад грейпфрут","",0],[262,"s","","Премиксы на коктейли","",1],[263,"i","924","Пф для Лонг Айленд","литр",0],[264,"i","928","Пф для Негрони","литр",0],[265,"i","","порнстар мартини (без игристого)","",0],[266,"i","","Сигма бой","",0],[267,"i","","Розовая пантера","",0],[268,"i","","Мандариновый Спритс","",0],[269,"i","","Пинк Леди","",0],[270,"i","","Вишневый Пирог","",0],[271,"i","","Брекфест Тини","",0],[272,"i","","Тропики","",0],[273,"i","","Чили барбарис","",0],[274,"i","","Саммер Спритц","",0],[275,"i","","Огуречный хьюго","",0],[276,"i","","Груша жасмин","",0],[277,"i","","Блю Колада","",0],[278,"i","","Май тай","",0]];

/* Проверка ревизии: выберите checkRevision в списке функций вверху редактора и нажмите
   «Выполнить». В первый раз Google попросит разрешение — дайте его. Результат —
   в «Журнале выполнения» внизу. После этого выпустите новую версию развертывания. */
function checkRevision() {
  const ss = revBook();
  Logger.log("Таблица ревизии: «" + ss.getName() + "», листы: " + ss.getSheets().map(s => s.getName()).join(", "));
  const ts = revTotal(ss);
  Logger.log("Лист «" + ts.getName() + "»: позиций " + revPositions(ts).length);
  Logger.log("Открытая ревизия: " + JSON.stringify(revOpen()));
  const ms = mrevSheet();
  Logger.log("Лист «" + ms.getName() + "»: позиций " + mrevRows(ms).filter(x => x.t === "i").length + ", месячная ревизия: " + JSON.stringify(mrevBlock()));
  Logger.log("Всё в порядке.");
}

/* ── Ежемесячная копия таблиц ──
   Один раз: выберите installBackup в списке функций вверху и нажмите «Выполнить», разрешите доступ к Диску.
   1-го числа каждого месяца в папке «Бар Мечты — бэкапы» на Google Диске появляются копии таблицы журнала,
   таблицы ревизии и журналов списаний и проработок с датой в названии. Хранятся последние 12 копий каждой,
   старые уходят в корзину. */
const BACKUP_FOLDER = "Бар Мечты — бэкапы";
const BACKUP_KEEP = 12;

function installBackup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "monthlyBackup")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("monthlyBackup").timeBased().onMonthDay(1).atHour(5).create();
  monthlyBackup();
  Logger.log("Готово: копии будут делаться 1-го числа каждого месяца. Первая уже в папке «" + BACKUP_FOLDER + "».");
}

function monthlyBackup() {
  const found = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const folder = found.hasNext() ? found.next() : DriveApp.createFolder(BACKUP_FOLDER);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const ids = [SpreadsheetApp.getActiveSpreadsheet().getId()];
  if (REV_BOOK_ID && ids.indexOf(REV_BOOK_ID) < 0) ids.push(REV_BOOK_ID);
  const copy = id => {
    const f = DriveApp.getFileById(id);
    const prefix = f.getName() + " — бэкап ";
    f.makeCopy(prefix + stamp, folder);
    backupPrune(folder, prefix);
  };
  ids.forEach(copy);
  /* журналы списаний и проработок; журнала нет или он удалён — пропускаем, остальное уже скопировано */
  Object.keys(WO_KINDS).forEach(k => {
    const id = PropertiesService.getScriptProperties().getProperty("WO_LOG_" + k);
    if (id && ids.indexOf(id) < 0) { try { copy(id); } catch (e) { Logger.log("Журнал «" + WO_KINDS[k].log + "» не скопирован: " + e.message); } }
  });
}

function backupPrune(folder, prefix) {
  const list = [];
  const files = folder.getFiles();
  while (files.hasNext()) { const f = files.next(); if (f.getName().indexOf(prefix) === 0) list.push(f); }
  list.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  list.slice(BACKUP_KEEP).forEach(f => f.setTrashed(true));
}
