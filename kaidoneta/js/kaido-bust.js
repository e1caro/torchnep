/* Kaidoneta art: Kaido "Close-up", an original anime key-art bust drawn by hand in SVG (no official artwork).
 * Low-angle 3/4 head-and-shoulders: huge glossy horns, a wild mane blowing to one side with dreadlocks, a snarl,
 * glowing eyes, long mustache strands, the fur cloak, the scale tattoo and Hassaikai's handle and ring, over manga
 * focus lines and a lightning burst. K.art.kaidoVariants.bust.svg(opts) returns the SVG string.
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

  // Smooth path through points [x, y] (Catmull-Rom as cubic Beziers); a third value 0 makes that point a corner.
  function smooth(pts, closed) {
    var n = pts.length, d = 'M' + P(pts[0][0], pts[0][1]), last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      var a = p1[2] === 0 ? 0 : 1 / 6, b = p2[2] === 0 ? 0 : 1 / 6;
      d += 'C' + P(p1[0] + (p2[0] - p0[0]) * a, p1[1] + (p2[1] - p0[1]) * a) + ' ' + P(p2[0] - (p3[0] - p1[0]) * b, p2[1] - (p3[1] - p1[1]) * b) + ' ' + P(p2[0], p2[1]);
    }
    return d + (closed ? 'Z' : '');
  }
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
  // A tapered filled stroke (thick-thin ink line, hair lock, horn...) along [x, y, halfWidth] points.
  // side: 0 centred; 1 or -1 grows to one side only (for contour lines that hug an edge).
  function rib(pts, seg, side) {
    var c = cr(pts, seg || 3), n = c.length, L = [], R = [];
    for (var i = 0; i < n; i++) {
      var a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / l, ny = dx / l, w = Math.max(0, c[i][2]), x = c[i][0], y = c[i][1];
      var k0 = side ? (side > 0 ? 0 : -2) : -1, k1 = side ? (side > 0 ? 2 : 0) : 1;
      L.push([x + nx * w * k1, y + ny * w * k1]);
      R.unshift([x + nx * w * k0, y + ny * w * k0]);
    }
    L[0][2] = 0; L[n - 1][2] = 0; R[0][2] = 0; R[n - 1][2] = 0;
    return smooth(L.concat(R), true);
  }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }

  var INK = '#0a0510';

  function art(i) {
    var id = function (s) { return s + i; }, url = function (s) { return 'url(#' + s + i + ')'; };
    var defs = '', o = '';

    /* ---------- defs ---------- */
    defs += '<radialGradient id="' + id('bg') + '" cx="200" cy="170" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5b21b6"/><stop offset=".35" stop-color="#2e1065"/><stop offset=".75" stop-color="#160a2b"/><stop offset="1" stop-color="#12081f" stop-opacity="0"/></radialGradient>';
    defs += '<radialGradient id="' + id('burst') + '" cx="205" cy="140" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" stop-color="#e9d5ff" stop-opacity=".8"/><stop offset=".45" stop-color="#a855f7" stop-opacity=".45"/><stop offset="1" stop-color="#6d28d9" stop-opacity="0"/></radialGradient>';
    defs += '<linearGradient id="' + id('fade') + '" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse"><stop offset=".72" stop-color="#fff"/><stop offset=".97" stop-color="#000"/></linearGradient>';
    defs += '<mask id="' + id('m') + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="440" height="600"><rect x="-20" y="-20" width="440" height="600" fill="' + url('fade') + '"/></mask>';
    defs += '<filter id="' + id('glow') + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>';

    /* ---------- background ---------- */
    o += '<rect x="-20" y="-20" width="440" height="600" fill="' + url('bg') + '"/>';
    o += '<circle cx="205" cy="140" r="150" fill="' + url('burst') + '"/>';

    /* ---------- club handle + ring (behind) ---------- */
    o += path(rib([[122, 360, 8], [86, 280, 8], [54, 204, 7.5]], 2), '#2a2438', ' stroke="' + INK + '" stroke-width="2"');
    o += '<circle cx="44" cy="182" r="18" fill="none" stroke="' + INK + '" stroke-width="10"/><circle cx="44" cy="182" r="18" fill="none" stroke="#4b4360" stroke-width="6"/>';

    /* ---------- mane (behind) ---------- */
    var mane = smooth([[132, 118], [160, 96], [205, 86], [250, 94], [295, 116], [340, 142], [385, 170], [412, 210], [414, 300], [398, 345], [330, 330], [280, 312], [200, 300], [130, 322], [112, 290], [118, 230], [124, 170]], true);
    o += path(mane, '#140a1f');
    var locks = [
      [[300, 120, 14], [345, 128, 12], [385, 140, 8], [420, 150, 0]],
      [[320, 160, 16], [365, 175, 13], [400, 200, 8], [430, 225, 0]],
      [[330, 210, 18], [370, 235, 14], [400, 270, 8], [425, 300, 0]],
      [[320, 260, 16], [355, 295, 12], [385, 330, 7], [410, 360, 0]],
      [[300, 290, 14], [330, 330, 10], [350, 370, 5], [365, 400, 0]],
      [[260, 100, 10], [300, 88, 8], [340, 92, 5], [372, 100, 0]],
      [[132, 200, 10], [112, 240, 9], [100, 285, 6], [96, 320, 0]]
    ];
    locks.forEach(function (l) { o += path(rib(l, 3), '#140a1f'); });
    var dreads = [
      [[178, 116, 6], [168, 96, 5], [170, 74, 4], [182, 58, 0]],
      [[170, 120, 7], [160, 92, 6.5], [156, 66, 5.5], [162, 42, 0]],
      [[188, 110, 7.5], [184, 78, 7], [188, 50, 6], [200, 26, 0]],
      [[206, 108, 8], [210, 74, 7], [222, 46, 6], [240, 26, 0]],
      [[224, 110, 7.5], [236, 82, 6.5], [254, 60, 5], [276, 48, 0]],
      [[240, 116, 7], [260, 96, 6], [284, 84, 4.5], [306, 80, 0]]
    ];
    dreads.forEach(function (l) { o += path(rib(l, 3), '#1c1030', ' stroke="' + INK + '" stroke-width="1.5"'); });

    /* ---------- fur (behind shoulders) ---------- */
    o += path(smooth([[-20, 300], [30, 296], [80, 305], [125, 318], [150, 336], [140, 365], [110, 385], [90, 430], [80, 500], [70, 570], [-20, 570]], true), '#2a2370');
    o += path(smooth([[268, 316], [310, 300], [360, 292], [410, 290], [430, 330], [430, 570], [400, 570], [400, 420]], true), '#2a2370');

    /* ---------- horns ---------- */
    var hornL = rib([[150, 158, 17], [124, 160, 17], [100, 150, 15.5], [82, 128, 13], [71, 98, 10.5], [66, 64, 8], [66, 34, 5], [70, 8, 0]], 4);
    var hornR = rib([[262, 152, 19], [292, 156, 19], [322, 146, 17], [343, 122, 14], [355, 90, 11], [359, 54, 8], [356, 22, 4.5], [348, -6, 0]], 4);
    o += path(hornL, '#efe4cc', ' stroke="' + INK + '" stroke-width="2.5"');
    o += path(hornR, '#efe4cc', ' stroke="' + INK + '" stroke-width="2.5"');

    /* ---------- torso ---------- */
    o += path(smooth([[160, 262], [150, 300], [120, 326], [70, 340], [20, 360], [-10, 400], [-10, 570, 0], [410, 570, 0], [410, 380], [380, 345], [320, 325], [278, 305], [262, 262]], true), '#c98552', ' stroke="' + INK + '" stroke-width="2.5"');
    o += path(smooth([[300, 330], [345, 318], [390, 330], [415, 370], [415, 470], [380, 480], [340, 450], [312, 400]], true), '#c98552', ' stroke="' + INK + '" stroke-width="2.5"');

    /* ---------- head ---------- */
    o += path(smooth([[268, 192], [279, 186], [285, 198], [282, 218], [273, 232], [265, 228]], true), '#c98552', ' stroke="' + INK + '" stroke-width="2"');
    o += path(smooth([[150, 124], [143, 158], [145, 196], [149, 228], [158, 256], [176, 280], [197, 290], [221, 283], [247, 262], [263, 232], [270, 198], [268, 160], [258, 126], [205, 112]], true), '#c98552', ' stroke="' + INK + '" stroke-width="2.5"');
    // hair cap
    o += path(smooth([[140, 150], [146, 118], [175, 100], [215, 96], [255, 106], [274, 140], [262, 134], [235, 124], [205, 128, 0], [178, 124], [155, 134]], true), '#140a1f');
    // brows
    o += path(rib([[140, 174, 3], [160, 178, 5], [184, 190, 4]], 3), INK);
    o += path(rib([[198, 190, 4], [228, 180, 6], [262, 168, 3]], 3), INK);
    // eyes
    o += '<path d="M150,196 L172,194 L182,198 L166,203Z M206,198 L222,193 L246,192 L232,201Z" fill="#ffe27a"/>';
    // nose
    o += path(rib([[190, 196, 1], [184, 222, 2], [180, 234, 1]], 3), INK);
    // mouth
    o += path(smooth([[158, 252], [170, 244], [190, 242], [212, 243], [236, 248], [232, 262], [214, 270], [190, 272], [170, 268]], true), '#f4ecdc', ' stroke="' + INK + '" stroke-width="2.5"');
    // beard
    o += path(smooth([[176, 270], [190, 274], [210, 272], [228, 266], [226, 290], [214, 310], [202, 326, 0], [194, 312], [180, 296]], true), '#140a1f');
    // mustache
    o += path(rib([[180, 242, 1], [160, 252, 2.4], [146, 290, 2.6], [138, 360, 2.4], [138, 430, 2], [150, 500, 1.4], [160, 560, 0.5]], 3), INK);
    o += path(rib([[204, 242, 1], [234, 254, 2.4], [250, 296, 2.6], [262, 360, 2.4], [278, 430, 2], [298, 500, 1.4], [318, 560, 0.5]], 3), INK);

    return { defs: defs, body: o };
  }

  A.kaidoVariants['bust'] = {
    name: 'Close-up',
    svg: function (opts) {
      opts = opts || {};
      var i = 'kb' + (++uid), a = art(i);
      return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido kaido-bust ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido">' +
        '<defs>' + a.defs + '</defs><g mask="url(#m' + i + ')">' + a.body + '</g></svg>';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
