/* Списания: акт о списании и акт проработки по бланку ООО «Заря» → PDF на телефоне + копия на Google Диске. */
/* ════════════ Списания ════════════
   Бланк: организация, подразделение, «УТВЕРЖДАЮ», «АКТ о списании от …», №, строки «наименование / ед. изм. /
   кол-во / причина», сумма, фраза об ответственности, подписи; бармен — материально ответственное лицо.
   Файл собирается здесь же, на устройстве (работает и без связи): лист A4 рисуется на canvas и упаковывается в PDF.
   Копия уходит в Apps Script (POST): файл — в папку «Бар Мечты — Списания» на Диске, позиции — в её «Журнал списаний».
   Не ушло — акт ждёт в очереди на устройстве (IndexedDB) и уйдёт позже.
   Акт проработки — тот же бланк, у всех позиций причина «Проработка»; своя папка и свой журнал. */
const WO_ORG = "ООО «Заря»", WO_DEP = "Бар";
const WO_UNITS = ["л", "мл", "гр", "кг", "шт"];
const WO_MAX = 25, WO_PR = "Проработка";                     // 25 позиций — столько помещается на одном листе
const WOK = {wo: {title: "Акт о списании", file: "Акт списания"}, pr: {title: "Акт проработки", file: "Акт проработки"}};
const WD = "mechty-wo-draft", WQ = "mechty-wo-q", WI = "mechty-wo-ini";
let wkind = "wo";
try { if (localStorage.getItem("mechty-wo-kind") === "pr") wkind = "pr"; } catch (e) {}
let woReady = false, woUser, woLast = null, woSigned = false, woBusy = false;
let woLastOf = {};                                            // созданный акт каждого вида — до «Новый акт»

const wjson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const wsave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const wtoday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);   // дата по Астане (UTC+5)
const wdmy = iso => iso.split("-").reverse().join(".");
const WMON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const wlong = iso => { const [y, m, d] = iso.split("-"); return "«" + d + "» " + WMON[+m - 1] + " " + y + " г."; };
/* черновик — свой у каждого вида и у каждого бармена (телефон бывает общий) */
const wdraft = () => WD + (wkind === "pr" ? "-pr" : "") + ":" + (me ? me.name : "");

/* ── форма ── */
function woRow(r){
  r = r || {};
  return '<li class="worow' + (wkind === "pr" ? " pr" : "") + '">' +
    '<input class="won" type="text" list="woNames" maxlength="120" placeholder="Наименование" aria-label="Наименование" value="' + esc(r.n || "") + '">' +
    '<div class="worow2">' +
      '<input class="woq" type="text" inputmode="decimal" maxlength="16" placeholder="Кол-во" aria-label="Количество" value="' + esc(r.q || "") + '">' +
      '<select class="wou" aria-label="Единица измерения"><option value="">ед.</option>' +
        WO_UNITS.map(u => '<option' + (u === r.u ? " selected" : "") + '>' + u + '</option>').join("") + '</select>' +
      (wkind === "pr"
        ? '<span class="woy wofix" aria-label="Причина списания">' + WO_PR + '</span>'
        : '<input class="woy" type="text" list="woWhy" maxlength="120" placeholder="Причина" aria-label="Причина списания" value="' + esc(r.why || "") + '">') +
      '<button type="button" class="ghost wox" aria-label="Убрать позицию">×</button>' +
    '</div></li>';
}
const woRowsData = () => [...document.querySelectorAll("#woRows .worow")].map(li => ({
  n: li.querySelector(".won").value.replace(/\s+/g, " ").trim(), q: li.querySelector(".woq").value.trim(),
  u: li.querySelector(".wou").value, why: wkind === "pr" ? WO_PR : li.querySelector(".woy").value.replace(/\s+/g, " ").trim()}));
