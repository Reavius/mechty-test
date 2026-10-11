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
    const q = mgrj(MGRQ, null), r = q && q.from && q.to ? [q.from, q.to] : mgrRange("m");
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
  mgrs(MGR, null); mgrData = null; refRows = null; refOpen = -1; ordData = null; inc = null; incData = null; useData = null; pubRaw = null; repData = null;
  $("useList").innerHTML = ""; $("pubList").innerHTML = ""; $("repView").innerHTML = "";
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
  mgrs(MGRQ, {from, to, k: mgrKindSel});
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
  mgrData = {from, to, rows: [].concat((d.wo || []).map(r => ["wo"].concat(r)), (d.pr || []).map(r => ["pr"].concat(r)))};
  mgrDraw();
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
  $("mgrSub").textContent = per;
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
    ["", "Позиции:"], S.items.slice(0, 20).map(x => "— " + x.n + ": " + mgrQty(x) + " (" + mgrPl(x.cnt, "раз", "раза", "раз") + ")"),
    ["", "По барменам:"], S.who.map(x => "— " + x.by + ": " + mgrPl(x.acts.size, "акт", "акта", "актов") + ", " + mgrPl(x.n, "строка", "строки", "строк"))).join("\n");
}

function mgrKindDraw(){
  document.querySelectorAll("#mgrKind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === mgrKindSel)));
}
let mgrT = 0;
const mgrSoon = () => { clearTimeout(mgrT); mgrT = setTimeout(mgrLoad, 350); };
$("mgrFrom").addEventListener("change", mgrSoon);
$("mgrTo").addEventListener("change", mgrSoon);
$("mgrQuick").addEventListener("click", e => {
  const b = e.target.closest("button[data-r]");
  if (!b) return;
  const r = mgrRange(b.dataset.r);
  $("mgrFrom").value = r[0]; $("mgrTo").value = r[1];
  buzz(8); mgrLoad();
});
$("mgrKind").addEventListener("click", e => {
  const b = e.target.closest("button[data-k]");
  if (!b || b.dataset.k === mgrKindSel) return;
  mgrKindSel = b.dataset.k; mgrMore = {};
  mgrKindDraw(); buzz(8);
  if (mgrData){ mgrs(MGRQ, {from: mgrData.from, to: mgrData.to, k: mgrKindSel}); mgrDraw(); }
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

/* ── вкладки менеджера ── */
let mgrTab = ["sum", "use", "ord", "inc", "ref", "pub", "rep"].includes(mgrj("mechty-mgr-tab", "sum")) ? mgrj("mechty-mgr-tab", "sum") : "sum";
function mgrTabDraw(){
  document.querySelectorAll("#mgrTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === mgrTab)));
  $("mgrSum").hidden = mgrTab !== "sum";
  $("mgrUse").hidden = mgrTab !== "use";
  $("mgrOrd").hidden = mgrTab !== "ord";
  $("mgrInc").hidden = mgrTab !== "inc";
  $("mgrPub").hidden = mgrTab !== "pub";
  $("mgrRep").hidden = mgrTab !== "rep";
  $("mgrRef").hidden = mgrTab !== "ref";
}
const mgrTabLoad = () => mgrTab === "ref" ? refLoad() : mgrTab === "ord" ? ordLoad() : mgrTab === "inc" ? incLoad() : mgrTab === "use" ? useLoad() : mgrTab === "pub" ? pubLoad() : mgrTab === "rep" ? repLoad() : mgrLoad();
$("mgrTabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-t]");
  if (!b || b.dataset.t === mgrTab) return;
  mgrTab = b.dataset.t; mgrs("mechty-mgr-tab", mgrTab);
  buzz(8); mgrTabDraw();
  mgrTabLoad();
});

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
  const d = await api({mgr: "ref", mk});
  if (d.error === "mgr") return mgrExpired();
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
  refDraw();
}

const refMiss = (r, f) => f === "norm" ? !r[5] : f === "tara" ? !r[4] : f === "code" ? !r[3] : false;
function refMeta(r){
  const p = [];
  if (r[2]) p.push(esc(r[2]));
  if (r[3]) p.push("код " + esc(r[3]));
  p.push(r[4] ? "тара " + esc(r[4]) : '<em>нет тары</em>');
  p.push(r[5] ? "норма " + esc(r[5]) : '<em>нет нормы</em>');
  if (r[6]) p.push(esc(r[6]));
  if (r[7]) p.push(esc(r[7]) + " ₸");
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
    fld("refPrice", "Цена, ₸", r[7], 'type="text" inputmode="decimal" maxlength="12"') +
    '</div>' + fld("refNote", "Заметка", r[8], 'type="text" maxlength="200"') +
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
  const u = String(r.u || "").trim().toLowerCase();
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
  $("mgrOwarn").textContent = dd && dd.miss.length ? "Из ежедневной ревизии не нашлись в справочнике (назовите их так же, как в бланке месячной): " + dd.miss.join(", ") + "." : "";
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
  if (t){ mgrTab = t.dataset.tab; mgrs("mechty-mgr-tab", mgrTab); mgrTabDraw(); mgrTabLoad(); }
});
$("mgrOcopy").addEventListener("click", () => ordCopy($("mgrOcopy")));
$("mgrOwarn").addEventListener("click", e => { if (e.target.id === "ordRetry") ordLoad(); });

