/* Чтение таблицы из файла без сторонних библиотек: .xlsx (zip + XML, распаковывает сам браузер), .csv, «xls»,
   который на деле HTML-таблица, и «xls» в формате XML Spreadsheet 2003 (так выгружают R-Keeper / FastReport).
   Настоящий старый .xls (двоичный) не читается — его достаточно сохранить как .xlsx.
   readTable(file) → {sheets: [{name, rows: [[ячейка, …], …], hidden?}]}; ячейка — строка, число или дата «ГГГГ-ММ-ДД».
   Объединённые по вертикали ячейки (дата / № / поставщик на несколько строк) заполняются вниз: у каждой строки своё значение.
   Ошибки (err.message): xls — двоичный .xls или зашифрованный файл; ods, xlsb — другие форматы; old — браузер не умеет
   распаковывать; xml — файл повреждён; mht — «веб-архив». Текст для человека — xErrText(err). */
async function readTable(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b) return xlsxRead(buf);
  if (buf[0] === 0xd0 && buf[1] === 0xcf) throw new Error("xls");
  const text = xDecode(buf);
  if (/^\s*MIME-Version:/i.test(text)) throw new Error("mht");
  if (/urn:schemas-microsoft-com:office:spreadsheet/.test(text.slice(0, 4000)) && /<(ss:)?Workbook[\s>]/.test(text)) return smlRead(text);
  if (/^\s*</.test(text) && /<(table|td)[\s>]/i.test(text)) return htmlRead(text);
  return {sheets: [{name: file.name, rows: csvRead(text)}]};
}
/* понятное сообщение об ошибке чтения — одно на все загрузки */
function xErrText(err){
  const m = err && err.message;
  return m === "xls" ? "Это старый формат .xls (или файл с паролем) — откройте его в Excel и сохраните как «Книга Excel (.xlsx)» без пароля."
    : m === "ods" ? "Это файл OpenOffice / LibreOffice (.ods) — сохраните его как «Книга Excel (.xlsx)»."
    : m === "xlsb" ? "Это двоичная книга Excel (.xlsb) — сохраните её как «Книга Excel (.xlsx)»."
    : m === "mht" ? "Это веб-архив (.mht) — сохраните файл как «Книга Excel (.xlsx)» или CSV."
    : m === "old" ? "Браузер телефона не умеет распаковывать .xlsx — обновите браузер или сохраните файл как CSV."
    : m === "xml" ? "Файл повреждён — откройте его в Excel и сохраните заново как .xlsx."
    : "Не удалось прочитать файл — сохраните его как .xlsx или CSV.";
}

/* текст: UTF-16 (по метке BOM), UTF-8, а если в нём «битые» символы — Windows-1251 (так сохраняет русский Excel) */
function xDecode(buf){
  try {
    if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf.subarray(2));
    if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf.subarray(2));
  } catch (e) {}
  const u = new TextDecoder("utf-8").decode(buf);
  if (!u.includes("�")) return u.replace(/^﻿/, "");
  try { return new TextDecoder("windows-1251").decode(buf); } catch (e) { return u; }
}

/* CSV: разделитель — тот, что одинаково часто встречается в первых строках (строка-заголовок с запятой не сбивает);
   строка «sep=;» от Excel — тоже. Кавычка открывает поле только в его начале — внутри поля она обычный символ (как в Excel). */
function csvRead(text){
  text = text.replace(/^﻿/, "");
  let sep = "";
  const m = text.match(/^sep=(.)\r?\n/i);
  if (m){ sep = m[1]; text = text.slice(m[0].length); }
  if (!sep) sep = csvSep(text);
  const rows = [];
  let row = [], cell = "", q = false, start = true;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){
      if (ch === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"' && start){ q = true; start = false; }
    else if (ch === sep){ row.push(cell); cell = ""; start = true; }
    else if (ch === "\n" || ch === "\r"){
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; start = true;
    } else { cell += ch; start = false; }
  }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  return rows.map(r => r.map(xCell));
}
function csvCount(line, c){
  let n = 0, q = false;
  for (const ch of line){ if (ch === '"') q = !q; else if (ch === c && !q) n++; }
  return n;
}
function csvSep(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 20);
  let best = ";", score = -1;
  for (const c of [";", "\t", ","]){
    const freq = {};
    lines.forEach(l => { const n = csvCount(l, c); if (n) freq[n] = (freq[n] || 0) + 1; });
    let f = 0, n = 0;
    for (const k in freq) if (freq[k] > f || (freq[k] === f && +k > n)){ f = freq[k]; n = +k; }
    const s = f * 1000 + n;                                   // сколько строк согласны, потом — сколько столбцов
    if (s > score){ score = s; best = c; }
  }
  return best;
}

