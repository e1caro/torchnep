/* SQLab worlds and levels: the existing challenges grouped by level and database, with the same progression as the other labs. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  var WORLDS = [
    { icon: '🧱', title: 'Foundations', about: 'SELECT, WHERE and ORDER BY, then COUNT, SUM, AVG and GROUP BY.', levels: [[1, 'retail', 'First queries'], [1, 'lab', 'First queries'], [2, 'retail', 'Aggregations'], [2, 'lab', 'Aggregations']] },
    { icon: '🔗', title: 'Joins and conditions', about: 'Several tables, HAVING, dates and CASE WHEN.', levels: [[3, 'retail', 'Joins and HAVING'], [3, 'lab', 'Joins and HAVING'], [4, 'retail', 'Dates and CASE WHEN'], [4, 'lab', 'Dates and CASE WHEN']] },
    { icon: '🪆', title: 'Subqueries and windows', about: 'Subqueries, CTEs, anti-joins, ranking and running totals.', levels: [[5, 'retail', 'Subqueries and CTEs'], [5, 'lab', 'Subqueries and CTEs'], [6, 'retail', 'Window functions'], [6, 'lab', 'Window functions']] },
    { icon: '🏆', title: 'Analyst case studies', about: 'Time series, LAG/LEAD, repeat behaviour and executive questions.', levels: [[7, 'retail', 'Time series and LAG'], [7, 'lab', 'Time series and LAG'], [8, 'retail', 'Executive cases'], [8, 'lab', 'Executive cases']] },
  ];

  DA.buildSqlLab = function () {
    var short = function (ds) { return (DA.datasets[ds] && DA.datasets[ds].short) || ds; };
    return {
      id: 'sql', route: 'lab', quest: 'sql',
      tagline: 'Real SQL on a real database, in your browser: 64 challenges in 4 worlds, on two practice databases.',
      help: 'Pick a level on the map, or open free exploration to try any query. Write SQL and press Run (Ctrl/Cmd + Enter); "Check" compares your result with the reference query, so any correct query passes. Solve most of a level to open the next one.',
      playHref: function (c) { return '#/lab/' + c.src.ds + '/' + c.id; },
      xpKey: function (c) { return 'sql:' + c.id; },
      xp: function (c) { return DA.ui.XP.sql(c.src.level); },
      extraLinks: function () {
        var h = DA.ui.h;
        return h('section', { class: 'lab-world' },
          h('div', { class: 'lab-world-head' }, h('span', { class: 'lab-world-icon', 'aria-hidden': 'true', text: '🧪' }),
            h('div', null, h('h2', { text: 'Free exploration' }), h('p', { class: 'muted small', text: 'No task, no lock: open a database and try any query.' }))),
          h('div', { class: 'row' }, Object.keys(DA.datasets).map(function (id) {
            return h('a', { class: 'btn ghost', href: '#/lab/' + id }, '🗄️ ' + (DA.datasets[id].title || id));
          })));
      },
      worlds: WORLDS.map(function (w) {
        return { icon: w.icon, title: w.title, about: w.about, levels: w.levels.map(function (l) {
          var ex = (DA.sqlExamples || []).filter(function (e) { return e.level === l[0] && e.ds === l[1]; })[0];
          return {
            title: l[2] + ' · ' + short(l[1]), sqlLevel: l[0], ds: l[1],
            example: ex ? { title: ex.title, code: ex.sql, explain: ex.explain } : null,
            challenges: DA.challenges.filter(function (c) { return c.level === l[0] && c.ds === l[1]; }).map(function (c) {
              return { id: c.id, title: c.title, task: c.task, hint: c.hint, solution: c.solution, src: c };
            }),
          };
        }) };
      }),
    };
  };
})();
