/* Демо-оплата: вместо приложения банка. «Оплатить» — сервер получает то же, что прислал бы банк после оплаты по СБП. */
"use strict";
const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search), O = q.get("o") || "", S = q.get("s") || "";
const R = /^\/t\/\d+\/[\w-]+$/.test(q.get("r") || "") ? q.get("r") : "/";
const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₽";
const back = () => location.replace(R + "?o=" + encodeURIComponent(O) + "&s=" + encodeURIComponent(S));

async function call(url, body){
  const r = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(d.error || "Нет связи — попробуйте ещё раз");
  return d;
}

(async () => {
  try {
    const o = await call("/api/order/" + encodeURIComponent(O) + "?s=" + encodeURIComponent(S));
    if (o.status !== "new") return back();
    const n = o.lines.reduce((a, l) => a + l.q, 0);
    $("pSum").textContent = money(o.total);
    $("pTo").textContent = "Получатель: Бар «Мечты» · стол " + o.table + " · позиций: " + n;
    $("pGo").disabled = false;
  } catch (e) { $("pMsg").textContent = e.message; }
})();

$("pGo").addEventListener("click", async () => {
  $("pGo").disabled = true; $("pGo").textContent = "Оплачиваем…"; $("pMsg").textContent = "";
  try { await call("/api/demo/pay", { id: O, s: S }); back(); }
  catch (e) { $("pMsg").textContent = e.message; $("pGo").disabled = false; $("pGo").textContent = "Оплатить"; }
});
$("pNo").addEventListener("click", async () => {
  try { await call("/api/order/" + encodeURIComponent(O) + "/cancel?s=" + encodeURIComponent(S), {}); } catch (e) {}
  location.replace(R + "?c=" + encodeURIComponent(O));
});
