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
const REV_BOOK_ID = "";                      // ID таблицы ревизии из её адреса; пусто — эта же таблица
const REV_TOTAL = "Итог";                    // итог со всех зон; в столбце A — позиции с 3-й строки
const REV_ZONES = "По зонам";                // по колонке на зону; создаётся сам, если его нет
const REV_LOG = "Ревизия журнал";            // каждое добавление отдельной строкой
const ZONES = ["Кафе", "Склад и проход", "Клуб", "VIP", "Мансарда"];
const TZ = "GMT+5";                                                 // время Астаны — для дат ревизии
const PCS = ["корона", "ред булл", "red bull"];                      // позиции в штуках (по вхождению в название); остальные — литры

function doGet(e) {
  const p = (e && e.parameter) || {};
  const cb = /^[A-Za-z_$][\w$]{0,63}$/.test(p.callback || "") ? p.callback : "";
  let out;

  if (!tokenOk(p.token)) {
    out = { error: "denied" };
  } else if (p.rev) {
    try { out = revision(p); } catch (err) { out = { error: String(err && err.message || err) }; }
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
function zoneRow(zs, name) {
  const last = Math.max(zs.getLastRow(), 3);
  const names = last > 3 ? zs.getRange(4, 1, last - 3, 1).getValues().map(r => String(r[0]).trim()) : [];
  const i = names.indexOf(name);
  if (i >= 0) return i + 4;
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
  ts.getRange(1, tc, 2, 1).setNumberFormat("@").setValues([[date], [name]]);

  revPositions(ts).forEach(x => zoneRow(zs, x.n));
  const zc = Math.max(zs.getLastColumn(), 1) + 1;
  /* дата и фамилия — один раз, объединённой ячейкой над пятью зонами */
  const n = ZONES.length, blank = ZONES.slice(1).map(() => "");
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

/* Проверка ревизии: выберите checkRevision в списке функций вверху редактора и нажмите
   «Выполнить». В первый раз Google попросит разрешение — дайте его. Результат —
   в «Журнале выполнения» внизу. После этого выпустите новую версию развертывания. */
function checkRevision() {
  const ss = revBook();
  Logger.log("Таблица ревизии: «" + ss.getName() + "», листы: " + ss.getSheets().map(s => s.getName()).join(", "));
  const ts = revTotal(ss);
  Logger.log("Лист «" + ts.getName() + "»: позиций " + revPositions(ts).length);
  Logger.log("Открытая ревизия: " + JSON.stringify(revOpen()));
  Logger.log("Всё в порядке.");
}

/* ── Ежемесячная копия таблиц ──
   Один раз: выберите installBackup в списке функций вверху и нажмите «Выполнить», разрешите доступ к Диску.
   1-го числа каждого месяца в папке «Бар Мечты — бэкапы» на Google Диске появляются копии таблицы журнала
   и таблицы ревизии с датой в названии. Хранятся последние 12 копий каждой, старые уходят в корзину. */
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
  ids.forEach(id => {
    const f = DriveApp.getFileById(id);
    const prefix = f.getName() + " — бэкап ";
    f.makeCopy(prefix + stamp, folder);
    backupPrune(folder, prefix);
  });
}

function backupPrune(folder, prefix) {
  const list = [];
  const files = folder.getFiles();
  while (files.hasNext()) { const f = files.next(); if (f.getName().indexOf(prefix) === 0) list.push(f); }
  list.sort((a, b) => b.getDateCreated() - a.getDateCreated());
  list.slice(BACKUP_KEEP).forEach(f => f.setTrashed(true));
}
