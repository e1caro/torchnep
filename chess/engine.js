/* Chess rules, notation and a small search. Board index 0 = a8, 63 = h1. */
var Chess = (function () {
  'use strict';
  var FILES = 'abcdefgh';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  var KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  var DI = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  var OR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  function name(i) { return FILES[i & 7] + (8 - (i >> 3)); }
  function idx(s) { return FILES.indexOf(s[0]) + (8 - (+s[1])) * 8; }
  function colorOf(p) { return p ? (p === p.toUpperCase() ? 'w' : 'b') : null; }
  function other(c) { return c === 'w' ? 'b' : 'w'; }

  function fromFEN(fen) {
    var parts = fen.trim().split(/\s+/), b = new Array(64).fill(null), i = 0;
    for (var k = 0; k < parts[0].length; k++) {
      var ch = parts[0][k];
      if (ch === '/') continue;
      if (ch >= '1' && ch <= '8') i += +ch; else b[i++] = ch;
    }
    return {
      b: b, turn: parts[1] || 'w',
      cas: parts[2] && parts[2] !== '-' ? parts[2] : '',
      ep: parts[3] && parts[3] !== '-' ? idx(parts[3]) : -1,
      half: +parts[4] || 0, full: +parts[5] || 1
    };
  }

  function toFEN(s) {
    var out = '';
    for (var y = 0; y < 8; y++) {
      var run = 0;
      for (var x = 0; x < 8; x++) {
        var p = s.b[y * 8 + x];
        if (!p) run++; else { if (run) { out += run; run = 0; } out += p; }
      }
      if (run) out += run;
      if (y < 7) out += '/';
    }
    return out + ' ' + s.turn + ' ' + (s.cas || '-') + ' ' + (s.ep >= 0 ? name(s.ep) : '-') + ' ' + s.half + ' ' + s.full;
  }

  function clone(s) { return { b: s.b.slice(), turn: s.turn, cas: s.cas, ep: s.ep, half: s.half, full: s.full }; }
  function key(s) { return toFEN(s).split(' ').slice(0, 4).join(' '); }

  function attacked(b, sq, by) {
    var x = sq & 7, y = sq >> 3, i, nx, ny, p, d;
    var N = by === 'w' ? 'N' : 'n', K = by === 'w' ? 'K' : 'k', P = by === 'w' ? 'P' : 'p';
    var B = by === 'w' ? 'B' : 'b', R = by === 'w' ? 'R' : 'r', Q = by === 'w' ? 'Q' : 'q';
    for (i = 0; i < 8; i++) {
      nx = x + KN[i][0]; ny = y + KN[i][1];
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && b[ny * 8 + nx] === N) return true;
      nx = x + KG[i][0]; ny = y + KG[i][1];
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && b[ny * 8 + nx] === K) return true;
    }
    ny = y + (by === 'w' ? 1 : -1);
    if (ny >= 0 && ny < 8) {
      if (x > 0 && b[ny * 8 + x - 1] === P) return true;
      if (x < 7 && b[ny * 8 + x + 1] === P) return true;
    }
    for (i = 0; i < 4; i++) {
      d = DI[i]; nx = x + d[0]; ny = y + d[1];
      while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        p = b[ny * 8 + nx];
        if (p) { if (p === B || p === Q) return true; break; }
        nx += d[0]; ny += d[1];
      }
      d = OR[i]; nx = x + d[0]; ny = y + d[1];
      while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        p = b[ny * 8 + nx];
        if (p) { if (p === R || p === Q) return true; break; }
        nx += d[0]; ny += d[1];
      }
    }
    return false;
  }

  function kingSq(b, c) { return b.indexOf(c === 'w' ? 'K' : 'k'); }
  function inCheck(s, c) {
    c = c || s.turn;
    var k = kingSq(s.b, c);
    return k >= 0 && attacked(s.b, k, other(c));
  }

  function pseudo(s) {
    var out = [], b = s.b, us = s.turn, them = other(us), i, j, x, y, p, t, nx, ny, to, d;
    function pawnTo(from, dest, cap, piece) {
      var last = us === 'w' ? 0 : 7;
      if ((dest >> 3) === last) {
        var set = us === 'w' ? 'QRBN' : 'qrbn';
        for (var q = 0; q < 4; q++) out.push({ from: from, to: dest, piece: piece, cap: cap, promo: set[q] });
      } else out.push({ from: from, to: dest, piece: piece, cap: cap });
    }
    for (i = 0; i < 64; i++) {
      p = b[i];
      if (!p || colorOf(p) !== us) continue;
      x = i & 7; y = i >> 3; t = p.toLowerCase();
      if (t === 'p') {
        var dir = us === 'w' ? -1 : 1, start = us === 'w' ? 6 : 1;
        ny = y + dir;
        if (ny < 0 || ny > 7) continue;
        if (!b[ny * 8 + x]) {
          pawnTo(i, ny * 8 + x, null, p);
          if (y === start && !b[(ny + dir) * 8 + x]) out.push({ from: i, to: (ny + dir) * 8 + x, piece: p, cap: null, flag: 'dbl' });
        }
        for (j = -1; j <= 1; j += 2) {
          nx = x + j;
          if (nx < 0 || nx > 7) continue;
          to = ny * 8 + nx;
          if (b[to] && colorOf(b[to]) === them) pawnTo(i, to, b[to], p);
          else if (to === s.ep && !b[to]) out.push({ from: i, to: to, piece: p, cap: us === 'w' ? 'p' : 'P', flag: 'ep' });
        }
      } else if (t === 'n' || t === 'k') {
        var steps = t === 'n' ? KN : KG;
        for (j = 0; j < 8; j++) {
          nx = x + steps[j][0]; ny = y + steps[j][1];
          if (nx < 0 || nx > 7 || ny < 0 || ny > 7) continue;
          to = ny * 8 + nx;
          if (!b[to] || colorOf(b[to]) === them) out.push({ from: i, to: to, piece: p, cap: b[to] });
        }
        if (t === 'k') {
          var home = us === 'w' ? 60 : 4, ks = us === 'w' ? 'K' : 'k', qs = us === 'w' ? 'Q' : 'q', rook = us === 'w' ? 'R' : 'r';
          if (i === home && !attacked(b, home, them)) {
            if (s.cas.indexOf(ks) >= 0 && b[home + 3] === rook && !b[home + 1] && !b[home + 2] &&
              !attacked(b, home + 1, them) && !attacked(b, home + 2, them))
              out.push({ from: i, to: home + 2, piece: p, cap: null, flag: 'ck' });
            if (s.cas.indexOf(qs) >= 0 && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
              !attacked(b, home - 1, them) && !attacked(b, home - 2, them))
              out.push({ from: i, to: home - 2, piece: p, cap: null, flag: 'cq' });
          }
        }
      } else {
        var dirs = t === 'b' ? DI : t === 'r' ? OR : KG;
        for (j = 0; j < dirs.length; j++) {
          d = dirs[j]; nx = x + d[0]; ny = y + d[1];
          while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
            to = ny * 8 + nx;
            if (!b[to]) out.push({ from: i, to: to, piece: p, cap: null });
            else { if (colorOf(b[to]) === them) out.push({ from: i, to: to, piece: p, cap: b[to] }); break; }
            nx += d[0]; ny += d[1];
          }
        }
      }
    }
    return out;
  }

  var RIGHTS = { 60: 'KQ', 4: 'kq', 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };
  function make(s, m) {
    var b = s.b, us = s.turn;
    var u = { cas: s.cas, ep: s.ep, half: s.half, full: s.full, taken: b[m.to] };
    b[m.to] = m.promo || m.piece; b[m.from] = null;
    if (m.flag === 'ep') b[m.to + (us === 'w' ? 8 : -8)] = null;
    else if (m.flag === 'ck') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    else if (m.flag === 'cq') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    if (s.cas) {
      var lose = (RIGHTS[m.from] || '') + (RIGHTS[m.to] || '');
      if (lose) s.cas = s.cas.split('').filter(function (c) { return lose.indexOf(c) < 0; }).join('');
    }
    s.ep = m.flag === 'dbl' ? (m.from + m.to) >> 1 : -1;
    s.half = (m.cap || m.piece.toLowerCase() === 'p') ? 0 : s.half + 1;
    if (us === 'b') s.full++;
    s.turn = other(us);
    return u;
  }
  function unmake(s, m, u) {
    var b = s.b;
    s.turn = other(s.turn);
    var us = s.turn;
    b[m.from] = m.piece; b[m.to] = u.taken;
    if (m.flag === 'ep') b[m.to + (us === 'w' ? 8 : -8)] = m.cap;
    else if (m.flag === 'ck') { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = null; }
    else if (m.flag === 'cq') { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = null; }
    s.cas = u.cas; s.ep = u.ep; s.half = u.half; s.full = u.full;
  }

  function legal(s) {
    var all = pseudo(s), out = [], us = s.turn;
    for (var i = 0; i < all.length; i++) {
      var u = make(s, all[i]);
      if (!inCheck(s, us)) out.push(all[i]);
      unmake(s, all[i], u);
    }
    return out;
  }

  function play(s, m) { var n = clone(s); make(n, m); return n; }

  function insufficient(s) {
    var minor = 0;
    for (var i = 0; i < 64; i++) {
      var p = s.b[i];
      if (!p) continue;
      var t = p.toLowerCase();
      if (t === 'p' || t === 'r' || t === 'q') return false;
      if (t !== 'k') minor++;
    }
    return minor <= 1;
  }
  function status(s) {
    var n = legal(s).length;
    if (!n) return inCheck(s) ? 'checkmate' : 'stalemate';
    if (insufficient(s)) return 'material';
    if (s.half >= 100) return 'fifty';
    return inCheck(s) ? 'check' : 'ok';
  }

  function san(s, m, moves) {
    moves = moves || legal(s);
    var out, t = m.piece.toUpperCase();
    if (m.flag === 'ck') out = 'O-O';
    else if (m.flag === 'cq') out = 'O-O-O';
    else if (t === 'P') {
      out = (m.cap ? FILES[m.from & 7] + 'x' : '') + name(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    } else {
      var dis = '', rivals = moves.filter(function (o) { return o.piece === m.piece && o.to === m.to && o.from !== m.from; });
      if (rivals.length) {
        if (!rivals.some(function (o) { return (o.from & 7) === (m.from & 7); })) dis = FILES[m.from & 7];
        else if (!rivals.some(function (o) { return (o.from >> 3) === (m.from >> 3); })) dis = '' + (8 - (m.from >> 3));
        else dis = name(m.from);
      }
      out = t + dis + (m.cap ? 'x' : '') + name(m.to);
    }
    var u = make(s, m);
    if (inCheck(s)) out += legal(s).length ? '+' : '#';
    unmake(s, m, u);
    return out;
  }
  function strip(x) { return x.replace(/[+#!?]/g, ''); }
  function fromSAN(s, text) {
    var moves = legal(s), want = strip(text);
    for (var i = 0; i < moves.length; i++) if (strip(san(s, moves[i], moves)) === want) return moves[i];
    return null;
  }
  function uci(m) { return name(m.from) + name(m.to) + (m.promo ? m.promo.toLowerCase() : ''); }
  function fromUCI(s, text) {
    var moves = legal(s);
    for (var i = 0; i < moves.length; i++) if (uci(moves[i]) === text) return moves[i];
    return null;
  }

  /* piece-square tables from White's side, a8 first */
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };

  /* static score in centipawns for the side to move */
  function evaluate(s) {
    var b = s.b, score = 0, heavy = 0, i, p, t;
    for (i = 0; i < 64; i++) { p = b[i]; if (p) { t = p.toLowerCase(); if (t !== 'p' && t !== 'k') heavy += VAL[t]; } }
    var endgame = heavy <= 2600;
    for (i = 0; i < 64; i++) {
      p = b[i];
      if (!p) continue;
      t = p.toLowerCase();
      var white = p !== t, table = t === 'k' && endgame ? PST.ke : PST[t];
      var v = VAL[t] + table[white ? i : (7 - (i >> 3)) * 8 + (i & 7)];
      score += white ? v : -v;
    }
    return s.turn === 'w' ? score : -score;
  }

  var MATE = 100000, nodes = 0;
  function order(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      m.o = (m.cap ? 10 * VAL[m.cap.toLowerCase()] - VAL[m.piece.toLowerCase()] + 10000 : 0) + (m.promo ? 9000 : 0);
    }
    moves.sort(function (a, c) { return c.o - a.o; });
    return moves;
  }
  function quiesce(s, alpha, beta, depth) {
    nodes++;
    var stand = evaluate(s);
    if (depth === 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    var moves = order(pseudo(s).filter(function (m) { return m.cap || m.promo; })), us = s.turn;
    for (var i = 0; i < moves.length; i++) {
      var u = make(s, moves[i]);
      if (inCheck(s, us)) { unmake(s, moves[i], u); continue; }
      var sc = -quiesce(s, -beta, -alpha, depth - 1);
      unmake(s, moves[i], u);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function negamax(s, depth, alpha, beta, ply) {
    if (depth === 0) return quiesce(s, alpha, beta, 4);
    nodes++;
    var moves = order(pseudo(s)), us = s.turn, any = false;
    for (var i = 0; i < moves.length; i++) {
      var u = make(s, moves[i]);
      if (inCheck(s, us)) { unmake(s, moves[i], u); continue; }
      any = true;
      var sc = -negamax(s, depth - 1, -beta, -alpha, ply + 1);
      unmake(s, moves[i], u);
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    if (!any) return inCheck(s) ? -MATE + ply : 0;
    return alpha;
  }
  /* every legal move with its searched score, best first */
  function rank(s, depth) {
    var w = clone(s), moves = order(legal(w)), out = [];
    nodes = 0;
    for (var i = 0; i < moves.length; i++) {
      var u = make(w, moves[i]);
      var sc = -negamax(w, depth - 1, -MATE * 2, MATE * 2, 1);
      unmake(w, moves[i], u);
      out.push({ move: moves[i], score: sc });
    }
    out.sort(function (a, c) { return c.score - a.score; });
    return out;
  }
  function best(s, depth) {
    var w = clone(s), moves = order(legal(w)), top = null, alpha = -MATE * 2;
    nodes = 0;
    for (var i = 0; i < moves.length; i++) {
      var u = make(w, moves[i]);
      var sc = -negamax(w, depth - 1, -MATE * 2, -alpha, 1);
      unmake(w, moves[i], u);
      if (sc > alpha) { alpha = sc; top = moves[i]; }
    }
    return top ? { move: top, score: alpha } : null;
  }

  /* can the side to move force mate within n of its own moves? */
  function forcesMate(s, n) {
    var moves = legal(s);
    for (var i = 0; i < moves.length; i++) {
      var u = make(s, moves[i]), ok = false, replies = legal(s);
      if (!replies.length) ok = inCheck(s);
      else if (n > 1) {
        ok = true;
        for (var j = 0; j < replies.length && ok; j++) {
          var v = make(s, replies[j]);
          ok = forcesMate(s, n - 1);
          unmake(s, replies[j], v);
        }
      }
      unmake(s, moves[i], u);
      if (ok) return true;
    }
    return false;
  }
  /* moves that keep a forced mate within n */
  function mateMoves(s, n) {
    var w = clone(s);
    return legal(w).filter(function (m) {
      var u = make(w, m), replies = legal(w), ok;
      if (!replies.length) ok = inCheck(w);
      else if (n <= 1) ok = false;
      else ok = replies.every(function (r) { var v = make(w, r), f = forcesMate(w, n - 1); unmake(w, r, v); return f; });
      unmake(w, m, u);
      return ok;
    });
  }

  return {
    START: START, FILES: FILES, VAL: VAL, MATE: MATE,
    name: name, idx: idx, colorOf: colorOf, other: other,
    fromFEN: fromFEN, toFEN: toFEN, clone: clone, key: key,
    attacked: attacked, inCheck: inCheck, kingSq: kingSq,
    pseudo: pseudo, legal: legal, make: make, unmake: unmake, play: play,
    status: status, san: san, fromSAN: fromSAN, uci: uci, fromUCI: fromUCI,
    evaluate: evaluate, rank: rank, best: best, forcesMate: forcesMate, mateMoves: mateMoves
  };
})();
if (typeof module !== 'undefined') module.exports = Chess;
