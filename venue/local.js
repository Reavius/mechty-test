/* Онлайн-пример (Netlify, без сервера): та же логика, что у сервера (core.js), но заявки и правки хранятся
   в этом браузере (localStorage) — у каждого свои. Подключается только в сборке venue/build-static.mjs. */
import { venueCore, Fail } from "./core.js";
import { SEED } from "./seed.js";
import { BAR } from "./bar-data.js";

const K = "mechty-venue-", mem = {};
const store = {
  get(k, def){ try { const v = localStorage.getItem(K + k); return v ? JSON.parse(v) : (mem[k] || def); } catch (e) { return mem[k] || def; } },
  set(k, v){
    mem[k] = v;
    try { localStorage.setItem(K + k, JSON.stringify(v)); }
    catch (e) { if (e && /quota/i.test(e.name + e.message)) throw new Fail("В браузере кончилось место для фото — в онлайн-примере они хранятся здесь. Уберите пару фото."); }
  }
};
/* пример написан 4 ноября 2026; чтобы афиша онлайн-примера не устаревала, даты событий и новостей сдвигаются на целые
   недели к сегодняшней (джаз остаётся по четвергам); Новый год — всегда 31 декабря; фотоотчёты — настоящие, не сдвигаются */
const SEED_DAY = Date.parse("2026-11-04"), WEEK = 7 * 864e5;
function fresh(seed){
  const s = JSON.parse(JSON.stringify(seed)), t = Date.parse(new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10));
  const k = Math.max(0, Math.floor((t - SEED_DAY) / WEEK));
  if (!k) return s;
  const mv = d => {
    if (!d) return d;
    if (/-12-31$/.test(d)){ const y = new Date(t).getUTCFullYear(); return (Date.parse(y + "-12-31") < t ? y + 1 : y) + "-12-31"; }
    return new Date(Date.parse(d) + k * WEEK).toISOString().slice(0, 10);
  };
  for (const e of s.events || []) e.date = mv(e.date);
  for (const n of s.news || []) n.date = mv(n.date);
  for (const p of s.promos || []) p.until = mv(p.until);
  return s;
}
const V = venueCore({ seed: fresh(SEED), store, bar: () => BAR, dataImg: true, upload: (type, b64) => "data:image/" + type + ";base64," + b64 });

/* тот же ответ, что от сервера: тело при успехе, {error} — при ошибке */
window.VENUE_LOCAL = async (path, body) => {
  if (path === "/api/admin/login" || path === "/api/admin/logout") return { ok: true };       // онлайн-пример — без пароля: правки только в этом браузере
  const r = V.handle(body ? "POST" : "GET", path, body, true);
  return r.code === 200 ? r.body : { error: (r.body && r.body.error) || "Не получилось." };
};
window.VENUE_RESET = () => { Object.keys(localStorage).filter(k => k.startsWith(K)).forEach(k => localStorage.removeItem(k)); };
