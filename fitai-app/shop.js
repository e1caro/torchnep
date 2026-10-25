'use strict';
// Rewards screens and the profile editor.
//  Levels: automatic unlocks (meals, workouts, perks).   Shop: coin purchases (looks and boosts).   Badges: achievements.
// Runs after game.js and shares its globals.

// Stats, levels and badges are the three tabs of Progress; the shop is a tab of its own.
const RW_TABS = [['stats', 'Overview', '#/progress'], ['levels', 'Levels', '#/rewards/levels'], ['badges', 'Badges', '#/rewards/badges']];
const rwSeg = on => `<div class="seg">${RW_TABS.map(([k, l, h]) => `<a class="${on === k ? 'on' : ''}" href="${h}">${l}</a>`).join('')}</div>`;
const coinTag = () => `<span class="coins">${gi('coin', 'cn')} ${G.coins}</span>`;

// ---------- coin shop: boosts and chests ----------
const BOOSTS = [
  { id: 'x-boost', name: 'XP booster', desc: 'Double XP from workouts for 24 hours', cost: 150, ico: 'upgrade', act: () => { G.boostUntil = Math.max(Date.now(), G.boostUntil || 0) + 864e5; } },
  { id: 'x-spin', name: 'Extra spin', desc: 'One more turn of the daily wheel', cost: 60, ico: 'slot', act: () => { G.extraSpins = (G.extraSpins || 0) + 1; } },
  { id: 'x-wood', name: 'Wooden chest', desc: 'Coins or a small look', cost: 100, ico: 'crate', act: () => G.chests.push('wood') },
  { id: 'x-silver', name: 'Silver chest', desc: 'Better odds of a new look', cost: 250, ico: 'chest-silver', act: () => G.chests.push('silver') },
  { id: 'x-gold', name: 'Golden chest', desc: 'The best odds of a rare look', cost: 600, ico: 'chest-gold', act: () => G.chests.push('gold') },
];
window.buyBoost = id => {
  const b = BOOSTS.find(x => x.id === id);
  if (G.coins < b.cost) { toast(`Need ${b.cost - G.coins} more coins.`); return; }
  G.coins -= b.cost; b.act(); commit(); sfx('claim'); toast(`${b.name} bought`); route();
};

// ---------- confirm before spending, and selling back ----------
// every purchase asks first; owned looks can be sold back for 80% of their price
const SELL = .8, sellPrice = i => Math.round((G.paid?.[i.id] ?? i.cost) * SELL); // 80% of what you paid (a deal sells for less)
const SELL_DEF = { theme: 'hud', panel: 'chamfer', skin: 'clean', avatar: 'glove', banner: 'plain', frame: 'none' }; // the free look of each kind
function askCoins(title, pic, name, delta, yes, fn, note = '') {
  modal(`<div class="avbig">${pic}</div><div class="lvup">${title}</div><h2>${esc(name)}</h2>
  ${note ? `<div class="mut">${note}</div>` : ''}<div class="cfm"><div class="row between"><span>${delta < 0 ? 'Price' : 'You get'}</span><b>${gi('coin', 'cn')} ${Math.abs(delta)}</b></div>
  <div class="row between"><span>Your coins after</span><b>${gi('coin', 'cn')} ${G.coins + delta}</b></div></div>
  <div class="row cfmb"><button class="btn ghost" data-close>Cancel</button><button class="btn ${delta < 0 ? 'gold' : ''}" id="cfmyes">${yes}</button></div>`);
  $('#cfmyes').onclick = () => { $('#modal').hidden = true; fn(); };
}
const itemPic = i => i.type === 'skin' ? `<i class="emo">${i.emo}</i>` : ICO(i);
const _buyNow = window.buy, _boostNow = window.buyBoost;
window.buy = id => {
  const i = item(id);
  if (!i.shop || has(i) || G.coins < priceOf(i)) return _buyNow(id); // the usual messages
  askCoins(`Buy this ${KIND[i.type].toLowerCase()}?`, itemPic(i), i.name, -priceOf(i), 'Buy', () => _buyNow(id));
};
window.buyBoost = id => {
  const b = BOOSTS.find(x => x.id === id);
  if (G.coins < b.cost) return _boostNow(id);
  askCoins('Buy this?', gi(b.ico, 'hero'), b.name, -b.cost, 'Buy', () => _boostNow(id));
};
window.sell = id => {
  const i = item(id);
  if (!has(i) || !i.shop || !i.cost) return;
  // selling what you are wearing puts the free look of that kind back on
  const on = equipped(i), def = ITEMS.find(x => x.type === i.type && x.key === SELL_DEF[i.type]);
  askCoins(`Sell this ${KIND[i.type].toLowerCase()}?`, itemPic(i), i.name, sellPrice(i), 'Sell', () => {
    const got = sellPrice(i); G.owned = G.owned.filter(x => x !== id); G.coins += got; if (G.paid) delete G.paid[id];
    if (on) { G[i.type] = SELL_DEF[i.type]; applyTheme(); }
    commit(); sfx('claim'); toast(`Sold for ${got} coins`); route();
  }, on ? `You are using it, so you will switch back to ${def ? def.name : 'the default look'}.` : '');
};

