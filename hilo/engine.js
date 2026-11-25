/* Blackjack + Hi-Lo engine for the trainer. The house rules are a plain object (see DEFAULTS); every function that
   depends on them takes it as `R`. Fixed: double on two cards only, split aces get one card each and are not resplit,
   no surrender. R.hole: 'peek' (the dealer has a hole card and checks it for blackjack) or 'enhc' (European: the dealer's
   second card comes after the players, and a dealer blackjack takes doubled and split bets too). Card values: 1 = ace, 2..9, 10 = any ten-value card. */
(function (root) {
  'use strict';
  var DEFAULTS = { decks: 6, h17: false, das: true, doubleOn: 'any', maxHands: 4, bj: 1.5, pen: 0.75, hole: 'peek', spread: 12 };
  var CHOICES = { decks: [4, 6, 8], h17: [false, true], das: [true, false], doubleOn: ['any', '9-11', '10-11'],
    maxHands: [2, 3, 4], bj: [1.5, 1.2], pen: [0.5, 0.65, 0.75, 0.85], hole: ['peek', 'enhc'], spread: [5, 8, 12, 16, 20] };
  // Bets at true counts +2, +3, +4 and +5 or more, for each biggest bet. Below +2 the bet is 1 unit.
  var RAMPS = { 5: [2, 3, 4, 5], 8: [2, 4, 6, 8], 12: [2, 4, 8, 12], 16: [2, 5, 10, 16], 20: [3, 6, 12, 20] };

  function rules(r) {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = r && CHOICES[k].indexOf(r[k]) >= 0 ? r[k] : DEFAULTS[k];
    return out;
  }
  function isDefault(R) { for (var k in DEFAULTS) if (R[k] !== DEFAULTS[k]) return false; return true; }
  function key(R) { return [R.decks, +R.h17, +R.das, R.doubleOn, R.maxHands, R.bj, R.pen, R.hole, R.spread].join('|'); }
  function shoeSize(R) { return R.decks * 52; }
  function cutAt(R) { return Math.round(R.decks * 52 * R.pen); }

  function tag(v) { return v >= 2 && v <= 6 ? 1 : (v === 1 || v >= 10) ? -1 : 0; }
  function total(cards) {
    var t = 0, ace = false;
    for (var i = 0; i < cards.length; i++) { t += cards[i]; if (cards[i] === 1) ace = true; }
    var soft = ace && t + 10 <= 21;
    return { t: soft ? t + 10 : t, soft: soft };
  }
  // May these two cards be doubled under the rules? (afterSplit: the hand came from a split.)
  function canDouble(cards, R, afterSplit) {
    if (cards.length !== 2 || (afterSplit && !R.das)) return false;
    if (R.doubleOn === 'any') return true;
    var v = total(cards);
    return !v.soft && v.t <= 11 && v.t >= (R.doubleOn === '9-11' ? 9 : 10);
  }

  // The chart. Columns: dealer 2 3 4 5 6 7 8 9 10 A. H hit, S stand, D double (else hit),
  // d double (else stand), P split.
  function hardRow(t, R) {
    if (t <= 8) return 'HHHHHHHHHH';
    if (t === 9) return 'HDDDDHHHHH';
    if (t === 10) return 'DDDDDDDDHH';
    if (t === 11) return R.h17 ? 'DDDDDDDDDD' : 'DDDDDDDDDH';
    if (t === 12) return 'HHSSSHHHHH';
    if (t <= 16) return 'SSSSSHHHHH';
    return 'SSSSSSSSSS';
  }
  function softRow(t, R) {
    if (t <= 12) return 'HHHHHHHHHH';
    if (t <= 14) return 'HHHDDHHHHH';
    if (t <= 16) return 'HHDDDHHHHH';
    if (t === 17) return 'HDDDDHHHHH';
    if (t === 18) return R.h17 ? 'dddddSSHHH' : 'SddddSSHHH';
    if (t === 19) return R.h17 ? 'SSSSdSSSSS' : 'SSSSSSSSSS';
    return 'SSSSSSSSSS';
  }
  function pairRow(v, R) {
    if (v === 1 || v === 8) return 'PPPPPPPPPP';
    if (v === 2 || v === 3) return R.das ? 'PPPPPPHHHH' : 'HHPPPPHHHH';
    if (v === 4) return R.das ? 'HHHPPHHHHH' : null;
    if (v === 6) return R.das ? 'PPPPPHHHHH' : 'HPPPPHHHHH';
    if (v === 7) return 'PPPPPPHHHH';
    if (v === 9) return 'PPPPPSPPSS';
    return null;
  }
  function col(up) { return up === 1 ? 9 : up - 2; }

  function basic(cards, up, canD, canS, R) {
    var c = col(up), v = total(cards), a;
    // No hole card: against a ten or an ace the extra money of a double or a split is lost to a dealer blackjack,
    // so there the chart never doubles, keeps a pair of 8s together and splits aces only against the ten.
    var risky = R.hole === 'enhc' && (up === 10 || up === 1);
    if (canS && cards.length === 2 && cards[0] === cards[1]) {
      var p = pairRow(cards[0], R);
      if (p && p.charAt(c) === 'P' && !(risky && (cards[0] === 8 || up === 1))) return 'P';
    }
    a = (v.soft ? softRow(v.t, R) : hardRow(v.t, R)).charAt(c);
    if (risky && a === 'D') a = 'H';
    if (a === 'D') return canD ? 'D' : 'H';
    if (a === 'd') return canD ? 'D' : 'S';
    return a;
  }

  // The Illustrious 18 (Schlesinger), Hi-Lo, floored true count: insurance and the hands below.
  // At true count >= idx play `hi`, below it play `lo`. Three of them move when the dealer hits soft 17.
  var INSURANCE_INDEX = 3;
  var devCache = {};
  function devs(R) {
    var k = +R.h17 + R.doubleOn + R.hole;
    if (devCache[k]) return devCache[k];
    var list = [
      { t: 16, up: 10, idx: 0,  hi: 'S', lo: 'H' },
      { t: 15, up: 10, idx: 4,  hi: 'S', lo: 'H' },
      { pair: 10, up: 5, idx: 5, hi: 'P', lo: 'S' },
      { pair: 10, up: 6, idx: 4, hi: 'P', lo: 'S' },
      { t: 10, up: 10, idx: 4,  hi: 'D', lo: 'H' },
      { t: 12, up: 3,  idx: 2,  hi: 'S', lo: 'H' },
      { t: 12, up: 2,  idx: 3,  hi: 'S', lo: 'H' },
      { t: 11, up: 1,  idx: 1,  hi: 'D', lo: 'H', s17only: true },   // dealer hits soft 17: always double
      { t: 9,  up: 2,  idx: 1,  hi: 'D', lo: 'H' },
      { t: 10, up: 1,  idx: R.h17 ? 3 : 4, hi: 'D', lo: 'H' },
      { t: 9,  up: 7,  idx: 3,  hi: 'D', lo: 'H' },
      { t: 16, up: 9,  idx: 5,  hi: 'S', lo: 'H' },
      { t: 13, up: 2,  idx: -1, hi: 'S', lo: 'H' },
      { t: 12, up: 4,  idx: 0,  hi: 'S', lo: 'H' },
      { t: 12, up: 5,  idx: -2, hi: 'S', lo: 'H' },
      { t: 12, up: 6,  idx: R.h17 ? -3 : -1, hi: 'S', lo: 'H' },
      { t: 13, up: 3,  idx: -2, hi: 'S', lo: 'H' }
    ].filter(function (d) {
      if (d.s17only && R.h17) return false;
      if (d.hi === 'D' && R.hole === 'enhc' && (d.up === 10 || d.up === 1)) return false;   // not worth it without a hole card
      if (d.hi === 'D' && !canDouble([d.t - 2, 2], R, false)) return false;   // this total may not be doubled here
      return true;
    });
    list.map = {};
    list.forEach(function (d) { list.map[(d.pair ? 'p' + d.pair : 'h' + d.t) + 'v' + d.up] = d; });
    return (devCache[k] = list);
  }
  function findDev(cards, up, canS, R) {
    var m = devs(R).map, v = total(cards);
    if (cards.length === 2 && cards[0] === 10 && cards[1] === 10 && canS && m['p10v' + up]) return m['p10v' + up];
    if (v.soft) return null;
    return m['h' + v.t + 'v' + up] || null;
  }
  // Correct play at a given true count (basic strategy + deviations).
  function play(cards, up, tc, canD, canS, useDev, R) {
    var b = basic(cards, up, canD, canS, R);
    if (!useDev || b === 'P') return b;
    var d = findDev(cards, up, canS, R);
    if (!d) return b;
    var a = tc >= d.idx ? d.hi : d.lo;
    if (a === 'D' && !canD) a = 'H';
    return a;
  }

  // Decks left are read off the discard tray to the nearest half deck; the
  // true count is the running count divided by that, rounded down.
  function decksLeft(cardsLeft) { return Math.max(0.5, Math.round(cardsLeft / 26) / 2); }
  function trueCount(rc, cardsLeft) { return Math.floor(rc / decksLeft(cardsLeft)); }

  function ramp(tc, R) { return tc <= 1 ? 1 : RAMPS[R.spread][Math.min(tc, 5) - 2]; }
  function rampSteps(R) { return [1].concat(RAMPS[R.spread]); }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Monte Carlo. opt.spread: bet the ramp (else flat 1 unit). opt.dev: use
  // insurance + deviations. opt.pathStep: record the running result every N rounds.
  function simulate(n, opt, rand, R) {
    rand = rand || Math.random; R = R || DEFAULTS;
    var SHOE = shoeSize(R), CUT = cutAt(R);
    var shoe = new Uint8Array(SHOE), k = 0, d, v, i, j, x;
    for (d = 0; d < R.decks * 4; d++) for (v = 1; v <= 13; v++) shoe[k++] = v > 10 ? 10 : v;
    var pos = SHOE, rc = 0, net = 0, init = 0, sumsq = 0;
    var path = opt.pathStep ? [0] : null;
    function draw() { var c = shoe[pos++]; rc += tag(c); return c; }
    for (var r = 0; r < n; r++) {
      if (pos >= CUT) {
        for (i = SHOE - 1; i > 0; i--) { j = Math.floor(rand() * (i + 1)); x = shoe[i]; shoe[i] = shoe[j]; shoe[j] = x; }
        pos = 0; rc = 0;
      }
      var bet = opt.spread ? ramp(trueCount(rc, SHOE - pos), R) : 1;
      var res = 0, noHole = R.hole !== 'peek';
      var p1 = draw(), up = draw(), p2 = draw(), hole = noHole ? 0 : shoe[pos++];
      var playerBJ = (p1 === 1 && p2 === 10) || (p1 === 10 && p2 === 1);
      var insured = up === 1 && opt.dev && trueCount(rc, SHOE - pos) >= INSURANCE_INDEX;
      var dealerBJ = !noHole && ((up === 1 && hole === 10) || (up === 10 && hole === 1));
      var hands = [{ c: [p1, p2], bet: bet, ace: false, split: false }];
      if (!playerBJ && !dealerBJ) {
        for (i = 0; i < hands.length; i++) {
          var h = hands[i];
          if (h.c.length === 1) h.c.push(draw());
          if (h.ace) continue;
          for (;;) {
            if (total(h.c).t >= 21) break;
            var canS = h.c.length === 2 && h.c[0] === h.c[1] && hands.length < R.maxHands;
            var a = play(h.c, up, trueCount(rc, SHOE - pos), canDouble(h.c, R, h.split), canS, opt.dev, R);
            if (a === 'S') break;
            if (a === 'H') { h.c.push(draw()); continue; }
            if (a === 'D') { h.bet += bet; h.c.push(draw()); break; }
            v = h.c[0]; h.c = [v, draw()]; h.ace = v === 1; h.split = true;
            hands.push({ c: [v], bet: bet, ace: v === 1, split: true });
            if (h.ace) break;
          }
        }
      }
      var live = false;
      for (i = 0; i < hands.length; i++) if (total(hands[i].c).t <= 21) live = true;
      var dc = [up];
      if (!noHole) { dc.push(hole); rc += tag(hole); }
      else if (playerBJ ? (up === 1 || up === 10) : (live || insured)) {      // the dealer's second card, when a bet depends on it
        dc.push(draw()); dealerBJ = total(dc).t === 21;
      }
      if (insured) res += dealerBJ ? bet : -bet / 2;
      if (playerBJ) res += dealerBJ ? 0 : R.bj * bet;
      else if (dealerBJ) for (i = 0; i < hands.length; i++) res -= hands[i].bet;
      else {
        var dv = total(dc);
        if (live) while (dv.t < 17 || (R.h17 && dv.t === 17 && dv.soft)) { dc.push(draw()); dv = total(dc); }
        for (i = 0; i < hands.length; i++) {
          var pt = total(hands[i].c).t;
          if (pt > 21) res -= hands[i].bet;
          else if (dv.t > 21 || pt > dv.t) res += hands[i].bet;
          else if (pt < dv.t) res -= hands[i].bet;
        }
      }
      net += res; init += bet; sumsq += res * res;
      if (path && (r + 1) % opt.pathStep === 0) path.push(net);
    }
    var mean = net / n;
    return { rounds: n, net: net, init: init, sumsq: sumsq, edge: net / init, avgBet: init / n, perRound: mean,
             sd: Math.sqrt(sumsq / n - mean * mean), path: path };
  }

  var api = { DEFAULTS: DEFAULTS, CHOICES: CHOICES, rules: rules, isDefault: isDefault, key: key, shoeSize: shoeSize,
    cutAt: cutAt, tag: tag, total: total, canDouble: canDouble, basic: basic, play: play, findDev: findDev, devs: devs,
    INSURANCE_INDEX: INSURANCE_INDEX, decksLeft: decksLeft, trueCount: trueCount, ramp: ramp, rampSteps: rampSteps,
    simulate: simulate, mulberry32: mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BJ = api;
})(typeof self !== 'undefined' ? self : this);
