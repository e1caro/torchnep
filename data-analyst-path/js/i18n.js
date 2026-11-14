/* Languages: English (the source) and Spanish from Spain.
 *
 * - DA.lang is 'en' or 'es': the saved choice (Settings), or the browser's language the first time.
 * - Content (lessons, questions, cards, labs…) is translated in js/i18n/es-*.js, keyed by id, and applied
 *   to the data at start-up with I.overlay(). Anything without a translation stays in English.
 * - Interface text is translated where it is shown: a MutationObserver looks every new text node and
 *   label up in a dictionary (exact sentences, plus templates such as "Level {0} of {1}"). Code, data
 *   values and anything inside .notranslate / translate="no" are never touched.
 * - Text built by generators uses DA.L('English', 'Español') directly.
 * Changing the language saves it and reloads, so every part of the app starts in the new language. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var I = (DA.i18n = {});
  var KEY = 'data-analyst-path.lang';

  I.LANGS = [['en', 'English'], ['es', 'Español (España)']];
  function saved() { try { var v = window.localStorage && localStorage.getItem(KEY); return v === 'en' || v === 'es' ? v : null; } catch (e) { return null; } }
  function browser() {
    var n = (typeof navigator !== 'undefined' && ((navigator.languages && navigator.languages[0]) || navigator.language)) || 'en';
    return /^es\b/i.test(n) ? 'es' : 'en';
  }
  DA.lang = saved() || browser();
  I.chosen = function () { return saved(); };
  I.setLang = function (lang, reload) {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* private mode: the choice lasts this visit */ }
    if (reload !== false && typeof location !== 'undefined') location.reload();
  };
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.setAttribute('lang', DA.lang === 'es' ? 'es-ES' : 'en');

  // Text written in both languages by the code that makes it.
  DA.L = function (en, es) { return DA.lang === 'es' && es !== undefined && es !== null ? es : en; };

  /* ---------------------------------------------------------------- interface dictionary */

  var dict = Object.create(null), pats = [];
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // add({ 'English': 'Español', 'Step {0} of {1}': 'Paso {0} de {1}' }). {#0} only matches a number ("{#0} rows"),
  // so a short template cannot swallow an ordinary sentence that happens to end with the same word.
  I.add = function (map) {
    Object.keys(map).forEach(function (en) {
      if (/\{#?\d\}/.test(en)) {
        var keys = [], src = '^' + esc(en).replace(/\\\{(#?)(\d)\\\}/g, function (_, num, d) { keys.push(+d); return num ? '([−+-]?\\d[\\d.,]*%?)' : '(.+?)'; }) + '$';
        pats.push({ re: new RegExp(src), keys: keys, out: map[en], len: en.length });
        dict[en.replace(/\{#(\d)\}/g, '{$1}')] = map[en]; // so DA.t('Step {0} of {1}', [a, b]) finds it directly
      } else dict[en] = map[en];
    });
    pats.sort(function (a, b) { return b.len - a.len; }); // the most specific template first
  };
  // The Spanish for an English interface string, or null.
  I.tr = function (s, depth) {
    if (DA.lang !== 'es' || !s) return null;
    var v = dict[s];
    if (v !== undefined) return v;
    if ((depth || 0) > 2) return null;
    for (var i = 0; i < pats.length; i++) {
      var m = pats[i].re.exec(s);
      if (!m) continue;
      var p = pats[i];
      return p.out.replace(/\{(\d)\}/g, function (_, d) {
        var part = m[p.keys.indexOf(+d) + 1];
        if (part === undefined) return '';
        var t = I.tr(part, (depth || 0) + 1);
        return t !== null ? t : part;
      });
    }
    return null;
  };
  // Translate a string the code builds itself (titles, dialogs, shared text): DA.t('Saved') or DA.t('{0} of {1}', [a, b]).
  DA.t = function (s, vars) {
    var out = I.tr(s);
    if (out === null) out = s;
    if (vars) out = out.replace(/\{(\d)\}/g, function (_, d) { return vars[+d] !== undefined ? vars[+d] : ''; });
    return out;
  };
  // Remember an English → Spanish pair taken from translated content (a chapter or world title, say), so that
  // interface text the code builds around it ("World 2: {title}") translates too.
  I.learn = function (en, es) {
    if (typeof en === 'string' && typeof es === 'string' && en !== es && en.length < 160 && dict[en] === undefined) dict[en] = es;
  };
  I.size = function () { return { exact: Object.keys(dict).length, templates: pats.length }; };

  /* ---------------------------------------------------------------- content overlays */

  // Spanish content files register a function here; it runs once, when everything has loaded and before the first
  // screen is drawn (so data defined anywhere can be translated in place).
  var queue = [], applied = false;
  I.content = function (fn) { queue.push(fn); };
  I.applyContent = function () {
    if (applied || DA.lang !== 'es') return;
    applied = true;
    queue.forEach(function (fn) { fn(I); });
  };

  // Copy the Spanish fields of `tr[id]` onto the object with that id. `pick(obj)` gives the id.
  I.overlay = function (items, tr, pick) {
    if (DA.lang !== 'es' || !items || !tr) return 0;
    var n = 0;
    (Array.isArray(items) ? items : Object.keys(items).map(function (k) { return items[k]; })).forEach(function (o) {
      var id = pick ? pick(o) : o.id, t = tr[id];
      if (!t) return;
      Object.keys(t).forEach(function (k) { I.learn(o[k], t[k]); o[k] = t[k]; });
      n++;
    });
    return n;
  };

  /* ---------------------------------------------------------------- live translation of the page */

  var SKIP = 'code, pre, textarea, script, style, .notranslate, [translate="no"], .tile, .tray, .bank, .result-table tbody, .xr-grid tbody, .pm-name, .pp-table, .sql-editor, .cm-editor';
  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];
  function skip(el) { return !el || (el.closest && el.closest(SKIP)); }
  function textNode(n) {
    var raw = n.nodeValue;
    if (!raw || !/[A-Za-z]/.test(raw)) return;
    var t = raw.trim(), out = I.tr(t);
    if (out !== null && out !== t) n.nodeValue = raw.replace(t, out);
  }
  function element(el) {
    if (skip(el)) return;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a);
      if (!v || !/[A-Za-z]/.test(v)) return;
      var out = I.tr(v.trim());
      if (out !== null && out !== v) el.setAttribute(a, out);
    });
  }
  I.translateTree = function (root) {
    if (DA.lang !== 'es' || !root) return;
    if (root.nodeType === 3) { if (!skip(root.parentElement)) textNode(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    element(root);
    var w = document.createTreeWalker(root, 5 /* elements and text */, null), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) { if (!skip(n)) element(n); }
      else if (!skip(n.parentElement)) textNode(n);
    }
  };
  I.start = function () {
    I.applyContent();
    if (DA.lang !== 'es' || typeof MutationObserver === 'undefined' || !document.body) return;
    I.translateTree(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(function (n) { I.translateTree(n); });
        else if (m.type === 'characterData') { if (!skip(m.target.parentElement)) textNode(m.target); }
        else if (m.type === 'attributes' && ATTRS.indexOf(m.attributeName) >= 0) element(m.target);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // Dialogs and the tab title are not part of the page.
    var conf = window.confirm, al = window.alert;
    window.confirm = function (msg) { return conf.call(window, DA.t(String(msg))); };
    window.alert = function (msg) { return al.call(window, DA.t(String(msg))); };
  };
})();
