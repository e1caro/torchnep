/* Shared UI helpers: DOM builder, saved state, personalisation, prompt cards, toasts.
 * Everything that comes from the learner (custom background, notes, pasted blanks) is inserted
 * with textContent, never innerHTML. innerHTML is used only for the authored lesson content.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = (DA.ui = {});

  DA.languages = [
    ['English', 'English'], ['Spanish', 'Español'], ['French', 'Français'], ['German', 'Deutsch'],
    ['Portuguese', 'Português'], ['Italian', 'Italiano'], ['Dutch', 'Nederlands'], ['Polish', 'Polski'],
    ['Turkish', 'Türkçe'], ['Hindi', 'हिन्दी'], ['Arabic', 'العربية'], ['Chinese', '中文'],
  ];

  /* ---------- DOM ---------- */

  function append(node, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(node, x); });
    else if (c.nodeType) node.appendChild(c);
    else node.appendChild(document.createTextNode(String(c)));
  }

  // h('div', {class: 'x', onclick: fn}, child, [children], 'text')
  ui.h = function (tag, props) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v; // authored content only
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  };
  ui.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); return node; };
  var h = ui.h;

  /* ---------- toast, clipboard, download ---------- */

  var toastTimer;
  ui.toast = function (msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };

  ui.copy = function (text, okMsg) {
    function done() { ui.toast(okMsg || 'Copied to clipboard'); }
    function fallback() {
      var ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { ui.toast('Could not copy. Select the text and copy it manually.'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  };

  ui.download = function (filename, text, mime) {
    var url = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  /* ---------- saved state ---------- */

  var KEY = 'data-analyst-path.v1';

  function fresh() {
    return { v: 1, profile: { bg: '', custom: '', lang: 'English', hours: 8, goal: '' }, done: {}, quiz: {}, notes: {}, sql: {} };
  }

  // Never trust stored or imported data: copy only the fields we know, with type checks.
  ui.sanitize = function (src) {
    var s = fresh();
    if (!src || typeof src !== 'object') return s;
    var p = src.profile && typeof src.profile === 'object' ? src.profile : {};
    if (typeof p.bg === 'string' && DA.backgrounds.some(function (b) { return b.id === p.bg; })) s.profile.bg = p.bg;
    if (typeof p.custom === 'string') s.profile.custom = p.custom.slice(0, 500);
    if (typeof p.lang === 'string' && DA.languages.some(function (l) { return l[0] === p.lang; })) s.profile.lang = p.lang;
    var hrs = Math.round(Number(p.hours));
    if (hrs >= 1 && hrs <= 40) s.profile.hours = hrs;
    if (typeof p.goal === 'string') s.profile.goal = p.goal.slice(0, 200);
    if (src.done && typeof src.done === 'object') {
      Object.keys(src.done).forEach(function (id) { if (src.done[id] === true && DA.lessonById[id]) s.done[id] = true; });
    }
    if (src.sql && typeof src.sql === 'object') {
      Object.keys(src.sql).forEach(function (id) {
        if (src.sql[id] === true && DA.challenges.some(function (c) { return c.id === id; })) s.sql[id] = true;
      });
    }
    if (src.quiz && typeof src.quiz === 'object') {
      Object.keys(src.quiz).forEach(function (id) {
        var l = DA.lessonById[id], q = src.quiz[id];
        if (l && q && Number.isInteger(q.sel) && q.sel >= 0 && q.sel < l.quiz.options.length) s.quiz[id] = { sel: q.sel, ok: q.sel === l.quiz.answer };
      });
    }
    if (src.notes && typeof src.notes === 'object') {
      Object.keys(src.notes).forEach(function (id) {
        if (DA.lessonById[id] && typeof src.notes[id] === 'string' && src.notes[id]) s.notes[id] = src.notes[id].slice(0, 5000);
      });
    }
    return s;
  };

  var storageOk = true;
  function load() {
    try { return ui.sanitize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return fresh(); }
  }
  ui.state = load();
  ui.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(ui.state)); storageOk = true; } catch (e) {
      if (storageOk) ui.toast('Your browser blocks saving, so progress will be lost when you close this tab. Use Profile → Export.');
      storageOk = false;
    }
  };
  ui.replaceState = function (next) { ui.state = ui.sanitize(next); ui.save(); };
  ui.reset = function () { ui.state = fresh(); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  /* ---------- progress ---------- */

  ui.doneCount = function () { return DA.lessons.filter(function (l) { return ui.state.done[l.id]; }).length; };
  ui.doneHours = function () { return DA.lessons.reduce(function (s, l) { return s + (ui.state.done[l.id] ? l.hours : 0); }, 0); };
  ui.nextLesson = function () {
    for (var i = 0; i < DA.lessons.length; i++) if (!ui.state.done[DA.lessons[i].id]) return DA.lessons[i];
    return null;
  };
  ui.moduleDone = function (m) { return m.lessons.filter(function (l) { return ui.state.done[l.id]; }).length; };
  ui.fmtHours = function (x) { return (Math.round(x * 10) / 10) + ' h'; };

  ui.progressBar = function (pct, label) {
    return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)), 'aria-label': label || 'Progress' },
      h('span', { style: 'width:' + Math.max(0, Math.min(100, pct)) + '%' }));
  };

  /* ---------- personalisation ---------- */

  ui.bg = function () {
    var id = ui.state.profile.bg;
    for (var i = 0; i < DA.backgrounds.length; i++) if (DA.backgrounds[i].id === id) return DA.backgrounds[i];
    return null;
  };
  ui.bgText = function () {
    var b = ui.bg();
    if (!b) return 'a career changer (background not specified)';
    if (b.custom) return ui.state.profile.custom.trim() || 'a career changer with a non-technical background';
    return b.persona;
  };
  ui.langLine = function () {
    var l = ui.state.profile.lang;
    return l && l !== 'English' ? 'Please write your answer in ' + l + '.' : '';
  };
  // The dataset that fits the learner's background (used by lessons that open the SQL Lab).
  ui.defaultDataset = function () { var b = ui.bg(); return b ? b.dataset : 'retail'; };

  ui.fillText = function (text) {
    var line = ui.langLine();
    return text
      .replace(/\{\{bg\}\}/g, function () { return ui.bgText(); })
      .replace(/\n?\{\{lang\}\}/g, function () { return line ? '\n' + line : ''; })
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/, '');
  };

  /* ---------- prompt card ---------- */

  var CHAT_LINKS = [
    { name: 'ChatGPT', base: 'https://chatgpt.com/?q=' },
    { name: 'Claude', base: 'https://claude.ai/new?q=' },
  ];

  // p = {title, text}. `text` may contain {{bg}}, {{lang}} and [[blanks]].
  // opts.prefilled = true skips personalisation (the text is already final).
  ui.promptCard = function (p, opts) {
    opts = opts || {};
    var raw = opts.prefilled ? p.text : ui.fillText(p.text);
    var blanks = [];
    raw.replace(/\[\[(.+?)\]\]/g, function (m, t) { if (blanks.indexOf(t) < 0) blanks.push(t); return m; });
    var values = {};
    var pre = h('pre', { class: 'prompt-text', tabindex: '0' });
    var links = [];

    function current() {
      return raw.replace(/\[\[(.+?)\]\]/g, function (m, t) { return values[t] ? values[t] : '[' + t + ']'; });
    }
    function paint() {
      ui.clear(pre);
      raw.split(/(\[\[.+?\]\])/).forEach(function (part) {
        var m = part.match(/^\[\[(.+)\]\]$/);
        if (!m) { pre.appendChild(document.createTextNode(part)); return; }
        var t = m[1];
        pre.appendChild(h('mark', { class: values[t] ? 'filled' : 'blank', text: values[t] ? values[t] : '[' + t + ']' }));
      });
      var text = current();
      links.forEach(function (l) {
        var url = l.base + encodeURIComponent(text);
        l.tooLong = url.length > 6000;
        l.a.href = l.tooLong ? l.base.split('?')[0] : url;
      });
    }

    var fields = blanks.length
      ? h('div', { class: 'fillins' },
          h('p', { class: 'muted small', text: 'Fill in the highlighted blanks (optional: you can also edit after pasting):' }),
          blanks.map(function (t, i) {
            var long = /PASTE|ROWS|ADS|COMMENTS|CODE|QUERY|SCHEMA|TEXT|SLIDES|README|LOG|OUTPUT|BULLETS|SUMMARY|EXPLANATION|NUMBERS|DESCRIBE/.test(t);
            var input = h(long ? 'textarea' : 'input', {
              class: 'fillin', placeholder: t, rows: long ? '3' : null, type: long ? null : 'text',
              'aria-label': t, id: 'fi-' + Math.random().toString(36).slice(2, 8) + i,
              oninput: function (e) { values[t] = e.target.value.trim(); paint(); },
            });
            return h('label', { class: 'fillin-row' }, h('span', { text: t }), input);
          }))
      : null;

    var actions = h('div', { class: 'prompt-actions' },
      h('button', { class: 'btn small', type: 'button', onclick: function () { ui.copy(current(), 'Prompt copied. Paste it into your AI chat.'); } }, 'Copy prompt'),
      CHAT_LINKS.map(function (c) {
        var a = h('a', {
          class: 'btn small ghost', href: c.base, target: '_blank', rel: 'noopener noreferrer',
          onclick: function () {
            var l = links.filter(function (x) { return x.a === a; })[0];
            ui.copy(current(), l && l.tooLong ? 'Prompt copied. Paste it into the chat (too long to prefill).' : 'Prompt copied (also sent as a draft if the site supports it).');
          },
        }, 'Open in ' + c.name);
        links.push({ a: a, base: c.base, tooLong: false });
        return a;
      }));

    var card = h('div', { class: 'prompt-card' },
      p.title ? h('div', { class: 'prompt-title', text: p.title }) : null,
      fields, pre, actions);
    paint();
    return card;
  };

  /* ---------- small shared pieces ---------- */

  ui.codeBlock = function (c) {
    return h('figure', { class: 'code' },
      h('figcaption', null, h('span', { text: c.title || c.lang }), h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { ui.copy(c.text, 'Code copied'); } }, 'Copy')),
      h('pre', null, h('code', { text: c.text })));
  };

  ui.callout = function (kind, title, body) {
    return h('div', { class: 'callout ' + kind }, title ? h('strong', { text: title }) : null, body);
  };
})();
