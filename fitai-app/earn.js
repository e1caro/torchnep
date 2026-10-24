'use strict';
// More ways to earn XP and coins: water, sleep, daily spin, weekly quests, perfect nutrition day.
// Runs after game.js and meals.js and shares their globals.

const waterGoal = () => clamp(Math.ceil(analyze({ ...S.profile, weight: curWeight() }).water * 4), 6, 14); // glasses of 250 ml
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
function wkState() {
  if (G.wk?.id !== weekId()) { G.wk = { id: weekId(), waterDays: 0, claimed: [] }; commit(); }
  return G.wk;
}

// ---------- weekly quests ----------
const mealsEaten = () => M.plan?.week === weekId() ? M.plan.days.reduce((s, d) => s + d.items.filter(i => i.eaten).length, 0) : 0;
const WQ = [
  { id: 'w-train', t: 'Train 4 times this week', ico: '🏋️', n: 4, v: () => S.history.filter(h => h.t >= weekStart()).length, xp: 200, coins: 60 },
  { id: 'w-dungeon', t: 'Clear 2 dungeons', ico: '🏰', n: 2, v: () => S.history.filter(h => h.t >= weekStart() && h.dungeon).length, xp: 250, coins: 80, chest: 'wood', need: () => lvl() >= 2 },
  { id: 'w-meals', t: 'Eat 15 planned meals', ico: '🍽️', n: 15, v: mealsEaten, xp: 200, coins: 60, need: () => !!M.set },
  { id: 'w-water', t: 'Hit your water goal on 4 days', ico: '💧', n: 4, v: () => wkState().waterDays, xp: 150, coins: 50 },
  { id: 'w-weigh', t: 'Log your weight twice', ico: '⚖️', n: 2, v: () => S.weights.filter(x => x.t >= weekStart()).length, xp: 100, coins: 30 },
];
window.claimWeekly = id => {
  const q = WQ.find(x => x.id === id), w = wkState();
  if (w.claimed.includes(id) || q.v() < q.n) return;
  w.claimed.push(id); if (q.chest) G.chests.push(q.chest);
  award(q.xp, q.coins); sfx('claim'); checkAch(); flushLevelUp(earn);
};

// ---------- water and sleep ----------
window.addWater = d => {
  ensureDay(); const t = G.today, goal = waterGoal();
  t.water = Math.max(0, (t.water || 0) + d);
  if (d > 0 && t.water > (t.waterXp || 0) && t.water <= goal) { t.waterXp = t.water; award(3, 0); }
  if (t.water >= goal && !t.waterGoal) {
    t.waterGoal = 1; G.waterGoalDays++; wkState().waterDays++; award(20, 5); toast('Water goal reached: +20 XP'); checkAch();
  }
  commit(); sfx('tick'); flushLevelUp(earn);
};
window.logSleep = h => {
  ensureDay(); const t = G.today;
  if (!t.sleepDone) { t.sleepDone = 1; if (h >= 7) { G.sleepGood++; award(20, 5); toast('Well rested: +20 XP'); } else { award(5, 0); toast('Logged: +5 XP'); } checkAch(); }
  t.sleep = h; commit(); flushLevelUp(earn);
};

// ---------- daily spin ----------
const SPIN = [[30, 'coins', 20], [25, 'coins', 50], [8, 'coins', 100], [20, 'xp', 40], [10, 'xp', 100], [6, 'chest', 'wood'], [1, 'chest', 'silver']];
window.spin = () => {
  if (G.spun === dayId()) return;
  let r = Math.random() * 100, pick = SPIN[0];
  for (const s of SPIN) { if (r < s[0]) { pick = s; break; } r -= s[0]; }
  G.spun = dayId(); G.spins++;
  const [, kind, v] = pick;
  let html;
  if (kind === 'coins') { G.coins += v; html = `<div class="avbig">🪙</div><h2>${v} coins</h2>`; }
  else if (kind === 'xp') { award(v, 0); html = `<div class="avbig">✨</div><h2>${v} XP</h2>`; }
  else { G.chests.push(v); html = `<div class="avbig">${CHEST[v][1]}</div><h2>${CHEST[v][0]}</h2>`; }
  commit();
  modal(`<div class="chest">🎰</div><div class="mut">Daily spin</div><div class="reveal">${html}<button class="btn" data-close>Nice</button></div>`, () => { checkAch(); flushLevelUp(earn); });
  setTimeout(() => { sfx('claim'); confetti(); }, 900);
};

// ---------- perfect nutrition day (called from meals.js) ----------
window.checkPerfect = di => {
  if (di !== todayIdx() || !M.plan) return;
  ensureDay(); const d = M.plan.days[di], t = dayTotals(d), goal = target().kcal;
  if (G.today.perfect || !d.items.every(i => i.eaten) || t.eat < goal * .9 || t.eat > goal * 1.1) return;
  G.today.perfect = 1; G.perfectDays++; award(40, 10); toast('Perfect nutrition day: +40 XP'); checkAch();
};

