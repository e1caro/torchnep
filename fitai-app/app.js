'use strict';
// FitQuest — offline-first workout PWA. No backend, no accounts; everything lives in localStorage.

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const LEVELS = ['beginner', 'intermediate', 'expert'];
const GOALS = {
  fat: ['Lose fat', 'Burn more, keep your muscle'], muscle: ['Build muscle', 'Size and shape'],
  strength: ['Get stronger', 'Heavier lifts, lower reps'], general: ['Stay fit', 'Move well, feel good'],
};
const EQUIP = {
  'body only': 'Bodyweight', dumbbell: 'Dumbbells', barbell: 'Barbell', machine: 'Machines', cable: 'Cables',
  kettlebells: 'Kettlebells', bands: 'Bands', extras: 'Balls & foam roller',
};
const EQ_MAP = { barbell: ['barbell', 'e-z curl bar'], extras: ['medicine ball', 'exercise ball', 'foam roll'] };
const FOCUS = {
  chest: ['Chest', ['chest']], back: ['Back muscles', ['lats', 'middle back', 'traps', 'lower back']],
  legs: ['Legs', ['quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors']], glutes: ['Glutes', ['glutes']],
  arms: ['Arms', ['biceps', 'triceps', 'forearms']], shoulders: ['Shoulders', ['shoulders']], abs: ['Abs', ['abdominals']],
};
const LIMITS = {
  knee: ['Knees', /jump|lunge|squat|plyo|hop|bound|pistol|step.?up|sprint|leg extension|box/i, ['quadriceps']],
  back: ['Lower back', /deadlift|good morning|bent.?over|clean|snatch|hyperextension|jerk|sit.?up|twist|round.?the.?world|superman/i, ['lower back']],
  shoulder: ['Shoulders', /overhead|military|behind|snatch|jerk|upright|dip|arnold|handstand|push.?press|pullover/i, []],
  wrist: ['Wrists', /push.?up|handstand|barbell curl|front squat|clean|plank|bench dip/i, ['forearms']],
};
const SCHEME = { fat: [3, '12-15', 45], muscle: [3, '8-12', 75], strength: [4, '3-6', 150], general: [3, '10-12', 60] };
const KIND_MUSCLES = {
  FULL: null,
  UPPER: ['chest', 'lats', 'middle back', 'shoulders', 'biceps', 'triceps', 'traps', 'forearms'],
  LOWER: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'lower back', 'adductors', 'abductors'],
  PUSH: ['chest', 'shoulders', 'triceps'],
  PULL: ['lats', 'middle back', 'traps', 'biceps', 'forearms', 'lower back'],
};
const DAYS = {
  FULL: ['quadriceps', 'chest', 'lats', 'shoulders', 'hamstrings', 'abdominals', 'biceps', 'triceps'],
  UPPER: ['chest', 'lats', 'shoulders', 'middle back', 'biceps', 'triceps', 'chest', 'lats'],
  LOWER: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abdominals', 'quadriceps', 'hamstrings', 'lower back'],
  PUSH: ['chest', 'shoulders', 'chest', 'triceps', 'shoulders', 'triceps', 'chest', 'abdominals'],
  PULL: ['lats', 'middle back', 'lats', 'biceps', 'traps', 'biceps', 'middle back', 'forearms'],
};
const KIND_NAME = { FULL: 'Full body', UPPER: 'Upper body', LOWER: 'Lower body', PUSH: 'Push', PULL: 'Pull' };
const SPLITS = {
  2: ['FULL', 'FULL'], 3: ['FULL', 'FULL', 'FULL'], 4: ['UPPER', 'LOWER', 'UPPER', 'LOWER'],
  5: ['PUSH', 'PULL', 'LOWER', 'UPPER', 'LOWER'], 6: ['PUSH', 'PULL', 'LOWER', 'PUSH', 'PULL', 'LOWER'],
};

// ---------- state ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem('fc.' + k)) ?? d; } catch { return d; } };
const save = (k, v) => {
  try { localStorage.setItem('fc.' + k, JSON.stringify(v)); } catch { /* storage full or blocked */ }
  if (k !== 'cloud' && k !== 'session' && typeof cloudDirty === 'function') cloudDirty(); // the account copy follows (cloud.js)
};
const S = { profile: load('profile', null), plan: load('plan', null), history: load('history', []), weights: load('weights', []) };
if (S.profile && !S.profile.height) { S.profile = null; S.plan = null; } // profile from the first version: ask again
let EX = [], BY = {}, VID = {};
let session = null, timers = [], wiz = null;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const view = $('#view');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const round = (n, to = 1) => Math.round(n / to) * to;

// ---------- icons ----------
const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10',
  plan: 'M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  lib: 'M5 4h14v16H5zM10 9.5v5l4.5-2.5z',
  chart: 'M4 19V5M4 19h16M8 15l3-4 3 2 4-6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
  back: 'M15 5l-7 7 7 7', close: 'M6 6l12 12M18 6 6 18', check: 'M5 12.5l4.5 4.5L19 7.5',
  flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2-.5-3 .5-6 1-8z',
  swap: 'M7 7h11l-3-3M17 17H6l3 3', plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6',
  dungeon: 'M4 20V8l3 2V5l3 2 2-3 2 3 3-2v5l3-2v12zM10 20v-5h4v5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  play: 'M7 5v14l12-7z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.7c2.4.5 4 2.3 4 5.3',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C11 3.5 7 3.5 7 6.5M12 7c1-3.5 5-3.5 5-.5',
};
const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
document.querySelectorAll('#tabs a').forEach(a => { a.insertAdjacentHTML('afterbegin', ic(a.dataset.i)); });

// ---------- demo media ----------
// A real video (data/videos.json: id -> mp4 URL or YouTube id) wins; otherwise the start/end pose photos loop.
function demo(e, label = true) {
  const v = VID[e.id];
  if (v && /^[\w-]{11}$/.test(v)) return `<div class="demo"><iframe src="https://www.youtube-nocookie.com/embed/${v}?loop=1&playlist=${v}&rel=0" allowfullscreen></iframe></div>`;
  if (v) return `<div class="demo"><video src="${esc(v)}" autoplay loop muted playsinline controls></video></div>`;
  if (e.x) return `<div class="demo nophoto">${typeof gi === 'function' ? gi('shoulder') : ''}<span>Follow the steps below</span></div>`;
  const a = IMG_BASE + e.id + '/0.jpg', b = IMG_BASE + e.id + '/' + (e.im > 1 ? 1 : 0) + '.jpg';
  return `<div class="demo"><img data-a="${a}" data-b="${b}" src="${a}" alt="${esc(e.n)}" loading="lazy">${label ? '<small>demo loop</small>' : ''}</div>`;
}
function startLoops() {
  timers.forEach(clearInterval); timers = [];
  document.querySelectorAll('.demo img[data-a]').forEach(img => {
    let f = 0;
    timers.push(setInterval(() => { f ^= 1; img.src = f ? img.dataset.b : img.dataset.a; }, 900));
  });
}
const thumb = e => e.x ? `<span class="thumb nophoto">${typeof gi === 'function' ? gi('shoulder') : ''}</span>` : `<img class="thumb" loading="lazy" src="${IMG_BASE}${e.id}/0.jpg" alt="">`;

// ---------- coach: body numbers and nutrition targets ----------
function analyze(p) {
  const h = p.height / 100, bmi = p.weight / (h * h);
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese';
  const sex = p.gender === 'male' ? 5 : p.gender === 'female' ? -161 : -78;
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + sex; // Mifflin-St Jeor
  // daily life (light activity) plus what the training plan really burns, spread over the week
  const ses = sessionBurn(p), tdee = bmr * 1.3 + ses.kcal * p.days / 7;
  const diff = p.target ? p.target - p.weight : 0;
  const adj = p.goal === 'fat' ? -0.2 : p.goal === 'muscle' ? 0.1 : p.goal === 'strength' ? 0.05 : 0;
  let kcal = tdee * (1 + adj);
  if (p.goal === 'general' && Math.abs(diff) > 1) kcal = tdee * (diff < 0 ? 0.9 : 1.08);
  kcal = Math.max(kcal, p.gender === 'female' ? 1300 : 1500);
  kcal = round(kcal, 50);
  const protein = round(p.weight * (p.goal === 'general' ? 1.6 : 2), 5), fat = round(p.weight * 0.8, 5);
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4, 5));
  const water = round(p.weight * 0.035, 0.1);
  const notes = [];
  notes.push(`BMI ${bmi.toFixed(1)} (${bmiLabel.toLowerCase()}). Estimated maintenance is ${round(tdee, 50)} kcal a day.`);
  notes.push(`Each workout burns about ${round(ses.kcal, 10)} kcal (${ses.strength} min of strength${ses.cardio ? `, ${ses.cardio} min of cardio` : ''}, ${ses.stretch} min of stretching), already counted in your daily calories.`);
  if (p.target && diff && (p.goal === 'fat' ? diff > 0 : p.goal === 'muscle' ? diff < 0 : false)) notes.push('Your target weight points the other way from your goal. Check both numbers in your profile.');
  if (p.goal === 'fat' && bmi < 20) notes.push('You are already lean, so the calorie deficit is kept small. Consider "Stay fit" or "Build muscle".');
  if (p.target && Math.abs(diff) >= 1) {
    const rate = p.weight * (diff < 0 ? 0.005 : 0.0025);
    notes.push(`${Math.abs(diff).toFixed(1)} kg to ${diff < 0 ? 'lose' : 'gain'}. A safe pace is about ${rate.toFixed(2)} kg a week, so roughly ${Math.max(1, Math.round(Math.abs(diff) / rate))} weeks.`);
  }
  if (p.level === 'beginner' && p.days >= 5) notes.push('Six or seven sessions in your first weeks is a lot. If you feel sore all the time, drop to 3 or 4 days.');
  if (p.age >= 50) notes.push('Impact exercises are left out and rest is a bit longer, which is kinder to joints.');
  if (bmi >= 30) notes.push('Jumping and high-impact moves are left out to protect joints. Walking on non-training days helps.');
  if (p.limits.length) notes.push(`Exercises that commonly aggravate ${p.limits.map(l => LIMITS[l][0].toLowerCase()).join(' and ')} are filtered out.`);
  if (p.focus.length) notes.push(`Extra sets go to: ${p.focus.map(f => FOCUS[f][0].toLowerCase()).join(', ')}.`);
  return { bmi, bmiLabel, bmr, tdee, kcal, protein, fat, carbs, water, notes, burn: ses.kcal };
}

