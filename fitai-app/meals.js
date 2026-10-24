'use strict';
// Meal plan: picks recipes that fit your diet, your cooking time per day and your calorie / protein targets,
// scales each portion to hit the target and builds a weekly shopping list. Runs after recipes.js, game.js and gym.js.

const M = Object.assign({ set: null, plan: null, shop: [] }, load('meal', {}));
const mealSave = () => save('meal', M);
const RBY = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const DAYN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = () => (new Date().getDay() + 6) % 7;
const DIETS = { any: 'Eat everything', pescatarian: 'Pescatarian', vegetarian: 'Vegetarian', vegan: 'Vegan' };
const AVOID = { gluten: ['Gluten', 'G'], dairy: ['Dairy', 'D'], nuts: ['Nuts', 'N'], eggs: ['Eggs', 'E'], fish: ['Fish & shellfish', 'F'], soy: ['Soy', 'S'] };
const DIET_BAN = { any: '', pescatarian: 'M', vegetarian: 'MF', vegan: 'MFEDH' };
const COOK = { 15: 'Quick · 15 min', 30: 'Normal · 30 min', 60: 'Chef · 60 min' };
// [label, kind, share of the day's calories]
const SLOTS = {
  3: [['Breakfast', 'b', .28], ['Lunch', 'm', .36], ['Dinner', 'm', .36]],
  4: [['Breakfast', 'b', .25], ['Lunch', 'm', .32], ['Snack', 's', .11], ['Dinner', 'm', .32]],
  5: [['Breakfast', 'b', .22], ['Snack', 's', .09], ['Lunch', 'm', .28], ['Snack', 's', .09], ['Dinner', 'm', .32]],
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const target = () => analyze({ ...S.profile, weight: curWeight() });

function recipeOk(r, set = M.set) {
  const fl = flagsOf(r), ban = DIET_BAN[set.diet] + set.avoid.map(a => AVOID[a][1]).join('');
  return ![...fl].some(f => ban.includes(f));
}
function portion(r, kcal) { return Math.round(clamp(kcal / nutOf(r).kcal, .5, 2.2) * 20) / 20; }

function pickRecipe(kind, kcal, cook, usedDay, usedWeek) {
  const a = target(), tp = a.protein * 4 / a.kcal, tc = a.carbs * 4 / a.kcal, tf = a.fat * 9 / a.kcal;
  let pool = RECIPES.filter(r => r.meal === kind && recipeOk(r) && !usedDay.has(r.id));
  if (!pool.length) pool = RECIPES.filter(r => r.meal === kind && recipeOk(r)); // every match is already in today's plan: repeat one
  const fast = pool.filter(r => kind === 's' || r.time <= cook);
  pool = fast.length ? fast : pool.sort((x, y) => x.time - y.time).slice(0, 4); // nothing fits the time: take the quickest
  if (!pool.length) return null;
  const score = r => {
    const n = nutOf(r), ratio = kcal / n.kcal;
    return -Math.abs(n.p * 4 / n.kcal - tp) * 4 - Math.abs(n.c * 4 / n.kcal - tc) * 3 - Math.abs(n.f * 9 / n.kcal - tf) * 3 - (ratio < .6 ? .6 - ratio : ratio > 1.8 ? ratio - 1.8 : 0) * 2 - (usedWeek.has(r.id) ? 3 : 0) + Math.random() * .6;
  };
  return pool.reduce((best, r) => score(r) > score(best) ? r : best, pool[0]);
}

function buildDay(di, cook, usedWeek, old) {
  const a = target(), usedDay = new Set(), items = [];
  SLOTS[M.set.meals].forEach(([label, kind, share], i) => {
    if (old?.[i]?.eaten) { items.push(old[i]); usedDay.add(old[i].rid); return; }
    const r = pickRecipe(kind, a.kcal * share, cook, usedDay, usedWeek);
    if (!r) return;
    usedDay.add(r.id); usedWeek.add(r.id);
    items.push({ slot: label, kind, share, rid: r.id, k: portion(r, a.kcal * share), eaten: false });
  });
  const total = items.reduce((s, it) => s + nutOf(RBY[it.rid]).kcal * it.k, 0), f = a.kcal / total;
  if (Math.abs(f - 1) > .02) items.forEach(it => { if (!it.eaten) it.k = Math.round(clamp(it.k * f, .5, 2.2) * 20) / 20; });
  return { cook, items };
}

function buildWeek() {
  const used = new Set();
  M.plan = { week: weekId(), days: M.set.times.map((t, di) => buildDay(di, t, used)) };
  M.shop = []; mealSave();
}
function ensureMeals() {
  if (!M.set) return false;
  if (!M.plan || M.plan.week !== weekId()) buildWeek();
  return true;
}
// Warn when diet and allergy filters leave very few recipes.
function filterNotes(set) {
  const n = k => RECIPES.filter(r => r.meal === k && recipeOk(r, set)).length, out = [];
  if (!n('b')) out.push('No breakfast recipe matches your filters, so breakfast is skipped and the other meals get bigger.');
  else if (n('b') < 3) out.push(`Only ${n('b')} breakfast recipe${n('b') > 1 ? 's' : ''} match your filters, so breakfasts will repeat.`);
  if (!n('m')) out.push('No lunch or dinner recipe matches your filters.');
  else if (n('m') < 6) out.push(`Only ${n('m')} lunch/dinner recipes match your filters, so meals will repeat during the week.`);
  if (set.meals > 3 && !n('s')) out.push('No snack matches your filters, so snacks are skipped.');
  return out;
}
const dayTotals = d => d.items.reduce((a, it) => { const n = nutOf(RBY[it.rid]); a.kcal += n.kcal * it.k; a.p += n.p * it.k; a.c += n.c * it.k; a.f += n.f * it.k; if (it.eaten) a.eat += n.kcal * it.k; return a; }, { kcal: 0, p: 0, c: 0, f: 0, eat: 0 });

// ---------- amounts ----------
function fmtAmt(k, g, up = false) {
  const i = ING[k], u = i[7];
  if (u) { const n = up ? Math.ceil(g / u[1] - .2) : Math.round(g / u[1] * 2) / 2; const m = Math.max(n, up ? 1 : .5); return `${m} ${u[0]}${m > 1 ? u[2] : ''}`; }
  const v = up ? Math.ceil(g / 10) * 10 : Math.max(5, Math.round(g / 5) * 5);
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kg` : `${v} g`;
}

// ---------- views ----------
const seg = on => `<div class="seg"><a class="${on === 'train' ? 'on' : ''}" href="#/plan">Training</a><a class="${on === 'meals' ? 'on' : ''}" href="#/meals">Meals</a></div>`;

function mealSetup() {
  const st = M.set || { diet: 'any', avoid: [], meals: 4, times: [30, 30, 30, 30, 30, 60, 60] };
  const draft = { ...st, avoid: [...st.avoid], times: [...st.times] };
  const wd = draft.times[0], we = draft.times[5];
  const ch = (key, opts, sel, multi) => `<div class="chips" data-k="${key}" ${multi ? 'data-multi="1"' : ''}>${opts.map(([v, l]) => `<button type="button" class="chip ${(multi ? sel.includes(v) : String(sel) === String(v)) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  view.innerHTML = `${seg('meals')}<h1>Meal setup</h1><p class="mut">Your plan targets about ${target().kcal} kcal and ${target().protein} g protein a day.</p>
  <div class="lbl">Diet</div>${ch('diet', Object.entries(DIETS), draft.diet)}
  <div class="lbl">Avoid</div>${ch('avoid', Object.entries(AVOID).map(([k, v]) => [k, v[0]]), draft.avoid, true)}
  <div class="lbl">Meals per day</div>${ch('meals', [[3, '3'], [4, '3 + snack'], [5, '3 + 2 snacks']], draft.meals)}
  <div class="lbl">Time to cook on weekdays</div>${ch('wd', Object.entries(COOK), wd)}
  <div class="lbl">Time to cook on weekends</div>${ch('we', Object.entries(COOK), we)}
  <p class="mut">You can change the cooking time for any single day later.</p><div id="fnote" class="err" style="min-height:0"></div>
  <button class="btn" id="mgo">Build my meal plan</button>`;
  view.querySelectorAll('.chips').forEach(box => box.addEventListener('click', ev => {
    const c = ev.target.closest('[data-v]'); if (!c) return;
    const k = box.dataset.k, v = c.dataset.v;
    if (box.dataset.multi) { const i = draft.avoid.indexOf(v); if (i >= 0) draft.avoid.splice(i, 1); else draft.avoid.push(v); c.classList.toggle('on'); return; }
    box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === c));
    if (k === 'diet') draft.diet = v; else if (k === 'meals') draft.meals = +v;
    else draft.times = draft.times.map((t, i) => (k === 'wd' ? i < 5 : i >= 5) ? +v : t);
  }));
  const note = () => { $('#fnote').innerHTML = filterNotes(draft).map(esc).join('<br>'); };
  view.querySelectorAll('.chips').forEach(b => b.addEventListener('click', () => setTimeout(note))); note();
  $('#mgo').onclick = () => { M.set = draft; M.plan = null; mealSave(); buildWeek(); if (location.hash === '#/meals') mealsView(); else location.hash = '#/meals'; };
}

let mDay = null;
function mealsView(arg) {
  if (needProfile()) return;
  if (arg === 'setup' || !ensureMeals()) return mealSetup();
  if (mDay === null) mDay = todayIdx();
  const a = target(), d = M.plan.days[mDay], t = dayTotals(d);
  const bar = (lbl, v, goal, cls) => `<div class="mbar"><span>${lbl}</span><div class="qbar ${cls}"><i style="width:${clamp(v / goal * 100, 0, 100)}%"></i></div><b>${Math.round(v)}/${goal} g</b></div>`;
  view.innerHTML = `${seg('meals')}<h1>Meal plan</h1>
  <div class="days">${DAYN.map((n, i) => `<button class="dpill ${i === mDay ? 'on' : ''} ${i === todayIdx() ? 'td' : ''}" onclick="mealDay(${i})"><span>${n}</span><i>${M.plan.days[i].items.every(x => x.eaten) ? '✓' : ''}</i></button>`).join('')}</div>
  <section class="card"><div class="row between"><h3>${Math.round(t.kcal)} kcal planned</h3><span class="mut">target ${a.kcal}</span></div>
  <div class="qbar kc"><i style="width:${clamp(t.eat / a.kcal * 100, 0, 100)}%"></i></div><div class="mut">${Math.round(t.eat)} kcal eaten so far</div>
  ${bar('Protein', t.p, a.protein, 'pr')}${bar('Carbs', t.c, a.carbs, 'cb')}${bar('Fat', t.f, a.fat, 'ft')}</section>
  <div class="lbl">Time to cook this day</div>
  <div class="chips">${Object.entries(COOK).map(([v, l]) => `<button class="chip ${+v === d.cook ? 'on' : ''}" onclick="setCook(${mDay},${v})">${l}</button>`).join('')}</div>
  ${d.items.map((it, i) => { const r = RBY[it.rid], n = nutOf(r); return `<a class="card meal ${it.eaten ? 'done' : ''}" href="#/recipe/${mDay}/${i}"><div class="mi">${r.ico}</div><div class="grow"><div class="mut">${it.slot} · ${r.time} min</div><div class="qt">${esc(r.name)}</div>
  <div class="mut">${Math.round(n.kcal * it.k)} kcal · P ${Math.round(n.p * it.k)} · C ${Math.round(n.c * it.k)} · F ${Math.round(n.f * it.k)}</div></div><span class="chk">${it.eaten ? '✓' : ''}</span></a>`; }).join('')}
  ${filterNotes(M.set).map(n => `<p class="mut">⚠️ ${esc(n)}</p>`).join('')}
  <button class="btn" onclick="location.hash='#/shop'">🛒 Shopping list</button>
  <button class="btn ghost" onclick="rebuildWeek()">Shuffle the whole week</button>
  <button class="btn ghost" onclick="location.hash='#/meals/setup'">Change diet and preferences</button>
  <p class="mut">Calories and macros are estimates from typical ingredient values. They are not medical or dietitian advice.</p>`;
}
window.mealDay = i => { mDay = i; mealsView(); };
window.rebuildWeek = () => { buildWeek(); mealsView(); toast('New week planned'); };
window.setCook = (di, t) => {
  const used = new Set(M.plan.days.flatMap((x, i) => i === di ? [] : x.items.map(it => it.rid)));
  M.plan.days[di] = buildDay(di, t, used, M.plan.days[di].items); mealSave(); mealsView();
};

function recipeView() {
  const [, , di, ii] = location.hash.split('/'), d = M.plan?.days[+di], it = d?.items[+ii];
  if (!it) { location.hash = '#/meals'; return; }
  const r = RBY[it.rid], n = nutOf(r);
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <div class="rhero">${r.ico}</div><div class="mut">${DAYN[+di]} · ${it.slot}</div><h1>${esc(r.name)}</h1>
  <div class="grid4"><div class="stat"><b>${Math.round(n.kcal * it.k)}</b><span>kcal</span></div><div class="stat"><b>${Math.round(n.p * it.k)}g</b><span>protein</span></div>
  <div class="stat"><b>${Math.round(n.c * it.k)}g</b><span>carbs</span></div><div class="stat"><b>${Math.round(n.f * it.k)}g</b><span>fat</span></div></div>
  <div class="chips static"><span class="chip">⏱ ${r.time} min</span><span class="chip">${it.k}× portion</span></div>
  <h2 class="sec">Ingredients</h2><div class="card">${r.ing.map(([k, g]) => `<div class="row between ing"><span>${ING[k][0]}</span><b>${fmtAmt(k, g * it.k)}</b></div>`).join('')}
  <div class="mut">Plus salt, pepper, herbs and spices to taste.</div></div>
  <h2 class="sec">Steps</h2><ol class="how">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  <button class="btn ${it.eaten ? 'ghost' : 'gold'}" onclick="toggleEat(${di},${ii})">${it.eaten ? 'Undo: not eaten' : 'I ate this · +15 XP'}</button>
  <button class="btn ghost" onclick="swapMeal(${di},${ii})">${ic('swap', 18)} Swap for another recipe</button>`;
}
window.toggleEat = (di, ii) => {
  const it = M.plan.days[di].items[ii]; it.eaten = !it.eaten;
  if (it.eaten && !it.xp && +di === todayIdx()) {
    it.xp = 1; ensureDay(); G.today.meals = (G.today.meals || 0) + 1; award(15, 3); sfx('tick'); toast('+15 XP'); checkAch();
  }
  mealSave(); flushLevelUp(recipeView);
};
window.swapMeal = (di, ii) => {
  const d = M.plan.days[di], it = d.items[ii], a = target();
  const usedDay = new Set(d.items.map(x => x.rid)), usedWeek = new Set(M.plan.days.flatMap(x => x.items.map(y => y.rid)));
  const r = pickRecipe(it.kind, a.kcal * it.share, d.cook, usedDay, usedWeek);
  if (!r) { toast('No other recipe fits your filters.'); return; }
  it.rid = r.id; it.k = portion(r, a.kcal * it.share); it.eaten = false; it.xp = 0; mealSave(); recipeView();
};

function shopView() {
  if (!ensureMeals()) { location.hash = '#/meals'; return; }
  const tot = {};
  M.plan.days.forEach(d => d.items.forEach(it => RBY[it.rid].ing.forEach(([k, g]) => { tot[k] = (tot[k] || 0) + g * it.k; })));
  const aisles = {};
  Object.entries(tot).forEach(([k, g]) => (aisles[ING[k][6]] = aisles[ING[k][6]] || []).push([k, g]));
  const key = k => M.plan.week + ':' + k;
  const text = Object.entries(aisles).map(([a, l]) => a + '\n' + l.map(([k, g]) => `- ${ING[k][0]}: ${fmtAmt(k, g, true)}`).join('\n')).join('\n\n');
  view.innerHTML = `${seg('meals')}<h1>Shopping list</h1><p class="mut">Everything for the 7 days. Amounts are rounded up.</p>
  ${Object.entries(aisles).map(([a, l]) => `<h2 class="sec">${a}</h2><div class="card">${l.sort().map(([k, g]) => `<label class="shop"><input type="checkbox" data-k="${k}" ${M.shop.includes(key(k)) ? 'checked' : ''}><span class="grow">${ING[k][0]}</span><b>${fmtAmt(k, g, true)}</b></label>`).join('')}</div>`).join('')}
  <button class="btn ghost" id="cp">Copy list</button>`;
  view.querySelectorAll('.shop input').forEach(c => c.onchange = () => {
    const kk = key(c.dataset.k); M.shop = c.checked ? [...M.shop, kk] : M.shop.filter(x => x !== kk); mealSave();
  });
  $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(text); toast('List copied'); } catch { toast('Copy is blocked on this device.'); } };
}

function mealsCard() {
  if (!M.set || !M.plan || M.plan.week !== weekId()) return `<section class="card tap row" onclick="location.hash='#/meals'"><div class="dgi">🍽️</div><div class="grow"><h3>Meal plan</h3><div class="mut">Set your diet and cooking time to get a week of recipes that hit your calories.</div></div></section>`;
  const d = M.plan.days[todayIdx()], t = dayTotals(d), nxt = d.items.findIndex(x => !x.eaten), a = target();
  return `<section class="card tap" onclick="location.hash='#/${nxt < 0 ? 'meals' : 'recipe/' + todayIdx() + '/' + nxt}'"><div class="row between"><h3>Meals today</h3><span class="mut">${d.items.filter(x => x.eaten).length}/${d.items.length} eaten</span></div>
  <div class="qbar kc"><i style="width:${clamp(t.eat / a.kcal * 100, 0, 100)}%"></i></div>
  <div class="mut">${nxt < 0 ? 'All meals done. Nice.' : `Next: ${d.items[nxt].slot} · ${esc(RBY[d.items[nxt].rid].name)} · ${RBY[d.items[nxt].rid].time} min`}</div></section>`;
}

// ---------- hooks into existing screens ----------
const _plan = planView; planView = function () { _plan(); if (view.querySelector('h1')) view.insertAdjacentHTML('afterbegin', seg('train')); };
const _home2 = home;
home = function () {
  _home2();
  const fuel = [...view.querySelectorAll('h2.sec')].find(h => h.textContent === 'Fuel');
  if (fuel) fuel.insertAdjacentHTML('beforebegin', mealsCard());
};
Object.assign(routes, { plan: planView, home, meals: mealsView, recipe: recipeView, shop: shopView });
