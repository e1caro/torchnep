'use strict';
// Game layer on top of FitQuest: XP and levels, daily quests, weekly boss, coins,
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
  xp: 0, coins: 0, owned: [], theme: 'hud', panel: 'chamfer', skin: 'hud', avatar: 'glove', banner: 'plain', boostUntil: 0, extraSpins: 0, ver: 0, ach: [], bosses: 0, questsDone: 0,
  sound: true, checkin: '', today: null, quests: null, bossClaimed: '', pend: null, chests: [], chestsOpened: 0, frame: 'none', title: '', ciStreak: 0, spun: '', spins: 0, waterGoalDays: 0, perfectDays: 0, sleepGood: 0, wk: null,
}, load('game', {}));
let LAST = null; // result of the latest workout, shown on the victory screen
const commit = () => save('game', G);
const lvl = () => levelOf(G.xp);
const title = () => {
  const a = ACH.find(x => x.id === G.title);
  return a && G.ach.includes(a.id) ? a.t : TITLES.filter(t => t[0] <= lvl()).at(-1)[1];
};

// ---------- catalog ----------
// Two separate streams:
//  - Level rewards unlock automatically: workouts (dungeons), meals (chef recipes) and perks.
//  - The coin shop sells looks and boosts only: profile pictures, rings, banners, themes, boosters and chests.
const rep = (g, n) => Array.from({ length: n }, () => g);
const DUNGEONS = {
  'd-tabata': { ico: 'stopwatch', name: 'Tabata Blitz', lv: 2, mult: 1.3, desc: 'Four bodyweight moves. 20 s on, 10 s off, four rounds each.', sets: 4, reps: '20s', rest: 10, bw: true, groups: [['quadriceps'], ['chest'], ['abdominals'], ['glutes', 'hamstrings']] },
  'd-core': { ico: 'abs', name: 'Core Inferno', lv: 3, mult: 1.3, desc: 'Six abs and back exercises that light up your middle.', sets: 3, reps: '15', rest: 40, groups: [...rep(['abdominals'], 5), ['lower back', 'abdominals']] },
  'd-pushup': { ico: 'push', name: 'Push-Up Pyramid', lv: 4, mult: 1.4, desc: 'Five push-up variations, five sets each. No equipment.', sets: 5, reps: '10', rest: 45, bw: true, re: /push.?up/i, groups: rep(null, 5) },
  'd-mobility': { ico: 'lotus', name: 'Mobility Monk', lv: 5, mult: 1, desc: 'Eight stretches for recovery days. Easy XP, happy joints.', sets: 1, reps: '30s', rest: 15, cats: ['stretching'], groups: rep(null, 8) },
  'd-glute': { ico: 'glute', name: 'Glute Forge', lv: 6, mult: 1.4, desc: 'Glutes and hamstrings, four heavy sets each.', sets: 4, reps: '12', rest: 60, groups: [['glutes'], ['glutes'], ['glutes'], ['hamstrings'], ['hamstrings'], ['quadriceps']] },
  'd-arms': { ico: 'biceps', name: 'Arm Arena', lv: 8, mult: 1.4, desc: 'Biceps, triceps and forearms until your sleeves complain.', sets: 3, reps: '12', rest: 45, groups: [...rep(['biceps'], 3), ...rep(['triceps'], 3), ['forearms']] },
  'd-legs': { ico: 'leg', name: 'Leg Day Dungeon', lv: 10, mult: 1.6, desc: 'Quads, hamstrings, glutes and calves. Bring snacks.', sets: 4, reps: '10', rest: 90, groups: [['quadriceps'], ['quadriceps'], ['hamstrings'], ['hamstrings'], ['glutes'], ['calves']] },
  'd-back': { ico: 'torso', name: 'Back Raid', lv: 12, mult: 1.6, desc: 'Pull heavy: lats, mid-back, traps and a little biceps.', sets: 4, reps: '10', rest: 75, groups: [...rep(['lats'], 3), ...rep(['middle back'], 2), ['traps'], ['biceps']] },
  'd-rush': { ico: 'minotaur', name: 'Boss Rush', lv: 15, mult: 2, desc: 'One exercise for every major muscle, two quick sets each. Double XP.', sets: 2, reps: '15', rest: 30, groups: [['chest'], ['lats'], ['quadriceps'], ['shoulders'], ['hamstrings'], ['biceps'], ['triceps'], ['abdominals'], ['glutes'], ['calves']] },
  'd-titan': { ico: 'temple', name: 'Titan Trial', lv: 20, mult: 3, desc: 'Five heavy lifts, 5 × 5, long rests. Triple XP for the brave.', sets: 5, reps: '5', rest: 180, expert: true, cats: ['powerlifting', 'olympic weightlifting', 'strength'], groups: [['quadriceps'], ['chest'], ['lats'], ['shoulders'], ['hamstrings']] },
  'd-cardio': { ico: 'sprint', name: 'Cardio Crusher', lv: 7, mult: 1.4, desc: 'Six fast bodyweight moves, 40 s each. Heart rate up, excuses down.', sets: 3, reps: '40s', rest: 20, bw: true, groups: rep(null, 6) },
  'd-shoulder': { ico: 'shoulder', name: 'Shoulder Siege', lv: 9, mult: 1.5, desc: 'Boulder delts and traps, hit from every angle.', sets: 4, reps: '12', rest: 60, groups: [...rep(['shoulders'], 4), ['traps'], ['triceps']] },
  'd-spine': { ico: 'spine', name: 'Spine Sanctuary', lv: 9, mult: 1, desc: 'Slow stretches for back, hips and hamstrings. Recovery XP.', sets: 1, reps: '40s', rest: 15, cats: ['stretching'], groups: [['lower back'], ['lower back'], ['hamstrings'], ['glutes'], ['lats'], ['quadriceps']] },
  'd-chest': { ico: 'chestplate', name: 'Chest Citadel', lv: 11, mult: 1.6, desc: 'Five chest exercises, four sets each. Storm the walls.', sets: 4, reps: '10', rest: 75, groups: rep(['chest'], 5) },
  'd-camp': { ico: 'centurion', name: 'Boot Camp', lv: 13, mult: 1.6, desc: 'Eight bodyweight exercises, 3 × 15. Works anywhere.', sets: 3, reps: '15', rest: 30, bw: true, groups: rep(null, 8) },
  'd-kb': { ico: 'weight', name: 'Kettlebell Krypt', lv: 14, mult: 1.7, need: 'kettlebells', desc: 'Swing, press and carry. Needs kettlebells in your equipment.', sets: 4, reps: '12', rest: 45, groups: rep(null, 6) },
  'd-band': { ico: 'rope', name: 'Band Brawl', lv: 16, mult: 1.7, need: 'bands', desc: 'Constant tension with resistance bands. Needs bands.', sets: 4, reps: '15', rest: 40, groups: rep(null, 6) },
  'd-upper': { ico: 'strong', name: 'Upper-Body Annihilation', lv: 18, mult: 2, desc: 'Ten exercises for chest, back, shoulders and arms. Double XP.', sets: 3, reps: '10', rest: 60, groups: [['chest'], ['chest'], ['lats'], ['lats'], ['shoulders'], ['shoulders'], ['biceps'], ['biceps'], ['triceps'], ['triceps']] },
  'd-lower': { ico: 'shoe', name: 'Lower-Body Apocalypse', lv: 22, mult: 2.2, desc: 'Quads, hamstrings, glutes and calves, plus abs to finish.', sets: 4, reps: '10', rest: 90, groups: [['quadriceps'], ['quadriceps'], ['hamstrings'], ['hamstrings'], ['glutes'], ['glutes'], ['calves'], ['abdominals']] },
  'd-marathon': { ico: 'infinity', name: 'Endless Marathon', lv: 25, mult: 2.5, desc: 'Fourteen exercises, two sets each, almost no rest.', sets: 2, reps: '12', rest: 30, groups: rep(null, 14) },
  'd-olymp': { ico: 'laurel', name: 'Olympian Gauntlet', lv: 28, mult: 3.5, need: 'barbell', expert: true, cats: ['powerlifting', 'olympic weightlifting', 'strength'], desc: 'Heavy barbell work, 5 × 3, three-minute rests. Needs a barbell.', sets: 5, reps: '3', rest: 180, groups: [['quadriceps'], ['hamstrings'], ['chest'], ['lats'], ['shoulders'], ['traps']] },
};
const PERKS = [
  ['xp1', 4, 'XP Boost I', '+5% XP from every workout', 'upgrade'], ['coin1', 6, 'Coin Boost I', '+10% coins from every workout', 'coins'],
  ['quest4', 8, 'Fourth quest', 'A fourth daily quest every day', 'scroll'], ['spin2', 10, 'Double spin', 'Two free daily spins', 'slot'],
  ['shield', 12, 'Rest-day shield', 'Your streak survives one missed day', 'shield'], ['boss', 14, 'Boss hunter', 'The weekly boss drops a golden chest', 'golem'],
  ['xp2', 16, 'XP Boost II', '+10% XP from every workout', 'upgrade'], ['rec', 18, 'Record breaker', 'New personal records are worth 80 XP', 'medal'],
  ['coin2', 20, 'Coin Boost II', '+20% coins from every workout', 'coins'], ['xp3', 24, 'XP Boost III', '+15% XP from every workout', 'upgrade'],
];
const THEMES = [['hud', 'Cyber HUD', 0, '#22e4ff', '#ffb020'], ['ember', 'Ember', 0, '#ff6a3d', '#ffb347'], ['neon', 'Neon City', 120, '#00e5ff', '#ff2bd6'], ['sakura', 'Sakura', 140, '#ff7eb6', '#ffd1e8'], ['frost', 'Frostbite', 160, '#7cc6ff', '#e0f4ff'],
  ['toxic', 'Toxic', 200, '#8dff3a', '#e6ff5a'], ['ocean', 'Deep Ocean', 240, '#2ee6d6', '#3a8dff'], ['royal', 'Royal', 300, '#a66bff', '#ffd166'], ['retro', 'Arcade', 400, '#ff3d7f', '#ffe14d'],
  ['lava', 'Lava Flow', 420, '#ff4b1f', '#ffd000'], ['matrix', 'Mainframe', 520, '#2bff88', '#b7ffd8'], ['gold', 'Golden Hour', 700, '#ffd34d', '#fff1a8'], ['aurora', 'Aurora', 800, '#5cffc8', '#b46bff'],
  ['hologram', 'Hologram', 180, '#7df9ff', '#e8fdff'], ['stealth', 'Stealth Ops', 220, '#9fb3c8', '#3ddc97'], ['redalert', 'Red Alert', 350, '#ff2b3d', '#ffb020'], ['synthwave', 'Synthwave', 450, '#ff3cc7', '#7b5cff'], ['nightcity', 'Night City', 600, '#fcee0a', '#00f0ff']];
