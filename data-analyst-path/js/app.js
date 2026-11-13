/* Pages and router. Data lives in js/data/*, shared helpers in ui.js, the SQL Lab in sqllab.js. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h;
  var V = (DA.views = DA.views || {});

  function title(text) { return h('h1', { id: 'view-title', tabindex: '-1', text: text }); }
  function link(href, cls, content) { return h('a', { class: cls, href: href }, content); }
  function list(items, asHtml) { return h('ul', { class: 'ticks' }, items.map(function (t) { return h('li', asHtml ? { html: t } : { text: t }); })); }
  function card(heading, body, cls) { return h('div', { class: 'card ' + (cls || '') }, heading ? h('h3', { text: heading }) : null, body); }
  function weeksFor(hours) { return Math.max(1, Math.ceil(hours / ui.state.profile.hours)); }
  function weeksText(w) { return w < 9 ? w + ' week' + (w === 1 ? '' : 's') : w + ' weeks (about ' + Math.round(w / 4.3) + ' months)'; }

  /* ================================================================ chrome */

  ui.refreshChrome = function () {
    var b = ui.bg(), n = ui.doneCount(), total = DA.lessons.length;
    var chip = document.getElementById('navProfile');
    if (chip) {
      ui.clear(chip);
      chip.appendChild(h('span', { class: 'chip-icon', 'aria-hidden': 'true', html: ui.iconHtml(b ? b.icon : 'sparkle', 20) }));
      chip.appendChild(h('span', null, h('strong', { text: b ? (b.custom ? 'Your background' : b.name) : 'Set your background' }), h('small', { text: b ? 'Edit profile' : 'Personalise the course' })));
    }
    var p = document.getElementById('navProgress');
    if (p) {
      ui.clear(p);
      p.appendChild(h('div', { class: 'small' }, h('strong', { text: n + ' / ' + total }), ' lessons done'));
      p.appendChild(ui.progressBar(100 * n / total, 'Course progress'));
    }
    var note = document.getElementById('sideNote');
    if (note) note.textContent = DA.cloud && DA.cloud.signedIn() ? '☁️ Synced as ' + DA.cloud.user() + '. Sign in with the same account on your other devices.' : 'Your progress is saved on this device. Settings → Sync keeps your phone and computer together.';
    if (DA.game) DA.game.renderHud();
  };

  /* ================================================================ home */

  function greeting() {
    var hr = ui.now().getHours();
    return hr < 5 ? 'Late session?' : hr < 12 ? 'Good morning.' : hr < 18 ? 'Good afternoon.' : 'Good evening.';
  }

  // First unsolved SQL challenge, preferring the dataset that fits the learner's background; cycles back once all are solved.
  function open(x) { if (!DA.sqlLab) return true; var lab = DA.sqlLab(); return DA.labgame.isUnlocked(lab, lab.byId[x.id]); }
  function nextChallenge() {
    var order = [ui.defaultDataset()].concat(Object.keys(DA.datasets).filter(function (d) { return d !== ui.defaultDataset(); }));
    for (var i = 0; i < order.length; i++) {
      var c = DA.challenges.filter(function (x) { return x.ds === order[i] && !ui.state.sql[x.id] && open(x); })[0];
      if (c) return c;
    }
    var pool = DA.challenges.filter(function (x) { return x.ds === order[0]; });
    return pool.length ? ui.seededShuffle(pool, ui.today() + ':sqlcycle')[0] : (DA.challenges[0] || null);
  }

  // This week against your own last week (no invented rivals).
  function raceCard() {
    var r = DA.game.weekRace(), max = Math.max(r.cur, r.prevAll, 1), msg;
    if (!r.prevAll) msg = r.cur ? 'Your first week on record: ' + r.cur + ' XP so far. Next week you race against it.' : 'Earn XP this week and next week you will have a record to beat.';
    else if (r.beaten) msg = 'You have already beaten all of last week (' + r.prevAll + ' XP). 🎉';
    else if (r.ahead >= 0) msg = 'You are ' + r.ahead + ' XP ahead of where you were at this point last week.';
    else msg = (-r.ahead) + ' XP behind last week\'s pace. A practice round is worth about 40.';
    function bar(label, v, cls) {
      return h('div', { class: 'race-row' }, h('span', { class: 'race-label', text: label }),
        h('div', { class: 'race-track' }, h('div', { class: 'race-bar ' + cls, style: 'width:' + Math.max(v ? 3 : 0, 100 * v / max) + '%' })),
        h('b', { text: String(v) }));
    }
    return h('section', { class: 'card race', 'aria-labelledby': 'race-h' },
      h('h2', { id: 'race-h', text: 'You vs. last week' }),
      bar('This week', r.cur, 'now'),
      r.prevAll ? bar('Last week by now', r.prevSame, 'then') : null,
      r.prevAll ? bar('Last week, total', r.prevAll, 'all') : null,
      h('p', { class: 'muted small', text: msg }));
  }

  function todayCard() {
    var G = DA.game, t = G.today(), st = t.streak, qs = t.quests, nx = ui.nextLesson(), due = DA.drill.dueCount(), sq = nextChallenge();
    var left = Math.max(0, t.goal - t.xp), msg, offer = G.repairOffer(), boost = G.boostLeft();
    var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); // on a phone, tiles beat typing SQL
    if (t.met) msg = 'Daily goal reached. Anything more today is a bonus.';
    else if (st.count > 0 && st.atRisk) msg = left + ' XP keeps your ' + st.count + '-day streak going.';
    else msg = left + ' XP today' + (st.count ? '' : ' starts a streak') + '.';
    var rows = [
      { done: qs.lesson, icon: '📘', name: 'Learn', text: 'Complete a mission, or save a quiz answer or a note', href: nx ? '#/mission/' + nx.id : '#/journey', cta: 'Go' },
      { done: qs.drill, icon: '⚡', name: 'Practise', text: due ? due + ' due for review · a 5-question round or a mission Check' : 'A 5-question round or a mission Check, about 2 minutes', href: '#/practice/play', cta: 'Start' },
      touch
        ? { done: qs.sql, icon: '🧱', name: 'Code', text: 'Solve a mission Try challenge, or 3 SQL blocks puzzles (no typing)', href: '#/arcade/blocks/next', cta: 'Build' }
        : { done: qs.sql, icon: '🗄️', name: 'Code', text: sq ? 'Solve a SQL challenge: ' + sq.title : 'Practise in SQLab', href: sq ? '#/lab/' + sq.ds + '/' + sq.id : '#/lab', cta: 'Open' },
    ];
    return h('section', { class: 'card today', 'aria-labelledby': 'today-h' },
      h('div', { class: 'today-top' },
        h('div', { class: 'today-ring' }, G.ring(t.pct, t.met), h('b', { text: t.met ? '✓' : t.xp + '/' + t.goal })),
        h('div', { class: 'grow' }, h('h2', { id: 'today-h', text: 'Today' }), h('p', { class: 'muted', text: msg })),
        h('div', { class: 'streak-big t' + G.flameTier(st.count) + (st.metToday ? ' lit' : ''), 'aria-label': st.count + ' day streak' }, ui.icon('flame', 20), h('b', { text: String(st.count) }), h('small', { text: st.count === 1 ? 'day' : 'days' }))),
      h('ul', { class: 'quests' }, rows.map(function (r) {
        return h('li', { class: r.done ? 'done' : '' },
          h('span', { class: 'q-check', 'aria-hidden': 'true', text: r.done ? '✓' : '' }),
          h('span', { class: 'q-ico', 'aria-hidden': 'true', html: ui.iconHtml(r.icon, 20) }),
          h('span', { class: 'grow' }, h('strong', { text: r.name }), r.done ? h('span', { class: 'sr-only', text: ' (done today)' }) : null, h('small', { text: r.text })),
          r.done ? null : h('a', { class: 'btn small' + (r === rows[0] || !rows[0].done ? '' : ''), href: r.href }, r.cta));
      })),
      h('p', { class: 'chest' + (qs.all ? ' open' : '') },
        ui.icon(qs.all ? 'party' : 'chest', 18), ' ',
        qs.all ? 'Quest chest opened: +' + qs.chest + ' bonus XP' : 'Finish all three for a surprise chest of 15 to 40 bonus XP'),
      boost > 0 ? h('p', { class: 'boost-line' }, ui.icon('bolt', 16), ' Double XP for ' + Math.ceil(boost / 60000) + ' more min') : null,
      offer ? h('p', { class: 'repair-line' }, ui.icon('shield', 16), ' Streak repair: ' + (offer.left ? 'earn ' + offer.left + ' more XP today' : 'done') + ' and your ' + offer.streak + '-day streak comes back.') : null,
      st.freezes ? h('p', { class: 'muted small', text: '❄️ ' + st.freezes + ' streak freeze' + (st.freezes === 1 ? '' : 's') + ' saved: a missed day will not break your streak.' }) : null);
  }


  function continueButton() {
    var J = DA.journey, cur = J.current();
    if (!cur) {
      var open = DA.modules.filter(function (m) { return !J.boss(m.id).won; })[0];
      return open ? h('a', { class: 'continue-btn', href: '#/boss/' + open.id },
        h('span', { class: 'grow' }, h('small', { text: 'Every mission done · Boss case' }), h('strong', { text: J.boss(open.id).title })),
        h('span', { class: 'cont-go', 'aria-hidden': 'true', text: '→' })) : null;
    }
    var l = cur.lesson, col = DA.unitColor(DA.modules.indexOf(l.module)), fresh = ui.doneCount() === 0 && cur.index === 1;
    return h('a', { class: 'continue-btn', href: '#/mission/' + l.id + '/' + cur.step, style: '--mc:' + col[0] + ';--mcd:' + col[1] },
      h('span', { class: 'grow' },
        h('small', { text: (fresh ? 'Start' : 'Continue') + ' · Mission ' + l.number + ' · Step ' + cur.index + ' of ' + cur.total + ': ' + J.NAMES[cur.step] }),
        h('strong', { text: l.title })),
      h('span', { class: 'cont-go', 'aria-hidden': 'true', text: '▶' }));
  }

  V.home = function () {
    var b = ui.bg();
    var root = h('div', { class: 'view home' });

    if (!b) {
      root.appendChild(h('section', { class: 'hero' },
        h('p', { class: 'eyebrow', text: 'Free · hands-on · AI-assisted' }),
        title('Become a data analyst, starting from what you already know.'),
        h('p', { class: 'lead', text: 'A step-by-step path built around your own background, in ten minutes a day: bite-size lessons, a feed of data stories, quick games, SQLab and an AI tutor you know how to use.' }),
        DA.mascot.say('happy', 'Hi, I\'m Dot. Tell me where you come from and I will tune everything to you.', link('#/profile', 'btn accent', 'Start (1 minute)')),
        h('div', { class: 'row' },
          link('#/feed', 'btn big ghost', 'Peek at Discover'),
          link('#/journey', 'btn big ghost', 'See the journey'))));
    } else {
      var G = DA.game, n = ui.doneCount(), total = DA.lessons.length, li = G.levelInfo();
      var remaining = DA.totalHours - ui.doneHours(), line = DA.mascot.homeLine();
      root.appendChild(h('section', { class: 'hero-card' },
        h('div', { class: 'hero-top' },
          h('div', { class: 'grow' },
            h('p', { class: 'eyebrow', text: b.icon + ' ' + (b.custom ? 'Your own background' : b.name) }),
            title(n === total ? 'You finished the course. 🎉' : greeting()),
            ui.state.profile.goal ? h('p', { class: 'hero-goal' }, 'Goal: ', h('strong', { text: ui.state.profile.goal })) : null),
          h('a', { class: 'hero-level', href: '#/me', 'aria-label': 'Level ' + li.level + ', ' + li.title + '. ' + li.next + ' XP to the next level.' },
            h('small', { text: 'LEVEL' }), h('b', { text: String(li.level) }), h('span', { text: li.title }))),
        continueButton(),
        DA.mascot.say(line.mood, line.text, line.href ? link(line.href, 'btn small', line.cta) : null)));

      root.appendChild(todayCard());
      if (DA.pwa) { var inst = DA.pwa.installCard(); if (inst) root.appendChild(inst); }

      var teaser = DA.feed.teaser();
      if (teaser) root.appendChild(teaser);
      root.appendChild(raceCard());

      root.appendChild(h('section', { class: 'section tight' }, h('h2', { text: 'Arcade' }), DA.arcade.tiles()));

      var grid = h('div', { class: 'grid-2' });
      grid.appendChild(card('Level ' + li.level + ' · ' + li.title, h('div', null,
        ui.progressBar(li.pct, 'Progress to level ' + (li.level + 1)),
        h('p', { class: 'muted small', text: li.xp + ' XP · ' + li.next + ' to level ' + (li.level + 1) }),
        link('#/me', 'small', 'Badges and streak →'))));
      grid.appendChild(card('Course progress', h('div', null,
        ui.progressBar(100 * n / total, 'Course progress'),
        h('p', { class: 'muted small', text: n + ' of ' + total + ' lessons · ' + (remaining > 0 ? 'about ' + weeksText(weeksFor(remaining)) + ' to go at ' + ui.state.profile.hours + ' h / week' : 'course complete') }),
        link('#/journey', 'small', 'Open your journey →'))));
      root.appendChild(grid);

      root.appendChild(h('details', { class: 'card fold' },
        h('summary', null, h('strong', { text: 'Your edge, your gaps and a first project idea' })),
        h('div', { class: 'grid-2' }, card('Your edge', list(b.strengths), 'good'), card('Gaps to close', list(b.gaps), 'gap')),
        h('p', null, h('strong', { text: 'Project idea: ' }), b.projects[0], ' ', link('#/lesson/l7-1', 'small', 'More ideas →'))));
    }

    if (!b) {
      root.appendChild(h('section', { class: 'section' },
        h('h2', { text: 'How it works' }),
        h('div', { class: 'grid-3' },
          card('1. Tell us where you come from', h('p', { text: 'Science, finance, sport, teaching, software, operations… or your own words. You get examples, practice data and project ideas from your world.' })),
          card('2. Follow a realistic roadmap', h('p', { text: DA.lessons.length + ' lessons in ' + DA.modules.length + ' modules, about ' + Math.round(DA.totalHours) + ' hours. Each one has key ideas, a hands-on task, a quiz and notes.' })),
          card('3. Learn with AI, the right way', h('p', { text: 'Every lesson has a ready-made prompt that already knows your background, plus rules to verify what AI tells you and a library of ' + (DA.prompts.length + DA.lessons.length) + ' prompts.' })))));
      root.appendChild(h('section', { class: 'section' },
        h('h2', { text: 'What you will be able to do' }),
        list([
          'Clean a messy file and answer business questions with formulas and pivot tables.',
          'Write SQL with joins, CTEs and window functions (practised in the built-in lab, with answers checked automatically).',
          'Load, clean, summarise and plot data with Python and pandas.',
          'Use statistics honestly: uncertainty, A/B tests, and the difference between correlation and causation.',
          'Build a dashboard and present the result as a story.',
          'Use AI to go faster and still verify what it gives you.',
          'Publish 3 portfolio projects and prepare for interviews.',
        ])));
      root.appendChild(ui.callout('info', 'Realistic expectations. ', 'The plan is about ' + Math.round(DA.totalHours) + ' hours of focused work. At 8 hours a week that is roughly 4 months. It prepares you for junior analyst applications; it cannot promise a job, because that depends on your market, projects and persistence.'));
    }

    // module overview (first visit only: afterwards the Path tab shows it)
    if (!b) {
      root.appendChild(h('section', { class: 'section' },
        h('h2', { text: 'The path at a glance' }),
        h('div', { class: 'modules-mini' }, DA.modules.map(function (m) {
          return link('#/journey', 'mini', [h('span', { class: 'mini-icon', 'aria-hidden': 'true', text: m.icon }), h('span', null, h('strong', { text: m.title }), h('small', { text: m.lessons.length + ' lessons' }))]);
        }))));
    }
    return root;
  };

  /* ================================================================ profile */

  V.profile = function () {
    var p = ui.state.profile;
    var root = h('div', { class: 'view' });
    root.appendChild(title('Your profile'));
    root.appendChild(h('p', { class: 'lead', text: 'Your answers personalise the examples, the practice data, the project ideas and every AI prompt. They are saved only in this browser.' }));

    var chosen = p.bg;
    var custom = h('textarea', { id: 'customBg', rows: '3', maxlength: '500', placeholder: 'e.g. "I was a bartender and then a logistics coordinator for 6 years; I used Excel daily and managed rotas and stock."', 'aria-label': 'Describe your background' });
    custom.value = p.custom;
    var customBox = h('div', { class: 'custom-box' }, h('label', { for: 'customBg', text: 'Describe your background in a sentence or two' }), custom,
      h('p', { class: 'muted small', text: 'This text is added to your AI prompts. Do not include your name, employer or anything private.' }));

    var cards = h('div', { class: 'bg-grid' }, DA.backgrounds.map(function (b) {
      var input = h('input', { type: 'radio', name: 'bg', value: b.id, checked: b.id === chosen, onchange: function () { chosen = b.id; paint(); } });
      return h('label', { class: 'bg-card' }, input, h('span', { class: 'bg-icon', 'aria-hidden': 'true', text: b.icon }), h('span', { class: 'bg-name', text: b.name }), h('span', { class: 'bg-blurb', text: b.blurb }));
    }));
    function paint() {
      var b = DA.backgrounds.filter(function (x) { return x.id === chosen; })[0];
      customBox.classList.toggle('hidden', !(b && b.custom));
    }
    paint();

    var hoursOut = h('output', { for: 'hours', text: p.hours + ' hours / week' });
    var hours = h('input', { id: 'hours', type: 'range', min: '2', max: '30', step: '1', value: String(p.hours), oninput: function () { hoursOut.textContent = hours.value + ' hours / week'; } });
    var lang = h('select', { id: 'lang' }, DA.languages.map(function (l) { return h('option', { value: l[0], selected: l[0] === p.lang }, l[1] + (l[0] === l[1] ? '' : ' (' + l[0] + ')')); }));
    var goal = h('input', { id: 'goal', type: 'text', maxlength: '200', placeholder: 'e.g. Junior data analyst in healthcare', value: p.goal });
    var msg = h('p', { class: 'form-msg', role: 'alert' });

    var form = h('form', { class: 'profile-form', onsubmit: function (e) {
      e.preventDefault();
      if (!chosen) { msg.textContent = 'Please choose the background that fits you best (or "Something else").'; return; }
      p.bg = chosen; p.custom = custom.value.trim(); p.hours = Number(hours.value); p.lang = lang.value; p.goal = goal.value.trim();
      ui.save(); ui.refreshChrome(); ui.toast('Profile saved. Your course is personalised.');
      location.hash = '#/';
    } },
      h('fieldset', null, h('legend', { text: '1. Where do you come from?' }), cards, customBox),
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' }, h('label', { for: 'hours', text: '2. How much time can you study?' }), hours, hoursOut),
        h('div', { class: 'field' }, h('label', { for: 'lang', text: '3. Language for AI answers' }), lang, h('p', { class: 'muted small', text: 'The site is in English. Your AI prompts will ask for answers in this language.' }))),
      h('div', { class: 'field' }, h('label', { for: 'goal', text: '4. Your goal (optional)' }), goal),
      msg,
      h('button', { class: 'btn big accent', type: 'submit' }, p.bg ? 'Save profile' : 'Save and start'));
    root.appendChild(form);

    root.appendChild(h('p', { class: 'muted' }, 'Daily goal, theme, reminders, installing the app and moving progress between devices are in ', link('#/settings', '', 'Settings'), '.'));
    return root;
  };

  /* ================================================================ lesson */

  function quizBlock(l) {
    var q = l.quiz, G = DA.game;
    var order = ui.seededShuffle(q.options.map(function (_, i) { return i; }), l.id); // stable display order, not always "B"
    var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
    var opts = order.map(function (orig, pos) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { choose(pos, true); } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + pos) }), h('span', { text: q.options[orig] }));
    });
    function choose(pos, store) {
      var orig = order[pos], ok = orig === q.answer;
      opts.forEach(function (b, j) { b.classList.remove('right', 'wrong'); b.setAttribute('aria-pressed', j === pos ? 'true' : 'false'); });
      opts[pos].classList.add(ok ? 'right' : 'wrong');
      ui.clear(fb);
      fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? 'Correct. ' : 'Not quite. Try another answer. ' }), ok ? q.why : ''));
      if (!store) return;
      var prev = ui.state.quiz[l.id];
      if (!(prev && prev.ok)) { ui.state.quiz[l.id] = { sel: orig, ok: ok }; ui.save(); } // a right answer is never overwritten
      G.sound(ok ? 'ok' : 'bad');
      if (ok) {
        G.buzz(20);
        G.award('quiz:' + l.id, ui.XP.quiz, 'Quiz correct');
        G.quest('lesson');
      }
    }
    var saved = ui.state.quiz[l.id];
    if (saved) choose(order.indexOf(saved.sel), false);
    return h('div', { class: 'quiz' }, h('p', { class: 'quiz-q', text: q.q }), h('div', { class: 'quiz-opts' }, opts), fb);
  }

  function conceptBlock(l) {
    var b = ui.bg(), label = DA.conceptLabels[l.concept], text = b && b.analogies && b.analogies[l.concept];
    if (text) return ui.callout('world', '🌍 In your world: ' + label + ' (' + b.name + ')', h('p', { text: text }));
    if (b && b.custom) {
      return ui.callout('world', '🌍 In your world: ' + label, h('div', null,
        h('p', { class: 'muted', text: 'Get an analogy built from your own description:' }),
        ui.promptCard({ title: 'Analogy from my background', text: 'Explain "' + label + '" in data analysis using an analogy from my background: {{bg}}. Give one short concrete example and one common mistake.\n{{lang}}' })));
    }
    return ui.callout('world', '🌍 In your world: ' + label, h('p', null, link('#/profile', '', 'Choose your background'), ' to see this concept explained with examples from your own field.'));
  }

  function toolsFor(l) {
    var tools = [];
    if (l.download === 'retail') tools.push(h('button', { class: 'btn small', type: 'button', onclick: function () { ui.download('retail_orders.csv', DA.gen.retailCsv(), 'text/csv;charset=utf-8'); ui.toast('Downloaded retail_orders.csv'); } }, '⬇ Download café sales CSV (≈6,500 rows)'));
    if (l.download === 'messy') tools.push(h('button', { class: 'btn small', type: 'button', onclick: function () { ui.download('messy_orders.csv', '\ufeff' + DA.gen.messyCsv(), 'text/csv;charset=utf-8'); ui.toast('Downloaded messy_orders.csv'); } }, '⬇ Download messy orders CSV'));
    if (l.module.id === 'm1') tools.push(link('#/sheets/' + (l.download || 'retail') + '/' + l.id, 'btn small', '📊 Open ' + DA.labgame.names.sheets));
    if (l.module.id === 'm3') tools.push(link('#/python/' + l.id, 'btn small', '🐍 Open ' + DA.labgame.names.python));
    if (l.module.id === 'm5') tools.push(link('#/bi/' + l.id, 'btn small', '📈 Open ' + DA.labgame.names.bi));
    if (l.lab) {
      var dsId = l.lab === 'auto' ? ui.defaultDataset() : l.lab;
      tools.push(link('#/lab/' + dsId, 'btn small', '🗄️ Open SQLab · ' + DA.datasets[dsId].title));
    }
    return tools.length ? h('div', { class: 'row' }, tools) : null;
  }

  function extrasFor(l) {
    var b = ui.bg(), out = [null, null, null];
    if (l.showProjects) {
      out[0] = h('section', { class: 'block' }, h('h2', { text: 'Project ideas for your background' }),
        b ? list(b.projects) : h('p', null, link('#/profile', '', 'Choose your background'), ' to see ideas from your own field.'));
    }
    if (l.showResume) {
      out[1] = h('section', { class: 'block' }, h('h2', { text: 'How your experience translates' }),
        b ? h('ul', { class: 'ticks' }, b.resume.map(function (r) {
          var parts = r.split(' → ');
          return h('li', null, parts.length === 2 ? [h('span', { class: 'muted', text: parts[0] }), h('br'), h('strong', { text: '→ ' + parts[1] })] : r);
        })) : h('p', null, link('#/profile', '', 'Choose your background'), ' to see examples.'));
    }
    if (l.links && l.links.length) {
      out[2] = h('section', { class: 'block' }, h('h2', { text: 'Resources' }),
        h('ul', { class: 'links' }, l.links.map(function (x) { return h('li', null, h('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer', text: x.label })); })));
    }
    return out;
  }

  function notesBlock(l) {
    var notes = h('textarea', { class: 'notes', rows: '4', placeholder: 'What did you learn? What is still unclear? What will you ask your AI tutor?', 'aria-label': 'My notes for ' + l.title, maxlength: '5000' });
    notes.value = ui.state.notes[l.id] || '';
    var t;
    notes.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (notes.value.trim()) ui.state.notes[l.id] = notes.value; else delete ui.state.notes[l.id];
        ui.save();
        if (notes.value.trim().length >= 20) { DA.game.award('note:' + l.id, ui.XP.note, 'Note saved'); DA.game.quest('lesson'); }
      }, 700);
    });
    return h('div', null, notes, h('p', { class: 'muted small', text: 'Saved automatically in this browser.' }));
  }

  DA.lessonUI = { concept: conceptBlock, tools: toolsFor, notes: notesBlock, extras: function (l) { return extrasFor(l).filter(Boolean); } };

  V.lesson = function (params) {
    var l = DA.lessonById[params[0]];
    if (!l) return V.notFound();
    var root = h('div', { class: 'view lesson' });
    root.appendChild(h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, link('#/journey', '', 'Journey'), ' › ', l.module.icon + ' ' + l.module.title));
    root.appendChild(title(l.number + '  ' + l.title));
    root.appendChild(h('p', null, link('#/mission/' + l.id, 'btn accent', '▶ Play this as a mission'), ' ', h('span', { class: 'muted small', text: 'Brief, learn, try, check and debrief, step by step.' })));
    var doneBtn = h('button', { class: 'btn', type: 'button' });
    var nextLink = h('span');
    root.appendChild(h('p', { class: 'meta' }, h('span', { class: 'pill', text: '⏱ about ' + ui.fmtHours(l.hours) }), ' ', h('span', { class: 'pill', text: l.module.title }), ' ', h('span', { class: 'pill xp', text: '⭐ up to ' + (ui.XP.lesson(l) + ui.XP.quiz + ui.XP.note) + ' XP' })));
    root.appendChild(h('p', { class: 'lead', text: l.why }));

    if (l.concept) root.appendChild(conceptBlock(l));

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '1 · Key ideas' }), list(l.learn, true)));
    if (l.code) root.appendChild(ui.codeBlock(l.code));
    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '2 · Do it' }), h('div', { class: 'doit' }, h('p', { html: l.doit })), toolsFor(l)));
    extrasFor(l).slice(0, -1).forEach(function (x) { if (x) root.appendChild(x); });

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '3 · AI move' }),
      h('p', { class: 'muted', text: 'Your tutor prompt for this lesson. It already includes your background. Fill in the blanks and send it.' }),
      ui.promptCard(l.ai)));

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '4 · Check yourself' }), quizBlock(l)));
    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '5 · My notes' }), notesBlock(l)));
    extrasFor(l).slice(-1).forEach(function (x) { if (x) root.appendChild(x); });

    // completion + navigation
    function paintDone() {
      var d = !!ui.state.done[l.id];
      doneBtn.className = 'btn big ' + (d ? 'ghost' : 'accent');
      doneBtn.textContent = d ? '✔ Completed (click to undo)' : 'Mark lesson as complete';
      doneBtn.setAttribute('aria-pressed', d ? 'true' : 'false');
      ui.clear(nextLink);
      var nx = DA.lessons[l.index + 1];
      if (d) {
        nextLink.appendChild(link('#/practice/play/' + encodeURIComponent(l.module.cat), 'btn big', '⚡ 2-minute practice on ' + l.module.cat));
        if (nx) nextLink.appendChild(link('#/mission/' + nx.id, 'btn big ghost', 'Next mission: ' + nx.title + ' →'));
      }
    }
    doneBtn.addEventListener('click', function () {
      var G = DA.game, on = !ui.state.done[l.id];
      DA.journey.complete(l.id, on);
      ui.refreshChrome(); paintDone();
      if (on) { G.confetti(false); G.sound('done'); G.buzz(30); }
    });
    paintDone();
    var prev = DA.lessons[l.index - 1], nxt = DA.lessons[l.index + 1];
    root.appendChild(h('div', { class: 'complete-row' }, doneBtn, nextLink));
    root.appendChild(h('nav', { class: 'prevnext', 'aria-label': 'Lesson navigation' },
      prev ? link('#/lesson/' + prev.id, 'btn ghost', '← ' + prev.title) : h('span'),
      nxt ? link('#/lesson/' + nxt.id, 'btn ghost', nxt.title + ' →') : h('span')));
    return root;
  };

  /* ================================================================ prompt library */

  V.prompts = function (params) {
    var root = h('div', { class: 'view' });
    root.appendChild(title('Prompt library'));
    var b = ui.bg();
    root.appendChild(h('p', { class: 'lead', text: 'Ready-to-use prompts for learning with AI. They are personalised with your background, and you can fill in the blanks right here before you send them.' }));
    root.appendChild(ui.callout('info', 'Personalised for: ', h('span', null, b ? (b.custom ? 'your own description' : b.name) : 'no background chosen yet', ' · answers in ' + ui.state.profile.lang + ' · ', link('#/profile', '', 'change'))));

    var all = DA.prompts.map(function (p) { return { cat: p.cat, title: p.title, text: p.text }; });
    DA.modules.forEach(function (m) {
      m.lessons.forEach(function (l) { all.push({ cat: m.cat, title: l.ai.title, text: l.ai.text, from: l }); });
    });
    var cat = params[0] && DA.promptCategories.indexOf(params[0]) >= 0 ? params[0] : 'All';
    var q = '';
    var chipsBox = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' });
    var count = h('p', { class: 'muted small', role: 'status', 'aria-live': 'polite' });
    var results = h('div', { class: 'prompt-list' });

    function paint() {
      ui.clear(chipsBox);
      ['All'].concat(DA.promptCategories).forEach(function (c) {
        chipsBox.appendChild(h('button', { class: 'chip' + (c === cat ? ' active' : ''), type: 'button', 'aria-pressed': c === cat ? 'true' : 'false', onclick: function () { cat = c; paint(); } }, c));
      });
      var needle = q.toLowerCase();
      var shown = all.filter(function (p) { return (cat === 'All' || p.cat === cat) && (!needle || (p.title + ' ' + p.text).toLowerCase().indexOf(needle) >= 0); });
      count.textContent = shown.length + ' prompt' + (shown.length === 1 ? '' : 's');
      ui.clear(results);
      shown.forEach(function (p) {
        var body = h('div', { class: 'prompt-body' });
        var d = h('details', { class: 'prompt-item' },
          h('summary', null, h('span', { class: 'badge', text: p.cat }), h('span', { class: 'ptitle', text: p.title })),
          body);
        d.addEventListener('toggle', function () {
          if (d.open && !body.firstChild) {
            body.appendChild(ui.promptCard({ text: p.text }));
            if (p.from) body.appendChild(h('p', { class: 'muted small' }, 'Used in lesson ', link('#/lesson/' + p.from.id, '', p.from.number + ' ' + p.from.title)));
          }
        });
        results.appendChild(d);
      });
      if (!shown.length) results.appendChild(h('p', { class: 'muted', text: 'No prompts match. Try another word or category.' }));
    }
    var search = h('input', { type: 'search', class: 'search', placeholder: 'Search prompts (e.g. join, interview, chart)…', 'aria-label': 'Search prompts', oninput: function (e) { q = e.target.value.trim(); paint(); } });
    root.appendChild(search);
    root.appendChild(chipsBox);
    root.appendChild(count);
    root.appendChild(results);
    paint();
    return root;
  };

  /* ================================================================ AI toolbox */

  V.tools = function () {
    var root = h('div', { class: 'view' });
    root.appendChild(title('AI toolbox and rules'));
    root.appendChild(h('p', { class: 'lead', text: 'Which tools to use for what, and the seven habits that keep AI making you better instead of lazier.' }));

    root.appendChild(h('section', { class: 'section' }, h('h2', { text: 'Seven rules for learning with AI' }),
      h('ol', { class: 'rules' }, DA.aiRules.map(function (r) { return h('li', null, h('strong', { text: r[0] }), h('span', { text: r[1] })); }))));

    root.appendChild(ui.callout('warn', 'Privacy first. ', 'Never paste personal data (names, emails, patient or student records) or confidential company data into a public AI tool. Share the schema and a few invented or anonymised rows instead. If your job already involves data, check your employer\'s AI policy.'));

    root.appendChild(h('section', { class: 'section' }, h('h2', { text: 'Tools worth knowing' }),
      h('p', { class: 'muted', text: 'Products, free tiers and features change quickly. Check current plans, and prefer learning the concepts over the buttons.' }),
      h('div', { class: 'grid-2' }, DA.tools.map(function (t) {
        return card(t.name, h('div', null, h('p', { class: 'muted small', text: t.examples }), h('p', null, h('strong', { text: 'Use it for: ' }), t.use), h('p', null, h('strong', { text: 'Watch out: ' }), t.watch)));
      }))));

    root.appendChild(h('section', { class: 'section' }, h('h2', { text: 'Free places to practise' }),
      h('ul', { class: 'links' }, [
        ['SQLBolt', 'https://sqlbolt.com', 'short interactive SQL lessons'],
        ['SQLZoo', 'https://sqlzoo.net', 'SQL exercises with instant feedback'],
        ['PG Exercises', 'https://pgexercises.com', 'harder PostgreSQL practice'],
        ['Kaggle Learn', 'https://www.kaggle.com/learn', 'micro-courses in pandas, SQL, visualisation'],
        ['Google Colab', 'https://colab.research.google.com', 'Python notebooks in the browser'],
        ['Tableau Public', 'https://public.tableau.com', 'free dashboards you can publish'],
        ['Our World in Data', 'https://ourworldindata.org', 'clean public datasets and charts'],
      ].map(function (x) { return h('li', null, h('a', { href: x[1], target: '_blank', rel: 'noopener noreferrer', text: x[0] }), ' · ' + x[2]); }))));
    root.appendChild(link('#/prompts', 'btn accent', 'Open the prompt library →'));
    return root;
  };

  V.notFound = function () {
    return h('div', { class: 'view' }, title('Page not found'), h('p', null, 'That page does not exist. ', link('#/', '', 'Go to the start'), '.'));
  };

  /* ================================================================ router */

  var routes = { '': 'home', profile: 'profile', roadmap: 'journey', journey: 'journey', mission: 'mission', boss: 'boss', lesson: 'lesson', lab: 'lab', sheets: 'sheets', python: 'python', bi: 'bi', practice: 'practice', feed: 'feed', collection: 'collection', arcade: 'arcade',
    me: 'me', settings: 'settings', prompts: 'prompts', tools: 'tools' };
  var navOf = { '': 'home', lesson: 'journey', roadmap: 'journey', mission: 'journey', boss: 'journey', collection: 'feed',
    lab: 'practice', sheets: 'practice', python: 'practice', bi: 'practice', arcade: 'practice', settings: 'me', prompts: 'me', tools: 'me', profile: 'me' };
  // Phones: deep screens get a back link to their parent (labs, missions and games have their own).
  var parentOf = { lesson: ['#/journey', 'Journey'], settings: ['#/me', 'You'], prompts: ['#/me', 'You'], tools: ['#/me', 'You'], profile: ['#/me', 'You'],
    collection: ['#/feed', 'Discover'], arcade: ['#/practice', 'Practice'] };

  function parse() {
    var parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(function (s) {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    return { name: parts[0] || '', params: parts.slice(1) };
  }

  function render() {
    if (DA.drill && DA.drill.leave) DA.drill.leave(); // leaving a practice round releases held celebrations
    if (DA.feed && DA.feed.leave) DA.feed.leave();
    if (DA.arcade && DA.arcade.leave) DA.arcade.leave();
    if (DA.labgame) DA.labgame.embed = null;
    ui.closeSheets();
    var r = parse(), view = V[routes[r.name]] || V.notFound, node;
    try { node = view(r.params); } catch (err) {
      if (window.console) console.error(err);
      node = h('div', { class: 'view' }, title('Something went wrong'), h('p', { text: 'This page failed to load. Try going back to the start.' }), link('#/', 'btn', 'Go to the start'));
    }
    var main = document.getElementById('view');
    ui.clear(main);
    var up = parentOf[r.name];
    if (up && !(r.name === 'arcade' && r.params.length)) main.appendChild(h('a', { class: 'backbar', href: up[0] }, h('span', { 'aria-hidden': 'true', text: '← ' }), up[1]));
    main.appendChild(node);
    var nav = navOf[r.name] !== undefined ? navOf[r.name] : r.name;
    var side = document.querySelector('.sidebar [data-nav="' + r.name + '"]') ? r.name : nav;
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      var on = a.getAttribute('data-nav') === (a.closest('.sidebar') ? side : nav);
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var t = document.getElementById('view-title');
    document.title = (t ? t.textContent.replace(/\s+/g, ' ').trim() + ' · ' : '') + 'Data Analyst Path';
    window.scrollTo(0, 0);
    if (t) t.focus({ preventScroll: true });
    document.body.classList.remove('menu-open');
    var mb = document.getElementById('menuBtn');
    if (mb) mb.setAttribute('aria-expanded', 'false');
  }

  DA.render = function () { render(); };

  // The on-screen keyboard: --kb is how much of the layout it covers (iOS), so sticky action bars can sit above it.
  function watchKeyboard() {
    var vv = window.visualViewport;
    if (!vv) return;
    function kb() {
      var k = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      document.documentElement.style.setProperty('--kb', k + 'px');
      var el = document.activeElement, typing = !!el && /^(TEXTAREA|INPUT)$/.test(el.tagName);
      document.body.classList.toggle('kb-open', k > 80 || (typing && window.innerHeight < 480));
    }
    vv.addEventListener('resize', kb);
    vv.addEventListener('scroll', kb);
    document.addEventListener('focusin', kb);
    document.addEventListener('focusout', function () { setTimeout(kb, 50); });
    kb();
  }

  document.addEventListener('DOMContentLoaded', function () {
    ui.applyTheme();
    watchKeyboard();
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', function () { ui.applyTheme(); });
    }
    if (DA.pwa) {
      DA.pwa.register();
      document.addEventListener('pwa-installable', function () { if (parse().name === '') render(); });
    }
    var boostWas = false;
    setInterval(function () { // keep the double-XP countdown fresh, and clear it when it ends
      var on = DA.game.boostLeft() > 0;
      if (on || boostWas) ui.refreshChrome();
      boostWas = on;
    }, 20000);
    if (DA.reminder) DA.reminder.sync();
    var mb = document.getElementById('menuBtn');
    var closeMb = document.getElementById('sidebarCloseBtn');
    function setMenu(open) {
      document.body.classList.toggle('menu-open', !!open);
      if (mb) mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (mb) {
      mb.addEventListener('click', function () {
        var open = !document.body.classList.contains('menu-open');
        setMenu(open);
        if (open) {
          try { history.pushState({ menu: true }, ''); } catch (e) {}
        }
      });
    }
    if (closeMb) {
      closeMb.addEventListener('click', function () {
        setMenu(false);
      });
    }
    window.addEventListener('popstate', function () {
      if (document.body.classList.contains('menu-open')) {
        setMenu(false);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); if (mb) mb.focus(); }
    });
    var scrim = document.getElementById('scrim');
    if (scrim) scrim.addEventListener('click', function () { setMenu(false); });
    window.addEventListener('hashchange', render);
    // Progress that arrives from another device: refresh the pages where nothing is being typed or played.
    document.addEventListener('cloud-merged', function () {
      ui.refreshChrome();
      if (['', 'me', 'roadmap', 'journey'].indexOf(parse().name) >= 0) { var y = window.scrollY; render(); window.scrollTo(0, y); }
      ui.toast('☁️ Progress synced from your other device.');
    });
    document.addEventListener('cloud-status', function () { ui.refreshChrome(); });
    ui.refreshChrome();
    render();
    if (DA.cloud) DA.cloud.start();
  });
})();
