'use strict';
// Weekly summary: a short story of the week (workouts, time, kilos, muscles, records, consistency) that opens by itself
// the first time the app is used in a new week, and from Progress at any time.
// Coach: one encouraging line on Today about your open bets, daily quests, streak and the weekly boss.

const WEEK = 7 * 864e5;
const MUS = { legs: ['Legs', 'Piernas'], chest: ['Chest', 'Pecho'], back: ['Back', 'Espalda'], shoulders: ['Shoulders', 'Hombros'], arms: ['Arms', 'Brazos'], core: ['Core', 'Core'] };
const musName = g => MUS[g][LANG === 'es' ? 1 : 0];
const fmtN = n => Math.round(n).toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB');

function weekStats(ws, upto = WEEK) {
  const we = ws + upto, hs = S.history.filter(h => h.t >= ws && h.t < we).sort((a, b) => a.t - b.t);
  const sets = hs.reduce((a, h) => a + h.ex.reduce((b, x) => b + x.sets.length, 0), 0);
  const reps = hs.reduce((a, h) => a + h.ex.reduce((b, x) => b + x.sets.reduce((c, s) => c + (+s.r || 0), 0), 0), 0);
  const days = [...Array(7)].map((_, i) => hs.some(h => h.t >= ws + i * 864e5 && h.t < ws + (i + 1) * 864e5));
  let run = 0, best = 0; days.forEach(d => { run = d ? run + 1 : 0; best = Math.max(best, run); });
  // sets per muscle group
  const mus = Object.fromEntries(Object.keys(MUS).map(g => [g, 0]));
  hs.forEach(h => h.ex.forEach(x => { const m = BY[x.id]?.m[0]; for (const g in MUS) if (typeof MG === 'object' && MG[g]?.includes(m)) mus[g] += x.sets.length; }));
  // personal records: heavier than any earlier workout on that exercise
  const prs = [];
  hs.forEach(h => h.ex.forEach(x => {
    const w = Math.max(0, ...x.sets.map(s => +s.w || 0));
    if (!w) return;
    const before = Math.max(0, ...S.history.filter(o => o.t < h.t).flatMap(o => o.ex.filter(e => e.id === x.id).flatMap(e => e.sets.map(s => +s.w || 0))));
    if (before > 0 && w > before) prs.push({ id: x.id, w, before });
  }));
  // one line per exercise: its best of the week against what it was before the week
  const pr = {};
  prs.forEach(r => { const o = pr[r.id]; pr[r.id] = o ? { ...r, before: Math.min(o.before, r.before), w: Math.max(o.w, r.w) } : r; });
  prs.splice(0, prs.length, ...Object.values(pr).sort((a, b) => (b.w - b.before) - (a.w - a.before)));
  const top = hs.reduce((a, h) => (!a || volume(h) > volume(a) ? h : a), null);
  const xs = typeof BT === 'object' && BT.xpLog ? Object.keys(BT.xpLog).map(Number).sort((a, b) => a - b) : [];
  const xa = xs.find(t => t >= ws && t < we), xb = xs.find(t => t >= we);
  const xp = xa === undefined ? null : (xb === undefined ? G.xp : BT.xpLog[xb]) - BT.xpLog[xa];
  return { ws, n: hs.length, min: hs.reduce((a, h) => a + (h.dur || 0), 0), kg: hs.reduce((a, h) => a + volume(h), 0), sets, reps, days, run: best, mus, prs, top, xp,
    dungeons: hs.filter(h => h.dungeon).length };
}
// S is an exceptional week: more workouts than the goal, plus a new record or more kilos than the week before
const grade = (w, goal, prev) => { const r = w.n / Math.max(1, goal);
  return r > 1 && (w.prs.length || (prev && w.kg > prev.kg)) ? 'S' : r >= 1 ? 'A+' : r >= .75 ? 'A' : r >= .5 ? 'B' : r > 0 ? 'C' : '—'; };