// ---------- plan generator ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const equipSet = p => new Set(['body only', 'none', ...p.equipment.flatMap(k => EQ_MAP[k] || [k])]);

function allowed(e, p, have) {
  if (!have.has(e.e) || LEVELS.indexOf(e.l) > LEVELS.indexOf(p.level)) return false;
  const bmi = p.weight / ((p.height / 100) ** 2);
  if ((p.age >= 50 || bmi >= 30) && (e.c === 'plyometrics' || /jump|hop|bound|sprint/i.test(e.n))) return false;
  return !p.limits.some(l => LIMITS[l][1].test(e.n) || LIMITS[l][2].includes(e.m[0]));
}

// How long an exercise really takes: about 50 s per set plus its rest, and 2.5 minutes to set up and move on.
// Timed items ("8 min" of cardio, "30s" stretches) count their own time.
function exSecs(it) {
  const m = String(it.reps).match(/^(\d+)\s*min/), s = String(it.reps).match(/^(\d+)\s*s/);
  if (m) return +m[1] * 60 + 60;
  if (s) return it.sets * (+s[1] + it.rest) - it.rest + 30; // holds and stretches move on quickly
  return it.sets * (50 + it.rest) - it.rest + 150;
}
const WARMUP = 7 * 60;
// cardio: none, at the start (it doubles as the warm-up) or at the end; fat loss defaults to the end
// every plan includes cardio unless you turn it off; it and the stretching grow with the session
const cardioPos = p => p.cardio || 'end';
// cardio and stretching minutes: your choice, or "auto" to grow with the session
const cardioAuto = p => (p.minutes <= 30 ? 8 : p.minutes <= 45 ? 10 : p.minutes <= 60 ? 12 : p.minutes <= 75 ? 15 : p.minutes <= 90 ? 20 : 25);
const cardioMin = p => +p.cardioMin || cardioAuto(p);
const stretchAuto = p => (p.minutes <= 30 ? 3 : p.minutes <= 45 ? 4 : p.minutes <= 60 ? 5 : p.minutes <= 75 ? 6 : p.minutes <= 90 ? 8 : 10);
const stretchMin = p => +p.stretchMin || stretchAuto(p);
const STRETCH = { sets: 2, reps: '30s', rest: 10 }; // two 30-second holds, about 1.7 minutes with the change
const stretchCount = p => Math.max(1, Math.round(stretchMin(p) * 60 / exSecs(STRETCH)));
// cardio types, matched against the exercise names
const CARDIO_TYPES = [['auto', 'Any', null], ['run', 'Run / treadmill', /running|jogging|trail/i], ['bike', 'Bike', /bicycl|bike/i], ['row', 'Rowing', /rowing/i],
  ['elliptical', 'Elliptical', /elliptical/i], ['stairs', 'Stairs', /stair|step mill/i], ['rope', 'Jump rope', /rope/i], ['walk', 'Walking', /walking/i], ['hiit', 'Sprints', /sprint|rope/i]];
const CARDIO_MINS = ['auto', 5, 10, 15, 20, 30, 45];
// Energy a workout burns, from how its minutes are spent (MET values: energy per kg and hour; the resting 1 MET is
// left out because daily life already counts it). Uses the same split as the plan: warm-up, cardio, stretching, strength.
const CARDIO_MET = { auto: 7, run: 9, bike: 7, row: 7, elliptical: 5.5, stairs: 9, rope: 11, walk: 3.8, hiit: 10 };
const LIFT_MET = { muscle: 5, strength: 5, fat: 6, general: 5 };
function sessionBurn(p) {
  const kg = typeof curWeight === 'function' && S.profile === p ? curWeight() : p.weight, on = cardioPos(p) !== 'none';
  const warm = on && cardioPos(p) === 'start' ? 3 : 7, cardio = on ? cardioMin(p) : 0, stretch = stretchMin(p);
  const strength = Math.max(10, p.minutes - warm - cardio - stretch);
  const kcal = kg * ((3.5 - 1) * warm + ((CARDIO_MET[p.cardioType] || 7) - 1) * cardio + ((LIFT_MET[p.goal] || 5) - 1) * strength + (2.3 - 1) * stretch) / 60;
  return { kcal, strength, cardio, stretch };
}
const STRETCH_MINS = ['auto', 3, 5, 10, 15];
const SESSIONS = [30, 45, 60, 75, 90, 120];
const sessionLabel = m => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const planMinutes = d => Math.round(((/min/.test(String(d.items[0]?.reps)) ? 180 : WARMUP) + d.items.reduce((a, it) => a + exSecs(it), 0)) / 60);
// plans made before the time budget had too many exercises for the session: drop strength exercises from the end until it fits
if (S.plan && !S.plan.timed && S.profile) {
  S.plan.days.forEach(d => {
    const tot = () => WARMUP + d.items.reduce((a, it) => a + exSecs(it), 0);
    const strength = () => d.items.filter(it => !/min|s$/.test(String(it.reps)));
    while (tot() > S.profile.minutes * 60 + 120 && strength().length > 2) d.items.splice(d.items.lastIndexOf(strength().pop()), 1);
  });
  S.plan.timed = 1; save('plan', S.plan);
}
function generatePlan(p) {
  const r = rng(Date.now() & 0xffffff), have = equipSet(p);
  const pool = EX.filter(e => ['strength', 'plyometrics', 'powerlifting', 'olympic weightlifting'].includes(e.c) && allowed(e, p, have));
  const ctype = (CARDIO_TYPES.find(([k]) => k === p.cardioType) || CARDIO_TYPES[0])[2];
  let cardio = EX.filter(e => e.c === 'cardio' && (ctype ? ctype.test(e.n) : allowed(e, p, new Set([...have, 'machine', 'other'])) && e.e !== 'other'));
  if (!cardio.length) cardio = EX.filter(e => e.c === 'cardio' && e.e !== 'other');
  const stretches = EX.filter(e => e.c === 'stretching' && allowed(e, p, have));
  let [sets, reps, rest] = SCHEME[p.goal];
  if (p.age >= 50) rest += 15;
  if (p.level === 'beginner') sets = Math.min(sets, 3);
  const focusMuscles = p.focus.flatMap(f => FOCUS[f][1]);
  const used = new Set();
  const pick = (m, items) => {
    let c = shuffle(pool.filter(e => e.m[0] === m && !used.has(e.id)), r);
    if (!c.length) c = shuffle(pool.filter(e => e.m[0] === m && !items.some(i => i.id === e.id)), r);
    if (!c.length) return null;
    used.add(c[0].id); return c[0];
  };
  const days = SPLITS[p.days].map((kind, di) => {
    const slots = [...DAYS[kind], ...DAYS[kind], ...DAYS[kind]], allow = KIND_MUSCLES[kind]; // long sessions go round the muscles again
    const extra = shuffle(focusMuscles.filter(m => !allow || allow.includes(m)), r).slice(0, 2);
    extra.forEach((m, i) => slots.splice(2 + i, 0, m));
    // cardio and a stretch first take their time from the session; strength exercises fill what is left, at least 2
    const tail = [], pos = cardioPos(p), cIt = pos !== 'none' && cardio.length ? { id: shuffle(cardio, r)[0].id, sets: 1, reps: `${cardioMin(p)} min`, rest: 0 } : null;
    if (cIt) tail.push(cIt);
    const nStretch = stretchCount(p);
    for (let k = 0; k < nStretch; k++) tail.push({ ...STRETCH, id: null }); // placeholders: the stretches are chosen once the day's muscles are known
    let left = p.minutes * 60 - (pos === 'start' && cIt ? 180 : WARMUP) - tail.reduce((a, it) => a + exSecs(it), 0); // cardio first leaves a short warm-up
    const items = [];
    for (const m of slots) {
      const e = pick(m, items); if (!e) continue;
      const it = { id: e.id, sets: focusMuscles.includes(m) ? sets + 1 : sets, reps, rest };
      if (items.length >= 2 && exSecs(it) > left) break;
      items.push(it); left -= exSecs(it);
    }
    if (cIt && pos === 'start') { items.unshift(cIt); tail.shift(); }
    // stretches for the muscles worked today, most worked first, one per muscle before repeating
    const worked = Object.entries(items.reduce((a, it) => { const m = BY[it.id]?.m[0]; if (m && BY[it.id].c !== 'cardio') a[m] = (a[m] || 0) + it.sets; return a; }, {}))
      .sort((a, b) => b[1] - a[1]).map(([m]) => m);
    // then the rest of the day's muscles, so long stretching covers more than the two most worked
    [...DAYS[kind], 'lower back', 'hamstrings', 'calves'].forEach(m => { if (!worked.includes(m)) worked.push(m); });
    const usedSt = new Set();
    tail.filter(t => t.id === null).forEach((t, k) => {
      const want = worked.length ? worked[k % worked.length] : null;
      const c = shuffle(stretches.filter(e => !usedSt.has(e.id) && e.m[0] === want), r)[0]
        || shuffle(stretches.filter(e => !usedSt.has(e.id) && (worked.includes(e.m[0]) || (allow && allow.includes(e.m[0])))), r)[0]
        || shuffle(stretches.filter(e => !usedSt.has(e.id)), r)[0];
      if (c) { t.id = c.id; usedSt.add(c.id); }
    });
    items.push(...tail.filter(t => t.id));
    // short sessions: if the minimum of exercises runs over, shorten the cardio (5 minutes at least), then drop extra stretches
    const over = () => (pos === 'start' && cIt ? 180 : WARMUP) + items.reduce((a, it) => a + exSecs(it), 0) - p.minutes * 60;
    // (only what you left on "auto" is shortened: minutes you picked yourself are kept)
    if (cIt && !+p.cardioMin && over() > 60) cIt.reps = `${Math.max(5, cardioMin(p) - Math.ceil((over() - 60) / 60))} min`;
    while (!+p.stretchMin && over() > 60 && items.filter(it => BY[it.id]?.c === 'stretching').length > 1) items.splice(items.findLastIndex(it => BY[it.id]?.c === 'stretching'), 1);
    for (let k = items.length - 1; k >= 0 && over() > 60; k--) if (!/min|s$/.test(String(items[k].reps)) && items[k].sets > 2) { items[k].sets--; k++; } // and one set less, down to 2
    return { name: `Day ${di + 1} · ${KIND_NAME[kind]}`, kind, items };
  });
  return { created: Date.now(), days, timed: 1 };
}

