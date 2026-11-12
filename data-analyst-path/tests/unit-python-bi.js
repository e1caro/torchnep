'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
[
  'js/data/datasets.js',
  'js/python/engine.js',
  'js/bi/engine.js'
].forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8'));
});

const DA = global.DA;

test('python-engine: DataFrame creation, groupby sum and sorting', () => {
  const pd = DA.python.pd;
  const df = new pd.DataFrame([
    { city: 'Madrid', qty: 10 },
    { city: 'Paris', qty: 20 },
    { city: 'Madrid', qty: 15 }
  ]);

  const grp = df.groupby('city').sum();
  assert.strictEqual(grp.rows.length, 2);
  const madrid = grp.rows.find(r => r.city === 'Madrid');
  assert.strictEqual(madrid.qty, 25);

  const sorted = df.sort_values('qty', false);
  assert.strictEqual(sorted.rows[0].qty, 20);
});

test('bi-engine: Star Schema model and DAX CALCULATE evaluation', () => {
  const pd = DA.python.pd;
  const df = new pd.DataFrame([
    { store_city: 'Madrid', qty: 10 },
    { store_city: 'Paris', qty: 20 },
    { store_city: 'Madrid', qty: 5 }
  ]);

  const model = new DA.bi.Model();
  model.addTable('Sales', df);

  const totalMadrid = DA.bi.evalDax('CALCULATE(SUM(Sales[qty]), Sales[store_city]="Madrid")', model);
  assert.strictEqual(totalMadrid, 15);
});

test('bi-engine: Tableau Level of Detail (LOD) FIXED expression', () => {
  const pd = DA.python.pd;
  const df = new pd.DataFrame([
    { customer_id: 1, order_date: '2025-01-10' },
    { customer_id: 1, order_date: '2025-01-05' },
    { customer_id: 2, order_date: '2025-02-01' }
  ]);

  const lod = DA.bi.evalLOD('{ FIXED [customer_id] : MIN([order_date]) }', df);
  assert.strictEqual(lod['1'], '2025-01-05');
  assert.strictEqual(lod['2'], '2025-02-01');
});

runAll();