const AVATARS = [['glove', 'Boxer', 0], ['sun', 'Sun', 0], ['moon', 'Moon', 0], ['leaf', 'Leaf', 0], ['mountain', 'Mountain', 0], ['anchor', 'Anchor', 0], ['compass', 'Compass', 0], ['feather', 'Feather', 0],
  ['snowflake', 'Snowflake', 0], ['cactus', 'Cactus', 0], ['pine', 'Pine', 0], ['panda', 'Panda', 0], ['penguin', 'Penguin', 0], ['turtle', 'Turtle', 0], ['duck', 'Duck', 0], ['bee', 'Bee', 0],
  ['wolf', 'Wolf', 60], ['lion', 'Lion', 80], ['tiger', 'Tiger', 100], ['bear', 'Bear', 120], ['fox', 'Fox', 120], ['eagle', 'Eagle', 150], ['rooster', 'Rooster', 150],
  ['shark', 'Shark', 160], ['gorilla', 'Gorilla', 180], ['horse', 'Stallion', 180], ['bull', 'Bull', 200], ['ram', 'Ram', 200], ['raven', 'Raven', 220], ['owl', 'Owl', 220], ['scorpion', 'Scorpion', 260],
  ['ninja', 'Ninja', 280], ['samurai', 'Samurai', 320], ['viking', 'Viking', 320], ['spartan', 'Spartan', 340], ['minotaur', 'Minotaur', 380], ['robot', 'Robot', 400], ['wyvern', 'Wyvern', 420],
  ['unicorn', 'Unicorn', 450], ['astronaut', 'Astronaut', 480], ['dragon', 'Dragon', 500], ['kraken', 'Kraken', 520], ['alien', 'Alien', 560], ['trex', 'T-Rex', 600], ['rocket', 'Rocket', 700], ['crown', 'Crown', 800]];
