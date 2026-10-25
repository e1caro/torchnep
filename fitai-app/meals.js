'use strict';
// Meal plan: picks recipes that fit your diet, your cooking time per day and your calorie / protein targets,
// scales each portion to hit the target and builds a weekly shopping list. Runs after recipes.js and game.js.

const M = Object.assign({ set: null, plan: null, shop: [] }, load('meal', {}));
const mealSave = () => save('meal', M);
const RBY = Object.fromEntries(RECIPES.map(r => [r.id, r]));
// Ingredients you changed: in one meal (it.sw) or in all your meals (M.swap). A key maps to another ingredient, or to
// null to leave it out. A replacement keeps the calories of what it replaces (between half and double the grams).
M.swap = M.swap || {};
const swapGrams = (k, to, g) => Math.max(5, Math.round(clamp(g * ING[k][1] / Math.max(10, ING[to][1]), g * .5, g * 2) / 5) * 5);
const swapOf = (it, k) => (it.sw && k in it.sw ? it.sw[k] : k in M.swap ? M.swap[k] : k);
const itIng = it => RBY[it.rid].ing.flatMap(([k, g]) => { const to = swapOf(it, k); return to === null ? [] : to === k ? [[k, g]] : [[to, swapGrams(k, to, g)]]; });
const nutIt = it => nutOf({ ing: itIng(it) });
const DAYN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const todayIdx = () => (new Date().getDay() + 6) % 7;
const STYLE_DESC = { none: 'Meals are chosen for your calories, macros and cooking time.', ai: 'Built around fatty fish, leafy greens, vegetables, berries, nuts, beans and olive oil. Leaves out red meat, refined pasta and added sugar. General guidance, not medical advice.' };
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
// Every recipe is one serving for one person. Portions only move a little (lighter or heartier serving);
// bigger calorie targets are met with more meals a day, not with huge plates.
const PMIN = .85, PMAX = 1.15, SERVE_CAP = { b: 500, m: 600, s: 280 };
RECIPES.forEach(r => {
  const kcal = nutOf(r).kcal, cap = SERVE_CAP[r.meal];
  if (kcal > cap) r.ing = r.ing.map(([k, g]) => [k, Math.max(5, Math.round(g * cap / kcal / 5) * 5)]);
});
const target = () => analyze({ ...S.profile, weight: curWeight() });

function recipeOk(r, set = M.set, ignoreCuisine = false) {
  const fl = flagsOf(r), ban = DIET_BAN[set.diet] + set.avoid.map(a => AVOID[a][1]).join(''), cu = set.cuisines || [];
  // with cuisines chosen, lunches and dinners must belong to one of them; breakfasts and snacks may also be neutral
  if (set.style === 'ai' && !r.ai) return false; // anti-inflammatory style
  if (cu.length && !ignoreCuisine) { const hit = r.cu?.some(c => cu.includes(c)); if (r.meal === 'm' ? !hit : (r.cu && !hit)) return false; }
  return ![...fl].some(f => ban.includes(f)) && (!r.chef || has(item('r-' + r.id)));
}
function portion(r, kcal) { return Math.round(clamp(kcal / nutOf(r).kcal, PMIN, PMAX) * 20) / 20; }

// How much variety the week gets. ing: cost of each new ingredient, rep: cost of repeating a recipe, max: most uses of one recipe per week.
const VARIETY = {
  simple: { name: 'Simple', desc: 'Fewest ingredients. Meals repeat, so you can prep once and eat twice.', ing: 2, rep: .3, max: 4 },
  balanced: { name: 'Balanced', desc: 'A mix of reusing ingredients and trying new meals.', ing: .8, rep: 1.2, max: 3 },
  varied: { name: 'Varied', desc: 'Most variety, with a longer shopping list.', ing: .15, rep: 3, max: 2 },
};
const VAR = () => VARIETY[M.set?.variety] || VARIETY.simple;
const ingW = k => ING[k][6] === 'Pantry' ? .45 : 1; // staples like oil and rice are cheap to keep at home
const newCost = (r, have) => r.ing.reduce((t, [k]) => t + (have.has(k) ? 0 : ingW(k)), 0);
const weekCtx = (days, skip = -1) => {
  const have = new Set(), count = new Map();
  days.forEach((d, i) => { if (i !== skip) d.items.forEach(it => { RBY[it.rid].ing.forEach(([k]) => have.add(k)); count.set(it.rid, (count.get(it.rid) || 0) + 1); }); });
  return { have, count };
};
const nutC = new Map();
const nutFast = r => nutC.get(r.id) || (nutC.set(r.id, nutOf(r)), nutC.get(r.id));

