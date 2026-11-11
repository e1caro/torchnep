'use strict';
// Making money (the design and its reasons are in MONETIZATION.md): FitQuest Pro, a subscription (monthly, yearly
// with a 7-day free trial, or lifetime), and gems, a premium currency for looks and shortcuts that never buys bets,
// spins or chests. Only switched on in FitQuest Developer for now, where every purchase is free and money is endless;
// Google Play Billing replaces payTest() before it goes to the public app.

const MONEY_ON = APP_DEV;
const PAY = Object.assign({ pro: null, gems: 0, log: [], free: false, infGems: true, infCoins: false, gift: '', starter: false }, load('pay', {}));
const paySave = () => save('pay', PAY);
const isPro = () => MONEY_ON && !PAY.free && !!PAY.pro && (!PAY.pro.until || Date.now() < PAY.pro.until);
const gemsLeft = () => (PAY.infGems ? Infinity : PAY.gems);
const proGates = () => MONEY_ON && !isPro();
const PLANS = [
  { id: 'pro_month', name: 'Monthly', price: 3.99, per: 'month', days: 30 },
  { id: 'pro_year', name: 'Yearly', price: 24.99, per: 'year', days: 365, trial: 7, best: true, save: 48 },
  { id: 'pro_life', name: 'Lifetime', price: 59.99, days: 0, once: true },
];
const GEM_PACKS = [
  { id: 'starter', gems: 300, price: 1.99, starter: true }, { id: 'gems_100', gems: 100, price: .99 },
  { id: 'gems_550', gems: 550, price: 4.99, bonus: 10 }, { id: 'gems_1200', gems: 1200, price: 9.99, bonus: 20, best: true },
];
const FREE = { routines: 3, myex: 5, photos: 1, hist: 4, calWeeks: 6 };
const PRO_ROWS = () => [
  ['Training plan, logging, dungeons, quests and friends', '✓', '✓'], ['Your own routines', `${FREE.routines}`, '∞'], ['Your own exercises', `${FREE.myex}`, '∞'],
  ['Meal photo ratings a day', `${FREE.photos}`, '5'], ['Progress per exercise', `${tr('last')} ${FREE.hist}`, 'all'], ['Training calendar', `${FREE.calWeeks} ${tr('weeks')}`, `18 ${tr('weeks')}`],
  ['Monthly chest: 1,000 coins', '—', '✓'], ['Crown profile picture and Pro badge', '—', '✓'],
];
const money = n => n.toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR' });
const monthId = () => new Date().toISOString().slice(0, 7);
ITEMS.push({ id: 'a-crown', type: 'avatar', key: 'crown', name: 'Crown', cost: 0, shop: false, lv: Infinity, pro: true });
const gemTag = () => `<button class="gemtag" onclick="location.hash='#/gems'">💎 <b>${PAY.infGems ? '∞' : fmtN(PAY.gems)}</b></button>`;

