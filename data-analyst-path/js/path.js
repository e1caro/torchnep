/* The journey map: the Dot & Co. story in chapters, each mission a stop on the road and a boss case at the end of each chapter.
 * Every mission is open. The current chapter is expanded and the map scrolls to the current mission. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, J = DA.journey;
  var V = (DA.views = DA.views || {});

  var COLORS = [['#2563eb', '#1d4ed8'], ['#16a34a', '#15803d'], ['#7c3aed', '#6d28d9'], ['#ea580c', '#c2410c'], ['#db2777', '#be185d'],
    ['#0d9488', '#0f766e'], ['#4f46e5', '#4338ca'], ['#ca8a04', '#a16207'], ['#dc2626', '#b91c1c']];
  var SNAKE = [0, 40, 64, 40, 0, -40, -64, -40];
  DA.unitColor = function (mi) { return COLORS[mi % COLORS.length]; };

  var opened = {};
  var PREVIEW = 2;

  function weeksText(hours) {
    var w = Math.max(1, Math.ceil(hours / ui.state.profile.hours));
    return w < 9 ? w + ' week' + (w === 1 ? '' : 's') : 'about ' + Math.round(w / 4.3) + ' months';
  }
  function stars(n) {
    var t = '';
    for (var i = 0; i < 3; i++) t += i < n ? '★' : '☆';
    return h('span', { class: 'jn-stars', 'aria-hidden': 'true', text: t });
  }

  function missionNode(l, step, cur) {
    var m = J.mission(l.id), done = !!ui.state.done[l.id], isCur = cur && cur.lesson === l;
    var p = J.progress(l.id), k = m.targets.length ? J.stars(l.id) : 0;
    var state = done ? 'done' : isCur ? 'current' : p.done > 0 ? 'started' : 'todo';
    var face = done ? '✓' : isCur ? '★' : l.number.split('.')[1];
    var meta = done ? (J.tested(l.id) ? 'Tested out' : 'Complete') : (p.done > 0 || isCur) ? 'Step ' + p.index + ' of ' + p.total + ' · ' + J.NAMES[p.step] : m.steps.length + ' steps';
    var aria = 'Mission ' + l.number + ', ' + l.title + '. ' + (l.added && !done && p.done === 0 ? 'New. ' : '') + (done ? 'Complete.' : 'Step ' + p.index + ' of ' + p.total + ', ' + J.NAMES[p.step] + '.') + (k ? ' ' + k + ' of 3 stars.' : '');
    return h('li', { class: 'jstop', style: '--dx:' + SNAKE[step % SNAKE.length] + 'px' },
      h('a', { class: 'jnode ' + state, href: '#/mission/' + l.id, 'aria-label': aria, 'aria-current': isCur ? 'step' : null },
        isCur && DA.mascot ? h('span', { class: 'jn-here', 'aria-hidden': 'true' }, DA.mascot.svg('happy', 30)) : null,
        h('span', { class: 'jn-face', 'aria-hidden': 'true', text: face }),
        h('span', { class: 'jn-text', 'aria-hidden': 'true' },
          h('small', null, 'Mission ' + l.number + ' · ' + ui.fmtHours(l.hours), l.added && !done && p.done === 0 ? h('span', { class: 'jn-new', text: 'New' }) : null),
          h('strong', { text: l.title }),
          h('span', { class: 'jn-meta' }, h('span', { text: meta }), k ? stars(k) : null))));
  }

  function bossNode(m, step) {
    var b = J.boss(m.id), ch = J.chapter(m);
    var state = b.won ? 'done' : ch.complete ? 'ready' : 'todo';
    var meta = b.won ? (b.stars ? 'Won' : 'Bonus earned') : '+' + ui.XP.module + ' XP chapter bonus';
    return h('li', { class: 'jstop boss', style: '--dx:' + SNAKE[step % SNAKE.length] + 'px' },
      h('a', { class: 'jnode boss ' + state, href: '#/boss/' + m.id, 'aria-label': 'Boss case: ' + b.title + '. ' + (b.won ? 'Won' + (b.stars ? ', ' + b.stars + ' of 3 stars.' : '.') : 'Open. Pays the ' + ui.XP.module + ' XP chapter bonus.') },
        h('span', { class: 'jn-face', 'aria-hidden': 'true', text: b.won ? '🏆' : b.icon }),
        h('span', { class: 'jn-text', 'aria-hidden': 'true' },
          h('small', { text: 'Boss case' }),
          h('strong', { text: b.title }),
          h('span', { class: 'jn-meta' }, h('span', { text: meta }), b.stars ? stars(b.stars) : null))));
  }

  V.journey = function () {
    var root = h('div', { class: 'view journey' });
    var n = ui.doneCount(), total = DA.lessons.length, cur = J.current(), step = 0;
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'Your journey' }));
    root.appendChild(h('p', { class: 'lead', text: n + ' of ' + total + ' missions done. ' + (n < total ? 'About ' + weeksText(DA.totalHours - ui.doneHours()) + ' to go at ' + ui.state.profile.hours + ' h a week.' : 'Every mission is done.') }));
    root.appendChild(ui.progressBar(100 * n / total, 'Journey progress'));

    DA.modules.forEach(function (m, mi) {
      var col = DA.unitColor(mi), ch = J.chapter(m);
      var isOpen = opened[m.id] !== undefined ? opened[m.id] : ch.current || (!cur && !ch.boss.won);
      var preview = !isOpen && !ch.complete;
      var sec = h('section', { class: 'chapter' + (ch.complete ? ' complete' : '') + (ch.current ? ' current' : ''), style: '--mc:' + col[0] + ';--mcd:' + col[1], 'aria-labelledby': 'ch-' + m.id });
      var road = h('ol', { class: 'jroad', id: 'road-' + m.id });
      var toggle = h('button', { class: 'ch-toggle', type: 'button', 'aria-expanded': isOpen ? 'true' : 'false', 'aria-controls': 'road-' + m.id, onclick: function () {
        opened[m.id] = !isOpen;
        var y = window.scrollY;
        DA.render();
        window.scrollTo(0, y);
      } },
        h('span', { class: 'ch-icon', 'aria-hidden': 'true', html: ui.iconHtml(m.icon, 24) }),
        h('span', { class: 'grow' },
          h('small', { class: 'ch-kicker', text: 'Chapter ' + (mi + 1) + ' · ' + m.lessons.length + ' missions' }),
          h('span', { class: 'ch-title', id: 'ch-' + m.id, text: m.title }),
          h('span', { class: 'ch-story', text: DA.chapters[m.id] || m.goal })),
        h('span', { class: 'ch-count' }, h('b', { text: ch.complete ? '✓' : ch.done + '/' + ch.total }), h('small', { class: 'ch-chev', 'aria-hidden': 'true', text: isOpen ? '▾' : '▸' }),
          h('span', { class: 'sr-only', text: (isOpen ? 'Collapse' : 'Expand') + ' chapter ' + (mi + 1) })));
      sec.appendChild(h('header', { class: 'ch-head' }, toggle));
      if (isOpen || preview) {
        var list = preview ? m.lessons.slice(0, PREVIEW) : m.lessons;
        list.forEach(function (l) { road.appendChild(missionNode(l, step++, cur)); });
        if (preview && m.lessons.length > PREVIEW) {
          road.appendChild(h('li', { class: 'jstop more' }, h('button', { class: 'btn small ghost', type: 'button', onclick: function () { toggle.click(); } }, 'Show all ' + m.lessons.length + ' missions and the boss')));
        } else {
          road.appendChild(bossNode(m, step++));
        }
        sec.appendChild(road);
      }
      root.appendChild(sec);
    });

    var jump = h('button', { class: 'btn accent jump-btn hidden', type: 'button', onclick: function () { focusCurrent(true); } }, '⤓ Jump to current');
    if (cur) root.appendChild(jump);
    root.appendChild(h('p', { class: 'muted small center-text', text: 'Every mission is open: jump ahead or test out whenever you like.' }));

    function focusCurrent(focus) {
      var node = root.querySelector('[aria-current="step"]');
      if (!node) return;
      node.scrollIntoView({ block: 'center' });
      if (focus) node.focus({ preventScroll: true });
    }
    setTimeout(function () {
      if (!root.isConnected) return;
      focusCurrent(false);
      var node = root.querySelector('[aria-current="step"]');
      if (node && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          if (!root.isConnected) { io.disconnect(); return; }
          jump.classList.toggle('hidden', es[0].isIntersecting);
        });
        io.observe(node);
      }
    }, 0);
    return root;
  };
  V.roadmap = V.journey;
})();
