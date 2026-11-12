'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/names-es.js', 'js/sheets/parser.js', 'js/sheets/fn-core.js', 'js/sheets/engine.js'].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const S = global.DA.sheets;

test('sheets: core coordinates and A1 references', () => {
  assert.strictEqual(S.colName(0), 'A');
  assert.strictEqual(S.colName(25), 'Z');
  assert.strictEqual(S.colName(26), 'AA');
  assert.strictEqual(S.colIndex('A'), 0);
  assert.strictEqual(S.colIndex('Z'), 25);
  assert.strictEqual(S.colIndex('AA'), 26);
  assert.strictEqual(S.addr(4, 1), 'B5');
  assert.strictEqual(S.addr(4, 1, true, true), '$B$5');
});

test('sheets: parser handles basic formulas & Spanish names', () => {
  const ast = S.parseFormula('=SUM(10, 20)', 'Sheet1');
  assert.strictEqual(ast.type, 'CALL');
  assert.strictEqual(ast.fn, 'SUM');
  assert.strictEqual(ast.args.length, 2);

  const astEs = S.parseFormula('=SUMA(5, 15)', 'Sheet1');
  assert.strictEqual(astEs.fn, 'SUM');
});

test('sheets: engine basic evaluation and recalculation', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  sh.ensureCell(0, 0).raw = 10; sh.ensureCell(0, 0).value = 10; // A1
  sh.ensureCell(1, 0).raw = 25; sh.ensureCell(1, 0).value = 25; // A2
  const c3 = sh.ensureCell(2, 0); c3.formula = '=SUM(A1:A2)';    // A3

  wb.recalc();
  assert.strictEqual(c3.value, 35);
});

test('sheets: dynamic array spilling (UNIQUE / SORT / FILTER)', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // Fill A1:A4 with values [2, 1, 2, 3]
  [2, 1, 2, 3].forEach((v, idx) => {
    const c = sh.ensureCell(idx, 0); c.raw = v; c.value = v;
  });

  // B1 = UNIQUE(A1:A4)
  const b1 = sh.ensureCell(0, 1);
  b1.formula = '=UNIQUE(A1:A4)';
  wb.recalc();

  // Should spill into B1, B2, B3
  assert.ok(Array.isArray(b1.value));
  assert.strictEqual(sh.getCell(1, 1).value, 1);
  assert.strictEqual(sh.getCell(2, 1).value, 3);
});

test('sheets: XLOOKUP lookup and return', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // A1:A3 -> ['id1', 'id2', 'id3']
  // B1:B3 -> [100, 200, 300]
  ['id1', 'id2', 'id3'].forEach((id, i) => {
    sh.ensureCell(i, 0).raw = id; sh.ensureCell(i, 0).value = id;
    sh.ensureCell(i, 1).raw = (i + 1) * 100; sh.ensureCell(i, 1).value = (i + 1) * 100;
  });

  const c1 = sh.ensureCell(0, 2);
  c1.formula = '=XLOOKUP("id2", A1:A3, B1:B3)';
  wb.recalc();

  assert.strictEqual(c1.value, 200);
});

runAll();
