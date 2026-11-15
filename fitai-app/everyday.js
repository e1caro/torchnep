'use strict';
// Everyday training, faster and more rewarding (tools/PROMPT-everyday-features.md): smarter set logging (last time,
// a suggestion for today, steppers, sets that follow the one you ticked), a rest timer that doesn't block the screen,
// exercise notes, a history you can open, repeat and delete, a finish screen with a real summary and a "how did it
// feel?", quick starts on Today, adding exercises mid-workout, and a records page.

const NOTES = load('exnotes', {});
const repTop = r => Math.max(0, ...(String(r).match(/\d+/g) || [0]).map(Number));
const repLow = r => +(String(r).match(/\d+/) || [0])[0];
const wStep = e => (/dumbbell|kettlebell/.test(e?.e || '') ? 2 : 2.5);
const r05 = n => Math.round(n * 2) / 2;
const fmtKg = n => (Math.round(n * 10) / 10).toLocaleString(LANG === 'es' ? 'es-ES' : 'en-GB');
function lastSets(id, before = Infinity) {
  const h = S.history.filter(w => w.t < before && w.ex.some(x => x.id === id)).sort((a, b) => b.t - a.t)[0];
  return h ? h.ex.filter(x => x.id === id).flatMap(x => x.sets) : null;
}
// what to try today: every set at the top of the rep target last time → a little more weight; otherwise one more rep
function suggest(x, e) {
  const prev = lastSets(x.id); if (!prev?.length) return null;
  const w = bwOnly(x) ? 0 : Math.max(...prev.map(s => +s.w || 0)), top = repTop(x.reps) || 10, low = repLow(x.reps) || top;
  const atW = prev.filter(s => (+s.w || 0) >= w), best = Math.max(...atW.map(s => +s.r || 0));
  if (!w) return { w: 0, r: best + 1 };
  if (atW.every(s => (+s.r || 0) >= top)) return { w: r05(w + wStep(e)), r: low, up: true };
  return { w, r: Math.min(top, best + 1) };
}

