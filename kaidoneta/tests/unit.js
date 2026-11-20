/* Unit tests for the crew's data and the online crew:  node kaidoneta/tests/unit.js */
'use strict';
const assert = require('assert');
const path = require('path');

// A tiny localStorage for cloud.js
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };

const K = require(path.join(__dirname, '..', 'js', 'core.js'));
require(path.join(__dirname, '..', 'js', 'cloud.js'));
const C = K.core;

let passed = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

let clock = 1000;
C.now = () => (clock += 10);
let seq = 0;
C.random = () => ((seq = (seq * 9301 + 49297) % 233280) / 233280);

function crew() {
  const b = C.ensureBristol(C.emptyBook());
  const javi = C.put(b, 'members', { id: 'm-javi00001', name: 'Javi', emoji: '🐉', color: '#9b5cf6', leader: C.KAIDO });
  const ana = C.put(b, 'members', { id: 'm-ana000001', name: 'Ana', emoji: '👹', color: '#e5484d', leader: { name: 'Enel', colors: ['yellow'] } });
  const leo = C.put(b, 'members', { id: 'm-leo000001', name: 'Leo', emoji: '⚡', color: '#3e7bfa', leader: { name: 'Rob Lucci', colors: ['black'] } });
  return { b, javi, ana, leo, ev: C.BRISTOL.id };
}
function log(b, mem, round, res, opp, extra) {
  const m = Object.assign({ id: C.newId('g'), ev: C.BRISTOL.id, mem: mem.id, round, res, opp, first: null, myLeader: mem.leader, t: C.now() }, extra || {});
  return C.put(b, 'matches', m);
}
const LUFFY = { name: 'Monkey.D.Luffy', colors: ['red'] };
const ENEL = { name: 'Enel', colors: ['yellow'] };
const BIGMOM = { name: 'Charlotte Linlin (Big Mom)', colors: ['yellow'] };

test('Bristol is created once, with the same id everywhere', () => {
  const a = C.ensureBristol(C.emptyBook()), b = C.ensureBristol(C.emptyBook());
  assert.deepStrictEqual(a, b);
  const m = C.merge(a, b);
  assert.strictEqual(C.events(m).length, 1);
  assert.strictEqual(C.events(m)[0].name, 'Regional de Bristol');
  // an untouched default from the English version gets the Spanish name; an edited one is left alone
  const old = C.emptyBook();
  old.events[C.BRISTOL.id] = Object.assign({}, a.events[C.BRISTOL.id], { name: 'Bristol Regional' });
  assert.strictEqual(C.ensureBristol(old).events[C.BRISTOL.id].name, 'Regional de Bristol');
  const edited = C.emptyBook();
  edited.events[C.BRISTOL.id] = Object.assign({}, a.events[C.BRISTOL.id], { name: 'Bristol Regional', at: 5 });
  assert.strictEqual(C.ensureBristol(edited).events[C.BRISTOL.id].name, 'Bristol Regional');
  assert.ok(C.same(C.merge(a, old), C.merge(old, a)) && C.merge(a, old).events[C.BRISTOL.id].name === 'Regional de Bristol');
});

test('merge keeps the newest edit of each record and unions the rest', () => {
  const { b } = crew();
  const other = JSON.parse(JSON.stringify(b));
  C.put(other, 'members', Object.assign({}, other.members['m-ana000001'], { name: 'Ana B' }));
  const x = log(b, b.members['m-javi00001'], 1, 'W', ENEL);
  const y = log(other, other.members['m-leo000001'], 1, 'L', LUFFY);
  const m1 = C.merge(b, other), m2 = C.merge(other, b);
  assert.ok(C.same(m1, m2), 'merge is symmetric');
  assert.strictEqual(m1.members['m-ana000001'].name, 'Ana B');
  assert.ok(m1.matches[x.id] && m1.matches[y.id]);
  assert.ok(C.same(C.merge(m1, m1), m1), 'merge is idempotent');
});