function woDraftSave(){
  if (!me) return;
  wsave(wdraft(), {date: $("woDate").value, no: $("woNo").value, rows: woRowsData()});
  const ini = wjson(WI, {}); ini[me.name] = $("woIni").value; wsave(WI, ini);
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

/* форма текущего вида — из его черновика */
function woLoad(){
  const d = wjson(wdraft(), null);
  $("woDate").value = d && d.date ? d.date : wtoday();
  $("woNo").value = d && d.no || "";
  const rows = d && d.rows && d.rows.length ? d.rows.slice(0, WO_MAX) : [{}];
  $("woRows").innerHTML = rows.map(woRow).join("");
  document.querySelectorAll("#wokind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === wkind)));
  $("woTitle").textContent = WOK[wkind].title;
  woCap();
}
function woCap(){
  const full = $("woRows").children.length >= WO_MAX;
  $("woAdd").disabled = full; $("woMax").hidden = !full;
}

function woInit(){
  const u = me ? me.name : null;
  if (!woReady){ woReady = true; woSigInit(); }
  /* другой бармен на этом телефоне — ни чужой подписи, ни чужих актов, ни чужого черновика */
  if (woUser !== u){ woLeave(); woUser = u; }
  woNames();
  $("woName").value = me ? me.name : "";
  $("woIni").value = me ? (wjson(WI, {})[me.name] || "") : "";
  woFlush().then(woHist);
  wnInit();
}
/* выход из аккаунта: форма — в исходное */
function woLeave(){
  woUser = null; woLast = null; woLastOf = {};
  if (woReady){ woSigReset(); woLoad(); woDoneUi(); $("woWarn").textContent = ""; }
  wnItems = []; wnState = "load"; if (woReady) wnDraw();
}

function woSetKind(k){
  if (woBusy || k === wkind) return;
  if (!woLast) woDraftSave();                                  // форма на экране — запомнить; акт уже создан — черновик пуст
  wkind = k;
  try { localStorage.setItem("mechty-wo-kind", wkind); } catch (e2) {}
  woLast = woLastOf[wkind] || null;
  woLoad(); $("woWarn").textContent = "";
  woDoneUi(); woHist();
}
$("wokind").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) woSetKind(b.dataset.k);
});

$("woAdd").addEventListener("click", () => {
  if ($("woRows").children.length >= WO_MAX) return;
  $("woRows").insertAdjacentHTML("beforeend", woRow({}));
  const li = $("woRows").lastElementChild;
  li.querySelector(".won").focus();
  woCap(); woDraftSave();
});
$("woRows").addEventListener("click", e => {
  const x = e.target.closest("button.wox");
  if (!x) return;
  const li = x.closest(".worow");
  if ($("woRows").children.length > 1) li.remove(); else li.outerHTML = woRow({});
  woCap(); woDraftSave();
});
$("woRows").addEventListener("change", e => {
  const n = e.target.closest(".won");
  if (n){ const u = woUnitOf[n.value.trim()], sel = n.closest(".worow").querySelector(".wou"); if (u && !sel.value) sel.value = u; }
});
$("woForm").addEventListener("input", woDraftSave);
$("woForm").addEventListener("change", woDraftSave);

/* ── подпись пальцем ──
   Штрихи хранятся точками: при повороте телефона поле меняет ширину, и подпись перерисовывается
   без растяжения (если не влезает — уменьшается целиком, пропорционально). */
let woStrokes = [], woK = 1;
function woSigSeg(ctx, pts, i){                               // кусок штриха до точки i (сглаживание по серединам)
  const k = woK, p = pts[i], a = pts[i - 1], pm = i > 1 ? {x: (pts[i - 2].x + a.x) / 2, y: (pts[i - 2].y + a.y) / 2} : a;
  ctx.beginPath(); ctx.moveTo(pm.x * k, pm.y * k);
  ctx.quadraticCurveTo(a.x * k, a.y * k, (a.x + p.x) / 2 * k, (a.y + p.y) / 2 * k); ctx.stroke();
}
function woSigDot(ctx, p){ ctx.beginPath(); ctx.arc(p.x * woK, p.y * woK, 1.3, 0, Math.PI * 2); ctx.fill(); }
function woSigInit(){
  const c = $("woSig"), ctx = c.getContext("2d");
  const fit = () => {
    const r = c.getBoundingClientRect(), dpr = Math.max(2, devicePixelRatio || 1);
    if (!r.width) return;
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = ctx.fillStyle = "#000"; ctx.lineWidth = 2.6;
    let mx = 0, my = 0;
    for (const s of woStrokes) for (const p of s){ if (p.x > mx) mx = p.x; if (p.y > my) my = p.y; }
    woK = Math.min(1, (r.width - 6) / (mx || 1), (r.height - 6) / (my || 1));
    for (const s of woStrokes){ woSigDot(ctx, s[0]); for (let i = 1; i < s.length; i++) woSigSeg(ctx, s, i); }
  };
  fit();
  new ResizeObserver(fit).observe(c);
  let cur = null;
  const pt = e => { const r = c.getBoundingClientRect(); return {x: (e.clientX - r.left) / woK, y: (e.clientY - r.top) / woK}; };
  c.addEventListener("pointerdown", e => {
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    cur = [pt(e)]; woStrokes.push(cur); woSigDot(ctx, cur[0]);
    woSigned = true; $("woSigHint").hidden = true;
  });
  c.addEventListener("pointermove", e => {
    if (!cur) return;
    e.preventDefault();
    cur.push(pt(e)); woSigSeg(ctx, cur, cur.length - 1);
  });
  const end = () => { cur = null; };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end); c.addEventListener("pointerleave", end);
}
function woSigReset(){
  const c = $("woSig"); c.getContext("2d").clearRect(0, 0, c.width, c.height);
  woStrokes = []; woK = 1; woSigned = false; $("woSigHint").hidden = false;
}
$("woSigClear").addEventListener("click", woSigReset);
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