// ---------- today's time ----------
// Some days there is more (or less) time at the gym: the next workout can be fitted to another length for today only.
// It keeps the day's exercises, then drops or adds strength exercises for the same muscles and resizes cardio and
// stretching (unless you picked their minutes yourself) so the workout fits the new time. Tomorrow it is back to normal.
S.today = load('today', null);
const todayOk = di => S.today && S.plan && S.today.date === dayKey(Date.now()) && S.today.di === di && S.today.plan === S.plan.created;
const dayFor = di => (todayOk(di) ? { ...S.plan.days[di], items: S.today.items } : S.plan.days[di]);
const dayMinutes = di => (todayOk(di) ? S.today.minutes : S.profile.minutes);
function fitDay(di, minutes) {
  const base = S.plan.days[di], p = { ...S.profile, minutes }, have = equipSet(p), r = rng((Date.now() ^ di * 7919) & 0xffffff);
  const cat = it => BY[it.id]?.c, isTimed = it => /min|s$/.test(String(it.reps));
  const cardio = base.items.filter(it => cat(it) === 'cardio').map(it => ({ ...it, reps: `${cardioMin(p)} min` }));
  const start = cardio.length && cardioPos(p) === 'start';
  // stretches: as many as the new length asks for, more for the day's muscles if needed
  let st = base.items.filter(it => cat(it) === 'stretching').map(it => ({ ...it }));
  const want = stretchCount(p), stPool = EX.filter(e => e.c === 'stretching' && allowed(e, p, have) && !st.some(x => x.id === e.id));
  const dayMus = [...DAYS[base.kind], 'lower back', 'hamstrings', 'calves'];
  while (st.length > want) st.pop();
  for (let k = 0; st.length < want && k < 40; k++) { const m = dayMus[k % dayMus.length], c = shuffle(stPool.filter(e => e.m[0] === m && !st.some(x => x.id === e.id)), r)[0]; if (c) st.push({ ...STRETCH, id: c.id }); }
  // strength: the day's own exercises first, then more for the same muscles while there is time
  let [sets, reps, rest] = SCHEME[p.goal];
  if (p.age >= 50) rest += 15;
  if (p.level === 'beginner') sets = Math.min(sets, 3);
  const str = base.items.filter(it => !isTimed(it) && cat(it) !== 'cardio' && cat(it) !== 'stretching').map(it => ({ ...it }));
  const warm = start ? 180 : WARMUP, fixed = warm + [...cardio, ...st].reduce((a, it) => a + exSecs(it), 0);
  const used = () => fixed + str.reduce((a, it) => a + exSecs(it), 0), budget = minutes * 60;
  const pool = EX.filter(e => ['strength', 'plyometrics', 'powerlifting', 'olympic weightlifting'].includes(e.c) && allowed(e, p, have));
  const slots = [...DAYS[base.kind], ...DAYS[base.kind], ...DAYS[base.kind]];
  for (let k = 0; k < slots.length; k++) {
    const c = shuffle(pool.filter(e => e.m[0] === slots[(k + str.length) % slots.length] && !str.some(x => x.id === e.id) && !S.plan.days[di].items.some(x => x.id === e.id)), r)[0];
    if (!c) continue;
    const it = { id: c.id, sets, reps, rest };
    if (used() + exSecs(it) > budget + 60) break;
    str.push(it);
  }
  while (used() > budget + 60 && str.length > 2) str.pop();
  for (let k = str.length - 1; k >= 0 && used() > budget + 60; k--) if (str[k].sets > 2) { str[k].sets--; k++; }
  // short on time: shorter cardio, fewer stretches (only what is on "auto")
  if (cardio.length && !+p.cardioMin) while (used() > budget + 60 && parseInt(cardio[0].reps) > 5) cardio[0].reps = `${parseInt(cardio[0].reps) - 1} min`;
  return [...(start ? cardio : []), ...str, ...(start ? [] : cardio), ...st];
}
window.setTodayTime = (di, m) => {
  m = +m;
  if (m === S.profile.minutes) { S.today = null; toast('Back to your usual time'); }
  else { S.today = { date: dayKey(Date.now()), di, minutes: m, plan: S.plan.created, items: fitDay(di, m) }; toast(`Today's workout fitted to ${sessionLabel(m)}`); }
  save('today', S.today); sfx('tick'); route();
};
const timeChips = di => `<div class="todaytime" onclick="event.stopPropagation()">${slider('today', SESSIONS.map(m => [m, sessionLabel(m)]), dayMinutes(di), `setTodayTime(${di},+sldVal(this))`)}</div>`;

// ---------- history helpers ----------
const dayKey = t => new Date(t).toDateString();
function streak() {
  const set = new Set(S.history.map(h => dayKey(h.t)));
  let n = 0, used = false; const d = new Date(), shield = typeof perk === 'function' && perk('shield'); // the Rest-day shield level perk bridges one missed day
  if (!set.has(d.toDateString())) d.setDate(d.getDate() - 1);
  for (;;) {
    if (set.has(d.toDateString())) n++;
    else { const p = new Date(d); p.setDate(p.getDate() - 1); if (shield && !used && n > 0 && set.has(p.toDateString())) used = true; else break; }
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const volume = h => h.ex.reduce((a, x) => a + x.sets.reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0);
const weekCount = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return S.history.filter(h => h.t >= d).length; };
const nextDayIdx = () => S.plan ? S.history.filter(h => h.t > S.plan.created && !h.dungeon).length % S.plan.days.length : 0;
const curWeight = () => S.weights.length ? S.weights.at(-1).w : S.profile.weight;

function ring(pct, big, small, size = 120) {
  const r = size / 2 - 9, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="rb"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="rf" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/></svg><div><b>${big}</b><span>${small}</span></div></div>`;
}

function weightChart() {
  const pts = S.weights.slice(-30);
  if (pts.length < 2) return '<div class="mut">Log your weight on two different days to see the trend.</div>';
  const W = 320, H = 130, pad = 22, ws = pts.map(p => p.w), lo = Math.min(...ws, S.profile.target || 1e9) - 1, hi = Math.max(...ws, S.profile.target || 0) + 1;
  const x = i => pad + i * (W - 2 * pad) / (pts.length - 1), y = w => H - pad - (w - lo) / (hi - lo) * (H - 2 * pad);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.w).toFixed(1)}`).join('');
  const t = S.profile.target ? `<line x1="${pad}" x2="${W - pad}" y1="${y(S.profile.target)}" y2="${y(S.profile.target)}" class="tg"/><text x="${W - pad}" y="${y(S.profile.target) - 4}" text-anchor="end" class="tl">target ${S.profile.target}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="wc">${t}<path d="${line}L${x(pts.length - 1)} ${H - pad}L${x(0)} ${H - pad}Z" class="wa"/><path d="${line}" class="wl"/>
  <circle cx="${x(pts.length - 1)}" cy="${y(ws.at(-1))}" r="4.5" class="wd"/><text x="${pad}" y="${H - 6}" class="tl">${new Date(pts[0].t).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' })}</text>
  <text x="${W - pad}" y="${H - 6}" text-anchor="end" class="tl">${new Date(pts.at(-1).t).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' })}</text></svg>`;
}