/* ── приход: загрузка накладных R-Keeper ──
   Файл → таблица (js/xlsx.js) → строка шапки и столбцы находятся сами (их можно поправить) → строки накладной
   сопоставляются со справочником: по коду R-Keeper, по уже встречавшемуся названию (J справочника), иначе — похожее
   название («проверьте»). Коэффициент — сколько единиц позиции в одной единице R-Keeper (бутылка 0,7 → 0,7 л). */
const INC_F = [["date", "Дата", /дата/], ["no", "№ накладной", /^(номер|№)(?!\s*п\/п)|накладн|документ/], ["sup", "Поставщик", /поставщ|контраг|продав|отправит/],
  ["code", "Код", /^код|артикул/], ["name", "Наименование", /наимен|товар|номенклат|продукц|назван/], ["unit", "Ед. изм.", /^ед|единиц/],
  ["qty", "Количество", /^кол|количеств/], ["price", "Цена", /цена/], ["sum", "Сумма", /сумм|стоимост/]];
let inc = null, incData = null, incRange = "d30";
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
    (total ? " на " + mgrNum(Math.round(total)) + " ₸" : "");
  $("incList").innerHTML = inv.slice(0, 40).map(x => '<div class="result tcard mgrt"><div class="tname"><em>' + (x.sum ? mgrNum(Math.round(x.sum)) + " ₸" : "") + '</em>' +
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
  catch (err) {
    $("incWarn").textContent = err.message === "xls" ? "Это старый формат .xls — откройте файл в Excel и сохраните как «Книга Excel (.xlsx)»." :
      err.message === "old" ? "Телефон не умеет распаковывать .xlsx — обновите браузер или сохраните файл как CSV." : "Не удалось прочитать файл — сохраните его как .xlsx или CSV.";
    return;
  }
  const sheets = t.sheets.filter(s => s.rows.some(r => r.some(c => c !== "")));
  if (!sheets.length){ $("incWarn").textContent = "В файле нет таблицы."; return; }
  if (!(await incRefs())){ $("incWarn").textContent = "Нет связи с таблицей — справочник не загрузился. Попробуйте ещё раз."; return; }
  $("incWarn").textContent = "";
  inc = {file: f.name, sheets, si: 0, mapOpen: null};
  incDetect(); incBuild(); incDraw();
});