/* ── бланк на листе A4 (200 dpi) ── */
const WPX = 200 / 25.4;                                       // точек на мм
const WF = (w, s) => w + " " + s + 'px "PT Serif", "Times New Roman", serif';
function woFit(ctx, t, max, size, w){ for (let s = size; s > 14; s--){ ctx.font = WF(w || 400, s); if (ctx.measureText(t).width <= max) return s; } return 14; }
/* перенос по словам; слово длиннее строки режется */
function woWrap(ctx, t, max){
  const words = [];
  for (const w of String(t).split(" ").filter(Boolean)){
    if (ctx.measureText(w).width <= max){ words.push(w); continue; }
    let part = "";
    for (const ch of w){ if (part && ctx.measureText(part + ch).width > max){ words.push(part); part = ch; } else part += ch; }
    if (part) words.push(part);
  }
  const out = []; let cur = "";
  for (const w of words){ const s = cur ? cur + " " + w : w; if (cur && ctx.measureText(s).width > max){ out.push(cur); cur = w; } else cur = s; }
  if (cur || !out.length) out.push(cur);
  return out;
}

async function woPages(act, sig){
  /* шрифт с кириллицей — иначе первый акт после загрузки выходит смесью шрифтов */
  try { await Promise.all([400, 700].map(w => document.fonts.load(WF(w, 40), "АКТ о списании №«»0123"))); } catch (e) {}
  const W = Math.round(210 * WPX), H = Math.round(297 * WPX), M = Math.round(15 * WPX), R = W - M;
  /* «Причина» — самая широкая после наименования */
  const cols = [{t: "Наименование", w: .38}, {t: "Ед. изм.", w: .09}, {t: "Кол-во", w: .10}, {t: "Причина списания", w: .43}];
  const tw = R - M, xs = [M]; cols.forEach(c => xs.push(xs[xs.length - 1] + c.w * tw));
  const cw = cols.map((_, k) => xs[k + 1] - xs[k] - 24);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.textBaseline = "alphabetic";
  const line = (x0, y, x1, lw) => { ctx.fillRect(x0, y, x1 - x0, lw || 2); };
  const fs = 34;

  /* шапка: организация, подразделение | УТВЕРЖДАЮ */
  let y = M + 40;
  const lab = (t, v, x, yy, w) => { ctx.font = WF(400, fs); ctx.fillText(t, x, yy); const lx = x + ctx.measureText(t).width + 12;
    ctx.font = WF(700, fs); ctx.fillText(v, lx + 8, yy); line(lx, yy + 10, x + w); };
  lab("Организация:", WO_ORG, M, y, 760);
  lab("Подразделение:", WO_DEP, M, y + 62, 760);
  const rx = W - M - 520; let ry = y;
  ctx.font = WF(700, fs); ctx.fillText("УТВЕРЖДАЮ:", rx, ry); ry += 62;
  line(rx, ry + 10, rx + 240); ctx.font = WF(400, fs); ctx.fillText("/", rx + 250, ry); line(rx + 275, ry + 10, rx + 500); ctx.fillText("/", rx + 505, ry);
  ry += 62; ctx.fillText(wlong(act.date), rx, ry);
  /* название акта */
  y = M + 280; ctx.font = WF(700, 50); let t = act.kind === "pr" ? "А К Т   проработки" : "А К Т   о списании"; ctx.fillText(t, (W - ctx.measureText(t).width) / 2, y);
  y += 58; ctx.font = WF(400, fs); t = "от " + wlong(act.date); ctx.fillText(t, (W - ctx.measureText(t).width) / 2, y);
  ctx.fillText("№ " + (act.no || ""), R - 230, y); if (!act.no) line(R - 190, y + 10, R);
  y += 46;

  /* таблица — только заполненные строки. Шрифт — самый крупный, при котором все строки (с переносами)
     и подписи помещаются на один лист; длинный текст переносится внутри ячейки и не вылезает за неё. */
  const top = y, headH = Math.round(9 * WPX), room = H - M - top - headH - Math.round(70 * WPX);
  const vals = r => [r.n, r.u, String(r.q).replace(".", ","), r.why];
  const lay = s => { ctx.font = WF(400, s); return act.rows.map(r => { const cells = vals(r).map((v, k) => woWrap(ctx, v, cw[k]));
    return {cells, h: Math.max(...cells.map(x => x.length)) * s * 1.12 + s * .5}; }); };
  let s = fs, L = lay(s);
  const sum = () => L.reduce((a, r) => a + r.h, 0);
  while (s > 10 && sum() > room) L = lay(--s);
  const extra = Math.max(0, Math.min((room - sum()) / L.length, Math.round(9 * WPX) - s * 1.62));
  ctx.font = WF(700, 28);
  cols.forEach((col, i) => ctx.fillText(col.t, xs[i] + 12, top + headH - 22));
  line(M, top, R, 3); line(M, top + headH, R, 3);
  let yy = top + headH;
  ctx.font = WF(400, s);
  for (const r of L){
    const h = Math.round(r.h + extra), lh = s * 1.12;
    r.cells.forEach((ls, k) => ls.forEach((txt, i) => ctx.fillText(txt, xs[k] + 12, yy + (h - ls.length * lh) / 2 + lh * i + lh * .78)));
    yy += h; line(M, yy, R, 2);
  }
  const bottom = yy;
  xs.forEach((x, i) => ctx.fillRect(Math.round(x) - (i === xs.length - 1 ? 2 : 0), top, 2, bottom - top));

  /* после строк: сумма, ответственность, подписи; бармен — материально ответственное лицо */
  y = bottom + 62;
  ctx.font = WF(400, fs);
  ctx.fillText("Сумма списания:", M, y); line(M + ctx.measureText("Сумма списания:").width + 16, y + 10, M + 900);
  y += 58;
  for (const ln of woWrap(ctx, "Все члены комиссии предупреждены об ответственности подписания акта, содержащего данные, не соответствующие действительности.", tw)){ ctx.fillText(ln, M, y); y += 44; }
  y += 34;
  const lx = M + 640, nx = lx + 375, nw = R - 30 - nx - 8, slot = (yy, sigImg, who) => {
    if (sigImg){                                              // пропорционально; не выше строки — не залезает на соседнюю
      const k = Math.min(330 / sigImg.width, 82 / sigImg.height), w = sigImg.width * k, h = sigImg.height * k;
      ctx.drawImage(sigImg, lx + (330 - w) / 2, yy + 12 - h, w, h);
    }
    line(lx, yy + 10, lx + 330); ctx.font = WF(400, fs); ctx.fillText("/", lx + 340, yy);
    if (who){ ctx.save(); ctx.beginPath(); ctx.rect(nx, yy - 60, nw, 80); ctx.clip(); ctx.font = WF(400, woFit(ctx, who, nw, fs)); ctx.fillText(who, nx, yy); ctx.restore(); }
    ctx.font = WF(400, fs); line(lx + 365, yy + 10, R - 30); ctx.fillText("/", R - 22, yy);
  };
  ctx.fillText("Председатель комиссии", M, y); ctx.fillText("гл. бухгалтер", M + 390, y); slot(y); y += 84;
  ctx.fillText("Члены комиссии", M, y); slot(y); y += 84;
  ctx.fillText("Материально ответственное лицо:", M, y); slot(y, sig, act.who); y += 84;
  ctx.fillText("Решение руководителя:", M, y); line(M + ctx.measureText("Решение руководителя:").width + 16, y + 10, R);

  ctx.font = WF(400, 20); ctx.fillStyle = "#777";
  ctx.fillText("Бар «Мечты» · " + (act.kind === "pr" ? "акт проработки" : "акт списания") + " · создано " + wdmy(wtoday()) + " · " + act.who, M, H - M / 2);
  return [c];
}