// ---------- onboarding wizard ----------
const BLANK = { name: '', gender: 'male', age: '', height: '', weight: '', target: '', goal: 'muscle', level: 'beginner', days: 3, minutes: 45, equipment: ['body only', 'dumbbell'], focus: [], limits: [] };
const STEPS = ['About you', 'Your goal', 'Training', 'Focus & limits'];

function chips(key, opts, sel, multi) {
  return `<div class="chips" data-k="${key}" ${multi ? 'data-multi="1"' : ''}>${opts.map(([v, l]) => `<button type="button" class="chip ${(multi ? sel.includes(v) : String(sel) === String(v)) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
// A slider over a list of choices ([value, label] pairs) instead of a row of buttons. The chosen label shows next to it.
// Pass an onchange snippet, or read it with sldVal() from a "change" listener (data-k names the setting).
function slider(key, opts, sel, onchange = '', attrs = '') {
  const i = Math.max(0, opts.findIndex(([v]) => String(v) === String(sel)));
  return `<div class="sld" data-k="${key}" data-noswipe ${attrs}><input type="range" min="0" max="${opts.length - 1}" step="1" value="${i}" style="--p:${opts.length > 1 ? i / (opts.length - 1) * 100 : 100}%" aria-label="${key}" data-opts="${esc(JSON.stringify(opts))}" ${onchange ? `onchange="${onchange}"` : ''} onclick="event.stopPropagation()"><output>${opts[i][1]}</output></div>`;
}
const sldVal = el => JSON.parse(el.dataset.opts)[el.value][0];
document.addEventListener('input', ev => { const el = ev.target; if (el.matches?.('.sld input')) { el.nextElementSibling.textContent = JSON.parse(el.dataset.opts)[el.value][1]; el.style.setProperty('--p', `${el.value / Math.max(1, el.max) * 100}%`); } });
const num = (id, label, val, unit, extra = '') => `<label class="fld"><span>${label}</span><div class="inp"><input id="${id}" type="number" inputmode="decimal" value="${val}" ${extra}><em>${unit}</em></div></label>`;

function onboarding(edit) {
  if (!wiz) wiz = { step: 0, p: { ...BLANK, ...(edit && S.profile ? S.profile : {}) }, edit: !!edit };
  const p = wiz.p, s = wiz.step;
  const body = [
    () => `${!wiz.edit && typeof SB_ON !== 'undefined' && SB_ON ? `<button type="button" class="btn ghost" onclick="location.hash='#/account'">I already have an account</button>` : ''}<div class="lbl" style="margin-top:0">Language</div>${langChips()}<label class="fld"><span>What should we call you?</span><div class="inp"><input id="f-name" value="${esc(p.name)}" placeholder="Your name" autocomplete="given-name"></div></label>
      <div class="lbl">Gender</div>${chips('gender', [['male', 'Male'], ['female', 'Female'], ['other', 'Other']], p.gender)}
      <div class="two">${num('f-age', 'Age', p.age, 'yrs', 'min="14" max="90"')}${num('f-height', 'Height', p.height, 'cm', 'min="120" max="230"')}</div>
      ${num('f-weight', 'Weight', p.weight, 'kg', 'min="30" max="250" step="0.1"')}
      <div class="lbl">Profile picture</div><div class="pgrid">${typeof ITEMS === 'undefined' ? '' : ITEMS.filter(i => i.type === 'avatar' && i.cost === 0).map(i => `<button type="button" class="pick ${G.avatar === i.key ? 'on' : ''}" data-pic="${i.key}" aria-label="${i.name}" title="${i.name}">${gi(i.key, 'hero')}</button>`).join('')}</div>
      <p class="mut">You can change it any time. Fancier pictures cost coins in the Shop.</p><p class="mut">Your body data is used for calories, protein and a safe training load. It never leaves this phone.</p>`,
    () => `<div class="lbl">Main objective</div><div class="opts" data-k="goal">${Object.entries(GOALS).map(([k, [t, d]]) => `<button type="button" class="opt ${p.goal === k ? 'on' : ''}" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      ${num('f-target', 'Target weight (optional)', p.target, 'kg', 'min="30" max="250" step="0.1"')}`,
    () => `<div class="lbl">Experience</div>${chips('level', LEVELS.map(l => [l, cap(l)]), p.level)}
      <div class="lbl">Days per week</div>${slider('days', [2, 3, 4, 5, 6].map(d => [d, `${d} days`]), p.days)}
      <div class="lbl">Time per session</div>${slider('minutes', SESSIONS.map(m => [m, sessionLabel(m)]), p.minutes)}
      <div class="lbl">Cardio</div>${chips('cardio', [['none', 'No cardio'], ['start', 'At the start'], ['end', 'At the end']], cardioPos(p))}
      <div class="lbl">Cardio type</div>${chips('cardioType', CARDIO_TYPES.map(([k, l]) => [k, l]), p.cardioType || 'auto')}
      <div class="lbl">Cardio minutes</div>${slider('cardioMin', CARDIO_MINS.map(m => [m, m === 'auto' ? 'Auto' : `${m} min`]), p.cardioMin || 'auto')}
      <div class="lbl">Stretching minutes</div>${slider('stretchMin', STRETCH_MINS.map(m => [m, m === 'auto' ? 'Auto' : `${m} min`]), p.stretchMin || 'auto')}
      <div class="lbl">Equipment you can use</div>${chips('equipment', Object.entries(EQUIP), p.equipment, true)}`,
    () => `<div class="lbl">Want extra work on something?</div>${chips('focus', Object.entries(FOCUS).map(([k, v]) => [k, v[0]]), p.focus, true)}
      <div class="lbl">Anything that hurts or limits you?</div>${chips('limits', Object.entries(LIMITS).map(([k, v]) => [k, v[0]]), p.limits, true)}
      <p class="mut">The coach hides exercises that commonly aggravate those areas. This is not medical advice; ask a professional about injuries.</p>`,
  ][s]();
  view.innerHTML = `<div class="wiz"><div class="steps">${STEPS.map((t, i) => `<i class="${i <= s ? 'on' : ''}"></i>`).join('')}</div>
    <div class="mut">Step ${s + 1} of ${STEPS.length}</div><h1>${STEPS[s]}</h1>${body}<div id="err" class="err"></div>
    <div class="row">${s || wiz.edit ? '<button class="btn ghost" id="bk">Back</button>' : ''}<button class="btn" id="nx">${s === STEPS.length - 1 ? 'Build my plan' : 'Continue'}</button></div></div>`;
  view.querySelectorAll('.chips,.opts').forEach(box => box.addEventListener('click', ev => {
    const c = ev.target.closest('[data-v]'); if (!c) return;
    const k = box.dataset.k, v = c.dataset.v;
    if (box.dataset.multi) {
      const i = p[k].indexOf(v); if (i >= 0) p[k].splice(i, 1); else p[k].push(v);
      c.classList.toggle('on');
    } else {
      p[k] = ['days', 'minutes'].includes(k) ? +v : v;
      box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === c));
    }
  }));
  view.querySelectorAll('.sld input').forEach(el => el.addEventListener('change', () => { const k = el.parentElement.dataset.k, v = sldVal(el); p[k] = ['days', 'minutes'].includes(k) ? +v : String(v); }));
  const read = () => {
    const g = id => $('#' + id)?.value;
    if (s === 0) { p.name = g('f-name').trim(); p.age = +g('f-age') || ''; p.height = +g('f-height') || ''; p.weight = +g('f-weight') || ''; }
    if (s === 1) p.target = +g('f-target') || '';
  };
  view.querySelectorAll('[data-pic]').forEach(b => b.onclick = () => { G.avatar = b.dataset.pic; commit(); view.querySelectorAll('[data-pic]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bk')?.addEventListener('click', () => { read(); if (s) { wiz.step--; onboarding(); } else { wiz = null; location.hash = '#/settings'; } });
  $('#nx').onclick = () => {
    read();
    const err = m => { $('#err').textContent = m; };
    if (s === 0) {
      if (!(p.age >= 14 && p.age <= 90)) return err('Enter an age between 14 and 90.');
      if (!(p.height >= 120 && p.height <= 230)) return err('Enter your height in cm (120 to 230).');
      if (!(p.weight >= 30 && p.weight <= 250)) return err('Enter your weight in kg (30 to 250).');
    }
    if (s === 2 && !p.equipment.length) p.equipment = ['body only'];
    if (s < STEPS.length - 1) { wiz.step++; onboarding(); window.scrollTo(0, 0); return; }
    const prevW = S.profile?.weight;
    S.profile = p; save('profile', p);
    if (prevW !== p.weight && !S.weights.some(w => w.w === p.weight && dayKey(w.t) === dayKey(Date.now()))) { S.weights.push({ t: Date.now(), w: p.weight }); save('weights', S.weights); }
    S.plan = generatePlan(p); save('plan', S.plan);
    wiz = null; location.hash = '#/plan';
  };
}

// ---------- views ----------
function needProfile() { if (!S.profile || !S.plan) { location.hash = '#/start'; return true; } }

function planView() {
  if (needProfile()) return;
  const p = S.profile;
  // each day folds to one line; the next workout starts open
  view.innerHTML = `<h1>Your plan</h1><div class="mut">${GOALS[p.goal][0]} · ${p.days} days a week · ${cap(p.level)}</div>` +
    S.plan.days.map((d0, di) => { const d = dayFor(di), nx = di === nextDayIdx(); return `<details class="card day" ${nx ? 'open' : ''}><summary><div class="grow"><h3>${esc(d.name)}</h3>
    <div class="mut">${nx ? 'Next · ' : ''}${d.items.length} exercises · ~${planMinutes(d)} min</div></div><button class="btn sm" onclick="event.preventDefault();startWorkout(${di})">Start</button></summary>
    ${nx ? timeChips(di) : ''}
    ${d.items.map((it, ii) => { const e = BY[it.id]; return e ? `<div class="item"><a class="row grow" href="#/exercise/${e.id}">${thumb(e)}<div><div>${esc(e.n)}</div><div class="mut">${it.sets} × ${it.reps}</div></div></a>
    <button class="icon" aria-label="Swap exercise" onclick="swapEx(${di},${ii})">${ic('swap', 18)}</button></div>` : ''; }).join('')}</details>`; }).join('') +
    `<div id="rtslot"></div><h2 class="sec">Adjust</h2>${optionsCard(p)}${cardioCard(p)}
    <div class="row"><button class="btn ghost" onclick="location.hash='#/library'">Exercise library</button><button class="btn ghost" onclick="regen()">Shuffle exercises</button></div>`;
  bindOpts();
}
// The answers from the start, editable in place: change any of them and rebuild the plan, without the whole questionnaire.
let PE = null; // the edited copy, until saved
function optionsCard(p) {
  const e = PE || p, ch = (k, opts, sel, multi) => chips(k, opts, sel, multi).replace('class="chips"', 'class="chips" data-pe="1"');
  return `<details class="card optcard" ${S.optOpen ? 'open' : ''} ontoggle="S.optOpen=this.open"><summary>Training options</summary>
    <div class="lbl">Main objective</div>${ch('goal', Object.entries(GOALS).map(([k, [t]]) => [k, t]), e.goal)}
    <div class="lbl">Experience</div>${ch('level', LEVELS.map(l => [l, cap(l)]), e.level)}
    <div class="lbl">Days per week</div>${slider('days', [2, 3, 4, 5, 6].map(d => [d, `${d} days`]), e.days, '', 'data-pe="1"')}
    <div class="lbl">Time per session</div>${slider('minutes', SESSIONS.map(m => [m, sessionLabel(m)]), e.minutes, '', 'data-pe="1"')}
    <div class="lbl">Equipment you can use</div>${ch('equipment', Object.entries(EQUIP), e.equipment, true)}
    <div class="lbl">Extra work on</div>${ch('focus', Object.entries(FOCUS).map(([k, v]) => [k, v[0]]), e.focus, true)}
    <div class="lbl">Anything that hurts or limits you?</div>${ch('limits', Object.entries(LIMITS).map(([k, v]) => [k, v[0]]), e.limits, true)}
    ${PE ? '<div class="row optbtns"><button class="btn ghost" onclick="PE=null;planView()">Cancel</button><button class="btn" onclick="saveOpts()">Save and rebuild plan</button></div>' : '<div class="mut">Tap any option to change it. Your history, levels and rewards stay.</div>'}</details>`;
}
function bindOpts() {
  view.querySelectorAll('.sld[data-pe] input').forEach(el => el.addEventListener('change', () => {
    PE = PE || JSON.parse(JSON.stringify(S.profile)); PE[el.parentElement.dataset.k] = +sldVal(el); S.optOpen = true; planView();
  }));
  view.querySelectorAll('.chips[data-pe]').forEach(box => box.addEventListener('click', ev => {
    const c = ev.target.closest('[data-v]'); if (!c) return;
    PE = PE || JSON.parse(JSON.stringify(S.profile));
    const k = box.dataset.k, v = c.dataset.v;
    if (box.dataset.multi) { const i = PE[k].indexOf(v); if (i >= 0) PE[k].splice(i, 1); else PE[k].push(v); }
    else PE[k] = ['days', 'minutes'].includes(k) ? +v : v;
    S.optOpen = true; planView();
  }));
}
window.saveOpts = () => {
  if (!PE) return;
  if (!PE.equipment.length) PE.equipment = ['body only'];
  S.profile = PE; PE = null; save('profile', S.profile);
  S.plan = generatePlan(S.profile); save('plan', S.plan); S.today = null; save('today', null);
  sfx('claim'); toast('Plan rebuilt with your new options'); planView();
};
function cardioCard(p) {
  const row = (k, opts, cur) => `<div class="chips">${opts.map(([v, l]) => `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" onclick="setPlanOpt('${k}','${v}')">${l}</button>`).join('')}</div>`;
  const on = cardioPos(p) !== 'none';
  return `<details class="card cardiocard" ${S.cardioOpen ? 'open' : ''} ontoggle="S.cardioOpen=this.open"><summary>Cardio and stretching <span class="mut">· ${on ? `${cardioMin(p)} min` : 'no cardio'} · ${stretchMin(p)} min</span></summary>
    <div class="lbl">Cardio</div>${row('cardio', [['none', 'No cardio'], ['start', 'At the start'], ['end', 'At the end']], cardioPos(p))}
    ${on ? `<div class="lbl">Type</div>${row('cardioType', CARDIO_TYPES.map(([k, l]) => [k, l]), p.cardioType || 'auto')}
    <div class="lbl">Cardio minutes</div>${slider('cardioMin', CARDIO_MINS.map(m => [m, m === 'auto' ? `Auto (${cardioAuto(p)})` : `${m} min`]), p.cardioMin || 'auto', "setPlanOpt('cardioMin',String(sldVal(this)))")}` : ''}
    <div class="lbl">Stretching minutes</div>${slider('stretchMin', STRETCH_MINS.map(m => [m, m === 'auto' ? `Auto (${stretchAuto(p)})` : `${m} min`]), p.stretchMin || 'auto', "setPlanOpt('stretchMin',String(sldVal(this)))")}
    <div class="mut">Stretches are picked for the muscles each day works.</div></details>`;
}
window.setPlanOpt = (k, v) => { S.cardioOpen = true; S.profile[k] = v; save('profile', S.profile); regen(); };
window.setCardio = v => { S.profile.cardio = v; save('profile', S.profile); toast(v === 'none' ? 'Plan without cardio' : v === 'start' ? 'Cardio at the start of each workout' : 'Cardio at the end of each workout'); regen(); };
window.regen = () => { S.plan = generatePlan(S.profile); save('plan', S.plan); planView(); };
window.swapEx = (di, ii) => {
  const tod = todayOk(di), it = (tod ? S.today.items : S.plan.days[di].items)[ii], cur = BY[it.id], have = equipSet(S.profile);
  const c = EX.filter(e => e.m[0] === cur.m[0] && e.c === cur.c && e.id !== cur.id && allowed(e, S.profile, have) && !S.plan.days[di].items.some(i => i.id === e.id));
  if (!c.length) return;
  it.id = c[Math.floor(Math.random() * c.length)].id; save('plan', S.plan); if (tod) save('today', S.today); planView();
};

let libF = { q: '', m: '', e: '' };
const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const exKey = e => fold(typeof tr === 'function' && tr(e.n) !== e.n ? e.n + ' ' + tr(e.n) : e.n); // search in English and in the app language
// Filter options keep the English value; only the label gets translated, so filtering works in any language.
const optList = (vals, cur) => vals.map(v => [v, typeof tr === 'function' ? tr(v) : v]).sort((a, b) => a[1].localeCompare(b[1]))
  .map(([v, t]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
let libN = 60;
function library() {
  const muscles = [...new Set(EX.flatMap(e => e.m))].sort();
  const list = EX.filter(e => (!libF.q || exKey(e).includes(fold(libF.q))) && (!libF.m || e.m.includes(libF.m)) && (!libF.e || e.e === libF.e));
  view.innerHTML = `<h1>Exercises</h1>
  <input class="search" id="q" placeholder="Search ${EX.length} exercises" value="${esc(libF.q)}">
  <div class="two" style="margin:8px 0"><select id="fm"><option value="">All muscles</option>${optList(muscles, libF.m)}</select>
  <select id="fe"><option value="">All equipment</option>${optList([...new Set(EX.map(e => e.e))], libF.e)}</select></div>
  <div class="mut">${list.length} results</div>
  ${list.slice(0, libN).map(e => `<a class="card row li" href="#/exercise/${e.id}">${thumb(e)}<div class="grow"><div>${esc(e.n)}</div><div class="mut">${e.m[0]} · ${e.e} · ${e.l}</div></div></a>`).join('')}
  ${list.length > libN ? `<button class="btn ghost" onclick="libN += 60; library()">Show more (${list.length - libN})</button>` : ''}`;
  $('#q').oninput = ev => { libF.q = ev.target.value.toLowerCase(); libN = 60; const pos = ev.target.selectionStart; library(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); };
  $('#fm').onchange = ev => { libF.m = ev.target.value; libN = 60; library(); };
  $('#fe').onchange = ev => { libF.e = ev.target.value; libN = 60; library(); };
}

function exerciseView(id) {
  const e = BY[id]; if (!e) { location.hash = '#/library'; return; }
  gameGuide(id);
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button><h1>${esc(e.n)}</h1>${demo(e)}
  <div class="chips static">${[...e.m, ...e.s].map(m => `<span class="chip">${m}</span>`).join('')}<span class="chip">${e.e}</span><span class="chip">${e.l}</span></div>
  <h2 class="sec">How to</h2><ol class="how">${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  startLoops();
}

// ---------- workout ----------
// The workout in progress is saved after every change, so it survives other screens, other apps and a closed app,
// until it is finished or discarded.
const saveSess = () => save('session', session);
session = load('session', null);
// "10 min" -> 600, "30s" -> 30; null for reps
const timedSecs = reps => { const r = String(reps), m = r.match(/^(\d+)\s*min/), sec = r.match(/^(\d+)\s*s/); return m ? +m[1] * 60 : sec ? +sec[1] : null; };
// how long the done part of an exercise takes (same estimate as the plan's), in seconds
function doneSecs(x) {
  const n = x.sets.filter(t => t.done).length, ts = timedSecs(x.reps), rest = +x.rest || 0;
  if (!n) return 0;
  if (ts && ts >= 60) return n * ts + 60;
  if (ts) return n * (ts + rest) - rest + 30;
  return n * (50 + rest) - rest + 150;
}
const estMinutes = ss => Math.max(1, Math.round((WARMUP + ss.ex.reduce((a, x) => a + doneSecs(x), 0)) / 60));
function startSession(name, items, extra = {}) {
  if (session) { toast('Finish or discard the workout in progress first'); location.hash = '#/workout'; return; }
  session = { t0: Date.now(), cur: 0, name, ...extra, ex: items.map(it => ({ id: it.id, reps: it.reps, rest: it.rest, plan: it.sets, sets: Array.from({ length: it.sets }, () => ({ w: '', r: '', done: false })) })) };
  const last = {}; S.history.forEach(h => h.ex.forEach(x => { last[x.id] = x.sets.find(s => s.w) || last[x.id]; }));
  session.ex.forEach(x => { const l = last[x.id]; if (l) { x.last = l; x.sets.forEach(s => { s.w = l.w; }); } });
  saveSess();
  location.hash = '#/workout';
}
window.startWorkout = di => { const d = dayFor(di); startSession(d.name, d.items, { di }); };

const MEDAL_NAME = ['', 'Bronze', 'Silver', 'Gold', 'Platinum'];
const medal = t => t ? `<span class="medal m${t}">${MEDAL_NAME[t]}</span>` : '';
function workoutView() {
  if (!session) { location.hash = '#/home'; return; }
  const x = session.ex[session.cur], e = BY[x.id], n = session.ex.length, ts = timedSecs(x.reps), timed = ts !== null || isNaN(parseInt(x.reps));
  const xpNow = session.ex.reduce((a, q) => a + exXp(q).xp, 0), tier = exXp(x).tier, run = session.timer && session.timer.ex === session.cur ? session.timer : null;
  view.innerHTML = `<div class="row between"><button class="icon" aria-label="Leave the workout for now" onclick="location.hash='#/home'">${ic('back', 20)}</button>
  <div class="mut">${esc(session.name)}</div><div class="xpchip">+${xpNow} XP</div></div>
  <div class="row between"><span>${medal(tier)}</span><span class="mut">Exercise ${session.cur + 1} of ${n}</span></div>
  <div class="prog"><i style="width:${(session.cur + 1) / n * 100}%"></i></div>
  <h1>${esc(e.n)}</h1>${demo(e)}
  <div class="mut" style="margin:8px 0">Target ${x.sets.length} × ${x.reps}${x.last && !timed ? ` · last time ${x.last.w} kg × ${x.last.r}` : ''}</div>
  ${run ? `<div class="card wtimer"><div class="mut">Set ${run.set + 1}</div><div class="t" id="wt">--:--</div><button class="btn ghost sm" onclick="stopTimer()">Stop</button></div>` : ''}
  <table class="sets"><tr class="mut"><th>Set</th>${timed ? '<th></th>' : '<th>kg</th><th>Reps</th>'}<th></th></tr>
  ${x.sets.map((s, i) => `<tr class="${s.done ? 'done' : ''}"><td>${i + 1}</td>
  ${timed ? `<td>${ts && !s.done && !run ? `<button class="btn sm" onclick="startTimer(${i})">${ic('play', 14)} ${fmtSecs(ts)}</button>` : ''}</td>` : `<td><input type="number" inputmode="decimal" value="${s.w}" aria-label="Weight set ${i + 1}" onchange="setVal(${i},'w',this.value)"></td>
  <td><input type="number" inputmode="numeric" value="${s.r}" placeholder="${esc(x.reps)}" aria-label="Reps set ${i + 1}" onchange="setVal(${i},'r',this.value)"></td>`}
  <td><button class="ck ${s.done ? 'on' : ''}" aria-label="Complete set ${i + 1}" onclick="doneSet(${i})">${s.done ? ic('check', 20) : ''}</button></td></tr>`).join('')}</table>
  ${timed ? '' : `<button class="btn sm ghost" onclick="addSet()">${ic('plus', 16)} Add set</button>`}
  <div class="row" style="margin-top:16px"><button class="btn ghost" ${session.cur ? '' : 'disabled'} onclick="nav(-1)">Previous</button>
  ${session.cur < n - 1 ? '<button class="btn" onclick="nav(1)">Next</button>' : '<button class="btn gold" onclick="finish()">Finish</button>'}</div>
  <details class="card"><summary>Instructions</summary><ol class="how">${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>
  <button class="btn ghost sm" onclick="quitWorkout()">Discard workout</button>`;
  startLoops();
  if (run) tickTimer();
}
const fmtSecs = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
// Timed exercises (cardio, holds, stretches): a countdown per set that ticks the set off by itself when it ends.
// It keeps its end time in the saved workout, so it carries on while you are on another screen or app.
window.startTimer = i => {
  const x = session.ex[session.cur];
  session.timer = { ex: session.cur, set: i, end: Date.now() + timedSecs(x.reps) * 1000 };
  saveSess(); sfx('tick'); workoutView();
};
window.stopTimer = () => { session.timer = null; saveSess(); workoutView(); };
function timerDone() {
  const tm = session?.timer; if (!tm || Date.now() < tm.end) return false;
  const x = session.ex[tm.ex], s = x?.sets[tm.set];
  session.timer = null;
  if (s && !s.done) { s.done = true; s.r = String(parseInt(x.reps) || ''); }
  saveSess();
  return true;
}
function tickTimer() {
  const draw = () => {
    if (timerDone()) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]); sfx('claim');
      if (location.hash === '#/workout') { workoutView(); const x = session.ex[session.cur]; if (x.rest && x.sets.some(t => !t.done)) rest(x.rest); }
      return;
    }
    const el = $('#wt'); if (el && session?.timer) el.textContent = fmtSecs(Math.ceil((session.timer.end - Date.now()) / 1000));
  };
  draw(); timers.push(setInterval(draw, 500));
}
window.setVal = (i, k, v) => { session.ex[session.cur].sets[i][k] = v; saveSess(); };
window.addSet = () => { const x = session.ex[session.cur]; x.sets.push({ w: x.sets.at(-1)?.w || '', r: '', done: false }); saveSess(); workoutView(); };
window.nav = d => { session.cur += d; saveSess(); workoutView(); window.scrollTo(0, 0); };
window.quitWorkout = () => {
  const b = $('#rest'); b.hidden = false;
  b.innerHTML = '<h2>Discard this workout?</h2><div class="row"><button class="btn ghost" id="no">Keep going</button><button class="btn" id="yes">Discard</button></div>';
  $('#no').onclick = () => { b.hidden = true; };
  $('#yes').onclick = () => { b.hidden = true; session = null; saveSess(); location.hash = '#/home'; };
};
window.doneSet = i => {
  const x = session.ex[session.cur], s = x.sets[i], before = exXp(x).tier;
  s.done = !s.done;
  if (s.done && !s.r) s.r = String(parseInt(x.reps) || '');
  if (session.timer && session.timer.ex === session.cur && session.timer.set === i) session.timer = null;
  saveSess();
  workoutView();
  const after = exXp(x).tier;
  if (s.done) { sfx('tick'); if (after > before) floatXp(MEDAL_NAME[after]); }
  if (s.done && x.rest && x.sets.some(t => !t.done)) rest(x.rest);
};
function rest(sec) {
  const box = $('#rest'); let t = sec; box.hidden = false;
  const draw = () => {
    box.innerHTML = `<div class="mut">Rest</div><div class="t">${fmtSecs(t)}</div>
    <div class="row"><button class="btn ghost" id="m">−15s</button><button class="btn ghost" id="p">+15s</button></div><button class="btn" id="sk">Skip</button>`;
    $('#m').onclick = () => { t = Math.max(1, t - 15); draw(); }; $('#p').onclick = () => { t += 15; draw(); }; $('#sk').onclick = end;
  };
  const end = () => { clearInterval(iv); box.hidden = true; if (navigator.vibrate) navigator.vibrate(200); };
  const iv = setInterval(() => { if (--t <= 0) end(); else draw(); }, 1000); draw();
}
window.finish = () => {
  timerDone();
  const done = session.ex.filter(x => x.sets.some(s => s.done));
  const ex = done.map(x => ({ id: x.id, reps: x.reps, plan: x.plan || x.sets.length, tier: exXp(x).tier, sets: x.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 })) }));
  if (ex.length) {
    // the time is estimated from what was done (the same estimate as the plan's), not the clock
    const h = { t: Date.now(), name: session.name, dur: estMinutes(session), ex, xpEx: session.ex.reduce((a, x) => a + exXp(x).xp, 0) };
    if (session.dungeon) h.dungeon = session.dungeon;
    S.history.push(h); save('history', S.history); gameWorkout(h);
  }
  session = null; saveSess(); location.hash = ex.length ? '#/victory' : '#/home';
};
// a bar on every other screen while a workout is in progress
function resumeBar() {
  let bar = document.getElementById('resume');
  const show = session && location.hash !== '#/workout' && location.hash !== '#/victory';
  if (!show) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('button'); bar.id = 'resume'; bar.onclick = () => { location.hash = '#/workout'; }; document.body.appendChild(bar); }
  const doneN = session.ex.filter(x => x.sets.every(s => s.done)).length;
  bar.innerHTML = `${ic('play', 16)} <span class="grow">${esc(session.name)}</span><span>${doneN}/${session.ex.length}</span>`;
}
window.addEventListener('hashchange', resumeBar);
// a timed set that ends while you are on another screen still ticks itself off
setInterval(() => {
  if (session?.timer && location.hash !== '#/workout' && timerDone()) { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); sfx('claim'); toast('Timed set done'); resumeBar(); }
}, 1000);

// ---------- progress ----------
function progress() {
  if (needProfile()) return;
  const h = S.history, last = h.slice(-7), vols = last.map(volume), max = Math.max(1, ...vols), prs = {};
  h.forEach(w => w.ex.forEach(x => x.sets.forEach(s => { if (s.w > (prs[x.id]?.w || 0)) prs[x.id] = s; })));
  const first = S.weights[0]?.w ?? S.profile.weight, delta = curWeight() - first;
  view.innerHTML = `<h1>Progress</h1>
  <div class="grid3"><div class="stat"><b>${streak()}</b><span>day streak</span></div><div class="stat"><b>${h.length}</b><span>workouts</span></div>
  <div class="stat"><b>${h.reduce((a, w) => a + w.dur, 0)}</b><span>minutes</span></div></div>
  <section class="card"><div class="row between"><h3>Body weight</h3><span class="mut">${delta ? (delta > 0 ? '+' : '') + delta.toFixed(1) + ' kg since start' : ''}</span></div>
  ${weightChart()}
  <div class="row" style="margin-top:12px"><input id="nw" type="number" inputmode="decimal" step="0.1" placeholder="Today's weight (kg)" value="${curWeight()}"><button class="btn sm" id="lw">Log</button></div></section>
  <section class="card"><h3>Volume per workout</h3>${last.length ? `<div class="bars">${vols.map((v, i) => `<div style="height:${Math.max(3, v / max * 100)}%" title="${v} kg"><span>${new Date(last[i].t).getDate()}</span></div>`).join('')}</div><div class="mut" style="margin-top:20px">kg lifted (weight × reps), last ${last.length}</div>` : '<div class="mut">Finish a workout to see this.</div>'}</section>
  <h2 class="sec">Personal records</h2>
  ${Object.keys(prs).length ? Object.entries(prs).map(([id, s]) => `<div class="card row between"><div>${esc(BY[id]?.n || id)}</div><b>${s.w} kg × ${s.r}</b></div>`).join('') : '<div class="mut">No records yet.</div>'}
  <h2 class="sec">History</h2>${h.length ? h.slice().reverse().slice(0, 50).map(w => `<div class="card"><b>${esc(w.name)}</b><div class="mut">${new Date(w.t).toLocaleDateString(dateLocale())} · ${w.dur} min · ${w.ex.length} exercises</div></div>`).join('') : '<div class="mut">No workouts yet.</div>'}`;
  $('#lw').onclick = () => {
    const w = +$('#nw').value; if (!(w >= 30 && w <= 250)) return;
    const t = S.weights.at(-1);
    if (t && dayKey(t.t) === dayKey(Date.now())) t.w = w; else S.weights.push({ t: Date.now(), w });
    save('weights', S.weights); gameWeigh(); progress();
  };
}

// ---------- me ----------
function me() {
  if (needProfile()) return;
  view.innerHTML = heroCard();
}

// Settings: everything that is set once and rarely changed, out of the way of the game screens.
function settings() {
  if (needProfile()) return;
  const p = S.profile, a = analyze({ ...p, weight: curWeight() });
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <h1>Settings</h1>
  <h2 class="sec">Profile</h2>
  <label class="fld"><span>Name</span><div class="row"><input id="pname" value="${esc(p.name || '')}" maxlength="20" autocomplete="nickname"><button class="btn sm" onclick="saveName()">Save</button></div></label>
  <section class="card tap setrow" onclick="location.hash='#/start/edit'"><div class="grow"><b>Body and training plan</b>
    <div class="mut">${p.age} years · ${p.height} cm · ${curWeight()} kg · BMI ${a.bmi.toFixed(1)}</div><div class="mut">${GOALS[p.goal][0]} · ${p.days} days · ${p.minutes} min</div></div>${ic('edit', 20)}</section>
  ${typeof SB_ON !== 'undefined' && SB_ON ? `<section class="card tap setrow" onclick="location.hash='#/account'"><div class="grow"><b>Account</b><div class="mut">${CL.uid ? esc(CL.user || '') : 'Sign in to sync and add friends'}</div></div>${ic('user', 20)}</section>` : ''}
  <h2 class="sec">App</h2>
  <section class="card"><div class="row between setrow"><b>Sound effects</b><button class="chip ${G.sound ? 'on' : ''}" onclick="toggleSound()">${G.sound ? 'On' : 'Off'}</button></div>
    <div class="row between setrow"><b>Language</b>${langChips()}</div></section>
  <div id="setmusic"></div>
  <h2 class="sec">Your data</h2>
  <div class="row"><button class="btn ghost" id="exp">Export</button><button class="btn ghost" id="rst">Delete everything</button></div>
  ${APP_CODE ? `<section class="card row between setrow"><div><b>App 1.${APP_CODE}</b>${APP_NEW ? `<div class="mut">${esc(APP_NEW.name)} is ready</div>` : ''}</div>${APP_NEW ? `<a class="btn sm" href="${APP_NEW.url}">Update</a>` : '<button class="btn sm ghost" onclick="appUpdate(true)">Check</button>'}</section>` : ''}
  <div class="mut setfoot"><span>FitQuest version 134</span> · <span>free, no ads, no accounts: everything stays on this device. Estimates are guidance, not medical advice. Exercise photos: free-exercise-db.</span> <span>${GI_CREDIT}</span></div>`;
  $('#exp').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ profile: S.profile, plan: S.plan, history: S.history, weights: S.weights }, null, 1)], { type: 'application/json' }));
    const a2 = document.createElement('a'); a2.href = url; a2.download = 'fitquest-data.json'; a2.click();
  };
  $('#rst').onclick = () => {
    const b = $('#rest'); b.hidden = false;
    b.innerHTML = '<h2>Delete all data?</h2><div class="row"><button class="btn ghost" id="no">Cancel</button><button class="btn" id="yes">Delete</button></div>';
    $('#no').onclick = () => { b.hidden = true; };
    $('#yes').onclick = () => { Object.keys(localStorage).filter(k => k.startsWith('fc.')).forEach(k => localStorage.removeItem(k)); location.hash = ''; location.reload(); };
  };
}

