// Exact 6-deck expected values (composition-dependent dealer, player follows the
// engine's basic strategy after the first action) for the borderline cells.
const BJ = require('../engine.js');
const R = BJ.rules(null);   // the standard rules
function dealerEV(comp, left, dc, pt) {            // EV of standing on pt
  const d = BJ.total(dc).t;
  if (d >= 17) return d > 21 || pt > d ? 1 : pt < d ? -1 : 0;
  let ev = 0;
  for (let v = 1; v <= 10; v++) if (comp[v]) {
    const p = comp[v] / left; comp[v]--; dc.push(v);
    ev += p * dealerEV(comp, left - 1, dc, pt);
    dc.pop(); comp[v]++;
  }
  return ev;
}
function standEV(comp, left, up, cards) { const t = BJ.total(cards).t; return t > 21 ? -1 : dealerEV(comp, left, [up], t); }
function hitEV(comp, left, up, cards) {
  let ev = 0;
  for (let v = 1; v <= 10; v++) if (comp[v]) {
    const p = comp[v] / left; comp[v]--; cards.push(v);
    const t = BJ.total(cards).t;
    let e;
    if (t > 21) e = -1;
    else if (BJ.basic(cards, up, false, false, R) === 'H') e = hitEV(comp, left - 1, up, cards);
    else e = standEV(comp, left - 1, up, cards);
    ev += p * e; cards.pop(); comp[v]++;
  }
  return ev;
}
function dblEV(comp, left, up, cards) {
  let ev = 0;
  for (let v = 1; v <= 10; v++) if (comp[v]) {
    const p = comp[v] / left; comp[v]--; cards.push(v);
    ev += p * 2 * standEV(comp, left - 1, up, cards); cards.pop(); comp[v]++;
  }
  return ev;
}
for (const [a, b, up] of [[1,2,5],[1,4,4],[1,2,4],[1,3,4],[1,6,2],[1,7,2]]) {
  const comp = [0,24,24,24,24,24,24,24,24,24,96]; comp[a]--; comp[b]--; comp[up]--;
  const left = 309, c = [a, b];
  const r = { S: standEV(comp, left, up, c), H: hitEV(comp, left, up, c), D: dblEV(comp, left, up, c) };
  const bestA = Object.keys(r).reduce((x, y) => r[x] > r[y] ? x : y);
  console.log(`${a},${b} v ${up}: S ${r.S.toFixed(4)} H ${r.H.toFixed(4)} D ${r.D.toFixed(4)} -> ${bestA}; engine ${BJ.basic(c, up, true, false, R)}`);
}
