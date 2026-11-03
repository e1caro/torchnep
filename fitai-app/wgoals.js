'use strict';
// Weight goals: each week, three lifts from your own plan to hit at a set weight for a number of reps, machines and
// cables first. The weight is a little over your best on that exercise, or, the first time, an estimate from your body
// weight, level and sex. Hitting one (any set at that weight or more, for those reps or more) pays XP and coins.

const WG_EQ = { machine: 1, cable: 1, barbell: .9, 'e-z curl bar': .5, dumbbell: .35, kettlebells: .3 }; // load per kind of equipment
const WG_MUS = { quadriceps: .95, hamstrings: .45, glutes: .8, calves: .8, adductors: .4, abductors: .4, chest: .55, lats: .55, 'middle back': .5,
  'lower back': .5, traps: .6, shoulders: .35, biceps: .25, triceps: .3, forearms: .2, abdominals: .2, neck: .15 };
const WG_LV = { beginner: .6, intermediate: .85, expert: 1.05 };
const WG_REWARD = { xp: 50, coins: 12 };
const wgRound = (kg, e) => (e === 'dumbbell' || e === 'kettlebells' ? Math.max(2, Math.round(kg / 2) * 2) : Math.max(5, Math.round(kg / 2.5) * 2.5));
const wgBest = id => Math.max(0, ...S.history.flatMap(h => h.ex.filter(x => x.id === id).flatMap(x => x.sets.map(s => (+s.r || 0) >= 1 ? +s.w || 0 : 0))));
function wgTarget(it) {
  const e = BY[it.id], best = wgBest(it.id), p = S.profile;
  if (best > 0) return wgRound(Math.max(best * 1.05, best + (e.e === 'dumbbell' ? 2 : 2.5)), e.e);
  const sex = p.gender === 'female' ? .65 : p.gender === 'other' ? .8 : 1;
  return wgRound((curWeight() || p.weight) * (WG_MUS[e.m[0]] ?? .4) * (WG_EQ[e.e] || .5) * (WG_LV[p.level] || .7) * sex, e.e);
}
// this week's goals, picked once a week from the plan's weighted exercises (machines and cables first)
function wgGoals() {
  if (!S.plan || !S.profile) return [];
  if (G.wg?.week === weekId()) return G.wg.list;
  const seen = new Set(), pool = [];
  S.plan.days.forEach((_, di) => dayFor(di).items.forEach(it => {
    const e = BY[it.id];
    if (!e || seen.has(it.id) || !WG_EQ[e.e] || timedSecs(it.reps) !== null) return;
    seen.add(it.id); pool.push(it);
  }));
  const r = rng(hash(weekId() + 'wg'));
  pool.sort((a, b) => ((WG_EQ[BY[b.id].e] === 1) - (WG_EQ[BY[a.id].e] === 1)) || r() - .5);
  // different muscles where possible
  const list = [], mus = new Set();
  for (const it of pool) { if (list.length >= 3) break; const m = BY[it.id].m[0]; if (mus.has(m) && pool.length > 3) continue; mus.add(m); list.push(it); }
  for (const it of pool) { if (list.length >= 3) break; if (!list.includes(it)) list.push(it); }
  G.wg = { week: weekId(), list: list.map(it => ({ id: it.id, w: wgTarget(it), r: parseInt(it.reps) || 8, done: false })) };
  commit();
  return G.wg.list;
}
// The daily challenge: the last strength exercise of today's workout (not the cardio or stretches at the end). With
// weights: your best weight on it for 2 more reps (or the estimate, the first time); without: 4 more reps than planned.
// It follows the workout you start, so picking another routine moves the challenge to that one's last exercise.
const WGD_REWARD = { xp: 30, coins: 8 };
const wgdLast = items => [...items].reverse().find(it => BY[it.id] && timedSecs(it.reps) === null && parseInt(it.reps));
function wgdMake(items) {
  const it = wgdLast(items); if (!it) return null;
  const e = BY[it.id], low = parseInt(it.reps) || 8, best = wgBest(it.id);
  if (!WG_EQ[e.e]) return { day: dayId(), id: it.id, w: 0, r: low + 4, done: false };
  return { day: dayId(), id: it.id, w: best > 0 ? best : wgTarget(it), r: low + 2, done: false };
}
function wgDaily() {
  if (!S.plan || !S.profile) return null;
  if (G.wgd?.day === dayId() && (G.wgd.done || !session || session.ex.some(x => x.id === G.wgd.id))) return G.wgd;
  // not set yet today, or a workout started without it: take its last exercise (or the plan's next workout's)
  const items = session ? session.ex.map(x => ({ id: x.id, reps: x.reps })) : dayFor(typeof pickDi === 'function' ? pickDi() : nextDayIdx()).items;
  const d = wgdMake(items); if (!d) return null;
  if (G.wgd?.day !== dayId() || G.wgd.id !== d.id) { G.wgd = d; commit(); }
  return G.wgd;
}
const wgOf = id => { const d = wgDaily(); if (d && !d.done && d.id === id) return { ...d, daily: true }; return wgGoals().find(g => g.id === id && !g.done); };
// called when a workout ends: goals reached in it are ticked off and paid
function wgCheck(h) {
  const got = [];
  wgGoals().forEach(g => {
    if (g.done) return;
    const x = h.ex.find(e => e.id === g.id);
    if (x && x.sets.some(s => (+s.w || 0) >= g.w && (+s.r || 0) >= g.r)) { g.done = true; got.push(g); }
  });
  const d = G.wgd?.day === dayId() ? G.wgd : null, x = d && !d.done && h.ex.find(e => e.id === d.id);
  if (x && x.sets.some(s => (+s.w || 0) >= d.w && (+s.r || 0) >= d.r)) { d.done = true; got.push({ ...d, daily: true }); }
  const xp = got.reduce((a, g) => a + (g.daily ? WGD_REWARD.xp : WG_REWARD.xp), 0), coins = got.reduce((a, g) => a + (g.daily ? WGD_REWARD.coins : WG_REWARD.coins), 0);
  if (got.length) { award(xp, coins); commit(); }
  return got;
}
const wgName = g => esc(BY[g.id]?.n || g.id);
const wgLoad = g => (g.w ? `${g.w} kg × ${g.r}` : T('{0} reps in one set', g.r));
function wgDailyRow() {
  const d = wgDaily(); if (!d) return '';
  return `<div class="wgday ${d.done ? 'done' : ''}"><div class="mut">Daily challenge · last exercise of your workout</div>
    <a class="wg" href="#/exercise/${d.id}">${thumb(BY[d.id])}<div class="grow"><b>${wgName(d)}</b><div class="mut">${wgLoad(d)}</div></div>
    ${d.done ? '<span class="chk">✓</span>' : `<span class="wgrw">+${WGD_REWARD.xp} XP<br>${gi('coin', 'cn')} ${WGD_REWARD.coins}</span>`}</a></div>`;
}
function wgCard() {
  const gs = wgGoals(), day = wgDailyRow();
  if (!gs.length && !day) return '';
  const best = g => Math.max(0, ...S.history.filter(h => h.t >= weekStart()).flatMap(h => h.ex.filter(x => x.id === g.id).flatMap(x => x.sets.filter(s => (+s.r || 0) >= g.r).map(s => +s.w || 0))));
  return `<h2 class="sec">Weight goals</h2><section class="card wgoals">${day}${gs.length ? '<div class="mut">This week</div>' : ''}${gs.map(g => { const b = best(g), pc = g.done ? 100 : Math.min(100, b / g.w * 100);
    return `<a class="wg ${g.done ? 'done' : ''}" href="#/exercise/${g.id}">${thumb(BY[g.id])}<div class="grow"><b>${wgName(g)}</b>
    <div class="mut">${g.w} kg × ${g.r}${b && !g.done ? ` · best this week ${b} kg` : ''}</div><div class="qbar"><i style="width:${pc}%"></i></div></div>
    ${g.done ? '<span class="chk">✓</span>' : `<span class="wgrw">+${WG_REWARD.xp} XP<br>${gi('coin', 'cn')} ${WG_REWARD.coins}</span>`}</a>`; }).join('')}
    <div class="mut wgnote">New goals every week, from your plan. Any set at that weight for those reps counts.</div></section>`;
}
function wgVictory(r) {
  if (!r.wg?.length) return '';
  return r.wg.map(g => { const rw = g.daily ? WGD_REWARD : WG_REWARD; return `<div class="card row"><div class="avbig sm">${gi(g.daily ? 'flame' : 'weight', 'hero')}</div><div class="grow"><b>${g.daily ? 'Daily challenge done' : 'Goal reached'}: ${wgName(g)}</b><div class="mut">${wgLoad(g)} · +${rw.xp} XP · ${gi('coin', 'cn')} ${rw.coins}</div></div></div>`; }).join('');
}

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Weight goals': 'Retos de peso', 'New goals every week, from your plan. Any set at that weight for those reps counts.': 'Retos nuevos cada semana, de tu plan. Vale cualquier serie con ese peso y esas repeticiones.',
    'Weight goal': 'Reto de peso', 'Daily challenge · last exercise of your workout': 'Reto diario · último ejercicio de tu entrenamiento', 'This week': 'Esta semana',
    '{0} reps in one set': '{0} repeticiones en una serie', 'Daily challenge:': 'Reto diario:',
  });
  i18nPat(/^(.+) kg × (\d+) · best this week (.+) kg$/, (a, b, c) => `${a} kg × ${b} · mejor esta semana ${c} kg`);
  i18nPat(/^Goal reached: (.+)$/, a => `Reto conseguido: ${tr(a)}`);
  i18nPat(/^Daily challenge done: (.+)$/, a => `Reto diario conseguido: ${tr(a)}`);
}