// ---------- the workout screen ----------
const evTimed = x => timedSecs(x.reps) !== null || isNaN(parseInt(x.reps));
const _evWo = workoutView;
workoutView = function () {
  _evWo();
  if (!session) return;
  const x = session.ex[session.cur], e = BY[x.id]; if (!x || !e) return;
  const tbl = view.querySelector('table.sets');
  if (!evTimed(x)) {
    const prev = lastSets(x.id), sg = suggest(x, e), cur = x.sets.findIndex(s => !s.done);
    const tgt = [...view.querySelectorAll('.mut')].find(d => /Target|Objetivo/.test(d.textContent) && d.textContent.length < 120);
    if (tgt) tgt.textContent = T('Target {0} × {1}', x.sets.length, x.reps);
    const lines = [];
    if (prev) lines.push(`<div class="evlast">${tr('Last time:')} <b>${prev.map(s => (+s.w ? `${fmtKg(+s.w)}×${s.r}` : `${s.r}`)).join(' · ')}</b>${+prev[0]?.w ? ' kg' : ''}</div>`);
    const filled = sg && x.sets.every(s => s.done || (+s.w === sg.w && (!sg.r || +s.r === sg.r)));
    if (sg && cur >= 0 && !filled) lines.push(`<button class="evsug" onclick="evUseSug()">💡 ${tr('Today')}: <b>${sg.w ? `${fmtKg(sg.w)} kg × ${sg.r}` : T('{0} reps', sg.r)}</b>${sg.up ? ` <i>${tr('more weight')}</i>` : ''}</button>`);
    tgt?.insertAdjacentHTML('afterend', lines.join(''));
    if (cur >= 0) {
      const s = x.sets[cur], wst = wStep(e);
      tbl?.insertAdjacentHTML('beforebegin', `<div class="evstep"><span class="mut">${T('Set {0}', cur + 1)}</span>
        ${!bwOnly(x) ? `<div class="stp"><button aria-label="−${wst} kg" onclick="evStep(${cur},'w',-${wst})">−</button><b id="evw">${s.w === '' ? '–' : fmtKg(+s.w)}</b><small>${isBody(e) ? '+kg' : 'kg'}</small><button aria-label="+${wst} kg" onclick="evStep(${cur},'w',${wst})">+</button></div>` : ''}
        <div class="stp"><button aria-label="−1" onclick="evStep(${cur},'r',-1)">−</button><b id="evr">${s.r === '' ? (repLow(x.reps) || '–') : s.r}</b><small>${tr('reps')}</small><button aria-label="+1" onclick="evStep(${cur},'r',1)">+</button></div></div>`);
    }
  }
  const note = NOTES[x.id];
  tbl?.insertAdjacentHTML('afterend', `<button class="evnote ${note ? 'has' : ''}" onclick="evNote('${x.id}')">📝 ${note ? esc(note) : tr('Add a note (seat, grip, cues…)')}</button>`);
  view.querySelector('button[onclick="quitWorkout()"]')?.insertAdjacentHTML('beforebegin', `<button class="btn ghost sm evadd" onclick="evPick('add')">${ic('plus', 16)} ${tr('Add an exercise')}</button>`);
};
routes.workout = workoutView;
window.evUseSug = () => {
  const x = session.ex[session.cur], sg = suggest(x, BY[x.id]); if (!sg) return;
  x.sets.forEach(s => { if (!s.done) { if (sg.w) s.w = String(sg.w); s.r = String(sg.r); } });
  saveSess(); sfx('tick'); workoutView();
};
window.evStep = (i, k, d) => {
  const x = session.ex[session.cur], s = x.sets[i]; if (!s) return;
  const base = s[k] === '' ? (k === 'r' ? repLow(x.reps) : 0) : +s[k];
  s[k] = String(Math.max(0, k === 'w' ? r05(base + d) : base + d));
  saveSess();
  const row = view.querySelectorAll('table.sets tr')[i + 1], inp = row?.querySelector(`input[data-k="${k}"]`);
  if (inp) inp.value = s[k];
  const out = $(k === 'w' ? '#evw' : '#evr'); if (out) out.textContent = k === 'w' ? fmtKg(+s.w) : s.r;
  if (navigator.vibrate) navigator.vibrate(8);
};
// ticking a set: the next open set takes its weight (and its reps, if still empty)
const _evDone = window.doneSet;
window.doneSet = i => {
  const x = session.ex[session.cur], was = x.sets[i]?.done;
  _evDone(i);
  const s = x.sets[i], n = x.sets.find((t, j) => j > i && !t.done);
  if (!was && s?.done && n && !evTimed(x)) { if (s.w !== '') n.w = s.w; if (n.r === '') n.r = s.r; saveSess(); if (location.hash === '#/workout') { const keep = $('#rest')?.hidden; workoutView(); if (keep === false) $('#rest').hidden = false; } }
};
window.evNote = id => {
  modal(`<h2>${tr('Note')}</h2><div class="mut">${esc(BY[id]?.n || '')}</div><textarea id="evnt" rows="4" maxlength="300" placeholder="${esc(tr('e.g. seat on 4, grip just outside the shoulders'))}">${esc(NOTES[id] || '')}</textarea>
    <button class="btn" id="evns">${tr('Save')}</button><button class="btn ghost" data-close>${tr('Cancel')}</button>`);
  $('#evns').onclick = () => { const v = $('#evnt').value.trim(); if (v) NOTES[id] = v; else delete NOTES[id]; save('exnotes', NOTES); $('#modal').hidden = true; toast(tr('Note saved')); route(); };
};

// ---------- extra weight on bodyweight exercises: off until asked for, with how to add it ----------
window.xwInfo = id => {
  if (XW[id]) { delete XW[id]; save('xw', XW); toast(tr('Extra weight removed')); workoutView(); return; }
  modal(`<h2>${tr('Extra weight')}</h2><div class="mut">${esc(tr(BY[id]?.n || ''))}</div>
    <p>${tr('When the reps get easy, add a little weight instead of doing endless reps:')}</p>
    <ul class="xwl"><li>🦺 <b>${tr('Weighted vest')}</b> — ${tr('the most comfortable: push-ups, pull-ups, squats, lunges, dips.')}</li>
    <li>🎒 <b>${tr('Backpack')}</b> — ${tr('with books, water bottles or plates; cheap and works for push-ups and squats.')}</li>
    <li>⛓️ <b>${tr('Dip belt')}</b> — ${tr('a plate or kettlebell hanging from the belt for pull-ups and dips.')}</li>
    <li>🏋️ <b>${tr('Dumbbell or kettlebell')}</b> — ${tr('held at the chest for squats, between the feet for pull-ups, on the hips for glute bridges.')}</li>
    <li>🧍 <b>${tr('A plate on your back')}</b> — ${tr('for push-ups, with someone to put it on and take it off.')}</li></ul>
    <p class="mut">${tr('Log only the extra weight, not your body weight. Start with 5 kg or less.')}</p>
    <button class="btn" id="xwy">${tr('Use extra weight')}</button><button class="btn ghost" data-close>${tr('Cancel')}</button>`);
  $('#xwy').onclick = () => { XW[id] = 1; save('xw', XW); $('#modal').hidden = true; workoutView(); };
};