// How well a recipe matches the calorie and macro targets for a slot (higher is better).
function fitScore(r, kcal, a) {
  const n = nutFast(r), ratio = kcal / n.kcal;
  const pd = n.p * 4 / n.kcal - a.protein * 4 / a.kcal;
  return -(pd < 0 ? -pd * 14 : pd * 6) - Math.abs(n.c * 4 / n.kcal - a.carbs * 4 / a.kcal) * 3
    - Math.abs(n.f * 9 / n.kcal - a.fat * 9 / a.kcal) * 3 - (ratio < PMIN ? PMIN - ratio : ratio > PMAX ? ratio - PMAX : 0) * 2;
}

// Recipes allowed for a slot: right meal, diet and allergies, cuisine (softly, when the chosen cuisines have too few), time limit.
function candidates(kind, cook, usedDay) {
  const cu = M.set.cuisines || [], inCu = r => !cu.length || (kind === 'm' ? r.cu?.some(c => cu.includes(c)) : (!r.cu || r.cu.some(c => cu.includes(c))));
  const base = RECIPES.filter(r => r.meal === kind && recipeOk(r, M.set, true)), match = base.filter(inCu);
  const soft = !!cu.length && match.length < (kind === 'm' ? 4 : 2); // too few in the chosen cuisines: let other cuisines fill in
  const cand = soft ? base : match;
  let pool = cand.filter(r => !usedDay.has(r.id));
  if (!pool.length) pool = cand; // every match is already in today's plan: repeat one
  const fast = pool.filter(r => kind === 's' || r.time <= cook);
  pool = fast.length ? fast : pool.slice().sort((x, y) => x.time - y.time).slice(0, 4); // nothing fits the time: take the quickest
  const adj = r => { const hit = cu.length && r.cu?.some(c => cu.includes(c)); return (hit ? .8 : 0) - (soft && !inCu(r) ? 2.5 : 0); };
  return { pool, adj };
}

function pickRecipe(kind, kcal, cook, usedDay, ctx, noise = .5, a = target()) {
  const V = VAR(), { pool: all, adj } = candidates(kind, cook, usedDay);
  if (!all.length) return null;
  const fresh = all.filter(r => (ctx.count.get(r.id) || 0) < V.max), pool = fresh.length ? fresh : all;
  let best = null, bs = -1e9, bf = 0;
  for (const r of pool) {
    const f = fitScore(r, kcal, a) + adj(r), sc = f - V.ing * newCost(r, ctx.have) - V.rep * (ctx.count.get(r.id) || 0) + Math.random() * noise;
    if (sc > bs) { bs = sc; best = r; bf = f; }
  }
  return best && { r: best, fit: bf };
}

// Picks one day's meals and records their ingredients in ctx. Meals already eaten are kept.
function pickDay(cook, ctx, old, noise) {
  const a = target(), usedDay = new Set(), items = []; let fit = 0;
  SLOTS[M.set.meals].forEach(([label, kind, share], i) => {
    let it = old?.[i]?.eaten ? old[i] : null;
    if (!it) {
      const pk = pickRecipe(kind, a.kcal * share, cook, usedDay, ctx, noise, a);
      if (!pk) return;
      fit += pk.fit; it = { slot: label, kind, share, rid: pk.r.id, k: portion(pk.r, a.kcal * share), eaten: false, fit: pk.fit };
    }
    usedDay.add(it.rid); ctx.count.set(it.rid, (ctx.count.get(it.rid) || 0) + 1); RBY[it.rid].ing.forEach(([k]) => ctx.have.add(k));
    items.push(it);
  });
  return { cook, items, fit };
}

// Overall quality of a week: nutrition fit, minus the cost of every distinct ingredient and every repeat.
function weekScore(days) {
  const V = VAR(), have = new Set(), count = new Map(); let fit = 0;
  days.forEach(d => d.items.forEach(it => { RBY[it.rid].ing.forEach(([k]) => have.add(k)); count.set(it.rid, (count.get(it.rid) || 0) + 1); fit += it.fit || 0; }));
  return fit - V.ing * [...have].reduce((s, k) => s + ingW(k), 0) - V.rep * [...count.values()].reduce((s, n) => s + Math.max(0, n - 1), 0);
}

// Tries swapping each uneaten meal for any other allowed recipe and keeps the swaps that improve the week.
function refine(days, only) {
  const a = target();
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const d of days) if (!only || d === only) d.items.forEach((it, i) => {
      if (it.eaten || it.chefPick) return;
      const { pool, adj } = candidates(it.kind, d.cook, new Set(d.items.filter((_, j) => j !== i).map(x => x.rid)));
      const orig = { rid: it.rid, fit: it.fit, k: it.k };
      let best = orig, bj = weekScore(days);
      const uses = r => days.reduce((n, x) => n + x.items.filter(y => y.rid === r.id).length, 0);
      for (const r of pool) {
        if (r.id === orig.rid || uses(r) >= VAR().max) continue; // respect the most repeats allowed per recipe
        it.rid = r.id; it.fit = fitScore(r, a.kcal * it.share, a) + adj(r);
        const j = weekScore(days);
        if (j > bj + 1e-9) { bj = j; best = { rid: r.id, fit: it.fit, k: portion(r, a.kcal * it.share) }; }
      }
      Object.assign(it, best); if (best !== orig) changed = true;
    });
    if (!changed) break;
  }
  return days;
}

