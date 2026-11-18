/* Bloomdoku play screen: the board, the pad, pencil notes, undo, the butterfly bookmark, the hint and the helpers,
 * blooming rows and the win sheet. The game in progress is saved after every move (state.games[key]).
 *
 * A "slot" is one figure to find. In a classic garden a cell is one slot. In a twin garden (pz.twin) a cell holds
 * two: slot c is its first figure and slot h + c its second (h = n * n). G.sel, hints, notes and undo work on slots.
 */
(function () {
  'use strict';
  var BD = window.BD, E = BD.engine, W = BD.worlds, A = BD.art, Shop = BD.shop, h = BD.h, t = BD.t, Snd = BD.sound;
  var P = (BD.game = {});
  var G = null;      // the game on screen
  var els = null;    // its DOM nodes
  var ticker = null;

  function T(s) { return s; } // marks a sentence for translation; t() is applied where it is shown
  var RULES = {
    base: ['🌷', T('Classic'), T('Every row, column and plot holds each flower once.')],
    pads: ['🐸', T('Lily pads'), T('Plots are wobbly lily pads, each holding every flower once.')],
    diag: ['🐝', T('Bee paths'), T('The two bee paths also hold each flower once.')],
    vines: ['🌿', T('Vines grow'), T('Numbers grow along each vine, from the bulb to the tip.')],
    knight: ['🐇', T('Bunny hops'), T('The same flower is never one bunny hop away.')],
    parity: ['🌙', T('Even and odd'), T('Moon cells hold even numbers, sun cells odd ones.')],
    twin: ['💃', T('Couples'), T('Two figures in every cell: the first ones make a sudoku, the second ones make another, and no couple appears twice.')],
  };
  P.RULES = RULES;

  function rulesOf(pz) {
    if (pz.twin) return ['twin'];
    return W.rulesOf({ jigsaw: !E.BOX[pz.n] || pz.regions.join() !== E.boxRegions(pz.n).join(), diag: pz.diag, vines: pz.vines && pz.vines.length, knight: pz.knight, parity: !!pz.parity });
  }

  /* ---------- starting and saving ---------- */
  function fromSave(saved) {
    return {
      pz: saved.pz, vals: saved.vals.slice(), notes: saved.notes.slice(), slips: saved.slips | 0, frog: !!saved.frog, owl: !!saved.owl,
      bees: saved.bees | 0, told: !!saved.told, time: saved.time | 0, mark: saved.mark || null, flagged: saved.flagged || {},
    };
  }
  function fresh(pz) {
    var notes = [];
    for (var i = 0; i < pz.givens.length; i++) notes.push(0);
    return { pz: pz, vals: pz.givens.slice(), notes: notes, slips: 0, frog: false, owl: false, bees: 0, told: false, time: 0, mark: null, flagged: {} };
  }
  function save() {
    if (!G || G.won) return;
    BD.state.games[G.id] = { pz: G.pz, vals: G.vals, notes: G.notes, slips: G.slips, frog: G.frog, owl: G.owl, bees: G.bees, told: G.told, time: G.time, mark: G.mark, flagged: G.flagged };
    BD.save();
  }

  // P.open(view, 'level', '3-2') continues that level; P.open(view, 'level', '3-2', 16) opens its garden 17;
  // P.open(view, 'daily', '2026-11-18') opens that day's bouquet.
  P.open = function (view, mode, key, garden) {
    P.close();
    var id = mode === 'daily' ? 'daily:' + key : key;
    var lv = mode === 'level' ? W.level(key) : null;
    if (mode === 'level' && !lv) { location.hash = '#/'; return; }
    BD.clear(view).appendChild(h('div.planting', h('div', { html: A.pua('think', 84) }), h('p', { text: t('Planting the seeds…') })));
    // Let the "planting" message paint before the generator runs.
    setTimeout(function () {
      var saved = BD.state.games[id], g;
      if (saved && (mode === 'daily' || garden == null || saved.pz.garden === garden)) g = fromSave(saved);
      else g = fresh(mode === 'daily' ? W.dailyPuzzle(key) : W.puzzle(key, garden == null ? W.at(BD.state, key) : garden));
      g.id = id; g.mode = mode; g.key = key; g.level = lv;
      g.S = E.build(g.pz);
      g.twin = !!g.pz.twin;
      g.h = g.pz.n * g.pz.n; // cells on the board
      g.sel = -1; g.armed = 0; g.noteMode = false; g.undo = []; g.redo = []; g.hint = null; g.lady = null; g.won = false;
      g.bloomed = {};
      E.doneGroups(g.S, g.vals).forEach(function (gi) { g.bloomed[gi] = 1; });
      g.rules = rulesOf(g.pz);
      g.badge = W.needsNumbers({ vines: g.pz.vines && g.pz.vines.length, parity: !!g.pz.parity });
      G = g; P.current = g;
      build(view);
      save();
      ticker = setInterval(tick, 1000);
    }, 30);
  };
  P.close = function () {
    if (ticker) clearInterval(ticker);
    ticker = null; G = null; els = null; P.current = null;
    document.removeEventListener('keydown', onKey);
  };
  function tick() {
    if (!G || G.won || document.hidden) return;
    G.time++;
    if (els && els.clock) els.clock.textContent = clock(G.time);
    if (G.time % 10 === 0) save();
  }
  function clock(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  P.clock = clock;

  /* ---------- drawing the board ---------- */
  function isBoxes(pz) { return !!E.BOX[pz.n] && pz.regions.join() === E.boxRegions(pz.n).join(); }
  function regionTints(pz) {
    var n = pz.n, N = n * n, c, tint = [], d = E.BOX[n];
    if (isBoxes(pz)) { // square plots: a checkerboard of two soils
      for (c = 0; c < N; c++) tint.push((Math.floor(Math.floor(c / n) / d[0]) + Math.floor((c % n) / d[1])) % 2);
      return tint;
    }
    var adj = [], col = [], i;
    for (i = 0; i < n; i++) adj.push({});
    for (c = 0; c < N; c++) E.neighbours(n, c).forEach(function (o) { if (pz.regions[o] !== pz.regions[c]) adj[pz.regions[c]][pz.regions[o]] = 1; });
    for (i = 0; i < n; i++) { var k = 0; while (Object.keys(adj[i]).some(function (j) { return col[j] === k; })) k++; col[i] = k; }
    for (c = 0; c < N; c++) tint.push(col[pz.regions[c]] % 5);
    return tint;
  }

  function underSvg(pz) {
    var n = pz.n, N = n * n, c, s = '', tint = regionTints(pz);
    for (c = 0; c < N; c++) s += '<rect class="rt' + tint[c] + '" x="' + (c % n) + '" y="' + Math.floor(c / n) + '" width="1" height="1"/>';
    if (pz.diag) s += '<path class="beepath" d="M.5 .5L' + (n - 0.5) + ' ' + (n - 0.5) + 'M' + (n - 0.5) + ' .5L.5 ' + (n - 0.5) + '"/>';
    if (pz.parity) {
      for (c = 0; c < N; c++) {
        var x = (c % n) + 0.5, y = Math.floor(c / n) + 0.5;
        if (pz.parity[c] === 2) s += '<circle class="moon" cx="' + x + '" cy="' + y + '" r=".4"/>';
        if (pz.parity[c] === 1) s += '<rect class="sun" x="' + (x - 0.29) + '" y="' + (y - 0.29) + '" width=".58" height=".58" rx=".08" transform="rotate(45 ' + x + ' ' + y + ')"/>';
      }
    }
    (pz.vines || []).forEach(function (vine) {
      var d = '', a = vine[vine.length - 2], b = vine[vine.length - 1];
      vine.forEach(function (cell, i) { d += (i ? 'L' : 'M') + ((cell % n) + 0.5) + ' ' + (Math.floor(cell / n) + 0.5); });
      var bx = (b % n) + 0.5, by = Math.floor(b / n) + 0.5, ang = Math.atan2(Math.floor(b / n) - Math.floor(a / n), (b % n) - (a % n)) * 180 / Math.PI;
      s += '<path class="vine" d="' + d + '"/><circle class="bulb" cx="' + ((vine[0] % n) + 0.5) + '" cy="' + (Math.floor(vine[0] / n) + 0.5) + '" r=".3"/>';
      s += '<path class="leaf" d="M0 0Q.16 -.2 .36 0Q.16 .2 0 0Z" transform="translate(' + bx + ' ' + by + ') rotate(' + ang + ')"/>';
    });
    return '<svg class="under" viewBox="0 0 ' + n + ' ' + n + '" aria-hidden="true">' + s + '</svg>';
  }
  function linesSvg(pz) {
    var n = pz.n, thin = '', thick = '', r, k, c;
    for (r = 0; r < n; r++) for (k = 0; k < n; k++) {
      c = r * n + k;
      if (k < n - 1) { if (pz.regions[c] !== pz.regions[c + 1]) thick += 'M' + (k + 1) + ' ' + r + 'V' + (r + 1); else thin += 'M' + (k + 1) + ' ' + r + 'V' + (r + 1); }
      if (r < n - 1) { if (pz.regions[c] !== pz.regions[c + n]) thick += 'M' + k + ' ' + (r + 1) + 'H' + (k + 1); else thin += 'M' + k + ' ' + (r + 1) + 'H' + (k + 1); }
    }
    return '<svg class="lines" viewBox="0 0 ' + n + ' ' + n + '" aria-hidden="true"><path class="thin" d="' + thin + '"/><path class="thick" d="' + thick + '"/></svg>';
  }

  function build(view) {
    var pz = G.pz, n = pz.n, c;
    var lv = G.level, color = lv ? lv.world.color : '#F2668B';
    var title = lv ? t(lv.name) + ' · ' + t('Garden {0}', pz.garden + 1) : t(W.dailyOf(G.key).name);
    var sub = lv ? lv.world.icon + ' ' + t(lv.world.name) + ' ' + lv.key : '💐 ' + t('Daily bouquet');

    els = {};
    els.cells = [];
    var grid = h('div.cells', { role: 'grid', 'aria-label': t('Garden') });
    for (c = 0; c < G.h; c++) {
      var cell = h('button.cell', { type: 'button', 'data-c': c });
      els.cells.push(cell);
      grid.appendChild(cell);
    }
    grid.addEventListener('pointerdown', function (e) {
      var b = e.target.closest ? e.target.closest('.cell') : null;
      if (!b) return;
      e.preventDefault();
      Snd.unlock();
      var cell = +b.getAttribute('data-c'), half = 0;
      if (G.twin) { var r = b.getBoundingClientRect(); half = e.clientX - r.left > r.width / 2 ? 1 : 0; } // left half: first figure
      tapCell(cell + half * G.h);
    });
    grid.addEventListener('click', function (e) { // keyboard and assistive taps (pointerdown did not fire)
      var b = e.target.closest ? e.target.closest('.cell') : null;
      if (!b || e.detail !== 0) return;
      var cell = +b.getAttribute('data-c');
      tapCell(G.twin && G.sel === cell ? cell + G.h : cell); // a second press moves to the second figure
    });

    els.board = h('div.board' + (G.twin ? '.twin' : ''), { style: { '--n': n } });
    els.board.insertAdjacentHTML('beforeend', underSvg(pz));
    els.board.appendChild(grid);
    els.board.insertAdjacentHTML('beforeend', linesSvg(pz));

    els.chips = h('button.chips', { type: 'button', 'aria-label': t('How this garden works'), onclick: showRules },
      (G.rules.length ? G.rules : ['base']).map(function (r) { return h('span.chip', RULES[r][0] + ' ' + t(RULES[r][1])); }));
    els.clock = BD.state.set.sundial ? h('span.clock', clock(G.time)) : null;
    els.bubble = h('p.bubble', { 'aria-live': 'polite' });
    els.pua = h('div.pua-box');

    els.pad = h('div.pad.n' + n);
    els.keys = [];
    for (var v = 1; v <= n; v++) (function (v) {
      var k = h('button.key', { type: 'button', onclick: function () { Snd.unlock(); tapKey(v); } });
      els.keys.push(k);
      els.pad.appendChild(k);
    })(v);
    els.pad.appendChild(h('button.key.erase', { type: 'button', 'aria-label': t('Erase'), onclick: function () { erase(G.sel); } },
      h('span.ico', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.500 5.500h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-10L3 12z"/><path d="M11.500 9.500l5 5M16.500 9.500l-5 5"/></svg>' }), h('small', t('Erase'))));

    function tool(cls, icon, label, fn) { return h('button.tool.' + cls, { type: 'button', onclick: function () { Snd.unlock(); fn(); } }, h('span.ico', { html: icon }), h('small', label)); }
    els.undo = tool('undo', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4.500 11.500 9 16"/><path d="M4.500 11.500H14a5.500 5.500 0 0 1 0 11h-2"/></svg>', t('Undo'), undo);
    els.redo = tool('redo', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7l4.500 4.500L15 16"/><path d="M19.500 11.500H10a5.500 5.500 0 0 0 0 11h2"/></svg>', t('Redo'), redo);
    els.notes = tool('notes', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4.500L16.500 4a2.100 2.100 0 0 1 3 3L8 18.500z"/><path d="M14.500 6l3 3"/></svg>', t('Notes'), function () { G.noteMode = !G.noteMode; Snd.soft(); paint(); });
    els.fly = tool('fly', '<span class="emo">🦋</span>', t('Butterfly'), butterfly);
    els.hintBtn = tool('hintb', '<span class="emo">🐝</span>', t('Hint'), bee);
    els.friends = tool('friends', '<span class="emo">🧺</span>', t('Helpers'), helpers);

    var top = h('header.play-top',
      h('a.round', { href: G.mode === 'daily' ? '#/daily' : '#/', 'aria-label': t('Back to the map') }, h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.500 5.500 8 12l6.500 6.500"/></svg>' })),
      h('div.play-title', h('b', title), h('span', sub)),
      h('button.round', { type: 'button', 'aria-label': t('Garden menu'), onclick: menu }, h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.500" cy="12" r="1.400"/><circle cx="12" cy="12" r="1.400"/><circle cx="18.500" cy="12" r="1.400"/></svg>' })));

    var root = h('div.play', { style: { '--wc': color } },
      top,
      h('div.says', els.pua, h('div.says-body', els.bubble, h('div.says-row', els.chips, els.clock))),
      h('div.board-wrap', els.board),
      h('div.tools', els.undo, els.redo, els.notes, els.fly, els.hintBtn, els.friends),
      els.pad);
    BD.clear(view).appendChild(root);
    document.addEventListener('keydown', onKey);

    var tip = G.twin && !BD.state.seen.twinTip;
    var hello = G.vals.join() !== pz.givens.join() ? t('Welcome back. Your garden is as you left it.')
      : tip ? t('Tap the left half of a cell for its first figure and the right half for the second.')
      : lv ? t(lv.teaches) + '.' : t('Today\'s garden is the same for everyone. Take your time.');
    if (tip) { BD.state.seen.twinTip = 1; BD.save(); }
    say(hello, 'hi');
    paint();
  }

  function say(text, mood) {
    if (!els) return;
    els.bubble.textContent = text;
    els.pua.innerHTML = A.pua(mood || 'hi', 46);
    els.bubble.classList.remove('pop');
    void els.bubble.offsetWidth; // restart the little pop
    els.bubble.classList.add('pop');
  }

  // The name of a figure as shown: in a twin garden the second figure is always a number.
  function nameOf(slot, v) {
    var skin = BD.skin();
    if (G.twin && slot >= G.h) return String(v);
    return A.name(v, skin) + (skin !== 'numbers' && (G.badge || BD.state.set.badge) ? ' (' + v + ')' : '');
  }
  function noteGrid(mask, n) {
    var s = '<span class="notes n' + n + '">';
    for (var v = 1; v <= n; v++) s += '<i>' + (mask & (1 << (v - 1)) ? A.token(v, BD.skin()) : '') + '</i>';
    return s + '</span>';
  }
  // Half of a twin cell: its figure, or its pencil notes as coloured dots (the place and the colour say which).
  function halfHtml(slot, cls, skin) {
    var v = G.vals[slot], n = G.pz.n, s;
    if (v) s = A.token(v, slot < G.h ? skin : 'numbers');
    else {
      s = '<span class="dots n' + n + '">';
      for (var k = 1; k <= n; k++) s += '<i' + (G.notes[slot] & (1 << (k - 1)) ? ' class="v' + k + '"' : '') + '></i>';
      s += '</span>';
    }
    return '<span class="half ' + cls + '">' + s + '</span>';
  }

  function paint() {
    if (!G || !els) return;
    var S = G.S, pz = G.pz, n = pz.n, H = G.h, c, skin = BD.skin(), badge = skin !== 'numbers' && (G.badge || BD.state.set.badge);
    var selCell = G.sel >= 0 ? G.sel % H : -1, layer = G.sel >= H ? H : 0;
    var selVal = G.armed || (G.sel >= 0 ? G.vals[G.sel] : 0);
    var hop = {}, via = {}, hintGroup = {};
    if (G.sel >= 0) S.hops[G.sel].forEach(function (o) { hop[o] = 1; });
    if (G.hint) {
      (G.hint.groupCells || []).forEach(function (o) { hintGroup[o % H] = 1; });
      (G.hint.viaCells || []).forEach(function (o) { via[o % H] = 1; });
    }
    function wrong(slot) { return G.vals[slot] && G.vals[slot] !== pz.solution[slot] && (BD.state.set.wilt || G.flagged[slot]); }
    function marks(slot) {
      return (pz.givens[slot] ? ' giv' : '') + (wrong(slot) ? ' wilt' : '') + (G.sel === slot ? ' on' : '') + (G.hint && G.hint.cell === slot ? ' hinted' : '') + (G.lady && G.lady.slots[slot] ? ' can' : '');
    }
    for (c = 0; c < H; c++) {
      var el = els.cells[c], v = G.vals[c], cls = 'cell', key, bad, same, label;
      if (G.twin) {
        var b = G.vals[H + c], ca = marks(c), cb = marks(H + c);
        key = skin + ':' + v + ':' + b + ':' + G.notes[c] + ':' + G.notes[H + c] + ':' + ca + ':' + cb;
        if (el._key !== key) { el._key = key; el.innerHTML = '<span class="duo">' + halfHtml(c, 'fa' + ca, skin) + halfHtml(H + c, 'fb' + cb, skin) + '</span>'; }
        if (pz.givens[c] && pz.givens[H + c]) cls += ' given';
        bad = wrong(c) || wrong(H + c);
        same = selVal && c !== selCell && (G.sel >= 0 ? G.vals[layer + c] === selVal : v === selVal || b === selVal);
        label = (v ? nameOf(c, v) : t('empty')) + ', ' + (b ? String(b) : t('empty'));
      } else {
        key = skin + ':' + v + ':' + G.notes[c] + ':' + (badge ? 1 : 0);
        if (el._key !== key) { el._key = key; el.innerHTML = v ? A.token(v, skin, badge) : G.notes[c] ? noteGrid(G.notes[c], n) : ''; }
        if (pz.givens[c]) cls += ' given';
        bad = wrong(c);
        same = selVal && v === selVal && c !== selCell;
        label = v ? A.name(v, skin) : t('empty');
        if (G.lady && G.lady.slots[c]) cls += ' can';
        if (G.hint && G.hint.cell === c) cls += ' hint';
      }
      if (c === selCell) cls += ' sel';
      else if (G.sel >= 0 && S.sees[G.sel][layer + c]) cls += ' peer';
      if (same) cls += ' same';
      if (bad) cls += ' wilt';
      if (hop[c]) cls += ' hop';
      if (hintGroup[c]) cls += ' hintg';
      if (via[c]) cls += ' via';
      if (el._bloom) cls += ' bloom';
      if (el.className !== cls) el.className = cls;
      el.setAttribute('aria-label', t('Row {0}, column {1}', Math.floor(c / n) + 1, (c % n) + 1) + ': ' + label);
    }
    // the pad counts what is still missing, in the layer being worked on
    var count = [], padSkin = G.twin && layer ? 'numbers' : skin;
    for (c = 0; c <= n; c++) count.push(0);
    for (c = 0; c < H; c++) if (G.vals[layer + c]) count[G.vals[layer + c]]++;
    els.keys.forEach(function (k, i) {
      var v = i + 1, left = n - count[v], kk = padSkin + ':' + left + ':' + (badge ? 1 : 0);
      if (k._key !== kk) { k._key = kk; k.innerHTML = A.token(v, padSkin, badge && !G.twin) + '<small class="left">' + (left > 0 ? left : '✓') + '</small>'; k.setAttribute('aria-label', A.name(v, padSkin)); }
      k.className = 'key' + (G.armed === v ? ' armed' : '') + (left <= 0 ? ' full' : '');
      k.setAttribute('aria-pressed', G.armed === v ? 'true' : 'false');
    });
    els.undo.disabled = !G.undo.length;
    els.redo.disabled = !G.redo.length;
    els.notes.classList.toggle('on', G.noteMode);
    els.notes.setAttribute('aria-pressed', G.noteMode ? 'true' : 'false');
    els.fly.classList.toggle('on', !!G.mark);
    els.pad.classList.toggle('noting', G.noteMode);
    els.pad.classList.toggle('second', !!(G.twin && layer));
  }
  P.repaint = function () { if (els) { els.cells.forEach(function (c) { c._key = null; }); els.keys.forEach(function (k) { k._key = null; }); paint(); } };

  /* ---------- moves ---------- */
  function apply(op, forward) {
    op.forEach(function (m) { G.vals[m[0]] = forward ? m[3] : m[1]; G.notes[m[0]] = forward ? m[4] : m[2]; delete G.flagged[m[0]]; });
  }
  function commit(op) {
    G.hint = null; G.lady = null;
    if (!op.length) return;
    apply(op, true);
    G.undo.push(op);
    if (G.undo.length > 400) G.undo.shift();
    G.redo = [];
  }
  function resync() { // after undo, redo or a flight back: which groups are complete now
    G.bloomed = {};
    E.doneGroups(G.S, G.vals).forEach(function (gi) { G.bloomed[gi] = 1; });
    G.hint = null; G.lady = null;
    save(); paint();
  }
  function undo() { if (!G.undo.length || G.won) return; var op = G.undo.pop(); apply(op, false); G.redo.push(op); Snd.soft(); resync(); }
  function redo() { if (!G.redo.length || G.won) return; var op = G.redo.pop(); apply(op, true); G.undo.push(op); Snd.soft(); resync(); }

  function tapCell(slot) {
    if (!G || G.won) return;
    if (G.armed) { G.sel = slot; put(slot, G.armed); return; }
    G.sel = G.sel === slot ? -1 : slot;
    Snd.tap();
    paint();
  }
  function tapKey(v) {
    if (!G || G.won) return;
    if (G.sel >= 0 && !G.armed && !G.pz.givens[G.sel]) { put(G.sel, v); return; }
    G.armed = G.armed === v ? 0 : v; // no cell chosen: hold this flower and tap the cells where it goes
    if (G.armed) G.sel = -1;
    Snd.tap();
    paint();
  }
  function erase(c) {
    if (!G || G.won || c < 0 || G.pz.givens[c] || (!G.vals[c] && !G.notes[c])) return;
    commit([[c, G.vals[c], G.notes[c], 0, 0]]);
    Snd.soft(); resync();
  }
  // A right figure leaves the notes of everything it sees.
  function tidy(c, v, op) {
    var bit = 1 << (v - 1);
    if (BD.state.set.tidy) G.S.peers[c].forEach(function (o) { if (!G.vals[o] && (G.notes[o] & bit)) op.push([o, 0, G.notes[o], 0, G.notes[o] & ~bit]); });
    return op;
  }

  function put(c, v) {
    var pz = G.pz;
    if (pz.givens[c]) { paint(); return; }
    var bit = 1 << (v - 1);
    if (G.noteMode) {
      if (G.vals[c]) { paint(); return; }
      commit([[c, 0, G.notes[c], 0, G.notes[c] ^ bit]]);
      Snd.soft(); Snd.tap(); save(); paint();
      return;
    }
    if (G.vals[c] === v) { erase(c); return; }
    var right = v === pz.solution[c], op = [[c, G.vals[c], G.notes[c], v, 0]];
    commit(right ? tidy(c, v, op) : op);
    Snd.tap();
    if (!right) {
      G.slips++;
      if (BD.state.set.wilt) { Snd.wilt(); say(t('That one wilted. Something it sees already has it, or it belongs elsewhere.'), 'oops'); }
      else Snd.note(v);
      save(); paint();
      if (!BD.state.set.wilt && G.vals.every(function (x) { return x; })) say(t('The garden is full but something is off. The owl can find it.'), 'think');
      return;
    }
    Snd.note(v);
    if (G.twin && !G.armed) { // on to the other half of the couple, if it is still empty
      var mate = c < G.h ? c + G.h : c - G.h;
      if (!G.vals[mate] && !pz.givens[mate]) G.sel = mate;
    }
    afterRight(c);
  }

  // A right flower: bloom the rows, columns and plots it completed, or the whole garden.
  function afterRight(c) {
    var S = G.S, done = [];
    S.cellGroups[c].forEach(function (gi) {
      if (G.bloomed[gi]) return;
      var g = S.groups[gi];
      for (var i = 0; i < g.cells.length; i++) if (G.vals[g.cells[i]] !== G.pz.solution[g.cells[i]]) return;
      G.bloomed[gi] = 1; done.push(g);
    });
    var all = true;
    for (var i = 0; i < S.N; i++) if (G.vals[i] !== G.pz.solution[i]) { all = false; break; }
    if (all) { win(); return; }
    if (done.length) {
      done.forEach(function (g, k) { bloom(g.cells, k * 0.12); Snd.melody(g.cells.map(function (x) { return G.vals[x]; }), 0.12 + k * 0.5); });
      var kind = done[0].kind;
      say(kind === 'row' ? t('A whole row in bloom!') : kind === 'col' ? t('A whole column in bloom!') : kind === 'diag' ? t('A bee path in bloom!') : t('A whole plot in bloom!'), 'happy');
    }
    save(); paint();
  }
  function bloom(slots, delay) {
    slots.forEach(function (slot, i) {
      var el = els.cells[slot % G.h];
      el._bloom = true;
      el.style.setProperty('--d', ((delay || 0) + i * 0.045) + 's');
      el.classList.add('bloom');
      setTimeout(function () { el._bloom = false; el.classList.remove('bloom'); }, 1100 + i * 45 + (delay || 0) * 1000);
    });
  }

  /* ---------- butterfly bookmark ---------- */
  function butterfly() {
    if (G.won) return;
    if (!G.mark) {
      G.mark = { vals: G.vals.slice(), notes: G.notes.slice() };
      save(); paint();
      say(t('The butterfly waits here. Try your idea; you can fly back to this moment.'), 'hi');
      return;
    }
    var close = BD.sheet(h('div.menu',
      h('h2', '🦋 ' + t('Butterfly')),
      h('p.muted', t('The butterfly remembers the garden as it was when you left it there.')),
      h('button.btn.primary', { type: 'button', onclick: function () { close(); flyBack(); } }, t('Fly back to the butterfly')),
      h('button.btn', { type: 'button', onclick: function () { close(); G.mark = { vals: G.vals.slice(), notes: G.notes.slice() }; save(); say(t('The butterfly moved here.'), 'hi'); } }, t('Move the butterfly here')),
      h('button.btn.ghost', { type: 'button', onclick: function () { close(); G.mark = null; save(); paint(); } }, t('Let it go'))));
  }
  function flyBack() {
    var op = [];
    for (var c = 0; c < G.S.N; c++) if (G.vals[c] !== G.mark.vals[c] || G.notes[c] !== G.mark.notes[c]) op.push([c, G.vals[c], G.notes[c], G.mark.vals[c], G.mark.notes[c]]);
    commit(op);
    G.mark = null;
    Snd.soft(); resync();
    say(t('Back where the butterfly was. Undo takes you forward again.'), 'hi');
  }

  /* ---------- hint and helpers ---------- */
  function wrongCells() { var out = []; for (var c = 0; c < G.S.N; c++) if (G.vals[c] && G.vals[c] !== G.pz.solution[c]) out.push(c); return out; }
  function groupName(g) {
    if (g.kind === 'row') return t('row');
    if (g.kind === 'col') return t('column');
    if (g.kind === 'diag') return t('bee path');
    return G.rules.indexOf('pads') >= 0 ? t('lily pad') : t('plot');
  }

  function helpers() {
    if (G.won) return;
    function row(icon, name, what, note, fn, id) {
      var none = id && Shop.stock(BD.state, id) < 1;
      return h('button.helper' + (none ? '.none' : ''), { type: 'button', 'data-helper': id || name, onclick: function () { close(); if (none) location.hash = '#/shop'; else fn(); } },
        h('span.emo', icon), h('span.grow', h('b', name), h('span', none ? t('None left. Get more in the shop.') : what)),
        h('small', id ? '×' + Shop.stock(BD.state, id) + (note ? ' · ' + note : '') : note));
    }
    var close = BD.sheet(h('div.menu',
      h('h2', t('Helpers')),
      row('🐝', t('Bee'), t('A hint: flies to a cell you can solve now and says why. Ask again and it names the flower.'), t('free'), bee),
      row('🐛', t('Caterpillar'), t('Writes the pencil notes, or tidies the ones you have.'), t('free'), caterpillar),
      row('🐞', t('Ladybird'), t('Shows every cell where one flower can still go.'), '', ladybird, 'lady'),
      row('🦉', t('Owl'), t('Shows which flowers are wilted.'), t('costs ★'), owl, 'owl'),
      row('🐸', t('Frog'), t('Plants one flower for you.'), t('costs ★'), frog, 'frog'),
      h('p.muted.small', t('The second star is for a garden finished with nothing revealed: no owl, no frog, no flower named by the bee.')),
      h('a.btn.ghost', { href: '#/shop', onclick: function () { close(); } }, '🌰 ' + t('More helpers in the shop'))));
  }

  // The hint. First it shows where to look and why; asked again about the same cell, it names the flower.
  function bee() {
    if (G.won) return;
    if (G.hint && G.hint.v && !G.hint.named && G.vals[G.hint.cell] !== G.hint.v) {
      G.hint.named = true; G.told = true; G.sel = G.hint.cell; G.armed = 0;
      save(); paint();
      say(t('It is {0}. Plant it in the glowing cell.', nameOf(G.hint.cell, G.hint.v)), 'happy');
      return;
    }
    if (wrongCells().length) { say(t('A flower is in the wrong place, so I cannot see the next step. The owl can find it.'), 'think'); return; }
    var hint = E.hint(G.S, G.vals, 2);
    if (hint.broken || hint.stuck) {
      if (hint.cell >= 0) { G.sel = hint.cell; G.armed = 0; G.hint = { cell: hint.cell }; paint(); }
      say(t('No easy step here. Try this cell: few flowers fit.'), 'think');
      return;
    }
    G.bees++;
    var S = G.S, text = '', hi = { cell: hint.cell, v: hint.v, groupCells: [], viaCells: [] };
    if (hint.via.length) {
      var e = hint.via[hint.via.length - 1], g = S.groups[e.group];
      hi.viaCells = e.cells;
      text = e.type === 'locked'
        ? t('A trick first: in this {0}, {1} fits only in the marked cells, so no cell that sees all of them can hold it. ', groupName(g), nameOf(e.cells[0], e.v))
        : t('A trick first: the two marked cells of this {0} share the same two flowers, so no other cell of it can hold them. ', groupName(g));
    }
    if (G.twin) text += hint.cell < G.h ? t('Look at the first figure of the glowing cell. ') : t('Look at the second figure of the glowing cell. ');
    if (hint.g && hint.g.kind === 'couple') {
      hi.groupCells = hint.g.cells;
      text += hint.type === 'last' ? t('The marked cells share a figure, so their partners are all different: this is the last one missing.')
        : t('The marked cells share a figure, so their partners are all different. One partner has only this place left.');
    } else if (hint.type === 'last') { hi.groupCells = hint.g.cells; text += t('This is the last free cell of its {0}.', groupName(hint.g)); }
    else if (hint.type === 'hidden') { hi.groupCells = hint.g.cells; text += t('One flower has no other place left in this {0}. Which one?', groupName(hint.g)); }
    else text += G.twin ? t('Only one figure still fits here. Check its row, column and plot, and the cells that share its partner.') : t('Only one flower still fits in this cell. Check everything it sees.');
    G.sel = hint.cell; G.armed = 0; G.lady = null; G.hint = hi;
    save(); paint();
    say(text, 'think');
  }

  function caterpillar() {
    var cand = E.candidates(G.S, G.vals), op = [];
    for (var c = 0; c < G.S.N; c++) {
      if (G.vals[c]) continue;
      var nn = G.notes[c] ? G.notes[c] & cand[c] : cand[c];
      if (nn !== G.notes[c]) op.push([c, 0, G.notes[c], 0, nn]);
    }
    commit(op);
    Snd.soft(); save(); paint();
    say(op.length ? t('Munch munch. The notes show what still fits in each cell.') : t('Your notes are already tidy.'), 'happy');
  }

  // Marks every empty cell where one flower can still go: the one held on the pad, or the one in the chosen cell.
  function ladybird() {
    var v = G.armed || (G.sel >= 0 ? G.vals[G.sel] : 0), layer = G.twin && G.sel >= G.h ? G.h : 0;
    if (!v) { say(t('Choose a flower first: hold one on the pad or tap a cell that has it. Then call me.'), 'think'); return; }
    if (!Shop.use(BD.state, 'lady')) return;
    var cand = E.candidates(G.S, G.vals), slots = {}, n = 0;
    for (var c = 0; c < G.h; c++) if (!G.vals[layer + c] && (cand[layer + c] & (1 << (v - 1)))) { slots[layer + c] = 1; n++; }
    G.hint = null; G.lady = { v: v, slots: slots };
    save(); paint();
    say(n ? t('{0} can still go in the dotted cells.', nameOf(layer, v)) : t('{0} has no free place left.', nameOf(layer, v)), 'happy');
  }

  function owl() {
    if (!Shop.use(BD.state, 'owl')) return;
    var bad = wrongCells();
    G.owl = true;
    bad.forEach(function (c) { G.flagged[c] = 1; });
    save(); paint();
    say(bad.length === 0 ? t('Every flower you planted is right.') : bad.length === 1 ? t('One flower is wilted. I marked it.') : t('{0} flowers are wilted. I marked them.', bad.length), bad.length ? 'oops' : 'happy');
  }

  function frog() {
    var c = G.sel >= 0 && !G.pz.givens[G.sel] && G.vals[G.sel] !== G.pz.solution[G.sel] ? G.sel : -1;
    if (c < 0) {
      var hint = wrongCells().length ? null : E.hint(G.S, G.vals, 2);
      if (hint && !hint.broken && hint.cell >= 0) c = hint.cell;
      else for (var i = 0; i < G.S.N; i++) if (G.vals[i] !== G.pz.solution[i]) { c = i; break; }
    }
    if (c < 0 || !Shop.use(BD.state, 'frog')) return;
    var v = G.pz.solution[c];
    commit(tidy(c, v, [[c, G.vals[c], G.notes[c], v, 0]]));
    G.frog = true; G.sel = c; G.armed = 0;
    Snd.note(v);
    say(t('Ribbit. One flower planted.'), 'happy');
    afterRight(c);
  }

  /* ---------- menu, rules ---------- */
  function showRules() {
    var list = G.twin ? ['twin'] : ['base'].concat(G.rules.filter(function (r) { return r !== 'base'; }));
    BD.sheet(h('div.menu',
      h('h2', t('How this garden works')),
      list.map(function (r) {
        if (r === 'base' && G.rules.indexOf('pads') >= 0) return null;
        return h('div.rule', h('span.emo', RULES[r][0]), h('p', t(RULES[r][2])));
      }),
      G.twin ? h('div.rule', h('span.emo', '👆'), h('p', t('Tap the left half of a cell for its first figure and the right half for the second.'))) : null,
      G.rules.indexOf('parity') >= 0 ? h('div.rule', h('span.legend', { html: '<svg viewBox="0 0 2.400 1" aria-hidden="true"><circle class="moon" cx=".5" cy=".5" r=".4"/><rect class="sun" x="1.610" y=".21" width=".58" height=".58" rx=".08" transform="rotate(45 1.900 .5)"/></svg>' }), h('p', t('The round mark is a moon cell (even). The diamond is a sun cell (odd).'))) : null,
      h('p.muted.small', t('Every garden has exactly one answer and never needs a guess.'))));
  }

  function menu() {
    var skins = Shop.of('skin').filter(function (it) { return Shop.owns(BD.state, it.id); });
    var close = BD.sheet(h('div.menu',
      h('h2', t('Garden menu')),
      h('div.segs', skins.map(function (it) {
        return h('button.seg' + (BD.skin() === it.value ? '.on' : ''), { type: 'button', 'data-skin': it.value, onclick: function () { Shop.wear(BD.state, it.id); BD.save(); close(); P.repaint(); } },
          h('span', { html: A.token(it.value === 'numbers' ? 5 : 1, it.value) }), t(it.name));
      })),
      h('button.btn', { type: 'button', onclick: function () { close(); showRules(); } }, t('How this garden works')),
      G.mode === 'level' ? h('button.btn', { type: 'button', onclick: function () { close(); BD.confirm(t('New seeds?'), t('This garden is swapped for another one of the same level. Nothing is lost.'), t('New seeds'), newSeeds); } }, t('New seeds')) : null,
      h('button.btn.ghost', { type: 'button', onclick: function () { close(); BD.confirm(t('Start over?'), t('Everything you planted in this garden is cleared.'), t('Start over'), startOver); } }, t('Start over'))));
  }
  function newSeeds() {
    var key = G.key;
    W.skip(BD.state, key, G.pz.garden);
    delete BD.state.games[G.id];
    BD.save();
    P.open(document.getElementById('view'), 'level', key);
  }
  function startOver() {
    var op = [];
    for (var c = 0; c < G.S.N; c++) if (!G.pz.givens[c] && (G.vals[c] || G.notes[c])) op.push([c, G.vals[c], G.notes[c], 0, 0]);
    commit(op);
    G.mark = null; G.sel = -1; G.armed = 0;
    resync();
  }

  /* ---------- winning ---------- */
  function win() {
    G.won = true; G.sel = -1; G.armed = 0; G.hint = null; G.lady = null;
    var n = G.pz.n;
    paint();
    els.cells.forEach(function (el, c) {
      el.style.setProperty('--d', ((Math.floor(c / n) + (c % n)) * 0.05) + 's');
      el.classList.add('bloom');
    });
    Snd.win();
    var result = { slips: G.slips, frog: G.frog || G.told, owl: G.owl, bees: G.bees, time: G.time };
    var before = W.player(BD.state), nuts = Shop.earned(BD.state);
    var out = G.mode === 'daily' ? W.finishDaily(BD.state, G.key, result) : W.finish(BD.state, G.key, G.pz.garden, result);
    var after = W.player(BD.state);
    out.xp = after.xp - before.xp; out.nuts = Shop.earned(BD.state) - nuts; out.level = after.level > before.level ? after : null;
    delete BD.state.games[G.id];
    BD.save();
    say(t('The whole garden is in bloom!'), 'happy');
    var g = G;
    setTimeout(function () { if (G === g) winSheet(result, out); }, 1100);
  }

  // What falls when a garden blooms: petals, or the effect bought in the shop.
  var EFFECTS = {
    petals: { colors: A.colors },
    hearts: { ch: '♥', colors: ['#F2668B', '#FF8FA8', '#E0457B', '#D05FC2'] },
    leaves: { colors: ['#D9662B', '#E3A008', '#A8742A', '#C23A30', '#E8A417'] },
    stars: { ch: '★', colors: ['#F2B807', '#FFD86B', '#F5C518'] },
    snow: { ch: '❄', colors: ['#9CC4F2', '#C9DFF8', '#7FBCF7'] },
  };
  P.EFFECTS = EFFECTS;
  function petals() {
    var fx = EFFECTS[Shop.wearing(BD.state, 'effect')] || EFFECTS.petals;
    var box = h('div.petals', { 'aria-hidden': 'true' });
    for (var i = 0; i < 26; i++) {
      box.appendChild(h('i' + (fx.ch ? '.ch' : ''), { style: { left: (Math.random() * 100) + '%', '--c': fx.colors[i % fx.colors.length], '--t': (2.6 + Math.random() * 2.2) + 's', '--w': (Math.random() * 1.6) + 's', '--x': (Math.random() * 80 - 40) + 'px' } }, fx.ch || null));
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 6500);
  }

  function winSheet(result, out) {
    petals();
    var lv = G.level, next = null, mode = G.mode, key = G.key, garden = G.pz.garden;
    if (lv) { var nx = W.levels[lv.index + 1]; if (nx && W.open(BD.state, nx)) next = nx; }
    function line(ok, text) { return h('li' + (ok ? '.ok' : ''), h('span', ok ? '★' : '☆'), text); }
    var view = document.getElementById('view');
    var close = BD.sheet(h('div.win',
      h('div.win-pua', { html: A.pua('happy', 88) }),
      h('h2', t('The garden is in bloom!')),
      h('div.win-stars', { 'aria-label': t('{0} of 3 stars', out.stars) }, [1, 2, 3].map(function (i) { return h('span' + (i <= out.stars ? '.on' : ''), { style: { '--d': (i * 0.18) + 's' } }, '★'); })),
      h('ul.win-list',
        line(true, t('The garden bloomed')),
        line(!result.frog && !result.owl, t('On your own: nothing revealed')),
        line(!result.slips, result.slips ? (result.slips === 1 ? t('One flower wilted on the way') : t('{0} flowers wilted on the way', result.slips)) : t('Not a petal out of place'))),
      h('div.win-gain', out.nuts ? h('span.nuts', '+' + out.nuts + ' 🌰') : null, out.xp ? h('span.xp', '+' + out.xp + ' XP') : null),
      out.level ? h('p.stamp-new.levelup', '🎉 ' + t('Level {0}! You are now: {1}', out.level.level, t(out.level.title))) : null,
      BD.state.set.sundial ? h('p.muted', '⏱ ' + clock(result.time)) : null,
      lv ? h('p.muted', t('{0} of {1} gardens in bloom in this level', W.solved(BD.state, key), W.GARDENS)) : null,
      out.stamp ? h('p.stamp-new', lv.world.stamp + ' ' + t('New stamp: {0} is complete!', t(lv.world.name))) : null,
      mode === 'daily'
        ? [h('button.btn.primary', { type: 'button', onclick: function () { BD.share(key); } }, t('Share my bouquet')),
           h('a.btn', { href: '#/daily', onclick: function () { close(); } }, t('Back to the daily bouquet'))]
        : [h('button.btn' + (next && out.first ? '' : '.primary'), { type: 'button', onclick: function () { close(); P.open(view, 'level', key); } }, t('Next garden: {0}', out.next + 1)),
           next ? h('a.btn' + (out.first ? '.primary' : ''), { href: '#/play/' + next.key, onclick: function () { close(); } }, t('Next level: {0}', t(next.name))) : null,
           BD.friends && BD.friends.canChallenge() ? h('button.btn.challenge-btn', { type: 'button', onclick: function () { BD.friends.challenge(key, garden, result); } }, '💌 ' + t('Challenge a friend')) : null,
           h('a.btn.ghost', { href: '#/', onclick: function () { close(); } }, t('Back to the map'))]),
      { modal: true });
  }

  /* ---------- keyboard (for computers) ---------- */
  function onKey(e) {
    if (!G || G.won || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.sheet-back')) return;
    var n = G.pz.n, k = e.key;
    if (/^[1-9]$/.test(k) && +k <= n) { if (G.sel >= 0) put(G.sel, +k); else tapKey(+k); }
    else if (k === 'Backspace' || k === 'Delete' || k === '0') erase(G.sel);
    else if (k === 'n' || k === 'N') { G.noteMode = !G.noteMode; paint(); }
    else if (k === 'z' || k === 'Z') undo();
    else if (k === 'y' || k === 'Y') redo();
    else if (k === ' ' && G.twin && G.sel >= 0) { G.sel = G.sel < G.h ? G.sel + G.h : G.sel - G.h; paint(); } // the other half
    else if (k.indexOf('Arrow') === 0) {
      var layer = G.sel >= G.h ? G.h : 0, c = G.sel < 0 ? 0 : G.sel % G.h, r = Math.floor(c / n), col = c % n;
      if (k === 'ArrowUp') r = (r + n - 1) % n;
      if (k === 'ArrowDown') r = (r + 1) % n;
      if (k === 'ArrowLeft') col = (col + n - 1) % n;
      if (k === 'ArrowRight') col = (col + 1) % n;
      G.sel = layer + r * n + col; G.armed = 0; paint();
    } else return;
    e.preventDefault();
  }
})();
