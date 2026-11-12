'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
[
  'js/data/datasets.js',
  'js/data/sheets-challenges.js',
  'js/sheets/core.js',
  'js/sheets/format.js',
  'js/sheets/names-es.js',
  'js/sheets/parser.js',
  'js/sheets/fn-core.js',
  'js/sheets/engine.js'
].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const DA = global.DA;
const S = DA.sheets;

test('sheets-challenges: all m1 lessons have at least 3 auto-checked challenges', () => {
  const chals = DA.sheetsChallenges;
  assert.ok(chals && chals.length >= 21);
  ['l1-1', 'l1-2', 'l1-3', 'l1-4', 'l1-5', 'l1-6', 'l1-7'].forEach((lid) => {
    const list = chals.filter((c) => c.lessonId === lid);
    assert.ok(list.length >= 3, 'lesson ' + lid + ' has >= 3 challenges');
  });
});

test('sheets-challenges: exercise checker tests logic correctly', () => {
  const c = DA.sheetsChallenges.find((x) => x.id === 's_l1_2_1'); // J2 = H2*I2
  assert.ok(c);

  const wb = new S.Workbook();
  const sh = wb.activeSheet();
  sh.ensureCell(1, 7).raw = 2; sh.ensureCell(1, 7).value = 2;     // H2
  sh.ensureCell(1, 8).raw = 3.5; sh.ensureCell(1, 8).value = 3.5; // I2

  // initially empty -> fails check
  assert.strictEqual(c.check(wb).ok, false);

  // set formula in J2 -> passes check
  const j2 = sh.ensureCell(1, 9);
  j2.formula = '=H2*I2';
  wb.recalc();
  assert.strictEqual(c.check(wb).ok, true);
});

test('sheets-challenges: XP award key is unique and idempotent', () => {
  DA.ui.state = DA.ui.sanitize({ v: 2 });
  const key = 'sheet:s_l1_1_1';
  const n1 = DA.game.award(key, DA.ui.XP.sheet(1), 'Spreadsheet solved');
  assert.strictEqual(n1, 15);
  const n2 = DA.game.award(key, DA.ui.XP.sheet(1), 'Spreadsheet solved');
  assert.strictEqual(n2, 0); // cannot be farmed
});

runAll();
