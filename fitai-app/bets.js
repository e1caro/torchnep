'use strict';
// Bets: stake coins on your own goals (train today, clear dungeons, hit your water goal...).
// Pick one goal for a single bet, or 2 to 5 for a combined bet whose odds multiply; every pick must come true.
// Odds come from your own recent training, so a goal you rarely reach pays more. Coins only, never real money.

const BT = (G.bets = Object.assign({ open: [], done: [], won: 0, lost: 0, net: 0, best: 0 }, G.bets || {}));
let slip = [], stake = 25;
const BET_MIN = 5, BET_MAX = 300, BET_OPEN = 8, LEGS_MAX = 5;
let betTab = 'today';

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
const PER_TABS = [['today', 'Today'], ['week', 'This week'], ['nweek', 'Next week'], ['month', 'This month'], ['nmonth', 'Next month']];

// ---------- your recent form (drives the odds) ----------
function form() {
  const since = Date.now() - 28 * DAY, recent = S.history.filter(h => h.t >= since);
  const known = S.history.length >= 3;
  const perWeek = known ? Math.max(.5, recent.length / 4) : Math.max(1, (S.profile?.days || 3) * .6);
  const dgPerWeek = known ? Math.max(.25, recent.filter(h => h.dungeon).length / 4) : .4;
  const mins = S.history.length ? S.history.reduce((a, h) => a + (h.dur || 0), 0) / S.history.length : 45;
  return { perWeek, dgPerWeek, mins: Math.max(15, mins) };
}
// chance of at least k events when lambda are expected
const atLeast = (k, lam) => { if (k <= 0) return 1; let p = 0, t = Math.exp(-lam); for (let i = 0; i < k; i++) { p += t; t *= lam / (i + 1); } return Math.max(0, 1 - p); };
const binomAtLeast = (k, n, q) => { if (k <= 0) return 1; if (k > n) return 0; let p = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); p += c * q ** i * (1 - q) ** (n - i); } return p; };
const oddsOf = p => Math.min(15, Math.max(1.1, Math.round(.9 / Math.max(p, .01) * 20) / 20));
const uniq = a => [...new Set(a)];

// ---------- what counts ----------
const inWin = (h, a, b) => h.t >= a && h.t <= b;
const trainsIn = (a, b) => S.history.filter(h => inWin(h, a, b)).length;
const dgIn = (a, b) => S.history.filter(h => inWin(h, a, b) && h.dungeon).length;
const minsIn = (a, b) => S.history.filter(h => inWin(h, a, b)).reduce((s, h) => s + (h.dur || 0), 0);
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

const label = (kind, n, suf) => ({
  train: n === 1 ? `Train once ${suf}` : `Train ${n} times ${suf}`,
  dg: n === 1 ? `Clear a dungeon ${suf}` : `Clear ${n} dungeons ${suf}`,
  min: `Train ${n} minutes ${suf}`, pr: `Set a new record ${suf}`, water: n === 1 ? `Hit your water goal once ${suf}` : `Hit your water goal on ${n} days ${suf}`,
})[kind];

