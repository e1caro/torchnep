/* Journey logic: missions, their steps and derived progress, test-out and chapter boss cases. No DOM. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var J = (DA.journey = {});

  J.BITS = { brief: 1, learn: 2, tested: 4 };
  J.STEPS = ['brief', 'learn', 'try', 'check', 'debrief'];
  J.NAMES = { brief: 'Brief', learn: 'Learn', try: 'Try', check: 'Check', debrief: 'Debrief' };
  J.TARGETS = 3;

  function S() { return ui.state; }
  function L() { return DA.labgame; }

  J.parse = function (spec) {
    var out = [];
    String(spec || '').split(';').forEach(function (part) {
      var w = part.trim().split(/\s+/).filter(Boolean);
      for (var i = 1; i < w.length; i++) out.push({ lab: w[0], key: w[i] });
    });
    return out;
  };
  J.resolve = function (refs) {
    return refs.map(function (r) { return { lab: r.lab, key: r.key, level: L() ? L().level(r.lab, r.key) : null }; });
  };

  var cache = {};
  J.mission = function (id) {
    if (cache[id]) return cache[id];
    var l = DA.lessonById[id];
    if (!l) return null;
    var d = (DA.missionData || {})[id] || {};
    var levels = J.resolve(J.parse(d.try));
    var m = { id: id, lesson: l, who: DA.cast[d.who] || DA.cast.dot, brief: d.brief || l.why, levels: levels, targets: levels.slice(0, J.TARGETS), more: levels.slice(J.TARGETS) };
    m.steps = J.STEPS.filter(function (s) { return s !== 'try' || levels.length; });
    return (cache[id] = m);
  };

  J.levelInfo = function (ref) {
    var solved = 0, best = 0, first = null;
    (ref.level ? ref.level.challenges : []).forEach(function (c) {
      var k = L().stars(ref.lab, c.id);
      if (k) solved++;
      if (k > best) best = k;
      if (!k && !first) first = c;
    });
    var all = ref.level ? ref.level.challenges : [];
    return { solved: solved, total: all.length, best: best, next: first || all[0] || null };
  };
  J.tryState = function (id) {
    var m = J.mission(id), targets = m.targets.map(function (r) { return { ref: r, info: J.levelInfo(r) }; });
    var hit = targets.filter(function (t) { return t.info.solved > 0; }).length;
    return { targets: targets, hit: hit, total: targets.length, done: targets.length > 0 && hit === targets.length };
  };
  J.stars = function (id) {
    var t = J.tryState(id);
    if (!t.total) return 0;
    return Math.floor(t.targets.reduce(function (a, x) { return a + x.info.best; }, 0) / t.total);
  };
  J.embedIds = function (refs) {
    var ids = {};
    refs.forEach(function (r) { (r.level ? r.level.challenges : []).forEach(function (c) { ids[r.lab + ':' + c.id] = true; }); });
    return ids;
  };
  J.challenges = function (refs) {
    var out = [];
    refs.forEach(function (r) { (r.level ? r.level.challenges : []).forEach(function (c) { out.push({ lab: r.lab, c: c }); }); });
    return out;
  };

  function bits(id) { return S().journey[id] || 0; }
  J.stepDone = function (id, step) {
    var done = !!S().done[id];
    if (step === 'brief') return done || !!(bits(id) & J.BITS.brief);
    if (step === 'learn') return done || !!(bits(id) & J.BITS.learn);
    if (step === 'try') return J.tryState(id).done;
    if (step === 'check') return !!S().quiz[id];
    return done;
  };
  J.currentStep = function (id) {
    var m = J.mission(id);
    for (var i = 0; i < m.steps.length; i++) if (!J.stepDone(id, m.steps[i])) return m.steps[i];
    return 'debrief';
  };
  J.progress = function (id) {
    var m = J.mission(id), n = m.steps.filter(function (s) { return J.stepDone(id, s); }).length;
    return { done: n, total: m.steps.length, step: J.currentStep(id), index: m.steps.indexOf(J.currentStep(id)) + 1 };
  };
  J.mark = function (id, bit) {
    if (!DA.lessonById[id] || (bits(id) & bit)) return;
    S().journey[id] = bits(id) | bit;
    ui.save();
  };
  J.tested = function (id) { return !!(bits(id) & J.BITS.tested); };

  J.current = function () {
    var l = ui.nextLesson();
    if (!l) return null;
    var p = J.progress(l.id);
    return { lesson: l, step: p.step, index: p.index, total: p.total };
  };

  J.complete = function (id, on) {
    var l = DA.lessonById[id], G = DA.game;
    if (!l) return 0;
    if (!on) { delete S().done[id]; ui.save(); G.touch(); return 0; }
    S().done[id] = true;
    ui.save();
    var xp = G.award('lesson:' + id, ui.XP.lesson(l), 'Mission complete');
    G.quest('lesson');
    G.touch();
    return xp;
  };

  function bankQ(id) { return DA.drill.byId(id); }
  J.checkQuestions = function (id, extra) {
    var l = DA.lessonById[id], own = bankQ('l:' + id);
    var others = DA.drill.pick(extra + 6, l.module.cat).filter(function (q) { return q.id !== own.id; }).slice(0, extra);
    return [own].concat(others);
  };
  J.answer = function (q, sel) {
    var st = S().stats, ok = sel === q.answer;
    st.answers++;
    if (ok) st.correct++;
    DA.drill.record(q.id, ok);
    if (q.lesson) {
      var prev = S().quiz[q.lesson.id];
      if (!(prev && prev.ok)) S().quiz[q.lesson.id] = { sel: sel, ok: ok };
      if (ok) DA.game.award('quiz:' + q.lesson.id, ui.XP.quiz, 'Quiz correct');
    }
    ui.save();
    return ok;
  };
  J.testOut = function (id, allRight) {
    if (!allRight) return 0;
    J.mark(id, J.BITS.tested);
    return J.complete(id, true);
  };

  /* ================================================================ boss cases */

  J.boss = function (mid) {
    var m = DA.modules.filter(function (x) { return x.id === mid; })[0];
    if (!m) return null;
    var d = (DA.bossData || {})[mid] || {};
    var levels = J.resolve(J.parse(d.try));
    var qids = d.q || (function () {
      var ls = m.lessons, n = Math.min(5, ls.length), out = [];
      for (var i = 0; i < n; i++) out.push('l:' + ls[Math.floor(i * ls.length / n)].id);
      return out;
    })();
    var labDone = levels.every(function (r) { return J.levelInfo(r).solved > 0; });
    return { id: mid, module: m, icon: d.icon || '🏆', title: d.title || m.title, who: DA.cast[d.who] || DA.cast.dot, brief: d.brief || m.goal,
      levels: levels, questions: qids, labDone: labDone, stars: S().bosses[mid] || 0, won: !!S().xp['module:' + mid] };
  };
  J.bossStars = function (correct, total) {
    var p = total ? correct / total : 0;
    return p >= 1 ? 3 : p >= 0.8 ? 2 : p >= 0.6 ? 1 : 0;
  };
  J.checkBoss = function (mid) {
    var b = J.boss(mid);
    if (!b || b.won || !b.stars || !b.labDone) return 0;
    return DA.game.award('module:' + mid, ui.XP.module, 'Boss case won: ' + b.title);
  };
  J.bossResult = function (mid, correct, total) {
    var stars = J.bossStars(correct, total);
    if (stars > (S().bosses[mid] || 0)) { S().bosses[mid] = stars; ui.save(); }
    return { stars: stars, xp: stars ? J.checkBoss(mid) : 0, boss: J.boss(mid) };
  };

  J.chapter = function (m) {
    var done = m.lessons.filter(function (l) { return S().done[l.id]; }).length;
    var next = ui.nextLesson();
    return { done: done, total: m.lessons.length, complete: done === m.lessons.length, current: !!next && next.module === m, boss: J.boss(m.id) };
  };

  J.mapped = function () {
    var out = [];
    DA.lessons.forEach(function (l) { J.mission(l.id).levels.forEach(function (r) { out.push({ owner: l.id, lab: r.lab, key: r.key, level: r.level }); }); });
    DA.modules.forEach(function (m) { J.boss(m.id).levels.forEach(function (r) { out.push({ owner: 'boss:' + m.id, lab: r.lab, key: r.key, level: r.level }); }); });
    return out;
  };
})();
