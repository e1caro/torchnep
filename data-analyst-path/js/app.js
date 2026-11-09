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
      chip.appendChild(h('span', { class: 'chip-icon', 'aria-hidden': 'true', text: b ? b.icon : '👋' }));
      chip.appendChild(h('span', null, h('strong', { text: b ? (b.custom ? 'Your background' : b.name) : 'Set your background' }), h('small', { text: b ? 'Edit profile' : 'Personalise the course' })));
    }
    var p = document.getElementById('navProgress');
    if (p) {
      ui.clear(p);
      p.appendChild(h('div', { class: 'small' }, h('strong', { text: n + ' / ' + total }), ' lessons done'));
      p.appendChild(ui.progressBar(100 * n / total, 'Course progress'));
    }
  };

  /* ================================================================ home */

  V.home = function () {
    var b = ui.bg();
    var root = h('div', { class: 'view home' });

    if (!b) {
      root.appendChild(h('section', { class: 'hero' },
        h('p', { class: 'eyebrow', text: 'Free · hands-on · AI-assisted' }),
        title('Become a data analyst, starting from what you already know.'),
        h('p', { class: 'lead', text: 'A step-by-step course built around your own background. Learn spreadsheets, SQL, Python, statistics and dashboards, with an AI tutor you know how to use, and a SQL lab that runs in your browser.' }),
        h('div', { class: 'row' },
          link('#/profile', 'btn big accent', 'Start: tell me your background (1 minute)'),
          link('#/roadmap', 'btn big ghost', 'See the roadmap'))));
    } else {
      var next = ui.nextLesson(), n = ui.doneCount(), total = DA.lessons.length;
      var remaining = DA.totalHours - ui.doneHours();
      root.appendChild(h('section', { class: 'hero compact' },
        h('p', { class: 'eyebrow', text: b.icon + ' ' + (b.custom ? 'Your own background' : b.name) }),
        title(n === 0 ? 'Your plan is ready. Let\'s start.' : n === total ? 'You finished the course. 🎉' : 'Welcome back.'),
        ui.state.profile.goal ? h('p', { class: 'lead' }, 'Your goal: ', h('strong', { text: ui.state.profile.goal })) : h('p', { class: 'lead', text: 'Everything below is tuned to your background: examples, practice data, portfolio ideas and AI prompts.' })));

      var grid = h('div', { class: 'grid-3' });
      grid.appendChild(card('Progress', h('div', null,
        h('p', { class: 'big-num' }, n, h('small', { text: ' / ' + total + ' lessons' })),
        ui.progressBar(100 * n / total, 'Course progress'),
        h('p', { class: 'muted small', text: ui.fmtHours(ui.doneHours()) + ' of about ' + Math.round(DA.totalHours) + ' h done' }))));
      grid.appendChild(card(next ? 'Up next' : 'All done', next
        ? h('div', null, h('p', { class: 'next-title' }, h('span', { class: 'muted', text: next.number + ' · ' }), next.title), h('p', { class: 'muted small', text: next.module.title + ' · ' + ui.fmtHours(next.hours) }), link('#/lesson/' + next.id, 'btn accent', n === 0 ? 'Start lesson' : 'Continue'))
        : h('p', { text: 'Keep practising in the SQL Lab and build more projects.' })));
      grid.appendChild(card('Your pace', h('div', null,
        h('p', { class: 'big-num' }, ui.state.profile.hours, h('small', { text: ' h / week' })),
        h('p', { class: 'muted small', text: remaining > 0 ? 'About ' + weeksText(weeksFor(remaining)) + ' to go' : 'Course complete' }),
        link('#/profile', 'small', 'Change pace'))));
      root.appendChild(grid);

      var two = h('div', { class: 'grid-2' });
      two.appendChild(card('Your edge', list(b.strengths), 'good'));
      two.appendChild(card('Gaps to close', list(b.gaps), 'gap'));
      root.appendChild(two);

      root.appendChild(card('A first portfolio idea from your background', h('div', null,
        h('p', { text: b.projects[0] }),
        link('#/lesson/l7-1', 'small', 'More ideas in the portfolio lesson →'))));
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

    // module overview
    root.appendChild(h('section', { class: 'section' },
      h('h2', { text: 'The roadmap at a glance' }),
      h('div', { class: 'modules-mini' }, DA.modules.map(function (m, i) {
        return link('#/roadmap', 'mini', [h('span', { class: 'mini-icon', 'aria-hidden': 'true', text: m.icon }), h('span', null, h('strong', { text: m.title }), h('small', { text: ui.moduleDone(m) + '/' + m.lessons.length + ' lessons' }))]);
      }))));
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

    // data management
    var fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', id: 'importFile', onchange: function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var obj = JSON.parse(r.result);
          if (!obj || obj.app !== 'data-analyst-path') throw new Error('not a progress file');
          ui.replaceState(obj.state);
          ui.refreshChrome(); ui.toast('Progress imported.');
          location.hash = '#/';
        } catch (err) { ui.toast('That file is not a valid progress export.'); }
      };
      r.readAsText(f);
    } });
    root.appendChild(h('section', { class: 'section' },
      h('h2', { text: 'Your data' }),
      h('p', { class: 'muted', text: 'Progress, notes and answers are stored in this browser only (localStorage). Nothing is sent to any server. Export a backup to move to another device.' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', onclick: function () {
          ui.download('data-analyst-path-progress.json', JSON.stringify({ app: 'data-analyst-path', exportedAt: new Date().toISOString(), state: ui.state }, null, 2), 'application/json');
        } }, 'Export progress'),
        h('button', { class: 'btn ghost', type: 'button', onclick: function () { fileInput.click(); } }, 'Import progress'),
        fileInput,
        h('button', { class: 'btn ghost danger', type: 'button', onclick: function () {
          if (window.confirm('Delete your profile, progress, quiz answers and notes from this browser? This cannot be undone.')) {
            ui.reset(); ui.refreshChrome(); ui.toast('Everything was reset.'); location.hash = '#/';
          }
        } }, 'Reset everything'))));
    return root;
  };

  /* ================================================================ roadmap */

  V.roadmap = function () {
    var root = h('div', { class: 'view' });
    var n = ui.doneCount(), total = DA.lessons.length, hpw = ui.state.profile.hours;
    root.appendChild(title('Your roadmap'));
    root.appendChild(h('p', { class: 'lead', text: DA.modules.length + ' modules, ' + total + ' lessons, about ' + Math.round(DA.totalHours) + ' hours. At ' + hpw + ' hours a week that is ' + weeksText(weeksFor(DA.totalHours)) + '.' }));
    root.appendChild(h('div', { class: 'row between' }, h('div', { class: 'grow' }, ui.progressBar(100 * n / total, 'Course progress')), h('strong', { class: 'small', text: n + ' / ' + total + ' done' })));

    var cum = 0;
    DA.modules.forEach(function (m, mi) {
      var mh = m.lessons.reduce(function (s, l) { return s + l.hours; }, 0);
      var w1 = Math.floor(cum / hpw) + 1, w2 = Math.max(w1, Math.ceil((cum + mh) / hpw));
      cum += mh;
      var done = ui.moduleDone(m);
      root.appendChild(h('section', { class: 'module' },
        h('header', null,
          h('span', { class: 'mod-icon', 'aria-hidden': 'true', text: m.icon }),
          h('div', { class: 'grow' }, h('h2', { text: (mi + 1) + '. ' + m.title }), h('p', { class: 'muted', text: m.goal })),
          h('div', { class: 'mod-meta' }, h('strong', { text: done + '/' + m.lessons.length }), h('small', { text: 'Weeks ' + (w1 === w2 ? w1 : w1 + '–' + w2) + ' · ' + ui.fmtHours(mh) }))),
        h('ol', { class: 'lessons' }, m.lessons.map(function (l) {
          var d = ui.state.done[l.id];
          return h('li', { class: d ? 'done' : '' }, h('a', { href: '#/lesson/' + l.id },
            h('span', { class: 'check', 'aria-hidden': 'true', text: d ? '✔' : '' }),
            h('span', { class: 'ltitle' }, h('span', { class: 'muted', text: l.number + ' ' }), l.title, d ? h('span', { class: 'sr-only', text: ' (completed)' }) : null),
            h('span', { class: 'lhours', text: ui.fmtHours(l.hours) })));
        }))));
    });

    root.appendChild(h('section', { class: 'section' },
      h('h2', { text: 'A weekly rhythm that works' }),
      h('div', { class: 'grid-3' },
        card('2 × learn', h('p', { text: 'Read one lesson and ask your AI tutor to explain anything unclear. Stop when you can explain it in your own words.' })),
        card('2 × practise', h('p', { text: 'Do the hands-on task and the SQL Lab challenges. Practice is where the skill appears.' })),
        card('1 × review', h('p', { text: 'Ask the AI to quiz you on the week, update your error log and write your notes.' })))));
    return root;
  };

  /* ================================================================ lesson */

  function quizBlock(l) {
    var q = l.quiz, saved = ui.state.quiz[l.id];
    var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
    var opts = q.options.map(function (text, i) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { choose(i, true); } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { text: text }));
    });
    function choose(i, store) {
      var ok = i === q.answer;
      opts.forEach(function (b, j) { b.classList.remove('right', 'wrong'); b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      opts[i].classList.add(ok ? 'right' : 'wrong');
      ui.clear(fb);
      fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? 'Correct. ' : 'Not quite. Try another answer. ' }), ok ? q.why : ''));
      if (store) { ui.state.quiz[l.id] = { sel: i, ok: ok }; ui.save(); }
    }
    if (saved) choose(saved.sel, false);
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

  V.lesson = function (params) {
    var l = DA.lessonById[params[0]];
    if (!l) return V.notFound();
    var b = ui.bg();
    var root = h('div', { class: 'view lesson' });
    root.appendChild(h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, link('#/roadmap', '', 'Roadmap'), ' › ', l.module.icon + ' ' + l.module.title));
    root.appendChild(title(l.number + '  ' + l.title));
    var doneBtn = h('button', { class: 'btn', type: 'button' });
    var nextLink = h('span');
    root.appendChild(h('p', { class: 'meta' }, h('span', { class: 'pill', text: '⏱ about ' + ui.fmtHours(l.hours) }), ' ', h('span', { class: 'pill', text: l.module.title })));
    root.appendChild(h('p', { class: 'lead', text: l.why }));

    if (l.concept) root.appendChild(conceptBlock(l));

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '1 · Key ideas' }), list(l.learn, true)));
    if (l.code) root.appendChild(ui.codeBlock(l.code));

    // hands-on
    var tools = [];
    if (l.download === 'retail') tools.push(h('button', { class: 'btn small', type: 'button', onclick: function () { ui.download('retail_orders.csv', DA.gen.retailCsv(), 'text/csv;charset=utf-8'); ui.toast('Downloaded retail_orders.csv'); } }, '⬇ Download café sales CSV (≈6,500 rows)'));
    if (l.download === 'messy') tools.push(h('button', { class: 'btn small', type: 'button', onclick: function () { ui.download('messy_orders.csv', '﻿' + DA.gen.messyCsv(), 'text/csv;charset=utf-8'); ui.toast('Downloaded messy_orders.csv'); } }, '⬇ Download messy orders CSV'));
    if (l.lab) {
      var dsId = l.lab === 'auto' ? ui.defaultDataset() : l.lab;
      var cs = DA.challenges.filter(function (c) { return c.ds === dsId; });
      var solved = cs.filter(function (c) { return ui.state.sql[c.id]; }).length;
      tools.push(link('#/lab/' + dsId, 'btn small accent', '🗄️ Open the SQL Lab · ' + DA.datasets[dsId].title + ' (' + solved + '/' + cs.length + ' solved)'));
    }
    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '2 · Do it' }), h('div', { class: 'doit' }, h('p', { html: l.doit })), tools.length ? h('div', { class: 'row' }, tools) : null));

    if (l.showProjects) {
      root.appendChild(h('section', { class: 'block' }, h('h2', { text: 'Project ideas for your background' }),
        b ? list(b.projects) : h('p', null, link('#/profile', '', 'Choose your background'), ' to see ideas from your own field.')));
    }
    if (l.showResume) {
      root.appendChild(h('section', { class: 'block' }, h('h2', { text: 'How your experience translates' }),
        b ? h('ul', { class: 'ticks' }, b.resume.map(function (r) {
          var parts = r.split(' → ');
          return h('li', null, parts.length === 2 ? [h('span', { class: 'muted', text: parts[0] }), h('br'), h('strong', { text: '→ ' + parts[1] })] : r);
        })) : h('p', null, link('#/profile', '', 'Choose your background'), ' to see examples.')));
    }

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '3 · AI move' }),
      h('p', { class: 'muted', text: 'Your tutor prompt for this lesson. It already includes your background. Fill in the blanks and send it.' }),
      ui.promptCard(l.ai)));

    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '4 · Check yourself' }), quizBlock(l)));

    var notes = h('textarea', { class: 'notes', rows: '4', placeholder: 'What did you learn? What is still unclear? What will you ask your AI tutor?', 'aria-label': 'My notes for this lesson', maxlength: '5000' });
    notes.value = ui.state.notes[l.id] || '';
    var t;
    notes.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { if (notes.value.trim()) ui.state.notes[l.id] = notes.value; else delete ui.state.notes[l.id]; ui.save(); }, 400);
    });
    root.appendChild(h('section', { class: 'block' }, h('h2', { text: '5 · My notes' }), notes, h('p', { class: 'muted small', text: 'Saved automatically in this browser.' })));

    if (l.links && l.links.length) {
      root.appendChild(h('section', { class: 'block' }, h('h2', { text: 'Resources' }),
        h('ul', { class: 'links' }, l.links.map(function (x) { return h('li', null, h('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer', text: x.label })); }))));
    }

    // completion + navigation
    function paintDone() {
      var d = !!ui.state.done[l.id];
      doneBtn.className = 'btn big ' + (d ? 'ghost' : 'accent');
      doneBtn.textContent = d ? '✔ Completed (click to undo)' : 'Mark lesson as complete';
      doneBtn.setAttribute('aria-pressed', d ? 'true' : 'false');
      ui.clear(nextLink);
      var nx = DA.lessons[l.index + 1];
      if (d && nx) nextLink.appendChild(link('#/lesson/' + nx.id, 'btn big', 'Next: ' + nx.title + ' →'));
    }
    doneBtn.addEventListener('click', function () {
      if (ui.state.done[l.id]) delete ui.state.done[l.id]; else ui.state.done[l.id] = true;
      ui.save(); ui.refreshChrome(); paintDone();
      var n = ui.doneCount();
      if (ui.state.done[l.id]) ui.toast(n === DA.lessons.length ? '🎉 Course complete! Now build and publish your projects.' : 'Lesson complete: ' + n + ' of ' + DA.lessons.length + ' done.');
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

  var routes = { '': V.home, profile: V.profile, roadmap: V.roadmap, lesson: V.lesson, lab: V.lab, prompts: V.prompts, tools: V.tools };
  var navOf = { '': 'home', lesson: 'roadmap' };

  function parse() {
    var parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(function (s) {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    });
    return { name: parts[0] || '', params: parts.slice(1) };
  }

  function render() {
    var r = parse(), view = routes[r.name] || V.notFound, node;
    try { node = view(r.params); } catch (err) {
      if (window.console) console.error(err);
      node = h('div', { class: 'view' }, title('Something went wrong'), h('p', { text: 'This page failed to load. Try going back to the start.' }), link('#/', 'btn', 'Go to the start'));
    }
    var main = document.getElementById('view');
    ui.clear(main);
    main.appendChild(node);
    var nav = navOf[r.name] !== undefined ? navOf[r.name] : r.name;
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      var on = a.getAttribute('data-nav') === nav;
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

  document.addEventListener('DOMContentLoaded', function () {
    var mb = document.getElementById('menuBtn');
    mb.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { document.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); mb.focus(); }
    });
    var scrim = document.getElementById('scrim');
    if (scrim) scrim.addEventListener('click', function () { document.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); });
    window.addEventListener('hashchange', render);
    ui.refreshChrome();
    render();
  });
})();
