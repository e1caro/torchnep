/* Kaidoneta art: Kaido "Borracho", an original anime key-art drawing made by hand in SVG (no official artwork).
 * Kaido plastered on sake at an Onigashima party: head tilted, heavy-lidded glowing eyes, flushed cheeks and nose,
 * a huge woozy laugh with one drunk tear, a giant red sake gourd sloshing an arc of sake, hiccup bubbles, paper
 * lanterns, the fur cloak, the scale tattoo and Hassaikai slung behind the shoulder. Same set as kaido-bust.js.
 * K.art.kaidoVariants.hybrid.svg(opts) returns the SVG string (the id stays 'hybrid'; the style is named 'Borracho').
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  A.kaidoVariants = A.kaidoVariants || {};
  var uid = 0;

  var prec = 10; // 1 = whole units for the big busy layers (hair, fur, lines): smaller SVG
  function f(n) { return Math.round(n * prec) / prec; }
  function P(x, y) { return f(x) + ',' + f(y); }
  function seeded(seed) { var s = seed % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // Smooth path through points [x, y] (Catmull-Rom as cubic Beziers); a third value 0 makes that point a corner.
  function smooth(pts, closed) {
    var n = pts.length, d = 'M' + P(pts[0][0], pts[0][1]), last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      var a = p1[2] === 0 ? 0 : 1 / 6, b = p2[2] === 0 ? 0 : 1 / 6;
      // Catmull-Rom tangents are symmetric at a smooth point, so the shorter S command is exact there.
      d += (i > 0 && a ? 'S' : 'C' + P(p1[0] + (p2[0] - p0[0]) * a, p1[1] + (p2[1] - p0[1]) * a) + ' ') + P(p2[0] - (p3[0] - p1[0]) * b, p2[1] - (p3[1] - p1[1]) * b) + ' ' + P(p2[0], p2[1]);
    }
    return d + (closed ? 'Z' : '');
  }
  function poly(pts) { return 'M' + pts.map(function (p) { return P(p[0], p[1]); }).join('L') + 'Z'; }
  // Catmull-Rom samples through [x, y, w...] (every value smoothed).
  function cr(pts, seg) {
    var n = pts.length, m = pts[0].length, out = [];
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (var j = 0; j < seg; j++) {
        var t = j / seg, t2 = t * t, t3 = t2 * t, q = [];
        for (var k = 0; k < m; k++) q.push(0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3));
        out.push(q);
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  function normals(c) {
    var n = c.length;
    return c.map(function (p, i) {
      var a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      return [-dy / l, dx / l, dx / l, dy / l];
    });
  }
  // A filled band along [x, y, halfWidth] points, between offsets a*w and b*w across the line
  // (a=-1, b=1: a tapered thick-thin stroke; other values: a cel-shadow or highlight strip along one side).
  function band(pts, seg, a, b) {
    var c = cr(pts, seg || 1), N = normals(c), n = c.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var w = Math.max(0, c[i][2]), x = c[i][0], y = c[i][1], nx = N[i][0], ny = N[i][1];
      L.push([x + nx * w * b, y + ny * w * b]);
      R.unshift([x + nx * w * a, y + ny * w * a]);
    }
    L[0][2] = 0; L[n - 1][2] = 0; R[0][2] = 0; R[n - 1][2] = 0;
    return smooth(L.concat(R), true);
  }
  function rib(pts, seg) { return band(pts, seg || 1, -1, 1); }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  // Per-call state: the <defs> being built, the id suffix, a path counter and the id of the last shared path.
  var defs = '', cur = '', pn = 0, lastId = '';
  // Thick-thin ink: an ink copy pushed down-right under the fill, plus a fine contour on top.
  // The outline is stored once in <defs> and drawn twice with <use>.
  function inked(d, fill, sw, ox, oy) {
    lastId = 'p' + (pn++) + cur;
    defs += '<path id="' + lastId + '" d="' + d + '"/>';
    return '<use href="#' + lastId + '" fill="' + INK + '" transform="translate(' + (ox == null ? 1.6 : ox) + ',' + (oy == null ? 2.2 : oy) + ')"/>' +
      '<use href="#' + lastId + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 1.4) + '" stroke-linejoin="round"/>';
  }
  // Jagged lightning polyline from (x0,y0) to (x1,y1).
  function jag(x0, y0, x1, y1, n, amp, r) {
    var dx = x1 - x0, dy = y1 - y0, l = Math.sqrt(dx * dx + dy * dy), nx = -dy / l, ny = dx / l, d = 'M' + P(x0, y0), pts = [[x0, y0]];
    for (var i = 1; i < n; i++) {
      var t = i / n, o = (r() - 0.5) * 2 * amp * (i % 2 ? 1 : -0.6);
      var x = x0 + dx * t + nx * o, y = y0 + dy * t + ny * o;
      d += 'L' + P(x, y); pts.push([x, y]);
    }
    pts.push([x1, y1]);
    return { d: d + 'L' + P(x1, y1), pts: pts };
  }

  var INK = '#0b0612';
  var SK = '#c27a48', SKL = '#dd9a62', SKH = '#f7d3a0', SH = '#6e3c6c', DSH = '#3e1d4c', RIM = '#f0c4ff';
  var HR = '#120a1c', HR2 = '#1f1033', HRH = '#7650c8', HRH2 = '#b79cf7';
  var HN = '#f0e4c8', HNS = '#b8a2c2', HND = '#7e6a96';
  var FUR = '#251d62', FUR2 = '#3a2f92', FUR3 = '#6c5bd8', FUR4 = '#bdb3ff';

  function art(i) {
    var id = function (s) { return s + i; }, url = function (s) { return 'url(#' + s + i + ')'; };
    var o = '', r;
    defs = ''; cur = i; pn = 0;
    var LIT = '<g class="kd-lit" opacity=".22">';

    /* ================= defs ================= */
    defs += '<radialGradient id="' + id('bg') + '" cx="205" cy="160" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8b46ff"/><stop offset=".22" stop-color="#4c1d95"/><stop offset=".55" stop-color="#22103f"/><stop offset=".85" stop-color="#12081f"/><stop offset="1" stop-color="#12081f" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('fl') + '" cx="205" cy="190" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f5e8ff"/><stop offset=".35" stop-color="#b48cff" stop-opacity=".75"/><stop offset=".7" stop-color="#7c3aed" stop-opacity=".35"/><stop offset="1" stop-color="#5b21b6" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('burst') + '" cx="205" cy="105" r="175" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".15" stop-color="#f0dcff" stop-opacity=".8"/><stop offset=".4" stop-color="#b06cff" stop-opacity=".45"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>';
    defs += '<linearGradient id="' + id('fade') + '" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset=".74" stop-color="#fff"/><stop offset=".95" stop-color="#000"/></linearGradient>';
    defs += '<linearGradient id="' + id('hf') + '" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset=".1" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>';
    defs += '<linearGradient id="' + id('tf') + '" x1="0" y1="0" x2="0" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>';
    defs += '<mask id="' + id('m') + '" maskUnits="userSpaceOnUse" x="-20" y="-40" width="440" height="640"><rect x="-20" y="-40" width="440" height="640" fill="' + url('fade') + '"/></mask>';
    defs += '<mask id="' + id('mh') + '" maskUnits="userSpaceOnUse" x="-20" y="-40" width="440" height="640"><rect x="-20" y="-40" width="440" height="640" fill="' + url('hf') + '"/><rect x="-20" y="-40" width="440" height="100" fill="' + url('tf') + '"/></mask>';
    defs += '<filter id="' + id('glow') + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>';
    defs += '<filter id="' + id('eg') + '" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.2"/></filter>';
    defs += '<filter id="' + id('sg') + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>';
    defs += '<pattern id="' + id('dots') + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1" fill="#1a0a26"/></pattern>';
    defs += '<pattern id="' + id('bgd') + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="3.5" cy="3.5" r="1.1" fill="#c4a1ff"/></pattern>';

    /* ================= background ================= */
    prec = 1;
    var bg = '<rect x="-20" y="-40" width="440" height="640" fill="' + url('bg') + '"/>';
    bg += '<rect x="-20" y="-40" width="440" height="640" fill="' + url('bgd') + '" opacity=".07"/>';
    // manga focus lines radiating from the face
    r = seeded(11);
    var fd = '', fd2 = '', cx = 205, cy = 195;
    for (var k = 0; k < 60; k++) {
      var an = (k / 60) * Math.PI * 2 + (r() - 0.5) * 0.05, r0 = 135 + r() * 80, sp = 0.003 + r() * 0.011;
      var tri = 'M' + P(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0) + 'L' + P(cx + Math.cos(an - sp) * 640, cy + Math.sin(an - sp) * 640) + 'L' + P(cx + Math.cos(an + sp) * 640, cy + Math.sin(an + sp) * 640) + 'Z';
      if (k % 3) fd += tri; else fd2 += tri;
    }
    bg += path(fd, url('fl'), ' opacity=".45"') + path(fd2, url('fl'), ' opacity=".9"');
    bg += '<circle class="kd-burst" cx="205" cy="105" r="175" fill="' + url('burst') + '"/>';
    // thunder flash (only shows while a bolt strikes)
    bg += '<rect class="kd-fl" x="-20" y="-40" width="440" height="640" fill="' + url('fl') + '" opacity="0"/>';
    o += '<g mask="' + url('mh') + '">' + bg + '</g>';

    // lightning crown bursting from behind the head: two sets that strike in turn
    r = seeded(5);
    var bolts = [[205, 100, -10, 40, 9, 16], [200, 95, 120, -40, 6, 12], [212, 95, 270, -40, 6, 12], [210, 100, 410, 70, 9, 18], [195, 120, -10, 250, 10, 18], [215, 120, 410, 245, 9, 16]];
    var bdA = '', bdB = '';
    bolts.forEach(function (b, j) {
      var J = jag(b[0], b[1], b[2], b[3], b[4], b[5], r), bd = J.d;
      var q = J.pts[Math.floor(J.pts.length / 2)], q2 = J.pts[Math.floor(J.pts.length * 0.7)];
      bd += jag(q[0], q[1], q[0] + (b[2] - b[0]) * 0.25 + (r() - 0.5) * 60, q[1] + (b[3] - b[1]) * 0.25 + (r() - 0.5) * 60, 4, 8, r).d;
      if (j % 2) bd += jag(q2[0], q2[1], q2[0] + (r() - 0.5) * 70, q2[1] + (r() - 0.5) * 70, 3, 6, r).d;
      if (j === 0 || j === 1 || j === 3) bdA += bd; else bdB += bd;
    });
    [bdA, bdB].forEach(function (bd, j) {
      o += '<g class="kd-b' + (j ? 'b' : 'a') + '" fill="none" stroke-linejoin="round" stroke-linecap="round"' + (j ? ' opacity=".85"' : '') + '>' +
        '<path d="' + bd + '" stroke="#a855f7" stroke-width="9" opacity=".8" filter="' + url('glow') + '"/>' +
        '<path d="' + bd + '" stroke="#fbf5ff" stroke-width="2.4"/></g>';
    });

    /* ================= party lanterns on a string ================= */
    defs += '<radialGradient id="' + id('lg') + '"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset=".45" stop-color="#f97316" stop-opacity=".3"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('lb') + '" cx=".45" cy=".45" r=".6"><stop offset="0" stop-color="#fff3c4"/><stop offset=".4" stop-color="#ffb347"/><stop offset=".8" stop-color="#ea580c"/><stop offset="1" stop-color="#9a3412"/></radialGradient>';
    o += '<path d="M-10,6Q110,34 200,10T410,26" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".8"/>';
    [[30, 54, 19, 23], [374, 66, 20, 24], [148, 36, 9, 11], [262, 30, 8, 10]].forEach(function (q, j) {
      var x = q[0], y = q[1], rx = q[2], ry = q[3];
      o += '<g class="kd-lan' + (j % 2 ? ' kd-lan2' : '') + '"><circle class="kd-lg" cx="' + x + '" cy="' + y + '" r="' + rx * 3.2 + '" fill="' + url('lg') + '"/>' +
        '<path d="M' + x + ',' + (y - ry - 14) + 'V' + (y - ry) + 'M' + x + ',' + (y + ry) + 'v' + f(ry * 0.9) + '" stroke="' + INK + '" stroke-width="1.4"/>' +
        '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + url('lb') + '" stroke="' + INK + '" stroke-width="1.2"/>' +
        '<path d="M' + P(x - rx * 0.95, y - ry * 0.35) + 'Q' + P(x, y - ry * 0.15) + ' ' + P(x + rx * 0.95, y - ry * 0.35) + 'M' + P(x - rx, y + ry * 0.05) + 'Q' + P(x, y + ry * 0.3) + ' ' + P(x + rx, y + ry * 0.05) + 'M' + P(x - rx * 0.9, y + ry * 0.45) + 'Q' + P(x, y + ry * 0.7) + ' ' + P(x + rx * 0.9, y + ry * 0.45) + '" fill="none" stroke="#9a3412" stroke-width=".9" opacity=".7"/>' +
        '<path d="M' + P(x - rx * 0.5, y - ry) + 'h' + f(rx) + 'v' + f(-ry * 0.22) + 'h' + f(-rx) + 'ZM' + P(x - rx * 0.5, y + ry) + 'h' + f(rx) + 'v' + f(ry * 0.22) + 'h' + f(-rx) + 'Z" fill="#1a0a26"/>' +
        '<ellipse cx="' + f(x - rx * 0.4) + '" cy="' + f(y - ry * 0.35) + '" rx="' + f(rx * 0.22) + '" ry="' + f(ry * 0.4) + '" fill="#fff" opacity=".55"/></g>';
    });
    o += '<g class="kd-sway"><g transform="translate(33,29) scale(.78) rotate(-6,207,300)">';
    /* ================= mane (behind) ================= */
    o += '<g class="kd-hm">' + path(smooth([[150, 160], [146, 116], [172, 88], [212, 76], [258, 80], [302, 94], [352, 106], [408, 112], [432, 140, 0], [432, 345, 0], [392, 336], [344, 316], [300, 300], [276, 292], [262, 318], [160, 318], [128, 338], [108, 300], [114, 240], [128, 196]], true), HR);
    r = seeded(23);
    var locks = '', lockH = '';
    function lock(pts, col) {
      locks += path(rib(pts, 1), col);
      var hl = pts.map(function (p, j) { return [p[0], p[1] - p[2] * 0.45, j === 0 || j === pts.length - 1 ? 0 : Math.max(0.6, p[2] * 0.18)]; });
      if (j2 % 4 !== 3) lockH += path(rib(hl, 1), j2 % 3 ? HRH : HRH2);
      j2++;
    }
    var j2 = 0;
    // wind-blown locks streaming right
    for (k = 0; k < 13; k++) {
      var x0 = 250 + r() * 25, y0 = 92 + k * 18 + r() * 6, w0 = 10 + r() * 6, len = 150 + r() * 80, dr = 10 + k * 3 + r() * 15, ph = r() * 6;
      var pts = [];
      for (var s = 0; s <= 5; s++) {
        var t = s / 5;
        pts.push([x0 + len * t, y0 + dr * t * t + Math.sin(ph + t * 5.5) * 13 * t, s === 5 ? 0 : w0 * (1 - t * 0.75)]);
      }
      lock(pts, k % 2 ? HR : HR2);
    }
    o += '<g class="kd-mane">' + locks + lockH + '</g>';
    locks = ''; lockH = '';
    // far-side locks falling behind the shoulder and whipping out
    lock([[160, 140, 11], [138, 170, 11], [124, 215, 10], [118, 262, 8], [116, 305, 5], [122, 340, 0]], HR2);
    lock([[150, 132, 9], [124, 136, 8], [98, 150, 6.5], [80, 172, 4], [70, 196, 0]], HR);
    lock([[152, 168, 9], [126, 188, 8], [106, 222, 6], [96, 258, 3], [96, 280, 0]], HR);
    o += locks + lockH + '</g>';
    prec = 10;
    o += '</g><g transform="translate(8,-7) scale(.9)">';
    /* ================= Hassaikai's handle + ring (behind the left shoulder) ================= */
    o += '<g class="kd-body">';
    var hx0 = 132, hy0 = 352, hx1 = 42, hy1 = 200, ux = hx1 - hx0, uy = hy1 - hy0, ul = Math.sqrt(ux * ux + uy * uy);
    ux /= ul; uy /= ul;
    var rcx = hx1 + ux * 19, rcy = hy1 + uy * 19;
    o += '<circle cx="' + f(rcx + 1.5) + '" cy="' + f(rcy + 2) + '" r="17" fill="none" stroke="' + INK + '" stroke-width="11"/>';
    o += '<circle cx="' + f(rcx) + '" cy="' + f(rcy) + '" r="17" fill="none" stroke="#3a3150" stroke-width="7.5"/>';
    o += '<path d="M' + P(rcx - 15, rcy - 6) + 'A16,16 0 0 1 ' + P(rcx + 4, rcy - 16.5) + '" fill="none" stroke="#c9b8f2" stroke-width="2.4" stroke-linecap="round"/>';
    o += '<path d="M' + P(rcx - 16.5, rcy + 3) + 'A17,17 0 0 0 ' + P(rcx - 6, rcy + 16) + '" fill="none" stroke="#6d5fa0" stroke-width="1.6" stroke-linecap="round"/>';
    o += '<path d="M' + P(rcx + 16, rcy + 4) + 'A16,16 0 0 1 ' + P(rcx + 2, rcy + 16.5) + '" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>';
    var hd = rib([[hx0, hy0, 8], [hx1 + ux * 2, hy1 + uy * 2, 7]], 2);
    o += inked(hd, '#2d2640', 1.4);
    o += path(band([[hx0, hy0, 8], [hx1, hy1, 7]], 2, -0.75, -0.35), '#8f80bf');
    for (k = 0; k < 9; k++) {
      var bx = hx0 + ux * (12 + k * 15), by = hy0 + uy * (12 + k * 15);
      o += '<path d="M' + P(bx - uy * 8, by + ux * 8) + 'L' + P(bx + uy * 8 + ux * 5, by - ux * 8 + uy * 5) + '" stroke="' + INK + '" stroke-width="2.2"/>';
    }
    o += inked(poly([[hx1 + uy * 10, hy1 - ux * 10], [hx1 - uy * 10, hy1 + ux * 10], [hx1 - uy * 9 + ux * 7, hy1 + ux * 9 + uy * 7], [hx1 + uy * 9 + ux * 7, hy1 - ux * 9 + uy * 7]]), '#4a3f66', 1.2);

    /* ================= fur collar (behind) ================= */
    prec = 1;
    var furBack = smooth([[70, 312], [110, 280], [160, 262], [250, 256], [310, 268], [370, 280], [430, 286, 0], [432, 380, 0], [330, 340], [200, 330], [60, 350]], true);
    o += path(furBack, FUR);
    r = seeded(31);
    var ft = '';
    function tuft(x, y, ang, len, w, col) {
      var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, cu = (r() < 0.5 ? -1 : 1) * (0.18 + r() * 0.3) * len;
      ft += path(rib([[x, y, w], [x + dx * len * 0.35 + nx * cu * 0.08, y + dy * len * 0.35 + ny * cu * 0.08, w * 0.9], [x + dx * len * 0.7 + nx * cu * 0.4, y + dy * len * 0.7 + ny * cu * 0.4, w * 0.55], [x + dx * len + nx * cu, y + dy * len + ny * cu, 0]]), col);
    }
    for (k = 0; k < 26; k++) {
      var tx = 95 + k * 13 + r() * 8, ty = 270 + Math.abs(tx - 210) * 0.08 + r() * 12;
      tuft(tx, ty + 10, -Math.PI / 2 + (tx - 210) / 200 + (r() - 0.5) * 0.7, 22 + r() * 16, 7 + r() * 3, k % 3 ? FUR2 : FUR3);
    }
    for (k = 0; k < 14; k++) tuft(100 + k * 22 + r() * 10, 272 + r() * 10, -Math.PI / 2 + (r() - 0.5) * 0.9, 12 + r() * 8, 2 + r() * 1.2, FUR4);
    // the collar falls into shadow under the jaw and the mane
    ft += path(smooth([[150, 300], [176, 268], [230, 258], [290, 268], [330, 290], [300, 300], [240, 292], [190, 296]], true), '#150f3f', ' opacity=".6"');
    o += ft; ft = '';
    prec = 10;

    /* ================= torso ================= */
    var torsoD = smooth([[166, 250, 0], [165, 296], [142, 316], [98, 330], [40, 342], [-20, 360, 0], [-20, 600, 0], [420, 600, 0], [420, 350, 0], [372, 334], [318, 318], [284, 302], [270, 280], [264, 245, 0]], true);
    defs += '<clipPath id="' + id('ct') + '"><path d="' + torsoD + '"/></clipPath>';
    o += inked(torsoD, SK, 1.6);
    var tsh = '';
    // cast shadow of the head on the neck + the shadowed right side of the chest
    tsh += path(smooth([[140, 240, 0], [296, 240, 0], [296, 322], [270, 318], [248, 329], [226, 319, 0], [207, 334], [187, 319, 0], [168, 324], [150, 310]], true), DSH);
    tsh += path(smooth([[262, 326, 0], [300, 320], [340, 330], [432, 346, 0], [432, 600, 0], [300, 600, 0], [292, 520], [282, 470], [262, 430], [244, 392], [246, 352]], true), SH);
    tsh += path(smooth([[-20, 470, 0], [60, 480], [130, 488], [196, 470], [232, 478], [300, 600, 0], [-20, 600, 0]], true), SH);
    var tsd = tsh;
    // core shadows that round the left pectoral and the pit of the neck
    tsh += path(smooth([[196, 362], [208, 356], [212, 400], [210, 452], [200, 468], [184, 462], [196, 440], [200, 400]], true), SH);
    tsh += path(smooth([[100, 452], [150, 470], [200, 462], [198, 476], [150, 488], [96, 480], [60, 462]], true), DSH);
    tsh += path(smooth([[196, 338], [210, 332], [224, 338], [212, 352]], true), DSH);
    o += '<g clip-path="' + url('ct') + '">' + tsh + '<g opacity=".35">' + tsd.replace(/fill="#[0-9a-f]+"/g, 'fill="' + url('dots') + '"') + '</g>';
    // skin highlights (left/front-lit planes)
    o += path(smooth([[112, 356], [156, 348], [192, 356], [196, 380], [176, 404], [140, 410], [110, 392]], true), SKL);
    o += path(smooth([[126, 360], [158, 354], [180, 360], [176, 374], [150, 378], [128, 372]], true), SKH);
    o += path(smooth([[176, 300], [196, 306], [204, 328], [188, 322]], true), SKL);
    o += path(smooth([[110, 336], [150, 332], [190, 336], [150, 340]], true), SKL);
    o += path(smooth([[236, 348], [262, 344], [286, 352], [268, 366], [244, 364]], true), '#8a4d72');
    // backlight catching the far trapezius
    o += path(band([[268, 272, 0], [284, 302, 3], [318, 318, 3.6], [372, 334, 3], [420, 350, 0]], 2, 0, 1), RIM, ' opacity=".8"');
    o += '</g>';
    // anatomy ink: sternocleidomastoids, collarbones, pecs, sternum
    o += path(rib([[178, 286, 0.4], [188, 308, 1.8], [205, 338, 0.4]], 2), INK);
    o += path(rib([[254, 270, 0.4], [240, 304, 2], [219, 338, 0.4]], 2), INK);
    o += path(rib([[198, 342, 0.4], [160, 343, 2.2], [118, 349, 1.6], [84, 353, 0.3]], 2), INK);
    o += path(rib([[226, 340, 0.4], [262, 337, 2.2], [300, 341, 1.4], [322, 347, 0.3]], 2), INK);
    o += path(rib([[210, 360, 0.4], [208, 400, 2.2], [206, 450, 1.8], [204, 490, 0.4]], 2), INK);
    o += path(rib([[200, 466, 0.4], [150, 483, 2.8], [96, 477, 2.2], [56, 460, 0.4]], 2), INK);
    o += path(rib([[216, 470, 0.4], [258, 483, 2.8], [300, 475, 1.8], [326, 458, 0.3]], 2), INK);
    o += path(rib([[150, 392, 0.2], [170, 400, 1], [188, 398, 0.2]], 2), INK, ' opacity=".5"');

    /* ================= right deltoid with the dragon-scale tattoo ================= */
    var deltD = smooth([[294, 318], [342, 314], [392, 326], [424, 352, 0], [432, 500, 0], [392, 492], [356, 452], [328, 406], [306, 360]], true);
    defs += '<clipPath id="' + id('cd') + '"><path d="' + deltD + '"/></clipPath>';
    o += inked(deltD, SK, 1.6);
    // scales as one pattern tile: rows overlap like fish scales, each with a gradient and a glint
    var S = function (x, y) { return 'M' + (x - 9) + ',' + (y - 11) + 'v11a9,9 0 0 0 18,0v-11Z'; };
    var sa = ' fill="' + url('sgr') + '" stroke="#3a1206" stroke-width="1.5"/>';
    defs += '<linearGradient id="' + id('sgr') + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".2" stop-color="#a83c08"/><stop offset=".6" stop-color="#f07818"/><stop offset="1" stop-color="#ffab3d"/></linearGradient>';
    defs += '<pattern id="' + id('sc') + '" x="281" y="307" width="18" height="19" patternUnits="userSpaceOnUse"><rect width="18" height="19" fill="#3a1206"/>' +
      '<path d="' + S(0, 28.5) + S(18, 28.5) + '"' + sa + '<path d="' + S(9, 19) + '"' + sa + '<path d="' + S(0, 9.5) + S(18, 9.5) + '"' + sa + '<path d="' + S(9, 0) + '"' + sa +
      '<path d="M3.5,1.5a6,6 0 0 0 5,5M12.5,11a6,6 0 0 0 5,5" fill="none" stroke="#ffd595" stroke-width="1.3" stroke-linecap="round"/></pattern>';
    o += '<g clip-path="' + url('cd') + '"><path d="M280,300H440V520H280Z" fill="' + url('sc') + '"/>' +
      path(smooth([[296, 372], [326, 384], [352, 420], [384, 462], [432, 480, 0], [432, 520, 0], [296, 520, 0]], true), '#3b1452', ' opacity=".62"') +
      path(smooth([[296, 318, 0], [312, 322], [322, 352], [340, 400], [366, 448], [392, 488], [360, 470], [330, 420], [308, 372], [296, 340]], true), '#3b1452', ' opacity=".5"') +
      path(smooth([[330, 330], [372, 330], [408, 346], [420, 366], [384, 350], [348, 344]], true), '#ffe2b0', ' opacity=".35"') +
      path(band([[294, 318, 0], [342, 314, 4], [392, 326, 5], [424, 352, 0]], 2, -2, 1), RIM, ' opacity=".9"') + '</g>';
    o += path(rib([[300, 330, 0.3], [312, 370, 2], [332, 412, 2.4], [360, 452, 1.4], [384, 480, 0.2]], 2), INK);

    /* ================= fur over the left shoulder ================= */
    prec = 1;
    var furL = smooth([[-24, 296, 0], [30, 286], [86, 292], [130, 304], [160, 326], [158, 352], [134, 372], [112, 404], [96, 450], [86, 520], [80, 600, 0], [-24, 600, 0]], true);
    o += inked(furL, FUR, 1.4);
    var furId = lastId;
    r = seeded(47);
    for (k = 0; k < 28; k++) {
      var fx = -14 + r() * 165, fy = 296 + r() * 200;
      if (fx > 150 - (fy - 300) * 0.4) continue;
      tuft(fx, fy, Math.PI / 2 + 0.25 + (r() - 0.5) * 0.9, 24 + r() * 26, 6 + r() * 4, k % 4 ? FUR2 : (k % 8 ? FUR3 : FUR));
      if (k % 3 === 0) tuft(fx + 2, fy + 4, Math.PI / 2 + 0.25 + (r() - 0.5) * 0.9, 12 + r() * 10, 2 + r(), FUR4);
    }
    // shaggy top/edge silhouette
    var edge = [[0, 292], [24, 286], [48, 286], [72, 290], [96, 296], [118, 304], [138, 316], [154, 330], [156, 350], [140, 366], [124, 384], [112, 408], [102, 436], [94, 466]];
    edge.forEach(function (p, j) {
      var ang = j < 6 ? -Math.PI / 2 - 0.9 + j * 0.12 : -0.1 + (j - 6) * 0.2;
      tuft(p[0], p[1] + 8, ang + (r() - 0.5) * 0.4, 20 + r() * 12, 7 + r() * 2, j % 2 ? FUR2 : FUR3);
    });
    edge.forEach(function (p, j) {
      var ang = j < 6 ? -Math.PI / 2 - 0.8 + j * 0.12 : 0 + (j - 6) * 0.2;
      tuft(p[0] + 3, p[1] + 6, ang + (r() - 0.5) * 0.4, 12 + r() * 8, 1.8 + r(), FUR4);
    });
    o += ft;
    prec = 10;
    // rim light of the thunder on the shoulders and the cloak
    o += LIT + '<use href="#' + furId + '" fill="#c4b5fd" opacity=".2"/><g clip-path="' + url('cd') + '">' + path(band([[294, 318, 0], [342, 314, 4], [392, 326, 5], [424, 352, 0]], 2, -2, 1), '#fff', ' opacity=".8"') + '</g>' +
      '<g clip-path="' + url('ct') + '">' + path(band([[268, 272, 0], [284, 302, 3.5], [318, 318, 4.2], [372, 334, 3.5], [420, 350, 0]], 2, 0, 1), '#fff', ' opacity=".8"') +
