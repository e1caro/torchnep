/* Discover: a vertical, snap-scrolling feed of short cards (stories, ideas, tips, myths, chart crimes, quotes, words),
 * mixed with review questions and a quick game. Reading a card collects it. Logic is in feed-core.js. */
(function () {
  'use strict';
  var DA = window.DA, ui = DA.ui, h = ui.h, G = DA.game, F = DA.feed, D = DA.drill, A = DA.arcade, M = DA.mascot;
  var V = (DA.views = DA.views || {});
  var live = null; // observers and timers of the feed on screen

  // Called by the router on every navigation.
  F.leave = function () {
    if (!live) return;
    live.read.disconnect(); live.more.disconnect();
    Object.keys(live.timers).forEach(function (k) { clearTimeout(live.timers[k]); });
    document.removeEventListener('keydown', live.onKey);
    live = null;
  };

  /* ================================================================ small charts for the "chart crime" cards */

  var NS = 'http://www.w3.org/2000/svg';
  var PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']; // categorical order from the palette guide
  function S(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function frame(label) { return S('svg', { viewBox: '0 0 320 190', class: 'crime-chart', role: 'img', 'aria-label': label }); }

  // Vertical bars. opts: min (axis start), colors (array or null), accent (index), note
  function vbars(svg, vals, labels, opts) {
    var x0 = 34, y0 = 150, w = 270, hgt = 118, min = opts.min || 0, max = Math.max.apply(null, vals) * 1.02, n = vals.length, bw = Math.min(46, w / n - 12);
    svg.appendChild(S('line', { x1: x0, y1: y0, x2: x0 + w, y2: y0, class: 'ax' }));
    svg.appendChild(S('text', { x: x0 - 6, y: y0 + 4, class: 'tk', 'text-anchor': 'end' }, String(min)));
    vals.forEach(function (v, i) {
      var bh = Math.max(2, hgt * (v - min) / (max - min)), cx = x0 + (i + 0.5) * w / n;
      var fill = opts.colors ? opts.colors[i % opts.colors.length] : null;
      var r = S('rect', { x: cx - bw / 2, y: y0 - bh, width: bw, height: bh, rx: 4, class: 'b' + (opts.accent === i ? ' hi' : opts.accent !== undefined ? ' lo' : '') });
      if (fill) r.setAttribute('style', 'fill:' + fill);
      svg.appendChild(r);
      svg.appendChild(S('text', { x: cx, y: y0 - bh - 5, class: 'vl', 'text-anchor': 'middle' }, String(v)));
      svg.appendChild(S('text', { x: cx, y: y0 + 15, class: 'tk', 'text-anchor': 'middle' }, labels[i]));
    });
    if (opts.note) svg.appendChild(S('text', { x: 160, y: 184, class: 'nt', 'text-anchor': 'middle' }, opts.note));
  }
  function hbars(svg, vals, labels) {
    var max = Math.max.apply(null, vals), rowH = 150 / vals.length;
    vals.forEach(function (v, i) {
      var y = 14 + i * rowH;
      svg.appendChild(S('text', { x: 26, y: y + rowH * 0.5 + 1, class: 'tk', 'text-anchor': 'end' }, labels[i]));
      svg.appendChild(S('rect', { x: 32, y: y + 2, width: 230 * v / max, height: rowH - 6, rx: 4, class: 'b' }));
      svg.appendChild(S('text', { x: 38 + 230 * v / max, y: y + rowH * 0.5 + 1, class: 'vl' }, v + '%'));
    });
  }
  function pie(svg, vals, labels) {
    var total = vals.reduce(function (a, b) { return a + b; }, 0), a0 = -Math.PI / 2, cx = 160, cy = 92, r = 76;
    vals.forEach(function (v, i) {
      var a1 = a0 + 2 * Math.PI * v / total, mid = (a0 + a1) / 2;
      var d = 'M' + cx + ' ' + cy + ' L' + (cx + r * Math.cos(a0)).toFixed(1) + ' ' + (cy + r * Math.sin(a0)).toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + (cx + r * Math.cos(a1)).toFixed(1) + ' ' + (cy + r * Math.sin(a1)).toFixed(1) + ' Z';
      svg.appendChild(S('path', { d: d, style: 'fill:' + PAL[i % PAL.length], class: 'sl' }));
      svg.appendChild(S('text', { x: cx + (r + 12) * Math.cos(mid), y: cy + (r + 12) * Math.sin(mid) + 4, class: 'tk', 'text-anchor': 'middle' }, labels[i]));
      a0 = a1;
    });
  }
  function lines(svg, series, box, cls) {
    series.forEach(function (sr, k) {
      var n = sr.v.length, pts = sr.v.map(function (v, i) { return (box.x + box.w * i / (n - 1)).toFixed(1) + ',' + (box.y + box.h - box.h * (v - sr.min) / (sr.max - sr.min)).toFixed(1); }).join(' ');
      svg.appendChild(S('polyline', { points: pts, class: 'ln ' + (cls || '') + ' s' + k }));
    });
    svg.appendChild(S('line', { x1: box.x, y1: box.y + box.h, x2: box.x + box.w, y2: box.y + box.h, class: 'ax' }));
  }

  function crime(kind, fixed) {
    var svg;
    if (kind === 'truncate') {
      svg = frame(fixed ? 'Two nearly equal bars, axis from zero' : 'Two bars, one looks five times taller because the axis starts at 95');
      vbars(svg, [96, 100], ['Product A', 'Product B'], { min: fixed ? 0 : 95, note: fixed ? 'Axis starts at 0: a 4% difference looks like 4%' : 'Axis starts at 95: B looks 5 times bigger' });
    } else if (kind === 'pie') {
      var v = [22, 18, 15, 13, 11, 9, 7, 5], l = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      svg = frame(fixed ? 'Eight sorted bars with values' : 'A pie chart with eight similar slices');
      if (fixed) hbars(svg, v, l); else pie(svg, v, l);
    } else if (kind === 'sort') {
      var names = ['Bagel', 'Cookie', 'Latte', 'Muffin', 'Salad', 'Tea'], vals = [12, 30, 45, 18, 8, 27];
      svg = frame(fixed ? 'Bars sorted from largest to smallest' : 'Bars in alphabetical order');
      if (fixed) { var idx = vals.map(function (_, i) { return i; }).sort(function (a, b) { return vals[b] - vals[a]; }); vbars(svg, idx.map(function (i) { return vals[i]; }), idx.map(function (i) { return names[i]; }), { note: 'Sorted by value: the ranking is instant' }); }
      else vbars(svg, vals, names, { note: 'Alphabetical: you have to read every bar' });
    } else if (kind === 'rainbow') {
      svg = frame(fixed ? 'Grey bars with April highlighted' : 'Six bars, each in a different colour');
      vbars(svg, [30, 34, 31, 52, 29, 33], ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], fixed ? { accent: 3, note: 'One colour, one message: April stood out' } : { colors: PAL, note: 'Six colours, no message' });
    } else {
      var spend = { v: [20, 24, 23, 30, 34, 33, 40, 44], min: 15, max: 46 }, sales = { v: [900, 880, 950, 930, 1000, 990, 1010, 1040], min: 860, max: 1050 };
      svg = frame(fixed ? 'Two separate line charts, sales nearly flat' : 'Two lines on two different axes that seem to move together');
      if (fixed) {
        lines(svg, [{ v: spend.v, min: 0, max: 50 }], { x: 40, y: 18, w: 250, h: 58 });
        svg.appendChild(S('text', { x: 40, y: 13, class: 'tk' }, 'Ad spend (thousands): doubled'));
        lines(svg, [{ v: sales.v, min: 0, max: 1100 }], { x: 40, y: 106, w: 250, h: 58 }, 'alt');
        svg.appendChild(S('text', { x: 40, y: 101, class: 'tk' }, 'Sales (units): up about 15%'));
      } else {
        lines(svg, [spend, sales], { x: 40, y: 20, w: 240, h: 130 });
        svg.appendChild(S('text', { x: 36, y: 14, class: 'tk', 'text-anchor': 'end' }, 'spend'));
        svg.appendChild(S('text', { x: 284, y: 14, class: 'tk' }, 'sales'));
        svg.appendChild(S('text', { x: 160, y: 184, class: 'nt', 'text-anchor': 'middle' }, 'Two scales chosen to make the lines hug each other'));
      }
    }
    return svg;
  }
  F.crimeChart = crime;

  function scatter(pts, showLine, r) {
    var svg = S('svg', { viewBox: '0 0 240 240', class: 'scatter', role: 'img', 'aria-label': 'Scatter plot of 40 points' });
    svg.appendChild(S('rect', { x: 14, y: 14, width: 212, height: 212, rx: 10, class: 'sc-bg' }));
    pts.forEach(function (p) { svg.appendChild(S('circle', { cx: (26 + 188 * p[0]).toFixed(1), cy: (214 - 188 * p[1]).toFixed(1), r: 4.2, class: 'sc-pt' })); });
    if (showLine) {
      // least-squares line through the plotted points
      var n = pts.length, mx = 0, my = 0, sxy = 0, sxx = 0;
      pts.forEach(function (p) { mx += p[0] / n; my += p[1] / n; });
      pts.forEach(function (p) { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); });
      var b = sxx ? sxy / sxx : 0, a = my - b * mx, y0 = Math.max(0, Math.min(1, a)), y1 = Math.max(0, Math.min(1, a + b));
      svg.appendChild(S('line', { x1: 26, y1: 214 - 188 * y0, x2: 214, y2: 214 - 188 * y1, class: 'sc-line' }));
    }
    return svg;
  }
  F.scatter = scatter;

  /* ================================================================ card elements */

  function share(c) {
    var text = F.shareText(c), nat = ui.native();
    if (nat && nat.share) nat.share(text);
    else if (navigator.share) navigator.share({ text: text }).catch(function () { /* cancelled */ });
    else ui.copy(text, 'Copied. Paste it anywhere.');
  }

  function actions(c) {
    var saveBtn = h('button', { class: 'fc-act' + (F.isSaved(c.id) ? ' on' : ''), type: 'button', 'aria-pressed': F.isSaved(c.id) ? 'true' : 'false', 'aria-label': 'Save this card' });
    function paint() { var on = F.isSaved(c.id); saveBtn.className = 'fc-act' + (on ? ' on' : ''); saveBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); ui.clear(saveBtn); saveBtn.appendChild(h('span', { 'aria-hidden': 'true', text: on ? '♥' : '♡' })); saveBtn.appendChild(document.createTextNode(on ? ' Saved' : ' Save')); }
    saveBtn.addEventListener('click', function () { var on = F.toggleSave(c.id); paint(); if (on) { G.buzz(15); ui.toast('Saved. Find it under "Saved".'); } });
    paint();
    var l = c.lesson ? DA.lessonById[c.lesson] : null;
    return {
      el: h('div', { class: 'fc-actions' }, saveBtn,
        h('button', { class: 'fc-act', type: 'button', onclick: function () { share(c); } }, h('span', { 'aria-hidden': 'true', text: '↗' }), ' Share'),
        l ? h('a', { class: 'fc-act deep', href: '#/lesson/' + l.id }, h('span', { 'aria-hidden': 'true', text: '📘' }), ' Lesson ' + l.number) : null),
      paint: paint,
    };
  }

  function stamp(c) {
    return h('span', { class: 'fc-got', text: ui.state.cards[c.id] ? '✓ Collected' : '' });
  }

  function cardEl(c) {
    var act = actions(c), got = stamp(c), inner = h('div', { class: 'fc-inner' });
    var art = h('article', { class: 'fcard k-' + c.kind + (ui.state.cards[c.id] ? ' got' : ''), 'data-id': c.id, 'data-kind': c.kind, 'aria-label': F.kindLabel(c) + ': ' + c.title });
    inner.appendChild(h('div', { class: 'fc-kicker' }, h('span', { class: 'fc-icon', 'aria-hidden': 'true', text: c.icon }), h('span', { text: F.kindLabel(c) + ' · ' + c.cat }), got));

    function collected(right) {
      if (F.markRead(c.id, right)) { art.classList.add('got', 'just'); got.textContent = '✓ Collected'; if (live) live.status(); }
    }
    art._collect = collected;

    if (c.kind === 'myth') {
      inner.appendChild(h('h2', { class: 'fc-title claim', text: '"' + c.title + '"' }));
      var verdict = h('div', { class: 'fc-verdict', role: 'status', 'aria-live': 'polite' });
      var btns = [['Myth', false, '✗'], ['Fact', true, '✓']].map(function (b) {
        return h('button', { class: 'btn big mf', type: 'button', onclick: function () { answer(b[1]); } }, h('span', { 'aria-hidden': 'true', text: b[2] + ' ' }), b[0]);
      });
      var row = h('div', { class: 'mf-row' }, btns);
      var answer = function (guess) {
        var right = guess === c.truth;
        btns.forEach(function (b, i) { b.disabled = true; b.classList.add((i === 1) === c.truth ? 'right' : 'dim'); });
        ui.clear(verdict);
        verdict.appendChild(h('div', { class: 'callout ' + (right ? 'ok' : 'warn') }, h('strong', { text: (right ? 'Right. ' : 'Not quite. ') + 'It is a ' + (c.truth ? 'fact' : 'myth') + '. ' }), c.take));
        G.sound(right ? 'ok' : 'bad'); G.buzz(right ? 20 : [40, 40, 40]);
        collected(right);
      };
      if (ui.state.cards[c.id]) { // already answered on an earlier visit: show the answer
        btns.forEach(function (b, i) { b.disabled = true; b.classList.add((i === 1) === c.truth ? 'right' : 'dim'); });
        verdict.appendChild(h('div', { class: 'callout ok' }, h('strong', { text: 'It is a ' + (c.truth ? 'fact' : 'myth') + '. ' }), c.take));
      }
      inner.appendChild(row); inner.appendChild(verdict);
    } else if (c.kind === 'quote') {
      inner.appendChild(h('blockquote', { class: 'fc-quote' }, h('p', { text: '“' + c.title + '”' }), h('footer', { text: c.who })));
      c.body.forEach(function (p) { inner.appendChild(h('p', { class: 'fc-note', text: p })); });
    } else if (c.kind === 'chart') {
      inner.appendChild(h('h2', { class: 'fc-title', text: c.title }));
      var fixed = false, holder = h('div', { class: 'crime-holder' }), tag = h('span', { class: 'crime-tag' });
      var toggle = h('button', { class: 'btn accent', type: 'button' });
      var draw = function () {
        ui.clear(holder); holder.appendChild(crime(c.chart, fixed)); holder.appendChild(tag);
        tag.textContent = fixed ? 'FIXED' : 'CRIME'; tag.className = 'crime-tag' + (fixed ? ' ok' : '');
        toggle.textContent = fixed ? 'Show the crime again' : 'Show the fix';
      };
      toggle.addEventListener('click', function () { fixed = !fixed; draw(); if (fixed) collected(); });
      draw();
      inner.appendChild(holder);
      c.body.forEach(function (p) { inner.appendChild(h('p', { text: p })); });
      inner.appendChild(toggle);
      inner.appendChild(h('p', { class: 'fc-take' }, h('span', { 'aria-hidden': 'true', text: '💡 ' }), c.take));
    } else {
      inner.appendChild(h('h2', { class: 'fc-title' + (c.kind === 'word' ? ' term' : ''), text: c.title }));
      c.body.forEach(function (p) { inner.appendChild(h('p', { text: p })); });
      if (c.code) inner.appendChild(h('pre', { class: 'fc-code' }, h('code', { text: c.code })));
      if (c.take) inner.appendChild(h('p', { class: 'fc-take' }, h('span', { 'aria-hidden': 'true', text: c.kind === 'word' ? '🗣️ ' : '💡 ' }), c.take));
    }
    inner.appendChild(act.el);
    art.appendChild(inner);
    art.appendChild(h('span', { class: 'heart-burst', 'aria-hidden': 'true', text: '♥' }));
    art.addEventListener('dblclick', function (e) { // double-tap to save, like any feed
      if (e.target.closest('button, a, pre')) return;
      F.toggleSave(c.id, true); act.paint();
      art.classList.remove('burst'); void art.offsetWidth; art.classList.add('burst');
      G.buzz(15);
    });
    return art;
  }

  function quizEl(q) {
    var sh = D.shuffled(q), done = false;
    var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
    var opts = sh.options.map(function (text, i) {
      return h('button', { class: 'quiz-opt', type: 'button', onclick: function () { pick(i); } }, h('span', { class: 'letter', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }), h('span', { class: 'opt-text', text: text }));
    });
    function pick(i) {
      if (done) return;
      done = true;
      var ok = i === sh.answer, st = ui.state.stats;
      opts.forEach(function (b, j) { b.disabled = true; if (j === sh.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
      st.answers++; if (ok) st.correct++;
      D.record(q.id, ok);
      if (ok) G.award('fq:' + ui.today() + ':' + q.id, ui.XP.feedQuiz, 'Review'); else ui.save();
      G.sound(ok ? 'ok' : 'bad'); G.buzz(ok ? 20 : [40, 40, 40]);
      fb.appendChild(h('div', { class: 'callout ' + (ok ? 'ok' : 'warn') }, h('strong', { text: ok ? 'Correct. ' : 'Not quite. ' }), q.why, ok ? '' : ' It will come back in a practice round.'));
      G.touch();
    }
    return h('article', { class: 'fcard k-quiz', 'data-kind': 'quiz', 'aria-label': 'Review question' },
      h('div', { class: 'fc-inner' },
        h('div', { class: 'fc-kicker' }, h('span', { class: 'fc-icon', 'aria-hidden': 'true', text: '🧠' }), h('span', { text: 'Quick review · ' + q.cat }), h('span', { class: 'fc-got', text: '+' + ui.XP.feedQuiz + ' XP' })),
        h('h2', { class: 'fc-title q', text: q.q }),
        q.code ? h('pre', { class: 'fc-code' }, h('code', { text: q.code })) : null,
        h('div', { class: 'qopts' }, opts), fb));
  }

  function gameEl() {
    var round = A.corrRound(), holder = h('div', { class: 'sc-holder' }, scatter(round.pts, false));
    var out = h('output', { class: 'corr-val', text: '0.00' });
    var slider = h('input', { type: 'range', min: '-1', max: '1', step: '0.05', value: '0', 'aria-label': 'Your guess for the correlation', oninput: function () { out.textContent = Number(slider.value).toFixed(2); } });
    var fb = h('div', { class: 'quiz-fb', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { class: 'btn accent', type: 'button', onclick: function () {
      var g = Number(slider.value), pts = A.corrScore(g, round.r);
      btn.disabled = true; slider.disabled = true;
      ui.clear(holder); holder.appendChild(scatter(round.pts, true));
      fb.appendChild(h('div', { class: 'callout ' + (pts ? 'ok' : 'warn') }, h('strong', { text: 'r = ' + round.r.toFixed(2) + '. ' }), 'You said ' + g.toFixed(2) + ': ' + ['off this time', 'close', 'very close', 'spot on'][pts] + '. That is ' + A.corrWord(round.r) + '.'));
      if (pts) G.addXp('game:corr:' + ui.today(), pts, 'Good eye', ui.XP.gameCap);
      G.sound(pts ? 'ok' : 'bad');
      fb.appendChild(h('a', { class: 'btn small', href: '#/arcade/corr' }, 'Play the full game →'));
    } }, 'Guess');
    return h('article', { class: 'fcard k-game', 'data-kind': 'game', 'aria-label': 'Mini game: guess the correlation' },
      h('div', { class: 'fc-inner' },
        h('div', { class: 'fc-kicker' }, h('span', { class: 'fc-icon', 'aria-hidden': 'true', text: '🎯' }), h('span', { text: 'Quick game' })),
        h('h2', { class: 'fc-title q', text: 'How strong is this relationship?' }),
        holder,
        h('div', { class: 'corr-row' }, h('span', { class: 'muted small', text: '−1' }), slider, h('span', { class: 'muted small', text: '+1' }), out),
        btn, fb));
  }

  function infoEl(item) {
    var inner;
    if (item.type === 'caught') {
      inner = [M.svg('proud', 110), h('h2', { class: 'fc-title', text: 'You are caught up for today' }),
        h('p', { text: 'Five new cards read. That is today\'s Discover goal: +' + ui.XP.feedFive + ' XP. Come back tomorrow for a fresh set, or keep scrolling.' }),
        h('div', { class: 'row center' }, h('a', { class: 'btn accent', href: '#/practice/play' }, '⚡ Lock it in with a 2-minute round'), h('a', { class: 'btn ghost', href: '#/collection' }, 'My collection'))];
    } else if (item.type === 'empty') {
      inner = [M.svg('think', 100), h('h2', { class: 'fc-title', text: 'Nothing saved yet' }), h('p', { text: 'Tap ♡ on a card, or double-tap it, and it will wait for you here.' }), h('a', { class: 'btn accent', href: '#/feed' }, 'Back to Discover')];
    } else {
      inner = [M.svg('happy', 100), h('h2', { class: 'fc-title', text: 'That is everything here' }),
        h('p', { text: F.collected() + ' of ' + DA.feedCards.length + ' cards collected.' }),
        h('div', { class: 'row center' }, h('a', { class: 'btn accent', href: '#/practice' }, 'Practice'), h('a', { class: 'btn ghost', href: '#/collection' }, 'My collection'))];
    }
    return h('article', { class: 'fcard k-info', 'data-kind': 'info' }, h('div', { class: 'fc-inner center-col' }, inner));
  }

  function itemEl(item) {
    if (item.type === 'card') return cardEl(item.card);
    if (item.type === 'quiz') return quizEl(item.q);
    if (item.type === 'game') return gameEl();
    return infoEl(item);
  }

  /* ================================================================ the feed view */

  V.feed = function (params) {
    F.leave();
    var startId = params[0] === 'card' ? params[1] : '';
    var filter = !startId && params[0] && F.filters().indexOf(params[0]) >= 0 ? params[0] : 'For you';
    var items = F.plan(filter, startId).filter(function (x) { return x.type !== 'caught' && x.type !== 'end'; });
    var rendered = 0, cycleNum = 0;
    var root = h('div', { class: 'view feedview' }, h('h1', { id: 'view-title', class: 'sr-only', tabindex: '-1', text: 'Discover' }));

    var count = h('a', { class: 'feed-count', href: '#/collection', text: '🃏 Collection' });
    function status() {
      count.textContent = '🃏 Collection';
      count.setAttribute('aria-label', 'Open card collection');
    }
    var chips = h('div', { class: 'feed-chips', role: 'group', 'aria-label': 'Topics' }, F.filters().map(function (f) {
      return h('a', { class: 'chip' + (f === filter && !startId ? ' active' : ''), href: f === 'For you' ? '#/feed' : '#/feed/' + encodeURIComponent(f), 'aria-current': f === filter ? 'page' : null, text: f === 'Saved' ? '♥ Saved' : f });
    }));
    root.appendChild(h('div', { class: 'feed-top' }, chips, h('div', { class: 'feed-status' }, count)));

    var feed = h('div', { class: 'feed', tabindex: '0', 'aria-label': 'Cards. Swipe up, or use the arrow keys.' });
    var sentinel = h('div', { class: 'feed-sentinel', 'aria-hidden': 'true' });
    feed.appendChild(sentinel);
    root.appendChild(feed);
    function go(dir) { feed.scrollBy({ top: dir * feed.clientHeight, behavior: 'smooth' }); }
    root.appendChild(h('div', { class: 'feed-nav' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Previous card', onclick: function () { go(-1); } }, '▲'),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Next card', onclick: function () { go(1); } }, '▼')));

    var timers = {};
    // A card is "read" after it has been mostly on screen for a moment (interactive cards collect on interaction instead).
    var read = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target, id = el.getAttribute('data-id'), kind = el.getAttribute('data-kind');
        if (!id || kind === 'myth' || kind === 'chart' || ui.state.cards[id]) return;
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          if (!timers[id]) timers[id] = setTimeout(function () { delete timers[id]; if (el._collect) el._collect(); }, kind === 'story' || kind === 'idea' ? 2200 : 1500);
        } else if (timers[id]) { clearTimeout(timers[id]); delete timers[id]; }
      });
    }, { root: feed, threshold: [0, 0.6, 1] });
    function more(n) {
      if (filter !== 'Saved' && rendered + n > items.length && !(items.length === 1 && items[0].type === 'empty')) { // bookmarks are a finite list, never repeated
        var nextBatch = F.cycle ? F.cycle(filter, ++cycleNum) : [];
        if (nextBatch.length) items = items.concat(nextBatch);
      }
      for (var i = 0; i < n && rendered < items.length; i++, rendered++) {
        var el = itemEl(items[rendered]);
        feed.insertBefore(el, sentinel);
        read.observe(el);
      }
    }
    var moreObs = new IntersectionObserver(function (entries) { if (entries.some(function (e) { return e.isIntersecting; })) more(4); }, { root: feed, rootMargin: '150% 0px' });
    var onKey = function (e) {
      if (e.target.closest && e.target.closest('input, textarea, select, button, a')) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') { e.preventDefault(); go(-1); }
    };
    document.addEventListener('keydown', onKey);
    live = { read: read, more: moreObs, timers: timers, onKey: onKey, status: status };
    more(3);
    moreObs.observe(sentinel);
    status();
    return root;
  };

  /* ================================================================ collection */

  V.collection = function () {
    F.leave();
    var root = h('div', { class: 'view collection' });
    root.appendChild(h('h1', { id: 'view-title', tabindex: '-1', text: 'My collection' }));
    root.appendChild(h('p', { class: 'lead', text: 'Read a card in Discover and it lands here for quick reference.' }));
    root.appendChild(h('div', { class: 'row' }, h('a', { class: 'btn accent', href: '#/feed' }, 'Open Discover'), h('a', { class: 'btn ghost', href: '#/feed/Saved' }, '♥ Saved')));
    F.collection().forEach(function (g) {
      root.appendChild(h('section', { class: 'section col-sec' },
        h('h2', null, g.cat),
        h('div', { class: 'col-grid' }, g.cards.map(function (c) {
          return ui.state.cards[c.id]
            ? h('a', { class: 'col-card got', href: '#/feed/card/' + c.id }, h('span', { class: 'col-icon', 'aria-hidden': 'true', text: c.icon }), h('span', { class: 'col-title', text: c.kind === 'quote' ? '“' + c.title + '”' : c.title }), h('span', { class: 'muted small', text: F.kindLabel(c) }))
            : h('div', { class: 'col-card', 'aria-label': 'Not collected yet: ' + F.kindLabel(c) }, h('span', { class: 'col-icon', 'aria-hidden': 'true', text: '?' }), h('span', { class: 'muted small', text: F.kindLabel(c) }));
        }))));
    });
    return root;
  };

  // Three of today's picks, for the home page.
  F.teaser = function () {
    var picks = F.fresh('').slice(0, 3);
    if (picks.length < 3) {
      var seen = ui.seededShuffle(DA.feedCards.filter(function (c) { return picks.indexOf(c) < 0; }), ui.today() + ':teaser');
      picks = picks.concat(seen).slice(0, 3);
    }
    if (!picks.length) return null;
    return h('section', { class: 'card teaser', 'aria-labelledby': 'teaser-h' },
      h('div', { class: 'teaser-head' }, h('h2', { id: 'teaser-h', text: 'Discover today' }), h('span', { class: 'muted small', text: 'Swipe through data stories & tips' })),
      h('div', { class: 'teaser-row' }, picks.map(function (c) {
        return h('a', { class: 'teaser-card k-' + c.kind, href: '#/feed/card/' + c.id }, h('span', { class: 'fc-icon', 'aria-hidden': 'true', text: c.icon }), h('small', { text: F.kindLabel(c) }), h('strong', { text: c.kind === 'quote' ? '“' + c.title + '”' : c.title }));
      })),
      h('a', { class: 'btn accent', href: '#/feed' }, 'Open Discover'));
  };
})();
