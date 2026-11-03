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
const V = venueCore({ seed: SEED, store, bar: () => BAR, dataImg: true, upload: (type, b64) => "data:image/" + type + ";base64," + b64 });

/* тот же ответ, что от сервера: тело при успехе, {error} — при ошибке */
window.VENUE_LOCAL = async (path, body) => {
  if (path === "/api/admin/login" || path === "/api/admin/logout") return { ok: true };       // онлайн-пример — без пароля: правки только в этом браузере
  const r = V.handle(body ? "POST" : "GET", path, body, true);
  return r.code === 200 ? r.body : { error: (r.body && r.body.error) || "Не получилось." };
};
window.VENUE_RESET = () => { Object.keys(localStorage).filter(k => k.startsWith(K)).forEach(k => localStorage.removeItem(k)); };
