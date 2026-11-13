/* Админка сайта «Мечты»: заявки гостей и правка всех разделов — с телефона, без программиста. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const dTx = s => { if (!s) return ""; const d = new Date(s.length > 10 ? s : s + "T12:00:00Z"); return d.getDate() + " " + MON[d.getMonth()]; };
const tTx = s => { const d = new Date(s); return dTx(s) + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
let D = null, tab = "inbox", box = "book", edit = null, onlyNew = false;

async function api(p, body){
  if (window.VENUE_LOCAL) return window.VENUE_LOCAL(p, body);                 // онлайн-пример: всё в этом браузере (venue/local.js)
  try {
    const r = await fetch(p, body ? {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)} : {});
    const d = await r.json().catch(() => ({}));
    if (r.status === 401){ D = null; draw(); return {error: "Войдите заново."}; }
    return r.ok ? d : {error: d.error || "Не получилось."};
  } catch (e) { return {error: "Нет связи с сервером — он запущен?"}; }
}
async function reload(){ const d = await api("/api/admin/all"); if (d.ok){ D = d; draw(); } else if (!d.error || /Войдите/.test(d.error)){ D = null; draw(); } }

/* разделы сайта: поля форм (подпись, тип) */
const SCH = {
  events: {t: "Афиша", one: "событие", f: [["title", "Название"], ["date", "Дата", "date"], ["time", "Начало", "time"], ["zone", "Зал", "zone"], ["price", "Вход / депозит"], ["text", "Описание", "area"], ["img", "Плакат (фото)", "img"], ["vid", "Видео для сторис — файл .mp4 в папке media (необязательно)"], ["hidden", "Скрыть с сайта", "check"]],
    sort: (a, b) => (b.date || "").localeCompare(a.date || ""), sub: x => dTx(x.date) + ", " + (x.time || "") + ", " + zoneName(x.zone), hint: "Прошедшие события сами уходят в «Прошли недавно». Плакат — фото или картинка; без него — цвет зала с датой."},
  promos: {t: "Акции", one: "акцию", f: [["title", "Название"], ["text", "Условия (каждая строка — с новой строки)", "area"], ["note", "Сноска мелким шрифтом"], ["until", "До (необязательно)", "date"], ["img", "Картинка", "img"], ["hidden", "Скрыть с сайта", "check"]], sub: x => x.until ? "до " + dTx(x.until) : "без срока",
    hint: "Реклама алкоголя в интернете запрещена законом о рекламе, кальянов — законом о табаке. Акции бара — без подробностей (условия — у официанта), решение — за заведением."},
  news: {t: "Новости", one: "новость", f: [["title", "Заголовок"], ["date", "Дата", "date"], ["text", "Текст", "area"], ["img", "Картинка (у видео — его кадр)", "img"], ["vid", "Видео — файл .mp4 в папке media (необязательно)"], ["hidden", "Скрыть с сайта", "check"]], sort: (a, b) => (b.date || "").localeCompare(a.date || ""), sub: x => dTx(x.date)},
  albums: {t: "Фото", one: "фотоотчёт", f: [["title", "Название (день недели или вечеринка)"], ["date", "Дата", "date"], ["by", "Фотограф"], ["url", "Ссылка на альбом фотографа"], ["img", "Обложка", "img"], ["photos", "Свои фото (если альбома по ссылке нет)", "photos"], ["hidden", "Скрыть с сайта", "check"]],
    sort: (a, b) => (b.date || "").localeCompare(a.date || ""), sub: x => dTx(x.date) + (x.by ? ", фото: " + x.by : "") + (x.url ? ", по ссылке" : ", " + (x.photos || []).length + " фото"),
    hint: "Альбом фотографа — вставьте ссылку и загрузите обложку (одно фото из альбома). Свои фото сайт уменьшит до 1600 px."},
  zones: {t: "Залы", one: "зал", f: [["name", "Название"], ["text", "Описание", "area"], ["feats", "Особенности (через запятую)"], ["days", "Дни брони (например: чт, пт, сб, вс)"], ["from", "Бронь с", "time"], ["to", "Бронь до", "time"],
      ["deposit", "Зона с депозитом — гостю пишется при выборе", "check"], ["nobook", "Не бронируется (например, танцпол)", "check"], ["color", "Цвет", "color"], ["img", "Фото зала", "img"], ["hidden", "Скрыть с сайта", "check"]],
    sub: x => x.nobook ? "без брони" : (x.days || "") + (x.from ? ", " + x.from + "–" + x.to : "") + (x.deposit ? ", депозит" : "")},
  packages: {t: "Банкеты", one: "формат", f: [["title", "Формат"], ["text", "Что входит", "area"], ["hidden", "Скрыть с сайта", "check"]], sub: () => ""},
  kitchen: {t: "Меню кухни", one: "блюдо", f: [["sec", "Раздел меню"], ["name", "Блюдо"], ["desc", "Описание"], ["out", "Выход"], ["price", "Цена, ₽", "num"], ["hidden", "Скрыть с сайта (стоп-лист)", "check"]], group: "sec", sub: x => (x.price ? x.price + " ₽" : "") + (x.out ? ", " + x.out : ""),
    hint: "Карту бара править не нужно — она берётся из барного гида. Раздел меню — впишите новое название, и он появится."}
};
const HOWTX = {call: "позвонить", sms: "СМС", tg: "Telegram", wa: "WhatsApp"};
const how = r => r.contact ? " · связаться: " + (HOWTX[r.contact] || r.contact) : "";
const BOX = {
  book: {t: "Брони", st: {new: "новая", ok: "подтверждена", no: "отменена"}, line: r => zoneName(r.zone) + " · " + dTx(r.date) + " " + r.time + " · " + r.guests + " гост." + (r.event ? " · " + evName(r.event) : "") + how(r)},
  banquet: {t: "Банкеты", st: {new: "новая", call: "созвонились", ok: "договорились", no: "отказ"}, line: r => (r.format || "") + " · " + dTx(r.date) + " · " + r.guests + " гост." + (r.zone ? " · " + zoneName(r.zone) : "") + how(r)},
  job: {t: "Отклики", st: {new: "новый", call: "позвонили", no: "не подошёл"}, line: () => "хочет работать у нас"}
};
const zoneName = id => ((D && D.site.zones || []).find(z => z.id === id) || {}).name || "";
const evName = id => ((D && D.site.events || []).find(e => e.id === id) || {}).title || "";
const newOf = k => (D.inbox[k] || []).filter(r => r.st === "new").length;

