'use strict';
/* DotSheets, DotPython and DotBI: progression rules, keyboard and editing logic, and every challenge checker. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { DA, test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/fn-catalog.js', 'js/sheets/engine.js',
  'js/sheets/datatools.js', 'js/sheets/edit.js', 'js/data/sheets-challenges.js', 'js/data/lab-sheets.js', 'js/python/engine.js', 'js/python/interp.js',
  'js/data/lab-python.js', 'js/bi/engine.js', 'js/data/lab-bi.js', 'js/labgame.js'].forEach((f) => (0, eval)(fs.readFileSync(path.join(root, f), 'utf8') + '\n//# sourceURL=' + f));

const ui = DA.ui, L = DA.labgame, S = DA.sheets, P = DA.python, BI = DA.bi;
DA.labSheets.worlds.forEach((w) => w.levels.forEach((lv) => { lv.challenges = lv.challenges.filter(Boolean); }));
const labs = { sheets: L.register(DA.labSheets), python: L.register(DA.labPython), bi: L.register(DA.labBI) };

/* ---------------------------------------------------------------- progression */

test('labs: names, and 4 worlds x 4 levels x 3 challenges in each lab', () => {
  assert.deepStrictEqual([L.names.sheets, L.names.python, L.names.bi, L.names.sql], ['DotSheets', 'DotPython', 'DotBI', 'SQLab']);
  Object.values(labs).forEach((lab) => {
    assert.strictEqual(lab.worlds.length, 4, lab.id);
    lab.worlds.forEach((w) => { assert.strictEqual(w.levels.length, 4, lab.id + ' ' + w.title); w.levels.forEach((lv) => { assert.strictEqual(lv.challenges.length, 3, lab.id + ' ' + lv.title); assert.ok(lv.example && lv.example.code && lv.example.explain, lab.id + ' ' + lv.title + ' example'); }); });
    assert.strictEqual(lab.levels.length, 16);
    const ids = Object.keys(lab.byId);
    assert.strictEqual(ids.length, 48, lab.id + ' ids are unique');
    ids.forEach((id) => { const c = lab.byId[id]; assert.ok(c.title && c.task && c.hint && c.solution, lab.id + ' ' + id); });
  });
  const old = DA.sheetsChallenges.map((c) => c.id);
  old.forEach((id) => assert.ok(labs.sheets.byId[id], 'original sheets challenge ' + id + ' is reused'));
});

test('labs: only level 1.1 is open at first; 2 of 3 solved opens the next level, across worlds', () => {
  ui.state = ui.sanitize({ v: 2 });
  const lab = labs.python, L1 = lab.levels[0], L2 = lab.levels[1];
  assert.ok(L.levelState(lab, L1).unlocked);
  assert.ok(!L.levelState(lab, L2).unlocked);
  assert.ok(lab.levels.slice(1).every((lv) => !L.levelState(lab, lv).unlocked));
  L.record(lab, L1.challenges[0], { hinted: false, tries: 1 });
  assert.ok(!L.levelState(lab, L2).unlocked, 'one of three is not enough');
  const r = L.record(lab, L1.challenges[2], { hinted: false, tries: 1 });
  assert.strictEqual(r.unlocked, L2, 'the second solve reports the newly opened level');
  assert.ok(L.levelState(lab, L2).unlocked && !L.levelState(lab, lab.levels[2]).unlocked);
  lab.levels.slice(0, 4).forEach((lv) => lv.challenges.slice(0, 2).forEach((c) => L.record(lab, c, { hinted: true, tries: 3 })));
  assert.ok(L.levelState(lab, lab.levels[4]).unlocked, 'world 2 opens after world 1 level 4 is passed');
  assert.ok(L.worldState(lab, lab.worlds[1]).unlocked && !L.worldState(lab, lab.worlds[2]).unlocked);
  assert.strictEqual(L.current(lab).id, lab.levels[1].challenges[2].id, 'continue goes to the first unsolved challenge');
  assert.ok(L.isUnlocked(lab, lab.levels[4].challenges[0]) && !L.isUnlocked(lab, lab.levels[5].challenges[0]));
});

