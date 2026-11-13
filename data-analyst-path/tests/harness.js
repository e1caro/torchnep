/* Loads the site's data and logic into Node (no DOM) so it can be unit-tested. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = global;
const mem = {};
global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
global.DA = undefined;
const files = ['js/data/backgrounds.js', 'js/data/datasets.js', 'js/data/datasets-dotco.js', 'js/data/sql-worlds.js', 'js/data/curriculum.js', 'js/data/prompts.js',
  'js/data/questions.js', 'js/data/feed.js', 'js/data/puzzles.js', 'js/data/missions.js', 'js/ui.js', 'js/game.js', 'js/drill-core.js',
  'js/feed-core.js', 'js/arcade-core.js', 'js/journey-core.js', 'js/sync.js', 'js/cloud.js'];
files.forEach((f) => {
  const p = path.join(root, f);
  if (fs.existsSync(p)) (0, eval)(fs.readFileSync(p, 'utf8') + '\n//# sourceURL=' + f);
});

const DA = global.DA;
let clock = new Date(2026, 10, 9, 12, 0, 0);
DA.ui.now = () => new Date(clock.getTime());
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }
async function runAll() {
  let passed = 0, failed = 0;
  for (const t of queue) {
    try { resetState(); setDay('2026-11-09'); if (DA.drill) DA.drill.rand = Math.random; if (DA.arcade) DA.arcade.rand = Math.random; await t.fn(); passed++; console.log('PASS ' + t.name); } catch (e) { failed++; console.log('FAIL ' + t.name + '\n  ' + (e.stack || e)); }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exitCode = 1;
}
function setDay(iso) { const [y, m, d] = iso.split('-').map(Number); clock = new Date(y, m - 1, d, 12, 0, 0); }
function advance(ms) { clock = new Date(clock.getTime() + ms); }
function resetState() { DA.ui.state = DA.ui.sanitize({ v: 2 }); DA.game._queue.length = 0; }
module.exports = {
  DA, root, test, runAll, setDay, advance, resetState,
};
