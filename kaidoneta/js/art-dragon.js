/* Kaidoneta art: Kaido's dragon form, an original SVG drawing (no official artwork). A long blue-violet serpent
 * coiled in a ring that frames the picture; its ribbed, scarred neck rises through the middle to a roaring head with
 * golden horns and antlers and a wild black mane that runs on as a crest along the spine. Clawed forelimbs (the right
 * one tattooed, with a skull; spiked bracelets on both wrists), flames licking the coils and a tufted tail below.
 * K.art.dragon(cls) returns the SVG string; K.art.mountDragon(el) wakes it up (CSS only, nothing with reduce motion).
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  var prevMount = A.mountDragon; // art.js's slither for its small dragons (.dragon-rig), kept working
  var uid = 0;
  var Q = 10; // coordinate precision: 10 = one decimal, 1 = whole units (for the big shapes, to keep the SVG small)

  function f(n) { return Math.round(n * Q) / Q; }
  function P(x, y) { return f(x) + ',' + f(y); }
  function seeded(seed) { var s = seed % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // Catmull-Rom curve through control points [x, y, ...]; every extra value (half width, belly...) is smoothed too.
  function spline(pts, seg, closed) {
    var n = pts.length, m = pts[0].length, out = [], last = closed ? n : n - 1;
    function at(i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
    for (var i = 0; i < last; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (var j = 0; j < seg; j++) {
        var t = j / seg, t2 = t * t, t3 = t2 * t, q = [];
        for (var k = 0; k < m; k++) q.push(0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3));
        out.push(q);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  }
  // Samples along a spine: position, half width w, unit tangent (tx,ty) and normal (nx,ny), extra values in v.
  function spine(pts, seg, closed) {
    var c = spline(pts, seg, closed), n = c.length, S = [];
    for (var i = 0; i < n; i++) {
      var a = c[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = c[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      S.push({ x: c[i][0], y: c[i][1], w: Math.max(0, c[i][2]), v: c[i], tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l, i: i });
    }
    return S;
  }
  function kv(k, s) { return typeof k === 'function' ? k(s) : k; }
  function pt(s, k) { return [s.x + s.nx * s.w * k, s.y + s.ny * s.w * k]; }
  function off(s, k) { var p = pt(s, k); return P(p[0], p[1]); }
  // Polygon between offsets k0 and k1 (fractions of the half width, numbers or functions of the sample).
  function band(S, k0, k1, closed) {
    var L = [], R = [];
    S.forEach(function (s) { L.push(off(s, kv(k0, s))); R.unshift(off(s, kv(k1, s))); });
    return closed ? 'M' + L.join('L') + 'ZM' + R.join('L') + 'Z' : 'M' + L.join('L') + 'L' + R.join('L') + 'Z';
  }
  function line(S, k, closed) { return 'M' + S.map(function (s) { return off(s, kv(k, s)); }).join('L') + (closed ? 'Z' : ''); }
  // Belly plates: slightly bowed lines across the strip between k0 and k1, every `step` samples.
  function ribs(S, k0, k1, step, bow, from, to) {
    var d = '';
    for (var i = from || 0; i < (to || S.length); i += step) {
      var s = S[i], a = pt(s, kv(k0, s)), b = pt(s, kv(k1, s));
      if (Math.abs(kv(k0, s) - kv(k1, s)) < 0.12) continue;
      d += 'M' + P(a[0], a[1]) + 'Q' + P((a[0] + b[0]) / 2 + s.tx * bow, (a[1] + b[1]) / 2 + s.ty * bow) + ' ' + P(b[0], b[1]);
    }
    return d;
  }
  // Flame-like tufts of hair along one edge (side -1 or 1), swept along the body.
  function tufts(S, side, step, len, sweep, seed, from, to) {
    var r = seeded(seed), d = '';
    for (var i = from || 0; i < (to || S.length) - step; i += step) {
      var s = S[i], e = S[Math.min(S.length - 1, i + step + 1)], L = kv(len, s) * (0.6 + r() * 0.7);
      if (L < 1.5) continue;
      var a = pt(s, side * 0.9), b = pt(e, side * 0.9), ox = s.nx * side, oy = s.ny * side, sw = sweep * (0.6 + r() * 0.8);
      var tip = [(a[0] + b[0]) / 2 + ox * L + s.tx * L * sw, (a[1] + b[1]) / 2 + oy * L + s.ty * L * sw];
      var c1 = [a[0] + ox * L * 0.7 - s.tx * L * 0.15, a[1] + oy * L * 0.7 - s.ty * L * 0.15];
      var c2 = [b[0] + ox * L * 0.25 + s.tx * L * sw * 0.2, b[1] + oy * L * 0.25 + s.ty * L * sw * 0.2];
      d += 'M' + P(a[0], a[1]) + 'Q' + P(c1[0], c1[1]) + ' ' + P(tip[0], tip[1]) + 'Q' + P(c2[0], c2[1]) + ' ' + P(b[0], b[1]) + 'Z';
    }
    return d;
  }
  // Mirror a path drawn with absolute M/L/C/Q/Z commands in x (around x = 0).
  function mirrorX(d) { return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, x, y) { return ' ' + f(-Number(x)) + ',' + y; }); }
  function both(d) { return d + mirrorX(d); }
  // A tapered horn/antler/whisker/finger along control points [x, y, half width].
  function taper(pts, seg) { return band(spine(pts, seg || 6, false), -1, 1); }

  // One flame-like lock of hair around (cx, cy): angle a (deg), from radius r0, length L, half width da (deg), curl (deg).
  function tongue(cx, cy, a, r0, L, da, curl) {
    function q(ang, r) { ang *= Math.PI / 180; return P(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); }
    return 'M' + q(a - da, r0) + 'C' + q(a - da * 0.7, r0 + L * 0.4) + ' ' + q(a + curl * 0.4 - da * 0.5, r0 + L * 0.78) + ' ' + q(a + curl, r0 + L) +
      'C' + q(a + curl * 0.5 + da * 0.3, r0 + L * 0.7) + ' ' + q(a + da * 1.1, r0 + L * 0.35) + ' ' + q(a + da, r0) + 'Z';
  }
  // A fan of n locks between angles a0 and a1; len(angle, random) gives each one's length.
  function fan(cx, cy, n, a0, a1, r0, len, da, curl, seed) {
    var r = seeded(seed), d = '';
    for (var k = 0; k < n; k++) {
      var a = a0 + (a1 - a0) * (k + 0.5) / n + (r() - 0.5) * (a1 - a0) / n * 0.8;
      d += tongue(cx, cy, a, r0, len(a, r()), da, kv(curl, a) * (0.5 + r()));
    }
    return d;
  }

  /* ---------- the layout ---------- */
  // The ring, drawn clockwise from the bottom centre: [x, y, half width, belly fraction on the inner side, crest length].
  var RING = [[205, 270, 24, .34, 6], [125, 262, 23, .36, 12], [68, 226, 22, .36, 16], [46, 164, 21, .32, 20], [62, 104, 20, .3, 24], [106, 64, 19, .28, 27],
    [172, 46, 19, .16, 28], [248, 48, 20, 0, 28], [312, 70, 22, 0, 26], [350, 114, 25, 0, 22], [358, 170, 27, 0, 17], [338, 226, 27, .04, 12], [285, 260, 26, .2, 8]];
  // The neck, from its base behind the lower coil up behind the head: [x, y, half width].
  var NECK = [[244, 278, 34], [246, 236, 33], [238, 190, 31], [224, 144, 28], [206, 106, 24], [190, 80, 20]];
  var ARM_R = [[252, 182, 17], [288, 178, 16.5], [318, 192, 15], [328, 218, 13], [322, 244, 12]];
  var ARM_L = [[238, 226, 15], [210, 230, 14.5], [184, 232, 13.5], [162, 234, 12.5], [146, 240, 12]];
  var TAIL = [[214, 280, 14, .4], [231, 298, 12.5, .4], [226, 320, 11, .4], [205, 331, 9.5, .4], [189, 345, 8, .4], [190, 362, 6.5, .4], [202, 373, 5, .4], [210, 381, 3.6, .4]];
  var HEAD = [165, 112];
  var FLAME = {
    A: 'M0,4C-22,4-34,-12-30,-34C-28,-48-18,-54-22,-72C-10,-62-8,-50-10,-42C-4,-56 6,-70 2,-98C16,-80 20,-64 14,-48C22,-54 26,-60 28,-70C38,-50 36,-22 26,-8C20,0 10,4 0,4Z',
    B: 'M0,4C-18,4-30,-8-28,-28C-26,-40-30,-50-36,-62C-20,-56-14,-44-14,-36C-12,-52-4,-62-8,-86C8,-70 12,-56 8,-40C16,-48 18,-58 14,-74C30,-58 34,-34 26,-14C20,-2 10,4 0,4Z',
    C: 'M0,4C-13,4-18,-8-13,-22C-9,-34-17,-48-8,-74C-3,-58 8,-50 9,-36C10,-28 15,-22 13,-10C11,0 6,4 0,4Z',
  };
  // Flames: [x, y, rotation, scale, shape, mirrored, drawn in front of the body]
  var FLAMES = [[100, 74, -20, .44, 'A', 0, 1], [84, 46, -30, .32, 'C', 0, 0], [114, 106, -8, .3, 'B', 1, 1],
    [40, 150, -40, .4, 'A', 1, 1], [28, 192, -62, .32, 'C', 1, 0], [50, 216, -30, .3, 'B', 0, 1],
    [76, 258, -18, .38, 'A', 0, 1], [104, 288, -8, .26, 'C', 1, 0],
    [184, 214, 6, .4, 'A', 0, 1], [196, 236, 16, .26, 'C', 0, 1],
    [268, 186, -2, .62, 'A', 0, 1], [294, 176, 18, .5, 'B', 0, 1], [320, 192, 30, .36, 'C', 0, 1],
    [374, 128, 40, .38, 'A', 1, 0], [378, 202, 64, .32, 'B', 1, 0], [352, 244, 30, .32, 'C', 0, 1],
    [298, 50, 10, .34, 'A', 0, 0], [256, 36, -6, .26, 'C', 1, 0], [338, 76, 26, .32, 'B', 0, 1],
    [262, 278, 4, .32, 'B', 1, 1], [150, 288, -6, .3, 'A', 0, 1], [238, 338, 22, .26, 'C', 0, 1], [176, 322, -22, .24, 'B', 1, 1]];

  /* ---------- parts ---------- */
  // The roaring head in its own coordinates: (0,0) between the eyes, about 84 wide.
  function head(url) {
    var hs = spine([[-24, -32, 7], [-44, -40, 6.6], [-60, -50, 5.4], [-68, -66, 4], [-66, -84, 2.2], [-60, -96, 0.2]], 6, false);
    var horn = '<path d="' + band(hs, -1, 1) + '" fill="' + url('hn') + '" stroke="#5a3d16" stroke-width="1"/>' +
      '<path d="' + band(hs, -1, -0.1) + '" fill="#8a6a3a" opacity=".55"/>' +
      '<path d="' + ribs(hs, -1, 1, 3, 1.5, 2) + '" stroke="#6b4f2a" stroke-width=".9" fill="none" opacity=".8"/>' +
      '<path d="' + line(hs.slice(2), 0.55) + '" stroke="#fffaf0" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".85"/>';
    var tines = taper([[-9, -38, 3.8], [-13, -60, 3.1], [-15, -80, 2.5], [-13, -96, 1.3], [-10, -106, 0.1]]) +
      taper([[-14, -60, 2.5], [-26, -70, 1.9], [-32, -84, 0.8], [-31, -92, 0.1]]) +
      taper([[-15, -82, 1.8], [-24, -90, 1], [-26, -98, 0.1]]);
    var whisk = taper([[-22, 20, 1.9], [-44, 14, 1.6], [-66, 26, 1.3], [-90, 24, 1], [-110, 8, 0.6], [-122, -6, 0.1]], 5) +
      taper([[-26, 34, 1.6], [-40, 48, 1.3], [-50, 68, 1.1], [-44, 88, 0.8], [-52, 104, 0.1]], 5);
    var ruff = 'M-36,-26L-56,-44L-41,-30ZM-41,-16L-66,-24L-44,-8ZM-42,-4L-68,2L-42,6ZM-38,8L-60,22L-35,16ZM-32,20L-46,38L-28,28Z';
    var face = 'M0,-44C14,-44 28,-40 36,-30L42,-16C44,-8 40,-2 34,4L30,14C28,22 27,30 24,36L-24,36C-27,30-28,22-30,14L-34,4C-40,-2-44,-8-42,-16L-36,-30C-28,-40-14,-44 0,-44Z';
    var cheek = 'M-42,-16C-44,-8-40,-2-34,4L-30,14C-28,22-27,30-24,36L-18,36C-22,26-22,14-26,6C-30,-2-34,-8-42,-16Z';
    var brow = 'M-2,-18C-10,-24-24,-32-40,-30C-34,-38-22,-41-13,-37C-6,-33-2,-26-2,-18Z';
    var eye = 'M-5,-12C-12,-15-21,-20-31,-23C-28,-14-19,-8-10,-7C-7,-8-5,-10-5,-12Z';
    var nostril = 'M-6,18C-9,12-17,12-20,18C-17,22-13,23-9,25C-12,21-10,18-6,18Z';
    var lowerJaw = 'M-30,36C-33,60-18,82 0,84C18,82 33,60 30,36C27,54 18,68 10,71L-10,71C-18,68-27,54-30,36Z';
    var mouth = 'M-24,32C-28,48-20,64-10,71L10,71C20,64 28,48 24,32C10,36-10,36-24,32Z';
    var upTeeth = 'M-24,32L-16,35L-19.5,53ZM-14,35.5L-8.5,36.5L-11.5,45ZM-6.5,36.6L-1.5,37L-4,43.5ZM1.5,37L6.5,36.6L4,43.5ZM8.5,36.5L14,35.5L11.5,45ZM16,35L24,32L19.5,53Z';
    var loTeeth = 'M-18,66L-10,70L-14.5,54ZM-8,70.6L-2.5,71L-5.2,62ZM2.5,71L8,70.6L5.2,62ZM10,70L18,66L14.5,54Z';
    var marks = 'M0,-42L0,-26M-6,-40C-14,-39-19,-33-15,-28M-30,-6C-34,2-31,9-27,12M-23,-2C-25,4-23,9-20,11M-12,-4C-14,2-15,6-17,9';
    return '<path d="' + both(tines) + '" fill="' + url('hn') + '" stroke="#5a3d16" stroke-width=".9"/>' +
      horn + '<g transform="scale(-1 1)">' + horn + '</g>' +
      '<path d="' + both(whisk) + '" fill="#e4dfff"/>' +
      '<path d="' + both(ruff) + '" fill="#b9b2ee" stroke="#0b0820" stroke-width=".8"/>' +
      '<path d="' + lowerJaw + '" fill="' + url('fc') + '" stroke="#0b0820" stroke-width="1.2"/>' +
      '<path d="' + mouth + '" fill="' + url('mo') + '"/>' +
      '<path d="M-13,64C-10,52 10,52 13,64C8,69-8,69-13,64Z" fill="#c2304a"/><path d="M0,55V64" stroke="#7a1028" stroke-width="1"/>' +
      '<path d="' + upTeeth + loTeeth + '" fill="#fffaf0" stroke="#8d88a8" stroke-width=".5"/>' +
      '<path d="' + face + '" fill="' + url('fc') + '" stroke="#0b0820" stroke-width="1.3"/>' +
      '<path d="' + both(cheek) + '" fill="#140e3a" opacity=".5"/>' +
      '<path d="M-8,-10C-12,0-16,8-20,14L20,14C16,8 12,0 8,-10C4,-14-4,-14-8,-10Z" fill="#6d5ce8" opacity=".5"/>' +
      '<path d="M-22,24C-24,14-16,10-9,12C-4,9 4,9 9,12C16,10 24,14 22,24C18,30-18,30-22,24Z" fill="#4636b8" stroke="#a8b4ff" stroke-width=".8"/>' +
      '<path d="' + both(nostril) + '" fill="#0b0820"/>' +
      '<path d="M-23,32C-10,36 10,36 23,32" stroke="#5c0d22" stroke-width="2" fill="none"/>' +
      '<path d="' + both(marks) + '" stroke="#a8b4ff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".75"/>' +
      '<g class="dg-eye"><ellipse cx="-18" cy="-15" rx="17" ry="11" fill="' + url('eg') + '"/><ellipse cx="18" cy="-15" rx="17" ry="11" fill="' + url('eg') + '"/></g>' +
      '<path d="' + both(eye) + '" fill="#fff1a8"/>' +
      '<circle cx="-17" cy="-14" r="3.8" fill="#ff8a1f"/><circle cx="17" cy="-14" r="3.8" fill="#ff8a1f"/>' +
      '<path d="M-17,-17.6V-10.4M17,-17.6V-10.4" stroke="#120a05" stroke-width="1.7" stroke-linecap="round"/>' +
      '<path d="' + both(brow) + '" fill="#150f3d" stroke="#8f8cf5" stroke-width=".8"/>';
  }

  // A clawed hand drawn pointing down (+y) from the wrist at (0,-12), with a spiked bracelet.
  function hand(url) {
    var F = [[[-8, 4, 4.4], [-13, 15, 3.8], [-15, 24, 3.1]], [[-2, 8, 4.6], [-3, 20, 4], [-3, 29, 3.2]], [[5, 7, 4.5], [8, 18, 3.9], [10, 27, 3.1]], [[9, -4, 4.2], [16, 2, 3.5], [19, 10, 2.9]]];
    var d = '', claws = '', knuck = '';
    F.forEach(function (fp) {
      d += taper(fp, 4);
      var e = fp[2], p = fp[1], ux = e[0] - p[0], uy = e[1] - p[1], l = Math.sqrt(ux * ux + uy * uy); ux /= l; uy /= l;
      var px = -uy, py = ux, w = e[2] * 0.95, cl = 12;
      claws += 'M' + P(e[0] + px * w, e[1] + py * w) + 'Q' + P(e[0] + ux * cl * 0.6 + px * w * 0.6, e[1] + uy * cl * 0.6 + py * w * 0.6) + ' ' + P(e[0] + ux * cl - px * 3.5, e[1] + uy * cl - py * 3.5) +
        'Q' + P(e[0] + ux * cl * 0.4 - px * w * 0.4, e[1] + uy * cl * 0.4 - py * w * 0.4) + ' ' + P(e[0] - px * w, e[1] - py * w) + 'Z';
      knuck += 'M' + P(p[0] + px * 2.6, p[1] + py * 2.6) + 'L' + P(p[0] - px * 2.6, p[1] - py * 2.6);
    });
    return '<path d="M-12,-12C-15,-2-12,8-7,11L8,11C13,7 15,-2 12,-12Z" fill="' + url('lb') + '" stroke="#0b0820" stroke-width="1"/>' +
      '<path d="' + d + '" fill="' + url('lb') + '" stroke="#0b0820" stroke-width="1"/>' +
      '<path d="' + knuck + '" stroke="#a8b4ff" stroke-width=".8" opacity=".6"/>' +
      '<path d="' + claws + '" fill="#fbf8ff" stroke="#5d5a78" stroke-width=".6"/>' +
      '<path d="M-16,-19L-29,-15.5L-16,-12ZM16,-19L29,-15.5L16,-12Z" fill="' + url('sv') + '" stroke="#3a3d4a" stroke-width=".7"/>' +
      '<path d="M-16,-21L16,-21Q20,-15.5 16,-10L-16,-10Q-20,-15.5-16,-21Z" fill="#0d0a14" stroke="#6a6480" stroke-width="1"/>' +
      '<path d="M-10,-18.5L-7,-26L-4,-18.5ZM-1.5,-18.5L1.5,-27L4.5,-18.5ZM7,-18.5L10,-25L13,-18.5Z" fill="' + url('sv') + '" stroke="#3a3d4a" stroke-width=".6"/>' +
      '<path d="M-14,-13H14" stroke="#4a4560" stroke-width="1"/>';
  }
  function skull(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M0,-8C5,-8 8,-5 8,-1C8,2 6,3 5,4L5,7L-5,7L-5,4C-6,3-8,2-8,-1C-8,-5-5,-8 0,-8Z" fill="#fbf8ff" stroke="#3a2a5a" stroke-width=".8"/>' +
      '<path d="M-5,-2.2C-5,-4.4-1,-4.4-1,-1.8C-1,0-5,0.4-5,-2.2ZM5,-2.2C5,-4.4 1,-4.4 1,-1.8C1,0 5,0.4 5,-2.2ZM-0.9,2L0,0.4L0.9,2Z" fill="#1a1030"/>' +
      '<path d="M-3,4.4V7M-1,4.4V7M1,4.4V7M3,4.4V7" stroke="#3a2a5a" stroke-width=".7"/></g>';
  }
  // Fish-scale pattern: dark scale rims with light crescents, two highlight colours on alternate rows.
  function scalePattern(pid, w, h, rim, hiA, hiB) {
    var r = w / 2, d1 = '', d2 = '', rims = '';
    [[0, 0, 1], [w, 0, 1], [r, h, 2], [r, -h, 2], [0, 2 * h, 1], [w, 2 * h, 1]].forEach(function (c) {
      var x = c[0], y = c[1];
      rims += 'M' + P(x - r, y) + 'C' + P(x - r, y + r * 1.3) + ' ' + P(x + r, y + r * 1.3) + ' ' + P(x + r, y);
      var cr = 'M' + P(x - r * 0.8, y + r * 0.35) + 'C' + P(x - r * 0.7, y + r * 1.12) + ' ' + P(x + r * 0.7, y + r * 1.12) + ' ' + P(x + r * 0.8, y + r * 0.35) +
        'C' + P(x + r * 0.5, y + r * 0.8) + ' ' + P(x - r * 0.5, y + r * 0.8) + ' ' + P(x - r * 0.8, y + r * 0.35) + 'Z';
      if (c[2] === 1) d1 += cr; else d2 += cr;
    });
    return '<pattern id="' + pid + '" width="' + w + '" height="' + (2 * h) + '" patternUnits="userSpaceOnUse">' +
      '<path d="' + d1 + '" fill="' + hiA + '"/><path d="' + d2 + '" fill="' + hiB + '"/>' +
      '<path d="' + rims + '" fill="none" stroke="' + rim + '" stroke-width="1.1"/></pattern>';
  }

  /* ---------- the picture ---------- */
  A.dragon = function (cls) {
    var n = ++uid, id = function (s) { return s + 'dg' + n; }, url = function (s) { return 'url(#' + id(s) + ')'; };
    var defs = '', out = '';
    // geometry used more than once goes into <defs> once and is drawn with <use>
    function geo(name, d, rule) { defs += '<path id="' + id(name) + '" d="' + d + '"' + (rule ? ' fill-rule="evenodd"' : '') + '/>'; return '#' + id(name); }
    function use(ref, attrs) { return '<use href="' + ref + '" ' + attrs + '/>'; }
    var inner = function (s) { return 1 - 2 * s.v[3]; };

    Q = 1;
    var ring = spine(RING, 7, true), neck = spine(NECK, 9, false), armR = spine(ARM_R, 6, false), armL = spine(ARM_L, 6, false), tail = spine(TAIL, 6, false);
    var front = ring.slice(78).concat(ring.slice(0, 10));
    var gRing = geo('rb', band(ring, -1, 1, true), true), gFront = geo('fb', band(front, -1, 1)), gNeck = geo('nb', band(neck, -1, 1));
    var gArmR = geo('ar', band(armR, -1, 1)), gArmL = geo('al', band(armL, -1, 1)), gTail = geo('tb', band(tail, -1, 1));
    var gTat = geo('tp', band(armR.slice(3, 16), -0.85, 0.85));
    var crestBack = tufts(ring, -1, 3, function (s) { return s.v[4] * 1.3; }, -0.55, 3), crestFront = tufts(ring, -1, 3, function (s) { return s.v[4]; }, -0.6, 5);
    var neckCrest = tufts(neck, 1, 3, 18, 0.35, 8, 4, 44);
    var maneBack = fan(HEAD[0], HEAD[1] - 10, 30, -216, 36, 22, function (a, r) { var up = Math.max(0, -Math.sin(a * Math.PI / 180)); return 46 + up * 62 + r * 26; }, 8, function (a) { return a < -90 ? -16 : 16; }, 9);
    var maneFront = fan(HEAD[0], HEAD[1] - 10, 30, -210, 30, 20, function (a, r) { var up = Math.max(0, -Math.sin(a * Math.PI / 180)); return 36 + up * 50 + r * 24; }, 7, function (a) { return a < -90 ? -14 : 14; }, 13);
    var maneHi = fan(HEAD[0], HEAD[1] - 10, 14, -205, 25, 30, function (a, r) { var up = Math.max(0, -Math.sin(a * Math.PI / 180)); return 22 + up * 40 + r * 16; }, 1.6, function (a) { return a < -90 ? -12 : 12; }, 17);
    var beardD = fan(HEAD[0], HEAD[1] + 70, 11, 42, 138, 6, function (a, r) { return 18 + r * 12 + (1 - Math.abs(a - 90) / 48) * 12; }, 9, function (a) { return a < 90 ? 8 : -8; }, 4);
    var tip = tail[tail.length - 1], tipA = Math.atan2(tip.ty, tip.tx) * 180 / Math.PI;
    var tuft = fan(tip.x, tip.y, 9, tipA - 80, tipA + 80, 1, function (a, r) { return 13 + r * 10; }, 10, function (a) { return a < tipA ? -10 : 10; }, 21);
    Q = 10;

    defs += '<radialGradient id="' + id('rg') + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(204 160) scale(178 130)">' +
        '<stop offset=".66" stop-color="#1e1652"/><stop offset=".8" stop-color="#4a38c0"/><stop offset=".86" stop-color="#3b2a9c"/><stop offset=".97" stop-color="#1e1652"/><stop offset="1" stop-color="#140e3a"/></radialGradient>' +
      '<radialGradient id="' + id('rs') + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(204 160) scale(178 130)">' +
        '<stop offset=".66" stop-color="#0d0930" stop-opacity=".85"/><stop offset=".76" stop-color="#0d0930" stop-opacity="0"/><stop offset=".88" stop-color="#0d0930" stop-opacity="0"/><stop offset=".98" stop-color="#0d0930" stop-opacity=".8"/></radialGradient>' +
      '<linearGradient id="' + id('nk') + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#b8975a"/><stop offset=".35" stop-color="#f0dca0"/><stop offset=".7" stop-color="#e2c888"/><stop offset="1" stop-color="#a88548"/></linearGradient>' +
      '<linearGradient id="' + id('bl') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f0dca0"/><stop offset="1" stop-color="#b8975a"/></linearGradient>' +
      '<linearGradient id="' + id('lb') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6d5ce8"/><stop offset=".5" stop-color="#3b2a9c"/><stop offset="1" stop-color="#1e1652"/></linearGradient>' +
      '<linearGradient id="' + id('ls') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0d0930" stop-opacity="0"/><stop offset=".55" stop-color="#0d0930" stop-opacity=".1"/><stop offset="1" stop-color="#0d0930" stop-opacity=".75"/></linearGradient>' +
      '<radialGradient id="' + id('fc') + '" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#6d5ce8"/><stop offset=".55" stop-color="#3b2a9c"/><stop offset="1" stop-color="#1e1652"/></radialGradient>' +
      '<radialGradient id="' + id('mo') + '" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#7a1028"/><stop offset="1" stop-color="#1a0610"/></radialGradient>' +
      '<radialGradient id="' + id('eg') + '"><stop offset="0" stop-color="#ffe08a" stop-opacity=".95"/><stop offset="1" stop-color="#ff9a1f" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id('hn') + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#f2e2b0"/><stop offset="1" stop-color="#c9a76a"/></linearGradient>' +
      '<linearGradient id="' + id('sv') + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9ccd8"/><stop offset="1" stop-color="#7d8296"/></linearGradient>' +
      '<linearGradient id="' + id('fo') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff4d00"/><stop offset="1" stop-color="#ff7a10"/></linearGradient>' +
      '<linearGradient id="' + id('fm') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffb347"/></linearGradient>' +
      '<linearGradient id="' + id('fy') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#fff6d0"/></linearGradient>' +
      '<radialGradient id="' + id('fg') + '"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".45"/><stop offset="1" stop-color="#ff4d00" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id('au') + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".5"/><stop offset=".6" stop-color="#6d28d9" stop-opacity=".2"/><stop offset="1" stop-color="#5b21b6" stop-opacity="0"/></radialGradient>' +
      scalePattern(id('sc'), 10, 6, '#100b2e', '#a8b4ff', '#6d5ce8') +
      scalePattern(id('tt'), 7, 4.2, '#5a1206', '#ffd166', '#ff9a1f');
    // flames: three nested layers of one shape, defined once per shape
    ['A', 'B', 'C'].forEach(function (k) {
      var sh = geo('f' + k, FLAME[k]);
      defs += '<g id="' + id('F' + k) + '"><circle cy="-34" r="46" fill="' + url('fg') + '"/>' + use(sh, 'fill="' + url('fo') + '"') +
        use(sh, 'transform="translate(0 2) scale(.7)" fill="' + url('fm') + '"') + use(sh, 'transform="translate(0 3) scale(.4)" fill="' + url('fy') + '"') + '</g>';
    });
    function flames(inFront) {
      return FLAMES.filter(function (fl) { return !!fl[6] === inFront; }).map(function (fl, k) {
        return '<g transform="translate(' + fl[0] + ' ' + fl[1] + ') rotate(' + fl[2] + ') scale(' + (fl[5] ? -fl[3] : fl[3]) + ' ' + fl[3] + ')">' +
          use('#' + id('F' + fl[4]), 'class="dg-fl f' + (k % 3) + '"') + '</g>';
      }).join('');
    }
    // a scaly tube: base fill, scales, shading
    function tube(ref, fill, shade) {
      return use(ref, 'fill="' + fill + '"') + use(ref, 'fill="' + url('sc') + '" opacity=".85"') + (shade ? use(ref, 'fill="' + shade + '"') : '');
    }
    function edges(S, closed, w) { Q = 1; var d = line(S, -1, closed) + line(S, 1, closed); Q = 10; return '<path d="' + d + '" stroke="#0b0820" stroke-width="' + (w || 1.3) + '" fill="none"/>'; }
    function ringDetail(S, closed) {
      Q = 1;
      var d = '<path d="' + band(S, inner, 1, false) + '" fill="' + url('bl') + '"/>' +
        '<path d="' + ribs(S, inner, 1, 2, 2) + '" stroke="#6b4f2a" stroke-width="1.1" fill="none"/>' +
        '<path d="' + line(S, -0.84, closed) + '" stroke="#a8b4ff" stroke-width="1" fill="none" opacity=".45"/>';
      Q = 10;
      return d + edges(S, closed, 1.4);
    }

    out += '<ellipse cx="200" cy="196" rx="200" ry="200" fill="' + url('au') + '" opacity=".6"/>';
    out += flames(false);
    // the crest along the spine, then the ring
    out += '<g class="dg-crest"><path d="' + crestBack + '" fill="#3a3060"/><path d="' + crestFront + '" fill="#0d0a14"/></g>';
    out += tube(gRing, url('rg'), url('rs')) + ringDetail(ring, true);
    // left forelimb (its shoulder behind the neck), hand and bracelet
    var wl = armL[armL.length - 1], al = Math.atan2(wl.ty, wl.tx) * 180 / Math.PI - 90;
    out += tube(gArmL, url('lb'), url('ls')) + edges(armL);
    out += '<g transform="translate(' + f(wl.x + wl.tx * 4) + ' ' + f(wl.y + wl.ty * 4) + ') rotate(' + f(al + 10) + ') scale(1.25)">' + hand(url) + '</g>';
    // neck: crest, scaly back, ribbed belly, the X scar
    out += '<path d="' + neckCrest + '" fill="#0d0a14" stroke="#3a3060" stroke-width="1"/>';
    out += tube(gNeck, '#3b2a9c', null);
    Q = 1;
    out += '<path d="' + band(neck, -1, 0.55) + '" fill="' + url('nk') + '"/>' +
      '<path d="' + ribs(neck, -1, 0.55, 2, -3) + '" stroke="#6b4f2a" stroke-width="1.3" fill="none"/>' +
      '<path d="' + line(neck, 0.55) + '" stroke="#4a3418" stroke-width="1.2" fill="none"/>';
    Q = 10;
    var scar = 'M216,196C228,212 242,226 260,236M254,194C244,210 234,226 222,244';
    out += '<path d="' + scar + '" stroke="#5b2416" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
      '<path d="' + scar + '" stroke="#e09478" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    out += edges(neck, false, 1.4);
    // right forelimb: tattoo, skull
    out += tube(gArmR, url('lb'), url('ls'));
    out += use(gTat, 'fill="#d2401a"') + use(gTat, 'fill="' + url('tt') + '"') + edges(armR);
    out += skull(322, 206, 1);
    // tail with its tuft, then the front of the lower coil over the neck's base and the tail's root
    out += '<path d="' + tuft + '" fill="#0d0a14" stroke="#4a3f78" stroke-width="1"/>';
    Q = 1;
    out += tube(gTail, url('lb'), url('ls')) + '<path d="' + band(tail, function (s) { return 1 - 2 * s.v[3]; }, 1) + '" fill="' + url('bl') + '"/>' +
      '<path d="' + ribs(tail, function (s) { return 1 - 2 * s.v[3]; }, 1, 2, 1) + '" stroke="#6b4f2a" stroke-width=".9" fill="none"/>';
    Q = 10;
    out += edges(tail);
    out += tube(gFront, url('rg'), url('rs')) + ringDetail(front, false);
    var wr = armR[armR.length - 1], ar = Math.atan2(wr.ty, wr.tx) * 180 / Math.PI - 90;
    out += '<g transform="translate(' + f(wr.x + wr.tx * 4) + ' ' + f(wr.y + wr.ty * 4) + ') rotate(' + f(ar) + ') scale(1.25)">' + hand(url) + '</g>';
    // the mane behind the head, the head, the beard
    out += '<ellipse cx="' + HEAD[0] + '" cy="' + (HEAD[1] - 20) + '" rx="120" ry="110" fill="' + url('au') + '"/>';
    out += '<g class="dg-mane"><path d="' + maneBack + '" fill="#3a3060"/><path d="' + maneFront + '" fill="#0d0a14"/>' +
      '<path d="' + maneHi + '" fill="#7d72a8" opacity=".75"/></g>';
    out += '<g transform="translate(' + HEAD[0] + ' ' + HEAD[1] + ')"><g class="dg-head">' + head(url) + '</g></g>';
    out += '<path d="' + beardD + '" fill="#0d0a14" stroke="#4a3f78" stroke-width="1"/>';
    out += flames(true);
    injectStyle();
    return '<svg xmlns="http://www.w3.org/2000/svg" class="dragon ' + (cls || '') + '" viewBox="0 0 400 400" role="img" aria-label="Kaido\'s dragon form">' +
      '<defs>' + defs + '</defs>' + out + '</svg>';
  };

  var CSS = '@keyframes dgFlick{0%{transform:scale(1,1);opacity:1}50%{transform:scale(.94,1.08);opacity:.92}100%{transform:scale(1.05,.9);opacity:.84}}' +
    '@keyframes dgSway{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}' +
    '@keyframes dgGlow{from{opacity:.45}to{opacity:1}}' +
    '@keyframes dgBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}' +
    '@media (prefers-reduced-motion: no-preference){' +
      '.dragon .dg-fl{transform-box:fill-box;transform-origin:50% 100%;animation:dgFlick 1.3s ease-in-out infinite alternate}' +
      '.dragon .dg-fl.f1{animation-duration:1.7s;animation-delay:-.6s}.dragon .dg-fl.f2{animation-duration:1.1s;animation-delay:-.3s}' +
      '.dragon .dg-mane{transform-box:fill-box;transform-origin:50% 80%;animation:dgSway 5s ease-in-out infinite alternate}' +
      '.dragon .dg-crest{transform-box:fill-box;transform-origin:50% 50%;animation:dgSway 7s ease-in-out infinite alternate-reverse}' +
      '.dragon .dg-eye{animation:dgGlow 2.2s ease-in-out infinite alternate}' +
      '.dragon .dg-head{transform-box:fill-box;transform-origin:50% 75%;animation:dgBreath 4.6s ease-in-out infinite}' +
    '}';
  function injectStyle() {
    var doc = root.document;
    if (!doc || !doc.head || doc.getElementById('k-dragon-style')) return;
    var st = doc.createElement('style');
    st.id = 'k-dragon-style';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  // The app calls this after putting dragons into el. The motion is CSS; this only marks them as live.
  A.mountDragon = function (el) {
    try {
      if (!el || !el.querySelectorAll) return;
      if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      Array.prototype.forEach.call(el.querySelectorAll('svg.dragon'), function (svg) { svg.classList.add('is-live'); });
      if (prevMount) prevMount(el);
    } catch (e) { /* decoration only: never break the page */ }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
