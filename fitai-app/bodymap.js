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
  if (typeof EX !== 'undefined' && EX.length && document.querySelector('.bmap')) route(); // pictures drawn before the maps arrived
}
loadBody();

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
  return `<div class="bmap ${cls}" style="${vars}">${sides.map(sd => `<svg viewBox="0 0 ${size(sd)}" aria-hidden="true"><use href="#bm-${g}-${sd}" width="100%" height="100%"/></svg>`).join('')}</div>`;
}

// muscle groups for the exercise library: name, icon regions, free-exercise-db muscles
const MGROUPS = [
  ['chest', 'Chest', ['chest']], ['back', 'Back muscles', ['lats', 'middle back', 'lower back', 'traps']], ['shoulders', 'Shoulders', ['shoulders']],
  ['arms', 'Arms', ['biceps', 'triceps', 'forearms']], ['legs', 'Legs', ['quadriceps', 'hamstrings', 'calves', 'adductors']],
  ['glutes', 'Glutes', ['glutes', 'abductors']], ['core', 'Core', ['abdominals']], ['neck', 'Neck', ['neck']],
];
