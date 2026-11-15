// Browser test of BizSim and Analyst Path together, served side by side as on the published site
// (/bizsim/ and /analyst/). The account service is replaced by a small fake shared by both apps.
//   1. A business created in BizSim opens in Analyst Path through its "Practise" link, as an SQL database and as
//      the data of the business challenges.
//   2. Linking the BizSim account in Analyst Path: a business created in Analyst Path appears in BizSim.
// Needs the BizSim build (npm run build). SHOTS=<folder> also saves screenshots.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('playwright')); }
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../../..');
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'apps-site-'));
fs.symlinkSync(path.join(repo, 'bizsim/dist'), path.join(site, 'bizsim'));
fs.symlinkSync(path.join(repo, 'data-analyst-path'), path.join(site, 'analyst'));
const PORT = 4175, BASE = `http://localhost:${PORT}`, SHOTS = process.env.SHOTS;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', site], { stdio: 'ignore' });
for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + '/bizsim/')).ok) break; } catch { /* not up yet */ } await wait(250); }
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

const users = new Map(), saves = new Map(), tokens = new Map();
const session = id => { const at = `at-${id}-${tokens.size}`; tokens.set(at, id); return { access_token: at, refresh_token: `rt-${id}`, expires_in: 3600, user: { id } }; };
async function fake(route) {
  const req = route.request(), url = new URL(req.url()), body = req.postData() ? JSON.parse(req.postData()) : {};
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  const json = (status, data) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: data === null ? '' : JSON.stringify(data) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (url.pathname === '/auth/v1/signup') { const id = `u${users.size + 1}`; users.set(body.email, { id, pass: body.password }); return json(200, session(id)); }
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'refresh_token') return json(200, session(String(body.refresh_token).slice(3)));
    const u = users.get(body.email); return u && u.pass === body.password ? json(200, session(u.id)) : json(400, { error_description: 'Invalid login credentials' });
  }
  const uid = tokens.get((req.headers().authorization || '').slice(7)); if (!uid) return json(401, { message: 'JWT expired' });
  if (url.pathname === '/rest/v1/saves') { if (req.method() === 'POST') { saves.set(uid, body.data); return json(201, null); } return json(200, saves.has(uid) ? [{ data: saves.get(uid) }] : []); }
  return json(404, { message: 'not found' });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'en-GB' });
await ctx.route('**/*.supabase.co/**', fake);
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : null);
const stars = (page, id) => page.evaluate(i => { const s = JSON.parse(localStorage.getItem('data-analyst-path.v1') || '{}'); return (s.labs && s.labs.biz && s.labs.biz[i]) || 0; }, id);
async function closeModals(page) { for (let i = 0; i < 6 && await page.locator('.modal button').count(); i++) { await page.locator('.modal button').first().click(); await page.waitForTimeout(300); } }

