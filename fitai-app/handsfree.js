'use strict';
// Training without looking at the phone: one big button for the next set, the next exercise on its own when one is
// done, today's weights already filled in, a voice coach, the screen kept on, and the end of a rest felt in the pocket.

const HF = Object.assign({ voice: false, awake: true }, load('handsfree', {}));
const hfSave = () => save('handsfree', HF);
const hfNat = n => typeof window.FitQuestNative?.[n] === 'function';
const hfLang = () => (LANG === 'es' ? 'es-ES' : 'en-GB');
function say(text) {
  if (!HF.voice || !text) return;
  if (hfNat('speak')) { try { FitQuestNative.speak(text, hfLang()); } catch { /* old app */ } return; }
  if (!window.speechSynthesis) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = hfLang(); speechSynthesis.speak(u); } catch { /* no voices */ }
}
const hfReps = x => {
  const m = String(x.reps).match(/^(\d+)\s*min/), s = String(x.reps).match(/^(\d+)\s*s/);
  if (m) return T('{0} minutes', m[1]);
  if (s) return T('{0} seconds', s[1]);
  const r = String(x.reps).match(/\d+/g) || [];
  return r.length > 1 ? T('{0} to {1} reps', r[0], r[1]) : T('{0} reps', r[0] || x.reps);
};
const hfOpen = x => x.sets.findIndex(s => !s.done);
const hfSetText = (x, i) => {
  const s = x.sets[i]; if (!s) return '';
  if (evTimed(x)) return T('Set {0}', i + 1);
  const r = s.r || repLow(x.reps);
  return `${T('Set {0}', i + 1)}. ${+s.w ? `${T('{0} kilos', fmtKg(+s.w))}, ` : ''}${T('{0} reps', r)}`;
};
const hfIntro = () => {
  const x = session.ex[session.cur], e = BY[x.id]; if (!e) return '';
  const last = session.cur === session.ex.length - 1 && session.ex.length > 1 ? `${tr('Last exercise')}. ` : '';
  const w = !evTimed(x) && +x.sets[0]?.w ? `, ${T('{0} kilos', fmtKg(+x.sets[0].w))}` : '';
  return `${last}${tr(e.n)}. ${T('{0} sets of {1}', x.sets.length, hfReps(x))}${w}.`;
};

// today's suggestion already in the sets, so the only thing to do is lift and tap
function hfFill(x) {
  if (x.hfFill || evTimed(x)) return;
  x.hfFill = 1;
  const sg = suggest(x, BY[x.id]);
  x.sets.forEach(s => { if (s.done) return; if (sg?.w) s.w = String(sg.w); if (s.r === '') s.r = String(sg?.r || repLow(x.reps) || ''); });
  saveSess();
}

const hfSmall = (x, s) => (+s.w ? `${fmtKg(+s.w)} kg × ${s.r || repLow(x.reps)}` : T('{0} reps', s.r || repLow(x.reps)));
const hfRelabel = () => { const x = session?.ex[session.cur], i = x ? hfOpen(x) : -1, el = $('#hfgo small'); if (el && i >= 0) el.textContent = hfSmall(x, x.sets[i]); };
for (const k of ['evStep', 'setVal']) { const f = window[k]; window[k] = (...a) => { f(...a); hfRelabel(); }; }
const _hfWo = workoutView;
workoutView = function () {
  if (session) { const x = session.ex[session.cur]; if (x) hfFill(x); }
  _hfWo();
  if (!session) return;
  const x = session.ex[session.cur], n = session.ex.length, i = hfOpen(x), ts = timedSecs(x.reps), run = session.timer && session.timer.ex === session.cur;
  view.querySelector('.xpchip')?.insertAdjacentHTML('beforebegin', `<div class="hfopts"><button class="hft ${HF.voice ? 'on' : ''}" aria-label="${esc(tr('Voice coach'))}" onclick="hfToggle('voice')">${HF.voice ? '🔊' : '🔇'}</button><button class="hft ${HF.awake ? 'on' : ''}" aria-label="${esc(tr('Keep the screen on'))}" onclick="hfToggle('awake')">${HF.awake ? '☀️' : '🌙'}</button></div>`);
  let btn = '';
  if (i >= 0 && evTimed(x)) btn = ts && !run ? `<button class="btn hfgo" onclick="startTimer(${i})">${ic('play', 20)} ${T('Start set {0}', i + 1)} · ${fmtSecs(ts)}</button>` : '';
  else if (i >= 0) { const s = x.sets[i]; btn = `<button class="btn hfgo" onclick="hfDone()">${ic('check', 22)} <span>${T('Set {0} done', i + 1)}<small>${hfSmall(x, s)}</small></span></button>`; }
  else if (session.cur < n - 1) btn = `<button class="btn hfgo" onclick="nav(1)">${T('Next: {0}', esc(tr(BY[session.ex[session.cur + 1].id]?.n || '')))} →</button>`;
  else btn = `<button class="btn gold hfgo" onclick="finish()">🏁 ${tr('Finish')}</button>`;
  document.getElementById('hfgo')?.remove();
  if (btn) document.body.insertAdjacentHTML('beforeend', `<div id="hfgo">${btn}</div>`);
  document.body.classList.toggle('hf', !!btn);
  if (session.hfSaid !== session.cur) { session.hfSaid = session.cur; saveSess(); say(hfIntro()); }
  hfAwake();
};
routes.workout = workoutView;
window.hfToggle = k => {
  HF[k] = !HF[k]; hfSave(); sfx('tick');
  if (k === 'voice' && HF.voice) { say(tr('Voice coach on')); hfSync(true); }
  toast(tr(k === 'voice' ? (HF.voice ? 'Voice coach on' : 'Voice coach off') : (HF.awake ? 'The screen stays on while you train' : 'The screen turns off as usual')));
  workoutView();
};
window.hfDone = () => {
  const x = session.ex[session.cur], i = hfOpen(x); if (i < 0) return;
  const s = x.sets[i]; if (s.r === '') s.r = String(repLow(x.reps) || '');
  doneSet(i);
};

