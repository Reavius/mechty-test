/* Этикетки Niimbot 50×30. */
/* ════════════ Этикетки ════════════
   Рисуются на canvas чёрным по белому — для термопринтера (Niimbot). Состав — полный (c),
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

/* узор или значок: векторный (js/lart.js) — чёткий при любом размере; нет — картинка labels/*.png */
async function lart(name){
  if (!name) return null;
  const v = typeof LART !== "undefined" && LART[name];
  if (v){
    const p = new Path2D(v.d), rule = typeof LART_FILL !== "undefined" ? LART_FILL : "nonzero";
    return {width: v.w, height: v.h, draw: (ctx, x, y, w, h) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(w / v.w, h / v.h); ctx.fill(p, rule); ctx.restore(); }};
  }
  const im = await limg(name);
  return im ? {width: im.width, height: im.height, draw: (ctx, x, y, w, h) => ctx.drawImage(im, x, y, w, h)} : null;
}

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
    .replace(/[«»]/g, "")
    .replace(/(\d) %/g, "$1\u00a0%");                       // «6 %» не разрывается
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

/* Длинное название — в две строки, разрез по пробелу ближе к середине. */
function lsplit(name){
  const w = String(name).split(" ");
  if (w.length < 2) return [name];
  let best = null;
  for (let i = 1; i < w.length; i++){
    const a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), d = Math.abs(a.length - b.length);
    if (!best || d < best.d) best = {d, l: [a, b]};
  }
  return best.l;
}
/* размер, при котором влезают все строки */
const lfitAll = (ctx, lines, max, size, weight) => Math.min(...lines.map(t => lfit(ctx, t, max, size, weight)));

/* Самый крупный шрифт, при котором все строки влезают в колонку по высоте;
   длинная строка переносится по словам (с отступом под текст), а не сжимается. */