/* значение ячейки из текста: дата «10.10.2026», «10.10.26», «10.10.2026 14:35», «2026-10-10 14:35» → «2026-10-10»;
   число «1 234,5», «−5», «(5)», «1 200 ₽», «700 руб.» → число; остальное — как есть */
const XCUR = /\s*(₸|тг\.?|тенге|руб\.?|р\.|₽|kzt|rub)$/i;
function xCell(v){
  const s = String(v).replace(/[  ]/g, " ").trim();
  let d = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?:\s*г\.?)?(?:[ T]+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (d) return (d[3].length === 2 ? "20" + d[3] : d[3]) + "-" + d[2].padStart(2, "0") + "-" + d[1].padStart(2, "0");
  d = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (d) return d[1] + "-" + d[2] + "-" + d[3];
  const t = s.replace(XCUR, "").replace(/^\((.+)\)$/, "-$1").replace(/^[−–]\s*/, "-");
  if (/^-?\d[\d\s]*([.,]\d+)?$/.test(t)) return parseFloat(t.replace(/\s/g, "").replace(",", "."));
  return s;
}
const xUnesc = s => s.replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));

/* HTML: настоящая сетка — colspan и rowspan раскладываются по столбцам (значение rowspan повторяется в строках ниже,
   чтобы дата / № / группа были у каждой строки). Таблицы-«рамки» с вложенными таблицами пропускаются. */
function htmlRead(text){
  const doc = new DOMParser().parseFromString(text.replace(/<br\s*\/?>/gi, " "), "text/html");
  const tables = [...doc.querySelectorAll("table")].filter(t => !t.querySelector("table"));
  return {sheets: tables.map((t, i) => ({name: "Таблица " + (i + 1), rows: htmlGrid(t)}))};
}
function htmlGrid(t){
  const out = [], span = [];                                  // span[столбец] = {left — сколько строк ещё, v}
  for (const tr of t.rows){
    const row = [];
    let c = 0;
    const skip = () => { while (span[c] && span[c].left > 0){ row[c] = span[c].v; span[c].left--; c++; } };
    for (const td of tr.cells){
      skip();
      const v = xCell(td.textContent.replace(/\s+/g, " "));
      const cs = Math.max(1, Math.min(50, td.colSpan || 1)), rs = Math.max(1, Math.min(1000, td.rowSpan || 1));
      for (let k = 0; k < cs; k++){
        row[c + k] = k ? "" : v;
        if (rs > 1) span[c + k] = {left: rs - 1, v: k ? "" : v};
      }
      c += cs;
    }
    for (let k = c; k < span.length; k++) if (span[k] && span[k].left > 0){ row[k] = span[k].v; span[k].left--; }
    out.push(Array.from(row, x => x === undefined ? "" : x));
  }
  return out;
}

