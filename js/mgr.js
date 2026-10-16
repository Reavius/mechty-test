/* Бар-менеджер: вход по отдельному паролю и сводка списаний и проработок за период.
   Пароль проверяет Apps Script (POST, в адрес не попадает) и выдаёт ключ на 30 дней — он хранится на этом телефоне
   за этим барменом. Выход из «Бартендерам» забывает и ключ менеджера. Строки журналов отдаёт таблица, сводку считает сайт. */
const MGR = "mechty-mgr", MGRQ = "mechty-mgr-q";
const MGR_UNITS = {"л": ["л", 1], "мл": ["л", .001], "кг": ["кг", 1], "гр": ["кг", .001], "г": ["кг", .001], "шт": ["шт", 1]};
const MGR_KIND = {wo: "списание", pr: "проработка"};
let mgrData = null, mgrBusy = false, mgrKindSel = "all";

const mgrj = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const mgrs = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const mgrKey = () => { const k = mgrj(MGR, null); return k && me && k.e === me.email && k.mk && k.until > Date.now() ? k.mk : ""; };
const mgrToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);     // по Астане
const mgrShift = (iso, days) => new Date(Date.parse(iso + "T00:00:00Z") + days * 864e5).toISOString().slice(0, 10);
const mgrRu = iso => iso.split("-").reverse().join(".");
const mgrNum = x => String(Math.round(x * 1000) / 1000).replace(".", ",");
const mgrPl = (n, a, b, c) => n + " " + (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);

function mgrRange(r){
  const t = mgrToday(), m1 = t.slice(0, 8) + "01";
  if (r === "rev") return perData && perData.from ? [perData.from.iso, perData.to.iso] : [mgrShift(t, -6), t];   // период ревизии — по датам актов
  if (r === "w") return [mgrShift(t, -6), t];
  if (r === "d30") return [mgrShift(t, -29), t];
  if (r === "pm"){ const end = mgrShift(m1, -1); return [end.slice(0, 8) + "01", end]; }
  return [m1, t];
}

/* ── вход ── */
function mgrInit(){
  const k = mgrKey();
  $("mgrIn").hidden = !!k;
  $("mgrBox").hidden = !k;
  if (!k) return;
  if (!$("mgrFrom").value){
    /* быстрый период («Этот месяц») пересчитывается от сегодня — завтра в нём и сегодняшние акты; даты руками — как были */
    const q = mgrj(MGRQ, null), r = q && q.r ? mgrRange(q.r) : q && q.from && q.to ? [q.from, q.to] : mgrRange("rev");
    mgrRsel = q && q.r ? q.r : q && q.from ? "" : "rev";
    $("mgrFrom").value = r[0]; $("mgrTo").value = r[1];
    if (q && q.k) mgrKindSel = q.k;
  }
  mgrKindDraw();
  mgrTabDraw();
  mgrTabLoad();                                               // каждый раз при входе в раздел — свежие данные
}
/* ключ истёк или пароль сменили — снова форма входа */
function mgrExpired(){
  mgrs(MGR, null); mgrData = null; refRows = null; ordData = null; incData = null; useData = null;
  if (inc){ inc = null; $("incImp").hidden = true; $("incImp").innerHTML = ""; $("incWarn").textContent = "Загрузите файл накладных ещё раз — вход менеджера обновился."; }
  $("mgrMsg").textContent = "Вход менеджера истёк или пароль сменили — войдите снова.";
  mgrInit();
}
$("mgrIn").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("mgrPw").value;
  if (!pw || mgrBusy || !TOKEN || !me) return;
  mgrBusy = true; $("mgrGo").disabled = true; $("mgrMsg").textContent = "Проверяем…";
  let d = null;
  try {
    const r = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({token: TOKEN, mgr: "login", pw})});
    d = await r.json();
  } catch (err) { d = {error: "net"}; }
  mgrBusy = false; $("mgrGo").disabled = false;
  if (d && d.ok && d.mk){
    mgrs(MGR, {mk: d.mk, until: d.until || Date.now() + 30 * 864e5, e: me.email});
    $("mgrPw").value = ""; $("mgrMsg").textContent = "";
    buzz(14); mgrData = null; mgrInit();
    return;
  }
  const er = d && d.error;
  $("mgrMsg").textContent = er === "pw" ? "Неверный пароль." :
    er === "wait" ? "Пять неверных паролей подряд — вход закрыт на 15 минут." :
    er === "nomgr" ? "Пароль менеджера ещё не задан: Apps Script → «Настройки проекта» → «Свойства скрипта» → MGR_PASSWORD." :
    er === "action" ? "Нужна новая версия Apps Script: «Развернуть» → «Управление развертываниями» → «Версия: новая»." :
    er === "denied" ? "Нет доступа — выйдите из «Бартендерам» и войдите снова." :
    er === "busy" ? "Таблица занята — нажмите «Войти» ещё раз." : "Нет связи — попробуйте ещё раз.";
});
/* забыть ключ на этом телефоне (и сказать таблице — без ответа) */
function mgrLeave(){
  const k = mgrj(MGR, null);
  mgrs(MGR, null); mgrData = null; refRows = null; refOpen = -1; ordData = null; inc = null; incData = null; useData = null; pubRaw = null; repData = null; sal = null;
  $("useList").innerHTML = ""; $("pubList").innerHTML = ""; $("repView").innerHTML = ""; $("salDish").innerHTML = ""; $("salZag").innerHTML = ""; $("salDays").innerHTML = ""; $("salCal").innerHTML = ""; perData = null; perI = null; perRange = null; perMail = null; salKnown = null;
  $("incImp").hidden = true; $("incImp").innerHTML = ""; $("incList").innerHTML = "";
  $("mgrOut").innerHTML = ""; $("mgrCopy").disabled = true; $("mgrRlist").innerHTML = ""; $("mgrOlist").innerHTML = "";
  if (k && k.mk && TOKEN)
    fetch(ENDPOINT, {method: "POST", keepalive: true, headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({token: TOKEN, mgr: "out", mk: k.mk})}).catch(() => {});
}
$("mgrOff").addEventListener("click", () => { mgrLeave(); $("mgrMsg").textContent = ""; mgrInit(); });

