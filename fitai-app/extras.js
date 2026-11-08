'use strict';
// Things players of other gym apps expect: progress per exercise (estimated one-rep max and its trend), a plate
// calculator for barbell lifts, a training calendar on Progress, and, in the Google Play app, one friendly request
// for a rating after a few workouts.

// ---------- progress per exercise ----------
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 12) / 30) : 0); // Epley, capped where it stops being useful
function exHistory(id) {
  return S.history.filter(h => h.ex.some(x => x.id === id)).sort((a, b) => a.t - b.t).map(h => {
    const sets = h.ex.filter(x => x.id === id).flatMap(x => x.sets).map(s => ({ w: +s.w || 0, r: +s.r || 0 }));
    const best = sets.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b), { w: 0, r: 0 });
    return { t: h.t, best, rm: e1rm(best.w, best.r), vol: sets.reduce((a, s) => a + s.w * s.r, 0), reps: Math.max(0, ...sets.map(s => s.r)) };
  });
}
function spark(vals, w = 300, h = 70) {
  const lo = Math.min(...vals), hi = Math.max(...vals), k = hi - lo || 1, dx = vals.length > 1 ? w / (vals.length - 1) : 0;
  const pts = vals.map((v, i) => [i * dx, h - 6 - (v - lo) / k * (h - 12)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `<svg class="xspark" viewBox="-4 0 ${w + 8} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${line} L${w} ${h} L0 ${h}Z" class="a"/><path d="${line}" class="l"/>
    ${pts.map(([x, y], i) => (i === pts.length - 1 ? `<circle cx="${x}" cy="${y}" r="5"/>` : '')).join('')}</svg>`;
}
function exProgress(id) {
  const hs = exHistory(id); if (!hs.length) return '';
  const fmt = n => fmtN(Math.round(n * 2) / 2);
  const weighted = hs.some(h => h.rm > 0), last = hs[hs.length - 1];
  const best = hs.reduce((b, h) => (h.rm > b.rm ? h : b), hs[0]);
  const lim = typeof proGates === 'function' && proGates(), vals = hs.slice(lim ? -FREE.hist : -12).map(h => (weighted ? h.rm : h.reps));
  const first = vals[0], change = vals.length > 1 && first ? Math.round((vals[vals.length - 1] - first) / first * 100) : 0;
  return `<h2 class="sec">Your progress</h2><section class="card xprog">
    <div class="xstats">${weighted ? `<div><b>${fmt(best.rm)} kg</b><span>estimated 1-rep max</span></div><div><b>${best.best.w} kg × ${best.best.r}</b><span>best set</span></div>`
      : `<div><b>${Math.max(...hs.map(h => h.reps))}</b><span>most reps in a set</span></div>`}<div><b>${hs.length}</b><span>${hs.length === 1 ? 'workout' : 'workouts'}</span></div></div>
    ${vals.length > 1 ? `${spark(vals)}<div class="row between mut xfoot"><span>${weighted ? 'Estimated 1-rep max' : 'Reps'} · ${T('last {0} times', vals.length)}</span>${change ? `<b class="${change > 0 ? 'up' : 'down'}">${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%</b>` : ''}</div>` : ''}
    ${lim && hs.length > FREE.hist ? `<button class="btn sm ghost" onclick="location.hash='#/pro'">${gi('crown')} ${tr('See all your history with Pro')}</button>` : ''}<div class="mut">${tr('Last time:')} ${new Date(last.t).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })}${last.best.w ? ` · ${last.best.w} kg × ${last.best.r}` : last.reps ? ` · ${last.reps} reps` : ''}</div></section>`;
}
const _xEx = exerciseView;
exerciseView = function (id) { _xEx(id); const p = exProgress(id); if (p && BY[id]) view.querySelector('.how:last-of-type')?.insertAdjacentHTML('afterend', p); };
routes.exercise = exerciseView;

// ---------- plate calculator ----------
const PLATES = [[25, '#d33b3b'], [20, '#2f6fdf'], [15, '#e5b62a'], [10, '#2fa45a'], [5, '#e9e9e9'], [2.5, '#333'], [1.25, '#9aa3ad']];
let XBAR = load('bar', 20);
function platesFor(kg, bar) {
  let side = Math.max(0, (kg - bar) / 2); const out = [];
  for (const [p] of PLATES) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return { out, rest: Math.round(side * 2 * 100) / 100 };
}
function plateHTML(kg) {
  const { out, rest } = platesFor(kg, XBAR), col = Object.fromEntries(PLATES);
  return `<div class="xbar">${[...out].reverse().map(p => `<i style="--c:${col[p]};--h:${40 + p * 2.4}px"></i>`).join('')}<span></span>${out.map(p => `<i style="--c:${col[p]};--h:${40 + p * 2.4}px"></i>`).join('')}</div>
    <div class="xplates">${out.length ? [...new Set(out)].map(p => `<span><i style="--c:${col[p]}"></i>${out.filter(q => q === p).length} × ${fmtN(p)} kg</span>`).join('') : `<span class="mut">${tr('Just the bar')}</span>`}</div>
    <div class="mut">${tr('Per side')}${rest ? ` · ${T('{0} kg can\'t be made with these plates', rest)}` : ''}</div>`;
}
window.plateCalc = () => {
  const x = session?.ex[session.cur], s = x?.sets.find(t => !t.done) || x?.sets[0], kg = +s?.w || 60;
  modal(`<h2>Plate calculator</h2><label class="fld"><span>Total weight (kg)</span><div class="inp"><input id="xkg" type="number" inputmode="decimal" value="${kg}"></div></label>
    <div class="chips">${[20, 15, 10].map(b => `<button class="chip ${b === XBAR ? 'on' : ''}" data-bar="${b}">${T('{0} kg bar', b)}</button>`).join('')}</div><div id="xout">${plateHTML(kg)}</div>
    <button class="btn ghost" data-close>Close</button>`);
  const draw = () => { $('#xout').innerHTML = plateHTML(+$('#xkg').value || 0); };
  $('#xkg').oninput = draw;
  document.querySelectorAll('[data-bar]').forEach(b => { b.onclick = () => { XBAR = +b.dataset.bar; save('bar', XBAR); document.querySelectorAll('[data-bar]').forEach(c => c.classList.toggle('on', c === b)); draw(); }; });
};
const _xWo = workoutView;
workoutView = function () {
  _xWo();
  const x = session?.ex[session.cur], e = x && BY[x.id];
  if (e && /barbell/.test(e.e)) view.querySelector('table.sets')?.insertAdjacentHTML('afterend', `<button class="btn sm ghost xplatebtn" onclick="plateCalc()">${gi('weight')} Plate calculator</button>`);
};
routes.workout = workoutView;

// ---------- training calendar on Progress ----------
function trainCalendar() {
  const weeks = typeof proGates === 'function' && proGates() ? FREE.calWeeks : 18, start = weekStart() - (weeks - 1) * 7 * 864e5, sets = {};
  S.history.forEach(h => { if (h.t < start) return; const d = Math.floor((h.t - start) / 864e5); sets[d] = (sets[d] || 0) + h.ex.reduce((a, x) => a + x.sets.length, 0); });
  const max = Math.max(1, ...Object.values(sets)), today = Math.floor((Date.now() - start) / 864e5), days = Object.keys(sets).length;
  const lvl = v => (!v ? 0 : v < max * .34 ? 1 : v < max * .67 ? 2 : 3);
  const cols = [...Array(weeks)].map((_, w) => `<div>${[...Array(7)].map((__, d) => { const i = w * 7 + d; return `<i class="l${lvl(sets[i])}${i === today ? ' now' : ''}${i > today ? ' fut' : ''}"></i>`; }).join('')}</div>`).join('');
  const months = [...Array(weeks)].map((_, w) => { const dt = new Date(start + w * 7 * 864e5); return dt.getDate() <= 7 ? `<span style="--w:${w};--n:${weeks}">${dt.toLocaleDateString(LANG, { month: 'short' })}</span>` : ''; }).join('');
  return `<section class="card xcal"><div class="row between"><h3>${gi('calendar', 'hero')} Training calendar</h3><span class="mut">${T('{0} days', days)}</span></div>
    <div class="xmonths">${months}</div><div class="xgrid">${cols}</div>
    <div class="row xleg mut"><span>Less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><span>More</span></div></section>`;
}
const _xProg = routes.progress;
routes.progress = function () { _xProg(); (view.querySelector('.wkcard') || view.querySelector('.grid3'))?.insertAdjacentHTML('afterend', trainCalendar()); };

// ---------- one request for a rating (Google Play app only) ----------
const PLAY_URL = 'https://play.google.com/store/apps/details?id=io.github.e1caro.fitquest';
function askRating() {
  if (!APP_PLAY || G.rateAsked || S.history.length < 5 || !$('#modal').hidden) return;
  G.rateAsked = Date.now(); commit();
  modal(`<div class="avbig">⭐</div><h2>Enjoying FitQuest?</h2><div class="mut">A rating on Google Play helps other people find it. It takes ten seconds.</div>
    <a class="btn" href="${PLAY_URL}" target="_blank" rel="noopener" onclick="$('#modal').hidden=true">Rate on Google Play</a><button class="btn ghost" data-close>Not now</button>`);
}
const _xHome = routes.home;
routes.home = function () { _xHome(); setTimeout(askRating, 1500); };

if (typeof i18nAdd === 'function') i18nAdd({
  'Your progress': 'Tu progreso', 'estimated 1-rep max': '1RM estimado', 'best set': 'mejor serie', 'most reps in a set': 'más repeticiones en una serie', workout: 'entrenamiento',
  workouts: 'entrenamientos', 'Estimated 1-rep max': '1RM estimado', Reps: 'Repeticiones', 'last {0} times': 'últimas {0} veces', 'Last time:': 'La última vez:',
  'Plate calculator': 'Calculadora de discos', 'Total weight (kg)': 'Peso total (kg)', '{0} kg bar': 'Barra de {0} kg', 'Per side': 'Por lado', 'Just the bar': 'Solo la barra',
  "{0} kg can't be made with these plates": 'faltan {0} kg que no salen con estos discos', Close: 'Cerrar',
  'Training calendar': 'Calendario de entrenamiento', '{0} days': '{0} días', Less: 'Menos', More: 'Más',
  'Enjoying FitQuest?': '¿Te gusta FitQuest?', 'A rating on Google Play helps other people find it. It takes ten seconds.': 'Una valoración en Google Play ayuda a que otros la encuentren. Son diez segundos.',
  'Rate on Google Play': 'Valorar en Google Play', 'See all your history with Pro': 'Mira todo tu historial con Pro', 'Not now': 'Ahora no',
});
