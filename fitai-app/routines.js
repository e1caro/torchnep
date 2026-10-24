'use strict';
// My routines: workouts you build by hand. Pick exercises from the library, set sets, reps and rest,
// reorder them and start the routine like any other workout (same XP, coins, quests and ranks).

const RT = load('routines', []);
const rtSave = () => save('routines', RT);
const rtGet = id => RT.find(r => r.id === id);
const rtDefault = e => ({ id: e.id, sets: 3, reps: e.c === 'stretching' || e.f === 'static' ? '30s' : '10', rest: e.c === 'stretching' ? 15 : 60 });
const RESTS = [0, 15, 30, 45, 60, 90, 120, 180];
let rtQ = { q: '', m: '' }, rtDel = null;

window.newRoutine = (firstEx) => {
  const r = { id: 'r' + Date.now().toString(36), name: tr(`My routine ${RT.length + 1}`), items: firstEx && BY[firstEx] ? [rtDefault(BY[firstEx])] : [], created: Date.now() };
  RT.push(r); rtSave(); location.hash = '#/routine/' + r.id;
};
window.startRoutine = id => {
  const r = rtGet(id); if (!r) return;
  const items = r.items.filter(it => BY[it.id]);
  if (!items.length) { toast('Add at least one exercise first.'); return; }
  startSession(r.name, items.map(it => ({ ...it, sets: Math.max(1, +it.sets || 1) })), { routine: id });
};

