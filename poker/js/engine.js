/* Poker Coach engine: cards, hand evaluation, equity, starting-hand ranges and charts, the No-Limit Hold'em table,
 * the opponents and the coach. No DOM: it runs in the page (window.PK) and in Node (require), where the tests use it.
 *
 * A card is a number 0..51: rank = c >> 2 (0 = deuce ... 12 = ace), suit = c & 3 (spades, hearts, diamonds, clubs).
 * Chips are whole numbers with the big blind at 10, so amounts shown in big blinds have at most one decimal.
 * The game in play is one plain JSON object (state), saved by the page after every action. */
(function (root) {
  'use strict';

  const RANKS = '23456789TJQKA';
  const SUITS = 'shdc';
  const RANK_NAME = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
  const RANK_PLURAL = ['twos', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];
  const CATEGORY = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
  const BB = 10, SB = 5;

  const rankOf = (c) => c >> 2;
  const suitOf = (c) => c & 3;
  const cardStr = (c) => RANKS[c >> 2] + SUITS[c & 3];
  function parseCard(s) {
    const r = RANKS.indexOf(s[0].toUpperCase()), u = SUITS.indexOf(s[1].toLowerCase());
    if (r < 0 || u < 0) throw new Error('not a card: ' + s);
    return r * 4 + u;
  }
  const parseCards = (s) => (s.trim() ? s.trim().split(/[\s,]+/).map(parseCard) : []);

  // ---------- random numbers: a seeded generator for tests and drills, the browser's own for the table ----------
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () { // mulberry32
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randInt = (R, n) => Math.floor(R() * n);
  function shuffle(a, R) {
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(R, i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const freshDeck = () => Array.from({ length: 52 }, (_, i) => i);

  // ---------- hand evaluation ----------
  // evaluate(cards) takes 5 to 7 cards and answers a number: bigger is better, equal is a tie.
  // score = category << 20 | the five deciding ranks, four bits each, most important first.
  const CNT = new Int8Array(13), SC = new Int8Array(4), SM = new Int32Array(4);

  function straightHigh(mask) {
    for (let hi = 12; hi >= 4; hi--) if (((mask >> (hi - 4)) & 31) === 31) return hi;
    if ((mask & 0x100f) === 0x100f) return 3; // A-2-3-4-5, the wheel: five high
    return -1;
  }
  function topRanks(mask, n) {
    let out = 0, k = 0;
    for (let r = 12; r >= 0 && k < n; r--) if (mask & (1 << r)) { out = (out << 4) | r; k++; }
    return out << (4 * (5 - n));
  }
  function evaluate(cs) {
    CNT.fill(0); SC.fill(0); SM.fill(0);
    let all = 0;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i], r = c >> 2, s = c & 3;
      CNT[r]++; SC[s]++; SM[s] |= 1 << r; all |= 1 << r;
    }
    // In seven cards a flush cannot share the hand with four of a kind or a full house, so it can be decided first.
    for (let s = 0; s < 4; s++) {
      if (SC[s] >= 5) {
        const sf = straightHigh(SM[s]);
        if (sf >= 0) return (8 << 20) | (sf << 16);
        return (5 << 20) | topRanks(SM[s], 5);
      }
    }
    let q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1;
    for (let r = 12; r >= 0; r--) {
      const n = CNT[r];
      if (n === 4) q = r;
      else if (n === 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; }
      else if (n === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
    }
    if (q >= 0) return (7 << 20) | (q << 16) | (topRanks(all & ~(1 << q), 1) >> 4 & 0xf000);
    if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return (6 << 20) | (t1 << 16) | (Math.max(t2, p1) << 12);
    const st = straightHigh(all);
    if (st >= 0) return (4 << 20) | (st << 16);
    if (t1 >= 0) return (3 << 20) | (t1 << 16) | (topRanks(all & ~(1 << t1), 2) >> 4);
    if (p2 >= 0) return (2 << 20) | (p1 << 16) | (p2 << 12) | (topRanks(all & ~(1 << p1) & ~(1 << p2), 1) >> 8);
    if (p1 >= 0) return (1 << 20) | (p1 << 16) | (topRanks(all & ~(1 << p1), 3) >> 4);
    return topRanks(all, 5);
  }
  const category = (score) => score >> 20;
  const nib = (score, i) => (score >> (16 - 4 * i)) & 15;

  // The name a dealer would give the hand: "Full house, kings full of sevens".
  function describe(score) {
    const c = category(score), a = nib(score, 0), b = nib(score, 1);
    switch (c) {
      case 8: return a === 12 ? 'Royal flush' : 'Straight flush, ' + RANK_NAME[a] + ' high';
      case 7: return 'Four of a kind, ' + RANK_PLURAL[a];
      case 6: return 'Full house, ' + RANK_PLURAL[a] + ' full of ' + RANK_PLURAL[b];
      case 5: return 'Flush, ' + RANK_NAME[a] + ' high';
      case 4: return 'Straight, ' + RANK_NAME[a] + ' high';
      case 3: return 'Three of a kind, ' + RANK_PLURAL[a];
      case 2: return 'Two pair, ' + RANK_PLURAL[a] + ' and ' + RANK_PLURAL[b];
      case 1: return 'One pair, ' + RANK_PLURAL[a];
      default: return 'High card, ' + RANK_NAME[a];
    }
  }
  // The five cards that make the hand (for showing which ones count).
  function best5(cs) {
    if (cs.length <= 5) return { score: evaluate(cs), cards: cs.slice() };
    let best = -1, pick = null;
    const n = cs.length, h = [0, 0, 0, 0, 0];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++)
      for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
        h[0] = cs[a]; h[1] = cs[b]; h[2] = cs[c]; h[3] = cs[d]; h[4] = cs[e];
        const s = evaluate(h);
        if (s > best) { best = s; pick = h.slice(); }
      }
    return { score: best, cards: pick };
  }
  // How a winner beat a loser of the same category: "kicker" when only a side card decided it.
  function decidedBy(win, lose) {
    if (category(win) !== category(lose)) return 'category';
    const c = category(win);
    const main = { 0: 1, 1: 1, 2: 2, 3: 1, 4: 1, 5: 1, 6: 2, 7: 1, 8: 1 }[c];
    for (let i = 0; i < main; i++) if (nib(win, i) !== nib(lose, i)) return c === 5 || c === 0 ? 'cards' : 'rank';
    return c === 5 || c === 0 ? 'cards' : 'kicker';
  }

  // ---------- the 169 starting hands ----------
  // Grid order: row i and column j run from the ace (0) down to the deuce (12). The diagonal holds the pairs, above it
  // the suited hands (AKs is row 0, column 1), below it the offsuit ones (AKo is row 1, column 0).
  const HANDS = [];
  const HAND_INDEX = {};
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const hi = 12 - Math.min(i, j), lo = 12 - Math.max(i, j);
    const name = i === j ? RANKS[hi] + RANKS[lo] : RANKS[hi] + RANKS[lo] + (i < j ? 's' : 'o');
    HAND_INDEX[name] = HANDS.length;
    HANDS.push({ name, hi, lo, pair: i === j, suited: i < j, row: i, col: j, combos: i === j ? 6 : i < j ? 4 : 12 });
  }
  function handClass(c1, c2) {
    const r1 = c1 >> 2, r2 = c2 >> 2, hi = Math.max(r1, r2), lo = Math.min(r1, r2);
    if (hi === lo) return RANKS[hi] + RANKS[lo];
    return RANKS[hi] + RANKS[lo] + ((c1 & 3) === (c2 & 3) ? 's' : 'o');
  }
  function combosOf(name) {
    const h = HANDS[HAND_INDEX[name]], out = [];
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) {
      if (h.pair) { if (s2 > s1) out.push([h.hi * 4 + s1, h.lo * 4 + s2]); }
      else if (h.suited ? s1 === s2 : s1 !== s2) out.push([h.hi * 4 + s1, h.lo * 4 + s2]);
    }
    return out;
  }

  // "22+, A2s+, KTs+, A5s-A2s, 77-99, ATo+, KQo, AK" into the set of hand names.
  function parseRange(text) {
    const set = new Set();
    const R = (ch) => RANKS.indexOf(ch.toUpperCase());
    const add = (hi, lo, kind) => {
      if (hi === lo) { set.add(RANKS[hi] + RANKS[lo]); return; }
      if (kind !== 'o') set.add(RANKS[hi] + RANKS[lo] + 's');
      if (kind !== 's') set.add(RANKS[hi] + RANKS[lo] + 'o');
    };
    for (let part of text.split(',')) {
      part = part.trim();
      if (!part) continue;
      let m;
      if ((m = /^([2-9TJQKA])\1\+$/i.exec(part))) { for (let r = R(m[1]); r <= 12; r++) add(r, r); continue; }
      if ((m = /^([2-9TJQKA])\1-([2-9TJQKA])\2$/i.exec(part))) {
        const a = R(m[1]), b = R(m[2]);
        for (let r = Math.min(a, b); r <= Math.max(a, b); r++) add(r, r);
        continue;
      }
      if ((m = /^([2-9TJQKA])\1$/i.exec(part))) { add(R(m[1]), R(m[1])); continue; }
      if ((m = /^([2-9TJQKA])([2-9TJQKA])([so]?)\+$/i.exec(part))) {
        const hi = R(m[1]), lo = R(m[2]);
        for (let r = lo; r < hi; r++) add(hi, r, m[3].toLowerCase());
        continue;
      }
      if ((m = /^([2-9TJQKA])([2-9TJQKA])([so]?)-([2-9TJQKA])([2-9TJQKA])([so]?)$/i.exec(part))) {
        const hi = R(m[1]), a = R(m[2]), b = R(m[5]);
        for (let r = Math.min(a, b); r <= Math.max(a, b); r++) add(hi, r, m[3].toLowerCase());
        continue;
      }
      if ((m = /^([2-9TJQKA])([2-9TJQKA])([so]?)$/i.exec(part))) {
        const a = R(m[1]), b = R(m[2]);
        add(Math.max(a, b), Math.min(a, b), m[3].toLowerCase());
        continue;
      }
      throw new Error('cannot read range part: ' + part);
    }
    return set;
  }
  const comboCount = (set) => { let n = 0; for (const h of set) n += HANDS[HAND_INDEX[h]].combos; return n; };
  const rangePct = (set) => comboCount(set) / 1326;

  // How each starting hand does against one random hand, all five cards dealt (Monte Carlo, 400,000 runouts each,
  // tools/hand-equity.js). It orders the hands for the opponents and for "the top 20% of hands".
  const EQ_VS_RANDOM = 'AA85.1 AKs67.0 AQs66.1 AJs65.4 ATs64.7 A9s62.7 A8s61.9 A7s61.1 A6s59.8 A5s60.0 A4s59.1 A3s58.2 A2s57.4 AKo65.2 KK82.4 KQs63.5 KJs62.6 KTs61.8 K9s60.1 K8s58.3 K7s57.5 K6s56.6 K5s55.8 K4s54.9 K3s54.1 K2s53.3 AQo64.4 KQo61.4 QQ80.0 QJs60.3 QTs59.5 Q9s57.7 Q8s56.0 Q7s54.4 Q6s53.6 Q5s52.8 Q4s51.8 Q3s51.1 Q2s50.1 AJo63.7 KJo60.6 QJo58.1 JJ77.4 JTs57.5 J9s55.6 J8s54.0 J7s52.3 J6s50.5 J5s49.9 J4s49.1 J3s48.4 J2s47.5 ATo62.7 KTo59.9 QTo57.3 JTo55.3 TT74.9 T9s54.1 T8s52.2 T7s50.6 T6s48.9 T5s47.3 T4s46.5 T3s45.6 T2s44.8 A9o60.8 K9o57.8 Q9o55.3 J9o53.2 T9o51.4 9972.2 98s50.7 97s49.1 96s47.4 95s45.7 94s43.9 93s43.3 92s42.3 A8o59.9 K8o55.9 Q8o53.4 J8o51.5 T8o49.7 98o48.2 8869.3 87s47.9 86s46.2 85s44.6 84s42.7 83s41.0 82s40.1 A7o58.8 K7o55.1 Q7o51.8 J7o49.6 T7o47.8 97o46.3 87o45.1 7766.2 76s45.3 75s43.6 74s41.9 73s40.0 72s38.2 A6o57.7 K6o54.3 Q6o51.1 J6o47.8 T6o46.0 96o44.6 86o43.2 76o42.2 6663.3 65s43.1 64s41.4 63s39.7 62s37.8 A5o57.9 K5o53.4 Q5o50.0 J5o47.2 T5o44.2 95o42.7 85o41.4 75o40.5 65o39.9 5560.4 54s41.4 53s39.8 52s37.9 A4o56.9 K4o52.2 Q4o49.2 J4o46.1 T4o43.4 94o40.6 84o39.4 74o38.5 64o38.0 54o38.1 4457.0 43s38.7 42s36.9 A3o55.8 K3o51.5 Q3o48.2 J3o45.2 T3o42.8 93o40.0 83o37.5 73o36.6 63o36.1 53o36.4 43o35.3 3353.7 32s35.9 A2o54.8 K2o50.5 Q2o47.3 J2o44.3 T2o41.6 92o39.1 82o36.8 72o34.6 62o34.0 52o34.5 42o33.3 32o32.2 2250.4';
  const EQUITY = {};
  for (const tok of EQ_VS_RANDOM.split(' ')) { const m = /^([2-9TJQKA]{2}[so]?)(\d+\.\d)$/.exec(tok); EQUITY[m[1]] = +m[2] / 100; }

  // Hands ordered for playing them: equity against one random hand with a bonus for suited and connected cards,
  // which make more strong hands when several players see a flop. ORDER[k] is the k-th best, PCTILE[name] is the share
  // of all 1326 combinations at least as good as it.
  const PLAY_VALUE = {};
  for (const h of HANDS) {
    const gap = h.hi - h.lo;
    let v = EQUITY[h.name];
    if (h.suited) v += 0.012 + (gap <= 1 ? 0.012 : gap === 2 ? 0.006 : 0);
    if (!h.pair && gap === 1) v += 0.006;
    if (h.pair) v += 0.01;
    PLAY_VALUE[h.name] = v;
  }
  const ORDER = HANDS.map((h) => h.name).sort((a, b) => PLAY_VALUE[b] - PLAY_VALUE[a]);
  const PCTILE = {};
  { let acc = 0; for (const n of ORDER) { acc += HANDS[HAND_INDEX[n]].combos; PCTILE[n] = acc / 1326; } }
  function topRange(lo, hi) { // the hands between two shares of the order (0 = the best hand, 1 = all of them)
    const set = new Set();
    for (const n of ORDER) { const p = PCTILE[n], start = p - HANDS[HAND_INDEX[n]].combos / 1326; if (start >= lo - 1e-9 && p <= hi + 1e-3) set.add(n); }
    return set;
  }

  // ---------- the charts: 6-max cash game, 100 big blinds deep ----------
  // Close to what solvers play, rounded so that a person can learn them: one action per hand, no mixing.
  const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const POS_NAME = { UTG: 'Under the gun', HJ: 'Hijack', CO: 'Cutoff', BTN: 'Button', SB: 'Small blind', BB: 'Big blind' };
  const CHART_TEXT = {
    'open.UTG': { raise: '22+, A2s+, KTs+, QTs+, J9s+, T9s, 98s, 87s, 76s, ATo+, KJo+' },
    'open.HJ': { raise: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, ATo+, KTo+, QJo' },
    'open.CO': { raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A8o+, KTo+, QTo+, JTo' },
    'open.BTN': { raise: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 96s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o' },
    'open.SB': { raise: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, A2o+, K9o+, QTo+, JTo' },
    // facing one raise
    'vsEarly.IP': { raise: 'QQ+, AKs, AKo, A5s, A4s', call: 'JJ-22, AQs-ATs, KQs, KJs, QJs, JTs, T9s, 98s, AQo' },
    'vsLate.IP': { raise: 'TT+, AJs+, KQs, AQo+, A5s-A3s, 76s, 65s', call: '99-22, ATs-A6s, KJs-K9s, QJs-Q9s, JTs, J9s, T9s, T8s, 98s, 87s, AJo, KQo' },
    'vsEarly.SB': { raise: 'TT+, AQs+, AKo, A5s, KQs' },
    'vsLate.SB': { raise: '88+, ATs+, KTs+, QTs+, JTs, T9s, 98s, A5s-A2s, AJo+, KQo' },
    'vsEarly.BB': { raise: 'QQ+, AKs, AKo, A5s', call: 'JJ-22, AQs-A6s, A4s-A2s, KQs-K9s, QJs-Q9s, JTs, J9s, T9s, T8s, 98s, 87s, 76s, 65s, 54s, AQo-ATo, KQo, KJo, QJo' },
    'vsLate.BB': { raise: 'TT+, AJs+, KQs, AQo+, A5s-A2s', call: '99-22, ATs-A6s, KJs-K5s, Q4s+, J6s+, T6s+, 96s+, 85s+, 74s+, 63s+, 53s+, 43s, AJo-A2o, KQo-K8o, Q9o+, J9o+, T9o, T8o, 98o, 87o' },
    'vsSB.BB': { raise: 'TT+, ATs+, KTs+, QJs, A5s-A2s, AJo+, KQo', call: '99-22, A9s-A6s, K9s-K2s, QTs-Q2s, J4s+, T5s+, 95s+, 84s+, 74s+, 63s+, 52s+, 42s+, 32s, ATo-A2o, KJo-K5o, Q7o+, J8o+, T8o+, 97o+, 87o, 76o' },
    // after you opened and someone raised again
    'vs3bet.IP': { raise: 'QQ+, AKs, AKo, A5s', call: 'JJ-88, AQs-ATs, KQs, KJs, QJs, JTs, T9s, AQo' },
    'vs3bet.OOP': { raise: 'QQ+, AKs, AKo, A5s', call: 'JJ-99, AQs, AJs, KQs, AQo' },
    'vs4bet': { raise: 'KK+, AKs', call: 'QQ, JJ, AKo' },
    // a raise and a re-raise before you have put money in
    'cold3bet': { raise: 'QQ+, AKs', call: 'JJ, TT, AKo' },
    // players limped in before you
    'vsLimp.IP': { raise: 'TT+, A9s+, KTs+, QJs, JTs, AJo+, KQo' },
    'vsLimp.BB': { raise: 'TT+, AJs+, KQs, AQo+' },
  };
  const CHARTS = {};
  for (const k in CHART_TEXT) CHARTS[k] = { raise: parseRange(CHART_TEXT[k].raise || ''), call: parseRange(CHART_TEXT[k].call || '') };
  function chartAction(key, name) {
    const ch = CHARTS[key];
    if (ch.raise.has(name)) return 'raise';
    if (ch.call.has(name)) return 'call';
    return 'fold';
  }
  const CHART_TITLE = {
    'open.UTG': 'Under the gun, folded to you', 'open.HJ': 'Hijack, folded to you', 'open.CO': 'Cutoff, folded to you',
    'open.BTN': 'Button, folded to you', 'open.SB': 'Small blind, folded to you',
    'vsEarly.IP': 'Facing a raise from under the gun or the hijack, you act after the raiser',
    'vsLate.IP': 'On the button, facing a raise from the cutoff',
    'vsEarly.SB': 'Small blind, facing a raise from under the gun, hijack or cutoff',
    'vsLate.SB': 'Small blind, facing a raise from the button',
    'vsEarly.BB': 'Big blind, facing a raise from under the gun or the hijack',
    'vsLate.BB': 'Big blind, facing a raise from the cutoff or the button',
    'vsSB.BB': 'Big blind, facing a raise from the small blind',
    'vs3bet.IP': 'You opened, someone behind you re-raised, and you will act after them',
    'vs3bet.OOP': 'You opened, a player in the blinds re-raised, and you will act first after the flop',
    'vs4bet': 'You re-raised and they raised again',
    'cold3bet': 'A raise and a re-raise came before you',
    'vsLimp.IP': 'One or more players called the big blind (limped) before you',
    'vsLimp.BB': 'Big blind, players limped and it is your option',
  };

  // Which chart a decision uses: pos is the seat's position, the rest describes the raises before it.
  function chartKey(pos, s) {
    const early = (p) => p === 'UTG' || p === 'HJ' || (pos === 'SB' && p === 'CO');
    if (s.raises === 0) {
      if (s.limpers > 0) return pos === 'BB' ? 'vsLimp.BB' : 'vsLimp.IP';
      return pos === 'BB' ? null : 'open.' + pos;
    }
    if (s.raises === 1) {
      if (s.heroRaised) return null; // cannot happen: a single raise that is yours ends the round before you act again
      if (pos === 'BB') return s.raiser === 'SB' ? 'vsSB.BB' : early(s.raiser) ? 'vsEarly.BB' : 'vsLate.BB';
      if (pos === 'SB') return early(s.raiser) ? 'vsEarly.SB' : 'vsLate.SB';
      return early(s.raiser) ? 'vsEarly.IP' : 'vsLate.IP';
    }
    if (s.raises === 2) {
      if (s.heroRaised) return s.heroIP ? 'vs3bet.IP' : 'vs3bet.OOP';
      return 'cold3bet';
    }
    return 'vs4bet';
  }

  // ---------- equity ----------
  // players: [{ hand: [c, c] }] or [{ range: [[c, c], ...] }] (equal weights); board: 0 to 5 cards.
  // Answers each player's share of the pot: wins plus split pots shared out. Monte Carlo unless exact is cheap.
  function equity(players, board, opts) {
    opts = opts || {};
    const R = opts.rng || Math.random, n = players.length, need = 5 - board.length;
    const dead = new Uint8Array(52);
    for (const c of board) dead[c] = 1;
    for (const p of players) if (p.hand) for (const c of p.hand) dead[c] = 1;
    for (const c of opts.dead || []) dead[c] = 1;
    const share = new Float64Array(n), wins = new Float64Array(n), ties = new Float64Array(n);
    const score = new Int32Array(n), cards = new Array(7);
    const allFixed = players.every((p) => p.hand);
    let samples = 0;
    const deal = (hands, extra) => {
      let best = -1, nb = 0;
      for (let i = 0; i < n; i++) {
        cards.length = 0;
        cards.push(hands[i][0], hands[i][1]);
        for (const c of board) cards.push(c);
        for (const c of extra) cards.push(c);
        score[i] = evaluate(cards);
        if (score[i] > best) { best = score[i]; nb = 1; } else if (score[i] === best) nb++;
      }
      for (let i = 0; i < n; i++) if (score[i] === best) {
        share[i] += 1 / nb;
        if (nb === 1) wins[i]++; else ties[i]++;
      }
      samples++;
    };
    const live = [];
    for (let c = 0; c < 52; c++) if (!dead[c]) live.push(c);
    if (allFixed && (opts.exact || need <= 2)) { // every runout
      const hands = players.map((p) => p.hand);
      if (need === 0) deal(hands, []);
      else if (need === 1) for (const a of live) deal(hands, [a]);
      else if (need === 2) for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) deal(hands, [live[i], live[j]]);
      else throw new Error('exact equity needs at least three board cards');
    } else {
      const iters = opts.samples || 10000, used = new Int32Array(52), hands = new Array(n), extra = [];
      let stamp = 0;
      for (let it = 0; it < iters; it++) {
        stamp++;
        let ok = true;
        for (let i = 0; i < n && ok; i++) {
          const p = players[i];
          if (p.hand) { hands[i] = p.hand; continue; }
          let tries = 0, h;
          do { h = p.range[randInt(R, p.range.length)]; tries++; }
          while ((dead[h[0]] || dead[h[1]] || used[h[0]] === stamp || used[h[1]] === stamp || (p.accept && !p.accept(h))) && tries < 60);
          if (tries >= 60 && (dead[h[0]] || dead[h[1]] || used[h[0]] === stamp || used[h[1]] === stamp)) ok = false;
          used[h[0]] = stamp; used[h[1]] = stamp; hands[i] = h;
        }
        if (!ok) continue;
        extra.length = 0;
        while (extra.length < need) {
          const c = live[randInt(R, live.length)];
          if (used[c] === stamp) continue;
          used[c] = stamp; extra.push(c);
        }
        deal(hands, extra);
      }
    }
    const k = samples || 1;
    return { equity: Array.from(share, (x) => x / k), win: Array.from(wins, (x) => x / k), tie: Array.from(ties, (x) => x / k), samples };
  }
  // The combinations of a set of hand names that do not use a dead card.
  function rangeCombos(set, dead) {
    const d = new Set(dead || []), out = [];
    for (const name of set) for (const h of combosOf(name)) if (!d.has(h[0]) && !d.has(h[1])) out.push(h);
    return out;
  }

  // ---------- what a hand holds on a board ----------
  // made: the hand as a player would say it ("top pair, good kicker"); draws; strength 0..1 for the opponents'
  // guesses; outs: cards that improve it to a straight or better (or a set, for a pocket pair).
  function straightOuts(holeMask, boardMask) {
    const all = holeMask | boardMask, out = [];
    if (straightHigh(all) >= 0) return out;
    for (let r = 0; r < 13; r++) {
      if (all & (1 << r)) continue;
      const hi = straightHigh(all | (1 << r));
      if (hi >= 0 && straightHigh(boardMask | (1 << r)) < hi) out.push(r);
    }
    return out;
  }
  const BC = new Int8Array(13), BS = new Int8Array(4), HS = new Int8Array(4);
  // A number from 0 to 1 for how strong a hand is on a board: made hands first, draws as a floor. Cheap enough to be
  // asked thousands of times while the opponents' hands are guessed (rangeOf).
  function quickStrength(hole, board) {
    const all = hole.concat(board), score = evaluate(all), cat = score >> 20;
    if (board.length < 3) return PCTILE[handClass(hole[0], hole[1])] < 0.2 ? 0.8 : 0.4;
    if (board.length >= 5 && evaluate(board) >= score) return 0.08;
    BC.fill(0); BS.fill(0); HS.fill(0);
    let top = -1, second = -1, bm = 0, hm = 0;
    for (const c of board) { BC[c >> 2]++; BS[c & 3]++; bm |= 1 << (c >> 2); }
    for (let r = 12; r >= 0; r--) if (BC[r]) { if (top < 0) top = r; else if (second < 0) second = r; }
    const h0 = hole[0] >> 2, h1 = hole[1] >> 2, hc = (r) => (h0 === r) + (h1 === r);
    for (const c of hole) { HS[c & 3]++; hm |= 1 << (c >> 2); }
    const paired = board.length > new Set(board.map(rankOf)).size;
    let s;
    if (cat >= 6) s = 1;
    else if (cat === 5) s = paired ? 0.85 : 0.95;
    else if (cat === 4) s = Math.max(...BS) >= 3 ? 0.8 : 0.93;
    else if (cat === 3) { const t = nib(score, 0); s = BC[t] === 3 ? 0.25 : hc(t) === 2 ? 0.97 : 0.88; }
    else if (cat === 2) {
      const a = nib(score, 0), b = nib(score, 1), own = [a, b].filter((r) => hc(r) > 0);
      if (own.length === 2) s = 0.9;
      else if (own.length === 1) { const m = own[0]; s = hc(m) === 2 ? (m > top ? 0.8 : 0.42) : m === top ? 0.66 : 0.42; }
      else s = 0.12;
    } else if (cat === 1) {
      const p = nib(score, 0);
      if (hc(p) === 2) s = p > top ? (p >= 10 ? 0.86 : 0.78) : 0.42;
      else if (hc(p) === 1) { const k = h0 === p ? h1 : h0; s = p === top ? (k >= 10 ? 0.75 : 0.62) : p === second ? 0.48 : 0.36; }
      else s = 0.12;
    } else s = h0 > top && h1 > top ? 0.22 : 0.1;
    if (board.length < 5 && cat < 4) {
      let fd = false;
      for (let u = 0; u < 4; u++) if (BS[u] + HS[u] === 4 && HS[u] >= 1) fd = true;
      const so = straightOuts(hm, bm).length;
      const d = fd && so ? 0.72 : fd ? 0.55 : so >= 2 ? 0.5 : so === 1 ? 0.3 : 0;
      if (d) s = Math.max(s, d + (s > 0.3 ? 0.1 : 0));
    }
    return Math.min(1, s);
  }
  // What a hand holds on a board, in words: made ("top pair, good kicker"), draws, strength 0..1 and outs (cards that
  // improve it to a straight or better, or to a set for a pocket pair with nothing else).
  function classify(hole, board) {
    const all = hole.concat(board), score = evaluate(all), cat = category(score);
    const hr = hole.map(rankOf).sort((a, b) => b - a);
    if (board.length === 0) {
      return { made: hr[0] === hr[1] ? 'a pair of ' + RANK_PLURAL[hr[0]] : RANKS[hr[0]] + RANKS[hr[1]] + (suitOf(hole[0]) === suitOf(hole[1]) ? ' suited' : ' offsuit'), draws: [], strength: quickStrength(hole, board), score, cat, outs: [] };
    }
    const bRanks = board.map(rankOf), distinct = [...new Set(bRanks)].sort((a, b) => b - a), top = distinct[0];
    const bc = (r) => bRanks.filter((x) => x === r).length, hc = (r) => hr.filter((x) => x === r).length;
    const nothing = () => 'nothing yet (' + RANK_NAME[hr[0]] + ' high)';
    let made;
    if (board.length >= 5 && evaluate(board) >= score) made = 'the board plays';
    else if (cat === 8) made = 'a straight flush';
    else if (cat === 7) made = 'four of a kind';
    else if (cat === 6) made = 'a full house';
    else if (cat === 5) made = suitedNut(hole, board) ? 'the nut flush' : 'a flush';
    else if (cat === 4) made = 'a straight';
    else if (cat === 3) { const t = nib(score, 0); made = bc(t) === 3 ? 'trips on the board' : hc(t) === 2 ? 'a set of ' + RANK_PLURAL[t] : 'trips (' + RANK_PLURAL[t] + ')'; }
    else if (cat === 2) {
      const a = nib(score, 0), b = nib(score, 1), own = [a, b].filter((r) => hc(r) > 0);
      if (own.length === 2) made = a === top && b === distinct[1] ? 'top two pair' : 'two pair';
      else if (own.length === 1) {
        const m = own[0];
        made = hc(m) === 2 ? (m > top ? 'an overpair (' + RANK_PLURAL[m] + ') on a paired board' : 'a pair of ' + RANK_PLURAL[m] + ' on a paired board')
          : (m === top ? 'top pair' : 'a pair of ' + RANK_PLURAL[m]) + ' on a paired board';
      } else made = nothing();
    } else if (cat === 1) {
      const p = nib(score, 0);
      if (hc(p) === 2) made = p > top ? 'an overpair (' + RANK_PLURAL[p] + ')' : 'a pocket pair of ' + RANK_PLURAL[p] + ', below the top card';
      else if (hc(p) === 1) {
        const k = hr.find((r) => r !== p);
        made = p === top ? 'top pair, ' + (k >= 10 ? 'good kicker' : 'weak kicker') : p === distinct[1] ? 'middle pair' : 'bottom pair';
      } else made = nothing();
    } else made = nothing();
    const draws = [];
    let outs = [];
    if (board.length < 5 && cat < 4) {
      for (let s = 0; s < 4; s++) {
        const mineS = hole.filter((c) => suitOf(c) === s);
        if (all.filter((c) => suitOf(c) === s).length === 4 && mineS.length) {
          const hi = Math.max(...mineS.map(rankOf));
          let nut = true;
          for (let r = 12; r > hi; r--) if (!board.some((c) => rankOf(c) === r && suitOf(c) === s)) nut = false;
          draws.push(nut ? 'nut flush draw' : 'flush draw');
        }
      }
      const hm = hole.reduce((m, c) => m | (1 << rankOf(c)), 0), bm = board.reduce((m, c) => m | (1 << rankOf(c)), 0);
      const so = straightOuts(hm, bm);
      if (so.length >= 2) draws.push(isOpenEnded(hm | bm) ? 'open-ended straight draw' : 'double gutshot');
      else if (so.length === 1) draws.push('gutshot');
      outs = countOuts(hole, board, hr[0] === hr[1] && cat === 1 && !draws.length ? 3 : 4);
    }
    return { made, draws, strength: quickStrength(hole, board), score, cat, outs };
  }
  function isOpenEnded(mask) { // four ranks in a row that a card at either end completes (jack-to-ace has one end)
    for (let lo = 0; lo <= 8; lo++) if (((mask >> lo) & 15) === 15) return true;
    return false;
  }
  function suitedNut(hole, board) {
    for (let s = 0; s < 4; s++) {
      const mine = hole.filter((c) => suitOf(c) === s);
      if (!mine.length || board.filter((c) => suitOf(c) === s).length + mine.length < 5) continue;
      const hi = Math.max(...mine.map(rankOf));
      let nut = true;
      for (let r = 12; r > hi; r--) if (!board.some((c) => rankOf(c) === r && suitOf(c) === s)) nut = false;
      if (nut) return true;
    }
    return false;
  }
  // Unseen cards that give you a hand of at least `target` category, better than the board would give anyone.
  function countOuts(hole, board, target) {
    const seen = new Set(hole.concat(board)), out = [];
    const now = evaluate(hole.concat(board));
    if (category(now) >= target) return out;
    for (let c = 0; c < 52; c++) {
      if (seen.has(c)) continue;
      const s = evaluate(hole.concat(board, [c]));
      if (category(s) < target) continue;
      if (board.length + 1 >= 5 && evaluate(board.concat([c])) >= s) continue; // the board alone makes it
      out.push(c);
    }
    return out;
  }
  // The board's character, for bet sizes: dry boards get small bets, wet ones bigger.
  function texture(board) {
    if (board.length < 3) return { wet: 0, words: '' };
    const rs = board.map(rankOf), ss = board.map(suitOf);
    const suitMax = Math.max(...[0, 1, 2, 3].map((s) => ss.filter((x) => x === s).length));
    const uniq = [...new Set(rs)].sort((a, b) => a - b);
    let connected = 0;
    for (let i = 0; i < 13; i++) { // ranks of the board within any five-rank window
      let k = 0;
      for (const r of uniq) if ((r >= i && r < i + 5) || (i === 0 && r === 12)) k++;
      connected = Math.max(connected, k);
    }
    const paired = uniq.length < rs.length;
    let wet = 0;
    const words = [];
    if (suitMax >= 3) { wet += 2; words.push(suitMax >= 4 ? 'four of a suit' : board.length === 3 ? 'monotone' : 'three of a suit'); }
    else if (suitMax === 2 && board.length <= 4) { wet += 1; words.push('a flush draw possible'); }
    if (connected >= 3) { wet += 2; words.push('connected'); }
    else if (connected === 2 && Math.max(...rs) - Math.min(...rs) <= 4) { wet += 1; }
    if (paired) words.push('paired');
    if (Math.max(...rs) >= 10 && wet === 0) words.push('high and dry');
    else if (wet === 0) words.push('dry');
    return { wet, words: words.join(', ') };
  }

  // ---------- the table ----------
  const STYLES = {
    reg: { name: 'Regular', about: 'Plays the charts and bets with a reason.', loose: 1, aggr: 1, bluff: 0.18, sticky: 0 },
    rock: { name: 'Rock', about: 'Very tight. When a rock raises, believe it.', loose: 0.55, aggr: 0.8, bluff: 0.05, sticky: -0.05 },
    station: { name: 'Calling station', about: 'Calls far too much and rarely raises. Bet your good hands, do not bluff.', loose: 1.9, aggr: 0.35, bluff: 0.04, sticky: 0.14 },
    maniac: { name: 'Maniac', about: 'Raises and bluffs a lot. Call down lighter, let them bet.', loose: 1.8, aggr: 1.9, bluff: 0.45, sticky: 0.05 },
  };
  const BOT_NAMES = ['Ana', 'Bruno', 'Carmen', 'Diego', 'Elena', 'Félix', 'Gloria', 'Hugo', 'Inés', 'Jorge', 'Lola', 'Mateo',
    'Nuria', 'Óscar', 'Paula', 'Quique', 'Rosa', 'Sergio', 'Teresa', 'Víctor', 'Yolanda', 'Zoe'];
  const TABLE_MIX = {
    mixed: ['reg', 'station', 'rock', 'maniac', 'reg'],
    soft: ['station', 'station', 'rock', 'reg', 'station'],
    tough: ['reg', 'reg', 'maniac', 'reg', 'reg'],
  };

  function newTable(opts) {
    opts = opts || {};
    const R = opts.rng || Math.random;
    const mix = TABLE_MIX[opts.mix || 'mixed'].slice();
    shuffle(mix, R);
    const names = shuffle(BOT_NAMES.slice(), R);
    const seats = [{ name: 'You', hero: true, style: null, stack: 100 * BB }];
    for (let i = 0; i < 5; i++) seats.push({ name: names[i], hero: false, style: mix[i], stack: 100 * BB });
    for (const s of seats) Object.assign(s, { hole: null, folded: true, allIn: false, bet: 0, total: 0, acted: false, canRaise: true, shown: false, pre: null, aggr: 0, calls: 0 });
    return { v: 1, mix: opts.mix || 'mixed', seats, button: randInt(R, 6), handNo: 0, street: 'idle', board: [], deck: [], toAct: -1,
      currentBet: 0, minRaise: BB, raises: 0, limpers: 0, lastRaiser: -1, openRaiser: -1, log: [], result: null, nameNo: 5, heroPre: null };
  }
  const seatPos = (st, i) => POSITIONS[(i - st.button + 6 + 3) % 6]; // the button is index 3 of POSITIONS
  const nextSeat = (i) => (i + 1) % 6;
  const inHand = (st) => st.seats.map((s, i) => i).filter((i) => !st.seats[i].folded);
  const canAct = (st, i) => !st.seats[i].folded && !st.seats[i].allIn;
  const pot = (st) => st.seats.reduce((a, s) => a + s.total, 0);

  function logLine(st, text, kind) { st.log.push({ street: st.street, text, kind: kind || 'act' }); }
  // "Ana folds", "You fold": the verb agrees with the seat
  const says = (s, verb) => s.name + ' ' + (s.hero ? verb.replace(/s$/, '') : verb);

  function startHand(st, R) {
    R = R || Math.random;
    // players who are out of chips are replaced (the opponents) or wait for a rebuy (you)
    const joined = [];
    st.seats.forEach((s) => {
      if (s.hero || (s.stack >= BB * 2 && s.stack <= 300 * BB)) return;
      // out of chips, or a big winner who leaves: someone new sits down with 100 bb
      const pool = BOT_NAMES.filter((n) => !st.seats.some((x) => x.name === n));
      s.name = pool.length ? pool[randInt(R, pool.length)] : 'Player ' + (++st.nameNo);
      s.stack = 100 * BB;
      s.style = Object.keys(STYLES)[randInt(R, 4)];
      s.joined = true;
      joined.push(s.name + ' sits down (' + STYLES[s.style].name.toLowerCase() + ')');
    });
    if (st.seats[0].stack <= 0) throw new Error('rebuy first');
    st.handNo++;
    st.button = nextSeat(st.button);
    st.deck = shuffle(freshDeck(), R);
    st.board = []; st.log = []; st.result = null; st.street = 'preflop'; st.preAggressor = -1;
    for (const t of joined) logLine(st, t, 'info');
    st.raises = 0; st.limpers = 0; st.lastRaiser = -1; st.openRaiser = -1; st.heroPre = null; st.decisions = [];
    for (const s of st.seats) Object.assign(s, { hole: null, folded: false, allIn: false, bet: 0, total: 0, acted: false, canRaise: true, shown: false, pre: null, aggr: 0, calls: 0, won: 0, startStack: s.stack });
    for (let k = 0; k < 2; k++) for (let i = 1; i <= 6; i++) {
      const s = st.seats[(st.button + i) % 6];
      (s.hole = s.hole || []).push(st.deck.pop());
    }
    const sbI = nextSeat(st.button), bbI = nextSeat(sbI);
    post(st, sbI, SB); post(st, bbI, BB);
    logLine(st, 'Hand ' + st.handNo + ': ' + says(st.seats[sbI], 'posts') + ' the small blind, ' + st.seats[bbI].name + ' the big blind', 'info');
    st.currentBet = BB; st.minRaise = BB;
    st.toAct = nextSeat(bbI);
    for (let k = 0; k < 6 && !canAct(st, st.toAct); k++) st.toAct = nextSeat(st.toAct);
    if (!canAct(st, st.toAct)) { st.toAct = -1; advance(st); }
    return st;
  }
  function post(st, i, amt) {
    const s = st.seats[i], a = Math.min(amt, s.stack);
    s.stack -= a; s.bet += a; s.total += a;
    if (s.stack === 0) s.allIn = true;
  }

  // What the player to act may do. toCall is what calling costs; raise is the range of "raise to" totals.
  function legal(st) {
    const i = st.toAct, s = st.seats[i];
    const toCall = Math.min(st.currentBet - s.bet, s.stack);
    const maxTo = s.bet + s.stack;
    const minTo = Math.min(st.currentBet + st.minRaise, maxTo);
    // raising needs chips beyond the call and someone left who could still answer it
    const othersCanAct = st.seats.some((x, j) => j !== i && canAct(st, j));
    const canRaise = s.canRaise && maxTo > st.currentBet && othersCanAct;
    return { toCall, check: toCall === 0, call: toCall > 0, raise: canRaise ? { min: minTo, max: maxTo } : null, isBet: st.currentBet === 0 };
  }

  // Applies an action of the player to act: { type: 'fold' | 'check' | 'call' | 'raise', to }.
  // 'raise' with st.currentBet === 0 is a bet. Answers a short description of what happened.
  function act(st, a) {
    const i = st.toAct, s = st.seats[i], L = legal(st), pos = seatPos(st, i);
    let text;
    if (a.type === 'check' && !L.check) a = { type: 'call' };
    if (a.type === 'call' && L.check) a = { type: 'check' };
    if (a.type === 'raise' && !L.raise) a = L.check ? { type: 'check' } : { type: 'call' };
    if (st.street === 'preflop' && a.type !== 'fold') s.pre = preflopKind(st, i, a); // the latest says the most
    if (a.type === 'fold') {
      s.folded = true; text = says(s, 'folds');
    } else if (a.type === 'check') {
      text = says(s, 'checks');
    } else if (a.type === 'call') {
      const amt = L.toCall;
      s.stack -= amt; s.bet += amt; s.total += amt;
      if (s.stack === 0) s.allIn = true;
      if (st.street === 'preflop' && st.raises === 0) st.limpers += pos === 'SB' || pos === 'BB' ? 0 : 1;
      if (st.street !== 'preflop') s.calls++;
      text = says(s, 'calls') + (s.allIn ? ' all-in ' : ' ') + bbStr(amt);
    } else {
      let to = Math.round(Math.max(L.raise.min, Math.min(L.raise.max, a.to)));
      const wasBet = st.currentBet === 0;
      const amt = to - s.bet;
      s.stack -= amt; s.bet = to; s.total += amt;
      if (s.stack === 0) s.allIn = true;
      const inc = to - st.currentBet;
      const full = inc >= st.minRaise;
      if (full) {
        st.minRaise = inc;
        // a full raise lets everyone who acted act again, with every option
        st.seats.forEach((x, j) => { if (j !== i && canAct(st, j)) { x.acted = false; x.canRaise = true; } });
      } else {
        // an all-in for less than a full raise: those who already acted may call or fold, not raise again
        st.seats.forEach((x, j) => { if (j !== i && canAct(st, j)) { if (x.acted) x.canRaise = false; x.acted = false; } });
      }
      st.currentBet = to;
      st.lastRaiser = i;
      if (st.street === 'preflop') { st.raises++; if (st.raises === 1) st.openRaiser = i; }
      else s.aggr++;
      text = says(s, wasBet ? 'bets' : 'raises') + (wasBet ? ' ' : ' to ') + bbStr(to) + (s.allIn ? ' (all-in)' : '');
    }
    s.acted = true;
    logLine(st, text, a.type);
    advance(st);
    return text;
  }
  function preflopKind(st, i, a) {
    if (a.type === 'fold') return null;
    if (a.type === 'raise') return st.raises === 0 ? (st.limpers ? 'iso' : 'open') : st.raises === 1 ? '3bet' : '4bet';
    if (a.type === 'check') return 'check';
    return st.raises === 0 ? 'limp' : st.raises === 1 ? 'call' : 'call3';
  }

  function advance(st) {
    const alive = inHand(st);
    if (alive.length === 1) return finish(st);
    const pending = st.seats.map((s, i) => i).filter((i) => canAct(st, i) && (!st.seats[i].acted || st.seats[i].bet < st.currentBet));
    if (pending.length) {
      let j = nextSeat(st.toAct < 0 ? st.button : st.toAct);
      while (!(canAct(st, j) && (!st.seats[j].acted || st.seats[j].bet < st.currentBet))) j = nextSeat(j);
      // only one player left who can act and nothing to call: nothing to bet against
      const actors = alive.filter((k) => canAct(st, k));
      if (actors.length === 1 && st.seats[j].bet >= st.currentBet) return nextStreet(st);
      st.toAct = j;
      return;
    }
    nextStreet(st);
  }
  function nextStreet(st) {
    // uncalled chips go back: a bet nobody matched
    returnUncalled(st);
    if (st.street === 'preflop') st.preAggressor = st.lastRaiser;
    for (const s of st.seats) { s.bet = 0; s.acted = false; s.canRaise = true; }
    st.currentBet = 0; st.minRaise = BB; st.lastRaiser = -1;
    const order = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' };
    st.street = order[st.street];
    if (st.street === 'showdown') return finish(st);
    st.deck.pop(); // burn
    const n = st.street === 'flop' ? 3 : 1;
    for (let k = 0; k < n; k++) st.board.push(st.deck.pop());
    logLine(st, (st.street === 'flop' ? 'Flop ' : st.street === 'turn' ? 'Turn ' : 'River ') + st.board.slice(st.street === 'flop' ? 0 : -1).map(cardStr).join(' '), 'street');
    const actors = inHand(st).filter((k) => canAct(st, k));
    if (actors.length <= 1) { st.toAct = -1; return; } // everyone is all-in: the board runs out (runOut)
    let j = nextSeat(st.button);
    while (!canAct(st, j)) j = nextSeat(j);
    st.toAct = j;
  }
  // With everyone all-in the cards are dealt street by street (the page shows each one).
  function runOutStep(st) {
    if (st.street === 'showdown' || st.street === 'done') return false;
    if (st.toAct !== -1) return false;
    nextStreet(st);
    return true;
  }
  function returnUncalled(st) {
    const bets = st.seats.map((s) => s.bet);
    const top = Math.max(...bets);
    const atTop = bets.filter((b) => b === top).length;
    if (atTop === 1 && top > 0) {
      const second = Math.max(...bets.filter((b, k) => !(b === top)), 0);
      const i = bets.indexOf(top), back = top - second, s = st.seats[i];
      if (back > 0) {
        s.stack += back; s.bet -= back; s.total -= back;
        if (s.stack > 0) s.allIn = false;
        logLine(st, bbStr(back) + ' not called, back to ' + s.name, 'info');
      }
    }
  }

  // The pots: a main pot and a side pot for every all-in that others covered.
  function pots(st) {
    const levels = [...new Set(st.seats.filter((s) => !s.folded).map((s) => s.total))].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const lv of levels) {
      let amt = 0;
      for (const s of st.seats) amt += Math.max(0, Math.min(s.total, lv) - prev);
      const elig = st.seats.map((s, i) => i).filter((i) => !st.seats[i].folded && st.seats[i].total >= lv);
      if (amt > 0) {
        if (out.length && out[out.length - 1].elig.length === elig.length) out[out.length - 1].amount += amt;
        else out.push({ amount: amt, elig });
      }
      prev = lv;
    }
    // chips of folded players above the highest live level belong to the last pot
    const rest = st.seats.reduce((a, s) => a + Math.max(0, s.total - prev), 0);
    if (rest && out.length) out[out.length - 1].amount += rest;
    return out;
  }

  function finish(st) {
    returnUncalled(st);
    const alive = inHand(st);
    const res = { winners: [], pots: [], showdown: alive.length > 1 };
    if (alive.length === 1) {
      const w = alive[0], amt = pot(st);
      st.seats[w].stack += amt; st.seats[w].won = amt;
      res.winners.push(w);
      res.pots.push({ amount: amt, winners: [w] });
      logLine(st, says(st.seats[w], 'wins') + ' ' + bbStr(amt), 'win');
    } else {
      while (st.board.length < 5) { st.deck.pop(); st.board.push(st.deck.pop()); }
      const scores = {};
      for (const i of alive) { scores[i] = evaluate(st.seats[i].hole.concat(st.board)); st.seats[i].shown = true; }
      res.scores = scores;
      const ps = pots(st);
      ps.forEach((p, k) => {
        const best = Math.max(...p.elig.map((i) => scores[i]));
        const ws = p.elig.filter((i) => scores[i] === best);
        const each = Math.floor(p.amount / ws.length);
        let odd = p.amount - each * ws.length;
        // odd chips go to the first winner after the button
        const ordered = ws.slice().sort((a, b) => ((a - st.button + 5) % 6) - ((b - st.button + 5) % 6));
        for (const w of ordered) { const x = each + (odd > 0 ? 1 : 0); if (odd > 0) odd--; st.seats[w].stack += x; st.seats[w].won += x; }
        res.pots.push({ amount: p.amount, winners: ws, side: k > 0 });
        for (const w of ws) if (!res.winners.includes(w)) res.winners.push(w);
        logLine(st, (ws.length > 1 ? ws.map((w) => st.seats[w].name).join(' and ') + ' split ' : says(st.seats[ws[0]], 'wins') + ' ') + (ps.length > 1 ? (k ? 'a side pot of ' : 'the main pot of ') : '') + bbStr(p.amount) + ' with ' + describe(best).toLowerCase(), 'win');
      });
    }
    for (const s of st.seats) { s.bet = 0; s.total = 0; }
    st.street = 'done';
    st.toAct = -1;
    st.result = res;
    return res;
  }
  const bbStr = (chips) => fmtBB(chips) + ' bb';
  function fmtBB(chips) { const v = chips / BB; return (Math.round(v * 10) / 10).toString(); }

  // ---------- reading opponents ----------
  // What a player's preflop actions say about their hand: a window of the playing order (0 = best hand).
  function preWindow(kind, pos, style) {
    const L = style ? STYLES[style].loose : 1;
    const openPct = { UTG: 0.18, HJ: 0.21, CO: 0.28, BTN: 0.44, SB: 0.37, BB: 0.4 }[pos] || 0.25;
    switch (kind) {
      case 'open': return [0, Math.min(0.95, openPct * L)];
      case 'iso': return [0, Math.min(0.9, 0.12 * L)];
      case '3bet': return [0, Math.min(0.5, 0.06 * L)];
      case '4bet': return [0, Math.min(0.3, 0.03 * L)];
      case 'call': return pos === 'BB' ? [0.04, Math.min(1, 0.55 * L)] : [0.03, Math.min(0.9, 0.2 * L)];
      case 'call3': return [0.02, Math.min(0.6, 0.08 * L)];
      case 'limp': return [0.04, Math.min(1, 0.45 * L)];
      case 'check': return [0.08, 1];
      default: return [0, 1];
    }
  }
  // An opponent model: combinations from the preflop window, and an acceptance test that leans toward stronger hands
  // for each bet or raise after the flop (and a little for each call).
  function rangeOf(st, i, dead, R) {
    R = R || Math.random;
    const s = st.seats[i];
    const w = preWindow(s.pre || 'check', seatPos(st, i), null);
    const combos = rangeCombos(topRange(w[0], w[1]), dead);
    const board = st.board.slice();
    const pressure = s.aggr * 1.4 + s.calls * 0.6;
    const accept = pressure > 0 && board.length >= 3 ? (h) => R() < Math.pow(quickStrength(h, board), pressure) : null;
    return { combos: combos.length ? combos : rangeCombos(topRange(0, 1), dead), accept, window: w, pressure };
  }
  // Your share of the pot against what the others in the hand are likely to hold.
  function equityVsField(st, i, samples, R) {
    const me = st.seats[i];
    const dead = me.hole.concat(st.board);
    const players = [{ hand: me.hole }];
    for (const j of inHand(st)) if (j !== i) { const r = rangeOf(st, j, dead, R); players.push({ range: r.combos, accept: r.accept }); }
    if (players.length === 1) return 1;
    return equity(players, st.board, { samples: samples || 1500, rng: R }).equity[0];
  }

  // ---------- the preflop situation of a seat ----------
  function preSituation(st, i) {
    const heroRaised = st.seats[i].pre === 'open' || st.seats[i].pre === 'iso' || st.seats[i].pre === '3bet';
    const raiserPos = st.openRaiser >= 0 ? seatPos(st, st.openRaiser) : null;
    // in position against the last raiser: you act after them on later streets
    const order = (k) => (k - st.button + 6) % 6 || 6; // SB = 1 ... BTN = 6
    const heroIP = st.lastRaiser >= 0 ? order(i) > order(st.lastRaiser) : false;
    return { raises: st.raises, limpers: st.limpers, raiser: raiserPos, heroRaised, heroIP };
  }
  // The chart's answer for the seat to act: { action, key, hand } or null when no chart applies.
  function preflopAdvice(st, i) {
    const pos = seatPos(st, i), s = st.seats[i];
    const sit = preSituation(st, i);
    const name = handClass(s.hole[0], s.hole[1]);
    const L = legal(st);
    if (sit.raises === 0 && sit.limpers === 0 && pos === 'BB') return { action: 'check', key: null, hand: name };
    const key = chartKey(pos, sit);
    if (!key) return { action: L.check ? 'check' : 'fold', key: null, hand: name };
    let action = chartAction(key, name);
    if (action === 'fold' && L.check) action = 'check';
    if (action === 'call' && L.check) action = 'check';
    return { action, key, hand: name };
  }
  // Raise sizes the coach and the opponents use: 2.5 bb opens (3 from the small blind), 3x a raise in position and
  // 4x out of position, 2.2x a re-raise; with 30 bb or less behind, all-in instead.
  function preflopRaiseTo(st, i) {
    const s = st.seats[i], pos = seatPos(st, i), L = legal(st);
    const sit = preSituation(st, i);
    let to;
    if (st.raises === 0) to = (st.limpers ? 4 * BB + st.limpers * BB : pos === 'SB' ? 3 * BB : 2.5 * BB);
    else if (st.raises === 1) to = st.currentBet * (sit.heroIP && pos !== 'SB' && pos !== 'BB' ? 3 : 4);
    else to = st.currentBet * 2.2;
    to = Math.round(to);
    if (s.stack + s.bet - to < 30 * BB && st.raises >= 1) to = L.raise ? L.raise.max : to;
    return L.raise ? Math.max(L.raise.min, Math.min(L.raise.max, to)) : 0;
  }

  // ---------- the opponents ----------
  function botAction(st, R) {
    R = R || Math.random;
    const i = st.toAct, s = st.seats[i], st_ = STYLES[s.style] || STYLES.reg, L = legal(st);
    const potNow = pot(st);
    if (st.street === 'preflop') {
      const adv = preflopAdvice(st, i);
      const name = adv.hand, pc = PCTILE[name];
      const sit = preSituation(st, i);
      let action = adv.action;
      // styles: the chart stretched or squeezed by how loose the player is
      const chartWidth = adv.key ? rangePct(new Set([...CHARTS[adv.key].raise, ...CHARTS[adv.key].call])) : 0.4;
      const widened = Math.min(0.95, chartWidth * st_.loose);
      if (s.style === 'rock' && action !== 'fold' && action !== 'check' && pc > widened) action = L.check ? 'check' : 'fold';
      if ((s.style === 'station' || s.style === 'maniac') && (action === 'fold') && pc <= widened) action = s.style === 'maniac' && R() < 0.5 ? 'raise' : 'call';
      if (s.style === 'station' && action === 'raise' && pc > 0.04 && R() < 0.65) action = L.check ? 'check' : 'call';
      if (s.style === 'maniac' && action === 'call' && R() < 0.45) action = 'raise';
      if (s.style === 'reg' && action === 'raise' && sit.raises >= 1 && pc > 0.03 && R() < 0.15) action = 'call';
      if (action === 'call' && sit.raises === 0 && s.style !== 'station' && !L.check) action = 'raise'; // regulars do not limp
      if (action === 'raise' && L.raise) return { type: 'raise', to: preflopRaiseTo(st, i) };
      if (action === 'call' && !L.check) {
        // a very large call (an all-in): only good hands
        if (L.toCall > 25 * BB && pc > 0.05 * st_.loose) return { type: 'fold' };
        return { type: 'call' };
      }
      return L.check ? { type: 'check' } : { type: 'fold' };
    }
    const eq = equityVsField(st, i, 400, R);
    const cls = classify(s.hole, st.board);
    const opp = inHand(st).length - 1;
    const tex = texture(st.board);
    const size = (f) => Math.round(Math.max(BB, potNow * f));
    if (L.check) {
      const wasAggressor = st.street === 'flop' ? st.preAggressor === i : s.aggr > 0;
      if (eq > 0.7 && L.raise) return { type: 'raise', to: clampTo(L, s.bet + size(tex.wet >= 2 ? 0.75 : 0.5)) };
      if (eq > 0.52 && L.raise && R() < 0.55 * st_.aggr) return { type: 'raise', to: clampTo(L, s.bet + size(0.5)) };
      if (cls.outs.length >= 8 && L.raise && R() < 0.4 * st_.aggr) return { type: 'raise', to: clampTo(L, s.bet + size(0.6)) };
      if (wasAggressor && opp === 1 && L.raise && R() < (tex.wet <= 1 ? 0.55 : 0.35) * st_.aggr) return { type: 'raise', to: clampTo(L, s.bet + size(tex.wet <= 1 ? 0.33 : 0.6)) };
      if (opp <= 2 && L.raise && R() < st_.bluff * 0.5) return { type: 'raise', to: clampTo(L, s.bet + size(0.6)) };
      return { type: 'check' };
    }
    const need = L.toCall / (potNow + L.toCall);
    const implied = cls.outs.length >= 8 && st.street !== 'river' && s.stack > L.toCall * 6 ? 0.06 : 0;
    if (eq > Math.max(0.68, need + 0.32) && L.raise && R() < 0.7 * st_.aggr + 0.1) return { type: 'raise', to: clampTo(L, st.currentBet * 3 + (potNow - st.currentBet) * 0.3) };
    if (s.style === 'maniac' && L.raise && R() < st_.bluff * 0.25) return { type: 'raise', to: clampTo(L, st.currentBet * 3) };
    if (eq + implied + st_.sticky >= need) return { type: 'call' };
    return { type: 'fold' };
  }
  function clampTo(L, to) { return L.raise ? Math.round(Math.max(L.raise.min, Math.min(L.raise.max, to))) : 0; }

  // ---------- the coach ----------
  // Before you act: your hand, the price, your share against their likely hands and the play it suggests.
  function coachAdvice(st, opts) {
    opts = opts || {};
    const i = st.toAct, s = st.seats[i], L = legal(st);
    const potNow = pot(st);
    const out = { street: st.street, pot: potNow, toCall: L.toCall, need: L.toCall ? L.toCall / (potNow + L.toCall) : 0 };
    if (st.street === 'preflop') {
      const adv = preflopAdvice(st, i);
      out.preflop = adv;
      out.hand = adv.hand;
      out.pos = seatPos(st, i);
      out.action = adv.action;
      out.raiseTo = adv.action === 'raise' ? preflopRaiseTo(st, i) : 0;
      out.why = preflopWhy(st, i, adv);
      return out;
    }
    const eq = equityVsField(st, i, opts.samples || 2500, opts.rng);
    const cls = classify(s.hole, st.board);
    const opp = inHand(st).length - 1;
    const tex = texture(st.board);
    out.equity = eq; out.cls = cls; out.opponents = opp; out.texture = tex;
    const hasDraw = cls.outs.length >= 8;
    if (L.check) {
      if (eq >= 0.62) { out.action = 'bet'; out.size = tex.wet >= 2 ? 0.75 : 0.5; out.why = 'You are ahead of the hands that would call you: bet for value.'; }
      else if (hasDraw && opp <= 2 && st.street !== 'river') { out.action = 'bet'; out.size = 0.6; out.why = 'A strong draw: betting wins the pot now or builds it for when you hit (a semi-bluff). Checking is fine too.'; out.close = true; }
      else if (eq >= 0.45) { out.action = 'check'; out.why = 'A middling hand: check, keep the pot small and see what they do.'; out.close = true; }
      else { out.action = 'check'; out.why = opp >= 2 ? 'Little to bet with and several players to get through: check.' : 'Not much to bet for value. Checking is free.'; }
      out.betTo = out.action === 'bet' ? clampTo(L, s.bet + Math.round(Math.max(BB, potNow * out.size))) : 0;
    } else {
      const implied = hasDraw && st.street !== 'river' && s.stack > L.toCall * 6;
      out.implied = implied;
      if (eq >= Math.max(0.7, out.need + 0.3) && L.raise) { out.action = 'raise'; out.raiseTo = clampTo(L, st.currentBet * 3); out.why = 'You are well ahead of the hands that bet like this: raise to get more chips in.'; }
      else if (eq >= out.need + 0.04) { out.action = 'call'; out.why = 'Your share is bigger than the price: calling makes money in the long run.'; }
      else if (eq >= out.need - 0.04 || (implied && eq >= out.need - 0.1)) { out.action = 'call'; out.close = true; out.why = implied ? 'A little short of the price, but your draw can win a big pot later (implied odds): calling is fine.' : 'Close: the price is about what your hand is worth. Either is fine.'; }
      else { out.action = 'fold'; out.why = 'Your share is smaller than the price: fold.'; }
    }
    return out;
  }
  const pct = (x) => Math.round(x * 100) + '%';
  function preflopWhy(st, i, adv) {
    const pos = seatPos(st, i);
    if (!adv.key) return adv.action === 'check' ? 'Nobody raised: you are in the big blind and see the flop for free.' : '';
    const title = CHART_TITLE[adv.key];
    const play = adv.action === 'raise' ? (st.raises === 0 ? 'raise' : 're-raise') : adv.action;
    const share = Math.round(rangePct(new Set([...CHARTS[adv.key].raise, ...CHARTS[adv.key].call])) * 100);
    return title + ': ' + adv.hand + ' is a ' + play + '. This chart plays ' + share + '% of hands' + (pos === 'BTN' ? ', the most of any seat.' : '.');
  }
  // After you act: how it compares with the coach. grade: 'good' | 'ok' | 'mistake'.
  function grade(adv, a, L) {
    const kind = a.type === 'raise' ? (L.check ? 'bet' : 'raise') : a.type;
    let g = 'good', note = '';
    const want = adv.action;
    if (adv.street === 'preflop') {
      const p = PCTILE[adv.hand];
      const did = a.type === 'raise' ? 'raise' : a.type === 'call' ? 'call' : a.type === 'check' ? 'check' : 'fold';
      if (did === want || (want === 'check' && did === 'check')) { g = 'good'; note = 'By the chart.'; }
      else if (did === 'fold' && L.check) { g = 'mistake'; note = 'You could have checked for free.'; }
      else if (want === 'fold') {
        const width = adv.preflop.key ? rangePct(new Set([...CHARTS[adv.preflop.key].raise, ...CHARTS[adv.preflop.key].call])) : 0.3;
        g = p <= width * 1.35 ? 'ok' : 'mistake';
        note = g === 'ok' ? 'A little loose: the chart folds ' + adv.hand + ' here.' : 'The chart folds ' + adv.hand + ' here: it loses money from this seat.';
      } else if (did === 'fold') {
        g = p < 0.12 ? 'mistake' : 'ok';
        note = g === 'mistake' ? adv.hand + ' is too strong to fold here: the chart says ' + (want === 'raise' ? 'raise' : 'call') + '.' : 'A little tight: the chart ' + (want === 'raise' ? 'raises' : 'calls') + ' ' + adv.hand + ' here.';
      } else if (want === 'raise' && did === 'call') {
        g = adv.toCall <= BB && adv.preflop.key && adv.preflop.key.startsWith('open') ? 'mistake' : 'ok';
        note = g === 'mistake' ? 'Limping lets the blinds in cheaply. Raise or fold when it is folded to you.' : 'Calling is playable, but the chart re-raises ' + adv.hand + ' for value and initiative.';
      } else if (want === 'call' && did === 'raise') { g = 'ok'; note = 'The chart calls ' + adv.hand + ' here; raising is aggressive but not a disaster.'; }
      else if (want === 'check' && did === 'raise') { g = PCTILE[adv.hand] < 0.25 ? 'good' : 'ok'; note = g === 'good' ? 'Raising a good hand from the big blind against limpers.' : 'Checking was free; raising this hand gains little.'; }
      return { grade: g, note, want, did };
    }
    const did = kind;
    const e = adv.equity;
    if (did === 'fold' && L.check) return { grade: 'mistake', note: 'You could have checked for free.', want, did };
    if (L.check) {
      if (did === 'check') {
        if (want === 'bet' && !adv.close && e >= 0.75) return { grade: 'ok', note: 'With about ' + pct(e) + ' you can bet for value: a check gives them a free card.', want, did };
        return { grade: 'good', note: want === 'bet' ? 'Checking is fine.' : 'Good check.', want, did };
      }
      if (want === 'bet') return { grade: 'good', note: 'Good bet.', want, did };
      if (adv.opponents >= 2 && e < 0.3) return { grade: 'mistake', note: 'A bluff against ' + adv.opponents + ' players rarely works: with about ' + pct(e) + ', check.', want, did };
      return { grade: e < 0.3 ? 'ok' : 'good', note: e < 0.3 ? 'A bluff. Fine now and then heads-up, on boards that suit your range.' : 'A thin bet. Fine.', want, did };
    }
    if (did === want) return { grade: 'good', note: did === 'fold' ? 'Good fold: you needed ' + pct(adv.need) + ' and had about ' + pct(e) + '.' : did === 'call' ? 'Good call: you needed ' + pct(adv.need) + ' and had about ' + pct(e) + '.' : 'Good raise.', want, did };
    if (adv.close && did !== 'raise') return { grade: 'ok', note: 'Close: you needed ' + pct(adv.need) + ' and had about ' + pct(e) + '. Either play is fine.', want, did };
    if (did === 'fold') return { grade: e >= adv.need + 0.15 ? 'mistake' : 'ok', note: 'You needed ' + pct(adv.need) + ' and had about ' + pct(e) + ': ' + (want === 'raise' ? 'raise' : 'call') + '.', want, did };
    if (did === 'call' && want === 'raise') return { grade: 'ok', note: 'Calling is fine, but with about ' + pct(e) + ' a raise wins more.', want, did };
    if (did === 'call' && want === 'fold') return { grade: e < adv.need - 0.1 ? 'mistake' : 'ok', note: 'You needed ' + pct(adv.need) + ' and had about ' + pct(e) + ': this call loses money in the long run.', want, did };
    if (did === 'raise' && want === 'fold') return { grade: 'mistake', note: 'A raise with about ' + pct(e) + ' against a bet: they will rarely fold enough.', want, did };
    if (did === 'raise' && want === 'call') return { grade: 'ok', note: 'Raising can work, but calling keeps their bluffs in and costs less when you are behind.', want, did };
    return { grade: 'ok', note: '', want, did };
  }

  // ---------- drills ----------
  function pick(R, a) { return a[randInt(R, a.length)]; }
  function dealFrom(deck, n) { return deck.splice(0, n); }

  // Which hand wins? Two hands and a board.
  function drillShowdown(R) {
    for (;;) {
      const d = shuffle(freshDeck(), R);
      const board = dealFrom(d, 5), a = dealFrom(d, 2), b = dealFrom(d, 2);
      const sa = evaluate(a.concat(board)), sb = evaluate(b.concat(board));
      // keep it interesting: both hands better than high card, or the same category
      if (category(sa) === 0 && category(sb) === 0 && R() < 0.8) continue;
      if (category(sa) !== category(sb) && R() < 0.45) continue;
      return { board, a, b, sa, sb, answer: sa > sb ? 'a' : sb > sa ? 'b' : 'split', decided: sa === sb ? 'tie' : decidedBy(Math.max(sa, sb), Math.min(sa, sb)) };
    }
  }
  // Open, call or fold: a seat, what happened before it, and a hand, more often near the edge of the chart.
  const EDGE = {};
  for (const key in CHARTS) {
    const near = new Set();
    for (const h of HANDS) {
      const a = chartAction(key, h.name);
      for (const [di, dj] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const r = h.row + di, c = h.col + dj;
        if (r < 0 || c < 0 || r > 12 || c > 12) continue;
        if (chartAction(key, HANDS[r * 13 + c].name) !== a) { near.add(h.name); break; }
      }
    }
    EDGE[key] = [...near];
  }
  const DRILL_SPOTS = [
    ['open.UTG', 'UTG', null], ['open.HJ', 'HJ', null], ['open.CO', 'CO', null], ['open.BTN', 'BTN', null], ['open.BTN', 'BTN', null], ['open.SB', 'SB', null],
    ['vsEarly.IP', 'CO', 'UTG'], ['vsEarly.IP', 'BTN', 'HJ'], ['vsLate.IP', 'BTN', 'CO'], ['vsEarly.SB', 'SB', 'HJ'], ['vsLate.SB', 'SB', 'BTN'],
    ['vsEarly.BB', 'BB', 'UTG'], ['vsLate.BB', 'BB', 'BTN'], ['vsLate.BB', 'BB', 'CO'], ['vsSB.BB', 'BB', 'SB'],
  ];
  function drillPreflop(R, only) {
    const spots = only ? DRILL_SPOTS.filter((s) => s[0].startsWith(only)) : DRILL_SPOTS;
    const [key, pos, raiser] = pick(R, spots);
    let name;
    if (R() < 0.65) name = pick(R, EDGE[key]);
    else { const all = []; for (const h of HANDS) for (let k = 0; k < h.combos; k++) all.push(h.name); name = pick(R, all); }
    const combo = pick(R, combosOf(name));
    if (R() < 0.5) combo.reverse();
    const answer = chartAction(key, name);
    return { key, pos, raiser, hand: name, combo, answer, title: CHART_TITLE[key], options: key.startsWith('open') ? ['fold', 'call', 'raise'] : ['fold', 'call', 'raise'] };
  }
  // Count the outs: a draw on the flop or the turn.
  const OUT_KINDS = [9, 8, 4, 12, 15, 8, 2];
  function drillOuts(R) {
    const wanted = pick(R, OUT_KINDS);
    for (let tries = 0; tries < 20000; tries++) {
      const d = shuffle(freshDeck(), R);
      const hole = dealFrom(d, 2), board = dealFrom(d, R() < 0.7 ? 3 : 4);
      const cls = classify(hole, board);
      if (cls.cat >= (wanted === 2 ? 2 : 1)) continue; // a pair already made would muddle the count
      const pocket = rankOf(hole[0]) === rankOf(hole[1]);
      if ((wanted === 2) !== pocket) continue;
      if (texture(board).words.includes('paired')) continue;
      const outs = countOuts(hole, board, wanted === 2 ? 3 : 4);
      if (outs.length !== wanted) continue;
      if (wanted === 2 && rankOf(hole[0]) < Math.max(...board.map(rankOf))) { /* an underpair: a set is still the plan */ }
      const choices = new Set([wanted]);
      const pool = [2, 4, 6, 8, 9, 10, 12, 15].filter((x) => x !== wanted);
      while (choices.size < 4) choices.add(pick(R, pool));
      return { hole, board, outs, count: wanted, draws: cls.draws, choices: [...choices].sort((a, b) => a - b), cardsLeft: board.length === 3 ? 2 : 1 };
    }
    return drillOuts(R);
  }
  // Pot odds: the share of the pot you must win to call.
  function drillPotOdds(R) {
    const pots = [4, 6, 8, 10, 12, 15, 20, 24, 30, 40];
    const potB = pick(R, pots);
    const frac = pick(R, [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5]);
    const bet = Math.round(potB * frac * 2) / 2;
    const need = bet / (potB + 2 * bet);
    const outs = pick(R, [4, 8, 9, 12, 15]);
    const street = pick(R, ['flop', 'turn']);
    const exact = street === 'turn' ? outs / 46 : outs / 47; // one card to come: the next card
    return { pot: potB, bet, need, outs, street, hit: exact, answer: exact >= need ? 'call' : 'fold', close: Math.abs(exact - need) < 0.03 };
  }
  // Who is ahead before the flop, and by how much?
  const MATCHUPS = [
    ['pair', 'overs'], ['pair', 'under'], ['dominated', null], ['overs', 'unders'], ['pair', 'oneover'], ['ak', 'pair'], ['suited', 'pair'], ['random', null],
  ];
  const EQ_BUCKETS = [
    { lo: 0.7, hi: 1, text: 'Big favourite (70% or more)' },
    { lo: 0.55, hi: 0.7, text: 'Favourite (55 to 70%)' },
    { lo: 0.45, hi: 0.55, text: 'About even (45 to 55%)' },
    { lo: 0.3, hi: 0.45, text: 'Underdog (30 to 45%)' },
    { lo: 0, hi: 0.3, text: 'Big underdog (under 30%)' },
  ];
  function drillEquity(R) {
    for (;;) {
      const [kind] = pick(R, MATCHUPS);
      const d = shuffle(freshDeck(), R);
      let a = dealFrom(d, 2), b = dealFrom(d, 2);
      const ra = a.map(rankOf), rb = b.map(rankOf);
      const pa = ra[0] === ra[1], pb = rb[0] === rb[1];
      const ok = {
        pair: pa && !pb, overs: false, dominated: !pa && !pb && (ra.includes(rb[0]) || ra.includes(rb[1])) && ra[0] !== ra[1],
        ak: (Math.min(...ra) >= 11 && !pa) && pb, suited: suitOf(a[0]) === suitOf(a[1]) && !pa && pb, random: true,
      };
      let good = false;
      if (kind === 'pair') good = ok.pair && (Math.min(...rb) > ra[0] || Math.max(...rb) < ra[0] || R() < 0.3);
      else if (kind === 'dominated') good = ok.dominated;
      else if (kind === 'overs') good = !pa && !pb && Math.min(...ra) > Math.max(...rb);
      else if (kind === 'ak') good = ok.ak;
      else if (kind === 'suited') good = ok.suited;
      else good = true;
      if (!good) continue;
      if (R() < 0.5) { const t = a; a = b; b = t; }
      const e = equity([{ hand: a }, { hand: b }], [], { samples: 30000, rng: R });
      const ea = e.equity[0];
      if (EQ_BUCKETS.some((k) => Math.abs(ea - k.lo) < 0.015 && k.lo > 0)) continue; // too near an edge to call fairly
      const answer = EQ_BUCKETS.findIndex((k) => ea >= k.lo && ea < k.hi + (k.hi === 1 ? 1 : 0));
      return { a, b, equity: ea, win: e.win[0], tie: e.tie[0], answer };
    }
  }
  // What is the nuts? The best two cards anyone could hold on this board.
  function drillNuts(R) {
    for (;;) {
      const d = shuffle(freshDeck(), R);
      const board = dealFrom(d, pick(R, [3, 4, 5, 5]));
      const rest = d;
      const byScore = new Map();
      for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
        const s = evaluate([rest[i], rest[j]].concat(board));
        if (!byScore.has(s)) byScore.set(s, []);
        byScore.get(s).push([rest[i], rest[j]]);
      }
      const scores = [...byScore.keys()].sort((a, b) => b - a);
      if (scores.length < 6) continue;
      const nut = scores[0];
      if (board.length >= 5 && evaluate(board) === nut) continue; // the board itself is the nuts: no question to ask
      const others = [scores[1], scores[2], scores[3 + randInt(R, Math.min(6, scores.length - 3))]];
      if (new Set(others.map(category).concat([category(nut)])).size < 2 && R() < 0.5) continue;
      const opts = [nut].concat(others).map((s) => ({ score: s, hand: pick(R, byScore.get(s)), desc: describe(s), many: byScore.get(s).length }));
      shuffle(opts, R);
      return { board, options: opts, answer: opts.findIndex((o) => o.score === nut), nut: describe(nut), nutCombos: byScore.get(nut).length };
    }
  }

  // ---------- statistics of your play ----------
  function emptyStats() {
    return { hands: 0, won: 0, vpip: 0, pfr: 0, threeBet: 0, threeBetChance: 0, sawFlop: 0, wtsd: 0, wsd: 0, wonHands: 0,
      good: 0, ok: 0, mistakes: 0, preGood: 0, preTotal: 0, postGood: 0, postTotal: 0, biggestPot: 0, rebuys: 0, startedAt: 0, leaks: {} };
  }

  const PK = {
    RANKS, SUITS, CATEGORY, RANK_NAME, RANK_PLURAL, BB, SB, rankOf, suitOf, cardStr, parseCard, parseCards, rng, shuffle, freshDeck,
    evaluate, category, describe, best5, decidedBy, straightHigh, HANDS, HAND_INDEX, handClass, combosOf, parseRange, comboCount, rangePct,
    EQUITY, ORDER, PCTILE, topRange, POSITIONS, POS_NAME, CHART_TEXT, CHARTS, CHART_TITLE, chartAction, chartKey,
    equity, rangeCombos, classify, quickStrength, countOuts, texture, STYLES, TABLE_MIX, newTable, seatPos, inHand, pot, pots, startHand, legal, act,
    runOutStep, finish, fmtBB, bbStr, rangeOf, equityVsField, preflopAdvice, preflopRaiseTo, preSituation, botAction, coachAdvice, grade, pct,
    drillShowdown, drillPreflop, drillOuts, drillPotOdds, drillEquity, drillNuts, EQ_BUCKETS, EDGE, emptyStats,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = PK;
  else root.PK = PK;
})(typeof window !== 'undefined' ? window : globalThis);
