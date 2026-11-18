/* Bloomdoku worlds: a map of 8 worlds x 4 levels. Each world introduces one new rule and its levels get harder;
 * every level makes new puzzles from a seed, so no level ever runs out. Pure logic, no DOM.
 *
 * World: { icon, name, color, rule, intro, concepts: [...], stamp, levels: [{ name, teaches, p }] }
 * `p` holds the generator settings of a level (read by engine.js: n, jigsaw, diag, knight, vines, parity, givens, tier, hard).
 * Level keys ("3-2" = world 3, level 2) are saved progress (state.levels['3-2']): never rename them, only add.
 */
(function (root) {
  'use strict';
  var E = root.BD && root.BD.engine ? root.BD.engine : require('./engine.js');
  var W = {};

  function world(icon, name, color, rule, intro, concepts, stamp, levels) {
    return { icon: icon, name: name, color: color, rule: rule, intro: intro, concepts: concepts, stamp: stamp, levels: levels };
  }
  function L(name, teaches, p) { return { name: name, teaches: teaches, p: p }; }

  W.worlds = [
    world('🌱', 'Sprout Nursery', '#4FB06D', 'Every row, column and plot holds each flower once.',
      'Small gardens to learn the one rule of sudoku: no flower twice in a row, a column or a plot.',
      ['Rows and columns', 'Plots', 'The last free cell'], '🐛', [
        L('Four little seeds', 'A 4×4 garden with plenty of flowers planted', { n: 4, givens: 9, tier: 1 }),
        L('Fewer seeds', 'A 4×4 garden with more to plant', { n: 4, givens: 6, tier: 1 }),
        L('Six in a row', 'A 6×6 garden: plots are two rows tall', { n: 6, givens: 20, tier: 1 }),
        L('Nursery graduate', 'A 6×6 garden with few flowers to start', { n: 6, givens: 14, tier: 1 }),
      ]),
    world('🌷', 'Tulip Meadow', '#F2668B', 'The classic garden: nine rows, nine columns, nine plots.',
      'The full 9×9 garden. Look for a flower with only one place left, or a cell where only one flower fits.',
      ['Only one place', 'Only one fits', 'Pencil notes'], '🐞', [
        L('First bed', 'Many flowers planted: finish rows and plots', { n: 9, givens: 44, tier: 1 }),
        L('Morning rows', 'Scan rows and columns for the missing flower', { n: 9, givens: 38, tier: 1 }),
        L('Hidden bulbs', 'A flower with only one place left in its plot', { n: 9, givens: 32, tier: 1 }),
        L('Meadow master', 'Pairs and locked flowers: notes help', { n: 9, givens: 25, tier: 2, hard: true }),
      ]),
    world('🐝', 'Honeybee Crossing', '#E8A417', 'The two bee paths also hold each flower once.',
      'Two bee paths cross the garden from corner to corner. Each one holds every flower once, like a row.',
      ['Diagonals', 'The centre sees both paths'], '🐝', [
        L('Two bee paths', 'A 6×6 garden with two diagonals', { n: 6, diag: true, givens: 14, tier: 1 }),
        L('Crossing', 'The 9×9 garden with bee paths', { n: 9, diag: true, givens: 36, tier: 1 }),
        L('Busy hive', 'Fewer flowers: use the paths early', { n: 9, diag: true, givens: 30, tier: 1 }),
        L('Queen bee', 'Paths, pairs and locked flowers', { n: 9, diag: true, givens: 23, tier: 2, hard: true }),
      ]),
    world('🐸', 'Lily Pond', '#2FB5A6', 'Plots are wobbly lily pads, each holding every flower once.',
      'No square plots here. Each lily pad has its own shape, and still holds every flower once.',
      ['Lily pads', 'Odd sizes: 5 and 7'], '🐸', [
        L('Five pads', 'A 5×5 pond', { n: 5, jigsaw: true, givens: 10, tier: 1 }),
        L('Six pads', 'A 6×6 pond', { n: 6, jigsaw: true, givens: 14, tier: 1 }),
        L('Seven pads', 'A 7×7 pond', { n: 7, jigsaw: true, givens: 22, tier: 1 }),
        L('The big pond', 'A 9×9 pond', { n: 9, jigsaw: true, givens: 34, tier: 2 }),
      ]),
    world('🌿', 'Vine Trellis', '#6BA83A', 'Numbers grow along each vine, from the bulb to the tip.',
      'Along a vine every number is bigger than the one before, starting at the round bulb. A long vine leaves few choices.',
      ['Vines grow', 'Bulbs are small, tips are big'], '🐌', [
        L('First tendrils', 'A 6×6 garden with four vines', { n: 6, vines: 4, givens: 12, tier: 1 }),
        L('Climbers', 'The 9×9 garden with six vines', { n: 9, vines: 6, givens: 32, tier: 1 }),
        L('Tangle', 'Nine vines and fewer flowers', { n: 9, vines: 9, givens: 26, tier: 2 }),
        L('Overgrown', 'Twelve vines, hardly any flowers', { n: 9, vines: 12, givens: 20, tier: 2 }),
      ]),
    world('🐇', 'Bunny Hollow', '#D98A5B', 'The same flower is never one bunny hop away.',
      'A bunny hops like a chess knight: two steps one way, one step to the side. Two equal flowers are never one hop apart.',
      ['The bunny hop', 'Eight hops from every cell'], '🐇', [
        L('First hops', 'Many flowers planted: watch the hops', { n: 9, knight: true, givens: 36, tier: 1 }),
        L('Burrow', 'Fewer flowers: hops rule cells out', { n: 9, knight: true, givens: 30, tier: 1 }),
        L('Warren', 'Hops and locked flowers', { n: 9, knight: true, givens: 24, tier: 2, hard: true }),
        L('Moon hop', 'Very few flowers: the hops do the work', { n: 9, knight: true, givens: 20, tier: 2 }),
      ]),
    world('🌙', 'Firefly Night', '#7A6FE0', 'Moon cells hold even numbers, sun cells odd ones.',
      'Fireflies light some cells. A moon cell holds an even number (2, 4, 6, 8); a sun cell an odd one (1, 3, 5, 7, 9).',
      ['Even and odd', 'Marks are clues too'], '🦉', [
        L('Dusk', 'A 6×6 garden with moons and suns', { n: 6, parity: 0.5, givens: 10, tier: 1 }),
        L('First lights', 'The 9×9 garden with marks', { n: 9, parity: 0.4, givens: 30, tier: 1 }),
        L('Glow', 'Fewer flowers, read the marks', { n: 9, parity: 0.4, givens: 24, tier: 2 }),
        L('Midnight', 'Marks nearly everywhere, flowers nearly nowhere', { n: 9, parity: 0.6, givens: 16, tier: 2 }),
      ]),
    world('🌈', 'Rainbow Summit', '#D05FC2', 'Boss gardens: several rules at once.',
      'The summit mixes the rules you know. Each garden lists its rules at the top; all of them count.',
      ['Mixed rules', 'Boss gardens'], '🦋', [
        L('Bees on the trellis', 'Bee paths and vines', { n: 9, diag: true, vines: 8, givens: 26, tier: 2 }),
        L('Fireflies on the pond', 'Lily pads and moon and sun cells', { n: 9, jigsaw: true, parity: 0.4, givens: 26, tier: 2 }),
        L('Bunnies on the paths', 'Bunny hops and bee paths', { n: 9, knight: true, diag: true, givens: 22, tier: 2 }),
        L('The grand bouquet', 'Lily pads, vines and fireflies', { n: 9, jigsaw: true, vines: 8, parity: 0.4, givens: 18, tier: 2 }),
      ]),
  ];

  W.levels = [];
  W.worlds.forEach(function (w, wi) {
    w.n = wi + 1;
    w.levels.forEach(function (lv, li) { lv.world = w; lv.n = li + 1; lv.key = w.n + '-' + lv.n; lv.index = W.levels.length; W.levels.push(lv); });
  });
  W.level = function (key) { for (var i = 0; i < W.levels.length; i++) if (W.levels[i].key === key) return W.levels[i]; return null; };

  // The rules of a board, for the chips above it.
  W.rulesOf = function (p) {
    var out = [];
    if (p.jigsaw) out.push('pads');
    if (p.diag) out.push('diag');
    if (p.vines) out.push('vines');
    if (p.knight) out.push('knight');
    if (p.parity) out.push('parity');
    return out;
  };
  // Worlds where the order of the numbers matters: flowers and critters show their number there.
  W.needsNumbers = function (p) { return !!(p.vines || p.parity); };

  /* ---------- puzzles from seeds ---------- */
  // Every level has 100 numbered gardens (32 levels x 100 = 3,200 puzzles), the same for everyone, and keeps making
  // new ones after that. Garden number g (0-based) of a level is always generated from the same seed.
  W.GARDENS = 100;
  W.GEN = 1; // bump only if the generator changes what a seed gives; saved games carry their own puzzle
  W.seed = function (key, garden) { return 'bloom:' + W.GEN + ':' + key + ':' + garden; };
  W.puzzle = function (key, garden) {
    var lv = W.level(key);
    var pz = E.generate(lv.p, W.seed(key, garden));
    pz.key = key; pz.garden = garden;
    return pz;
  };
  W.total = function () { return W.levels.length * W.GARDENS; };

  /* ---------- the daily bouquet ---------- */
  // One puzzle a day, the same for everyone. The rule follows the weekday (0 = Sunday).
  W.DAILY = [
    { name: 'Sunday mix', p: { n: 9, diag: true, parity: 0.35, givens: 24, tier: 2 } },
    { name: 'Classic Monday', p: { n: 9, givens: 30, tier: 2 } },
    { name: 'Bee path Tuesday', p: { n: 9, diag: true, givens: 28, tier: 2 } },
    { name: 'Pond Wednesday', p: { n: 9, jigsaw: true, givens: 32, tier: 2 } },
    { name: 'Vine Thursday', p: { n: 9, vines: 9, givens: 24, tier: 2 } },
    { name: 'Bunny Friday', p: { n: 9, knight: true, givens: 26, tier: 2 } },
    { name: 'Firefly Saturday', p: { n: 9, parity: 0.45, givens: 22, tier: 2 } },
  ];
  W.dayKey = function (date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  W.parseDay = function (key) { var p = key.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  W.dailyOf = function (dayKey) { return W.DAILY[W.parseDay(dayKey).getDay()]; };
  W.dailyPuzzle = function (dayKey) {
    var pz = E.generate(W.dailyOf(dayKey).p, 'bloom:' + W.GEN + ':daily:' + dayKey);
    pz.key = 'daily'; pz.day = dayKey;
    return pz;
  };
  // Days in a row with a finished daily, ending today or yesterday.
  W.streak = function (daily, today) {
    var d = W.parseDay(today || W.dayKey()), n = 0;
    if (!(daily && daily[W.dayKey(d)])) d.setDate(d.getDate() - 1);
    while (daily && daily[W.dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  /* ---------- stars and progress ---------- */
  // state.levels[key] = { stars: best of the level, g: one digit per garden ("3021..." = stars of gardens 1, 2, 3...),
  //                       extra: gardens solved after the 100th, at: the garden Continue opens }
  // ★ the garden bloomed · ★ on your own (nothing revealed: no owl, no frog, no flower named by the bee)
  // ★ not a petal out of place (no wrong flower planted)
  W.starsFor = function (result) {
    return 1 + (!result.frog && !result.owl ? 1 : 0) + (!result.slips ? 1 : 0);
  };
  function rec(state, key) { return (state.levels && state.levels[key]) || null; }
  W.stars = function (state, key) { var r = rec(state, key); return r ? r.stars || 0 : 0; };
  W.gardenStars = function (state, key, garden) { var r = rec(state, key); return r && r.g && garden < r.g.length ? +r.g.charAt(garden) || 0 : 0; };
  W.solved = function (state, key) {
    var r = rec(state, key), n = 0;
    if (!r) return 0;
    for (var i = 0; i < (r.g || '').length; i++) if (r.g.charAt(i) !== '0') n++;
    return n + (r.extra || 0);
  };
  // The garden Continue opens: the first one without a star from where the player is, then from the start,
  // then the endless ones after the 100th.
  W.at = function (state, key) {
    var r = rec(state, key), from = r ? r.at || 0 : 0, i;
    if (from >= W.GARDENS) return from;
    for (i = from; i < W.GARDENS; i++) if (!W.gardenStars(state, key, i)) return i;
    for (i = 0; i < from; i++) if (!W.gardenStars(state, key, i)) return i;
    return W.GARDENS + (r ? r.extra || 0 : 0);
  };
  // Every world is open; inside a world a level opens when the one before has a star.
  W.open = function (state, lv) { return lv.n === 1 || W.stars(state, lv.world.n + '-' + (lv.n - 1)) > 0; };
  W.worldState = function (state, w) {
    var stars = 0, done = 0, solved = 0;
    w.levels.forEach(function (lv) { var s = W.stars(state, lv.key); stars += s; if (s) done++; solved += W.solved(state, lv.key); });
    return { stars: stars, max: w.levels.length * 3, done: done, complete: done === w.levels.length, solved: solved };
  };
  W.totals = function (state) {
    var stars = 0, done = 0, stamps = 0, solved = 0;
    W.worlds.forEach(function (w) { var ws = W.worldState(state, w); stars += ws.stars; done += ws.done; solved += ws.solved; if (ws.complete) stamps++; });
    return { stars: stars, max: W.levels.length * 3, done: done, levels: W.levels.length, stamps: stamps, solved: solved, gardens: W.total(), dailies: Object.keys(state.daily || {}).length };
  };
  // Where Continue goes: the first open level without a star, in map order; then the first without three.
  W.next = function (state) {
    var i;
    for (i = 0; i < W.levels.length; i++) if (!W.stars(state, W.levels[i].key) && W.open(state, W.levels[i])) return W.levels[i];
    for (i = 0; i < W.levels.length; i++) if (W.stars(state, W.levels[i].key) < 3) return W.levels[i];
    return W.levels[W.levels.length - 1];
  };
  // Moves a level on to another garden without solving this one ("New seeds").
  W.skip = function (state, key, garden) {
    state.levels = state.levels || {};
    var r = state.levels[key] || (state.levels[key] = { stars: 0, g: '', extra: 0, at: 0 });
    if (garden >= W.GARDENS) { r.extra = (r.extra || 0) + 1; r.at = W.GARDENS + r.extra; return r.at; } // an endless garden: just make another
    r.at = garden + 1 < W.GARDENS ? garden + 1 : 0;
    r.at = W.at(state, key);
    return r.at;
  };
  // Saves a finished garden: its stars and the level's best are kept, Continue moves on. Returns what changed.
  W.finish = function (state, key, garden, result) {
    state.levels = state.levels || {};
    var r = state.levels[key] || (state.levels[key] = { stars: 0, g: '', extra: 0, at: 0 });
    var stars = W.starsFor(result), before = r.stars || 0, lv = W.level(key);
    var worldBefore = W.worldState(state, lv.world).complete, had = 0;
    if (garden < W.GARDENS) {
      var g = r.g || '';
      while (g.length <= garden) g += '0';
      had = +g.charAt(garden);
      r.g = g.slice(0, garden) + Math.max(had, stars) + g.slice(garden + 1);
      r.at = garden + 1;
    } else { r.extra = (r.extra || 0) + 1; r.at = W.GARDENS + r.extra; }
    r.stars = Math.max(before, stars);
    r.at = W.at(state, key);
    return { stars: stars, best: r.stars, improved: stars > before, first: !before, again: !!had, next: r.at, stamp: !worldBefore && W.worldState(state, lv.world).complete };
  };
  W.finishDaily = function (state, dayKey, result) {
    state.daily = state.daily || {};
    var stars = W.starsFor(result), had = state.daily[dayKey];
    if (!had || stars > had.stars) state.daily[dayKey] = { stars: stars, slips: result.slips || 0, bees: result.bees || 0, frog: !!result.frog, owl: !!result.owl, time: result.time || 0 };
    return { stars: stars, best: state.daily[dayKey].stars, first: !had };
  };

  root.BD = root.BD || {};
  root.BD.worlds = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
})(typeof window !== 'undefined' ? window : globalThis);