// Scales the portions so the day lands on the calorie target.
function finalizeDay(d) {
  const a = target(), total = d.items.reduce((s, it) => s + nutIt(it).kcal * it.k, 0), f = a.kcal / total;
  if (Math.abs(f - 1) > .02) d.items.forEach(it => { if (!it.eaten && !it.userK) it.k = Math.round(clamp(it.k * f, PMIN, PMAX) * 20) / 20; });
  delete d.fit; return d;
}

// Makes sure a day's meals cover the energy and protein the training needs: when one serving per meal falls short,
// training snacks are added (protein-rich ones when protein is short), and only then do servings grow, up to ×1.35.
const PFUEL = 1.35;
const dayK = d => d.items.reduce((s, it) => s + nutIt(it).kcal * it.k, 0), dayP = d => d.items.reduce((s, it) => s + nutIt(it).p * it.k, 0);
function fuelDay(d) {
  const a = target();
  d.items = d.items.filter(it => !it.fuel || it.eaten); // training snacks are planned again
  finalizeDay(d);
  const used = new Set(d.items.map(x => x.rid));
  for (let n = 0; n < (M.set.meals <= 3 ? 4 : 3) && dayK(d) < a.kcal * .95; n++) {
    const miss = a.kcal - dayK(d), protShort = dayP(d) < a.protein * .9, { pool } = candidates('s', 99, used);
    if (!pool.length) break;
    const score = r => { const nu = nutFast(r); return fitScore(r, Math.min(miss, nu.kcal * PMAX), a) + (protShort ? nu.p * 4 / nu.kcal * 6 : 0) - (used.has(r.id) ? 3 : 0); };
    const r = pool.reduce((x, y) => score(y) > score(x) ? y : x), k = portion(r, Math.min(miss, nutFast(r).kcal * PMAX));
    d.items.push({ slot: 'Training snack', kind: 's', share: nutFast(r).kcal * k / a.kcal, rid: r.id, k, eaten: false, fuel: true });
    used.add(r.id);
  }
  // too much even at the smallest servings (small targets with many meals): leave out a snack, biggest first
  for (let guard = 0; guard < 2 && dayK(d) > a.kcal * 1.05; guard++) {
    const sn = d.items.map((it, i) => [it, i]).filter(([it]) => it.kind === 's' && !it.eaten).sort((x, y) => nutIt(y[0]).kcal * y[0].k - nutIt(x[0]).kcal * x[0].k)[0];
    if (!sn || d.items.length <= 3) break;
    d.items.splice(sn[1], 1); finalizeDay(d);
  }
  const tot = dayK(d);
  if (tot < a.kcal * .97) { const f = a.kcal / tot; d.items.forEach(it => { if (!it.eaten && !it.userK) it.k = Math.round(clamp(it.k * f, PMIN, PFUEL) * 20) / 20; }); }
  return d;
}

function buildDay(di, cook, old) {
  const ctx = weekCtx(M.plan.days, di), day = pickDay(cook, ctx, old, .5);
  refine(M.plan.days.map((x, i) => i === di ? day : x), day); // only this day's meals may change; the rest of the week is the reference
  return fuelDay(day);
}

// Tries many weeks and keeps the one with the best nutrition fit and the shortest shopping list.
// Unlocked chef recipes bring extra ingredients, so the planner would never choose them on its own.
// Give them a few fixed spots: dinners on the longest-cooking days, plus a breakfast and a snack.
function addChefPicks(days) {
  const a = target(), have = new Set(days.flatMap(d => d.items.flatMap(it => RBY[it.rid].ing.map(g => g[0]))));
  const order = days.map((d, i) => [d.cook, i]).sort((x, y) => y[0] - x[0] || y[1] - x[1]).map(x => x[1]);
  [['m', 0], ['m', 1], ['b', 2], ['s', 3]].forEach(([kind, n]) => {
    for (let t = 0; t < order.length; t++) {
      const d = days[order[(n + t) % order.length]];
      const idx = d.items.map((it, i) => i).reverse().find(i => d.items[i].kind === kind && !d.items[i].eaten && !d.items[i].chefPick);
      if (idx === undefined) continue;
      const it = d.items[idx], { pool } = candidates(kind, d.cook, new Set(d.items.map(x => x.rid)));
      const chefs = pool.filter(r => r.chef && !days.some(x => x.items.some(y => y.rid === r.id)));
      if (!chefs.length) return; // no unlocked chef recipe of this kind fits
      const kcal = a.kcal * it.share, score = r => fitScore(r, kcal, a) - .3 * newCost(r, have) + Math.random() * .5;
      const r = chefs.reduce((x, y) => score(y) > score(x) ? y : x);
      Object.assign(it, { rid: r.id, fit: fitScore(r, kcal, a), k: portion(r, kcal), chefPick: true });
      r.ing.forEach(([k]) => have.add(k)); return;
    }
  });
  return days;
}

