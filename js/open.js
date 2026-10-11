/* Чеклист открытия: общий для всех барменов (отметки — в Apps Script), сбрасывается в 06:00 по Астане. */
/* ════════════ Чеклист открытия ════════════
   Галочка — пункт зачёркнут, видно, кто и когда отметил. Отметки сразу видны на всех телефонах (сверка раз в 30 секунд).
   Без связи отметка ждёт на телефоне и уйдёт сама. «Е. Финальная проверка» — что ещё не отмечено, и «Бар готов к открытию».
   Пункты по дням — всегда в списке, с пометкой дня (в свой день пометка выделена). */
const CK = [
  {id: "a", t: "Открытие смены и зоны «Кафе»", items: [
    ["a1", "Проверить чистоту и порядок"],
    ["a2", "Ревизия", [4, 0]],
    ["a3", "Составить стоп-лист"],
    ["a4", "Протереть стойку"],
    ["a5", "Мусорные баки — по 4 мешка"],
    ["a6", "Принести 3 микрофибры и 3 натирки"],
    ["a7", "Включить кофемашину и кофемолку, проверить кофе в кофемолке"],
    ["a8", "Принести резинки для 2 станций"],
    ["a9", "Подготовить 2 набора инструментов"],
    ["a10", "Заполнить салфетки и трубочки"],
    ["a11", "Подготовить нарезки, маракуйю и украшения для коктейлей"]]},
  {id: "b", t: "Подготовка станции", note: "По ярусам, по порядку.", items: [
    ["b1", "1. Лёд и холодное", null, "Закинуть лёд; Рэд Булл, кола, вода; пены; Ягер и водка; вино и лимонады; настойки и игристое"],
    ["b2", "2. Быстрый доступ", null, "Фиеро, Апероль, виски, джин, текила, все премиксы; розлив — тоник, кола, содовая"],
    ["b3", "3. Нижний ярус", null, "Розлив — кола, тоник, содовая; игристое; соки"]]},
  {id: "c", t: "Полная подготовка кафе", items: [
    ["c1", "Тоник, кола, вода газ и негаз, Рэд Булл (штучные) — вниз левой станции кафе"],
    ["c2", "Лёд фраппе — 2 кулера"],
    ["c3", "Принести всё по списку «Взять на бар»", null, null, "zone"],
    ["c4", "Лимонады — по 2 л каждого вида"],
    ["c5", "Настойки — по 3 бутылки"],
    ["c6", "Премиксы — по 2–3 л"],
    ["c7", "Черника и вишня — есть в морозильнике"],
    ["c8", "Тимьян, базилик, мята — в наличии"],
    ["c9", "Холодильник: пополнить всеми видами бутылочного пива"],
    ["c10", "Пополнить винный холодильник"]]},
  {id: "d", t: "Общие дела", items: [
    ["d1", "Принять и разгрузить поставку"],
    ["d2", "Обновить маркировки на всё открытое: безалкогольное, фрукты, вина, ликёры", [5]],
    ["d3", "Нарезки — по 6: апельсин, лимон, лайм"],
    ["d4", "Пены — 4 игристого и 3 пломбир"]]},
  {id: "e", t: "Подготовка танцпола", items: [
    ["e1", "Протереть стойку, навести порядок"],
    ["e2", "Закинуть лёд в 2 станции"],
    ["e3", "Мусорные баки — по 4 мешка"],
    ["e4", "3 натирки и 3 тряпки"],
    ["e5", "Заполнить трубочки и салфетки"],
    ["e6", "Розлив — кола, тоник, содовая"],
    ["e7", "Игристое розлив — в холодильник"],
    ["e8", "Ящики: вода газ и негаз, Рэд Булл, тоник, кола"],
    ["e9", "Все виды бутылочного пива"],
    ["e10", "Порядок на стеллаже и полках"],
    ["e11", "2 контейнера: маракуйя и украшения для коктейлей"],
    ["e12", "2 графина воды"]]}
];
const CK_LETTERS = "АБВГДЕ", CK_WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"], CK_FIN = "fin";
const CKS = "mechty-ck", CKQ = "mechty-ck-q";
let ckSt = null, ckBusy = false, ckTimer = 0, ckState = "load";
const ckj = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") || d; } catch (e) { return d; } };
const cks = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
/* «день бара»: с 06:00 по Астане (UTC+5) */
const ckDayNow = () => new Date(Date.now() + 5 * 3600e3 - 6 * 3600e3).toISOString().slice(0, 10);
const ckWd = () => new Date(Date.now() - 3600e3).getUTCDay();   // день недели «дня бара»: (UTC+5) − 6 ч = UTC − 1 ч
const ckTime = t => { const d = new Date(+t + 5 * 3600e3); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); };

/* состояние = ответ таблицы (или копия на телефоне) + неотправленные отметки поверх */
function ckView(){
  const day = ckDayNow(), base = ckSt && ckSt.day === day ? ckSt.s : {}, s = Object.assign({}, base);
  for (const q of ckj(CKQ, [])){ if (q.day !== day) continue; if (q.on) s[q.id] = s[q.id] || {w: q.w, t: q.t, pend: 1}; else delete s[q.id]; }
  return s;
}

