/* Blackjack engine tests (Node only):   node tests/unit.js
 * Stacked shoes check each rule and payout; seeded simulations check that money is never made or lost by
 * accident and that basic strategy plays at about the house edge the chart promises. */
'use strict';
const path = require('path');
const BJ = require(path.join(__dirname, '..', 'js', 'engine.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n      ') : e)); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

const C = (code) => ({ rank: code.slice(0, -1), suit: code.slice(-1) });
// A game whose shoe deals the given cards first (order: player, dealer up, player, dealer hole, then hits).
function stacked(codes, rules) {
  const s = BJ.newGame(Object.assign({ bankroll: 1000, minBet: 10, maxBet: 500 }, rules || {}));
  s.shoe = codes.slice().reverse();
  s.size = s.shoe.length; s.cut = s.size + 1;
  return s;
}
function play(s, bet) { ok(BJ.addBet(s, bet * 100), 'bet'); ok(BJ.deal(s), 'deal'); BJ.runAuto(s); return s; }
function finish(s) { BJ.runAuto(s); eq(s.phase, 'done', 'round over'); return s; }
const dollars = (s) => s.bankroll / 100;

console.log('Cards and the shoe');
test('hand values: soft and hard totals', () => {
  eq(BJ.handValue(['AS', 'KH'].map(C)), { total: 21, soft: true });
  eq(BJ.handValue(['AS', '6H'].map(C)), { total: 17, soft: true });
  eq(BJ.handValue(['AS', '6H', '9C'].map(C)), { total: 16, soft: false });
  eq(BJ.handValue(['AS', 'AH', '9C'].map(C)), { total: 21, soft: true });
  eq(BJ.handValue(['AS', 'AH', 'AC', 'AD'].map(C)), { total: 14, soft: true });
  eq(BJ.handValue(['KS', 'QH', '2C'].map(C)), { total: 22, soft: false });
  ok(BJ.isNatural(['AS', 'JD'].map(C)) && !BJ.isNatural(['7S', '7D', '7C'].map(C)), 'naturals');
});
test('a shoe holds every card of every deck once', () => {
  for (const d of BJ.DECKS) {
    const shoe = BJ.freshShoe(d);
    eq(shoe.length, 52 * d, d + ' decks');
    const counts = {};
    shoe.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    eq(Object.keys(counts).length, 52);
    ok(Object.values(counts).every((n) => n === d), 'each card ' + d + ' times');
  }
});
test('the Hi-Lo count of a whole deck is zero', () => {
  eq(BJ.freshShoe(1).reduce((a, c) => a + BJ.hiLo(c.slice(0, -1)), 0), 0);
});
test('the shoe is reshuffled once the cut card is reached', () => {
  BJ.setRng(BJ.seeded(7));
  const s = BJ.newGame({ decks: 1, penetration: 0.5, minBet: 1 });
  let shuffles = 0;
  for (let r = 0; r < 40; r++) {
    BJ.addBet(s, 100); BJ.deal(s);
    const before = s.size - s.shoe.length;
    let e; while ((e = BJ.step(s)) || s.phase === 'player' || s.phase === 'insurance') {
      if (e && e.kind === 'shuffle') { shuffles++; ok(before >= s.cut, 'shuffled before the cut card (' + before + ')'); }
      if (!e && s.phase === 'player') BJ.stand(s);
      if (!e && s.phase === 'insurance') BJ.insurance(s, false);
    }
    BJ.collect(s);
  }
  ok(shuffles >= 5, 'only ' + shuffles + ' shuffles in 40 rounds of a single deck');
  BJ.setRng(null);
});
test('rules are cleaned up: bad values fall back, limits stay in order', () => {
  const r = BJ.normalizeRules({ decks: 5, payout: '9:1', minBet: 50, maxBet: 10, penetration: 2, surrender: 'early' });
  eq([r.decks, r.payout, r.maxBet, r.penetration, r.surrender], [6, '3:2', 50, 0.9, 'none']);
  eq(BJ.checkRules({ bankroll: 100, minBet: 200, maxBet: 100 }).length, 2);
});