function buildWeek() {
  const trials = [];
  for (let t = 0; t < 120; t++) {
    const ctx = { have: new Set(), count: new Map() }, days = M.set.times.map(c => pickDay(c, ctx, null, .8));
    trials.push({ days, j: weekScore(days) });
  }
  // polish the best few random weeks by swapping single meals, then keep the best result
  const best = trials.sort((x, y) => y.j - x.j).slice(0, 4).map(t => refine(t.days)).reduce((x, y) => weekScore(y) > weekScore(x) ? y : x);
  M.plan = { week: weekId(), v: 3, days: addChefPicks(best).map(fuelDay), kcal: target().kcal, prot: target().protein };
  M.shop = []; mealSave();
}
const weekIngredients = () => new Set(M.plan.days.flatMap(d => d.items.flatMap(it => RBY[it.rid].ing.map(g => g[0])))).size;
const timesInWeek = rid => M.plan.days.reduce((s, d) => s + d.items.filter(i => i.rid === rid).length, 0);
function ensureMeals() {
  if (!M.set) return false;
  if (M.plan?.v === 2 && M.plan.week === weekId()) { // portions are now one serving each: shrink this week's plan in place, keeping what was eaten
    M.plan.days.forEach(d => { d.items.forEach(it => { it.k = Math.round(clamp(it.k, PMIN, PMAX) * 20) / 20; }); finalizeDay(d); }); M.plan.v = 3; mealSave();
  }
  if (!M.plan || M.plan.week !== weekId() || M.plan.v !== 3) buildWeek(); // v3: one serving per person
  // the training plan or your weight changed what you need: fit today and the days ahead again
  const a = target();
  if (M.plan.kcal !== a.kcal || M.plan.prot !== a.protein) {
    M.plan.days.forEach((d, i) => { if (i >= todayIdx()) fuelDay(d); });
    M.plan.kcal = a.kcal; M.plan.prot = a.protein; mealSave();
  }
  return true;
}
// Warn when diet and allergy filters leave very few recipes.
function filterNotes(set) {
  const n = k => RECIPES.filter(r => r.meal === k && recipeOk(r, set)).length, nAny = k => RECIPES.filter(r => r.meal === k && recipeOk(r, set, true)).length, out = [];
  const cuNames = (set.cuisines || []).map(c => CUISINES[c]).join(' + ');
  if (cuNames && n('m') < 4) out.push(`Only ${n('m')} lunch/dinner recipe${n('m') === 1 ? '' : 's'} in ${cuNames} fit your diet and allergies, so other cuisines fill in.`);
  if (cuNames && n('b') < 2 && nAny('b') >= 2) out.push(`Few ${cuNames} breakfasts fit your diet, so other breakfasts fill in.`);
  if (!nAny('b')) out.push('No breakfast recipe matches your filters, so breakfast is skipped and the other meals get bigger.');
  else if (nAny('b') < 3) out.push(`Only ${nAny('b')} breakfast recipe${nAny('b') > 1 ? 's' : ''} match your filters, so breakfasts will repeat.`);
  if (!nAny('m')) out.push('No lunch or dinner recipe matches your filters.');
  else if (nAny('m') < 6) out.push(`Only ${nAny('m')} lunch/dinner recipes match your filters, so meals will repeat during the week.`);
  if (set.meals > 3 && !nAny('s')) out.push('No snack matches your filters, so snacks are skipped.');
  return out;
}
const dayTotals = d => d.items.reduce((a, it) => { const n = nutIt(it); a.kcal += n.kcal * it.k; a.p += n.p * it.k; a.c += n.c * it.k; a.f += n.f * it.k; if (it.eaten) a.eat += n.kcal * it.k; return a; }, { kcal: 0, p: 0, c: 0, f: 0, eat: 0 });