test('labs: stars are solved / no hint / first try, the best is kept, XP is paid once per challenge', () => {
  ui.state = ui.sanitize({ v: 2 });
  assert.deepStrictEqual([L.starsFor(false, 1), L.starsFor(true, 1), L.starsFor(false, 2), L.starsFor(true, 4)], [3, 2, 2, 1]);
  const lab = labs.bi, c = lab.levels[0].challenges[0];
  const a = L.record(lab, c, { hinted: true, tries: 3 });
  assert.strictEqual(a.stars, 1); assert.ok(a.xp > 0 && a.first);
  const b = L.record(lab, c, { hinted: false, tries: 1 });
  assert.strictEqual(b.stars, 3); assert.strictEqual(b.xp, 0, 'no second XP award');
  L.record(lab, c, { hinted: true, tries: 5 });
  assert.strictEqual(L.stars('bi', c.id), 3, 'a worse replay keeps the best stars');
  assert.strictEqual(ui.state.xp['bi:' + c.id].n, a.xp);
});

test('labs: progress survives saving, sanitising and merging two devices; old DotSheets progress counts', () => {
  ui.state = ui.sanitize({ v: 2, sheets: { s_l1_1_1: true }, labs: { python: { py01: 2, py02: 9, 'bad key!': 3 }, bi: { bi01: 1 }, nope: { x: 1 } } });
  assert.deepStrictEqual(ui.state.labs.python, { py01: 2 }, 'invalid stars and keys are dropped');
  assert.strictEqual(L.stars('sheets', 's_l1_1_1'), 1, 'an old solved sheet counts as 1 star');
  const other = ui.sanitize({ v: 2, labs: { python: { py01: 3, py05: 1 }, bi: {} } });
  const merged = DA.sync.merge(ui.state, other);
  assert.deepStrictEqual(merged.labs.python, { py01: 3, py05: 1 });
  assert.deepStrictEqual(merged.labs.bi, { bi01: 1 });
  assert.deepStrictEqual(DA.sync.merge(other, ui.state).labs, merged.labs, 'merge is symmetric');
  ui.state = merged; ui.save();
  const reloaded = ui.sanitize(JSON.parse(localStorage.getItem('data-analyst-path.v1')));
  assert.deepStrictEqual(reloaded.labs.python, { py01: 3, py05: 1 });
  assert.ok(reloaded.sql && reloaded.sheets.s_l1_1_1, 'SQLab and old sheets progress untouched');
});

/* ---------------------------------------------------------------- DotSheets keyboard and editing */

function sheetWith(rows) { const wb = new S.Workbook(); const sh = wb.activeSheet(); rows.forEach((r, i) => r.forEach((v, j) => { if (v !== '') S.setInput(sh, i, j, String(v)); })); wb.recalc(); return { wb, sh }; }
const at = (r, c) => ({ cursor: { r, c }, sel: { r1: r, c1: c, r2: r, c2: c } });

test('sheets keys: arrows move, Shift extends, Ctrl jumps to the data edge, Home and PageDown', () => {
  const { sh } = sheetWith([[1, 2, 3, ''], [4, '', 6, ''], [7, 8, 9, ''], ['', '', '', ''], [10, '', '', '']]);
  const k = (st, key, mods) => S.navKey(sh, st, key, mods || {}, 20);
  assert.deepStrictEqual(k(at(0, 0), 'ArrowDown').cursor, { r: 1, c: 0 });
  assert.deepStrictEqual(k(at(0, 0), 'ArrowUp').cursor, { r: 0, c: 0 }, 'cannot leave the sheet');
  assert.deepStrictEqual(k(at(0, 0), 'ArrowRight').cursor, { r: 0, c: 1 });
  const ext = k(k(at(0, 0), 'ArrowRight', { shift: true }), 'ArrowDown', { shift: true });
  assert.deepStrictEqual(ext.cursor, { r: 0, c: 0 }, 'the active cell stays');
  assert.deepStrictEqual(ext.sel, { r1: 0, c1: 0, r2: 1, c2: 1 });
  assert.deepStrictEqual(k(at(0, 0), 'ArrowDown', { ctrl: true }).cursor, { r: 2, c: 0 }, 'end of the filled block');
  assert.deepStrictEqual(k(at(2, 0), 'ArrowDown', { ctrl: true }).cursor, { r: 4, c: 0 }, 'next filled cell after a gap');
  assert.deepStrictEqual(k(at(0, 0), 'ArrowRight', { ctrl: true }).cursor, { r: 0, c: 2 });
  assert.deepStrictEqual(k(at(4, 0), 'ArrowDown', { ctrl: true }).cursor, { r: S.ROWS - 1, c: 0 }, 'past the data goes to the last row');
  assert.deepStrictEqual(k(at(2, 2), 'Home').cursor, { r: 2, c: 0 });
  assert.deepStrictEqual(k(at(2, 2), 'Home', { ctrl: true }).cursor, { r: 0, c: 0 });
  assert.deepStrictEqual(k(at(0, 0), 'End', { ctrl: true }).cursor, { r: 4, c: 2 });
  assert.deepStrictEqual(k(at(3, 1), 'PageDown').cursor, { r: 23, c: 1 });
  assert.deepStrictEqual(k(at(3, 1), 'PageUp').cursor, { r: 0, c: 1 });
  assert.strictEqual(k(at(0, 0), 'a'), null, 'typing is not navigation');
});

