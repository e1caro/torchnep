'use strict';
// Halloween event: until the end of 31 October 2026 (it closes at midnight, 1 November) the Haunted Crypt opens.
// It is your own next workout with each exercise swapped for a spooky twin (same main muscle and kind, your equipment),
// and clearing it gives the Halloween Night interface. The other prizes (a jack-o'-lantern profile picture, a cobweb
// banner and the Witching Hour ring) come one a day, each day you complete all the daily quests. Any prize can be tried for a minute from the event card. The prizes are event-only: never in the shop or in chests, and they stay yours after the event.
const HW_END = new Date(2026, 10, 1).getTime(); // local midnight starting 1 November
const hwOpen = () => Date.now() < HW_END;
const HW_ID = 'd-halloween';
// the event's prizes, in order
// via: 'quests' (one a day for completing every daily quest) or 'crypt' (for clearing the Haunted Crypt)
const HW_PRIZES = [
  { id: 'ev-a-pumpkin', type: 'avatar', key: 'pumpkin', name: "Jack-o'-lantern", via: 'quests' },
  { id: 'ev-b-cobweb', type: 'banner', key: 'cobweb', name: 'Cobweb banner', via: 'quests' },
  { id: 'ev-f-halloween', type: 'frame', key: 'halloween', name: 'Witching Hour ring', via: 'quests' },
  { id: 'ev-sk-halloween', type: 'skin', key: 'halloween', name: 'Halloween Night', emo: '🎃', via: 'crypt' },
];
HW_PRIZES.forEach(p => ITEMS.push({ ...p, cost: 0, shop: false, lv: Infinity, event: 'halloween' }));
// the moon banner was a prize for a day: whoever got it keeps it
ITEMS.push({ id: 'ev-b-halloween', type: 'banner', key: 'halloween', name: 'Halloween banner', cost: 0, shop: false, lv: Infinity, event: 'halloween' });
PFX.add('halloween'); // the ring's witch and cauldron bubbles ride on the particle layers
DUNGEONS[HW_ID] = { ico: 'pumpkin', name: 'Haunted Crypt', lv: Infinity, mult: 1.5, event: true, desc: 'Your own workout, haunted: every exercise swapped for a spooky twin.' };
ITEMS.push({ id: HW_ID, type: 'dungeon', name: 'Haunted Crypt', lv: Infinity, event: 'halloween' });
SKIN_FONTS.halloween = 'Creepster&family=Nunito:wght@400;600;800';

const hwGot = () => HW_PRIZES.filter(p => G.owned.includes(p.id)).length;
const hwNext = () => HW_PRIZES.find(p => !G.owned.includes(p.id));
const hwLeft = () => { const ms = HW_END - Date.now(), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return d >= 1 ? T('{0} d {1} h left', d, h) : T('{0} h left', Math.max(1, h)); };