/* шапка: строка, где больше всего знакомых заголовков; данные накладной над ней (№, дата, поставщик) */
function incDetect(){
  const rows = inc.sheets[inc.si].rows;
  let best = -1, bs = 0;
  for (let i = 0; i < Math.min(rows.length, 40); i++){
    const cells = rows[i].map(c => typeof c === "string" ? c.toLowerCase().trim() : "");
    const sc = INC_F.filter(f => cells.some(c => c && c.length < 60 && f[2].test(c))).length;
    if (sc > bs && cells.some(c => INC_F[4][2].test(c))){ bs = sc; best = i; }
  }
  inc.hr = bs >= 2 ? best : -1;
  inc.map = {};
  if (inc.hr >= 0){
    const used = new Set(), cells = rows[inc.hr].map(c => typeof c === "string" ? c.toLowerCase().trim() : "");
    for (const [k, , re] of INC_F){
      const i = cells.findIndex((c, j) => c && !used.has(j) && re.test(c));
      if (i >= 0){ inc.map[k] = i; used.add(i); }
    }
  }
  const top = rows.slice(0, Math.max(inc.hr, 0)).map(r => r.filter(c => c !== "").join(" ")).join("\n");
  const no = top.match(/№\s*([\w\-\/]+)/), sup = top.match(/(?:поставщик|контрагент)[:\s]+([^\n]+)/i);
  const dt = top.match(/(\d{4}-\d{2}-\d{2})/) || top.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  inc.meta = {no: no ? no[1] : "", date: dt ? (dt[3] ? dt[3] + "-" + dt[2] + "-" + dt[1] : dt[1]) : mgrToday(), sup: sup ? sup[1].trim().slice(0, 120) : ""};
}
/* строки накладной и сопоставление */
function incBuild(){
  const rows = inc.sheets[inc.si].rows, m = inc.map, out = [];
  const cell = (r, k) => m[k] == null ? "" : r[m[k]] == null ? "" : r[m[k]];
  const byCode = {}, byName = {}, toks = refRows.map(r => incTok(r[1]));
  refRows.forEach((r, i) => { if (r[3]) byCode[String(r[3]).trim()] = i; if (r[10]) byName[incNorm(r[10])] = i; });
  for (let i = inc.hr + 1; i < rows.length; i++){
    const r = rows[i], name = String(cell(r, "name")).trim(), qty = cell(r, "qty");
    if (!name || typeof qty !== "number" || !(qty > 0) || /^(итого|всего)/i.test(name)) continue;
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
    const date = cell(r, "date"), price = cell(r, "price"), sum = cell(r, "sum");
    out.push({name, code, unit: String(cell(r, "unit")).trim(), qty, price: typeof price === "number" ? price : 0, sum: typeof sum === "number" ? sum : 0,
      date: typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "", no: String(cell(r, "no")).trim(), sup: String(cell(r, "sup")).trim(),
      ri, how, k: ri >= 0 ? incK(refRows[ri], cell(r, "unit")) : 1});
  }
  inc.rows = out;
}
function incK(ref, rku){
  if (ref[11]) return mgrN(ref[11]);
  const ru = incU(rku), pu = incU(ref[2]), tara = mgrN(ref[4]);
  if (!ru || !pu || ru === pu) return 1;
  if ((ru === "шт" || ru === "бут") && (pu === "л" || pu === "кг") && tara > 0) return tara;
  if (ru === "мл" && pu === "л" || ru === "г" && pu === "кг") return 0.001;
  if (ru === "л" && pu === "мл" || ru === "кг" && pu === "г") return 1000;
  return 1;
}
const incHow = {code: "по коду", name: "уже сопоставляли", guess: "похоже — проверьте", "": "не найдено — строка пропустится"};
function incDraw(){
  const box = $("incImp"), rows = inc.sheets[inc.si].rows, hdr = inc.hr >= 0 ? rows[inc.hr] : rows[0] || [];
  const ncol = Math.max(...rows.slice(0, 60).map(r => r.length), 1);
  $("incRefs").innerHTML = refRows.map(r => '<option value="' + esc(incLabel(r)) + '">').join("");
  const opt = (k, sel) => '<option value="">—</option>' + Array.from({length: ncol}, (_, i) => '<option value="' + i + '"' + (sel === i ? " selected" : "") + '>' +
    colName(i) + (hdr[i] !== "" && hdr[i] != null ? " · " + esc(String(hdr[i]).slice(0, 28)) : "") + '</option>').join("");
  const ready = inc.rows.filter(r => r.ri >= 0).length, guess = inc.rows.filter(r => r.how === "guess").length;
  const meta = (k, label, type, val) => inc.map[k] == null ? '<div><label class="label" for="incM' + k + '">' + label + '</label><input id="incM' + k + '" type="' + type + '" value="' + esc(val) + '"></div>' : "";
  const found = inc.map.name != null && inc.map.qty != null;
  if (inc.mapOpen == null) inc.mapOpen = !found;
  box.hidden = false;
  box.innerHTML = '<div class="result tcard wo"><div class="tname"><em>' + esc(inc.file) + '</em><h3>Накладные из файла</h3></div><div class="wobody">' +
    (inc.sheets.length > 1 ? '<label class="label" for="incSheet">Лист</label><select id="incSheet">' + inc.sheets.map((s, i) => '<option value="' + i + '"' + (i === inc.si ? " selected" : "") + '>' + esc(s.name) + '</option>').join("") + '</select>' : "") +
    '<details class="incmapd" id="incMapD"' + (inc.mapOpen ? " open" : "") + '><summary>' + (found ? "Столбцы найдены" + (inc.hr >= 0 ? " (шапка — строка " + (inc.hr + 1) + ")" : "") + " — проверить" : "Столбцы не найдены — укажите наименование и количество") + '</summary>' +
    '<div class="refgrid incmap">' + INC_F.map(([k, label]) => '<div><label class="label" for="incC' + k + '">' + label + '</label><select id="incC' + k + '" data-k="' + k + '">' + opt(k, inc.map[k]) + '</select></div>').join("") + '</div></details>' +
    (inc.map.date == null || inc.map.no == null || inc.map.sup == null ? '<p class="label incml">Накладная — для всех строк файла</p>' : "") +
    '<div class="refgrid">' + meta("date", "Дата", "date", inc.meta.date) + meta("no", "№", "text", inc.meta.no) + meta("sup", "Поставщик", "text", inc.meta.sup) + '</div>' +
    '<p class="mgrsum">Строк: <b>' + inc.rows.length + '</b> · сопоставлено ' + ready + (guess ? ' · <span class="incg">проверьте ' + guess + '</span>' : "") +
      (inc.rows.length - ready ? ' · не найдено ' + (inc.rows.length - ready) : "") + '</p>' +
    '<ul class="olist incl">' + inc.rows.map((r, i) => {
      const ref = r.ri >= 0 ? refRows[r.ri] : null;
      return '<li class="inc-' + (r.how || "no") + '" data-i="' + i + '"><div class="incr"><span class="refn">' + esc(r.name) + (r.code ? ' <small>код ' + esc(r.code) + '</small>' : "") + '</span>' +
        '<small class="mgrwhy">' + mgrNum(r.qty) + (r.unit ? " " + esc(r.unit) : "") + (r.price ? " · " + mgrNum(r.price) + " ₸" : "") + ' · <b>' + incHow[r.how] + '</b></small>' +
        '<div class="incpick"><input type="text" list="incRefs" data-f="ref" value="' + (ref ? esc(incLabel(ref)) + '"' : '" placeholder="Позиция справочника"') + ' aria-label="Позиция справочника">' +
        '<label class="inck">× <input type="text" inputmode="decimal" data-f="k" value="' + mgrNum(r.k) + '" aria-label="Коэффициент"></label></div>' +
        (ref ? '<small class="mgrwhy">1 ' + esc(r.unit || "ед.") + ' = ' + mgrNum(r.k) + ' ' + esc(ref[2] || "ед.") + ' · в приход: ' + mgrNum(Math.round(r.qty * r.k * 1000) / 1000) + ' ' + esc(ref[2] || "") + '</small>' : "") +
        '</div></li>';
    }).join("") + '</ul>' +
    '<p class="warn" id="incMsg" role="status"></p>' +
    '<div class="refbtns"><button type="button" class="wogo" id="incSave"' + (ready ? "" : " disabled") + '>Записать приход (' + ready + ')</button><button type="button" class="link" id="incX">Отмена</button></div>' +
    '</div></div>';
}
/* перерисовка — после события: поле, теряющее фокус, ещё в документе */
$("incImp").addEventListener("toggle", e => { if (e.target.id === "incMapD" && inc) inc.mapOpen = e.target.open; }, true);
let incT = 0;
const incRedraw = () => { clearTimeout(incT); incT = setTimeout(() => { if (inc) incDraw(); }, 0); };
$("incImp").addEventListener("change", e => {
  const t = e.target;
  if (t.id === "incSheet"){ inc.si = +t.value; incDetect(); incBuild(); return incRedraw(); }
  if (t.id && t.id.startsWith("incM") && t.id.length > 4){ inc.meta[t.id.slice(4)] = t.value; return; }
  if (t.dataset.k && t.id.startsWith("incC")){ if (t.value === "") delete inc.map[t.dataset.k]; else inc.map[t.dataset.k] = +t.value; incBuild(); return incRedraw(); }
  const li = t.closest("li[data-i]");
  if (!li) return;
  const r = inc.rows[+li.dataset.i];
  if (t.dataset.f === "ref"){
    const i = refRows.findIndex(x => incLabel(x) === t.value.trim());
    r.ri = i; r.how = i >= 0 ? "name" : ""; r.k = i >= 0 ? incK(refRows[i], r.unit) : 1;
    if (!t.value.trim()){ r.ri = -1; r.how = ""; }
    incRedraw();
  } else if (t.dataset.f === "k"){
    const k = mgrN(t.value);
    if (k > 0){ r.k = k; incRedraw(); } else t.value = mgrNum(r.k);
  }
});
$("incImp").addEventListener("click", async e => {
  if (e.target.id === "incX"){ inc = null; $("incImp").hidden = true; $("incImp").innerHTML = ""; return; }
  if (e.target.id !== "incSave") return;
  const mk = mgrKey(), btn = e.target;
  if (!mk) return mgrInit();
  const mv = k => { const el = $("incM" + k); return el ? el.value.trim() : ""; };
  const rows = inc.rows.filter(r => r.ri >= 0).map(r => {
    const ref = refRows[r.ri];
    return {date: r.date || mv("date"), no: r.no || mv("no"), sup: r.sup || mv("sup"), code: r.code, rkn: r.name, rku: r.unit, rkq: r.qty,
      price: r.price, sum: r.sum, sec: ref[0], n: ref[1], k: r.k};
  });
  if (rows.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.date))){ $("incMsg").textContent = "Укажите дату накладной."; return; }
  btn.disabled = true; $("incMsg").textContent = "Записываем…";
  let d = null;
  try {
    const res = await fetch(ENDPOINT, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify({token: TOKEN, mgr: "in", mk, who: me ? me.name : "", rows})});
    d = await res.json();
  } catch (err) { d = {error: "net"}; }
  if (d && d.error === "mgr") return mgrExpired();
  if (!d || !d.ok){
    btn.disabled = false;
    $("incMsg").textContent = d && d.error === "action" ? "Нужна новая версия Apps Script." : d && d.error === "bad" ? "Проверьте даты и количества." : "Не записалось — нет связи. Нажмите ещё раз (повторы не задвоятся).";
    return;
  }
  buzz(14);
  inc = null; refRows = null; ordData = null;
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
const useU = u => { const s = String(u || "").trim(); return s === "литр" ? "л" : s || "бут."; };
const useTol = u => /^(шт|бут\.)$/.test(useU(u)) ? 1 : 0.1;              // меньше этого — не странность, а погрешность пересчёта

