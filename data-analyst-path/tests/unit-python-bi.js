'use strict';
/* DotPython and DotBI engines on small hand-made tables. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { test, runAll } = require('./harness');

const root = path.join(__dirname, '..');
['js/sheets/core.js', 'js/sheets/format.js', 'js/sheets/edit.js', 'js/python/engine.js', 'js/python/interp.js', 'js/bi/engine.js'].forEach((f) => {
  (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
});

const DA = global.DA;

test('python-engine: DataFrame creation, groupby sum and sorting with pandas syntax', () => {
  const code = 'df = pd.DataFrame({"city": ["Madrid", "Paris", "Madrid"], "qty": [10, 20, 15]})\n' +
    'g = df.groupby("city")["qty"].sum()\n' +
    's = df.sort_values("qty", ascending=False)\n' +
    'print(g["Madrid"], s["qty"].tolist(), df.shape)';
  const r = DA.python.run(code, { data: {} });
  assert.ok(r.ok, r.error);
  assert.strictEqual(r.output, '25 [20, 15, 10] (3, 2)');
});

test('bi-engine: star schema model and DAX CALCULATE evaluation', () => {
  const m = new DA.bi.Model();
  m.addTable('Sales', ['store_city', 'qty', 'cust'], [{ store_city: 'Madrid', qty: 10, cust: 1 }, { store_city: 'Paris', qty: 20, cust: 2 }, { store_city: 'Madrid', qty: 5, cust: 2 }]);
  m.addTable('Customers', ['cust', 'segment'], [{ cust: 1, segment: 'student' }, { cust: 2, segment: 'retired' }]);
  m.addRelationship('Sales', 'cust', 'Customers', 'cust');
  assert.strictEqual(DA.bi.evalDax('CALCULATE(SUM(Sales[qty]), Sales[store_city]="Madrid")', m), 15);
  assert.strictEqual(DA.bi.evalDax('CALCULATE(SUM(Sales[qty]), Customers[segment] = "retired")', m), 25);
  assert.strictEqual(DA.bi.evalDax('SUMX(FILTER(Sales, RELATED(Customers[segment]) = "student"), Sales[qty] * 2)', m), 20);
});

test('bi-engine: Tableau Level of Detail (LOD) FIXED expression', () => {
  const rows = [{ customer_id: 1, order_date: '2025-01-10' }, { customer_id: 1, order_date: '2025-01-05' }, { customer_id: 2, order_date: '2025-02-01' }];
  const lod = DA.bi.evalLOD('{ FIXED [customer_id] : MIN([order_date]) }', rows);
  assert.strictEqual(lod['1'], '2025-01-05');
  assert.strictEqual(lod['2'], '2025-02-01');
  assert.strictEqual(DA.bi.evalTableau('COUNTD(IIF(MONTH({ FIXED [customer_id] : MIN([order_date]) }) = 1, [customer_id], NULL))', rows), 1);
});

runAll();
