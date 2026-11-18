/* Lists every interface sentence of Bloomdoku: the t('…') and T('…') literals in js/*.js plus the worlds catalog.
 * Used by tests/unit.js (every sentence must have its Spanish) and handy when adding translations:
 *   node tools/strings.js            prints the sentences without Spanish yet */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function literals() {
  const out = new Set();
  for (const f of fs.readdirSync(path.join(root, 'js'))) {
    if (f === 'es.js' || f === 'engine.js') continue;
    const src = fs.readFileSync(path.join(root, 'js', f), 'utf8');
    const re = /\b[tT]\(\s*'((?:[^'\\]|\\.)*)'/g;
    let m;
    while ((m = re.exec(src))) out.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  }
  return out;
}
function catalog() {
  const W = require(path.join(root, 'js', 'worlds.js'));
  const out = new Set();
  W.worlds.forEach((w) => {
    [w.name, w.rule, w.intro].concat(w.concepts).forEach((s) => out.add(s));
    w.levels.forEach((lv) => { out.add(lv.name); out.add(lv.teaches); });
  });
  W.DAILY.forEach((d) => out.add(d.name));
  W.TITLES.forEach((x) => out.add(x[1]));
  return out;
}
function spanish() {
  const box = { BD: { i18n: { es: {} } } };
  new Function('window', fs.readFileSync(path.join(root, 'js', 'es.js'), 'utf8'))(box);
  return box.BD.i18n.es;
}
function all() { return new Set([...literals(), ...catalog()]); }
module.exports = { all, spanish };

if (require.main === module) {
  let es = {};
  try { es = spanish(); } catch (e) { /* no es.js yet */ }
  const missing = [...all()].filter((s) => !es[s]);
  missing.forEach((s) => console.log(JSON.stringify(s)));
  console.error(missing.length + ' without Spanish, ' + all().size + ' sentences in all');
}
