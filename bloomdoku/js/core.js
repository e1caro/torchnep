/* Bloomdoku core: DOM helper, saved state (one versioned localStorage key, sanitized on load), languages, toasts and sheets. */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var KEY = 'bloomdoku.v1';

  /* ---------- languages ---------- */
  BD.i18n = BD.i18n || { es: {} };
  // t(sentence, a, b): the sentence in the current language, with {0} and {1} replaced by a and b.
  BD.t = function (s) {
    var out = (BD.state && BD.state.lang === 'es' && BD.i18n.es[s]) || s;
    for (var i = 1; i < arguments.length; i++) out = out.split('{' + (i - 1) + '}').join(arguments[i]);
    return out;
  };
  var t = BD.t;

  /* ---------- DOM ---------- */
  // h('button.btn', { onclick: f, html: '<b>x</b>' }, child, 'text', [more])
  BD.h = function (tag, attrs) {
    var parts = tag.split('.'), el = document.createElement(parts[0] || 'div'), i;
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    var start = 1;
    if (attrs && typeof attrs === 'object' && !attrs.nodeType && !Array.isArray(attrs)) {
      start = 2;
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { el.style.setProperty(p, v[p]); });
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    }
    for (i = start; i < arguments.length; i++) add(arguments[i]);
    return el;
  };
  var h = BD.h;
  BD.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  BD.stars = function (n, max) {
    var s = '';
    for (var i = 0; i < (max || 3); i++) s += i < n ? '★' : '☆';
    return s;
  };

  /* ---------- saved state ---------- */
  function fresh() {
    return {
      v: 1, lang: null, skin: 'numbers', theme: 'auto',
      set: { wilt: true, sound: true, haptic: true, sundial: false, tidy: true, badge: false },
      levels: {}, daily: {}, games: {}, seen: {}, invites: {}, avatar: 0,
      own: {}, bought: {}, used: {}, wear: {},   // the shop: js/shop.js
    };
  }
  function obj(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  // Anything can come back from storage (an old version, a half-written value): keep what is valid, default the rest.
  BD.sanitize = function (raw) {
    var s = fresh(), r = obj(raw), k;
    if (r.lang === 'en' || r.lang === 'es') s.lang = r.lang;
    if (typeof r.skin === 'string' && /^[a-z]{3,12}$/.test(r.skin)) s.skin = r.skin; // shown only if owned (BD.skin)
    if (['auto', 'day', 'night'].indexOf(r.theme) >= 0) s.theme = r.theme;
    for (k in s.set) if (typeof obj(r.set)[k] === 'boolean') s.set[k] = r.set[k];
    Object.keys(obj(r.levels)).forEach(function (key) {
      var v = obj(r.levels[key]);
      if (!/^\d+-\d+$/.test(key)) return;
      s.levels[key] = { stars: Math.max(0, Math.min(3, v.stars | 0)), g: typeof v.g === 'string' && /^[0-3]{0,100}$/.test(v.g) ? v.g : '', extra: Math.max(0, v.extra | 0), at: Math.max(0, v.at | 0) };
    });
    Object.keys(obj(r.daily)).forEach(function (day) {
      var v = obj(r.daily[day]);
      if (!/^\d{4}-\d\d-\d\d$/.test(day)) return;
      s.daily[day] = { stars: Math.max(1, Math.min(3, v.stars | 0)), slips: Math.max(0, v.slips | 0), bees: Math.max(0, v.bees | 0), frog: !!v.frog, owl: !!v.owl, time: Math.max(0, v.time | 0) };
    });
    Object.keys(obj(r.games)).forEach(function (key) {
      var g = obj(r.games[key]), pz = obj(g.pz), N = pz.n * pz.n;
      var M = pz.twin ? 2 * N : N; // a twin garden has two figures in every cell
      var ok = pz.n >= 4 && pz.n <= 9 && Array.isArray(pz.regions) && pz.regions.length === N && [pz.givens, pz.solution, g.vals, g.notes].every(function (a) { return Array.isArray(a) && a.length === M; });
      if (ok) s.games[key] = g;
    });
    Object.keys(obj(r.seen)).forEach(function (key) { if (r.seen[key]) s.seen[key] = 1; });
    Object.keys(obj(r.invites)).forEach(function (key) { if (r.invites[key] && /^\d+-\d+$/.test(key)) s.invites[key] = 1; });
    if (r.avatar >= 1 && r.avatar <= 9) s.avatar = r.avatar | 0;
    Object.keys(obj(r.own)).forEach(function (id) { if (r.own[id] && /^[a-z]+(-[a-z]+){1,2}$/.test(id)) s.own[id] = Math.max(1, Math.min(9999, +r.own[id] | 0)); });
    ['bought', 'used'].forEach(function (f) { Object.keys(obj(r[f])).forEach(function (id) { if (/^[a-z]+$/.test(id) && r[f][id] > 0) s[f][id] = Math.min(1e6, r[f][id] | 0); }); });
    Object.keys(obj(r.wear)).forEach(function (k) { if (/^(h-)?[a-z]{2,10}$/.test(k) && typeof r.wear[k] === 'string' && /^[a-z]{2,12}$/.test(r.wear[k])) s.wear[k] = r.wear[k]; });
    return s;
  };
  BD.load = function () {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* unreadable: start fresh */ }
    BD.state = BD.sanitize(raw);
    if (!BD.state.lang) BD.state.lang = /^es/i.test(navigator.language || '') ? 'es' : 'en';
    return BD.state;
  };
  BD.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(BD.state)); } catch (e) { /* storage full or blocked: keep playing */ }
    if (BD.cloud) BD.cloud.touch(); // with an account, a change of progress syncs a little later
  };
  // What grows in the cells now: the chosen skin if it is owned (js/shop.js), else numbers.
  BD.skin = function () { return BD.shop ? BD.shop.wearing(BD.state, 'skin') : BD.state.skin; };
  BD.reset = function () {
    var keep = { lang: BD.state.lang, skin: BD.state.skin, theme: BD.state.theme, set: BD.state.set, avatar: BD.state.avatar };
    BD.state = BD.sanitize(keep);
    BD.save();
  };

  BD.applyTheme = function () {
    var th = BD.state.theme, root = document.documentElement;
    if (th === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', th);
    root.setAttribute('lang', BD.state.lang);
    var garden = BD.shop ? BD.shop.wearing(BD.state, 'theme') : 'meadow', frame = BD.shop ? BD.shop.wearing(BD.state, 'frame') : 'classic';
    if (garden === 'meadow') root.removeAttribute('data-garden'); else root.setAttribute('data-garden', garden);
    if (frame === 'classic') root.removeAttribute('data-frame'); else root.setAttribute('data-frame', frame);
    root.setAttribute('data-air', (BD.shop && BD.shop.find('theme', garden).air) || '');
    var dark = th === 'night' || (th === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#1B1836' : (BD.shop && BD.shop.find('theme', garden).colors[0]) || '#DFF3EA');
  };

  /* ---------- toast and sheets ---------- */
  var toastTimer = null;
  BD.toast = function (text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  };

  // A bottom sheet. BD.sheet(node, { onclose }) -> close()
  BD.sheet = function (content, opts) {
    opts = opts || {};
    var host = document.getElementById('sheets');
    var back = h('div.sheet-back', { onclick: function (e) { if (e.target === back && !opts.modal) close(); } });
    var box = h('div.sheet', { role: 'dialog', 'aria-modal': 'true' }, opts.modal ? null : h('button.sheet-x', { type: 'button', 'aria-label': t('Close'), onclick: function () { close(); } }, '✕'), content);
    back.appendChild(box);
    host.appendChild(back);
    requestAnimationFrame(function () { back.classList.add('show'); });
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      back.classList.remove('show');
      setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 220);
      if (opts.onclose) opts.onclose();
    }
    return close;
  };
  BD.closeSheets = function () { BD.clear(document.getElementById('sheets')); };

  BD.confirm = function (title, body, yes, onyes) {
    var close = BD.sheet(h('div.confirm',
      h('h2', { text: title }), body ? h('p.muted', { text: body }) : null,
      h('div.row',
        h('button.btn.ghost', { type: 'button', onclick: function () { close(); } }, t('Cancel')),
        h('button.btn.primary', { type: 'button', onclick: function () { close(); onyes(); } }, yes))));
  };
})();
