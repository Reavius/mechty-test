/* Заявка и «Взять на бар»: списки с галочками. */
/* ════════════ Список с галочками ════════════
   Галочка — позиция переносится в список сверху, там же — количество. Отметки — на этом устройстве.
   Один и тот же механизм у заявки (две заявки: заготовщиков и общая) и у раздела «Взять на бар». */
function checklist(o){
  const read = (suf, d) => { try { return JSON.parse(localStorage.getItem(o.key() + suf) || d) || JSON.parse(d); } catch (e) { return JSON.parse(d); } };
  const write = (suf, v) => { try { localStorage.setItem(o.key() + suf, JSON.stringify(v)); } catch (e) {} };
  /* испорченная запись на устройстве — как пустая, чтобы не мешать входу */
  const readNeed = () => { const v = read("", "[]"); return new Set(Array.isArray(v) ? v : []); }, writeNeed = set => write("", [...set]);
  /* количество — свободным текстом («5 кг») или только числом (o.num) */
  const readQty = () => { const v = read("-q", "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }, writeQty = q => write("-q", q);
  const el = id => $(o.id + id), copyLabel = el("copy").textContent;
  /* свои позиции (o.custom): чего нет в списке — «изюм 100 гр»; хранятся на устройстве, у каждой заявки свои */
  const OWN = "Своё";
  const readOwn = () => { const v = read("-c", "[]"); return Array.isArray(v) ? v.filter(x => typeof x === "string" && x) : []; }, writeOwn = a => write("-c", a);
  const base = o.list;
  o.list = () => { const L = base(), own = o.custom ? readOwn() : []; return own.length ? L.concat([{g: OWN, items: own, own: true}]) : L; };

  function fill(){
    const need = readNeed(), L = o.list();
    el("list").innerHTML = L.length
      ? L.map(g =>
          '<div class="result tcard"><div class="tname"><em>' + g.items.length + ' поз.</em><h3>' + esc(g.own ? "Своё — нет в списке" : g.g) + '</h3></div>' +
          '<ul class="olist">' + g.items.map(n =>
            '<li' + (need.has(n) ? ' class="on"' : '') + '><label><span>' + esc(n) + '</span>' +
            '<input type="checkbox" data-n="' + esc(n) + '"' + (need.has(n) ? ' checked' : '') +
            ' aria-label="' + o.pick + ': ' + esc(n) + '"></label></li>').join("") +
          '</ul></div>').join("")
      : '<p class="empty">' + o.none + '</p>';
    drawSum();
  }

  /* сводка сверху: отмеченное, по группам */
  function drawSum(){
    const need = readNeed(), qty = readQty();
    const groups = o.list().map(g => ({g:g.g, items:g.items.filter(n => need.has(n))})).filter(g => g.items.length);
    const n = groups.reduce((a, g) => a + g.items.length, 0);
    el("count").textContent = n + " поз.";
    el("sum").innerHTML = n
      ? groups.map(g => '<div class="osub">' + esc(g.g) + '</div><ul class="olist">' +
          g.items.map(x => '<li><div class="row1' + (qty[x] ? ' has-q' : '') + '"><span>' + esc(x) + '</span>' +
            '<input type="text" class="oq" inputmode="' + (o.num ? "decimal" : "text") + '" enterkeyhint="done" autocomplete="off" maxlength="16"' +
            ' placeholder="кол-во" value="' + esc(qty[x] || "") + '" data-n="' + esc(x) + '" aria-label="Количество: ' + esc(x) + '">' +
            '<button type="button" class="x" data-n="' + esc(x) + '" aria-label="Убрать: ' + esc(x) + '">×</button></div></li>').join("") +
          '</ul>').join("")
      : '<p class="oempty">' + o.empty + '</p>';
    el("copy").disabled = el("reset").disabled = !n;
  }

  function setNeed(name, on){
    const need = readNeed();
    on ? need.add(name) : need.delete(name);
    writeNeed(need);
    if (!on){ const q = readQty(); if (name in q){ delete q[name]; writeQty(q); } }
    if (!on && o.custom){ const own = readOwn(); if (own.includes(name)){ writeOwn(own.filter(x => x !== name)); return fill(); } }   // своё сняли — убрать совсем
    const box = [...el("list").querySelectorAll("input")].find(b => b.dataset.n === name);
    if (box){ box.checked = on; box.closest("li").classList.toggle("on", on); }
    drawSum();
  }

  el("list").addEventListener("change", e => {
    const box = e.target.closest("input[type=checkbox]");
    if (box){ buzz(box.checked ? 14 : 8); setNeed(box.dataset.n, box.checked); }
  });
  el("sum").addEventListener("click", e => {
    const b = e.target.closest("button.x");
    if (b){ buzz(8); setNeed(b.dataset.n, false); }
  });

  /* количество сохраняется сразу, при вводе */
  el("sum").addEventListener("input", e => {
    const inp = e.target.closest("input.oq");
    if (!inp) return;
    let v = inp.value;
    if (o.num){                                               // только цифры и одна запятая; курсор — на месте
      const was = v, at = inp.selectionStart;
      v = v.replace(/[^\d.,]/g, "");
      const i = v.search(/[.,]/);
      if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, "");
      if (v !== was){ inp.value = v; const p = Math.max(0, at - (was.length - v.length)); inp.setSelectionRange(p, p); }
      v = v.replace(/[.,]$/, "").replace(/^[.,]/, "0$&");      // «3,» → «3», «,5» → «0,5»
    }
    const q = readQty();
    v = v.replace(/\s+/g, " ").trim();
    v ? q[inp.dataset.n] = v : delete q[inp.dataset.n];
    writeQty(q);
    inp.closest(".row1").classList.toggle("has-q", !!v);
  });
  el("sum").addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.closest("input.oq")){ e.preventDefault(); e.target.blur(); }
  });

  el("reset").addEventListener("click", () => {
    if (!confirm("Отменить все выбранные позиции?")) return;
    writeNeed(new Set());
    writeQty({});
    if (o.custom) writeOwn([]);
    fill();
  });

  el("copy").addEventListener("click", async () => {
    const need = readNeed(), qty = readQty();
    const d = new Date();
    const lines = [o.head + " " + String(d.getDate()).padStart(2,"0") + "." +
      String(d.getMonth()+1).padStart(2,"0") + "." + d.getFullYear()];
    const line = n => "— " + n + (qty[n] ? " " + qty[n] : "");
    if (o.groups)                                             // по разделам — так удобнее собирать
      for (const g of o.list()){ const its = g.items.filter(n => need.has(n)); if (its.length) lines.push("", g.g, ...its.map(line)); }
    else                                                      // одним столбиком, без разделов
      lines.push("", ...o.list().flatMap(g => g.items.filter(n => need.has(n))).map(line));
    const text = lines.join("\n");
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { ok = document.execCommand("copy"); } catch (e2) {}
      t.remove();
    }
    el("copy").textContent = ok ? "Скопировано ✓" : "Не удалось скопировать";
    setTimeout(() => { el("copy").textContent = copyLabel; }, 2000);
  });

  if (o.custom) el("new").addEventListener("submit", e => {
    e.preventDefault();
    const name = el("nn").value.replace(/\s+/g, " ").trim(), q = el("nq").value.replace(/\s+/g, " ").trim();
    if (!name){ el("nn").focus(); return; }
    const n0 = name.charAt(0).toUpperCase() + name.slice(1), low = n0.toLowerCase();
    /* уже есть в списке (или среди своих) — просто отметить её */
    const hit = o.list().flatMap(g => g.items).find(x => x.toLowerCase() === low);
    if (!hit){ const own = readOwn(); own.push(n0); writeOwn(own); }
    const n = hit || n0, need = readNeed(); need.add(n); writeNeed(need);
    if (q){ const qq = readQty(); qq[n] = q; writeQty(qq); }
    el("nn").value = ""; el("nq").value = "";
    buzz(14); fill();
  });

  return {fill};
}

