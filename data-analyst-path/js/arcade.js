/* Arcade: two quick games that train real analyst skills.
 *  - Guess the correlation: read a scatter plot and estimate r.
 *  - SQL blocks: build a query by tapping tiles (checked by running it on the practice database).
 * Logic is in arcade-core.js. XP from the endless game is capped per day; puzzles pay once each. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, A = DA.arcade, F = DA.feed, M = DA.mascot;
  var V = (DA.views = DA.views || {});
  var holding = false;

  function hold() { if (!holding) { holding = true; G.hold(); } }
  function release() { if (holding) { holding = false; G.release(); } }
  A.leave = release; // the router calls this on every navigation

  function title(text, hidden) { return h('h1', { id: 'view-title', class: hidden ? 'sr-only' : '', tabindex: '-1', text: text }); }
  function stat(label, value) { return h('div', { class: 'stat' }, h('b', { text: String(value) }), h('span', { text: label })); }

  /* ================================================================ lobby */

  A.tiles = function () {
    var st = ui.state.stats, solved = Object.keys(ui.state.blocks).length;
    return h('div', { class: 'arcade-tiles' },
      h('a', { class: 'game-tile g-corr', href: '#/arcade/corr' },
        h('span', { class: 'gt-icon', 'aria-hidden': 'true', text: '🎯' }),
        h('strong', { text: 'Guess the correlation' }),
        h('span', { class: 'small', text: 'Read a scatter plot, estimate r. Three lives.' }),
        h('span', { class: 'gt-meta', text: st.corrBest ? 'Best: ' + st.corrBest : 'Not played yet' })),
      h('a', { class: 'game-tile g-blocks', href: '#/arcade/blocks' },
        h('span', { class: 'gt-icon', 'aria-hidden': 'true', text: '🧱' }),
        h('strong', { text: 'SQL blocks' }),
        h('span', { class: 'small', text: DA.puzzles.length + ' puzzles in 8 levels: build queries and fix bugs by tapping tiles.' }),
        h('span', { class: 'gt-meta', text: '★ ' + A.totals().stars + ' · ' + solved + ' / ' + DA.puzzles.length + ' solved' })));
  };

  function lobby() {
    var root = h('div', { class: 'view arcade' });
    root.appendChild(title('Arcade'));
    root.appendChild(h('p', { class: 'lead', text: 'Two quick games. Each one trains something an analyst does every day: reading a chart and writing a query.' }));
    root.appendChild(A.tiles());
    root.appendChild(ui.callout('info', 'Fair play. ', 'The correlation game is endless, so it pays at most ' + ui.XP.gameCap + ' XP a day. Each SQL puzzle pays ' + ui.XP.block + ' XP the first time you solve it (more for three stars and for clearing a level), and a round of SQL blocks counts for the daily "Code" quest.'));
    return root;
  }

  /* ================================================================ guess the correlation */

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
        h('a', { class: 'icon-btn', href: '#/arcade', 'aria-label': 'Quit the game' }, '✕'),
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
          h('a', { class: 'btn big ghost', href: '#/arcade' }, 'Done'))));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }

    play();
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
  function starText(n, max) { var t = ''; for (var i = 0; i < (max || 3); i++) t += i < n ? '★' : '☆'; return t; }
  function starsEl(n, label) { return h('span', { class: 'stars s' + n, 'aria-label': label || (n + ' of 3 stars'), text: starText(n) }); }
  function levelOf(n) { return DA.blockLevels.filter(function (l) { return l.n === n; })[0]; }
  function levelColor(n) { return DA.unitColor ? DA.unitColor(n - 1) : ['#2563eb', '#1d4ed8']; }

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

  /* ---------- the level map ---------- */

  function blocksMap() {
    var root = h('div', { class: 'view blocks-map' }), T = A.totals(), next = A.nextLevel(), nl = levelOf(next);
    root.appendChild(title('SQL blocks'));
    root.appendChild(h('p', { class: 'lead', text: 'Build real queries by tapping tiles: no typing. ' + DA.puzzles.length + ' puzzles in 8 levels, from your first SELECT to window functions. Every answer is checked by running it on the practice database.' }));
    root.appendChild(h('div', { class: 'blocks-totals' },
      stat('stars', T.stars + ' / ' + T.max), stat('solved', T.solved + ' / ' + DA.puzzles.length), stat('bugs fixed', T.fixed + ' / ' + T.fixes), stat('levels cleared', T.levels + ' / 8')));
    var col = levelColor(next);
    root.appendChild(h('a', { class: 'next-card', href: '#/arcade/blocks/' + next, style: '--mc:' + col[0] + ';--mcd:' + col[1] },
      h('span', { class: 'gt-icon', 'aria-hidden': 'true', text: nl.icon }),
      h('span', { class: 'grow' }, h('span', { class: 'small', text: T.solved ? 'Continue · Level ' + next : 'Start · Level 1' }), h('strong', { class: 'next-title', text: nl.name })),
      h('span', { class: 'next-go', 'aria-hidden': 'true', text: '▶' })));
    root.appendChild(h('div', { class: 'level-grid' }, DA.blockLevels.map(function (l) {
      var st = A.levelStats(l.n), c = levelColor(l.n), fixes = A.levelPuzzles(l.n).filter(function (p) { return p.fix; }).length;
      return h('a', { class: 'level-card' + (st.cleared ? ' cleared' : '') + (l.n === next ? ' current' : ''), href: '#/arcade/blocks/' + l.n, style: '--mc:' + c[0] + ';--mcd:' + c[1],
        'aria-label': 'Level ' + l.n + ': ' + l.name + '. ' + st.solved + ' of ' + st.total + ' solved, ' + st.stars + ' of ' + st.max + ' stars.' },
        h('span', { class: 'lv-top' }, h('span', { class: 'lv-icon', 'aria-hidden': 'true', text: l.icon }), h('span', { class: 'lv-num', text: 'Level ' + l.n }), st.cleared ? h('span', { class: 'lv-done', text: '✓ cleared' }) : null),
        h('strong', { class: 'lv-name', text: l.name }),
        h('span', { class: 'small muted', text: l.teaches + ' · ' + st.total + ' puzzles' + (fixes ? ', ' + fixes + (fixes === 1 ? ' bug' : ' bugs') + ' to fix' : '') }),
        ui.progressBar(100 * st.solved / st.total, 'Level ' + l.n + ' progress'),
        h('span', { class: 'lv-stars' }, h('span', { class: 'stars', 'aria-hidden': 'true', text: '★' }), ' ' + st.stars + ' / ' + st.max));
    })));
    if (T.solved >= 5) {
      root.appendChild(h('a', { class: 'btn big ghost wide', href: '#/arcade/blocks/mix' }, '🔀 Mixed review: 5 puzzles you have solved, from every level'));
    }
    root.appendChild(ui.callout('info', 'How it works. ',
      'Get it right at the first Check with no hint for ★★★; each extra try or hint costs a star. Replay any puzzle to win more stars. 🐞 puzzles start with a broken query: tap the wrong tile to take it out, then tap the right one to drop it in the same place. Solving a puzzle pays ' + ui.XP.block + ' XP once, three stars ' + ui.XP.blockStar + ' more, and clearing a level ' + ui.XP.blockLevel + '. Solve 3 in a round for the daily "Code" quest.'));
    loadEngine(); // warm up the engine for the first round
    return root;
  }

  /* ---------- a round ---------- */

  function blocksGame(level) {
    var mix = level === 'mix', lv = mix ? null : level;
    var root = h('div', { class: 'view round game-blocks' }, title('SQL blocks' + (lv ? ', level ' + lv : ''), true));
    var stage = h('div', { class: 'stage' });
    var puzzles = A.blockRound(mix ? 'mix' : lv, 5), idx = 0, solvedNow = 0, xp = 0, combo = 0, bestCombo = 0, got = [];
    root.appendChild(stage);
    hold();
    loadEngine();

    function show() {
      var p = puzzles[idx], tiles = A.blockTiles(p), chosen = A.blockStart(p, tiles), caret = chosen.length;
      var checks = 0, hints = 0, done = false, before = A.stars(p.id), mark = null, glow = null;
      var plv = levelOf(p.lv), col = levelColor(p.lv);
      ui.clear(stage);
      stage.style.setProperty('--mc', col[0]); stage.style.setProperty('--mcd', col[1]);
      stage.appendChild(h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade/blocks', 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * idx / puzzles.length, 'Round progress'),
        combo >= 2 ? h('span', { class: 'combo hot', text: '🔥 ' + combo }) : null,
        h('span', { class: 'combo', text: (idx + 1) + ' / ' + puzzles.length })));
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
          if (stars > before) { ui.state.blocks[p.id] = stars; ui.save(); }
          xp += G.award('blocks:' + p.id, ui.XP.block, 'Puzzle solved');
          if (stars === 3) xp += G.award('blockstar:' + p.id, ui.XP.blockStar, '3 stars');
          if (A.levelStats(p.lv).cleared) xp += G.award('blocklevel:' + p.lv, ui.XP.blockLevel, 'Level ' + p.lv + ' cleared');
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
            fb.appendChild(h('div', { class: 'callout tip' }, h('strong', { text: 'Here is one right answer. ' }), 'Read it once from left to right. It comes back in a later round so you can win its stars.'));
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
          h('span', { class: 'badge lv-badge', text: plv.icon + ' Level ' + p.lv }),
          h('span', { class: 'badge', text: DA.datasets[p.ds].short || p.ds }),
          p.fix ? h('span', { class: 'badge bug', text: '🐞 Fix the bug' }) : null,
          before ? starsEl(before, 'Best so far: ' + before + ' of 3 stars') : h('span', { class: 'muted small', text: '+' + ui.XP.block + ' XP' })),
        h('p', { class: 'qtext', tabindex: '-1', text: p.ask }),
        p.fix ? h('p', { class: 'muted small fix-help', text: 'This query has a bug. Tap the wrong tile to take it out, then tap the right one: it drops in where the cursor is.' }) : null,
        target, tray, bank,
        h('div', { class: 'row' }, checkBtn, hintBtn, clearBtn),
        fb));
      paint();
      var q = stage.querySelector('.qtext'); if (q) q.focus({ preventScroll: true });
    }

    function end() {
      var st = ui.state.stats, starsNow = got.reduce(function (s, g) { return s + g.stars; }, 0);
      st.blockRounds = (st.blockRounds || 0) + 1;
      if (solvedNow >= 3) G.quest('sql');
      G.touch();
      release();
      if (solvedNow === puzzles.length) G.confetti(starsNow === puzzles.length * 3);
      G.sound('done');
      ui.clear(stage);
      var ls = lv ? A.levelStats(lv) : null, nextLv = lv && ls.cleared && lv < 8 ? lv + 1 : null;
      var again = function () { var host = root.parentNode; if (host) { ui.clear(host); host.appendChild(blocksGame(level)); window.scrollTo(0, 0); } };
      stage.appendChild(h('div', { class: 'results' },
        M.svg(starsNow === puzzles.length * 3 ? 'cheer' : solvedNow >= 3 ? 'proud' : 'happy', 110),
        h('h2', { id: 'results-title', tabindex: '-1', text: starsNow === puzzles.length * 3 ? 'Perfect build!' : solvedNow === puzzles.length ? 'All solved!' : 'Round complete' }),
        h('p', { class: 'big-stars', 'aria-label': starsNow + ' stars this round' }, h('span', { class: 'stars', text: '★' }), ' ' + starsNow + ' / ' + puzzles.length * 3),
        h('ul', { class: 'round-list' }, got.map(function (g) {
          return h('li', null, g.stars ? starsEl(g.stars) : h('span', { class: 'muted', text: 'shown' }), h('span', { class: 'small', text: (g.p.fix ? '🐞 ' : '') + g.p.ask }));
        })),
        h('p', { class: 'muted', text: solvedNow + ' of ' + puzzles.length + ' solved' + (xp ? ' · +' + xp + ' XP' : '') + (bestCombo >= 2 ? ' · best streak 🔥 ' + bestCombo : '') }),
        ls ? h('div', { class: 'lv-progress' }, h('p', { class: 'small', text: levelOf(lv).icon + ' Level ' + lv + ': ' + ls.solved + ' / ' + ls.total + ' solved · ★ ' + ls.stars + ' / ' + ls.max }), ui.progressBar(100 * ls.solved / ls.total, 'Level progress')) : null,
        solvedNow >= 3 ? h('p', { class: 'muted small', text: 'That counts for today\'s "Code" quest.' }) : h('p', { class: 'muted small', text: 'Solve 3 in a round to complete today\'s "Code" quest.' }),
        h('div', { class: 'row center' },
          nextLv ? h('a', { class: 'btn big accent', href: '#/arcade/blocks/' + nextLv }, 'Level ' + nextLv + ': ' + levelOf(nextLv).name + ' ▶') : null,
          h('button', { class: 'btn big ' + (nextLv ? 'ghost' : 'accent'), type: 'button', onclick: again }, 'Another round'),
          h('a', { class: 'btn big ghost', href: '#/arcade/blocks' }, 'Levels'))));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }

    show();
    return root;
  }

  V.arcade = function (params) {
    release();
    if (params[0] === 'corr') return corrGame();
    if (params[0] === 'blocks') {
      var lv = params[1] === 'next' ? A.nextLevel() : params[1] === 'mix' ? 'mix' : Number(params[1]);
      return lv === 'mix' || (lv >= 1 && lv <= DA.blockLevels.length) ? blocksGame(lv) : blocksMap();
    }
    return lobby();
  };
})();
