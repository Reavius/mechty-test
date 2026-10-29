/* Заказ со стола — общая логика: меню, заказы, очередь и время готовности, бегунок, ответы API.
   Без Node: её используют и table/server.mjs, и демо-страница (table/demo.mjs собирает всё в один файл).
   Окружение — время, случайные ключи, проверка ключей стола и бармена, оплата, R-Keeper, сохранение — передаёт вызывающий. */
export class Fail extends Error { constructor(code, msg){ super(msg); this.code = code; } }

export const TABLES = 10;
export const UNPAID = 15 * 60e3;                                    // неоплаченный заказ через 15 минут отменяется
const PREP = { cocktails: 2.5, wine: 0.8, spirits: 0.6, beer: 1, soft: 1.5, hot: 2.5 };   // минут бармена на позицию

/* меню — как на сайте: MENU из js/menu.js и открытая карта из js/data.js; id — из карты или по названию (hash) */
export function buildMenu(menu, pub, hash){
  const card = {};
  for (const g of pub) for (const it of g.items) if (!it.lo) card[it.id] = it;
  const items = new Map(), out = [];
  for (const c of menu){
    const cat = { k: c.k, n: c.ru, secs: [] };
    for (const s of c.secs){
      const sec = { n: s.ru, tiles: !!s.tiles, items: [] };
      for (const x of s.items){
        const ci = x.c ? card[x.c] : null;
        if (!x.n && !ci) continue;                                       // позиции из карты уже нет — как на сайте
        const n = x.n || ci.n, vs = String(x.v || "").split("/");
        const opts = String(x.p).split("/").map((p, i) => ({ v: +vs[i] || +vs[0] || 0, p: +p })).filter(o => o.p > 0);
        if (!opts.length) continue;
        const id = x.c && !items.has(x.c) ? x.c : "m" + hash(c.k + "|" + s.ru + "|" + n);
        const alc = c.k === "cocktails" ? (ci ? !!ci.abv : !/безалк/i.test(n + s.ru)) : ["wine", "spirits", "beer"].includes(c.k) && !/безалк/i.test(n);
        const it = { id, n, d: x.d || (ci && ci.m) || "", img: s.tiles && ci && ci.img || "", u: x.u === "pcs" ? "шт" : "мл", opts, alc, k: c.k };
        items.set(id, it); sec.items.push(it);
      }
      if (sec.items.length) cat.secs.push(sec);
    }
    if (cat.secs.length) out.push(cat);
  }
  return { menu: out, items };
}

