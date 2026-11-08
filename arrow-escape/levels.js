/*
 * Bounce Arrows - level generator and rules (no DOM, runs in browser and Node).
 *
 * Rules
 *  - Every arrow is a snake: a path of cells from tail to head.
 *  - Tapping an arrow slides it out of the board along its "ray":
 *      straight arrow : the straight line from the head to the edge
 *      bounce arrow   : the line from the head to the wall, then it turns 90 degrees
 *                       and runs along the wall until it leaves the board
 *  - An arrow can leave only if every cell of its ray is empty.
 *
 * Solvability is guaranteed by construction: arrows are placed in REVERSE removal
 * order, and each new arrow's ray must not touch any arrow already placed. So the
 * blocking graph is acyclic and removing free arrows in any order always finishes.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Levels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0 up, 1 right, 2 down, 3 left
  const PALETTE_SIZE = 7;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ----- difficulty curve: the main tuning knob of the whole game ----- */
  function levelConfig(n) {
    const size = Math.min(11, 5 + Math.floor((n - 1) / 4));
    return {
      n, w: size, h: size,
      density: Math.min(0.86, 0.56 + n * 0.008),
      minLen: 2,
      maxLen: Math.min(6, 3 + Math.floor(n / 6)),
      bounce: n < 8 ? 0 : Math.min(6, 1 + Math.floor((n - 8) / 5)),
      chain: n < 4 ? 0 : Math.min(4, 1 + Math.floor((n - 4) / 8)),
      seed: n * 7919 + 13,
    };
  }

  // Same board for every player on a given date (dateStr = 'YYYY-MM-DD').
  function dailyConfig(dateStr) {
    const seed = hashString('daily:' + dateStr);
    const size = 8 + (seed % 3); // 8, 9 or 10
    return {
      n: 0, daily: dateStr, w: size, h: size,
      density: 0.82, minLen: 2, maxLen: 6, bounce: 3, chain: 3, seed,
    };
  }

  const inb = (w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h;

  // Cells an arrow must have free in order to leave. turn: 0 straight, +1/-1 bounce.
  function computeRay(w, h, hx, hy, dir, turn) {
    const ray = [];
    let x = hx, y = hy, d = dir, bounced = false, bend = -1;
    for (;;) {
      let nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (!inb(w, h, nx, ny)) {
        if (turn && !bounced) {
          bounced = true; bend = ray.length;
          d = (d + turn + 4) % 4;
          nx = x + DIRS[d][0]; ny = y + DIRS[d][1];
          if (!inb(w, h, nx, ny)) break; // corner: leaves straight away
        } else break;
      }
      ray.push([nx, ny]); x = nx; y = ny;
    }
    return { ray, exitDir: d, bend };
  }

  function candidate(r, w, h, occ, cfg, wantBounce) {
    let x = 0, y = 0, ok = false;
    for (let i = 0; i < 24; i++) {
      x = Math.floor(r() * w); y = Math.floor(r() * h);
      if (occ[y * w + x] === -1) { ok = true; break; }
    }
    if (!ok) return null;
    const maxLen = wantBounce ? Math.min(cfg.maxLen, 4) : cfg.maxLen;
    const len = cfg.minLen + Math.floor(r() * (maxLen - cfg.minLen + 1));
    const cells = [[x, y]];
    const used = new Set([y * w + x]);
    let dir = Math.floor(r() * 4);
    while (cells.length < len) {
      const order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = order[i]; order[i] = order[j]; order[j] = tmp; } // Fisher-Yates: identical on every engine
      if (r() < 0.55) order.unshift(dir); // prefer to keep going straight
      let moved = false;
      for (const d of order) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inb(w, h, nx, ny) || used.has(ny * w + nx) || occ[ny * w + nx] !== -1) continue;
        x = nx; y = ny; dir = d; used.add(ny * w + nx); cells.push([x, y]); moved = true; break;
      }
      if (!moved) break;
    }
    if (cells.length < cfg.minLen) return null;
    const n = cells.length;
    const headDir = n >= 2
      ? DIRS.findIndex(d => d[0] === cells[n - 1][0] - cells[n - 2][0] && d[1] === cells[n - 1][1] - cells[n - 2][1])
      : Math.floor(r() * 4);
    const turn = wantBounce ? (r() < 0.5 ? 1 : -1) : 0;
    const head = cells[n - 1];
    const { ray, exitDir, bend } = computeRay(w, h, head[0], head[1], headDir, turn);
    if (wantBounce && (bend < 0 || ray.length < 2)) return null;
    for (const [rx, ry] of ray) {
      if (occ[ry * w + rx] !== -1 || used.has(ry * w + rx)) return null; // ray must be free
    }
    return { cells, dir: headDir, turn, ray, exitDir, bend };
  }

  function build(cfg, seed) {
    const r = mulberry32(seed);
    const { w, h } = cfg;
    const occ = new Int16Array(w * h).fill(-1);
    const rayCount = new Int16Array(w * h); // how many placed arrows' rays cross each cell
    const arrows = [];
    const target = Math.floor(w * h * cfg.density);
    let filled = 0, bounceLeft = cfg.bounce, fails = 0;

    while (filled < target && fails < 250) {
      const wantBounce = bounceLeft > 0 && filled < target * 0.6 && r() < 0.6;
      let best = null;
      const tries = wantBounce ? 16 : 8;
      for (let k = 0; k < tries; k++) {
        const c = candidate(r, w, h, occ, cfg, wantBounce);
        if (!c) continue;
        // prefer arrows that sit on other arrows' rays: that is what makes a puzzle
        let sc = r() * 0.8 + c.cells.length * 0.1;
        for (const [cx, cy] of c.cells) sc += rayCount[cy * w + cx];
        if (!best || sc > best.sc) { best = c; best.sc = sc; }
      }
      if (!best) { fails++; continue; }
      fails = 0;
      const id = arrows.length;
      for (const [cx, cy] of best.cells) occ[cy * w + cx] = id;
      for (const [rx, ry] of best.ray) rayCount[ry * w + rx]++;
      arrows.push({
        id, cells: best.cells, dir: best.dir, turn: best.turn, bounce: best.turn !== 0,
        ray: best.ray, exitDir: best.exitDir, bend: best.bend,
        chain: false, color: Math.floor(r() * PALETTE_SIZE),
      });
      filled += best.cells.length;
      if (best.turn) bounceLeft--;
    }

    // chain arrows: pick some plain arrows that have neighbours to set off
    const plain = arrows.filter(a => !a.bounce && a.cells.length >= 2);
    for (let i = plain.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [plain[i], plain[j]] = [plain[j], plain[i]]; }
    for (let i = 0; i < Math.min(cfg.chain, plain.length); i++) plain[i].chain = true;

    return { cfg, w, h, arrows };
  }

  function generateLevel(cfg) {
    let lv = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      lv = build(cfg, cfg.seed + attempt * 1013);
      if (lv.arrows.length >= 4) break;
    }
    return lv;
  }

  /* ----- rules ----- */
  function makeOcc(level) {
    const occ = new Int16Array(level.w * level.h).fill(-1);
    for (const a of level.arrows) for (const [x, y] of a.cells) occ[y * level.w + x] = a.id;
    return occ;
  }

  // id of the first arrow in the way, or -1 if the arrow can leave
  function firstBlocker(occ, w, a) {
    for (const [x, y] of a.ray) {
      const id = occ[y * w + x];
      if (id !== -1) return id;
    }
    return -1;
  }

  const isFree = (occ, w, a) => firstBlocker(occ, w, a) === -1;

  return { DIRS, PALETTE_SIZE, mulberry32, hashString, levelConfig, dailyConfig, computeRay, generateLevel, makeOcc, firstBlocker, isFree };
});
