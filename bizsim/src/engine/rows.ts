// Rows as they are shown and exported: formatted values, an optional date range, the optional dirty-data pass,
// plus sorting, filtering and searching for the table view.

import { hashUnit } from './rng';
import { DICTIONARY_DEF, DIRTY_KEY_DEF, KEY_TABLES, foreignKeys, primaryKey } from './schema';
import type { Sim } from './sim';
import { NULL_INT, cell, type TableDef } from './table';
import type { Lang } from './types';

export type Value = string | number | null;
export interface RowSource { def: TableDef; count: number; row(i: number): Value[]; }
export interface SourceOpts { from?: number; to?: number; dirty?: boolean; lang?: Lang; }

function dayOfRow(sim: Sim, def: TableDef, r: number): number {
  const t = sim.T[def.name], v = t.ints(def.day!.col)[r];
  if (!def.day!.via) return v;
  return dayOfRow(sim, sim.T[def.day!.via].def, v - 1);
}

// ---- dirty data: every defect is decided by a hash of (seed, table, row, column), so it is reproducible ----

const DIRTY_TABLES = ['transactions', 'transaction_items', 'customers', 'products', 'returns', 'inventory_movements', 'purchase_orders', 'shifts', 'expenses', 'reservations'];
const DUP_TABLES = ['transactions', 'transaction_items', 'customers'];
export interface Defect { v: Value; issue: string; }
export function dirtyCell(seed: number, tIdx: number, def: TableDef, ci: number, row: number, v: Value): Defect | null {
  if (ci === 0 || v === null) return null;
  const col = def.cols[ci], u = hashUnit(seed, 0xd127 + tIdx, row, ci);
  if (col.type === 'fk') return col.nullable && u < 0.004 ? { v: null, issue: 'missing_value' } : null;
  if (col.type === 'date' || col.type === 'datetime') {
    if (u >= 0.006) return null;
    const s = String(v); return { v: `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}${s.slice(10)}`, issue: 'date_format' };
  }
  if (col.type === 'text' || col.type === 'enum') {
    if (u < 0.006) return { v: null, issue: 'missing_value' };
    if (u < 0.016) { const s = String(v), k = Math.floor(u * 1e6) % 3; return { v: k === 0 ? s.toUpperCase() : k === 1 ? ` ${s} ` : s.toLowerCase() + ' ', issue: 'inconsistent_text' }; }
    return null;
  }
  if (col.measure && typeof v === 'number') {
    if (v === 0) return null;
    if (u < 0.006) return { v: null, issue: 'missing_value' };
    if (u < 0.008) return { v: (v as number) * 100, issue: 'outlier' };
    if (u < 0.009) return { v: -(v as number), issue: 'negative_value' };
  }
  return null;
}

export function tableSource(sim: Sim, name: string, o: SourceOpts = {}): RowSource {
  if (name === 'data_dictionary') return dictionarySource(sim, o.lang ?? 'en', !!o.dirty);
  if (name === 'dirty_data_key') return dirtyKeySource(sim, o);
  const t = sim.T[name], def = t.def, start = sim.big.startDate, nC = def.cols.length;
  let idx: Int32Array | null = null;
  const ranged = def.day && ((o.from ?? 0) > 0 || (o.to ?? Infinity) < sim.day - 1);
  const tIdx = DIRTY_TABLES.indexOf(name), dirty = !!o.dirty && tIdx >= 0, dup = dirty && DUP_TABLES.includes(name);
  if (ranged || dup) {
    const out: number[] = [], from = o.from ?? 0, to = o.to ?? Infinity;
    for (let r = 0; r < t.n; r++) {
      if (ranged) { const d = dayOfRow(sim, def, r); if (d < from || d > to) continue; }
      out.push(r);
      if (dup && hashUnit(sim.big.seed, 0xd00b + tIdx, r) < 0.004) out.push(r);
    }
    idx = Int32Array.from(out);
  }
  return {
    def, count: idx ? idx.length : t.n,
    row(i) {
      const r = idx ? idx[i] : i, out: Value[] = new Array(nC);
      for (let c = 0; c < nC; c++) {
        let v = cell(t, c, r, start);
        if (dirty) { const d = dirtyCell(sim.big.seed, tIdx, def, c, r, v); if (d) v = d.v; }
        out[c] = v;
      }
      return out;
    },
  };
}