/* ── сводка ── */
async function mgrLoad(){
  const from = $("mgrFrom").value, to = $("mgrTo").value, mk = mgrKey();
  if (!mk) return mgrInit();
  if (!from || !to || from > to){ $("mgrWarn").textContent = "Проверьте даты: «с» не позже «по»."; return; }
  if (mgrRsel === "rev" && !perData && mgrGrp === "per" && useKind === "d") return;   // даты придут с периодом ревизии (perDraw)
  mgrs(MGRQ, {from, to, k: mgrKindSel, r: mgrRsel});
  document.querySelectorAll("#mgrQuick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === mgrRsel)));
  $("mgrWarn").textContent = "";
  $("mgrSub").textContent = "Загрузка…";
  $("mgrOut").innerHTML = '<ul class="olist mgrskel">' + skel(5) + '</ul>';
  const d = await api({mgr: "wo", mk, from, to});
  if ($("mgrFrom").value !== from || $("mgrTo").value !== to) return;      // пока грузили, даты сменили
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    $("mgrSub").textContent = "";
    $("mgrOut").innerHTML = "";
    $("mgrWarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="mgrRetry">Повторить</button>';
    return;
  }
  mgrData = {from, to, gone: d.gone || 0, rows: [].concat((d.wo || []).map(r => ["wo"].concat(r)), (d.pr || []).map(r => ["pr"].concat(r)))};
  mgrDraw();
  if (perData) perStepsDraw();                                            // шаг «Списания и проработки» в «Периоде»
}

/* строка: [вид, дата, №, наименование, ед., кол-во, причина, кто, файл, id] */
function mgrCalc(){
  const rows = mgrData.rows.filter(r => mgrKindSel === "all" || r[0] === mgrKindSel);
  const acts = {}, why = {}, item = {}, who = {};
  for (const r of rows){
    const [k, date, no, n, u, q, w, by, url, id] = r;
    const a = acts[k + id] || (acts[k + id] = {k, date, no, by, url, n: 0, iso: date.split(".").reverse().join("-")});
    a.n++;
    const wk = w || "без причины", x = why[wk] || (why[wk] = {w: wk, n: 0, acts: new Set()});
    x.n++; x.acts.add(k + id);
    const f = MGR_UNITS[String(u).trim().toLowerCase()] || [String(u).trim(), 1];
    const ik = String(n).trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ") + "|" + f[0];
    const it = item[ik] || (item[ik] = {n: String(n).trim(), u: f[0], q: 0, cnt: 0, why: new Set()});
    it.q += mgrN(q) * f[1]; it.cnt++; it.why.add(wk);
    const bk = String(by).trim() || "—", b = who[bk] || (who[bk] = {by: bk, acts: new Set(), n: 0, wo: 0, pr: 0});
    b.n++; if (!b.acts.has(k + id)){ b.acts.add(k + id); b[k]++; }
  }
  const byN = (a, b) => b.n - a.n || String(a.w || a.by).localeCompare(String(b.w || b.by), "ru");
  return {
    rows,
    acts: Object.values(acts).sort((a, b) => b.iso.localeCompare(a.iso) || String(b.no).localeCompare(String(a.no), "ru", {numeric: true})),
    why: Object.values(why).sort(byN),
    items: Object.values(item).sort((a, b) => b.cnt - a.cnt || a.n.localeCompare(b.n, "ru")),
    who: Object.values(who).sort(byN)
  };
}
const mgrN = v => { const x = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")); return isFinite(x) ? x : 0; };
/* количество в удобных единицах: 0,35 л → 350 мл */
const mgrQty = it => it.u === "л" && it.q < 1 && it.q > 0 ? mgrNum(it.q * 1000) + " мл" : it.u === "кг" && it.q < 1 && it.q > 0 ? mgrNum(it.q * 1000) + " гр" : mgrNum(it.q) + (it.u ? " " + it.u : "");

let mgrMore = {};
function mgrDraw(){
  if (!mgrData) return;
  const S = mgrCalc(), per = mgrRu(mgrData.from) + " — " + mgrRu(mgrData.to);
  $("mgrSub").textContent = per + (mgrData.gone ? " · удалены с Диска: " + mgrData.gone + " — не учитываются" : "");
  $("mgrCopy").disabled = !S.rows.length;
  if (!S.rows.length){
    $("mgrOut").innerHTML = '<p class="empty">За этот период ' + (mgrKindSel === "pr" ? "проработок" : mgrKindSel === "wo" ? "списаний" : "актов") + ' нет.</p>';
    return;
  }
  const lim = (k, arr, n) => mgrMore[k] ? arr : arr.slice(0, n);
  const more = (k, arr, n) => arr.length > n ? '<button type="button" class="link more" data-more="' + k + '">' + (mgrMore[k] ? "Свернуть" : "Показать все (" + arr.length + ")") + '</button>' : "";
  const card = (title, em, head, body, foot) => '<div class="result tcard mgrt"><div class="tname"><em>' + em + '</em><h3>' + title + '</h3></div>' +
    '<table><thead><tr>' + head.map(h => '<th>' + h + '</th>').join("") + '</tr></thead><tbody>' + body + '</tbody></table>' + (foot || "") + '</div>';

  $("mgrOut").innerHTML =
    '<p class="mgrsum"><b>' + mgrPl(S.acts.length, "акт", "акта", "актов") + '</b> · ' + mgrPl(S.rows.length, "строка", "строки", "строк") +
      ' · ' + mgrPl(S.items.length, "позиция", "позиции", "позиций") + ' · ' + mgrPl(S.who.length, "бармен", "бармена", "барменов") + '</p>' +
    card("По причинам", per, ["Причина", "Строк", "Актов"],
      S.why.map(x => '<tr><td class="n">' + esc(x.w) + '</td><td class="v">' + x.n + '</td><td class="v">' + x.acts.size + '</td></tr>').join("")) +
    card("Позиции", "чаще всего", ["Позиция", "Всего", "Раз"],
      lim("i", S.items, 15).map(x => '<tr><td class="n">' + esc(x.n) + '<small class="mgrwhy">' + esc([...x.why].join(", ")) + '</small></td>' +
        '<td class="v">' + esc(mgrQty(x)) + '</td><td class="v">' + x.cnt + '</td></tr>').join(""), more("i", S.items, 15)) +
    card("По барменам", "кто составил акт", ["Кто", "Актов", "Строк"],
      S.who.map(x => '<tr><td class="n">' + esc(x.by) + (mgrKindSel === "all" && x.wo && x.pr ? '<small class="mgrwhy">списаний ' + x.wo + ', проработок ' + x.pr + '</small>' : "") + '</td>' +
        '<td class="v">' + x.acts.size + '</td><td class="v">' + x.n + '</td></tr>').join("")) +
    card("Акты", "новые сверху", ["Акт", "Строк", ""],
      lim("a", S.acts, 20).map(a => '<tr><td class="n">' + esc(a.date) + (a.no ? " №" + esc(a.no) : "") + '<small class="mgrwhy">' + MGR_KIND[a.k] + ' · ' + esc(a.by || "—") + '</small></td>' +
        '<td class="v">' + a.n + '</td><td class="v">' + (/^https:\/\/(drive|docs)\.google\.com\//.test(a.url) ? '<a class="link" href="' + esc(a.url) + '" target="_blank" rel="noopener">файл</a>' : "") + '</td></tr>').join(""),
      more("a", S.acts, 20));
}

/* текст сводки — переслать владельцу */
function mgrText(){
  const S = mgrCalc(), kind = mgrKindSel === "wo" ? "Списания" : mgrKindSel === "pr" ? "Проработки" : "Списания и проработки";
  return [kind + ", " + mgrRu(mgrData.from) + " — " + mgrRu(mgrData.to),
    mgrPl(S.acts.length, "акт", "акта", "актов") + ", " + mgrPl(S.rows.length, "строка", "строки", "строк"),
    "", "По причинам:"].concat(S.why.map(x => "— " + x.w + ": " + x.n),
    ["", "Позиции:"], S.items.map(x => "— " + x.n + ": " + mgrQty(x) + " (" + mgrPl(x.cnt, "раз", "раза", "раз") + ")"),
    ["", "По барменам:"], S.who.map(x => "— " + x.by + ": " + mgrPl(x.acts.size, "акт", "акта", "актов") + ", " + mgrPl(x.n, "строка", "строки", "строк"))).join("\n");
}

function mgrKindDraw(){
  document.querySelectorAll("#mgrKind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === mgrKindSel)));
}
let mgrT = 0;
const mgrSoon = () => { clearTimeout(mgrT); mgrT = setTimeout(mgrLoad, 350); };
let mgrRsel = "rev";
$("mgrFrom").addEventListener("change", () => { mgrRsel = ""; mgrSoon(); });
$("mgrTo").addEventListener("change", () => { mgrRsel = ""; mgrSoon(); });
$("mgrQuick").addEventListener("click", e => {
  const b = e.target.closest("button[data-r]");
  if (!b) return;
  mgrRsel = b.dataset.r;
  const r = mgrRange(b.dataset.r);
  $("mgrFrom").value = r[0]; $("mgrTo").value = r[1];
  buzz(8); mgrLoad();
});
$("mgrKind").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]");
  if (!b || b.dataset.k === mgrKindSel) return;
  mgrKindSel = b.dataset.k; mgrMore = {};
  mgrKindDraw(); buzz(8);
  if (mgrData){ mgrs(MGRQ, {from: mgrData.from, to: mgrData.to, k: mgrKindSel, r: mgrRsel}); mgrDraw(); }
});
$("mgrOut").addEventListener("click", e => {
  const b = e.target.closest("button[data-more]");
  if (!b) return;
  mgrMore[b.dataset.more] = !mgrMore[b.dataset.more];
  mgrDraw();
});
$("mgrWarn").addEventListener("click", e => { if (e.target.id === "mgrRetry") mgrLoad(); });
$("mgrCopy").addEventListener("click", async () => {
  if (!mgrData) return;
  const t = mgrText();
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {}
  $("mgrCopy").textContent = ok ? "Скопировано ✓" : "Не скопировалось";
  setTimeout(() => { $("mgrCopy").textContent = "Скопировать сводку"; }, 1800);
});

/* ── разделы менеджера ──
   «Период» — расход по периоду ревизии, списания и проработки, письма (одна страница); «Закупка» — автозаявка и приход;
   «Продажи и рецепты»; «Справочник и меню» — справочник и «Гостям». Открытая вкладка раздела — mgrSubs. */
const MGR_G = {per: ["use", "sum", "inc", "rep"], buy: ["ord"], sal: ["sal"], dir: ["ref", "pub"]};
const MGR_EL = {sum: "mgrSum", use: "mgrUse", sal: "mgrSal", ord: "mgrOrd", inc: "mgrInc", pub: "mgrPub", ref: "mgrRef"};
const mgrGOf = t => Object.keys(MGR_G).find(g => MGR_G[g].includes(t)) || "per";
let mgrSubs = Object.assign({dir: "ref"}, mgrj("mechty-mgr-subs", {}), {buy: "ord"});
let mgrGrp = (() => { const v = mgrj("mechty-mgr-tab", "per"); return MGR_G[v] ? v : mgrGOf(v); })();   // раньше хранилась вкладка
const mgrOn = t => mgrGrp === "per" ? MGR_G.per.includes(t) : mgrGrp === "sal" ? t === "sal" : mgrSubs[mgrGrp] === t;
function mgrTabDraw(){
  document.querySelectorAll("#mgrTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === mgrGrp)));
  $("mgrSubDir").hidden = mgrGrp !== "dir";
  document.querySelectorAll(".mgrsub button").forEach(b => b.setAttribute("aria-pressed", String(mgrSubs[mgrGOf(b.dataset.t)] === b.dataset.t)));
  Object.keys(MGR_EL).forEach(t => { $(MGR_EL[t]).hidden = !mgrOn(t); });
  $("mgrRepD").hidden = mgrGrp !== "per";
}
function mgrTabLoad(){
  if (mgrGrp === "per"){ useLoad(); mgrLoad(); if ($("stepInc").open) incLoad(); if ($("mgrRepD").open) repLoad(); return; }
  if (mgrGrp === "sal") return salLoad();
  const t = mgrSubs[mgrGrp];
  return t === "ref" ? refLoad() : t === "pub" ? pubLoad() : t === "ord" ? ordLoad() : incLoad();
}
/* открыть вкладку (из ссылки «справочник» и т. п.) */
function mgrGo(t){
  const g = mgrGOf(t);
  mgrGrp = g;
  if (MGR_G[g].length > 1 && g !== "per") mgrSubs[g] = t;
  mgrs("mechty-mgr-tab", mgrGrp); mgrs("mechty-mgr-subs", mgrSubs);
  const step = {inc: "stepInc", sum: "stepWo"}[t];                       // приход и списания — шаги «Периода»: раскрыть
  if (step) $(step).open = true;
  mgrTabDraw(); mgrTabLoad();
  /* прокрутили вниз — новый раздел начинается сразу под панелью разделов */
  const nav = $("mgrNav"), top = nav.parentElement.getBoundingClientRect().top + scrollY + nav.offsetTop;
  if (scrollY > top) scrollTo({top, behavior: "instant"});
}
$("mgrTabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-g]");
  if (!b || b.dataset.g === mgrGrp) return;
  buzz(8); mgrGo(b.dataset.g === "per" ? "use" : b.dataset.g === "sal" ? "sal" : mgrSubs[b.dataset.g]);
});
document.querySelectorAll(".mgrsub").forEach(x => x.addEventListener("click", e => {
  const b = e.target.closest("button[data-t]");
  if (!b || mgrSubs[mgrGrp] === b.dataset.t) return;
  buzz(8); mgrGo(b.dataset.t);
}));
$("mgrRepD").addEventListener("toggle", () => { if ($("mgrRepD").open && mgrKey()) repLoad(); });
$("stepInc").addEventListener("toggle", () => { if ($("stepInc").open && mgrKey()) incLoad(); });
$("stepRec").addEventListener("click", e => { if (e.target.closest("button[data-go]")) { buzz(8); mgrGo("sal"); } });

/* ── справочник позиций ──
   строка: [раздел, позиция, ед., код R-Keeper, тара, норма, поставщик, цена, заметка, есть в бланке] */
let refRows = null, refF = "all", refOpen = -1, refBusy = false, refSaved = -1;
const REF_U = ["", "литр", "шт", "кг", "бут"];
const refNum = /^\s*(\d+([.,]\d+)?)?\s*$/;

async function refLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  $("mgrRwarn").textContent = "";
  if (!refRows) $("mgrRlist").innerHTML = '<ul class="olist mgrskel">' + skel(8) + '</ul>';
  const [d, a] = await Promise.all([api({mgr: "ref", mk}), api({mgr: "refauto", mk})]);
  if (d.error === "mgr") return mgrExpired();
  refAutoDraw(a && a.ok ? a.rows : []);
  if (!d.ok){
    if (!refRows) $("mgrRlist").innerHTML = "";
    $("mgrRwarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="refRetry">Повторить</button>';
    return;
  }
  if (refOpen >= 0 && refRows && refRows[refOpen]){           // открытую на правку позицию не закрывать
    const k = refRows[refOpen][0] + "|" + refRows[refOpen][1];
    refOpen = d.rows.findIndex(r => r[0] + "|" + r[1] === k);
  }
  refRows = d.rows;
  if (document.querySelector("#mgrRlist form.refed")) return;            // человек вводит — свежие данные покажем после «Сохранить» / «Отмена»
  refDraw();
}

/* единицы и объёмы бутылок по умолчанию — только в пустые ячейки, с пометкой «авто — проверьте» */
function refAutoDraw(rows){
  const nu = rows.filter(x => x.u).length, nt = rows.filter(x => x.tara !== "").length, low = rows.filter(x => !x.c).length;
  $("refAuto").innerHTML = rows.length ? '<div class="result tcard wo"><div class="tname"><em>' + mgrPl(rows.length, "позиция", "позиции", "позиций") + '</em><h3>Заполнить пустое</h3></div><div class="wobody">' +
    '<p class="wnhint">Единицы (' + nu + ') и объёмы бутылок (' + nt + ') — по названиям: бутылочное в литрах, тара — объём бутылки. Пишется только в пустые ячейки, в заметке — «авто — проверьте»' +
      (low ? '; у ' + low + ' объём не точный (бренд бывает в разных бутылках) — «не уверен»' : "") + '. Потом поправьте по своим бутылкам.</p>' +
    '<details class="incmapd"><summary>Что будет записано</summary><p class="wnhint">' + rows.map(x => esc(x.n) + ": " + [x.u, x.tara !== "" ? "тара " + mgrNum(x.tara) : ""].filter(Boolean).join(", ") + (x.c ? "" : " (?)")).join("; ") + '</p></details>' +
    '<p class="warn" id="refAutoMsg" role="status"></p><div class="refbtns"><button type="button" class="wogo" id="refAutoGo">Заполнить (' + rows.length + ')</button></div></div></div>' : "";
}
$("refAuto").addEventListener("click", async e => {
  if (e.target.id !== "refAutoGo") return;
  e.target.disabled = true;
  const d = await pubPost({mgr: "refauto", go: "1"});
  if (!d || !d.ok){ e.target.disabled = false; if (d) $("refAutoMsg").textContent = pubErr(d); return; }
  buzz(14); refRows = null; ordData = null; perData = null;
  refLoad();
});
const refMiss = (r, f) => f === "norm" ? !r[5] : f === "tara" ? !r[4] : f === "code" ? !r[3] : false;
function refMeta(r){
  const p = [];
  if (r[2]) p.push(esc(r[2]));
  if (r[3]) p.push("код " + esc(r[3]));
  p.push(r[4] ? "тара " + esc(r[4]) : '<em>нет тары</em>');
  p.push(r[5] ? "норма " + esc(r[5]) : '<em>нет нормы</em>');
  if (r[6]) p.push(esc(r[6]));
  if (r[7]) p.push(esc(r[7]) + " ₽");
  if (!r[9]) p.push('<em>нет в бланке</em>');
  return p.join(" · ");
}
function refForm(r, i){
  const us = REF_U.includes(r[2]) ? REF_U : REF_U.concat([r[2]]);
  const fld = (id, label, val, attrs) => '<div><label class="label" for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val) + '" ' + attrs + '></div>';
  return '<form class="refed" data-i="' + i + '" autocomplete="off" novalidate><div class="refgrid">' +
    '<div><label class="label" for="refU">Ед. изм.</label><select id="refU">' + us.map(u => '<option value="' + esc(u) + '"' + (u === r[2] ? " selected" : "") + '>' + (u ? esc(u) : "—") + '</option>').join("") + '</select></div>' +
    fld("refCode", "Код R-Keeper", r[3], 'type="text" inputmode="numeric" maxlength="30"') +
    fld("refTara", "Тара", r[4], 'type="text" inputmode="decimal" maxlength="12" placeholder="0,7"') +
    fld("refNorm", "Норма", r[5], 'type="text" inputmode="decimal" maxlength="12" placeholder="3"') +
    fld("refSup", "Поставщик", r[6], 'type="text" list="mgrSups" maxlength="80"') +
    fld("refPrice", "Цена, ₽", r[7], 'type="text" inputmode="decimal" maxlength="12"') +
    '</div>' + fld("refNote", "Заметка", r[8], 'type="text" maxlength="200"') +
    '<p class="wnhint">Тара: литровая позиция (ед. «литр» или «—» — бар считает бутылочное в литрах) — объём бутылки (0,7); кг — вес упаковки; шт — штук в упаковке (24); «бут» — объём бутылки. ' +
      'Норма и остаток — в единицах позиции.</p>' +
    '<p class="warn" id="refMsg" role="status"></p>' +
    '<div class="refbtns"><button type="submit" class="wogo">Сохранить</button><button type="button" class="link" data-cancel="1">Отмена</button></div></form>';
}
function refDraw(){
  if (!refRows) return;
  const q = $("mgrRq").value.trim().toLowerCase().replace(/ё/g, "е");
  const all = refRows.length, cnt = k => refRows.filter(r => r[k]).length;
  $("mgrRinfo").innerHTML = "Позиций <b>" + all + "</b> · норма есть у <b>" + cnt(5) + "</b> · тара — у <b>" + cnt(4) + "</b> · код — у <b>" + cnt(3) + "</b>";
  document.querySelectorAll("#mgrRf button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === refF)));
  $("mgrSups").innerHTML = [...new Set(refRows.map(r => r[6]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru")).map(x => '<option value="' + esc(x) + '">').join("");
  let html = "", sec = null, open = false;
  refRows.forEach((r, i) => {
    if (refF !== "all" && !refMiss(r, refF) && i !== refOpen) return;
    if (q && !(r[1] + " " + r[0] + " " + r[3] + " " + r[6]).toLowerCase().replace(/ё/g, "е").includes(q) && i !== refOpen) return;
    if (r[0] !== sec){
      if (open) html += '</ul></section>';
      sec = r[0]; open = true;
      html += '<section class="refsec"><h3 class="reft">' + esc(sec || "Без раздела") + '</h3><ul class="olist refl">';
    }
    html += '<li class="refli' + (i === refOpen ? " open" : "") + (i === refSaved ? " saved" : "") + '" data-i="' + i + '">' +
      '<button type="button" class="refrow" data-i="' + i + '" aria-expanded="' + (i === refOpen) + '"><span class="refn">' + esc(r[1]) + '</span>' +
      '<small>' + refMeta(r) + '</small></button>' + (i === refOpen ? refForm(r, i) : "") + '</li>';
  });
  if (open) html += '</ul></section>';
  $("mgrRlist").innerHTML = html || '<p class="empty">' + (refF !== "all" ? "Всё заполнено." : "Ничего не найдено.") + '</p>';
}

$("mgrRlist").addEventListener("click", e => {
  const b = e.target.closest("button.refrow");
  if (b){
    const i = +b.dataset.i;
    refOpen = refOpen === i ? -1 : i; refSaved = -1;
    buzz(8); refDraw();
    if (refOpen >= 0){ const f = document.querySelector('.refed[data-i="' + i + '"]'); if (f) f.closest("li").scrollIntoView({block: "nearest"}); }
    return;
  }
  if (e.target.closest("[data-cancel]")){ refOpen = -1; refDraw(); }
});
$("mgrRlist").addEventListener("submit", async e => {
  const f = e.target.closest("form.refed");
  if (!f) return;
  e.preventDefault();
  if (refBusy) return;
  const i = +f.dataset.i, r = refRows[i], mk = mgrKey();
  if (!r || !mk) return mgrInit();
  const v = id => $(id).value.trim();
  const bad = ["refTara", "refNorm", "refPrice"].filter(id => !refNum.test(v(id)));
  if (bad.length){ $("refMsg").textContent = "Тара, норма и цена — числом, например 0,7."; $(bad[0]).focus(); return; }
  refBusy = true; $("refMsg").textContent = "Сохраняем…";
  f.querySelector("button[type=submit]").disabled = true;
  let d = null;
  try {
    const res = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({token: TOKEN, mgr: "ref", mk, sec: r[0], n: r[1],
        f: {u: $("refU").value, code: v("refCode"), tara: v("refTara"), norm: v("refNorm"), sup: v("refSup"), price: v("refPrice"), note: v("refNote")}})});
    d = await res.json();
  } catch (err) { d = {error: "net"}; }
  refBusy = false;
  if (d && d.ok && d.row){
    refRows[i] = d.row; refOpen = -1; refSaved = i;
    buzz(14); refDraw();
    return;
  }
  if (d && d.error === "mgr") return mgrExpired();
  const sb = f.querySelector("button[type=submit]");
  if (sb) sb.disabled = false;
  $("refMsg").textContent = d && d.error === "bad" ? "Тара, норма и цена — числом, например 0,7." :
    d && d.error === "gone" ? "Этой позиции уже нет в справочнике — обновите список." :
    d && d.error === "action" ? "Нужна новая версия Apps Script." : "Не сохранилось — нет связи. Нажмите «Сохранить» ещё раз.";
});
let refT = 0;
$("mgrRq").addEventListener("input", () => { clearTimeout(refT); refT = setTimeout(refDraw, 120); });
$("mgrRf").addEventListener("click", e => {
  const b = e.target.closest("button[data-f]");
  if (!b) return;
  refF = b.dataset.f; refOpen = -1; buzz(8); refDraw();
});
$("mgrRwarn").addEventListener("click", e => { if (e.target.id === "refRetry") refLoad(); });

/* ── автозаявка ──
   строка с сервера: {sec, n, u, code, tara, norm, sup, q — остаток или null, from: "d" | "m", date — ГГГГ-ММ-ДД} */
let ordData = null, ordOff = new Set();
const ORD_FROM = {d: "ежедн.", m: "месячн."};
const ordKey = r => r.sec + "|" + r.n;
/* сколько заказать: целой тарой, если она задана */
function ordLine(r){
  const need = r.norm - (r.q || 0) - (r.inq || 0);
  if (!(need > 1e-9)) return null;
  const u = String(r.u || "").trim().toLowerCase() || "литр";             // пустая единица — литры (бутылочное бар считает в литрах)
  /* позиция в бутылках («бут»): остаток и норма — в бутылках, тара — объём бутылки (подпись) */
  if (u === "бут"){ const k = Math.ceil(need - 1e-9); return {k, text: k + " бут." + (r.tara > 0 && r.tara !== 1 ? " по " + mgrNum(r.tara) + " л" : "")}; }
  if (r.tara > 0){
    const k = Math.ceil(need / r.tara - 1e-9);
    const w = u === "шт" ? (r.tara === 1 ? "шт" : "уп.") : u === "кг" ? "уп." : "бут.";
    return {k, text: k + " " + w + (r.tara !== 1 ? " по " + mgrNum(r.tara) + (u === "литр" || u === "л" ? " л" : u === "кг" ? " кг" : u === "шт" ? " шт" : "") : "")};
  }
  return {k: need, text: mgrNum(Math.ceil(need * 10 - 1e-9) / 10) + (u ? " " + u : "")};
}
async function ordLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  $("mgrOwarn").textContent = "";
  if (!ordData) $("mgrOlist").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  api({mgr: "orders", mk}).then(r => { if (r.ok){ ordReq = r; ordReqDraw(); } });   // архив заявок — отдельно, не ждём
  const d = await api({mgr: "order", mk});
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    if (!ordData) $("mgrOlist").innerHTML = "";
    $("mgrOwarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="ordRetry">Повторить</button>';
    return;
  }
  ordData = d;
  ordDraw();
}
/* ── заявки бартендеров (архив, лист «Заявки») ── */
let ordReq = null, ordReqAll = false;
const ORQ_SHOW = 5;
function ordReqText(o){
  const out = ["Заявка (" + o.kind.toLowerCase() + ") " + o.at + " · " + o.who];
  let g = null;
  for (const x of o.items){
    if (x.g !== g){ g = x.g; out.push("", g || "Без раздела"); }
    out.push("— " + x.n + (x.q ? " " + x.q : ""));
  }
  return out.join("\n");
}
function ordReqDraw(){
  const L = ordReq ? ordReq.orders : [], show = ordReqAll ? L : L.slice(0, ORQ_SHOW);
  $("mgrOreq").innerHTML = '<div class="result tcard mgrt"><div class="tname"><em>' + (L.length ? mgrPl(L.length, "заявка", "заявки", "заявок") + " · " : "") + 'за 30 дней</em><h3>Заявки бартендеров</h3></div>' +
    (L.length ? '<ul class="oreq">' + show.map((o, i) => '<li><details' + (i ? "" : " open") + '><summary><span><b>' + esc(o.kind) + '</b> · ' + esc(o.who) +
        '<small class="mgrwhy">' + esc(o.at) + ' · ' + mgrPl(o.items.length, "позиция", "позиции", "позиций") + '</small></span></summary>' +
        '<ul class="oreqi">' + o.items.map(x => '<li>' + esc(x.n) + (x.q ? ' — <b>' + esc(x.q) + '</b>' : '') + '</li>').join("") + '</ul>' +
        '<button type="button" class="link" data-oreq="' + i + '">Скопировать</button></details></li>').join("") + '</ul>' +
      (L.length > ORQ_SHOW ? '<p class="mgrfoot"><button type="button" class="link" id="oreqAll">' + (ordReqAll ? "Свернуть" : "Показать все (" + L.length + ")") + '</button></p>' : "")
    : '<p class="oempty">Пока нет. Бартендеры отправляют заявку кнопкой «Скопировать и отправить в архив» в разделе «Заявка».</p>') + '</div>';
}
$("mgrOreq").addEventListener("click", async e => {
  if (e.target.id === "oreqAll"){ ordReqAll = !ordReqAll; ordReqDraw(); return; }
  const b = e.target.closest("button[data-oreq]");
  if (!b || !ordReq) return;
  let ok = false;
  try { await navigator.clipboard.writeText(ordReqText(ordReq.orders[+b.dataset.oreq])); ok = true; } catch (e2) {}
  b.textContent = ok ? "Скопировано ✓" : "Не скопировалось"; buzz(ok ? 14 : 8);
  setTimeout(() => { b.textContent = "Скопировать"; }, 1800);
});
function ordGroups(){
  const g = {}, none = [];
  let ok = 0;
  for (const r of ordData.rows){
    if (r.q == null){ none.push(r); continue; }
    const l = ordLine(r);
    if (!l){ ok++; continue; }
    const s = r.sup || "Без поставщика";
    (g[s] = g[s] || []).push(Object.assign({l}, r));
  }
  const sups = Object.keys(g).sort((a, b) => (a === "Без поставщика") - (b === "Без поставщика") || a.localeCompare(b, "ru"));
  return {g, sups, none, ok};
}
function ordDraw(){
  const d = ordData, m = d.src.m, dd = d.src.d, src = [];
  if (dd) src.push("ежедневная ревизия " + (dd.date ? mgrRu(dd.date) : "") + (dd.name ? " (" + esc(dd.name) + ")" : "") + " — " + mgrPl(dd.n, "позиция", "позиции", "позиций"));
  if (m) src.push("месячная" + (m.title ? " «" + esc(m.title) + "»" : "") + (m.date ? " от " + mgrRu(m.date) : "") + (m.open ? " (идёт новая — взята прошлая)" : ""));
  $("mgrOsrc").innerHTML = src.length ? "Остатки: " + src.join(" · ") : "Ревизий ещё нет — остатков нет.";
  $("mgrOwarn").textContent = (dd && dd.partial ? "Последняя ежедневная " + dd.partial + " — посчитаны не все зоны; остатки взяты из полной " + mgrRu(dd.date) + ". " : "") +
    (dd && dd.miss.length ? "Из ежедневной ревизии не нашлись в справочнике (назовите их так же, как в бланке месячной): " + dd.miss.join(", ") + "." : "");
  if (!d.rows.length){
    $("mgrOlist").innerHTML = '<p class="empty">Норма не задана ни у одной позиции. Заполните «Норму» и «Тару» в <button type="button" class="link" data-tab="ref">справочнике</button> — заявка посчитается сама.</p>';
    $("mgrOcopy").disabled = true;
    return;
  }
  const G = ordGroups();
  const line = r => '<li class="' + (ordOff.has(ordKey(r)) ? "" : "on") + '"><label class="row1"><span><span class="ordn">' + esc(r.n) + '</span>' +
    '<small class="mgrwhy">остаток ' + mgrNum(r.q) + (r.inq ? ' + приход ' + mgrNum(r.inq) : "") + ' · норма ' + mgrNum(r.norm) + (r.from ? ' · ' + ORD_FROM[r.from] + (r.date && r.date !== "0000-00-00" ? " " + mgrRu(r.date).slice(0, 5) : "") : "") + '</small></span>' +
    '<b class="ordq">' + esc(r.l.text) + '</b><input type="checkbox" data-k="' + esc(ordKey(r)) + '"' + (ordOff.has(ordKey(r)) ? "" : " checked") + ' aria-label="' + esc(r.n) + '"></label></li>';
  let html = '<p class="mgrsum">К заказу <b>' + mgrPl(G.sups.reduce((a, s) => a + G.g[s].length, 0), "позиция", "позиции", "позиций") + '</b> · в норме ' + G.ok +
    (d.nonorm ? ' · без нормы ' + d.nonorm + ' (<button type="button" class="link" data-tab="ref">справочник</button>)' : "") + '</p>';
  html += G.sups.map(s => '<div class="result tcard mgrt"><div class="tname"><em><button type="button" class="link" data-copy="' + esc(s) + '">Скопировать</button></em><h3>' + esc(s) + '</h3></div>' +
    '<ul class="olist ordl">' + G.g[s].map(line).join("") + '</ul></div>').join("");
  if (G.none.length) html += '<div class="result tcard mgrt"><div class="tname"><em>не посчитаны в ревизиях</em><h3>Нет остатка</h3></div><ul class="olist">' +
    G.none.map(r => '<li><div class="row1"><span>' + esc(r.n) + '<small class="mgrwhy">норма ' + mgrNum(r.norm) + (r.sup ? " · " + esc(r.sup) : "") + '</small></span></div></li>').join("") + '</ul></div>';
  if (!G.sups.length) html += '<p class="empty">Всё в норме — заказывать нечего.</p>';
  $("mgrOlist").innerHTML = html;
  $("mgrOcopy").disabled = !G.sups.length;
}
function ordText(only){
  const G = ordGroups(), out = [];
  for (const s of G.sups){
    if (only && s !== only) continue;
    const ls = G.g[s].filter(r => !ordOff.has(ordKey(r)));
    if (!ls.length) continue;
    out.push(s + ":", ...ls.map(r => "— " + r.n + " — " + r.l.text), "");
  }
  return out.join("\n").trim();
}
async function ordCopy(btn, only){
  const t = ordText(only);
  if (!t) return;
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {}
  const was = btn.textContent;
  btn.textContent = ok ? "Скопировано ✓" : "Не скопировалось";
  buzz(ok ? 14 : 8);
  setTimeout(() => { btn.textContent = was; }, 1800);
}
$("mgrOlist").addEventListener("change", e => {
  const c = e.target.closest("input[type=checkbox][data-k]");
  if (!c) return;
  if (c.checked) ordOff.delete(c.dataset.k); else ordOff.add(c.dataset.k);
  c.closest("li").classList.toggle("on", c.checked);
  buzz(8);
});
$("mgrOlist").addEventListener("click", e => {
  const b = e.target.closest("button[data-copy]");
  if (b) return ordCopy(b, b.dataset.copy);
  const t = e.target.closest("button[data-tab]");
  if (t) mgrGo(t.dataset.tab);
});
$("mgrOcopy").addEventListener("click", () => ordCopy($("mgrOcopy")));
$("mgrOwarn").addEventListener("click", e => { if (e.target.id === "ordRetry") ordLoad(); });

/* ── приход: загрузка накладных R-Keeper ──
   Файл → таблица (js/xlsx.js) → строка шапки и столбцы находятся сами (их можно поправить) → строки накладной
   сопоставляются со справочником: по коду R-Keeper, по уже встречавшемуся названию (J справочника), иначе — похожее
   название («проверьте»). Коэффициент — сколько единиц позиции в одной единице R-Keeper (бутылка 0,7 → 0,7 л). */
/* порядок поиска важен: цена — раньше единицы («Цена за единицу»), «Сумма НДС» — не сумма, «№ п/п» — не номер накладной */
const INC_F = [["date", "Дата", /дата/], ["no", "№ накладной", /номер\s*док|№\s*(док|накл)|накладн|документ|^(номер|№)$/], ["sup", "Поставщик", /поставщ|контраг|продав|отправит/],
  ["code", "Код", /^код(?!\s*групп)|артикул/], ["name", "Наименование", /наимен|товар|номенклат|продукц|назван/],
  ["qty", "Количество", /^кол|количеств/], ["price", "Цена", /^цена|цена\s*(за|с|без|закуп)/], ["sum", "Сумма", /^сумма(\s*(с|без)\s*ндс)?$|^всего|стоимост/],
  ["unit", "Ед. изм.", /^ед[\s.]|^ед$|^единиц/]];
const INC_PREF = {no: /номер\s*док|№\s*(док|накл)|накладн|документ/, name: /^наименование(\s*товара)?$|^товар$|^номенклатура$/, price: /^цена(\s*(с|без)\s*ндс)?$/};
const INC_NOT = {no: /по\s*порядку|п\.?\s*\/?\s*п|строк/, sum: /сумма\s*ндс|ндс\s*,?\s*сумма|^ндс/, name: /групп|категор/, price: /себестоим/};
/* № / дата / поставщик из текста: заголовок файла или строка-группа «Приходная накладная № 125 от 11.10.2026, поставщик ТОО …».
   Дата — после «от»; без «от» — единственная дата, не «дата печати»; «за период с … по …» — даты нет (её укажет человек). */
const INC_MON = ["январ", "феврал", "март", "апрел", "ма[йя]", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
const incIso = (d, m, y) => (String(y).length === 2 ? "20" + y : y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
function incMetaOf(text){
  const t = String(text);
  let date = "", m = t.match(/(?:^|\s)от\s*«?(\d{1,2})»?[.\s]+(\d{1,2}|[а-яё]+)[.\s]+(\d{4}|\d{2})(?!\d)/i);
  if (m){
    const mo = /^\d+$/.test(m[2]) ? +m[2] : INC_MON.findIndex(x => new RegExp("^" + x, "i").test(m[2])) + 1;
    if (mo > 0 && mo <= 12) date = incIso(m[1], mo, m[3]);
  }
  if (!date && !/период|\sс\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s+по\s/i.test(t)){
    const all = [];
    for (const x of t.matchAll(/(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/g))
      if (!/печат|сформир|выгруж|создан/i.test(t.slice(Math.max(0, x.index - 24), x.index))) all.push(x[1] ? x[1] + "-" + x[2] + "-" + x[3] : incIso(x[4], x[5], x[6]));
    if (new Set(all).size === 1) date = all[0];
  }
  const no = t.match(/№\s*([^\s,;]+)/), sup = t.match(/(?:поставщик|контрагент)[:\s]+([^\n,;]+)/i);
  return {no: no ? no[1] : "", date, sup: sup ? sup[1].trim().slice(0, 120) : ""};
}
let inc = null, incData = null, incRange = "rev";
const incU = u => { const s = String(u || "").trim().toLowerCase().replace(/\.$/, "");
  return /^(л|литр|литра|литров|l)$/.test(s) ? "л" : /^(мл|ml)$/.test(s) ? "мл" : /^(кг|kg)$/.test(s) ? "кг" : /^(г|гр|грамм)$/.test(s) ? "г" :
    /^(шт|штук|штука|pcs)$/.test(s) ? "шт" : /^(бут|бутылка|бутылок|btl)$/.test(s) ? "бут" : s; };
const incNorm = s => String(s).toLowerCase().replace(/ё/g, "е").replace(/(\d)[,.](\d)/g, "$1.$2").replace(/[«»"'`’().,\/\\\-–—_*]+/g, " ").replace(/\s+/g, " ").trim();
const incTok = s => incNorm(s).split(" ").filter(w => w.length > 1 && !/^\d+(\.\d+)?(л|мл|кг|г|гр|шт|%|лет)?$/.test(w) && !["мл", "кг", "гр", "шт", "бут", "лет"].includes(w));
/* похожесть названий: общие слова (с окончаниями: «лимоны» — «лимон»), в среднем по обоим названиям */
const incSame = (x, y) => x === y || (Math.min(x.length, y.length) >= 4 && Math.abs(x.length - y.length) <= 2 && (x.startsWith(y) || y.startsWith(x)));
function incScore(a, b){
  if (!a.length || !b.length) return 0;
  const hit = a.filter(x => b.some(y => incSame(x, y))).length;
  return (hit / a.length + hit / b.length) / 2;
}
const incLabel = r => r[1] + " — " + (r[0] || "без раздела");
const colName = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

async function incLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  document.querySelectorAll("#incQuick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === incRange)));
  const [from, to] = mgrRange(incRange);
  $("incSum").textContent = "Загрузка…";
  const d = await api({mgr: "inlist", mk, from, to});
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){ $("incSum").textContent = d.error === "action" ? "Нужна новая версия Apps Script." : "Нет связи с таблицей — нажмите период ещё раз."; return; }
  incData = d; incListDraw();
}
function incListDraw(){
  const by = {}, keys = [];
  for (const r of incData.rows){
    const k = r[0] + "|" + r[1] + "|" + r[2];
    if (!by[k]){ by[k] = {date: r[0], no: r[1], sup: r[2], rows: [], sum: 0, iso: r[0].split(".").reverse().join("-")}; keys.push(k); }
    by[k].rows.push(r); by[k].sum += typeof r[8] === "number" ? r[8] : 0;
  }
  const inv = keys.map(k => by[k]).sort((a, b) => b.iso.localeCompare(a.iso));
  const total = inv.reduce((a, x) => a + x.sum, 0);
  $("incSum").innerHTML = mgrRu(incData.from) + " — " + mgrRu(incData.to) + ": <b>" + mgrPl(inv.length, "накладная", "накладные", "накладных") + "</b>" +
    (total ? " на " + mgrNum(Math.round(total)) + " ₽" : "");
  $("incList").innerHTML = inv.slice(0, 40).map(x => '<div class="result tcard mgrt"><div class="tname"><em>' + (x.sum ? mgrNum(Math.round(x.sum)) + " ₽" : "") + '</em>' +
    '<h3>' + esc(x.date) + (x.no ? " №" + esc(x.no) : "") + '</h3><small class="mgrwhy">' + esc(x.sup || "поставщик не указан") + '</small></div>' +
    '<table><tbody>' + x.rows.map(r => '<tr><td class="n">' + esc(r[4]) + '</td><td class="v">' + mgrNum(r[5]) + (r[6] ? " " + esc(r[6]) : "") + '</td></tr>').join("") +
    '</tbody></table></div>').join("") || '<p class="empty">За этот период прихода нет.</p>';
}
$("incQuick").addEventListener("click", e => {
  const b = e.target.closest("button[data-r]");
  if (!b) return;
  incRange = b.dataset.r; buzz(8); incLoad();
});

/* справочник нужен для сопоставления — свежий: тару и коды могли поправить в таблице */
async function incRefs(){
  const d = await api({mgr: "ref", mk: mgrKey()});
  if (d.error === "mgr"){ mgrExpired(); return false; }
  if (!d.ok) return false;
  refRows = d.rows; return true;
}
$("incFile").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  $("incWarn").textContent = "Читаем файл…";
  let t;
  try { t = await readTable(f); }
  catch (err) { $("incWarn").textContent = xErrText(err); return; }
  const full = t.sheets.filter(s => s.rows.some(r => r.some(c => c !== ""))), sheets = full.filter(s => !s.hidden).length ? full.filter(s => !s.hidden) : full;
  if (!sheets.length){ $("incWarn").textContent = "В файле нет таблицы."; return; }
  if (!(await incRefs())){ $("incWarn").textContent = "Нет связи с таблицей — справочник не загрузился. Попробуйте ещё раз."; return; }
  $("incWarn").textContent = "";
  inc = {file: f.name, sheets, si: 0, mapOpen: null};
  incDetect(); incBuild(); incDraw();
});

/* шапка: строка, где больше всего знакомых заголовков (шапка в две строки — склеивается); данные накладной над ней */
function incDetect(){
  const rows = inc.sheets[inc.si].rows, low = r => (r || []).map(c => typeof c === "string" ? c.toLowerCase().replace(/\s+/g, " ").trim() : "");
  let best = -1, bs = 0;
  for (let i = 0; i < Math.min(rows.length, 40); i++){
    const cells = low(rows[i]);
    const sc = INC_F.filter(f => cells.some(c => c && c.length < 60 && f[2].test(c))).length;
    if (sc > bs && cells.some(c => INC_F[4][2].test(c))){ bs = sc; best = i; }
  }
  inc.hr = bs >= 2 ? best : -1;
  inc.skip = 0;
  inc.map = {};
  if (inc.hr >= 0){
    let cells = low(rows[inc.hr]);
    const nx = rows[inc.hr + 1] || [];
    /* вторая строка шапки («Код | Наименование» под «Товар»): одни подписи, без чисел */
    if (nx.filter(c => typeof c === "string" && c.trim()).length >= 2 && !nx.some(c => typeof c === "number")){
      const n2 = low(nx);
      cells = cells.map((c, j) => n2[j] ? (n2[j] + " " + (c && !INC_F[4][2].test(n2[j]) ? c : "")).trim() : c);
      for (let j = cells.length; j < n2.length; j++) cells[j] = n2[j];
      inc.skip = 1;
    }
    inc.hdr = cells;
    const used = new Set();
    for (const [k, , re] of INC_F){
      const fit = r => cells.findIndex((c, j) => c && !used.has(j) && r.test(c) && !(INC_NOT[k] && INC_NOT[k].test(c)));
      const i = INC_PREF[k] && fit(INC_PREF[k]) >= 0 ? fit(INC_PREF[k]) : fit(re);         // сначала — самое точное название
      if (i >= 0){ inc.map[k] = i; used.add(i); }
    }
    /* «№» с числами 1, 2, 3… — номер строки, а не накладной */
    if (inc.map.no != null){
      const v = rows.slice(inc.hr + 1 + inc.skip).map(r => r[inc.map.no]).filter(x => x !== "" && x != null);
      if (v.length > 1 && v.every((x, i) => x === i + 1)) delete inc.map.no;
    }
  }
  const top = rows.slice(0, Math.max(inc.hr, 0)).map(r => r.filter(c => c !== "").join(" ")).join("\n");
  inc.meta = incMetaOf(top);                                   // даты не нашлось — пусто: человек укажет сам (не «сегодня»)
}
/* строки накладной и сопоставление. Строка-группа «Накладная № … от …» задаёт №, дату и поставщика строкам под ней;
   строки без своих даты / № / поставщика продолжают накладную выше. Строки групп и итогов пропускаются. */
function incBuild(){
  const rows = inc.sheets[inc.si].rows, m = inc.map, out = [];
  const cell = (r, k) => m[k] == null ? "" : r[m[k]] == null ? "" : r[m[k]];
  const byCode = {}, byName = {}, toks = refRows.map(r => incTok(r[1]));
  refRows.forEach((r, i) => { if (r[3]) byCode[String(r[3]).trim()] = i; if (r[10]) byName[incNorm(r[10])] = i; });
  const data = rows.slice(inc.hr + 1 + (inc.skip || 0));
  const items = data.filter(r => typeof cell(r, "qty") === "number" && String(cell(r, "name")).trim());
  const share = k => m[k] == null || !items.length ? 0 : items.filter(r => cell(r, k) !== "").length / items.length;
  const priced = share("price") >= 0.7 || share("sum") >= 0.7, coded = share("code") >= 0.7;
  let ctx = {no: "", date: "", sup: ""}, prev = null;
  for (const r of data){
    const name = String(cell(r, "name")).trim(), qty = cell(r, "qty");
    if (!name || typeof qty !== "number" || !(qty > 0)){
      const txt = r.filter(c => c !== "").join(" ");
      if (/накладн|№\s*\S|(^|\s)от\s*\d/i.test(txt)){ const x = incMetaOf(txt); ctx = {no: x.no || "", date: x.date || "", sup: x.sup || ctx.sup}; prev = null; }
      continue;
    }
    if (/^(итог|всего|total)/i.test(name)) continue;
    /* подытог группы: ни кода, ни цены, ни суммы там, где у остальных строк они есть */
    if ((priced && cell(r, "price") === "" && cell(r, "sum") === "") && (!coded || cell(r, "code") === "") && m.unit != null && cell(r, "unit") === "") continue;
    const code = String(cell(r, "code")).trim();
    let ri = -1, how = "";
    if (code && byCode[code] != null){ ri = byCode[code]; how = "code"; }
    else if (byName[incNorm(name)] != null){ ri = byName[incNorm(name)]; how = "name"; }
    else {
      const t = incTok(name);
      let b1 = 0, b2 = 0, bi = -1;
      toks.forEach((x, j) => { const sc = incScore(t, x); if (sc > b1){ b2 = b1; b1 = sc; bi = j; } else if (sc > b2) b2 = sc; });
      if (b1 >= 0.6 && b1 > b2){ ri = bi; how = "guess"; }
    }
    let date = cell(r, "date");
    if (typeof date === "number" && date > 30000 && date < 80000) date = new Date(Date.UTC(1899, 11, 30) + date * 864e5).toISOString().slice(0, 10);
    date = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
    let no = String(cell(r, "no")).trim(), sup = String(cell(r, "sup")).trim();
    if (prev && !date && !no && !sup){ date = prev.date; no = prev.no; sup = prev.sup; }        // продолжение накладной выше
    else if (prev && no && no === prev.no){ date = date || prev.date; sup = sup || prev.sup; }
    date = date || ctx.date; no = no || ctx.no; sup = sup || ctx.sup;
    const price = cell(r, "price"), sum = cell(r, "sum"), unit = String(cell(r, "unit")).trim();
    const k = ri >= 0 ? incK(refRows[ri], unit) : {k: 1};
    out.push({name, code, unit, qty, price: typeof price === "number" ? price : 0, sum: typeof sum === "number" ? sum : 0,
      date, no, sup, ri, how, k: k.k, kq: k.q});
    prev = {date, no, sup};
  }
  inc.rows = out;
}
/* коэффициент: сколько единиц позиции в одной единице R-Keeper. Запомненный (K справочника) — только для той же
   единицы R-Keeper, для которой его подтвердили (L справочника; старые записи без L — если не 1).
   {k, q}: q — коэффициент не известен (единицы разные, правила нет) — строка помечается «проверьте». */
function incK(ref, rku){
  const ru = incU(rku), pu = incU(ref[2]) || "л", tara = mgrN(ref[4]), raw = String(rku || "").trim().toLowerCase();   // пустая единица — литры
  if (ref[11] && (ref[12] ? incU(ref[12]) === ru : mgrN(ref[11]) !== 1)) return {k: mgrN(ref[11])};
  if (!ru || !pu || ru === pu) return {k: 1};
  if ((ru === "шт" || ru === "бут") && (pu === "л" || pu === "кг")) return tara > 0 ? {k: tara} : {k: 1, q: 1};
  if (/^(уп|упак|кор|короб|ящ|блок|пач|спайк)/.test(raw) && pu === "шт") return tara > 0 ? {k: tara} : {k: 1, q: 1};   // у бутылочных тара — объём бутылки, не упаковка
  if (/^(уп|упак|кор|короб|ящ|блок|пач|спайк)/.test(raw)) return {k: 1, q: 1};
  if (ru === "мл" && pu === "л" || ru === "г" && pu === "кг") return {k: 0.001};
  if (ru === "л" && pu === "мл" || ru === "кг" && pu === "г") return {k: 1000};
  if ((ru === "шт" || ru === "бут") && (pu === "шт" || pu === "бут")) return {k: 1};
  return {k: 1, q: 1};
}
const incHow = {code: "по коду", name: "уже сопоставляли", guess: "похоже — проверьте", "": "не найдено — строка пропустится"};
function incDraw(){
  const box = $("incImp"), rows = inc.sheets[inc.si].rows, hdr = inc.hr >= 0 ? rows[inc.hr] : rows[0] || [];
  const ncol = Math.max(...rows.slice(0, 60).map(r => r.length), 1);
  $("incRefs").innerHTML = refRows.map(r => '<option value="' + esc(incLabel(r)) + '">').join("");
  const opt = (k, sel) => '<option value="">—</option>' + Array.from({length: ncol}, (_, i) => '<option value="' + i + '"' + (sel === i ? " selected" : "") + '>' +
    colName(i) + (hdr[i] !== "" && hdr[i] != null ? " · " + esc(String(hdr[i]).slice(0, 28)) : "") + '</option>').join("");
  const ready = inc.rows.filter(r => r.ri >= 0).length, guess = inc.rows.filter(r => r.ri >= 0 && (r.how === "guess" || r.kq)).length;
  /* поле накладной — если хоть у одной строки нет своего значения (столбца нет или ячейки пустые) */
  const lack = k => inc.rows.some(r => !r[k]);
  const meta = (k, label, type, val) => lack(k) ? '<div><label class="label" for="incM' + k + '">' + label + (k === "date" ? " *" : "") + '</label><input id="incM' + k + '" type="' + type + '" value="' + esc(val) + '"></div>' : "";
  const found = inc.map.name != null && inc.map.qty != null;
  if (inc.mapOpen == null) inc.mapOpen = !found;
  box.hidden = false;
  box.innerHTML = '<div class="result tcard wo"><div class="tname"><em>' + esc(inc.file) + '</em><h3>Накладные из файла</h3></div><div class="wobody">' +
    (inc.sheets.length > 1 ? '<label class="label" for="incSheet">Лист</label><select id="incSheet">' + inc.sheets.map((s, i) => '<option value="' + i + '"' + (i === inc.si ? " selected" : "") + '>' + esc(s.name) + '</option>').join("") + '</select>' : "") +
    '<details class="incmapd" id="incMapD"' + (inc.mapOpen ? " open" : "") + '><summary>' + (found ? "Столбцы найдены" + (inc.hr >= 0 ? " (шапка — строка " + (inc.hr + 1) + ")" : "") + " — проверить" : "Столбцы не найдены — укажите наименование и количество") + '</summary>' +
    '<div class="refgrid incmap">' + INC_F.map(([k, label]) => '<div><label class="label" for="incC' + k + '">' + label + '</label><select id="incC' + k + '" data-k="' + k + '">' + opt(k, inc.map[k]) + '</select></div>').join("") + '</div></details>' +
    (lack("date") || lack("no") || lack("sup") ? '<p class="label incml">Накладная — для строк, где в файле нет своей даты / № / поставщика' + (inc.meta.date || !lack("date") ? "" : ' · <b>укажите дату</b>') + '</p>' : "") +
    '<div class="refgrid">' + meta("date", "Дата", "date", inc.meta.date) + meta("no", "№", "text", inc.meta.no) + meta("sup", "Поставщик", "text", inc.meta.sup) + '</div>' +
    incWhenHtml() +
    '<p class="mgrsum">Строк: <b>' + inc.rows.length + '</b> · сопоставлено ' + ready + (guess ? ' · <span class="incg">проверьте ' + guess + '</span>' : "") +
      (inc.rows.length - ready ? ' · не найдено ' + (inc.rows.length - ready) : "") + '</p>' +
    '<ul class="olist incl">' + inc.rows.map((r, i) => {
      const ref = r.ri >= 0 ? refRows[r.ri] : null;
      return '<li class="inc-' + (r.kq && r.ri >= 0 ? "guess" : r.how || "no") + '" data-i="' + i + '"><div class="incr"><span class="refn">' + esc(r.name) + (r.code ? ' <small>код ' + esc(r.code) + '</small>' : "") + '</span>' +
        '<small class="mgrwhy">' + (r.date ? mgrRu(r.date) + (r.no ? " №" + esc(r.no) : "") + " · " : "") + mgrNum(r.qty) + (r.unit ? " " + esc(r.unit) : "") + (r.price ? " · " + mgrNum(r.price) + " ₽" : "") +
          ' · <b>' + (r.kq && r.ri >= 0 ? "проверьте коэффициент: " + esc(r.unit || "ед.") + " → " + esc(refRows[r.ri][2] || "ед.") : incHow[r.how]) + '</b></small>' +
        '<div class="incpick"><input type="text" list="incRefs" data-f="ref" value="' + (ref ? esc(incLabel(ref)) + '"' : '" placeholder="Позиция справочника"') + ' aria-label="Позиция справочника">' +
        '<label class="inck">× <input type="text" inputmode="decimal" data-f="k" value="' + mgrNum(r.k) + '" aria-label="Коэффициент"></label></div>' +
        (ref ? '<small class="mgrwhy">1 ' + esc(r.unit || "ед.") + ' = ' + mgrNum(r.k) + ' ' + esc(ref[2] || "ед.") + ' · в приход: ' + mgrNum(Math.round(r.qty * r.k * 1000) / 1000) + ' ' + esc(ref[2] || "") + '</small>' : "") +
        '</div></li>';
    }).join("") + '</ul>' +
    '<p class="warn" id="incMsg" role="status"></p>' +
    '<div class="refbtns"><button type="button" class="wogo" id="incSave"' + (ready ? "" : " disabled") + '>Записать приход (' + ready + ')</button><button type="button" class="link" id="incX">Отмена</button></div>' +
    '</div></div>';
}
/* поставка в день ревизии «перед открытием» (чт): пришла до пересчёта или после — от этого зависит, в какой период она войдёт.
   В остальные дни ясно и так (пн–ср — между ревизиями, вс — до ночной ревизии). */
const INC_ASK_WD = [4];
const incDates = () => { const mv = $("incMdate") ? $("incMdate").value : inc.meta.date; return [...new Set(inc.rows.filter(r => r.ri >= 0).map(r => r.date || mv).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))]; };
const incAsk = () => incDates().filter(d => INC_ASK_WD.indexOf(new Date(d + "T00:00:00Z").getUTCDay()) >= 0).sort();
function incWhenHtml(){
  inc.when = inc.when || {};
  return incAsk().map(d => '<div class="incwhen"><label class="label" for="incW' + d + '">Поставка за ' + ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(d + "T00:00:00Z").getUTCDay()] + " " + mgrRu(d).slice(0, 5) +
    ' пришла *</label><select id="incW' + d + '" data-when="' + d + '"><option value="">— до или после ревизии? —</option>' +
    ["до", "после"].map(w => '<option value="' + w + '"' + (inc.when[d] === w ? " selected" : "") + '>' + w + ' ревизии</option>').join("") + '</select></div>').join("");
}
/* перерисовка — после события: поле, теряющее фокус, ещё в документе */
$("incImp").addEventListener("toggle", e => { if (e.target.id === "incMapD" && inc) inc.mapOpen = e.target.open; }, true);
let incT = 0;
const incRedraw = () => { clearTimeout(incT); incT = setTimeout(() => { if (inc) incDraw(); }, 0); };
$("incImp").addEventListener("change", e => {
  const t = e.target;
  if (t.id === "incSheet"){ inc.si = +t.value; incDetect(); incBuild(); return incRedraw(); }
  if (t.dataset.when){ inc.when = inc.when || {}; inc.when[t.dataset.when] = t.value; return; }
  if (t.id && t.id.startsWith("incM") && t.id.length > 4){ inc.meta[t.id.slice(4)] = t.value; if (t.id === "incMdate") incRedraw(); return; }
  if (t.dataset.k && t.id.startsWith("incC")){ if (t.value === "") delete inc.map[t.dataset.k]; else inc.map[t.dataset.k] = +t.value; incBuild(); return incRedraw(); }
  const li = t.closest("li[data-i]");
  if (!li) return;
  const r = inc.rows[+li.dataset.i];
  if (t.dataset.f === "ref"){
    const i = refRows.findIndex(x => incLabel(x) === t.value.trim());
    const k = i >= 0 ? incK(refRows[i], r.unit) : {k: 1};
    r.ri = i; r.how = i >= 0 ? "name" : ""; r.k = k.k; r.kq = k.q;
    if (!t.value.trim()){ r.ri = -1; r.how = ""; }
    incRedraw();
  } else if (t.dataset.f === "k"){
    const k = mgrN(t.value);
    if (k > 0){ r.k = k; r.kq = 0; incRedraw(); } else t.value = mgrNum(r.k);
  }
});
$("incImp").addEventListener("click", async e => {
  if (e.target.id === "incX"){ inc = null; $("incImp").hidden = true; $("incImp").innerHTML = ""; return; }
  if (e.target.id !== "incSave") return;
  const mk = mgrKey(), btn = e.target;
  if (!mk) return mgrInit();
  const mv = k => { const el = $("incM" + k); return el ? el.value.trim() : ""; };
  const seen = {};
  const rows = inc.rows.filter(r => r.ri >= 0).map(r => {
    const ref = refRows[r.ri];
    const x = {date: r.date || mv("date"), no: r.no || mv("no"), sup: r.sup || mv("sup"), code: r.code, rkn: r.name, rku: r.unit, rkq: r.qty,
      price: r.price, sum: r.sum, sec: ref[0], n: ref[1], k: r.k};
    /* одинаковые строки в одной накладной — не повтор: номер вхождения идёт в id (у первого — как раньше) */
    const sig = [x.date, x.no, x.sup, x.code, x.rkn, x.rkq, x.price].join("|");
    x.rep = seen[sig] = (seen[sig] || 0) + 1; x.rep--;
    return x;
  });
  if (rows.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.date))){ $("incMsg").textContent = "Укажите дату накладной."; return; }
  const ask = incAsk().filter(d => !(inc.when || {})[d]);
  if (ask.length){ $("incMsg").textContent = "Укажите, поставка за " + ask.map(d => mgrRu(d).slice(0, 5)).join(", ") + " пришла до или после ревизии."; return; }
  rows.forEach(r => { r.when = (inc.when || {})[r.date] || ""; });
  btn.disabled = true; $("incMsg").textContent = "Записываем…";
  /* частями по 400 строк: большой файл не обрезается; повтор после сбоя не задвоит (id) */
  let d = {ok: true, added: 0, dup: 0, miss: []};
  for (let i = 0; i < rows.length && d.ok; i += 400){
    if (rows.length > 400) $("incMsg").textContent = "Записываем… " + Math.min(i + 400, rows.length) + " из " + rows.length;
    let r = null;
    try {
      const res = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify({token: TOKEN, mgr: "in", mk, who: me ? me.name : "", rows: rows.slice(i, i + 400)})});
      r = await res.json();
    } catch (err) { r = {error: "net"}; }
    if (r && r.ok){ d.added += r.added; d.dup += r.dup; d.miss = d.miss.concat(r.miss || []); }
    else d = r;
  }
  if (d && d.error === "mgr") return mgrExpired();
  if (!d || !d.ok){
    btn.disabled = false;
    $("incMsg").textContent = d && d.error === "action" ? "Нужна новая версия Apps Script." : d && d.error === "bad" ? "Проверьте даты и количества." : "Не записалось — нет связи. Нажмите ещё раз (повторы не задвоятся).";
    return;
  }
  buzz(14);
  inc = null; refRows = null; ordData = null; perData = null;
  if (mgrGrp === "per") perLoad();
  $("incImp").hidden = true; $("incImp").innerHTML = "";
  $("incWarn").textContent = "Записано строк: " + d.added + (d.dup ? ", уже были в журнале: " + d.dup : "") + (d.miss && d.miss.length ? ", позиции не найдены: " + d.miss.join(", ") : "") + ".";
  incLoad();
});

