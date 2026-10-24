'use strict';
// Today as a menu of circles. Every part of the Today screen (quests, boss, next workout, meals...) becomes a bubble
// that shows its status at a glance; tapping one grows it into a panel with what is inside.
// It runs last: the other files add their parts to Today first, then this gathers them into bubbles.

const BUB = { open: null };
// id: [icon, bubble label, panel title]
const BUB_DEF = {
  train: ['lifter', 'Train', 'Next training'], quests: ['scroll', 'Quests', 'Daily quests'], boss: ['golem', 'Boss', 'Weekly boss'],
  checkin: ['crate', 'Check-in', 'Daily check-in'], chest: ['chest-gold', 'Loot', 'Your chests'], meals: ['cutlery', 'Meals', 'Meals today'],
  fuel: ['flame', 'Fuel', 'Fuel'], dungeon: ['gate', 'Dungeon', 'Dungeon of the day'], academy: ['trophy', 'Academy', 'Sports Academy'],
  earn: ['bolt', 'Earn', 'More ways to earn'], bets: ['ticket', 'Bets', 'Your bets'],
};
const BUB_ORDER = ['checkin', 'chest', 'meals', 'fuel', 'dungeon', 'academy', 'earn', 'bets'];
let BUB_INFO = {};

function bubble(id, i, big) {
  const [ico0, label] = BUB_DEF[id], f = BUB_INFO[id] || {}, ico = f.ico || ico0, p = f.p == null ? 1 : Math.max(0, Math.min(1, f.p));
  return `<button class="bub b-${id}${big ? ' big' : ''}${f.bad ? ' hot' : ''}${f.p == null ? ' full' : ''}" data-b="${id}" style="--i:${i};--bp:${p.toFixed(3)}" onclick="openBub('${id}')" aria-label="${label}">
    <span class="orb"><span class="oi">${gi(ico, big ? 'hero' : '')}</span>${f.v != null ? `<b class="ov">${f.v}</b>` : ''}${big && f.name ? `<span class="on2">${esc(f.name)}</span>` : ''}${f.bad ? '<i class="bdg">!</i>' : ''}</span>
    <span class="bl">${label}</span></button>`;
}

function bubbleHome() {
  const hudEl = view.querySelector(':scope > .hud');
  if (!hudEl) return; // the profile wizard, not Today
  const q = s => view.querySelector(':scope > ' + s), prevH = el => el?.previousElementSibling?.matches('h2.sec') ? el.previousElementSibling : null;
  const next = q('.card.next'), boss = q('.card.boss'), g4 = q('.grid4'), meals = q('section.card[onclick*="#/meals"],section.card[onclick*="#/recipe"]');
  const groups = {
    train: [prevH(next), next], quests: [q('.sec2'), ...view.querySelectorAll(':scope > .quest')], boss: [prevH(boss), boss],
    checkin: [q('button[onclick="checkIn()"]')], chest: [q('.chestbtn')], meals: [meals],
    fuel: [prevH(g4), g4, g4?.nextElementSibling?.matches('.mut') ? g4.nextElementSibling : null],
    dungeon: [q('section[onclick*="#/dungeons"]')], academy: [q('.sp-row')], earn: [q('button[onclick*="#/earn"]')], bets: [q('button[onclick*="#/bets"]')],
  };
  Object.keys(groups).forEach(k => { groups[k] = groups[k].filter(Boolean); if (!groups[k].some(n => !n.matches('h2.sec,.sec2'))) delete groups[k]; });

  // what each bubble shows: a value, a progress ring (0..1) and a "!" when something is ready to claim
  const p = S.profile, hits = Math.min(weekCount(), p.days), num = el => (el?.textContent.match(/(\d+)\s*\/\s*(\d+)/) || []).slice(1).map(Number);
  const [qd, qn] = [G.quests.claimed.length, G.quests.list.length];
  BUB_INFO = {
    train: { p: hits / p.days, v: `${hits}/${p.days}`, name: next?.querySelector('h2')?.textContent },
    quests: { p: qd / qn, v: `${qd}/${qn}`, bad: !!view.querySelector(':scope > .quest.ok:not(.cl)') },
    boss: { ico: BOSSES[hash(weekId()) % BOSSES.length][1], p: 1 - hits / p.days, v: hits >= p.days ? '✓' : `${p.days - hits}`, bad: !!boss?.querySelector('button') },
    checkin: (c => ({ p: (((c.st - 1) % 7) + 1) / 7, v: `${((c.st - 1) % 7) + 1}/7`, bad: true }))(ciInfo()),
    chest: { ico: G.chests.length ? CHEST[G.chests[0]][1] : 'chest-gold', v: `×${G.chests.length}`, bad: true },
    meals: (([a, b]) => ({ p: b ? a / b : 0, v: b ? `${a}/${b}` : null }))(num(meals?.querySelector('.mut'))),
    fuel: { v: g4?.querySelector('b')?.textContent },
    dungeon: { ico: featuredId() ? DUNGEONS[featuredId()].ico : 'gate', v: '+50%' },
    academy: { v: groups.academy?.[0].querySelector('.pc-mini b')?.textContent ?? null },
    earn: { bad: typeof spinsLeft === 'function' && spinsLeft() > 0 },
    bets: { v: typeof BT === 'object' ? BT.open.length : null },
  };

  const store = document.createElement('div');
  store.className = 'bstore'; store.hidden = true;
  Object.entries(groups).forEach(([id, nodes]) => {
    const box = document.createElement('div'); box.dataset.b = id;
    nodes.forEach(n => (n.matches('h2.sec,.sec2') ? n.remove() : box.append(n)));
    store.append(box);
  });
  const rest = BUB_ORDER.filter(id => groups[id]);
  const orbs = document.createElement('div');
  orbs.className = 'orbs';
  orbs.innerHTML = `<div class="orbtop">${groups.quests ? bubble('quests', 1) : '<i></i>'}${groups.train ? bubble('train', 0, true) : ''}${groups.boss ? bubble('boss', 2) : '<i></i>'}</div>
    <div class="orbgrid">${rest.map((id, i) => bubble(id, i + 3)).join('')}</div>`;
  (view.querySelector(':scope > .sp-row') || hudEl).after(orbs);
  view.append(store);
  if (BUB.open && groups[BUB.open]) openBub(BUB.open, true); else BUB.open = null;
}