// Markets. g: group (one pick per group in a bet). topic: related topics get an odds cut in combined bets.
// one: a single workout could finish it (two such picks cannot be combined). tab: which period it is shown under.
function markets() {
  const f = form(), ds = dayStart(), de = dayEnd(), out = [], add = m => out.push(m);
  // today
  const tab = 'today', from = ds, to = de;
  if (!trainsIn(ds, de)) add({ id: 'd-train', kind: 'd-train', g: 'today', topic: 'train', t: 'Train today', ico: 'lifter', tab, from, to, p: Math.min(.85, Math.max(.12, f.perWeek / 7 * 1.15)) });
  if (dungeonsOpen() && !dgIn(ds, de)) add({ id: 'd-dg', kind: 'd-dg', g: 'today', topic: 'train', t: 'Clear a dungeon today', ico: 'gate', tab, from, to, p: Math.min(.6, Math.max(.06, f.dgPerWeek / 7 * 1.3)) });
  if (setsIn(ds, de) < 20) add({ id: 'd-sets', kind: 'd-sets', g: 'today', topic: 'train', t: 'Log 20 sets today', ico: 'swords', tab, from, to, need: 20, prog: setsIn(ds, de), p: Math.min(.7, Math.max(.08, f.perWeek / 7 * .7)) });
  if (!waterToday()) add({ id: 'd-water', kind: 'd-water', g: 'water', topic: 'water', t: 'Hit your water goal today', ico: 'water', tab, from, to, p: .55 });
  if (!questsAllDone()) add({ id: 'd-quests', kind: 'd-quests', g: 'quests', topic: 'quests', t: 'Claim all daily quests today', ico: 'scroll', tab, from, to, p: .4 });
  // weeks and months
  for (const P of periods()) {
    const start = P.live ? Date.now() : P.from, days = Math.max(1, Math.ceil((P.to - start) / DAY)), wks = days / 7;
    const lam = f.perWeek * wks, lamDg = f.dgPerWeek * wks, base = { tab: P.k, from: P.from, to: P.to };
    const mk = (kind, n, prog, p, extra) => add({ ...base, id: `${P.k}:${kind}${n}`, kind, n, g: P.k + kind, topic: kind === 'water' ? 'water' : 'train', t: label(kind, n, P.suf), need: n, prog, p, show: P.live, ...extra });
    const tw = P.live ? trainsIn(P.from, P.to) : 0;
    for (const n of uniq([1, Math.round(lam * .7), Math.round(lam), Math.round(lam * 1.3) + 1].map(r => tw + Math.max(1, r))).filter(n => n - tw <= days).slice(-3)) {
      mk('train', n, tw, atLeast(n - tw, lam), { ico: 'flame', one: P.live && n - tw === 1 });
    }
    if (dungeonsOpen()) {
      const dw = P.live ? dgIn(P.from, P.to) : 0;
      for (const n of uniq([1, Math.round(lamDg), Math.round(lamDg * 1.5) + 1].map(r => dw + Math.max(1, r))).filter(n => n - dw <= days).slice(-2)) {
        mk('dg', n, dw, atLeast(n - dw, lamDg), { ico: 'minotaur', one: P.live && n - dw === 1 });
      }
    }
    const mw = P.live ? minsIn(P.from, P.to) : 0, em = lam * f.mins;
    const wkEq = n => Math.ceil((n - mw) / f.mins); // workouts still needed
    for (const n of uniq([.7, 1, 1.3].map(k => mw + Math.max(60, Math.round(em * k / 30) * 30))).filter((n, i, a) => !i || wkEq(n) !== wkEq(a[i - 1]))) {
      mk('min', n, mw, atLeast(Math.ceil((n - mw) / f.mins), lam), { ico: 'stopwatch', one: P.live && n - mw <= f.mins });
    }
    if (S.history.length && !(P.live && prIn(P.from, P.to))) mk('pr', '', 0, Math.min(.85, .2 + .08 * lam), { ico: 'trophy', need: 0 });
    const wd = P.live ? waterIn(P.from, P.to) : 0, avail = days - (P.live && waterToday() ? 1 : 0);
    for (const n of uniq([.45, .65, .85].map(k => wd + Math.max(1, Math.round(avail * k)))).filter(n => n - wd <= avail)) {
      mk('water', n, wd, binomAtLeast(n - wd, avail, .55), { ico: 'water' });
    }
  }
  // goals with almost no chance left are not offered
  return out.filter(m => m.p >= .04).map(m => ({ ...m, o: oddsOf(m.p) }));
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
  return false;
}

// odds of a slip: picks multiply; each extra pick on a related topic (training) cuts the total by 15%
function slipOdds(legs) {
  const raw = legs.reduce((a, l) => a * l.o, 1);
  const byTopic = {}; legs.forEach(l => { byTopic[l.topic] = (byTopic[l.topic] || 0) + 1; });
  const related = Object.values(byTopic).reduce((a, n) => a + Math.max(0, n - 1), 0);
  return { raw, related, total: Math.max(1.1, Math.round(raw * .85 ** related * 100) / 100) };
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
      if (legDone(l)) { l.st = 'won'; changed = true; } else if (now > l.to) { l.st = 'lost'; changed = true; }
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
    changed = true;
  }
  if (changed) { commit(); checkAch(); }
  settling = false;
}

