'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
[
  'js/sheets/core.js',
  'js/sheets/format.js',
  'js/sheets/parser.js',
  'js/sheets/fn-core.js',
  'js/sheets/engine.js',
  'js/sheets/datatools.js'
].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const S = global.DA.sheets;

test('datatools: sortRange asc & desc', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // Fill col A with [30, 10, 20]
  [30, 10, 20].forEach((v, idx) => {
    sh.ensureCell(idx, 0).raw = v;
    sh.ensureCell(idx, 0).value = v;
  });

  S.sortRange(sh, 0, 0, 2, 0, 0, true); // sort asc
  assert.strictEqual(sh.getVal(0, 0), 10);
  assert.strictEqual(sh.getVal(1, 0), 20);
  assert.strictEqual(sh.getVal(2, 0), 30);
});

test('datatools: removeDuplicates', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // A1:A4 -> ['Madrid', 'Paris', 'Madrid', 'Berlin']
  ['Madrid', 'Paris', 'Madrid', 'Berlin'].forEach((v, idx) => {
    sh.ensureCell(idx, 0).raw = v;
    sh.ensureCell(idx, 0).value = v;
  });

  const res = S.removeDuplicates(sh, 0, 0, 3, 0, [0]);
  assert.strictEqual(res.removed, 1);
  assert.strictEqual(sh.getVal(0, 0), 'Madrid');
  assert.strictEqual(sh.getVal(1, 0), 'Paris');
  assert.strictEqual(sh.getVal(2, 0), 'Berlin');
  assert.strictEqual(sh.getVal(3, 0), null);
});

test('datatools: textToColumns', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  sh.ensureCell(0, 0).raw = 'John, Doe, 30';
  sh.ensureCell(0, 0).value = 'John, Doe, 30';

  S.textToColumns(sh, 0, 0, 0, ',');
  assert.strictEqual(sh.getVal(0, 0), 'John');
  assert.strictEqual(sh.getVal(0, 1), 'Doe');
  assert.strictEqual(sh.getVal(0, 2), 30);
});

test('datatools: buildPivot aggregation', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // header: City, Sales
  // Madrid, 100
  // Paris, 200
  // Madrid, 50
  sh.ensureCell(0, 0).value = 'City'; sh.ensureCell(0, 1).value = 'Sales';
  sh.ensureCell(1, 0).value = 'Madrid'; sh.ensureCell(1, 1).value = 100;
  sh.ensureCell(2, 0).value = 'Paris'; sh.ensureCell(2, 1).value = 200;
  sh.ensureCell(3, 0).value = 'Madrid'; sh.ensureCell(3, 1).value = 50;

  const pivot = S.buildPivot(sh, 0, 0, 3, 1, { rowCol: 0, valCol: 1, aggFn: 'SUM' });
  // Row Labels, SUM of Value
  // Madrid, 150
  // Paris, 200
  // Grand Total, 350
  assert.strictEqual(pivot[1][0], 'Madrid');
  assert.strictEqual(pivot[1][1], 150);
  assert.strictEqual(pivot[2][0], 'Paris');
  assert.strictEqual(pivot[2][1], 200);
  assert.strictEqual(pivot[3][1], 350);
});

test('datatools: goalSeek solver', () => {
  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  // A1: price (initial 10)
  // A2: tax multiplier (=A1 * 1.21)
  sh.ensureCell(0, 0).raw = 10; sh.ensureCell(0, 0).value = 10;
  sh.ensureCell(1, 0).formula = '=A1 * 1.21';
  wb.recalc();

  // Find price such that A2 becomes 24.2
  const sol = S.goalSeek(wb, 1, 0, 24.2, 0, 0);
  assert.ok(sol.success);
  assert.ok(Math.abs(sol.value - 20) < 0.05);
});

runAll();
