// The simulation engine as one plain script for Analyst Path (data-analyst-path/vendor/bizsim/engine.js), which has
// no build step. `npm run build:engine` writes it; it defines window.BizSim. Same recipe, same data as in BizSim.

import { mergeRecipes, sortChanges } from './cloud/merge';
import { dashboard, itemStart, snapshot, txRange } from './engine/analytics';
import { defaultBig, defaultSmall, estimate, recommendedInvestment, recommendedStaff } from './engine/params';
import { tableSource } from './engine/rows';
import { SQL_TYPE, foreignKeys, primaryKey, schemaFor } from './engine/schema';
import { Sim } from './engine/sim';
import { isoDate } from './engine/table';
import { TEMPLATES } from './engine/templates';
import { BIZ_TYPES, type BizType, type Lang, type Recipe } from './engine/types';

const HIDDEN = ['anomalies_key'];

interface Quick { id: string; type: BizType; name: string; days: number; seed: number; lang: Lang; today: string; now: number; sizeM2?: number; pricePos?: 0 | 1 | 2; locationTier?: 1 | 2 | 3; traffic?: number }

/** A recipe from a few choices; everything else takes the template's defaults. */
function quickRecipe(q: Quick): Recipe {
  const big = defaultBig(q.type, q.lang, isoDate(q.today, -q.days), q.seed);
  big.name = q.name; big.historyDays = q.days;
  if (q.sizeM2) big.sizeM2 = Math.min(TEMPLATES[q.type].size[1], Math.max(TEMPLATES[q.type].size[0], q.sizeM2));
  if (q.pricePos !== undefined) big.pricePos = q.pricePos;
  if (q.locationTier) big.locationTier = q.locationTier;
  if (q.sizeM2 || q.locationTier || q.pricePos !== undefined) big.staff = recommendedStaff(big);
  if (q.sizeM2) big.investment = recommendedInvestment(big);
  const small = defaultSmall(big);
  if (q.traffic) small.traffic = q.traffic;
  return { id: q.id, big, small0: small, changes: [], day: q.days, dirty: false, createdAt: q.now, updatedAt: q.now };
}

/** Starts a simulation that the caller advances in slices, so a page can stay responsive and show progress. */
function start(recipe: Recipe) {
  const sim = new Sim(recipe.big, recipe.small0, sortChanges(recipe.changes));
  return { sim, total: recipe.day, step(days: number) { sim.run(Math.min(days, recipe.day - sim.day)); return sim.day >= recipe.day; } };
}
function build(recipe: Recipe): Sim { const s = start(recipe); s.step(recipe.day); return s.sim; }

/**
 * The tables in the shape Analyst Path's datasets use. Fact tables are cut to the most recent days that keep the
 * sale lines under `maxLines`; dimension tables are complete.
 */
function dataset(sim: Sim, lang: Lang, maxLines = 200000) {
  const li = lang === 'es' ? 1 : 0, to = sim.day - 1;
  let lo = 0, hi = to;
  const lines = (from: number) => sim.T.transaction_items.n - itemStart(sim, txRange(sim, from, to)[0]);
  while (lo < hi) { const mid = (lo + hi) >> 1; if (lines(mid) <= maxLines) hi = mid; else lo = mid + 1; }
  const from = lo, defs = sim.defs.filter(d => !HIDDEN.includes(d.name)), data: Record<string, (string | number | null)[][]> = {};
  const tables = defs.map(d => {
    const fks = foreignKeys(d, defs), pk = primaryKey(d), hasPk = d.cols[0].type === 'id' || d.name === 'calendar' || d.name === 'daily_summary';
    const src = tableSource(sim, d.name, { from, to, lang }), rows = new Array(src.count);
    for (let i = 0; i < src.count; i++) rows[i] = src.row(i);
    data[d.name] = rows;
    return {
      name: d.name, note: d.d[li],
      cols: d.cols.map(c => { const fk = fks.find(k => k[0] === c.name); return [c.name, SQL_TYPE[c.type], hasPk && c.name === pk ? 'primary key' : fk ? `→ ${fk[1]}` : c.d[li]]; }),
    };
  });
  return { tables, data, from: isoDate(sim.big.startDate, from), to: isoDate(sim.big.startDate, to), days: to - from + 1, fromDay: from };
}

/** The table list of a business type without simulating anything. */
function schema(type: BizType, lang: Lang) {
  const li = lang === 'es' ? 1 : 0, defs = schemaFor(type).filter(d => !HIDDEN.includes(d.name));
  return defs.map(d => {
    const fks = foreignKeys(d, defs), pk = primaryKey(d), hasPk = d.cols[0].type === 'id' || d.name === 'calendar' || d.name === 'daily_summary';
    return { name: d.name, note: d.d[li], cols: d.cols.map(c => { const fk = fks.find(k => k[0] === c.name); return [c.name, SQL_TYPE[c.type], hasPk && c.name === pk ? 'primary key' : fk ? `→ ${fk[1]}` : c.d[li]]; }) };
  });
}

/**
 * Small, already-joined tables for the spreadsheet, pandas and BI labs: one row per sale line with the product,
 * category and ticket fields beside it (the most recent days that fit in `maxLines`), plus one row per day.
 */