/* XML Spreadsheet 2003: Worksheet → Table → Row → Cell → Data (ss:Index, ss:MergeAcross, ss:MergeDown) */
const SML = "urn:schemas-microsoft-com:office:spreadsheet";
const smlAt = (el, n) => el.getAttribute("ss:" + n) || el.getAttributeNS(SML, n) || "";
function smlRead(text){
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("xml");
  const sheets = [];
  for (const ws of xTags(doc, "Worksheet")){
    const rows = [], tb = xTags(ws, "Table")[0];
    let ri = 0;
    if (tb) for (const r of xTags(tb, "Row")){
      if (smlAt(r, "Index")) ri = +smlAt(r, "Index") - 1;
      const row = rows[ri] = rows[ri] || [];
      let ci = 0;
      for (const c of xTags(r, "Cell")){
        if (smlAt(c, "Index")) ci = +smlAt(c, "Index") - 1;
        while (row[ci] !== undefined) ci++;                     // занято объединением сверху
        const d = xTags(c, "Data")[0], ty = d ? smlAt(d, "Type") : "", s = d ? d.textContent : "";
        const v = ty === "Number" ? (isFinite(parseFloat(s)) ? parseFloat(s) : "") : ty === "DateTime" ? s.slice(0, 10)
          : ty === "Boolean" ? (s === "1" ? "ИСТИНА" : "ЛОЖЬ") : xCell(s.replace(/\s+/g, " "));
        const across = +smlAt(c, "MergeAcross") || 0, down = +smlAt(c, "MergeDown") || 0;
        for (let k = 0; k <= across; k++) row[ci + k] = k ? "" : v;
        for (let j = 1; j <= down; j++){ const rr = rows[ri + j] = rows[ri + j] || []; for (let k = 0; k <= across; k++) rr[ci + k] = k ? "" : v; }
        ci += across + 1;
      }
      ri++;
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    const vis = xTags(ws, "Visible")[0];
    sheets.push({name: smlAt(ws, "Name") || "Лист", rows: rows.map(r => Array.from(r, x => x === undefined ? "" : x)),
      hidden: !!(vis && /hidden/i.test(vis.textContent))});
  }
  return {sheets};
}

/* ── xlsx ── */
const xTags = (el, name) => el.getElementsByTagNameNS("*", name);       // с префиксом пространства имён и без
function xXml(s){
  const doc = new DOMParser().parseFromString(s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""), "application/xml");
  if (s && doc.getElementsByTagName("parsererror").length) throw new Error("xml");   // не молча обрезать лист
  return doc;
}
/* путь из связи: «/xl/worksheets/sheet1.xml» или «worksheets/sheet1.xml» относительно папки base */
function xPath(base, target){
  if (target.startsWith("/")) return target.slice(1);
  const parts = (base ? base.split("/") : []).concat(target.split("/")), out = [];
  for (const p of parts){ if (p === "..") out.pop(); else if (p && p !== ".") out.push(p); }
  return out.join("/");
}
async function xlsxRead(buf){
  const files = xZip(buf);
  if (files["mimetype"] && files["content.xml"]) throw new Error("ods");
  if (files["xl/workbook.bin"]) throw new Error("xlsb");
  const get = async name => { const f = files[name]; return f ? new TextDecoder("utf-8").decode(await xInflate(buf, f)) : ""; };
  /* книга — по связям пакета (обычно xl/workbook.xml) */
  let wbPath = "xl/workbook.xml";
  const root = await get("_rels/.rels");
  if (root) for (const r of xTags(xXml(root), "Relationship")) if (/officeDocument$/.test(r.getAttribute("Type") || "")) wbPath = xPath("", r.getAttribute("Target") || "");
  if (!files[wbPath]) wbPath = "xl/workbook.xml";
  const wbDir = wbPath.replace(/[^/]*$/, "").replace(/\/$/, "");
  const rels = xXml(await get(xPath(wbDir, "_rels/" + wbPath.split("/").pop() + ".rels"))), target = {}, type = {};
  [...xTags(rels, "Relationship")].forEach(r => { target[r.getAttribute("Id")] = r.getAttribute("Target"); type[r.getAttribute("Id")] = r.getAttribute("Type") || ""; });
  const relOf = suffix => { const id = Object.keys(type).find(k => type[k].endsWith(suffix)); return id ? xPath(wbDir, target[id]) : ""; };
  /* общие строки: только текст ячейки, без фонетических подсказок (rPh) */
  const strings = [...xTags(xXml(await get(relOf("/sharedStrings") || "xl/sharedStrings.xml")), "si")]
    .map(si => xUnesc([...xTags(si, "t")].filter(t => !t.parentNode || t.parentNode.localName !== "rPh").map(t => t.textContent).join("")));
  /* какие стили — даты */
  const st = xXml(await get(relOf("/styles") || "xl/styles.xml")), fmts = {};
  [...xTags(st, "numFmt")].forEach(f => { fmts[f.getAttribute("numFmtId")] = f.getAttribute("formatCode") || ""; });
  const xfs = xTags(st, "cellXfs")[0];
  const dateStyle = xfs ? [...xTags(xfs, "xf")].map(x => {
    const id = +x.getAttribute("numFmtId");
    return (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (fmts[id] && /[dy]/i.test(fmts[id].replace(/"[^"]*"|\[[^\]]*\]/g, "")));
  }) : [];
  /* листы по порядку книги; система дат 1904 (старый Excel для Mac) */
  const wb = xXml(await get(wbPath));
  const pr = xTags(wb, "workbookPr")[0], d1904 = pr && /^(1|true)$/i.test(pr.getAttribute("date1904") || "");
  const base = d1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const sheets = [];
  for (const s of xTags(wb, "sheet")){
    const rid = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const path = target[rid] ? xPath(wbDir, target[rid]) : "";
    if (!files[path]) continue;
    const doc = xXml(await get(path)), rows = [];
    for (const r of xTags(doc, "row")){
      const ra = r.getAttribute("r"), ri = ra ? +ra - 1 : rows.length, row = rows[ri] = [];
      let ci = 0;
      for (const c of xTags(r, "c")){
        const ref = c.getAttribute("r");
        if (ref) ci = xCol(ref);
        const t = c.getAttribute("t"), v = xTags(c, "v")[0], sv = v ? v.textContent : "";
        let val = "";
        if (t === "s") val = strings[+sv] || "";
        else if (t === "inlineStr") val = xUnesc([...xTags(c, "t")].map(x => x.textContent).join(""));
        else if (t === "str" || t === "e") val = xUnesc(sv);
        else if (t === "b") val = sv === "1" ? "ИСТИНА" : "ЛОЖЬ";
        else if (t === "d") val = /^\d{4}-\d{2}-\d{2}/.test(sv) ? sv.slice(0, 10) : sv;   // дата ISO прямо в ячейке
        else if (sv !== ""){
          const n = parseFloat(sv);
          val = dateStyle[+c.getAttribute("s") || 0] && n >= 1 && n < 100000                   // n < 1 — только время, оставляем числом
            ? new Date(base + Math.round(n * 864e5)).toISOString().slice(0, 10) : n;
        }
        row[ci++] = typeof val === "string" ? xCell(val) : val;
      }
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    /* объединённые ячейки: значение верхней левой — вниз по её столбцу (дата / № / поставщик у каждой строки накладной) */
    for (const m of xTags(doc, "mergeCell")){
      const p = String(m.getAttribute("ref") || "").split(":");
      if (p.length !== 2) continue;
      const c0 = xCol(p[0]), r0 = +p[0].replace(/^[A-Z]+/i, "") - 1, r1 = +p[1].replace(/^[A-Z]+/i, "") - 1;
      if (!(r1 > r0) || !rows[r0] || r1 - r0 > 5000) continue;
      const v = rows[r0][c0];
      if (v === undefined || v === "") continue;
      for (let i = r0 + 1; i <= r1; i++){ rows[i] = rows[i] || []; if (rows[i][c0] === undefined || rows[i][c0] === "") rows[i][c0] = v; }
    }
    sheets.push({name: s.getAttribute("name") || "Лист", rows: rows.map(r => Array.from(r || [], x => x === undefined ? "" : x)),
      hidden: /hidden/i.test(s.getAttribute("state") || "")});
  }
  return {sheets};
}
const xCol = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, "").toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

/* оглавление zip: имя → {method, size, off} */
function xZip(buf){
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), files = {};
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("zip");
  let p = dv.getUint32(e + 16, true);
  const n = dv.getUint16(e + 10, true), dec = new TextDecoder("utf-8");
  for (let i = 0; i < n && dv.getUint32(p, true) === 0x02014b50; i++){
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    files[dec.decode(buf.subarray(p + 46, p + 46 + nl)).replace(/\\/g, "/").replace(/^\//, "")] = {method, size, off};
    p += 46 + nl + xl + cl;
  }
  return files;
}
async function xInflate(buf, f){
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = buf.subarray(start, start + f.size);
  if (f.method === 0) return data;
  let ds;
  try { ds = new DecompressionStream("deflate-raw"); } catch (e) { throw new Error("old"); }
  const out = new Response(new Blob([data]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
