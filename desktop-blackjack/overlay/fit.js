/* Loaded first, in the head of the home screen and of both apps: everything is drawn at the size of the window.
 *
 * The two apps were laid out for a phone and a browser tab: on a large monitor the table stopped growing at 1180px
 * and its text stayed 15px. Here the whole page is scaled so that a window of 1180 by 860 is the smallest "full size"
 * one: a window twice as large shows everything twice as large (CSS zoom on the root). Ctrl with + - 0 or the wheel
 * (desktop.js) multiplies that by the person's own factor, kept under 'desk.v1'.
 *
 * Two things follow from scaling the root, and are put right here so that the apps need no change:
 *   - getBoundingClientRect answers in window pixels while everything the apps then set (left, top, transforms) is
 *     in page pixels, which would send flying chips and dealt cards to the wrong place; it answers in page pixels;
 *   - vw and vh lengths grow with the scale too; the styles that need the window divide by --desk-s.
 * A window at least 1380 by 700 page pixels is "wide" (class desk-wide): the table then has a panel on each side. */
(function () {
  'use strict';
  var KEY = 'desk.v1', BASE_W = 1180, BASE_H = 860, root = document.documentElement, scale = 1;
  function kept() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function user() { var z = Number(kept().zoom); return z >= 0.6 && z <= 2 ? z : 1; }
  function fit() {
    var W = window.innerWidth, H = window.innerHeight;
    var auto = Math.max(1, Math.min(W / BASE_W, H / BASE_H, 4));
    scale = Math.round(auto * user() * 100) / 100;
    root.style.zoom = scale === 1 ? '' : String(scale);
    root.style.setProperty('--desk-s', String(scale));
    root.classList.toggle('desk-wide', kept().panels !== false && W / scale >= 1380 && H / scale >= 700);
    return scale;
  }
  var rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    var r = rect.call(this);
    return scale === 1 ? r : new DOMRect(r.x / scale, r.y / scale, r.width / scale, r.height / scale);
  };
  // A canvas drawn at devicePixelRatio (the trainer's chart) would be stretched by the scale: it is told the real one.
  try {
    var dpr = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    if (dpr && dpr.get && dpr.configurable) {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, enumerable: true, get: function () { return dpr.get.call(window) * scale; } });
    }
  } catch (e) { /* the chart is a little softer, nothing else */ }
  var seenW = 0, seenH = 0;
  function onResize() { seenW = window.innerWidth; seenH = window.innerHeight; fit(); }
  onResize();
  window.addEventListener('resize', onResize);
  // A window can change size without saying so (maximised by the system, moved to another monitor): look again now
  // and then, and tell the page as a resize would.
  setInterval(function () {
    if (window.innerWidth !== seenW || window.innerHeight !== seenH) window.dispatchEvent(new Event('resize'));
  }, 500);
  window.DeskFit = { get scale() { return scale; }, get user() { return user(); }, refit: fit,
    windowRect: function (el) { return rect.call(el); } };
})();
