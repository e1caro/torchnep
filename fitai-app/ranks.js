'use strict';
// Exercise ranks (Iron to Legend). Every exercise with a weight or a rep count gets a rank from your best set,
// measured against a typical "Gold" standard that is scaled to your age, height, weight and sex.
// The standards are rough estimates from common strength-level tables, not medical or coaching advice.

const RANKS = [['Iron', 0, '#8b93a1'], ['Bronze', 0.4, '#cd7f32'], ['Silver', 0.7, '#c3cbd6'], ['Gold', 1, '#f5c542'], ['Platinum', 1.3, '#4fd8c8'], ['Diamond', 1.65, '#6db6ff'], ['Legend', 2, '#ff5fa8']];
const RK_EQ = { barbell: 1, 'e-z curl bar': 1, machine: 1, cable: 0.8, dumbbell: 0.42, kettlebells: 0.35, bands: 0.3, 'medicine ball': 0.2, 'exercise ball': 0.2, other: 0.8 };
const RK_MUSCLE = { chest: 0.9, lats: 0.9, 'middle back': 0.9, 'lower back': 1, quadriceps: 1.3, hamstrings: 0.9, glutes: 1.2, shoulders: 0.5, traps: 1, biceps: 0.45, triceps: 0.5, forearms: 0.3, calves: 1.2, abdominals: 0.6, abductors: 0.8, adductors: 0.8, neck: 0.25 };
const RK_LOWER = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'lower back', 'abductors', 'adductors']);

// Bodyweight moves: rank by reps. [name pattern, reps needed for Gold]
const RK_BW = [[/pull.?up|chin.?up/, 8], [/push.?up|press.?up/, 20], [/bench dip/, 20], [/\bdips?\b/, 10], [/inverted row/, 12], [/burpee/, 15], [/mountain climber/, 30], [/sit.?up|crunch|v.?up|jackknife/, 25],
  [/leg raise|knee raise|knee tuck|flutter/, 15], [/lunge|split squat|step.?up/, 20], [/squat/, 25], [/calf raise/, 30], [/glute bridge|hip thrust/, 25], [/hyperextension|back extension|superman/, 20]];
// Loaded moves: [name pattern, Gold max as a share of bodyweight (barbell version), equipment independent?, lower body?]
const RK_LOAD = [[/trap bar|hex bar/, 1.9, 0, 1], [/romanian|stiff|single.leg deadlift|one.leg deadlift|rack pull|good morning/, 1.2, 0, 1], [/deadlift/, 1.75, 0, 1],
  [/leg press/, 3, 1, 1], [/hack squat/, 1.7, 1, 1], [/front squat|zercher|overhead squat/, 1.15, 0, 1], [/split squat|lunge|step.?up|bulgarian/, 0.9, 0, 1], [/squat/, 1.5, 0, 1],
  [/leg extension/, 0.9, 1, 1], [/leg curl|hamstring curl/, 0.7, 1, 1], [/hip thrust|glute bridge/, 1.8, 0, 1], [/back extension|hyperextension/, 0.6, 0, 1],
  [/seated calf/, 1, 1, 1], [/calf|toe press/, 1.4, 1, 1], [/abduct|adduct/, 1, 1, 1], [/swing/, 1.5, 0, 1],
  [/snatch/, 0.7, 0, 1], [/jerk/, 1, 0, 1], [/push press/, 0.85, 0, 0], [/clean/, 0.95, 0, 1],
  [/incline.*(bench|press)/, 0.9, 0, 0], [/decline/, 1.2, 0, 0], [/close.grip/, 1, 0, 0], [/bench press|floor press/, 1.1, 0, 0], [/chest press/, 1, 1, 0],
  [/lateral raise|front raise|side raise|rear delt|reverse fly|reverse flye|face pull/, 0.12, 1, 0], [/fly|flye|crossover|pec deck|pullover/, 0.45, 1, 0],
  [/overhead press|military|shoulder press|arnold|press behind/, 0.7, 0, 0], [/upright row/, 0.5, 0, 0], [/shrug/, 1.3, 0, 0],
  [/pull.?down/, 0.9, 1, 0], [/row/, 0.95, 0, 0],
  [/wrist curl/, 0.4, 0, 0], [/hammer/, 0.22, 1, 0], [/curl/, 0.55, 0, 0],
  [/kickback/, 0.12, 1, 0], [/push.?down|pressdown/, 0.55, 1, 0], [/extension|skull|french|tricep/, 0.5, 0, 0]];