// your next plan workout, each exercise swapped for a similar one (the same each day)
function hwWorkout() {
  const base = dayFor(nextDayIdx()), have = equipSet(S.profile), r = rng(hash(dayId() + 'hw')), used = new Set(base.items.map(it => it.id));
  return base.items.map(it => {
    const e = BY[it.id];
    if (!e || timedSecs(it.reps) !== null) return { ...it };
    const twins = EX.filter(x => x.m[0] === e.m[0] && x.c === e.c && !used.has(x.id) && allowed(x, S.profile, have));
    const t = twins.length ? twins[Math.floor(r() * twins.length)] : e; used.add(t.id);
    return { ...it, id: t.id };
  });
}
window.startHalloween = () => {
  if (!hwOpen()) { toast('The Haunted Crypt has closed.'); return; }
  const items = hwWorkout();
  if (!items.length) return;
  startSession(tr('Haunted Crypt'), items, { dungeon: HW_ID });
};
// called by gameWorkout when a workout ends: clearing the Haunted Crypt gives the interface
function hwClear(h) {
  if (h.dungeon !== HW_ID) return null;
  const got = HW_PRIZES.filter(p => p.via === 'crypt' && !G.owned.includes(p.id)); if (!got.length) return null;
  got.forEach(p => G.owned.push(p.id)); commit();
  return got;
}
// called when a daily quest is claimed: once all of today's are claimed, the next quest prize (one a day)
function hwQuests() {
  if (!hwOpen() || G.hwQ === dayId() || G.quests.claimed.length < G.quests.list.length) return;
  const p = HW_PRIZES.find(x => x.via === 'quests' && !G.owned.includes(x.id)); if (!p) return;
  G.owned.push(p.id); G.hwQ = dayId(); commit();
  setTimeout(() => {
    if (!$('#modal').hidden) { toast(T('Halloween prize: {0}', tr(p.name))); return; }
    sfx('level'); confetti();
    modal(`<div class="hwmodal"><div class="hwbig">${hwPic(p)}</div><div class="lvup">Halloween prize</div><h2>${esc(tr(p.name))}</h2>
      <div class="mut">For completing all of today's quests.</div><button class="btn" onclick="$('#modal').hidden=true;equip('${p.id}')">Use it</button><button class="btn ghost" data-close>Later</button></div>`);
  }, 600);
}
const hwPic = p => (p.type === 'avatar' ? gi(p.key, 'hero') : p.type === 'frame' ? `<div class="av hwring fr-${p.key}" style="--p:1"><span>${gi(G.avatar)}</span></div>` : p.type === 'banner' ? `<span class="bnp bn-${p.key}"></span>` : `<span class="emo">${p.emo}</span>`);
function hwPrizeCard(r) {
  const ps = r.hw; if (!ps?.length) return '';
  return `<h2 class="sec">Halloween prizes</h2>${ps.map(p => `<div class="card row hwprize"><div class="avbig sm">${hwPic(p)}</div><div class="grow"><b>${esc(tr(p.name))}</b><div class="mut">Halloween prize</div></div>
    <button class="btn sm" onclick="equip('${p.id}')">Use it</button></div>`).join('')}`;
}
// the prizes in order; tap one to wear it for a minute
const hwTiles = () => `<div class="hwprizes">${HW_PRIZES.map(p => `<button class="hwp ${G.owned.includes(p.id) ? 'got' : ''}" onclick="event.stopPropagation();hwTry('${p.id}')" aria-label="${esc(tr(p.name))}">${hwPic(p)}<small>${G.owned.includes(p.id) ? '✓' : p.via === 'crypt' ? 'Crypt' : 'Quests'}</small></button>`).join('')}</div>
  <div class="mut hwhint">Clear the crypt for the interface. Complete all daily quests for the others, one a day. Tap a prize to try it for a minute.</div>`;
