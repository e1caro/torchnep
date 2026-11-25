/* Blackjack in a real browser at phone and desktop sizes (needs Playwright):
 *   python3 -m http.server 8000 &        (in blackjack/)
 *   BASE=http://localhost:8000 node tests/e2e.js
 * Rounds that need particular cards stack the shoe through window.BJGame.state before dealing. */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const BJ = require(path.join(__dirname, '..', 'js', 'engine.js'));
const BASE = (process.env.BASE || 'http://localhost:8000').replace(/\/$/, '') + '/index.html';

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + String(e && e.message).split('\n').slice(0, 3).join(' | ')); }
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
  // From the lobby: pick a table (and change what `custom` changes) and sit down.
  async function seat(p, tableId, custom) {
    await p.waitForSelector('#setup.open');
    const group = (BJ.TABLES.find((t) => t.id === tableId) || {}).group;
    if (group) { await p.click(`[data-group="${group}"]`); await p.click(`[data-table="${tableId}"]`); }
    if (custom) { await p.click('#customize summary'); await custom(p); }
    await p.click('#sitBtn');
    await p.waitForFunction(() => !document.querySelector('#setup.open'));
    await idle(p);
  }
  // A plain table for stacked rounds: Atlantic City with a $10 minimum and no side bets.
  const plain = async (q) => { await q.selectOption('#r-minBet', '10'); await q.click('#r-sidePP'); };
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
  async function finishRound(p) {
    for (let k = 0; k < 12 && (await state(p)).phase !== 'done'; k++) {
      const s = await state(p);
      if (s.phase === 'insurance') await act(p, 'insNo'); else if (s.phase === 'player') await act(p, 'standBtn'); else await idle(p);
    }
    eq((await state(p)).phase, 'done', 'round over');
  }
  const bankText = (p) => p.textContent('#bank');

  console.log('The lobby, with animations');
  {
    const p = await open(390, 844, { touch: true, query: '?seed=3' });
    await test('the lobby opens first and cannot be dismissed', async () => {
      await p.waitForSelector('#setup.open');
      ok(!(await p.isVisible('#setup [data-close]')), 'no close button before a game exists');
      await p.keyboard.press('Escape');
      ok(await p.isVisible('#setup.open'), 'still open');
    });
    await test('casino floor and online tables, each with limits, rules and house edge', async () => {
      const floor = await p.$$eval('#tableList .tname', (e) => e.map((x) => x.textContent));
      ok(floor.includes('Las Vegas Strip') && floor.includes('Atlantic City') && floor.includes('European casino'), floor.join(', '));
      await p.click('[data-group="online"]');
      const online = await p.$$eval('#tableList .tname', (e) => e.map((x) => x.textContent));
      eq(online, BJ.TABLES.filter((t) => t.group === 'online').map((t) => t.name));
      await p.click('[data-table="live"]');
      ok(/Live dealer studio.*\$5 to \$2,500.*house edge 0\.68%/.test(await p.textContent('#lobbySum')), await p.textContent('#lobbySum'));
      ok(/No hole card/.test(await p.textContent('.tcard.on .ttags')), 'tags');
    });
    await test('buy-in, currency and table reach the table, with its felt', async () => {
      await p.click('[data-quick="500"]');
      await p.click('label:has(#r-currency-1)');
      await seat(p, 'downtown');
      eq(await bankText(p), '€500');
      const s = await state(p);
      eq([s.table.name, s.rules.decks, s.rules.hitSoft17, s.rules.minBet, s.shoe.length], ['Downtown double deck', 2, true, 10, 104]);
      ok(/Downtown double deck · €10 to €1K/.test(await p.textContent('#tableLabel')), await p.textContent('#tableLabel'));
      eq(await p.textContent('#print2'), 'Dealer must hit soft 17');
      eq(await p.getAttribute('body', 'data-felt'), 'green');
    });
    await test('chips fly to the bet circle and back', async () => {
      await bet(p, [25, 25]);
      eq(await bankText(p), '€450');
      eq(await p.textContent('#dealBtn'), 'Deal €50');
      ok((await p.$$('.seat .spot .stack .chip')).length === 2, 'two chips in the circle');
      await p.click('#clearBtn'); await idle(p);
      eq(await bankText(p), '€500');
      await bet(p, [10]);
    });
    await test('a whole animated round: Deal waits for flying chips, the round settles', async () => {
      await p.click('[data-d="10"]');
      await p.click('#dealBtn');
      await idle(p);
      eq((await state(p)).hands[0].bet, 2000, 'both chips bet');
      await finishRound(p);
      const s = await state(p);
      eq(await p.$$eval('#dealerHand .card', (e) => e.length), s.dealer.length, 'dealer cards drawn');
      ok(await p.isVisible('.result.show'), 'result badge');
      eq(await bankText(p), await p.evaluate((c) => window.BJGame.fmt(c), s.bankroll), 'bankroll display');
    });
    await test('deal again sweeps the cards to the tray and deals the same bet', async () => {
      const before = await state(p);
      await p.click('#againBtn');
      await idle(p);
      const s = await state(p);
      ok(s.discards >= before.dealer.length + before.hands[0].cards.length, 'cards in the tray');
      eq(s.hands[0].bet, 2000, 'same bet');
      await finishRound(p);
    });
    await test('leaving the table keeps the session and shows how it went', async () => {
      await p.click('#menuBtn');
      await p.click('#leaveBtn');
      await p.waitForSelector('#stats.open #chooseTableBtn');
      ok(/You left the table/.test(await p.textContent('#statsBody')), 'summary');
      ok(/Downtown double deck/.test(await p.textContent('#statsBody .sess-head')), 'table name');
      eq(await p.isVisible('[data-tab="session"]'), false, 'no live session');
      const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('blackjack.sessions.v1')));
      eq([saved.length, saved[0].stats.rounds, saved[0].table], [1, 2, 'Downtown double deck']);
      await p.click('#chooseTableBtn');
      await p.waitForSelector('#setup.open');
      ok(await p.isVisible('#lobbyStatsBtn'), 'Your sessions in the lobby');
    });
    await test('change a table’s rules, save them to My tables and remove them', async () => {
      await p.click('[data-group="floor"]');
      await p.click('[data-table="strip"]');
      await p.click('#customize summary');
      await p.click('label:has(#r-decks-0)');
      await p.click('#r-sidePP');
      ok(/rules changed below/.test(await p.textContent('.tcard.on')), 'marked as changed');
      ok(/with your rules/.test(await p.textContent('#lobbySum')), 'summary says so');
      await p.fill('#saveName', 'Strip single deck');
      await p.click('#saveTableBtn');
      eq(await p.getAttribute('[data-group="mine"]', 'aria-selected'), 'true');
      eq(await p.$$eval('#tableList .tname', (e) => e.map((x) => x.textContent)), ['Strip single deck']);
      ok(/1 deck · H17/.test(await p.textContent('.tcard.on .ttags')) && /Perfect Pairs/.test(await p.textContent('.tcard.on .ttags')), 'saved rules');
      const mine = await p.evaluate(() => JSON.parse(localStorage.getItem('blackjack.tables.v1')));
      eq([mine.length, mine[0].rules.decks, mine[0].rules.sidePP], [1, 1, true]);
      await p.click('.tdel'); await p.click('.tdel');
      ok(/No saved tables yet/.test(await p.textContent('#tableList')), 'removed');
    });
    await p.context().close();
  }

  console.log('Side bets and a table without a hole card');
  {
    const p = await open(390, 844, { touch: true, prefs: { speed: 'off' } });
    await seat(p, 'live');
    await test('side bet circles: tap one, then chips go on it', async () => {
      ok(await p.isVisible('.side[data-target="pp"]') && await p.isVisible('.side[data-target="t3"]'), 'two side circles');
      await bet(p, [25]);
      await p.click('.side[data-target="pp"]');
      ok(await p.isVisible('.side[data-target="pp"].sel'), 'selected');
      ok(/Chips go on Perfect Pairs/.test(await p.textContent('#msg')), await p.textContent('#msg'));
      await bet(p, [5]);
      await p.click('.side[data-target="t3"]');
      await bet(p, [5]);
      const s = await state(p);
      eq([s.bet, s.side], [2500, { pp: 500, t3: 500 }]);
      eq(await p.textContent('.side[data-target="pp"] .slbl'), 'Pairs $5');
      eq(await p.textContent('#dealBtn'), 'Deal $35');
    });
    await test('a perfect pair is paid 25 to 1 before the hand is played, and the dealer has one card', async () => {
      await stackShoe(p, ['8H', '7C', '8H', '10D', '2S']);
      await deal(p);
      const s = await state(p);
      eq([s.sides.pp.kind, s.sides.pp.paid, s.sides.t3.kind, s.phase, s.dealer.length], ['perfect', 13000, null, 'player', 1]);
      ok(/Perfect \+\$125/.test(await p.textContent('.side[data-target="pp"] .spop')), await p.textContent('.side[data-target="pp"] .spop'));
      eq(await p.$$eval('#dealerHand .card', (e) => e.length), 1, 'no hole card on the table');
      await act(p, 'standBtn'); // 16 against 7: the dealer draws the second card (a 10) only now, and stands on 17
      const d = await state(p);
      eq([d.phase, d.dealer.map((c) => c.rank), d.hands[0].result, d.last.net], ['done', ['7', '10'], 'lose', 13000 - 500 - 500 - 2500]);
    });
    await test('rebet brings the side bets back', async () => {
      await p.click('#changeBtn'); await idle(p);
      await p.click('#rebetBtn'); await idle(p);
      eq((await state(p)).side, { pp: 500, t3: 500 });
    });
    await test('the hand log lists every round with its side bets', async () => {
      await p.click('#statsBtn');
      await p.click('[data-tab="hands"]');
      const t = await p.textContent('#statsBody');
      ok(/Round 1/.test(t) && /Perfect pair/.test(t) && /21\+3/.test(t), t.slice(0, 200));
      await p.keyboard.press('Escape');
    });
    await p.context().close();
  }

  console.log('Rounds with stacked cards (no animations)');
  {
    const p = await open(390, 844, { touch: true, prefs: { speed: 'off' } });
    await seat(p, 'atlantic', plain);
    await test('split 8s, double the first hand, both hands settle', async () => {
      eq((await state(p)).table.name, 'Atlantic City (your rules)');
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
      eq([after.phase, after.hands[0].cards.map((c) => c.id), after.bankroll, after.session.id], [before.phase, before.hands[0].cards.map((c) => c.id), before.bankroll, before.session.id]);
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
    await seat(p, 'atlantic', plain);
    await test('the menu lists the house rules and changes the look at once', async () => {
      await p.click('#menuBtn');
      ok(/Stands on all 17s/.test(await p.textContent('#rulesList')), 'rules listed');
      ok(/About 0\.44%/.test(await p.textContent('#rulesList')), 'house edge');
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
      await finishRound(p);
    });
    await test('session statistics: money, play, dealer; a two-tap reset', async () => {
      await p.click('#statsBtn');
      const t = await p.textContent('#statsBody');
      ok(/Atlantic City/.test(t) && /Average bet/.test(t) && /Longest winning run/.test(t) && /Dealer busts/.test(t), 'sections');
      ok(await p.isVisible('.spark polyline'), 'bankroll line');
      await p.click('[data-tab="hands"]');
      eq(await p.$$eval('.hlog li', (e) => e.length), 2, 'two rounds in the log');
      await p.click('[data-tab="session"]');
      await p.click('#resetStatsBtn');
      eq(await p.textContent('#resetStatsBtn'), 'Tap again to reset');
      await p.click('#resetStatsBtn');
      eq((await state(p)).stats.rounds, 0);
      await p.keyboard.press('Escape');
    });
    await test('history and all-time totals across sessions and tables', async () => {
      await p.click('#changeBtn'); await idle(p);
      await bet(p, [10]); await deal(p); await finishRound(p);
      await p.click('#menuBtn'); await p.click('#leaveBtn');
      await p.waitForSelector('#chooseTableBtn');
      await p.click('#chooseTableBtn');
      await seat(p, 'downtown');
      await bet(p, [10, 10]); await deal(p); await finishRound(p);
      await p.click('#statsBtn');
      await p.click('[data-tab="sessions"]');
      const rows = await p.$$eval('.srow b', (e) => e.map((x) => x.textContent));
      eq(rows, ['Downtown double deck', 'Atlantic City (your rules)'], 'playing now, then the history');
      await p.click('.srow[data-rec]');
      ok(/Atlantic City/.test(await p.textContent('#statsBody .sess-head')), 'opens a past session');
      await p.click('#backBtn');
      await p.click('[data-tab="totals"]');
      const t = await p.textContent('#statsBody');
      ok(/Sessions/.test(t) && /By table/.test(t) && /Downtown double deck/.test(t) && /Atlantic City/.test(t), 'totals by table');
      eq(await p.$$eval('.ttab tbody tr', (e) => e.length), 2);
      await p.keyboard.press('Escape');
    });
    await p.context().close();
  }

  console.log('Out of chips, and an old save');
  {
    const p = await open(390, 844, { touch: true, prefs: { speed: 'off' } });
    await test('losing the last chips offers a rebuy', async () => {
      await p.fill('#r-bankroll', '10');
      await seat(p, 'downtown');
      await stackShoe(p, ['10S', '9H', '6C', '10D']);
      await bet(p, [10]); await deal(p);
      await act(p, 'standBtn');
      await p.click('#againBtn'); await idle(p);
      ok(await p.isVisible('#pBroke'), 'out of chips panel');
      await p.click('#rebuyBtn'); await idle(p);
      eq(await bankText(p), '$10');
      eq((await state(p)).stats.bought, 2000);
      ok(await p.isVisible('#pBet'), 'betting again');
    });
    await p.context().close();
    const old = BJ.newGame({ bankroll: 300 });
    delete old.side; delete old.lastSide; delete old.log; delete old.sides; delete old.stats.sides; delete old.rules.holeCard;
    const q = await open(390, 844, { touch: true, prefs: { speed: 'off' }, save: { s: old } });
    await test('a game saved by the first version opens at its table and plays on', async () => {
      await idle(q);
      eq(await bankText(q), '$300');
      eq(await q.textContent('#tableLabel'), 'Your table · $10 to $500');
      await bet(q, [10]); await deal(q); await finishRound(q);
    });
    await q.context().close();
  }

  console.log('Layout');
  for (const [w, h, name] of [[360, 640, 'small phone'], [390, 844, 'iPhone'], [430, 932, 'big phone'], [720, 900, 'beside a chat'], [1280, 800, 'laptop']]) {
    const p = await open(w, h, { touch: w < 700, prefs: { speed: 'off' } });
    await test(name + ': the lobby fits; four split hands and side bets fit; controls on screen', async () => {
      await p.waitForSelector('#setup.open');
      eq(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#setup .box').scrollWidth <= document.querySelector('#setup .box').clientWidth), true, 'lobby scrolls sideways');
      await seat(p, 'live');
      await p.click('.side[data-target="pp"]'); await bet(p, [5]); await p.click('.spot'); await bet(p, [10]);
      const fits = await p.evaluate(() => Array.from(document.querySelectorAll('.side:not([hidden]), .spot, .slbl')).every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
      ok(fits, 'side circles or their labels off screen');
      await p.evaluate(() => { const s = window.BJGame.state; s.rules.maxHands = 4; });
      await stackShoe(p, ['8S', '6H', '8C', '8H', '8D', '8C', '2S', '2H', '2D', '2C', '10H']);
      await deal(p);
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
