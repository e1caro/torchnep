/* Bloomdoku accounts, sync, friends and messages against a fake account service (Node only, no network):
 *   node tests/unit-cloud.js */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'js', 'engine.js'));
const W = require(path.join(root, 'js', 'worlds.js'));
const Shop = require(path.join(root, 'js', 'shop.js'));
const makeFake = require('./fake-supabase.js');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }
async function refused(promise, code, msg) {
  let err = null;
  try { await promise; } catch (e) { err = e; }
  ok(err, (msg || 'call') + ' should have been refused');
  if (code !== undefined) eq(err.code, code, (msg || 'refusal') + ' (' + err.message + ')');
  return err;
}

// One phone or computer: its own storage, its own copy of the app's state and of js/cloud.js.
function device(fake, lang) {
  const store = {};
  const win = { BD: { engine: E, worlds: W, shop: Shop } };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  ['core.js', 'cloud.js'].forEach((f) => new Function('window', 'localStorage', 'navigator', 'document', fs.readFileSync(path.join(root, 'js', f), 'utf8'))(win, ls, { language: lang || 'en' }, {}));
  const BD = win.BD;
  BD.stored = () => JSON.stringify(store); // everything this device keeps
  BD.load();
  BD.cloud.fetch = fake.fetch;
  BD.cloud.DELAY = 1e9; // no timers in tests: syncs are asked for
  return BD;
}
const play = (BD, key, garden, result) => { W.finish(BD.state, key, garden, result || { slips: 0 }); BD.save(); };

test('an account is a username and a password: taken names, short passwords and wrong passwords are explained', async () => {
  const fake = makeFake(), a = device(fake), b = device(fake);
  await refused(a.cloud.signUp('x', 'secret1'), 'input');
  await refused(a.cloud.signUp('ana', '123'), 'input');
  eq(await a.cloud.signUp('Ana', 'secret1'), 'ana');
  ok(a.cloud.signedIn() && a.cloud.user() === 'ana' && /^[A-HJ-NP-Z2-9]{6}$/.test(a.cloud.code()), 'signed in with a friend code: ' + a.cloud.code());
  ok(/taken/.test((await refused(b.cloud.signUp('ana', 'other12'), 422)).message));
  ok(/Wrong username or password/.test((await refused(b.cloud.signIn('ana', 'nope123'), 400)).message));
  eq(await b.cloud.signIn('ana', 'secret1'), 'ana');
  eq(b.cloud.code(), a.cloud.code(), 'the same code on every device');
  ok(Object.values(fake.users)[0].email === 'bloom.ana@users.fitquest.app', 'separate from the other apps\' accounts');
  ok(!a.stored().includes('secret1') && !b.stored().includes('secret1') && a.stored().includes('bloomdoku.cloud'), 'the password is not kept on the device, only the session');
});

test('two devices that play apart end up with everything of both, and nothing is sent when nothing changed', async () => {
  const fake = makeFake(), phone = device(fake), laptop = device(fake);
  play(phone, '1-1', 0, { slips: 0 }); play(phone, '1-1', 1, { slips: 2 });
  await phone.cloud.signUp('ana', 'secret1');
  play(laptop, '1-1', 1, { slips: 0 }); play(laptop, '2-1', 0, { slips: 0, owl: true });
  W.finishDaily(laptop.state, '2026-11-18', { slips: 0 }); laptop.save();
  eq(await laptop.cloud.signIn('ana', 'secret1'), 'ana');
  eq(laptop.state.levels['1-1'].g, '33', 'the laptop got the phone\'s garden and kept its better stars');
  await phone.cloud.sync();
  eq([phone.state.levels['1-1'].g, phone.state.levels['2-1'].g, Object.keys(phone.state.daily)], ['33', '2', ['2026-11-18']]);
  eq(W.progress(phone.state).levels, W.progress(laptop.state).levels);
  const before = fake.calls.filter((c) => !c.startsWith('GET')).length;
  eq(await phone.cloud.sync(), false); await laptop.cloud.sync();
  eq(fake.calls.filter((c) => !c.startsWith('GET')).length, before, 'no writes when both are up to date');
  eq(fake.saves[phone.cloud.uid()].data.levels['1-1'].g, '33');
});

test('what was bought follows the account; chestnuts are never counted twice', async () => {
  const fake = makeFake(), a = device(fake), b = device(fake);
  for (let g = 0; g < 8; g++) play(a, '1-1', g);
  const earned = Shop.earned(a.state);
  ok(Shop.buy(a.state, 'hat-bow') && Shop.buy(a.state, 'frog')); a.save();
  await a.cloud.signUp('ana', 'secret1');
  await b.cloud.signIn('ana', 'secret1');
  eq([Shop.owns(b.state, 'hat-bow'), Shop.stock(b.state, 'frog'), Shop.earned(b.state), Shop.balance(b.state)], [true, 6, earned, earned - 30 - 12]);
  Shop.use(b.state, 'frog'); b.save(); await b.cloud.sync(); await a.cloud.sync();
  eq(Shop.stock(a.state, 'frog'), 5, 'a charge used on one device is used on the other');
  eq(Shop.earned(a.state), earned, 'syncing back and forth earns nothing');
});