console.log('Betting');
test('chips go from the bankroll to the bet and back', () => {
  const s = BJ.newGame({ bankroll: 100, minBet: 10, maxBet: 50 });
  ok(BJ.addBet(s, 2500) && BJ.addBet(s, 2500), 'two 25s');
  ok(!BJ.addBet(s, 100), 'over the table maximum');
  eq([s.bet, s.bankroll], [5000, 5000]);
  BJ.clearBet(s);
  eq([s.bet, s.bankroll], [0, 10000]);
  ok(!BJ.addBet(s, 20000), 'more than the bankroll');
  BJ.addBet(s, 500);
  ok(!BJ.canDeal(s), 'under the minimum');
});
test('rebet and double rebet stay inside the limits and the bankroll', () => {
  const s = stacked(['10S', '9H', '8C', '7D'], { bankroll: 100, maxBet: 60 });
  play(s, 30); BJ.stand(s); finish(s); BJ.collect(s); // 18 vs 16 → dealer draws from an empty stack: reshuffle
  ok(BJ.rebet(s, 2), 'double rebet');
  eq(s.bet, 6000, 'capped at the table max');
});
test('out of chips, and a rebuy', () => {
  const s = stacked(['10S', '9H', '6C', '10D'], { bankroll: 10, minBet: 10 });
  play(s, 10); BJ.stand(s); finish(s); BJ.collect(s);
  ok(BJ.isBroke(s), 'broke');
  BJ.rebuy(s);
  eq([dollars(s), s.stats.rebuys], [10, 1]);
});

console.log('Payouts');
test('blackjack pays 3:2', () => {
  const s = play(stacked(['AS', '9H', 'KC', '7D']), 10);
  eq([s.phase, s.hands[0].result, s.last.net, dollars(s)], ['done', 'blackjack', 1500, 1015]);
});
test('blackjack pays 6:5 at a 6:5 table', () => {
  const s = play(stacked(['AS', '9H', 'KC', '7D'], { payout: '6:5' }), 10);
  eq([s.hands[0].result, s.last.net], ['blackjack', 1200]);
});
test('3:2 on an odd bet pays half chips', () => {
  const s = play(stacked(['AS', '9H', 'KC', '7D']), 15);
  eq(s.last.net, 2250);
});
test('a plain win pays 1:1, a push returns the bet, a loss takes it', () => {
  let s = play(stacked(['10S', '9H', '9C', '8D']), 20); BJ.stand(s); finish(s);
  eq([s.hands[0].result, s.last.net], ['win', 2000]);
  s = play(stacked(['10S', '9H', '8C', '9D']), 20); BJ.stand(s); finish(s);
  eq([s.hands[0].result, s.last.net], ['push', 0]);
  s = play(stacked(['10S', '9H', '7C', '9D']), 20); BJ.stand(s); finish(s);
  eq([s.hands[0].result, s.last.net], ['lose', -2000]);
});
test('a bust loses at once and the dealer does not draw', () => {
  const s = play(stacked(['10S', '6H', '6C', '10D', 'KH', '5S']), 10);
  BJ.hit(s); finish(s);
  eq([s.hands[0].result, s.dealer.length, s.last.net], ['bust', 2, -1000]);
});
test('the dealer busts', () => {
  const s = play(stacked(['10S', '6H', '7C', '10D', 'KH']), 10);
  BJ.stand(s); finish(s);
  eq([s.hands[0].result, s.dealer.length, s.last.dealer], ['win', 3, 26]);
});

console.log('Dealer rules');
test('stands on soft 17 (S17)', () => {
  const s = play(stacked(['10S', 'AH', '8C', '6D', '5C'], { insurance: false }), 10);
  BJ.stand(s); finish(s);
  eq([s.dealer.length, s.last.dealer, s.hands[0].result], [2, 17, 'win']);
});
test('hits soft 17 (H17)', () => {
  const s = play(stacked(['10S', 'AH', '8C', '6D', '3C'], { hitSoft17: true, insurance: false }), 10);
  BJ.stand(s); finish(s);
  eq([s.dealer.length, s.last.dealer, s.hands[0].result], [3, 20, 'lose']);
});
test('the dealer peeks: a blackjack under a ten ends the round before the player acts', () => {
  const s = play(stacked(['10S', 'KH', '9C', 'AD']), 10);
  eq([s.phase, s.dealerBJ, s.hands[0].result, s.last.net], ['done', true, 'lose', -1000]);
});
test('blackjack against a dealer blackjack is a push', () => {
  const s = play(stacked(['AS', 'KH', 'QC', 'AD']), 10);
  eq([s.hands[0].result, s.last.net], ['push', 0]);
});

