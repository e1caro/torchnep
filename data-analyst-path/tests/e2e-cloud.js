/* Browser test of automatic sync: a computer and a phone sign in with the same account and end up with the same
 * progress. The account service (Supabase) is replaced by a small fake that both browsers share.
 *
 *   python3 -m http.server 8765        (in the site folder)
 *   BASE=http://localhost:8765 SHOTS=/tmp/shots node tests/e2e-cloud.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:8765';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'dap-shots-'));
const SB = 'https://fghbrevlqmrugbnqshoj.supabase.co';
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

async function closeModals(page) {
  await page.waitForTimeout(500);
  while (await page.locator('.modal').count()) { await page.click('.modal button'); await page.waitForTimeout(450); }
}
async function finish(page, id) {
  await page.goto(BASE + '/index.html#/lesson/' + id);
  await page.waitForSelector('.lesson');
  await closeModals(page);
  await page.click('button:has-text("Mark lesson as complete")');
  await page.waitForSelector('button:has-text("Completed")');
  await closeModals(page);
}

/* ---------- the fake account service ---------- */
const srv = { users: {}, saves: {}, tokens: {}, n: 0, writes: 0, down: false };
function session(uid) {
  const at = 'at' + (++srv.n), rt = 'rt' + srv.n;
  srv.tokens[at] = uid; srv.tokens[rt] = uid;
  return { access_token: at, refresh_token: rt, expires_in: 3600, user: { id: uid } };
}
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
async function handle(route) {
  const req = route.request(), u = new URL(req.url()), method = req.method();
  const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (srv.down) return route.abort('internetdisconnected');
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  if (u.pathname === '/auth/v1/signup') {
    if (srv.users[body.email]) return reply(422, { msg: 'User already registered' });
    const uid = 'uid-' + Object.keys(srv.users).length;
    srv.users[body.email] = { uid, pass: body.password };
    return reply(200, session(uid));
  }
  if (u.pathname === '/auth/v1/token') {
    if (u.searchParams.get('grant_type') === 'password') {
      const usr = srv.users[body.email];
      return usr && usr.pass === body.password ? reply(200, session(usr.uid)) : reply(400, { error_description: 'Invalid login credentials' });
    }
    const uid = srv.tokens[body.refresh_token];
    return uid ? reply(200, session(uid)) : reply(400, { error_description: 'Invalid Refresh Token' });
  }
  const me = srv.tokens[(req.headers().authorization || '').replace('Bearer ', '')];
  if (!me) return reply(401, { message: 'JWT expired' });
  if (u.pathname === '/rest/v1/saves') {
    if (method === 'GET') return reply(200, srv.saves[me] ? [srv.saves[me]] : []);
    if (method === 'POST') { srv.writes++; srv.saves[me] = { data: body.data, updated_at: body.updated_at }; return reply(201); }
  }
  return reply(404, { message: 'not found' });
}

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  async function device(opts, tag) {
    const ctx = await browser.newContext(opts);
    await ctx.route(SB + '/**', handle);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(tag + ' ' + m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => problems.push(tag + ' pageerror: ' + e.message));
    return page;
  }
  const pc = await device({ viewport: { width: 1280, height: 900 } }, 'computer');
  const phone = await device({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'phone');
  const state = (p) => p.evaluate(() => ({ done: Object.keys(DA.ui.state.done), xp: DA.game.totalXp(), bg: DA.ui.state.profile.bg, signed: DA.cloud.signedIn() }));

  /* ---------- computer: set up, finish a lesson, create the account ---------- */
  await pc.goto(BASE + '/index.html');
  await pc.click('.dot-bubble a:has-text("Start")');
  await pc.click('label.bg-card:has-text("Sports, fitness")');
  await pc.click('button:has-text("Save and start")');
  await pc.waitForSelector('.today');
  await pc.evaluate(() => { DA.cloud.DELAY = 300; });
  await finish(pc, 'l0-1');
  await pc.goto(BASE + '/index.html#/settings');
  await closeModals(pc);
  await pc.waitForSelector('#sync');
  ok((await pc.locator('#sync h2').innerText()).includes('Sync phone and computer'), 'Settings has the sync section');
  await pc.fill('#syncUser', 'javi');
  await pc.fill('#syncPass', 'secret1');
  await pc.click('#sync button:has-text("Create account")');
  await pc.waitForSelector('#sync .sync-ok');
  ok((await pc.locator('#sync .sync-ok').innerText()).includes('Signed in as javi'), 'computer: account created and signed in');
  ok(srv.saves['uid-0'] && srv.saves['uid-0'].data.state.done['l0-1'], 'computer progress is in the account');
  ok((await pc.locator('#sideNote').innerText()).includes('Synced as javi'), 'side menu says progress is synced');
  await pc.screenshot({ path: path.join(SHOTS, 'cloud-settings-desktop.png') });

  /* ---------- phone: fresh, signs in, gets everything ---------- */
  await phone.goto(BASE + '/index.html#/settings');
  await closeModals(phone);
  await phone.waitForSelector('#sync');
  await phone.screenshot({ path: path.join(SHOTS, 'cloud-signin-phone.png'), fullPage: false });
  await phone.fill('#syncUser', 'wrong');
  await phone.fill('#syncPass', 'secret1');
  await phone.click('#sync button:has-text("Sign in")');
  await phone.waitForFunction(() => /Wrong username or password/.test(document.querySelector('#sync .status-line').textContent));
  ok(true, 'phone: a wrong username gets a clear message');
  await phone.fill('#syncUser', 'Javi');
  await phone.fill('#syncPass', 'secret1');
  await phone.press('#syncPass', 'Enter');
  await phone.waitForSelector('#sync .sync-ok');
  let ph = await state(phone);
  ok(ph.signed && ph.done.includes('l0-1') && ph.bg && ph.bg === (await state(pc)).bg, 'phone: signed in and received the lesson and the profile (' + ph.done.join(',') + ')');
  await phone.evaluate(() => { DA.cloud.DELAY = 300; });

  /* ---------- phone makes progress: it reaches the computer on its own ---------- */
  await finish(phone, 'l0-2');
  await phone.waitForFunction(() => !DA.cloud.pending(), null, { timeout: 5000 });
  await phone.waitForTimeout(400);
  ok(srv.saves['uid-0'].data.state.done['l0-2'], 'phone: the new lesson was sent by itself a moment later');

  await pc.goto(BASE + '/index.html#/');
  await closeModals(pc);
  await pc.waitForSelector('.today');
  // opening the app syncs; also simulate coming back to the tab
  await pc.evaluate(() => DA.cloud.sync());
  await pc.waitForFunction(() => !!DA.ui.state.done['l0-2'], null, { timeout: 5000 });
  const p1 = await state(pc), p2 = await state(phone);
  ok(p1.done.includes('l0-2'), 'computer: received the phone lesson');
  ok(p1.xp === p2.xp && p1.done.length === p2.done.length, 'both devices show the same progress (' + p1.xp + ' XP, ' + p1.done.length + ' lessons)');

  /* ---------- offline: progress is kept and goes up later ---------- */
  srv.down = true;
  await finish(phone, 'l0-3');
  await phone.waitForTimeout(900);
  ok(!srv.saves['uid-0'].data.state.done['l0-3'], 'offline: nothing reached the account');
  await phone.goto(BASE + '/index.html#/settings');
  await closeModals(phone);
  ok((await phone.locator('#syncWhen').innerText()).includes('No connection'), 'offline: Settings explains it will sync later');
  srv.down = false;
  await phone.click('#sync button:has-text("Sync now")');
  await phone.waitForFunction(() => /Synced/.test(document.querySelector('#sync .status-line').textContent));
  ok(srv.saves['uid-0'].data.state.done['l0-3'], 'back online: Sync now sends it');
  const writes = srv.writes;
  await phone.click('#sync button:has-text("Sync now")');
  await phone.waitForFunction(() => /up to date/.test(document.querySelector('#sync .status-line').textContent));
  ok(srv.writes === writes, 'a sync with nothing new writes nothing');
  await phone.screenshot({ path: path.join(SHOTS, 'cloud-signedin-phone.png') });

  /* ---------- reload keeps the session ---------- */
  await pc.reload();
  await pc.waitForFunction(() => !!DA.ui.state.done['l0-3'], null, { timeout: 5000 });
  ok(true, 'computer: reopening the app syncs by itself (got the offline lesson)');

  const real = problems.filter((p) => !/internetdisconnected|Failed to fetch|ERR_INTERNET|status of 400/.test(p)); // the wrong password and the offline part
  ok(real.length === 0, 'no unexpected console errors' + (real.length ? ': ' + real.join(' | ') : ''));
  await browser.close();
  console.log(failures ? '\n' + failures + ' FAILED' : '\nall passed');
  process.exitCode = failures ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