// ---------- the story viewer ----------
let RC = null;
window.openRecap = (which = 'last') => {
  const ws = weekStart() - (which === 'last' ? WEEK : 0), w = weekStats(ws), prev = weekStats(ws - WEEK), goal = S.profile?.days || 3;
  const range = `${new Date(ws).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })} – ${new Date(ws + WEEK - 1).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })}`;
  const diff = (a, b, unit = '') => b ? `<span class="rdelta ${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${fmtN(Math.abs(a - b))}${unit}</span>` : '';
  const cnt = (v, u = '') => `<b class="rbig" data-to="${Math.round(v)}" data-u="${u}">0</b>`;
  const musMax = Math.max(1, ...Object.values(w.mus)), musTop = Object.entries(w.mus).sort((a, b) => b[1] - a[1])[0];
  const wd = [...Array(7)].map((_, i) => new Date(ws + i * 864e5).toLocaleDateString(LANG, { weekday: 'narrow' }));
  const slides = [
    `<div class="rkick">${which === 'last' ? 'Your week' : 'Your week so far'}</div><div class="rsub">${range}</div>
      <div class="rhero">${gi(G.avatar, 'hero')}</div>${cnt(w.n)}<div class="rlbl">workouts</div>${diff(w.n, prev.n)}
      <div class="rnote">${w.n >= goal ? 'Weekly goal smashed.' : w.n ? 'Every workout counts.' : 'A fresh week is a fresh start.'}</div>`,
    `<div class="rkick">Time and iron</div>
      <div class="rgrid"><div>${cnt(w.min)}<div class="rlbl">minutes</div>${diff(w.min, prev.min)}</div><div>${cnt(w.kg)}<div class="rlbl">kg lifted</div>${diff(w.kg, prev.kg)}</div>
      <div>${cnt(w.sets)}<div class="rlbl">sets</div></div><div>${cnt(w.reps)}<div class="rlbl">reps</div></div></div>
      ${w.kg >= 1000 ? `<div class="rnote">That is like lifting ${fmtN(w.kg / 1500)} cars.</div>` : ''}`,
    `<div class="rkick">Muscles worked</div>
      <div class="rbars">${Object.entries(w.mus).map(([g, v]) => `<div class="rbar"><span translate="no">${musName(g)}</span><i style="--w:${(v / musMax * 100).toFixed(0)}%"></i><b>${v}</b></div>`).join('')}</div>
      ${musTop[1] ? `<div class="rnote">Most trained: <b translate="no">${musName(musTop[0])}</b></div>` : '<div class="rnote">No sets logged yet this week.</div>'}`,
    `<div class="rkick">Highlights</div>
      ${w.prs.length ? `<div class="rlbl">New records</div><div class="rprs">${w.prs.slice(0, 4).map(r => `<div class="rpr"><span>${esc(BY[r.id]?.n || r.id)}</span><b>${r.w} kg</b><i>+${fmtN(r.w - r.before)}</i></div>`).join('')}</div>`
        : '<div class="rnote">No new records this week. Next week, add a little weight.</div>'}
      ${w.top ? `<div class="rlbl">Best workout</div><div class="rpr"><span>${esc(tr(w.top.name.split(' · ')[1] || w.top.name))}</span><b>${fmtN(volume(w.top))} kg</b></div>` : ''}
      ${w.dungeons ? `<div class="rnote">${w.dungeons} dungeon${w.dungeons > 1 ? 's' : ''} cleared</div>` : ''}`,
    `<div class="rkick">Consistency</div>
      <div class="rdays">${w.days.map((d, i) => `<span class="${d ? 'on' : ''}"><i>${d ? '✓' : ''}</i><b>${wd[i]}</b></span>`).join('')}</div>
      <div class="rgrid"><div>${cnt(w.run)}<div class="rlbl">days in a row</div></div><div>${cnt(w.xp ?? 0)}<div class="rlbl">XP earned</div></div></div>
      <div class="rnote">${Math.min(w.n, goal) >= goal ? 'Weekly boss defeated.' : `${goal - Math.min(w.n, goal)} more workouts would have beaten the weekly boss.`}</div>`,
    `<div class="rkick">Week grade</div><div class="rgrade${grade(w, goal, prev) === 'S' ? ' s' : ''}">${grade(w, goal, prev)}</div><div class="rsub">${w.n} / ${goal} workouts</div>
      <div class="rnote">${grade(w, goal, prev) === 'S' ? 'An exceptional week. Above your goal and stronger than before.' : w.n >= goal ? 'Next week: keep the rhythm, and try one more set per exercise.' : `Next week: aim for ${goal} workouts.`}</div>
      <button class="btn" onclick="shareRecap(event)">Share</button><button class="btn ghost" onclick="closeRecap()">Done</button>`,
  ];
  closeRecap(true);
  const el = document.createElement('div');
  el.id = 'recap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="rbg"><i></i><i></i><i></i></div><div class="rframe"></div><div class="rtop"><div class="rprog">${slides.map(() => '<i><b></b></i>').join('')}</div>
    <button class="rx" aria-label="Close" onclick="closeRecap()">✕</button></div><div class="rslides">${slides.map(s => `<section class="rs">${s}</section>`).join('')}</div>
    <div class="rnav"><button aria-label="Back" onclick="recapGo(-1)"></button><button aria-label="Next" onclick="recapGo(1)"></button></div>`;
  document.body.append(el);
  RC = { el, i: -1, n: slides.length, w, t: 0 };
  recapGo(1); sfx('claim');
};
window.recapGo = d => {
  if (!RC) return;
  const i = RC.i + d;
  if (i >= RC.n) { closeRecap(); return; }
  if (i < 0) return;
  RC.i = i;
  RC.el.querySelectorAll('.rs').forEach((s, k) => s.classList.toggle('on', k === i));
  RC.el.querySelectorAll('.rprog i').forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'now' : ''; });
  RC.el.style.setProperty('--hue', `${i * 75}deg`); // the colour blobs turn around the slide; the colours stay the interface's
  // count the numbers up
  RC.el.querySelectorAll('.rs.on .rbig').forEach(b => {
    const to = +b.dataset.to, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 900), e = 1 - (1 - k) ** 3; b.textContent = fmtN(to * e) + (b.dataset.u || ''); if (k < 1 && RC) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  if (RC.el.querySelector('.rs.on .rgrade.s')) setTimeout(() => { if (RC) confetti(); }, 500);
  clearTimeout(RC.t);
  if (i < RC.n - 1) RC.t = setTimeout(() => recapGo(1), 6500); // the last slide waits for you
};
window.closeRecap = quiet => { if (!RC) return; clearTimeout(RC.t); RC.el.remove(); RC = null; if (quiet !== true) sfx('tick'); };
window.shareRecap = async e => {
  e?.stopPropagation();
  const w = RC?.w; if (!w) return;
  const text = `${tr('My week on FitQuest')}: ${w.n} ${tr('workouts')} · ${fmtN(w.min)} min · ${fmtN(w.kg)} kg${w.prs.length ? ` · ${w.prs.length} ${tr('new records')}` : ''} 💪`;
  try { if (navigator.share) await navigator.share({ title: 'FitQuest', text }); else { await navigator.clipboard.writeText(text); toast('Copied, paste it anywhere'); } } catch { /* cancelled */ }
};
addEventListener('keydown', e => { if (!RC) return; if (e.key === 'Escape') closeRecap(); if (e.key === 'ArrowRight') recapGo(1); if (e.key === 'ArrowLeft') recapGo(-1); });

// ---------- the coach line on Today ----------
let COACH_I = 0, COACH_DONE = false; // the coach greets you each time the app opens, until you have read it all
const B = t => `<b>${esc(t)}</b>`;
const S_ = t => `<span>${t}</span>`;
function coachLines() {
  const out = [], now = Date.now(), end = new Date().setHours(23, 59, 59, 999), name = esc(S.profile?.name || '');
  const hr = new Date().getHours(), hi = hr < 13 ? 'Good morning' : hr < 20 ? 'Good afternoon' : 'Good evening';
  const trainedToday = S.history.some(h => new Date(h.t).toDateString() === new Date().toDateString());
  // a weekly summary waiting
  if (new Date().getDay() === 1 && weekStats(weekStart() - WEEK).n) out.push({ p: 1, h: `${S_('Your weekly summary is ready.')} <button class="chip on" onclick="event.stopPropagation();openRecap('last')">${S_('See it')}</button>` });
  // daily quests
  ensureDay();
  const qs = G.quests.list.map(id => QT.find(x => x.id === id)), ready = qs.filter(q => metric(q.m) >= q.n && !G.quests.claimed.includes(q.id));
  const left = qs.filter(q => metric(q.m) < q.n);
  if (ready.length) out.push({ p: 2, h: `${S_('A quest reward is ready to claim:')} ${B(ready[0].t)}` });
  else if (left.length) out.push({ p: 4, h: `${S_(left.length > 1 ? 'Daily quests left:' : 'One daily quest left:')} ${left.map(q => B(q.t)).join(', ')}` });
  else out.push({ p: 6, h: S_('Every daily quest done today. Legend.') });
  // open bets
  if (typeof BT === 'object') {
    BT.open.forEach(b => b.legs.filter(l => !l.st && l.from <= now).forEach(l => {
      const pay = Math.round(b.stake * b.odds), days = Math.ceil((l.to - now) / 864e5);
      if (l.to <= end) out.push({ p: 3, h: `${S_('Your bet')} ${B(legTitle(l))} ${S_('ends tonight.')} ${S_(`It pays ${pay} coins.`)}` });
      else out.push({ p: 5, h: `${S_('Your bet')} ${B(legTitle(l))} ${S_('is still alive.')} ${S_(`${days} day${days > 1 ? 's' : ''} left to win ${pay} coins.`)}` });
    }));
  }
  // streak and boss
  const st = streak(), goal = S.profile?.days || 3, hits = Math.min(weekCount(), goal);
  if (trainedToday) out.push({ p: 7, h: S_('Workout done today. Your future self says thanks.') });
  else if (st >= 2) out.push({ p: 3, h: `${S_(`${st}-day streak.`)} ${S_('Train today to keep it alive.')}` });
  if (hits < goal) out.push({ p: 6, h: S_(`The weekly boss has ${goal - hits} hits left. Every workout is a hit.`) });
  const tips = ['Small steps every day add up.', 'Strong today, stronger tomorrow.', 'You never regret a workout.', 'Discipline beats motivation.', 'Progress, not perfection.'];
  out.push({ p: 9, h: S_(tips[new Date().getDate() % tips.length]) });
  out.sort((a, b) => a.p - b.p);
  if (name) out[0].h = `${S_(hi)}, ${B(S.profile.name)}. ${out[0].h}`;
  return out;
}
function coachCard() {
  const ls = coachLines(), i = Math.min(COACH_I, ls.length - 1), last = i === ls.length - 1;
  return `<section class="coach" onclick="coachNext()"><span class="cav">${gi(G.avatar, 'hero')}</span><div class="ctext">${ls[i].h}</div><span class="cnext">${ls.length > 1 ? `${i + 1}/${ls.length} ` : ''}${last ? '✕' : '›'}</span></section>`;
}
window.coachNext = () => {
  const c = view.querySelector(':scope > .coach');
  if (!c) return;
  if (COACH_I >= coachLines().length - 1) { // read it all: fold it away and let the circles take the space back
    COACH_DONE = true; sfx('tick');
    c.style.height = c.offsetHeight + 'px'; c.getBoundingClientRect();
    c.classList.add('bye');
    let done = false;
    const end = () => { if (done) return; done = true; c.remove(); if (typeof layoutOrbs === 'function') layoutOrbs(); };
    c.addEventListener('transitionend', e => { if (e.propertyName === 'height') end(); });
    setTimeout(end, 500);
    return;
  }
  COACH_I++;
  c.outerHTML = coachCard();
  view.querySelector(':scope > .coach')?.classList.add('swap');
  sfx('tick');
};

// ---------- hooks ----------
const _rcHome = home;
home = function () {
  _rcHome();
  const hud = view.querySelector(':scope > .hud');
  if (!hud) return;
  if (!COACH_DONE) hud.insertAdjacentHTML('afterend', coachCard());
  if (typeof layoutOrbs === 'function') layoutOrbs(); // the circles share the screen with the coach line
  // the first visit of a new week shows last week's summary
  if (G.recapSeen !== weekId() && weekStats(weekStart() - WEEK).n && !document.querySelector('#modal:not([hidden])')) {
    G.recapSeen = weekId(); commit();
    setTimeout(() => { if (/^#\/home|^#?$/.test(location.hash)) openRecap('last'); }, 700);
  }
};
const _rcProgress = routes.progress;
routes.progress = function () {
  _rcProgress();
  const w = weekStats(weekStart()), prev = weekStats(weekStart() - WEEK, Date.now() - weekStart()), goal = S.profile?.days || 3, wd = [...Array(7)].map((_, i) => new Date(weekStart() + i * 864e5).toLocaleDateString(LANG, { weekday: 'narrow' }));
  const today = (new Date().getDay() + 6) % 7;
  const d = (a, b) => (b ? `<i class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'}${fmtN(Math.abs(a - b))}</i>` : '');
  view.querySelector('.grid3')?.insertAdjacentHTML('afterend', `<section class="card wkcard"><div class="row between"><h3>${gi('calendar', 'hero')} Your week</h3><span class="wkgrade${grade(w, goal, prev) === 'S' ? ' s' : ''}">${grade(w, goal, prev)}</span></div>
    <div class="wkdays">${w.days.map((x, i) => `<span class="${x ? 'on' : ''}${i === today ? ' now' : ''}"><i>${x ? '✓' : ''}</i><b>${wd[i]}</b></span>`).join('')}</div>
    <div class="wkstats"><div><b>${w.n}<small>/${goal}</small></b><span>workouts</span>${d(w.n, prev.n)}</div><div><b>${fmtN(w.min)}</b><span>minutes</span>${d(w.min, prev.min)}</div>
      <div><b>${fmtN(w.kg)}</b><span>kg lifted</span>${d(w.kg, prev.kg)}</div><div><b>${w.prs.length}</b><span>records</span></div></div>
    <div class="qbar"><i style="width:${Math.min(100, w.n / goal * 100)}%"></i></div>
    <div class="row wkbtns"><button class="btn sm" onclick="openRecap('this')">${gi('sparkles')} Play my week</button>${weekStats(weekStart() - WEEK).n ? `<button class="btn sm ghost" onclick="openRecap('last')">Last week</button>` : ''}</div></section>`);
};
Object.assign(routes, { home });