const rkInfoCache = {};
function rkInfo(e) {
  if (!e) return null;
  if (e.id in rkInfoCache) return rkInfoCache[e.id];
  const n = e.n.toLowerCase();
  let r = null;
  if (e.c === 'stretching' || e.c === 'plyometrics' || e.c === 'cardio' || e.f === 'static' || e.e === 'foam roll') r = null;
  else {
    const bw = RK_BW.find(([re]) => re.test(n)), body = e.e === 'body only' || e.e === 'none' || !e.e;
    if (bw && (body || /pull.?up|chin.?up|dip|inverted/.test(n))) r = { kind: 'bw', gold: bw[1], low: RK_LOWER.has(e.m[0]) };
    else if (body) r = { kind: 'bw', gold: 15, low: RK_LOWER.has(e.m[0]) };
    else {
      const em = RK_EQ[e.e] ?? 0.8, hit = RK_LOAD.find(([re]) => re.test(n));
      if (hit) r = { kind: 'load', gold: hit[1] * (hit[2] ? 1 : em), low: !!hit[3] };
      else if (RK_MUSCLE[e.m[0]]) r = { kind: 'load', gold: RK_MUSCLE[e.m[0]] * em, low: RK_LOWER.has(e.m[0]) };
    }
  }
  return (rkInfoCache[e.id] = r);
}

function rkAgeFactor(a) { return a < 18 ? 0.75 + 0.0625 * (Math.max(14, a) - 14) : a < 40 ? 1 : Math.max(0.6, 1 - 0.0075 * (a - 39)); }
// Lean mass (Boer formula) is what strength follows, so height and weight both count.
function rkLean(p, w) { return Math.max(30, p.gender === 'female' ? 0.252 * w + 0.473 * p.height - 48.3 : 0.407 * w + 0.267 * p.height - 19.2); }
// The "Gold" standard for this exercise and this person: kg for loaded moves, reps for bodyweight moves.
function rkStd(info) {
  const p = S.profile, w = curWeight(), lean = rkLean(p, w), age = rkAgeFactor(p.age);
  if (info.kind === 'bw') return info.gold * (lean / w / 0.77) * age;
  const sex = p.gender === 'female' ? (info.low ? 0.85 : 0.75) : p.gender === 'male' ? 1 : 0.9;
  return info.gold * 80 * Math.pow(lean / 61.4, 0.8) * sex * age;
}
const rkSets = id => S.history.flatMap(h => h.ex.filter(x => x.id === id).flatMap(x => x.sets));

