/* Списания: акт о списании по бланку ООО «Заря» → PDF на телефоне + копия на Google Диске. */
/* ════════════ Списания ════════════
   Бланк: организация, подразделение, «УТВЕРЖДАЮ», «АКТ о списании от …», №, строки «наименование / ед. изм. /
   кол-во / причина», сумма, фраза об ответственности, подписи комиссии. Файл собирается здесь же, на устройстве
   (работает и без связи): страница A4 рисуется на canvas и упаковывается в PDF. Копия уходит в Apps Script (POST):
   файл — в папку «Бар Мечты — Списания» на Диске, позиции — в лист «Списания». Не ушло — повторим позже. */
const WO_ORG = "ООО «Заря»", WO_DEP = "Бар";
const WO_UNITS = ["л", "мл", "гр", "кг", "шт"];
const WD = "mechty-wo-draft", WQ = "mechty-wo-q", WI = "mechty-wo-ini";
let woReady = false, woLast = null, woSigned = false, woBusy = false;

const wjson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const wsave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const wtoday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);   // дата по Астане (UTC+5)
const wdmy = iso => iso.split("-").reverse().join(".");
const WMON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const wlong = iso => { const [y, m, d] = iso.split("-"); return "«" + d + "» " + WMON[+m - 1] + " " + y + " г."; };

/* ── форма ── */
function woRow(r){
  r = r || {};
  return '<li class="worow">' +
    '<input class="won" type="text" list="woNames" maxlength="120" placeholder="Наименование" aria-label="Наименование" value="' + esc(r.n || "") + '">' +
    '<div class="worow2">' +
      '<input class="woq" type="text" inputmode="decimal" maxlength="16" placeholder="Кол-во" aria-label="Количество" value="' + esc(r.q || "") + '">' +
      '<select class="wou" aria-label="Единица измерения"><option value="">ед.</option>' +
        WO_UNITS.map(u => '<option' + (u === r.u ? " selected" : "") + '>' + u + '</option>').join("") + '</select>' +
      '<input class="woy" type="text" list="woWhy" maxlength="120" placeholder="Причина" aria-label="Причина списания" value="' + esc(r.why || "") + '">' +
      '<button type="button" class="ghost wox" aria-label="Убрать позицию">×</button>' +
    '</div></li>';
}
const woRowsData = () => [...document.querySelectorAll("#woRows .worow")].map(li => ({
  n: li.querySelector(".won").value.replace(/\s+/g, " ").trim(), q: li.querySelector(".woq").value.trim(),
  u: li.querySelector(".wou").value, why: li.querySelector(".woy").value.replace(/\s+/g, " ").trim()}));
function woDraftSave(){
  wsave(WD, {date: $("woDate").value, no: $("woNo").value, rows: woRowsData()});
  if (me) { const ini = wjson(WI, {}); ini[me.name] = $("woIni").value; wsave(WI, ini); }
}

/* подсказки названий — из бланка месячной ревизии (с единицами) и открытой карты */
const WUNIT = {"литр": "л", "л": "л", "мл": "мл", "кг": "кг", "г": "гр", "гр": "гр", "шт": "шт"};
let woUnitOf = {};
function woNames(){
  const st = wjson("mechty-mrev-state", null), seen = new Set(), opts = [];
  woUnitOf = {};
  for (const x of (st && st.rows) || []) if (x.t === "i" && !seen.has(x.n)){ seen.add(x.n); opts.push(x.n); if (WUNIT[x.u]) woUnitOf[x.n] = WUNIT[x.u]; }
  for (const g of typeof data !== "undefined" ? data : []) for (const it of g.items) if (!seen.has(it.n)){ seen.add(it.n); opts.push(it.n); }
  $("woNames").innerHTML = opts.map(n => '<option value="' + esc(n) + '">').join("");
}

function woInit(){
  if (!woReady){
    woReady = true;
    const d = wjson(WD, null);
    $("woDate").value = d && d.date ? d.date : wtoday();
    $("woNo").value = d && d.no || "";
    const rows = d && d.rows && d.rows.length ? d.rows : [{}];
    $("woRows").innerHTML = rows.map(woRow).join("");
    woSigInit();
    woNames();
  }
  $("woName").value = me ? me.name : "";
  $("woIni").value = me ? (wjson(WI, {})[me.name] || "") : "";
  woFlush().then(woHist);
}

