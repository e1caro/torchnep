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
test('no hole card: no doubling 11 or splitting 8s against a ten', () => {
  eq(adviceFor(['6S', '5H'], '10C', { holeCard: 'enhc', surrender: 'none' }), 'H');
  eq(adviceFor(['8S', '8H'], '10C', { holeCard: 'enhc', surrender: 'none' }), 'H');
  eq(adviceFor(['8S', '8H'], '9C', { holeCard: 'enhc' }), 'P');
  eq(adviceFor(['6S', '5H'], '10C', { holeCard: 'obo' }), 'D');
});
test('decisions are graded against the chart', () => {
  const s = play(stacked(['10S', '6H', '6C', '10D', '5H']), 10);
  BJ.hit(s);
  eq([s.stats.decisions, s.stats.correct, s.advice.best], [1, 0, 'S']);
});

console.log('No hole card, Charlie, continuous shuffle');
test('no hole card: three cards are dealt, the dealer draws the second after the player', () => {
  const s = stacked(['10S', '9H', '8C', '7D', '2C'], { holeCard: 'enhc' });
  play(s, 10);
  eq([s.phase, s.dealer.length], ['player', 1]);
  BJ.stand(s); finish(s);
  eq([s.dealer.map((c) => c.rank), s.hands[0].result], [['9', '7', '2'], 'push']); // 18 against 9 + 7 + 2
});
test('European no hole card: a dealer blackjack takes the double too', () => {
  const s = stacked(['6S', 'AH', '5C', '3D', 'KH'], { holeCard: 'enhc', insurance: false });
  play(s, 10);
  BJ.double(s); finish(s);
  eq([s.dealerBJ, s.hands[0].result, s.last.net], [true, 'lose', -2000]);
});
test('original bets only: a dealer blackjack takes the first bet, doubles and split hands come back', () => {
  let s = stacked(['6S', 'AH', '5C', '3D', 'KH'], { holeCard: 'obo', insurance: false });
  play(s, 10); BJ.double(s); finish(s);
  eq([s.hands[0].result, s.last.net], ['lose', -1000]);
  s = stacked(['8S', 'KH', '8C', '9D', '2H', 'AS'], { holeCard: 'obo' });
  play(s, 10); BJ.split(s); BJ.runAuto(s); BJ.stand(s); BJ.runAuto(s); BJ.stand(s); finish(s);
  eq([s.dealerBJ, s.hands.map((h) => h.result), s.last.net], [true, ['lose', 'returned'], -1000]);
});
test('no hole card: blackjack against a dealer ace is settled after the second card', () => {
  const s = stacked(['AS', 'AH', 'KC', 'QD'], { holeCard: 'enhc', insurance: false });
  play(s, 10); finish(s);
  eq([s.hands[0].result, s.last.net], ['push', 0]);
});
test('no hole card: surrender is refused against an ace, allowed against a ten', () => {
  let s = stacked(['10S', 'AH', '6C', '9D'], { holeCard: 'enhc', insurance: false, surrender: 'late' });
  play(s, 10); ok(!BJ.canSurrender(s), 'not against an ace');
  s = stacked(['10S', 'KH', '6C', 'AD'], { holeCard: 'enhc', surrender: 'late' });
  play(s, 10); ok(BJ.canSurrender(s), 'against a ten'); BJ.surrender(s); finish(s);
  eq([s.dealer.length, s.last.net], [1, -500]); // nothing left to play for: the dealer does not draw
});
test('a six-card Charlie wins at once, even against a dealer 20', () => {
  const s = stacked(['2S', '10H', '2C', 'KD', '2H', 'AS', '3D', '2D'], { charlie: 6, insurance: false });
  play(s, 10);
  for (let i = 0; i < 4; i++) BJ.hit(s);
  finish(s);
  eq([s.hands[0].cards.length, s.hands[0].result, s.last.net, s.dealer.length, s.stats.charlies], [6, 'charlie', 1000, 2, 1]);
});
test('a continuous shuffle table shuffles before every hand', () => {
  BJ.setRng(BJ.seeded(4));
  const s = BJ.newGame({ continuous: true, minBet: 1 });
  for (let r = 0; r < 5; r++) {
    BJ.addBet(s, 100); BJ.deal(s);
    eq(BJ.step(s).kind, 'shuffle', 'round ' + r);
    BJ.runAuto(s);
    if (s.phase === 'insurance') { BJ.insurance(s, false); BJ.runAuto(s); }
    while (s.phase === 'player') { BJ.stand(s); BJ.runAuto(s); }
    BJ.collect(s);
  }
  eq(s.shuffles, 5);
  BJ.setRng(null);
});