// the last set of an exercise: straight on to the next one, resting in between
const _hfDoneSet = window.doneSet;
window.doneSet = i => {
  const x = session.ex[session.cur], was = x.sets[i]?.done;
  _hfDoneSet(i);
  if (!session || was || !x.sets[i]?.done) return;
  if (hfOpen(x) >= 0) return;
  hfExDone(x);
};
function hfExDone(x) {
  if (session.cur < session.ex.length - 1) {
    session.cur++; saveSess();
    if (x.rest) rest(x.rest);
    toast(T('Next: {0}', tr(BY[session.ex[session.cur].id]?.n || '')));
    if (location.hash === '#/workout') { workoutView(); scrollTo(0, 0); }
  } else { say(tr('Last set done. Great job! Tap Finish to save the workout.')); if (location.hash === '#/workout') workoutView(); }
}
const _hfTimerDone = timerDone;
timerDone = function () {
  const tm = session?.timer, x = tm && session.ex[tm.ex], ok = _hfTimerDone();
  if (ok && x && tm.ex === session.cur && hfOpen(x) < 0 && location.hash === '#/workout') setTimeout(() => { if (session && session.ex[session.cur] === x) hfExDone(x); }, 50);
  return ok;
};
const _hfFinish = window.finish;
window.finish = () => { const had = !!session; _hfFinish(); if (had) say(tr('Workout saved. Well done!')); };

// rest: ten seconds to go, then what comes next; with the screen off, the app vibrates and speaks it instead
let HFR = { end: 0, said10: false, synced: -1 };
function hfSync(force) {
  const end = session?.restEnd || 0;
  if (!force && end === HFR.synced) return;
  HFR.synced = end;
  if (!hfNat('restAlarm')) return;
  const x = session?.ex[session.cur], i = x ? hfOpen(x) : -1, next = x && i >= 0 ? hfSetText(x, i) : '';
  try { FitQuestNative.restAlarm(end ? Math.max(0, end - Date.now()) : 0, tr('Rest over'), next || tr('Next set!'), HF.voice ? `${tr('Go!')} ${next}` : '', hfLang()); } catch { /* old app */ }
}
setInterval(() => {
  hfSync();
  const end = session?.restEnd;
  if (end) {
    if (end !== HFR.end) HFR = { ...HFR, end, said10: end - Date.now() < 11000 };
    if (!HFR.said10 && end - Date.now() <= 10500) { HFR.said10 = true; say(tr('Ten seconds')); }
    return;
  }
  if (HFR.end && session) {
    const late = Date.now() - HFR.end > 4000; HFR.end = 0;
    const x = session.ex[session.cur], i = hfOpen(x);
    if (!late && i >= 0) say(`${tr('Go!')} ${hfSetText(x, i)}`);
  }
}, 400);

// the screen stays on during a workout
let HFW = null;
function hfAwake() {
  const on = HF.awake && !!session && location.hash === '#/workout';
  if (hfNat('keepAwake')) { try { FitQuestNative.keepAwake(on); } catch { /* old app */ } return; }
  if (on && !HFW && navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(l => { HFW = l; l.addEventListener('release', () => { HFW = null; }); }).catch(() => {});
  if (!on && HFW) { HFW.release().catch(() => {}); HFW = null; }
}
addEventListener('hashchange', () => { hfAwake(); if (location.hash !== '#/workout') { document.getElementById('hfgo')?.remove(); document.body.classList.remove('hf'); } });
document.addEventListener('visibilitychange', hfAwake);

if (typeof i18nAdd === 'function') i18nAdd({
  '{0} minutes': '{0} minutos', '{0} seconds': '{0} segundos', '{0} to {1} reps': '{0} a {1} repeticiones', '{0} kilos': '{0} kilos', '{0} sets of {1}': '{0} series de {1}',
  'Last exercise': 'Último ejercicio', 'Voice coach': 'Entrenador por voz', 'Keep the screen on': 'Mantener la pantalla encendida', 'Start set {0}': 'Empezar serie {0}',
  'Set {0} done': 'Serie {0} hecha', 'Next: {0}': 'Siguiente: {0}', Finish: 'Terminar', 'Voice coach on': 'Entrenador por voz activado', 'Voice coach off': 'Entrenador por voz desactivado',
  'The screen stays on while you train': 'La pantalla se queda encendida mientras entrenas', 'The screen turns off as usual': 'La pantalla se apaga como siempre',
  'Last set done. Great job! Tap Finish to save the workout.': 'Última serie hecha. ¡Muy bien! Pulsa Terminar para guardar el entrenamiento.',
  'Workout saved. Well done!': 'Entrenamiento guardado. ¡Buen trabajo!', 'Rest over': 'Fin del descanso', 'Next set!': '¡Siguiente serie!', 'Go!': '¡Vamos!', 'Ten seconds': 'Diez segundos',
});