test('a deletion wins over an older edit and survives merges', () => {
  const { b, javi } = crew();
  const x = log(b, javi, 1, 'W', ENEL);
  const other = JSON.parse(JSON.stringify(b));
  C.remove(b, 'matches', x.id);
  const m = C.merge(other, b);
  assert.ok(m.matches[x.id].del);
  assert.strictEqual(C.games(m, javi.id, C.BRISTOL.id).length, 0);
});

test('cleanBook drops malformed records and cuts long text', () => {
  const dirty = {
    members: { 'm-ok0000001': { id: 'm-ok0000001', at: 5, name: 'x'.repeat(100), emoji: '🐉', color: 'red', leader: { name: 'Kaido', colors: ['purple', 'pink', 'purple'] } }, bad: { id: 'bad' } },
    matches: { 'g-zzz000001': { id: 'g-zzz000001', at: 1, ev: 'ev-x00', mem: 'm-ok0000001', res: 'X' } },
    reactions: { 'x-a-b': { id: 'x-a-b', match: 'g-1', mem: 'm-1', emoji: '💩' } },
    junk: { a: 1 },
  };
  const c = C.cleanBook(dirty);
  assert.strictEqual(Object.keys(c.members).length, 1);
  assert.strictEqual(c.members['m-ok0000001'].name.length, 24);
  assert.strictEqual(c.members['m-ok0000001'].color, '#9b5cf6');
  assert.deepStrictEqual(c.members['m-ok0000001'].leader.colors, ['purple']);
  assert.strictEqual(Object.keys(c.matches).length, 0);
  assert.strictEqual(Object.keys(c.reactions).length, 0);
  assert.ok(!c.junk);
});

test('friendly fire: the crewmate gets the opposite result, once', () => {
  const { b, javi, ana, ev } = crew();
  log(b, javi, 2, 'W', ana.leader, { oppMem: ana.id, first: true });
  const g = C.games(b, ana.id, ev);
  assert.strictEqual(g.length, 1);
  assert.strictEqual(g[0].res, 'L');
  assert.strictEqual(g[0].first, false);
  assert.strictEqual(g[0].opp.name, 'Kaido');
  assert.strictEqual(g[0].oppMem, javi.id);
  assert.ok(C.loggedBy(b, ev, 2, '', ana.id, javi.id));
  // Ana logs the same round too: her own entry counts, not twice
  log(b, ana, 2, 'L', javi.leader, { oppMem: javi.id });
  assert.strictEqual(C.games(b, ana.id, ev).length, 1);
  assert.strictEqual(C.games(b, javi.id, ev).length, 1);
});

test('next round follows the Swiss rounds logged', () => {
  const { b, javi, ev } = crew();
  assert.strictEqual(C.nextRound(b, javi.id, ev), 1);
  log(b, javi, 1, 'W', ENEL);
  log(b, javi, 2, 'L', LUFFY);
  log(b, javi, 0, 'W', ENEL, { top: 'Top 8' });
  assert.strictEqual(C.nextRound(b, javi.id, ev), 3);
});

test('record, points and streaks', () => {
  const { b, javi, ev } = crew();
  ['W', 'W', 'L', 'W', 'W', 'W', 'D'].forEach((r, i) => log(b, javi, i + 1, r, ENEL, { first: i % 2 === 0 }));
  const g = C.games(b, javi.id, ev), r = C.record(g), s = C.streaks(g);
  assert.deepStrictEqual([r.w, r.l, r.d, r.pts], [5, 1, 1, 16]);
  assert.strictEqual(s.bestW, 3);
  assert.strictEqual(s.cur, 'D');
  assert.deepStrictEqual(r.first, { w: 2, l: 1, d: 1 });
  assert.deepStrictEqual(r.second, { w: 3, l: 0, d: 0 });
});

