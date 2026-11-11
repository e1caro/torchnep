/* Mini-game logic (no DOM, unit-tested). The screens are in arcade.js. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var A = (DA.arcade = {});
  A.rand = Math.random; // replaceable in tests

  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = A.rand();
    while (v === 0) v = A.rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function pearson(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; syy += p[1] * p[1]; sxy += p[0] * p[1]; });
    var cov = sxy - sx * sy / n, vx = sxx - sx * sx / n, vy = syy - sy * sy / n;
    return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
  }
  A.pearson = pearson;

  /* ---------- Guess the correlation ---------- */

  // A scatter of n points drawn around a random target correlation. `r` is the correlation the points REALLY have
  // (rounded to 2 decimals), so the answer shown is always true for the picture.
  A.corrRound = function (n) {
    n = n || 40;
    var target = Math.round((A.rand() * 1.9 - 0.95) * 100) / 100, k = Math.sqrt(1 - target * target), pts = [], i;
    for (i = 0; i < n; i++) { var x = gauss(), y = target * x + k * gauss(); pts.push([x, y]); }
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    return {
      r: Math.round(pearson(pts) * 100) / 100,
      pts: pts.map(function (p) { return [(p[0] - x0) / (x1 - x0 || 1), (p[1] - y0) / (y1 - y0 || 1)]; }), // scaled to 0..1 for drawing
    };
  };
  // 3 points within 0.05, 2 within 0.10, 1 within 0.20, otherwise 0 (and a life lost).
  A.corrScore = function (guess, r) {
    var err = Math.abs(guess - r) - 1e-9; // tolerate floating-point noise at the boundaries
    return err <= 0.05 ? 3 : err <= 0.10 ? 2 : err <= 0.20 ? 1 : 0;
  };
  A.corrWord = function (r) {
    var a = Math.abs(r), s = a < 0.1 ? 'almost no' : a < 0.3 ? 'a weak' : a < 0.6 ? 'a moderate' : a < 0.85 ? 'a strong' : 'a very strong';
    return s + (a < 0.1 ? '' : r < 0 ? ' negative' : ' positive') + ' relationship';
  };
  A.LIVES = 3;

  /* ---------- SQL blocks ---------- */

  // Five puzzles for a round: the ones not solved yet first (in order, so difficulty grows), then solved ones.
  A.blockRound = function (n) {
    n = n || 5;
    var todo = DA.puzzles.filter(function (p) { return !ui.state.blocks[p.id]; });
    var done = DA.puzzles.filter(function (p) { return ui.state.blocks[p.id]; });
    for (var i = done.length - 1; i > 0; i--) { var j = Math.floor(A.rand() * (i + 1)), t = done[i]; done[i] = done[j]; done[j] = t; }
    return todo.concat(done).slice(0, n);
  };
  // The tiles of a puzzle, mixed (answer tiles and the extra ones), each with a stable index.
  A.blockTiles = function (p) {
    var all = p.tiles.concat(p.extra).map(function (text, i) { return { i: i, text: text }; });
    for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(A.rand() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
    // never hand out the tiles already in the right order
    if (all.length > 2 && all.map(function (x) { return x.i; }).join() === p.tiles.concat(p.extra).map(function (_, k) { return k; }).join()) all.push(all.shift());
    return all;
  };
  function norm(sql) { return sql.replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim().toLowerCase(); }
  // Checks an arrangement. With a database (`run` = function(sql) -> result or throws) the RESULTS are compared,
  // so any equivalent query passes; without one (engine not loaded) only the reference arrangement passes.
  A.blockCheck = function (p, chosen, run) {
    var sql = chosen.join(' ');
    if (!chosen.length) return { ok: false, message: 'Tap the tiles to build the query.' };
    if (!run) return norm(sql) === norm(p.sql) ? { ok: true, message: 'Correct!' } : { ok: false, message: 'Not quite. Check the order of the tiles.' };
    var got, want;
    try { got = run(sql); } catch (e) { return { ok: false, message: 'The database says: ' + String(e.message || e), error: true }; }
    want = run(p.sql);
    var cmp = DA.compareResults(got, want, { ordered: /order\s+by/i.test(p.sql) });
    return { ok: cmp.ok, message: cmp.ok ? 'Correct! Your query returns the right result.' : cmp.message, result: got };
  };
})();