window.hwTry = id => { $('#modal').hidden = true; if (G.owned.includes(id)) { equip(id); toast(tr('Equipped')); } else tryLook(id); };
// the event on Today (inside the Train panel) and on top of Dungeons
function hwCard() {
  if (!hwOpen() || !S.profile) return '';
  const nx = hwNext();
  return `<section class="card hwcard" onclick="event.stopPropagation()"><div class="hwbats" aria-hidden="true"></div><div class="row"><div class="hwpk">${gi('pumpkin', 'hero')}</div>
    <div class="grow"><div class="mut">Halloween event · ${hwLeft()}</div><h3>Haunted Crypt</h3><div class="mut">${nx ? `Prizes · ${hwGot()}/${HW_PRIZES.length}` : 'All prizes won!'}</div></div></div>
    ${hwTiles()}
    <div class="row hwbtns"><button class="btn ghost" onclick="location.hash='#/crypt'">See the workout</button><button class="btn" onclick="startHalloween()">${gi('pumpkin')} Enter</button></div></section>`;
}
// the whole crypt workout before you enter
function cryptView() {
  if (needProfile()) return;
  const items = hwWorkout(), d = { items };
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <div class="hwpk" style="margin:0 auto">${gi('pumpkin', 'hero')}</div><h1>Haunted Crypt</h1>
  <div class="mut">${items.length} exercises · ~${planMinutes(d)} min · 1.5× XP${hwOpen() ? ` · ${hwLeft()}` : ''}</div>
  <section class="card">${items.map(it => { const e = BY[it.id]; return e ? `<div class="item"><a class="row grow" href="#/exercise/${e.id}">${thumb(e)}<div><div>${esc(e.n)}</div><div class="mut">${it.sets} × ${it.reps}</div></div></a></div>` : ''; }).join('')}</section>
  ${hwOpen() ? `<button class="btn hwgo" onclick="startHalloween()">${gi('pumpkin')} Enter the crypt</button>` : '<div class="mut">The Haunted Crypt has closed.</div>'}`;
}

// a notice when the app opens, while the event runs and prizes are left (at most every 4 hours)
setTimeout(() => {
  if (!S.profile || !hwOpen() || !hwNext() || Date.now() - (G.hwSeen || 0) < 4 * 36e5 || !$('#modal').hidden || /workout|start|victory/.test(location.hash)) return;
  G.hwSeen = Date.now(); commit(); sfx('level');
  modal(`<div class="hwmodal"><div class="hwbats" aria-hidden="true"></div><div class="hwbig">${gi('pumpkin', 'hero')}</div><div class="lvup">Halloween event</div>
    <h2>Haunted Crypt</h2><div class="mut">Your own workout, haunted. Open until 31 October.</div><b class="hwleft">${hwLeft()}</b><div class="mut">Your prizes:</div>
    ${hwTiles()}<button class="btn" onclick="$('#modal').hidden=true;startHalloween()">${gi('pumpkin')} Enter the crypt</button><button class="btn ghost" data-close>Later</button></div>`);
}, 1600);

routes.crypt = cryptView;
// with the Halloween Night interface on, your picture (Today, Hero, profile) spreads a pair of bat wings
{
  const _fx = addFx;
  addFx = function () {
    _fx();
    const on = document.documentElement.dataset.skin === 'halloween';
    document.querySelectorAll('.hud .av, .pcard .av').forEach(a => {
      const w = a.querySelector(':scope > .avw');
      if (on && !w) a.insertAdjacentHTML('beforeend', '<i class="avw l"></i><i class="avw r"></i>');
      else if (!on && w) a.querySelectorAll(':scope > .avw').forEach(e => e.remove());
    });
  };
  new MutationObserver(() => addFx()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
}

if (typeof i18nAdd === 'function') {
  i18nAdd({
    Crypt: 'Cripta', Quests: 'Misiones', 'See the workout': 'Ver el entrenamiento', Enter: 'Entrar', 'Prizes · {n}/{n}': 'Premios · {n}/{n}', 'Your prizes:': 'Tus premios:',
    'Clear the crypt for the interface. Complete all daily quests for the others, one a day. Tap a prize to try it for a minute.': 'Supera la cripta para la interfaz. Completa todas las misiones diarias para los demás, uno al día. Toca un premio para probarlo un minuto.',
    "For completing all of today's quests.": 'Por completar todas las misiones de hoy.', 'Halloween prize: {0}': 'Premio de Halloween: {0}', '{n} exercises · ~{n} min · 1.5× XP': '{n} ejercicios · ~{n} min · 1,5× XP',
    'Haunted Crypt': 'Cripta embrujada', "Jack-o'-lantern": 'Calabaza de Halloween', 'Halloween banner': 'Banner de Halloween', 'Halloween Night': 'Noche de Halloween',
    'Halloween event ·': 'Evento de Halloween ·', 'Next prize: {n}': 'Próximo premio: {n}', 'All prizes won!': '¡Todos los premios conseguidos!', 'Enter the crypt': 'Entrar en la cripta',
    'Halloween prize · {n}/{n}': 'Premio de Halloween · {n}/{n}', 'Use it': 'Usar', 'The Haunted Crypt has closed.': 'La cripta embrujada ya ha cerrado.',
    'Your own workout, haunted: every exercise swapped for a spooky twin.': 'Tu propio entrenamiento, embrujado: cada ejercicio cambiado por un gemelo terrorífico.',
    'Cobweb banner': 'Banner de telaraña', 'Witching Hour ring': 'Aro de la hora bruja', 'Witching Hour': 'Hora bruja', Try: 'Probar', 'Tap a prize to try it for a minute.': 'Toca un premio para probarlo un minuto.', Equipped: 'Puesto', Later: 'Más tarde', 'Halloween event': 'Evento de Halloween',
    'Your own workout, haunted. Open until 31 October.': 'Tu propio entrenamiento, embrujado. Abierta hasta el 31 de octubre.', 'Clear it once to win every prize:': 'Supérala una vez y ganas todos los premios:', 'Clear it once to win every prize': 'Supérala una vez y ganas todos los premios', 'Halloween prizes': 'Premios de Halloween', 'Halloween prize': 'Premio de Halloween', Cobweb: 'Telaraña',
    '{0} d {1} h left': 'quedan {0} d {1} h', '{0} h left': 'quedan {0} h', Halloween: 'Halloween',
  });
  i18nPat(/^Next prize: (.+) · (\d+)\/(\d+)$/, (a, b, c) => `Próximo premio: ${tr(a)} · ${b}/${c}`);
}
