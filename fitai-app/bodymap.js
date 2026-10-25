'use strict';
// Exercise pictures without people: a muscle map of a man or a woman (from the gender set at the start), front and
// back, with the muscles an exercise works lit up (main ones strong, helpers soft). The outlines are drawn once into
// hidden <symbol>s; every picture reuses them and colours the muscles through CSS variables.
// Outlines: react-native-body-highlighter by ELABBASSI Hicham, MIT License (data/body.json, made by tools/body_map.py).

let BODY = null;
// free-exercise-db muscle names -> map regions
const MUS_SLUG = {
  abdominals: ['abs', 'obliques'], abductors: ['gluteal'], adductors: ['adductors'], biceps: ['biceps'], calves: ['calves'], chest: ['chest'],
  forearms: ['forearm'], glutes: ['gluteal'], hamstrings: ['hamstring'], lats: ['upper-back'], 'lower back': ['lower-back'], 'middle back': ['upper-back'],
  neck: ['neck'], quadriceps: ['quadriceps', 'tibialis'], shoulders: ['deltoids'], traps: ['trapezius'], triceps: ['triceps'],
};
const SKIN_PARTS = new Set(['head', 'hair', 'hands', 'feet', 'knees', 'ankles']);
const bodyGender = () => (S.profile?.gender === 'female' ? 'female' : 'male');
const slugsOf = ms => [...new Set(ms.flatMap(m => MUS_SLUG[m] || []))];

async function loadBody() {
  try { BODY = await (await fetch('data/body.json')).json(); } catch { return; } // offline first run: no maps yet
  const sym = (g, side) => `<symbol id="bm-${g}-${side}" viewBox="${BODY.view[g][side]}">${BODY[g][side].map(([slug, ps]) =>
    ps.map(d => `<path d="${d}" style="fill:${SKIN_PARTS.has(slug) ? 'var(--bm-skin)' : `var(--m-${slug},var(--bm0))`}"/>`).join('')).join('')}</symbol>`;
  const box = document.createElement('div');
  box.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${['male', 'female'].map(g => sym(g, 'front') + sym(g, 'back')).join('')}</svg>`;
  document.body.prepend(box.firstChild);
  measureBody();
  if (typeof EX !== 'undefined' && EX.length && document.querySelector('.bmap')) route(); // pictures drawn before the maps arrived
}
loadBody();

// where each muscle sits (its box in the drawing), so small pictures can zoom in on the muscles worked
function measureBody() {
  BODY.box = {};
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:10px;height:10px;visibility:hidden');
  document.body.append(svg);
  for (const g of ['male', 'female']) for (const side of ['front', 'back']) {
    const out = (BODY.box[`${g}-${side}`] = {});
    for (const [slug, ps] of BODY[g][side]) {
      const el = document.createElementNS(ns, 'g');
      el.innerHTML = ps.map(d => `<path d="${d}"/>`).join(''); svg.append(el);
      const b = el.getBBox(); if (b.width) out[slug] = [b.x, b.y, b.width, b.height];
    }
  }
  svg.remove();
}

// side: 'both', 'front', 'back' or 'auto' (the side showing more of the main muscles)
function bodyMap(primary = [], secondary = [], side = 'both', cls = '') {
  const g = bodyGender(), main = slugsOf(primary), help = slugsOf(secondary).filter(s => !main.includes(s));
  const vars = [...main.map(s => `--m-${s}:var(--bm1)`), ...help.map(s => `--m-${s}:var(--bm2)`)].join(';');
  let sides = side === 'both' ? ['front', 'back'] : [side];
  if (side === 'auto') {
    const on = sd => (BODY ? BODY[g][sd].filter(([s]) => main.includes(s)).length : 0);
    sides = [on('back') > on('front') ? 'back' : 'front'];
  }
  const v = BODY ? BODY.view[g] : { front: '0 0 724 1448', back: '724 0 724 1448' };
  // the symbol carries its own offset (viewBox); the picture only needs its size
  const size = sd => v[sd].split(' ').slice(2).join(' ');
  // zoom: a square around the main muscles (with some body around them), for the small pictures
  const zoom = sd => {
    const bx = BODY?.box?.[`${g}-${sd}`], hit = bx && main.map(s => bx[s]).filter(Boolean);
    if (!cls.includes('zoom') || !hit?.length) return null;
    const [ox, oy, w, h] = v[sd].split(' ').map(Number);
    const x0 = Math.min(...hit.map(b => b[0])), y0 = Math.min(...hit.map(b => b[1])), x1 = Math.max(...hit.map(b => b[0] + b[2])), y1 = Math.max(...hit.map(b => b[1] + b[3]));
    const k = Math.min(w, h, Math.max(x1 - x0, y1 - y0, h * .3) * 1.3), cx = Math.min(Math.max((x0 + x1) / 2, ox + k / 2), ox + w - k / 2), cy = Math.min(Math.max((y0 + y1) / 2, oy + k / 2), oy + h - k / 2);
    return `${(cx - k / 2 - ox).toFixed(1)} ${(cy - k / 2 - oy).toFixed(1)} ${k.toFixed(1)} ${k.toFixed(1)}`;
  };
  return `<div class="bmap ${cls}" style="${vars}">${sides.map(sd => { const [w, h] = size(sd).split(' '), z = zoom(sd);
    return `<svg viewBox="${z || `0 0 ${w} ${h}`}" aria-hidden="true"><use href="#bm-${g}-${sd}" width="${w}" height="${h}"/></svg>`; }).join('')}</div>`;
}

// muscle groups for the exercise library: name, icon regions, free-exercise-db muscles
const MGROUPS = [
  ['chest', 'Chest', ['chest']], ['back', 'Back muscles', ['lats', 'middle back', 'lower back', 'traps']], ['shoulders', 'Shoulders', ['shoulders']],
  ['arms', 'Arms', ['biceps', 'triceps', 'forearms']], ['legs', 'Legs', ['quadriceps', 'hamstrings', 'calves', 'adductors']],
  ['glutes', 'Glutes', ['glutes', 'abductors']], ['core', 'Core', ['abdominals']], ['neck', 'Neck', ['neck']],
];
