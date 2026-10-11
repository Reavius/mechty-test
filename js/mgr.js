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
  mgrLoad();                                                  // каждый раз при входе в раздел — свежие акты
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
  mgrs(MGR, null); mgrData = null;
  $("mgrOut").innerHTML = ""; $("mgrCopy").disabled = true;
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
  if (d.error === "mgr"){
    mgrs(MGR, null); mgrData = null;
    $("mgrMsg").textContent = "Вход менеджера истёк или пароль сменили — войдите снова.";
    return mgrInit();
  }
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
