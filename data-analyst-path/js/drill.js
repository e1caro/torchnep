/* Practice: the lobby and the round screen. Logic (question picking, review schedule) is in drill-core.js. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, D = DA.drill;
  var V = (DA.views = DA.views || {});
  var active = null; // the round in progress

  var PRAISE = ['Correct!', 'Nice!', 'Exactly!', 'Spot on!', 'Yes!', 'Well done!'];

  /* The router calls this on every navigation: leaving a round never loses XP already earned. */
  D.leave = function () {
    if (!active) return;
    document.removeEventListener('keydown', active.onKey);
    if (!active.released) G.release();
    active = null;
  };

  function title(text) { return h('h1', { id: 'view-title', tabindex: '-1', text: text }); }

  /* ================================================================ lobby */

  function lobby() {
    var root = h('div', { class: 'view practice' });
    var due = D.dueCount(), qs = G.quests(), st = ui.state.stats, t = G.today();
    root.appendChild(title('Practice'));
    root.appendChild(h('p', { class: 'lead', text: 'Short rounds, big gains. Five questions take about two minutes, and questions you miss come back at the right time so they stick.' }));

    root.appendChild(h('div', { class: 'card start-card' },
      h('div', { class: 'grow' },
        h('h2', { text: due ? due + ' question' + (due === 1 ? '' : 's') + ' ready to review' : 'Ready for a round?' }),
        h('p', { class: 'muted', text: D.ROUND + ' questions · about 2 minutes · up to 60 XP' + (qs.drill ? ' · ✓ today\'s practice quest is done' : ' · finishing one round completes today\'s practice quest') }),
        h('a', { class: 'btn big accent', href: '#/practice/play' }, 'Start a round')),
      h('div', { class: 'start-goal' }, G.ring(t.pct, t.met), h('span', { class: 'small muted', text: t.xp + ' / ' + t.goal + ' XP today' }))));

    root.appendChild(h('h2', { class: 'section-h', text: 'Practise a topic' }));
    root.appendChild(h('div', { class: 'topics' }, D.topics().map(function (c) {
      var m = D.mastery(c), d = D.dueCount(c);
      return h('a', { class: 'topic', href: '#/practice/play/' + encodeURIComponent(c) },
        h('span', { class: 'topic-top' }, h('strong', { text: c }), d ? h('span', { class: 'badge', text: d + ' due' }) : null),
        ui.progressBar(100 * m.mastered / m.total, c + ' mastery'),
        h('span', { class: 'muted small', text: m.mastered + ' of ' + m.total + ' mastered' }));
    })));

    var acc = st.answers ? Math.round(100 * st.correct / st.answers) + '%' : 'none yet';
    root.appendChild(h('div', { class: 'stat-row' },
      [['Rounds', st.drills], ['Answered', st.answers], ['First-try accuracy', acc], ['Best combo', st.bestCombo]].map(function (x) {
        return h('div', { class: 'stat' }, h('b', { text: String(x[1]) }), h('span', { text: x[0] }));
      })));

    root.appendChild(ui.callout('info', 'How review works. ', 'A question you get right returns after 1, 3, 7, 14 and then 30 days. A miss comes back sooner. "Mastered" means you answered it correctly on several different days.'));
    return root;
  }

  /* ================================================================ round */

  function newRound(cat) {
    var picks = D.pick(D.ROUND, cat);
    return {
      id: String(ui.now().getTime()), cat: cat, total: picks.length, queue: picks.map(function (q) { return { q: q, sh: D.shuffled(q), retry: false }; }),
      i: 0, answered: null, correct: 0, combo: 0, best: 0, xp: 0, missed: [], extra: 0, released: false, finished: false, onKey: null,
    };
  }

  function play(cat) {
    D.leave();
    var root = h('div', { class: 'view round' }, h('h1', { id: 'view-title', class: 'sr-only', tabindex: '-1', text: 'Practice round' }));
    var R = (active = newRound(cat));
    if (!R.total) {
      return h('div', { class: 'view' }, title('Nothing to practise'), h('p', { text: 'There are no questions in this topic.' }), h('a', { class: 'btn', href: '#/practice' }, 'Back'));
    }
    G.hold();
    R.onKey = function (e) {
      if (R.finished || R.answered !== null || e.ctrlKey || e.metaKey || e.altKey) return;
      var n = parseInt(e.key, 10), cur = R.queue[R.i];
      if (n >= 1 && n <= cur.sh.options.length) { e.preventDefault(); answer(n - 1); }
    };
    document.addEventListener('keydown', R.onKey);
    var stage = h('div', { class: 'stage' });
    root.appendChild(stage);

    function head() {
      var done = R.i, total = R.total + R.extra;
      return h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/practice', 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * done / total, 'Round progress'),
        h('span', { class: 'combo' + (R.combo >= 3 ? ' hot' : ''), 'aria-label': 'Combo ' + R.combo }, h('span', { 'aria-hidden': 'true', text: '🔥' }), ' ', h('b', { text: String(R.combo) })),
        h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': ui.state.profile.sound ? 'true' : 'false', 'aria-label': 'Sound effects', onclick: function () {
          ui.state.profile.sound = !ui.state.profile.sound; ui.save(); G.sound('ok'); paint();
        } }, ui.state.profile.sound ? '🔊' : '🔇'));
    }

    function paint() {
      ui.clear(stage);
      stage.appendChild(head());
      var item = R.queue[R.i], q = item.q;
      var opts = item.sh.options.map(function (text, i) {
        return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { answer(i); } },
          h('span', { class: 'letter', 'aria-hidden': 'true', text: String(i + 1) }), h('span', { class: 'opt-text', text: text }));
      });
      var qtext = h('p', { class: 'qtext', tabindex: '-1', text: q.q });
      stage.appendChild(h('div', { class: 'qcard' },
        h('div', { class: 'qmeta' }, h('span', { class: 'badge', text: q.cat }), item.retry ? h('span', { class: 'badge level2', text: 'Second chance' }) : null, h('span', { class: 'muted small', text: 'Question ' + Math.min(R.i + 1, R.total + R.extra) + ' of ' + (R.total + R.extra) })),
        qtext,
        q.code ? h('pre', { class: 'qcode' }, h('code', { text: q.code })) : null,
        h('div', { class: 'qopts', role: 'group', 'aria-label': 'Answers (keys 1 to 4)' }, opts),
        h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' })));
      R.opts = opts;
      qtext.focus({ preventScroll: true });
    }

    function answer(i) {
      if (R.answered !== null) return;
      R.answered = i;
      var item = R.queue[R.i], q = item.q, ok = i === item.sh.answer, gained = 0, st = ui.state.stats;
      R.opts.forEach(function (b, j) {
        b.disabled = true;
        if (j === item.sh.answer) b.classList.add('right');
        else if (j === i) b.classList.add('wrong');
      });
      if (!item.retry) {
        st.answers++;
        D.record(q.id, ok);
        if (ok) {
          st.correct++; R.correct++; R.combo++; R.best = Math.max(R.best, R.combo);
          gained = D.xpFor(R.combo); R.xp += gained;
          G.addXp('drill:' + R.id, gained);
        } else {
          R.combo = 0; R.missed.push(q); R.extra++;
          R.queue.push({ q: q, sh: D.shuffled(q), retry: true });
        }
      }
      var bar = stage.querySelector('.round-head .progress span'); // the answered question counts straight away
      if (bar) bar.style.width = (100 * (R.i + 1) / (R.total + R.extra)) + '%';
      G.sound(ok ? 'ok' : 'bad');
      G.buzz(ok ? 20 : [40, 40, 40]);

      var fb = stage.querySelector('.quiz-fb');
      var last = R.i + 1 >= R.queue.length;
      var next = h('button', { class: 'btn big accent', type: 'button', onclick: advance }, last ? 'See results' : 'Continue');
      fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') },
        h('strong', { text: ok ? PRAISE[R.i % PRAISE.length] : 'Not quite.' }), ' ',
        ok ? '' : h('span', null, 'The answer: ', h('b', { text: item.sh.options[item.sh.answer] }), '. '),
        q.why,
        gained ? h('div', { class: 'gain' }, '+' + gained + ' XP' + (R.combo >= 3 ? ' · combo ×' + R.combo : '')) : null,
        !ok && !item.retry ? h('div', { class: 'small' }, 'This one will come back at the end of the round.') : null));
      fb.appendChild(next);
      next.focus({ preventScroll: false });
    }

    function advance() {
      R.i++; R.answered = null;
      if (R.i >= R.queue.length) finish(); else paint();
    }

    function finish() {
      R.finished = true;
      document.removeEventListener('keydown', R.onKey);
      var perfect = R.missed.length === 0 && R.total >= 5, st = ui.state.stats;
      st.drills++;
      if (perfect) { st.perfect++; R.xp += D.PERFECT_BONUS; G.addXp('drill:' + R.id, D.PERFECT_BONUS, 'Flawless round'); }
      if (R.best > st.bestCombo) st.bestCombo = R.best;
      G.quest('drill');
      G.touch();
      R.released = true;
      G.release();
      var pct = Math.round(100 * R.correct / R.total);
      if (pct >= 80) G.confetti(perfect);
      G.sound('done'); G.buzz([30, 40, 30]);
      results(perfect, pct);
    }

    function results(perfect, pct) {
      ui.clear(stage);
      var t = G.today(), qs = G.quests(), left = 3 - (qs.lesson ? 1 : 0) - (qs.drill ? 1 : 0) - (qs.sql ? 1 : 0);
      var li = G.levelInfo();
      stage.appendChild(h('div', { class: 'results' },
        h('div', { class: 'res-ring' }, G.ring(pct, pct === 100), h('b', { text: pct + '%' })),
        h('h2', { id: 'results-title', tabindex: '-1', text: perfect ? 'Perfect round!' : pct >= 60 ? 'Round complete' : 'Good practice' }),
        h('p', { class: 'muted', text: R.correct + ' of ' + R.total + ' right on the first try' + (R.best >= 3 ? ' · best combo ' + R.best : '') }),
        h('div', { class: 'stat-row' },
          [['XP earned', '+' + R.xp], ['Today', t.xp + '/' + t.goal + ' XP'], ['Level ' + li.level, li.next + ' XP to go']].map(function (x) {
            return h('div', { class: 'stat' }, h('b', { text: x[1] }), h('span', { text: x[0] }));
          })),
        left ? h('p', { class: 'muted', text: left + ' daily quest' + (left === 1 ? '' : 's') + ' left today for the bonus chest.' }) : h('p', { class: 'muted', text: 'All daily quests done today. 🎁' }),
        R.missed.length ? h('details', { class: 'missed' }, h('summary', { text: 'Review the ' + R.missed.length + ' you missed' }),
          h('ul', null, R.missed.map(function (q) { return h('li', null, h('strong', { text: q.q }), h('br'), 'Answer: ' + q.options[q.answer], h('br'), h('span', { class: 'muted', text: q.why })); }))) : null,
        h('div', { class: 'row center' },
          h('button', { class: 'btn big accent', type: 'button', onclick: again }, 'One more round'),
          h('a', { class: 'btn big ghost', href: '#/practice' }, 'Done for now'))));
      var hd = stage.querySelector('#results-title'); if (hd) hd.focus({ preventScroll: true });
    }

    function again() {
      D.leave();
      var host = root.parentNode;
      if (host) { ui.clear(host); host.appendChild(play(cat)); window.scrollTo(0, 0); }
    }

    paint();
    return root;
  }

  V.practice = function (params) {
    if (params[0] === 'play') {
      var cat = params[1] && D.topics().indexOf(params[1]) >= 0 ? params[1] : '';
      return play(cat);
    }
    D.leave();
    return lobby();
  };
})();
