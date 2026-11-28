(function () {
  'use strict';
  var C = Chess;
  var GL = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var PN = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
  var STAR_PATH = '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/>';
  var STAR = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true">' + STAR_PATH + '</svg>';

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(t) { return esc(t).replace(/\*(.+?)\*/g, '<b>$1</b>'); }
  function toTop() { $('#main').scrollTop = 0; }
  function toI(x) { return typeof x === 'number' ? x : C.idx(x); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function piece(p) {
    return '<svg class="pc ' + (p === p.toUpperCase() ? 'pw' : 'pb') + '" viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="83" text-anchor="middle" font-size="90">' + GL[p.toLowerCase()] + '</text></svg>';
  }

  /* ---------- saved progress ---------- */
  var KEY = 'eighth-rank-v1';
  var S = { xp: 0, done: {}, rating: 600, solved: {}, streak: 0, last: '', vision: 0, openings: {}, level: 2, color: 'w', coach: true, kind: 'all', start: 0, mode: 'fast', missed: {}, today: null, skin: '', lines: {}, v: 1, vision2: 0 };
  var RANKS = [[0, 'Pawn', 'p'], [150, 'Knight', 'n'], [400, 'Bishop', 'b'], [800, 'Rook', 'r'], [1400, 'Queen', 'q'], [2200, 'King', 'k']];
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage may be unavailable */ } }
  function day(off) { var d = new Date(Date.now() - (off || 0) * 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function streakNow() { return S.last === day() || S.last === day(1) ? S.streak : 0; }
  function header() {
    var r = 0;
    while (r + 1 < RANKS.length && S.xp >= RANKS[r + 1][0]) r++;
    var lo = RANKS[r][0], hi = r + 1 < RANKS.length ? RANKS[r + 1][0] : lo;
    $('#lvl').innerHTML = '<span>' + GL[RANKS[r][2]] + '</span><b>' + RANKS[r][1] + '</b> ' + S.xp + ' XP';
    $('#xpfill').style.width = (hi > lo ? Math.min(100, (S.xp - lo) / (hi - lo) * 100) : 100) + '%';
    $('#streak').innerHTML = streakNow() ? '<b>' + streakNow() + '</b>-day streak' : '';
  }
  var toastTimer;
  function toast(t) {
    var el = $('#toast');
    el.textContent = t; el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 1800);
  }
  function gain(n, why) {
    var t = day();
    if (S.last !== t) { S.streak = S.last === day(1) ? S.streak + 1 : 1; S.last = t; }
    S.xp += n; persist(); header();
    toast('+' + n + ' XP' + (why ? ' · ' + why : ''));
  }

  var GOAL = { lesson: 1, puzzles: 5, moves: 15 };
  function td() {
    if (!S.today || S.today.d !== day()) S.today = { d: day(), lesson: 0, puzzles: 0, moves: 0, bonus: false };
    return S.today;
  }
  function credit(what) {
    var t = td();
    t[what]++;
    persist();
    if (!t.bonus && t.lesson >= GOAL.lesson && t.puzzles >= GOAL.puzzles && t.moves >= GOAL.moves) { t.bonus = true; gain(50, 'sprint done'); }
  }

  /* ---------- board ---------- */
  var boardCount = 0;
  function Board(host) {
    this.id = ++boardCount; this.flip = false; this.coords = true;
    this.pos = new Array(64).fill(null);
    this.sel = -1; this.tg = []; this.marks = []; this.arrows = []; this.stars = [];
    this.last = null; this.check = -1; this.anim = null; this.flash = null;
    this.moves = null; this.onMove = null; this.onSquare = null;
    host.innerHTML = '<div class="board"><div class="squares"></div><svg class="arrows" viewBox="0 0 8 8" aria-hidden="true"></svg><div class="promo" hidden></div></div>';
    this.el = host.firstChild; this.grid = $('.squares', host); this.svg = $('.arrows', host); this.promo = $('.promo', host);
    var self = this;
    this.grid.addEventListener('pointerdown', function (e) { var b = e.target.closest('.sq'); if (b) self.down(+b.dataset.i, e); });
    this.grid.addEventListener('click', function (e) { var b = e.target.closest('.sq'); if (b && e.detail === 0) self.pick(+b.dataset.i); });
    this.draw();
  }
  Board.prototype.cell = function (i) { return this.grid.children[this.flip ? 63 - i : i]; };
  Board.prototype.draw = function () {
    var html = '', d, i, x, y, p, cls, inner, self = this;
    for (d = 0; d < 64; d++) {
      i = this.flip ? 63 - d : d; x = i & 7; y = i >> 3; p = this.pos[i];
      cls = 'sq ' + ((x + y) % 2 ? 'dark' : 'light');
      if (this.last && (i === this.last.from || i === this.last.to)) cls += ' last';
      if (i === this.sel) cls += ' sel';
      if (i === this.check) cls += ' chk';
      if (this.marks.indexOf(i) >= 0) cls += ' mark';
      if (this.tg.indexOf(i) >= 0) cls += p ? ' tg cap' : ' tg';
      if (this.flash && this.flash.i === i) cls += ' ' + this.flash.c;
      inner = '';
      if (this.coords) {
        if ((d & 7) === 0) inner += '<i class="rk">' + (8 - y) + '</i>';
        if ((d >> 3) === 7) inner += '<i class="fl">' + C.FILES[x] + '</i>';
      }
      if (this.stars.indexOf(i) >= 0) inner += STAR;
      if (p) inner += piece(p);
      html += '<button type="button" class="' + cls + '" data-i="' + i + '" aria-label="' + C.name(i) + (p ? ' ' + (C.colorOf(p) === 'w' ? 'white ' : 'black ') + PN[p.toLowerCase()] : '') + '">' + inner + '</button>';
    }
    this.grid.innerHTML = html;
    var pt = function (k) { var cx = k & 7, cy = k >> 3; return [(self.flip ? 7 - cx : cx) + 0.5, (self.flip ? 7 - cy : cy) + 0.5]; };
    var svg = '<defs><marker id="ah' + this.id + '" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>';
    this.arrows.forEach(function (a) {
      var f = pt(a[0]), t = pt(a[1]), dx = t[0] - f[0], dy = t[1] - f[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      svg += '<line x1="' + f[0] + '" y1="' + f[1] + '" x2="' + (t[0] - dx / len * 0.3) + '" y2="' + (t[1] - dy / len * 0.3) + '" marker-end="url(#ah' + self.id + ')"/>';
    });
    this.svg.innerHTML = svg;
    if (this.anim && !this.noAnim) {
      var a = this.anim, cell = this.cell(a.to), pc = cell && cell.querySelector('.pc'), sign = this.flip ? -1 : 1;
      if (pc) {
        pc.style.transform = 'translate(' + ((a.from & 7) - (a.to & 7)) * sign * 100 + '%,' + ((a.from >> 3) - (a.to >> 3)) * sign * 100 + '%)';
        cell.classList.add('lift');
        void pc.getBoundingClientRect();
        pc.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)';
        pc.style.transform = '';
      }
    }
    this.anim = null;
  };
  Board.prototype.pick = function (i) {
    if (this.onSquare) { this.onSquare(i); return; }
    if (!this.moves) return;
    var all = this.moves(), self = this;
    if (this.sel >= 0) {
      var hits = all.filter(function (m) { return m.from === self.sel && m.to === i; });
      if (hits.length) { this.commit(hits); return; }
    }
    var mine = all.filter(function (m) { return m.from === i; });
    if (mine.length && i !== this.sel) { this.sel = i; this.tg = mine.map(function (m) { return m.to; }); }
    else { this.sel = -1; this.tg = []; }
    this.draw();
  };
  Board.prototype.commit = function (hits) {
    var self = this;
    this.sel = -1; this.tg = [];
    if (hits.length === 1) { this.onMove(hits[0]); return; }
    this.draw();
    this.promo.innerHTML = '<div>' + hits.map(function (m, k) { return '<button type="button" data-k="' + k + '" aria-label="' + PN[m.promo.toLowerCase()] + '">' + piece(m.promo) + '</button>'; }).join('') + '</div>';
    this.promo.hidden = false;
    // The press that opened the picker is followed by a click that lands on it: so the choice is taken on the next
    // press (and on a click only when it comes from the keyboard), never on that first click.
    var choose = function (e) {
      var b = e.target.closest('button');
      e.preventDefault();
      self.promo.hidden = true;
      if (b) self.onMove(hits[+b.dataset.k]);
    };
    this.promo.onpointerdown = choose;
    this.promo.onclick = function (e) { if (e.detail === 0) choose(e); };
  };
  Board.prototype.down = function (i, e) {
    this.pick(i);
    if (e.pointerType !== 'mouse' || e.button !== 0 || this.sel !== i) return;
    var self = this, cell = this.cell(i), pc = cell.querySelector('.pc'), x0 = e.clientX, y0 = e.clientY, moved = false;
    if (!pc) return;
    function mv(ev) {
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      moved = true; cell.classList.add('lift');
      pc.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)';
    }
    function up(ev) {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      if (!moved) return;
      pc.style.transform = ''; cell.classList.remove('lift');
      var t = document.elementFromPoint(ev.clientX, ev.clientY);
      t = t && t.closest('.sq');
      if (!t || !self.grid.contains(t) || !self.moves) return;
      var to = +t.dataset.i, hits = self.moves().filter(function (m) { return m.from === i && m.to === to; });
      if (hits.length) { self.noAnim = true; self.commit(hits); self.noAnim = false; }
    }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  Board.prototype.blink = function (i, c) {
    var self = this;
    this.flash = { i: i, c: c }; this.draw();
    setTimeout(function () { self.flash = null; self.draw(); }, 380);
  };
  Board.prototype.shake = function () {
    var el = this.el;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  };
  function show(B, s, o) {
    o = o || {};
    B.pos = s.b.slice(); B.last = o.last || null; B.anim = o.anim || null;
    B.check = C.inCheck(s) ? C.kingSq(s.b, s.turn) : -1;
    B.marks = (o.marks || []).map(toI);
    B.arrows = (o.arrows || []).map(function (a) { return [toI(a[0]), toI(a[1])]; });
    B.sel = -1; B.tg = []; B.promo.hidden = true;
    B.draw();
  }
  function stage(root, bar) {
    root.classList.add('fit');
    root.innerHTML = '<div class="stage"><div class="boardcol' + (bar ? ' bar' : '') + '"><div class="boardrow">' + (bar ? '<div class="evalbar" title="Who is ahead"><i></i></div>' : '') + '<div class="bhost"></div></div></div><aside class="panel"></aside></div>';
    return { board: new Board($('.bhost', root)), panel: $('.panel', root) };
  }
  function keepsMate(s, m, n) {
    var w = C.play(s, m), rep = C.legal(w);
    if (!rep.length) return C.inCheck(w);
    if (n <= 1) return false;
    return rep.every(function (r) { return C.forcesMate(C.play(w, r), n - 1); });
  }
  function seg(id, items, value) {
    return '<div class="seg" id="' + id + '">' + items.map(function (it) { return '<button type="button" data-v="' + it[0] + '"' + (String(it[0]) === String(value) ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + it[1] + '</button>'; }).join('') + '</div>';
  }

  /* ---------- learn ---------- */
  var LESSONS = [];
  COURSE.forEach(function (u) { u.lessons.forEach(function (l) { l.unit = u; LESSONS.push(l); }); });
  var FAST = { board: 1, rook: 1, bishop: 1, queen: 1, knight: 1, king: 1, pawn: 1, check: 1, mate: 1, stalemate: 1, castle: 1, count: 1, principles: 1, fork: 1, pin: 1, backrank: 1, scholar: 1, queenmate: 1, threat: 1, double: 1, rookmate: 1, capture: 1, kingsafety: 1, battery: 1, ismate: 1, counting: 1, exam2: 1, exam3: 1, exam4: 1, exam5: 1, exam6: 1, exam7: 1 };
  var STARTS = [
    { start: 2, name: 'New to chess', note: 'Begin with the board and the pieces.', rating: 400, opp: 1 },
    { start: 3, name: 'I know how the pieces move', note: 'Skip the pieces. Begin with check, mate and castling.', rating: 600, opp: 1 },
    { start: 4, name: 'I know all the rules', note: 'Skip the rules. Begin with material and opening principles.', rating: 800, opp: 2 },
    { start: 5, name: 'I play casual games', note: 'Go straight to tactics.', rating: 1000, opp: 3 },
    { start: 6, name: 'I play regularly', note: 'Go straight to checkmate patterns.', rating: 1200, opp: 3 },
    { start: 7, name: 'I play in a club', note: 'Only the endgame lessons, then puzzles and games.', rating: 1400, opp: 4 }
  ];
  var TEST = [
    { fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1', say: 'Capture a black pawn.', accept: ['exd5', 'exf5'] },
    { fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', say: 'Give checkmate in one move.', mate: 1 },
    { fen: '4k3/8/4p3/1b1n4/8/2N5/8/4K3 w - - 0 1', say: 'Your knight can take two pieces. Take the one that costs you nothing.', accept: ['Nxb5'] },
    { fen: '4k3/5q2/8/1N6/8/8/8/4K3 w - - 0 1', say: 'Win the queen.', accept: ['Nd6+'] },
    { fen: '5r1k/6pp/7N/8/8/1Q6/8/6K1 w - - 0 1', say: 'White forces checkmate in two. Play the first move.', mate: 2 }
  ];
  function examSteps(l) {
    var used = {};
    return l.steps.map(function (st) {
      if (st.t !== 'pz') return st;
      var fits = function (wide) { return PUZZLES.filter(function (p) { return p.k === st.k && !used[p.f] && (wide || (p.r >= (st.lo || 0) && p.r <= (st.hi || 9999))); }); };
      var pool = fits(false), p = pick(pool.length ? pool : fits(true)), out;
      used[p.f] = 1;
      out = { t: 'move', fen: p.f, text: (C.fromFEN(p.f).turn === 'w' ? 'White' : 'Black') + ' to move. ' + TASK[p.k], done: '' };
      if (p.k === 'win') out.uci = p.s; else out.mateIn = p.k === 'm2' ? 2 : 1;
      return out;
    });
  }
  function route_() {
    var all = LESSONS.filter(function (l) { return l.unit.rank >= (S.start || 2); });
    if (S.mode !== 'fast') return all;
    var f = all.filter(function (l) { return FAST[l.id]; });
    return f.length ? f : all;
  }
  function nextLesson() { return route_().filter(function (l) { return !S.done[l.id]; })[0] || null; }

  var Learn = {
    root: $('#v-learn'), cur: null,
    show: function () { if (this.cur) return; if (S.start) this.home(); else this.setup(); },
    setup: function (picked, tested) {
      this.cur = null; this.root.classList.remove('fit');
      var sel = picked || S.start || 2, mode = S.mode || 'fast';
      this.pick = { start: sel, mode: mode };
      this.root.innerHTML = '<div class="setup"><p class="eyebrow">Two choices, then you are on the board</p><h1>Where do you <em>start?</em></h1>' +
        '<p class="lede">' + (tested ? 'Test result: start on rank ' + sel + '. Change it below if it feels wrong.' : 'Tell the course what you already know and it skips the rest. Skipped lessons stay open if you want to look back.') + '</p>' +
        '<div class="setup-grid"><div class="field"><span>Your level</span><div class="cards" id="lv">' +
        STARTS.map(function (o) { return '<button type="button" class="card' + (o.start === sel ? ' on' : '') + '" data-start="' + o.start + '" aria-pressed="' + (o.start === sel) + '"><b>' + o.name + '</b><em>Rank ' + o.start + '</em><span>' + o.note + '</span></button>'; }).join('') +
        '</div><button type="button" class="link" id="testme">Not sure? Take the five-move test</button></div>' +
        '<div class="field"><span>Your path</span><div class="cards" id="pm">' +
        '<button type="button" class="card' + (mode === 'fast' ? ' on' : '') + '" data-mode="fast" aria-pressed="' + (mode === 'fast') + '"><b>Fast track</b><em>10 min a day</em><span>Only the lessons that decide real games: hanging pieces, forks, pins and the common mates. Then puzzles and coached games do the rest.</span></button>' +
        '<button type="button" class="card' + (mode === 'full' ? ' on' : '') + '" data-mode="full" aria-pressed="' + (mode === 'full') + '"><b>Full course</b><em>Every lesson</em><span>Everything from your level up, including the rarer rules, more tactics and the endgame.</span></button>' +
        '</div><span>Your style</span><div class="swatches">' + skinCards() + '</div><div class="row"><button type="button" class="btn primary" id="begin">Start</button></div></div></div></div>';
    },
    choose: function (b) {
      if (b.dataset.start) this.pick.start = +b.dataset.start; else this.pick.mode = b.dataset.mode;
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    },
    begin: function () {
      var first = !S.start, p = this.pick, o = STARTS.filter(function (x) { return x.start === p.start; })[0];
      S.start = p.start; S.mode = p.mode;
      if (first && !Object.keys(S.solved).length) { S.rating = o.rating; S.level = o.opp; }
      persist();
      this.home(); toTop();
    },
    test: function () {
      var st = stage(this.root), B = st.board, P = st.panel, self = this, k = 0;
      this.cur = { test: true };
      this.endTest = function () { self.setup(k + 2, true); toTop(); };
      function ask() {
        var q = TEST[k], s = C.fromFEN(q.fen);
        show(B, s);
        P.innerHTML = '<div><p class="crumb">Level test · position ' + (k + 1) + ' of ' + TEST.length + '</p><h2>Find the move</h2></div>' +
          '<div class="segs">' + TEST.map(function (_, j) { return '<i' + (j <= k ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
          '<p class="say">' + q.say + '</p><p class="meta">One try per position. The test stops at your first miss and sets your level there.</p>' +
          '<div class="fb" aria-live="polite"></div><div class="row pin"><button type="button" class="btn" id="tskip">I do not know</button></div>';
        B.moves = function () { return C.legal(s); };
        B.onMove = function (m) {
          var name = C.san(s, m), ok = q.mate ? keepsMate(s, m, q.mate) : q.accept.indexOf(name) >= 0, fb = $('.fb', P);
          B.moves = null;
          C.make(s, m); show(B, s, { last: m, anim: m });
          fb.className = 'fb ' + (ok ? 'good' : 'bad');
          fb.innerHTML = '<b>' + name + '</b>' + (ok ? '' : ' is not it. That sets your level.');
          if (ok) k++;
          setTimeout(function () { if (!self.cur || !self.cur.test) return; if (ok && k < TEST.length) ask(); else self.endTest(); }, ok ? 700 : 1300);
        };
      }
      ask();
    },
    home: function () {
      this.cur = null; this.root.classList.remove('fit');
      var way = route_(), total = way.length, n = way.filter(function (l) { return S.done[l.id]; }).length, nx = nextLesson(), fast = S.mode === 'fast', t = td();
      var onWay = {};
      way.forEach(function (l) { onWay[l.id] = 1; });
      var task = function (done, label, count, act) {
        return '<button type="button" class="task' + (done ? ' done' : '') + '" data-act="' + act + '"><i>' + (done ? '✓' : '') + '</i><span>' + label + '</span><em>' + count + '</em></button>';
      };
      var html = '<div class="hero"><div><p class="eyebrow">' + (fast ? 'Fast track' : 'Full course') + ' · from rank ' + S.start + ' · ' + total + ' lessons</p><h1>Start as a pawn. Finish as a <em>queen.</em></h1>' +
        '<p class="lede">' + (fast ? 'Most games below club level are lost to a hanging piece or a missed mate. The fast track teaches only that, starting at your level, and the daily sprint makes it stick. Ten minutes every day beats two hours on Sunday.' :
          'Every pawn is trying to reach the eighth rank. Work through the lessons one rank at a time, and keep the daily sprint going so the ideas stick.') + '</p>' +
        '<div class="row"><button type="button" class="btn primary" id="go">' + (nx ? (n ? 'Continue: ' : 'Start: ') + esc(nx.name) : 'Solve puzzles') + '</button><button type="button" class="link" id="relevel">Change level or path</button></div></div>' +
        '<div class="sprint"><div><p class="crumb">Today · about 10 minutes</p><h2>Daily sprint</h2></div>' +
        task(t.lesson >= GOAL.lesson, nx ? 'One lesson: ' + esc(nx.name) : 'Drill one opening from memory', Math.min(t.lesson, 1) + '/1', nx ? 'lesson' : 'openings') +
        task(t.puzzles >= GOAL.puzzles, 'Five puzzles, misses come back', Math.min(t.puzzles, 5) + '/5', 'puzzles') +
        task(t.moves >= GOAL.moves, 'Fifteen moves against the coach', Math.min(t.moves, 15) + '/15', 'play') +
        '<p class="meta">' + (t.bonus ? 'Sprint done for today. See you tomorrow.' : 'Finish all three for 50 bonus XP.') + '</p></div></div>' +
        '<div class="tiles four"><div class="tile"><b>' + n + '/' + total + '</b><span>Lessons done</span></div><div class="tile"><b>' + S.rating + '</b><span>Puzzle rating</span></div>' +
        '<div class="tile"><b>' + streakNow() + '</b><span>Day streak</span></div><div class="tile"><b>' + Object.keys(S.missed).length + '</b><span>Misses to review</span></div></div><ol class="file">';
      COURSE.forEach(function (u, k) {
        html += '<li class="unit' + (u.rank < S.start ? ' skipped' : '') + '"><div class="unit-sq ' + (k % 2 ? 'dark' : 'light') + '"><span class="num">' + u.rank + '</span>' + (nx && nx.unit === u ? piece('P') : '') + '</div>' +
          '<div class="unit-body"><h2>' + esc(u.name) + '</h2><p>' + esc(u.blurb) + (u.rank < S.start ? ' Skipped at your level.' : '') + '</p><div class="lessons">' +
          u.lessons.map(function (l) {
            var d = S.done[l.id], isNext = nx === l, off = !d && !onWay[l.id];
            return '<button type="button" class="lesson' + (d ? ' done' : '') + (isNext ? ' next' : '') + (off ? ' off' : '') + (l.exam ? ' exam' : '') + '" data-id="' + l.id + '"><span class="lg">' + GL[l.icon] + '</span><span class="ln">' + esc(l.name) + '</span><span class="ls">' +
              (d ? 'Done' : isNext ? 'Next' : u.rank < S.start ? 'Skipped' : off ? 'Later' : l.exam ? 'Test' : l.steps.length + ' steps') + '</span></button>';
          }).join('') + '</div></div></li>';
      });
      html += '<li class="unit"><div class="unit-sq light"><span class="num">8</span>' + (nx ? '' : piece('Q')) + '</div><div class="unit-body"><h2>Promotion</h2><p>' +
        (nx ? 'Finish your path and the pawn becomes a queen. ' + (total - n) + ' to go.' : 'Your pawn made it. Keep the sprint going: puzzles and coached games are where the rating comes from.') + '</p></div></li></ol>';
      this.root.innerHTML = html;
    },
    open: function (id) {
      var l = LESSONS.filter(function (x) { return x.id === id; })[0];
      if (!l) return;
      var st = stage(this.root);
      this.board = st.board; this.panel = st.panel;
      this.cur = { lesson: l, i: 0, miss: 0, steps: l.exam ? examSteps(l) : l.steps };
      this.step();
      toTop();
    },
    step: function () {
      var cur = this.cur, L = cur.lesson, steps = cur.steps, st = steps[cur.i], B = this.board, P = this.panel, self = this;
      B.moves = null; B.onMove = null; B.onSquare = null; B.stars = []; B.flip = false;
      P.innerHTML = '<button type="button" class="link" id="back">Back to course</button><div><p class="crumb">Rank ' + L.unit.rank + ' · ' + esc(L.unit.name) + '</p><h2>' + esc(L.name) + '</h2></div>' +
        '<div class="segs">' + steps.map(function (_, k) { return '<i' + (k <= cur.i ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
        '<div class="say"></div><div class="opts" hidden></div><div class="fb" aria-live="polite"></div>' +
        '<div class="row pin"><button type="button" class="btn primary" id="next" hidden>Continue</button><button type="button" class="btn" id="hint" hidden>Hint</button><button type="button" class="btn" id="redo" hidden>Start again</button></div>';
      var sayEl = $('.say', P), fbEl = $('.fb', P), nextBtn = $('#next', P), hintBtn = $('#hint', P), redoBtn = $('#redo', P), optsEl = $('.opts', P);
      function fb(kind, html) { fbEl.className = 'fb ' + kind; fbEl.innerHTML = html; }
      function done() { nextBtn.hidden = false; hintBtn.hidden = true; redoBtn.hidden = true; nextBtn.focus({ preventScroll: true }); }
      nextBtn.onclick = function () { cur.i++; if (cur.i >= steps.length) self.finish(); else self.step(); };

      if (st.t === 'info') {
        show(B, C.fromFEN(st.fen), st);
        sayEl.innerHTML = fmt(st.text);
        nextBtn.hidden = false;
      } else if (st.t === 'quiz') {
        show(B, C.fromFEN(st.fen || C.START), st);
        sayEl.innerHTML = fmt(st.q);
        optsEl.hidden = false;
        optsEl.innerHTML = st.options.map(function (o, k) { return '<button type="button" class="opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('');
        optsEl.onclick = function (e) {
          var b = e.target.closest('.opt');
          if (!b || !nextBtn.hidden) return;
          if (+b.dataset.k === st.answer) { b.classList.add('right'); fb('good', fmt(st.why)); done(); }
          else { b.classList.add('wrong'); b.disabled = true; fb('bad', 'Not quite. Look again.'); }
        };
      } else if (st.t === 'square') {
        var k = 0;
        show(B, C.fromFEN(EMPTY));
        var ask = function () { sayEl.innerHTML = fmt(st.text) + '<div class="ask">' + st.targets[k] + '</div>'; };
        ask();
        B.onSquare = function (i) {
          if (k >= st.targets.length) return;
          if (i === C.idx(st.targets[k])) {
            B.blink(i, 'ok'); k++;
            if (k >= st.targets.length) { fb('good', 'You can read the board.'); done(); } else { fb('', ''); ask(); }
          } else { B.blink(i, 'no'); fb('bad', 'That square is ' + C.name(i) + '.'); }
        };
      } else if (st.t === 'collect') {
        var cs = { b: new Array(64).fill(null), turn: 'w', cas: '', ep: -1, half: 0, full: 1 }, at, n, stars;
        var reset = function () {
          cs.b.fill(null); at = C.idx(st.at); cs.b[at] = st.piece; n = 0;
          Object.keys(st.blocks || {}).forEach(function (q) { cs.b[C.idx(q)] = st.blocks[q]; });
          stars = st.stars.map(C.idx); B.stars = stars;
          show(B, cs); fb('', 'Stars left: ' + stars.length);
        };
        sayEl.innerHTML = fmt(st.text);
        redoBtn.hidden = false; redoBtn.onclick = reset;
        B.moves = function () { return stars.length ? C.pseudo(cs).filter(function (m) { return m.from === at; }) : []; };
        B.onMove = function (m) {
          cs.b[m.to] = st.piece; cs.b[m.from] = null; at = m.to; n++;
          var hit = stars.indexOf(at);
          if (hit >= 0) stars.splice(hit, 1);
          show(B, cs, { last: m, anim: m });
          if (!stars.length) { fb('good plain', n <= st.par ? 'Perfect. ' + n + ' moves.' : 'All collected in ' + n + ' moves. It can be done in ' + st.par + '.'); done(); }
          else fb('', 'Stars left: ' + stars.length + ' · moves: ' + n);
        };
        reset();
      } else if (st.t === 'move') {
        var s = C.fromFEN(st.fen), left = st.mateIn || 1, busy = false;
        var good = function (m, name) {
          if (st.uci) return C.uci(m) === st.uci;
          if (st.mateIn) return keepsMate(s, m, left);
          if (st.goal === 'any') return true;
          if (st.goal === 'check') return /[+#]/.test(name);
          return st.accept.indexOf(name) >= 0;
        };
        B.flip = s.turn === 'b';
        show(B, s);
        sayEl.innerHTML = fmt(st.text);
        hintBtn.hidden = !!L.exam;
        hintBtn.onclick = function () {
          var ms = C.legal(s), sol = ms.filter(function (m) { return good(m, C.san(s, m, ms)); })[0];
          if (sol) { B.marks = [sol.from]; B.draw(); fb('', 'Look at the ' + PN[sol.piece.toLowerCase()] + ' on ' + C.name(sol.from) + '.'); }
        };
        B.moves = function () { return busy ? [] : C.legal(s); };
        B.onMove = function (m) {
          var name = C.san(s, m), ok = good(m, name), before = C.clone(s);
          C.make(s, m);
          show(B, s, { last: m, anim: m });
          if (ok && st.mateIn && C.status(s) !== 'checkmate') {
            left--; busy = true; fb('good plain', 'Right. Now finish it.');
            setTimeout(function () { var r = C.legal(s)[0]; C.make(s, r); show(B, s, { last: r, anim: r }); busy = false; }, 550);
          } else if (ok) {
            B.moves = null; fb('good', '<b>' + name + '</b> ' + fmt(st.done || '')); done();
          } else if (L.exam) {
            cur.miss++; B.moves = null; B.shake();
            s = before;
            var ms0 = C.legal(s), sol = ms0.filter(function (x) { return good(x, C.san(s, x, ms0)); })[0];
            show(B, s, { arrows: sol ? [[sol.from, sol.to]] : [] });
            fb('bad', '<b>' + name + '</b> is a miss.' + (sol ? ' The move was <b>' + C.san(s, sol, ms0) + '</b>.' : ''));
            done();
          } else {
            busy = true; B.shake();
            fb('bad', '<b>' + name + '</b> ' + fmt((st.alt && st.alt[name]) || (C.status(s) === 'stalemate' ? 'Stalemate. That throws away the win.' : 'Not this time. Try another move.')));
            setTimeout(function () { s = before; show(B, s); busy = false; }, 1200);
          }
        };
      }
    },
    finish: function () {
      var cur = this.cur, L = cur.lesson, first = !S.done[L.id], pass = !L.exam || cur.miss <= 1, nx, html;
      var star = '<svg viewBox="0 0 24 24" aria-hidden="true">' + STAR_PATH + '</svg>';
      if (pass) {
        S.done[L.id] = 1; persist();
        if (first) gain(L.exam ? 60 : 30, L.exam ? 'rank test' : 'lesson');
        credit('lesson');
      }
      nx = nextLesson();
      this.board.moves = null; this.board.onSquare = null;
      if (!pass) {
        html = '<div><p class="crumb">Test not passed</p><h2>' + esc(L.name) + '</h2></div><p class="say">' + cur.miss + ' misses. The test allows one. Go over rank ' + L.unit.rank + ' again, then come back: the positions change every time.</p>' +
          '<div class="row pin"><button type="button" class="btn primary" data-id="' + L.id + '">Try again</button><button type="button" class="btn" id="back">Back to course</button></div>';
      } else {
        html = '<div><p class="crumb">' + (L.exam ? 'Test passed' : 'Lesson complete') + '</p><h2>' + esc(L.name) + '</h2></div><div class="finish"><div class="stars">' + star + star + star + '</div></div>' +
          '<p class="say">' + (L.exam ? 'Rank ' + L.unit.rank + ' is behind you' + (cur.miss ? ', with one miss. ' : ', without a miss. ') : '') +
          (nx ? 'Next: <b>' + esc(nx.name) + '</b>, on rank ' + nx.unit.rank + '.' : 'That was the last step of your path. Your pawn has reached the eighth rank and promoted to a queen.') + '</p>' +
          '<div class="row pin">' + (nx ? '<button type="button" class="btn primary" data-id="' + nx.id + '">' + (nx.exam ? 'Take the test' : 'Next lesson') + '</button>' : '') + '<button type="button" class="btn" id="back">Back to course</button></div>';
      }
      this.panel.innerHTML = html;
    }
  };
  Learn.root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'), c = e.target.closest('button'), nx;
    if (b) { Learn.open(b.dataset.id); return; }
    if (!c) return;
    if (c.dataset.start || c.dataset.mode) Learn.choose(c);
    else if (c.id === 'begin') Learn.begin();
    else if (c.id === 'testme') Learn.test();
    else if (c.id === 'tskip') Learn.endTest();
    else if (c.id === 'relevel') { Learn.setup(); toTop(); }
    else if (c.id === 'back') { Learn.home(); toTop(); }
    else if (c.id === 'go' || c.dataset.act === 'lesson') { nx = nextLesson(); if (nx) Learn.open(nx.id); else location.hash = '#puzzles'; }
    else if (c.dataset.act) location.hash = '#' + c.dataset.act;
  });

  /* ---------- puzzles ---------- */
  var KIND = { m1: 'Mate in 1', m2: 'Mate in 2', win: 'Win material' };
  var TASK = { m1: 'One move ends the game. Find the checkmate.', m2: 'Force checkmate in two moves. Your first move must leave no escape.', win: 'One move wins material by force. Find it.' };
  var Puz = {
    root: $('#v-puzzles'),
    show: function () {
      if (this.board) { this.draw(); return; }
      var st = stage(this.root), self = this;
      this.board = st.board; this.panel = st.panel;
      this.panel.addEventListener('click', function (e) {
        var k = e.target.closest('#kinds button');
        if (k) { S.kind = k.dataset.v; persist(); self.next(); return; }
        if (e.target.closest('#pnext')) self.next();
        else if (e.target.closest('#phint')) self.help(false);
        else if (e.target.closest('#psol')) self.help(true);
      });
      this.next();
    },
    next: function () {
      var cur = this.p, miss = Object.keys(S.missed).map(function (i) { return PUZZLES[+i]; }).filter(function (p) { return p && p !== cur; });
      this.turns = (this.turns || 0) + 1;
      if (miss.length && (S.kind === 'miss' || this.turns % 3 === 0)) { this.load(pick(miss), true); return; }
      var pool = PUZZLES.filter(function (p) { return S.kind === 'all' || S.kind === 'miss' || p.k === S.kind; });
      var fresh = pool.filter(function (p) { return !S.solved[PUZZLES.indexOf(p)]; }), from = fresh.length ? fresh : pool;
      from = from.filter(function (p) { return p !== cur; }).sort(function (a, b) { return Math.abs(a.r - S.rating) - Math.abs(b.r - S.rating); }).slice(0, 4);
      this.load(pick(from.length ? from : pool));
    },
    load: function (p, review) {
      var self = this, B = this.board;
      this.review = !!review; this.p = p; this.s = C.fromFEN(p.f); this.left = p.k === 'm2' ? 2 : 1;
      this.clean = true; this.helped = false; this.busy = false; this.over = false;
      B.flip = this.s.turn === 'b';
      show(B, this.s);
      B.moves = function () { return self.busy || self.over ? [] : C.legal(self.s); };
      B.onMove = function (m) { self.attempt(m); };
      this.draw();
    },
    draw: function (kind, text) {
      var p = this.p, n = Object.keys(S.solved).length;
      this.panel.innerHTML = '<div class="bignum"><b>' + S.rating + '</b><small>your puzzle rating</small></div>' +
        '<div><p class="crumb">' + (C.fromFEN(p.f).turn === 'w' ? 'White' : 'Black') + ' to move · rated ' + p.r + (this.review ? ' \u00b7 review' : '') + '</p><h2>' + KIND[p.k] + '</h2></div>' +
        '<p class="say">' + (this.review ? 'You missed this one before. ' : '') + TASK[p.k] + '</p><div class="fb ' + (kind || '') + '" aria-live="polite">' + (text || '') + '</div>' +
        '<div class="row pin">' + (this.over ? '<button type="button" class="btn primary" id="pnext">Next puzzle</button>' : '<button type="button" class="btn" id="phint">Hint</button><button type="button" class="btn" id="psol">Show the move</button><button type="button" class="btn" id="pnext">Skip</button>') + '</div>' +
        '<div class="field"><span>Puzzle type</span>' + seg('kinds', [['all', 'All'], ['m1', 'Mate in 1'], ['win', 'Win material'], ['m2', 'Mate in 2'], ['miss', 'My misses']], S.kind) + '</div>' +
        '<p class="meta">' + n + ' solved \u00b7 ' + Object.keys(S.missed).length + ' to review</p>';
    },
    rate: function (won) {
      var e = 1 / (1 + Math.pow(10, (this.p.r - S.rating) / 400));
      S.rating = Math.max(100, Math.round(S.rating + 32 * (won - e)));
      persist();
    },
    answer: function () { return this.p.k === 'win' ? C.fromUCI(this.s, this.p.s) : C.mateMoves(this.s, this.left)[0]; },
    help: function (full) {
      if (this.over || this.busy) return;
      var m = this.answer(), B = this.board;
      if (!m) return;
      if (full && this.clean) { S.missed[PUZZLES.indexOf(this.p)] = 1; this.rate(0); }
      this.clean = false; this.helped = this.helped || full;
      B.marks = [m.from]; B.arrows = full ? [[m.from, m.to]] : []; B.draw();
      this.draw('', full ? 'Play the marked move to see why it works.' : 'Look at the ' + PN[m.piece.toLowerCase()] + ' on ' + C.name(m.from) + '.');
    },
    attempt: function (m) {
      var p = this.p, s = this.s, self = this, name = C.san(s, m), before = C.clone(s);
      var ok = p.k === 'win' ? C.uci(m) === p.s : keepsMate(s, m, this.left);
      C.make(s, m);
      show(this.board, s, { last: m, anim: m });
      if (!ok) {
        if (this.clean) { this.clean = false; S.missed[PUZZLES.indexOf(p)] = 1; this.rate(0); }
        this.busy = true; this.board.shake();
        this.draw('bad', '<b>' + name + '</b> is not it. Try again.');
        setTimeout(function () { self.s = before; show(self.board, before); self.busy = false; }, 950);
        return;
      }
      if (p.k === 'm2' && C.status(s) !== 'checkmate') {
        this.left = 1; this.busy = true;
        this.draw('good plain', '<b>' + name + '</b> is right. One more move.');
        setTimeout(function () { var r = C.legal(s)[0]; C.make(s, r); show(self.board, s, { last: r, anim: r }); self.busy = false; }, 600);
        return;
      }
      var id = PUZZLES.indexOf(p), fresh = !S.solved[id];
      this.over = true;
      if (!this.helped) S.solved[id] = 1;
      if (this.clean) { delete S.missed[id]; this.rate(1); }
      persist();
      if (!this.helped) credit('puzzles');
      if (fresh && !this.helped) gain(p.k === 'm2' ? 20 : p.k === 'win' ? 15 : 10, 'puzzle');
      this.draw('good', '<b>' + name + '</b>' + (p.k === 'win' ? ' wins material.' : ' Checkmate.'));
    }
  };

  /* ---------- play ---------- */
  var LEVELS = [[1, 'Beginner'], [2, 'Casual'], [3, 'Club'], [4, 'Strong']];
  /* positions to practise against the computer: you always play White */
  var PRACTICE = [
    ['A normal game', C.START, ''],
    ['Queen and king mate', '8/8/8/4k3/8/8/8/Q3K3 w - - 0 1', 'Checkmate the lone king. Drive him to the edge, bring your own king, and watch out for stalemate.'],
    ['Rook and king mate', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 'Checkmate with the rook. Cut the king off, bring your own king, and mate on the edge.'],
    ['Two rooks mate', '8/8/8/4k3/8/8/8/R3K2R w - - 0 1', 'Climb the ladder: the rooks take turns giving check.'],
    ['King and pawn', '4k3/8/8/8/3K4/4P3/8/8 w - - 0 1', 'Escort the pawn to the eighth rank. King first, pawn second.'],
    ['Win with an extra queen', 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'Black starts without a queen. Develop, trade pieces and make the extra queen count.'],
    ['Win with an extra rook', '1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1', 'Black starts a rook down. Trade pieces whenever you can: every trade makes the extra rook bigger.']
  ];
  function choose(s, level, ply) {
    if (level === 1) {
      var r1 = C.rank(s, 1);
      if (Math.random() < 0.3) return pick(r1).move;
      return pick(r1.filter(function (x) { return x.score >= r1[0].score - 120; })).move;
    }
    if (level === 2 || ply < 8) {
      var r2 = C.rank(s, 2), slack = level === 2 ? 30 : 15;
      return pick(r2.filter(function (x) { return x.score >= r2[0].score - slack; })).move;
    }
    return C.best(s, level === 3 ? 3 : 4).move;
  }
  function judge(before, m) {
    var ranked = C.rank(before, 2), best = ranked[0], id = C.uci(m);
    var mine = ranked.filter(function (x) { return C.uci(x.move) === id; })[0];
    var loss = best.score - mine.score, after = C.play(before, m), v;
    if (C.status(after) === 'checkmate') return { mark: '', badge: '#', cls: 'best', label: 'Checkmate', text: 'The king has no escape.' };
    if (loss <= 15) v = { mark: '', badge: '!', cls: 'best', label: 'Best move' };
    else if (loss <= 60) v = { mark: '', badge: '✓', cls: 'good', label: 'Good move' };
    else if (loss <= 150) v = { mark: '?!', badge: '?!', cls: 'inacc', label: 'Inaccuracy' };
    else if (loss <= 320) v = { mark: '?', badge: '?', cls: 'mist', label: 'Mistake' };
    else v = { mark: '??', badge: '??', cls: 'blun', label: 'Blunder' };
    if (loss > 60) {
      var rep = C.best(after, 2), rs = rep ? C.san(after, rep.move) : '';
      if (rep && rep.score > C.MATE / 2) v.text = 'It allows ' + rs + ' and mate follows.';
      else if (rep && rep.move.cap) v.text = 'Now ' + rs + ' takes your ' + PN[rep.move.cap.toLowerCase()] + '.';
      else v.text = rep ? 'It lets your opponent play ' + rs + '.' : '';
      v.text += ' Stronger was <b>' + C.san(before, best.move) + '</b>.';
    } else if (m.cap) v.text = 'You took the ' + PN[m.cap.toLowerCase()] + ' and it holds up.';
    else if (m.flag === 'ck' || m.flag === 'cq') v.text = 'The king is safer and a rook joins the game.';
    else v.text = loss <= 15 ? 'The engine would have played the same.' : 'A sound choice.';
    return v;
  }
  var Play = {
    root: $('#v-play'), tok: 0,
    show: function () {
      if (this.board) return;
      var st = stage(this.root, true), self = this, P = st.panel;
      this.board = st.board; this.bar = $('.evalbar', this.root);
      P.innerHTML = '<div><p class="crumb">You against the computer</p><div class="status" id="gstat" aria-live="polite"></div></div>' +
        '<div class="coach" id="coach"></div><div class="sheet" id="sheet"></div>' +
        '<div class="row pin"><button type="button" class="btn primary" id="gnew">New game</button><button type="button" class="btn" id="gundo">Take back</button><button type="button" class="btn" id="ghint">Hint</button></div>' +
        '<div class="field"><span>Opponent</span>' + seg('glevel', LEVELS, S.level) + '</div>' +
        '<div class="field"><span>You play</span>' + seg('gcolor', [['w', 'White'], ['b', 'Black']], S.color) + '</div>' +
        '<div class="field"><label for="gfrom">Start from</label><select id="gfrom" class="sel">' + PRACTICE.map(function (x, k) { return '<option value="' + k + '">' + x[0] + '</option>'; }).join('') + '</select></div>' +
        '<label class="check"><input type="checkbox" id="gcoach"' + (S.coach ? ' checked' : '') + '> Coach rates my moves</label>';
      P.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        var grp = b.parentNode.id;
        if (grp === 'glevel' || grp === 'gcolor') {
          Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          if (grp === 'glevel') { S.level = +b.dataset.v; persist(); } else { S.color = b.dataset.v; persist(); self.from = 0; $('#gfrom').value = '0'; self.start(); }
        } else if (b.id === 'gnew') self.start();
        else if (b.id === 'gundo') self.undo();
        else if (b.id === 'ghint') self.hint();
      });
      $('#gcoach').addEventListener('change', function (e) { S.coach = e.target.checked; persist(); self.verdict = null; self.sync(); });
      $('#gfrom').addEventListener('change', function (e) { self.from = +e.target.value; self.start(); });
      this.board.moves = function () { return self.over || self.busy || self.s.turn !== S.color ? [] : C.legal(self.s); };
      this.board.onMove = function (m) { self.mine(m); };
      this.start();
    },
    start: function () {
      var pre = PRACTICE[this.from || 0];
      if (this.from && S.color !== 'w') {
        S.color = 'w'; persist();
        Array.prototype.forEach.call($('#gcolor').children, function (x) { var on = x.dataset.v === 'w'; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      }
      this.tok++; this.s = C.fromFEN(pre[1]); this.hist = []; this.over = false; this.busy = false; this.verdict = null; this.result = null;
      this.board.flip = S.color === 'b';
      this.sync();
      if (S.color === 'b') this.think();
    },
    sync: function (m) {
      var s = this.s, B = this.board, v = this.verdict, html = '', i, st = C.status(s), sc = 0;
      show(B, s, { last: m || null, anim: m || null });
      $('#gstat').textContent = this.result || (s.turn === S.color ? (st === 'check' ? 'Check. Your move' : 'Your move') : 'Computer is thinking');
      $('#coach').innerHTML = v ? '<span class="badge ' + v.cls + '">' + v.badge + '</span><div><b>' + v.label + '</b><p>' + v.text + '</p></div>' :
        '<span class="badge">♟</span><div><b>Coach</b><p>' + (this.from ? PRACTICE[this.from][2] : S.coach ? 'Play a move and I will rate it: ! best, ?! inaccuracy, ? mistake, ?? blunder.' : 'Coach is off. You are on your own.') + '</p></div>';
      for (i = 0; i < this.hist.length; i += 2) html += '<span class="no">' + (i / 2 + 1) + '.</span><span>' + this.hist[i].san + '</span><span>' + (this.hist[i + 1] ? this.hist[i + 1].san : '') + '</span>';
      var sheet = $('#sheet');
      sheet.innerHTML = html; sheet.scrollTop = sheet.scrollHeight;
      if (st === 'checkmate') sc = s.turn === 'w' ? -5000 : 5000;
      else if (st === 'ok' || st === 'check') { var b = C.best(s, 2); sc = s.turn === 'w' ? b.score : -b.score; }
      this.bar.classList.toggle('flip', S.color === 'b');
      this.bar.firstChild.style.height = Math.max(4, Math.min(96, 50 + 50 * Math.tanh(sc / 600))) + '%';
    },
    after: function (m) {
      var s = this.s, k = C.key(s), st = C.status(s), level = S.level, msg = null, won = false;
      this.hist[this.hist.length - 1].key = k;
      if (st === 'checkmate') { won = s.turn !== S.color; msg = won ? 'Checkmate. You win' : 'Checkmate. Computer wins'; }
      else if (st === 'stalemate') msg = 'Stalemate. Draw';
      else if (st === 'material') msg = 'Draw. Not enough pieces';
      else if (st === 'fifty') msg = 'Draw. Fifty quiet moves';
      else if (this.hist.filter(function (h) { return h.key === k; }).length >= 3) msg = 'Draw by repetition';
      this.result = msg; this.over = !!msg;
      this.sync(m);
      if (won) gain(this.from ? 25 : [20, 40, 70, 110][level - 1], 'win');
      else if (msg && st !== 'checkmate') gain(10, 'draw');
      if (!this.over && s.turn !== S.color) this.think();
    },
    mine: function (m) {
      var before = C.clone(this.s), v = S.coach ? judge(before, m) : null;
      this.hist.push({ san: C.san(this.s, m) + (v ? v.mark : ''), before: before });
      C.make(this.s, m);
      this.verdict = v;
      this.after(m);
      credit('moves');
    },
    think: function () {
      var self = this, token = ++this.tok;
      this.busy = true;
      setTimeout(function () {
        if (token !== self.tok) return;
        var m = choose(self.s, S.level, self.hist.length);
        self.hist.push({ san: C.san(self.s, m), before: C.clone(self.s) });
        C.make(self.s, m);
        self.busy = false;
        self.after(m);
      }, 420);
    },
    undo: function () {
      if (!this.hist.length) return;
      this.tok++; this.busy = false;
      var e = this.hist.pop();
      if (e.before.turn !== S.color && this.hist.length) e = this.hist.pop();
      this.s = C.clone(e.before); this.over = false; this.result = null; this.verdict = null;
      this.sync();
      if (this.s.turn !== S.color) this.think();
    },
    hint: function () {
      if (this.over || this.busy || this.s.turn !== S.color) return;
      var b = C.best(this.s, 3);
      if (!b) return;
      this.board.arrows = [[b.move.from, b.move.to]]; this.board.draw();
      $('#coach').innerHTML = '<span class="badge">→</span><div><b>Hint</b><p>Consider <b>' + C.san(this.s, b.move) + '</b>.</p></div>';
    }
  };

  /* ---------- openings ---------- */
  function mastery(op, k) { return S.lines[op.id + ':' + k] || 0; }
  function learned(op) { return op.lines.filter(function (_, k) { return mastery(op, k) > 0; }).length; }
  function dots(n) { return '<span class="dots" aria-label="' + n + ' of 3 clean runs">' + [0, 1, 2].map(function (i) { return '<i' + (i < n ? ' class="on"' : '') + '></i>'; }).join('') + '</span>'; }
  function describe(m) {
    if (m.flag === 'ck' || m.flag === 'cq') return 'Castles.';
    var who = PN[m.piece.toLowerCase()];
    return 'The ' + who + (m.cap ? ' takes on ' : ' goes to ') + C.name(m.to) + '.';
  }
  function moveNo(k) { return Math.floor(k / 2) + 1 + (k % 2 ? '… ' : '. '); }
  var Open = {
    root: $('#v-openings'), tok: 0,
    show: function () {
      if (this.board) return;
      var st = stage(this.root), self = this;
      this.board = st.board; this.panel = st.panel;
      this.board.onMove = function (m) { self.played(m); };
      this.panel.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || b.disabled) return;
        if (b.dataset.op) self.open(b.dataset.op);
        else if (b.id === 'oall') self.list();
        else if (b.id === 'olines') self.open(self.cur.id);
        else if (b.dataset.line) self.explore(+b.dataset.line);
        else if (b.id === 'otree') self.explore(null);
        else if (b.id === 'otrain') self.train(null);
        else if (b.id === 'otrain1') self.train(self.single);
        else if (b.id === 'onextline') self.train(self.fixed ? self.target : null);
        else if (b.dataset.k) { self.path = self.path.slice(0, +b.dataset.k); self.render(); }
        else if (b.dataset.san) { self.path.push(b.dataset.san); self.render('', '', true); }
        else if (b.id === 'oprev') { self.path.pop(); self.render(); }
        else if (b.id === 'onext') self.forward();
      });
      this.list();
    },
    list: function () {
      this.tok++; this.cur = null;
      this.board.flip = false; this.board.moves = null;
      show(this.board, C.fromFEN(C.START));
      var total = 0;
      OPENINGS.forEach(function (o) { total += o.lines.length; });
      this.panel.innerHTML = '<div><p class="crumb">' + OPENINGS.length + ' openings · ' + total + ' lines</p><h2>Openings</h2></div><p class="say">Each opening is a small tree of named lines. Explore where they split, then train until you can play every branch from memory.</p><div class="cards">' +
        OPENINGS.map(function (o) {
          var n = learned(o), all = n === o.lines.length;
          return '<button type="button" class="card' + (all ? ' done' : '') + '" data-op="' + o.id + '"><b>' + esc(o.name) + '</b><em>' + (o.side === 'w' ? 'White' : 'Black') + ' · ' + n + '/' + o.lines.length + '</em><span>' + esc(o.idea) + '</span></button>';
        }).join('') + '</div>';
    },
    at: function (path) {
      var s = C.fromFEN(C.START), last = null;
      path.forEach(function (x) { last = C.fromSAN(s, x); C.make(s, last); });
      return { s: s, last: last };
    },
    live: function (path) {
      var op = this.cur, out = [];
      op.lines.forEach(function (l, k) { if (path.every(function (x, i) { return l.moves[i] === x; })) out.push(k); });
      return out;
    },
    kids: function (path) {
      var op = this.cur, out = {}, n = path.length;
      this.live(path).forEach(function (k) {
        var san = op.lines[k].moves[n];
        if (san) (out[san] = out[san] || []).push(k);
      });
      return out;
    },
    weakest: function (ks) {
      var op = this.cur, last = this.lastLine, lo = Math.min.apply(null, ks.map(function (k) { return mastery(op, k); }));
      var pool = ks.filter(function (k) { return mastery(op, k) === lo; }), fresh = pool.filter(function (k) { return k !== last; });
      return pick(fresh.length ? fresh : pool);
    },
    open: function (id) {
      this.tok++;
      var op = this.cur = OPENINGS.filter(function (o) { return o.id === id; })[0], B = this.board, first = op.lines[0].moves, n = 0;
      this.mode = 'map'; this.path = [];
      while (n < first.length && op.lines.every(function (l) { return l.moves[n] === first[n]; })) n++;
      var root = first.slice(0, n), st = this.at(root), kids = this.kids(root);
      B.flip = op.side === 'b'; B.moves = null;
      show(B, st.s, { last: st.last, arrows: Object.keys(kids).map(function (san) { var m = C.fromSAN(st.s, san); return [m.from, m.to]; }) });
      this.panel.innerHTML = '<button type="button" class="link" id="oall">All openings</button><div><p class="crumb">You play ' + (op.side === 'w' ? 'White' : 'Black') + ' · ' + learned(op) + ' of ' + op.lines.length + ' lines learned</p><h2>' + esc(op.name) + '</h2></div>' +
        '<p class="say">' + esc(op.idea) + ' The arrows show where the lines first split, after ' + (n ? '<b>' + moveNo(n - 1) + root[n - 1] + '</b>' : 'the first move') + '.</p><div class="cards">' +
        op.lines.map(function (l, k) { return '<button type="button" class="card" data-line="' + k + '"><b>' + esc(l.n) + '</b><em>' + dots(mastery(op, k)) + '</em><span>' + esc(l.idea) + '</span></button>'; }).join('') + '</div>' +
        '<p class="meta">A clean run from memory fills one dot. Three dots and the line is yours.</p>' +
        '<div class="row pin"><button type="button" class="btn primary" id="otrain">Train all lines</button><button type="button" class="btn" id="otree">Explore the tree</button></div>';
    },
    explore: function (route) {
      this.tok++; this.mode = 'explore'; this.route = route; this.path = [];
      this.board.flip = this.cur.side === 'b';
      this.render();
    },
    forward: function () {
      var kids = this.kids(this.path), keys = Object.keys(kids), want = this.route != null ? this.cur.lines[this.route].moves[this.path.length] : null;
      if (!keys.length) return;
      this.path.push(want && kids[want] ? want : keys[0]);
      this.render('', '', true);
    },
    train: function (k) {
      var op = this.cur;
      this.tok++; this.mode = 'train'; this.fixed = k != null;
      this.target = k != null ? k : this.weakest(op.lines.map(function (_, i) { return i; }));
      this.lastLine = this.target; this.path = []; this.miss = 0; this.errors = 0; this.over = false;
      this.board.flip = op.side === 'b';
      this.render();
      this.auto();
    },
    auto: function () {
      var op = this.cur, self = this, token = this.tok, line = op.lines[this.target];
      if (this.path.length >= line.moves.length) {
        var key = op.id + ':' + this.target, clean = !this.errors;
        this.over = true;
        if (clean) S.lines[key] = Math.min(3, (S.lines[key] || 0) + 1);
        persist();
        gain(clean ? 15 : 5, 'opening');
        credit('lesson');
        this.render('good plain', '<b>' + esc(line.n) + '</b> complete' + (clean ? ' without a slip. One dot earned.' : ' with ' + this.errors + (this.errors === 1 ? ' slip.' : ' slips.') + ' Only a clean run fills a dot.'));
        return;
      }
      if (this.at(this.path).s.turn === op.side) return;
      setTimeout(function () {
        if (token !== self.tok) return;
        self.path.push(op.lines[self.target].moves[self.path.length]);
        self.render('', '', true);
        self.auto();
      }, 650);
    },
    played: function (m) {
      var op = this.cur, st = this.at(this.path), name = C.san(st.s, m), kids = this.kids(this.path);
      if (this.mode !== 'train') {
        if (kids[name]) { this.path.push(name); this.render('', '', true); }
        else { this.board.shake(); this.render('bad', '<b>' + name + '</b> is not in this repertoire. Pick one of the book moves.'); }
        return;
      }
      var book = op.lines[this.target].moves[this.path.length];
      if (name !== book && kids[name] && !this.fixed) { this.target = this.weakest(kids[name]); this.lastLine = this.target; book = name; }
      if (name === book) { this.path.push(name); this.miss = 0; this.render('', '', true); this.auto(); return; }
      this.board.shake();
      if (kids[name]) { this.render('', '<b>' + name + '</b> is a book move too, but it belongs to another line. This drill follows ' + esc(op.lines[this.target].n) + '.'); return; }
      this.miss++; this.errors++;
      this.render('bad', '<b>' + name + '</b> is not the book move.' + (this.miss >= 2 ? ' The right piece is marked.' : ' Try again.'), false, this.miss >= 2 ? C.fromSAN(st.s, book).from : null);
    },
    render: function (kind, text, anim, mark) {
      var op = this.cur, self = this, path = this.path, st = this.at(path), train = this.mode === 'train';
      var kids = this.kids(path), keys = Object.keys(kids), live = this.live(path), side = op.side === 'w' ? 'White' : 'Black';
      var seq = train ? op.lines[this.target].moves : path, line = '', k, note, title = op.name, buttons;
      this.single = live.length === 1 ? live[0] : null;
      if (path.length && live.length === 1) title = op.lines[live[0]].n;
      else if (!train && this.route != null && live.indexOf(this.route) >= 0) title = op.lines[this.route].n;
      show(this.board, st.s, { last: st.last, anim: anim ? st.last : null, marks: mark != null ? [mark] : [] });
      this.board.moves = (train ? !this.over && st.s.turn === op.side && path.length < seq.length : keys.length > 0) ? function () { return C.legal(self.at(self.path).s); } : null;
      for (k = 0; k < seq.length; k++) {
        if (k % 2 === 0) line += '<span class="no">' + (k / 2 + 1) + '.</span>';
        line += '<button type="button" data-k="' + (k + 1) + '"' + (k + 1 === path.length ? ' class="on"' : '') + (train ? ' disabled' : '') + '>' + (k < path.length ? seq[k] : '…') + '</button>';
      }
      if (!path.length) note = train ? (op.side === 'w' ? 'You are White. Play the first move from memory.' : 'You are Black. White moves first, then you answer.') : 'Play a book move on the board, or pick one below.';
      else note = '<b>' + moveNo(path.length - 1) + path[path.length - 1] + '</b> ' + esc(op.note[path.join(' ')] || describe(st.last));
      if (train) buttons = this.over ? '<button type="button" class="btn primary" id="onextline">' + (this.fixed ? 'Run it again' : 'Next line') + '</button><button type="button" class="btn" id="olines">All lines</button>' : '<button type="button" class="btn" id="onextline">' + (this.fixed ? 'Restart' : 'Another line') + '</button>';
      else buttons = '<button type="button" class="btn" id="oprev"' + (path.length ? '' : ' disabled') + '>Back</button><button type="button" class="btn primary" id="onext"' + (keys.length ? '' : ' disabled') + '>Next</button>' + (this.single != null ? '<button type="button" class="btn" id="otrain1">Train this line</button>' : '');
      this.panel.innerHTML = '<button type="button" class="link" id="olines">' + esc(op.name) + ': all lines</button><div><p class="crumb">' +
        (train ? 'Training · you play ' + side + (this.fixed ? '' : ' · the line is revealed as it splits') : 'Exploring · ' + live.length + (live.length === 1 ? ' line' : ' lines') + ' pass through here') + '</p><h2>' + esc(title) + '</h2></div>' +
        '<div class="line">' + (line || '<span class="no">Start position</span>') + '</div><p class="say">' + note + '</p>' +
        (train ? '' : keys.length ? '<div class="field"><span>' + (keys.length > 1 ? 'The lines split here' : 'Book move') + '</span><div class="cards">' + keys.map(function (san) {
          var ks = kids[san];
          return '<button type="button" class="card slim" data-san="' + san + '"><b>' + moveNo(path.length) + san + '</b><em>' + (ks.length > 1 ? ks.length + ' lines' : '') + '</em><span>' + ks.map(function (q) { return esc(op.lines[q].n); }).join(' · ') + '</span></button>';
        }).join('') + '</div></div>' : '<p class="meta">End of the line. ' + (this.single != null ? esc(op.lines[this.single].idea) : '') + '</p>') +
        '<div class="fb ' + (kind || '') + '" aria-live="polite">' + (text || '') + '</div><div class="row pin">' + buttons + '</div>';
    }
  };

  /* ---------- vision ---------- */
  var Vis = {
    root: $('#v-vision'), on: false, score: 0, left: 30, side: 'w', kind: 'find',
    show: function () {
      if (this.board) return;
      var st = stage(this.root), self = this;
      this.board = st.board; this.panel = st.panel; this.board.coords = false;
      this.board.onSquare = function (i) { if (self.kind === 'find') self.hit(i); };
      this.panel.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || b.disabled) return;
        if (b.id === 'vgo') self.start();
        else if (b.dataset.col) self.answer(b.dataset.col === 'd');
        else if (self.on) return;
        else if (b.parentNode.id === 'vside') { self.side = b.dataset.v; self.draw(); }
        else if (b.parentNode.id === 'vkind') { self.kind = b.dataset.v; self.score = 0; self.left = 30; self.draw(); }
      });
      this.draw();
    },
    best: function () { return this.kind === 'find' ? S.vision : (S.vision2 || 0); },
    draw: function (kind, text) {
      var color = this.kind === 'color';
      this.board.flip = this.side === 'b';
      this.board.el.classList.toggle('blind', color);
      this.board.draw();
      this.panel.innerHTML = '<div><p class="crumb">Thirty-second drill</p><h2>Board vision</h2></div>' +
        '<p class="say">' + (color ? 'Every square is light or dark, and strong players know which without looking. The board is blank: name the colour of each square.' : 'Strong players know every square without reading the edge of the board. The labels are gone. Click the named square as fast as you can.') + '</p>' +
        '<div class="ask" id="vt">' + (this.on ? this.target : '\u2013') + '</div>' +
        (color ? '<div class="row"><button type="button" class="btn" data-col="l"' + (this.on ? '' : ' disabled') + '>Light</button><button type="button" class="btn" data-col="d"' + (this.on ? '' : ' disabled') + '>Dark</button></div>' : '') +
        '<div class="tiles"><div class="tile"><b id="vs">' + this.score + '</b><span>Score</span></div><div class="tile"><b id="vl">' + this.left + '</b><span>Seconds</span></div><div class="tile"><b>' + this.best() + '</b><span>Best</span></div></div>' +
        '<div class="fb ' + (kind || '') + '" aria-live="polite">' + (text || '') + '</div>' +
        '<div class="field"><span>Drill</span>' + seg('vkind', [['find', 'Find the square'], ['color', 'Light or dark']], this.kind) + '</div>' +
        (color ? '' : '<div class="field"><span>View from</span>' + seg('vside', [['w', 'White'], ['b', 'Black']], this.side) + '</div>') +
        '<div class="row pin"><button type="button" class="btn primary" id="vgo"' + (this.on ? ' disabled' : '') + '>Start</button></div>';
    },
    ask: function () {
      var t;
      do { t = C.name(Math.floor(Math.random() * 64)); } while (t === this.target);
      this.target = t;
      var el = $('#vt');
      if (el) el.textContent = t;
    },
    start: function () {
      var self = this, end = Date.now() + 30000;
      this.on = true; this.score = 0; this.left = 30; this.target = null;
      this.ask(); this.draw();
      clearInterval(this.timer);
      this.timer = setInterval(function () {
        self.left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        var el = $('#vl');
        if (el) el.textContent = self.left;
        if (!self.left) self.stop();
      }, 200);
    },
    stop: function () {
      clearInterval(this.timer);
      this.on = false;
      var record = this.score > this.best(), find = this.kind === 'find';
      if (record) { if (find) S.vision = this.score; else S.vision2 = this.score; persist(); }
      if (this.score) gain(Math.min(30, this.score * 2), 'vision');
      this.draw('good plain', 'Time. You got <b>' + this.score + '</b> right' + (record ? ', a new best.' : '.') + (find ? ' Fifteen or more is club level.' : ' Twenty or more is strong.'));
    },
    hit: function (i) {
      if (!this.on) return;
      if (C.name(i) === this.target) { this.score++; $('#vs').textContent = this.score; this.board.blink(i, 'ok'); this.ask(); }
      else this.board.blink(i, 'no');
    },
    answer: function (dark) {
      if (!this.on) return;
      var i = C.idx(this.target), right = ((((i & 7) + (i >> 3)) % 2) === 1) === dark;
      if (right) { this.score++; $('#vs').textContent = this.score; }
      this.board.blink(i, right ? 'ok' : 'no');
      this.ask();
    }
  };

  /* ---------- styles ---------- */
  var SKINS = [
    ['ivory', 'Ivory', 'Warm paper, oxblood accent', '#efe5d2', '#ad9273', '#2b2521'],
    ['midnight', 'Midnight', 'Navy, champagne gold', '#cdd5e2', '#5f7298', '#0d1320'],
    ['carrara', 'Carrara', 'White marble, emerald', '#f5f6f4', '#a7b3ae', '#1c2321'],
    ['walnut', 'Walnut', 'Wood board, brass', '#e6cea4', '#8d5c38', '#1b1411']
  ];
  function skinNow() {
    var el = document.documentElement, th = el.getAttribute('data-theme'), dark;
    if (SKINS.some(function (k) { return k[0] === S.skin; })) return S.skin;
    dark = th === 'dark' || (th !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return dark ? 'midnight' : 'ivory';
  }
  function applySkin() {
    var skin = skinNow(), native = window.ChessNative;
    document.documentElement.setAttribute('data-skin', skin);
    // the Android app paints the screen edges (camera cutout, bars when swiped in) in the colour of the page
    try { if (native && native.bars) native.bars(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), skin === 'midnight' || skin === 'walnut'); } catch (e) { /* an older app */ }
  }
  function skinCards() {
    return SKINS.map(function (k) {
      var on = skinNow() === k[0];
      return '<button type="button" class="swatch' + (on ? ' on' : '') + '" data-skin="' + k[0] + '" aria-pressed="' + on + '"><i style="border-color:' + k[5] + '"><u style="background:' + k[3] + '"></u><u style="background:' + k[4] + '"></u><u style="background:' + k[4] + '"></u><u style="background:' + k[3] + '"></u></i><span>' + k[1] + '<small>' + k[2] + '</small></span></button>';
    }).join('');
  }
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('.swatch'), menu = $('#skins'), btn = $('#skinbtn');
    if (sw) {
      S.skin = sw.dataset.skin; persist(); applySkin();
      Array.prototype.forEach.call(document.querySelectorAll('.swatch'), function (x) {
        var on = x.dataset.skin === S.skin;
        x.classList.toggle('on', on); x.setAttribute('aria-pressed', on);
      });
      return;
    }
    if (e.target.closest('#skinbtn')) {
      menu.hidden = !menu.hidden;
      btn.setAttribute('aria-expanded', !menu.hidden);
      if (!menu.hidden) menu.innerHTML = '<p class="crumb">Choose a style</p><div class="swatches">' + skinCards() + '</div>';
      return;
    }
    if (!menu.hidden && !e.target.closest('#skins')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  });

  /* ---------- routing and start ---------- */
  var VIEWS = { learn: Learn, puzzles: Puz, play: Play, openings: Open, vision: Vis };
  function route() {
    var t = (location.hash || '').slice(1);
    if (!VIEWS[t]) t = 'learn';
    Object.keys(VIEWS).forEach(function (k) { $('#v-' + k).hidden = k !== t; });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs a'), function (a) {
      var on = a.dataset.tab === t;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    VIEWS[t].show();
    $('#skins').hidden = true;
  }
  function start(data) {
    try { var raw = localStorage.getItem(KEY); if (raw) Object.assign(S, JSON.parse(raw)); } catch (e) { /* start fresh */ }
    if (data && data.S) Object.assign(S, data.S);
    if ((S.v || 1) < 2) { Object.keys(S.openings || {}).forEach(function (id) { S.lines[id + ':0'] = 1; }); S.v = 2; }
    applySkin();
    header();
    window.addEventListener('hashchange', route);
    route();
  }
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { S: S }; });
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  /* the phone's Back button: closes the style menu, leaves a lesson or an opening, then goes to Learn; false = leave the app */
  function back() {
    var menu = $('#skins'), t = (location.hash || '').slice(1);
    if (!VIEWS[t]) t = 'learn';
    if (!menu.hidden) { menu.hidden = true; return true; }
    if (t === 'learn') {
      if (!Learn.cur) return false;
      if (S.start) Learn.home(); else Learn.setup();
      toTop();
      return true;
    }
    if (t === 'openings' && Open.cur) { if (Open.mode === 'map') Open.list(); else Open.open(Open.cur.id); return true; }
    location.hash = '#learn';
    return true;
  }
  window.__er = { S: S, Learn: Learn, Puz: Puz, Play: Play, Open: Open, Vis: Vis, back: back };
})();
