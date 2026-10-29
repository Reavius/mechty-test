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

/* Многосоставный ингредиент (п/ф, премикс) — своя рецептура в калькуляторе: нажали на название — под строкой его состав
   ровно на это количество (и на каждый мерник), внутри — так же. Связь по названию: «Фисташковая база п/ф» → «Фисташковая база». */
const ckey = s => String(s).toLowerCase().replace(/ё/g, "е").replace(/\s*(п\/ф|\(премикс\))\s*/g, " ").replace(/\s+/g, " ").trim();
const csub = (x, path) => {
  if (x[2] !== "мл") return null;
  const r = ALL.find(y => ckey(y.n) === ckey(x[0]));
  return r && r.out > 0 && !path.includes(r.id) ? r : null;
};
const copen = new Set();
/* стрелка — вместе с последним словом, чтобы не уезжала на отдельную строку */
const csubName = n => { const i = n.lastIndexOf(" ") + 1;
  return esc(n.slice(0, i)) + '<span class="cw">' + esc(n.slice(i)) + '<i class="car" aria-hidden="true"></i></span>'; };
const kfmt = k => "×" + String(Math.round(k * 1000) / 1000).replace(".", ",");
function crows(r, k, round, path){
  const lvl = path.length - 1, cols = cn > 1 ? 3 : 2, cin = l => ' class="cin" style="--l:' + l + '"';
  return r.i.map(x => {
    const v = x[1] * k, s = csub(x, path), key = s ? path.concat(s.id).join(">") : "", on = !!s && copen.has(key);
    let h = '<tr' + (lvl ? cin(lvl) : '') + '><td class="n">' +
      (s ? '<button type="button" class="csub" data-k="' + esc(key) + '" aria-expanded="' + on + '">' + csubName(x[0]) + '</button>' : esc(x[0])) + '</td>' +
      '<td class="v">' + fmt(v, round) + '<small>' + esc(x[2]) + '</small></td>' +
      (cn > 1 ? '<td class="p">' + fmt(v / cn, round) + '</td>' : '') + '</tr>';
    if (on){
      const sk = v / s.out;
      h += '<tr' + cin(lvl + 1).replace('"cin"', '"cin ccap"') + '><td colspan="' + cols + '">' + esc(s.n) + ' на ' + fmt(v, round) + ' мл — ' + kfmt(sk) + ' от замеса' +
        (cn > 1 ? ', в мерник — ' + fmt(v / cn, round) + ' мл' : '') + '</td></tr>' + crows(s, sk, round, path.concat(s.id)) +
        (s.m ? '<tr' + cin(lvl + 1).replace('"cin"', '"cin ccap"') + '><td colspan="' + cols + '"><b>Метод.</b> ' + esc(s.m) + '</td></tr>' : '');
    }
    return h;
  }).join("");
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

  const rows = crows(r, k, round, [r.id]), subs = r.i.some(x => csub(x, [r.id]));

  $("res").innerHTML =
    '<dl class="stats">' + stats.map(s =>
      '<div><dt>' + s[0] + '</dt><dd>' + s[1] + (s[2] ? '<small>' + s[2] + '</small>' : '') + '</dd></div>'
    ).join("") + '</dl>' +
    '<table><thead><tr><th>Ингредиент</th><th>Всего</th>' +
    (cn > 1 ? '<th>В каждый мерник</th>' : '') +
    '</tr></thead><tbody>' + rows + '</tbody></table>' +
    (r.m ? '<p class="method"><b>Метод.</b> ' + esc(r.m) + '</p>' : '') +
    (subs ? '<p class="method">Подчёркнутое — п/ф или премикс: нажмите, чтобы увидеть его состав на это количество.</p>' : '');

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
  $("res").addEventListener("click", e => {
    const b = e.target.closest(".csub");
    if (!b) return;
    const k = b.dataset.k;
    if (!copen.delete(k)) copen.add(k);
    drawCalc();
    const nb = [...$("res").querySelectorAll(".csub")].find(x => x.dataset.k === k);
    if (nb) nb.focus();
  });
  $("pos").addEventListener("change", () => { buildIngs(); syncInput(); drawCalc(); });
  $("ing").addEventListener("change", () => { syncInput(); drawCalc(); });
  ["val","round"].forEach(id => $(id).addEventListener("input", drawCalc));
}