/* ── расход и странности ──
   позиция с сервера: {n, sec, key, u, v: [остаток на каждую ревизию или null], inc: [{iso, q}], wo: [{iso, q}]};
   ревизии: cols [{iso, who}] по порядку. Период — между соседними ревизиями, где позиция посчитана в обеих. */
let useData = null, useKind = mgrj("mechty-mgr-use", {k: "d"}).k === "m" ? "m" : "d", useSens = 0.5, useOpen = -1;
const isoDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const useU = u => { const s = String(u || "").trim(); return s === "литр" || !s ? "л" : s === "бут" ? "бут." : s; };
const useTol = u => /^(шт|бут\.)$/.test(useU(u)) ? 1 : 0.1;              // меньше этого — не странность, а погрешность пересчёта

function usePeriods(x){
  const C = useData.cols, out = [];
  for (let i = 1; i < C.length; i++){
    if (x.v[i] == null) continue;
    let j = i - 1;
    /* пара — дни с теми же посчитанными зонами (день без клуба — не полный остаток) */
    while (j >= 0 && (x.v[j] == null || (C[j].z && C[i].z && C[j].z !== C[i].z))) j--;
    if (j < 0) continue;
    const from = C[j].iso, to = C[i].iso, sum = arr => arr.filter(y => y.iso > from && y.iso <= to).reduce((a, y) => a + y.q, 0);
    /* акт — в период по времени записи: разбили бутылку вечером после пересчёта — это уже следующий период */
    const byT = C[j].t && C[i].t, woq = x.wo.filter(y => byT && y.t ? y.t > C[j].t && y.t <= C[i].t : y.iso > from && y.iso <= to).reduce((a, y) => a + y.q, 0);
    const inq = sum(x.inc), use = x.v[j] + inq - x.v[i];
    out.push({i, from, to, days: Math.max(1, isoDays(from, to)), was: x.v[j], now: x.v[i], inq, woq, use, net: use - woq});
  }
  return out;
}
/* последний период позиции против «обычного» */
function useCheck(x){
  const ps = usePeriods(x), last = ps[ps.length - 1], L = useData.cols.length - 1;
  if (!last || last.i !== L) return {ps, last: null};
  let base = ps.slice(0, -1);
  if (useData.kind === "d"){
    const wd = new Date(last.to).getUTCDay(), same = base.filter(p => new Date(p.to).getUTCDay() === wd);
    if (same.length >= 3) base = same;
  }
  base = base.slice(-8);
  const rate = base.length >= 2 ? median(base.map(p => p.net / p.days)) : null, tol = useTol(x.u);
  const exp = rate == null ? null : Math.max(0, rate * last.days);
  let flag = "", lvl = 0;
  if (last.use < -tol){ flag = "остаток вырос на " + mgrNum(r2(-last.use)) + " " + useU(x.u) + (x.key ? " без прихода" : " (приход не учитывается — позиции нет в справочнике)"); lvl = 3; }
  else if (exp != null && last.net > exp * (1 + useSens) && last.net - exp > tol){ flag = "расход выше обычного" + (exp > 0 ? " на " + Math.round((last.net / exp - 1) * 100) + "%" : ""); lvl = 2; }
  else if (exp != null && exp > tol && last.net < exp * (1 - Math.min(useSens, 0.9)) && exp - last.net > tol){ flag = "расход ниже обычного — проверьте пересчёт"; lvl = 1; }
  return {ps, last, exp, flag, lvl, nbase: base.length};
}
const r2 = x => Math.round(x * 100) / 100;

