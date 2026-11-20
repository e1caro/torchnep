/* Kaido, King of the Beasts: the hero picture of Kaidoneta. An original SVG drawing (no official artwork): he stands
 * in a violet storm, seen from slightly below, club on his right shoulder and left fist on his hip, under huge horns.
 * K.art.kaido(opts) returns an SVG string. opts.cls: extra class; opts.bolts === false leaves out the lightning.
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  var uid = 0;

  function f(n) { return Math.round(n * 10) / 10; }
  function pt(p) { return f(p[0]) + ',' + f(p[1]); }
  function rng(seed) { var s = seed % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function dist(a, b) { var x = b[0] - a[0], y = b[1] - a[1]; return Math.sqrt(x * x + y * y); }

  // Catmull-Rom spline through pts, `per` samples per span.
  function spline(pts, per) {
    var out = [];
    for (var k = 0; k < pts.length - 1; k++) {
      var p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2;
      for (var j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t, q = [];
        for (var c = 0; c < 2; c++) {
          q.push(0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3));
        }
        out.push(q);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // The same curve as Bezier segments: a smooth outline through the points (closed or open).
  function curve(pts, closed) {
    var n = pts.length, d = 'M' + pt(pts[0]);
    for (var k = 0; k < (closed ? n : n - 1); k++) {
      var p0 = closed ? pts[(k - 1 + n) % n] : pts[Math.max(k - 1, 0)], p1 = pts[k], p2 = pts[(k + 1) % n];
      var p3 = closed ? pts[(k + 2) % n] : pts[Math.min(k + 2, n - 1)];
      d += 'C' + pt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' +
        pt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + pt(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  // Evenly spaced points along a spline.
  function resample(ctrl, step) {
    var dense = spline(ctrl, 14), out = [dense[0]], acc = 0;
    for (var k = 1; k < dense.length; k++) {
      acc += dist(dense[k - 1], dense[k]);
      if (acc >= step) { out.push(dense[k]); acc = 0; }
    }
    if (acc > step * 0.45) out.push(dense[dense.length - 1]); else out[out.length - 1] = dense[dense.length - 1];
    return out;
  }
  // Shift a polyline inwards (to the right of its direction of travel) by d.
  function inset(pts, d) {
    return pts.map(function (p, k) {
      var a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], l = dist(a, b) || 1;
      return [p[0] - (b[1] - a[1]) / l * d, p[1] + (b[0] - a[0]) / l * d];
    });
  }
  // A tapered strand along a centreline: hair lock, dreadlock, whisker.
  function strand(pts, w0, w1, per) {
    var c = spline(pts, per || 5), L = [], R = [];
    for (var k = 0; k < c.length; k++) {
      var a = c[Math.max(0, k - 1)], b = c[Math.min(c.length - 1, k + 1)], l = dist(a, b) || 1;
      var w = (w0 + (w1 - w0) * k / (c.length - 1)) / 2;
      L.push([c[k][0] - (b[1] - a[1]) / l * w, c[k][1] + (b[0] - a[0]) / l * w]);
      R.push([c[k][0] + (b[1] - a[1]) / l * w, c[k][1] - (b[0] - a[0]) / l * w]);
    }
    return 'M' + L.map(pt).join('L') + 'L' + R.reverse().map(pt).join('L') + 'Z';
  }
  // Flame-like tufts along an edge, growing to the left of the direction of travel (outwards for a clockwise shape).
  function tufts(pts, len, lean, seed) {
    var r = rng(seed), d = '';
    for (var k = 0; k < pts.length - 1; k++) {
      var a = pts[k], b = pts[k + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var tx = dx / l, ty = dy / l, nx = ty, ny = -tx, h = len * (0.45 + r() * 1.1), m = 0.25 + r() * 0.4, lz = (lean + (r() - 0.5) * 0.5) * h;
      var tip = [a[0] + dx * m + nx * h + tx * lz, a[1] + dy * m + ny * h + ty * lz];
      var c1 = [a[0] + dx * m * 0.4 + nx * h * 0.7 + tx * lz * 0.3, a[1] + dy * m * 0.4 + ny * h * 0.7 + ty * lz * 0.3];
      var c2 = [a[0] + dx * (m + (1 - m) * 0.55) + nx * h * 0.2, a[1] + dy * (m + (1 - m) * 0.55) + ny * h * 0.2];
      d += 'Q' + pt(c1) + ' ' + pt(tip) + 'Q' + pt(c2) + ' ' + pt(b);
    }
    return d;
  }
  // A tufted mass: `edge` (clockwise, tufted) then straight back along `back`.
  function mass(edge, back, step, len, lean, seed) {
    var e = resample(edge, step);
    return 'M' + pt(e[0]) + tufts(e, len, lean, seed) + (back.length ? 'L' + back.map(pt).join('L') : '') + 'Z';
  }
  // A jagged lightning bolt with forks, as one path.
  function bolt(x1, y1, x2, y2, seed, jag, forks) {
    var r = rng(seed), dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), nx = -dy / len, ny = dx / len, n = 9;
    var pts = [[x1, y1]];
    for (var k = 1; k < n; k++) { var t = k / n, o = (r() - 0.5) * 2 * jag; pts.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]); }
    pts.push([x2, y2]);
    var d = 'M' + pts.map(pt).join('L');
    for (var j = 0; j < (forks || 0); j++) {
      var s = pts[2 + Math.floor(r() * (n - 4))], side = r() > 0.5 ? 1 : -1, fl = len * (0.25 + r() * 0.2);
      var ang = Math.atan2(dy, dx) + side * (0.45 + r() * 0.4), ex = s[0] + Math.cos(ang) * fl, ey = s[1] + Math.sin(ang) * fl;
      var q = [s], fx = ex - s[0], fy = ey - s[1];
      for (var m = 1; m < 5; m++) { var o2 = (r() - 0.5) * jag * 0.9; q.push([s[0] + fx * m / 5 - fy / fl * o2, s[1] + fy * m / 5 + fx / fl * o2]); }
      q.push([ex, ey]);
      d += 'M' + q.map(pt).join('L');
    }
    return d;
  }

  // Scalloped edge (tattoo border): bulges to the left of the direction of travel.
  function scallop(pts, depth) {
    var d = '';
    for (var k = 0; k < pts.length - 1; k++) {
      var a = pts[k], b = pts[k + 1], l = dist(a, b) || 1;
      d += 'Q' + pt([(a[0] + b[0]) / 2 + (b[1] - a[1]) / l * depth, (a[1] + b[1]) / 2 - (b[0] - a[0]) / l * depth]) + ' ' + pt(b);
    }
    return d;
  }
  // A layer of fur: the tufted edge, pushed inwards by `ins`, closed along `back`.
  function furLayer(edge, back, ins, step, len, lean, seed) {
    var e = inset(resample(edge, step), ins);
    return 'M' + pt(e[0]) + tufts(e, len, lean, seed) + 'L' + back.map(pt).join('L') + 'Z';
  }

  var CSS = '@media (prefers-reduced-motion: no-preference){' +
    '.kaido .kd-bolt{animation:kd-flick 7s steps(1,end) infinite}' +
    '.kaido .kd-b2{animation-duration:9s;animation-delay:-3s}.kaido .kd-b3{animation-duration:11s;animation-delay:-6s}.kaido .kd-b4{animation-duration:8s;animation-delay:-1.5s}' +
    '.kaido .kd-flash{animation:kd-flash 7s ease-out infinite}' +
    '.kaido .kd-eyeglow{animation:kd-eye 3.4s ease-in-out infinite}' +
    '.kaido .kd-p{transform-box:fill-box;animation:kd-rise 7s linear infinite}' +
    '@keyframes kd-flick{0%{opacity:.75}61%{opacity:.75}62%{opacity:1}63%{opacity:.12}64%{opacity:1}66%{opacity:.35}67%{opacity:.9}100%{opacity:.75}}' +
    '@keyframes kd-flash{0%,60%{opacity:0}62%{opacity:.55}64%{opacity:.1}65%{opacity:.4}75%,100%{opacity:0}}' +
    '@keyframes kd-eye{0%,100%{opacity:.55}50%{opacity:1}}' +
    '@keyframes kd-rise{0%{transform:translateY(0);opacity:0}12%{opacity:1}80%{opacity:.8}100%{transform:translateY(-110px);opacity:0}}' +
  '}';
  function injectCss() {
    var d = root.document;
    if (d && d.head && !d.getElementById('k-kaido-style')) {
      var s = d.createElement('style');
      s.id = 'k-kaido-style';
      s.textContent = CSS;
      d.head.appendChild(s);
    }
  }

  A.kaido = function (opts) {
    opts = opts || {};
    injectCss();
    var i = 'kd' + (++uid);
    function U(s) { return 'url(#' + s + i + ')'; }
    function I(s) { return ' id="' + s + i + '"'; }
    function stops(list) {
      return list.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('');
    }
    function lin(id, x1, y1, x2, y2, list, user) {
      return '<linearGradient' + I(id) + ' x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (user ? ' gradientUnits="userSpaceOnUse"' : '') + '>' + stops(list) + '</linearGradient>';
    }
    function rad(id, cx, cy, r, list, user) {
      return '<radialGradient' + I(id) + ' cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + (user ? ' gradientUnits="userSpaceOnUse"' : '') + '>' + stops(list) + '</radialGradient>';
    }
    function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>'; }
    function S(d, stroke, w, extra) { return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '"' + (extra ? ' ' + extra : '') + '/>'; }
    // a muscle: a rounded shape with a dome of light on its upper-left and shadow round its edge
    function M(pts) { return P(curve(pts, true), U('mu')); }

    /* ---------- the body's big shapes ---------- */
    var torso = 'M168,104C166,116 158,124 144,128L124,136L118,170C126,196 136,214 142,232C146,246 146,256 140,268C132,280 120,290 114,300L116,318L282,318L276,296C266,282 252,268 246,252C243,238 250,222 262,208C272,198 284,192 294,188L300,150C296,136 286,128 270,124C248,120 226,116 214,104Z';
    var armL = 'M142,130C128,116 106,114 94,124C84,132 78,140 68,146C54,148 40,150 26,160L8,174C0,182 -1,196 8,205C30,214 70,208 100,199C116,194 128,186 134,176C142,160 146,142 142,130Z';
    var foreL = 'M-1,167C4,152 24,136 50,119L72,140C60,154 46,172 28,194C14,198 3,186 -1,167Z';
    var armR = 'M268,124C300,114 332,126 346,148C358,166 370,182 382,196C394,208 399,222 395,236L380,242C366,236 352,226 340,214C324,200 308,195 294,190C289,168 284,140 268,124Z';
    var foreR = 'M372,208C360,214 342,226 323,242L338,268C352,263 370,258 392,244C401,236 388,210 372,208Z';
    var face = curve([[166, 54], [163, 72], [164, 88], [166, 100], [171, 110], [180, 117], [190, 120], [200, 117], [209, 110], [214, 100], [216, 88], [217, 72], [214, 54], [190, 46]], true);
    var neck = 'M165,90L215,90L224,126C206,134 178,134 158,128Z';
    var pants = 'M112,338L290,338C300,400 316,470 336,566L62,566C78,480 98,400 112,338Z';

    /* ---------- horns ---------- */
    var hornL = 'M167,98C140,106 108,100 110,72C112,46 126,22 142,6C136,26 134,44 140,56C146,64 156,64 170,62Z';
    var hornLs = 'M167,98C140,106 108,100 110,72C112,46 126,22 142,6C128,28 121,50 123,70C125,88 146,93 167,90Z';
    var hornR = 'M212,92C238,90 262,74 263,50C264,30 252,14 238,4C243,20 244,38 236,50C230,58 222,62 211,62Z';
    var hornRs = 'M212,92C238,90 262,74 263,50C264,30 252,14 238,4C250,20 254,36 252,50C250,68 234,82 212,85Z';
    var horns = P(hornL, U('hn')) + P(hornLs, U('hs')) + P(hornR, U('hn')) + P(hornRs, U('hs')) +
      S('M164,67C148,66 138,57 137,42C136,30 138,19 141,10M216,66C228,64 238,58 240,45C241,33 240,21 238,10', '#fff', 1.8, 'stroke-linecap="round" opacity=".9"') +
      S('M121,58C126,64 133,66 139,66M117,74C124,80 133,82 141,81M119,88C128,92 138,94 150,93M253,58C247,63 241,64 235,64M258,44C252,49 245,51 239,51', '#6f5a92', 1.2, 'stroke-linecap="round" opacity=".55"') +
      P(hornL, 'none', 'stroke="#2a1840" stroke-width="1.4"') + P(hornR, 'none', 'stroke="#2a1840" stroke-width="1.4"') +
      S('M110,72C112,46 126,22 142,6M263,50C264,30 252,14 238,4', '#e8b8ff', 1.6, 'opacity=".8"');

    /* ---------- fur cloak and mane ---------- */
    var fLedge = [[6, 160], [30, 134], [70, 110], [110, 98], [150, 104], [160, 150], [122, 220], [94, 300], [74, 380], [64, 470], [60, 572]];
    var fLback = [[-10, 572], [-10, 170]];
    var fRedge = [[346, 572], [350, 470], [346, 380], [322, 300], [292, 230], [262, 170], [232, 112], [242, 82], [272, 60], [316, 50], [356, 60], [392, 82], [412, 106]];
    var fRback = [[412, 572]];
    var fur = '';
    [[0, 26, '#7a6cf0', 3], [9, 22, '#4a3bb0', 4], [20, 18, '#2c2175', 5]].forEach(function (L) {
      fur += P(furLayer(fLedge, fLback, L[0], 15, L[1], -0.2, L[3]), L[2]) + P(furLayer(fRedge, fRback, L[0], 16, L[1], 0.35, L[3] + 10), L[2]);
    });
    var furLines = '';
    var fr = rng(31);
    [[[20, 200], [30, 300], [24, 420], [34, 540]], [[44, 190], [52, 290], [48, 400], [52, 520]], [[90, 130], [70, 150], [40, 170]],
      [[370, 120], [376, 240], [372, 360], [380, 520]], [[392, 140], [398, 280], [394, 420]], [[300, 80], [340, 76], [380, 98]], [[260, 96], [300, 70], [330, 64]], [[360, 300], [362, 400], [366, 520]]].forEach(function (c) {
      furLines += P(strand(c, 3 + fr() * 2, 0.5), '#8f82f5', 'opacity=".35"');
    });
    var maneEdge = [[170, 112], [160, 100], [150, 66], [162, 36], [196, 22], [236, 30], [276, 42], [322, 60], [362, 86], [386, 116], [380, 146], [340, 150], [300, 140], [262, 124]];
    var mane = P(furLayer(maneEdge, [[226, 112], [196, 114]], 0, 13, 22, 0.7, 21), U('hr')) +
      P(furLayer(maneEdge.slice(3, 12), [[262, 124], [226, 112], [200, 60]], 10, 13, 15, 0.7, 22), '#22152e');
    var maneLines = '';
    [[[200, 40], [250, 46], [300, 62], [350, 90], [380, 118]], [[210, 60], [260, 66], [310, 86], [350, 116], [370, 140]], [[215, 84], [260, 96], [300, 114], [340, 136]], [[180, 34], [230, 36], [280, 50], [330, 70]], [[164, 60], [158, 80], [162, 100]]].forEach(function (c, k) {
      maneLines += P(strand(c, 4, 0.6), k % 2 ? '#7c5aa8' : '#4f3474', 'opacity=".6"');
    });
    // dreadlocks rising from the crown between the horns, curling at the tips
    var dreads = '';
    [[[170, 48], [163, 34], [156, 24], [150, 21], [148, 26]], [[180, 44], [177, 30], [172, 18], [165, 12], [162, 16]], [[191, 42], [192, 28], [189, 16], [194, 7], [201, 9]],
      [[202, 44], [207, 30], [214, 20], [222, 17], [224, 22]], [[212, 50], [220, 38], [228, 31], [233, 34]]].forEach(function (c) {
      dreads += P(strand(c, 11, 3.5), U('hr'), 'stroke="#140a1c" stroke-width="1"') + P(strand(c.map(function (q) { return [q[0] - 1.5, q[1]]; }).slice(0, 4), 3, 0.8), '#8b6bc0', 'opacity=".55"');
    });
    var cap = 'M162,76C159,60 163,48 172,41C181,35 200,35 208,41C217,48 221,60 218,76C214,66 210,60 204,57C198,54 194,57 190,62C186,57 182,54 176,57C170,60 166,66 162,76Z';
    var temples = 'M163,58L149,56L158,64L145,69L159,73L150,82L165,82ZM217,58L231,56L222,64L235,69L221,73L230,82L215,82Z';

    /* ---------- face ---------- */
    var headFx =
      P(face, U('sk')) +
      P('M166,86C170,98 176,112 190,121C204,112 210,98 214,86C214,104 206,118 190,124C174,118 166,104 166,86Z', '#3b1d4f', 'opacity=".35"') +
      P('M164,74C172,73 182,77 189,83L191,83C198,77 208,73 216,74L215,91C206,94 198,93 191,90L189,90C182,93 174,94 165,91Z', '#2a1038', 'opacity=".6"') +
      P('M170,94C173,92 177,92 180,94M200,94C203,92 207,92 210,94', 'none', 'stroke="#f2c2ee" stroke-width="2.2" stroke-linecap="round" opacity=".55"') +
      S('M186,73C188,67 188,62 186,57M194,73C192,67 192,62 194,57M190,72V60', '#5e3270', 1.4, 'stroke-linecap="round" opacity=".8"') +
      S('M174,64C180,61 186,62 189,64M206,64C200,61 194,62 191,64', '#5e3270', 1.1, 'stroke-linecap="round" opacity=".6"') +
      // nose
      P('M187,82C186,88 184,92 181,96C181,99 184,101 187,100C189,102 191,102 193,100C196,101 199,99 199,96C196,92 194,88 193,82Z', '#b97fbd') +
      P('M193,84C195,90 198,94 199,97C197,99 195,100 193,100Z', '#5e3270', 'opacity=".55"') +
      S('M188.6,84L187.6,94', '#f6d2f2', 1.6, 'stroke-linecap="round" opacity=".85"') +
      '<g fill="#2a1038"><ellipse cx="184.6" cy="98.8" rx="2.4" ry="1.1"/><ellipse cx="195.4" cy="98.8" rx="2.4" ry="1.1"/></g>' +
      S('M181,95C176,99 173,104 174,110M199,95C204,99 207,104 206,110', '#2a1038', 1.6, 'stroke-linecap="round" opacity=".8"') +
      // the gritted-teeth grimace
      P('M174,108C176,103 180,101 184,101L196,101C200,101 204,103 206,108C203,112.5 199,114 195,114L185,114C181,114 177,112.5 174,108Z', '#12061a') +
      P('M177,106.6C178.5,103.6 181,102.4 184,102.4L196,102.4C199,102.4 201.5,103.6 203,106.6Z', '#fbf3ff') +
      P('M177.5,107.6L202.5,107.6C201,110.8 198.5,112.6 195,112.6L185,112.6C181.5,112.6 179,110.8 177.5,107.6Z', '#e6d8f3') +
      P('M180.2,106.4L181.6,109.6L183,106.4ZM197,106.4L198.4,109.6L199.8,106.4Z', '#fbf3ff') +
      S('M184.8,102.4V106.6M188.2,102.4V106.6M191.8,102.4V106.6M195.2,102.4V106.6M185,107.8V112.4M188.4,107.8V112.6M191.6,107.8V112.6M195,107.8V112.4', '#8a73a8', 0.7) +
      S('M173,108C175,101 181,99.4 190,99.8C199,99.4 205,101 207,108', '#2a1038', 1.7, 'stroke-linecap="round"') +
      S('M181,116C186,117.5 194,117.5 199,116', '#f0c6ec', 1.2, 'stroke-linecap="round" opacity=".6"') +
      // chin beard
      P('M178,115C184,118 196,118 202,115C203,122 200,128 196,131L194,128L192,138L189,129L186,135L185,128C181,126 178,121 178,115Z', '#1c0f26') +
      // brows: heavy, furrowed
      P('M162,70C170,66 181,70 190,79L188,84C180,79 172,76 163,77Z', '#1a0d22') +
      P('M218,70C210,66 199,70 190,79L192,84C200,79 208,76 217,77Z', '#1a0d22') +
      S('M164,70L158,67M166,69L161,64M216,70L222,67M214,69L219,64', '#1a0d22', 1.6, 'stroke-linecap="round"') +
      // eyes
      '<g class="kd-eyeglow" filter="' + U('gl') + '">' + P('M169,85C175,81 182,82 188,87C181,90 174,89 169,85ZM211,85C205,81 198,82 192,87C199,90 206,89 211,85Z', '#ffcf3f') + '</g>' +
      P('M171,85C175,83 181,83 186,86.5C181,88 175,88 171,85ZM209,85C205,83 199,83 194,86.5C199,88 205,88 209,85Z', '#fff6c8') +
      '<g fill="#2a1038"><circle cx="181" cy="85.7" r="1.4"/><circle cx="199" cy="85.7" r="1.4"/></g>';

    /* ---------- torso ---------- */
    var tat = '<g clip-path="' + U('ct') + '">' + P('M204,136C230,124 262,116 292,116L350,124L404,196L404,252L360,246C340,232 320,210 300,198' + scallop([[300, 198], [292, 184], [276, 176], [260, 170], [246, 162], [232, 156], [220, 152], [208, 146], [204, 136]], 3.5) + 'Z', U('sc'), 'opacity=".92"') + '</g>';
    var abs = '';
    [[170, 193, 22, 19], [196, 193, 22, 19], [170, 215, 22, 20], [196, 215, 22, 20], [171, 238, 21, 20], [196, 238, 21, 20], [173, 261, 19, 21], [196, 261, 19, 21]].forEach(function (r) {
      abs += '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="7" fill="' + U('mu') + '"/>';
    });
    var torsoFx = P(torso, U('sk')) + tat +
      // traps, pecs, serratus, obliques
      M([[146, 126], [160, 114], [168, 106], [176, 120], [170, 132], [150, 136]]) + M([[234, 124], [220, 114], [212, 106], [204, 120], [212, 132], [240, 134]]) +
      M([[196, 138], [172, 133], [146, 135], [124, 146], [118, 164], [130, 180], [156, 189], [182, 187], [195, 177]]) +
      M([[198, 138], [226, 132], [262, 133], [290, 143], [299, 166], [288, 183], [260, 191], [226, 189], [200, 177]]) +
      M([[136, 186], [152, 190], [156, 198], [140, 198]]) + M([[140, 200], [156, 204], [160, 212], [144, 212]]) + M([[144, 214], [160, 218], [162, 226], [148, 226]]) +
      M([[256, 188], [240, 192], [236, 200], [252, 200]]) + M([[252, 202], [236, 206], [232, 214], [248, 214]]) + M([[248, 216], [232, 220], [230, 228], [244, 228]]) +
      M([[150, 228], [166, 230], [168, 258], [164, 286], [140, 298], [124, 294], [138, 270], [146, 248]]) +
      M([[240, 228], [222, 230], [220, 258], [224, 286], [250, 298], [270, 294], [254, 270], [244, 248]]) +
      abs +
      // crisp line accents
      S('M120,168C132,186 162,194 194,180M297,168C286,187 252,196 198,180', '#2a1038', 2.4, 'stroke-linecap="round" opacity=".85"') +
      S('M196,142V180M194,190V286M160,130C175,136 186,138 194,139M230,130C214,136 204,138 198,139M170,108C176,118 184,128 192,138M211,108C206,118 200,128 196,138', '#2a1038', 1.4, 'stroke-linecap="round" opacity=".6"') +
      S('M166,284C174,296 186,302 194,304M222,284C214,296 204,302 196,304', '#2a1038', 1.6, 'stroke-linecap="round" opacity=".6"') +
      // rim light
      S('M118,170C126,196 136,214 142,232C146,246 146,256 140,268C132,280 120,290 114,300', '#ffb3f3', 2.2, 'stroke-linecap="round" opacity=".85"') +
      S('M262,208C250,222 243,238 246,252C252,268 266,282 276,296', '#c9a2ff', 2, 'stroke-linecap="round" opacity=".7"') +
      S('M150,134C162,126 168,116 168,104', '#ffd0f6', 1.4, 'stroke-linecap="round" opacity=".5"');
    var neckFx = P(neck, U('sk')) +
      P('M166,96C172,112 180,120 190,124C200,120 208,112 214,96L220,118C208,130 190,134 172,130L162,118Z', '#3b1d4f', 'opacity=".55"');
    var stache = P(strand([[180, 100], [175, 104], [172, 112], [171, 135], [169, 165], [172, 195], [168, 225], [171, 255], [168, 282], [170, 300]], 3.8, 1.3, 4), '#140a1c') +
      P(strand([[200, 100], [205, 104], [208, 112], [209, 135], [211, 165], [208, 195], [212, 225], [209, 255], [212, 282], [210, 300]], 3.8, 1.3, 4), '#140a1c') +
      S('M171.5,118C171,140 170,160 171,190M209,118C210,140 211,160 209,190', '#a988d8', 0.8, 'opacity=".6"');

    /* ---------- left arm: raised, fist at the shoulder gripping the club ---------- */
    var armLFx = P(armL, U('sk')) +
      M([[142, 128], [120, 117], [98, 123], [86, 140], [92, 162], [112, 176], [132, 170], [144, 150]]) +
      M([[72, 146], [96, 138], [114, 156], [110, 182], [86, 196], [56, 198], [40, 190], [52, 170]]) +
      M([[20, 200], [60, 197], [100, 194], [122, 184], [112, 200], [70, 208], [30, 210]]) +
      S('M8,205C30,214 70,208 100,199C116,194 128,186 134,176', '#ffb3f3', 2.2, 'stroke-linecap="round" opacity=".7"') +
      S('M92,162C100,172 112,178 128,174', '#2a1038', 1.6, 'stroke-linecap="round" opacity=".6"') +
      P(foreL, U('sk')) +
      M([[0, 170], [16, 150], [44, 126], [60, 134], [44, 160], [24, 190], [8, 188]]) +
      S('M-1,167C4,152 24,136 50,119', '#ffc4f6', 2.4, 'stroke-linecap="round" opacity=".85"') +
      S('M27,194C44,174 58,156 71,141', '#2a1038', 1.6, 'opacity=".6"');
    // the hand and the club, drawn upright then turned into place
    var fistL = '<g transform="translate(103 98) rotate(42.2)">' +
      '<rect x="-60" y="-5.5" width="40" height="11" rx="2" fill="' + U('me') + '" stroke="#2b2440" stroke-width="1.2"/>' +
      '<rect x="-56" y="-8" width="7" height="16" rx="2" fill="#cfc7e2" stroke="#2b2440" stroke-width="1.2"/>' +
      '<circle cx="-67" cy="0" r="10" fill="none" stroke="#2b2440" stroke-width="8.4"/><circle cx="-67" cy="0" r="10" fill="none" stroke="' + U('me') + '" stroke-width="6"/>' +
      S('M-74,-5A9,9 0 0 1 -62,-8.5', '#fff', 1.4, 'stroke-linecap="round" opacity=".85"') +
      P('M-24,20C-26,8 -26,-6 -24,-16C-22,-22 -16,-23 -8,-23L14,-23C22,-23 27,-18 27,-10L27,8C27,16 21,21 13,21L4,21L3,46L-23,46Z', U('sk'), 'stroke="#2a1038" stroke-width="1.2"') +
      M([[-23, -21], [-12, -23], [-10, -6], [-20, -2], [-25, -8]]) + M([[-10, -23], [2, -23], [2, -6], [-9, -4]]) + M([[3, -23], [14, -23], [14, -6], [3, -5]]) + M([[15, -22], [24, -19], [26, -6], [15, -5]]) +
      S('M-10,-22V-5M2.5,-23V-5M14.5,-22V-5', '#2a1038', 1.3, 'opacity=".75"') +
      M([[-26, 22], [-22, 6], [-8, 0], [6, 2], [8, 8], [-6, 10], [-18, 20]]) +
      S('M-22,6C-14,2 -2,0 7,4', '#2a1038', 1.2, 'opacity=".7"') +
      S('M-24,-14C-25,-4 -25,8 -24,20', '#ffc4f6', 2, 'stroke-linecap="round" opacity=".8"') +
    '</g>';
    var bandL = band(60, 130, 42.6, 36, 14);

    /* ---------- right arm: akimbo, hand on the hip ---------- */
    var armRFx = P(armR, U('sk')) + '<g clip-path="' + U('ca') + '">' + P('M260,110L350,118L410,196L410,262L330,250L290,200Z', U('sc'), 'opacity=".92"') + '</g>' +
      M([[270, 126], [304, 117], [334, 129], [348, 154], [342, 182], [318, 194], [296, 184], [284, 156]]) +
      M([[296, 190], [318, 189], [344, 205], [362, 228], [350, 236], [330, 224], [306, 206]]) +
      M([[340, 160], [362, 180], [386, 203], [397, 224], [386, 236], [366, 214], [344, 190]]) +
      S('M296,184C306,192 322,196 342,184', '#2a1038', 1.6, 'stroke-linecap="round" opacity=".6"') +
      S('M346,148C358,166 370,182 382,196C394,208 399,222 395,236', '#c9a2ff', 2.4, 'stroke-linecap="round" opacity=".9"') +
      S('M270,124C298,115 330,124 345,146', '#ffd0f6', 1.6, 'stroke-linecap="round" opacity=".6"') +
      P(foreR, U('sk')) +
      M([[372, 210], [352, 222], [330, 240], [338, 262], [366, 252], [390, 240], [392, 222]]) +
      // a small skull tattoo near the wrist
      '<g transform="translate(352 246) rotate(-30)" fill="#f3ecff"><path d="M-6,-1C-6,-6 -3,-8 0,-8C3,-8 6,-6 6,-1C6,2 4,3 3,4L3,6L-3,6L-3,4C-4,3 -6,2 -6,-1Z"/>' +
        '<path d="M-9,8L9,2M-9,2L9,8" stroke="#f3ecff" stroke-width="1.6" stroke-linecap="round"/><circle cx="-2.4" cy="-1.5" r="1.6" fill="#2a1038"/><circle cx="2.4" cy="-1.5" r="1.6" fill="#2a1038"/><path d="M0,1L-.8,2.6H.8Z" fill="#2a1038"/></g>' +
      S('M372,208C360,214 342,226 323,242', '#ffd0f6', 1.8, 'stroke-linecap="round" opacity=".55"') +
      S('M338,268C352,263 370,258 392,244', '#2a1038', 1.6, 'opacity=".5"');
    var handR =
      P('M326,246C318,252 306,262 296,268C290,272 288,280 290,288C296,296 304,298 312,294L340,268Z', U('sk'), 'stroke="#2a1038" stroke-width="1.2"') +
      [[[298, 270], [286, 276], [274, 284], [268, 294]], [[300, 280], [289, 288], [280, 298], [276, 310]], [[304, 288], [296, 298], [290, 308], [288, 318]], [[310, 293], [306, 302], [302, 311], [302, 318]]].map(function (c, k) {
        return P(strand(c, 9 - k * 0.6, 6.5 - k * 0.4, 4), U('sk'), 'stroke="#2a1038" stroke-width="1.1"');
      }).join('') +
      M([[324, 250], [306, 262], [294, 274], [300, 284], [316, 278], [334, 262]]) +
      S('M326,246C318,252 306,262 296,268', '#ffd0f6', 1.4, 'stroke-linecap="round" opacity=".6"');
    var bandR = band(331, 255, 60.4, 34, 14);

    // a black wristband with gold spikes, centred at (x,y), its long side at angle `ang`
    function band(x, y, ang, w, h) {
      var sp = '';
      for (var k = 0; k < 4; k++) {
        var sx = -w / 2 + 5 + k * (w - 10) / 3;
        sp += 'M' + f(sx - 3) + ',' + f(-h / 2) + 'L' + f(sx) + ',' + f(-h / 2 - 7) + 'L' + f(sx + 3) + ',' + f(-h / 2) + 'Z';
        sp += 'M' + f(sx - 3) + ',' + f(h / 2) + 'L' + f(sx) + ',' + f(h / 2 + 7) + 'L' + f(sx + 3) + ',' + f(h / 2) + 'Z';
      }
      var studs = '';
      for (var j = 0; j < 3; j++) studs += '<path d="M' + f(-w / 2 + 8 + j * (w - 16) / 2 - 3) + ',2L' + f(-w / 2 + 8 + j * (w - 16) / 2) + ',-4L' + f(-w / 2 + 8 + j * (w - 16) / 2 + 3) + ',2Z"/>';
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + ang + ')">' +
        '<path d="' + sp + '" fill="' + U('au') + '" stroke="#5a3f0c" stroke-width=".8"/>' +
        '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="3" fill="#15101c" stroke="#6b5a86" stroke-width="1"/>' +
        '<path d="M' + (-w / 2 + 2) + ',' + (-h / 2 + 2.5) + 'H' + (w / 2 - 2) + '" stroke="#8d7bb0" stroke-width="1.2" opacity=".6"/>' +
        '<g fill="' + U('au') + '" stroke="#5a3f0c" stroke-width=".7">' + studs + '</g>' +
      '</g>';
    }

    /* ---------- waist: obi, shimenawa rope, paper streamers, cloth panels, gold chains ---------- */
    var obi = P('M114,314C170,306 230,306 286,314L292,354C230,346 170,346 110,354Z', U('ob')) +
      S('M113,322C170,314 230,314 288,322M112,338C170,330 230,330 290,338', '#3a0a16', 3) +
      S('M113,327C170,319 230,319 288,327M112,344C170,336 230,336 290,344', '#b0475c', 1.4, 'opacity=".7"') +
      S('M110,354C170,346 230,346 292,354', '#d27b8e', 1.2, 'opacity=".5"');
    var rope = '';
    for (var k = 0; k < 7; k++) {
      var rx = 118 + k * 21.5, q = (rx - 184) / 72, ry = 296 - 4 * (1 - q * q);
      rope += '<ellipse cx="' + f(rx) + '" cy="' + f(ry) + '" rx="13.5" ry="11.5" transform="rotate(-28 ' + f(rx) + ' ' + f(ry) + ')" fill="' + U('ro') + '" stroke="#4a3470" stroke-width="1.3"/>' +
        S('M' + f(rx - 9) + ',' + f(ry - 2) + 'C' + f(rx - 7) + ',' + f(ry - 8) + ' ' + f(rx - 1) + ',' + f(ry - 10) + ' ' + f(rx + 4) + ',' + f(ry - 9), '#fff', 2, 'stroke-linecap="round" opacity=".9"');
    }
    function shide(x, y, n) {
      var d = '', e = '';
      for (var s = 0; s < n; s++) {
        var ox = x + (s % 2 ? 4 : -4), oy = y + s * 9.5;
        if (s % 2) e += 'M' + f(ox - 5) + ',' + f(oy) + 'h10v10.5h-10Z'; else d += 'M' + f(ox - 5) + ',' + f(oy) + 'h10v10.5h-10Z';
      }
      return P(d, '#fbf7ff', 'stroke="#5b4a80" stroke-width=".9"') + P(e, '#cdbfe6', 'stroke="#5b4a80" stroke-width=".9"');
    }
    var panels =
      P('M240,326C262,326 280,324 293,318C306,344 322,368 338,392C318,399 290,403 262,402C256,378 248,352 240,326Z', U('pn')) +
      S('M262,402C290,403 318,399 338,392M293,318C306,344 322,368 338,392', '#a77bd6', 4, 'stroke-linejoin="round"') +
      S('M268,330C276,352 290,374 300,398M282,326C296,350 310,372 322,394', '#2a0f48', 2, 'opacity=".7"') +
      P('M118,328C134,330 148,332 158,334C152,354 146,372 140,392C124,393 108,390 94,384C104,366 112,348 118,328Z', U('pn')) +
      S('M94,384C108,390 124,393 140,392M118,328C112,348 104,366 94,384', '#a77bd6', 3.4, 'stroke-linejoin="round"') +
      S('M130,336C124,354 118,372 112,388', '#2a0f48', 2, 'opacity=".7"');
    function chain(p0, p1, p2, n) {
      var out = '';
      for (var c = 0; c < n; c++) {
        var t = (c + 0.5) / n, u = 1 - t;
        var x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
        var tx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), ty = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
        var a = f(Math.atan2(ty, tx) * 180 / Math.PI);
        out += '<path transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + a + ')" d="' + (c % 2 ?
          'M-6.5,-2h13a2,2 0 0 1 0,4h-13a2,2 0 0 1 0,-4Z' :
          'M-7,0a7,4.6 0 1,0 14,0a7,4.6 0 1,0 -14,0ZM-3.6,0a3.6,1.6 0 1,1 7.2,0a3.6,1.6 0 1,1 -7.2,0Z') + '"/>';
      }
      return out;
    }
    var chains = '<g fill="' + U('au') + '" stroke="#6b4c0e" stroke-width=".9" fill-rule="evenodd">' + chain([125, 352], [104, 400], [71, 429], 9) + chain([234, 353], [276, 458], [326, 380], 17) + '</g>';
    var pantsFx = P(pants, U('pa')) +
      P('M197,420C188,480 172,524 158,566L232,566C220,524 206,480 199,420Z', '#07080a', 'opacity=".75"') +
      S('M198,352C197,420 195,490 194,566', '#07080a', 3) +
      S('M136,356C126,420 112,480 98,566M164,356C160,420 152,490 146,566M232,356C238,420 246,490 252,566M262,356C272,420 290,490 304,566', '#3f4733', 2, 'opacity=".75"') +
      S('M150,358C142,430 132,500 124,566M248,358C258,430 268,500 278,566', '#050604', 3) +
      S('M112,340C98,400 80,480 62,566', '#a17ae0', 2, 'opacity=".55"') + S('M290,340C300,400 316,470 336,566', '#c9a2ff', 2, 'opacity=".45"');

    /* ---------- lightning, particles ---------- */
    function boltG(d, cls) {
      return '<g class="kd-bolt ' + cls + '"><path d="' + d + '" stroke="#b46cff" stroke-width="9" opacity=".55" filter="' + U('gl') + '"/>' +
        '<path d="' + d + '" stroke="#e7c4ff" stroke-width="3.2"/><path d="' + d + '" stroke="#fff" stroke-width="1.3"/></g>';
    }
    var on = opts.bolts !== false;
    var boltsBack = on ? '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' + boltG(bolt(126, -6, 4, 160, 4, 16, 2), 'kd-b1') + boltG(bolt(296, -6, 406, 124, 7, 14, 2), 'kd-b2') + '</g>' : '';
    var boltsMid = on ? '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' + boltG(bolt(408, 300, 262, 186, 12, 14, 1), 'kd-b3') + boltG(bolt(-6, 290, 104, 470, 15, 16, 2), 'kd-b4') + '</g>' : '';
    var boltsFront = on ? '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' + boltG(bolt(46, 46, 4, 6, 19, 6, 1), 'kd-b2') + boltG(bolt(18, 210, -4, 262, 23, 6, 0), 'kd-b3') + '</g>' : '';
    var parts = '', pr = rng(57);
    for (var p = 0; p < 22; p++) {
      var px = 10 + pr() * 380, py = 150 + pr() * 390;
      parts += '<circle class="kd-p" style="animation-delay:-' + f(pr() * 7) + 's;animation-duration:' + f(5 + pr() * 5) + 's" cx="' + f(px) + '" cy="' + f(py) + '" r="' + f(2.4 + pr() * 3) + '"/>';
    }

    /* ---------- defs ---------- */
    var defs = '<defs>' +
      rad('bg', 200, 220, 280, [[0, '#a855f7', 0.6], [0.4, '#6d28d9', 0.42], [0.75, '#3b0f7a', 0.2], [1, '#12081f', 0]], true) +
      lin('sk', 90, 60, 330, 330, [[0, '#d39dd3'], [0.45, '#a26aa8'], [1, '#6a3a7c']], true) +
      rad('mu', 0.38, 0.3, 0.8, [[0, '#ffe6fb', 0.75], [0.3, '#f4bfee', 0.32], [0.62, '#b77fbe', 0], [0.86, '#3b1d4f', 0.32], [1, '#2a1038', 0.7]]) +
      lin('hn', 0, 0, 1, 0, [[0, '#f4ecfa'], [0.5, '#fffdf8'], [1, '#cdbfe0']]) +
      lin('hs', 0, 1, 0, 0, [[0, '#4b3770'], [0.5, '#8f7ab8'], [1, '#c3b1df', 0.4]]) +
      lin('hr', 0, 0, 1, 1, [[0, '#2c1c3c'], [1, '#0d0712']]) +
      lin('pa', 0, 0, 0, 1, [[0, '#2a2e22'], [1, '#0f100b']]) +
      lin('ob', 0, 0, 0, 1, [[0, '#8a2236'], [1, '#4a0f1e']]) +
      lin('ro', 0, 0, 0, 1, [[0, '#ffffff'], [0.55, '#e9e0f5'], [1, '#a491c8']]) +
      lin('pn', 0, 0, 1, 1, [[0, '#7a3cb4'], [0.6, '#5b2a8a'], [1, '#3a1660']]) +
      lin('au', 0, 0, 0, 1, [[0, '#fff0a8'], [0.45, '#e6bb45'], [1, '#8a6414']]) +
      lin('me', 0, 0, 0, 1, [[0, '#efeaf8'], [0.5, '#b4abc9'], [1, '#6c6388']]) +
      rad('pt', 0.5, 0.5, 0.5, [[0, '#fff'], [0.3, '#f5d0fe', 0.9], [1, '#c084fc', 0]]) +
      lin('fd', 0, 0, 0, 1, [[0.76, '#fff'], [1, '#fff', 0]]) +
      '<pattern' + I('sc') + ' width="12" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="12" height="10" fill="#f08a3c"/>' +
        '<path d="M-6,-5a6,5 0 0 0 12,0a6,5 0 0 0 12,0M-6,5a6,5 0 0 0 12,0a6,5 0 0 0 12,0M0,0a6,5 0 0 0 12,0M0,10a6,5 0 0 0 12,0" fill="none" stroke="#8a1d1d" stroke-width="1.4"/>' +
        '<path d="M2,1.6a4.4,3.4 0 0 0 8,0M-4,6.6a4.4,3.4 0 0 0 8,0M8,6.6a4.4,3.4 0 0 0 8,0" fill="none" stroke="#ffbf7a" stroke-width=".8" opacity=".8"/></pattern>' +
      '<clipPath' + I('ct') + '><path d="' + torso + '"/></clipPath>' +
      '<clipPath' + I('ca') + '><path d="' + armR + '"/></clipPath>' +
      '<mask' + I('mk') + '><rect x="-20" y="-20" width="440" height="600" fill="' + U('fd') + '"/></mask>' +
      '<filter' + I('gl') + ' x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<filter' + I('ax') + ' x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>' +
    '</defs>';

    return '<svg xmlns="http://www.w3.org/2000/svg" class="kaido ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido">' + defs +
      '<g mask="' + U('mk') + '">' +
        '<rect x="-20" y="-20" width="440" height="600" fill="' + U('bg') + '"/>' +
        (on ? '<ellipse class="kd-flash" cx="80" cy="60" rx="200" ry="160" fill="' + U('pt') + '" opacity="0"/>' : '') +
        boltsBack + fur + furLines + boltsMid +
        '<g fill="#c084fc" opacity=".45" filter="' + U('ax') + '"><path d="' + torso + '"/><path d="' + armR + '"/><path d="' + armL + '"/><path d="' + face + '"/></g>' +
        mane + maneLines + dreads + horns +
        pantsFx + panels + torsoFx + neckFx + headFx + P(cap, U('hr')) + P(temples, '#1a1022') + stache +
        obi + rope + shide(126, 300, 5) + shide(182, 302, 7) + chains +
        armRFx + handR + bandR +
        armLFx + bandL + fistL +
        boltsFront +
        '<g fill="' + U('pt') + '">' + parts + '</g>' +
      '</g></svg>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
