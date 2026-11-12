/* Practice logic: the question bank, picking questions, and spaced repetition (Leitner boxes).
 * No DOM in here, so it is unit-tested in Node. The round screen is in drill.js.
 *
 * Review schedule: a question you answer correctly moves up a box and comes back after
 * 1, 3, 7, 14, then 30 days. A wrong answer sends it back to box 1, due today.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var D = (DA.drill = {});

  D.INTERVALS = [0, 1, 3, 7, 14, 30]; // days until the next review, indexed by box
  D.ROUND = 5;
  D.rand = Math.random; // replaceable in tests

  var cache = null;
  D.bank = function () {
    if (cache) return cache;
    cache = [];
    DA.lessons.forEach(function (l) {
      cache.push({ id: 'l:' + l.id, cat: l.module.cat, q: l.quiz.q, code: '', options: l.quiz.options.slice(), answer: l.quiz.answer, why: l.quiz.why, lesson: l });
    });
    (DA.extraQuestions || []).forEach(function (x) { cache.push(x); });
    return cache;
  };
  D.byId = function (id) { return D.bank().filter(function (q) { return q.id === id; })[0] || null; };

  D.topics = function () {
    var order = ['SQL', 'Python', 'Statistics', 'Spreadsheets', 'Visualization', 'AI workflow', 'Career', 'Learning', 'Portfolio'], seen = {};
    D.bank().forEach(function (q) { seen[q.cat] = true; });
    return order.filter(function (c) { return seen[c]; });
  };

  D.shuffle = function (arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(D.rand() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  // Returns the options in a fresh random order, with the index of the right one.
  D.shuffled = function (q) {
    var idx = D.shuffle(q.options.map(function (_, i) { return i; }));
    return { options: idx.map(function (i) { return q.options[i]; }), answer: idx.indexOf(q.answer) };
  };

  function inCat(cat) { return D.bank().filter(function (q) { return !cat || q.cat === cat; }); }

  D.dueList = function (cat) {
    var today = ui.today(), s = ui.state.srs;
    return inCat(cat).filter(function (q) { return s[q.id] && s[q.id].due <= today; });
  };
  D.dueCount = function (cat) { return D.dueList(cat).length; };

  // Categories the learner is working in: modules with finished lessons, plus the module of the next lesson.
  function focusCats() {
    var f = { Learning: true }, nx = ui.nextLesson();
    DA.modules.forEach(function (m) { if (m.lessons.some(function (l) { return ui.state.done[l.id]; })) f[m.cat] = true; });
    if (nx) f[nx.module.cat] = true;
    return f;
  }

  // Priority: due for review, then unseen questions from topics you are studying, then other unseen, then the weakest "learning" ones.
  D.pick = function (n, cat) {
    var today = ui.today(), s = ui.state.srs, pool = inCat(cat), out = [], used = {};
    function take(list) { list.forEach(function (q) { if (out.length < n && !used[q.id]) { used[q.id] = true; out.push(q); } }); }
    take(D.shuffle(D.dueList(cat)));
    if (out.length < n) {
      var f = focusCats();
      take(D.shuffle(pool.filter(function (q) { return !s[q.id]; })).sort(function (a, b) { return (f[b.cat] ? 1 : 0) - (f[a.cat] ? 1 : 0); }));
    }
    if (out.length < n) {
      take(D.shuffle(pool.filter(function (q) { return s[q.id]; })).sort(function (a, b) { return s[a.id].box - s[b.id].box || (s[a.id].due < s[b.id].due ? -1 : 1); }));
    }
    return D.shuffle(out);
  };

  // Records the FIRST answer to a question in a round.
  D.record = function (id, ok) {
    var s = ui.state.srs, today = ui.today(), r = s[id] || { box: 0 };
    if (ok) {
      var box = Math.min(5, r.box + 1);
      s[id] = { box: box, due: ui.addDays(today, D.INTERVALS[box]), t: ui.now().getTime() };
    } else {
      s[id] = { box: 1, due: today, t: ui.now().getTime() };
    }
    return s[id];
  };

  D.mastery = function (cat) {
    var s = ui.state.srs, qs = inCat(cat);
    return { mastered: qs.filter(function (q) { return s[q.id] && s[q.id].box >= 3; }).length, seen: qs.filter(function (q) { return s[q.id]; }).length, total: qs.length };
  };

  // XP for a correct first answer: 8, then more for a longer combo (3 in a row pays 10, up to 16).
  D.xpFor = function (combo) { return 8 + Math.max(0, Math.min(4, combo - 2)) * 2; };
  D.PERFECT_BONUS = 10;
})();