async function useLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  document.querySelectorAll("#useKind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === useKind)));
  $("useHintD").hidden = useKind !== "d"; $("useHintM").hidden = useKind === "d";
  $("useSens").hidden = useKind === "d"; $("usePerBox").hidden = useKind !== "d";
  if (useKind === "d") return perLoad();
  perStepsDraw();
  document.querySelectorAll("#useSens button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.s === useSens)));
  $("useWarn").textContent = "";
  if (!useData || useData.kind !== useKind) $("useList").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  const d = await api({mgr: "usage", mk, kind: useKind});
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    $("useList").innerHTML = "";
    $("useWarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="useRetry">Повторить</button>';
    return;
  }
  if (d.kind !== useKind) return;                                        // пока грузили, переключили ревизию
  useData = d; useOpen = -1; useDraw();
}
function useDraw(){
  const d = useData, C = d.cols;
  if (C.length < 2){
    $("useSum").textContent = "";
    $("useList").innerHTML = '<p class="empty">Нужно хотя бы две ' + (d.kind === "m" ? "закрытые месячные" : "законченные ежедневные") + ' ревизии — расход считается между ними.</p>';
    return;
  }
  const L = C[C.length - 1], P = C[C.length - 2];
  const rows = d.items.map((x, i) => Object.assign({x, i}, useCheck(x))).filter(r => r.last);
  const odd = rows.filter(r => r.lvl).sort((a, b) => b.lvl - a.lvl || a.x.n.localeCompare(b.x.n, "ru"));
  const noref = d.items.filter(x => !x.key).length;
  $("useSum").innerHTML = (d.kind === "m" && L.who ? "«" + esc(L.who) + "» от <b>" + mgrRu(L.iso) + "</b>" : "Ревизия <b>" + mgrRu(L.iso) + "</b>" + (L.who ? " (" + esc(L.who) + ")" : "")) + " против " + mgrRu(P.iso) +
    " · позиций " + rows.length + " · <b>странностей " + odd.length + "</b>" + (rows.some(r => r.nbase < 2) ? " · у части позиций мало истории — «обычного» ещё нет" : "");
  const wm = d.womiss || [], wn = wm.filter(x => x.why === "name"), wu = wm.filter(x => x.why === "unit");
  $("useWarn").textContent = [noref ? "Не найдены в справочнике (приход и списания для них не учитываются): " + d.items.filter(x => !x.key).map(x => x.n).join(", ") + "." : "",
    wn.length ? "Списания не учтены — названия нет в справочнике (назовите в акте как в бланке ревизии): " + wn.map(x => x.n).join(", ") + "." : "",
    wm.some(x => x.why === "ambiguous") ? "Списания не учтены — в бланке несколько позиций с таким названием (уточните в бланке): " + wm.filter(x => x.why === "ambiguous").map(x => x.n).join(", ") + "." : "",
    wu.length ? "Списания не учтены — единица акта не переводится в единицу позиции: " + wu.map(x => x.n + " (" + (x.u || "?") + " → " + (x.pu || "?") + ")").join(", ") + "." : ""]
    .filter(Boolean).join(" ");
  const unit = x => useU(x.u);
  const line = r => {
    const l = r.last, u = unit(r.x);
    return '<li class="use' + r.lvl + (useOpen === r.i ? " open" : "") + '" data-i="' + r.i + '"><button type="button" class="userow" data-i="' + r.i + '">' +
      '<span class="usen"><span class="refn">' + esc(r.x.n) + '</span>' +
      '<small class="mgrwhy">было ' + mgrNum(r2(l.was)) + (l.inq ? ' + приход ' + mgrNum(r2(l.inq)) : "") + ' · стало ' + mgrNum(r2(l.now)) + (l.woq ? ' · списано ' + mgrNum(r2(l.woq)) : "") +
        (r.flag ? ' · <b>' + esc(r.flag) + '</b>' : "") + '</small></span>' +
      '<span class="usev"><b>' + mgrNum(r2(l.use)) + ' ' + u + '</b><small>' + (r.exp != null ? "обычно ~" + mgrNum(r2(r.exp + l.woq)) : "истории мало") + '</small></span></button>' +
      (useOpen === r.i ? useHist(r) : "") + '</li>';
  };
  let html = "";
  if (odd.length) html += '<div class="result tcard mgrt"><div class="tname"><em>' + mgrRu(P.iso).slice(0, 5) + " → " + mgrRu(L.iso).slice(0, 5) + '</em><h3>Странности</h3></div><ul class="olist usel">' + odd.map(line).join("") + '</ul></div>';
  else html += '<p class="empty useok">Странностей нет — расход в пределах обычного.</p>';
  html += '<div class="result tcard mgrt"><div class="tname"><em>расход за период</em><h3>Все позиции</h3></div><ul class="olist usel">' +
    rows.slice().sort((a, b) => a.x.n.localeCompare(b.x.n, "ru")).map(line).join("") + '</ul></div>';
  $("useList").innerHTML = html;
}
/* история позиции: последние периоды */
function useHist(r){
  const u = useU(r.x.u);
  return '<table class="usehist"><thead><tr><th>Период</th><th>Расход</th><th>В день</th></tr></thead><tbody>' +
    r.ps.slice(-8).reverse().map(p => '<tr><td class="n">' + mgrRu(p.from).slice(0, 5) + " → " + mgrRu(p.to).slice(0, 5) +
      (p.inq ? '<small class="mgrwhy">приход ' + mgrNum(r2(p.inq)) + '</small>' : "") + (p.woq ? '<small class="mgrwhy">списано ' + mgrNum(r2(p.woq)) + '</small>' : "") + '</td>' +
      '<td class="v">' + mgrNum(r2(p.use)) + ' ' + u + '</td><td class="v">' + mgrNum(r2(p.net / p.days)) + '</td></tr>').join("") + '</tbody></table>';
}
$("useKind").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]");
  if (!b || b.dataset.k === useKind) return;
  useKind = b.dataset.k; mgrs("mechty-mgr-use", {k: useKind}); buzz(8); useLoad();
});
$("useSens").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]");
  if (!b) return;
  useSens = +b.dataset.s; buzz(8);
  document.querySelectorAll("#useSens button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  if (useData) useDraw();
});
$("useList").addEventListener("click", e => {
  if (useKind === "d") return perClick(e);
  const b = e.target.closest("button.userow");
  if (!b) return;
  const i = +b.dataset.i;
  useOpen = useOpen === i ? -1 : i; buzz(8); useDraw();
});
$("useWarn").addEventListener("click", e => { if (e.target.id === "useRetry") useLoad(); });

/* ── период ревизии: ревизия против продаж ──
   всё считает сервер (mgr: "period"): строка {n, u, was, inc, sold, wo, pr, exp, now, diff, price, money, zag/raw/info/miss}.
   Ожидалось = было + приход − продано − списания − проработки; расхождение = стало − ожидалось (минус — недостача). */