test('sheets keys: Enter/Tab move down/right, and wrap inside a selection', () => {
  assert.deepStrictEqual(S.stepInSelection(at(0, 0), 'down').cursor, { r: 1, c: 0 });
  assert.deepStrictEqual(S.stepInSelection(at(3, 3), 'left').cursor, { r: 3, c: 2 });
  assert.deepStrictEqual(S.stepInSelection(at(0, 0), 'up').cursor, { r: 0, c: 0 });
  const box = { cursor: { r: 1, c: 0 }, sel: { r1: 0, c1: 0, r2: 1, c2: 1 } };
  assert.deepStrictEqual(S.stepInSelection(box, 'down').cursor, { r: 0, c: 1 }, 'Enter at the bottom of a selection goes to the next column');
  assert.deepStrictEqual(S.stepInSelection({ cursor: { r: 0, c: 1 }, sel: box.sel }, 'right').cursor, { r: 1, c: 0 });
});

test('sheets editing: typed values, dates, formulas, clear, copy/paste with shifted references, undo/redo, CSV quotes', () => {
  const { wb, sh } = sheetWith([[2, 3], [4, 5]]);
  const hist = new S.History();
  hist.push(sh, [S.setInput(sh, 0, 2, '=A1*B1')]); wb.recalc();
  assert.strictEqual(sh.getVal(0, 2), 6);
  hist.push(sh, [S.setInput(sh, 2, 0, '2025-03-01')]);
  assert.strictEqual(sh.getCell(2, 0).fmt, 'yyyy-mm-dd');
  assert.strictEqual(S.cellText(sh.getCell(2, 0)), '2025-03-01', 'a typed date reads back as typed');
  const clip = S.copyRange(sh, { r1: 0, c1: 2, r2: 0, c2: 2 });
  assert.strictEqual(clip.text, '=A1*B1');
  hist.push(sh, S.pasteAt(sh, 1, 2, clip)); wb.recalc();
  assert.strictEqual(sh.getCell(1, 2).formula, '=A2*B2', 'relative references move with the paste');
  assert.strictEqual(sh.getVal(1, 2), 20);
  assert.strictEqual(S.shiftFormula('=SUM($A$1:A1)+"B2"', 1, 1), '=SUM($A$1:B2)+"B2"', '$ and text stay put');
  hist.push(sh, S.clearRange(sh, { r1: 0, c1: 0, r2: 1, c2: 0 })); wb.recalc();
  assert.strictEqual(sh.getCell(0, 0), null);
  hist.undo(); wb.recalc();
  assert.strictEqual(sh.getVal(0, 0), 2, 'undo restores the cleared cells');
  hist.redo(); wb.recalc();
  assert.strictEqual(sh.getCell(0, 0), null, 'redo clears them again');
  const pasted = S.pasteAt(sh, 5, 0, { text: 'a\tb\n1\t2' });
  assert.strictEqual(pasted.length, 4); assert.strictEqual(sh.getVal(6, 1), 2);
  assert.deepStrictEqual(S.parseCsv('a,"b, c",d\n1,"say ""hi""",3\n'), [['a', 'b, c', 'd'], ['1', 'say "hi"', '3']]);
});

