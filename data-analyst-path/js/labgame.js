/* Shared progression for DotSheets, DotPython and DotBI: worlds, levels, challenges, stars, unlocks, map and task card. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  var L = (DA.labgame = {});

  L.names = { sql: 'SQLab', sheets: 'DotSheets', python: 'DotPython', bi: 'DotBI' };
  L.labs = {};
  L.NEED = 2 / 3;

  L.register = function (lab) {
    var levels = [], byId = {};
    lab.worlds.forEach(function (w, wi) {
      w.n = wi + 1;
      w.levels.forEach(function (lv, li) {
        lv.world = w; lv.n = li + 1; lv.index = levels.length; lv.key = w.n + '-' + lv.n;
        lv.challenges.forEach(function (c, ci) { c.level = lv; c.n = ci + 1; c.lab = lab.id; byId[c.id] = c; });
        levels.push(lv);
      });
    });
    lab.levels = levels;
    lab.byId = byId;
    lab.name = L.names[lab.id] || lab.name;
    L.labs[lab.id] = lab;
    return lab;
  };
  var SOURCES = {
    sheets: function () { DA.labSheets.worlds.forEach(function (w) { w.levels.forEach(function (lv) { lv.challenges = lv.challenges.filter(Boolean); }); }); return DA.labSheets; },
    python: function () { return DA.labPython; },
    bi: function () { return DA.labBI; },
    sql: function () { return DA.buildSqlLab(); },
  };
  L.get = function (id) { return L.labs[id] || (SOURCES[id] ? L.register(SOURCES[id]()) : null); };
  L.WORLD_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0d9488', '#db2777', '#ca8a04', '#4f46e5'];
  L.worldColor = function (w) { return L.WORLD_COLORS[(w.n - 1) % L.WORLD_COLORS.length]; };
  // Collectibles: one stamp per completed world, derived from stars (nothing extra is stored).
  L.stamps = function (s) {
    var out = [];
    ['sql', 'sheets', 'python', 'bi'].forEach(function (id) {
      var lab = L.get(id);
      if (!lab) return;
      lab.worlds.forEach(function (w) { out.push({ lab: lab, world: w, done: L.worldState(lab, w, s).complete }); });
    });
    return out;
  };
  L.level = function (labId, key) {
    var lab = L.get(labId);
    return lab ? lab.levels.filter(function (lv) { return lv.key === key; })[0] || null : null;
  };
  L.embed = null;
  L.embedded = function (c) { return !!(L.embed && c && L.embed.ids[c.lab + ':' + c.id]); };

  function store(labId) {
    ui.state.labs = ui.state.labs || {};
    ui.state.labs[labId] = ui.state.labs[labId] || {};
    return ui.state.labs[labId];
  }

  L.stars = function (labId, id, s) {
    var st = s || ui.state;
    var v = st.labs && st.labs[labId] && st.labs[labId][id];
    if (v) return v;
    if (labId === 'sheets' && st.sheets && st.sheets[id]) return 1;
    if (labId === 'sql' && st.sql && st.sql[id]) return 1;
    return 0;
  };

  L.href = function (lab, c) {
    if (L.embedded(c)) return L.embed.href(c);
    return lab.playHref ? lab.playHref(c) : '#/' + lab.route + '/play/' + c.id;
  };

  L.need = function (lv) { return Math.ceil(lv.challenges.length * L.NEED); };

  L.levelState = function (lab, lv, s) {
    var solved = 0, stars = 0;
    lv.challenges.forEach(function (c) { var k = L.stars(lab.id, c.id, s); if (k) solved++; stars += k; });
    var prev = lab.levels[lv.index - 1];
    var unlocked = !prev || solved > 0 || L.levelState(lab, prev, s).passed;
    return { solved: solved, total: lv.challenges.length, stars: stars, max: lv.challenges.length * 3, passed: solved >= L.need(lv), complete: solved === lv.challenges.length, unlocked: unlocked };
  };

  L.worldState = function (lab, w, s) {
    var st = w.levels.map(function (lv) { return L.levelState(lab, lv, s); });
    return {
      unlocked: st[0].unlocked,
      complete: st.every(function (x) { return x.complete; }),
      solved: st.reduce(function (a, x) { return a + x.solved; }, 0),
      total: st.reduce(function (a, x) { return a + x.total; }, 0),
      stars: st.reduce(function (a, x) { return a + x.stars; }, 0),
      levels: st,
    };
  };

  L.totals = function (lab, s) {
    var t = { solved: 0, total: 0, stars: 0, max: 0 };
    lab.levels.forEach(function (lv) { var x = L.levelState(lab, lv, s); t.solved += x.solved; t.total += x.total; t.stars += x.stars; t.max += x.max; });
    return t;
  };

  L.isUnlocked = function (lab, c) { return L.embedded(c) || L.levelState(lab, c.level).unlocked; };

  L.current = function (lab) {
    for (var i = 0; i < lab.levels.length; i++) {
      var lv = lab.levels[i], st = L.levelState(lab, lv);
      if (!st.unlocked) break;
      for (var j = 0; j < lv.challenges.length; j++) if (!L.stars(lab.id, lv.challenges[j].id)) return lv.challenges[j];
    }
    return lab.levels[0].challenges[0];
  };

  L.next = function (lab, c) {
    var lv = c.level, i = lv.challenges.indexOf(c);
    if (i + 1 < lv.challenges.length) return lv.challenges[i + 1];
    var nl = lab.levels[lv.index + 1];
    return nl && L.levelState(lab, nl).unlocked ? nl.challenges[0] : null;
  };

  L.starsFor = function (hinted, tries) { return 1 + (hinted ? 0 : 1) + (tries <= 1 ? 1 : 0); };

  L.record = function (lab, c, opts) {
    var stars = L.starsFor(opts.hinted, opts.tries);
    var st = store(lab.id), before = L.stars(lab.id, c.id);
    var wasPassed = L.levelState(lab, c.level).passed, wasDone = L.worldState(lab, c.level.world).complete;
    if (stars > (st[c.id] || 0)) st[c.id] = stars;
    if (lab.id === 'sheets') { ui.state.sheets = ui.state.sheets || {}; ui.state.sheets[c.id] = true; }
    if (lab.id === 'sql') { ui.state.sql = ui.state.sql || {}; ui.state.sql[c.id] = true; }
    ui.save();
    var xp = DA.game.award(lab.xpKey(c), lab.xp(c), lab.name + ' solved');
    var nl = lab.levels[c.level.index + 1];
    var unlockedNow = !wasPassed && L.levelState(lab, c.level).passed && nl ? nl : null;
    var worldDone = !wasDone && L.worldState(lab, c.level.world).complete ? c.level.world : null;
    return { stars: stars, best: Math.max(stars, before), first: !before, xp: xp, unlocked: unlockedNow, worldDone: worldDone };
  };

  function starText(n) { var t = ''; for (var i = 0; i < 3; i++) t += i < n ? '★' : '☆'; return t; }
  L.starText = starText;
  function starEl(n, label) { return h('span', { class: 'lab-stars', 'aria-label': label || (n + ' of 3 stars'), text: starText(n) }); }

  L.help = function (lab) {
    var box = h('div', { class: 'callout info lab-help hidden', role: 'region', 'aria-label': lab.name + ' help' }, h('strong', { text: lab.name + '. ' }), lab.help);
    var btn = h('button', { class: 'btn ghost small', type: 'button', 'aria-expanded': 'false', onclick: function () {
      var open = box.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    } }, '? Help');
    return { btn: btn, box: box };
  };

  L.header = function (lab, crumb) {
    if (L.embed) return h('p', { class: 'lab-crumb small embed-crumb' }, h('strong', { text: lab.name }), ' · ' + (crumb || ''));
    var help = L.help(lab);
    var back = crumb ? ['#/' + lab.route, 'Back to the ' + lab.name + ' levels'] : ['#/practice', 'Back to Practice'];
    var wrap = h('div', { class: 'lab-head' },
      h('div', { class: 'lab-head-row' },
        h('a', { class: 'icon-btn lab-back', href: back[0], 'aria-label': back[1], title: back[1] }, '←'),
        h('div', { class: 'lab-title' },
          h('h1', { id: 'view-title', tabindex: '-1', text: lab.name }),
          crumb ? h('p', { class: 'lab-crumb small', text: crumb }) : h('p', { class: 'lead lab-lead', text: lab.tagline })),
        h('div', { class: 'row lab-head-btns' }, help.btn)),
      help.box);
    return wrap;
  };

  // The task card folds to one line on a phone after the first run, so the editor and result get the room. Tap the title to unfold.
  L.foldTask = function (task, head) {
    var userSet = false;
    var btn = h('button', { class: 'task-toggle', type: 'button', 'aria-expanded': 'true', 'aria-label': 'Hide the task' }, '▾');
    function set(open) {
      task.classList.toggle('collapsed', !open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Hide the task' : 'Show the task');
      btn.textContent = open ? '▾' : '▸';
    }
    btn.addEventListener('click', function () { userSet = true; set(task.classList.contains('collapsed')); });
    head.appendChild(btn);
    return function () { if (!userSet && ui.narrow()) set(false); };
  };

  // The sticky action bar of a challenge: Hint, Run and Check stay within thumb reach (and above the keyboard).
  L.actionBar = function (buttons) {
    return h('div', { class: 'row actions lab-actions', role: 'group', 'aria-label': 'Actions' }, buttons.filter(Boolean));
  };
  L.hintButton = function (title, html, onOpen) {
    return h('button', { class: 'btn ghost lab-hint', type: 'button', onclick: function () {
      if (onOpen) onOpen();
      ui.sheet(title, h('div', { class: 'callout tip' }, h('span', { html: html })));
    } }, '💡 Hint');
  };

  L.mapView = function (lab) {
    var root = h('div', { class: 'view lab lab-map lab-' + lab.id });
    var T = L.totals(lab), cur = L.current(lab), lockShown = false;
    root.appendChild(L.header(lab, null));
    root.appendChild(h('div', { class: 'lab-totals' },
      h('div', { class: 'stat' }, h('b', { text: T.solved + ' / ' + T.total }), h('span', { text: 'challenges solved' })),
      h('div', { class: 'stat' }, h('b', { text: '★ ' + T.stars + ' / ' + T.max }), h('span', { text: 'stars' }))));
    root.appendChild(h('a', { class: 'btn big accent lab-continue', href: L.href(lab, cur) }, (T.solved ? 'Continue: ' : 'Start: ') + cur.title + ' ▶'));
    root.appendChild(h('p', { class: 'muted small', text: 'Solve most of a level (2 of 3) to open the next one. Stars: one for solving, one without the hint, one on the first check. Missions open any level.' }));
    lab.worlds.forEach(function (w) {
      var ws = L.worldState(lab, w);
      var sec = h('section', { class: 'lab-world' + (ws.unlocked ? '' : ' locked') + (ws.complete ? ' complete' : ''), style: '--wc:' + L.worldColor(w), 'aria-label': 'World ' + w.n + ': ' + w.title },
        h('div', { class: 'lab-world-head' },
          h('span', { class: 'lab-world-icon', 'aria-hidden': 'true', text: ws.unlocked ? w.icon : '🔒' }),
          h('div', null, h('span', { class: 'lab-world-num', text: 'World ' + w.n }), h('h2', { text: w.title }), h('p', { class: 'muted small', text: w.about })),
          h('span', { class: 'lab-world-score', text: ws.complete ? '✓ complete' : '★ ' + ws.stars + ' / ' + ws.total * 3 })));
      var road = h('ol', { class: 'lab-road' });
      w.levels.forEach(function (lv, i) {
        var st = ws.levels[i], here = cur.level === lv;
        var state = !st.unlocked ? 'locked' : st.complete ? 'complete' : st.solved ? 'started' : 'open';
        var rating = Math.floor(st.stars / Math.max(1, st.total));
        var stars = h('span', { class: 'lab-lv-stars', 'aria-hidden': 'true', text: starText(rating) });
        var sub = st.unlocked ? st.solved + ' of ' + st.total + ' solved · ★ ' + st.stars + '/' + st.max : '';
        var label = 'Level ' + w.n + '.' + lv.n + ': ' + lv.title + '. ' + (st.unlocked ? st.solved + ' of ' + st.total + ' solved, ' + st.stars + ' of ' + st.max + ' stars' + (here ? '. You are here.' : '.') : 'Locked.');
        var lockMsg = null;
        if (!st.unlocked && !lockShown) {
          lockShown = true;
          var prev = lab.levels[lv.index - 1];
          lockMsg = h('span', { class: 'lab-lock-msg small', text: 'Solve ' + L.need(prev) + ' of ' + prev.challenges.length + ' in Level ' + prev.world.n + '.' + prev.n + ' to open' });
        }
        var kids = [
          here && DA.mascot ? h('span', { class: 'lab-here', 'aria-hidden': 'true' }, DA.mascot.svg('happy', 30)) : null,
          h('span', { class: 'lab-lv-face', 'aria-hidden': 'true', text: !st.unlocked ? '🔒' : st.complete ? '✓' : w.n + '.' + lv.n }),
          h('span', { class: 'lab-lv-text', 'aria-hidden': 'true' },
            h('small', { text: 'Level ' + w.n + '.' + lv.n }), h('strong', { text: lv.title }),
            st.unlocked ? h('span', { class: 'lab-lv-meta' }, stars, h('span', { text: sub })) : lockMsg)];
        road.appendChild(h('li', null, st.unlocked
          ? h('a', { class: 'lab-level ' + state + (here ? ' here' : ''), href: L.href(lab, lv.challenges.filter(function (c) { return !L.stars(lab.id, c.id); }).concat(lv.challenges)[0]), 'aria-label': label, 'aria-current': here ? 'step' : null }, kids)
          : h('div', { class: 'lab-level locked', 'aria-label': label, role: 'img' }, kids)));
      });
      sec.appendChild(road);
      root.appendChild(sec);
    });
    if (lab.extraLinks) root.appendChild(lab.extraLinks());
    return root;
  };

  L.lockedView = function (lab, c) {
    var root = h('div', { class: 'view lab lab-' + lab.id });
    root.appendChild(L.header(lab, 'World ' + c.level.world.n + ' · Level ' + c.level.world.n + '.' + c.level.n));
    var prev = lab.levels[c.level.index - 1];
    root.appendChild(h('div', { class: 'callout warn' }, h('strong', { text: '🔒 This level is locked. ' }),
      'Solve ' + L.need(prev) + ' of the ' + prev.challenges.length + ' challenges in "' + prev.title + '" to open it.'));
    root.appendChild(h('a', { class: 'btn accent', href: L.href(lab, L.current(lab)) }, 'Go to your current challenge'));
    return root;
  };

  L.worldNote = function (lab, r) {
    if (!r || !r.worldDone) return null;
    DA.game.confetti(true);
    return h('p', { class: 'small world-stamp-note' }, h('span', { class: 'stamp mini', style: '--wc:' + L.worldColor(r.worldDone), 'aria-hidden': 'true', text: r.worldDone.icon }),
      h('strong', { text: ' World complete: ' + r.worldDone.title + '. ' }), 'A new stamp is in your collection on the You page.');
  };
  // The first time you open a world, a short card says what it is about.
  L.worldIntro = function (lab, c) {
    var w = c.level.world;
    if (c.level.n !== 1 || c.n !== 1 || L.worldState(lab, w).solved) return null;
    return h('div', { class: 'world-intro', style: '--wc:' + L.worldColor(w) },
      h('span', { class: 'wi-icon', 'aria-hidden': 'true', text: w.icon }),
      h('div', null, h('small', { text: lab.name + ' · World ' + w.n }), h('strong', { text: w.title }), h('p', { class: 'small', text: w.about + ' Four levels of three challenges; the last level is the hardest.' })));
  };

  L.afterSolve = function (lab, c) {
    if (L.embedded(c)) {
      if (L.embed.solved) L.embed.solved(c);
      var nxt = L.embed.next(c);
      return [nxt ? h('a', { class: 'btn small accent', href: L.embed.href(nxt) }, 'Next challenge →') : null,
        h('a', { class: 'btn small' + (nxt ? ' ghost' : ' accent'), href: L.embed.back }, L.embed.backLabel)];
    }
    var nx = L.next(lab, c);
    return [nx ? h('a', { class: 'btn small accent', href: L.href(lab, nx) }, 'Next challenge →') : null,
      h('a', { class: 'btn small ghost', href: '#/' + lab.route }, 'Levels')];
  };

  /* ---------------------------------------------------------------- level types */

  L.TYPES = {
    bug: ['🐞', 'Bug hunt'], predict: ['🔮', 'Predict the output'], order: ['🧩', 'Put in order'], rosetta: ['🌐', 'Rosetta'],
    case: ['🗂️', 'Case file'], ask: ['💬', 'Stakeholder request'], interview: ['🎤', 'Interview'], gauntlet: ['🧽', 'Cleaning gauntlet'], boss: ['👾', 'Boss level'],
  };
  L.typeBadge = function (c) {
    var t = c.type && L.TYPES[c.type];
    return t ? h('span', { class: 'badge type-badge' }, h('span', { 'aria-hidden': 'true', text: t[0] + ' ' }), t[1]) : null;
  };
  function seeded(arr, seed) { return DA.ui.seededShuffle ? DA.ui.seededShuffle(arr, seed) : arr.slice(); }

  // The extra parts of a task card: given code (Rosetta), a step list (gauntlet) and, for a stakeholder request, a first question.
  L.taskExtras = function (c, taskText) {
    var out = [];
    if (c.given) out.push(h('div', { class: 'given' }, h('p', { class: 'muted small', text: 'Given (' + c.given.lang + '):' }), h('pre', { class: 'lab-code', text: c.given.code })));
    var list = (c.checklist || c.steps || []).filter(function (st) { return typeof st === 'string'; });
    if (list.length && c.type === 'gauntlet') out.push(h('ol', { class: 'gauntlet' }, list.map(function (st) { return h('li', { html: st }); })));
    if (c.ask) {
      var solved = !!L.stars(c.lab, c.id);
      if (!solved) taskText.classList.add('hidden');
      var fb = h('div', { role: 'status', 'aria-live': 'polite' });
      var opts = c.ask.options.map(function (o, i) {
        return h('button', { class: 'quiz-opt', type: 'button', onclick: function () {
          var ok = i === c.ask.answer;
          opts.forEach(function (b, j) { b.classList.toggle('right', ok && j === i); b.classList.toggle('wrong', !ok && j === i); });
          ui.clear(fb);
          fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? 'Good question to ask. ' : 'Not the best first question. ' }), c.ask.why));
          if (ok) taskText.classList.remove('hidden');
        } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { text: o }));
      });
      out.unshift(h('div', { class: 'ask' }, h('p', { class: 'ask-q' }, h('strong', { text: c.ask.who + ': ' }), '"' + c.ask.says + '"'),
        h('p', { class: 'muted small', text: c.ask.q }), h('div', { class: 'qopts' }, opts), fb));
    }
    return out;
  };

  // Predict the output: read the code, pick one of four results. Tests check that the marked option is what the code really gives.
  L.predictBox = function (c, verdict) {
    var fb = h('div', { role: 'status', 'aria-live': 'polite' }), done = false;
    var opts = c.options.map(function (o, i) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () {
        if (done) return;
        var ok = i === c.answer;
        opts.forEach(function (b, j) { b.classList.toggle('right', ok && j === i); b.classList.toggle('wrong', !ok && j === i); });
        if (ok) { done = true; opts.forEach(function (b) { b.disabled = true; }); }
        verdict({ ok: ok, message: ok ? 'Right: the code gives ' + o + '. ' + (c.why || '') : 'Not this one. Read the code line by line and try another answer.' });
      } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { class: 'mono', text: o }));
    });
    return h('div', { class: 'predict' }, h('pre', { class: 'lab-code' }, c.code), h('p', { class: 'muted small', text: 'What does this give?' }), h('div', { class: 'qopts' }, opts), fb);
  };

  // Tiles that build code by tapping: the shuffled lines of a "put in order" task, or the tokens of the answer (no typing on a phone).
  function joinTokens(parts) {
    var out = '';
    parts.forEach(function (t) { out += (!out || /[(\[.]$/.test(out) || /^[),.\]]/.test(t) ? '' : ' ') + t; });
    return out;
  }
  function tileBox(label, tiles, setText, sep) {
    var used = [], box = h('div', { class: 'tiles', role: 'group', 'aria-label': label });
    var row = h('div', { class: 'tile-bank' });
    function paint() {
      var parts = used.map(function (j) { return tiles[j]; });
      setText(sep === ' ' ? joinTokens(parts) : parts.join(sep));
      buttons.forEach(function (b, i) { b.disabled = used.indexOf(i) >= 0; });
    }
    var buttons = tiles.map(function (t, i) { return h('button', { class: 'tile', type: 'button', onclick: function () { used.push(i); paint(); } }, t); });
    buttons.forEach(function (b) { row.appendChild(b); });
    box.appendChild(h('p', { class: 'muted small', text: label }));
    box.appendChild(row);
    box.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { if (used.length) { used.pop(); paint(); } } }, '↶ Undo tile'),
      h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { used = []; paint(); } }, 'Clear')));
    return box;
  }
  L.orderBox = function (c, setText) {
    return tileBox('Tap the lines in the right order (several orders can work):', seeded(c.lines.slice(), c.id), setText, '\n');
  };
  L.tokens = function (code) {
    return String(code).replace(/\s+/g, ' ').match(/"[^"]*"|'[^']*'|\[[^\]]*\]|[A-Za-z_][\w.]*\(?|\d+(?:\.\d+)?|<=|>=|<>|!=|==|[^\s]/g) || [];
  };
  L.tapBox = function (c, setText, extra) {
    var box = tileBox('Tap mode: build the answer from these pieces (some are not needed). You can still type.', seeded(L.tokens(c.solution).concat(extra || []), c.id + ':tap'), setText, ' ');
    box.classList.add('tap-mode');
    return box;
  };

  // Case file: after the code passes, one last question about what the result means.
  L.findingBox = function (c, onRight) {
    var f = c.finding, fb = h('div', { role: 'status', 'aria-live': 'polite' }), done = false;
    var opts = f.options.map(function (o, i) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () {
        if (done) return;
        var ok = i === f.answer;
        opts.forEach(function (b, j) { b.classList.toggle('right', ok && j === i); b.classList.toggle('wrong', !ok && j === i); });
        ui.clear(fb);
        fb.appendChild(h('p', { class: 'small', text: ok ? f.why : 'Look at your result again: what does it say?' }));
        if (ok) { done = true; setTimeout(onRight, 600); }
      } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { text: o }));
    });
    return h('div', { class: 'finding' }, h('p', null, h('strong', { text: '🗂️ Your finding: ' }), f.q), h('div', { class: 'qopts' }, opts), fb);
  };

  L.page = function (lab, c, opts) {
    opts = opts || {};
    var lv = c.level, w = lv.world;
    var session = { tries: 0, hinted: false, solved: false };
    var root = h('div', { class: 'view lab lab-' + lab.id });
    root.appendChild(L.header(lab, 'World ' + w.n + ': ' + w.title + ' · Level ' + w.n + '.' + lv.n + ': ' + lv.title));

    var layout = h('div', { class: 'lab-layout' + (opts.wide ? ' wide' : '') });
    var side = h('aside', { class: 'lab-side' });
    var main = h('section', { class: 'lab-main', 'aria-label': lab.name + ' workspace' });
    layout.appendChild(side); layout.appendChild(main);
    root.appendChild(layout);

    var inner = h('div', { class: 'side-inner' });
    var fold = h('details', { class: 'side-collapse', open: true }, h('summary', null, 'Level ' + w.n + '.' + lv.n + ' challenges'), inner);
    side.appendChild(fold);
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 1100px)') : null;
    if (narrow && narrow.matches) fold.open = false;
    inner.appendChild(h('h2', { class: 'side-title', text: 'Level ' + w.n + '.' + lv.n + ': ' + lv.title }));
    lv.challenges.forEach(function (x) {
      var k = L.stars(lab.id, x.id);
      inner.appendChild(h('a', { class: 'chal' + (x === c ? ' active' : ''), href: L.href(lab, x), 'aria-current': x === c ? 'page' : null },
        h('span', { class: 'mark', text: k ? '✔' : '○' }), h('span', { class: 'grow', text: x.title }), k ? h('span', { class: 'lab-stars small', text: starText(k) }) : null));
    });
    var nextLv = lab.levels[lv.index + 1];
    if (nextLv) {
      var ns = L.levelState(lab, nextLv);
      inner.appendChild(h('p', { class: 'muted small', text: ns.unlocked ? 'Next: Level ' + nextLv.world.n + '.' + nextLv.n + ' is open.' : 'Solve ' + L.need(lv) + ' here to open Level ' + nextLv.world.n + '.' + nextLv.n + '.' }));
    }

    var best = L.stars(lab.id, c.id);
    root.classList.add('lab-play');
    var hintBtn = L.hintButton('Hint · ' + c.title, c.hint, function () { session.hinted = true; });
    var solBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
      if (!session.tries) { ui.toast('Press "Check" at least once first.'); return; }
      session.hinted = true;
      ui.sheet('Solution · ' + c.title, h('div', { class: 'lab-solution' }, h('p', { class: 'muted small', text: 'One right answer (others can be right too):' }), h('pre', { class: 'lab-code', text: c.solution })));
    } }, 'Show solution');
    var exBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
      var ex = lv.example, sheet = null;
      sheet = ui.sheet('Worked example · ' + ex.title, h('div', { class: 'lab-example' },
        h('p', { class: 'small', text: ex.explain }), h('pre', { class: 'lab-code', text: ex.code }),
        opts.useExample ? h('button', { class: 'btn small accent', type: 'button', onclick: function () { sheet.close(); opts.useExample(ex); } }, 'Try it in the editor') : null));
    } }, '📖 Worked example');
    var head = h('div', { class: 'task-head' },
      h('span', { class: 'badge level' + Math.min(8, w.n * 2 - (lv.n <= 2 ? 1 : 0)), text: 'Level ' + w.n + '.' + lv.n }),
      L.typeBadge(c),
      h('strong', { text: c.title }),
      best ? starEl(best, 'Best so far: ' + best + ' of 3 stars') : h('span', { class: 'muted small', text: '+' + lab.xp(c) + ' XP' }));
    var taskText = h('p', { class: 'lab-task', html: c.task });
    var task = h('div', { class: 'task' }, head, L.taskExtras(c, taskText), taskText, c.type === 'predict' ? null : h('div', { class: 'row task-more' }, solBtn, exBtn));
    var fold = L.foldTask(task, head);
    var intro = L.worldIntro(lab, c);
    if (intro) main.appendChild(intro);
    main.appendChild(task);

    var work = h('div', { class: 'lab-work' });
    var feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    var tilesHost = h('div', { class: 'tiles-host' });
    if (c.type === 'predict') { work.classList.add('hidden'); main.appendChild(L.predictBox(c, function (r) { verdict(r); })); }
    main.appendChild(tilesHost);
    main.appendChild(work);
    main.appendChild(feedback);

    function setFeedback(kind, msg, extra) {
      ui.clear(feedback);
      if (!msg) return;
      feedback.appendChild(h('div', { class: 'callout ' + kind }, msg, extra || null));
    }

    function verdict(res, again) {
      if (!again) session.tries++;
      if (res.ok && c.finding && !session.found) {
        setFeedback('ok', '✔ ' + res.message + ' ', L.findingBox(c, function () { session.found = true; verdict(res, true); }));
        return null;
      }
      if (!res.ok) {
        setFeedback('bad', '✗ ' + res.message, session.tries >= 2 && !session.hinted ? h('div', { class: 'small' }, 'Stuck? Try the 💡 Hint or "Show solution".') : null);
        return null;
      }
      var r = L.record(lab, c, { hinted: session.hinted, tries: session.tries });
      session.solved = true;
      DA.game.quest(L.embed ? 'sql' : (lab.quest || 'lesson'));
      DA.game.sound('done'); DA.game.buzz(30); DA.game.confetti(r.stars === 3);
      setFeedback('ok', '✔ ' + res.message + ' ', h('div', null,
        h('p', { class: 'lab-won' }, starEl(r.stars), r.best > r.stars ? h('span', { class: 'muted small', text: ' (best: ' + starText(r.best) + ')' }) : null,
          r.xp ? h('span', { class: 'small', text: ' +' + r.xp + ' XP' }) : null),
        r.unlocked ? h('p', { class: 'small lab-unlocked' }, h('strong', { text: '🔓 Level ' + r.unlocked.world.n + '.' + r.unlocked.n + ' unlocked: ' }), r.unlocked.title) : null,
        L.worldNote(lab, r),
        h('div', { class: 'row' }, L.afterSolve(lab, c))));
      var mark = side.querySelector('a.chal.active .mark');
      if (mark) mark.textContent = '✔';
      ui.refreshChrome();
      return r;
    }

    function actions() { return c.type === 'predict' ? h('span') : L.actionBar([hintBtn].concat(Array.prototype.slice.call(arguments))); }
    // A view hands over its editor, so tiles can write into it: line tiles for "put in order", token tiles on a phone.
    function editor(api) {
      if (c.type === 'order' && c.lines) tilesHost.appendChild(L.orderBox(c, api.set));
      else if (api.tap !== false && c.type !== 'predict' && L.embed && ui.narrow()) tilesHost.appendChild(L.tapBox(c, api.set, api.extra));
    }
    function ran() { fold(); feedback.scrollIntoView({ block: 'nearest' }); }
    return { root: root, main: main, work: work, side: side, setFeedback: setFeedback, verdict: verdict, session: session, actions: actions, ran: ran, editor: editor };
  };
})();
