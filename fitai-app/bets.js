'use strict';
// Bets: stake coins on your own goals (train today, clear dungeons, hit your water goal...).
// Pick one goal for a single bet, or 2 to 5 for a combined bet whose odds multiply; every pick must come true.
// Odds come from your own recent training, so a goal you rarely reach pays more. Coins only, never real money.

const BT = (G.bets = Object.assign({ open: [], done: [], won: 0, lost: 0, net: 0, best: 0 }, G.bets || {}));
let slip = [], stake = 25;
const BET_MIN = 5, BET_MAX = 300, BET_OPEN = 8, LEGS_MAX = 6, BET_COMBO_MAX = 20;
// Muscle picks pay 1.00 each (you will train something); combining muscles of the same day, week or month multiplies the bet by these odds.
// over a week or a month you end up training most muscles anyway, so their combos pay much less than today's
const MG_X = { day: [1, 1, 1.25, 1.6, 2.1, 2.8, 3.6], week: [1, 1, 1.1, 1.2, 1.3, 1.45, 1.6], month: [1, 1, 1.05, 1.1, 1.15, 1.25, 1.35] };
const isMg = l => l.kind === 'd-mg' || l.kind === 'mg';
let betTab = 'today', slipRepeat = false;

// ---------- time windows ----------
const DAY = 864e5;
const at0 = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const dayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
const dayStart = () => at0(Date.now()).getTime();
const weekEnd = () => { const d = new Date(weekStart()); d.setDate(d.getDate() + 7); return d.getTime() - 1; };
const daysLeft = () => Math.max(1, Math.ceil((weekEnd() - Date.now()) / DAY)); // today included
// Bet periods. "Next week" can be bet on until Sunday night; after that it becomes "this week".
function periods() {
  const ws = weekStart(), nws = weekEnd() + 1, nwe = (() => { const d = new Date(nws); d.setDate(d.getDate() + 7); return d.getTime() - 1; })();
  const now = new Date(), ms = new Date(now.getFullYear(), now.getMonth(), 1).getTime(), nms = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const nme = new Date(now.getFullYear(), now.getMonth() + 2, 1).getTime() - 1;
  return [
    { k: 'week', from: ws, to: nws - 1, suf: 'this week', live: true },
    { k: 'nweek', from: nws, to: nwe, suf: 'next week', live: false },
    { k: 'month', from: ms, to: nms - 1, suf: 'this month', live: true },
    { k: 'nmonth', from: nms, to: nme, suf: 'next month', live: false },
  ];
}
const CATS = [['train', 'Training'], ['muscle', 'Muscles'], ['health', 'Health'], ['game', 'Game']];
const catOf = k => k === 'mg' || k === 'd-mg' ? 'muscle'
  : ['water', 'd-water', 'sleepn', 'd-sleep', 'meals', 'd-meals', 'perfect', 'd-perfect', 'weigh', 'd-weigh', 'wlose', 'wgain', 'd-triple'].includes(k) ? 'health'
  : ['xp', 'd-xp', 'lvl', 'boss', 'questd', 'd-quests', 'badge', 'match', 'nolose', 'drills', 'ovr', 'streak'].includes(k) ? 'game' : 'train';
const PER_TABS = [['today', 'Today'], ['week', 'This week'], ['nweek', 'Next week'], ['month', 'This month'], ['nmonth', 'Next month']];

// ---------- your recent form (drives the odds) ----------
function form() {
  const since = Date.now() - 28 * DAY, recent = S.history.filter(h => h.t >= since);
  const known = S.history.length >= 3;
  const perWeek = known ? Math.max(.5, recent.length / 4) : Math.max(1, (S.profile?.days || 3) * .6);
  const dgPerWeek = known ? Math.max(.25, recent.filter(h => h.dungeon).length / 4) : .4;
  const mins = S.history.length ? S.history.reduce((a, h) => a + (h.dur || 0), 0) / S.history.length : 45;
  const sets = S.history.length ? S.history.reduce((a, h) => a + h.ex.reduce((x, e) => x + e.sets.length, 0), 0) / S.history.length : 12;
  const H = S.history.slice(-30), n = H.length || 1, frac = fn => H.filter(fn).length / n;
  const kgw = H.reduce((a, h) => a + h.ex.reduce((x, e) => x + e.sets.reduce((y, st) => y + (st.w || 0) * (st.r || 0), 0), 0), 0) / n;
  const repw = H.reduce((a, h) => a + h.ex.reduce((x, e) => x + e.sets.reduce((y, st) => y + (st.r || 0), 0), 0), 0) / n;
  const exw = H.reduce((a, h) => a + h.ex.length, 0) / n || 5;
  const mg = Object.fromEntries(Object.keys(MG).map(g => [g, H.length ? frac(h => hitsGroup(h, g)) : .35]));
  const recentW = S.weights.filter(w => w.t >= since).length;
  return { perWeek, dgPerWeek, mins: Math.max(15, mins), sets: Math.max(4, sets), xpw: Math.max(150, sets * 10 + 100) * 1.15, kgw, repw: Math.max(30, repw), exw, mg,
    long: Math.max(.05, frac(h => h.dur >= 60)), morn: Math.max(.05, frac(h => hourOf(h) < 9)), eve: Math.max(.05, frac(h => hourOf(h) >= 20)),
    drills: Math.max(.5, S.history.filter(h => h.t >= since && h.sport).length / 4), weigh: Math.max(.5, recentW / 4) };
}
// chance of at least k events when lambda are expected
const atLeast = (k, lam) => { if (k <= 0) return 1; let p = 0, t = Math.exp(-lam); for (let i = 0; i < k; i++) { p += t; t *= lam / (i + 1); } return Math.max(0, 1 - p); };
const binomAtLeast = (k, n, q) => { if (k <= 0) return 1; if (k > n) return 0; let p = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); p += c * q ** i * (1 - q) ** (n - i); } return p; };
const uniq = a => [...new Set(a)];

