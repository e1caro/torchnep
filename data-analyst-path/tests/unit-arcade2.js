'use strict';
/* The four tool arcades: every generated puzzle can be solved, and the answer is what the real engines compute. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DA, test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/fn-catalog.js', 'js/sheets/engine.js',
  'js/sheets/edit.js', 'js/python/engine.js', 'js/python/interp.js', 'js/bi/engine.js', 'js/arcade2-core.js'].forEach((f) => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f));
const X = DA.arcade2, S = DA.sheets, P = DA.python, BI = DA.bi, ui = DA.ui, G = DA.game;
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);

test('Formula X-ray: the answer cells and the value agree with the real spreadsheet engine', () => {
  const kinds = new Set();
  SEEDS.forEach((seed) => {
    const p = X.xray(seed);
    kinds.add(p.kind);
    assert.ok(p.cells.length >= 1, seed + ' has cells to tap');
    const wb = new S.Workbook(), sh = wb.activeSheet();
    [['city', 'channel', 'qty', 'price']].concat(p.rows.map((r) => [r.city, r.channel, r.qty === null ? '' : String(r.qty), String(r.price)])).forEach((row, r) => row.forEach((v, c) => S.setInput(sh, r, c, v)));
    S.setInput(sh, 0, 5, p.formula);
    wb.recalc();
    assert.ok(Math.abs(sh.getCell(0, 5).value - p.value) < 0.01, seed + ' ' + p.formula + ' gives ' + sh.getCell(0, 5).value + ', not ' + p.value);
    assert.ok(X.xrayCheck(p, p.cells).ok);
    assert.ok(!X.xrayCheck(p, p.cells.slice(1)).ok || p.cells.length === 0);
    assert.deepStrictEqual(X.xrayCheck(p, p.cells.concat(['Z9'])).extra, ['Z9']);
  });
  assert.ok(kinds.size >= 6, 'the round mixes formula types: ' + [...kinds].join(', '));
});

test('Pandas pipeline: the reference cards reach the target, the start is not the target, decoys are real code', () => {
  SEEDS.forEach((seed) => {
    const p = X.pipe(seed);
    assert.strictEqual(p.cards.length, p.par + 3, 'the reference cards and three decoys');
    p.ref.forEach((l) => assert.ok(p.cards.includes(l)));
    const r = X.pipeCheck(p, p.ref);
    assert.ok(r.ok, seed + ' ' + p.kind + ' reference solves it: ' + (r.error || ''));
    assert.ok(!X.pipeCheck(p, []).ok, seed + ' the start table is not already the target');
    assert.strictEqual(X.stars(p.ref.length, p.par), 3);
    assert.strictEqual(X.stars(p.ref.length + 1, p.par), 2);
  });
  const p = X.pipe(SEEDS[0]);
  assert.ok(!X.pipeCheck(p, ['t = t.nonsense()']).ok, 'a broken step is reported, not thrown');
});

test('Slicer safe: the secret is reachable, par is the fewest moves plus two, ignored slicers really do nothing', () => {
  let ignored = 0;
  SEEDS.forEach((seed) => {
    const p = X.safe(seed);
    assert.ok(p && p.target, seed + ' makes a safe');
    assert.ok(X.safeCheck(p, p.secret), seed + ' the secret opens it');
    assert.ok(!X.safeCheck(p, {}), seed + ' the start does not open it');
    assert.ok(p.par >= 3 && p.par <= 4);
    if (/ALL\(Sales\[channel\]\)|Sales\[channel\] = "delivery"/.test(p.measure.f) && p.slicers.includes('channel')) {
      ignored++;
      const a = Object.assign({}, p.secret, { channel: 'pickup' }), b = Object.assign({}, p.secret, { channel: 'in_store' });
      assert.strictEqual(X.fmt(X.safeValue(p, a), p.measure.fmt), X.fmt(X.safeValue(p, b), p.measure.fmt), 'the channel slicer changes nothing for ' + p.measure.f);
    }
  });
  assert.ok(ignored >= 1, 'some rounds teach that a slicer can be ignored');
});

test('Pill match: the target config rebuilds the chart; a wrong pill or sort is explained', () => {
  SEEDS.forEach((seed) => {
    const p = X.pills(seed);
    assert.ok(p.rows.length >= 3);
    assert.ok(X.pillCheck(p, p.dim, p.meas, p.sort).ok, seed);
    const otherMeas = X.MEAS.map((m) => m[0]).find((m) => m !== p.meas);
    assert.ok(!X.pillCheck(p, p.dim, otherMeas, p.sort).ok);
    assert.ok(/pill|Sort/.test(X.pillCheck(p, null, p.meas, p.sort).why));
  });
  const p = X.pills(SEEDS.find((s) => X.pills(s).sort === 'desc'));
  assert.ok(/order/.test(X.pillCheck(p, p.dim, p.meas, 'asc').why), 'right bars, wrong order');
});

test('arcade stats are kept, merged and counted for the new badges', () => {
  ui.state.stats.xrayGames = 1; ui.state.stats.pipeBest = 15;
  const s = ui.sanitize(JSON.parse(JSON.stringify(ui.state)));
  assert.strictEqual(s.stats.xrayGames, 1);
  assert.strictEqual(DA.sync.merge(s, ui.sanitize({ v: 2, stats: { pipeBest: 9, safeGames: 2 } })).stats.pipeBest, 15);
  ['corrGames', 'blockRounds', 'xrayGames', 'pipeGames', 'safeGames', 'pillGames'].forEach((k) => { ui.state.stats[k] = 1; });
  G.touch();
  assert.ok(ui.state.badges['arcade-all'] && ui.state.badges['arcade-15']);
});

runAll();
