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
/* строка из заметки (r.nid) закреплена: изменить нельзя, можно только вернуть в заметку (↩) */
const woWhen = ms => { const d = new Date((+ms || 0) + 5 * 3600e3).toISOString(); return d.slice(8, 10) + "." + d.slice(5, 7) + " в " + d.slice(11, 16); };
function woRow(r){
  r = r || {};
  const lock = !!r.nid, ro = lock ? ' readonly tabindex="-1" aria-readonly="true"' : "";
  return '<li class="worow' + (wkind === "pr" ? " pr" : "") + (lock ? " wolock" : "") + '"' +
      (lock ? ' data-nid="' + esc(r.nid) + '" data-until="' + (+r.until || 0) + '"' : "") + '>' +
    (lock ? '<p class="wolockcap">Из заметки — не меняется. Если акт не создадут, вернётся в заметку ' + woWhen(r.until) + '.</p>' : "") +
    '<input class="won" type="text"' + (lock ? ro : ' list="woNames"') + ' maxlength="120" placeholder="Наименование" aria-label="Наименование" value="' + esc(r.n || "") + '">' +
    '<div class="worow2">' +
      '<input class="woq" type="text" inputmode="decimal" maxlength="16"' + ro + ' placeholder="Кол-во" aria-label="Количество" value="' + esc(r.q || "") + '">' +
      '<select class="wou"' + (lock ? " disabled" : "") + ' aria-label="Единица измерения"><option value="">ед.</option>' +
        WO_UNITS.map(u => '<option' + (u === r.u ? " selected" : "") + '>' + u + '</option>').join("") + '</select>' +
      (wkind === "pr"
        ? '<span class="woy wofix" aria-label="Причина списания">' + WO_PR + '</span>'
        : '<input class="woy" type="text"' + (lock ? ro : ' list="woWhy"') + ' maxlength="120" placeholder="Причина" aria-label="Причина списания" value="' + esc(r.why || "") + '">') +
      (lock ? '<button type="button" class="ghost wox woback" aria-label="Вернуть в заметку" title="Вернуть в заметку">↩</button>'
            : '<button type="button" class="ghost wox" aria-label="Убрать позицию">×</button>') +
    '</div></li>';
}
const woRowsData = () => [...document.querySelectorAll("#woRows .worow")].map(li => Object.assign({
  n: li.querySelector(".won").value.replace(/\s+/g, " ").trim(), q: li.querySelector(".woq").value.trim(),
  u: li.querySelector(".wou").value, why: wkind === "pr" ? WO_PR : li.querySelector(".woy").value.replace(/\s+/g, " ").trim()},
  li.dataset.nid ? {nid: li.dataset.nid, until: +li.dataset.until || 0} : {}));
function woDraftSave(){
  if (!me) return;
  wsave(wdraft(), {date: $("woDate").value, no: $("woNo").value, rows: woRowsData(), paste: $("woPasteT").value, pasteWhy: $("woPasteWhy").value});
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
  $("woPasteT").value = d && d.paste || ""; $("woPasteWhy").value = d && d.pasteWhy || "";
  $("woPaste").hidden = !$("woPasteT").value.trim();
  document.querySelectorAll("#wokind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === wkind)));
  $("woTitle").textContent = WOK[wkind].title;
  woCap();
}
function woCap(){
  if (wkind === "wo") wnPrune(null);
  const full = $("woRows").children.length >= WO_MAX;
  $("woAdd").disabled = full; $("woMax").hidden = !full;
  if (!$("woPaste").hidden) woPasteDraw();                     // сколько ещё войдёт и какая причина — по текущему акту
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
  if (woReady){ woSigReset(); woLoad(); woDoneUi(); $("woWarn").textContent = ""; }   // woLoad: поле вставки — из черновика этого бармена
  wnItems = []; wnState = "load"; if (woReady) wnDraw();
}

function woSetKind(k){
  if (woBusy || k === wkind) return;
  if (!woLast) woDraftSave();                                  // форма на экране — запомнить; акт уже создан — черновик пуст
  wkind = k;
  try { localStorage.setItem("mechty-wo-kind", wkind); } catch (e2) {}
  woLast = woLastOf[wkind] || null;
  $("woWarn").textContent = ""; woLoad();                       // woLoad может сообщить, что строки заметки вернулись по сроку
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
  if (li.dataset.nid) return void wnBack([li.dataset.nid]);     // из заметки — только вернуть
  if ($("woRows").children.length > 1) li.remove(); else li.outerHTML = woRow({});
  woCap(); woDraftSave();
});
$("woRows").addEventListener("change", e => {
  const n = e.target.closest(".won");
  if (n){ const u = woUnitOf[n.value.trim()], sel = n.closest(".worow").querySelector(".wou"); if (u && !sel.value) sel.value = u; }
});
$("woForm").addEventListener("input", woDraftSave);
$("woForm").addEventListener("change", woDraftSave);

