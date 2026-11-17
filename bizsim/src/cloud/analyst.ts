// The link with Analyst Path, the companion learning app (../data-analyst-path). BizSim hands a business over in a
// link ("Practise in Analyst Path"), and, when the Analyst Path account is linked here, shows how many of the
// business challenges have been solved there. The Analyst Path account is separate from the BizSim one (its
// usernames carry "analyst." in front); only a session is kept, never the password, and its row is only read.

import type { Recipe } from '../engine/types';

const SB_URL = 'https://fghbrevlqmrugbnqshoj.supabase.co', SB_KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9';
const STORE = 'bizsim.analyst';
export const BUSINESS_CHALLENGES = 30;
export interface AnalystState { user: string; solved: number; checkedAt: number }
interface Session { at?: string; rt?: string; exp?: number; uid?: string; user?: string; solved?: number; checkedAt?: number }
type Err = Error & { code?: string | number };
const fail = (m: string, code: string | number): Err => Object.assign(new Error(m), { code });

export class AnalystLink {
  private s: Session;
  constructor(private io: { fetch: typeof fetch; storage: Pick<Storage, 'getItem' | 'setItem'>; now: () => number } = { fetch: (...a) => fetch(...a), storage: localStorage, now: () => Date.now() }) {
    try { this.s = JSON.parse(io.storage.getItem(STORE) ?? '{}') || {}; } catch { this.s = {}; }
  }
  private keep() { try { this.io.storage.setItem(STORE, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
  get state(): AnalystState | null { return this.s.uid && this.s.rt ? { user: this.s.user ?? '', solved: this.s.solved ?? 0, checkedAt: this.s.checkedAt ?? 0 } : null; }

  private async send(path: string, init: { method?: string; body?: string }, auth: boolean): Promise<any> {
    const headers: Record<string, string> = { apikey: SB_KEY, 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = `Bearer ${this.s.at}`;
    let r: Response;
    try { r = await this.io.fetch(SB_URL + path, { method: init.method ?? 'GET', headers, body: init.body }); } catch { throw fail('offline', 'offline'); }
    const txt = await r.text(); let body: any = null;
    try { body = txt ? JSON.parse(txt) : null; } catch { /* not JSON */ }
    if (!r.ok) { const raw = String(body?.msg || body?.error_description || body?.message || `HTTP ${r.status}`); throw fail(raw, /invalid login credentials|invalid grant/i.test(raw) ? 'wrong' : /rate limit|too many/i.test(raw) ? 'rate' : r.status); }
    return body;
  }
  private set(x: any) { this.s.at = x.access_token; this.s.rt = x.refresh_token || this.s.rt; this.s.exp = this.io.now() + (x.expires_in || 3600) * 1000; this.s.uid = x.user?.id || this.s.uid; this.keep(); }
  async signIn(user: string, pass: string): Promise<AnalystState> {
    const u = user.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) throw fail('bad username', 'input_user');
    this.set(await this.send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: `analyst.${u}@users.fitquest.app`, password: pass }) }, false));
    this.s.user = u; this.keep();
    return this.refresh();
  }
  signOut() { this.s = {}; this.keep(); }
  /** Reads the Analyst Path progress and counts the business challenges solved there. */
  async refresh(): Promise<AnalystState> {
    if (!this.s.uid) throw fail('not linked', 'signedout');
    const get = () => this.send(`/rest/v1/saves?id=eq.${encodeURIComponent(this.s.uid!)}&select=data`, {}, true);
    let rows: any;
    try {
      if (!this.s.at || (this.s.exp && this.io.now() > this.s.exp - 60000)) this.set(await this.send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: this.s.rt }) }, false));
      rows = await get();
    } catch (e) {
      if ((e as Err).code !== 401) throw e;
      try { this.set(await this.send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: this.s.rt }) }, false)); } catch (e2) { if ((e2 as Err).code !== 'offline') this.signOut(); throw fail('signed out', 'signedout'); }
      rows = await get();
    }
    const d = rows?.[0]?.data, biz = d?.app === 'data-analyst-path' ? d.state?.labs?.biz : null;
    this.s.solved = biz && typeof biz === 'object' ? Object.values(biz).filter(v => typeof v === 'number' && v > 0).length : 0;
    this.s.checkedAt = this.io.now(); this.keep();
    return this.state!;
  }
}

/** Where Analyst Path lives: beside BizSim on the same site, or the published site when BizSim runs as an app. */
export function analystUrl(loc: Pick<Location, 'protocol' | 'origin' | 'pathname'> = location): string {
  return /^https?:$/.test(loc.protocol) && /\/bizsim\//.test(loc.pathname) ? loc.origin + loc.pathname.replace(/\/bizsim\/.*$/, '/analyst/') : 'https://e1caro.github.io/torchnep/analyst/';
}
/** A link that opens Analyst Path with this business loaded as practice data. The recipe travels in the link itself. */
export function practiceLink(r: Recipe, base = analystUrl()): string {
  const slim = { id: r.id, big: r.big, small0: r.small0, changes: r.changes, day: r.day, createdAt: r.createdAt, updatedAt: r.updatedAt };
  const bytes = new TextEncoder().encode(JSON.stringify(slim)); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `${base}#/biz/import/${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')}`;
}
