/* Общее: $, esc, офлайн-кэш. */
const $ = id => document.getElementById(id);
/* ширина фото подачи (все 360 px в высоту) — чтобы место под фото было занято сразу */
/* версия сайта — как кэш офлайна в sw.js (mechty-v<номер>): видно в «Этикетках», какая версия открыта на телефоне */
const SITE_VER = 119;
const PHW = {"ananas":184,"aperol":123,"bluecolada":170,"bosford":177,"campari":123,"chili":132,"collins":166,"fiero":172,"granat":247,"grusha":192,"hugo":126,"maitai":125,"mandarin":126,"negroni":281,"pantera":159,"pornstar":199,"sarti":121,"sexbeach":156,"summer":180,"tequila":228,"tropiki":182,"vnegroni":246,"watermelon":192,"yuzu":204};
const phwh = src => { const w = PHW[String(src).replace(/^.*\/|\.webp$/g, "")]; return w ? ' width="' + w + '" height="360"' : ""; };

/* короткий отклик вибрацией (Android; iPhone вибрацию сайтам не даёт) */
function buzz(ms){ try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) {} }

/* заглушка-скелет на время загрузки */
const skel = (n, cls) => Array.from({length: n}, (_, i) =>
  '<li class="skel' + (cls ? " " + cls : "") + '" aria-hidden="true"><i style="width:' + (38 + (i * 23) % 34) + '%"></i><i></i></li>').join("");

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}


/* ════════════ Приложение: офлайн-кэш ════════════ */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
