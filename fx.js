/* Анимации сайта на GSAP — включены для всех (выключить на устройстве: ?fx=0).
   Только сдвиг, масштаб и прозрачность — без тормозов на слабых телефонах.
   При «Уменьшении движения» в настройках телефона ничего не запускается. */
(function () {
  if (!window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches){
    document.documentElement.classList.remove("fx-pre"); return;
  }
  const g = window.gsap;
  if (window.ScrollTrigger) g.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("fx-on");
  const $ = s => document.querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ── заставка: векторная молния из меню — контур прорисовывается, затем заливка и мягкое свечение ── */
  const BOLT = "M 126.348 33.418 L 49.457 33.418 L 69.594 0 L 60.531 0 L 54.457 10.086 L 52.977 12.547 C 43.578 26.836 23.887 33.402 10.461 33.402 C 10.461 33.402 10.613 33.406 10.875 33.418 L 1.043 33.418 L 0 35.293 L 39.273 35.293 L 22.137 63.742 L 31.184 63.746 L 34.242 58.672 L 34.297 58.699 C 42.949 42.695 64.117 35.383 78.293 35.383 C 78.293 35.383 77.551 35.348 76.301 35.293 L 125.309 35.293Z";
  function intro() {
    const ov = document.createElement("div");
    ov.className = "fx-intro";
    ov.innerHTML =
      '<svg class="fx-bolt" viewBox="-30 -30 186.35 123.75" aria-hidden="true">' +
        '<defs>' +
          '<filter id="fxGlow" x="-50%" y="-80%" width="200%" height="260%" color-interpolation-filters="sRGB">' +
            '<feGaussianBlur stdDeviation="6"/>' +
          '</filter>' +
          '<linearGradient id="fxShine" x1="0" x2="1" y1="0" y2="0">' +
            '<stop offset="0" stop-color="#fff" stop-opacity="0"/>' +
            '<stop offset=".5" stop-color="#fff" stop-opacity=".9"/>' +
            '<stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
          '</linearGradient>' +
          '<clipPath id="fxClip"><path d="' + BOLT + '"/></clipPath>' +
        '</defs>' +
        '<path class="fx-glow" d="' + BOLT + '" fill="#FEF061" filter="url(#fxGlow)"/>' +
        '<path class="fx-fill" d="' + BOLT + '" fill="#FEF061"/>' +
        '<path class="fx-line" d="' + BOLT + '" fill="none" stroke="#FEF061" stroke-width=".7" stroke-linejoin="round"/>' +
        '<rect class="fx-shine" x="-40" y="-5" width="36" height="75" fill="url(#fxShine)" clip-path="url(#fxClip)" transform="skewX(-20)"/>' +
      '</svg>' +
      '<div class="fx-word">Бар «Мечты»</div>';
    document.body.appendChild(ov);
    const line = ov.querySelector(".fx-line"), len = line.getTotalLength();
    g.set(line, { strokeDasharray: len, strokeDashoffset: len });
    g.set([".fx-fill", ".fx-glow"], { opacity: 0 });
    const tl = g.timeline({ defaults: { ease: "sine.inOut" }, onComplete: () => ov.remove() });
    tl.fromTo(".fx-bolt", { scale: .94, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: "power2.out", transformOrigin: "50% 50%" })
      .to(line, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, "<")
      .to(".fx-fill", { opacity: 1, duration: .55 }, "-=.25")
      .to(".fx-glow", { opacity: .55, duration: .6 }, "<")
      .to(line, { opacity: 0, duration: .4 }, "<.2")
      .fromTo(".fx-shine", { x: 0 }, { x: 190, duration: .9, ease: "power2.inOut" }, "-=.35")
      .to(".fx-glow", { opacity: .25, duration: .8 }, "<")
      .fromTo(".fx-word", { opacity: 0, y: 10, letterSpacing: ".55em" },
        { opacity: 1, y: 0, letterSpacing: ".3em", duration: .8, ease: "power3.out" }, "-=.7")
      .to(ov, { opacity: 0, duration: .6, ease: "power2.inOut", delay: .35 })
      .to(".fx-bolt", { scale: 1.06, duration: .6, ease: "power2.in" }, "<");
    return tl;
  }

  /* ── заголовок страницы: буквы по одной ── */
  function splitTitle(h1) {
    if (!h1 || h1.dataset.fx) return [];
    h1.dataset.fx = 1;
    const out = [];
    const walk = node => {
      for (const n of Array.from(node.childNodes)) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent) {
            const s = document.createElement("span");
            s.className = "fx-ch"; s.textContent = ch;
            frag.appendChild(s); out.push(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      }
    };
    walk(h1);
    return out;
  }

  function heroIn(delay) {
    const chars = splitTitle($("#viewBar h1"));
    const tl = g.timeline({ delay });
    tl.from("#viewBar .mark", { opacity: 0, y: 10, duration: .4 })
      .from(chars, { opacity: 0, y: "0.4em", rotateX: -70, transformOrigin: "50% 100%", stagger: .025, duration: .5, ease: "back.out(1.6)" }, "-=.1")
      .from("#viewBar .lede", { opacity: 0, y: 12, duration: .5 }, "-=.3")
      .from("#viewBar .meta > div", { opacity: 0, y: 14, stagger: .08, duration: .45 }, "-=.3")
      .from("#viewBar .controls", { opacity: 0, y: 14, duration: .45 }, "-=.25");
    return tl;
  }

  /* ── карточки: всплывают каскадом при прокрутке, крепость досчитывается ── */
  function animateCards(root) {
    const cards = $$("article:not([data-fx])", root);
    if (!cards.length) return;
    cards.forEach(c => { c.dataset.fx = 1; });
    g.set(cards, { opacity: 0, y: 36 });
    ScrollTrigger.batch(cards, {
      start: "top 92%",
      once: true,
      onEnter: batch => {
        g.to(batch, { opacity: 1, y: 0, duration: .6, ease: "power3.out", stagger: .08 });
        batch.forEach(c => {
          const ph = c.querySelector(".cph");
          if (ph) g.from(ph, { opacity: 0, y: 24, scale: .92, duration: .8, ease: "power3.out", delay: .15 });
        });
      }
    });
    /* «парящие» фото: при прокрутке двигаются медленнее карточки */
    $$(".cph", root).forEach(ph => {
      g.fromTo(ph, { yPercent: 6 }, {
        yPercent: -6, ease: "none",
        scrollTrigger: { trigger: ph.closest("article"), start: "top bottom", end: "bottom top", scrub: .6 }
      });
    });
    $$(".sechead", root).forEach(h => {
      g.from(h, { opacity: 0, x: -18, duration: .5, ease: "power2.out", scrollTrigger: { trigger: h, start: "top 92%", once: true } });
    });
    ScrollTrigger.refresh();
  }

  /* страховка: если прокрутили рывком и карточка в кадре так и не проявилась — показать */
  function reveal() {
    $$("article[data-fx]").forEach(c => {
      const r = c.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0 && +getComputedStyle(c).opacity < .05)
        g.to(c, { opacity: 1, y: 0, duration: .45, ease: "power2.out", overwrite: "auto" });
    });
  }
  ScrollTrigger.addEventListener("scrollEnd", reveal);
  addEventListener("load", () => { ScrollTrigger.refresh(); reveal(); });
  document.addEventListener("load", e => { if (e.target.tagName === "IMG") ScrollTrigger.refresh(); }, true);

  /* лёгкое увеличение бокала при касании / наведении */
  document.addEventListener("pointerover", e => {
    const ph = e.target.closest && e.target.closest(".cph, .tph");
    if (ph) g.to(ph, { scale: 1.07, duration: .3, ease: "power2.out", overwrite: "auto" });
  });
  document.addEventListener("pointerout", e => {
    const ph = e.target.closest && e.target.closest(".cph, .tph");
    if (ph) g.to(ph, { scale: 1, duration: .4, ease: "power2.out", overwrite: "auto" });
  });

  /* карта перерисовывается при фильтрах и поиске — анимируем новые карточки */
  const out = $("#out");
  if (out) {
    new MutationObserver(() => {
      ScrollTrigger.getAll().forEach(t => { if (!document.body.contains(t.trigger)) t.kill(); });
      animateCards(out);
    }).observe(out, { childList: true });
    animateCards(out);
  }

  /* ── переход между «Бар «Мечты»» и «Бартендерам»: старая страница уезжает и гаснет,
        новая въезжает с другой стороны (влево — к бартендерам, вправо — обратно) ── */
  const origShow = window.showView;
  if (typeof origShow === "function") {
    let busy = null;
    window.showView = function (v) {
      const bar = $("#viewBar"), bt = $("#viewBt");
      const cur = bar.hidden ? "bt" : "bar";
      if (busy) { busy.progress(1); busy = null; }
      if (v === cur) return origShow(v);
      const from = cur === "bar" ? bar : bt, to = v === "bar" ? bar : bt, dir = v === "bt" ? 1 : -1;
      g.to("#" + (v === "bt" ? "tabBt" : "tabBar"), { scale: .94, duration: .12, yoyo: true, repeat: 1, ease: "power1.inOut" });
      busy = g.to(from, {
        opacity: 0, x: -28 * dir, duration: .22, ease: "power2.in",
        onComplete: () => {
          busy = null;
          g.set(from, { clearProps: "opacity,transform" });
          origShow(v);
          window.scrollTo(0, 0);
          g.fromTo(to, { opacity: 0, x: 28 * dir }, { opacity: 1, x: 0, duration: .42, ease: "power3.out", clearProps: "opacity,transform",
            onComplete: () => ScrollTrigger.refresh() });
        }
      });
    };
  }

  /* ── «Бартендерам»: плавная смена разделов, переворот этикеток, цифры ревизии ── */
  const sect = $("#sect");
  if (sect) sect.addEventListener("click", () => requestAnimationFrame(() => {
    const vis = ["#secTtk", "#secCalc", "#secOrder", "#secZone", "#secRev", "#secLab", "#secWo"].map(s => $(s)).find(el => el && !el.hidden);
    if (vis) g.fromTo(vis, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .3, ease: "power2.out" });
    g.fromTo("#btTitle", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .3 });
  }));

  const lpos = $("#lpos");
  if (lpos) lpos.addEventListener("change", () => {
    $$(".lprev canvas").forEach((c, i) => g.fromTo(c, { rotateY: 90 }, { rotateY: 0, duration: .45, delay: i * .08, ease: "back.out(1.4)" }));
  });

  const rlist = $("#rlist");
  if (rlist) rlist.addEventListener("submit", e => {
    const li = e.target.closest("li");
    setTimeout(() => {
      const b = document.querySelector('#rlist li[data-i="' + (li && li.dataset.i) + '"] .rtop b');
      if (b) g.fromTo(b, { scale: 1.35, color: "#C9A24B" }, { scale: 1, color: "", duration: .5, ease: "back.out(2)" });
    }, 0);
  }, true);

  ["#olist", "#zlist"].map(s => $(s)).forEach(list => list && list.addEventListener("change", e => {
    const box = e.target.closest("input[type=checkbox]");
    if (box && box.checked) g.fromTo(box, { scale: .6 }, { scale: 1, duration: .35, ease: "back.out(3)" });
  }));

  /* ── старт ── */
  const onBar = !location.hash || location.hash === "#" || !/^#bartenders/.test(location.hash);
  let seen = false;
  try { seen = !!sessionStorage.getItem("fx-intro"); sessionStorage.setItem("fx-intro", 1); } catch (e) {}
  document.documentElement.classList.remove("fx-pre");
  /* заставка — при каждом открытии сайта или приложения (один раз за вкладку), на любой странице */
  if (!seen){
    const ov = intro(), hero = onBar ? heroIn(3.1) : null, el = $(".fx-intro");
    /* нажали на заставку — сразу к сайту (бармену некогда ждать) */
    /* click, а не pointerdown: касание достаётся заставке, а не кнопке под ней */
    if (el) el.addEventListener("click", () => { ov.progress(1); if (hero && hero.progress() === 0) hero.restart(); }, { once: true });
  }
  else if (onBar) heroIn(0);
})();
