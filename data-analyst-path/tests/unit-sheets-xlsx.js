'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');

// Load fflate into global scope for Node
global.fflate = require('../vendor/fflate/fflate.min.js');

[
  'js/sheets/core.js',
  'js/sheets/format.js',
  'js/sheets/names-es.js',
  'js/sheets/parser.js',
  'js/sheets/fn-core.js',
  'js/sheets/fn-catalog.js',
  'js/sheets/engine.js',
  'js/sheets/xlsx.js'
].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const S = global.DA.sheets;

test('xlsx: export and import round trip with formulas and 2 sheets', async () => {
  const wb = new S.Workbook();
  const sh1 = wb.activeSheet();
  sh1.name = 'Sales';
  sh1.ensureCell(0, 0).raw = 100; sh1.ensureCell(0, 0).value = 100; // A1
  sh1.ensureCell(1, 0).raw = 200; sh1.ensureCell(1, 0).value = 200; // A2
  sh1.ensureCell(2, 0).formula = '=SUM(A1:A2)';                     // A3

  const sh2 = wb.addSheet('Targets');
  sh2.ensureCell(0, 0).raw = 'Goal'; sh2.ensureCell(0, 0).value = 'Goal';
  sh2.ensureCell(0, 1).raw = 500; sh2.ensureCell(0, 1).value = 500;

  wb.recalc();

  // Export to XLSX bytes
  const bytes = await S.exportXlsx(wb);
  assert.ok(bytes && bytes.length > 100);

  // Import back into fresh Workbook
  const importedWb = await S.importXlsx(bytes);
  assert.strictEqual(importedWb.sheets.length, 2);
  assert.strictEqual(importedWb.sheets[0].name, 'Sales');
  assert.strictEqual(importedWb.sheets[1].name, 'Targets');

  // Verify cell values and formula restored
  const impSh1 = importedWb.sheets[0];
  assert.strictEqual(impSh1.getVal(0, 0), 100);
  assert.strictEqual(impSh1.getVal(1, 0), 200);
  assert.strictEqual(impSh1.getCell(2, 0).formula, '=SUM(A1:A2)');
  assert.strictEqual(impSh1.getVal(2, 0), 300);

  const impSh2 = importedWb.sheets[1];
  assert.strictEqual(impSh2.getVal(0, 0), 'Goal');
  assert.strictEqual(impSh2.getVal(0, 1), 500);
});

test('functions: verify catalog count is >= 350', () => {
  const count = Object.keys(S.functions).length;
  assert.ok(count >= 350, 'Catalog count (' + count + ') should be >= 350');
});

runAll();
