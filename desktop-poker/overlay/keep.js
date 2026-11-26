/* Loaded first in the page (after store.js): your progress is kept in a file of the program's own as well as in the
 * window's storage. The same scheme as the Blackjack & Hi-Lo program (../desktop-blackjack/overlay/keep.js).
 *
 * The window's storage (WebView2's localStorage) did not always survive closing a program. So every change is also
 * written, a moment later, to %APPDATA%\PokerCoach\saved.json by the program (main.go, Desk.SaveStore), and the
 * first page of each run puts that copy back before the app reads anything. main.go answers store.js with the file
 * and an id of the run:
 *   window.__deskRun    a new value each time the program starts
 *   window.__deskStore  { app: 'PokerCoach', store: 1, games: { key: text } }, or null when there is no file
 * Later pages of the same run read the storage as it is, which is never older than the file. In a browser (the
 * tests) store.js is the stand-in and nothing is restored or written. */
(function () {
  'use strict';
  var SAVED = ['poker.v1', 'poker.table.v1', 'poker.hands.v1'];
  var ls;
  try { ls = window.localStorage; if (!ls) return; } catch (e) { return; }
  var kept = window.__deskStore, run = window.__deskRun || '', first = false, restored = 0;
  try {
    first = !!run && sessionStorage.getItem('desk.run') !== run;
    if (first) sessionStorage.setItem('desk.run', run);
  } catch (e) { first = !!run; }
  if (first && kept && kept.games && typeof kept.games === 'object') {
    SAVED.forEach(function (k) {
      var v = kept.games[k];
      if (typeof v !== 'string') return;
      try { JSON.parse(v); } catch (e) { return; }           // a damaged entry is left out, the storage's own stays
      try { if (ls.getItem(k) !== v) { ls.setItem(k, v); restored++; } } catch (e) { /* storage full */ }
    });
  }

  function host() { var d = window.go && window.go.main && window.go.main.Desk; return d && d.SaveStore ? d : null; }
  function snapshot() {
    var games = {};
    SAVED.forEach(function (k) { var v = ls.getItem(k); if (v != null) games[k] = v; });
    return JSON.stringify({ app: 'PokerCoach', store: 1, games: games });
  }
  var timer = 0, sent = '', waits = 0;
  // Sends the storage as it stands now. Answers once the program has written it (at once where there is no program).
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!run) return Promise.resolve(false);                  // a browser: no program to keep a file
    var h = host();
    if (!h) {                                                 // the page is still connecting to the program
      if (++waits < 40) timer = setTimeout(flush, 250);
      return Promise.resolve(false);
    }
    var text = snapshot();
    if (text === sent) return Promise.resolve(true);
    sent = text;
    return Promise.resolve(h.SaveStore(text)).then(function () { return true; }, function () { sent = ''; return false; });
  }
  function soon() { if (!timer) timer = setTimeout(flush, 150); }
  var proto = window.Storage && Storage.prototype;
  if (proto && run) {
    var set = proto.setItem, del = proto.removeItem, clear = proto.clear;
    proto.setItem = function (k, v) { set.call(this, k, v); if (this === ls && SAVED.indexOf(String(k)) >= 0) soon(); };
    proto.removeItem = function (k) { del.call(this, k); if (this === ls && SAVED.indexOf(String(k)) >= 0) soon(); };
    proto.clear = function () { clear.call(this); if (this === ls) soon(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
    // Each page sends what it finds once it is up, so that a save cut short by going to another page gets through.
    window.addEventListener('load', function () { setTimeout(flush, 300); });
  }
  window.DeskStore = { flush: flush, get first() { return first; }, get restored() { return restored; }, get kept() { return !!kept; } };
})();