test('bounty: wins, going second, streaks, top cut and crewmates pay; it never drops', () => {
  const { b, javi, ana, ev } = crew();
  const B = C.BOUNTY;
  log(b, javi, 1, 'W', ENEL, { first: true });
  assert.strictEqual(C.bounty(C.games(b, javi.id, ev)), B.base + B.win);
  log(b, javi, 2, 'W', ENEL, { first: false });
  assert.strictEqual(C.bounty(C.games(b, javi.id, ev)), B.base + 2 * B.win + B.second + B.streak);
  const before = C.bounty(C.games(b, javi.id, ev));
  log(b, javi, 3, 'L', LUFFY);
  assert.strictEqual(C.bounty(C.games(b, javi.id, ev)), before);
  log(b, javi, 4, 'W', ana.leader, { oppMem: ana.id });
  log(b, javi, 0, 'W', ENEL, { top: 'Top 8' });
  const g = C.games(b, javi.id, ev);
  assert.strictEqual(C.gain(g, 3), B.win + B.crew);
  assert.strictEqual(C.gain(g, 4), B.win + B.streak + B.top);
  assert.strictEqual(C.rankOf(0).rank.id, 'waiter');
  assert.strictEqual(C.rankOf(900e6).rank.id, 'emperor');
  assert.strictEqual(C.berries(4611100000), '4.611.100.000');
  assert.strictEqual(C.berries(999), '999');
  assert.strictEqual(C.rankOf(900e6).rank.name, 'Emperador');
});

test('Bounty Board: points, then win rate, then bounty; moves since the last round', () => {
  const { b, javi, ana, leo, ev } = crew();
  log(b, javi, 1, 'L', LUFFY); log(b, ana, 1, 'W', LUFFY); log(b, leo, 1, 'D', LUFFY);
  let board = C.board(b, ev);
  assert.deepStrictEqual(board.map((r) => r.mem.name), ['Ana', 'Leo', 'Javi']);
  log(b, javi, 2, 'W', ENEL); log(b, javi, 3, 'W', ENEL); log(b, ana, 2, 'L', ENEL);
  board = C.board(b, ev);
  assert.deepStrictEqual(board.map((r) => r.mem.name), ['Javi', 'Ana', 'Leo']);
  assert.strictEqual(board[0].rec.pts, 6);
  assert.strictEqual(board[0].move, 1, 'Javi was second (tied with Ana) before round 3');
  assert.strictEqual(board[1].move, -1);
  const all = C.board(b, null);
  assert.strictEqual(all.length, 3);
});

test('matchups, nemesis, prey and the meta', () => {
  const { b, javi, ana, ev } = crew();
  log(b, javi, 1, 'L', LUFFY); log(b, javi, 2, 'L', LUFFY); log(b, javi, 3, 'W', ENEL); log(b, javi, 4, 'W', ENEL); log(b, javi, 5, 'W', BIGMOM);
  log(b, ana, 1, 'W', LUFFY); log(b, ana, 2, 'W', javi.leader, { oppMem: javi.id });
  const g = C.games(b, javi.id, ev);
  assert.strictEqual(C.nemesis(g).leader.name, 'Monkey.D.Luffy');
  assert.strictEqual(C.prey(g).leader.name, 'Enel');
  const meta = C.meta(b, ev);
  assert.strictEqual(meta.n, 6, 'crewmates are not part of the meta');
  assert.strictEqual(meta.leaders[0].leader.name, 'Monkey.D.Luffy');
  assert.strictEqual(meta.leaders[0].n, 3);
  const yellow = meta.colors.find((c) => c.color.id === 'yellow');
  assert.strictEqual(yellow.n, 3);
  assert.strictEqual(yellow.w, 3);
});