function draw(){
  const app = $("app");
  if (!D){
    app.innerHTML = '<form class="card login" id="lf"><h1 style="font-family:var(--display);font-size:36px;margin:0 0 6px">Вход</h1><p class="hint">Пароль редактора — у управляющего. Пять слов через пробел; регистр не важен.</p>' +
      '<input class="in" type="password" name="pw" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="Пароль редактора" aria-label="Пароль редактора"><button class="btn" style="margin-top:12px;width:100%">Войти</button><p class="fmsg bad" id="lm"></p></form>';
    $("lf").onsubmit = async e => { e.preventDefault(); const b = e.target.querySelector("button"); b.disabled = true; $("lm").textContent = "";
      const d = await api("/api/admin/login", {pw: e.target.pw.value}); b.disabled = false; if (d.error){ $("lm").textContent = d.error; e.target.pw.select(); return; } reload(); };
    return;
  }
  const n = Object.keys(BOX).reduce((a, k) => a + newOf(k), 0);
  const tabs = [["inbox", "Заявки", n]].concat(Object.keys(SCH).map(k => [k, SCH[k].t, 0])).concat([["info", "Контакты", 0]]);
  app.innerHTML = '<div class="adm"><div class="admh"><h1>«' + esc(D.site.info.name) + '» · админка</h1><span><a class="btn small ghost" href="./" target="_blank">Открыть сайт</a> ' + (window.VENUE_RESET ? '<button type="button" class="link" id="reset">Сбросить пример</button> ' : "") + '<button type="button" class="link" id="out">Выйти</button></span></div>' +
    (window.VENUE_LOCAL ? '<p class="hint">Онлайн-пример: заявки и правки хранятся только в этом браузере — у каждого свои. В рабочей версии они общие и приходят администратору.</p>' : "") +
    '<div class="atabs">' + tabs.map(([k, t, c]) => '<button type="button" class="chip" data-tab="' + k + '" aria-pressed="' + (k === tab) + '">' + esc(t) + (c ? '<i>' + c + '</i>' : "") + '</button>').join("") + '</div><div id="pane"></div></div>';
  $("out").onclick = async () => { await api("/api/admin/logout", {}); D = null; draw(); };
  if ($("reset")) $("reset").onclick = () => { if (confirm("Вернуть пример к началу? Ваши заявки и правки в этом браузере удалятся.")){ window.VENUE_RESET(); location.reload(); } };
  app.querySelector(".atabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (b){ tab = b.dataset.tab; edit = null; draw(); } };
  if (tab === "inbox") drawInbox(); else if (tab === "info") drawInfo(); else drawCol(tab);
}

/* заявки */
function drawInbox(){
  const list = (D.inbox[box] || []).filter(r => !onlyNew || r.st === "new"), B = BOX[box];
  $("pane").innerHTML = '<div class="chips" style="margin-bottom:12px">' + Object.keys(BOX).map(k => '<button type="button" class="chip" data-box="' + k + '" aria-pressed="' + (k === box) + '">' + BOX[k].t +
    ' (' + (D.inbox[k] || []).length + ')</button>').join("") + '</div><label class="agree" style="margin:0 0 12px"><input type="checkbox" id="onlyNew"' + (onlyNew ? " checked" : "") + '> <span>Только новые</span></label>' +
    (list.length ? list.map(r => '<article class="card ali"><div class="at"><b>' + esc(r.name || r.email || "") + '</b><span class="st ' + esc(r.st) + '">' + esc(B.st[r.st] || r.st) + '</span></div>' +
      '<div class="am">' + esc(B.line(r)) + '</div>' + (r.phone ? '<div><a href="tel:' + esc(r.phone.replace(/[^\d+]/g, "")) + '">' + esc(r.phone) + '</a></div>' : "") +
      (r.comment || r.about ? '<div class="am">«' + esc(r.comment || r.about) + '»</div>' : "") +
      '<div class="am">пришла ' + esc(tTx(r.at)) + (r.stAt ? " · изменено " + esc(tTx(r.stAt)) : "") + '</div>' +
      (Object.keys(B.st).length > 1 ? '<div class="ab">' + Object.keys(B.st).filter(s => s !== r.st).map(s => '<button type="button" class="link" data-st="' + s + '" data-id="' + esc(r.id) + '">' + esc(B.st[s]) + '</button>').join("") +
        '</div>' : "") + '</article>').join("")
      : '<p class="empty">Заявок нет.</p>');
  $("pane").onclick = async e => {
    const b = e.target.closest("[data-box]"); if (b){ box = b.dataset.box; return drawInbox(); }
    const s = e.target.closest("[data-st]");
    if (s){ const d = await api("/api/admin/status", {box, id: s.dataset.id, st: s.dataset.st}); if (!d.error) reload(); else alert(d.error); }
  };
  $("onlyNew").onchange = e => { onlyNew = e.target.checked; drawInbox(); };
}

/* разделы: список → форма */
function drawCol(col){
  const sc = SCH[col], list = (D.site[col] || []).slice();
  if (sc.sort) list.sort(sc.sort);
  if (edit){ return drawForm(col); }
  let html = (sc.hint ? '<p class="hint">' + esc(sc.hint) + '</p>' : "") + '<button type="button" class="btn small" data-new style="margin-bottom:14px">+ Добавить ' + esc(sc.one) + '</button>';
  let last = null;
  list.forEach(x => {
    if (sc.group && x[sc.group] !== last){ last = x[sc.group]; html += '<h3 class="msec" style="font-size:22px">' + esc(last || "—") + '</h3>'; }
    html += '<article class="card ali' + (x.hidden ? " hid" : "") + '"><div class="at"><b>' + esc(x.title || x.name) + '</b>' + (x.hidden ? '<span class="st">скрыто</span>' : "") + '</div><div class="am">' + esc(sc.sub ? sc.sub(x) : "") +
      '</div><div class="ab"><button type="button" class="link" data-ed="' + esc(x.id) + '">Изменить</button></div></article>';
  });
  $("pane").innerHTML = html + (list.length ? "" : '<p class="empty">Пока пусто.</p>');
  $("pane").onclick = e => {
    if (e.target.closest("[data-new]")){ edit = {id: "", item: {}}; return drawForm(col); }
    const b = e.target.closest("[data-ed]"); if (b){ edit = {id: b.dataset.ed, item: JSON.parse(JSON.stringify(list.find(x => x.id === b.dataset.ed)))}; drawForm(col); }
  };
}
function field([k, lab, type], v){
  const id = "f_" + k;
  if (type === "check") return '<label class="agree"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + '> <span>' + esc(lab) + '</span></label>';
  if (type === "area") return '<label class="fl" for="' + id + '">' + esc(lab) + '</label><textarea class="in" id="' + id + '">' + esc(v || "") + '</textarea>';
  if (type === "zone") return '<label class="fl" for="' + id + '">' + esc(lab) + '</label><select class="in" id="' + id + '">' + D.site.zones.map(z => '<option value="' + esc(z.id) + '"' + (z.id === v ? " selected" : "") + '>' + esc(z.name) + '</option>').join("") + '</select>';
  if (type === "img") return '<span class="fl">' + esc(lab) + '</span><div class="thumbs" id="' + id + '">' + (v ? '<span><img src="' + esc(v) + '" alt=""><button type="button" data-rm="img" aria-label="Убрать">×</button></span>' : "") + '</div>' +
    '<label class="btn small ghost" style="margin-top:8px">Загрузить<input type="file" accept="image/*" data-up="' + k + '" hidden></label>';
  if (type === "photos") return '<span class="fl">' + esc(lab) + '</span><div class="thumbs" id="' + id + '">' + (v || []).map((p, i) => '<span><img src="' + esc(p) + '" alt=""><button type="button" data-rmp="' + i + '" aria-label="Убрать">×</button></span>').join("") + '</div>' +
    '<label class="btn small ghost" style="margin-top:8px">Добавить фото<input type="file" accept="image/*" multiple data-ups="' + k + '" hidden></label>';
  const t = type === "date" ? "date" : type === "time" ? "time" : type === "num" ? "number" : type === "color" ? "color" : "text";
  return '<label class="fl" for="' + id + '">' + esc(lab) + '</label><input class="in" type="' + t + '" id="' + id + '" value="' + esc(v == null ? "" : v) + '"' + (k === "sec" ? ' list="secs"' : "") + '>';
}
function drawForm(col){
  const sc = SCH[col], it = edit.item;
  const secs = col === "kitchen" ? [...new Set(D.site.kitchen.map(x => x.sec).filter(Boolean))] : [];
  $("pane").innerHTML = '<form class="card af" id="ef">' + sc.f.map(f => field(f, it[f[0]])).join("") + (secs.length ? '<datalist id="secs">' + secs.map(s => '<option value="' + esc(s) + '">').join("") + '</datalist>' : "") +
    '<div class="abtns"><button class="btn" type="submit">Сохранить</button><button type="button" class="link" data-cx>Отмена</button>' + (edit.id ? '<button type="button" class="link del" data-del>Удалить</button>' : "") + '</div><p class="fmsg" id="em" role="status"></p></form>';
  const collect = () => { sc.f.forEach(([k, , type]) => { const el = $("f_" + k); if (!el) return;
    if (type === "check") it[k] = el.checked; else if (type !== "img" && type !== "photos") it[k] = type === "num" ? +el.value || 0 : el.value; }); };
  const ef = $("ef");
  ef.onsubmit = async e => { e.preventDefault(); collect(); $("em").textContent = "Сохраняем…"; const d = await api("/api/admin/save", {col, id: edit.id, item: it});
    if (d.error){ $("em").className = "fmsg bad"; $("em").textContent = d.error; return; } edit = null; await reload(); };
  ef.onclick = async e => {
    if (e.target.closest("[data-cx]")){ edit = null; return drawCol(col); }
    if (e.target.closest("[data-del]")){ if (!confirm("Удалить совсем? (Можно просто скрыть.)")) return; const d = await api("/api/admin/del", {col, id: edit.id}); if (!d.error){ edit = null; reload(); } return; }
    if (e.target.closest("[data-rm]")){ collect(); it.img = ""; return drawForm(col); }
    const rp = e.target.closest("[data-rmp]"); if (rp){ collect(); it.photos.splice(+rp.dataset.rmp, 1); return drawForm(col); }
  };
  ef.onchange = async e => {
    const one = e.target.dataset.up, many = e.target.dataset.ups;
    if (!one && !many) return;
    collect();
    const files = [...e.target.files];
    $("em").className = "fmsg"; $("em").textContent = "Загружаем " + files.length + " фото…";
    for (const f of files){
      const d = await api("/api/admin/upload", {data: await shrink(f)});
      if (d.error){ $("em").className = "fmsg bad"; $("em").textContent = d.error; return; }
      if (one) it[one] = d.url; else (it[many] = it[many] || []).push(d.url);
    }
    drawForm(col);
  };
}
/* фото перед отправкой — до 1600 px по большей стороне, JPEG */
function shrink(file){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.85)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Не картинка")); };
    img.src = url;
  });
}

