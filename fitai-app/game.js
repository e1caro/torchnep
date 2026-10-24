'use strict';
// Game layer on top of FitCoach: XP and levels, daily quests, weekly boss, coins,
// unlockable themes / avatars / special workouts ("dungeons") and badges.
// Runs after app.js and shares its globals (S, EX, BY, esc, $, save, load, ...).

const XP_BASE = 250;
const totalXp = L => XP_BASE * (L - 1) * L / 2; // cumulative XP needed to reach level L
const levelOf = xp => { let L = 1; while (xp >= totalXp(L + 1)) L++; return L; };
const dayId = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const weekId = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayId(d); };
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const TITLES = [[1, 'Rookie'], [3, 'Iron Will'], [5, 'Challenger'], [8, 'Warrior'], [12, 'Champion'], [18, 'Legend'], [25, 'Titan']];

// ---------- state ----------
const G = Object.assign({
  xp: 0, coins: 0, owned: [], theme: 'ember', avatar: '🥊', ach: [], bosses: 0, questsDone: 0,
  sound: true, checkin: '', today: null, quests: null, bossClaimed: '', pend: null,
}, load('game', {}));
let LAST = null; // result of the latest workout, shown on the victory screen
const commit = () => save('game', G);
const lvl = () => levelOf(G.xp);
const title = () => TITLES.filter(t => t[0] <= lvl()).at(-1)[1];

// ---------- catalog of unlockables ----------
const rep = (g, n) => Array.from({ length: n }, () => g);
const DUNGEONS = {
  'd-tabata': { ico: '⚡', name: 'Tabata Blitz', lv: 2, mult: 1.3, desc: 'Four bodyweight moves. 20 s on, 10 s off, four rounds each.', sets: 4, reps: '20s', rest: 10, bw: true, groups: [['quadriceps'], ['chest'], ['abdominals'], ['glutes', 'hamstrings']] },
  'd-core': { ico: '🔥', name: 'Core Inferno', lv: 3, mult: 1.3, desc: 'Six abs and back exercises that light up your middle.', sets: 3, reps: '15', rest: 40, groups: [...rep(['abdominals'], 5), ['lower back', 'abdominals']] },
  'd-pushup': { ico: '🧗', name: 'Push-Up Pyramid', lv: 4, mult: 1.4, desc: 'Five push-up variations, five sets each. No equipment.', sets: 5, reps: '10', rest: 45, bw: true, re: /push.?up/i, groups: rep(null, 5) },
  'd-mobility': { ico: '🧘', name: 'Mobility Monk', lv: 5, mult: 1, desc: 'Eight stretches for recovery days. Easy XP, happy joints.', sets: 1, reps: '30s', rest: 15, cats: ['stretching'], groups: rep(null, 8) },
  'd-glute': { ico: '🍑', name: 'Glute Forge', lv: 6, mult: 1.4, desc: 'Glutes and hamstrings, four heavy sets each.', sets: 4, reps: '12', rest: 60, groups: [['glutes'], ['glutes'], ['glutes'], ['hamstrings'], ['hamstrings'], ['quadriceps']] },
  'd-arms': { ico: '💪', name: 'Arm Arena', lv: 8, mult: 1.4, desc: 'Biceps, triceps and forearms until your sleeves complain.', sets: 3, reps: '12', rest: 45, groups: [...rep(['biceps'], 3), ...rep(['triceps'], 3), ['forearms']] },
  'd-legs': { ico: '🦵', name: 'Leg Day Dungeon', lv: 10, mult: 1.6, desc: 'Quads, hamstrings, glutes and calves. Bring snacks.', sets: 4, reps: '10', rest: 90, groups: [['quadriceps'], ['quadriceps'], ['hamstrings'], ['hamstrings'], ['glutes'], ['calves']] },
  'd-back': { ico: '🦅', name: 'Back Raid', lv: 12, mult: 1.6, desc: 'Pull heavy: lats, mid-back, traps and a little biceps.', sets: 4, reps: '10', rest: 75, groups: [...rep(['lats'], 3), ...rep(['middle back'], 2), ['traps'], ['biceps']] },
  'd-rush': { ico: '👹', name: 'Boss Rush', lv: 15, mult: 2, desc: 'One exercise for every major muscle, two quick sets each. Double XP.', sets: 2, reps: '15', rest: 30, groups: [['chest'], ['lats'], ['quadriceps'], ['shoulders'], ['hamstrings'], ['biceps'], ['triceps'], ['abdominals'], ['glutes'], ['calves']] },
  'd-titan': { ico: '🏛️', name: 'Titan Trial', lv: 20, mult: 3, desc: 'Five heavy lifts, 5 × 5, long rests. Triple XP for the brave.', sets: 5, reps: '5', rest: 180, expert: true, cats: ['powerlifting', 'olympic weightlifting', 'strength'], groups: [['quadriceps'], ['chest'], ['lats'], ['shoulders'], ['hamstrings']] },
};
const ITEMS = [
  ...[['ember', 'Ember', 1, 0, '#ff6a3d', '#ffb347'], ['neon', 'Neon City', 3, 120, '#00e5ff', '#ff2bd6'], ['frost', 'Frostbite', 5, 160, '#7cc6ff', '#e0f4ff'],
    ['toxic', 'Toxic', 7, 200, '#8dff3a', '#e6ff5a'], ['royal', 'Royal', 10, 300, '#a66bff', '#ffd166'], ['retro', 'Arcade', 13, 400, '#ff3d7f', '#ffe14d'], ['gold', 'Golden Hour', 18, 700, '#ffd34d', '#fff1a8']]
    .map(([k, name, lv, cost, a, b]) => ({ id: 't-' + k, type: 'theme', key: k, name, lv, cost, sw: [a, b] })),
  ...[['🥊', 1, 0], ['🦁', 2, 40], ['🐺', 4, 80], ['🦅', 6, 120], ['🐉', 9, 200], ['⚡', 12, 280], ['👑', 16, 400], ['🚀', 22, 600]]
    .map(([e, lv, cost]) => ({ id: 'a-' + e, type: 'avatar', key: e, name: 'Hero skin', lv, cost })),
  ...Object.entries(DUNGEONS).map(([id, d]) => ({ id, type: 'dungeon', name: d.name, lv: d.lv, cost: d.lv * 35 })),
];
const item = id => ITEMS.find(i => i.id === id);
const has = i => lvl() >= i.lv || G.owned.includes(i.id);
const KIND = { theme: 'Theme', avatar: 'Avatar', dungeon: 'Workout' };

