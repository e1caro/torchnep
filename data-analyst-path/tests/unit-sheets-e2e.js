'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
[
  'js/data/datasets.js',
  'js/data/curriculum.js',
  'js/data/sheets-challenges.js',
  'js/sheets/core.js',
  'js/sheets/format.js',
  'js/sheets/names-es.js',
  'js/sheets/parser.js',
  'js/sheets/fn-core.js',
  'js/sheets/fn-catalog.js',
  'js/sheets/engine.js',
  'js/sheets/datatools.js',
  'js/sheets/chart.js',
  'js/sheets/xlsx.js',
  'js/ui.js',
  'js/game.js'
].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const DA = global.DA;
const S = DA.sheets;

test('e2e-sheets: complete lesson l1-4 challenge, award XP once, and update state', () => {
  DA.ui.state = DA.ui.sanitize({ v: 2 });
  const startXp = DA.game.totalXp();

  // Find dynamic array challenge for lesson l1-4
  const c = DA.sheetsChallenges.find((x) => x.id === 's_l1_4_1');
  assert.ok(c);

  const wb = new S.Workbook();
  const sh = wb.activeSheet();

  // Fill categories in G2:G6
  ['Coffee', 'Bakery', 'Coffee', 'Food', 'Tea'].forEach((cat, idx) => {
    sh.ensureCell(idx + 1, 6).raw = cat;
    sh.ensureCell(idx + 1, 6).value = cat;
  });

  // Enter =SORT(UNIQUE(G2:G6)) in K2 (row 1, col 10)
  const k2 = sh.ensureCell(1, 10);
  k2.formula = '=SORT(UNIQUE(G2:G6))';
  wb.recalc();

  // Check exercise logic
  const res = c.check(wb);
  assert.strictEqual(res.ok, true);

  // Award XP
  const awardKey = 'sheet:' + c.id;
  assert.ok(!DA.ui.state.sheets[c.id]);
  DA.ui.state.sheets[c.id] = true;
  const gained = DA.game.award(awardKey, DA.ui.XP.sheet(c.level), 'Spreadsheet solved');

  assert.strictEqual(gained, 45); // Level 3 * 15 = 45 XP
  // 45 XP crosses the default 40 XP daily goal, granting +10 XP goal bonus = 55 total XP
  assert.strictEqual(DA.game.totalXp(), startXp + 45 + DA.ui.XP.goalBonus);

  // Duplicate check awards 0 XP
  const repeatGained = DA.game.award(awardKey, DA.ui.XP.sheet(c.level), 'Spreadsheet solved');
  assert.strictEqual(repeatGained, 0);
  assert.strictEqual(DA.game.totalXp(), startXp + 45 + DA.ui.XP.goalBonus);
});

runAll();
