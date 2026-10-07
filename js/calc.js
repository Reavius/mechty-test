/* Калькулятор замесов. */
/* ════════════ Калькулятор ════════════ */
let mode = "vol", cn = 1;
const cur = () => ALL.find(r => r.id === $("pos").value) || ALL[0];

function fmt(v, round){
  if (!isFinite(v)) return "0";
  if (round) v = v >= 100 ? Math.round(v / 5) * 5 : Math.round(v);
  else v = Math.round(v * 10) / 10;
  return String(v).replace(".", ",");
}

function buildPicker(){
  $("pos").innerHTML = R.map(g =>
    '<optgroup label="' + esc(g.g) + '">' +
    g.items.map(r => '<option value="' + esc(r.id) + '">' + esc(r.n) + '</option>').join("") +
    '</optgroup>').join("");
  try {
    const saved = localStorage.getItem("mechty-pos");
    if (saved && ALL.some(r => r.id === saved)) $("pos").value = saved;
  } catch (e) {}
}

function buildIngs(){
  $("ing").innerHTML = cur().i.map((x, k) =>
    '<option value="' + k + '">' + esc(x[0]) + '</option>').join("");
}

function syncInput(){
  const r = cur();
  const porBtn = document.querySelector('[data-m="por"]');
  porBtn.disabled = r.basis !== "por";
  if (mode === "por" && r.basis !== "por") return setMode("vol");

  $("stockBlock").hidden = mode !== "stock";
  const q = $("quick");

  if (mode === "vol"){
    $("valLabel").textContent = "Нужный объём";
    $("valUnit").textContent = "литров";
    q.innerHTML = [0.75, 1, 2, 3, 5].map(v =>
      '<button type="button" data-v="' + v + '">' + String(v).replace(".", ",") + ' л</button>').join("");
  } else if (mode === "por"){
    $("valLabel").textContent = "Сколько порций";
    $("valUnit").textContent = "шт.";
    q.innerHTML = [10, 20, 25, 50].map(v =>
      '<button type="button" data-v="' + v + '">' + v + '</button>').join("");
  } else if (mode === "coef"){
    $("valLabel").textContent = "Коэффициент";
    $("valUnit").textContent = "×";
    q.innerHTML = [1, 1.5, 2, 3, 5].map(v =>
      '<button type="button" data-v="' + v + '">×' + String(v).replace(".", ",") + '</button>').join("");
  } else {
    const ing = r.i[+$("ing").value || 0];
    $("valLabel").textContent = "Сколько есть в наличии";
    $("valUnit").textContent = ing ? ing[2] : "мл";
    q.innerHTML = [250, 500, 750, 1000, 2500].map(v =>
      '<button type="button" data-v="' + v + '">' + v + '</button>').join("");
  }
}

function coef(){
  const r = cur();
  const v = parseFloat(String($("val").value).replace(",", ".")) || 0;
  if (mode === "vol")  return (v * 1000) / r.out;
  if (mode === "por")  return v;
  if (mode === "coef") return v;
  const ing = r.i[+$("ing").value || 0];
  return ing && ing[1] ? v / ing[1] : 0;
}

function drawCalc(){
  if (!R) return;
  const r = cur();
  const k = coef();
  const round = $("round").checked;

  const stats = [
    ["Выход", fmt(r.out * k / 1000, false), "л"],
    ["Коэффициент", "×" + String(Math.round(k * 1000) / 1000).replace(".", ","), ""]
  ];
  if (r.basis === "por") stats.splice(1, 0, ["Порций", fmt(k, false), "шт."]);
  if (r.abv) stats.push(["Крепость", "≈ " + r.abv, "%"]);

  const rows = r.i.map(x => {
    const v = x[1] * k;
    return '<tr><td class="n">' + esc(x[0]) + '</td>' +
      '<td class="v">' + fmt(v, round) + '<small>' + esc(x[2]) + '</small></td>' +
      (cn > 1 ? '<td class="p">' + fmt(v / cn, round) + '</td>' : '') + '</tr>';
  }).join("");

  $("res").innerHTML =
    '<dl class="stats">' + stats.map(s =>
      '<div><dt>' + s[0] + '</dt><dd>' + s[1] + (s[2] ? '<small>' + s[2] + '</small>' : '') + '</dd></div>'
    ).join("") + '</dl>' +
    '<table><thead><tr><th>Ингредиент</th><th>Всего</th>' +
    (cn > 1 ? '<th>В каждый мерник</th>' : '') +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    (r.m ? '<p class="method"><b>Метод.</b> ' + esc(r.m) + '</p>' : '');

  $("resNote").textContent = (round && k > 0)
    ? "Значения округлены: до 5 от сотни и выше, до 1 ниже. Снимите «Округлять», чтобы увидеть точный расчёт."
    : "";

  try { localStorage.setItem("mechty-pos", r.id); } catch (e) {}
}

function setMode(m){
  mode = m;
  document.querySelectorAll("#modes button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.m === m)));
  syncInput();
  drawCalc();
}

function fill(){
  buildPicker();
  buildIngs();
  syncInput();
  drawCalc();
}

function start(){
  $("modes").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (b && !b.disabled) setMode(b.dataset.m);
  });
  $("cont").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    cn = +b.dataset.c;
    document.querySelectorAll("#cont button").forEach(x =>
      x.setAttribute("aria-pressed", String(+x.dataset.c === cn)));
    drawCalc();
  });
  $("quick").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    $("val").value = b.dataset.v;
    drawCalc();
  });
  $("pos").addEventListener("change", () => { buildIngs(); syncInput(); drawCalc(); });
  $("ing").addEventListener("change", () => { syncInput(); drawCalc(); });
  ["val","round"].forEach(id => $(id).addEventListener("input", drawCalc));
}
