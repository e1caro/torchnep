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
const save = (k, v) => { try { localStorage.setItem('fc.' + k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
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
  const tdee = bmr * (1.2 + 0.08 * p.days + (p.minutes >= 60 ? 0.05 : 0));
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
  return { bmi, bmiLabel, bmr, tdee, kcal, protein, fat, carbs, water, notes };
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

function generatePlan(p) {
  const r = rng(Date.now() & 0xffffff), have = equipSet(p);
  const pool = EX.filter(e => ['strength', 'plyometrics', 'powerlifting', 'olympic weightlifting'].includes(e.c) && allowed(e, p, have));
  const cardio = EX.filter(e => e.c === 'cardio' && allowed(e, p, new Set([...have, 'machine', 'other'])) && e.e !== 'other');
  const per = p.minutes <= 30 ? 4 : p.minutes <= 45 ? 6 : 8;
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
    const slots = DAYS[kind].slice(0, per), allow = KIND_MUSCLES[kind];
    const extra = shuffle(focusMuscles.filter(m => !allow || allow.includes(m)), r).slice(0, 2);
    extra.forEach((m, i) => slots.splice(2 + i, 0, m));
    const items = [];
    for (const m of slots) {
      const e = pick(m, items); if (!e) continue;
      items.push({ id: e.id, sets: focusMuscles.includes(m) ? sets + 1 : sets, reps, rest });
    }
    if (p.goal === 'fat' && cardio.length) { const c = shuffle(cardio, r)[0]; items.push({ id: c.id, sets: 1, reps: p.minutes <= 30 ? '8 min' : '12 min', rest: 0 }); }
    const st = shuffle(EX.filter(e => e.c === 'stretching' && allowed(e, p, have) && (!allow || allow.includes(e.m[0]) || e.m[0] === 'abdominals')), r)[0];
    if (st) items.push({ id: st.id, sets: 1, reps: '30s', rest: 20 });
    return { name: `Day ${di + 1} · ${KIND_NAME[kind]}`, kind, items };
  });
  return { created: Date.now(), days };
}

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
const num = (id, label, val, unit, extra = '') => `<label class="fld"><span>${label}</span><div class="inp"><input id="${id}" type="number" inputmode="decimal" value="${val}" ${extra}><em>${unit}</em></div></label>`;

function onboarding(edit) {
  if (!wiz) wiz = { step: 0, p: { ...BLANK, ...(edit && S.profile ? S.profile : {}) }, edit: !!edit };
  const p = wiz.p, s = wiz.step;
  const body = [
    () => `<div class="lbl" style="margin-top:0">Language</div>${langChips()}<label class="fld"><span>What should we call you?</span><div class="inp"><input id="f-name" value="${esc(p.name)}" placeholder="Your name" autocomplete="given-name"></div></label>
      <div class="lbl">Gender</div>${chips('gender', [['male', 'Male'], ['female', 'Female'], ['other', 'Other']], p.gender)}
      <div class="two">${num('f-age', 'Age', p.age, 'yrs', 'min="14" max="90"')}${num('f-height', 'Height', p.height, 'cm', 'min="120" max="230"')}</div>
      ${num('f-weight', 'Weight', p.weight, 'kg', 'min="30" max="250" step="0.1"')}
      <div class="lbl">Profile picture</div><div class="pgrid">${typeof ITEMS === 'undefined' ? '' : ITEMS.filter(i => i.type === 'avatar' && i.cost === 0).map(i => `<button type="button" class="pick ${G.avatar === i.key ? 'on' : ''}" data-pic="${i.key}" aria-label="${i.name}" title="${i.name}">${gi(i.key, 'hero')}</button>`).join('')}</div>
      <p class="mut">You can change it any time. Fancier pictures cost coins in the Shop.</p><p class="mut">Your body data is used for calories, protein and a safe training load. It never leaves this phone.</p>`,
    () => `<div class="lbl">Main objective</div><div class="opts" data-k="goal">${Object.entries(GOALS).map(([k, [t, d]]) => `<button type="button" class="opt ${p.goal === k ? 'on' : ''}" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>
      ${num('f-target', 'Target weight (optional)', p.target, 'kg', 'min="30" max="250" step="0.1"')}`,
    () => `<div class="lbl">Experience</div>${chips('level', LEVELS.map(l => [l, cap(l)]), p.level)}
      <div class="lbl">Days per week</div>${chips('days', [2, 3, 4, 5, 6].map(d => [d, d]), p.days)}
      <div class="lbl">Time per session</div>${chips('minutes', [30, 45, 60].map(m => [m, m + ' min']), p.minutes)}
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
  const read = () => {
    const g = id => $('#' + id)?.value;
    if (s === 0) { p.name = g('f-name').trim(); p.age = +g('f-age') || ''; p.height = +g('f-height') || ''; p.weight = +g('f-weight') || ''; }
    if (s === 1) p.target = +g('f-target') || '';
  };
  view.querySelectorAll('[data-pic]').forEach(b => b.onclick = () => { G.avatar = b.dataset.pic; commit(); view.querySelectorAll('[data-pic]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bk')?.addEventListener('click', () => { read(); if (s) { wiz.step--; onboarding(); } else { wiz = null; location.hash = '#/me'; } });
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
  const p = S.profile, a = analyze(p);
  view.innerHTML = `<h1>Your plan</h1><div class="mut">${GOALS[p.goal][0]} · ${p.days} days a week · ${cap(p.level)}</div>
  <details class="card why" open><summary>Why this plan</summary><ul>${a.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` +
    S.plan.days.map((d, di) => `<section class="card"><div class="row between"><h3>${esc(d.name)}</h3><button class="btn sm" onclick="startWorkout(${di})">Start</button></div>
    ${d.items.map((it, ii) => { const e = BY[it.id]; return e ? `<div class="item"><a class="row grow" href="#/exercise/${e.id}">${thumb(e)}<div><div>${esc(e.n)}</div><div class="mut">${it.sets} × ${it.reps}</div></div></a>
    <button class="icon" aria-label="Swap exercise" onclick="swapEx(${di},${ii})">${ic('swap', 18)}</button></div>` : ''; }).join('')}</section>`).join('') +
    `<button class="btn ghost" onclick="location.hash='#/library'">Browse exercise library</button><button class="btn ghost" onclick="regen()">Shuffle exercises</button><button class="btn ghost" onclick="location.hash='#/start'">Change my answers</button>`;
}
window.regen = () => { S.plan = generatePlan(S.profile); save('plan', S.plan); planView(); };
window.swapEx = (di, ii) => {
  const it = S.plan.days[di].items[ii], cur = BY[it.id], have = equipSet(S.profile);
  const c = EX.filter(e => e.m[0] === cur.m[0] && e.c === cur.c && e.id !== cur.id && allowed(e, S.profile, have) && !S.plan.days[di].items.some(i => i.id === e.id));
  if (!c.length) return;
  it.id = c[Math.floor(Math.random() * c.length)].id; save('plan', S.plan); planView();
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
function startSession(name, items, extra = {}) {
  session = { t0: Date.now(), cur: 0, name, ...extra, ex: items.map(it => ({ id: it.id, reps: it.reps, rest: it.rest, sets: Array.from({ length: it.sets }, () => ({ w: '', r: '', done: false })) })) };
  const last = {}; S.history.forEach(h => h.ex.forEach(x => { last[x.id] = x.sets.find(s => s.w) || last[x.id]; }));
  session.ex.forEach(x => { const l = last[x.id]; if (l) { x.last = l; x.sets.forEach(s => { s.w = l.w; }); } });
  location.hash = '#/workout';
}
window.startWorkout = di => { const d = S.plan.days[di]; startSession(d.name, d.items, { di }); };

function workoutView() {
  if (!session) { location.hash = '#/home'; return; }
  const x = session.ex[session.cur], e = BY[x.id], n = session.ex.length, timed = isNaN(parseInt(x.reps)) || /min|s$/.test(x.reps);
  view.innerHTML = `<div class="row between"><button class="icon" aria-label="Quit" onclick="quitWorkout()">${ic('close', 20)}</button>
  <div class="mut">${esc(session.name)}</div><div class="xpchip">+${session.ex.reduce((a, q) => a + q.sets.filter(t => t.done).length, 0) * 10} XP</div></div>
  <div class="mut" style="text-align:right">Exercise ${session.cur + 1} of ${n}</div>
  <div class="prog"><i style="width:${(session.cur + 1) / n * 100}%"></i></div>
  <h1>${esc(e.n)}</h1>${demo(e)}
  <div class="mut" style="margin:8px 0">Target ${x.sets.length} × ${x.reps}${x.last ? ` · last time ${x.last.w} kg × ${x.last.r}` : ''}</div>
  <table class="sets"><tr class="mut"><th>Set</th>${timed ? '' : '<th>kg</th><th>Reps</th>'}<th></th></tr>
  ${x.sets.map((s, i) => `<tr class="${s.done ? 'done' : ''}"><td>${i + 1}</td>
  ${timed ? '' : `<td><input type="number" inputmode="decimal" value="${s.w}" aria-label="Weight set ${i + 1}" onchange="setVal(${i},'w',this.value)"></td>
  <td><input type="number" inputmode="numeric" value="${s.r}" placeholder="${esc(x.reps)}" aria-label="Reps set ${i + 1}" onchange="setVal(${i},'r',this.value)"></td>`}
  <td><button class="ck ${s.done ? 'on' : ''}" aria-label="Complete set ${i + 1}" onclick="doneSet(${i})">${s.done ? ic('check', 20) : ''}</button></td></tr>`).join('')}</table>
  ${timed ? '' : `<button class="btn sm ghost" onclick="addSet()">${ic('plus', 16)} Add set</button>`}
  <div class="row" style="margin-top:16px"><button class="btn ghost" ${session.cur ? '' : 'disabled'} onclick="nav(-1)">Previous</button>
  ${session.cur < n - 1 ? '<button class="btn" onclick="nav(1)">Next</button>' : '<button class="btn gold" onclick="finish()">Finish</button>'}</div>
  <details class="card"><summary>Instructions</summary><ol class="how">${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`;
  startLoops();
}
window.setVal = (i, k, v) => { session.ex[session.cur].sets[i][k] = v; };
window.addSet = () => { const x = session.ex[session.cur]; x.sets.push({ w: x.sets.at(-1)?.w || '', r: '', done: false }); workoutView(); };
window.nav = d => { session.cur += d; workoutView(); window.scrollTo(0, 0); };
window.quitWorkout = () => {
  const b = $('#rest'); b.hidden = false;
  b.innerHTML = '<h2>Discard this workout?</h2><div class="row"><button class="btn ghost" id="no">Keep going</button><button class="btn" id="yes">Discard</button></div>';
  $('#no').onclick = () => { b.hidden = true; };
  $('#yes').onclick = () => { b.hidden = true; session = null; location.hash = '#/home'; };
};
window.doneSet = i => {
  const x = session.ex[session.cur], s = x.sets[i];
  s.done = !s.done;
  if (s.done && !s.r) s.r = String(parseInt(x.reps) || '');
  workoutView();
  if (s.done) { sfx('tick'); floatXp('+10 XP'); }
  if (s.done && x.rest) rest(x.rest);
};
function rest(sec) {
  const box = $('#rest'); let t = sec; box.hidden = false;
  const draw = () => {
    box.innerHTML = `<div class="mut">Rest</div><div class="t">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</div>
    <div class="row"><button class="btn ghost" id="m">−15s</button><button class="btn ghost" id="p">+15s</button></div><button class="btn" id="sk">Skip</button>`;
    $('#m').onclick = () => { t = Math.max(1, t - 15); draw(); }; $('#p').onclick = () => { t += 15; draw(); }; $('#sk').onclick = end;
  };
  const end = () => { clearInterval(iv); box.hidden = true; if (navigator.vibrate) navigator.vibrate(200); };
  const iv = setInterval(() => { if (--t <= 0) end(); else draw(); }, 1000); draw();
}
window.finish = () => {
  const ex = session.ex.map(x => ({ id: x.id, sets: x.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 })) })).filter(x => x.sets.length);
  if (ex.length) {
    const h = { t: Date.now(), name: session.name, dur: Math.max(1, Math.round((Date.now() - session.t0) / 60000)), ex };
    if (session.dungeon) h.dungeon = session.dungeon;
    S.history.push(h); save('history', S.history); gameWorkout(h);
  }
  session = null; location.hash = ex.length ? '#/victory' : '#/home';
};

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
  const p = S.profile, a = analyze({ ...p, weight: curWeight() });
  view.innerHTML = `${heroCard()}<h2 class="sec">Body</h2>
  <div class="grid3"><div class="stat"><b>${p.age}</b><span>years</span></div><div class="stat"><b>${p.height}</b><span>cm</span></div><div class="stat"><b>${curWeight()}</b><span>kg</span></div></div>
  <section class="card"><div class="row between"><span class="mut">BMI</span><b>${a.bmi.toFixed(1)} · ${a.bmiLabel}</b></div>
  <div class="row between"><span class="mut">Goal</span><b>${GOALS[p.goal][0]}</b></div>
  <div class="row between"><span class="mut">Schedule</span><b>${p.days} days · ${p.minutes} min</b></div>
  <div class="row between"><span class="mut">Equipment</span><b>${p.equipment.map(k => EQUIP[k]).join(', ')}</b></div></section>
  <button class="btn" onclick="location.hash='#/start/edit'">Edit body data and training plan</button>
  <button class="btn ghost" id="exp">Export my data</button><button class="btn ghost" id="rst">Reset everything</button>
  <p class="mut">FitQuest is free, with no ads and no payments. Coins and XP are just for fun. Everything stays on this device; there are no accounts, ads or payments. Estimates are guidance, not medical advice. Exercise photos: free-exercise-db (public domain). ${GI_CREDIT}</p>`;
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

// ---------- router ----------
const routes = { plan: planView, library, progress, me, workout: workoutView, exercise: exerciseView, start: a => onboarding(a === 'edit') };
function route() {
  timers.forEach(clearInterval); timers = [];
  const [, name = 'home', arg] = (location.hash || '#/home').split('/');
  if (name !== 'start') wiz = null;
  const tab = { profile: 'me', exercise: 'plan', library: 'plan', meals: 'plan', recipe: 'plan', shop: 'plan', routine: 'plan', sport: 'home', earn: 'home', bets: 'home', workout: 'home', victory: 'home', start: 'me' }[name] || name;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === tab));
  document.body.classList.toggle('focus', ['workout', 'start', 'victory'].includes(name));
  (routes[name] || home)(arg);
  if (name !== 'exercise') window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

(async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  try {
    EX = await (await fetch('data/exercises.json')).json();
    VID = await (await fetch('data/videos.json')).json().catch(() => ({}));
    await langReady();
  } catch { view.innerHTML = '<h1>Could not load exercises</h1><p class="mut">Open the app once with a connection.</p>'; return; }
  EX.forEach(e => { BY[e.id] = e; });
  initGame();
  route();
})();
