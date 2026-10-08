/* Технологическая карта и переключение разделов. */
/* ════════════ Технологическая карта ════════════ */
let sect = "ttk";
try { const v = localStorage.getItem("mechty-sect"); if (v === "calc" || v === "order" || v === "rev" || v === "lab" || v === "wo") sect = v; } catch (e) {}

const SECT = {
  ttk:  ["Технологическая<br>карта", "Граммовки, посуда, метод и украшение для каждого напитка и заготовки."],
  calc: ["Калькулятор<br>замесов", "Пересчёт рецептур на нужный объём, число порций, коэффициент или остаток ингредиента."],
  lab:   ["Этикетки", "Две этикетки на позицию: лицевая и оборотная с составом, датами и QR-кодом. Только открытые данные коктейльной карты."],
  rev:   ["Ревизия", "Ежедневная — пересчёт по зонам, месячная — весь бар по бланку, с поиском. Вбейте число и нажмите «+» — оно прибавится к уже посчитанному."],
  wo:    ["Списания", "Акт о списании: дата, позиции, причина, подпись — и готовый файл по бланку ООО «Заря». Копия сохраняется на Google Диске."],
  order: ["Заявка", "Выберите заявку и отметьте галочкой то, что нужно заказать, — сверху соберётся список к заказу, там же можно вписать количество. Отметки сохраняются на этом устройстве."]
};

function setSect(s){
  sect = s;
  $("secTtk").hidden = s !== "ttk";
  $("secCalc").hidden = s !== "calc";
  $("secOrder").hidden = s !== "order";
  $("secRev").hidden = s !== "rev";
  $("secLab").hidden = s !== "lab";
  $("secWo").hidden = s !== "wo";
  if (s === "lab") labInit();
  if (s === "wo") woInit();
  if (s === "rev" && R) rkindLoad();
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

  const row = x => '<tr><td class="n">' + esc(x[0]) + '</td><td class="v">' + qty(x[1], x[2]) + '</td></tr>';

  const key = [r.n].concat(r.i.map(x => x[0]), (r.dec || []).map(x => x[0]), r.gar || []).join(" ").toLowerCase();
  return '<div class="result tcard" id="t-' + esc(r.id) + '" data-s="' + esc(key) + '">' +
    '<div class="tname' + (r.img ? ' has-ph' : '') + '"><h3>' + esc(r.n) + '</h3>' +
      (r.img ? '<img class="tph" src="' + esc(r.img) + '" alt="' + esc(r.n) + '"' + phwh(r.img) + ' loading="lazy" decoding="async">' : '') + '</div>' +
    (stats.length ? '<dl class="stats txt">' + stats.map(s => '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>').join("") + '</dl>' : '') +
    '<table><thead><tr><th>Ингредиент</th><th>' + (r.out ? "На замес" : "На порцию") + '</th></tr></thead><tbody>' +
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

$("sect").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) setSect(b.dataset.s);
});
$("tres").addEventListener("click", e => {
  const b = e.target.closest(".to-calc");
  if (!b) return;
  $("pos").value = b.dataset.c;
  buildIngs(); syncInput(); drawCalc();
  setSect("calc");
  window.scrollTo(0, 0);
});