test('achievements', () => {
  const { b, javi, ana, ev } = crew();
  const got = () => C.badges(C.games(b, javi.id, null)).filter((x) => x.got).map((x) => x.badge.id).sort();
  assert.deepStrictEqual(got(), []);
  log(b, javi, 1, 'L', LUFFY, { first: true });
  assert.deepStrictEqual(got(), ['debut', 'gear5']);
  log(b, javi, 2, 'W', BIGMOM, { first: false });
  log(b, javi, 3, 'W', { name: 'Kaido', colors: ['purple'] }, { first: true });
  log(b, javi, 4, 'W', ana.leader, { oppMem: ana.id, first: true });
  const ids = got();
  ['boro', 'rocks', 'mirror', 'friendly', 'thunder', 'comeback'].forEach((id) => assert.ok(ids.includes(id), id));
  assert.ok(!ids.includes('emperor'));
  log(b, javi, 5, 'W', ENEL, { first: true });
  assert.ok(got().includes('iron'));
  assert.ok(got().includes('gertlush'));
  log(b, javi, 0, 'W', { name: 'Zoro', colors: ['green', 'black'] }, { top: 'Top 8' });
  assert.ok(got().includes('clifton'));
  assert.ok(got().includes('raid'));
  // Ana lost to Javi: the friendly-fire loss does not give her the badge
  assert.ok(!C.badges(C.games(b, ana.id, ev)).find((x) => x.badge.id === 'friendly').got);
});

test('rainbow and emperor', () => {
  const { b, javi } = crew();
  ['red', 'green', 'blue', 'purple', 'black', 'yellow'].forEach((c, i) => log(b, javi, i + 1, 'W', { name: 'X', colors: [c] }));
  const ids = C.badges(C.games(b, javi.id, null)).filter((x) => x.got).map((x) => x.badge.id);
  assert.ok(ids.includes('rainbow'));
  assert.ok(ids.includes('emperor'));
});

test('merging two profiles of the same friend', () => {
  const { b, javi, ana, ev } = crew();
  const ana2 = C.put(b, 'members', { id: 'm-ana000002', name: 'ana', emoji: '🐍', color: '#ff7ac6', leader: ana.leader });
  const g1 = log(b, ana2, 1, 'W', LUFFY);
  log(b, javi, 2, 'W', ana.leader, { oppMem: ana2.id });
  C.react(b, g1.id, ana2.id, '🔥');
  C.mergeMembers(b, ana.id, ana2.id);
  assert.ok(!C.get(b, 'members', ana2.id));
  assert.strictEqual(C.games(b, ana.id, ev).length, 2);
  assert.deepStrictEqual(C.reactionsFor(b, g1.id), { '🔥': [ana.id] });
});

test('reactions toggle', () => {
  const { b, javi, ana } = crew();
  const g = log(b, javi, 1, 'W', ENEL);
  C.react(b, g.id, ana.id, '🔥');
  C.react(b, g.id, javi.id, '🔥');
  assert.strictEqual(C.reactionsFor(b, g.id)['🔥'].length, 2);
  C.react(b, g.id, ana.id, '⚡');
  assert.deepStrictEqual(C.reactionsFor(b, g.id), { '🔥': [javi.id], '⚡': [ana.id] });
  C.react(b, g.id, ana.id, '⚡');
  assert.deepStrictEqual(C.reactionsFor(b, g.id), { '🔥': [javi.id] });
});

test('links: pack and unpack round trip', async () => {
  const { b, javi } = crew();
  log(b, javi, 1, 'W', ENEL, { notes: 'Bristol baby ⚡ ñ' });
  const code = await C.pack(b);
  assert.ok(/^[zj][A-Za-z0-9_-]+$/.test(code));
  const back = await C.unpack('https://x.io/kaidoneta/#crew=' + code);
  assert.ok(C.same(back, C.cleanBook(b)));
  await assert.rejects(C.unpack('qnope'), (e) => e.code === 'link' && /no es un enlace de Kaidoneta/.test(e.message));
  await assert.rejects(C.unpack('j!!!'), (e) => e.code === 'link' && /roto o incompleto/.test(e.message));
  await assert.rejects(C.unpack('jbm9wZQ'), (e) => e.code === 'link' && /roto o incompleto/.test(e.message));
});

