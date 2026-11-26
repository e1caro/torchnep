/* Computes EQ_VS_RANDOM in js/engine.js: each of the 169 starting hands against one random hand, all five board
 * cards dealt, by Monte Carlo (split pots count half).   node tools/hand-equity.js [runouts per hand, default 400000]
 * Prints the string to paste into the engine; its figures carry about ±0.08% of noise at 400,000 runouts. */
'use strict';
const path = require('path');
const PK = require(path.join(__dirname, '..', 'js', 'engine.js'));
const N = +process.argv[2] || 400000;
const R = PK.rng(20261126);
const out = [];
const t0 = Date.now();
for (const h of PK.HANDS) {
  const hand = PK.combosOf(h.name)[0];
  const e = PK.equity([{ hand }, { range: PK.rangeCombos(PK.topRange(0, 1), hand) }], [], { samples: N, rng: R });
  out.push(h.name + (e.equity[0] * 100).toFixed(1));
}
console.error('done in ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
console.log(out.join(' '));
