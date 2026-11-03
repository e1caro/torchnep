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
const wgOf = id => wgGoals().find(g => g.id === id && !g.done);
// called when a workout ends: goals reached in it are ticked off and paid
function wgCheck(h) {
  const got = [];
  wgGoals().forEach(g => {
    if (g.done) return;
    const x = h.ex.find(e => e.id === g.id);
    if (x && x.sets.some(s => (+s.w || 0) >= g.w && (+s.r || 0) >= g.r)) { g.done = true; got.push(g); }
  });
  if (got.length) { award(WG_REWARD.xp * got.length, WG_REWARD.coins * got.length); commit(); }
  return got;
}
const wgName = g => esc(BY[g.id]?.n || g.id);
function wgCard() {
  const gs = wgGoals();
  if (!gs.length) return '';
  const best = g => Math.max(0, ...S.history.filter(h => h.t >= weekStart()).flatMap(h => h.ex.filter(x => x.id === g.id).flatMap(x => x.sets.filter(s => (+s.r || 0) >= g.r).map(s => +s.w || 0))));
  return `<h2 class="sec">Weight goals</h2><section class="card wgoals">${gs.map(g => { const b = best(g), pc = g.done ? 100 : Math.min(100, b / g.w * 100);
    return `<a class="wg ${g.done ? 'done' : ''}" href="#/exercise/${g.id}">${thumb(BY[g.id])}<div class="grow"><b>${wgName(g)}</b>
    <div class="mut">${g.w} kg × ${g.r}${b && !g.done ? ` · best this week ${b} kg` : ''}</div><div class="qbar"><i style="width:${pc}%"></i></div></div>
    ${g.done ? '<span class="chk">✓</span>' : `<span class="wgrw">+${WG_REWARD.xp} XP<br>${gi('coin', 'cn')} ${WG_REWARD.coins}</span>`}</a>`; }).join('')}
    <div class="mut wgnote">New goals every week, from your plan. Any set at that weight for those reps counts.</div></section>`;
}
function wgVictory(r) {
  if (!r.wg?.length) return '';
  return r.wg.map(g => `<div class="card row"><div class="avbig sm">${gi('weight', 'hero')}</div><div class="grow"><b>Goal reached: ${wgName(g)}</b><div class="mut">${g.w} kg × ${g.r} · +${WG_REWARD.xp} XP · ${gi('coin', 'cn')} ${WG_REWARD.coins}</div></div></div>`).join('');
}

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Weight goals': 'Retos de peso', 'New goals every week, from your plan. Any set at that weight for those reps counts.': 'Retos nuevos cada semana, de tu plan. Vale cualquier serie con ese peso y esas repeticiones.',
    'Weight goal': 'Reto de peso',
  });
  i18nPat(/^(.+) kg × (\d+) · best this week (.+) kg$/, (a, b, c) => `${a} kg × ${b} · mejor esta semana ${c} kg`);
  i18nPat(/^Goal reached: (.+)$/, a => `Reto conseguido: ${tr(a)}`);
}
