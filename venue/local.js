/* Онлайн-пример (Netlify, без сервера): та же логика, что у сервера (core.js), но заявки и правки хранятся
   в этом браузере (localStorage) — у каждого свои. Подключается только в сборке venue/build-static.mjs. */
import { venueCore, Fail } from "./core.js";
import { SEED } from "./seed.js";
import { BAR } from "./bar-data.js";
import { PASS } from "./admin-pass.js";
import { checkPass } from "./pass.js";

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

/* вход в редактор — по паролю (отпечаток — admin-pass.js), помнится 30 дней на этом устройстве */
const ADM = K + "adm", DAYS30 = 30 * 864e5;
const isAdm = () => { try { return +localStorage.getItem(ADM) > Date.now(); } catch (e) { return false; } };
let tries = 0;

/* тот же ответ, что от сервера: тело при успехе, {error} — при ошибке */
window.VENUE_LOCAL = async (path, body) => {
  if (path === "/api/admin/login"){
    if (tries >= 5) await new Promise(r => setTimeout(r, 2000 * (tries - 4)));                 // много ошибок подряд — чуть ждём
    if (!(await checkPass(body && body.pw, PASS))){ tries++; return { error: "Неверный пароль." }; }
    tries = 0; try { localStorage.setItem(ADM, String(Date.now() + DAYS30)); } catch (e) {}
    return { ok: true };
  }
  if (path === "/api/admin/logout"){ try { localStorage.removeItem(ADM); } catch (e) {} return { ok: true }; }
  const r = V.handle(body ? "POST" : "GET", path, body, isAdm());
  return r.code === 200 ? r.body : { error: (r.body && r.body.error) || "Не получилось." };
};
window.VENUE_RESET = () => { Object.keys(localStorage).filter(k => k.startsWith(K)).forEach(k => localStorage.removeItem(k)); };
