/* Этикетки Niimbot 50×30. */
/* ════════════ Этикетки ════════════
   Рисуются на canvas чёрным по белому — для термопринтера (Niimbot). Состав — только
   из открытой коктейльной карты, QR ведёт на позицию в ней. Украшения — labels/*.png. */
const LSIZES = [[50, 30]];                         // принтер бара — 50×30 мм
const LPX = 16;                                    // точек на мм (≈ 400 dpi, с запасом)
/* значки: свои (лимон, ягоды) — из шаблонов бара, остальные — из набора i-*.png */
const LICON = {limoncello:"lemon", vishnya:"berries", malina:"berries",
  pantera:"i-pear", grusha:"i-pear", pinklady:"i-apple", pornstar:"i-plum", maracuya:"i-plum",
  tropiki:"i-pineapple", maitai:"i-apricot", negroni:"i-orange", longisland:"i-lemon2",
  hugo:"i-herb", shchavel:"i-herb", tarhun:"i-herb", koritsa:"i-herb", bluecolada:"i-melon",
  summer:"i-strawberry", klubnika:"i-strawberry", chili:"i-raspberry", bramble:"i-raspberry",
  barbaris:"i-raspberry", oblepiha:"i-grapes", grapefruit:"i-orange"};
const LIMG = {};
let lsize = 0, labReady = false;
try { lsize = Math.min(+localStorage.getItem("mechty-lsize") || 0, LSIZES.length - 1); } catch (e) {}

function limg(name){
  if (!LIMG[name]) LIMG[name] = new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = "labels/" + name + ".png"; });
  return LIMG[name];
}

/* короткие названия для этикетки: без юридических приставок */
function lshort(n){
  return String(n)
    .replace(/^Ароматизированный виносодержащий напиток из виноградного сырья «(.+)»$/, "$1")
    .replace(/^Спиртной напиток «(.+)»$/, "$1")
    .replace(/^Коктейль «(.+)» с (ромом|текилой)$/, "$1")
    .replace(/^Ликёр (десертный|крепкий выдержанный) /, "")
    .replace(/^Ликёр /, "")
    .replace(/^Настойка горькая /, "")
    .replace(/^Джин сухой (дистиллированный )?/, "Джин ")
    .replace(/^Ром выдержанный /, "Ром ")
    .replace(/^Вермут /, "")
    .replace(/^Пюре фруктовое «(.+)»$/, (m, a) => "Пюре " + a.toLowerCase())
    .replace(/^Пюре концентрированное /, "Пюре ")
    .replace(/^Вино «.+» /, "Вино ")
    .replace(/ п\/ф$/, "")
    .replace(/[«»]/g, "");
}

const lall = () => data.filter(g => !g.nolabel).flatMap(g => g.items.map(it => ({it, g})));
const lcur = () => { const v = $("lpos").value; return lall().find(x => x.it.id === v) || lall()[0]; };
const lurl = id => location.origin + location.pathname.replace(/index\.html$/, "") + "#" + id;
const ldmy = d => String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getFullYear()).slice(2);

function labInit(){
  if (!labReady){
    labReady = true;
    $("lpos").innerHTML = data.filter(g => !g.nolabel).map(g => '<optgroup label="' + esc(g.cat) + '">' +
      g.items.map(it => '<option value="' + esc(it.id) + '">' + esc(it.n) + '</option>').join("") + '</optgroup>').join("");
    try { const v = localStorage.getItem("mechty-lpos"); if (v && lall().some(x => x.it.id === v)) $("lpos").value = v; } catch (e) {}
    $("lsize").innerHTML = LSIZES.map((s, i) => '<button type="button" data-i="' + i + '" aria-pressed="' + (i === lsize) + '">' + s[0] + '×' + s[1] + '</button>').join("");
    $("lpos").addEventListener("change", labDraw);
    $("lsize").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      lsize = +b.dataset.i;
      try { localStorage.setItem("mechty-lsize", lsize); } catch (e2) {}
      document.querySelectorAll("#lsize button").forEach(x => x.setAttribute("aria-pressed", String(+x.dataset.i === lsize)));
      labDraw();
    });
  }
  labDraw();
}

/* подбор размера шрифта под ширину */
function lfit(ctx, text, max, size, weight){
  for (let s = size; s > 6; s -= 1){
    ctx.font = (weight || 400) + " " + s + 'px "PT Serif", Georgia, serif';
    if (ctx.measureText(text).width <= max) return s;
  }
  return 6;
}

