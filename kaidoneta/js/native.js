/* Inside the Android app (android-kaidoneta/), the WebView has no share sheet, and vibration and the clipboard are
 * unreliable: the app offers them as window.KaidoNative. This file plugs them into the standard web functions the
 * rest of the app uses (navigator.share / canShare / vibrate / clipboard), so nothing else needs to know.
 * In a browser KaidoNative does not exist and this does nothing. */
(function (root) {
  'use strict';
  var N = root.KaidoNative, nav = root.navigator;
  if (!N) return;
  function define(obj, name, fn) {
    try { Object.defineProperty(obj, name, { value: fn, configurable: true, writable: true }); } catch (e) { /* keep the browser's own */ }
  }
  define(nav, 'canShare', function () { return true; });
  define(nav, 'share', function (data) {
    data = data || {};
    var file = data.files && data.files[0];
    if (file) {
      return new Promise(function (res, rej) {
        var r = new FileReader();
        r.onload = function () { N.shareImage(String(r.result), file.name || 'kaidoneta.png'); res(); };
        r.onerror = function () { rej(new Error('Could not read the picture')); };
        r.readAsDataURL(file);
      });
    }
    N.share([data.text, data.url].filter(Boolean).join('\n'));
    return Promise.resolve();
  });
  define(nav, 'vibrate', function (p) {
    var ms = Array.isArray(p) ? p.reduce(function (sum, v, i) { return i % 2 ? sum : sum + v; }, 0) : Number(p) || 0;
    if (ms > 0) N.vibrate(ms);
    return true;
  });
  var clip = { writeText: function (t) { N.copy(String(t)); return Promise.resolve(); } };
  define(nav, 'clipboard', clip);
  root.K = root.K || {};
  root.K.native = { inApp: true, fromNative: function () { /* update news from the shell: the app shows the new version on its own */ } };
})(window);