/* контакты */
const INFO_F = [["name", "Название"], ["kicker", "Подзаголовок (залы)"], ["tagline", "Слоган на первом экране", "area"], ["city", "Город"], ["address", "Адрес"], ["floor", "Этаж, вход"], ["phone", "Телефон"], ["phone2", "Второй телефон (необязательно)"], ["tgbook", "Telegram для брони — аккаунт, например @club_mechti"],
  ["mapq", "Как искать на картах"], ["rating", "Оценка на Яндекс Картах (например, 4,4)"], ["tg", "Telegram-канал (ссылка)"], ["ig", "Instagram (ссылка)"], ["guide", "Барный гид (ссылка)"]];
function drawInfo(){
  const I = JSON.parse(JSON.stringify(D.site.info));
  $("pane").innerHTML = '<form class="card af" id="inf">' + INFO_F.map(f => field(f, I[f[0]])).join("") +
    '<div class="abtns"><button class="btn" type="submit">Сохранить</button></div><p class="fmsg" id="em" role="status"></p></form>';
  $("inf").onsubmit = async e => { e.preventDefault(); INFO_F.forEach(([k]) => { I[k] = $("f_" + k).value; }); const d = await api("/api/admin/save", {col: "info", item: I});
    $("em").className = "fmsg " + (d.error ? "bad" : "ok"); $("em").textContent = d.error || "Сохранено ✓"; if (!d.error){ D.site.info = I; } };
}

reload().then(() => { if (!D) draw(); });
