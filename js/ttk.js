/* Технологическая карта и переключение разделов. */
/* ════════════ Технологическая карта ════════════ */
let sect = "ttk";
try { const v = localStorage.getItem("mechty-sect"); if (v === "calc" || v === "order" || v === "zone" || v === "rev" || v === "lab" || v === "wo" || v === "open" || v === "mgr" || v === "fr" || v === "gr") sect = v; } catch (e) {}

const SECT = {
  ttk:  ["Технологическая<br>карта", "Граммовки, посуда, метод и украшение для каждого напитка и заготовки."],
  calc: ["Калькулятор<br>замесов", "Пересчёт рецептур на нужный объём, число порций, коэффициент или остаток ингредиента."],
  lab:   ["Этикетки", "Две этикетки на позицию: лицевая и оборотная с составом, датами и QR-кодом. Только открытые данные коктейльной карты."],
  rev:   ["Ревизия", "Ежедневная — пересчёт по зонам, месячная — весь бар по бланку, с поиском. Вбейте число и нажмите «+» — оно прибавится к уже посчитанному."],
  wo:    ["Списания", "Акт списания или проработки: дата, позиции, подпись — и готовый файл по бланку ООО «Заря». Копия сохраняется на Google Диске."],
  order: ["Заявка", "Выберите заявку и отметьте галочкой то, что нужно заказать, — сверху соберётся список к заказу, там же можно вписать количество. Отметки сохраняются на этом устройстве."],
  fr:    ["Холодильники", "Температура в начале и в конце смены — как в бумажном журнале. Сканируйте QR на холодильнике или выберите его ниже. День — с 14:00 до 14:00: до его конца вносить и править может бармен, прошлые дни исправляет бар-менеджер."],
  open:  ["Чеклист<br>открытия", "Общий для всех барменов: отметили пункт — он зачёркнут, видно, кто и когда. Список обнуляется каждый день в 06:00."],
  gr:    ["График", "Смены барменов и барбеков по неделям, пн–вс, и ориентировочная часовка за месяц. Смотреть могут все; «Внести правки» включает правку — менять может любой бармен."],
  mgr:   ["Бар-<br>менеджер", "Расход по ревизиям и продажам, сводки списаний, чеклиста, холодильников и ревизий, бланки ревизий, технологичка, закупка и справочник. Вход — по отдельному паролю менеджера."],
  zone:  ["Что должно быть<br>в каждом баре", "Всё, что должно стоять на каждом баре. Отметьте галочкой то, чего не хватает, — сверху соберётся список, что взять с собой, там же можно вписать количество. Отметки сохраняются на этом устройстве."]
};