// ---------- what counts ----------
const inWin = (h, a, b) => h.t >= a && h.t <= b;
const trainsIn = (a, b) => S.history.filter(h => inWin(h, a, b)).length;
const dgIn = (a, b) => S.history.filter(h => inWin(h, a, b) && h.dungeon).length;
const minsIn = (a, b) => S.history.filter(h => inWin(h, a, b)).reduce((s, h) => s + (h.dur || 0), 0);
const daysIn = (a, b) => new Set(S.history.filter(h => inWin(h, a, b)).map(h => new Date(h.t).toDateString())).size;
const setsIn = (a, b) => S.history.filter(h => inWin(h, a, b)).reduce((s, h) => s + h.ex.reduce((x, e) => x + e.sets.length, 0), 0);
function prIn(a, b) { // a workout in the window lifted more on some exercise than any earlier workout
  const best = {};
  for (const h of [...S.history].sort((x, y) => x.t - y.t)) {
    for (const x of h.ex) {
      const w = Math.max(0, ...x.sets.map(s => s.w || 0));
      if (inWin(h, a, b) && best[x.id] > 0 && w > best[x.id]) return true;
      best[x.id] = Math.max(best[x.id] || 0, w);
    }
  }
  return false;
}
// days the water goal was reached (start-of-day timestamps), logged from now on; this week also trusts the weekly counter
BT.water = BT.water || [];
const logWater = () => { if (G.today?.waterGoal && !BT.water.includes(dayStart())) { BT.water.push(dayStart()); BT.water = BT.water.filter(t => t > Date.now() - 70 * DAY); commit(); } };
const waterIn = (a, b) => { const n = BT.water.filter(t => t >= a && t <= b).length; return a === weekStart() && G.wk?.id === weekId() ? Math.max(n, G.wk.waterDays) : n; };
const dungeonsOpen = () => Object.values(DUNGEONS).some(d => d.lv <= lvl());
const questsAllDone = () => { ensureDay(); return G.quests.claimed.length >= G.quests.list.length; };
const waterToday = () => { ensureDay(); return !!G.today.waterGoal; };
// XP at the start of each day the app was opened (to count XP earned in a window)
BT.xpLog = BT.xpLog || {};
const logXp = () => { const k = dayStart(); if (BT.xpLog[k] === undefined) { BT.xpLog[k] = G.xp; for (const t in BT.xpLog) if (+t < Date.now() - 70 * DAY) delete BT.xpLog[t]; commit(); } };
const xpIn = a => { const ks = Object.keys(BT.xpLog).map(Number).filter(t => t >= a).sort((x, y) => x - y); return ks.length ? G.xp - BT.xpLog[ks[0]] : 0; };
const prToday = () => prIn(dayStart(), dayEnd());
// muscle groups, volume, time of day
const MG = { legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'], chest: ['chest'], back: ['lats', 'middle back', 'lower back', 'traps'], shoulders: ['shoulders'], arms: ['biceps', 'triceps', 'forearms'], core: ['abdominals'] };
const hitsGroup = (h, g) => h.ex.some(x => MG[g].includes(BY[x.id]?.m[0]));
const mgIn = (g, a, b) => S.history.filter(h => inWin(h, a, b) && hitsGroup(h, g)).length;
const sumSets = (a, b, fn) => S.history.filter(h => inWin(h, a, b)).reduce((s, h) => s + h.ex.reduce((x, e) => x + e.sets.reduce((y, st) => y + fn(st), 0), 0), 0);
const kgIn = (a, b) => Math.round(sumSets(a, b, st => (st.w || 0) * (st.r || 0)));
const repsIn = (a, b) => sumSets(a, b, st => st.r || 0);
const varIn = (a, b) => new Set(S.history.filter(h => inWin(h, a, b)).flatMap(h => h.ex.map(x => x.id))).size;
const hourOf = h => new Date(h.t - (h.dur || 0) * 60000).getHours();
const countIn = (a, b, fn) => S.history.filter(h => inWin(h, a, b) && fn(h)).length;
const weekendIn = (a, b) => { const d = new Set(S.history.filter(h => inWin(h, a, b)).map(h => new Date(h.t).getDay())); return (d.has(6) ? 1 : 0) + (d.has(0) ? 1 : 0); };
const drillsIn = (a, b) => countIn(a, b, h => h.sport);
const weighIn = (a, b) => S.weights.filter(w => w.t >= a && w.t <= b).length;
const weightDir = () => { const p = S.profile; if (p?.target && Math.abs(p.target - curWeight()) >= .5) return Math.sign(p.target - curWeight()); return p?.goal === 'fat' ? -1 : p?.goal === 'muscle' ? 1 : 0; };
const ovrNow = key => { const r = key && roleOf(key); return r ? ovrOf(r) : 0; };
// days with 7 h+ sleep, all daily quests, a perfect nutrition day (logged from now on)
BT.flags = BT.flags || { sleep: [], quests: [], perfect: [] };
function logFlags() {
  ensureDay(); const d = dayStart(), F = BT.flags; let ch = false;
  const mark = (k, ok) => { if (ok && !F[k].includes(d)) { F[k].push(d); F[k] = F[k].filter(t => t > Date.now() - 70 * DAY); ch = true; } };
  mark('sleep', G.today.sleep >= 7); mark('quests', G.quests.claimed.length >= G.quests.list.length); mark('perfect', !!G.today.perfect);
  if (ch) commit();
}
const flagIn = (k, a, b) => BT.flags[k].filter(t => t >= a && t <= b).length;
const GRP = { legs: 'legs', chest: 'chest', back: 'back', shoulders: 'shoulders', arms: 'arms', core: 'core' };
const mealsOn = () => typeof M !== 'undefined' && !!M.set && !!M.plan;
const sportKey = () => typeof SP !== 'undefined' && SP.cur && typeof roleOf === 'function' && roleOf(SP.cur) ? SP.cur : null;
const sportName = key => { const r = roleOf(key); return r ? r.name : ''; };

// ---------- titles, windows and chances (shared by the market list and by repeating bets) ----------
const DAY_T = { 'd-train': ['Train today', 'Train tomorrow'], 'd-dg': ['Clear a dungeon today', 'Clear a dungeon tomorrow'], 'd-sets': ['Log 20 sets today', 'Log 20 sets tomorrow'],
  'd-water': ['Hit your water goal today', 'Hit your water goal tomorrow'], 'd-quests': ['Claim all daily quests today', 'Claim all daily quests tomorrow'],
  'd-feat': ['Clear the dungeon of the day', 'Clear the dungeon of the day tomorrow'], 'd-pr': ['Set a new record today', 'Set a new record tomorrow'],
  'd-sleep': ['Log 7 hours of sleep or more today', 'Log 7 hours of sleep or more tomorrow'], 'd-meals': ['Eat 3 planned meals today', 'Eat 3 planned meals tomorrow'],
  'd-xp': ['Earn 300 XP today', 'Earn 300 XP tomorrow'], 'd-long': ['Train 45 minutes or more today', 'Train 45 minutes or more tomorrow'],
  'd-weigh': ['Log your weight today', 'Log your weight tomorrow'], 'd-perfect': ['Have a perfect nutrition day today', 'Have a perfect nutrition day tomorrow'],
  'd-triple': ['Train, hit your water goal and sleep 7 h today', 'Train, hit your water goal and sleep 7 h tomorrow'] };
const DAY_ICO = { 'd-train': 'lifter', 'd-dg': 'gate', 'd-sets': 'swords', 'd-water': 'water', 'd-quests': 'scroll', 'd-feat': 'temple', 'd-pr': 'trophy', 'd-sleep': 'sleep', 'd-meals': 'cutlery', 'd-xp': 'sparkles', 'd-long': 'stopwatch', 'd-weigh': 'scale', 'd-perfect': 'pot', 'd-triple': 'crown', 'd-kg': 'weight', 'd-mg': 'strong' };
const KIND_ICO = { train: 'flame', dg: 'minotaur', min: 'stopwatch', pr: 'trophy', water: 'water', sets: 'swords', xp: 'sparkles', boss: 'golem', match: 'medal', nolose: 'shield', streak: 'bolt', lvl: 'upgrade', meals: 'cutlery', days: 'calendar', kg: 'weight', reps: 'fist', var: 'book', mg: 'strong', long: 'stopwatch', morning: 'sunrise', evening: 'moon', weekend: 'calendar', drills: 'target', ovr: 'upgrade', weigh: 'scale', wlose: 'scale', wgain: 'scale', sleepn: 'sleep', questd: 'scroll', perfect: 'pot', badge: 'medal' };
const label = (kind, n, suf) => ({
  train: n === 1 ? `Train once ${suf}` : `Train ${n} times ${suf}`,
  dg: n === 1 ? `Clear a dungeon ${suf}` : `Clear ${n} dungeons ${suf}`,
  min: `Train ${n} minutes ${suf}`, pr: `Set a new record ${suf}`, water: n === 1 ? `Hit your water goal once ${suf}` : `Hit your water goal on ${n} days ${suf}`,
  sets: `Log ${n} sets ${suf}`, xp: `Earn ${n} XP ${suf}`, boss: `Defeat the weekly boss ${suf}`, match: `Win your Academy match ${suf}`, nolose: `Don't lose your Academy match ${suf}`,
  streak: `Reach a ${n}-day training streak ${suf}`, lvl: `Reach level ${n} ${suf}`, meals: `Eat ${n} planned meals ${suf}`, days: `Train on ${n} different days ${suf}`,
  kg: `Lift ${n} kg in total ${suf}`, reps: `Do ${n} reps ${suf}`, var: `Do ${n} different exercises ${suf}`, long: `Do a workout of 60 minutes or more ${suf}`,
  morning: `Train in the morning (before 9h) ${suf}`, evening: `Train at night (from 20h) ${suf}`, weekend: `Train on Saturday and Sunday ${suf}`,
  drills: `Do ${n} Academy drills ${suf}`, ovr: `Raise your OVR by ${n} ${suf}`, weigh: n === 1 ? `Log your weight ${suf}` : `Log your weight ${n} times ${suf}`,
  wlose: `Lose ${n} kg ${suf}`, wgain: `Gain ${n} kg ${suf}`, sleepn: n === 1 ? `Sleep 7 h or more one night ${suf}` : `Sleep 7 h or more on ${n} nights ${suf}`, questd: n === 1 ? `Claim all daily quests on one day ${suf}` : `Claim all daily quests on ${n} days ${suf}`,
  perfect: `Have a perfect nutrition day ${suf}`, badge: `Unlock a new badge ${suf}`,
})[kind];
const labelMg = (grp, n, suf) => n === 1 ? `Train ${GRP[grp]} once ${suf}` : `Train ${GRP[grp]} ${n} times ${suf}`;
const dayTitle = (l, live) => l.kind === 'd-kg' ? `Lift ${l.n} kg ${live ? 'today' : 'tomorrow'}` : l.kind === 'd-mg' ? `Train ${GRP[l.grp]} ${live ? 'today' : 'tomorrow'}` : DAY_T[l.kind][live ? 0 : 1];
// the day/week/month window holding the moment right after `t` (weeks start on Monday, months on the 1st)
function nextWindow(per, t) {
  const d = at0(t + 1);
  if (per === 'day') { const e = new Date(d); e.setDate(e.getDate() + 1); return { from: d.getTime(), to: e.getTime() - 1 }; }
  if (per === 'week') { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const e = new Date(d); e.setDate(e.getDate() + 7); return { from: d.getTime(), to: e.getTime() - 1 }; }
  const m = new Date(d.getFullYear(), d.getMonth(), 1), e = new Date(d.getFullYear(), d.getMonth() + 1, 1); return { from: m.getTime(), to: e.getTime() - 1 };
}
// title of a leg, worded for right now ("this week" turns into... "next week" until it starts)
function legTitle(l) {
  if (!l.per) return l.t;
  const live = l.from <= Date.now();
  if (l.per === 'day') return l.kind === 'd-feat' ? l.t : dayTitle(l, live);
  const suf = (live ? 'this ' : 'next ') + l.per;
  return l.kind === 'mg' ? labelMg(l.grp, l.n, suf) : label(l.kind, l.n, suf);
}
// chance that a goal comes true in a window (counts what is already done if the window has started)
function legProb(kind, n, from, to, grp) {
  const f = form(), now = Date.now(), live = from <= now, days = Math.max(1, Math.ceil((to - Math.max(now, from)) / DAY));
  const lam = f.perWeek * days / 7, lamDg = f.dgPerWeek * days / 7;
  switch (kind) {
    case 'd-train': return Math.min(.85, Math.max(.12, f.perWeek / 7 * 1.15));
    case 'd-dg': return Math.min(.6, Math.max(.06, f.dgPerWeek / 7 * 1.3));
    case 'd-sets': return Math.min(.7, Math.max(.08, f.perWeek / 7 * .7));
    case 'd-water': return .55;
    case 'd-quests': return .4;
    case 'train': return atLeast(n - (live ? trainsIn(from, to) : 0), lam);
    case 'dg': return atLeast(n - (live ? dgIn(from, to) : 0), lamDg);
    case 'min': return atLeast(Math.ceil((n - (live ? minsIn(from, to) : 0)) / f.mins), lam);
    case 'pr': return Math.min(.85, .2 + .08 * lam);
    case 'water': return binomAtLeast(n - (live ? waterIn(from, to) : 0), days - (live && waterToday() ? 1 : 0), .55);
    case 'd-feat': return Math.min(.5, Math.max(.05, f.dgPerWeek / 7));
    case 'd-pr': return Math.min(.6, Math.max(.06, f.perWeek / 7 * .45));
    case 'd-sleep': return .5;
    case 'd-meals': return .45;
    case 'd-xp': return Math.min(.8, Math.max(.1, f.perWeek / 7 * (f.xpw >= 260 ? 1 : .6)));
    case 'sets': return atLeast(Math.ceil((n - (live ? setsIn(from, to) : 0)) / f.sets), lam);
    case 'days': return binomAtLeast(n - (live ? daysIn(from, to) : 0), days - (live && trainsIn(dayStart(), dayEnd()) ? 1 : 0), Math.min(.9, f.perWeek / 7));
    case 'xp': return atLeast(Math.ceil((n - (live ? xpIn(from) : 0)) / f.xpw), lam);
    case 'boss': return atLeast((S.profile?.days || 3) - (live ? trainsIn(from, to) : 0), lam);
    case 'lvl': return atLeast(Math.ceil((totalXp(n) - G.xp) / f.xpw), lam);
    case 'streak': { const need = Math.max(0, n - (live ? streak() : 0)), q = Math.min(.9, f.perWeek / 7 + .1); return need > days ? 0 : Math.min(.95, q ** need * Math.min(1, days / need)); }
    case 'meals': return atLeast(n - (live ? mealsEaten() : 0), days * 2.2);
    case 'd-long': return Math.min(.75, Math.max(.08, f.perWeek / 7 * (f.mins >= 45 ? .9 : .4)));
    case 'd-kg': return Math.min(.7, Math.max(.06, f.perWeek / 7 * .5));
    case 'd-mg': return Math.min(.6, Math.max(.05, f.perWeek / 7 * f.mg[grp]));
    case 'd-weigh': return .5;
    case 'd-perfect': return .2;
    case 'd-triple': return Math.min(.85, f.perWeek / 7 * 1.1) * .55 * .5;
    case 'kg': return f.kgw > 50 ? atLeast(Math.ceil((n - (live ? kgIn(from, to) : 0)) / f.kgw), lam) : 0;
    case 'reps': return atLeast(Math.ceil((n - (live ? repsIn(from, to) : 0)) / f.repw), lam);
    case 'var': return atLeast(Math.ceil((n - (live ? varIn(from, to) : 0)) / (f.exw * .6)), lam);
    case 'mg': return atLeast(n - (live ? mgIn(grp, from, to) : 0), lam * Math.max(.08, f.mg[grp]));
    case 'long': return atLeast(1 - (live ? countIn(from, to, h => h.dur >= 60) : 0), lam * f.long);
    case 'morning': return atLeast(1 - (live ? countIn(from, to, h => hourOf(h) < 9) : 0), lam * f.morn);
    case 'evening': return atLeast(1 - (live ? countIn(from, to, h => hourOf(h) >= 20) : 0), lam * f.eve);
    case 'weekend': { // Saturday and Sunday still to come (or done)
      const q = Math.min(.85, f.perWeek / 7 * 1.2); let p = 1;
      for (const wd of [6, 0]) { const day = new Date(from); day.setDate(day.getDate() + (wd === 6 ? 5 : 6)); const t0 = day.getTime(), t1 = t0 + DAY - 1;
        if (S.history.some(h => inWin(h, t0, t1))) continue; if (t1 < now) return 0; p *= q; }
      return p; }
    case 'drills': return atLeast(n - (live ? drillsIn(from, to) : 0), f.drills * days / 7);
    case 'ovr': return atLeast(n * 2, f.drills * days / 7 + lam * .3);
    case 'weigh': return atLeast(n - (live ? weighIn(from, to) : 0), f.weigh * days / 7);
    case 'wlose': case 'wgain': return Math.min(.6, .18 * days / 7 / n + .05);
    case 'sleepn': return binomAtLeast(n - (live ? flagIn('sleep', from, to) : 0), days - (live && G.today.sleepDone ? 1 : 0), .5);
    case 'questd': return binomAtLeast(n - (live ? flagIn('quests', from, to) : 0), days - (live && questsAllDone() ? 1 : 0), .4);
    case 'perfect': return binomAtLeast(1, days, .2);
    case 'badge': return Math.min(.75, .25 + .05 * days);
    case 'match': case 'nolose': { const k = sportKey(); if (!k) return 0; const w = winChance(k); return kind === 'match' ? w.pw : Math.min(.95, w.pw + w.draw); }
  }
  return .5;
}
// Odds: lower than fair, never below 1.00 (a stake back, no profit). Training once in a week or month never pays.
// Weeks and months pay much less than a single day. Muscle picks start at 1.00 and only muscles you rarely train get a small bonus.
const ODDS_SCALE = { day: 1, week: .6, month: .45 }, ODDS_CAP = { day: 4, week: 2.5, month: 2 };
const MG_CAP = { day: 1.5, week: 1.3, month: 1.2 };
// how rarely you train a muscle compared with your most trained one (0 = most trained, 1 = never)
const mgRarity = grp => { const m = form().mg, top = Math.max(...Object.values(m)); return top > 0 ? 1 - m[grp] / top : 0; };
function oddsFor(kind, n, p, per = 'day', grp) {
  if (kind === 'train' && n <= 1) return 1;
  const extra = .85 / Math.max(p, .01) - 1, r20 = x => Math.round(x * 20) / 20;
  if (kind === 'd-mg' || kind === 'mg') return Math.min(MG_CAP[per], Math.max(1, r20(1 + mgRarity(grp) * (MG_CAP[per] - 1))));
  return Math.min(ODDS_CAP[per], Math.max(1, r20(1 + extra * .45 * ODDS_SCALE[per])));
}

// Markets. g: group (one pick per group in a bet). topic: related topics get an odds cut in combined bets.
// one: a single workout could finish it (two such picks cannot be combined). tab: which period it is shown under.
function markets() {
  const f = form(), ds = dayStart(), de = dayEnd(), out = [];
  const day = (kind, g, topic, extra) => out.push({ id: kind, kind, per: 'day', g, topic, t: DAY_T[kind]?.[0], ico: DAY_ICO[kind], tab: 'today', from: ds, to: de, p: legProb(kind, 0, ds, de), ...extra });
  if (!trainsIn(ds, de)) day('d-train', 'today', 'train');
  if (dungeonsOpen() && !dgIn(ds, de)) day('d-dg', 'today', 'train');
  if (setsIn(ds, de) < 20) day('d-sets', 'today', 'train', { need: 20, prog: setsIn(ds, de) });
  if (!waterToday()) day('d-water', 'water', 'water');
  if (!questsAllDone()) day('d-quests', 'quests', 'quests');
  const feat = featuredId();
  if (feat && DUNGEONS[feat].lv <= lvl() && !S.history.some(h => inWin(h, ds, de) && h.dungeon === feat)) day('d-feat', 'today', 'train', { feat, t: `Clear ${DUNGEONS[feat].name} (dungeon of the day)` });
  if (S.history.length && !prToday()) day('d-pr', 'record', 'train');
  ensureDay();
  if (!G.today.sleepDone) day('d-sleep', 'sleep', 'sleep');
  if (mealsOn() && (G.today.meals || 0) < 3) day('d-meals', 'meals', 'meals', { need: 3, prog: G.today.meals || 0 });
  if (xpIn(ds) < 300) day('d-xp', 'xp', 'train', { need: 300, prog: xpIn(ds) });
  if (!countIn(ds, de, h => h.dur >= 45)) day('d-long', 'today', 'train');
  if (f.kgw > 50) { const n = Math.max(500, Math.round(f.kgw * 1.1 / 250) * 250); if (kgIn(ds, de) < n) day('d-kg', 'today', 'train', { n, t: `Lift ${n} kg today`, need: n, prog: kgIn(ds, de) }); }
  for (const grp of Object.keys(MG)) if (!mgIn(grp, ds, de)) out.push({ id: 'd-mg-' + grp, kind: 'd-mg', grp, per: 'day', g: 'mg-' + grp, topic: 'muscle', t: `Train ${GRP[grp]} today`, ico: 'strong', tab: 'today', from: ds, to: de, p: legProb('d-mg', 0, ds, de, grp) });
  if (!weighIn(ds, de)) day('d-weigh', 'weigh', 'weight');
  if (mealsOn() && !G.today.perfect) day('d-perfect', 'perfect', 'meals');
  if (!G.today.sleepDone && !(trainsIn(ds, de) && G.today.waterGoal)) day('d-triple', 'triple', 'train');
  for (const P of periods()) {
    const per = P.k.endsWith('week') ? 'week' : 'month';
    const start = P.live ? Date.now() : P.from, days = Math.max(1, Math.ceil((P.to - start) / DAY)), lam = f.perWeek * days / 7, lamDg = f.dgPerWeek * days / 7;
    const TOPIC = { mg: 'muscle', water: 'water', sleepn: 'sleep', questd: 'quests', perfect: 'meals', meals: 'meals', weigh: 'weight', wlose: 'weight', wgain: 'weight', badge: 'game', drills: 'sport', ovr: 'sport', match: 'sport', nolose: 'sport' };
    const mk = (kind, n, prog, extra = {}) => out.push({ id: `${P.k}:${kind}${extra.grp || ''}${n}`, kind, n, per, g: P.k + kind + (extra.grp || ''), topic: TOPIC[kind] || 'train', t: label(kind, n, P.suf), ico: KIND_ICO[kind],
      tab: P.k, from: P.from, to: P.to, need: n, prog, show: P.live, p: legProb(kind, n, P.from, P.to, extra.grp), ...extra });
    const tw = P.live ? trainsIn(P.from, P.to) : 0;
    for (const n of uniq([1, Math.round(lam * .7), Math.round(lam), Math.round(lam * 1.3) + 1].map(r => tw + Math.max(1, r))).filter(n => n - tw <= days).slice(-3)) mk('train', n, tw, { one: P.live && n - tw === 1 });
    if (dungeonsOpen()) {
      const dw = P.live ? dgIn(P.from, P.to) : 0;
      for (const n of uniq([1, Math.round(lamDg), Math.round(lamDg * 1.5) + 1].map(r => dw + Math.max(1, r))).filter(n => n - dw <= days).slice(-2)) mk('dg', n, dw, { one: P.live && n - dw === 1 });
    }
    const mw = P.live ? minsIn(P.from, P.to) : 0, em = lam * f.mins, wkEq = n => Math.ceil((n - mw) / f.mins);
    for (const n of uniq([.7, 1, 1.3].map(k => mw + Math.max(60, Math.round(em * k / 30) * 30))).filter((n, i, a) => !i || wkEq(n) !== wkEq(a[i - 1]))) mk('min', n, mw, { one: P.live && n - mw <= f.mins });
    if (S.history.length && !(P.live && prIn(P.from, P.to))) mk('pr', 0, 0, { t: label('pr', 0, P.suf), need: 0 });
    const wd = P.live ? waterIn(P.from, P.to) : 0, avail = days - (P.live && waterToday() ? 1 : 0);
    for (const n of uniq([.45, .65, .85].map(k => wd + Math.max(1, Math.round(avail * k)))).filter(n => n - wd <= avail)) mk('water', n, wd);
    // sets, active days, XP
    const sw = P.live ? setsIn(P.from, P.to) : 0, es = lam * f.sets, r5 = x => Math.max(5, Math.round(x / 5) * 5);
    for (const n of uniq([.8, 1.25].map(k => sw + r5(es * k)))) mk('sets', n, sw, { one: P.live && n - sw <= f.sets });
    const aw = P.live ? daysIn(P.from, P.to) : 0;
    for (const n of uniq([Math.round(lam * .8), Math.round(lam) + 1].map(r => aw + Math.max(1, r))).filter(n => n - aw <= days && n > 1).slice(-1)) mk('days', n, aw);
    const xw = P.live ? xpIn(P.from) : 0, ex = lam * f.xpw, r50 = x => Math.max(100, Math.round(x / 50) * 50);
    for (const n of uniq([.8, 1.3].map(k => xw + r50(ex * k)))) mk('xp', n, xw, { one: P.live && n - xw <= f.xpw });
    // the weekly boss falls when you train as many days as your plan asks
    if (per === 'week' && S.profile?.days && !(P.live && tw >= S.profile.days)) mk('boss', S.profile.days, tw, { g: P.k + 'train', t: label('boss', 0, P.suf), one: P.live && S.profile.days - tw === 1 });
    // level, streak
    if (per === 'month') mk('lvl', lvl() + 1, 0, { need: 0, one: P.live && totalXp(lvl() + 1) - G.xp <= f.xpw });
    const st = P.live ? streak() : 0;
    for (const n of uniq([st + 2, Math.max(3, st + 4)]).filter(n => n >= 3)) mk('streak', n, st, { need: 0 });
    // planned meals (this week's meal plan only)
    if (P.k === 'week' && mealsOn() && M.plan.week === weekId()) { const me = mealsEaten(); for (const n of uniq([15, 21].filter(n => n > me))) mk('meals', n, me); }
    // volume and variety
    const kw = P.live ? kgIn(P.from, P.to) : 0, r500 = x => Math.max(500, Math.round(x / 500) * 500);
    if (f.kgw > 50) for (const n of uniq([.8, 1.25].map(k => kw + r500(lam * f.kgw * k)))) mk('kg', n, kw, { one: P.live && n - kw <= f.kgw });
    const rw = P.live ? repsIn(P.from, P.to) : 0, r10 = x => Math.max(50, Math.round(x / 10) * 10);
    mk('reps', rw + r10(lam * f.repw), rw, { one: P.live && lam * f.repw <= f.repw });
    const vw = P.live ? varIn(P.from, P.to) : 0;
    mk('var', vw + Math.max(3, Math.round(lam * f.exw * .6)), vw);
    // muscle groups
    for (const grp of Object.keys(MG)) {
      const gw = P.live ? mgIn(grp, P.from, P.to) : 0, n = gw + Math.max(1, Math.round(lam * f.mg[grp]));
      if (n - gw <= days) mk('mg', n, gw, { grp, t: labelMg(grp, n, P.suf), ico: 'strong', one: P.live && n - gw === 1 });
    }
    // when you train
    if (!(P.live && countIn(P.from, P.to, h => h.dur >= 60))) mk('long', 0, 0, { need: 0, one: P.live });
    if (!(P.live && countIn(P.from, P.to, h => hourOf(h) < 9))) mk('morning', 0, 0, { need: 0, one: P.live });
    if (!(P.live && countIn(P.from, P.to, h => hourOf(h) >= 20))) mk('evening', 0, 0, { need: 0, one: P.live });
    if (per === 'week' && !(P.live && weekendIn(P.from, P.to) >= 2)) mk('weekend', 0, 0, { need: 0 });
    // health
    const sl = P.live ? flagIn('sleep', P.from, P.to) : 0, sa = days - (P.live && G.today.sleepDone ? 1 : 0);
    for (const n of uniq([.5, .8].map(k => sl + Math.max(1, Math.round(sa * k)))).filter(n => n - sl <= sa)) mk('sleepn', n, sl);
    const ww = P.live ? weighIn(P.from, P.to) : 0;
    mk('weigh', ww + Math.max(1, Math.round(f.weigh * days / 7)), ww);
    const dir = weightDir();
    if (dir) mk(dir < 0 ? 'wlose' : 'wgain', per === 'week' ? .5 : 1.5, 0, { need: 0, base: curWeight() });
    if (mealsOn() && !(P.live && flagIn('perfect', P.from, P.to))) mk('perfect', 0, 0, { need: 0 });
    // game
    const qd = P.live ? flagIn('quests', P.from, P.to) : 0, qa = days - (P.live && questsAllDone() ? 1 : 0);
    const qn = qd + Math.max(1, Math.round(qa * .5)); if (qn - qd <= qa) mk('questd', qn, qd);
    if (P.live) mk('badge', 0, 0, { need: 0, base: G.ach.length });
    // Academy match (one a week, played from the Sports Academy)
    const sk = sportKey();
    if (sk) {
      const dr = P.live ? drillsIn(P.from, P.to) : 0;
      mk('drills', dr + Math.max(2, Math.round(f.drills * days / 7)), dr, { key: sk });
      mk('ovr', per === 'week' ? 1 : 3, 0, { need: 0, key: sk, base: ovrNow(sk) });
    }
    if (sk && per === 'week' && !(P.live && SP.roles[sk]?.match?.week === weekId())) {
      const extra = { key: sk, need: 0, topic: 'sport', g: P.k + 'match' };
      mk('match', 0, 0, extra);
      if (winChance(sk).draw) mk('nolose', 0, 0, extra);
    }
  }
  // goals with almost no chance left are not offered
  return out.filter(m => m.p >= .04).map(m => ({ ...m, o: oddsFor(m.kind, m.n, m.p, m.per, m.grp) }));
}

// did a placed leg come true? (uses the window saved with the bet)
function legDone(l) {
  const a = l.from, b = l.to, id = l.id, k = l.kind;
  if (id === 'd-train') return trainsIn(a, b) >= 1;
  if (id === 'd-dg') return dgIn(a, b) >= 1;
  if (id === 'd-sets') return setsIn(a, b) >= 20;
  if (id === 'd-water') return G.today?.day === l.day && !!G.today.waterGoal;
  if (id === 'd-quests') return G.quests?.day === l.day && G.quests.claimed.length >= G.quests.list.length;
  if (k === 'train' || id.startsWith('w-train')) return trainsIn(a, b) >= l.need;
  if (k === 'dg' || id.startsWith('w-dg')) return dgIn(a, b) >= l.need;
  if (k === 'min' || id.startsWith('w-min')) return minsIn(a, b) >= l.need;
  if (k === 'pr' || id === 'w-pr') return prIn(a, b);
  if (k === 'water' || id.startsWith('w-water')) return waterIn(a, b) >= l.need;
  if (Date.now() < a) return false; // the rest only count once the window has started
  if (id === 'd-feat') return S.history.some(h => inWin(h, a, b) && h.dungeon && h.dungeon === l.feat);
  if (id === 'd-pr') return prIn(a, b);
  if (id === 'd-sleep') return G.today?.day === l.day && G.today.sleep >= 7;
  if (id === 'd-meals') return G.today?.day === l.day && (G.today.meals || 0) >= 3;
  if (id === 'd-xp') return xpIn(a) >= 300;
  if (k === 'sets') return setsIn(a, b) >= l.need;
  if (k === 'days') return daysIn(a, b) >= l.need;
  if (k === 'xp') return xpIn(a) >= l.need;
  if (k === 'boss') return trainsIn(a, b) >= l.need;
  if (k === 'lvl') return lvl() >= l.need;
  if (k === 'streak') return streak() >= l.need;
  if (k === 'meals') return weekId() === weekId(a) && mealsEaten() >= l.need;
  if (k === 'match' || k === 'nolose') { const m = SP.roles?.[l.key]?.match; return m?.week === weekId(a) && (m.res === 'W' || (k === 'nolose' && m.res === 'D')); }
  if (id === 'd-long') return countIn(a, b, h => h.dur >= 45) >= 1;
  if (k === 'd-kg') return kgIn(a, b) >= l.n;
  if (k === 'd-mg') return mgIn(l.grp, a, b) >= 1;
  if (id === 'd-weigh') return weighIn(a, b) >= 1;
  if (id === 'd-perfect') return G.today?.day === l.day && !!G.today.perfect;
  if (id === 'd-triple') return G.today?.day === l.day && trainsIn(a, b) >= 1 && !!G.today.waterGoal && G.today.sleep >= 7;
  if (k === 'kg') return kgIn(a, b) >= l.need;
  if (k === 'reps') return repsIn(a, b) >= l.need;
  if (k === 'var') return varIn(a, b) >= l.need;
  if (k === 'mg') return mgIn(l.grp, a, b) >= l.need;
  if (k === 'long') return countIn(a, b, h => h.dur >= 60) >= 1;
  if (k === 'morning') return countIn(a, b, h => hourOf(h) < 9) >= 1;
  if (k === 'evening') return countIn(a, b, h => hourOf(h) >= 20) >= 1;
  if (k === 'weekend') return weekendIn(a, b) >= 2;
  if (k === 'drills') return drillsIn(a, b) >= l.need;
  if (k === 'ovr') return ovrNow(l.key) >= l.base + l.n;
  if (k === 'weigh') return weighIn(a, b) >= l.need;
  if (k === 'wlose' || k === 'wgain') { const w = S.weights.filter(x => x.t >= a && x.t <= b).at(-1); return !!w && (k === 'wlose' ? w.w <= l.base - l.n : w.w >= l.base + l.n); }
  if (k === 'sleepn') return flagIn('sleep', a, b) >= l.need;
  if (k === 'questd') return flagIn('quests', a, b) >= l.need;
  if (k === 'perfect') return flagIn('perfect', a, b) >= 1;
  if (k === 'badge') return G.ach.length > l.base;
  return false;
}
// a pick that can no longer come true before its deadline
function legFailed(l) {
  if (l.id === 'd-sleep' || l.id === 'd-triple') return G.today?.day === l.day && G.today.sleepDone && G.today.sleep < 7;
  if (l.kind === 'match' || l.kind === 'nolose') { const m = SP.roles?.[l.key]?.match; return m?.week === weekId(l.from) && !(m.res === 'W' || (l.kind === 'nolose' && m.res === 'D')); }
  return false;
}

// odds of a slip: picks multiply; each extra pick on a related topic (training) cuts the total by 15%
function slipOdds(legs) {
  const raw = legs.reduce((a, l) => a * l.o, 1);
  const byTopic = {}; legs.filter(l => l.o > 1).forEach(l => { byTopic[l.topic] = (byTopic[l.topic] || 0) + 1; }); // 1.00 picks add nothing, so they cost nothing
  const related = Object.values(byTopic).reduce((a, n) => a + Math.max(0, n - 1), 0);
  const win = {}; legs.filter(isMg).forEach(l => { const k = l.per + ':' + l.from; win[k] = (win[k] || 0) + 1; });
  const muscles = legs.filter(isMg).length, mgx = Object.entries(win).reduce((a, [k, n]) => a * (MG_X[k.split(':')[0]][n] || 1), 1);
  return { raw, related, muscles, mgx, total: Math.min(BET_COMBO_MAX, Math.max(1, Math.round(raw * mgx * .85 ** related * 100) / 100)) };
}

// ---------- settle open bets ----------
let settling = false;
function settleBets(quiet) {
  if (settling || !BT.open.length) return;
  settling = true;
  const now = Date.now(); let changed = false;
  for (const b of [...BT.open]) {
    for (const l of b.legs) {
      if (l.st) continue;
      if (legDone(l)) { l.st = 'won'; changed = true; } else if (now > l.to || legFailed(l)) { l.st = 'lost'; changed = true; }
    }
    const lost = b.legs.some(l => l.st === 'lost'), won = b.legs.every(l => l.st === 'won');
    if (!lost && !won) continue;
    BT.open.splice(BT.open.indexOf(b), 1);
    b.res = won ? 'won' : 'lost'; b.at = now;
    if (won) {
      const pay = Math.round(b.stake * b.odds);
      G.coins += pay; BT.won++; BT.net += pay - b.stake; BT.best = Math.max(BT.best, pay);
      if (b.legs.length >= 3) BT.combo3 = (BT.combo3 || 0) + 1;
      if (!quiet) { toast(`Bet won: ${pay} coins`); sfx('level'); confetti(); }
    } else {
      BT.lost++; BT.net -= b.stake;
      if (!quiet) toast('Bet lost');
    }
    BT.done.unshift(b); BT.done.length = Math.min(BT.done.length, 15);
    if (b.repeat) renewBet(b, quiet);
    changed = true;
  }
  if (changed) { commit(); checkAch(); }
  settling = false;
}

// ---------- repeating bets ----------
// A bet can repeat when all its picks share one period type (day, week or month).
const NO_REPEAT = ['d-feat', 'lvl', 'badge'];
const repeatPer = legs => legs.length && legs.every(l => l.per && l.per === legs[0].per && !NO_REPEAT.includes(l.kind)) ? legs[0].per : null;
// Place the same bet again for the next period (same goals and stake, odds worked out again).
function renewBet(b, quiet) {
  if (G.coins < b.stake) { if (!quiet) toast('Not enough coins to repeat your bet. It stopped repeating.'); return; }
  const now = Date.now();
  const legs = b.legs.map(l => {
    let w = nextWindow(b.repeat, l.to);
    while (w.to < now) w = nextWindow(b.repeat, w.to); // away for a while: jump to the current period
    const p = legProb(l.kind, l.n, w.from, w.to, l.grp);
    const base = l.kind === 'ovr' ? ovrNow(l.key) : l.kind === 'wlose' || l.kind === 'wgain' ? curWeight() : l.kind === 'badge' ? G.ach.length : l.base;
    return { ...l, ...w, base, st: undefined, o: oddsFor(l.kind, l.n, p, l.per, l.grp), day: dayId(w.from), t: undefined };
  });
  legs.forEach(l => { delete l.st; l.t = legTitle(l); });
  const nb = { id: 'b' + now.toString(36) + Math.random().toString(36).slice(2, 5), t: now, stake: b.stake, odds: slipOdds(legs).total, legs, repeat: b.repeat, round: (b.round || 1) + 1 };
  G.coins -= b.stake; BT.open.push(nb); BT.placed = (BT.placed || 0) + 1;
  if (!quiet) toast(`Bet repeated for the next ${b.repeat}`);
}
window.betNoRepeat = id => { const b = BT.open.find(x => x.id === id); if (b) { delete b.repeat; commit(); toast('It will not repeat.'); betsView(); } };
window.betRepeat = () => { slipRepeat = !slipRepeat; betsView(); };

// ---------- actions ----------
window.betPick = id => {
  const m = markets().find(x => x.id === id); if (!m) return;
  const i = slip.findIndex(l => l.id === id);
  if (i >= 0) slip.splice(i, 1);
  else {
    // two training goals that a single workout could finish (today's goals, or weekly ones one workout away) would pay twice for one workout
    const solo = x => x.g === 'today' || x.one || x.kind === 'd-mg';
    const clashes = l => solo(m) && solo(l) && l.g !== m.g && !(isMg(l) && isMg(m));
    if (slip.some(clashes)) { slip = slip.filter(l => !clashes(l)); toast('One workout would win both picks, so they cannot be combined.'); }
    const same = slip.findIndex(l => l.g === m.g);
    if (same >= 0) slip.splice(same, 1); // one pick per group: swap it
    if (slip.length >= LEGS_MAX) { toast(`Up to ${LEGS_MAX} picks per bet.`); return; }
    slip.push(m);
  }
  sfx('tick'); betsView();
};
window.betStake = v => { stake = Math.round(Math.min(BET_MAX, Math.max(BET_MIN, +v || BET_MIN))); betsView(); };
window.betClear = () => { slip = []; betsView(); };
window.betTabSet = k => { betTab = k; betsView(); };
window.placeBet = () => {
  if (!slip.length) return;
  if (BT.open.length >= BET_OPEN) { toast(`You can have ${BET_OPEN} open bets at a time.`); return; }
  if (stake > G.coins) { toast('Not enough coins.'); return; }
  const live = markets(), legs = slip.map(s => live.find(m => m.id === s.id)).filter(Boolean);
  if (legs.length !== slip.length) { toast('Some picks are no longer available.'); slip = legs; betsView(); return; }
  const now = Date.now(), so = slipOdds(legs);
  const bet = { id: 'b' + now.toString(36), t: now, stake, odds: so.total, legs: legs.map(m => ({ id: m.id, kind: m.kind, n: m.n, per: m.per, feat: m.feat, key: m.key, grp: m.grp, base: m.base, t: m.t, ico: m.ico, o: m.o, need: m.need, topic: m.topic, from: m.from, to: m.to, day: dayId(m.from) })) };
  if (slipRepeat && repeatPer(legs)) bet.repeat = repeatPer(legs);
  G.coins -= stake; BT.open.push(bet); BT.placed = (BT.placed || 0) + 1; commit();
  slip = []; slipRepeat = false; sfx('claim'); toast(legs.length > 1 ? 'Combined bet placed' : 'Bet placed');
  settleBets(); betsView();
};

// ---------- screen ----------
const legIcon = st => st === 'won' ? '<span class="lg ok">✓</span>' : st === 'lost' ? '<span class="lg ko">✗</span>' : '<span class="lg">…</span>';
function betCard(b) {
  const pay = Math.round(b.stake * b.odds);
  return `<section class="card bet ${b.res || 'open'}"><div class="row between"><b>${b.legs.length > 1 ? `Combined bet · ${b.legs.length} picks` : 'Single bet'}</b><span class="odd">${b.odds.toFixed(2)}</span></div>
    ${b.legs.map(l => `<div class="row betleg">${legIcon(l.st)}<span class="grow">${l.st ? l.t : legTitle(l)}</span><span class="mut">${l.o.toFixed(2)}</span></div>`).join('')}
    <div class="row between mut"><span>Stake ${gi('coin', 'cn')} ${b.stake}</span><span>${b.res === 'won' ? `Won ${gi('coin', 'cn')} ${pay}` : b.res === 'lost' ? 'Lost' : `Pays ${gi('coin', 'cn')} ${pay}`}</span></div>
    ${b.repeat && !b.res ? `<div class="row between rep"><span class="mut">${ic('swap', 16)} Repeats every ${b.repeat}</span><button class="btn sm ghost" onclick="betNoRepeat('${b.id}')">Stop</button></div>` : ''}</section>`;
}
const mgHint = t => `<div class="mut">Each muscle pays 1.00 alone, a bit more if you rarely train it. Combine them: 2 muscles ×${t[2]}, 3 ×${t[3]}, 4 ×${t[4]}, 5 ×${t[5]}, all 6 ×${t[6]}.</div>`;
function betsView() {
  if (needProfile()) return;
  ensureDay(); settleBets();
  const ms = markets(), on = new Set(slip.map(l => l.id));
  slip = slip.filter(l => ms.some(m => m.id === l.id));
  const so = slipOdds(slip), maxStake = Math.min(BET_MAX, G.coins);
  stake = Math.max(BET_MIN, Math.min(stake, Math.max(BET_MIN, maxStake)));
  const row = m => `<button class="mkt ${on.has(m.id) ? 'on' : ''}" onclick="betPick('${m.id}')"><span class="qi">${gi(m.ico)}</span><span class="grow"><span class="mt">${m.t}</span>${m.need && m.show !== false ? `<span class="mut">${Math.min(m.prog, m.need)}/${m.need} so far</span>` : ''}</span><span class="odd">${m.o.toFixed(2)}</span></button>`;
  const list = ms.filter(m => m.tab === betTab), per = periods().find(P => P.k === betTab);
  const fmt = t => new Date(t).toLocaleDateString(LANG, { weekday: 'short', day: 'numeric', month: 'short' });
  const note = betTab === 'today' ? 'Ends at midnight.' : per.live ? `Ends ${fmt(per.to)}.` : `From ${fmt(per.from)} to ${fmt(per.to)}. ${betTab === 'nweek' ? 'You can bet on it until Sunday night.' : 'You can bet on it until the end of this month.'}`;
  view.innerHTML = `${hud()}<button class="btn sm ghost back" onclick="location.hash='#/earn'">${ic('back', 18)} Back</button><h1>Bets</h1>
  <details class="card howto"><summary>How bets work</summary><ol>
    <li>Tap a goal to add it to your bet slip. The number on the right is its odds: what each coin you stake pays back if it comes true.</li>
    <li>One pick is a single bet. Two to five picks make a combined bet: the odds multiply, so it pays much more, but every pick has to come true.</li>
    <li>Picks about training are related, so in a combined bet each extra training pick cuts the total odds by 15%. Only one pick per kind of goal, and no two picks that one workout would win together.</li>
    <li>Bet on today, this week, next week, this month or next month. Next week is open for bets until Sunday night, and next month until the end of this month. A bet pays out as soon as all its picks are done, and is lost when a pick runs out of time.</li>
    <li>Muscle picks pay 1.00 alone, because you will train something, and a bit more for muscles you rarely train. Combine several muscles of the same day, week or month to raise the odds: today 2 muscles ×1.25 up to all 6 ×3.6, a week up to ×1.6, a month up to ×1.35.</li>
    <li>Tick Repeat to renew a bet on its own every day, week or month. Stop it from My bets whenever you like.</li>
    <li>Odds come from your last four weeks: goals you rarely reach pay more, easy ones pay 1.00 (you only get your coins back), training once a week or month never pays, and weeks and months pay much less than a single day. Stakes go from ${BET_MIN} to ${BET_MAX} coins, with up to ${BET_OPEN} open bets. Only game coins, never real money.</li></ol></details>
  ${slip.length ? `<section class="card slip"><div class="row between"><h3>${slip.length > 1 ? `Combined bet · ${slip.length} picks` : 'Single bet'}</h3><button class="icon" aria-label="Clear slip" onclick="betClear()">${ic('close', 18)}</button></div>
    ${slip.map(l => `<div class="row betleg"><span class="grow">${l.t}</span><span class="mut">${l.o.toFixed(2)}</span></div>`).join('')}
    ${so.muscles > 1 ? `<div class="mut">Muscle combo: ${so.muscles} muscles ×${so.mgx.toFixed(2)}</div>` : ''}
    ${so.related ? `<div class="mut">Related training picks: odds ×${(.85 ** so.related).toFixed(2)}</div>` : ''}
    <div class="row between"><span>Total odds</span><span class="odd big">${so.total.toFixed(2)}</span></div>
    <div class="lbl">Stake</div><div class="chips">${[10, 25, 50, 100, 200].filter(v => v <= maxStake).map(v => `<button class="chip ${stake === v ? 'on' : ''}" onclick="betStake(${v})">${v}</button>`).join('')}${maxStake >= BET_MIN ? `<button class="chip ${stake === maxStake ? 'on' : ''}" onclick="betStake(${maxStake})">Max</button>` : ''}</div>
    ${repeatPer(slip) ? `<label class="row rep"><input type="checkbox" ${slipRepeat ? 'checked' : ''} onchange="betRepeat()"><span class="grow">Repeat every ${repeatPer(slip)}</span></label><div class="mut">When it ends, the same bet is placed for the next ${repeatPer(slip)} with the same stake.</div>` : slip.length > 1 ? '<div class="mut">Only bets whose picks are all daily, all weekly or all monthly can repeat.</div>' : ''}
    <div class="row between pay"><span>Possible win</span><b>${gi('coin', 'cn')} ${Math.round(stake * so.total)}</b></div>
    <button class="btn chestbtn" ${G.coins >= stake && G.coins >= BET_MIN && BT.open.length < BET_OPEN ? '' : 'disabled'} onclick="placeBet()">${gi('ticket')} Place bet · ${stake} coins</button>
    ${G.coins < BET_MIN ? `<div class="mut">You need at least ${BET_MIN} coins.</div>` : BT.open.length >= BET_OPEN ? `<div class="mut">You can have ${BET_OPEN} open bets at a time.</div>` : ''}</section>`
    : `<p class="mut">Pick one goal for a single bet, or several for a combined bet.</p>`}
  <div class="chips bettabs">${PER_TABS.map(([k, t]) => `<button class="chip ${betTab === k ? 'on' : ''}" onclick="betTabSet('${k}')">${t}</button>`).join('')}</div>
  <div class="mut">${note}</div>
  ${list.length ? CATS.map(([c, name]) => { const xs = list.filter(m => catOf(m.kind) === c); return xs.length ? `<h3 class="betcat">${name}</h3>${c === 'muscle' ? mgHint(MG_X[betTab === 'today' ? 'day' : betTab.endsWith('week') ? 'week' : 'month']) : ''}${xs.map(row).join('')}` : ''; }).join('') : `<p class="mut">${betTab === 'today' ? 'Nothing left to bet on today. Well done!' : 'Nothing to bet on here right now.'}</p>`}
  <h2 class="sec">My bets</h2>
  ${BT.open.length ? BT.open.map(betCard).join('') : '<p class="mut">No open bets.</p>'}
  ${BT.done.length ? `<details class="card"><summary>Finished bets · won ${BT.won}, lost ${BT.lost}</summary>${BT.done.map(betCard).join('')}</details>` : ''}
  <div class="mut" style="text-align:center;margin-top:10px">Balance from bets: ${BT.net >= 0 ? '+' : '−'}${Math.abs(BT.net)} coins</div>`;
}

// ---------- hooks ----------
const _betWorkout = gameWorkout;
gameWorkout = function (h) { _betWorkout(h); settleBets(); };
const _betWater = window.addWater;
window.addWater = d => { _betWater(d); logWater(); settleBets(); };
for (const fn of ['logSleep', 'toggleEat', 'playMatch', 'claimQuestBonus', 'claimQuest']) { const f0 = window[fn]; if (f0) window[fn] = (...a) => { const r = f0(...a); logFlags(); settleBets(); return r; }; }
window.addEventListener('hashchange', () => { logXp(); settleBets(); });
setInterval(() => settleBets(), 60000); // catches goals that run out of time while the app stays open

const _betEarn = earn;
earn = function () {
  _betEarn();
  view.querySelector('h1')?.insertAdjacentHTML('afterend', `<section class="card"><div class="row between"><h3>Bets</h3><span class="mut">${BT.open.length ? `${BT.open.length} open` : 'Bet on yourself'}</span></div>
    <p class="mut">Stake coins on your own goals: train today, clear dungeons, hit your water goal. Combine picks to multiply the odds.</p>
    <button class="btn" onclick="location.hash='#/bets'">${gi('ticket')} Open bets</button></section>`);
};
const _betHome = home;
home = function () {
  _betHome();
  if (!BT.open.length) return;
  const n = BT.open.length, live = BT.open.reduce((a, b) => a + b.legs.filter(l => !l.st).length, 0);
  view.querySelector('button[onclick*="#/earn"]')?.insertAdjacentHTML('afterend', `<button class="btn ghost" onclick="location.hash='#/bets'">${gi('ticket')} ${n} open bet${n > 1 ? 's' : ''} · ${live} pick${live > 1 ? 's' : ''} to go</button>`);
};

ACH.push(
  { id: 'bet1', n: 'Bet on Yourself', d: 'Win a bet', i: 'ticket', xp: 100, ok: () => BT.won >= 1 },
  { id: 'bet3', n: 'Combo King', d: 'Win a combined bet with 3 or more picks', i: 'dice', xp: 300, ok: () => (BT.combo3 || 0) >= 1 },
);
Object.assign(routes, { bets: betsView, earn, home });
logXp(); logFlags(); settleBets(true);

if (typeof i18nAdd === 'function') {
  i18nAdd({
    Bets: 'Apuestas', 'Bet on yourself': 'Apuesta por ti', 'Open bets': 'Abrir apuestas', '{n} open': '{n} abiertas',
    'Stake coins on your own goals: train today, clear dungeons, hit your water goal. Combine picks to multiply the odds.': 'Apuesta monedas a tus propios objetivos: entrenar hoy, superar mazmorras, llegar a tu meta de agua. Combina selecciones para multiplicar la cuota.',
    'How bets work': 'Cómo funcionan las apuestas',
    "Tap a goal to add it to your bet slip. The number on the right is its odds: what each coin you stake pays back if it comes true.": 'Toca un objetivo para añadirlo a tu boleto. El número de la derecha es su cuota: lo que te devuelve cada moneda apostada si se cumple.',
    'One pick is a single bet. Two to five picks make a combined bet: the odds multiply, so it pays much more, but every pick has to come true.': 'Una selección es una apuesta simple. De dos a cinco selecciones forman una combinada: las cuotas se multiplican y paga mucho más, pero se tienen que cumplir todas.',
    'Picks about training are related, so in a combined bet each extra training pick cuts the total odds by 15%. Only one pick per kind of goal, and no two picks that one workout would win together.': 'Las selecciones de entrenamiento están relacionadas, así que en una combinada cada selección de entrenamiento extra baja la cuota total un 15%. Solo una selección por tipo de objetivo, y no dos que se ganarían con el mismo entrenamiento.',
    'Bet on today, this week, next week, this month or next month. Next week is open for bets until Sunday night, and next month until the end of this month. A bet pays out as soon as all its picks are done, and is lost when a pick runs out of time.': 'Apuesta a hoy, esta semana, la semana que viene, este mes o el mes que viene. La semana que viene admite apuestas hasta el domingo por la noche, y el mes que viene hasta final de este mes. La apuesta se paga en cuanto se cumplen todas sus selecciones y se pierde si a una se le acaba el tiempo.',
    'Next week': 'Semana que viene', 'This month': 'Este mes', 'Next month': 'Mes que viene', 'Ends at midnight.': 'Acaba a medianoche.', 'Nothing to bet on here right now.': 'Ahora mismo no hay nada a lo que apostar aquí.',
    'You can bet on it until Sunday night.': 'Puedes apostar hasta el domingo por la noche.', 'You can bet on it until the end of this month.': 'Puedes apostar hasta final de este mes.',
    'Odds come from your last four weeks: goals you rarely reach pay more, easy ones pay {n} (you only get your coins back), training once a week or month never pays, and weeks and months pay much less than a single day. Stakes go from {n} to {n} coins, with up to {n} open bets. Only game coins, never real money.': 'Las cuotas salen de tus últimas cuatro semanas: lo que consigues pocas veces paga más, lo fácil paga {n} (solo recuperas tus monedas), entrenar una vez a la semana o al mes nunca paga, y las semanas y los meses pagan mucho menos que un solo día. Se apuesta de {n} a {n} monedas, con hasta {n} apuestas abiertas. Solo monedas del juego, nunca dinero real.',
    'Tick Repeat to renew a bet on its own every day, week or month. Stop it from My bets whenever you like.': 'Marca Repetir para que la apuesta se renueve sola cada día, semana o mes. Puedes pararla en Mis apuestas cuando quieras.',
    'Repeat every day': 'Repetir cada día', 'Repeat every week': 'Repetir cada semana', 'Repeat every month': 'Repetir cada mes',
    'Repeats every day': 'Se repite cada día', 'Repeats every week': 'Se repite cada semana', 'Repeats every month': 'Se repite cada mes', Stop: 'Parar',
    'When it ends, the same bet is placed for the next day with the same stake.': 'Cuando acabe, se hará la misma apuesta para el día siguiente con la misma cantidad.',
    'When it ends, the same bet is placed for the next week with the same stake.': 'Cuando acabe, se hará la misma apuesta para la semana siguiente con la misma cantidad.',
    'When it ends, the same bet is placed for the next month with the same stake.': 'Cuando acabe, se hará la misma apuesta para el mes siguiente con la misma cantidad.',
    'Only bets whose picks are all daily, all weekly or all monthly can repeat.': 'Solo se pueden repetir las apuestas cuyas selecciones son todas diarias, todas semanales o todas mensuales.',
    'Bet repeated for the next day': 'Apuesta repetida para mañana', 'Bet repeated for the next week': 'Apuesta repetida para la semana siguiente', 'Bet repeated for the next month': 'Apuesta repetida para el mes siguiente',
    'Not enough coins to repeat your bet. It stopped repeating.': 'No tienes monedas para repetir tu apuesta. Ha dejado de repetirse.', 'It will not repeat.': 'Ya no se repetirá.',
    'Train tomorrow': 'Entrenar mañana', 'Clear a dungeon tomorrow': 'Superar una mazmorra mañana', 'Log 20 sets tomorrow': 'Hacer 20 series mañana', 'Hit your water goal tomorrow': 'Llegar a tu meta de agua mañana', 'Claim all daily quests tomorrow': 'Reclamar todas las misiones diarias mañana',
    'Single bet': 'Apuesta simple', 'Combined bet · {n} picks': 'Combinada · {n} selecciones', 'Clear slip': 'Vaciar boleto', 'Related training picks: odds ×{n}': 'Selecciones de entrenamiento relacionadas: cuota ×{n}',
    'Total odds': 'Cuota total', Stake: 'Apuesta', Max: 'Máx.', 'Possible win': 'Ganancia posible', 'Place bet · {n} coins': 'Apostar · {n} monedas',
    'You need at least {n} coins.': 'Necesitas al menos {n} monedas.', 'You can have {n} open bets at a time.': 'Puedes tener {n} apuestas abiertas a la vez.',
    'Pick one goal for a single bet, or several for a combined bet.': 'Elige un objetivo para una apuesta simple, o varios para una combinada.',
    Today: 'Hoy', 'This week': 'Esta semana', 'My bets': 'Mis apuestas', 'No open bets.': 'No tienes apuestas abiertas.', 'Nothing left to bet on today. Well done!': 'Hoy ya no queda nada a lo que apostar. ¡Bien hecho!',
    'Finished bets · won {n}, lost {n}': 'Apuestas terminadas · ganadas {n}, perdidas {n}', 'Balance from bets: {n} coins': 'Balance de apuestas: {n} monedas',
    Won: 'Ganado', Pays: 'Paga', Lost: 'Perdida', '{n}/{n} so far': '{n}/{n} por ahora',
    'Train today': 'Entrenar hoy', 'Clear a dungeon today': 'Superar una mazmorra hoy', 'Log 20 sets today': 'Hacer 20 series hoy', 'Hit your water goal today': 'Llegar a tu meta de agua hoy', 'Claim all daily quests today': 'Reclamar todas las misiones diarias hoy',
    'Train once this week': 'Entrenar una vez esta semana', 'Train {n} times this week': 'Entrenar {n} veces esta semana', 'Clear a dungeon this week': 'Superar una mazmorra esta semana', 'Clear {n} dungeons this week': 'Superar {n} mazmorras esta semana',
    'Train {n} minutes this week': 'Entrenar {n} minutos esta semana', 'Set a new record this week': 'Batir un récord esta semana', 'Hit your water goal on {n} days': 'Llegar a tu meta de agua {n} días',
    'One workout would win both picks, so they cannot be combined.': 'Un solo entrenamiento ganaría las dos selecciones, así que no se pueden combinar.', 'Up to {n} picks per bet.': 'Hasta {n} selecciones por apuesta.', 'Not enough coins.': 'No tienes suficientes monedas.', 'Some picks are no longer available.': 'Algunas selecciones ya no están disponibles.',
    'Combined bet placed': 'Combinada hecha', 'Bet placed': 'Apuesta hecha', 'Bet won: {n} coins': 'Apuesta ganada: {n} monedas', 'Bet lost': 'Apuesta perdida',
    '{n} open bet · {n} pick to go': '{n} apuesta abierta · falta {n} selección', '{n} open bets · {n} picks to go': '{n} apuestas abiertas · faltan {n} selecciones',
    '{n} open bet · {n} picks to go': '{n} apuesta abierta · faltan {n} selecciones', '{n} open bets · {n} pick to go': '{n} apuestas abiertas · falta {n} selección',
    'Bet on Yourself': 'Apuesta por ti', 'Win a bet': 'Gana una apuesta', 'Combo King': 'Rey de la combinada', 'Win a combined bet with 3 or more picks': 'Gana una combinada de 3 o más selecciones',
  });
  const GRP_ES = { legs: 'piernas', chest: 'pecho', back: 'espalda', shoulders: 'hombros', arms: 'brazos', core: 'core' };
  i18nAdd({ 'Muscle combo: {n} muscles ×{n}': 'Combo de músculos: {n} músculos ×{n}',
    'Each muscle pays {n} alone, a bit more if you rarely train it. Combine them: {n} muscles ×{n}, {n} ×{n}, {n} ×{n}, {n} ×{n}, all {n} ×{n}.': 'Cada músculo paga {n} solo, algo más si lo entrenas poco. Combínalos: {n} músculos ×{n}, {n} ×{n}, {n} ×{n}, {n} ×{n}, los {n} ×{n}.',
    'Muscle picks pay {n} alone, because you will train something, and a bit more for muscles you rarely train. Combine several muscles of the same day, week or month to raise the odds: today {n} muscles ×{n} up to all {n} ×{n}, a week up to ×{n}, a month up to ×{n}.': 'Los músculos pagan {n} solos, porque algo vas a entrenar, y algo más los que entrenas poco. Combina varios del mismo día, semana o mes para subir la cuota: hoy {n} músculos ×{n} hasta los {n} ×{n}, en una semana hasta ×{n} y en un mes hasta ×{n}.' });
  i18nAdd({ Training: 'Entrenamiento', Muscles: 'Músculos', Health: 'Salud', Game: 'Juego',
    'Train 45 minutes or more today': 'Entrenar 45 minutos o más hoy', 'Train 45 minutes or more tomorrow': 'Entrenar 45 minutos o más mañana',
    'Log your weight today': 'Registrar tu peso hoy', 'Log your weight tomorrow': 'Registrar tu peso mañana',
    'Have a perfect nutrition day today': 'Tener un día de nutrición perfecto hoy', 'Have a perfect nutrition day tomorrow': 'Tener un día de nutrición perfecto mañana',
    'Train, hit your water goal and sleep 7 h today': 'Entrenar, llegar a tu meta de agua y dormir 7 h hoy', 'Train, hit your water goal and sleep 7 h tomorrow': 'Entrenar, llegar a tu meta de agua y dormir 7 h mañana',
    'Lift {n} kg today': 'Levantar {n} kg hoy', 'Lift {n} kg tomorrow': 'Levantar {n} kg mañana',
    ...Object.fromEntries(Object.entries(GRP_ES).flatMap(([g, ge]) => [[`Train ${g} today`, `Entrenar ${ge} hoy`], [`Train ${g} tomorrow`, `Entrenar ${ge} mañana`]])) });
  const SUF = { 'this week': 'esta semana', 'next week': 'la semana que viene', 'this month': 'este mes', 'next month': 'el mes que viene' };
  for (const [en, es] of Object.entries(SUF)) i18nAdd({
    [`Train once ${en}`]: `Entrenar una vez ${es}`, [`Train {n} times ${en}`]: `Entrenar {n} veces ${es}`, [`Clear a dungeon ${en}`]: `Superar una mazmorra ${es}`,
    [`Clear {n} dungeons ${en}`]: `Superar {n} mazmorras ${es}`, [`Train {n} minutes ${en}`]: `Entrenar {n} minutos ${es}`, [`Set a new record ${en}`]: `Batir un récord ${es}`,
    [`Hit your water goal on {n} days ${en}`]: `Llegar a tu meta de agua {n} días ${es}`,
    [`Log {n} sets ${en}`]: `Hacer {n} series ${es}`, [`Earn {n} XP ${en}`]: `Ganar {n} XP ${es}`, [`Defeat the weekly boss ${en}`]: `Derrotar al jefe semanal ${es}`,
    [`Win your Academy match ${en}`]: `Ganar tu partido de la Academia ${es}`, [`Don't lose your Academy match ${en}`]: `No perder tu partido de la Academia ${es}`,
    [`Reach a {n}-day training streak ${en}`]: `Llegar a una racha de {n} días entrenando ${es}`, [`Reach level {n} ${en}`]: `Llegar al nivel {n} ${es}`,
    [`Eat {n} planned meals ${en}`]: `Comer {n} comidas del plan ${es}`, [`Train on {n} different days ${en}`]: `Entrenar {n} días distintos ${es}`,
    [`Lift {n} kg in total ${en}`]: `Levantar {n} kg en total ${es}`, [`Do {n} reps ${en}`]: `Hacer {n} repeticiones ${es}`, [`Do {n} different exercises ${en}`]: `Hacer {n} ejercicios distintos ${es}`,
    [`Do a workout of {n} minutes or more ${en}`]: `Hacer un entrenamiento de {n} minutos o más ${es}`, [`Train in the morning (before {n}h) ${en}`]: `Entrenar por la mañana (antes de las {n}h) ${es}`,
    [`Train at night (from {n}h) ${en}`]: `Entrenar de noche (desde las {n}h) ${es}`, [`Train on Saturday and Sunday ${en}`]: `Entrenar el sábado y el domingo ${es}`,
    [`Do {n} Academy drills ${en}`]: `Hacer {n} ejercicios de la Academia ${es}`, [`Raise your OVR by {n} ${en}`]: `Subir tu media (OVR) {n} ${es}`,
    [`Log your weight ${en}`]: `Registrar tu peso ${es}`, [`Log your weight {n} times ${en}`]: `Registrar tu peso {n} veces ${es}`, [`Lose {n} kg ${en}`]: `Bajar {n} kg ${es}`, [`Gain {n} kg ${en}`]: `Subir {n} kg ${es}`,
    [`Sleep {n} h or more on {n} nights ${en}`]: `Dormir {n} h o más {n} noches ${es}`, [`Claim all daily quests on {n} days ${en}`]: `Reclamar todas las misiones diarias {n} días ${es}`,
    [`Sleep {n} h or more one night ${en}`]: `Dormir {n} h o más una noche ${es}`, [`Claim all daily quests on one day ${en}`]: `Reclamar todas las misiones diarias un día ${es}`, [`Have a perfect nutrition day ${en}`]: `Tener un día de nutrición perfecto ${es}`, [`Unlock a new badge ${en}`]: `Desbloquear una insignia nueva ${es}`,
    ...Object.fromEntries(Object.entries(GRP_ES).flatMap(([g, ge]) => [[`Train ${g} once ${en}`, `Entrenar ${ge} una vez ${es}`], [`Train ${g} {n} times ${en}`, `Entrenar ${ge} {n} veces ${es}`]])), [`Hit your water goal once ${en}`]: `Llegar a tu meta de agua un día ${es}`,
  });
  i18nAdd({ 'Set a new record today': 'Batir un récord hoy', 'Set a new record tomorrow': 'Batir un récord mañana', 'Log 7 hours of sleep or more today': 'Registrar 7 horas de sueño o más hoy',
    'Log 7 hours of sleep or more tomorrow': 'Registrar 7 horas de sueño o más mañana', 'Eat 3 planned meals today': 'Comer 3 comidas del plan hoy', 'Eat 3 planned meals tomorrow': 'Comer 3 comidas del plan mañana',
    'Earn 300 XP today': 'Ganar 300 XP hoy', 'Earn 300 XP tomorrow': 'Ganar 300 XP mañana' });
  i18nPat(/^Clear (.+) \(dungeon of the day\)$/, a => `Superar ${tr(a)} (mazmorra del día)`);
  i18nPat(/^Ends (.+)\.$/, a => `Acaba el ${a}.`);
  i18nPat(/^From (.+) to (.+?)\. (.+)$/, (a, b, c) => `Del ${a} al ${b}. ${tr(c)}`);
}