'</g></g>';
    o += '</g>';
    o += '</g><g transform="translate(33,29) scale(.78) rotate(-6,207,300)">';
    /* ================= horns ================= */
    var litH = '';
    function horn(pts, inner, rings) {
      var d = rib(pts, 2), s = '', c = cr(pts, 4), N = normals(c);
      defs += '<clipPath id="' + id('ch' + inner) + '"><path d="' + d + '"/></clipPath>';
      s += inked(d, HN, 1.6, inner > 0 ? 2.4 : -2.4, 2.4);
      var g = '', rd = '', rl = '';
      prec = 1;
      // cel shadow along the outer side, a deeper sliver at the edge, glossy streak + rim on the inner side
      g += path(band(pts, 2, -inner * 1.3, -inner * 0.3), HNS);
      g += path(band(pts, 2, -inner * 1.3, -inner * 0.72), HND);
      g += path(band(pts, 2, inner * 0.22, inner * 0.5), '#fffaf0');
      g += path(band(pts, 2, inner * 0.82, inner * 1.2), RIM, ' opacity=".85"');
      // carved ridges, tight near the base and opening towards the tip; each with a lit lip
      prec = 10;
      rings.forEach(function (ix, j) {
        var p = c[ix], q = N[ix], w = p[2] * 1.05, bow = 9 - j * 0.5, e = w * inner;
        rd += 'M' + P(p[0] - q[0] * w, p[1] - q[1] * w) + 'Q' + P(p[0] + q[2] * bow, p[1] + q[3] * bow) + ' ' + P(p[0] + q[0] * w, p[1] + q[1] * w);
        rl += 'M' + P(p[0] + q[2] * (bow * 0.5 + 2.2) + q[0] * e * 0.1, p[1] + q[3] * (bow * 0.5 + 2.2) + q[1] * e * 0.1) + 'Q' + P(p[0] + q[2] * (bow * 0.4 + 2.2) + q[0] * e * 0.55, p[1] + q[3] * (bow * 0.4 + 2.2) + q[1] * e * 0.55) + ' ' + P(p[0] + q[2] * 2.4 + q[0] * e * 0.9, p[1] + q[3] * 2.4 + q[1] * e * 0.9);
      });
      g += '<path d="' + rd + '" fill="none" stroke="' + HND + '" stroke-width="2" stroke-linecap="round"/><path d="' + rl + '" fill="none" stroke="#fffaf0" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>';
      prec = 1;
      litH += '<g clip-path="' + url('ch' + inner) + '">' + path(band(pts, 2, inner * 0.5, inner * 1.3), '#fff', ' opacity=".8"') + path(band(pts, 2, -inner * 1.3, -inner * 0.9), '#e9d5ff') + '</g>';
      prec = 10;
      return s + '<g clip-path="' + url('ch' + inner) + '">' + g + '</g>';
    }
    var hornLpts = [[168, 150, 21], [132, 160, 22], [98, 150, 20], [73, 126, 17], [59, 96, 13.5], [54, 64, 10], [57, 34, 6], [68, 6, 0]];
    var hornRpts = [[246, 144, 23], [290, 153, 24], [328, 141, 21.5], [353, 114, 18], [366, 82, 14], [368, 50, 10], [361, 22, 6], [348, 2, 0]];
    o += '<g class="kd-hm">';
    o += horn(hornLpts, 1, [2, 3, 4, 5, 6, 7, 9, 11]);
    o += horn(hornRpts, -1, [2, 3, 4, 5, 6, 7, 9, 11]);
    o += LIT + litH + '</g>';
    // glossy glints on the horns
    o += '<g filter="' + url('sg') + '" opacity=".9"><path d="' + rib([[96, 120, 0], [76, 96, 2.6], [69, 62, 0]], 3) + '" fill="#fff"/><path d="' + rib([[330, 118, 0], [347, 92, 2.8], [351, 58, 0]], 3) + '" fill="#fff"/></g>';
    o += '<path d="' + rib([[62, 60, 0], [61, 44, 1.2], [65, 28, 0]], 3) + rib([[358, 50, 0], [357, 36, 1.2], [353, 22, 0]], 3) + '" fill="#fff" opacity=".9"/>';

    /* ================= dreadlocks sticking up between the horns ================= */
    r = seeded(61);
    prec = 1;
    var drG = ['', ''], drL = ['', ''], drC = ['', ''];
    var dreads = [[172, 112, -0.25, 70, 7], [186, 104, -0.05, 86, 8], [202, 100, 0.15, 94, 8.5], [220, 102, 0.35, 92, 8], [238, 106, 0.6, 84, 7.5], [254, 112, 0.85, 70, 7], [196, 108, -0.45, 60, 6]];
    dreads.forEach(function (q, j) {
      var x = q[0], y = q[1], a = -Math.PI / 2 + q[2], L = q[3], w = q[4], pts = [], e = j % 2;
      for (var s2 = 0; s2 <= 5; s2++) {
        var t2 = s2 / 5, aa = a + t2 * t2 * 0.9;
        x += Math.cos(aa) * L / 5; y += Math.sin(aa) * L / 5;
        pts.push([x, y, s2 === 5 ? 0 : w * (1 - t2 * 0.55)]);
      }
      pts.unshift([q[0], q[1] + 6, w]);
      drG[e] += inked(rib(pts, 1), e ? HR2 : HR, 1.2, 1.2, 1.6) + path(band(pts, 1, -0.7, -0.25), j % 3 ? HRH : HRH2, ' opacity=".9"');
      drL[e] += path(band(pts, 1, -1, -0.3), '#efe2ff');
      var c = cr(pts, 3), N = normals(c);
      for (var m = 2; m < c.length - 3; m += 3) {
        var p = c[m], nn = N[m], ww = p[2];
        drC[e] += 'M' + P(p[0] - nn[0] * ww, p[1] - nn[1] * ww) + 'Q' + P(p[0] + nn[2] * 3, p[1] + nn[3] * 3) + ' ' + P(p[0] + nn[0] * ww, p[1] + nn[1] * ww);
      }
    });
    prec = 10;
    [0, 1].forEach(function (e) {
      o += '<g class="kd-dr' + (e ? ' kd-dr2' : '') + '">' + drG[e] + '<path d="' + drC[e] + '" fill="none" stroke="' + INK + '" stroke-width="1.3" opacity=".8"/>' + LIT + drL[e] + '</g></g>';
    });

    /* ================= ear (near side) ================= */
    var earD = smooth([[266, 196], [280, 186], [290, 198], [287, 222], [276, 240], [264, 236]], true);
    o += inked(earD, SK, 1.4);
    o += path(smooth([[272, 202], [282, 198], [282, 220], [274, 232], [270, 222]], true), SH);
    o += path(rib([[276, 200, 0.3], [281, 212, 1.3], [276, 226, 0.3]], 2), INK);
    /* ================= head: long face, heavy brow, massive jaw ================= */
    var headD = smooth([[160, 120], [151, 148], [149, 176], [153, 192], [147, 210], [150, 236], [155, 260], [163, 281], [178, 297], [198, 304], [220, 301], [242, 290], [259, 270], [268, 244], [273, 212], [274, 180], [270, 150], [262, 122], [238, 106], [200, 102], [174, 108]], true);
    defs += '<clipPath id="' + id('chd') + '"><path d="' + headD + '"/></clipPath>';
    o += inked(headD, SK, 1.6, 2.2, 2.4);
    var headId = lastId;
    var hs = '';
    hs += path(smooth([[242, 100, 0], [292, 100, 0], [292, 330, 0], [210, 330, 0], [232, 297], [250, 277], [255, 250], [244, 230, 0], [255, 212], [258, 186], [247, 160], [242, 132]], true), SH);
    hs += path(smooth([[140, 262], [166, 287], [190, 301], [218, 301], [244, 289], [262, 268], [282, 266, 0], [282, 330, 0], [130, 330, 0]], true), SH);
    var hsd = hs;
    hs += path(smooth([[146, 112, 0], [280, 112, 0], [280, 142], [244, 134], [210, 140], [178, 134], [152, 148]], true), SH);
    hs += path(smooth([[146, 183], [170, 185], [188, 192], [200, 190], [222, 183], [254, 176], [258, 205], [234, 214], [208, 210], [196, 215], [182, 211], [162, 216], [146, 210]], true), DSH);
    hs += path(smooth([[192, 198], [200, 214], [206, 232], [200, 244], [186, 246], [178, 241], [194, 234]], true), SH);
    hs += path(smooth([[150, 232], [160, 237], [167, 250], [163, 270], [156, 263], [151, 247]], true), SH);
    hs += path(smooth([[174, 284], [200, 288], [226, 281], [232, 296], [200, 304], [172, 296]], true), DSH);
    o += '<g clip-path="' + url('chd') + '">' + hs + '<g opacity=".3">' + hsd.replace(/fill="#[0-9a-f]+"/g, 'fill="' + url('dots') + '"') + '</g>';
    // lit planes + sharp highlights: forehead, brow ridge, cheekbone, nose, jaw
    o += path(smooth([[162, 150], [196, 143], [228, 150], [208, 160], [176, 162]], true), SKL);
    o += path(smooth([[174, 151], [192, 147], [206, 152], [190, 156]], true), SKH);
    o += path(smooth([[154, 168], [168, 170], [180, 176], [166, 176]], true), SKL);
    o += path(smooth([[150, 215], [170, 217], [187, 224], [170, 232], [155, 230]], true), SKL);
    o += path(smooth([[154, 219], [166, 220], [175, 224], [162, 226]], true), SKH);
    o += path(rib([[186, 206, 0], [185.5, 218, 1.7], [185, 229, 0]], 2), SKH);
    o += path(smooth([[184, 233], [192, 231], [196, 237], [188, 240]], true), SKL);
    o += path(smooth([[155, 264], [163, 271], [170, 286], [161, 279]], true), SKL);
    o += path(smooth([[212, 216], [232, 217], [246, 224], [228, 228]], true), '#8a4d72');
    // backlight rim on the shadow-side contour
    o += path(band([[268, 132, 0], [274, 170, 2.4], [273, 212, 2.8], [268, 244, 2.4], [259, 270, 2], [242, 290, 0]], 3, 0, 1), RIM, ' opacity=".9" transform="translate(-2,0)"');
    // rim light of the thunder on the face (under the hair)
    o += LIT + '<use href="#' + headId + '" fill="#d8b4fe" opacity=".16"/>' +
      path(band([[160, 120, 0], [151, 148, 4], [149, 176, 4.5], [153, 192, 4], [147, 210, 5], [150, 236, 4.5], [155, 260, 4], [163, 281, 3.5], [178, 297, 0]], 1, -1, 0), '#f3e8ff', ' opacity=".6"') +
      path(band([[268, 132, 0], [274, 170, 5], [273, 212, 6], [268, 244, 5.5], [259, 270, 4.5], [242, 290, 0]], 1, 0, 1), '#f3e8ff', ' opacity=".75"') +
      path(rib([[189, 202, 0], [191.5, 216, 1.8], [195, 229, 0]], 2), '#fff', ' opacity=".8"') +
