/* The desktop layer, added to the home screen and to both apps inside the program: what a PC adds to them.
 *
 *   links      each app has a way to the other and back to the home screen
 *   commands   Ctrl+K lists everything that can be done from the keyboard, F1 the keys of the page you are on
 *   window     F11 full screen, Ctrl+T keeps the window above the others, Ctrl + - 0 the size of everything
 *   table      1 to 6 put a chip from the tray on the bet, M opens the menu, T the statistics, K shows the count;
 *              on a wide window a panel on each side: the session as it goes, the shoe, the strategy chart
 *   trainer    Alt+1 to Alt+8 go to its sections
 *   your keys  hit, stand, double, split, deal and the rest each on the key you choose
 *   backups    every saved game to one file, and back
 *
 * The two apps themselves are not changed: the table's own controls are pressed for it. What this layer remembers
 * (the app opened last, the pin, the size, the panels) is kept under 'desk.v1'. Inside the program the window is reached through the Wails
 * runtime (window.runtime) and files through window.go.main.Desk (main.go); in a plain browser, where the tests also
 * run, the browser's own full screen, download and file picker stand in for them. */
(function () {
  'use strict';
  if (window.Desk) return;
  var KEY = 'desk.v1', RESTORE = 'desk.restore';
  var SAVED = ['blackjack.v1', 'blackjack.tables.v1', 'blackjack.sessions.v1', 'hilo-trainer', 'hilo-settings', 'hilo-table', KEY];
  var SECTIONS = [['plan', 'Plan'], ['strategy', 'Basic strategy'], ['running-count', 'Running count'], ['true-count', 'True count and bets'],
    ['deviations', 'Deviations'], ['table', 'Full table'], ['edge', 'The edge'], ['rules', 'Rules and bankroll']];
  var page = document.querySelector('#menu .box') && document.querySelector('#setup .head-btns') ? 'table' : document.querySelector('nav.tabs') ? 'trainer' : 'home';
  var base = page === 'home' ? '' : '../';
  var URLS = { home: base + 'index.html', table: base + 'blackjack/index.html', trainer: base + 'hilo/index.html' };

  function $(s) { return document.querySelector(s); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function keep(patch) {
    var d = read(), k;
    for (k in patch) d[k] = patch[k];
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage full: not remembered */ }
    return d;
  }
  function rt() { return window.runtime || null; }
  function host() { return (window.go && window.go.main && window.go.main.Desk) || null; }

  /* ---------- a line of feedback at the bottom of the window ---------- */
  var toastEl, toastT;
  function say(text) {
    if (!toastEl) { toastEl = el('<div class="desk-toast" role="status" aria-live="polite"></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  }

  /* ---------- the links between the apps ---------- */
  var menu = $('#menu .box'), lobbyBtns = $('#setup .head-btns');
  if (page === 'table') {
    menu.appendChild(el('<div class="desk-links"><h3>Also in this program</h3><div class="row">' +
      '<a class="btn ghost" id="deskHilo" href="../hilo/index.html">Hi-Lo trainer</a>' +
      '<a class="btn ghost" id="deskHome" href="../index.html">Home screen</a></div>' +
      '<p class="keys" id="deskMenuKeys"></p>' +
      '<div class="row"><button class="btn ghost" id="deskMenuYourKeys" type="button">Change the keys</button></div></div>'));
    $('#deskMenuYourKeys').addEventListener('click', function () { var x = $('#menu [data-close]'); if (x) x.click(); keysEditor(); });
    lobbyBtns.insertBefore(el('<a class="btn ghost small" id="deskLobbyHome" href="../index.html">Home screen</a>'), lobbyBtns.firstChild);
  } else if (page === 'trainer') {               // the trainer: two links at the right of its header
    $('header.top').appendChild(el('<span class="desk-nav"><a id="deskHome" href="../index.html">Home screen</a>' +
      '<a id="deskTable" href="../blackjack/index.html">Blackjack table</a></span>'));
    var brand = $('a.brand'); if (brand) brand.setAttribute('href', '../index.html');
  }
  if (page !== 'home') {
    keep({ last: page, lastAt: Date.now() });
    // in a corner of both apps (the home screen has its own bar): the way to everything else
    var pill = el('<button type="button" class="desk-pill" id="deskCmd">Commands <kbd>Ctrl K</kbd></button>');
    pill.addEventListener('click', function () { palette(); });
    document.body.appendChild(pill);
  }

  /* ---------- the window ---------- */
  function go(where, hash) { location.href = URLS[where] + (hash ? '#' + hash : ''); }
  function fullscreen() {
    var r = rt(), d = document, note = 'Full screen · F11 to leave';
    if (r && r.WindowIsFullscreen) {
      return r.WindowIsFullscreen().then(function (on) {
        if (on) r.WindowUnfullscreen(); else { r.WindowFullscreen(); say(note); }
        return !on;
      });
    }
    if (d.fullscreenElement) return d.exitFullscreen().then(function () { return false; });
    if (!d.documentElement.requestFullscreen) return Promise.resolve(false);
    return d.documentElement.requestFullscreen().then(function () { say(note); return true; }, function () { return false; });
  }
  function pin(on) {
    if (on === undefined) on = !read().pin;
    on = !!on;
    keep({ pin: on });
    var r = rt();
    if (r && r.WindowSetAlwaysOnTop) r.WindowSetAlwaysOnTop(on);
    say(on ? 'The window stays on top · Ctrl+T to let go' : 'The window no longer stays on top');
    return on;
  }
  if (read().pin && rt() && rt().WindowSetAlwaysOnTop) rt().WindowSetAlwaysOnTop(true);     // a new page, the same window

  /* ---------- the table: its own controls, pressed from the keyboard ---------- */
  function sheetOpen() { return !!$('.sheet.open'); }
  function chip(n) {
    var b = document.querySelectorAll('#chipTray [data-d]')[n - 1];
    if (b && !b.disabled) b.click();
  }
  function press(id) { var b = document.getElementById(id); if (b) b.click(); }
  // A switch of the table's "Look and help": its menu builds them, so the menu is opened and closed around the click.
  function pref(k, onText, offText) {
    var G = window.BJGame;
    if (!G || !G.state) { say('Sit down at a table first'); return; }
    var opened = false, was = $('.sheet.open');
    if (was && was.id !== 'menu') { say('Close this panel first'); return; }
    if (!was) { press('menuBtn'); opened = true; }
    var box = document.getElementById('p-' + k);
    if (box) { box.click(); say(box.checked ? onText : offText); }
    if (opened) { var x = $('#menu [data-close]'); if (x) x.click(); }
  }

  /* ---------- the size of everything: the window's own scale (fit.js) times the person's ---------- */
  function zoomTo(u) {
    u = Math.min(2, Math.max(0.6, Math.round(u * 10) / 10));
    keep({ zoom: u });
    if (window.DeskFit) window.DeskFit.refit();
    window.dispatchEvent(new Event('resize'));     // the apps lay themselves out again
    say('Size ' + Math.round(u * 100) + '%' + (u === 1 ? '' : ' · Ctrl+0 for the normal size'));
  }
  function zoomBy(d) { zoomTo((window.DeskFit ? window.DeskFit.user : 1) + d); }
  var wheelT = 0;
  window.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (Date.now() - wheelT < 90 || !e.deltaY) return;
    wheelT = Date.now();
    zoomBy(e.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false, capture: true });

  /* ---------- the table on a wide window: a panel on each side ---------- */
  // Left, this session: the result, the bankroll hand by hand, the figures, the last hands. Right, what a card room
  // would not hand you: the shoe, the Hi-Lo count when the table shows it, and the basic strategy chart for these
  // rules with the hand you are holding marked. They are drawn from the game itself (BJGame.state), a few times a
  // second while something changes; the page they stand beside is not touched.
  function panelsOn(on) {
    if (on === undefined) on = read().panels === false;
    keep({ panels: !!on });
    if (window.DeskFit) window.DeskFit.refit();
    window.dispatchEvent(new Event('resize'));
    say(on ? (document.documentElement.classList.contains('desk-wide') ? 'The side panels are shown' : 'The side panels are on: they appear when the window is wide enough')
      : 'The side panels are hidden · I brings them back');
  }
  if (page === 'table') (function () {
    var G = window.BJGame, B = window.BJ, rootEl = document.documentElement;
    if (!G || !B) return;
    var left = el('<aside class="desk-side" id="deskLeft" aria-label="This session"></aside>');
    var right = el('<aside class="desk-side" id="deskRight" aria-label="The shoe and basic strategy"></aside>');
    document.body.appendChild(left); document.body.appendChild(right);
    right.addEventListener('click', function (e) {
      var b = e.target.closest('[data-desk]');
      if (!b) return;
      if (b.dataset.desk === 'palette') palette(); else run(b.dataset.desk);
    });
    var sec = 'Hard', secFor = '';                 // the part of the chart on show: it follows the hand, or a click
    var UPS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A'], MOVES = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender', I: 'Insure', N: 'No insurance' };
    var ROWS = [['Hard', [['h8', '5–8', '2', '6'], ['h9', '9', '2', '7'], ['h10', '10', '2', '8'], ['h11', '11', '2', '9'], ['h12', '12', '2', '10'], ['h13', '13', '3', '10'],
        ['h14', '14', '4', '10'], ['h15', '15', '5', '10'], ['h16', '16', '6', '10'], ['h17', '17+', '7', '10']]],
      ['Soft', [['s13', 'A 2', 'A', '2'], ['s14', 'A 3', 'A', '3'], ['s15', 'A 4', 'A', '4'], ['s16', 'A 5', 'A', '5'], ['s17', 'A 6', 'A', '6'], ['s18', 'A 7', 'A', '7'],
        ['s19', 'A 8', 'A', '8'], ['s20', 'A 9', 'A', '9']]],
      ['Pairs', [['p2', '2 2', '2', '2'], ['p3', '3 3', '3', '3'], ['p4', '4 4', '4', '4'], ['p5', '5 5', '5', '5'], ['p6', '6 6', '6', '6'], ['p7', '7 7', '7', '7'],
        ['p8', '8 8', '8', '8'], ['p9', '9 9', '9', '9'], ['p10', '10 10', '10', '10'], ['p1', 'A A', 'A', 'A']]]];
    function chartHTML(R) {
      var head = '<tr><th></th>' + UPS.map(function (u) { return '<th data-up="' + u + '">' + u + '</th>'; }).join('') + '</tr>';
      return '<table class="desk-chart" data-sec="' + sec + '"><thead>' + head + '</thead>' + ROWS.map(function (part) {
        return '<tbody data-sec="' + part[0] + '">' + part[1].map(function (r) {
          return '<tr data-row="' + r[0] + '"><th>' + r[1] + '</th>' + UPS.map(function (u) {
            var a = B.advise({ phase: 'player', rules: R, active: 0, bankroll: 1e12, hands: [{ cards: [{ rank: r[2] }, { rank: r[3] }], bet: 100, done: false }], dealer: [{ rank: u }] });
            var m = a ? a.move : '';
            return '<td class="m' + m + '" data-up="' + u + '" title="' + (a ? esc(a.why + ': ' + MOVES[m].toLowerCase()) : '') + '">' + m + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody>';
      }).join('') + '</table>';
    }
    function cell(S) {                             // the row and the column of the hand being played
      var h = S.phase === 'player' ? S.hands[S.active] : null;
      if (!h || h.done || h.cards.length < 2 || !S.dealer[0]) return null;
      var v = B.handValue(h.cards), a = B.cardValue(h.cards[0].rank), up = B.upValue(S.dealer[0]), row;
      if (h.cards.length === 2 && a === B.cardValue(h.cards[1].rank)) row = 'p' + a;
      else if (v.soft && v.total >= 13 && v.total <= 20) row = 's' + v.total;
      else if (v.soft) return null;
      else row = 'h' + Math.min(17, Math.max(8, v.total));
      return { row: row, up: up === 11 ? 'A' : String(up) };
    }
    function signed(c) { return (c > 0 ? '+' : '') + G.fmt(c); }
    function tone(c) { return c > 0 ? ' class="good"' : c < 0 ? ' class="bad"' : ''; }
    function spark(hist, start) {
      var w = 260, h = 78, pad = 6, n = hist.length;
      if (n < 2) return '<p class="desk-note">The line of your bankroll starts with the first hand.</p>';
      var lo = Math.min.apply(null, hist.concat(start)), hi = Math.max.apply(null, hist.concat(start)), span = hi - lo || 1;
      var x = function (i) { return (pad + i * (w - 2 * pad) / (n - 1)).toFixed(1); }, y = function (v) { return (h - pad - (v - lo) * (h - 2 * pad) / span).toFixed(1); };
      var pts = hist.map(function (v, i) { return x(i) + ',' + y(v); }).join(' '), up = hist[n - 1] >= start;
      return '<svg class="desk-spark' + (up ? '' : ' down') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<line class="base" x1="0" x2="' + w + '" y1="' + y(start) + '" y2="' + y(start) + '"/>' +
        '<polygon class="area" points="' + x(0) + ',' + y(start) + ' ' + pts + ' ' + x(n - 1) + ',' + y(start) + '"/>' +
        '<polyline class="line" points="' + pts + '"/><circle class="dot" cx="' + x(n - 1) + '" cy="' + y(hist[n - 1]) + '" r="3.5"/></svg>';
    }
    function clock(ms) { var m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
    function fig(label, value) { return '<div><span>' + label + '</span><b>' + value + '</b></div>'; }
    function leftHTML(S) {
      var st = S.stats, n = st.won + st.lost + st.pushed || 1, R = S.rules;
      var streak = st.streak > 0 ? st.streak + (st.streak === 1 ? ' win' : ' wins') : st.streak < 0 ? -st.streak + (st.streak === -1 ? ' loss' : ' losses') : '–';
      var hands = (S.log || []).slice(-6).reverse().map(function (r) {
        var you = r.h.map(function (h) { return h.t > 21 ? 'bust' : h.t; }).join(' / ');
        return '<li><i>' + r.n + '</i><span>You ' + you + ' · Dealer ' + (r.dt > 21 ? 'bust' : r.dt) + '</span><b' + tone(r.net) + '>' + signed(r.net) + '</b></li>';
      }).join('');
      return '<section><h3>' + esc(S.table.name) + '</h3><p class="desk-sub">' + G.fmt(R.minBet * 100) + ' to ' + G.fmt(R.maxBet * 100) + ' · ' + R.decks + (R.decks > 1 ? ' decks' : ' deck') + '</p>' +
        '<p class="desk-net"><b' + tone(st.net) + '>' + signed(st.net) + '</b><span>this session</span></p>' + spark(S.history || [], st.start) +
        '<p class="desk-ends"><span>High ' + G.fmt(st.peak) + '</span><span>Low ' + G.fmt(st.low) + '</span></p></section>' +
        '<section><div class="desk-wlp" role="img" aria-label="' + st.won + ' won, ' + st.pushed + ' pushed, ' + st.lost + ' lost">' +
        '<i class="w" style="flex:' + st.won + '"></i><i class="p" style="flex:' + st.pushed + '"></i><i class="l" style="flex:' + st.lost + '"></i></div>' +
        '<p class="desk-ends"><span>Won ' + st.won + '</span><span>Push ' + st.pushed + '</span><span>Lost ' + st.lost + '</span></p>' +
        '<div class="desk-figs">' + fig('Rounds', st.rounds) + fig('Hands won', Math.round(100 * st.won / n) + '%') + fig('Blackjacks', st.blackjacks) + fig('Best hand', signed(st.best)) +
        fig('Run', streak) + fig('By the chart', st.decisions ? Math.round(100 * st.correct / st.decisions) + '%' : '–') + '</div>' +
        '<p class="desk-ends"><span>Wagered ' + G.fmt(st.wagered) + '</span><span>' + clock((S.session && S.session.played) || 0) + ' at the table</span></p></section>' +
        '<section class="grow"><h3>Last hands</h3>' + (hands ? '<ol class="desk-log">' + hands + '</ol>' : '<p class="desk-note">Nothing played yet at this table.</p>') + '</section>';
    }
    function shoeHTML(S) {
      var R = S.rules, sg = function (v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d || 0); }, shown = false;
      try { shown = !!JSON.parse(localStorage.getItem('blackjack.v1')).prefs.count; } catch (e) { /* not saved yet */ }
      var dealt = S.size - S.shoe.length, body;
      if (R.continuous) body = '<p class="desk-big">Shuffled <span>before every hand</span></p>';
      else body = '<p class="desk-big">' + (S.shoe.length / 52).toFixed(1) + ' <span>of ' + R.decks + (R.decks > 1 ? ' decks' : ' deck') + ' left</span></p>' +
        '<div class="desk-shoe" aria-hidden="true"><i style="width:' + (100 * dealt / S.size).toFixed(1) + '%"></i><b style="left:' + (100 * S.cut / S.size).toFixed(1) + '%"></b></div>' +
        '<p class="desk-ends"><span>' + dealt + ' cards dealt</span><span>' + Math.max(0, S.cut - dealt) + ' to the cut card</span></p>';
      return '<h3>The shoe</h3>' + body + (shown
        ? '<div class="desk-figs two">' + fig('Running count', sg(S.count)) + fig('True count', sg(B.trueCount(S), 1)) + '</div>'
        : '<p class="desk-note"><kbd>K</kbd> shows the Hi-Lo count of this shoe.</p>') +
        '<p class="desk-note">The house edge with these rules is about ' + B.houseEdge(R).toFixed(2) + '%.</p>';
    }
    function verdict(S) {
      var a = S.advice;
      if (!a || !MOVES[a.move] || !MOVES[a.best]) return '<p class="desk-note" id="deskVerdict">The cell of your hand lights up when it is your turn.</p>';
      var ok = a.move === a.best;
      return '<p class="desk-note ' + (ok ? 'good' : 'bad') + '" id="deskVerdict">' + esc(a.why) + ': you chose ' + MOVES[a.move].toLowerCase() +
        (ok ? ', as the chart does.' : '; the chart says ' + MOVES[a.best].toLowerCase() + '.') + '</p>';
    }
    function showSec() {
      var t = right.querySelector('.desk-chart');
      if (t) t.dataset.sec = sec;
      right.querySelectorAll('#deskTabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.sec === sec)); });
    }
    right.addEventListener('click', function (e) {
      var b = e.target.closest('#deskTabs button');
      if (b) { sec = b.dataset.sec; showSec(); }
    });
    right.innerHTML = '<section id="deskShoe"></section><section class="grow"><h3>Basic strategy</h3>' +
      '<div class="desk-tabs" id="deskTabs"><button type="button" data-sec="Hard">Hard</button><button type="button" data-sec="Soft">Soft</button><button type="button" data-sec="Pairs">Pairs</button></div>' +
      '<div id="deskChart"></div>' +
      '<p class="desk-legend"><span class="mH">H</span> hit <span class="mS">S</span> stand <span class="mD">D</span> double <span class="mP">P</span> split <span class="mR">R</span> surrender</p>' +
      '<div id="deskSay"></div></section>' +
      '<div class="desk-side-foot"><button type="button" data-desk="palette">Commands <kbd>Ctrl K</kbd></button><button type="button" data-desk="keys">Keys <kbd>F1</kbd></button>' +
      '<button type="button" data-desk="panels">Hide <kbd>I</kbd></button></div>';
    var seen = '', rulesKey = '', was = '';
    function draw() {
      var S = G.state;
      if (S && S.phase !== was) { if (S.phase === 'done' && was && was !== 'betting') cheer(S); was = S.phase; }
      if (!rootEl.classList.contains('desk-wide')) return;
      if (!S) {
        if (seen !== 'none') { seen = 'none'; rulesKey = ''; left.innerHTML = '<section class="grow"><h3>No table yet</h3><p class="desk-note">Choose a table and sit down: this side then follows your session, the other one the shoe and the chart.</p></section>'; right.classList.add('idle'); }
        return;
      }
      right.classList.remove('idle');
      var c = cell(S), a = S.advice, shown = localStorage.getItem('blackjack.v1') || '';
      var sig = [S.phase, S.active, S.stats.rounds, S.stats.net, S.shoe.length, S.count, S.history.length, S.hands.map(function (h) { return h.cards.length; }).join(),
        c ? c.row + c.up : '', a ? a.move + a.best : '', shown.indexOf('"count":true') >= 0, Math.round(((S.session && S.session.played) || 0) / 60000)].join('|');
      if (sig === seen) return;
      seen = sig;
      left.innerHTML = leftHTML(S);
      document.getElementById('deskShoe').innerHTML = shoeHTML(S);
      var rk = JSON.stringify(S.rules);
      if (rk !== rulesKey) { rulesKey = rk; document.getElementById('deskChart').innerHTML = chartHTML(S.rules); }
      right.querySelectorAll('.desk-chart .on, .desk-chart .at').forEach(function (e) { e.classList.remove('on', 'at'); });
      if (c && c.row + c.up !== secFor) { secFor = c.row + c.up; sec = c.row.charAt(0) === 'h' ? 'Hard' : c.row.charAt(0) === 's' ? 'Soft' : 'Pairs'; }
      if (!c) secFor = '';
      showSec();
      if (c) {
        var tr = right.querySelector('.desk-chart tr[data-row="' + c.row + '"]');
        if (tr) {
          tr.classList.add('at');
          var td = tr.querySelector('td[data-up="' + c.up + '"]'), th = right.querySelector('.desk-chart thead th[data-up="' + c.up + '"]');
          if (td) td.classList.add('on');
          if (th) th.classList.add('at');
        }
      }
      document.getElementById('deskSay').innerHTML = verdict(S);
    }
    // A win lights the rail for a moment; a blackjack throws a little gold as well. Not with animations off.
    function cheer(S) {
      var L = S.last, table = document.getElementById('table');
      if (!L || L.net <= 0 || !table || document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var bj = S.hands.some(function (h) { return h.bj; });
      table.classList.remove('desk-won', 'desk-bj');
      void table.offsetWidth;
      table.classList.add(bj ? 'desk-bj' : 'desk-won');
      if (bj) {
        var burst = el('<div class="desk-burst" aria-hidden="true"></div>'), i, a, d;
        for (i = 0; i < 18; i++) {
          a = (i / 18) * 2 * Math.PI + Math.random() * 0.3; d = 90 + Math.random() * 120;
          burst.appendChild(el('<i style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d * 0.7 - 40) + 'px;--t:' + (0.7 + Math.random() * 0.5).toFixed(2) + 's"></i>'));
        }
        document.getElementById('felt').appendChild(burst);
        setTimeout(function () { burst.remove(); }, 1500);
      }
      setTimeout(function () { table.classList.remove('desk-won', 'desk-bj'); }, 1600);
    }
    draw();
    setInterval(draw, 250);
    window.addEventListener('resize', function () { seen = ''; draw(); });
  })();

  /* ---------- backups: every saved game in one file ---------- */
  function backupText() {
    var games = {};
    SAVED.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) games[k] = v; });
    return JSON.stringify({ app: 'BlackjackHiLo', backup: 1, saved: new Date().toISOString(), games: games }, null, 1);
  }
  function parseBackup(text) {
    var b = JSON.parse(text), games = {}, n = 0;
    if (!b || b.app !== 'BlackjackHiLo' || !b.games || typeof b.games !== 'object') throw new Error('not a backup of this program');
    SAVED.forEach(function (k) {
      if (typeof b.games[k] !== 'string') return;
      JSON.parse(b.games[k]);                       // each saved game is JSON text: refuse a damaged one
      games[k] = b.games[k]; n++;
    });
    if (!n) throw new Error('the backup holds no saved games');
    return { saved: b.saved, games: games };
  }
  function applyBackup(b) {
    SAVED.forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(b.games).forEach(function (k) { localStorage.setItem(k, b.games[k]); });
  }
  function backup() {
    var text = backupText(), name = 'BlackjackHiLo-backup-' + new Date().toISOString().slice(0, 10) + '.json', h = host();
    if (h && h.SaveBackup) {
      return h.SaveBackup(text).then(function (path) { if (path) say('Backup saved: ' + path); return path; },
        function (err) { say('The backup could not be saved: ' + err); return ''; });
    }
    var a = el('<a></a>');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    say('Backup saved: ' + name);
    return Promise.resolve(name);
  }
  function pickFile() {
    var h = host();
    if (h && h.OpenBackup) return h.OpenBackup();
    return new Promise(function (res, rej) {
      var inp = el('<input type="file" accept=".json,application/json" hidden>');
      inp.addEventListener('change', function () {
        var f = inp.files[0];
        if (!f) return res('');
        var fr = new FileReader();
        fr.onload = function () { res(String(fr.result)); }; fr.onerror = function () { rej(fr.error); };
        fr.readAsText(f);
      });
      document.body.appendChild(inp); inp.click(); inp.remove();
    });
  }
  function restore() {
    return pickFile().then(function (text) {
      if (!text) return;
      var b;
      try { b = parseBackup(text); } catch (e) { say('That file cannot be restored: ' + e.message); return; }
      var when = b.saved ? new Date(b.saved) : null, date = when && !isNaN(when) ? when.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'an unknown date';
      ask('Restore this backup?', 'Your seat, your tables, the session history and the trainer progress on this computer are replaced by the backup of ' + date + '.',
        'Restore', function () { finishRestore(text); });
    }, function (err) { say('That file could not be read: ' + err); });
  }
  // The table saves its game again as its page is left, so the backup is put in place from the home screen.
  function finishRestore(text) {
    if (page === 'home') { applyBackup(parseBackup(text)); sessionStorage.setItem('desk.said', 'Your games were restored from the backup'); location.reload(); return; }
    sessionStorage.setItem(RESTORE, text);
    go('home');
  }
  if (page === 'home') {
    var waiting = null;
    try { waiting = sessionStorage.getItem(RESTORE); } catch (e) { /* no session storage */ }
    if (waiting) {
      sessionStorage.removeItem(RESTORE);
      try { applyBackup(parseBackup(waiting)); sessionStorage.setItem('desk.said', 'Your games were restored from the backup'); } catch (e) { /* checked before it was kept */ }
    }
  }
  try {
    var said = sessionStorage.getItem('desk.said');
    if (said) { sessionStorage.removeItem('desk.said'); setTimeout(function () { say(said); }, 300); }
  } catch (e) { /* no session storage */ }

  /* ---------- your keys: which key hits, stands, doubles... ---------- */
  // Every action has one key, and you can give it another ("Your keys", from F1 or the commands). The apps only
  // know their own (H to hit, S to stand): the key you chose is handed to them as theirs, and the one it replaced
  // no longer answers. Kept under desk.v1 as { action: key }. A key is named as the keyboard event names it, a
  // letter in lower case, the space bar 'Space'. table / trainer: the app's own key for the action on that page;
  // DESK: an action of this layer; missing: the action does not exist there.
  var DESK = 1;
  var ACTIONS = [
    { id: 'hit', label: 'Hit', def: 'h', table: 'h', trainer: 'h', group: 'Playing a hand' },
    { id: 'stand', label: 'Stand', def: 's', table: 's', trainer: 's' },
    { id: 'double', label: 'Double', def: 'd', table: 'd', trainer: 'd' },
    { id: 'split', label: 'Split', def: 'p', table: 'p', trainer: 'p' },
    { id: 'surrender', label: 'Surrender', def: 'r', table: 'r' },
    { id: 'yes', label: 'Insurance: take it', def: 'y', table: 'y', trainer: 'y' },
    { id: 'no', label: 'Insurance: no', def: 'n', table: 'n', trainer: 'n' },
    { id: 'deal', label: 'Deal, bet the same again, next round', def: 'Enter', table: 'Enter', group: 'At the blackjack table' },
    { id: 'clear', label: 'Take the bet back', def: 'Backspace', table: 'Backspace' },
    { id: 'change', label: 'Change the bet after a round', def: 'c', table: 'c' },
    { id: 'menu', label: 'Menu, rules and settings', def: 'm', table: DESK },
    { id: 'stats', label: 'Statistics', def: 't', table: DESK },
    { id: 'count', label: 'Show or hide the card count', def: 'k', table: DESK },
    { id: 'panels', label: 'Side panels on a wide window', def: 'i', table: DESK },
    { id: 'next', label: 'Next card in the running count', def: 'Space', trainer: 'Space', group: 'In the Hi-Lo trainer' }
  ];
  var ALSO = { table: { Space: 'deal', Delete: 'clear' } };      // other keys the table itself gives to an action
  var ARROWS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  function action(id) { for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].id === id) return ACTIONS[i]; return null; }
  function keyName(e) {                          // the name of the key pressed, or '' for one that cannot be given to an action
    var k = e.key;
    if (!k || e.ctrlKey || e.altKey || e.metaKey) return '';
    if (k === ' ') return 'Space';
    if (k.length === 1) return /[1-6?]/.test(k) ? '' : k.toLowerCase();     // 1 to 6 are the chips, ? the list of keys
    return /^(Enter|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Arrow(Left|Right|Up|Down))$/.test(k) ? k : '';
  }
  function show(name) { return ARROWS[name] || (name.length === 1 ? name.toUpperCase() : name); }
  function keyOf(id) { var mine = read().keys || {}, a = action(id); return (typeof mine[id] === 'string' && mine[id]) || (a ? a.def : ''); }
  function actionByKey(name) { for (var i = 0; i < ACTIONS.length; i++) if (keyOf(ACTIONS[i].id) === name) return ACTIONS[i]; return null; }
  // Gives an action a key. The action that had it takes the key this one leaves, so that none is left without.
  function setKey(id, name) {
    var a = action(id), mine = read().keys || {}, other = actionByKey(name), was = keyOf(id);
    if (!a || !name || name === was) return null;
    if (other) { if (was === other.def) delete mine[other.id]; else mine[other.id] = was; }
    if (name === a.def) delete mine[id]; else mine[id] = name;
    keep({ keys: mine });
    hints();
    return other;
  }
  function resetKeys() { keep({ keys: {} }); hints(); }
  // What to do with a key on this page: hand the app its own key instead, run an action of this layer, keep a key
  // that was given away from answering, or leave it alone.
  function heard(name) {
    var a = actionByKey(name), own = a && a[page], i, b = null;
    if (own === DESK) return { desk: a.id };
    if (own) return own === name ? null : { send: own };
    for (i = 0; i < ACTIONS.length && !b; i++) if (ACTIONS[i][page] === name) b = ACTIONS[i];
    if (!b && ALSO[page] && ALSO[page][name]) b = action(ALSO[page][name]);
    return b && keyOf(b.id) !== b.def ? { swallow: true } : null;
  }
  var passing = false;
  function send(name) {
    passing = true;
    try { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: name === 'Space' ? ' ' : name, bubbles: true, cancelable: true })); }
    finally { passing = false; }
  }
  function deskAct(id) {
    if (id === 'menu') press('menuBtn'); else if (id === 'stats') press('statsBtn'); else if (id === 'count') run('count'); else if (id === 'panels') panelsOn();
  }
  // The keys the apps print on their own buttons and in the table's menu follow yours.
  var TABLE_HINTS = { hit: '#hitBtn kbd', stand: '#standBtn kbd', double: '#doubleBtn kbd', split: '#splitBtn kbd', surrender: '#surrenderBtn kbd', yes: '#insYes kbd', no: '#insNo kbd' };
  var DRILL = { H: 'hit', S: 'stand', D: 'double', P: 'split', Y: 'yes', N: 'no' };
  function label(node, id) { var t = show(keyOf(id)); if (node && node.textContent !== t) node.textContent = t; }
  function hints() {
    var K = function (id) { return '<kbd>' + esc(show(keyOf(id))) + '</kbd>'; }, id, p;
    if (page === 'table') {
      for (id in TABLE_HINTS) label($(TABLE_HINTS[id]), id);
      p = $('#menu .box > p.keys');
      if (p) p.innerHTML = K('hit') + ' hit · ' + K('stand') + ' stand · ' + K('double') + ' double · ' + K('split') + ' split · ' + K('surrender') + ' surrender · ' +
        K('yes') + '/' + K('no') + ' insurance · ' + K('deal') + ' deal · ' + K('clear') + ' clear bet';
      p = $('#deskMenuKeys');
      if (p) p.innerHTML = '<kbd>1</kbd>–<kbd>6</kbd> chips · ' + K('menu') + ' this menu · ' + K('stats') + ' statistics · ' + K('count') + ' the count · ' + K('panels') + ' side panels · ' +
        '<kbd>F11</kbd> full screen · <kbd>Ctrl</kbd>+<kbd>K</kbd> every command · <kbd>F1</kbd> all keys';
    } else if (page === 'trainer') {
      document.querySelectorAll('button[data-a] kbd').forEach(function (k) { var a = DRILL[k.parentNode.dataset.a]; if (a) label(k, a); });
      document.querySelectorAll('button[data-ins] kbd').forEach(function (k) { label(k, k.parentNode.dataset.ins === '1' ? 'yes' : 'no'); });
      label($('#rc-next kbd'), 'next');
    }
  }
  if (page === 'trainer' && window.MutationObserver) {       // the trainer draws its buttons again for every hand
    var hintT = 0;
    new MutationObserver(function () { clearTimeout(hintT); hintT = setTimeout(hints, 0); }).observe(document.body, { childList: true, subtree: true });
  }
  hints();

  /* ---------- commands ---------- */
  var CMDS = [
    { id: 'table', title: 'Blackjack table', keys: 'Ctrl 1', run: function () { go('table'); } },
    { id: 'trainer', title: 'Hi-Lo trainer', keys: 'Ctrl 2', run: function () { go('trainer'); } },
    { id: 'home', title: 'Home screen', keys: 'Ctrl H', run: function () { go('home'); } }
  ];
  if (page === 'table') {
    CMDS.push(
      { id: 'menu', title: 'Table: menu, rules and settings', act: 'menu', run: function () { press('menuBtn'); } },
      { id: 'stats', title: 'Table: statistics of this session', act: 'stats', run: function () { press('statsBtn'); } },
      { id: 'count', title: 'Table: show or hide the card count', act: 'count', run: function () { pref('count', 'The card count is shown', 'The card count is hidden'); } },
      { id: 'hints', title: 'Table: basic strategy hints on or off', run: function () { pref('hints', 'Basic strategy hints are on', 'Basic strategy hints are off'); } },
      { id: 'sound', title: 'Table: sound on or off', run: function () { pref('sound', 'Sound is on', 'Sound is off'); } },
      { id: 'panels', title: 'Table: side panels (session, shoe, strategy chart) on or off', act: 'panels', run: function () { panelsOn(); } });
  }
  SECTIONS.forEach(function (s, i) {
    CMDS.push({ id: 'sec-' + s[0], title: 'Trainer: ' + s[1], keys: page === 'trainer' ? 'Alt ' + (i + 1) : '', run: function () { go('trainer', s[0]); } });
  });
  CMDS.push(
    { id: 'fullscreen', title: 'Full screen, or back to a window', keys: 'F11', run: fullscreen },
    { id: 'pin', title: 'Keep the window on top of the others, or let go', keys: 'Ctrl T', run: function () { pin(); } },
    { id: 'bigger', title: 'Everything bigger', keys: 'Ctrl +', run: function () { zoomBy(0.1); } },
    { id: 'smaller', title: 'Everything smaller', keys: 'Ctrl −', run: function () { zoomBy(-0.1); } },
    { id: 'normal', title: 'Everything at the normal size for this window', keys: 'Ctrl 0', run: function () { zoomTo(1); } },
    { id: 'keys', title: 'Keyboard shortcuts of this page', keys: 'F1', run: keysSheet },
    { id: 'yourkeys', title: 'Change the keys: hit, stand, double, split, deal and the rest', run: keysEditor },
    { id: 'backup', title: 'Save a backup of all your games to a file', run: backup },
    { id: 'restore', title: 'Restore your games from a backup file', run: restore });
  if (rt() && rt().Quit) CMDS.push({ id: 'quit', title: 'Close the program', keys: 'Alt F4', run: function () { rt().Quit(); } });
  function run(id) {
    for (var i = 0; i < CMDS.length; i++) if (CMDS[i].id === id) return CMDS[i].run();
  }
  function kbd(keys) { return keys ? keys.split(' ').map(function (k) { return k === '–' ? ' – ' : '<kbd>' + esc(k) + '</kbd>'; }).join('') : ''; }

  /* ---------- one panel at a time over the page: the commands, the keys, a question ---------- */
  var layer = null, lastFocus = null, onKey = null;
  function open(html, key) {
    close();
    lastFocus = document.activeElement;
    layer = el('<div class="desk-layer"><div class="desk-box" role="dialog" aria-modal="true">' + html + '</div></div>');
    layer.addEventListener('mousedown', function (e) { if (e.target === layer) close(); });
    document.body.appendChild(layer);
    onKey = key || null;
    var x = layer.querySelector('[data-desk-close]');
    if (x) x.addEventListener('click', close);
    return layer;
  }
  function close() {
    if (!layer) return;
    layer.remove(); layer = null; onKey = null;
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function trapTab(e) {                          // Tab stays inside the panel
    var f = layer.querySelectorAll('button, input, a[href]'), first = f[0], last = f[f.length - 1];
    if (!first) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function palette() {
    var L = open('<input class="desk-q" id="deskQ" type="text" autocomplete="off" spellcheck="false" placeholder="Type a command" aria-label="Type a command" aria-controls="deskList">' +
      '<ul class="desk-list" id="deskList" role="listbox"></ul>' +
      '<p class="desk-foot"><kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> do it · <kbd>Esc</kbd> close</p>', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
    });
    var q = L.querySelector('#deskQ'), list = L.querySelector('#deskList'), shown = [], sel = 0;
    function draw() {
      var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = CMDS.filter(function (c) { var t = c.title.toLowerCase(); return words.every(function (w) { return t.indexOf(w) >= 0; }); });
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length ? shown.map(function (c, i) {
        return '<li role="option" data-i="' + i + '" data-cmd="' + c.id + '" aria-selected="' + (i === sel) + '"><span>' + esc(c.title) + '</span><span class="desk-k">' + kbd(c.act ? show(keyOf(c.act)) : c.keys) + '</span></li>';
      }).join('') : '<li class="desk-none">No command matches</li>';
      var on = list.querySelector('[aria-selected=true]');
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
    }
    function move(d) { if (shown.length) { sel = (sel + d + shown.length) % shown.length; draw(); } }
    function pick(i) { var c = shown[i]; if (!c) return; close(); c.run(); }
    q.addEventListener('input', function () { sel = 0; draw(); });
    list.addEventListener('mousemove', function (e) { var li = e.target.closest('[data-i]'); if (li && Number(li.dataset.i) !== sel) { sel = Number(li.dataset.i); draw(); } });
    list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) pick(Number(li.dataset.i)); });
    draw();
    q.focus();
  }

  function pageKeys() {
    var K = function () { return Array.prototype.map.call(arguments, function (id) { return show(keyOf(id)); }).join(' '); };
    if (page === 'home') return ['On the home screen', [['1', 'Blackjack table'], ['2', 'Hi-Lo trainer'], ['Enter', 'carry on where you were'], ['← →', 'from one door to the other']]];
    if (page === 'table') return ['At the blackjack table', [['1 – 6', 'put a chip from the tray on the bet'], [K('deal'), 'deal, bet the same again, next round'], [K('clear'), 'take the bet back'],
      [K('hit'), 'hit'], [K('stand'), 'stand'], [K('double'), 'double'], [K('split'), 'split'], [K('surrender'), 'surrender'], [K('yes', 'no'), 'insurance, yes or no'],
      [K('change'), 'change the bet after a round'], [K('menu'), 'menu, rules and settings'], [K('stats'), 'statistics'], [K('count'), 'show or hide the card count'],
      [K('panels'), 'side panels on a wide window: your session, the shoe, the strategy chart'], ['Esc', 'close a panel']]];
    return ['In the Hi-Lo trainer', [[K('hit', 'stand', 'double', 'split'), 'hit, stand, double, split in the drills and at the practice table'],
      [K('yes', 'no'), 'insurance, or whether to leave the chart'], [K('next'), 'next card in the running count'], ['Alt 1 – 8', 'the sections, from the plan to the rules']]];
  }
  var EVERYWHERE = [['Ctrl K', 'every command, by name'], ['F1', 'this list'], ['F11', 'full screen'], ['Ctrl T', 'keep the window on top'],
    ['Ctrl 1', 'Blackjack table'], ['Ctrl 2', 'Hi-Lo trainer'], ['Ctrl H', 'home screen'], ['Ctrl + − 0', 'bigger, smaller, normal size (also Ctrl and the mouse wheel); it is remembered']];
  function rows(list) { return list.map(function (r) { return '<dt>' + kbd(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join(''); }
  function keysSheet() {
    var p = pageKeys();
    var L = open('<div class="desk-head"><h2 id="deskKeysTitle">Keyboard</h2><button type="button" class="desk-x" data-desk-close aria-label="Close">×</button></div>' +
      '<div class="desk-scroll"><h3>' + p[0] + '</h3><dl class="desk-keys">' + rows(p[1]) + '</dl>' +
      '<h3>Everywhere</h3><dl class="desk-keys">' + rows(EVERYWHERE) + '</dl></div>' +
      '<div class="desk-row"><button type="button" class="desk-btn" id="deskToYourKeys">Change the keys</button></div>');
    L.firstChild.id = 'deskKeys';
    L.firstChild.setAttribute('aria-labelledby', 'deskKeysTitle');
    L.querySelector('#deskToYourKeys').addEventListener('click', keysEditor);
    L.querySelector('[data-desk-close]').focus();
  }
  // Your keys: click an action, press the key it should have.
  function keysEditor() {
    var waiting = null, note = '';
    function list() {
      return ACTIONS.map(function (a) {
        return (a.group ? '<h3>' + a.group + '</h3>' : '') + '<div class="desk-bind"><span>' + esc(a.label) + '</span><button type="button" data-bind="' + a.id + '"' +
          (waiting === a.id ? ' class="wait">Press a key' : '><kbd>' + esc(show(keyOf(a.id))) + '</kbd>') + '</button></div>';
      }).join('');
    }
    var L = open('<div class="desk-head"><h2 id="deskYourKeysTitle">Your keys</h2><button type="button" class="desk-x" data-desk-close aria-label="Close">×</button></div>' +
      '<p class="desk-text">Click an action, then press the key you want for it. Letters, digits from 7, Space, Enter, Backspace and the arrows can be used; ' +
      '1 to 6 stay with the chips. A key that was in use changes places with the one you replace.</p>' +
      '<div class="desk-scroll" id="deskBinds"></div><p class="desk-text" id="deskBindNote" role="status"></p>' +
      '<div class="desk-row"><button type="button" class="desk-btn" id="deskBindReset">The usual keys</button><button type="button" class="desk-btn gold" data-desk-close>Done</button></div>', function (e) {
      if (!waiting) return false;
      var id = waiting, name = keyName(e), other;
      if (e.key === 'Escape') { waiting = null; note = ''; draw(id); return true; }
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return true;       // on the way to a key
      if (!name) { note = 'That key cannot be used: it belongs to the program or to the chips.'; draw(id); return true; }
      waiting = null;
      other = setKey(id, name);
      note = action(id).label + ' is now ' + show(name) + (other ? ', and ' + other.label.toLowerCase() + ' is now ' + show(keyOf(other.id)) : '') + '.';
      draw(id);
      return true;
    });
    function draw(focus) {
      L.querySelector('#deskBinds').innerHTML = list();
      L.querySelector('#deskBindNote').textContent = note;
      var b = focus && L.querySelector('[data-bind="' + focus + '"]');
      if (b) b.focus();
    }
    L.firstChild.id = 'deskYourKeys';
    L.firstChild.setAttribute('aria-labelledby', 'deskYourKeysTitle');
    L.querySelector('#deskBinds').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bind]');
      if (!b) return;
      waiting = waiting === b.dataset.bind ? null : b.dataset.bind; note = '';
      draw(b.dataset.bind);
    });
    L.querySelector('#deskBindReset').addEventListener('click', function () { waiting = null; resetKeys(); note = 'Every action has its usual key again.'; draw(); });
    draw();
    L.querySelector('[data-desk-close]').focus();
  }
  function ask(title, text, yes, then) {
    var L = open('<div class="desk-head"><h2 id="deskAskTitle">' + esc(title) + '</h2></div><p class="desk-text">' + esc(text) + '</p>' +
      '<div class="desk-row"><button type="button" class="desk-btn" data-desk-close>Cancel</button><button type="button" class="desk-btn gold" id="deskYes">' + esc(yes) + '</button></div>');
    L.firstChild.id = 'deskAsk';
    L.firstChild.setAttribute('aria-labelledby', 'deskAskTitle');
    L.querySelector('#deskYes').addEventListener('click', function () { close(); then(); });
    L.querySelector('[data-desk-close]').focus();
  }

  /* ---------- the keyboard: heard before the page hears it ---------- */
  function typing(e) {
    var t = e.target, tag = t && t.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (t && t.isContentEditable);
  }
  window.addEventListener('keydown', function (e) {
    var k = e.key, low = k.length === 1 ? k.toLowerCase() : k, ctrl = e.ctrlKey || e.metaKey;
    function take(fn) { e.preventDefault(); e.stopPropagation(); fn(); }
    if (passing) return;                          // a key of yours, on its way to the app as the app's own
    if (layer) {                                  // a panel of this layer is open: nothing reaches the game under it
      e.stopPropagation();
      if (onKey && onKey(e) === true) e.preventDefault();          // the panel wanted this key for itself
      else if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'Tab') trapTab(e);
      else if (ctrl && low === 'k') { e.preventDefault(); close(); }
      else if (k === 'F1' || k === 'F11') e.preventDefault();
      return;
    }
    if (k === 'F11') return take(fullscreen);
    if (k === 'F1') return take(keysSheet);
    if (ctrl && !e.altKey) {
      if (low === 'k') return take(palette);
      if (low === 't') return take(function () { pin(); });
      if (low === 'h') return take(function () { go('home'); });
      if (low === '1') return take(function () { go('table'); });
      if (low === '2') return take(function () { go('trainer'); });
      if (k === '+' || k === '=') return take(function () { zoomBy(0.1); });
      if (k === '-' || k === '_') return take(function () { zoomBy(-0.1); });
      if (k === '0') return take(function () { zoomTo(1); });
      return;
    }
    if (e.altKey && !ctrl) {
      if (k === 'Home') return take(function () { go('home'); });
      if (page === 'trainer' && /^[1-8]$/.test(k)) return take(function () { go('trainer', SECTIONS[Number(k) - 1][0]); });
      return;
    }
    if (ctrl || e.altKey || typing(e)) return;
    if (k === '?') return take(keysSheet);
    if (page === 'table' && !sheetOpen()) {
      if (/^[1-6]$/.test(k)) return take(function () { chip(Number(k)); });
    }
    var does = heard(keyName(e));                 // your keys
    if (!does) return;
    if (does.swallow) { e.stopPropagation(); return; }
    if (does.desk) { if (!sheetOpen()) take(function () { deskAct(does.desk); }); return; }
    take(function () { send(does.send); });
  }, true);

  window.Desk = { page: page, run: run, palette: palette, keys: keysSheet, close: close, fullscreen: fullscreen, pin: pin, backup: backup, restore: restore,
    backupText: backupText, parseBackup: parseBackup, keyOf: keyOf, setKey: setKey, resetKeys: resetKeys, yourKeys: keysEditor, get open() { return !!layer; }, get commands() { return CMDS.map(function (c) { return c.id; }); } };
})();
