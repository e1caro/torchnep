/* Drives the desktop program end to end: home screen, the trainer (a few drills and the Sevilla rules), the blackjack
 * table (a hand at the Sevilla table), the links between them, and that progress is still there after a reload.
 *
 *   node tests/smoke.js --url http://localhost:8765/      the assembled frontend/ in Chromium (needs playwright)
 *   node tests/smoke.js --cdp http://127.0.0.1:9222       the running BlackjackHiLo.exe, started with
 *                                                         WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222
 * Optional: --shots <dir> writes screenshots there; --after-restart only checks that a second launch still has
 * what the first one saved. */
'use strict';
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const URL_ = arg('--url'), CDP = arg('--cdp'), SHOTS = arg('--shots'), RESTARTED = process.argv.includes('--after-restart');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = require('playwright-core').chromium; }

let passed = 0, failed = 0;
const errors = [], foreign = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message).split('\n').slice(0, 4).join(' | ')); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

(async () => {
  let browser, page;
  if (CDP) {
    for (let i = 0; ; i++) {                       // the window takes a moment to come up
      try { browser = await chromium.connectOverCDP(CDP); break; }
      catch (e) { if (i > 40) throw e; await new Promise((r) => setTimeout(r, 1000)); }
    }
    for (let i = 0; i < 40 && !page; i++) {
      page = browser.contexts().flatMap((c) => c.pages()).find((p) => /^https?:/.test(p.url()));
      if (!page) await new Promise((r) => setTimeout(r, 500));
    }
    ok(page, 'the program shows no page');
  } else {
    browser = await chromium.launch();
    page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
    await page.goto(URL_);
  }
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.waitForLoadState('load');
  const origin = new URL(page.url()).origin;
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) foreign.push(u); });
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: require('path').join(SHOTS, name + '.png') }).catch((e) => console.log('      (no screenshot: ' + e.message.split('\n')[0] + ')')); };
  const go = async (sel, pattern) => { await Promise.all([page.waitForURL(pattern, { timeout: 15000 }), page.click(sel)]); await page.waitForLoadState('load'); };
  console.log('origin ' + origin + ', user agent ' + (await page.evaluate(() => navigator.userAgent)));

  if (RESTARTED) {                               // a second launch: only that what was saved is still there
    await test('after closing and opening the program again, the seat and the rules are still there', async () => {
      ok(/Sevilla/.test(await page.textContent('#state-table')), 'home does not show the seat: ' + await page.textContent('#state-table'));
      await go('#door-hilo', /\/hilo\/index\.html/);
      ok(/no hole card/.test(await page.textContent('#rules-line')), 'rules line: ' + await page.textContent('#rules-line'));
      await page.click('nav.tabs a[href="#table"]');
      ok(/Buy-ins/.test(await page.textContent('#t-meter')), 'no bankroll shown');
      await shot('5-after-restart');
    });
    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    await browser.close().catch(() => {});
    process.exit(failed || errors.length ? 1 : 0);
  }

  await test('the home screen opens with both doors', async () => {
    ok(/\/(index\.html)?$/.test(new URL(page.url()).pathname), 'unexpected start page ' + page.url());
    ok((await page.title()) === 'Blackjack & Hi-Lo', 'title is ' + await page.title());
    ok(await page.isVisible('#door-table') && await page.isVisible('#door-hilo'), 'a door is missing');
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length);
    ok(fonts >= 2, 'bundled fonts did not load (' + fonts + ')');
    await shot('1-home');
  });

  await test('the trainer opens and its drills answer', async () => {
    await go('#door-hilo', /\/hilo\/index\.html/);
    ok(await page.isVisible('#stages li'), 'the plan is not shown');
    await page.click('nav.tabs a[href="#strategy"]');
    for (let i = 0; i < 25; i++) await page.keyboard.press('s');
    const meter = await page.textContent('#strat-meter');
    ok(/of 2[0-5]/.test(meter), 'strategy drill did not count the hands: ' + meter);
    await page.click('nav.tabs a[href="#table"]');
    await page.click('#t-controls button[data-bet="1"]');
    ok(await page.locator('#t-hands .card').count() >= 2, 'no cards dealt at the practice table');
    await shot('2-trainer-table');
  });

  await test('the Sevilla rules can be chosen and are kept', async () => {
    await page.click('nav.tabs a[href="#rules"]');
    await page.selectOption('#set-preset', 'sevilla');
    ok(/no hole card/.test(await page.textContent('#rules-line')), 'rules line: ' + await page.textContent('#rules-line'));
    await page.fill('#set-bankroll', '500'); await page.press('#set-bankroll', 'Tab');
    await page.selectOption('#set-spread', { label: '5 units (5 times the smallest)' });
    await page.reload(); await page.waitForLoadState('load');
    ok(/no hole card/.test(await page.textContent('#rules-line')), 'the rules were lost on reload');
    await page.click('nav.tabs a[href="#table"]');
    ok(/Bankroll 500 units/.test(await page.textContent('#t-meter')), 'bankroll: ' + await page.textContent('#t-meter'));
    ok(await page.locator('#t-controls button[data-bet]').count() === 5 && await page.isVisible('#t-controls button[data-bet="5"]'), 'bet buttons do not follow the 1 to 5 spread');
    await page.click('nav.tabs a[href="#edge"]');
    await page.waitForFunction(() => !document.querySelector('#edge-run').disabled && !document.querySelector('#edge-table').textContent.includes('…'), null, { timeout: 120000 });
    await shot('3-trainer-edge');
  });

  await test('from the trainer to the blackjack table: a hand at the Sevilla table', async () => {
    await go('#deskTable', /\/blackjack\/index\.html/);
    await page.waitForFunction(() => window.BJGame && document.querySelector('#tableList [data-table="sevilla"]'), null, { timeout: 15000 });
    await page.click('#tableList [data-table="sevilla"]');
    await page.click('#sitBtn');
    await page.waitForFunction(() => window.BJGame.state && window.BJGame.state.phase === 'betting' && !window.BJGame.busy, null, { timeout: 20000 });
    const st = await page.evaluate(() => ({ name: window.BJGame.state.table.name, hole: window.BJGame.state.rules.holeCard }));
    ok(st.name === 'Sevilla' && st.hole === 'enhc', 'not the Sevilla table: ' + JSON.stringify(st));
    await page.click('#chipTray [data-d]:not(:disabled)');
    await page.waitForFunction(() => !document.getElementById('dealBtn').disabled, null, { timeout: 10000 });
    await page.click('#dealBtn');
    for (let i = 0; i < 80; i++) {                 // stand on everything until the round is over
      const ph = await page.evaluate(() => (window.BJGame.busy ? 'busy' : window.BJGame.state.phase));
      if (ph === 'done') break;
      if (ph === 'insurance') await page.click('#insNo').catch(() => {});
      else if (ph === 'player') await page.click('#standBtn').catch(() => {});
      await page.waitForTimeout(400);
    }
    const end = await page.evaluate(() => ({ phase: window.BJGame.state.phase, dealer: window.BJGame.state.dealer.length, cards: document.querySelectorAll('#felt .card').length }));
    ok(end.phase === 'done', 'the round did not finish: ' + JSON.stringify(end));
    ok(end.cards >= 3, 'no cards on the felt: ' + JSON.stringify(end));
    await shot('4-blackjack');
  });

  await test('back to the home screen, which shows the seat and the saved games survive', async () => {
    await page.click('#menuBtn');
    await page.waitForSelector('#deskHome', { state: 'visible', timeout: 10000 });
    await go('#deskHome', /\/(index\.html)?$/);
    ok(/Sevilla/.test(await page.textContent('#state-table')), 'home does not show the seat: ' + await page.textContent('#state-table'));
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    ok(keys.includes('blackjack.v1') && keys.includes('hilo-settings') && keys.includes('hilo-trainer'), 'saved: ' + keys.join(', '));
    await page.keyboard.press('1'); await page.waitForURL(/\/blackjack\/index\.html/, { timeout: 15000 }); await page.waitForLoadState('load');
    await page.waitForFunction(() => window.BJGame && window.BJGame.state && window.BJGame.state.table.name === 'Sevilla', null, { timeout: 15000 });
    await page.goBack(); await page.waitForLoadState('load');
  });

  await test('nothing was fetched from outside the program and no script failed', async () => {
    ok(!foreign.length, 'outside requests: ' + foreign.slice(0, 5).join(', '));
    ok(!errors.length, errors.slice(0, 5).join(' || '));
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (!CDP) await browser.close(); else await browser.close().catch(() => {});
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('FAIL  ' + e.message); process.exit(1); });