let perData = null, perI = null, perOpen = "", perRange = null;      // perRange — свои даты {from, to}
const perLab = (a, b) => a.wd + " " + mgrRu(a.iso).slice(0, 5) + " → " + b.wd + " " + mgrRu(b.iso).slice(0, 5);
const perMoney = x => mgrNum(Math.round(Math.abs(x || 0)));
async function perLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  $("useWarn").textContent = "";
  if (!perData) $("useList").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  const d = await api(Object.assign({mgr: "period", mk}, perRange ? perRange : perI != null ? {i: perI} : {}));
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    $("useList").innerHTML = "";
    $("useWarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="useRetry">Повторить</button>';
    return;
  }
  if (useKind !== "d") return;                                           // пока грузили, переключили на месячную
  perData = d; perDraw();
}
function perDraw(){
  const d = perData, R = d.revs || [];
  const pair = !d.req && d.a === d.i - 1;
  $("usePer").innerHTML = (pair ? "" : '<option value="" selected>' + (d.from ? perLab(d.from, d.to) + " · свои даты" : "свои даты") + '</option>') +
    R.slice(1).map((b, j) => '<option value="' + (j + 1) + '"' + (pair && j + 1 === d.i ? " selected" : "") + '>' + perLab(R[j], b) + (j + 1 === R.length - 1 ? " · последний" : "") + '</option>').reverse().join("");
  if (d.from){ $("perFrom").value = d.req ? d.req.from : d.from.iso; $("perTo").value = d.req ? d.req.to : d.to.iso; }
  $("perRangeHint").textContent = d.req && d.from && (d.req.from !== d.from.iso || d.req.to !== d.to.iso) ?
    "Остатки есть только на ревизиях: период расширен до " + perLab(d.from, d.to) + "." : "";
  $("usePerBox").hidden = R.length < 2;
  if (R.length < 2 || !d.from){
    perStepsDraw();
    $("useSum").textContent = "";
    $("useList").innerHTML = '<p class="empty">Нужны хотя бы две ревизии — дни, когда посчитаны все зоны и все нажали «Завершить». Расход считается между ними.</p>';
    return;
  }
  const S = d.sales || {want: [], miss: [], nodish: [], have: []}, rows = d.rows.filter(r => !r.info && !r.miss);
  const info = d.rows.filter(r => r.info), miss = d.rows.filter(r => r.miss);
  const dd = iso => ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(iso + "T00:00:00Z").getUTCDay()] + " " + mgrRu(iso).slice(0, 5);
  $("useSum").innerHTML = '<b>' + perLab(d.from, d.to) + '</b>' + (d.to.who ? " (" + esc(d.to.who) + ")" : "") + ' · недостача <b class="salshort">' + perMoney(d.short) + ' ₽</b> · излишек <b>' + perMoney(d.over) + ' ₽</b> · позиций ' + rows.length;
  const wm = d.womiss || [];
  const W = [
    !S.want.length ? "В этом периоде смен не было — продаж не ждём: любое расхождение — потери или ошибка пересчёта." :
      S.miss.length ? "Нет продаж R-Keeper за " + S.miss.map(dd).join(", ") + " — загрузите в шаге «Продажи R-Keeper» выше, иначе всё проданное в эти дни покажется недостачей." : "",
    S.nodish.length ? mgrPl(S.nodish.length, "блюдо", "блюда", "блюд") + " без расхода на блюдо (" + S.nodish.slice(0, 8).map(x => x.name + " ×" + mgrNum(x.qty)).join(", ") + (S.nodish.length > 8 ? "…" : "") +
      ") — задайте в разделе «Рецепты», иначе их ингредиенты покажутся недостачей." : "",
    (d.zagno || []).length ? "Заготовки без рецепта (их сырьё не сойдётся — задайте рецепт в разделе «Рецепты»): " + d.zagno.join(", ") + "." : "",
    (d.skipped || []).length ? "Пересчёты не всех зон — не ревизия, период через них не режется: " + d.skipped.map(x => x.d.slice(0, 5) + (x.z ? " (" + x.z + ")" : "")).join(", ") + "." : "",
    (d.nokey || []).length ? "Не найдены в справочнике — приход, продажи и списания для них не учитываются: " + d.nokey.join(", ") + "." : "",
    wm.filter(x => x.why === "name").length ? "Списания не учтены — названия нет в бланке ревизии (назовите в акте как в бланке): " + wm.filter(x => x.why === "name").map(x => x.n).join(", ") + "." : "",
    wm.filter(x => x.why === "ambiguous").length ? "Списания не учтены — в бланке несколько позиций с таким названием: " + wm.filter(x => x.why === "ambiguous").map(x => x.n).join(", ") + "." : "",
    wm.filter(x => x.why === "unit").length ? "Списания не учтены — единица акта не переводится в единицу позиции (задайте единицу и тару в справочнике): " + wm.filter(x => x.why === "unit").map(x => x.n + " (" + (x.u || "?") + (x.pu ? " → " + x.pu : "") + ")").join(", ") + "." : "",
    (d.unconv || []).length ? "Не переводится единица (задайте единицу и тару в справочнике): " + d.unconv.join(", ") + "." : "",
    d.noprice ? "У " + mgrPl(d.noprice, "позиции", "позиций", "позиций") + " с расхождением нет цены закупки — в сумму ₽ не вошли (цена заполнится из накладных или в справочнике)." : ""
  ].filter(Boolean);
  $("useWarn").innerHTML = W.map(esc).join("<br>");
  const n = x => mgrNum(r2(x));
  const why = r => {
    const t = ["было " + n(r.was)];
    if (r.inc) t.push("+ приход " + n(r.inc));
    if (r.sold) t.push("− продано " + n(r.sold));
    if (r.wo) t.push("− списано " + n(r.wo));
    if (r.pr) t.push("− проработки " + n(r.pr));
    return t.join(" ") + (t.length > 1 ? " = ожидалось " + n(r.exp) : "") + " · стало " + n(r.now) + (r.raw ? " · с заготовками" : "");
  };
  const line = r => {
    const u = useU(r.u), cls = Math.abs(r.diff) < 1e-9 ? "per0" : r.diff < 0 ? "perneg" : "perpos";
    return '<li class="' + cls + '"><div class="userow"><span class="usen"><span class="refn">' + esc(r.n) + '</span><small class="mgrwhy">' + esc(why(r)) + '</small></span>' +
      '<span class="usev"><b>' + (Math.abs(r.diff) < 1e-9 ? "сходится" : (r.diff < 0 ? "−" : "+") + n(Math.abs(r.diff)) + " " + u) + '</b>' +
      (r.money ? '<small>' + (r.money < 0 ? "−" : "+") + perMoney(r.money) + ' ₽</small>' : r.diff && !r.price ? '<small>нет цены</small>' : "") + '</span></div></li>';
  };
  let html = '<div class="result tcard mgrt"><div class="tname"><em>' + perLab(d.from, d.to) + '</em><h3>Ревизия против продаж</h3></div>' +
    (rows.length ? '<ul class="olist usel">' + rows.map(line).join("") + '</ul>' : '<p class="empty">Нет позиций, посчитанных в обеих ревизиях.</p>');
  if (info.length) html += '<details class="incmapd perd"><summary>Заготовки — разложены на сырьё (' + info.length + ')</summary><ul class="olist usel">' +
    info.map(r => '<li><div class="userow"><span class="usen"><span class="refn">' + esc(r.n) + '</span><small class="mgrwhy">было ' + n(r.was) + ' · стало ' + n(r.now) + ' ' + useU(r.u) + ' — уже в остатке сырья по рецепту</small></span></div></li>').join("") + '</ul></details>';
  if (miss.length) html += '<details class="incmapd perd"><summary>Не посчитаны в одной из ревизий (' + miss.length + ')</summary><p class="wnhint">' +
    miss.map(r => esc(r.n) + (r.miss === "from" ? " — нет в " + d.from.wd : " — нет в " + d.to.wd)).join(", ") + '</p></details>';
  html += '<p class="mgrfoot"><button type="button" class="link" id="perCopy">Скопировать итог</button></p></div>';
  $("useList").innerHTML = html;
  perStepsDraw();
  if ($("stepInc").open && incRange === "rev") incLoad();
  /* сводка списаний ниже — за тот же период (если выбран «Период ревизии») */
  if (mgrRsel === "rev" && ($("mgrFrom").value !== d.from.iso || $("mgrTo").value !== d.to.iso || !mgrData)){
    $("mgrFrom").value = d.from.iso; $("mgrTo").value = d.to.iso; mgrLoad();
  }
}
/* письма: на какие адреса и включены ли (один запрос, обновляется после сохранения адресов) */
let perMail = null;
function perMailDraw(){
  const st = x => { $("stepMailS").innerHTML = x.t; $("mgrRepD").dataset.st = x.c; };
  if (!perMail){ perMail = {t: "…", c: ""}; api({mgr: "reportto", mk: mgrKey()}).then(x => { if (!x || !x.ok) return;
    perMail = {t: (x.emails.length ? "на " + esc(x.emails.join(", ")) : "почта не указана — укажите") + (x.auto === true ? " · после ревизии и по понедельникам" : x.auto === false ? " · <b>выключены</b>" : ""),
      c: x.emails.length && x.auto !== false ? "ok" : "warn", got: 1}; st(perMail); }); }
  st(perMail);
}
/* шаги расчёта периода: что загружено, чего не хватает (зелёным — готово, красным — сделать) */
let perInc = {key: "", text: "…"};
function perStepsDraw(){
  const d = perData;
  $("perSteps").hidden = false;
  $("stepRev").hidden = useKind !== "d";
  const st = (id, cls, html) => { $(id).innerHTML = html; $(id).closest(".perstep").dataset.st = cls; };
  perMailDraw();
  if (useKind !== "d"){
    $("stepRec").hidden = true;
    st("stepSalS", "", "загрузка продаж R-Keeper — разложатся по периодам сами");
    st("stepIncS", "", "загрузка накладных и список");
    st("stepWoS", "", mgrData ? mgrPl(new Set(mgrData.rows.map(r => r[9])).size, "акт", "акта", "актов") + " за " + mgrRu(mgrData.from).slice(0, 5) + " — " + mgrRu(mgrData.to).slice(0, 5) : "…");
    return;
  }
  /* двух ревизий ещё нет — загружать продажи и накладные уже можно, считать пока не с чем */
  if (!d || !d.from){
    st("stepRevS", "warn", d ? "нужны две ревизии — дни, где посчитаны все зоны и все нажали «Завершить»" : "…");
    st("stepSalS", "", "загрузите — разложатся по периодам сами");
    st("stepIncS", "", "загрузите накладные — войдут в свой период");
    st("stepWoS", "", mgrData ? mgrPl(new Set(mgrData.rows.map(r => r[9])).size, "акт", "акта", "актов") + " за " + mgrRu(mgrData.from).slice(0, 5) + " — " + mgrRu(mgrData.to).slice(0, 5) : "…");
    $("stepRec").hidden = true;
    return;
  }
  const dd = iso => salWd(iso) + " " + mgrRu(iso).slice(0, 5), S = d.sales || {want: [], miss: [], have: [], nodish: [], qty: 0};
  st("stepRevS", "ok", dd(d.from.iso) + (d.from.who ? " (" + esc(d.from.who) + ")" : "") + " → " + dd(d.to.iso) + (d.to.who ? " (" + esc(d.to.who) + ")" : "") +
    (d.req ? " · свои даты" : "") + ((d.skipped || []).length ? " · пересчёт не всех зон — не в счёт" : "") + " · <u>изменить</u>");
  st("stepSalS", S.want.length && S.miss.length ? "warn" : "ok", !S.want.length ? "смен в периоде не было — продажи не нужны" :
    S.miss.length ? "нет за " + S.miss.map(dd).join(", ") + " — загрузите" : "загружены за " + S.have.map(dd).join(", ") + " · " + mgrNum(Math.round(S.qty)) + " порц.");
  if (S.want.length && S.miss.length && !perInc.opened){ $("stepSal").open = true; perInc.opened = true; }
  const wo = mgrData && mgrData.from === d.from.iso && mgrData.to === d.to.iso ? mgrData : null;
  if (wo){
    const n = k => new Set(wo.rows.filter(r => r[0] === k).map(r => r[9])).size, a = n("wo"), b = n("pr");
    st("stepWoS", "ok", a || b ? "списаний " + a + ", проработок " + b + " · по датам актов" : "актов нет");
  } else st("stepWoS", "", "…");
  const nd = (S.nodish || []).length, nz = (d.zagno || []).length;
  $("stepRec").hidden = !(nd || nz);                                       // рецепты — только когда есть что задать
  st("stepRecS", nd || nz ? "warn" : "ok", nd || nz ? [nd ? "без расхода на блюдо: " + mgrPl(nd, "блюдо", "блюда", "блюд") : "", nz ? "заготовок без рецепта: " + nz : ""].filter(Boolean).join(", ")
    : S.qty ? "у всех проданных блюд задан расход" : "проданных блюд нет");
  /* приход за период — накладные и сумма (одним запросом на период) */
  const key = d.from.iso + "|" + d.to.iso;
  if (perInc.key !== key){
    perInc = {key, text: "…", opened: perInc.opened};
    api({mgr: "inlist", mk: mgrKey(), from: d.from.iso, to: d.to.iso}).then(x => {
      if (!x.ok || perInc.key !== key) return;
      const inv = new Set(x.rows.map(r => r[0] + "|" + r[1] + "|" + r[2])), sum = x.rows.reduce((m, r) => m + (typeof r[8] === "number" ? r[8] : 0), 0);
      perInc.text = inv.size ? mgrPl(inv.size, "накладная", "накладные", "накладных") + (sum ? " · " + mgrNum(Math.round(sum)) + " ₽" : "") + " · по датам накладных" : "накладных нет";
      st("stepIncS", "ok", perInc.text);
    });
  }
  st("stepIncS", "ok", perInc.text);
}
async function perClick(e){
  if (e.target.id !== "perCopy" || !perData) return;
  const d = perData, t = ["Ревизия против продаж, " + perLab(d.from, d.to), "Недостача: " + perMoney(d.short) + " ₽, излишек: " + perMoney(d.over) + " ₽", ""]
    .concat(d.rows.filter(r => !r.info && !r.miss && Math.abs(r.diff) > 1e-9).map(r => "— " + r.n + ": " + (r.diff < 0 ? "−" : "+") + mgrNum(r2(Math.abs(r.diff))) + " " + useU(r.u) + (r.money ? " (" + perMoney(r.money) + " ₽)" : ""))).join("\n");
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (err) {}
  e.target.textContent = ok ? "Скопировано ✓" : "Не скопировалось";
  setTimeout(() => { e.target.textContent = "Скопировать итог"; }, 1800);
}
$("usePer").addEventListener("change", () => { if (!$("usePer").value) return; perI = +$("usePer").value; perRange = null; buzz(8); perLoad(); });
["perFrom", "perTo"].forEach(id => $(id).addEventListener("change", () => {
  const f = $("perFrom").value, t = $("perTo").value;
  if (!f || !t || f > t) return;
  perRange = {from: f, to: t}; perI = null; buzz(8); perLoad();
}));

/* ── гостям: меню и «Состав и аллергены» из таблицы ──
   строка меню: [глава, глава EN, раздел, раздел EN, плитки, название, EN, описание, EN, объём, ед., цена, id в карте, код R-Keeper, скрыть, uid]
   строка карты: [раздел, id, название, EN, состав для гостей, EN, полный состав, аллергены, EN, объём подачи, фото, значок, на этикетке, только этикетка, скрыть] */
let pubRaw = null, pubMode = "menu", pubOpen = "", pubBusy = false, pubPr = null;
const PUB_HINT = {
  menu: "Нажмите на позицию — правка; «+ Добавить» — новая позиция в разделе. Новый раздел или главу — впишите их название в «Где в меню». Порядок и массовые правки — в таблице ревизии, лист «Меню».",
  card: "«Состав и аллергены» и этикетки. Полный состав — для этикетки, через точку с запятой. id новой позиции появится сам; на него ведёт QR-код этикетки. Разделы — лист «Карта разделы».",
  price: "Выгрузите из R-Keeper меню с ценами (прейскурант) в Excel или CSV. Сайт сопоставит блюда с меню — по коду R-Keeper или названию — и покажет, какие цены изменятся. Отметьте нужные и примените."};
const pubCardName = id => { const r = pubRaw && pubRaw.items.find(x => x[1] === id); return r ? r[2] : ""; };
const pubNum = v => typeof v === "number" ? v : /^\s*\d+([.,]\d+)?\s*$/.test(String(v)) ? parseFloat(String(v).replace(",", ".")) : v;

async function pubLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  $("pubWarn").textContent = "";
  if (!pubRaw) $("pubList").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  const d = await api({mgr: "pubraw", mk});
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    if (!pubRaw){ $("pubList").innerHTML = ""; $("pubEd").hidden = false; }        // иначе сообщение спрятано в пустой вкладке
    $("pubWarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="pubRetry">Повторить</button>';
    return;
  }
  $("pubSeed").hidden = !d.none; $("pubEd").hidden = !!d.none;
  if (d.none){ pubRaw = null; return; }
  pubRaw = d;
  if (!document.querySelector("#pubList form.pubf")) pubDraw();          // открытая форма — не стирать набранное
  if (d.warn) $("pubWarn").textContent = "Внимание: " + d.warn + " — верните заголовки в первой строке листа, иначе гости увидят прежнее меню.";
}
/* перенос: то, что сейчас в файлах сайта, — строками таблицы */
function pubSeedRows(){
  const P = PUB0, card = {};
  P.data.forEach(g => g.items.forEach(it => { card[it.id] = it; }));
  const menu = [];
  P.menu.forEach(c => c.secs.forEach(s => s.items.forEach(x => {
    const ci = x.c ? card[x.c] : null, en = x.c ? P.en[x.c] : null;
    menu.push([c.ru, c.en, s.ru, s.en, s.tiles ? "да" : "", x.n || (ci ? ci.n : ""), x.e || (en ? en[0] : "") || "", x.d || (ci ? ci.m || "" : ""),
      x.de || (x.d ? enWords(x.d) : "") || (en ? en[1] : "") || "", x.v == null ? "" : x.v, x.u === "pcs" ? "шт" : "", x.p, x.c || "", "", ""]);
  })));
  const items = [], groups = [];
  P.data.forEach(g => {
    const ge = P.gen[g.key] || [];
    groups.push([g.key, g.cat, g.short, g.rule || "", g.srok || "", g.store || "", g.serve ? "да" : "", g.nolabel ? "да" : "", ge[0] || "", ge[1] || "", ge[2] || ""]);
    g.items.forEach(it => { const e = P.en[it.id] || [];
      items.push([g.key, it.id, it.n, e[0] || "", it.m || "", e[1] || "", (it.c || []).join("; "), it.al || "", "", it.vol == null ? "" : it.vol,
        it.img || "", (typeof LICON !== "undefined" && LICON[it.id]) || "", it.ln || "", it.lo ? "да" : "", ""]); });
  });
  return {menu, items, groups};
}
async function pubPost(body){
  let d = null;
  try {
    const r = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(Object.assign({token: TOKEN, mk: mgrKey()}, body))});
    d = await r.json();
  } catch (e) { d = {error: "net"}; }
  if (d && d.error === "mgr"){ mgrExpired(); return null; }
  return d;
}
const pubErr = d => d && d.error === "action" ? "Нужна новая версия Apps Script." : d && d.error === "gone" ? "Этой строки в таблице уже нет — обновите." :
  d && d.error === "dup" ? "В таблице две строки с одним uid (строку скопировали) — нажмите «Обновить», uid исправятся." :
  d && d.error === "exists" ? "Листы уже есть в таблице." : d && d.error === "bad" ? "Проверьте поля." : "Не сохранилось — нет связи. Нажмите ещё раз.";
