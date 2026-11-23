/* Blackjack engine: the house rules, the shoe and a round as a small state machine. No DOM, so the same file runs
 * in the page (window.BJ) and in Node for the tests (require('./engine.js')).
 *
 * The whole game is one plain JSON object (made by newGame), so it can be saved and restored mid-round.
 * Money is kept in cents. Player actions (bet, hit, stand...) change the state at once; everything the table does
 * by itself (dealing, the peek, the dealer's turn, paying) happens one visible step at a time through step(),
 * which says what happened, or returns null when the table is waiting for the player. */
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
    doubleOn: 'any', das: true, maxHands: 4, resplitAces: false, hitSplitAces: false, surrender: 'late',
    insurance: true, penetration: 0.75,
  };

  // Table rules only (bankroll, currency and limits are left as they are).
  const PRESETS = [
    { id: 'strip', label: 'Vegas Strip', note: '6 decks · stands on soft 17 · 3:2',
      rules: { decks: 6, payout: '3:2', hitSoft17: false, doubleOn: 'any', das: true, maxHands: 4, resplitAces: false, hitSplitAces: false, surrender: 'late', insurance: true, penetration: 0.75 } },
    { id: 'downtown', label: 'Downtown', note: '2 decks · hits soft 17 · 3:2',
      rules: { decks: 2, payout: '3:2', hitSoft17: true, doubleOn: 'any', das: true, maxHands: 4, resplitAces: false, hitSplitAces: false, surrender: 'none', insurance: true, penetration: 0.65 } },
    { id: 'single', label: 'Single deck', note: '1 deck · no double after split',
      rules: { decks: 1, payout: '3:2', hitSoft17: true, doubleOn: 'any', das: false, maxHands: 2, resplitAces: false, hitSplitAces: false, surrender: 'none', insurance: true, penetration: 0.6 } },
    { id: 'generous', label: 'Player friendly', note: 'resplit and hit split aces',
      rules: { decks: 4, payout: '3:2', hitSoft17: false, doubleOn: 'any', das: true, maxHands: 4, resplitAces: true, hitSplitAces: true, surrender: 'late', insurance: true, penetration: 0.8 } },
    { id: 'sixfive', label: 'Tourist 6:5', note: 'blackjack pays only 6:5',
      rules: { decks: 6, payout: '6:5', hitSoft17: true, doubleOn: '10-11', das: false, maxHands: 3, resplitAces: false, hitSplitAces: false, surrender: 'none', insurance: true, penetration: 0.75 } },
  ];

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
      doubleOn: pick(r.doubleOn, ['any', '9-11', '10-11', 'none'], 'any'),
      das: !!r.das,
      maxHands: pick(Number(r.maxHands), [1, 2, 3, 4], 4),
      resplitAces: !!r.resplitAces,
      hitSplitAces: !!r.hitSplitAces,
      surrender: pick(r.surrender, ['none', 'late'], 'none'),
      insurance: !!r.insurance,
      penetration: num(r.penetration, 0.5, 0.9, 0.75),
    };
    if (out.maxBet < out.minBet) out.maxBet = out.minBet;
    return out;
  }
  // Problems with a set of rules the player typed, as sentences (empty when fine).
  function checkRules(r) {
    const out = [];
    if (!(r.bankroll >= 1)) out.push('The starting bankroll must be at least 1.');
    if (r.maxBet < r.minBet) out.push('The maximum bet must be at least the minimum bet.');
    if (r.minBet > r.bankroll) out.push('The minimum bet is more than the starting bankroll.');
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
    const code = s.shoe.pop();
    const c = { id: s.nextId++, rank: code.slice(0, -1), suit: code.slice(-1), down: !faceUp };
    if (faceUp) s.count += hiLo(c.rank);
    return c;
  }
  function decksLeft(s) { return Math.max(0.25, s.shoe.length / 52); }
  function trueCount(s) { return s.count / decksLeft(s); }

  /* ---------- a game ---------- */
  function newStats(bankroll) {
    return { rounds: 0, hands: 0, won: 0, lost: 0, pushed: 0, blackjacks: 0, busts: 0, surrenders: 0, doubles: 0,
      doublesWon: 0, splits: 0, wagered: 0, net: 0, best: 0, worst: 0, peak: bankroll, decisions: 0, correct: 0,
      insurance: 0, rebuys: 0, start: bankroll };
  }
  function newGame(rules) {
    const R = normalizeRules(rules);
    const s = {
      v: 1, rules: R, bankroll: R.bankroll * 100, bet: 0, lastBet: 0, phase: 'betting',
      shoe: [], size: 0, cut: 0, discards: 0, count: 0, shuffles: 0, midShuffle: false,
      dealer: [], hands: [], active: -1, insurance: 0, dealerBJ: false, dealt: 0, needShuffle: false,
      nextId: 1, stats: newStats(R.bankroll * 100), history: [R.bankroll * 100], last: null, advice: null,
    };
    shuffleShoe(s);
    s.shuffles = 0;
    return s;
  }
  function newHand(bet) {
    return { cards: [], bet: bet, doubled: false, done: false, bust: false, surrendered: false, split: false,
      aces: false, bj: false, evenMoney: false, result: null, paid: 0 };
  }

  /* ---------- betting ---------- */
  function canAdd(s, amount) {
    return s.phase === 'betting' && amount > 0 && amount <= s.bankroll && s.bet + amount <= s.rules.maxBet * 100;
  }
  function addBet(s, amount) {
    if (!canAdd(s, amount)) return false;
    s.bet += amount; s.bankroll -= amount;
    return true;
  }
  function clearBet(s) {
    if (s.phase !== 'betting') return false;
    s.bankroll += s.bet; s.bet = 0;
    return true;
  }
  // Puts back the last bet (times mult), as much of it as the table limit and the bankroll allow.
  function rebetAmount(s, mult) {
    const room = Math.floor((s.bankroll + s.bet) / 100) * 100;
    return Math.min(s.lastBet * (mult || 1), s.rules.maxBet * 100, room);
  }
  function rebet(s, mult) {
    if (s.phase !== 'betting' || !s.lastBet) return false;
    const amt = rebetAmount(s, mult);
    if (amt < s.rules.minBet * 100) return false;
    clearBet(s);
    return addBet(s, amt);
  }
  function canDeal(s) { return s.phase === 'betting' && s.bet >= s.rules.minBet * 100 && s.bet <= s.rules.maxBet * 100; }
  function deal(s) {
    if (!canDeal(s)) return false;
    s.lastBet = s.bet;
    s.hands = [newHand(s.bet)];
    s.bet = 0;
    s.dealer = []; s.active = 0; s.insurance = 0; s.dealerBJ = false; s.dealt = 0; s.last = null; s.advice = null;
    s.midShuffle = false;
    s.needShuffle = s.size - s.shoe.length >= s.cut; // the cut card came out last round
    s.phase = 'deal';
    return true;
  }
  function isBroke(s) { return s.phase === 'betting' && s.bankroll + s.bet < s.rules.minBet * 100; }
  function rebuy(s) {
    if (s.phase !== 'betting') return false;
    s.bankroll += s.rules.bankroll * 100;
    s.stats.rebuys++;
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
  function canSurrender(s) {
    const h = activeHand(s);
    return s.rules.surrender === 'late' && ready(s, h) && s.hands.length === 1 && h.cards.length === 2 && !h.split;
  }
  function insuranceCost(s) { return s.hands[0] ? Math.round(s.hands[0].bet / 2) : 0; }
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
          (v.total === 17 && h17 && up === 11) || (eights && h17 && up === 11)) {
        return out('R', eights ? 'Pair of 8s' : 'Hard ' + v.total);
      }
    }
    if (can.P && pair) {
      const das = R.das;
      let split = false;
      if (pv === 1 || pv === 8) split = true;
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
    if (t === 11) return up <= 10 || h17 || R.decks <= 2 ? D(why) : out('H', why);
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
  // A hand finishes by itself on a bust, on 21, and (unless the rules allow more) after one card on a split ace.
  function settleHandIfFinished(s, h) {
    const v = handValue(h.cards);
    if (v.total > 21) { h.bust = true; h.done = true; }
    else if (v.total === 21) h.done = true;
    else if (h.aces && !s.rules.hitSplitAces && h.cards.length >= 2) {
      const pairAces = h.cards.length === 2 && h.cards[1].rank === 'A';
      if (!(pairAces && s.rules.resplitAces && s.hands.length < s.rules.maxHands)) h.done = true;
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
  function dealerShouldDraw(s) {
    if (s.dealerBJ) return false;
    const live = s.hands.some((h) => !h.bust && !h.surrendered && !h.bj && !h.evenMoney);
    if (!live) return false;
    const v = handValue(s.dealer);
    return v.total < 17 || (v.total === 17 && v.soft && s.rules.hitSoft17);
  }

  /* ---------- the table's own steps ---------- */
  function step(s) {
    switch (s.phase) {
      case 'deal': {
        if (s.needShuffle) { shuffleShoe(s); s.needShuffle = false; return { kind: 'shuffle' }; }
        if (s.dealt < 4) {
          const i = s.dealt++;
          if (i % 2 === 0) { const c = draw(s, true); s.hands[0].cards.push(c); return { kind: 'card', to: 'p', hand: 0, card: c }; }
          const c = draw(s, i !== 3); s.dealer.push(c); return { kind: 'card', to: 'd', card: c };
        }
        s.hands[0].bj = isNatural(s.hands[0].cards);
        if (s.rules.insurance && s.dealer[0].rank === 'A') { s.phase = 'insurance'; return { kind: 'offer', evenMoney: s.hands[0].bj }; }
        s.phase = 'peek';
        return { kind: 'quiet' };
      }
      case 'peek': {
        const up = upValue(s.dealer[0]);
        if (up >= 10) {
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
      else if (dbj) { h.result = 'lose'; h.paid = 0; }
      else if (d.total > 21 || v.total > d.total) { h.result = 'win'; h.paid = h.bet * 2; }
      else if (v.total < d.total) { h.result = 'lose'; h.paid = 0; }
      else { h.result = 'push'; h.paid = h.bet; }
      paid += h.paid;
      st.hands++;
      if (h.result === 'win' || h.result === 'blackjack' || h.result === 'even') st.won++;
      else if (h.result === 'push') st.pushed++;
      else st.lost++;
      if (h.result === 'blackjack' || h.evenMoney) st.blackjacks++;
      if (h.result === 'bust') st.busts++;
      if (h.result === 'surrender') st.surrenders++;
      if (h.doubled && h.result === 'win') st.doublesWon++;
    }
    const insPaid = s.insurance && dbj ? s.insurance * 3 : 0;
    paid += insPaid;
    s.bankroll += paid;
    const net = paid - staked;
    st.rounds++; st.wagered += staked; st.net += net;
    st.best = Math.max(st.best, net); st.worst = Math.min(st.worst, net);
    st.peak = Math.max(st.peak, s.bankroll);
    s.history.push(s.bankroll);
    if (s.history.length > 400) s.history.splice(0, s.history.length - 400);
    s.last = { net: net, paid: paid, staked: staked, insurance: s.insurance, insurancePaid: insPaid, dealerBJ: dbj, dealer: d.total };
    s.phase = 'done';
    return { kind: 'settle', net: net };
  }

  // Clears the table after a round: the cards go to the discard tray and the next bet can be placed.
  function collect(s) {
    if (s.phase !== 'done') return false;
    s.discards += tableCards(s).length;
    s.dealer = []; s.hands = []; s.active = -1; s.insurance = 0; s.dealerBJ = false;
    s.phase = 'betting';
    return true;
  }

  // Plays steps until the table waits for the player (handy for tests and simulations).
  function runAuto(s) { let n = 0; while (step(s)) n++; return n; }

  function resetStats(s) {
    s.stats = newStats(s.bankroll + s.bet);
    s.history = [s.bankroll + s.bet];
  }

  /* House edge when playing the chart (advise), in percent of the first bet, positive for the house. An estimate:
   * the usual published effect of each rule, added to 6 decks, dealer stands on soft 17, double any two, double
   * after split, split to four hands, no surrender, 3:2. That base is set to 0.50%, what 4 million simulated
   * rounds of this engine give (it includes the cut card); the five presets then land within 0.05% of their own
   * simulations. */
  function houseEdge(r) {
    const R = normalizeRules(r);
    let e = 0.50;
    e += { 1: -0.48, 2: -0.19, 4: -0.06, 6: 0, 8: 0.02 }[R.decks];
    if (R.hitSoft17) e += 0.22;
    if (!R.das && R.maxHands > 1) e += 0.14;
    if (R.surrender === 'late') e -= R.hitSoft17 ? 0.09 : 0.08;
    if (R.resplitAces && R.maxHands > 2) e -= 0.08;
    if (R.hitSplitAces && R.maxHands > 1) e -= 0.19;
    e += { any: 0, '9-11': 0.09, '10-11': 0.18, none: 1.6 }[R.doubleOn];
    e += { 1: 0.57, 2: 0.05, 3: 0.01, 4: 0 }[R.maxHands];
    e += { '3:2': 0, '6:5': 1.39, '1:1': 2.27 }[R.payout];
    return Math.round(e * 100) / 100;
  }

  return {
    SUITS, RANKS, PAYOUTS, DECKS, DEFAULT_RULES, PRESETS,
    setRng, seeded, normalizeRules, checkRules, cardValue, hiLo, handValue, isNatural, upValue,
    newGame, addBet, canAdd, clearBet, rebet, rebetAmount, canDeal, deal, isBroke, rebuy,
    activeHand, canHit, canStand, canDouble, canSplit, canSurrender, canInsure, insuranceCost,
    hit, stand, double, split, surrender, insurance, step, collect, runAuto, advise, resetStats, houseEdge,
    decksLeft, trueCount, freshShoe,
  };
});
