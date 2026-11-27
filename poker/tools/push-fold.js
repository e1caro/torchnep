/* Computes PUSH_FOLD in js/engine.js: the push-or-fold game between the small blind and the big blind, heads-up or
 * when everyone else has folded, blinds 0.5 and 1 bb, no antes, stacks of S big blinds.
 *
 *   node tools/push-fold.js [runouts per pair of hands, default 3000]
 *
 * 1. The equity of each of the 169 starting hands against each other one, all in before the flop: random combinations
 *    that share no card, five random board cards (Monte Carlo). The weight of a pair of hands is how many pairs of
 *    combinations they make together (AK against AA: 4 x 3 x ... cards that do not clash).
 * 2. For each stack from 1 to 20 bb in steps of 0.5: fictitious play between "the small blind pushes all-in or folds"
 *    and "the big blind calls or folds". Folding costs the small blind 0.5 bb; a fold by the big blind wins it 1 bb;
 *    a call is a showdown for S bb each. The game is zero-sum, so the averaged strategies converge on the equilibrium.
 * 3. For each hand, the biggest stack at which it pushes (or calls); 20+ is written as 20.5.
 *
 * Prints the string to paste into the engine, and a few checks to compare with published charts. */
'use strict';
const path = require('path');
const PK = require(path.join(__dirname, '..', 'js', 'engine.js'));
const N = +process.argv[2] || 3000;
const R = PK.rng(424242);
const H = PK.HANDS.length;
const combos = PK.HANDS.map((h) => PK.combosOf(h.name));

// 1. equity and weight of every pair of hands
const E = Array.from({ length: H }, () => new Float64Array(H));
const W = Array.from({ length: H }, () => new Float64Array(H));
const t0 = Date.now();
const cards = new Array(9), used = new Uint8Array(52);
for (let i = 0; i < H; i++) {
  for (let j = i; j < H; j++) {
    const pairs = [];
    for (const a of combos[i]) for (const b of combos[j]) if (a[0] !== b[0] && a[0] !== b[1] && a[1] !== b[0] && a[1] !== b[1]) pairs.push([a, b]);
    W[i][j] = W[j][i] = pairs.length;
    if (!pairs.length) { E[i][j] = E[j][i] = 0.5; continue; }
    let share = 0;
    for (let k = 0; k < N; k++) {
      const [a, b] = pairs[Math.floor(R() * pairs.length)];
      used.fill(0);
      used[a[0]] = used[a[1]] = used[b[0]] = used[b[1]] = 1;
      let n = 0;
      while (n < 5) { const c = Math.floor(R() * 52); if (!used[c]) { used[c] = 1; cards[2 + n] = c; n++; } }
      cards[0] = a[0]; cards[1] = a[1];
      const sa = PK.evaluate(cards.slice(0, 7));
      cards[0] = b[0]; cards[1] = b[1];
      const sb = PK.evaluate(cards.slice(0, 7));
      share += sa > sb ? 1 : sa === sb ? 0.5 : 0;
    }
    E[i][j] = share / N;
    E[j][i] = 1 - E[i][j];
  }
}
console.error('equities: ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');

// 2. the equilibrium at each stack size
const STACKS = [];
for (let s = 1; s <= 20; s += 0.5) STACKS.push(s);
function solve(S, iters) {
  const push = new Float64Array(H).fill(1), call = new Float64Array(H).fill(1);
  for (let t = 1; t <= iters; t++) {
    // the big blind's best answer to the pushes so far
    const brCall = new Float64Array(H);
    for (let j = 0; j < H; j++) {
      let w = 0, ev = 0;
      for (let i = 0; i < H; i++) { const x = W[i][j] * push[i]; w += x; ev += x * (E[j][i] * 2 * S - S); }
      brCall[j] = w > 0 && ev / w > -1 ? 1 : 0;
    }
    // the small blind's best answer to the calls so far
    const brPush = new Float64Array(H);
    for (let i = 0; i < H; i++) {
      let w = 0, ev = 0;
      for (let j = 0; j < H; j++) { const x = W[i][j]; w += x; ev += x * (call[j] * (E[i][j] * 2 * S - S) + (1 - call[j]) * 1); }
      brPush[i] = ev / w > -0.5 ? 1 : 0;
    }
    for (let k = 0; k < H; k++) { push[k] += (brPush[k] - push[k]) / (t + 1); call[k] += (brCall[k] - call[k]) / (t + 1); }
  }
  return { push, call };
}
const pushAt = PK.HANDS.map(() => []), callAt = PK.HANDS.map(() => []);
const share = (set) => { let n = 0; set.forEach((on, k) => { if (on) n += PK.HANDS[k].combos; }); return n / 1326; };
const report = {};
for (const S of STACKS) {
  const { push, call } = solve(S, 3000);
  const p = Array.from(push, (x) => x >= 0.5), c = Array.from(call, (x) => x >= 0.5);
  p.forEach((on, k) => pushAt[k].push(on));
  c.forEach((on, k) => callAt[k].push(on));
  report[S] = [share(p), share(c)];
}
// 3. the biggest stack at which each hand still pushes / calls
const limit = (list) => { let best = 0; list.forEach((on, k) => { if (on) best = STACKS[k]; }); return best >= 20 ? 20.5 : best; };
const out = PK.HANDS.map((h, k) => h.name + ':' + limit(pushAt[k]) + '/' + limit(callAt[k]));
console.error('the small blind pushes / the big blind calls, share of hands:');
for (const S of [2, 3, 5, 8, 10, 12, 15, 20]) console.error('  ' + String(S).padStart(2) + ' bb: ' + (report[S][0] * 100).toFixed(1) + '% / ' + (report[S][1] * 100).toFixed(1) + '%');
const show = ['22', 'A2o', 'K2o', 'K2s', 'Q2o', 'J2o', 'T2o', '72o', '32o', 'J5o', '87s', 'K9o', 'Q8o', 'A2s'];
console.error('  ' + show.map((n) => n + ' ' + out[PK.HAND_INDEX[n]].split(':')[1]).join(', '));
console.log(out.join(' '));
