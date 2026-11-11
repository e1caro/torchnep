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
    if (typeof document === 'undefined') return;
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };

  // Inside the Android app (see android-analyst/) a small native bridge is present: copy, share and save go through it,
  // because a WebView has no reliable clipboard, share sheet or blob downloads. On the web this is null.
  ui.native = function () { return typeof window !== 'undefined' && window.AnalystNative ? window.AnalystNative : null; };

  ui.copy = function (text, okMsg) {
    function done() { ui.toast(okMsg || 'Copied to clipboard'); }
    var nat = ui.native();
    if (nat && nat.copy) { try { nat.copy(text); done(); return; } catch (e) { /* fall through to the web way */ } }
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
    var nat = ui.native();
    if (nat && nat.saveFile) { try { nat.saveFile(filename, mime || 'text/plain;charset=utf-8', text); return; } catch (e) { /* fall through to the web way */ } }
    var url = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
    var a = h('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  /* ---------- dates (local time) ---------- */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  ui.now = function () { return new Date(); }; // overridable in tests
  ui.dateStr = function (d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  ui.today = function () { return ui.dateStr(ui.now()); };
  ui.addDays = function (s, n) { var p = s.split('-'); return ui.dateStr(new Date(+p[0], +p[1] - 1, +p[2] + n)); };
  // Whole calendar days from a to b (b - a), unaffected by daylight-saving changes.
  ui.diffDays = function (a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 86400000);
  };
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  /* XP values. Every award has a unique key, so repeating an activity never pays twice. */
  ui.XP = {
    lesson: function (l) { return Math.min(100, Math.round(20 + 10 * l.hours)); },
    quiz: 10,
    note: 5,
    sql: function (level) { return 15 * level; },
    goalBonus: 10,
    card: 2,         // reading (collecting) a feed card, once per card
    cardRight: 2,    // extra for getting a myth-or-fact card right
    feedQuiz: 5,     // a review question answered correctly in the feed (once per question per day)
    feedFive: 10,    // reading five new cards in a day
    block: 6,        // solving a SQL blocks puzzle for the first time
    module: 25,      // finishing every lesson of a module
    gameCap: 20,     // most XP a mini-game can pay per day (they are endless)
  };

  /* ---------- saved state ---------- */

  var KEY = 'data-analyst-path.v1'; // storage key (kept from the first release; the state has its own version)
  var GOALS = [20, 40, 80];

  function fresh() {
    return {
      v: 2,
      profile: { bg: '', custom: '', lang: 'English', hours: 8, goal: '', dailyGoal: 40, theme: 'auto', sound: false, haptics: true, remind: false, remindAt: '19:00' },
      done: {}, quiz: {}, notes: {}, sql: {},
      xp: {},      // award key -> {d: 'YYYY-MM-DD' ('' for carried-over XP), n}. A ledger, so two devices can be merged.
      met: {},     // date -> true when that day's XP goal was reached (streaks are derived from this)
      quests: {},  // date -> {lesson, drill, sql: true, chest: bonus XP}
      srs: {},     // question id -> {box 1..5, due date, t: ms of last review}
      badges: {},  // badge id -> date earned
      stats: { drills: 0, perfect: 0, answers: 0, correct: 0, queries: 0, bestCombo: 0, questsAll: 0, corrBest: 0, corrGames: 0, blockRounds: 0 },
      seen: {},    // one-time hints
      cards: {},   // feed card id -> date it was first read ("collected")
      saved: {},   // feed card id -> true (bookmarked)
      blocks: {},  // SQL blocks puzzle id -> true (solved)
      repaired: {},// date -> true: a missed day bridged by a streak repair
      boost: 0,    // time (ms) until which XP is doubled
    };
  }

  function eachKey(o, fn, max) {
    if (!o || typeof o !== 'object') return;
    Object.keys(o).slice(0, max || 5000).forEach(function (k) { if (/^[\w:.\-]{1,60}$/.test(k)) fn(k, o[k]); });
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
    if (GOALS.indexOf(Number(p.dailyGoal)) >= 0) s.profile.dailyGoal = Number(p.dailyGoal);
    if (p.theme === 'light' || p.theme === 'dark' || p.theme === 'auto') s.profile.theme = p.theme;
    if (typeof p.sound === 'boolean') s.profile.sound = p.sound;
    if (typeof p.haptics === 'boolean') s.profile.haptics = p.haptics;
    if (typeof p.remind === 'boolean') s.profile.remind = p.remind;
    if (typeof p.remindAt === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.remindAt)) s.profile.remindAt = p.remindAt;

    eachKey(src.done, function (id, v) { if (v === true && DA.lessonById[id]) s.done[id] = true; });
    eachKey(src.sql, function (id, v) { if (v === true && DA.challenges.some(function (c) { return c.id === id; })) s.sql[id] = true; });
    eachKey(src.quiz, function (id, q) {
      var l = DA.lessonById[id];
      if (l && q && Number.isInteger(q.sel) && q.sel >= 0 && q.sel < l.quiz.options.length) s.quiz[id] = { sel: q.sel, ok: q.sel === l.quiz.answer };
    });
    eachKey(src.notes, function (id, t) { if (DA.lessonById[id] && typeof t === 'string' && t) s.notes[id] = t.slice(0, 5000); });

    eachKey(src.xp, function (k, e) {
      if (e && (e.d === '' || isDate(e.d)) && Number.isInteger(e.n) && e.n >= 0 && e.n <= 1000) s.xp[k] = { d: e.d, n: e.n };
    });
    eachKey(src.met, function (d, v) { if (isDate(d) && v === true) s.met[d] = true; });
    eachKey(src.quests, function (d, q) {
      if (!isDate(d) || !q || typeof q !== 'object') return;
      var o = {};
      ['lesson', 'drill', 'sql'].forEach(function (n) { if (q[n] === true) o[n] = true; });
      if (Number.isInteger(q.chest) && q.chest > 0 && q.chest <= 200) o.chest = q.chest;
      s.quests[d] = o;
    }, 800);
    eachKey(src.srs, function (id, r) {
      if (r && Number.isInteger(r.box) && r.box >= 1 && r.box <= 5 && isDate(r.due)) s.srs[id] = { box: r.box, due: r.due, t: Number(r.t) > 0 ? Math.floor(Number(r.t)) : 0 };
    }, 2000);
    eachKey(src.badges, function (id, d) { if (isDate(d)) s.badges[id] = d; }, 200);
    var st = src.stats && typeof src.stats === 'object' ? src.stats : {};
    Object.keys(s.stats).forEach(function (k) { var n = Math.floor(Number(st[k])); if (n > 0 && n < 1e7) s.stats[k] = n; });
    eachKey(src.seen, function (k, v) { if (v === true) s.seen[k] = true; }, 100);
    eachKey(src.cards, function (id, d) { if (isDate(d) && (!DA.feedById || DA.feedById[id])) s.cards[id] = d; }, 1000);
    eachKey(src.saved, function (id, v) { if (v === true && (!DA.feedById || DA.feedById[id])) s.saved[id] = true; }, 1000);
    eachKey(src.blocks, function (id, v) { if (v === true && (!DA.puzzleById || DA.puzzleById[id])) s.blocks[id] = true; }, 500);
    eachKey(src.repaired, function (d, v) { if (isDate(d) && v === true) s.repaired[d] = true; }, 800);
    var boost = Math.floor(Number(src.boost));
    if (boost > 0 && boost < 1e14) s.boost = boost;

    // Progress saved by the first release had no XP: carry it over so nothing is lost.
    if (!(src.v >= 2)) {
      Object.keys(s.done).forEach(function (id) { s.xp['lesson:' + id] = { d: '', n: ui.XP.lesson(DA.lessonById[id]) }; });
      Object.keys(s.quiz).forEach(function (id) { if (s.quiz[id].ok) s.xp['quiz:' + id] = { d: '', n: ui.XP.quiz }; });
      DA.challenges.forEach(function (c) { if (s.sql[c.id]) s.xp['sql:' + c.id] = { d: '', n: ui.XP.sql(c.level) }; });
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
      if (storageOk && ui.toast) ui.toast('Your browser blocks saving, so progress will be lost when you close this tab. Use You → Move progress.');
      storageOk = false;
    }
  };
  ui.replaceState = function (next) { ui.state = ui.sanitize(next); ui.save(); };
  ui.reset = function () { ui.state = fresh(); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  // Light or dark theme, applied to <html> (the choice is also read by a tiny script in index.html before first paint).
  ui.applyTheme = function () {
    var t = ui.state.profile.theme, root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#0d1320' : '#2158d6');
  };

  // Deterministic shuffle (same seed, same order): used so a lesson quiz always shows its options in the same order.
  ui.seededShuffle = function (arr, seed) {
    var x = 2166136261, i;
    for (i = 0; i < seed.length; i++) { x ^= seed.charCodeAt(i); x = Math.imul(x, 16777619); }
    function rnd() { x = (x + 0x6d2b79f5) | 0; var t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    var a = arr.slice(), j, tmp;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  };

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