console.log('Insurance and even money');
test('insurance is offered under an ace and pays 2:1 on a dealer blackjack', () => {
  const s = play(stacked(['10S', 'AH', '9C', 'KD']), 10);
  eq(s.phase, 'insurance');
  BJ.insurance(s, true); finish(s);
  eq([s.last.insurance, s.last.insurancePaid, s.last.net], [500, 1500, 0]);
});
test('insurance is lost when the dealer has no blackjack, and the hand plays on', () => {
  const s = play(stacked(['10S', 'AH', '9C', '7D']), 10);
  BJ.insurance(s, true); BJ.runAuto(s);
  eq(s.phase, 'player');
  BJ.stand(s); finish(s);
  eq([s.hands[0].result, s.last.net], ['win', 500]);
});
test('even money pays 1:1 whatever the dealer has, also at 6:5', () => {
  let s = play(stacked(['AS', 'AH', 'KC', 'KD']), 10);
  BJ.insurance(s, true); finish(s);
  eq([s.hands[0].result, s.last.net], ['even', 1000]);
  s = play(stacked(['AS', 'AH', 'KC', '6D'], { payout: '6:5' }), 10);
  BJ.insurance(s, true); finish(s);
  eq([s.hands[0].result, s.last.net], ['even', 1000]);
});
test('no insurance offer when the table does not have it', () => {
  const s = play(stacked(['10S', 'AH', '9C', '7D'], { insurance: false }), 10);
  eq(s.phase, 'player');
});

console.log('Double, split and surrender');
test('double: one card, twice the bet', () => {
  const s = play(stacked(['6S', '9H', '5C', '8D', 'KH', '10C']), 10);
  ok(BJ.canDouble(s), 'can double 11');
  BJ.double(s); finish(s);
  eq([s.hands[0].bet, s.hands[0].cards.length, s.hands[0].result, s.last.net], [2000, 3, 'win', 2000]);
});
test('double only on 9-11 or 10-11 when the table says so', () => {
  let s = play(stacked(['6S', '9H', '3C', '8D'], { doubleOn: '10-11' }), 10);
  ok(!BJ.canDouble(s), '9 at a 10-11 table');
  s = play(stacked(['6S', '9H', '4C', '8D'], { doubleOn: '10-11' }), 10);
  ok(BJ.canDouble(s), '10 at a 10-11 table');
  s = play(stacked(['AS', '9H', '7C', '8D'], { doubleOn: '9-11' }), 10);
  ok(!BJ.canDouble(s), 'soft 18 at a 9-11 table');
});
test('split 8s: two hands, each gets a second card, both settle', () => {
  const s = play(stacked(['8S', '6H', '8C', '10D', '3H', 'KS', '9C', '10H']), 10);
  ok(BJ.canSplit(s), 'can split');
  BJ.split(s); BJ.runAuto(s);
  eq([s.hands.length, s.hands[0].cards.length], [2, 2]);
  ok(BJ.canDouble(s), 'double after split on 11');
  BJ.double(s); BJ.runAuto(s); // 8+3+K = 21
  eq(s.active, 1);
  eq(s.hands[1].cards.length, 2);
  BJ.stand(s); finish(s); // 8+9 = 17 vs 16 + 10 = bust
  eq(s.hands.map((h) => h.result), ['win', 'win']);
  eq(s.last.net, 3000);
});
test('no double after split when DAS is off', () => {
  const s = play(stacked(['8S', '6H', '8C', '10D', '3H'], { das: false }), 10);
  BJ.split(s); BJ.runAuto(s);
  ok(!BJ.canDouble(s), 'no DAS');
});
test('splits stop at the table limit of hands', () => {
  const s = play(stacked(['8S', '6H', '8C', '10D', '8H', '8D', '8C'], { maxHands: 3 }), 10);
  BJ.split(s); BJ.runAuto(s);
  ok(BJ.canSplit(s), 'second split');
  BJ.split(s); BJ.runAuto(s);
  eq(s.hands.length, 3);
  ok(!BJ.canSplit(s), 'third split refused');
});
test('ten-value cards split by value (K and Q)', () => {
  const s = play(stacked(['KS', '6H', 'QC', '10D']), 10);
  ok(BJ.canSplit(s), 'K-Q is a pair');
});
test('split aces get one card each and stop', () => {
  const s = play(stacked(['AS', '6H', 'AC', '10D', '5H', '9S', 'KC']), 10);
  BJ.split(s); BJ.runAuto(s);
  eq([s.phase, s.hands[0].cards.length, s.hands[1].cards.length], ['done', 2, 2]);
  eq(s.hands.map((h) => h.result), ['win', 'win']); // 16 and 20; the dealer has 16, draws the K and busts
});
test('21 on split aces is not a blackjack', () => {
  const s = play(stacked(['AS', '6H', 'AC', '10D', 'KH', 'QS', '2C']), 10);
  BJ.split(s); finish(s);
  eq(s.hands.map((h) => h.result), ['win', 'win']);
  eq(s.last.net, 2000);
});
test('resplit and hit split aces when the table allows', () => {
  const s = play(stacked(['AS', '6H', 'AC', '10D', 'AH', '2S', '3C', '4D'], { resplitAces: true, hitSplitAces: true }), 10);
  BJ.split(s); BJ.runAuto(s);
  ok(BJ.canSplit(s), 'resplit aces');
  ok(BJ.canHit(s), 'hit split aces');
});
test('late surrender gives back half', () => {
  const s = play(stacked(['10S', '10H', '6C', '9D']), 10);
  ok(BJ.canSurrender(s), 'can surrender');
  BJ.surrender(s); finish(s);
  eq([s.hands[0].result, s.last.net, s.dealer.length], ['surrender', -500, 2]);
});
test('no surrender after a hit, after a split, or at a table without it', () => {
  let s = play(stacked(['10S', '10H', '2C', '9D', '2H']), 10);
  BJ.hit(s); ok(!BJ.canSurrender(s), 'after a hit');
  s = play(stacked(['10S', '10H', '6C', '9D'], { surrender: 'none' }), 10);
  ok(!BJ.canSurrender(s), 'no surrender table');
});
test('a round can be saved and restored mid-way', () => {
  const s = play(stacked(['8S', '6H', '8C', '10D', '3H', 'KS', '9C', '10H']), 10);
  BJ.split(s);
  const copy = JSON.parse(JSON.stringify(s));
  BJ.runAuto(copy); BJ.double(copy); BJ.runAuto(copy); BJ.stand(copy); finish(copy);
  eq(copy.last.net, 3000);
});

