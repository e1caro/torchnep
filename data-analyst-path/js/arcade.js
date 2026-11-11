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
        h('span', { class: 'small', text: 'Tap tiles to build the query. No typing.' }),
        h('span', { class: 'gt-meta', text: solved + ' / ' + DA.puzzles.length + ' solved' })));
  };

  function lobby() {
    var root = h('div', { class: 'view arcade' });
    root.appendChild(title('Arcade'));
    root.appendChild(h('p', { class: 'lead', text: 'Two quick games. Each one trains something an analyst does every day: reading a chart and writing a query.' }));
    root.appendChild(A.tiles());
    root.appendChild(ui.callout('info', 'Fair play. ', 'The correlation game is endless, so it pays at most ' + ui.XP.gameCap + ' XP a day. Each SQL puzzle pays ' + ui.XP.block + ' XP the first time you solve it, and a round of SQL blocks counts for the daily "Code" quest.'));
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

  function resultTable(res) {
    if (!res || !res.values) return null;
    return h('div', { class: 'table-wrap mini' }, h('table', { class: 'result-table' },
      h('thead', null, h('tr', null, res.columns.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null, res.values.slice(0, 4).map(function (row) { return h('tr', null, row.map(function (v) { return h('td', { text: v === null ? 'NULL' : String(typeof v === 'number' ? Math.round(v * 100) / 100 : v) }); })); }))),
      res.values.length > 4 ? h('p', { class: 'muted small', text: '… ' + (res.values.length - 4) + ' more rows' }) : null);
  }

  function blocksGame() {
    var root = h('div', { class: 'view round game-blocks' }, title('SQL blocks', true));
    var stage = h('div', { class: 'stage' });
    var puzzles = A.blockRound(5), idx = 0, solvedNow = 0, xp = 0, SQL = null;
    root.appendChild(stage);
    hold();
    // the database is optional: without it only the reference arrangement is accepted
    if (DA.sqlEngine && location.protocol !== 'file:') DA.sqlEngine.load().then(function (mod) { SQL = mod; }, function () { SQL = null; });

    function runner(ds) {
      if (!SQL) return null;
      return function (sql) { var r = DA.sqlEngine.ref(SQL, ds).exec(sql); return r.length ? r[r.length - 1] : undefined; };
    }

    function show() {
      var p = puzzles[idx], tiles = A.blockTiles(p), chosen = [], tries = 0, done = false;
      ui.clear(stage);
      stage.appendChild(h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade', 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * idx / puzzles.length, 'Round progress'),
        h('span', { class: 'combo', text: (idx + 1) + ' / ' + puzzles.length })));
      var tray = h('div', { class: 'tray', role: 'group', 'aria-label': 'Your query. Tap a tile to remove it.' });
      var bank = h('div', { class: 'bank', role: 'group', 'aria-label': 'Available tiles. Tap a tile to add it.' });
      var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
      var checkBtn = h('button', { class: 'btn big accent', type: 'button', onclick: check }, 'Check');
      var clearBtn = h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (!done) { chosen = []; paint(); } } }, 'Clear');

      function paint() {
        ui.clear(tray); ui.clear(bank);
        if (!chosen.length) tray.appendChild(h('span', { class: 'tray-empty muted', text: 'Tap the tiles below in the right order' }));
        chosen.forEach(function (t, k) {
          tray.appendChild(h('button', { class: 'tile in', type: 'button', disabled: done, onclick: function () { chosen.splice(k, 1); paint(); } }, t.text));
        });
        tiles.forEach(function (t) {
          var used = chosen.indexOf(t) >= 0;
          bank.appendChild(h('button', { class: 'tile' + (used ? ' used' : ''), type: 'button', disabled: used || done, 'aria-hidden': used ? 'true' : null, onclick: function () { chosen.push(t); paint(); G.buzz(8); } }, t.text));
        });
        checkBtn.disabled = done || !chosen.length;
      }

      function finishPuzzle(ok, res) {
        done = true; paint();
        if (ok) {
          solvedNow++;
          if (!ui.state.blocks[p.id]) { ui.state.blocks[p.id] = true; ui.save(); xp += G.award('blocks:' + p.id, ui.XP.block, 'Puzzle solved'); }
        }
        var last = idx + 1 >= puzzles.length;
        var next = h('button', { class: 'btn big accent', type: 'button', onclick: function () { idx++; if (idx >= puzzles.length) end(); else show(); } }, last ? 'See results' : 'Continue');
        fb.appendChild(h('p', { class: 'fc-take' }, h('span', { 'aria-hidden': 'true', text: '💡 ' }), p.why));
        if (res) fb.appendChild(resultTable(res));
        fb.appendChild(next);
        next.focus();
      }

      function check() {
        if (done) return;
        var r = A.blockCheck(p, chosen.map(function (t) { return t.text; }), runner(p.ds));
        ui.clear(fb);
        G.sound(r.ok ? 'ok' : 'bad'); G.buzz(r.ok ? 20 : [40, 40, 40]);
        if (r.ok) {
          fb.appendChild(h('div', { class: 'callout ok' }, h('strong', { text: '✔ ' + r.message })));
          finishPuzzle(true, r.result);
          return;
        }
        tries++;
        fb.appendChild(h('div', { class: 'callout warn' }, h('strong', { text: 'Not yet. ' }), r.message));
        if (tries >= 2) {
          fb.appendChild(h('button', { class: 'btn small ghost', type: 'button', onclick: function () {
            chosen = p.tiles.map(function (text, k) { return tiles.filter(function (t) { return t.i === k; })[0]; });
            ui.clear(fb);
            fb.appendChild(h('div', { class: 'callout tip' }, h('strong', { text: 'Here is one right answer. ' }), 'Read it once from left to right.'));
            finishPuzzle(false, null);
          } }, 'Show the answer'));
        }
      }

      stage.appendChild(h('div', { class: 'qcard' },
        h('div', { class: 'qmeta' }, h('span', { class: 'badge', text: DA.datasets[p.ds].short || p.ds }), ui.state.blocks[p.id] ? h('span', { class: 'badge ok', text: '✔ solved before' }) : h('span', { class: 'muted small', text: '+' + ui.XP.block + ' XP' })),
        h('p', { class: 'qtext', tabindex: '-1', text: p.ask }),
        tray, bank,
        h('div', { class: 'row' }, checkBtn, clearBtn),
        fb));
      paint();
      var q = stage.querySelector('.qtext'); if (q) q.focus({ preventScroll: true });
    }

    function end() {
      var st = ui.state.stats, total = Object.keys(ui.state.blocks).length;
      st.blockRounds = (st.blockRounds || 0) + 1;
      if (solvedNow >= 3) G.quest('sql');
      G.touch();
      release();
      if (solvedNow === puzzles.length) G.confetti(true);
      G.sound('done');
      ui.clear(stage);
      stage.appendChild(h('div', { class: 'results' },
        M.svg(solvedNow === puzzles.length ? 'cheer' : solvedNow >= 3 ? 'proud' : 'happy', 110),
        h('h2', { id: 'results-title', tabindex: '-1', text: solvedNow === puzzles.length ? 'Flawless build!' : 'Round complete' }),
        h('p', { class: 'muted', text: solvedNow + ' of ' + puzzles.length + ' solved' + (xp ? ' · +' + xp + ' XP' : '') + ' · ' + total + ' of ' + DA.puzzles.length + ' puzzles done in total' }),
        solvedNow >= 3 ? h('p', { class: 'muted small', text: 'That counts for today\'s "Code" quest.' }) : h('p', { class: 'muted small', text: 'Solve 3 in a round to complete today\'s "Code" quest.' }),
        h('div', { class: 'row center' },
          h('button', { class: 'btn big accent', type: 'button', onclick: function () { var host = root.parentNode; if (host) { ui.clear(host); host.appendChild(blocksGame()); window.scrollTo(0, 0); } } }, 'Another round'),
          h('a', { class: 'btn big ghost', href: '#/lab' }, 'Try the SQL Lab'),
          h('a', { class: 'btn big ghost', href: '#/arcade' }, 'Done'))));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }

    show();
    return root;
  }

  V.arcade = function (params) {
    release();
    if (params[0] === 'corr') return corrGame();
    if (params[0] === 'blocks') return blocksGame();
    return lobby();
  };
})();
