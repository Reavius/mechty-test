/* Свайп влево/вправо — переход между «Бар «Мечты»» и «Бартендерам», как в приложении.
   Не мешает полям ввода, прокрутке вбок, этикеткам и системному «назад» от края экрана. */
(function () {
  const EDGE = 24, MIN = 70;
  let s = null;

  const skip = el => {
    for (; el && el !== document.body; el = el.parentElement){
      if (el.matches("input, textarea, select, canvas, dialog, [contenteditable]")) return true;
      if (el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
    }
    return false;
  };

  addEventListener("touchstart", e => {
    s = null;
    if (e.touches.length !== 1 || $("login").open) return;
    const t = e.touches[0];
    if (t.clientX < EDGE || t.clientX > innerWidth - EDGE || skip(e.target)) return;
    s = {x: t.clientX, y: t.clientY, t: Date.now()};
  }, {passive: true});

  addEventListener("touchend", e => {
    if (!s) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y, dt = Date.now() - s.t;
    s = null;
    if (dt > 700 || Math.abs(dx) < MIN || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (String(getSelection()).length) return;
    const onBar = !$("viewBar").hidden;
    if (onBar && dx < 0){ buzz(8); $("tabBt").click(); }
    else if (!onBar && dx > 0){ buzz(8); $("tabBar").click(); }
  }, {passive: true});

  addEventListener("touchcancel", () => { s = null; }, {passive: true});
})();
