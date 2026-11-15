// Column storage for the generated tables. Everything except free text and decimals is a 32-bit integer:
// ids, dates (day number), timestamps (seconds since day 0), money (cents), enums (index) and booleans.

export type ColType = 'id' | 'fk' | 'int' | 'money' | 'real' | 'text' | 'date' | 'datetime' | 'bool' | 'enum';
export interface ColDef {
  name: string; type: ColType;
  ref?: string;               // table referenced by an fk (or by a date that points at the calendar)
  values?: readonly string[]; // enum labels
  nullable?: boolean;
  measure?: boolean;          // a numeric fact, eligible for outliers in dirty data
  d: [string, string];        // description: English, Spanish
}
export interface TableDef {
  name: string; cols: ColDef[]; d: [string, string];
  /** How a row is placed in time for the export date range: a date column, or a parent table reached by an fk. */
  day?: { col: string; via?: string };
}

export const NULL_INT = -2147483648;
export const isNull = (v: unknown) => v === null || v === NULL_INT || (typeof v === 'number' && Number.isNaN(v));

type Store = Int32Array | Float64Array | (string | null)[];

export class Table {
  n = 0;
  private cap: number;
  readonly cols: Store[];
  private readonly idx = new Map<string, number>();
  constructor(readonly def: TableDef, cap = 256) {
    this.cap = cap;
    this.cols = def.cols.map((c, i) => {
      this.idx.set(c.name, i);
      return c.type === 'text' ? [] : c.type === 'real' ? new Float64Array(cap) : new Int32Array(cap);
    });
  }
  ci(name: string): number {
    const i = this.idx.get(name);
    if (i === undefined) throw new Error(`no column ${name} in ${this.def.name}`);
    return i;
  }
  col(name: string): Store { return this.cols[this.ci(name)]; }
  ints(name: string): Int32Array { return this.cols[this.ci(name)] as Int32Array; }
  private grow() {
    this.cap *= 2;
    for (let i = 0; i < this.cols.length; i++) {
      const c = this.cols[i];
      if (Array.isArray(c)) continue;
      const bigger = c instanceof Float64Array ? new Float64Array(this.cap) : new Int32Array(this.cap);
      bigger.set(c as never); this.cols[i] = bigger;
    }
  }
  /** Appends a row (values in column order; null allowed) and returns its index. Ids are always index + 1. */
  add(...vals: (number | string | null)[]): number {
    if (this.n === this.cap) this.grow();
    const r = this.n++;
    for (let i = 0; i < this.cols.length; i++) {
      const c = this.cols[i], v = vals[i];
      if (Array.isArray(c)) c[r] = v === undefined ? null : (v as string | null);
      else if (c instanceof Float64Array) c[r] = v === null || v === undefined ? NaN : (v as number);
      else c[r] = v === null || v === undefined ? NULL_INT : (v as number);
    }
    return r;
  }
  set(name: string, row: number, v: number | string | null) {
    const c = this.cols[this.ci(name)];
    if (Array.isArray(c)) c[row] = v as string | null;
    else if (c instanceof Float64Array) c[row] = v === null ? NaN : (v as number);
    else c[row] = v === null ? NULL_INT : (v as number);
  }
  raw(ci: number, row: number): number | string | null { return (this.cols[ci] as never)[row]; }
}

const isoCache: string[] = [];
let isoBase = '';
/** ISO date of day number `day`, counted from `start` (an ISO date). */
export function isoDate(start: string, day: number): string {
  if (isoBase !== start) { isoBase = start; isoCache.length = 0; }
  let s = isoCache[day];
  if (!s) {
    const t = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10)) + day * 86400000;
    s = isoCache[day] = new Date(t).toISOString().slice(0, 10);
  }
  return s;
}
const p2 = (n: number) => (n < 10 ? '0' + n : '' + n);

/** The value as it is shown and exported: ISO dates, enum labels, euros with cents, null for missing. */
export function cell(t: Table, ci: number, row: number, start: string): number | string | null {
  const def = t.def.cols[ci], v = t.raw(ci, row);
  if (v === null || v === NULL_INT || (typeof v === 'number' && Number.isNaN(v))) return null;
  switch (def.type) {
    case 'money': return (v as number) / 100;
    case 'date': return isoDate(start, v as number);
    case 'datetime': {
      const s = v as number, day = Math.floor(s / 86400), r = s - day * 86400;
      return `${isoDate(start, day)} ${p2(Math.floor(r / 3600))}:${p2(Math.floor(r / 60) % 60)}:${p2(r % 60)}`;
    }
    case 'enum': return def.values![v as number];
    case 'real': return Math.round((v as number) * 1000) / 1000;
    default: return v;
  }
}