// ---------- Android app ----------
// Inside the APK the browser name ends in "FitQuestApp/<web version> FitQuestShell/<native version>". The APK updates its
// web part by itself (MainActivity downloads web.zip from each release tag app-N); only when a release needs a newer
// native part (its shell-S asset) does a bar offer the new APK.
const APP_CODE = +((navigator.userAgent.match(/FitQuestApp\/(\d+)/) || [])[1] || 0);
const APP_SHELL = +((navigator.userAgent.match(/FitQuestShell\/(\d+)/) || [])[1] || 1);
let APP_NEW = null;
async function appUpdate(manual) {
  if (!APP_CODE) return;
  try {
    const rs = await (await fetch('https://api.github.com/repos/e1caro/torchnep/releases?per_page=30')).json();
    const top = rs.map(r => ({ r, n: +((r.tag_name.match(/^app-(\d+)$/) || [])[1] || 0) })).filter(x => x.n && !x.r.draft).sort((a, b) => b.n - a.n)[0];
    const apk = top?.r.assets.find(a => a.name.endsWith('.apk'));
    const shell = Math.max(1, ...(top?.r.assets || []).map(a => +((a.name.match(/^shell-(\d+)$/) || [])[1] || 0)));
    APP_NEW = top && top.n > APP_CODE && shell > APP_SHELL && apk ? { name: top.r.name, url: apk.browser_download_url, notes: top.r.body || '' } : null;
  } catch { if (manual) toast('No connection'); return; }
  if (manual) toast(APP_NEW ? `${APP_NEW.name} is ready` : 'You have the latest version');
  updateBar();
  if (location.hash === '#/settings') route();
}
function updateBar() {
  let bar = document.getElementById('updbar');
  if (!APP_NEW || session || document.body.classList.contains('focus')) { bar?.remove(); return; } // a workout's bar takes the spot
  if (!bar) { bar = document.createElement('a'); bar.id = 'updbar'; document.body.appendChild(bar); }
  bar.href = APP_NEW.url;
  bar.innerHTML = `${ic('up', 16)} <span class="grow">${esc(APP_NEW.name)}</span><b>Update</b>`;
}

