/* Engine tests, Node only:  node tests/unit.js
 * Every five-card hand is ranked and counted, equities are checked against known figures and against exact
 * enumeration, ranges and charts are read back, thousands of hands are played out by the opponents checking that no
 * chip appears or disappears, and the drills are generated many times and checked against the evaluator. */
'use strict';
const path = require('path');
const PK = require(path.join(__dirname, '..', 'js', 'engine.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  const t0 = Date.now();
  try { fn(); passed++; console.log('  ok  ' + name + ' (' + (Date.now() - t0) + ' ms)'); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e)); }
}
function ok(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }
function near(a, b, tol, m) { if (Math.abs(a - b) > tol) throw new Error((m || 'not near') + ': ' + a + ' vs ' + b + ' (±' + tol + ')'); }
const C = PK.parseCards;
const ev = (s) => PK.evaluate(C(s));

test('every five-card hand: the textbook count of each category', () => {
  const counts = new Array(9).fill(0), h = [0, 0, 0, 0, 0];
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++)
    for (let d = c + 1; d < 52; d++) for (let e = d + 1; e < 52; e++) {
      h[0] = a; h[1] = b; h[2] = c; h[3] = d; h[4] = e;
      counts[PK.evaluate(h) >> 20]++;
    }
  eq(counts, [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
});

test('hand order: kickers, wheels, the best five of seven', () => {
  ok(ev('As 2d 3c 4h 5s') < ev('2s 3d 4c 5h 6s'), 'the wheel is the lowest straight');
  ok(ev('As Kd Qc Jh Ts') > ev('Ks Qd Jc Th 9s'));
  ok(ev('Ah Kh 9h 4h 2h') > ev('Kd Qd Jd 9d 7d'), 'ace-high flush beats king-high');
  ok(ev('Ah Ad Kc Ks 7h') > ev('Ah Ad Kc Ks 6h'), 'two pair: the kicker decides');
  ok(ev('Kh Kd Kc 2s 2h') > ev('Qh Qd Qc As Ah'), 'full house: the trips decide');
  ok(ev('As Ad Ac Ah 2d') > ev('Ks Kd Kc Kh Ad'));
  ok(ev('As 2s 3s 4s 5s') > ev('Ah Ad Ac As Kd'), 'a straight flush beats four of a kind');
  eq(ev('Ah Kh Qh Jh Th 9h 8h'), ev('Ah Kh Qh Jh Th'), 'seven cards: the royal flush');
  eq(PK.describe(ev('Ah Ad Kc Ks Kh 7d 2c')), 'Full house, kings full of aces');
  eq(PK.describe(ev('Ah Ad Ac Ks Kh Kd 2c')), 'Full house, aces full of kings', 'two trips make a full house');
  eq(PK.describe(ev('As Ad Kc Ks Qh Qd 2c')), 'Two pair, aces and kings', 'three pairs: the best two');
  eq(ev('As Ad Kc Ks Qh Qd 2c'), ev('As Ad Kc Ks Qh'), 'the third pair is the kicker');
  eq(PK.describe(ev('5s 4d 3c 2h As Kd')), 'Straight, five high');
  eq(PK.describe(ev('Ts 9s 8s 7s 6s')), 'Straight flush, ten high');
  eq(PK.describe(ev('Ts Js Qs Ks As')), 'Royal flush');
  eq(PK.describe(ev('7h 7d 7c 2s 9h')), 'Three of a kind, sevens');
  const b = PK.best5(C('Ah Kh Qh Jh 2c 2d Th'));
  eq(b.cards.map(PK.cardStr).sort(), ['Ah', 'Jh', 'Kh', 'Qh', 'Th']);
});

test('starting hands: 169 of them, 1326 combinations; ranges read back', () => {
  eq(PK.HANDS.length, 169);
  eq(PK.HANDS.reduce((a, h) => a + h.combos, 0), 1326);
  eq(PK.HANDS[1].name, 'AKs'); eq(PK.HANDS[13].name, 'AKo'); eq(PK.HANDS[14].name, 'KK');
  eq(PK.handClass(PK.parseCard('Kd'), PK.parseCard('Ad')), 'AKs');
  eq(PK.handClass(PK.parseCard('7c'), PK.parseCard('7d')), '77');
  eq(PK.combosOf('AKs').length, 4); eq(PK.combosOf('AKo').length, 12); eq(PK.combosOf('QQ').length, 6);
  eq(PK.comboCount(PK.parseRange('22+')), 78);
  eq([...PK.parseRange('A2s+')].length, 12);
  eq([...PK.parseRange('ATo+')].sort(), ['AJo', 'AKo', 'AQo', 'ATo']);
  eq([...PK.parseRange('A5s-A2s')].sort(), ['A2s', 'A3s', 'A4s', 'A5s']);
  eq([...PK.parseRange('77-99')].sort(), ['77', '88', '99']);
  eq(PK.comboCount(PK.parseRange('AK')), 16);
  eq([...PK.parseRange('KQo, T9s')].sort(), ['KQo', 'T9s']);
  let threw = false;
  try { PK.parseRange('A1s'); } catch (e) { threw = true; }
  ok(threw, 'a bad range is refused');
});

test('charts: sizes by seat, each seat wider than the one before, nothing in two columns', () => {
  const pct = (k) => PK.rangePct(PK.CHARTS[k].raise);
  const want = { UTG: [0.16, 0.2], HJ: [0.19, 0.23], CO: [0.25, 0.3], BTN: [0.41, 0.47], SB: [0.34, 0.4] };
  for (const p in want) { const x = pct('open.' + p); ok(x >= want[p][0] && x <= want[p][1], p + ' opens ' + x.toFixed(3)); }
  for (const [a, b] of [['UTG', 'HJ'], ['HJ', 'CO'], ['CO', 'BTN']]) {
    for (const h of PK.CHARTS['open.' + a].raise) ok(PK.CHARTS['open.' + b].raise.has(h), h + ' opened from ' + a + ' but not ' + b);
  }
  for (const k in PK.CHARTS) for (const h of PK.CHARTS[k].raise) ok(!PK.CHARTS[k].call.has(h), k + ': ' + h + ' is in both');
  ok(PK.CHARTS['open.UTG'].raise.has('AA') && !PK.CHARTS['open.UTG'].raise.has('72o'));
  eq(PK.chartAction('vsLate.BB', 'K5s'), 'call'); eq(PK.chartAction('vsLate.BB', 'AKo'), 'raise'); eq(PK.chartAction('vsEarly.SB', '76s'), 'fold');
  eq(PK.chartKey('BTN', { raises: 0, limpers: 0 }), 'open.BTN');
  eq(PK.chartKey('BB', { raises: 1, raiser: 'BTN' }), 'vsLate.BB');
  eq(PK.chartKey('SB', { raises: 1, raiser: 'CO' }), 'vsEarly.SB');
  eq(PK.chartKey('CO', { raises: 2, heroRaised: true, heroIP: true }), 'vs3bet.IP');
});

test('the playing order: AA first, the worst hands last, shares rise to 1', () => {
  for (const h of PK.HANDS) ok(PK.EQUITY[h.name] > 0.3 && PK.EQUITY[h.name] < 0.86, h.name + ' has an equity: ' + PK.EQUITY[h.name]);
  eq(Object.keys(PK.EQUITY).length, 169);
  for (let k = 1; k < 13; k++) ok(PK.EQUITY[PK.RANKS[k] + PK.RANKS[k]] > PK.EQUITY[PK.RANKS[k - 1] + PK.RANKS[k - 1]], 'a bigger pair does better');
  ok(PK.PCTILE['99'] < 0.1 && PK.PCTILE['22'] < 0.5, 'pairs sit high in the order');
  eq(PK.ORDER[0], 'AA');
  ok(PK.ORDER.indexOf('72o') > 160 && PK.ORDER.indexOf('32o') > 160);
  near(PK.PCTILE[PK.ORDER[168]], 1, 1e-9);
  ok(PK.EQUITY.AA > 0.84 && PK.EQUITY.AA < 0.86, 'AA against a random hand: ' + PK.EQUITY.AA);
  ok(PK.EQUITY['72o'] < 0.36);
  near(PK.rangePct(PK.topRange(0, 0.2)), 0.2, 0.02);
});

test('equity: known matchups before the flop', () => {
  const R = PK.rng(1);
  const e = (a, b) => PK.equity([{ hand: C(a) }, { hand: C(b) }], [], { samples: 120000, rng: R }).equity[0];
  near(e('Ah As', 'Kd Kc'), 0.819, 0.01, 'AA v KK');
  near(e('Ah Kd', 'Qs Qc'), 0.43, 0.01, 'AKo v QQ');
  near(e('Ah Kh', '2s 2c'), 0.50, 0.012, 'AKs v 22, a coin flip');
  near(e('Ah Kd', 'Ac Qs'), 0.735, 0.012, 'AK dominates AQ');
});

test('equity: exact enumeration on the flop agrees with Monte Carlo', () => {
  const players = [{ hand: C('Ah 9h') }, { hand: C('Kd Ks') }];
  const board = C('Th 4h 2c');
  const ex = PK.equity(players, board);
  eq(ex.samples, 990, 'every turn and river');
  const mc = PK.equity(players, board, { samples: 200000, rng: PK.rng(7), exact: false });
  near(ex.equity[0], mc.equity[0], 0.006);
  near(ex.equity[0], 1 - (33 * 32) / (45 * 44), 0.01, 'nine flush cards and three aces: twelve outs with two cards to come');
  const river = PK.equity([{ hand: C('As Kd') }, { hand: C('Ac Kh') }], C('2c 7d 9h Js 3s'));
  eq(river.tie, [1, 1], 'the board plays the same for both: a split');
  near(river.equity[0], 0.5, 1e-9);
  const three = PK.equity([{ hand: C('As Ad') }, { hand: C('Ks Kd') }, { hand: C('Qs Qd') }], [], { samples: 60000, rng: PK.rng(3) });
  near(three.equity.reduce((a, b) => a + b, 0), 1, 1e-9, 'the shares add up to the pot');
  ok(three.equity[0] > three.equity[1] && three.equity[1] > three.equity[2]);
});

test('outs: flush draw 9, open-ender 8, gutshot 4, both draws 15, a pocket pair 2', () => {
  eq(PK.countOuts(C('Ah 9h'), C('Th 4h 2c'), 4).length, 9);
  eq(PK.countOuts(C('9c 8d'), C('Ts 7h 2c'), 4).length, 8);
  eq(PK.countOuts(C('9c 8d'), C('Js 7h 2c'), 4).length, 4);
  eq(PK.countOuts(C('9h 8h'), C('Th 7h 2c'), 4).length, 15);
  eq(PK.countOuts(C('5c 5d'), C('Ks 9h 2c'), 3).length, 2);
  const c = PK.classify(C('9h 8h'), C('Th 7h 2c'));
  ok(c.draws.includes('flush draw') && c.draws.includes('open-ended straight draw'), c.draws.join());
  eq(PK.classify(C('Jc Td'), C('Ks Qh 2c')).draws, ['open-ended straight draw']);
  eq(PK.classify(C('Ac Kd'), C('Qs Jh 2c')).draws, ['gutshot']);
  eq(PK.classify(C('Ah Kd'), C('Ks 7h 2c')).made, 'top pair, good kicker');
  eq(PK.classify(C('Kh 5d'), C('Ks 7h 2c')).made, 'top pair, weak kicker');
  eq(PK.classify(C('Qh Qd'), C('Js 7h 2c')).made, 'an overpair (queens)');
  eq(PK.classify(C('7c 7d'), C('7s Kh 2c')).made, 'a set of sevens');
  eq(PK.classify(C('Ah 3h'), C('Kh 9h 2h')).made, 'the nut flush');
  ok(PK.quickStrength(C('7c 7d'), C('7s Kh 2c')) > PK.quickStrength(C('Ah Kd'), C('Ks 7h 2c')));
  ok(PK.quickStrength(C('Ah Kd'), C('Ks 7h 2c')) > PK.quickStrength(C('4c 3d'), C('Ks 7h 2c')));
});

// ---------- the table ----------
function chips(st) { return st.seats.reduce((a, s) => a + s.stack + s.total, 0); }
// Plays one hand with every seat (you included) chosen by `who`, checking the rules after every action.
function playHand(st, R, who) {
  PK.startHand(st, R);
  const before = st.seats.reduce((a, s) => a + s.startStack, 0);
  let n = 0;
  while (st.street !== 'done') {
    if (st.toAct === -1) { ok(PK.runOutStep(st), 'a run-out moves on'); continue; }
    const L = PK.legal(st);
    ok(L.toCall >= 0, 'nothing negative to call');
    if (L.raise) ok(L.raise.min <= L.raise.max && L.raise.min > st.currentBet, 'a raise is bigger than the bet');
    PK.act(st, who(st, R));
    ok(chips(st) === before, 'chips kept during the hand (' + chips(st) + ' v ' + before + ')');
    ok(st.seats.every((s) => s.stack >= 0), 'no stack below zero');
    ok(++n < 200, 'the hand ends');
  }
  const after = st.seats.reduce((a, s) => a + s.stack, 0);
  ok(after === before, 'no chip appears or disappears: ' + after + ' v ' + before);
  return st;
}
const randomPlayer = (st, R) => {
  const L = PK.legal(st), x = R();
  if (L.raise && x < 0.22) return { type: 'raise', to: x < 0.05 ? L.raise.max : L.raise.min + Math.floor(R() * (L.raise.max - L.raise.min) * 0.3) };
  if (x < 0.4 && !L.check) return { type: 'fold' };
  return { type: L.check ? 'check' : 'call' };
};

test('5,000 hands of random play: chips kept, side pots paid, every hand ends', () => {
  const R = PK.rng(42), st = PK.newTable({ rng: R });
  let sidePots = 0, splits = 0, showdowns = 0;
  for (let h = 0; h < 5000; h++) {
    if (st.seats[0].stack <= 0) st.seats[0].stack = 1000;
    if (h % 97 === 0) st.seats.forEach((s) => { s.stack = 30 + Math.floor(R() * 2000); }); // uneven stacks: all-ins for different amounts
    playHand(st, R, randomPlayer);
    if (st.result.pots.length > 1) sidePots++;
    if (st.result.pots.some((p) => p.winners.length > 1)) splits++;
    if (st.result.showdown) showdowns++;
  }
  ok(sidePots > 50, 'side pots happened: ' + sidePots);
  ok(splits > 10, 'split pots happened: ' + splits);
  ok(showdowns > 500, 'showdowns happened: ' + showdowns);
});

test('2,000 hands by the opponents, you included: chips kept, everyone plays', () => {
  const R = PK.rng(9), st = PK.newTable({ rng: R });
  const vpip = new Array(6).fill(0);
  for (let h = 0; h < 2000; h++) {
    if (st.seats[0].stack < 20) st.seats[0].stack = 1000;
    st.seats[0].style = 'reg';
    playHand(st, R, (s, r) => PK.botAction(s, r));
    st.seats.forEach((s, i) => { if (s.pre && s.pre !== 'check') vpip[i]++; });
  }
  ok(vpip.every((v) => v > 100 && v < 1700), 'every seat plays some hands and folds others: ' + vpip);
});

// A hand with chosen cards: holes[i] for seat i, then the board in order.
function stacked(holes, board, stacks, button) {
  const st = PK.newTable({ rng: PK.rng(5) });
  st.button = (button === undefined ? 5 : button) - 1; // startHand moves it on by one
  if (stacks) stacks.forEach((x, i) => { st.seats[i].stack = x; });
  PK.startHand(st, PK.rng(5));
  const used = new Set();
  holes.forEach((h, i) => { st.seats[i].hole = C(h); C(h).forEach((c) => used.add(c)); });
  const b = C(board); b.forEach((c) => used.add(c));
  const rest = PK.freshDeck().filter((c) => !used.has(c));
  // dealt from the end: burn, flop (3), burn, turn, burn, river
  const order = [rest[0], b[0], b[1], b[2], rest[1], b[3], rest[2], b[4]];
  st.deck = rest.slice(3).concat(order.reverse());
  return st;
}
const go = (st, type, to) => PK.act(st, { type, to });
function runOut(st) { for (let k = 0; k < 6 && st.street !== 'done'; k++) ok(PK.runOutStep(st), 'everyone is all-in: the board runs out'); eq(st.street, 'done'); }

test('side pots: three all-ins for different amounts, each pot to the best hand that is in it', () => {
  // seats 0..5; the button is seat 5, so seat 0 is the small blind and seat 1 the big blind; seat 2 acts first
  const st = stacked(['2c 2d', 'Kh Kd', 'Ah Ad', '7c 2h', '8c 3h', '9c 4h'], 'Qs Jd 2s 5c 8d', [1000, 300, 150, 1000, 1000, 1000]);
  eq(PK.seatPos(st, 0), 'SB'); eq(PK.seatPos(st, 2), 'UTG');
  go(st, 'raise', 150);   // UTG all-in for 150 with aces
  go(st, 'fold'); go(st, 'fold'); go(st, 'fold');
  go(st, 'raise', 1000);  // the small blind all-in for 1000 with deuces
  go(st, 'call');         // the big blind calls all-in for 300 with kings
  runOut(st);
  // main pot 150 x 3 = 450 to the set of deuces; side pot (300-150) x 2 = 300 to the deuces; 700 back to the small blind
  eq(st.seats[0].stack, 1000 + 300 + 150, 'the small blind wins both pots and gets its uncalled 700 back');
  eq(st.seats[2].stack, 0); eq(st.seats[1].stack, 0);
  eq(st.result.pots.map((p) => p.amount), [450, 300]);
});

test('side pots: the short stack wins the main pot, the side pot goes to the next best hand', () => {
  const st = stacked(['Kh Kd', '2c 2d', 'Ah Ad', '7c 2h', '8c 3h', '9c 4h'], 'Qs Jd 3s 5c 8d', [1000, 1000, 150, 1000, 1000, 1000]);
  go(st, 'raise', 150); go(st, 'fold'); go(st, 'fold'); go(st, 'fold');
  go(st, 'raise', 600); go(st, 'call');   // both blinds keep 400 behind and check it down
  for (const s of ['flop', 'turn', 'river']) { eq(st.street, s); go(st, 'check'); go(st, 'check'); }
  eq(st.seats[2].stack, 450, 'aces win the main pot: 150 from each of three');
  eq(st.seats[0].stack, 1000 - 600 + 900, 'kings win the side pot of 450 x 2');
  eq(st.seats[1].stack, 400);
});

test('split pot with an odd chip: it goes to the first winner after the button', () => {
  const st = stacked(['As Kd', 'Ac Kh', '7c 2h', '8c 3h', '9c 4h', 'Tc 5h'], '2c 7d 9h Js Qs', [1000, 1000, 1000, 1000, 1000, 1000]);
  go(st, 'fold'); go(st, 'fold'); go(st, 'fold'); go(st, 'fold'); // UTG to the button fold
  go(st, 'call');  // small blind completes: 10 each, 20 in the pot
  go(st, 'check');
  for (const s of ['flop', 'turn', 'river']) { eq(st.street, s); go(st, 'check'); go(st, 'check'); }
  eq(st.result.pots[0].winners.length, 2);
  eq(st.seats[0].stack + st.seats[1].stack, 2000);
  // 235 in the pot between the blinds: the small blind, first after the button, gets the odd chip
  const t = stacked(['As Kd', 'Ac Kh', 'Ad 2h', '8c 3h', '9c 4h', 'Tc 5h'], '2c 7d 9h Js Qs');
  go(t, 'raise', 25); go(t, 'fold'); go(t, 'fold'); go(t, 'fold'); go(t, 'call'); go(t, 'call');
  go(t, 'check'); go(t, 'check'); go(t, 'raise', 20); go(t, 'call'); go(t, 'call');
  go(t, 'raise', 50); go(t, 'call'); go(t, 'fold');
  go(t, 'check'); go(t, 'check');
  eq(t.result.pots, [{ amount: 235, winners: [0, 1], side: false }]);
  eq(t.seats[0].stack, 905 + 118);
  eq(t.seats[1].stack, 905 + 117);
});

test('betting rules: the minimum raise, the big blind option, an uncalled bet comes back', () => {
  const st = stacked(['7c 2h', '8c 3h', '9c 4h', 'Tc 5h', 'Jc 6h', 'Qc 7h'], '2c 7d 9h Js Qs');
  eq(PK.legal(st).toCall, 10);
  eq(PK.legal(st).raise.min, 20, 'a raise is at least one more big blind');
  go(st, 'raise', 35);  // UTG raises by 25
  eq(PK.legal(st).raise.min, 60, 'the next raise must add at least 25 more');
  go(st, 'fold'); go(st, 'fold'); go(st, 'fold'); go(st, 'fold'); go(st, 'fold');
  eq(st.street, 'done');
  eq(st.seats[2].stack, 1000 + 15, 'UTG wins the blinds; its raise above the big blind came back');
  const b = stacked(['7c 2h', '8c 3h', '9c 4h', 'Tc 5h', 'Jc 6h', 'Qc 7h'], '2c 7d 9h Js Qs');
  go(b, 'call'); go(b, 'fold'); go(b, 'fold'); go(b, 'fold'); go(b, 'call');
  eq(b.toAct, 1, 'everyone limped: the big blind still acts');
  ok(PK.legal(b).check && PK.legal(b).raise, 'the big blind may check or raise');
});

test('an all-in below a full raise does not reopen the betting', () => {
  const st = stacked(['7c 2h', '8c 3h', '9c 4h', 'Tc 5h', 'Jc 6h', 'Qc 7h'], '2c 7d 9h Js Qs', [1000, 1000, 1000, 1000, 1000, 45]);
  go(st, 'raise', 30);   // UTG raises to 30
  go(st, 'fold'); go(st, 'fold');
  go(st, 'raise', 45);   // the button is all-in for 45: 15 more, not a full raise of 20
  go(st, 'fold'); go(st, 'fold');
  eq(st.toAct, 2);
  const L = PK.legal(st);
  eq(L.toCall, 15);
  ok(!L.raise, 'UTG already acted: it may call or fold, not raise again');
});

test('the coach: the chart before the flop, the price after it, grades', () => {
  const st = stacked(['7c 2h', '8c 3h', '9c 4h', 'Tc 5h', 'Jc 6h', 'Ah Kd'], '2c 7d 9h Js Qs');
  go(st, 'fold'); go(st, 'fold'); go(st, 'fold'); // UTG, HJ, CO fold; the button holds AK
  const adv = PK.coachAdvice(st);
  eq(adv.pos, 'BTN'); eq(adv.action, 'raise'); eq(adv.preflop.key, 'open.BTN');
  eq(adv.raiseTo, 25);
  eq(PK.grade(adv, { type: 'raise', to: 25 }, PK.legal(st)).grade, 'good');
  eq(PK.grade(adv, { type: 'call' }, PK.legal(st)).grade, 'mistake', 'limping first in');
  eq(PK.grade(adv, { type: 'fold' }, PK.legal(st)).grade, 'mistake', 'folding a premium hand');
  // after the flop: checking is free, so folding is always a mistake
  const f = stacked(['7c 2h', 'Ah Kd', '9c 4h', 'Tc 5h', 'Jc 6h', 'Qc 7h'], 'Ks 7d 2h Js Qs');
  go(f, 'fold'); go(f, 'fold'); go(f, 'fold'); go(f, 'fold'); go(f, 'call'); go(f, 'check');
  eq(f.street, 'flop');
  go(f, 'check');
  const a2 = PK.coachAdvice(f, { rng: PK.rng(2) });
  ok(a2.equity > 0.75, 'top pair top kicker against a limped small blind: ' + a2.equity);
  eq(a2.action, 'bet');
  eq(PK.grade(a2, { type: 'fold' }, PK.legal(f)).grade, 'mistake');
});

test('drills: answers agree with the evaluator, the charts and the arithmetic', () => {
  const R = PK.rng(77);
  for (let k = 0; k < 300; k++) {
    const d = PK.drillShowdown(R);
    const a = PK.evaluate(d.a.concat(d.board)), b = PK.evaluate(d.b.concat(d.board));
    eq(d.answer, a > b ? 'a' : b > a ? 'b' : 'split');
  }
  for (let k = 0; k < 300; k++) {
    const d = PK.drillPreflop(R);
    eq(d.answer, PK.chartAction(d.key, d.hand));
    eq(PK.handClass(d.combo[0], d.combo[1]), d.hand);
  }
  const kinds = new Set();
  for (let k = 0; k < 120; k++) {
    const d = PK.drillOuts(R);
    eq(d.outs.length, d.count);
    ok(d.choices.includes(d.count) && d.choices.length === 4);
    kinds.add(d.count);
  }
  ok(kinds.size >= 6, 'every kind of draw comes up: ' + [...kinds]);
  for (let k = 0; k < 300; k++) {
    const d = PK.drillPotOdds(R);
    near(d.need, d.bet / (d.pot + 2 * d.bet), 1e-12);
    eq(d.answer, d.hit >= d.need ? 'call' : 'fold');
  }
  for (let k = 0; k < 40; k++) {
    const d = PK.drillNuts(R);
    const best = Math.max(...d.options.map((o) => o.score));
    eq(d.options[d.answer].score, best);
    for (const o of d.options) eq(PK.evaluate(o.hand.concat(d.board)), o.score);
  }
  for (let k = 0; k < 12; k++) {
    const d = PK.drillEquity(R);
    const b = PK.EQ_BUCKETS[d.answer];
    ok(d.equity >= b.lo && d.equity <= b.hi, 'equity in its bucket');
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