console.log('Side bets');
const c = (x) => C(x);
test('Perfect Pairs: perfect, coloured and mixed pairs', () => {
  eq(BJ.perfectPairs(c('8H'), c('8H')).odds, 25);
  eq(BJ.perfectPairs(c('8H'), c('8D')).odds, 12);
  eq(BJ.perfectPairs(c('8H'), c('8S')).kind, 'mixed');
  eq(BJ.perfectPairs(c('KH'), c('QH')), null);
});
test('21+3: trips, straights (ace high or low), flushes', () => {
  const k = (a, b, d) => (BJ.twentyOnePlus3(c(a), c(b), c(d)) || {}).kind || null;
  eq([k('7H', '7H', '7H'), k('7H', '7S', '7D'), k('9C', '10C', 'JC'), k('AS', '2H', '3D'), k('QS', 'KH', 'AD'), k('KS', 'AH', '2D'), k('2H', '9H', 'KH'), k('2H', '9H', 'KS')],
    ['suitedTrips', 'trips', 'straightFlush', 'straight', 'straight', null, 'flush', null]);
});
test('side bet house edges match the published figures (8 decks: Pairs 4.10%, 21+3 3.70%)', () => {
  eq([BJ.ppEdge(8), BJ.t3Edge(8), BJ.ppEdge(6)], [4.1, 3.7, 6.11]);
});
test('side bets are paid as soon as the first cards are out, and count in the round', () => {
  const s = stacked(['8H', '9C', '8H', '10D'], { sidePP: true, side213: true });
  ok(BJ.addBet(s, 1000) && BJ.addBet(s, 500, 'pp') && BJ.addBet(s, 500, 't3'), 'bets');
  BJ.deal(s);
  let e; while ((e = BJ.step(s)) && e.kind !== 'side');
  eq([e.kind, s.sides.pp.kind, s.sides.pp.paid, s.sides.t3.kind, s.sides.t3.paid], ['side', 'perfect', 13000, null, 0]);
  eq(s.bankroll, 100000 - 2000 + 13000, 'paid at once');
  BJ.runAuto(s); BJ.stand(s); finish(s); // 16 vs 19: lose 10
  eq(s.last.net, 13000 - 500 - 1000 - 500);
  eq(s.bankroll, 100000 + s.stats.net);
  eq([s.stats.sides.pp.wins, s.stats.sides.t3.bets, s.log[0].pp.k], [1, 1, 'perfect']);
});
test('side bets: only where the table has them, up to the side bet maximum, and rebet brings them back', () => {
  const s = BJ.newGame({ sidePP: true, side213: false, sideMax: 25, minBet: 10, maxBet: 500 });
  ok(!BJ.canAdd(s, 500, 't3'), 'no 21+3 here');
  ok(BJ.addBet(s, 2500, 'pp') && !BJ.addBet(s, 100, 'pp'), 'side max');
  ok(!BJ.canDeal(s), 'a side bet alone is not a bet');
  BJ.addBet(s, 1000); BJ.deal(s); BJ.runAuto(s);
  while (s.phase !== 'done') { if (s.phase === 'insurance') BJ.insurance(s, false); else if (s.phase === 'player') BJ.stand(s); BJ.runAuto(s); }
  BJ.collect(s);
  ok(BJ.rebet(s, 2), 'rebet x2');
  eq([s.bet, s.side.pp], [2000, 2500], 'main doubled, side capped');
});

console.log('Session statistics');
test('streaks, low point, dealer busts and the hand log', () => {
  const s = stacked(['10S', '6H', '9C', '10D', 'KH', '10S', '9H', '10C', '10D', '10S', '7H', '6C', '10D'], { insurance: false });
  play(s, 10); BJ.stand(s); finish(s); BJ.collect(s); // 19 against 16 + K: the dealer busts
  play(s, 10); BJ.stand(s); finish(s); BJ.collect(s); // 20 against 19
  play(s, 10); BJ.stand(s); finish(s);                // 16 against 17
  const st = s.stats;
  eq([st.rounds, st.won, st.lost, st.dealerBusts, st.winStreak, st.loseStreak, st.streak], [3, 2, 1, 1, 2, 1, -1]);
  eq([s.log.length, s.log[0].d, s.log[0].h[0].c, s.log[2].net], [3, ['6H', '10D', 'KH'], ['10S', '9C'], -1000]);
  eq([st.peak, st.low], [102000, 100000]);
});
test('a rebuy counts as money brought to the table', () => {
  const s = stacked(['10S', '9H', '6C', '10D'], { bankroll: 10, minBet: 10 });
  play(s, 10); BJ.stand(s); finish(s); BJ.collect(s);
  BJ.rebuy(s);
  eq([s.stats.bought, s.stats.rebuys, s.stats.net], [2000, 1, -1000]);
});
test('a game saved by the first version loads and plays on', () => {
  const old = BJ.newGame({});
  delete old.side; delete old.lastSide; delete old.log; delete old.sides;
  delete old.stats.sides; delete old.stats.low; delete old.stats.bought; delete old.rules.holeCard;
  const s = BJ.upgrade(JSON.parse(JSON.stringify(old)));
  eq([s.rules.holeCard, s.side, s.log, s.stats.bought, s.stats.sides.pp.bets], ['peek', { pp: 0, t3: 0 }, [], 100000, 0]);
  play(s, 10);
  ok(['player', 'insurance', 'done'].includes(s.phase), s.phase);
});