$("pubSeedGo").addEventListener("click", async () => {
  if (pubBusy) return;
  pubBusy = true; $("pubSeedGo").disabled = true; $("pubSeedMsg").textContent = "Переносим…";
  const d = await pubPost(Object.assign({mgr: "pubseed"}, pubSeedRows()));
  pubBusy = false; $("pubSeedGo").disabled = false;
  if (!d) return;
  if (!d.ok && d.error !== "exists"){ $("pubSeedMsg").textContent = pubErr(d); return; }
  $("pubSeedMsg").textContent = ""; buzz(14);
  pubFetch(); pubLoad();
});
function pubDraw(){
  document.querySelectorAll("#pubMode button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === pubMode)));
  $("pubHint").textContent = PUB_HINT[pubMode];
  $("pubQ").hidden = pubMode === "price"; $("pubFileL").hidden = pubMode !== "price";
  if (pubMode === "price") return pubPriceDraw();
  const q = $("pubQ").value.trim().toLowerCase().replace(/ё/g, "е"), hit = s => !q || String(s).toLowerCase().replace(/ё/g, "е").includes(q);
  let html = "";
  if (pubMode === "menu"){
    $("pubChs").innerHTML = [...new Set(pubRaw.menu.map(r => r[0]))].map(x => '<option value="' + esc(x) + '">').join("");
    $("pubSecs").innerHTML = [...new Set(pubRaw.menu.map(r => r[2]))].map(x => '<option value="' + esc(x) + '">').join("");
    const secs = [];
    pubRaw.menu.forEach(r => { const k = r[0] + "|" + r[2], s = secs[secs.length - 1]; if (!s || s.k !== k) secs.push({k, ch: r[0], sec: r[2], rows: [r]}); else s.rows.push(r); });
    secs.forEach((s, si) => {
      const rows = s.rows.filter(r => hit(r[5] + " " + r[6] + " " + pubCardName(r[12]) + " " + s.sec));
      if (q && !rows.length) return;
      html += '<section class="refsec"><h3 class="reft">' + esc(s.ch) + ' · ' + esc(s.sec) + '</h3><ul class="olist refl">' + rows.map(r => {
        const name = r[5] || pubCardName(r[12]) || "—", open = pubOpen === r[15];
        return '<li class="refli' + (open ? " open" : "") + (pubYes(r[14]) ? " pubhid" : "") + '"><button type="button" class="refrow" data-k="' + esc(r[15]) + '"><span class="refn">' + esc(name) + '</span>' +
          '<small>' + [r[9] !== "" ? esc(r[9]) + " " + (/^шт/i.test(r[10]) ? "шт" : "мл") : "", r[11] !== "" ? esc(r[11]) : '<em>нет цены</em>', r[12] ? "состав: " + esc(r[12]) : "", pubYes(r[14]) ? "<em>скрыто</em>" : ""].filter(Boolean).join(" · ") + '</small></button>' +
          (open ? pubMenuForm(r) : "") + '</li>';
      }).join("") +
        (pubOpen === "new:" + si ? '<li class="refli open">' + pubMenuForm(null, s, si) + '</li>' : '<li><button type="button" class="link pubadd" data-add="' + si + '">+ Добавить в «' + esc(s.sec) + '»</button></li>') + '</ul></section>';
    });
  } else {
    const gname = {};
    pubRaw.groups.forEach(g => { gname[g[0]] = g[1]; });
    const keys = [...new Set(pubRaw.groups.map(g => g[0]).concat(pubRaw.items.map(r => r[0])))];
    keys.forEach(k => {
      const rows = pubRaw.items.filter(r => r[0] === k && hit(r[2] + " " + r[3] + " " + r[4] + " " + r[1]));
      if (q && !rows.length) return;
      html += '<section class="refsec"><h3 class="reft">' + esc(gname[k] || k) + '</h3><ul class="olist refl">' + rows.map(r => {
        const open = pubOpen === "c:" + r[1];
        return '<li class="refli' + (open ? " open" : "") + (pubYes(r[14]) ? " pubhid" : "") + '"><button type="button" class="refrow" data-k="c:' + esc(r[1]) + '"><span class="refn">' + esc(r[2]) + '</span>' +
          '<small>' + [esc(r[1]), esc(r[7] || "аллергены не указаны"), pubYes(r[13]) ? "только этикетка" : "", pubYes(r[14]) ? "<em>скрыто</em>" : ""].filter(Boolean).join(" · ") + '</small></button>' +
          (open ? pubCardForm(r) : "") + '</li>';
      }).join("") +
        (pubOpen === "cnew:" + k ? '<li class="refli open">' + pubCardForm(null, k) + '</li>' : '<li><button type="button" class="link pubadd" data-cadd="' + esc(k) + '">+ Добавить в «' + esc(gname[k] || k) + '»</button></li>') + '</ul></section>';
    });
  }
  $("pubList").innerHTML = html || '<p class="empty">Ничего не найдено.</p>';
}
const pf = (id, label, val, attrs) => '<div><label class="label" for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val == null ? "" : val) + '" ' + (attrs || 'type="text"') + '></div>';
const pchk = (id, label, on) => '<label class="toggle pubchk"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '> ' + label + '</label>';
const psel = (id, label, opts, val) => '<div><label class="label" for="' + id + '">' + label + '</label><select id="' + id + '">' +
  (opts.includes(val) ? opts : opts.concat([val])).map(o => '<option value="' + esc(o) + '"' + (o === val ? " selected" : "") + '>' + esc(o || "—") + '</option>').join("") + '</select></div>';
function pubMenuForm(r, s){
  const x = r || [s.ch, (s.rows[0] || [])[1] || "", s.sec, (s.rows[0] || [])[3] || "", (s.rows[0] || [])[4] || "", "", "", "", "", "", (s.rows[0] || [])[10] || "", "", "", "", "", ""];
  const ids = [""].concat(pubRaw.items.map(i => i[1]));
  return '<form class="refed pubf" data-t="m" autocomplete="off" novalidate><div class="refgrid">' +
    pf("pmN", "Название", x[5], 'type="text" maxlength="120"' + (x[12] ? ' placeholder="' + esc(pubCardName(x[12])) + '"' : "")) + pf("pmE", "Название EN", x[6], 'type="text" maxlength="120"') +
    '</div>' + pf("pmD", "Описание", x[7]) + pf("pmDe", "Описание EN", x[8]) + '<div class="refgrid">' +
    pf("pmV", "Объём", x[9], 'type="text" inputmode="decimal" maxlength="20" placeholder="200"') + psel("pmU", "Ед.", ["мл", "шт"], /^шт/i.test(x[10]) ? "шт" : "мл") +
    pf("pmP", "Цена", x[11], 'type="text" inputmode="decimal" maxlength="20"') + psel("pmC", "Состав (id)", ids, x[12] || "") +
    '</div><details class="incmapd"><summary>Где в меню: ' + esc(x[0]) + ' · ' + esc(x[2]) + '</summary><div class="refgrid">' +
    pf("pmCh", "Глава", x[0], 'type="text" list="pubChs" maxlength="60"') + pf("pmChE", "Глава EN", x[1], 'type="text" maxlength="60"') +
    pf("pmS", "Раздел", x[2], 'type="text" list="pubSecs" maxlength="80"') + pf("pmSE", "Раздел EN", x[3], 'type="text" maxlength="80"') +
    '</div>' + pchk("pmT", "Раздел карточками с фото", pubYes(x[4])) + '</details>' +
    pchk("pmH", "Скрыть от гостей", pubYes(x[14])) +
    '<p class="warn" id="pubMsg" role="status"></p><div class="refbtns"><button type="submit" class="wogo">Сохранить</button>' +
    (r ? '<button type="button" class="link pubdel" data-del="1">Удалить</button>' : "") + '<button type="button" class="link" data-cancel="1">Отмена</button></div></form>';
}
function pubCardForm(r, key){
  const x = r || [key, "", "", "", "", "", "", "Не выявлены", "", "", "", "", "", "", ""];
  const photos = [""].concat(Object.keys(PHW).map(k => "photos/" + k + ".webp")), icons = [""].concat(typeof LART !== "undefined" ? Object.keys(LART).filter(k => k !== "vine" && k !== "corner") : []);
  return '<form class="refed pubf" data-t="c" autocomplete="off" novalidate>' +
    '<div><label class="label" for="pcG">Раздел</label><select id="pcG">' + pubRaw.groups.map(g => '<option value="' + esc(g[0]) + '"' + (g[0] === x[0] ? " selected" : "") + '>' + esc(g[1] || g[0]) + '</option>').join("") + '</select></div>' +
    '<div class="refgrid">' + pf("pcN", "Название", x[2], 'type="text" maxlength="120" required') + pf("pcNe", "Название EN", x[3], 'type="text" maxlength="120"') + '</div>' +
    pf("pcM", "Состав для гостей", x[4]) + pf("pcMe", "Состав EN", x[5]) +
    pf("pcC", "Состав на этикетке (через ;)", x[6]) + pf("pcA", "Аллергены", x[7]) + pf("pcAe", "Аллергены EN", x[8]) + '<div class="refgrid">' +
    pf("pcV", "Подача, мл", x[9], 'type="text" inputmode="numeric" maxlength="10"') + pf("pcL", "На этикетке", x[12], 'type="text" maxlength="40" placeholder="как название"') +
    psel("pcI", "Фото", photos, x[10] || "") + psel("pcK", "Значок", icons, x[11] || "") + '</div>' +
    pchk("pcLo", "Только для этикеток (гостям не показывать)", pubYes(x[13])) + pchk("pcH", "Скрыть", pubYes(x[14])) +
    '<p class="warn" id="pubMsg" role="status"></p><div class="refbtns"><button type="submit" class="wogo">Сохранить</button>' +
    (r ? '<button type="button" class="link pubdel" data-del="1">Удалить</button>' : "") + '<button type="button" class="link" data-cancel="1">Отмена</button></div></form>';
}
$("pubMode").addEventListener("click", e => {
  const b = e.target.closest("button[data-m]");
  if (!b || b.dataset.m === pubMode) return;
  pubMode = b.dataset.m; pubOpen = ""; buzz(8); pubDraw();
});
let pubT = 0;
$("pubQ").addEventListener("input", () => { clearTimeout(pubT); pubT = setTimeout(pubDraw, 120); });
$("pubWarn").addEventListener("click", e => { if (e.target.id === "pubRetry") pubLoad(); });
$("pubList").addEventListener("click", async e => {
  const b = e.target.closest("button.refrow");
  if (b){ pubOpen = pubOpen === b.dataset.k ? "" : b.dataset.k; buzz(8); return pubDraw(); }
  const a = e.target.closest("button[data-add], button[data-cadd]");
  if (a){ pubOpen = a.dataset.add != null ? "new:" + a.dataset.add : "cnew:" + a.dataset.cadd; return pubDraw(); }
  if (e.target.closest("[data-cancel]")){ pubOpen = ""; return pubDraw(); }
  const del = e.target.closest("[data-del]");
  if (del && !pubBusy){
    const isM = !pubOpen.startsWith("c:"), key = isM ? pubOpen : pubOpen.slice(2);
    if (!confirm(isM ? "Удалить позицию из меню? (Можно просто скрыть.)" : "Удалить позицию из «Состава»? QR-коды на этикетках перестанут на неё вести. (Можно просто скрыть.)")) return;
    pubBusy = true; $("pubMsg").textContent = "Удаляем…";
    const d = await pubPost({mgr: "pubset", t: isM ? "m" : "c", act: "del", key});
    pubBusy = false;
    if (!d) return;
    if (!d.ok){ $("pubMsg").textContent = pubErr(d); return; }
    pubOpen = ""; buzz(14); pubFetch(); pubLoad();
  }
});
$("pubList").addEventListener("submit", async e => {
  const f = e.target.closest("form.pubf");
  if (!f) return;
  e.preventDefault();
  if (pubBusy) return;
  const v = id => $(id).value.trim(), on = id => $(id).checked ? "да" : "";
  let body;
  if (f.dataset.t === "m"){
    const isNew = pubOpen.startsWith("new:"), r = isNew ? null : pubRaw.menu.find(x => x[15] === pubOpen);
    if (!v("pmN") && !v("pmC")){ $("pubMsg").textContent = "Впишите название или выберите ссылку на состав."; return; }
    if (!v("pmCh") || !v("pmS")){ $("pubMsg").textContent = "Укажите главу и раздел («Где в меню»)."; return; }
    const row = [v("pmCh"), v("pmChE"), v("pmS"), v("pmSE"), on("pmT"), v("pmN"), v("pmE"), v("pmD"), v("pmDe"), pubNum(v("pmV")), v("pmU") === "шт" ? "шт" : "",
      pubNum(v("pmP")), v("pmC"), r ? r[13] : "", on("pmH"), r ? r[15] : ""];
    let after = "";
    /* новая позиция — после последней в своём разделе; новый раздел — в конец своей главы (иначе — в конец меню) */
    if (isNew){ const same = pubRaw.menu.filter(x => x[15] && x[0] === row[0] && x[2] === row[2]), ch = pubRaw.menu.filter(x => x[15] && x[0] === row[0]);
      after = same.length ? same[same.length - 1][15] : ch.length ? ch[ch.length - 1][15] : ""; }
    body = {mgr: "pubset", t: "m", act: isNew ? "add" : "set", key: isNew ? "" : pubOpen, after, row, base: r || null};
  } else {
    const isNew = pubOpen.startsWith("cnew:"), id = isNew ? "" : pubOpen.slice(2);
    if (!v("pcN")){ $("pubMsg").textContent = "Впишите название."; return; }
    const row = [v("pcG"), id, v("pcN"), v("pcNe"), v("pcM"), v("pcMe"), v("pcC"), v("pcA") || "Не выявлены", v("pcAe"), pubNum(v("pcV")), v("pcI"), v("pcK"), v("pcL"), on("pcLo"), on("pcH")];
    let after = "";
    if (isNew){ const same = pubRaw.items.filter(x => x[1] && x[0] === row[0]); after = same.length ? same[same.length - 1][1] : ""; }
    body = {mgr: "pubset", t: "c", act: isNew ? "add" : "set", key: id, after, row, base: isNew ? null : pubRaw.items.find(x => x[1] === id) || null};
  }
  pubBusy = true; $("pubMsg").textContent = "Сохраняем…";
  const d = await pubPost(body);
  pubBusy = false;
  if (!d) return;
  if (!d.ok){ $("pubMsg").textContent = pubErr(d); return; }
  pubOpen = ""; buzz(14);
  pubFetch(); pubLoad();
});

/* цены из прейскуранта R-Keeper */
function pubPriceDraw(){
  if (!pubPr){ $("pubList").innerHTML = ""; return; }
  const ch = pubPr.ch;
  $("pubList").innerHTML = '<p class="mgrsum">' + esc(pubPr.cols) + '</p>' +
    '<p class="mgrsum">В файле позиций с ценой: <b>' + pubPr.n + '</b> · изменится цен: <b>' + ch.length + '</b> · без изменений ' + pubPr.same +
    (pubPr.bad ? ' · <span class="incg">цена не прочитана: ' + pubPr.bad + '</span>' : "") + (pubPr.miss.length ? ' · в меню не нашлось ' + pubPr.miss.length : "") + '</p>' +
    (ch.length ? '<ul class="olist incl">' + ch.map((c, i) => '<li class="' + (c.how === "guess" || c.how === "conflict" ? "inc-guess" : "inc-code") + '"><label class="row1"><span><span class="refn">' + esc(c.name) + '</span>' +
      '<small class="mgrwhy">' + esc(c.sec) + ' · ' + esc(String(c.old)) + ' → <b>' + esc(String(c.price)) + '</b>' +
        (c.how === "guess" ? " · похоже на «" + esc(c.fname) + "» — проверьте" : c.how === "conflict" ? " · в меню несколько «" + esc(c.fname) + "» — проверьте раздел" : c.how === "code" ? " · по коду" : "") + '</small></span>' +
      '<input type="checkbox" data-i="' + i + '"' + (c.on ? " checked" : "") + '></label></li>').join("") + '</ul>' +
      '<div class="refbtns"><button type="button" class="wogo" id="pubPrGo">Применить отмеченные</button><button type="button" class="link" id="pubPrX">Отмена</button></div>'
      : pubPr.n ? '<p class="empty">Все найденные цены в меню уже такие, как в файле.</p>' : '<p class="empty">В файле не нашлось ни одной цены — проверьте лист и столбец «Цена» (выше — какие столбцы взяты).</p>') +
    (pubPr.miss.length ? '<details class="incmapd"><summary>В меню не нашлось (' + pubPr.miss.length + ')</summary><p class="wnhint">' + pubPr.miss.map(esc).join(", ") + '</p></details>' : "");
}
/* шапка прайса: столбцы — по самому точному заголовку («Цена», не «Себестоимость»; «Наименование», не «Группа товаров») */
function pubHead(rows){
  const pick = (cells, good, any, not) => { let i = cells.findIndex(c => good.test(c) && !not.test(c)); if (i < 0) i = cells.findIndex(c => any.test(c) && !not.test(c)); return i; };
  for (let i = 0; i < Math.min(rows.length, 40); i++){
    const cells = rows[i].map(c => typeof c === "string" ? c.toLowerCase().replace(/\s+/g, " ").trim() : "");
    const n = pick(cells, /^(наименование|название|блюдо)( блюда)?$/, /наимен|блюдо|товар|назван/, /^код|групп|категор|раздел/);
    const p = pick(cells, /^цена( продажи| с ндс)?(, ?(₽|руб\.?|р\.?|₸|тг|тенге))?$/, /цена|стоимост/, /себестоим|закуп|сумм|^стоимость$/);
    if (n >= 0 && p >= 0) return {hr: i, n, p, c: pick(cells, /^код( блюда)?$/, /^код|артикул/, /групп/), hd: rows[i]};
  }
  return null;
}
const prNum = v => typeof v === "number" ? v : (x => isFinite(x) ? x : NaN)(parseFloat(String(v).replace(/[^\d.,\s-]/g, "").replace(/\s/g, "").replace(",", ".")));
$("pubFile").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f || !pubRaw) return;
  $("pubWarn").textContent = "Читаем файл…";
  pubPr = null; pubPriceDraw();
  let t;
  try { t = await readTable(f); }
  catch (err) { $("pubWarn").textContent = xErrText(err); return; }
  /* строки файла со всех видимых листов, где нашлась шапка */
  const lines = [];
  let cols = "";
  for (const sh of t.sheets.filter(x => !x.hidden)){
    const h = pubHead(sh.rows);
    if (!h) continue;
    if (!cols) cols = "Столбцы: название — «" + h.hd[h.n] + "», цена — «" + h.hd[h.p] + "»" + (h.c >= 0 ? ", код — «" + h.hd[h.c] + "»" : "") + ".";
    sh.rows.slice(h.hr + 1).forEach(r => lines.push({name: String(r[h.n] || "").trim(), raw: r[h.p], code: h.c >= 0 ? String(r[h.c] == null ? "" : r[h.c]).trim() : ""}));
  }
  if (!cols){ $("pubWarn").textContent = "Не нашёл в файле столбцы «Наименование» и «Цена»."; return; }
  $("pubWarn").textContent = "";
  const menu = pubRaw.menu.filter(r => r[15]).map(r => ({r, name: r[5] || pubCardName(r[12]), sec: r[2] || r[0], t: incTok(r[5] || pubCardName(r[12])), k: incNorm(r[5] || pubCardName(r[12]))}));
  let n = 0, bad = 0;
  const file = [];
  for (const x of lines){
    if (!x.name || /^(итог|всего)/i.test(x.name)) continue;
    const price = prNum(x.raw);
    if (x.raw === "" || x.raw == null) continue;                          // строка группы — без цены
    if (!(price > 0)){ bad++; continue; }
    n++; file.push(Object.assign(x, {price}));
  }
  /* сопоставление проходами по всему файлу: коды → точные названия (свободные строки меню) → похожие */
  const claim = new Map(), miss = [];
  const take = (x, m, how) => { if (!claim.has(m.r[15])) claim.set(m.r[15], {m, x, how}); else if (claim.get(m.r[15]).x.price !== x.price) claim.get(m.r[15]).how = "conflict"; x.done = 1; };
  file.forEach(x => { if (!x.code) return; const m = menu.find(y => String(y.r[13]).trim() !== "" && String(y.r[13]).trim() === x.code); if (m) take(x, m, "code"); });
  file.forEach(x => {
    if (x.done) return;
    const ms = menu.filter(y => y.k === incNorm(x.name) && !claim.has(y.r[15]));
    if (ms.length) take(x, ms[0], ms.length > 1 || menu.filter(y => y.k === incNorm(x.name)).length > 1 ? "conflict" : "name");
  });
  file.forEach(x => {
    if (x.done) return;
    const tk = incTok(x.name);
    let b1 = 0, b2 = 0, bi = null;
    menu.forEach(y => { if (claim.has(y.r[15])) return; const sc = incScore(tk, y.t); if (sc > b1){ b2 = b1; b1 = sc; bi = y; } else if (sc > b2) b2 = sc; });
    if (b1 >= 0.75 && b1 > b2) take(x, bi, "guess"); else miss.push(x.name);
  });
  const ch = [];
  let same = 0;
  for (const {m, x, how} of claim.values()){
    if (typeof m.r[11] === "string" && /\//.test(m.r[11])) continue;      // «350/890» — две цены, правится вручную
    if (+m.r[11] === x.price && how !== "conflict"){ same++; continue; }
    ch.push({uid: m.r[15], name: m.name, sec: m.sec, fname: x.name, old: m.r[11] === "" ? "нет цены" : m.r[11], price: x.price, code: how === "code" || how === "name" ? x.code : "", how, on: how === "code" || how === "name"});
  }
  pubPr = {ch, miss, n, same, bad, cols};
  pubPriceDraw();
});
$("pubList").addEventListener("change", e => {
  const c = e.target.closest("input[type=checkbox][data-i]");
  if (c && pubPr) pubPr.ch[+c.dataset.i].on = c.checked;
});
$("pubList").addEventListener("click", async e => {
  if (e.target.id === "pubPrX"){ pubPr = null; return pubPriceDraw(); }
  if (e.target.id !== "pubPrGo" || pubBusy || !pubPr) return;
  const rows = pubPr.ch.filter(c => c.on).map(c => ({uid: c.uid, price: c.price, code: c.code}));
  if (!rows.length) return;
  pubBusy = true; e.target.disabled = true;
  const d = await pubPost({mgr: "prices", rows});
  pubBusy = false; e.target.disabled = false;
  if (!d) return;
  if (!d.ok){ $("pubWarn").textContent = pubErr(d); return; }
  pubPr = null; buzz(14); pubFetch();
  await pubLoad();                                                       // pubLoad стирает сообщение — пишем после
  $("pubWarn").textContent = "Цены обновлены: " + d.n + (d.n < rows.length ? " из " + rows.length + " (часть строк меню изменилась — загрузите файл ещё раз)" : "") + ". Гости увидят их сразу.";
});

/* ── еженедельный отчёт ── предпросмотр письма (HTML с сервера, всё экранировано там), получатели, таймер */
let repData = null, repRange = "pw", repBusy = false;
function repPeriod(){
  if (repRange !== "tw") return {};
  const t = mgrToday(), dow = (new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7;
  return {from: mgrShift(t, -dow), to: t};
}
let repSeq = 0;
async function repLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  document.querySelectorAll("#repQuick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === repRange)));
  $("repMsg").textContent = "";
  $("repView").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  $("repSend").disabled = true;
  const seq = ++repSeq;
  const d = await api(Object.assign({mgr: "report", mk}, repPeriod()));
  if (seq !== repSeq) return;                                            // пока грузили, выбрали другую неделю
  if (d.error === "mgr") return mgrExpired();
  if (!d.ok){
    $("repView").innerHTML = "";
    $("repMsg").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)." : 'Нет связи с таблицей. <button type="button" class="link" id="repRetry">Повторить</button>';
    return;
  }
  repData = d;
  if (document.activeElement !== $("repTo")) $("repTo").value = (d.emails || []).join(", ");
  repAutoDraw();
  $("repView").innerHTML = d.html;
  $("repSend").disabled = false;
  $("repSend").textContent = "Отправить письмо за " + mgrRu(d.from).slice(0, 5) + " — " + mgrRu(d.to).slice(0, 5) + " сейчас";
}
function repAutoDraw(){
  const a = repData && repData.auto;
  $("repAuto").textContent = a === true ? "после ревизий и по понедельникам — включено" : a === false ? "выключено" : "";
  $("repToggle").textContent = a === true ? "Выключить письма" : "Включить письма";
}
const REP_AUTH = "Нет разрешения на почту или таймеры. Откройте Apps Script, выберите в списке функций вверху installWeeklyReport и нажмите «Выполнить» — Google спросит доступ; после этого всё заработает.";
async function repPost(body, btn){
  if (repBusy) return null;
  repBusy = true; if (btn) btn.disabled = true;
  let d = null;
  try {
    const r = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(Object.assign({token: TOKEN, mk: mgrKey()}, body))});
    d = await r.json();
  } catch (e) { d = {error: "net"}; }
  repBusy = false; if (btn) btn.disabled = false;
  if (d && d.error === "mgr"){ mgrExpired(); return null; }
  if (d && !d.ok) $("repMsg").textContent = d.error === "auth" ? REP_AUTH : d.error === "email" ? "Проверьте адреса: через запятую, не больше 10." :
    d.error === "action" ? "Нужна новая версия Apps Script." : d.error === "net" ? "Нет связи — попробуйте ещё раз." : "Не получилось: " + d.error;
  return d && d.ok ? d : null;
}
$("repSave").addEventListener("click", async () => {
  const d = await repPost({mgr: "reportset", emails: $("repTo").value}, $("repSave"));
  if (d){ perMail = null; perMailDraw(); }
  if (d){ $("repTo").value = d.emails.join(", "); $("repMsg").textContent = d.emails.length ? "Адреса сохранены." : "Адресов нет — письмо будет уходить владельцу таблицы."; buzz(14); }
});
$("repToggle").addEventListener("click", async () => {
  const on = !(repData && repData.auto === true);
  const d = await repPost({mgr: "reportauto", on: on ? "1" : "0"}, $("repToggle"));
  if (d){ perMail = null; perMailDraw(); }
  if (d){ repData.auto = d.auto; repAutoDraw(); $("repMsg").textContent = d.auto ? "Включено: письмо после каждой ревизии и каждый понедельник в 9:00." : "Выключено."; buzz(14); }
});
$("repSend").addEventListener("click", async () => {
  if (!repData) return;
  $("repMsg").textContent = "Отправляем…";
  const d = await repPost({mgr: "reportsend", from: repData.from, to: repData.to}, $("repSend"));
  if (d){ $("repMsg").textContent = "Отправлено: " + d.to + "."; buzz(14); }
});
$("repQuick").addEventListener("click", e => {
  const b = e.target.closest("button[data-r]");
  if (!b || b.dataset.r === repRange) return;
  repRange = b.dataset.r; buzz(8); repLoad();
});
$("repMsg").addEventListener("click", e => { if (e.target.id === "repRetry") repLoad(); });

/* ── продажи R-Keeper против ревизии ──
   sal = {kind, use (как во «Расходе»), ref (справочник), map: ключ блюда → {comps: [{ri, q}], none, src}, sales: [{name, code, qty}], open}
   Ключ блюда — код R-Keeper, иначе название. Расход на блюдо — в единицах позиции (40 мл джина = 0,04 л). */