// ---------- buying (test purchases in FitQuest Developer) ----------
function payTest(p, done) {
  modal(`<div class="avbig">🧪</div><h2>Test purchase</h2><div class="mut">FitQuest Developer: nothing is charged. In the public app this opens Google Play to pay <b>${money(p.price)}</b>${p.per ? ` / ${tr(p.per)}` : ''}.</div>
    <button class="btn gold" id="pyok">${p.trial ? T('Start {0} free days', p.trial) : `${tr('Buy')} · ${money(p.price)}`}</button><button class="btn ghost" data-close>Cancel</button>`);
  $('#pyok').onclick = () => { $('#modal').hidden = true; PAY.log.unshift({ id: p.id, t: Date.now(), price: p.price }); PAY.log = PAY.log.slice(0, 30); done(); paySave(); sfx('claim'); if (typeof confetti === 'function') confetti(); route(); };
}
window.payBuy = id => {
  const plan = PLANS.find(x => x.id === id), pack = GEM_PACKS.find(x => x.id === id);
  if (plan) payTest(plan, () => { PAY.free = false; PAY.pro = { plan: id, since: Date.now(), until: plan.days ? Date.now() + (plan.trial || plan.days) * 864e5 : 0, trial: !!plan.trial }; proPerks(); toast(tr('Welcome to FitQuest Pro')); });
  if (pack) payTest(pack, () => { PAY.gems += pack.gems; if (pack.starter) { PAY.starter = true; if (!G.owned.includes('a-crown')) G.owned.push('a-crown'); commit(); } toast(T('+{0} gems', pack.gems)); });
};
function proPerks() { if (isPro() && !G.owned.includes('a-crown')) { G.owned.push('a-crown'); commit(); } }
window.proGift = () => { if (!isPro() || PAY.gift === monthId()) return; PAY.gift = monthId(); paySave(); award(0, 1000); toast(tr('+1,000 coins')); route(); };
function spendGems(n, fn) {
  if (gemsLeft() < n) { modal(`<div class="avbig">💎</div><h2>Not enough gems</h2><div class="mut">${T('You need {0} gems.', n)}</div><button class="btn" onclick="$('#modal').hidden=true;location.hash='#/gems'">Get gems</button><button class="btn ghost" data-close>Close</button>`); return; }
  if (!PAY.infGems) PAY.gems -= n;
  paySave(); fn(); commit(); sfx('claim'); route();
}
// what gems buy: coins, a 24-hour XP boost, or a look straight away (never bets, spins or chests)
const gemPrice = i => Math.max(20, Math.ceil(i.cost / 5 / 10) * 10);
window.gemCoins = (g, c) => spendGems(g, () => { G.coins += c; toast(T('+{0} coins', fmtN(c))); });
window.gemBoost = () => spendGems(60, () => { G.boostUntil = Math.max(Date.now(), G.boostUntil || 0) + 864e5; toast(tr('XP boost on for 24 hours')); });
window.gemLook = id => { const i = item(id); if (!i || has(i)) return; spendGems(gemPrice(i), () => { G.owned.push(id); toast(T('Unlocked {0}', i.name)); }); };

