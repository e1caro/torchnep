/* The play-through of the desktop program, run inside its own window: the home screen, the trainer (drills, the
 * Sevilla rules, a buy-in and a bet spread that must survive a reload, the simulation), the blackjack table (a hand
 * at the Sevilla table), the links between them, and what the home screen shows afterwards.
 *
 * BlackjackHiLo.exe runs this script on every page when it is started with BJHILO_SELFTEST=<log file> (see main.go);
 * tests/browser.js does the same in Chromium against frontend/. It carries on across page loads by keeping its place
 * in sessionStorage, and reports through window.go.main.SelfTest. With mode 'restart' it only checks that a second
 * launch still has what the first one saved. */
(async function () {
  'use strict';
  var api = window.go && window.go.main && window.go.main.SelfTest;
  if (window.__selftest || !api) return;
  window.__selftest = true;
  var st = null;
  try { st = JSON.parse(sessionStorage.getItem('selftest')); } catch (e) { /* first page */ }
  st = st || { step: 0, passed: 0, failed: 0 };
  function save() { sessionStorage.setItem('selftest', JSON.stringify(st)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function until(fn, ms, what) {
    for (var t0 = Date.now(); ;) {
      var v = false;
      try { v = fn(); } catch (e) { v = false; }
      if (v) return v;
      if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what);
      await sleep(100);
    }
  }
  function $(s) { return document.querySelector(s); }
  function text(s) { var e = $(s); return e ? e.textContent : ''; }
  function ok(cond, msg) { if (!cond) throw new Error(msg); }
  function visible(s) { var e = $(s); return !!(e && e.getClientRects().length); }
  function key(k) { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }
  function set(sel, value) { var e = $(sel); e.value = value; e.dispatchEvent(new Event('change', { bubbles: true })); }
  async function view(name) { location.hash = '#' + name; await until(function () { return $('#view-' + name).classList.contains('on'); }, 5000, 'the ' + name + ' view'); }
  function outside() {
    return performance.getEntriesByType('resource').map(function (r) { return r.name; })
      .filter(function (u) { return u.indexOf(location.origin) !== 0 && !/^(data|blob):/.test(u); });
  }
  var path = location.pathname;
  var atHome = function () { return /^\/(index\.html)?$/.test(path); };
  var atTrainer = function () { return /\/hilo\/index\.html$/.test(path); };
  var atTable = function () { return /\/blackjack\/index\.html$/.test(path); };

  var FULL = [
    { name: 'the home screen opens with both doors and its fonts', where: atHome, run: async function () {
      ok(document.title === 'Blackjack & Hi-Lo', 'title is ' + document.title);
      ok(visible('#door-table') && visible('#door-hilo'), 'a door is missing');
      await document.fonts.ready;
      var fonts = Array.from(document.fonts).filter(function (f) { return f.status === 'loaded'; }).length;
      ok(fonts >= 2, 'the bundled fonts did not load (' + fonts + ')');
      await api.Report('      ' + location.origin + ' · ' + innerWidth + '×' + innerHeight + ' · ' + navigator.userAgent);
      return function () { $('#door-hilo').click(); };
    } },
    { name: 'the trainer: drills answer, the Sevilla rules, a buy-in of 500 and bets of 1 to 5', where: atTrainer, run: async function () {
      await until(function () { return visible('#stages li'); }, 10000, 'the plan');
      ok(visible('#deskHome') && visible('#deskTable'), 'the links to the home screen and the table are missing');
      await view('strategy');
      for (var i = 0; i < 25; i++) key('s');
      ok(/of 25/.test(text('#strat-meter')), 'the strategy drill did not count 25 hands: ' + text('#strat-meter'));
      await view('table');
      $('#t-controls button[data-bet="1"]').click();
      await until(function () { return document.querySelectorAll('#t-hands .card').length >= 2; }, 5000, 'cards at the practice table');
      await view('rules');
      set('#set-preset', 'sevilla');
      ok(/no hole card/.test(text('#rules-line')), 'rules line: ' + text('#rules-line'));
      set('#set-bankroll', '500');
      set('#set-spread', '0');                    // the first choice: 5 units
      return function () { location.reload(); };
    } },
    { name: 'after a reload the rules and the money are still set, and the simulation runs under them', where: atTrainer, run: async function () {
      await until(function () { return /no hole card/.test(text('#rules-line')); }, 10000, 'the saved rules (' + text('#rules-line') + ')');
      await view('table');
      ok(/Bankroll 500 units/.test(text('#t-meter')), 'bankroll: ' + text('#t-meter'));
      ok(document.querySelectorAll('#t-controls button[data-bet]').length === 5 && $('#t-controls button[data-bet="5"]'), 'the bet buttons do not follow the 1 to 5 spread');
      await view('edge');
      await until(function () { return !$('#edge-run').disabled && text('#edge-table').indexOf('…') < 0; }, 240000, 'the simulation');
      await api.Report('      edge under the Sevilla rules, 1 to 5 units: ' + Array.from(document.querySelectorAll('#edge-table tbody tr')).map(function (r) { return r.children[1].textContent; }).join(', '));
      return function () { $('#deskTable').click(); };
    } },
    { name: 'the blackjack table: sit down at Sevilla and play a hand', where: atTable, run: async function () {
      await until(function () { return window.BJGame && $('#tableList [data-table="sevilla"]'); }, 15000, 'the lobby with the Sevilla table');
      ok(visible('#deskLobbyHome'), 'the lobby has no link to the home screen');
      $('#tableList [data-table="sevilla"]').click();
      $('#sitBtn').click();
      var G = window.BJGame;
      await until(function () { return G.state && G.state.phase === 'betting' && !G.busy; }, 20000, 'a seat at the table');
      ok(G.state.table.name === 'Sevilla' && G.state.rules.holeCard === 'enhc', 'not the Sevilla table: ' + G.state.table.name + ', ' + G.state.rules.holeCard);
      (await until(function () { return $('#chipTray [data-d]:not(:disabled)'); }, 10000, 'the chip tray')).click();
      await until(function () { return !$('#dealBtn').disabled; }, 10000, 'a bet on the table');
      $('#dealBtn').click();
      await until(function () {                     // stand on everything until the round is over
        if (G.busy) return false;
        if (G.state.phase === 'insurance' && visible('#insNo')) $('#insNo').click();
        else if (G.state.phase === 'player' && visible('#standBtn')) $('#standBtn').click();
        return G.state.phase === 'done';
      }, 60000, 'the end of the round (phase ' + G.state.phase + ')');
      ok(document.querySelectorAll('#felt .card').length >= 3, 'no cards on the felt');
      await api.Report('      ' + text('#msg') + ' · ' + text('#bank'));
      $('#menuBtn').click();
      await until(function () { return visible('#deskHome') && visible('#deskHilo'); }, 10000, 'the links in the table menu');
      return function () { $('#deskHome').click(); };
    } },
    { name: 'back at the home screen, which shows the seat; both games are saved', where: atHome, run: async function () {
      ok(/Sevilla/.test(text('#state-table')), 'the home screen does not show the seat: ' + text('#state-table'));
      var keys = Object.keys(localStorage);
      ['blackjack.v1', 'hilo-settings', 'hilo-trainer', 'hilo-table'].forEach(function (k) { ok(keys.indexOf(k) >= 0, k + ' was not saved (' + keys.join(', ') + ')'); });
    } }
  ];
  var RESTART = [
    { name: 'opened again: the home screen still shows the seat', where: atHome, run: async function () {
      ok(/Sevilla/.test(text('#state-table')), 'the seat is gone: ' + text('#state-table'));
      return function () { $('#door-hilo').click(); };
    } },
    { name: 'opened again: the trainer still has the Sevilla rules and the buy-in', where: atTrainer, run: async function () {
      await until(function () { return /no hole card/.test(text('#rules-line')); }, 10000, 'the saved rules (' + text('#rules-line') + ')');
      await view('table');
      ok(/Buy-ins/.test(text('#t-meter')) && document.querySelectorAll('#t-controls button[data-bet]').length === 5, 'money settings lost: ' + text('#t-meter'));
    } }
  ];

  var steps = window.__selftestMode === 'restart' ? RESTART : FULL;
  window.addEventListener('error', function (e) { st.failed++; save(); api.Report('FAIL  script error on ' + path + ': ' + e.message); });
  await sleep(400);
  while (st.step < steps.length) {
    var s = steps[st.step], next = null;
    try {
      ok(s.where(), 'on the wrong page: ' + location.href);
      next = await s.run();
      var out = outside();
      ok(!out.length, 'fetched from outside the program: ' + out.slice(0, 3).join(', '));
      st.passed++; st.step++;
      await api.Report('  ok  ' + s.name);
    } catch (e) {
      st.failed++; st.step = steps.length; next = null;       // stop at the first failure
      await api.Report('FAIL  ' + s.name + '\n      ' + e.message);
    }
    save();
    if (next) { next(); return; }                             // the next page carries on from here
  }
  await api.Report(st.passed + ' passed, ' + st.failed + ' failed');
  api.Done(st.failed);
})();
