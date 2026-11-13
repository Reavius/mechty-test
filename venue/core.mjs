/* Сайт заведения — логика без привязки к месту хранения: одна и та же для сервера (venue/server.mjs, данные в файлах)
   и для онлайн-примера (venue/local.js, данные в браузере). Хранилище, загрузка фото и карта бара —
   снаружи: store.get/set(имя), upload(dataURL) → адрес, bar() → карта бара из барного гида. */
export class Fail extends Error {}

const hex = (rnd, n) => Array.from(rnd(n), b => b.toString(16).padStart(2, "0")).join("");
const webRnd = n => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const COLS = {
  events: ["title", "date", "time", "zone", "price", "text", "img", "vid", "hidden"],
  promos: ["title", "until", "text", "note", "img", "hidden"],
  news: ["title", "date", "text", "img", "vid", "hidden"],
  albums: ["title", "date", "by", "url", "img", "photos", "hidden"],
  zones: ["name", "text", "feats", "days", "from", "to", "deposit", "nobook", "color", "img", "hidden"],
  packages: ["title", "text", "hidden"],
  kitchen: ["sec", "name", "desc", "out", "price", "hidden"]
};
const INFO = ["name", "kicker", "tagline", "city", "address", "floor", "phone", "mapq", "rating", "tg", "ig", "guide"];
const BOX_ST = { book: ["new", "ok", "no"], banquet: ["new", "call", "ok", "no"], job: ["new", "call", "no"] };
const BOXES = Object.keys(BOX_ST);
export const CONTACT = { call: "звонок", sms: "СМС", tg: "Telegram", wa: "WhatsApp" };
/* дни брони: «чт, пт, сб, вс» → [4, 5, 6, 0] */
const WDAY = { "вс": 0, "пн": 1, "вт": 2, "ср": 3, "чт": 4, "пт": 5, "сб": 6 };
export const daysOf = s => [...new Set(String(s || "").toLowerCase().split(/[^а-яё]+/).map(w => WDAY[w.slice(0, 2)]).filter(n => n != null))];