/* ════════════ Заявка ════════════ */
/* Две заявки: заготовщиков и общая. Галочка = нужно заказать. */
const OKINDS = {
  prep: {key:"mechty-order-need", title:"Заявка заготовщиков", list:() => Z},
  gen:  {key:"mechty-order-gen",  title:"Общая заявка",        list:() => ZO}
};
let okind = "prep";
try { if (localStorage.getItem("mechty-okind") === "gen") okind = "gen"; localStorage.removeItem("mechty-order"); } catch (e) {}
const OL = () => OKINDS[okind].list();

const orderList = checklist({id: "o", key: () => OKINDS[okind].key, list: OL, pick: "Заказать", head: "Заявка", custom: true,
  none: "Список заявки пока не загружен.", empty: "Пока пусто. Отметьте галочкой в списке ниже то, что нужно заказать."});

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
  orderList.fill();
}

/* ════════════ Взять на бар ════════════ */
/* Что взять с собой на бар: тот же список с галочками, количество — числом, копируется по разделам. */
const zoneList = checklist({id: "z", key: () => "mechty-zone-need", list: () => ZN, pick: "Взять", head: "Взять на бар", num: true, groups: true,
  none: "Список пока не загружен.", empty: "Пока пусто. Отметьте галочкой в списке ниже то, что нужно взять на бар."});
const fillZone = () => zoneList.fill();
