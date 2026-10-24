'use strict';
// FitCoach — offline-first workout PWA. No backend; all state lives in localStorage.

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const LEVELS = ['beginner', 'intermediate', 'expert'];
const FREE_REGENS = 1;
const FREE_MAX_DAYS = 3;
const GOALS = { muscle: 'Build muscle', strength: 'Get stronger', fat: 'Lose fat', general: 'General fitness' };
const EQUIP = { 'body only': 'Bodyweight', dumbbell: 'Dumbbells', barbell: 'Barbell', cable: 'Cables', machine: 'Machines', kettlebells: 'Kettlebells', bands: 'Bands' };
const SCHEME = { // sets, reps, rest(s)
  muscle: [3, '8-12', 75], strength: [4, '3-6', 150], fat: [3, '12-15', 45], general: [3, '10-12', 60],
};
const DAYS = {
  FULL: ['quadriceps', 'chest', 'lats', 'shoulders', 'hamstrings', 'abdominals', 'biceps', 'triceps'],
  UPPER: ['chest', 'lats', 'shoulders', 'middle back', 'biceps', 'triceps', 'chest', 'lats'],
  LOWER: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abdominals', 'quadriceps', 'hamstrings', 'lower back'],
  PUSH: ['chest', 'shoulders', 'chest', 'triceps', 'shoulders', 'triceps', 'chest', 'abdominals'],
  PULL: ['lats', 'middle back', 'lats', 'biceps', 'traps', 'biceps', 'middle back', 'forearms'],
};
const SPLITS = {
  2: ['FULL', 'FULL'], 3: ['FULL', 'FULL', 'FULL'], 4: ['UPPER', 'LOWER', 'UPPER', 'LOWER'],
  5: ['PUSH', 'PULL', 'LOWER', 'UPPER', 'LOWER'], 6: ['PUSH', 'PULL', 'LOWER', 'PUSH', 'PULL', 'LOWER'],
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------- state ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem('fc.' + k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('fc.' + k, JSON.stringify(v)); } catch { /* storage full/blocked */ } };
const S = {
  profile: load('profile', null), plan: load('plan', null), history: load('history', []),
  premium: load('premium', false), regens: load('regens', 0),
};
let EX = [], BY = {}, VID = {};
let session = null; // active workout
let timers = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const view = $('#view');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const isFree = e => e.l === 'beginner';
const usable = e => S.premium || isFree(e);

// ---------- demo media ----------
// Real video (data/videos.json: id -> mp4 URL or YouTube id) wins; otherwise loop the start/end pose images.
function demo(e) {
  const v = VID[e.id];
  if (v && /^[\w-]{11}$/.test(v)) return `<div class="demo"><iframe src="https://www.youtube-nocookie.com/embed/${v}?loop=1&playlist=${v}&rel=0" allowfullscreen></iframe></div>`;
  if (v) return `<div class="demo"><video src="${esc(v)}" autoplay loop muted playsinline controls></video></div>`;
  const a = IMG_BASE + e.id + '/0.jpg', b = IMG_BASE + e.id + '/' + (e.im > 1 ? 1 : 0) + '.jpg';
  return `<div class="demo"><img data-a="${a}" data-b="${b}" src="${a}" alt="${esc(e.n)}" loading="lazy"><small>demo loop</small></div>`;
}
function startLoops() {
  timers.forEach(clearInterval); timers = [];
  document.querySelectorAll('.demo img[data-a]').forEach(img => {
    let f = 0;
    timers.push(setInterval(() => { f ^= 1; img.src = f ? img.dataset.b : img.dataset.a; }, 900));
  });
}
const thumb = e => `<img class="thumb" loading="lazy" src="${IMG_BASE}${e.id}/0.jpg" alt="">`;