console.log('Tables');
test('every table is well formed and its limits make sense', () => {
  const ids = new Set();
  for (const tb of BJ.TABLES) {
    ok(!ids.has(tb.id), 'duplicate ' + tb.id); ids.add(tb.id);
    ok(tb.name && tb.place && ['floor', 'online'].includes(tb.group) && ['green', 'blue', 'red'].includes(tb.felt), tb.id);
    const r = BJ.normalizeRules(Object.assign({ bankroll: 100000 }, tb.rules));
    Object.keys(tb.rules).forEach((k) => eq(r[k], tb.rules[k], tb.id + '.' + k + ' is a valid value'));
    ok(r.minBet < r.maxBet, tb.id + ' limits');
  }
});

console.log('Simulations');
const VEGAS = { decks: 6, payout: '3:2', hitSoft17: false, holeCard: 'peek', doubleOn: 'any', das: true, maxHands: 4, resplitAces: false,
  hitSplitAces: false, surrender: 'late', insurance: true, charlie: 0, penetration: 0.75, continuous: false };
function simulate(rounds, rules, chooser, seed) {
  BJ.setRng(BJ.seeded(seed));
  const s = BJ.newGame(Object.assign({}, rules, { bankroll: 1000000, minBet: 10, maxBet: 10000 }));
  const start = s.bankroll;
  for (let r = 0; r < rounds; r++) {
    BJ.addBet(s, 1000);
    if (chooser === 'random') { if (Math.random() < 0.5) BJ.addBet(s, 500, 'pp'); if (Math.random() < 0.5) BJ.addBet(s, 500, 't3'); }
    BJ.deal(s);
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
test('random play at every table, side bets included: rounds end and no money appears or vanishes', () => {
  for (const tb of BJ.TABLES) {
    const s = simulate(2500, tb.rules, 'random', 11);
    ok(s.stats.splits > 30, tb.id + ': splits were played (' + s.stats.splits + ')');
    ok(s.stats.doubles > 30 || tb.rules.doubleOn !== 'any', tb.id + ': doubles were played');
    if (tb.rules.sidePP) ok(s.stats.sides.pp.bets > 500, tb.id + ': Perfect Pairs played');
  }
});
test('the chart plays every table without asking for a move that is not allowed', () => {
  for (const tb of BJ.TABLES) simulate(3000, tb.rules, 'chart', 5);
});
test('basic strategy loses about the estimated house edge (6 decks, S17, DAS, late surrender)', () => {
  const s = simulate(150000, VEGAS, 'chart', 2026);
  const edge = -s.stats.net / (150000 * 1000);
  console.log('      house edge over 150,000 rounds: ' + (100 * edge).toFixed(2) + '%');
  ok(Math.abs(100 * edge - BJ.houseEdge(VEGAS)) < 0.6, 'edge ' + (100 * edge).toFixed(2) + '% is far from the estimate ' + BJ.houseEdge(VEGAS) + '%');
  eq(s.stats.correct, s.stats.decisions, 'the chart agrees with itself');
});
test('house edge estimates: 6:5, H17 and no hole card cost the player; surrender, Charlie and more decks behave', () => {
  const e = (x) => BJ.houseEdge(Object.assign({}, VEGAS, x));
  eq(BJ.houseEdge(VEGAS), 0.42);
  ok(e({ payout: '6:5' }) > e({}) + 1.3 && e({ hitSoft17: true }) > e({}) && e({ holeCard: 'enhc', surrender: 'none' }) > e({ surrender: 'none' }), '6:5, H17, ENHC');
  ok(e({ surrender: 'none' }) > e({}) && e({ decks: 1 }) < e({ decks: 8 }) && e({ charlie: 5 }) < e({ charlie: 6 }), 'surrender, decks, Charlie');
});
test('a 6:5 table costs the player more than a 3:2 table (same cards)', () => {
  const a = simulate(40000, Object.assign({}, VEGAS, { payout: '3:2' }), 'chart', 99);
  const b = simulate(40000, Object.assign({}, VEGAS, { payout: '6:5' }), 'chart', 99);
  ok(b.stats.net < a.stats.net, '6:5 should lose more');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