// ---------- actions ----------
window.betPick = id => {
  const m = markets().find(x => x.id === id); if (!m) return;
  const i = slip.findIndex(l => l.id === id);
  if (i >= 0) slip.splice(i, 1);
  else {
    // two training goals that a single workout could finish (today's goals, or weekly ones one workout away) would pay twice for one workout
    const solo = x => x.g === 'today' || x.one, clash = solo(m) ? slip.findIndex(l => solo(l) && l.g !== m.g) : -1;
    if (clash >= 0) { slip.splice(clash, 1); toast('One workout would win both picks, so they cannot be combined.'); }
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
  const bet = { id: 'b' + now.toString(36), t: now, stake, odds: so.total, legs: legs.map(m => ({ id: m.id, kind: m.kind, t: m.t, ico: m.ico, o: m.o, need: m.need, topic: m.topic, from: m.from, to: m.to, day: dayId() })) };
  G.coins -= stake; BT.open.push(bet); BT.placed = (BT.placed || 0) + 1; commit();
  slip = []; sfx('claim'); toast(legs.length > 1 ? 'Combined bet placed' : 'Bet placed');
  settleBets(); betsView();
};

// ---------- screen ----------
const legIcon = st => st === 'won' ? '<span class="lg ok">✓</span>' : st === 'lost' ? '<span class="lg ko">✗</span>' : '<span class="lg">…</span>';
function betCard(b) {
  const pay = Math.round(b.stake * b.odds);
  return `<section class="card bet ${b.res || 'open'}"><div class="row between"><b>${b.legs.length > 1 ? `Combined bet · ${b.legs.length} picks` : 'Single bet'}</b><span class="odd">${b.odds.toFixed(2)}</span></div>
    ${b.legs.map(l => `<div class="row betleg">${legIcon(l.st)}<span class="grow">${l.t}</span><span class="mut">${l.o.toFixed(2)}</span></div>`).join('')}
    <div class="row between mut"><span>Stake ${gi('coin', 'cn')} ${b.stake}</span><span>${b.res === 'won' ? `Won ${gi('coin', 'cn')} ${pay}` : b.res === 'lost' ? 'Lost' : `Pays ${gi('coin', 'cn')} ${pay}`}</span></div></section>`;
}
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
    <li>Odds come from your last four weeks: goals you rarely reach pay more. Stakes go from ${BET_MIN} to ${BET_MAX} coins, with up to ${BET_OPEN} open bets. Only game coins, never real money.</li></ol></details>
  ${slip.length ? `<section class="card slip"><div class="row between"><h3>${slip.length > 1 ? `Combined bet · ${slip.length} picks` : 'Single bet'}</h3><button class="icon" aria-label="Clear slip" onclick="betClear()">${ic('close', 18)}</button></div>
    ${slip.map(l => `<div class="row betleg"><span class="grow">${l.t}</span><span class="mut">${l.o.toFixed(2)}</span></div>`).join('')}
    ${so.related ? `<div class="mut">Related training picks: odds ×${(.85 ** so.related).toFixed(2)}</div>` : ''}
    <div class="row between"><span>Total odds</span><span class="odd big">${so.total.toFixed(2)}</span></div>
    <div class="lbl">Stake</div><div class="chips">${[10, 25, 50, 100, 200].filter(v => v <= maxStake).map(v => `<button class="chip ${stake === v ? 'on' : ''}" onclick="betStake(${v})">${v}</button>`).join('')}${maxStake >= BET_MIN ? `<button class="chip ${stake === maxStake ? 'on' : ''}" onclick="betStake(${maxStake})">Max</button>` : ''}</div>
    <div class="row between pay"><span>Possible win</span><b>${gi('coin', 'cn')} ${Math.round(stake * so.total)}</b></div>
    <button class="btn chestbtn" ${G.coins >= stake && G.coins >= BET_MIN && BT.open.length < BET_OPEN ? '' : 'disabled'} onclick="placeBet()">${gi('ticket')} Place bet · ${stake} coins</button>
    ${G.coins < BET_MIN ? `<div class="mut">You need at least ${BET_MIN} coins.</div>` : BT.open.length >= BET_OPEN ? `<div class="mut">You can have ${BET_OPEN} open bets at a time.</div>` : ''}</section>`
    : `<p class="mut">Pick one goal for a single bet, or several for a combined bet.</p>`}
  <div class="chips bettabs">${PER_TABS.map(([k, t]) => `<button class="chip ${betTab === k ? 'on' : ''}" onclick="betTabSet('${k}')">${t}</button>`).join('')}</div>
  <div class="mut">${note}</div>
  ${list.length ? list.map(row).join('') : `<p class="mut">${betTab === 'today' ? 'Nothing left to bet on today. Well done!' : 'Nothing to bet on here right now.'}</p>`}
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
const _betQuest = window.claimQuest;
window.claimQuest = id => { _betQuest(id); settleBets(); };
window.addEventListener('hashchange', () => settleBets());
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
settleBets(true);

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
    'Odds come from your last four weeks: goals you rarely reach pay more. Stakes go from {n} to {n} coins, with up to {n} open bets. Only game coins, never real money.': 'Las cuotas salen de tus últimas cuatro semanas: lo que consigues pocas veces paga más. Se apuesta de {n} a {n} monedas, con hasta {n} apuestas abiertas. Solo monedas del juego, nunca dinero real.',
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
  const SUF = { 'this week': 'esta semana', 'next week': 'la semana que viene', 'this month': 'este mes', 'next month': 'el mes que viene' };
  for (const [en, es] of Object.entries(SUF)) i18nAdd({
    [`Train once ${en}`]: `Entrenar una vez ${es}`, [`Train {n} times ${en}`]: `Entrenar {n} veces ${es}`, [`Clear a dungeon ${en}`]: `Superar una mazmorra ${es}`,
    [`Clear {n} dungeons ${en}`]: `Superar {n} mazmorras ${es}`, [`Train {n} minutes ${en}`]: `Entrenar {n} minutos ${es}`, [`Set a new record ${en}`]: `Batir un récord ${es}`,
    [`Hit your water goal on {n} days ${en}`]: `Llegar a tu meta de agua {n} días ${es}`, [`Hit your water goal once ${en}`]: `Llegar a tu meta de agua un día ${es}`,
  });
  i18nPat(/^Ends (.+)\.$/, a => `Acaba el ${a}.`);
  i18nPat(/^From (.+) to (.+?)\. (.+)$/, (a, b, c) => `Del ${a} al ${b}. ${tr(c)}`);
}