// ---------- plan generator ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function generatePlan(p) {
  const r = rng(Date.now() & 0xffffff);
  const maxLvl = LEVELS.indexOf(p.level);
  const have = new Set([...p.equipment, 'none', 'other']);
  const pool = EX.filter(e => usable(e) && LEVELS.indexOf(e.l) <= maxLvl && have.has(e.e) &&
    (e.c === 'strength' || e.c === 'plyometrics' || e.c === 'powerlifting' || e.c === 'olympic weightlifting'));
  const per = p.minutes <= 30 ? 4 : p.minutes <= 45 ? 6 : 8;
  const [sets, reps, rest] = SCHEME[p.goal];
  const used = new Set();
  const days = SPLITS[p.days].map((kind, di) => {
    const slots = DAYS[kind].slice(0, per);
    const items = [];
    for (const m of slots) {
      let c = shuffle(pool.filter(e => e.m[0] === m && !used.has(e.id)), r);
      if (!c.length) c = shuffle(pool.filter(e => e.m[0] === m && !items.some(i => i.id === e.id)), r);
      if (!c.length) continue;
      used.add(c[0].id);
      items.push({ id: c[0].id, sets, reps, rest });
    }
    const stretch = shuffle(EX.filter(e => usable(e) && e.c === 'stretching' && DAYS[kind].includes(e.m[0]) && have.has(e.e)), r)[0];
    if (stretch) items.push({ id: stretch.id, sets: 1, reps: '30s', rest: 20 });
    return { name: `Day ${di + 1} · ${{ FULL: 'Full body', UPPER: 'Upper body', LOWER: 'Lower body', PUSH: 'Push', PULL: 'Pull' }[kind]}`, items };
  });
  return { created: Date.now(), days };
}

