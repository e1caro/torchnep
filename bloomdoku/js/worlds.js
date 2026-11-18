/* Bloomdoku worlds: a map of 11 worlds x 4 levels (8 classic worlds, then 3 of twin gardens with two figures in
 * every cell). Each world introduces one new rule and its levels get harder;
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
    // Twin gardens: two figures in every cell (engine.js, buildTwin). 12 levels x 100 gardens = 1,200 of them.
    world('🐥', 'Twin Sprouts', '#F28A2E', 'Two figures in every cell, and no couple appears twice.',
      'Each cell holds a couple, like 4 and 7. The first figures follow the sudoku rule, the second figures follow it too, and the same couple never appears in two cells.',
      ['Couples', 'Two sudokus at once', 'No couple twice'], '🐥', [
        L('First couples', 'A 4×4 garden of couples, most of them planted', { n: 4, twin: true, givens: 20, tier: 1 }),
        L('Shy couples', 'A 4×4 garden with few figures planted', { n: 4, twin: true, givens: 12, tier: 1 }),
        L('Opening dance', 'The 9×9 ballroom, nearly full', { n: 9, twin: true, givens: 130, tier: 1 }),
        L('Find your partner', 'Many half couples to finish', { n: 9, twin: true, givens: 112, tier: 1 }),
      ]),
    world('💃', 'Garden Ball', '#E0457B', 'Two figures in every cell, and no couple appears twice.',
      'The full ballroom: 81 cells and 81 different couples, each exactly once. When you know every cell of one figure, its nine partners are all different.',
      ['81 couples, once each', 'Nine different partners'], '🦩', [
        L('Polka', 'Fewer figures: use both sudokus', { n: 9, twin: true, givens: 100, tier: 1 }),
        L('Foxtrot', 'A figure with only one place left in its layer', { n: 9, twin: true, givens: 90, tier: 1 }),
        L('Tango', 'The nine partners of one figure are all different', { n: 9, twin: true, givens: 80, tier: 1 }),
        L('Grand ball', 'More than half of the figures are yours to find', { n: 9, twin: true, givens: 70, tier: 1 }),
      ]),
    world('🎩', 'Midnight Waltz', '#5B7FD6', 'Two figures in every cell, and no couple appears twice.',
      'Few figures are planted, and often only half of a couple. Use both sudokus and the couples together.',
      ['Half couples', 'Tricks in two layers'], '🦚', [
        L('Moonlight', 'Sixty figures of 162', { n: 9, twin: true, givens: 62, tier: 2 }),
        L('Masquerade', 'Notes in both halves help', { n: 9, twin: true, givens: 56, tier: 2 }),
        L('Last dance', 'Fifty figures to start', { n: 9, twin: true, givens: 50, tier: 2 }),
        L('The great waltz', 'The emptiest ballroom', { n: 9, twin: true, givens: 45, tier: 2 }),
      ]),
  ];
  W.CLASSIC = 8; // worlds 1 to 8 are one figure a cell; the rest are twin gardens

  W.levels = [];
  W.worlds.forEach(function (w, wi) {
    w.n = wi + 1;
    w.levels.forEach(function (lv, li) { lv.world = w; lv.n = li + 1; lv.key = w.n + '-' + lv.n; lv.index = W.levels.length; W.levels.push(lv); });
  });
  W.level = function (key) { for (var i = 0; i < W.levels.length; i++) if (W.levels[i].key === key) return W.levels[i]; return null; };

  // The rules of a board, for the chips above it.
  W.rulesOf = function (p) {
    var out = [];
    if (p.twin) out.push('twin');
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
  W.twinTotal = function () { return W.levels.filter(function (lv) { return lv.p.twin; }).length * W.GARDENS; };

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
  // A level a friend challenged you in (state.invites) is open too.
  W.open = function (state, lv) { return lv.n === 1 || W.stars(state, lv.world.n + '-' + (lv.n - 1)) > 0 || !!(state.invites && state.invites[lv.key]); };
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

  /* ---------- player level ---------- */
  // Experience is worked out from the progress itself (nothing extra is saved, so it can never drift): every star of
  // every garden is worth more in bigger and harder levels, a world stamp is 100 and a daily bouquet 15 a star.
  W.worth = function (lv) { return 4 + lv.n * 2 + (lv.p.n === 9 ? 5 : lv.p.n >= 6 ? 2 : 0) + (lv.p.tier === 2 ? 3 : 0); };
  W.xp = function (state) {
    var xp = 0;
    W.levels.forEach(function (lv) {
      var r = rec(state, lv.key), w = W.worth(lv);
      if (!r) return;
      for (var i = 0; i < (r.g || '').length; i++) xp += w * (+r.g.charAt(i) || 0);
      xp += (r.extra || 0) * w * 2;
    });
    W.worlds.forEach(function (w) { if (W.worldState(state, w).complete) xp += 100; });
    Object.keys(state.daily || {}).forEach(function (d) { xp += 15 * (state.daily[d].stars || 1); });
    return xp;
  };
  W.levelAt = function (L) { return 15 * (L - 1) * (L + 2); }; // XP to reach level L: 0, 60, 150, 270, 420...
  W.TITLES = [[1, 'Seed'], [3, 'Sprout'], [6, 'Seedling'], [10, 'Bud'], [15, 'Blossom'], [20, 'Gardener'], [30, 'Master gardener'], [40, 'Garden keeper'], [50, 'Meadow legend']];
  W.title = function (L) { var t = W.TITLES[0][1]; W.TITLES.forEach(function (x) { if (L >= x[0]) t = x[1]; }); return t; };
  W.levelOf = function (xp) { var L = 1; while (W.levelAt(L + 1) <= xp) L++; return L; };
  W.player = function (state) {
    var xp = W.xp(state), L = W.levelOf(xp);
    return { xp: xp, level: L, from: W.levelAt(L), to: W.levelAt(L + 1), title: W.title(L) };
  };

  /* ---------- sharing progress: devices and friends ---------- */
  // What an account keeps online: the progress, never the settings or the garden in progress of one device.
  W.progress = function (state) {
    return { v: 1, levels: state.levels || {}, daily: state.daily || {}, seen: state.seen || {}, invites: state.invites || {}, avatar: state.avatar || 0,
      own: state.own || {}, bought: state.bought || {}, used: state.used || {} };
  };
  // Two copies of the progress become one that has everything of both. The order does not matter and merging
  // twice changes nothing, so two devices can play offline and nothing is ever lost.
  W.merge = function (a, b) {
    a = a || {}; b = b || {};
    var out = { v: 1, levels: {}, daily: {}, seen: {}, invites: {}, avatar: Math.max(a.avatar || 0, b.avatar || 0), own: {}, bought: {}, used: {} }, k;
    [a.levels || {}, b.levels || {}].forEach(function (src) {
      Object.keys(src).forEach(function (key) {
        var r = src[key], o = out.levels[key] || (out.levels[key] = { stars: 0, g: '', extra: 0, at: 0 }), g = '';
        for (var i = 0; i < Math.max(o.g.length, (r.g || '').length); i++) g += Math.max(+o.g.charAt(i) || 0, +(r.g || '').charAt(i) || 0);
        o.g = g; o.stars = Math.max(o.stars, r.stars || 0); o.extra = Math.max(o.extra, r.extra || 0); o.at = Math.max(o.at, r.at || 0);
      });
    });
    [a.daily || {}, b.daily || {}].forEach(function (src) {
      Object.keys(src).forEach(function (day) {
        var r = src[day], o = out.daily[day];
        if (!o || r.stars > o.stars || (r.stars === o.stars && (r.slips < o.slips || (r.slips === o.slips && JSON.stringify(r) < JSON.stringify(o))))) out.daily[day] = r;
      });
    });
    for (k in a.seen || {}) out.seen[k] = 1;
    for (k in b.seen || {}) out.seen[k] = 1;
    for (k in a.invites || {}) out.invites[k] = 1;
    for (k in b.invites || {}) out.invites[k] = 1;
    // the shop (js/shop.js): things owned are kept by both; helper charges bought and used only ever count up
    for (k in a.own || {}) out.own[k] = 1;
    for (k in b.own || {}) out.own[k] = 1;
    ['bought', 'used'].forEach(function (f) {
      [a[f] || {}, b[f] || {}].forEach(function (src) { for (var id in src) out[f][id] = Math.max(out[f][id] || 0, src[id] | 0); });
    });
    return out;
  };
  // What friends see of a player: level, totals, the best stars of each level (their garden) and today's bouquet.
  // Never the settings, the gardens in progress or anything typed.
  W.publicProfile = function (state, today) {
    var p = W.player(state), tot = W.totals(state), day = today || W.dayKey(), d = (state.daily || {})[day];
    return {
      v: 1, lvl: p.level, xp: p.xp, stars: tot.stars, solved: tot.solved, stamps: tot.stamps, dailies: tot.dailies,
      streak: W.streak(state.daily, day), av: state.avatar || 0, hat: (state.wear && state.wear.hat) || 'flower',
      lv: W.levels.map(function (lv) { return W.stars(state, lv.key); }).join(''),
      day: d ? { d: day, stars: d.stars, slips: d.slips, time: d.time || 0 } : null,
    };
  };

  root.BD = root.BD || {};
  root.BD.worlds = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = W;
})(typeof window !== 'undefined' ? window : globalThis);