// ---------- screens ----------
function proView() {
  if (needProfile()) return;
  if (!MONEY_ON) { location.hash = '#/home'; return; }
  const back = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>`;
  if (isPro()) {
    const p = PLANS.find(x => x.id === PAY.pro.plan) || PLANS[2];
    view.innerHTML = `${back}<section class="card prohero on"><div class="procrown">${gi('crown', 'hero')}</div><h1>You're Pro</h1><div class="mut">${tr(p.name)} · ${PAY.pro.until ? `${PAY.pro.trial ? tr('free trial until') : tr('renews on')} ${new Date(PAY.pro.until).toLocaleDateString(LANG, { day: 'numeric', month: 'long' })}` : tr('forever')}</div></section>
      <section class="card row"><div class="dgi">${gi('chest-gold')}</div><div class="grow"><b>Monthly chest</b><div class="mut">1,000 coins every month</div></div>
        ${PAY.gift === monthId() ? '<span class="chk">✓</span>' : '<button class="btn sm gold" onclick="proGift()">Claim</button>'}</section>
      <div class="lbl">Included</div><ul class="how prolist">${PRO_ROWS().map(r => `<li>${tr(r[0])}</li>`).join('')}</ul>
      ${APP_DEV ? '<button class="btn ghost" onclick="PAY.pro=null;paySave();route()">Cancel subscription (test)</button>' : ''}`;
    return;
  }
  const sel = PROSEL || 'pro_year', sp = PLANS.find(x => x.id === sel);
  view.innerHTML = `${back}<section class="prohero"><div class="procrown">${gi('crown', 'hero')}</div><h1>FitQuest Pro</h1><div class="mut">Train without limits, see all your progress and get a chest every month.</div></section>
    <table class="procmp"><tr><th></th><th>Free</th><th>Pro</th></tr>${PRO_ROWS().map(([a, f, p]) => `<tr><td>${tr(a)}</td><td>${tr(f)}</td><td><b>${tr(p)}</b></td></tr>`).join('')}</table>
    <div class="proplans">${PLANS.map(p => `<button class="proplan ${p.id === sel ? 'on' : ''}" onclick="PROSEL='${p.id}';route()">${p.best ? `<span class="probadge">${T('Save {0}%', p.save)}</span>` : ''}
      <b>${tr(p.name)}</b><span class="prop">${money(p.price)}</span><span class="mut">${p.per === 'year' ? `${money(p.price / 12)} / ${tr('month')}` : p.per ? `/ ${tr(p.per)}` : tr('one payment')}</span></button>`).join('')}</div>
    <button class="btn gold procta" onclick="payBuy('${sel}')">${sp.trial ? T('Try it free for {0} days', sp.trial) : `${tr('Continue')} · ${money(sp.price)}`}</button>
    <div class="mut profine">${sp.trial ? T('Then {0} a year.', money(sp.price)) + ' ' : ''}${sp.per ? tr('Renews automatically. Cancel any time in Google Play, at least 24 hours before it renews.') : tr('One payment, Pro forever.')}</div>
    <button class="btn ghost sm" onclick="toast(tr('Purchases restored'))">Restore purchases</button>`;
}
let PROSEL = null;
function gemsView() {
  if (needProfile()) return;
  if (!MONEY_ON) { location.hash = '#/home'; return; }
  const looks = ITEMS.filter(i => i.shop && i.cost > 0 && !has(i)).sort((a, b) => b.cost - a.cost).slice(0, 6);
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button><div class="shophead"><div><h1>Gems</h1></div>${gemTag()}</div>
    <div class="lbl">Get gems</div><div class="gempacks">${GEM_PACKS.filter(p => !p.starter || !PAY.starter).map(p => `<button class="gempack ${p.best ? 'best' : ''} ${p.starter ? 'starter' : ''}" onclick="payBuy('${p.id}')">
      ${p.starter ? `<span class="probadge">${tr('Once only')}</span>` : p.bonus ? `<span class="probadge">+${p.bonus}%</span>` : ''}<span class="gemico">💎</span><b>${fmtN(p.gems)}</b>
      ${p.starter ? `<span class="mut">${tr('+ Crown profile picture')}</span>` : ''}<span class="gemprice">${money(p.price)}</span></button>`).join('')}</div>
    <div class="lbl">Spend gems</div>
    <div class="card row"><div class="dgi">${gi('coin')}</div><div class="grow"><b>600 coins</b></div><button class="btn sm" onclick="gemCoins(100,600)">💎 100</button></div>
    <div class="card row"><div class="dgi">${gi('coin')}</div><div class="grow"><b>3,500 coins</b><div class="mut">${T('Save {0}%', 15)}</div></div><button class="btn sm" onclick="gemCoins(500,3500)">💎 500</button></div>
    <div class="card row"><div class="dgi">${gi('sparkles')}</div><div class="grow"><b>XP boost</b><div class="mut">Double XP for 24 hours</div></div><button class="btn sm" onclick="gemBoost()">💎 60</button></div>
    ${looks.length ? `<div class="lbl">Unlock now</div><div class="shopgrid">${looks.map(i => `<button class="card gemlook" onclick="gemLook('${i.id}')"><div class="dpv">${typeof preview === 'function' ? preview(i) : ''}</div><b>${esc(tr(i.name))}</b><span>💎 ${gemPrice(i)}</span></button>`).join('')}</div>` : ''}
    <div class="mut profine">Gems never buy bets, spins or chests: everything you get with them is shown before you pay.</div>`;
}
Object.assign(routes, { pro: proView, gems: gemsView });

// ---------- free limits (shown as a friendly offer of Pro) ----------
const GATE = {
  routines: ['Unlimited routines', `Free accounts can keep ${FREE.routines} routines. With Pro, as many as you like.`],
  myex: ['Unlimited exercises', `Free accounts can create ${FREE.myex} exercises. With Pro, as many as you like.`],
  photos: ['More meal ratings', `Free accounts get ${FREE.photos} meal photo rating a day. With Pro, 5.`],
};
function proGate(k) {
  const [t, d] = GATE[k];
  modal(`<div class="procrown sm">${gi('crown', 'hero')}</div><h2>${tr(t)}</h2><div class="mut">${tr(d)}</div><button class="btn gold" onclick="$('#modal').hidden=true;location.hash='#/pro'">See FitQuest Pro</button><button class="btn ghost" data-close>Not now</button>`);
}
const _payNewRt = window.newRoutine;
window.newRoutine = f => (proGates() && RT.length >= FREE.routines ? proGate('routines') : _payNewRt(f));
const _payMyx = window.myexNew;
if (_payMyx) window.myexNew = () => (proGates() && MYX.length >= FREE.myex ? proGate('myex') : _payMyx());
const _payPick = window.fcPick;
if (_payPick) window.fcPick = inp => { if (proGates() && FC.hist.filter(h => dayId(h.t) === dayId()).length >= FREE.photos) { inp.value = ''; proGate('photos'); return; } return _payPick(inp); };