/* ── PDF: страницы — JPEG-картинки на A4, без внешних библиотек ── */
async function woPdf(pages){
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const put = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (i, body) => { offs[i] = len; put(i + " 0 obj\n"); body(); put("\nendobj\n"); };
  const jpgs = await Promise.all(pages.map(c => new Promise((ok, no) => c.toBlob(b => b ? b.arrayBuffer().then(a => ok(new Uint8Array(a)), no) : no(new Error("canvas")), "image/jpeg", .9))));
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
  const kind = wkind, date = $("woDate").value, no = $("woNo").value.trim();
  const rows = woRowsData().filter(r => r.n || r.q || (kind === "wo" && r.why));
  const ini = $("woIni").value.replace(/\s+/g, "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return warn("Укажите дату акта.");
  if (!rows.length) return warn("Добавьте хотя бы одну позицию.");
  if (rows.length > WO_MAX) return warn("В акте не больше " + WO_MAX + " позиций.");
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
    const act = {kind, date: wdmy(date), iso: date, no, who: who.trim(), rows};
    const pages = await woPages({...act, date}, woSigCrop());
    const pdf = await woPdf(pages);
    const name = WOK[kind].file + " " + act.date + (no ? " №" + no : "") + " — " + (me ? me.name : "бар") + ".pdf";
    woLast = woLastOf[kind] = {pdf, name, id: rid(), act, prev: pages[0].toDataURL("image/jpeg", .6)};
    /* акт готов — черновик очищаем: после перезагрузки не создать тот же акт второй раз */
    if (me) wsave(wdraft(), {date: wtoday(), no: "", rows: []});
    woDoneUi();
    $("woDone").scrollIntoView({behavior: "smooth", block: "start"});
    buzz(14);
    await woQueue(woLast);
  } catch (err){
    warn("Не удалось создать файл: " + (err && err.message || err));
  } finally {
    woBusy = false; $("woGo").disabled = false; $("woGo").textContent = "Создать файл";
  }
});

