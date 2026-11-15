// The simulations live here, off the main thread: one Sim per loaded business.

import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { sortChanges } from '../cloud/merge';
import { dashboard, snapshot, weeklyRevenue } from '../engine/analytics';
import { exportDefs, queryIndex, tableSource, type RowSource } from '../engine/rows';
import { KEY_TABLES } from '../engine/schema';
import { Sim } from '../engine/sim';
import type { Recipe } from '../engine/types';
import { buildExport } from '../export';
import type { Ops, Req, Res } from './protocol';

const sims = new Map<string, Sim>();
let sql: Promise<SqlJsStatic> | null = null;
const post = (m: Res, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);
const need = (id: string) => { const s = sims.get(id); if (!s) throw new Error('not loaded'); return s; };

/** Brings the simulation of a recipe up to date, rebuilding it only when its past no longer matches. */
function ensure(r: Recipe): Sim {
  const changes = sortChanges(r.changes); let sim = sims.get(r.id);
  if (sim) {
    const past = changes.filter(c => c.day < sim!.day).map(c => c.id).join(), applied = sim.appliedIds().join();
    if (r.day < sim.day || past !== applied) sim = undefined;
  }
  if (!sim) { sim = new Sim(r.big, r.small0, changes); sims.set(r.id, sim); } else sim.setChanges(changes);
  const total = r.day - sim.day;
  if (total > 60) post({ progress: { id: r.id, done: 0, total } });
  for (let done = 0; sim.day < r.day;) { const n = Math.min(30, r.day - sim.day); sim.run(n); done += n; if (total > 60) post({ progress: { id: r.id, done, total } }); }
  return sim;
}

let cache: { key: string; src: RowSource; qKey: string; idx: Int32Array | null } | null = null;

const handlers: { [K in keyof Ops]: (a: Ops[K]['args']) => Ops[K]['result'] | Promise<Ops[K]['result']> } = {
  load: ({ recipe }) => { const sim = ensure(recipe); return { day: sim.day, snap: snapshot(sim) }; },
  unload: ({ id }) => { sims.delete(id); cache = null; return null; },
  step: ({ recipe, days }) => { const sim = ensure(recipe); sim.run(days); return { day: sim.day, snap: snapshot(sim) }; },
  dash: ({ id, filters, pending }) => {
    const sim = need(id); sim.setChanges(sortChanges(pending.changes));
    const next = sim.pendingSmall(), same = JSON.stringify(next) === JSON.stringify(sim.small);
    // the model's expectation is scaled by how the last four weeks actually compared with it (stockouts, queues…)
    const back = Math.min(28, sim.day), rev = sim.T.daily_summary.ints('revenue_net'); let actual = 0;
    for (let d = sim.day - back; d < sim.day; d++) actual += rev[d] / 100;
    const expected = sim.project(sim.small, back, sim.day - back).reduce((a, b) => a + b, 0), k = expected > 0 ? Math.min(1.3, Math.max(0.4, actual / expected)) : 1;
    const scale = (a: number[]) => a.map(v => Math.round(v * k));
    return { ...dashboard(sim, filters), projection: { base: scale(sim.project(sim.small, 30)), alt: same ? null : scale(sim.project(next, 30)) }, catNames: sim.T.categories.col('name') as string[], day: sim.day };
  },
  tables: ({ id, dirty, lang }) => {
    const sim = need(id);
    return exportDefs(sim, dirty).map(d => ({
      name: d.name, d: d.d, key: KEY_TABLES.includes(d.name), rows: sim.T[d.name] && !dirty ? sim.T[d.name].n : tableSource(sim, d.name, { dirty, lang }).count,
      cols: d.cols.map(c => ({ name: c.name, type: c.type, d: c.d, ref: c.ref })),
    }));
  },
  rows: ({ id, table, dirty, lang, query }) => {
    const sim = need(id), key = `${id}|${table}|${dirty}|${lang}|${sim.day}`, qKey = JSON.stringify([query.sort, query.filters, query.search]);
    if (!cache || cache.key !== key) cache = { key, src: tableSource(sim, table, { dirty, lang }), qKey: '', idx: null };
    if (cache.qKey !== qKey) { cache.idx = queryIndex(cache.src, query); cache.qKey = qKey; }
    const { src, idx } = cache, total = idx ? idx.length : src.count, rows = [];
    for (let i = query.offset; i < Math.min(total, query.offset + query.limit); i++) rows.push(src.row(idx ? idx[i] : i));
    return { total, rows };
  },
  products: ({ id }) => {
    const sim = need(id), names = sim.T.products.col('name') as string[], out = [];
    for (let p = 0; p < sim.everN; p++) out.push({ id: p + 1, name: names[p], cat: sim.catOf[p], price: sim.price[p] / 100, ref: sim.ref[p], cost: sim.cost[p] / 100, active: p < sim.activeN, stock: sim.stock[p], override: sim.override[p] > 0 });
    return out;
  },
  export: async ({ id, opts }) => {
    const sim = need(id);
    if (opts.format === 'sqlite') sql ??= initSqlJs({ locateFile: () => wasmUrl });
    return buildExport(sim, opts, opts.format === 'sqlite' ? await sql! : undefined);
  },
  compare: ({ ids }) => Object.fromEntries(ids.filter(i => sims.has(i)).map(i => [i, weeklyRevenue(sims.get(i)!)])),
};

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, op, args } = e.data;
  try {
    const result = await (handlers[op] as (a: unknown) => unknown)(args);
    const transfer = op === 'export' ? (result as Ops['export']['result']).parts.map(p => p.buffer as ArrayBuffer) : [];
    post({ id, ok: true, result }, [...new Set(transfer)]);
  } catch (err) { post({ id, ok: false, error: (err as Error).message || String(err) }); }
};