test('friends: a code, a request, an answer; the ranking shows levels; nobody else sees a profile', async () => {
  const fake = makeFake(), ana = device(fake), ben = device(fake), cat = device(fake);
  for (let g = 0; g < 6; g++) play(ana, '2-1', g);
  await ana.cloud.signUp('ana', 'secret1'); await ben.cloud.signUp('ben', 'secret2'); await cat.cloud.signUp('cat', 'secret3');
  await refused(ana.cloud.addFriend('abc'), 'input');
  await refused(ana.cloud.addFriend(ana.cloud.code()), 'input', 'your own code');
  await refused(ana.cloud.addFriend('ZZZZZZ'.replace(ana.cloud.code(), 'YYYYYY')), 'input', 'an unknown code');
  eq(await ana.cloud.addFriend(ben.cloud.code().toLowerCase()), { id: ben.cloud.uid(), username: 'ben', friends: false });
  eq([ana.cloud.friends().outgoing.map((f) => f.username), ana.cloud.friends().friends.length], [['ben'], 0]);
  await ben.cloud.loadFriends();
  eq([ben.cloud.friends().incoming.map((f) => f.username), ben.cloud.unreadTotal()], [['ana'], 1], 'the request reaches ben and counts as news');
  await ben.cloud.accept(ana.cloud.uid());
  await ana.cloud.loadFriends();
  eq([ana.cloud.friends().friends.map((f) => f.username), ben.cloud.friends().friends.map((f) => f.username)], [['ben'], ['ana']]);
  const seen = ben.cloud.friend(ana.cloud.uid()).public;
  eq([seen.lvl, seen.xp, seen.solved, seen.lv.length], [W.player(ana.state).level, W.xp(ana.state), 6, W.levels.length], 'ben sees ana\'s level and garden');
  ok(!('games' in seen) && !('set' in seen), 'only the summary is public');
  await cat.cloud.loadFriends();
  eq(cat.cloud.friends().friends.length + cat.cloud.friends().incoming.length, 0);
  eq(fake.handle('GET', 'https://x/rest/v1/bloom_profiles?id=in.(' + ana.cloud.uid() + ')&select=id,username', { Authorization: 'Bearer tok-' + cat.cloud.uid() + '-1' }, null).body, [], 'a stranger cannot read a profile');
  // both asking each other makes them friends at once
  eq((await cat.cloud.addFriend(ben.cloud.code())).friends, false);
  eq((await ben.cloud.addFriend(cat.cloud.code())).friends, true);
  // a level gained shows after the next sync
  for (let g = 0; g < 30; g++) play(ana, '2-2', g);
  await ana.cloud.sync(); await ben.cloud.loadFriends();
  eq(ben.cloud.friend(ana.cloud.uid()).public.lvl, W.player(ana.state).level);
  ok(W.player(ana.state).level > seen.lvl);
});

test('messages: text, flowers and garden challenges; unread counts, "seen", taking one back', async () => {
  const fake = makeFake(), ana = device(fake), ben = device(fake);
  await ana.cloud.signUp('ana', 'secret1'); await ben.cloud.signUp('ben', 'secret2');
  await refused(ana.cloud.send(ben.cloud.uid(), 'text', 'hello?'), 403, 'writing before being friends');
  await ana.cloud.addFriend(ben.cloud.code()); await ben.cloud.accept(ana.cloud.uid());
  await refused(ana.cloud.send(ben.cloud.uid(), 'text', '   '), 'input');
  await refused(ana.cloud.send(ben.cloud.uid(), 'text', 'x'.repeat(501)), 'input');
  const m1 = await ana.cloud.send(ben.cloud.uid(), 'text', ' Hi Ben! <b>not html</b> ');
  eq([m1.body, m1.kind, m1.from_id], ['Hi Ben! <b>not html</b>', 'text', ana.cloud.uid()]);
  await ana.cloud.send(ben.cloud.uid(), 'sticker', 'flowers-3');
  await ana.cloud.send(ben.cloud.uid(), 'garden', { key: '4-2', garden: 16, stars: 3, slips: 0, time: 200 });
  await ben.cloud.loadFriends();
  eq([ben.cloud.friends().unread[ana.cloud.uid()], ben.cloud.unreadTotal()], [3, 3]);
  const thread = await ben.cloud.thread(ana.cloud.uid());
  eq(thread.map((x) => x.kind), ['text', 'sticker', 'garden'], 'oldest first');
  eq(JSON.parse(thread[2].body), { key: '4-2', garden: 16, stars: 3, slips: 0, time: 200 });
  await ben.cloud.markRead(ana.cloud.uid());
  eq(ben.cloud.unreadTotal(), 0);
  ok((await ana.cloud.thread(ben.cloud.uid())).every((x) => x.read_at), 'ana sees that ben read them');
  await ben.cloud.send(ana.cloud.uid(), 'text', 'Hi Ana');
  await ana.cloud.loadFriends();
  eq(ana.cloud.unreadTotal(), 1);
  await ana.cloud.unsend(m1.id);
  eq((await ben.cloud.thread(ana.cloud.uid())).length, 3, 'a message taken back is gone for both');
  await ben.cloud.unsend((await ben.cloud.thread(ana.cloud.uid()))[0].id);
  eq((await ben.cloud.thread(ana.cloud.uid())).length, 3, 'only the sender can take a message back');
  ok(/Too many messages/.test((await refused((async () => { for (let i = 0; i < 40; i++) await ana.cloud.send(ben.cloud.uid(), 'text', 'm' + i); })(), 400)).message), 'no flooding');
});

