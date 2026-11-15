// Browser test: a computer and a phone sign in with the same account; a business created on one appears on the
// other, and a slider change made on the phone reaches the computer. The account service (Supabase) is replaced
// by a small fake that both browsers share. It serves the built app itself (run `npm run build` first):
//
//   npm run e2e            (SHOTS=<folder> also saves screenshots)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { setTimeout as wait } from 'node:timers/promises';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }

const PORT = 4174, BASE = `http://localhost:${PORT}/`, SHOTS = process.env.SHOTS;
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up yet */ } await wait(250); }

// the fake account service
const users = new Map(), saves = new Map(), tokens = new Map();
const session = id => { const at = `at-${id}-${tokens.size}`; tokens.set(at, id); return { access_token: at, refresh_token: `rt-${id}`, expires_in: 3600, user: { id } }; };
async function fake(route) {
  const req = route.request(), url = new URL(req.url()), body = req.postData() ? JSON.parse(req.postData()) : {};
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (status, data) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: data === null ? '' : JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/auth/v1/signup') { if (users.has(body.email)) return json(422, { msg: 'User already registered' }); const id = `u${users.size + 1}`; users.set(body.email, { id, pass: body.password }); return json(200, session(id)); }
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'refresh_token') return json(200, session(String(body.refresh_token).slice(3)));
    const u = users.get(body.email); return u && u.pass === body.password ? json(200, session(u.id)) : json(400, { error_description: 'Invalid login credentials' });
  }
  const uid = tokens.get((req.headers().authorization || '').slice(7)); if (!uid) return json(401, { message: 'JWT expired' });
  if (url.pathname === '/rest/v1/saves') {
    if (req.method() === 'POST') { saves.set(uid, body.data); return json(201, null); }
    return json(200, saves.has(uid) ? [{ data: saves.get(uid) }] : []);
  }
  return json(404, { message: 'not found' });
}

const browser = await chromium.launch();
async function device(name, viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'en-GB' });
  await ctx.route('**/*.supabase.co/**', fake);
  const page = await ctx.newPage();
  page.on('pageerror', e => ok(false, `${name}: page error ${e.message}`));
  await page.goto(BASE);
  return page;
}
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : null);
async function signIn(page, isNew) {
  await page.goto(BASE + '#/settings');
  await page.fill('input[autocomplete=username]', 'ana_01'); await page.fill('input[type=password]', 'secret1');
  await page.getByRole('button', { name: isNew ? 'Create account' : 'Sign in', exact: true }).click();
  await page.getByText('Signed in as ana_01').waitFor();
}

try {
  const pc = await device('pc', { width: 1366, height: 800 }), phone = await device('phone', { width: 390, height: 844 });

  // the computer creates an account and a café
  await signIn(pc, true);
  await pc.goto(BASE + '#/new');
  await pc.getByRole('button', { name: /Café/ }).click();
  await pc.fill('#bn', 'Café Central');
  await pc.getByRole('button', { name: 'Next' }).click();
  await pc.getByRole('button', { name: 'Create business' }).click();
  await pc.waitForSelector('canvas', { timeout: 90000 });
  ok(await pc.getByText('Revenue (net)').isVisible(), 'pc: the dashboard of the new business shows its KPIs');
  await pc.goto(BASE + '#/settings'); await pc.getByRole('button', { name: 'Sync now' }).click(); await pc.getByText(/Last sync/).waitFor();
  ok(saves.size === 1 && [...saves.values()][0].recipes.length === 1, 'the account holds the business recipe');
  ok(JSON.stringify([...saves.values()][0]).length < 5000, 'only the recipe is stored online, not the tables');

  // the phone signs in and finds it
  await signIn(phone, false);
  await phone.goto(BASE + '#/');
  await phone.getByText('Café Central').waitFor({ timeout: 10000 });
  ok(true, 'phone: the business created on the computer appears after signing in');
  await phone.getByText('Café Central').click();
  await phone.waitForSelector('canvas', { timeout: 90000 });
  const kpi = page => page.locator('.card.glow').first().locator('div').nth(1).innerText();
  await pc.goto(BASE + '#/'); await pc.getByText('Café Central').click(); await pc.waitForSelector('canvas');
  await pc.waitForTimeout(800);
  ok((await kpi(phone)) === (await kpi(pc)), `both devices rebuild the same data (revenue ${await kpi(pc)})`);
  await shot(phone, 'phone-dashboard'); await shot(pc, 'pc-dashboard');

  // the phone raises prices and skips 30 days; the computer receives both
  await phone.getByRole('button', { name: 'Controls' }).click();
  const slider = phone.getByRole('slider', { name: 'Price level' });
  await slider.focus(); for (let i = 0; i < 12; i++) await phone.keyboard.press('ArrowRight');
  await phone.getByRole('button', { name: 'Close' }).click();
  await phone.getByRole('button', { name: '+30' }).click();
  await phone.getByText('Day 395').waitFor({ timeout: 30000 });
  await phone.goto(BASE + '#/settings'); await phone.getByRole('button', { name: 'Sync now' }).click(); await phone.waitForTimeout(800);
  await pc.goto(BASE + '#/settings'); await pc.getByRole('button', { name: 'Sync now' }).click(); await pc.waitForTimeout(800);
  await pc.goto(BASE + '#/'); await pc.getByText('Café Central').click();
  await pc.getByText('Day 395').waitFor({ timeout: 30000 });
  ok(true, 'pc: the 30 days simulated on the phone arrive');
  await pc.waitForSelector('canvas'); await pc.waitForTimeout(1500);
  await pc.goto(BASE + `#/b/${pc.url().split('/b/')[1].split('/')[0]}/data`);
  await pc.getByRole('button', { name: /^parameter_changes/ }).click();
  await pc.getByText('priceLevel').first().waitFor({ timeout: 10000 });
  ok(true, 'pc: the price change made on the phone is in the parameter_changes table');
  await shot(pc, 'pc-changes');
  await phone.goto(BASE + '#/'); await phone.getByText('Café Central').click(); await phone.waitForSelector('canvas'); await phone.waitForTimeout(800);
  await pc.goto(BASE + '#/'); await pc.getByText('Café Central').click(); await pc.waitForSelector('canvas'); await pc.waitForTimeout(800);
  ok((await kpi(phone)) === (await kpi(pc)), 'both devices still show the same numbers after the change');
} catch (e) { ok(false, `stopped: ${e.message.split('\n')[0]}`); } finally { await browser.close(); server.kill(); }
console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
