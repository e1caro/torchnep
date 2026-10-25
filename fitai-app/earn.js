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
  { id: 'w-train', t: 'Train 4 times this week', ico: 'lifter', n: 4, v: () => S.history.filter(h => h.t >= weekStart()).length, xp: 200, coins: 60 },
  { id: 'w-dungeon', t: 'Clear 2 dungeons', ico: 'gate', n: 2, v: () => S.history.filter(h => h.t >= weekStart() && h.dungeon).length, xp: 250, coins: 80, chest: 'wood', need: () => lvl() >= 2 },
  { id: 'w-meals', t: 'Eat 15 planned meals', ico: 'cutlery', n: 15, v: mealsEaten, xp: 200, coins: 60, need: () => !!M.set },
  { id: 'w-water', t: 'Hit your water goal on 4 days', ico: 'water', n: 4, v: () => wkState().waterDays, xp: 150, coins: 50 },
  { id: 'w-weigh', t: 'Log your weight twice', ico: 'scale', n: 2, v: () => S.weights.filter(x => x.t >= weekStart()).length, xp: 100, coins: 30 },
];
window.claimWeekly = id => {
  const q = WQ.find(x => x.id === id), w = wkState();
  if (w.claimed.includes(id) || q.v() < q.n) return;
  w.claimed.push(id); if (q.chest) G.chests.push(q.chest);
  award(0, q.coins + coinsFor(q.xp)); sfx('claim'); checkAch(); flushLevelUp(earn);
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
const SPIN = [[30, 'coins', 20], [25, 'coins', 50], [8, 'coins', 100], [20, 'coins', 30], [10, 'coins', 75], [6, 'chest', 'wood'], [1, 'chest', 'silver']]; // coins and chests only: XP comes from looking after yourself
const spinsToday = () => G.spinDay?.d === dayId() ? G.spinDay.n : 0;
const freeSpins = () => (perk('spin3') ? 3 : perk('spin2') ? 2 : 1) - spinsToday();
const spinsLeft = () => Math.max(0, freeSpins()) + (G.extraSpins || 0);
// The wheel has 8 equal slices; the odds come from SPIN, and the wheel then lands on a slice with that prize.
const WHEEL = [['coins', 20], ['xp', 40], ['coins', 50], ['chest', 'wood'], ['coins', 20], ['xp', 100], ['coins', 100], ['chest', 'silver']];
const SLICE = 360 / WHEEL.length;
const wheelLabel = ([k, v]) => k === 'coins' ? `${gi('coin', 'cn')}<b>${v}</b>` : k === 'xp' ? `${gi('sparkles')}<b>${v} XP</b>` : `${gi(CHEST[v][1])}<b>${v === 'silver' ? '★★★' : 'Loot chest'}</b>`;
function wheelHtml() {
  const cols = ['var(--acc)', 'var(--card2)', 'var(--acc2)', 'var(--card2)'];
  const stops = WHEEL.map((w, i) => `${w[1] === 'silver' ? '#ffd34d' : cols[i % 4]} ${i * SLICE}deg ${(i + 1) * SLICE}deg`).join(',');
  return `<div class="wheelbox"><div class="wptr"></div><div class="wheel" id="wheel" style="background:conic-gradient(from ${-SLICE / 2}deg,${stops})">
    ${WHEEL.map((w, i) => `<div class="wl" style="transform:rotate(${i * SLICE}deg)"><span>${wheelLabel(w)}</span></div>`).join('')}
    <div class="whub">${gi('slot')}</div></div></div>`;
}

// ---------- spin sounds: drum roll, wheel clicks, cymbal and fanfare (Web Audio, no files) ----------
let NOISE;
function audio() {
  if (!G.sound) return null;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    if (!NOISE) { NOISE = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return AC;
  } catch { return null; }
}
function hit(t, { vol = .1, f = 1800, q = .8, type = 'bandpass', dur = .07 } = {}) {
  const src = AC.createBufferSource(), flt = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = NOISE; flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(AC.destination); src.start(t, Math.random() * .5); src.stop(t + dur + .02);
}
function tone(t, f, dur, vol = .06, type = 'triangle') {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + .02);
}
function drumRoll(sec) { // a snare roll that grows louder, ending in a big hit
  if (!audio()) return;
  const t0 = AC.currentTime + .02;
  for (let t = 0; t < sec; t += .045 + Math.random() * .01) hit(t0 + t, { vol: .03 + .11 * (t / sec) ** 2, f: 1700 + Math.random() * 400 });
  hit(t0 + sec, { vol: .35, f: 120, type: 'lowpass', q: 1, dur: .35 });
}
function wheelClick() { if (AC && G.sound) hit(AC.currentTime, { vol: .05, f: 3500, q: 4, dur: .02 }); }
function prizeSound(big) {
  if (!audio()) return;
  const t = AC.currentTime;
  hit(t, { vol: .25, f: 6000, type: 'highpass', q: .5, dur: big ? 2.2 : 1.4 }); // cymbal crash
  tone(t, 70, .5, .25, 'sine');
  [[523, 0], [659, .12], [784, .24], [1047, .36]].forEach(([f, d]) => tone(t + d, f, .35, .07));
  [523, 659, 784, 1047].forEach(f => tone(t + .5, f, big ? 1.4 : .9, .045));
  if (big) [1319, 1568, 2093].forEach((f, i) => tone(t + .9 + i * .1, f, .5, .04, 'square'));
}

