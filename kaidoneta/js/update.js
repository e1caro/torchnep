/* Kaidoneta keeps itself up to date: the service worker looks for a new version when the app opens, comes back to
 * the screen and every few minutes; when one is installed the page reloads into it by itself — but never while a
 * sheet is open (nobody loses a round they are typing). */
(function (root) {
  'use strict';
  var nav = root.navigator;
  if (!('serviceWorker' in nav) || !/^https?:/.test(root.location.protocol)) return;
  var had = !!nav.serviceWorker.controller, reloading = false;
  nav.serviceWorker.addEventListener('controllerchange', function () {
    if (!had) { had = true; return; } // the very first install: this page is already the newest
    if (reloading) return;
    var go = function () { reloading = true; root.location.reload(); };
    if (!root.document.querySelector('.sheet')) { go(); return; }
    var iv = setInterval(function () { if (!root.document.querySelector('.sheet')) { clearInterval(iv); go(); } }, 1500);
  });
  function check() { nav.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); }, function () {}); }
  root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden) check(); });
  setInterval(check, 5 * 60000);
})(window);
