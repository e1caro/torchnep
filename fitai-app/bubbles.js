'use strict';
// Today as a menu of circles. Every part of the Today screen (quests, boss, next workout, meals...) becomes a bubble
// that shows its status at a glance; tapping one grows it into a panel with what is inside.
// It runs last: the other files add their parts to Today first, then this gathers them into bubbles.

const BUB = { open: null };
// id: [icon, bubble label, panel title]
const BUB_DEF = {
  train: ['lifter', 'Train', 'Next training'], quests: ['scroll', 'Quests', 'Quests and boss'], loot: ['treasure', 'Loot', 'Daily loot'],
  meals: ['cutlery', 'Meals', 'Meals and fuel'], earn: ['bolt', 'Earn', 'Earn and bet'], academy: ['trophy', 'Academy', 'Sports Academy'],
};
// at most six circles: training in the middle and five around it, clockwise from the top
const BUB_ORDER = ['quests', 'loot', 'meals', 'earn', 'academy'];
let BUB_INFO = {};

function bubble(id, i, big) {
  const [ico0, label] = BUB_DEF[id], f = BUB_INFO[id] || {}, ico = f.ico || ico0, p = f.p == null ? 1 : Math.max(0, Math.min(1, f.p));
  return `<button class="bub b-${id}${big ? ' big' : ''}${f.bad ? ' hot' : ''}${f.p == null ? ' full' : ''}" data-b="${id}" style="--i:${i};--bp:${p.toFixed(3)}" onclick="openBub('${id}')" aria-label="${label}">
    <span class="orb"><span class="oi">${gi(ico, big ? 'hero' : '')}</span>${f.v != null ? `<b class="ov">${f.v}</b>` : ''}${big && f.name ? `<span class="on2">${esc(f.name)}</span>` : ''}${f.bad ? '<i class="bdg">!</i>' : ''}</span>
    <span class="bl">${label}</span></button>`;
}

// The check-in streak runs in weeks of 7 days; day 7 brings a silver chest. A streak is always at least day 1
// (older saves could hold 0 for a check-in already made today).
function ciStreakNow() {
  const st = Math.max(1, ciInfo().st), today = G.checkin === dayId(), day = ((st - 1) % 7) + 1;
  const n = today ? st + 1 : st, k = Math.min(n - 1, 6); // the next check-in still to make
  return { today, done: today ? day : day - 1, next: { xp: 10 + 2 * k, coins: 15 + 5 * k, chest: n % 7 === 0 } };
}
function streakCard() {
  const s = ciStreakNow(), el = document.createElement('section');
  el.className = 'card streak';
  el.innerHTML = `<div class="row between"><h3>Check-in streak</h3><span class="mut">Day ${s.done} of 7</span></div>
    <div class="ckdots">${[...Array(7)].map((_, i) => `<i class="${i < s.done ? 'on' : ''}">${i === 6 ? gi('chest-silver', 'hero') : i + 1}</i>`).join('')}</div>
    ${s.today ? `<div class="row between"><span class="mut">Done for today. Tomorrow</span><b>+${s.next.xp} XP · ${gi('coin', 'cn')} ${s.next.coins}${s.next.chest ? ` · ${gi('chest-silver')}` : ''}</b></div>`
    : '<div class="mut">Check in today to keep your streak.</div>'}`;
  return el;
}

