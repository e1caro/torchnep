/* The four tool arcades: Formula X-ray, Pandas pipeline, Slicer safe and Pill match. Each is a map of 4 worlds × 4
 * levels (js/data/arcade-worlds.js); a round is five puzzles of one level, scored in stars against par (no timers).
 * XP is capped per game per day; clearing a level and three stars pay once; three solved count for the Code quest. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, A = DA.arcade, X = DA.arcade2, M = DA.mascot, AW = DA.arcadeWorlds;
  var holding = false;
  function hold() { if (!holding) { holding = true; G.hold(); } }
  function release() { if (holding) { holding = false; G.release(); } }
  var before = A.leave;
  A.leave = function () { if (before) before(); release(); };

  function starText(n) { var t = ''; for (var i = 0; i < 3; i++) t += i < n ? '★' : '☆'; return t; }
  function code(text) { return h('pre', { class: 'g2-code' }, h('code', { text: text })); }
  function say(box, kind, msg) { ui.clear(box); if (msg) box.appendChild(h('div', { class: 'callout ' + kind }, msg)); }
  var MONTHS = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };
  function chipText(k, v) { return v === null ? 'All' : k === 'month' ? MONTHS[v.slice(5)] : v; }

  /* ================================================================ round runner */

  function round(game, lv) {
    var meta = X.GAMES[game], maker = { xray: X.xray, pipe: X.pipe, safe: X.safe, pills: X.pills }[game];
    var R;
    function reset() { R = { i: 0, total: 0, solved: 0, xp: 0, seed: AW.seed(), marks: [] }; }
    var root = h('div', { class: 'view g2 g2-' + game }, h('h1', { id: 'view-title', class: 'sr-only', tabindex: '-1', text: meta.name + ', ' + AW.label(lv) }));
    var stage = h('div', { class: 'stage' });
    root.appendChild(stage);
    reset();

    function head() {
      return h('div', { class: 'round-head' },
        h('a', { class: 'icon-btn', href: '#/arcade/' + game, 'aria-label': 'Quit the round' }, '✕'),
        ui.progressBar(100 * R.i / X.ROUND, 'Round progress'),
        h('span', { class: 'g2-score', 'aria-label': R.total + ' stars so far' }, '★ ' + R.total));
    }
    function paint() {
      hold();
      ui.clear(stage);
      stage.appendChild(head());
      stage.appendChild(h('p', { class: 'g2-kicker' }, A.levelChip(lv), h('span', { text: ' Puzzle ' + (R.i + 1) + ' of ' + X.ROUND })));
      var p = null;
      for (var k = 0; !p && k < 5; k++) p = maker(R.seed + R.i * 7919 + k * 104729, lv);
      stage.appendChild(RENDER[game](p, done));
      var first = stage.querySelector('.g2-focus');
      if (first) first.focus({ preventScroll: true });
    }
    function done(stars, text) {
      R.total += stars;
      if (stars > 0) { R.solved++; R.xp += G.addXp('game:' + game + ':' + ui.today(), stars, meta.name, ui.XP.gameCap); }
      R.marks.push(stars);
      G.sound(stars ? 'ok' : 'bad');
      G.buzz(stars ? 20 : [40, 40, 40]);
      var box = stage.querySelector('.g2-done');
      ui.clear(box);
      box.appendChild(h('div', { class: 'callout ' + (stars ? 'ok' : 'info') },
        stars ? h('p', { class: 'lab-won' }, h('span', { class: 'lab-stars', 'aria-label': stars + ' of 3 stars', text: starText(stars) }), ' ', text || '') : h('p', null, text || ''),
        h('button', { class: 'btn big accent', type: 'button', onclick: function () { R.i++; if (R.i >= X.ROUND) finish(); else paint(); } }, R.i + 1 >= X.ROUND ? 'See results' : 'Next puzzle →')));
      var b = box.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    }
    function finish() {
      var st = ui.state.stats;
      st[meta.plays] = (st[meta.plays] || 0) + 1;
      if (R.total > (st[meta.stat] || 0)) st[meta.stat] = R.total;
      if (R.solved >= 3) G.quest('sql');
      G.touch();
      release();
      ui.clear(stage);
      stage.appendChild(A.levelResults({ game: game, lv: lv, marks: R.marks, xp: R.xp, again: function () { reset(); paint(); window.scrollTo(0, 0); } }));
      var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true });
    }
    if (!AW.stars(game, lv.key)) {
      stage.appendChild(A.levelIntro(lv, paint));
      setTimeout(function () { var t = stage.querySelector('#results-title'); if (t) t.focus({ preventScroll: true }); }, 0);
    } else paint();
    return root;
  }

  /* ================================================================ Formula X-ray (Excel) */

  function xray(p, done) {
    var tapped = {}, tries = 0, over = false;
    var fb = h('div', { role: 'status', 'aria-live': 'polite' }), end = h('div', { class: 'g2-done' });
    var buttons = {};
    function cell(ref, v) {
      var text = v === null ? '' : String(v);
      var b = h('button', { class: 'xr-cell' + (v === null ? ' blank' : ''), type: 'button', 'aria-pressed': 'false', 'aria-label': ref + ': ' + (v === null ? 'empty' : text), onclick: function () {
        if (over) return;
        tapped[ref] = !tapped[ref];
        b.setAttribute('aria-pressed', tapped[ref] ? 'true' : 'false');
        b.classList.remove('miss', 'extra');
      } }, text);
      buttons[ref] = b;
      return h('td', null, b);
    }
    var cols = ['A', 'B', 'C', 'D'];
    var table = h('table', { class: 'xr-grid', 'aria-label': 'Sheet: columns A to D, rows 1 to ' + (p.rows.length + 1) },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }), cols.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
      h('tbody', null,
        h('tr', null, h('th', { scope: 'row', text: '1' }), cols.map(function (c) { return h('td', { class: 'xr-head', text: X.COLS[c] }); })),
        p.rows.map(function (x, i) { var n = i + 2; return h('tr', null, h('th', { scope: 'row', text: String(n) }), cols.map(function (c) { return cell(c + n, x[X.COLS[c]]); })); })));
    var go = h('button', { class: 'btn big accent g2-focus', type: 'button', onclick: function () {
      if (over) return;
      tries++;
      var res = X.xrayCheck(p, Object.keys(tapped).filter(function (k) { return tapped[k]; }));
      res.missed.forEach(function (c) { buttons[c].classList.add('miss'); });
      res.extra.forEach(function (c) { buttons[c].classList.add('extra'); });
      if (res.ok) {
        over = true;
        say(fb, 'ok', h('span', null, 'Exactly. ', h('code', { text: p.formula }), ' returns ', h('b', { text: String(p.value) }), '.'));
        done(X.stars(tries, 1), 'Solved in ' + tries + ' tr' + (tries === 1 ? 'y' : 'ies') + '.');
      } else {
        say(fb, 'warn', (res.missed.length ? res.missed.length + ' cell' + (res.missed.length === 1 ? ' is' : 's are') + ' missing (dashed outline)' : '') + (res.missed.length && res.extra.length ? ' and ' : '') +
          (res.extra.length ? res.extra.length + ' cell' + (res.extra.length === 1 ? ' is' : 's are') + ' not used (✗)' : '') + '. Read the ranges and the condition again.');
      }
    } }, '🩻 X-ray it');
    var show = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      if (over) return;
      over = true;
      p.cells.forEach(function (c) { buttons[c].setAttribute('aria-pressed', 'true'); buttons[c].classList.add('answer'); });
      say(fb, 'info', h('span', null, 'These cells. ', h('code', { text: p.formula }), ' returns ', h('b', { text: String(p.value) }), '.'));
      done(0, 'No stars this time, and that is fine: now you know.');
    } }, 'Show me');
    return h('div', { class: 'g2-body' },
      h('div', { class: 'xr-fx' }, h('span', { class: 'xr-fx-label', 'aria-hidden': 'true', text: 'fx' }), h('code', { text: p.formula })),
      h('p', { class: 'g2-ask', text: p.ask }),
      h('div', { class: 'table-wrap' }, table),
      p.f1 !== null && p.f1 !== undefined ? h('p', { class: 'xr-f1' }, h('span', { class: 'xr-f1-ref', text: 'F1' }), h('span', { class: 'xr-f1-val', text: String(p.f1) }), h('span', { class: 'muted small', text: ' the limit the formula reads' })) : null,
      h('div', { class: 'row' }, go, show), fb, end);
  }

  /* ================================================================ Pandas pipeline (Python) */

  function pipe(p, done) {
    var lines = [], over = false, target = X.pipeTarget(p), P = DA.python;
    var list = h('ol', { class: 'pp-steps', 'aria-label': 'Your pipeline' });
    var preview = h('pre', { class: 'pp-table', 'aria-live': 'polite' });
    var fb = h('div', { role: 'status', 'aria-live': 'polite' }), end = h('div', { class: 'g2-done' });
    var cardBtns = p.cards.map(function (line) {
      return h('button', { class: 'pp-card', type: 'button', onclick: function () { if (!over) { lines.push(line); paint(); } } }, h('code', { text: line.replace(/^t = /, '') }));
    });
    function paint() {
      ui.clear(list);
      list.appendChild(h('li', { class: 'pp-start' }, h('code', { text: 't = df' })));
      lines.forEach(function (l) { list.appendChild(h('li', null, h('code', { text: l }))); });
      var res = X.pipeRun(p, lines);
      if (!res.ok) { preview.textContent = 'This step does not work here: ' + res.error; preview.classList.add('err'); return; }
      preview.classList.remove('err');
      preview.textContent = P.repr(res.env.result);
      if (!over && lines.length && P.compareResult(res.env.result, target, true).ok) {
        over = true;
        cardBtns.forEach(function (b) { b.disabled = true; });
        say(fb, 'ok', 'Your table matches the target in ' + lines.length + ' step' + (lines.length === 1 ? '' : 's') + ' (par ' + p.par + ').');
        done(X.stars(lines.length, p.par), 'Pipeline complete.');
      }
    }
    var undo = h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (!over && lines.length) { lines.pop(); paint(); } } }, '↶ Undo step');
    var reset = h('button', { class: 'btn ghost', type: 'button', onclick: function () { if (!over) { lines = []; paint(); } } }, 'Start over');
    var show = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      if (over) return;
      over = true;
      lines = p.ref.slice(); paint();
      cardBtns.forEach(function (b) { b.disabled = true; });
      say(fb, 'info', 'The reference pipeline: ' + p.ref.map(function (l) { return l.replace(/^t = t/, ''); }).join(' → '));
      done(0, 'No stars this time: read the steps above and try the next one.');
    } }, 'Show me');
    paint();
    cardBtns[0].classList.add('g2-focus');
    return h('div', { class: 'g2-body' },
      h('p', { class: 'g2-ask' }, h('strong', { text: 'Goal: ' }), p.goal),
      h('div', { class: 'pp-grid' },
        h('div', null, h('p', { class: 'muted small', text: 'Start: df' }), h('pre', { class: 'pp-table', text: P.repr(P.readCsvText(p.csv)) })),
        h('div', null, h('p', { class: 'muted small', text: 'Target' }), h('pre', { class: 'pp-table target', text: P.repr(target) }))),
      p.extra === 'regions' ? h('div', null, h('p', { class: 'muted small', text: 'A second table: regions' }), h('pre', { class: 'pp-table', text: P.repr(P.readCsvText(X.REGIONS_CSV)) })) : null,
      h('p', { class: 'muted small', text: 'Tap cards to add steps. Each step runs on the result of the one before.' }),
      h('div', { class: 'pp-cards', role: 'group', 'aria-label': 'Operation cards' }, cardBtns),
      list,
      h('p', { class: 'muted small', text: 'Your result now' }), preview,
      h('div', { class: 'row' }, undo, reset, show), fb, end);
  }

  /* ================================================================ Slicer safe (Power BI) */

  function safe(p, done) {
    var sel = {}, moves = 0, over = false;
    var card = h('b', { class: 'sf-value' }), fb = h('div', { role: 'status', 'aria-live': 'polite' }), end = h('div', { class: 'g2-done' });
    var groups = p.slicers.map(function (k) {
      var S = X.SLICERS[k];
      var chips = [null].concat(S.values).map(function (v) {
        return h('button', { class: 'chip', type: 'button', 'aria-pressed': v === null ? 'true' : 'false', 'aria-label': S.label + ': ' + (v === null ? 'All' : v), onclick: function () {
          if (over || sel[k] === v || (!sel[k] && v === null)) return;
          sel[k] = v; moves++;
          chips.forEach(function (c, j) { c.setAttribute('aria-pressed', (j === 0 ? v === null : S.values[j - 1] === v) ? 'true' : 'false'); });
          paint();
        } }, chipText(k, v));
      });
      return h('div', { class: 'sf-slicer', role: 'group', 'aria-label': S.label + ' slicer' }, h('span', { class: 'sf-label', text: S.label + (k === 'month' ? ' (2025)' : '') }), h('div', { class: 'chips' }, chips));
    });
    function paint() {
      var now = X.fmt(X.safeValue(p, sel), p.measure.fmt);
      card.textContent = now;
      if (over) return;
      if (now === p.target) {
        over = true;
        say(fb, 'ok', h('span', null, '🔓 The safe opens! ', p.measure.note));
        done(X.stars(moves, p.par), moves + ' slicer move' + (moves === 1 ? '' : 's') + ' (par ' + p.par + ').');
      } else if (moves >= p.par + 3) {
        say(fb, 'info', h('span', null, h('strong', { text: 'Clue: ' }), p.measure.note));
      }
    }
    var show = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      if (over) return;
      over = true;
      var parts = p.slicers.map(function (k) { return X.SLICERS[k].label + ' = ' + (p.secret[k] || 'All'); });
      say(fb, 'info', h('span', null, 'One combination that works: ' + parts.join(', ') + '. ', p.measure.note));
      done(0, 'No stars this time: the clue above is the lesson.');
    } }, 'Show me');
    var root = h('div', { class: 'g2-body' },
      h('div', { class: 'sf-safe' }, h('span', { class: 'sf-dial', 'aria-hidden': 'true', text: '🔐' }), h('span', null, h('small', { text: 'Secret number' }), h('b', { class: 'sf-target', text: p.target }))),
      h('p', { class: 'g2-ask', text: 'Set the slicers so the card shows the secret number. Fewer moves, more stars.' }),
      h('p', { class: 'muted small', text: 'The card\'s measure:' }), code(p.measure.f),
      h('div', { class: 'sf-card', role: 'status', 'aria-live': 'polite', 'aria-label': 'KPI card' }, h('small', { text: 'KPI card' }), card),
      groups, h('div', { class: 'row' }, show), fb, end);
    var firstChip = root.querySelector('.sf-slicer .chip:nth-child(2)');
    if (firstChip) firstChip.classList.add('g2-focus');
    paint();
    return root;
  }

  /* ================================================================ Pill match (Tableau) */

  function bars(rows, fmt, label) {
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value) || 0; }).concat([1e-9]));
    return h('div', { class: 'pm-chart', role: 'img', 'aria-label': label + ': ' + rows.map(function (r) { return r.member + ' ' + X.fmt(r.value, fmt); }).join(', ') },
      rows.map(function (r) {
        return h('div', { class: 'pm-row', 'aria-hidden': 'true' }, h('span', { class: 'pm-name', text: r.member }),
          h('span', { class: 'pm-track' }, h('span', { class: 'pm-bar', style: 'width:' + Math.max(2, 100 * Math.abs(r.value || 0) / max) + '%' })),
          h('span', { class: 'pm-val', text: X.fmt(r.value, fmt) }));
      }));
  }
  var SORTS = { none: 'A to Z', desc: 'largest first', asc: 'smallest first' };

  function pills(p, done) {
    var o = p.opts || {}, picked = null, rowsPill = null, colsPill = null, filterDim = null, filterVal = null, top = false, calc = null, sort = 'none', tries = 0, over = false;
    var live = h('div', { class: 'pm-live' }), fb = h('div', { role: 'status', 'aria-live': 'polite' }), end = h('div', { class: 'g2-done' });
    var palette = (o.dims || X.DIMS).map(function (d) { return { key: d[0], label: d[1], kind: 'dim' }; }).concat((o.meas || X.MEAS).map(function (m) { return { key: m[0], label: m[1], kind: 'meas', fmt: m[2] }; }));
    var pillBtns = palette.map(function (pl) {
      return h('button', { class: 'tpill ' + (pl.kind === 'dim' ? 'blue' : 'green'), type: 'button', 'aria-pressed': 'false', 'aria-label': (pl.kind === 'dim' ? 'Dimension ' : 'Measure ') + pl.label, onclick: function () {
        if (over) return;
        picked = picked === pl ? null : pl;
        pillBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', palette[j] === picked ? 'true' : 'false'); });
      } }, pl.label);
    });
    function shelf(name, accept) {
      return h('button', { class: 'shelf', type: 'button', onclick: function () {
        if (over) return;
        if (!picked) { say(fb, 'info', 'Tap a pill first, then tap a shelf.'); return; }
        if (picked.kind !== accept) {
          say(fb, 'warn', accept === 'dim' ? name + ' takes a blue pill: a dimension cuts the view into one bar per value.' : 'Columns takes a green pill: a measure gives each bar its length.');
          return;
        }
        if (name === 'Filters') { filterDim = picked; filterVal = null; }
        else if (accept === 'dim') rowsPill = picked; else colsPill = picked;
        picked = null;
        pillBtns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        say(fb, '', '');
        paint();
      } });
    }
    var rowsShelf = shelf('Rows', 'dim'), colsShelf = shelf('Columns', 'meas'), filterShelf = o.filter ? shelf('Filters', 'dim') : null;
    var filterVals = h('div', { class: 'chips pm-fvals', role: 'group', 'aria-label': 'Filter value' });
    var sortBtn = o.sort === false ? null : h('button', { class: 'btn small', type: 'button', onclick: function () { if (over) return; sort = { none: 'desc', desc: 'asc', asc: 'none' }[sort]; paint(); } });
    var topBtn = o.top ? h('button', { class: 'btn small', type: 'button', 'aria-pressed': 'false', onclick: function () { if (over) return; top = !top; paint(); } }) : null;
    var calcChips = o.calc ? [null].concat(o.calc).map(function (c) {
      return h('button', { class: 'chip', type: 'button', 'aria-pressed': c === null ? 'true' : 'false', onclick: function () { if (over) return; calc = c; paint(); } }, X.CALCS[c || 'none']);
    }) : null;
    function fmtNow() { return X.calcFmt(colsPill ? colsPill.fmt : 'int', calc); }
    function paint() {
      [[rowsShelf, rowsPill, 'Rows'], [colsShelf, colsPill, 'Columns']].concat(filterShelf ? [[filterShelf, filterDim, 'Filters']] : []).forEach(function (x) {
        ui.clear(x[0]);
        x[0].appendChild(h('span', { class: 'shelf-name', text: x[2] }));
        x[0].appendChild(x[1] ? h('span', { class: 'tpill ' + (x[1].kind === 'dim' ? 'blue' : 'green') + ' placed', text: x[1].label + (x[2] === 'Filters' && filterVal ? ' = ' + filterVal : '') }) : h('span', { class: 'muted small', text: 'drop a pill here' }));
        x[0].setAttribute('aria-label', x[2] + ' shelf: ' + (x[1] ? x[1].label + (x[2] === 'Filters' && filterVal ? ' equals ' + filterVal : '') : 'empty'));
      });
      if (filterShelf) {
        ui.clear(filterVals);
        if (filterDim) X.members(filterDim.key).forEach(function (v) {
          filterVals.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': filterVal === v ? 'true' : 'false', onclick: function () { if (over) return; filterVal = filterVal === v ? null : v; paint(); } }, v));
        });
      }
      if (sortBtn) sortBtn.textContent = 'Sort: ' + SORTS[sort];
      if (topBtn) { topBtn.textContent = top ? 'Top ' + X.TOP + ': on' : 'Top ' + X.TOP + ': off'; topBtn.setAttribute('aria-pressed', top ? 'true' : 'false'); }
      if (calcChips) calcChips.forEach(function (c, j) { c.setAttribute('aria-pressed', ([null].concat(o.calc)[j] || null) === calc ? 'true' : 'false'); });
      ui.clear(live);
      if (rowsPill && colsPill) {
        try { live.appendChild(bars(X.bars(cfgNow()), fmtNow(), 'Your chart')); } catch (e) { live.appendChild(h('p', { class: 'muted small', text: String(e.message || e) })); }
      } else live.appendChild(h('p', { class: 'muted small', text: 'Your chart appears when both shelves have a pill.' }));
    }
    function cfgNow() { return { dim: rowsPill.key, meas: colsPill.key, sort: sort, filter: filterDim && filterVal ? { dim: filterDim.key, value: filterVal } : null, top: top ? X.TOP : 0, calc: calc }; }
    var check = h('button', { class: 'btn big accent', type: 'button', onclick: function () {
      if (over) return;
      tries++;
      var res = X.pillCheck(p, rowsPill && rowsPill.key, colsPill && colsPill.key, sort, { filter: filterDim && filterVal ? { dim: filterDim.key, value: filterVal } : null, top: top, calc: calc });
      if (res.ok) { over = true; say(fb, 'ok', 'A perfect match.'); done(X.stars(tries, 1), 'Matched in ' + tries + ' tr' + (tries === 1 ? 'y' : 'ies') + '.'); }
      else say(fb, 'warn', res.why);
    } }, '✓ Check');
    var show = h('button', { class: 'btn ghost', type: 'button', onclick: function () {
      if (over) return;
      over = true;
      var bits = ['Rows: ' + p.dim.replace(/^.*\[|\]$/g, ''), 'Columns: ' + p.meas];
      if (p.filter) bits.push('Filter: ' + p.filter.dim.replace(/^.*\[|\]$/g, '') + ' = ' + p.filter.value);
      if (p.top) bits.push('Top ' + X.TOP + ': on');
      if (p.calc) bits.push('Calculation: ' + X.CALCS[p.calc]);
      bits.push('Sort: ' + SORTS[p.sort]);
      say(fb, 'info', bits.join(' · ') + '.');
      done(0, 'No stars this time. Compare the bar lengths with the numbers next time.');
    } }, 'Show me');
    pillBtns[0].classList.add('g2-focus');
    paint();
    var tools = [sortBtn, topBtn].filter(Boolean);
    return h('div', { class: 'g2-body' },
      h('p', { class: 'g2-ask', text: 'Rebuild this chart: tap a pill, then a shelf. Blue pills are dimensions, green pills are measures.' }),
      bars(p.rows, p.fmt, 'Target chart'),
      h('div', { class: 'pm-palette', role: 'group', 'aria-label': 'Pills' }, pillBtns),
      h('div', { class: 'pm-shelves' }, rowsShelf, colsShelf, filterShelf),
      filterShelf ? filterVals : null,
      tools.length ? h('div', { class: 'row pm-tools' }, tools) : null,
      calcChips ? h('div', { class: 'chips pm-calc', role: 'group', 'aria-label': 'Quick table calculation' }, calcChips) : null,
      live, h('div', { class: 'row' }, check, show), fb, end);
  }

  var RENDER = { xray: xray, pipe: pipe, safe: safe, pills: pills };

  // #/arcade/<game> is the world map; #/arcade/<game>/<level> plays a level; "next" continues.
  X.view = function (params) {
    var game = params[0];
    if (!X.GAMES[game]) return null;
    var lv = params[1] === 'next' ? AW.current(game) : params[1] ? AW.level(game, params[1]) : null;
    return lv ? round(game, lv) : A.worldMap(game);
  };
})();