// ---------- editor ----------
function routineView(id) {
  if (needProfile()) return;
  const r = rtGet(id); if (!r) { location.hash = '#/plan'; return; }
  const sets = r.items.reduce((a, it) => a + (+it.sets || 0), 0);
  view.innerHTML = `<button class="btn sm ghost back" onclick="location.hash='#/plan'">${ic('back', 18)} Back</button><h1>Edit routine</h1>
  <div class="lbl">Name</div><input id="rt-name" value="${esc(r.name)}" maxlength="40">
  <div class="mut" style="margin-top:8px">${r.items.length} exercises · ${sets} sets · ~${Math.max(5, Math.round(sets * 2.2))} min</div>
  ${r.items.length ? `<button class="btn" onclick="startRoutine('${r.id}')" style="margin-top:10px">Start routine</button>` : '<div class="card mut">No exercises yet. Add some below.</div>'}
  ${r.items.map((it, i) => { const e = BY[it.id]; if (!e) return ''; return `<section class="card rt-item"><div class="row"><a class="row grow" href="#/exercise/${e.id}">${thumb(e)}<div><b>${esc(e.n)}</b><div class="mut">${e.m[0]} · ${e.e}</div></div></a></div>
    <div class="rt-grid"><label><span class="mut">Sets</span><input type="number" inputmode="numeric" min="1" max="10" value="${it.sets}" onchange="rtSet(${i},'sets',this.value)"></label>
    <label><span class="mut">Reps</span><input value="${esc(it.reps)}" onchange="rtSet(${i},'reps',this.value)" placeholder="10"></label>
    <label><span class="mut">Rest</span><select onchange="rtSet(${i},'rest',this.value)">${RESTS.map(s => `<option value="${s}" ${+it.rest === s ? 'selected' : ''}>${s ? s + ' s' : 'None'}</option>`).join('')}</select></label></div>
    <div class="row rt-tools"><button class="icon" aria-label="Move up" ${i ? '' : 'disabled'} onclick="rtMove(${i},-1)">${ic('up', 18)}</button><button class="icon" aria-label="Move down" ${i < r.items.length - 1 ? '' : 'disabled'} onclick="rtMove(${i},1)">${ic('down', 18)}</button>
    <span class="grow"></span><button class="icon" aria-label="Remove exercise" onclick="rtRemove(${i})">${ic('close', 18)}</button></div></section>`; }).join('')}
  <div class="mut">Reps can be a number like 10 or a time like 30s.</div>
  <h2 class="sec">Add exercises</h2>
  <input class="search" id="rt-q" placeholder="Search ${EX.length} exercises" value="${esc(rtQ.q)}">
  <select id="rt-m" style="margin:8px 0"><option value="">All muscles</option>${[...new Set(EX.flatMap(e => e.m))].sort().map(m => `<option ${m === rtQ.m ? 'selected' : ''}>${m}</option>`).join('')}</select>
  <div id="rt-res"></div>
  <button class="btn ghost" style="margin-top:16px" onclick="rtDelete('${r.id}')">${rtDel === r.id ? 'Tap again to delete' : 'Delete routine'}</button>`;
  $('#rt-name').onchange = ev => { r.name = ev.target.value.trim() || r.name; rtSave(); };
  $('#rt-q').oninput = ev => { rtQ.q = ev.target.value.toLowerCase(); rtResults(r); };
  $('#rt-m').onchange = ev => { rtQ.m = ev.target.value; rtResults(r); };
  rtResults(r);
}
function rtResults(r) {
  const box = $('#rt-res'); if (!box) return;
  const list = EX.filter(e => (!rtQ.q || exKey(e).includes(fold(rtQ.q))) && (!rtQ.m || e.m.includes(rtQ.m)));
  box.innerHTML = list.slice(0, 30).map(e => `<div class="item"><a class="row grow" href="#/exercise/${e.id}">${thumb(e)}<div><div>${esc(e.n)}</div><div class="mut">${e.m[0]} · ${e.e}</div></div></a>
    ${r.items.some(it => it.id === e.id) ? `<span class="chk">✓</span>` : `<button class="icon" aria-label="Add exercise" onclick="rtAdd('${r.id}','${e.id}')">${ic('plus', 18)}</button>`}</div>`).join('')
    + (list.length > 30 ? `<div class="mut">Showing the first 30. Refine your search.</div>` : list.length ? '' : '<div class="mut">No exercises found.</div>');
}
const rtCur = () => rtGet(location.hash.split('/')[2]);
window.rtSet = (i, k, v) => {
  const r = rtCur(), it = r?.items[i]; if (!it) return;
  if (k === 'sets') it.sets = Math.min(10, Math.max(1, parseInt(v) || 1));
  else if (k === 'rest') it.rest = +v;
  else it.reps = String(v).trim().slice(0, 12) || '10';
  rtSave(); routineView(r.id);
};
window.rtMove = (i, d) => { const r = rtCur(); if (!r) return; const j = i + d; if (j < 0 || j >= r.items.length) return; [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; rtSave(); routineView(r.id); };
window.rtRemove = i => { const r = rtCur(); if (!r) return; r.items.splice(i, 1); rtSave(); routineView(r.id); };
window.rtAdd = (id, exId) => {
  const r = rtGet(id); if (!r || !BY[exId] || r.items.some(it => it.id === exId)) return;
  r.items.push(rtDefault(BY[exId])); rtSave(); toast(`Added ${BY[exId].n}`);
  const y = scrollY; routineView(id); scrollTo(0, y);
};
window.rtDelete = id => {
  if (rtDel !== id) { rtDel = id; routineView(id); return; }
  rtDel = null; RT.splice(RT.findIndex(r => r.id === id), 1); rtSave(); toast('Routine deleted'); location.hash = '#/plan';
};

// ---------- on the Plan screen ----------
function routinesSection() {
  return `<h2 class="sec">My routines</h2>
  ${RT.length ? RT.map(r => `<section class="card"><div class="row between"><div class="grow"><h3>${esc(r.name)}</h3><div class="mut">${r.items.length} exercises · ${r.items.reduce((a, it) => a + (+it.sets || 0), 0)} sets</div></div>
    <button class="icon" aria-label="Edit routine" onclick="location.hash='#/routine/${r.id}'">${ic('edit', 18)}</button><button class="btn sm" onclick="startRoutine('${r.id}')">Start</button></div></section>`).join('')
    : '<p class="mut">Build your own workouts: choose the exercises, sets, reps and rest. They give the same XP and rewards as your plan.</p>'}
  <button class="btn ghost" onclick="newRoutine()">${ic('plus', 18)} Create a routine</button>`;
}
const _rtPlan = planView;
planView = function () {
  _rtPlan();
  const why = view.querySelector('details.why');
  if (why && S.profile) why.insertAdjacentHTML('afterend', routinesSection());
};

// ---------- "Add to routine" on the exercise page ----------
const _rtEx = exerciseView;
exerciseView = function (id) {
  _rtEx(id);
  if (!BY[id] || !S.profile) return;
  view.querySelector('h2.sec')?.insertAdjacentHTML('beforebegin', `<button class="btn ghost" onclick="rtPick('${id}')">${ic('plus', 18)} Add to a routine</button>`);
};
window.rtPick = exId => {
  const opts = RT.map(r => `<button class="btn ghost" data-r="${r.id}">${esc(r.name)}${r.items.some(it => it.id === exId) ? ' ✓' : ''}</button>`).join('');
  modal(`<h2>Add to a routine</h2>${opts}<button class="btn" data-new>${ic('plus', 18)} New routine</button><button class="btn ghost" data-close>Cancel</button>`);
  const m = $('#modal');
  m.querySelectorAll('[data-r]').forEach(b => { b.onclick = () => { m.hidden = true; const r = rtGet(b.dataset.r); if (r && !r.items.some(it => it.id === exId)) { r.items.push(rtDefault(BY[exId])); rtSave(); toast(`Added to ${r.name}`); } else toast('Already in that routine.'); }; });
  m.querySelector('[data-new]').onclick = () => { m.hidden = true; newRoutine(exId); };
};

Object.assign(routes, { plan: planView, exercise: exerciseView, routine: routineView });

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'My routines': 'Mis rutinas', 'Create a routine': 'Crear una rutina', 'Edit routine': 'Editar rutina', 'Start routine': 'Empezar rutina', 'Delete routine': 'Borrar rutina', 'Tap again to delete': 'Toca otra vez para borrar',
    'Build your own workouts: choose the exercises, sets, reps and rest. They give the same XP and rewards as your plan.': 'Crea tus propios entrenamientos: elige los ejercicios, las series, las repeticiones y el descanso. Dan la misma XP y premios que tu plan.',
    'Add exercises': 'Añadir ejercicios', 'No exercises yet. Add some below.': 'Todavía no hay ejercicios. Añade algunos abajo.', 'Reps can be a number like 10 or a time like 30s.': 'Las repeticiones pueden ser un número como 10 o un tiempo como 30s.',
    Sets: 'Series', Rest: 'Descanso', None: 'Sin descanso', '{n} s': '{n} s', 'Move up': 'Subir', 'Move down': 'Bajar', 'Remove exercise': 'Quitar ejercicio', 'Add exercise': 'Añadir ejercicio',
    '{n} exercises · {n} sets · ~{n} min': '{n} ejercicios · {n} series · ~{n} min', '{n} exercises · {n} sets': '{n} ejercicios · {n} series', 'My routine {n}': 'Mi rutina {n}',
    'Showing the first 30. Refine your search.': 'Se muestran los 30 primeros. Afina la búsqueda.', 'No exercises found.': 'No se han encontrado ejercicios.',
    'Add to a routine': 'Añadir a una rutina', 'New routine': 'Nueva rutina', 'Already in that routine.': 'Ya está en esa rutina.', 'Routine deleted': 'Rutina borrada',
    'Add at least one exercise first.': 'Añade al menos un ejercicio primero.',
  });
  i18nPat(/^Added to (.+)$/, a => `Añadido a ${a}`);
  i18nPat(/^Added (.+)$/, a => `Añadido: ${tr(a)}`);
}
