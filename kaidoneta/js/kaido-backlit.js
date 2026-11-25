/* Kaidoneta art: Kaido "Tormenta", an original cinematic backlit key visual drawn by hand in SVG (no official artwork).
 * Low angle, cut at mid-thigh: Kaido stands in a purple thunderstorm, Hassaikai resting on his right shoulder with the
 * handle's ring glinting top-left, the other fist on his hip, the fur cloak spreading behind him. He is almost all in
 * shadow (indigo planes) with a hot magenta rim on the left edges and a cold lilac rim on the right; gold eyes, glossy
 * horns, gold spikes and chains, the white shimenawa and the ember-orange scale tattoo are the brilliant accents.
 * Every few seconds lightning flashes and lights him up (the .kb-lit layer), then he sinks back into shadow.
 * K.art.kaidoVariants.backlit.svg(opts) returns the SVG string.
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
  // Smooth closed/open path through [x, y] points (Catmull-Rom as cubic Beziers); a third value 0 makes a corner.
  function smooth(pts, closed) {
    var n = pts.length, d = 'M' + P(pts[0][0], pts[0][1]), last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      var a = p1[2] === 0 ? 0 : 1 / 6, b = p2[2] === 0 ? 0 : 1 / 6;
      d += 'C' + P(p1[0] + (p2[0] - p0[0]) * a, p1[1] + (p2[1] - p0[1]) * a) + ' ' + P(p2[0] - (p3[0] - p1[0]) * b, p2[1] - (p3[1] - p1[1]) * b) + ' ' + P(p2[0], p2[1]);
    }
    return d + (closed ? 'Z' : '');
  }
  // Catmull-Rom samples through [x, y, w...].
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
  // Filled strip along [x, y, halfWidth] points between offsets a*w and b*w across the line:
  // (-1, 1) is a tapered thick-thin stroke; one-sided values give a shadow or highlight strip along an edge.
  function band(pts, a, b, seg) {
    var c = cr(pts, seg || 4), n = c.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / l, ny = dx / l, w = Math.max(0, c[i][2]);
      L.push(P(c[i][0] + nx * w * b, c[i][1] + ny * w * b));
      R.unshift(P(c[i][0] + nx * w * a, c[i][1] + ny * w * a));
    }
    return 'M' + L.join('L') + 'L' + R.join('L') + 'Z';
  }
  function rib(pts, seg) { return band(pts, -1, 1, seg); }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>'; }
  function poly(pts) { var s = ''; for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + P(pts[i][0], pts[i][1]); return s + 'Z'; }
  function mirror(pts) { return pts.map(function (p) { var q = p.slice(); q[0] = 400 - p[0]; return q; }); }
  // A hair lock: starts at (x, y) heading ang (degrees), bending by bend (radians) each step, tapering from w.
  function lock(x, y, ang, len, w, bend) {
    var pts = [], a = ang * Math.PI / 180, n = 6, st = len / (n - 1);
    for (var i = 0; i < n; i++) { var t = i / (n - 1); pts.push([x, y, Math.max(0.25, w * (1 - Math.pow(t, 1.3) * 0.96))]); x += Math.cos(a) * st; y += Math.sin(a) * st; a += bend; }
    return rib(pts, 3);
  }
  // Closed outline turned into shaggy fur: curved tufts bulging out and hanging down (lean) between base points.
  function furry(pts, amp, seed, lean) {
    var r = seeded(seed), c = cr(pts.concat([pts[0]]), 3), n = c.length - 1, area = 0, i;
    for (i = 0; i < n; i++) area += c[i][0] * c[i + 1][1] - c[i + 1][0] * c[i][1];
    var sg = area > 0 ? 1 : -1, O = [];
    for (i = 0; i < n; i++) {
      var p = c[(i - 1 + n) % n], q = c[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      O.push([sg * dy / l, -sg * dx / l]);
    }
    var d = 'M' + P(c[0][0], c[0][1]);
    for (i = 0; i < n - 1; i += 2) {
      var b0 = c[i], t = c[i + 1], b1 = c[(i + 2) % n], o = O[i + 1], a = amp * (0.5 + r() * 0.9);
      var tx = t[0] + o[0] * a, ty = t[1] + o[1] * a + (lean || 0) * a;
      d += 'Q' + P(b0[0] + o[0] * a * 0.75, b0[1] + o[1] * a * 0.75) + ' ' + P(tx, ty) + 'Q' + P((tx + b1[0]) / 2 - o[0] * a * 0.12, (ty + b1[1]) / 2 - o[1] * a * 0.12) + ' ' + P(b1[0], b1[1]);
    }
    return d + 'Z';
  }
  // A jagged lightning bolt as a tapered strip.
  function bolt(pts, w) {
    var n = pts.length, d = [];
    for (var i = 0; i < n; i++) d.push([pts[i][0], pts[i][1], w * (1 - 0.8 * i / (n - 1))]);
    return band(d, -1, 1, 1);
  }
  // Gold link chain hanging between two points with a sag.
  function chain(x1, y1, x2, y2, sag, count, gold) {
    var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + sag * 2, s = '';
    for (var i = 0; i <= count; i++) {
      var t = i / count, u = 1 - t, x = u * u * x1 + 2 * u * t * cx + t * t * x2, y = u * u * y1 + 2 * u * t * cy + t * t * y2;
      var dx = 2 * u * (cx - x1) + 2 * t * (x2 - cx), dy = 2 * u * (cy - y1) + 2 * t * (y2 - cy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      s += i % 2 ? '<rect x="-5" y="-1.3" width="10" height="2.6" rx="1.3" fill="' + gold + '" transform="translate(' + P(x, y) + ') rotate(' + f(ang) + ')"/>'
        : '<ellipse rx="5.4" ry="3.3" fill="none" stroke="' + gold + '" stroke-width="2" transform="translate(' + P(x, y) + ') rotate(' + f(ang) + ')"/>';
    }
    return s;
  }
  // Spiked wristband centred at (x, y); (ux, uy) runs along the forearm.
  function wristband(x, y, ux, uy, hw, hh, gold) {
    var nx = -uy, ny = ux, s = '', i;
    function pt(a, b) { return [x + nx * a + ux * b, y + ny * a + uy * b]; }
    for (i = -1; i <= 1; i += 2) {
      for (var k = -1; k <= 1; k += 2) {
        var b0 = pt(i * hw * 0.92, k * hh * 0.55 - hh * 0.2), b1 = pt(i * hw * 0.92, k * hh * 0.55 + hh * 0.2), tip = pt(i * (hw + 11), k * hh * 0.55);
        s += path(poly([b0, tip, b1]), gold);
      }
    }
    s = path(poly([pt(-hw, -hh), pt(hw, -hh), pt(hw, hh), pt(-hw, hh)]), '#07040c', 'filter="url(#RIM)"') + s;
    for (i = -1; i <= 1; i++) {
      var c = pt(i * hw * 0.55, 0);
      s += path(poly([pt(i * hw * 0.55 - 4, 0), pt(i * hw * 0.55, -hh * 0.75), pt(i * hw * 0.55 + 4, 0), pt(i * hw * 0.55, hh * 0.75)]), gold) +
        '<circle cx="' + f(c[0] - 1) + '" cy="' + f(c[1] - 1.5) + '" r="0.9" fill="#fff8d0"/>';
    }
    return s;
  }
  // Paired shape: dark plane + the same plane lit (shown only during a lightning flash).
  function plane(d, base, lit, litOp) {
    return path(d, base) + '<path class="kb-lit" d="' + d + '" fill="' + (lit || 'url(#LIT)') + '" opacity="0" data-o="' + (litOp || 1) + '"/>';
  }

  var BASE = '#170f2b', DEEP = '#0b0617', PLANE = 'url(#PL)', INK = '#05020a';
  var MAG = '#ff4fe0', LIL = '#ece6ff';

  function defs(p) {
    return '<defs>' +
      '<radialGradient id="' + p + 'sky" gradientUnits="userSpaceOnUse" cx="200" cy="135" r="420"><stop offset="0" stop-color="#46177a"/><stop offset=".3" stop-color="#26103f"/><stop offset=".65" stop-color="#160a28"/><stop offset="1" stop-color="#0f0719"/></radialGradient>' +
      '<radialGradient id="' + p + 'cloud" gradientUnits="userSpaceOnUse" cx="200" cy="130" r="300"><stop offset="0" stop-color="#ff9cf2"/><stop offset=".22" stop-color="#b357e6"/><stop offset=".5" stop-color="#4c2389"/><stop offset="1" stop-color="#1d0e36"/></radialGradient>' +
      '<radialGradient id="' + p + 'halo" gradientUnits="userSpaceOnUse" cx="200" cy="128" r="210"><stop offset="0" stop-color="#ffffff"/><stop offset=".16" stop-color="#ffe0fb"/><stop offset=".3" stop-color="#ff86ec" stop-opacity=".92"/><stop offset=".48" stop-color="#a63ee0" stop-opacity=".5"/><stop offset=".72" stop-color="#4a1a86" stop-opacity=".18"/><stop offset="1" stop-color="#2a0f52" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + p + 'PL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33255c"/><stop offset=".55" stop-color="#21173e"/><stop offset="1" stop-color="#170f2b" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + p + 'LIT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cbb9ff"/><stop offset=".5" stop-color="#8a6fe0"/><stop offset="1" stop-color="#4b3596"/></linearGradient>' +
      '<linearGradient id="' + p + 'gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".45" stop-color="#f5bf3a"/><stop offset="1" stop-color="#8d5a0b"/></linearGradient>' +
      '<linearGradient id="' + p + 'hak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140f22"/><stop offset="1" stop-color="#0a0712"/></linearGradient>' +
      '<linearGradient id="' + p + 'torso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1232"/><stop offset="1" stop-color="#110a20"/></linearGradient>' +
      '<radialGradient id="' + p + 'knot" cx=".62" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#e2d9ff"/><stop offset=".75" stop-color="#8f80c2"/><stop offset="1" stop-color="#4a3d78"/></radialGradient>' +
      '<linearGradient id="' + p + 'rope" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1ebff"/><stop offset=".6" stop-color="#a99bd6"/><stop offset="1" stop-color="#4d4080"/></linearGradient>' +
      '<radialGradient id="' + p + 'ember" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a2a" stop-opacity=".35"/><stop offset="1" stop-color="#ff3a10" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + p + 'eye" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe680"/><stop offset=".4" stop-color="#ffae1a" stop-opacity=".8"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + p + 'flash" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#f4e8ff"/><stop offset=".5" stop-color="#b48cff" stop-opacity=".6"/><stop offset="1" stop-color="#6a3cc0" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + p + 'fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".76" stop-color="#fff"/><stop offset=".97" stop-color="#000"/></linearGradient>' +
      '<mask id="' + p + 'mask" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="560"><rect width="400" height="560" fill="url(#' + p + 'fade)"/></mask>' +
      '<pattern id="' + p + 'rain" patternUnits="userSpaceOnUse" width="25" height="40"><path d="M6 0l-4 13M19 17l-5 16M12 29l-2 6" stroke="#d6c8ff" stroke-width=".7" stroke-linecap="round"/></pattern>' +
      '<pattern id="' + p + 'furtex" patternUnits="userSpaceOnUse" width="16" height="13"><path d="M2 1q3 5 0 11M9 4q3 4 1 9M14 0q2 3 0 6" fill="none" stroke="#3a2d73" stroke-width="1.1" stroke-linecap="round"/></pattern>' +
      '<pattern id="' + p + 'scl" patternUnits="userSpaceOnUse" width="12" height="10"><g fill="#2e0c06" stroke="#f0582a" stroke-width=".85">' +
      '<path d="M-6 10a6 6 0 0 0 12 0zM6 10a6 6 0 0 0 12 0z"/><path d="M0 5a6 6 0 0 0 12 0z"/><path d="M-6 0a6 6 0 0 0 12 0zM6 0a6 6 0 0 0 12 0z"/><path d="M0 -5a6 6 0 0 0 12 0z"/></g></pattern>' +
      // Rim light: hot magenta on the left/top edges, cold lilac on the right edges of whatever it is applied to.
      '<filter id="' + p + 'rim" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">' +
      '<feOffset in="SourceAlpha" dx="1.7" dy="1.3" result="a"/><feComposite in="SourceAlpha" in2="a" operator="out" result="ea"/>' +
      '<feFlood flood-color="' + MAG + '"/><feComposite in2="ea" operator="in" result="ma"/>' +
      '<feOffset in="SourceAlpha" dx="4.2" dy="2.4" result="b"/><feComposite in="SourceAlpha" in2="b" operator="out" result="eb"/>' +
      '<feFlood flood-color="#b832d6" flood-opacity=".3"/><feComposite in2="eb" operator="in" result="mb"/>' +
      '<feOffset in="SourceAlpha" dx="-1.5" dy=".7" result="c"/><feComposite in="SourceAlpha" in2="c" operator="out" result="ec"/>' +
      '<feFlood flood-color="' + LIL + '"/><feComposite in2="ec" operator="in" result="lc"/>' +
      '<feOffset in="SourceAlpha" dx="-3.6" dy="1.4" result="d"/><feComposite in="SourceAlpha" in2="d" operator="out" result="ed"/>' +
      '<feFlood flood-color="#8f84ff" flood-opacity=".26"/><feComposite in2="ed" operator="in" result="ld"/>' +
      '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="mb"/><feMergeNode in="ld"/><feMergeNode in="ma"/><feMergeNode in="lc"/></feMerge></filter>' +
      '<filter id="' + p + 'glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="' + p + 'gbig" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="4.5"/></filter>' +
      '<filter id="' + p + 'geye" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
      '</defs>';
  }

  function background(p, r) {
    var s = '<rect x="-10" y="-10" width="420" height="580" fill="url(#' + p + 'sky)"/>', i, a;
    // god rays from the halo
    for (i = 0; i < 22; i++) {
      a = (i / 22) * Math.PI * 2 + 0.08; var w = 0.035 + r() * 0.05, L = 460;
      s += path(poly([[200, 128], [200 + Math.cos(a - w) * L, 128 + Math.sin(a - w) * L], [200 + Math.cos(a + w) * L, 128 + Math.sin(a + w) * L]]), '#ff9cf0', 'opacity="' + f(0.03 + r() * 0.05) + '"');
    }
    // storm clouds: a lit copy shifted toward the halo, then the dark body over it, leaving a glowing rim
    function bank(list, ox, oy) {
      var lit = '', dark = '';
      list.forEach(function (c) {
        lit += '<circle cx="' + f(c[0] + ox) + '" cy="' + f(c[1] + oy) + '" r="' + c[2] + '"/>';
        dark += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>';
      });
      return '<g fill="url(#' + p + 'cloud)">' + lit + '</g><g fill="#1a0c30" opacity=".93">' + dark + '</g>';
    }
    var top = [], left = [], right = [], far = [];
    for (i = 0; i < 12; i++) top.push([-20 + i * 40 + r() * 16, -4 + r() * 22 + Math.abs(i - 5.5) * -2, 30 + r() * 22]);
    for (i = 0; i < 6; i++) far.push([110 + i * 36 + r() * 10, 40 + r() * 14, 18 + r() * 14]);
    for (i = 0; i < 6; i++) left.push([-10 + r() * 70, 120 + i * 30 + r() * 10, 26 + r() * 16]);
    for (i = 0; i < 6; i++) right.push([340 + r() * 70, 110 + i * 30 + r() * 10, 26 + r() * 16]);
    s += '<g opacity=".6">' + bank(far, 0, 9) + '</g>';
    s += '<circle cx="200" cy="128" r="210" fill="url(#' + p + 'halo)"/>';
    s += '<g fill="none" stroke="#ffc8f6"><circle cx="200" cy="126" r="66" stroke-width="1.4" opacity=".35"/><circle cx="200" cy="126" r="90" stroke-width=".8" opacity=".22"/><circle cx="200" cy="126" r="128" stroke-width=".6" opacity=".12"/></g>';
    s += bank(top, 0, 11) + bank(left, 11, 3) + bank(right, -11, 3);
    // rain behind
    s += '<rect x="-20" y="-20" width="440" height="600" fill="url(#' + p + 'rain)" opacity=".38"/>';
    // lightning
    var bolts = [
      [[122, -4], [108, 30], [120, 42], [92, 78], [101, 88], [70, 128], [79, 136], [44, 186], [53, 192], [16, 250]],
      [[70, 128], [44, 140], [48, 147], [8, 168]],
      [[292, -4], [302, 28], [291, 39], [324, 76], [313, 86], [352, 126], [341, 134], [374, 178], [365, 186], [400, 236]],
      [[324, 76], [350, 68], [348, 77], [392, 56]]
    ];
    var glow = '', core = '';
    bolts.forEach(function (b, k) { glow += path(bolt(b, k % 2 ? 6 : 11), '#e07aff'); core += path(bolt(b, k % 2 ? 1.6 : 2.8), '#fff'); });
    s += '<g class="kb-bolt" opacity=".85"><g filter="url(#' + p + 'gbig)">' + glow + '</g>' + core + '</g>';
    return s;
  }

  function cloak(p) {
    var out = [[200, 172], [245, 176], [290, 186], [332, 203], [364, 232], [386, 272], [398, 322], [406, 390], [412, 470], [416, 590], [-16, 590], [-12, 470], [-6, 392], [2, 324], [16, 270], [40, 228], [74, 200], [116, 184], [158, 175]];
    var inner = [[200, 186], [262, 192], [318, 214], [350, 250], [370, 300], [380, 380], [388, 470], [392, 590], [8, 590], [12, 470], [20, 380], [30, 304], [50, 252], [84, 216], [138, 194]];
    return '<g>' + path(furry(out, 17, 11, 0.55), '#1a1338', 'filter="url(#RIM)"') +
      path(furry(out, 17, 11, 0.55), 'url(#' + p + 'furtex)', 'opacity=".55"') +
      path(furry(inner, 14, 23, 0.6), '#22194a', 'opacity=".9"') +
      path(furry(inner, 14, 23, 0.6), 'url(#' + p + 'furtex)', 'opacity=".45"') +
      // lavender tips of a few big tufts
      '<g fill="#9a8ae6" opacity=".55">' + path(lock(30, 300, 200, 26, 3, 0.1), '#9a8ae6') + path(lock(20, 380, 190, 22, 3, 0.1), '#9a8ae6') +
      path(lock(370, 300, -20, 26, 3, -0.1), '#9a8ae6') + path(lock(382, 390, -10, 22, 3, -0.1), '#9a8ae6') + '</g>' +
      plane(furry([[60, 240], [110, 214], [100, 260], [70, 300]], 8, 5, 0.5), 'none', 'url(#LIT)', 0.5) +
      // fur collar on the shoulders, behind the head
      path(furry([[128, 214], [150, 190], [186, 178], [214, 178], [250, 190], [276, 214], [240, 206], [200, 200], [160, 206]], 10, 41, 0.2), '#211846', 'filter="url(#RIM)"') +
      '</g>';
  }

  function mane() {
    var s = '', L = [
      // [x, y, ang, len, w, bend]
      [168, 130, 205, 70, 13, -0.12], [166, 150, 180, 90, 15, -0.16], [164, 170, 160, 100, 15, -0.14], [170, 190, 130, 110, 14, -0.08],
      [178, 196, 115, 120, 13, -0.05], [232, 130, -25, 80, 13, 0.14], [236, 150, 0, 105, 15, 0.16], [238, 170, 18, 120, 15, 0.13],
      [232, 190, 45, 125, 14, 0.08], [222, 196, 65, 130, 13, 0.05], [176, 112, 235, 50, 10, -0.1], [224, 112, -55, 54, 10, 0.12],
      [160, 160, 195, 60, 10, -0.25], [240, 160, -15, 66, 10, 0.25], [244, 178, 30, 95, 11, 0.2], [158, 178, 150, 80, 11, -0.2],
      [246, 140, -8, 120, 12, 0.2], [154, 140, 188, 96, 12, -0.2], [250, 196, 50, 120, 12, 0.1], [150, 196, 128, 104, 12, -0.1], [246, 120, -35, 70, 10, 0.2]
    ];
    L.forEach(function (l) { l = l.slice(); l[4] *= 1.45; s += path(lock.apply(null, l), '#0d0718'); });
    s = path(smooth([[150, 106], [200, 86], [252, 104], [272, 146], [266, 196], [236, 214], [164, 214], [132, 196], [126, 148]], true), '#0d0718') + s;
    var hi = '';
    [[164, 150, 180, 84, 2, -0.16], [166, 170, 160, 92, 2, -0.14], [236, 150, 0, 98, 2, 0.16], [238, 170, 18, 110, 2, 0.13], [244, 178, 30, 88, 1.6, 0.2]].forEach(function (l, i) {
      if (i % 2 === 0) hi += path(lock.apply(null, l), i < 2 ? MAG : LIL, 'opacity=".22"');
    });
    return '<g filter="url(#RIM)">' + s + '</g>' + hi;
  }

  function club(p) {
    var s = '';
    // ring + handle up-left of the fist
    s += '<circle cx="40" cy="103" r="12.5" fill="none" stroke="#1d1830" stroke-width="6.5" filter="url(#RIM)"/>';
    s += '<path d="M29 96a12.5 12.5 0 0 1 17-5" fill="none" stroke="#ffd2fa" stroke-width="1.6" stroke-linecap="round"/>';
    s += path(rib([[48, 113, 4.6], [66, 135, 4.8], [86, 159, 5.4], [98, 174, 6]], 2), '#1d1830', 'filter="url(#RIM)"');
    for (var i = 0; i < 4; i++) { var x = 52 + i * 5.2, y = 118 + i * 6.3; s += '<path d="M' + P(x - 4, y + 3.4) + 'l8 -6.6" stroke="#3a3160" stroke-width="1.4"/>'; }
    // the studded iron body, resting on the shoulder (its far end goes behind him)
    var body = [[94, 170, 9], [104, 182, 15], [120, 201, 19], [140, 225, 21], [158, 246, 21]];
    s += path(rib(body, 4), '#1a1530', 'filter="url(#RIM)"');
    s += path(band(body, -0.35, 0.35, 4), '#2c2550') + path(band(body, 0.35, 0.62, 4), '#3e3570', 'opacity=".7"');
    s += path(rib([[92, 167, 9.5], [95, 171, 9.8]], 1), '#5a4a2a') + path(rib([[92, 167, 9.5], [93, 168.5, 9.6]], 1), 'url(#' + p + 'gold)', 'opacity=".9"');
    // studs on both edges and down the middle
    var c = cr(body, 4);
    for (var k = 2; k < c.length - 2; k += 2) {
      var a = c[k - 1], b = c[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy), nx = -dy / l, ny = dx / l, w = c[k][2];
      [-1, 1].forEach(function (sd) {
        var bx = c[k][0] + nx * w * sd * 0.9, by = c[k][1] + ny * w * sd * 0.9;
        s += path(poly([[bx - dx / l * 3.5, by - dy / l * 3.5], [bx + nx * sd * 8, by + ny * sd * 8], [bx + dx / l * 3.5, by + dy / l * 3.5]]), sd < 0 ? '#5c4f8c' : '#2a2346');
      });
      s += path(poly([[c[k][0] - 3, c[k][1]], [c[k][0], c[k][1] - 3.4], [c[k][0] + 3, c[k][1]], [c[k][0], c[k][1] + 3.4]]), '#8a7cc8') +
        '<circle cx="' + f(c[k][0] - 0.8) + '" cy="' + f(c[k][1] - 1) + '" r=".8" fill="#fff"/>';
    }
    return s;
  }

  function torso() {
    var s = '';
    var T = [[182, 176], [176, 198], [150, 207], [124, 218], [108, 238], [116, 272], [128, 310], [136, 360], [140, 412], [200, 420], [260, 412], [264, 360], [272, 310], [284, 272], [294, 238], [278, 216], [250, 207], [224, 198], [218, 176]];
    s += path(smooth(T, true), 'url(#TORSO)', 'filter="url(#RIM)"');
    // neck & collarbones
    s += plane(smooth([[182, 188], [200, 196], [218, 188], [214, 206], [200, 214], [186, 206]], true), '#1f1538', 'url(#LIT)', 0.6);
    s += path(rib([[156, 214, .4], [176, 217, 1.6], [196, 224, .4]]), INK) + path(rib([[244, 214, .4], [224, 217, 1.6], [204, 224, .4]]), INK);
    // pecs: lit top plane + deep underside
    var pecL = [[150, 222], [196, 228], [201, 260], [195, 292], [166, 302], [138, 292], [124, 266], [130, 238]];
    var pecR = mirror(pecL);
    s += plane(smooth(pecL, true), PLANE) + plane(smooth(pecR, true), PLANE);
    s += path(rib([[126, 282, .5], [146, 297, 2.6], [172, 303, 3.4], [195, 294, 2.2], [201, 270, .6]]), DEEP);
    s += path(rib([[274, 282, .5], [254, 297, 2.6], [228, 303, 3.4], [205, 294, 2.2], [199, 270, .6]]), DEEP);
    s += path(rib([[200, 232, .3], [200, 262, 1.3], [200, 300, 1], [200, 396, 1.2]]), INK);
    // abs
    var rows = [[306, 330], [336, 358], [364, 388]];
    rows.forEach(function (r, i) {
      [[171 + i * 2, 198], [202, 229 - i * 2]].forEach(function (c) {
        s += plane(smooth([[c[0] + 3, r[0]], [c[1] - 2, r[0] + 1], [c[1], (r[0] + r[1]) / 2], [c[1] - 2, r[1]], [c[0] + 2, r[1] - 1], [c[0], (r[0] + r[1]) / 2]], true), PLANE, 'url(#LIT)', 0.85);
      });
      s += path(rib([[168 + i * 2, r[1] + 3, .4], [200, r[1] + 4, 1.6], [232 - i * 2, r[1] + 3, .4]]), DEEP);
    });
    // obliques / serratus
    [[[140, 304, .3], [152, 314, 1.8], [160, 330, .3]], [[144, 330, .3], [154, 342, 1.6], [160, 360, .3]], [[260, 304, .3], [248, 314, 1.8], [240, 330, .3]], [[256, 330, .3], [246, 342, 1.6], [240, 360, .3]],
      [[150, 368, .3], [164, 392, 2], [178, 408, .3]], [[250, 368, .3], [236, 392, 2], [222, 408, .3]]].forEach(function (l) { s += path(rib(l), DEEP); });
    // inner rim accents (light skimming the muscles)
    s += path(band([[132, 240, 3], [126, 266, 3.5], [136, 290, 3]], 0.3, 1), MAG, 'opacity=".55"');
    s += path(band([[268, 240, 3], [274, 266, 3.5], [264, 290, 3]], -1, -0.3), LIL, 'opacity=".5"');
    s += path(band([[170, 307, 1.6], [168, 330, 1.8], [171, 360, 1.8], [173, 386, 1.4]], 0.2, 1), MAG, 'opacity=".45"');
    s += path(band([[230, 307, 1.6], [232, 330, 1.8], [229, 360, 1.8], [227, 386, 1.4]], -1, -0.2), LIL, 'opacity=".4"');
    // the X scar
    s += path(rib([[166, 312, .4], [200, 350, 2.6], [236, 392, .4]]), '#5a3f86') + path(rib([[236, 310, .4], [200, 350, 2.6], [168, 394, .4]]), '#5a3f86');
    s += '<g class="kb-lit" opacity="0">' + path(rib([[166, 312, .3], [200, 350, 1.4], [236, 392, .3]]), '#efe4ff') + path(rib([[236, 310, .3], [200, 350, 1.4], [168, 394, .3]]), '#efe4ff') + '</g>';
    return s;
  }

  function armRight(p) { // viewer's right: Kaido's left arm, hand on hip, scale tattoo
    var s = '';
    var up = [[250, 210], [280, 205], [308, 216], [330, 240], [348, 270], [360, 302], [362, 330], [348, 346], [328, 336], [314, 306], [298, 282], [276, 264], [256, 248]];
    var fo = [[334, 326], [357, 324], [366, 346], [354, 372], [332, 396], [314, 410], [298, 404], [300, 388], [318, 366], [332, 344]];
    s += path(smooth(up, true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[262, 214], [290, 210], [316, 226], [334, 250], [318, 256], [292, 240], [266, 232]], true), PLANE);
    s += path(smooth(fo, true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[340, 330], [356, 334], [354, 356], [336, 380], [324, 384], [334, 356]], true), PLANE, 'url(#LIT)', 0.8);
    // smouldering scale tattoo on shoulder and upper arm
    var tat = smooth([[244, 212], [282, 207], [310, 218], [332, 242], [350, 274], [356, 300], [338, 300], [316, 284], [296, 266], [270, 254], [252, 246], [246, 228]], true);
    s += '<g class="kb-tat" opacity=".7">' + path(tat, 'url(#' + p + 'scl)') + path(tat, 'url(#' + p + 'ember)', 'opacity=".9"') + '</g>';
    s += path(band([[300, 214, 4], [334, 244, 5], [356, 292, 4]], -1, 0.1), BASE, 'opacity=".55"');
    s += path(rib([[322, 300, .3], [336, 320, 1.8], [346, 336, .3]]), DEEP);
    // skull tattoo near the wrist
    s += '<g transform="translate(338,368) rotate(-35)" fill="#ece4ff" opacity=".85"><circle r="4.2" cy="-1"/><rect x="-2.6" y="1.5" width="5.2" height="3" rx="1"/>' +
      '<circle cx="-1.6" cy="-1" r="1.1" fill="' + BASE + '"/><circle cx="1.6" cy="-1" r="1.1" fill="' + BASE + '"/>' +
      '<path d="M-8 -6L8 8M8 -6L-8 8" stroke="#ece4ff" stroke-width="1.4" opacity=".8"/></g>';
    s += wristband(311, 398, -0.573, 0.819, 15, 7.5, 'url(#' + p + 'gold)');
    return s;
  }

  function handHip(p) {
    var s = path(smooth([[308, 398], [292, 393], [276, 400], [268, 414], [276, 428], [296, 432], [312, 422], [318, 406]], true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[300, 400], [286, 400], [276, 410], [290, 412], [304, 408]], true), PLANE, 'url(#LIT)', 0.8);
    s += path(rib([[276, 414, .3], [288, 418, 1.2], [300, 416, .3]]), INK) + path(rib([[278, 422, .3], [290, 426, 1.1], [302, 424, .3]]), INK);
    return s;
  }

  function armLeft(p) { // viewer's left: Kaido's right arm, raised, fist gripping Hassaikai
    var s = '';
    var up = [[148, 226], [134, 210], [108, 207], [84, 218], [62, 238], [42, 262], [30, 290], [38, 314], [58, 318], [80, 300], [104, 282], [126, 266], [146, 250]];
    s += path(smooth(up, true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[126, 222], [100, 218], [76, 236], [58, 262], [56, 280], [80, 268], [108, 252], [132, 240]], true), PLANE);
    s += path(rib([[60, 290, .3], [90, 276, 2.4], [126, 258, .3]]), DEEP);
    var fo = [[30, 300], [24, 272], [32, 240], [46, 210], [58, 188], [90, 190], [94, 208], [82, 240], [72, 272], [66, 300], [50, 320]];
    s += path(smooth(fo, true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[38, 290], [34, 262], [46, 230], [58, 206], [66, 210], [56, 244], [48, 276]], true), PLANE, 'url(#LIT)', 0.85);
    s += path(band([[36, 296, 3], [32, 262, 3], [44, 226, 3], [58, 198, 2]], 0.2, 1), MAG, 'opacity=".5"');
    s += wristband(75, 190, 0.26, -0.966, 17, 8, 'url(#' + p + 'gold)');
    // fist around the handle
    var fist = [[60, 172], [54, 154], [60, 138], [78, 130], [97, 136], [104, 152], [98, 170], [80, 178]];
    s += path(smooth(fist, true), BASE, 'filter="url(#RIM)"');
    s += plane(smooth([[60, 150], [66, 138], [80, 133], [94, 138], [86, 146], [70, 150]], true), PLANE, 'url(#LIT)', 0.9);
    [[62, 148, 98, 144], [60, 157, 100, 155], [62, 166, 98, 165]].forEach(function (k) { s += path(rib([[k[0], k[1], .3], [(k[0] + k[2]) / 2, (k[1] + k[3]) / 2 + 1.5, 1.1], [k[2], k[3], .3]]), INK); });
    s += path(rib([[96, 138, .3], [102, 150, 1.2], [98, 166, .3]]), INK);
    s += '<path d="M62 141q14 -10 30 -5" fill="none" stroke="' + MAG + '" stroke-width="1.4" opacity=".8"/>';
    return s;
  }

  function head(p) {
    var s = '';
    // front dreadlocks between the horns
    var dl = '';
    [[190, 120, -104, 48, 5.5, -0.12], [200, 116, -97, 46, 6.5, -0.1], [210, 120, -74, 50, 5.5, 0.14], [181, 124, -122, 40, 5, -0.2], [219, 124, -58, 42, 5, 0.2], [195, 118, -100, 34, 4.5, -0.3], [206, 118, -80, 38, 4.5, 0.3]].forEach(function (l) { dl += path(lock.apply(null, l), '#0d0718'); });
    s += '<g filter="url(#RIM)">' + dl + '</g>';
    // face
    var face = [[178, 122], [200, 114], [222, 122], [228, 140], [227, 158], [222, 176], [212, 190], [200, 196], [188, 190], [178, 176], [173, 158], [172, 140]];
    s += path(smooth(face, true), '#1a1130', 'filter="url(#RIM)"');
    s += plane(smooth([[180, 124], [200, 118], [220, 124], [223, 136], [200, 141], [177, 136]], true), '#2a1d4c', 'url(#LIT)', 0.85);
    s += plane(smooth([[175, 150], [186, 155], [190, 163], [180, 166], [174, 158]], true), '#241a42', 'url(#LIT)', 0.8);
    s += plane(smooth([[225, 150], [214, 155], [210, 163], [220, 166], [226, 158]], true), '#241a42', 'url(#LIT)', 0.8);
    s += plane(smooth([[197, 146], [203, 146], [206, 163], [200, 167], [194, 163]], true), '#2a1d4c', 'url(#LIT)', 0.9);
    s += path(smooth([[174, 166], [186, 172], [200, 175], [214, 172], [226, 166], [222, 180], [212, 191], [200, 197], [188, 191], [178, 180]], true), '#0d0818', 'opacity=".85"');
    s += path(smooth([[191, 164], [200, 170], [209, 164], [207, 169], [200, 173], [193, 169]], true), INK);
    s += path(rib([[191, 163, .3], [186, 172, 1.2], [184, 179, .3]]), INK) + path(rib([[209, 163, .3], [214, 172, 1.2], [216, 179, .3]]), INK);
    // eye sockets, eyes (burning gold), brows
    s += path(smooth([[177, 145], [196, 148], [198, 157], [180, 156]], true), INK) + path(smooth([[223, 145], [204, 148], [202, 157], [220, 156]], true), INK);
    s += '<g class="kb-eye"><circle cx="188" cy="152.5" r="10" fill="url(#' + p + 'eye)"/><circle cx="212" cy="152.5" r="10" fill="url(#' + p + 'eye)"/>' +
      '<g filter="url(#' + p + 'geye)" fill="#ffb000"><ellipse cx="188" cy="152.5" rx="7" ry="3.2"/><ellipse cx="212" cy="152.5" rx="7" ry="3.2"/></g></g>';
    var eyeL = [[180.5, 150], [189, 150.3], [196, 153.6], [188, 155.6], [182.5, 154]];
    s += path(poly(eyeL), '#ffd23a') + path(poly(mirror(eyeL)), '#ffd23a');
    s += '<ellipse cx="189" cy="152.6" rx="3.2" ry="1.4" fill="#fffbe0"/><ellipse cx="211" cy="152.6" rx="3.2" ry="1.4" fill="#fffbe0"/>';
    s += '<circle cx="190" cy="153" r="1.1" fill="#2a0a00"/><circle cx="210" cy="153" r="1.1" fill="#2a0a00"/>';
    var brow = [[171, 137, 1.4], [179, 137.5, 3.8], [189, 140.8, 4], [197.5, 147.5, 1.6]];
    s += path(rib(brow), INK) + path(rib(mirror(brow)), INK);
    s += path(band(brow, -1, -0.55), MAG, 'opacity=".9"') + path(band(mirror(brow), 0.55, 1), LIL, 'opacity=".9"');
    s += path(rib([[198, 136, .3], [198.6, 141, .9], [198, 146, .3]]), INK) + path(rib([[202, 136, .3], [201.4, 141, .9], [202, 146, .3]]), INK);
    // gritted-teeth snarl
    s += '<path d="M181 176Q191 170 200 171.5Q209 170 219 176Q217 186 209 190Q200 192 191 190Q183 186 181 176Z" fill="#070310"/>';
    s += '<path d="M184.5 176.8Q200 172.6 215.5 176.8L214 181.4Q200 179.8 186 181.4Z" fill="#cdc1ea"/>';
    s += '<path d="M187 184.2Q200 182.4 213 184.2L210 188.4Q200 190 190 188.4Z" fill="#a597cc"/>';
    s += '<g stroke="#2d2248" stroke-width=".8">' + [188.5, 192.5, 196.5, 200, 203.5, 207.5, 211.5].map(function (x) { return '<path d="M' + x + ' 175v6"/>'; }).join('') +
      [191, 195.5, 200, 204.5, 209].map(function (x) { return '<path d="M' + x + ' 183v6"/>'; }).join('') + '</g>';
    s += '<path d="M185 177l2.4 6 1.6-6.4zM215 177l-2.4 6-1.6-6.4z" fill="#efe8ff"/>';
    s += '<path d="M182 176Q191 170.5 200 172Q209 170.5 218 176" fill="none" stroke="' + INK + '" stroke-width="1.6"/>';
    // goatee
    s += path(smooth([[188, 186], [200, 190], [212, 186], [210, 200], [204, 216], [200, 228, 0], [196, 216], [190, 200]], true), '#0a0613', 'filter="url(#RIM)"');
    s += path(rib([[204, 192, .3], [206, 204, .8], [202, 220, .2]]), LIL, 'opacity=".4"');
    // hair cap with a jagged hairline, sideburns
    s += path(poly([[169, 136], [171, 116], [186, 102], [200, 98], [214, 102], [229, 116], [231, 136], [223, 126], [216, 130], [208, 121], [200, 128], [192, 121], [184, 130], [177, 126]]), '#0d0718', 'filter="url(#RIM)"');
    s += path(rib([[175, 126, 5], [170, 146, 6], [171, 168, 4], [176, 186, .5]]), '#0d0718') + path(rib([[225, 126, 5], [230, 146, 6], [229, 168, 4], [224, 186, .5]]), '#0d0718');
    // horns: out from the temples, then up into thick crescents
    var hl = [[181, 128, 10], [163, 131, 11.5], [143, 123, 11], [128, 104, 9], [120, 80, 7.2], [118, 56, 5.2], [122, 38, 3], [128, 25, 0.4]];
    [hl, mirror(hl)].forEach(function (h, i) {
      var sd = i ? -1 : 1, id = p + 'hg' + i;
      s += '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + h[0][0] + '" y1="' + h[0][1] + '" x2="' + h[7][0] + '" y2="' + h[7][1] + '"><stop offset="0" stop-color="#4f3d6a"/><stop offset=".22" stop-color="#a8949e"/><stop offset=".5" stop-color="#e9dcc2"/><stop offset="1" stop-color="#fff7e4"/></linearGradient>';
      s += path(rib(h, 5), 'url(#' + id + ')', 'filter="url(#RIM)"');
      s += path(band(h, -sd, -sd * 0.15, 5), '#3f2f5c', 'opacity=".55"');
      s += path(band(h, -sd, -sd * 0.7, 5), '#251a3e', 'opacity=".5"');
      for (var k = 1; k < 4; k++) {
        var c = cr(h, 5)[k * 3], q = cr(h, 5)[k * 3 + 1], dx = q[0] - c[0], dy = q[1] - c[1], l = Math.sqrt(dx * dx + dy * dy), nx = -dy / l, ny = dx / l, w = c[2] * 0.95;
        s += '<path d="M' + P(c[0] + nx * w, c[1] + ny * w) + 'Q' + P(c[0] + dx / l * 2.5, c[1] + dy / l * 2.5) + ' ' + P(c[0] - nx * w, c[1] - ny * w) + '" fill="none" stroke="#3a2a52" stroke-width=".9" opacity=".5"/>';
      }
      s += path(band(h, sd * 0.35, sd * 0.72, 5), '#fffaf0', 'filter="url(#' + p + 'glow)" opacity=".95"');
      s += '<path class="kb-lit" d="' + rib(h, 5) + '" fill="#fff6ea" opacity="0" data-o=".45"/>';
    });
    return '<g transform="rotate(-5 200 170)">' + s + '</g>';
  }

  function mustache() {
    var Lm = [[186, 173, 1.6], [178, 179, 2], [172, 193, 2.2], [170, 220, 2.2], [174, 255, 2], [167, 290, 1.8], [172, 325, 1.5], [165, 360, 1.1], [169, 390, 0.3]];
    var Rm = [[214, 171, 1.6], [222, 177, 2], [228, 192, 2.2], [231, 220, 2.2], [226, 255, 2], [233, 290, 1.8], [228, 325, 1.5], [235, 360, 1.1], [231, 392, 0.3]];
    return path(rib(Lm, 4), '#06030c') + path(band(Lm, 0.3, 1, 4), MAG, 'opacity=".75"') +
      path(rib(Rm, 4), '#06030c') + path(band(Rm, -1, -0.3, 4), LIL, 'opacity=".7"');
  }

  function waist(p) {
    var s = '';
    // hakama
    s += path(smooth([[134, 416, 0], [266, 416, 0], [298, 470], [324, 600, 0], [76, 600, 0], [102, 470]], true), 'url(#' + p + 'hak)', 'filter="url(#RIM)"');
    [[[200, 446, .3], [203, 500, 2.4], [206, 600, 3]], [[150, 450, .3], [138, 520, 2], [128, 600, 2.6]], [[250, 450, .3], [262, 520, 2], [272, 600, 2.6]], [[176, 452, .3], [172, 520, 1.4], [170, 600, 1.6]], [[226, 452, .3], [230, 520, 1.4], [234, 600, 1.6]]]
      .forEach(function (l) { s += path(rib(l), '#040209'); });
    s += path(band([[150, 452, 3], [139, 520, 4], [130, 600, 4]], 0.4, 1.4), '#2c2150', 'opacity=".6"') + path(band([[250, 452, 3], [261, 520, 4], [270, 600, 4]], -1.4, -0.4), '#2c2150', 'opacity=".6"');
    // maroon striped sash
    s += path(smooth([[130, 410, 0], [200, 418], [270, 410, 0], [272, 442, 0], [200, 450], [128, 442, 0]], true), '#4a1022', 'filter="url(#RIM)"');
    [424, 432, 440].forEach(function (y) { s += path(rib([[131, y - 4, .5], [200, y + 3, 1.2], [270, y - 4, .5]]), '#7c1c36', 'opacity=".9"'); });
    // chains (behind the rope knots, hanging over the hakama)
    var g = 'url(#' + p + 'gold)';
    s += chain(144, 440, 202, 452, 22, 13, g) + chain(222, 452, 278, 438, 24, 13, g) + chain(132, 436, 160, 446, 34, 9, g);
    // shide paper streamers
    [[160, 420], [232, 422], [190, 428]].forEach(function (q, i) {
      var x = q[0], y = q[1], z = '';
      var Lp = [], Rp = [];
      for (var k = 0; k <= 5; k++) { var ox = x + (k % 2 ? 7 : 0), oy = y + k * 12; Lp.push([ox, oy + (k % 2 ? 3 : 0)]); Rp.unshift([ox + 8, oy + (k % 2 ? 0 : 3)]); }
      z = path(poly(Lp.concat(Rp)), '#f3eeff');
      for (k = 0; k < 5; k++) { var sx = x + (k % 2 ? 7 : 0), sy = y + k * 12; z += path(poly([[sx + 4, sy + 1.5], [sx + 8, sy + (k % 2 ? 0 : 3)], [sx + (k % 2 ? 1 : 15), sy + 12 + (k % 2 ? 3 : 0)], [sx + (k % 2 ? -3 : 11), sy + 12]]), '#9d90d0', 'opacity=".75"'); }
      s += '<g opacity="' + (i === 2 ? '.85' : '1') + '">' + z + '</g>';
    });
    // shimenawa: twisted rope + big knots catching the light
    var rope = [[124, 404, 6], [160, 410, 6.5], [200, 413, 7], [240, 410, 6.5], [276, 404, 6]];
    s += path(rib(rope, 4), 'url(#' + p + 'rope)', 'filter="url(#RIM)"');
    for (var x = 128; x < 274; x += 7) { var y = 404 + 9 * Math.sin((x - 124) / 152 * Math.PI) * 1; s += '<path d="M' + f(x) + ' ' + f(y - 5) + 'l4 10" stroke="#5a4a8c" stroke-width="1.2" opacity=".7"/>'; }
    [[146, 407, 12], [172, 411, 13], [200, 413, 13.5], [228, 411, 13], [254, 407, 12]].forEach(function (k) {
      s += '<ellipse cx="' + k[0] + '" cy="' + k[1] + '" rx="' + k[2] + '" ry="' + f(k[2] * 0.9) + '" fill="url(#' + p + 'knot)" filter="url(#RIM)"/>' +
        '<path d="M' + (k[0] - k[2] * 0.6) + ' ' + (k[1] - 4) + 'q' + f(k[2] * 0.6) + ' 9 ' + f(k[2] * 1.2) + ' 2" fill="none" stroke="#6a5aa0" stroke-width="1.1" opacity=".7"/>' +
        '<ellipse cx="' + f(k[0] + k[2] * 0.3) + '" cy="' + f(k[1] - k[2] * 0.45) + '" rx="3" ry="1.6" fill="#fff" opacity=".9"/>';
    });
    // glints on the gold
    s += sparkle(160, 470, 5) + sparkle(266, 476, 4.5);
    return s;
  }

  function sparkle(x, y, r) {
    return '<path class="kb-glint" d="M' + x + ' ' + (y - r) + 'L' + f(x + r * 0.22) + ' ' + f(y - r * 0.22) + 'L' + (x + r) + ' ' + y + 'L' + f(x + r * 0.22) + ' ' + f(y + r * 0.22) + 'L' + x + ' ' + (y + r) + 'L' + f(x - r * 0.22) + ' ' + f(y + r * 0.22) + 'L' + (x - r) + ' ' + y + 'L' + f(x - r * 0.22) + ' ' + f(y - r * 0.22) + 'Z" fill="#fff" filter="url(#GLOW)"/>';
  }

  function embers(r) {
    var s = '';
    for (var i = 0; i < 16; i++) {
      var x = 20 + r() * 360, y = 260 + r() * 260, rr = 0.8 + r() * 1.4;
      s += '<circle class="kb-ember" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rr) + '" fill="' + (i % 3 ? '#ffb347' : '#ff6a2a') + '" style="animation-delay:-' + f(r() * 7) + 's"/>';
    }
    return '<g filter="url(#GLOW)">' + s + '</g>';
  }

  var CSS = '@media (prefers-reduced-motion: no-preference){' +
    '.kaido-backlit .kb-lit{animation:kbLit 7s ease-out infinite}' +
    '.kaido-backlit .kb-flash{animation:kbFlash 7s ease-out infinite}' +
    '.kaido-backlit .kb-bolt{animation:kbBolt 7s ease-out infinite}' +
    '.kaido-backlit .kb-eye{animation:kbEye 2.6s ease-in-out infinite}' +
    '.kaido-backlit .kb-tat{animation:kbTat 3.4s ease-in-out infinite}' +
    '.kaido-backlit .kb-glint{animation:kbGlint 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
    '.kaido-backlit .kb-ember{animation:kbEmber 7s linear infinite}' +
    '@keyframes kbLit{0%,62%{opacity:0}63.5%{opacity:calc(var(--o,1)*.95)}65%{opacity:calc(var(--o,1)*.25)}66.5%{opacity:calc(var(--o,1)*.9)}80%,100%{opacity:0}}' +
    '@keyframes kbFlash{0%,62%{opacity:0}63.5%{opacity:.55}65%{opacity:.1}66.5%{opacity:.45}76%,100%{opacity:0}}' +
    '@keyframes kbBolt{0%,61%{opacity:.55}63%{opacity:1}65%{opacity:.4}66.5%{opacity:1}78%,100%{opacity:.55}}' +
    '@keyframes kbEye{0%,100%{opacity:.75}50%{opacity:1}}' +
    '@keyframes kbTat{0%,100%{opacity:.7}40%{opacity:.95}70%{opacity:.78}}' +
    '@keyframes kbGlint{0%,70%,100%{opacity:.2;transform:scale(.4)}85%{opacity:1;transform:scale(1.15)}}' +
    '@keyframes kbEmber{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(14px,-120px);opacity:0}}' +
    '}';
  function injectStyle() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('k-kaido-backlit-style')) return;
    var st = document.createElement('style');
    st.id = 'k-kaido-backlit-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  A.kaidoVariants['backlit'] = {
    name: 'Tormenta',
    svg: function (opts) {
      opts = opts || {};
      injectStyle();
      var p = 'kb' + (++uid) + '-', r = seeded(1977);
      var art = background(p, r) + cloak(p) + mane() + club(p) + torso() + armRight(p) + waist(p) + handHip(p) + armLeft(p) + mustache() + head(p) +
        sparkle(30, 93, 9) + sparkle(98, 168, 4) + sparkle(64, 182, 4.5) +
        '<rect x="-20" y="-20" width="440" height="600" fill="url(#' + p + 'rain)" opacity=".16" transform="translate(9 21)"/>' +
        embers(r) +
        '<rect class="kb-flash" x="-10" y="-10" width="420" height="580" fill="url(#' + p + 'flash)" opacity="0" style="mix-blend-mode:screen"/>';
      // resolve the short ids used by the part builders
      art = art.replace(/url\(#RIM\)/g, 'url(#' + p + 'rim)').replace(/url\(#GLOW\)/g, 'url(#' + p + 'glow)').replace(/url\(#LIT\)/g, 'url(#' + p + 'LIT)')
        .replace(/url\(#PL\)/g, 'url(#' + p + 'PL)').replace(/url\(#TORSO\)/g, 'url(#' + p + 'torso)')
        .replace(/class="kb-lit" ([^>]*?)opacity="0" data-o="([\d.]+)"/g, 'class="kb-lit" $1opacity="0" style="--o:$2"');
      return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-backlit ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido">' +
        defs(p) + '<g mask="url(#' + p + 'mask)">' + art + '</g></svg>';
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
