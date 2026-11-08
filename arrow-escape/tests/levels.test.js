// Run with:  node arrow-escape/tests/levels.test.js
'use strict';
const assert = require('assert');
const L = require('../levels.js');

function check(cfg, label) {
  const lv = L.generateLevel(cfg);
  const { w, h, arrows } = lv;
  assert(arrows.length >= 4, `${label}: too few arrows (${arrows.length})`);

  // geometry: in bounds, no overlaps, connected snakes
  const seen = new Set();
  for (const a of arrows) {
    for (let i = 0; i < a.cells.length; i++) {
      const [x, y] = a.cells[i];
      assert(x >= 0 && y >= 0 && x < w && y < h, `${label}: cell out of bounds`);
      const k = y * w + x;
      assert(!seen.has(k), `${label}: overlapping cells`);
      seen.add(k);
      if (i) assert(Math.abs(x - a.cells[i - 1][0]) + Math.abs(y - a.cells[i - 1][1]) === 1, `${label}: snake not connected`);
    }
    for (const [x, y] of a.ray) assert(x >= 0 && y >= 0 && x < w && y < h, `${label}: ray out of bounds`);
  }

  // play with the real rules: keep removing any free arrow; must clear the board
  const occ = L.makeOcc(lv);
  const left = new Set(arrows.map(a => a.id));
  const freeAtStart = arrows.filter(a => L.isFree(occ, w, a)).length;
  let guard = 0;
  while (left.size && guard++ < 10000) {
    // adversarial order: always take the LAST free arrow, to prove order does not matter
    const free = [...left].map(i => arrows[i]).filter(a => L.isFree(occ, w, a));
    assert(free.length, `${label}: STUCK with ${left.size} arrows left`);
    const a = free[free.length - 1];
    for (const [x, y] of a.cells) occ[y * w + x] = -1;
    left.delete(a.id);
  }
  assert.strictEqual(left.size, 0);
  return { n: arrows.length, freeAtStart, bounce: arrows.filter(a => a.bounce).length, chain: arrows.filter(a => a.chain).length };
}

// determinism
const a1 = JSON.stringify(L.generateLevel(L.levelConfig(25)));
const a2 = JSON.stringify(L.generateLevel(L.levelConfig(25)));
assert.strictEqual(a1, a2, 'same seed must give same level');

// Cross-engine regression: the daily puzzle must be identical on every phone.
// If you change the generator on purpose, re-compute these (and accept that saved levels change).
const fp = lv => L.hashString(JSON.stringify(lv.arrows.map(a => [a.cells, a.ray, a.bounce, a.chain])));
assert.strictEqual(fp(L.generateLevel(L.levelConfig(12))), 2401421855, 'level 12 fingerprint changed');
assert.strictEqual(fp(L.generateLevel(L.levelConfig(40))), 3921182608, 'level 40 fingerprint changed');
assert.strictEqual(fp(L.generateLevel(L.dailyConfig('2026-11-08'))), 3133459205, 'daily fingerprint changed');

let rows = [];
for (let n = 1; n <= 400; n++) {
  const s = check(L.levelConfig(n), 'level ' + n);
  if ([1, 5, 10, 20, 40, 100, 400].includes(n)) rows.push(`level ${String(n).padStart(3)}: ${s.n} arrows, ${s.freeAtStart} free at start, ${s.bounce} bounce, ${s.chain} chain`);
}
for (let d = 0; d < 120; d++) {
  const date = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
  const s = check(L.dailyConfig(date), 'daily ' + date);
  if (d === 0) rows.push(`daily ${date}: ${s.n} arrows, ${s.freeAtStart} free at start, ${s.bounce} bounce, ${s.chain} chain`);
}
console.log(rows.join('\n'));
console.log('OK: 400 levels + 120 daily boards are all solvable and deterministic');