const TYPE_LABEL: Record<string, string> = { id: 'integer', fk: 'integer', int: 'integer', bool: 'integer (0/1)', money: 'decimal (EUR)', real: 'decimal', text: 'text', date: 'date (YYYY-MM-DD)', datetime: 'datetime (YYYY-MM-DD HH:MM:SS)', enum: 'text (category)' };
export function exportDefs(sim: Sim, dirty: boolean): TableDef[] {
  return [...sim.defs, DICTIONARY_DEF, ...(dirty ? [DIRTY_KEY_DEF] : [])];
}
function dictionarySource(sim: Sim, lang: Lang, dirty: boolean): RowSource {
  const li = lang === 'es' ? 1 : 0, rows: Value[][] = [], defs = exportDefs(sim, dirty);
  for (const d of defs) {
    const fks = foreignKeys(d, defs);
    rows.push([d.name, '*', 'table', null, d.d[li] + (KEY_TABLES.includes(d.name) ? (li ? ' (solucionario)' : ' (answer key)') : '')]);
    for (const c of d.cols) {
      const fk = fks.find(k => k[0] === c.name), isPk = c.name === primaryKey(d) && (c.type === 'id' || d.name === 'calendar' || d.name === 'daily_summary');
      const key = [isPk ? 'PK' : '', fk ? `FK → ${fk[1]}.${fk[2]}` : ''].filter(Boolean).join(', ') || null;
      rows.push([d.name, c.name, TYPE_LABEL[c.type], key, c.d[li] + (c.values ? ` [${c.values.join(', ')}]` : '')]);
    }
  }
  return { def: DICTIONARY_DEF, count: rows.length, row: i => rows[i] };
}
function dirtyKeySource(sim: Sim, o: SourceOpts): RowSource {
  const rows: Value[][] = [];
  for (const name of DIRTY_TABLES) {
    if (!sim.T[name]) continue;
    const dirtySrc = tableSource(sim, name, { ...o, dirty: true }), clean = tableSource(sim, name, { ...o, dirty: false }), def = dirtySrc.def;
    let j = 0, prevPk: Value = null;
    for (let i = 0; i < dirtySrc.count; i++) {
      const row = dirtySrc.row(i);
      if (row[0] === prevPk) { rows.push([name, i + 1, null, 'duplicate_row', null]); continue; }
      prevPk = row[0];
      const orig = clean.row(j++);
      for (let c = 1; c < row.length; c++) if (row[c] !== orig[c]) {
        const d = dirtyCell(sim.big.seed, DIRTY_TABLES.indexOf(name), def, c, Number(row[0]) - 1, orig[c]);
        rows.push([name, i + 1, def.cols[c].name, d?.issue ?? 'changed', orig[c] === null ? null : String(orig[c])]);
      }
    }
  }
  return { def: DIRTY_KEY_DEF, count: rows.length, row: i => rows[i] };
}

// ---- the table view ----

export interface Query { offset: number; limit: number; sort?: { col: number; desc: boolean }; filters?: Record<number, string>; search?: string; }
const isNum = (def: TableDef, c: number) => !['text', 'enum', 'date', 'datetime'].includes(def.cols[c].type);
function matcher(def: TableDef, c: number, expr: string): (v: Value) => boolean {
  const e = expr.trim();
  if (isNum(def, c)) {
    const range = e.match(/^(-?[\d.]+)\s*\.\.\s*(-?[\d.]+)$/), op = e.match(/^(>=|<=|>|<|=)?\s*(-?[\d.]+)$/);
    if (range) { const a = +range[1], b = +range[2]; return v => v !== null && (v as number) >= a && (v as number) <= b; }
    if (op) { const n = +op[2], o = op[1] ?? '='; return v => v !== null && (o === '>' ? (v as number) > n : o === '<' ? (v as number) < n : o === '>=' ? (v as number) >= n : o === '<=' ? (v as number) <= n : v === n); }
  }
  if (e === 'null' || e === '∅') return v => v === null;
  const low = e.toLowerCase();
  return v => v !== null && String(v).toLowerCase().includes(low);
}
/** Row numbers of the source that pass the filters, in the requested order. */
export function queryIndex(src: RowSource, q: Pick<Query, 'sort' | 'filters' | 'search'>): Int32Array | null {
  const fl = Object.entries(q.filters ?? {}).filter(([, v]) => v.trim()).map(([c, v]) => [+c, matcher(src.def, +c, v)] as const);
  const search = q.search?.trim().toLowerCase();
  if (!fl.length && !search && !q.sort) return null;
  let idx: number[] | null = null; const keys: Value[] = [];
  if (fl.length || search) {
    idx = [];
    for (let i = 0; i < src.count; i++) {
      const row = src.row(i);
      if (fl.some(([c, m]) => !m(row[c]))) continue;
      if (search && !row.some(v => v !== null && String(v).toLowerCase().includes(search))) continue;
      idx.push(i); if (q.sort) keys[i] = row[q.sort.col];
    }
  }
  const out = idx ? Int32Array.from(idx) : Int32Array.from({ length: src.count }, (_, i) => i);
  if (q.sort) {
    const c = q.sort.col, sign = q.sort.desc ? -1 : 1;
    if (!idx) for (let i = 0; i < src.count; i++) keys[i] = src.row(i)[c];
    out.sort((a, b) => {
      const x = keys[a], y = keys[b];
      if (x === y) return a - b; if (x === null) return 1; if (y === null) return -1;
      return (x < y ? -1 : 1) * sign;
    });
  }
  return out;
}
export const NULL = NULL_INT;
