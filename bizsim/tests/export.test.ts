import { unzipSync, strFromU8 } from 'fflate';
import initSqlJs from 'sql.js';
import { describe, expect, it } from 'vitest';
import { dashboard } from '../src/engine/analytics';
import { queryIndex, tableSource } from '../src/engine/rows';
import { buildExport, exportTables, type ExportOpts } from '../src/export';
import { make } from './engine.test';

const join = (parts: Uint8Array[]) => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

describe('exports', async () => {
  const SQL = await initSqlJs();
  const sim = make('restaurant', 150, 5), book = make('bookshop', 120, 9);
  const opts = (s: typeof sim, o: Partial<ExportOpts> = {}): ExportOpts => ({ tables: exportTables(s, !!o.dirty, true), format: 'sqlite', from: 0, to: s.day - 1, dirty: false, keys: true, lang: 'en', ...o });

  it('SQLite: every table arrives complete and no foreign key is broken, also with a date range', () => {
    for (const [s, o] of [[sim, {}], [book, {}], [sim, { from: 40, to: 99 }], [book, { from: 30, to: 60 }]] as const) {
      const db = new SQL.Database(buildExport(s, opts(s, o), SQL).parts[0]);
      db.run('PRAGMA foreign_keys = ON');
      expect(db.exec('PRAGMA foreign_key_check')).toEqual([]);
      expect(db.exec('PRAGMA integrity_check')[0].values[0][0]).toBe('ok');
      const count = (t: string) => db.exec(`SELECT COUNT(*) FROM "${t}"`)[0].values[0][0] as number;
      for (const t of exportTables(s, false, true)) expect(count(t)).toBe(tableSource(s, t, o).count);
      if (!('from' in o)) {
        expect(count('transactions')).toBe(s.T.transactions.n);
        // an analyst's join gives the same revenue as the dashboard
        const sql = db.exec(`SELECT ROUND(SUM(i.line_total / (1 + c.vat_rate)), 0) FROM transaction_items i JOIN products p ON p.product_id = i.product_id JOIN categories c ON c.category_id = p.category_id`)[0].values[0][0] as number;
        const dash = dashboard(s, { from: 0, to: s.day - 1, category: -1, channel: -1 });
        expect(Math.abs(sql - dash.kpis.revenue) / dash.kpis.revenue).toBeLessThan(0.001);
      } else expect(count('transactions')).toBeLessThan(s.T.transactions.n);
      db.close();
    }
  });

  it('CSV, Excel and SQL dump hold the same rows', () => {
    const zip = unzipSync(join(buildExport(sim, opts(sim, { format: 'csv' })).parts));
    const csv = strFromU8(zip['transactions.csv']).trim().split('\n');
    expect(csv.length).toBe(sim.T.transactions.n + 1);
    expect(csv[0].replace('﻿', '')).toBe(sim.T.transactions.def.cols.map(c => c.name).join(','));
    expect(Object.keys(zip)).toContain('data_dictionary.csv');
    expect(strFromU8(zip['data_dictionary.csv'])).toContain('FK → transactions.transaction_id');

    const x = unzipSync(join(buildExport(sim, opts(sim, { format: 'xlsx' })).parts));
    const wb = strFromU8(x['xl/workbook.xml']), names = [...wb.matchAll(/<sheet name="([^"]+)"/g)].map(m => m[1]);
    expect(names).toEqual(exportTables(sim, false, true));
    const sheet = strFromU8(x[`xl/worksheets/sheet${names.indexOf('transactions') + 1}.xml`]);
    expect(sheet.match(/<row>/g)!.length).toBe(sim.T.transactions.n + 1);

    const dump = strFromU8(join(buildExport(sim, opts(sim, { format: 'sql' })).parts));
    const db = new SQL.Database(); db.run(dump);
    expect(db.exec('SELECT COUNT(*) FROM transaction_items')[0].values[0][0]).toBe(sim.T.transaction_items.n);
    expect(db.exec('PRAGMA foreign_key_check')).toEqual([]);
    db.close();
    const one = buildExport(sim, opts(sim, { format: 'csv', tables: ['products'] }));
    expect(one.name).toMatch(/products\.csv$/);
  });

  it('dirty data is reproducible, is listed in its answer key and leaves the clean data alone', () => {
    const clean = tableSource(sim, 'transactions'), a = tableSource(sim, 'transactions', { dirty: true }), b = tableSource(sim, 'transactions', { dirty: true });
    expect(a.count).toBeGreaterThan(clean.count);
    let diff = 0; for (let i = 0; i < 400; i++) { expect(a.row(i)).toEqual(b.row(i)); }
    const key = tableSource(sim, 'dirty_data_key', { dirty: true });
    const issues = new Set<string>(); for (let i = 0; i < key.count; i++) issues.add(key.row(i)[3] as string);
    for (const k of ['missing_value', 'outlier', 'duplicate_row', 'date_format', 'inconsistent_text']) expect(issues).toContain(k);
    const j = new Map<number, number>(); for (let i = 0; i < key.count; i++) { const r = key.row(i); if (r[0] === 'transactions') j.set(r[1] as number, 1); }
    for (let i = 0, c = 0; i < a.count; i++) { const row = a.row(i); if (!j.has(i + 1)) { expect(row).toEqual(clean.row(c)); } else diff++; if (i + 1 >= a.count || a.row(i + 1)[0] !== row[0]) c++; }
    expect(diff).toBeGreaterThan(10);
    const db = new SQL.Database(buildExport(sim, opts(sim, { dirty: true }), SQL).parts[0]);
    expect(db.exec('SELECT COUNT(*) FROM dirty_data_key')[0].values[0][0]).toBe(key.count);
    db.close();
  });

  it('the table view sorts, filters and searches', () => {
    const src = tableSource(sim, 'products'), price = src.def.cols.findIndex(c => c.name === 'list_price');
    const sorted = queryIndex(src, { sort: { col: price, desc: true } })!;
    expect(src.row(sorted[0])[price]).toBeGreaterThanOrEqual(src.row(sorted[5])[price] as number);
    const cheap = queryIndex(src, { filters: { [price]: '<5' } })!;
    expect(cheap.length).toBeGreaterThan(0); for (const i of cheap) expect(src.row(i)[price]).toBeLessThan(5);
    const found = queryIndex(src, { search: 'paella' })!;
    expect(found.length).toBe(2);
  });

  it('the dashboard numbers are consistent', () => {
    const d = dashboard(sim, { from: 80, to: 149, category: -1, channel: -1 }), k = d.kpis;
    expect(d.daily.rev.length).toBe(70);
    expect(Math.abs(d.daily.rev.reduce((a, b) => a + b, 0) - k.revenue)).toBeLessThan(0.01);
    expect(Math.abs(d.categories.reduce((a, c) => a + c.rev, 0) - k.revenue)).toBeLessThan(0.05);
    expect(Math.abs(d.pnl.slice(0, -1).reduce((a, p) => a + p.value, 0) - k.netProfit)).toBeLessThan(0.05);
    expect(k.conversion).toBeGreaterThan(0.3); expect(k.conversion).toBeLessThanOrEqual(1);
    expect(k.retention).not.toBeNull(); expect(d.cohorts.length).toBeGreaterThan(3); expect(d.rfm.reduce((a, s) => a + s.customers, 0)).toBeGreaterThan(100);
    expect(k.tableTurnover).toBeGreaterThan(0.3); expect(k.foodCostPct).toBeGreaterThan(0.2);
    const cat = dashboard(sim, { from: 80, to: 149, category: 1, channel: 0 });
    expect(cat.kpis.revenue).toBeLessThan(k.revenue); expect(cat.categories.filter(c => c.rev > 0).length).toBe(1);
    // a price rise lowers the projected units sold but the projection reacts
    const up = sim.project({ ...sim.small, priceLevel: 30 }, 30), base = sim.project(sim.small, 30), more = sim.project({ ...sim.small, traffic: sim.small.traffic * 1.5 }, 30);
    expect(base.length).toBe(30); expect(up.join()).not.toBe(base.join());
    expect(more.reduce((a, b) => a + b, 0)).toBeGreaterThan(base.reduce((a, b) => a + b, 0));
    expect(sim.project(sim.small, 30).join()).toBe(base.join());
  });
});