export function venueCore({ seed, store, upload, bar = () => [], rnd = webRnd, dataImg = false }){
  let site = store.get("site", null);
  /* нет сохранённого или пример сменился (ver) — начинаем с примера; заявки не трогаем */
  if (!site || (seed.ver || 0) > (site.ver || 0)){ site = JSON.parse(JSON.stringify(seed)); store.set("site", site); }
  const inbox = store.get("inbox", null) || {};
  for (const k of BOXES) if (!Array.isArray(inbox[k])) inbox[k] = [];
  const saveSite = () => store.set("site", site), saveInbox = () => store.set("inbox", inbox);

  /* проверка полей: строки ограниченной длины; телефон — цифры; дата — ГГГГ-ММ-ДД */
  const str = (v, n = 300) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
  const need = (v, msg) => { if (!v) throw new Fail(msg); return v; };
  const phone = v => { const s = str(v, 40); if ((s.match(/\d/g) || []).length < 10) throw new Fail("Проверьте телефон — нужно 10–11 цифр."); return s; };
  const day = (v, msg) => { const s = str(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) throw new Fail(msg || "Выберите дату."); return s; };
  const consent = v => { if (v !== true) throw new Fail("Нужно согласие на обработку персональных данных."); };
  const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);   // день по местному времени (Уфа, UTC+5)
  const evDay = () => new Date(Date.now() + 5 * 3600e3 - 6 * 3600e3).toISOString().slice(0, 10);   // день афиши: событие держится до 6:00 следующего утра
  /* фотоотчёты на сайте — за последние 3 месяца */
  const ago3m = t => { const d = new Date(t + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 3); return d.toISOString().slice(0, 10); };
  const uid = p => p + hex(rnd, 4);
  const IMG = /^\/?(uploads|photos|media)\/[\w.-]+$/, DATA_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  const okImg = v => IMG.test(v) || (dataImg && DATA_IMG.test(v) && v.length < 3e6);
  const VID = /^\/?(uploads|media)\/[\w.-]+\.mp4$/;
  const hm = s => { const m = /^(\d{2}):(\d{2})$/.exec(s || ""); return m ? +m[1] * 60 + +m[2] : -1; };

  /* публичное: скрытое не уходит, события — по дате, прошедшие — отдельно */
  const vis = a => (a || []).filter(x => !x.hidden);
  function publicSite(){
    const t = today(), te = evDay(), ev = vis(site.events).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return { ok: true, info: site.info, zones: vis(site.zones), events: ev.filter(e => e.date >= te), past: ev.filter(e => e.date < te).reverse(),
      promos: vis(site.promos).filter(p => !p.until || p.until >= t), news: vis(site.news).slice().sort((a, b) => b.date.localeCompare(a.date)),
      albums: vis(site.albums).filter(a => a.date >= ago3m(t)).sort((a, b) => b.date.localeCompare(a.date)), packages: vis(site.packages), kitchen: vis(site.kitchen),
      bar: bar(), today: t };
  }

  /* заявки гостей */
  const zoneOf = id => (site.zones || []).find(z => z.id === id && !z.hidden);
  function addBook(b){
    const z = zoneOf(str(b.zone, 20));
    if (!z) throw new Fail("Выберите зону.");
    if (z.nobook) throw new Fail("«" + z.name + "» не бронируется — выберите другую зону.");
    const r = { id: uid("b"), at: new Date().toISOString(), st: "new", zone: z.id, date: day(b.date), time: str(b.time, 5), guests: Math.round(+b.guests || 0),
      name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), comment: str(b.comment, 500), event: str(b.event, 20) };
    if (r.date < today()) throw new Fail("Эта дата уже прошла.");
    const days = daysOf(z.days);
    if (days.length && !days.includes(new Date(r.date + "T12:00:00Z").getUTCDay())) throw new Fail("«" + z.name + "» бронируется: " + z.days + ". Выберите другой день.");
    const t = hm(r.time);
    if (t < 0) throw new Fail("Выберите время.");
    if ((z.from && t < hm(z.from)) || (z.to && t > hm(z.to))) throw new Fail("Бронь в «" + z.name + "» — с " + z.from + " до " + z.to + ".");
    const now = new Date(Date.now() + 5 * 3600e3), nowM = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (r.date === today() && t < nowM + 30) throw new Fail("На сегодня бронь — не раньше чем через 30 минут. Выберите время позже.");
    if (!(r.guests >= 1 && r.guests <= 300)) throw new Fail("Сколько будет гостей?");
    consent(b.consent);
    inbox.book.unshift(r); saveInbox();
    return { ok: true, id: r.id, deposit: !!z.deposit };
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
  /* как гостю удобнее связаться — выбирает после отправки заявки */
  function setContact(b){
    const box = str(b.box, 10), how = str(b.how, 5);
    if (!["book", "banquet"].includes(box) || !CONTACT[how]) throw new Fail("Выберите, как с вами связаться.");
    const r = inbox[box].find(x => x.id === str(b.id, 40));
    if (!r) throw new Fail("Заявка не найдена — отправьте её ещё раз.");
    r.contact = how; saveInbox();
    return { ok: true };
  }
  function addJob(b){
    const r = { id: uid("j"), at: new Date().toISOString(), st: "new",
      name: need(str(b.name, 80), "Как к вам обращаться?"), phone: phone(b.phone), about: need(str(b.about, 1500), "Расскажите немного о себе.") };
    consent(b.consent);
    inbox.job.unshift(r); saveInbox();
    return { ok: true };
  }

  /* админка: поля — по схеме, лишнее отбрасывается */
  function clean(col, it){
    const out = {};
    for (const k of COLS[col]){
      const v = it[k];
      if (k === "hidden" || k === "deposit" || k === "nobook") out[k] = !!v;
      else if (k === "photos") out[k] = (Array.isArray(v) ? v : []).map(x => String(x == null ? "" : x)).filter(okImg).slice(0, 60);
      else if (k === "price" && col === "kitchen") out[k] = Math.max(0, Math.round(+v || 0));
      else if (k === "date" || k === "until") out[k] = /^\d{4}-\d{2}-\d{2}$/.test(str(v, 10)) ? str(v, 10) : "";
      else if (k === "from" || k === "to") out[k] = hm(str(v, 5)) >= 0 ? str(v, 5) : "";
      else if (k === "url") out[k] = /^https:\/\/[^\s"'<>]+$/.test(str(v, 400)) ? str(v, 400) : "";
      else if (k === "img") out[k] = okImg(String(v == null ? "" : v)) ? String(v) : "";
      else if (k === "vid") out[k] = VID.test(str(v, 200)) ? str(v, 200) : "";        // видео — файл на сайте: media/… или uploads/…, .mp4
      else if (k === "color") out[k] = /^#[0-9a-f]{6}$/i.test(str(v, 7)) ? str(v, 7) : "#C9A24B";
      else out[k] = str(v, k === "text" ? 2000 : 200);
    }
    if ((col === "events" || col === "news" || col === "albums") && !out.date) throw new Fail("Укажите дату.");
    if (col === "zones" && !out.nobook && !daysOf(out.days).length) throw new Fail("Укажите дни брони, например: чт, пт, сб, вс — или отметьте «не бронируется».");
    if (!(out.title || out.name)) throw new Fail("Укажите название.");
    return out;
  }
  function adminSave(b){
    const col = str(b.col, 20);
    if (col === "info"){
      const it = b.item || {}, out = Object.assign({}, site.info);
      for (const k of INFO) out[k] = str(it[k], k === "tagline" ? 400 : 200);
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
    "POST /api/book": addBook, "POST /api/banquet": addBanquet, "POST /api/contact": setContact, "POST /api/job": addJob
  };
  const ADMIN = {
    "GET /api/admin/all": () => ({ ok: true, site, inbox }),
    "POST /api/admin/save": adminSave, "POST /api/admin/del": adminDel, "POST /api/admin/status": adminSt, "POST /api/admin/upload": adminUpload
  };
  /* запрос → {code, body}; админские — только с isAdmin */
  function handle(method, path, body, isAdmin){
    const key = method + " " + path;
    try {
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
