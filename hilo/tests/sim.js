// node sim.js [hands] : edge of a perfect player under several rule sets
const BJ = require('../engine.js');
const N = +process.argv[2] || 2e6;
const sets = [['standard', {}], ['dealer hits soft 17', { h17: true }], ['no double after split', { das: false }], ['6 to 5', { bj: 1.2 }],
  ['double 10-11 only', { doubleOn: '10-11' }], ['8 decks', { decks: 8 }], ['spread 1-5', { spread: 5 }], ['split to 2', { maxHands: 2 }], ['no hole card', { hole: 'enhc' }]];
for (const [name, r] of sets) {
  const R = BJ.rules(Object.assign({}, BJ.DEFAULTS, r));
  const out = [['flat', {}], ['count', { spread: true }], ['count+dev', { spread: true, dev: true }]].map(([m, opt]) => {
    const x = BJ.simulate(N, opt, BJ.mulberry32(12345), R);
    return m + ' ' + (100 * x.edge).toFixed(2) + '% (' + (100 * x.perRound).toFixed(2) + ' u/100)';
  });
  console.log(name.padEnd(24), out.join('   '));
}