test('the same round logged twice (two phones) counts once, and slotTaken finds it', () => {
  const { b, javi, ana, ev } = crew();
  log(b, ana, 3, 'W', ENEL);
  log(b, ana, 3, 'W', ENEL); // the second phone, bad signal
  assert.strictEqual(C.games(b, ana.id, ev).length, 1);
  assert.strictEqual(C.record(C.games(b, ana.id, ev)).pts, 3);
  assert.ok(C.slotTaken(b, ana.id, ev, 'R3', ''));
  assert.ok(!C.slotTaken(b, ana.id, ev, 'R4', ''));
  // friendly fire logged by Javi, and Ana logs her loss as an ordinary round: still one round for Ana
  log(b, javi, 4, 'W', ana.leader, { oppMem: ana.id });
  log(b, ana, 4, 'L', javi.leader);
  assert.strictEqual(C.games(b, ana.id, ev).length, 2);
  assert.ok(C.loggedBy(b, ev, 4, '', javi.id, ana.id), 'found in both directions');
});

test('a round logged under a merged-away profile is moved, not lost', () => {
  const { b, ana, ev } = crew();
  const ana2 = C.put(b, 'members', { id: 'm-ana000002', name: 'Ana', emoji: '🐍', color: '#ff7ac6', leader: ana.leader });
  const offline = JSON.parse(JSON.stringify(b)); // Ana's phone, no signal
  C.mergeMembers(b, ana.id, ana2.id);
  log(offline, offline.members['m-ana000002'], 2, 'W', ENEL); // logged as the old profile
  const m = C.merge(b, offline);
  assert.strictEqual(m.members['m-ana000002'].into, ana.id, 'the tombstone keeps where it went');
  assert.strictEqual(C.games(m, ana.id, ev).length, 0, 'before the fix the round is orphaned');
  assert.strictEqual(C.fixAliases(m), true);
  assert.strictEqual(C.games(m, ana.id, ev).length, 1);
  assert.strictEqual(C.fixAliases(m), false, 'nothing left to move');
  assert.strictEqual(C.aliasOf(m, 'm-ana000002'), ana.id);
  assert.strictEqual(C.cleanBook(m).members['m-ana000002'].into, ana.id, 'survives a link or the server');
});

test('cutting text never leaves half an emoji', () => {
  const { b } = crew();
  const r = C.put(b, 'members', { id: 'm-emoji0001', name: 'Javi ' + '🐉'.repeat(12), emoji: '🐉', color: '#9b5cf6', leader: C.KAIDO });
  assert.ok(!/[\ud800-\udbff](?![\udc00-\udfff])/.test(r.name), 'no lone high surrogate');
  assert.doesNotThrow(() => encodeURIComponent(r.name));
  assert.strictEqual(C.cleanBook({ members: { 'm-x00000001': { id: 'm-x00000001', at: 1, name: 'a\ud83d' } } }).members['m-x00000001'].name, 'a');
});

test('a link cannot delete the regional or pin a record in the future', () => {
  const { b } = crew();
  C.remove(b, 'events', C.BRISTOL.id);
  C.ensureBristol(b);
  assert.ok(C.get(b, 'events', C.BRISTOL.id), 'the regional comes back');
  const evil = C.cleanBook({ members: { 'm-evil00001': { id: 'm-evil00001', at: 9e14, name: 'X' } } });
  assert.ok(evil.members['m-evil00001'].at <= C.now() + C.SKEW + 100);
});

test('Emperor of the Sea stays earned after a later loss', () => {
  const { b, javi } = crew();
  [1, 2, 3, 4].forEach((r) => log(b, javi, r, 'W', ENEL));
  log(b, javi, 5, 'L', LUFFY);
  const got = C.badges(C.games(b, javi.id, null)).filter((x) => x.got).map((x) => x.badge.id);
  assert.ok(got.includes('emperor'));
});

