'use strict';
// Your own exercises: a name, a description, equipment, difficulty and the muscles, marked on the body map (front and
// back): first tap = main muscle, second = helper, third = clear. They are saved with your data (and so in your
// account), show in the library and in routines like any other exercise, and can be shared with the community
// (community.js). No photos or videos: the picture is the muscle map.

const MYX = load('myex', []);
const myxSave = () => save('myex', MYX);
// body map regions -> exercise muscle names (the reverse of bodymap.js MUS_SLUG)
const SLUG_MUS = { abs: 'abdominals', obliques: 'abdominals', adductors: 'adductors', biceps: 'biceps', calves: 'calves', chest: 'chest', deltoids: 'shoulders',
  forearm: 'forearms', gluteal: 'glutes', hamstring: 'hamstrings', 'lower-back': 'lower back', neck: 'neck', quadriceps: 'quadriceps', tibialis: 'calves',
  trapezius: 'traps', triceps: 'triceps', 'upper-back': 'lats' };
const MYX_EQ = ['body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands', 'e-z curl bar', 'medicine ball', 'exercise ball', 'other'];
const MYX_LV = ['beginner', 'intermediate', 'expert'];

// a short list of insults and slurs (Spanish and English) that names and descriptions may not contain
const BAD_WORDS = ['puta', 'puto', 'mierda', 'cabron', 'cabrón', 'gilipollas', 'coño', 'joder', 'polla', 'zorra', 'maricon', 'maricón', 'subnormal', 'retrasado',
  'hijoputa', 'follar', 'pene', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard', 'rape', 'nazi', 'porn', 'sex'];
const badWord = t => { const w = fold(String(t)).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/); return BAD_WORDS.some(b => w.includes(fold(b))); };

// the exercise as the rest of the app sees it
const myxEx = x => ({ id: x.id, n: x.n, l: x.l, e: x.e, c: 'strength', m: x.m, s: x.s, f: '', i: x.d ? x.d.split(/\n+/).filter(Boolean) : [], x: true, own: true, cid: x.cid || null, by: x.by || null });
function myExLoad() { return MYX.map(myxEx); }
function myxPut(x) { const e = myxEx(x); const i = EX.findIndex(o => o.id === e.id); if (i >= 0) EX[i] = e; else EX.push(e); BY[e.id] = e; }

// ---------- the clickable muscle map ----------
let MM = {}; // region -> 1 (main) or 2 (helper)
function muscleEditor() {
  if (!BODY) return '<div class="mut">Loading the muscle map…</div>';
  const g = bodyGender(), side = sd => {
    const [ox, oy, w, h] = BODY.view[g][sd].split(' ').map(Number);
    return `<svg class="mmsvg" viewBox="${ox} ${oy} ${w} ${h}" role="group" aria-label="${sd}">${BODY[g][sd].map(([slug, ps]) => ps.map(d => SKIN_PARTS.has(slug) || !SLUG_MUS[slug]
      ? `<path d="${d}" fill="var(--bm-skin)"/>` : `<path d="${d}" data-s="${slug}" class="mmp" fill="${MM[slug] === 1 ? 'var(--bm1)' : MM[slug] === 2 ? 'var(--bm2)' : 'var(--bm0)'}"/>`).join('')).join('')}</svg>`;
  };
  return `<div class="seg mmtabs"><a role="button" class="on" data-side="front" onclick="mmSide('front')">Front view</a><a role="button" data-side="back" onclick="mmSide('back')">Back view</a></div>
    <div class="mmedit" data-side="front" onclick="mmTap(event)">${side('front')}${side('back')}</div>
    <div class="mmleg"><span><i style="background:var(--bm1)"></i>Main</span><span><i class="mm2"></i>Helper</span><span><i class="mm0"></i>Not used</span></div>
    <div class="mmsel" id="mmsel">${mmChips()}</div>`;
}
window.mmSide = sd => {
  $('.mmedit').dataset.side = sd;
  document.querySelectorAll('.mmtabs a').forEach(a => a.classList.toggle('on', a.dataset.side === sd)); sfx('tick');
};
const mmMuscles = () => {
  const main = [...new Set(Object.entries(MM).filter(([, v]) => v === 1).map(([s]) => SLUG_MUS[s]))];
  return { m: main, s: [...new Set(Object.entries(MM).filter(([, v]) => v === 2).map(([s]) => SLUG_MUS[s]))].filter(x => !main.includes(x)) };
};
const mmChips = () => {
  const { m, s } = mmMuscles();
  if (!m.length && !s.length) return `<div class="mut">${tr('Nothing marked yet: tap a muscle on the body.')}</div>`;
  const row = (t, l, on) => l.length ? `<div class="row mmrow"><b>${tr(t)}</b><div class="chips static">${l.map(x => `<span class="chip ${on ? 'on' : ''}">${tr(x)}</span>`).join('')}</div></div>` : '';
  return row('Main', m, true) + row('Helper', s, false);
};
window.mmTap = ev => {
  const p = ev.target.closest('.mmp'); if (!p) return;
  const sl = p.dataset.s, v = ((MM[sl] || 0) + 1) % 3;
  if (v) MM[sl] = v; else delete MM[sl];
  document.querySelectorAll(`.mmp[data-s="${sl}"]`).forEach(q => q.setAttribute('fill', v === 1 ? 'var(--bm1)' : v === 2 ? 'var(--bm2)' : 'var(--bm0)'));
  $('#mmsel').innerHTML = mmChips(); sfx('tick');
};
// muscle names -> regions, to edit an exercise again
const mmFrom = (m, s) => { const o = {}; Object.entries(SLUG_MUS).forEach(([sl, mu]) => { if (s.includes(mu)) o[sl] = 2; if (m.includes(mu)) o[sl] = 1; }); return o; };

