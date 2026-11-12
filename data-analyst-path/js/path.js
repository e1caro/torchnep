/* The learning path: every lesson as a stop on a winding road, grouped in colour-coded units.
 * Finished stops are ticked, the next one pulses, and each unit ends with practice and a bonus chest.
 * Nothing is locked: you can open any lesson (later ones are just dimmer). */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h;
  var V = (DA.views = DA.views || {});

  // one colour per unit: [face, edge]
  var COLORS = [['#2563eb', '#1d4ed8'], ['#16a34a', '#15803d'], ['#7c3aed', '#6d28d9'], ['#ea580c', '#c2410c'], ['#db2777', '#be185d'],
    ['#0d9488', '#0f766e'], ['#4f46e5', '#4338ca'], ['#ca8a04', '#a16207'], ['#dc2626', '#b91c1c']];
  var SNAKE = [0, 46, 74, 46, 0, -46, -74, -46];
  DA.unitColor = function (mi) { return COLORS[mi % COLORS.length]; };

  function weeksText(hours) {
    var w = Math.max(1, Math.ceil(hours / ui.state.profile.hours));
    return w < 9 ? w + ' week' + (w === 1 ? '' : 's') : 'about ' + Math.round(w / 4.3) + ' months';
  }

  V.roadmap = function () {
    var root = h('div', { class: 'view pathview' });
    var n = ui.doneCount(), total = DA.lessons.length, next = ui.nextLesson(), step = 0;
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'Your path' }));
    root.appendChild(h('p', { class: 'lead', text: n + ' of ' + total + ' lessons done. The whole path is about ' + Math.round(DA.totalHours) + ' hours: ' + weeksText(DA.totalHours - ui.doneHours()) + ' to go at ' + ui.state.profile.hours + ' h a week.' }));
    root.appendChild(ui.progressBar(100 * n / total, 'Course progress'));

    DA.modules.forEach(function (m, mi) {
      var col = DA.unitColor(mi), done = ui.moduleDone(m), all = done === m.lessons.length;
      var hours = m.lessons.reduce(function (s, l) { return s + l.hours; }, 0);
      var unit = h('section', { class: 'unit' + (all ? ' complete' : ''), style: '--mc:' + col[0] + ';--mcd:' + col[1], 'aria-labelledby': 'unit-' + m.id });
      unit.appendChild(h('header', { class: 'unit-banner' },
        h('span', { class: 'unit-icon', 'aria-hidden': 'true', html: ui.iconHtml(m.icon, 26) }),
        h('div', { class: 'grow' },
          h('p', { class: 'unit-kicker', text: 'Unit ' + (mi + 1) + ' · ' + ui.fmtHours(hours) }),
          h('h2', { id: 'unit-' + m.id, text: m.title }),
          h('p', { class: 'unit-goal', text: m.goal })),
        h('div', { class: 'unit-count' }, h('b', { text: done + '/' + m.lessons.length }), h('small', { text: all ? 'complete' : 'lessons' }))));

      var road = h('ol', { class: 'road' });
      function stop(opts) {
        var dx = SNAKE[step++ % SNAKE.length];
        var face = opts.icon === '✓' ? h('span', { class: 'node-face', 'aria-hidden': 'true', text: '✓' }) : h('span', { class: 'node-face', 'aria-hidden': 'true', html: ui.iconHtml(opts.icon, 22) });
        var kids = [opts.current ? h('span', { class: 'node-start', 'aria-hidden': 'true', text: n === 0 ? 'START' : 'NEXT' }) : null, face,
          h('span', { class: 'node-label' }, opts.kicker ? h('small', { text: opts.kicker }) : null, h('span', { text: opts.label }))];
        var cls = 'node ' + opts.state + (opts.kind ? ' ' + opts.kind : '');
        var node = opts.href ? h('a', { class: cls, href: opts.href, 'aria-label': opts.aria, 'aria-current': opts.current ? 'step' : null }, kids) : h('div', { class: cls, 'aria-label': opts.aria }, kids);
        road.appendChild(h('li', { style: '--dx:' + dx + 'px' }, node));
      }
      m.lessons.forEach(function (l) {
        var d = !!ui.state.done[l.id], cur = next && next.id === l.id;
        stop({ href: '#/lesson/' + l.id, icon: d ? '✓' : cur ? '★' : l.number.split('.')[1], state: d ? 'done' : cur ? 'current' : 'todo', current: cur,
          kicker: 'Lesson ' + l.number + ' · ' + ui.fmtHours(l.hours), label: l.title, aria: 'Lesson ' + l.number + ': ' + l.title + (d ? ' (completed)' : cur ? ' (next)' : '') });
      });
      if (DA.drill.topics().indexOf(m.cat) >= 0) {
        var mast = DA.drill.mastery(m.cat);
        stop({ href: '#/practice/play/' + encodeURIComponent(m.cat), icon: '⚡', state: 'extra', kind: 'practice', kicker: mast.mastered + ' / ' + mast.total + ' mastered', label: 'Practise ' + m.cat, aria: 'Practice round: ' + m.cat });
      }
      if (m.id === 'm2') {
        stop({ href: '#/arcade/blocks', icon: '🧱', state: 'extra', kind: 'practice', kicker: Object.keys(ui.state.blocks).length + ' / ' + DA.puzzles.length + ' solved', label: 'SQL blocks', aria: 'Game: SQL blocks' });
        stop({ href: '#/lab', icon: '🗄️', state: 'extra', kind: 'practice', kicker: Object.keys(ui.state.sql).length + ' / ' + DA.challenges.length + ' solved', label: 'SQL Lab', aria: 'SQL Lab challenges' });
      }
      stop({ icon: all ? '🏆' : '🎁', state: all ? 'done chest' : 'chest', kicker: all ? 'Unit complete' : 'Finish the unit', label: all ? '+' + ui.XP.module + ' XP earned' : '+' + ui.XP.module + ' XP bonus', aria: all ? 'Unit complete, bonus earned' : 'Unit bonus: ' + ui.XP.module + ' XP when every lesson is done' });
      unit.appendChild(road);
      root.appendChild(unit);
    });

    root.appendChild(h('p', { class: 'muted small center-text', text: 'Every stop is open: jump ahead whenever you like.' }));
    return root;
  };
})();
