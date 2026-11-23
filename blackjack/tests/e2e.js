/* Blackjack in a real browser at phone and desktop sizes (needs Playwright):
 *   python3 -m http.server 8000 &        (in blackjack/)
 *   BASE=http://localhost:8000 node tests/e2e.js
 * Rounds that need particular cards stack the shoe through window.BJGame.state before dealing. */
'use strict';
const { chromium } = require('playwright');
const BASE = (process.env.BASE || 'http://localhost:8000').replace(/\/$/, '') + '/index.html';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message).split('\n')[0]); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(w, h, o) {
    o = o || {};
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!o.touch, isMobile: !!o.touch, locale: 'en-GB' });
    if (o.prefs || o.save) {
      await ctx.addInitScript((data) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('blackjack.v1', JSON.stringify(data)); sessionStorage.setItem('seeded', '1'); } }, Object.assign({ prefs: o.prefs }, o.save || {}));
    }
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push(m.text()); });
    await p.goto(BASE + (o.query || ''));
    return p;
  }
  const state = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.BJGame.state)));
  // Nothing moving, and the bankroll figure has caught up with the game.
  const idle = (p) => p.waitForFunction(() => {
    const g = window.BJGame;
    return g.state && !g.busy && document.getElementById('bank').textContent === g.fmt(g.state.bankroll);
  }, null, { timeout: 20000 });
  async function seat(p, rules) { // first visit: pick rules in the form and sit down
    await p.waitForSelector('#setup.open');
    if (rules) await rules(p);
    await p.click('#setupForm [type=submit]');
    await p.waitForFunction(() => !document.querySelector('#setup.open'));
    await idle(p);
  }
  async function stackShoe(p, codes) {
    await p.evaluate((codes) => {
      const s = window.BJGame.state;
      const filler = []; for (let i = 0; i < 40; i++) filler.push(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'K'][i % 10] + 'C');
      s.shoe = filler.concat(codes.slice().reverse());
      s.size = Math.max(s.size, s.shoe.length); s.cut = s.size + 1;
    }, codes);
  }
  async function bet(p, chips) { for (const d of chips) await p.click(`[data-d="${d}"]`); await idle(p); }
  async function deal(p) { await p.click('#dealBtn'); await idle(p); }
  async function act(p, id) { await p.click('#' + id); await idle(p); }
  const bankText = (p) => p.textContent('#bank');
  const money = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });

  console.log('First visit, with animations');
  {
    const p = await open(390, 844, { touch: true, query: '?seed=3' });
    await test('the setup sheet opens first and cannot be dismissed', async () => {
      await p.waitForSelector('#setup.open');
      ok(!(await p.isVisible('#setup [data-close]')), 'no close button before a game exists');
      await p.keyboard.press('Escape');
      ok(await p.isVisible('#setup.open'), 'still open');
    });
    await test('presets and choices change the house edge on the button', async () => {
      const before = await p.textContent('#setupForm [type=submit]');
      await p.click('[data-preset="sixfive"]');
      ok(await p.isVisible('[data-preset="sixfive"].on'), 'preset marked');
      const after = await p.textContent('#setupForm [type=submit]');
      ok(before !== after && /2\.4%/.test(after), after);
      await p.click('[data-preset="strip"]');
    });
    await test('bankroll, decks and payout from the form reach the table', async () => {
      await p.click('[data-quick="500"]');
      await p.click('label:has(#r-decks-1)');
      await p.click('label:has(#r-payout-1)');
      ok(!(await p.isVisible('[data-preset].on')), 'no preset matches custom rules');
      await p.click('#setupForm [type=submit]');
      await idle(p);
      eq(await bankText(p), '$500');
      const s = await state(p);
      eq([s.rules.decks, s.rules.payout, s.shoe.length], [2, '6:5', 104]);
      eq(await p.textContent('#print1'), 'Blackjack pays 6 to 5');
    });
    await test('chips fly to the bet circle and back', async () => {
      await bet(p, [25, 25]);
      eq(await bankText(p), '$450');
      eq(await p.textContent('#dealBtn'), 'Deal $50');
      ok((await p.$$('.seat .stack .chip')).length === 2, 'two chips in the circle');
      await p.click('#clearBtn'); await idle(p);
      eq(await bankText(p), '$500');
      await bet(p, [10]);
    });
    await test('a whole animated round: cards dealt, hand played, chips settled', async () => {
      await p.click('[data-d="10"]');
      await p.click('#dealBtn'); // while the chip is still in the air: the deal waits for it
      await idle(p);
      eq((await state(p)).hands[0].bet, 2000, 'both chips bet');
      for (let k = 0; k < 12 && (await state(p)).phase !== 'done'; k++) {
        const s = await state(p);
        if (s.phase === 'insurance') await act(p, 'insNo');
        else if (s.phase === 'player') await act(p, 'standBtn');
      }
      const s = await state(p);
      eq(s.phase, 'done');
      eq(await p.$$eval('#dealerHand .card', (e) => e.length), s.dealer.length, 'dealer cards drawn');
      ok(await p.isVisible('.result.show'), 'result badge');
      eq(await bankText(p), money(s.bankroll), 'bankroll display');
      ok(await p.isVisible('#againBtn'), 'deal again offered');
    });
    await test('deal again sweeps the cards to the tray and deals the same bet', async () => {
      const before = await state(p);
      await p.click('#againBtn');
      await idle(p);
      const s = await state(p);
      ok(s.discards >= before.dealer.length + before.hands[0].cards.length, 'cards in the tray');
      eq(s.hands[0].bet, 2000, 'same bet');
      ok(['player', 'insurance', 'done'].includes(s.phase), s.phase);
    });
    await p.context().close();
  }

  console.log('Rounds with stacked cards (no animations)');
  {
    const p = await open(390, 844, { touch: true, prefs: { speed: 'off' } });
    await seat(p);
    await test('split 8s, double the first hand, both hands settle', async () => {
      await stackShoe(p, ['8S', '6H', '8C', '10D', '3H', 'KS', '9C', '10H']);
      await bet(p, [10]); await deal(p);
      ok(!(await p.isDisabled('#splitBtn')), 'split offered');
      await act(p, 'splitBtn');
      eq(await p.$$eval('.seat', (e) => e.length), 2, 'two seats');
      ok(await p.isVisible('.seat.active'), 'the hand in play is marked');
      await act(p, 'doubleBtn');
      await act(p, 'standBtn');
      const s = await state(p);
      eq([s.phase, s.hands.map((h) => h.result), s.last.net], ['done', ['win', 'win'], 3000]);
      eq(await p.$$eval('.result.show', (e) => e.length), 2, 'two result badges');
      eq(await bankText(p), '$1,030');
    });
    await test('insurance: offered under an ace, chips placed, paid 2 to 1', async () => {
      await p.click('#changeBtn'); await idle(p);
      await stackShoe(p, ['10S', 'AH', '9C', 'KD']);
      await bet(p, [10]); await deal(p);
      ok(await p.isVisible('#pIns'), 'insurance panel');
      ok(/Insure \$5/.test(await p.textContent('#insYes')), await p.textContent('#insYes'));
      await act(p, 'insYes');
      const s = await state(p);
      eq([s.phase, s.dealerBJ, s.last.net], ['done', true, 0]);
      ok(/Dealer blackjack|Push/.test(await p.textContent('#msg')), await p.textContent('#msg'));
    });
    await test('even money is offered on a blackjack against an ace', async () => {
      await p.click('#changeBtn'); await idle(p);
      await stackShoe(p, ['AS', 'AH', 'KC', '7D']);
      await bet(p, [10]); await deal(p);
      ok(/Even money/.test(await p.textContent('#insYes')), 'even money');
      await act(p, 'insNo');
      const s = await state(p);
      eq([s.hands[0].result, s.last.net], ['blackjack', 1500]);
    });
    await test('surrender gives back half', async () => {
      await p.click('#changeBtn'); await idle(p);
      await stackShoe(p, ['10S', '10H', '6C', '9D']);
      await bet(p, [10]); await deal(p);
      ok(await p.isVisible('#surrenderBtn'), 'surrender shown');
      await act(p, 'surrenderBtn');
      eq((await state(p)).last.net, -500);
    });
    await test('a reload mid-round brings back the same table', async () => {
      await p.click('#changeBtn'); await idle(p);
      await stackShoe(p, ['10S', '6H', '2C', '10D', '3H']);
      await bet(p, [10]); await deal(p);
      await act(p, 'hitBtn');
      const before = await state(p);
      await p.reload(); await idle(p);
      const after = await state(p);
      eq([after.phase, after.hands[0].cards.map((c) => c.id), after.bankroll], [before.phase, before.hands[0].cards.map((c) => c.id), before.bankroll]);
      eq(await p.$$eval('.card', (e) => e.length), 5, 'five cards on the table');
      eq(await p.$$eval('.card.down', (e) => e.length), 1, 'the hole card stays face down');
      await act(p, 'standBtn');
      eq((await state(p)).phase, 'done');
    });
    await p.context().close();
  }

  console.log('Menu, hints, count and statistics');
  {
    const p = await open(1280, 800, { prefs: { speed: 'fast' } });
    await seat(p);
    await test('the menu lists the house rules and changes the look at once', async () => {
      await p.click('#menuBtn');
      ok(/Stands on all 17s/.test(await p.textContent('#rulesList')), 'rules listed');
      await p.click('label:has(#p-felt-1)');
      eq(await p.getAttribute('body', 'data-felt'), 'blue');
      await p.click('#p-hints'); await p.click('#p-count');
      await p.keyboard.press('Escape');
      ok(!(await p.isVisible('#menu.open')), 'menu closed');
      ok(await p.isVisible('#count'), 'count shown');
    });
    await test('strategy hints light up the chart move', async () => {
      await stackShoe(p, ['10S', '6H', '6C', '10D', '5H']);
      await bet(p, [10]); await deal(p);
      ok(await p.isVisible('#standBtn.rec'), 'stand recommended for 16 vs 6');
      ok(/Hard 16 vs 6/.test(await p.textContent('#hint')), await p.textContent('#hint'));
    });
    await test('keyboard: H hits, Enter deals again', async () => {
      await p.keyboard.press('h'); await idle(p);
      eq((await state(p)).hands[0].cards.length, 3);
      ok((await state(p)).phase === 'done', 'bust ends the round');
      await p.keyboard.press('Enter'); await idle(p);
      ok((await state(p)).hands.length === 1 && (await state(p)).phase !== 'betting', 'dealt again');
    });
    await test('statistics: rounds, chart accuracy and a two-tap reset', async () => {
      for (let k = 0; k < 6 && (await state(p)).phase !== 'done'; k++) {
        const s = await state(p);
        if (s.phase === 'insurance') await act(p, 'insNo'); else await act(p, 'standBtn');
      }
      await p.click('#statsBtn');
      ok(/Rounds played/.test(await p.textContent('#statsBody')), 'stats');
      ok(await p.isVisible('.spark polyline'), 'bankroll line');
      await p.click('#resetStatsBtn');
      eq(await p.textContent('#resetStatsBtn'), 'Tap again to reset');
      await p.click('#resetStatsBtn');
      eq((await state(p)).stats.rounds, 0);
      await p.keyboard.press('Escape');
    });
    await test('a new game from the menu starts fresh with the new rules', async () => {
      await p.click('#menuBtn'); await p.click('#newGameBtn');
      await p.fill('#r-bankroll', '2500');
      await p.selectOption('#r-minBet', '25');
      await p.click('#setupForm [type=submit]'); await idle(p);
      const s = await state(p);
      eq([s.bankroll, s.rules.minBet, s.stats.rounds], [250000, 25, 0]);
      eq(await bankText(p), '$2,500');
      eq(await p.$$eval('[data-d]', (e) => e.map((b) => Number(b.dataset.d))), [5, 10, 25, 100, 500], 'chips around the table minimum');
    });
    await p.context().close();
  }

  console.log('Out of chips');
  {
    const p = await open(390, 844, { touch: true, prefs: { speed: 'off' } });
    await seat(p, async (q) => { await q.fill('#r-bankroll', '10'); await q.selectOption('#r-minBet', '10'); });
    await test('losing the last chips offers a rebuy', async () => {
      await stackShoe(p, ['10S', '9H', '6C', '10D']);
      await bet(p, [10]); await deal(p);
      await act(p, 'standBtn');
      await p.click('#againBtn'); await idle(p);
      ok(await p.isVisible('#pBroke'), 'out of chips panel');
      await p.click('#rebuyBtn'); await idle(p);
      eq(await bankText(p), '$10');
      ok(await p.isVisible('#pBet'), 'betting again');
    });
    await p.context().close();
  }

  console.log('Layout');
  for (const [w, h, name] of [[360, 640, 'small phone'], [390, 844, 'iPhone'], [430, 932, 'big phone'], [720, 900, 'beside a chat'], [1280, 800, 'laptop']]) {
    const p = await open(w, h, { touch: w < 700, prefs: { speed: 'off' } });
    await seat(p);
    await test(name + ': four split hands fit, nothing scrolls sideways, controls on screen', async () => {
      await p.evaluate(() => { const s = window.BJGame.state; s.rules.maxHands = 4; });
      await stackShoe(p, ['8S', '6H', '8C', '10D', '8H', '8D', '8C', '2S', '2H', '2D', '2C']);
      await bet(p, [10]); await deal(p);
      for (let k = 0; k < 3; k++) { if (!(await p.isDisabled('#splitBtn'))) await act(p, 'splitBtn'); }
      eq(await p.$$eval('.seat', (e) => e.length), 4, 'four hands');
      const m = await p.evaluate(() => {
        const r = (sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.getBoundingClientRect());
        const cards = r('.card'), rail = document.getElementById('controls').getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, railBottom: rail.bottom,
          left: Math.min(...cards.map((c) => c.left)), right: Math.max(...cards.map((c) => c.right)), bottom: Math.max(...cards.map((c) => c.bottom)), railTop: rail.top };
      });
      ok(m.sw <= m.iw, 'scrolls sideways: ' + m.sw + ' > ' + m.iw);
      ok(m.left >= 0 && m.right <= m.iw, `cards off screen: ${m.left.toFixed(0)}..${m.right.toFixed(0)} of ${m.iw}`);
      ok(m.railBottom <= m.ih + 1, 'controls below the screen');
      ok(m.bottom <= m.railTop, 'cards under the controls');
      await p.screenshot({ path: (process.env.SHOTS || '/tmp') + `/bj-${w}x${h}.png` });
    });
    await p.context().close();
  }

  await test('no errors in the console', async () => { eq(errors, []); });
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