function setSect(s){
  sect = s;
  $("secTtk").hidden = s !== "ttk";
  $("secCalc").hidden = s !== "calc";
  $("secOrder").hidden = s !== "order";
  $("secZone").hidden = s !== "zone";
  $("secOpen").hidden = s !== "open";
  $("secRev").hidden = s !== "rev";
  $("secLab").hidden = s !== "lab";
  $("secWo").hidden = s !== "wo";
  $("secMgr").hidden = s !== "mgr";
  $("secFr").hidden = s !== "fr";
  $("secGr").hidden = s !== "gr";
  if (s === "lab") labInit();
  if (s === "wo") woInit();
  if (s === "open" && R) ckInit();
  if (s === "rev" && R) rkindLoad();
  if (s === "mgr" && R) mgrInit();
  if (s === "fr" && R) frInit();
  if (s === "gr" && R) grInit();
  $("btTitle").innerHTML = SECT[s][0];
  $("btLede").textContent = SECT[s][1];
  document.querySelectorAll("#sect button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.s === s)));
  try { localStorage.setItem("mechty-sect", s); } catch (e) {}
}

const qty = (v, u) => String(v).replace(".", ",") + '<small>' + esc(u) + '</small>';

function tcard(r){
  const stats = [];
  if (r.glass) stats.push(["Посуда", esc(r.glass)]);
  if (r.gar) stats.push(["Украшение", esc(r.gar)]);
  if (r.out) stats.push(["Выход", qty(r.out[0], r.out[1])]);
  if (r.pre) stats.push(["Премикс на порцию", qty(r.pre, "мл")]);

  const row = x => '<tr><td class="n">' + esc(x[0]) + '</td><td class="v">' + qty(x[1], x[2]) + '</td></tr>';

  const key = [r.n].concat(r.i.map(x => x[0]), (r.dec || []).map(x => x[0]), r.gar || []).join(" ").toLowerCase();
  return '<div class="result tcard" id="t-' + esc(r.id) + '" data-s="' + esc(key) + '">' +
    '<div class="tname' + (r.img ? ' has-ph' : '') + '"><h3>' + esc(r.n) + '</h3>' +
      (r.img ? '<img class="tph" src="' + esc(r.img) + '" alt="' + esc(r.n) + '"' + phwh(r.img) + ' loading="lazy" decoding="async">' : '') + '</div>' +
    (stats.length ? '<dl class="stats txt">' + stats.map(s => '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>').join("") + '</dl>' : '') +
    '<table><thead><tr><th>Ингредиент</th><th>' + (r.out || r.b ? "На замес" : "На порцию") + '</th></tr></thead><tbody>' +
    r.i.map(row).join("") +
    (r.dec && r.dec.length ? '<tr class="sub"><td colspan="2">Украшение</td></tr>' + r.dec.map(row).join("") : '') +
    '</tbody></table>' +
    (r.m ? '<p class="method"><b>Метод.</b> ' + esc(r.m) + '</p>' : '') +
    (r.c && ALL.some(x => x.id === r.c)
      ? '<p class="method"><button type="button" class="link to-calc" data-c="' + esc(r.c) + '">Пересчитать в калькуляторе →</button></p>'
      : '') +
    '</div>';
}

/* все позиции сразу, по группам */
function fillTtk(){
  $("tres").innerHTML = K.length
    ? K.map(g =>
        '<section><div class="sechead"><h2>' + esc(g.g) + '</h2><em>' + g.items.length + ' поз.</em></div>' +
        g.items.map(tcard).join("") + '</section>').join("")
    : '<p class="empty">Технологические карты пока не загружены.</p>';
  filterTtk();
}

/* поиск: прячем несовпавшие карточки и пустые группы */
function filterTtk(){
  const f = $("tq").value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll("#tres section").forEach(sec => {
    let n = 0;
    sec.querySelectorAll(".tcard").forEach(c => {
      const ok = !f || c.dataset.s.includes(f);
      c.hidden = !ok; if (ok) n++;
    });
    sec.hidden = !n;
    const em = sec.querySelector(".sechead em");
    if (em) em.textContent = (f ? n + " из " : "") + sec.querySelectorAll(".tcard").length + " поз.";
    shown += n;
  });
  let none = $("tnone");
  if (!none){ none = document.createElement("p"); none.id = "tnone"; none.className = "empty"; $("tres").after(none); }
  none.textContent = f && !shown ? "Ничего не найдено — проверьте написание." : "";
  none.hidden = !(f && !shown);
}
$("tq").addEventListener("input", filterTtk);

/* ── разделы: «три полоски» → шторка справа. Под названием — живые подсказки (чеклист, холодильники); закрыть —
   крестиком, нажатием мимо, свайпом вправо, Esc или кнопкой «назад» телефона ── */
let btNavOpen = false, btNavHist = false, btSx = null;
function btHints(){
  const set = (k, t) => { const el = document.querySelector('#sect [data-s="' + k + '"] small'); if (el && t) el.textContent = t; };
  try { if (typeof ckView === "function" && ckSt){ const v = ckView(), all = CK.flatMap(g => g.items); set("open", "отмечено " + all.filter(x => v[x[0]]).length + " из " + all.length); } } catch (e) {}
  try { if (typeof frRec === "function" && frSt && !frEarly()){ const day = frDayNow(), fr = FR.filter(f => !f.room); set("fr", "начало смены — " + fr.filter(f => frRec(f.id, day).s).length + " из " + fr.length); } } catch (e) {}
}
function btNav(open){
  if (open === btNavOpen) return;
  btNavOpen = open;
  $("btNav").classList.toggle("open", open); $("btDim").classList.toggle("open", open);
  $("btBurger").setAttribute("aria-expanded", String(open));
  document.documentElement.classList.toggle("navopen", open);                // страница под шторкой не прокручивается
  if (open){
    btHints();
    $("btNavWho").innerHTML = me ? "Вы вошли: <b>" + esc(me.name) + "</b>" : "";
    history.pushState({btnav: 1}, ""); btNavHist = true;                      // «назад» телефона закрывает шторку
    setTimeout(() => (document.querySelector('#sect [aria-pressed="true"]') || $("btNavX")).focus({preventScroll: true}), 80);
  } else {
    if (btNavHist){ btNavHist = false; if (history.state && history.state.btnav) history.back(); }
    if (!$("viewBt").hidden) $("btBurger").focus({preventScroll: true});
  }
}
window.addEventListener("popstate", () => { if (btNavOpen){ btNavHist = false; btNav(false); } });
$("btBurger").addEventListener("click", () => { buzz(8); btNav(true); });
$("btNavX").addEventListener("click", () => btNav(false));
$("btDim").addEventListener("click", () => btNav(false));
document.addEventListener("keydown", e => {
  if (!btNavOpen) return;
  if (e.key === "Escape"){ e.preventDefault(); btNav(false); return; }
  if (e.key !== "Tab") return;                                                 // фокус не уходит со шторки
  const f = [...$("btNav").querySelectorAll("button")], i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
});
$("btNav").addEventListener("touchstart", e => { btSx = e.touches[0].clientX; }, {passive: true});
$("btNav").addEventListener("touchend", e => { if (btSx != null && e.changedTouches[0].clientX - btSx > 70) btNav(false); btSx = null; }, {passive: true});
$("sect").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]");
  if (!b) return;
  buzz(8); setSect(b.dataset.s); btNav(false);
  window.scrollTo({top: 0});
});
$("tres").addEventListener("click", e => {
  const b = e.target.closest(".to-calc");
  if (!b) return;
  $("pos").value = b.dataset.c;
  buildIngs(); syncInput(); drawCalc();
  setSect("calc");
  window.scrollTo(0, 0);
});