function usePeriods(x){
  const C = useData.cols, out = [];
  for (let i = 1; i < C.length; i++){
    if (x.v[i] == null) continue;
    let j = i - 1;
    while (j >= 0 && x.v[j] == null) j--;
    if (j < 0) continue;
    const from = C[j].iso, to = C[i].iso, sum = arr => arr.filter(y => y.iso > from && y.iso <= to).reduce((a, y) => a + y.q, 0);
    const inq = sum(x.inc), woq = sum(x.wo), use = x.v[j] + inq - x.v[i];
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
  $("useWarn").textContent = noref ? "Не найдены в справочнике (приход и списания для них не учитываются): " + d.items.filter(x => !x.key).map(x => x.n).join(", ") + "." : "";
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
  const b = e.target.closest("button.userow");
  if (!b) return;
  const i = +b.dataset.i;
  useOpen = useOpen === i ? -1 : i; buzz(8); useDraw();
});
$("useWarn").addEventListener("click", e => { if (e.target.id === "useRetry") useLoad(); });

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
    if (!pubRaw) $("pubList").innerHTML = "";
    $("pubWarn").innerHTML = d.error === "action" ? "Нужна новая версия Apps Script (см. README → «Бар-менеджер»)."
      : 'Нет связи с таблицей. <button type="button" class="link" id="pubRetry">Повторить</button>';
    return;
  }
  $("pubSeed").hidden = !d.none; $("pubEd").hidden = !!d.none;
  if (d.none){ pubRaw = null; return; }
  pubRaw = d; pubDraw();
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
    if (isNew){ const same = pubRaw.menu.filter(x => x[0] === row[0] && x[2] === row[2]); after = same.length ? same[same.length - 1][15] : ""; }
    body = {mgr: "pubset", t: "m", act: isNew ? "add" : "set", key: isNew ? "" : pubOpen, after, row};
  } else {
    const isNew = pubOpen.startsWith("cnew:"), id = isNew ? "" : pubOpen.slice(2);
    if (!v("pcN")){ $("pubMsg").textContent = "Впишите название."; return; }
    const row = [v("pcG"), id, v("pcN"), v("pcNe"), v("pcM"), v("pcMe"), v("pcC"), v("pcA") || "Не выявлены", v("pcAe"), pubNum(v("pcV")), v("pcI"), v("pcK"), v("pcL"), on("pcLo"), on("pcH")];
    let after = "";
    if (isNew){ const same = pubRaw.items.filter(x => x[0] === row[0]); after = same.length ? same[same.length - 1][1] : ""; }
    body = {mgr: "pubset", t: "c", act: isNew ? "add" : "set", key: id, after, row};
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
  $("pubList").innerHTML = '<p class="mgrsum">В файле позиций с ценой: <b>' + pubPr.n + '</b> · изменится цен: <b>' + ch.length + '</b> · без изменений ' + pubPr.same +
    (pubPr.miss.length ? ' · в меню не нашлось ' + pubPr.miss.length : "") + '</p>' +
    (ch.length ? '<ul class="olist incl">' + ch.map((c, i) => '<li class="' + (c.how === "guess" ? "inc-guess" : "inc-code") + '"><label class="row1"><span><span class="refn">' + esc(c.name) + '</span>' +
      '<small class="mgrwhy">' + esc(String(c.old)) + ' → <b>' + esc(String(c.price)) + '</b>' + (c.how === "guess" ? " · похоже на «" + esc(c.fname) + "» — проверьте" : c.how === "code" ? " · по коду" : "") + '</small></span>' +
      '<input type="checkbox" data-i="' + i + '"' + (c.on ? " checked" : "") + '></label></li>').join("") + '</ul>' +
      '<div class="refbtns"><button type="button" class="wogo" id="pubPrGo">Применить отмеченные</button><button type="button" class="link" id="pubPrX">Отмена</button></div>' : '<p class="empty">Все цены в меню уже такие, как в файле.</p>') +
    (pubPr.miss.length ? '<details class="incmapd"><summary>В меню не нашлось (' + pubPr.miss.length + ')</summary><p class="wnhint">' + pubPr.miss.map(esc).join(", ") + '</p></details>' : "");
}
$("pubFile").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f || !pubRaw) return;
  $("pubWarn").textContent = "Читаем файл…";
  let t;
  try { t = await readTable(f); }
  catch (err) { $("pubWarn").textContent = err.message === "xls" ? "Это старый формат .xls — откройте файл в Excel и сохраните как «Книга Excel (.xlsx)»." : "Не удалось прочитать файл — сохраните его как .xlsx или CSV."; return; }
  const sheet = t.sheets.find(s => s.rows.some(r => r.some(c => c !== ""))), rows = sheet ? sheet.rows : [];
  let hr = -1, map = {};
  for (let i = 0; i < Math.min(rows.length, 40) && hr < 0; i++){
    const cells = rows[i].map(c => typeof c === "string" ? c.toLowerCase().trim() : "");
    const n = cells.findIndex(c => /наимен|блюдо|товар|назван/.test(c)), p = cells.findIndex(c => /цена|стоимост/.test(c));
    if (n >= 0 && p >= 0){ hr = i; map = {n, p, c: cells.findIndex(c => /^код|артикул/.test(c))}; }
  }
  if (hr < 0){ $("pubWarn").textContent = "Не нашёл в файле столбцы «Наименование» и «Цена»."; return; }
  $("pubWarn").textContent = "";
  const menu = pubRaw.menu.map(r => ({r, name: r[5] || pubCardName(r[12]), t: incTok(r[5] || pubCardName(r[12])), k: incNorm(r[5] || pubCardName(r[12]))}));
  const ch = [], miss = [], seen = new Set();
  let n = 0, same = 0;
  for (let i = hr + 1; i < rows.length; i++){
    const name = String(rows[i][map.n] || "").trim(), price = rows[i][map.p], code = map.c >= 0 ? String(rows[i][map.c] || "").trim() : "";
    if (!name || typeof price !== "number" || !(price > 0)) continue;
    n++;
    let m = code ? menu.find(x => x.r[13] && x.r[13] === code) : null, how = m ? "code" : "";
    if (!m){ m = menu.find(x => x.k === incNorm(name)); how = m ? "name" : ""; }
    if (!m){
      const tk = incTok(name);
      let b1 = 0, b2 = 0, bi = null;
      menu.forEach(x => { const sc = incScore(tk, x.t); if (sc > b1){ b2 = b1; b1 = sc; bi = x; } else if (sc > b2) b2 = sc; });
      if (b1 >= 0.75 && b1 > b2){ m = bi; how = "guess"; }
    }
    if (!m){ miss.push(name); continue; }
    if (seen.has(m.r[15])) continue;
    seen.add(m.r[15]);
    if (typeof m.r[11] === "string" && /\//.test(m.r[11])) continue;      // «350/890» — две цены, правится вручную
    if (+m.r[11] === price){ same++; continue; }
    ch.push({uid: m.r[15], name: m.name, fname: name, old: m.r[11] === "" ? "нет цены" : m.r[11], price, code, how, on: how !== "guess"});
  }
  pubPr = {ch, miss, n, same};
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
  $("pubWarn").textContent = "Цены обновлены: " + d.n + ". Гости увидят их сразу.";
  pubPr = null; buzz(14); pubFetch(); pubLoad();
});

