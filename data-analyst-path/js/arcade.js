/* Arcade: six quick games that train real analyst skills, each a map of 4 worlds × 4 levels (js/data/arcade-worlds.js).
 * This file has the shared pieces (lobby, world map, level intro, level results) and two games:
 *  - Guess the correlation: read a scatter plot and estimate r (levels, plus the classic three-lives mode).
 *  - SQL blocks: build a query by tapping tiles (checked by running it on the practice database).
 * The four tool games are in arcade2.js. Logic is in arcade-core.js, arcade-sqlgen.js and arcade-worlds.js.
 * XP from rounds is capped per game per day; clearing a level and three stars pay once each. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, A = DA.arcade, F = DA.feed, M = DA.mascot, AW = DA.arcadeWorlds;
  var V = (DA.views = DA.views || {});
  var holding = false;

  function hold() { if (!holding) { holding = true; G.hold(); } }
  function release() { if (holding) { holding = false; G.release(); } }
  A.leave = release; // the router calls this on every navigation

  function title(text, hidden) { return h('h1', { id: 'view-title', class: hidden ? 'sr-only' : '', tabindex: '-1', text: text }); }
  function starText(n, max) { var t = ''; for (var i = 0; i < (max || 3); i++) t += i < n ? '★' : '☆'; return t; }
  function starsEl(n, label) { return h('span', { class: 'stars s' + n, 'aria-label': label || (n + ' of 3 stars'), text: starText(n) }); }
  A.starText = starText;
  A.starsEl = starsEl;
  var WC = ['#2563eb', '#16a34a', '#7c3aed', '#ea580c'];
  function worldColor(w) { var L = DA.labgame && DA.labgame.WORLD_COLORS; return (L || WC)[(w - 1) % 8] || WC[0]; }
  A.worldColor = worldColor;

  /* ================================================================ lobby */

  A.tiles = function () {
    return h('div', { class: 'arcade-tiles' }, DA.arcadeOrder.map(function (g) {
      var d = AW.def(g), t = AW.totals(g), cur = AW.current(g);
      return h('a', { class: 'game-tile g-' + g, href: '#/arcade/' + g },
        h('span', { class: 'gt-icon', 'aria-hidden': 'true', text: d.icon }),
        h('strong', { text: d.name }),
        h('span', { class: 'small', text: d.tool + ' · ' + d.blurb }),
        h('span', { class: 'gt-meta', text: t.stars ? '★ ' + t.stars + ' of ' + t.max + ' · World ' + cur.w + ', level ' + cur.w + '.' + cur.l : '4 worlds · 16 levels · not played yet' }));
    }));
  };

  function lobby() {
    var root = h('div', { class: 'view arcade' });
    root.appendChild(title('Arcade'));
    root.appendChild(h('p', { class: 'lead', text: 'Six games, one for each tool an analyst uses. Each game has 4 worlds of 4 levels: every world brings new concepts, levels get harder, and every round makes new puzzles, so a level never runs out.' }));
    root.appendChild(A.tiles());
    root.appendChild(ui.callout('info', 'Fair play. ', 'A round is five puzzles. Rounds pay at most ' + ui.XP.gameCap + ' XP a day per game; clearing a level pays ' + ui.XP.arcadeLevel + ' XP once and three stars ' + ui.XP.arcadeStar + ' XP once. Three solved puzzles in a round count for the daily "Code" quest. No timers: par is the number of moves or tries a puzzle needs, and nothing is locked.'));
    return root;
  }

  /* ================================================================ world map (all six games) */

  // opts.detail(lv) -> extra node for a level card; opts.more -> nodes after the worlds
  A.worldMap = function (game, opts) {
    opts = opts || {};
    var def = AW.def(game), cur = AW.current(game), T = AW.totals(game);
    var root = h('div', { class: 'view aw-map' });
    root.appendChild(h('div', { class: 'aw-head g-' + game },
      h('span', { class: 'aw-icon', 'aria-hidden': 'true', text: def.icon }),
      h('div', null, title(def.name), h('p', { text: def.tool + ' · ' + def.blurb }))));
    root.appendChild(h('p', { class: 'aw-sum' }, h('span', { class: 'stars', 'aria-hidden': 'true', text: '★ ' }),
      T.stars + ' of ' + T.max + ' stars · ' + T.cleared + ' of ' + T.total + ' levels cleared · new puzzles in every round'));
    var col = worldColor(cur.w);
    root.appendChild(h('a', { class: 'next-card', href: '#/arcade/' + game + '/' + cur.key, style: '--mc:' + col + ';--mcd:color-mix(in srgb, ' + col + ' 60%, #0f172a)' },
      h('span', { class: 'gt-icon', 'aria-hidden': 'true', text: cur.icon }),
      h('span', { class: 'grow' }, h('small', { text: (T.stars ? 'Continue · ' : 'Start · ') + AW.label(cur) }), h('strong', { class: 'next-title', text: cur.name })),
      h('span', { class: 'next-go', 'aria-hidden': 'true', text: '▶' })));
    def.worlds.forEach(function (w, wi) {
      var n = wi + 1, ws = AW.worldStats(game, n), color = worldColor(n);
      var levels = AW.levels(game).filter(function (x) { return x.w === n; });
      root.appendChild(h('section', { class: 'aw-world' + (ws.complete ? ' complete' : ''), style: '--wc:' + color, 'aria-labelledby': 'aw-' + game + '-' + n },
        h('div', { class: 'aw-world-head' },
          h('span', { class: 'aw-world-icon', 'aria-hidden': 'true', text: w.icon }),
          h('div', { class: 'grow' },
            h('small', { class: 'aw-world-num', text: 'World ' + n }),
            h('h2', { id: 'aw-' + game + '-' + n, text: w.name }),
            h('p', { class: 'muted small', text: w.intro })),
          h('span', { class: 'aw-world-score', 'aria-label': ws.stars + ' of ' + ws.max + ' stars in this world' + (ws.complete ? ', every level cleared' : '') }, (ws.complete ? '✓ ' : '') + '★ ' + ws.stars + '/' + ws.max)),
        h('ul', { class: 'aw-concepts', 'aria-label': 'New in this world' }, w.concepts.map(function (c) { return h('li', { text: c }); })),
        h('ol', { class: 'aw-levels' }, levels.map(function (lv) {
          var k = AW.stars(game, lv.key), isCur = lv === cur, ahead = !k && !isCur && lv.n > cur.n;
          var state = k ? 'done' : isCur ? 'current' : ahead ? 'ahead' : 'open';
          return h('li', null, h('a', { class: 'aw-level ' + state, href: '#/arcade/' + game + '/' + lv.key, 'aria-current': isCur ? 'step' : null,
            'aria-label': AW.label(lv) + ': ' + lv.name + '. ' + (k ? k + ' of 3 stars.' : isCur ? 'Your next level.' : 'Not cleared yet.') },
            h('span', { class: 'aw-lnum', 'aria-hidden': 'true', text: lv.w + '.' + lv.l }),
            h('span', { class: 'aw-ltext', 'aria-hidden': 'true' }, h('strong', { text: lv.name }), h('small', { text: lv.teaches }), opts.detail ? opts.detail(lv) : null),
            h('span', { class: 'aw-lstars', 'aria-hidden': 'true' }, isCur && !k ? h('span', { class: 'aw-here', text: '▶ Next' }) : starsEl(k, ''))));
        }))));
    });
    (opts.more || []).forEach(function (n) { if (n) root.appendChild(n); });
    root.appendChild(ui.callout('info', 'How a level works. ',
      'Each round is 5 new puzzles. Solve 3 to clear the level (★), 4 with 10 stars for ★★, all 5 with 13 stars for ★★★. Your best result is kept; play any level again whenever you like, with new puzzles every time.'));
    return root;
  };

  // The first time you open a level: what is new, then Start.
  A.levelIntro = function (lv, onStart) {
    var col = worldColor(lv.w);
    var box = h('div', { class: 'aw-intro', style: '--wc:' + col },
      h('small', { text: 'World ' + lv.w + ' · ' + lv.world.name }),
      h('h2', { id: 'results-title', tabindex: '-1', text: AW.label(lv) + ' · ' + lv.name }),
      h('p', { class: 'aw-teaches', text: lv.teaches }),
      lv.l === 1 ? h('p', { text: lv.world.intro }) : null,
      lv.l === 1 ? h('ul', { class: 'aw-concepts on-dark', 'aria-label': 'New in this world' }, lv.world.concepts.map(function (c) { return h('li', { text: c }); })) : null,
      h('p', { class: 'small', text: '5 puzzles, new ones every time. Solve 3 to clear the level.' }),
      h('button', { class: 'btn big', type: 'button', onclick: onStart }, 'Start ▶'));
    return box;
  };
  // A small reminder of the level above each puzzle.
  A.levelChip = function (lv) {
    return h('span', { class: 'badge lv-badge', style: '--wc:' + worldColor(lv.w) }, lv.icon + ' ' + AW.label(lv) + ' · ' + lv.name);
  };

  // Results of a level round. o: { game, lv, marks, xp, again, extra }
  A.levelResults = function (o) {
    var rec = AW.record(o.game, o.lv.key, o.marks), total = o.marks.reduce(function (a, m) { return a + m; }, 0);
    var solved = o.marks.filter(function (m) { return m > 0; }).length, xp = (o.xp || 0) + (rec ? rec.xp : 0);
    var st = rec ? rec.stars : 0, next = rec && rec.next;
    if (st === 3) G.confetti(true); else if (rec && rec.firstClear) G.confetti(false);
    G.sound('done');
    var head = st ? (rec.firstClear ? AW.label(o.lv) + ' cleared!' : st === 3 ? 'Three stars!' : 'Level cleared again') : 'Round complete';
    return h('div', { class: 'results' },
      M.svg(st === 3 ? 'cheer' : st ? 'proud' : 'happy', 104),
      h('h2', { id: 'results-title', tabindex: '-1', text: head }),
      h('p', { class: 'big-stars' }, starsEl(st, 'Level result: ' + st + ' of 3 stars')),
      h('p', { class: 'muted', text: solved + ' of ' + o.marks.length + ' solved · ' + total + ' of ' + o.marks.length * 3 + ' puzzle stars · ' + o.marks.map(function (m) { return starText(m); }).join('  ') }),
      rec && rec.newBest && rec.before ? h('p', { class: 'small', text: 'New best for this level: ' + starText(rec.best) }) : rec && rec.best > st ? h('p', { class: 'muted small', text: 'Your best here stays ' + starText(rec.best) + '.' }) : null,
      !st ? h('p', { class: 'small', text: 'Solve 3 of the 5 to clear the level. Every round has new puzzles.' }) : null,
      h('p', { class: 'muted small', text: (xp ? '+' + xp + ' XP' : 'XP for this game today is already earned') + (solved >= 3 ? ' · counts for today\'s "Code" quest' : '') }),
      o.extra || null,
      h('div', { class: 'row center' },
        st && next ? h('a', { class: 'btn big accent', href: '#/arcade/' + o.game + '/' + next.key }, AW.label(next) + ': ' + next.name + ' ▶') : null,
        h('button', { class: 'btn big ' + (st && next ? 'ghost' : 'accent'), type: 'button', onclick: o.again }, 'Play again'),
        h('a', { class: 'btn big ghost', href: '#/arcade/' + o.game }, 'World map')));
  };

  /* ================================================================ guess the correlation */

  // Classic: endless plots, three lives.
  function corrGame() {
    var root = h('div', { class: 'view round game-corr' }, title('Guess the correlation', true));
    var stage = h('div', { class: 'stage' });
    var S = { lives: A.LIVES, score: 0, n: 0, streak: 0, xp: 0, round: null, over: false };
    root.appendChild(stage);
    hold();

    function head() {
      var hearts = '';
      for (var i = 0; i < A.LIVES; i++) hearts += i < S.lives ? '❤️' : '🤍';
      return h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade/corr', 'aria-label': 'Quit the game' }, '✕'),
        h('span', { class: 'lives', 'aria-label': S.lives + ' lives left', text: hearts }),
        h('span', { class: 'grow' }),
        h('span', { class: 'combo hot', 'aria-label': 'Score ' + S.score }, '⭐ ', h('b', { text: String(S.score) })));
    }

    function play() {
      S.round = A.corrRound(); S.n++;
      ui.clear(stage);
      stage.appendChild(head());
      var holder = h('div', { class: 'sc-holder' }, F.scatter(S.round.pts, false));
      var out = h('output', { class: 'corr-val', text: '0.00' });
      var slider = h('input', { type: 'range', min: '-1', max: '1', step: '0.05', value: '0', 'aria-label': 'Your guess for the correlation', oninput: function () { out.textContent = Number(slider.value).toFixed(2); } });
      var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
      var btn = h('button', { class: 'btn big accent', type: 'button', onclick: guess }, 'Guess');
      function guess() {
        var g = Number(slider.value), pts = A.corrScore(g, S.round.r), r = S.round.r;
        btn.disabled = true; slider.disabled = true;
        ui.clear(holder); holder.appendChild(F.scatter(S.round.pts, true));
        if (pts) { S.score += pts; S.streak++; S.xp += G.addXp('game:corr:' + ui.today(), pts, null, ui.XP.gameCap); } else { S.lives--; S.streak = 0; }
        G.sound(pts ? 'ok' : 'bad'); G.buzz(pts ? 20 : [40, 40, 40]);
        var word = ['Too far: a life lost.', 'Close: +1', 'Very close: +2', 'Spot on: +3'][pts];
        fb.appendChild(h('div', { class: 'callout ' + (pts ? 'ok' : 'warn') }, h('strong', { text: 'r = ' + r.toFixed(2) + '. ' }), 'You said ' + g.toFixed(2) + '. ' + word + ' This is ' + A.corrWord(r) + '.'));
        var last = S.lives <= 0;
        var next = h('button', { class: 'btn big accent', type: 'button', onclick: last ? over : play }, last ? 'See your score' : 'Next plot');
        fb.appendChild(next);
        ui.clear(stage.querySelector('.round-head')); var nh = head(); while (nh.firstChild) stage.querySelector('.round-head').appendChild(nh.firstChild);
        next.focus();
      }
      stage.appendChild(h('div', { class: 'qcard' },
        h('div', { class: 'qmeta' }, h('span', { class: 'badge', text: 'Plot ' + S.n }), h('span', { class: 'muted small', text: 'Drag the slider to your estimate of r' })),
        holder,
        h('div', { class: 'corr-row' }, h('span', { class: 'muted small', text: '−1' }), slider, h('span', { class: 'muted small', text: '+1' }), out),
        h('p', { class: 'muted small corr-hint', text: '−1 is a perfect falling line, 0 is a shapeless cloud, +1 is a perfect rising line.' }),
        btn, fb));
      slider.focus({ preventScroll: true });
    }

    function over() {
      S.over = true;
      var st = ui.state.stats, best = st.corrBest || 0, isBest = S.score > best;
      st.corrGames = (st.corrGames || 0) + 1;
      if (isBest) st.corrBest = S.score;
      G.touch();
      release();
      if (isBest && S.score >= 3) G.confetti(true);
      G.sound('done');
      ui.clear(stage);
      stage.appendChild(h('div', { class: 'results' },
        M.svg(isBest ? 'cheer' : S.score >= 4 ? 'proud' : 'happy', 110),
        h('h2', { id: 'results-title', tabindex: '-1', text: isBest ? 'New best: ' + S.score + '!' : 'Score: ' + S.score }),
        h('p', { class: 'muted', text: S.n + ' plots · best ' + Math.max(best, S.score) + (S.xp ? ' · +' + S.xp + ' XP' : ' · daily XP for this game already earned') }),
        h('p', { class: 'muted small', text: 'Tip: most real-world correlations people get excited about are between 0.2 and 0.5. Now you know what those look like.' }),
        h('div', { class: 'row center' },
          h('button', { class: 'btn big accent', type: 'button', onclick: function () { S = { lives: A.LIVES, score: 0, n: 0, streak: 0, xp: 0, round: null, over: false }; hold(); play(); } }, 'Play again'),
          h('a', { class: 'btn big ghost', href: '#/arcade/corr' }, 'World map'))));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }

    play();
    return root;
  }

  // A level: five plots of the level's kind, scored against the level's tolerance.
  function corrLevel(lv) {
    var root = h('div', { class: 'view round game-corr' }, title('Guess the correlation, ' + AW.label(lv), true));
    var stage = h('div', { class: 'stage' }), seed = AW.seed(), i = 0, marks = [], xp = 0;
    root.appendChild(stage);

    function head() {
      return h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade/corr', 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * i / AW.ROUND, 'Round progress'),
        h('span', { class: 'g2-score', 'aria-label': marks.reduce(function (a, m) { return a + m; }, 0) + ' stars so far' }, '★ ' + marks.reduce(function (a, m) { return a + m; }, 0)));
    }
    function play() {
      hold();
      var p = A.corrPlot(seed + i * 7919, lv);
      ui.clear(stage);
      stage.appendChild(head());
      var holder = h('div', { class: 'sc-holder' }, F.scatter(p.pts, false));
      var out = h('output', { class: 'corr-val', text: '0.00' });
      var slider = h('input', { type: 'range', min: '-1', max: '1', step: '0.05', value: '0', 'aria-label': 'Your guess for the correlation', oninput: function () { out.textContent = Number(slider.value).toFixed(2); } });
      var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
      var btn = h('button', { class: 'btn big accent', type: 'button', onclick: guess }, 'Guess');
      function guess() {
        var g = Number(slider.value), k = A.corrLevelScore(g, p.r, p.tol);
        btn.disabled = true; slider.disabled = true;
        ui.clear(holder); holder.appendChild(F.scatter(p.pts, true));
        marks.push(k);
        if (k) xp += G.addXp('game:corr:' + ui.today(), k, null, ui.XP.gameCap);
        G.sound(k ? 'ok' : 'bad'); G.buzz(k ? 20 : [40, 40, 40]);
        fb.appendChild(h('div', { class: 'callout ' + (k ? 'ok' : 'warn') },
          h('p', { class: 'lab-won' }, k ? starsEl(k) : null, h('strong', { text: ' r = ' + p.r.toFixed(2) + '. ' }), 'You said ' + g.toFixed(2) + '. This is ' + A.corrWord(p.r) + '.'),
          p.note ? h('p', { class: 'small', text: '💡 ' + p.note }) : null));
        var last = i + 1 >= AW.ROUND;
        var next = h('button', { class: 'btn big accent', type: 'button', onclick: function () { i++; if (last) finish(); else play(); } }, last ? 'See results' : 'Next plot');
        fb.appendChild(next);
        next.focus();
      }
      stage.appendChild(h('div', { class: 'qcard' },
        h('div', { class: 'qmeta' }, A.levelChip(lv), h('span', { class: 'muted small', text: 'Plot ' + (i + 1) + ' of ' + AW.ROUND + ' · ★★★ within ' + p.tol.toFixed(2) })),
        holder,
        h('div', { class: 'corr-row' }, h('span', { class: 'muted small', text: '−1' }), slider, h('span', { class: 'muted small', text: '+1' }), out),
        btn, fb));
      slider.focus({ preventScroll: true });
    }
    function finish() {
      var st = ui.state.stats;
      st.corrGames = (st.corrGames || 0) + 1;
      if (marks.filter(function (m) { return m > 0; }).length >= 3) G.quest('sql');
      G.touch();
      release();
      ui.clear(stage);
      stage.appendChild(A.levelResults({ game: 'corr', lv: lv, marks: marks, xp: xp, again: function () { seed = AW.seed(); i = 0; marks = []; xp = 0; play(); } }));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }
    if (!AW.stars('corr', lv.key)) {
      stage.appendChild(A.levelIntro(lv, play));
      setTimeout(function () { var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true }); }, 0);
    } else play();
    return root;
  }

  /* ================================================================ SQL blocks */

  function resultTable(res, rows) {
    if (!res || !res.values) return null;
    rows = rows || 4;
    return h('div', null, h('div', { class: 'table-wrap mini' }, h('table', { class: 'result-table' },
      h('thead', null, h('tr', null, res.columns.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null, res.values.slice(0, rows).map(function (row) { return h('tr', null, row.map(function (v) { return h('td', { text: v === null ? 'NULL' : String(typeof v === 'number' ? Math.round(v * 100) / 100 : v) }); })); })))),
      res.values.length > rows ? h('p', { class: 'muted small', text: '… ' + (res.values.length - rows) + ' more row' + (res.values.length - rows === 1 ? '' : 's') }) : null);
  }
  function levelOf(n) { return DA.blockLevels.filter(function (l) { return l.n === n; })[0]; }

  // The SQL engine is optional: without it (a file:// page) only the reference arrangement is accepted.
  var engine = { SQL: null, loading: null };
  function loadEngine() {
    if (engine.SQL || engine.loading || !DA.sqlEngine || location.protocol === 'file:') return engine.loading;
    engine.loading = DA.sqlEngine.load().then(function (mod) { engine.SQL = mod; return mod; }, function () { engine.loading = null; return null; });
    return engine.loading;
  }
  function runner(ds) {
    if (!engine.SQL) return null;
    return function (sql) { var r = DA.sqlEngine.ref(engine.SQL, ds).exec(sql); return r.length ? r[r.length - 1] : undefined; };
  }

  /* ---------- the world map ---------- */

  function blocksMap() {
    var T = A.totals();
    loadEngine(); // warm up the engine for the first round
    return A.worldMap('blocks', {
      detail: function (lv) {
        var st = A.levelStats(Number(lv.key));
        return st.total ? h('small', { class: 'aw-hand' }, '🧩 ' + st.solved + ' of ' + st.total + ' handmade puzzles') : null;
      },
      more: [T.solved >= 5 ? h('a', { class: 'btn big ghost wide', href: '#/arcade/blocks/mix' }, '🔀 Mixed review: handmade puzzles from every level') : null],
    });
  }

  /* ---------- a round ---------- */

  function blocksGame(level) {
    var mix = level === 'mix', lv = mix ? null : level, alv = mix ? null : AW.level('blocks', String(lv));
    var root = h('div', { class: 'view round game-blocks' }, title('SQL blocks' + (lv ? ', level ' + lv : ''), true));
    var stage = h('div', { class: 'stage' });
    var puzzles, idx = 0, solvedNow = 0, xp = 0, combo = 0, bestCombo = 0, got = [];
    root.appendChild(stage);
    loadEngine();
    function newRound() { puzzles = A.blockRound(mix ? 'mix' : lv, AW.ROUND, AW.seed()); idx = 0; solvedNow = 0; xp = 0; combo = 0; bestCombo = 0; got = []; }

    function show() {
      hold();
      var p = puzzles[idx], tiles = A.blockTiles(p), chosen = A.blockStart(p, tiles), caret = chosen.length;
      var checks = 0, hints = 0, done = false, before = p.gen ? 0 : A.stars(p.id), mark = null, glow = null;
      var plv = levelOf(p.lv), col = worldColor(Math.ceil(p.lv / 4));
      ui.clear(stage);
      stage.style.setProperty('--mc', col); stage.style.setProperty('--mcd', 'color-mix(in srgb, ' + col + ' 60%, #0f172a)');
      stage.appendChild(h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade/blocks', 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * idx / puzzles.length, 'Round progress'),
        combo >= 2 ? h('span', { class: 'combo hot', text: '🔥 ' + combo }) : null));
      var tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Your query. Tap a tile to take it out; new tiles go where the cursor is.', onclick: function (e) {
        if (e.target === tray && !done) { caret = chosen.length; paint(); }
      } });
      var bank = h('div', { class: 'bank', role: 'group', 'aria-label': 'Available tiles. Tap a tile to add it.' });
      var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
      var checkBtn = h('button', { class: 'btn big accent', type: 'button', onclick: check }, 'Check');
      var hintBtn = h('button', { class: 'btn ghost', type: 'button', onclick: hint }, '💡 Hint');
      var clearBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
        if (done) return;
        chosen = A.blockStart(p, tiles); caret = chosen.length; mark = glow = null; paint();
      } }, p.fix ? '↺ Reset' : 'Clear');

      function tileBtn(t, cls, onclick, disabled) {
        return h('button', { class: 'tile k-' + A.tileKind(t.text) + (cls ? ' ' + cls : ''), type: 'button', disabled: disabled, onclick: onclick }, t.text);
      }
      function paint() {
        ui.clear(tray); ui.clear(bank);
        if (!chosen.length) tray.appendChild(h('span', { class: 'tray-empty muted', text: 'Tap the tiles below in the right order' }));
        chosen.forEach(function (t, k) {
          if (k === caret && caret < chosen.length && !done) tray.appendChild(h('span', { class: 'caret', 'aria-hidden': 'true' }));
          tray.appendChild(tileBtn(t, 'in' + (mark === t ? ' marked' : ''), function () {
            chosen.splice(k, 1); caret = k; mark = null; paint(); G.buzz(8);
          }, done));
        });
        if (caret >= chosen.length && chosen.length && !done) tray.appendChild(h('span', { class: 'caret', 'aria-hidden': 'true' }));
        tiles.forEach(function (t) {
          var used = chosen.indexOf(t) >= 0;
          var b = tileBtn(t, (used ? 'used' : '') + (glow === t.text && !used ? ' glow' : ''), function () {
            chosen.splice(caret, 0, t); caret++; glow = null; paint(); G.buzz(8);
          }, used || done);
          if (used) b.setAttribute('aria-hidden', 'true');
          bank.appendChild(b);
        });
        checkBtn.disabled = done || !chosen.length;
        hintBtn.disabled = done;
      }

      function hint() {
        if (done) return;
        var r = A.blockHint(p, chosen.map(function (t) { return t.text; }));
        hints++;
        mark = r.wrong !== undefined ? chosen[r.wrong] : null;
        glow = r.next || null;
        ui.clear(fb);
        fb.appendChild(h('div', { class: 'callout tip' }, h('strong', { text: '💡 ' }), r.say, h('span', { class: 'muted small', text: ' (a hint costs a star)' })));
        paint();
      }

      function finishPuzzle(stars, res) {
        done = true; mark = glow = null; paint();
        got.push({ p: p, stars: stars });
        if (stars) {
          solvedNow++;
          combo = stars === 3 ? combo + 1 : 0; bestCombo = Math.max(bestCombo, combo);
          if (p.gen) xp += G.addXp('game:blocks:' + ui.today(), stars, 'SQL blocks', ui.XP.gameCap);
          else {
            if (stars > before) { ui.state.blocks[p.id] = stars; ui.save(); }
            xp += G.award('blocks:' + p.id, ui.XP.block, 'Puzzle solved');
            if (stars === 3) xp += G.award('blockstar:' + p.id, ui.XP.blockStar, '3 stars');
            if (A.levelStats(p.lv).cleared) xp += G.award('blocklevel:' + p.lv, ui.XP.blockLevel, 'Every handmade puzzle of level ' + p.lv);
          }
          fb.insertBefore(h('div', { class: 'stars-won' }, starsEl(stars), stars > before && before ? h('span', { class: 'small', text: ' new best!' }) : null), fb.firstChild);
        } else combo = 0;
        var last = idx + 1 >= puzzles.length;
        var next = h('button', { class: 'btn big accent', type: 'button', onclick: function () { idx++; if (idx >= puzzles.length) end(); else show(); } }, last ? 'See results' : 'Continue');
        fb.appendChild(h('p', { class: 'fc-take' }, h('span', { 'aria-hidden': 'true', text: '💡 ' }), p.why));
        if (res) fb.appendChild(resultTable(res));
        fb.appendChild(next);
        next.focus();
      }

      function check() {
        if (done) return;
        checks++;
        var run = runner(p.ds), r = A.blockCheck(p, chosen.map(function (t) { return t.text; }), run);
        ui.clear(fb);
        G.sound(r.ok ? 'ok' : 'bad'); G.buzz(r.ok ? 20 : [40, 40, 40]);
        if (r.ok) {
          fb.appendChild(h('div', { class: 'callout ok' }, h('strong', { text: '✔ ' + r.message })));
          finishPuzzle(A.starsFor(checks, hints), r.result);
          return;
        }
        fb.appendChild(h('div', { class: 'callout warn' }, h('strong', { text: 'Not yet. ' }), r.message));
        if (r.result && r.result.values) fb.appendChild(h('details', { class: 'yours' }, h('summary', { text: 'Your result (' + r.result.values.length + ' rows)' }), resultTable(r.result, 3)));
        if (checks >= 2) {
          fb.appendChild(h('button', { class: 'btn small ghost', type: 'button', onclick: function () {
            var free = tiles.slice();
            chosen = p.tiles.map(function (text) { for (var k = 0; k < free.length; k++) if (free[k].text === text) return free.splice(k, 1)[0]; return null; }).filter(Boolean);
            ui.clear(fb);
            fb.appendChild(h('div', { class: 'callout tip' }, h('strong', { text: 'Here is one right answer. ' }), 'Read it once from left to right. ' + (p.gen ? 'The level has endless puzzles like it.' : 'It comes back in a later round so you can win its stars.')));
            finishPuzzle(0, null);
          } }, 'Show the answer'));
        }
      }

      // the result to aim for, once the engine is ready
      var target = h('div', { class: 'target' });
      function paintTarget() {
        var run = runner(p.ds);
        if (!run || done) return;
        try {
          var res = run(p.sql);
          ui.clear(target);
          target.appendChild(h('details', null, h('summary', null, '🎯 The result to get: ', h('b', { text: res.columns.length + ' column' + (res.columns.length === 1 ? '' : 's') + ' · ' + res.values.length + ' row' + (res.values.length === 1 ? '' : 's') })), resultTable(res, 3)));
        } catch (e) { /* the tests make sure this cannot happen */ }
      }
      if (engine.SQL) paintTarget(); else if (engine.loading) engine.loading.then(function () { if (target.isConnected) paintTarget(); });

      stage.appendChild(h('div', { class: 'qcard blocks-card' },
        h('div', { class: 'qmeta' },
          h('span', { class: 'badge lv-badge', text: plv.icon + ' Level ' + Math.ceil(p.lv / 4) + '.' + ((p.lv - 1) % 4 + 1) }),
          h('span', { class: 'badge', text: DA.datasets[p.ds].short || p.ds }),
          p.fix ? h('span', { class: 'badge bug', text: '🐞 Fix the bug' }) : null,
          p.gen ? h('span', { class: 'muted small', text: '✨ new puzzle' }) : before ? starsEl(before, 'Best so far: ' + before + ' of 3 stars') : h('span', { class: 'muted small', text: '🧩 handmade · +' + ui.XP.block + ' XP' })),
        h('p', { class: 'qtext', tabindex: '-1', text: p.ask }),
        p.fix ? h('p', { class: 'muted small fix-help', text: 'This query has a bug. Tap the wrong tile to take it out, then tap the right one: it drops in where the cursor is.' }) : null,
        target, tray, bank,
        h('div', { class: 'row' }, checkBtn, hintBtn, clearBtn),
        fb));
      paint();
      var q = stage.querySelector('.qtext'); if (q) q.focus({ preventScroll: true });
    }

    function end() {
      var st = ui.state.stats, marks = got.map(function (g) { return g.stars; }), starsNow = marks.reduce(function (s, m) { return s + m; }, 0);
      st.blockRounds = (st.blockRounds || 0) + 1;
      if (solvedNow >= 3) G.quest('sql');
      G.touch();
      release();
      ui.clear(stage);
      var list = h('ul', { class: 'round-list' }, got.map(function (g) {
        return h('li', null, g.stars ? starsEl(g.stars) : h('span', { class: 'muted', text: 'shown' }), h('span', { class: 'small', text: (g.p.fix ? '🐞 ' : '') + g.p.ask }));
      }));
      var again = function () { newRound(); show(); window.scrollTo(0, 0); };
      if (alv) {
        var ls = A.levelStats(lv);
        stage.appendChild(A.levelResults({ game: 'blocks', lv: alv, marks: marks, xp: xp, again: again,
          extra: h('div', null, list, ls.total ? h('div', { class: 'lv-progress' }, h('p', { class: 'small', text: '🧩 Handmade puzzles in this level: ' + ls.solved + ' of ' + ls.total }), ui.progressBar(100 * ls.solved / ls.total, 'Handmade puzzles solved')) : null) }));
      } else {
        G.sound('done');
        if (solvedNow === puzzles.length) G.confetti(starsNow === puzzles.length * 3);
        stage.appendChild(h('div', { class: 'results' },
          M.svg(starsNow === puzzles.length * 3 ? 'cheer' : solvedNow >= 3 ? 'proud' : 'happy', 110),
          h('h2', { id: 'results-title', tabindex: '-1', text: starsNow === puzzles.length * 3 ? 'Perfect build!' : solvedNow === puzzles.length ? 'All solved!' : 'Round complete' }),
          h('p', { class: 'big-stars', 'aria-label': starsNow + ' stars this round' }, h('span', { class: 'stars', text: '★' }), ' ' + starsNow + ' / ' + puzzles.length * 3),
          list,
          h('p', { class: 'muted', text: (xp ? '+' + xp + ' XP' : 'Round finished') + (bestCombo >= 2 ? ' · best streak 🔥 ' + bestCombo : '') }),
          h('div', { class: 'row center' },
            h('button', { class: 'btn big accent', type: 'button', onclick: again }, 'Another round'),
            h('a', { class: 'btn big ghost', href: '#/arcade/blocks' }, 'World map'))));
      }
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }

    newRound();
    if (alv && !AW.stars('blocks', alv.key)) {
      stage.appendChild(A.levelIntro(alv, show));
      setTimeout(function () { var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true }); }, 0);
    } else show();
    return root;
  }

  V.arcade = function (params) {
    release();
    var game = params[0];
    if (game === 'corr') {
      if (params[1] === 'classic') return corrGame();
      var cl = params[1] === 'next' ? AW.current('corr') : params[1] ? AW.level('corr', params[1]) : null;
      return cl ? corrLevel(cl) : A.worldMap('corr', { more: [h('a', { class: 'btn big ghost wide', href: '#/arcade/corr/classic' }, '❤️ Classic: endless plots, three lives')] });
    }
    if (DA.arcade2 && DA.arcade2.GAMES[game]) return DA.arcade2.view(params);
    if (game === 'blocks') {
      var lv = params[1] === 'next' ? A.nextLevel() : params[1] === 'mix' ? 'mix' : Number(params[1]);
      return lv === 'mix' || (lv >= 1 && lv <= DA.blockLevels.length) ? blocksGame(lv) : blocksMap();
    }
    return lobby();
  };
})();