// ---------- screen ----------
function earn() {
  if (needProfile()) return;
  ensureDay(); flushLevelUp();
  const t = G.today, goal = waterGoal(), w = wkState(), canSpin = G.spun !== dayId();
  const wq = WQ.filter(q => !q.need || q.need());
  view.innerHTML = `${hud()}<h1>Ways to earn</h1>
  <section class="card"><div class="row between"><h3>Daily spin</h3><span class="mut">${canSpin ? 'Ready' : 'Come back tomorrow'}</span></div>
  <p class="mut">One free spin a day: coins, XP or even a chest.</p>
  <button class="btn ${canSpin ? 'chestbtn' : 'ghost'}" ${canSpin ? '' : 'disabled'} onclick="spin()">🎰 ${canSpin ? 'Spin now' : 'Spun today'}</button></section>
  <section class="card"><div class="row between"><h3>Water</h3><span class="mut">${t.water || 0}/${goal} glasses</span></div>
  <div class="qbar kc"><i style="width:${clamp((t.water || 0) / goal * 100, 0, 100)}%"></i></div>
  <p class="mut">+3 XP per glass (250 ml), +20 XP when you hit your goal.</p>
  <div class="row"><button class="btn ghost" onclick="addWater(-1)">−</button><button class="btn" onclick="addWater(1)">💧 Add a glass</button></div></section>
  <section class="card"><div class="row between"><h3>Sleep</h3><span class="mut">${t.sleep ? t.sleep + ' h logged' : 'Not logged'}</span></div>
  <p class="mut">How long did you sleep last night? 7 hours or more earns +20 XP.</p>
  <div class="chips">${[5, 6, 7, 8, 9].map(h => `<button class="chip ${t.sleep === h ? 'on' : ''}" onclick="logSleep(${h})">${h} h${h === 9 ? '+' : ''}</button>`).join('')}</div></section>
  <h2 class="sec">Weekly quests</h2>
  ${wq.map(q => { const v = Math.min(q.n, q.v()), ok = v >= q.n, cl = w.claimed.includes(q.id);
    return `<div class="quest ${cl ? 'cl' : ok ? 'ok' : ''}"><div class="qi">${q.ico}</div><div class="grow"><div class="qt">${q.t}</div><div class="qbar"><i style="width:${v / q.n * 100}%"></i></div>
    <div class="mut">${v}/${q.n} · +${q.xp} XP · 🪙${q.coins}${q.chest ? ' · chest' : ''}</div></div>${cl ? '<span class="chk">✓</span>' : ok ? `<button class="btn sm" onclick="claimWeekly('${q.id}')">Claim</button>` : ''}</div>`; }).join('')}
  <h2 class="sec">Everything that pays</h2>
  <div class="card earnlist">
    ${[['🏋️', 'Every set', '10 XP'], ['⚔️', 'Workout cleared', '100 XP, + chest for dungeons'], ['🏆', 'New personal record', '40 XP each'], ['🔥', 'Training streak', 'up to ×1.5 XP'],
      ['🏰', 'Dungeons', '×1.3 to ×3.5 XP, dungeon of the day ×1.5'], ['📜', 'Daily quests', '25 to 100 XP each, bonus chest for all three'], ['🗓️', 'Weekly quests', '100 to 250 XP + coins'],
      ['🗿', 'Weekly boss', '250 XP + silver chest'], ['🍽️', 'Meals eaten', '15 XP each, perfect day +40 XP'], ['💧', 'Water', '3 XP a glass, +20 at your goal'], ['😴', 'Sleep 7 h+', '20 XP'],
      ['⚖️', 'Weigh-in', '15 XP'], ['🎁', 'Daily check-in', 'up to 22 XP and 45 coins, silver chest on day 7'], ['🎰', 'Daily spin', 'coins, XP or a chest'], ['🏅', 'Badges', '50 to 600 XP'], ['⬆️', 'Level-ups', 'coins, and a chest every 5th level']]
      .map(([i, a, b]) => `<div class="row between"><span>${i} ${a}</span><b class="mut">${b}</b></div>`).join('')}
  </div>`;
}

// ---------- hooks ----------
const _home3 = home;
home = function () {
  _home3();
  const boss = [...view.querySelectorAll('h2.sec')].find(h => h.textContent === 'Weekly boss');
  if (boss) boss.insertAdjacentHTML('beforebegin', `<button class="btn ghost" onclick="location.hash='#/earn'">⚡ More ways to earn${G.spun !== dayId() ? ' · 🎰 spin ready' : ''}</button>`);
};
Object.assign(routes, { home, earn });