/* ── вставка списком ──
   Позиция на строке: «Водка Беленькая — 170 мл», «Трипл сек 30 + 30 мл», «40 мл окхарт — Порча», «Ред Булл 250мл 2 шт».
   Количество — число с единицей перед первой причиной (« — », «(», «;», «, …»); если количество стоит первым — после него
   наименование. Слагаемые через «+» складываются (л и мл, кг и гр — с пересчётом). «… 250мл 2» — 2 штуки, размер — в названии;
   «20 мл х2» — 40 мл. Число без единицы — только в конце строки («Негрони 180»), единицу тогда выберет бармен («ед.?»).
   Строки из таблицы (через Tab) — по столбцам. Заголовки («Алко», «Итого») пропускаются. */
const WO_U = "миллилитр[а-яё]*|литр[а-яё]*|килограмм[а-яё]*|кило|кгр|грамм[а-яё]*|грам[а-яё]*|штук[а-яё]*|бутыл[а-яё]*|бут|банк[а-яё]*|мл|ml|кг|kg|гр|шт|pcs|лт|л|l|г|g";
function woUnitNorm(u){
  u = String(u || "").toLowerCase().replace(/\.$/, "");
  if (/^(мл|миллилитр|ml$)/.test(u)) return "мл";
  if (/^(кг|кгр|кило|kg$)/.test(u)) return "кг";
  if (/^(гр|грам|г$|g$)/.test(u)) return "гр";
  if (/^(шт|штук|бут|банк|pcs$)/.test(u)) return "шт";
  if (/^(лт$|л$|литр|l$)/.test(u)) return "л";
  return "";
}
const wr3 = x => Math.round(x * 1000) / 1000;
const woTidy = t => String(t).replace(/^\s*\d+[.)]\s+/, "").replace(/^[\s\-–—•*·:;,.(]+|[\s\-–—•*·:;,(]+$/g, "")
  .replace(/^(.*)\)$/, (a, b) => b.includes("(") ? a : b).trim();
/* сумма «1 л + 200 мл» → 1200 мл; у слагаемого без единицы — единица соседнего; несовместимые единицы — ошибка */
function woSum(m){
  const terms = m[1].split("+").map(t => { const x = t.match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*(" + WO_U + ")?", "i"));
    return {v: parseFloat(x[1].replace(",", ".")), u: woUnitNorm(x[2])}; });
  const k = terms.length - 1;
  if (!terms[k].u) terms[k].u = woUnitNorm(m[2]);
  for (let i = k - 1; i >= 0; i--) if (!terms[i].u) terms[i].u = terms[i + 1].u;
  for (let i = 1; i <= k; i++) if (!terms[i].u) terms[i].u = terms[i - 1].u;
  const us = [...new Set(terms.map(t => t.u))];
  if (us.length === 1) return {q: wr3(terms.reduce((a, t) => a + t.v, 0)), u: us[0]};
  const base = {"л": ["мл", 1000], "мл": ["мл", 1], "кг": ["гр", 1000], "гр": ["гр", 1]};
  const bs = [...new Set(terms.map(t => base[t.u] ? base[t.u][0] : "?"))];
  if (bs.length !== 1 || bs[0] === "?") return {bad: true};
  return {q: wr3(terms.reduce((a, t) => a + t.v * base[t.u][1], 0)), u: bs[0]};
}
/* строка из таблицы: столбцы через Tab — наименование, ед., кол-во, причина в любом порядке; дата, ссылка, id, № — мимо */
function woParseCells(line, raw){
  const cells = line.split("\t").map(c => c.replace(/\s+/g, " ").trim()).filter(Boolean);
  const isNum = c => /^\d+(?:[.,]\d+)?$/.test(c);
  let q = null, u = "", text = [];
  cells.forEach((c, i) => {
    if (/^\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}(?: \d{1,2}:\d{2})?$/.test(c) || /^https?:/i.test(c) || (/^[\w-]{12,}$/.test(c) && /\d/.test(c) && /[a-z]/i.test(c))) return;
    if (new RegExp("^(?:" + WO_U + ")\\.?$", "i").test(c)){ if (!u) u = woUnitNorm(c); return; }
    if (isNum(c)){
      if (q === null && !(i === 0 && /^\d+$/.test(c) && cells.slice(1).some(isNum))) q = parseFloat(c.replace(",", "."));
      return;
    }
    const qu = c.match(new RegExp("^(\\d+(?:[.,]\\d+)?)\\s*(" + WO_U + ")\\.?$", "i"));
    if (qu && q === null){ q = parseFloat(qu[1].replace(",", ".")); u = u || woUnitNorm(qu[2]); return; }
    text.push(c);
  });
  const n = woTidy(text[0] || "");
  if (!n || !(q > 0)) return {skip: raw.trim()};
  return {n: n.charAt(0).toUpperCase() + n.slice(1, 120), q: wr3(q), u, why: woTidy(text[1] || "").slice(0, 120)};
}
function woParseLine(raw){
  let s = String(raw).replace(/[✅✔☑✓️]/g, " ").replace(/\*\*|__/g, "")
    .replace(/(\d)[   ](?=\d{3}(?!\d))/g, "$1").replace(/(\d) (?=000(?!\d))/g, "$1")   // «1 500» из таблицы, «1 000 мл»
    .replace(/[   ]/g, " ").replace(/½/g, " 0.5 ").replace(/¼/g, " 0.25 ").replace(/¾/g, " 0.75 ")
    .replace(/(\d+)\s*\/\s*(\d+)/g, (a, x, y) => +y ? String(wr3(x / y)) : a);                        // «1/2 шт» → 0.5 шт
  if (s.includes("\t")) return woParseCells(s, String(raw));
  const line = s.replace(/\s+/g, " ").trim();
  if (!line) return null;
  const skip = {skip: line};
  /* число или сумма «20 + 30», единица — после суммы или у слагаемых; не часть слова или другого числа */
  const re = new RegExp("(\\d+(?:[.,]\\d+)?(?:\\s*(?:" + WO_U + ")?\\.?\\s*\\+\\s*\\d+(?:[.,]\\d+)?)*)\\s*(" + WO_U + ")?(?![а-яёa-z\\d])\\.?", "gi");
  const ms = [...line.matchAll(re)].filter(m => !m.index || !/[а-яёa-z\d.,\/]/i.test(line[m.index - 1]));
  if (!ms.length) return skip;
  const hasU = m => !!(m[2] || new RegExp("(?:" + WO_U + ")(?![а-яёa-z])", "i").test(m[1]));
  const fu = ms.find(hasU);
  let seg = line, reason = "", qm;
  if (fu){
    const end = fu.index + fu[0].length, rest = line.slice(end), k = rest.search(/\s[—–-]\s|\(|;|,\s+(?=[а-яёa-z])/i);
    if (k >= 0){ seg = line.slice(0, end + k); reason = rest.slice(k); }
    const inSeg = ms.filter(m => m.index + m[0].length <= seg.length && hasU(m));
    qm = !woTidy(line.slice(0, fu.index)) ? fu : inSeg[inSeg.length - 1];      // количество первым — «40 мл окхарт»
  } else {
    qm = ms[ms.length - 1];
    if (woTidy(line.slice(qm.index + qm[0].length))) return skip;               // «Алко — 16 позиций»: число посреди текста — не количество
  }
  const sum = woSum(qm);
  if (sum.bad) return skip;
  let q = sum.q, u = sum.u, why = woTidy(reason), n, trail = woTidy(seg.slice(qm.index + qm[0].length));
  if (!woTidy(line.slice(0, qm.index))){ n = trail; trail = ""; }
  else {
    n = woTidy(seg.slice(0, qm.index));
    const tail = trail || why, xm = fu && tail.match(/^(?:([хx×*])\s*)?(\d+(?:[.,]\d+)?)$/i);
    if (xm){
      const N = parseFloat(xm[2].replace(",", "."));
      if (xm[1]) q = wr3(q * N);                                                // «20 мл х2» → 40 мл
      else { n = woTidy(seg.slice(0, qm.index + qm[0].length)); q = N; u = ""; } // «Ред Булл 250мл 2» → 2, размер — в названии
      if (trail) trail = ""; else why = "";
    }
    if (trail) why = why ? trail + " — " + why : trail;                         // «Лимоны 2 кг испорчены»
  }
  if (!n || !(q > 0) || /^(итого|всего)(?![а-яё])/i.test(n)) return skip;
  return {n: n.charAt(0).toUpperCase() + n.slice(1, 120), q, u, why: why.slice(0, 120)};
}
function woPasteRows(){
  const rows = [], skip = [], fill = $("woPasteWhy").value.replace(/\s+/g, " ").trim();
  for (const l of $("woPasteT").value.split(/\r?\n/)){
    const r = woParseLine(l);
    if (!r) continue;
    if (r.skip){ skip.push(r.skip); continue; }
    r.why = wkind === "pr" ? WO_PR : (r.why || fill);
    r.src = l;
    rows.push(r);
  }
  return {rows, skip};
}
function woPasteDraw(){
  const {rows, skip} = woPasteRows();
  $("woPasteWhy").hidden = wkind === "pr";
  $("woPastePrev").innerHTML = rows.map(r => '<li><span>' + esc(r.n) + '</span><b>' + esc(wq(r.q)) + " " + (r.u ? esc(r.u) : '<i class="wopasteq">ед.?</i>') + '</b>' +
      '<em>' + (r.why ? esc(r.why) : '<i class="wopasteq">причина?</i>') + '</em></li>').join("") +
    skip.map(t => '<li class="wopasteskip"><span>пропущено: ' + esc(t) + '</span></li>').join("");
  const free = Math.max(0, WO_MAX - woRowsData().filter(r => r.n || r.q || (wkind === "wo" && r.why)).length);
  $("woPasteGo").disabled = !rows.length || !free;
  $("woPasteGo").textContent = !rows.length ? "Добавить в акт" : !free ? "В акте уже " + WO_MAX + " позиций" :
    "Добавить в акт: " + Math.min(rows.length, free) + " поз." + (rows.length > free ? " (ещё " + (rows.length - free) + " не войдут)" : "");
}
$("woPasteOpen").addEventListener("click", () => {
  $("woPaste").hidden = !$("woPaste").hidden;
  if (!$("woPaste").hidden){ woPasteDraw(); $("woPasteT").focus(); }
});
$("woPasteX").addEventListener("click", () => { $("woPaste").hidden = true; });
$("woPasteT").addEventListener("input", woPasteDraw);
$("woPasteWhy").addEventListener("input", woPasteDraw);
$("woPasteWhy").addEventListener("keydown", e => {                // Enter здесь — не «Создать файл», а «Добавить в акт»
  if (e.key === "Enter"){ e.preventDefault(); if (!$("woPasteGo").disabled) $("woPasteGo").click(); }
});
$("woPasteGo").addEventListener("click", () => {
  const {rows, skip} = woPasteRows();
  [...document.querySelectorAll("#woRows .worow")].forEach(li => {   // пустые строки формы — убрать
    if (![".won", ".woq", ".woy"].some(s => { const x = li.querySelector(s); return x && x.value && x.value.trim(); })) li.remove();
  });
  const free = Math.max(0, WO_MAX - $("woRows").children.length), put = rows.slice(0, free), rest = rows.slice(free);
  $("woRows").insertAdjacentHTML("beforeend", put.map(r => woRow({n: r.n, q: wq(r.q), u: r.u, why: r.why})).join(""));
  if (!$("woRows").children.length) $("woRows").innerHTML = woRow({});
  woCap(); woDraftSave(); buzz(14);
  const bad = skip.filter(t => /\d/.test(t));                         // не понятые строки с числами — тоже остаются
  $("woPasteT").value = rest.map(r => r.src).concat(bad).join("\n");  // что не вошло — остаётся в поле
  const miss = put.filter(r => !r.u || !r.why).length;
  $("woWarn").textContent = "Добавлено: " + put.length + " поз." + (rest.length ? " Не вошло " + rest.length + " — в акте не больше " + WO_MAX + ": они остались в поле, вставите в следующий акт." : "") +
    (bad.length ? " Не понял " + bad.length + " строк — они остались в поле, поправьте и добавьте." : "") +
    (miss ? " Проверьте единицу и причину у " + miss + " поз." : "");
  if (!rest.length && !bad.length) $("woPaste").hidden = true;
  woDraftSave(); woPasteDraw();
});

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
    const nids = rows.map(r => r.nid).filter(Boolean);
    if (nids.length) wsave(WNA, wnDone().concat(nids).slice(-300));
    /* акт готов — черновик очищаем: после перезагрузки не создать тот же акт второй раз */
    if (me) wsave(wdraft(), {date: wtoday(), no: "", rows: [], paste: $("woPasteT").value, pasteWhy: $("woPasteWhy").value});
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
  if (me) wsave(wdraft(), {date: wtoday(), no: "", rows: [], paste: $("woPasteT").value, pasteWhy: $("woPasteWhy").value});
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
   Общий список «что списать», виден всем барменам (лист «Заметка» в «Журнале списаний»). Строку нельзя удалить.
   «Перенести в акт списания» закрепляет строки за барменом на 24 часа: в заметке их больше не видно, в акте их нельзя
   изменить — только вернуть (↩). Окончательно строки уходят, когда акт с ними создан и сохранён. Не создал акт за 24 часа —
   строки сами возвращаются в заметку (и уходят из акта). Закреплённые за мной, но не попавшие в акт (потерялся ответ) —
   кнопка «Вставить в акт»: сама по себе сверка форму не трогает, кроме возврата строк по сроку или отмене. */
const WNQ = "mechty-wn-q", WNA = "mechty-wn-done";
let wnItems = [], wnMineList = null, wnState = "load", wnBusy = false, wnTimer = 0, wnSyncP = null, wnSeq = 0;
const wnPend = () => wjson(WNQ, []);
const wnDone = () => wjson(WNA, []);                         // строки из заметки, уже вошедшие в созданные здесь акты
/* строки из заметки в акте списания этого бармена — на экране или в черновике */
function woNids(){
  if (wkind === "wo" && !woLast) return new Set([...document.querySelectorAll("#woRows .worow[data-nid]")].map(li => li.dataset.nid));
  const d = me ? wjson(WD + ":" + me.name, null) : null;
  return new Set(d && Array.isArray(d.rows) ? d.rows.map(r => r.nid).filter(Boolean) : []);
}
/* закреплены за мной, но не в акте — ждут «Вставить в акт» */
const wnWaiting = () => { if (!wnMineList) return []; const inForm = woNids(), done = new Set(wnDone()); return wnMineList.filter(x => !inForm.has(x.id) && !done.has(x.id)); };
/* из акта убрать строки заметки, которые больше не мои: прошло 24 часа, отменены или списаны другим актом.
   mine — что таблица считает моим (после сверки), null — без связи: только срок */
function wnPrune(mine){
  const now = Date.now(), keep = r => !r.nid || (r.until > now && (!mine || mine.has(r.nid)));
  let gone = 0;
  if (wkind === "wo" && !woLast){
    [...document.querySelectorAll("#woRows .worow[data-nid]")].forEach(li => { if (!keep({nid: li.dataset.nid, until: +li.dataset.until})){ li.remove(); gone++; } });
    if (gone){ if (!$("woRows").children.length) $("woRows").innerHTML = woRow({}); woDraftSave(); woCap(); }
  } else if (me){
    const key = WD + ":" + me.name, d = wjson(key, null);
    if (d && Array.isArray(d.rows)){ const rows = d.rows.filter(keep); gone = d.rows.length - rows.length; if (gone){ d.rows = rows; wsave(key, d); } }
  }
  if (gone) $("woWarn").textContent = "Вернулось в заметку из акта: " + gone + " поз. — прошло 24 часа или перенос отменили.";
}

function wnDraw(){
  const pend = wnPend(), all = wnItems.concat(pend.filter(x => !wnItems.some(y => y.id === x.id)).map(x => ({...x, pend: true})));
  $("wnCount").textContent = all.length ? all.length + " поз." : "";
  $("wnList").innerHTML = all.length
    ? all.map(x => '<li' + (x.pend ? ' class="pend"' : "") + '><div class="wnrow"><span>' + esc(x.n) + '</span><b>' + esc(wq(x.q)) + " " + esc(x.u || "") + '</b></div>' +
        '<div class="wnmeta">' + (x.why ? esc(x.why) + " · " : "") + (x.pend ? "ждёт отправки" : esc(x.who || "") + (x.at ? ", " + esc(x.at) : "")) + '</div></li>').join("")
    : '<li class="wnempty">' + (wnState === "load" ? "Загружаем…" : wnState === "old" ? "Заметка заработает после обновления Apps Script." :
        wnState === "net" ? "Нет связи с таблицей." : "Пусто. Запишите ниже, что нужно списать, — увидят все.") + '</li>';
  const n = wnItems.length, wait = wnWaiting();
  $("wnMove").disabled = !n || wnBusy;
  $("wnMove").textContent = wnBusy ? "Подождите…" : "Перенести в акт списания" + (n ? " (" + n + ")" : "");
  $("wnIn").hidden = !wait.length;
  $("wnInT").textContent = "Перенесено вам из заметки: " + wait.length + " поз. — ещё не в акте.";
}

/* записанное без связи — в таблицу; затем свежий список. Одна сверка за раз; ответ, обогнанный переносом, — не в счёт */
function wnSync(){ return wnSyncP || (wnSyncP = wnSyncRun().finally(() => { wnSyncP = null; wnDraw(); })); }
async function wnSyncRun(){
  if (!TOKEN || !me) return;
  for (const x of wnPend()){
    const d = await api({wn: "add", id: x.id, n: x.n, u: x.u, q: x.q, why: x.why, rn: x.rn});
    if (d.ok && Array.isArray(d.items)){ wsave(WNQ, wnPend().filter(y => y.id !== x.id)); wnItems = d.items; wnState = "ok"; continue; }
    if (d.ok){ wnState = "old"; return; }
    if (d.error === "bad"){ wsave(WNQ, wnPend().filter(y => y.id !== x.id)); continue; }
    break;
  }
  const seq = wnSeq, d = await api({wn: "list", rn: me.name});
  if (seq !== wnSeq) return;
  wnState = d.ok ? (Array.isArray(d.items) ? "ok" : "old") : d.error === "net" ? "net" : "err";
  if (d.ok && Array.isArray(d.items) && Array.isArray(d.mine)){ wnItems = d.items; wnMineList = d.mine; wnPrune(new Set(d.mine.map(x => x.id))); }
  else wnPrune(null);
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
  if (!why) return warn("«" + n + "»: укажите причину — строку потом не исправить.");
  warn("");
  wsave(WNQ, wnPend().concat([{id: rid(), n, u, q: c.v, why, rn: me ? me.name : ""}]));
  $("wnN").value = ""; $("wnQ").value = ""; $("wnU").value = ""; $("wnWhy").value = "";
  buzz(14); wnDraw(); wnSync();
});
$("wnN").addEventListener("change", () => { const u = woUnitOf[$("wnN").value.trim()]; if (u && !$("wnU").value) $("wnU").value = u; });