const FRAMES = [['none', 'Plain ring', 0], ['flame', 'Flame ring', 120], ['electric', 'Electric ring', 200], ['diamond', 'Diamond ring', 300], ['rainbow', 'Rainbow ring', 450], ['galaxy', 'Galaxy ring', 700],
  ['segments', 'Segment ring', 90], ['ticks', 'Gauge ring', 110], ['reticle', 'Reticle ring', 160], ['gear', 'Gear ring', 220], ['hexagon', 'Hex frame', 260], ['orbit', 'Orbit ring', 320], ['radar', 'Radar ring', 380], ['glitch', 'Glitch ring', 520]];
const BANNERS = [['plain', 'Plain', 0], ['grid', 'Blueprint', 80], ['stripes', 'Speed lines', 100], ['dots', 'Dotted', 100], ['waves', 'Ripples', 120], ['peaks', 'Peaks', 150], ['glow', 'Glow', 250], ['heat', 'Heat', 300],
  ['scan', 'Scanlines', 90], ['hexgrid', 'Lattice', 140], ['circuit', 'Circuit board', 180], ['radar', 'Radar sweep', 220], ['data', 'Data stream', 260], ['hazard', 'Hazard', 280]];
// panel styles: the shape of every card in the app
// whole interfaces: each changes the palette, fonts, frames, buttons and background (fonts load only when in use)
const SKINS = [['hud', 'Sci-fi HUD', 0, '🛰️'], ['chinese', 'Imperial China', 2000, '🏮'], ['japanese', 'Zen Japan', 2000, '⛩️'], ['fairy', 'Fairy Tale Forest', 2500, '🌳'], ['medieval', 'Medieval Castle', 2500, '🏰'], ['steampunk', 'Steampunk Works', 3000, '⚙️'],
  ['greek', 'Olympus', 2500, '🏛️'], ['egypt', 'Ancient Egypt', 2500, '🏜️'], ['viking', 'Viking Saga', 2800, '🪓'], ['pirate', 'Pirate Seas', 2800, '🏴‍☠️'], ['outrun', 'Outrun 80s', 3200, '🌆'], ['arcade', 'Arcade 8-bit', 3500, '👾']];
const SKIN_FONTS = { chinese: 'ZCOOL+XiaoWei&family=Lora:wght@400;600;700', japanese: 'Shippori+Mincho:wght@600;800&family=Zen+Kaku+Gothic+New:wght@400;700',
  fairy: 'IM+Fell+English+SC&family=Lora:wght@400;600;700', medieval: 'MedievalSharp&family=EB+Garamond:wght@400;600;700', steampunk: 'Rye&family=Special+Elite&family=Lora:wght@400;600;700',
  greek: 'Cinzel:wght@500;700;900&family=Cormorant+Garamond:wght@500;600;700', egypt: 'Cinzel+Decorative:wght@700;900&family=Lora:wght@400;600;700',
  viking: 'Metamorphous&family=Alegreya:wght@400;600;700', pirate: 'Pirata+One&family=IM+Fell+English&family=Lora:wght@400;600',
  outrun: 'Audiowide&family=Exo+2:wght@400;600;700', arcade: 'Press+Start+2P&family=VT323' };
const PANELS = [['chamfer', 'Chamfered', 0], ['classic', 'Classic', 0], ['brackets', 'Brackets', 150], ['octa', 'Octagon', 200], ['notch', 'Notch', 250], ['double', 'Double line', 300], ['circuit', 'Circuit', 400], ['holo', 'Hologram', 500]];
const ITEMS = [
  ...THEMES.map(([k, name, cost, a, b]) => ({ id: 't-' + k, type: 'theme', key: k, name, cost, sw: [a, b], shop: true })),
  ...AVATARS.map(([k, name, cost]) => ({ id: 'a-' + k, type: 'avatar', key: k, name, cost, shop: true })),
  ...FRAMES.map(([k, name, cost]) => ({ id: 'f-' + k, type: 'frame', key: k, name, cost, shop: true })),
  ...BANNERS.map(([k, name, cost]) => ({ id: 'b-' + k, type: 'banner', key: k, name: name + ' banner', cost, shop: true })),
  ...PANELS.map(([k, name, cost]) => ({ id: 'pn-' + k, type: 'panel', key: k, name: name + ' panels', cost, shop: true })),
  ...SKINS.map(([k, name, cost, emo]) => ({ id: 'sk-' + k, type: 'skin', key: k, name, cost, emo, shop: true })),
  ...RECIPES.filter(r => r.chef).map(r => ({ id: 'r-' + r.id, type: 'recipe', name: r.name, lv: r.chef[0], rid: r.id })),
  ...Object.entries(DUNGEONS).map(([id, d]) => ({ id, type: 'dungeon', name: d.name, lv: d.lv })),
  ...PERKS.map(([k, lv, name, desc, ico]) => ({ id: 'p-' + k, type: 'perk', key: k, name, lv, desc, ico })),
];
const item = id => ITEMS.find(i => i.id === id);
// Shop items are owned once bought (or free); level rewards open at their level. Dungeons and recipes bought before this split stay owned.
const has = i => i.shop ? (i.cost === 0 || G.owned.includes(i.id)) : (lvl() >= i.lv || G.owned.includes(i.id));
const perk = k => has(item('p-' + k));
const xpPerk = () => perk('xp3') ? .15 : perk('xp2') ? .10 : perk('xp1') ? .05 : 0;
const coinPerk = () => perk('coin2') ? .20 : perk('coin1') ? .10 : 0;
const boostOn = () => Date.now() < (G.boostUntil || 0);
const KIND = { theme: 'Theme', avatar: 'Profile picture', frame: 'Ring', banner: 'Banner', panel: 'Panel style', skin: 'Interface', dungeon: 'Workout', recipe: 'Meal', perk: 'Perk' };
const ICO = i => i.type === 'dungeon' ? gi(DUNGEONS[i.id].ico, 'hero') : i.type === 'avatar' ? gi(i.key, 'hero') : i.type === 'perk' ? gi(i.ico, 'hero') : i.type === 'recipe' ? gi('chef', 'hero') : i.type === 'frame' ? gi('frame', 'hero') : i.type === 'banner' ? gi('banner', 'hero') : i.type === 'panel' ? gi('frame', 'hero') : i.type === 'skin' ? `<span class="emo">${i.emo}</span>` : gi('palette', 'hero');

