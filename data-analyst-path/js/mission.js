/* Mission and boss screens: Brief, Learn, Try (lab challenges played in place), Check and Debrief, plus test-out and chapter boss cases. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, J = DA.journey, G = DA.game;
  var V = (DA.views = DA.views || {});

  var LAB_ICON = { sheets: '📊', python: '🐍', bi: '📈', sql: '🗄️' };

  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function colorOf(l) { var c = DA.unitColor(DA.modules.indexOf(l.module)); return '--mc:' + c[0] + ';--mcd:' + c[1]; }
  function starText(n) { var t = ''; for (var i = 0; i < 3; i++) t += i < n ? '★' : '☆'; return t; }
  function starEl(n) { return h('span', { class: 'lab-stars', 'aria-label': n + ' of 3 stars', text: starText(n) }); }
  function mhref(id, step) { return '#/mission/' + id + (step ? '/' + step : ''); }

  /* ================================================================ shell */

  function shell(opts) {
    var root = h('div', { class: 'view mission' + (opts.cls ? ' ' + opts.cls : ''), style: opts.style });
    root.appendChild(h('div', { class: 'm-top' },
      h('a', { class: 'icon-btn m-back', href: opts.back, 'aria-label': opts.backLabel }, '←'),
      h('div', { class: 'm-titles' },
        h('p', { class: 'm-kicker', text: opts.kicker }),
        h('h1', { id: 'view-title', tabindex: '-1', text: opts.title })),
      opts.more || null));
    if (opts.steps) root.appendChild(opts.steps);
    var stage = h('section', { class: 'm-stage' });
    root.appendChild(stage);
    var actions = h('div', { class: 'm-actions' });
    root.appendChild(actions);
    return { root: root, stage: stage, actions: actions };
  }

  function stepsNav(m, active) {
    return h('nav', { class: 'm-steps', 'aria-label': 'Mission steps' }, h('ol', null, m.steps.map(function (s, i) {
      var done = J.stepDone(m.id, s), on = s === active;
      return h('li', null, h('a', { class: 'm-step' + (done ? ' done' : '') + (on ? ' on' : ''), href: mhref(m.id, s), 'aria-current': on ? 'step' : null,
        'aria-label': 'Step ' + (i + 1) + ' of ' + m.steps.length + ': ' + J.NAMES[s] + (done ? ', done' : '') },
        h('span', { class: 'm-dot', 'aria-hidden': 'true', text: done ? '✓' : String(i + 1) }),
        h('span', { class: 'm-step-name', 'aria-hidden': 'true', text: J.NAMES[s] })));
    })));
  }

  function nextStep(m, s) { var i = m.steps.indexOf(s); return i >= 0 && i + 1 < m.steps.length ? m.steps[i + 1] : null; }
  function prevStep(m, s) { var i = m.steps.indexOf(s); return i > 0 ? m.steps[i - 1] : null; }
  function stepButtons(m, s, primaryLabel) {
    var p = prevStep(m, s), n = nextStep(m, s);
    return [p ? h('a', { class: 'btn ghost', href: mhref(m.id, p) }, '← ' + J.NAMES[p]) : h('span'),
      n ? h('a', { class: 'btn accent big', href: mhref(m.id, n) }, primaryLabel || (J.NAMES[n] + ' →')) : null];
  }

  function missionShell(m, step, opts) {
    var l = m.lesson;
    return shell({
      style: colorOf(l), cls: opts && opts.cls,
      back: '#/journey', backLabel: 'Back to the journey',
      kicker: 'Mission ' + l.number + ' · ' + l.module.title,
      title: l.title,
      more: h('a', { class: 'icon-btn m-more', href: '#/lesson/' + l.id, 'aria-label': 'Open the full lesson notes', title: 'Full lesson notes' }, '📄'),
      steps: stepsNav(m, step),
    });
  }

  /* ================================================================ mission */

  V.mission = function (params) {
    var m = J.mission(params[0]);
    if (!m) return V.notFound();
    if (params[1] === 'test') return testOut(m);
    var step = m.steps.indexOf(params[1]) >= 0 ? params[1] : J.currentStep(m.id);
    if (step === 'try' && params[2] && params[3]) return tryChallenge(m, params[2], params[3]);
    if (step === 'brief') J.mark(m.id, J.BITS.brief);
    var sh = missionShell(m, step);
    ({ brief: brief, learn: learn, try: tryStep, check: check, debrief: debrief })[step](m, sh);
    return sh.root;
  };

  function brief(m, sh) {
    var l = m.lesson;
    sh.stage.appendChild(h('div', { class: 'card m-brief' },
      h('div', { class: 'm-who' }, h('span', { class: 'm-avatar', 'aria-hidden': 'true', text: m.who.icon }),
        h('span', null, h('strong', { text: m.who.name }), h('small', { class: 'muted', text: ' · ' + m.who.role }))),
      h('p', { class: 'm-quote', text: m.brief })));
    sh.stage.appendChild(h('p', { class: 'lead', text: l.why }));
    sh.stage.appendChild(h('p', { class: 'meta' },
      h('span', { class: 'pill', text: '⏱ about ' + ui.fmtHours(l.hours) }), ' ',
      h('span', { class: 'pill', text: m.steps.length + ' steps' }), ' ',
      h('span', { class: 'pill xp', text: '⭐ up to ' + (ui.XP.lesson(l) + ui.XP.quiz + ui.XP.note) + ' XP' })));
    if (!ui.state.done[m.id]) {
      sh.stage.appendChild(h('div', { class: 'callout info compact' }, h('strong', { text: 'Already know this? ' }),
        'Answer 4 questions without a mistake and the mission counts as complete. ', h('a', { href: mhref(m.id, 'test') }, 'Test out →')));
    }
    stepButtons(m, 'brief', 'Start learning →').forEach(function (b) { if (b) sh.actions.appendChild(b); });
  }

  function learnCards(l) {
    var cards = [];
    if (l.concept && DA.lessonUI) cards.push(h('div', { class: 'lcard' }, DA.lessonUI.concept(l)));
    l.learn.forEach(function (t) { cards.push(h('div', { class: 'lcard' }, h('p', { class: 'lcard-text', html: t }))); });
    if (l.code) cards.push(h('div', { class: 'lcard' }, h('p', { class: 'muted small', text: 'See it in code:' }), ui.codeBlock(l.code)));
    return cards;
  }

  function learn(m, sh) {
    var cards = learnCards(m.lesson), i = 0;
    var deck = h('div', { class: 'deck', role: 'group', 'aria-roledescription': 'card deck', 'aria-label': 'Key ideas' });
    var count = h('p', { class: 'deck-count muted small', 'aria-live': 'polite' });
    var dots = h('div', { class: 'deck-dots', 'aria-hidden': 'true' }, cards.map(function () { return h('span'); }));
    sh.stage.appendChild(count);
    sh.stage.appendChild(deck);
    sh.stage.appendChild(dots);
    var back = h('button', { class: 'btn ghost', type: 'button', onclick: function () { go(i - 1); } }, '← Back');
    var fwd = h('button', { class: 'btn accent big', type: 'button', onclick: function () { if (i + 1 < cards.length) go(i + 1); else location.hash = mhref(m.id, nextStep(m, 'learn')); } });
    sh.actions.appendChild(back);
    sh.actions.appendChild(fwd);
    function go(n) {
      if (n < 0) { location.hash = mhref(m.id, 'brief'); return; }
      i = Math.max(0, Math.min(cards.length - 1, n));
      ui.clear(deck);
      deck.appendChild(cards[i]);
      if (!reduced()) { cards[i].classList.remove('enter'); void cards[i].offsetWidth; cards[i].classList.add('enter'); }
      count.textContent = 'Card ' + (i + 1) + ' of ' + cards.length;
      Array.prototype.forEach.call(dots.children, function (d, j) { d.className = j < i ? 'seen' : j === i ? 'on' : ''; });
      var last = i + 1 >= cards.length, ns = nextStep(m, 'learn');
      fwd.textContent = last ? J.NAMES[ns] + ' →' : 'Next card →';
      back.textContent = i ? '← Back' : '← Brief';
      if (last) J.mark(m.id, J.BITS.learn);
    }
    var x0 = null;
    deck.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    deck.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
    });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    });
    deck.tabIndex = 0;
    go(0);
  }

  function levelCard(ref, href) {
    var info = J.levelInfo(ref), lab = DA.labgame.get(ref.lab), lv = ref.level;
    if (!lv || !info.next) return null;
    return h('li', { class: 'tcard' + (info.solved ? ' hit' : '') },
      h('span', { class: 'tcard-icon', 'aria-hidden': 'true', text: LAB_ICON[ref.lab] }),
      h('span', { class: 'grow' },
        h('small', { class: 'muted', text: lab.name + ' · Level ' + lv.world.n + '.' + lv.n }),
        h('strong', { text: lv.title }),
        h('span', { class: 'tcard-meta' }, info.best ? starEl(info.best) : null, h('span', { class: 'muted small', text: ' ' + info.solved + ' of ' + info.total + ' solved' }))),
      h('a', { class: 'btn small' + (info.solved ? ' ghost' : ' accent'), href: href(ref.lab, info.next), 'aria-label': (info.solved ? 'Play again: ' : 'Play: ') + lv.title }, info.solved ? 'Again' : 'Play'));
  }

  // A Try without a lab level: two short decisions on a realistic case. A wrong pick explains why and stays open for another go.
  function scenarioTry(m, sh) {
    var t = J.tryState(m.id), left = m.scenario.length;
    var status = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite', text: t.done ? 'Case closed ✓ You can still go through it again.' : left + ' decisions to make' });
    sh.stage.appendChild(h('p', { class: 'lead', text: 'A short case from ' + m.who.name + '. Pick the best move for each decision. A wrong pick tells you why, and you can try again.' }));
    sh.stage.appendChild(status);
    var host = h('div', { class: 'qlist scen-list' });
    m.scenario.forEach(function (sc, n) {
      var shuffled = DA.drill.shuffled(sc), solved = false;
      var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
      var opts = shuffled.options.map(function (text, i) {
        return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { pick(i); } },
          h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { class: 'opt-text', text: text }));
      });
      function pick(i) {
        if (solved) return;
        var ok = i === shuffled.answer;
        opts[i].classList.add(ok ? 'right' : 'wrong');
        opts[i].querySelector('.letter').textContent = ok ? '✓' : '✗';
        opts[i].setAttribute('aria-label', (ok ? 'Right: ' : 'Not this one: ') + shuffled.options[i]);
        ui.clear(fb);
        fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? '✓ Good call. ' : '✗ Not quite. ' }), ok ? sc.why : 'Think about it again and pick another option.'));
        G.sound(ok ? 'ok' : 'bad'); G.buzz(ok ? 20 : [40, 40, 40]);
        if (!ok) { opts[i].disabled = true; return; }
        solved = true;
        opts.forEach(function (b) { b.disabled = true; });
        if (--left > 0) { status.textContent = left + ' decision' + (left === 1 ? '' : 's') + ' to go'; return; }
        var first = J.scenarioDone(m.id, true);
        if (first) G.addXp('scenario:' + m.id, ui.XP.scenario * m.scenario.length, 'Case closed');
        G.touch();
        ui.refreshChrome();
        status.textContent = 'Case closed ✓';
      }
      var table = sc.table ? h('div', { class: 'table-wrap scen-table', role: 'region', tabindex: '0', 'aria-label': 'Case data' }, h('table', { class: 'result-table' },
        h('thead', null, h('tr', null, sc.table.cols.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
        h('tbody', null, sc.table.rows.map(function (r) { return h('tr', null, r.map(function (v) { return h('td', { class: typeof v === 'number' ? 'num' : null, text: String(v) }); })); })))) : null;
      host.appendChild(h('div', { class: 'card qcard scen' },
        h('p', { class: 'muted small', text: 'Decision ' + (n + 1) + ' of ' + m.scenario.length }),
        h('p', { class: 'qtext', text: sc.q }), table,
        h('div', { class: 'qopts', role: 'group', 'aria-label': 'Options for decision ' + (n + 1) }, opts), fb));
    });
    sh.stage.appendChild(host);
    stepButtons(m, 'try').forEach(function (b) { if (b) sh.actions.appendChild(b); });
  }

  function tryStep(m, sh) {
    if (m.scenario.length) return scenarioTry(m, sh);
    var t = J.tryState(m.id), href = function (lab, c) { return '#/mission/' + m.id + '/try/' + lab + '/' + c.id; };
    sh.stage.appendChild(h('p', { class: 'lead', text: 'Solve one challenge in each level below. Your stars count in the Workshop too.' }));
    sh.stage.appendChild(h('p', { class: 'muted small', 'aria-live': 'polite', text: t.hit + ' of ' + t.total + ' levels done' + (t.done ? ' ✓' : '') }));
    sh.stage.appendChild(h('ul', { class: 'tcards' }, m.targets.map(function (r) { return levelCard(r, href); })));
    if (m.more.length) {
      sh.stage.appendChild(h('details', { class: 'card fold' }, h('summary', null, h('strong', { text: 'More practice (' + m.more.length + ' levels)' })),
        h('ul', { class: 'tcards' }, m.more.map(function (r) { return levelCard(r, href); }))));
    }
    stepButtons(m, 'try').forEach(function (b) { if (b) sh.actions.appendChild(b); });
  }

  function playView(labId, c) {
    if (labId === 'sql') return V.lab([c.src.ds, c.id]);
    return V[labId](['play', c.id]);
  }

  function embedFor(refs, base, back, backLabel, onSolved) {
    var list = J.challenges(refs);
    return {
      ids: J.embedIds(refs),
      href: function (c) { return base + c.lab + '/' + c.id; },
      back: back, backLabel: backLabel,
      solved: onSolved || null,
      next: function (c) {
        for (var i = 0; i < refs.length; i++) {
          var info = J.levelInfo(refs[i]);
          if (!info.solved && info.next && info.next !== c) return info.next;
        }
        var at = list.map(function (x) { return x.c; }).indexOf(c);
        var after = list.slice(at + 1).filter(function (x) { return !DA.labgame.stars(x.lab, x.c.id); })[0];
        return after && after.c.level === c.level ? after.c : null;
      },
    };
  }

  function tryChallenge(m, labId, cid) {
    var lab = DA.labgame.get(labId), c = lab && lab.byId[cid];
    if (!c) return V.notFound();
    DA.labgame.embed = embedFor(m.levels, '#/mission/' + m.id + '/try/', mhref(m.id, 'try'), 'Back to the mission');
    var sh = missionShell(m, 'try', { cls: 'playing' });
    sh.stage.appendChild(h('div', { class: 'mission-embed' }, playView(labId, c)));
    sh.actions.appendChild(h('a', { class: 'btn ghost', href: mhref(m.id, 'try') }, '← All Try levels'));
    return sh.root;
  }

  /* ---------------------------------------------------------------- questions */

  function questionCard(q, n, total, onAnswer) {
    var sh = DA.drill.shuffled(q), answered = false;
    var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
    var opts = sh.options.map(function (text, i) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { choose(i); } },
        h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { text: text }));
    });
    function choose(i) {
      var ok = i === sh.answer, orig = q.options.indexOf(sh.options[i]);
      opts.forEach(function (b, j) { b.classList.remove('right', 'wrong'); if (j === i) b.classList.add(ok ? 'right' : 'wrong'); });
      ui.clear(fb);
      fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? 'Correct. ' : 'Not quite. ' }),
        ok ? '' : h('span', null, 'The answer: ', h('b', { text: sh.options[sh.answer] }), '. '), q.why));
      if (answered) return;
      answered = true;
      opts.forEach(function (b) { b.disabled = true; });
      G.sound(ok ? 'ok' : 'bad'); G.buzz(ok ? 20 : [40, 40, 40]);
      onAnswer(ok, orig);
    }
    return h('div', { class: 'card qcard' },
      h('p', { class: 'muted small', text: 'Question ' + n + ' of ' + total + (q.lesson ? ' · this mission' : ' · review: ' + q.cat) }),
      h('p', { class: 'qtext', text: q.q }),
      q.code ? h('pre', { class: 'qcode' }, h('code', { text: q.code })) : null,
      h('div', { class: 'qopts', role: 'group', 'aria-label': 'Answers' }, opts), fb);
  }

  function questionRound(qs, host, onDone) {
    var left = qs.length, right = 0, missed = [];
    qs.forEach(function (q, i) {
      host.appendChild(questionCard(q, i + 1, qs.length, function (ok, orig) {
        J.answer(q, orig);
        if (ok) right++; else missed.push(q);
        if (--left === 0) onDone(right, qs.length, missed);
      }));
    });
  }

  function check(m, sh) {
    var qs = J.checkQuestions(m.id, 2);
    sh.stage.appendChild(h('p', { class: 'lead', text: 'One question on this mission, then ' + (qs.length - 1) + ' quick review' + (qs.length === 2 ? '' : 's') + ' from earlier topics. Questions you miss come back later.' }));
    var host = h('div', { class: 'qlist' });
    var result = h('div', { role: 'status', 'aria-live': 'polite' });
    sh.stage.appendChild(host);
    sh.stage.appendChild(result);
    questionRound(qs, host, function (right, total) {
      G.quest('drill');
      G.touch();
      ui.refreshChrome();
      result.appendChild(h('div', { class: 'callout ' + (right === total ? 'ok' : 'info') }, h('strong', { text: right + ' of ' + total + ' right. ' }),
        right === total ? 'Nice work.' : 'The ones you missed will come back in Practice.'));
    });
    stepButtons(m, 'check').forEach(function (b) { if (b) sh.actions.appendChild(b); });
  }

  function debrief(m, sh) {
    var l = m.lesson, LU = DA.lessonUI;
    var summary = h('ul', { class: 'm-summary' }, m.steps.filter(function (s) { return s !== 'debrief'; }).map(function (s) {
      var d = J.stepDone(m.id, s), extra = s === 'try' ? ' · ' + J.tryState(m.id).hit + '/' + J.tryState(m.id).total + ' levels' : '';
      return h('li', { class: d ? 'done' : '' }, h('span', { 'aria-hidden': 'true', text: d ? '✓ ' : '○ ' }), h('a', { href: mhref(m.id, s) }, J.NAMES[s] + extra), h('span', { class: 'sr-only', text: d ? ' (done)' : ' (not done yet)' }));
    }));
    sh.stage.appendChild(h('section', { class: 'card' }, h('h2', { text: 'Your mission so far' }), summary));
    sh.stage.appendChild(h('section', { class: 'block' }, h('h2', { text: 'Do it for real' }), h('div', { class: 'doit' }, h('p', { html: l.doit })), LU ? LU.tools(l) : null));
    if (LU) LU.extras(l).forEach(function (x) { sh.stage.appendChild(x); });
    sh.stage.appendChild(h('section', { class: 'block' }, h('h2', { text: 'AI move' }),
      h('p', { class: 'muted', text: 'Your tutor prompt for this mission. It already includes your background.' }), ui.promptCard(l.ai)));
    if (LU) sh.stage.appendChild(h('section', { class: 'block' }, h('h2', { text: 'My notes' }), LU.notes(l)));

    var btn = h('button', { class: 'btn big', type: 'button' });
    var after = h('div', { class: 'row' });
    function paint() {
      var d = !!ui.state.done[m.id];
      btn.className = 'btn big ' + (d ? 'ghost' : 'accent');
      btn.textContent = d ? '✔ Mission complete (tap to undo)' : 'Complete the mission';
      btn.setAttribute('aria-pressed', d ? 'true' : 'false');
      ui.clear(after);
      if (!d) return;
      var nx = DA.lessons[l.index + 1], last = l.module.lessons[l.module.lessons.length - 1] === l;
      if (last) after.appendChild(h('a', { class: 'btn big', href: '#/boss/' + l.module.id }, J.boss(l.module.id).icon + ' Boss case: ' + J.boss(l.module.id).title));
      if (nx) after.appendChild(h('a', { class: 'btn big' + (last ? ' ghost' : ' accent'), href: '#/mission/' + nx.id }, 'Next mission: ' + nx.title + ' →'));
    }
    btn.addEventListener('click', function () {
      var on = !ui.state.done[m.id];
      J.complete(m.id, on);
      ui.refreshChrome();
      if (on) { G.confetti(false); G.sound('done'); G.buzz(30); }
      paint();
      var s = sh.root.querySelector('.m-steps');
      if (s) s.parentNode.replaceChild(stepsNav(m, 'debrief'), s);
    });
    paint();
    sh.actions.appendChild(stepButtons(m, 'debrief')[0]);
    sh.actions.appendChild(btn);
    sh.stage.appendChild(after);
  }

  function testOut(m) {
    var l = m.lesson, sh = shell({ style: colorOf(l), back: mhref(m.id, 'brief'), backLabel: 'Back to the mission', kicker: 'Mission ' + l.number + ' · Test out', title: l.title });
    if (ui.state.done[m.id]) {
      sh.stage.appendChild(ui.callout('ok', 'Already complete. ', 'This mission is done. You can still replay any step.'));
      sh.actions.appendChild(h('a', { class: 'btn accent big', href: mhref(m.id, 'brief') }, 'Open the mission'));
      return sh.root;
    }
    var qs = J.checkQuestions(m.id, 3);
    sh.stage.appendChild(h('p', { class: 'lead', text: 'Answer all ' + qs.length + ' questions correctly and the mission counts as complete, with the same XP. No timer, and nothing is lost if you miss one.' }));
    var host = h('div', { class: 'qlist' }), result = h('div', { role: 'status', 'aria-live': 'polite' });
    sh.stage.appendChild(host);
    sh.stage.appendChild(result);
    questionRound(qs, host, function (right, total, missed) {
      var all = right === total;
      J.testOut(m.id, all);
      ui.refreshChrome();
      if (all) {
        G.confetti(true); G.sound('done');
        var nx = DA.lessons[l.index + 1];
        result.appendChild(h('div', { class: 'callout ok' }, h('strong', { text: 'Tested out. ' }), 'Mission ' + l.number + ' is complete.',
          h('div', { class: 'row' }, nx ? h('a', { class: 'btn accent', href: '#/mission/' + nx.id }, 'Next mission →') : null, h('a', { class: 'btn ghost', href: '#/journey' }, 'Journey'))));
      } else {
        result.appendChild(h('div', { class: 'callout info' }, h('strong', { text: right + ' of ' + total + ' right. ' }), 'Worth a quick run through the mission. What to review:',
          h('ul', null, missed.map(function (q) { return h('li', null, h('strong', { text: q.q }), h('br'), h('span', { class: 'muted', text: q.why })); })),
          h('div', { class: 'row' }, h('a', { class: 'btn accent', href: mhref(m.id, 'learn') }, 'Start with Learn'), h('a', { class: 'btn ghost', href: '#/journey' }, 'Journey'))));
      }
    });
    return sh.root;
  }

  /* ================================================================ boss */

  V.boss = function (params) {
    var b = J.boss(params[0]);
    if (!b) return V.notFound();
    var mi = DA.modules.indexOf(b.module), col = DA.unitColor(mi), style = '--mc:' + col[0] + ';--mcd:' + col[1];
    var base = '#/boss/' + b.id;
    var opts = { style: style, back: params[1] ? base : '#/journey', backLabel: params[1] ? 'Back to the case' : 'Back to the journey', kicker: 'Chapter ' + (mi + 1) + ' · Boss case', title: b.title };
    if (params[1] === 'try' && params[2] && params[3]) {
      var lab = DA.labgame.get(params[2]), c = lab && lab.byId[params[3]];
      if (!c) return V.notFound();
      DA.labgame.embed = embedFor(b.levels, base + '/try/', base, 'Back to the case', function () { J.checkBoss(b.id); });
      var sp = shell(Object.assign({ cls: 'playing' }, opts));
      sp.stage.appendChild(h('div', { class: 'mission-embed' }, playView(params[2], c)));
      return sp.root;
    }
    if (params[1] === 'q') return bossQuestions(b, opts);
    var sh = shell(opts);
    sh.stage.appendChild(h('div', { class: 'card m-brief' },
      h('div', { class: 'm-who' }, h('span', { class: 'm-avatar', 'aria-hidden': 'true', text: b.who.icon }),
        h('span', null, h('strong', { text: b.who.name }), h('small', { class: 'muted', text: ' · ' + b.who.role }))),
      h('p', { class: 'm-quote', text: b.brief })));
    sh.stage.appendChild(b.won
      ? ui.callout('ok', '🏆 Case closed. ', (b.stars ? 'Best: ' + starText(b.stars) + '. ' : '') + 'The ' + ui.XP.module + ' XP chapter bonus is yours. Replay any part whenever you like.')
      : ui.callout('info', 'Chapter bonus. ', 'Close the case to earn ' + ui.XP.module + ' XP, once. It is open now: no need to finish the chapter first.'));
    var steps = h('ol', { class: 'boss-steps' });
    if (b.levels.length) {
      steps.appendChild(h('li', null, h('h2', { text: 'Hands-on' }), h('p', { class: 'muted small', text: 'Solve one challenge in each level.' }),
        h('ul', { class: 'tcards' }, b.levels.map(function (r) { return levelCard(r, function (lab, c) { return base + '/try/' + lab + '/' + c.id; }); }))));
    }
    steps.appendChild(h('li', null, h('h2', { text: 'Case questions' }),
      h('p', { class: 'muted small', text: b.questions.length + ' questions. Get at least 60% right to close the case; all right earns three stars.' }),
      h('a', { class: 'btn accent', href: base + '/q' }, b.stars ? 'Play the questions again' : 'Start the questions')));
    sh.stage.appendChild(steps);
    sh.actions.appendChild(h('a', { class: 'btn ghost', href: '#/journey' }, '← Journey'));
    return sh.root;
  };

  function bossQuestions(b, opts) {
    var sh = shell(opts);
    var qs = b.questions.map(function (id) { return DA.drill.byId(id); }).filter(Boolean);
    var host = h('div', { class: 'qlist' }), result = h('div', { role: 'status', 'aria-live': 'polite' });
    sh.stage.appendChild(host);
    sh.stage.appendChild(result);
    questionRound(qs, host, function (right, total) {
      var r = J.bossResult(b.id, right, total);
      ui.refreshChrome();
      G.touch();
      if (r.stars) G.confetti(r.stars === 3);
      result.appendChild(h('div', { class: 'callout ' + (r.stars ? 'ok' : 'info') },
        h('strong', { text: right + ' of ' + total + ' right. ' }),
        r.stars ? h('span', null, starEl(r.stars), r.boss.won ? ' Case closed.' : ' Now finish the hands-on part to close the case.') : 'Not enough to close the case yet. Review and try again: nothing is lost.',
        h('div', { class: 'row' }, h('a', { class: 'btn accent', href: '#/boss/' + b.id }, 'Back to the case'), h('a', { class: 'btn ghost', href: '#/journey' }, 'Journey'))));
    });
    return sh.root;
  }
})();