function ckDraw(){
  const s = ckView(), wd = ckWd(), all = CK.flatMap(g => g.items), done = all.filter(x => s[x[0]]).length;
  const d = ckDayNow().split("-").reverse().slice(0, 2).join(".");
  $("ckInfo").innerHTML = "Сегодня — <b>" + CK_WD[wd] + ", " + d + "</b>. Отмечено <b>" + done + " из " + all.length + "</b>." +
    (ckState === "net" ? " Нет связи — отметки уйдут, когда появится." : ckState === "old" ? " Общие отметки заработают после обновления Apps Script." : "");
  const item = x => {
    const [id, text, days, sub, link] = x, on = s[id], today = days && days.includes(wd);
    return '<li class="' + (on ? "on" : "") + '"><label>' +
      '<span class="cktx"><span class="ckt">' + esc(text) + (days ? ' <em class="ckday' + (today ? " now" : "") + '">' + days.map(n => CK_WD[n]).join(", ") + '</em>' : "") + '</span>' +
      (sub ? '<span class="cksub">' + esc(sub) + '</span>' : "") +
      (on ? '<span class="ckwho">' + esc(on.w || "") + (on.t ? " · " + ckTime(on.t) : "") + (on.pend ? " · ждёт отправки" : "") + '</span>' : "") +
      '</span><input type="checkbox" data-id="' + id + '"' + (on ? " checked" : "") + ' aria-label="' + esc(text) + '"></label>' + (link ? '<button type="button" class="link ckgo" data-go="' + link + '">Открыть список</button>' : "") + '</li>';
  };
  const left = all.filter(x => !s[x[0]]), fin = s[CK_FIN];
  $("ckList").innerHTML = CK.map((g, i) => {
    const n = g.items.filter(x => s[x[0]]).length;
    return '<div class="result tcard ckg' + (n === g.items.length ? " ckdone" : "") + '"><div class="tname"><em>' + n + " из " + g.items.length + '</em>' +
      '<h3><span class="ckl">' + CK_LETTERS[i] + '</span>' + esc(g.t) + '</h3></div>' + (g.note ? '<p class="cknote">' + esc(g.note) + '</p>' : "") +
      '<ul class="olist cklist">' + g.items.map(item).join("") + '</ul></div>';
  }).join("") +
    '<div class="result tcard ckg ckfin' + (fin ? " ckdone" : "") + '"><div class="tname"><em>' + (left.length ? "осталось " + left.length : "всё отмечено") + '</em>' +
      '<h3><span class="ckl">Е</span>Финальная проверка</h3></div>' +
      (left.length ? '<p class="cknote">Ещё не отмечено:</p><ul class="cknot">' + CK.map((g, i) => g.items.filter(x => !s[x[0]])
        .map(x => '<li><span class="ckl">' + CK_LETTERS[i] + '</span>' + esc(x[1]) + '</li>').join("")).join("") + '</ul>' : '<p class="cknote">Все пункты отмечены.</p>') +
      '<ul class="olist cklist">' + item([CK_FIN, "Бар готов к открытию"]) + '</ul></div>';
}

/* отметки — в таблицу по одной, по порядку; ответ таблицы — новое общее состояние */
async function ckFlush(){
  if (ckBusy || !TOKEN || !me) return;
  ckBusy = true;
  try {
    for (;;){
      const q = ckj(CKQ, []);
      if (!q.length) break;
      const a = q[0];
      if (a.day !== ckDayNow()){ cks(CKQ, q.slice(1)); continue; }     // вчерашняя отметка — уже не нужна
      const d = await api({ck: "set", id: a.id, on: a.on ? "1" : "0", rn: a.w});
      if (d.error === "net" || d.error === "denied"){ ckState = "net"; break; }
      if (d.ok && !d.s){ ckState = "old"; break; }
      cks(CKQ, ckj(CKQ, []).filter(x => x.n !== a.n));
      if (d.ok){ ckSt = {day: d.day, s: d.s}; cks(CKS, ckSt); ckState = "ok"; }
    }
  } finally { ckBusy = false; ckDraw(); }
}
async function ckLoad(){
  if (!TOKEN || !me) return;
  if (ckj(CKQ, []).length) await ckFlush();
  if (ckBusy) return;
  const d = await api({ck: "list"});
  if (d.ok && d.s){ ckSt = {day: d.day, s: d.s}; cks(CKS, ckSt); ckState = "ok"; }
  else ckState = d.ok ? "old" : "net";
  ckDraw();
}
function ckInit(){
  if (!ckSt) ckSt = ckj(CKS, null);
  ckDraw(); ckLoad();
  if (!ckTimer){
    ckTimer = setInterval(() => { if (sect === "open" && R && !document.hidden && !ckBusy) ckLoad(); }, 30e3);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && sect === "open" && R) ckLoad(); });
  }
}

$("ckList").addEventListener("change", e => {
  const box = e.target.closest("input[type=checkbox]");
  if (!box || !me) return;
  buzz(box.checked ? 14 : 8);
  const q = ckj(CKQ, []);
  q.push({id: box.dataset.id, on: box.checked, w: me.name, t: Date.now(), day: ckDayNow(), n: Math.random()});
  cks(CKQ, q);
  ckDraw(); ckFlush();
});
$("ckList").addEventListener("click", e => {
  const b = e.target.closest("button[data-go]");
  if (b) setSect(b.dataset.go);
});
window.addEventListener("online", () => { if (R && ckj(CKQ, []).length) ckFlush(); });