try {
  // ---- 1. BizSim: an account and a café
  const biz = await ctx.newPage();
  biz.on('pageerror', e => ok(false, 'BizSim page error: ' + e.message));
  await biz.goto(BASE + '/bizsim/#/settings');
  await biz.fill('input[autocomplete=username]', 'ana_01'); await biz.fill('input[autocomplete=current-password]', 'secret1');
  await biz.getByRole('button', { name: 'Create account', exact: true }).click();
  await biz.getByText('Signed in as ana_01').waitFor();
  await biz.goto(BASE + '/bizsim/#/new');
  await biz.getByRole('button', { name: /Café/ }).click();
  await biz.fill('#bn', 'Café Central');
  await biz.getByRole('button', { name: 'Next' }).click();
  await biz.getByRole('button', { name: 'Create business' }).click();
  await biz.waitForSelector('canvas', { timeout: 90000 });
  const link = await biz.getByRole('link', { name: 'Practise in Analyst Path' }).getAttribute('href');
  ok(link.startsWith(BASE + '/analyst/#/biz/import/'), 'BizSim: the Practise link points at Analyst Path beside it');
  await shot(biz, 'bizsim-practise');

  // ---- 2. Analyst Path opens that business
  const ap = await ctx.newPage();
  ap.on('pageerror', e => ok(false, 'Analyst Path page error: ' + e.message));
  await ap.goto(link);
  await ap.waitForSelector('.biz-hero', { timeout: 60000 }); await closeModals(ap);
  ok(await ap.locator('.biz-hero h2').innerText() === 'Café Central', 'Analyst Path: the business from the link is the active one');
  ok((await ap.locator('.biz-lab').count()) === 4, 'Analyst Path: the business has challenges in SQL, DotSheets, DotPython and DotBI');
  await shot(ap, 'analyst-businesses');
  // free SQL on it
  await ap.goto(BASE + '/analyst/#/lab/biz'); await closeModals(ap);
  const editor = ap.locator('textarea.sql-editor').first();
  await ap.getByRole('button', { name: '▶ Run' }).waitFor(); await ap.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.includes('Run')).disabled, null, { timeout: 60000 });
  await editor.fill('SELECT COUNT(*) AS tickets FROM transactions;'); await ap.getByRole('button', { name: '▶ Run' }).click();
  const tickets = +(await ap.locator('.result table tbody td').first().innerText()).replace(/\D/g, '');
  ok(tickets > 1000, `SQLab: a real query runs on the business (${tickets} tickets)`);
  await shot(ap, 'analyst-sqlab');
  // an SQL business challenge, solved with its reference
  await ap.goto(BASE + '/analyst/#/lab/biz/bz02'); await closeModals(ap);
  await ap.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Check')); return b && !b.disabled; }, null, { timeout: 60000 });
  await ap.locator('textarea.sql-editor').first().fill('SELECT channel, COUNT(*) AS tickets, ROUND(AVG(total), 2) AS avg_ticket FROM transactions GROUP BY channel ORDER BY channel;');
  await ap.getByRole('button', { name: '✓ Check' }).click(); await ap.waitForTimeout(800);
  ok((await stars(ap, 'bz02')) >= 1, 'SQLab: a business challenge is checked against the business and gives stars');
  // a pandas and a spreadsheet challenge
  await ap.goto(BASE + '/analyst/#/biz/play/bzp2'); await closeModals(ap);
  await ap.locator('textarea.py-editor').fill('sales = pd.read_csv("biz_sales.csv")\nresult = sales.groupby("category")["quantity"].sum()');
  await ap.getByRole('button', { name: '✓ Check' }).click(); await ap.waitForTimeout(800);
  ok((await stars(ap, 'bzp2')) >= 1, 'DotPython: a business challenge passes with pandas on the business');
  await shot(ap, 'analyst-python');
  await ap.goto(BASE + '/analyst/#/biz/play/bzb1'); await closeModals(ap);
  await ap.locator('textarea.bi-editor').fill('SUM(Sales[quantity])');
  await ap.getByRole('button', { name: /Check/ }).click(); await ap.waitForTimeout(800);
  ok((await stars(ap, 'bzb1')) >= 1, 'DotBI: a business challenge passes with a DAX measure on the business');
  await shot(ap, 'analyst-bi');
  await ap.goto(BASE + '/analyst/#/biz/play/bzs2'); await closeModals(ap); await ap.waitForSelector('canvas, .sheets-grid', { timeout: 20000 });
  ok(await ap.getByText('revenue_net').first().isVisible(), 'DotSheets: the business sheet opens with its daily columns');
  await shot(ap, 'analyst-sheets');

  // ---- 3. Link the BizSim account in Analyst Path, create a business there, see it in BizSim
  await biz.goto(BASE + '/bizsim/#/settings'); await biz.getByRole('button', { name: 'Sync now' }).click(); await biz.getByText(/Last sync/).waitFor();
  await ap.goto(BASE + '/analyst/#/settings'); await closeModals(ap);
  await ap.fill('#bizUser', 'ana_01'); await ap.fill('#bizPass', 'secret1'); await ap.click('#bizLinkBtn');
  await ap.getByText('Linked to the BizSim account ana_01').first().waitFor({ timeout: 15000 });
  ok(true, 'Analyst Path: the BizSim account is linked from Settings');
  await ap.goto(BASE + '/analyst/#/biz'); await ap.waitForSelector('.biz-hero');
  await ap.selectOption('#bizType', 'pharmacy'); await ap.fill('#bizName', 'Farmacia Norte'); await ap.selectOption('#bizDays', '90');
  await ap.click('#bizCreateBtn');
  await ap.waitForFunction(() => document.querySelector('.biz-hero h2')?.textContent === 'Farmacia Norte', null, { timeout: 60000 });
  ok(true, 'Analyst Path: a business is created and simulated there');
  await ap.waitForTimeout(4000); // the automatic sync a few seconds after a change
  const account = [...saves.values()].find(d => d.app === 'bizsim');
  ok(account && account.recipes.some(r => r.big && r.big.name === 'Farmacia Norte'), 'the business made in Analyst Path is saved to the BizSim account');
  await biz.getByRole('button', { name: 'Sync now' }).click(); await biz.waitForTimeout(800);
  await biz.goto(BASE + '/bizsim/#/');
  await biz.getByText('Farmacia Norte').waitFor({ timeout: 10000 });
  ok(true, 'BizSim: the business created in Analyst Path appears in the portfolio');
  await biz.getByText('Farmacia Norte').click(); await biz.waitForSelector('canvas', { timeout: 90000 });
  ok(await biz.getByText('Revenue (net)').isVisible(), 'BizSim: it opens with its dashboard');
  await shot(biz, 'bizsim-from-analyst');
} catch (e) { ok(false, `stopped: ${e.message.split('\n')[0]}`); } finally { await browser.close(); server.kill(); fs.rmSync(site, { recursive: true, force: true }); }
console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