/* ---------- the online crew, against a fake Supabase ---------- */
function fakeService() {
  const users = {}, saves = {}, svc = { calls: 0, failNext: 0 };
  let n = 0;
  const ok = (body, status) => Promise.resolve({ ok: true, status: status || 200, text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)) });
  const bad = (status, msg) => Promise.resolve({ ok: false, status, text: () => Promise.resolve(JSON.stringify({ msg })) });
  const session = (u) => ({ access_token: 'at-' + u.id + '-' + (++n), refresh_token: 'rt-' + u.id, expires_in: 3600, user: { id: u.id } });
  svc.fetch = (url, init) => {
    svc.calls++;
    if (svc.failNext) { svc.failNext--; return Promise.reject(new Error('offline')); }
    const u = new URL(url), body = init.body ? JSON.parse(init.body) : null;
    if (u.pathname === '/auth/v1/signup') {
      if (users[body.email]) return bad(422, 'User already registered');
      users[body.email] = { id: 'uid-' + Object.keys(users).length, pass: body.password };
      return ok(session(users[body.email]));
    }
    if (u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password') {
      const x = users[body.email];
      if (!x || x.pass !== body.password) return bad(400, 'Invalid login credentials');
      return ok(session(x));
    }
    if (u.pathname === '/auth/v1/token') {
      const id = String(body.refresh_token).slice(3);
      return ok(session({ id }));
    }
    const auth = String(init.headers.Authorization || ''), uid = auth.split('-').slice(1, 3).join('-');
    if (!/^Bearer at-/.test(auth)) return bad(401, 'JWT expired');
    if (u.pathname === '/rest/v1/saves' && init.method === 'GET') {
      const id = u.searchParams.get('id').slice(3);
      if (id !== uid) return ok([]);
      return ok(saves[id] ? [{ data: JSON.parse(JSON.stringify(saves[id])) }] : []);
    }
    if (u.pathname === '/rest/v1/saves' && init.method === 'POST') {
      if (body.id !== uid) return bad(403, 'new row violates row-level security policy');
      saves[body.id] = body.data;
      return ok(undefined, 201);
    }
    return bad(404, 'not found');
  };
  svc.saves = saves;
  return svc;
}
function phone(svc, book) {
  // one phone = its own storage key space and its own book
  const K2 = K; // the module is shared; we swap storage and book per phone
  const state = { book };
  return {
    state,
    use() {
      K2.cloud.fetch = svc.fetch;
      K2.cloud.getBook = () => state.book;
      K2.cloud.setBook = (b) => { state.book = b; };
      Object.keys(mem).forEach((k) => delete mem[k]);
      Object.assign(mem, state.mem || {});
      K2.cloud.reload();
      return K2.cloud;
    },
    park() { state.mem = Object.assign({}, mem); },
  };
}

test('online crew: create, join from a second phone, both logs end up everywhere', async () => {
  const svc = fakeService();
  const A = crew(), B = crew();
  B.b = C.ensureBristol(C.emptyBook()); // the second phone starts empty
  const pa = phone(svc, A.b), pb = phone(svc, B.b);

  let cl = pa.use();
  await assert.rejects(cl.create('a', 'secret1'), (e) => e.code === 'input' && /de 3 a 20/.test(e.message));
  await assert.rejects(cl.create('kaidoneta', '123'), (e) => e.code === 'input' && /6 caracteres/.test(e.message));
  assert.strictEqual(await cl.create('Kaidoneta Crew', 'gertlush'), 'kaidoneta_crew');
  assert.ok(cl.signedIn());
  assert.strictEqual(svc.saves['uid-0'].book.members['m-javi00001'].name, 'Javi');
  pa.park();

  cl = pb.use();
  await assert.rejects(cl.join('kaidoneta_crew', 'wrongpass'), (e) => e.code === 'wrong' && /contraseña de la tripulación incorrectos/.test(e.message));
  await cl.join('kaidoneta_crew', 'gertlush');
  assert.strictEqual(C.members(pb.state.book).length, 3, 'the second phone got the crew');
  log(pb.state.book, pb.state.book.members['m-ana000001'], 1, 'W', LUFFY);
  await cl.sync();
  pb.park();

  cl = pa.use();
  log(pa.state.book, pa.state.book.members['m-javi00001'], 1, 'L', LUFFY);
  await cl.sync();
  assert.strictEqual(C.live(pa.state.book, 'matches').length, 2);
  pa.park();

  cl = pb.use();
  await cl.sync();
  assert.strictEqual(C.live(pb.state.book, 'matches').length, 2);
  assert.ok(C.same(pa.state.book, pb.state.book), 'both phones agree');
  pb.park();
});

