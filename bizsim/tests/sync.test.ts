import { describe, expect, it } from 'vitest';
import { effectiveSmall, mergeRecipes } from '../src/cloud/merge';
import { Cloud, SB_URL } from '../src/cloud/supabase';
import { defaultBig, defaultSmall } from '../src/engine/params';
import type { Recipe } from '../src/engine/types';

const recipe = (id: string, at: number): Recipe => { const big = { ...defaultBig('cafe', 'en', '2025-01-01', 1), name: id }; return { id, big, small0: defaultSmall(big), changes: [], day: 365, dirty: false, createdAt: at, updatedAt: at }; };

/** A minimal stand-in for the account service: accounts by e-mail and one saved row per account. */
export function fakeSupabase() {
  const users = new Map<string, { id: string; pass: string }>(), saves = new Map<string, unknown>(), tokens = new Map<string, string>();
  const json = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status });
  const session = (id: string) => { const at = `at-${id}-${tokens.size}`; tokens.set(at, id); return { access_token: at, refresh_token: `rt-${id}`, expires_in: 3600, user: { id } }; };
  const fetchFake = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url)), body = init?.body ? JSON.parse(String(init.body)) : {}, auth = (init?.headers as Record<string, string>)?.Authorization?.slice(7);
    if (u.pathname === '/auth/v1/signup') { if (users.has(body.email)) return json(422, { msg: 'User already registered' }); const id = `u${users.size + 1}`; users.set(body.email, { id, pass: body.password }); return json(200, session(id)); }
    if (u.pathname === '/auth/v1/token') {
      if (u.searchParams.get('grant_type') === 'refresh_token') return json(200, session(String(body.refresh_token).slice(3)));
      const usr = users.get(body.email); return usr && usr.pass === body.password ? json(200, session(usr.id)) : json(400, { error_description: 'Invalid login credentials' });
    }
    const uid = auth ? tokens.get(auth) : undefined; if (!uid) return json(401, { message: 'JWT expired' });
    if (u.pathname === '/rest/v1/saves') {
      if (init?.method === 'POST') { saves.set(uid, body.data); return json(201, null); }
      if (init?.method === 'DELETE') { saves.delete(uid); return json(204, null); }
      return json(200, saves.has(uid) ? [{ data: saves.get(uid) }] : []);
    }
    return json(404, { message: 'not found' });
  };
  return { fetch: fetchFake as typeof fetch, saves, users };
}
const device = (sb: ReturnType<typeof fakeSupabase>) => {
  const mem = new Map<string, string>(); let recipes: Recipe[] = [];
  const cloud = new Cloud({ fetch: sb.fetch, storage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) }, now: () => 1e12 });
  return { cloud, get: () => recipes, set: (r: Recipe[]) => { recipes = r; }, sync: () => cloud.sync(() => recipes, m => { recipes = m; }) };
};

describe('sync', () => {
  it('merges change logs, keeps the further clock and never brings back a deleted business', () => {
    const a = recipe('a', 1), b = { ...a, day: 400, updatedAt: 5, changes: [{ id: 'c2', day: 380, param: 'traffic', old: 300, value: 500 }] };
    const a2 = { ...a, updatedAt: 9, changes: [{ id: 'c1', day: 365, param: 'quality', old: 3, value: 5 }] };
    const m = mergeRecipes([a2], [b])[0];
    expect(m.day).toBe(400); expect(m.changes.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(effectiveSmall(m).quality).toBe(5); expect(effectiveSmall(m).traffic).toBe(500); expect(effectiveSmall(m, 370).traffic).toBe(a.small0.traffic);
    expect(mergeRecipes([b], [a2])[0]).toEqual(m);
    expect(mergeRecipes([{ ...a, deleted: true, updatedAt: 2 }], [b])[0].deleted).toBe(true);
    expect(mergeRecipes([a], [recipe('z', 0)]).map(r => r.id)).toEqual(['z', 'a']);
  });

  it('a business created on one device appears on the other after signing in', async () => {
    const sb = fakeSupabase(), pc = device(sb), phone = device(sb);
    await pc.cloud.signUp('Ana_01', 'secret1'); pc.set([recipe('shop', 10)]); await pc.sync();
    expect(new URL(SB_URL).host).toContain('supabase.co');
    expect([...sb.users.keys()][0]).toBe('bizsim.ana_01@users.fitquest.app');
    await phone.cloud.signIn('ana_01', 'secret1'); expect(await phone.sync()).toBe(true);
    expect(phone.get().map(r => r.id)).toEqual(['shop']);
    // both devices work offline, then sync: nothing is lost
    phone.set([...phone.get(), recipe('cafe', 20)]);
    pc.set(pc.get().map(r => ({ ...r, day: 380, updatedAt: 30, changes: [{ id: 'x', day: 365, param: 'marketing', old: 0, value: 900 }] })));
    await phone.sync(); await pc.sync(); await phone.sync();
    expect(pc.get()).toEqual(phone.get()); expect(pc.get().length).toBe(2); expect(pc.get()[0].day).toBe(380);
    expect(await pc.sync()).toBe(false);
  });

  it('reports wrong passwords, taken names and bad input with codes the app can translate', async () => {
    const sb = fakeSupabase(), d = device(sb);
    await d.cloud.signUp('maria', 'secret1');
    await expect(device(sb).cloud.signUp('maria', 'other12')).rejects.toMatchObject({ code: 'taken' });
    await expect(device(sb).cloud.signIn('maria', 'nope123')).rejects.toMatchObject({ code: 'wrong' });
    await expect(device(sb).cloud.signIn('m', 'secret1')).rejects.toMatchObject({ code: 'input_user' });
    await expect(device(sb).cloud.signUp('maria2', '123')).rejects.toMatchObject({ code: 'input_pass' });
    const off = new Cloud({ fetch: (async () => { throw new Error('net'); }) as typeof fetch, storage: { getItem: () => null, setItem: () => { } }, now: () => 0 });
    await expect(off.signIn('maria', 'secret1')).rejects.toMatchObject({ code: 'offline' });
    d.set([recipe('s', 1)]); await d.sync(); await d.cloud.deleteAccount();
    expect(sb.saves.size).toBe(0); expect(d.cloud.signedIn).toBe(false);
  });
});