// ---------- the rest timer: a bar, not a wall ----------
let EVR = 0;
rest = function (sec) { if (!session) return; session.restEnd = Date.now() + sec * 1000; saveSess(); evRest(); };
function evRest() {
  clearInterval(EVR);
  const tick = () => {
    const end = session?.restEnd, left = end ? Math.ceil((end - Date.now()) / 1000) : 0;
    let bar = $('#evrest');
    if (!end || left <= 0) {
      bar?.remove(); clearInterval(EVR);
      if (end && session) { session.restEnd = null; saveSess(); if (Date.now() - end < 4000) { sfx('claim'); if (navigator.vibrate) navigator.vibrate([250, 120, 250]); toast(tr('Rest over: next set!')); } }
      return;
    }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'evrest'; document.body.append(bar);
      bar.innerHTML = `<span class="evrl">${tr('Rest')}</span><b class="evrt"></b><button onclick="evRestAdd(-15)">−15</button><button onclick="evRestAdd(15)">+15</button><button class="sk" onclick="evRestAdd(-999)">${tr('Skip')}</button><i class="evrb"></i>`;
    }
    bar.classList.toggle('up', location.hash !== '#/workout');
    bar.querySelector('.evrt').textContent = fmtSecs(left);
    const tot = session.restTot || left; bar.querySelector('.evrb').style.width = `${Math.min(100, left / tot * 100)}%`;
  };
  if (session) session.restTot = Math.ceil((session.restEnd - Date.now()) / 1000);
  tick(); EVR = setInterval(tick, 250);
}
window.evRestAdd = d => { if (!session?.restEnd) return; session.restEnd = d < -100 ? Date.now() : Math.max(Date.now() + 1000, session.restEnd + d * 1000); if (d > 0) session.restTot = (session.restTot || 0) + d; saveSess(); evRest(); };
if (session?.restEnd > Date.now()) setTimeout(evRest, 300);

// ---------- picking an exercise (empty workout, or adding one mid-workout) ----------
let EVQ = '';
window.evPick = mode => {
  modal(`<h2>${tr(mode === 'add' ? 'Add an exercise' : 'Empty workout')}</h2><input class="search" id="evq" placeholder="${esc(tr('Search an exercise'))}" value="${esc(EVQ)}"><div class="evlist" id="evl"></div><button class="btn ghost" data-close>${tr('Cancel')}</button>`);
  const draw = () => {
    const q = fold(EVQ), have = equipSet(S.profile);
    const list = EX.filter(e => (!q || exKey(e).includes(q)) && allowed(e, S.profile, have)).sort((a, b) => (lastSets(b.id) ? 1 : 0) - (lastSets(a.id) ? 1 : 0)).slice(0, 40);
    $('#evl').innerHTML = list.map(e => `<button class="card row li" data-id="${e.id}">${thumb(e)}<div class="grow"><div>${esc(e.n)}</div><div class="mut">${tr(e.m[0])} · ${tr(e.e)}</div></div>${ic('plus', 18)}</button>`).join('') || `<div class="mut">${tr('No exercises found.')}</div>`;
    $('#evl').querySelectorAll('[data-id]').forEach(b => { b.onclick = () => { $('#modal').hidden = true; evAdd(b.dataset.id, mode); }; });
  };
  $('#evq').oninput = ev => { EVQ = ev.target.value; draw(); };
  draw();
};
function evAdd(id, mode) {
  const e = BY[id], it = { id, sets: 3, reps: e.c === 'stretching' ? '30s' : '8-12', rest: /barbell/.test(e.e) ? 120 : 75 };
  if (mode !== 'add' || !session) { startSession(tr('Free workout'), [it]); return; }
  const last = lastSets(id)?.find(s => +s.w);
  session.ex.push({ id, reps: it.reps, rest: it.rest, plan: 3, secs: exSecs(it), last, sets: Array.from({ length: 3 }, () => ({ w: last ? String(last.w) : '', r: '', done: false })) });
  session.cur = session.ex.length - 1; saveSess(); sfx('tick'); workoutView(); scrollTo(0, 0);
}
function evRepeat(h) {
  const items = h.ex.map(x => ({ id: x.id, sets: x.plan || x.sets.length, reps: x.reps || String(Math.max(...x.sets.map(s => s.r)) || 10), rest: /barbell/.test(BY[x.id]?.e || '') ? 120 : 75 })).filter(it => BY[it.id]);
  if (items.length) startSession(h.name, items);
}
window.evRepeatLast = () => { const h = S.history.slice().sort((a, b) => b.t - a.t)[0]; if (h) evRepeat(h); };