/* карточка «Акт готов» — для созданного акта текущего вида, иначе форма */
function woDoneUi(){
  const L = woLast;
  $("woDone").hidden = !L; $("woForm").hidden = !!L;
  if (!L) return;
  $("woPrev").src = L.prev;
  $("woInfo").innerHTML = "Позиций: <b>" + L.act.rows.length + "</b>. Файл — «" + esc(L.name) + "». <span id=\"woSave\">" +
    (L.st || "Сохраняем копию на Диск…") + "</span>";
  $("woShare").hidden = !woCanShare(L);
}
function woSt(id, html){
  for (const k in woLastOf) if (woLastOf[k] && woLastOf[k].id === id) woLastOf[k].st = html;
  if (woLast && woLast.id === id && $("woSave")) $("woSave").innerHTML = html;
}

/* скачать — всегда файлом; поделиться — где телефон умеет отправлять файлы */
const woFile = L => new File([L.pdf], L.name, {type: "application/pdf"});
const woCanShare = L => { try { return !!(navigator.canShare && navigator.canShare({files: [woFile(L)]})); } catch (e) { return false; } };
$("woDl").addEventListener("click", () => {
  if (!woLast) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(woLast.pdf); a.download = woLast.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
});
$("woShare").addEventListener("click", async () => {
  if (!woLast) return;
  try { await navigator.share({files: [woFile(woLast)], title: woLast.name}); } catch (e) { if (e.name !== "AbortError") $("woDl").click(); }
});
$("woNew").addEventListener("click", () => {
  if (me) wsave(wdraft(), {date: wtoday(), no: "", rows: []});
  woLast = woLastOf[wkind] = null;
  woLoad(); woSigReset(); woDoneUi();
  $("woForm").scrollIntoView({behavior: "smooth", block: "start"});
});

/* ── копия на Диск: очередь на устройстве, отправка POST, проверка JSONP ──
   PDF лежат в IndexedDB (места много, без base64). Нет IndexedDB — localStorage; не влезло — старые акты
   не трогаем, а про новый честно говорим: «скачайте файл». */