// ---------- daily quests ----------
const QT = [
  { id: 'workout', t: 'Finish a workout', n: 1, m: 'workouts', xp: 80, ico: 'swords' },
  { id: 'sets', t: 'Complete 12 sets', n: 12, m: 'sets', xp: 60, ico: 'biceps' },
  { id: 'guide', t: 'Study 2 exercise guides', n: 2, m: 'guides', xp: 30, ico: 'book' },
  { id: 'weigh', t: 'Log your weight', n: 1, m: 'weigh', xp: 25, ico: 'scale' },
  { id: 'min', t: 'Train for 25 minutes', n: 25, m: 'minutes', xp: 60, ico: 'stopwatch' },
  { id: 'dungeon', t: 'Clear a dungeon', n: 1, m: 'dungeons', xp: 100, ico: 'gate', needLv: 2 },
  { id: 'water', t: 'Drink 8 glasses of water', n: 8, m: 'water', xp: 40, ico: 'water' },
  { id: 'sleep', t: 'Sleep 7 hours or more', n: 7, m: 'sleep', xp: 40, ico: 'sleep' },
  { id: 'meals', t: 'Eat 3 planned meals', n: 3, m: 'meals', xp: 50, ico: 'cutlery', need: () => typeof M !== 'undefined' && !!M.set },
];
const metric = m => m === 'guides' ? G.today.guides.length : (G.today[m] || 0);

function ensureDay() {
  const d = dayId();
  if (G.today?.day === d && G.quests?.day === d) return;
  G.today = { day: d, sets: 0, workouts: 0, minutes: 0, guides: [], weigh: 0, dungeons: 0, meals: 0, water: 0, sleep: 0 };
  const pool = shuffle(QT.slice(1).filter(q => (!q.needLv || lvl() >= q.needLv) && (!q.need || q.need())), rng(hash(d)));
  G.quests = { day: d, list: ['workout', ...pool.slice(0, perk('quest4') ? 3 : 2).map(q => q.id)], claimed: [], bonus: false };
  commit();
}

// ---------- feedback: sound, toasts, confetti, modal ----------
let AC;
function sfx(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === 'level' ? [60, 40, 120] : 25);
    if (!G.sound) return;
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
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
    for (let L = from + 1; L <= to; L++) { G.coins += 20 + 5 * L; if (L % 10 === 0) G.chests.push('gold'); else if (L % 5 === 0) G.chests.push('silver'); }
    G.pend = { from: G.pend ? G.pend.from : from, to };
  }
  commit();
}
function flushLevelUp(after) {
  if (!G.pend) { after?.(); return; }
  const { from, to } = G.pend, unlocked = ITEMS.filter(i => !i.shop && i.lv > from && i.lv <= to && i.lv > 1);
  const bonus = Array.from({ length: to - from }, (_, k) => 20 + 5 * (from + 1 + k)).reduce((a, b) => a + b, 0);
  G.pend = null; commit(); sfx('level'); confetti();
  modal(`<div class="lvup">LEVEL UP</div><div class="bignum">${to}</div><div class="mut">${title()}</div>
    ${unlocked.length ? `<h3>Unlocked</h3>${unlocked.map(i => `<div class="unl">${ICO(i)} <b>${esc(i.name)}${i.desc ? `<span class="mut" style="display:block;font-weight:400">${esc(i.desc)}</span>` : ''}</b><span class="mut">${KIND[i.type]}</span></div>`).join('')}` : ''}
    <div class="unl">${gi('coin', 'cn')} <b>+${bonus} coins</b></div>${[...Array(to - from)].some((_, k) => (from + 1 + k) % 5 === 0) ? `<div class="unl">${gi('crate', 'hero')} <b>Milestone chest</b><span class="mut">Open it on Today</span></div>` : ''}<button class="btn" data-close>Awesome</button>`, after);
}

