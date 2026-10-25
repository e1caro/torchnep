'use strict';
// Swipe left or right to move between the sections of the tab bar (Today ↔ Plan ↔ Shop ↔ Progress ↔ Friends ↔ Hero).
// The page follows the finger, and the next section slides in. Swipes that belong to something else are left alone:
// sideways scrollers, sliders and text fields, an open Today panel, a workout, the weekly summary, a dialog,
// and the screen edges (the phone's own back gesture lives there).

(() => {
  const TABS = () => [...document.querySelectorAll('#tabs a')];
  const curTab = () => TABS().findIndex(a => a.classList.contains('on'));
  let s = null;
  const blocked = el => document.body.classList.contains('focus') || document.querySelector('#recap, #modal:not([hidden]), .bx') || el.closest('#trybar')
    || el.closest('input, textarea, select, iframe, .bettabs, .days, .wheel, [data-noswipe]')
    || [...(function* up(n) { for (; n && n !== view; n = n.parentElement) yield n; })(el)].some(n => n.scrollWidth > n.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(n).overflowX));

  view.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (e.touches.length !== 1 || t.clientX < 24 || t.clientX > innerWidth - 24 || curTab() < 0 || blocked(e.target)) { s = null; return; }
    s = { x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, horiz: null };
  }, { passive: true });

  view.addEventListener('touchmove', e => {
    if (!s) return;
    const t = e.touches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (s.horiz === null && Math.hypot(dx, dy) > 10) s.horiz = Math.abs(dx) > Math.abs(dy) * 1.2; // decide once: sideways or scrolling
    if (!s.horiz) return;
    const i = curTab(), n = TABS().length, edge = (dx > 0 && i === 0) || (dx < 0 && i === n - 1);
    s.dx = dx;
    view.style.transition = 'none';
    view.style.transform = `translateX(${edge ? dx * .15 : dx * .45}px)`; // a little resistance, more at the ends
    view.style.opacity = String(1 - Math.min(.35, Math.abs(dx) / 900));
  }, { passive: true });

  const end = () => {
    if (!s) return;
    const { dx, t, horiz } = s; s = null;
    const reset = () => { view.style.transition = 'transform .25s ease, opacity .25s ease'; view.style.transform = ''; view.style.opacity = ''; };
    if (!horiz) { reset(); return; }
    const fast = Math.abs(dx) / Math.max(1, Date.now() - t) > .35, go = Math.abs(dx) > innerWidth * .22 || (fast && Math.abs(dx) > 40);
    const tabs = TABS(), i = curTab(), j = i + (dx < 0 ? 1 : -1);
    if (!go || j < 0 || j >= tabs.length) { reset(); return; }
    // slide out, change section, slide the new one in from the other side
    view.style.transition = 'transform .16s ease-in, opacity .16s ease-in';
    view.style.transform = `translateX(${dx < 0 ? -60 : 60}px)`; view.style.opacity = '0';
    setTimeout(() => {
      location.hash = tabs[j].getAttribute('href');
      view.style.transition = 'none'; view.style.transform = `translateX(${dx < 0 ? 60 : -60}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { view.style.transition = 'transform .26s cubic-bezier(.2,.8,.2,1), opacity .26s ease-out'; view.style.transform = ''; view.style.opacity = ''; }));
      sfx('tick');
    }, 150);
  };
  view.addEventListener('touchend', end, { passive: true });
  view.addEventListener('touchcancel', end, { passive: true });
  // the transform must not linger: fixed-position panels inside the page would follow it
  view.addEventListener('transitionend', e => { if (e.target === view && !view.style.transform) view.style.transition = ''; });
})();