/* значки строк: булавка, часы, человечек */
function lglyph(ctx, kind, x, y, s){
  ctx.save(); ctx.fillStyle = ctx.strokeStyle = "#000"; ctx.lineWidth = Math.max(1, s * .12);
  if (kind === "pin"){
    ctx.beginPath(); ctx.arc(x + s * .5, y + s * .3, s * .26, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * .5, y + s * .5); ctx.lineTo(x + s * .5, y + s * .98); ctx.stroke();
  } else if (kind === "clock"){
    ctx.beginPath(); ctx.arc(x + s * .5, y + s * .55, s * .36, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * .5, y + s * .55); ctx.lineTo(x + s * .5, y + s * .33);
    ctx.moveTo(x + s * .5, y + s * .55); ctx.lineTo(x + s * .66, y + s * .62); ctx.stroke();
    ctx.fillRect(x + s * .38, y + s * .05, s * .24, s * .1);
  } else {
    ctx.beginPath(); ctx.arc(x + s * .5, y + s * .55, s * .4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * .5, y + s * .58, s * .2, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    ctx.fillRect(x + s * .36, y + s * .4, s * .07, s * .07); ctx.fillRect(x + s * .57, y + s * .4, s * .07, s * .07);
  }
  ctx.restore();
}

function lcanvas(id, W, H){
  const c = $(id); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  return ctx;
}

async function labDraw(){
  const sel = lcur(); if (!sel) return;
  const {it, g} = sel;
  const name = it.ln || it.n;                        // короткое название для этикетки
  try { localStorage.setItem("mechty-lpos", it.id); } catch (e) {}
  const [mw, mh] = LSIZES[lsize], W = mw * LPX, H = mh * LPX;
  try { await document.fonts.load('700 40px "PT Serif"'); await document.fonts.load('400 40px "PT Serif"'); } catch (e) {}
  const [vine, corner, icon] = await Promise.all([limg("vine"), limg("corner"), LICON[it.id] ? limg(LICON[it.id]) : null]);

  /* Пропорции: одинаковые поля m со всех сторон, центрирование по осям,
     золотое сечение φ — высота QR к высоте блока текста и размер шрифта к просвету. */
  const PHI = 1.618, m = Math.min(W, H) * .07;

  /* ── лицевая ── */
  let ctx = lcanvas("lfront", W, H);
  const vh = H * .2, vw = vine ? vine.width * vh / vine.height : 0, lw = Math.max(2, H * .011);
  const lineY = m + vh * (72 / 148);                      // линия на уровне стебля веточки
  if (vine){
    for (const flip of [false, true]){
      ctx.save();
      if (flip){ ctx.translate(W, H); ctx.rotate(Math.PI); }
      ctx.drawImage(vine, m, m, vw, vh);
      ctx.fillRect(m + vw - 2, lineY - lw / 2, W - 2 * m - vw + 2, lw);
      ctx.restore();
    }
  }
  const gapY = H - 2 * lineY;                               // просвет между линиями
  const fsMax = gapY / (PHI * PHI * 1.3);                 // единый размер: короткие названия не раздуваются
  ctx.font = "400 " + fsMax + 'px "PT Serif", Georgia, serif';
  const isz = /^i-/.test(LICON[it.id] || "") ? 1.25 : 1;   // контурные значки визуально мельче — чуть крупнее
  const iconH = icon ? fsMax * 1.05 * isz : 0, iconW = icon ? icon.width * iconH / icon.height : 0;
  const gapX = icon ? fsMax * .3 : 0;
  const fs = lfit(ctx, name, (W - 2 * m) * .88 - iconW - gapX, fsMax, 400);
  const k = fs / fsMax, ih = iconH * k, iw = iconW * k, gx = gapX * k;
  const tw = ctx.measureText(name).width, x0 = (W - tw - gx - iw) / 2;
  ctx.fillText(name, x0, H / 2 + fs * .34);               // середина строчных букв — по центру этикетки
  if (icon) ctx.drawImage(icon, x0 + tw + gx, H / 2 - ih / 2, iw, ih);

  /* ── оборотная ── */
  ctx = lcanvas("lback", W, H);
  const cs = H * .15;
  if (corner){
    for (const flip of [false, true]){
      ctx.save();
      if (flip){ ctx.translate(W, H); ctx.rotate(Math.PI); }
      ctx.drawImage(corner, W - m * .5 - cs, m * .5, cs, cs);
      ctx.restore();
    }
  }
  /* заголовок */
  const th = H * .13;
  ctx.font = "400 " + th + 'px "PT Serif", Georgia, serif';
  const ti = icon ? th * 1.15 * isz : 0, tiw = icon ? icon.width * ti / icon.height : 0, tg = icon ? th * .25 : 0;
  const tfs = lfit(ctx, name, W - 2 * (m * .5 + cs) - tiw - tg, th, 400);
  const tk = tfs / th, ttw = ctx.measureText(name).width, tx = (W - ttw - tg * tk - tiw * tk) / 2;
  const tBase = m + tfs * .78;
  ctx.fillText(name, tx, tBase);
  if (icon) ctx.drawImage(icon, tx + ttw + tg * tk, tBase - tfs * .36 - ti * tk / 2, tiw * tk, ti * tk);

  /* тело: слева текст, справа QR; оба по центру одной горизонтали */
  const bodyTop = tBase + tfs * .3 + m * .45, bodyBottom = H - m * .8, bodyH = bodyBottom - bodyTop;
  const left = m * .5 + cs * 1.05, right = W - m;
  const qs = bodyH / PHI * 1.12, qx = right - qs, qy = bodyTop + (bodyH - qs) / 2;
  if (window.qrcode){
    const q = qrcode(0, "M"); q.addData(lurl(it.id)); q.make();
    const n = q.getModuleCount(), cell = qs / n;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (q.isDark(r, c)) ctx.fillRect(Math.floor(qx + c * cell), Math.floor(qy + r * cell), Math.ceil(cell), Math.ceil(cell));
  }

  /* строки: состав столбиком, дата, годен до, кто сделал.
     Дата — всегда сегодняшняя, сделал — тот, кто вошёл: пересчитывается при каждом сохранении. */
  const d = new Date(), who = me ? me.name : "—";
  const days = parseInt(g.srok, 10) || 0, till = new Date(d.getTime() + days * 864e5);
  const comp = (it.c || []).map(lshort);
  const tail = [["clock", "Дата производства " + ldmy(d)], ["clock", "Годен до " + ldmy(till)], ["who", who]];
  $("linfo").innerHTML = "Дата производства — сегодня, <b>" + ldmy(d) + "</b>; годен до <b>" + ldmy(till) + "</b> (" + esc(g.srok) +
    "); сделал — <b>" + esc(who) + "</b>. При сохранении дата и фамилия подставляются заново.";

  const rows = comp.map(t => ["pin", t]).concat(tail);
  const colW = qx - m * .6 - left;
  let size = Math.min(H * .08, bodyH / (rows.length * 1.15));
  ctx.font = "400 " + size + 'px "PT Serif", Georgia, serif';
  const need = Math.min(1, ...rows.map(r => (colW - size * 1.2) / ctx.measureText(r[1]).width));
  if (need < 1) size *= need;                               // уменьшаем, а не искажаем
  const step = size * 1.15, blockH = rows.length * step, y0 = bodyTop + (bodyH - blockH) / 2;
  ctx.font = "400 " + size + 'px "PT Serif", Georgia, serif';
  rows.forEach((r, i) => {
    const y = y0 + i * step;
    lglyph(ctx, r[0], left, y + step * .1, size * .85);
    ctx.fillText(r[1], left + size * 1.2, y + size * .9);
  });

  $("llink").textContent = lurl(it.id);
}

async function labShare(which){
  await labDraw();                                   // свежая дата и фамилия на момент сохранения
  const it = lcur().it, c = $(which === "front" ? "lfront" : "lback");
  const blob = await new Promise(ok => c.toBlob(ok, "image/png"));
  const name = "Этикетка " + (it.ln || it.n) + (which === "front" ? "" : " — оборот") + ".png";
  const file = new File([blob], name, {type:"image/png"});
  if (navigator.canShare && navigator.canShare({files:[file]})){
    try { await navigator.share({files:[file], title:name}); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

$("secLab").addEventListener("click", e => {
  const b = e.target.closest("button[data-l]");
  if (b) labShare(b.dataset.l);
});
$("lcopy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("llink").textContent); $("lcopy").textContent = "Скопировано ✓"; }
  catch (e) { $("lcopy").textContent = "Не удалось скопировать"; }
  setTimeout(() => { $("lcopy").textContent = "Скопировать ссылку"; }, 2000);
});
