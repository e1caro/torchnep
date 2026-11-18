/* Bloomdoku engine: pure logic, no DOM. Runs in the browser (window.BD.engine) and in Node (module.exports).
 *
 * A puzzle is a plain object that can be saved as JSON:
 *   { n, regions[cell] -> region index, diag, knight, vines: [[cell, cell, ...]], parity[cell] -> 0 | 1 odd | 2 even,
 *     givens[cell] -> 0 or value, solution[cell] -> value, tier }
 * E.build(puzzle) derives the structure the solvers use (groups, peers, vine arcs). Values are 1..n; candidate sets
 * are bit masks (bit v-1 for value v).
 */
(function (root) {
  'use strict';
  var E = {};

  /* ---------- seeded random numbers ---------- */
  E.hash = function (str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
  E.rng = function (seed) {
    var a = typeof seed === 'string' ? E.hash(seed) : seed >>> 0;
    function r() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    r.int = function (n) { return Math.floor(r() * n); };
    r.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) { var j = r.int(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    };
    return r;
  };

  /* ---------- bits ---------- */
  var POP = new Uint8Array(512), LOW = new Int8Array(512), HIGH = new Int8Array(512);
  (function () {
    for (var m = 1; m < 512; m++) {
      POP[m] = POP[m >> 1] + (m & 1);
      var lo = 0; while (!((m >> lo) & 1)) lo++;
      var hi = 8; while (!((m >> hi) & 1)) hi--;
      LOW[m] = lo; HIGH[m] = hi;
    }
  })();
  E.pop = function (m) { return POP[m]; };
  E.values = function (m) { var out = []; for (var v = 1; v <= 9; v++) if (m & (1 << (v - 1))) out.push(v); return out; };

  /* ---------- structure ---------- */
  E.BOX = { 4: [2, 2], 6: [2, 3], 8: [2, 4], 9: [3, 3] }; // [rows, columns] of a plot

  E.boxRegions = function (n) {
    var d = E.BOX[n], out = [];
    for (var c = 0; c < n * n; c++) {
      var r = Math.floor(c / n), k = c % n;
      out.push(d ? Math.floor(r / d[0]) * d[0] + Math.floor(k / d[1]) : r);
    }
    return out;
  };

  var KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

  E.build = function (pz) {
    var n = pz.n, N = n * n, c, i, j;
    var S = { n: n, N: N, full: (1 << n) - 1, pz: pz, groups: [], cellGroups: [], peers: [], arcsOut: [], arcsIn: [], arcs: [] };
    var rows = [], cols = [], regs = [];
    for (i = 0; i < n; i++) { rows.push([]); cols.push([]); regs.push([]); }
    for (c = 0; c < N; c++) { rows[Math.floor(c / n)].push(c); cols[c % n].push(c); regs[pz.regions[c]].push(c); }
    for (i = 0; i < n; i++) S.groups.push({ kind: 'region', i: i, cells: regs[i] });
    for (i = 0; i < n; i++) S.groups.push({ kind: 'row', i: i, cells: rows[i] });
    for (i = 0; i < n; i++) S.groups.push({ kind: 'col', i: i, cells: cols[i] });
    if (pz.diag) {
      var d1 = [], d2 = [];
      for (i = 0; i < n; i++) { d1.push(i * n + i); d2.push(i * n + (n - 1 - i)); }
      S.groups.push({ kind: 'diag', i: 0, cells: d1 });
      S.groups.push({ kind: 'diag', i: 1, cells: d2 });
    }
    var seen = [];
    for (c = 0; c < N; c++) { S.cellGroups.push([]); seen.push(new Uint8Array(N)); S.arcsOut.push([]); S.arcsIn.push([]); }
    S.groups.forEach(function (g, gi) {
      g.index = gi;
      for (i = 0; i < g.cells.length; i++) {
        S.cellGroups[g.cells[i]].push(gi);
        for (j = 0; j < g.cells.length; j++) if (i !== j) seen[g.cells[i]][g.cells[j]] = 1;
      }
    });
    S.hops = [];
    for (c = 0; c < N; c++) {
      var hop = [];
      if (pz.knight) {
        var r = Math.floor(c / n), k = c % n;
        for (i = 0; i < 8; i++) {
          var rr = r + KNIGHT[i][0], kk = k + KNIGHT[i][1];
          if (rr >= 0 && rr < n && kk >= 0 && kk < n) { hop.push(rr * n + kk); seen[c][rr * n + kk] = 1; }
        }
      }
      S.hops.push(hop);
    }
    S.sees = seen;
    for (c = 0; c < N; c++) { var p = []; for (j = 0; j < N; j++) if (seen[c][j]) p.push(j); S.peers.push(p); }
    (pz.vines || []).forEach(function (vine) {
      for (i = 0; i + 1 < vine.length; i++) { S.arcs.push([vine[i], vine[i + 1]]); S.arcsOut[vine[i]].push(vine[i + 1]); S.arcsIn[vine[i + 1]].push(vine[i]); }
    });
    S.parityMask = null;
    if (pz.parity) {
      var odd = 0, even = 0;
      for (i = 1; i <= n; i++) { if (i % 2) odd |= 1 << (i - 1); else even |= 1 << (i - 1); }
      S.parityMask = [S.full, odd, even];
    }
    return S;
  };

  function startCand(S) {
    var cand = new Uint16Array(S.N), c;
    for (c = 0; c < S.N; c++) cand[c] = S.parityMask ? S.parityMask[S.pz.parity[c] || 0] : S.full;
    return cand;
  }

  /* ---------- search solver (counts solutions) ---------- */
  // Narrows candidates after the cells in `queue` changed. A cell left with one candidate removes it from every cell
  // it sees; vine arcs keep "smaller before bigger". Returns false on a contradiction.
  function reduce(S, cand, queue) {
    while (queue.length) {
      var c = queue.pop(), m = cand[c], i, o, nm;
      if (!m) return false;
      if (POP[m] === 1) {
        var ps = S.peers[c];
        for (i = 0; i < ps.length; i++) {
          o = ps[i];
          if (cand[o] & m) { cand[o] &= ~m; if (!cand[o]) return false; queue.push(o); }
        }
      }
      var out = S.arcsOut[c];
      for (i = 0; i < out.length; i++) { // c < o: o is above the smallest c can be
        o = out[i]; nm = cand[o] & ~((2 << LOW[m]) - 1);
        if (nm !== cand[o]) { cand[o] = nm; if (!nm) return false; queue.push(o); }
      }
      var inn = S.arcsIn[c];
      for (i = 0; i < inn.length; i++) { // o < c: o is below the biggest c can be
        o = inn[i]; nm = cand[o] & ((1 << HIGH[m]) - 1);
        if (nm !== cand[o]) { cand[o] = nm; if (!nm) return false; queue.push(o); }
      }
    }
    return true;
  }

  // E.solve(S, givens, { limit, rng, maxNodes }) -> { count, solution, aborted }
  E.solve = function (S, givens, opts) {
    opts = opts || {};
    var limit = opts.limit || 2, rng = opts.rng, maxNodes = opts.maxNodes || 1e9;
    var res = { count: 0, solution: null, aborted: false }, nodes = 0;
    var cand = startCand(S), queue = [], c;
    for (c = 0; c < S.N; c++) {
      if (givens && givens[c]) { if (!(cand[c] & (1 << (givens[c] - 1)))) return res; cand[c] = 1 << (givens[c] - 1); }
      queue.push(c);
    }
    if (!reduce(S, cand, queue)) return res;
    // A value with one place left in a group goes there; a value with no place left is a dead end.
    function singles(cd) {
      for (var again = true; again;) {
        again = false;
        for (var gi = 0; gi < S.groups.length; gi++) {
          var cells = S.groups[gi].cells;
          for (var bit = 1; bit <= S.full; bit <<= 1) {
            var where = -1, n = 0;
            for (var i = 0; i < cells.length; i++) if (cd[cells[i]] & bit) { where = cells[i]; if (++n > 1) break; }
            if (!n) return false;
            if (n === 1 && cd[where] !== bit) { cd[where] = bit; if (!reduce(S, cd, [where])) return false; again = true; }
          }
        }
      }
      return true;
    }
    (function walk(cd) {
      if (++nodes > maxNodes) { res.aborted = true; return; }
      if (!singles(cd)) return;
      var best = -1, bp = 99, c, i;
      for (c = 0; c < S.N; c++) { var p = POP[cd[c]]; if (p > 1 && p < bp) { bp = p; best = c; if (p === 2) break; } }
      if (best < 0) {
        res.count++;
        if (!res.solution) { res.solution = []; for (c = 0; c < S.N; c++) res.solution.push(LOW[cd[c]] + 1); }
        return;
      }
      var vals = E.values(cd[best]);
      if (rng) rng.shuffle(vals);
      for (i = 0; i < vals.length; i++) {
        var next = new Uint16Array(cd);
        next[best] = 1 << (vals[i] - 1);
        if (reduce(S, next, [best])) walk(next);
        if (res.count >= limit || res.aborted) return;
      }
    })(cand);
    return res;
  };

  /* ---------- logic solver (hints and grading) ---------- */
  // Candidates that follow directly from the rules: no value a cell sees, parity, and the bounds along vines.
  // Unlike the search solver, a cell with one candidate left is not treated as planted: that is a step.
  function basics(S, vals, cand) {
    var changed = true, c, i, o, nm;
    for (c = 0; c < S.N; c++) {
      if (!vals[c]) continue;
      var bit = 1 << (vals[c] - 1), ps = S.peers[c];
      cand[c] = bit;
      for (i = 0; i < ps.length; i++) if (!vals[ps[i]]) cand[ps[i]] &= ~bit;
    }
    while (changed) {
      changed = false;
      for (i = 0; i < S.arcs.length; i++) {
        c = S.arcs[i][0]; o = S.arcs[i][1];
        if (!cand[c] || !cand[o]) return false;
        nm = cand[o] & ~((2 << LOW[cand[c]]) - 1);
        if (nm !== cand[o]) { cand[o] = nm; changed = true; if (!nm) return false; }
        nm = cand[c] & ((1 << HIGH[cand[o]]) - 1);
        if (nm !== cand[c]) { cand[c] = nm; changed = true; if (!nm) return false; }
      }
    }
    for (c = 0; c < S.N; c++) if (!cand[c]) return false;
    return true;
  }
  E.candidates = function (S, vals) { var cand = startCand(S); basics(S, vals, cand); return cand; };

  var KIND_ORDER = { region: 0, row: 1, col: 2, diag: 3 };

  // The next flower that can be planted with singles alone, or null.
  function placement(S, vals, cand) {
    var gi, g, i, c, v, bit;
    // 1. the last free cell of a plot, row or column
    for (gi = 0; gi < S.groups.length; gi++) {
      g = S.groups[gi];
      var free = -1, count = 0;
      for (i = 0; i < g.cells.length; i++) if (!vals[g.cells[i]]) { free = g.cells[i]; count++; }
      if (count === 1 && POP[cand[free]] === 1) return { type: 'last', cell: free, v: LOW[cand[free]] + 1, group: gi };
    }
    // 2. a value with only one place left in a group
    for (gi = 0; gi < S.groups.length; gi++) {
      g = S.groups[gi];
      for (v = 1; v <= S.n; v++) {
        bit = 1 << (v - 1);
        var where = -1, n = 0, placed = false;
        for (i = 0; i < g.cells.length; i++) {
          c = g.cells[i];
          if (vals[c] === v) { placed = true; break; }
          if (!vals[c] && (cand[c] & bit)) { where = c; n++; }
        }
        if (!placed && n === 1) return { type: 'hidden', cell: where, v: v, group: gi };
      }
    }
    // 3. a cell where only one value fits
    for (c = 0; c < S.N; c++) if (!vals[c] && POP[cand[c]] === 1) return { type: 'naked', cell: c, v: LOW[cand[c]] + 1, group: -1 };
    return null;
  }

  // One harder deduction that removes candidates, or null. Returns { type, v|pair, group, cells, removed: [[cell, mask]] }.
  function elimination(S, vals, cand) {
    var gi, g, i, j, c, v, bit;
    // locked candidates: in a group, value v fits only in a few cells; a cell that sees all of them cannot be v
    for (gi = 0; gi < S.groups.length; gi++) {
      g = S.groups[gi];
      for (v = 1; v <= S.n; v++) {
        bit = 1 << (v - 1);
        var cells = [], placed = false;
        for (i = 0; i < g.cells.length; i++) {
          c = g.cells[i];
          if (vals[c] === v) { placed = true; break; }
          if (!vals[c] && (cand[c] & bit)) cells.push(c);
        }
        if (placed || cells.length < 2 || cells.length > 3) continue;
        var removed = [], ps = S.peers[cells[0]];
        for (i = 0; i < ps.length; i++) {
          c = ps[i];
          if (vals[c] || !(cand[c] & bit)) continue;
          var all = true;
          for (j = 1; j < cells.length; j++) if (!S.sees[cells[j]][c]) { all = false; break; }
          if (all) removed.push([c, bit]);
        }
        if (removed.length) return { type: 'locked', v: v, group: gi, cells: cells, removed: removed };
      }
    }
    // naked pair: two cells of a group share the same two candidates, so nobody else in the group has them
    for (gi = 0; gi < S.groups.length; gi++) {
      g = S.groups[gi];
      for (i = 0; i < g.cells.length; i++) {
        var a = g.cells[i];
        if (vals[a] || POP[cand[a]] !== 2) continue;
        for (j = i + 1; j < g.cells.length; j++) {
          var b = g.cells[j];
          if (vals[b] || cand[b] !== cand[a]) continue;
          var rem = [];
          for (var k = 0; k < g.cells.length; k++) {
            c = g.cells[k];
            if (c !== a && c !== b && !vals[c] && (cand[c] & cand[a])) rem.push([c, cand[c] & cand[a]]);
          }
          if (rem.length) return { type: 'pair', pair: E.values(cand[a]), group: gi, cells: [a, b], removed: rem };
        }
      }
    }
    return null;
  }

  // The next step from a position: { type, cell, v, group, via: [eliminations needed first], tier } or
  // { stuck: true, cell, options } when logic up to maxTier finds nothing, or { broken: true } on a contradiction.
  E.hint = function (S, vals, maxTier) {
    var cand = startCand(S), via = [];
    if (!basics(S, vals, cand)) return { broken: true };
    for (;;) {
      var p = placement(S, vals, cand);
      if (p) { p.via = via; p.tier = via.length ? 2 : 1; return p; }
      if ((maxTier || 2) < 2) break;
      var e = elimination(S, vals, cand);
      if (!e) break;
      e.removed.forEach(function (r) { cand[r[0]] &= ~r[1]; });
      via.push(e);
      if (!basics(S, vals, cand)) return { broken: true };
    }
    var best = -1, bp = 99;
    for (var c = 0; c < S.N; c++) if (!vals[c] && POP[cand[c]] < bp) { bp = POP[cand[c]]; best = c; }
    return { stuck: true, cell: best, options: best < 0 ? [] : E.values(cand[best]) };
  };

  // Solves as far as logic goes. -> { solved, vals, tier (hardest technique used), steps }
  E.logic = function (S, givens, maxTier) {
    var vals = givens.slice(), cand = startCand(S), tier = 1, steps = 0, left = 0, c;
    for (c = 0; c < S.N; c++) if (!vals[c]) left++;
    if (!basics(S, vals, cand)) return { solved: false, vals: vals, tier: tier, steps: steps };
    while (left) {
      var p = placement(S, vals, cand);
      if (p) {
        vals[p.cell] = p.v; left--; steps++;
        if (!basics(S, vals, cand)) break;
        continue;
      }
      if ((maxTier || 2) < 2) break;
      var e = elimination(S, vals, cand);
      if (!e) break;
      tier = 2;
      e.removed.forEach(function (r) { cand[r[0]] &= ~r[1]; });
      if (!basics(S, vals, cand)) break;
    }
    return { solved: left === 0, vals: vals, tier: tier, steps: steps };
  };

  /* ---------- checking a board ---------- */
  // Cells that break a rule you can see (two equal flowers that see each other, a vine going down, wrong parity).
  E.conflicts = function (S, vals) {
    var bad = new Uint8Array(S.N), c, i;
    for (c = 0; c < S.N; c++) {
      if (!vals[c]) continue;
      var ps = S.peers[c];
      for (i = 0; i < ps.length; i++) if (vals[ps[i]] === vals[c]) { bad[c] = 1; break; }
      if (S.parityMask && !(S.parityMask[S.pz.parity[c] || 0] & (1 << (vals[c] - 1)))) bad[c] = 1;
    }
    S.arcs.forEach(function (a) { if (vals[a[0]] && vals[a[1]] && vals[a[0]] >= vals[a[1]]) { bad[a[0]] = 1; bad[a[1]] = 1; } });
    return bad;
  };
  // Groups whose cells are all planted and right.
  E.doneGroups = function (S, vals) {
    var out = [];
    S.groups.forEach(function (g, gi) {
      for (var i = 0; i < g.cells.length; i++) if (vals[g.cells[i]] !== S.pz.solution[g.cells[i]]) return;
      out.push(gi);
    });
    return out;
  };

  /* ---------- generator ---------- */
  function neighbours(n, c) {
    var out = [], r = Math.floor(c / n), k = c % n;
    if (r > 0) out.push(c - n);
    if (r < n - 1) out.push(c + n);
    if (k > 0) out.push(c - 1);
    if (k < n - 1) out.push(c + 1);
    return out;
  }
  E.neighbours = neighbours;

  function connected(n, regions, id) {
    var cells = [], c;
    for (c = 0; c < n * n; c++) if (regions[c] === id) cells.push(c);
    if (!cells.length) return false;
    var seen = {}, stack = [cells[0]], count = 0;
    seen[cells[0]] = 1;
    while (stack.length) {
      c = stack.pop(); count++;
      neighbours(n, c).forEach(function (o) { if (regions[o] === id && !seen[o]) { seen[o] = 1; stack.push(o); } });
    }
    return count === cells.length;
  }
  E.connected = connected;

  // Wobbly plots: start from boxes (or rows) and trade border cells between neighbours while both stay in one piece.
  E.jigsaw = function (n, rng) {
    var reg = E.boxRegions(n), N = n * n, done = 0, tries = 0, want = n * 4;
    while (done < want && tries < N * 60) {
      tries++;
      var a = rng.int(N), nb = neighbours(n, a).filter(function (o) { return reg[o] !== reg[a]; });
      if (!nb.length) continue;
      var b = nb[rng.int(nb.length)], A = reg[a], B = reg[b];
      reg[a] = B; // a joins B; now B gives one of its cells that touches A back
      var give = [];
      for (var c = 0; c < N; c++) {
        if (reg[c] !== B || c === a) continue;
        if (neighbours(n, c).some(function (o) { return reg[o] === A; })) give.push(c);
      }
      if (!give.length) { reg[a] = A; continue; }
      var g = give[rng.int(give.length)];
      reg[g] = A;
      if (connected(n, reg, A) && connected(n, reg, B)) done++;
      else { reg[a] = A; reg[g] = B; }
    }
    return reg;
  };

  // Vines: paths of cells next to each other whose solution values go up. No two vines share a cell.
  E.growVines = function (n, solution, count, rng) {
    var used = new Uint8Array(n * n), vines = [], tries = 0, maxLen = n <= 6 ? 4 : 5;
    while (vines.length < count && tries < count * 40) {
      tries++;
      var c = rng.int(n * n);
      if (used[c] || solution[c] > n - 2) continue;
      var path = [c], want = 3 + rng.int(maxLen - 2), mark = {};
      mark[c] = 1;
      while (path.length < want) {
        var last = path[path.length - 1];
        var opts = neighbours(n, last).filter(function (o) { return !used[o] && !mark[o] && solution[o] > solution[last]; });
        if (!opts.length) break;
        var nx = opts[rng.int(opts.length)];
        path.push(nx); mark[nx] = 1;
      }
      if (path.length < 3) continue;
      path.forEach(function (x) { used[x] = 1; });
      vines.push(path);
    }
    return vines;
  };

  /* E.generate(p, seed): p = { n, jigsaw, diag, knight, vines (how many), parity (share of marked cells), givens
   * (stop removing at this many), tier (1 singles only, 2 with locked candidates and pairs), hard (must need tier 2) }. */
  E.generate = function (p, seed) {
    // `hard` levels promise a trick beyond singles: try a few seeds until the puzzle needs one.
    var pz = null;
    for (var attempt = 0; attempt < (p.hard ? 24 : 1); attempt++) {
      pz = make(p, attempt ? seed + '#' + attempt : seed);
      if (!p.hard || pz.tier >= 2) break;
    }
    pz.seed = String(seed);
    return pz;
  };
  function make(p, seed) {
    var rng = E.rng(String(seed)), n = p.n, N = n * n, pz, S, full = null, round = 0, c;
    while (!full) {
      if (++round > 200) throw new Error('No garden fits these rules: ' + JSON.stringify(p));
      pz = { n: n, regions: p.jigsaw ? E.jigsaw(n, rng) : E.boxRegions(n), diag: !!p.diag, knight: !!p.knight, vines: [], parity: null };
      S = E.build(pz);
      var res = E.solve(S, null, { limit: 1, rng: rng, maxNodes: 4000 });
      if (res.solution) full = res.solution;
    }
    pz.solution = full;
    if (p.vines) pz.vines = E.growVines(n, full, p.vines, rng);
    if (p.parity) {
      pz.parity = [];
      for (c = 0; c < N; c++) pz.parity.push(rng() < p.parity ? (full[c] % 2 ? 1 : 2) : 0);
    }
    S = E.build(pz);

    var givens = full.slice(), count = N, tier = p.tier || 1, target = p.givens || 0;
    var order = [];
    for (c = 0; c < N; c++) order.push(c);
    rng.shuffle(order);
    var mirror = !p.jigsaw; // regular boards lose their flowers in mirrored pairs, which looks tidy
    for (var i = 0; i < order.length && count > target; i++) {
      var a = order[i], b = mirror ? N - 1 - a : a;
      if (!givens[a]) continue;
      var keepA = givens[a], keepB = givens[b];
      givens[a] = 0; givens[b] = 0;
      if (E.logic(S, givens, tier).solved) count -= a === b ? 1 : (keepB ? 2 : 1);
      else { givens[a] = keepA; givens[b] = keepB; }
    }
    // A level that promises a trick: if singles still finish it, take away one more flower that makes a trick necessary.
    if (p.hard && E.logic(S, givens, 1).solved) {
      for (i = 0; i < order.length; i++) {
        var x = order[i], keep = givens[x];
        if (!keep) continue;
        givens[x] = 0;
        if (!E.logic(S, givens, 1).solved && E.logic(S, givens, 2).solved) break;
        givens[x] = keep;
      }
    }
    pz.givens = givens;
    pz.tier = E.logic(S, givens, tier).tier;
    return pz;
  }

  root.BD = root.BD || {};
  root.BD.engine = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
