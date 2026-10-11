/* Карта «Состав и аллергены» (вторая вкладка гостевой части). По-английски — из CARD_EN и GROUP_EN (js/menu.js). */
const total = () => data.reduce((a,g) => a + g.items.filter(it => !it.lo).length, 0);
let active = "all";

/* состав для гостей — слова как в меню бара (m), столбиком и с большой буквы; полный (c) — только на этикетках */
const compRu = it => it.m || it.c.join(", ");
const comp = it => EN() && CARD_EN[it.id] && CARD_EN[it.id][1] || compRu(it);
const cname = it => EN() && CARD_EN[it.id] && CARD_EN[it.id][0] || it.n;
const gtext = (g, i) => EN() && GROUP_EN[g.key] && GROUP_EN[g.key][i] || [g.cat, g.short, g.rule][i];
const compList = it => comp(it).split(/,\s*/).filter(Boolean).map(x => x.charAt(0).toUpperCase() + x.slice(1));

function card(it, g){
  const n = cname(it);
  return '<article id="' + esc(it.id) + '">' +
    '<div class="chead"><h3>' + esc(n) + '</h3></div>' +
    '<div class="cbody"><ul class="mcomp">' + compList(it).map(x => '<li>' + esc(x) + '</li>').join("") + '</ul>' +
    (it.img ? '<img class="cph" src="' + esc(it.img) + '" alt="' + esc(n) + '"' + phwh(it.img) + ' loading="lazy" decoding="async">' : '') +
    '</div>' +
    '<dl>' +
      (g.serve ? '<dt>' + t("serve") + '</dt><dd>' + esc(it.vol) + ' ' + t("serveDd") + '</dd>' :
      '<dt>' + t("srok") + '</dt><dd class="num">' + esc(EN() ? srokEn(g.srok) : g.srok) + '</dd>') +
      '<dt>' + t("al") + '</dt><dd class="' + (it.flag ? "flag" : "none") + '">' + esc(EN() ? it.alEn || alEn(it.al) : it.al) + '</dd>' +
    '</dl></article>';
}

/* поиск — на обоих языках */
function matches(it, f){
  const en = CARD_EN[it.id] || [];
  return !f || [it.n, compRu(it), en[0] || "", en[1] || ""].some(s => s.toLowerCase().includes(f));
}

function drawCard(){
  const f = $("q").value.trim().toLowerCase();
  let html = "";

  for (const g of data){
    if (active !== "all" && active !== g.key) continue;
    const items = g.items.filter(it => !it.lo && matches(it, f));   // lo — только для этикеток, не в карте
    if (!items.length) continue;
    html +=
      '<section><div class="sechead"><h2>' + esc(gtext(g, 0)) + '</h2>' +
      '<em>' + items.length + ' ' + t("of") + ' ' + g.items.filter(it => !it.lo).length + '</em></div>' +
      '<p class="rule">' + esc(gtext(g, 2)) + '</p>' +
      '<div class="grid">' + items.map(it => card(it, g)).join("") + '</div></section>';
  }

  $("out").innerHTML =
    html || '<p class="empty">' + t("empty") + '</p>';

  document.querySelectorAll("#chips button").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.key === active));
  });
}

function drawChips(){
  const defs = [{key:"all", label:t("all"), n:total()}]
    .concat(data.map(g => ({key:g.key, label:gtext(g, 1), n:g.items.filter(it => !it.lo).length})));

  $("chips").innerHTML = defs.map(d =>
    '<button type="button" data-key="' + esc(d.key) + '" aria-pressed="false">' +
    esc(d.label) + '<b>' + d.n + '</b></button>'
  ).join("");
}

$("chips").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  active = b.dataset.key;
  drawCard();
});

/* ссылка #id (QR на ярлыке, «Состав и аллергены» в меню) — вкладка карты и позиция */
function jumpTo(id){
  if (!cardItem(id)) return;
  gPanel("card");
  active = "all";
  $("q").value = "";
  drawCard();
  const el = document.getElementById(id);
  if (!el || el.tagName !== "ARTICLE") return;
  document.querySelectorAll("article.hit").forEach(a => a.classList.remove("hit"));
  el.classList.add("hit");
  el.scrollIntoView({block:"start", behavior:"smooth"});
}

drawChips();
drawCard();
$("q").addEventListener("input", drawCard);
