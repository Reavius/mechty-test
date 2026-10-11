/* Чтение таблицы из файла без сторонних библиотек: .xlsx (zip + XML, распаковывает сам браузер), .csv и «xls»,
   который на деле HTML-таблица. Настоящий старый .xls (двоичный) не читается — его достаточно сохранить как .xlsx.
   readTable(file) → {sheets: [{name, rows: [[ячейка, …], …]}]}; ячейка — строка, число или дата «ГГГГ-ММ-ДД». */
async function readTable(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b) return xlsxRead(buf);
  if (buf[0] === 0xd0 && buf[1] === 0xcf) throw new Error("xls");
  const text = xDecode(buf);
  if (/^\s*</.test(text) && /<table/i.test(text)) return htmlRead(text);
  return {sheets: [{name: file.name, rows: csvRead(text)}]};
}

/* текст: UTF-8, а если в нём «битые» символы — Windows-1251 (так сохраняет русский Excel) */
function xDecode(buf){
  const u = new TextDecoder("utf-8").decode(buf);
  if (!u.includes("�")) return u.replace(/^﻿/, "");
  try { return new TextDecoder("windows-1251").decode(buf); } catch (e) { return u; }
}

function csvRead(text){
  const first = text.split(/\r?\n/, 1)[0] || "";
  const sep = [";", "\t", ","].map(c => [c, first.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){
      if (ch === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep){ row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r"){
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  return rows.map(r => r.map(xCell));
}
/* число «1 234,5» → 1234.5, дата «10.10.2026» → «2026-10-10», остальное — как есть */
function xCell(v){
  const s = String(v).trim();
  const d = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(\s|$)/);
  if (d) return d[3] + "-" + d[2].padStart(2, "0") + "-" + d[1].padStart(2, "0");
  if (/^-?\d[\d\s ]*([.,]\d+)?$/.test(s)) return parseFloat(s.replace(/[\s ]/g, "").replace(",", "."));
  return s;
}

function htmlRead(text){
  const doc = new DOMParser().parseFromString(text, "text/html");
  return {sheets: [...doc.querySelectorAll("table")].map((t, i) => ({name: "Таблица " + (i + 1),
    rows: [...t.rows].map(r => [...r.cells].map(c => xCell(c.textContent.replace(/\s+/g, " "))))}))};
}

/* ── xlsx ── */
const xTags = (el, name) => el.getElementsByTagNameNS("*", name);       // с префиксом пространства имён и без
async function xlsxRead(buf){
  const files = xZip(buf);
  const get = async name => { const f = files[name]; return f ? new TextDecoder("utf-8").decode(await xInflate(buf, f)) : ""; };
  const xml = s => new DOMParser().parseFromString(s, "application/xml");
  const strings = [...xTags(xml(await get("xl/sharedStrings.xml")), "si")]
    .map(si => [...xTags(si, "t")].map(t => t.textContent).join(""));
  /* какие стили — даты */
  const st = xml(await get("xl/styles.xml")), fmts = {};
  [...xTags(st, "numFmt")].forEach(f => { fmts[f.getAttribute("numFmtId")] = f.getAttribute("formatCode") || ""; });
  const xfs = xTags(st, "cellXfs")[0];
  const dateStyle = xfs ? [...xTags(xfs, "xf")].map(x => {
    const id = +x.getAttribute("numFmtId");
    return (id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (fmts[id] && /[dy]/i.test(fmts[id].replace(/"[^"]*"|\[[^\]]*\]/g, "")));
  }) : [];
  /* листы по порядку книги */
  const wb = xml(await get("xl/workbook.xml")), rels = xml(await get("xl/_rels/workbook.xml.rels")), target = {};
  [...xTags(rels, "Relationship")].forEach(r => { target[r.getAttribute("Id")] = r.getAttribute("Target"); });
  const sheets = [];
  for (const s of xTags(wb, "sheet")){
    const rid = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    let path = target[rid] || "";
    path = path.startsWith("/") ? path.slice(1) : "xl/" + path.replace(/^\.?\//, "");
    if (!files[path]) continue;
    const doc = xml(await get(path)), rows = [];
    for (const r of xTags(doc, "row")){
      const ra = r.getAttribute("r"), ri = ra ? +ra - 1 : rows.length, row = rows[ri] = [];
      let ci = 0;
      for (const c of xTags(r, "c")){
        const ref = c.getAttribute("r");
        if (ref) ci = xCol(ref);
        const t = c.getAttribute("t"), v = xTags(c, "v")[0], sv = v ? v.textContent : "";
        let val = "";
        if (t === "s") val = strings[+sv] || "";
        else if (t === "inlineStr") val = [...xTags(c, "t")].map(x => x.textContent).join("");
        else if (t === "str" || t === "e") val = sv;
        else if (t === "b") val = sv === "1" ? "ИСТИНА" : "ЛОЖЬ";
        else if (sv !== ""){
          const n = parseFloat(sv);
          val = dateStyle[+c.getAttribute("s") || 0] && n > 0 && n < 100000
            ? new Date(Date.UTC(1899, 11, 30) + Math.round(n * 864e5)).toISOString().slice(0, 10) : n;
        }
        row[ci++] = typeof val === "string" ? xCell(val) : val;
      }
    }
    for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
    sheets.push({name: s.getAttribute("name") || "Лист", rows: rows.map(r => Array.from(r, x => x === undefined ? "" : x))});
  }
  return {sheets};
}
const xCol = ref => { let n = 0; for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

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
    files[dec.decode(buf.subarray(p + 46, p + 46 + nl))] = {method, size, off};
    p += 46 + nl + xl + cl;
  }
  return files;
}
async function xInflate(buf, f){
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = buf.subarray(start, start + f.size);
  if (f.method === 0) return data;
  if (typeof DecompressionStream !== "function") throw new Error("old");
  const out = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
  return new Uint8Array(await out.arrayBuffer());
}