let wdbP = null;
function wdb(){
  return wdbP || (wdbP = new Promise((ok, no) => {
    const r = indexedDB.open("mechty-wo", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("q", {keyPath: "id"});
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); r.onblocked = () => no(new Error("blocked"));
  }).catch(e => { wdbP = null; throw e; }));
}
const wtx = (mode, fn) => wdb().then(db => new Promise((ok, no) => {
  const t = db.transaction("q", mode), rq = fn(t.objectStore("q"));
  t.oncomplete = () => ok(rq && rq.result); t.onerror = t.onabort = () => no(t.error || new Error("idb"));
}));
async function qList(){
  let a = [];
  try { a = await wtx("readonly", st => st.getAll()) || []; } catch (e) {}
  return a.concat(wjson(WQ, [])).sort((x, y) => (x.t || 0) - (y.t || 0));
}
async function qPut(item){
  try { await wtx("readwrite", st => st.put(item)); return true; } catch (e) {}
  const q = wjson(WQ, []);
  q.push({...item, pdf: await b64of(new Blob([item.pdf]))});
  return wsave(WQ, q);
}
async function qDel(id){
  try { await wtx("readwrite", st => st.delete(id)); } catch (e) {}
  const q = wjson(WQ, []);
  if (q.some(x => x.id === id)) wsave(WQ, q.filter(x => x.id !== id));
}
const b64of = blob => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(blob); });

async function woQueue(L){
  const ok = await qPut({id: L.id, t: Date.now(), act: L.act, name: L.name, pdf: await L.pdf.arrayBuffer()});
  if (!ok){ woSt(L.id, "Копию не удалось поставить в очередь — на телефоне мало места. Скачайте файл."); return; }
  await woFlush(true);
  woHist();
}