function bubbleHome() {
  const hudEl = view.querySelector(':scope > .hud');
  if (!hudEl) return; // the profile wizard, not Today
  const q = s => view.querySelector(':scope > ' + s), prevH = el => el?.previousElementSibling?.matches('h2.sec') ? el.previousElementSibling : null;
  const next = q('.card.next'), boss = q('.card.boss'), g4 = q('.grid4'), meals = q('section.card[onclick*="#/meals"],section.card[onclick*="#/recipe"]');
  const groups = {
    train: [prevH(next), next, q('.card.music'), q('section[onclick*="#/dungeons"]')],
    quests: [q('.sec2'), ...view.querySelectorAll(':scope > .quest'), prevH(boss), boss],
    loot: [q('button[onclick="checkIn()"]'), q('.chestbtn')],
    meals: [meals, q('.card.foodlog'), prevH(g4), g4, g4?.nextElementSibling?.matches('.mut') ? g4.nextElementSibling : null],
    earn: earnNodes(), academy: [q('.sp-row')],
  };
  // the old shortcut buttons to the Earn and Bets screens: their content now sits inside the Earn circle
  view.querySelectorAll(':scope > button[onclick*="#/earn"], :scope > button[onclick*="#/bets"]').forEach(n => n.remove());
  // the daily check-in and the chests share one bubble; it stays even when both are done
  groups.loot.unshift(streakCard());
  Object.keys(groups).forEach(k => { groups[k] = groups[k].filter(Boolean); if (!groups[k].some(n => !n.matches('h2.sec,.sec2'))) delete groups[k]; });

  // what each bubble shows: a value, a progress ring (0..1) and a "!" when something is ready to claim
  const p = S.profile, hits = Math.min(weekCount(), p.days), num = el => (el?.textContent.match(/(\d+)\s*\/\s*(\d+)/) || []).slice(1).map(Number);
  const [qd, qn] = [G.quests.claimed.length, G.quests.list.length];
  BUB_INFO = {
    train: { p: hits / p.days, v: `${hits}/${p.days}`, name: next?.querySelector('h2')?.textContent },
    quests: { p: qd / qn, v: `${qd}/${qn}`, bad: !!view.querySelector(':scope > .quest.ok:not(.cl)') || !!boss?.querySelector('button') },
    loot: (({ done }) => ({ p: done / 7, v: G.chests.length ? `×${G.chests.length}` : `${done}/7`, bad: G.checkin !== dayId() || G.chests.length > 0 }))(ciStreakNow()),
    meals: (([a, b]) => (b ? { p: a / b, v: `${a}/${b}` } : { v: g4?.querySelector('b')?.textContent }))(num(meals?.querySelector('.mut'))),
    academy: { v: groups.academy?.[0].querySelector('.pc-mini b')?.textContent ?? null },
    earn: { bad: typeof spinsLeft === 'function' && spinsLeft() > 0, v: typeof BT === 'object' && BT.open.length ? `${BT.open.length}` : null },
  };

  const store = document.createElement('div');
  store.className = 'bstore'; store.hidden = true;
  Object.entries(groups).forEach(([id, nodes]) => {
    const box = document.createElement('div'); box.dataset.b = id;
    // the panel title replaces the first heading; later ones stay as section titles inside the panel
    nodes.forEach((n, i) => (n.matches('h2.sec,.sec2') && i === 0 && !n.matches('.keep') ? n.remove() : box.append(n)));
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
  // spots around the middle, as fractions of the free width and height (clockwise from the top), kept away from the middle row
  const SPOTS = [[], [[0, -1]], [[0, -1], [0, 1]], [[0, -1], [1, .82], [-1, .82]], [[1, -.6], [1, .82], [-1, .82], [-1, -.6]],
    [[0, -1], [1, -.48], [1, .86], [-1, .86], [-1, -.48]]][n] || [...Array(n)].map((_, i) => [Math.sin(i * 2 * Math.PI / n), -Math.cos(i * 2 * Math.PI / n)]);
  const O = 1.3, PAD = 18; // O: full reach of the ring ornaments; PAD: clear space under the name card (ornaments float a little)
  const cx = W / 2, cy = PAD + (H - PAD) / 2 - LBL / 2;
  // try the largest outer circles first; on short screens shrink them until the middle circle is clearly the biggest
  const plan = d => {
    const rx = W / 2 - d * O / 2 - 2, ry = (H - PAD) / 2 - d * O / 2 - LBL / 2;
    const at = SPOTS.slice(0, n).map(([fx, fy]) => [rx * fx, ry * fy]);
    // the middle circle sits halfway between the side circles above and below it, and grows until its ornament
    // stays well clear of the closest circle or label around it
    const up = at.filter(([x, y]) => x && y < 0).map(([, y]) => y), down = at.filter(([, y]) => y > 0).map(([, y]) => y);
    const by = up.length && down.length ? (Math.max(...up) + Math.min(...down)) / 2 : 0;
    const room = Math.min(H / 2, ...at.flatMap(([x, y]) => [
      Math.hypot(x, y - by) - d * O / 2 - 26,
      Math.hypot(x - Math.sign(x) * Math.min(Math.abs(x), 36), y + d * O / 2 + 8 - by) - 24, // its label
    ]));
    return { d, rx, ry, at, by, B: Math.round(Math.min(230, W * .56, 2 * room / O)) };
  };
  let L = plan(Math.round(Math.max(64, Math.min(120, W * .27))));
  while (L.B < L.d * 1.35 && L.d > 64) L = plan(L.d - 4);
  const { d, rx, ry, at, by, B } = L;
  const put = (el, x, y, size) => { el.style.setProperty('--d', `${size}px`); el.style.left = `${x}px`; el.style.top = `${y - size / 2}px`; };
  sats.forEach((el, i) => put(el, cx + at[i][0], cy + at[i][1], d));
  if (big) put(big, cx, cy + by, Math.max(90, B));
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
  if (instant) { bx.classList.add('open'); bx.scrollTop = BUB.st || 0; return; } // redrawn after a tap inside: stay where you were
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
home = function () { BUB.st = view.querySelector('.bx')?.scrollTop || 0; _bubHome(); bubbleHome(); };

// The Earn circle shows the Bets and Ways to earn screens themselves. Their buttons redraw their own screen;
// while that screen lives inside the open circle on Today, they redraw Today instead, so the circle stays open.
const onTodayIn = id => /^#\/home|^#?$/.test(location.hash) && BUB.open === id;
const _bubEarn = earn, _bubBets = typeof betsView === 'function' ? betsView : null;
earn = function () { if (onTodayIn('earn')) home(); else _bubEarn(); };
if (_bubBets) betsView = function () { if (onTodayIn('earn')) home(); else _bubBets(); };
// draw another screen and take its content, leaving Today as it was
function screenNodes(draw) {
  const keep = document.createDocumentFragment();
  keep.append(...view.childNodes);
  let out = [];
  try { draw(); out = [...view.children]; } catch { /* leave the circle without it */ } finally { view.replaceChildren(keep); }
  return out.filter(n => !n.matches('.hud, h1, .back'));
}
function earnNodes() {
  const head = t => Object.assign(document.createElement('h2'), { className: 'sec keep', textContent: t });
  const bets = _bubBets ? screenNodes(_bubBets) : [];
  const ways = screenNodes(_bubEarn).filter(n => !n.querySelector?.('button[onclick*="#/bets"]')); // its "Open bets" card
  return [...(bets.length ? [head('Bets'), ...bets] : []), head('Ways to earn'), ...ways];
}
routes.home = home;

if (typeof i18nAdd === 'function') i18nAdd({
  Train: 'Entrenar', Quests: 'Misiones', Earn: 'Ganar', 'Quests and boss': 'Misiones y jefe', 'Meals and fuel': 'Comidas y combustible', 'Earn and bet': 'Ganar y apostar',
  Academy: 'Academia', Loot: 'Botín', 'Daily loot': 'Botín diario',
  'Check-in streak': 'Racha de check-in', 'Day {n} of {n}': 'Día {n} de {n}', 'Check in today to keep your streak.': 'Haz el check-in hoy para mantener la racha.',
  'Done for today. Tomorrow': 'Hecho por hoy. Mañana',
});
