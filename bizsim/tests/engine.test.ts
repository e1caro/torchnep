import { describe, expect, it } from 'vitest';
import { defaultBig, defaultSmall } from '../src/engine/params';
import { hash32 } from '../src/engine/rng';
import { foreignKeys } from '../src/engine/schema';
import { Sim } from '../src/engine/sim';
import { NULL_INT } from '../src/engine/table';
import { BIZ_TYPES, type BizType, type Change } from '../src/engine/types';

export function make(type: BizType, days = 200, seed = 7, changes: Change[] = []) {
  const big = { ...defaultBig(type, 'en', '2024-01-01', seed), name: 'Test', historyDays: days };
  const sim = new Sim(big, defaultSmall(big), changes);
  sim.run(days);
  return sim;
}
export function digest(sim: Sim): number {
  let h = 17;
  for (const d of sim.defs) {
    const t = sim.T[d.name];
    h = hash32(h, t.n);
    t.cols.forEach(c => {
      for (let r = 0; r < t.n; r++) {
        const v = (c as never)[r] as number | string | null;
        if (typeof v === 'string') { for (let i = 0; i < v.length; i++) h = hash32(h, v.charCodeAt(i)); }
        else h = hash32(h, v === null ? 1 : Number.isNaN(v) ? 2 : Math.round((v as number) * 1000));
      }
    });
  }
  return h;
}

describe('engine', () => {
  it('gives identical data for the same seed and parameters, however the days are batched', () => {
    const changes: Change[] = [{ id: 'a', day: 60, param: 'priceLevel', old: 0, value: 10 }, { id: 'b', day: 90, param: 'items', old: 0, value: 150 }, { id: 'c', day: 100, param: 'price:3', old: 0, value: 19.95 }];
    const a = make('clothing', 150, 11, changes);
    const big = a.big, b = new Sim(big, defaultSmall(big), changes);
    b.run(40); b.run(1); b.run(109);
    expect(digest(b)).toBe(digest(a));
    expect(digest(make('clothing', 150, 12, changes))).not.toBe(digest(a));
  });

  for (const type of BIZ_TYPES) {
    it(`${type}: keys are valid and the numbers add up`, () => {
      const sim = make(type, 240, 3, [{ id: 'x', day: 120, param: 'promoDepth', old: 0, value: 20 }, { id: 'y', day: 150, param: 'staffPerShift', old: 0, value: 2 }]);
      const T = sim.T;
      for (const d of sim.defs) {
        const t = T[d.name];
        // primary keys: ids are 1..n in order; date keys are 0..n-1
        const pk = t.cols[0] as Int32Array;
        for (let r = 0; r < t.n; r++) if (pk[r] !== (d.cols[0].type === 'date' ? r : r + 1)) throw new Error(`${d.name} pk at row ${r}`);
        for (const [col, ref] of foreignKeys(d, sim.defs)) {
          const c = t.ints(col), target = T[ref], isDate = d.cols[t.ci(col)].type === 'date', nullable = d.cols[t.ci(col)].nullable;
          for (let r = 0; r < t.n; r++) {
            const v = c[r];
            if (v === NULL_INT) { if (!nullable) throw new Error(`${d.name}.${col} null at ${r}`); continue; }
            if (isDate ? v < 0 || v >= target.n : v < 1 || v > target.n) throw new Error(`${d.name}.${col}=${v} has no row in ${ref}`);
          }
        }
      }
      // tickets equal the sum of their lines
      const tx = T.transactions, it = T.transaction_items, sum = new Float64Array(tx.n), nIt = new Int32Array(tx.n);
      const itx = it.ints('transaction_id'), line = it.ints('line_total'), q = it.ints('quantity');
      for (let r = 0; r < it.n; r++) { sum[itx[r] - 1] += line[r]; nIt[itx[r] - 1] += q[r]; }
      const total = tx.ints('total'), n = tx.ints('n_items');
      for (let r = 0; r < tx.n; r++) { expect(sum[r]).toBe(total[r]); expect(nIt[r]).toBe(n[r]); expect(total[r]).toBeGreaterThan(0); }
      // the daily summary equals the tickets of the day
      const ds = T.daily_summary, perDay = new Float64Array(ds.n), date = tx.ints('date'), taxes = tx.ints('tax');
      for (let r = 0; r < tx.n; r++) perDay[date[r]] += total[r] - taxes[r];
      const rev = ds.ints('revenue_net');
      for (let r = 0; r < ds.n; r++) expect(perDay[r]).toBe(rev[r]);
      // stock never goes negative
      const after = T.inventory_movements.ints('stock_after');
      for (let r = 0; r < T.inventory_movements.n; r++) expect(after[r]).toBeGreaterThanOrEqual(0);
      for (let p = 0; p < sim.everN; p++) expect(sim.stock[p]).toBeGreaterThanOrEqual(0);
      // plausible business
      const revenue = rev.subarray(0, ds.n).reduce((a, b) => a + b, 0) / 100, gm = ds.ints('gross_margin').subarray(0, ds.n).reduce((a, b) => a + b, 0) / 100;
      const profit = ds.ints('net_profit').subarray(0, ds.n).reduce((a, b) => a + b, 0) / 100;
      console.log(type, 'tx', tx.n, 'lines', it.n, 'customers', T.customers.n, 'rev/month', Math.round(revenue / 8), 'margin%', Math.round((100 * gm) / revenue), 'profit%', Math.round((100 * profit) / revenue),
        'returns', T.returns.n, 'POs', T.purchase_orders.n, 'staff', T.employees.n, 'walkouts', ds.ints('walkouts').subarray(0, ds.n).reduce((a, b) => a + b, 0), 'lost', Math.round(ds.ints('lost_sales_est').subarray(0, ds.n).reduce((a, b) => a + b, 0) / 100));
      expect(tx.n).toBeGreaterThan(1000);
      expect(gm / revenue).toBeGreaterThan(0.15);
      expect(T.parameter_changes.n).toBe(2);
    });
  }
});