// ---------- amounts ----------
function fmtAmt(k, g, up = false) {
  const i = ING[k], u = i[7];
  if (u) { const n = up ? Math.ceil(g / u[1] - .2) : Math.round(g / u[1] * 2) / 2; const m = Math.max(n, up ? 1 : .5); return `${m} ${u[0]}${m > 1 ? u[2] : ''}`; }
  const v = up ? Math.ceil(g / 10) * 10 : Math.max(5, Math.round(g / 5) * 5);
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kg` : `${v} g`;
}

// ---------- views ----------
const seg = on => `<div class="seg"><a class="${on === 'train' ? 'on' : ''}" href="#/plan">Training</a><a class="${on === 'dun' ? 'on' : ''}" href="#/dungeons">Dungeons</a><a class="${on === 'meals' ? 'on' : ''}" href="#/meals">Meals</a></div>`;

function mealSetup() {
  const st = M.set || { diet: 'any', avoid: [], meals: 4, variety: 'simple', style: 'none', cuisines: [], times: [30, 30, 30, 30, 30, 60, 60] };
  const draft = { ...st, style: st.style || 'none', variety: st.variety || 'simple', avoid: [...st.avoid], cuisines: [...(st.cuisines || [])], times: [...st.times] };
  const wd = draft.times[0], we = draft.times[5];
  const ch = (key, opts, sel, multi) => `<div class="chips" data-k="${key}" ${multi ? 'data-multi="1"' : ''}>${opts.map(([v, l]) => `<button type="button" class="chip ${(multi ? sel.includes(v) : String(sel) === String(v)) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  view.innerHTML = `${seg('meals')}<h1>Meal setup</h1><p class="mut">Your plan targets about ${target().kcal} kcal and ${target().protein} g protein a day.</p>
  <div class="lbl">Diet</div>${ch('diet', Object.entries(DIETS), draft.diet)}
  <div class="lbl">Avoid</div>${ch('avoid', Object.entries(AVOID).map(([k, v]) => [k, v[0]]), draft.avoid, true)}
  <div class="lbl">Meals per day</div>${ch('meals', [[3, '3'], [4, '3 + snack'], [5, '3 + 2 snacks']], draft.meals)}
  <details class="fold"><summary><h2 class="sec">More options</h2></summary>
  <div class="lbl">Eating style</div>${ch('style', [['none', 'No preference'], ['ai', 'Anti-inflammatory']], draft.style)}
  <div class="mut" id="sdesc">${STYLE_DESC[draft.style]}</div>
  <div class="lbl">Cuisine</div>${ch('cuisines', Object.entries(CUISINES).map(([k, v]) => [k, `${CUISINE_ICO[k]} ${v}`]), draft.cuisines, true)}
  <div class="lbl">Variety</div>${ch('variety', Object.entries(VARIETY).map(([k, v]) => [k, v.name]), draft.variety || 'simple')}<div class="mut" id="vdesc">${VARIETY[draft.variety || 'simple'].desc}</div>
  <div class="lbl">Time to cook on weekdays</div>${slider('wd', Object.entries(COOK), wd)}
  <div class="lbl">Time to cook on weekends</div>${slider('we', Object.entries(COOK), we)}
  </details>
  <div id="fnote" class="err" style="min-height:0"></div>
  <button class="btn" id="mgo">Build my meal plan</button>`;
  view.querySelectorAll('.chips').forEach(box => box.addEventListener('click', ev => {
    const c = ev.target.closest('[data-v]'); if (!c) return;
    const k = box.dataset.k, v = c.dataset.v;
    if (box.dataset.multi) { const arr = draft[k], i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); c.classList.toggle('on'); return; }
    box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === c));
    if (k === 'diet') draft.diet = v; else if (k === 'style') { draft.style = v; $('#sdesc').textContent = STYLE_DESC[v]; } else if (k === 'variety') { draft.variety = v; $('#vdesc').textContent = VARIETY[v].desc; } else if (k === 'meals') draft.meals = +v;
    else draft.times = draft.times.map((t, i) => (k === 'wd' ? i < 5 : i >= 5) ? +v : t);
  }));
  view.querySelectorAll('.sld input').forEach(el => el.addEventListener('change', () => { const k = el.parentElement.dataset.k, v = +sldVal(el); draft.times = draft.times.map((t, i) => (k === 'wd' ? i < 5 : i >= 5) ? v : t); }));
  const note = () => { $('#fnote').innerHTML = filterNotes(draft).map(esc).join('<br>'); };
  view.querySelectorAll('.chips').forEach(b => b.addEventListener('click', () => setTimeout(note))); note();
  $('#mgo').onclick = () => {
    $('#mgo').textContent = 'Planning your week…'; $('#mgo').disabled = true;
    setTimeout(() => { M.set = draft; M.plan = null; mealSave(); buildWeek(); if (location.hash === '#/meals') mealsView(); else location.hash = '#/meals'; }, 30);
  };
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
  ${bar('Protein', t.p, a.protein, 'pr')}${bar('Carbs', t.c, a.carbs, 'cb')}${bar('Fat', t.f, a.fat, 'ft')}
  ${t.kcal < a.kcal * .9 && M.set.meals < 5 ? `<div class="mut" style="margin-top:8px">💡 One serving per meal falls short of your target. <a href="#/meals/setup" style="color:var(--acc2)">Choose ${M.set.meals + 1} meals a day</a> to eat enough.</div>` : ''}</section>
  ${(() => { const avgP = M.plan.days.reduce((x, y) => x + dayTotals(y).p, 0) / 7; return avgP < a.protein * .9 ? `<p class="mut">💡 This week averages ${Math.round(avgP)} g protein against a ${a.protein} g target. A longer cooking time, "Balanced" variety or a protein snack closes the gap.</p>` : ''; })()}
  <div class="mut">🛒 ${weekIngredients()} ingredients this week · ${VAR().name}${M.set.style === 'ai' ? ' · Anti-inflammatory' : ''}${(M.set.cuisines || []).length ? ' · ' + M.set.cuisines.map(c => CUISINES[c]).join(' + ') : ''} · <a href="#/meals/setup" style="color:var(--acc2)">change</a></div>
  <div class="lbl">Time to cook this day</div>
  ${d.items.some(it => it.kind !== 's' && RBY[it.rid].time > d.cook) ? '<p class="mut">⚠️ Your diet and cuisine choices leave no faster option for some meals, so they take a little longer than this.</p>' : ''}
  <div class="chips">${Object.entries(COOK).map(([v, l]) => `<button class="chip ${+v === d.cook ? 'on' : ''}" onclick="setCook(${mDay},${v})">${l}</button>`).join('')}</div>
  ${d.items.map((it, i) => { const r = RBY[it.rid], n = nutIt(it); return `<a class="card meal ${it.eaten ? 'done' : ''}" href="#/recipe/${mDay}/${i}"><div class="mi">${r.ico}</div><div class="grow"><div class="mut">${it.slot} · ${r.time} min${r.cu ? ' · ' + CUISINE_ICO[r.cu[0]] + ' ' + CUISINES[r.cu[0]] : ''}${r.chef ? ' · ⭐ Chef' : ''}${r.ai ? ' · ' + gi('leaf') : ''}${timesInWeek(it.rid) > 1 ? ` · ×${timesInWeek(it.rid)} this week` : ''}</div><div class="qt">${esc(r.name)}</div>
  <div class="mut">${Math.round(n.kcal * it.k)} kcal · P ${Math.round(n.p * it.k)} · C ${Math.round(n.c * it.k)} · F ${Math.round(n.f * it.k)}</div></div><span class="chk">${it.eaten ? '✓' : ''}</span></a>`; }).join('')}
  ${filterNotes(M.set).map(n => `<p class="mut">⚠️ ${esc(n)}</p>`).join('')}
  <button class="btn" onclick="location.hash='#/shop'">${gi('pack')} Shopping list</button>
  <button class="btn ghost" onclick="rebuildWeek()">Shuffle the whole week</button>
  <button class="btn ghost" onclick="location.hash='#/rewards'">${gi('chef')} See which chef recipes you unlock next</button>
  <button class="btn ghost" onclick="location.hash='#/meals/setup'">Change diet and preferences</button>
  <p class="mut">Calories and macros are estimates from typical ingredient values. They are not medical or dietitian advice.</p>`;
}
window.mealDay = i => { mDay = i; mealsView(); };
window.rebuildWeek = () => { toast('Planning your week…'); setTimeout(() => { buildWeek(); mealsView(); toast('New week planned'); }, 30); };
window.setCook = (di, t) => {
  M.plan.days[di] = buildDay(di, t, M.plan.days[di].items); mealSave(); mealsView();
};

// Serving size chosen by appetite: kept by the planner, and used for kcal, macros and the shopping list.
const HUNGER = [['Not very hungry', .75], ['Normal hunger', 1], ['Hungry', 1.25], ['Very hungry', 1.5]];
window.setPortion = (di, ii, k) => {
  const it = M.plan?.days[+di]?.items[+ii]; if (!it) return;
  it.k = Math.round(clamp(k, .5, 2) * 20) / 20; it.userK = 1; mealSave(); sfx('tick'); recipeView();
};
function recipeView() {
  const [, , di, ii] = location.hash.split('/'), d = M.plan?.days[+di], it = d?.items[+ii];
  if (!it) { location.hash = '#/meals'; return; }
  const r = RBY[it.rid], n = nutIt(it);
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button>
  <div class="rhero">${r.ico}</div><div class="mut">${DAYN[+di]} · ${it.slot}</div><h1>${esc(r.name)}</h1>
  <div class="grid4"><div class="stat"><b>${Math.round(n.kcal * it.k)}</b><span>kcal</span></div><div class="stat"><b>${Math.round(n.p * it.k)}g</b><span>protein</span></div>
  <div class="stat"><b>${Math.round(n.c * it.k)}g</b><span>carbs</span></div><div class="stat"><b>${Math.round(n.f * it.k)}g</b><span>fat</span></div></div>
  <div class="chips static"><span class="chip">⏱ ${r.time} min</span>${r.cu ? `<span class="chip">${CUISINE_ICO[r.cu[0]]} ${CUISINES[r.cu[0]]}</span>` : ''}${r.ai ? `<span class="chip on">${gi('leaf')} Anti-inflammatory</span>` : ''}<span class="chip">1 person · ${it.k < .95 ? 'light serving' : it.k > 1.3 ? 'large serving' : it.k > 1.05 ? 'hearty serving' : 'standard serving'}</span></div>
  ${r.ai ? `<p class="mut">${gi('leaf')} Rich in ${r.aiGood.slice(0, 4).map(k => ING[k][0].toLowerCase()).join(', ')}. No red meat, refined pasta or added sugar.</p>` : ''}
  <section class="card hunger"><div class="row between"><h3>How hungry are you?</h3><span class="mut">×${it.k.toFixed(2)}</span></div>
    <div class="chips">${HUNGER.map(([l, k]) => `<button class="chip ${Math.abs(it.k - k) < .03 ? 'on' : ''}" onclick="setPortion(${di},${ii},${k})">${l}</button>`).join('')}</div>
    <div class="row"><button class="btn sm ghost" aria-label="Less food" onclick="setPortion(${di},${ii},${it.k - .1})">− Less</button><span class="grow"></span><button class="btn sm ghost" aria-label="More food" onclick="setPortion(${di},${ii},${it.k + .1})">+ More</button></div></section>
  <h2 class="sec">Ingredients</h2><div class="card">${r.ing.map(([k, g]) => ingRow(+di, +ii, it, k, g)).join('')}
  <div class="mut">Plus salt, pepper, herbs and spices to taste.</div></div>
  <h2 class="sec">Steps</h2><ol class="how">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  <button class="btn ${it.eaten ? 'ghost' : 'gold'}" onclick="toggleEat(${di},${ii})">${it.eaten ? 'Undo: not eaten' : 'I ate this · +15 XP'}</button>
  <button class="btn ghost" onclick="swapMeal(${di},${ii})">${ic('swap', 18)} Swap for another recipe</button>`;
}
// ---------- leave out or replace an ingredient ----------
let ING_OPEN = '', ING_ALL = false;
// replacements: same aisle, allowed by your diet, closest in protein / carbs / fat balance and in calories per gram
function subsFor(k) {
  const set = M.set || { diet: 'any', avoid: [] }, ban = DIET_BAN[set.diet] + set.avoid.map(a => AVOID[a][1]).join('');
  const prof = x => { const i = ING[x], e = Math.max(1, i[2] * 4 + i[3] * 4 + i[4] * 9); return [i[2] * 4 / e, i[3] * 4 / e, i[4] * 9 / e, Math.log(Math.max(5, i[1]))]; };
  const a = prof(k);
  return Object.keys(ING).filter(x => x !== k && ING[x][6] === ING[k][6] && ![...ING[x][5]].some(f => ban.includes(f)) && M.swap[x] !== null)
    .map(x => { const b = prof(x); return [x, Math.abs(a[0] - b[0]) * 2 + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]) * .4]; })
    .sort((x, y) => x[1] - y[1]).slice(0, 4).map(([x]) => x);
}
function ingRow(di, ii, it, k, g) {
  const to = swapOf(it, k), id = `${di}:${ii}:${k}`, open = ING_OPEN === id, everywhere = !(it.sw && k in it.sw) && k in M.swap;
  const shown = to === null ? '' : to === k ? `<span>${ING[k][0]}</span><b>${fmtAmt(k, g * it.k)}</b>`
    : `<span>${ING[to][0]}</span><b>${fmtAmt(to, swapGrams(k, to, g) * it.k)}</b>`;
  return `<div class="ingwrap ${to === null ? 'gone' : to !== k ? 'swapped' : ''}"><div class="row between ing">
    ${to === null ? `<span class="ingout">${ING[k][0]}</span><i class="mut">Left out</i>` : shown}
    ${to !== k ? `<button class="icon" aria-label="Undo" onclick="ingUndo(${di},${ii},'${k}')">↺</button>` : `<button class="icon ingbtn" aria-label="Change" onclick="ingMenu('${id}')">⋯</button>`}</div>
    ${to !== k && to !== null ? `<div class="mut ingnote">Instead of <span>${ING[k][0]}</span>${everywhere ? ' · <span>in all your meals</span>' : ''}</div>` : ''}
    ${to === null && everywhere ? '<div class="mut ingnote">In all your meals</div>' : ''}
    ${open ? `<div class="ingmenu"><div class="lbl">Replace with</div>
      <div class="chips">${subsFor(k).map(x => `<button class="chip" onclick="ingSet(${di},${ii},'${k}','${x}')">${ING[x][0]}</button>`).join('') || '<span class="mut">No similar ingredient for your diet</span>'}</div>
      <button class="btn sm ghost" onclick="ingSet(${di},${ii},'${k}','')">✕ Leave it out</button>
      <label class="row ingall"><input type="checkbox" ${ING_ALL ? 'checked' : ''} onchange="ING_ALL=this.checked"><span>In all my meals, not just this one</span></label></div>` : ''}</div>`;
}
window.ingMenu = id => { ING_OPEN = ING_OPEN === id ? '' : id; ING_ALL = false; recipeView(); };
window.ingSet = (di, ii, k, to) => {
  const it = M.plan.days[di].items[ii], v = to || null;
  if (ING_ALL) { M.swap[k] = v; M.plan.days.forEach(d => d.items.forEach(x => { if (x.sw) delete x.sw[k]; })); }
  else it.sw = { ...(it.sw || {}), [k]: v };
  ING_OPEN = ''; mealSave(); sfx('tick');
  toast(v ? `${tr(ING[k][0])} → ${tr(ING[v][0])}` : tr('Ingredient left out'));
  recipeView();
};
window.ingUndo = (di, ii, k) => {
  const it = M.plan.days[di].items[ii];
  if (it.sw && k in it.sw) delete it.sw[k]; else delete M.swap[k];
  mealSave(); recipeView();
};
window.toggleEat = (di, ii) => {
  const it = M.plan.days[di].items[ii]; it.eaten = !it.eaten;
  if (it.eaten && !it.xp && +di === todayIdx()) {
    it.xp = 1; ensureDay(); G.today.meals = (G.today.meals || 0) + 1; award(15, 3); sfx('tick'); toast('+15 XP'); checkAch();
  }
  if (window.checkPerfect) checkPerfect(+di);
  mealSave(); flushLevelUp(recipeView);
};
window.swapMeal = (di, ii) => {
  const d = M.plan.days[di], it = d.items[ii], a = target();
  const usedDay = new Set(d.items.map(x => x.rid)), ctx = weekCtx(M.plan.days, +di);
  d.items.forEach((x, j) => { if (j !== +ii) RBY[x.rid].ing.forEach(([k]) => ctx.have.add(k)); });
  const pk = pickRecipe(it.kind, a.kcal * it.share, d.cook, usedDay, ctx, 1.5, a);
  if (!pk) { toast('No other recipe fits your filters.'); return; }
  const r = pk.r; it.rid = r.id; it.k = it.userK ? it.k : portion(r, a.kcal * it.share); it.eaten = false; it.xp = 0; mealSave(); recipeView();
};

function groceryView() {
  if (!ensureMeals()) { location.hash = '#/meals'; return; }
  const tot = {};
  M.plan.days.forEach(d => d.items.forEach(it => itIng(it).forEach(([k, g]) => { tot[k] = (tot[k] || 0) + g * it.k; })));
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

// The meal that fits the time of day best (still to eat, closest to its usual hour), then all of today's meals to open any recipe.
const MEAL_HOUR = { b: 8, l: 14, d: 21 };
function mealHours(d) {
  const hs = d.items.map(it => it.fuel ? 18 : MEAL_HOUR[it.kind] ?? null);
  return hs.map((h, i) => h ?? ((hs.slice(0, i).reverse().find(x => x != null) ?? 8) + (hs.slice(i + 1).find(x => x != null) ?? 22)) / 2);
}
function mealsCard() {
  if (M.set) ensureMeals();
  if (!M.set || !M.plan || M.plan.week !== weekId()) return `<section class="card tap row" onclick="location.hash='#/meals'"><div class="dgi">${gi('cutlery')}</div><div class="grow"><h3>Meal plan</h3><div class="mut">Set your diet and cooking time to get a week of recipes that hit your calories.</div></div></section>`;
  const di = todayIdx(), d = M.plan.days[di], t = dayTotals(d), a = target(), hrs = mealHours(d), now = new Date().getHours() + new Date().getMinutes() / 60;
  const left = d.items.map((it, i) => i).filter(i => !d.items[i].eaten);
  const pick = left.length ? left.reduce((b2, i) => Math.abs(hrs[i] - now) < Math.abs(hrs[b2] - now) ? i : b2, left[0]) : -1;
  // one line per meal: the one for now stands out, eaten ones are ticked and dimmed
  return `<section class="card mealsnow"><div class="row between" onclick="location.hash='#/meals'"><h3>Meals today</h3><span class="mut">${d.items.filter(x => x.eaten).length}/${d.items.length} eaten</span></div>
  <div class="qbar kc"><i style="width:${clamp(t.eat / a.kcal * 100, 0, 100)}%"></i></div>
  ${d.items.map((x, i) => { const r = RBY[x.rid]; return `<a class="mrow ${i === pick ? 'now' : ''} ${x.eaten ? 'done' : ''}" href="#/recipe/${di}/${i}"><span class="mi">${r.ico}</span><span class="grow"><small>${x.slot}</small><b>${esc(r.name)}</b></span>${x.eaten ? '<span class="chk">✓</span>' : `<span class="mut">${r.time} min</span>`}</a>`; }).join('')}</section>`;
}

// ---------- hooks into existing screens ----------
const _plan = planView; planView = function () { _plan(); if (view.querySelector('h1')) view.insertAdjacentHTML('afterbegin', seg('train')); };
const _home2 = home;
home = function () {
  _home2();
  const fuel = [...view.querySelectorAll('h2.sec')].find(h => h.textContent === 'Fuel');
  if (fuel) fuel.insertAdjacentHTML('beforebegin', mealsCard());
};
Object.assign(routes, { plan: planView, home, meals: mealsView, recipe: recipeView, shop: groceryView });