// ---------- achievements ----------
const totalVol = () => S.history.reduce((a, h) => a + volume(h), 0);
const ACH = [
  { id: 'first', t: 'Blooded', n: 'First Blood', d: 'Finish your first workout', i: 'punch', xp: 50, ok: () => S.history.length >= 1 },
  { id: 'w5', n: 'Warming Up', d: 'Finish 5 workouts', i: 'sunrise', xp: 100, ok: () => S.history.length >= 5 },
  { id: 'w25', t: 'Gym Rat', n: 'Gym Rat', d: 'Finish 25 workouts', i: 'fist', xp: 400, ok: () => S.history.length >= 25 },
  { id: 'st3', n: 'On Fire', d: 'Train 3 days in a row', i: 'flame', xp: 100, ok: () => streak() >= 3 },
  { id: 'st7', t: 'Unstoppable', n: 'Unstoppable', d: 'Train 7 days in a row', i: 'bolt', xp: 300, ok: () => streak() >= 7 },
  { id: 'ton', n: 'One Ton Club', d: 'Lift 1,000 kg in total', i: 'lifter', xp: 100, ok: () => totalVol() >= 1000 },
  { id: 'ton10', t: 'Heavy Metal', n: 'Heavy Metal', d: 'Lift 10,000 kg in total', i: 'anvil', xp: 400, ok: () => totalVol() >= 10000 },
  { id: 'early', t: 'Early Bird', n: 'Early Bird', d: 'Finish a workout before 8 am', i: 'rooster', xp: 80, ok: () => S.history.some(h => new Date(h.t).getHours() < 8) },
  { id: 'night', n: 'Night Owl', d: 'Finish a workout after 9 pm', i: 'owl', xp: 80, ok: () => S.history.some(h => new Date(h.t).getHours() >= 21) },
  { id: 'dg1', n: 'Dungeon Crawler', d: 'Clear a dungeon', i: 'gate', xp: 120, ok: () => S.history.some(h => h.dungeon) },
  { id: 'dg5', t: 'Dungeon Master', n: 'Dungeon Master', d: 'Clear 5 dungeons', i: 'key', xp: 350, ok: () => S.history.filter(h => h.dungeon).length >= 5 },
  { id: 'wt5', n: 'Scale Master', d: 'Log your weight 5 times', i: 'scale', xp: 80, ok: () => S.weights.length >= 5 },
  { id: 'boss', t: 'Boss Slayer', n: 'Boss Slayer', d: 'Defeat a weekly boss', i: 'golem', xp: 200, ok: () => G.bosses >= 1 },
  { id: 'w50', t: 'Iron Veteran', n: 'Iron Veteran', d: 'Finish 50 workouts', i: 'chestplate', xp: 600, ok: () => S.history.length >= 50 },
  { id: 'st14', t: 'Two Weeks Strong', n: 'Two Weeks Strong', d: 'Train 14 days in a row', i: 'calendar', xp: 600, ok: () => streak() >= 14 },
  { id: 'dg10', t: 'Dungeon Lord', n: 'Dungeon Lord', d: 'Clear 10 dungeons', i: 'minotaur', xp: 600, ok: () => S.history.filter(h => h.dungeon).length >= 10 },
  { id: 'lv10', t: 'Double Digits', n: 'Double Digits', d: 'Reach level 10', i: 'upgrade', xp: 300, ok: () => lvl() >= 10 },
  { id: 'ch5', t: 'Treasure Hunter', n: 'Treasure Hunter', d: 'Open 5 chests', i: 'treasure', xp: 250, ok: () => G.chestsOpened >= 5 },
  { id: 'wat7', n: 'Aqua Hero', d: 'Hit your water goal on 7 days', i: 'water', xp: 150, ok: () => G.waterGoalDays >= 7 },
  { id: 'spin5', n: 'Lucky Streak', d: 'Use the daily spin 5 times', i: 'dice', xp: 100, ok: () => G.spins >= 5 },
  { id: 'chef1', n: 'Gourmet', d: 'Unlock your first chef recipe', i: 'chef', xp: 100, ok: () => ITEMS.some(i => i.type === 'recipe' && has(i)) },
  { id: 'perf', n: 'Perfect Plate', d: 'Eat every planned meal in one day', i: 'pot', xp: 100, ok: () => G.perfectDays >= 1 },
  { id: 'rest5', n: 'Well Rested', d: 'Log 7+ hours of sleep on 5 days', i: 'sleep', xp: 120, ok: () => G.sleepGood >= 5 },
  { id: 'q10', t: 'Questmaster', n: 'Questmaster', d: 'Claim 10 daily quests', i: 'scroll', xp: 200, ok: () => G.questsDone >= 10 },
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
  const dg = h.dungeon ? DUNGEONS[h.dungeon] : null, st = streak(), feat = dg && featuredId() === h.dungeon;
  const xpP = xpPerk(), coinP = coinPerk(), boost = boostOn(), recXp = perk('rec') ? 80 : 40;
  const sm = 1 + Math.min(0.5, (st - 1) * 0.05), mult = (dg?.mult || 1) * sm * (feat ? 1.5 : 1) * (1 + xpP) * (boost ? 2 : 1);
  const base = sets * 10 + 100 + prs * recXp, xp = Math.round(base * mult), coins = Math.round(xp / 6 * (1 + coinP));
  const lines = [[`${sets} sets × 10`, sets * 10], ['Workout cleared', 100]];
  if (prs) lines.push([`${prs} new record${prs > 1 ? 's' : ''} × ${recXp}`, prs * recXp]);
  if (dg) lines.push([`${dg.name} ×${dg.mult}`, null]);
  if (feat) lines.push(['Dungeon of the day ×1.5', null]);
  if (sm > 1) lines.push([`${st}-day streak ×${sm.toFixed(2)}`, null]);
  if (xpP) lines.push([`Level perk +${Math.round(xpP * 100)}% XP`, null]);
  if (boost) lines.push(['XP booster ×2', null]);
  const before = G.xp;
  G.today.sets += sets; G.today.workouts++; G.today.minutes += h.dur; if (dg) G.today.dungeons++;
  const chest = dg ? (dg.mult >= 2 ? 'gold' : 'wood') : null;
  if (chest) G.chests.push(chest);
  award(xp, coins);
  const ach = checkAch();
  LAST = { name: h.name, dungeon: dg, lines, xp, coins, before, after: G.xp, ach, chest };
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
  if (d.need && !p.equipment.includes(d.need)) return [];
  const have = d.bw ? new Set(['body only', 'none']) : d.need ? new Set(['body only', 'none', ...(EQ_MAP[d.need] || [d.need])]) : equipSet(p), pp = d.expert ? { ...p, level: 'expert' } : p;
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
  if (items.length < 2) { toast(DUNGEONS[id].need && !S.profile.equipment.includes(DUNGEONS[id].need) ? `Add ${DUNGEONS[id].need} to your equipment in your profile.` : 'Not enough exercises match your equipment and limits.'); return; }
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
  if (G.quests.bonus || G.quests.claimed.length < G.quests.list.length) return;
  G.quests.bonus = true; G.chests.push('wood'); award(60, 25); sfx('claim'); flushLevelUp(home);
};
const ciInfo = () => {
  const st = G.checkin === dayId() ? G.ciStreak : G.checkin === dayId(Date.now() - 864e5) ? G.ciStreak + 1 : 1;
  return { st, xp: 10 + 2 * Math.min(st - 1, 6), coins: 15 + 5 * Math.min(st - 1, 6), chest: st % 7 === 0 };
};
window.checkIn = () => {
  if (G.checkin === dayId()) return;
  const c = ciInfo(); G.checkin = dayId(); G.ciStreak = c.st;
  if (c.chest) G.chests.push('silver');
  toast(`Check-in day ${c.st}${c.chest ? ': silver chest!' : ''}`); award(c.xp, c.coins); sfx('claim'); flushLevelUp(home);
};
const BOSSES = [['Iron Golem', 'golem'], ['Sloth Dragon', 'dragon'], ['Couch Lord', 'sofa'], ['Fatigue Wraith', 'ghost'], ['Gravity Beast', 'gorilla']];
window.claimBoss = () => {
  if (G.bossClaimed === weekId() || weekCount() < S.profile.days) return;
  G.bossClaimed = weekId(); G.bosses++; G.chests.push(perk('boss') ? 'gold' : 'silver'); award(250, 100); sfx('claim'); checkAch(); flushLevelUp(home);
};
window.buy = id => {
  const i = item(id);
  if (!i.shop) { toast(`${i.name} unlocks at level ${i.lv}.`); return; }
  if (has(i) || G.coins < i.cost) { toast(has(i) ? 'Already yours.' : `Need ${i.cost - G.coins} more coins.`); return; }
  G.coins -= i.cost; G.owned.push(id); commit(); sfx('claim'); toast(`Unlocked ${i.name}`); checkAch(); route();
};
window.equip = id => {
  const i = item(id); if (!has(i)) return;
  if (i.type === 'theme') G.theme = i.key; else if (i.type === 'frame') G.frame = i.key; else if (i.type === 'banner') G.banner = i.key; else if (i.type === 'avatar') G.avatar = i.key; else if (i.type === 'panel') G.panel = i.key; else if (i.type === 'skin') G.skin = i.key; else return;
  commit(); applyTheme(); route();
};
window.equipTitle = id => { G.title = G.title === id ? '' : id; commit(); route(); };
const CHEST = { wood: ['Wooden chest', 'crate', [80, 95, 100, 100], [20, 60], [50, 120]], silver: ['Silver chest', 'chest-silver', [50, 70, 100, 100], [60, 150], [100, 250]], gold: ['Golden chest', 'chest-gold', [30, 50, 90, 100], [150, 400], [300, 600]] };
const rand = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
window.openChest = () => {
  if (!G.chests.length) return;
  const tier = G.chests.shift(), [name, ico, cut, cr, xr] = CHEST[tier], roll = Math.random() * 100;
  const cos = ITEMS.filter(i => i.shop && !has(i) && i.type !== 'skin'), dg = []; // chests drop looks only; workouts and meals come from levels
  let html;
  if (roll < cut[0] || (roll >= cut[1] && roll < cut[2] && !cos.length) || (roll >= cut[2] && !dg.length && !cos.length)) {
    const c = rand(cr); G.coins += c; html = `<div class="avbig">${gi('coin', 'cn')}</div><h2>${c} coins</h2>`;
  } else if (roll < cut[1]) {
    const x = rand(xr); award(x); html = `<div class="avbig">${gi('sparkles', 'hero')}</div><h2>${x} XP</h2>`;
  } else {
    const pool = roll < cut[2] || !dg.length ? cos : dg, i = pool[Math.floor(Math.random() * pool.length)];
    G.owned.push(i.id); html = `<div class="avbig">${ICO(i)}</div><div class="lvup">New ${KIND[i.type].toLowerCase()}</div><h2>${esc(i.name)}</h2>`;
  }
  G.chestsOpened++; commit();
  modal(`<div class="chest">${gi(ico)}</div><div class="mut">${name}</div><div class="reveal">${html}<button class="btn" data-close>Nice</button></div>`, () => { checkAch(); flushLevelUp(route); });
  setTimeout(() => { sfx('claim'); confetti(); }, 900);
};
window.toggleSound = () => { G.sound = !G.sound; commit(); if (G.sound) sfx('tick'); route(); };