// ---------- router ----------
const routes = { plan: planView, library, progress, me, settings, workout: workoutView, exercise: exerciseView, start: a => onboarding(a === 'edit') };
let lastRoute = '';
function route() {
  timers.forEach(clearInterval); timers = [];
  const [, name = 'home', arg] = (location.hash || '#/home').split('/');
  if (name !== 'start') wiz = null;
  const tab = name === 'rewards' ? (arg === 'shop' ? 'shop' : 'progress') : { dungeons: 'plan', friend: 'friends', account: 'me', profile: 'me', settings: 'me', exercise: 'plan', library: 'plan', meals: 'plan', recipe: 'plan', shop: 'plan', routine: 'plan', sport: 'home', earn: 'home', bets: 'home', workout: 'home', victory: 'home', start: 'me' }[name] || name;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === tab));
  document.body.classList.toggle('focus', ['workout', 'start', 'victory'].includes(name));
  document.body.classList.toggle('fitpage', name === 'home'); // Today fits the screen: no scrolling
  // a change on the same page (equip, buy, sell, a setting...) redraws it where you were; a new page starts at the top
  const same = location.hash === lastRoute, y = window.scrollY;
  lastRoute = location.hash;
  (routes[name] || home)(arg);
  if (name === 'progress' && typeof rwSeg === 'function' && view.querySelector('h1')) view.insertAdjacentHTML('afterbegin', rwSeg('stats')); // Progress: stats, levels, badges
  if (same) window.scrollTo(0, y); else if (name !== 'exercise') window.scrollTo(0, 0);
  if (typeof updateBar === 'function') updateBar();
}
window.addEventListener('hashchange', route);