test('removing a friend ends it for both, stops messages at once, and a report reaches the owner', async () => {
  const fake = makeFake(), ana = device(fake), ben = device(fake);
  await ana.cloud.signUp('ana', 'secret1'); await ben.cloud.signUp('ben', 'secret2');
  await ana.cloud.addFriend(ben.cloud.code()); await ben.cloud.accept(ana.cloud.uid());
  await ana.cloud.send(ben.cloud.uid(), 'text', 'rude');
  await ben.cloud.report(ana.cloud.uid(), 1, 'rude message');
  eq(fake.reports.map((r) => [r.reporter, r.about, r.body]), [[ben.cloud.uid(), ana.cloud.uid(), 'rude message']]);
  await ben.cloud.remove(ana.cloud.uid());
  eq(ben.cloud.friends().friends.length, 0);
  await ana.cloud.loadFriends();
  eq(ana.cloud.friends().friends.length + ana.cloud.friends().outgoing.length, 0);
  await refused(ana.cloud.send(ben.cloud.uid(), 'text', 'still there?'), 403);
});

test('a project without the friends tables: accounts and sync still work, and friends open when the tables arrive', async () => {
  const fake = makeFake(), a = device(fake), b = device(fake);
  fake.friendsOff = true;
  play(a, '1-1', 0);
  await a.cloud.signUp('ana', 'secret1');
  ok(a.cloud.signedIn() && a.cloud.friendsOff() && !a.cloud.code(), 'signed in, friends off');
  await b.cloud.signIn('ana', 'secret1');
  eq(b.state.levels['1-1'].g, '3', 'progress syncs anyway');
  await refused(a.cloud.addFriend('ABCDEF'), 'nofriends');
  await refused(a.cloud.loadFriends(), 'nofriends');
  fake.friendsOff = false;
  await a.cloud.refresh();
  ok(!a.cloud.friendsOff() && /^[A-HJ-NP-Z2-9]{6}$/.test(a.cloud.code()), 'friends switch on by themselves');
});

test('no connection: nothing is lost, the error says so, and the next sync catches up', async () => {
  const fake = makeFake(), a = device(fake);
  await a.cloud.signUp('ana', 'secret1');
  fake.offline = true;
  play(a, '1-1', 0);
  const e = await refused(a.cloud.sync(), 'offline');
  ok(/No connection/.test(e.message));
  ok(a.cloud.signedIn(), 'still signed in');
  await a.cloud.refresh(); // never throws
  fake.offline = false;
  await a.cloud.sync();
  eq(fake.saves[a.cloud.uid()].data.levels['1-1'].g, '3');
});

test('a session that expired is renewed; one that was revoked signs the device out', async () => {
  const fake = makeFake(), a = device(fake);
  await a.cloud.signUp('ana', 'secret1');
  a.cloud.now = () => Date.now() + 2 * 3600 * 1000; // two hours later: the access token is old
  play(a, '1-1', 0);
  await a.cloud.sync();
  ok(fake.calls.some((c) => c.includes('grant_type=refresh_token')), 'the session was renewed');
  delete fake.users[a.cloud.uid()]; // the account is gone
  a.cloud.now = () => Date.now() + 5 * 3600 * 1000;
  await refused(a.cloud.sync(), 'signedout');
  ok(!a.cloud.signedIn());
  eq(a.state.levels['1-1'].g, '3', 'the progress stays on the device');
});

test('deleting the account removes everything online and keeps the device playing', async () => {
  const fake = makeFake(), ana = device(fake), ben = device(fake);
  play(ana, '1-1', 0);
  await ana.cloud.signUp('ana', 'secret1'); await ben.cloud.signUp('ben', 'secret2');
  await ana.cloud.addFriend(ben.cloud.code()); await ben.cloud.accept(ana.cloud.uid());
  await ana.cloud.send(ben.cloud.uid(), 'text', 'bye');
  await ana.cloud.deleteAccount();
  ok(!ana.cloud.signedIn());
  eq([Object.keys(fake.users).length, Object.keys(fake.profiles).length, fake.friends.length, fake.messages.length, Object.keys(fake.saves).length], [1, 1, 0, 0, 1]);
  eq(ana.state.levels['1-1'].g, '3');
  await ben.cloud.loadFriends();
  eq(ben.cloud.friends().friends.length, 0);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); passed++; console.log('  ok  ' + name); }
    catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.message)); }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