$("woAdd").addEventListener("click", () => {
  $("woRows").insertAdjacentHTML("beforeend", woRow({}));
  const li = $("woRows").lastElementChild;
  li.querySelector(".won").focus();
  woDraftSave();
});
$("woRows").addEventListener("click", e => {
  const x = e.target.closest("button.wox");
  if (!x) return;
  const li = x.closest(".worow");
  if ($("woRows").children.length > 1) li.remove(); else li.outerHTML = woRow({});
  woDraftSave();
});
$("woRows").addEventListener("change", e => {
  const n = e.target.closest(".won");
  if (n){ const u = woUnitOf[n.value.trim()], sel = n.closest(".worow").querySelector(".wou"); if (u && !sel.value) sel.value = u; }
});
$("woForm").addEventListener("input", woDraftSave);
$("woForm").addEventListener("change", woDraftSave);

/* ── подпись пальцем ── */
function woSigInit(){
  const c = $("woSig"), ctx = c.getContext("2d");
  const fit = () => {
    const r = c.getBoundingClientRect(), k = Math.max(2, devicePixelRatio || 1);
    if (!r.width) return;
    const keep = woSigned ? c.toDataURL() : null;
    c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = "#000"; ctx.lineWidth = 2.6;
    if (keep){ const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = keep; }
  };
  fit();
  new ResizeObserver(fit).observe(c);
  let last = null, prevMid = null;
  const pt = e => { const r = c.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; };
  c.addEventListener("pointerdown", e => {
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    last = pt(e); prevMid = last;
    ctx.beginPath(); ctx.arc(last.x, last.y, 1.3, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
    woSigned = true; $("woSigHint").hidden = true;
  });
  c.addEventListener("pointermove", e => {
    if (!last) return;
    e.preventDefault();
    const p = pt(e), mid = {x: (last.x + p.x) / 2, y: (last.y + p.y) / 2};
    ctx.beginPath(); ctx.moveTo(prevMid.x, prevMid.y); ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y); ctx.stroke();
    last = p; prevMid = mid;
  });
  const end = () => { last = null; };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end); c.addEventListener("pointerleave", end);
}
$("woSigClear").addEventListener("click", () => {
  const c = $("woSig"); c.getContext("2d").clearRect(0, 0, c.width, c.height);
  woSigned = false; $("woSigHint").hidden = false;
});
/* подпись без пустых полей вокруг */
function woSigCrop(){
  const c = $("woSig"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 20){
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const o = document.createElement("canvas"); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext("2d").drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

/* ── бланк на странице A4 (200 dpi) ── */
const WPX = 200 / 25.4;                                       // точек на мм
const WF = (w, s) => w + " " + s + 'px "PT Serif", "Times New Roman", serif';
function woFit(ctx, t, max, size, w){ for (let s = size; s > 14; s--){ ctx.font = WF(w || 400, s); if (ctx.measureText(t).width <= max) return s; } return 14; }
function woWrap(ctx, t, max){ const out = []; let cur = ""; for (const w of String(t).split(" ")){ const s = cur ? cur + " " + w : w; if (ctx.measureText(s).width > max && cur){ out.push(cur); cur = w; } else cur = s; } if (cur) out.push(cur); return out; }

async function woPages(act, sig){
  try { await document.fonts.load(WF(400, 40)); await document.fonts.load(WF(700, 40)); } catch (e) {}
  const W = Math.round(210 * WPX), H = Math.round(297 * WPX), M = Math.round(18 * WPX), R = W - M;
  const cols = [{t: "Наименование", w: .47}, {t: "Ед. изм.", w: .11}, {t: "Кол-во", w: .12}, {t: "Причина списания", w: .30}];
  const tw = R - M, xs = [M]; cols.forEach(c => xs.push(xs[xs.length - 1] + c.w * tw));
  const rowH = Math.round(9 * WPX), headH = Math.round(10 * WPX), sigH = Math.round(92 * WPX), fs = 34;
  const pages = [], rows = act.rows.slice();
  let first = true;
  while (first || rows.length){
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.textBaseline = "alphabetic";
    const line = (x0, y, x1, lw) => { ctx.fillRect(x0, y, x1 - x0, lw || 2); };
    let y = M;
    if (first){
      /* шапка: организация, подразделение | УТВЕРЖДАЮ */
      ctx.font = WF(400, fs); y += 40;
      const lab = (t, v, x, yy, w) => { ctx.font = WF(400, fs); ctx.fillText(t, x, yy); const lx = x + ctx.measureText(t).width + 12;
        ctx.font = WF(700, fs); ctx.fillText(v, lx + 8, yy); line(lx, yy + 10, x + w); };
      lab("Организация:", WO_ORG, M, y, 760); y += 64;
      lab("Подразделение:", WO_DEP, M, y, 760);
      const rx = W - M - 520; let ry = M + 40;
      ctx.font = WF(700, fs); ctx.fillText("УТВЕРЖДАЮ:", rx, ry); ry += 64;
      line(rx, ry + 10, rx + 240); ctx.font = WF(400, fs); ctx.fillText("/", rx + 250, ry); line(rx + 275, ry + 10, rx + 500); ctx.fillText("/", rx + 505, ry);
      ry += 64; ctx.fillText(wlong(act.date), rx, ry);
      /* название акта */
      y = M + 330; ctx.font = WF(700, 50); let t = "А К Т   о списании"; ctx.fillText(t, (W - ctx.measureText(t).width) / 2, y);
      y += 62; ctx.font = WF(400, fs); t = "от " + wlong(act.date); ctx.fillText(t, (W - ctx.measureText(t).width) / 2, y);
      ctx.fillText("№ " + (act.no || ""), R - 230, y); if (!act.no) line(R - 190, y + 10, R);
      y += 60;
    } else {
      ctx.font = WF(400, 30); const t = "Акт о списании от " + wlong(act.date) + (act.no ? " № " + act.no : "") + " — продолжение";
      y += 40; ctx.fillText(t, M, y); y += 40;
    }
    /* таблица */
    const top = y;
    ctx.font = WF(700, 30);
    cols.forEach((col, i) => ctx.fillText(col.t, xs[i] + 14, top + headH - 24));
    line(M, top, R, 3); line(M, top + headH, R, 3);
    const room = H - M - top - headH - Math.round(12 * WPX), capSig = Math.floor((room - sigH) / rowH), capAll = Math.floor(room / rowH);
    let take = rows.length <= capSig ? rows.length : Math.min(rows.length, capAll);
    if (rows.length > capSig && rows.length <= capAll) take = rows.length - 1;         // последняя строка — на страницу с подписями
    const part = rows.splice(0, take), empty = rows.length ? 0 : Math.max(0, Math.min(capSig, 12) - part.length);
    const n = part.length + empty;
    for (let i = 0; i < n; i++){
      const r = part[i], yy = top + headH + (i + 1) * rowH;
      line(M, yy, R, 2);
      if (!r) continue;
      const cells = [r.n, r.u, String(r.q).replace(".", ","), r.why];
      cells.forEach((v, k) => { const w = xs[k + 1] - xs[k] - 28; ctx.font = WF(400, woFit(ctx, v, w, fs, 400)); ctx.fillText(v, xs[k] + 14, yy - 20); });
    }
    const bottom = top + headH + n * rowH;
    xs.forEach((x, i) => ctx.fillRect(Math.round(x) - (i === xs.length - 1 ? 2 : 0), top, 2, bottom - top));
    y = bottom;
    if (!rows.length){
      /* после строк: сумма, ответственность, подписи */
      ctx.font = WF(400, fs); y += 80;
      ctx.fillText("Сумма списания:", M, y); line(M + ctx.measureText("Сумма списания:").width + 16, y + 10, M + 900);
      y += 70;
      for (const s of woWrap(ctx, "Все члены комиссии предупреждены об ответственности подписания акта, содержащего данные, не соответствующие действительности.", tw)){ ctx.fillText(s, M, y); y += 46; }
      y += 40;
      const lx = M + 640, slot = (yy, sigImg, who) => {
        if (sigImg){ const h = 120, w = Math.min(330, sigImg.width * h / sigImg.height); ctx.drawImage(sigImg, lx + (330 - w) / 2, yy - h + 18, w, h); }
        line(lx, yy + 10, lx + 330); ctx.font = WF(400, fs); ctx.fillText("/", lx + 340, yy);
        if (who){ ctx.font = WF(400, fs); ctx.fillText(who, lx + 370, yy); }
        line(lx + 365, yy + 10, R - 30); ctx.fillText("/", R - 22, yy);
      };
      ctx.font = WF(400, fs);
      ctx.fillText("Председатель комиссии", M, y); ctx.fillText("гл. бухгалтер", M + 390, y); slot(y); y += 100;
      ctx.fillText("Члены комиссии", M, y); slot(y, sig, act.who); y += 100;
      ctx.fillText("Материально ответственное лицо:", M, y); slot(y); y += 100;
      ctx.fillText("Решение руководителя:", M, y); line(M + ctx.measureText("Решение руководителя:").width + 16, y + 10, R);
    }
    /* служебная строка внизу */
    ctx.font = WF(400, 20); ctx.fillStyle = "#777";
    ctx.fillText("Бар «Мечты» · создано " + wdmy(wtoday()) + " · " + act.who + (pages.length || rows.length ? " · лист " + (pages.length + 1) : ""), M, H - M / 2);
    pages.push(c);
    first = false;
  }
  return pages;
}

/* ── PDF: страницы — JPEG-картинки на A4, без внешних библиотек ── */
async function woPdf(pages){
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (i, body) => { offs[i] = len; put(i + " 0 obj\n"); body(); put("\nendobj\n"); };
  const jpgs = await Promise.all(pages.map(c => new Promise(ok => c.toBlob(b => b.arrayBuffer().then(a => ok(new Uint8Array(a))), "image/jpeg", .9))));
  const n = pages.length, pw = 595.28, ph = 841.89;
  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => put("<< /Type /Pages /Count " + n + " /Kids [" + pages.map((_, i) => (3 + i * 3) + " 0 R").join(" ") + "] >>"));
  pages.forEach((c, i) => {
    const p = 3 + i * 3, cs = "q " + pw + " 0 0 " + ph + " 0 0 cm /Im0 Do Q";
    obj(p, () => put("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw + " " + ph + "] /Resources << /XObject << /Im0 " + (p + 2) + " 0 R >> >> /Contents " + (p + 1) + " 0 R >>"));
    obj(p + 1, () => { put("<< /Length " + cs.length + " >>\nstream\n"); put(cs); put("\nendstream"); });
    obj(p + 2, () => { put("<< /Type /XObject /Subtype /Image /Width " + c.width + " /Height " + c.height +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpgs[i].length + " >>\nstream\n"); put(jpgs[i]); put("\nendstream"); });
  });
  const xref = len, total = 3 + n * 3;
  put("xref\n0 " + total + "\n0000000000 65535 f \n" + offs.slice(1, total).map(o => String(o).padStart(10, "0") + " 00000 n \n").join(""));
  put("trailer\n<< /Size " + total + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
  return new Blob(parts, {type: "application/pdf"});
}

/* ── создать файл ── */
$("woForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (woBusy) return;
  const warn = m => { $("woWarn").textContent = m; };
  const date = $("woDate").value, no = $("woNo").value.trim();
  const rows = woRowsData().filter(r => r.n || r.q || r.why);
  const ini = $("woIni").value.replace(/\s+/g, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return warn("Укажите дату акта.");
  if (!rows.length) return warn("Добавьте хотя бы одну позицию.");
  for (const r of rows){
    const c = rcalc(r.q);
    if (!r.n) return warn("У позиции нет наименования.");
    if (!isFinite(c.v) || c.v <= 0) return warn("«" + r.n + "»: укажите количество.");
    if (!r.u) return warn("«" + r.n + "»: выберите единицу измерения.");
    if (!r.why) return warn("«" + r.n + "»: укажите причину списания.");
    r.q = c.v;
  }
  if (!ini) return warn("Впишите инициалы.");
  if (!woSigned) return warn("Распишитесь в поле для подписи.");
  warn("");
  woBusy = true; $("woGo").disabled = true; $("woGo").textContent = "Создаём файл…";
  try {
    const who = (me ? me.name : "") + " " + ini.replace(/([^.])$/, "$1.");
    const act = {date: wdmy(date), iso: date, no, who: who.trim(), rows};
    const pages = await woPages({...act, date}, woSigCrop());
    const pdf = await woPdf(pages);
    const name = "Акт списания " + act.date + (no ? " №" + no : "") + " — " + (me ? me.name : "бар") + ".pdf";
    woLast = {pdf, name, id: rid(), act};
    $("woPrev").src = pages[0].toDataURL("image/jpeg", .6);
    $("woInfo").innerHTML = "Позиций: <b>" + rows.length + "</b>" + (pages.length > 1 ? ", листов: " + pages.length : "") +
      ". Файл — «" + esc(name) + "». <span id=\"woSave\">Сохраняем копию на Диск…</span>";
    $("woDone").hidden = false; $("woForm").hidden = true;
    $("woDone").scrollIntoView({behavior: "smooth", block: "start"});
    buzz(14);
    await woQueue(woLast);
  } catch (err){
    warn("Не удалось создать файл: " + (err && err.message || err));
  } finally {
    woBusy = false; $("woGo").disabled = false; $("woGo").textContent = "Создать файл";
  }
});

/* скачать / поделиться */
$("woShare").addEventListener("click", async () => {
  if (!woLast) return;
  const file = new File([woLast.pdf], woLast.name, {type: "application/pdf"});
  if (navigator.canShare && navigator.canShare({files: [file]})){
    try { await navigator.share({files: [file], title: woLast.name}); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(woLast.pdf); a.download = woLast.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
$("woNew").addEventListener("click", () => {
  wsave(WD, {date: wtoday(), no: "", rows: []});
  $("woDate").value = wtoday(); $("woNo").value = ""; $("woRows").innerHTML = woRow({});
  $("woSigClear").click();
  $("woDone").hidden = true; $("woForm").hidden = false; woLast = null;
  $("woForm").scrollIntoView({behavior: "smooth", block: "start"});
});

/* ── копия на Диск: очередь на устройстве, отправка POST, проверка JSONP ── */
const b64of = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
async function woQueue(item){
  const q = wjson(WQ, []);
  q.push({id: item.id, act: item.act, name: item.name, pdf: await b64of(item.pdf)});
  if (!wsave(WQ, q)){ wsave(WQ, q.slice(-1)); }                        // мало места — хотя бы последний акт
  await woFlush();
}
async function woFlush(){
  const q = wjson(WQ, []);
  if (!q.length || !TOKEN) return;
  for (const a of q){
    try {
      await fetch(ENDPOINT, {method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({token: TOKEN, wo: "save", id: a.id, act: a.act, pdf: a.pdf})});
    } catch (e) {}
    const d = await api({wo: "check", id: a.id});
    if (d.ok && d.saved){
      wsave(WQ, wjson(WQ, []).filter(x => x.id !== a.id));
      if (woLast && woLast.id === a.id && $("woSave")) $("woSave").innerHTML = "Копия сохранена на Google Диск" + (d.url ? " — <a class=\"link\" href=\"" + esc(d.url) + "\" target=\"_blank\" rel=\"noopener\">открыть</a>" : "") + ".";
    } else if (woLast && woLast.id === a.id && $("woSave")){
      $("woSave").textContent = d.error === "net" ? "Нет связи — копия отправится на Диск позже (файл уже можно скачать)." :
        d.ok ? "Таблица пока не приняла копию — повторим позже." : "Списания ждут новый Apps Script (см. README) — копия отправится, когда он будет.";
    }
  }
  woHist();
}
window.addEventListener("online", () => { if (R) woFlush(); });

async function woHist(){
  const d = await api({wo: "list"});
  const q = wjson(WQ, []);
  const wait = q.map(a => '<li><div class="row1"><span>' + esc(a.act.date) + (a.act.no ? " № " + esc(a.act.no) : "") + " · " + esc(a.act.who) +
    " · " + a.act.rows.length + ' поз.</span><em class="wopend">ждёт отправки</em></div></li>');
  if (!d.ok){
    $("woList").innerHTML = wait.join("") || '<li><div class="row1"><span>' + (d.error === "net" ? "Нет связи с таблицей." : "Список появится после обновления Apps Script.") + '</span></div></li>';
    $("woHistN").textContent = q.length ? "не отправлено: " + q.length : "";
    return;
  }
  $("woHistN").textContent = q.length ? "не отправлено: " + q.length : "";
  $("woList").innerHTML = wait.concat((d.acts || []).map(a => '<li><div class="row1"><span>' + esc(a.date) + (a.no ? " № " + esc(a.no) : "") +
    " · " + esc(a.who) + " · " + a.n + ' поз.</span>' + (a.url ? '<a class="link" href="' + esc(a.url) + '" target="_blank" rel="noopener">файл</a>' : "") + '</div></li>')).join("") ||
    '<li><div class="row1"><span>Пока ни одного акта.</span></div></li>';
}
