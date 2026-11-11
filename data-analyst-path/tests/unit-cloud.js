'use strict';
/* Automatic sync with an account (js/cloud.js), against a small fake of Supabase's auth and REST endpoints. */
const assert = require('assert');
const { DA, test } = require('./harness');
const ui = DA.ui, C = DA.cloud, Y = DA.sync;

function fakeSupabase() {
  const srv = { users: {}, saves: {}, calls: [], down: false, expireNext: false, tokens: {} };
  let n = 0;
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
  function session(uid) {
    const at = 'at' + (++n), rt = 'rt' + n;
    srv.tokens[at] = uid; srv.tokens[rt] = uid;
    return { access_token: at, refresh_token: rt, expires_in: 3600, user: { id: uid } };
  }
  srv.fetch = async (url, init) => {
    srv.calls.push({ url, method: init.method, auth: init.headers.Authorization, body: init.body });
    if (srv.down) throw new TypeError('Failed to fetch');
    assert.strictEqual(init.headers.apikey, C.KEY, 'every request carries the publishable key');
    const u = new URL(url), path = u.pathname, body = init.body ? JSON.parse(init.body) : null;
    if (path === '/auth/v1/signup') {
      if (srv.users[body.email]) return res(422, { code: 'user_already_exists', msg: 'User already registered' });
      if (body.password.length < 6) return res(422, { msg: 'Password should be at least 6 characters.' });
      const uid = 'uid-' + Object.keys(srv.users).length;
      srv.users[body.email] = { uid, pass: body.password };
      return res(200, session(uid));
    }
    if (path === '/auth/v1/token') {
      const grant = u.searchParams.get('grant_type');
      if (grant === 'password') {
        const usr = srv.users[body.email];
        if (!usr || usr.pass !== body.password) return res(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
        return res(200, session(usr.uid));
      }
      const uid = srv.tokens[body.refresh_token];
      if (!uid) return res(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' });
      delete srv.tokens[body.refresh_token];
      return res(200, session(uid));
    }
    const at = (init.headers.Authorization || '').replace('Bearer ', ''), me = srv.tokens[at];
    if (!me || srv.expireNext) { srv.expireNext = false; return res(401, { message: 'JWT expired' }); }
    if (path === '/rest/v1/saves') {
      const id = (u.searchParams.get('id') || '').replace('eq.', '');
      if (init.method === 'GET') return res(200, id === me && srv.saves[me] ? [JSON.parse(JSON.stringify(srv.saves[me]))] : []);
      if (init.method === 'POST') {
        assert.ok(/merge-duplicates/.test(init.headers.Prefer), 'upsert');
        if (body.id !== me) return res(403, { message: 'new row violates row-level security policy' });
        srv.saves[me] = { data: body.data, updated_at: body.updated_at };
        return res(201);
      }
      if (init.method === 'DELETE') { if (id === me) delete srv.saves[me]; return res(204); }
    }
    if (path === '/rest/v1/rpc/delete_my_account') {
      Object.keys(srv.users).forEach((e) => { if (srv.users[e].uid === me) delete srv.users[e]; });
      return res(204);
    }
    return res(404, { message: 'not found' });
  };
  C.fetch = srv.fetch;
  return srv;
}

const L = () => DA.lessons;
function finishLesson(i) { const l = L()[i]; ui.state.done[l.id] = true; ui.state.xp['lesson:' + l.id] = { d: ui.today(), n: 20 }; ui.state.met[ui.today()] = true; }
const pushes = (srv) => srv.calls.filter((c) => c.method === 'POST' && /rest\/v1\/saves/.test(c.url)).length;
async function fresh(srv) { C.signOut(); return srv; }
function done() { C.stop(); C.signOut(); C.fetch = () => Promise.reject(new Error('no network in tests')); }

test('cloud: phone and computer end up with the same progress, and nothing is lost', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    // computer: has done lesson 0, creates the account
    finishLesson(0);
    ui.state.profile.bg = 'science';
    const r1 = await C.signUp('Javi_23', 'secret1');
    assert.ok(C.signedIn() && C.user() === 'javi_23', 'username is lower-cased');
    assert.ok(r1.pushed && !r1.got);
    const row = srv.saves[Object.values(srv.users)[0].uid];
    assert.strictEqual(row.data.app, 'data-analyst-path');
    assert.ok(row.data.state.done[L()[0].id]);
    assert.ok(srv.users['analyst.javi_23@users.fitquest.app'], 'accounts are kept apart from FitQuest accounts');
    const kept = localStorage.getItem('data-analyst-path.cloud');
    assert.ok(kept && kept.indexOf('rt') >= 0 && kept.indexOf('secret1') < 0, 'the session is kept, the password is not');
    assert.ok(localStorage.getItem('data-analyst-path.v1').indexOf('secret1') < 0);
    const computer = JSON.parse(JSON.stringify(ui.state));

    // phone: fresh device with its own lesson 1, signs in with the same account
    C.signOut();
    ui.state = ui.sanitize({ v: 2 });
    finishLesson(1);
    const r2 = await C.signIn('javi_23', 'secret1');
    assert.ok(r2.got && r2.pushed, 'phone receives the computer\'s progress and sends its own');
    assert.ok(ui.state.done[L()[0].id] && ui.state.done[L()[1].id]);
    assert.strictEqual(ui.state.profile.bg, 'science', 'a fresh device takes the profile');

    // back on the computer: one sync brings the phone's lesson
    C.signOut();
    ui.state = ui.sanitize(computer);
    await C.signIn('javi_23', 'secret1');
    assert.ok(ui.state.done[L()[1].id], 'computer now has the phone lesson');
    assert.strictEqual(Object.keys(ui.state.done).length, 2);
  } finally { done(); }
});

