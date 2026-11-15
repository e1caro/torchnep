// Merging two copies of the saved businesses (this device and the account). Nothing is ever lost:
// change logs are unioned, the simulation clock takes the further one, deletions stay deleted.

import type { Change, Recipe, SmallParams } from '../engine/types';

export const sortChanges = (c: Change[]) => [...c].sort((a, b) => a.day - b.day || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export function mergeRecipe(a: Recipe, b: Recipe): Recipe {
  const newer = a.updatedAt >= b.updatedAt ? a : b, further = a.day >= b.day ? a : b;
  if (a.deleted || b.deleted) return { ...newer, deleted: true, changes: [], snap: undefined, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
  const byId = new Map<string, Change>();
  for (const c of [...(newer === a ? b : a).changes, ...newer.changes]) byId.set(c.id, c);
  return { ...newer, changes: sortChanges([...byId.values()]), day: further.day, snap: further.snap ?? newer.snap, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

export function mergeRecipes(local: Recipe[], remote: Recipe[]): Recipe[] {
  const out = new Map<string, Recipe>();
  for (const r of local) out.set(r.id, r);
  for (const r of remote) { const mine = out.get(r.id); out.set(r.id, mine ? mergeRecipe(mine, r) : r); }
  return [...out.values()].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/** JSON with sorted keys, so equal states give equal text. */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => (v as Record<string, unknown>)[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon((v as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(v);
}

/** The sliders after applying the logged changes dated up to and including `uptoDay`. */
export function effectiveSmall(r: Recipe, uptoDay = Infinity): SmallParams {
  const s = { ...r.small0 } as SmallParams & Record<string, number>;
  for (const c of sortChanges(r.changes)) if (c.day <= uptoDay && !c.param.startsWith('price:')) s[c.param] = c.value;
  return s;
}
export function priceOverrides(r: Recipe): Record<number, number> {
  const o: Record<number, number> = {};
  for (const c of sortChanges(r.changes)) if (c.param.startsWith('price:')) { if (c.value > 0) o[+c.param.slice(6)] = c.value; else delete o[+c.param.slice(6)]; }
  return o;
}
