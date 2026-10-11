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
  mgrs(MGR, null); mgrData = null; refRows = null; ordData = null; incData = null;
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
  mgrs(MGR, null); mgrData = null; refRows = null; refOpen = -1; ordData = null; inc = null; incData = null;
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
let mgrTab = ["sum", "ord", "inc", "ref"].includes(mgrj("mechty-mgr-tab", "sum")) ? mgrj("mechty-mgr-tab", "sum") : "sum";
function mgrTabDraw(){
  document.querySelectorAll("#mgrTabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === mgrTab)));
  $("mgrSum").hidden = mgrTab !== "sum";
  $("mgrOrd").hidden = mgrTab !== "ord";
  $("mgrInc").hidden = mgrTab !== "inc";
  $("mgrRef").hidden = mgrTab !== "ref";
}
const mgrTabLoad = () => mgrTab === "ref" ? refLoad() : mgrTab === "ord" ? ordLoad() : mgrTab === "inc" ? incLoad() : mgrLoad();
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