test('cloud: a sync with nothing new writes nothing, and device settings never ping-pong', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    finishLesson(0); ui.state.profile.bg = 'finance';
    await C.signUp('ana', 'secret1');
    const before = pushes(srv);
    let r = await C.sync();
    assert.ok(!r.got && !r.pushed, 'nothing to do');
    ui.state.profile.theme = 'dark'; ui.state.profile.sound = true; // this device's own settings
    r = await C.sync();
    assert.ok(!r.pushed, 'settings alone are not progress');
    assert.strictEqual(pushes(srv), before);
  } finally { done(); }
});

test('cloud: each change schedules one sync a few seconds later, only when signed in', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    ui.save();
    assert.ok(!C.pending(), 'signed out: nothing scheduled');
    await C.signUp('ben', 'secret1');
    C.DELAY = 20;
    finishLesson(2); ui.save(); ui.save(); ui.save();
    assert.ok(C.pending());
    const n = pushes(srv);
    await new Promise((r) => setTimeout(r, 120));
    assert.strictEqual(pushes(srv), n + 1, 'three quick saves make one sync');
    assert.ok(Object.values(srv.saves)[0].data.state.done[L()[2].id]);
  } finally { C.DELAY = 3000; done(); }
});

test('cloud: expired sessions are refreshed, and a revoked one signs out without touching local progress', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    await C.signUp('cris', 'secret1');
    srv.expireNext = true; // the server says the token expired
    finishLesson(3);
    const r = await C.sync();
    assert.ok(r.pushed, 'retried after refreshing');
    assert.ok(srv.calls.some((c) => /grant_type=refresh_token/.test(c.url)));

    const realNow = C.now;
    C.now = () => Date.now() + 2 * 3600e3; // the access token is past its time: refreshed before the request
    srv.tokens = {}; // and the refresh token was revoked
    await assert.rejects(C.sync(), /session ended/);
    C.now = realNow;
    assert.ok(!C.signedIn(), 'signed out');
    assert.ok(ui.state.done[L()[3].id], 'progress stays on the device');
  } finally { done(); }
});

test('cloud: clear messages for taken names, wrong passwords, bad input and no connection', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    await C.signUp('dana', 'secret1');
    C.signOut();
    await assert.rejects(C.signUp('dana', 'other12'), /username is taken/);
    await assert.rejects(C.signIn('dana', 'wrong12'), /Wrong username or password/);
    const n = srv.calls.length;
    await assert.rejects(C.signIn('da na', 'secret1'), /3 to 20 letters/);
    await assert.rejects(C.signUp('dana2', '123'), /at least 6/);
    assert.strictEqual(srv.calls.length, n, 'bad input never reaches the server');
    await C.signIn('dana', 'secret1');
    srv.down = true;
    await assert.rejects(C.sync(), /No connection/);
    assert.ok(C.signedIn(), 'being offline never signs you out');
    assert.ok(/No connection/.test(C.lastError()));
    srv.down = false;
    await C.sync();
    assert.strictEqual(C.lastError(), '');
  } finally { done(); }
});

test('cloud: a row that is not this app\'s progress is never merged in', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    await C.signUp('eli', 'secret1');
    const uid = Object.values(srv.users)[0].uid;
    srv.saves[uid] = { data: { 'fc.profile': '{"name":"x"}' }, updated_at: 'x' };
    finishLesson(0);
    const r = await C.sync();
    assert.ok(!r.got && r.pushed);
    assert.strictEqual(srv.saves[uid].data.app, 'data-analyst-path');
  } finally { done(); }
});

test('cloud: deleting the account removes the online copy and keeps this device\'s progress', async () => {
  const srv = await fresh(fakeSupabase());
  try {
    finishLesson(0);
    await C.signUp('fer', 'secret1');
    await C.deleteAccount();
    assert.deepStrictEqual(srv.saves, {});
    assert.deepStrictEqual(srv.users, {});
    assert.ok(!C.signedIn());
    assert.ok(ui.state.done[L()[0].id]);
  } finally { done(); }
});

test('cloud: merging two devices gives the same result in either order (so they agree)', () => {
  const a = ui.sanitize({ v: 2 }), b = ui.sanitize({ v: 2 }), id = L()[0].id;
  a.notes[id] = 'abc'; b.notes[id] = 'abd';
  a.done[id] = true; b.met['2026-11-08'] = true;
  assert.strictEqual(C._canon(Y.merge(a, b).notes), C._canon(Y.merge(b, a).notes));
  const ab = Y.merge(a, b), ba = Y.merge(b, a);
  delete ab.profile; delete ba.profile;
  assert.strictEqual(C._canon(ab), C._canon(ba));
});

test('cloud: the page loads the sync module before Settings and the router', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const i = (f) => html.indexOf('src="js/' + f + '"');
  assert.ok(i('sync.js') < i('cloud.js') && i('cloud.js') < i('settings.js') && i('cloud.js') < i('app.js'));
});
