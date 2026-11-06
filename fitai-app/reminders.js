'use strict';
// Daily reminder in the Android app: a local notification at the time chosen in Settings (default 19:00), set on the
// phone itself (android Reminder.java), with an on/off switch. The first time the app runs with this, it asks once,
// kindly, before Android's own permission prompt. Outside the app (web), Settings offers the e-mail reminder instead
// (cloud.js).
const NATIVE = typeof window.FitQuestNative === 'object' ? window.FitQuestNative : null;
const REM = Object.assign({ on: false, h: 19, m: 0, asked: false }, load('reminder', {}));
const remSave = () => save('reminder', REM);
const remText = () => tr('Time to train! Your quest is waiting.');
function remApply() {
  if (!NATIVE) return;
  try { NATIVE.setReminder(!!REM.on, REM.h, REM.m, 'FitQuest', remText()); } catch { /* older app */ }
}
const remPerm = () => { try { return NATIVE.notificationPermission(); } catch { return 'granted'; } };
// turning it on: explain first, then Android's prompt (Android 13+); if Android said no for good, point to its settings
window.remToggle = on => {
  if (!on) { REM.on = false; remSave(); remApply(); route(); return; }
  const p = remPerm();
  if (p === 'granted') { REM.on = true; remSave(); remApply(); toast(T('Reminder set for {0}', remTime())); route(); return; }
  if (p === 'denied') { toast(tr('Notifications are off for FitQuest. Turn them on in Android settings › Apps › FitQuest.')); route(); return; }
  modal(`<div class="avbig">🔔</div><h2>Daily reminder</h2><div class="mut">FitQuest will send you one notification a day at ${remTime()} to remind you to train. Nothing else, and you can turn it off in Settings.</div>
    <button class="btn" id="remok">Allow notifications</button><button class="btn ghost" data-close>Not now</button>`);
  $('#remok').onclick = () => { $('#modal').hidden = true; try { NATIVE.requestNotificationPermission(); } catch { /* older app */ } };
};
window.onNativePermission = ok => {
  REM.on = !!ok; remSave(); remApply();
  toast(ok ? T('Reminder set for {0}', remTime()) : tr('No reminder: notifications were not allowed.'));
  if (location.hash === '#/settings') route();
};
const remTime = () => `${String(REM.h).padStart(2, '0')}:${String(REM.m).padStart(2, '0')}`;
window.remTest = () => {
  if (remPerm() !== 'granted') { remToggle(true); return; }
  remApply();
  try { NATIVE.testReminder(); toast(tr('Sent: look at your notifications.')); } catch { /* older app */ }
};
window.remSetTime = v => { const [h, m] = String(v).split(':').map(Number); if (Number.isFinite(h)) { REM.h = h; REM.m = m || 0; remSave(); remApply(); toast(T('Reminder set for {0}', remTime())); } };
function remCard() {
  if (!NATIVE) return '';
  return `<h2 class="sec">Reminders</h2><section class="card remcard"><div class="row between"><div><b>Daily reminder</b><div class="mut">A notification on this phone every day</div></div>
    <label class="switch"><input type="checkbox" ${REM.on ? 'checked' : ''} onchange="remToggle(this.checked)"><span></span></label></div>
    ${REM.on ? `<label class="row between remtime"><span>Time</span><input type="time" value="${remTime()}" onchange="remSetTime(this.value)"></label>
    ${typeof NATIVE.testReminder === 'function' ? '<button class="btn ghost" onclick="remTest()">Test the reminder</button>' : ''}` : ''}</section>`;
}
const _remSet = routes.settings;
routes.settings = function () { _remSet(); view.querySelector('#exp')?.parentElement?.previousElementSibling?.insertAdjacentHTML('beforebegin', remCard()); };
// keep the phone's copy in step (time, language of the text) and, once, offer it
if (NATIVE) {
  remApply();
  setTimeout(() => {
    if (REM.asked || REM.on || !S.profile || !$('#modal').hidden || /workout|start|victory/.test(location.hash)) return;
    REM.asked = true; remSave();
    remToggle(true);
  }, 2500);
}
if (typeof i18nAdd === 'function') {
  i18nAdd({
    'Time to train! Your quest is waiting.': '¡Hora de entrenar! Tu misión te espera.', 'Reminder set for {0}': 'Recordatorio a las {0}', Reminders: 'Recordatorios',
    'Notifications are off for FitQuest. Turn them on in Android settings › Apps › FitQuest.': 'Las notificaciones de FitQuest están desactivadas. Actívalas en Ajustes de Android › Aplicaciones › FitQuest.',
    'Daily reminder': 'Recordatorio diario', 'Allow notifications': 'Permitir notificaciones', 'Not now': 'Ahora no', 'No reminder: notifications were not allowed.': 'Sin recordatorio: no se permitieron las notificaciones.',
    'A notification on this phone every day': 'Una notificación en este móvil cada día', Time: 'Hora',
    'Test the reminder': 'Probar el aviso', 'Sent: look at your notifications.': 'Enviado: mira tus notificaciones.',
    'FitQuest will send you one notification a day at {n}:{n} to remind you to train. Nothing else, and you can turn it off in Settings.': 'FitQuest te enviará una notificación al día a las {n}:{n} para recordarte entrenar. Nada más, y puedes desactivarla en Ajustes.',
  });
}