const WO_NET = "Нет связи — копия отправится на Диск позже (файл уже можно скачать).";
const WO_WAIT = "Таблица пока не приняла копию — повторим позже (файл уже можно скачать).";
const WO_OLD = "Списания ждут новый Apps Script (см. README) — копия отправится, когда он будет.";
const woSaved = url => "Копия сохранена на Google Диск" + (url ? " — <a class=\"link\" href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">открыть</a>" : "") + ".";
/* одна отправка за раз; без force — не чаще раза в 30 с (вкладку открывают часто, а PDF тяжёлые) */
let woFlushing = null, woAgain = false, woFlushAt = 0;
function woFlush(force){
  if (woFlushing){ woAgain = true; return woFlushing; }
  if (!force && Date.now() - woFlushAt < 30e3) return Promise.resolve();
  woFlushing = (async () => { do { woAgain = false; woFlushAt = Date.now(); await woFlushRun(); } while (woAgain); })()
    .finally(() => { woFlushing = null; });
  return woFlushing;
}
async function woFlushRun(){
  const q = await qList();
  if (!q.length || !TOKEN) return;
  for (const a of q){
    const k = a.act.kind || "wo";
    let d = await api({wo: "check", id: a.id, k});
    if (d.ok && !("saved" in d)){ q.forEach(x => woSt(x.id, WO_OLD)); return; }   // старый Apps Script — PDF не гоняем
    if (d.error === "net"){ q.forEach(x => woSt(x.id, WO_NET)); return; }
    if (d.ok && !d.saved){
      try {
        const pdf = typeof a.pdf === "string" ? a.pdf : await b64of(new Blob([a.pdf]));
        await fetch(ENDPOINT, {method: "POST", mode: "no-cors", headers: {"Content-Type": "text/plain;charset=utf-8"},
          body: JSON.stringify({token: TOKEN, wo: "save", id: a.id, act: a.act, pdf})});
      } catch (e) {}
      d = await api({wo: "check", id: a.id, k});
    }
    if (d.ok && d.saved){ await qDel(a.id); woSt(a.id, woSaved(d.url)); }
    else woSt(a.id, d.error === "net" ? WO_NET : WO_WAIT);
  }
}
window.addEventListener("online", () => { if (R) woFlush(true).then(woHist); });

/* последние акты: строка — акт, нажали — раскрываются позиции */
const wq = q => String(q).replace(".", ",");
function woActLi(a, rows, url, pend){
  return '<li class="woact"><details><summary><span>' + esc(a.date) + (a.no ? " № " + esc(a.no) : "") + " · " + esc(a.who) + " · " + rows.length + ' поз.</span>' +
    (pend ? '<em class="wopend">ждёт отправки</em>' : "") + '</summary>' +
    '<ul class="womini">' + rows.map(r => '<li><span>' + esc(r[0]) + '</span><b>' + esc(wq(r[2])) + " " + esc(r[1]) + '</b><em>' + esc(r[3]) + '</em></li>').join("") + '</ul>' +
    (url ? '<a class="link womore" href="' + esc(url) + '" target="_blank" rel="noopener">Открыть PDF</a>' : "") + '</details></li>';
}
async function woHist(){
  const k = wkind, [d, all] = await Promise.all([api({wo: "list", k}), qList()]);
  if (k !== wkind) return;                                    // пока ждали — переключили вид
  const q = all.filter(a => (a.act.kind || "wo") === k);
  const wait = q.map(a => woActLi(a.act, a.act.rows.map(r => [r.n, r.u, r.q, r.why]), "", true));
  $("woHistN").textContent = q.length ? "не отправлено: " + q.length : "";
  if (!d.ok || !Array.isArray(d.acts)){
    $("woList").innerHTML = wait.join("") || '<li><div class="row1"><span>' + (d.error === "net" ? "Нет связи с таблицей." : "Список появится после обновления Apps Script.") + '</span></div></li>';
    return;
  }
  $("woList").innerHTML = wait.concat(d.acts.map(a => woActLi(a, Array.isArray(a.rows) ? a.rows : [], a.url, false))).join("") ||
    '<li><div class="row1"><span>Пока ни одного акта.</span></div></li>';
}

/* ════════════ Заметка к списанию ════════════
   Общий список «что списать», виден всем барменам (лист «Заметка» в «Журнале списаний»). Строку нельзя удалить:
   из заметки она уходит только кнопкой «Перенести в акт списания». Без связи записанное ждёт на устройстве. */
const WNQ = "mechty-wn-q", WNT = "mechty-wn-take";
let wnItems = [], wnState = "load", wnBusy = false, wnTimer = 0;
const wnPend = () => wjson(WNQ, []);

function wnDraw(){
  const pend = wnPend(), all = wnItems.concat(pend.filter(x => !wnItems.some(y => y.id === x.id)).map(x => ({...x, pend: true})));
  $("wnCount").textContent = all.length ? all.length + " поз." : "";
  $("wnList").innerHTML = all.length
    ? all.map(x => '<li' + (x.pend ? ' class="pend"' : "") + '><div class="wnrow"><span>' + esc(x.n) + '</span><b>' + esc(wq(x.q)) + " " + esc(x.u || "") + '</b></div>' +
        '<div class="wnmeta">' + (x.why ? esc(x.why) + " · " : "") + (x.pend ? "ждёт отправки" : esc(x.who || "") + (x.at ? ", " + esc(x.at) : "")) + '</div></li>').join("")
    : '<li class="wnempty">' + (wnState === "load" ? "Загружаем…" : wnState === "old" ? "Заметка заработает после обновления Apps Script." :
        wnState === "net" ? "Нет связи с таблицей." : "Пусто. Запишите ниже, что нужно списать, — увидят все.") + '</li>';
  const n = wnItems.length;
  $("wnMove").disabled = !n || wnBusy;
  $("wnMove").textContent = wnBusy ? "Переносим…" : "Перенести в акт списания" + (n ? " (" + n + ")" : "");
}

/* записанное без связи — в таблицу; затем свежий список. Незаконченный перенос (ответ потерялся) — довести */
async function wnSync(){
  if (!TOKEN || !me) return;
  for (const x of wnPend()){
    const d = await api({wn: "add", id: x.id, n: x.n, u: x.u, q: x.q, why: x.why, rn: x.rn});
    if (d.ok && Array.isArray(d.items)){ wsave(WNQ, wnPend().filter(y => y.id !== x.id)); wnItems = d.items; wnState = "ok"; continue; }
    if (d.ok){ wnState = "old"; wnDraw(); return; }
    if (d.error === "bad"){ wsave(WNQ, wnPend().filter(y => y.id !== x.id)); continue; }
    break;
  }
  const t = wjson(WNT, null);
  if (t && t.rn === me.name && !wnBusy && !woBusy) await wnTake(t);
  const d = await api({wn: "list"});
  wnState = d.ok ? (Array.isArray(d.items) ? "ok" : "old") : d.error === "net" ? "net" : "err";
  if (d.ok && Array.isArray(d.items)) wnItems = d.items;
  wnDraw();
}
function wnInit(){
  wnDraw(); wnSync();
  if (!wnTimer) wnTimer = setInterval(() => { if (!$("secWo").hidden && !document.hidden && !wnBusy) wnSync(); }, 30e3);
}

$("wnForm").addEventListener("submit", e => {
  e.preventDefault();
  const warn = m => { $("wnWarn").textContent = m; };
  const n = $("wnN").value.replace(/\s+/g, " ").trim(), c = rcalc($("wnQ").value), u = $("wnU").value, why = $("wnWhy").value.replace(/\s+/g, " ").trim();
  if (!n) return warn("Впишите наименование.");
  if (!isFinite(c.v) || c.v <= 0) return warn("«" + n + "»: укажите количество.");
  if (!u) return warn("«" + n + "»: выберите единицу измерения.");
  warn("");
  wsave(WNQ, wnPend().concat([{id: rid(), n, u, q: c.v, why, rn: me ? me.name : ""}]));
  $("wnN").value = ""; $("wnQ").value = ""; $("wnU").value = ""; $("wnWhy").value = "";
  buzz(14); wnDraw(); wnSync();
});
$("wnN").addEventListener("change", () => { const u = woUnitOf[$("wnN").value.trim()]; if (u && !$("wnU").value) $("wnU").value = u; });

/* забрать строки из заметки (по op — повтор безопасен) и вписать в акт списания */
async function wnTake(t){
  if (woBusy) return {error: "busy"};                          // идёт создание файла — форму не трогаем
  const d = await api({wn: "take", ids: t.ids.join(","), op: t.op, rn: t.rn});
  if (!d.ok || !Array.isArray(d.took)) return d;
  wsave(WNT, null);
  if (wkind !== "wo") woSetKind("wo");
  if (woLast) $("woNew").click();                              // на экране готовый акт — начинаем новый
  [...document.querySelectorAll("#woRows .worow")].forEach(li => {   // пустые строки формы — убрать
    if (![".won", ".woq", ".woy"].some(s => li.querySelector(s).value.trim())) li.remove();
  });
  $("woRows").insertAdjacentHTML("beforeend", d.took.map(x => woRow({n: x.n, u: x.u, q: wq(x.q), why: x.why})).join("") || "");
  if (!$("woRows").children.length) $("woRows").innerHTML = woRow({});
  woCap(); woDraftSave();
  wnItems = d.items; wnDraw();
  $("woWarn").textContent = d.took.length ? "Из заметки в акт: " + d.took.length + " поз. Проверьте, распишитесь и создайте файл." : "";
  return d;
}
$("wnMove").addEventListener("click", async () => {
  if (wnBusy || woBusy || !wnItems.length || !me) return;
  if (wkind !== "wo") woSetKind("wo");
  if (woLast) $("woNew").click();
  const used = woRowsData().filter(r => r.n || r.q || r.why).length, free = WO_MAX - used;
  if (free <= 0) return void ($("wnWarn").textContent = "В акте уже " + WO_MAX + " позиций — создайте его, потом перенесите остальное.");
  const pick = wnItems.slice(0, free);
  if (!confirm("Перенести в акт списания " + pick.length + " поз.?" + (pick.length < wnItems.length ? " Остальные " + (wnItems.length - pick.length) + " останутся в заметке — в акте не больше " + WO_MAX + "." : "") +
    "\nИз заметки они исчезнут у всех.")) return;
  const t = {op: rid(), ids: pick.map(x => x.id), rn: me.name};
  wsave(WNT, t);                                               // ответ потеряется — довезём при следующей сверке
  wnBusy = true; wnDraw(); $("wnWarn").textContent = "";
  try {
    const d = await wnTake(t);
    if (!d.ok || !Array.isArray(d.took)) $("wnWarn").textContent = d.error === "net" ? "Нет связи — перенесём, как только появится связь." :
      d.ok ? "Заметка заработает после обновления Apps Script." : "Не получилось перенести — попробуйте ещё раз.";
    else if (!d.took.length) $("wnWarn").textContent = "Эти позиции уже перенёс в акт другой бармен.";
    else $("woForm").scrollIntoView({behavior: "smooth", block: "start"});
  } finally { wnBusy = false; wnDraw(); }
});