// ---------- Today: quick starts in the Train panel ----------
const _evHome = routes.home;
routes.home = function () {
  _evHome();
  const btn = view.querySelector('.card.next button[onclick^="startWorkout"]');
  if (btn && !session) btn.insertAdjacentHTML('afterend', `<div class="row evquick">${S.history.length ? `<button class="btn sm ghost" onclick="evRepeatLast()">${ic('swap', 16)} ${tr('Repeat last')}</button>` : ''}<button class="btn sm ghost" onclick="evPick('new')">${ic('plus', 16)} ${tr('Empty workout')}</button></div>`);
};

// ---------- the finish screen ----------
const evVol = h => h.ex.reduce((a, x) => a + x.sets.reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0);
function evPRs(h) {
  const out = [];
  h.ex.forEach(x => {
    const w = Math.max(0, ...x.sets.map(s => +s.w || 0)); if (!w) return;
    const before = Math.max(0, ...S.history.filter(o => o.t < h.t).flatMap(o => o.ex.filter(q => q.id === x.id).flatMap(q => q.sets.map(s => +s.w || 0))));
    if (before > 0 && w > before) out.push({ id: x.id, w, d: w - before });
  });
  return out;
}
const _evVic = victory;
victory = function () {
  _evVic();
  const h = S.history.slice().sort((a, b) => b.t - a.t)[0]; if (!h || !view.querySelector('.vic')) return;
  const prev = S.history.filter(o => o.t < h.t && o.name === h.name).sort((a, b) => b.t - a.t)[0];
  const vol = evVol(h), sets = h.ex.reduce((a, x) => a + x.sets.length, 0), d = prev && evVol(prev) ? Math.round((vol - evVol(prev)) / evVol(prev) * 100) : null;
  const prs = evPRs(h), mg = {};
  h.ex.forEach(x => { const m = BY[x.id]?.m[0], g = Object.keys(MG).find(k => MG[k].includes(m)); if (g) mg[g] = (mg[g] || 0) + x.sets.length; });
  const feel = [['easy', '😌', 'Easy'], ['good', '💪', 'Good'], ['hard', '🥵', 'Hard']];
  view.querySelector('.vic h1')?.insertAdjacentHTML('afterend', `<section class="card evsum">
    <div class="evnums"><div><b>${h.dur}</b><span>min</span></div><div><b>${sets}</b><span>${tr('sets')}</span></div><div><b>${fmtN(vol)}</b><span>kg</span></div></div>
    ${d !== null ? `<div class="evcmp ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% ${tr('kilos vs last time')}</div>` : ''}
    ${prs.length ? `<div class="evprs">${prs.map(p => `<div>🏆 <span>${esc(BY[p.id]?.n || '')}</span><b>${fmtKg(p.w)} kg</b><i>+${fmtKg(p.d)}</i></div>`).join('')}</div>` : ''}
    ${Object.keys(mg).length ? `<div class="chips static evmg">${Object.entries(mg).sort((a, b) => b[1] - a[1]).map(([g, n]) => `<span class="chip">${musName(g)} · ${n}</span>`).join('')}</div>` : ''}
    <div class="lbl">${tr('How did it feel?')}</div><div class="row evfeel">${feel.map(([k, emo, t]) => `<button class="${h.feel === k ? 'on' : ''}" onclick="evFeel('${k}')"><i>${emo}</i>${tr(t)}</button>`).join('')}</div></section>`);
};
routes.victory = victory;
window.evFeel = k => {
  const h = S.history.slice().sort((a, b) => b.t - a.t)[0]; if (!h) return;
  h.feel = k; save('history', S.history); sfx('tick');
  document.querySelectorAll('.evfeel button').forEach(b => b.classList.toggle('on', b.getAttribute('onclick').includes(`'${k}'`)));
};

// ---------- history and records on Progress ----------
const FEEL = { easy: '😌', good: '💪', hard: '🥵' };
function weekLabel(ws) {
  if (ws === weekStart()) return tr('This week');
  if (ws === weekStart() - WEEK) return tr('Last week');
  return `${new Date(ws).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })} – ${new Date(ws + 6 * 864e5).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })}`;
}
const wsOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
function historyHTML() {
  const hs = S.history.slice().sort((a, b) => b.t - a.t).slice(0, 80);
  if (!hs.length) return `<div class="mut">${tr('No workouts yet.')}</div>`;
  const groups = []; hs.forEach(h => { const ws = wsOf(h.t), g = groups.at(-1); if (g && g.ws === ws) g.hs.push(h); else groups.push({ ws, hs: [h] }); });
  return groups.map(g => `<div class="lbl evwk">${weekLabel(g.ws)} · ${g.hs.length}</div>${g.hs.map(h => `<a class="card row li evh" href="#/log/${h.t}">
    <div class="evday"><b>${new Date(h.t).getDate()}</b><span>${new Date(h.t).toLocaleDateString(LANG, { weekday: 'short' })}</span></div>
    <div class="grow"><b>${esc(tr(h.name.split(' · ').pop()))}</b><div class="mut">${h.dur} min · ${h.ex.length} ${tr('exercises')} · ${fmtN(evVol(h))} kg${evPRs(h).length ? ' · 🏆' : ''}</div></div>${h.feel ? `<span class="evfe">${FEEL[h.feel]}</span>` : ''}</a>`).join('')}`).join('');
}
function records() {
  const r = {};
  S.history.slice().sort((a, b) => a.t - b.t).forEach(h => h.ex.forEach(x => x.sets.forEach(s => {
    const w = +s.w || 0, n = +s.r || 0; if (!w) return;
    const o = r[x.id] || (r[x.id] = { id: x.id, w: 0, r: 0, t: 0, rm: 0, rmt: 0 });
    if (w > o.w || (w === o.w && n > o.r)) Object.assign(o, { w, r: n, t: h.t });
    const m = e1rm(w, n); if (m > o.rm) Object.assign(o, { rm: m, rmt: h.t });
  })));
  return Object.values(r).filter(o => BY[o.id]).sort((a, b) => Math.max(b.t, b.rmt) - Math.max(a.t, a.rmt));
}
const _evProg = routes.progress;
routes.progress = function () {
  _evProg();
  const hs = [...view.querySelectorAll('h2.sec')], prH = hs.find(h => /Personal records|Récords/.test(h.textContent)), hiH = hs.find(h => /^(History|Historial)$/.test(h.textContent.trim()));
  // a section's body: the rest of its folded <details>, or the elements after its heading up to the next one
  const fill = (h, html, open) => {
    const d = h?.closest('details');
    if (d) { [...d.children].forEach(c => { if (c.tagName !== 'SUMMARY') c.remove(); }); d.insertAdjacentHTML('beforeend', html); if (open) d.open = true; return; }
    let n = h?.nextElementSibling; while (n && !n.matches('h2.sec, details')) { const nx = n.nextElementSibling; n.remove(); n = nx; }
    h?.insertAdjacentHTML('afterend', html);
  };
  if (prH) {
    const rs = records().slice(0, 5);
    fill(prH, rs.length ? rs.map(o => `<a class="card row between evrec" href="#/exercise/${o.id}"><div class="grow"><div>${esc(BY[o.id].n)}</div><div class="mut">${new Date(o.t).toLocaleDateString(LANG, { day: 'numeric', month: 'short' })}</div></div><b>${fmtKg(o.w)} kg × ${o.r}</b></a>`).join('')
      + `<div><button class="btn ghost sm evall" onclick="location.hash='#/records'">${tr('All records')}</button></div>` : `<div class="mut">${tr('No records yet.')}</div>`);
  }
  if (hiH) fill(hiH, historyHTML(), true);
  // the page folds its sections a moment later: History stays as the player left it (open the first time)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const d = view.querySelector('a.evh')?.closest('details'); if (!d || d.evDone) return;
    d.evDone = true; d.open = load('histOpen', true); d.addEventListener('toggle', () => save('histOpen', d.open));
  }));
};
function recordsView() {
  if (needProfile()) return;
  const rs = records();
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} ${tr('Back')}</button><h1>${tr('Personal records')}</h1>
    ${rs.length ? rs.map(o => `<a class="card row li evrec" href="#/exercise/${o.id}"><div class="grow"><b>${esc(BY[o.id].n)}</b><div class="mut">${tr('Heaviest')}: ${fmtKg(o.w)} kg × ${o.r} · ${new Date(o.t).toLocaleDateString(LANG, { day: 'numeric', month: 'short', year: '2-digit' })}</div></div>
      <div class="evrm"><b>${fmtKg(Math.round(o.rm * 2) / 2)}</b><span>${tr('1RM')}</span></div></a>`).join('') : `<div class="mut">${tr('Log weights in your workouts and your records will show here.')}</div>`}`;
}
function logView(arg) {
  if (needProfile()) return;
  const h = S.history.find(w => String(w.t) === String(arg)); if (!h) { location.hash = '#/progress'; return; }
  const before = {}; S.history.filter(o => o.t < h.t).forEach(o => o.ex.forEach(x => x.sets.forEach(s => { before[x.id] = Math.max(before[x.id] || 0, +s.w || 0); })));
  view.innerHTML = `<button class="btn sm ghost back" onclick="history.back()">${ic('back', 18)} ${tr('Back')}</button>
    <div class="mut">${new Date(h.t).toLocaleDateString(LANG, { weekday: 'long', day: 'numeric', month: 'long' })} · ${new Date(h.t).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' })}</div>
    <h1>${esc(tr(h.name.split(' · ').pop()))}</h1>
    <div class="evnums card"><div><b>${h.dur}</b><span>min</span></div><div><b>${h.ex.reduce((a, x) => a + x.sets.length, 0)}</b><span>${tr('sets')}</span></div><div><b>${fmtN(evVol(h))}</b><span>kg</span></div>${h.feel ? `<div><b>${FEEL[h.feel]}</b><span>${tr({ easy: 'Easy', good: 'Good', hard: 'Hard' }[h.feel])}</span></div>` : ''}</div>
    ${h.ex.map(x => { let top = before[x.id] || 0; return `<section class="card"><a class="row between" href="#/exercise/${x.id}"><b>${esc(BY[x.id]?.n || x.id)}</b>${ic('chart', 16)}</a>
      <div class="evsets">${x.sets.map((s, i) => { const pr = +s.w > top && top > 0; if (+s.w > top) top = +s.w; return `<div><span class="mut">${i + 1}</span><b>${+s.w ? `${fmtKg(+s.w)} kg × ` : ''}${s.r}</b>${pr ? ' 🏆' : ''}</div>`; }).join('')}</div></section>`; }).join('')}
    <button class="btn" onclick="evRepeatT(${h.t})">${ic('play', 16)} ${tr('Repeat this workout')}</button>
    <button class="btn ghost danger" onclick="evDel(${h.t})">${tr('Delete')}</button>`;
}
window.evRepeatT = t => { const h = S.history.find(w => w.t === t); if (h) evRepeat(h); };
window.evDel = t => {
  modal(`<h2>${tr('Delete this workout?')}</h2><div class="mut">${tr('It disappears from your history and stats. XP and coins already won stay.')}</div><button class="btn danger" id="evdy">${tr('Delete')}</button><button class="btn ghost" data-close>${tr('Cancel')}</button>`);
  $('#evdy').onclick = () => { const i = S.history.findIndex(w => w.t === t); if (i >= 0) { S.history.splice(i, 1); save('history', S.history); } $('#modal').hidden = true; toast(tr('Workout deleted')); location.hash = '#/progress'; };
};

