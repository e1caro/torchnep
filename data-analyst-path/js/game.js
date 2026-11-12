/* Game layer: XP, levels, streaks, daily goal and quests, badges, celebrations.
 *
 * Design rules (so that it motivates without manipulating):
 *  - Everything is earned by learning, and every award has a unique key, so nothing can be farmed.
 *  - Streaks have freezes (one earned per 7 days, max 2): one bad day does not wipe out weeks of work.
 *  - No countdown timers, no guilt messages, no punishments. Reminders are opt-in and neutral.
 *  - Streaks are derived from the per-day "goal met" records, so two devices can be merged exactly.
 * The pure logic (no DOM) runs under Node for the tests; the UI parts do nothing without a document.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var G = (DA.game = {});

  function hasDom() { return typeof document !== 'undefined' && !!document.body; }
  function S() { return ui.state; }
  function count(o, fn) { var n = 0; Object.keys(o).forEach(function (k) { if (!fn || fn(o[k], k)) n++; }); return n; }

  /* ================================================================ XP and levels */

  G.totalXp = function () {
    var t = 0, x = S().xp;
    Object.keys(x).forEach(function (k) { t += x[k].n; });
    return t;
  };
  G.dayXp = function (d) {
    var t = 0, x = S().xp;
    Object.keys(x).forEach(function (k) { if (x[k].d === d) t += x[k].n; });
    return t;
  };
  G.goal = function () { return S().profile.dailyGoal; };

  // XP needed to reach level L. Early levels come fast (100, 250, 450, 700, ...), later ones take longer.
  G.xpFor = function (L) { return 25 * (L - 1) * (L + 2); };
  G.level = function (xp) { var L = 1; while (xp >= G.xpFor(L + 1)) L++; return L; };

  var TITLES = [[1, 'Curious Beginner'], [2, 'Spreadsheet Tinkerer'], [3, 'Pivot Apprentice'], [4, 'Query Cadet'], [5, 'Join Wrangler'],
    [6, 'Data Cleaner'], [7, 'Stats Explorer'], [8, 'Chart Crafter'], [9, 'Insight Hunter'], [10, 'Junior Analyst'],
    [13, 'Dashboard Builder'], [16, 'Storyteller'], [20, 'Insight Architect'], [25, 'Data Legend']];
  G.title = function (L) { var t = TITLES[0][1]; TITLES.forEach(function (r) { if (L >= r[0]) t = r[1]; }); return t; };
  G.levelInfo = function (xp) {
    xp = xp === undefined ? G.totalXp() : xp;
    var L = G.level(xp), lo = G.xpFor(L), hi = G.xpFor(L + 1);
    return { level: L, title: G.title(L), into: xp - lo, span: hi - lo, pct: 100 * (xp - lo) / (hi - lo), next: hi - xp, xp: xp };
  };

  /* ================================================================ streak (derived) */

  // A day counts when its XP goal was reached. One freeze is earned each time the streak hits a multiple
  // of 7 (max 2 held); a freeze silently covers a missed day. A "repaired" day (see repairOffer) does not
  // count as missed. Pure function of S().met and S().repaired, so two devices merge exactly.
  function missedDays(a, b) { // whole days strictly between a and b that were neither met nor repaired
    var gap = ui.diffDays(a, b) - 1, n = 0, i;
    if (gap <= 0) return 0;
    if (gap > 14) return gap;
    for (i = 1; i <= gap; i++) if (!S().repaired[ui.addDays(a, i)]) n++;
    return n;
  }
  function calcStreak(days, today) { // days: sorted goal days, none after `today`
    var count = 0, best = 0, freezes = 0, prev = null;
    days.forEach(function (d) {
      if (prev === null) count = 1;
      else {
        var gap = missedDays(prev, d);
        if (gap <= 0) count++;
        else if (freezes >= gap) { freezes -= gap; count++; }
        else count = 1;
      }
      if (count % 7 === 0) freezes = Math.min(2, freezes + 1);
      if (count > best) best = count;
      prev = d;
    });
    var cur = count, atRisk = false;
    if (prev === null) cur = 0;
    else if (prev !== today) {
      var missed = missedDays(prev, today); // whole days since the last goal day, today excluded
      if (missed <= 0 || freezes >= missed) atRisk = true; // still alive; today's goal keeps it going
      else cur = 0;
    }
    return { count: cur, best: Math.max(best, cur), freezes: freezes, metToday: prev === today, atRisk: atRisk, last: prev };
  }
  G.streak = function (asOf) {
    var today = asOf || ui.today();
    return calcStreak(Object.keys(S().met).filter(function (d) { return d <= today; }).sort(), today);
  };
  // 0: under a week, 1: a week or more, 2: a month or more, 3: a hundred days or more (the flame changes colour)
  G.flameTier = function (n) { return n >= 100 ? 3 : n >= 30 ? 2 : n >= 7 ? 1 : 0; };

  // Streak repair: losing a long streak to ONE missed day makes people quit ("nothing left to lose"), so the
  // day after a miss you can win it back by earning twice your daily goal. Only when no freeze covered the miss,
  // only for a run of 3 days or more, and only on the very next day.
  G.repairOffer = function () {
    var s = S(), today = ui.today(), y = ui.addDays(today, -1), before = ui.addDays(today, -2);
    if (s.met[y] || s.repaired[y]) return null;
    var days = Object.keys(s.met).filter(function (d) { return d < today; }).sort();
    if (!days.length || days[days.length - 1] !== before) return null;
    var was = calcStreak(days, before), now = calcStreak(days, today);
    if (now.count > 0 || was.count < 3) return null;
    var need = 2 * G.goal(), have = G.dayXp(today);
    return { streak: was.count, need: need, have: have, left: Math.max(0, need - have), day: y };
  };

  /* ================================================================ daily quests */

  G.quests = function () {
    var q = S().quests[ui.today()] || {};
    return { lesson: !!q.lesson, drill: !!q.drill, sql: !!q.sql, chest: q.chest || 0, all: !!(q.lesson && q.drill && q.sql) };
  };

  // name: 'lesson' (finish a lesson, a quiz or a note), 'drill' (finish a practice round), 'sql' (solve a challenge)
  G.quest = function (name) {
    var d = ui.today(), s = S(), lvBefore = G.level(G.totalXp());
    var q = s.quests[d] || (s.quests[d] = {});
    if (q[name]) return;
    q[name] = true;
    if (q.lesson && q.drill && q.sql && !q.chest) {
      q.chest = 15 + Math.floor(Math.random() * 26); // a small surprise: 15 to 40 bonus XP
      s.xp['chest:' + d] = { d: d, n: q.chest };
      s.stats.questsAll++;
      s.boost = ui.now().getTime() + G.BOOST_MS; // and everything pays double for a while
      queue({ type: 'chest', xp: q.chest });
    }
    finish(lvBefore);
  };

  /* ================================================================ stats */

  G.bump = function (name, by) { S().stats[name] = (S().stats[name] || 0) + (by === undefined ? 1 : by); finish(G.level(G.totalXp())); };
  G.max = function (name, v) { if (v > (S().stats[name] || 0)) { S().stats[name] = v; finish(G.level(G.totalXp())); } };

  /* ================================================================ badges */

  function lessonsDone(s) { return count(s.done); }
  function quizOk(s) { return count(s.quiz, function (q) { return q.ok; }); }
  function sqlSolved(s) { return count(s.sql); }
  function mastered(s) { return count(s.srs, function (r) { return r.box >= 3; }); }
  function longNotes(s) { return count(s.notes, function (t) { return t.length >= 20; }); }
  function doneId(id) { return function (s) { return [s.done[id] ? 1 : 0, 1]; }; }

  var BADGES = [
    { id: 'first-lesson', icon: '🌱', name: 'First step', desc: 'Complete your first lesson', prog: function (s) { return [lessonsDone(s), 1]; } },
    { id: 'quiz-5', icon: '🧠', name: 'Quiz whiz', desc: 'Answer 5 lesson quizzes correctly', prog: function (s) { return [quizOk(s), 5]; } },
    { id: 'notes-5', icon: '📝', name: 'Note taker', desc: 'Write notes in 5 lessons', prog: function (s) { return [longNotes(s), 5]; } },
    { id: 'sql-1', icon: '🗄️', name: 'Query cadet', desc: 'Solve your first SQL challenge', prog: function (s) { return [sqlSolved(s), 1]; } },
    { id: 'sql-8', icon: '🧩', name: 'Join wrangler', desc: 'Solve 8 SQL challenges', prog: function (s) { return [sqlSolved(s), 8]; } },
    { id: 'sql-all', icon: '👑', name: 'SQL master', desc: 'Solve every SQL challenge', prog: function (s) { return [sqlSolved(s), DA.challenges.length]; } },
    { id: 'drill-1', icon: '⚡', name: 'Warm-up', desc: 'Finish your first practice round', prog: function (s) { return [s.stats.drills, 1]; } },
    { id: 'drill-10', icon: '🏋️', name: 'Practice habit', desc: 'Finish 10 practice rounds', prog: function (s) { return [s.stats.drills, 10]; } },
    { id: 'perfect', icon: '💯', name: 'Flawless', desc: 'Finish a round of 5+ questions without a mistake', prog: function (s) { return [s.stats.perfect, 1]; } },
    { id: 'combo-7', icon: '🔗', name: 'Combo master', desc: 'Answer 7 questions in a row correctly', prog: function (s) { return [s.stats.bestCombo, 7]; } },
    { id: 'master-10', icon: '🎓', name: 'It sticks', desc: 'Master 10 questions (answered right on several days)', prog: function (s) { return [mastered(s), 10]; } },
    { id: 'master-40', icon: '🧬', name: 'Deep memory', desc: 'Master 40 questions', prog: function (s) { return [mastered(s), 40]; } },
    { id: 'streak-3', icon: '🔥', name: 'On a roll', desc: 'Reach a 3-day streak', prog: function () { return [G.streak().best, 3]; } },
    { id: 'streak-7', icon: '📅', name: 'Week warrior', desc: 'Reach a 7-day streak', prog: function () { return [G.streak().best, 7]; } },
    { id: 'streak-30', icon: '🚀', name: 'Unstoppable', desc: 'Reach a 30-day streak', prog: function () { return [G.streak().best, 30]; } },
    { id: 'goal-5', icon: '🎯', name: 'Goal getter', desc: 'Reach your daily goal on 5 days', prog: function (s) { return [count(s.met), 5]; } },
    { id: 'goal-20', icon: '🏆', name: 'Habit built', desc: 'Reach your daily goal on 20 days', prog: function (s) { return [count(s.met), 20]; } },
    { id: 'quests-3', icon: '🎁', name: 'Quest hunter', desc: 'Complete all three daily quests on 3 days', prog: function (s) { return [s.stats.questsAll, 3]; } },
    { id: 'level-5', icon: '⭐', name: 'Level 5', desc: 'Reach level 5', prog: function () { return [G.level(G.totalXp()), 5]; } },
    { id: 'level-10', icon: '🌟', name: 'Level 10', desc: 'Reach level 10: Junior Analyst', prog: function () { return [G.level(G.totalXp()), 10]; } },
    { id: 'verifier', icon: '🔍', name: 'Trust but verify', desc: 'Complete the "Verify AI output" lesson', prog: doneId('l6-2') },
    { id: 'builder', icon: '🛠️', name: 'Builder', desc: 'Complete "Build a project end to end"', prog: doneId('l7-2') },
    { id: 'course', icon: '🎉', name: 'Course complete', desc: 'Complete all lessons', prog: function (s) { return [lessonsDone(s), DA.lessons.length]; } },
    { id: 'cards-10', icon: '🃏', name: 'Curious', desc: 'Collect 10 Discover cards', prog: function (s) { return [count(s.cards), 10]; } },
    { id: 'cards-50', icon: '🗂️', name: 'Collector', desc: 'Collect 50 Discover cards', prog: function (s) { return [count(s.cards), 50]; } },
    { id: 'cards-all', icon: '📚', name: 'Walking encyclopedia', desc: 'Collect every Discover card', prog: function (s) { return [count(s.cards), (DA.feedCards || []).length || 1]; } },
    { id: 'stories-all', icon: '📜', name: 'Storyteller', desc: 'Collect every data story', prog: function (s) { var st = (DA.feedCards || []).filter(function (c) { return c.cat === 'Stories'; }); return [st.filter(function (c) { return s.cards[c.id]; }).length, st.length || 1]; } },
    { id: 'corr-8', icon: '🦅', name: 'Eagle eye', desc: 'Score 8 or more in Guess the correlation', prog: function (s) { return [s.stats.corrBest, 8]; } },
    { id: 'blocks-level', icon: '🧩', name: 'Level cleared', desc: 'Solve every puzzle in one SQL blocks level', prog: function (s) { return [DA.arcade && DA.arcade.totals ? DA.arcade.totals(s).levels : 0, 1]; } },
    { id: 'blocks-fix', icon: '🐞', name: 'Bug hunter', desc: 'Fix 8 broken queries in SQL blocks', prog: function (s) { return [DA.arcade && DA.arcade.totals ? DA.arcade.totals(s).fixed : 0, 8]; } },
    { id: 'blocks-stars', icon: '🌠', name: 'Star collector', desc: 'Earn 150 stars in SQL blocks', prog: function (s) { return [DA.arcade && DA.arcade.totals ? DA.arcade.totals(s).stars : 0, 150]; } },
    { id: 'blocks-all', icon: '🧱', name: 'Block builder', desc: 'Solve every SQL blocks puzzle', prog: function (s) { return [count(s.blocks), (DA.puzzles || []).length || 1]; } },
    { id: 'comeback', icon: '🩹', name: 'Comeback', desc: 'Win back a streak the day after missing', prog: function (s) { return [count(s.repaired), 1]; } },
    { id: 'beat-week', icon: '📈', name: 'Personal best', desc: 'Earn more XP in a week than in the week before', prog: function () { return [G.weekRace().beaten ? 1 : 0, 1]; } },
  ];
  DA.modules.forEach(function (m) {
    BADGES.push({
      id: 'mod-' + m.id, icon: m.icon, name: m.title + ' done', desc: 'Finish every lesson in "' + m.title + '"',
      prog: function (s) { return [m.lessons.filter(function (l) { return s.done[l.id]; }).length, m.lessons.length]; },
    });
  });

  G.badges = function () {
    var s = S();
    return BADGES.map(function (b) {
      var p = b.prog(s), earned = s.badges[b.id] || '';
      return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, earned: earned, cur: Math.min(p[0], p[1]), max: p[1] };
    });
  };

  function checkBadges() {
    var s = S(), today = ui.today();
    BADGES.forEach(function (b) {
      if (s.badges[b.id]) return;
      var p = b.prog(s);
      if (p[0] >= p[1]) { s.badges[b.id] = today; queue({ type: 'badge', badge: b }); }
    });
  }

  /* ================================================================ awarding XP */

  function checkGoal() {
    var s = S(), d = ui.today();
    if (!s.met[d] && G.dayXp(d) >= G.goal()) {
      s.met[d] = true;
      s.xp['goal:' + d] = { d: d, n: ui.XP.goalBonus };
      queue({ type: 'goal' });
    }
    var offer = G.repairOffer();
    if (offer && offer.left === 0) {
      s.repaired[offer.day] = true;
      queue({ type: 'repair', streak: offer.streak + 1 });
    }
  }

  function finish(lvBefore) {
    checkGoal();
    checkBadges();
    var lv = G.level(G.totalXp());
    if (lv > lvBefore) queue({ type: 'level', level: lv });
    ui.save();
    if (ui.refreshChrome) ui.refreshChrome();
    flushSoon();
  }

  /* XP boost: for 15 minutes after the quest chest opens, activities pay double. */
  G.BOOST_MS = 15 * 60 * 1000;
  G.boostLeft = function () { return Math.max(0, (S().boost || 0) - ui.now().getTime()); };
  function boosted(n) { return G.boostLeft() > 0 ? n * 2 : n; }
  function boostLabel(label) { return G.boostLeft() > 0 ? (label ? label + ' · 2× boost' : '2× boost') : label; }

  // One-time award. The key makes repeats pay nothing. Returns the XP given (0 if already awarded).
  G.award = function (key, n, label) {
    var s = S();
    if (s.xp[key] || n <= 0) return 0;
    var lvBefore = G.level(G.totalXp());
    label = boostLabel(label); n = boosted(n);
    s.xp[key] = { d: ui.today(), n: n };
    pop('+' + n + ' XP', label);
    finish(lvBefore);
    return n;
  };

  // Accumulating award, used for a practice round (the key identifies the round). `cap` limits the key's total.
  G.addXp = function (key, n, label, cap) {
    var s = S();
    if (n <= 0) return 0;
    var lvBefore = G.level(G.totalXp());
    label = boostLabel(label); n = boosted(n);
    if (!s.xp[key]) s.xp[key] = { d: ui.today(), n: 0 };
    n = Math.min(n, (cap === undefined ? 1000 : cap) - s.xp[key].n);
    if (n <= 0) { if (!s.xp[key].n) delete s.xp[key]; return 0; }
    s.xp[key].n += n;
    pop('+' + n + ' XP', label);
    finish(lvBefore);
    return n;
  };

  // Bonus for finishing every lesson of a module (called when a lesson is completed).
  G.moduleCheck = function (lesson) {
    var m = lesson.module;
    if (m.lessons.every(function (l) { return S().done[l.id]; })) return G.award('module:' + m.id, ui.XP.module, m.title + ' complete');
    return 0;
  };

  // Re-check badges / goal after state changed elsewhere (for example a lesson was unticked).
  G.touch = function () { finish(G.level(G.totalXp())); };

  /* ================================================================ summaries for the pages */

  // The last day with any XP (or '' if none): used to welcome people back without making them feel behind.
  G.lastActive = function () {
    var x = S().xp, last = '';
    Object.keys(x).forEach(function (k) { if (x[k].d > last) last = x[k].d; });
    return last;
  };

  G.today = function () {
    var xp = G.dayXp(ui.today()), goal = G.goal();
    return { xp: xp, goal: goal, pct: Math.min(100, 100 * xp / goal), met: !!S().met[ui.today()], streak: G.streak(), quests: G.quests() };
  };

  function dow(d) { var p = d.split('-'); return (new Date(+p[0], +p[1] - 1, +p[2]).getDay() + 6) % 7; } // Monday = 0
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // You against your own last week (an honest league: no invented rivals). Weeks start on Monday.
  // prevSame = what you had earned by the same weekday last week.
  G.weekRace = function () {
    var today = ui.today(), di = dow(today), mon = ui.addDays(today, -di), lastMon = ui.addDays(mon, -7), cut = ui.addDays(lastMon, di);
    var x = S().xp, weeks = {}, prevSame = 0;
    Object.keys(x).forEach(function (k) {
      var d = x[k].d;
      if (!d) return;
      var wk = ui.addDays(d, -dow(d));
      weeks[wk] = (weeks[wk] || 0) + x[k].n;
      if (d >= lastMon && d <= cut) prevSame += x[k].n;
    });
    var cur = weeks[mon] || 0, prevAll = weeks[lastMon] || 0, best = 0;
    Object.keys(weeks).forEach(function (w) { if (w !== mon && weeks[w] > best) best = weeks[w]; });
    return { cur: cur, prevSame: prevSame, prevAll: prevAll, best: best, ahead: cur - prevSame, day: di, beaten: prevAll > 0 && cur > prevAll };
  };

  G.weekBars = function () {
    var today = ui.today(), out = [];
    for (var i = 6; i >= 0; i--) {
      var d = ui.addDays(today, -i);
      out.push({ d: d, label: DAYS[dow(d)], xp: G.dayXp(d), met: !!S().met[d], isToday: i === 0 });
    }
    return out;
  };

  // Calendar columns, oldest week first, Monday at the top.
  G.heat = function (weeks) {
    var today = ui.today(), start = ui.addDays(today, -dow(today) - 7 * (weeks - 1)), cols = [];
    for (var w = 0; w < weeks; w++) {
      var col = [];
      for (var r = 0; r < 7; r++) {
        var d = ui.addDays(start, w * 7 + r);
        col.push({ d: d, xp: G.dayXp(d), met: !!S().met[d], future: ui.diffDays(today, d) > 0, day: DAYS[r] });
      }
      cols.push(col);
    }
    return cols;
  };

  /* ================================================================ feedback: pop, sound, haptics, confetti */

  function reduced() { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function announce(text) { if (!hasDom()) return; var l = document.getElementById('live'); if (l) l.textContent = text; }

  var popN = 0;
  function pop(text, sub) {
    if (!hasDom()) return;
    var h = ui.h, el = h('div', { class: 'xp-pop', 'aria-hidden': 'true', style: '--i:' + (popN++ % 3) }, h('strong', { text: text }), sub ? h('span', { text: sub }) : null);
    document.body.appendChild(el);
    announce(text + (sub ? ' ' + sub : ''));
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1900);
  }
  G.pop = pop;

  G.buzz = function (pattern) {
    if (S().profile.haptics && typeof navigator !== 'undefined' && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
  };

  var ac = null;
  function tone(freq, at, dur, type, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime + at);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, ac.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + at); o.stop(ac.currentTime + at + dur + 0.05);
  }
  var SOUNDS = {
    ok: [[660, 0, 0.12], [880, 0.09, 0.16]],
    bad: [[196, 0, 0.22, 'sawtooth', 0.08]],
    done: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.22]],
    level: [[523, 0, 0.12], [659, 0.11, 0.12], [784, 0.22, 0.12], [1047, 0.33, 0.35]],
  };
  G.sound = function (kind) {
    if (!S().profile.sound || typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      (SOUNDS[kind] || []).forEach(function (n) { tone(n[0], n[1], n[2], n[3], n[4]); });
    } catch (e) { /* audio is optional */ }
  };

  var fxRunning = false;
  G.confetti = function (big) {
    if (!hasDom() || reduced() || fxRunning) return;
    var cv = document.getElementById('fx');
    if (!cv || !cv.getContext) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var colors = ['#2158d6', '#0b7f7a', '#f5b82e', '#e87ba4', '#7eaaff', '#ff7a45'];
    var n = (big ? 110 : 60) * (W < 600 ? 0.7 : 1), parts = [], i;
    for (i = 0; i < n; i++) {
      var left = i % 2 === 0, a = (left ? -1 : 1) * (0.25 + Math.random() * 0.55), sp = 9 + Math.random() * 9;
      parts.push({ x: left ? W * 0.1 : W * 0.9, y: H * 0.85, vx: -Math.sin(a) * sp * (left ? -1 : 1) * 0.8, vy: -Math.cos(a) * sp - 4,
        s: 5 + Math.random() * 6, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: colors[i % colors.length] });
    }
    fxRunning = true;
    var t0 = performance.now();
    (function frame(t) {
      var el = t - t0;
      ctx.clearRect(0, 0, W, H);
      var alive = 0;
      parts.forEach(function (p) {
        p.vy += 0.33; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (p.y < H + 20) alive++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - el / 2600);
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      });
      if (alive && el < 2600) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, W, H); fxRunning = false; }
    })(t0);
  };

  /* ================================================================ celebrations (one modal at a time) */

  var q = [], showing = false, flushTimer = null, held = 0;
  G._queue = q; // exposed for tests
  function queue(item) { q.push(item); }
  function flushSoon() { if (!hasDom() || held) return; clearTimeout(flushTimer); flushTimer = setTimeout(next, 650); }
  // While a practice round is on, celebrations wait until it ends instead of interrupting a question.
  G.hold = function () { held++; };
  G.release = function () { held = Math.max(0, held - 1); flushSoon(); };

  function content(item) {
    var t = G.today();
    if (item.type === 'level') {
      var li = G.levelInfo();
      return { icon: '⭐', title: 'Level ' + item.level + '!', text: 'You are now a ' + G.title(item.level) + '. ' + li.next + ' XP to level ' + (item.level + 1) + '.', big: true, snd: 'level', buzz: [40, 60, 40, 60, 90] };
    }
    if (item.type === 'goal') {
      var st = G.streak();
      return { icon: '🎯', title: 'Daily goal reached', text: t.xp + ' XP today' + (st.count > 1 ? ' · ' + st.count + '-day streak 🔥' : '') + '. Everything else today is a bonus.', big: false, snd: 'done', buzz: [30, 40, 30] };
    }
    if (item.type === 'chest') return { icon: '🎁', title: 'Quest chest opened', text: 'All three daily quests done: +' + item.xp + ' bonus XP, and everything pays double XP for the next 15 minutes.', big: true, snd: 'done', buzz: [30, 40, 30], mood: 'cheer' };
    if (item.type === 'repair') return { icon: '🩹', title: 'Streak repaired', text: 'You earned twice your goal today, so yesterday is forgiven. ' + item.streak + '-day streak 🔥', big: true, snd: 'level', buzz: [40, 60, 40, 60, 90], mood: 'cheer' };
    return { icon: item.badge.icon, title: 'New badge: ' + item.badge.name, text: item.badge.desc + '.', big: true, snd: 'done', buzz: [30, 40, 30] };
  }

  function next() {
    if (showing || held || !q.length || !hasDom()) return;
    var h = ui.h, item = q.shift(), c = content(item), prevFocus = document.activeElement;
    showing = true;
    var btn = h('button', { class: 'btn big accent', type: 'button', onclick: close }, q.length ? 'Next' : 'Continue');
    var box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
      h('div', { class: 'modal-art', 'aria-hidden': 'true' }, DA.mascot ? DA.mascot.svg(c.mood || 'cheer', 104) : null, h('span', { class: 'modal-icon', text: c.icon })),
      h('h2', { id: 'modal-title', text: c.title }),
      h('p', { text: c.text }),
      btn);
    var scrim = h('div', { class: 'modal-scrim', onclick: function (e) { if (e.target === scrim) close(); } }, box); // tap outside to dismiss
    function close() {
      document.removeEventListener('keydown', onKey);
      if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
      showing = false;
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      setTimeout(next, 250);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'Tab') { e.preventDefault(); btn.focus(); } // one control: keep focus inside the dialog
    }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(scrim);
    btn.focus();
    G.confetti(c.big);
    G.sound(c.snd);
    G.buzz(c.buzz);
    announce(c.title + '. ' + c.text);
  }

  /* ================================================================ HUD (streak, level, daily goal) */

  function svgEl(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function ring(pct, met) {
    var C = 2 * Math.PI * 15.5, svg = svgEl('svg', { viewBox: '0 0 36 36', class: 'ring' + (met ? ' met' : ''), 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(svgEl('circle', { class: 'ring-bg', cx: 18, cy: 18, r: 15.5, fill: 'none', 'stroke-width': 4 }));
    svg.appendChild(svgEl('circle', { class: 'ring-fg', cx: 18, cy: 18, r: 15.5, fill: 'none', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': (C * pct / 100).toFixed(2) + ' ' + C.toFixed(2), transform: 'rotate(-90 18 18)' }));
    return svg;
  }
  G.ring = ring;

  function hudChips() {
    var h = ui.h, t = G.today(), li = G.levelInfo(), st = t.streak;
    var streakLabel = 'Streak: ' + st.count + ' day' + (st.count === 1 ? '' : 's') + (st.metToday ? ', today done' : st.count ? ', today still open' : '');
    return [
      G.boostLeft() > 0 ? h('a', { class: 'hud-chip boost', href: '#/practice', 'aria-label': 'Double XP for ' + Math.ceil(G.boostLeft() / 60000) + ' more minutes' }, ui.icon('bolt', 16), h('b', { text: '2× ' + Math.ceil(G.boostLeft() / 60000) + 'm' })) : null,
      h('a', { class: 'hud-chip streak t' + G.flameTier(st.count) + (st.metToday ? ' lit' : st.atRisk && st.count ? ' risk' : ''), href: '#/me', 'aria-label': streakLabel }, ui.icon('flame', 16, 'flame'), h('b', { text: String(st.count) })),
      h('a', { class: 'hud-chip lvl', href: '#/me', 'aria-label': 'Level ' + li.level + ', ' + li.title }, ui.icon('star', 16), h('b', { text: 'Lv ' + li.level })),
      h('a', { class: 'hud-chip goal', href: '#/me', 'aria-label': 'Daily goal: ' + t.xp + ' of ' + t.goal + ' XP' + (t.met ? ', reached' : '') }, ring(t.pct, t.met), h('b', { text: t.met ? '✓' : t.xp + '/' + t.goal })),
    ];
  }

  G.renderHud = function () {
    if (!hasDom()) return;
    var h = ui.h, top = document.getElementById('hudTop'), side = document.getElementById('hudSide');
    if (top) { ui.clear(top); hudChips().forEach(function (c) { if (c) top.appendChild(c); }); }
    if (side) {
      var li = G.levelInfo();
      ui.clear(side);
      side.appendChild(h('div', { class: 'hud-row' }, hudChips()));
      side.appendChild(h('div', { class: 'lvl-line' }, h('strong', { text: li.title }), h('span', { class: 'muted small', text: li.next + ' XP to level ' + (li.level + 1) })));
      side.appendChild(ui.progressBar(li.pct, 'Progress to next level'));
    }
  };
})();