function lwrap(ctx, rows, width, height, maxS, gap){
  gap = gap || 1.17;
  for (let s = Math.floor(maxS); s >= 14; s--){
    const ind = s * 1.15, w = width - ind, lines = [];
    let y = 0, ok = true;
    for (const [glyph, text, wt] of rows){
      ctx.font = wt + " " + s + 'px "PT Serif", Georgia, serif';
      let cur = "", first = true;
      for (const word of String(text).split(/ +/)){          // неразрывный пробел держит слова вместе
        const t = cur ? cur + " " + word : word;
        if (ctx.measureText(t).width <= w){ cur = t; continue; }
        if (!cur){ ok = false; break; }                     // одно слово не влезает — шрифт меньше
        lines.push({t: cur, y, w: wt, glyph: first ? glyph : ""}); first = false;
        y += s * 1.02; cur = word;
        if (ctx.measureText(cur).width > w){ ok = false; break; }
      }
      if (!ok) break;
      lines.push({t: cur, y, w: wt, glyph: first ? glyph : ""});
      y += s * gap;
    }
    const h = y - s * (gap - 1);
    if (ok && h <= height) return {s, ind, lines, h};
  }
  const s = 14;
  return {s, ind: s * 1.15, lines: rows.map((r, i) => ({t: r[1], y: i * s * gap, w: r[2], glyph: r[0]})), h: rows.length * s * gap};
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
  const [vine, corner, icon] = await Promise.all([lart("vine"), lart("corner"), lart(LICON[it.id])]);

  const m = Math.min(W, H) * .07;                           // поля лицевой

  /* ── лицевая ── */
  let ctx = lcanvas("lfront", W, H);
  const vh = H * .2, vw = vine ? vine.width * vh / vine.height : 0, lw = Math.max(2, H * .011);
  const lineY = m + vh * (72 / 148);                      // линия на уровне стебля веточки
  if (vine){
    for (const flip of [false, true]){
      ctx.save();
      if (flip){ ctx.translate(W, H); ctx.rotate(Math.PI); }
      vine.draw(ctx, m, m, vw, vh);
      ctx.fillRect(m + vw - 2, lineY - lw / 2, W - 2 * m - vw + 2, lw);
      ctx.restore();
    }
  }
  const gapY = H - 2 * lineY;                               // просвет между линиями
  const fsMax = gapY / 2.15;                                // крупно: на печати 50×30 мелкий текст не читается
  ctx.font = "400 " + fsMax + 'px "PT Serif", Georgia, serif';
  const isz = /^i-/.test(LICON[it.id] || "") ? 1.25 : 1;   // контурные значки визуально мельче — чуть крупнее
  const iconH = icon ? fsMax * 1.05 * isz : 0, iconW = icon ? icon.width * iconH / icon.height : 0;
  const gapX = icon ? fsMax * .25 : 0;
  const room = (W - 2 * m) * .97 - iconW - gapX;
  let lines = [name], fs = lfit(ctx, name, room, fsMax, 400);
  if (fs < fsMax * .62 && lsplit(name).length === 2){        // длинное — в две строки, но крупнее
    const two = lsplit(name), f2 = lfitAll(ctx, two, room, fsMax * .72, 400);
    if (f2 > fs * 1.15){ lines = two; fs = f2; }
  }
  const k = Math.min(1, fs * (lines.length > 1 ? 1.7 : 1) / fsMax);   // значок — по высоте блока текста
  const ih = iconH * k, iw = iconW * k, gx = gapX * k;
  ctx.font = "400 " + fs + 'px "PT Serif", Georgia, serif';
  const tw = Math.max(...lines.map(t => ctx.measureText(t).width)), x0 = (W - tw - gx - iw) / 2;
  const lh = fs * 1.08, yc = H / 2 + fs * .34 - (lines.length - 1) * lh / 2;   // середина строчных — по центру
  lines.forEach((t, i) => ctx.fillText(t, x0 + (tw - ctx.measureText(t).width) / 2, yc + i * lh));
  if (icon) icon.draw(ctx, x0 + tw + gx, H / 2 - ih / 2, iw, ih);

  /* ── оборотная ──
     Как на шаблоне бара: сверху название со значком, по углам узоры, слева — состав столбиком, даты и кто сделал,
     справа — QR. Текст — самым крупным шрифтом, какой влезает в своё поле (длинные строки переносятся, а не мельчают). */
  ctx = lcanvas("lback", W, H);
  const mb = m * .5, cs = H * .15;
  if (corner){
    for (const flip of [false, true]){
      ctx.save();
      if (flip){ ctx.translate(W, H); ctx.rotate(Math.PI); }
      corner.draw(ctx, W - mb - cs, mb, cs, cs);
      ctx.restore();
    }
  }
  /* заголовок */
  const th = H * .13;
  ctx.font = "400 " + th + 'px "PT Serif", Georgia, serif';
  const ti = icon ? th * 1.15 * isz : 0, tiw = icon ? icon.width * ti / icon.height : 0, tg = icon ? th * .25 : 0;
  const tfs = lfit(ctx, name, W - 2 * (mb + cs) - tiw - tg, th, 400);
  const tk = tfs / th, ttw = ctx.measureText(name).width, tx = (W - ttw - tg * tk - tiw * tk) / 2;
  const tBase = mb + tfs * .82;
  ctx.fillText(name, tx, tBase);
  if (icon){                                                // значок — между верхним полем и началом текста
    const lo = tBase + tfs * .3 - H * .01, ih2 = Math.min(ti * tk, lo - mb), iw2 = tiw * tk * ih2 / (ti * tk);
    const iy = Math.min(lo - ih2, Math.max(mb, tBase - tfs * .36 - ih2 / 2));
    icon.draw(ctx, tx + ttw + tg * tk + (tiw * tk - iw2) / 2, iy, iw2, ih2);
  }

  /* QR — поменьше, клетки ровно по точкам термопринтера: 203 dpi = 8 точек/мм, клетка = 3 точки = 6 px холста */
  const bodyTop = tBase + tfs * .32, bodyBottom = H - mb;
  let qx = W - mb, qsz = 0, qy = 0;
  if (window.qrcode){
    const q = qrcode(0, "M"); q.addData(lurl(it.id)); q.make();
    const n = q.getModuleCount(), cell = Math.max(2, Math.round(LPX * 3 / 8));
    qsz = n * cell; qx = W - mb - H * .02 - qsz; qy = Math.round(bodyTop + (bodyBottom - bodyTop - qsz) / 2);
    qx = Math.round(qx);
    ctx.beginPath();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.rect(qx + c * cell, qy + r * cell, cell, cell);
    ctx.fill();
  }

  /* строки: состав столбиком, дата, годен до, кто сделал.
     Дата — всегда сегодняшняя, сделал — тот, кто вошёл: пересчитывается при каждом сохранении. */
  const d = new Date(), who = me ? me.name : "—";
  const days = parseInt(g.srok, 10) || 0, till = new Date(d.getTime() + days * 864e5);
  const comp = (it.c || []).map(lshort);
  const rows = comp.map(t => ["pin", t, 400])
    .concat([["clock", "Изготовлено\u00a0" + ldmy(d), 400], ["clock", "Годен\u00a0до\u00a0" + ldmy(till), 700], ["who", who, 400]]);
  $("linfo").innerHTML = "Дата производства — сегодня, <b>" + ldmy(d) + "</b>; годен до <b>" + ldmy(till) + "</b> (" + esc(g.srok) +
    "); сделал — <b>" + esc(who) + "</b>. При сохранении дата и фамилия подставляются заново.";

  /* поле текста: от уголка слева до QR справа, от заголовка до низа */
  const left = mb + cs * 1.12, colW = qx - H * .04 - left, top = bodyTop, avail = bodyBottom - bodyTop;   // правее уголка
  const lay = lwrap(ctx, rows, colW, avail, H * .12, rows.length > 8 ? 1.07 : 1.17);
  const y0 = top + Math.max(0, (avail - lay.h) / 2);
  lay.lines.forEach(L => {
    ctx.font = L.w + " " + lay.s + 'px "PT Serif", Georgia, serif';
    if (L.glyph) lglyph(ctx, L.glyph, left, y0 + L.y + lay.s * .12, lay.s * .82);
    ctx.fillText(L.t, left + lay.ind, y0 + L.y + lay.s * .86);
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
