/* Installable, offline-capable app: service worker, install prompt, update notice. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui, h = ui.h;
  var P = (DA.pwa = { deferred: null, offlineReady: false, installed: false });

  P.standalone = function () {
    if (ui.native()) return true; // inside the Android app
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  };
  P.isIos = function () {
    var ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };
  P.canInstall = function () { return !P.standalone() && !P.installed && (!!P.deferred || P.isIos()); };

  P.install = function () {
    if (!P.deferred) return Promise.resolve(false);
    var ev = P.deferred;
    P.deferred = null;
    ev.prompt();
    return ev.userChoice.then(function (c) { P.installed = c.outcome === 'accepted'; if (ui.refreshChrome) ui.refreshChrome(); return P.installed; });
  };

  function iosHelp() {
    return h('p', { class: 'muted small' }, 'On iPhone or iPad: open this page in Safari, tap the Share button, then "Add to Home Screen".');
  }

  // A card for the home page (dismissible) or the settings page (always shown when installable).
  P.installCard = function (always) {
    if (!P.canInstall()) return null;
    if (!always && ui.state.seen['install-dismissed']) return null;
    var card = h('section', { class: 'card install' },
      h('div', { class: 'grow' },
        h('h3', { text: '📲 Put it on your home screen' }),
        h('p', { class: 'muted', text: 'Opens like an app, works offline, and your daily goal is one tap away.' }),
        P.deferred ? h('div', { class: 'row' },
          h('button', { class: 'btn accent', type: 'button', onclick: function () { P.install().then(function (ok) { if (ok) ui.toast('Installed. Find it on your home screen.'); }); } }, 'Install app'),
          always ? null : h('button', { class: 'btn ghost', type: 'button', onclick: dismiss }, 'Not now')) : [iosHelp(), always ? null : h('button', { class: 'btn ghost small', type: 'button', onclick: dismiss }, 'Got it')]));
    function dismiss() { ui.state.seen['install-dismissed'] = true; ui.save(); if (card.parentNode) card.parentNode.removeChild(card); }
    return card;
  };

  function updateBar() {
    var bar = document.getElementById('updateBar');
    if (!bar || bar.firstChild) return;
    bar.appendChild(h('span', { text: 'A new version is ready.' }));
    bar.appendChild(h('button', { class: 'btn small accent', type: 'button', onclick: function () { location.reload(); } }, 'Reload'));
    bar.appendChild(h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Dismiss', onclick: function () { ui.clear(bar); bar.classList.remove('show'); } }, '✕'));
    bar.classList.add('show');
  }

  P.register = function () {
    if (ui.native()) return; // the app carries all its files, so it needs no service worker
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadController) updateBar(); hadController = true; });
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function () {
      P.offlineReady = true;
      document.dispatchEvent(new Event('pwa-ready'));
    }).catch(function () { /* offline support is optional */ });
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    P.deferred = e;
    document.dispatchEvent(new Event('pwa-installable'));
  });
  window.addEventListener('appinstalled', function () { P.installed = true; P.deferred = null; ui.toast('App installed.'); });
})();