// Rank of an exercise from history plus optional extra sets (the workout in progress). null if it can't be ranked or there is no data.
function rkOf(id, extra = []) {
  const e = BY[id], info = rkInfo(e);
  if (!info || !S.profile) return null;
  const std = rkStd(info), bwKg = curWeight();
  let best = 0, bs = null;
  for (const s of [...rkSets(id), ...extra]) {
    const r = +s.r, w = +s.w || 0;
    if (!(r > 0)) continue;
    let sc;
    if (info.kind === 'load') { if (!(w > 0)) continue; sc = w * (1 + Math.min(r, 12) / 30) / std; }
    else sc = 30 * ((1 + w / bwKg) * (1 + Math.min(r, 40) / 30) - 1) / std;
    if (sc > best) { best = sc; bs = { w, r }; }
  }
  if (!bs) return null;
  let tier = 0; RANKS.forEach((t, i) => { if (best >= t[1]) tier = i; });
  const next = RANKS[tier + 1], pct = next ? Math.round((best - RANKS[tier][1]) / (next[1] - RANKS[tier][1]) * 100) : 100;
  return { tier, score: best, pct, best: bs, info, std };
}
const rkMax = (info, std, t) => { const v = RANKS[t][1] * std; return info.kind === 'load' ? Math.round(v / 2.5) * 2.5 : Math.min(50, Math.max(1, Math.round(v))); };
const rkChip = t => `<span class="rk" style="--c:${RANKS[t][2]}">${RANKS[t][0]}</span>`;
function rkTarget(info, std, t) {   // text for what a tier asks for
  const v = RANKS[t][1] * std;
  if (info.kind === 'bw') return `${rkMax(info, std, t)} reps`;
  return `${rkMax(info, std, t)} kg est. max · e.g. ${Math.round(v / (1 + 5 / 30) / 2.5) * 2.5} kg × 5`;
}
function rkBest(r) { return r.info.kind === 'load' ? `Best: ${r.best.w} kg × ${r.best.r}` : r.best.w ? `Best: +${r.best.w} kg × ${r.best.r}` : `Best: ${r.best.r} reps`; }

// ---------- exercise page ----------
const _rkEx = exerciseView;
exerciseView = function (id) {
  _rkEx(id);
  const info = rkInfo(BY[id]); if (!info || !S.profile) return;
  const r = rkOf(id), std = rkStd(info), cur = r ? r.tier : -1;
  const html = `<section class="card rkbox"><div class="row between"><h3>Your rank</h3>${r ? rkChip(r.tier) : '<span class="mut">Unranked</span>'}</div>
  ${r ? `<div class="mut">${rkBest(r)}</div>${r.tier < RANKS.length - 1 ? `<div class="rkbar"><i style="width:${r.pct}%;background:${RANKS[r.tier + 1][2]}"></i></div><div class="mut">Next rank</div><b>${RANKS[r.tier + 1][0]} · ${rkTarget(info, std, r.tier + 1)}</b>` : '<div class="mut">Top rank reached.</div>'}`
    : '<div class="mut">No rank yet. Log a set in a workout to earn one.</div>'}
  <details class="rkladder"><summary>All ranks</summary>${RANKS.map((t, i) => `<div class="rkrow ${i === cur ? 'on' : ''}">${rkChip(i)}<span class="mut">${i ? rkTarget(info, std, i) : 'Starting rank'}</span></div>`).join('')}
  <div class="mut" style="margin-top:8px">Based on your age, height, weight and sex. These are estimates.</div></details></section>`;
  view.querySelector('h2.sec')?.insertAdjacentHTML('beforebegin', html);
};

// ---------- workout screen ----------
const sessionSets = id => (session?.ex.find(x => x.id === id)?.sets || []).filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 }));
const _rkWv = workoutView;
workoutView = function () {
  _rkWv();
  if (!session) return;
  const id = session.ex[session.cur].id, info = rkInfo(BY[id]); if (!info || !S.profile) return;
  const r = rkOf(id, sessionSets(id)), std = rkStd(info);
  const nx = r ? (r.tier < RANKS.length - 1 ? r.tier + 1 : null) : 0;
  view.querySelector('h1')?.insertAdjacentHTML('afterend', `<div class="rkline">${r ? rkChip(r.tier) : '<span class="mut">Unranked</span>'}${nx !== null ? `<span class="mut">Next rank</span><b>${RANKS[nx][0]} · ${rkTarget(info, std, nx)}</b>` : ''}</div>`);
};
const _rkDone = window.doneSet;
window.doneSet = i => {
  const id = session.ex[session.cur].id;
  _rkDone(i);
  const r = rkOf(id, sessionSets(id)); if (!r) return;
  const seen = session.rkSeen || (session.rkSeen = {}), base = seen[id] ?? (rkOf(id)?.tier ?? -1);
  if (r.tier > base) { seen[id] = r.tier; if (r.tier >= 1) { toast(`Rank up! ${BY[id].n} is now ${RANKS[r.tier][0]}`); sfx('claim'); } }
};
const _rkFin = window.finish;
window.finish = () => {
  let ups = 0;
  if (session) session.ex.forEach(x => {
    const sets = sessionSets(x.id); if (!sets.length) return;
    const a = rkOf(x.id)?.tier ?? -1, b = rkOf(x.id, sets)?.tier ?? -1;
    if (b > a && b >= 1) ups++;
  });
  _rkFin();
  if (ups) { const xp = Math.min(ups, 5) * 40; award(xp, 0); toast(`Rank bonus: +${xp} XP`); }
};

