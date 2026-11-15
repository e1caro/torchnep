import type { Dash, Kpis } from '../engine/analytics';
import type { Query, Value } from '../engine/rows';
import type { ExportOpts } from '../export';
import type { Filters, Recipe, Snapshot } from '../engine/types';

export interface TableInfo { name: string; rows: number; d: [string, string]; key: boolean; cols: { name: string; type: string; d: [string, string]; ref?: string }[] }
export interface ProductInfo { id: number; name: string; cat: number; price: number; ref: number; cost: number; active: boolean; stock: number; override: boolean }
export interface DashResult extends Dash { projection: { base: number[]; alt: number[] | null }; catNames: string[]; day: number }
export interface Ops {
  load: { args: { recipe: Recipe }; result: { day: number; snap: Snapshot } };
  unload: { args: { id: string }; result: null };
  step: { args: { recipe: Recipe; days: number }; result: { day: number; snap: Snapshot } };
  dash: { args: { id: string; filters: Filters; pending: Recipe }; result: DashResult };
  tables: { args: { id: string; dirty: boolean; lang: 'en' | 'es' }; result: TableInfo[] };
  rows: { args: { id: string; table: string; dirty: boolean; lang: 'en' | 'es'; query: Query }; result: { total: number; rows: Value[][] } };
  products: { args: { id: string }; result: ProductInfo[] };
  export: { args: { id: string; opts: ExportOpts }; result: { name: string; mime: string; parts: Uint8Array[] } };
  compare: { args: { ids: string[] }; result: Record<string, { start: string; days: number; weeks: number[]; kpis: Kpis }> };
}
export type Op = keyof Ops;
export interface Req { id: number; op: Op; args: unknown }
export type Res = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string } | { progress: { id: string; done: number; total: number } };
