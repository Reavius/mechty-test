/* Вход, сессия, журнал входов, вкладки. */
const ENDPOINT = "https://script.google.com/macros/s/AKfycbxqrh3LqmPif6Uoaelm1XdXEBLC3eUpOPc3vSutbCfElQRu3CtzouDTyvz4O9hsayBu/exec";
const WHO = "mechty-who";              // фамилия и почта для подстановки в форму (без пароля)

let R = null, ALL = [], K = [], KALL = [], Z = [], ZO = [], ZN = [], TOKEN = "", me = null;
let logged = false, calcReady = false, shared = null, logState = "idle";
let fails = 0, waitUntil = 0;

/* старые версии хранили код доступа открытым текстом — убираем */
try { localStorage.removeItem("mechty-key"); localStorage.removeItem("mechty-log"); } catch (e) {}

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pw){
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {name:"PBKDF2", salt:b64(BLOB.s), iterations:BLOB.n, hash:"SHA-256"},
    base, {name:"AES-GCM", length:256}, false, ["decrypt"]);
}

async function openWith(key){
  try {
    const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:b64(BLOB.i)}, key, b64(BLOB.c));
    const p = JSON.parse(new TextDecoder().decode(plain));
    return (p && Array.isArray(p.r) && p.t) ? p : null;
  } catch (e) { return null; }
}