// ---------- where Pro and gems show ----------
const _payRw = routes.rewards;
routes.rewards = function (sub) {
  _payRw(sub);
  if (!MONEY_ON || sub !== 'shop') return;
  view.querySelector('.shophead')?.insertAdjacentHTML('afterend', `${isPro() ? '' : `<button class="card probanner" onclick="location.hash='#/pro'"><span class="procrown sm">${gi('crown', 'hero')}</span><span class="grow"><b>FitQuest Pro</b><span class="mut">${tr('Unlimited routines, all your progress and a monthly chest')}</span></span><span class="btn sm gold">${tr('Try free')}</span></button>`}
    <div class="row gemrow">${gemTag()}<button class="btn sm ghost" onclick="location.hash='#/gems'">Get gems</button></div>`);
};
const _payHome = routes.home;
routes.home = function () { _payHome(); if (isPro()) view.querySelector('.hud .hn')?.insertAdjacentHTML('beforeend', ' <span class="probadge inl">PRO</span>'); };
const _paySet = routes.settings;
routes.settings = function () {
  _paySet();
  if (!MONEY_ON) return;
  const sw = (k, label, on) => `<div class="row between setrow"><span>${tr(label)}</span><label class="switch"><input type="checkbox" ${on ? 'checked' : ''} onchange="devSet('${k}',this.checked)"><span></span></label></div>`;
  view.querySelector('#exp')?.parentElement?.previousElementSibling?.insertAdjacentHTML('beforebegin', `<h2 class="sec">FitQuest Pro</h2>
    <section class="card tap row" onclick="location.hash='#/pro'"><span class="procrown sm">${gi('crown', 'hero')}</span><div class="grow"><b>${isPro() ? tr("You're Pro") : 'FitQuest Pro'}</b><div class="mut">${isPro() ? tr('Manage your plan') : tr('See plans')}</div></div>${gemTag()}</section>
    ${APP_DEV ? `<h2 class="sec">Developer</h2><section class="card devcard"><div class="mut">Only in FitQuest Developer. Purchases here are free.</div>
      ${sw('pro', 'Pro active', isPro())}${sw('free', 'Act as a free player', PAY.free)}${sw('infGems', 'Endless gems', PAY.infGems)}${sw('infCoins', 'Endless coins', PAY.infCoins)}
      <button class="btn ghost sm" onclick="devSet('reset')">Reset purchases</button>
      ${PAY.log.length ? `<div class="lbl">Test purchases</div>${PAY.log.slice(0, 8).map(l => `<div class="row between mut"><span>${l.id}</span><span>${money(l.price)} · ${new Date(l.t).toLocaleDateString(LANG)}</span></div>`).join('')}` : ''}</section>` : ''}`);
};
window.devSet = (k, v) => {
  if (!APP_DEV) return;
  if (k === 'pro') PAY.pro = v ? { plan: 'pro_life', since: Date.now(), until: 0 } : null;
  else if (k === 'reset') Object.assign(PAY, { pro: null, gems: 0, log: [], free: false, gift: '', starter: false });
  else PAY[k] = v;
  if (k === 'infCoins' && v) { G.coins = Math.max(G.coins, 999999); commit(); }
  paySave(); proPerks(); route();
};
if (MONEY_ON) {
  proPerks();
  const topUp = () => { if (PAY.infCoins && G.coins < 900000) { G.coins = 999999; commit(); } };
  topUp(); addEventListener('hashchange', topUp);
}