function flat(sim: Sim, maxLines = 6000, maxDays = 400) {
  const T = sim.T, start = sim.big.startDate, to = sim.day - 1;
  let lo = 0, hi = to;
  const count = (from: number) => T.transaction_items.n - itemStart(sim, txRange(sim, from, to)[0]);
  while (lo < hi) { const mid = (lo + hi) >> 1; if (count(mid) <= maxLines) hi = mid; else lo = mid + 1; }
  const src = (name: string) => tableSource(sim, name), tx = src('transactions'), it = src('transaction_items'), pr = src('products'), cat = src('categories'), cu = src('customers'), ds = src('daily_summary'), cal = src('calendar');
  const col = (t: string, c: string) => T[t].ci(c), products = [], sales = [], days = [], customers = [];
  const catName: Record<number, string> = {}; for (let i = 0; i < cat.count; i++) { const r = cat.row(i); catName[r[0] as number] = r[1] as string; }
  const prow: (string | number | null)[][] = []; for (let i = 0; i < pr.count; i++) prow.push(pr.row(i));
  for (const r of prow) products.push([r[0], r[col('products', 'name')], catName[r[col('products', 'category_id')] as number], r[col('products', 'unit_cost')], r[col('products', 'list_price')], r[col('products', 'active')]]);
  const [t0, t1] = txRange(sim, lo, to); let i = itemStart(sim, t0);
  const xi = { tx: col('transaction_items', 'transaction_id'), p: col('transaction_items', 'product_id'), q: col('transaction_items', 'quantity'), up: col('transaction_items', 'unit_price'), lt: col('transaction_items', 'line_total'), uc: col('transaction_items', 'unit_cost') };
  const xt = { d: col('transactions', 'date'), ts: col('transactions', 'timestamp'), c: col('transactions', 'customer_id'), ch: col('transactions', 'channel'), pay: col('transactions', 'payment_method') };
  for (let t = t0; t < t1; t++) {
    const tr = tx.row(t), day = Math.round((Date.parse(tr[xt.d] + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000), wd = cal.row(day)[6];
    for (; i < it.count; i++) {
      const r = it.row(i); if (r[xi.tx] !== tr[0]) break;
      const p = prow[(r[xi.p] as number) - 1];
      sales.push([tr[0], tr[xt.d], String(tr[xt.d]).slice(0, 7), wd, +String(tr[xt.ts]).slice(11, 13), tr[xt.ch], tr[xt.pay], tr[xt.c], p[col('products', 'name')], catName[p[col('products', 'category_id')] as number], r[xi.q], r[xi.up], r[xi.lt], r[xi.uc]]);
    }
  }
  const dn = ['date', 'is_open', 'visitors', 'transactions', 'units', 'revenue_net', 'cogs', 'gross_margin', 'labour_cost', 'net_profit', 'new_customers', 'returning_customers', 'stockout_products'].map(c => col('daily_summary', c));
  for (let d = Math.max(0, to - maxDays + 1); d <= to; d++) { const r = ds.row(d); days.push([r[dn[0]], cal.row(d)[6], ...dn.slice(1).map(c => r[c])]); }
  const cn = ['customer_id', 'first_seen', 'segment', 'age_band', 'acquisition_channel', 'loyalty_member'].map(c => col('customers', c));
  for (let c = 0; c < cu.count; c++) { const r = cu.row(c); customers.push(cn.map(k => r[k])); }
  return {
    from: isoDate(start, lo), to: isoDate(start, to),
    sales: { cols: ['ticket_id', 'date', 'month', 'weekday', 'hour', 'channel', 'payment_method', 'customer_id', 'product', 'category', 'quantity', 'unit_price', 'line_total', 'unit_cost'], rows: sales },
    days: { cols: ['date', 'weekday', 'is_open', 'visitors', 'transactions', 'units', 'revenue_net', 'cogs', 'gross_margin', 'labour_cost', 'net_profit', 'new_customers', 'returning_customers', 'stockout_products'], rows: days },
    products: { cols: ['product_id', 'name', 'category', 'unit_cost', 'list_price', 'active'], rows: products },
    customers: { cols: ['customer_id', 'first_seen', 'segment', 'age_band', 'acquisition_channel', 'loyalty_member'], rows: customers },
  };
}

/** Headline numbers of the last 90 days, for the business cards. */
function summary(sim: Sim) {
  const k = dashboard(sim, { from: Math.max(0, sim.day - 90), to: sim.day - 1, category: -1, channel: -1 }).kpis;
  return { snap: snapshot(sim), revenue: k.revenue, marginPct: k.marginPct, profitPct: k.profitPct, transactions: k.transactions, avgTicket: k.avgTicket, customers: sim.T.customers.n, products: sim.activeN, tickets: sim.T.transactions.n, lines: sim.T.transaction_items.n };
}

const api = { version: 1, TYPES: BIZ_TYPES, sizes: Object.fromEntries(BIZ_TYPES.map(t => [t, TEMPLATES[t].size])), quickRecipe, start, build, dataset, schema, flat, summary, mergeRecipes, estimate, isoDate };
export type BizSimApi = typeof api;
(globalThis as unknown as { BizSim: BizSimApi }).BizSim = api;
