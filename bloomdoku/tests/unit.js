/* Bloomdoku unit tests (Node only):   node tests/unit.js          a sample of gardens per level, a few seconds
 *                                     node tests/unit.js --all    every one of the 4,400 gardens, about a minute
 * Accounts, sync, friends and messages: tests/unit-cloud.js. The database rules: tests/sql.sh. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'js', 'engine.js'));
const W = require(path.join(root, 'js', 'worlds.js'));
const Shop = require(path.join(root, 'js', 'shop.js'));
const ALL = process.argv.includes('--all');
const read2 = (f) => fs.readFileSync(path.join(root, f), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.message)); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

// Every rule of a puzzle holds in its solution, and the puzzle is well formed.
function checkPuzzle(pz, p, where) {
  if (p.twin) return checkTwin(pz, p, where);
  const n = pz.n, N = n * n, sol = pz.solution;
  ok(n === p.n && sol.length === N && pz.givens.length === N && pz.regions.length === N, where + ': sizes');
  const groups = E.build(pz).groups;
  ok(groups.length === 3 * n + (p.diag ? 2 : 0), where + ': group count');
  groups.forEach((g) => {
    ok(g.cells.length === n, where + ': a ' + g.kind + ' has ' + g.cells.length + ' cells');
    eq(g.cells.map((c) => sol[c]).sort(), Array.from({ length: n }, (_, i) => i + 1), where + ': ' + g.kind + ' ' + g.i);
  });
  for (let r = 0; r < n; r++) ok(E.connected(n, pz.regions, r), where + ': plot ' + r + ' is in two pieces');
  if (!p.jigsaw) eq(pz.regions, E.boxRegions(n), where + ': square plots');
  else ok(pz.regions.join() !== E.boxRegions(n).join(), where + ': lily pads are not squares');
  if (p.knight) {
    for (let c = 0; c < N; c++) {
      const r = Math.floor(c / n), k = c % n;
      [[1, 2], [2, 1], [-1, 2], [-2, 1]].forEach(([dr, dk]) => {
        const rr = r + dr, kk = k + dk;
        if (rr >= 0 && rr < n && kk >= 0 && kk < n) ok(sol[rr * n + kk] !== sol[c], where + ': equal flowers one hop apart');
      });
    }
  }
  if (p.vines) {
    ok(pz.vines.length >= Math.ceil(p.vines / 2), where + ': only ' + pz.vines.length + ' vines of ' + p.vines);
    const used = {};
    pz.vines.forEach((v) => {
      ok(v.length >= 3, where + ': a vine shorter than 3');
      v.forEach((c, i) => {
        ok(!used[c], where + ': two vines share a cell'); used[c] = 1;
        if (i) { ok(sol[c] > sol[v[i - 1]], where + ': a vine goes down'); ok(E.neighbours(n, v[i - 1]).includes(c), where + ': a vine jumps'); }
      });
    });
  }
  if (p.parity) pz.parity.forEach((m, c) => ok(m === 0 || (m === 1) === (sol[c] % 2 === 1), where + ': wrong moon or sun'));
  pz.givens.forEach((g, c) => ok(g === 0 || g === sol[c], where + ': a given differs from the solution'));
  const S = E.build(pz);
  const res = E.solve(S, pz.givens, { limit: 2 });
  ok(res.count === 1, where + ': ' + res.count + ' solutions');
  eq(res.solution, sol, where + ': the search solver finds the stored solution');
  const lg = E.logic(S, pz.givens, p.tier);
  ok(lg.solved, where + ': logic up to tier ' + p.tier + ' does not finish it');
  eq(lg.vals, sol, where + ': logic reaches the stored solution');
  ok(pz.tier <= p.tier, where + ': tier');
  if (p.hard) ok(pz.tier === 2, where + ': a hard level needs a trick');
  ok(!E.conflicts(S, sol).some(Boolean), where + ': the solution shows a conflict');
}
// A twin garden: each layer is a sudoku, every couple appears exactly once, and the usual promises hold.
function checkTwin(pz, p, where) {
  const n = pz.n, h = n * n, sol = pz.solution;
  ok(pz.twin && n === p.n && sol.length === 2 * h && pz.givens.length === 2 * h && pz.regions.length === h, where + ': sizes');
  eq(pz.regions, E.boxRegions(n), where + ': square plots');
  const S = E.build(pz);
  eq([S.N, S.twin, S.groups.length], [2 * h, h, 6 * n], where + ': structure');
  S.groups.forEach((g) => eq(g.cells.map((c) => sol[c]).sort(), Array.from({ length: n }, (_, i) => i + 1), where + ': ' + g.kind + ' ' + g.i + ' of layer ' + g.layer));
  const couples = new Set();
  for (let c = 0; c < h; c++) couples.add(sol[c] + '-' + sol[h + c]);
  eq(couples.size, h, where + ': a couple appears twice');
  pz.givens.forEach((g, c) => ok(g === 0 || g === sol[c], where + ': a given differs from the solution'));
  const res = E.solve(S, pz.givens, { limit: 2 });
  ok(res.count === 1, where + ': ' + res.count + ' solutions');
  eq(res.solution, sol, where + ': the search solver finds the stored solution');
  const lg = E.logic(S, pz.givens, p.tier);
  ok(lg.solved, where + ': logic up to tier ' + p.tier + ' does not finish it');
  eq(lg.vals, sol, where + ': logic reaches the stored solution');
  ok(pz.tier <= p.tier, where + ': tier');
  ok(!E.conflicts(S, sol).some(Boolean), where + ': the solution shows a conflict');
}
function fingerprint(pz) { return pz.givens.join('') + '|' + pz.regions.join('') + '|' + JSON.stringify(pz.vines) + '|' + (pz.parity || []).join(''); }

console.log('Catalog');
test('11 worlds × 4 levels, keys 1-1 … 11-4 in order: 8 classic worlds, then 3 of twin gardens', () => {
  eq([W.worlds.length, W.CLASSIC], [11, 8]);
  eq(W.worlds.map((w) => w.levels.every((lv) => !!lv.p.twin)), [false, false, false, false, false, false, false, false, true, true, true]);
  eq(W.worlds.map((w) => w.levels.some((lv) => !!lv.p.twin)), W.worlds.map((w) => w.n > 8));
  const keys = [];
  for (let w = 1; w <= 11; w++) for (let l = 1; l <= 4; l++) keys.push(w + '-' + l);
  eq(W.levels.map((l) => l.key), keys);
});
test('level names are saved progress: none renamed or moved', () => {
  eq(W.levels.map((l) => l.name), ['First seeds', 'Fewer seeds', 'Morning dew', 'Nursery graduate', 'First bed', 'Morning rows', 'Hidden bulbs', 'Meadow master',
    'Two bee paths', 'Crossing', 'Busy hive', 'Queen bee', 'Five pads', 'Six pads', 'Seven pads', 'The big pond', 'First tendrils', 'Climbers', 'Tangle', 'Overgrown',
    'First hops', 'Burrow', 'Warren', 'Moon hop', 'Dusk', 'First lights', 'Glow', 'Midnight', 'Bees on the trellis', 'Fireflies on the pond', 'Bunnies on the paths', 'The grand bouquet',
    'First couples', 'Shy couples', 'Opening dance', 'Find your partner', 'Polka', 'Foxtrot', 'Tango', 'Grand ball', 'Moonlight', 'Masquerade', 'Last dance', 'The great waltz']);
});
test('every world has an icon, a colour, a rule, an intro, concepts and a stamp', () => {
  W.worlds.forEach((w) => {
    ok(w.icon && w.stamp && /^#[0-9A-F]{6}$/i.test(w.color) && w.rule && w.intro && w.concepts.length >= 2, w.name);
    w.levels.forEach((lv) => ok(lv.name && lv.teaches && lv.p && lv.p.n >= 4 && lv.p.n <= 9 && lv.p.givens > 0 && (lv.p.tier === 1 || lv.p.tier === 2), lv.key));
  });
  eq(new Set(W.worlds.map((w) => w.color)).size, 11, 'colours differ');
});
test('levels of a world get harder: no more flowers to start than the level before on the same board', () => {
  W.worlds.forEach((w) => w.levels.forEach((lv, i) => {
    const prev = w.levels[i - 1];
    if (prev && prev.p.n === lv.p.n && w.n !== 8) ok(lv.p.givens <= prev.p.givens && lv.p.tier >= prev.p.tier, lv.key);
  }));
});
test('at least 3,000 classic gardens (32 levels × 100) and about 1,000 twin gardens (12 × 100)', () => { eq([W.total() - W.twinTotal(), W.twinTotal(), W.total()], [3200, 1200, 4400]); });
test('the map starts with normal 9×9 gardens: no level is a 4×4 board, and worlds 1, 2 and the twin worlds are 9×9 throughout', () => {
  W.levels.forEach((lv) => ok(lv.p.n >= 5, lv.key + ' is ' + lv.p.n + '×' + lv.p.n));
  [1, 2, 9, 10, 11].forEach((w) => W.worlds[w - 1].levels.forEach((lv) => eq(lv.p.n, 9, lv.key)));
  eq(W.next({ levels: {} }).key, '1-1');
});
test('4×4 boards live only in the tutorials: three classic lessons and two twin ones, each a valid garden', () => {
  eq([W.TUTORIAL.classic.length, W.TUTORIAL.twin.length], [3, 2]);
  eq(W.TUTORIAL.classic.map((l) => l.coach), [2, 1, 0], 'less help each time');
  Object.keys(W.TUTORIAL).forEach((kind) => W.TUTORIAL[kind].forEach((lesson, step) => {
    const pz = W.tutorialPuzzle(kind, step);
    eq([pz.n, pz.kind, pz.step, !!pz.twin], [4, kind, step, kind === 'twin']);
    checkPuzzle(pz, lesson.p, 'tutorial ' + kind + ' ' + (step + 1));
    eq(pz, W.tutorialPuzzle(kind, step), 'the same lesson every time');
    ok(lesson.intro.length > 20);
  }));
});

console.log('Generator');
const sample = ALL ? W.GARDENS : 6;
const smallSpace = { '4-1': 1 }; // the smallest board of the map // small boards: check all 100 are different even in the quick run
let made = 0;
const t0 = Date.now();
W.levels.forEach((lv) => {
  test(lv.key + ' ' + lv.name + ': ' + (smallSpace[lv.key] ? W.GARDENS : sample) + ' gardens are valid, unique-solution, logic-solvable and all different', () => {
    const seen = new Set(), count = smallSpace[lv.key] ? W.GARDENS : sample;
    for (let g = 0; g < count; g++) {
      const pz = W.puzzle(lv.key, g);
      made++;
      if (g < sample) checkPuzzle(pz, lv.p, lv.key + ' garden ' + (g + 1));
      const fp = fingerprint(pz);
      ok(!seen.has(fp), lv.key + ': garden ' + (g + 1) + ' repeats an earlier one');
      seen.add(fp);
      eq(pz.garden, g); eq(pz.key, lv.key);
    }
  });
});
console.log('      (' + made + ' gardens in ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
test('the same seed always gives the same garden', () => {
  ['2-3', '4-4', '5-4', '8-4', '9-2', '11-3'].forEach((k) => eq(W.puzzle(k, 3), W.puzzle(k, 3), k));
  eq(W.dailyPuzzle('2026-11-18'), W.dailyPuzzle('2026-11-18'));
});
test('lily pads really wobble and stay in one piece (5, 6, 7 and 9)', () => {
  [5, 6, 7, 9].forEach((n) => {
    for (let s = 0; s < 10; s++) {
      const reg = E.jigsaw(n, E.rng('pads' + n + s)), size = {};
      reg.forEach((r) => { size[r] = (size[r] || 0) + 1; });
      for (let r = 0; r < n; r++) { eq(size[r], n, 'pad size'); ok(E.connected(n, reg, r), 'pad in two pieces'); }
      ok(reg.join() !== E.boxRegions(n).join(), 'pads did not move');
    }
  });
});

console.log('Hints');
test('following only the hints solves a garden of every level, and every hinted flower is right', () => {
  let couplesUsed = 0;
  W.levels.forEach((lv) => {
    const pz = W.puzzle(lv.key, 1), S = E.build(pz), vals = pz.givens.slice();
    let left = vals.filter((v) => !v).length, guard = 0;
    while (left && guard++ < 200) {
      const hint = E.hint(S, vals, 2);
      ok(!hint.broken && !hint.stuck, lv.key + ': no hint with ' + left + ' cells left');
      ok(['last', 'hidden', 'naked'].includes(hint.type), lv.key + ': hint type');
      eq(hint.v, pz.solution[hint.cell], lv.key + ': hinted flower');
      ok(!vals[hint.cell], lv.key + ': hint points at a planted cell');
      if (hint.type !== 'naked') ok(hint.g.cells.includes(hint.cell) && hint.g.cells.length === pz.n, lv.key + ': hint group');
      if (hint.g && hint.g.kind === 'couple') couplesUsed++;
      if (lv.p.tier === 1) eq(hint.via.length, 0, lv.key + ': an easy level never needs a trick');
      hint.via.forEach((e) => ok(e.cells.length >= 2 && e.removed.length > 0 && e.removed.every((r) => !(r[1] & (1 << (pz.solution[r[0]] - 1)))), lv.key + ': a trick removed the right flower'));
      vals[hint.cell] = hint.v; left--;
    }
    eq(vals, pz.solution, lv.key);
  });
  ok(couplesUsed > 20, 'twin gardens are solved through their couples too (' + couplesUsed + ' such hints)');
});
test('a wrong flower is a conflict; a board with a contradiction gives no false hint', () => {
  const pz = W.puzzle('2-1', 0), S = E.build(pz), vals = pz.givens.slice();
  const c = vals.indexOf(0), same = S.peers[c].find((o) => vals[o]);
  vals[c] = vals[same];
  const bad = E.conflicts(S, vals);
  ok(bad[c] && bad[same], 'both equal flowers are marked');
  eq(E.conflicts(S, pz.givens).some(Boolean), false);
});
test('finished rows, columns and plots are reported, and only when right', () => {
  const pz = W.tutorialPuzzle('classic', 0), S = E.build(pz);
  eq(E.doneGroups(S, pz.solution).length, 12);
  const vals = pz.solution.slice();
  vals[0] = 0;
  eq(E.doneGroups(S, vals).length, 9);
});
test('candidates never rule out the right flower', () => {
  ['5-3', '7-3', '8-4', '6-4'].forEach((k) => {
    const pz = W.puzzle(k, 2), cand = E.candidates(E.build(pz), pz.givens);
    pz.solution.forEach((v, c) => ok(cand[c] & (1 << (v - 1)), k + ' cell ' + c));
  });
});

console.log('Daily bouquet');
test('one rule per weekday, each daily valid; streak counts days in a row', () => {
  eq(W.DAILY.length, 7);
  for (let d = 16; d <= 22; d++) { // Monday 16 to Sunday 22 November 2026
    const day = '2026-11-' + d, info = W.dailyOf(day), pz = W.dailyPuzzle(day);
    eq(info, W.DAILY[new Date(2026, 10, d).getDay()]);
    checkPuzzle(pz, info.p, 'daily ' + day);
    eq(pz.day, day);
  }
  ok(/Monday/.test(W.dailyOf('2026-11-16').name) && /Sunday/.test(W.dailyOf('2026-11-22').name));
  ok(fingerprint(W.dailyPuzzle('2026-11-16')) !== fingerprint(W.dailyPuzzle('2026-11-23')), 'two Mondays differ');
  eq(W.dayKey(new Date(2026, 0, 5)), '2026-01-05');
  const daily = { '2026-11-18': {}, '2026-11-17': {}, '2026-11-16': {}, '2026-11-14': {} };
  eq(W.streak(daily, '2026-11-18'), 3);
  eq(W.streak(daily, '2026-11-19'), 3, 'yesterday still counts until today is over');
  eq(W.streak(daily, '2026-11-20'), 0);
  eq(W.streak({}, '2026-11-18'), 0);
  eq(W.streak({ '2026-03-01': {}, '2026-02-28': {} }, '2026-03-01'), 2, 'across a month end');
});

console.log('Stars and progress');
test('stars: solved, on your own, no wrong flower', () => {
  eq(W.starsFor({ slips: 0 }), 3);
  eq(W.starsFor({ slips: 2 }), 2);
  eq(W.starsFor({ slips: 0, frog: true }), 2);
  eq(W.starsFor({ slips: 0, owl: true }), 2);
  eq(W.starsFor({ slips: 1, owl: true, frog: true }), 1);
});
test('finishing a garden keeps the best stars, counts gardens and moves Continue on', () => {
  const s = { levels: {}, daily: {} };
  eq(W.at(s, '2-1'), 0);
  let out = W.finish(s, '2-1', 0, { slips: 1 });
  eq([out.stars, out.best, out.first, out.next, out.again], [2, 2, true, 1, false]);
  out = W.finish(s, '2-1', 0, { slips: 0 });
  eq([out.stars, out.best, out.first, out.again], [3, 3, false, true]);
  eq(W.solved(s, '2-1'), 1, 'the same garden twice counts once');
  W.finish(s, '2-1', 0, { slips: 5, frog: true });
  eq(W.gardenStars(s, '2-1', 0), 3, 'a worse replay never lowers the stars');
  W.finish(s, '2-1', 5, { slips: 0, owl: true });
  eq(s.levels['2-1'].g, '300002');
  eq([W.at(s, '2-1'), W.solved(s, '2-1'), W.stars(s, '2-1')], [6, 2, 3]);
  eq(W.skip(s, '2-1', 6), 7, 'new seeds moves to the next garden');
  eq(W.solved(s, '2-1'), 2, 'skipping solves nothing');
});
test('after the 100th garden a level keeps making new ones', () => {
  const s = { levels: { '1-1': { stars: 3, g: '3'.repeat(100), extra: 0, at: 0 } } };
  eq(W.at(s, '1-1'), 100);
  const out = W.finish(s, '1-1', 100, { slips: 0 });
  eq([out.next, W.solved(s, '1-1'), s.levels['1-1'].g.length], [101, 101, 100]);
  ok(fingerprint(W.puzzle('1-3', 100)) !== fingerprint(W.puzzle('1-3', 101)));
  eq(W.skip(s, '1-1', 101), 102);
});
test('Continue wraps round to a garden left unsolved earlier', () => {
  const s = { levels: { '1-1': { stars: 1, g: '0' + '1'.repeat(99), extra: 0, at: 99 } } };
  eq(W.at(s, '1-1'), 0);
});
test('every world is open; inside a world a level opens when the one before has a star', () => {
  const s = { levels: {} };
  W.worlds.forEach((w) => { ok(W.open(s, w.levels[0])); ok(!W.open(s, w.levels[1])); });
  W.finish(s, '4-1', 0, { slips: 9, frog: true });
  ok(W.open(s, W.level('4-2')) && !W.open(s, W.level('4-3')));
});
test('a world stamp is earned once, when its four levels have a star; Continue follows the map', () => {
  const s = { levels: {} };
  eq(W.next(s).key, '1-1');
  eq(['1-1', '1-2', '1-3'].map((k) => W.finish(s, k, 0, { slips: 0 }).stamp), [false, false, false]);
  eq(W.next(s).key, '1-4');
  eq(W.finish(s, '1-4', 0, { slips: 0 }).stamp, true);
  eq(W.finish(s, '1-4', 1, { slips: 0 }).stamp, false);
  eq(W.next(s).key, '2-1');
  const tot = W.totals(s);
  eq([tot.stamps, tot.stars, tot.done, tot.solved, tot.gardens], [1, 12, 4, 5, 4400]);
  ok(W.worldState(s, W.worlds[0]).complete && !W.worldState(s, W.worlds[1]).complete);
});
test('the daily keeps its best result', () => {
  const s = {};
  eq(W.finishDaily(s, '2026-11-18', { slips: 2, bees: 1, time: 300 }).first, true);
  eq(W.finishDaily(s, '2026-11-18', { slips: 0, frog: true }).first, false);
  eq(s.daily['2026-11-18'].slips, 2);
});
test('rules of a board, and where numbers must show', () => {
  eq(W.rulesOf(W.level('8-4').p), ['pads', 'vines', 'parity']);
  eq(W.rulesOf(W.level('10-2').p), ['twin']);
  eq(W.rulesOf(W.level('2-1').p), []);
  ok(W.needsNumbers(W.level('5-1').p) && W.needsNumbers(W.level('7-1').p) && !W.needsNumbers(W.level('6-1').p) && !W.needsNumbers(W.level('4-4').p));
});

console.log('Twin gardens');
test('a base pair of sudokus with no couple twice exists for 4×4 and 9×9, and for no other size', () => {
  eq(Object.keys(E.TWIN), ['4', '9']);
  [4, 9].forEach((n) => {
    const a = E.TWIN[n][0], b = E.TWIN[n][1], seen = new Set();
    for (let c = 0; c < n * n; c++) seen.add(a[c] + b[c]);
    eq(seen.size, n * n, n + '×' + n);
  });
  let threw = false;
  try { E.generate({ n: 6, twin: true, givens: 30, tier: 1 }, 'x'); } catch (e) { threw = true; }
  ok(threw, 'a 6×6 twin garden is refused (it cannot exist)');
});
test('a couple repeated on the board is a conflict, in both cells', () => {
  const pz = W.tutorialPuzzle('twin', 0), S = E.build(pz), h = 16, vals = pz.solution.slice();
  eq(E.conflicts(S, vals).some(Boolean), false);
  const a = 0, b = [...Array(h).keys()].find((c) => c !== a && !S.sees[a][c] && !S.sees[h + a][h + c]); // a cell that sees neither half of cell 0
  vals[b] = vals[a]; vals[h + b] = vals[h + a];
  const bad = E.conflicts(S, vals);
  ok(bad[a] && bad[h + a] && bad[b] && bad[h + b], 'both halves of both cells');
});
test('two cells with the same first figure never keep the same second figure as a candidate', () => {
  const pz = W.puzzle('10-3', 4), S = E.build(pz), h = 81, cand = E.candidates(S, pz.givens);
  pz.solution.forEach((v, c) => ok(cand[c] & (1 << (v - 1)), 'the right figure stays possible in slot ' + c));
  let pruned = 0;
  for (let x = 0; x < h; x++) for (let y = 0; y < h; y++) {
    if (x === y || !pz.givens[x] || pz.givens[x] !== pz.givens[y] || !pz.givens[h + x] || pz.givens[h + y]) continue;
    ok(!(cand[h + y] & (1 << (pz.givens[h + x] - 1))), 'cells ' + x + ' and ' + y);
    pruned++;
  }
  ok(pruned > 10, 'the rule was really used (' + pruned + ' times)');
});

console.log('Levels, chestnuts and the shop');
test('experience comes from the progress itself: harder levels are worth more, and levels need more and more', () => {
  const s = { levels: {}, daily: {} };
  eq(W.player(s), { xp: 0, level: 1, from: 0, to: 60, title: 'Seed' });
  ok(W.worth(W.level('4-1')) < W.worth(W.level('1-1')) && W.worth(W.level('1-1')) < W.worth(W.level('1-2')) && W.worth(W.level('2-1')) < W.worth(W.level('2-4')) && W.worth(W.level('11-4')) >= W.worth(W.level('2-4')));
  W.finish(s, '1-1', 0, { slips: 0 });
  eq(W.xp(s), 3 * W.worth(W.level('1-1')));
  W.finish(s, '1-1', 0, { slips: 3, frog: true });
  eq(W.xp(s), 3 * W.worth(W.level('1-1')), 'replaying a garden worse changes nothing');
  W.finishDaily(s, '2026-11-18', { slips: 0 });
  eq(W.xp(s), 3 * W.worth(W.level('1-1')) + 45);
  for (let L = 1; L < 60; L++) ok(W.levelAt(L + 1) - W.levelAt(L) > W.levelAt(L) - W.levelAt(L - 1) || L === 1, 'level ' + L);
  eq([W.levelOf(0), W.levelOf(59), W.levelOf(60), W.levelOf(149), W.levelOf(150)], [1, 1, 2, 2, 3]);
  eq([W.title(1), W.title(2), W.title(3), W.title(19), W.title(20), W.title(99)], ['Seed', 'Seed', 'Sprout', 'Blossom', 'Gardener', 'Meadow legend']);
  const full = { levels: {}, daily: {} };
  W.levels.forEach((lv) => { full.levels[lv.key] = { stars: 3, g: '3'.repeat(100), extra: 0, at: 100 }; });
  ok(W.player(full).level > 60 && W.player(full).level < 150, 'everything with three stars is level ' + W.player(full).level);
});
test('chestnuts: earned by gardens, dailies, stamps and levels; spent on helpers and things to keep', () => {
  const s = { levels: {}, daily: {} }, day = '2026-11-18', G = Shop.forGarden;
  eq([Shop.earned(s), Shop.balance(s)], [0, 0]);
  eq([G(0), G(1), G(2), G(3), Shop.forDaily(1), Shop.forDaily(3)], [0, 2, 3, 4, 6, 10], 'a garden gives 2 to 4, a daily 6 to 10');
  W.finish(s, '1-1', 0, { slips: 0 }); W.finish(s, '1-1', 1, { slips: 1 }); W.finish(s, '1-1', 2, { slips: 1, owl: true });
  eq(Shop.earned(s), G(3) + G(2) + G(1) + (W.player(s).level - 1) * Shop.LEVEL);
  W.finishDaily(s, day, { slips: 0 });
  ['1-2', '1-3', '1-4'].forEach((k) => { for (let g = 0; g < 6; g++) W.finish(s, k, g, { slips: 0 }); });
  const earned = G(3) + G(2) + G(1) + 18 * G(3) + Shop.forDaily(3) + Shop.STAMP + (W.player(s).level - 1) * Shop.LEVEL;
  eq(Shop.earned(s), earned);
  eq([Shop.stock(s, 'frog'), Shop.stock(s, 'owl'), Shop.stock(s, 'lady')], [5, 5, 5], 'everyone starts with five of each helper');
  ok(Shop.buy(s, 'frog', day) && Shop.use(s, 'frog') && Shop.use(s, 'frog'));
  eq([Shop.stock(s, 'frog'), Shop.balance(s)], [4, earned - 12]);
  for (let i = 0; i < 4; i++) ok(Shop.use(s, 'frog'));
  ok(!Shop.use(s, 'frog'), 'no frogs left');
  eq(Shop.stock(s, 'frog'), 0);
  ok(!Shop.owns(s, 'hat-bow') && Shop.owns(s, 'hat-flower') && Shop.owns(s, 'skin-flowers') && !Shop.owns(s, 'skin-critters'));
  const bow = Shop.price(s, 'hat-bow', day);
  ok(Shop.buy(s, 'hat-bow', day) && !Shop.buy(s, 'hat-bow', day), 'a thing is bought once');
  eq([Shop.wearing(s, 'hat'), Shop.balance(s), Shop.isOn(s, 'hat-bow')], ['bow', earned - 12 - bow, true], 'and put on at once');
  ok(!Shop.buy(s, 'hat-crown', day), 'not enough chestnuts for the crown');
  ok(Shop.wear(s, 'hat-flower') && !Shop.wear(s, 'hat-crown'));
  eq([Shop.wearing(s, 'hat'), Shop.isOn(s, 'hat-bow')], ['flower', false]);
  s.skin = 'fruits';
  eq(Shop.wearing(s, 'skin'), 'numbers', 'a skin that is not owned is never shown');
  s.wear = { theme: 'nonsense', 'h-bee': 'queen' };
  eq([Shop.wearing(s, 'theme'), Shop.wearing(s, 'h-bee'), Shop.wearing(s, 'h-frog')], ['meadow', 'classic', 'classic'], 'nor a look that is not owned');
  s.own['hskin-bee-queen'] = 1;
  eq([Shop.wearing(s, 'h-bee'), Shop.isOn(s, 'hskin-bee-queen'), Shop.isOn(s, 'hskin-bee-classic')], ['queen', true, false]);
});
test('today\'s offer: one thing a day at 40 % off, the same day for everyone, never something already owned', () => {
  const s = { levels: {}, daily: {}, own: {} };
  W.levels.slice(0, 12).forEach((lv) => { s.levels[lv.key] = { stars: 3, g: '3'.repeat(100), extra: 0, at: 100 }; });
  const d1 = Shop.deal(s, '2026-11-18'), d2 = Shop.deal(s, '2026-11-19');
  eq(Shop.deal({ levels: {} }, '2026-11-18').item.id, d1.item.id, 'the same for a new player');
  const days = new Set();
  for (let d = 1; d <= 28; d++) days.add(Shop.deal(s, '2026-02-' + ('0' + d).slice(-2)).item.id);
  ok(days.size > 15, 'it changes from day to day (' + days.size + ' different things in 28 days)');
  ok(d1.item.price > 0 && d1.item.kind !== 'helper' && d1.price < d1.item.price && d1.price >= d1.item.price * 0.55 && d1.price % 5 === 0, JSON.stringify(d1));
  eq([Shop.price(s, d1.item.id, '2026-11-18'), Shop.price(s, d1.item.id, d2.item.id === d1.item.id ? '2026-11-20' : '2026-11-19')], [d1.price, d1.item.price]);
  const before = Shop.balance(s);
  ok(Shop.buy(s, d1.item.id, '2026-11-18'));
  eq(Shop.balance(s), before - d1.price, 'the price paid is what is spent, on any later day too');
  ok(Shop.deal(s, '2026-11-18').item.id !== d1.item.id, 'once bought, the offer moves on');
  Shop.items.forEach((it) => { if (it.kind !== 'helper') s.own[it.id] = 1; });
  eq(Shop.deal(s, '2026-11-18'), null, 'nothing left to offer');
  eq(Shop.collected(s)[0], Shop.collected(s)[1]);
});
test('the shop catalog: unique ids, a free first choice of every kind, and every thing really exists', () => {
  eq(new Set(Shop.items.map((it) => it.id)).size, Shop.items.length);
  ok(Shop.items.length >= 90, Shop.items.length + ' things');
  const kept = ['skin', 'theme', 'frame', 'hat', 'coat', 'ring', 'effect', 'sound'];
  kept.forEach((kind) => { eq(Shop.of(kind)[0].price, 0, kind); ok(Shop.of(kind).length >= 6, kind); Shop.of(kind).forEach((it) => eq(it.id, kind + '-' + it.value)); });
  eq(Shop.KINDS.slice().sort(), ['helper', 'hskin'].concat(kept).sort());
  Shop.of('helper').forEach((it) => ok(it.price > 0 && it.start > 0 && it.icon && it.what && Shop.HELPERS.some((h) => h.id === it.id), it.id));
  Shop.HELPERS.forEach((h) => { const looks = Shop.looksOf(h.id); eq([looks.length, looks[0].price, looks[0].look], [4, 0, 'classic'], h.id); looks.forEach((it) => eq(it.id, 'hskin-' + h.id + '-' + it.look)); });
  Shop.of('theme').forEach((it) => ok(it.colors.length === 3 && it.colors.every((c) => /^#[0-9A-F]{6}$/i.test(c)), it.id));
  Shop.of('coat').forEach((it) => ok(it.colors.length === 3, it.id));
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const css = read('css/style.css'), game = read('js/game.js'), sound = read('js/sound.js');
  // the drawings: what js/art.js and the generated js/packs.js define
  const art = { helpers: {}, hats: {}, sets: {}, addSet(name, items, names) { this.sets[name] = [items, names]; } };
  const win = { BD: { art, t: (x) => x } };
  new Function('window', 'document', read('js/art.js'))(win, {});
  Object.assign(win.BD.art.helpers, art.helpers);
  new Function('window', read('js/packs.js'))(win);
  const A = win.BD.art;
  Shop.of('skin').slice(1).forEach((it) => { ok(A.sets[it.value] && A.sets[it.value].length === 9 && A.setNames[it.value].length === 9, 'the nine drawings of "' + it.value + '"'); });
  Shop.of('hat').forEach((it) => ok(typeof A.hats[it.value] === 'string' && A.hats[it.value].length > 40, 'the hat "' + it.value + '" is drawn'));
  Shop.HELPERS.forEach((h) => Shop.looksOf(h.id).forEach((it) => ok(A.helpers[h.art] && typeof A.helpers[h.art][it.look] === 'string' && A.helpers[h.art][it.look].length > 200, 'the look "' + it.id + '" is drawn')));
  Shop.HELPERS.forEach((h) => ok(/class="h[wslep]/.test(A.helpers[h.art].classic), h.art + ' has parts to animate'));
  Shop.of('theme').slice(1).forEach((it) => ok(css.includes('[data-garden="' + it.value + '"]') && css.includes('--th-sky: ' + it.colors[0]), 'the look "' + it.value + '" is styled with its sky colour'));
  Shop.of('theme').forEach((it) => ok(it.air === '' || css.includes('[data-air="' + it.air + '"]'), 'the sky of "' + it.value + '"'));
  Shop.of('frame').slice(1).forEach((it) => ok(css.includes('.fr-' + it.value + ', :root[data-frame="' + it.value + '"] .board'), 'the edge "' + it.value + '" is styled'));
  Shop.of('ring').slice(1).forEach((it) => ok(css.includes('.avatar.ring-' + it.value + ' '), 'the ring "' + it.value + '" is styled'));
  Shop.of('effect').forEach((it) => ok(new RegExp('\\n    ' + it.value + ': ').test(game), 'the effect "' + it.value + '" exists'));
  Shop.of('sound').forEach((it) => ok(new RegExp('\\n    ' + it.value + ': ').test(sound), 'the instrument "' + it.value + '" exists'));
  const total = Shop.items.filter((it) => it.kind !== 'helper').reduce((a, it) => a + it.price, 0), full = { levels: {}, daily: {} };
  W.levels.forEach((lv) => { full.levels[lv.key] = { stars: 3, g: '3'.repeat(100), extra: 0, at: 100 }; });
  ok(Shop.earned(full) > 1.4 * total && Shop.earned(full) < 3 * total, 'the whole shop takes a good part of the game, but not all of it (' + total + ' of ' + Shop.earned(full) + ')');
  eq(['basic', 'common', 'rare', 'epic', 'legendary'].map((r) => Shop.items.some((it) => it.kind !== 'helper' && Shop.rarity(it) === r)), [true, true, true, true, true]);
});
test('merging two copies of the progress: nothing lost, any order, twice is the same', () => {
  const a = { levels: {}, daily: {}, own: { 'hat-bow': 1 }, bought: { frog: 2 }, used: { frog: 1, owl: 3 }, avatar: 4, seen: { w1: 1 }, invites: {} };
  const b = { levels: {}, daily: {}, own: { 'theme-snow': 1 }, bought: { frog: 1, lady: 2 }, used: { frog: 4 }, seen: { w2: 1 }, invites: { '4-2': 1 } };
  W.finish(a, '1-1', 0, { slips: 0 }); W.finish(a, '1-1', 2, { slips: 1 }); W.finishDaily(a, '2026-11-18', { slips: 2 });
  W.finish(b, '1-1', 1, { slips: 0, owl: true }); W.finish(b, '1-1', 2, { slips: 0 }); W.finish(b, '9-1', 0, { slips: 0 }); W.finishDaily(b, '2026-11-18', { slips: 0 }); W.finishDaily(b, '2026-11-17', { slips: 0 });
  const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => { o[k] = sorted(v[k]); return o; }, {}) : v);
  const ab = W.merge(W.progress(a), W.progress(b)), ba = W.merge(W.progress(b), W.progress(a));
  eq(sorted(ab), sorted(ba), 'the order does not matter');
  eq(sorted(W.merge(ab, ab)), sorted(ab), 'merging twice changes nothing');
  eq(sorted(W.merge(W.progress(a), ab)), sorted(ab));
  eq([ab.levels['1-1'].g, ab.levels['1-1'].stars, ab.levels['9-1'].g, Object.keys(ab.daily).sort(), ab.daily['2026-11-18'].stars], ['323', 3, '3', ['2026-11-17', '2026-11-18'], 3]);
  eq(sorted([ab.own, ab.bought, ab.used, ab.avatar, ab.seen, ab.invites]), [{ 'hat-bow': 1, 'theme-snow': 1 }, { frog: 2, lady: 2 }, { frog: 4, owl: 3 }, 4, { w1: 1, w2: 1 }, { '4-2': 1 }]);
  eq(W.merge(null, W.progress(a)).levels, W.progress(a).levels);
});
test('what friends see is a summary: level, totals, the garden, today, the hat; a challenge opens its level', () => {
  const s = { levels: {}, daily: {}, games: { '2-1': {} }, set: { sound: true }, wear: { hat: 'crown' }, avatar: 7 };
  W.finish(s, '1-1', 0, { slips: 0 }); W.finishDaily(s, '2026-11-18', { slips: 1 });
  const pub = W.publicProfile(s, '2026-11-18');
  eq(Object.keys(pub).sort(), ['av', 'coat', 'dailies', 'day', 'hat', 'lv', 'lvl', 'ring', 'solved', 'stamps', 'stars', 'streak', 'v', 'xp']);
  eq([pub.lvl, pub.av, pub.hat, pub.coat, pub.ring, pub.lv.length, pub.lv[0], pub.day, pub.streak], [W.player(s).level, 7, 'crown', 'classic', 'none', 44, '3', { d: '2026-11-18', stars: 2, slips: 1, time: 0 }, 1]);
  eq(W.publicProfile(s, '2026-11-19').day, null, 'yesterday\'s bouquet is not today\'s');
  ok(JSON.stringify(pub).length < 600, 'small enough for the profile row');
  ok(!W.open(s, W.level('4-2')));
  s.invites = { '4-2': 1 };
  ok(W.open(s, W.level('4-2')) && !W.open(s, W.level('4-3')));
});

console.log('Saved state');
const store = {};
const fake = { BD: { engine: E, worlds: W, shop: Shop } };
new Function('window', 'localStorage', 'navigator', 'document', fs.readFileSync(path.join(root, 'js', 'core.js'), 'utf8'))(
  fake, { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } }, { language: 'es-ES' }, {});
const BD = fake.BD;
test('garbage from storage becomes a valid state', () => {
  [null, 42, 'x', [], { levels: 'no', set: 7, games: [1], daily: null }].forEach((raw) => {
    const s = BD.sanitize(raw);
    eq([s.v, s.skin, s.theme, s.levels, s.daily, s.games], [1, 'numbers', 'auto', {}, {}, {}]);
    eq(s.set.wilt, true);
  });
});
test('valid progress survives, invalid pieces are dropped', () => {
  const pz = W.puzzle('1-1', 0);
  const s = BD.sanitize({
    lang: 'es', skin: 'critters', theme: 'night', set: { sound: false, wilt: 'yes' },
    levels: { '3-2': { stars: 9, g: '3120', extra: 2, at: 4 }, 'x': { stars: 3 }, '1-1': { stars: 2, g: 'abc' } },
    daily: { '2026-11-18': { stars: 3, slips: 0 }, 'yesterday': { stars: 3 } },
    games: { '1-1': { pz, vals: pz.givens, notes: pz.givens.map(() => 0) }, '2-2': { pz: { n: 9 }, vals: [] } },
    seen: { w1: 1, w2: 0 }, invites: { '4-2': 1, nope: 1 }, avatar: 12,
    own: { 'hat-bow': 1, '<script>': 1 }, bought: { frog: 2, 'x y': 9 }, used: { frog: -3, owl: 1 }, wear: { hat: 'bow', theme: 7, effect: 'stars' },
  });
  eq([s.lang, s.skin, s.theme, s.set.sound, s.set.wilt], ['es', 'critters', 'night', false, true]);
  eq(s.levels, { '3-2': { stars: 3, g: '3120', extra: 2, at: 4 }, '1-1': { stars: 2, g: '', extra: 0, at: 0 } });
  eq(Object.keys(s.daily), ['2026-11-18']);
  eq(Object.keys(s.games), ['1-1']);
  eq(s.seen, { w1: 1 });
  eq([s.invites, s.avatar, s.own, s.bought, s.used, s.wear], [{ '4-2': 1 }, 0, { 'hat-bow': 1 }, { frog: 2 }, { owl: 1 }, { hat: 'bow', effect: 'stars' }]);
  eq(BD.sanitize({ own: { 'hskin-bee-queen': 110, 'theme-snow': 1, 'x': 5 }, wear: { 'h-bee': 'queen', 'h-': 'x', frame: 'gold', 'bad key': 'a' } }), Object.assign(BD.sanitize({}), { own: { 'hskin-bee-queen': 110, 'theme-snow': 1 }, wear: { 'h-bee': 'queen', frame: 'gold' } }));
});
test('a twin garden in progress is kept, a damaged one is dropped', () => {
  const pz = W.puzzle('9-1', 0), zeros = pz.givens.map(() => 0);
  eq(pz.givens.length, 162);
  const s = BD.sanitize({ games: { '9-1': { pz, vals: pz.givens, notes: zeros }, '9-2': { pz, vals: pz.givens.slice(0, 81), notes: zeros } } });
  eq(Object.keys(s.games), ['9-1']);
});
test('load follows the phone language the first time; save and load round-trip; reset keeps settings', () => {
  delete store['bloomdoku.v1'];
  eq(BD.load().lang, 'es');
  BD.state.skin = 'flowers'; BD.state.set.sundial = true;
  W.finish(BD.state, '1-1', 0, { slips: 0 });
  BD.save();
  const again = BD.load();
  eq([again.skin, again.set.sundial, W.stars(again, '1-1')], ['flowers', true, 3]);
  BD.reset();
  eq([BD.state.skin, BD.state.set.sundial, BD.state.levels, BD.state.own, BD.state.bought], ['flowers', true, {}, {}, {}]);
  store['bloomdoku.v1'] = '{not json';
  eq(BD.load().levels, {});
});

console.log('Spanish');
const strings = require(path.join(root, 'tools', 'strings.js'));
test('every interface sentence has its Spanish, with the same placeholders', () => {
  const es = strings.spanish(), all = [...strings.all()];
  ok(all.length > 250, 'found ' + all.length + ' sentences');
  const missing = all.filter((s) => !es[s]);
  eq(missing, [], 'without Spanish');
  all.forEach((s) => eq((s.match(/\{\d\}/g) || []).sort(), (es[s].match(/\{\d\}/g) || []).sort(), 'placeholders of "' + s + '"'));
  const unused = Object.keys(es).filter((k) => !strings.all().has(k));
  eq(unused, [], 'Spanish for a sentence that no longer exists');
});
test('t() fills placeholders and falls back to English', () => {
  BD.i18n.es = strings.spanish();
  BD.state.lang = 'es';
  eq(BD.t('Garden {0}', 7), 'Jardín 7');
  eq(BD.t('Not in the dictionary {0}', 'x'), 'Not in the dictionary x');
  BD.state.lang = 'en';
  eq(BD.t('{0} of {1} gardens', 2, 100), '2 of 100 gardens');
});

console.log('Updates');
test('the newest release is found among GitHub\'s list; versions are read from the app\'s browser name', () => {
  const doc = { body: { classList: { contains: () => false } }, querySelector: () => null, activeElement: null };
  const nav = { userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/130 Mobile BloomdokuApp/1 BloomdokuWeb/7 BloomdokuShell/1 BloomdokuApk/5' };
  const win = { BD: { h: () => ({}), t: (x) => x, native: { checkUpdate() {}, restart() {} } } };
  new Function('window', 'navigator', 'document', 'location', read2('js/update.js'))(win, nav, doc, { hash: '' });
  const U = win.BD.update;
  eq(U.info(), { native: true, bridge: true, web: 7, apk: 5, shell: 1 });
  const rel = (tag, assets, draft) => ({ tag_name: tag, draft: !!draft, assets: assets.map((n) => ({ name: n, browser_download_url: 'https://x/' + tag + '/' + n })) });
  eq(U.newest([rel('analyst-99', ['web.zip']), rel('bloomdoku-8', ['web.zip', 'Bloomdoku-1.8.apk', 'shell-1']), rel('bloomdoku-12', ['web.zip'], true), rel('bloomdoku-9', ['web.zip', 'Bloomdoku-1.9.apk'])]),
    { version: 9, apk: 'https://x/bloomdoku-9/Bloomdoku-1.9.apk' }, 'other apps\' releases and drafts are ignored');
  eq(U.newest('not a list'), { version: 0, apk: '' });
  U.fromNative({ status: 'needsApk', version: 12, apk: 'https://x/a.apk' });
  eq(U.state(), { status: 'needsApk', version: 12, apk: 'https://x/a.apk' });
  U.fromNative(null); U.fromNative({ nope: 1 });
  eq(U.state().status, 'needsApk', 'a malformed report changes nothing');
  let restarted = 0;
  win.BD.native.restart = () => { restarted++; }; win.BD.save = () => {};
  U.fromNative({ status: 'ready', version: 13 });
  eq(restarted, 1, 'a version that is ready is applied at a calm moment');
  doc.body.classList.contains = (c) => c === 'playing';
  U.fromNative({ status: 'ready', version: 14 });
  eq([restarted, U.applyIfQuiet()], [1, false], 'but never in the middle of a garden');
  doc.body.classList.contains = () => false;
  eq([U.applyIfQuiet(), restarted], [true, 2], 'it waits for the map');
});

console.log('Offline cache');
test('sw.js lists every file and its version matches them (run python3 tools/update-sw.py after any edit)', () => {
  const files = [];
  (function walk(dir, rel) {
    fs.readdirSync(dir).sort().forEach((name) => {
      const full = path.join(dir, name), r = rel ? rel + '/' + name : name;
      if (fs.statSync(full).isDirectory()) { if (!['tests', 'tools', '.git', 'node_modules'].includes(name)) walk(full, r); }
      else if (!['sw.js', 'README.md', '.DS_Store'].includes(name)) files.push(r);
    });
  })(root, '');
  files.sort();
  const h = crypto.createHash('sha256');
  files.forEach((f) => { h.update(f); h.update(fs.readFileSync(path.join(root, f))); });
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  eq(sw.match(/const VERSION = '([^']*)'/)[1], 'bloom-' + h.digest('hex').slice(0, 10), 'version');
  const listed = sw.match(/BEGIN SHELL \*\/([\s\S]*?)\/\* END SHELL/)[1].match(/'[^']+'/g).map((x) => x.slice(1, -1));
  eq(listed, ['./'].concat(files), 'file list');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  (html.match(/(?:src|href)="([^"#]+)"/g) || []).map((m) => m.split('"')[1]).forEach((f) => ok(files.includes(f), 'index.html uses ' + f + ', which is not cached'));
  const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  man.icons.forEach((i) => ok(files.includes(i.src), 'manifest icon ' + i.src));
  eq([man.display, man.orientation], ['standalone', 'portrait']);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
