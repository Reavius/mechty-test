/* QR-наклейки для столов: у каждого стола свой адрес с ключом. Печать — A4, по 2 в ряд. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const KEY = (location.pathname.match(/^\/qr\/([\w-]+)$/) || [])[1] || "";

function svg(text){
  const q = qrcode(0, "M");
  q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
  return '<svg viewBox="0 0 ' + (n + m * 2) + " " + (n + m * 2) + '" shape-rendering="crispEdges" role="img" aria-label="QR-код"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#0E1014"/></svg>';
}

(async () => {
  try {
    const r = await fetch("/api/bar/qr", { headers: { "x-bar-key": KEY }, cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Нет доступа");
    $("qBase").textContent = "Адрес в QR: " + d.base + (/^http:\/\/(\d+\.){3}\d+/.test(d.base) ? " — работает в Wi-Fi бара, пока запущен сервер" : "");
    $("qGrid").innerHTML = d.tables.map(t => '<div class="qcard"><p class="qm">Бар «Мечты»</p><h2>Стол ' + t.n + '</h2>' + svg(t.url) +
      '<p>Наведите камеру — меню, заказ и&nbsp;оплата с&nbsp;телефона</p><small>' + esc(t.url) + '</small></div>').join("");
  } catch (e) { $("qBase").textContent = e.message; }
})();
$("qPrint").addEventListener("click", () => window.print());