// ---------- daily quests ----------
const QT = [
  { id: 'workout', t: 'Finish a workout', n: 1, m: 'workouts', xp: 80, ico: '⚔️' },
  { id: 'sets', t: 'Complete 12 sets', n: 12, m: 'sets', xp: 60, ico: '💪' },
  { id: 'guide', t: 'Study 2 exercise guides', n: 2, m: 'guides', xp: 30, ico: '📖' },
  { id: 'weigh', t: 'Log your weight', n: 1, m: 'weigh', xp: 25, ico: '⚖️' },
  { id: 'min', t: 'Train for 25 minutes', n: 25, m: 'minutes', xp: 60, ico: '⏱️' },
  { id: 'dungeon', t: 'Clear a dungeon', n: 1, m: 'dungeons', xp: 100, ico: '🏰', needLv: 2 },
];
const metric = m => m === 'guides' ? G.today.guides.length : G.today[m];

function ensureDay() {
  const d = dayId();
  if (G.today?.day === d && G.quests?.day === d) return;
  G.today = { day: d, sets: 0, workouts: 0, minutes: 0, guides: [], weigh: 0, dungeons: 0 };
  const pool = shuffle(QT.slice(1).filter(q => !q.needLv || lvl() >= q.needLv), rng(hash(d)));
  G.quests = { day: d, list: ['workout', ...pool.slice(0, 2).map(q => q.id)], claimed: [], bonus: false };
  commit();
}