if (typeof i18nAdd === 'function') i18nAdd({
  'FitQuest Pro': 'FitQuest Pro', "You're Pro": 'Eres Pro', 'Train without limits, see all your progress and get a chest every month.': 'Entrena sin límites, mira todo tu progreso y llévate un cofre cada mes.',
  Free: 'Gratis', Pro: 'Pro', Monthly: 'Mensual', Yearly: 'Anual', Lifetime: 'De por vida', month: 'mes', year: 'año', 'one payment': 'un solo pago', forever: 'para siempre',
  'Save {0}%': 'Ahorra un {0}%', 'Try it free for {0} days': 'Pruébalo gratis {0} días', 'Start {0} free days': 'Empezar {0} días gratis', Continue: 'Continuar', Buy: 'Comprar',
  'Then {0} a year.': 'Después, {0} al año.', 'Renews automatically. Cancel any time in Google Play, at least 24 hours before it renews.': 'Se renueva automáticamente. Cancela cuando quieras en Google Play, al menos 24 horas antes de la renovación.',
  'One payment, Pro forever.': 'Un solo pago, Pro para siempre.', 'Restore purchases': 'Restaurar compras', 'Purchases restored': 'Compras restauradas',
  'Training plan, logging, dungeons, quests and friends': 'Plan, registro, mazmorras, misiones y amigos', 'Your own routines': 'Rutinas propias', 'Your own exercises': 'Ejercicios propios',
  'Meal photo ratings a day': 'Fotos de comida valoradas al día', 'Progress per exercise': 'Progreso por ejercicio', 'Training calendar': 'Calendario de entrenamiento', last: 'últimos', all: 'todo', weeks: 'semanas',
  'Monthly chest: 1,000 coins': 'Cofre mensual: 1.000 monedas', 'Crown profile picture and Pro badge': 'Foto de perfil Corona e insignia Pro',
  'Monthly chest': 'Cofre mensual', '1,000 coins every month': '1.000 monedas cada mes', Claim: 'Reclamar', Included: 'Incluido', '+1,000 coins': '+1.000 monedas',
  'free trial until': 'prueba gratis hasta el', 'renews on': 'se renueva el', 'Cancel subscription (test)': 'Cancelar suscripción (prueba)', 'Welcome to FitQuest Pro': 'Bienvenido a FitQuest Pro',
  'Test purchase': 'Compra de prueba', 'FitQuest Developer: nothing is charged. In the public app this opens Google Play to pay': 'FitQuest Developer: no se cobra nada. En la app pública aquí se abriría Google Play para pagar',
  Gems: 'Gemas', 'Get gems': 'Conseguir gemas', 'Spend gems': 'Usar gemas', 'Once only': 'Solo una vez', '+ Crown profile picture': '+ foto de perfil Corona', '600 coins': '600 monedas', '3,500 coins': '3.500 monedas',
  'XP boost': 'Potenciador de XP', 'Double XP for 24 hours': 'XP doble durante 24 horas', 'XP boost on for 24 hours': 'Potenciador de XP activo 24 horas', 'Unlock now': 'Desbloquear ya',
  'Gems never buy bets, spins or chests: everything you get with them is shown before you pay.': 'Las gemas nunca compran apuestas, ruletas ni cofres: todo lo que consigues con ellas se ve antes de pagar.',
  'Not enough gems': 'No tienes gemas suficientes', 'You need {0} gems.': 'Necesitas {0} gemas.', '+{0} gems': '+{0} gemas', '+{0} coins': '+{0} monedas', 'Unlocked {0}': 'Desbloqueado: {0}',
  'Unlimited routines': 'Rutinas ilimitadas', 'Unlimited exercises': 'Ejercicios ilimitados', 'More meal ratings': 'Más valoraciones de comidas',
  [`Free accounts can keep ${FREE.routines} routines. With Pro, as many as you like.`]: `La versión gratuita permite ${FREE.routines} rutinas. Con Pro, todas las que quieras.`,
  [`Free accounts can create ${FREE.myex} exercises. With Pro, as many as you like.`]: `La versión gratuita permite crear ${FREE.myex} ejercicios. Con Pro, todos los que quieras.`,
  [`Free accounts get ${FREE.photos} meal photo rating a day. With Pro, 5.`]: `La versión gratuita valora ${FREE.photos} foto de comida al día. Con Pro, 5.`,
  'See FitQuest Pro': 'Ver FitQuest Pro', 'Not now': 'Ahora no', 'Unlimited routines, all your progress and a monthly chest': 'Rutinas ilimitadas, todo tu progreso y un cofre al mes', 'Try free': 'Pruébalo gratis',
  'Manage your plan': 'Gestiona tu plan', 'See plans': 'Ver planes', Developer: 'Developer', 'Only in FitQuest Developer. Purchases here are free.': 'Solo en FitQuest Developer. Aquí las compras son gratis.',
  'Pro active': 'Pro activo', 'Act as a free player': 'Simular usuario gratuito', 'Endless gems': 'Gemas infinitas', 'Endless coins': 'Monedas infinitas', 'Reset purchases': 'Borrar compras', 'Test purchases': 'Compras de prueba',
  Crown: 'Corona',
});
