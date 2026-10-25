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
const ZONES = ["Кафе", "Склад и проход", "Клуб", "VIP", "Мансарда", "Синий контейнер"];   // новые — только в конец
const TZ = "GMT+5";                                                 // время Астаны — для дат ревизии
const PCS = ["корона", "ред булл", "рэд булл", "red bull", "байкал"];   // считаются в штуках
const MREV = "Месячная ревизия";                                    // лист месячной ревизии (в таблице ревизии)                      // позиции в штуках (по вхождению в название); остальные — литры

/* Одно открытие таблицы, листа, папки за запрос (кэш живёт до конца запроса; Apps Script и так запускает скрипт
   заново на каждый запрос — сбрасываем явно в каждой точке входа). */
let MEMO = {};
/* общая блокировка; занята дольше ms — ошибка «busy»: сайт повторит запрос сам, ничего не теряется */
function lockOrBusy(ms) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(ms)) throw new Error("busy");
  return lock;
}
/* закрепить лист журнала входов до создания новых листов — нужно только пока его id не запомнен */
function journalPin() {
  if (!PropertiesService.getScriptProperties().getProperty("JOURNAL_SHEET_ID")) sheet();
}

function doGet(e) {
  MEMO = {};
  const p = (e && e.parameter) || {};
  const cb = /^[A-Za-z_$][\w$]{0,63}$/.test(p.callback || "") ? p.callback : "";
  let out;

  if (p.pub) {                                                           // меню и состав для гостей — без пароля
    try { out = pubGet(); } catch (err) { console.error("pub: " + err); out = { error: "net" }; }
  } else if (!tokenOk(p.token)) {
    out = { error: "denied" };
  } else if (p.rev) {
    try { out = revision(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.mrev) {
    try { out = monthly(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.wo) {
    try { out = writeoffs(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.wn) {
    try { out = wnote(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.ck) {
    try { out = checklist(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.mgr) {
    try { out = manager(p); } catch (err) { out = { error: String(err && err.message || err) }; }
  } else if (p.mem) {
    try { out = { ok: true, mem: members() }; } catch (err) { console.error("mem: " + err); out = { error: "net" }; }
  } else {
    const name = clean(p.name, 60);
    const email = clean(p.email, 120).toLowerCase();
    try {
      if (name) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) out = { error: "email" };
        else append(name, email);
      }
      if (!out) out = { ok: true, log: recent() };
    } catch (err) {                                                       // сбой журнала — сайт повторит (как при «нет связи»)
      console.error("login: " + (err && err.stack || err));
      out = { error: "net" };
    }
  }

  /* таблица занята — для сайта это «нет связи»: повторяют все его версии (прежние понимают только «net») */
  if (out && out.error === "busy") out = { error: "net", busy: 1 };
  const json = JSON.stringify(out);
  if (cb) {
    return ContentService.createTextOutput(cb + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* Лист журнала запоминается по ID, чтобы новые листы не сбили его с места. */
function sheet() {
  if (MEMO.journal) return MEMO.journal;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  const id = Number(props.getProperty("JOURNAL_SHEET_ID"));
  if (id) {
    const found = ss.getSheets().find(s => s.getSheetId() === id);
    if (found) return MEMO.journal = found;
  }
  const first = ss.getSheets()[0];
  props.setProperty("JOURNAL_SHEET_ID", String(first.getSheetId()));
  return MEMO.journal = first;
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
  const lock = lockOrBusy(10000);
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
  const all = sh.getLastRow(), last = Math.min(all, 400);                // новые — сверху; весь журнал читать незачем
  if (last < 1) return [];
  let rows = sh.getRange(1, 1, last, 2).getValues();
  const ts = rows.map(r => r[0] instanceof Date ? r[0].getTime() : null).filter(t => t !== null);
  if (all > last && ts.some((t, i) => i && t > ts[i - 1])) rows = sh.getRange(1, 1, all, 2).getValues();   // не по порядку — весь
  const data = [];
  for (const r of rows) {
    const d = r[0], n = r[1];
    if (!(d instanceof Date) || !n || isNaN(d.getTime())) continue;
    data.push({ n: String(n).replace(/^'/, ""), t: d.getTime() });
  }
  data.sort((a, b) => b.t - a.t);
  return data.slice(0, SHOW);
}

/* Чеклист открытия — общий для всех: отметка (id пункта → кто и когда) хранится в свойствах скрипта на текущий
   «день бара»: он начинается в 06:00 по Астане, ночная смена дорабатывает со своими отметками. Новый день — список пуст. */
const CK_KEY = "CK";
const ckDay = () => Utilities.formatDate(new Date(Date.now() - 6 * 3600e3), TZ, "yyyy-MM-dd");
function ckState() {
  let st = null;
  try { st = JSON.parse(PropertiesService.getScriptProperties().getProperty(CK_KEY) || "null"); } catch (e) { st = null; }
  const day = ckDay();
  return st && st.day === day && st.s && typeof st.s === "object" ? st : { day: day, s: {}, of: st && st.of || 0, tot: st && st.tot || "" };
}
/* пункт отмечается сам (акт списания ушёл в таблицу) — вызывается под блокировкой */
function ckAuto(id, who, g, tx) {
  const st = ckState();
  if (st.s[id]) return;
  st.s[id] = { w: who, t: Date.now() };
  PropertiesService.getScriptProperties().setProperty(CK_KEY, JSON.stringify(st));
  try { ckLive(st, who, { id: id, g: g, tx: tx, auto: 1 }, true); } catch (e) { console.error("ckLive: " + e); }
}
function checklist(p) {
  const act = String(p.ck);
  if (act === "list") { const st = ckState(); return { ok: true, day: st.day, s: st.s }; }
  if (act !== "set") return { error: "action" };
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 24), who = clean(p.rn, 60);
  if (!id || !who) return { error: "bad" };
  const lock = lockOrBusy(10000);
  try {
    const st = ckState(), on = String(p.on) === "1", had = !!st.s[id];
    if (on) { if (!had) st.s[id] = { w: who, t: Date.now() }; }
    else delete st.s[id];
    if (parseInt(p.of, 10) > 0) st.of = parseInt(p.of, 10);              // сколько всего пунктов — для строки дня
    if (/^[a-z]:\d+(,[a-z]:\d+){0,9}$/.test(String(p.tot || ""))) st.tot = String(p.tot);   // пунктов по разделам: «a:11,b:3,…»
    PropertiesService.getScriptProperties().setProperty(CK_KEY, JSON.stringify(st));
    /* сразу в таблицу журнала, не дожидаясь «Бар готов»; сбой записи не теряет саму отметку */
    if (on !== had) try { ckLive(st, who, p, on); } catch (e) { console.error("ckLive: " + e); }
    return { ok: true, day: st.day, s: st.s };
  } finally {
    lock.releaseLock();
  }
}

/* Участники — все, кто когда-либо входил: по одному на почту (фамилия — из последнего входа), по алфавиту.
   Почта целиком на сайт не уходит: первые 3 символа, 8 звёздочек и окончание адреса (.ru / .com / .kz). */
function members() {
  const sh = sheet(), last = sh.getLastRow();
  if (last < 1) return [];
  const by = {};
  sh.getRange(1, 1, last, 3).getValues().forEach(r => {
    const d = r[0], n = String(r[1] || "").replace(/^'/, "").trim(), e = String(r[2] || "").replace(/^'/, "").trim().toLowerCase();
    if (!(d instanceof Date) || !n || e.indexOf("@") < 1) return;
    const t = d.getTime();
    if (!by[e] || t > by[e].t) by[e] = { n: n, t: t };
  });
  return Object.keys(by).map(e => ({ n: by[e].n, m: maskMail(e) })).sort((a, b) => a.n.localeCompare(b.n, "ru"));
}
function maskMail(e) {
  const end = (String(e).match(/\.[^.@]+$/) || [""])[0];
  return String(e).slice(0, 3) + "********" + end;
}

/* Разовая перестановка: выберите sortJournal в списке функций и нажмите «Выполнить» —
   все старые записи журнала встанут по убыванию даты (новые сверху). */
function sortJournal() {
  MEMO = {};
  const sh = sheet(), r = firstRow(sh), last = sh.getLastRow();
  if (last < r) return;
  sh.getRange(r, 1, last - r + 1, Math.max(sh.getLastColumn(), 3)).sort({ column: 1, ascending: false });
  Logger.log("Готово: записей " + (last - r + 1) + ", новые сверху.");
}


/* ═════════════ Ревизия ═════════════
   Ежедневная ревизия — это день с 9:00 до 9:00 (время Астаны), один на всех. Считать можно параллельно:
   столбец зоны на листе «По зонам» появляется при первом добавлении в эту зону и закрепляется за тем, кто начал
   (строки 1–3: дата, фамилия, зона); пустые зоны столбцов не получают. Добавлять можно и в чужую зону — число
   прибавится к её столбцу, а в журнал запишется под фамилией того, кто добавил. Итог дня — один столбец листа
   «Итог» (сумма всех зон дня), создаётся при первом добавлении. В 9:00 день закрывается сам.
   «Завершить» — личное: сворачивает ревизию у этого бармена и ничего не блокирует; вернуться можно до 9:00.
   Состояние дня — в свойстве REV_DAY. Сложение — под блокировкой; повтор с тем же id не прибавляется. */

function revision(p) {
  journalPin();                              // закрепить лист журнала до создания новых листов
  const act = String(p.rev);
  if (act === "state" || act === "start") return { ok: true, rev: revState() };   // start — от старого сайта

  revBook();                                 // открыть таблицу до блокировки — блокировка держится меньше
  const lock = lockOrBusy(20000);
  try {
    if (act === "add") return revAdd(p);
    if (act === "fin") return revFin(p);
    if (act === "close") return { ok: true, rev: revState() };              // старый сайт: «Завершить» для всех больше нет
    return { error: "action" };
  } finally {
    lock.releaseLock();
  }
}

function revBook() {
  return MEMO.rev || (MEMO.rev = REV_BOOK_ID ? SpreadsheetApp.openById(REV_BOOK_ID) : SpreadsheetApp.getActiveSpreadsheet());
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
  let sh = ss.getSheetByName(REV_LOG) || ss.getSheetByName("Журнал ревизии");   // лист могли переименовать
  if (!sh) {
    sh = ss.insertSheet(REV_LOG);
    sh.appendRow(["Время", "Фамилия", "Ревизия", "Зона", "Позиция", "Добавлено", "id"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* день ревизии: с 9:00 до 9:00 по Астане → «2026-10-12» (дата, когда день начался) */
const revDayKey = t => Utilities.formatDate(new Date((t || Date.now()) - 9 * 3600000), TZ, "yyyy-MM-dd");
const revDayDate = day => day.split("-").reverse().join(".");

/* Состояние сегодняшнего дня {day, date, tc, zones: {зона: {col, who}}, fin: {ключ фамилии: {name, at}}} или null.
   Ревизия старой схемы (REV_OPEN: пять зон одной фамилии), начатая сегодня, продолжается как день;
   save — под блокировкой: перенос записывается. */
function revDay(save) {
  const P = PropertiesService.getScriptProperties(), day = revDayKey();
  const read = k => { try { return JSON.parse(P.getProperty(k) || "null"); } catch (e) { return null; } };
  let st = read("REV_DAY");
  if (st && st.day !== day) st = null;
  const old = read("REV_OPEN");
  if (old) {
    if (!st && old.started && revDayKey(old.started) === day && old.tc && old.zc) {
      st = { day: day, date: revDayDate(day), tc: old.tc, zones: {}, fin: {}, old: old.key };
      ZONES.slice(0, 5).forEach((z, i) => { st.zones[z] = { col: old.zc + i, who: old.name }; });
    }
    if (save) { P.deleteProperty("REV_OPEN"); if (st) revDaySave(st); }
  }
  return st;
}
const revDaySave = st => PropertiesService.getScriptProperties().setProperty("REV_DAY", JSON.stringify(st));
/* день сдан: посчитаны все зоны и каждый, кто считал, нажал «Завершить» — ревизия готова сразу, не дожидаясь 9:00 */
function revDone(st) {
  if (!st || !ZONES.every(z => st.zones[z])) return false;
  const fin = st.fin || {};
  return ZONES.every(z => fin[mnorm(st.zones[z].who)]);
}
/* когда сдали день: «dd.MM.yyyy» → мс (время последнего «Завершить»); хранится, пока день есть в «Итоге» (последние 400) */
const REV_AT = "REV_AT";
function revAtMap() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(REV_AT) || "{}") || {}; } catch (e) { return {}; } }
function revAtSet(date, t) {
  const m = revAtMap();
  if (t) m[date] = t; else delete m[date];
  const keys = Object.keys(m).sort((a, b) => m[a] - m[b]);
  keys.slice(0, Math.max(0, keys.length - 400)).forEach(k => { delete m[k]; });
  PropertiesService.getScriptProperties().setProperty(REV_AT, JSON.stringify(m));
}
/* столбец «Итога» идущего дня — для сводок бар-менеджера (незаконченный день в них не берём; сданный — уже берём) */
function revOpenCol() { const st = revDay(false); return st && !revDone(st) ? st.tc : 0; }
/* какие зоны посчитаны в каждый день: «dd.MM.yyyy» → «Кафе,Клуб» (по шапке «По зонам»; старая схема — дата над пятью зонами) */
function revDayZones(ss) {
  const zs = ss.getSheetByName(REV_ZONES), lc = zs ? zs.getLastColumn() : 0, out = {};
  if (lc < 2) return out;
  const h = zs.getRange(1, 1, 3, lc).getDisplayValues();
  let d = "";
  for (let c = 1; c < lc; c++) {
    if (String(h[0][c]).trim()) d = String(h[0][c]).trim();
    const z = String(h[2][c]).trim();
    if (d && z) (out[d] = out[d] || []).indexOf(z) < 0 && out[d].push(z);
  }
  Object.keys(out).forEach(k => { out[k] = ZONES.filter(z => out[k].indexOf(z) >= 0).join(","); });
  return out;
}
/* когда закончили считать день: время последнего добавления в «Ревизия журнал» («dd.MM.yyyy · …» → мс) */
function revDayTimes(ss) {
  const lg = ss.getSheetByName(REV_LOG) || ss.getSheetByName("Журнал ревизии"), last = lg ? lg.getLastRow() : 0, out = {};
  if (last < 2) return out;
  lg.getRange(2, 1, last - 1, 3).getValues().forEach(r => {
    if (!(r[0] instanceof Date)) return;
    const d = String(r[2]).split(" · ")[0].trim(), t = r[0].getTime();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(d) && !(out[d] >= t)) out[d] = t;
  });
  return out;
}
/* «dd.MM.yyyy HH:mm» по Астане → мс */
const ruTime = s => { const m = String(s || "").match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/); return m ? Date.UTC(+m[3], m[2] - 1, +m[1], m[4] - 5, +m[5]) : 0; };
/* единица ежедневной ревизии: кг и шт — из справочника (однозначное название), остальное — литры (Корона, Ред Булл — штуки) */
function dailyUnits(ref) {
  const u = {};
  (ref && ref.rows || []).forEach(r => { const k = nameKey(r[1]), x = String(r[2]).trim(); if (r[9] !== 1 && r[9] !== "1") return; u[k] = k in u && u[k] !== x ? null : x; });
  return n => { const x = u[nameKey(n)]; return x === "кг" ? "кг" : x === "шт" ? "шт" : unitOf(n); };
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

/* первое добавление дня: столбец «Итога» и позиции, которых нет на листе зон (вниз, по порядку «Итога») */
function revNewDay(ts, zs, day) {
  const lc = ts.getLastColumn(), date = revDayDate(day);
  const man = lc >= 2 && String(ts.getRange(1, lc).getDisplayValue()).trim() === date;   // бар-менеджер уже внёс день вручную — досчитываем в него
  const st = { day: day, date: date, tc: man ? lc : lc + 1, zones: {}, fin: {} };
  if (!man) {
    ensureCols(ts, st.tc);
    ts.getRange(1, st.tc, 2, 1).setNumberFormat("@").setValues([[st.date], [""]]);
  }
  const zl = Math.max(zs.getLastRow(), 3);
  const have = {}, miss = [];
  if (zl > 3) zs.getRange(4, 1, zl - 3, 1).getValues().forEach(r => { have[String(r[0]).trim()] = 1; });
  revPositions(ts).forEach(x => { if (!have[x.n]) { have[x.n] = 1; miss.push([x.n]); } });
  if (miss.length) { ensureRows(zs, zl + miss.length); zs.getRange(zl + 1, 1, miss.length, 1).setValues(miss); }
  return st;
}

/* первое добавление в зону: её столбец справа — дата, фамилия, зона */
function revNewZone(ts, zs, st, zone, who) {
  const col = Math.max(zs.getLastColumn(), 1) + 1;
  ensureCols(zs, col);
  zs.getRange(1, col, 3, 1).setNumberFormat("@").setValues([[st.date], [who], [zone]]).setHorizontalAlignment("center");
  zs.getRange(1, col).setFontWeight("bold");
  zs.getRange(1, col, Math.max(zs.getLastRow(), 3), 1)
    .setBorder(true, true, true, true, null, null, "#888888", SpreadsheetApp.BorderStyle.SOLID);
  st.zones[zone] = { col: col, who: who };
  ts.getRange(2, st.tc).setNumberFormat("@").setValue(revWho(st));          // в «Итоге» — все, кто считает
  return st.zones[zone];
}
/* фамилии зон дня без повторов, кто раньше начал — первым: «Куклин, Журавлев» */
function revWho(st) {
  const seen = {};
  return ZONES.filter(z => st.zones[z]).sort((a, b) => st.zones[a].col - st.zones[b].col).map(z => st.zones[z].who)
    .filter(w => { const k = mnorm(w); return seen[k] ? false : (seen[k] = 1); }).join(", ");
}
/* числа строки по зонам дня (порядок ZONES; зоны без столбца — 0) — одним чтением */
/* null — ячейка пустая (не считали), 0 — посчитали ноль */
function revZoneVals(zs, st, rows) {
  const cols = ZONES.map(z => st && st.zones[z] ? st.zones[z].col : 0), used = cols.filter(c => c);
  const out = {};
  if (!used.length || !rows.length) return out;
  const c0 = Math.min.apply(null, used), w = Math.max.apply(null, used) - c0 + 1;
  const r0 = Math.min.apply(null, rows), h = Math.max.apply(null, rows) - r0 + 1;
  const v = zs.getRange(r0, c0, h, w).getValues();
  rows.forEach(r => { out[r] = cols.map(c => { if (!c) return null; const x = v[r - r0][c - c0]; return x === "" || x == null ? null : round3(num(x)); }); });
  return out;
}
const revSum = z => z.some(x => x != null) ? round3(z.reduce((a, b) => a + (b || 0), 0)) : null;
/* столбцы дня в «Итоге» и «По зонам» — на своих местах? Вставили или удалили столбец — найти по шапке (дата, зона).
   Столбец зоны удалили — зона начнётся заново; столбец «Итога» удалили — ошибка, писать некуда. */
function revFixCols(ts, zs, st) {
  let ch = false;
  if (String(ts.getRange(1, st.tc).getDisplayValue()).trim() !== st.date) {
    const lc = ts.getLastColumn(), h = ts.getRange(1, 1, 1, lc).getDisplayValues()[0];
    let c = -1;
    for (let i = lc - 1; i >= 1; i--) if (String(h[i]).trim() === st.date) { c = i + 1; break; }
    if (c < 0) throw new Error("Нет столбца " + st.date + " в листе «Итог» — его удалили?");
    st.tc = c; ch = true;
  }
  const zl = zs.getLastColumn(), zh = zl ? zs.getRange(1, 1, 3, zl).getDisplayValues() : [[], [], []];
  const at = (c, z) => c >= 1 && c <= zl && String(zh[2][c - 1]).trim() === z && [st.date, ""].indexOf(String(zh[0][c - 1]).trim()) >= 0;
  Object.keys(st.zones).forEach(z => {
    if (at(st.zones[z].col, z)) return;
    let c = -1;
    for (let i = zl; i >= 2; i--) if (at(i, z) && String(zh[0][i - 1]).trim() === st.date) { c = i; break; }
    if (c < 0) delete st.zones[z]; else st.zones[z].col = c;
    ch = true;
  });
  return ch;
}

function revAdd(p) {
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64);   // в журнал — без «=» в начале (не формула)
  const zi = ZONES.indexOf(String(p.zone || ""));
  const name = String(p.pos || "").trim();
  const v = num(p.v);
  if (!id || zi < 0 || !name || String(p.v == null ? "" : p.v).trim() === "" || Math.abs(v) > 100000) return { error: "bad" };   // 0 — «посчитано, ноль»
  const day = revDayKey();
  let st = revDay(true);
  /* сайт шлёт ключ дня; ключ ревизии старой схемы — пока идёт её день */
  if (p.rk && p.rk !== day && !(st && st.old && p.rk === st.old)) return { error: "closed" };

  const ss = revBook(), ts = revTotal(ss), zs = revZones(ss);
  const pos = revPositions(ts).find(x => x.n === name);
  if (!pos) return { error: "position" };
  const rn = clean(p.rn, 60) || "без фамилии", zone = ZONES[zi];

  const cache = CacheService.getScriptCache();
  if (st && revFixCols(ts, zs, st)) revDaySave(st);
  if (!cache.get("rev:" + id)) {
    if (!st) st = revNewDay(ts, zs, day);
    const z = st.zones[zone] || revNewZone(ts, zs, st, zone, rn);
    revDaySave(st);
    const cell = zs.getRange(zoneRow(zs, name), z.col), was = cell.getValue();
    const nv = round3(num(was) + v);
    /* отменили всё своё (clr) и в ячейке ноль — снова «не посчитано»; иначе число, в том числе посчитанный ноль */
    cell.setValue(p.clr === "1" && nv === 0 ? "" : nv);
    revLog(ss).appendRow([new Date(), rn, st.date + " · " + zone + " · " + z.who, zone, name, v, id]);
    cache.put("rev:" + id, "1", 21600);
  }
  if (!st) return { error: "closed" };

  const zr = zoneRow(zs, name), z = revZoneVals(zs, st, [zr])[zr] || ZONES.map(() => null);
  const t = revSum(z);
  ts.getRange(pos.row, st.tc).setValue(t == null ? "" : t);              // ни одной зоны — позиция не посчитана
  SpreadsheetApp.flush();                                                  // записать до снятия блокировки
  return { ok: true, add: { pos: name, z: z.map(x => x || 0), t: t || 0, zone: zone, who: st.zones[zone] ? st.zones[zone].who : "" } };
}

/* «Завершить» и «Вернуться в ревизию» — только для себя; видно остальным */
function revFin(p) {
  const rn = clean(p.rn, 60), st = revDay(true);
  if (!rn) return { error: "Нет фамилии" };
  if (p.rk && p.rk !== revDayKey()) return { error: "closed" };
  if (st) {
    st.fin = st.fin || {};
    if (p.on === "1") st.fin[mnorm(rn)] = { name: rn, at: Date.now() };
    else delete st.fin[mnorm(rn)];
    revDaySave(st);
    revAtSet(st.date, revDone(st) ? Date.now() : 0);                   // сдали всё — ревизия готова; вернулись — снова идёт
  }
  return { ok: true, rev: revState() };
}

function revState() {
  const st = revDay(false);
  const ss = revBook(), ts = revTotal(ss);
  const items = revPositions(ts);
  const lastCol = ts.getLastColumn();

  /* прошлый пересчёт — столбец перед сегодняшним (или последний, если сегодня ещё не считали) */
  const pc = st ? st.tc - 1 : lastCol;
  let prev = null, prevVals = [];
  if (pc >= 2 && items.length) {
    const hd = ts.getRange(1, pc, 2, 1).getDisplayValues();
    prev = { date: hd[0][0], name: hd[1][0] };
    prevVals = ts.getRange(3, pc, items[items.length - 1].row - 2, 1).getValues().map(r => r[0]);
  }

  const zvals = {};
  if (st) {
    const zs = revZones(ss), last = zs.getLastRow();
    if (last >= 4) {
      const names = zs.getRange(4, 1, last - 3, 1).getValues();
      const rows = revZoneVals(zs, st, names.map((_, i) => i + 4));
      names.forEach((r, i) => { if (rows[i + 4]) zvals[String(r[0]).trim()] = rows[i + 4].map(x => x || 0); });
    }
  }
  /* кг и шт — из справочника; сверка идёт часто, поэтому список единиц помнится 10 минут */
  let du = unitOf;
  try {
    const cache = CacheService.getScriptCache();
    let um = cache.get("dunits");
    if (um == null) {
      const rs = refSheet(false), rl = rs ? rs.getLastRow() : 0, map = {};
      if (rl >= 2) {
        const names = new Set(refBlank().map(x => nameKey(x.n))), f = dailyUnits({ rows: rs.getRange(2, 1, rl - 1, 3).getDisplayValues().map(r => [r[0], r[1], r[2], "", "", "", "", "", "", names.has(nameKey(r[1])) ? 1 : 0]) });
        items.forEach(x => { const u = f(x.n); if (u !== unitOf(x.n)) map[nameKey(x.n)] = u; });
      }
      um = JSON.stringify(map); cache.put("dunits", um, 600);
    }
    const map = JSON.parse(um);
    du = n => map[nameKey(n)] || unitOf(n);
  } catch (e) {}
  const zones = {}, fin = {};
  if (st) {
    ZONES.forEach(z => { if (st.zones[z]) zones[z] = { who: st.zones[z].who }; });
    Object.keys(st.fin || {}).forEach(k => { fin[k] = st.fin[k].name; });
  }

  return {
    now: Date.now(),                         // точное время сервера — сайт сверяет по нему часы
    zones: ZONES,
    day: revDayKey(),                        // ключ текущего дня (9:00–9:00) — с ним сайт шлёт добавления
    open: st ? { date: st.date, key: st.day, zones: zones, fin: fin } : null,
    prev: prev,
    items: items.map(x => {
      const z = zvals[x.n] || ZONES.map(() => 0);
      const pv = prevVals[x.row - 3];
      return { n: x.n, u: du(x.n), z: z, t: round3(z.reduce((a, b) => a + b, 0)),
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
   дальше — столбцы барменов по порядку. «Войти в ревизию» — бармен выбирает зоны подсчёта (одну или несколько),
   его столбец — «Куклин · Клуб и VIP»; «Добавить зону» — ещё один его столбец. Каждая зона считается один раз и
   одним барменом: «Отправить результаты» — его зоны посчитаны (столбцы закрыты). Поправить посчитанную зону может
   только тот, кто её считал: выбрал её снова — его столбец открылся. Ревизия начинается с первой зоны и идёт
   несколько дней, пока не отправлены все зоны; тогда она готова (done), но поправлять её можно до начала следующей.
   Шапка столбца: строка 3 — название ревизии (у «Итога»), 4 — служебный id, 5 — «фамилия · зоны» или «Итог», 6 — дата.
   Столбцы находятся по id в строке 4, поэтому вставка столбцов в лист ничего не ломает.
   Числа складываются здесь, под блокировкой; повтор с тем же id не прибавляется. */
const MREV_NEW = "Новые позиции";
/* Позиции, добавленные в бланк (MREV_ROWS) после того, как лист создан: в живой лист встают сами — один раз, в конец
   своего раздела (под блокировкой, при первом открытии месячной ревизии или справочника). Столбцы ревизий не трогаются,
   «Итог» открытой ревизии получает формулу при сверке. Удалили строку руками — не возвращается: вставленные помнит
   свойство MREV_PATCH. Позиция уже есть в листе (например, в «Новых позициях») — не дублируется. */
const MREV_PATCH = [["Джин", "Джин Баристер", ""], ["Ром", "Ром Девис Айленд", ""], ["Текила", "Текила Ла Павеса", ""],
  ["Сиропы, пюре", "Концентрат в ассортименте", ""], ["Десерты", "Паста фисташковая", "кг"],
  /* новая карта 2026-11: концентраты — в «Концентрат в ассортименте», пюре, сиропы, кордиалы и заготовки — отдельными строками */
  ["Сиропы, пюре", "Пюре мандарин", "кг"], ["Сиропы, пюре", "Пюре гранат", "кг"], ["Сиропы, пюре", "Пюре фейхоа", "кг"],
  ["Сиропы, пюре", "Сироп миндальный", ""], ["Сиропы, пюре", "Сироп солёная карамель", ""],
  ["Сиропы, пюре", "Кордиал пало санто манго ваниль", ""], ["Сиропы, пюре", "Кордиал сенча юдзу", ""], ["Сиропы, пюре", "Кордиал шисо", ""],
  ["Б/алко", "Морс клюквенный", ""], ["Чай, кофе", "Чай эрл грей, кг", "кг"], ["Десерты", "Изюм", "кг"],
  ["Консервация, заморозка", "Ананас консервированный", "кг"], ["Консервация, заморозка", "Вишня коктейльная", "кг"],
  ["Молочные продукты", "Молоко фисташковое", ""], ["Специи, зелень", "Нити чили", "кг"], ["Специи, зелень", "Петрушка свежая", "кг"],
  ["Фрукты, овощи", "Гранат", "кг"],
  ["Настойки", "Штрудель", ""], ["Настойки", "Груша бергамот", ""], ["Настойки", "Фисташка пломбир", ""],
  ["Заготовки", "Сироп чили мёд", ""], ["Заготовки", "Пюре ананас петрушка", ""], ["Заготовки", "Фисташковая база", ""], ["Заготовки", "Сироп имбирный", ""],
  ["Заготовки", "Премикс для лимонада малина маракуйя", ""], ["Заготовки", "Премикс для лимонада фейхоа яблоко", ""],
  ["Премиксы на коктейли", "Секс на пляже", ""], ["Премиксы на коктейли", "Гранатовый Тини", ""], ["Премиксы на коктейли", "Текила Сидр Спайс", ""],
  ["Премиксы на коктейли", "Юдзу Персик", ""], ["Премиксы на коктейли", "Ананас Петрушка", ""], ["Премиксы на коктейли", "Вишнёвый Негрони", ""]];
const mrevPatched = P => { try { return JSON.parse(P.MREV_PATCH || "[]"); } catch (e) { return []; } };
const mrevPatchDue = P => { const done = mrevPatched(P); return MREV_PATCH.some(x => done.indexOf(x[1]) < 0); };
function mrevPatch(sh) {
  const done = mrevPatched(mprops().getProperties());
  const todo = MREV_PATCH.filter(x => done.indexOf(x[1]) < 0);
  if (!todo.length) return 0;
  let rows = mrevRows(sh), n = 0;
  todo.forEach(x => {
    if (!rows.some(r => r.t === "i" && mnorm(r.n) === mnorm(x[1]))) {
      const h = rows.findIndex(r => r.t !== "i" && mnorm(r.n) === mnorm(x[0]));
      if (h >= 0) {
        let j = h + 1;
        while (j < rows.length && rows[j].t === "i") j++;
        const at = rows[j - 1].r;                                // последняя позиция раздела
        sh.insertRowAfter(at);
        sh.getRange(at + 1, 1, 1, 3).breakApart().setFontWeight("normal").setNumberFormat("@").setValues([["", x[1], x[2]]]);
      } else {                                                   // раздел в листе переименовали — вниз, в «Новые позиции»
        let last = Math.max(sh.getLastRow(), 7);
        if (!rows.some(r => r.t === "h" && r.n === MREV_NEW)) {
          last++; ensureRows(sh, last);
          sh.getRange(last, 1, 1, 3).merge().setValue(MREV_NEW).setFontWeight("bold");
        }
        ensureRows(sh, last + 1);
        sh.getRange(last + 1, 1, 1, 3).setNumberFormat("@").setValues([["", x[1], x[2]]]);
      }
      rows = mrevRows(sh); n++;
    }
    done.push(x[1]);
  });
  mprops().setProperty("MREV_PATCH", JSON.stringify(done));
  return n;
}
/* под блокировкой; create — нет листа: создать (месячная ревизия), иначе подождать (справочник берёт MREV_ROWS) */
function mrevPatchIfDue(create) {
  if (!mrevPatchDue(mprops().getProperties())) return 0;
  const sh = mrevSheet(!create);
  return sh ? mrevPatch(sh) : 0;
}

function monthly(p) {
  journalPin();                              // закрепить лист журнала до создания новых листов
  const act = String(p.mrev), rn = clean(p.rn, 60);
  /* сверка без блокировки — если в листе нечего чинить (обычный случай): опрос не держит других */
  if (act === "state") { const st = mrevState(true); if (st) return { ok: true, mrev: st }; }
  revBook();                                 // открыть таблицу до блокировки
  const lock = lockOrBusy(20000);
  try {
    mrevPatchIfDue(true);                    // новые позиции бланка — в лист
    if (act === "state") return { ok: true, mrev: mrevState() };
    if (act === "begin") return mrevBegin(rn, p.zones, p.fresh === "1");
    if (act === "mine") return mrevMine(rn, p.zones);
    if (act === "send") return mrevSend(rn);
    if (act === "drop") return mrevDrop(String(p.cid || ""), rn);
    if (act === "finish") return mrevFinish(String(p.cid || ""), rn);
    if (act === "end") return mrevEnd();
    if (act === "add") return mrevAdd(p, false);
    if (act === "new") return mrevAdd(p, true);
    return { error: "action" };
  } finally {
    lock.releaseLock();
  }
}

function mrevSheet(ro) {
  if (MEMO.mrev) return MEMO.mrev;
  const ss = revBook();
  let sh = ss.getSheetByName(MREV);
  if (sh) return MEMO.mrev = sh;
  if (ro) return null;                                       // листа нет — создать можно только под блокировкой
  sh = MEMO.mrev = ss.insertSheet(MREV);
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
/* dry — ничего не писать, только сказать, сколько ячеек надо поправить. Пишет отрезками подряд идущих ячеек
   (одна запись вместо сотни): в отрезок входят изменённые, формулы как есть и пустые; значение, вписанное руками, — граница. */
function mrevTotals(sh, tc, rows, lastCol, dry) {
  const items = rows.filter(x => x.t === "i");
  if (!items.length) return 0;
  const top = items[0].r, n = items[items.length - 1].r - top + 1;
  const rg = sh.getRange(top, tc, n, 1), fs = rg.getFormulas(), vs = rg.getValues();
  const put = {};
  let cnt = 0;
  items.forEach(x => {
    const i = x.r - top, f = fs[i][0], v = vs[i][0];
    if (!f && v === "") { put[i] = totFormula(tc, x.r, lastCol); cnt++; }
    else if (f && lastCol) { const g = freezeRefs(f, lastCol); if (g !== f) { put[i] = g; cnt++; } }
  });
  if (dry || !cnt) return cnt;
  const cell = i => i in put ? put[i] : fs[i][0] ? fs[i][0] : vs[i][0] === "" ? "" : null;   // null — ручное значение
  for (let i = 0; i < n;) {
    if (cell(i) === null) { i++; continue; }
    let j = i, any = false;
    while (j < n && cell(j) !== null) { if (j in put) any = true; j++; }
    if (any) {
      let a = i, b = j;                                     // по краям — без лишних ячеек
      while (!(a in put)) a++;
      while (!((b - 1) in put)) b--;
      sh.getRange(top + a, tc, b - a, 1).setFormulas(Array.from({ length: b - a }, (_, k) => [cell(a + k)]));
    }
    i = j;
  }
  return cnt;
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

/* ro — только чтение (без блокировки): если в листе есть что чинить — null, тогда сверка идёт под блокировкой */
function mrevState(ro) {
  const sh = mrevSheet(ro);
  if (!sh) return null;
  const rows = mrevRows(sh), ids = mrevIds(sh), P = mprops().getProperties();
  if (P.MREV_OPEN) { if (ro) return null; mprops().deleteProperty("MREV_OPEN"); }   // старая схема (до «Итога»)
  if (ro && mrevPatchDue(P)) return null;                                           // новые позиции бланка — под блокировкой
  let b = null;
  try { b = JSON.parse(P.MREV_BLOCK || "null"); } catch (e) { b = null; }
  const lastRow = Math.max(sh.getLastRow(), 7);
  if (b && b.open) {
    if (ro && (!ids[b.total] || mrevTotals(sh, ids[b.total], rows, 0, true))) return null;
    const tc = ro ? ids[b.total] : mrevTotalCol(sh, b, ids);
    if (!tc) { b.open = false; b.cols.forEach(c => { c.open = false; }); mrevSave(b); }   // «Итог» удалили — ревизия закрыта
    else if (!ro) mrevTotals(sh, tc, rows, 0);                              // строки, добавленные в лист руками
  }
  const cols = b ? b.cols.filter(c => ids[c.id]) : [];
  /* «Итог» и столбцы барменов — одним чтением (они рядом); прошлая ревизия — отдельно */
  const want = (b && ids[b.total] ? [ids[b.total]] : []).concat(cols.map(c => ids[c.id]));
  let blk = null, c0 = 0;
  if (want.length) { c0 = Math.min.apply(null, want); blk = sh.getRange(7, c0, lastRow - 6, Math.max.apply(null, want) - c0 + 1).getValues(); }
  const colVals = c => !c ? [] : blk && c >= c0 && c < c0 + blk[0].length ? blk.map(r => r[c - c0]) : sh.getRange(7, c, lastRow - 6, 1).getValues().map(r => r[0]);
  const val = (arr, r) => { const v = arr[r - 7]; return v === "" || v == null ? null : num(v); };
  const tv = b && ids[b.total] ? colVals(ids[b.total]) : [];
  const cv = cols.map(c => colVals(ids[c.id]));
  const prevId = P.MREV_PREV, pv = prevId && ids[prevId] ? colVals(ids[prevId]) : [];
  rows.forEach(x => {
    if (x.t !== "i") return;
    x.tot = val(tv, x.r);
    x.c = cv.map(a => val(a, x.r));
    x.p = val(pv, x.r);
  });
  return {
    now: Date.now(),
    block: b && ids[b.total] ? { title: b.title, date: b.date, end: b.end || "", open: b.open, started: b.started, done: !!(b.open && b.done),
      zst: mrevZst(cols), cols: cols.map(c => ({ id: c.id, name: c.name, zones: c.zones || null, date: c.date, open: c.open, sent: !!c.sent })) } : null,
    zones: ZONES,
    prev: P.MREV_PREV_TITLE || null,
    /* дата прошлой ревизии (для прихода в автозаявке, пока идёт новая): сохранённая или из её «Итога» (строка 6) */
    prevDate: P.MREV_PREV_DATE || (prevId && ids[prevId] ? String(sh.getRange(6, ids[prevId]).getDisplayValue()).trim() : ""),
    rows: rows
  };
}

/* состояние месячной для сводок менеджера: без блокировки; если в листе есть что чинить (новые строки без формул
   «Итога») — под блокировкой, иначе сводка молча осталась бы без месячной ревизии */
function mrevRead() {
  const st = mrevState(true);
  if (st || !mrevSheet(true)) return st;
  const lock = lockOrBusy(15000);
  try { return mrevState(); } finally { lock.releaseLock(); }
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

/* fresh — «Начать новую ревизию»: прошлая должна быть посчитана целиком, она закрывается («Итог» фиксируется) */
function mrevBegin(name, zones, fresh) {
  if (!name) return { error: "Нет фамилии" };
  const sh = mrevSheet();
  let b = mrevBlock();
  if (b && b.open && !mrevTotalCol(sh, b, mrevIds(sh))) {   // «сломанная» ревизия (без «Итога») — закрыть
    b.open = false; b.cols.forEach(c => { c.open = false; }); mrevSave(b);
  }
  if (b && b.open && fresh) {
    if (!b.done) return { error: "Прошлая ревизия ещё не посчитана — сначала все зоны" };
    mrevEnd();
    b = mrevBlock();
  }
  if (b && b.open) return mrevMine(name, zones);          // ревизия уже идёт — просто свой столбец
  const zl = mrevZoneList(zones);
  if (zl && !zl.length) return { error: "Выберите зону" };
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
  return mrevMine(name, zones);
}

/* зоны с сайта «Клуб|VIP» → в порядке ZONES, без чужих; не передали (старый сайт) — null */
function mrevZoneList(zones) {
  if (zones == null) return null;
  const want = String(zones).split("|").map(z => z.trim());
  return ZONES.filter(z => want.indexOf(z) >= 0);
}
/* «Клуб и VIP», «Кафе, Клуб и VIP» */
const zoneLabel = zl => zl.length < 2 ? zl.join("") : zl.slice(0, -1).join(", ") + " и " + zl[zl.length - 1];

/* состояние зон: {зона: {st: "count" | "sent", who, date, cid}}; свободных зон нет в списке.
   Зону держит открытый столбец (считают) или отправленный (посчитана); закрытый без отправки — нет. */
function mrevZst(cols) {
  const out = {};
  cols.forEach(c => {
    if (!c.zones || !(c.open || c.sent)) return;
    c.zones.forEach(z => { if (!out[z] || c.open) out[z] = { st: c.open ? "count" : "sent", who: c.name, date: c.date, cid: c.id }; });
  });
  return out;
}
/* все зоны отправлены — ревизия готова (для сводок менеджера — как закрытая) */
/* Все зоны отправлены — ревизия готова. Её дата для сводок (строка 6 «Итога») — день, когда отправили последнюю зону
   (день 9:00–9:00): приход до него уже в пересчёте, после — прибавится. «Итог» фиксируется на столбцах этой ревизии —
   числа, вписанные в лист правее, в остаток не попадут. */
function mrevDoneCheck(b, ids) {
  const was = !!b.done, zst = mrevZst(b.cols.filter(c => ids[c.id]));
  b.done = ZONES.every(z => zst[z] && zst[z].st === "sent");
  if (!b.done || was) return;
  const sh = mrevSheet(), tc = mrevTotalCol(sh, b, ids);
  if (!tc) return;
  b.end = revDayDate(revDayKey());
  sh.getRange(6, tc).setNumberFormat("@").setValue(b.end);
  mrevTotals(sh, tc, mrevRows(sh), Math.max(tc + 1, ...b.cols.map(c => ids[c.id] || 0)));
}

/* «Войти в ревизию» / «Добавить зону»: выбранные зоны, которые этот бармен уже считал, — его прежние столбцы
   открываются снова; остальные — один новый столбец «Фамилия · зоны». Чужую зону (считает или посчитал) взять нельзя. */
function mrevMine(name, zones) {
  if (!name) return { error: "Нет фамилии" };
  const zl = mrevZoneList(zones);
  if (zl && !zl.length) return { error: "Выберите зону" };
  const sh = mrevSheet(), b = mrevBlock();
  if (!b || !b.open) return { error: "closed" };
  const ids = mrevIds(sh), me = mnorm(name), live = b.cols.filter(c => ids[c.id]);
  const date = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy");
  if (!zl) {                                                // старый сайт — как раньше, без зон
    if (!live.some(c => c.open && mnorm(c.name) === me)) {
      const c = { id: b.key + "-" + (++b.n), name: name, date: date, open: true };
      mrevNewCol(sh, c.id, "", name, date);
      b.cols.push(c);
      mrevSave(b);
    }
    return { ok: true, mrev: mrevState() };
  }
  const zst = mrevZst(live);
  for (const z of zl) {
    const o = zst[z];
    if (o && mnorm(o.who) !== me) return { error: "Зону «" + z + "» " + (o.st === "count" ? "сейчас считает " : "уже посчитал ") + o.who };
  }
  const reopen = live.filter(c => mnorm(c.name) === me && c.zones && (c.open || c.sent) && c.zones.some(z => zl.indexOf(z) >= 0));
  const fresh = zl.filter(z => !reopen.some(c => c.zones.indexOf(z) >= 0));
  reopen.forEach(c => { c.open = true; c.sent = false; });
  let cid = reopen.length ? reopen[0].id : "";
  if (fresh.length) {
    const c = { id: b.key + "-" + (++b.n), name: name, zones: fresh, date: date, open: true };
    mrevNewCol(sh, c.id, "", name + " · " + zoneLabel(fresh), date);
    b.cols.push(c);
    cid = c.id;
  }
  mrevDoneCheck(b, mrevIds(sh));
  mrevSave(b);
  return { ok: true, cid: cid, mrev: mrevState() };
}

/* «Отправить результаты»: все открытые столбцы этого бармена — посчитаны */
function mrevSend(name) {
  if (!name) return { error: "Нет фамилии" };
  const sh = mrevSheet(), b = mrevBlock();
  if (!b || !b.open) return { error: "closed" };
  const me = mnorm(name), mine = b.cols.filter(c => c.open && mnorm(c.name) === me);
  if (!mine.length) return { error: "closed" };
  /* столбец без единого числа — не «посчитано»: впишите 0 (позиции нет) или «Не считать» */
  const ids = mrevIds(sh), last = Math.max(sh.getLastRow(), 7);
  const empty = mine.filter(c => ids[c.id] && !sh.getRange(7, ids[c.id], last - 6, 1).getValues().some(r => r[0] !== ""));
  if (empty.length) return { error: "В столбце «" + empty.map(c => c.zones ? zoneLabel(c.zones) : c.name).join("», «") + "» нет ни одного числа — впишите 0 у пустых позиций или нажмите «Не считать»" };
  mine.forEach(c => { c.open = false; c.sent = true; c.sentAt = Date.now(); });
  mrevDoneCheck(b, mrevIds(sh));
  mrevSave(b);
  return { ok: true, mrev: mrevState() };
}

/* «Не считать эту зону» — только свой открытый столбец без чисел: столбец убирается, зоны свободны */
function mrevDrop(cid, name) {
  const sh = mrevSheet(), b = mrevBlock(), c = b && b.open && b.cols.find(x => x.id === cid);
  if (!c || !c.open) return { error: "closed" };
  if (mnorm(c.name) !== mnorm(name)) return { error: "Это столбец " + c.name };
  const col = mrevIds(sh)[c.id];
  if (col) {
    const last = Math.max(sh.getLastRow(), 7);
    if (sh.getRange(7, col, last - 6, 1).getValues().some(r => r[0] !== "")) return { error: "В столбце уже есть числа — отмените их (↶) или отправьте результаты" };
    sh.getRange(3, col, 4, 1).clearContent();
  }
  b.cols = b.cols.filter(x => x !== c);
  mrevSave(b);
  return { ok: true, mrev: mrevState() };
}

/* старый сайт: «Завершить мой подсчёт» — один столбец посчитан */
function mrevFinish(cid, name) {
  const b = mrevBlock(), c = b && b.cols.find(x => x.id === cid);
  if (!c) return { error: "closed" };
  if (name && mnorm(c.name) !== mnorm(name)) return { error: "Это столбец " + c.name };
  c.open = false; c.sent = true; c.sentAt = Date.now();
  mrevDoneCheck(b, mrevIds(mrevSheet()));
  mrevSave(b);
  return { ok: true, mrev: mrevState() };
}

function mrevEnd() {
  const sh = mrevSheet(), b = mrevBlock();
  if (!b || !b.open) return { ok: true, mrev: mrevState() };
  const ids = mrevIds(sh), tc = mrevTotalCol(sh, b, ids), has = b.cols.some(c => ids[c.id]);
  if (tc && has) {
    const last = Math.max(tc + 1, ...b.cols.map(c => ids[c.id] || 0));
    mrevTotals(sh, tc, mrevRows(sh), last);               // «Итог» больше не тянет столбцы следующей ревизии
  } else if (tc) {
    /* ни одного столбца барменов — «Итог» пустой: формулы убрать, иначе они потянут столбцы следующей ревизии */
    const lr = Math.max(sh.getLastRow(), 7);
    sh.getRange(7, tc, lr - 6, 1).setValues(Array.from({ length: lr - 6 }, () => [""]));
  }
  b.open = false; b.cols.forEach(c => { c.open = false; });
  if (!b.end) b.end = revDayDate(revDayKey());
  mrevSave(b);
  if (has) {                                              // пустая ревизия прошлой не становится
    mprops().setProperty("MREV_PREV", b.total);
    mprops().setProperty("MREV_PREV_TITLE", b.title);
    mprops().setProperty("MREV_PREV_DATE", b.end);
  }
  return { ok: true, mrev: mrevState() };
}

/* Добавление к позиции (add) или новая позиция (new: название, количество, ед. изм.) —
   в свой открытый столбец. Новая — вниз, в раздел «Новые позиции»; такое название уже есть — прибавляем к нему. */
function mrevAdd(p, isNew) {
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64), v = num(p.v);
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

  let rows = null, row = parseInt(p.row, 10), pos = "";
  const allRows = () => rows || (rows = mrevRows(sh));                  // весь лист — только если строка не на месте
  if (isNew) {
    rows = allRows();
    const same = rows.filter(x => x.t === "i" && mnorm(x.n) === mnorm(text(name, 80)));
    if (same.length) { row = same[same.length - 1].r; pos = same[same.length - 1].n; }
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
  } else if (!(row >= 7) || mnorm(pos = String(sh.getRange(row, 2).getDisplayValue()).trim()) !== mnorm(name)) {
    /* строки сдвинули — ищем по названию; одинаковые (Мандарин) — по разделу и ближайшей строке */
    let sec = "";
    rows = allRows();
    const hit = rows.filter(x => { if (x.t !== "i") { sec = x.n; return false; } x.sec = sec; return mnorm(x.n) === mnorm(name); });
    const same = p.sec ? hit.filter(x => x.sec === p.sec) : [];
    const pool = same.length ? same : hit;
    if (!pool.length) return { error: "position" };
    pool.sort((a, z) => Math.abs(a.r - (row || 0)) - Math.abs(z.r - (row || 0)));
    row = pool[0].r; pos = pool[0].n;
  }
  const tcell = sh.getRange(row, tc);
  if (!tcell.getFormula() && tcell.getValue() === "") tcell.setFormula(totFormula(tc, row, 0));   // строку добавили руками
  const cell = sh.getRange(row, col);
  let cv = cell.getValue();                                               // столбец бармена — простые числа
  if (v || cv === "") { cv = round3(num(cv) + v); cell.setValue(cv); }
  if (p.clr && num(cv) === 0) { cell.setValue(""); cv = ""; }             // отменили всё — снова «не посчитано»
  revLog(revBook()).appendRow([new Date(), clean(p.rn, 60), b.title + " · " + c.name + (c.zones ? " · " + zoneLabel(c.zones) : "") + " " + c.date, isNew ? "новая" : "—", clean(name, 80), v, id]);
  cache.put("mrev:" + id, String(row), 21600);
  SpreadsheetApp.flush();
  const t = sh.getRange(row, tc).getValue();
  if (!pos) pos = String(sh.getRange(row, 2).getDisplayValue()).trim();   // новая строка — как её показывает лист
  return { ok: true, add: { row: row, pos: pos, v: cv === "" ? "" : round3(num(cv)), tot: t === "" ? null : round3(num(t)), isNew: isNew } };
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
  MEMO = {};
  let p = {};
  try { p = JSON.parse(e && e.postData ? e.postData.contents : "{}"); } catch (err) { return jsonOut({ error: "bad" }); }
  if (!tokenOk(p.token)) return jsonOut({ error: "denied" });
  try {
    journalPin();
    if (p.wo === "save") return jsonOut(woSave(p));
    if (p.wo === "rec") return jsonOut(woSave(p, true));
    if (p.order === "send") return jsonOut(orderSave(p));
    if (p.fr) return jsonOut(fridges(p));
    if (p.mgr === "login") return jsonOut(mgrLogin(p));
    if (p.mgr === "out") return jsonOut(mgrLogout(p));
    if (p.mgr === "ref") return jsonOut(mgrRefSet(p));
    if (p.mgr === "in") return jsonOut(mgrIn(p));
    if (p.mgr === "pubseed") return jsonOut(mgrPubSeed(p));
    if (p.mgr === "pubset") return jsonOut(mgrPubSet(p));
    if (p.mgr === "pubstory") return jsonOut(mgrPubStory(p));
    if (p.mgr === "prices") return jsonOut(mgrPrices(p));
    if (/^report(set|send|auto)$/.test(p.mgr || "")) return jsonOut(mgrReportPost(p));
    if (p.mgr === "dishset") return jsonOut(mgrDishSet(p));
    if (p.mgr === "salesput") return jsonOut(mgrSalesPut(p));
    if (p.mgr === "zagset") return jsonOut(mgrZagSet(p));
    if (p.mgr === "revset") return jsonOut(mgrRevSet(p));
    if (p.mgr === "revundo") return jsonOut(mgrRevUndo(p));
    if (p.mgr === "perset") return jsonOut(mgrPerSet(p));
    if (p.mgr === "perundo") return jsonOut(mgrPerUndo(p));
    if (p.mgr === "refauto") return jsonOut(mgrRefAuto(p));
    return jsonOut({ error: "action" });
  } catch (err) {
    console.error("doPost " + p.wo + " " + String(p.id || "") + ": " + (err && err.stack || err));   // видно в «Выполнениях»
    return jsonOut({ error: String(err && err.message || err) });
  }
}
function jsonOut(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* файл в корзине или удалён (в корзине и вся его папка — тоже). fresh — без кэша; иначе ответ помнится 10 минут */
function woTrashed(id, fresh) {
  const cache = CacheService.getScriptCache(), k = "wot:" + id, c = fresh ? null : cache.get(k);
  if (c) return c === "1";
  const gone = woTrashedNow(id);
  if (gone === null) return false;                              // сбой Диска — не судим и не запоминаем
  cache.put(k, gone ? "1" : "0", 600);
  return gone;
}
/* спросить Диск: true — в корзине или удалён («не найден»), false — на месте, null — Диск ответил ошибкой */
function woTrashedNow(id) {
  try { return DriveApp.getFileById(id).isTrashed(); }
  catch (e) { return /not found|no item|не найден|не удалось найти|найти элемент/i.test(String(e && e.message || e)) ? true : null; }
}
/* то же для списка актов — пачкой: кэш одним запросом, Диск — не больше WO_CHECK файлов за раз (новые — первыми);
   остальные считаем на месте и проверим при следующем открытии истории */
const WO_CHECK = 10;
/* id → true (удалён) / false (на месте); не проверенные в этот раз — без ответа (undefined): решает отметка в журнале */
function woGoneMap(ids, max) {
  const out = {};
  if (!ids.length) return out;
  const cache = CacheService.getScriptCache(), got = cache.getAll(ids.map(id => "wot:" + id)) || {}, alive = {}, dead = {};
  let left = max || WO_CHECK;
  ids.forEach(id => {
    const c = got["wot:" + id];
    if (c) { if (c !== "?") out[id] = c === "1"; return; }                // «?» — недавно не ответил Диск: не судим
    if (left <= 0) return;
    left--;
    const g = woTrashedNow(id);
    if (g === null) { cache.put("wot:" + id, "?", 300); return; }      // сбой Диска — не судим; спросим через 5 минут
    out[id] = g;
    (g ? dead : alive)["wot:" + id] = g ? "1" : "0";
  });
  if (Object.keys(alive).length) cache.putAll(alive, 1800);
  if (Object.keys(dead).length) cache.putAll(dead, 3600);
  return out;
}
/* PDF акта удалили с Диска (корзина, удаление) — акт удалён для всех: его нет в истории у барменов, в сводке менеджера,
   в расходе, продажах и отчёте. Отметка — столбец K журнала («Удалён с Диска» + дата): по ней остальные разделы не
   спрашивают Диск. Файл вернули из корзины — при следующей проверке отметка снимается.
   acts: [{fid, rows: [номера строк], mark}], gone — ответ woGoneMap. Пишется под короткой блокировкой; занято — в другой раз. */
const WO_GONE_COL = 11;
function woMarkGone(sh, acts, gone) {
  const ch = acts.filter(x => x.fid && gone[x.fid] !== undefined && !!gone[x.fid] !== !!x.mark);
  if (!ch.length) return;
  let lock = null;
  try { lock = lockOrBusy(3000); } catch (e) { return; }
  try {
    if (String(sh.getRange(1, WO_GONE_COL).getValue()) !== "Удалён с Диска") sh.getRange(1, WO_GONE_COL).setValue("Удалён с Диска").setFontWeight("bold");
    const stamp = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm");
    ch.forEach(x => {
      const v = gone[x.fid] ? stamp : "";
      x.rows.forEach(r => sh.getRange(r, WO_GONE_COL).setNumberFormat("@").setValue(v));
      x.mark = v;
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}
/* акт скрыт: Диск сказал «удалён» или (не проверяли сейчас) в журнале отметка */
const woHidden = (x, gone) => x.fid && (gone[x.fid] === true || (gone[x.fid] === undefined && !!x.mark));

/* первая не удалённая папка / файл из выдачи Диска */
function woAlive(it) { while (it.hasNext()) { const x = it.next(); if (!x.isTrashed()) return x; } return null; }
/* папка вида: id запоминается в свойствах (по имени Диск ищет дольше); папку удалили — ищем по имени или заводим */
function woFolder(kind, create) {
  kind = woKind(kind);
  if (MEMO["dir:" + kind]) return MEMO["dir:" + kind];
  const props = PropertiesService.getScriptProperties(), key = "WO_DIR_" + kind, id = props.getProperty(key);
  let f = null;
  if (id) { try { const x = DriveApp.getFolderById(id); if (!x.isTrashed()) f = x; } catch (e) { f = null; } }
  if (!f) {
    const name = WO_KINDS[kind].folder;
    f = woAlive(DriveApp.getFoldersByName(name)) || (create ? DriveApp.createFolder(name) : null);
    if (f) props.setProperty(key, f.getId());
  }
  return f ? (MEMO["dir:" + kind] = f) : null;
}
/* лист журнала вида. Журнал — таблица в папке вида; id запоминается в свойствах скрипта.
   Журнала ещё нет: create — завести (и перенести старый лист из таблицы ревизии), иначе — null. */
function woSheet(kind, create) {
  kind = woKind(kind);
  const m = MEMO["wo:" + kind];
  if (m && (m.ready || !create)) return m.sh;
  const sh = woSheetOpen(kind, create);
  if (sh) MEMO["wo:" + kind] = { sh: sh, ready: !!create };
  return sh;
}
function woSheetOpen(kind, create) {
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
  MEMO.migFail = false;                                       // таблица не открылась — перенос не закончен, повторим
  [() => SpreadsheetApp.getActiveSpreadsheet(), revBook].forEach(f => {
    try { const b = f(); if (b && !ids[b.getId()]) { ids[b.getId()] = 1; books.push(b); } } catch (e) { MEMO.migFail = true; }
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
/* id уже записанного акта → ссылка на файл ("" — без файла); нет — null */
function woFind(sh, id) {
  const last = sh.getLastRow();
  if (last < 2 || !id) return null;
  try {                                                       // поиск в таблице — быстрее, чем читать весь журнал
    const hit = sh.getRange(2, 10, last - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll();
    return hit.length ? String(sh.getRange(hit[hit.length - 1].getRow(), 8).getValue() || "") : null;
  } catch (e) {}
  const v = sh.getRange(2, 8, last - 1, 3).getValues();
  for (let i = v.length - 1; i >= 0; i--) if (String(v[i][2]) === id) return String(v[i][0] || "");
  return null;
}

/* Акт приходит двумя запросами. «rec» — сразу при «Создать файл», маленький (без PDF, браузер дошлёт его, даже если
   телефон тут же свернут): строки акта — в журнал, акт уже в истории, столбец «Файл» пока пуст. «save» — с PDF:
   файл — на Диск, ссылка — в строки акта (или, если «rec» не дошёл, строки целиком). Оба повторяемы: id акта один. */
function woSave(p, recOnly) {
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64), a = p.act || {}, kind = woKind(a.kind);
  const rows = (Array.isArray(a.rows) ? a.rows : []).slice(0, 200)
    .map(r => [clean(r.n, 120), clean(r.u, 10), num(r.q), kind === "pr" ? "Проработка" : clean(r.why, 120)]).filter(r => r[0]);
  const date = clean(a.date, 20), no = clean(a.no, 20), who = clean(a.who, 80);
  if (!id || !rows.length || !/^\d{2}\.\d{2}\.\d{4}$/.test(date)) return { error: "bad" };
  /* строки, перенесённые из заметки, — списаны этим актом (и при повторе: отметка могла не записаться) */
  const nids = [].concat.apply([], (Array.isArray(a.rows) ? a.rows : []).map(r => String(r && r.nid || "").split(",")))
    .map(x => x.replace(/[^\w-]/g, "")).filter(Boolean);                // строка акта может собрать несколько строк заметки
  const mark = WO_KINDS[kind].file + " " + date + (no ? " №" + no : "") + " · " + (who || "") + " · " + id;
  const lock = lockOrBusy(20000);
  try {
    const sh = woSheet(kind, true), props = PropertiesService.getScriptProperties();
    if (!props.getProperty("WO_MIGRATED_" + kind)) {                      // старые листы переносятся один раз
      try { woMigrate(kind, sh); if (!MEMO.migFail) props.setProperty("WO_MIGRATED_" + kind, "1"); } catch (e) {}
    }
    const seen = woFind(sh, id);
    let url = seen || "", out;
    if (seen === null || (seen === "" && p.pdf && !recOnly)) {
      if (p.pdf && !recOnly) {
        const name = WO_KINDS[kind].file + " " + date + (no ? " №" + no : "") + " — " + (who || "бар").replace(/\.+$/, "") + ".pdf";
        const blob = Utilities.newBlob(Utilities.base64Decode(String(p.pdf)), "application/pdf", name);
        const f = woFolder(kind, true).createFile(blob);
        url = f.getUrl();
        CacheService.getScriptCache().put("wot:" + f.getId(), "0", 1800);  // история не будет проверять новый файл на Диске
      }
      if (seen === "") {                                                  // строки уже в журнале («rec») — дописать ссылку
        const at = woRowsOf(sh, id);
        if (at.length) sh.getRangeList(at.map(r => "H" + r)).setValue(url);
      } else {
        const stamp = new Date(), last = Math.max(sh.getLastRow(), 1);
        ensureRows(sh, last + rows.length);
        const n = rows.length, top = last + 1;
        sh.getRange(top, 1, n, 4).setNumberFormat("@");                   // текст: дата, №, наименование, ед.
        sh.getRange(top, 6, n, 5).setNumberFormat("@");                   // текст: причина, кто, файл, когда, id
        sh.getRange(top, 1, n, WO_HEAD.length)                            // кол-во — числом, чтобы считать суммы
          .setValues(rows.map(r => [date, no, r[0], r[1], r[2], r[3], who, url, Utilities.formatDate(stamp, TZ, "dd.MM.yyyy HH:mm"), id]));
        /* чеклист: «Заполнить списания и отправить в систему» — отмечается сам */
        /* только акт за сегодня (день бара или календарный — ночная смена): старый акт, ушедший позже, сегодняшний пункт не отмечает */
        const aIso = date.split(".").reverse().join("-");
        if (kind === "wo" && [ckDay(), Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd")].indexOf(aIso) >= 0)
          try { ckAuto("d5", who || "—", "Общие дела", "Заполнить списания и отправить в систему"); } catch (e) { console.error("ckAuto: " + e); }
      }
      SpreadsheetApp.flush();                                             // записать до снятия блокировки — повтор увидит id
      out = { ok: true, url: url, rec: true };
    } else out = { ok: true, url: url, rec: true, dup: true };
    /* отметка в заметке — после записи акта: её сбой не мешает сохранить акт (строки уже запечатаны с телефона) */
    if (nids.length) { try { wnDone(nids, mark, id, kind); SpreadsheetApp.flush(); } catch (e) { console.error("wnDone " + id + ": " + e); } }
    return out;
  } finally {
    lock.releaseLock();
  }
}
/* строки журнала с этим id (номера строк) */
function woRowsOf(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  try { return sh.getRange(2, 10, last - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll().map(r => r.getRow()); }
  catch (e) {}
  return sh.getRange(2, 10, last - 1, 1).getValues().map((r, i) => String(r[0]) === id ? i + 2 : 0).filter(Boolean);
}

/* JSONP: wo=check — записан ли акт; wo=list — последние акты */
function writeoffs(p) {
  const sh = woSheet(p.k, false), act = String(p.wo);                     // журнала ещё нет — ни одного акта
  /* saved — акт с PDF на Диске (так его понимают и прежние версии сайта); rec — строки акта уже в журнале, PDF ещё нет */
  if (act === "check") { const u = sh ? woFind(sh, String(p.id || "")) : null; return { ok: true, saved: !!u, rec: u !== null, url: u || "" }; }
  if (act === "list") {
    /* последние WO_LIST актов, у каждого — его позиции (на сайте акт раскрывается). Акт, чей PDF удалён
       с Диска, на сайте не показываем: строки в журнале остаются, их можно стереть там же. */
    const last = sh ? sh.getLastRow() : 0;
    let acts = [], by = {};
    const scan = n => {                                                   // последние n строк журнала (не больше 1500)
      acts = []; by = {};
      const from = Math.max(2, last - n + 1), v = sh.getRange(from, 1, last - from + 1, WO_GONE_COL).getDisplayValues();
      for (let i = v.length - 1; i >= 0; i--) {                           // строки акта идут подряд; снизу — новые
        const r = v[i], id = r[9];
        if (!id) continue;
        let x = by[id];
        if (!x) {
          if (acts.length >= WO_LIST * 2) return true;                    // с запасом — на случай удалённых PDF
          const m = String(r[7] || "").match(/\/d\/([\w-]{10,})/);
          x = by[id] = { id: id, date: r[0], no: r[1], who: r[6], url: r[7], at: r[8], n: 0, rows: [], fid: m ? m[1] : "", rn: [], mark: r[WO_GONE_COL - 1] };
          acts.push(x);
        }
        x.n++;
        x.rows.unshift([r[2], r[3], r[4], r[5]]);
        x.rn.push(from + i);
      }
      return from === 2;                                                  // дошли до начала журнала
    };
    if (last >= 2 && !scan(400)) scan(1500);
    const gone = woGoneMap(acts.map(x => x.fid).filter(Boolean).slice(0, WO_LIST + 10));
    if (sh) woMarkGone(sh, acts.map(x => ({ fid: x.fid, rows: x.rn, mark: x.mark, x: x })), gone);
    const out = acts.filter(x => !woHidden(x, gone)).slice(0, WO_LIST);
    out.forEach(x => { delete x.fid; delete x.rn; delete x.mark; });
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
const WN_HOLD = 24 * 3600e3, WN_V = 2, WN_MAX = 100;                // в заметке (открытые и взятые в акт) — не больше 100 позиций
/* у каждого вида своя заметка: лист «Заметка» в журнале списаний и в журнале проработок */
function wnSheet(create, kind) {
  const log = woSheet(woKind(kind), create);
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
/* взятые в акт (ещё не списанные) — заметка показывает их серыми: кто взял и когда вернутся, если акт не создадут */
const wnHeld = rows => rows.filter(x => x.held).map(x => Object.assign(wnItem(x), { took: x.took, until: x.since + WN_HOLD }));
const wnAns = (rows, who, more, kind) => Object.assign({ ok: true, v: WN_V, k: woKind(kind), items: wnOpen(rows), mine: wnMine(rows, who), held: wnHeld(rows) }, more || {});
const wnIds = v => String(v || "").split(",").map(x => x.replace(/[^\w-]/g, "").slice(0, 64)).filter(Boolean);

function wnote(p) {
  const act = String(p.wn), who = clean(p.rn, 60), dev = String(p.dev || "").replace(/[^\w-]/g, "").slice(0, 40);
  const kind = woKind(p.k);                                               // прежние версии сайта — без k: заметка списаний
  if (act === "list") return wnAns(wnRows(wnSheet(false, kind)), who, null, kind);
  if (["add", "take", "back", "seal", "got"].indexOf(act) < 0) return { error: "action" };
  const lock = lockOrBusy(20000);
  try {
    const sh = wnSheet(true, kind), rows = wnRows(sh), want = wnIds(p.ids), now = new Date();
    const stamp = Utilities.formatDate(now, TZ, "dd.MM.yyyy HH:mm");
    if (act === "add") {
      const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 64), n = clean(p.n, 120), q = num(p.q);
      const why = kind === "pr" ? "Проработка" : clean(p.why, 120);         // у проработки причина всегда одна
      if (!id || !n || !(q > 0)) return { error: "bad" };
      if (!rows.some(x => x.id === id)) {
        if (rows.filter(x => !x.closed).length >= WN_MAX) return wnAns(rows, who, { error: "full", max: WN_MAX, ok: false }, kind);
        const top = Math.max(sh.getLastRow(), 1) + 1;
        ensureRows(sh, top);
        sh.getRange(top, 1, 1, 3).setNumberFormat("@"); sh.getRange(top, 5, 1, 2).setNumberFormat("@");
        sh.getRange(top, 1, 1, 7).setValues([[id, n, clean(p.u, 10), q, why, who, now]]);
        SpreadsheetApp.flush();
        rows.push({ id: id, n: n, u: clean(p.u, 10), q: q, why: why, who: who, at: stamp.slice(0, 5), took: "", since: 0, done: "", dev: "", closed: false, held: false });
      }
      return wnAns(rows, who, null, kind);
    }
    if (!who || !want.length) return { error: "bad" };
    const mine = x => want.indexOf(x.id) >= 0;
    if (act === "take") {
      /* свободные (и вернувшиеся через 24 часа) — закрепить за барменом и телефоном; уже его — оставить; чужие и закрытые — мимо */
      const rs = rows.filter(x => mine(x) && !x.closed && !x.held);
      wnPut(sh, 8, rs, who, "@"); wnPut(sh, 9, rs, now, "dd.MM.yyyy HH:mm"); wnPut(sh, 11, rs, dev, "@");
      rs.forEach(x => { x.took = who; x.since = now.getTime(); x.dev = dev; x.held = true; });
      SpreadsheetApp.flush();
      return wnAns(rows, who, { took: wnMine(rows, who).filter(mine) }, kind);
    }
    if (act === "back") {                                                  // бармен отменил перенос — строки снова в заметке
      const rs = rows.filter(x => mine(x) && x.held && x.took === who);
      if (rs.length) sh.getRangeList(rs.map(x => "H" + x.row + ":I" + x.row).concat(rs.map(x => "K" + x.row))).setValue("");
      rs.forEach(x => { x.took = ""; x.since = 0; x.dev = ""; x.held = false; });
      SpreadsheetApp.flush();
      return wnAns(rows, who, null, kind);
    }
    if (act === "seal") {
      /* акт создан на телефоне: строки больше не возвращаются, даже если копия акта придёт позже */
      const aid = String(p.act || "").replace(/[^\w-]/g, "").slice(0, 64), sealed = [], conflict = [];
      if (!aid) return { error: "bad" };
      const rs = [];
      rows.forEach(x => {
        if (!mine(x)) return;
        if (x.closed){ (x.done.indexOf(aid) >= 0 ? sealed : conflict).push(x.id); return; }
        if (x.held && x.took !== who){ conflict.push(x.id); return; }
        rs.push(x);
      });
      wnPut(sh, 10, rs, WN_SEAL + aid + " · " + who + " · " + stamp + " · ждёт копии на Диске", "@");
      rs.forEach(x => { x.done = WN_SEAL + aid; x.closed = true; x.held = false; sealed.push(x.id); });
      SpreadsheetApp.flush();
      return wnAns(rows, who, { sealed: sealed, conflict: conflict }, kind);
    }
    /* got — от прежней версии сайта: строка дошла до её акта, значит закрыта (та версия не отмечала акты) */
    const rs = rows.filter(x => mine(x) && !x.closed && x.took === who);
    wnPut(sh, 10, rs, "дошло до акта (прежняя версия сайта) " + stamp, "@");
    rs.forEach(x => { x.closed = true; x.held = false; });
    SpreadsheetApp.flush();
    return wnAns(rows, who, null, kind);
  } finally {
    lock.releaseLock();
  }
}
/* копия акта дошла — его строки из заметки списаны окончательно (из woSave, под блокировкой; повтор безопасен).
   Строка уже списана другим актом — помечаем «⚠ также в акте …», чтобы двойное списание было видно в листе. */
function wnDone(ids, mark, aid, kind) {
  const sh = wnSheet(false, kind);
  if (!sh || !ids.length) return;
  const plain = [];
  wnRows(sh).forEach(x => {
    if (ids.indexOf(x.id) < 0) return;
    if (x.done.indexOf(aid) >= 0 && x.done.indexOf(WN_SEAL) !== 0) return;          // уже отмечена этим актом
    const other = /^Акт /.test(x.done) || (x.done.indexOf(WN_SEAL) === 0 && x.done.indexOf(aid) < 0);
    if (other) sh.getRange(x.row, 10).setNumberFormat("@").setValue(x.done + " ⚠ также в акте " + mark);
    else plain.push(x);
  });
  wnPut(sh, 10, plain, mark, "@");
}
/* одно значение в один столбец нескольких строк — одним вызовом, а не по ячейке */
function wnPut(sh, col, rows, value, fmt) {
  if (!rows.length) return;
  const rl = sh.getRangeList(rows.map(x => colA1(col) + x.row));
  if (fmt) rl.setNumberFormat(fmt);
  rl.setValue(value);
}

/* Один раз в редакторе: выберите noteToProrabotka → «Выполнить». До разделения заметок всё записывали в одну —
   заметку списаний. Функция переносит её открытые строки (не взятые в акт и не списанные) в заметку проработки,
   причина — «Проработка». Что перенесено — в «Журнале выполнения». Запускайте, пока в заметке списаний только проработка. */
function noteToProrabotka() {
  MEMO = {};
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const from = wnSheet(false, "wo");
    const rows = from ? wnRows(from).filter(x => !x.closed && !x.held) : [];
    if (!rows.length) { Logger.log("В заметке списаний нет открытых строк — переносить нечего."); return; }
    const to = wnSheet(true, "pr");
    const v = rows.map(x => {
      const r = from.getRange(x.row, 1, 1, WN_HEAD.length).getValues()[0];
      r[4] = "Проработка"; r[7] = ""; r[8] = ""; r[9] = ""; r[10] = "";
      return r;
    });
    const top = Math.max(to.getLastRow(), 1) + 1;
    ensureRows(to, top + v.length - 1);
    to.getRange(top, 1, v.length, 3).setNumberFormat("@");
    to.getRange(top, 5, v.length, 2).setNumberFormat("@");
    to.getRange(top, 1, v.length, WN_HEAD.length).setValues(v);
    rows.map(x => x.row).sort((a, b) => b - a).forEach(r => from.deleteRow(r));   // снизу вверх — номера не сбиваются
    SpreadsheetApp.flush();
    rows.forEach(x => Logger.log("→ в заметку проработки: " + x.n + " — " + x.q + " " + x.u + " (" + x.who + ")"));
    Logger.log("Готово: перенесено " + rows.length + ".");
  } finally {
    lock.releaseLock();
  }
}

/* Один раз в редакторе: выберите checkWriteoff → «Выполнить» → разрешите доступ к Диску.
   Заводит папки и журналы, а старые листы «Списания» / «Проработки» из таблицы ревизии переносит в журналы. */
function checkWriteoff() {
  MEMO = {};
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
const MREV_ROWS = [[7,"h","Вермуты","","",1],[8,"i","","Вермут Мартини Бьянко","литр",0],[9,"i","","Вермут Мартини Россо","литр",0],[10,"i","","Вермут Мартини Фиеро","литр",0],[11,"i","","Вермут Мартини Экстра Драй","литр",0],[12,"h","Германия","","",1],[13,"i","","Португизер","",0],[14,"i","к","Гевюрцтраминер Ханс Баер","",1],[15,"i","к","Урбан Рислинг","",1],[16,"h","Испания","","",1],[17,"i","к","Сан валентин парельяда","",0],[18,"i","к","Матсу","",1],[19,"h","Италия","","",1],[20,"i","к","Гави Ла Сколько","",0],[21,"i","к","Пфефферер","",0],[22,"i","к","Верментино Вилла Солаис","",0],[23,"i","к","Меро Каза Дкфра","",0],[24,"i","к","Санджовезе Алма Романа","",0],[25,"h","Новая Зеландия","","",1],[26,"i","","мисти клифф совиньон блан","",1],[27,"h","Португалия","","",1],[28,"i","к","Маре Гриль Белое","",0],[29,"i","к","Маре Гриль Розе","",0],[30,"h","Россия","","",1],[31,"i","к","Голубицкое Каберне совиньон","",0],[32,"h","США","","",1],[33,"i","к","Зинфандель Краб энд Мо","",0],[34,"h","Франция","","",1],[35,"i","к","Ле Гранд Нуар Пино Нуар","",0],[36,"i","к","Бордо Ситран Руж","",0],[37,"i","к","Шабли Жан Марк","",0],[38,"h","Чили","","",1],[39,"i","","Токорнал Шардоне","",0],[40,"i","","Токорнал Розе","",0],[41,"i","","Селар Селекшн Совиньон Блан","",1],[42,"i","","Селар Селекшн Карменер","",1],[43,"h","ЮАР","","",1],[44,"i","к","Шенен Блан Кейп ориджинал","",1],[45,"h","Шампанские","","",1],[46,"i","","Дево Кюве","",0],[47,"i","","Вдова Клико","",1],[48,"h","Вина игристые","","",1],[49,"i","1157","Игристое розлив","литр",0],[50,"i","","Тет де Шеваль брют","",0],[51,"i","","Мартини Просекко","",0],[52,"i","","Мартини Просекко Розе","",0],[53,"i","","Мартини Асти","",0],[54,"i","","Мартини Брют","",1],[55,"i","","Бруни Просекко","",1],[56,"i","","Мартини Секко","",1],[57,"i","","Мучо Мас","",1],[58,"h","Виски","","",1],[59,"i","456","Дюарс Уайт Лейбл","литр",0],[60,"i","","Дюарс 8","",0],[61,"i","465","Виски Чивас Ригал 12лет","литр",0],[62,"i","","Талмор Дью","",0],[63,"i","","Джемесон","",0],[64,"i","","Джим Бим","",0],[65,"i","","Манки Шолдер","",0],[66,"i","","Гленфиддик 12 лет","",0],[67,"i","","Виски Хаус","",0],[68,"i","","Аберфелди","",0],[69,"i","","Тилинг","",0],[70,"h","Водка","","",1],[71,"i","","Лаб груша","",0],[72,"i","","Беленькая","",0],[73,"i","","Белуга Нобл","",0],[74,"i","","Белуга Голд Лайн","",0],[75,"i","","Ортодокс","",0],[76,"i","","Грей Гуз","",1],[77,"i","","Арктика","",1],[78,"i","","Онегин","",1],[79,"h","Джин","","",1],[80,"i","589","Джин Хендрикс","литр",0],[81,"i","","Хинт","",0],[82,"i","","Босфорд","",0],[83,"i","","Антидот","",0],[84,"i","","Хопперс оригинал","",0],[85,"i","","Хопперс лаванда","",0],[86,"i","","Хопперс мандарин","",0],[87,"i","","Бомбей Сапфир","",0],[88,"i","","Джин Баристер","",0],[89,"h","Коньяк","","",1],[90,"i","","Бисквит вс","",0],[91,"i","","Бисквит всоп","",0],[92,"i","","Ной 5 зв","",0],[93,"i","","Камю вс","",0],[94,"i","","Камю всоп","",0],[95,"h","Ликеры","","",1],[96,"i","1220","Ликер Амаретто","литр",0],[97,"i","","Ликер Банан","",0],[98,"i","1111","Ликер Бенедиктин","литр",0],[99,"i","198","Ликер Бэйлис","литр",0],[100,"i","","Ликер Какао","",0],[101,"i","","Ликер Кофе","",0],[102,"i","","Ликер мараскино","",0],[103,"i","","Ликер Смородина","",0],[104,"i","346","Ликер Трипл Сек","литр",0],[105,"i","","Ликер Фиалка","",0],[106,"i","479","Ликер Ягермайстер","литр",0],[107,"i","","Италикус","",0],[108,"i","","Ликер мята","",0],[109,"i","","Белуга Хантинг Ягодная","",0],[110,"i","","Белуга Хантинг Травяная","",0],[111,"i","","Белуга Ботаника Роза Лайм","",0],[112,"i","","Белуга Ботаника Огурец Мята","",0],[113,"i","","Фернет Бранка","",0],[114,"i","","Бранка менте","",0],[115,"h","Напитки, настойки","","",1],[116,"i","1031","Ангостура Биттерс","литр",0],[117,"i","343","Апероль","литр",0],[118,"i","1174","Апперитив Земляника","литр",0],[119,"i","1155","Херес","литр",0],[120,"i","","Кампари","",0],[121,"i","","Сарти","",0],[122,"i","","Соджу","",0],[123,"h","Ром","","",1],[124,"i","","Бакарди Оакхарт","",0],[125,"i","","Ром Хаус","",0],[126,"i","","Матусалем платино","",0],[127,"i","","Матусалем 7","",0],[128,"i","","Ангостура Тамбу","",0],[129,"i","","Ром Девис Айленд","",0],[130,"h","Текила","","",1],[131,"i","","Текила Хаус","",0],[132,"i","","Хосе Куэрво сильвер","",0],[133,"i","","Хосе Куэрво Репосадо","",0],[134,"i","","Текила Ла Павеса","",0],[135,"h","Б/алко","","",1],[136,"i","","Сан Бенедето","шт",1],[137,"i","537","Вода Бон аква/Байкал","шт",0],[138,"i","","Байкал стекло","",0],[139,"i","199","Кола тоник литровые","литр",0],[140,"i","6","Вода минеральная розлив","литр",0],[141,"i","627","Кока кола тоник 330 мл","шт",0],[142,"i","626","Ред Булл 250мл","шт",0],[143,"i","139","Сок, л","литр",0],[144,"i","","Лимонад Шихан","",0],[145,"i","","Сок Лайма","",0],[146,"i","","милкис","",0],[147,"i","","Вода кокосовая","",0],[148,"h","Пиво в бутылках","","",1],[149,"i","","Корона","",0],[150,"i","","Блю Мун","",0],[151,"i","","Бакалар темный","",0],[152,"i","","МортСюбите","",0],[153,"i","","Августинер","",0],[154,"i","","Сидр","",0],[155,"i","","Крушовице безалко","",0],[156,"i","","Ла коста фреска","",0],[157,"i","","Балтика нулевка грейпфрут","",1],[158,"h","Пиво разлив","","",1],[159,"i","","Шихан/Жигули","",0],[160,"i","","Мейзон","",0],[161,"i","","Крушовице","",0],[162,"h","Сиропы, пюре","","",1],[163,"i","1319","Пюре Маракуйя с/м","кг",0],[164,"i","","Пюре в ассортименте","",0],[165,"i","","Сироп в ассортименте","",0],[166,"i","","Клавис","",0],[167,"i","","Концентрат в ассортименте","",0],[168,"h","Чай, кофе","","",1],[169,"i","1159","Горячиий шоколад","кг",0],[170,"i","11","Кофе","кг",0],[171,"i","613","Чай ассам, кг","кг",0],[172,"i","610","Чай башкирский, кг","кг",0],[173,"i","617","Чай гречишный, кг","кг",0],[174,"i","320","Чай лапсанг сушонг","кг",0],[175,"i","616","Чай молочный улун, кг","кг",0],[176,"i","614","Чай пуэр, кг","кг",0],[177,"i","611","Чай сладкий поцелуй, кг","кг",0],[178,"i","1217","Чай таежный, кг","кг",0],[179,"i","612","Чай татарский, кг","кг",0],[180,"i","615","Чай те гуань инь, кг","кг",0],[181,"i","","Саган Дайля","",0],[182,"i","","Матча","",0],[183,"i","","Каркаде","",0],[184,"i","","Роза","",0],[185,"i","","Ройбуш","",0],[186,"i","","Марокканская мята","",0],[187,"i","","Дикая вишня","",0],[188,"h","Десерты","","",1],[189,"i","56","Мёд","кг",0],[190,"i","301","Сахар","кг",0],[191,"i","121","Сахарная вата","кг",0],[192,"i","","Сахар ванильный","",0],[193,"i","203","Фруктоза","кг",0],[194,"i","215","Шоколад, кг","кг",0],[195,"i","","Конфеты","",0],[196,"i","","варенье шишковое","",0],[197,"i","","Ванилин","",0],[198,"i","","Малина сублимированная","",0],[199,"i","","Паста фисташковая","кг",0],[200,"h","Заправки, соуса, масло","","",1],[201,"i","126","Соус Табаско","литр",0],[202,"i","","ворчестер","",0],[203,"h","Консервация, заморозка","","",1],[204,"i","103","Ягоды с/м","кг",0],[205,"h","Молочные продукты","","",1],[206,"i","109","Молоко","литр",0],[207,"i","15","Молоко кокосовое","литр",0],[208,"i","","Молоко сгущ","",0],[209,"i","110","Сливки 33 % и 11%","литр",0],[210,"i","","Мороженое","",0],[211,"i","14","Яичный белок, желток","литр",0],[212,"h","Специи, зелень","","",1],[213,"i","213","Пищевая кислота","кг",0],[214,"i","125","Соль","кг",0],[215,"i","41","Специи","кг",0],[216,"i","983","Корица в палочках","кг",0],[217,"i","","Желатин","",1],[218,"h","Фрукты, овощи","","",1],[219,"i","20","Апельсин свежий","кг",0],[220,"i","400","Клубника свежая","кг",0],[221,"i","","Малина","",0],[222,"i","18","Лайм свежий","кг",0],[223,"i","13","Лимон свежий","кг",0],[224,"i","147","Огурец свежий","кг",0],[225,"i","17","Яблоко свежее","кг",0],[226,"i","","Фейхоа","",0],[227,"i","","Грейп","",0],[228,"i","","Груша","",0],[229,"i","","Имбирь","",0],[230,"i","","Мандарин","",0],[231,"i","","Маракуйя","",0],[232,"i","319","Тархун","кг",0],[233,"i","318","Щавель, шпинат свежий","кг",0],[234,"i","","Хрен","",0],[235,"i","154","Лимонная трава","кг",0],[236,"i","170","Листья лайма","кг",0],[237,"i","152","Базилик/розмарин/мята/тимьян","кг",0],[238,"i","","Папая сушеная","",0],[239,"h","П/ф бар","","",1],[240,"h","Настойки","","",1],[241,"i","","Малина мята","",0],[242,"i","","Вишня виски","",0],[243,"i","","Айриш","",0],[244,"i","","Лимончелло","",0],[245,"i","","Мандарин","",0],[246,"i","","Маракуйя Пломбир","",0],[247,"i","","Клубника каркаде","",0],[248,"s","","Заготовки","",1],[249,"i","313","Микс кислот","литр",0],[250,"i","326","Сироп сахарный","литр",0],[251,"i","1009","Фреш апельсиновый пф","литр",0],[252,"i","21","Лимонный сок пф","литр",0],[253,"i","","Облепиха шраб","",0],[254,"i","","Кордиал Гибискус","",0],[255,"i","","Пена игристого","",0],[256,"i","","Пена пломбир","",0],[257,"i","","Медовый сироп","",0],[258,"i","","Колд брю","",0],[259,"i","","Сироп Щавель пф","",0],[260,"i","","Сироп Базилик п/ф","",0],[261,"i","","Кордиал чили барбарис","",0],[262,"i","","Кордиал цитрусовый","",0],[263,"i","","Кордиал цитрус тархун","",0],[264,"i","","Пюре вишня п/ф","",0],[265,"i","","Премикс для лимонада вишня персик","",0],[266,"i","","Лимонад грейпфрут","",0],[267,"s","","Премиксы на коктейли","",1],[268,"i","924","Пф для Лонг Айленд","литр",0],[269,"i","928","Пф для Негрони","литр",0],[270,"i","","порнстар мартини (без игристого)","",0],[271,"i","","Сигма бой","",0],[272,"i","","Розовая пантера","",0],[273,"i","","Мандариновый Спритс","",0],[274,"i","","Пинк Леди","",0],[275,"i","","Вишневый Пирог","",0],[276,"i","","Брекфест Тини","",0],[277,"i","","Тропики","",0],[278,"i","","Чили барбарис","",0],[279,"i","","Саммер Спритц","",0],[280,"i","","Огуречный хьюго","",0],[281,"i","","Груша жасмин","",0],[282,"i","","Блю Колада","",0],[283,"i","","Май тай","",0]];

/* Проверка ревизии: выберите checkRevision в списке функций вверху редактора и нажмите
   «Выполнить». В первый раз Google попросит разрешение — дайте его. Результат —
   в «Журнале выполнения» внизу. После этого выпустите новую версию развертывания. */
function checkRevision() {
  MEMO = {};
  const ss = revBook();
  Logger.log("Таблица ревизии: «" + ss.getName() + "», листы: " + ss.getSheets().map(s => s.getName()).join(", "));
  const ts = revTotal(ss);
  const pos = revPositions(ts);
  Logger.log("Лист «" + ts.getName() + "»: позиций " + pos.length + " — " + pos.map(x => x.n).join(", "));
  Logger.log("Ежедневная ревизия сегодня: " + JSON.stringify(revDay(false)));
  const ms = mrevSheet();
  Logger.log("Лист «" + ms.getName() + "»: позиций " + mrevRows(ms).filter(x => x.t === "i").length + ", месячная ревизия: " + JSON.stringify(mrevBlock()));
  Logger.log("Всё в порядке.");
}

/* ═════════════ Бар-менеджер ═════════════
   Отдельный пароль менеджера. Задать или сменить: «Настройки проекта» (шестерёнка слева) → «Свойства скрипта» →
   «Добавить свойство»: MGR_PASSWORD = пароль → «Сохранить». При первом входе пароль заменяется своим хэшем
   (MGR_HASH), открытый — удаляется из свойств; при смене все прежние входы менеджера сбрасываются.
   Вход — POST {mgr: "login", pw}: верный пароль → ключ на MGR_DAYS дней (здесь хранится только его хэш).
   5 неверных паролей за 15 минут — пауза 15 минут. Данные — JSONP {mgr: "...", mk: ключ}. */
const MGR_DAYS = 30;
const MGR_MAX_KEYS = 20;                                               // столько телефонов менеджера помнится одновременно

function sha(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}
/* новый пароль из свойств → хэш; прежние ключи — недействительны */
function mgrSetup(props) {
  const pw = props.getProperty("MGR_PASSWORD");
  if (!pw) return;
  const salt = Utilities.getUuid();
  props.setProperties({ MGR_SALT: salt, MGR_HASH: sha(salt + pw), MGR_KEYS: "{}" });
  props.deleteProperty("MGR_PASSWORD");
}
function mgrKeys(props) {
  let k = {};
  try { k = JSON.parse(props.getProperty("MGR_KEYS") || "{}") || {}; } catch (e) {}
  const now = Date.now();
  Object.keys(k).forEach(h => { if (!(k[h] > now)) delete k[h]; });
  return k;
}
function mgrLogin(p) {
  const props = PropertiesService.getScriptProperties(), cache = CacheService.getScriptCache();
  const lock = lockOrBusy(10000);
  try {
    mgrSetup(props);
    const hash = props.getProperty("MGR_HASH");
    if (!hash) return { error: "nomgr" };
    const fails = Number(cache.get("mgrfail") || 0);
    if (fails >= 5) return { error: "wait" };
    if (sha(props.getProperty("MGR_SALT") + String(p.pw || "")) !== hash) {
      cache.put("mgrfail", String(fails + 1), 900);
      return { error: "pw" };
    }
    cache.remove("mgrfail");
    const key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""), k = mgrKeys(props);
    k[sha(key)] = Date.now() + MGR_DAYS * 864e5;
    const keep = Object.keys(k).sort((a, b) => k[b] - k[a]).slice(0, MGR_MAX_KEYS), out = {};
    keep.forEach(h => { out[h] = k[h]; });
    props.setProperty("MGR_KEYS", JSON.stringify(out));
    return { ok: true, mk: key, until: k[sha(key)] };
  } finally { lock.releaseLock(); }
}
function mgrLogout(p) {
  const props = PropertiesService.getScriptProperties(), lock = lockOrBusy(10000);
  try {
    const k = mgrKeys(props);
    delete k[sha(String(p.mk || ""))];
    props.setProperty("MGR_KEYS", JSON.stringify(k));
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function mgrOk(mk) {
  if (!mk || String(mk).length > 100) return false;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("MGR_PASSWORD")) return false;                 // пароль сменили — войти заново
  return !!(mgrKeys(props)[sha(String(mk))]);
}

/* данные для вкладки «Менеджер» */
function manager(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  if (p.mgr === "wo") return mgrWo(p);
  if (p.mgr === "ref") return mgrRef();
  if (p.mgr === "order") return mgrOrder();
  if (p.mgr === "orders") return mgrOrders(p);
  if (p.mgr === "inlist") return mgrInList(p);
  if (p.mgr === "usage") return mgrUsage(p);
  if (p.mgr === "pubraw") return mgrPubRaw();
  if (p.mgr === "report") return mgrReport(p);
  if (p.mgr === "dishes") return mgrDishes();
  if (p.mgr === "period") return mgrPeriod(p);
  if (p.mgr === "sales") return mgrSales(p);
  if (p.mgr === "zags") return mgrZags();
  if (p.mgr === "revget") return mgrRevGet(p);
  if (p.mgr === "refauto") return mgrRefAuto(p);
  if (p.mgr === "reportto") return { ok: true, emails: reportTo(), auto: reportOn() };
  return { error: "action" };
}
/* строки журналов списаний и проработок за период (даты «с» и «по» включительно, ГГГГ-ММ-ДД):
   [дата акта, №, наименование, ед., кол-во, причина, кто, файл, id]. Сводку считает сайт. */
function mgrWo(p) {
  const iso = d => { const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; };
  const from = /^\d{4}-\d{2}-\d{2}$/.test(p.from || "") ? p.from : "0000-00-00";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(p.to || "") ? p.to : "9999-99-99";
  const out = { ok: true, from: from, to: to, gone: 0 };
  Object.keys(WO_KINDS).forEach(kind => {
    const sh = woSheet(kind, false), last = sh ? sh.getLastRow() : 0, rows = [], acts = {};
    if (last >= 2) {
      sh.getRange(2, 1, last - 1, WO_GONE_COL).getValues().forEach((r, i) => {
        const d = iso(String(r[0]).trim()), id = String(r[9]);
        if (!d || d < from || d > to || !r[9]) return;
        const a = acts[id] || (acts[id] = { fid: (String(r[7]).match(/\/d\/([\w-]{10,})/) || [])[1] || "", rows: [], mark: String(r[WO_GONE_COL - 1] || ""), list: [] });
        a.rows.push(i + 2);
        a.list.push([String(r[0]).trim(), String(r[1]), String(r[2]), String(r[3]), num(r[4]), String(r[5]), String(r[6]), String(r[7]), id]);
      });
      /* PDF удалили с Диска — акт в сводку не попадает (как и в историю у барменов); новые акты — первыми на проверку */
      const all = Object.keys(acts).map(k => acts[k]).reverse(), gone = woGoneMap(all.map(a => a.fid).filter(Boolean), 40);
      woMarkGone(sh, all, gone);
      all.reverse().forEach(a => { if (woHidden(a, gone)) out.gone++; else a.list.forEach(x => rows.push(x)); });
    }
    out[kind] = rows;
  });
  return out;
}

/* ── Справочник позиций (бар-менеджер) ──
   Лист «Справочник» в таблице ревизии: строка на каждую позицию бланка месячной ревизии, по разделам.
   Позиции и разделы берутся из бланка сами (новые дописываются вниз при каждом открытии справочника на сайте),
   остальное заполняет менеджер — прямо здесь или на сайте («Менеджер» → «Справочник»).
   Код R-Keeper — из столбца A бланка, если там число. Тара — объём или вес одной бутылки / упаковки в единицах
   позиции (0,7 — бутылка 0,7 л); норма — сколько держать, в тех же единицах. */
const REF = "Справочник";
const REF_HEAD = ["Раздел", "Позиция", "Ед. изм.", "Код R-Keeper", "Тара", "Норма (держать)", "Поставщик", "Цена закупки", "Заметка",
  "Название в R-Keeper", "Коэф. R-Keeper", "Ед. R-Keeper"];               // J, K, L — запоминает загрузка прихода (K — для единицы L)
const REF_F = ["u", "code", "tara", "norm", "sup", "price", "note"];      // столбцы C…I
const refKey = (sec, n) => [sec, n].map(x => String(x).trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ")).join("|");

function refSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(REF);
  if (sh && create && sh.getLastColumn() < REF_HEAD.length)           // лист из прошлой версии — дописать шапку J, K
    sh.getRange(1, 1, 1, REF_HEAD.length).setValues([REF_HEAD]).setFontWeight("bold");
  if (sh || !create) return sh;
  const nsh = ss.insertSheet(REF);
  nsh.getRange(1, 1, 1, REF_HEAD.length).setValues([REF_HEAD]).setFontWeight("bold");
  nsh.setFrozenRows(1);
  nsh.setColumnWidth(1, 150);
  nsh.setColumnWidth(2, 260);
  return nsh;
}
/* позиции бланка по порядку: {sec, n, u, code}. Лист месячной ревизии (с дописанными позициями) или встроенный бланк */
function refBlank() {
  const ms = mrevSheet(true), out = [];
  let rows;
  if (ms && ms.getLastRow() >= 7) rows = ms.getRange(7, 1, ms.getLastRow() - 6, 3).getDisplayValues();
  else rows = MREV_ROWS.map(x => x[1] === "h" ? [x[2], "", ""] : [x[2], x[3], x[4]]);
  let sec = "";
  rows.forEach(r => {
    const a = String(r[0]).trim(), b = String(r[1]).trim(), c = String(r[2]).trim();
    if (b && !a && !c && /^(Заготовки|Премиксы на коктейли)$/.test(b)) sec = b;
    else if (b) out.push({ sec: sec, n: b, u: c, code: /^\d+$/.test(a) ? a : "" });
    else if (a) sec = a;
  });
  return out;
}
/* новые позиции бланка — в справочник (под блокировкой) */
function refSync() {
  const blank = refBlank(), sh = refSheet(true), last = sh.getLastRow();
  const have = new Set(last >= 2 ? sh.getRange(2, 1, last - 1, 2).getDisplayValues().map(r => refKey(r[0], r[1])) : []);
  const add = [], seen = new Set();
  blank.forEach(x => { const k = refKey(x.sec, x.n); if (!have.has(k) && !seen.has(k)) { seen.add(k); add.push(x); } });
  if (add.length) {
    ensureRows(sh, last + add.length);
    sh.getRange(last + 1, 1, add.length, 4).setNumberFormat("@").setValues(add.map(x => [x.sec, x.n, x.u, x.code]));
  }
  return blank;
}
/* значения как текст: числа — с запятой и без оформления таблицы («9 500,00 ₽» → «9500») */
function refVals(v) {
  return v.map(r => r.map(x => typeof x === "number" ? String(Math.round(x * 1000) / 1000).replace(".", ",") : x instanceof Date ? "" : String(x)));
}
/* названия позиций ежедневной ревизии (лист «Итог») — по ним сайт отделяет то, что входит в расчёт недостачи */
function dailyNames() {
  if (MEMO.dn) return MEMO.dn;
  let pos = [];
  try { pos = revPositions(revTotal(revBook())); } catch (e) {}
  return MEMO.dn = new Set(pos.map(x => nameKey(x.n)));
}
/* строка для сайта: [раздел, позиция, ед., код, тара, норма, поставщик, цена, заметка, есть в бланке (месячной), название R-Keeper, коэф., ед. R-Keeper,
   есть в ежедневной ревизии] */
const refRow = (r, inBlank) => [String(r[0]).trim(), String(r[1]).trim()].concat(r.slice(2, 9).map(x => String(x).trim()),
  [inBlank ? 1 : 0, String(r[9] || "").trim(), String(r[10] || "").trim(), String(r[11] || "").trim(), inBlank && dailyNames().has(nameKey(r[1])) ? 1 : 0]);
/* справочник для сайта: по порядку бланка; строки, которых в бланке уже нет, — в конце с пометкой */
function mgrRef() {
  const lock = lockOrBusy(15000);
  let blank;
  try { mrevPatchIfDue(false); blank = refSync(); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  const sh = refSheet(false), last = sh.getLastRow();
  const v = last >= 2 ? refVals(sh.getRange(2, 1, last - 1, REF_HEAD.length).getValues()) : [];
  const order = {};
  blank.forEach((x, i) => { const k = refKey(x.sec, x.n); if (!(k in order)) order[k] = i; });
  const rows = v.filter(r => String(r[1]).trim()).map(r => {
    const k = refKey(r[0], r[1]);
    return { o: k in order ? order[k] : 1e6, r: refRow(r, k in order) };
  });
  rows.sort((a, b) => a.o - b.o);
  return { ok: true, head: REF_HEAD, rows: rows.map(x => x.r) };
}
/* правка одной позиции с сайта: {sec, n, f: {u, code, tara, norm, sup, price, note}} */
function mgrRefSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const f = p.f || {}, key = refKey(p.sec || "", p.n || "");
  const numf = v => { const s = String(v == null ? "" : v).trim(); if (!s) return ""; const x = parseFloat(s.replace(",", ".")); return isFinite(x) && x >= 0 ? x : null; };
  const vals = {
    u: clean(f.u, 20), code: clean(f.code, 30), tara: numf(f.tara), norm: numf(f.norm),
    sup: clean(f.sup, 80), price: numf(f.price), note: clean(f.note, 200)
  };
  if (vals.tara === null || vals.norm === null || vals.price === null) return { error: "bad" };
  const lock = lockOrBusy(15000);
  try {
    const sh = refSheet(true), last = sh.getLastRow();
    const keys = last >= 2 ? sh.getRange(2, 1, last - 1, 2).getDisplayValues().map(r => refKey(r[0], r[1])) : [];
    const i = keys.indexOf(key);
    if (i < 0) return { error: "gone" };
    sh.getRange(i + 2, 3, 1, 2).setNumberFormat("@");                     // ед. и код — текстом
    sh.getRange(i + 2, 3, 1, REF_F.length).setValues([REF_F.map(k => vals[k])]);
    SpreadsheetApp.flush();
    const r = refVals(sh.getRange(i + 2, 1, 1, REF_HEAD.length).getValues())[0];
    return { ok: true, row: refRow(r, true) };
  } finally { lock.releaseLock(); }
}

/* ── Справочник: единицы и объёмы бутылок по умолчанию ──
   [раздел, позиция, ед., тара, уверенность 2/1/0] по позициям бланка: бар считает бутылочное в литрах, тара — объём бутылки
   (по нему приход в бутылках переводится в литры). «Заполнить пустое» во вкладке «Справочник» пишет только в пустые ячейки,
   в «Заметке» — «авто — проверьте» (0 — «авто, не уверен — проверьте»). Проверьте объёмы по своим бутылкам. */
const REF_AUTO = [["Вермуты","Вермут Мартини Бьянко","литр",1.0,1],["Вермуты","Вермут Мартини Россо","литр",1.0,1],["Вермуты","Вермут Мартини Фиеро","литр",1.0,1],["Вермуты","Вермут Мартини Экстра Драй","литр",1.0,1],["Германия","Португизер","литр",0.75,2],["Германия","Гевюрцтраминер Ханс Баер","литр",0.75,2],["Германия","Урбан Рислинг","литр",0.75,2],["Испания","Сан валентин парельяда","литр",0.75,2],["Испания","Матсу","литр",0.75,2],["Италия","Гави Ла Сколько","литр",0.75,2],["Италия","Пфефферер","литр",0.75,2],["Италия","Верментино Вилла Солаис","литр",0.75,2],["Италия","Меро Каза Дкфра","литр",0.75,2],["Италия","Санджовезе Алма Романа","литр",0.75,2],["Новая Зеландия","мисти клифф совиньон блан","литр",0.75,2],["Португалия","Маре Гриль Белое","литр",0.75,2],["Португалия","Маре Гриль Розе","литр",0.75,2],["Россия","Голубицкое Каберне совиньон","литр",0.75,2],["США","Зинфандель Краб энд Мо","литр",0.75,2],["Франция","Ле Гранд Нуар Пино Нуар","литр",0.75,2],["Франция","Бордо Ситран Руж","литр",0.75,2],["Франция","Шабли Жан Марк","литр",0.75,2],["Чили","Токорнал Шардоне","литр",0.75,2],["Чили","Токорнал Розе","литр",0.75,2],["Чили","Селар Селекшн Совиньон Блан","литр",0.75,2],["Чили","Селар Селекшн Карменер","литр",0.75,2],["ЮАР","Шенен Блан Кейп ориджинал","литр",0.75,2],["Шампанские","Дево Кюве","литр",0.75,2],["Шампанские","Вдова Клико","литр",0.75,2],["Вина игристые","Игристое розлив","литр",0.75,1],["Вина игристые","Тет де Шеваль брют","литр",0.75,2],["Вина игристые","Мартини Просекко","литр",0.75,2],["Вина игристые","Мартини Просекко Розе","литр",0.75,2],["Вина игристые","Мартини Асти","литр",0.75,2],["Вина игристые","Мартини Брют","литр",0.75,2],["Вина игристые","Бруни Просекко","литр",0.75,2],["Вина игристые","Мартини Секко","литр",0.75,2],["Вина игристые","Мучо Мас","литр",0.75,2],["Виски","Дюарс Уайт Лейбл","литр",0.7,1],["Виски","Дюарс 8","литр",0.7,1],["Виски","Виски Чивас Ригал 12лет","литр",0.7,1],["Виски","Талмор Дью","литр",0.7,1],["Виски","Джемесон","литр",0.7,1],["Виски","Джим Бим","литр",0.7,1],["Виски","Манки Шолдер","литр",0.7,2],["Виски","Гленфиддик 12 лет","литр",0.7,1],["Виски","Виски Хаус","литр","",0],["Виски","Аберфелди","литр",0.7,2],["Виски","Тилинг","литр",0.7,2],["Водка","Лаб груша","литр",0.5,0],["Водка","Беленькая","литр",0.5,1],["Водка","Белуга Нобл","литр",0.7,0],["Водка","Белуга Голд Лайн","литр",0.7,0],["Водка","Ортодокс","литр",0.5,1],["Водка","Грей Гуз","литр",0.7,1],["Водка","Арктика","литр",0.5,0],["Водка","Онегин","литр",0.5,1],["Джин","Джин Хендрикс","литр",0.7,2],["Джин","Хинт","литр",0.7,0],["Джин","Босфорд","литр",0.7,0],["Джин","Антидот","литр",0.7,0],["Джин","Хопперс оригинал","литр",0.7,0],["Джин","Хопперс лаванда","литр",0.7,0],["Джин","Хопперс мандарин","литр",0.7,0],["Джин","Бомбей Сапфир","литр",0.7,1],["Джин","Джин Баристер","литр",0.7,0],["Коньяк","Бисквит вс","литр",0.5,0],["Коньяк","Бисквит всоп","литр",0.5,0],["Коньяк","Ной 5 зв","литр",0.5,1],["Коньяк","Камю вс","литр",0.5,0],["Коньяк","Камю всоп","литр",0.5,0],["Ликеры","Ликер Амаретто","литр",0.7,0],["Ликеры","Ликер Банан","литр",0.7,0],["Ликеры","Ликер Бенедиктин","литр",0.7,1],["Ликеры","Ликер Бэйлис","литр",0.7,1],["Ликеры","Ликер Какао","литр",0.7,0],["Ликеры","Ликер Кофе","литр",0.7,0],["Ликеры","Ликер мараскино","литр",0.7,1],["Ликеры","Ликер Смородина","литр",0.7,0],["Ликеры","Ликер Трипл Сек","литр",0.7,0],["Ликеры","Ликер Фиалка","литр",0.7,0],["Ликеры","Ликер Ягермайстер","литр",0.7,1],["Ликеры","Италикус","литр",0.7,2],["Ликеры","Ликер мята","литр",0.7,0],["Ликеры","Белуга Хантинг Ягодная","литр",0.7,0],["Ликеры","Белуга Хантинг Травяная","литр",0.7,0],["Ликеры","Белуга Ботаника Роза Лайм","литр",0.7,0],["Ликеры","Белуга Ботаника Огурец Мята","литр",0.7,0],["Ликеры","Фернет Бранка","литр",0.7,1],["Ликеры","Бранка менте","литр",0.7,1],["Напитки, настойки","Ангостура Биттерс","литр",0.2,1],["Напитки, настойки","Апероль","литр",1.0,0],["Напитки, настойки","Апперитив Земляника","литр","",0],["Напитки, настойки","Херес","литр",0.75,1],["Напитки, настойки","Кампари","литр",1.0,0],["Напитки, настойки","Сарти","литр",0.7,1],["Напитки, настойки","Соджу","литр",0.36,1],["Ром","Бакарди Оакхарт","литр",0.7,1],["Ром","Ром Хаус","литр","",0],["Ром","Матусалем платино","литр",0.7,1],["Ром","Матусалем 7","литр",0.7,1],["Ром","Ангостура Тамбу","литр",0.7,1],["Ром","Ром Девис Айленд","литр",0.7,0],["Текила","Текила Хаус","литр","",0],["Текила","Хосе Куэрво сильвер","литр",0.7,1],["Текила","Хосе Куэрво Репосадо","литр",0.7,1],["Текила","Текила Ла Павеса","литр",0.7,0],["Б/алко","Сан Бенедето","шт","",1],["Б/алко","Вода Бон аква/Байкал","шт","",1],["Б/алко","Байкал стекло","шт","",1],["Б/алко","Кола тоник литровые","литр",1.0,2],["Б/алко","Вода минеральная розлив","литр","",0],["Б/алко","Кока кола тоник 330 мл","шт","",1],["Б/алко","Ред Булл 250мл","шт",24,2],["Б/алко","Сок, л","литр",1.0,1],["Б/алко","Лимонад Шихан","шт","",0],["Б/алко","Сок Лайма","литр","",0],["Б/алко","милкис","шт","",1],["Б/алко","Вода кокосовая","литр","",0],["Пиво в бутылках","Корона","шт",24,1],["Пиво в бутылках","Блю Мун","шт","",1],["Пиво в бутылках","Бакалар темный","шт","",1],["Пиво в бутылках","МортСюбите","шт","",1],["Пиво в бутылках","Августинер","шт",20,1],["Пиво в бутылках","Сидр","шт","",1],["Пиво в бутылках","Крушовице безалко","шт","",1],["Пиво в бутылках","Ла коста фреска","шт","",1],["Пиво в бутылках","Балтика нулевка грейпфрут","шт","",1],["Пиво разлив","Шихан/Жигули","литр","",1],["Пиво разлив","Мейзон","литр","",1],["Пиво разлив","Крушовице","литр","",1],["Сиропы, пюре","Пюре Маракуйя с/м","кг",1.0,1],["Сиропы, пюре","Пюре в ассортименте","литр","",0],["Сиропы, пюре","Сироп в ассортименте","литр",1.0,0],["Сиропы, пюре","Клавис","литр","",0],["Сиропы, пюре","Концентрат в ассортименте","литр","",0],["Чай, кофе","Горячиий шоколад","кг","",2],["Чай, кофе","Кофе","кг",1.0,1],["Чай, кофе","Чай ассам, кг","кг","",2],["Чай, кофе","Чай башкирский, кг","кг","",2],["Чай, кофе","Чай гречишный, кг","кг","",2],["Чай, кофе","Чай лапсанг сушонг","кг","",2],["Чай, кофе","Чай молочный улун, кг","кг","",2],["Чай, кофе","Чай пуэр, кг","кг","",2],["Чай, кофе","Чай сладкий поцелуй, кг","кг","",2],["Чай, кофе","Чай таежный, кг","кг","",2],["Чай, кофе","Чай татарский, кг","кг","",2],["Чай, кофе","Чай те гуань инь, кг","кг","",2],["Чай, кофе","Саган Дайля","кг","",2],["Чай, кофе","Матча","кг","",2],["Чай, кофе","Каркаде","кг","",2],["Чай, кофе","Роза","кг","",2],["Чай, кофе","Ройбуш","кг","",2],["Чай, кофе","Марокканская мята","кг","",2],["Чай, кофе","Дикая вишня","кг","",2],["Десерты","Мёд","кг","",2],["Десерты","Сахар","кг","",2],["Десерты","Сахарная вата","кг","",2],["Десерты","Сахар ванильный","кг","",2],["Десерты","Фруктоза","кг","",2],["Десерты","Шоколад, кг","кг","",2],["Десерты","Конфеты","кг","",1],["Десерты","варенье шишковое","кг","",1],["Десерты","Ванилин","кг","",2],["Десерты","Малина сублимированная","кг","",2],["Десерты","Паста фисташковая","кг","",2],["Заправки, соуса, масло","Соус Табаско","литр",0.06,1],["Заправки, соуса, масло","ворчестер","литр","",1],["Консервация, заморозка","Ягоды с/м","кг","",2],["Молочные продукты","Молоко","литр",1.0,1],["Молочные продукты","Молоко кокосовое","литр","",1],["Молочные продукты","Молоко сгущ","кг","",1],["Молочные продукты","Сливки 33 % и 11%","литр","",1],["Молочные продукты","Мороженое","кг","",1],["Молочные продукты","Яичный белок, желток","литр","",2],["Специи, зелень","Пищевая кислота","кг","",2],["Специи, зелень","Соль","кг","",2],["Специи, зелень","Специи","кг","",2],["Специи, зелень","Корица в палочках","кг","",2],["Специи, зелень","Желатин","кг","",2],["Фрукты, овощи","Апельсин свежий","кг","",2],["Фрукты, овощи","Клубника свежая","кг","",2],["Фрукты, овощи","Малина","кг","",2],["Фрукты, овощи","Лайм свежий","кг","",2],["Фрукты, овощи","Лимон свежий","кг","",2],["Фрукты, овощи","Огурец свежий","кг","",2],["Фрукты, овощи","Яблоко свежее","кг","",2],["Фрукты, овощи","Фейхоа","кг","",2],["Фрукты, овощи","Грейп","кг","",2],["Фрукты, овощи","Груша","кг","",2],["Фрукты, овощи","Имбирь","кг","",2],["Фрукты, овощи","Мандарин","кг","",2],["Фрукты, овощи","Маракуйя","кг","",2],["Фрукты, овощи","Тархун","кг","",2],["Фрукты, овощи","Щавель, шпинат свежий","кг","",2],["Фрукты, овощи","Хрен","кг","",2],["Фрукты, овощи","Лимонная трава","кг","",2],["Фрукты, овощи","Листья лайма","кг","",2],["Фрукты, овощи","Базилик/розмарин/мята/тимьян","кг","",2],["Фрукты, овощи","Папая сушеная","кг","",2],["Настойки","Малина мята","литр","",2],["Настойки","Вишня виски","литр","",2],["Настойки","Айриш","литр","",2],["Настойки","Лимончелло","литр","",2],["Настойки","Мандарин","литр","",2],["Настойки","Маракуйя Пломбир","литр","",2],["Настойки","Клубника каркаде","литр","",2],["Заготовки","Микс кислот","литр","",2],["Заготовки","Сироп сахарный","литр","",2],["Заготовки","Фреш апельсиновый пф","литр","",2],["Заготовки","Лимонный сок пф","литр","",2],["Заготовки","Облепиха шраб","литр","",2],["Заготовки","Кордиал Гибискус","литр","",2],["Заготовки","Пена игристого","литр","",2],["Заготовки","Пена пломбир","литр","",2],["Заготовки","Медовый сироп","литр","",2],["Заготовки","Колд брю","литр","",2],["Заготовки","Сироп Щавель пф","литр","",2],["Заготовки","Сироп Базилик п/ф","литр","",2],["Заготовки","Кордиал чили барбарис","литр","",2],["Заготовки","Кордиал цитрусовый","литр","",2],["Заготовки","Кордиал цитрус тархун","литр","",2],["Заготовки","Пюре вишня п/ф","литр","",2],["Заготовки","Премикс для лимонада вишня персик","литр","",2],["Заготовки","Лимонад грейпфрут","литр","",2],["Премиксы на коктейли","Пф для Лонг Айленд","литр","",2],["Премиксы на коктейли","Пф для Негрони","литр","",2],["Премиксы на коктейли","порнстар мартини (без игристого)","литр","",2],["Премиксы на коктейли","Сигма бой","литр","",2],["Премиксы на коктейли","Розовая пантера","литр","",2],["Премиксы на коктейли","Мандариновый Спритс","литр","",2],["Премиксы на коктейли","Пинк Леди","литр","",2],["Премиксы на коктейли","Вишневый Пирог","литр","",2],["Премиксы на коктейли","Брекфест Тини","литр","",2],["Премиксы на коктейли","Тропики","литр","",2],["Премиксы на коктейли","Чили барбарис","литр","",2],["Премиксы на коктейли","Саммер Спритц","литр","",2],["Премиксы на коктейли","Огуречный хьюго","литр","",2],["Премиксы на коктейли","Груша жасмин","литр","",2],["Премиксы на коктейли","Блю Колада","литр","",2],["Премиксы на коктейли","Май тай","литр","",2]];
/* p.go = "1" (POST) — записать; иначе — что будет записано: [{sec, n, u, tara, c}] */
function mgrRefAuto(p) {
  const go = String(p.go) === "1";
  if (go && !mgrOk(p.mk)) return { error: "mgr" };
  const auto = {};
  REF_AUTO.forEach(x => { auto[refKey(x[0], x[1])] = x; });
  const lock = go ? lockOrBusy(15000) : null;
  try {
    const sh = refSheet(go), last = sh ? sh.getLastRow() : 0, out = [];   // предпросмотр ничего не пишет
    if (last < 2) return { ok: true, rows: out };
    const v = sh.getRange(2, 1, last - 1, 9).getValues();
    v.forEach((r, i) => {
      const a = auto[refKey(r[0], r[1])];
      if (!a) return;
      const u = String(r[2]).trim() ? "" : a[2], t = String(r[4]).trim() === "" && a[3] !== "" ? a[3] : "";
      if (!u && t === "") return;
      out.push({ sec: r[0], n: r[1], u: u, tara: t, c: a[4], row: i + 2, note: String(r[8]).trim() });
    });
    if (go) {
      out.forEach(x => {
        if (x.u) sh.getRange(x.row, 3).setNumberFormat("@").setValue(x.u);
        if (x.tara !== "") sh.getRange(x.row, 5).setValue(x.tara);
        if (!x.note) sh.getRange(x.row, 9).setValue(x.c ? "авто — проверьте" : "авто, не уверен — проверьте");
      });
      SpreadsheetApp.flush();
      CacheService.getScriptCache().remove("dunits");                     // единицы ежедневной ревизии — заново
    }
    return { ok: true, rows: out.map(x => ({ sec: x.sec, n: x.n, u: x.u, tara: x.tara, c: x.c })), done: go };
  } finally { if (lock) lock.releaseLock(); }
}

/* ── Автозаявка (бар-менеджер) ──
   К заказу = норма − последний остаток, по позициям справочника с нормой. Остаток — из той ревизии, что свежее:
   ежедневной (лист «Итог», последний законченный пересчёт; позиции сопоставляются по названию) или месячной
   (последняя закрытая; пока месячная идёт — прошлая). Приход из «Журнала прихода» после даты этой ревизии прибавляется
   к остатку. Округление до целой тары и группировку по поставщикам делает сайт. */
const dmy = s => { const m = String(s || "").match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; };
/* название для сопоставления между разделами: без регистра, ё, дефисов, кавычек и запятых («чили-барбарис» = «чили барбарис») */
const nameKey = s => String(s).toLowerCase().replace(/ё/g, "е").replace(/[-–—,«»"'()]+/g, " ").replace(/\s+/g, " ").trim();

function mgrOrder() {
  const ref = mgrRef();
  if (!ref.ok) return ref;
  const out = { ok: true, src: { m: null, d: null }, rows: [], nonorm: 0 };
  const stock = {};                                                    // ключ справочника → {q — в единице справочника, from, date, at}
  const put = (k, q, from, date, at) => { const s = stock[k]; if (!s || at > s.at) stock[k] = { q: q, from: from, date: date, at: at }; };
  const RU = {}, RT = {};
  ref.rows.forEach(r => { const k = refKey(r[0], r[1]); RU[k] = refUn(r[2]); RT[k] = num(String(r[4]).replace(",", ".")); });

  /* месячная: последняя закрытая или готовая (идёт — прошлая); числа — в единице справочника */
  const ms = mrevRead();
  if (ms && ms.block) {
    /* готовая (все зоны) — как закрытая; дата — когда закончили считать; пока идёт новая — прошлая со своей датой */
    const open = ms.block.open && !ms.block.done, date = open ? dmy(ms.prevDate) : dmy(ms.block.end || ms.block.date);
    out.src.m = { title: open ? ms.prev || "" : ms.block.title, date: date, open: open };
    /* момент — когда сдали последнюю зону (лента месячных: последняя посчитанная — это она); иначе конец её дня */
    const mt = mrevTimeline(), ml = mt[mt.length - 1], mat = ml && ml.iso === date ? ml.at : date ? isoAt(date, 33) - 60000 : 0;
    let sec = "";
    ms.rows.forEach(x => {
      if (x.t === "h" || x.t === "s") { sec = x.n; return; }
      const q = open ? x.p : x.tot;
      if (q != null) put(refKey(sec, x.n), q, "m", date || "0000-00-00", mat);
    });
  }

  /* ежедневная: последняя ревизия (все зоны; сданная — сразу), числа — из единицы ревизии в единицу справочника */
  try {
    const tl = revTimeline(), R = tl.revs[tl.revs.length - 1], L = tl.all[tl.all.length - 1], ts = revTotal(revBook()), items = revPositions(ts);
    if (R && items.length) {
      const date = R.iso, vals = ts.getRange(3, R.col, items[items.length - 1].row - 2, 1).getValues().map(r => r[0]);
      const byName = {}, du = dailyUnits(ref);                         // название → ключ справочника (только однозначные, только из бланка)
      ref.rows.forEach(r => { if (r[9] !== 1) return; const k = nameKey(r[1]); byName[k] = k in byName ? null : refKey(r[0], r[1]); });
      const miss = [], unc = [];
      let n = 0;
      items.forEach(x => {
        const v = vals[x.row - 3], k = byName[nameKey(x.n)];
        if (!k) { miss.push(x.n); return; }
        if (v === "" || v == null) return;
        const q = conv(num(v), du(x.n) === "л" ? "литр" : du(x.n), RU[k], RT[k]);
        if (q == null) { unc.push(x.n); return; }
        n++; put(k, q, "d", date, R.at);
      });
      out.src.d = { date: date, name: R.who, n: n, miss: miss, unc: unc, partial: L && L !== R ? L.d + (L.z ? " (" + L.z + ")" : "") : "" };
    }
  } catch (e) { out.src.d = null; }

  /* остаток сейчас: ревизия + приход − продажи − списания и проработки после неё (тем же расчётом, что «Период»;
     заготовки с рецептом — в сырьё). Продажи загружены не за все смены после ревизии — сайт предупредит: остаток завышен */
  const flow = {}, M = perMaps(ref), now = Date.now();
  out.flow = {};
  ["d", "m"].forEach(src => {
    const keys = Object.keys(stock).filter(k => stock[k].from === src && stock[k].at);
    if (!keys.length) return;
    try {
      const items = {}, A = { at: stock[keys[0]].at, iso: stock[keys[0]].date };
      keys.forEach(k => { items[k] = perItem(k, k, M.RU[k] === "литр" ? "л" : M.RU[k], stock[k].q, null); });
      const o = perCalc(M, A, { at: now, iso: new Date(now + AST).toISOString().slice(0, 10) }, items, [], { rows: [] });
      o.rows.forEach(r => { flow[r.key] = r; });
      out.flow[src] = { miss: o.sales.miss, nodish: o.sales.nodish.filter(x => x.rel).length };
    } catch (e) { console.error("автозаявка: " + (e && e.stack || e)); }
  });
  const inc = inByKey(), r3 = x => Math.round(x * 1000) / 1000;
  ref.rows.forEach(r => {
    const norm = num(String(r[5]).replace(",", "."));
    if (!String(r[5]).trim() || !(norm > 0)) { out.nonorm++; return; }
    const k = refKey(r[0], r[1]), s = stock[k] || null, f = s ? flow[k] : null;
    const row = { sec: r[0], n: r[1], u: r[2], code: r[3], tara: num(String(r[4]).replace(",", ".")), norm: norm,
      sup: r[6], q: s ? r3(s.q) : null, from: s ? s.from : "", date: s ? s.date : "", inq: 0 };
    if (f && f.exp != null) Object.assign(row, { rq: r3(s.q), q: r3(Math.max(0, f.exp)), inc: f.inc, sold: f.sold, wo: r3(f.wo + f.pr), zq: f.zwas || 0 });
    else if (s && s.at) row.inq = r3((inc[k] || []).filter(x => incAt(x.iso, x.w) > s.at).reduce((a, x) => a + (conv(x.q, x.u, RU[k], RT[k]) || 0), 0));
    out.rows.push(row);
  });
  return out;
}

/* ── Архив заявок бартендеров ──
   «Скопировать и отправить в архив» в заявке: копия — в буфер (переслать), заявка — в лист «Заявки» таблицы ревизии,
   строка на позицию. У заявки id (одна заявка одного телефона за день): повторная отправка заменяет её строки —
   в архиве последняя версия. Менеджер видит заявки во вкладке «Автозаявка», они же — в еженедельном отчёте. */
const ORD_SHEET = "Заявки";
const ORD_HEAD = ["Отправлено", "День", "Заявка", "Кто", "Раздел", "Позиция", "Кол-во", "id"];
const ORD_KIND = { prep: "Заготовщики", gen: "Общая" };

function ordSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(ORD_SHEET);
  if (sh || !create) return sh;
  const nsh = ss.insertSheet(ORD_SHEET);
  nsh.getRange(1, 1, 1, ORD_HEAD.length).setValues([ORD_HEAD]).setFontWeight("bold");
  nsh.setFrozenRows(1);
  nsh.setColumnWidth(6, 240);
  return nsh;
}
function orderSave(p) {
  const id = String(p.id || "").replace(/[^\w-]/g, "").slice(0, 40), kind = ORD_KIND[p.kind] ? p.kind : "";
  const who = clean(p.who, 60), items = Array.isArray(p.items) ? p.items.slice(0, 400) : [];
  const rows = items.map(x => [clean(x && x.g, 80), clean(x && x.n, 120), clean(x && x.q, 30)]).filter(r => r[1]);
  if (!id || !kind || !who || !rows.length) return { error: "bad" };
  revBook();
  const lock = lockOrBusy(20000);
  try {
    /* время — когда бармен отправил (без связи заявка дошла позже — дата та же); не старше недели и не из будущего */
    const t = num(p.t), now = t > Date.now() - 7 * 864e5 && t <= Date.now() + 6e5 ? new Date(t) : new Date(), sh = ordSheet(true);
    const at = Utilities.formatDate(now, TZ, "dd.MM.yyyy HH:mm"), day = Utilities.formatDate(now, TZ, "dd.MM.yyyy");
    /* прошлая версия этой заявки этого же бармена — убрать (снизу вверх, отрезками подряд); чужие строки с тем же id не трогаем */
    const last = sh.getLastRow();
    if (last >= 2) {
      const v = sh.getRange(2, 1, last - 1, ORD_HEAD.length).getValues(), mine = v.map(r => String(r[ORD_HEAD.length - 1]) === id && String(r[3]).replace(/^'/, "") === who);
      for (let i = mine.length - 1; i >= 0;) {
        if (!mine[i]) { i--; continue; }
        let j = i;
        while (j > 0 && mine[j - 1]) j--;
        sh.deleteRows(j + 2, i - j + 1);
        i = j - 1;
      }
    }
    const from = sh.getLastRow() + 1;
    ensureRows(sh, from + rows.length - 1);
    sh.getRange(from, 1, rows.length, ORD_HEAD.length).setNumberFormat("@")
      .setValues(rows.map(r => [at, day, ORD_KIND[kind], who].concat(r, [id])));
    SpreadsheetApp.flush();
    return { ok: true, at: at, n: rows.length };
  } finally { lock.releaseLock(); }
}
/* заявки за период (дни «с» и «по», ГГГГ-ММ-ДД; по умолчанию — 30 дней), новые сверху */
function orderList(from, to) {
  const sh = ordSheet(false), last = sh ? sh.getLastRow() : 0, by = {}, out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, ORD_HEAD.length).getDisplayValues().forEach(r => {
    const iso = dmy(r[1]), id = String(r[7]).trim();
    if (!iso || !id || iso < from || iso > to) return;
    let o = by[id];
    if (!o) { o = by[id] = { id: id, at: String(r[0]).trim(), day: iso, kind: String(r[2]).trim(), who: String(r[3]).trim(), items: [] }; out.push(o); }
    o.items.push({ g: String(r[4]).trim(), n: String(r[5]).trim(), q: String(r[6]).trim() });
  });
  const key = o => { const m = o.at.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/); return m ? m[3] + m[2] + m[1] + m[4] + m[5] : o.day; };
  return out.sort((a, b) => key(b).localeCompare(key(a)));
}
function mgrOrders(p) {
  const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  const to = /^\d{4}-\d{2}-\d{2}$/.test(p.to || "") ? p.to : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(p.from || "") ? p.from : Utilities.formatDate(new Date(Date.parse(to + "T00:00:00Z") - 30 * 864e5), "UTC", "yyyy-MM-dd");
  return { ok: true, from: from, to: to, orders: orderList(from, to).slice(0, 100) };
}

/* ── Приход (бар-менеджер) ──
   Накладные R-Keeper загружаются на сайте (Excel / CSV), сайт сопоставляет строки с позициями справочника и шлёт сюда.
   Лист «Журнал прихода» в таблице ревизии: строка на строку накладной, количество — уже в единицах позиции
   (кол-во R-Keeper × коэффициент). Одна и та же строка накладной второй раз не записывается (id).
   В справочник запоминаются название и коэффициент R-Keeper (J, K), код — если пуст, цена закупки — за единицу позиции. */
const IN_SHEET = "Журнал прихода";
const IN_HEAD = ["Дата", "№ накладной", "Поставщик", "Раздел", "Позиция", "Кол-во", "Ед. изм.", "Цена за ед.", "Сумма",
  "Код R-Keeper", "Название в R-Keeper", "Кол-во в R-Keeper", "Ед. R-Keeper", "Коэф.", "Загрузил", "Записано", "id", "До/после ревизии"];
/* id строки — 17-й столбец; 18-й — поставка в день ревизии пришла «до» или «после» неё (пусто — в середине дня) */
const IN_ID = 17, IN_WHEN = 18;

function inSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(IN_SHEET);
  if (sh || !create) return sh;
  const nsh = ss.insertSheet(IN_SHEET);
  nsh.getRange(1, 1, 1, IN_HEAD.length).setValues([IN_HEAD]).setFontWeight("bold");
  nsh.setFrozenRows(1);
  nsh.setColumnWidth(5, 220);
  nsh.setColumnWidth(11, 220);
  return nsh;
}
const ruDate = s => { const v = String(s || "").trim(), m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + "." + m[2] + "." + m[1] : /^\d{2}\.\d{2}\.\d{4}$/.test(v) ? v : ""; };

/* запись прихода: {rows: [{date, no, sup, code, rkn, rku, rkq, price, sum, sec, n, k}], who} */
function mgrIn(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  if (Array.isArray(p.rows) && p.rows.length > 1000) return { error: "many" };    // сайт шлёт частями
  const src = Array.isArray(p.rows) ? p.rows : [], who = clean(p.who, 80);
  const rows = [];
  for (const r of src) {
    const date = ruDate(r.date), rkq = num(r.rkq), k = num(r.k), n = clean(r.n, 200);
    if (!date || !(rkq > 0) || !(k > 0) || !n) return { error: "bad" };
    rows.push({ date: date, no: clean(r.no, 40), sup: clean(r.sup, 120), code: clean(r.code, 40), rkn: clean(r.rkn, 200),
      rku: clean(r.rku, 20), rkq: rkq, price: num(r.price), sum: num(r.sum), sec: clean(r.sec, 120), n: n, k: k, rep: Math.max(0, Math.floor(num(r.rep))),
      when: r.when === "до" || r.when === "после" ? r.when : "" });
  }
  if (!rows.length) return { error: "bad" };
  const lock = lockOrBusy(20000);
  try {
    const rs = refSheet(true), rl = rs.getLastRow();
    const rv = rl >= 2 ? rs.getRange(2, 1, rl - 1, REF_HEAD.length).getValues() : [];
    const at = {};
    rv.forEach((r, i) => { at[refKey(r[0], r[1])] = i; });
    const sh = inSheet(true), last = sh.getLastRow();
    if (sh.getLastColumn() < IN_HEAD.length) sh.getRange(1, 1, 1, IN_HEAD.length).setValues([IN_HEAD]).setFontWeight("bold");   // лист прошлой версии
    const ids = new Set(last >= 2 ? sh.getRange(2, IN_ID, last - 1, 1).getValues().map(r => String(r[0])) : []);
    const stamp = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm"), add = [], touched = {}, miss = [];
    let dup = 0;
    rows.forEach(r => {
      const i = at[refKey(r.sec, r.n)];
      if (i == null) { miss.push(r.n); return; }
      /* одинаковые строки одной накладной различает номер вхождения (у первой его нет — id прежних записей не меняются) */
      const id = sha([r.date, r.no, r.sup, r.code, r.rkn, r.rkq, r.price].join("|") + (r.rep ? "|" + r.rep : "")).slice(0, 20);
      if (ids.has(id)) { dup++; return; }
      ids.add(id);
      const q = Math.round(r.rkq * r.k * 1000) / 1000, pu = r.price > 0 ? Math.round(r.price / r.k * 100) / 100 : "";
      add.push([r.date, r.no, r.sup, rv[i][0], rv[i][1], q, refUn(rv[i][2]), pu, r.sum || (r.price > 0 ? Math.round(r.price * r.rkq * 100) / 100 : ""),
        r.code, r.rkn, r.rkq, r.rku, r.k, who, stamp, id, r.when]);
      const ref = rv[i];                                                // справочник: запомнить, как эта позиция зовётся в R-Keeper
      if (r.rkn) ref[9] = r.rkn;
      ref[10] = r.k; ref[11] = r.rku;                                   // коэффициент — для этой единицы R-Keeper
      if (r.code && !String(ref[3]).trim()) ref[3] = r.code;
      if (pu !== "") ref[7] = pu;
      if (r.sup && !String(ref[6]).trim()) ref[6] = r.sup;               // поставщик — из первой накладной
      /* литровая позиция пришла бутылками — коэффициент и есть объём бутылки: тара, если её ещё нет */
      if (!String(ref[4]).trim() && refUn(ref[2]) === "литр" && /^(бут|шт)/i.test(r.rku) && r.k > 0 && r.k <= 5) ref[4] = r.k;
      touched[i] = 1;
      /* сопоставление исправили: тот же код или название R-Keeper у другой позиции — снять, иначе следующая накладная уйдёт туда же */
      rv.forEach((x, j) => {
        if (j === i) return;
        if (r.code && String(x[3]).trim() === r.code && String(ref[3]).trim() === r.code) { x[3] = ""; touched[j] = 1; }
        if (r.rkn && nameKey(x[9]) === nameKey(r.rkn)) { x[9] = ""; x[10] = ""; x[11] = ""; touched[j] = 1; }
      });
    });
    if (add.length) {
      ensureRows(sh, last + add.length);
      const top = last + 1;
      sh.getRange(top, 1, add.length, 5).setNumberFormat("@");           // дата, №, поставщик, раздел, позиция — текстом
      sh.getRange(top, 7, add.length, 1).setNumberFormat("@");
      sh.getRange(top, 10, add.length, 2).setNumberFormat("@");
      sh.getRange(top, 13, add.length, 1).setNumberFormat("@");
      sh.getRange(top, 15, add.length, 4).setNumberFormat("@");
      sh.getRange(top, 1, add.length, IN_HEAD.length).setValues(add);
    }
    Object.keys(touched).forEach(i => {
      const r = rv[i];
      rs.getRange(+i + 2, 4).setNumberFormat("@").setValue(r[3]);
      rs.getRange(+i + 2, 5).setValue(r[4]);
      rs.getRange(+i + 2, 7).setValue(r[6]);
      rs.getRange(+i + 2, 8).setValue(r[7]);
      rs.getRange(+i + 2, 12).setNumberFormat("@");
      rs.getRange(+i + 2, 10, 1, 3).setValues([[r[9], r[10], r[11]]]);
    });
    SpreadsheetApp.flush();
    return { ok: true, added: add.length, dup: dup, miss: miss };
  } finally { lock.releaseLock(); }
}
/* приход за период (ГГГГ-ММ-ДД): [дата, №, поставщик, раздел, позиция, кол-во, ед., цена за ед., сумма] */
function mgrInList(p) {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(p.from || "") ? p.from : "0000-00-00";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(p.to || "") ? p.to : "9999-99-99";
  const sh = inSheet(false), last = sh ? sh.getLastRow() : 0, rows = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, 9).getValues().forEach(r => {
    const d = dmy(r[0]);
    if (!d || d < from || d > to) return;
    rows.push([String(r[0]).trim(), String(r[1]), String(r[2]), String(r[3]), String(r[4]), num(r[5]), String(r[6]), r[7] === "" ? "" : num(r[7]), r[8] === "" ? "" : num(r[8])]);
  });
  return { ok: true, from: from, to: to, rows: rows };
}
/* приход по позициям: ключ справочника → [{iso, q, u — единица позиции на момент записи (пусто — тогда «бутылки»), w — до / после ревизии}] */
function inByKey() {
  if (MEMO.inc) return MEMO.inc;
  const sh = inSheet(false), last = sh ? sh.getLastRow() : 0, out = {}, wc = sh && sh.getLastColumn() >= IN_WHEN ? IN_WHEN : 7;
  if (last >= 2) sh.getRange(2, 1, last - 1, wc).getValues().forEach(r => {
    const d = dmy(r[0]);
    if (!d) return;
    (out[refKey(r[3], r[4])] = out[refKey(r[3], r[4])] || []).push({ iso: d, q: num(r[5]), u: String(r[6]).trim() || "бут", w: wc >= IN_WHEN ? String(r[IN_WHEN - 1]).trim() : "" });
  });
  return MEMO.inc = out;
}

/* ── Расход и странности (бар-менеджер) ──
   История пересчётов по позициям: ежедневная ревизия (лист «Итог», последние 60 законченных пересчётов) или месячная
   (закрытые «Итоги» листа «Месячная ревизия», последние 24). К каждой позиции — приход («Журнал прихода») и
   списания с проработками (журналы актов) в единицах позиции; расход, «обычный» расход и странности считает сайт. */
const USE_D = 60, USE_M = 24;

/* количество из акта — в единицах позиции; несовместимые единицы — null */
/* tara — из справочника: у литровой позиции (ед. «литр» или пусто — бар считает бутылочное в литрах) это объём бутылки
   или упаковки в литрах, у позиции в бутылках («бут») — объём бутылки */
function woConv(q, wu, pu, tara) {
  const w = String(wu || "").trim().toLowerCase().replace(/\.$/, ""), u = String(pu || "").trim().toLowerCase() || "литр";
  const L = /^(л|литр)$/, KG = /^кг$/, PC = /^(шт|бут)$/;
  if (L.test(u)) return L.test(w) ? q : w === "мл" ? q / 1000 : PC.test(w) && tara > 0 ? q * tara : null;
  if (KG.test(u)) return KG.test(w) ? q : /^(г|гр)$/.test(w) ? q / 1000 : null;
  if (u === "шт") return PC.test(w) ? q : null;
  if (u === "бут") {                                                    // бутылки: 1000 мл при таре 0,5 — 2 бутылки
    if (PC.test(w)) return q;
    return tara > 0 ? (L.test(w) ? q / tara : w === "мл" ? q / 1000 / tara : null) : null;
  }
  return w === u ? q : null;
}
function mgrUsage(p) {
  const kind = p.kind === "m" ? "m" : "d", ref = mgrRef();
  if (!ref.ok) return ref;
  const byName = {}, refU = {}, refT = {}, byAll = {};
  ref.rows.forEach(r => { const k = nameKey(r[1]), key = refKey(r[0], r[1]); refU[key] = r[2]; refT[key] = num(String(r[4]).replace(",", "."));
    if (r[9] === 1) { byName[k] = k in byName ? null : key; (byAll[k] = byAll[k] || []).push(key); } });   // строки, которых в бланке уже нет, не мешают
  const val = v => v === "" || v == null || isNaN(num(v)) ? null : Math.round(num(v) * 1000) / 1000;
  let cols = [], items = [];
  if (kind === "d") {
    const ts = revTotal(revBook()), oc = revOpenCol(), last = oc ? oc - 1 : ts.getLastColumn(), pos = revPositions(ts);
    const first = Math.max(2, last - USE_D + 1);
    if (last >= first && pos.length) {
      const w = last - first + 1, hd = ts.getRange(1, first, 2, w).getDisplayValues();
      const v = ts.getRange(3, first, pos[pos.length - 1].row - 2, w).getValues();
      const ok = [], zmap = revDayZones(revBook()), tmap = revDayTimes(revBook()), du = dailyUnits(ref);
      /* z — какие зоны посчитаны (период — только между днями с одинаковыми зонами), t — когда закончили считать (акт позже — в следующий период) */
      for (let c = 0; c < w; c++) { const iso = dmy(hd[0][c]), d = String(hd[0][c]).trim(); if (iso) { ok.push(c); cols.push({ iso: iso, who: String(hd[1][c] || ""), z: zmap[d] || "", t: tmap[d] || 0 }); } }
      items = pos.map(x => {
        const key = byName[nameKey(x.n)] || "";
        return { n: x.n, sec: "", key: key, u: du(x.n), v: ok.map(c => val(v[x.row - 3][c])) };
      });
    }
  } else {
    const sh = mrevSheet(true), b = mrevBlock();
    if (sh && sh.getLastColumn() >= 4 && sh.getLastRow() >= 7) {
      const lc = sh.getLastColumn(), h = sh.getRange(3, 1, 4, lc).getDisplayValues(), openId = b && b.open && !b.done ? b.total : "";
      let tc = [];
      for (let c = 3; c < lc; c++) {
        const id = String(h[1][c]).trim(), iso = dmy(h[3][c]);
        if (String(h[2][c]).trim() === "Итог" && id && id !== openId && iso) tc.push({ c: c + 1, iso: iso, who: String(h[0][c]).trim() });
      }
      tc.sort((a, x) => a.iso.localeCompare(x.iso));
      tc = tc.slice(-USE_M);
      if (tc.length) {
        const c0 = Math.min.apply(null, tc.map(x => x.c)), c1 = Math.max.apply(null, tc.map(x => x.c));
        const v = sh.getRange(7, c0, sh.getLastRow() - 6, c1 - c0 + 1).getValues();
        cols = tc.map(x => ({ iso: x.iso, who: x.who }));
        let sec = "";
        mrevRows(sh).forEach(x => {
          if (x.t !== "i") { sec = x.n; return; }
          const key = refKey(sec, x.n);
          items.push({ n: x.n, sec: sec, key: key, u: key in refU ? refU[key] : x.u, v: tc.map(t => val(v[x.r - 7][t.c - c0])) });
        });
      }
    }
  }
  /* приход и списания — только для позиций из справочника */
  /* списания, которые не удалось учесть (название не как в справочнике, несовместимые единицы), — сайт покажет списком */
  const inc = inByKey(), wo = {}, womiss = {}, since = cols.length ? cols[0].iso : "9999", dailyU = dailyUnits(ref);
  Object.keys(WO_KINDS).forEach(k => {
    const sh = woSheet(k, false), last = sh ? sh.getLastRow() : 0;
    if (last < 2) return;
    sh.getRange(2, 1, last - 1, WO_GONE_COL).getValues().forEach(r => {
      if (String(r[WO_GONE_COL - 1] || "").trim()) return;              // PDF удалили с Диска — акта нет
      const nk = nameKey(r[2]);
      let key = byName[nk];
      /* одно название в двух разделах (Мандарин — фрукты и настойка): по единице акта, если подходит ровно одна позиция */
      if (key === null) { const fit = (byAll[nk] || []).filter(k => woConv(1, r[3], refU[k], refT[k]) != null); if (fit.length === 1) key = fit[0]; }
      const iso = dmy(r[0]);
      if (!iso) return;
      const miss = why => { if (iso > since) { const m = String(r[2]).trim() + "|" + why; womiss[m] = { n: String(r[2]).trim(), u: String(r[3]).trim(), why: why, pu: key ? refU[key] : "" }; } };
      if (!key) return miss(nk in byName ? "ambiguous" : "name");
      /* в единицах того, в чём считали: месячная — единица справочника; ежедневная — её единица (л / шт / кг) */
      const pu = kind === "d" ? dailyU(r[2]) : refU[key];
      const q = woConv(num(r[4]), r[3], pu, refT[key]);
      if (q == null) return miss("unit");
      if (q > 0) (wo[key] = wo[key] || []).push({ iso: iso, q: Math.round(q * 1000) / 1000, t: ruTime(r[8] instanceof Date ? Utilities.formatDate(r[8], TZ, "dd.MM.yyyy HH:mm") : r[8]) });
    });
  });
  /* приход — в единицах того, в чём считали (записан в единице справочника на момент накладной) */
  items.forEach(x => {
    const pu = kind === "d" ? (dailyU(x.n) === "л" ? "литр" : dailyU(x.n)) : refU[x.key];
    x.inc = x.key ? (inc[x.key] || []).map(y => ({ iso: y.iso, q: Math.round((conv(y.q, y.u, pu, refT[x.key]) || 0) * 1000) / 1000 })) : [];
    x.wo = x.key ? wo[x.key] || [] : [];
  });
  return { ok: true, kind: kind, cols: cols, items: items.filter(x => x.v.some(y => y != null)), womiss: Object.values(womiss).slice(0, 40) };
}

/* ═════════════ Период ревизии: ревизия против продаж (бар-менеджер) ═════════════
   Ревизия — день ежедневной ревизии, где посчитаны все зоны (у бара — чт перед открытием и вс после закрытия). День,
   где посчитали меньше зон, чем обычно (проверка одной позиции, случайное число), — не ревизия: период через него не режется.
   Ревизия готова, как только все зоны сданы и все, кто считал, нажали «Завершить» (иначе — в 9:00 следующего утра).
   Текущая — последняя готовая; период — от прошлой ревизии до неё. Всё, что было между ними, раскладывается по моментам:
   — ревизия — когда её сдали (последнее «Завершить», иначе последняя запись журнала ревизии);
   — продажи дня — в 20:00 этого дня (смена вечером: ревизия чт перед открытием — раньше, вс после закрытия — позже);
   — акт списания или проработки — когда записан, если записан в свой день (до 9:00 следующего); оформили задним числом —
     в 20:00 дня акта, как смена (бой в воскресную смену — до ночной ревизии, в четверговую — после дневной);
   — приход — в полдень дня накладной, а с отметкой «до / после ревизии» — в начале / в конце дня.
   Ожидалось = было + приход − продано (по «Расходу на блюдо») − списания − проработки; расхождение = стало − ожидалось
   (минус — недостача, плюс — излишек), в рублях — по цене закупки из справочника. Порога нет: показываются все позиции.
   Заготовки с рецептом («Рецепты заготовок») раскладываются на сырьё: их остаток, списания и продажи через них — сырьё по рецепту. */
const AST = 5 * 3600e3;
const isoAt = (iso, h) => Date.parse(iso + "T00:00:00Z") - AST + h * 3600e3;          // день по Астане, час h (33 — 9:00 следующего)
const saleAt = iso => isoAt(iso, 20);
const actAt = (iso, rec) => rec && rec <= isoAt(iso, 33) ? rec : isoAt(iso, 20);
const incAt = (iso, when) => isoAt(iso, when === "до" ? 0.02 : when === "после" ? 23.98 : 12);
const WD_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const isoWd = iso => new Date(iso + "T00:00:00Z").getUTCDay();
/* рабочие дни (смены): свойство WORK_DAYS «4,5,6,0» — чт, пт, сб, вс; по ним видно, за какие дни ждать продажи */
const workDays = () => String(PropertiesService.getScriptProperties().getProperty("WORK_DAYS") || "4,5,6,0").split(",").map(x => parseInt(x, 10)).filter(x => x >= 0 && x <= 6);
/* единица справочника: пустая — литры (бармены считают бутылочное в литрах: полная 0,7 — это 0,7) */
const refUn = u => String(u || "").trim() || "литр";
const conv = (q, from, to, tara) => woConv(q, refUn(from), refUn(to), tara);

/* лента ревизий: {all: [дни «Итога»], revs: [ревизии]} — день {col, d, iso, who, z, nz, full, at} */
function revTimeline() {
  if (MEMO.tl) return MEMO.tl;
  const ss = revBook(), ts = revTotal(ss), oc = revOpenCol(), last = oc ? oc - 1 : ts.getLastColumn(), out = { all: [], revs: [] };
  if (last < 2) return MEMO.tl = out;
  const hd = ts.getRange(1, 2, 2, last - 1).getDisplayValues(), zmap = revDayZones(ss), tmap = revDayTimes(ss), amap = revAtMap();
  for (let i = 0; i < last - 1; i++) {
    const d = String(hd[0][i]).trim(), iso = dmy(d);
    if (!iso) continue;
    const z = zmap[d] || "";
    out.all.push({ col: i + 2, d: d, iso: iso, who: String(hd[1][i] || "").trim(), z: z, nz: z ? z.split(",").length : 0,
      at: amap[d] || tmap[d] || isoAt(iso, 33) - 60000 });
  }
  /* полный день — зон не меньше, чем в лучшем из 6 последних дней (закрыли зону насовсем — через неделю снова «полный») */
  out.all.forEach((x, i) => {
    const best = Math.max.apply(null, out.all.slice(Math.max(0, i - 5), i + 1).map(y => y.nz));
    x.full = !x.nz || x.nz >= best;
    if (x.full) out.revs.push(x);
  });
  return MEMO.tl = out;
}
const revOut = (x, i) => ({ i: i, d: x.d, iso: x.iso, who: x.who, wd: WD_RU[isoWd(x.iso)], at: x.at });

/* ручная ревизия бар-менеджера: столбец дня в «Итоге» — посмотреть, поправить или внести за дату целиком (посчитали на бумаге).
   Правки пишутся прямо в «Итог» (их сразу видят период, письма и отчёт) и строкой на каждую позицию в «Ревизия журнал»:
   «вручную · дата», прежнее значение («было 0,7»), новое и id правки — по id её можно отменить.
   Ревизию, которая ещё идёт на сайте, не трогаем. Новый день встаёт в «Итог» по дате; без зон он — полная ревизия,
   её момент — 17:00 дня («перед открытием») или 8:59 следующего («после закрытия»). */
const REV_MAN = "вручную";
const ddmmOk = s => /^\d{2}\.\d{2}\.\d{4}$/.test(String(s || "")) && !!dmy(s);
function revColOf(ts, d) {
  const lc = ts.getLastColumn(), h = lc >= 2 ? ts.getRange(1, 2, 1, lc - 1).getDisplayValues()[0] : [];
  for (let i = h.length - 1; i >= 0; i--) if (String(h[i]).trim() === d) return i + 2;
  return 0;
}
const revCell = v => v === "" || v == null || isNaN(num(v)) ? null : round3(num(v));
/* p.d — «dd.MM.yyyy» (по умолчанию — последняя ревизия) → {days, d, col, who, man, ro, items: [{r, n, u, v, p — в прошлой ревизии}], pd} */
function mgrRevGet(p) {
  const ref = mgrRef(), ss = revBook(), ts = revTotal(ss), tl = revTimeline(), R = tl.revs, st = revDay(false);
  const open = st && !revDone(st) ? st.date : "", du = dailyUnits(ref.ok ? ref : null), pos = revPositions(ts);
  const d = ddmmOk(p.d) ? String(p.d) : R.length ? R[R.length - 1].d : "", iso = d ? dmy(d) : "";
  const days = tl.all.map(x => ({ d: x.d, iso: x.iso, wd: WD_RU[isoWd(x.iso)], who: x.who, full: x.full })).reverse().slice(0, 60);
  if (open && !days.some(x => x.d === open)) days.unshift({ d: open, iso: dmy(open), wd: WD_RU[isoWd(dmy(open))], who: "", full: false });
  const col = d ? revColOf(ts, d) : 0, prev = R.filter(x => x.iso < iso).pop(), h = pos.length ? pos[pos.length - 1].row - 2 : 0;
  const cv = col && h ? ts.getRange(3, col, h, 1).getValues() : [], pv = prev && h ? ts.getRange(3, prev.col, h, 1).getValues() : [];
  const who = col ? String(ts.getRange(2, col).getDisplayValue()).trim() : "";
  return { ok: true, days: days, d: d, today: revDayDate(revDayKey()), col: col, who: who, man: who.indexOf(" · " + REV_MAN) >= 0, ro: !!open && d === open,
    pd: prev ? WD_RU[isoWd(prev.iso)] + " " + prev.d.slice(0, 5) : "",
    items: pos.map(x => ({ r: x.row, n: x.n, u: du(x.n), v: col ? revCell(cv[x.row - 3][0]) : null, p: prev ? revCell(pv[x.row - 3][0]) : null })) };
}
/* {d, vals: [[строка, позиция, число или ""]], when: "до"|"после" (для нового дня), who} — пусто = «не считали» */
function mgrRevSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const d = String(p.d || ""), iso = dmy(d);
  if (!ddmmOk(d) || iso > revDayKey()) return { error: "bad" };
  const vals = Array.isArray(p.vals) ? p.vals.slice(0, 3000) : [], nv = [];
  for (const v of vals) {
    const s = Array.isArray(v) ? String(v[2] == null ? "" : v[2]).trim().replace(",", ".") : "x";
    if (s !== "" && !(/^-?\d+(\.\d+)?$/.test(s) && Math.abs(+s) <= 100000)) return { error: "bad" };
    nv.push({ r: parseInt(v[0], 10), n: String(v[1] || "").trim(), v: s === "" ? "" : round3(+s) });
  }
  const who = clean(p.who, 60) || "бар-менеджер", id = "m" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const lock = lockOrBusy(20000);
  try {
    const ss = revBook(), ts = revTotal(ss), st = revDay(true);
    if (st && !revDone(st) && st.date === d) return { error: "open" };
    const pos = revPositions(ts), at = {};
    pos.forEach(x => { at[x.row] = x.n; });
    let col = revColOf(ts, d), fresh = false;
    if (!col) {
      if (!nv.some(x => x.v !== "")) return { error: "empty" };
      const lc = ts.getLastColumn(), hd = lc >= 2 ? ts.getRange(1, 2, 1, lc - 1).getDisplayValues()[0] : [];
      let after = 1;
      hd.forEach((x, i) => { const y = dmy(x); if (y && y <= iso) after = i + 2; });
      if (after < lc) {
        ts.insertColumnsAfter(after, 1);
        if (st && st.tc > after) { st.tc++; revDaySave(st); }             // столбец идущего дня сдвинулся
      } else ensureCols(ts, after + 1);
      col = after + 1; fresh = true;
      ts.getRange(1, col, 2, 1).setNumberFormat("@").setValues([[d], [who + " · " + REV_MAN]]);
      revAtSet(d, p.when === "до" ? isoAt(iso, 17) : isoAt(iso, 33) - 60000);
    }
    const h = pos.length ? pos[pos.length - 1].row - 2 : 0, cur = h ? ts.getRange(3, col, h, 1).getValues() : [], now = new Date(), log = [];
    let skip = 0;
    nv.forEach(x => {
      if (!(x.r >= 3) || at[x.r] !== x.n) { skip++; return; }           // строку сдвинули в таблице — пропускаем
      const o = revCell(cur[x.r - 3][0]), ov = o == null ? "" : o;
      if (ov === x.v) return;
      cur[x.r - 3][0] = x.v;
      log.push([now, who, REV_MAN + " · " + d, "было " + (o == null ? "—" : String(o).replace(".", ",")), x.n, x.v, id]);
    });
    if (log.length) {
      ts.getRange(3, col, h, 1).setValues(cur);
      const lg = revLog(ss), ll = lg.getLastRow();
      ensureRows(lg, ll + log.length);
      lg.getRange(ll + 1, 1, log.length, 7).setValues(log);
    }
    SpreadsheetApp.flush();
    return { ok: true, n: log.length, skip: skip, id: log.length ? id : "", fresh: fresh };
  } finally { lock.releaseLock(); }
}
/* отменить правку {id}: прежние значения из журнала обратно; ручной день, оставшийся пустым, убирается из «Итога» */
function mgrRevUndo(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const id = String(p.id || "");
  if (!/^m[0-9a-z]{4,20}$/.test(id)) return { error: "bad" };
  const lock = lockOrBusy(20000);
  try {
    const ss = revBook(), lg = revLog(ss), last = lg.getLastRow(), rows = last >= 2 ? lg.getRange(2, 1, last - 1, 7).getValues() : [];
    if (rows.some(r => String(r[6]) === id + "u")) return { ok: true, n: 0 };
    const mine = rows.filter(r => String(r[6]) === id);
    if (!mine.length) return { error: "gone" };
    const d = String(mine[0][2]).split(" · ")[1] || "", st = revDay(false);
    if (st && !revDone(st) && st.date === d) return { error: "open" };
    const ts = revTotal(ss), col = revColOf(ts, d), pos = revPositions(ts), byN = {};
    if (!col) return { error: "gone" };
    pos.forEach(x => { if (!(x.n in byN)) byN[x.n] = x.row; });
    const h = pos.length ? pos[pos.length - 1].row - 2 : 0, cur = h ? ts.getRange(3, col, h, 1).getValues() : [], now = new Date(), who = clean(p.who, 60) || "бар-менеджер", back = [];
    mine.forEach(r => {
      const row = byN[String(r[4]).trim()], m = String(r[3]).match(/^было (.+)$/);
      if (!row || !m) return;
      const v = m[1].trim() === "—" ? "" : round3(num(m[1]));
      cur[row - 3][0] = v;
      back.push([now, who, REV_MAN + " · " + d, "отмена правки", String(r[4]).trim(), v, id + "u"]);
    });
    if (back.length) {
      ts.getRange(3, col, h, 1).setValues(cur);
      ensureRows(lg, last + back.length);
      lg.getRange(last + 1, 1, back.length, 7).setValues(back);
    }
    let gone = false;
    if (String(ts.getRange(2, col).getDisplayValue()).indexOf(" · " + REV_MAN) >= 0 && cur.every(r => r[0] === "" || r[0] == null)) {
      ts.deleteColumn(col);                                               // пустой ручной день — столбец убираем совсем
      if (st && st.tc > col) { st.tc--; revDaySave(st); }
      revAtSet(d, 0); gone = true;
    }
    SpreadsheetApp.flush();
    return { ok: true, n: back.length, gone: gone };
  } finally { lock.releaseLock(); }
}

/* ручные поправки периода: «Период» → шаги «Продажи», «Приход», «Списания и проработки» — по позициям ежедневной ревизии.
   Число заменяет насчитанное по данным сайта (продажи × расход на блюдо, накладные, акты) для этой позиции за период между
   двумя соседними ревизиями; пусто — снова по данным. Лист «Поправки периода»: строка — одна позиция, действует последняя
   строка позиции; отмена правки убирает её строки — снова действует прежняя. Период узнаётся по датам ревизий в «Период»
   (их момент — из ленты ревизий; ревизии уже нет — сохранённый). Поправка входит в любой расчёт, который покрывает её
   период целиком: месячную, свои даты, автозаявку. */
const PER_OV = "Поправки периода";
const PER_OV_HEAD = ["Период", "С", "По", "Что", "Позиция", "Ключ", "Значение", "Ед.", "По данным", "Кто", "Когда", "id"];
const PER_F = { sold: "продано", inc: "приход", wo: "списано", pr: "проработки" };
function perOvSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(PER_OV);
  if (sh || !create) return sh;
  const n = ss.insertSheet(PER_OV);
  n.getRange(1, 1, 1, PER_OV_HEAD.length).setValues([PER_OV_HEAD]).setFontWeight("bold");
  n.getRange(1, 7).setNote("В единицах позиции ежедневной ревизии (л, шт, кг). Пусто — снова по данным сайта");
  n.setFrozenRows(1);
  n.setColumnWidth(1, 190);
  n.setColumnWidth(5, 220);
  return n;
}
/* действующие поправки: [{ad, bd, a, b — моменты, f, key, n, v, u}] (пустые — «по данным» — не входят) */
function perOvAll() {
  if (MEMO.pov) return MEMO.pov;
  const sh = perOvSheet(false), last = sh ? sh.getLastRow() : 0, F = {}, cur = {};
  if (last < 2) return MEMO.pov = [];
  Object.keys(PER_F).forEach(k => { F[PER_F[k]] = k; });
  sh.getRange(2, 1, last - 1, PER_OV_HEAD.length).getValues().forEach(r => {
    const pd = String(r[0]).split("→").map(s => s.trim()), f = F[String(r[3]).trim()], key = String(r[5]).trim();
    if (pd.length !== 2 || !f || !key) return;
    cur[pd[0] + "|" + pd[1] + "|" + f + "|" + key] = { ad: pd[0], bd: pd[1], a: num(r[1]), b: num(r[2]), f: f, key: key, n: String(r[4]).trim(),
      v: r[6] === "" || r[6] == null ? null : num(r[6]), u: String(r[7]).trim() };
  });
  const at = {};
  try { revTimeline().revs.forEach(x => { at[x.d] = x.at; }); } catch (e) {}   // нет «Итога» — моменты, сохранённые с правкой
  return MEMO.pov = Object.values(cur).filter(o => o.v != null).map(o => Object.assign(o, { a: at[o.ad] || o.a, b: at[o.bd] || o.b }));
}
/* {i — номер ревизии в ленте (конец периода), ad / bd — даты ревизий, как их видел сайт, f, vals: [[ключ, позиция, число или "", по данным]]} */
function mgrPerSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const f = String(p.f || "");
  if (!PER_F[f]) return { error: "bad" };
  const R = revTimeline().revs, i = parseInt(p.i, 10);
  if (!(i >= 1 && i < R.length)) return { error: "bad" };
  const A = R[i - 1], B = R[i];
  if (String(p.ad || "") !== A.d || String(p.bd || "") !== B.d) return { error: "moved" };   // пока правили, ревизии сдвинулись
  const ref = mgrRef();
  if (!ref.ok) return ref;
  const M = perMaps(ref), du = dailyUnits(ref), vals = Array.isArray(p.vals) ? p.vals.slice(0, 3000) : [], add = [];
  const who = clean(p.who, 60) || "бар-менеджер", now = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm");
  const id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  for (const v of vals) {
    if (!Array.isArray(v)) return { error: "bad" };
    const key = String(v[0] || "").trim(), n = clean(v[1], 200), s = String(v[2] == null ? "" : v[2]).trim().replace(",", ".");
    if (!(key in M.RU) || !n) return { error: "bad" };
    if (s !== "" && !(/^-?\d+(\.\d+)?$/.test(s) && Math.abs(+s) <= 100000)) return { error: "bad" };
    add.push([A.d + " → " + B.d, A.at, B.at, PER_F[f], n, key, s === "" ? "" : round3(+s), du(n), v[3] === "" || v[3] == null ? "" : round3(num(v[3])), who, now, id]);
  }
  if (!add.length) return { error: "empty" };
  const lock = lockOrBusy(20000);
  try {
    const sh = perOvSheet(true), last = sh.getLastRow();
    ensureRows(sh, last + add.length);
    [[1, 1], [4, 3], [8, 1], [10, 3]].forEach(c => sh.getRange(last + 1, c[0], add.length, c[1]).setNumberFormat("@"));
    sh.getRange(last + 1, 1, add.length, PER_OV_HEAD.length).setValues(add);
    SpreadsheetApp.flush();
    MEMO.pov = null;
    return { ok: true, n: add.length, id: id };
  } finally { lock.releaseLock(); }
}
/* отменить правку {id}: её строки убираются — снова действует прежняя правка позиции или данные */
function mgrPerUndo(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const id = String(p.id || "");
  if (!/^p[0-9a-z]{4,20}$/.test(id)) return { error: "bad" };
  const lock = lockOrBusy(20000);
  try {
    const sh = perOvSheet(false), last = sh ? sh.getLastRow() : 0, w = PER_OV_HEAD.length;
    const old = last >= 2 ? sh.getRange(2, 1, last - 1, w).getValues() : [], rows = old.filter(r => String(r[11]) !== id);
    if (rows.length === old.length) return { error: "gone" };
    if (rows.length) sh.getRange(2, 1, rows.length, w).setValues(rows);
    sh.getRange(rows.length + 2, 1, old.length - rows.length, w).setValues(Array.from({ length: old.length - rows.length }, () => Array(w).fill("")));
    SpreadsheetApp.flush();
    MEMO.pov = null;
    return { ok: true, n: old.length - rows.length };
  } finally { lock.releaseLock(); }
}

/* продажи по дням: лист «Продажи» в таблице ревизии (строка — блюдо за день); загрузка за те же дни заменяет их */
const SALES = "Продажи";
const SALES_HEAD = ["Дата", "Код R-Keeper", "Блюдо", "Кол-во", "Сумма", "Файл", "Загружено"];
function salesSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(SALES);
  if (sh || !create) return sh;
  const n = ss.insertSheet(SALES);
  n.getRange(1, 1, 1, SALES_HEAD.length).setValues([SALES_HEAD]).setFontWeight("bold");
  n.setFrozenRows(1);
  n.setColumnWidth(3, 240);
  return n;
}
/* [{iso, code, name, qty, sum, file, at}] */
function salesRows() {
  if (MEMO.sales) return MEMO.sales;
  const sh = salesSheet(false), last = sh ? sh.getLastRow() : 0;
  return MEMO.sales = last < 2 ? [] : sh.getRange(2, 1, last - 1, SALES_HEAD.length).getValues().map(r => ({
    iso: dmy(r[0]) || (/^\d{4}-\d{2}-\d{2}$/.test(String(r[0]).trim()) ? String(r[0]).trim() : ""), code: String(r[1]).trim(), name: String(r[2]).trim(),
    qty: num(r[3]), sum: num(r[4]), file: String(r[5]), at: String(r[6]) })).filter(x => x.iso && (x.code || x.name) && x.qty);
}
/* загрузка с сайта: {days: [ГГГГ-ММ-ДД], rows: [[ГГГГ-ММ-ДД, код, блюдо, кол-во, сумма]], file} — строки этих дней заменяются */
function mgrSalesPut(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const isoOk = x => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ""));
  const days = (Array.isArray(p.days) ? p.days : []).filter(isoOk).slice(0, 120), set = new Set(days);
  const src = Array.isArray(p.rows) ? p.rows : [];
  if (!days.length || src.length > 6000) return { error: "bad" };
  const file = clean(p.file, 120), stamp = Utilities.formatDate(new Date(), TZ, "dd.MM.yyyy HH:mm"), add = [];
  for (const r of src) {
    if (!Array.isArray(r) || !set.has(r[0])) return { error: "bad" };
    const q = num(r[3]);
    if (!q || !(clean(r[1], 40) || clean(r[2], 200))) continue;
    add.push([r[0].split("-").reverse().join("."), clean(r[1], 40), clean(r[2], 200), Math.round(q * 1000) / 1000, Math.round(num(r[4]) * 100) / 100, file, stamp]);
  }
  const lock = lockOrBusy(20000);
  try {
    const sh = salesSheet(true), last = sh.getLastRow(), w = SALES_HEAD.length;
    const old = last >= 2 ? sh.getRange(2, 1, last - 1, w).getValues() : [];
    const keep = old.filter(r => { const d = dmy(r[0]); return (r[1] || r[2]) && !(d && set.has(d)); });
    const rows = keep.concat(add);
    ensureRows(sh, rows.length + 1);
    if (rows.length) {
      sh.getRange(2, 1, rows.length, 3).setNumberFormat("@");
      sh.getRange(2, 6, rows.length, 2).setNumberFormat("@");
      sh.getRange(2, 1, rows.length, w).setValues(rows);
    }
    if (old.length > rows.length) sh.getRange(rows.length + 2, 1, old.length - rows.length, w).setValues(Array.from({ length: old.length - rows.length }, () => Array(w).fill("")));
    SpreadsheetApp.flush();
    MEMO.sales = null;
    return { ok: true, n: add.length, days: days.length };
  } finally { lock.releaseLock(); }
}
/* для сайта: какие дни загружены и продажи по блюдам за период: p.from / p.to (ГГГГ-ММ-ДД) или p.per = "rev" —
   период ревизии (p.a → p.i — номера ревизий в ленте; без них — последний) (продажи тех же смен, что во «Расходе»); по умолчанию — последние 35 дней */
function mgrSales(p) {
  const rows = salesRows(), byDay = {}, by = {}, isoOk = x => /^\d{4}-\d{2}-\d{2}$/.test(x || "");
  let from = isoOk(p.from) ? p.from : new Date(Date.now() + AST - 34 * 864e5).toISOString().slice(0, 10), to = isoOk(p.to) ? p.to : "9999-12-31", label = "";
  let inR = r => r.iso >= from && r.iso <= to;
  if (p.per === "rev") {
    const R = revTimeline().revs;
    let i = parseInt(p.i, 10), a = parseInt(p.a, 10);                  // период из «Периода» (номера ревизий в ленте); по умолчанию — последний
    if (!(i >= 1 && i < R.length)) i = R.length - 1;
    if (!(a >= 0 && a < i)) a = i - 1;
    if (R.length >= 2) {
      const A = R[a], B = R[i];
      inR = r => saleAt(r.iso) > A.at && saleAt(r.iso) <= B.at;
      from = A.iso; to = B.iso; label = WD_RU[isoWd(A.iso)] + " " + A.d.slice(0, 5) + " → " + WD_RU[isoWd(B.iso)] + " " + B.d.slice(0, 5);
    }
  }
  let qty = 0, sum = 0;
  rows.forEach(r => {
    const d = byDay[r.iso] || (byDay[r.iso] = { iso: r.iso, n: 0, qty: 0, sum: 0, file: r.file, at: r.at });
    d.n++; d.qty += r.qty; d.sum += r.sum;
    if (!inR(r)) return;
    qty += r.qty; sum += r.sum;
    const k = dishKey(r.name, r.code), x = by[k] || (by[k] = { name: r.name, code: r.code, qty: 0, sum: 0 });
    x.qty += r.qty; x.sum += r.sum;
  });
  return { ok: true, days: Object.values(byDay).sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 130),
    dishes: Object.values(by).filter(x => x.qty > 0).sort((a, b) => b.qty - a.qty), since: from, from: from, to: to === "9999-12-31" ? "" : to,
    label: label, qty: round3(qty), sum: Math.round(sum), work: workDays() };
}

/* рецепты заготовок: лист «Рецепты заготовок» — сколько сырья на 1 единицу заготовки (1 л сиропа — столько-то сахара) */
const ZAG = "Рецепты заготовок";
const ZAG_HEAD = ["Раздел заготовки", "Заготовка", "Раздел", "Позиция", "На 1 ед.", "Ед.", "Как задано"];
function zagSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(ZAG);
  if (sh || !create) return sh;
  const n = ss.insertSheet(ZAG);
  n.getRange(1, 1, 1, ZAG_HEAD.length).setValues([ZAG_HEAD]).setFontWeight("bold");
  n.getRange(1, 5).setNote("Сколько этой позиции уходит на 1 единицу заготовки (на 1 л), в единицах позиции: 300 г сахара = 0,3 кг");
  n.setFrozenRows(1);
  n.setColumnWidth(2, 220);
  n.setColumnWidth(4, 220);
  return n;
}
function mgrZags() {
  const sh = zagSheet(false), last = sh ? sh.getLastRow() : 0;
  const rows = last >= 2 ? sh.getRange(2, 1, last - 1, ZAG_HEAD.length).getValues().map(r => r.map(x => typeof x === "number" ? x : String(x).trim())) : [];
  return { ok: true, rows: rows.filter(r => r[1] && r[3]) };
}
/* {zags: [{sec, n, comps: [{sec, n, q, u}], src}]} — строки этих заготовок заменяются целиком; comps пусто — рецепт убран */
function mgrZagSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const list = (Array.isArray(p.zags) ? p.zags : []).slice(0, 200);
  if (!list.length) return { error: "bad" };
  const add = [], keys = new Set();
  for (const z of list) {
    const sec = clean(z.sec, 120), n = clean(z.n, 200), src = clean(z.src, 60);
    if (!n) return { error: "bad" };
    keys.add(refKey(sec, n));
    (Array.isArray(z.comps) ? z.comps : []).slice(0, 30).filter(c => c && c.n && num(c.q) > 0)
      .forEach(c => add.push([sec, n, clean(c.sec, 120), clean(c.n, 200), Math.round(num(c.q) * 100000) / 100000, clean(c.u, 20), src]));
  }
  const lock = lockOrBusy(15000);
  try {
    const sh = zagSheet(true), last = sh.getLastRow(), w = ZAG_HEAD.length;
    const old = last >= 2 ? sh.getRange(2, 1, last - 1, w).getValues() : [];
    const rows = old.filter(r => r[1] && !keys.has(refKey(r[0], r[1]))).concat(add);
    ensureRows(sh, rows.length + 1);
    if (rows.length) {
      sh.getRange(2, 1, rows.length, 4).setNumberFormat("@");
      sh.getRange(2, 1, rows.length, w).setValues(rows);
    }
    if (old.length > rows.length) sh.getRange(rows.length + 2, 1, old.length - rows.length, w).setValues(Array.from({ length: old.length - rows.length }, () => Array(w).fill("")));
    SpreadsheetApp.flush();
    return { ok: true, n: list.length };
  } finally { lock.releaseLock(); }
}

/* расчёт периода: p.i — номер ревизии в ленте (конец периода), по умолчанию последняя.
   Строка: {n, key, u — единица ежедневной ревизии, was, inc, sold, wo, pr, exp, now, diff, price — ₽ за u, money, zag, raw, miss} */
function mgrPeriod(p) {
  const ref = mgrRef();
  if (!ref.ok) return ref;
  if (p && p.kind === "m") return mgrPeriodM(p, ref);
  const tl = revTimeline(), R = tl.revs, out = { ok: true, kind: "d", revs: R.map(revOut), rows: [] };
  if (R.length < 2) return out;
  let i = p && p.i != null && String(p.i) !== "" ? parseInt(p.i, 10) : R.length - 1;
  if (!(i >= 1 && i < R.length)) i = R.length - 1;
  let a = i - 1;
  /* свои даты: остатки есть только на ревизиях — период расширяется до ближайших: начало — последняя ревизия не позже «с»,
     конец — первая не раньше «по» (её ещё нет — последняя) */
  const isoOk = x => /^\d{4}-\d{2}-\d{2}$/.test(x || "");
  if (p && isoOk(p.from) && isoOk(p.to) && p.from <= p.to) {
    a = 0; for (let k = 0; k < R.length; k++) if (R[k].iso <= p.from) a = k;
    i = R.length - 1; for (let k = R.length - 1; k >= 0; k--) if (R[k].iso >= p.to) i = k;
    if (i <= a) { if (a < R.length - 1) i = a + 1; else { a = R.length - 2; i = R.length - 1; } }
    out.req = { from: p.from, to: p.to };
  }
  const A = R[a], B = R[i];
  out.i = i; out.a = a; out.from = revOut(A, a); out.to = revOut(B, i);
  out.skipped = tl.all.filter(x => !x.full && x.iso >= A.iso && x.iso <= B.iso && x !== A && x !== B).map(x => ({ d: x.d, z: x.z }));

  /* остатки двух ревизий */
  const M = perMaps(ref), ss = revBook(), ts = revTotal(ss), pos = revPositions(ts), du = dailyUnits(ref);
  const h = pos.length ? pos[pos.length - 1].row - 2 : 0;
  const va = h ? ts.getRange(3, A.col, h, 1).getValues() : [], vb = h ? ts.getRange(3, B.col, h, 1).getValues() : [];
  const items = {}, nokey = [];
  pos.forEach(x => {
    const key = M.byName[nameKey(x.n)] || "";
    if (!key) { nokey.push(x.n); return; }
    if (items[key]) return;                                              // одна позиция дважды в «Итоге» — первая
    items[key] = perItem(x.n, key, du(x.n), revCell(va[x.row - 3][0]), revCell(vb[x.row - 3][0]));
  });
  return perCalc(M, A, B, items, nokey, out);
}
/* месячные ревизии, посчитанные целиком (идущая — нет): [{col, id, d, iso, who — название, at}];
   момент — когда закончили считать: последняя запись журнала этой ревизии (по названию, между её началом и началом следующей) */
function mrevTimeline() {
  if (MEMO.mtl) return MEMO.mtl;
  const sh = mrevSheet(true), b = mrevBlock(), out = [];
  if (!sh || sh.getLastColumn() < 4 || sh.getLastRow() < 7) return MEMO.mtl = out;
  const lc = sh.getLastColumn(), h = sh.getRange(3, 1, 4, lc).getDisplayValues(), openId = b && b.open && !b.done ? b.total : "";
  for (let c = 3; c < lc; c++) {
    const id = String(h[1][c]).trim(), iso = dmy(h[3][c]);
    if (String(h[2][c]).trim() === "Итог" && id && id !== openId && iso) out.push({ col: c + 1, id: id, iso: iso, d: String(h[3][c]).trim().slice(0, 10), who: String(h[0][c]).trim() });
  }
  out.sort((a, x) => a.iso.localeCompare(x.iso));
  const lg = revBook().getSheetByName(REV_LOG) || revBook().getSheetByName("Журнал ревизии"), ll = lg ? lg.getLastRow() : 0;
  const log = ll >= 2 ? lg.getRange(2, 1, ll - 1, 3).getValues().filter(r => r[0] instanceof Date).map(r => ({ t: r[0].getTime(), c: String(r[2]) })) : [];
  out.forEach((x, i) => {
    const t0 = isoAt(x.iso, 0), t1 = i + 1 < out.length ? isoAt(out[i + 1].iso, 0) : Infinity;
    let at = 0;
    log.forEach(r => { if (r.t >= t0 && r.t < t1 && r.t > at && x.who && r.c.indexOf(x.who + " · ") === 0) at = r.t; });
    x.at = at || (b && b.total === x.id && b.end && dmy(b.end) ? isoAt(dmy(b.end), 33) - 60000 : isoAt(x.iso, 33) - 60000);
  });
  return MEMO.mtl = out;
}
/* месячная против продаж: p.i — номер месячной в ленте (конец периода), по умолчанию последняя; числа месячной — в единице справочника */
function mgrPeriodM(p, ref) {
  const R = mrevTimeline(), out = { ok: true, kind: "m", revs: R.map(revOut), rows: [] };
  if (R.length < 2) return out;
  let i = p.i != null && String(p.i) !== "" ? parseInt(p.i, 10) : R.length - 1;
  if (!(i >= 1 && i < R.length)) i = R.length - 1;
  const A = R[i - 1], B = R[i], M = perMaps(ref), sh = mrevSheet(true);
  out.i = i; out.a = i - 1; out.from = revOut(A, i - 1); out.to = revOut(B, i);
  const c0 = Math.min(A.col, B.col), v = sh.getRange(7, c0, sh.getLastRow() - 6, Math.abs(B.col - A.col) + 1).getValues();
  const items = {}, nokey = [];
  let sec = "";
  mrevRows(sh).forEach(x => {
    if (x.t !== "i") { sec = x.n; return; }
    let key = refKey(sec, x.n);
    if (!(key in M.RU)) key = M.byName[nameKey(x.n)] || "";
    if (!key) { nokey.push(x.n); return; }
    if (items[key]) return;
    items[key] = perItem(x.n, key, M.RU[key] === "литр" ? "л" : M.RU[key], revCell(v[x.r - 7][A.col - c0]), revCell(v[x.r - 7][B.col - c0]));
  });
  return perCalc(M, A, B, items, nokey, out);
}
/* справочник для расчёта: ключ, единица, тара, цена; позиция бланка по названию (однозначная) */
function perMaps(ref) {
  const M = { byName: {}, byAll: {}, RU: {}, RT: {}, RP: {} };
  ref.rows.forEach(r => {
    const key = refKey(r[0], r[1]), k = nameKey(r[1]);
    M.RU[key] = refUn(r[2]); M.RT[key] = num(String(r[4]).replace(",", ".")); M.RP[key] = num(String(r[7]).replace(",", "."));
    if (r[9] === 1) { M.byName[k] = k in M.byName ? null : key; (M.byAll[k] = M.byAll[k] || []).push(key); }
  });
  M.keyOf = (sec, n) => { const k = refKey(sec || "", n); if (sec && k in M.RU) return k; const b = M.byName[nameKey(n)]; return b || ""; };
  return M;
}
const perItem = (n, key, u, was, now) => ({ n: n, key: key, u: u, was: was, now: now, inc: 0, sold: 0, wo: 0, pr: 0, zwas: 0, znow: 0, zin: 0, au: {} });
/* движение между моментами A.at и B.at для позиций items (u — единица позиции: «л», «шт», «кг», «бут»): приход, продажи,
   списания, проработки, заготовки в сырьё → строки {exp, diff, money}. Общий расчёт для ежедневной, месячной и автозаявки.
   Ручные поправки периода (лист «Поправки периода»), чей период целиком внутри, заменяют насчитанное по данным за свой период. */
function perCalc(M, A, B, items, nokey, out) {
  const byName = M.byName, byAll = M.byAll, RU = M.RU, RT = M.RT, RP = M.RP, keyOf = M.keyOf, inP = t => t > A.at && t <= B.at;
  /* в единицы позиции ревизии; несовместимо — null */
  const toU = (key, q, u) => items[key] ? conv(q, u === "л" ? "литр" : u, items[key].u === "л" ? "литр" : items[key].u, RT[key]) : null;
  /* поправки: ключ → поле → [{a, b, v, u}]; событие в моменте t внутри периода поправки уже учтено в ней */
  const OV = {};
  perOvAll().forEach(o => { if (items[o.key] && o.a >= A.at && o.b <= B.at && o.a < o.b) ((OV[o.key] = OV[o.key] || {})[o.f] = OV[o.key][o.f] || []).push(o); });
  const ovIn = (key, f, t) => t != null && !!(OV[key] && OV[key][f] || []).some(o => t > o.a && t <= o.b);

  /* рецепты заготовок: ключ заготовки → [{key, q (в единице справочника сырья на 1 ед. заготовки), u}] */
  const zag = {};
  mgrZags().rows.forEach(r => {
    const zk = keyOf(r[0], r[1]), ck = keyOf(r[2], r[3]);
    if (!zk || !ck || !(num(r[4]) > 0)) return;
    (zag[zk] = zag[zk] || []).push({ key: ck, q: num(r[4]), u: refUn(r[5] || RU[ck]) });
  });
  /* q единиц позиции key (в единице справочника) → сырьё: [{key, q, u}]; заготовка без рецепта — сама собой */
  const expand = (key, q, u, depth) => {
    const rc = zag[key];
    if (!rc || depth > 2) return [{ key: key, q: q, u: u }];
    const qz = conv(q, u, RU[key], RT[key]);
    if (qz == null) return [{ key: key, q: q, u: u }];
    return [].concat.apply([], rc.map(c => expand(c.key, qz * c.q, c.u, (depth || 0) + 1)));
  };
  const put = (field, key, q, u, t) => expand(key, q, u, 0).forEach(c => {
    const x = items[c.key];
    if (!x) return;
    const v = toU(c.key, c.q, c.u);
    if (v == null) { (out.unconv = out.unconv || {})[x.n] = 1; return; }
    x.au[field] = (x.au[field] || 0) + v;                                 // по данным — для «по данным: …» у поправки
    if (ovIn(c.key, field, t)) return;
    x[field] += v;
    if (c.key !== key) x.zin = 1;                                         // в сырьё вошли заготовки
  });

  /* заготовки, посчитанные в ревизии, с рецептом — их остаток уходит в сырьё (сама строка — для справки) */
  Object.keys(items).forEach(k => {
    const x = items[k];
    if (!zag[k]) return;
    x.zag = 1;
    const ru = x.u === "л" ? "литр" : x.u;
    if (x.was != null) put("zwas", k, x.was, ru);
    if (x.now != null) put("znow", k, x.now, ru);
  });

  /* приход */
  const inl = inByKey();
  Object.keys(inl).forEach(k => inl[k].forEach(y => { const t = incAt(y.iso, y.w); if (inP(t)) put("inc", k, y.q, y.u, t); }));

  /* списания и проработки — по моменту; акт, PDF которого удалили с Диска, не учитывается */
  const womiss = {}, lo = new Date(A.at + AST - 2 * 864e5).toISOString().slice(0, 10);
  Object.keys(WO_KINDS).forEach(kind => {
    const sh = woSheet(kind, false), last = sh ? sh.getLastRow() : 0;
    if (last < 2) return;
    const acts = {}, lines = [];
    sh.getRange(2, 1, last - 1, WO_GONE_COL).getValues().forEach((r, ri) => {
      const iso = dmy(r[0]);
      if (!iso || iso < lo) return;
      const rec = ruTime(r[8] instanceof Date ? Utilities.formatDate(r[8], TZ, "dd.MM.yyyy HH:mm") : r[8]), t = actAt(iso, rec);
      if (!inP(t)) return;
      const id = String(r[9]), a = acts[id] || (acts[id] = { fid: (String(r[7]).match(/\/d\/([\w-]{10,})/) || [])[1] || "", rows: [], mark: String(r[WO_GONE_COL - 1] || "") });
      a.rows.push(ri + 2);
      lines.push({ a: a, r: r, t: t });
    });
    const all = Object.values(acts), gone = woGoneMap(all.map(a => a.fid).filter(Boolean), 40);
    woMarkGone(sh, all, gone);
    lines.forEach(L => {
      if (woHidden(L.a, gone)) return;
      const r = L.r, nk = nameKey(r[2]);
      let key = byName[nk];
      if (key === null) { const fit = (byAll[nk] || []).filter(k => woConv(1, r[3], RU[k], RT[k]) != null); if (fit.length === 1) key = fit[0]; }
      const miss = why => { womiss[String(r[2]).trim() + "|" + why] = { n: String(r[2]).trim(), u: String(r[3]).trim(), why: why, pu: key && items[key] ? items[key].u : "" }; };
      if (!key) return miss(nk in byName ? "ambiguous" : "name");
      if (!expand(key, 1, RU[key], 0).some(c => items[c.key])) return miss("norev");   // позиции нет в ежедневной ревизии
      const q0 = woConv(num(r[4]), r[3], RU[key], RT[key]);
      if (q0 == null) return miss("unit");
      if (q0 > 0) put(kind === "pr" ? "pr" : "wo", key, q0, RU[key], L.t);
    });
  });
  out.womiss = Object.values(womiss).slice(0, 40);

  /* продажи периода × «Расход на блюдо» */
  const dishes = {}, dcodes = {}, DR = mgrDishes().rows;
  DR.forEach(r => {
    const k = dishKey(r[0], r[1]);
    if (r[1]) (dcodes[nameKey(r[0])] = dcodes[nameKey(r[0])] || new Set()).add(String(r[1]));
    const d = dishes[k] || (dishes[k] = { none: false, comps: [] });
    if (/^[—–-]$/.test(String(r[3]).trim())) { d.none = true; return; }
    const ck = keyOf(r[2], r[3]);
    /* «Ед.» пусто — сохранено, когда пустая единица значила «бутылки» */
    if (ck && num(r[4]) > 0) d.comps.push({ key: ck, q: num(r[4]), u: String(r[5]).trim() || "бут" });
  });
  DR.forEach(r => { const n = nameKey(r[0]); if (r[1] && !dishes["n:" + n] && dcodes[n] && dcodes[n].size === 1) dishes["n:" + n] = dishes[dishKey(r[0], r[1])]; });
  const sold = {}, days = {}, nodish = {};
  salesRows().forEach(s => {
    const t = saleAt(s.iso);
    if (!inP(t)) return;
    days[s.iso] = (days[s.iso] || 0) + s.qty;
    const d = dishes[dishKey(s.name, s.code)] || dishes["n:" + nameKey(s.name)];
    if (!d || (!d.none && !d.comps.length)) { const nk = s.code || s.name; (nodish[nk] = nodish[nk] || { name: s.name, code: s.code, qty: 0 }).qty += s.qty; return; }
    if (d.none) return;
    d.comps.forEach(c => { const k = c.key + "|" + c.u + "|" + t; sold[k] = (sold[k] || 0) + c.q * s.qty; });
  });
  Object.keys(sold).forEach(k => { const p = k.split("|"); put("sold", p.slice(0, -2).join("|"), sold[k], p[p.length - 2], +p[p.length - 1]); });
  /* поправки — вместо насчитанного за свой период */
  let nman = 0;
  Object.keys(OV).forEach(k => Object.keys(OV[k]).forEach(f => OV[k][f].forEach(o => {
    const v = toU(k, o.v, o.u || RU[k]);
    if (v == null) { (out.unconv = out.unconv || {})[items[k].n] = 1; return; }
    items[k][f] += v; (items[k].man = items[k].man || {})[f] = 1; nman++;
  })));
  out.man = nman;
  /* за какие дни ждём продажи: рабочие дни, чья смена внутри периода */
  const W = workDays(), want = [];
  for (let t = Date.parse(A.iso + "T00:00:00Z"); t <= Date.parse(B.iso + "T00:00:00Z") + 864e5; t += 864e5) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (inP(saleAt(iso)) && W.indexOf(isoWd(iso)) >= 0) want.push(iso);
  }
  /* блюдо без расхода похоже на бар, если в его названии есть слово из позиций ревизии («Сок апельсиновый 250 мл»);
     кухня и прочее — нет: о них не предупреждаем (сайт ещё сверяет с техкартами) */
  const bw = new Set();
  Object.keys(items).forEach(k => nameKey(items[k].n).split(" ").forEach(w => { if (w.length >= 4 && !/\d/.test(w)) bw.add(w); }));
  Object.values(nodish).forEach(x => { x.rel = nameKey(x.name).split(" ").some(w => bw.has(w)); });
  out.sales = { want: want, have: Object.keys(days).sort(), miss: want.filter(d => !days[d]), qty: Object.values(days).reduce((a, b) => a + b, 0),
    nodish: Object.values(nodish).sort((a, b) => b.rel - a.rel || b.qty - a.qty).slice(0, 80) };

  /* строки */
  let short = 0, over = 0;
  Object.keys(items).forEach((k, o) => {
    const x = items[k], r = { n: x.n, key: k, o: o, u: x.u, inc: r3(x.inc), sold: r3(x.sold), wo: r3(x.wo), pr: r3(x.pr), zag: !!x.zag, raw: !!x.zin };
    if (x.man) { r.man = {}; Object.keys(x.man).forEach(f => { r.man[f] = r3(x.au[f] || 0); }); }   // вручную; число — по данным
    /* остаток сырья вместе с заготовками из него */
    const was = x.was == null ? null : x.was + (x.zwas || 0), now = x.now == null ? null : x.now + (x.znow || 0);
    r.was = was == null ? null : r3(was); r.now = now == null ? null : r3(now);
    r.zwas = x.zwas ? r3(x.zwas) : 0; r.znow = x.znow ? r3(x.znow) : 0;
    const f = conv(1, x.u === "л" ? "литр" : x.u, RU[k], RT[k]);           // сколько единиц справочника в 1 единице ревизии
    r.price = RP[k] && f != null ? Math.round(RP[k] * f * 100) / 100 : 0;
    if (x.zag) { r.info = 1; out.rows.push(r); return; }                  // заготовка с рецептом — уже в сырье
    if (was != null) r.exp = r3(was + x.inc - x.sold - x.wo - x.pr);      // ожидалось (автозаявке — «сейчас»)
    if (was == null || now == null) { r.miss = was == null ? "from" : "to"; out.rows.push(r); return; }
    r.diff = r3(now - r.exp);
    r.money = Math.round(r.diff * r.price);
    if (r.money < 0) short -= r.money; else over += r.money;
    out.rows.push(r);
  });
  out.rows.sort((a, b) => (a.info || a.miss ? 1 : 0) - (b.info || b.miss ? 1 : 0) || Math.abs(b.money || 0) - Math.abs(a.money || 0) || Math.abs(b.diff || 0) - Math.abs(a.diff || 0) || a.n.localeCompare(b.n, "ru"));
  out.short = short; out.over = over;
  out.nokey = nokey;
  out.noprice = out.rows.filter(r => !r.info && !r.miss && r.diff && !r.price).length;
  out.unconv = Object.keys(out.unconv || {});
  out.zagno = Object.keys(items).filter(k => /^(заготовки|премиксы на коктейли|настойки)\|/.test(k) && !zag[k]).map(k => items[k].n);
  return out;
}

/* ═════════════ Для гостей: меню и «Состав и аллергены» из таблицы ═════════════
   Листы в таблице ревизии: «Меню» (строка — позиция меню, по порядку), «Карта» (позиции «Состава и аллергенов»)
   и «Карта разделы». Создаются кнопкой «Перенести в таблицу» на сайте («Менеджер» → «Гостям») из того, что сейчас
   в файлах сайта. Дальше правятся здесь или на сайте. Гости получают их без пароля (pub=1), ответ помнится 5 минут —
   правка прямо в таблице видна гостям через 5 минут, правка с сайта — сразу. Пустое «Название EN» — гость
   увидит русское. Пустое название или описание в меню у коктейля со ссылкой на карту — берутся из карты.
   «Скрыть» = да — позиция не показывается, но остаётся в таблице. */
const PUB_M = "Меню", PUB_C = "Карта", PUB_G = "Карта разделы", PUB_TTL = 300;
const PUB_MH = ["Глава", "Глава EN", "Раздел", "Раздел EN", "Плитки", "Название", "Название EN", "Описание", "Описание EN",
  "Объём", "Ед.", "Цена", "id в карте", "Код R-Keeper", "Скрыть", "uid"];
const PUB_CH = ["Раздел", "id", "Название", "Название EN", "Состав для гостей", "Состав EN", "Полный состав (этикетка, через ;)",
  "Аллергены", "Аллергены EN", "Объём подачи", "Фото", "Значок этикетки", "Название на этикетке", "Только этикетка", "Скрыть",
  "История", "История EN", "Вкус", "Вкус EN", "О составе", "О составе EN", "Цвет"];   // «Узнать больше» у коктейля с фото
const PUB_GH = ["key", "Название", "Кратко", "Правило", "Срок", "Хранение", "Подача", "Без этикеток", "Название EN", "Кратко EN", "Правило EN"];
const PUB_NOTES = {
  "Плитки": "да — раздел показывается карточками с фото (коктейли)", "Ед.": "мл (пусто) или шт",
  "id в карте": "id позиции в листе «Карта» — у позиции появится ссылка «Состав и аллергены», а пустые название и описание берутся оттуда",
  "Код R-Keeper": "заполняется сам при загрузке цен из R-Keeper", "Скрыть": "да — не показывать гостям", "uid": "служебный, не менять",
  "id": "латиницей, не менять — на него ведут QR-коды этикеток", "Полный состав (этикетка, через ;)": "как на этикетке: через точку с запятой",
  "Аллергены": "«Не выявлены» или перечень", "Объём подачи": "мл — для разделов с подачей", "Фото": "photos/имя.webp",
  "Значок этикетки": "имя значка, например i-pear", "Только этикетка": "да — только для этикеток, гостям не показывать",
  "История": "«Узнать больше»: история коктейля (до 300 знаков). Пусто — текст сайта, «—» — раздел не показывать",
  "Вкус": "«Узнать больше»: вкус (до 240 знаков). Пусто — текст сайта, «—» — не показывать",
  "О составе": "«Узнать больше»: коротко о составе (до 220 знаков). Пусто — текст сайта, «—» — не показывать",
  "Цвет": "цвет карточки «Узнать больше», например #F07B55; пусто — по фото"};
const yes = v => /^(да|1|true|x|\+)$/i.test(String(v).trim());
const TRL = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const pubId = n => String(n).toLowerCase().split("").map(c => c in TRL ? TRL[c] : c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";

function pubSheet(name, head, create) {
  const ss = revBook(), sh = ss.getSheetByName(name);
  if (sh || !create) return sh;
  const n = ss.insertSheet(name);
  n.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold");
  head.forEach((h, i) => { if (PUB_NOTES[h]) n.getRange(1, i + 1).setNote(PUB_NOTES[h]); });
  n.setFrozenRows(1);
  return n;
}
/* Столбцы листов «Меню» / «Карта» / «Карта разделы» — по названиям в шапке: столбец переставили, удалили или вставили
   свой — ничего не съезжает. Нет нужного заголовка — поле пусто (и mgrPubRaw скажет, какого). */
function pubLayout(sh, head) {
  const lc = Math.max(sh.getLastColumn(), 1), h = sh.getRange(1, 1, 1, lc).getDisplayValues()[0].map(x => String(x).trim());
  const idx = head.map((name, i) => { const j = h.indexOf(name); return j >= 0 ? j : !h[i] ? i : -1; });   // нет заголовка — его место, если пусто
  return { idx: idx, lc: Math.max(lc, ...idx.map(x => x + 1)), miss: head.filter((_, i) => idx[i] < 0 || !h[idx[i]]) };
}
function pubRows(sh, head) {
  const last = sh ? sh.getLastRow() : 0;
  if (last < 2) return [];
  const L = pubLayout(sh, head);
  return sh.getRange(2, 1, last - 1, L.lc).getValues().map(r => L.idx.map(j => {
    const x = j < 0 ? "" : r[j];
    return typeof x === "number" ? x : x instanceof Date ? "" : String(x == null ? "" : x).trim();
  }));
}
/* одна строка листа: поля в порядке head → в их столбцы; остальные столбцы строки (свои пометки, формулы) не трогаем */
function pubPut(sh, head, at, row) {
  const L = pubLayout(sh, head), cols = L.idx.filter(j => j >= 0), c0 = Math.min.apply(null, cols), c1 = Math.max.apply(null, cols);
  const rg = sh.getRange(at, c0 + 1, 1, c1 - c0 + 1), cur = rg.getValues()[0];
  L.idx.forEach((j, i) => { if (j >= 0) cur[j - c0] = row[i]; });
  rg.setNumberFormat("@").setValues([cur]);
  const pc = head.indexOf("Цена");
  if (pc >= 0 && L.idx[pc] >= 0) sh.getRange(at, L.idx[pc] + 1).setNumberFormat("General").setValue(row[pc]);
}
/* кэш для гостей: правка с сайта сбрасывает его и меняет «поколение» — чтение, начатое до правки, свою копию не положит */
const pubDrop = () => { const c = CacheService.getScriptCache(); c.put("pubgen", String(Date.now()) + Math.random(), 21600); c.remove("pub"); };
/* всё для гостей: меню, разделы и позиции карты (скрытые — без них) */
function pubGet() {
  const cache = CacheService.getScriptCache(), c = cache.get("pub");
  if (c) return JSON.parse(c);
  const gen = cache.get("pubgen");
  const ms = pubSheet(PUB_M, PUB_MH, false), cs = pubSheet(PUB_C, PUB_CH, false), gs = pubSheet(PUB_G, PUB_GH, false);
  if (!ms && !cs) return { ok: true, none: 1 };
  /* сломана шапка (нет «Название», «Цена», «Скрыть» …) — гости видят последнее исправное меню, пока менеджер не починит */
  const need = (sh, head, req) => !sh || req.every(x => pubLayout(sh, head).miss.indexOf(x) < 0);
  if (!need(ms, PUB_MH, ["Глава", "Раздел", "Название", "Цена", "id в карте", "Скрыть"]) || !need(cs, PUB_CH, ["Раздел", "id", "Название", "Скрыть"])) {
    const good = cache.get("pubgood");
    if (good) return JSON.parse(good);
  }
  const menu = pubRows(ms, PUB_MH).filter(r => (r[5] || r[12]) && !yes(r[14])).map(r => r.slice(0, 14));
  const ids = {}, items = pubRows(cs, PUB_CH).filter(r => r[2] && !yes(r[14])).map(r => {
    let id = r[1] || pubId(r[2]);
    while (ids[id]) id += "-2";
    ids[id] = 1; r[1] = id;
    return r.slice(0, 14).concat([""], r.slice(15, PUB_CH.length));       // «Скрыть» гостям не нужно; дальше — «Узнать больше»
  });
  const groups = pubRows(gs, PUB_GH).filter(r => r[0]);
  const out = { ok: true, menu: menu, groups: groups, items: items };
  out.v = sha(JSON.stringify(out)).slice(0, 12);
  const j = JSON.stringify(out);
  if (j.length < 95000 && cache.get("pubgen") === gen) { cache.put("pub", j, PUB_TTL); cache.put("pubgood", j, 21600); }
  return out;
}

/* для редактора менеджера: всё, со скрытыми; строкам меню без uid (или с uid, скопированным вместе со строкой)
   и позициям без id — выдать новый (под блокировкой) */
function mgrPubRaw() {
  const ms = pubSheet(PUB_M, PUB_MH, false), cs = pubSheet(PUB_C, PUB_CH, false), gs = pubSheet(PUB_G, PUB_GH, false);
  if (!ms && !cs) return { ok: true, none: 1 };
  const lock = lockOrBusy(15000);
  try {
    /* листы прошлых версий: пустые ячейки шапки (например, «uid») — дописать */
    [[ms, PUB_MH], [cs, PUB_CH], [gs, PUB_GH]].forEach(([sh, head]) => {
      if (!sh) return;
      const h = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), head.length)).getDisplayValues()[0].map(x => String(x).trim());
      head.forEach((name, i) => { if (!h[i] && h.indexOf(name) < 0) sh.getRange(1, i + 1).setValue(name).setFontWeight("bold"); });
    });
    const menu = pubRows(ms, PUB_MH), items = pubRows(cs, PUB_CH), seen = {};
    let fix = false;
    menu.forEach(r => {
      if (!(r[5] || r[12])) return;
      if (!r[15] || seen[r[15]]) { r[15] = Utilities.getUuid().slice(0, 8); fix = true; }
      seen[r[15]] = 1;
    });
    const um = ms ? pubLayout(ms, PUB_MH).idx[15] : -1;
    if (fix && um >= 0) ms.getRange(2, um + 1, menu.length, 1).setNumberFormat("@").setValues(menu.map(r => [r[15]]));
    const ids = {};
    let fixc = false;
    items.forEach(r => { if (!r[2]) return; let id = r[1] || pubId(r[2]); while (ids[id] && ids[id] !== r) id += "-2"; if (id !== r[1]) { r[1] = id; fixc = true; } ids[id] = r; });
    const ic = cs ? pubLayout(cs, PUB_CH).idx[1] : -1;
    if (fixc && ic >= 0) cs.getRange(2, ic + 1, items.length, 1).setValues(items.map(r => [r[1]]));
    if (fix || fixc) pubDrop();
    const warn = [[ms, PUB_M, PUB_MH], [cs, PUB_C, PUB_CH], [gs, PUB_G, PUB_GH]].filter(x => x[0]).map(x => {
      const m = pubLayout(x[0], x[2]).miss;
      return m.length ? "в листе «" + x[1] + "» нет столбцов: " + m.join(", ") : "";
    }).filter(Boolean).join("; ");
    return { ok: true, menu: menu, items: items, groups: pubRows(gs, PUB_GH), warn: warn };
  } finally { lock.releaseLock(); }
}

/* перенос из файлов сайта: {menu: [[…PUB_MH без uid]], items: [[…PUB_CH]], groups: [[…PUB_GH]]} — только если листов ещё нет */
function mgrPubSeed(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const menu = Array.isArray(p.menu) ? p.menu.slice(0, 2000) : [], items = Array.isArray(p.items) ? p.items.slice(0, 1000) : [],
    groups = Array.isArray(p.groups) ? p.groups.slice(0, 50) : [];
  if (!menu.length || !items.length || !groups.length) return { error: "bad" };
  const lock = lockOrBusy(20000);
  try {
    if (pubSheet(PUB_M, PUB_MH, false) || pubSheet(PUB_C, PUB_CH, false)) return { error: "exists" };
    const cell = (v, n) => typeof v === "number" ? v : clean(v, n || 600);
    const put = (sh, rows, w) => {
      if (!rows.length) return;
      ensureRows(sh, rows.length + 1);
      sh.getRange(2, 1, rows.length, w).setNumberFormat("@");
      sh.getRange(2, 1, rows.length, w).setValues(rows.map(r => Array.from({ length: w }, (_, i) => cell(r[i] == null ? "" : r[i]))));
    };
    const ms = pubSheet(PUB_M, PUB_MH, true), cs = pubSheet(PUB_C, PUB_CH, true), gs = pubSheet(PUB_G, PUB_GH, true);
    put(ms, menu.map(r => r.slice(0, 15).concat([Utilities.getUuid().slice(0, 8)])), PUB_MH.length);
    ms.getRange(2, 12, menu.length, 1).setNumberFormat("General").setValues(menu.map(r => [typeof r[11] === "number" ? r[11] : cell(r[11], 30)]));
    put(cs, items, PUB_CH.length);
    put(gs, groups, PUB_GH.length);
    SpreadsheetApp.flush();
    pubDrop();
    return { ok: true };
  } finally { lock.releaseLock(); }
}
/* правка с сайта: {t: "m"|"c", act: "set"|"add"|"del", key: uid или id, after: uid/id, row: [...], base: строка, как её загрузил сайт}.
   Пишется одна строка (вставка / удаление строки листа): формулы и пометки в остальных строках не трогаются.
   set — только поля, которые на сайте поменяли (сравнение с base): цену, поменявшуюся тем временем на другом телефоне
   или в таблице, устаревшая форма не вернёт. Код R-Keeper с сайта не меняется. */
function mgrPubSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const isM = p.t === "m", head = isM ? PUB_MH : PUB_CH, w = head.length, kc = isM ? 15 : 1;
  const cl = v => typeof v === "number" ? v : clean(v == null ? "" : v, 600);
  const row = Array.isArray(p.row) ? Array.from({ length: w }, (_, i) => cl(p.row[i])) : null;
  const base = Array.isArray(p.base) ? Array.from({ length: w }, (_, i) => cl(p.base[i])) : null;
  const lock = lockOrBusy(15000);
  try {
    const sh = pubSheet(isM ? PUB_M : PUB_C, head, false);
    if (!sh) return { error: "none" };
    const rows = pubRows(sh, head), hits = rows.map((r, i) => String(r[kc]) === String(p.key || "") ? i : -1).filter(i => i >= 0);
    if (p.act !== "add" && hits.length > 1) return { error: "dup" };       // строку скопировали вместе с uid — сайт перезагрузит
    const at = hits.length ? hits[0] : -1;
    if (p.act === "del") {
      if (at < 0) return { error: "gone" };
      sh.deleteRow(at + 2);
    } else if (p.act === "set") {
      if (at < 0 || !row) return { error: at < 0 ? "gone" : "bad" };
      const cur = rows[at];
      const out = cur.map((x, i) => i === kc || (isM && i === 13) ? x : base && String(row[i]) === String(base[i]) ? x : row[i]);
      pubPut(sh, head, at + 2, out);
    } else if (p.act === "add") {
      if (!row) return { error: "bad" };
      if (isM) row[15] = Utilities.getUuid().slice(0, 8);
      else {
        let id = /^[a-z0-9-]{1,40}$/.test(row[1]) ? row[1] : pubId(row[2]);
        while (rows.some(r => r[1] === id)) id += "-2";
        row[1] = id;
      }
      const after = p.after ? rows.findIndex(r => String(r[kc]) === String(p.after)) : -1;   // пусто — в конец, не к пустым строкам
      let to;
      if (after >= 0 && after < rows.length - 1) { sh.insertRowAfter(after + 2); to = after + 3; }
      else { to = Math.max(sh.getLastRow(), 1) + 1; ensureRows(sh, to); }
      pubPut(sh, head, to, row);
    } else return { error: "action" };
    SpreadsheetApp.flush();
    pubDrop();
    return { ok: true, key: p.act === "add" ? row[kc] : p.key };
  } finally { lock.releaseLock(); }
}
/* тексты «Узнать больше» с сайта в лист «Карта»: {rows: [{id, v: [история, EN, вкус, EN, о составе, EN, цвет]}]} —
   пишутся только в пустые ячейки (поправленное в таблице не затирается) */
const PUB_ST = PUB_CH.indexOf("История");
function mgrPubStory(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const list = (Array.isArray(p.rows) ? p.rows : []).slice(0, 300).filter(x => x && x.id && Array.isArray(x.v));
  if (!list.length) return { error: "bad" };
  const lock = lockOrBusy(20000);
  try {
    const sh = pubSheet(PUB_C, PUB_CH, false);
    if (!sh) return { error: "none" };
    const h = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), PUB_CH.length)).getDisplayValues()[0].map(x => String(x).trim());
    PUB_CH.forEach((name, i) => { if (!h[i] && h.indexOf(name) < 0) sh.getRange(1, i + 1).setValue(name).setFontWeight("bold"); });   // шапка прошлой версии
    const rows = pubRows(sh, PUB_CH), by = {};
    rows.forEach((r, i) => { if (r[1]) by[r[1]] = by[r[1]] == null ? i : -1; });
    let n = 0;
    list.forEach(x => {
      const i = by[String(x.id)];
      if (i == null || i < 0) return;
      const out = rows[i].slice();
      let ch = false;
      for (let k = 0; k < PUB_CH.length - PUB_ST; k++) {
        const v = clean(x.v[k] == null ? "" : x.v[k], 600);
        if (v && !String(out[PUB_ST + k]).trim()) { out[PUB_ST + k] = v; ch = true; }
      }
      if (ch) { pubPut(sh, PUB_CH, i + 2, out); n++; }
    });
    if (n) { SpreadsheetApp.flush(); pubDrop(); }
    return { ok: true, n: n };
  } finally { lock.releaseLock(); }
}
/* цены из прейскуранта R-Keeper: {rows: [{uid, price, code}]} */
function mgrPrices(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const up = (Array.isArray(p.rows) ? p.rows : []).slice(0, 2000).filter(r => r && r.uid && num(r.price) > 0);
  if (!up.length) return { error: "bad" };
  const lock = lockOrBusy(15000);
  try {
    const sh = pubSheet(PUB_M, PUB_MH, false);
    if (!sh) return { error: "none" };
    const rows = pubRows(sh, PUB_MH), by = {}, L = pubLayout(sh, PUB_MH), pc = L.idx[11], cc = L.idx[13];
    if (pc < 0) return { error: "none" };
    rows.forEach((r, i) => { by[r[15]] = by[r[15]] == null ? i : -1; });     // одинаковые uid — ни одной не трогаем
    let n = 0;
    up.forEach(u => {
      const i = by[u.uid];
      if (i == null || i < 0) return;
      /* только изменившиеся ячейки: формулы и оформление остального столбца не трогаем */
      sh.getRange(i + 2, pc + 1).setValue(Math.round(num(u.price) * 100) / 100);
      if (u.code && !rows[i][13] && cc >= 0) sh.getRange(i + 2, cc + 1).setNumberFormat("@").setValue(clean(u.code, 40));
      n++;
    });
    if (n) {
      SpreadsheetApp.flush();
      pubDrop();
    }
    return { ok: true, n: n };
  } finally { lock.releaseLock(); }
}

/* ── Продажи против ревизии (бар-менеджер) ──
   Лист «Расход на блюдо» в таблице ревизии: сколько каждой позиции справочника уходит на одно блюдо R-Keeper
   (строка — блюдо × позиция; у блюда без расхода — одна строка с позицией «—»). Заполняется на сайте
   («Менеджер» → «Продажи»: подсказки из техкарт и меню, подтверждение) или прямо здесь. Отчёт о продажах и расчёт
   разницы — на сайте, сюда не пишутся. */
const DISH = "Расход на блюдо";
const DISH_HEAD = ["Блюдо R-Keeper", "Код R-Keeper", "Раздел", "Позиция", "На 1 блюдо", "Ед.", "Как задано"];

function dishSheet(create) {
  const ss = revBook(), sh = ss.getSheetByName(DISH);
  if (sh || !create) return sh;
  const n = ss.insertSheet(DISH);
  n.getRange(1, 1, 1, DISH_HEAD.length).setValues([DISH_HEAD]).setFontWeight("bold");
  n.getRange(1, 4).setNote("Позиция справочника; «—» — блюдо ничего не списывает (не учитывать)");
  n.getRange(1, 5).setNote("В единицах позиции: литры, штуки, кг (40 мл = 0,04)");
  n.setFrozenRows(1);
  n.setColumnWidth(1, 220);
  n.setColumnWidth(4, 220);
  return n;
}
const dishKey = (name, code) => String(code || "").trim() ? "c:" + String(code).trim() : "n:" + nameKey(name);
function mgrDishes() {
  const sh = dishSheet(false), last = sh ? sh.getLastRow() : 0;
  const rows = last >= 2 ? sh.getRange(2, 1, last - 1, DISH_HEAD.length).getValues().map(r => r.map(x => typeof x === "number" ? x : String(x).trim())) : [];
  return { ok: true, rows: rows.filter(r => r[0] || r[1]) };
}
/* {dishes: [{name, code, comps: [{sec, n, q, u}], none, src}]} — строки этих блюд заменяются целиком */
function mgrDishSet(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const list = (Array.isArray(p.dishes) ? p.dishes : []).slice(0, 500);
  if (!list.length) return { error: "bad" };
  /* заменяются строки этого кода и строки того же названия без кода (сохранённые раньше по названию);
     то же название с другим кодом (порция и бутылка навынос) — не трогаем */
  const add = [], codes = new Set(), names = new Set();
  for (const d of list) {
    const name = clean(d.name, 200), code = clean(d.code, 40), src = clean(d.src, 40);
    if (!name && !code) return { error: "bad" };
    if (code) codes.add(code);
    if (name) names.add(nameKey(name));
    if (d.none) { add.push([name, code, "", "—", "", "", src]); continue; }
    const comps = (Array.isArray(d.comps) ? d.comps : []).slice(0, 30).filter(c => c && c.n && num(c.q) > 0);
    if (!comps.length) return { error: "bad" };
    comps.forEach(c => add.push([name, code, clean(c.sec, 120), clean(c.n, 200), Math.round(num(c.q) * 100000) / 100000, clean(c.u, 20), src]));
  }
  const lock = lockOrBusy(15000);
  try {
    const sh = dishSheet(true), last = sh.getLastRow(), w = DISH_HEAD.length;
    const old = last >= 2 ? sh.getRange(2, 1, last - 1, w).getValues() : [];
    const keep = old.filter(r => (r[0] || r[1]) && !(String(r[1]).trim() ? codes.has(String(r[1]).trim()) : names.has(nameKey(r[0]))));
    const rows = keep.concat(add);
    ensureRows(sh, rows.length + 1);
    if (rows.length) {
      sh.getRange(2, 1, rows.length, 4).setNumberFormat("@");
      sh.getRange(2, 1, rows.length, w).setValues(rows);
    }
    if (old.length > rows.length) sh.getRange(rows.length + 2, 1, old.length - rows.length, w).setValues(Array.from({ length: old.length - rows.length }, () => Array(w).fill("")));
    SpreadsheetApp.flush();
    return { ok: true, n: list.length };
  } finally { lock.releaseLock(); }
}

/* ═════════════ Еженедельный отчёт на почту ═════════════
   Каждый понедельник в 9:00 по Астане — письмо за прошлую неделю (пн–вс): списания и проработки, ревизии и странности
   последней, приход, что ниже нормы, открытия смен и входы. Получатели — «Менеджер» → «Отчёт» (свойство REPORT_EMAIL,
   через запятую; пусто — владелец таблицы). Там же — предпросмотр, «Отправить сейчас» и включение по понедельникам.
   Если сайт пишет, что нет разрешения: выберите installWeeklyReport в списке функций вверху и нажмите «Выполнить» —
   Google спросит доступ к почте; таймер включится. Открытия смен — лист «Открытия смен» (строку дня чеклист обновляет с каждой отметкой). */
const OPEN_SHEET = "Открытия смен", REPORT_PROP = "REPORT_EMAIL", REPORT_FN = "weeklyReport";
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

/* Строка дня в «Открытиях смен» (таблица журнала) обновляется с каждой отметкой: сколько отмечено, что осталось,
   первая и последняя отметка, кто отмечал; «Бар готов» — время и кто. Каждая отметка — ещё и строкой в «Чеклист журнал».
   Первые четыре столбца — как в прошлой версии (день, время «Бар готов», кто, сколько не отмечено). */
const OPEN_HEAD = ["День", "Бар готов", "Кто открыл", "Не отмечено", "Отмечено", "Первая отметка", "Последняя отметка", "Кто отмечал", "По разделам"];
const CK_LET = "АБВГДЕЖЗИК";
const CK_LOG = "Чеклист журнал";
function ckLive(st, who, p, on) {
  journalPin();
  const ss = SpreadsheetApp.getActiveSpreadsheet(), now = new Date(), hm = Utilities.formatDate(now, TZ, "HH:mm");
  const day = String(st.day).split("-").reverse().join("."), tx = clean(p.tx, 160) || String(p.id || "");
  let lg = ss.getSheetByName(CK_LOG);
  if (!lg) { lg = ss.insertSheet(CK_LOG); lg.appendRow(["Время", "День", "Кто", "Раздел", "Пункт", "Действие"]); lg.setFrozenRows(1); }
  lg.appendRow([Utilities.formatDate(now, TZ, "dd.MM.yyyy HH:mm"), "'" + day, who, clean(p.g, 80), tx,
    on ? (p.auto ? "отмечено само (акт ушёл)" : "отметил") : "снял отметку"]);
  let sh = ss.getSheetByName(OPEN_SHEET);
  if (!sh) { sh = ss.insertSheet(OPEN_SHEET); sh.setFrozenRows(1); }
  if (sh.getLastColumn() < OPEN_HEAD.length) sh.getRange(1, 1, 1, OPEN_HEAD.length).setValues([OPEN_HEAD]).setFontWeight("bold");
  /* строка этого дня — среди последних (день свежий) */
  const last = sh.getLastRow(), from = Math.max(2, last - 59);
  let row = 0;
  if (last >= 2) {
    const v = sh.getRange(from, 1, last - from + 1, 1).getDisplayValues();
    for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]).replace(/^'/, "").trim() === day) { row = from + i; break; }
  }
  const old = row ? sh.getRange(row, 1, 1, OPEN_HEAD.length).getDisplayValues()[0] : [];
  const marks = Object.keys(st.s).filter(k => k !== "fin"), fin = st.s.fin, of = Math.max(parseInt(p.of, 10) || st.of || 0, marks.length);
  const whoAll = [];
  marks.forEach(k => { const w = st.s[k].w; if (w && whoAll.indexOf(w) < 0) whoAll.push(w); });
  /* по разделам: «А 2/11 · Б 0/3 · …» — разделы и их размер присылает сайт (st.tot), отметки — из состояния */
  const pg = String(st.tot || "").split(",").filter(Boolean).map((x, i) => {
    const [k, n] = x.split(":");
    return CK_LET.charAt(i) + " " + marks.filter(m => m.charAt(0) === k).length + "/" + n;
  }).join(" · ");
  const vals = ["'" + day, fin ? "'" + Utilities.formatDate(new Date(fin.t), TZ, "HH:mm") : "", fin ? fin.w : "",
    of ? Math.max(0, of - marks.length) : "", of ? marks.length + " из " + of : String(marks.length),
    "'" + (String(old[5] || "").replace(/^'/, "") || hm), "'" + hm, whoAll.join(", "), pg];
  if (!row) { row = Math.max(last, 1) + 1; ensureRows(sh, row); }
  sh.getRange(row, 1, 1, OPEN_HEAD.length).setValues([vals]);
}
/* прошлая неделя по Астане: понедельник — воскресенье, ГГГГ-ММ-ДД */
function reportWeek(now) {
  const t = new Date((now || new Date()).getTime() + 5 * 3600e3), dow = (t.getUTCDay() + 6) % 7;
  const mon = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - dow), iso = x => new Date(x).toISOString().slice(0, 10);
  return { from: iso(mon - 7 * 864e5), to: iso(mon - 864e5) };
}
const reportTo = () => String(PropertiesService.getScriptProperties().getProperty(REPORT_PROP) || "").split(/[,;\s]+/).filter(x => EMAIL_RE.test(x));
const reportOn = () => { try { return ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === REPORT_FN); } catch (e) { return null; } };
const hx = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const r3 = x => Math.round(x * 1000) / 1000, fmtN = x => String(r3(x)).replace(".", ",");

/* странности последней ежедневной ревизии — так же, как на сайте («Расход»), чувствительность ±50% */
function reportOdd() {
  const u = mgrUsage({ kind: "d" }), C = u.cols, out = { odd: [], date: "", prev: "" };
  if (!u.ok || C.length < 2) return out;
  const L = C.length - 1, days = (a, b) => Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 864e5));
  const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  out.date = C[L].iso; out.prev = C[L - 1].iso;
  u.items.forEach(x => {
    const ps = [];
    for (let i = 1; i < C.length; i++) {
      if (x.v[i] == null) continue;
      let j = i - 1;
      while (j >= 0 && (x.v[j] == null || (C[j].z && C[i].z && C[j].z !== C[i].z))) j--;   // только дни с теми же зонами
      if (j < 0) continue;
      const from = C[j].iso, to = C[i].iso, sum = a => a.filter(y => y.iso > from && y.iso <= to).reduce((s, y) => s + y.q, 0);
      const byT = C[j].t && C[i].t, woq = x.wo.filter(y => byT && y.t ? y.t > C[j].t && y.t <= C[i].t : y.iso > from && y.iso <= to).reduce((s, y) => s + y.q, 0);
      const use = x.v[j] + sum(x.inc) - x.v[i];
      ps.push({ i: i, to: to, d: days(from, to), use: use, net: use - woq });
    }
    const last = ps[ps.length - 1];
    if (!last || last.i !== L) return;
    let base = ps.slice(0, -1);
    const wd = new Date(last.to).getUTCDay(), same = base.filter(p => new Date(p.to).getUTCDay() === wd);
    if (same.length >= 3) base = same;
    base = base.slice(-8);
    const unit = /^(шт)$/.test(String(x.u).trim()) || !String(x.u).trim() ? "шт" : String(x.u).trim() === "литр" ? "л" : String(x.u).trim();
    const tol = unit === "шт" ? 1 : 0.1, exp = base.length >= 2 ? Math.max(0, med(base.map(p => p.net / p.d)) * last.d) : null;
    let f = "";
    if (last.use < -tol) f = "остаток вырос на " + fmtN(-last.use) + " " + unit + (x.key ? " без прихода" : "");
    else if (exp != null && last.net > exp * 1.5 && last.net - exp > tol) f = "расход " + fmtN(last.use) + " " + unit + " — выше обычного" + (exp > 0 ? " на " + Math.round((last.net / exp - 1) * 100) + "%" : "");
    else if (exp != null && exp > tol && last.net < exp * 0.5 && exp - last.net > tol) f = "расход " + fmtN(last.use) + " " + unit + " — ниже обычного (~" + fmtN(exp) + ")";
    if (f) out.odd.push({ n: x.n, f: f });
  });
  return out;
}
function reportData(from, to) {
  const d = { from: from, to: to }, inR = iso => iso && iso >= from && iso <= to;
  /* списания и проработки */
  const wo = mgrWo({ from: from, to: to }), acts = {}, why = {}, items = {}, who = {};
  ["wo", "pr"].forEach(k => (wo[k] || []).forEach(r => {
    const a = k + r[8];
    acts[a] = acts[a] || { k: k, who: r[6] };
    why[r[5] || "без причины"] = (why[r[5] || "без причины"] || 0) + 1;
    /* как в «Сводке» на сайте: одно название (без ё и регистра), единицы — к л / кг */
    const U = { "л": ["л", 1], "мл": ["л", .001], "кг": ["кг", 1], "гр": ["кг", .001], "г": ["кг", .001], "шт": ["шт", 1] }, f = U[String(r[3]).trim().toLowerCase()] || [String(r[3]).trim(), 1];
    const ik = nameKey(r[2]) + "|" + f[0];
    (items[ik] = items[ik] || { n: String(r[2]).trim(), u: f[0], q: 0, c: 0 }).q += num(r[4]) * f[1]; items[ik].c++;
    (who[r[6] || "—"] = who[r[6] || "—"] || new Set()).add(a);
  }));
  d.wo = { acts: Object.values(acts), rows: (wo.wo || []).length + (wo.pr || []).length,
    why: Object.keys(why).map(k => [k, why[k]]).sort((a, b) => b[1] - a[1]),
    items: Object.values(items).sort((a, b) => b.c - a.c || b.q - a.q).slice(0, 10),
    who: Object.keys(who).map(k => [k, who[k].size]).sort((a, b) => b[1] - a[1]) };
  /* ревизии */
  d.revs = [];
  try {
    const ts = revTotal(revBook()), lc = ts.getLastColumn();
    if (lc >= 2) { const h = ts.getRange(1, 2, 2, lc - 1).getDisplayValues(); h[0].forEach((x, i) => { if (inR(dmy(x))) d.revs.push({ date: x, who: h[1][i] }); }); }
  } catch (e) {}
  try {                                                                // месячные — по дате начала
    const ms = mrevSheet(true), b = mrevBlock();
    if (ms && ms.getLastColumn() >= 4) {
      const lc = ms.getLastColumn(), h = ms.getRange(3, 1, 4, lc).getDisplayValues();
      for (let c = 3; c < lc; c++) {
        if (String(h[2][c]).trim() !== "Итог" || !inR(dmy(h[3][c]))) continue;
        const id = String(h[1][c]).trim(), st = b && b.total === id && b.open ? (b.done ? "все зоны посчитаны" : "идёт") : "закрыта";
        d.revs.push({ date: h[3][c], who: "месячная «" + String(h[0][c]).trim() + "» — " + st });
      }
    }
  } catch (e) {}
  try { d.odd = reportOdd(); } catch (e) { d.odd = { odd: [], date: "", prev: "", err: String(e && e.message || e) }; }
  try { const pp = mgrPeriod({}); d.per = pp.ok && pp.to ? pp : null; } catch (e) { d.per = null; }
  try { d.orders = orderList(from, to).map(o => [o.at, o.kind, o.who, o.items.length]); } catch (e) { d.orders = []; }
  /* приход */
  const inl = mgrInList({ from: from, to: to }), sup = {}, inv = {};
  inl.rows.forEach(r => { const s = r[2] || "поставщик не указан"; sup[s] = (sup[s] || 0) + (typeof r[8] === "number" ? r[8] : 0); inv[r[0] + "|" + r[1] + "|" + r[2]] = s; });
  d.inc = { n: Object.keys(inv).length, sup: Object.keys(sup).map(k => [k, sup[k], Object.values(inv).filter(x => x === k).length]).sort((a, b) => b[1] - a[1]) };
  /* ниже нормы */
  try {
    const o = mgrOrder();
    d.low = (o.rows || []).filter(r => r.q != null && r.norm - r.q - (r.inq || 0) > 1e-9)
      .map(r => ({ n: r.n, sup: r.sup || "без поставщика", need: r3(r.norm - r.q - (r.inq || 0)), u: r.u })).slice(0, 40);
    d.nonorm = o.nonorm || 0;
  } catch (e) { d.low = []; d.nonorm = 0; d.lowErr = String(e && e.message || e); }
  /* открытия смен и входы */
  /* открытия смен: [день, «Бар готов», кто, отмечено] — дни, когда чеклист начинали */
  d.open = [];
  const os = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(OPEN_SHEET);
  if (os && os.getLastRow() >= 2) os.getRange(2, 1, os.getLastRow() - 1, 5).getDisplayValues().forEach(r => {
    if (!inR(dmy(r[0]))) return;
    const t = String(r[1]).replace(/^'/, ""), left = String(r[3]).trim();
    d.open.push([String(r[0]).replace(/^'/, ""), t || "не отмечен", r[2], String(r[4]).trim() || (left !== "" ? "не отмечено " + left : "")]);
  });
  d.logins = {};
  try {
    const js = sheet(), last = js.getLastRow();
    if (last >= 1) js.getRange(1, 1, Math.min(last, 1500), 2).getValues().forEach(r => {
      if (!(r[0] instanceof Date)) return;
      const iso = Utilities.formatDate(r[0], TZ, "yyyy-MM-dd");
      if (inR(iso)) d.logins[r[1]] = (d.logins[r[1]] || 0) + 1;
    });
  } catch (e) {}
  return d;
}
/* письмо: простые таблицы со встроенными стилями — так его покажет любая почта */
function reportHtml(d) {
  const ru = iso => String(iso).split("-").reverse().join("."), H = "font:600 15px Arial,sans-serif;margin:22px 0 8px;color:#222";
  const tb = (head, rows) => rows.length ? '<table style="border-collapse:collapse;width:100%;max-width:640px;font:14px Arial,sans-serif">' +
    '<tr>' + head.map((x, i) => '<th style="text-align:' + (i ? "right" : "left") + ';padding:6px 8px;border-bottom:2px solid #ddd;color:#666;font-size:12px">' + hx(x) + '</th>').join("") + '</tr>' +
    rows.map(r => '<tr>' + r.map((x, i) => '<td style="text-align:' + (i ? "right" : "left") + ';padding:6px 8px;border-bottom:1px solid #eee">' + hx(x) + '</td>').join("") + '</tr>').join("") + '</table>' : '<p style="color:#888;font:14px Arial,sans-serif;margin:0">Нет.</p>';
  const nwo = d.wo.acts.filter(a => a.k === "wo").length, npr = d.wo.acts.filter(a => a.k === "pr").length;
  let h = '<div style="font:14px Arial,sans-serif;color:#222">' +
    '<h2 style="font:700 19px Arial,sans-serif;margin:0 0 4px">Бар «Мечты» — неделя ' + hx(ru(d.from)) + ' — ' + hx(ru(d.to)) + '</h2>' +
    '<p style="margin:0;color:#666">Списаний ' + nwo + ', проработок ' + npr + ' · ревизий ' + d.revs.length + ' · накладных ' + d.inc.n + ' · заявок ' + (d.orders || []).length + ' · открытий смен ' + d.open.filter(r => /^\d/.test(r[1])).length + '</p>';
  if (d.per) {
    const P = d.per, lab = x => x.wd + " " + x.d.slice(0, 5);
    h += '<h3 style="' + H + '">Последняя ревизия против продаж (' + hx(lab(P.from) + " → " + lab(P.to)) + ')</h3>' +
      '<p style="margin:0 0 6px">Недостача <b style="color:#c0392b">' + fmtN(Math.round(P.short)) + ' ₽</b> · излишек <b>' + fmtN(Math.round(P.over)) + ' ₽</b>' +
        (P.sales.miss.length ? ' · <span style="color:#a0522d">нет продаж за ' + P.sales.miss.length + ' дн.</span>' : "") + '</p>' +
      tb(["Позиция", "Расхождение", "₽"], P.rows.filter(r => !r.info && !r.miss && Math.abs(r.diff) > 1e-9).slice(0, 15)
        .map(r => [r.n, (r.diff > 0 ? "+" : "") + fmtN(r.diff) + " " + r.u, r.money ? fmtN(r.money) : ""]));
  } else h += '<h3 style="' + H + '">Странности последней ревизии' + (d.odd.date ? " (" + hx(ru(d.odd.date)) + " против " + hx(ru(d.odd.prev)) + ")" : "") + '</h3>' +
    (d.odd.err ? '<p style="color:#c0392b;font:14px Arial,sans-serif;margin:0">Не удалось посчитать (таблица занята или ошибка) — смотрите вкладку «Расход» на сайте.</p>' : tb(["Позиция", "Что не так"], d.odd.odd.map(x => [x.n, x.f])));
  h += '<h3 style="' + H + '">Списания и проработки — по причинам</h3>' + tb(["Причина", "Строк"], d.wo.why) +
    '<h3 style="' + H + '">Чаще всего списывали</h3>' + tb(["Позиция", "Всего", "Раз"], d.wo.items.map(x => [x.n, x.u === "л" && x.q > 0 && x.q < 1 ? fmtN(x.q * 1000) + " мл" : x.u === "кг" && x.q > 0 && x.q < 1 ? fmtN(x.q * 1000) + " гр" : fmtN(x.q) + (x.u ? " " + x.u : ""), x.c])) +
    '<h3 style="' + H + '">Акты по барменам</h3>' + tb(["Кто", "Актов"], d.wo.who);
  h += '<h3 style="' + H + '">Приход</h3>' + tb(["Поставщик", "Сумма, ₽", "Накладных"], d.inc.sup.map(x => [x[0], x[1] ? fmtN(Math.round(x[1])) : "", x[2]]));
  h += '<h3 style="' + H + '">Ниже нормы сейчас</h3>' + (d.lowErr ? '<p style="color:#c0392b;font:14px Arial,sans-serif;margin:0">Не удалось посчитать (таблица занята или ошибка) — смотрите вкладку «Автозаявка» на сайте.</p>' : tb(["Позиция", "Не хватает", "Поставщик"], d.low.map(x => [x.n, fmtN(x.need) + (x.u ? " " + x.u : ""), x.sup]))) +
    (d.nonorm ? '<p style="color:#888;margin:6px 0 0">Без нормы в справочнике: ' + d.nonorm + ' позиций.</p>' : "");
  h += '<h3 style="' + H + '">Заявки бартендеров</h3>' + tb(["Отправлено", "Заявка", "Кто", "Позиций"], d.orders || []);
  h += '<h3 style="' + H + '">Ревизии</h3>' + tb(["Дата", "Кто"], d.revs.map(x => [x.date, x.who])) +
    '<h3 style="' + H + '">Открытия смен (чеклист)</h3>' + tb(["День", "Бар готов", "Кто", "Отмечено"], d.open) +
    '<h3 style="' + H + '">Входы в «Бартендерам»</h3>' + tb(["Кто", "Входов"], Object.keys(d.logins).map(k => [k, d.logins[k]]).sort((a, b) => b[1] - a[1]));
  return h + '<p style="color:#aaa;font-size:12px;margin:24px 0 0">Подробнее — на сайте: «Бартендерам» → «Менеджер».</p></div>';
}
function reportSend(from, to) {
  const d = reportData(from, to), list = reportTo();
  const rcpt = list.length ? list.join(",") : Session.getEffectiveUser().getEmail();
  if (!rcpt) return { error: "noto" };
  MailApp.sendEmail({ to: rcpt, subject: "Бар «Мечты» — отчёт за " + from.split("-").reverse().join(".") + " — " + to.split("-").reverse().join("."),
    htmlBody: reportHtml(d), name: "Бар «Мечты»" });
  return { ok: true, to: rcpt };
}
/* по таймеру — каждый понедельник */
function weeklyReport() {
  MEMO = {};
  const w = reportWeek();
  reportSend(w.from, w.to);
}
/* один раз из редактора: разрешения (почта, таймеры) и таймер на понедельник 9:00 по Астане */
function installWeeklyReport() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === REPORT_FN).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(REPORT_FN).timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone("Asia/Almaty").create();
  revMailInstall();
  Logger.log("Отчёт включён: каждый понедельник в 9:00 и после каждой ревизии. Получатели: " + (reportTo().join(", ") || Session.getEffectiveUser().getEmail()) +
    ". Писем сегодня ещё можно отправить: " + MailApp.getRemainingDailyQuota());
}

/* ── Письмо после каждой ревизии ──
   Таймер раз в 15 минут (installWeeklyReport или «Отчёт» на сайте). Ревизия готова (все зоны сданы и все нажали «Завершить»,
   или наступило 9:00) — письмо с итогом её периода: ревизия против продаж, приход, списания, проработки. Если продажи R-Keeper
   за смены периода ещё не загружены — письмо уходит сразу, с пометкой, а когда их загрузят — второе, уже с продажами.
   Ревизия старше 3 дней (таймер только включили) — не шлём. Обычно таймер ничего не читает, кроме шапки «Итога». */
const REV_MAIL_FN = "revMailTick", REV_MAIL = "REV_MAIL";
function revMailTick() {
  MEMO = {};
  const P = PropertiesService.getScriptProperties();
  let st = {};
  try { st = JSON.parse(P.getProperty(REV_MAIL) || "{}") || {}; } catch (e) { st = {}; }
  const ts = revTotal(revBook()), sig = ts.getLastColumn() + "|" + revOpenCol(), wait = st.s === "r";
  if (sig === st.sig && !wait) return;
  let sold = false;
  if (wait) {                                                           // ждём продажи: второе письмо — когда загружены все дни
    const sh = salesSheet(false), last = sh ? sh.getLastRow() : 0;
    const have = new Set(last >= 2 ? sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(r => dmy(r[0])) : []);
    sold = (st.want || []).every(d => have.has(d));
  }
  if (sig === st.sig && !sold) return;
  st.sig = sig;
  const R = revTimeline().revs, B = R[R.length - 1];
  if (!B || R.length < 2 || (B.d === st.d && !sold)) { P.setProperty(REV_MAIL, JSON.stringify(st)); return; }
  const per = mgrPeriod({});
  if (!per.ok || !per.to) return;
  const full = !per.sales.miss.length, fresh = Date.now() - B.at < 3 * 864e5;
  if (fresh) revMailSend(per);
  P.setProperty(REV_MAIL, JSON.stringify({ sig: sig, d: B.d, s: full ? "s" : "r", want: per.sales.want }));
}
function revMailSend(per) {
  const list = reportTo(), rcpt = list.length ? list.join(",") : Session.getEffectiveUser().getEmail();
  if (!rcpt) return { error: "noto" };
  const lab = x => x.wd + " " + x.d.slice(0, 5), miss = per.sales.miss;
  MailApp.sendEmail({ to: rcpt, subject: "Бар «Мечты» — ревизия " + lab(per.to) + ": недостача " + fmtN(Math.round(per.short)) + " ₽" +
    (miss.length ? " (без продаж за " + miss.map(d => WD_RU[isoWd(d)]).join(", ") + ")" : ""), htmlBody: periodHtml(per), name: "Бар «Мечты»" });
  return { ok: true, to: rcpt };
}
/* итог периода для письма: все позиции, самые дорогие расхождения — первыми */
function periodHtml(per) {
  const lab = x => x.wd + " " + x.d.slice(0, 5), S = per.sales, ru = iso => WD_RU[isoWd(iso)] + " " + iso.slice(8, 10) + "." + iso.slice(5, 7);
  const td = (x, l, st) => '<td style="text-align:' + (l ? "left" : "right") + ';padding:5px 6px;border-bottom:1px solid #eee;' + (st || "") + '">' + hx(x) + '</td>';
  const th = (x, l) => '<th style="text-align:' + (l ? "left" : "right") + ';padding:5px 6px;border-bottom:2px solid #ddd;color:#666;font-size:11px">' + hx(x) + '</th>';
  const n = x => x ? fmtN(x) : "", nd = S.nodish.filter(x => x.rel);
  const warn = [
    !S.want.length ? "В этом периоде смен не было — продаж не ждём: любое расхождение — потери или ошибка пересчёта." :
      S.miss.length ? "Нет продаж R-Keeper за " + S.miss.map(ru).join(", ") + " — загрузите их на сайте («Менеджер» → «Продажи»), придёт письмо с продажами." : "",
    nd.length ? "Блюда без расхода на блюдо (" + nd.length + "): " + nd.slice(0, 10).map(x => x.name).join(", ") + (nd.length > 10 ? "…" : "") + " — их ингредиенты выглядят недостачей." : "",
    per.man ? "Часть цифр внесена вручную (" + per.man + ") — на сайте они отмечены «вручную»." : "",
    (per.zagno || []).length ? "Заготовки без рецепта: " + per.zagno.join(", ") + "." : "",
    (per.nokey || []).length ? "Нет в справочнике: " + per.nokey.join(", ") + "." : "",
    per.noprice ? "Без цены закупки (не в сумме ₽): " + per.noprice + " поз." : ""].filter(Boolean);
  const rows = per.rows.filter(r => !r.info && !r.miss);
  let h = '<div style="font:14px Arial,sans-serif;color:#222">' +
    '<h2 style="font:700 19px Arial,sans-serif;margin:0 0 4px">Бар «Мечты» — ревизия ' + hx(lab(per.to)) + '</h2>' +
    '<p style="margin:0;color:#666">Период ' + hx(lab(per.from) + " → " + lab(per.to)) + (per.to.who ? " · считали: " + hx(per.to.who) : "") + '</p>' +
    '<p style="margin:10px 0 0;font-size:16px">Недостача <b style="color:#c0392b">' + fmtN(Math.round(per.short)) + ' ₽</b> · излишек <b>' + fmtN(Math.round(per.over)) + ' ₽</b></p>' +
    warn.map(w => '<p style="margin:8px 0 0;color:#a0522d">' + hx(w) + '</p>').join("") +
    '<p style="margin:14px 0 6px;color:#666;font-size:12px">Ожидалось = было + приход − продано − списано − проработки; расхождение = стало − ожидалось (минус — недостача).</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:760px;font:13px Arial,sans-serif"><tr>' +
    [["Позиция", 1], ["Было"], ["Приход"], ["Продано"], ["Списано"], ["Прораб."], ["Ожидалось"], ["Стало"], ["Расхожд."], ["₽"]].map(x => th(x[0], x[1])).join("") + '</tr>' +
    rows.map(r => '<tr>' + td(r.n + " (" + (r.u === "л" ? "л" : r.u) + ")", 1) + td(n(r.was)) + td(n(r.inc)) + td(n(r.sold)) + td(n(r.wo)) + td(n(r.pr)) + td(n(r.exp)) + td(n(r.now)) +
      td(Math.abs(r.diff) < 1e-9 ? "0" : (r.diff > 0 ? "+" : "") + fmtN(r.diff), 0, r.diff < -1e-9 ? "color:#c0392b;font-weight:700" : r.diff > 1e-9 ? "color:#b9770e;font-weight:700" : "color:#999") +
      td(r.money ? fmtN(r.money) : "", 0, r.money < 0 ? "color:#c0392b" : "") + '</tr>').join("") + '</table>';
  const miss = per.rows.filter(r => r.miss);
  if (miss.length) h += '<p style="margin:12px 0 0;color:#888">Не посчитаны в одной из ревизий: ' + hx(miss.map(r => r.n).join(", ")) + '.</p>';
  return h + '<p style="color:#aaa;font-size:12px;margin:24px 0 0">Подробнее — на сайте: «Бартендерам» → «Менеджер» → «Расход».</p></div>';
}
const revMailInstall = () => {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === REV_MAIL_FN).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(REV_MAIL_FN).timeBased().everyMinutes(15).create();
};

/* для сайта */
function mgrReport(p) {
  const w = reportWeek(), from = /^\d{4}-\d{2}-\d{2}$/.test(p.from || "") ? p.from : w.from, to = /^\d{4}-\d{2}-\d{2}$/.test(p.to || "") ? p.to : w.to;
  return { ok: true, from: from, to: to, html: reportHtml(reportData(from, to)), emails: reportTo(), auto: reportOn() };
}
const authErr = e => /authoriz|permission|разрешен|доступ/i.test(String(e && e.message || e));
function mgrReportPost(p) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  if (p.mgr === "reportset") {
    const list = String(p.emails || "").split(/[,;\s]+/).filter(Boolean);
    if (list.some(x => !EMAIL_RE.test(x)) || list.length > 10) return { error: "email" };
    PropertiesService.getScriptProperties().setProperty(REPORT_PROP, list.join(","));
    return { ok: true, emails: list };
  }
  if (p.mgr === "reportsend") {
    const w = reportWeek(), from = /^\d{4}-\d{2}-\d{2}$/.test(p.from || "") ? p.from : w.from, to = /^\d{4}-\d{2}-\d{2}$/.test(p.to || "") ? p.to : w.to;
    try { return reportSend(from, to); } catch (e) { console.error("reportsend: " + e); return { error: authErr(e) ? "auth" : String(e && e.message || e) }; }
  }
  if (p.mgr === "reportauto") {
    try {
      ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === REPORT_FN || t.getHandlerFunction() === REV_MAIL_FN).forEach(t => ScriptApp.deleteTrigger(t));
      if (String(p.on) === "1") { ScriptApp.newTrigger(REPORT_FN).timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).inTimezone("Asia/Almaty").create(); revMailInstall(); }
      return { ok: true, auto: String(p.on) === "1" };
    } catch (e) { console.error("reportauto: " + e); return { error: authErr(e) ? "auth" : String(e && e.message || e) }; }
  }
  return { error: "action" };
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
  MEMO = {};
  const folder = woAlive(DriveApp.getFoldersByName(BACKUP_FOLDER)) || DriveApp.createFolder(BACKUP_FOLDER);   // папка в корзине — новая
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


/* ═════════════ Холодильники ═════════════
   Журнал температуры — как бумажный: у каждого холодильника температура в начале и в конце смены, ФИО и подпись.
   Подпись — отметка входа: кто внёс с сайта и во сколько. Только ручной ввод: пустое остаётся пустым.
   День холодильников — с 14:00 (открытие) до 14:00 по Астане: бармен вносит и поправляет только текущий день, в 14:00
   он закрывается сам; прошедший день исправляет только бар-менеджер — с причиной (frFix). Рабочие дни — чт–сб (FR_WORK):
   пустое в прошедший рабочий день — «пропуск». Каждое внесение и каждая правка — новой строкой листа
   «Холодильники · записи» (видно, что и когда меняли), в журнал идёт последняя. Из записей собирается лист месяца
   «Холодильники 10.2026» — по таблице на холодильник, как бумажный бланк; выход за норму подсвечен.
   Склад — комната, как его бланк: один замер в день (время, температура, влажность, ответственный), день — тот же,
   с 14:00 до 14:00. Журнал на сайте начинается с FR_START (1 ноября 2026): октябрь и раньше —
   в бумажном архиве; до старта внести нельзя, а лист первого месяца готовится сам при первом запросе.
   Список холодильников, названия и нормы — на сайте (js/fridge.js): сайт присылает его с каждым запросом (POST). */
const FR_LOG = "Холодильники · записи";
const FR_HEAD = ["День", "Холодильник", "Название", "Зона", "Смена", "Температура", "Влажность", "ФИО", "Внесено", "Время", "Источник"];
const FR_META = "FR_META", FR_BAD = "#f4cccc", FR_TOP = "#fff2cc", FR_GAP = "#fce5cd", FR_GREY = "#eeeeee";
const FR_WORK = [4, 5, 6];                                           // рабочие дни: чт, пт, сб (день — тот, когда открылись)
const frDayKey = t => Utilities.formatDate(new Date((t || Date.now()) - 14 * 3600000), TZ, "yyyy-MM-dd");   // с 14:00 до 14:00
const FR_START = "2026-11-01";                                      // первый день журнала на сайте (тот же — в js/fridge.js)

function fridges(p) {
  journalPin();
  const act = String(p.fr), ss = SpreadsheetApp.getActiveSpreadsheet();
  frMetaPut(p.meta);
  const sh = frSheet(ss), day = frDayKey();
  /* лист текущего месяца (до старта — первого месяца журнала) готов заранее, пустой, как бланк */
  const m0 = (day < FR_START ? FR_START : day).slice(0, 7);
  if (!ss.getSheetByName(frMonthName(m0)) && frMeta().length) {
    const lock = lockOrBusy(10000);
    try { if (!ss.getSheetByName(frMonthName(m0))) frMonth(ss, m0); } finally { lock.releaseLock(); }
  }
  if (act === "get") {
    const m = /^\d{4}-\d{2}$/.test(String(p.m || "")) ? String(p.m) : day.slice(0, 7), fst = {};
    return { ok: true, day: day, m: m, r: frRead(sh, m, fst), fst: fst, work: FR_WORK, start: FR_START };
  }
  if (act === "fix") return frFix(ss, sh, p, day);
  if (act !== "set") return { error: "action" };

  const id = frId(p.id), k = p.k === "s" || p.k === "e" ? p.k : "";
  const who = clean(p.rn, 60), fio = clean(p.f, 40), f = frMeta().find(x => x.id === id);
  if (!id || !k || !who || !f || (f.room && k === "e")) return { error: "bad" };     // у склада один замер в день
  if (String(p.d || "") !== day) return { error: "closed", day: day };          // день, на который вносили, уже закрыт в 14:00
  if (day < FR_START) return { error: "early", start: FR_START };
  const v = frVal(p);
  if (!v || (!v.wipe && !fio)) return { error: "bad" };

  const lock = lockOrBusy(10000);
  try {
    sh.appendRow(["'" + day, id, f.n, f.z, k === "s" ? "начало" : "конец", v.t, v.h, v.wipe ? "" : fio, who, new Date(), v.wipe ? "сайт · стёрто" : "сайт"]);
    const fst = {}, r = frRead(sh, day.slice(0, 7), fst);
    try { frMonth(ss, day.slice(0, 7), r, fst); } catch (e) { console.error("frMonth: " + (e && e.stack || e)); }   // запись уже есть
    /* чеклист: «Заполнить бланки температуры…» — отмечается сам, когда у всех внесено начало смены (у склада — замер) */
    if (k === "s" && !v.wipe && ckDay() === day) try {
      if (frMeta().every(x => ((r[x.id] || {})[day] || {}).s)) ckAuto(FR_CK, who, "Общие дела", "Заполнить бланки температуры на всех холодильниках и на складе");
    } catch (e) { console.error("frCk: " + e); }
    return { ok: true, day: day, m: day.slice(0, 7), r: r, fst: fst, work: FR_WORK };
  } finally {
    lock.releaseLock();
  }
}
const FR_CK = "d6";
const frId = v => String(v || "").replace(/[^a-z0-9]/g, "").slice(0, 12);
/* температура и влажность из запроса: {t, h, wipe} или null; пустая температура — стереть показание */
function frVal(p) {
  const wipe = String(p.t == null ? "" : p.t).trim() === "";
  const t = frNum(p.t, -40, 40), hs = String(p.h == null ? "" : p.h).trim(), h = hs ? frNum(hs, 0, 100) : null;
  if (!wipe && (t === null || (hs && h === null))) return null;
  return { wipe: wipe, t: wipe ? "" : t, h: wipe || h === null ? "" : h };
}

/* Исправление бар-менеджером (по ключу менеджера): показание за прошедший день или отметка «не работали».
   Причина обязательна; в журнале видно, кто, когда и почему исправил, прежняя запись остаётся строкой выше. */
function frFix(ss, sh, p, day) {
  if (!mgrOk(p.mk)) return { error: "mgr" };
  const id = frId(p.id), f = frMeta().find(x => x.id === id), d = String(p.d || ""), k = ["s", "e", "off"].indexOf(p.k) >= 0 ? p.k : "";
  const who = clean(p.rn, 60), why = clean(p.why, 140), fio = clean(p.f, 40);
  if (!f || !k || (f.room && k === "e") || !who || why.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > day || d < FR_START) return { error: "bad" };
  let row;
  if (k === "off") {
    row = ["'" + d, id, f.n, f.z, "день", "", "", "", who + " · менеджер", new Date(),
      (String(p.on) === "1" ? FR_OFF + ": " : FR_UNOFF + ": ") + why];
  } else {
    const v = frVal(p);
    if (!v || (!v.wipe && !fio)) return { error: "bad" };
    row = ["'" + d, id, f.n, f.z, k === "s" ? "начало" : "конец", v.t, v.h, v.wipe ? "" : fio, who + " · менеджер", new Date(), FR_FIX + ": " + why];
  }
  const lock = lockOrBusy(10000);
  try {
    sh.appendRow(row);
    const fst = {}, r = frRead(sh, d.slice(0, 7), fst);
    try { frMonth(ss, d.slice(0, 7), r, fst); } catch (e) { console.error("frMonth: " + (e && e.stack || e)); }
    return { ok: true, day: day, m: d.slice(0, 7), r: r, fst: fst, work: FR_WORK };
  } finally {
    lock.releaseLock();
  }
}
const FR_FIX = "исправлено менеджером", FR_OFF = "не работали", FR_UNOFF = "снята отметка «не работали»";

/* «4,1» → 4.1; «−10» → −10; вне пределов или не число — null */
function frNum(v, lo, hi) {
  const s = String(v == null ? "" : v).trim().replace(",", ".").replace(/^[−–]/, "-");
  if (!/^-?\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Math.round(Number(s) * 10) / 10;
  return n >= lo && n <= hi ? n : null;
}

/* список с сайта: [[id, название, зона, мин, макс, комната(1), влажн. мин, влажн. макс, где стоит], …] — хранится, если поменялся */
function frMetaPut(a) {
  if (!Array.isArray(a) || !a.length || a.length > 40) return;
  const num = v => typeof v === "number" && isFinite(v) && Math.abs(v) <= 100 ? v : null;
  const list = [];
  for (const x of a) {
    if (!Array.isArray(x)) return;
    const id = String(x[0] || "");
    if (!/^[a-z0-9]{2,12}$/.test(id) || list.some(y => y.id === id)) return;
    list.push({ id: id, n: clean(x[1], 80) || id, z: clean(x[2], 30), lo: num(x[3]), hi: num(x[4]), room: x[5] ? 1 : 0, hlo: num(x[6]), hhi: num(x[7]), w: clean(x[8], 60) });
  }
  const P = PropertiesService.getScriptProperties(), js = JSON.stringify(list);
  if (P.getProperty(FR_META) !== js) P.setProperty(FR_META, js);
}
function frMeta() {
  try { const a = JSON.parse(PropertiesService.getScriptProperties().getProperty(FR_META) || "[]"); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

function frSheet(ss) {
  let sh = ss.getSheetByName(FR_LOG);
  if (!sh) {
    sh = ss.insertSheet(FR_LOG);
    sh.getRange(1, 1, 1, FR_HEAD.length).setValues([FR_HEAD]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

/* записи месяца «2026-10» → {холодильник: {день: {s, e, off}}}; последняя запись побеждает, пустая температура — стёрто.
   fst (если передан) — первый день с записью у каждого холодильника: пропуски считаются с него */
function frRead(sh, m, fst) {
  const last = sh.getLastRow(), out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, FR_HEAD.length).getValues().forEach(r => {
    const day = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, "yyyy-MM-dd") : String(r[0]).replace(/^'/, "").trim();
    const id = String(r[1]), sm = String(r[4]), k = sm === "начало" ? "s" : sm === "конец" ? "e" : sm === "день" ? "off" : "";
    if (!id || !k || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const src = String(r[10] || ""), has = k === "off" ? src.indexOf(FR_OFF) === 0 : !(r[5] === "" || r[5] == null);
    if (fst && has && (!fst[id] || day < fst[id])) fst[id] = day;
    if (day.slice(0, 7) !== m) return;
    const d = (out[id] = out[id] || {})[day] = out[id][day] || {};
    const at = r[9] instanceof Date ? r[9] : null, w = String(r[8] || "").replace(/^'/, "");
    const stamp = x => { if (at) { x.at = Utilities.formatDate(at, TZ, "HH:mm"); x.on = Utilities.formatDate(at, TZ, "dd.MM"); } return x; };
    if (!has) { delete d[k]; if (!d.s && !d.e && !d.off) delete out[id][day]; return; }
    if (k === "off") { d.off = stamp({ why: src.slice(FR_OFF.length).replace(/^:\s*/, ""), w: w }); return; }
    const x = stamp({ t: Number(r[5]), h: r[6] === "" || r[6] == null ? null : Number(r[6]), f: String(r[7] || "").replace(/^'/, ""), w: w });
    if (src.indexOf(FR_FIX) === 0) x.m = src.slice(FR_FIX.length).replace(/^:\s*/, "");
    d[k] = x;
  });
  return out;
}

/* лист месяца — как бумажный бланк: по таблице на холодильник, все дни месяца. Выход за норму — красным;
   пустое в прошедший рабочий день (чт–сб, с первой записи холодильника) — «пропуск»; «не работали» — серым с причиной */
const frNorm = (lo, hi, u) => lo == null && hi == null ? "" : lo != null && hi != null ? frSig(lo) + "…" + frSig(hi) + " " + u
  : (lo != null ? "не ниже " + frSig(lo) : "не выше " + frSig(hi)) + " " + u;
const frSig = n => (n > 0 ? "+" : n < 0 ? "−" : "") + String(Math.abs(n)).replace(".", ",");
const frMonthName = m => "Холодильники " + m.slice(5, 7) + "." + m.slice(0, 4);
const frWork = day => FR_WORK.indexOf(new Date(day + "T12:00:00Z").getUTCDay()) >= 0;
function frMonth(ss, m, data, fst) {
  const sh0 = frSheet(ss);
  if (!data || !fst) { fst = {}; data = frRead(sh0, m, fst); }
  const y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)), days = new Date(Date.UTC(y, mo, 0)).getUTCDate(), today = frDayKey();
  const list = frMeta().slice();
  Object.keys(data).forEach(id => { if (!list.some(f => f.id === id)) list.push({ id: id, n: id, z: "", lo: null, hi: null, room: 0 }); });
  const W = 7, rows = [], bg = [], fw = [], blocks = [];
  const put = (cells, color, bold, cc) => {
    const r = cells.concat(Array(W - cells.length).fill("")); rows.push(r);
    bg.push(r.map((_, i) => cc && cc[i] || color || "#ffffff")); fw.push(r.map(() => bold ? "bold" : "normal"));
  };
  const out = (v, lo, hi) => v != null && ((lo != null && v < lo) || (hi != null && v > hi));
  const sig = x => x.m != null ? x.w + " " + (x.on || "") + " " + (x.at || "") + " — исправлено: " + x.m : x.w + (x.at ? " " + x.at : "");
  list.forEach(f => {
    const norm = [frNorm(f.lo, f.hi, "°C"), f.room ? frNorm(f.hlo, f.hhi, "%") : ""].filter(Boolean).join(", ");
    blocks.push([rows.length + 1, f.room ? 6 : 5]);
    put([f.n + (f.w ? " (" + f.w + ")" : "") + (f.z && f.z !== f.n ? " · " + f.z : "") + " · норма: " + (norm || "не задана")], FR_TOP, true);
    put(f.room ? ["Дата", "Время", "Температура, °C", "Влажность, %", "Ответственное лицо", "Подпись"]
               : ["Дата", "Температура в начале смены", "Температура в конце смены", "ФИО", "Подпись"], null, true);
    for (let d = 1; d <= days; d++) {
      const key = m + "-" + String(d).padStart(2, "0"), e = (data[f.id] || {})[key] || {}, s = e.s, n = e.e;
      const date = "'" + String(d).padStart(2, "0") + "." + m.slice(5, 7);
      if (e.off && !s && !n) {
        const tail = [FR_OFF, e.off.why + " · " + e.off.w + " " + (e.off.on || "")];
        put([date].concat(f.room ? ["", "", ""] : ["", ""], tail), FR_GREY, false);
        continue;
      }
      const gap = key < today && frWork(key) && fst[f.id] && key >= fst[f.id];      // прошедший рабочий день, холодильник уже вели
      const fio = [], sign = [];
      [s, n].forEach(x => { if (!x) return; if (x.f && fio.indexOf(x.f) < 0) fio.push(x.f); const g = sig(x); if (sign.indexOf(g) < 0) sign.push(g); });
      const v = x => x ? x.t : gap ? "пропуск" : "", hv = x => x && x.h != null ? x.h : "";
      const c = (x, bad) => !x && gap ? FR_GAP : bad ? FR_BAD : null;
      if (f.room) put([date, s && s.m == null ? "'" + (s.at || "") : "", v(s), hv(s), fio.join(" / "), sign.join(" · ")], null, false,
        [null, null, c(s, out(s && s.t, f.lo, f.hi)), c(s, out(s && s.h, f.hlo, f.hhi))]);
      else put([date, v(s), v(n), fio.join(" / "), sign.join(" · ")], null, false, [null, c(s, out(s && s.t, f.lo, f.hi)), c(n, out(n && n.t, f.lo, f.hi))]);
    }
    put([""]);
  });
  const name = frMonthName(m);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    [64, 120, 120, 120, 120, 150, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  }
  sh.clear();
  if (!rows.length) return;
  ensureRows(sh, rows.length);
  sh.getRange(1, 1, rows.length, W).setValues(rows).setBackgrounds(bg).setFontWeights(fw);
  blocks.forEach(b => sh.getRange(b[0] + 1, 1, days + 1, b[1]).setBorder(true, true, true, true, true, true));   // рамка, как у бланка
}