/* сколько строк уже будет в акте списания, куда пойдут перенесённые */
function wnUsed(){
  if (wkind === "wo" && !woLast) return woRowsData().filter(r => r.n || r.q || r.why).length;
  if (woLastOf.wo) return 0;                                   // готовый акт закроется — начнётся новый
  const d = wjson(WD + ":" + (me ? me.name : ""), null);
  return d && Array.isArray(d.rows) ? d.rows.filter(r => r.n || r.q || r.why).length : 0;
}
/* вставить закреплённые за мной строки в акт списания (закреплёнными) — только по нажатию бармена */
function wnApply(list){
  if (!list.length) return;
  if (woBusy){ $("wnWarn").textContent = "Идёт создание файла — нажмите «Вставить в акт», когда он будет готов."; return; }
  if (wkind !== "wo") woSetKind("wo");
  if (woLast) $("woNew").click();                              // на экране готовый акт (он уже сохранён) — начинаем новый
  [...document.querySelectorAll("#woRows .worow")].forEach(li => {   // пустые строки формы — убрать
    if (!li.dataset.nid && ![".won", ".woq", ".woy"].some(s => { const x = li.querySelector(s); return x && x.value && x.value.trim(); })) li.remove();
  });
  const have = woNids(), add = list.filter(x => !have.has(x.id));
  const free = Math.max(0, WO_MAX - $("woRows").children.length), put = add.slice(0, free), rest = add.length - put.length;
  $("woRows").insertAdjacentHTML("beforeend", put.map(x => woRow({n: x.n, u: x.u, q: wq(x.q), why: x.why, nid: x.id, until: x.until})).join(""));
  if (!$("woRows").children.length) $("woRows").innerHTML = woRow({});
  woDraftSave(); woCap();
  $("woWarn").textContent = (put.length ? "Из заметки в акт: " + put.length + " поз. — изменить их нельзя, можно вернуть (↩). Проверьте, распишитесь и создайте файл." : "") +
    (rest ? " Не поместилось " + rest + " — в акте не больше " + WO_MAX + ": создайте этот акт, потом нажмите «Вставить в акт»." : "");
  $("wnWarn").textContent = "";
  wnDraw();
  if (put.length) $("woForm").scrollIntoView({behavior: "smooth", block: "start"});
}
$("wnInGo").addEventListener("click", () => {
  if (woLast && !confirm("Начать новый акт списания? Готовый акт уже сохранён — его можно открыть в «Последних актах».")) return;
  wnApply(wnWaiting());
});
$("wnMove").addEventListener("click", async () => {
  if (wnBusy || woBusy || !wnItems.length || !me) return;
  const free = WO_MAX - wnUsed() - wnWaiting().length;
  if (free <= 0) return void ($("wnWarn").textContent = "В акте уже " + WO_MAX + " позиций — создайте его, потом перенесите остальное.");
  const pick = wnItems.slice(0, free);
  if (!confirm("Перенести в акт списания " + pick.length + " поз.?" + (pick.length < wnItems.length ? " Остальные " + (wnItems.length - pick.length) + " останутся в заметке — в акте не больше " + WO_MAX + "." : "") +
    (woLastOf.wo ? " Готовый акт закроется (он уже сохранён)." : "") +
    "\nВ акте их нельзя будет изменить — только вернуть в заметку. Если акт не создадите за 24 часа, они вернутся в заметку сами.")) return;
  wnBusy = true; wnSeq++; wnDraw(); $("wnWarn").textContent = "";
  try {
    const d = await api({wn: "take", ids: pick.map(x => x.id).join(","), rn: me.name});
    if (!d.ok || !Array.isArray(d.took)){
      $("wnWarn").textContent = d.error === "net" ? "Нет связи — нажмите ещё раз, когда появится связь. Ничего не потеряется." :
        d.ok ? "Заметка заработает после обновления Apps Script." : "Не получилось перенести — попробуйте ещё раз.";
      return;
    }
    wnItems = d.items; wnMineList = d.mine;
    if (!d.took.length) $("wnWarn").textContent = "Эти позиции уже перенёс в акт другой бармен.";
    wnBusy = false; wnApply(d.took);
  } finally { wnBusy = false; wnDraw(); }
});
/* ↩ в акте: строка возвращается в заметку (нужна связь — иначе её не увидят другие) */
async function wnBack(ids){
  if (!me || wnBusy || woBusy) return;
  wnBusy = true; wnSeq++; wnDraw();
  try {
    const d = await api({wn: "back", ids: ids.join(","), rn: me.name});
    if (!d.ok || !Array.isArray(d.items)){
      $("woWarn").textContent = d.error === "net" ? "Нет связи — вернуть в заметку можно, когда появится связь." : "Не получилось вернуть — попробуйте ещё раз.";
      return;
    }
    wnItems = d.items; wnMineList = d.mine;
    [...document.querySelectorAll("#woRows .worow[data-nid]")].forEach(li => { if (ids.indexOf(li.dataset.nid) >= 0) li.remove(); });
    if (!$("woRows").children.length) $("woRows").innerHTML = woRow({});
    woDraftSave(); woCap();
    $("woWarn").textContent = "Вернул в заметку: " + ids.length + " поз.";
  } finally { wnBusy = false; wnDraw(); }
}