let sal = null;
const nmKey = s => String(s).trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
const salKey = d => d.code ? "c:" + d.code : "n:" + nmKey(d.name);
const LAT = [["sh", "ш"], ["ch", "ч"], ["zh", "ж"], ["kh", "х"], ["ts", "ц"], ["ya", "я"], ["yu", "ю"], ["yo", "ё"]];
const LAT1 = {a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс", y: "и", z: "з"};
/* латиница → кириллица для сравнения названий («Beluga Noble» ~ «Белуга Нобл») */
const toCyr = s => { let t = String(s).toLowerCase(); for (const [a, b] of LAT) t = t.split(a).join(b); return t.replace(/[a-z]/g, c => LAT1[c]).replace(/(.)\1+/g, "$1"); };
const salU = u => { const s = String(u || "").trim().toLowerCase(); return s === "литр" || s === "л" || !s ? "л" : s === "кг" ? "кг" : s === "шт" ? "шт" : ""; };   // "" — бутылки («бут»)

/* лучшая позиция справочника для названия: однозначно лучшая и не ниже порога. Редкое слово весит больше частого:
   «Спиртной напиток «Сарти Роза»» — это «Сарти», а не чай «Роза» («роза» встречается в нескольких позициях) */
function salScore(a, b){
  if (!a.length || !b.length) return 0;
  const w = x => 1 / (1 + (sal.df[x] != null ? sal.df[x] : (sal.df[x] = sal.refTok.filter(t => t.some(y => incSame(x, y))).length)));
  const hits = a.filter(x => b.some(y => incSame(x, y)));
  return (hits.reduce((m, x) => m + w(x), 0) / a.reduce((m, x) => m + w(x), 0) + hits.length / b.length) / 2;
}
function salFind(name, thr){
  const tries = [incTok(name)];
  if (/[a-z]/i.test(name)) tries.push(incTok(toCyr(name)));
  let b1 = 0, b2 = 0, bi = -1;
  sal.refTok.forEach((t, i) => {
    const sc = Math.max(...tries.map(x => salScore(x, t)));
    if (sc > b1){ b2 = b1; b1 = sc; bi = i; } else if (sc > b2) b2 = sc;
  });
  return b1 >= thr && b1 > b2 ? bi : -1;
}
/* количество из техкарты (мл, гр, шт) — в единицах позиции */
function salConv(q, u, r){
  const iu = String(u || "").trim().toLowerCase(), pu = salU(r[2]), tara = mgrN(r[4]);
  if (pu === "л") return iu === "мл" ? q / 1000 : iu === "л" ? q : null;
  if (pu === "кг") return /^(г|гр)$/.test(iu) ? q / 1000 : iu === "кг" ? q : null;
  if (pu === "шт") return iu === "шт" ? q : null;
  return iu === "мл" && tara > 0 ? q / 1000 / tara : iu === "шт" ? q : null;   // бутылки
}
/* объём порции, мл: из названия блюда («… 0,5 л», «… 40 мл») или из меню */
function salVol(name){
  const m = String(name).match(/(\d+(?:[.,]\d+)?)\s*(мл|ml|л|l)(?![a-zа-яё])/i);   // \b в JS не видит кириллицу
  if (m){ const v = parseFloat(m[1].replace(",", ".")); return /^(мл|ml)$/i.test(m[2]) ? v : v * 1000; }
  const k = incNorm(name);
  for (const c of MENU) for (const sc of c.secs) for (const x of sc.items){
    const n = x.n || (x.c && cardItem(x.c) ? cardItem(x.c).n : "");
    if ((incNorm(n) === k || (x.e && incNorm(x.e) === k)) && typeof x.v === "number" && x.u !== "pcs") return x.v;
  }
  return 0;
}
/* подсказка расхода на блюдо: техкарта → позиции; иначе позиция с тем же названием (розлив, бутылки).
   Техкарта — только если её название целиком есть в названии блюда («Апероль 40 мл» — не «Апероль Спритц»). */
function salSuggest(d){
  const nk = incNorm(d.name), tk = incTok(d.name);
  let best = null, b1 = 0, b2 = 0;
  const own = /\d\s*(мл|ml|л|l)(?![a-zа-яё])/i.test(d.name) && salFind(d.name, 0.75) >= 0;   // порция позиции с объёмом в названии
  for (const k of (typeof KALL !== "undefined" ? KALL : [])){
    if (own || k.out || !Array.isArray(k.i)) continue;
    const kt = incTok(k.n), full = kt.length && kt.every(x => tk.some(y => incSame(x, y)));
    const sc = incNorm(k.n) === nk ? 1 : full ? 0.8 + kt.length / 100 : 0;
    if (sc > b1){ b2 = b1; b1 = sc; best = k; } else if (sc > b2) b2 = sc;
  }
  if (best && b1 >= 0.75 && b1 > b2){
    const comps = [], miss = [];
    for (const [ing, q, u] of best.i){
      const ri = salFind(ing, 0.4), qq = ri >= 0 ? salConv(mgrN(q), u, sal.ref[ri]) : null;
      if (ri < 0 || !(qq > 0)){ miss.push(ing); continue; }
      const same = comps.find(c => c.ri === ri);
      if (same) same.q += qq; else comps.push({ri, q: qq});
    }
    if (comps.length) return {comps, miss, src: "техкарта «" + best.n + "»"};
  }
  const ri = salFind(d.name, 0.6);
  if (ri >= 0){
    const r = sal.ref[ri], pu = salU(r[2]), tara = mgrN(r[4]), vol = salVol(d.name);
    /* бутылки (ед. пусто): тара — объём бутылки в литрах; без тары целой бутылкой считается только объём от 250 мл (пиво, банка),
       порция 40 мл без тары — «задайте тару», а не 1 бутылка */
    const q = pu === "л" ? (vol ? vol / 1000 : 0) : pu === "кг" ? 0 : pu === "шт" ? 1
      : tara > 0 ? (vol ? (Math.abs(tara * 1000 - vol) <= 1 ? 1 : vol / 1000 / tara) : 0) : vol >= 250 ? 1 : 0;
    if (q > 0) return {comps: [{ri, q}], miss: [], src: "по названию" + (vol ? ", " + vol + " мл" : "")};
  }
  return null;
}

/* период продаж: «rev» — последний период ревизии (те же смены, что во «Расходе»), иначе даты «с» / «по» */
let salPer = {r: "rev", from: "", to: ""};
const salPerQ = () => salPer.r === "rev" ? {per: "rev"} : {from: salPer.from, to: salPer.to};
async function salLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  if (!$("salWarn").textContent) $("salWarn").textContent = "Загрузка…";
  const [r, m, sl, z] = await Promise.all([api({mgr: "ref", mk}), api({mgr: "dishes", mk}), api(Object.assign({mgr: "sales", mk}, salPerQ())), api({mgr: "zags", mk})]);
  if ([r, m, sl, z].some(x => x.error === "mgr")) return mgrExpired();
  if (![r, m, sl, z].every(x => x.ok)){
    $("salWarn").innerHTML = [r, m, sl, z].some(x => x.error === "action") ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)." : 'Нет связи с таблицей. <button type="button" class="link" id="salRetry">Повторить</button>';
    return;
  }
  const typing = !!document.querySelector("#salDish form.salf, #salZag form.salf");
  salPerDraw(sl);
  sal = {ref: r.rows, refTok: r.rows.map(x => incTok(x[1])), df: {}, map: {}, zag: {}, sales: sl.dishes, days: sl.days, since: sl.since, per: sl,
    open: typing && sal ? sal.open : "", zopen: typing && sal ? sal.zopen : "", okOpen: sal && sal.okOpen, zokOpen: sal && sal.zokOpen};
  /* «Расход на блюдо»: позиция — по разделу и названию, а без раздела — по одному названию, если оно в справочнике одно.
     Строку, позиция которой не нашлась, не считаем заданной — блюдо останется «расход не задан», а менеджер увидит, что поправить. */
  const at = {}, byN = {};
  r.rows.forEach((x, i) => { at[nmKey(x[0]) + "|" + nmKey(x[1])] = i; byN[nmKey(x[1])] = nmKey(x[1]) in byN ? -1 : i; });
  const find = (sec, n) => { let ri = at[nmKey(sec) + "|" + nmKey(n)]; if (ri == null && !String(sec).trim() && byN[nmKey(n)] >= 0) ri = byN[nmKey(n)]; return ri; };
  const bad = new Set(), codes = {};
  for (const row of m.rows){
    if (row[1]) (codes[nmKey(row[0])] = codes[nmKey(row[0])] || new Set()).add(String(row[1]));
    const k = row[1] ? "c:" + row[1] : "n:" + nmKey(row[0]);
    if (/^[—–-]$/.test(String(row[3]).trim())){ (sal.map[k] = sal.map[k] || {comps: [], none: false, src: row[6] || "", name: row[0]}).none = true; continue; }
    const ri = find(row[2], row[3]);
    if (ri == null || !(mgrN(row[4]) > 0)){ bad.add(row[0] + " → «" + row[3] + "»"); continue; }
    (sal.map[k] = sal.map[k] || {comps: [], none: false, src: row[6] || "", name: row[0]}).comps.push({ri, q: mgrN(row[4])});
  }
  /* по названию — тоже, но только если у этого названия один код (у «Hendrick's» 40 мл и бутылки навынос — разные расходы) */
  m.rows.forEach(row => { const n = nmKey(row[0]); if (row[1] && !sal.map["n:" + n] && codes[n].size === 1 && sal.map["c:" + row[1]]) sal.map["n:" + n] = sal.map["c:" + row[1]]; });
  /* рецепты заготовок: заготовка (раздел|название) → {comps: [{ri, q}], src} */
  for (const row of z.rows){
    const zi = find(row[0], row[1]), ri = find(row[2], row[3]);
    if (zi == null || ri == null || !(mgrN(row[4]) > 0)){ bad.add("заготовка " + row[1] + " → «" + row[3] + "»"); continue; }
    (sal.zag[zi] = sal.zag[zi] || {comps: [], src: row[6] || ""}).comps.push({ri, q: mgrN(row[4])});
  }
  sal.bad = [...bad];
  $("salRefs").innerHTML = r.rows.map(x => '<option value="' + esc(incLabel(x)) + '">').join("");
  if (/^Загрузка/.test($("salWarn").textContent)) $("salWarn").textContent = "";
  if (sal.bad.length) $("salWarn").textContent = sal.bad.length ? "В листах «Расход на блюдо» и «Рецепты заготовок» не нашлись позиции (поправьте название и раздел как в справочнике): " + sal.bad.join("; ") + "." : "";
  salDaysDraw();
  if (!typing){ salDraw(); zagDraw(); }                                  // открыта форма — набранное не стирать
}
const salWd = iso => ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(iso + "T00:00:00Z").getUTCDay()];
function salPerDraw(sl){
  if (salPer.r === "rev" || !salPer.from){ $("salPF").value = sl.from || ""; $("salPT").value = sl.to || ""; }
  document.querySelectorAll("#salQuick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === salPer.r)));
  $("salPerLab").textContent = (sl.label || (sl.from ? mgrRu(sl.from).slice(0, 5) + " — " + (sl.to ? mgrRu(sl.to).slice(0, 5) : "сегодня") : "")) +
    " · " + mgrNum(Math.round(sl.qty || 0)) + " порц." + (sl.sum ? " · " + mgrNum(sl.sum) + " ₽" : "");
}
$("salQuick").addEventListener("click", e => {
  const b = e.target.closest("button[data-r]");
  if (!b) return;
  if (b.dataset.r === "rev") salPer = {r: "rev", from: "", to: ""};
  else { const [f, t] = mgrRange(b.dataset.r); salPer = {r: b.dataset.r, from: f, to: t}; $("salPF").value = f; $("salPT").value = t; }
  buzz(8); salLoad();
});
["salPF", "salPT"].forEach(id => $(id).addEventListener("change", () => {
  const f = $("salPF").value, t = $("salPT").value;
  if (!f || !t || f > t) return;
  salPer = {r: "", from: f, to: t}; salLoad();
}));
function salDaysDraw(){
  const D = (sal.days || []).slice(0, 14);
  $("salSrc").textContent = D.length ? "загружено по " + salWd(D[0].iso) + " " + mgrRu(D[0].iso).slice(0, 5) : "";
  $("salDays").innerHTML = D.length ? "" : '<p class="wnhint">Продаж ещё нет — загрузите отчёт R-Keeper.</p>';
}
$("salWarn").addEventListener("click", e => { if (e.target.id === "salRetry") salLoad(); });

/* дата ячейки: ГГГГ-ММ-ДД (Excel) или ДД.ММ.ГГГГ (CSV); не дата — "" */
const salDate = v => { const s = String(v == null ? "" : v).trim(); let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?!\d)/); return m ? incIso(m[1], m[2], m[3]) : ""; };
/* дата из названия файла: «Продажи 15.10.2026.xlsx», «15-10-26», «2026-10-15» */
const salFileDate = n => { let m = String(n).match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = String(n).match(/(?:^|[^\d])(\d{1,2})[-_.](\d{1,2})[-_.](\d{4}|\d{2})(?!\d)/); return m ? incIso(m[1], m[2], m[3]) : ""; };
const SAL_DRE = /(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)|(\d{4})-(\d{2})-(\d{2})/g;
/* один файл отчёта → {name, dated: [{iso, name, code, qty, sum}], undated: [{name, code, qty, sum}], hdr: [даты в шапке], fn: дата из названия, err}.
   Дата строки — из столбца «Дата» / «Смена» или из строки-заголовка группы с датой; все видимые листы, у каждого своя шапка */
async function salParse(f){
  let t;
  try { t = await readTable(f); } catch (err) { return {name: f.name, err: xErrText(err)}; }
  const by = {}, one = {}, tops = [];
  let found = 0;
  for (const sh of t.sheets.filter(x => !x.hidden)){
    const rows = sh.rows, mp = salHead(rows);
    if (!mp) continue;
    found++;
    tops.push(rows.slice(0, mp.hr).map(r => r.filter(c => c !== "").join(" ")).join(" "));
    const data = rows.slice(mp.hr + 1);
    const coded = mp.c >= 0 && data.filter(r => typeof r[mp.q] === "number").filter(r => String(r[mp.c] || "").trim()).length >= 0.7 * data.filter(r => typeof r[mp.q] === "number").length;
    let cur = "";
    for (const row of data){
      const name = String(row[mp.n] || "").trim(), qty = row[mp.q], code = mp.c >= 0 ? String(row[mp.c] || "").trim() : "";
      const dCol = mp.d >= 0 ? salDate(row[mp.d]) : "";
      if (dCol) cur = dCol;
      else if (typeof qty !== "number"){ const g = row.map(salDate).find(Boolean); if (g){ cur = g; continue; } }   // «09.10.2026» над блюдами дня
      if (!name || typeof qty !== "number" || !qty || /^(итог|всего|total)/i.test(name)) continue;
      if (coded && !code) continue;                                      // строка группы с подытогом — без кода
      if (salDate(name)) continue;
      const k = salKey({name, code}), sum = mp.s >= 0 && typeof row[mp.s] === "number" ? row[mp.s] : 0, box = cur ? by : one, kk = cur ? cur + "|" + k : k;
      if (box[kk]){ box[kk].qty += qty; box[kk].sum += sum; } else box[kk] = Object.assign(cur ? {iso: cur} : {}, {name, code, qty, sum});   // возврат (−) вычитается
    }
  }
  if (!found) return {name: f.name, err: "не нашёл столбцы «Наименование» (блюдо) и «Количество»"};
  const hdr = [...new Set([...tops.join(" ").matchAll(SAL_DRE)].map(x => x[1] ? incIso(x[1], x[2], x[3]) : x[4] + "-" + x[5] + "-" + x[6]))];
  const r = {name: f.name, dated: Object.values(by).filter(x => x.qty), undated: Object.values(one).filter(x => x.qty), hdr, fn: salFileDate(f.name)};
  if (!r.dated.length && !r.undated.length) r.err = "нет строк с блюдами и количеством";
  else if (r.dated.length && r.undated.length) r.err = "у части строк нет даты — выгрузите с датой у каждой строки или по дню на файл";
  else if (!r.dated.length && r.hdr.length > 1) r.err = "за несколько дней без разбивки по дням — выгрузите по дням или каждый день отдельно";
  return r;
}
/* несколько файлов сразу (до 15): у каждого — день(дни); где дата не нашлась — выбрать. Нажали день в календаре — он для файлов без даты */
let salPick = null, salKnown = null, salWork = [4, 5, 6, 0], salForce = "", salCalM = "";
$("salFile").addEventListener("change", async e => {
  const fs = [...(e.target.files || [])];
  e.target.value = "";
  if (!fs.length) return;
  const force = salForce; salForce = "";
  if (fs.length > 15){ $("salWarn").textContent = "Не больше 15 файлов за раз."; return; }
  salPick = null; $("salPick").hidden = true; $("salPick").innerHTML = "";
  $("salWarn").textContent = "Читаем " + mgrPl(fs.length, "файл", "файла", "файлов") + "…";
  const files = [];
  for (const f of fs) files.push(await salParse(f));
  files.forEach(x => {
    if (x.err || x.dated.length) return;
    x.day = force || (x.hdr.length === 1 ? x.hdr[0] : "") || x.fn || "";
    x.src = force ? "день из календаря" : x.hdr.length === 1 ? "дата из отчёта" : x.fn ? "дата из названия" : "";
  });
  $("salWarn").textContent = "";
  salPick = {files};
  salPickDraw();
});
const salKnownDay = d => (salKnown || (sal && sal.days) || []).find(x => x.iso === d) || (perData && perData.sales && perData.sales.have.indexOf(d) >= 0 ? {qty: NaN} : null);
function salPickDraw(){
  const P = salPick, ok = P.files.filter(x => !x.err), dd = iso => salWd(iso) + " " + mgrRu(iso).slice(0, 5);
  const days = {};
  ok.forEach(x => (x.dated.length ? [...new Set(x.dated.map(r => r.iso))] : x.day ? [x.day] : []).forEach(d => { days[d] = (days[d] || 0) + 1; }));
  const q = x => mgrNum(Math.round((x.dated.length ? x.dated : x.undated).reduce((a, r) => a + r.qty, 0)));
  $("salPick").hidden = false;
  $("salPick").innerHTML = '<p class="label saldl">' + (P.files.length > 1 ? "Файлы — проверьте дни и сохраните" : "Проверьте день и сохраните") + '</p><ul class="salfiles">' + P.files.map((x, i) => '<li' + (x.err ? ' class="salferr"' : "") + '><span class="salfn">' + esc(x.name) + '</span>' +
    (x.err ? '<small class="warn">' + esc(x.err) + '</small>' :
      '<small class="mgrwhy">' + q(x) + ' порц.' + (x.dated.length ? ' · по дням: ' + [...new Set(x.dated.map(r => r.iso))].sort().map(dd).join(", ") : "") + '</small>' +
      (x.dated.length ? "" : '<label class="salfd">День смены <input type="date" data-i="' + i + '" value="' + (x.day || "") + '" max="' + mgrToday() + '"></label>' +
        '<small class="mgrwhy">' + (x.day ? (x.src ? x.src : "") + (salKnownDay(x.day) ? (x.src ? " · " : "") + "за этот день уже загружено — заменится" : "") + (days[x.day] > 1 ? " · ещё файл за этот день — сложатся" : "") : '<b class="salneed">выберите день</b>') + '</small>')) + '</li>').join("") + '</ul>' +
    '<p class="warn" id="salPickMsg" role="status"></p><div class="refbtns"><button type="button" class="wogo" id="salDayGo"' + (ok.length ? "" : " disabled") + '>Сохранить' + (ok.length > 1 ? " (" + mgrPl(ok.length, "файл", "файла", "файлов") + ")" : " продажи") + '</button><button type="button" class="link" id="salDayX">Отмена</button></div>';
}
$("salPick").addEventListener("change", e => {
  const i = e.target.dataset.i;
  if (i == null || !salPick) return;
  salPick.files[+i].day = e.target.value; salPick.files[+i].src = "";
  salPickDraw();
});
$("salPick").addEventListener("click", async e => {
  if (e.target.id === "salDayX"){ salPick = null; $("salPick").hidden = true; $("salPick").innerHTML = ""; return; }
  if (e.target.id !== "salDayGo" || !salPick) return;
  const ok = salPick.files.filter(x => !x.err), need = ok.filter(x => !x.dated.length && !(/^\d{4}-\d{2}-\d{2}$/.test(x.day) && x.day <= mgrToday()));
  if (need.length){ $("salPickMsg").textContent = "Выберите день смены (не позже сегодня): " + need.map(x => x.name).join(", "); return; }
  const rows = [];
  ok.forEach(x => { if (x.dated.length) rows.push(...x.dated); else x.undated.forEach(r => rows.push(Object.assign({iso: x.day}, r))); });
  e.target.disabled = true;
  if (await salPut(ok.map(x => x.name).join(", ").slice(0, 120), rows)){ salPick = null; $("salPick").hidden = true; $("salPick").innerHTML = ""; }
  else e.target.disabled = false;
});
const salKnownLoad = () => mgrKey() && api({mgr: "sales", mk: mgrKey(), per: "rev"}).then(x => { if (x && x.ok){ salKnown = x.days; salWork = x.work || salWork; salCalDraw(); if (salPick) salPickDraw(); } });
$("stepSal").addEventListener("toggle", () => { if ($("stepSal").open) salKnownLoad(); });
/* календарь месяца: загружено — выручка (порции), рабочий день без продаж — красным; нажать на день — загрузить за него */
const salShort = x => x >= 1e6 ? mgrNum(Math.round(x / 1e5) / 10) + "м" : x >= 1000 ? Math.round(x / 1000) + "к" : String(Math.round(x));
const SAL_MON = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
function salCalDraw(){
  const by = {}, list = salKnown || [];
  list.forEach(x => { by[x.iso] = x; });
  const today = mgrToday(), m = salCalM || today.slice(0, 7), [y, mo] = m.split("-").map(Number);
  const n = new Date(Date.UTC(y, mo, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
  const first = list.length ? list[list.length - 1].iso : today;           // раньше первой загрузки — не «пропуск»
  let cells = "", sum = 0, qty = 0, nd = 0, miss = 0;
  for (let i = 0; i < lead; i++) cells += '<span class="scal0"></span>';
  for (let d = 1; d <= n; d++){
    const iso = m + "-" + String(d).padStart(2, "0"), x = by[iso], wd = new Date(iso + "T00:00:00Z").getUTCDay();
    const cls = x ? "has" : iso > today ? "fut" : salWork.indexOf(wd) >= 0 && iso >= first ? "miss" : "";
    if (x){ sum += x.sum; qty += x.qty; nd++; }
    if (cls === "miss") miss++;
    cells += '<button type="button" class="scal ' + cls + '" data-day="' + iso + '"' + (iso > today ? " disabled" : "") + ' aria-label="' + d + " " + SAL_MON[mo - 1] + (x ? ", " + Math.round(x.qty) + " порций" : "") + '"><b>' + d + '</b>' +
      (x ? '<small>' + (x.sum ? salShort(x.sum) : Math.round(x.qty) + "п") + '</small>' : cls === "miss" ? '<small>нет</small>' : "") + '</button>';
  }
  $("salCal").innerHTML = '<div class="scalh"><button type="button" class="link" data-m="-1" aria-label="Прошлый месяц">‹</button><b>' + SAL_MON[mo - 1] + " " + y + '</b>' +
    '<button type="button" class="link" data-m="1" aria-label="Следующий месяц"' + (m >= today.slice(0, 7) ? " disabled" : "") + '>›</button></div>' +
    '<p class="wnhint scals">' + (nd ? "Загружено дней: " + nd + " · " + mgrNum(Math.round(qty)) + " порц." + (sum ? " · " + mgrNum(Math.round(sum)) + " ₽" : "") : "За этот месяц продаж нет") +
      (miss ? ' · <b class="salneed">рабочих дней без продаж: ' + miss + '</b>' : "") + '. Нажмите на день — загрузить за него.</p>' +
    '<div class="scalw">' + ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(x => '<span>' + x + '</span>').join("") + '</div><div class="scalg">' + cells + '</div>';
}
$("salCal").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.m){ const [y, mo] = (salCalM || mgrToday().slice(0, 7)).split("-").map(Number), t = new Date(Date.UTC(y, mo - 1 + +b.dataset.m, 1)); salCalM = t.toISOString().slice(0, 7); return salCalDraw(); }
  if (b.dataset.day){ salForce = b.dataset.day; buzz(8); $("salFile").click(); }
});
/* сохранить строки {iso, name, code, qty, sum} — дни целиком заменяются */
async function salPut(file, list){
  const days = [...new Set(list.map(x => x.iso))].sort();
  $("salWarn").textContent = "Сохраняем продажи за " + days.length + " " + mgrPl(days.length, "день", "дня", "дней").replace(/^\d+ /, "") + "…";
  const d = await pubPost({mgr: "salesput", file, days, rows: list.map(x => [x.iso, x.code, x.name, Math.round(x.qty * 1000) / 1000, Math.round(x.sum * 100) / 100])});
  if (!d) return false;
  if (!d.ok){ $("salWarn").textContent = pubErr(d); return false; }
  buzz(14);
  perData = null;                                                         // «Расход» пересчитается
  $("salWarn").textContent = "Сохранено: " + days.map(x => salWd(x) + " " + mgrRu(x).slice(0, 5)).join(", ") + " — " + mgrPl(list.length, "строка", "строки", "строк") + ". Расчёт периода обновлён.";
  salKnown = null; salKnownLoad();
  if (mgrGrp === "per") perLoad(); else await salLoad();
  return true;
}

