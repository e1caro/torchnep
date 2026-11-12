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

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(A.rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // Stars of a puzzle on this device: 0 = not solved yet, 1 to 3 once solved.
  A.stars = function (id, s) { var v = (s || ui.state).blocks[id]; return v === true ? 1 : (Number(v) || 0); };
  A.levelPuzzles = function (n) { return DA.puzzles.filter(function (p) { return p.lv === n; }); };
  A.levelStats = function (n, s) {
    var ps = A.levelPuzzles(n), solved = 0, stars = 0;
    ps.forEach(function (p) { var k = A.stars(p.id, s); if (k) solved++; stars += k; });
    return { total: ps.length, solved: solved, stars: stars, max: ps.length * 3, cleared: solved === ps.length };
  };
  A.totals = function (s) {
    var solved = 0, stars = 0, fixed = 0;
    DA.puzzles.forEach(function (p) { var k = A.stars(p.id, s); if (k) { solved++; stars += k; if (p.fix) fixed++; } });
    return { solved: solved, stars: stars, max: DA.puzzles.length * 3, fixed: fixed, fixes: DA.puzzles.filter(function (p) { return p.fix; }).length,
      levels: DA.blockLevels.filter(function (l) { return A.levelStats(l.n, s).cleared; }).length };
  };
  // Where "Continue" goes: the first level with an unsolved puzzle, else the one with the fewest stars.
  A.nextLevel = function () {
    var L = DA.blockLevels, i;
    for (i = 0; i < L.length; i++) if (!A.levelStats(L[i].n).cleared) return L[i].n;
    var best = L[0].n, ratio = 2;
    L.forEach(function (l) { var st = A.levelStats(l.n), r = st.stars / st.max; if (r < ratio) { ratio = r; best = l.n; } });
    return best;
  };

  // A round of n puzzles from one level (or 'mix': solved puzzles from every level, for review).
  // Unsolved ones come first, in order, so difficulty grows; then the ones with the fewest stars; then the rest.
  A.blockRound = function (level, n) {
    n = n || 5;
    if (level === 'mix') {
      var solved = shuffle(DA.puzzles.filter(function (p) { return A.stars(p.id); }));
      solved.sort(function (a, b) { return A.stars(a.id) - A.stars(b.id); });
      return solved.length >= n ? shuffle(solved.slice(0, n * 2)).slice(0, n) : A.blockRound(A.nextLevel(), n);
    }
    var pool = A.levelPuzzles(level || A.nextLevel());
    var todo = pool.filter(function (p) { return !A.stars(p.id); });
    var rest = shuffle(pool.filter(function (p) { return A.stars(p.id); }));
    rest.sort(function (a, b) { return A.stars(a.id) - A.stars(b.id); });
    return todo.concat(rest).slice(0, n);
  };

  // The tiles of a puzzle, mixed, each with a stable index. A "fix the bug" puzzle has the tiles of the answer AND of
  // the broken query (shared tiles once), so the broken query can be laid out and repaired with the same tiles.
  A.blockPool = function (p) {
    var pool = p.tiles.slice();
    if (p.fix) {
      var left = p.tiles.slice();
      p.fix.forEach(function (t) { var k = left.indexOf(t); if (k >= 0) left.splice(k, 1); else pool.push(t); });
    }
    return pool.concat(p.extra);
  };
  A.blockTiles = function (p) {
    var pool = A.blockPool(p), all = shuffle(pool.map(function (text, i) { return { i: i, text: text }; }));
    // never hand out the tiles already in the right order
    if (all.length > 2 && all.map(function (x) { return x.i; }).join() === pool.map(function (_, k) { return k; }).join()) all.push(all.shift());
    return all;
  };
  // What is in the tray when the puzzle starts: nothing, or the broken query for a "fix the bug" puzzle.
  A.blockStart = function (p, tiles) {
    if (!p.fix) return [];
    var free = tiles.slice();
    return p.fix.map(function (text) { for (var k = 0; k < free.length; k++) if (free[k].text === text) return free.splice(k, 1)[0]; return null; }).filter(Boolean);
  };

  // A hint never changes the tray: it points at the first tile that is wrong, or at the tile that should come next.
  A.blockHint = function (p, chosen) {
    for (var k = 0; k < chosen.length; k++) {
      if (k >= p.tiles.length || chosen[k] !== p.tiles[k]) return { wrong: k, text: chosen[k], say: 'This tile is not right here. Tap it to take it out.' };
    }
    if (chosen.length < p.tiles.length) return { next: p.tiles[chosen.length], say: 'Next comes: ' + p.tiles[chosen.length] };
    return { say: 'Your tiles match the answer. Press Check.' };
  };

  // 3 stars: right at the first Check with no hint. Every extra Check or hint costs one star (never below 1).
  A.starsFor = function (checks, hints) { var cost = Math.max(0, checks - 1) + hints; return cost === 0 ? 3 : cost === 1 ? 2 : 1; };

  // What kind of SQL a tile holds, for its colour.
  var KW = /^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|ON|AND|OR|NOT|DISTINCT|DESC|ASC|LIMIT \d+|WITH \w+ AS|\w+ AS)$/i;
  A.tileKind = function (text) {
    var t = String(text).trim();
    if (KW.test(t)) return 'kw';
    if (/^\(?\s*SELECT\b|^WITH\b|^\(/i.test(t) && /\(/.test(t)) return 'sub';
    if (/'/.test(t) || /[<>=]/.test(t) || /\bBETWEEN\b|\bLIKE\b|\bIS NULL\b|\bIN\b/i.test(t)) return 'cond';
    if (/\(/.test(t)) return 'fn';
    if (/^[a-z_]+( [a-z]{1,2})?$/.test(t) && (DA.datasets.retail.tables.concat(DA.datasets.lab.tables).some(function (x) { return t.split(' ')[0] === x.name; }))) return 'tbl';
    return 'col';
  };

  function norm(sql) { return sql.replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim().toLowerCase(); }
  // ORDER BY that sorts the final result (not one inside OVER (…) or a subquery): only then does row order matter.
  function sortsResult(sql) {
    var flat = sql, prev;
    do { prev = flat; flat = flat.replace(/\([^()]*\)/g, ' '); } while (flat !== prev);
    return /order\s+by/i.test(flat);
  }
  A.sortsResult = sortsResult;
  // Checks an arrangement. With a database (`run` = function(sql) -> result or throws) the RESULTS are compared,
  // so any equivalent query passes; without one (engine not loaded) only the reference arrangement passes.
  A.blockCheck = function (p, chosen, run) {
    var sql = chosen.join(' ');
    if (!chosen.length) return { ok: false, message: 'Tap the tiles to build the query.' };
    if (!run) return norm(sql) === norm(p.sql) ? { ok: true, message: 'Correct!' } : { ok: false, message: 'Not quite. Check the order of the tiles.' };
    var got, want;
    try { got = run(sql); } catch (e) { return { ok: false, message: 'The database says: ' + String(e.message || e), error: true }; }
    want = run(p.sql);
    var cmp = DA.compareResults(got, want, { ordered: sortsResult(p.sql) });
    return { ok: cmp.ok, message: cmp.ok ? 'Correct! Your query returns the right result.' : cmp.message, result: got };
  };
})();