// show an interface (also used by the shop's Try button) and load its fonts
function setSkin(k) {
  document.documentElement.dataset.skin = k;
  // themes recolour an interface's accents; the default Cyber HUD theme keeps each interface's own colours
  document.documentElement.toggleAttribute('data-tint', k !== 'hud' && (G.theme || 'hud') !== 'hud');
  let l = document.getElementById('skinfont');
  if (SKIN_FONTS[k]) { if (!l) { l = document.createElement('link'); l.id = 'skinfont'; l.rel = 'stylesheet'; document.head.appendChild(l); } l.href = `https://fonts.googleapis.com/css2?family=${SKIN_FONTS[k]}&display=swap`; }
}
function applyTheme() {
  document.documentElement.dataset.theme = G.theme;
  document.documentElement.dataset.panel = G.panel || 'chamfer';
  setSkin(G.skin || 'hud');
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0d12';
}

const dgReady = id => { const d = DUNGEONS[id]; return has(item(id)) && (!d.need || S.profile.equipment.includes(d.need)); };
function featuredId() {
  const ids = Object.keys(DUNGEONS).filter(dgReady);
  return ids.length ? ids[hash(dayId()) % ids.length] : null;
}

// ---------- views ----------
function hud() {
  const L = lvl(), a = totalXp(L), b = totalXp(L + 1), pct = (G.xp - a) / (b - a);
  return `<div class="hud bn-${G.banner}"><div class="av fr-${G.frame}" style="--p:${pct.toFixed(3)}" onclick="location.hash='#/profile'" role="button" aria-label="Edit profile"><span>${gi(G.avatar, 'hero')}</span><i class="lv">${L}</i></div>
  <div class="grow"><div class="hn">${esc(S.profile?.name || 'Player')}</div><div class="mut">${title()}${boostOn() ? ' · <b style="color:var(--ok)">2× XP</b>' : ''}</div>
  <div class="xpbar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div><div class="xpt">${G.xp - a} / ${b - a} XP to level ${L + 1}</div></div>
  <div class="coins">${gi('coin', 'cn')} <b>${G.coins}</b></div></div>`;
}

