/* The desktop layer, added to the home screen and to both apps inside the program: what a PC adds to them.
 *
 *   links      each app has a way to the other and back to the home screen
 *   commands   Ctrl+K lists everything that can be done from the keyboard, F1 the keys of the page you are on
 *   window     F11 full screen, Ctrl+T keeps the window above the others
 *   table      1 to 6 put a chip from the tray on the bet, M opens the menu, T the statistics, K shows the count
 *   trainer    Alt+1 to Alt+8 go to its sections
 *   backups    every saved game to one file, and back
 *
 * The two apps themselves are not changed: the table's own controls are pressed for it. What this layer remembers
 * (the app opened last, the pin) is kept under 'desk.v1'. Inside the program the window is reached through the Wails
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
      '<p class="keys"><kbd>1</kbd>–<kbd>6</kbd> chips · <kbd>M</kbd> this menu · <kbd>T</kbd> statistics · <kbd>K</kbd> the count · ' +
      '<kbd>F11</kbd> full screen · <kbd>Ctrl</kbd>+<kbd>K</kbd> every command · <kbd>F1</kbd> all keys</p></div>'));
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

  /* ---------- commands ---------- */
  var CMDS = [
    { id: 'table', title: 'Blackjack table', keys: 'Ctrl 1', run: function () { go('table'); } },
    { id: 'trainer', title: 'Hi-Lo trainer', keys: 'Ctrl 2', run: function () { go('trainer'); } },
    { id: 'home', title: 'Home screen', keys: 'Ctrl H', run: function () { go('home'); } }
  ];
  if (page === 'table') {
    CMDS.push(
      { id: 'menu', title: 'Table: menu, rules and settings', keys: 'M', run: function () { press('menuBtn'); } },
      { id: 'stats', title: 'Table: statistics of this session', keys: 'T', run: function () { press('statsBtn'); } },
      { id: 'count', title: 'Table: show or hide the card count', keys: 'K', run: function () { pref('count', 'The card count is shown', 'The card count is hidden'); } },
      { id: 'hints', title: 'Table: basic strategy hints on or off', run: function () { pref('hints', 'Basic strategy hints are on', 'Basic strategy hints are off'); } },
      { id: 'sound', title: 'Table: sound on or off', run: function () { pref('sound', 'Sound is on', 'Sound is off'); } });
  }
  SECTIONS.forEach(function (s, i) {
    CMDS.push({ id: 'sec-' + s[0], title: 'Trainer: ' + s[1], keys: page === 'trainer' ? 'Alt ' + (i + 1) : '', run: function () { go('trainer', s[0]); } });
  });
  CMDS.push(
    { id: 'fullscreen', title: 'Full screen, or back to a window', keys: 'F11', run: fullscreen },
    { id: 'pin', title: 'Keep the window on top of the others, or let go', keys: 'Ctrl T', run: function () { pin(); } },
    { id: 'keys', title: 'Keyboard shortcuts of this page', keys: 'F1', run: keysSheet },
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
        return '<li role="option" data-i="' + i + '" data-cmd="' + c.id + '" aria-selected="' + (i === sel) + '"><span>' + esc(c.title) + '</span><span class="desk-k">' + kbd(c.keys) + '</span></li>';
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

  var PAGE_KEYS = {
    home: ['On the home screen', [['1', 'Blackjack table'], ['2', 'Hi-Lo trainer'], ['Enter', 'carry on where you were'], ['← →', 'from one door to the other']]],
    table: ['At the blackjack table', [['1 – 6', 'put a chip from the tray on the bet'], ['Enter', 'deal, bet the same again, next round'], ['Backspace', 'take the bet back'],
      ['H', 'hit'], ['S', 'stand'], ['D', 'double'], ['P', 'split'], ['R', 'surrender'], ['Y N', 'insurance, yes or no'], ['C', 'change the bet after a round'],
      ['M', 'menu, rules and settings'], ['T', 'statistics'], ['K', 'show or hide the card count'], ['Esc', 'close a panel']]],
    trainer: ['In the Hi-Lo trainer', [['H S D P', 'hit, stand, double, split in the drills and at the practice table'], ['Y N', 'insurance, or whether to leave the chart'],
      ['Space', 'next card in the running count'], ['Alt 1 – 8', 'the sections, from the plan to the rules']]]
  };
  var EVERYWHERE = [['Ctrl K', 'every command, by name'], ['F1', 'this list'], ['F11', 'full screen'], ['Ctrl T', 'keep the window on top'],
    ['Ctrl 1', 'Blackjack table'], ['Ctrl 2', 'Hi-Lo trainer'], ['Ctrl H', 'home screen'], ['Ctrl + − 0', 'bigger, smaller, normal size (also Ctrl and the mouse wheel)']];
  function rows(list) { return list.map(function (r) { return '<dt>' + kbd(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join(''); }
  function keysSheet() {
    var p = PAGE_KEYS[page];
    var L = open('<div class="desk-head"><h2 id="deskKeysTitle">Keyboard</h2><button type="button" class="desk-x" data-desk-close aria-label="Close">×</button></div>' +
      '<div class="desk-scroll"><h3>' + p[0] + '</h3><dl class="desk-keys">' + rows(p[1]) + '</dl>' +
      '<h3>Everywhere</h3><dl class="desk-keys">' + rows(EVERYWHERE) + '</dl></div>');
    L.firstChild.id = 'deskKeys';
    L.firstChild.setAttribute('aria-labelledby', 'deskKeysTitle');
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
    if (layer) {                                  // a panel of this layer is open: nothing reaches the game under it
      e.stopPropagation();
      if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'Tab') trapTab(e);
      else if (ctrl && low === 'k') { e.preventDefault(); close(); }
      else if (k === 'F1' || k === 'F11') e.preventDefault();
      else if (onKey) onKey(e);
      return;
    }
    if (k === 'F11') return take(fullscreen);
    if (k === 'F1') return take(keysSheet);
    if (ctrl && !e.altKey && !e.shiftKey) {
      if (low === 'k') return take(palette);
      if (low === 't') return take(function () { pin(); });
      if (low === 'h') return take(function () { go('home'); });
      if (low === '1') return take(function () { go('table'); });
      if (low === '2') return take(function () { go('trainer'); });
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
      if (low === 'm') return take(function () { press('menuBtn'); });
      if (low === 't') return take(function () { press('statsBtn'); });
      if (low === 'k') return take(function () { run('count'); });
    }
  }, true);

  window.Desk = { page: page, run: run, palette: palette, keys: keysSheet, close: close, fullscreen: fullscreen, pin: pin, backup: backup, restore: restore,
    backupText: backupText, parseBackup: parseBackup, get open() { return !!layer; }, get commands() { return CMDS.map(function (c) { return c.id; }); } };
})();