console.log('Basic strategy');
function adviceFor(player, up, rules) {
  const s = stacked([player[0], up, player[1], '7D', '2S', '2S'], Object.assign({ insurance: false }, rules || {}));
  play(s, 10);
  return (BJ.advise(s) || {}).move;
}
test('chart spot checks (6 decks, S17, DAS, late surrender)', () => {
  eq(adviceFor(['10S', '6H'], '10C'), 'R');
  eq(adviceFor(['10S', '6H'], '6C'), 'S');
  eq(adviceFor(['10S', '2H'], '3C'), 'H');
  eq(adviceFor(['6S', '5H'], '10C'), 'D');
  eq(adviceFor(['6S', '5H'], 'AC'), 'H');
  eq(adviceFor(['AS', '7H'], '9C'), 'H');
  eq(adviceFor(['AS', '7H'], '7C'), 'S');
  eq(adviceFor(['AS', '7H'], '4C'), 'D');
  eq(adviceFor(['AS', '7H'], '2C'), 'S');
  eq(adviceFor(['8S', '8H'], '10C'), 'P');
  eq(adviceFor(['9S', '9H'], '7C'), 'S');
  eq(adviceFor(['10S', 'KH'], '6C'), 'S');
  eq(adviceFor(['5S', '5H'], '9C'), 'D');
  eq(adviceFor(['4S', '4H'], '5C'), 'P');
  eq(adviceFor(['AS', 'AH'], 'AC'), 'P');
});
test('chart changes with the rules (H17, no DAS, no surrender)', () => {
  eq(adviceFor(['6S', '5H'], 'AC', { hitSoft17: true }), 'D');
  eq(adviceFor(['AS', '7H'], '2C', { hitSoft17: true }), 'D');
  eq(adviceFor(['4S', '4H'], '5C', { das: false }), 'H');
  eq(adviceFor(['10S', '6H'], '10C', { surrender: 'none' }), 'H');
  eq(adviceFor(['2S', '2H'], '2C', { das: false }), 'H');
});
test('decisions are graded against the chart', () => {
  const s = play(stacked(['10S', '6H', '6C', '10D', '5H']), 10);
  BJ.hit(s);
  eq([s.stats.decisions, s.stats.correct, s.advice.best], [1, 0, 'S']);
});