/* ── сессия: неизвлекаемый ключ в IndexedDB, пароль нигде не хранится ── */
function idb(mode, fn){
  return new Promise((resolve, reject) => {
    const rq = indexedDB.open("mechty", 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore("s");
    rq.onerror = () => reject(rq.error);
    rq.onsuccess = () => {
      const db = rq.result;
      const tx = db.transaction("s", mode);
      const q = fn(tx.objectStore("s"));
      tx.oncomplete = () => { db.close(); resolve(q && q.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
}
const saveSession = s => idb("readwrite", st => st.put(s, "session")).catch(() => {});
const dropSession = () => idb("readwrite", st => st.delete("session")).catch(() => {});

async function loadSession(){
  try {
    const s = await idb("readonly", st => st.get("session"));
    if (s && s.key && s.salt === BLOB.s && s.name && s.email) return s;
    if (s) dropSession();
  } catch (e) {}
  return null;
}

/* ── журнал входов (Google Sheets через Apps Script) ──
   Apps Script отвечает редиректом без CORS-заголовков, поэтому — JSONP.
   Первый запрос после простоя идёт долго, ответ принимаем даже с опозданием. */
function api(params){
  return new Promise(resolve => {
    const cb = "mechtyCb" + Date.now() + Math.floor(Math.random() * 1e6);
    const el = document.createElement("script");
    let settled = false;
    const settle = v => { if (!settled){ settled = true; resolve(v); } };

    window[cb] = d => {
      settle(d && typeof d === "object" ? d : {error:"bad"});
      setTimeout(() => { try { delete window[cb]; } catch (e) { window[cb] = undefined; } el.remove(); }, 0);
    };
    el.onerror = () => settle({error:"net"});
    setTimeout(() => settle({error:"net"}), 30000);

    const q = new URLSearchParams(Object.assign({callback:cb, token:TOKEN}, params));
    el.src = ENDPOINT + "?" + q.toString();
    document.head.appendChild(el);
  });
}

async function call(params){
  const d = await api(params);
  if (d.ok && Array.isArray(d.log)) { shared = d.log; drawLog(); return "ok"; }
  return d.error ? String(d.error) : "bad";
}

async function report(){
  logState = "loading"; drawLog();
  $("logWarn").textContent = "";
  let r = "net";
  for (let a = 0; a < 3 && r === "net"; a++){
    if (a) await new Promise(ok => setTimeout(ok, 3000 * a));
    r = await call({name:me.name, email:me.email});
  }
  logState = r === "ok" ? "ok" : "fail"; drawLog();
  if (r !== "ok"){
    $("logWarn").innerHTML = (r === "denied"
      ? "Журнал отклонил запись: обновите Apps Script (см. README)."
      : "Вход не удалось записать в журнал — нет связи.") +
      ' <button type="button" class="link" id="retry">Повторить</button>';
    $("retry").addEventListener("click", report);
  }
}

async function refreshLog(){
  $("refresh").textContent = "…";
  logState = "loading"; drawLog();
  const r = await call({});
  logState = r === "ok" ? "ok" : "fail"; drawLog();
  $("refresh").textContent = "Обновить";
}

function when(t){
  const d = new Date(t), now = new Date();
  const hm = String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((day - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return "сегодня, " + hm;
  if (diff === 1) return "вчера, " + hm;
  return String(d.getDate()).padStart(2,"0") + "." + String(d.getMonth()+1).padStart(2,"0") + ", " + hm;
}

const LOG_SHORT = 10, LOG_FULL = 25;
let logOpen = false;
$("logMore").addEventListener("click", () => { logOpen = !logOpen; drawLog(); });

function drawLog(){
  $("logScope").textContent = logState === "loading" ? "· загружаем…"
    : logState === "fail" && !shared ? "· нет связи"
    : shared ? "· последние входы" : "";
  const all = (shared || []).slice(0, LOG_FULL);
  const list = logOpen ? all : all.slice(0, LOG_SHORT);
  $("logMore").hidden = all.length <= LOG_SHORT;
  $("logMore").textContent = logOpen ? "Свернуть" : "Развернуть · " + all.length;
  const mine = me ? me.name.toLowerCase() : "";
  $("log").setAttribute("aria-busy", logState === "loading" && !list.length);
  $("log").innerHTML = !list.length && logState === "loading" ? skel(5) : list.length
    ? list.map(e => '<li' + (String(e.n).toLowerCase() === mine ? ' class="me"' : '') + '>' +
        '<b>' + esc(e.n) + '</b><time>' + when(e.t) + '</time></li>').join("")
    : '<li class="none">' + (shared ? "Пока никто не заходил" : logState === "loading" ? "Загружаем журнал…" : "Журнал недоступен") + '</li>';
}

/* ── вход и выход ── */
function enter(p, name, email){
  R = p.r; TOKEN = p.t; ALL = R.flatMap(g => g.items);
  K = Array.isArray(p.k) ? p.k : []; KALL = K.flatMap(g => g.items);
  Z = Array.isArray(p.z) ? p.z : [];
  ZO = Array.isArray(p.zo) ? p.zo : [];
  ZN = Array.isArray(p.zn) ? p.zn : [];
  me = {name, email};
  $("meName").textContent = name;
  $("meMail").textContent = email;
  fill();
  fillTtk();
  fillOrder();
  fillZone();
  setSect(sect);
  if (!calcReady){ start(); calcReady = true; }
  showView("bt");
  if (!logged){ logged = true; report(); }
}

async function goBt(){
  if (R) return showView("bt");
  const s = await loadSession();
  if (s){
    const p = await openWith(s.key);
    if (p) return enter(p, s.name, s.email);
    dropSession();
  }
  showView("bar");
  openLogin();
}

function openLogin(){
  const dlg = $("login");
  if (dlg.open) return;
  try {
    const w = JSON.parse(localStorage.getItem(WHO) || "null");
    if (w){ if (!$("who").value) $("who").value = w.n || ""; if (!$("mail").value) $("mail").value = w.e || ""; }
  } catch (e) {}
  $("pw").value = "";
  $("gmsg").textContent = "";
  dlg.showModal();
  (!$("who").value ? $("who") : !$("mail").value ? $("mail") : $("pw")).focus();
}

function leaveBt(){
  if (location.hash === "#bartenders") history.replaceState(null, "", location.pathname + location.search);
  showView("bar");
}

$("cancel").addEventListener("click", () => $("login").close());
$("login").addEventListener("close", () => { if (!R) leaveBt(); });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

$("gform").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("who").value.trim().replace(/\s+/g, " ");
  const email = $("mail").value.trim().toLowerCase();
  const pw = $("pw").value;

  if (name.length < 2){ $("gmsg").textContent = "Укажите фамилию"; $("who").focus(); return; }
  if (!EMAIL.test(email)){ $("gmsg").textContent = "Проверьте адрес почты"; $("mail").focus(); return; }
  if (!pw){ $("gmsg").textContent = "Введите пароль"; $("pw").focus(); return; }
  const wait = Math.ceil((waitUntil - Date.now()) / 1000);
  if (wait > 0){ $("gmsg").textContent = "Слишком много попыток. Подождите " + wait + " с"; return; }

  $("go").disabled = true;
  $("gmsg").textContent = "Проверяем…";
  const key = await deriveKey(pw);
  const p = await openWith(key);
  $("go").disabled = false;

  if (!p){
    fails++;
    waitUntil = Date.now() + Math.min(60, 2 ** fails) * 1000;
    $("gmsg").textContent = "Неверный пароль";
    $("pw").select();
    return;
  }

  fails = 0;
  $("gmsg").textContent = "";
  try { localStorage.setItem(WHO, JSON.stringify({n:name, e:email})); } catch (e2) {}
  await saveSession({key, name, email, salt:BLOB.s});
  $("pw").value = "";
  logged = false;          // каждый вход по паролю — отдельная запись в журнале
  enter(p, name, email);
  $("login").close();
});

$("logout").addEventListener("click", async () => {
  await dropSession();
  R = null; ALL = []; K = []; KALL = []; Z = []; ZO = []; ZN = []; TOKEN = ""; me = null; shared = null; logged = false; logState = "idle";
  $("res").innerHTML = ""; $("tres").innerHTML = ""; $("olist").innerHTML = ""; $("zlist").innerHTML = ""; $("log").innerHTML = "";
  if (typeof woLeave === "function") woLeave();                // подпись и акты прежнего бармена не остаются на форме
  leaveBt();
});

$("refresh").addEventListener("click", refreshLog);

/* ── вкладки ── */
function showView(v){
  const bt = v === "bt";
  $("viewBar").hidden = bt;
  $("viewBt").hidden = !bt;
  $("tabBar").removeAttribute("aria-current");
  $("tabBt").removeAttribute("aria-current");
  $(bt ? "tabBt" : "tabBar").setAttribute("aria-current", "page");
  if (bt) window.scrollTo(0, 0);
}

function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if (h === "bartenders") return goBt();
  showView("bar");
  if (h) jumpTo(h);
}
/* повторный клик по «Бартендерам», когда адрес уже #bartenders */
$("tabBar").addEventListener("click", () => { if (!location.hash) showView("bar"); });
$("tabBt").addEventListener("click", e => {
  if (location.hash === "#bartenders"){ e.preventDefault(); goBt(); }
});
window.addEventListener("hashchange", route);
setTimeout(route, 80);
