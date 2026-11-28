/* The play-through of the desktop program, run inside its own window: the start screen, a lesson, a puzzle, an
 * opening line trained from memory, three moves against the computer, a change of style, and the copy of your
 * progress on disk.
 *
 * EighthRank.exe runs this script when it is started with CHESS_SELFTEST=<log file> (see main.go); tests/browser.js
 * does the same in Chromium against frontend/. It reports through window.go.main.SelfTest. With mode 'restart' it
 * only checks that a second launch still has what the first one saved; on Windows the workflow deletes the window's
 * own storage in between, so that what the second launch finds comes from saved.json. */
(async function () {
  'use strict';
  var api = window.go && window.go.main && window.go.main.SelfTest;
  if (window.__selftest || !api) return;
  window.__selftest = true;
  var failed = 0;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function until(fn, ms, what) {
    for (var t0 = Date.now(); ;) {
      var v = false;
      try { v = fn(); } catch (e) { v = false; }
      if (v) return v;
      if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + what);
      await sleep(80);
    }
  }
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function ok(cond, msg) { if (!cond) throw new Error(msg); }
  async function step(name, fn) {
    try { await fn(); await api.Report('  ok  ' + name); }
    catch (e) { failed++; await api.Report('FAIL  ' + name + ': ' + (e && e.message)); }
  }
  try { await until(function () { return window.__er && window.Chess && $('#v-learn').children.length; }, 15000, 'the app'); }
  catch (e) { await api.Report('FAIL  the app did not start: ' + e.message); await api.Done(1); return; }
  var E = window.__er, C = window.Chess, S = E.S;
  var mode = window.__selftestMode || 'full';
  var NAMES = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
  // plays a move on a board the way a person does: the piece, then the square (and the piece to promote to)
  function play(B, m) {
    B.pick(m.from); B.pick(m.to);
    if (!B.promo.hidden) B.promo.querySelector('[aria-label="' + NAMES[m.promo.toLowerCase()] + '"]').click();
  }

  if (mode === 'restart') {
    await step('a second launch still has the level, the lesson, the puzzle, the opening line and the style of the first', async function () {
      ok(S.start === 3 && S.mode === 'fast', 'the level is gone (' + S.start + ', ' + S.mode + ')');
      ok(S.done.fork, 'the finished lesson is gone');
      ok(Object.keys(S.solved).length >= 1, 'the solved puzzle is gone');
      ok(S.lines['italian:0'] >= 1, 'the trained opening line is gone');
      ok(S.skin === 'walnut' && document.documentElement.getAttribute('data-skin') === 'walnut', 'the style is gone (' + S.skin + ')');
      ok($('.hero') && !$('.setup'), 'the start screen is shown again');
      if (window.DeskStore) await api.Report('      restored ' + window.DeskStore.restored + ' entries from saved.json');
    });
    await api.Done(failed);
    return;
  }

  await step('the app opens on its start screen with its own typefaces and nothing from the network', async function () {
    ok(document.title === 'Eighth Rank', 'title is ' + document.title);
    ok($('.setup') && $$('#lv .card').length === 6, 'the start screen with six levels is not shown');
    await document.fonts.ready;
    await until(function () { return Array.from(document.fonts).some(function (f) { return f.family.replace(/"/g, '') === 'Instrument Sans' && f.status === 'loaded'; }); }, 5000, 'the bundled text font');
    var outside = performance.getEntriesByType('resource').map(function (r) { return r.name; })
      .filter(function (u) { return u.indexOf(location.origin) !== 0 && !/^(data|blob):/.test(u); });
    ok(!outside.length, 'asked the network for ' + outside.join(', '));
    await api.Report('      ' + innerWidth + 'x' + innerHeight + ', ' + navigator.userAgent);
  });

  await step('the start screen: choose a level and a path, and the course opens from there', async function () {
    $('#lv [data-start="3"]').click();
    $('#pm [data-mode="fast"]').click();
    $('#begin').click();
    await until(function () { return $('.hero'); }, 3000, 'the course page');
    ok(S.start === 3 && S.rating === 600, 'level ' + S.start + ', rating ' + S.rating);
    ok($$('.lesson').length === 49, $$('.lesson').length + ' lessons listed');
    ok($$('.unit.skipped').length === 1, 'rank 2 is not marked as skipped');
  });

  await step('a lesson: three forks found on the board, and it is marked finished', async function () {
    E.Learn.open('fork');
    var B = E.Learn.board, moves = [null, ['d5', 'c7'], ['b5', 'd6'], ['d3', 'd4']];
    for (var k = 0; k < moves.length; k++) {
      if (moves[k]) { B.pick(C.idx(moves[k][0])); B.pick(C.idx(moves[k][1])); }
      await until(function () { return !$('#v-learn #next').hidden; }, 3000, 'Continue after step ' + (k + 1));
      $('#v-learn #next').click();
    }
    ok(S.done.fork, 'not marked finished');
    await until(function () { return Array.from(document.fonts).some(function (f) { return f.family.replace(/"/g, '') === 'Noto Sans Symbols 2' && f.status === 'loaded'; }); }, 5000, 'the bundled chess pieces');
    var main = $('#main');
    ok(innerHeight < 300 || main.scrollHeight <= main.clientHeight + 1, 'the lesson does not fit the window without scrolling');
  });

  await step('a puzzle: solved on the board, and the rating moves', async function () {
    location.hash = '#puzzles';
    await until(function () { return E.Puz.p && !E.Puz.busy; }, 3000, 'a puzzle');
    var before = S.rating;
    for (var n = 0; n < 3 && !E.Puz.over; n++) {
      await until(function () { return !E.Puz.busy; }, 3000, 'the reply');
      play(E.Puz.board, E.Puz.answer());
      await sleep(120);
    }
    ok(E.Puz.over, 'the puzzle was not solved');
    ok(Object.keys(S.solved).length === 1 && S.rating > before, 'solved ' + Object.keys(S.solved).length + ', rating ' + before + ' to ' + S.rating);
    ok(window.PUZZLES.length >= 200, window.PUZZLES.length + ' puzzles');
  });

  await step('an opening line trained from memory, and its first dot is filled', async function () {
    location.hash = '#openings';
    await until(function () { return E.Open.board; }, 3000, 'the openings');
    ok(window.OPENINGS.length === 12, window.OPENINGS.length + ' openings');
    E.Open.open('italian');
    ok($$('#v-openings [data-line]').length === 5, 'the Italian does not list five lines');
    E.Open.train(0);
    var line = E.Open.cur.lines[0].moves;
    for (var n = 0; n < 40 && !E.Open.over; n++) {
      await until(function () { return E.Open.over || E.Open.board.moves; }, 5000, 'your turn in the line');
      if (E.Open.over) break;
      var st = E.Open.at(E.Open.path);
      play(E.Open.board, C.fromSAN(st.s, line[E.Open.path.length]));
      await sleep(60);
    }
    ok(E.Open.over && S.lines['italian:0'] === 1, 'the line was not completed cleanly');
  });

  await step('three moves against the computer, each rated by the coach', async function () {
    location.hash = '#play';
    await until(function () { return E.Play.board && E.Play.s; }, 3000, 'the board');
    for (var k = 0; k < 3; k++) {
      await until(function () { return !E.Play.busy && E.Play.s.turn === S.color; }, 20000, 'your turn');
      play(E.Play.board, C.best(E.Play.s, 2).move);
      ok(E.Play.verdict && E.Play.verdict.label, 'the coach said nothing');
    }
    await until(function () { return E.Play.hist.length >= 6; }, 20000, 'the computer\'s third reply');
    ok($$('#sheet span').length >= 9, 'the moves are not written down');
  });

  await step('a style is chosen and kept', async function () {
    $('#skinbtn').click();
    ok($$('#skins .swatch').length === 4, 'the four styles are not offered');
    $('#skins [data-skin="walnut"]').click();
    ok(document.documentElement.getAttribute('data-skin') === 'walnut' && S.skin === 'walnut', 'the style did not change');
    document.body.click();
    await document.fonts.ready;
    location.hash = '#learn';
    await until(function () { return !$('#v-learn').hidden; }, 2000, 'the course page');
    if (E.Learn.cur) $('#v-learn #back').click();
    ok($('.hero'), 'the course page is not shown');
  });

  await step('your progress is written to the program\'s own file', async function () {
    ok(JSON.parse(localStorage.getItem('eighth-rank-v1')).done.fork, 'the window\'s storage does not have the lesson');
    if (!window.__deskRun) { await api.Report('      (a browser: there is no program to keep a file)'); return; }
    ok(window.DeskStore, 'keep.js is missing');
    ok(await window.DeskStore.flush(), 'saved.json was not written');
  });

  await api.Done(failed);
})();