// ---------- history helpers ----------
const dayKey = t => new Date(t).toDateString();
function streak() {
  const set = new Set(S.history.map(h => dayKey(h.t)));
  let n = 0, d = new Date();
  if (!set.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (set.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const volume = h => h.ex.reduce((a, x) => a + x.sets.reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0);
function nextDayIdx() { return S.plan ? S.history.filter(h => h.t > S.plan.created).length % S.plan.days.length : 0; }

// ---------- views ----------
const routes = { home, plan: planView, library, progress, premium, onboarding, workout: workoutView, exercise: exerciseView };

function lockCard(what) {
  return `<div class="card tap" onclick="location.hash='#/premium'"><span class="lock">⭐ Premium</span> — ${what}</div>`;
}

function onboarding() {
  const p = S.profile || { goal: 'muscle', level: 'beginner', equipment: ['body only', 'dumbbell'], days: 3, minutes: 45 };
  const opt = (arr, cur, fn) => arr.map(([v, l]) => `<span class="chip ${fn(v, cur) ? 'on' : ''}" data-v="${v}">${l}</span>`).join('');
  view.innerHTML = `<h1>Build your plan</h1>
  <h2>Goal</h2><div class="chips" data-k="goal">${opt(Object.entries(GOALS), p.goal, (v, c) => v === c)}</div>
  <h2>Experience</h2><div class="chips" data-k="level">${opt(LEVELS.map(l => [l, cap(l)]), p.level, (v, c) => v === c)}</div>
  <h2>Equipment</h2><div class="chips" data-k="equipment" data-multi="1">${opt(Object.entries(EQUIP), p.equipment, (v, c) => c.includes(v))}</div>
  <h2>Days per week</h2><div class="chips" data-k="days">${opt([2, 3, 4, 5, 6].map(d => [d, d + (d > FREE_MAX_DAYS && !S.premium ? ' ⭐' : '')]), p.days, (v, c) => +v === c)}</div>
  <h2>Session length</h2><div class="chips" data-k="minutes">${opt([30, 45, 60].map(m => [m, m + ' min']), p.minutes, (v, c) => +v === c)}</div>
  <button id="go">Generate my plan</button>`;
  view.querySelectorAll('.chips').forEach(box => box.addEventListener('click', ev => {
    const c = ev.target.closest('.chip'); if (!c) return;
    const k = box.dataset.k, v = c.dataset.v;
    if (box.dataset.multi) {
      const i = p.equipment.indexOf(v); if (i >= 0) p.equipment.splice(i, 1); else p.equipment.push(v);
      c.classList.toggle('on');
    } else {
      if (k === 'days' && +v > FREE_MAX_DAYS && !S.premium) { location.hash = '#/premium'; return; }
      p[k] = ['days', 'minutes'].includes(k) ? +v : v;
      box.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
    }
  }));
  $('#go').onclick = () => {
    if (!p.equipment.length) p.equipment = ['body only'];
    if (S.plan && !S.premium && S.regens >= FREE_REGENS) { location.hash = '#/premium'; return; }
    if (S.plan) { S.regens++; save('regens', S.regens); }
    S.profile = p; save('profile', p);
    S.plan = generatePlan(p); save('plan', S.plan);
    location.hash = '#/plan';
  };
}

function home() {
  if (!S.plan) return onboarding();
  const di = nextDayIdx(), d = S.plan.days[di];
  const first = BY[d.items[0].id];
  view.innerHTML = `<h1>Today</h1>
  <div class="grid"><div class="stat"><b>${streak()}</b><span class="mut">day streak</span></div>
  <div class="stat"><b>${S.history.length}</b><span class="mut">workouts</span></div>
  <div class="stat"><b>${S.history.filter(h => Date.now() - h.t < 7 * 864e5).length}</b><span class="mut">this week</span></div></div>
  <div class="card"><div class="mut">Up next</div><h3>${esc(d.name)}</h3>
  <div class="mut">${d.items.length} exercises · ~${S.profile.minutes} min</div>${first ? demo(first) : ''}
  <button onclick="startWorkout(${di})">Start workout</button></div>
  ${S.premium ? '' : lockCard('unlock 800+ exercises, 4–6 day splits, unlimited plans and advanced stats')}`;
  startLoops();
}

function planView() {
  if (!S.plan) return onboarding();
  view.innerHTML = `<h1>Your plan</h1><div class="mut">${GOALS[S.profile.goal]} · ${S.profile.days} days/week · ${cap(S.profile.level)}</div>` +
    S.plan.days.map((d, di) => `<div class="card"><div class="row"><h3 class="sp">${esc(d.name)}</h3><button class="sm" onclick="startWorkout(${di})">Start</button></div>
    ${d.items.map((it, ii) => { const e = BY[it.id]; return e ? `<div class="row" style="margin:8px 0"><div class="row sp tap" onclick="location.hash='#/exercise/${e.id}'">${thumb(e)}<div><div>${esc(e.n)}</div><div class="mut">${it.sets} × ${it.reps}</div></div></div>
    ${S.premium ? `<button class="sm sec" onclick="swapEx(${di},${ii})">⇄</button>` : ''}</div>` : ''; }).join('')}</div>`).join('') +
    `<button class="sec" onclick="location.hash='#/onboarding'">Regenerate plan${S.premium ? '' : ` (${Math.max(0, FREE_REGENS - S.regens)} free left)`}</button>`;
}

window.swapEx = (di, ii) => {
  const it = S.plan.days[di].items[ii], cur = BY[it.id];
  const c = EX.filter(e => e.m[0] === cur.m[0] && e.c === cur.c && e.id !== cur.id && LEVELS.indexOf(e.l) <= LEVELS.indexOf(S.profile.level) && (S.profile.equipment.includes(e.e) || e.e === 'none'));
  if (!c.length) return;
  it.id = c[Math.floor(Math.random() * c.length)].id; save('plan', S.plan); planView();
};

let libF = { q: '', m: '', e: '' };
function library() {
  const muscles = [...new Set(EX.flatMap(e => e.m))].sort();
  const list = EX.filter(e => (!libF.q || e.n.toLowerCase().includes(libF.q)) && (!libF.m || e.m.includes(libF.m)) && (!libF.e || e.e === libF.e));
  view.innerHTML = `<h1>Exercise library</h1>
  <input id="q" placeholder="Search ${EX.length} exercises" value="${esc(libF.q)}">
  <div class="row" style="margin:8px 0"><select id="fm"><option value="">All muscles</option>${muscles.map(m => `<option ${m === libF.m ? 'selected' : ''}>${m}</option>`).join('')}</select>
  <select id="fe"><option value="">All equipment</option>${[...new Set(EX.map(e => e.e))].sort().map(m => `<option ${m === libF.e ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
  <div class="mut">${list.length} results${S.premium ? '' : ' · ⭐ = Premium'}</div>
  <div id="list">${list.slice(0, 60).map(e => `<div class="card tap row" onclick="location.hash='#/exercise/${e.id}'">${thumb(e)}<div class="sp"><div>${esc(e.n)}</div><div class="mut">${e.m[0]} · ${e.e}</div></div>${usable(e) ? '' : '<span class="lock">⭐</span>'}</div>`).join('')}</div>
  ${list.length > 60 ? '<div class="mut">Showing the first 60 — refine your search.</div>' : ''}`;
  $('#q').oninput = ev => { libF.q = ev.target.value.toLowerCase(); const pos = ev.target.selectionStart; library(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); };
  $('#fm').onchange = ev => { libF.m = ev.target.value; library(); };
  $('#fe').onchange = ev => { libF.e = ev.target.value; library(); };
}

function exerciseView(id) {
  const e = BY[id]; if (!e) return (location.hash = '#/library');
  const locked = !usable(e);
  view.innerHTML = `<button class="sm sec" onclick="history.back()">← Back</button><h1>${esc(e.n)}</h1>
  ${locked ? lockCard('this exercise is part of the full library') : demo(e)}
  <div class="chips">${[...e.m, ...e.s].map(m => `<span class="chip">${m}</span>`).join('')}<span class="chip">${e.e}</span><span class="chip">${e.l}</span></div>
  ${locked ? '' : `<h2>How to</h2><ol>${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}`;
  startLoops();
}

// ---------- workout ----------
window.startWorkout = di => {
  const d = S.plan.days[di];
  session = { di, t0: Date.now(), cur: 0, name: d.name, ex: d.items.map(it => ({ id: it.id, reps: it.reps, rest: it.rest, sets: Array.from({ length: it.sets }, () => ({ w: '', r: '', done: false })) })) };
  const last = {}; S.history.forEach(h => h.ex.forEach(x => { last[x.id] = x.sets.find(s => s.w) || last[x.id]; }));
  session.ex.forEach(x => { const l = last[x.id]; if (l) x.sets.forEach(s => { s.w = l.w; }); });
  location.hash = '#/workout';
};

function workoutView() {
  if (!session) return (location.hash = '#/home');
  const x = session.ex[session.cur], e = BY[x.id], n = session.ex.length;
  view.innerHTML = `<div class="row"><button class="sm sec" onclick="quitWorkout()">✕</button><div class="sp mut" style="text-align:center">${esc(session.name)} · ${session.cur + 1}/${n}</div></div>
  <h1>${esc(e.n)}</h1>${demo(e)}
  <div class="mut" style="margin-top:8px">Target: ${x.sets.length} × ${x.reps}</div>
  <table class="sets"><tr class="mut"><th>Set</th><th>kg</th><th>Reps</th><th></th></tr>
  ${x.sets.map((s, i) => `<tr class="${s.done ? 'done' : ''}"><td>${i + 1}</td>
  <td><input type="number" inputmode="decimal" value="${s.w}" onchange="setVal(${i},'w',this.value)"></td>
  <td><input type="number" inputmode="numeric" value="${s.r}" placeholder="${esc(x.reps)}" onchange="setVal(${i},'r',this.value)"></td>
  <td><button class="ck ${s.done ? 'sec' : ''}" onclick="doneSet(${i})">${s.done ? '✓' : '○'}</button></td></tr>`).join('')}</table>
  <button class="sec sm" style="margin-top:8px" onclick="addSet()">+ Add set</button>
  <div class="row" style="margin-top:14px"><button class="sec" ${session.cur ? '' : 'disabled'} onclick="nav(-1)">Previous</button>
  ${session.cur < n - 1 ? '<button onclick="nav(1)">Next</button>' : '<button class="gold" onclick="finish()">Finish</button>'}</div>
  <details class="card"><summary>Instructions</summary><ol>${e.i.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`;
  startLoops();
}
window.setVal = (i, k, v) => { session.ex[session.cur].sets[i][k] = v; };
window.addSet = () => { const x = session.ex[session.cur]; x.sets.push({ w: x.sets.at(-1)?.w || '', r: '', done: false }); workoutView(); };
window.nav = d => { session.cur += d; workoutView(); window.scrollTo(0, 0); };
window.quitWorkout = () => { if (confirm('Discard this workout?')) { session = null; location.hash = '#/home'; } };
window.doneSet = i => {
  const x = session.ex[session.cur], s = x.sets[i];
  s.done = !s.done;
  if (s.done && !s.r) s.r = String(parseInt(x.reps) || '');
  workoutView();
  if (s.done) rest(S.premium ? x.rest : Math.max(x.rest, 60));
};
function rest(sec) {
  const box = $('#rest'); let t = sec; box.hidden = false;
  const draw = () => { box.innerHTML = `<div class="mut">Rest</div><div class="t">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</div>
    <div class="row" style="width:260px"><button class="sec" id="m">−15s</button><button class="sec" id="p">+15s</button></div><button id="sk" style="width:260px">Skip</button>`;
    $('#m').onclick = () => { t = Math.max(1, t - 15); draw(); }; $('#p').onclick = () => { t += 15; draw(); }; $('#sk').onclick = end; };
  const end = () => { clearInterval(iv); box.hidden = true; if (navigator.vibrate) navigator.vibrate(200); };
  const iv = setInterval(() => { if (--t <= 0) end(); else draw(); }, 1000); draw();
}
window.finish = () => {
  const ex = session.ex.map(x => ({ id: x.id, sets: x.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0 })) })).filter(x => x.sets.length);
  if (ex.length) { S.history.push({ t: Date.now(), name: session.name, dur: Math.round((Date.now() - session.t0) / 60000), ex }); save('history', S.history); }
  session = null; location.hash = '#/progress';
};

// ---------- progress ----------
function progress() {
  const h = S.history, last = h.slice(-7);
  const vols = last.map(volume), max = Math.max(1, ...vols);
  const prs = {};
  h.forEach(w => w.ex.forEach(x => x.sets.forEach(s => { if (s.w > (prs[x.id]?.w || 0)) prs[x.id] = s; })));
  view.innerHTML = `<h1>Progress</h1>
  <div class="grid"><div class="stat"><b>${streak()}</b><span class="mut">streak</span></div><div class="stat"><b>${h.length}</b><span class="mut">workouts</span></div>
  <div class="stat"><b>${Math.round(h.reduce((a, w) => a + w.dur, 0))}</b><span class="mut">minutes</span></div></div>
  <h2>Volume per workout ${S.premium ? '' : '<span class="lock">⭐</span>'}</h2>
  ${S.premium ? (last.length ? `<div class="card"><div class="bars">${vols.map((v, i) => `<div style="height:${v / max * 100}%" title="${v}"><span>${new Date(last[i].t).getDate()}</span></div>`).join('')}</div><div class="mut" style="margin-top:16px">kg lifted (weight × reps)</div></div>` : '<div class="mut">Finish a workout to see this.</div>') : lockCard('volume charts and personal records')}
  <h2>Personal records ${S.premium ? '' : '<span class="lock">⭐</span>'}</h2>
  ${S.premium ? (Object.keys(prs).length ? Object.entries(prs).map(([id, s]) => `<div class="card row"><div class="sp">${esc(BY[id]?.n || id)}</div><b>${s.w} kg × ${s.r}</b></div>`).join('') : '<div class="mut">No records yet.</div>') : ''}
  <h2>History</h2>${h.length ? h.slice().reverse().slice(0, S.premium ? 100 : 7).map(w => `<div class="card"><b>${esc(w.name)}</b><div class="mut">${new Date(w.t).toLocaleDateString()} · ${w.dur} min · ${w.ex.length} exercises</div></div>`).join('') : '<div class="mut">No workouts yet.</div>'}
  ${!S.premium && h.length > 7 ? lockCard('full history') : ''}`;
}

// ---------- premium ----------
function premium() {
  view.innerHTML = `<h1>FitCoach Premium</h1>
  <div class="card"><ul class="feat">
  <li><b>Full library</b> — all ${EX.length} exercises (free: ${EX.filter(isFree).length} beginner-level)</li>
  <li><b>4–6 day splits</b> (free: up to ${FREE_MAX_DAYS})</li>
  <li><b>Unlimited plan regeneration</b> (free: ${FREE_REGENS})</li>
  <li><b>Swap any exercise</b> in your plan</li>
  <li><b>Advanced stats</b> — volume charts, personal records, full history</li>
  <li><b>Custom rest timers</b> (free: min 60 s)</li></ul></div>
  <div class="card"><h3>Status: ${S.premium ? '⭐ Premium active' : 'Free'}</h3>
  <div class="mut">No payment is processed — this is a personal build. The switch below unlocks Premium on this device only.</div>
  <button class="${S.premium ? 'sec' : 'gold'}" id="tp">${S.premium ? 'Switch back to Free' : 'Unlock Premium (this device)'}</button></div>
  <h2>Data</h2><button class="sec" id="exp">Export my data</button><button class="sec" id="rst">Reset everything</button>`;
  $('#tp').onclick = () => { S.premium = !S.premium; save('premium', S.premium); premium(); };
  $('#exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ profile: S.profile, plan: S.plan, history: S.history }, null, 1)], { type: 'application/json' }));
    a.download = 'fitcoach-data.json'; a.click();
  };
  $('#rst').onclick = () => { if (confirm('Delete all plans and history?')) { Object.keys(localStorage).filter(k => k.startsWith('fc.')).forEach(k => localStorage.removeItem(k)); location.hash = ''; location.reload(); } };
}

// ---------- router ----------
function route() {
  timers.forEach(clearInterval); timers = [];
  const [, name = 'home', arg] = (location.hash || '#/home').split('/');
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === name));
  (routes[name] || home)(arg);
  if (name !== 'exercise' && name !== 'workout') window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

(async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  try {
    EX = await (await fetch('data/exercises.json')).json();
    VID = await (await fetch('data/videos.json')).json().catch(() => ({}));
  } catch { view.innerHTML = '<h1>Could not load exercises</h1><p class="mut">Open the app once with a connection.</p>'; return; }
  EX.forEach(e => { BY[e.id] = e; });
  route();
})();
