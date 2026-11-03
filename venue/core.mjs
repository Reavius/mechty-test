/* Сайт заведения — логика без привязки к месту хранения: одна и та же для сервера (venue/server.mjs, данные в файлах)
   и для онлайн-примера на Netlify (venue/local.js, данные в браузере). Хранилище, загрузка фото и карта бара —
   снаружи: store.get/set(имя), upload(dataURL) → адрес, bar() → карта бара из барного гида. */
export class Fail extends Error {}

const hex = (rnd, n) => Array.from(rnd(n), b => b.toString(16).padStart(2, "0")).join("");
const webRnd = n => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const COLS = {
  events: ["title", "date", "time", "zone", "price", "text", "img", "hidden"],
  promos: ["title", "until", "text", "img", "hidden"],
  news: ["title", "date", "text", "img", "hidden"],
  albums: ["title", "date", "photos", "hidden"],
  zones: ["name", "cap", "hours", "text", "feats", "color", "img", "hidden"],
  packages: ["title", "price", "text", "hidden"],
  kitchen: ["sec", "name", "desc", "out", "price", "hidden"],
  vacancies: ["title", "pay", "text", "hidden"]
};
const INFO = ["name", "kicker", "tagline", "address", "city", "phone", "mapq", "tg", "ig", "guide", "dress", "parking"];
const BOX_ST = { book: ["new", "ok", "no"], banquet: ["new", "call", "ok", "no"], cert: ["paid", "used"], job: ["new", "call", "no"], sub: ["new"] };
const BOXES = Object.keys(BOX_ST);

