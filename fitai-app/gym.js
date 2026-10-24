'use strict';
// Gym pass: jump to the Synergym app (where the live access QR is) and optionally keep a saved copy of a fixed QR.
// FitQuest never sees your Synergym login: it only launches the app and shows an image you chose.

const GYM = Object.assign({ pkg: 'digifit.android.virtuagym.pro.synergym', qr: null }, load('gym', {}));
const gymSave = () => save('gym', GYM);
const isAndroid = /android/i.test(navigator.userAgent);
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const SYNERGYM_IOS = 'https://apps.apple.com/es/app/synergym/id6746641387'; // official Synergym app (SYNERGYM HOLDING SL)
const validPkg = p => /^[a-z][\w]*(\.[\w]+)+$/i.test(p);
let wake = null;

const gymLink = () => `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${GYM.pkg};S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=' + GYM.pkg)};end`;

window.openGym = () => {
  if (isIOS) { location.href = SYNERGYM_IOS; return; } // iPhone: App Store page, which shows "Open" when the app is installed
  if (!isAndroid) { toast('Open the Synergym app from your home screen.'); return; }
  location.href = gymLink(); // Chrome launches the app, or opens its Play Store page if it is not installed
};

window.showQr = async () => {
  if (!GYM.qr) return;
  const el = document.createElement('div'); el.className = 'qrfs';
  el.innerHTML = `<img src="${GYM.qr}" alt="Gym QR code"><div class="mut">Turn your screen brightness up</div><button class="btn ghost">Close</button>`;
  document.body.appendChild(el);
  try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
  el.querySelector('button').onclick = () => { el.remove(); wake?.release?.(); wake = null; };
};

window.pickQr = file => {
  if (!file) return;
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    GYM.qr = c.toDataURL('image/png');
    try { localStorage.setItem('fc.gym', JSON.stringify(GYM)); toast('QR saved on this phone'); } catch { GYM.qr = null; toast('Could not save the image. Try a smaller screenshot.'); }
    route();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('That file is not an image.'); };
  img.src = url;
};
window.removeQr = () => { GYM.qr = null; gymSave(); route(); };
window.setPkg = v => { v = v.trim(); if (!validPkg(v)) { toast('That does not look like an app package name.'); return; } GYM.pkg = v; gymSave(); toast('Saved'); };

const gymRow = () => `<div class="gymrow"><button class="btn sm" onclick="openGym()">${gi('ticket')} Open Synergym</button>${GYM.qr ? '<button class="btn sm ghost" onclick="showQr()">My saved QR</button>' : ''}</div>`;

function gymCard() {
  return `<section class="card"><h3>Gym access</h3>
  <p class="mut">Open the Synergym app to show your entry QR. FitQuest never sees your Synergym login.</p>
  <button class="btn" onclick="openGym()">${gi('ticket')} Open Synergym</button>
  ${GYM.qr ? `<div class="row"><button class="btn ghost" onclick="showQr()">Show saved QR</button><button class="btn ghost" onclick="removeQr()">Remove</button></div>` : ''}
  <label class="btn ghost" for="qrfile">${GYM.qr ? 'Replace' : 'Save'} a QR screenshot</label><input id="qrfile" type="file" accept="image/*" hidden onchange="pickQr(this.files[0])">
  <p class="mut">A saved picture only works if your gym's QR never changes. If Synergym makes a new code each time, use the button above.</p>
  ${isIOS ? '<p class="mut">On iPhone this opens the Synergym page in the App Store. Tap Open there to go to the app.</p>' : ''}
  ${isIOS ? '' : `<details><summary class="mut">Wrong app opens? App id</summary><div class="row" style="margin-top:8px"><input id="pkg" value="${esc(GYM.pkg)}" autocapitalize="off" spellcheck="false"><button class="btn sm" onclick="setPkg($('#pkg').value)">Save</button></div>
  <p class="mut">Android package of the Synergym app (Play Store link ends in <code>id=…</code>).</p></details>`}</section>`;
}

// Add the gym pass to the Today and Hero screens without touching their code.
const _home = home; home = function () { _home(); view.querySelector('.hud')?.insertAdjacentHTML('afterend', gymRow()); };
const _me = me; me = function () { _me(); view.querySelector('.hud')?.insertAdjacentHTML('afterend', gymCard()); };
routes.home = home; routes.me = me;