// ---------- screens ----------
let MYX_FROM = '';
window.myexNew = () => { MYX_FROM = /^#\/routine\//.test(location.hash) ? location.hash : ''; location.hash = '#/myex/new'; };
function myexView(arg) {
  if (needProfile()) return;
  if (arg) return myexEdit(arg);
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} Back</button><h1>My exercises</h1>
  <div class="mut">Exercises you create: they work in routines like any other, and you can share them in the Guild.</div>
  <button class="btn" onclick="myexNew()">${ic('plus', 18)} Create an exercise</button>
  ${MYX.length ? MYX.map(x => `<a class="card row li" href="#/myex/${x.id}">${thumb(myxEx(x))}<div class="grow"><div>${esc(x.n)}</div><div class="mut">${tr(x.e)} · ${tr(x.l)}${x.cid ? ' · <b>Shared</b>' : ''}</div></div>${ic('edit', 18)}</a>`).join('') : '<div class="mut" style="margin-top:12px">No exercises yet.</div>'}
  <button class="btn ghost" onclick="location.hash='#/guild'">${gi('scroll')} Open the Guild</button>`;
}
function myexEdit(id) {
  const x = id === 'new' ? null : MYX.find(o => o.id === id);
  if (id !== 'new' && !x) { location.hash = '#/myex'; return; }
  MM = x ? mmFrom(x.m, x.s) : {};
  const opt = (vals, cur) => vals.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${tr(v)}</option>`).join('');
  const step = (n, t, sub = '') => `<div class="mxstep"><b>${n}</b><span>${tr(t)}</span>${sub ? `<em class="mut">${tr(sub)}</em>` : ''}</div>`;
  view.innerHTML = `<button class="btn sm ghost back" onclick="${MYX_FROM ? `location.hash='${MYX_FROM}'` : `location.hash='#/myex'`}">${ic('back', 18)} Back</button><h1>${x ? 'Edit exercise' : 'New exercise'}</h1>
  ${step(1, 'Name')}<div class="inp"><input id="mx-n" maxlength="50" placeholder="${esc(tr('For example: Towel row'))}" value="${esc(x?.n || '')}"></div>
  ${step(2, 'Muscles it works')}<div class="mut mmhint">Tap a muscle on the body: once = main, twice = helper, three times = clear. Turn the body with Front / Back.</div>
  ${muscleEditor()}
  ${step(3, 'Equipment and difficulty')}
  <div class="two"><label class="fld"><span>Equipment</span><select id="mx-e">${opt(MYX_EQ, x?.e || 'body only')}</select></label>
  <label class="fld"><span>Difficulty</span><select id="mx-l">${opt(MYX_LV, x?.l || 'beginner')}</select></label></div>
  ${step(4, 'How to do it', '(optional)')}<textarea id="mx-d" rows="4" maxlength="800" placeholder="${esc(tr('One step per line'))}">${esc(x?.d || '')}</textarea>
  <div id="mx-err" class="err"></div>
  <button class="btn mxsave" onclick="myexSave('${x?.id || ''}')">${ic('check', 18)} ${x ? 'Save' : 'Create exercise'}</button>
  ${x ? `<button class="btn ghost" onclick="${x.cid ? `guildUnshare('${x.id}')` : `guildShare('${x.id}')`}">${gi('scroll')} ${x.cid ? 'Stop sharing' : 'Share with the community'}</button>
    <button class="btn ghost danger" onclick="myexDelete('${x.id}')">Delete</button>` : ''}`;
  if (!BODY) setTimeout(() => { if (location.hash.startsWith('#/myex/')) myexEdit(id); }, 800);
}
window.myexSave = id => {
  const n = $('#mx-n').value.trim().replace(/\s+/g, ' '), d = $('#mx-d').value.trim(), { m, s } = mmMuscles(), err = t => { $('#mx-err').textContent = tr(t); };
  if (n.length < 3) return err('Give it a name (at least 3 letters).');
  if (!m.length) return err('Mark at least one main muscle on the map.');
  if (badWord(n) || badWord(d)) return err('Please use respectful words.');
  let x = MYX.find(o => o.id === id);
  if (!x) { x = { id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: Date.now() }; MYX.push(x); }
  Object.assign(x, { n, d, e: $('#mx-e').value, l: $('#mx-l').value, m, s });
  myxSave(); myxPut(x); sfx('claim'); toast(tr('Exercise saved'));
  if (x.cid && typeof guildShare === 'function') guildShare(x.id, true);
  const r = MYX_FROM && typeof rtGet === 'function' ? rtGet(MYX_FROM.split('/')[2]) : null;
  if (r && !r.items.some(it => it.id === x.id)) { r.items.push(rtDefault(BY[x.id])); rtSave(); toast(T('Added {0}', x.n)); }
  location.hash = r ? MYX_FROM : '#/myex'; MYX_FROM = '';
};
window.myexDelete = id => {
  const x = MYX.find(o => o.id === id); if (!x) return;
  if (!confirm(tr('Delete this exercise? Routines that use it keep working with it until you change them.'))) return;
  if (x.cid && typeof guildUnshare === 'function') guildUnshare(id, true);
  MYX.splice(MYX.indexOf(x), 1); myxSave(); toast(tr('Exercise deleted')); location.hash = '#/myex';
};

