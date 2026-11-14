/* Arcade worlds: the progression shared by the six arcade games (logic only, tested in Node).
 * A level is played in rounds of five generated puzzles. The round's stars decide the level's stars:
 *   ★ 3 or more solved · ★★ 4 or more solved and 10+ stars · ★★★ all 5 solved and 13+ stars.
 * The best result per level is kept in state.arcade["game:key"] (merged with max). Clearing a level (★) pays
 * XP once and three stars pay a bonus once, so replaying is for practice, never for farming. Nothing is locked:
 * the map suggests an order, and every level stays open. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var AW = (DA.arcadeWorlds = {});

  AW.ROUND = 5;
  AW.games = function () { return DA.arcadeOrder.slice(); };
  AW.def = function (game) { return DA.arcadeCatalog[game]; };

  var cache = {};
  // Every level of a game, in play order: { game, key, w, l, n (1-16), world, name, teaches, icon, p }.
  AW.levels = function (game) {
    if (cache[game]) return cache[game];
    var out = [], g = AW.def(game);
    g.worlds.forEach(function (world, wi) {
      world.levels.forEach(function (lv, li) {
        var n = wi * 4 + li + 1, bl = typeof lv === 'number' ? DA.blockLevels[lv - 1] : null;
        out.push({
          game: game, key: game === 'blocks' ? String(lv) : (wi + 1) + '-' + (li + 1), w: wi + 1, l: li + 1, n: n, world: world,
          name: bl ? bl.name : lv.name, teaches: bl ? bl.teaches : lv.teaches, icon: bl ? bl.icon : world.icon, p: bl ? { n: lv } : lv.p,
        });
      });
    });
    return (cache[game] = out);
  };
  AW.level = function (game, key) { return AW.levels(game).filter(function (x) { return x.key === String(key); })[0] || null; };
  AW.label = function (lv) { return 'Level ' + lv.w + '.' + lv.l; };
  AW.next = function (lv) { var all = AW.levels(lv.game), i = all.indexOf(lv); return all[i + 1] || null; };

  // Stars a game can derive from older progress (SQL blocks: a level whose handmade puzzles are all solved).
  AW.derived = { blocks: function (key, s) { return DA.arcade && DA.arcade.handmadeStars ? DA.arcade.handmadeStars(key, s) : 0; } };
  AW.stars = function (game, key, s) {
    s = s || ui.state;
    var k = (s.arcade || {})[game + ':' + key] || 0, d = AW.derived[game] ? AW.derived[game](key, s) : 0;
    return Math.max(k, d);
  };

  // A round's stars for the level, from the stars of its five puzzles (0 = shown or missed).
  AW.roundStars = function (marks) {
    var solved = marks.filter(function (m) { return m > 0; }).length, sum = marks.reduce(function (a, m) { return a + m; }, 0);
    if (solved >= AW.ROUND && sum >= 13) return 3;
    if (solved >= 4 && sum >= 10) return 2;
    return solved >= 3 ? 1 : 0;
  };

  // Save a finished round. Returns what changed, for the results screen.
  AW.record = function (game, key, marks) {
    var s = ui.state, G = DA.game, lv = AW.level(game, key);
    if (!lv) return null;
    var got = AW.roundStars(marks), before = AW.stars(game, key), xp = 0;
    if (got > ((s.arcade || {})[game + ':' + key] || 0)) { s.arcade[game + ':' + key] = got; ui.save(); }
    if (got >= 1) xp += G.award('arcade:' + game + ':' + key, ui.XP.arcadeLevel, AW.label(lv) + ' cleared');
    if (got === 3) xp += G.award('arcade3:' + game + ':' + key, ui.XP.arcadeStar, AW.label(lv) + ': three stars');
    return { stars: got, before: before, best: Math.max(before, got), newBest: got > before, cleared: got >= 1, firstClear: got >= 1 && before === 0, xp: xp, level: lv, next: AW.next(lv) };
  };

  AW.worldStats = function (game, w, s) {
    var lvs = AW.levels(game).filter(function (x) { return x.w === w; }), stars = 0, cleared = 0;
    lvs.forEach(function (x) { var k = AW.stars(game, x.key, s); stars += k; if (k) cleared++; });
    return { stars: stars, max: lvs.length * 3, cleared: cleared, total: lvs.length, complete: cleared === lvs.length };
  };
  AW.totals = function (game, s) {
    var lvs = AW.levels(game), stars = 0, cleared = 0, worlds = 0;
    lvs.forEach(function (x) { var k = AW.stars(game, x.key, s); stars += k; if (k) cleared++; });
    AW.def(game).worlds.forEach(function (_, i) { if (AW.worldStats(game, i + 1, s).complete) worlds++; });
    return { stars: stars, max: lvs.length * 3, cleared: cleared, total: lvs.length, worlds: worlds };
  };
  // Where "Continue" goes: the first level without stars; when all have some, the first with the fewest.
  AW.current = function (game, s) {
    var lvs = AW.levels(game), i, best = lvs[0], low = 4;
    for (i = 0; i < lvs.length; i++) if (!AW.stars(game, lvs[i].key, s)) return lvs[i];
    lvs.forEach(function (x) { var k = AW.stars(game, x.key, s); if (k < low) { low = k; best = x; } });
    return best;
  };
  // The level the map suggests next to someone at `cur` (used to mark later levels as "after" without locking them).
  AW.ahead = function (lv, cur) { return lv.n > cur.n; };

  // Across all games, for badges.
  AW.summary = function (s) {
    var out = { stars: 0, cleared: 0, worlds: 0, firstWorlds: 0 };
    AW.games().forEach(function (g) {
      var t = AW.totals(g, s);
      out.stars += t.stars; out.cleared += t.cleared; out.worlds += t.worlds;
      if (AW.worldStats(g, 1, s).complete) out.firstWorlds++;
    });
    return out;
  };

  // A fresh seed for a round: rounds never repeat, so there is no end to the puzzles in a level.
  AW.seed = function () { return Math.floor((DA.arcade && DA.arcade.rand ? DA.arcade.rand() : Math.random()) * 2147483647); };
})();
