/* Bloomdoku updates itself, like the other apps.
 *
 *  - In a browser or on the iPhone Home Screen: the service worker (sw.js) fetches a new version in the background.
 *    The app looks for one when it opens, every time it comes back to the screen and every half hour, and switches to
 *    it at a calm moment (on the map, with nothing open). In the middle of a garden it waits until you are back.
 *  - In the Android app: the shell downloads the web app of each new release by itself (MainActivity.checkUpdate) and
 *    shows it the next time the app comes back; this file adds the visible part: the version, "Check now", switching
 *    at a calm moment, and a link to the new APK on the rare release that needs one.
 *
 * States: idle | checking | current | coming (a newer version is being fetched) | ready (fetched: switch to apply) |
 *         needsApk (a newer release needs a new app file) | error
 */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var h = BD.h, t = BD.t;
  var U = (BD.update = {});
  var RELEASES = 'https://api.github.com/repos/e1caro/torchnep/releases?per_page=30';
  var state = { status: 'idle', version: 0, apk: '' }, reg = null, listeners = [];

  U.fetch = function (url, opts) { return window.fetch(url, opts); }; // replaced in tests
  U.state = function () { return state; };
  U.on = function (fn) { listeners.push(fn); };
  function set(s) {
    state = { status: s.status, version: s.version || 0, apk: s.apk || '' };
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { /* a listener's own problem */ } });
  }

  // Where the app runs and which versions it has. In the Android app the browser name ends in
  // "BloomdokuWeb/<web version> BloomdokuShell/<shell> BloomdokuApk/<apk>" (older shells give only the first).
  U.info = function () {
    var ua = navigator.userAgent || '';
    function n(re) { var m = re.exec(ua); return m ? +m[1] : 0; }
    return {
      native: !!BD.native, bridge: !!(BD.native && BD.native.checkUpdate),
      web: n(/BloomdokuWeb\/(\d+)/), apk: n(/BloomdokuApk\/(\d+)/), shell: n(/BloomdokuShell\/(\d+)/) || (BD.native ? 1 : 0),
    };
  };

  // A calm moment: nothing being played, no sheet open, nothing being typed.
  U.quiet = function () {
    var a = document.activeElement;
    return !document.body.classList.contains('playing') && !document.querySelector('.sheet-back') && !(a && /^(INPUT|TEXTAREA)$/.test(a.tagName));
  };
  U.apply = function () {
    BD.save();
    if (BD.native && BD.native.restart) BD.native.restart(); else location.reload();
  };
  // Switches to a version that is ready if this is a calm moment. Called when one arrives and on every page change.
  U.applyIfQuiet = function () {
    if (state.status !== 'ready' || !U.quiet()) return false;
    U.apply();
    return true;
  };

  // The Android shell reports here: { status: 'current' | 'ready' | 'needsApk' | 'error', version, apk }
  U.fromNative = function (s) {
    if (!s || typeof s.status !== 'string') return;
    set(s);
    if (s.status === 'ready') U.applyIfQuiet();
  };

  // The newest release among GitHub's list: { version, apk } (for shells too old to check by themselves).
  U.newest = function (releases) {
    var best = { version: 0, apk: '' };
    (Array.isArray(releases) ? releases : []).forEach(function (r) {
      var m = /^bloomdoku-(\d+)$/.exec((r && r.tag_name) || '');
      if (!m || r.draft || +m[1] <= best.version) return;
      best = { version: +m[1], apk: '' };
      (r.assets || []).forEach(function (a) { if (/\.apk$/.test(a.name || '')) best.apk = a.browser_download_url || ''; });
    });
    return best;
  };

  U.check = function () {
    set({ status: 'checking' });
    if (BD.native && BD.native.checkUpdate) { BD.native.checkUpdate(); return Promise.resolve(); } // answers through U.fromNative
    if (BD.native) { // an older shell: it downloads new versions by itself, but cannot say so
      return U.fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { return r.json(); }).then(function (rs) {
        var best = U.newest(rs), web = U.info().web;
        set(best.version > web ? { status: 'coming', version: best.version, apk: best.apk } : { status: 'current', version: web, apk: best.apk });
      }).then(null, function () { set({ status: 'error' }); });
    }
    if (!reg) { set({ status: 'current' }); return Promise.resolve(); }
    return reg.update().then(function () {
      if (state.status === 'checking') set({ status: reg.installing || reg.waiting ? 'coming' : 'current' });
    }, function () { set({ status: 'error' }); });
  };

  // Browser and iPhone: the service worker. A new one takes over by itself (sw.js skips waiting); when it does, the
  // page switches to the new files at the next calm moment.
  U.register = function () {
    if (BD.native || !('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return; // the Android app carries its files
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!had) { had = true; return; } // the very first install: nothing to switch to
      set({ status: 'ready' });
      if (!U.applyIfQuiet()) bar();
    });
    navigator.serviceWorker.register('sw.js').then(function (r) { reg = r; }).catch(function () { /* offline support is optional */ });
    function look() { if (reg && !document.hidden && navigator.onLine !== false) reg.update().catch(function () { /* offline */ }); }
    document.addEventListener('visibilitychange', look);
    setInterval(look, 30 * 60 * 1000);
  };
  function bar() {
    var el = document.getElementById('update');
    if (!el || el.firstChild) return;
    el.appendChild(h('span', t('A new version is ready.')));
    el.appendChild(h('button.btn.small.primary', { type: 'button', onclick: U.apply }, t('Update now')));
    el.classList.add('show');
  }

  // The "Version" section of Settings.
  U.card = function (redraw) {
    var info = U.info(), s = state;
    var name = info.native ? 'Bloomdoku 1.' + (info.web || '?') : t('Web app');
    var line = s.status === 'checking' ? t('Looking for a new version…')
      : s.status === 'coming' ? t('A new version is on its way. It shows up by itself in a moment.')
      : s.status === 'ready' ? t('A new version is ready.')
      : s.status === 'needsApk' ? t('Version 1.{0} needs a new app file. Install it over this one: your gardens stay.', s.version)
      : s.status === 'error' ? t('Could not look for updates. Check your connection.')
      : s.status === 'current' ? t('You have the latest version.')
      : t('Bloomdoku updates itself: new gardens and fixes arrive without doing anything.');
    var card = h('section.card.version',
      h('h2', t('Version')),
      h('p', h('b', name), ' ', h('span.muted.small', line)),
      h('div.row',
        s.status === 'ready' ? h('button.btn.primary', { type: 'button', onclick: U.apply }, t('Update now'))
          : h('button.btn', { type: 'button', disabled: s.status === 'checking' ? true : null, onclick: function () { U.check(); } }, t('Check for updates')),
        (s.status === 'needsApk' || (info.native && !info.bridge)) && s.apk ? h('a.btn.primary', { href: s.apk, target: '_blank', rel: 'noopener' }, t('Get the new app file')) : null),
      info.native && !info.bridge ? h('p.muted.small', t('This app file is an early one. A newer one adds "Update now" inside the app.')) : null);
    if (redraw && !U._bound) { U._bound = true; U.on(function () { if (location.hash.indexOf('#/settings') === 0 && U.quiet()) redraw(); }); }
    return card;
  };
})();