routes.myex = myexView;
// a way in from the library
const _myxLib = library;
library = function () {
  _myxLib();
  if (!libF.g && !libF.q) view.querySelector('.mgrid')?.insertAdjacentHTML('beforebegin', `<section class="card myxcta"><div class="row"><span class="myxic">${ic('plus', 26)}</span>
    <div class="grow"><b>Create your own exercise</b><div class="mut">Mark the muscles it works on the body and use it in your routines.</div></div></div>
    <button class="btn" onclick="myexNew()">${ic('plus', 18)} Create exercise</button>
    <div class="row myxbtns"><button class="btn ghost sm" onclick="location.hash='#/myex'">My exercises${MYX.length ? ` (${MYX.length})` : ''}</button><button class="btn ghost sm" onclick="location.hash='#/guild'">${gi('scroll')} The Guild</button></div></section>`);
};
routes.library = library;

if (typeof i18nAdd === 'function') {
  i18nAdd({
    'My exercises': 'Mis ejercicios', 'Create an exercise': 'Crear un ejercicio', 'New exercise': 'Nuevo ejercicio', 'Edit exercise': 'Editar ejercicio', Name: 'Nombre',
    'Description or steps': 'Descripción o pasos', 'One step per line': 'Un paso por línea', Equipment: 'Material', Difficulty: 'Dificultad', Muscles: 'Músculos',
    Main: 'Principal', Helper: 'Secundario', 'Not used': 'Sin usar', 'Tap a muscle: once for main, twice for helper, three times to clear.': 'Toca un músculo: una vez para principal, dos para secundario, tres para quitarlo.',
    'Give it a name (at least 3 letters).': 'Ponle un nombre (al menos 3 letras).', 'Mark at least one main muscle on the map.': 'Marca al menos un músculo principal en el mapa.',
    'Please use respectful words.': 'Usa palabras respetuosas, por favor.', 'Exercise saved': 'Ejercicio guardado', 'Exercise deleted': 'Ejercicio borrado', Shared: 'Compartido',
    'Share with the community': 'Compartir con la comunidad', 'Stop sharing': 'Dejar de compartir', 'No exercises yet.': 'Todavía no hay ejercicios.', 'Open the Guild': 'Abrir el Gremio',
    'Exercises you create: they work in routines like any other, and you can share them in the Guild.': 'Ejercicios que creas tú: funcionan en las rutinas como cualquier otro y puedes compartirlos en el Gremio.',
    'Delete this exercise? Routines that use it keep working with it until you change them.': '¿Borrar este ejercicio? Las rutinas que lo usan siguen funcionando hasta que las cambies.',
    'Loading the muscle map…': 'Cargando el mapa muscular…', 'Front view': 'Delante', 'Back view': 'Detrás', 'Muscles it works': 'Músculos que trabaja',
    'Equipment and difficulty': 'Material y dificultad', 'How to do it': 'Cómo se hace', '(optional)': '(opcional)', 'For example: Towel row': 'Por ejemplo: Remo con toalla',
    'Tap a muscle on the body: once = main, twice = helper, three times = clear. Turn the body with Front / Back.': 'Toca un músculo del cuerpo: una vez = principal, dos = secundario, tres = quitar. Gira el cuerpo con Delante / Detrás.',
    'Nothing marked yet: tap a muscle on the body.': 'Aún no hay nada marcado: toca un músculo del cuerpo.', 'Create exercise': 'Crear ejercicio',
    'Create your own exercise': 'Crea tu propio ejercicio', 'Mark the muscles it works on the body and use it in your routines.': 'Marca en el cuerpo los músculos que trabaja y úsalo en tus rutinas.',
    "Can't find it? Create your own exercise": '¿No lo encuentras? Crea tu propio ejercicio', 'Added {0}': 'Añadido: {0}', 'The Guild': 'El Gremio', 'body only': 'peso corporal', beginner: 'principiante', intermediate: 'intermedio', expert: 'experto',
  });
}