if (typeof i18nAdd === 'function') i18nAdd({
  'Your week': 'Tu semana', 'Your week so far': 'Tu semana hasta ahora', workouts: 'entrenamientos', 'Weekly goal smashed.': 'Objetivo semanal superado.',
  'Every workout counts.': 'Cada entrenamiento cuenta.', 'A fresh week is a fresh start.': 'Una semana nueva es un nuevo comienzo.', 'Time and iron': 'Tiempo y hierro',
  minutes: 'minutos', 'kg lifted': 'kg levantados', sets: 'series', reps: 'repeticiones', 'That is like lifting {n} cars.': 'Es como levantar {n} coches.',
  'Muscles worked': 'Músculos trabajados', 'Most trained:': 'El más entrenado:', 'No sets logged yet this week.': 'Aún no hay series esta semana.',
  Highlights: 'Lo mejor', 'New records': 'Nuevos récords', 'No new records this week. Next week, add a little weight.': 'Sin récords esta semana. La próxima, sube un poco el peso.',
  'Best workout': 'Mejor entrenamiento', '{n} dungeon cleared': '{n} mazmorra superada', '{n} dungeons cleared': '{n} mazmorras superadas', Consistency: 'Constancia',
  'days in a row': 'días seguidos', 'XP earned': 'XP ganada', 'Weekly boss defeated.': 'Jefe semanal derrotado.',
  '{n} more workouts would have beaten the weekly boss.': 'Con {n} entrenamientos más habrías derrotado al jefe semanal.',
  'Week grade': 'Nota de la semana', 'An exceptional week. Above your goal and stronger than before.': 'Una semana excepcional. Por encima de tu objetivo y más fuerte que antes.', '{n} / {n} workouts': '{n} / {n} entrenamientos', 'Next week: keep the rhythm, and try one more set per exercise.': 'La próxima semana: mantén el ritmo y prueba una serie más por ejercicio.',
  'Next week: aim for {n} workouts.': 'La próxima semana: apunta a {n} entrenamientos.', Share: 'Compartir', Done: 'Hecho', 'My week on FitQuest': 'Mi semana en FitQuest',
  'new records': 'nuevos récords', 'Copied, paste it anywhere': 'Copiado, pégalo donde quieras',
  'Good morning': 'Buenos días', 'Good afternoon': 'Buenas tardes', 'Good evening': 'Buenas noches', 'Your weekly summary is ready.': 'Tu resumen semanal está listo.',
  'See it': 'Verlo', 'A quest reward is ready to claim:': 'Tienes una recompensa de misión lista:', 'Daily quests left:': 'Misiones diarias pendientes:',
  'One daily quest left:': 'Te queda una misión diaria:', 'Every daily quest done today. Legend.': 'Todas las misiones diarias hechas. Eres una leyenda.',
  'Your bet': 'Tu apuesta', 'ends tonight.': 'acaba esta noche.', 'It pays {n} coins.': 'Paga {n} monedas.', 'is still alive.': 'sigue viva.',
  '{n} days left to win {n} coins.': 'Quedan {n} días para ganar {n} monedas.', '{n} day left to win {n} coins.': 'Queda {n} día para ganar {n} monedas.', 'Workout done today. Your future self says thanks.': 'Entrenamiento hecho hoy. Tu yo del futuro te lo agradece.',
  '{n}-day streak.': 'Racha de {n} días.', 'Train today to keep it alive.': 'Entrena hoy para no perderla.',
  'The weekly boss has {n} hits left. Every workout is a hit.': 'Al jefe semanal le quedan {n} golpes. Cada entrenamiento es un golpe.',
  'Small steps every day add up.': 'Los pasos pequeños de cada día suman.', 'Strong today, stronger tomorrow.': 'Fuerte hoy, más fuerte mañana.',
  'You never regret a workout.': 'Nunca te arrepientes de entrenar.', 'Discipline beats motivation.': 'La disciplina gana a la motivación.', 'Progress, not perfection.': 'Progreso, no perfección.',
  '{n} workouts so far': '{n} entrenamientos hasta ahora', "Last week's summary": 'Resumen de la semana pasada', records: 'récords', 'Play my week': 'Ver mi semana', 'Last week': 'Semana pasada',
});
