'use strict';
// Halloween event: until the end of 31 October 2026 (it closes at midnight, 1 November) the Haunted Crypt opens.
// It is your own next workout with each exercise swapped for a spooky twin (same main muscle and kind, your equipment),
// and every clear gives the next prize: a jack-o'-lantern profile picture, a Halloween banner and the Halloween Night
// interface (and a cobweb banner on the way). Any prize can be tried for a minute from the event card. The prizes are event-only: never in the shop or in chests, and they stay yours after the event.
const HW_END = new Date(2026, 10, 1).getTime(); // local midnight starting 1 November
const hwOpen = () => Date.now() < HW_END;
const HW_ID = 'd-halloween';
// the event's prizes, in order
const HW_PRIZES = [
  { id: 'ev-a-pumpkin', type: 'avatar', key: 'pumpkin', name: "Jack-o'-lantern" },
  { id: 'ev-b-cobweb', type: 'banner', key: 'cobweb', name: 'Cobweb banner' },
  { id: 'ev-b-halloween', type: 'banner', key: 'halloween', name: 'Halloween banner' },
  { id: 'ev-sk-halloween', type: 'skin', key: 'halloween', name: 'Halloween Night', emo: '🎃' },
];
HW_PRIZES.forEach(p => ITEMS.push({ ...p, cost: 0, shop: false, lv: Infinity, event: 'halloween' }));
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
// called by gameWorkout when a workout ends: a Haunted Crypt clear gives the next prize
function hwClear(h) {
  if (h.dungeon !== HW_ID) return null;
  const p = hwNext(); if (!p) return null;
  G.owned.push(p.id); commit();
  return p;
}
const hwPic = p => (p.type === 'avatar' ? gi(p.key, 'hero') : p.type === 'banner' ? `<span class="bnp bn-${p.key}"></span>` : `<span class="emo">${p.emo}</span>`);
function hwPrizeCard(r) {
  const p = r.hw; if (!p) return '';
  return `<div class="card row hwprize"><div class="avbig sm">${hwPic(p)}</div><div class="grow"><b>${esc(tr(p.name))}</b><div class="mut">Halloween prize · ${hwGot()}/${HW_PRIZES.length}</div></div>
    <button class="btn sm" onclick="equip('${p.id}')">Use it</button></div>`;
}
// the prizes in order; tap one to wear it for a minute
const hwTiles = () => `<div class="hwprizes">${HW_PRIZES.map(p => `<button class="hwp ${G.owned.includes(p.id) ? 'got' : ''}" onclick="event.stopPropagation();hwTry('${p.id}')" aria-label="${esc(tr(p.name))}">${hwPic(p)}<small>${G.owned.includes(p.id) ? '✓' : 'Try'}</small></button>`).join('')}</div>
  <div class="mut hwhint">Tap a prize to try it for a minute.</div>`;
window.hwTry = id => { $('#modal').hidden = true; if (G.owned.includes(id)) { equip(id); toast(tr('Equipped')); } else tryLook(id); };
// the event on Today (inside the Train panel) and on top of Dungeons
function hwCard() {
  if (!hwOpen() || !S.profile) return '';
  const nx = hwNext();
  return `<section class="card hwcard" onclick="event.stopPropagation()"><div class="hwbats" aria-hidden="true"></div><div class="row"><div class="hwpk">${gi('pumpkin', 'hero')}</div>
    <div class="grow"><div class="mut">Halloween event · ${hwLeft()}</div><h3>Haunted Crypt</h3><div class="mut">${nx ? `Next prize: ${esc(tr(nx.name))} · ${hwGot()}/${HW_PRIZES.length}` : 'All prizes won!'}</div></div></div>
    ${hwTiles()}
    <button class="btn" onclick="startHalloween()">${gi('pumpkin')} Enter the crypt</button></section>`;
}

// a notice when the app opens, while the event runs and prizes are left (at most every 4 hours)
setTimeout(() => {
  if (!S.profile || !hwOpen() || !hwNext() || Date.now() - (G.hwSeen || 0) < 4 * 36e5 || !$('#modal').hidden || /workout|start|victory/.test(location.hash)) return;
  G.hwSeen = Date.now(); commit(); sfx('level');
  modal(`<div class="hwmodal"><div class="hwbats" aria-hidden="true"></div><div class="hwbig">${gi('pumpkin', 'hero')}</div><div class="lvup">Halloween event</div>
    <h2>Haunted Crypt</h2><div class="mut">Your own workout, haunted. Open until 31 October.</div><b class="hwleft">${hwLeft()}</b><div class="mut">Every clear wins the next prize:</div>
    ${hwTiles()}<button class="btn" onclick="$('#modal').hidden=true;startHalloween()">${gi('pumpkin')} Enter the crypt</button><button class="btn ghost" data-close>Later</button></div>`);
}, 1600);

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Haunted Crypt': 'Cripta embrujada', "Jack-o'-lantern": 'Calabaza de Halloween', 'Halloween banner': 'Banner de Halloween', 'Halloween Night': 'Noche de Halloween',
    'Halloween event ·': 'Evento de Halloween ·', 'Next prize: {n}': 'Próximo premio: {n}', 'All prizes won!': '¡Todos los premios conseguidos!', 'Enter the crypt': 'Entrar en la cripta',
    'Halloween prize · {n}/{n}': 'Premio de Halloween · {n}/{n}', 'Use it': 'Usar', 'The Haunted Crypt has closed.': 'La cripta embrujada ya ha cerrado.',
    'Your own workout, haunted: every exercise swapped for a spooky twin.': 'Tu propio entrenamiento, embrujado: cada ejercicio cambiado por un gemelo terrorífico.',
    'Cobweb banner': 'Banner de telaraña', Try: 'Probar', 'Tap a prize to try it for a minute.': 'Toca un premio para probarlo un minuto.', Equipped: 'Puesto', Later: 'Más tarde', 'Halloween event': 'Evento de Halloween',
    'Your own workout, haunted. Open until 31 October.': 'Tu propio entrenamiento, embrujado. Abierta hasta el 31 de octubre.', 'Every clear wins the next prize:': 'Cada vez que la superes ganas el siguiente premio:', Cobweb: 'Telaraña',
    '{0} d {1} h left': 'quedan {0} d {1} h', '{0} h left': 'quedan {0} h', Halloween: 'Halloween',
  });
  i18nPat(/^Next prize: (.+) · (\d+)\/(\d+)$/, (a, b, c) => `Próximo premio: ${tr(a)} · ${b}/${c}`);
}