const clean = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, n);
/* рабочий день бара — до 6 утра: номера заказов с 1 каждый день */
const dayKey = t => { const d = new Date(t - 6 * 3600e3); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const work = o => 1.5 + o.lines.reduce((a, l) => a + l.q * (PREP[l.k] || 1.5), 0);
const hhmm = t => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/* env: { db: {orders, stop, seq}, menu() → {menu, items}, now(), rand(n) → n шестнадцатеричных знаков, same(a, b) — сравнение секретов,
          tableOk(t, k), barOk(k), qr() → {base, tables}, pay: {name, demo, create(o) → {ref, url}},
          rk: {name, send(o, slip) → Promise<{ref}>}, save() } */
export function createApp(env){
  const db = env.db, same = env.same || ((a, b) => a === b);

  function sweep(){
    const now = env.now();
    let ch = false;
    for (const o of db.orders) if (o.status === "new" && now - o.created > UNPAID){ o.status = "expired"; ch = true; }
    if (ch) env.save();
  }

  function orderCreate(b){
    const t = +b.t;
    if (!(Number.isInteger(t) && t >= 1 && t <= TABLES) || !env.tableOk(t, String(b.k || ""))) throw new Fail(403, "QR стола не подошёл — отсканируйте код на столе ещё раз");
    const { items } = env.menu(), lines = [];
    let total = 0, alc = false;
    for (const l of Array.isArray(b.lines) ? b.lines.slice(0, 40) : []){
      const it = items.get(String(l && l.id)), o = it && it.opts[+l.o || 0], q = +l.q;
      if (!it || !o) throw new Fail(409, "Меню обновилось — проверьте корзину");
      if (db.stop.includes(it.id)) throw new Fail(409, "«" + it.n + "» закончился — уберите его из корзины");
      if (!(Number.isInteger(q) && q >= 1 && q <= 20)) throw new Fail(400, "Количество — от 1 до 20");
      lines.push({ id: it.id, n: it.n, v: o.v, u: it.u, p: o.p, q, note: clean(l.note, 120), k: it.k });
      total += o.p * q; alc = alc || it.alc;
    }
    if (!lines.length) throw new Fail(400, "Корзина пуста");
    if (alc && b.adult !== true) throw new Fail(400, "Подтвердите, что вам есть 18 лет");
    if (db.orders.filter(o => o.table === t && o.status === "new").length >= 5) throw new Fail(429, "За этим столом уже много неоплаченных заказов — оплатите или подождите");
    const o = { id: env.rand(12), secret: env.rand(24), no: 0, day: "", table: t, lines, comment: clean(b.comment, 300), total, alc, status: "new", created: env.now() };
    o.pay = env.pay.create(o);
    db.orders.push(o); env.save();
    return { id: o.id, s: o.secret, url: o.pay.url };
  }

  /* оплата пришла (сейчас — демо-кнопка, потом — уведомление банка): номер, очередь, время готовности, в R-Keeper */
  async function orderPaid(o, ref){
    if (o.status !== "new") return;
    const now = env.now();
    o.day = dayKey(now); db.seq[o.day] = (db.seq[o.day] || 0) + 1; o.no = db.seq[o.day];
    const ahead = db.orders.filter(x => x !== o && (x.status === "paid" || x.status === "cooking"))
      .reduce((a, x) => a + Math.max(0, work(x) - (x.status === "cooking" ? (now - x.cook) / 60e3 : 0)), 0);
    Object.assign(o, { status: "paid", paid: now, payRef: ref, eta: now + Math.ceil(ahead + work(o)) * 60e3 });
    env.save();
    try { const r = await env.rk.send(o, slipText(o)); o.rk = r.ref; }
    catch (e) { o.rkErr = String(e && e.message || e); }
    env.save();
  }

  /* бегунок бармену: 40 знаков в строке, как на 80-мм ленте */
  function slipText(o){
    const W = 40, pad = (a, b) => a + " ".repeat(Math.max(1, W - a.length - b.length)) + b, line = "-".repeat(W);
    const wrap = (s, ind) => { const out = []; let cur = ""; for (const w of s.split(" ")){ if ((cur + " " + w).trim().length > W - ind){ out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); } out.push(cur); return out.map(x => " ".repeat(ind) + x); };
    const r = [pad("БАР «МЕЧТЫ»", "Заказ № " + o.no), pad("СТОЛ " + o.table, hhmm(o.paid)), "Оплачен: " + env.pay.name, line];
    for (const l of o.lines){
      r.push(...wrap(l.q + " × " + l.n + (l.v ? " " + l.v + " " + l.u : ""), 0));
      if (l.note) r.push(...wrap("! " + l.note, 4));
    }
    r.push(line);
    if (o.comment) r.push(...wrap("Комментарий: " + o.comment, 0), line);
    r.push(pad("Сумма", money(o.total) + " ₽"), pad("Готовность", "к " + hhmm(o.eta)));
    return r.join("\n") + "\n";
  }

  const guestView = o => ({ id: o.id, no: o.no, table: o.table, status: o.status, lines: o.lines.map(({ k, id, ...l }) => l), comment: o.comment,
    total: o.total, created: o.created, paid: o.paid || 0, eta: o.eta || 0, cook: o.cook || 0, ready: o.ready || 0, done: o.done || 0,
    review: o.review || null, payName: env.pay.name, demo: env.pay.demo, pay: o.status === "new" ? o.pay.url : "", now: env.now() });
  const barView = o => ({ ...guestView(o), rk: o.rk || "", rkErr: o.rkErr || "", etaSet: !!o.etaSet, slip: slipText(o) });

  function orderFind(id, s){
    const o = db.orders.find(x => x.id === id);
    if (!o || !same(String(s || ""), o.secret)) throw new Fail(404, "Заказ не найден");
    return o;
  }

  function barList(){
    const now = env.now(), from = now - 18 * 3600e3, day = dayKey(now);
    const list = db.orders.filter(o => o.paid && o.paid > from && (o.status !== "done" || now - o.done < 3 * 3600e3));
    const act = { paid: 0, cooking: 1, ready: 2, done: 3 };
    list.sort((a, b) => act[a.status] - act[b.status] || (a.status === "done" ? b.done - a.done : a.paid - b.paid));
    const today = db.orders.filter(o => o.paid && o.day === day), rev = db.orders.filter(o => o.review).sort((a, b) => b.review.at - a.review.at);
    const avg = a => a.length ? Math.round(a.reduce((s, o) => s + o.review.stars, 0) / a.length * 10) / 10 : 0;
    return { orders: list.map(barView), stop: db.stop, now, pay: env.pay.name, rkName: env.rk.name,
      stats: { n: today.length, sum: today.reduce((a, o) => a + o.total, 0), avgToday: avg(today.filter(o => o.review)), avgAll: avg(rev), nRev: rev.length },
      reviews: rev.slice(0, 40).map(o => ({ no: o.no, day: o.day, table: o.table, stars: o.review.stars, text: o.review.text, at: o.review.at })) };
  }

  function barAct(o, b){
    const now = env.now();
    if (!o.paid) throw new Fail(409, "Заказ не оплачен");
    if (b.act === "cook" && (o.status === "paid" || o.status === "ready")){ o.status = "cooking"; o.cook = o.cook || now; o.ready = 0; }
    else if (b.act === "ready" && (o.status === "paid" || o.status === "cooking")){ o.status = "ready"; o.cook = o.cook || now; o.ready = now; }
    else if (b.act === "done" && o.status !== "done"){ o.status = "done"; o.done = now; o.ready = o.ready || now; }
    else if (b.act === "eta"){
      const m = +b.min;
      if (!(Number.isInteger(m) && m >= 0 && m <= 120)) throw new Fail(400, "Время — от 0 до 120 минут");
      o.eta = now + m * 60e3; o.etaSet = true;
    } else throw new Fail(409, "Нельзя: заказ уже в другом статусе");
    env.save();
  }

  /* все адреса API: q — URLSearchParams, b — тело POST, barKey — заголовок x-bar-key */
  async function route(method, p, q, b, barKey){
    const post = method === "POST";
    sweep();
    let m;
    if (p === "/api/menu"){
      const t = +q.get("t");
      if (!(t >= 1 && t <= TABLES) || !env.tableOk(t, q.get("k") || "")) throw new Fail(403, "QR стола не подошёл — отсканируйте код на столе ещё раз");
      return { table: t, menu: env.menu().menu, stop: db.stop, pay: env.pay.name };
    }
    if (p === "/api/order" && post) return orderCreate(b);
    if ((m = p.match(/^\/api\/order\/(\w+)$/))) return guestView(orderFind(m[1], q.get("s")));
    if ((m = p.match(/^\/api\/order\/(\w+)\/(review|cancel)$/)) && post){
      const o = orderFind(m[1], q.get("s"));
      if (m[2] === "cancel"){ if (o.status !== "new") throw new Fail(409, "Заказ уже оплачен"); o.status = "cancelled"; }
      else {
        const st = +b.stars;
        if (!o.paid) throw new Fail(409, "Отзыв — после оплаты");
        if (!(Number.isInteger(st) && st >= 1 && st <= 5)) throw new Fail(400, "Поставьте от 1 до 5 звёзд");
        o.review = { stars: st, text: clean(b.text, 500), at: env.now() };
      }
      env.save();
      return guestView(o);
    }
    if (p === "/api/demo/pay" && post && env.pay.demo){
      const o = orderFind(String(b.id || ""), b.s);
      if (o.status === "expired" || o.status === "cancelled") throw new Fail(409, "Заказ отменён — соберите корзину заново");
      await orderPaid(o, o.pay.ref);
      return guestView(o);
    }
    if (p.startsWith("/api/bar")){
      if (!env.barOk(barKey || "")) throw new Fail(403, "Нет доступа");
      if (p === "/api/bar") return barList();
      if (p === "/api/bar/qr") return env.qr();
      if (p === "/api/bar/menu") return { menu: env.menu().menu, stop: db.stop };
      if (p === "/api/bar/stop" && post){
        const { items } = env.menu(), id = String(b.id || "");
        if (!items.has(id)) throw new Fail(404, "Нет такой позиции");
        db.stop = db.stop.filter(x => x !== id && items.has(x));
        if (b.on) db.stop.push(id);
        env.save();
        return { stop: db.stop };
      }
      if ((m = p.match(/^\/api\/bar\/order\/(\w+)$/)) && post){
        const o = db.orders.find(x => x.id === m[1]);
        if (!o) throw new Fail(404, "Заказ не найден");
        barAct(o, b);
        return barList();
      }
    }
    throw new Fail(404, "Нет такого адреса");
  }

  return { route, orderPaid, slipText };
}
