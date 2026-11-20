/* Kaidoneta art: Kaido "Grabado", an original ukiyo-e (woodblock print) take on Kaido drawn by hand in SVG.
 * A kabuki-style mie pose (glaring, kumadori make-up, Hassaikai on the shoulder) in front of a pale moon, with his
 * azure dragon form coiling through scroll clouds, woodblock lightning and great-wave crests with claw foam.
 * Flat colour areas, bold ink outlines, bokashi gradation at the top of the sky and a paper-grain texture.
 * K.art.kaidoVariants.ukiyoe.svg(opts) returns the SVG string.
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  A.kaidoVariants = A.kaidoVariants || {};
  var uid = 0;

  function f(n) { return Math.round(n * 10) / 10; }
  function P(x, y) { return f(x) + ',' + f(y); }
  function seeded(seed) { var s = seed % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // Smooth path through [x, y] points (Catmull-Rom as cubic Beziers); a third value 0 makes that point a corner.
  function smooth(pts, closed) {
    var n = pts.length, d = 'M' + P(pts[0][0], pts[0][1]), last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      var a = p1[2] === 0 ? 0 : 1 / 6, b = p2[2] === 0 ? 0 : 1 / 6;
      d += 'C' + P(p1[0] + (p2[0] - p0[0]) * a, p1[1] + (p2[1] - p0[1]) * a) + ' ' + P(p2[0] - (p3[0] - p1[0]) * b, p2[1] - (p3[1] - p1[1]) * b) + ' ' + P(p2[0], p2[1]);
    }
    return d + (closed ? 'Z' : '');
  }
  // Catmull-Rom samples through [x, y, w] points.
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
  function nrmAt(c, i) {
    var n = c.length, a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    return [-dy / l, dx / l, dx / l, dy / l];
  }
  // Tapered filled stroke along [x, y, halfWidth] points (brush line, hair lock, horn...). side 1/-1: grows to one side.
  function rib(pts, seg, side) {
    var c = cr(pts, seg || 3), n = c.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var q = nrmAt(c, i), w = Math.max(0, c[i][2]), x = c[i][0], y = c[i][1];
      var k0 = side ? (side > 0 ? 0 : -2) : -1, k1 = side ? (side > 0 ? 2 : 0) : 1;
      L.push([x + q[0] * w * k1, y + q[1] * w * k1]);
      R.unshift([x + q[0] * w * k0, y + q[1] * w * k0]);
    }
    L[0][2] = 0; L[n - 1][2] = 0; R[0][2] = 0; R[n - 1][2] = 0;
    return smooth(L.concat(R), true);
  }
  function line(pts) { var d = 'M' + P(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) d += 'L' + P(pts[i][0], pts[i][1]); return d; }
  function poly(pts) { return line(pts) + 'Z'; }
  // Shaggy edge from a to b: tufts on the (dy, -dx) side (outward for clockwise shapes; pass amp < 0 otherwise).
  function jag(a, b, n, amp, lean, rnd, tips) {
    var out = [], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1, nx = dy / L, ny = -dx / L;
    for (var k = 0; k < n; k++) {
      var t0 = k / n, tm = (k + 0.5) / n + (lean || 0), am = amp * (0.7 + 0.6 * rnd());
      out.push([a[0] + dx * t0, a[1] + dy * t0]);
      var tip = [a[0] + dx * tm + nx * am, a[1] + dy * tm + ny * am, 0];
      out.push(tip);
      if (tips) tips.push([tip[0], tip[1], a[0] + dx * (tm - (lean || 0)) + nx * am * 0.35, a[1] + dy * (tm - (lean || 0)) + ny * am * 0.35]);
    }
    return out;
  }
  // Zigzag lightning polygon along points with half-widths ws (sharp mitred corners).
  function bolt(pts, ws) {
    var n = pts.length, L = [], R = [];
    function nr(a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1; return [-dy / l, dx / l]; }
    for (var i = 0; i < n; i++) {
      var n1 = nr(pts[Math.max(0, i - 1)], pts[Math.max(1, i)]), n2 = nr(pts[Math.min(n - 2, i)], pts[Math.min(n - 1, i + 1)]);
      var ax = n1[0] + n2[0], ay = n1[1] + n2[1], al = Math.sqrt(ax * ax + ay * ay) || 1;
      ax /= al; ay /= al;
      var m = ws[i] / Math.max(0.35, ax * n1[0] + ay * n1[1]);
      L.push([pts[i][0] + ax * m, pts[i][1] + ay * m]);
      R.unshift([pts[i][0] - ax * m, pts[i][1] - ay * m]);
    }
    return poly(L.concat(R));
  }
  // Ukiyo-e scroll cloud: flat bottom at y, scalloped top, rounded ends, inner spiral.
  function cloud(x, y, w, h, radii, fill, ink, line2) {
    var s = 0, i;
    for (i = 0; i < radii.length; i++) s += radii[i] * 2;
    var k = (w - h) / s, cx = x + w - h / 2, d = 'M' + P(x + h / 2, y) + 'L' + P(cx, y) + 'A' + f(h / 2) + ',' + f(h / 2) + ' 0 0 0 ' + P(cx, y - h);
    for (i = 0; i < radii.length; i++) { var r = radii[i] * k; cx -= 2 * r; d += 'A' + f(r) + ',' + f(r * 1.15) + ' 0 0 0 ' + P(cx, y - h); }
    d += 'A' + f(h / 2) + ',' + f(h / 2) + ' 0 0 0 ' + P(x + h / 2, y) + 'Z';
    var sp = [], scx = x + h * 0.55, scy = y - h * 0.5;
    for (i = 0; i <= 18; i++) { var t = i / 18, an = t * 4.2 * Math.PI, rr = h * 0.42 * (1 - t * 0.85); sp.push([scx + Math.cos(an) * rr, scy + Math.sin(an) * rr]); }
    var o = '<path d="' + d + '" fill="' + fill + '" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>';
    o += '<path d="' + smooth(sp, false) + '" fill="none" stroke="' + line2 + '" stroke-width="1.8" stroke-linecap="round"/>';
    o += '<path d="M' + P(x + h * 1.2, y - h * 0.32) + 'Q' + P(x + w * 0.55, y - h * 0.5) + ' ' + P(x + w - h * 0.7, y - h * 0.3) + '" fill="none" stroke="' + line2 + '" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>';
    return o;
  }

  var INK = '#110a18';
  var C = {
    ink: INK, indigo: '#1f2466', indigoD: '#141848', violet: '#3b2a7a', paper: '#f1e4c2', paperD: '#d9c393',
    verm: '#d2452b', vermD: '#94281c', gold: '#d9a23a', goldD: '#9c6b1c', skin: '#dda46c', skinS: '#ad6b40', skinD: '#7c4426',
    dragon: '#2e3b93', dragonD: '#1a2163', dragonL: '#5566c4', fur: '#2a2272', furL: '#b7a3ee', furM: '#4b3fa6', iron: '#3a3550'
  };
  function sk(w) { return ' stroke="' + INK + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"'; }
  function pth(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }

  function art(i) {
    var id = function (s) { return s + i; }, url = function (s) { return 'url(#' + s + i + ')'; };
    var rnd = seeded(4242);
    var defs = '', o = '', k, t, q, c;

    /* ---------------- defs ---------------- */
    // sky with bokashi at the top
    defs += '<linearGradient id="' + id('sky') + '" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0d0920"/><stop offset=".09" stop-color="#171040"/><stop offset=".26" stop-color="#2c1f6c"/><stop offset=".5" stop-color="#33237a"/><stop offset=".78" stop-color="#21175a"/><stop offset="1" stop-color="#140c33"/></linearGradient>';
    defs += '<radialGradient id="' + id('moon') + '" cx="228" cy="152" r="118" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8eccb"/><stop offset=".8" stop-color="#f0dfae"/><stop offset="1" stop-color="#e2c98c"/></radialGradient>';
    defs += '<radialGradient id="' + id('halo') + '" cx="228" cy="152" r="175" gradientUnits="userSpaceOnUse"><stop offset=".6" stop-color="#b9a1f0" stop-opacity=".45"/><stop offset="1" stop-color="#6a4bc4" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('vig') + '" cx="200" cy="220" r="330" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#12081f" stop-opacity="0"/><stop offset="1" stop-color="#12081f" stop-opacity=".85"/></radialGradient>';
    defs += '<linearGradient id="' + id('cl') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6dbf2"/><stop offset=".55" stop-color="#ad9bd9"/><stop offset="1" stop-color="#7461b4"/></linearGradient>';
    defs += '<linearGradient id="' + id('wv') + '" x1="0" y1="390" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#34409a"/><stop offset=".5" stop-color="#1f2466"/><stop offset="1" stop-color="#121540"/></linearGradient>';
    defs += '<linearGradient id="' + id('fade') + '" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset=".74" stop-color="#fff"/><stop offset=".97" stop-color="#000"/></linearGradient>';
    defs += '<mask id="' + id('m') + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="440" height="600"><rect x="-20" y="-20" width="440" height="600" fill="' + url('fade') + '"/></mask>';
    // dragon scales (U arcs, staggered rows)
    defs += '<pattern id="' + id('dsc') + '" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="' + C.dragon + '"/><path d="M0,0A6,6 0 0 0 12,0M-6,6A6,6 0 0 0 6,6M6,6A6,6 0 0 0 18,6" fill="none" stroke="' + C.dragonD + '" stroke-width="1.5"/><path d="M3,2.5A4,4 0 0 0 9,2.5" fill="none" stroke="' + C.dragonL + '" stroke-width=".9" opacity=".7"/></pattern>';
    // tattoo scales
    defs += '<pattern id="' + id('tat') + '" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#de5a2e"/><path d="M0,0A5,5 0 0 0 10,0M-5,5A5,5 0 0 0 5,5M5,5A5,5 0 0 0 15,5" fill="none" stroke="#5e1712" stroke-width="1.3"/><path d="M2.5,1.6A3,3 0 0 0 7.5,1.6" fill="none" stroke="#f5a05a" stroke-width=".8"/></pattern>';
    // raimon (lightning fret) on the vermilion cloak lining
    defs += '<pattern id="' + id('rai') + '" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="' + C.verm + '"/><path d="M3,15V3H15V13H6V6H12V10H9" fill="none" stroke="#e9a43a" stroke-width="1.5" stroke-linecap="square"/></pattern>';
    // rope twist
    defs += '<pattern id="' + id('rope') + '" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="12" height="12" fill="' + C.paper + '"/><rect width="4" height="12" fill="' + C.paperD + '"/><rect x="4" width="1.2" height="12" fill="' + INK + '" opacity=".55"/></pattern>';
    // seigaiha-like water lines
    defs += '<pattern id="' + id('sei') + '" width="20" height="10" patternUnits="userSpaceOnUse"><path d="M0,10A10,10 0 0 1 20,10M4,10A6,6 0 0 1 16,10M8,10A2,2 0 0 1 12,10" fill="none" stroke="#6d7bd6" stroke-width="1" opacity=".55"/></pattern>';
    // paper grain
    defs += '<pattern id="' + id('gr') + '" width="9" height="9" patternUnits="userSpaceOnUse"><rect x="1" y="2" width="1" height="1" fill="#f3e6c4" opacity=".1"/><rect x="6" y="1" width="2" height=".6" fill="#f3e6c4" opacity=".08"/><rect x="4" y="6" width="1" height="1" fill="#000" opacity=".16"/><rect x="0" y="7" width="3" height=".6" fill="#000" opacity=".1"/><rect x="7" y="4" width=".8" height="2" fill="#f3e6c4" opacity=".06"/></pattern>';
    defs += '<filter id="' + id('glow') + '" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/></filter>';
    defs += '<filter id="' + id('eg') + '" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"/></filter>';

    /* ---------------- sky, moon ---------------- */
    o += '<rect x="-20" y="-20" width="440" height="600" fill="' + url('sky') + '"/>';
    // faint woodgrain streaks in the sky
    for (k = 0; k < 9; k++) { var gy = 18 + k * 38 + rnd() * 12; o += '<path d="M-10,' + f(gy) + 'Q200,' + f(gy + 8 - rnd() * 16) + ' 410,' + f(gy + 4) + '" fill="none" stroke="#8b74d6" stroke-width="' + f(0.6 + rnd() * 0.8) + '" opacity=".1"/>'; }
    o += '<circle cx="228" cy="152" r="175" fill="' + url('halo') + '"/>';
    o += '<circle cx="228" cy="152" r="118" fill="' + url('moon') + '"/>';
    o += '<circle cx="228" cy="152" r="126" fill="none" stroke="#f1e4c2" stroke-width="1.5" opacity=".35"/>';

    /* ---------------- dragon body (behind) ---------------- */
    function dragonBody(pts, bellySide) {
      var s = '', cc = cr(pts, 3), n = cc.length, j, sp = '', pl = '';
      for (j = 1; j < n - 1; j += 2) {
        q = nrmAt(cc, j); var w = cc[j][2], sx = -bellySide;
        var b1 = [cc[j][0] + q[0] * w * sx * 0.9 - q[2] * 5, cc[j][1] + q[1] * w * sx * 0.9 - q[3] * 5];
        var b2 = [cc[j][0] + q[0] * w * sx * 0.9 + q[2] * 5, cc[j][1] + q[1] * w * sx * 0.9 + q[3] * 5];
        var tp = [cc[j][0] + q[0] * (w + 13) * sx - q[2] * 8, cc[j][1] + q[1] * (w + 13) * sx - q[3] * 8];
        sp += poly([b1, tp, b2]);
      }
      s += pth(sp, C.verm, sk(1.6));
      s += pth(rib(pts, 3), 'url(#dsc' + i + ')', sk(3));
      s += pth(rib(pts.map(function (p) { return [p[0], p[1], p[2] * 0.5]; }), 3, -bellySide), C.dragonD, ' opacity=".45"');
      s += pth(rib(pts.map(function (p) { return [p[0], p[1], p[2] * 0.42]; }), 3, bellySide), '#cdb78a', sk(1.8));
      for (j = 1; j < n - 1; j++) {
        q = nrmAt(cc, j); var ww = cc[j][2] * 0.84 * bellySide;
        pl += 'M' + P(cc[j][0] + q[0], cc[j][1] + q[1]) + 'L' + P(cc[j][0] + q[0] * ww, cc[j][1] + q[1] * ww);
      }
      return s + '<path d="' + pl + '" stroke="' + C.goldD + '" stroke-width="1.3"/>';
    }
    o += dragonBody([[-40, 560, 14], [20, 480, 20], [58, 400, 23], [46, 318, 24], [26, 240, 24], [44, 160, 23], [68, 88, 22], [48, 20, 21], [14, -40, 19]], 1);
    o += dragonBody([[318, -40, 16], [368, 10, 19], [398, 76, 21], [384, 146, 20], [400, 200, 18], [392, 246, 15]], -1);

    /* ---------------- clouds (drift) ---------------- */
    o += '<g class="kuk-drift">';
    o += cloud(-30, 232, 140, 22, [0.8, 1.2, 0.9, 1.4, 1, 0.8], url('cl'), INK, '#5b4797');
    o += cloud(292, 98, 140, 20, [0.9, 1.3, 1, 1.2, 0.8], url('cl'), INK, '#5b4797');
    o += '</g><g class="kuk-drift2">';
    o += cloud(140, 70, 140, 16, [0.7, 1.1, 0.9, 1.3, 0.8, 1], url('cl'), INK, '#5b4797');
    o += '</g>';

    /* ---------------- lightning (flash) ---------------- */
    var b1 = bolt([[104, -10], [74, 44], [94, 50], [52, 108], [72, 114], [24, 182]], [8, 7, 7, 5.5, 5, 0]);
    var b2 = bolt([[412, 282], [382, 318], [398, 324], [358, 368], [374, 373], [334, 418]], [7, 6, 6, 5, 4, 0]);
    var b3 = bolt([[8, 92], [-4, 64], [6, 60], [-8, 30]], [3, 3, 2.5, 0]);
    o += '<g class="kuk-flash"><path d="' + b1 + b2 + '" fill="#ffd36a" filter="' + url('glow') + '" opacity=".9"/>';
    o += pth(b1 + b2 + b3, '#fbe7a0', sk(2.4)) + '</g>';

    /* ---------------- back mane ---------------- */
    var mane = [[175, 120], [160, 86, 0], [180, 104], [196, 66, 0], [207, 100], [224, 70, 0], [234, 104], [258, 82, 0], [252, 118],
      [276, 130], [320, 148, 0], [288, 164], [340, 196, 0], [294, 200], [334, 250, 0], [296, 248], [320, 298, 0], [282, 288],
      [240, 292], [170, 292],
      [128, 292], [96, 334, 0], [112, 284], [72, 292, 0], [108, 258], [64, 236, 0], [110, 222], [78, 182, 0], [120, 186], [96, 136, 0], [138, 150], [124, 112, 0], [152, 128]];
    o += pth(smooth(mane, true), '#140d1e', sk(3));
    var ms = '';
    for (k = 0; k < mane.length; k++) {
      if (mane[k][2] !== 0) continue;
      var mx = mane[k][0], my = mane[k][1], vx = mx - 205, vy = my - 200;
      ms += rib([[205 + vx * 0.5, 200 + vy * 0.5, 0.3], [205 + vx * 0.72 + vy * 0.05, 200 + vy * 0.72 - vx * 0.05, 1.6], [205 + vx * 0.93, 200 + vy * 0.93, 0.2]], 2);
    }
    o += pth(ms, '#4a3a92', ' opacity=".9"');

    /* ---------------- dragon head (right, roaring) ---------------- */
    var dh = '';
    dh += pth(smooth([[-5, -38], [24, -56, 0], [18, -34], [50, -40, 0], [30, -16], [60, -10, 0], [32, 4], [56, 24, 0], [28, 24], [40, 48, 0], [8, 36], [-6, 30]], true), C.verm, sk(2.2));
    dh += pth(rib([[-28, -26, 4.5], [-4, -50, 4], [24, -70, 2.6], [50, -80, 0.4]], 3), C.gold, sk(1.8));
    dh += pth(rib([[-2, -50, 0.5], [2, -70, 2.2], [-6, -88, 0.3]], 3), C.gold, sk(1.6));
    dh += pth(rib([[-100, -10, 1.8], [-118, -30, 1.6], [-122, -58, 1.2], [-108, -80, 0.8], [-88, -84, 0.2]], 4), C.gold, sk(1.2));
    dh += pth(rib([[-90, -16, 1.6], [-88, -44, 1.4], [-70, -62, 1.1], [-40, -70, 0.7], [-10, -64, 0.2]], 4), C.gold, sk(1.2));
    // lower jaw + beard
    dh += pth(smooth([[-66, 50], [-62, 74, 0], [-50, 56], [-40, 78, 0], [-30, 54], [-16, 70, 0], [-6, 42]], true), C.verm, sk(2));
    dh += pth(smooth([[-4, 22], [-26, 24], [-50, 30], [-72, 40], [-92, 50, 0], [-86, 58], [-66, 54], [-40, 48], [-14, 42], [2, 32]], true), 'url(#dsc' + i + ')', sk(2.6));
    dh += pth(poly([[-88, 2], [-60, 8], [-30, 14], [-8, 22], [-14, 34], [-40, 40], [-70, 46], [-90, 50]]), '#4a0e1e');
    dh += pth(smooth([[-70, 42], [-52, 30], [-34, 30], [-26, 36], [-44, 40]], true), C.verm);
    for (k = 0; k < 4; k++) { t = -84 + k * 15; dh += pth(poly([[t, 3 + k * 2], [t + 3, 17 + k * 1.5], [t + 7, 5 + k * 2]]), C.paper, sk(1.2)); }
    for (k = 0; k < 3; k++) { t = -80 + k * 17; dh += pth(poly([[t, 47 - k * 2.5], [t + 4, 33 - k * 2], [t + 8, 45 - k * 2.5]]), C.paper, sk(1.2)); }
    // upper head
    dh += pth(smooth([[2, -24], [-18, -32], [-36, -34], [-48, -28], [-64, -22], [-84, -20], [-98, -16], [-106, -6, 0], [-98, 2], [-86, 4, 0], [-70, 6], [-50, 10], [-28, 14], [-6, 18], [6, 4]], true), 'url(#dsc' + i + ')', sk(2.8));
    dh += pth(smooth([[-98, 2], [-70, 6], [-40, 11], [-10, 17], [-30, 6], [-64, 0], [-92, -3]], true), C.dragonD, ' opacity=".6"');
    dh += pth(rib([[-28, -30, 1], [-42, -37, 5], [-58, -32, 4], [-68, -25, 0.8]], 3), C.dragonL, sk(1.8));
    dh += '<path d="M-96,-9a3.5,3.5 0 1 1 4,3" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    dh += '<ellipse cx="-47" cy="-21" rx="9" ry="5" fill="#ffd36a" filter="' + url('eg') + '"/>';
    dh += '<path d="M-57,-20Q-47,-30 -37,-22Q-47,-14 -57,-20Z" fill="#fbe7a0"' + sk(1.6) + '/><ellipse cx="-47" cy="-21" rx="1.6" ry="4" fill="' + INK + '"/>';
    o += '<g transform="translate(390,244) rotate(14)">' + dh + '</g>';

    /* ---------------- cloak (back, vermilion lining with lightning fret) ---------------- */
    o += pth(smooth([[112, 262], [62, 286], [34, 330], [22, 420], [14, 570], [396, 570], [392, 420], [380, 330], [352, 286], [300, 262]], true), url('rai'), sk(3));
    var tips = [];
    var furL = [[100, 268]].concat(jag([100, 268], [42, 318], 3, -12, 0.15, rnd, tips), jag([42, 318], [24, 420], 4, -13, 0.12, rnd, tips), jag([24, 420], [14, 570], 5, -13, 0.1, rnd, tips), [[44, 570], [52, 420], [66, 336], [112, 292]]);
    var furR = [[310, 268]].concat(jag([310, 268], [368, 318], 3, 12, 0.15, rnd, tips), jag([368, 318], [386, 420], 4, 13, 0.12, rnd, tips), jag([386, 420], [396, 570], 5, 13, 0.1, rnd, tips), [[366, 570], [356, 420], [342, 336], [298, 292]]);
    o += pth(smooth(furL, true), C.fur, sk(2.6)) + pth(smooth(furR, true), C.fur, sk(2.6));

    /* ---------------- Kaido's left arm (viewer right) with dragon-scale tattoo ---------------- */
    var arm = [[288, 300], [322, 294], [350, 314], [360, 360], [364, 410], [370, 452], [346, 470], [326, 462], [322, 420], [310, 380], [296, 346]];
    o += pth(smooth(arm, true), C.skin, sk(3));
    o += pth(smooth([[288, 300], [322, 294], [350, 314], [360, 360], [356, 392], [338, 404], [318, 396], [300, 350]], true), url('tat'), sk(1.6));
    o += pth(smooth([[296, 340], [310, 380], [322, 420], [328, 460], [340, 466], [334, 420], [322, 378], [306, 334]], true), C.skinS, ' opacity=".8"');
    // skull tattoo near the wrist
    o += '<g transform="translate(348,430)"><path d="M-7,5L7,-5M-7,-5L7,5" stroke="' + C.paper + '" stroke-width="2.2" stroke-linecap="round"/><circle r="4.6" fill="' + C.paper + '"/><rect x="-2.6" y="2.5" width="5.2" height="3.2" rx="1" fill="' + C.paper + '"/><circle cx="-1.7" cy="-.4" r="1.2" fill="' + INK + '"/><circle cx="1.7" cy="-.4" r="1.2" fill="' + INK + '"/></g>';
    // wristband
    o += pth(poly([[324, 448], [370, 444], [372, 466], [326, 470]]), INK);
    o += pth(poly([[324, 450], [314, 458], [326, 466]]), C.gold, sk(1.2)) + pth(poly([[371, 447], [382, 454], [372, 463]]), C.gold, sk(1.2));
    for (k = 0; k < 3; k++) { t = 334 + k * 13; o += pth(poly([[t - 4, 458], [t, 451], [t + 4, 458], [t, 465]]), C.gold, sk(1)); }

    /* ---------------- torso ---------------- */
    o += pth(smooth([[172, 266], [140, 282], [112, 300], [100, 330], [106, 380], [124, 430], [138, 480], [144, 530], [266, 530], [272, 480], [286, 430], [302, 380], [310, 330], [300, 300], [272, 282], [238, 266]], true), C.skin, sk(3));
    o += pth(smooth([[272, 284], [300, 300], [310, 330], [302, 380], [286, 430], [272, 480], [266, 530], [252, 530], [262, 470], [276, 420], [288, 370], [292, 320]], true), C.skinS);
    o += pth(poly([[178, 236], [232, 236], [240, 280], [205, 292], [170, 280]]), C.skin);
    o += pth(smooth([[178, 256], [232, 256], [238, 276], [205, 288], [172, 276]], true), C.skinS);
    // pecs
    o += pth(smooth([[132, 336], [150, 360], [172, 372], [200, 366], [204, 378], [176, 386], [150, 380], [132, 362]], true), C.skinS);
    o += pth(smooth([[278, 336], [260, 360], [238, 372], [210, 366], [206, 378], [234, 386], [260, 380], [278, 362]], true), C.skinS);
    o += pth(rib([[128, 328, 0.4], [148, 358, 2], [174, 370, 2.4], [202, 364, 0.6]], 3), INK);
    o += pth(rib([[282, 328, 0.4], [262, 358, 2], [236, 370, 2.4], [208, 364, 0.6]], 3), INK);
    o += pth(rib([[205, 300, 0.2], [205, 332, 1.3], [205, 362, 0.2]], 3), INK);
    o += pth(rib([[178, 272, 0.3], [152, 284, 1.6], [128, 296, 0.3]], 3), INK) + pth(rib([[232, 272, 0.3], [258, 284, 1.6], [282, 296, 0.3]], 3), INK);
    // abs
    for (k = 0; k < 3; k++) {
      var ay = 400 + k * 27;
      o += pth(rib([[172, ay + 2, 0.3], [186, ay - 2, 1.6], [200, ay, 0.4]], 2), C.skinD) + pth(rib([[210, ay, 0.4], [224, ay - 2, 1.6], [238, ay + 2, 0.3]], 2), C.skinD);
    }
    o += pth(rib([[205, 384, 0.2], [205, 420, 1.4], [206, 470, 0.3]], 3), C.skinD);
    o += pth(rib([[150, 388, 0.3], [160, 430, 1.6], [168, 470, 0.3]], 3), INK) + pth(rib([[262, 388, 0.3], [252, 430, 1.6], [244, 470, 0.3]], 3), INK);
    // X scar
    o += pth(rib([[174, 388, 1], [208, 420, 3.2], [242, 452, 1]], 3), '#7a1f2c') + pth(rib([[240, 388, 1], [206, 420, 3.2], [172, 452, 1]], 3), '#7a1f2c');
    o += pth(rib([[178, 392, 0.3], [208, 420, 1.2], [238, 448, 0.3]], 3), '#e08a74') + pth(rib([[236, 392, 0.3], [206, 420, 1.2], [176, 448, 0.3]], 3), '#e08a74');

    /* ---------------- waist: sash, shimenawa, shide, chains ---------------- */
    o += pth(smooth([[128, 494], [205, 504], [284, 492], [290, 530], [205, 540], [120, 530]], true), '#6e1a2a', sk(2.4));
    o += '<path d="M126,506Q205,518 286,504M124,518Q205,530 288,516" fill="none" stroke="#a83a3a" stroke-width="2.5"/>';
    o += pth(rib([[112, 476, 13], [160, 488, 15], [205, 492, 15], [250, 488, 15], [298, 474, 13]], 4), url('rope'), sk(2.6));
    o += '<circle cx="168" cy="492" r="12" fill="' + url('rope') + '"' + sk(2.2) + '/><circle cx="244" cy="492" r="12" fill="' + url('rope') + '"' + sk(2.2) + '/>';
    function shide(x, y) { return pth(poly([[x, y], [x + 10, y], [x + 10, y + 12], [x + 4, y + 12], [x + 14, y + 26], [x + 8, y + 26], [x + 16, y + 42], [x + 4, y + 42], [x - 2, y + 30], [x + 4, y + 30], [x - 4, y + 16], [x + 2, y + 16]]), '#fbf6ea', sk(1.4)); }
    o += shide(186, 504) + shide(222, 504);
    o += '<path d="M132,500Q140,534 168,548M282,498Q272,532 246,548" fill="none" stroke="' + INK + '" stroke-width="7" stroke-dasharray="7 3" stroke-linecap="round"/>';
    o += '<path d="M132,500Q140,534 168,548M282,498Q272,532 246,548" fill="none" stroke="' + C.gold + '" stroke-width="4" stroke-dasharray="7 3" stroke-linecap="round"/>';

    /* ---------------- front shoulder fur ---------------- */
    var ft = [];
    var sl = [[178, 268]].concat(jag([178, 268], [104, 262], 3, -7, 0.1, rnd, ft), jag([104, 262], [44, 324], 4, -13, 0.18, rnd, ft), jag([44, 328], [176, 300], 6, -14, 0.1, rnd, ft));
    var sr = [[232, 268]].concat(jag([232, 268], [306, 262], 3, 7, 0.1, rnd, ft), jag([306, 262], [366, 324], 4, 13, 0.18, rnd, ft), jag([366, 328], [234, 300], 6, 14, 0.1, rnd, ft));
    o += pth(smooth(sl, true), C.fur, sk(2.8)) + pth(smooth(sr, true), C.fur, sk(2.8));
    tips = tips.concat(ft);
    var td = '';
    for (k = 0; k < tips.length; k++) {
      c = tips[k]; var tx = c[0] - c[2], ty = c[1] - c[3], tl = Math.sqrt(tx * tx + ty * ty) || 1, px = -ty / tl * 2.6, py = tx / tl * 2.6;
      td += 'M' + P(c[2] + px, c[3] + py) + 'Q' + P(c[2] + tx * 0.6 + px * 0.7, c[3] + ty * 0.6 + py * 0.7) + ' ' + P(c[0], c[1]) + 'Q' + P(c[2] + tx * 0.5 - px * 0.5, c[3] + ty * 0.5 - py * 0.5) + ' ' + P(c[2] - px, c[3] - py) + 'Z';
    }
    o += pth(td, C.furL);
    o += '<path d="M70,300Q100,286 140,290M60,316Q96,300 130,306M270,290Q310,286 340,300M280,306Q316,300 350,316" fill="none" stroke="' + C.furM + '" stroke-width="2" stroke-linecap="round"/>';

    /* ---------------- Hassaikai (on Kaido's right shoulder) ---------------- */
    var Bx = 116, By = 288, Cx = 24, Cy = 104, dl = Math.sqrt((Cx - Bx) * (Cx - Bx) + (Cy - By) * (Cy - By)), dx = (Cx - Bx) / dl, dy = (Cy - By) / dl, nx = -dy, ny = dx;
    function at(tt, s) { var hw = 13 + 12 * tt; return [Bx + (Cx - Bx) * tt + nx * hw * s, By + (Cy - By) * tt + ny * hw * s]; }
    // handle + ring
    o += '<circle cx="164" cy="388" r="11" fill="none" stroke="' + INK + '" stroke-width="9"/><circle cx="164" cy="388" r="11" fill="none" stroke="' + C.gold + '" stroke-width="4.5"/>';
    o += pth(rib([[160, 378, 6.5], [138, 330, 6.5], [116, 286, 6.5]], 2), '#2a1f33', sk(2.4));
    for (k = 0; k < 7; k++) { t = k / 7; var hx = 158 - 42 * t, hy = 374 - 88 * t; o += '<path d="M' + P(hx - 6, hy + 1) + 'L' + P(hx + 6, hy - 4) + '" stroke="#5c4a75" stroke-width="2"/>'; }
    // octagonal body
    o += pth(poly([at(0, -1), at(1, -1), at(1, 1), at(0, 1)]), C.iron, sk(3));
    o += pth(poly([at(0, 0.45), at(1, 0.45), at(1, 1), at(0, 1)]), '#211d30');
    o += pth(poly([at(0, -0.15), at(1, -0.15), at(1, -0.6), at(0, -0.6)]), '#5e5880');
    o += '<path d="M' + P(at(0, -0.6)[0], at(0, -0.6)[1]) + 'L' + P(at(1, -0.6)[0], at(1, -0.6)[1]) + 'M' + P(at(0, 0.45)[0], at(0, 0.45)[1]) + 'L' + P(at(1, 0.45)[0], at(1, 0.45)[1]) + '" stroke="' + INK + '" stroke-width="1.2" opacity=".6"/>';
    // edge spikes + face studs
    var spk = '', std = '', shn = '';
    for (k = 0; k < 8; k++) {
      t = 0.1 + k * 0.115;
      [-1, 1].forEach(function (s) { spk += poly([at(t, s * 0.98), at(t + 0.015, s * 1.6), at(t + 0.05, s * 0.98)]); });
      [-0.3, 0.3].forEach(function (s, j) {
        var p = at(t + (j ? 0.05 : 0), s);
        std += 'M' + P(p[0] - 3.3, p[1]) + 'a3.3,3.3 0 1 0 6.6,0a3.3,3.3 0 1 0 -6.6,0';
        shn += 'M' + P(p[0] - 2, p[1] - 1) + 'a1,1 0 1 0 2,0a1,1 0 1 0 -2,0';
      });
    }
    o += pth(spk, C.gold, sk(1.3)) + pth(std, C.gold, sk(1.2)) + pth(shn, '#fbe7a0');
    // bands
    function band(tt, extra) { var a = at(tt, -1 - extra), b = at(tt, 1 + extra), a2 = at(tt + 0.04, -1 - extra), b2 = at(tt + 0.04, 1 + extra); return pth(poly([a, b, b2, a2]), '#6b6488', sk(2)); }
    o += band(0, 0.12) + band(0.95, 0.1);
    // fist + forearm + wristband
    o += pth(smooth([[92, 300], [118, 304], [116, 360], [112, 410], [86, 414], [80, 350]], true), C.skin, sk(2.8));
    o += pth(smooth([[84, 404], [104, 352], [116, 330], [148, 322], [154, 344], [128, 392], [112, 420]], true), C.skin, sk(2.8));
    o += pth(smooth([[124, 330], [148, 324], [154, 344], [128, 392], [112, 418], [118, 380], [134, 350]], true), C.skinS);
    o += pth(poly([[114, 338], [145, 352], [138, 366], [107, 352]]), INK);
    o += pth(poly([[145, 352], [158, 352], [142, 364]]), C.gold, sk(1.2)) + pth(poly([[107, 352], [98, 340], [114, 340]]), C.gold, sk(1.2));
    for (k = 0; k < 2; k++) { var wx = 120 + k * 13, wy = 349 + k * 6; o += pth(poly([[wx - 4, wy], [wx, wy - 6], [wx + 4, wy], [wx, wy + 6]]), C.gold, sk(1)); }
    o += pth(smooth([[110, 314], [124, 300], [146, 302], [158, 316], [154, 334], [134, 340], [114, 334]], true), C.skin, sk(2.8));
    o += '<path d="M126,306Q130,318 126,330M138,304Q142,318 138,334M150,308Q154,320 150,334" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>';
    o += pth(smooth([[140, 304], [156, 312], [156, 330], [148, 336], [150, 320]], true), C.skinS);

    /* ---------------- head ---------------- */
    // side locks behind the face edge
    o += pth(rib([[168, 146, 7], [156, 190, 8], [148, 232, 7], [140, 270, 5], [130, 304, 0.4]], 4), '#140d1e', sk(2));
    o += pth(rib([[244, 146, 7], [256, 190, 8], [264, 232, 7], [272, 270, 5], [284, 302, 0.4]], 4), '#140d1e', sk(2));
    // dreadlocks between the horns
    var dreads = [[[184, 140, 7], [174, 112, 6], [164, 88, 4], [166, 70, 0.4]], [[200, 136, 7], [197, 104, 6], [190, 80, 4], [196, 60, 0.4]], [[214, 136, 7], [220, 104, 6], [228, 82, 4], [224, 62, 0.4]], [[228, 140, 7], [240, 114, 6], [252, 96, 4], [264, 88, 0.4]]];
    for (k = 0; k < dreads.length; k++) {
      o += pth(rib(dreads[k], 4), '#150e20', sk(2.2));
      o += pth(rib(dreads[k].map(function (p) { return [p[0] - 2, p[1], p[2] * 0.3]; }), 4), '#5a48a8', ' opacity=".8"');
    }
    // face
    o += pth(smooth([[170, 142], [163, 165], [162, 192], [166, 218], [175, 240], [190, 256], [205, 262], [221, 256], [236, 240], [245, 218], [249, 192], [248, 165], [241, 142], [222, 133], [205, 131], [188, 133]], true), C.skin, sk(3));
    o += pth(smooth([[236, 150], [246, 175], [247, 205], [240, 232], [226, 252], [214, 258], [222, 236], [230, 212], [232, 186], [228, 166]], true), C.skinS);
    o += pth(smooth([[166, 186], [184, 186], [200, 194], [198, 202], [182, 200], [168, 198]], true), C.skinS) + pth(smooth([[210, 194], [228, 186], [246, 184], [244, 198], [228, 200], [212, 202]], true), C.skinS);
    o += pth(smooth([[166, 212], [178, 220], [184, 232], [176, 230], [168, 222]], true), C.skinS);
    // kumadori (red kabuki make-up lines)
    var kum = [[[196, 186, 0.6], [182, 170, 2.4], [172, 156, 1.2], [174, 145, 0.2]], [[170, 200, 0.5], [164, 186, 1.9], [164, 168, 0.2]], [[173, 204, 0.5], [178, 214, 1.7], [176, 228, 0.2]],
      [[214, 186, 0.6], [230, 170, 2.4], [240, 156, 1.2], [238, 145, 0.2]], [[240, 200, 0.5], [246, 186, 1.9], [246, 168, 0.2]], [[237, 204, 0.5], [232, 214, 1.7], [234, 228, 0.2]]];
    for (k = 0; k < kum.length; k++) o += pth(rib(kum[k], 3), C.verm);
    // bangs
    o += pth(smooth([[172, 146], [186, 130], [205, 127], [224, 130], [240, 146], [230, 150, 0], [222, 140], [214, 156, 0], [206, 140], [197, 154, 0], [189, 140], [180, 152, 0]], true), '#140d1e', sk(2));
    // forehead furrows
    o += pth(rib([[201, 182, 0.3], [202, 172, 1.1], [200, 162, 0.2]], 2), C.skinD) + pth(rib([[209, 182, 0.3], [208, 172, 1.1], [210, 162, 0.2]], 2), C.skinD);
    // eyes (glaring)
    o += '<g class="kuk-eye"><circle cx="184" cy="196" r="6" fill="#ffcf5a" filter="' + url('eg') + '"/><circle cx="226" cy="196" r="6" fill="#ffcf5a" filter="' + url('eg') + '"/></g>';
    o += '<path d="M169,197Q184,188 199,197Q184,204 169,197ZM211,197Q226,188 242,196Q226,204 211,197Z" fill="#fbf1d6"' + sk(1.4) + '/>';
    o += '<circle cx="186" cy="196.5" r="3.6" fill="' + C.gold + '"/><circle cx="224" cy="196.5" r="3.6" fill="' + C.gold + '"/><circle cx="186" cy="196.5" r="1.8" fill="' + INK + '"/><circle cx="224" cy="196.5" r="1.8" fill="' + INK + '"/>';
    o += pth(rib([[166, 199, 0.6], [182, 190, 2.4], [200, 196, 0.8]], 3), INK) + pth(rib([[210, 196, 0.8], [228, 190, 2.4], [244, 198, 0.6]], 3), INK);
    // brows: thick, furrowed, with flaring tufts
    o += pth(rib([[160, 170, 1.5], [174, 172, 5], [190, 179, 5.5], [203, 191, 2.5]], 4), INK);
    o += pth(rib([[207, 191, 2.5], [220, 179, 5.5], [236, 172, 5], [251, 167, 1.5]], 4), INK);
    o += pth(poly([[166, 168], [152, 158], [170, 166], [158, 150], [176, 166]]), INK) + pth(poly([[244, 166], [258, 156], [240, 164], [254, 148], [236, 166]]), INK);
    // nose
    o += pth(smooth([[200, 200], [196, 214], [188, 224], [194, 231], [205, 229], [216, 231], [222, 224], [214, 214], [210, 200]], true), C.skin);
    o += pth(smooth([[208, 202], [214, 214], [222, 224], [216, 231], [208, 229], [212, 216]], true), C.skinS);
    o += pth(rib([[192, 222, 0.4], [188, 227, 1.8], [196, 232, 0.6]], 3), INK) + pth(rib([[218, 222, 0.4], [222, 227, 1.8], [214, 232, 0.6]], 3), INK);
    o += pth(rib([[199, 228, 0.3], [205, 230, 1.2], [211, 228, 0.3]], 2), INK);
    // snarl: gritted teeth
    o += pth(smooth([[179, 240], [192, 233], [205, 236], [218, 233], [233, 238], [229, 252], [205, 257], [183, 252]], true), '#4a0e1e');
    o += pth(poly([[183, 239.5], [228, 239], [228, 246], [183, 246]]), '#f3e9cf') + pth(poly([[186, 248], [225, 248], [222, 253], [189, 253]]), '#e6d8b4');
    o += pth(poly([[186, 240], [190, 251], [194, 241]]), '#fbf6ea', sk(0.8)) + pth(poly([[217, 241], [221, 251], [225, 240]]), '#fbf6ea', sk(0.8));
    o += '<path d="M194,240V246M200,240V246M206,240V246M212,240V246M218,240V246M196,248V253M203,248V253M210,248V253M217,248V253M184,246.5H228" stroke="' + INK + '" stroke-width="1"/>';
    o += '<path d="' + smooth([[179, 240], [192, 233], [205, 236], [218, 233], [233, 238], [229, 252], [205, 257], [183, 252]], true) + '" fill="none"' + sk(2.6) + '/>';
    // goatee
    o += pth(smooth([[188, 254], [205, 260], [222, 254], [227, 264], [218, 282], [207, 302, 0], [198, 284], [185, 266]], true), '#140d1e', sk(1.6));
    // horns
    function horn(outer, inner, shade, hi, rings) {
      var s = pth(smooth(outer.concat(inner), true), '#f8f0dc', sk(3.4));
      s += pth(smooth(shade, true), '#c7ae86');
      s += pth(rib(hi, 4), '#fffdf4');
      for (var j = 0; j < rings.length; j++) s += pth(rib(rings[j], 2), INK, ' opacity=".55"');
      s += '<path d="' + smooth(outer.concat(inner), true) + '" fill="none"' + sk(3.4) + '/>';
      return s;
    }
    o += horn([[176, 168], [150, 166], [124, 156], [104, 136], [94, 108], [94, 78], [100, 52], [110, 28, 0]], [[112, 56], [114, 86], [122, 112], [138, 130], [158, 140], [180, 146]],
      [[176, 168], [150, 166], [124, 156], [104, 136], [94, 108], [94, 78], [100, 52], [110, 28, 0], [104, 60], [104, 92], [112, 120], [130, 141], [154, 153], [178, 158]],
      [[160, 143, 0.4], [134, 130, 2.6], [118, 108, 2.6], [111, 80, 2], [110, 56, 0.4]],
      [[[152, 166, 0.3], [154, 154, 1.2], [158, 141, 0.3]], [[132, 160, 0.3], [134, 146, 1.1], [140, 132, 0.3]]]);
    o += horn([[234, 168], [260, 166], [286, 156], [306, 136], [316, 108], [316, 78], [310, 50], [300, 26, 0]], [[298, 54], [296, 86], [288, 112], [272, 130], [252, 140], [230, 146]],
      [[234, 168], [260, 166], [286, 156], [306, 136], [316, 108], [316, 78], [310, 50], [300, 26, 0], [306, 58], [306, 92], [298, 120], [280, 141], [256, 153], [232, 158]],
      [[252, 143, 0.4], [278, 130, 2.6], [293, 108, 2.6], [299, 80, 2], [300, 56, 0.4]],
      [[[258, 166, 0.3], [256, 154, 1.2], [252, 141, 0.3]], [[278, 160, 0.3], [276, 146, 1.1], [270, 132, 0.3]]]);
    o += '<path d="' + rib([[134, 128, 0.3], [118, 104, 1.6], [112, 76, 0.3]], 3) + rib([[278, 128, 0.3], [292, 104, 1.6], [298, 76, 0.3]], 3) + '" fill="#fff" filter="' + url('eg') + '" opacity=".8"/>';
    // mustache: long strands to the waist
    o += pth(rib([[196, 232, 1.2], [184, 235, 2.8], [172, 243, 3], [166, 264, 2.6], [163, 300, 2.3], [156, 350, 1.9], [150, 410, 1.5], [142, 470, 0.4]], 4), '#140d1e');
    o += pth(rib([[214, 232, 1.2], [226, 235, 2.8], [238, 243, 3], [244, 264, 2.6], [248, 300, 2.3], [258, 350, 1.9], [268, 410, 1.5], [282, 470, 0.4]], 4), '#140d1e');

    /* ---------------- great waves with claw foam ---------------- */
    function wave(body, crest, inner, dir) {
      var s = pth(smooth(body, true), url('wv'), sk(3));
      s += pth(smooth(body, true), url('sei'), ' opacity=".9"');
      for (var j = 0; j < inner.length; j++) s += pth(rib(inner[j], 3), '#5b6ad0', ' opacity=".8"');
      var cc = cr(crest, 4), n = cc.length;
      s += pth(rib(crest, 4), C.paper, sk(1.8));
      var cd = '';
      for (j = 1; j < n; j++) {
        var qq = nrmAt(cc, j), x = cc[j][0], y = cc[j][1], a = Math.atan2(qq[3], qq[2]) + dir * 0.9, len = 12 + (j % 3) * 3.5;
        var px = -Math.sin(a) * 3.2, py = Math.cos(a) * 3.2, tp = [x + Math.cos(a + dir * 0.75) * len, y + Math.sin(a + dir * 0.75) * len];
        var mx = x + Math.cos(a) * len * 0.6, my = y + Math.sin(a) * len * 0.6;
        cd += 'M' + P(x + px, y + py) + 'Q' + P(mx + px * 0.6, my + py * 0.6) + ' ' + P(tp[0], tp[1]) + 'Q' + P(mx - px * 0.6, my - py * 0.6) + ' ' + P(x - px, y - py) + 'Z';
      }
      return s + pth(cd, C.paper, sk(1.3));
    }
    o += wave([[-30, 570], [-30, 436], [10, 414], [50, 400], [92, 398], [124, 410], [142, 432], [130, 448], [112, 440], [98, 448], [106, 472], [140, 504], [184, 570]],
      [[2, 418, 3], [48, 402, 4], [92, 400, 4], [124, 412, 3.5], [140, 432, 2]],
      [[[10, 450, 0.3], [50, 430, 1.8], [96, 432, 0.3]], [[0, 480, 0.3], [50, 460, 2], [100, 476, 0.3]]], 1);
    o += wave([[430, 570], [430, 446], [394, 426], [354, 414], [318, 418], [298, 432], [302, 450], [318, 446], [332, 456], [320, 482], [282, 520], [250, 570]],
      [[416, 430, 3], [376, 416, 4], [336, 414, 4], [306, 426, 3.5], [298, 444, 2]],
      [[[400, 460, 0.3], [356, 440, 1.8], [318, 452, 0.3]], [[410, 490, 0.3], [360, 470, 2], [320, 486, 0.3]]], -1);

    /* ---------------- paper grain + soft vignette ---------------- */
    o += '<rect x="-20" y="-20" width="440" height="600" fill="' + url('gr') + '"/>';
    o += '<rect x="-20" y="-20" width="440" height="600" fill="' + url('vig') + '"/>';

    return { defs: defs, body: o };
  }

  var CSS = '@media (prefers-reduced-motion: no-preference){' +
    '.kaido-ukiyoe .kuk-drift{animation:kukDrift 11s ease-in-out infinite alternate}' +
    '.kaido-ukiyoe .kuk-drift2{animation:kukDrift2 14s ease-in-out infinite alternate}' +
    '.kaido-ukiyoe .kuk-flash{animation:kukFlash 4.6s linear infinite}' +
    '.kaido-ukiyoe .kuk-eye{animation:kukEye 3.2s ease-in-out infinite alternate}' +
    '@keyframes kukDrift{from{transform:translateX(-7px)}to{transform:translateX(9px)}}' +
    '@keyframes kukDrift2{from{transform:translateX(8px)}to{transform:translateX(-8px)}}' +
    '@keyframes kukFlash{0%,62%,100%{opacity:.55}64%{opacity:1}66%{opacity:.25}68%{opacity:1}74%{opacity:.75}}' +
    '@keyframes kukEye{from{opacity:.55}to{opacity:1}}}';

  A.kaidoVariants['ukiyoe'] = {
    name: 'Grabado',
    svg: function (opts) {
      opts = opts || {};
      if (typeof document !== 'undefined' && document.head && !document.getElementById('k-kaido-ukiyoe-style')) {
        var st = document.createElement('style'); st.id = 'k-kaido-ukiyoe-style'; st.textContent = CSS; document.head.appendChild(st);
      }
      var i = 'ku' + (++uid), a = art(i);
      return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-ukiyoe ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido">' +
        '<defs>' + a.defs + '</defs><g mask="url(#m' + i + ')">' + a.body + '</g></svg>';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