let spinning = false;
window.spin = () => {
  if (spinning || spinsLeft() <= 0) return;
  if (freeSpins() > 0) G.spinDay = { d: dayId(), n: spinsToday() + 1 }; else G.extraSpins--;
  let r = Math.random() * 100, pick = SPIN[0];
  for (const s of SPIN) { if (r < s[0]) { pick = s; break; } r -= s[0]; }
  G.spun = dayId(); G.spins++;
  const [, kind, v] = pick;
  // the prize is saved before the animation, so closing the app mid-spin loses nothing
  let prize, amount = 0;
  if (kind === 'coins') { G.coins += v; amount = v; prize = `<div class="avbig">${gi('coin', 'cn')}</div><h2 id="cnt" data-u="coins">0 coins</h2>`; }
  else if (kind === 'xp') { award(v, 0); amount = v; prize = `<div class="avbig">${gi('sparkles', 'hero')}</div><h2 id="cnt" data-u="XP">0 XP</h2>`; }
  else { G.chests.push(v); prize = `<div class="avbig">${gi(CHEST[v][1])}</div><h2>${CHEST[v][0]}</h2><div class="mut">Open it on the Rewards screen.</div>`; }
  commit();
  const big = kind === 'chest' || v === 100;

  // land on a random slice holding this prize, a bit off-centre so it looks natural
  const slots = WHEEL.map((w, i) => w[0] === kind && w[1] === v ? i : -1).filter(i => i >= 0);
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const turns = calm ? 1 : 6, dur = calm ? 1200 : 4600;
  const target = turns * 360 + (360 - slot * SLICE) + (Math.random() - .5) * SLICE * .6;

  modal(`<div class="mut">Daily spin</div>${wheelHtml()}<div class="spinmsg mut" id="spinmsg">Spinning…</div>
    <div id="prize" class="prizebox" hidden>${big ? '<div class="rays"></div>' : ''}<div class="reveal2">${prize}</div></div>
    <div id="spinbtns" hidden><button class="btn" data-close>Nice</button>${spinsLeft() > 0 ? `<button class="btn ghost" onclick="spinAgain()">${gi('slot')} Spin again (${spinsLeft()})</button>` : ''}</div>`,
    () => { checkAch(); flushLevelUp(earn); });
  spinning = true;
  drumRoll(dur / 1000);
  const wheel = $('#wheel'), ease = x => 1 - Math.pow(1 - x, 4);
  let t0 = null, lastSlice = 0;
  const frame = now => {
    if (!wheel.isConnected) { spinning = false; return; }
    t0 = t0 ?? now;
    const x = Math.min(1, (now - t0) / dur), a = target * ease(x);
    wheel.style.transform = `rotate(${a}deg)`;
    const sl = Math.floor((a + SLICE / 2) / SLICE);
    if (sl !== lastSlice) { lastSlice = sl; wheelClick(); navigator.vibrate?.(5); }
    if (x < 1) requestAnimationFrame(frame); else land();
  };
  requestAnimationFrame(frame);

  function land() {
    spinning = false;
    $('#wheel').querySelectorAll('.wl')[slot].classList.add('win');
    $('.wheelbox').classList.add('landed');
    $('#spinmsg').textContent = big ? 'JACKPOT!' : 'You won!';
    $('#spinmsg').classList.toggle('jackpot', big);
    prizeSound(big); navigator.vibrate?.(big ? [80, 50, 80, 50, 200] : [40, 30, 90]);
    confetti(); if (big) setTimeout(confetti, 500);
    $('#prize').hidden = false;
    const c = $('#cnt');
    if (c) { const s0 = performance.now(), d = calm ? 1 : 900; const up = n => { const k = Math.min(1, (n - s0) / d); const t = `${Math.round(amount * ease(k))} ${c.dataset.u}`; c.textContent = typeof tr === 'function' ? tr(t) : t; if (k < 1) requestAnimationFrame(up); }; requestAnimationFrame(up); }
    setTimeout(() => { const b = $('#spinbtns'); if (b) b.hidden = false; }, calm ? 0 : 700);
  }
};
window.spinAgain = () => { checkAch(); spin(); };

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
  const t = G.today, goal = waterGoal(), w = wkState(), canSpin = spinsLeft() > 0;
  const wq = WQ.filter(q => !q.need || q.need());
  view.innerHTML = `${hud()}<h1>Ways to earn</h1>
  <section class="card"><div class="row between"><h3>Daily spin</h3><span class="mut">${canSpin ? `${spinsLeft()} spin${spinsLeft() > 1 ? 's' : ''} ready` : 'Come back tomorrow'}</span></div>
  <p class="mut">${perk('spin3') ? 'Three free spins a day' : perk('spin2') ? 'Two free spins a day' : 'One free spin a day'}: coins, XP or even a chest. More spins are sold in the Shop.</p>
  <button class="btn ${canSpin ? 'chestbtn' : 'ghost'}" ${canSpin ? '' : 'disabled'} onclick="spin()">${gi('slot')} ${canSpin ? 'Spin now' : 'Spun today'}</button></section>
  <section class="card"><div class="row between"><h3>Water</h3><span class="mut">${t.water || 0}/${goal} glasses</span></div>
  <div class="qbar kc"><i style="width:${clamp((t.water || 0) / goal * 100, 0, 100)}%"></i></div>
  <p class="mut">+3 XP per glass (250 ml), +20 XP when you hit your goal.</p>
  <div class="row"><button class="btn ghost" onclick="addWater(-1)">−</button><button class="btn" onclick="addWater(1)">${gi('water')} Add a glass</button></div></section>
  <section class="card"><div class="row between"><h3>Sleep</h3><span class="mut">${t.sleep ? t.sleep + ' h logged' : 'Not logged'}</span></div>
  <p class="mut">How long did you sleep last night? 7 hours or more earns +20 XP.</p>
  <div class="chips">${[5, 6, 7, 8, 9].map(h => `<button class="chip ${t.sleep === h ? 'on' : ''}" onclick="logSleep(${h})">${h} h${h === 9 ? '+' : ''}</button>`).join('')}</div></section>
  <h2 class="sec">Weekly quests</h2>
  ${wq.map(q => { const v = Math.min(q.n, q.v()), ok = v >= q.n, cl = w.claimed.includes(q.id);
    return `<div class="quest ${cl ? 'cl' : ok ? 'ok' : ''}"><div class="qi">${gi(q.ico)}</div><div class="grow"><div class="qt">${q.t}</div><div class="qbar"><i style="width:${v / q.n * 100}%"></i></div>
    <div class="mut">${v}/${q.n} · ${gi('coin', 'cn')} ${q.coins + coinsFor(q.xp)}${q.chest ? ' · chest' : ''}</div></div>${cl ? '<span class="chk">✓</span>' : ok ? `<button class="btn sm" onclick="claimWeekly('${q.id}')">Claim</button>` : ''}</div>`; }).join('')}
  <details class="card earnlist"><summary>Everything that pays</summary>
    ${[['lifter', 'Each exercise', 'up to 26 XP by its medal (stretches up to 5)'], ['swords', 'Workout cleared', '40 XP, + chest for dungeons'], ['trophy', 'New personal record', '20 XP each (40 with a level perk)'], ['flame', 'Training streak', 'up to ×1.5 XP'],
      ['gate', 'Dungeons', '×1.3 to ×3.5 XP, dungeon of the day ×1.5'], ['scroll', 'Daily quests', 'coins each, bonus chest for all of them'], ['calendar', 'Weekly quests', 'coins'],
      ['golem', 'Weekly boss', '160 coins + a chest'], ['cutlery', 'Meals eaten', '15 XP each, perfect day +40 XP'], ['water', 'Water', '3 XP a glass, +20 at your goal'], ['sleep', 'Sleep 7 h+', '20 XP'],
      ['scale', 'Weigh-in', '15 XP'], ['crate', 'Daily check-in', 'coins, silver chest on day 7'], ['slot', 'Daily spin', 'coins or a chest'], ['medal', 'Badges', 'coins'], ['upgrade', 'Level-ups', 'coins, a silver chest (golden every 5th), meals, workouts, perks and level-only looks']]
      .map(([i, a, b]) => `<div class="row between"><span>${gi(i, 'hero')} ${a}</span><b class="mut">${b}</b></div>`).join('')}
  </details>`;
}

// ---------- hooks ----------
const _home3 = home;
home = function () {
  _home3();
  const boss = [...view.querySelectorAll('h2.sec')].find(h => h.textContent === 'Weekly boss');
  if (boss) boss.insertAdjacentHTML('beforebegin', `<button class="btn ghost" onclick="location.hash='#/earn'">${gi('bolt')} More ways to earn${spinsLeft() > 0 ? ' · spin ready' : ''}</button>`);
};
Object.assign(routes, { home, earn });