/* шапка отчёта: название блюда — по самому точному заголовку (не «Код блюда», не «Группа блюд»); среди равных — где больше разных значений */
function salHead(rows){
  for (let i = 0; i < Math.min(rows.length, 40); i++){
    const c = rows[i].map(x => typeof x === "string" ? x.toLowerCase().replace(/\s+/g, " ").trim() : "");
    const q = c.findIndex(x => /^кол|количеств|порц/.test(x));
    const cand = c.map((x, j) => ({x, j})).filter(o => o.j !== q && /наимен|блюд|товар|назван/.test(o.x) && !/^код|групп|категор|раздел/.test(o.x));
    if (q < 0 || !cand.length) continue;
    const rank = o => (/^(блюдо|наименование( блюда)?|название( блюда)?)$/.test(o.x) ? 2 : 0) + new Set(rows.slice(i + 1, i + 200).map(r => r[o.j])).size / 1e4;
    const n = cand.sort((a, b) => rank(b) - rank(a))[0].j;
    return {hr: i, n, q, c: c.findIndex(x => /^код( блюда)?$|^код\s*r/.test(x)), s: c.findIndex(x => /сумм|выручк/.test(x) && !/ндс|скидк/.test(x)),
      d: c.findIndex(x => /^(дата|день)|смен/.test(x) && !/время|открыт|закрыт/.test(x))};
  }
  return null;
}
const salMapOf = d => sal.map[salKey(d)] || sal.map["n:" + nmKey(d.name)] || null;
const salCompTxt = comps => comps.map(c => { const r = sal.ref[c.ri]; return mgrNum(Math.round(c.q * 10000) / 10000) + " " + useU(r[2]) + " " + r[1]; }).join(" + ");
function salDraw(){
  if (!sal) return;
  if (!sal.sales.length){ $("salDish").innerHTML = '<p class="empty">За этот период продаж нет — загрузите отчёт R-Keeper или выберите другой период.</p>'; return; }
  const ds = sal.sales.map(d => Object.assign({}, d, {m: salMapOf(d)}));
  ds.forEach(d => { if (!d.m) d.sug = salSuggest(d); });
  const ok = ds.filter(d => d.m), sug = ds.filter(d => !d.m && d.sug), no = ds.filter(d => !d.m && !d.sug);
  const line = d => {
    const key = salKey(d), open = sal.open === key, st = d.m ? (d.m.none ? "не учитывается" : salCompTxt(d.m.comps)) : d.sug ? salCompTxt(d.sug.comps) : "";
    return '<li class="' + (d.m ? "inc-code" : d.sug ? "inc-guess" : "inc-no") + '"><div class="incr"><span class="refn">' + esc(d.name) + (d.code ? ' <small>код ' + esc(d.code) + '</small>' : "") + '</span>' +
      '<small class="mgrwhy">продано ' + mgrNum(d.qty) + (st ? ' · <b>' + esc(st) + '</b>' : ' · <b>расход не задан</b>') +
        (d.sug && !d.m ? ' · ' + esc(d.sug.src) + (d.sug.miss.length ? " (без: " + esc(d.sug.miss.join(", ")) + ")" : "") : "") + '</small>' +
      (open ? salForm(d) : '<div class="salbtns">' + (d.sug && !d.m && !d.sug.miss.length ? '<button type="button" class="link" data-ok="' + esc(key) + '">Верно</button>' : "") +
        '<button type="button" class="link" data-ed="' + esc(key) + '">' + (d.m || d.sug ? "Изменить" : "Задать расход") + '</button>' +
        (!d.m || !d.m.none ? '<button type="button" class="link" data-no="' + esc(key) + '">Не учитывать</button>' : "") + '</div>') + '</div></li>';
  };
  const full = sug.filter(d => !d.sug.miss.length);
  $("salDish").innerHTML = '<div class="result tcard mgrt"><div class="tname"><em>' + esc($("salPerLab").textContent.split(" · ")[0]) + '</em><h3>Расход на блюдо</h3></div>' +
    '<p class="mgrsum salsum">Блюд: <b>' + ds.length + '</b> · продано порций ' + mgrNum(Math.round(ds.reduce((a, d) => a + d.qty, 0))) + ' · расход задан у ' + ok.length +
      (sug.length ? ' · <span class="incg">предложено ' + sug.length + '</span>' : "") + (no.length ? ' · не задан у ' + no.length : "") + '</p>' +
    (full.length ? '<div class="refbtns salall"><button type="button" class="wogo" id="salOkAll">Подтвердить все предложенные (' + full.length + ')</button></div>' : "") +
    (sug.length || no.length ? '<ul class="olist incl">' + sug.concat(no).map(line).join("") + '</ul>' : "") +
    (ok.length ? '<details class="incmapd salok"' + (sal.okOpen || ok.some(d => salKey(d) === sal.open) ? " open" : "") + '><summary>Расход задан (' + ok.length + ')</summary><ul class="olist incl">' + ok.map(line).join("") + '</ul></details>' : "") +
    '<p class="warn" id="salMsg" role="status"></p></div>';
}
function salForm(d, zag){
  const cur = zag ? (d.m ? d.m.comps : d.sug ? d.sug.comps : []) : d.m && !d.m.none ? d.m.comps : d.sug ? d.sug.comps : [];
  const rows = (cur.length ? cur : [{ri: -1, q: 0}]).map(c => '<div class="salc"><input type="text" list="salRefs" data-f="p" value="' + (c.ri >= 0 ? esc(incLabel(sal.ref[c.ri])) : "") + '" placeholder="Позиция справочника" aria-label="Позиция">' +
    '<input type="text" inputmode="decimal" data-f="q" value="' + (c.q ? mgrNum(Math.round(c.q * 100000) / 100000) : "") + '" placeholder="0,04" aria-label="Сколько"></div>').join("");
  return '<form class="salf" data-k="' + esc(zag ? "z" + d.ri : salKey(d)) + '"><p class="wnhint">' + (zag ? "Сколько каждой позиции уходит на 1 " + esc(useU(sal.ref[d.ri][2])) + " заготовки — в единицах позиции (300 г сахара = 0,3 кг; 400 мл воды не нужно)."
    : "Сколько каждой позиции уходит на одно блюдо — в единицах позиции (40 мл = 0,04 л; штука = 1).") + '</p>' + rows +
    '<button type="button" class="link" data-addc="1">+ позиция</button><div class="refbtns"><button type="submit" class="wogo">Сохранить</button><button type="button" class="link" data-cx="1">Отмена</button></div></form>';
}
async function salSave(list){
  const d = await pubPost({mgr: "dishset", dishes: list});
  if (!d) return false;
  if (!d.ok){ $("salMsg").textContent = pubErr(d); return false; }
  list.forEach(x => {
    const e = {comps: x.none ? [] : x.ri, none: !!x.none, src: x.src, name: x.name};
    sal.map[x.code ? "c:" + x.code : "n:" + nmKey(x.name)] = e;
    const other = sal.sales.some(d => nmKey(d.name) === nmKey(x.name) && d.code !== x.code);   // то же название с другим кодом — не смешивать
    if (!other) sal.map["n:" + nmKey(x.name)] = e;
  });
  buzz(14); perData = null;
  return true;
}
const salDishOf = key => sal.sales.find(d => salKey(d) === key);
const salPack = (d, comps, src, none) => ({name: d.name, code: d.code, src, none: !!none,
  comps: (comps || []).map(c => ({sec: sal.ref[c.ri][0], n: sal.ref[c.ri][1], q: c.q, u: sal.ref[c.ri][2] || "литр"})), ri: comps || []});
/* строки формы → [{ri, q}] или текст ошибки */
function salFormComps(f){
  const comps = [];
  for (const row of f.querySelectorAll(".salc")){
    const p = row.querySelector('[data-f="p"]').value.trim(), q = mgrN(row.querySelector('[data-f="q"]').value);
    if (!p && !q) continue;
    const ri = sal.ref.findIndex(x => incLabel(x) === p);
    if (ri < 0 || !(q > 0)) return "Выберите позицию из списка и укажите количество числом (0,04).";
    const same = comps.find(c => c.ri === ri);
    if (same) same.q += q; else comps.push({ri, q});
  }
  return comps;
}
function salAddRow(b){
  const f = b.closest("form"), row = f.querySelector(".salc").cloneNode(true);
  row.querySelectorAll("input").forEach(i => { i.value = ""; });
  b.before(row); row.querySelector("input").focus();
}
$("salDish").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b || !sal) return;
  if (b.id === "salOkAll"){
    const list = sal.sales.filter(d => !salMapOf(d)).map(d => ({d, s: salSuggest(d)})).filter(x => x.s && !x.s.miss.length).map(x => salPack(x.d, x.s.comps, x.s.src));
    b.disabled = true;
    if (await salSave(list)) salDraw(); else b.disabled = false;
    return;
  }
  if (b.dataset.ok){ const d = salDishOf(b.dataset.ok), s = d && salSuggest(d); if (s && await salSave([salPack(d, s.comps, s.src)])) salDraw(); return; }
  if (b.dataset.no){ const d = salDishOf(b.dataset.no); if (d && await salSave([salPack(d, [], "вручную", true)])) salDraw(); return; }
  if (b.dataset.ed){ sal.open = b.dataset.ed; return salDraw(); }
  if (b.dataset.cx){ sal.open = ""; return salDraw(); }
  if (b.dataset.addc) salAddRow(b);
});
$("salDish").addEventListener("toggle", e => { if (sal && e.target.classList && e.target.classList.contains("salok")) sal.okOpen = e.target.open; }, true);
$("salDish").addEventListener("submit", async e => {
  const f = e.target.closest("form.salf");
  if (!f) return;
  e.preventDefault();
  const d = salDishOf(f.dataset.k);
  if (!d) return;
  const comps = salFormComps(f);
  if (typeof comps === "string"){ $("salMsg").textContent = comps; return; }
  if (!comps.length){ $("salMsg").textContent = "Добавьте хотя бы одну позицию или нажмите «Не учитывать»."; return; }
  if (await salSave([salPack(d, comps, "вручную")])){ sal.open = ""; salDraw(); }
});

/* ── рецепты заготовок: на 1 единицу заготовки (1 л) — сколько сырья. Подсказка — техкарта «на замес» с выходом ── */
const ZAG_SEC = /^(заготовки|премиксы на коктейли)$/i;
function zagSuggest(zi){
  const z = sal.ref[zi], zt = incTok(z[1]), zu = salU(z[2]);
  let best = null, b1 = 0, b2 = 0;
  for (const k of (typeof KALL !== "undefined" ? KALL : [])){
    if (!k.out || !Array.isArray(k.i)) continue;
    const kt = incTok(k.n), hit = kt.filter(x => zt.some(y => incSame(x, y))).length, sc = kt.length && zt.length ? (hit / kt.length + hit / zt.length) / 2 : 0;
    if (sc > b1){ b2 = b1; b1 = sc; best = k; } else if (sc > b2) b2 = sc;
  }
  if (!best || b1 < 0.6 || !(b1 > b2)) return null;
  /* выход замеса — в единицах заготовки: мл и л — литры; г и кг считаем как литры только у литровой заготовки нельзя — пропуск */
  const oq = mgrN(best.out[0]), ou = String(best.out[1] || "").trim().toLowerCase();
  const out = zu === "л" ? (ou === "мл" ? oq / 1000 : ou === "л" ? oq : 0) : zu === "кг" ? (/^(г|гр)$/.test(ou) ? oq / 1000 : ou === "кг" ? oq : 0) : 0;
  if (!(out > 0)) return null;
  const comps = [], miss = [];
  for (const [ing, q, u] of best.i){
    const ri = salFind(ing, 0.4), qq = ri >= 0 && ri !== zi ? salConv(mgrN(q), u, sal.ref[ri]) : null;
    if (ri < 0 || !(qq > 0)){ if (!/^вода/i.test(ing)) miss.push(ing); continue; }   // воду не считаем
    const same = comps.find(c => c.ri === ri);
    if (same) same.q += qq / out; else comps.push({ri, q: qq / out});
  }
  return comps.length ? {comps, miss, src: "техкарта «" + best.n + "»"} : null;
}
function zagDraw(){
  if (!sal) return;
  const zs = sal.ref.map((r, i) => ({ri: i, r})).filter(x => ZAG_SEC.test(String(x.r[0]).trim()) && x.r[9] === 1);
  if (!zs.length){ $("salZag").innerHTML = ""; return; }
  zs.forEach(x => { x.m = sal.zag[x.ri] || null; if (!x.m) x.sug = zagSuggest(x.ri); });
  const ok = zs.filter(x => x.m), sug = zs.filter(x => !x.m && x.sug), no = zs.filter(x => !x.m && !x.sug);
  const line = x => {
    const key = "z" + x.ri, open = sal.zopen === key, st = x.m ? salCompTxt(x.m.comps) : x.sug ? salCompTxt(x.sug.comps) : "";
    return '<li class="' + (x.m ? "inc-code" : x.sug ? "inc-guess" : "inc-no") + '"><div class="incr"><span class="refn">' + esc(x.r[1]) + ' <small>' + esc(x.r[0]) + '</small></span>' +
      '<small class="mgrwhy">на 1 ' + esc(useU(x.r[2])) + (st ? ': <b>' + esc(st) + '</b>' : ' · <b>рецепта нет</b>') +
        (x.sug && !x.m ? ' · ' + esc(x.sug.src) + (x.sug.miss.length ? " (без: " + esc(x.sug.miss.join(", ")) + ")" : "") : "") + '</small>' +
      (open ? salForm(x, true) : '<div class="salbtns">' + (x.sug && !x.m ? '<button type="button" class="link" data-zok="' + x.ri + '">Верно</button>' : "") +
        '<button type="button" class="link" data-zed="' + key + '">' + (x.m || x.sug ? "Изменить" : "Задать рецепт") + '</button>' +
        (x.m ? '<button type="button" class="link" data-zno="' + x.ri + '">Убрать рецепт</button>' : "") + '</div>') + '</div></li>';
  };
  $("salZag").innerHTML = '<div class="result tcard mgrt"><div class="tname"><em>сырьё на 1 л</em><h3>Рецепты заготовок</h3></div>' +
    '<p class="mgrsum salsum">Заготовок: <b>' + zs.length + '</b> · рецепт есть у ' + ok.length + (sug.length ? ' · <span class="incg">предложено ' + sug.length + '</span>' : "") + (no.length ? ' · нет у ' + no.length : "") + '</p>' +
    '<p class="wnhint salnote">С рецептом остаток заготовки, её списания и продажи через неё во вкладке «Расход» раскладываются на сырьё — сироп, сделанный впрок, не покажется недостачей сахара.</p>' +
    (sug.length || no.length ? '<ul class="olist incl">' + sug.concat(no).map(line).join("") + '</ul>' : "") +
    (ok.length ? '<details class="incmapd salok zagok"' + (sal.zokOpen || ok.some(x => "z" + x.ri === sal.zopen) ? " open" : "") + '><summary>Рецепт есть (' + ok.length + ')</summary><ul class="olist incl">' + ok.map(line).join("") + '</ul></details>' : "") +
    '<p class="warn" id="zagMsg" role="status"></p></div>';
}
async function zagSave(zi, comps, src){
  const z = sal.ref[zi], d = await pubPost({mgr: "zagset", zags: [{sec: z[0], n: z[1], src, comps: comps.map(c => ({sec: sal.ref[c.ri][0], n: sal.ref[c.ri][1], q: c.q, u: sal.ref[c.ri][2] || "литр"}))}]});
  if (!d) return false;
  if (!d.ok){ $("zagMsg").textContent = pubErr(d); return false; }
  if (comps.length) sal.zag[zi] = {comps, src}; else delete sal.zag[zi];
  buzz(14); perData = null;
  return true;
}
$("salZag").addEventListener("click", async e => {
  const b = e.target.closest("button");
  if (!b || !sal) return;
  if (b.dataset.zok){ const zi = +b.dataset.zok, s = zagSuggest(zi); if (s && await zagSave(zi, s.comps, s.src)) zagDraw(); return; }
  if (b.dataset.zno){ if (await zagSave(+b.dataset.zno, [], "")) zagDraw(); return; }
  if (b.dataset.zed){ sal.zopen = b.dataset.zed; return zagDraw(); }
  if (b.dataset.cx){ sal.zopen = ""; return zagDraw(); }
  if (b.dataset.addc) salAddRow(b);
});
$("salZag").addEventListener("toggle", e => { if (sal && e.target.classList && e.target.classList.contains("zagok")) sal.zokOpen = e.target.open; }, true);
$("salZag").addEventListener("submit", async e => {
  const f = e.target.closest("form.salf");
  if (!f) return;
  e.preventDefault();
  const zi = +String(f.dataset.k).slice(1), comps = salFormComps(f);
  if (typeof comps === "string"){ $("zagMsg").textContent = comps; return; }
  if (!comps.length){ $("zagMsg").textContent = "Добавьте хотя бы одну позицию."; return; }
  if (await zagSave(zi, comps, "вручную")){ sal.zopen = ""; zagDraw(); }
});
