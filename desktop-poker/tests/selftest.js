/* The play-through of the desktop program, run inside its own window: the lesson path, a lesson and its check, a
 * drill, the charts and the equity calculator, three hands at the table played the coach's way, and the copy of your
 * progress on disk.
 *
 * PokerCoach.exe runs this script when it is started with POKER_SELFTEST=<log file> (see main.go); tests/browser.js
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
  try { await until(function () { return window.PokerApp && $('#view').children.length; }, 15000, 'the app'); }
  catch (e) { await api.Report('FAIL  the app did not start: ' + e.message); await api.Done(1); return; }
  var A = window.PokerApp, PK = A.PK;
  var mode = window.__selftestMode || 'full';

  if (mode === 'restart') {
    await step('a second launch still has the lesson, the drill and the hands of the first', async function () {
      var P = A.progress;
      ok(P.lessons.hands && P.lessons.hands.done, 'the finished lesson is gone');
      ok(P.drills.showdown && P.drills.showdown.best >= 3, 'the drill record is gone');
      ok(P.stats.hands >= 3, 'the hands played are gone (' + P.stats.hands + ')');
      ok(A.state && A.state.handNo >= 3, 'the table is gone');
      ok(JSON.parse(localStorage.getItem('poker.hands.v1') || '[]').length >= 3, 'the hand history is gone');
      if (window.DeskStore) await api.Report('      restored ' + window.DeskStore.restored + ' entries from saved.json');
    });
    await api.Done(failed);
    return;
  }

  await step('the app opens with its own typeface and nothing from the network', async function () {
    ok(document.title === 'Poker Coach', 'title is ' + document.title);
    await document.fonts.ready;
    ok(Array.from(document.fonts).some(function (f) { return f.family.replace(/"/g, '') === 'Archivo' && f.status === 'loaded'; }), 'the bundled font did not load');
    var outside = performance.getEntriesByType('resource').map(function (r) { return r.name; })
      .filter(function (u) { return u.indexOf(location.origin) !== 0 && !/^(data|blob):/.test(u); });
    ok(!outside.length, 'asked the network for ' + outside.join(', '));
    ok($$('.path li').length === 15, 'the fifteen lessons are not listed');
    await api.Report('      ' + innerWidth + 'x' + innerHeight + ', ' + navigator.userAgent);
  });

  await step('a lesson: read it, answer its check, and it is marked finished', async function () {
    A.go('lesson', 'hands');
    await until(function () { return $$('#quiz .q').length === 3; }, 3000, 'the check');
    window.PKL.LESSONS[0].quiz.forEach(function (q, k) { $('[data-quiz="' + k + '"][data-opt="' + q.answer + '"]').click(); });
    await until(function () { return !$('#quizEnd').hidden; }, 3000, 'the result');
    ok(/3 of 3 right/.test($('#quizEnd').textContent), $('#quizEnd').textContent);
    ok(A.progress.lessons.hands.done, 'not marked finished');
  });

  await step('a drill: three right answers in a row', async function () {
    A.go('drill', 'showdown');
    for (var k = 0; k < 3; k++) {
      $('#dq .opt[data-ans="' + A.drill.q.answer + '"]').click();
      await until(function () { return $('#nextQ'); }, 3000, 'the answer');
      ok($('.verdict.good'), 'the right answer was not taken as right');
      $('#nextQ').click();
      await sleep(50);
    }
    ok(A.progress.drills.showdown.streak === 3, 'streak ' + A.progress.drills.showdown.streak);
  });

  await step('the charts and the equity calculator: aces against kings', async function () {
    A.go('chart', 'open.UTG');
    ok($$('.grid i').length === 169, 'the grid is not 13 by 13');
    ok($$('.grid i.r').length === PK.CHARTS['open.UTG'].raise.size, 'the grid does not match the chart');
    A.go('equity');
    ['As', 'Ah', 'Kd', 'Kc'].forEach(function (c) { $('[data-pick="' + PK.parseCard(c) + '"]').click(); });
    await until(function () { return !$('#eqRun').disabled; }, 2000, 'the calculator to be ready');
    $('#eqRun').click();
    await until(function () { return /You: \d/.test($('.eq-res').textContent); }, 10000, 'the result');
    var e = parseFloat(/You: ([\d.]+)%/.exec($('.eq-res').textContent)[1]);
    ok(e > 80.5 && e < 83.5, 'aces against kings: ' + e + '%');
  });

  await step('three hands at the table, playing the coach\'s way', async function () {
    A.progress.settings.speed = 'fast';
    A.go('play');
    var start = A.progress.stats.hands;
    for (var h = 0; h < 3; h++) {
      await until(function () { return $('#deal') || $('#rebuy'); }, 20000, 'the deal button');
      if ($('#rebuy')) { $('#rebuy').click(); await sleep(50); }
      $('#deal').click();
      for (var n = 0; n < 80; n++) {
        await until(function () { var T = A.state; return T.street === 'done' || (T.toAct === 0 && $('[data-act]')); }, 30000, 'your turn or the end of the hand');
        if (A.state.street === 'done') break;
        var want = A.advice ? A.advice.action : 'check';
        var sel = want === 'raise' || want === 'bet' ? '[data-act="raise"]' : want === 'fold' ? '[data-act="fold"]' : '[data-act="check"], [data-act="call"]';
        ($(sel) || $('[data-act="check"], [data-act="call"]')).click();
        await sleep(30);
      }
      ok(A.state.street === 'done', 'the hand did not end');
    }
    ok(A.progress.stats.hands === start + 3, 'hands counted: ' + (A.progress.stats.hands - start));
    $('#reviewLast').click();
    await until(function () { return $('.sheet-card.review'); }, 2000, 'the hand review');
    $('#closeSheet').click();
  });

  await step('your progress is written to the program\'s own file', async function () {
    if (!window.__deskRun) { await api.Report('      (a browser: there is no program to keep a file)'); return; }
    ok(window.DeskStore, 'keep.js is missing');
    ok(await window.DeskStore.flush(), 'saved.json was not written');
  });

  await api.Done(failed);
})();