// ---------- progress screen ----------
const _rkPr = progress;
progress = function () {
  _rkPr();
  const anchor = [...view.querySelectorAll('h2.sec')].find(h => /^Personal records/.test(h.textContent)); if (!anchor) return;
  const ids = [...new Set(S.history.flatMap(h => h.ex.map(x => x.id)))], list = ids.map(id => ({ id, r: rkOf(id) })).filter(x => x.r).sort((a, b) => b.r.score - a.r.score);
  if (!list.length) return;
  const top = list.slice(0, 6), avg = top.reduce((a, x) => a + Math.min(2.2, x.r.score), 0) / top.length;
  let tier = 0; RANKS.forEach((t, i) => { if (avg >= t[1]) tier = i; });
  anchor.insertAdjacentHTML('beforebegin', `<h2 class="sec">Ranks</h2>
  <section class="card hero"><div class="grow"><div class="mut">Overall rank</div><div style="margin-top:6px">${rkChip(tier)}</div></div><div class="mut">${list.length} exercises ranked</div></section>
  ${list.slice(0, 40).map(({ id, r }) => `<div class="card"><div class="row between"><div>${esc(BY[id].n)}</div>${rkChip(r.tier)}</div><div class="rkbar"><i style="width:${r.pct}%;background:${RANKS[Math.min(r.tier + 1, 6)][2]}"></i></div><div class="mut">${rkBest(r)}</div></div>`).join('')}`);
};

routes.exercise = exerciseView; routes.workout = workoutView; routes.progress = progress;

// ---------- Spanish ----------
if (typeof i18nAdd === 'function') {
  i18nAdd({
    Iron: 'Hierro', Bronze: 'Bronce', Silver: 'Plata', Gold: 'Oro', Platinum: 'Platino', Diamond: 'Diamante', Legend: 'Leyenda',
    'Your rank': 'Tu rango', Unranked: 'Sin rango', 'Next rank': 'Siguiente rango', 'Top rank reached.': 'Has alcanzado el rango máximo.', 'All ranks': 'Todos los rangos', 'Starting rank': 'Rango inicial',
    'No rank yet. Log a set in a workout to earn one.': 'Todavía sin rango. Registra una serie en un entrenamiento para conseguirlo.',
    'Based on your age, height, weight and sex. These are estimates.': 'Según tu edad, altura, peso y sexo. Son estimaciones.',
    'Best: {n} kg × {n}': 'Mejor: {n} kg × {n}', 'Best: {n} reps': 'Mejor: {n} reps', '{n} kg est. max': '{n} kg de máx. estimado', 'e.g. {n} kg × {n}': 'p. ej. {n} kg × {n}', '{n} reps': '{n} reps',
    Ranks: 'Rangos', 'Overall rank': 'Rango general', '{n} exercises ranked': '{n} ejercicios con rango', 'Rank bonus: {n} XP': 'Bonus de rango: +{n} XP',
  });
  i18nPat(/^Rank up! (.+) is now (\w+)$/, (a, b) => `¡Subes de rango! ${tr(a)} es ahora ${tr(b)}`);
}