// grow the bubble into a panel: a circle that expands from where the bubble sits
const bubCenter = (bx, id) => {
  const o = view.querySelector(`.bub[data-b="${id}"] .orb`);
  if (!o) return;
  const r = o.getBoundingClientRect(), b = bx.getBoundingClientRect();
  bx.style.setProperty('--cx', `${r.left + r.width / 2 - b.left}px`);
  bx.style.setProperty('--cy', `${r.top + r.height / 2 - b.top}px`);
  bx.style.setProperty('--r0', `${r.width / 2}px`);
};
window.openBub = (id, instant) => {
  const box = view.querySelector(`.bstore [data-b="${id}"]`);
  if (!box) return;
  view.querySelector('.bx')?.remove();
  const [ico0, , title] = BUB_DEF[id], f = BUB_INFO[id] || {};
  const bx = document.createElement('div');
  bx.className = `bx b-${id}`; bx.dataset.b = id;
  bx.setAttribute('role', 'dialog'); bx.setAttribute('aria-modal', 'true');
  bx.innerHTML = `<div class="bxh"><span class="bxi">${gi(f.ico || ico0)}</span><h2 class="grow">${title}</h2>${f.v != null && id !== 'fuel' ? `<b class="bxv">${f.v}</b>` : ''}
    <button class="bxc" onclick="closeBub()" aria-label="Close">✕</button></div><div class="bxb"></div>`;
  const body = bx.querySelector('.bxb');
  [...box.children].forEach((n, k) => { n.style.setProperty('--k', k); body.append(n); });
  bx.classList.add('now'); // no transition while it is placed on the bubble
  view.append(bx);
  bubCenter(bx, id);
  bx.getBoundingClientRect();
  BUB.open = id;
  document.body.classList.add('bubopen');
  if (instant) { bx.classList.add('open'); return; }
  bx.classList.remove('now');
  view.querySelector(`.bub[data-b="${id}"]`)?.classList.add('tap');
  sfx('tick');
  bx.getBoundingClientRect();
  requestAnimationFrame(() => bx.classList.add('open'));
  try { history.pushState({ bub: id }, ''); } catch { /* history blocked */ }
};
window.closeBub = fromBack => {
  if (fromBack !== true && history.state?.bub) { history.back(); return; } // the popstate below closes it
  const bx = view.querySelector('.bx');
  BUB.open = null;
  if (!bx) { document.body.classList.remove('bubopen'); return; }
  const id = bx.dataset.b, box = view.querySelector(`.bstore [data-b="${id}"]`);
  bubCenter(bx, id);
  bx.classList.remove('open', 'now'); bx.classList.add('closing');
  let done = false;
  const end = () => {
    if (done) return; done = true;
    if (box) [...bx.querySelector('.bxb').children].forEach(n => box.append(n));
    bx.remove(); view.querySelector('.bub.tap')?.classList.remove('tap');
    if (!view.querySelector('.bx')) document.body.classList.remove('bubopen');
  };
  bx.addEventListener('transitionend', e => { if (e.target === bx) end(); });
  setTimeout(end, 650);
};
addEventListener('popstate', () => { if (view.querySelector('.bx:not(.closing)')) closeBub(true); });
addEventListener('hashchange', () => { if (!/^#\/home|^#?$/.test(location.hash)) { BUB.open = null; document.body.classList.remove('bubopen'); } });
addEventListener('keydown', e => { if (e.key === 'Escape' && view.querySelector('.bx')) closeBub(); });

const _bubHome = home;
home = function () { _bubHome(); bubbleHome(); };
routes.home = home;

if (typeof i18nAdd === 'function') i18nAdd({
  Train: 'Entrenar', Quests: 'Misiones', Boss: 'Jefe', 'Check-in': 'Check-in', Earn: 'Ganar', Bets: 'Apuestas', Dungeon: 'Mazmorra',
  Academy: 'Academia', Loot: 'Botín', 'Your bets': 'Tus apuestas', 'Your chests': 'Tus cofres',
});