function home() {
  if (needProfile()) return;
  ensureDay(); flushLevelUp();
  const p = S.profile, a = analyze({ ...p, weight: curWeight() }), di = nextDayIdx(), d = S.plan.days[di], first = BY[d.items[0].id];
  const done = G.quests.claimed.length, hits = Math.min(weekCount(), p.days), bossDone = hits >= p.days, [bn, be] = BOSSES[hash(weekId()) % BOSSES.length];
  view.innerHTML = `${hud()}
  <div class="row between sec2"><h2>Daily quests</h2><span class="mut">${done}/${G.quests.list.length} claimed</span></div>
  ${G.quests.list.map(id => {
    const q = QT.find(x => x.id === id), v = Math.min(q.n, metric(q.m)), ok = v >= q.n, cl = G.quests.claimed.includes(id);
    return `<div class="quest ${cl ? 'cl' : ok ? 'ok' : ''}"><div class="qi">${gi(q.ico)}</div><div class="grow"><div class="qt">${q.t}</div>
    <div class="qbar"><i style="width:${v / q.n * 100}%"></i></div><div class="mut">${v}/${q.n} · +${q.xp} XP · ${gi('coin', 'cn')} ${Math.round(q.xp / 5)}</div></div>
    ${cl ? '<span class="chk">✓</span>' : ok ? `<button class="btn sm" onclick="claimQuest('${id}')">Claim</button>` : ''}</div>`;
  }).join('')}
  ${G.quests.bonus ? '' : `<div class="quest ${done >= G.quests.list.length ? 'ok' : ''}"><div class="qi">${gi('crate')}</div><div class="grow"><div class="qt">Clear every quest</div><div class="mut">Bonus chest: +60 XP · ${gi('coin', 'cn')} 25</div></div>
  ${done >= G.quests.list.length ? '<button class="btn sm" onclick="claimQuestBonus()">Open</button>' : ''}</div>`}
  ${G.checkin === dayId() ? '' : (c => `<button class="btn gold" onclick="checkIn()">Daily check-in · day ${c.st} · +${c.xp} XP · ${gi('coin', 'cn')} ${c.coins}${c.chest ? ' · chest' : ''}</button>`)(ciInfo())}
  ${G.chests.length ? `<button class="btn chestbtn" onclick="openChest()">${gi(CHEST[G.chests[0]][1])} Open ${CHEST[G.chests[0]][0].toLowerCase()}${G.chests.length > 1 ? ` (+${G.chests.length - 1} more)` : ''}</button>` : ''}
  <h2 class="sec">Weekly boss</h2>
  <section class="card boss ${bossDone ? 'dead' : ''}"><div class="be">${gi(be, 'hero')}</div><div class="grow"><h3>${bn}</h3>
    <div class="hp"><i style="width:${(1 - hits / p.days) * 100}%"></i></div>
    <div class="mut">${bossDone ? 'Defeated!' : `${p.days - hits} hit${p.days - hits > 1 ? 's' : ''} left. Every workout deals damage.`}</div>
    ${bossDone && G.bossClaimed !== weekId() ? `<button class="btn sm" onclick="claimBoss()" style="margin-top:8px">Claim loot · +250 XP · ${gi('coin', 'cn')} 100</button>` : ''}</div></section>
  ${featuredId() ? `<section class="card tap row" onclick="location.hash='#/dungeons'"><div class="dgi">${gi(DUNGEONS[featuredId()].ico)}</div><div class="grow"><div class="mut">Dungeon of the day · +50% XP</div><h3>${DUNGEONS[featuredId()].name}</h3></div></section>` : ''}
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
  const feat = featuredId(), list = Object.entries(DUNGEONS).sort((x, y) => x[1].lv - y[1].lv);
  view.innerHTML = `<h1>Dungeons</h1><p class="mut">Special workouts built from your equipment and limits. They unlock as you level up. Clearing one earns bonus XP and a chest. ${list.filter(([id]) => has(item(id))).length} of ${list.length} unlocked.</p>` +
    list.map(([id, d]) => {
      const i = item(id), ok = has(i), miss = d.need && !S.profile.equipment.includes(d.need);
      return `<section class="card dg ${ok ? '' : 'locked'}"><div class="dgi">${ok ? gi(d.ico) : gi('lock')}</div><div class="grow"><h3>${d.name}</h3><div class="mut">${d.desc}</div>
      <div class="chips static"><span class="chip">Lv ${d.lv}</span><span class="chip">${d.mult}× XP</span>${id === feat ? '<span class="chip on">Today +50%</span>' : ''}${miss ? `<span class="chip">Needs ${d.need}</span>` : ''}</div></div>
      ${ok ? `<button class="btn sm" onclick="startDungeon('${id}')">Enter</button>` : `<span class="mut cost">${gi('lock')} Level ${d.lv}</span>`}</section>`;
    }).join('');
}

function victory() {
  if (!LAST) { location.hash = '#/home'; return; }
  const r = LAST, la = levelOf(r.before), lb = levelOf(r.after), pc = x => { const L = levelOf(x); return (x - totalXp(L)) / (totalXp(L + 1) - totalXp(L)) * 100; };
  view.innerHTML = `<div class="vic"><div class="lvup">${r.dungeon ? 'Dungeon cleared' : 'Workout cleared'}</div><h1>${esc(r.name)}</h1>
  <div class="card">${r.lines.map(([t, v]) => `<div class="row between"><span>${t}</span><b>${v == null ? '' : '+' + v}</b></div>`).join('')}
  <div class="row between tot"><span>Total</span><b>+${r.xp} XP · ${gi('coin', 'cn')} ${r.coins}</b></div></div>
  <div class="hud solo"><div class="av fr-${G.frame}" style="--p:0"><span>${gi(G.avatar, 'hero')}</span><i class="lv" id="vl">${la}</i></div><div class="grow"><div class="xpbar"><i id="vb" style="width:${pc(r.before)}%"></i></div><div class="xpt">${lb > la ? `Level ${la} → ${lb}` : `${r.after - totalXp(lb)} / ${totalXp(lb + 1) - totalXp(lb)} XP`}</div></div></div>
  ${r.chest ? `<div class="card row"><div class="avbig sm">${gi(CHEST[r.chest][1])}</div><div class="grow"><b>${CHEST[r.chest][0]}</b><div class="mut">Added to your loot. Open it on Today.</div></div></div>` : ''}
  ${r.ach.map(a => `<div class="card row"><div class="avbig sm">${gi(a.i, 'hero')}</div><div class="grow"><b>${a.n}</b><div class="mut">Badge unlocked · +${a.xp} XP</div></div></div>`).join('')}
  <button class="btn" id="col">Collect</button></div>`;
  sfx('claim'); confetti();
  setTimeout(() => { const b = $('#vb'); if (b) { b.style.width = (lb > la ? 100 : pc(r.after)) + '%'; } }, 150);
  $('#col').onclick = () => { LAST = null; flushLevelUp(() => { location.hash = '#/home'; }); if (!G.pend && location.hash === '#/victory') location.hash = '#/home'; };
}

function heroCard() {
  const vol = totalVol(), mins = S.history.reduce((a, h) => a + h.dur, 0);
  return `${hud()}<div class="grid3"><div class="stat"><b>${Math.round(vol).toLocaleString()}</b><span>STR · kg lifted</span></div><div class="stat"><b>${mins}</b><span>END · minutes</span></div><div class="stat"><b>${S.history.length}</b><span>DEX · workouts</span></div></div>
  <button class="btn" onclick="location.hash='#/profile'">${gi('user')} Edit profile and looks</button>
  <button class="btn ghost" onclick="toggleSound()">Sound effects: ${G.sound ? 'on' : 'off'}</button>
  <div class="lbl">Language</div>${langChips()}<div class="mut" style="margin-top:14px;text-align:center">FitQuest version 47</div>`;
}

function initGame() {
  if (!localStorage.getItem('fc.game') && S.history.length) { // welcome back: convert past workouts to XP
    G.xp = S.history.reduce((a, h) => a + 100 + h.ex.reduce((b, x) => b + x.sets.length * 10, 0), 0);
  }
  migrateGame();
  // the HUD redesign: everyone starts once on the Cyber HUD look (bought themes stay owned and can be equipped again)
  if (!G.hudLook2) { G.hudLook2 = 1; G.theme = 'hud'; G.skin = 'hud'; G.panel = 'chamfer'; }
  ensureDay(); applyTheme(); commit();
}
// Version 3 split rewards: levels give workouts, meals and perks; coins buy looks. Keep everything players already had.
function migrateGame() {
  if (G.ver >= 3) return;
  const L = lvl(), oldAv = { '🥊': ['glove', 1], '🦁': ['lion', 2], '🐺': ['wolf', 4], '🦅': ['eagle', 6], '🐉': ['dragon', 9], '⚡': ['robot', 12], '👑': ['crown', 16], '🚀': ['rocket', 22], '🐯': ['tiger', 3], '🦈': ['shark', 7], '🥷': ['ninja', 11], '🤖': ['robot', 14], '🦖': ['trex', 18], '🧙': ['wyvern', 20], '🦄': ['unicorn', 26], '👽': ['alien', 30] };
  const oldTheme = { ember: 1, neon: 3, frost: 5, toxic: 7, royal: 10, retro: 13, gold: 18, sakura: 4, ocean: 9, lava: 15, matrix: 20, aurora: 25 };
  const oldFrame = { none: 1, flame: 5, electric: 8, diamond: 12, rainbow: 17, galaxy: 24 };
  const own = new Set(G.owned.map(id => id.startsWith('a-') && oldAv[id.slice(2)] ? 'a-' + oldAv[id.slice(2)][0] : id));
  Object.entries(oldAv).forEach(([, [k, lv]]) => { if (L >= lv) own.add('a-' + k); });
  Object.entries(oldTheme).forEach(([k, lv]) => { if (L >= lv) own.add('t-' + k); });
  Object.entries(oldFrame).forEach(([k, lv]) => { if (L >= lv) own.add('f-' + k); });
  G.owned = [...own];
  if (oldAv[G.avatar]) G.avatar = oldAv[G.avatar][0]; else if (!ITEMS.some(i => i.type === 'avatar' && i.key === G.avatar)) G.avatar = 'glove';
  G.ver = 3;
}
Object.assign(routes, { home, dungeons, victory });
