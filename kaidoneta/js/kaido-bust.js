/* Kaidoneta art: Kaido "Primer plano", an original anime key-art bust drawn by hand in SVG (no official artwork).
 * Low-angle 3/4 head-and-shoulders: huge glossy horns, a wild mane blowing to one side with dreadlocks, a toothy
 * snarl, glowing deep-set eyes, long mustache strands, the fur cloak, the scale tattoo and Hassaikai's handle and
 * ring, over manga focus lines and a lightning burst. K.art.kaidoVariants.bust.svg(opts) returns the SVG string.
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
  // Thick-thin ink: an ink copy pushed down-right under the fill, plus a fine contour on top.
  function inked(d, fill, sw, ox, oy) {
    return '<path d="' + d + '" fill="' + INK + '" transform="translate(' + (ox == null ? 1.6 : ox) + ',' + (oy == null ? 2.2 : oy) + ')"/>' +
      '<path d="' + d + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 1.4) + '" stroke-linejoin="round"/>';
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
    var defs = '', o = '', r;

    /* ================= defs ================= */
    defs += '<radialGradient id="' + id('bg') + '" cx="205" cy="160" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8b46ff"/><stop offset=".22" stop-color="#4c1d95"/><stop offset=".55" stop-color="#22103f"/><stop offset=".85" stop-color="#12081f"/><stop offset="1" stop-color="#12081f" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('fl') + '" cx="205" cy="190" r="420" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f5e8ff"/><stop offset=".35" stop-color="#b48cff" stop-opacity=".75"/><stop offset=".7" stop-color="#7c3aed" stop-opacity=".35"/><stop offset="1" stop-color="#5b21b6" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('burst') + '" cx="205" cy="105" r="175" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".15" stop-color="#f0dcff" stop-opacity=".8"/><stop offset=".4" stop-color="#b06cff" stop-opacity=".45"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>';
    defs += '<linearGradient id="' + id('fade') + '" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset=".68" stop-color="#fff"/><stop offset=".96" stop-color="#000"/></linearGradient>';
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
    for (var k = 0; k < 96; k++) {
      var an = (k / 96) * Math.PI * 2 + (r() - 0.5) * 0.05, r0 = 135 + r() * 80, sp = 0.003 + r() * 0.011;
      var tri = 'M' + P(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0) + 'L' + P(cx + Math.cos(an - sp) * 640, cy + Math.sin(an - sp) * 640) + 'L' + P(cx + Math.cos(an + sp) * 640, cy + Math.sin(an + sp) * 640) + 'Z';
      if (k % 3) fd += tri; else fd2 += tri;
    }
    bg += path(fd, url('fl'), ' opacity=".45"') + path(fd2, url('fl'), ' opacity=".9"');
    bg += '<circle class="kb-burst" cx="205" cy="105" r="175" fill="' + url('burst') + '"/>';
    o += '<g mask="' + url('mh') + '">' + bg + '</g>';

    // lightning crown bursting from behind the head
    r = seeded(5);
    var bolts = [[205, 100, -10, 40, 9, 16], [200, 95, 120, -40, 6, 12], [212, 95, 270, -40, 6, 12], [210, 100, 410, 70, 9, 18], [195, 120, -10, 250, 10, 18], [215, 120, 410, 245, 9, 16]];
    var bd = '';
    bolts.forEach(function (b, j) {
      var J = jag(b[0], b[1], b[2], b[3], b[4], b[5], r);
      bd += J.d;
      var q = J.pts[Math.floor(J.pts.length / 2)], q2 = J.pts[Math.floor(J.pts.length * 0.7)];
      bd += jag(q[0], q[1], q[0] + (b[2] - b[0]) * 0.25 + (r() - 0.5) * 60, q[1] + (b[3] - b[1]) * 0.25 + (r() - 0.5) * 60, 4, 8, r).d;
      if (j % 2) bd += jag(q2[0], q2[1], q2[0] + (r() - 0.5) * 70, q2[1] + (r() - 0.5) * 70, 3, 6, r).d;
    });
    o += '<g class="kb-bolt" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="' + bd + '" stroke="#a855f7" stroke-width="9" opacity=".8" filter="' + url('glow') + '"/>' +
      '<path d="' + bd + '" stroke="#fbf5ff" stroke-width="2.4"/></g>';

    /* ================= mane (behind) ================= */
    o += path(smooth([[150, 160], [146, 116], [172, 88], [212, 76], [258, 80], [302, 94], [352, 106], [408, 112], [432, 140, 0], [432, 345, 0], [392, 336], [344, 316], [300, 300], [276, 292], [262, 318], [160, 318], [128, 338], [108, 300], [114, 240], [128, 196]], true), HR);
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
    // far-side locks falling behind the shoulder and whipping out
    lock([[160, 140, 11], [138, 170, 11], [124, 215, 10], [118, 262, 8], [116, 305, 5], [122, 340, 0]], HR2);
    lock([[150, 132, 9], [124, 136, 8], [98, 150, 6.5], [80, 172, 4], [70, 196, 0]], HR);
    lock([[152, 168, 9], [126, 188, 8], [106, 222, 6], [96, 258, 3], [96, 280, 0]], HR);
    o += locks + lockH;
    prec = 10;

    /* ================= Hassaikai's handle + ring (behind the left shoulder) ================= */
    var hx0 = 132, hy0 = 352, hx1 = 42, hy1 = 200, ux = hx1 - hx0, uy = hy1 - hy0, ul = Math.sqrt(ux * ux + uy * uy);
    ux /= ul; uy /= ul;
    var rcx = hx1 + ux * 19, rcy = hy1 + uy * 19;
    o += '<circle cx="' + f(rcx + 1.5) + '" cy="' + f(rcy + 2) + '" r="17" fill="none" stroke="' + INK + '" stroke-width="11"/>';
    o += '<circle cx="' + f(rcx) + '" cy="' + f(rcy) + '" r="17" fill="none" stroke="#3a3150" stroke-width="7.5"/>';
    o += '<path d="M' + P(rcx - 15, rcy - 6) + 'A16,16 0 0 1 ' + P(rcx + 4, rcy - 16.5) + '" fill="none" stroke="#c9b8f2" stroke-width="2" stroke-linecap="round"/>';
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
    o += ft; ft = '';
    prec = 10;

    /* ================= torso ================= */
    var torsoD = smooth([[166, 250, 0], [165, 296], [142, 316], [98, 330], [40, 342], [-20, 360, 0], [-20, 600, 0], [420, 600, 0], [420, 350, 0], [372, 334], [318, 318], [284, 302], [270, 280], [264, 245, 0]], true);
    defs += '<clipPath id="' + id('ct') + '"><path d="' + torsoD + '"/></clipPath>';
    o += inked(torsoD, SK, 1.6);
    var tsh = '';
    // cast shadow of the head on the neck + the shadowed right side of the chest
    tsh += path(smooth([[140, 240, 0], [290, 240, 0], [290, 318], [266, 312], [246, 322], [224, 312, 0], [206, 326], [186, 312, 0], [168, 318], [150, 306]], true), DSH);
    tsh += path(smooth([[262, 326, 0], [300, 320], [340, 330], [432, 346, 0], [432, 600, 0], [300, 600, 0], [292, 520], [282, 470], [262, 430], [244, 392], [246, 352]], true), SH);
    tsh += path(smooth([[-20, 470, 0], [60, 480], [130, 488], [196, 470], [232, 478], [300, 600, 0], [-20, 600, 0]], true), SH);
    o += '<g clip-path="' + url('ct') + '">' + tsh + '<g opacity=".35">' + tsh.replace(/fill="#[0-9a-f]+"/g, 'fill="' + url('dots') + '"') + '</g>';
    // skin highlights (left/front-lit planes)
    o += path(smooth([[118, 352], [160, 346], [196, 356], [186, 372], [150, 372], [112, 368]], true), SKL);
    o += path(smooth([[134, 356], [158, 352], [176, 358], [160, 362]], true), SKH);
    o += path(smooth([[178, 300], [196, 304], [204, 322], [190, 318]], true), SKL);
    o += '</g>';
    // anatomy ink: sternocleidomastoids, collarbones, pecs, sternum
    o += path(rib([[178, 282, 0.4], [188, 304, 1.6], [204, 334, 0.4]], 3), INK);
    o += path(rib([[252, 266, 0.4], [238, 300, 1.8], [218, 334, 0.4]], 3), INK);
    o += path(rib([[196, 340, 0.4], [160, 342, 1.8], [118, 348, 1.4], [84, 352, 0.3]], 3), INK);
    o += path(rib([[226, 338, 0.4], [262, 336, 1.8], [300, 340, 1.2], [322, 346, 0.3]], 3), INK);
    o += path(rib([[210, 360, 0.4], [208, 400, 2], [206, 450, 1.6], [204, 490, 0.4]], 3), INK);
    o += path(rib([[200, 466, 0.4], [150, 482, 2.4], [96, 476, 2], [56, 460, 0.4]], 3), INK);
    o += path(rib([[216, 470, 0.4], [258, 482, 2.4], [300, 474, 1.6], [326, 458, 0.3]], 3), INK);

    /* ================= right deltoid with the dragon-scale tattoo ================= */
    var deltD = smooth([[294, 318], [342, 314], [392, 326], [424, 352, 0], [432, 500, 0], [392, 492], [356, 452], [328, 406], [306, 360]], true);
    defs += '<clipPath id="' + id('cd') + '"><path d="' + deltD + '"/></clipPath>';
    o += inked(deltD, SK, 1.6);
    var sc = '';
    for (var row = 18; row >= 0; row--) {
      var yy = 318 + row * 9.5, off = row % 2 ? 9 : 0;
      for (var col = 0; col < 8; col++) {
        var xx = 290 + col * 18 + off;
        if (xx < 290 + (yy - 318) * 0.25) continue;
        sc += 'M' + (xx - 9) + ',' + f(yy - 11) + 'v11a9,9 0 0 0 18,0v-11Z';
      }
    }
    // scales: one path, bottom row first so each row overlaps the one below (fish-scale look)
    o += '<g clip-path="' + url('cd') + '"><path d="' + sc + '" fill="#f07818" stroke="#3a1206" stroke-width="1.6"/>' +
      
      path(smooth([[300, 386], [330, 372], [372, 378], [432, 360, 0], [432, 520, 0], [300, 520, 0]], true), SH, ' opacity=".78"') +
      path(smooth([[322, 318], [372, 318], [420, 336], [432, 352], [392, 336], [352, 328]], true), RIM, ' opacity=".9"') + '</g>';
    o += path(rib([[300, 330, 0.3], [312, 370, 1.8], [332, 412, 2], [360, 452, 1.2], [384, 480, 0.2]], 3), INK);

    /* ================= fur over the left shoulder ================= */
    prec = 1;
    var furL = smooth([[-24, 296, 0], [30, 286], [86, 292], [130, 304], [160, 326], [158, 352], [134, 372], [112, 404], [96, 450], [86, 520], [80, 600, 0], [-24, 600, 0]], true);
    o += inked(furL, FUR, 1.4);
    r = seeded(47);
    for (k = 0; k < 44; k++) {
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

    /* ================= horns ================= */
    function horn(pts, inner, rings) {
      var d = rib(pts, 2), s = '', c = cr(pts, 2), N = normals(c);
      defs += '<clipPath id="' + id('ch' + inner) + '"><path d="' + d + '"/></clipPath>';
      s += inked(d, HN, 1.6, inner > 0 ? 2.4 : -2.4, 2.4);
      var g = '';
      // cel shadow along the outer side, a deeper sliver at the edge, glossy streak + rim on the inner side
      g += path(band(pts, 2, -inner * 1.3, -inner * 0.3), HNS);
      g += path(band(pts, 2, -inner * 1.3, -inner * 0.72), HND);
      g += path(band(pts, 2, inner * 0.22, inner * 0.5), '#fffaf0');
      g += path(band(pts, 2, inner * 0.82, inner * 1.2), RIM, ' opacity=".85"');
      rings.forEach(function (ix) {
        var p = c[ix], q = N[ix], w = p[2];
        g += path(rib([[p[0] - q[0] * w * 1.05, p[1] - q[1] * w * 1.05, 0.3], [p[0] + q[2] * 3, p[1] + q[3] * 3, 1.3], [p[0] + q[0] * w * 1.05, p[1] + q[1] * w * 1.05, 0.3]], 3), HND, ' opacity=".9"');
      });
      return s + '<g clip-path="' + url('ch' + inner) + '">' + g + '</g>';
    }
    var hornLpts = [[168, 150, 21], [132, 160, 22], [98, 150, 20], [73, 126, 17], [59, 96, 13.5], [54, 64, 10], [57, 34, 6], [68, 6, 0]];
    var hornRpts = [[246, 144, 23], [290, 153, 24], [328, 141, 21.5], [353, 114, 18], [366, 82, 14], [368, 50, 10], [361, 22, 6], [348, 2, 0]];
    o += horn(hornLpts, 1, [1, 2, 3, 4]);
    o += horn(hornRpts, -1, [1, 2, 3, 4]);
    // glossy glints on the horns
    o += '<g filter="' + url('sg') + '" opacity=".9"><path d="' + rib([[96, 120, 0], [76, 96, 2.2], [70, 66, 0]], 3) + '" fill="#fff"/><path d="' + rib([[330, 118, 0], [346, 92, 2.4], [350, 62, 0]], 3) + '" fill="#fff"/></g>';

    /* ================= dreadlocks sticking up between the horns ================= */
    r = seeded(61);
    prec = 1;
    var dr2 = '', drH = '', drC = '';
    var dreads = [[172, 112, -0.25, 70, 7], [186, 104, -0.05, 86, 8], [202, 100, 0.15, 94, 8.5], [220, 102, 0.35, 92, 8], [238, 106, 0.6, 84, 7.5], [254, 112, 0.85, 70, 7], [196, 108, -0.45, 60, 6]];
    dreads.forEach(function (q, j) {
      var x = q[0], y = q[1], a = -Math.PI / 2 + q[2], L = q[3], w = q[4], pts = [];
      for (var s2 = 0; s2 <= 5; s2++) {
        var t2 = s2 / 5, aa = a + t2 * t2 * 0.9;
        x += Math.cos(aa) * L / 5; y += Math.sin(aa) * L / 5;
        pts.push([x, y, s2 === 5 ? 0 : w * (1 - t2 * 0.55)]);
      }
      pts.unshift([q[0], q[1] + 6, w]);
      dr2 += inked(rib(pts, 1), j % 2 ? HR2 : HR, 1.2, 1.2, 1.6);
      drH += path(band(pts, 3, -0.7, -0.25), j % 3 ? HRH : HRH2, ' opacity=".9"');
      var c = cr(pts, 3), N = normals(c);
      for (var m = 2; m < c.length - 3; m += 3) {
        var p = c[m], nn = N[m], ww = p[2];
        drC += 'M' + P(p[0] - nn[0] * ww, p[1] - nn[1] * ww) + 'Q' + P(p[0] + nn[2] * 3, p[1] + nn[3] * 3) + ' ' + P(p[0] + nn[0] * ww, p[1] + nn[1] * ww);
      }
    });
    prec = 10;
    o += dr2 + drH + '<path d="' + drC + '" fill="none" stroke="' + INK + '" stroke-width="1.3" opacity=".8"/>';

    /* ================= ear (near side) ================= */
    var earD = smooth([[266, 196], [280, 186], [290, 198], [287, 222], [276, 240], [264, 236]], true);
    o += inked(earD, SK, 1.4);
    o += path(smooth([[272, 202], [282, 198], [282, 220], [274, 232], [270, 222]], true), SH);
    o += path(rib([[276, 200, 0.3], [281, 212, 1.3], [276, 226, 0.3]], 3), INK);

    /* ================= head ================= */
    var headD = smooth([[160, 120], [151, 148], [150, 176], [154, 192], [148, 210], [153, 234], [160, 257], [170, 277], [184, 292], [198, 297], [216, 293], [238, 281], [256, 262], [266, 238], [272, 210], [273, 180], [270, 150], [262, 122], [238, 106], [200, 102], [174, 108]], true);
    defs += '<clipPath id="' + id('chd') + '"><path d="' + headD + '"/></clipPath>';
    o += inked(headD, SK, 1.6, 2.2, 2.4);
    var hs = '';
    hs += path(smooth([[242, 100, 0], [292, 100, 0], [292, 320, 0], [206, 320, 0], [226, 288], [244, 268], [250, 246], [240, 228, 0], [252, 210], [256, 186], [246, 160], [242, 132]], true), SH);
    hs += path(smooth([[140, 252], [168, 280], [190, 295], [216, 294], [242, 282], [262, 262], [280, 262, 0], [280, 320, 0], [130, 320, 0]], true), SH);
    hs += path(smooth([[146, 112, 0], [280, 112, 0], [280, 142], [244, 134], [210, 140], [178, 134], [152, 148]], true), SH);
    hs += path(smooth([[146, 184], [170, 186], [188, 192], [200, 190], [222, 184], [252, 178], [256, 204], [232, 212], [208, 208], [196, 214], [182, 210], [162, 214], [146, 208]], true), DSH);
    hs += path(smooth([[192, 198], [200, 214], [206, 232], [200, 244], [186, 246], [178, 241], [194, 234]], true), SH);
    hs += path(smooth([[176, 276], [200, 280], [224, 274], [230, 290], [200, 298], [172, 290]], true), DSH);
    o += '<g clip-path="' + url('chd') + '">' + hs + '<g opacity=".3">' + hs.replace(/fill="#[0-9a-f]+"/g, 'fill="' + url('dots') + '"') + '</g>';
    // lit planes + sharp highlights
    o += path(smooth([[164, 150], [196, 144], [226, 150], [206, 158], [176, 160]], true), SKL);
    o += path(smooth([[176, 150], [192, 147], [204, 151], [190, 154]], true), SKH);
    o += path(smooth([[152, 214], [170, 216], [184, 222], [168, 228], [156, 226]], true), SKL);
    o += path(rib([[186, 206, 0], [185, 218, 1.5], [184, 228, 0]], 3), SKH);
    o += path(smooth([[178, 282], [194, 287], [184, 291]], true), SKL);
    // backlight rim on the shadow-side contour
    o += path(band([[268, 132, 0], [273, 170, 2.2], [272, 210, 2.4], [266, 240, 2], [254, 264, 1.6], [236, 282, 0]], 3, 0, 1).replace(/^/, ''), RIM, ' opacity=".9" transform="translate(-2,0)"');
    o += '</g>';
    // hairline cap, sideburns
    o += path(smooth([[146, 166], [144, 128], [160, 104], [200, 92], [246, 96], [272, 116], [280, 150], [278, 196], [268, 186], [264, 150], [252, 132], [232, 124], [212, 132, 0], [196, 122], [176, 126], [160, 142], [154, 170]], true), HR);
    o += path(rib([[150, 124, 0], [176, 108, 2], [214, 100, 2.2], [250, 108, 1.6], [270, 126, 0]], 3), HRH, ' opacity=".8"');
    [[[184, 118, 6], [172, 136, 4.5], [166, 158, 0]], [[214, 118, 6], [222, 136, 4], [220, 154, 0]], [[244, 116, 6], [256, 136, 4.5], [262, 162, 0]], [[156, 140, 6], [150, 166, 4], [152, 190, 0]]].forEach(function (b, j) {
      o += inked(rib(b, 2), HR, 1, 1, 1.4) + path(band(b, 2, -0.6, -0.1), j % 2 ? HRH : HRH2, ' opacity=".85"');
    });
    // forehead creases (furrowed, angry)
    o += path(rib([[184, 160, 0.2], [189, 172, 1.4], [191, 186, 0.2]], 3), INK);
    o += path(rib([[198, 158, 0.2], [197, 172, 1.4], [195, 186, 0.2]], 3), INK);
    o += path(rib([[166, 150, 0.2], [190, 142, 1], [222, 146, 0.2]], 3), INK, ' opacity=".55"');
    // brows: heavy, thick-thin, flicking up at the ends
    o += path(rib([[150, 176, 1.5], [164, 179, 5], [178, 185, 6.5], [192, 196, 2.5]], 3), INK);
    o += path(rib([[196, 197, 2.5], [208, 187, 7], [228, 177, 7.5], [250, 167, 5.5], [266, 156, 0]], 3), INK);
    o += path(rib([[236, 174, 3], [252, 160, 2.5], [262, 146, 0]], 3), INK);
    o += path(rib([[156, 178, 2.5], [146, 168, 1.5], [142, 158, 0]], 3), INK);
    // eyes: deep-set, narrowed, glowing
    var eyeL = smooth([[159, 199], [171, 195, 0], [184, 201], [175, 205], [163, 204]], true);
    var eyeR = smooth([[204, 202], [216, 196], [232, 194], [244, 195, 0], [235, 204], [214, 206]], true);
    o += '<g class="kb-eye" filter="' + url('eg') + '"><ellipse cx="171" cy="200" rx="15" ry="7" fill="#fbbf24"/><ellipse cx="224" cy="200" rx="21" ry="8" fill="#fbbf24"/></g>';
    o += path(eyeL, '#fff6c8') + path(eyeR, '#fff6c8');
    o += '<circle cx="174" cy="200" r="2" fill="#7a2e00"/><circle cx="226" cy="199.5" r="2.2" fill="#7a2e00"/>';
    o += path(rib([[157, 199, 0], [170, 195, 2.2], [185, 200, 0]], 3), INK) + path(rib([[202, 203, 0], [220, 195, 2.6], [246, 194, 0]], 3), INK);
    o += path(rib([[200, 208, 0], [222, 208, 0.9], [240, 204, 0]], 3), INK, ' opacity=".7"');
    // nose
    o += path(rib([[192, 198, 0.3], [197, 214, 1.6], [202, 230, 1.2]], 3), INK);
    o += path(smooth([[176, 236], [182, 232], [190, 238], [196, 240], [204, 234], [206, 240], [198, 246], [186, 246], [176, 242]], true), INK);
    o += path(rib([[172, 236, 0.3], [178, 230, 1.6], [186, 230, 0.3]], 3), INK);
    // snarl folds
    o += path(rib([[178, 232, 0.4], [166, 244, 2.4], [160, 258, 2], [162, 272, 0.4]], 3), INK);
    o += path(rib([[208, 232, 0.4], [228, 242, 2.6], [238, 256, 2], [236, 270, 0.4]], 3), INK);
    o += path(rib([[186, 212, 0.2], [180, 218, 1], [176, 222, 0.2]], 3), INK, ' opacity=".7"');
    o += path(rib([[200, 214, 0.2], [206, 218, 1], [212, 220, 0.2]], 3), INK, ' opacity=".7"');

    /* ================= mouth: toothy snarl ================= */
    var mouthD = smooth([[166, 254], [178, 248], [194, 247], [212, 247], [230, 251], [234, 259], [226, 271], [208, 278], [186, 278], [170, 271]], true);
    defs += '<clipPath id="' + id('cm') + '"><path d="' + mouthD + '"/></clipPath>';
    o += inked(mouthD, '#2a0818', 1.6, 1.2, 1.8);
    var tm = '';
    tm += path('M160,240L240,240L240,257L222,256L214,258L196,257L186,259L170,258L160,260Z', '#f5ecdc');
    tm += path('M173,255L180,273L187,255Z M213,256L221,274L229,255Z', '#f5ecdc');
    tm += path('M160,290L240,290L240,266L224,268L214,270L196,271L182,270L166,268L160,267Z', '#e9dccb');
    tm += path('M171,271L177,255L184,271Z M216,271L223,254L230,269Z', '#e9dccb');
    tm += path('M206,240L240,240L240,257L222,256L214,258L206,257Z', '#b9a6c6', ' opacity=".55"');
    tm += path(smooth([[186, 266], [204, 264], [220, 266], [204, 272]], true), '#7a1f3d', ' opacity=".8"');
    tm += '<path d="M186,248L186,258M196,248L196,257M206,248L206,257M214,249L214,258M178,262L180,270M192,264L192,271M204,264L204,271M212,264L212,270" stroke="' + INK + '" stroke-width="1" opacity=".75"/>';
    o += '<g clip-path="' + url('cm') + '">' + tm + '</g>';
    o += path(rib([[164, 253, 0.4], [180, 246, 2.6], [196, 245, 2.4], [214, 246, 2.6], [234, 252, 0.4]], 3), INK);
    o += path(rib([[172, 274, 0.3], [190, 280, 1.8], [210, 280, 1.8], [228, 270, 0.3]], 3), INK);

    /* ================= beard + mustache ================= */
    var beardD = smooth([[174, 282], [188, 288], [202, 290], [220, 284], [232, 276], [234, 294], [228, 314], [218, 332], [208, 352, 0], [200, 336], [190, 348, 0], [186, 328], [176, 310], [170, 294]], true);
    o += inked(beardD, HR, 1.2, 1.4, 2);
    o += path(rib([[204, 292, 0], [212, 312, 1.3], [208, 340, 0]], 3), HRH, ' opacity=".9"');
    o += path(rib([[186, 296, 0], [190, 318, 1], [194, 338, 0]], 3), HRH2, ' opacity=".7"');
    o += path(rib([[222, 288, 0], [224, 304, 1], [218, 322, 0]], 3), HRH, ' opacity=".8"');
    var mL = [[182, 241, 2], [168, 244, 3.6], [156, 252, 4.2], [146, 274, 4.4], [140, 312, 4.2], [142, 356, 3.8], [152, 400, 3.2], [168, 446, 2.6], [184, 494, 1.8], [194, 545, 0.4]];
    var mR = [[204, 242, 2], [222, 243, 3.6], [238, 249, 4.2], [252, 266, 4.4], [262, 300, 4.2], [272, 340, 3.8], [288, 386, 3.2], [308, 432, 2.6], [328, 478, 1.8], [346, 526, 0.4]];
    o += '<g class="kb-stache">' + inked(rib(mL, 2), HR, 1, 1.2, 1.6) + inked(rib(mR, 2), HR, 1, 1.2, 1.6) +
      path(band(mL, 2, -0.75, -0.15), HRH, ' opacity=".9"') + path(band(mR, 2, -0.75, -0.15), HRH2, ' opacity=".8"') + '</g>';

    /* ================= sparks ================= */
    r = seeded(97);
    var sp1 = '', sp2 = '';
    for (k = 0; k < 16; k++) {
      var sx = 20 + r() * 360, sy = 10 + r() * 330, ss = 2 + r() * 4.5;
      if (sx > 130 && sx < 290 && sy > 90) { sx = sx < 210 ? sx - 110 : sx + 100; }
      var st = 'M' + P(sx, sy - ss * 2) + 'Q' + P(sx, sy) + ' ' + P(sx + ss * 2, sy) + 'Q' + P(sx, sy) + ' ' + P(sx, sy + ss * 2) + 'Q' + P(sx, sy) + ' ' + P(sx - ss * 2, sy) + 'Q' + P(sx, sy) + ' ' + P(sx, sy - ss * 2) + 'Z';
      if (k % 2) sp1 += st; else sp2 += st;
    }
    o += '<g filter="' + url('sg') + '" opacity=".8"><path d="' + sp1 + sp2 + '" fill="#c084fc"/></g>';
    o += '<path class="kb-spark" d="' + sp1 + '" fill="#fff"/><path class="kb-spark kb-s2" d="' + sp2 + '" fill="#f3e8ff"/>';

    return { defs: defs, body: o };
  }

  var CSS = '@media (prefers-reduced-motion: no-preference){' +
    '.kaido-bust .kb-bolt{animation:kbFlick 4.6s infinite}' +
    '.kaido-bust .kb-burst{animation:kbBurst 4.6s infinite}' +
    '.kaido-bust .kb-eye{animation:kbEye 2.8s ease-in-out infinite}' +
    '.kaido-bust .kb-spark{animation:kbTw 2.2s ease-in-out infinite}' +
    '.kaido-bust .kb-s2{animation-delay:1.1s}' +
    '.kaido-bust .kb-stache{transform-origin:194px 246px;animation:kbSway 5s ease-in-out infinite}' +
    '@keyframes kbFlick{0%,100%{opacity:.9}4%{opacity:.15}6%{opacity:1}9%{opacity:.35}11%{opacity:1}48%{opacity:.85}50%{opacity:.2}52%{opacity:1}75%{opacity:.7}}' +
    '@keyframes kbBurst{0%,100%{opacity:.9}4%{opacity:.5}6%{opacity:1}50%{opacity:.6}52%{opacity:1}}' +
    '@keyframes kbEye{0%,100%{opacity:.75}50%{opacity:1}}' +
    '@keyframes kbTw{0%,100%{opacity:.2}50%{opacity:1}}' +
    '@keyframes kbSway{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-2.2deg)}}' +
    '}';
  function injectCss() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('k-kaido-bust-style')) return;
    var st = document.createElement('style');
    st.id = 'k-kaido-bust-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  A.kaidoVariants['bust'] = {
    name: 'Primer plano',
    svg: function (opts) {
      opts = opts || {};
      injectCss();
      var i = 'kb' + (++uid), a = art(i);
      return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-bust ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido">' +
        '<defs>' + a.defs + '</defs><g mask="url(#m' + i + ')">' + a.body + '</g></svg>';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
