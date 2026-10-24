'use strict';
// Today as a menu of circles. Every part of the Today screen (quests, boss, next workout, meals...) becomes a bubble
// that shows its status at a glance; tapping one grows it into a panel with what is inside.
// It runs last: the other files add their parts to Today first, then this gathers them into bubbles.

const BUB = { open: null };
// id: [icon, bubble label, panel title]
const BUB_DEF = {
  train: ['lifter', 'Train', 'Next training'], quests: ['scroll', 'Quests', 'Daily quests'], boss: ['golem', 'Boss', 'Weekly boss'],
  loot: ['treasure', 'Loot', 'Daily loot'], meals: ['cutlery', 'Meals', 'Meals today'],
  fuel: ['flame', 'Fuel', 'Fuel'], dungeon: ['gate', 'Dungeon', 'Dungeon of the day'], academy: ['trophy', 'Academy', 'Sports Academy'],
  earn: ['bolt', 'Earn', 'More ways to earn'], bets: ['ticket', 'Bets', 'Your bets'],
};
const BUB_ORDER = ['quests', 'boss', 'loot', 'meals', 'fuel', 'dungeon', 'academy', 'earn', 'bets']; // clockwise from the top
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
    loot: [q('button[onclick="checkIn()"]'), q('.chestbtn')], meals: [meals],
    fuel: [prevH(g4), g4, g4?.nextElementSibling?.matches('.mut') ? g4.nextElementSibling : null],
    dungeon: [q('section[onclick*="#/dungeons"]')], academy: [q('.sp-row')], earn: [q('button[onclick*="#/earn"]')], bets: [q('button[onclick*="#/bets"]')],
  };
  // the daily check-in and the chests share one bubble; it stays even when both are done
  if (!groups.loot.some(Boolean)) {
    const note = document.createElement('div'); note.className = 'card mut';
    note.textContent = `Checked in today. Come back tomorrow for day ${(G.ciStreak % 7) + 1}.`;
    groups.loot = [note];
  }
  Object.keys(groups).forEach(k => { groups[k] = groups[k].filter(Boolean); if (!groups[k].some(n => !n.matches('h2.sec,.sec2'))) delete groups[k]; });

  // what each bubble shows: a value, a progress ring (0..1) and a "!" when something is ready to claim
  const p = S.profile, hits = Math.min(weekCount(), p.days), num = el => (el?.textContent.match(/(\d+)\s*\/\s*(\d+)/) || []).slice(1).map(Number);
  const [qd, qn] = [G.quests.claimed.length, G.quests.list.length];
  BUB_INFO = {
    train: { p: hits / p.days, v: `${hits}/${p.days}`, name: next?.querySelector('h2')?.textContent },
    quests: { p: qd / qn, v: `${qd}/${qn}`, bad: !!view.querySelector(':scope > .quest.ok:not(.cl)') },
    boss: { ico: BOSSES[hash(weekId()) % BOSSES.length][1], p: 1 - hits / p.days, v: hits >= p.days ? '✓' : `${p.days - hits}`, bad: !!boss?.querySelector('button') },
    loot: (c => { const day = ((c.st - 1) % 7) + 1, ci = G.checkin !== dayId();
      return { p: day / 7, v: G.chests.length ? `×${G.chests.length}` : `${day}/7`, bad: ci || G.chests.length > 0 }; })(ciInfo()),
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
  orbs.innerHTML = `<svg class="orbit" aria-hidden="true"><ellipse/><ellipse/></svg>${groups.train ? bubble('train', 0, true) : ''}${rest.map((id, i) => bubble(id, i + 1)).join('')}`;
  (view.querySelector(':scope > .sp-row') || hudEl).after(orbs);
  view.append(store);
  layoutOrbs();
  if (BUB.open && groups[BUB.open]) openBub(BUB.open, true); else BUB.open = null;
}

// Training sits in the middle of the free screen space and the other circles orbit it on an ellipse.
function layoutOrbs() {
  const orbs = view.querySelector('.orbs');
  if (!orbs) return;
  const navH = document.querySelector('nav#tabs')?.offsetHeight || 80, top = orbs.getBoundingClientRect().top + scrollY;
  const W = orbs.clientWidth, H = Math.max(470, innerHeight - top - navH - 6);
  const big = orbs.querySelector('.bub.big'), sats = [...orbs.querySelectorAll('.bub:not(.big)')], n = sats.length, LBL = 24;
  orbs.style.height = `${H}px`;
  const E = 1.12; // ring ornaments reach a bit past each circle; neighbours' ornaments may touch, circles may not
  let d = 90, rx, ry, per = 0, pts = [];
  for (let k = 0; k < 3; k++) { // circle size and orbit depend on each other: settle them in a few passes
    rx = W / 2 - d * E / 2 - 2; ry = H / 2 - d * E / 2 - LBL / 2 - 2;
    pts = []; per = 0; // walk the ellipse so the circles sit at equal distances along it, not at equal angles
    for (let j = 0, px = 0, py = -ry; j <= 720; j++) { const t = -Math.PI / 2 + j * Math.PI / 360, x = rx * Math.cos(t), y = ry * Math.sin(t); per += Math.hypot(x - px, y - py); pts.push([per, x, y]); px = x; py = y; }
    d = Math.round(Math.max(60, Math.min(104, W * .23, (per / Math.max(n, 1) - LBL * .5) / E)));
  }
  const cx = W / 2, cy = H / 2 - LBL / 2;
  const put = (el, x, y, size) => { el.style.setProperty('--d', `${size}px`); el.style.left = `${x}px`; el.style.top = `${y - size / 2}px`; };
  if (big) put(big, cx, cy, Math.round(Math.max(110, Math.min(220, 2 * (rx - d * E / 2 - 6) / E, 2 * (ry - d * E / 2 - 40) / E))));
  sats.forEach((el, i) => { const L = i * per / n, [, x, y] = pts.find(q => q[0] >= L) || pts[0]; put(el, cx + x, cy + y, d); });
  orbs.querySelectorAll('.orbit ellipse').forEach((e, i) => { e.setAttribute('cx', cx); e.setAttribute('cy', cy); e.setAttribute('rx', rx + i * 8); e.setAttribute('ry', ry + i * 8); });
}
addEventListener('resize', () => { if (view.querySelector('.orbs')) layoutOrbs(); });

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
  Academy: 'Academia', Loot: 'Botín', 'Your bets': 'Tus apuestas', 'Daily loot': 'Botín diario',
  'Checked in today. Come back tomorrow for day {n}.': 'Ya has hecho el check-in hoy. Vuelve mañana para el día {n}.',
});