export function venueCore({ seed, store, upload, bar = () => [], rnd = webRnd, dataImg = false }){
  let site = store.get("site", null);
  if (!site){ site = JSON.parse(JSON.stringify(seed)); store.set("site", site); }
  const inbox = store.get("inbox", null) || {};
  for (const k of BOXES) if (!Array.isArray(inbox[k])) inbox[k] = [];
  const saveSite = () => store.set("site", site), saveInbox = () => store.set("inbox", inbox);

  /* проверка полей: строки ограниченной длины; телефон — цифры; дата — ГГГГ-ММ-ДД */
  const str = (v, n = 300) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
  const need = (v, msg) => { if (!v) throw new Fail(msg); return v; };
  const phone = v => { const s = str(v, 40); if ((s.match(/\d/g) || []).length < 10) throw new Fail("Проверьте телефон — нужно 10–11 цифр."); return s; };
  const day = (v, msg) => { const s = str(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw new Fail(msg || "Выберите дату."); return s; };
  const consent = v => { if (v !== true) throw new Fail("Нужно согласие на обработку персональных данных."); };
  const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);   // день по местному времени (UTC+5) — как в барном гиде
  const uid = p => p + hex(rnd, 4);
  const IMG = /^\/(uploads|photos)\/[\w.-]+$/, DATA_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const okImg = v => IMG.test(v) || (dataImg && DATA_IMG.test(v) && v.length < 3e6);

  /* публичное: скрытое не уходит, события — по дате, прошедшие — отдельно */
  const vis = a => (a || []).filter(x => !x.hidden);
  function publicSite(){
    const t = today(), ev = vis(site.events).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return { ok: true, info: site.info, zones: vis(site.zones), events: ev.filter(e => e.date >= t), past: ev.filter(e => e.date < t).reverse(),
      promos: vis(site.promos).filter(p => !p.until || p.until >= t), news: vis(site.news).slice().sort((a, b) => b.date.localeCompare(a.date)),
      albums: vis(site.albums).slice().sort((a, b) => b.date.localeCompare(a.date)), packages: vis(site.packages), kitchen: vis(site.kitchen),
      vacancies: vis(site.vacancies), bar: bar(), today: t };
  }

  /* заявки гостей */
  const zoneName = id => ((site.zones || []).find(z => z.id === id) || {}).name || "";
  function addBook(b){
    const z = str(b.zone, 20), r = { id: uid("b"), at: new Date().toISOString(), st: "new",
      zone: need(zoneName(z) ? z : "", "Выберите зал."), date: day(b.date), time: str(b.time, 5), guests: Math.round(+b.guests || 0),
      name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), comment: str(b.comment, 500), event: str(b.event, 20) };
    if (r.date < today()) throw new Fail("Эта дата уже прошла.");
    if (!/^\d{2}:\d{2}$/.test(r.time)) throw new Fail("Выберите время.");
    if (!(r.guests >= 1 && r.guests <= 300)) throw new Fail("Сколько будет гостей?");
    consent(b.consent);
    inbox.book.unshift(r); saveInbox();
    return { ok: true, id: r.id };
  }
  function addBanquet(b){
    const r = { id: uid("q"), at: new Date().toISOString(), st: "new", date: day(b.date), guests: Math.round(+b.guests || 0), zone: str(b.zone, 20),
      format: str(b.format, 80), name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), comment: str(b.comment, 800) };
    if (r.date < today()) throw new Fail("Эта дата уже прошла.");
    if (!(r.guests >= 1 && r.guests <= 500)) throw new Fail("Сколько будет гостей?");
    consent(b.consent);
    inbox.banquet.unshift(r); saveInbox();
    return { ok: true, id: r.id };
  }
  /* сертификат: в примере оплата — заглушка «оплачено»; в рабочей версии здесь — платёжная страница банка (ЮKassa, СБП) */
  function addCert(b){
    const sum = Math.round(+b.amount || 0);
    if (!(sum >= 500 && sum <= 100000)) throw new Fail("Сумма — от 500 до 100 000 ₽.");
    const code = "M-" + hex(rnd, 3).toUpperCase() + "-" + hex(rnd, 2).toUpperCase();
    const t = today(), till = new Date(Date.parse(t) + 183 * 864e5).toISOString().slice(0, 10);
    const r = { id: uid("c"), code, at: new Date().toISOString(), st: "paid", sum, from: str(b.from, 60), to: str(b.to, 60), wish: str(b.wish, 200),
      name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), till };
    consent(b.consent);
    inbox.cert.unshift(r); saveInbox();
    return { ok: true, code };
  }
  function certGet(code){
    const c = inbox.cert.find(x => x.code === code);
    if (!c) throw new Fail("Сертификат не найден.");
    return { ok: true, cert: { code: c.code, sum: c.sum, from: c.from, to: c.to, wish: c.wish, till: c.till, used: c.st === "used" },
      info: { name: site.info.name, address: site.info.address, phone: site.info.phone } };
  }
  function addJob(b){
    const v = str(b.vacancy, 20), r = { id: uid("j"), at: new Date().toISOString(), st: "new", vacancy: ((site.vacancies || []).find(x => x.id === v) || {}).title || "",
      name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), about: str(b.about, 800) };
    need(r.vacancy, "Выберите вакансию.");
    consent(b.consent);
    inbox.job.unshift(r); saveInbox();
    return { ok: true };
  }
  function addSub(b){
    const e = str(b.email, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Fail("Проверьте почту.");
    consent(b.consent);
    if (!inbox.sub.some(s => s.email === e)){ inbox.sub.unshift({ id: uid("s"), at: new Date().toISOString(), st: "new", email: e }); saveInbox(); }
    return { ok: true };
  }

  /* админка: поля — по схеме, лишнее отбрасывается */
  function clean(col, it){
    const out = {};
    for (const k of COLS[col]){
      const v = it[k];
      if (k === "hidden") out[k] = !!v;
      else if (k === "photos") out[k] = (Array.isArray(v) ? v : []).map(x => String(x == null ? "" : x)).filter(okImg).slice(0, 60);
      else if (k === "price" && col === "kitchen") out[k] = Math.max(0, Math.round(+v || 0));
      else if (k === "date" || k === "until") out[k] = /^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : "";
      else if (k === "img") out[k] = okImg(String(v == null ? "" : v)) ? String(v) : "";
      else if (k === "color") out[k] = /^#[0-9a-f]{6}$/i.test(str(v, 7)) ? str(v, 7) : "#C9A24B";
      else out[k] = str(v, k === "text" ? 2000 : 200);
    }
    if ((col === "events" || col === "news" || col === "albums") && !out.date) throw new Fail("Укажите дату.");
    if (!(out.title || out.name)) throw new Fail("Укажите название.");
    return out;
  }
  function adminSave(b){
    const col = str(b.col, 20);
    if (col === "info"){
      const it = b.item || {}, out = {};
      for (const k of INFO) out[k] = str(it[k], k === "tagline" || k === "dress" ? 400 : 200);
      out.hours = (Array.isArray(it.hours) ? it.hours : []).slice(0, 10).map(h => ({ zone: str(h && h.zone, 40), text: str(h && h.text, 120) })).filter(h => h.zone || h.text);
      site.info = out; saveSite(); return { ok: true };
    }
    if (!COLS[col]) throw new Fail("Нет такого раздела.");
    const it = clean(col, b.item || {}), list = site[col] = site[col] || [], id = str(b.id, 40);
    const i = id ? list.findIndex(x => x.id === id) : -1;
    if (i >= 0) list[i] = Object.assign({ id }, it);
    else list.unshift(Object.assign({ id: uid(col[0]) }, it));
    saveSite();
    return { ok: true, id: i >= 0 ? id : list[0].id };
  }
  function adminDel(b){
    const col = str(b.col, 20), id = str(b.id, 40);
    if (!COLS[col]) throw new Fail("Нет такого раздела.");
    site[col] = (site[col] || []).filter(x => x.id !== id); saveSite();
    return { ok: true };
  }
  function adminSt(b){
    const box = str(b.box, 10), id = str(b.id, 40), st = str(b.st, 10);
    if (!BOX_ST[box] || !BOX_ST[box].includes(st)) throw new Fail("Нет такого статуса.");
    const r = inbox[box].find(x => x.id === id);
    if (!r) throw new Fail("Заявки уже нет.");
    r.st = st; r.stAt = new Date().toISOString(); saveInbox();
    return { ok: true };
  }
  function adminUpload(b){
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ""));
    if (!m) throw new Fail("Нужна картинка JPEG, PNG или WebP.");
    if (m[2].length * 0.75 > 4 * 1024 * 1024) throw new Fail("Картинка больше 4 МБ.");
    return { ok: true, url: upload(m[1], m[2]) };
  }

  const API = {
    "GET /api/site": publicSite,
    "POST /api/book": addBook, "POST /api/banquet": addBanquet, "POST /api/cert": addCert, "POST /api/job": addJob, "POST /api/subscribe": addSub
  };
  const ADMIN = {
    "GET /api/admin/all": () => ({ ok: true, site, inbox }),
    "POST /api/admin/save": adminSave, "POST /api/admin/del": adminDel, "POST /api/admin/status": adminSt, "POST /api/admin/upload": adminUpload
  };
  /* запрос → {code, body}; админские — только с isAdmin */
  function handle(method, path, body, isAdmin){
    const key = method + " " + path;
    try {
      const m = /^GET \/api\/cert\/(M-[0-9A-F]{6}-[0-9A-F]{4})$/.exec(key);
      if (m){ try { return { code: 200, body: certGet(m[1]) }; } catch (e) { return { code: 404, body: { error: e.message } }; } }
      if (ADMIN[key]) return isAdmin ? { code: 200, body: ADMIN[key](body || {}) } : { code: 401, body: { error: "Войдите в админку." } };
      if (API[key]) return { code: 200, body: API[key](body || {}) };
      return { code: 404, body: { error: "Нет такого запроса." } };
    } catch (e) {
      if (e instanceof Fail) return { code: 400, body: { error: e.message } };
      throw e;
    }
  }
  return { handle, name: () => site.info.name };
}
