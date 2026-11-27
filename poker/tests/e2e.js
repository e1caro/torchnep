/* Poker Coach in a real browser at phone and desktop sizes (needs Playwright):
 *   python3 -m http.server 8000 &        (in poker/)
 *   BASE=http://localhost:8000 node tests/e2e.js */
'use strict';
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8000').replace(/\/$/, '') + '/index.html';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message).split('\n').slice(0, 3).join(' | ')); }
}
function ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(w, h, o) {
    o = o || {};
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!o.touch, isMobile: !!o.touch });
    await ctx.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) { localStorage.setItem('poker.v1', JSON.stringify({ settings: { speed: 'fast' } })); sessionStorage.setItem('seeded', '1'); }
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(m.text()); });
    await p.goto(BASE + (o.hash || ''));
    return p;
  }
  async function dealNext(p) { if (await p.locator('#rebuy').count()) await p.click('#rebuy'); await p.click('#deal'); }
  const yourTurnOrEnd = (p) => p.waitForFunction(() => { const T = window.PokerApp.state; return T.street === 'done' || (T.toAct === 0 && document.querySelector('[data-act]')); }, null, { timeout: 30000 });

  for (const [w, h, tag, touch] of [[390, 844, 'phone', true], [1440, 900, 'desktop', false]]) {
    const p = await open(w, h, { touch });

    await test(tag + ': the lessons, the hero chart and every tab', async () => {
      ok(await p.locator('.path li').count() === 15, 'fifteen lessons');
      ok(await p.locator('.hero-block .grid i').count() === 169, 'the hero chart');
      ok(await p.locator('#back').isHidden(), 'no Back on the first screen');
      for (const tab of ['drills', 'play', 'tools', 'learn']) {
        await p.click(`.tabs [data-tab="${tab}"]`);
        ok(await p.evaluate(() => document.body.dataset.view) === tab, tab);
      }
    });

    await test(tag + ': a lesson check, then Back returns to the list', async () => {
      await p.click('.path li:nth-child(7) button');
      ok((await p.textContent('#title')) === 'Outs and equity');
      await p.click('[data-quiz="0"][data-opt="2"]'); // 15 outs: right
      await p.click('[data-quiz="1"][data-opt="0"]'); // wrong
      await p.click('[data-quiz="2"][data-opt="1"]'); // right
      ok(/2 of 3 right/.test(await p.textContent('#quizEnd')));
      ok(await p.evaluate(() => window.PokerApp.back()) === true, 'Back is handled');
      ok(await p.evaluate(() => document.body.dataset.view) === 'learn');
      ok(await p.locator('.path li.done').count() === 1, 'the lesson is marked finished');
      ok(await p.evaluate(() => window.PokerApp.back()) === false, 'Back from Learn leaves the app');
    });

    await test(tag + ': every drill answers, with the keyboard on a computer', async () => {
      for (const id of ['showdown', 'namehand', 'preflop', 'outs', 'potodds', 'equity', 'nuts', 'postflop', 'combos', 'river', 'pushfold']) {
        await p.evaluate((d) => window.PokerApp.go('drill', d), id);
        for (let k = 0; k < 3; k++) {
          if (touch) await p.locator('#dq .opt').first().click();
          else await p.keyboard.press('1');
          await p.waitForSelector('#nextQ');
          ok(await p.locator('.verdict').count() === 1, id + ': a verdict');
          if (touch) await p.click('#nextQ'); else await p.keyboard.press('Enter');
          await p.waitForSelector('#nextQ', { state: 'detached' });
        }
        const s = await p.evaluate((d) => window.PokerApp.progress.drills[d], id);
        ok(s.total === 3, id + ': three answers counted');
      }
    });

    await test(tag + ': the equity calculator, a hand against a range', async () => {
      await p.evaluate(() => window.PokerApp.go('equity'));
      const pick = (c) => p.click(`[data-pick="${c}"]`);
      const PK = { c: (s) => p.evaluate((x) => window.PokerApp.PK.parseCard(x), s) };
      await pick(await PK.c('Ah')); await pick(await PK.c('Kh'));
      await p.click('[data-range="t10"]');
      await p.click('#eqRun');
      const t = await p.textContent('.eq-res');
      const e = parseFloat(/You: ([\d.]+)%/.exec(t)[1]);
      ok(e > 55 && e < 59.5, 'AKs against the top 10% (about 57%): ' + e);
    });

    await test(tag + ': the push-or-fold tool: every stack, pushing wider than calling', async () => {
      await p.evaluate(() => window.PokerApp.go('pushfold'));
      for (const x of ['5', '15']) {
        await p.click(`[data-push="${x}"]`);
        const n = await p.locator('.pf-pair .grid').count();
        ok(n === 2, 'two charts');
        const push = await p.locator('.pf-pair .grid-fig:first-child .grid i.r').count(), call = await p.locator('.pf-pair .grid-fig:last-child .grid i.c').count();
        ok(push > call && call > 0, x + ' bb: ' + push + ' pushing hands, ' + call + ' calling');
      }
    });

    await test(tag + ': five hands at the table, graded, counted and listed', async () => {
      await p.click('.tabs [data-tab="play"]');
      for (let hnd = 0; hnd < 5; hnd++) {
        if (await p.locator('#rebuy').count()) await p.click('#rebuy');
        if (touch) await p.click('#deal'); else await p.keyboard.press('Enter');
        for (let n = 0; n < 60; n++) {
          await yourTurnOrEnd(p);
          if (await p.evaluate(() => window.PokerApp.state.street === 'done')) break;
          const L = await p.evaluate(() => { const PK = window.PokerApp.PK, L = PK.legal(window.PokerApp.state); return { check: L.check, raise: !!L.raise }; });
          if (touch) await p.click(L.check ? '[data-act="check"]' : '[data-act="call"]');
          else await p.keyboard.press(n % 3 === 1 && L.raise ? 'r' : 'c');
          await p.waitForTimeout(20);
        }
      }
      const s = await p.evaluate(() => window.PokerApp.progress.stats);
      ok(s.hands === 5, 'hands ' + s.hands);
      ok(s.good + s.ok + s.mistakes >= 5, 'decisions graded');
      await p.click('#reviewLast');
      ok(await p.locator('.sheet-card.review h2').textContent() === 'Hand 5');
      await p.keyboard.press('Escape');
      ok(await p.locator('#sheet').isHidden(), 'Escape closes the review');
      await p.evaluate(() => window.PokerApp.go('stats'));
      ok(await p.locator('.hand-list li').count() === 5, 'five hands listed');
    });

    await test(tag + ': a reload in the middle of a hand carries on', async () => {
      await p.click('.tabs [data-tab="play"]');
      await dealNext(p);
      await p.waitForFunction(() => window.PokerApp.state.toAct === 0 || window.PokerApp.state.street === 'done', null, { timeout: 30000 });
      const before = await p.evaluate(() => JSON.stringify(window.PokerApp.state.seats[0].hole) + window.PokerApp.state.handNo);
      await p.reload();
      await p.click('.tabs [data-tab="play"]');
      const after = await p.evaluate(() => JSON.stringify(window.PokerApp.state.seats[0].hole) + window.PokerApp.state.handNo);
      ok(before === after, 'the same hand after the reload');
      await yourTurnOrEnd(p);
    });

    await test(tag + ': hints off hides the advice; grades still come', async () => {
      await p.click('#settingsBtn');
      await p.click('#setHints');
      await p.keyboard.press('Escape');
      await p.waitForFunction(() => { const T = window.PokerApp.state; return T.street === 'done' || T.toAct === 0; }, null, { timeout: 30000 });
      if (await p.evaluate(() => window.PokerApp.state.street === 'done')) { await dealNext(p); await yourTurnOrEnd(p); }
      if (await p.evaluate(() => window.PokerApp.state.street !== 'done')) {
        ok(await p.locator('.adv').count() === 0, 'no advice with hints off');
        await p.click('[data-act="check"], [data-act="call"]');
        await p.waitForSelector('.fb');
      }
    });

    if (touch) {
      await test(tag + ': on your turn the action buttons are on screen', async () => {
        await p.click('#settingsBtn'); await p.click('#setHints'); await p.keyboard.press('Escape');
        for (let k = 0; k < 6; k++) {
          await yourTurnOrEnd(p);
          if (await p.evaluate(() => window.PokerApp.state.street === 'done')) { await dealNext(p); continue; }
          await p.waitForTimeout(500);
          const box = await p.locator('.actions .btns').boundingBox();
          const nav = await p.locator('.tabs').boundingBox();
          ok(box && box.y + box.height <= nav.y + 1, 'the buttons end at ' + (box && box.y + box.height) + ', the tabs start at ' + nav.y);
          return;
        }
      });
    }
    await p.context().close();
  }

  await test('no errors in the page', async () => { ok(!errors.length, errors.slice(0, 3).join(' | ')); });
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