console.log('Simulations');
function simulate(rounds, rules, chooser, seed) {
  BJ.setRng(BJ.seeded(seed));
  const s = BJ.newGame(Object.assign({ bankroll: 1000000, minBet: 10, maxBet: 10000 }, rules));
  const start = s.bankroll;
  for (let r = 0; r < rounds; r++) {
    BJ.addBet(s, 1000); BJ.deal(s);
    for (let guard = 0; s.phase !== 'done'; guard++) {
      if (guard > 200) throw new Error('round never ends: ' + s.phase);
      if (BJ.step(s)) continue;
      if (s.phase === 'insurance') BJ.insurance(s, chooser === 'random' && Math.random() < 0.5);
      else if (s.phase === 'player') {
        const m = chooser === 'random' ? randomMove(s) : BJ.advise(s).move;
        const fn = { H: BJ.hit, S: BJ.stand, D: BJ.double, P: BJ.split, R: BJ.surrender }[m];
        ok(fn(s), 'move ' + m + ' refused');
      } else throw new Error('stuck in ' + s.phase);
    }
    const onTable = s.hands.reduce((a, h) => a + h.bet, 0);
    ok(onTable >= 1000, 'bets on the table');
    if (s.bankroll !== start + s.stats.net) throw new Error('money leak after round ' + r + ': ' + (s.bankroll - start) + ' vs ' + s.stats.net);
    BJ.collect(s);
  }
  BJ.setRng(null);
  return s;
}
function randomMove(s) {
  const moves = [];
  if (BJ.canHit(s)) moves.push('H');
  if (BJ.canStand(s)) moves.push('S');
  if (BJ.canDouble(s)) moves.push('D');
  if (BJ.canSplit(s)) moves.push('P', 'P', 'P');
  if (BJ.canSurrender(s)) moves.push('R');
  return moves[Math.floor(Math.random() * moves.length)];
}
test('random play with every rule on: rounds end and no money appears or vanishes', () => {
  for (const preset of BJ.PRESETS) {
    const s = simulate(3000, preset.rules, 'random', 11);
    ok(s.stats.splits > 50, preset.id + ': splits were played (' + s.stats.splits + ')');
    ok(s.stats.doubles > 50, preset.id + ': doubles were played');
  }
});
test('basic strategy loses about the estimated house edge (6 decks, S17, DAS, late surrender)', () => {
  const s = simulate(150000, BJ.PRESETS[0].rules, 'chart', 2026);
  const edge = -s.stats.net / (150000 * 1000);
  console.log('      house edge over 150,000 rounds: ' + (100 * edge).toFixed(2) + '%');
  ok(Math.abs(100 * edge - BJ.houseEdge(BJ.PRESETS[0].rules)) < 0.6, 'edge ' + (100 * edge).toFixed(2) + '% is far from the estimate ' + BJ.houseEdge(BJ.PRESETS[0].rules) + '%');
  eq(s.stats.correct, s.stats.decisions, 'the chart agrees with itself');
});
test('house edge estimates: 6:5 and H17 cost the player, surrender and more decks behave', () => {
  const base = BJ.PRESETS[0].rules, e = (x) => BJ.houseEdge(Object.assign({}, base, x));
  eq(BJ.houseEdge(base), 0.42);
  ok(e({ payout: '6:5' }) > e({}) + 1.3 && e({ hitSoft17: true }) > e({}), '6:5, H17');
  ok(e({ surrender: 'none' }) > e({}) && e({ decks: 1 }) < e({ decks: 8 }), 'surrender, decks');
});
test('a 6:5 table costs the player more than a 3:2 table (same cards)', () => {
  const a = simulate(40000, Object.assign({}, BJ.PRESETS[0].rules, { payout: '3:2' }), 'chart', 99);
  const b = simulate(40000, Object.assign({}, BJ.PRESETS[0].rules, { payout: '6:5' }), 'chart', 99);
  ok(b.stats.net < a.stats.net, '6:5 should lose more');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