'</g>';
    o += '</g>';
    // hairline cap, sideburns, spiky tufts lapping over the horn bases
    o += path(smooth([[146, 166], [144, 128], [160, 104], [200, 92], [246, 96], [272, 116], [280, 150], [278, 196], [268, 186], [264, 150], [252, 132], [232, 124], [212, 132, 0], [196, 122], [176, 126], [160, 142], [154, 170]], true), HR);
    o += path(rib([[150, 124, 0], [176, 108, 2], [214, 100, 2.2], [250, 108, 1.6], [270, 126, 0]], 2), HRH, ' opacity=".8"');
    [[[184, 118, 6], [172, 136, 4.5], [166, 158, 0]], [[214, 118, 6], [222, 136, 4], [220, 154, 0]], [[244, 116, 6], [256, 136, 4.5], [262, 162, 0]], [[156, 140, 6], [150, 166, 4], [152, 190, 0]],
      [[158, 126, 7], [144, 138, 5], [130, 154, 0]], [[156, 150, 6], [142, 160, 4.5], [132, 177, 0]], [[264, 122, 7], [278, 132, 5], [293, 147, 0]], [[272, 150, 6], [286, 157, 4], [297, 171, 0]]].forEach(function (b, j) {
      o += inked(rib(b, 2), HR, 1, 1, 1.4) + path(band(b, 2, -0.6, -0.1), j % 2 ? HRH : HRH2, ' opacity=".85"');
    });
    // forehead creases (furrowed, angry)
    o += path(rib([[166, 150, 0.2], [190, 143, 1], [222, 147, 0.2]], 2), INK, ' opacity=".55"');
    // woozy brows: one cocked up, the other drooping
    o += path(rib([[147, 181, 1.5], [160, 171, 6], [177, 170, 7.5], [193, 183, 3]], 2), INK);
    o += path(rib([[199, 186, 3], [212, 177, 8.5], [232, 175, 9], [253, 179, 6], [269, 191, 0]], 2), INK);
    o += path(rib([[158, 170, 0], [170, 167, 1], [182, 171, 0]], 2), HRH, ' opacity=".7"');
    o += path(rib([[212, 174, 0], [232, 171, 1.1], [252, 175, 0]], 2), HRH, ' opacity=".7"');
    // sake flush: cheeks, bridge and tip of the nose, with manga hatch marks
    o += '<g clip-path="' + url('chd') + '"><ellipse cx="164" cy="225" rx="18" ry="9.5" fill="#f2466c" opacity=".62"/><ellipse cx="233" cy="223" rx="21" ry="10.5" fill="#dc3a68" opacity=".62"/><ellipse cx="191" cy="238" rx="13" ry="8.5" fill="#f2466c" opacity=".7"/><ellipse cx="196" cy="217" rx="11" ry="6" fill="#f2466c" opacity=".3"/></g>';
    o += '<path d="M153,229l5,-9M160,231l5,-9M167,231l5,-9M222,229l5,-9M230,230l5,-9M238,229l5,-9" stroke="#a3123a" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".9"/>';
    // eyes: heavy-lidded, glassy, a little cross-eyed, still glowing
    var eyeL = smooth([[157, 201, 0], [171, 199.5], [186, 202.5, 0], [177, 208], [163, 207.5]], true);
    var eyeR = smooth([[202, 203.5, 0], [222, 200], [246, 199.5, 0], [236, 208], [214, 209.5]], true);
    o += '<g class="kd-eye" filter="' + url('eg') + '" opacity=".75"><ellipse cx="171" cy="204" rx="14" ry="5.5" fill="#fbbf24"/><ellipse cx="224" cy="205" rx="19" ry="6" fill="#fbbf24"/></g>';
    o += path(eyeL, '#ffd84a') + path(eyeR, '#ffd84a');
    o += '<ellipse cx="172" cy="204.4" rx="6" ry="2.2" fill="#fffbe0"/><ellipse cx="224" cy="205" rx="8.5" ry="2.4" fill="#fffbe0"/>';
    o += '<ellipse cx="178" cy="204.2" rx="2" ry="2.6" fill="#3a1200"/><ellipse cx="213.5" cy="205" rx="2.2" ry="2.8" fill="#3a1200"/>';
    o += path(smooth([[154, 202, 0], [168, 190.5], [189, 200, 0], [186, 203.5], [171, 201.5], [157, 202.5]], true), SH);
    o += path(smooth([[199, 203, 0], [222, 190], [250, 197, 0], [246, 201.5], [222, 202], [202, 204.5]], true), '#5a2f62');
    o += path(rib([[153, 202.5, 0], [171, 200.4, 2.9], [189, 204, 0.6]], 2), INK) + path(rib([[198, 205.3, 0.6], [222, 200.8, 3.3], [250, 201, 0]], 2), INK);
    o += path(rib([[157, 195, 0], [170, 190.5, 0.9], [186, 196, 0]], 2), INK, ' opacity=".7"') + path(rib([[204, 196, 0], [224, 189.5, 1], [246, 193.5, 0]], 2), INK, ' opacity=".7"');
    o += path(rib([[160, 207.5, 0], [171, 209.5, 1.1], [183, 205.5, 0]], 2), INK) + path(rib([[205, 208.5, 0], [222, 210.5, 1.2], [241, 205, 0]], 2), INK);
    o += path(rib([[158, 213.5, 0], [171, 216.5, 1], [184, 213, 0]], 2), INK, ' opacity=".6"') + path(rib([[206, 216, 0], [226, 217.5, 1.1], [245, 211, 0]], 2), INK, ' opacity=".6"');
    // nose: broad, with flared nostrils
    o += path(rib([[192, 199, 0.3], [197, 215, 1.7], [203, 231, 1.3]], 2), INK);
    o += path(smooth([[176, 236], [182, 232], [190, 238], [196, 240], [204, 234], [207, 240], [198, 246.5], [186, 246.5], [176, 242]], true), INK);
    o += path(rib([[171, 237, 0.3], [177, 229.5, 1.8], [186, 230, 0.3]], 2), INK);
    o += path(rib([[205, 230, 0.3], [211.5, 237, 1.6], [207, 245, 0.3]], 2), INK);
    // laugh lines
    o += path(rib([[178, 232, 0.4], [164, 243, 2.2], [155, 256, 0.4]], 2), INK);
    o += path(rib([[209, 232, 0.4], [234, 238, 2.4], [251, 243, 1.6], [255, 235, 0.2]], 2), INK);
    // one fat tear of drunk-crying down the lit cheek, another welling up
    o += '<g class="kd-tear"><path d="' + rib([[160, 208, 0.8], [155.5, 221, 2.2], [154.5, 236, 2.6], [156, 247, 1.6]], 2) + 'M156.5,246q-6.5,9.5 0,13.5q6.5,-4 0,-13.5Z" fill="#bfe9ff" stroke="' + INK + '" stroke-width=".8"/>' +
      '<path d="' + rib([[157.5, 214, 0], [154.6, 226, 0.8], [154.4, 238, 0]], 2) + '" fill="#fff"/><circle cx="155" cy="254" r="1.3" fill="#fff"/></g>';
    o += '<circle cx="247.5" cy="203.5" r="2.8" fill="#bfe9ff" stroke="' + INK + '" stroke-width=".7"/><circle cx="246.8" cy="202.6" r=".9" fill="#fff"/>';

    /* ================= mouth: a huge lopsided laugh ================= */
    var mouthD = smooth([[158, 256, 0], [176, 253], [200, 255], [226, 251], [247, 244, 0], [247, 262], [239, 282], [222, 295], [200, 299], [180, 294], [165, 280]], true);
    defs += '<clipPath id="' + id('cm') + '"><path d="' + mouthD + '"/></clipPath>';
    o += inked(mouthD, '#3a0a1c', 1.8, 1.2, 1.8);
    var tm = '';
    tm += path('M150,236H255V257L247,259L226,264.5L200,267.5L176,265.5L158,264.5L150,262Z', '#f7efe0');
    tm += '<path d="M176,254V265.5M188,255V266.5M200,255V267.5M212,254V266.5M224,252V264.5M236,249V262" stroke="' + INK + '" stroke-width="1.1" opacity=".8"/>';
    tm += path(smooth([[172, 300], [182, 281], [200, 276], [219, 279], [232, 294], [214, 306], [190, 306]], true), '#e0566e');
    tm += path(rib([[202, 279, 0.3], [203, 288, 1.1], [203, 298, 0.3]], 2), '#8a2346');
    tm += '<ellipse cx="191" cy="283.5" rx="6" ry="2.4" fill="#ffb3c0" opacity=".85"/>';
    tm += '<path d="M162.5,258.5L172,257L171,268L167.5,279L164.5,268ZM229,254L239.5,251L238,263L234.5,274.5L231,264ZM170.5,291L178,293L177.5,284L175,275.5L172,284ZM226,291L233.5,288L232,280L229,271.5L226.5,281Z" fill="#fffaf0" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>';
    tm += path('M216,236H255V302H216Z', '#7c62a0', ' opacity=".32"');
    tm += path('M164,259.5L170,258.5L169.5,265ZM178,256L187,256.5L187,259.5L179,260Z', '#fff');
    o += '<g clip-path="' + url('cm') + '">' + tm + '</g>';
    o += path(rib([[155, 257, 0.4], [176, 251.5, 2.8], [200, 253.5, 2.4], [226, 249.5, 2.8], [250, 242, 0.4]], 2), INK);
    o += path(rib([[166, 283, 0.3], [181, 296, 2.2], [200, 301, 2.4], [222, 297, 2.2], [241, 281, 0.3]], 2), INK);
    // sake dribbling from the corner of the mouth
    o += '<path d="M244.5,262q-2.5,13 .5,24q3.4,5 4.4,-1q-2.2,-11 -.9,-22Z" fill="#dff4ff" stroke="' + INK + '" stroke-width=".8"/>';

    /* ================= beard + mustache ================= */
    o += '<g transform="translate(0,9)">';
    var beardD = smooth([[172, 288], [188, 294], [204, 296], [222, 291], [238, 281], [241, 300], [236, 318], [230, 331, 0], [226, 322], [220, 346, 0], [213, 334], [206, 362, 0], [199, 340], [191, 354, 0], [187, 334], [179, 327, 0], [178, 312], [171, 300]], true);
    o += inked(beardD, HR, 1.2, 1.4, 2);
    o += path(rib([[204, 298, 0], [211, 318, 1.5], [207, 350, 0]], 2), HRH, ' opacity=".9"');
    o += path(rib([[186, 298, 0], [189, 320, 1.2], [191, 344, 0]], 2), HRH2, ' opacity=".75"');
    o += path(rib([[222, 294, 0], [224, 310, 1.2], [220, 336, 0]], 2), HRH, ' opacity=".8"');
    o += path(rib([[176, 294, 0], [178, 306, 0.9], [180, 320, 0]], 2), HRH, ' opacity=".6"');
    o += path(rib([[234, 290, 0], [235, 304, 1], [231, 322, 0]], 2), '#3b2a78', ' opacity=".9"');
    o += '</g>';
    var mL = [[182, 242, 2.2], [168, 245, 4], [156, 253, 4.6], [146, 275, 4.6], [140, 312, 4.3], [138, 356, 3.8], [132, 400, 3.2], [122, 444, 2.6], [118, 486, 1.8], [124, 524, 0.4]];
    var mR = [[204, 243, 2.2], [222, 244, 4], [240, 248, 4.6], [254, 264, 4.6], [258, 298, 4.3], [252, 338, 3.8], [244, 378, 3.2], [240, 420, 2.6], [246, 458, 1.8], [256, 490, 0.4]];
    o += '<g class="kd-st">' + inked(rib(mL, 2), HR, 1, 1.2, 1.6) + path(band(mL, 2, -0.75, -0.15), HRH, ' opacity=".9"') + '</g>' +
      '<g class="kd-st kd-st2">' + inked(rib(mR, 2), HR, 1, 1.2, 1.6) + path(band(mR, 2, -0.75, -0.15), HRH2, ' opacity=".8"') + '</g></g>';
    o += '</g>';

    /* ================= the forearm, the spiked wristband and the giant sake gourd ================= */
    var gd = '';
    var faP = [[432, 352, 31], [392, 346, 28], [352, 335, 23], [326, 329, 19]];
    gd += inked(rib(faP, 2), SK, 1.6);
    defs += '<clipPath id="' + id('cfa') + '"><use href="#' + lastId + '"/></clipPath>';
    gd += '<g clip-path="' + url('cfa') + '">' + path(band(faP, 2, -1.3, -0.15), SH) + path(band(faP, 2, -1.3, -0.7), DSH) + path(band(faP, 2, 0.3, 0.72), SKL) + path(band(faP, 2, 0.85, 1.3), RIM, ' opacity=".7"') + '</g>';
    // wristband with ivory spikes
    var wbP = [[384, 344.5, 28.5], [360, 338, 25.5]];
    gd += '<path d="M363,311l7,-15l6,17ZM378,315l8,-15l5,18ZM361,362l4,15l8,-12ZM376,368l5,15l8,-12Z" fill="' + HN + '" stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round"/>';
    gd += inked(rib(wbP, 1), '#2d2640', 1.4);
    gd += path(band(wbP, 1, 0.45, 0.8), '#8f80bf');
    gd += '<path d="M372,330l6,-9l5,10l-5,9ZM370,351l5,-8l5,9l-5,8Z" fill="' + HN + '" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>';
    // the gourd (hyotan), drawn upright around its waist and tilted towards the mouth
    defs += '<linearGradient id="' + id('gg') + '" x1="-50" y1="0" x2="50" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff5a4d"/><stop offset=".45" stop-color="#e11d2e"/><stop offset="1" stop-color="#8f1030"/></linearGradient>';
    var gD = smooth([[-7, -84, 0], [7, -84, 0], [8, -64], [24, -53], [30, -35], [21, -15], [10, -2], [22, 11], [42, 30], [49, 58], [41, 88], [21, 105], [0, 108], [-21, 105], [-41, 88], [-49, 58], [-42, 30], [-22, 11], [-10, -2], [-21, -15], [-30, -35], [-24, -53], [-8, -64]], true);
    defs += '<clipPath id="' + id('cg') + '"><path d="' + gD + '"/></clipPath>';
    var g = inked(gD, url('gg'), 1.8, 2.4, 2.6);
    g += '<g clip-path="' + url('cg') + '">' +
      path(smooth([[30, -70], [60, -40], [60, 120], [-10, 120], [14, 100], [30, 76], [34, 46], [22, 20], [8, 6], [16, -14], [20, -36], [10, -56]], true), '#6b0d2c', ' opacity=".7"') +
      path(smooth([[-36, 36], [-28, 28], [-34, 56], [-28, 82], [-36, 78], [-41, 56]], true), '#ffb0a0') +
      path(smooth([[-22, -44], [-15, -48], [-21, -32], [-16, -20], [-23, -24], [-25, -34]], true), '#ffb0a0') +
      path(rib([[-31, 34, 0], [-37, 56, 2], [-33, 76, 0]], 2), '#fff') + path(rib([[-19, -43, 0], [-22.5, -34, 1.3], [-20, -25, 0]], 2), '#fff') +
      '<ellipse cx="-14" cy="94" rx="12" ry="3" fill="#ff8a7a" opacity=".5"/>' +
      path(band([[49, 20, 0], [49, 58, 4], [41, 88, 4], [21, 105, 0]], 2, 0, 1.2), RIM, ' opacity=".75"') +
      // gold crest on the belly
      '<circle cx="-2" cy="58" r="19" fill="none" stroke="#7a3d06" stroke-width="6.5"/><circle cx="-2" cy="58" r="19" fill="none" stroke="#f5c542" stroke-width="4"/>' +
      '<path d="M-2,45l9,13l-9,13l-9,-13Z" fill="#f5c542" stroke="#7a3d06" stroke-width="1.3" stroke-linejoin="round"/><path d="M-19,50a19,19 0 0 1 12,-10" fill="none" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/>' +
      // gold collar at the spout
      '<path d="M-10,-76H10V-67H-10Z" fill="#f5c542" stroke="#7a3d06" stroke-width="1.2"/><path d="M-8,-74.5H-1" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/></g>';
    g += '<ellipse cx="0" cy="-84" rx="7" ry="2.4" fill="#2a0818" stroke="' + INK + '" stroke-width="1.2"/>';
    // rope tie + tassels at the waist
    g += '<path d="M-13,-1q-14,14 -17,34M-11,2q-4,18 -14,36" fill="none" stroke="' + INK + '" stroke-width="5.5" stroke-linecap="round"/><path d="M-13,-1q-14,14 -17,34M-11,2q-4,18 -14,36" fill="none" stroke="#f5c542" stroke-width="3" stroke-linecap="round"/>';
    g += '<path d="M-33,31l6,2l1,15l-9,-2ZM-28,36l6,3l-2,15l-8,-3Z" fill="#c084fc" stroke="' + INK + '" stroke-width="1.1" stroke-linejoin="round"/>';
    g += inked(rib([[-14, -1, 5], [0, 1, 5.5], [14, -1, 5]], 2), '#f5c542', 1.2, 1, 1.4) + '<path d="M-9,-5l3,9M-2,-4.5l3,10M5,-5l3,9" stroke="#7a3d06" stroke-width="1.3" fill="none"/>';
    gd += '<g transform="translate(306,316) rotate(-38)">' + g + '</g>';
    // the hand gripping the gourd by its waist
    gd += inked(smooth([[340, 304], [324, 297], [308, 300], [302, 316], [306, 336], [322, 346], [340, 342]], true), SK, 1.5);
    gd += path(smooth([[336, 322], [320, 326], [310, 334], [322, 344], [338, 340]], true), SH);
    gd += inked(rib([[330, 303, 7], [318, 288, 6.5], [304, 279, 5.5], [297, 277, 3]], 2), SK, 1.3, 1.2, 1.6) + path(band([[330, 303, 7], [318, 288, 6.5], [304, 279, 5.5]], 2, 0.2, 0.6), SKL);
    for (k = 0; k < 4; k++) {
      var fy = 304 + k * 11, fp = [[326, fy - 1, 6], [306, fy - 2.5, 6.4], [289, fy - 0.5, 5.6], [280, fy + 4, 3.6]];
      gd += inked(rib(fp, 2), k > 1 ? '#a8623f' : SK, 1.3, 1.2, 1.6) + path(band(fp, 2, 0.2, 0.62), k > 1 ? SK : SKL) + path(rib([[310, fy - 8, 0.2], [308, fy - 2, 0.9], [310, fy + 3, 0.2]], 2), INK, ' opacity=".6"');
    }
    o += '<g class="kd-arm"><g transform="translate(0,-30)">' + gd + '</g></g>';

    /* ================= sake sloshing out in an arc ================= */
    var skP = [[254, 221, 6], [256, 205, 9], [264, 190, 7.5], [277, 181, 9], [291, 181, 5], [299, 187, 0]];
    var drop = function (x, y, s, a) { return '<path transform="translate(' + x + ',' + y + ') rotate(' + a + ') scale(' + s + ')" d="M0,-7q-6,8 0,12q6,-4 0,-12Z"/>'; };
    var dr1 = drop(306, 172, 2, 50) + drop(274, 160, 2.3, 10) + drop(243, 198, 1.5, -40) + drop(326, 200, 1.5, 70) + drop(252, 172, 1.4, -15);
    var dr2 = drop(292, 152, 1.6, 25) + drop(318, 164, 1.1, 55) + drop(236, 216, 1.3, -30) + drop(336, 184, 0.9, 60) + drop(306, 198, 1.2, 65) + drop(264, 142, 1, 0);
    o += '<g class="kd-sake">' + inked(rib(skP, 3), '#e6f6ff', 1.1, 1, 1.4) + path(band(skP, 3, -0.9, -0.3), '#9fd6ff') + path(band(skP, 3, 0.25, 0.6), '#fff') +
      '<g fill="#e8f7ff" stroke="#1d3a6e" stroke-width=".55" stroke-linejoin="round"><g class="kd-drop">' + dr1 + '</g><g class="kd-drop kd-drop2">' + dr2 + '</g></g>' +
      '<path d="M304,168l2.6,4.4M272,155l2.4,6M290,148l1.8,4.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g>';
    o += '</g>';

    /* ================= hiccup bubbles ================= */
    var bub = function (x, y, rr, c) {
      return '<g class="kd-bub ' + c + '"><circle cx="' + x + '" cy="' + y + '" r="' + rr + '" fill="#f3e8ff" fill-opacity=".22" stroke="#fff" stroke-width="1.7"/>' +
        '<path d="M' + P(x - rr * 0.6, y - rr * 0.1) + 'A' + f(rr * 0.62) + ',' + f(rr * 0.62) + ' 0 0 1 ' + P(x - rr * 0.1, y - rr * 0.6) + '" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>' +
        '<circle cx="' + f(x + rr * 0.35) + '" cy="' + f(y + rr * 0.4) + '" r="' + f(rr * 0.13) + '" fill="#fff" opacity=".8"/></g>';
    };
    o += bub(122, 232, 5.5, 'kd-b1') + bub(104, 210, 9.5, 'kd-b2') + bub(124, 186, 7, 'kd-b3') + bub(92, 168, 14, 'kd-b1') + bub(70, 204, 4.5, 'kd-b3') + bub(118, 150, 5, 'kd-b2');

    /* ================= sparks ================= */
    r = seeded(97);
    var sp1 = '', sp2 = '';
    for (k = 0; k < 12; k++) {
      var sx = 20 + r() * 360, sy = 10 + r() * 330, ss = 2 + r() * 4.5;
      if (sx > 130 && sx < 290 && sy > 90) { sx = sx < 210 ? sx - 110 : sx + 100; }
      var st = 'M' + P(sx, sy - ss * 2) + 'Q' + P(sx, sy) + ' ' + P(sx + ss * 2, sy) + 'Q' + P(sx, sy) + ' ' + P(sx, sy + ss * 2) + 'Q' + P(sx, sy) + ' ' + P(sx - ss * 2, sy) + 'Q' + P(sx, sy) + ' ' + P(sx, sy - ss * 2) + 'Z';
      if (k % 2) sp1 += st; else sp2 += st;
    }
    o += '<g filter="' + url('sg') + '" opacity=".8"><path d="' + sp1 + sp2 + '" fill="#c084fc"/></g>';
    o += '<path class="kd-spark" d="' + sp1 + '" fill="#fff"/><path class="kd-spark kd-s2" d="' + sp2 + '" fill="#f3e8ff"/>';

    return { defs: defs, body: o };
  }

  // A 4.8 s drunken sway (with a hiccup jolt), a 13 s thunder cycle (two strikes, 6.5 s apart) shared by bolts,
  // sky flash, rim light and eyes; bubbles float up and pop, droplets glint, lanterns flicker.
  var KD = '.kaido-hybrid .kd-';
  var CSS = '@media (prefers-reduced-motion: no-preference){' +
    KD + 'sway,' + KD + 'body,' + KD + 'hm,' + KD + 'dr,' + KD + 'st,' + KD + 'mane,' + KD + 'arm,' + KD + 'bub,' + KD + 'lan,' + KD + 'sake{transform-box:fill-box}' +
    KD + 'sway{transform-origin:50% 100%;animation:kdSway 4.8s ease-in-out infinite}' +
    KD + 'body{transform-origin:50% 100%;animation:kdBody 4.8s ease-in-out infinite}' +
    KD + 'hm{transform-origin:50% 90%;animation:kdHead 4.8s ease-in-out -.35s infinite}' +
    KD + 'dr{transform-origin:50% 100%;animation:kdSwA 4.8s ease-in-out -1.1s infinite}' +
    KD + 'dr2{animation-name:kdSwB;animation-delay:-.5s}' +
    KD + 'st{transform-origin:85% 0;animation:kdSwB 4.8s ease-in-out -.8s infinite}' +
    KD + 'st2{transform-origin:0 0;animation-name:kdSwA;animation-delay:-.4s}' +
    KD + 'mane{transform-origin:0 30%;animation:kdSwM 4.8s ease-in-out -.6s infinite}' +
    KD + 'arm{transform-origin:100% 40%;animation:kdArm 4.8s ease-in-out -.2s infinite}' +
    KD + 'sake{transform-origin:100% 100%;animation:kdSake 4.8s ease-in-out -.2s infinite}' +
    KD + 'drop{animation:kdTw 1.6s ease-in-out infinite}' +
    KD + 'drop2{animation-delay:.8s}' +
    KD + 'tear{animation:kdTear 4.8s ease-in-out infinite}' +
    KD + 'bub{transform-origin:50% 50%;animation:kdBub 4.8s ease-out infinite}' +
    KD + 'b2{animation-delay:-1.6s}' + KD + 'b3{animation-delay:-3.2s}' +
    KD + 'lan{transform-origin:50% 0;animation:kdLan 5.6s ease-in-out infinite}' +
    KD + 'lan2{animation-delay:-2.3s}' +
    KD + 'lg{animation:kdLg 3.1s ease-in-out infinite}' +
    KD + 'ba{animation:kdA 13s linear infinite}' +
    KD + 'bb{animation:kdB 13s linear infinite}' +
    KD + 'fl{animation:kdFl 13s linear infinite}' +
    KD + 'lit{animation:kdLit 13s linear infinite}' +
    KD + 'burst{animation:kdBurst 13s linear infinite}' +
    KD + 'eye{animation:kdEye 13s linear infinite}' +
    KD + 'spark{animation:kdTw 2.6s ease-in-out infinite}' +
    KD + 's2{animation-delay:1.3s}' +
    '@keyframes kdSway{0%,100%{transform:rotate(-1.3deg)}50%{transform:rotate(1.5deg)}}' +
    '@keyframes kdBody{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-1.2px) scale(1.007)}}' +
    '@keyframes kdHead{0%,100%{transform:rotate(-1.4deg) translateY(0)}50%{transform:rotate(1.8deg) translateY(-1px)}68%{transform:rotate(1deg) translateY(0)}70.5%{transform:rotate(.8deg) translateY(-5px)}74%{transform:rotate(.4deg) translateY(.6px)}}' +
    '@keyframes kdArm{0%,100%{transform:rotate(1.6deg)}50%{transform:rotate(-2.6deg)}}' +
    '@keyframes kdSake{0%,100%{transform:rotate(1.6deg) scale(.96)}50%{transform:rotate(-2.6deg) scale(1.04)}}' +
    '@keyframes kdTear{0%,100%{opacity:1}80%{opacity:1}90%{opacity:.55}}' +
    '@keyframes kdBub{0%{transform:translateY(16px) scale(.3);opacity:0}15%{opacity:1}80%{transform:translateY(-14px) scale(1);opacity:1}90%{transform:translateY(-18px) scale(1.25);opacity:.7}100%{transform:translateY(-19px) scale(1.4);opacity:0}}' +
    '@keyframes kdLan{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}' +
    '@keyframes kdLg{0%,100%{opacity:1}45%{opacity:.7}60%{opacity:.95}75%{opacity:.75}}' +
    '@keyframes kdSwA{0%,100%{transform:rotate(0deg)}50%{transform:rotate(1.4deg)}}' +
    '@keyframes kdSwB{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-1.6deg)}}' +
    '@keyframes kdSwM{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-.7deg)}}' +
    '@keyframes kdA{0%,7.4%{opacity:0}7.7%{opacity:1}8.3%{opacity:.15}9%{opacity:1}10.2%{opacity:.85}13.5%,100%{opacity:0}}' +
    '@keyframes kdB{0%,57.4%{opacity:0}57.7%{opacity:1}58.3%{opacity:.2}59%{opacity:1}60%{opacity:.8}63%,100%{opacity:0}}' +
    '@keyframes kdFl{0%,7.4%{opacity:0}7.7%{opacity:.55}8.3%{opacity:.12}9%{opacity:.5}14.5%,57.4%{opacity:0}57.7%{opacity:.45}58.3%{opacity:.1}59%{opacity:.42}64%,100%{opacity:0}}' +
    '@keyframes kdLit{0%,7.4%{opacity:0}7.7%{opacity:1}8.3%{opacity:.3}9%{opacity:1}15%,57.4%{opacity:0}57.7%{opacity:.85}58.3%{opacity:.25}59%{opacity:.85}64.5%,100%{opacity:0}}' +
    '@keyframes kdBurst{0%,7.4%{opacity:.6}7.7%{opacity:1}8.3%{opacity:.7}9%{opacity:1}16%,32%{opacity:.6}44%{opacity:.7}57.4%{opacity:.6}57.7%{opacity:1}58.3%{opacity:.7}59%{opacity:1}66%,100%{opacity:.6}}' +
    '@keyframes kdEye{0%,7.4%{opacity:.6}7.7%{opacity:1}11%{opacity:1}20%{opacity:.6}38%{opacity:.75}57.4%{opacity:.6}57.7%{opacity:1}61%{opacity:1}70%,100%{opacity:.6}}' +
    '@keyframes kdTw{0%,100%{opacity:.35}50%{opacity:1}}' +
    '}';
  function injectCss() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('k-kaido-hybrid-style')) return;
    var st = document.createElement('style');
    st.id = 'k-kaido-hybrid-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  A.kaidoVariants['hybrid'] = {
    name: 'Borracho',
    svg: function (opts) {
      opts = opts || {};
      injectCss();
      var i = 'kd' + (++uid), a = art(i);
      return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-hybrid ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido borracho">' +
        '<defs>' + a.defs + '</defs><g mask="url(#m' + i + ')">' + a.body + '</g></svg>';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
