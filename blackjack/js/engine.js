/* Blackjack engine: the house rules, the shoe and a round as a small state machine. No DOM, so the same file runs
 * in the page (window.BJ) and in Node for the tests (require('./engine.js')).
 *
 * The whole game is one plain JSON object (made by newGame), so it can be saved and restored mid-round.
 * Money is kept in cents. Player actions (bet, hit, stand...) change the state at once; everything the table does
 * by itself (dealing, side bets, the peek, the dealer's turn, paying) happens one visible step at a time through
 * step(), which says what happened, or returns null when the table is waiting for the player. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BJ = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUITS = ['S', 'H', 'D', 'C'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const PAYOUTS = { '3:2': [3, 2], '6:5': [6, 5], '1:1': [1, 1] };
  const DECKS = [1, 2, 4, 6, 8];

  const DEFAULT_RULES = {
    bankroll: 1000, currency: '$', decks: 6, minBet: 10, maxBet: 500, payout: '3:2', hitSoft17: false,
    holeCard: 'peek', doubleOn: 'any', das: true, maxHands: 4, resplitAces: false, hitSplitAces: false,
    surrender: 'late', insurance: true, charlie: 0, penetration: 0.75, continuous: false,
    sidePP: false, side213: false, sideMax: 100,
  };

  /* Tables in the style of real casinos, land-based and online. Each sets every rule except the bankroll and the
   * currency, which are the player's. holeCard: 'peek' (American: the dealer checks for blackjack under an ace or
   * a ten), 'enhc' (European: no hole card, a dealer blackjack takes every bet, doubles and splits included),
   * 'obo' (no hole card, but only the original bet is lost). */
  const R0 = { payout: '3:2', hitSoft17: false, holeCard: 'peek', doubleOn: 'any', das: true, maxHands: 4, resplitAces: false,
    hitSplitAces: false, surrender: 'none', insurance: true, charlie: 0, penetration: 0.75, continuous: false,
    sidePP: false, side213: false, sideMax: 100 };
  const T = (id, group, name, place, felt, rules) => ({ id: id, group: group, name: name, place: place, felt: felt, rules: Object.assign({}, R0, rules) });
  const TABLES = [
    T('strip', 'floor', 'Las Vegas Strip', 'Six-deck shoe, the usual Strip rules', 'green',
      { decks: 6, minBet: 25, maxBet: 5000, hitSoft17: true, surrender: 'late', side213: true }),
    T('salon', 'floor', 'High-limit salon', 'The private room: big bets, better rules', 'red',
      { decks: 6, minBet: 100, maxBet: 10000, resplitAces: true, surrender: 'late', penetration: 0.8, sideMax: 500 }),
    T('downtown', 'floor', 'Downtown double deck', 'Two decks dealt by hand, old Las Vegas', 'green',
      { decks: 2, minBet: 10, maxBet: 1000, hitSoft17: true, penetration: 0.65 }),
    T('single65', 'floor', 'Single deck 6:5', 'One deck, but a blackjack pays only 6 to 5', 'blue',
      { decks: 1, minBet: 5, maxBet: 200, payout: '6:5', hitSoft17: true, das: false, maxHands: 2, penetration: 0.55 }),
    T('shoe65', 'floor', 'Low-limit 6:5 shoe', 'Cheap minimums on a busy weekend floor', 'green',
      { decks: 6, minBet: 5, maxBet: 500, payout: '6:5', hitSoft17: true, sidePP: true, side213: true, sideMax: 50 }),
    T('atlantic', 'floor', 'Atlantic City', 'Eight-deck shoe on the boardwalk', 'blue',
      { decks: 8, minBet: 15, maxBet: 5000, surrender: 'late', sidePP: true }),
    T('reno', 'floor', 'Reno', 'Northern Nevada: double only on 10 or 11', 'green',
      { decks: 6, minBet: 10, maxBet: 1000, hitSoft17: true, doubleOn: '10-11', das: false }),
    T('europe', 'floor', 'European casino', 'No hole card, double on 9 to 11, split once', 'red',
      { decks: 6, minBet: 5, maxBet: 500, holeCard: 'enhc', doubleOn: '9-11', maxHands: 2 }),
    T('sevilla', 'floor', 'Sevilla', 'Andalusian casino rules: no hole card, double on any two cards', 'red',
      { decks: 6, minBet: 5, maxBet: 500, holeCard: 'enhc' }),
    T('online', 'online', 'Online classic', 'Software dealer, the shoe is shuffled every hand', 'green',
      { decks: 6, minBet: 1, maxBet: 500, maxHands: 2, continuous: true, sidePP: true }),
    T('live', 'online', 'Live dealer studio', 'Eight decks, no hole card, both side bets', 'blue',
      { decks: 8, minBet: 5, maxBet: 2500, holeCard: 'enhc', maxHands: 2, penetration: 0.5, sidePP: true, side213: true, sideMax: 500 }),
    T('charlie', 'online', 'Six-card Charlie', 'Six cards without busting win at once', 'blue',
      { decks: 6, minBet: 1, maxBet: 250, charlie: 6, surrender: 'late', continuous: true }),
    T('vip', 'online', 'Online VIP', 'High stakes with player-friendly rules', 'red',
      { decks: 8, minBet: 50, maxBet: 20000, resplitAces: true, surrender: 'late', continuous: true, side213: true, sideMax: 1000 }),
  ];
  const PP_PAYS = { perfect: 25, colored: 12, mixed: 6 };
  const T3_PAYS = { suitedTrips: 100, straightFlush: 40, trips: 30, straight: 10, flush: 5 };
  const SIDE_NAMES = { perfect: 'Perfect pair', colored: 'Coloured pair', mixed: 'Mixed pair', suitedTrips: 'Suited three of a kind',
    straightFlush: 'Straight flush', trips: 'Three of a kind', straight: 'Straight', flush: 'Flush' };

  /* ---------- random numbers (crypto in the page; the tests set a seeded one) ---------- */
  function cryptoRandom() {
    const c = typeof crypto !== 'undefined' ? crypto : null;
    if (c && c.getRandomValues) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }
  let rng = cryptoRandom;
  function setRng(fn) { rng = fn || cryptoRandom; }
  function seeded(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- rules ---------- */
  function pick(v, allowed, dflt) { return allowed.indexOf(v) >= 0 ? v : dflt; }
  function num(v, lo, hi, dflt) { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; }
  function normalizeRules(r) {
    r = Object.assign({}, DEFAULT_RULES, r || {});
    const out = {
      bankroll: Math.round(num(r.bankroll, 1, 10000000, 1000)),
      currency: pick(r.currency, ['$', '€', '£'], '$'),
      decks: pick(Number(r.decks), DECKS, 6),
      minBet: Math.round(num(r.minBet, 1, 100000, 10)),
      maxBet: Math.round(num(r.maxBet, 1, 1000000, 500)),
      payout: PAYOUTS[r.payout] ? r.payout : '3:2',
      hitSoft17: !!r.hitSoft17,
      holeCard: pick(r.holeCard, ['peek', 'enhc', 'obo'], 'peek'),
      doubleOn: pick(r.doubleOn, ['any', '9-11', '10-11', 'none'], 'any'),
      das: !!r.das,
      maxHands: pick(Number(r.maxHands), [1, 2, 3, 4], 4),
      resplitAces: !!r.resplitAces,
      hitSplitAces: !!r.hitSplitAces,
      surrender: pick(r.surrender, ['none', 'late'], 'none'),
      insurance: !!r.insurance,
      charlie: pick(Number(r.charlie), [0, 5, 6, 7], 0),
      penetration: num(r.penetration, 0.5, 0.9, 0.75),
      continuous: !!r.continuous,
      sidePP: !!r.sidePP,
      side213: !!r.side213,
      sideMax: Math.round(num(r.sideMax, 1, 100000, 100)),
    };
    if (out.maxBet < out.minBet) out.maxBet = out.minBet;
    return out;
  }
  // Problems with a set of rules the player typed, as sentences (empty when fine).
  function checkRules(r) {
    const out = [];
    if (!(r.bankroll >= 1)) out.push('The buy-in must be at least 1.');
    if (r.maxBet < r.minBet) out.push('The maximum bet must be at least the minimum bet.');
    if (r.minBet > r.bankroll) out.push('The minimum bet at this table is more than your buy-in.');
    return out;
  }

  /* ---------- cards ---------- */
  function cardValue(rank) { return rank === 'A' ? 1 : (rank === 'J' || rank === 'Q' || rank === 'K') ? 10 : Number(rank); }
  function hiLo(rank) { const v = cardValue(rank); return v >= 2 && v <= 6 ? 1 : (v === 1 || v === 10) ? -1 : 0; }
  // Total of a hand, counting one ace as 11 when that does not bust it ("soft").
  function handValue(cards) {
    let total = 0, ace = false;
    for (const c of cards) { total += cardValue(c.rank); if (c.rank === 'A') ace = true; }
    const soft = ace && total + 10 <= 21;
    return { total: soft ? total + 10 : total, soft: soft };
  }
  function isNatural(cards) { return cards.length === 2 && handValue(cards).total === 21; }
  function upValue(card) { const v = cardValue(card.rank); return v === 1 ? 11 : v; }
  const code = (c) => c.rank + c.suit;
  const isRed = (c) => c.suit === 'H' || c.suit === 'D';

  function freshShoe(decks, exclude) {
    const cards = [];
    for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) cards.push(r + s);
    for (const c of exclude || []) { const i = cards.indexOf(c.rank + c.suit); if (i >= 0) cards.splice(i, 1); }
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
    return cards;
  }
  function tableCards(s) { return s.dealer.concat(...s.hands.map((h) => h.cards)); }
  function shuffleShoe(s, exclude) {
    s.shoe = freshShoe(s.rules.decks, exclude);
    s.size = s.shoe.length;
    s.cut = Math.round(s.size * s.rules.penetration);
    s.discards = 0;
    s.count = 0;
    s.shuffles++;
  }
  function draw(s, faceUp) {
    if (!s.shoe.length) { shuffleShoe(s, tableCards(s)); s.midShuffle = true; } // a long round emptied the shoe
    const c0 = s.shoe.pop();
    const c = { id: s.nextId++, rank: c0.slice(0, -1), suit: c0.slice(-1), down: !faceUp };
    if (faceUp) s.count += hiLo(c.rank);
    return c;
  }
  function decksLeft(s) { return Math.max(0.25, s.shoe.length / 52); }
  function trueCount(s) { return s.count / decksLeft(s); }

  /* ---------- side bets ---------- */
  // Perfect Pairs, on the player's first two cards: 25, 12 or 6 to 1.
  function perfectPairs(a, b) {
    if (a.rank !== b.rank) return null;
    const kind = a.suit === b.suit ? 'perfect' : isRed(a) === isRed(b) ? 'colored' : 'mixed';
    return { kind: kind, odds: PP_PAYS[kind], name: SIDE_NAMES[kind] };
  }
  // 21+3, the player's two cards and the dealer's up card as a three-card poker hand. Aces are high or low.
  const ORDER = { A: 1, J: 11, Q: 12, K: 13 };
  function twentyOnePlus3(a, b, c) {
    const v = [a, b, c].map((x) => ORDER[x.rank] || Number(x.rank)).sort((x, y) => x - y);
    const flush = a.suit === b.suit && b.suit === c.suit;
    const trips = a.rank === b.rank && b.rank === c.rank;
    const straight = (v[1] === v[0] + 1 && v[2] === v[1] + 1) || (v[0] === 1 && v[1] === 12 && v[2] === 13);
    const kind = trips && flush ? 'suitedTrips' : straight && flush ? 'straightFlush' : trips ? 'trips' : straight ? 'straight' : flush ? 'flush' : null;
    return kind ? { kind: kind, odds: T3_PAYS[kind], name: SIDE_NAMES[kind] } : null;
  }
  // Exact house edge (percent) of each side bet for a shoe of this many decks.
  function ppEdge(decks) {
    const N = 52 * decks, perfect = decks - 1, colored = decks, mixed = 2 * decks;
    const ev = (25 * perfect + 12 * colored + 6 * mixed - (N - 1 - perfect - colored - mixed)) / (N - 1);
    return Math.round(-10000 * ev) / 100;
  }
  const t3Cache = {};
  function t3Edge(decks) {
    if (t3Cache[decks] != null) return t3Cache[decks];
    const types = [];
    for (const s of SUITS) for (const r of RANKS) types.push({ rank: r, suit: s });
    let ev = 0, total = 0;
    for (let i = 0; i < 52; i++) for (let j = 0; j < 52; j++) for (let k = 0; k < 52; k++) {
      const w = decks * (decks - (j === i ? 1 : 0)) * (decks - (k === i ? 1 : 0) - (k === j ? 1 : 0));
      if (w <= 0) continue;
      const r = twentyOnePlus3(types[i], types[j], types[k]);
      ev += w * (r ? r.odds : -1); total += w;
    }
    return (t3Cache[decks] = Math.round(-10000 * ev / total) / 100);
  }

  /* ---------- a game ---------- */
  function newSideStats() { return { bets: 0, wagered: 0, wins: 0, paid: 0 }; }
  function newStats(bankroll) {
    return { rounds: 0, hands: 0, won: 0, lost: 0, pushed: 0, blackjacks: 0, busts: 0, surrenders: 0, doubles: 0,
      doublesWon: 0, splits: 0, charlies: 0, wagered: 0, net: 0, best: 0, worst: 0, peak: bankroll, low: bankroll,
      decisions: 0, correct: 0, insurance: 0, insuranceWon: 0, rebuys: 0, start: bankroll, bought: bankroll,
      dealerBusts: 0, dealerBJs: 0, streak: 0, winStreak: 0, loseStreak: 0, biggestBet: 0,
      sides: { pp: newSideStats(), t3: newSideStats() } };
  }
  function newGame(rules) {
    const R = normalizeRules(rules);
    const s = {
      v: 1, rules: R, bankroll: R.bankroll * 100, bet: 0, side: { pp: 0, t3: 0 }, lastBet: 0, lastSide: { pp: 0, t3: 0 },
      phase: 'betting', shoe: [], size: 0, cut: 0, discards: 0, count: 0, shuffles: 0, midShuffle: false,
      dealer: [], hands: [], active: -1, insurance: 0, dealerBJ: false, dealt: 0, needShuffle: false, sides: null,
      nextId: 1, stats: newStats(R.bankroll * 100), history: [R.bankroll * 100], log: [], last: null, advice: null,
    };
    shuffleShoe(s);
    s.shuffles = 0;
    return s;
  }
  // Brings a game saved by an older version up to date (missing fields get their defaults).
  function upgrade(s) {
    s.rules = normalizeRules(s.rules);
    if (!s.side) s.side = { pp: 0, t3: 0 };
    if (!s.lastSide) s.lastSide = { pp: 0, t3: 0 };
    if (!Array.isArray(s.log)) s.log = [];
    if (s.sides === undefined) s.sides = null;
    const st = newStats(s.stats ? s.stats.start : s.bankroll);
    st.low = Math.min(st.low, s.bankroll);
    s.stats = Object.assign(st, s.stats || {});
    s.stats.sides = Object.assign({ pp: newSideStats(), t3: newSideStats() }, s.stats.sides || {});
    if (s.stats.bought == null || s.stats.bought < s.stats.start) s.stats.bought = s.stats.start + (s.stats.rebuys || 0) * s.rules.bankroll * 100;
    s.hands.forEach((h, i) => { if (h.base == null) { h.base = h.doubled ? h.bet / 2 : h.bet; h.orig = i === 0; } });
    return s;
  }
  function newHand(bet) {
    return { cards: [], bet: bet, base: bet, orig: false, doubled: false, done: false, bust: false, surrendered: false,
      split: false, aces: false, bj: false, evenMoney: false, charlie: false, result: null, paid: 0 };
  }

  /* ---------- betting: the main bet, and the side bets when the table has them ---------- */
  function sideOn(s, t) { return t === 'pp' ? s.rules.sidePP : t === 't3' ? s.rules.side213 : t === 'main'; }
  function betOn(s, t) { return t === 'main' ? s.bet : s.side[t]; }
  function betTotal(s) { return s.bet + s.side.pp + s.side.t3; }
  function sideCap(s) { return Math.min(s.rules.sideMax, s.rules.maxBet) * 100; }
  function canAdd(s, amount, target) {
    target = target || 'main';
    if (s.phase !== 'betting' || !(amount > 0) || amount > s.bankroll || !sideOn(s, target)) return false;
    return betOn(s, target) + amount <= (target === 'main' ? s.rules.maxBet * 100 : sideCap(s));
  }
  function addBet(s, amount, target) {
    target = target || 'main';
    if (!canAdd(s, amount, target)) return false;
    if (target === 'main') s.bet += amount; else s.side[target] += amount;
    s.bankroll -= amount;
    return true;
  }
  function clearBet(s) {
    if (s.phase !== 'betting') return false;
    s.bankroll += betTotal(s);
    s.bet = 0; s.side = { pp: 0, t3: 0 };
    return true;
  }
  // The last bets again (times mult), as much of them as the table limits and the bankroll allow.
  function rebetPlan(s, mult) {
    const m = mult || 1;
    let room = Math.floor((s.bankroll + betTotal(s)) / 100) * 100;
    const main = Math.min(s.lastBet * m, s.rules.maxBet * 100, room); room -= main;
    const pp = s.rules.sidePP ? Math.min(s.lastSide.pp * m, sideCap(s), room) : 0; room -= pp;
    const t3 = s.rules.side213 ? Math.min(s.lastSide.t3 * m, sideCap(s), room) : 0;
    return { main: main, pp: pp, t3: t3, total: main + pp + t3 };
  }
  function rebetAmount(s, mult) { return rebetPlan(s, mult).total; }
  function rebet(s, mult) {
    if (s.phase !== 'betting' || !s.lastBet) return false;
    const p = rebetPlan(s, mult);
    if (p.main < s.rules.minBet * 100) return false;
    clearBet(s);
    addBet(s, p.main, 'main');
    if (p.pp) addBet(s, p.pp, 'pp');
    if (p.t3) addBet(s, p.t3, 't3');
    return true;
  }
  function canDeal(s) { return s.phase === 'betting' && s.bet >= s.rules.minBet * 100 && s.bet <= s.rules.maxBet * 100; }
  function deal(s) {
    if (!canDeal(s)) return false;
    s.lastBet = s.bet;
    s.lastSide = { pp: s.side.pp, t3: s.side.t3 };
    const h = newHand(s.bet);
    h.orig = true;
    s.hands = [h];
    const sb = (t) => (s.side[t] ? { bet: s.side[t], kind: null, name: null, odds: 0, paid: 0 } : null);
    s.sides = s.side.pp || s.side.t3 ? { pp: sb('pp'), t3: sb('t3'), done: false, paid: 0 } : null;
    s.bet = 0; s.side = { pp: 0, t3: 0 };
    s.dealer = []; s.active = 0; s.insurance = 0; s.dealerBJ = false; s.dealt = 0; s.last = null; s.advice = null;
    s.midShuffle = false;
    s.needShuffle = s.rules.continuous || s.size - s.shoe.length >= s.cut; // every hand, or the cut card came out
    s.phase = 'deal';
    return true;
  }
  function isBroke(s) { return s.phase === 'betting' && s.bankroll + betTotal(s) < s.rules.minBet * 100; }
  function rebuy(s) {
    if (s.phase !== 'betting') return false;
    s.bankroll += s.rules.bankroll * 100;
    s.stats.rebuys++;
    s.stats.bought += s.rules.bankroll * 100;
    return true;
  }

  /* ---------- what the player may do ---------- */
  function activeHand(s) { return s.phase === 'player' ? s.hands[s.active] || null : null; }
  function ready(s, h) { return !!h && !h.done && h.cards.length >= 2; }
  function canHit(s) { const h = activeHand(s); return ready(s, h) && !(h.aces && !s.rules.hitSplitAces); }
  function canStand(s) { return ready(s, activeHand(s)); }
  function canDouble(s) {
    const h = activeHand(s), R = s.rules;
    if (!ready(s, h) || h.cards.length !== 2 || s.bankroll < h.bet || R.doubleOn === 'none') return false;
    if (h.split && !R.das) return false;
    if (h.aces && !R.hitSplitAces) return false;
    const v = handValue(h.cards);
    if (R.doubleOn === '9-11') return !v.soft && v.total >= 9 && v.total <= 11;
    if (R.doubleOn === '10-11') return !v.soft && v.total >= 10 && v.total <= 11;
    return true;
  }
  function canSplit(s) {
    const h = activeHand(s), R = s.rules;
    if (!ready(s, h) || h.cards.length !== 2 || s.hands.length >= R.maxHands || s.bankroll < h.bet) return false;
    const a = h.cards[0], b = h.cards[1];
    if (cardValue(a.rank) !== cardValue(b.rank)) return false;
    if (h.aces && !R.resplitAces) return false;
    return true;
  }
  // Late surrender, after the peek. Without a hole card it is allowed against anything but an ace.
  function canSurrender(s) {
    const h = activeHand(s);
    if (s.rules.surrender !== 'late' || !ready(s, h) || s.hands.length !== 1 || h.cards.length !== 2 || h.split) return false;
    return s.rules.holeCard === 'peek' || s.dealer[0].rank !== 'A';
  }
  function insuranceCost(s) { return s.hands[0] ? Math.round(s.hands[0].base / 2) : 0; }
  function canInsure(s) {
    if (s.phase !== 'insurance') return false;
    return s.hands[0].bj || s.bankroll >= insuranceCost(s);
  }

  /* ---------- basic strategy (the usual chart for these rules) ---------- */
  // { move: 'H' | 'S' | 'D' | 'P' | 'R', why: 'Hard 16 vs 10' } for the active hand, using only moves allowed now.
  function advise(s) {
    const h = activeHand(s);
    if (!ready(s, h)) return null;
    const R = s.rules, up = upValue(s.dealer[0]), v = handValue(h.cards), h17 = R.hitSoft17;
    const enhc = R.holeCard === 'enhc' && up >= 10; // no hole card: doubles and splits against a ten or an ace can all be lost
    const can = { D: canDouble(s), P: canSplit(s), R: canSurrender(s), H: canHit(s) };
    const upName = up === 11 ? 'ace' : String(up);
    const pair = h.cards.length === 2 && cardValue(h.cards[0].rank) === cardValue(h.cards[1].rank);
    const pv = cardValue(h.cards[0].rank);
    const out = (move, why) => ({ move: move, why: why + ' vs ' + upName });
    if (!can.H) { // split aces that may not be hit
      if (can.P) return out('P', 'Pair of aces');
      return out('S', (v.soft ? 'Soft ' : 'Hard ') + v.total);
    }
    if (can.R && !v.soft) {
      const eights = pair && pv === 8;
      if ((v.total === 16 && !eights && up >= 9) || (v.total === 15 && (up === 10 || (h17 && up === 11))) ||
          (v.total === 17 && h17 && up === 11) || (eights && ((h17 && up === 11) || (enhc && up === 10)))) {
        return out('R', eights ? 'Pair of 8s' : 'Hard ' + v.total);
      }
    }
    if (can.P && pair) {
      const das = R.das;
      let split = false;
      if (pv === 1) split = !(enhc && up === 11);
      else if (pv === 8) split = !enhc;
      else if (pv === 9) split = up <= 9 && up !== 7;
      else if (pv === 7) split = up <= 7;
      else if (pv === 6) split = das ? up <= 6 : up >= 3 && up <= 6;
      else if (pv === 4) split = das && (up === 5 || up === 6);
      else if (pv === 2 || pv === 3) split = das ? up <= 7 : up >= 4 && up <= 7;
      if (split) return out('P', 'Pair of ' + (pv === 1 ? 'aces' : pv + 's'));
    }
    const t = v.total;
    const D = (why) => out(can.D ? 'D' : 'H', why), Ds = (why) => out(can.D ? 'D' : 'S', why);
    if (v.soft) {
      const why = 'Soft ' + t;
      if (t >= 20) return out('S', why);
      if (t === 19) return h17 && up === 6 ? Ds(why) : out('S', why);
      if (t === 18) {
        if (up <= 6 && (up >= 3 || h17)) return Ds(why);
        return up <= 8 ? out('S', why) : out('H', why);
      }
      if (t === 17) return up >= 3 && up <= 6 ? D(why) : out('H', why);
      if (t === 16 || t === 15) return up >= 4 && up <= 6 ? D(why) : out('H', why);
      if (t === 14 || t === 13) return up >= 5 && up <= 6 ? D(why) : out('H', why);
      return out('H', why);
    }
    const why = 'Hard ' + t;
    if (t >= 17) return out('S', why);
    if (t >= 13) return up <= 6 ? out('S', why) : out('H', why);
    if (t === 12) return up >= 4 && up <= 6 ? out('S', why) : out('H', why);
    if (t === 11) return !enhc && (up <= 10 || h17 || R.decks <= 2) ? D(why) : out('H', why);
    if (t === 10) return up <= 9 ? D(why) : out('H', why);
    if (t === 9) return up >= 3 && up <= 6 ? D(why) : out('H', why);
    return out('H', why);
  }
  function grade(s, move) {
    const a = advise(s);
    if (!a) return;
    s.stats.decisions++;
    if (a.move === move) s.stats.correct++;
    s.advice = { move: move, best: a.move, why: a.why };
  }

  /* ---------- player actions ---------- */
  // Moves on to the next hand that still needs playing, or to the dealer.
  function advance(s) {
    while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
    if (s.active >= s.hands.length) { s.active = -1; s.phase = 'dealer'; }
  }
  // A hand finishes by itself on a bust, on 21, on a Charlie, and (unless the rules allow more) after one card on a
  // split ace.
  function settleHandIfFinished(s, h) {
    const v = handValue(h.cards), R = s.rules;
    if (v.total > 21) { h.bust = true; h.done = true; return; }
    if (R.charlie && h.cards.length >= R.charlie) { h.charlie = true; h.done = true; return; }
    if (v.total === 21) h.done = true;
    else if (h.aces && !R.hitSplitAces && h.cards.length >= 2) {
      const pairAces = h.cards.length === 2 && h.cards[1].rank === 'A';
      if (!(pairAces && R.resplitAces && s.hands.length < R.maxHands)) h.done = true;
    }
  }
  function hit(s) {
    if (!canHit(s)) return null;
    grade(s, 'H');
    const h = activeHand(s), i = s.active, c = draw(s, true);
    h.cards.push(c);
    settleHandIfFinished(s, h);
    if (h.done) advance(s);
    return { kind: 'card', to: 'p', hand: i, card: c };
  }
  function stand(s) {
    if (!canStand(s)) return null;
    grade(s, 'S');
    activeHand(s).done = true;
    advance(s);
    return { kind: 'stand' };
  }
  function double(s) {
    if (!canDouble(s)) return null;
    grade(s, 'D');
    const h = activeHand(s), i = s.active;
    s.bankroll -= h.bet; h.bet *= 2; h.doubled = true; s.stats.doubles++;
    const c = draw(s, true);
    h.cards.push(c);
    settleHandIfFinished(s, h);
    h.done = true;
    advance(s);
    return { kind: 'card', to: 'p', hand: i, card: c, double: true };
  }
  function split(s) {
    if (!canSplit(s)) return null;
    grade(s, 'P');
    const h = activeHand(s), i = s.active;
    const nh = newHand(h.bet);
    nh.cards.push(h.cards.pop());
    s.bankroll -= h.bet;
    h.split = nh.split = true;
    h.aces = nh.aces = nh.cards[0].rank === 'A';
    s.hands.splice(i + 1, 0, nh);
    s.stats.splits++;
    return { kind: 'split', hand: i };
  }
  function surrender(s) {
    if (!canSurrender(s)) return null;
    grade(s, 'R');
    const h = activeHand(s);
    h.surrendered = true; h.done = true;
    advance(s);
    return { kind: 'surrender' };
  }
  function insurance(s, take) {
    if (s.phase !== 'insurance') return null;
    const h = s.hands[0];
    s.stats.decisions++;
    if (!take) s.stats.correct++; // the chart never takes insurance or even money
    s.advice = { move: take ? 'I' : 'N', best: 'N', why: h.bj ? 'Even money' : 'Insurance' };
    if (take && h.bj) h.evenMoney = true;
    else if (take && s.bankroll >= insuranceCost(s)) { s.insurance = insuranceCost(s); s.bankroll -= s.insurance; s.stats.insurance++; }
    s.phase = 'peek';
    return { kind: 'insurance', take: !!take };
  }

  function startPlayer(s) {
    s.phase = 'player'; s.active = 0;
    const h = s.hands[0];
    if (h.bj || h.evenMoney) h.done = true;
    advance(s);
  }
  const live = (h) => !h.bust && !h.surrendered && !h.bj && !h.evenMoney && !h.charlie;
  function dealerShouldDraw(s) {
    if (s.dealerBJ || !s.hands.some(live)) return false;
    const v = handValue(s.dealer);
    return v.total < 17 || (v.total === 17 && v.soft && s.rules.hitSoft17);
  }
  // Without a hole card the dealer takes a second card when anything on the table depends on it.
  function needsSecond(s) { return s.insurance > 0 || s.hands.some((h) => !h.bust && !h.surrendered && !h.evenMoney); }

  /* ---------- side bets are settled as soon as the first cards are out ---------- */
  function resolveSides(s) {
    const sd = s.sides, p = s.hands[0].cards, st = s.stats.sides;
    sd.paid = 0;
    [['pp', () => perfectPairs(p[0], p[1])], ['t3', () => twentyOnePlus3(p[0], p[1], s.dealer[0])]].forEach(([t, fn]) => {
      const b = sd[t];
      if (!b) return;
      const r = fn();
      b.kind = r ? r.kind : null; b.name = r ? r.name : null; b.odds = r ? r.odds : 0;
      b.paid = r ? b.bet * (r.odds + 1) : 0;
      sd.paid += b.paid;
      st[t].bets++; st[t].wagered += b.bet; st[t].paid += b.paid; if (r) st[t].wins++;
    });
    s.bankroll += sd.paid; // paid at once, as at a real table
    sd.done = true;
  }

  /* ---------- the table's own steps ---------- */
  function step(s) {
    switch (s.phase) {
      case 'deal': {
        if (s.needShuffle) { shuffleShoe(s); s.needShuffle = false; return { kind: 'shuffle' }; }
        const cards = s.rules.holeCard === 'peek' ? 4 : 3; // no hole card: the dealer's second card comes later
        if (s.dealt < cards) {
          const i = s.dealt++;
          if (i % 2 === 0) { const c = draw(s, true); s.hands[0].cards.push(c); return { kind: 'card', to: 'p', hand: 0, card: c }; }
          const c = draw(s, i !== 3); s.dealer.push(c); return { kind: 'card', to: 'd', card: c };
        }
        if (s.sides && !s.sides.done) { resolveSides(s); return { kind: 'side', paid: s.sides.paid }; }
        s.hands[0].bj = isNatural(s.hands[0].cards);
        if (s.rules.insurance && s.dealer[0].rank === 'A') { s.phase = 'insurance'; return { kind: 'offer', evenMoney: s.hands[0].bj }; }
        s.phase = 'peek';
        return { kind: 'quiet' };
      }
      case 'peek': {
        if (s.rules.holeCard === 'peek' && upValue(s.dealer[0]) >= 10) {
          if (isNatural(s.dealer)) { s.dealerBJ = true; s.phase = 'dealer'; return { kind: 'peek', bj: true }; }
          startPlayer(s);
          return { kind: 'peek', bj: false };
        }
        startPlayer(s);
        return { kind: 'quiet' };
      }
      case 'player': {
        const h = s.hands[s.active];
        if (h && h.cards.length < 2) { // the second card of a split hand
          const i = s.active, c = draw(s, true);
          h.cards.push(c);
          settleHandIfFinished(s, h);
          if (h.done) advance(s);
          return { kind: 'card', to: 'p', hand: i, card: c };
        }
        return null;
      }
      case 'dealer': {
        const hole = s.dealer[1];
        if (hole && hole.down) { hole.down = false; s.count += hiLo(hole.rank); return { kind: 'reveal', card: hole }; }
        if (s.dealer.length === 1) {
          if (needsSecond(s)) {
            const c = draw(s, true); s.dealer.push(c);
            if (isNatural(s.dealer)) s.dealerBJ = true;
            return { kind: 'card', to: 'd', card: c, second: true };
          }
          s.phase = 'settle';
          return { kind: 'quiet' };
        }
        if (dealerShouldDraw(s)) { const c = draw(s, true); s.dealer.push(c); return { kind: 'card', to: 'd', card: c }; }
        s.phase = 'settle';
        return { kind: 'quiet' };
      }
      case 'settle': return settle(s);
      default: return null;
    }
  }

  function settle(s) {
    const R = s.rules, st = s.stats, d = handValue(s.dealer), dbj = s.dealerBJ || isNatural(s.dealer);
    const [pn, pd] = PAYOUTS[R.payout];
    let paid = 0, staked = s.insurance;
    for (const h of s.hands) {
      const v = handValue(h.cards);
      staked += h.bet;
      if (h.evenMoney) { h.result = 'even'; h.paid = h.bet * 2; }
      else if (h.surrendered) { h.result = 'surrender'; h.paid = Math.round(h.bet / 2); }
      else if (h.bust) { h.result = 'bust'; h.paid = 0; }
      else if (h.bj) { h.result = dbj ? 'push' : 'blackjack'; h.paid = dbj ? h.bet : h.bet + Math.round(h.bet * pn / pd); }
      else if (dbj) {
        // with 'obo' a dealer blackjack takes the original bet only: doubles and split hands come back
        if (R.holeCard === 'obo' && !h.orig) { h.result = 'returned'; h.paid = h.bet; }
        else { h.result = 'lose'; h.paid = R.holeCard === 'obo' ? h.bet - h.base : 0; }
      }
      else if (h.charlie) { h.result = 'charlie'; h.paid = h.bet * 2; }
      else if (d.total > 21 || v.total > d.total) { h.result = 'win'; h.paid = h.bet * 2; }
      else if (v.total < d.total) { h.result = 'lose'; h.paid = 0; }
      else { h.result = 'push'; h.paid = h.bet; }
      paid += h.paid;
      st.hands++;
      if (h.paid > h.bet || h.result === 'even') st.won++;
      else if (h.result === 'push' || h.result === 'returned') st.pushed++;
      else st.lost++;
      if (h.result === 'blackjack' || h.evenMoney) st.blackjacks++;
      if (h.result === 'bust') st.busts++;
      if (h.result === 'surrender') st.surrenders++;
      if (h.result === 'charlie') st.charlies++;
      if (h.doubled && h.paid > h.bet) st.doublesWon++;
    }
    const insPaid = s.insurance && dbj ? s.insurance * 3 : 0;
    if (insPaid) st.insuranceWon++;
    paid += insPaid;
    s.bankroll += paid;
    const sidePaid = s.sides ? s.sides.paid : 0, sideStaked = s.sides ? (s.sides.pp ? s.sides.pp.bet : 0) + (s.sides.t3 ? s.sides.t3.bet : 0) : 0;
    staked += sideStaked;
    const net = paid + sidePaid - staked;
    st.rounds++; st.wagered += staked; st.net += net;
    st.best = Math.max(st.best, net); st.worst = Math.min(st.worst, net);
    st.biggestBet = Math.max(st.biggestBet, staked);
    st.peak = Math.max(st.peak, s.bankroll); st.low = Math.min(st.low, s.bankroll);
    if (d.total > 21) st.dealerBusts++;
    if (dbj) st.dealerBJs++;
    if (net > 0) st.streak = st.streak > 0 ? st.streak + 1 : 1;
    else if (net < 0) st.streak = st.streak < 0 ? st.streak - 1 : -1;
    st.winStreak = Math.max(st.winStreak, st.streak); st.loseStreak = Math.max(st.loseStreak, -st.streak);
    s.history.push(s.bankroll);
    if (s.history.length > 400) s.history.splice(0, s.history.length - 400);
    const sideLog = (b) => (b ? { b: b.bet, k: b.kind, p: b.paid } : null);
    s.log.push({ n: st.rounds, net: net, staked: staked, d: s.dealer.map(code), dt: d.total,
      h: s.hands.map((h) => ({ c: h.cards.map(code), t: handValue(h.cards).total, r: h.result, b: h.bet, p: h.paid })),
      ins: s.insurance, insP: insPaid, pp: s.sides ? sideLog(s.sides.pp) : null, t3: s.sides ? sideLog(s.sides.t3) : null });
    if (s.log.length > 150) s.log.splice(0, s.log.length - 150);
    s.last = { net: net, paid: paid, staked: staked, insurance: s.insurance, insurancePaid: insPaid, dealerBJ: dbj, dealer: d.total, sidePaid: sidePaid };
    s.phase = 'done';
    return { kind: 'settle', net: net };
  }

  // Clears the table after a round: the cards go to the discard tray and the next bet can be placed.
  function collect(s) {
    if (s.phase !== 'done') return false;
    s.discards += tableCards(s).length;
    s.dealer = []; s.hands = []; s.active = -1; s.insurance = 0; s.dealerBJ = false; s.sides = null;
    s.phase = 'betting';
    return true;
  }

  // Plays steps until the table waits for the player (handy for tests and simulations).
  function runAuto(s) { let n = 0; while (step(s)) n++; return n; }

  function resetStats(s) {
    const chips = s.bankroll + betTotal(s);
    s.stats = newStats(chips);
    s.history = [chips];
    s.log = [];
  }

  /* House edge when playing the chart (advise), in percent of the main bet, positive for the house. An estimate:
   * the usual published effect of each rule, added to 6 decks, dealer stands on soft 17, peek, double any two,
   * double after split, split to four hands, no surrender, 3:2. That base is set to 0.50%, what 4 million simulated
   * rounds of this engine give (it includes the cut card); every table in TABLES lands within about 0.15% of 3 million
   * simulated rounds of its own. Side bets are not included: see ppEdge and t3Edge, which are exact. */
  function houseEdge(r) {
    const R = normalizeRules(r);
    let e = 0.50;
    e += { 1: -0.48, 2: -0.19, 4: -0.06, 6: 0, 8: 0.02 }[R.decks];
    if (R.hitSoft17) e += 0.22;
    if (!R.das && R.maxHands > 1) e += 0.14;
    if (R.surrender === 'late') e -= R.holeCard === 'peek' ? (R.hitSoft17 ? 0.09 : 0.08) : 0.24;
    if (R.resplitAces && R.maxHands > 2) e -= 0.08;
    if (R.hitSplitAces && R.maxHands > 1) e -= 0.19;
    e += { any: 0, '9-11': 0.09, '10-11': 0.18, none: 1.6 }[R.doubleOn];
    e += { 1: 0.57, 2: 0.05, 3: 0.01, 4: 0 }[R.maxHands];
    e += { '3:2': 0, '6:5': 1.39, '1:1': 2.27 }[R.payout];
    e += { peek: 0, enhc: 0.11, obo: 0 }[R.holeCard];
    e += { 0: 0, 5: -1.4, 6: -0.1, 7: -0.01 }[R.charlie]; // the chart does not play for the Charlie, so a bit less than published
    if (R.continuous) e -= 0.1; // no cut card
    return Math.round(e * 100) / 100;
  }

  return {
    SUITS, RANKS, PAYOUTS, DECKS, DEFAULT_RULES, TABLES, PP_PAYS, T3_PAYS, SIDE_NAMES,
    setRng, seeded, normalizeRules, checkRules, cardValue, hiLo, handValue, isNatural, upValue,
    newGame, upgrade, addBet, canAdd, clearBet, betTotal, rebet, rebetPlan, rebetAmount, canDeal, deal, isBroke, rebuy,
    activeHand, canHit, canStand, canDouble, canSplit, canSurrender, canInsure, insuranceCost,
    hit, stand, double, split, surrender, insurance, step, collect, runAuto, advise, resetStats, newStats,
    houseEdge, perfectPairs, twentyOnePlus3, ppEdge, t3Edge, decksLeft, trueCount, freshShoe,
  };
});