// ---------- Levels ----------
const LOOKS = ['avatar', 'frame', 'banner', 'theme', 'panel', 'skin']; // kinds of look that can be tried on
// one level of the reward road
// one level of the reward road: only the workouts, level-only looks and perks it unlocks (coins, chests and recipes come
// every level, and shop sections show their own lock in the Shop, so none of those are repeated here)
function roadRow(n) {
  const L = lvl(), its = ITEMS.filter(i => !i.shop && i.lv === n && n > 1 && i.type !== 'recipe');
  if (!its.length && n !== L) return '';
  const pct = n === L ? (G.xp - totalXp(L)) / (totalXp(L + 1) - totalXp(L)) * 100 : 0;
  return `<div class="rl ${n < L ? 'past' : n === L ? 'now' : ''}"><div class="dot">${n}</div><div class="grow"><div class="mut">Level ${n}</div>
  ${n === L ? `<div class="xpbar"><i style="width:${pct.toFixed(1)}%"></i></div>` : ''}
  ${its.map(i => `<div class="ri ${LOOKS.includes(i.type) ? 'trytap' : ''}" ${LOOKS.includes(i.type) ? `onclick="tryLook('${i.id}')"` : ''}>${ICO(i)} <span class="rn">${esc(i.name)}${LOOKS.includes(i.type) && !has(i) ? ` <span class="trychip">${TRY[i.type]?.key === i.key ? 'Trying' : 'Try'}</span>` : ''}</span> <span class="mut">${KIND[i.type]}</span></div>`).join('')}</div></div>`;
}
const roadRows = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => roadRow(a + k)).join('');
function levelsView() {
  const L = lvl(), max = 50; // the next levels; the rest of the road (up to 50) is folded
  const perks = ITEMS.filter(i => i.type === 'perk' && has(i));
  return `${rwSeg('levels')}
  ${perks.length ? `<h2 class="sec">Active perks</h2><div class="card">${perks.map(p => `<div class="row" style="padding:7px 0"><span style="font-size:26px">${gi(p.ico, 'hero')}</span><div><b>${esc(p.name)}</b><div class="mut">${esc(p.desc)}</div></div></div>`).join('')}</div>` : ''}
  <h2 class="sec">Reward road</h2><div class="road">${roadRows(L, Math.min(max, L + 5))}</div>
  ${L + 5 < max ? `<details class="fold"><summary><h2 class="sec">Levels ${L + 6}–${max}</h2></summary><div class="road">${roadRows(L + 6, max)}</div></details>` : ''}`;
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
const themeNote = () => ''; // no note needed: the "Basic" theme's name says it keeps each interface's own colours
const skinPrev = i => `<div class="skp" data-sk="${i.key}">${i.emo}</div>`;
const panelPrev = k => `<div class="pnp" data-pn="${k}"><i></i><b></b><b></b></div>`;
function tile(i) {
  const own = has(i);
  const sellB = i.cost ? `<button class="btn sm ghost sellb" onclick="sell('${i.id}')">Sell · ${gi('coin', 'cn')} ${sellPrice(i)}</button>` : '';
  const act = own ? (equipped(i) && !TRY[i.type] ? `<b class="eq">Equipped</b>${sellB}` : `<button class="btn sm ghost" onclick="equip('${i.id}')">Equip</button>${sellB}`)
    : !shopOpen(i.type) ? `<span class="btn sm ghost lockb">${gi('lock')} Level ${SHOP_LV[i.type]}</span>`
    : `<button class="btn sm ${G.coins >= priceOf(i) ? 'gold' : 'ghost'}" onclick="buy('${i.id}')">${gi('coin', 'cn')} ${priceOf(i)}${isDeal(i) ? ` <s>${i.cost}</s>` : ''}</button>`;
  const trying = TRY[i.type]?.key === i.key;
  const tryb = own ? '' : trying ? `<button class="btn sm ghost on" onclick="endTry('${i.type}')">Trying · end</button>` : `<button class="btn sm ghost tryb" onclick="tryLook('${i.id}')">Try</button>`;
  const [, rk, rn] = rarityOf(i);
  return `<div class="card sw r-${rk}${own ? ' own' : ''}"><span class="rar">${rn}</span>${preview(i)}<b>${esc(i.name)}</b><div class="swact">${tryb}${act}</div></div>`;
}
// The shop: today's three deals, then one kind of item at a time (tabs), shown as cards with a rarity by price.
let SHOP_TAB = (() => { try { return JSON.parse(localStorage.getItem('fc.shoptab')) || 'avatar'; } catch { return 'avatar'; } })();
window.shopTab = t => { SHOP_TAB = t; try { localStorage.setItem('fc.shoptab', JSON.stringify(t)); } catch { /* storage blocked */ } route(); };
const RARITY = [[900, 'legendary', 'Legendary'], [400, 'epic', 'Epic'], [150, 'rare', 'Rare'], [0, 'common', 'Common']];
const rarityOf = i => RARITY.find(([min]) => i.cost >= min);
const SHOP_TABS = [['avatar', 'user'], ['frame', 'frame'], ['banner', 'banner'], ['theme', 'palette'], ['panel', 'frame'], ['skin', 'temple'], ['boost', 'upgrade']];
function shopView() {
  const by = t => ITEMS.filter(i => i.type === t && i.cost > 0).sort((a, b) => a.cost - b.cost);
  const hrs = Math.ceil(((G.boostUntil || 0) - Date.now()) / 36e5), left = new Date().setHours(24, 0, 0, 0) - Date.now();
  const tab = SHOP_TABS.some(([t]) => t === SHOP_TAB) ? SHOP_TAB : 'avatar';
  const ds = deals();
  const deal = i => `<button class="deal r-${rarityOf(i)[1]}" onclick="buy('${i.id}')"><span class="off">−${Math.round(DEAL_OFF * 100)}%</span>${preview(i)}<b>${esc(i.name.replace(/ panels$| banner$/, ''))}</b>
    <span class="dprice"><s>${i.cost}</s> ${gi('coin', 'cn')} ${priceOf(i)}</span></button>`;
  const body = tab === 'boost'
    ? BOOSTS.map(b => `<div class="card row boostrow"><div class="dgi">${gi(b.ico)}</div><div class="grow"><b>${b.name}</b><div class="mut">${b.desc}${b.id === 'x-boost' && boostOn() ? ` · active, ${hrs} h left` : ''}${b.id === 'x-spin' && G.extraSpins ? ` · you have ${G.extraSpins}` : ''}</div></div>
      <button class="btn sm ${G.coins >= b.cost ? 'gold' : 'ghost'}" onclick="buyBoost('${b.id}')">${gi('coin', 'cn')} ${b.cost}</button></div>`).join('')
    : `${shopOpen(tab) ? (tab === 'theme' ? themeNote() : '') : `<div class="card lockcard">${gi('lock', 'hero')}<div><b>Opens at level ${SHOP_LV[tab]}</b><div class="mut">Try any of them for a minute meanwhile.</div></div></div>`}
      <div class="shopgrid ${['skin', 'banner', 'panel'].includes(tab) ? 'wide' : ''}">${by(tab).map(tile).join('')}</div>`;
  return `<div class="shophead"><div><h1>Shop</h1></div>${coinTag()}</div>
  ${ds.length ? `<div class="dealhead"><h2 class="sec">Today's deals</h2><span class="mut">${gi('stopwatch')} ${Math.floor(left / 36e5)}h ${Math.floor(left / 6e4) % 60}m</span></div><div class="deals">${ds.map(deal).join('')}</div>` : ''}
  <div class="shoptabs" data-noswipe>${SHOP_TABS.map(([t, ico]) => `<button class="stab ${t === tab ? 'on' : ''}" onclick="shopTab('${t}')">${gi(ico)}<span>${t === 'boost' ? 'Boosts' : SHOP_NAME[t]}</span>${t !== 'boost' && !shopOpen(t) ? `<i class="lk">${gi('lock')}</i>` : ''}</button>`).join('')}</div>
  ${body}`;
}
// ---------- Badges ----------
function badgesView() {
  return `${rwSeg('badges')}<h2 class="sec">Badges · ${G.ach.length}/${ACH.length}</h2>
  ${ACH.map(a => { const got = G.ach.includes(a.id); return `<div class="card row ${got ? '' : 'locked'}"><div class="avbig sm">${got ? gi(a.i, 'hero') : gi('lock')}</div><div class="grow"><b>${a.n}</b><div class="mut">${a.d}${a.t ? ` · title: ${a.t}` : ''}</div></div></div>`; }).join('')}`;
}

function rewards(sub) {
  if (needProfile()) return;
  view.innerHTML = sub === 'shop' ? shopView() : sub === 'badges' ? badgesView() : levelsView();
}

// ---------- Profile editor ----------
window.saveName = () => { S.profile.name = $('#pname').value.trim().slice(0, 20); save('profile', S.profile); toast('Name saved'); route(); };
// open the shop on just one kind of look (the other sections stay folded, and can still be opened)
let SHOP_FOCUS = null;
window.shopAt = t => { SHOP_FOCUS = t; SHOP_TAB = t; location.hash = '#/rewards/shop'; };
// The looks of one kind you own, to pick the one to wear (the profile only shows what you wear).
const COS = [
  ['avatar', 'Profile picture', '', i => gi(i.key, 'hero')],
  ['frame', 'Ring', '', i => `<div class="av fr-${i.key}" style="--p:.6;width:40px;height:40px"><span></span></div>`], // just the ring (the shop shows it with your picture)
  ['banner', 'Banner', 'wide', i => `<span class="bnp bn-${i.key}"></span>`],
  ['skin', 'Interface', 'wide', i => skinPrev(i)],
  ['panel', 'Panel style', 'wide', i => panelPrev(i.key)],
  ['theme', 'Theme', '', i => `<span class="swc round" style="background:linear-gradient(135deg,${i.sw[0]},${i.sw[1]})"></span>`],
];
function looksView(t) {
  const c = COS.find(x => x[0] === t); if (!c) { location.hash = '#/profile'; return; }
  const [, name, wide, prev] = c, mine = ITEMS.filter(i => i.type === t && has(i)).sort((x, y) => x.cost - y.cost || (x.lv || 0) - (y.lv || 0)), more = ITEMS.filter(i => i.type === t && !has(i)).length;
  view.innerHTML = `<button class="btn sm ghost back" onclick="location.hash='#/profile'">${ic('back', 18)} Back</button><h1>${name}</h1>
  <div class="mut">${mine.length} owned · tap one to use it</div>${t === 'theme' ? themeNote() : ''}
  <div class="pgrid ${wide}">${mine.map(i => `<button class="pick ${equipped(i) ? 'on' : ''}" onclick="equip('${i.id}')" aria-label="${esc(i.name)}">${prev(i)}<small>${esc(i.name.replace(/ panels$| banner$/, ''))}</small></button>`).join('')}</div>
  ${(lockd => lockd.length ? `<h2 class="sec">Level rewards</h2><div class="mut">Only earned by levelling up: they can't be bought or found in chests.</div>
    <div class="pgrid ${wide}">${lockd.map(i => `<div class="pick locked" role="button" onclick="tryLook('${i.id}')" aria-label="${esc(i.name)}">${prev(i)}<small>${esc(i.name)}<br>${gi('lock')} level ${i.lv}</small></div>`).join('')}</div>` : '')(ITEMS.filter(i => i.type === t && i.excl && !has(i)).sort((x, y) => x.lv - y.lv))}
  ${more ? `<button class="btn ghost sm moreb" onclick="shopAt('${t}')">${more} more in the Shop</button>` : ''}`;
}
// The hero's looks: one tile per kind (what you wear), tap to change it; titles when there is more than one to pick.
function looksBlock() {
  const L = lvl(), titles = ACH.filter(x => x.t && G.ach.includes(x.id));
  return `<h2 class="sec">Your look</h2><div class="lookgrid">
  ${COS.map(([t, name, , prev]) => { const on = ITEMS.find(i => i.type === t && equipped(i));
    return `<button class="lookt" onclick="location.hash='#/profile/${t}'"><div class="lookprev">${on ? prev(on) : ''}</div><span>${name}</span></button>`; }).join('')}</div>
  ${titles.length ? `<div class="lbl">Title</div><div class="chips"><button class="chip ${G.title ? '' : 'on'}" onclick="equipTitle('')">${TITLES.filter(t => t[0] <= L).at(-1)[1]}</button>
    ${titles.map(x => `<button class="chip ${G.title === x.id ? 'on' : ''}" onclick="equipTitle('${x.id}')">${x.t}</button>`).join('')}</div>` : ''}`;
}
function profileView(sub) {
  if (needProfile()) return;
  if (sub) return looksView(sub);
  routes.me();
}
// Try any look of the shop for one minute, even one you can't buy yet: one per kind at a time (a picture, a ring, a
// banner, a panel style, a theme and an interface can all be tried together). A bar shows each one with its countdown.
let tryT = null;
const TRY_ICO = { avatar: 'user', frame: 'frame', banner: 'banner', panel: 'frame', theme: 'palette', skin: 'palette' };
function endTryKind(t) { if (!TRY[t]) return; G[t] = TRY[t].real; delete TRY[t]; }
window.endTry = t => {
  if (t) endTryKind(t); else Object.keys(TRY).forEach(endTryKind);
  applyTheme(); drawTry(); route();
};
function drawTry() {
  const now = Date.now();
  let ended = false;
  for (const [t, v] of Object.entries(TRY)) if (now >= v.end || G[t] !== v.key) { if (G[t] === v.key) endTryKind(t); else delete TRY[t]; ended = true; }
  if (ended) { applyTheme(); route(); }
  let bar = document.getElementById('trybar');
  if (!Object.keys(TRY).length) { bar?.remove(); clearInterval(tryT); tryT = null; return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'trybar'; document.body.appendChild(bar); }
  bar.innerHTML = Object.entries(TRY).map(([t, v]) => { const it = ITEMS.find(i => i.type === t && i.key === v.key), left = Math.max(0, Math.ceil((v.end - now) / 1000));
    return `<span class="trc">${it.type === 'skin' ? it.emo : gi(TRY_ICO[t])} ${esc(tr(it.name.replace(/ panels$| banner$/, '')))} 0:${String(left).padStart(2, '0')}<button class="trx" onclick="endTry('${t}')" aria-label="End">✕</button></span>`; }).join('')
    + (Object.keys(TRY).length > 1 ? `<button class="btn sm" onclick="endTry()">${tr('End all')}</button>` : '');
}
window.tryLook = id => {
  const i = item(id), t = i.type, first = !Object.keys(TRY).length;
  TRY[t] = { key: i.key, end: Date.now() + 60000, real: TRY[t] ? TRY[t].real : G[t] };
  G[t] = i.key; applyTheme(); route(); drawTry();
  if (!tryT) tryT = setInterval(drawTry, 1000);
  if (first) toast('Preview for one minute. Look around the app!');
};
window.trySkin = k => tryLook(ITEMS.find(i => i.type === 'skin' && i.key === k).id);
// wearing a look for real ends the try of that kind
const _equipTry = window.equip;
window.equip = id => { const i = item(id); if (TRY[i.type]) { G[i.type] = TRY[i.type].real; delete TRY[i.type]; drawTry(); } _equipTry(id); };
window.equipTitle = id => { G.title = id; commit(); route(); };

Object.assign(routes, { rewards, profile: profileView });
