'use strict';
/* Arcade worlds: every game is 4 worlds × 4 levels, every level makes endless puzzles that can be solved, the answers are
 * what the real engines compute, and level progress is kept, merged and paid like the rest of the saved state. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DA, test, runAll, setDay } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/fn-catalog.js', 'js/sheets/engine.js',
  'js/sheets/edit.js', 'js/python/engine.js', 'js/python/interp.js', 'js/bi/engine.js', 'js/arcade2-core.js'].forEach((f) => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f));
const X = DA.arcade2, S = DA.sheets, A = DA.arcade, AW = DA.arcadeWorlds, Q = DA.sqlgen, ui = DA.ui, G = DA.game, Y = DA.sync;
const seeds = (n) => Array.from({ length: n }, (_, i) => 101 + i * 7919);

test('catalog: six games, each 4 worlds of 4 levels with an intro, new concepts and a lesson per level', () => {
  assert.deepStrictEqual(DA.arcadeOrder.slice().sort(), ['blocks', 'corr', 'pills', 'pipe', 'safe', 'xray']);
  DA.arcadeOrder.forEach((g) => {
    const d = AW.def(g), lvs = AW.levels(g);
    assert.strictEqual(d.worlds.length, 4, g);
    assert.strictEqual(lvs.length, 16, g);
    assert.strictEqual(new Set(lvs.map((l) => l.key)).size, 16, g + ' keys are unique');
    d.worlds.forEach((w, i) => {
      assert.ok(w.name && w.icon && w.intro.length > 30, g + ' world ' + (i + 1));
      assert.ok(w.concepts.length >= 3, g + ' world ' + (i + 1) + ' introduces concepts');
    });
    lvs.forEach((l, i) => {
      assert.ok(l.name && l.teaches, g + ' ' + l.key);
      assert.strictEqual(l.n, i + 1);
      assert.ok(DA.arcadeKeyOk(g, l.key), g + ' ' + l.key + ' is a valid saved key');
      assert.strictEqual(AW.level(g, l.key), l);
    });
    assert.ok(!DA.arcadeKeyOk(g, '5-1') && !DA.arcadeKeyOk(g, '1-5') && !DA.arcadeKeyOk(g, '17') && !DA.arcadeKeyOk('nope', '1-1'));
  });
  // concepts are new in each world: no concept chip repeats inside a game
  DA.arcadeOrder.forEach((g) => { const all = AW.def(g).worlds.flatMap((w) => w.concepts); assert.strictEqual(new Set(all).size, all.length, g); });
});

test('Formula X-ray: every level makes puzzles of its own kinds, and the cells and value agree with the spreadsheet engine', () => {
  AW.levels('xray').forEach((lv) => {
    const kinds = new Set(), formulas = new Set(), puzzles = new Set();
    seeds(30).forEach((seed) => {
      const p = X.xray(seed, lv);
      kinds.add(p.kind); formulas.add(p.formula); puzzles.add(p.formula + JSON.stringify(p.rows));
      assert.ok(lv.p.kinds.includes(p.kind), lv.key + ' kind ' + p.kind);
      assert.strictEqual(p.rows.length, lv.p.rows, lv.key + ' rows');
      assert.ok(p.cells.length >= 1, lv.key + ' has cells to tap');
      const wb = new S.Workbook(), sh = wb.activeSheet();
      [['city', 'channel', 'qty', 'price']].concat(p.rows.map((r) => [r.city, r.channel, r.qty === null ? '' : String(r.qty), String(r.price)])).forEach((row, r) => row.forEach((v, c) => S.setInput(sh, r, c, v)));
      if (p.f1 !== null) S.setInput(sh, 0, 5, String(p.f1));
      S.setInput(sh, 0, 8, p.kind === 'filter' ? '=SUM(' + p.formula.slice(1) + ')' : p.formula);
      wb.recalc();
      const got = sh.getCell(0, 8).value;
      const want = p.kind === 'filter' ? p.cells.reduce((s, c) => s + p.rows[Number(c.slice(1)) - 2][X.COLS[c[0]]], 0) : p.value;
      if (typeof want === 'number') assert.ok(Math.abs(got - want) < 0.01, lv.key + ' ' + p.formula + ' gives ' + JSON.stringify(got) + ', not ' + want);
      else assert.strictEqual(got, want, lv.key + ' ' + p.formula);
      assert.ok(X.xrayCheck(p, p.cells).ok);
    });
    assert.strictEqual(kinds.size, lv.p.kinds.length, lv.key + ' uses every kind it lists');
    assert.ok(puzzles.size >= 28 && formulas.size >= 4, lv.key + ' makes many different puzzles (' + formulas.size + ' formulas, ' + puzzles.size + ' sheets)');
  });
});

test('Pandas pipeline: every level reaches its target with the reference cards, never starts solved, and par grows with the worlds', () => {
  const pars = [];
  AW.levels('pipe').forEach((lv) => {
    const goals = new Set(); let par = 0;
    seeds(25).forEach((seed) => {
      const p = X.pipe(seed, lv);
      goals.add(p.goal + p.csv);
      assert.ok(lv.p.kinds.includes(p.kind));
      const r = X.pipeCheck(p, p.ref);
      assert.ok(r.ok, lv.key + ' ' + p.kind + ': ' + (r.error || ''));
      assert.ok(!X.pipeCheck(p, []).ok, lv.key + ' ' + p.kind + ' starts solved');
      assert.strictEqual(p.cards.length, p.par + lv.p.decoys, lv.key + ' ' + p.kind + ' cards');
      p.ref.forEach((l) => assert.ok(p.cards.includes(l)));
      const t = X.pipeTarget(p);
      assert.ok(DA.python.repr(t).trim().split('\n').length >= 2, lv.key + ' ' + p.kind + ' target is not empty');
      par = Math.max(par, p.par);
    });
    assert.ok(goals.size >= 15, lv.key + ' makes different puzzles');
    pars.push(par);
  });
  assert.ok(pars.slice(12).some((x) => x >= 3) && pars.slice(0, 2).every((x) => x <= 2), 'later worlds need longer pipelines');
});

test('Slicer safe: every level opens with its secret, the needed slicers are there, and ignored slicers do nothing', () => {
  AW.levels('safe').forEach((lv) => {
    const measures = new Set();
    seeds(8).forEach((seed) => {
      const p = X.safe(seed, lv);
      assert.ok(p && p.target, lv.key + ' makes a safe');
      measures.add(p.measure.id);
      assert.ok(lv.p.measures.includes(p.measure.id), lv.key + ' measure');
      assert.strictEqual(p.slicers.length, lv.p.slicers, lv.key + ' slicers');
      (p.measure.need || []).concat(lv.p.need || []).forEach((k) => assert.ok(p.slicers.includes(k), lv.key + ' needs the ' + k + ' slicer'));
      assert.ok(X.safeCheck(p, p.secret) && !X.safeCheck(p, {}), lv.key + ' secret opens, start does not');
      assert.ok(p.par >= 3 && p.par <= 2 + lv.p.slicers);
      const ignored = { allch: 'channel', allcity: 'city', fixch: 'channel', fixcat: 'category', rmcat: 'category' }[p.measure.id];
      if (ignored) {
        const k = ignored, vals = X.SLICERS[k].values;
        const a = Object.assign({}, p.secret, { [k]: vals[0] }), b = Object.assign({}, p.secret, { [k]: vals[1] });
        assert.strictEqual(X.fmt(X.safeValue(p, a), p.measure.fmt), X.fmt(X.safeValue(p, b), p.measure.fmt), lv.key + ': the ' + k + ' slicer is ignored by ' + p.measure.f);
      }
    });
    assert.ok(measures.size >= Math.min(2, lv.p.measures.length), lv.key + ' mixes its measures');
  });
});

test('Pill match: every level rebuilds its chart, uses the filter, Top N and calculations it teaches, and explains a wrong try', () => {
  AW.levels('pills').forEach((lv) => {
    const seen = new Set(); let rejected = 0, tried = 0;
    seeds(10).forEach((seed) => {
      const p = X.pills(seed, lv);
      assert.ok(p && p.rows.length >= 2, lv.key + ' makes a chart');
      seen.add(p.dim + p.meas + (p.filter ? p.filter.value : '') + p.sort + p.calc);
      const extra = { filter: p.filter, top: !!p.top, calc: p.calc };
      assert.ok(X.pillCheck(p, p.dim, p.meas, p.sort, extra).ok, lv.key + ' target config');
      assert.strictEqual(!!p.filter, !!lv.p.filter, lv.key + ' filter');
      assert.strictEqual(!!p.top, !!lv.p.top, lv.key + ' top');
      if (lv.p.calc) assert.ok(lv.p.calc.includes(p.calc), lv.key + ' calc');
      const other = p.opts.meas.map((m) => m[0]).find((m) => m !== p.meas);
      if (other && p.calc !== 'rank') { tried++; if (!X.pillCheck(p, p.dim, other, p.sort, extra).ok) rejected++; } // two measures can draw the same bars (then both are right)
      if (p.calc) assert.ok(/calculation/.test(X.pillCheck(p, p.dim, p.meas, p.sort, Object.assign({}, extra, { calc: null })).why) || !X.pillCheck(p, p.dim, p.meas, p.sort, Object.assign({}, extra, { calc: null })).ok);
      if (p.top) assert.ok(!X.pillCheck(p, p.dim, p.meas, p.sort, Object.assign({}, extra, { top: false })).ok, lv.key + ' Top N matters');
    });
    assert.ok(seen.size >= 4, lv.key + ' makes different charts');
    assert.ok(rejected >= tried / 2, lv.key + ': a different measure is usually a different chart');
  });
  // percent of total adds up to 100%, a running total ends at the grand total
  const pct = X.bars({ dim: 'Sales[channel]', meas: 'SUM([qty])', calc: 'pct' }), run = X.bars({ dim: 'Sales[channel]', meas: 'SUM([qty])', calc: 'run' }), raw = X.bars({ dim: 'Sales[channel]', meas: 'SUM([qty])' });
  assert.ok(Math.abs(pct.reduce((s, r) => s + r.value, 0) - 1) < 1e-9);
  assert.strictEqual(run[run.length - 1].value, raw.reduce((s, r) => s + r.value, 0));
  const filtered = X.bars({ dim: 'Sales[store_city]', meas: 'SUM([qty])', filter: { dim: 'Sales[channel]', value: 'delivery' } });
  assert.ok(filtered.every((r, i) => r.value < X.bars({ dim: 'Sales[store_city]', meas: 'SUM([qty])' })[i].value), 'a filter on another field shortens every bar');
});

test('Guess the correlation: every level draws its kind of picture, and r is the true correlation of the points', () => {
  AW.levels('corr').forEach((lv) => {
    const rs = seeds(30).map((s) => A.corrPlot(s, lv));
    rs.forEach((c) => {
      assert.ok(Math.abs(A.pearson(c.pts) - c.r) < 0.006, lv.key + ' r is true');
      assert.ok(c.pts.every((q) => q[0] >= 0 && q[0] <= 1 && q[1] >= 0 && q[1] <= 1));
      assert.strictEqual(c.tol, lv.p.tol);
    });
    const avgAbs = rs.reduce((s, c) => s + Math.abs(c.r), 0) / rs.length;
    if (lv.p.kind === 'strong' || lv.p.kind === 'curve' || lv.p.kind === 'clusters') assert.ok(avgAbs > 0.6, lv.key + ' strong pictures (' + avgAbs + ')');
    if (lv.p.kind === 'ushape' || lv.p.kind === 'outlier-hide') assert.ok(avgAbs < 0.3, lv.key + ' r near 0 (' + avgAbs + ')');
    if (lv.p.kind === 'weak') assert.ok(avgAbs < 0.4, lv.key + ' weak');
    if (/^outlier|clusters|curve|ushape|range|mix/.test(lv.p.kind)) assert.ok(rs.every((c) => c.note), lv.key + ' explains the trap');
  });
  assert.deepStrictEqual([0, 0.1, 0.11, 0.2, 0.3, 0.31].map((e) => A.corrLevelScore(0.5 + e, 0.5, 0.1)), [3, 3, 2, 2, 1, 0]);
  [0, 1, 2, 3].forEach((w) => { const t = AW.levels('corr').filter((l) => l.w === w + 1).map((l) => l.p.tol); assert.ok(Math.min(...t) < t[0], 'world ' + (w + 1) + ': three stars get harder'); });
});

test('SQL blocks: every level, 1 to 16, makes endless puzzles that run on the real data; broken ones are really broken', async () => {
  const initSqlJs = require(path.join(root, 'vendor/sql.js/sql-wasm.js'));
  const SQL = await initSqlJs();
  const dbs = {}; ['retail', 'lab', 'app', 'growth'].forEach((d) => { dbs[d] = DA.buildDb(SQL, d); });
  const runner = (ds) => (sql) => { const r = dbs[ds].exec(sql); return r.length ? r[r.length - 1] : undefined; };
  let fixes = 0;
  for (let n = 1; n <= 16; n++) {
    const asks = new Set();
    seeds(40).forEach((seed) => {
      const p = Q.make(n, seed);
      asks.add(p.ask);
      assert.strictEqual(p.lv, n); assert.ok(p.gen && p.id && p.why);
      assert.strictEqual(p.sql, p.tiles.join(' '));
      assert.ok(p.tiles.length >= 4 && p.tiles.length <= 18, p.id + ' tiles');
      assert.ok(p.extra.length >= (p.fix ? 1 : 2), p.id + ' tempting wrong tiles');
      const res = runner(p.ds)(p.sql);
      assert.ok(res && res.values.length >= 1, p.id + ' returns no rows: ' + p.sql);
      assert.ok(A.blockCheck(p, p.tiles, runner(p.ds)).ok, p.id);
      assert.ok(!A.blockCheck(p, p.tiles.slice(0, -1), runner(p.ds)).ok, p.id + ' accepts an incomplete query');
      if (p.fix) { fixes++; assert.ok(!A.blockCheck(p, p.fix, runner(p.ds)).ok, p.id + ': the broken query is accepted: ' + p.fix.join(' ')); assert.ok(/^Fix the bug/.test(p.ask)); }
      const pool = A.blockPool(p).slice(); p.tiles.forEach((x) => { const k = pool.indexOf(x); assert.ok(k >= 0, p.id + ' misses ' + x); pool.splice(k, 1); });
    });
    assert.ok(asks.size >= 8, 'level ' + n + ' makes different questions (' + asks.size + ')');
  }
  assert.ok(fixes >= 80, 'about a quarter are bugs to fix (' + fixes + ')');
  // rounds: unsolved handmade first, then generated; levels without handmade puzzles are all generated
  ui.state.blocks = {};
  const r1 = A.blockRound(1, 5, 7);
  assert.deepStrictEqual(r1.map((p) => p.id), A.levelPuzzles(1).slice(0, 5).map((p) => p.id));
  A.levelPuzzles(1).forEach((p) => { ui.state.blocks[p.id] = 3; });
  assert.ok(A.blockRound(1, 5, 7).every((p) => p.gen && p.lv === 1), 'a finished handmade level keeps going with new puzzles');
  assert.notDeepStrictEqual(A.blockRound(1, 5, 7).map((p) => p.sql), A.blockRound(1, 5, 8).map((p) => p.sql), 'another seed, other puzzles');
  assert.ok(A.blockRound(12, 5, 3).every((p) => p.gen && p.lv === 12));
  assert.strictEqual(A.tileKind('tickets'), 'tbl'); assert.strictEqual(A.tileKind('events e'), 'tbl');
  ui.state.blocks = {};
});

test('level stars: a round of five decides them, the best is kept, clearing and three stars pay once', () => {
  setDay('2026-11-14');
  assert.deepStrictEqual([[3, 3, 3, 0, 0], [1, 1, 1, 0, 0], [3, 3, 2, 2, 0], [2, 2, 2, 2, 2], [3, 3, 3, 3, 1], [3, 3, 3, 2, 2], [0, 3, 3, 0, 0]].map(AW.roundStars), [1, 1, 2, 2, 3, 3, 0]);
  ui.state.arcade = {};
  const before = G.totalXp();
  let r = AW.record('xray', '2-1', [3, 3, 1, 0, 0]);
  assert.strictEqual(r.stars, 1); assert.ok(r.firstClear && r.cleared);
  assert.strictEqual(r.xp, ui.XP.arcadeLevel);
  assert.strictEqual(r.next.key, '2-2');
  r = AW.record('xray', '2-1', [3, 3, 3, 3, 3]);
  assert.strictEqual(r.stars, 3); assert.ok(r.newBest && !r.firstClear);
  assert.strictEqual(r.xp, ui.XP.arcadeStar, 'the clear bonus is not paid twice');
  r = AW.record('xray', '2-1', [3, 0, 0, 0, 0]);
  assert.strictEqual(r.stars, 0); assert.strictEqual(r.best, 3); assert.strictEqual(r.xp, 0);
  assert.strictEqual(ui.state.arcade['xray:2-1'], 3, 'a worse round never lowers the best');
  assert.strictEqual(G.totalXp() - before, ui.XP.arcadeLevel + ui.XP.arcadeStar);
  r = AW.record('xray', '2-1', [3, 3, 3, 3, 3]);
  assert.strictEqual(r.xp, 0, 'replaying a level is practice, never farming');
  assert.strictEqual(AW.record('xray', '9-9', [3, 3, 3, 3, 3]), null);
});

test('continue, world totals and the arcade badges', () => {
  ui.state.arcade = {}; ui.state.blocks = {};
  assert.strictEqual(AW.current('pipe').key, '1-1');
  ['1-1', '1-2', '1-3'].forEach((k) => { ui.state.arcade['pipe:' + k] = 2; });
  assert.strictEqual(AW.current('pipe').key, '1-4');
  ui.state.arcade['pipe:1-4'] = 1;
  assert.deepStrictEqual(AW.worldStats('pipe', 1), { stars: 7, max: 12, cleared: 4, total: 4, complete: true });
  assert.strictEqual(AW.current('pipe').key, '2-1');
  assert.strictEqual(AW.totals('pipe').worlds, 1);
  G.touch();
  assert.ok(ui.state.badges['arcade-world'], 'clearing a world earns a badge');
  DA.arcadeOrder.forEach((g) => AW.levels(g).filter((l) => l.w === 1).forEach((l) => { ui.state.arcade[g + ':' + l.key] = 3; }));
  G.touch();
  assert.ok(ui.state.badges['arcade-explorer']);
  assert.strictEqual(AW.summary().firstWorlds, 6);
  // SQL blocks: handmade progress from before the worlds shows on the map
  ui.state.arcade = {};
  A.levelPuzzles(3).forEach((p) => { ui.state.blocks[p.id] = 3; });
  assert.strictEqual(AW.stars('blocks', '3'), 3, 'every handmade puzzle with three stars shows as ★★★');
  ui.state.blocks[A.levelPuzzles(3)[0].id] = 1;
  assert.strictEqual(AW.stars('blocks', '3'), 2);
  assert.strictEqual(AW.stars('blocks', '9'), 0);
  assert.strictEqual(AW.current('blocks').key, '1');
  ui.state.blocks = {}; ui.state.arcade = {};
});

test('saved state: arcade levels are sanitised, merged with max (idempotent, commutative) and safe with an old client', () => {
  const s = ui.sanitize({ v: 2, arcade: { 'xray:1-1': 2, 'pills:4-4': 3, 'blocks:16': 1, 'blocks:17': 2, 'xray:5-1': 3, 'nope:1-1': 1, 'corr:1-1': 4, 'safe:2-2': '2', 'pipe:1-1': 0 } });
  assert.deepStrictEqual(s.arcade, { 'xray:1-1': 2, 'pills:4-4': 3, 'blocks:16': 1, 'safe:2-2': 2 });
  const a = ui.sanitize({ v: 2, arcade: { 'xray:1-1': 2, 'corr:2-3': 1 } }), b = ui.sanitize({ v: 2, arcade: { 'xray:1-1': 3, 'blocks:5': 2 } });
  const ab = Y.merge(a, b);
  assert.deepStrictEqual(ab.arcade, { 'xray:1-1': 3, 'corr:2-3': 1, 'blocks:5': 2 });
  assert.deepStrictEqual(Y.merge(b, a), ab);
  assert.deepStrictEqual(Y.merge(ab, ab), ab);
  const old = JSON.parse(JSON.stringify(ab)); delete old.arcade;
  assert.deepStrictEqual(Y.merge(ab, old).arcade, ab.arcade, 'an old client without the field loses nothing');
});

runAll();
