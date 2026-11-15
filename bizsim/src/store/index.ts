// App state: the saved businesses (recipes), which ones are loaded in the worker, the play loop and the account.

import { create } from 'zustand';
import { effectiveSmall } from '../cloud/merge';
import { Cloud, type CloudError } from '../cloud/supabase';
import type { BigParams, Lang, Recipe, SmallParams } from '../engine/types';
import { isNative } from '../native/save';
import { sim } from '../worker/client';

const KEY = 'bizsim.state';
export type Theme = 'dark' | 'light';
interface Saved { recipes: Recipe[]; settings: { lang: Lang; theme: Theme } }
function loadSaved(): Saved {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (s?.recipes && s.settings) return s; } catch { /* first run */ }
  return { recipes: [], settings: { lang: (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en', theme: 'dark' } };
}
const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
export const isPhone = () => isNative() || window.innerWidth < 820 || ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) < 4;

interface Runtime { day: number; progress: number | null; error?: string }
interface State extends Saved {
  runtime: Record<string, Runtime>;
  playing: Record<string, boolean>;
  speed: number;
  version: Record<string, number>;
  cloud: { user: string; syncAt: number; error: string; busy: boolean };
  list: () => Recipe[];
  get: (id: string) => Recipe | undefined;
  createBusiness: (big: BigParams, small: SmallParams, dirty: boolean) => string;
  removeBusiness: (id: string) => void;
  open: (id: string) => Promise<void>;
  advance: (id: string, days: number) => Promise<void>;
  logChange: (id: string, param: string, value: number, old: number) => void;
  undoPending: (id: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
  setPlaying: (id: string, on: boolean) => void;
  setSpeed: (n: number) => void;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  signIn: (user: string, pass: string, isNew: boolean) => Promise<void>;
  signOut: () => void;
  deleteAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const cloud = new Cloud();
const busy = new Set<string>();
const cloudView = (b = false) => ({ user: cloud.signedIn ? cloud.user : '', syncAt: cloud.syncAt, error: cloud.error, busy: b });

export const useStore = create<State>((set, get) => {
  const patch = (id: string, f: (r: Recipe) => Recipe) => set(s => ({ recipes: s.recipes.map(r => (r.id === id ? f(r) : r)) }));
  const bump = (id: string) => set(s => ({ version: { ...s.version, [id]: (s.version[id] ?? 0) + 1 } }));
  const rt = (id: string, r: Partial<Runtime> | null) => set(s => { const next = { ...s.runtime }; if (r) next[id] = { ...(next[id] ?? { day: 0, progress: null }), ...r }; else delete next[id]; return { runtime: next }; });

  return {
    ...loadSaved(), runtime: {}, playing: {}, speed: 1, version: {}, cloud: cloudView(),
    list: () => get().recipes.filter(r => !r.deleted),
    get: id => get().recipes.find(r => r.id === id && !r.deleted),

    createBusiness(big, small, dirty) {
      const id = uid(), now = Date.now();
      set(s => ({ recipes: [...s.recipes, { id, big, small0: small, changes: [], day: big.historyDays, dirty, createdAt: now, updatedAt: now }] }));
      return id;
    },
    removeBusiness(id) {
      patch(id, r => ({ ...r, deleted: true, changes: [], snap: undefined, updatedAt: Date.now() }));
      rt(id, null); set(s => ({ playing: { ...s.playing, [id]: false } }));
      void sim.call('unload', { id });
    },
    async open(id) {
      const r = get().get(id), cur = get().runtime[id];
      if (!r || busy.has(id) || (cur && cur.day === r.day && cur.progress === null && !cur.error)) return;
      busy.add(id); rt(id, { progress: 0, error: undefined });
      try {
        const res = await sim.call('load', { recipe: r });
        patch(id, x => ({ ...x, snap: res.snap })); rt(id, { day: res.day, progress: null }); bump(id);
      } catch (e) { rt(id, { progress: null, error: (e as Error).message }); } finally { busy.delete(id); }
    },
    async advance(id, days) {
      const r = get().get(id);
      if (!r || busy.has(id)) return;
      busy.add(id);
      try {
        const res = await sim.call('step', { recipe: r, days });
        patch(id, x => ({ ...x, day: res.day, snap: res.snap, updatedAt: Date.now() })); rt(id, { day: res.day, progress: null }); bump(id);
      } catch (e) { rt(id, { error: (e as Error).message }); set(s => ({ playing: { ...s.playing, [id]: false } })); } finally { busy.delete(id); }
    },
    logChange(id, param, value, old) {
      patch(id, r => {
        const at = r.changes.findIndex(c => c.param === param && c.day === r.day), changes = [...r.changes];
        if (at >= 0) { if (changes[at].old === value) changes.splice(at, 1); else changes[at] = { ...changes[at], value }; }
        else if (value !== old) changes.push({ id: uid(), day: r.day, param, old, value });
        return { ...r, changes, updatedAt: Date.now() };
      });
      bump(id);
    },
    undoPending(id) { patch(id, r => ({ ...r, changes: r.changes.filter(c => c.day < r.day), updatedAt: Date.now() })); bump(id); },
    setDirty(id, dirty) { patch(id, r => ({ ...r, dirty, updatedAt: Date.now() })); bump(id); },
    setPlaying(id, on) { set(s => ({ playing: { ...s.playing, [id]: on } })); },
    setSpeed(n) { set({ speed: n }); },
    setLang(lang) { set(s => ({ settings: { ...s.settings, lang } })); },
    setTheme(theme) { set(s => ({ settings: { ...s.settings, theme } })); },

    async signIn(user, pass, isNew) {
      set({ cloud: cloudView(true) });
      try { if (isNew) await cloud.signUp(user, pass); else await cloud.signIn(user, pass); } finally { set({ cloud: cloudView() }); }
      await get().syncNow();
    },
    signOut() { cloud.signOut(); set({ cloud: cloudView() }); },
    async deleteAccount() { set({ cloud: cloudView(true) }); try { await cloud.deleteAccount(); } finally { set({ cloud: cloudView() }); } },
    async syncNow() {
      if (!cloud.signedIn) return;
      set({ cloud: cloudView(true) });
      try {
        await cloud.sync(() => get().recipes, merged => {
          const before = new Map(get().recipes.map(r => [r.id, r]));
          set({ recipes: merged });
          // businesses that are loaded here and changed on another device are brought up to date
          for (const r of merged) {
            const old = before.get(r.id), loaded = get().runtime[r.id];
            if (r.deleted && loaded) { rt(r.id, null); void sim.call('unload', { id: r.id }); }
            else if (loaded && old && (old.day !== r.day || old.changes.length !== r.changes.length)) void get().open(r.id);
          }
        });
      } catch (e) { if ((e as CloudError).code === 'signedout') cloud.signOut(); } finally { set({ cloud: cloudView() }); }
    },
  };
});

sim.onProgress = p => useStore.setState(s => ({ runtime: { ...s.runtime, [p.id]: { ...(s.runtime[p.id] ?? { day: 0 }), progress: p.total ? p.done / p.total : 1 } } }));

// persistence, and a sync a few seconds after the first unsaved change
let saved = '', syncTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe(s => {
  const text = JSON.stringify({ recipes: s.recipes, settings: s.settings });
  if (text === saved) return;
  const recipesChanged = !saved || JSON.stringify(s.recipes) !== JSON.stringify(JSON.parse(saved).recipes);
  saved = text;
  try { localStorage.setItem(KEY, text); } catch { /* storage full or blocked */ }
  if (recipesChanged && cloud.signedIn && !syncTimer) syncTimer = setTimeout(() => { syncTimer = null; void useStore.getState().syncNow(); }, 3000);
});

/** Starts the play loop and the background syncs. Called once when the app mounts. */
export function startLoops() {
  setInterval(() => {
    const s = useStore.getState();
    for (const r of s.list()) if (s.playing[r.id] && s.runtime[r.id] && s.runtime[r.id].progress === null) void s.advance(r.id, s.speed);
  }, 1000);
  const sync = () => { if (document.visibilityState === 'visible') void useStore.getState().syncNow(); };
  sync(); setInterval(sync, 120000); document.addEventListener('visibilitychange', sync);
}

export const pendingChanges = (r: Recipe) => r.changes.filter(c => c.day >= r.day);
export const currentSmall = (r: Recipe) => effectiveSmall(r);