test('sheets engine: comparisons work on ranges, text dates are read, chained formulas settle', () => {
  const { wb, sh } = sheetWith([['x', 5], ['y', 7], ['x', 9], ['Oct 20, 2025', '']]);
  S.setInput(sh, 0, 4, '=SUMPRODUCT((A1:A3="x")*B1:B3)');
  S.setInput(sh, 1, 4, '=YEAR(A4)');
  S.setInput(sh, 2, 4, '=E3+1');
  S.setInput(sh, 2, 5, '=E1');
  S.setInput(sh, 3, 4, '=FILTER(B1:B3, A1:A3="x")');
  S.setInput(sh, 0, 6, '=G2*2'); S.setInput(sh, 1, 6, '=3');
  wb.recalc();
  assert.strictEqual(sh.getVal(0, 4), 14);
  assert.strictEqual(sh.getVal(1, 4), 2025);
  assert.deepStrictEqual(sh.getVal(3, 4), [[5], [9]]);
  assert.strictEqual(sh.getVal(0, 6), 6, 'a formula that reads a later formula is right after one recalc');
});

test('DotSheets: every challenge fails on the original data and passes with its solution', () => {
  Object.values(labs.sheets.byId).forEach((c) => {
    const wb = S.datasetWorkbook(c.ds);
    assert.strictEqual(c.check(wb).ok, false, c.id + ' passes with no work');
    const sh = wb.activeSheet();
    c.steps.forEach(([a, f]) => { const p = S.parseAddr(a); S.setInput(sh, p.r, p.c, f); });
    wb.recalc();
    const r = c.check(wb);
    assert.strictEqual(r.ok, true, c.id + ': ' + r.message);
  });
  const c = labs.sheets.byId.sx_w1_1, wb = S.datasetWorkbook('retail');
  S.setInput(wb.activeSheet(), 1, 10, '4.2'); wb.recalc();
  assert.ok(/typed value/.test(c.check(wb).message), 'a typed number is not a formula');
  S.setInput(wb.activeSheet(), 1, 10, '=I2*1.2'); wb.recalc();
  assert.strictEqual(c.check(wb).ok, false, 'a wrong formula fails');
});

/* ---------------------------------------------------------------- DotPython */

const run = (code) => P.run(code, { echo: true });

test('DotPython: real pandas syntax works and the common mistakes give Python-style errors', () => {
  assert.strictEqual(run('print(df.shape)').output, '(6578, 9)');
  assert.strictEqual(run('rows, cols = df.shape\nprint(rows)').output, '6578');
  assert.ok(/'tuple' object is not callable.*df\.shape/.test(run('df.shape()').error));
  const top = run('result = df.sort_values("qty", ascending=False).head(1)').env.result;
  assert.strictEqual(top.data.qty[0], 3);
  assert.strictEqual(run('result = df.sort_values("qty", 0).head(1)').env.result.data.qty[0], 1, 'the 2nd positional argument is axis, as in pandas');
  assert.ok(/NameError: name 'false' is not defined/.test(run('df.sort_values("qty", ascending=false)').error));
  assert.ok(/truth value of a Series is ambiguous/.test(run('df[df["qty"] > 1 and df["qty"] < 3]').error));
  assert.ok(/KeyError: 'nope'/.test(run('df["nope"]').error));
  assert.ok(/SyntaxError/.test(run('print(df.head(').error));
  assert.ok(/IndentationError|SyntaxError/.test(run('if True:\nprint(1)').error));
  assert.strictEqual(run('for c in ["a", "b"]:\n    if c == "b":\n        print(c.upper())').output, 'B');
  assert.strictEqual(run('x = [n * 2 for n in range(3) if n > 0]\nprint(x, f"{3.14159:.2f}")').output, '[2, 4] 3.14');
  assert.strictEqual(run('print(df.groupby("category")["qty"].sum()["Coffee"])').output, '4551');
  const t = run('df.groupby("store_city").agg(units=("qty", "sum")).head(2)').output.split('\n');
  assert.deepStrictEqual(t.map((l) => l.trim().split(/\s+/)), [['units'], ['store_city'], ['Berlin', '1658'], ['Lisbon', '1277']]);
});

test('DotPython: user code cannot reach the page, and endless loops stop', () => {
  assert.ok(/NameError: name 'window' is not defined/.test(run('window.localStorage').error));
  assert.ok(/NameError/.test(run('DA.ui.state').error));
  assert.ok(/AttributeError/.test(run('df.constructor').error));
  assert.ok(/AttributeError/.test(run('"a".constructor').error));
  assert.ok(/TimeoutError/.test(run('while True:\n    pass').error));
  assert.ok(/ModuleNotFoundError/.test(run('import os').error));
  assert.ok(run('import pandas as pd\nprint(pd.read_csv("orders.csv").shape)').ok);
});

