/* Заявка. */
/* ════════════ Заявка ════════════ */
/* Две заявки: заготовщиков и общая. Галочка = нужно заказать; отметки — на этом устройстве. */
const OKINDS = {
  prep: {key:"mechty-order-need", title:"Заявка заготовщиков", list:() => Z},
  gen:  {key:"mechty-order-gen",  title:"Общая заявка",        list:() => ZO}
};
let okind = "prep";
try { if (localStorage.getItem("mechty-okind") === "gen") okind = "gen"; localStorage.removeItem("mechty-order"); } catch (e) {}
const OL = () => OKINDS[okind].list();

function readNeed(){
  try { return new Set(JSON.parse(localStorage.getItem(OKINDS[okind].key) || "[]")); } catch (e) { return new Set(); }
}
function writeNeed(set){
  try { localStorage.setItem(OKINDS[okind].key, JSON.stringify([...set])); } catch (e) {}
}
/* количество к каждой отмеченной позиции — свободным текстом: «5 кг», «2 шт», «300 г» */
function readQty(){
  try { return JSON.parse(localStorage.getItem(OKINDS[okind].key + "-q") || "{}") || {}; } catch (e) { return {}; }
}
function writeQty(q){
  try { localStorage.setItem(OKINDS[okind].key + "-q", JSON.stringify(q)); } catch (e) {}
}

$("okind").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  okind = b.dataset.o;
  try { localStorage.setItem("mechty-okind", okind); } catch (e2) {}
  fillOrder();
});

function fillOrder(){
  document.querySelectorAll("#okind button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.o === okind)));
  $("otitle").textContent = "К заказу · " + (okind === "gen" ? "общая" : "заготовщики");
  const need = readNeed();
  $("olist").innerHTML = OL().length
    ? OL().map(g =>
        '<div class="result tcard"><div class="tname"><em>' + g.items.length + ' поз.</em><h3>' + esc(g.g) + '</h3></div>' +
        '<ul class="olist">' + g.items.map(n =>
          '<li' + (need.has(n) ? ' class="on"' : '') + '><label><span>' + esc(n) + '</span>' +
          '<input type="checkbox" data-n="' + esc(n) + '"' + (need.has(n) ? ' checked' : '') +
          ' aria-label="Заказать: ' + esc(n) + '"></label></li>').join("") +
        '</ul></div>').join("")
    : '<p class="empty">Список заявки пока не загружен.</p>';
  drawSum();
}

/* сводка сверху: отмеченное, по группам */
function drawSum(){
  const need = readNeed(), qty = readQty();
  const groups = OL().map(g => ({g:g.g, items:g.items.filter(n => need.has(n))})).filter(g => g.items.length);
  const n = groups.reduce((a, g) => a + g.items.length, 0);
  $("ocount").textContent = n + " поз.";
  $("osum").innerHTML = n
    ? groups.map(g => '<div class="osub">' + esc(g.g) + '</div><ul class="olist">' +
        g.items.map(x => '<li><div class="row1' + (qty[x] ? ' has-q' : '') + '"><span>' + esc(x) + '</span>' +
          '<input type="text" class="oq" inputmode="text" enterkeyhint="done" autocomplete="off" maxlength="24"' +
          ' placeholder="кол-во" value="' + esc(qty[x] || "") + '" data-n="' + esc(x) + '" aria-label="Количество: ' + esc(x) + '">' +
          '<button type="button" class="x" data-n="' + esc(x) + '" aria-label="Убрать: ' + esc(x) + '">×</button></div></li>').join("") +
        '</ul>').join("")
    : '<p class="oempty">Пока пусто. Отметьте галочкой в списке ниже то, что нужно заказать.</p>';
  $("ocopy").disabled = $("oreset").disabled = !n;
}

function setNeed(name, on){
  const need = readNeed();
  on ? need.add(name) : need.delete(name);
  writeNeed(need);
  if (!on){ const q = readQty(); if (name in q){ delete q[name]; writeQty(q); } }
  const box = [...document.querySelectorAll("#olist input")].find(b => b.dataset.n === name);
  if (box){ box.checked = on; box.closest("li").classList.toggle("on", on); }
  drawSum();
}

$("olist").addEventListener("change", e => {
  const box = e.target.closest("input[type=checkbox]");
  if (box){ buzz(box.checked ? 14 : 8); setNeed(box.dataset.n, box.checked); }
});
$("osum").addEventListener("click", e => {
  const b = e.target.closest("button.x");
  if (b){ buzz(8); setNeed(b.dataset.n, false); }
});

/* количество сохраняется сразу, при вводе */
$("osum").addEventListener("input", e => {
  const inp = e.target.closest("input.oq");
  if (!inp) return;
  const q = readQty(), v = inp.value.replace(/\s+/g, " ").trim();
  v ? q[inp.dataset.n] = v : delete q[inp.dataset.n];
  writeQty(q);
  inp.closest(".row1").classList.toggle("has-q", !!v);
});
$("osum").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.closest("input.oq")){ e.preventDefault(); e.target.blur(); }
});

$("oreset").addEventListener("click", () => {
  if (!confirm("Отменить все выбранные позиции?")) return;
  writeNeed(new Set());
  writeQty({});
  fillOrder();
});

$("ocopy").addEventListener("click", async () => {
  const need = readNeed(), qty = readQty();
  const d = new Date();
  const lines = ["Заявка " + String(d.getDate()).padStart(2,"0") + "." +
    String(d.getMonth()+1).padStart(2,"0") + "." + d.getFullYear()];
  /* одним столбиком, без разделов */
  const items = OL().flatMap(g => g.items.filter(n => need.has(n)));
  lines.push("", ...items.map(n => "— " + n + (qty[n] ? " " + qty[n] : "")));
  const text = lines.join("\n");
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    const t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    try { ok = document.execCommand("copy"); } catch (e2) {}
    t.remove();
  }
  $("ocopy").textContent = ok ? "Скопировано ✓" : "Не удалось скопировать";
  setTimeout(() => { $("ocopy").textContent = "Скопировать заявку"; }, 2000);
});
