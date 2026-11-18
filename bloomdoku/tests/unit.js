/* Bloomdoku unit tests (Node only):   node tests/unit.js          a sample of gardens per level, a few seconds
 *                                     node tests/unit.js --all    every one of the 3,200 gardens, about a minute */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'js', 'engine.js'));
const W = require(path.join(root, 'js', 'worlds.js'));
const ALL = process.argv.includes('--all');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.message)); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

// Every rule of a puzzle holds in its solution, and the puzzle is well formed.
function checkPuzzle(pz, p, where) {
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
function fingerprint(pz) { return pz.givens.join('') + '|' + pz.regions.join('') + '|' + JSON.stringify(pz.vines) + '|' + (pz.parity || []).join(''); }

console.log('Catalog');
test('8 worlds × 4 levels, keys 1-1 … 8-4 in order', () => {
  eq(W.worlds.length, 8);
  const keys = [];
  for (let w = 1; w <= 8; w++) for (let l = 1; l <= 4; l++) keys.push(w + '-' + l);
  eq(W.levels.map((l) => l.key), keys);
});
test('level names are saved progress: none renamed or moved', () => {
  eq(W.levels.map((l) => l.name), ['Four little seeds', 'Fewer seeds', 'Six in a row', 'Nursery graduate', 'First bed', 'Morning rows', 'Hidden bulbs', 'Meadow master',
    'Two bee paths', 'Crossing', 'Busy hive', 'Queen bee', 'Five pads', 'Six pads', 'Seven pads', 'The big pond', 'First tendrils', 'Climbers', 'Tangle', 'Overgrown',
    'First hops', 'Burrow', 'Warren', 'Moon hop', 'Dusk', 'First lights', 'Glow', 'Midnight', 'Bees on the trellis', 'Fireflies on the pond', 'Bunnies on the paths', 'The grand bouquet']);
});
test('every world has an icon, a colour, a rule, an intro, concepts and a stamp', () => {
  W.worlds.forEach((w) => {
    ok(w.icon && w.stamp && /^#[0-9A-F]{6}$/i.test(w.color) && w.rule && w.intro && w.concepts.length >= 2, w.name);
    w.levels.forEach((lv) => ok(lv.name && lv.teaches && lv.p && lv.p.n >= 4 && lv.p.n <= 9 && lv.p.givens > 0 && (lv.p.tier === 1 || lv.p.tier === 2), lv.key));
  });
  eq(new Set(W.worlds.map((w) => w.color)).size, 8, 'colours differ');
});
test('levels of a world get harder: no more flowers to start than the level before on the same board', () => {
  W.worlds.forEach((w) => w.levels.forEach((lv, i) => {
    const prev = w.levels[i - 1];
    if (prev && prev.p.n === lv.p.n && w.n !== 8) ok(lv.p.givens <= prev.p.givens && lv.p.tier >= prev.p.tier, lv.key);
  }));
});
test('at least 3,000 numbered gardens (32 levels × 100)', () => { eq(W.total(), 3200); ok(W.total() >= 3000); });

console.log('Generator');
const sample = ALL ? W.GARDENS : 6;
const smallSpace = { '1-1': 1, '1-2': 1, '1-3': 1, '4-1': 1 }; // small boards: check all 100 are different even in the quick run
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
  ['2-3', '4-4', '5-4', '8-4'].forEach((k) => eq(W.puzzle(k, 3), W.puzzle(k, 3), k));
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
  W.levels.forEach((lv) => {
    const pz = W.puzzle(lv.key, 1), S = E.build(pz), vals = pz.givens.slice();
    let left = vals.filter((v) => !v).length, guard = 0;
    while (left && guard++ < 200) {
      const hint = E.hint(S, vals, 2);
      ok(!hint.broken && !hint.stuck, lv.key + ': no hint with ' + left + ' cells left');
      ok(['last', 'hidden', 'naked'].includes(hint.type), lv.key + ': hint type');
      eq(hint.v, pz.solution[hint.cell], lv.key + ': hinted flower');
      ok(!vals[hint.cell], lv.key + ': hint points at a planted cell');
      if (hint.type !== 'naked') ok(S.groups[hint.group].cells.includes(hint.cell), lv.key + ': hint group');
      if (lv.p.tier === 1) eq(hint.via.length, 0, lv.key + ': an easy level never needs a trick');
      hint.via.forEach((e) => ok(e.cells.length >= 2 && e.removed.length > 0 && e.removed.every((r) => !(r[1] & (1 << (pz.solution[r[0]] - 1)))), lv.key + ': a trick removed the right flower'));
      vals[hint.cell] = hint.v; left--;
    }
    eq(vals, pz.solution, lv.key);
  });
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
  const pz = W.puzzle('1-1', 0), S = E.build(pz);
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
  eq([tot.stamps, tot.stars, tot.done, tot.solved, tot.gardens], [1, 12, 4, 5, 3200]);
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
  eq(W.rulesOf(W.level('2-1').p), []);
  ok(W.needsNumbers(W.level('5-1').p) && W.needsNumbers(W.level('7-1').p) && !W.needsNumbers(W.level('6-1').p) && !W.needsNumbers(W.level('4-4').p));
});

console.log('Saved state');
const store = {};
const fake = { BD: { engine: E, worlds: W } };
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
    seen: { w1: 1, w2: 0 },
  });
  eq([s.lang, s.skin, s.theme, s.set.sound, s.set.wilt], ['es', 'critters', 'night', false, true]);
  eq(s.levels, { '3-2': { stars: 3, g: '3120', extra: 2, at: 4 }, '1-1': { stars: 2, g: '', extra: 0, at: 0 } });
  eq(Object.keys(s.daily), ['2026-11-18']);
  eq(Object.keys(s.games), ['1-1']);
  eq(s.seen, { w1: 1 });
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
  eq([BD.state.skin, BD.state.set.sundial, BD.state.levels], ['flowers', true, {}]);
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
