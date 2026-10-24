'use strict';
// Rewards screens and the profile editor.
//  Levels: automatic unlocks (meals, workouts, perks).   Shop: coin purchases (looks and boosts).   Badges: achievements.
// Runs after game.js and shares its globals.

const RW_TABS = [['levels', 'Levels'], ['shop', 'Shop'], ['badges', 'Badges']];
const rwSeg = on => `<div class="seg">${RW_TABS.map(([k, l]) => `<a class="${on === k ? 'on' : ''}" href="#/rewards/${k}">${l}</a>`).join('')}</div>`;
const chestBtn = () => G.chests.length ? `<button class="btn chestbtn" onclick="openChest()">${gi(CHEST[G.chests[0]][1])} Open ${CHEST[G.chests[0]][0].toLowerCase()}${G.chests.length > 1 ? ` (+${G.chests.length - 1} more)` : ''}</button>` : '';

// ---------- coin shop: boosts and chests ----------
const BOOSTS = [
  { id: 'x-boost', name: 'XP booster', desc: 'Double XP from workouts for 24 hours', cost: 150, ico: 'upgrade', act: () => { G.boostUntil = Math.max(Date.now(), G.boostUntil || 0) + 864e5; } },
  { id: 'x-spin', name: 'Extra spin', desc: 'One more turn of the daily wheel', cost: 60, ico: 'slot', act: () => { G.extraSpins = (G.extraSpins || 0) + 1; } },
  { id: 'x-wood', name: 'Wooden chest', desc: 'Coins, XP or a small look', cost: 100, ico: 'crate', act: () => G.chests.push('wood') },
  { id: 'x-silver', name: 'Silver chest', desc: 'Better odds of a new look', cost: 250, ico: 'chest-silver', act: () => G.chests.push('silver') },
  { id: 'x-gold', name: 'Golden chest', desc: 'The best odds of a rare look', cost: 600, ico: 'chest-gold', act: () => G.chests.push('gold') },
];
window.buyBoost = id => {
  const b = BOOSTS.find(x => x.id === id);
  if (G.coins < b.cost) { toast(`Need ${b.cost - G.coins} more coins.`); return; }
  G.coins -= b.cost; b.act(); commit(); sfx('claim'); toast(`${b.name} bought`); route();
};

