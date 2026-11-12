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
    return 0;
  };

  L.need = function (lv) { return Math.ceil(lv.challenges.length * L.NEED); };

  L.levelState = function (lab, lv, s) {
    var solved = 0, stars = 0;
    lv.challenges.forEach(function (c) { var k = L.stars(lab.id, c.id, s); if (k) solved++; stars += k; });
    var prev = lab.levels[lv.index - 1];
    var unlocked = !prev || L.levelState(lab, prev, s).passed;
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

  L.isUnlocked = function (lab, c) { return L.levelState(lab, c.level).unlocked; };

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
    var wasPassed = L.levelState(lab, c.level).passed;
    if (stars > (st[c.id] || 0)) st[c.id] = stars;
    if (lab.id === 'sheets') { ui.state.sheets = ui.state.sheets || {}; ui.state.sheets[c.id] = true; }
    ui.save();
    var xp = DA.game.award(lab.xpKey(c), lab.xp(c), lab.name + ' solved');
    var nl = lab.levels[c.level.index + 1];
    var unlockedNow = !wasPassed && L.levelState(lab, c.level).passed && nl ? nl : null;
    return { stars: stars, best: Math.max(stars, before), first: !before, xp: xp, unlocked: unlockedNow };
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
    var help = L.help(lab);
    var wrap = h('div', { class: 'lab-head' },
      h('div', { class: 'lab-head-row' },
        h('div', { class: 'lab-title' },
          h('h1', { id: 'view-title', tabindex: '-1', text: lab.name }),
          h('p', { class: 'lead lab-lead', text: lab.tagline })),
        h('div', { class: 'row lab-head-btns' },
          crumb ? h('a', { class: 'btn ghost small', href: '#/' + lab.route }, '🗺 Levels') : null,
          help.btn)),
      crumb ? h('p', { class: 'lab-crumb small', text: crumb }) : null,
      help.box);
    return wrap;
  };

  L.mapView = function (lab) {
    var root = h('div', { class: 'view lab lab-map lab-' + lab.id });
    var T = L.totals(lab), cur = L.current(lab);
    root.appendChild(L.header(lab, null));
    root.appendChild(h('div', { class: 'lab-totals' },
      h('div', { class: 'stat' }, h('b', { text: T.solved + ' / ' + T.total }), h('span', { text: 'challenges solved' })),
      h('div', { class: 'stat' }, h('b', { text: '★ ' + T.stars + ' / ' + T.max }), h('span', { text: 'stars' }))));
    root.appendChild(h('a', { class: 'btn big accent lab-continue', href: '#/' + lab.route + '/play/' + cur.id }, (T.solved ? 'Continue: ' : 'Start: ') + cur.title + ' ▶'));
    root.appendChild(h('p', { class: 'muted small', text: 'Solve ' + Math.round(L.NEED * 3) + ' of the 3 challenges in a level to open the next one. Stars: ★ solved, ★ no hint, ★ first try.' }));
    lab.worlds.forEach(function (w) {
      var ws = L.worldState(lab, w);
      var sec = h('section', { class: 'lab-world' + (ws.unlocked ? '' : ' locked') + (ws.complete ? ' complete' : ''), 'aria-label': 'World ' + w.n + ': ' + w.title },
        h('div', { class: 'lab-world-head' },
          h('span', { class: 'lab-world-icon', 'aria-hidden': 'true', text: ws.unlocked ? w.icon : '🔒' }),
          h('div', null, h('span', { class: 'lab-world-num', text: 'World ' + w.n }), h('h2', { text: w.title }), h('p', { class: 'muted small', text: w.about })),
          h('span', { class: 'lab-world-score', text: ws.complete ? '✓ complete' : ws.solved + ' / ' + ws.total })));
      var grid = h('div', { class: 'lab-levels' });
      w.levels.forEach(function (lv, i) {
        var st = ws.levels[i];
        var state = !st.unlocked ? 'locked' : st.complete ? 'complete' : st.solved ? 'started' : 'open';
        var dots = h('span', { class: 'lab-dots', 'aria-hidden': 'true' }, lv.challenges.map(function (c) { var k = L.stars(lab.id, c.id); return h('span', { class: 'lab-dot' + (k ? ' on' : ''), text: k ? '★' : '·' }); }));
        var label = 'Level ' + w.n + '.' + lv.n + ': ' + lv.title + '. ' + (st.unlocked ? st.solved + ' of ' + st.total + ' solved, ' + st.stars + ' stars' : 'locked');
        var inner = [h('span', { class: 'lab-level-num', text: (st.unlocked ? '' : '🔒 ') + 'Level ' + w.n + '.' + lv.n }), h('strong', { text: lv.title }), dots,
          h('span', { class: 'small muted', text: !st.unlocked ? 'Solve ' + L.need(lab.levels[lv.index - 1]) + ' in the level before' : '★ ' + st.stars + ' / ' + st.max })];
        grid.appendChild(st.unlocked
          ? h('a', { class: 'lab-level ' + state, href: '#/' + lab.route + '/play/' + lv.challenges.filter(function (c) { return !L.stars(lab.id, c.id); }).concat(lv.challenges)[0].id, 'aria-label': label }, inner)
          : h('div', { class: 'lab-level locked', 'aria-label': label, role: 'group' }, inner));
      });
      sec.appendChild(grid);
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
      'Solve ' + L.need(prev) + ' of the 3 challenges in "' + prev.title + '" to open it.'));
    root.appendChild(h('a', { class: 'btn accent', href: '#/' + lab.route + '/play/' + L.current(lab).id }, 'Go to your current challenge'));
    return root;
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
      inner.appendChild(h('a', { class: 'chal' + (x === c ? ' active' : ''), href: '#/' + lab.route + '/play/' + x.id, 'aria-current': x === c ? 'page' : null },
        h('span', { class: 'mark', text: k ? '✔' : '○' }), h('span', { class: 'grow', text: x.title }), k ? h('span', { class: 'lab-stars small', text: starText(k) }) : null));
    });
    var nextLv = lab.levels[lv.index + 1];
    if (nextLv) {
      var ns = L.levelState(lab, nextLv);
      inner.appendChild(h('p', { class: 'muted small', text: ns.unlocked ? 'Next: Level ' + nextLv.world.n + '.' + nextLv.n + ' is open.' : 'Solve ' + L.need(lv) + ' here to open Level ' + nextLv.world.n + '.' + nextLv.n + '.' }));
    }

    var best = L.stars(lab.id, c.id);
    var hintBox = h('div', { class: 'callout tip hidden' }, h('strong', { text: 'Hint. ' }), h('span', { html: c.hint }));
    var solBox = h('div', { class: 'hidden lab-solution' }, h('p', { class: 'muted small', text: 'One right answer (others can be right too):' }), h('pre', { class: 'lab-code', text: c.solution }));
    var exBox = h('div', { class: 'hidden lab-example' });
    function paintExample() {
      ui.clear(exBox);
      var ex = lv.example;
      exBox.appendChild(h('p', { class: 'small' }, h('strong', { text: 'Worked example: ' + ex.title + '. ' }), ex.explain));
      exBox.appendChild(h('pre', { class: 'lab-code', text: ex.code }));
      if (opts.useExample) exBox.appendChild(h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { opts.useExample(ex); } }, 'Try it in the editor'));
    }
    paintExample();
    var hintBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
      session.hinted = true;
      hintBox.classList.toggle('hidden');
    } }, '💡 Hint');
    var solBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () {
      if (!session.tries) { ui.toast('Press "Check" at least once first.'); return; }
      session.hinted = true;
      solBox.classList.toggle('hidden');
    } }, 'Show solution');
    var exBtn = h('button', { class: 'btn tiny ghost', type: 'button', onclick: function () { exBox.classList.toggle('hidden'); } }, '📖 Worked example');
    main.appendChild(h('div', { class: 'task' },
      h('div', { class: 'task-head' },
        h('span', { class: 'badge level' + Math.min(8, w.n * 2 - (lv.n <= 2 ? 1 : 0)), text: 'Level ' + w.n + '.' + lv.n }),
        h('strong', { text: c.title }),
        best ? starEl(best, 'Best so far: ' + best + ' of 3 stars') : h('span', { class: 'muted small', text: '+' + lab.xp(c) + ' XP' })),
      h('p', { class: 'lab-task', html: c.task }),
      h('div', { class: 'row' }, hintBtn, solBtn, exBtn),
      hintBox, solBox, exBox));

    var work = h('div', { class: 'lab-work' });
    var feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    main.appendChild(work);
    main.appendChild(feedback);

    function setFeedback(kind, msg, extra) {
      ui.clear(feedback);
      if (!msg) return;
      feedback.appendChild(h('div', { class: 'callout ' + kind }, msg, extra || null));
    }

    function verdict(res) {
      session.tries++;
      if (!res.ok) {
        setFeedback('bad', '✗ ' + res.message, session.tries >= 2 && hintBox.classList.contains('hidden') ? h('div', { class: 'small' }, 'Stuck? Try the 💡 Hint or "Show solution".') : null);
        return null;
      }
      var r = L.record(lab, c, { hinted: session.hinted, tries: session.tries });
      session.solved = true;
      DA.game.quest(lab.quest || 'lesson');
      DA.game.sound('done'); DA.game.buzz(30); DA.game.confetti(r.stars === 3);
      var nx = L.next(lab, c);
      setFeedback('ok', '✔ ' + res.message + ' ', h('div', null,
        h('p', { class: 'lab-won' }, starEl(r.stars), r.best > r.stars ? h('span', { class: 'muted small', text: ' (best: ' + starText(r.best) + ')' }) : null,
          r.xp ? h('span', { class: 'small', text: ' +' + r.xp + ' XP' }) : null),
        r.unlocked ? h('p', { class: 'small lab-unlocked' }, h('strong', { text: '🔓 Level ' + r.unlocked.world.n + '.' + r.unlocked.n + ' unlocked: ' }), r.unlocked.title) : null,
        h('div', { class: 'row' },
          nx ? h('a', { class: 'btn small accent', href: '#/' + lab.route + '/play/' + nx.id }, 'Next challenge →') : null,
          h('a', { class: 'btn small ghost', href: '#/' + lab.route }, 'Levels'))));
      var mark = side.querySelector('a.chal.active .mark');
      if (mark) mark.textContent = '✔';
      ui.refreshChrome();
      return r;
    }

    return { root: root, main: main, work: work, side: side, setFeedback: setFeedback, verdict: verdict, session: session };
  };
})();
