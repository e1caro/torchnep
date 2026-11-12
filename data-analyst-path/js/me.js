/* The "You" page: level, streak, calendar, this week, badges, stats.
 *
 * Charts follow the dataviz rules: one hue (blue), light-to-dark for more activity (flipped in dark mode),
 * thin rounded marks with a gap between them, direct value labels, a legend, tooltips that also work on
 * touch (tap a day), and a table alternative for screen readers.
 */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game;
  var V = (DA.views = DA.views || {});

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pretty(d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
  function level(xp, goal, met) {
    var l = xp <= 0 ? 0 : xp < goal * 0.5 ? 1 : xp < goal ? 2 : xp < goal * 2 ? 3 : 4;
    return met ? Math.max(l, 3) : l;
  }
  function desc(c) { return pretty(c.d) + ': ' + (c.xp ? c.xp + ' XP' : 'no activity') + (c.met ? ', goal reached' : ''); }

  function levelCard() {
    var li = G.levelInfo(), nextTitle = null, L = li.level + 1;
    for (; L < li.level + 30; L++) if (G.title(L) !== li.title) { nextTitle = { level: L, title: G.title(L) }; break; }
    return h('section', { class: 'card level-card' },
      h('div', { class: 'level-badge', 'aria-hidden': 'true' }, h('small', { text: 'LEVEL' }), h('b', { text: String(li.level) })),
      h('div', { class: 'grow' },
        h('h2', { text: li.title }),
        ui.progressBar(li.pct, 'Progress to level ' + (li.level + 1)),
        h('p', { class: 'muted small', text: li.xp + ' XP in total · ' + li.next + ' XP to level ' + (li.level + 1) + (nextTitle ? ' · "' + nextTitle.title + '" at level ' + nextTitle.level : '') })));
  }

  function streakCard() {
    var st = G.streak(), goal = G.goal();
    var cols = G.heat(12), caption = h('p', { class: 'heat-caption muted small', role: 'status', 'aria-live': 'polite', text: 'Tap a day to see its XP.' });
    var active = 0;
    var monthRow = h('div', { class: 'heat-months', 'aria-hidden': 'true' }, cols.map(function (col, i) {
      var p = col[0].d.split('-'), first = i === 0 || +p[2] <= 7;
      return h('span', { text: first ? MONTHS[+p[1] - 1] : '' });
    }));
    var grid = h('div', { class: 'heat', role: 'group', 'aria-label': 'Activity in the last 12 weeks' }, cols.map(function (col) {
      return h('div', { class: 'heat-col' }, col.map(function (c) {
        if (c.future) return h('span', { class: 'cell future', 'aria-hidden': 'true' });
        if (c.xp > 0) active++;
        var cell = h('span', { class: 'cell l' + level(c.xp, goal, c.met), role: 'img', 'aria-label': desc(c), title: desc(c) });
        var show = function () { caption.textContent = desc(c); };
        cell.addEventListener('mouseenter', show); cell.addEventListener('click', show);
        return cell;
      }));
    }));
    var recent = [].concat.apply([], cols).filter(function (c) { return !c.future; }).slice(-14).reverse();
    return h('section', { class: 'card heat-card' },
      h('div', { class: 'streak-head' },
        h('div', { class: 'streak-big' + (st.metToday ? ' lit' : '') }, ui.icon('flame', 22), h('b', { text: String(st.count) }), h('small', { text: st.count === 1 ? 'day streak' : 'day streak' })),
        h('div', { class: 'grow' },
          h('h2', { text: 'Streak' }),
          h('p', { class: 'muted small', text: 'Best: ' + st.best + ' · ❄️ ' + st.freezes + ' freeze' + (st.freezes === 1 ? '' : 's') + ' saved. Reach your daily goal (' + goal + ' XP) to keep it. Every 7 days in a row earns a freeze (max 2) that quietly covers a missed day.' }))),
      monthRow,
      h('div', { class: 'heat-wrap' },
        h('div', { class: 'heat-days', 'aria-hidden': 'true' }, ['Mon', '', 'Wed', '', 'Fri', '', ''].map(function (d) { return h('span', { text: d }); })),
        grid),
      h('div', { class: 'heat-legend', 'aria-hidden': 'true' }, 'Less ', [0, 1, 2, 3, 4].map(function (l) { return h('span', { class: 'cell l' + l }); }), ' More'),
      caption,
      h('p', { class: 'muted small', text: active + ' active day' + (active === 1 ? '' : 's') + ' in the last 12 weeks.' }),
      h('details', { class: 'table-alt' }, h('summary', { text: 'Show the last 14 days as a table' }),
        h('table', { class: 'result-table' },
          h('thead', null, h('tr', null, ['Day', 'XP', 'Goal'].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
          h('tbody', null, recent.map(function (c) { return h('tr', null, h('td', { text: pretty(c.d) }), h('td', { class: 'num', text: String(c.xp) }), h('td', { text: c.met ? 'reached' : '' })); })))));
  }

  function weekCard() {
    var bars = G.weekBars(), goal = G.goal(), max = Math.max(goal * 1.25, Math.max.apply(null, bars.map(function (b) { return b.xp; })));
    var total = bars.reduce(function (t, b) { return t + b.xp; }, 0), days = bars.filter(function (b) { return b.met; }).length;
    return h('section', { class: 'card' },
      h('h2', { text: 'This week' }),
      h('p', { class: 'muted small', text: total + ' XP in the last 7 days · goal reached on ' + days + ' of 7' }),
      h('div', { class: 'bars', role: 'group', 'aria-label': 'XP per day, last 7 days. Goal ' + goal + ' XP.' },
        h('div', { class: 'goal-line', style: 'bottom:' + (100 * goal / max) + '%' }, h('span', { text: 'Goal ' + goal })),
        bars.map(function (b) {
          return h('div', { class: 'bar-col' + (b.isToday ? ' today' : '') },
            h('span', { class: 'bar-val', text: b.xp ? String(b.xp) : '' }),
            h('div', { class: 'bar-track' }, h('div', { class: 'bar', style: 'height:' + (b.xp ? Math.max(3, 100 * b.xp / max) : 0) + '%', title: pretty(b.d) + ': ' + b.xp + ' XP' })),
            h('span', { class: 'bar-day', text: b.isToday ? 'Today' : b.label }),
            h('span', { class: 'bar-ok', 'aria-hidden': 'true', text: b.met ? '✓' : '' }));
        })),
      h('details', { class: 'table-alt' }, h('summary', { text: 'Show this week as a table' }),
        h('table', { class: 'result-table' },
          h('thead', null, h('tr', null, ['Day', 'XP', 'Goal'].map(function (t) { return h('th', { scope: 'col', text: t }); }))),
          h('tbody', null, bars.map(function (b) { return h('tr', null, h('td', { text: pretty(b.d) }), h('td', { class: 'num', text: String(b.xp) }), h('td', { text: b.met ? 'reached' : '' })); })))));
  }

  function badgesCard() {
    var all = G.badges(), earned = all.filter(function (b) { return b.earned; }).sort(function (a, b) { return a.earned < b.earned ? 1 : -1; });
    var locked = all.filter(function (b) { return !b.earned; }).sort(function (a, b) { return b.cur / b.max - a.cur / a.max; });
    return h('section', { class: 'section' },
      h('h2', { text: 'Badges' }),
      h('div', { class: 'badges' }, earned.concat(locked).map(function (b) {
        var got = !!b.earned;
        return h('div', { class: 'badge-card' + (got ? ' got' : '') },
          h('span', { class: 'b-icon', 'aria-hidden': 'true', html: ui.iconHtml(b.icon, 26) }),
          h('strong', { text: b.name }),
          h('span', { class: 'muted small', text: b.desc }),
          got ? h('span', { class: 'small ok-text', text: '✓ ' + pretty(b.earned) }) : [ui.progressBar(100 * b.cur / b.max, b.name + ' progress')]);
      })));
  }

  V.me = function () {
    var root = h('div', { class: 'view me' }), st = ui.state.stats;
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'You' }));
    root.appendChild(levelCard());
    root.appendChild(streakCard());
    root.appendChild(weekCard());
    root.appendChild(badgesCard());
    var acc = st.answers ? Math.round(100 * st.correct / st.answers) + '%' : '–';
    root.appendChild(h('section', { class: 'section' }, h('h2', { text: 'Your highlights' }),
      h('div', { class: 'stat-row wide' }, [
        ['First-try accuracy', acc], ['Best combo', st.bestCombo], ['Best streak', G.streak().best + 'd'], ['Total XP', G.totalXp()],
      ].map(function (x) { return h('div', { class: 'stat' }, h('b', { text: String(x[1]) }), h('span', { text: x[0] })); }))));
    root.appendChild(h('p', null, h('a', { class: 'btn ghost', href: '#/settings' }, '⚙️ Settings: daily goal, theme, reminders, devices')));
    return root;
  };
})();