// ---------- feedback: sound, toasts, confetti, modal ----------
let AC;
function sfx(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === 'level' ? [60, 40, 120] : 25);
    if (!G.sound) return;
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { tick: [[660, .06]], claim: [[523, .08], [784, .14]], level: [[523, .1], [659, .1], [784, .1], [1047, .3]] }[kind];
    let t = AC.currentTime;
    seq.forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d); t += d;
    });
  } catch { /* audio blocked */ }
}
function toast(msg) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 3200);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['--acc', '--acc2', '--ok', '--fg'].map(v => getComputedStyle(document.documentElement).getPropertyValue(v));
  for (let i = 0; i < 44; i++) {
    const c = document.createElement('i'); c.className = 'cf';
    c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 4]};animation-delay:${Math.random() * .5}s;--dx:${Math.random() * 120 - 60}px;--rt:${Math.random() * 720}deg`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
  }
}
function floatXp(text) {
  const el = document.createElement('div'); el.className = 'fxp'; el.textContent = text;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
}
function modal(html, onClose) {
  const m = $('#modal'); m.hidden = false; m.innerHTML = `<div class="mbox">${html}</div>`;
  m.querySelector('[data-close]').onclick = () => { m.hidden = true; onClose?.(); };
}

// ---------- awards ----------
function award(xp, coins = 0) {
  const from = levelOf(G.xp);
  G.xp += xp; G.coins += coins;
  const to = levelOf(G.xp);
  if (to > from) {
    for (let L = from + 1; L <= to; L++) G.coins += 20 + 5 * L;
    G.pend = { from: G.pend ? G.pend.from : from, to };
  }
  commit();
}
function flushLevelUp(after) {
  if (!G.pend) { after?.(); return; }
  const { from, to } = G.pend, unlocked = ITEMS.filter(i => i.lv > from && i.lv <= to && i.lv > 1);
  const bonus = Array.from({ length: to - from }, (_, k) => 20 + 5 * (from + 1 + k)).reduce((a, b) => a + b, 0);
  G.pend = null; commit(); sfx('level'); confetti();
  modal(`<div class="lvup">LEVEL UP</div><div class="bignum">${to}</div><div class="mut">${title()}</div>
    ${unlocked.length ? `<h3>Unlocked</h3>${unlocked.map(i => `<div class="unl">${i.type === 'dungeon' ? DUNGEONS[i.id].ico : i.type === 'avatar' ? i.key : '🎨'} <b>${esc(i.name)}</b><span class="mut">${KIND[i.type]}</span></div>`).join('')}` : ''}
    <div class="unl">🪙 <b>+${bonus} coins</b></div><button class="btn" data-close>Awesome</button>`, after);
}

// ---------- achievements ----------
const totalVol = () => S.history.reduce((a, h) => a + volume(h), 0);
const ACH = [
  { id: 'first', n: 'First Blood', d: 'Finish your first workout', i: '🩸', xp: 50, ok: () => S.history.length >= 1 },
  { id: 'w5', n: 'Warming Up', d: 'Finish 5 workouts', i: '🔆', xp: 100, ok: () => S.history.length >= 5 },
  { id: 'w25', n: 'Gym Rat', d: 'Finish 25 workouts', i: '🐀', xp: 400, ok: () => S.history.length >= 25 },
  { id: 'st3', n: 'On Fire', d: 'Train 3 days in a row', i: '🔥', xp: 100, ok: () => streak() >= 3 },
  { id: 'st7', n: 'Unstoppable', d: 'Train 7 days in a row', i: '🚂', xp: 300, ok: () => streak() >= 7 },
  { id: 'ton', n: 'One Ton Club', d: 'Lift 1,000 kg in total', i: '🏋️', xp: 100, ok: () => totalVol() >= 1000 },
  { id: 'ton10', n: 'Heavy Metal', d: 'Lift 10,000 kg in total', i: '🤘', xp: 400, ok: () => totalVol() >= 10000 },
  { id: 'early', n: 'Early Bird', d: 'Finish a workout before 8 am', i: '🌅', xp: 80, ok: () => S.history.some(h => new Date(h.t).getHours() < 8) },
  { id: 'night', n: 'Night Owl', d: 'Finish a workout after 9 pm', i: '🦉', xp: 80, ok: () => S.history.some(h => new Date(h.t).getHours() >= 21) },
  { id: 'dg1', n: 'Dungeon Crawler', d: 'Clear a dungeon', i: '🏰', xp: 120, ok: () => S.history.some(h => h.dungeon) },
  { id: 'dg5', n: 'Dungeon Master', d: 'Clear 5 dungeons', i: '🗝️', xp: 350, ok: () => S.history.filter(h => h.dungeon).length >= 5 },
  { id: 'wt5', n: 'Scale Master', d: 'Log your weight 5 times', i: '⚖️', xp: 80, ok: () => S.weights.length >= 5 },
  { id: 'boss', n: 'Boss Slayer', d: 'Defeat a weekly boss', i: '🗡️', xp: 200, ok: () => G.bosses >= 1 },
  { id: 'q10', n: 'Questmaster', d: 'Claim 10 daily quests', i: '📜', xp: 200, ok: () => G.questsDone >= 10 },
];
function checkAch() {
  const got = [];
  for (let more = true; more;) {
    more = false;
    for (const a of ACH) if (!G.ach.includes(a.id) && a.ok()) { G.ach.push(a.id); award(a.xp, Math.round(a.xp / 5)); got.push(a); more = true; }
  }
  got.forEach(a => toast(`Badge unlocked: ${a.n} (+${a.xp} XP)`));
  if (got.length) sfx('claim');
  return got;
}

// ---------- hooks called by app.js ----------
function gameWorkout(h) {
  ensureDay();
  const prev = {};
  S.history.slice(0, -1).forEach(w => w.ex.forEach(x => { prev[x.id] = Math.max(prev[x.id] || 0, ...x.sets.map(s => s.w)); }));
  const sets = h.ex.reduce((a, x) => a + x.sets.length, 0);
  const prs = h.ex.filter(x => prev[x.id] > 0 && Math.max(...x.sets.map(s => s.w)) > prev[x.id]).length;
  const dg = h.dungeon ? DUNGEONS[h.dungeon] : null, st = streak();
  const sm = 1 + Math.min(0.5, (st - 1) * 0.05), mult = (dg?.mult || 1) * sm;
  const base = sets * 10 + 100 + prs * 40, xp = Math.round(base * mult), coins = Math.round(xp / 6);
  const lines = [[`${sets} sets × 10`, sets * 10], ['Workout cleared', 100]];
  if (prs) lines.push([`${prs} new record${prs > 1 ? 's' : ''} × 40`, prs * 40]);
  if (dg) lines.push([`${dg.name} ×${dg.mult}`, null]);
  if (sm > 1) lines.push([`${st}-day streak ×${sm.toFixed(2)}`, null]);
  const before = G.xp;
  G.today.sets += sets; G.today.workouts++; G.today.minutes += h.dur; if (dg) G.today.dungeons++;
  award(xp, coins);
  const ach = checkAch();
  LAST = { name: h.name, dungeon: dg, lines, xp, coins, before, after: G.xp, ach };
}
function gameWeigh() {
  ensureDay();
  if (!G.today.weigh) { G.today.weigh = 1; award(15, 3); toast('Weigh-in logged: +15 XP'); checkAch(); }
}
function gameGuide(id) {
  ensureDay();
  if (!G.today.guides.includes(id)) { G.today.guides.push(id); commit(); }
}

// ---------- dungeons (special workouts) ----------
function buildDungeon(id) {
  const d = DUNGEONS[id], p = S.profile, r = rng(Date.now() & 0xffffff), used = new Set(), items = [];
  const have = d.bw ? new Set(['body only', 'none']) : equipSet(p), pp = d.expert ? { ...p, level: 'expert' } : p;
  const cats = d.cats || ['strength', 'plyometrics', 'powerlifting', 'olympic weightlifting'];
  const pool = EX.filter(e => cats.includes(e.c) && allowed(e, pp, have) && (!d.re || d.re.test(e.n)));
  const add = e => { used.add(e.id); items.push({ id: e.id, sets: d.sets, reps: d.reps, rest: d.rest }); };
  for (const g of d.groups) {
    const c = shuffle(pool.filter(e => (!g || g.includes(e.m[0])) && !used.has(e.id)), r);
    if (c.length) add(c[0]);
  }
  if (items.length < 3) shuffle(pool.filter(e => !used.has(e.id)), r).slice(0, 4 - items.length).forEach(add);
  return items;
}
window.startDungeon = id => {
  const i = item(id); if (!has(i)) return;
  const items = buildDungeon(id);
  if (items.length < 2) { toast('Not enough exercises match your equipment and limits.'); return; }
  startSession(DUNGEONS[id].name, items, { dungeon: id });
};

// ---------- actions ----------
window.claimQuest = id => {
  const q = QT.find(x => x.id === id);
  if (G.quests.claimed.includes(id) || metric(q.m) < q.n) return;
  G.quests.claimed.push(id); G.questsDone++; award(q.xp, Math.round(q.xp / 5)); sfx('claim'); checkAch();
  flushLevelUp(home);
};
window.claimQuestBonus = () => {
  if (G.quests.bonus || G.quests.claimed.length < 3) return;
  G.quests.bonus = true; award(60, 25); sfx('claim'); flushLevelUp(home);
};
window.checkIn = () => { if (G.checkin === dayId()) return; G.checkin = dayId(); award(10, 15); sfx('claim'); flushLevelUp(home); };
const BOSSES = [['Iron Golem', '🗿'], ['Sloth Dragon', '🐲'], ['Couch Lord', '🛋️'], ['Fatigue Wraith', '👻'], ['Gravity Beast', '🦍']];
window.claimBoss = () => {
  if (G.bossClaimed === weekId() || weekCount() < S.profile.days) return;
  G.bossClaimed = weekId(); G.bosses++; award(250, 100); sfx('claim'); checkAch(); flushLevelUp(home);
};
window.buy = id => {
  const i = item(id);
  if (has(i) || G.coins < i.cost) { toast(has(i) ? 'Already yours.' : `Need ${i.cost - G.coins} more coins.`); return; }
  G.coins -= i.cost; G.owned.push(id); commit(); sfx('claim'); toast(`Unlocked ${i.name}`); route();
};
window.equip = id => {
  const i = item(id); if (!has(i)) return;
  if (i.type === 'theme') G.theme = i.key; else G.avatar = i.key;
  commit(); applyTheme(); route();
};
window.toggleSound = () => { G.sound = !G.sound; commit(); if (G.sound) sfx('tick'); route(); };

function applyTheme() {
  document.documentElement.dataset.theme = G.theme;
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0d12';
}

// ---------- views ----------
function hud() {
  const L = lvl(), a = totalXp(L), b = totalXp(L + 1), pct = (G.xp - a) / (b - a);
  return `<div class="hud"><div class="av" style="--p:${pct.toFixed(3)}"><span>${G.avatar}</span><i class="lv">${L}</i></div>
  <div class="grow"><div class="hn">${esc(S.profile?.name || 'Player')}</div><div class="mut">${title()}</div>
  <div class="xpbar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div><div class="xpt">${G.xp - a} / ${b - a} XP to level ${L + 1}</div></div>
  <div class="coins">🪙 <b>${G.coins}</b></div></div>`;
}

function home() {
  if (needProfile()) return;
  ensureDay(); flushLevelUp();
  const p = S.profile, a = analyze({ ...p, weight: curWeight() }), di = nextDayIdx(), d = S.plan.days[di], first = BY[d.items[0].id];
  const done = G.quests.claimed.length, hits = Math.min(weekCount(), p.days), bossDone = hits >= p.days, [bn, be] = BOSSES[hash(weekId()) % BOSSES.length];
  view.innerHTML = `${hud()}
  <div class="row between sec2"><h2>Daily quests</h2><span class="mut">${done}/3 claimed</span></div>
  ${G.quests.list.map(id => {
    const q = QT.find(x => x.id === id), v = Math.min(q.n, metric(q.m)), ok = v >= q.n, cl = G.quests.claimed.includes(id);
    return `<div class="quest ${cl ? 'cl' : ok ? 'ok' : ''}"><div class="qi">${q.ico}</div><div class="grow"><div class="qt">${q.t}</div>
    <div class="qbar"><i style="width:${v / q.n * 100}%"></i></div><div class="mut">${v}/${q.n} · +${q.xp} XP · 🪙${Math.round(q.xp / 5)}</div></div>
    ${cl ? '<span class="chk">✓</span>' : ok ? `<button class="btn sm" onclick="claimQuest('${id}')">Claim</button>` : ''}</div>`;
  }).join('')}
  ${G.quests.bonus ? '' : `<div class="quest ${done >= 3 ? 'ok' : ''}"><div class="qi">🎁</div><div class="grow"><div class="qt">Clear all three quests</div><div class="mut">Bonus chest: +60 XP · 🪙25</div></div>
  ${done >= 3 ? '<button class="btn sm" onclick="claimQuestBonus()">Open</button>' : ''}</div>`}
  ${G.checkin === dayId() ? '' : '<button class="btn gold" onclick="checkIn()">Daily check-in · +10 XP · 🪙15</button>'}
  <h2 class="sec">Weekly boss</h2>
  <section class="card boss ${bossDone ? 'dead' : ''}"><div class="be">${be}</div><div class="grow"><h3>${bn}</h3>
    <div class="hp"><i style="width:${(1 - hits / p.days) * 100}%"></i></div>
    <div class="mut">${bossDone ? 'Defeated!' : `${p.days - hits} hit${p.days - hits > 1 ? 's' : ''} left. Every workout deals damage.`}</div>
    ${bossDone && G.bossClaimed !== weekId() ? '<button class="btn sm" onclick="claimBoss()" style="margin-top:8px">Claim loot · +250 XP · 🪙100</button>' : ''}</div></section>
  <h2 class="sec">Next training</h2>
  <section class="card next"><div class="mut">${d.items.length} exercises · ~${p.minutes} min · +${d.items.reduce((s, i) => s + i.sets, 0) * 10 + 100} XP</div><h2>${esc(d.name.split(' · ')[1])}</h2>
    ${first ? demo(first, false) : ''}<button class="btn" onclick="startWorkout(${di})">Start workout</button></section>
  <h2 class="sec">Fuel</h2>
  <div class="grid4"><div class="stat"><b>${a.kcal}</b><span>kcal / day</span></div><div class="stat"><b>${a.protein}g</b><span>protein</span></div>
  <div class="stat"><b>${a.carbs}g</b><span>carbs</span></div><div class="stat"><b>${a.fat}g</b><span>fat</span></div></div>
  <div class="mut" style="margin-top:8px">Aim for ${a.water} L of water. Calories are an estimate; adjust after 2 weeks based on the scale.</div>`;
  startLoops();
}

function dungeons() {
  if (needProfile()) return;
  view.innerHTML = `<h1>Dungeons</h1><p class="mut">Special workouts built from your equipment and limits. They unlock as you level up, or early with coins. Clearing one earns bonus XP.</p>` +
    Object.entries(DUNGEONS).map(([id, d]) => {
      const i = item(id), ok = has(i);
      return `<section class="card dg ${ok ? '' : 'locked'}"><div class="dgi">${ok ? d.ico : '🔒'}</div><div class="grow"><h3>${d.name}</h3><div class="mut">${d.desc}</div>
      <div class="chips static"><span class="chip">Lv ${d.lv}</span><span class="chip">${d.mult}× XP</span></div></div>
      ${ok ? `<button class="btn sm" onclick="startDungeon('${id}')">Enter</button>` : G.coins >= i.cost ? `<button class="btn sm gold" onclick="buy('${id}')">🪙 ${i.cost}</button>` : `<span class="mut cost">🪙 ${i.cost}</span>`}</section>`;
    }).join('');
}

function rewards() {
  if (needProfile()) return;
  const L = lvl(), max = Math.min(30, Math.max(L + 8, 14));
  const state = i => has(i) ? (i.type === 'theme' ? G.theme === i.key : i.type === 'avatar' ? G.avatar === i.key : false) ? '<b class="eq">Equipped</b>' : (i.type === 'dungeon' ? '' : `<button class="btn sm ghost" onclick="equip('${i.id}')">Equip</button>`)
    : G.coins >= i.cost ? `<button class="btn sm gold" onclick="buy('${i.id}')">🪙 ${i.cost}</button>` : `<span class="mut">🔒 Lv ${i.lv} · 🪙${i.cost}</span>`;
  view.innerHTML = `${hud()}<h2 class="sec">Reward road</h2><div class="road">` +
    Array.from({ length: max }, (_, k) => k + 1).map(n => {
      const its = ITEMS.filter(i => i.lv === n && n > 1);
      return `<div class="rl ${n < L ? 'past' : n === L ? 'now' : ''}"><div class="dot">${n}</div><div class="grow"><div class="mut">Level ${n}${n > 1 ? ` · +${20 + 5 * n} coins` : ''}</div>
      ${its.map(i => `<div class="ri">${i.type === 'dungeon' ? DUNGEONS[i.id].ico : i.type === 'avatar' ? i.key : '🎨'} ${esc(i.name)} <span class="mut">${KIND[i.type]}</span></div>`).join('')}</div></div>`;
    }).join('') + `</div>
  <h2 class="sec">App themes</h2><div class="grid2">${ITEMS.filter(i => i.type === 'theme').map(i => `<div class="card sw ${has(i) ? '' : 'locked'}"><div class="swc" style="background:linear-gradient(135deg,${i.sw[0]},${i.sw[1]})"></div><b>${i.name}</b>${state(i)}</div>`).join('')}</div>
  <h2 class="sec">Avatars</h2><div class="grid4">${ITEMS.filter(i => i.type === 'avatar').map(i => `<div class="card sw ${has(i) ? '' : 'locked'}"><div class="avbig">${has(i) ? i.key : '🔒'}</div>${state(i)}</div>`).join('')}</div>
  <h2 class="sec">Badges · ${G.ach.length}/${ACH.length}</h2>${ACH.map(a => `<div class="card row ${G.ach.includes(a.id) ? '' : 'locked'}"><div class="avbig sm">${G.ach.includes(a.id) ? a.i : '🔒'}</div><div class="grow"><b>${a.n}</b><div class="mut">${a.d}</div></div><span class="mut">+${a.xp} XP</span></div>`).join('')}`;
}

function victory() {
  if (!LAST) { location.hash = '#/home'; return; }
  const r = LAST, la = levelOf(r.before), lb = levelOf(r.after), pc = x => { const L = levelOf(x); return (x - totalXp(L)) / (totalXp(L + 1) - totalXp(L)) * 100; };
  view.innerHTML = `<div class="vic"><div class="lvup">${r.dungeon ? 'Dungeon cleared' : 'Workout cleared'}</div><h1>${esc(r.name)}</h1>
  <div class="card">${r.lines.map(([t, v]) => `<div class="row between"><span>${t}</span><b>${v == null ? '' : '+' + v}</b></div>`).join('')}
  <div class="row between tot"><span>Total</span><b>+${r.xp} XP · 🪙${r.coins}</b></div></div>
  <div class="hud solo"><div class="av" style="--p:0"><span>${G.avatar}</span><i class="lv" id="vl">${la}</i></div><div class="grow"><div class="xpbar"><i id="vb" style="width:${pc(r.before)}%"></i></div><div class="xpt">${lb > la ? `Level ${la} → ${lb}` : `${r.after - totalXp(lb)} / ${totalXp(lb + 1) - totalXp(lb)} XP`}</div></div></div>
  ${r.ach.map(a => `<div class="card row"><div class="avbig sm">${a.i}</div><div class="grow"><b>${a.n}</b><div class="mut">Badge unlocked · +${a.xp} XP</div></div></div>`).join('')}
  <button class="btn" id="col">Collect</button></div>`;
  sfx('claim'); confetti();
  setTimeout(() => { const b = $('#vb'); if (b) { b.style.width = (lb > la ? 100 : pc(r.after)) + '%'; } }, 150);
  $('#col').onclick = () => { LAST = null; flushLevelUp(() => { location.hash = '#/home'; }); if (!G.pend && location.hash === '#/victory') location.hash = '#/home'; };
}

function heroCard() {
  const vol = totalVol(), mins = S.history.reduce((a, h) => a + h.dur, 0);
  return `${hud()}<div class="grid3"><div class="stat"><b>${Math.round(vol).toLocaleString()}</b><span>STR · kg lifted</span></div><div class="stat"><b>${mins}</b><span>END · minutes</span></div><div class="stat"><b>${S.history.length}</b><span>DEX · workouts</span></div></div>
  <button class="btn ghost" onclick="toggleSound()">Sound effects: ${G.sound ? 'on' : 'off'}</button>`;
}

function initGame() {
  if (!localStorage.getItem('fc.game') && S.history.length) { // welcome back: convert past workouts to XP
    G.xp = S.history.reduce((a, h) => a + 100 + h.ex.reduce((b, x) => b + x.sets.length * 10, 0), 0);
  }
  ensureDay(); applyTheme(); commit();
}
Object.assign(routes, { home, dungeons, rewards, victory });