// the exercise page: your note
const _evEx = exerciseView;
exerciseView = function (id) {
  _evEx(id);
  if (!BY[id]) return;
  view.querySelector('.chips.static')?.insertAdjacentHTML('afterend', `<button class="evnote ${NOTES[id] ? 'has' : ''}" onclick="evNote('${id}')">📝 ${NOTES[id] ? esc(NOTES[id]) : tr('Add a note (seat, grip, cues…)')}</button>`);
};
Object.assign(routes, { exercise: exerciseView, records: recordsView, log: logView });

if (typeof i18nAdd === 'function') i18nAdd({
  '+ Extra weight': '+ Peso extra', 'Remove extra weight': 'Quitar peso extra', 'Extra weight': 'Peso extra', 'Extra weight removed': 'Peso extra quitado', 'Use extra weight': 'Usar peso extra',
  'When the reps get easy, add a little weight instead of doing endless reps:': 'Cuando las repeticiones se vuelvan fáciles, añade un poco de peso en vez de hacer repeticiones sin fin:',
  'Weighted vest': 'Chaleco lastrado', 'the most comfortable: push-ups, pull-ups, squats, lunges, dips.': 'lo más cómodo: flexiones, dominadas, sentadillas, zancadas, fondos.',
  Backpack: 'Mochila', 'with books, water bottles or plates; cheap and works for push-ups and squats.': 'con libros, botellas de agua o discos; barato y sirve para flexiones y sentadillas.',
  'Dip belt': 'Cinturón de lastre', 'a plate or kettlebell hanging from the belt for pull-ups and dips.': 'un disco o una kettlebell colgando del cinturón para dominadas y fondos.',
  'Dumbbell or kettlebell': 'Mancuerna o kettlebell', 'held at the chest for squats, between the feet for pull-ups, on the hips for glute bridges.': 'al pecho para sentadillas, entre los pies para dominadas, sobre la cadera para puentes de glúteo.',
  'A plate on your back': 'Un disco en la espalda', 'for push-ups, with someone to put it on and take it off.': 'para flexiones, con alguien que te lo ponga y te lo quite.',
  'Log only the extra weight, not your body weight. Start with 5 kg or less.': 'Apunta solo el peso extra, no tu peso corporal. Empieza con 5 kg o menos.',
  'Target {0} × {1}': 'Objetivo {0} × {1}', 'Last time:': 'La última vez:', Today: 'Hoy', 'more weight': 'más peso', '{0} reps': '{0} repeticiones', 'Set {0}': 'Serie {0}', reps: 'reps',
  'Add a note (seat, grip, cues…)': 'Añadir una nota (asiento, agarre, trucos…)', Note: 'Nota', 'e.g. seat on 4, grip just outside the shoulders': 'p. ej. asiento en el 4, agarre algo más ancho que los hombros',
  Save: 'Guardar', Cancel: 'Cancelar', 'Note saved': 'Nota guardada', Rest: 'Descanso', Skip: 'Saltar', 'Rest over: next set!': 'Fin del descanso: ¡siguiente serie!',
  'Add an exercise': 'Añadir un ejercicio', 'Empty workout': 'Entrenamiento libre', 'Search an exercise': 'Busca un ejercicio', 'No exercises found.': 'No se han encontrado ejercicios.',
  'Free workout': 'Entrenamiento libre', 'Repeat last': 'Repetir el último', sets: 'series', 'kilos vs last time': 'de kilos frente a la última vez', 'How did it feel?': '¿Qué tal ha ido?',
  Easy: 'Fácil', Good: 'Bien', Hard: 'Duro', 'This week': 'Esta semana', 'Last week': 'Semana pasada', 'No workouts yet.': 'Aún no hay entrenamientos.', exercises: 'ejercicios',
  'All records': 'Todos los récords', 'No records yet.': 'Aún no hay récords.', 'Personal records': 'Récords personales', Heaviest: 'Más pesado', '1RM': '1RM',
  'Log weights in your workouts and your records will show here.': 'Apunta los pesos en tus entrenamientos y aquí verás tus récords.', Back: 'Atrás',
  'Repeat this workout': 'Repetir este entrenamiento', Delete: 'Borrar', 'Delete this workout?': '¿Borrar este entrenamiento?',
  'It disappears from your history and stats. XP and coins already won stay.': 'Desaparece de tu historial y estadísticas. La XP y las monedas ganadas se quedan.', 'Workout deleted': 'Entrenamiento borrado',
});
