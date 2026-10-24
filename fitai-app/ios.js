'use strict';
// iPhone and iPad support: an install hint for Safari (iOS has no install prompt) and sound unlock.

const IS_STANDALONE = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const iosHintOff = () => { try { return localStorage.getItem('fc.iosHint') === '1'; } catch { return true; } };
window.hideIosHint = () => { try { localStorage.setItem('fc.iosHint', '1'); } catch { /* storage blocked */ } document.querySelector('.ioshint')?.remove(); };
const iosHint = () => `<section class="card ioshint"><div class="row between"><h3>Install on iPhone</h3><button class="btn sm ghost" onclick="hideIosHint()" aria-label="Close">✕</button></div>
  <ol class="mut"><li>Open this page in Safari.</li><li>Tap the Share button (the square with an arrow).</li><li>Choose "Add to Home Screen" and tap Add.</li></ol>
  <div class="mut">Then open FitQuest from its icon. Your progress is saved on this phone; use "Export my data" in Hero to keep a copy.</div></section>`;

if (typeof isIOS !== 'undefined' && isIOS) {
  const _iosHome = home;
  home = function () { _iosHome(); if (!IS_STANDALONE && !iosHintOff()) view.querySelector('.hud')?.insertAdjacentHTML('beforebegin', iosHint()); };
  routes.home = home;
  // iOS starts sound suspended until the first tap.
  addEventListener('touchend', () => { try { if (AC && AC.state === 'suspended') AC.resume(); } catch { /* no audio */ } }, { passive: true });
}

if (typeof i18nAdd === 'function') i18nAdd({
  'Install on iPhone': 'Instalar en iPhone', 'Open this page in Safari.': 'Abre esta página en Safari.', 'Tap the Share button (the square with an arrow).': 'Toca el botón Compartir (el cuadrado con una flecha).',
  'Choose "Add to Home Screen" and tap Add.': 'Elige "Añadir a pantalla de inicio" y toca Añadir.',
  'Then open FitQuest from its icon. Your progress is saved on this phone; use "Export my data" in Hero to keep a copy.': 'Después abre FitQuest desde su icono. Tu progreso se guarda en este teléfono; usa "Exportar mis datos" en Héroe para guardar una copia.',
  'On iPhone this opens the Synergym page in the App Store. Tap Open there to go to the app.': 'En iPhone esto abre la página de Synergym en el App Store. Toca Abrir allí para ir a la app.',
});
