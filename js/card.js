/* Открытая коктейльная карта. */
const TOTAL = data.reduce((a,g) => a + g.items.length, 0);
let active = "all";

function card(it, g){
  const badge = g.nonalc ? '<span class="abv na">б/а</span>'
    : '<span class="abv">≈ ' + it.abv + ' % об.</span>';

  return '<article id="' + it.id + '">' +
    '<div class="chead"><h3>' + esc(it.n) + '</h3>' + badge + '</div>' +
    '<div class="cbody"><ul>' + it.c.map(x => '<li>' + esc(x) + '</li>').join("") + '</ul>' +
    (it.img ? '<img class="cph" src="' + esc(it.img) + '" alt="' + esc(it.n) + '"' + phwh(it.img) + ' loading="lazy" decoding="async">' : '') +
    '</div>' +
    '<dl>' +
      (g.serve ? '<dt>Подача</dt><dd>' + it.vol + ' мл, сразу после приготовления</dd>' :
      '<dt>Годность</dt><dd class="num">' + g.srok + '</dd>' +
      '<dt>Хранение</dt><dd class="num">t ' + g.store + '</dd>') +
      '<dt>Аллергены</dt><dd class="' + (it.flag ? "flag" : "none") + '">' + esc(it.al) + '</dd>' +
    '</dl></article>';
}

function matches(it, f){
  return !f || it.n.toLowerCase().includes(f) || it.c.some(c => c.toLowerCase().includes(f));
}

function drawCard(){
  const f = $("q").value.trim().toLowerCase();
  let html = "";

  for (const g of data){
    if (active !== "all" && active !== g.key) continue;
    const items = g.items.filter(it => matches(it, f));
    if (!items.length) continue;
    html +=
      '<section><div class="sechead"><h2>' + g.cat + '</h2>' +
      '<em>' + items.length + ' из ' + g.items.length + '</em></div>' +
      '<p class="rule">' + g.rule + '</p>' +
      '<div class="grid">' + items.map(it => card(it, g)).join("") + '</div></section>';
  }

  $("out").innerHTML =
    html || '<p class="empty">Ничего не найдено — проверьте написание или сбросьте фильтр.</p>';

  document.querySelectorAll("#chips button").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.key === active));
  });
}

function buildChips(){
  const el = $("chips");
  const defs = [{key:"all", label:"Все", n:TOTAL}]
    .concat(data.map(g => ({key:g.key, label:g.short, n:g.items.length})));

  el.innerHTML = defs.map(d =>
    '<button type="button" data-key="' + d.key + '" aria-pressed="false">' +
    d.label + '<b>' + d.n + '</b></button>'
  ).join("");

  el.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    active = b.dataset.key;
    drawCard();
  });
}

function jumpTo(id){
  active = "all";
  $("q").value = "";
  drawCard();
  const el = document.getElementById(id);
  if (!el || el.tagName !== "ARTICLE") return;
  document.querySelectorAll("article.hit").forEach(a => a.classList.remove("hit"));
  el.classList.add("hit");
  el.scrollIntoView({block:"start", behavior:"smooth"});
}

buildChips();
drawCard();
$("q").addEventListener("input", drawCard);