// ---------- Levels ----------
function levelsView() {
  const L = lvl(), max = Math.min(30, Math.max(L + 8, 14));
  const next = ITEMS.filter(i => !i.shop && i.lv > L).sort((a, b) => a.lv - b.lv)[0], perks = ITEMS.filter(i => i.type === 'perk' && has(i));
  return `${hud()}${rwSeg('levels')}${chestBtn()}
  <p class="mut">Levels unlock new <b>meals</b>, <b>workouts</b> and <b>perks</b>. Coins are spent in the Shop on looks and boosts.</p>
  ${next ? `<section class="card row"><div class="dgi">${ICO(next)}</div><div class="grow"><div class="mut">Next unlock · level ${next.lv}</div><h3>${esc(next.name)}</h3><div class="mut">${KIND[next.type]} · ${(totalXp(next.lv) - G.xp).toLocaleString(dateLocale())} XP to go</div></div></section>` : ''}
  ${perks.length ? `<h2 class="sec">Active perks</h2><div class="card">${perks.map(p => `<div class="row" style="padding:7px 0"><span style="font-size:26px">${gi(p.ico, 'hero')}</span><div><b>${esc(p.name)}</b><div class="mut">${esc(p.desc)}</div></div></div>`).join('')}</div>` : ''}
  <h2 class="sec">Reward road</h2><div class="road">${Array.from({ length: max }, (_, k) => k + 1).map(n => {
    const its = ITEMS.filter(i => !i.shop && i.lv === n && n > 1);
    return `<div class="rl ${n < L ? 'past' : n === L ? 'now' : ''}"><div class="dot">${n}</div><div class="grow"><div class="mut">Level ${n}${n > 1 ? ` · +${20 + 5 * n} coins` : ''}</div>
    ${n % 5 === 0 ? `<div class="ri">${gi(n % 10 === 0 ? 'chest-gold' : 'chest-silver', 'hero')} ${n % 10 === 0 ? 'Golden' : 'Silver'} chest</div>` : ''}
    ${its.map(i => `<div class="ri">${ICO(i)} ${esc(i.name)} <span class="mut">${KIND[i.type]}</span>${i.desc ? `<div class="mut" style="font-weight:400">${esc(i.desc)}</div>` : ''}</div>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

// ---------- Shop ----------
function equipped(i) { return i.type === 'theme' ? G.theme === i.key : i.type === 'avatar' ? G.avatar === i.key : i.type === 'frame' ? G.frame === i.key : i.type === 'panel' ? (G.panel || 'chamfer') === i.key : i.type === 'skin' ? (G.skin || 'hud') === i.key : G.banner === i.key; }
function preview(i) {
  return i.type === 'theme' ? `<div class="swc" style="background:linear-gradient(135deg,${i.sw[0]},${i.sw[1]})"></div>`
    : i.type === 'avatar' ? `<div class="pv">${gi(i.key, 'hero')}</div>`
    : i.type === 'frame' ? `<div class="av fr-${i.key}" style="--p:.6;width:54px;height:54px"><span>${gi(G.avatar, 'hero')}</span></div>`
    : i.type === 'panel' ? panelPrev(i.key)
    : i.type === 'skin' ? skinPrev(i)
    : `<div class="bnp bn-${i.key}"></div>`;
}
// a mini card drawn in that panel style
// themes recolour the Sci-fi HUD; other interfaces keep their own colours
const themeNote = () => { const k = G.skin || 'hud'; if (k === 'hud') return ''; const it = ITEMS.find(i => i.type === 'skin' && i.key === k);
  return `<div class="mut themenote">${it.emo} Themes recolour ${esc(it.name)} too. Choose Cyber HUD to see its original colours.</div>`; };
const skinPrev = i => `<div class="skp" data-sk="${i.key}">${i.emo}</div>`;
const panelPrev = k => `<div class="pnp" data-pn="${k}"><i></i><b></b><b></b></div>`;
function tile(i) {
  const own = has(i);
  const act = own ? (equipped(i) ? '<b class="eq">Equipped</b>' : `<button class="btn sm ghost" onclick="equip('${i.id}')">Equip</button>`)
    : `<button class="btn sm ${G.coins >= i.cost ? 'gold' : 'ghost'}" onclick="buy('${i.id}')">${gi('coin', 'cn')} ${i.cost}</button>`;
  const tryb = i.type === 'skin' && !own ? `<button class="btn sm ghost" onclick="trySkin('${i.key}')">Try</button>` : '';
  return `<div class="card sw">${preview(i)}<b>${esc(i.name)}</b>${tryb}${act}</div>`;
}
function shopView() {
  const by = t => ITEMS.filter(i => i.type === t && i.cost > 0).sort((a, b) => a.cost - b.cost), owned = t => by(t).filter(has).length;
  const hrs = Math.ceil(((G.boostUntil || 0) - Date.now()) / 36e5);
  return `${hud()}${rwSeg('shop')}${chestBtn()}
  <p class="mut">Coins buy looks and boosts. Earn them from workouts, quests, chests and the daily spin. <a href="#/earn" style="color:var(--acc2)">All the ways to earn</a>.</p>
  <h2 class="sec">Interfaces · ${owned('skin')}/${by('skin').length}</h2><p class="mut">A whole new look for the app: frames, fonts, colours and background. Tap Try to preview one.</p><div class="grid2">${by('skin').map(tile).join('')}</div>
  <h2 class="sec">Boosts and chests</h2>
  ${BOOSTS.map(b => `<div class="card row"><div class="dgi">${gi(b.ico)}</div><div class="grow"><b>${b.name}</b><div class="mut">${b.desc}${b.id === 'x-boost' && boostOn() ? ` · active, ${hrs} h left` : ''}${b.id === 'x-spin' && G.extraSpins ? ` · you have ${G.extraSpins}` : ''}</div></div>
    <button class="btn sm ${G.coins >= b.cost ? 'gold' : 'ghost'}" onclick="buyBoost('${b.id}')">${gi('coin', 'cn')} ${b.cost}</button></div>`).join('')}
  <h2 class="sec">Profile pictures · ${owned('avatar')}/${by('avatar').length}</h2><div class="grid3">${by('avatar').map(tile).join('')}</div>
  <h2 class="sec">Rings · ${owned('frame')}/${by('frame').length}</h2><div class="grid3">${by('frame').map(tile).join('')}</div>
  <h2 class="sec">Banners · ${owned('banner')}/${by('banner').length}</h2><div class="grid2">${by('banner').map(tile).join('')}</div>
  <h2 class="sec">Panel styles · ${owned('panel')}/${by('panel').length}</h2><div class="grid2">${by('panel').map(tile).join('')}</div>
  <h2 class="sec">App themes · ${owned('theme')}/${by('theme').length}</h2>${themeNote()}<div class="grid2">${by('theme').map(tile).join('')}</div>`;
}

// ---------- Badges ----------
function badgesView() {
  return `${hud()}${rwSeg('badges')}<h2 class="sec">Badges · ${G.ach.length}/${ACH.length}</h2>
  ${ACH.map(a => { const got = G.ach.includes(a.id); return `<div class="card row ${got ? '' : 'locked'}"><div class="avbig sm">${got ? gi(a.i, 'hero') : gi('lock')}</div><div class="grow"><b>${a.n}</b><div class="mut">${a.d}${a.t ? ` · title: ${a.t}` : ''}</div></div><span class="mut">+${a.xp} XP</span></div>`; }).join('')}`;
}

function rewards(sub) {
  if (needProfile()) return;
  view.innerHTML = sub === 'shop' ? shopView() : sub === 'badges' ? badgesView() : levelsView();
}

// ---------- Profile editor ----------
window.saveName = () => { S.profile.name = $('#pname').value.trim().slice(0, 20); save('profile', S.profile); toast('Name saved'); route(); };
function profileView() {
  if (needProfile()) return;
  const p = S.profile, L = lvl(), a = totalXp(L), b = totalXp(L + 1), pct = (G.xp - a) / (b - a);
  const mine = t => ITEMS.filter(i => i.type === t && has(i)).sort((x, y) => x.cost - y.cost);
  const more = t => { const n = ITEMS.filter(i => i.type === t && !has(i)).length; return n ? `<a class="btn ghost sm moreb" href="#/rewards/shop">${n} more in the Shop</a>` : ''; };
  const pick = (i, inner) => `<button class="pick ${equipped(i) ? 'on' : ''}" onclick="equip('${i.id}')" aria-label="${esc(i.name)}" title="${esc(i.name)}">${inner}</button>`;
  const titles = ACH.filter(x => x.t && G.ach.includes(x.id));
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <section class="pcard bn-${G.banner}"><div class="av fr-${G.frame}" style="--p:${pct.toFixed(3)}"><span>${gi(G.avatar, 'hero')}</span><i class="lv">${L}</i></div>
    <div class="hn" style="font-size:32px">${esc(p.name || 'Player')}</div><div class="mut">${title()} · level ${L}</div></section>
  <label class="fld"><span>Name</span><div class="row"><input id="pname" value="${esc(p.name || '')}" maxlength="20" autocomplete="nickname"><button class="btn sm" onclick="saveName()">Save</button></div></label>
  <h2 class="sec">Profile picture</h2><div class="pgrid">${mine('avatar').map(i => pick(i, gi(i.key, 'hero'))).join('')}</div>${more('avatar')}
  <h2 class="sec">Ring</h2><div class="pgrid">${mine('frame').map(i => pick(i, `<div class="av fr-${i.key}" style="--p:.6;width:40px;height:40px"><span>${gi(G.avatar, 'hero')}</span></div>`)).join('')}</div>${more('frame')}
  <h2 class="sec">Banner</h2><div class="pgrid wide">${mine('banner').map(i => pick(i, `<span class="bnp bn-${i.key}"></span>`)).join('')}</div>${more('banner')}
  <h2 class="sec">Interface</h2><div class="pgrid wide">${mine('skin').map(i => pick(i, skinPrev(i))).join('')}</div>${more('skin')}
  <h2 class="sec">Panel style</h2><div class="pgrid wide">${mine('panel').map(i => pick(i, panelPrev(i.key))).join('')}</div>${more('panel')}
  <h2 class="sec">Theme</h2>${themeNote()}<div class="pgrid">${mine('theme').map(i => pick(i, `<span class="swc round" style="background:linear-gradient(135deg,${i.sw[0]},${i.sw[1]})"></span>`)).join('')}</div>${more('theme')}
  <h2 class="sec">Title</h2><div class="chips"><button class="chip ${G.title ? '' : 'on'}" onclick="equipTitle('')">${TITLES.filter(t => t[0] <= L).at(-1)[1]} · by level</button>
    ${titles.map(x => `<button class="chip ${G.title === x.id ? 'on' : ''}" onclick="equipTitle('${x.id}')">${x.t}</button>`).join('')}</div>
  <div class="mut">More titles come from badges.</div>
  <h2 class="sec">Body and training</h2>
  <section class="card"><div class="row between"><span class="mut">Body</span><b>${p.age} y · ${p.height} cm · ${curWeight()} kg</b></div>
    <div class="row between"><span class="mut">Goal</span><b>${GOALS[p.goal][0]}</b></div><div class="row between"><span class="mut">Schedule</span><b>${p.days} days · ${p.minutes} min</b></div></section>
  <button class="btn" onclick="location.hash='#/start/edit'">Edit body data and training plan</button>
  <p class="mut">${GI_CREDIT}</p>`;
}
// preview an interface for one minute anywhere in the app, with a countdown bar
let tryT = null;
window.endTry = () => { clearInterval(tryT); tryT = null; document.getElementById('trybar')?.remove(); setSkin(G.skin || 'hud'); };
window.trySkin = k => {
  if (tryT) clearInterval(tryT);
  setSkin(k);
  const it = ITEMS.find(i => i.type === 'skin' && i.key === k), end = Date.now() + 60000;
  let bar = document.getElementById('trybar');
  if (!bar) { bar = document.createElement('div'); bar.id = 'trybar'; document.body.appendChild(bar); }
  const draw = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    if (!left || (G.skin || 'hud') === k || document.documentElement.dataset.skin !== k) { endTry(); return; }
    bar.innerHTML = `<span>${it.emo} ${esc(tr(it.name))} · ${tr('Preview')} 0:${String(left).padStart(2, '0')}</span><button class="btn sm" onclick="endTry()">${tr('End')}</button>`;
  };
  draw(); tryT = setInterval(draw, 1000);
  toast('Preview for one minute. Look around the app!');
};
window.equipTitle = id => { G.title = id; commit(); route(); };

Object.assign(routes, { rewards, profile: profileView });