test('online crew: creating a crew whose name exists joins it with the right password', async () => {
  const svc = fakeService();
  const pa = phone(svc, crew().b), pb = phone(svc, C.ensureBristol(C.emptyBook()));
  let cl = pa.use();
  await cl.create('bristol_crew', 'onigashima');
  pa.park();
  cl = pb.use();
  await assert.rejects(cl.create('bristol_crew', 'otherpass'), (e) => e.code === 'taken' && /ya está pillado/.test(e.message));
  await cl.create('bristol_crew', 'onigashima');
  assert.strictEqual(C.members(pb.state.book).length, 3);
});

test('online crew: a write that lands over another is repaired by the next sync', async () => {
  const svc = fakeService();
  const pa = phone(svc, crew().b);
  let cl = pa.use();
  await cl.create('race_crew', 'raceraces');
  pa.park();
  const pb = phone(svc, JSON.parse(JSON.stringify(pa.state.book)));
  pb.state.mem = Object.assign({}, pa.state.mem);
  // both phones log at the same time; B's write lands last, without A's round
  const a = log(pa.state.book, pa.state.book.members['m-javi00001'], 1, 'W', ENEL);
  cl = pa.use(); await cl.sync(); pa.park();
  const remoteAfterA = JSON.parse(JSON.stringify(svc.saves['uid-0']));
  svc.saves['uid-0'] = { app: 'kaidoneta', v: 1, book: JSON.parse(JSON.stringify(pb.state.book)) }; // B overwrote it
  const b = log(pb.state.book, pb.state.book.members['m-leo000001'], 1, 'L', LUFFY);
  cl = pb.use(); await cl.sync(); pb.park();
  assert.ok(!svc.saves['uid-0'].book.matches[a.id], 'A\'s round was lost on the server for a moment');
  assert.ok(remoteAfterA.book.matches[a.id]);
  cl = pa.use(); await cl.sync(); pa.park();
  assert.ok(svc.saves['uid-0'].book.matches[a.id] && svc.saves['uid-0'].book.matches[b.id], 'A put it back');
  cl = pb.use(); await cl.sync();
  assert.ok(pb.state.book.matches[a.id]);
});

test('online crew: offline keeps everything and says so; leaving forgets the session', async () => {
  const svc = fakeService();
  const pa = phone(svc, crew().b);
  const cl = pa.use();
  await cl.create('offline_crew', 'nosignal');
  svc.failNext = 1;
  await assert.rejects(cl.sync(), (e) => e.code === 'offline' && /Sin cobertura/.test(e.message));
  assert.match(cl.lastError(), /Sin cobertura/);
  await cl.sync();
  assert.strictEqual(cl.lastError(), '');
  cl.leave();
  assert.ok(!cl.signedIn());
  assert.strictEqual(await cl.sync(), false);
});


test('online crew: a busy server during the token refresh keeps the crew session', async () => {
  const svc = fakeService();
  const pa = phone(svc, crew().b);
  const cl = pa.use();
  await cl.create('busy_crew', 'servers');
  const real = svc.fetch;
  svc.fetch = (url, init) => (/grant_type=refresh_token/.test(url) ? Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('{"msg":"busy"}') }) : real(url, init));
  cl.fetch = svc.fetch;
  const st = JSON.parse(localStorage.getItem('kaidoneta.cloud'));
  st.exp = 1; localStorage.setItem('kaidoneta.cloud', JSON.stringify(st)); cl.reload(); // the token has expired
  await assert.rejects(cl.sync());
  assert.ok(cl.signedIn(), 'still in the crew');
  svc.fetch = real; cl.fetch = real;
  await cl.sync();
  assert.strictEqual(cl.lastError(), '');
});

(async () => {
  for (const [name, fn] of tests) {
    clock = 1000; seq = 0;
    try { await fn(); passed++; console.log('ok   ' + name); } catch (e) { console.log('FAIL ' + name); console.log(e); process.exitCode = 1; }
  }
  console.log(`\n${passed}/${tests.length} tests passed`);
  setTimeout(() => process.exit(process.exitCode || 0), 10); // follow-up syncs leave timers behind
})();