test('DotPython: every challenge passes with its solution and fails with a wrong or missing result', () => {
  Object.values(labs.python.byId).forEach((c) => {
    const ref = P.run(c.solution);
    assert.ok(ref.ok, c.id + ': ' + ref.error);
    const want = ref.env.result;
    assert.strictEqual(P.compareResult(P.run(c.solution).env.result, want, c.ordered).ok, true, c.id);
    assert.strictEqual(P.compareResult(P.run('print("hello")').env.result, want, c.ordered).ok, false, c.id + ' passes with only a print');
    assert.strictEqual(P.compareResult(P.run('result = df').env.result, want, c.ordered).ok, false, c.id + ' passes with df');
  });
  const c = labs.python.byId.py16;
  assert.ok(P.compareResult(P.run('result = df.groupby("channel").size()').env.result, P.run(c.solution).env.result, false).ok, 'an equivalent answer (groupby size vs value_counts) is accepted');
});

/* ---------------------------------------------------------------- DotBI */

const model = BI.retailModel();
const total = (f, mode) => BI.breakdown(model, mode || 'dax', f, null).total;

test('DotBI: DAX filter context, CALCULATE, FILTER, ALL, relationships and errors', () => {
  assert.strictEqual(total('SUM(Sales[qty])'), 8552);
  assert.strictEqual(total('CALCULATE(SUM(Sales[qty]), Sales[store_city] = "Madrid")'), 2240);
  const share = BI.breakdown(model, 'dax', 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales)))', 'Sales[store_city]');
  assert.ok(Math.abs(share.rows.reduce((a, r) => a + r.value, 0) - 1) < 1e-9, 'shares of the total add up to 1');
  const seg = BI.breakdown(model, 'dax', 'SUM(Sales[qty])', 'Customers[segment]');
  assert.strictEqual(seg.rows.reduce((a, r) => a + r.value, 0), 8552, 'Customers filters Sales through the relationship');
  assert.strictEqual(total('DIVIDE(1, 0)'), null, 'DIVIDE by zero is blank');
  assert.strictEqual(total('VAR a = 2\nVAR b = 3\nRETURN a * b'), 6);
  assert.throws(() => total('SUMM(Sales[qty])'), /Unknown function SUMM/);
  assert.throws(() => total('SUM(Sales[nope])'), /Column 'nope' is not in table 'Sales'/);
  assert.throws(() => total('Sales[qty]'), /needs an aggregation/);
  assert.throws(() => total('CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery"'), /Expected "\)"/);
});

test('DotBI: Tableau calculations and FIXED level of detail', () => {
  assert.strictEqual(total('SUM([qty])', 'tableau'), 8552);
  const lod = BI.evalLOD('{ FIXED [customer_id] : MIN([order_date]) }', model.table('Sales').rows);
  const first = model.table('Sales').rows.filter((r) => r.customer_id === 65).map((r) => r.order_date).sort()[0];
  assert.strictEqual(lod['65'], first, 'FIXED gives each customer their first order date');
  assert.strictEqual(total('SUM([qty]) / MIN({ FIXED : SUM([qty]) })', 'tableau'), 1);
  assert.strictEqual(total("SUM(IIF(DATEPART('month', [order_date]) = 12, [qty], 0))", 'tableau'), total('SUM(IIF(MONTH([order_date]) = 12, [qty], 0))', 'tableau'));
  assert.throws(() => total('[qty]', 'tableau'), /wrap it in an aggregation/);
  assert.throws(() => total('{ INCLUDE [customer_id] : SUM([qty]) }', 'tableau'), /not available/);
});

test('DotBI: every challenge matches its reference in total and per row, and a different measure fails', () => {
  Object.values(labs.bi.byId).forEach((c) => {
    const want = BI.breakdown(model, c.mode, c.solution, c.by);
    const wrong = BI.breakdown(model, c.mode, c.mode === 'dax' ? (c.solution === 'SUM(Sales[qty])' ? 'COUNTROWS(Sales)' : 'SUM(Sales[qty])') : (c.solution === 'SUM([qty])' ? 'COUNT([qty])' : 'SUM([qty])'), c.by);
    const same = BI.same(wrong.total, want.total) && wrong.rows.every((r, i) => BI.same(r.value, want.rows[i].value));
    assert.ok(!same, c.id + ' accepts a different measure');
    assert.ok(want.total !== undefined, c.id);
  });
});

runAll();