/* ── еженедельный отчёт ── предпросмотр письма (HTML с сервера, всё экранировано там), получатели, таймер */
let repData = null, repRange = "pw", repBusy = false;
function repPeriod(){
  if (repRange !== "tw") return {};
  const t = mgrToday(), dow = (new Date(t + "T00:00:00Z").getUTCDay() + 6) % 7;
  return {from: mgrShift(t, -dow), to: t};
}
async function repLoad(){
  const mk = mgrKey();
  if (!mk) return mgrInit();
  document.querySelectorAll("#repQuick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === repRange)));
  $("repMsg").textContent = "";
  $("repView").innerHTML = '<ul class="olist mgrskel">' + skel(6) + '</ul>';
  $("repSend").disabled = true;
  const d = await api(Object.assign({mgr: "report", mk}, repPeriod()));
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
  $("repAuto").textContent = a === true ? "по понедельникам — включено" : a === false ? "по понедельникам — выключено" : "";
  $("repToggle").textContent = a === true ? "Выключить по понедельникам" : "Включить по понедельникам";
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
  if (d){ $("repTo").value = d.emails.join(", "); $("repMsg").textContent = d.emails.length ? "Адреса сохранены." : "Адресов нет — письмо будет уходить владельцу таблицы."; buzz(14); }
});
$("repToggle").addEventListener("click", async () => {
  const on = !(repData && repData.auto === true);
  const d = await repPost({mgr: "reportauto", on: on ? "1" : "0"}, $("repToggle"));
  if (d){ repData.auto = d.auto; repAutoDraw(); $("repMsg").textContent = d.auto ? "Включено: письмо будет приходить каждый понедельник в 9:00." : "Выключено."; buzz(14); }
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