// Less text on screen: long explanations move to one "How it works" dropdown at the end of the page, each under the name
// of the part it explains.
function compactText() {
  view.querySelectorAll('p.mut:not([data-c])').forEach(p => {
    p.dataset.c = 1;
    if (p.textContent.trim().length < 70 || p.closest('details,summary,button,.mbox')) return;
    if (((location.hash || '#/home').split('/')[1] || 'home') === 'home') { // Today's panels keep theirs in place
      const d = document.createElement('details'); d.className = 'info'; d.innerHTML = '<summary>More info</summary>'; p.replaceWith(d); d.appendChild(p); return;
    }
    let box = view.querySelector(':scope > details.pageinfo');
    if (!box) { box = document.createElement('details'); box.className = 'info pageinfo'; box.innerHTML = '<summary>How it works</summary>'; view.appendChild(box); }
    const head = p.closest('section,.card')?.querySelector('h3,h2') || [...view.querySelectorAll('h1,h2')].filter(h => h.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING).at(-1);
    if (head && head.tagName !== 'H1') { const t = document.createElement('b'); t.textContent = head.textContent.trim(); box.appendChild(t); }
    box.appendChild(p);
  });
  const box = view.querySelector(':scope > details.pageinfo');
  if (box && box.nextElementSibling) view.appendChild(box); // keep it last
}
// Cleaner screens: each section (a "sec" heading and what follows it) folds into a dropdown on the busy screens.
// Buttons that sit between sections (check-in, open chest, more ways to earn) stay visible.
const FOLD_ROUTES = ['earn', 'progress', 'rewards/shop']; // Today uses bubbles instead (bubbles.js)
const foldState = (() => { try { return JSON.parse(localStorage.getItem('fc.fold')) || {}; } catch { return {}; } })();
function foldSections() {
  const name = (location.hash || '#/home').split('/')[1] || 'home';
  if (!(FOLD_ROUTES.includes(name) || FOLD_ROUTES.includes(name + '/' + (location.hash.split('/')[2] || ''))) || view.querySelector(':scope > details.fold')) return;
  const isHead = el => el.matches('h2.sec, .sec2');
  const heads = [...view.children].filter(isHead);
  heads.forEach((h, idx) => {
    const key = name + ':' + (location.hash.split('/')[2] || '') + ':' + idx, body = [], loose = [];
    for (let el = h.nextElementSibling; el && !isHead(el) && !el.matches('details.pageinfo'); el = el.nextElementSibling) (el.matches('button.btn, a.btn, label.btn') ? loose : body).push(el);
    if (!body.length) return;
    const d = document.createElement('details'); d.className = 'fold';
    const sum = document.createElement('summary');
    h.before(d); // place the dropdown first, then move the heading into its summary
    const title = h.matches('h2') ? h : h.querySelector('h2'), status = h.matches('h2') ? null : h.querySelector('.mut');
    title.classList.add('sec'); sum.appendChild(title); if (status) sum.appendChild(status);
    if (h !== title) h.remove();
    if (body.some(el => el.querySelector?.('.quest.ok button, .chestbtn, button[onclick*="claim"]') || el.matches?.('.quest.ok'))) sum.insertAdjacentHTML('beforeend', '<i class="foldnew" aria-label="Something to claim">!</i>');
    d.appendChild(sum); body.forEach(el => d.appendChild(el));
    const focus = typeof SHOP_FOCUS === 'string' && name === 'rewards' ? SHOP_FOCUS : null; // "more in the Shop" from one kind of look
    d.open = focus ? title.dataset.t === focus : key in foldState ? foldState[key] : body.some(el => el.matches?.('.next'));
    if (focus && d.open) { d.skipSave = true; requestAnimationFrame(() => d.scrollIntoView({ block: 'start' })); } // a one-off view: not remembered
    d.addEventListener('toggle', () => {
      // in the shop, opening one kind of look folds the others
      if (d.open && name === 'rewards' && location.hash.split('/')[2] === 'shop') view.querySelectorAll(':scope > details.fold[open]').forEach(o => { if (o !== d) o.open = false; });
      if (d.skipSave) { d.skipSave = false; return; } foldState[key] = d.open; try { localStorage.setItem('fc.fold', JSON.stringify(foldState)); } catch { /* storage blocked */ } });
    let after = d; loose.forEach(b => { after.after(b); after = b; });
  });
  if (name === 'rewards' && typeof SHOP_FOCUS === 'string' && heads.length) SHOP_FOCUS = null;
}
let compactQ = 0;
new MutationObserver(() => { if (!compactQ) compactQ = requestAnimationFrame(() => { compactQ = 0; compactText(); foldSections(); }); }).observe(view, { childList: true, subtree: true });

try { localStorage.removeItem('fc.gym'); } catch { /* storage blocked */ } // the Synergym gym pass was removed
(async function init() {
  if ('serviceWorker' in navigator && !APP_CODE) { // the Android app carries its files inside, no service worker
    // New versions apply on their own: check when the app comes back to the screen, and reload once the new worker takes over.
    const hadSW = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => { }); });
    }).catch(() => { });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded && !session) { reloaded = true; location.reload(); } });
  }
  try {
    EX = await (await fetch('data/exercises.json')).json();
    VID = await (await fetch('data/videos.json')).json().catch(() => ({}));
    await langReady();
  } catch { view.innerHTML = '<h1>Could not load exercises</h1><p class="mut">Open the app once with a connection.</p>'; return; }
  EX.forEach(e => { BY[e.id] = e; });
  initGame();
  route(); resumeBar(); appUpdate();
})();
