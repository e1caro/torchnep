// Accounts and sync. Same approach as the other apps in this repository (data-analyst-path/js/cloud.js): plain fetch
// against the shared Supabase project, username + password accounts, and one private row per account in the
// "saves" table (row-level security: only its owner can read or write it). Only the recipes are stored online;
// every device rebuilds the tables from them.

import type { Recipe } from '../engine/types';
import { canon, mergeRecipes } from './merge';

export const SB_URL = 'https://fghbrevlqmrugbnqshoj.supabase.co';
const SB_KEY = 'sb_publishable_22MWQyEpsR2OyZv9RXkswg_FdGjA2i9'; // publishable key: public by design, access is limited by the database rules
const STORE = 'bizsim.cloud', USER_RE = /^[a-z0-9_]{3,20}$/, MIN_PASS = 6;
const email = (user: string) => `bizsim.${user}@users.fitquest.app`; // an address nobody receives; "bizsim." keeps these accounts apart from the other apps

interface Session { at?: string; rt?: string; exp?: number; uid?: string; user?: string; syncAt?: number; error?: string }
export type CloudError = Error & { code?: string | number };
const fail = (msg: string, code?: string | number): CloudError => Object.assign(new Error(msg), { code });

/** Error codes the UI translates: offline, taken, wrong, weak, rate, closed, input_user, input_pass, signedout. */
function classify(raw: string, status: number): CloudError {
  if (/already (been )?registered|already exists/i.test(raw)) return fail(raw, 'taken');
  if (/invalid login credentials|invalid grant/i.test(raw)) return fail(raw, 'wrong');
  if (/password should be at least|weak password/i.test(raw)) return fail(raw, 'weak');
  if (/rate limit|too many/i.test(raw)) return fail(raw, 'rate');
  if (/signups? not allowed|disabled/i.test(raw)) return fail(raw, 'closed');
  return fail(raw, status);
}

export class Cloud {
  private s: Session;
  private refreshing: Promise<void> | null = null;
  private running: Promise<boolean> | null = null;
  constructor(private io: { fetch: typeof fetch; storage: Pick<Storage, 'getItem' | 'setItem'>; now: () => number } = { fetch: (...a) => fetch(...a), storage: localStorage, now: () => Date.now() }) {
    try { this.s = JSON.parse(io.storage.getItem(STORE) ?? '{}') || {}; } catch { this.s = {}; }
  }
  private keep() { try { this.io.storage.setItem(STORE, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
  get signedIn() { return !!(this.s.uid && this.s.rt); }
  get user() { return this.s.user ?? ''; }
  get syncAt() { return this.s.syncAt ?? 0; }
  get error() { return this.s.error ?? ''; }

  private async send(path: string, init: { method?: string; body?: string; headers?: Record<string, string> }, auth: boolean): Promise<any> {
    const headers: Record<string, string> = { apikey: SB_KEY, 'Content-Type': 'application/json', ...(init.headers ?? {}) };
    if (auth) headers.Authorization = `Bearer ${this.s.at}`;
    let r: Response;
    try { r = await this.io.fetch(SB_URL + path, { method: init.method ?? 'GET', headers, body: init.body }); } catch { throw fail('offline', 'offline'); }
    const txt = await r.text(); let body: any = null;
    try { body = txt ? JSON.parse(txt) : null; } catch { /* not JSON */ }
    if (!r.ok) throw classify(String(body?.msg || body?.error_description || body?.message || body?.error || `HTTP ${r.status}`), r.status);
    return body;
  }
  private setSession(x: any) {
    this.s.at = x.access_token; this.s.rt = x.refresh_token || this.s.rt; this.s.exp = this.io.now() + (x.expires_in || 3600) * 1000; this.s.uid = x.user?.id || this.s.uid; this.keep();
  }
  private refresh(): Promise<void> {
    this.refreshing ??= this.send('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: this.s.rt }) }, false)
      .then(x => this.setSession(x), (e: CloudError) => { if (e.code === 'offline') throw e; this.signOut(); throw fail('signed out', 'signedout'); })
      .finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  private async api(path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<any> {
    if (!this.s.at || (this.s.exp && this.io.now() > this.s.exp - 60000)) await this.refresh();
    try { return await this.send(path, init, true); } catch (e) {
      if ((e as CloudError).code !== 401) throw e;
      await this.refresh(); return this.send(path, init, true);
    }
  }

  private check(user: string, pass: string): string {
    const u = user.trim().toLowerCase();
    if (!USER_RE.test(u)) throw fail('bad username', 'input_user');
    if (pass.length < MIN_PASS) throw fail('short password', 'input_pass');
    return u;
  }
  async signUp(user: string, pass: string) {
    const u = this.check(user, pass);
    const x = await this.send('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: email(u), password: pass }) }, false);
    if (!x?.access_token) throw fail('closed', 'closed');
    this.setSession(x); this.s.user = u; this.keep();
  }
  async signIn(user: string, pass: string) {
    const u = this.check(user, pass);
    this.setSession(await this.send('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: email(u), password: pass }) }, false));
    this.s.user = u; this.keep();
  }
  signOut() { this.s = {}; this.keep(); }
  async deleteAccount() {
    const uid = this.s.uid;
    await this.api(`/rest/v1/saves?id=eq.${encodeURIComponent(uid!)}`, { method: 'DELETE' });
    await this.api('/rest/v1/rpc/delete_my_account', { method: 'POST', body: '{}' }).catch(() => { /* the row is gone; the login may remain */ });
    this.signOut();
  }

  /**
   * Reads the account's copy, merges it with this device and writes the result back when it differs.
   * `apply` receives the merged list when this device has to change. Resolves to whether anything arrived.
   */
  sync(getLocal: () => Recipe[], apply: (merged: Recipe[]) => void): Promise<boolean> {
    if (!this.signedIn) return Promise.resolve(false);
    if (this.running) return this.running;
    this.running = (async () => {
      try {
        const uid = this.s.uid!, rows = await this.api(`/rest/v1/saves?id=eq.${encodeURIComponent(uid)}&select=data,updated_at`);
        const d = rows?.[0]?.data, remote: Recipe[] | null = d?.app === 'bizsim' && Array.isArray(d.recipes) ? d.recipes : null;
        const local = getLocal(), merged = remote ? mergeRecipes(local, remote) : local;
        const got = canon(merged) !== canon(local);
        if (got) apply(merged);
        if (!remote || canon(merged) !== canon(remote)) {
          await this.api('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: uid, data: { app: 'bizsim', v: 1, recipes: merged }, updated_at: new Date(this.io.now()).toISOString() }) });
        }
        this.s.syncAt = this.io.now(); this.s.error = ''; this.keep();
        return got;
      } catch (e) {
        if (this.signedIn) { this.s.error = String((e as CloudError).code ?? (e as Error).message); this.keep(); }
        throw e;
      } finally { this.running = null; }
    })();
    return this.running;
  }
}
