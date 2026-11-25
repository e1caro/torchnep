/* Bloomdoku helper animations: the bee flies to its cell and hovers, the caterpillar crawls along the board, the
 * ladybird visits the cells it marks, the owl lands and looks around, the frog jumps to its cell.
 *
 * The game state never waits for an animation: a helper does its job at once and the sprite only decorates it, so
 * nothing here can change a result. Sprites live in one fixed layer over the page and never take taps. With
 * "reduce motion" on, a sprite just appears at its place and fades away.
 */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var A = BD.art, Shop = BD.shop;
  var F = (BD.fx = {});
  var live = []; // sprites on screen: { el, anims, timers }

  F.reduced = function () { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); };
  function layer() {
    var el = document.getElementById('fx');
    if (!el) { el = document.createElement('div'); el.id = 'fx'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    return el;
  }
  function centre(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
  // The drawing of a helper in the look the player chose. helper: 'bee' | 'cat' | 'lady' | 'owl' | 'frog'
  F.art = function (helper, size, cls, look) {
    var h = Shop.HELPERS.filter(function (x) { return x.id === helper; })[0];
    return A.helper(h.art, look || Shop.wearing(BD.state, 'h-' + helper), size, cls);
  };

  function make(helper, size, at) {
    var el = document.createElement('div');
    el.className = 'fxs fx-' + helper;
    el.style.width = size + 'px'; el.style.height = size + 'px';
    el.innerHTML = F.art(helper, size, 'moving');
    place(el, at, 1);
    layer().appendChild(el);
    var s = { el: el, size: size, at: at, anims: [], timers: [], gone: false };
    live.push(s);
    return s;
  }
  function tf(p, size, dir) { return 'translate(' + (p.x - size / 2).toFixed(1) + 'px,' + (p.y - size / 2).toFixed(1) + 'px) scaleX(' + (dir < 0 ? -1 : 1) + ')'; }
  function place(el, p, dir) { el.style.transform = tf(p, parseFloat(el.style.width), dir); }
  function later(s, ms, fn) { s.timers.push(setTimeout(function () { if (!s.gone) fn(); }, ms)); }
  function remove(s) {
    if (s.gone) return;
    s.gone = true;
    s.timers.forEach(clearTimeout);
    s.anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* already over */ } });
    if (s.el.parentNode) s.el.parentNode.removeChild(s.el);
    live = live.filter(function (x) { return x !== s; });
  }
  F.clear = function () { live.slice().forEach(remove); };

  // Moves a sprite from where it is to `to` along an arc `lift` pixels high, in `ms`. Returns a promise.
  function travel(s, to, ms, lift, ease) {
    var from = s.at, dir = to.x < from.x - 2 ? -1 : 1, mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - (lift || 0) };
    s.at = to; s.dir = dir;
    if (F.reduced() || !s.el.animate) { place(s.el, to, dir); return Promise.resolve(); }
    var a = s.el.animate([{ transform: tf(from, s.size, dir) }, { transform: tf(mid, s.size, dir), offset: 0.5 }, { transform: tf(to, s.size, dir) }],
      { duration: ms, easing: ease || 'ease-in-out', fill: 'forwards' });
    s.anims.push(a);
    return new Promise(function (done) {
      a.onfinish = function () { place(s.el, to, dir); done(); };
      a.oncancel = done;
    });
  }
  function fade(s, ms) {
    if (!s.el.animate) { remove(s); return; }
    var a = s.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms || 250, fill: 'forwards' });
    s.anims.push(a);
    a.onfinish = function () { remove(s); };
  }
  function leave(s, to, ms) { travel(s, to, ms, 30).then(function () { remove(s); }); }
  function pose(s, cls) { var svg = s.el.firstChild; if (svg && svg.setAttribute) svg.setAttribute('class', svg.getAttribute('class').replace(/ (moving|hover|scan|sit)\b/g, '') + ' ' + cls); }

  /* ---------- the five helpers ---------- */
  // The bee flies from the Hint button to a cell and hovers over it until F.dismiss(handle) (the next move).
  F.bee = function (cell, from) {
    var c = centre(cell), size = Math.max(34, Math.min(52, c.w * 1.05)), start = from ? centre(from) : { x: c.x, y: window.innerHeight + 40 };
    var s = make('bee', size, start), over = { x: c.x + c.w * 0.32, y: c.y - c.h * 0.55 };
    if (F.reduced()) { place(s.el, over, 1); pose(s, 'sit'); return s; }
    travel(s, over, 620, 46).then(function () { if (!s.gone) pose(s, 'hover'); });
    return s;
  };
  F.dismiss = function (s) {
    if (!s || s.gone) return;
    if (F.reduced()) { remove(s); return; }
    pose(s, 'moving');
    leave(s, { x: window.innerWidth + 60, y: s.at.y - 120 }, 520);
  };

  // The caterpillar crawls along the bottom of the board while the notes appear.
  F.caterpillar = function (board) {
    var r = board.getBoundingClientRect(), size = 46, y = r.bottom - size * 0.35;
    var s = make('cat', size, { x: r.left - size, y: y });
    if (F.reduced()) { place(s.el, { x: r.left + r.width / 2, y: y }, 1); later(s, 900, function () { fade(s); }); return s; }
    travel(s, { x: r.right + size, y: y }, 1500, 0, 'linear').then(function () { remove(s); });
    return s;
  };

  // The ladybird flies in and walks over (some of) the cells it marks, then flies off.
  F.ladybird = function (board, cells, from) {
    var r = board.getBoundingClientRect(), start = from ? centre(from) : { x: r.left, y: r.bottom + 40 };
    var s = make('lady', 38, start), stops = cells.slice(0, 5).map(centre);
    if (!stops.length) stops = [{ x: r.left + r.width / 2, y: r.top + r.height / 2 }];
    if (F.reduced()) { place(s.el, stops[0], 1); later(s, 900, function () { fade(s); }); return s; }
    var p = travel(s, stops[0], 480, 40);
    stops.slice(1).forEach(function (pt) { p = p.then(function () { return s.gone ? null : travel(s, pt, 230, 6); }); });
    p.then(function () { later(s, 350, function () { leave(s, { x: r.right + 60, y: r.top - 40 }, 500); }); });
    return s;
  };

  // The owl glides down to the top of the board, looks left and right, and flies away.
  F.owl = function (board) {
    var r = board.getBoundingClientRect(), size = 58, perch = { x: r.left + r.width / 2, y: r.top + size * 0.2 };
    var s = make('owl', size, { x: perch.x - 90, y: r.top - 140 });
    if (F.reduced()) { place(s.el, perch, 1); pose(s, 'sit'); later(s, 1200, function () { fade(s); }); return s; }
    travel(s, perch, 520, -20, 'ease-out').then(function () {
      if (s.gone) return;
      pose(s, 'scan');
      later(s, 1300, function () { pose(s, 'moving'); leave(s, { x: perch.x + 110, y: r.top - 150 }, 560); });
    });
    return s;
  };

  // The frog jumps from the Helpers button onto its cell, sits a moment and hops away. Returns the time of landing (ms).
  F.frog = function (cell, from) {
    var c = centre(cell), size = Math.max(36, Math.min(54, c.w * 1.1)), start = from ? centre(from) : { x: c.x, y: window.innerHeight + 30 };
    var s = make('frog', size, start), land = { x: c.x, y: c.y - c.h * 0.1 };
    if (F.reduced()) { place(s.el, land, 1); pose(s, 'sit'); later(s, 900, function () { fade(s); }); return 0; }
    travel(s, land, 520, 90, 'cubic-bezier(.3,.1,.5,1)').then(function () {
      if (s.gone) return;
      pose(s, 'sit');
      if (s.el.animate) s.anims.push(s.el.firstChild.animate([{ transform: 'scale(1.18,.78)' }, { transform: 'scale(.94,1.08)' }, { transform: 'none' }], { duration: 300 }));
      later(s, 700, function () { pose(s, 'moving'); leave(s, { x: (s.dir < 0 ? -60 : window.innerWidth + 60), y: land.y + 40 }, 520); });
    });
    return 520;
  };

  // A helper doing its move inside a box (the shop's preview). kind: 'bee' | 'cat' | 'lady' | 'owl' | 'frog'
  F.demo = function (box, helper, look) {
    box.innerHTML = '<div class="demo-stage demo-' + helper + '">' + F.art(helper, 72, 'moving demo', look) + '</div>';
  };
})();
