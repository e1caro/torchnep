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
  // Flame-like tufts of hair along one edge (side -1 or 1), streaming back along the body (sweep < 0) or forward.
  function tufts(S, side, step, len, sweep, seed, from, to) {
    var r = seeded(seed), d = '';
    for (var i = from || 0; i < (to || S.length) - step; i += step) {
      var s = S[i], e = S[Math.min(S.length - 1, i + step + 1)], L = kv(len, s) * (0.4 + r() * 1.3);
      if (L < 1.5) continue;
      var a = pt(s, side * 0.9), b = pt(e, side * 0.9), ox = s.nx * side, oy = s.ny * side, sw = sweep * (0.6 + r() * 0.8), dl = Math.sqrt(1 + sw * sw);
      var tip = [(a[0] + b[0]) / 2 + (ox + s.tx * sw) / dl * L, (a[1] + b[1]) / 2 + (oy + s.ty * sw) / dl * L];
      var c1 = [a[0] + (ox * 0.7 / dl - s.tx * 0.15) * L, a[1] + (oy * 0.7 / dl - s.ty * 0.15) * L];
      var c2 = [b[0] + (ox * 0.25 + s.tx * sw * 0.2) / dl * L, b[1] + (oy * 0.25 + s.ty * sw * 0.2) / dl * L];
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

  // A ragged flame mass rising from (0,0) towards -y: n licking tongues over a base W wide, about H tall, leaning by lean.
  function fire(n, W, H, lean, seed) {
    var r = seeded(seed), y0 = -H * 0.1;
    var d = 'M' + P(-W / 2, y0) + 'C' + P(-W / 2, W * 0.45) + ' ' + P(W / 2, W * 0.45) + ' ' + P(W / 2, y0) + 'C' + P(W * 0.2, -H * 0.4) + ' ' + P(-W * 0.2, -H * 0.4) + ' ' + P(-W / 2, y0) + 'Z';
    for (var k = 0; k < n; k++) {
      var u = n > 1 ? 2 * k / (n - 1) - 1 : 0, h = H * (1 - 0.45 * u * u) * (0.7 + r() * 0.45), hw = W / (n + 1) * (0.8 + r() * 0.45);
      var bx = u * W * 0.3, tx = bx + u * h * 0.22 + lean * h * 0.3 + (r() - 0.5) * hw, ty = -h, bend = (lean + u * 0.4) * h * 0.25;
      d += 'M' + P(bx - hw, y0) + 'C' + P(bx - hw * 1.5 - bend * 0.3, y0 - h * 0.42) + ' ' + P(tx - hw * 0.7 - bend, ty + h * 0.42) + ' ' + P(tx, ty) +
        'C' + P(tx + hw * 0.1 - bend * 0.6, ty + h * 0.45) + ' ' + P(bx + hw * 1.5 + bend * 0.2, y0 - h * 0.3) + ' ' + P(bx + hw, y0) + 'Z';
    }
    return d;
  }

  /* ---------- the layout ---------- */
  // The ring, drawn clockwise from the bottom centre: [x, y, half width, belly fraction on the inner side, crest length].
  var RING = [[205, 270, 24, .34, 0], [125, 262, 23, .36, 0], [68, 226, 22, .36, 10], [46, 164, 21, .32, 18], [62, 104, 20, .3, 24], [106, 64, 19, .28, 30],
    [172, 46, 19, .16, 34], [248, 48, 20, 0, 34], [312, 70, 22, 0, 32], [344, 114, 25, 0, 24], [350, 170, 27, 0, 16], [332, 226, 27, .04, 6], [285, 260, 26, .2, 0]];
  // The second, lower loop: it shows below the ring and runs up behind it on both sides; the tail drops from it.
  var COIL2 = [[96, 248, 17], [146, 288, 20], [214, 305, 22], [280, 297, 21], [322, 266, 19], [338, 232, 17]];
  // The neck, from its base behind the lower coil up behind the head's right cheek: [x, y, half width].
  var NECK = [[246, 282, 40], [252, 236, 40], [250, 190, 38], [240, 146, 34], [222, 108, 28], [196, 82, 22]];
  var ARM_R = [[256, 178, 17], [292, 170, 16.5], [322, 182, 15], [336, 208, 13.5], [333, 234, 12.5], [327, 250, 12]];
  var ARM_L = [[238, 212, 15], [212, 218, 14.5], [188, 224, 13.5], [166, 232, 12.5], [150, 242, 12]];
  var TAIL = [[260, 300, 18, .4], [266, 326, 16, .4], [254, 344, 14, .4], [232, 351, 12, .4], [213, 357, 10, .4], [206, 370, 8, .4], [213, 380, 6.5, .4], [226, 383, 5, .4]];
  var HEAD = [165, 112];
  // Flame masses: [n tongues, base width, height, lean, seed]
  var FIRE = [[5, 34, 64, .18, 31], [4, 26, 54, -.28, 47], [3, 19, 42, .38, 53], [6, 46, 76, .06, 71]];
  // Flames: [x, y, rotation, scale x, scale y, mass, mirrored, drawn in front of the body]. Three clusters: the left
  // outer coil, the top right of the coil and the tattooed arm, each with a mass or two behind the body.
  var FLAMES = [
    [16, 178, -14, .62, .9, 3, 0, 0], [40, 104, -4, .5, .74, 0, 1, 0], [326, 40, 22, .62, .88, 3, 0, 0], [366, 92, 38, .5, .7, 1, 0, 0], [300, 152, 4, .62, .9, 3, 1, 0],
    [36, 236, -8, .5, .76, 0, 0, 1], [26, 196, -2, .44, .7, 2, 1, 1], [34, 152, 4, .4, .66, 1, 0, 1], [50, 118, 10, .34, .52, 2, 0, 1],
    [292, 56, 12, .4, .62, 2, 0, 1], [318, 70, 22, .5, .74, 0, 1, 1], [346, 96, 32, .36, .56, 1, 0, 1],
    [276, 182, -6, .56, .82, 0, 0, 1], [300, 176, 8, .48, .74, 1, 1, 1], [322, 188, 22, .36, .58, 2, 0, 1]];

  /* ---------- parts ---------- */
  // Lengthen the muzzle: everything below the eyes moves down, up to 6 units.
  function dn(d) { return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, x, y) { y = Number(y); return x + ',' + f(y <= 0 ? y : y >= 10 ? y + 6 : y * 1.6); }); }
  // The roaring head in its own coordinates: (0,0) between the eyes, about 84 wide.
  function head(url, geo, use) {
    var hs = spine([[-24, -32, 7], [-44, -40, 6.6], [-60, -50, 5.4], [-68, -66, 4], [-66, -84, 2.2], [-60, -96, 0.2]], 6, false);
    var horn = '<path d="' + band(hs, -1, 1) + '" fill="' + url('hn') + '" stroke="#5a3d16" stroke-width="1"/>' +
      '<path d="' + band(hs, -1, -0.1) + '" fill="#8a6a3a" opacity=".55"/>' +
      '<path d="' + ribs(hs, -1, 1, 3, 1.5, 2) + '" stroke="#6b4f2a" stroke-width=".9" fill="none" opacity=".8"/>' +
      '<path d="' + line(hs.slice(2), 0.55) + '" stroke="#fffaf0" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".85"/>';
    var tines = geo('tn', both(taper([[-9, -38, 3.8], [-13, -60, 3.1], [-15, -80, 2.5], [-13, -96, 1.3], [-10, -106, 0.1]]) +
      taper([[-14, -58, 2.6], [-26, -70, 1.9], [-32, -84, 0.8], [-31, -92, 0.1]]) +
      taper([[-15, -80, 1.9], [-24, -90, 1], [-26, -98, 0.1]])));
    var whisk = taper([[-22, 25, 2.6], [-36, 17, 2.2], [-48, 14, 1.8], [-60, 20, 1.3], [-70, 20, 0.8], [-78, 8, 0.1]], 5) +
      taper([[-26, 40, 2.4], [-36, 50, 2], [-46, 58, 1.5], [-48, 66, 1], [-44, 72, 0.6], [-48, 78, 0.1]], 5);
    var ruff = dn('M-36,-26L-56,-44L-41,-30ZM-41,-16L-66,-24L-44,-8ZM-42,-4L-68,2L-42,6ZM-38,8L-60,22L-35,16ZM-32,20L-46,38L-28,28Z');
    var face = dn('M0,-44C14,-44 28,-40 36,-30L42,-16C44,-8 40,-2 34,4L30,14C28,22 27,30 24,36L-24,36C-27,30-28,22-30,14L-34,4C-40,-2-44,-8-42,-16L-36,-30C-28,-40-14,-44 0,-44Z');
    var cheek = dn('M-42,-16C-44,-8-40,-2-34,4L-30,14C-28,22-27,30-24,36L-18,36C-22,26-22,14-26,6C-30,-2-34,-8-42,-16Z');
    var ridge = 'M-2,-17C-10,-24-26,-31-46,-33L-56,-42C-40,-46-22,-44-12,-38C-5,-33-2,-25-2,-17Z';
    var eye = 'M-5,-12C-12,-15-21,-20-31,-23C-28,-14-19,-8-10,-7C-7,-8-5,-10-5,-12Z';
    var nostril = dn('M-5,21C-7,16-14,15-18,18C-20,21-18,24-15,24C-16,22-14,20-11,21C-9,22-7,22-5,21Z');
    var snarl = dn('M-8,-2C-12,0-14,2-15,5M-6,3C-10,5-12,7-13,10M-19,15C-15,11-9,11-6,14M-36,-30L-42,-16C-44,-8-40,-2-34,4M-30,-38C-20,-43-8,-44 0,-44');
    var lowerJaw = dn('M-30,36C-33,60-18,82 0,84C18,82 33,60 30,36C27,54 18,68 10,71L-10,71C-18,68-27,54-30,36Z');
    var mouth = dn('M-24,32C-28,48-20,64-10,71L10,71C20,64 28,48 24,32C10,36-10,36-24,32Z');
    var upTeeth = dn('M-24,32L-16,35L-19.5,53ZM-14,35.5L-8.5,36.5L-11.5,45ZM-6.5,36.6L-1.5,37L-4,43.5ZM1.5,37L6.5,36.6L4,43.5ZM8.5,36.5L14,35.5L11.5,45ZM16,35L24,32L19.5,53Z');
    var loTeeth = dn('M-18,66L-10,70L-14.5,54ZM-8,70.6L-2.5,71L-5.2,62ZM2.5,71L8,70.6L5.2,62ZM10,70L18,66L14.5,54Z');
    var marks = dn('M0,-42L0,-26M-6,-40C-14,-39-19,-33-15,-28M-30,-6C-34,2-31,9-27,12M-23,-2C-25,4-23,9-20,11M-12,-4C-14,2-15,6-17,9');
    return use(tines, 'fill="#5a3d16" stroke="#5a3d16" stroke-width="1.8" stroke-linejoin="round"') + use(tines, 'fill="' + url('hn') + '"') +
      horn + '<g transform="scale(-1 1)">' + horn + '</g>' +
      '<path d="' + both(whisk) + '" fill="#b9b2ee" opacity=".75"/>' +
      '<path d="' + both(ruff) + '" fill="#b9b2ee" stroke="#0b0820" stroke-width=".8"/>' +
      '<path d="' + lowerJaw + '" fill="' + url('fc') + '" stroke="#0b0820" stroke-width="1.2"/>' +
      '<path d="' + mouth + '" fill="' + url('mo') + '"/>' +
      '<path d="' + dn('M-13,64C-10,52 10,52 13,64C8,69-8,69-13,64Z') + '" fill="#c2304a"/><path d="M0,61L0,70" stroke="#7a1028" stroke-width="1"/>' +
      '<path d="' + upTeeth + loTeeth + '" fill="#fffaf0" stroke="#8d88a8" stroke-width=".5"/>' +
      '<path d="' + face + '" fill="' + url('fc') + '" stroke="#0b0820" stroke-width="1.3"/>' +
      '<path d="' + both(cheek) + '" fill="#140e3a" opacity=".5"/>' +
      '<path d="' + dn('M-8,-10C-12,0-16,8-20,14L20,14C16,8 12,0 8,-10C4,-14-4,-14-8,-10Z') + '" fill="#6d5ce8" opacity=".5"/>' +
      '<path d="' + dn('M-21,27C-24,19-19,12-11,12C-6,12-3,15 0,15C3,15 6,12 11,12C19,12 24,19 21,27C14,31-14,31-21,27Z') + '" fill="#4636b8" stroke="#0b0820" stroke-width=".9"/>' +
      '<path d="' + dn('M-19,17C-15,13-8,13-5,15C-2,17 2,17 5,15C8,13 15,13 19,17') + '" stroke="#a8b4ff" stroke-width="1" fill="none" opacity=".8"/>' +
      '<path d="' + both(nostril) + '" fill="#0b0820"/>' +
      '<path d="' + both(snarl) + '" stroke="#a8b4ff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>' +
      '<path d="' + dn('M-23,32C-10,36 10,36 23,32') + '" stroke="#5c0d22" stroke-width="2" fill="none"/>' +
      '<path d="' + both(marks) + '" stroke="#a8b4ff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".75"/>' +
      '<g class="dg-eye"><ellipse cx="-18" cy="-15" rx="17" ry="11" fill="' + url('eg') + '"/><ellipse cx="18" cy="-15" rx="17" ry="11" fill="' + url('eg') + '"/></g>' +
      '<path d="' + both(eye) + '" fill="#fff1a8"/>' +
      '<circle cx="-17" cy="-14" r="3.8" fill="#ff8a1f"/><circle cx="17" cy="-14" r="3.8" fill="#ff8a1f"/>' +
      '<path d="M-17,-17.6V-10.4M17,-17.6V-10.4" stroke="#120a05" stroke-width="1.7" stroke-linecap="round"/>' +
      // the bony brow ridges, jutting past the face, with a lit upper edge
      '<path d="' + both(ridge) + '" fill="#110b33" stroke="#0b0820" stroke-width=".8"/>' +
      '<path d="' + both('M-54,-41C-40,-45-24,-43-13,-37') + '" stroke="#8f8cf5" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>';
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
      // the bracelet: a black ring round the wrist, seen a little from above, spikes all round it
      '<path d="M-12,-23L-10,-31L-6,-24ZM-3,-25L0,-34L3,-25ZM6,-24L10,-31L12,-23Z" fill="' + url('sv') + '" stroke="#2a2c38" stroke-width=".6"/>' +
      '<path d="M-15,-21L-30,-19L-16,-13ZM15,-21L30,-19L16,-13Z" fill="' + url('sv') + '" stroke="#2a2c38" stroke-width=".7"/>' +
      '<path d="M-16,-23Q0,-18 16,-23L16,-12Q0,-6-16,-12Z" fill="#0d0a14" stroke="#6a6480" stroke-width="1"/>' +
      '<path d="M-14,-19.5Q0,-14.5 14,-19.5" stroke="#4a4560" stroke-width="1.2" fill="none"/>' +
      '<path d="M-13,-11L-11,-1L-7,-9ZM-4,-8L0,3L4,-8ZM7,-9L11,-1L13,-11Z" fill="' + url('sv') + '" stroke="#2a2c38" stroke-width=".6"/>';
  }
  function skull(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<path d="M0,-8C5,-8 8,-5 8,-1C8,2 6,3 5,4L5,7L-5,7L-5,4C-6,3-8,2-8,-1C-8,-5-5,-8 0,-8Z" fill="#fbf8ff" stroke="#3a2a5a" stroke-width=".8"/>' +
      '<path d="M-5,-2.2C-5,-4.4-1,-4.4-1,-1.8C-1,0-5,0.4-5,-2.2ZM5,-2.2C5,-4.4 1,-4.4 1,-1.8C1,0 5,0.4 5,-2.2ZM-0.9,2L0,0.4L0.9,2Z" fill="#1a1030"/>' +
      '<path d="M-3,4.4V7M-1,4.4V7M1,4.4V7M3,4.4V7" stroke="#3a2a5a" stroke-width=".7"/></g>';
  }
  // Fish-scale pattern: dark scale rims with light crescents, two highlight colours on alternate rows.
  function scalePattern(pid, w, h, rim, hiA, hiB, rot, sw) {
    var r = w / 2, d1 = '', d2 = '', rims = '';
    [[0, 0, 1], [w, 0, 1], [r, h, 2], [r, -h, 2], [0, 2 * h, 1], [w, 2 * h, 1]].forEach(function (c) {
      var x = c[0], y = c[1];
      rims += 'M' + P(x - r, y) + 'C' + P(x - r, y + r * 1.3) + ' ' + P(x + r, y + r * 1.3) + ' ' + P(x + r, y);
      var cr = 'M' + P(x - r * 0.8, y + r * 0.35) + 'C' + P(x - r * 0.7, y + r * 1.12) + ' ' + P(x + r * 0.7, y + r * 1.12) + ' ' + P(x + r * 0.8, y + r * 0.35) +
        'C' + P(x + r * 0.5, y + r * 0.8) + ' ' + P(x - r * 0.5, y + r * 0.8) + ' ' + P(x - r * 0.8, y + r * 0.35) + 'Z';
      if (c[2] === 1) d1 += cr; else d2 += cr;
    });
    return '<pattern id="' + pid + '" width="' + w + '" height="' + f(2 * h) + '" patternUnits="userSpaceOnUse"' + (rot ? ' patternTransform="rotate(' + Math.round(rot) + ')"' : '') + '>' +
      '<path d="' + d1 + '" fill="' + hiA + '"/><path d="' + d2 + '" fill="' + hiB + '"/>' +
      '<path d="' + rims + '" fill="none" stroke="' + rim + '" stroke-width="' + (sw || 1.1) + '"/></pattern>';
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
    var ring = spine(RING, 7, true), N = ring.length, neck = spine(NECK, 9, false), armR = spine(ARM_R, 6, false), armL = spine(ARM_L, 6, false);
    var tail = spine(TAIL, 6, false), coil = spine(COIL2, 8, false);
    var FROM = 81, TO = N + 3; // the stretch of the lower coil in front of the neck
    var front = ring.slice(FROM).concat(ring.slice(0, TO - N + 1));
    var gRing = geo('rb', band(ring, -1, 1, true), true), gFront = geo('fb', band(front, -1, 1)), gNeck = geo('nb', band(neck, -1, 1));
    var gArmR = geo('ar', band(armR, -1, 1)), gArmL = geo('al', band(armL, -1, 1)), gTail = geo('tb', band(tail, -1, 1)), gCoil = geo('cb', band(coil, -1, 1));
    var gTat = geo('tp', band(armR.slice(3, 24), -0.85, 0.85));
    var crest = tufts(ring, -1, 3, function (s) { return s.v[4] * 1.15; }, -1, 3);
    var neckCrest = tufts(neck, 1, 3, function (s) { return 14 + Math.max(0, s.i - 22) * 1.6; }, 0.5, 8, 18, 46);
    var up = function (a) { return Math.max(0, -Math.sin(a * Math.PI / 180)); };
    var mx = HEAD[0], my = HEAD[1] - 12;
    var ur = function (a) { return a > -50 && a < 10 ? 1 : 0; }; // the upper right, where the mane streams off along the coil
    var maneCore = fan(mx, my, 16, -220, 40, 10, function (a, r) { return 44 + up(a) * 12 + r * 8; }, 13, 6, 2);
    var mane = fan(mx, my, 30, -218, 38, 30, function (a, r) { return 30 + up(a) * 30 + ur(a) * 16 + r * 16; }, 10, function (a) { return a < -90 ? -18 : 18 + ur(a) * 10; }, 13);
    var maneHi = fan(mx, my, 6, -200, 20, 40, function (a, r) { return 16 + up(a) * 26 + ur(a) * 10 + r * 10; }, 1.8, function (a) { return a < -90 ? -14 : 14; }, 17);
    var beardD = fan(HEAD[0], HEAD[1] + 70, 11, 40, 140, 6, function (a, r) { return 12 + r * 8 + (1 - Math.abs(a - 90) / 50) * 10; }, 9, function (a) { return a < 90 ? 10 : -10; }, 4);
    var tip = tail[tail.length - 1], tipA = Math.atan2(tip.ty, tip.tx) * 180 / Math.PI, tx0 = tip.x - tip.tx * 4, ty0 = tip.y - tip.ty * 4;
    var tuft = fan(tx0, ty0, 6, tipA - 44, tipA + 30, 2, function (a, r) { return 30 + r * 10 - Math.abs(a - tipA) / 5; }, 10, 20, 21);
    var tuftHi = tongue(tx0, ty0, tipA - 6, 3, 30, 3.5, 26);
    Q = 10;

    defs += '<radialGradient id="' + id('rg') + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(200 160) scale(174 130)">' +
        '<stop offset=".66" stop-color="#1e1652"/><stop offset=".8" stop-color="#4a38c0"/><stop offset=".86" stop-color="#3b2a9c"/><stop offset=".97" stop-color="#1e1652"/><stop offset="1" stop-color="#140e3a"/></radialGradient>' +
      '<radialGradient id="' + id('rs') + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(200 160) scale(174 130)">' +
        '<stop offset=".66" stop-color="#0d0930" stop-opacity=".85"/><stop offset=".76" stop-color="#0d0930" stop-opacity="0"/><stop offset=".88" stop-color="#0d0930" stop-opacity="0"/><stop offset=".98" stop-color="#0d0930" stop-opacity=".8"/></radialGradient>' +
      '<linearGradient id="' + id('nk') + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#b8975a"/><stop offset=".35" stop-color="#f0dca0"/><stop offset=".7" stop-color="#e2c888"/><stop offset="1" stop-color="#a88548"/></linearGradient>' +
      '<linearGradient id="' + id('bl') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f0dca0"/><stop offset="1" stop-color="#b8975a"/></linearGradient>' +
      '<linearGradient id="' + id('lb') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6d5ce8"/><stop offset=".5" stop-color="#3b2a9c"/><stop offset="1" stop-color="#1e1652"/></linearGradient>' +
      '<linearGradient id="' + id('ls') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0d0930" stop-opacity="0"/><stop offset=".55" stop-color="#0d0930" stop-opacity=".1"/><stop offset="1" stop-color="#0d0930" stop-opacity=".75"/></linearGradient>' +
      '<linearGradient id="' + id('cs') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0d0930" stop-opacity=".85"/><stop offset=".45" stop-color="#0d0930" stop-opacity=".2"/><stop offset="1" stop-color="#0d0930" stop-opacity=".55"/></linearGradient>' +
      '<radialGradient id="' + id('fc') + '" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#6d5ce8"/><stop offset=".55" stop-color="#3b2a9c"/><stop offset="1" stop-color="#1e1652"/></radialGradient>' +
      '<radialGradient id="' + id('mo') + '" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#7a1028"/><stop offset="1" stop-color="#1a0610"/></radialGradient>' +
      '<radialGradient id="' + id('eg') + '"><stop offset="0" stop-color="#ffe08a" stop-opacity=".95"/><stop offset="1" stop-color="#ff9a1f" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id('hn') + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#f2e2b0"/><stop offset="1" stop-color="#c9a76a"/></linearGradient>' +
      '<linearGradient id="' + id('sv') + '" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9ccd8"/><stop offset="1" stop-color="#7d8296"/></linearGradient>' +
      '<linearGradient id="' + id('fo') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8340a"/><stop offset=".6" stop-color="#ff4d00"/><stop offset="1" stop-color="#ff7a10"/></linearGradient>' +
      '<linearGradient id="' + id('fm') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff7a10"/><stop offset="1" stop-color="#ff9a1f"/></linearGradient>' +
      '<linearGradient id="' + id('fy') + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#fff2c0"/></linearGradient>' +
      '<radialGradient id="' + id('fg') + '"><stop offset="0" stop-color="#ff6a10" stop-opacity=".4"/><stop offset="1" stop-color="#ff4d00" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id('sd') + '"><stop offset="0" stop-color="#0b0820" stop-opacity=".6"/><stop offset="1" stop-color="#0b0820" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id('au') + '" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".5"/><stop offset=".6" stop-color="#6d28d9" stop-opacity=".2"/><stop offset="1" stop-color="#5b21b6" stop-opacity="0"/></radialGradient>' +
      scalePattern(id('sc'), 10, 6, '#100b2e', '#a8b4ff', '#6d5ce8') +
      scalePattern(id('ss'), 7, 4.2, '#100b2e', '#a8b4ff', '#6d5ce8', 0, 0.9) +
      scalePattern(id('tt'), 7, 4.2, '#5a1206', '#ffd166', '#ff9a1f');
    // the ring's scales turn with it: one pattern per stretch between control points, rotated to its tangent
    var NA = RING.length, SEG = N / NA;
    for (var k = 0; k < NA; k++) {
      var m1 = ring[k * SEG + 3], m2 = ring[k * SEG + 4];
      defs += scalePattern(id('s' + k), 10, 6, '#100b2e', '#a8b4ff', '#6d5ce8', Math.atan2(m1.tx + m2.tx, -m1.ty - m2.ty) * 180 / Math.PI);
    }
    function ringScales(from, to) {
      var s = '';
      Q = 1;
      for (var k = 0; k < 2 * NA; k++) {
        var lo = Math.max(k * SEG, from), hi = Math.min(k * SEG + SEG, to), seg = [];
        if (hi <= lo) continue;
        for (var i = lo; i <= hi; i++) seg.push(ring[i % N]);
        s += '<path d="' + band(seg, -1, 1) + '" fill="' + url('s' + (k % NA)) + '"/>';
      }
      Q = 10;
      return '<g opacity=".85">' + s + '</g>';
    }
    // flame masses: a red ragged outer mass, an orange one inside it and a yellow core, defined once each
    FIRE.forEach(function (v, k) {
      defs += '<g id="' + id('F' + k) + '"><ellipse cy="' + f(-v[2] * 0.36) + '" rx="' + f(v[1] * 0.95) + '" ry="' + f(v[2] * 0.6) + '" fill="' + url('fg') + '"/>' +
        '<path d="' + fire(v[0], v[1], v[2], v[3], v[4]) + '" fill="' + url('fo') + '"/>' +
        '<path d="' + fire(Math.max(2, v[0] - 1), v[1] * 0.68, v[2] * 0.68, v[3], v[4] + 1) + '" fill="' + url('fm') + '"/>' +
        '<path d="' + fire(Math.max(1, v[0] - 2), v[1] * 0.4, v[2] * 0.4, v[3], v[4] + 2) + '" fill="' + url('fy') + '"/></g>';
    });
    function flames(inFront) {
      return FLAMES.filter(function (fl) { return !!fl[7] === inFront; }).map(function (fl, k) {
        return '<g transform="translate(' + fl[0] + ' ' + fl[1] + ') rotate(' + fl[2] + ') scale(' + (fl[6] ? -fl[3] : fl[3]) + ' ' + fl[4] + ')">' +
          use('#' + id('F' + fl[5]), 'class="dg-fl f' + (k % 3) + '"') + '</g>';
      }).join('');
    }
    // a scaly tube: base fill, scales, shading
    function tube(ref, fill, shade, pat) {
      return use(ref, 'fill="' + fill + '"') + use(ref, 'fill="' + url(pat || 'ss') + '" opacity=".85"') + (shade ? use(ref, 'fill="' + shade + '"') : '');
    }
    // black hair with a violet rim round its outline only: the path stroked wide, then filled black over the stroke
    function rimmed(name, d, w) { var g = geo(name, d); return use(g, 'fill="#3f356a" stroke="#4a3f78" stroke-width="' + w + '" stroke-linejoin="round"') + use(g, 'fill="#0d0a14"'); }
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
    // the tail with its tuft, dropping from the lower loop
    out += rimmed('tf', tuft, 1.6) + '<path d="' + tuftHi + '" fill="#3f356a"/>';
    Q = 1;
    out += tube(gTail, url('lb'), url('ls')) + '<path d="' + band(tail, inner, 1) + '" fill="' + url('bl') + '"/>' +
      '<path d="' + ribs(tail, inner, 1, 2, 1) + '" stroke="#6b4f2a" stroke-width=".9" fill="none"/>';
    Q = 10;
    out += edges(tail);
    // the second, lower loop under the ring: scales, a belly strip along its lower edge, the ring's shadow on it
    Q = 1;
    out += tube(gCoil, '#3b2a9c', url('cs'), 's0') + '<path d="' + band(coil, 0.5, 1) + '" fill="' + url('bl') + '"/>' +
      '<path d="' + ribs(coil, 0.5, 1, 2, 1.5) + '" stroke="#6b4f2a" stroke-width="1" fill="none"/>';
    Q = 10;
    out += edges(coil, false, 1.4);
    Q = 1;
    out += '<path d="' + line(ring.slice(74).concat(ring.slice(0, 22)), -1.12) + '" stroke="#0b0820" stroke-width="7" fill="none" opacity=".45"/>';
    Q = 10;
    // the crest along the spine, then the ring
    out += rimmed('cr', crest, 1.6);
    out += use(gRing, 'fill="' + url('rg') + '"') + ringScales(0, N) + use(gRing, 'fill="' + url('rs') + '"') + ringDetail(ring, true);
    // right forelimb (its shoulder behind the neck): cast shadow, tattoo, rim light, skull
    out += use(gArmR, 'transform="translate(3 5)" fill="#0b0820" opacity=".5"');
    out += tube(gArmR, url('lb'), url('ls'));
    out += use(gTat, 'fill="#d2401a"') + use(gTat, 'fill="' + url('tt') + '"') + edges(armR);
    Q = 1;
    out += '<path d="' + line(armR.slice(6), -0.8) + '" stroke="#a8b4ff" stroke-width="1.2" fill="none" opacity=".6"/>';
    Q = 10;
    out += skull(343, 200, 1.05);
    // left forelimb (its shoulder behind the neck)
    out += use(gArmL, 'transform="translate(2 4)" fill="#0b0820" opacity=".4"') + tube(gArmL, url('lb'), url('ls')) + edges(armL);
    // neck: crest, scaly back, ribbed belly, the X scar
    out += rimmed('nc', neckCrest, 1.6);
    out += tube(gNeck, '#3b2a9c', null, 'sc');
    Q = 1;
    out += '<path d="' + band(neck, -1, 0.72) + '" fill="' + url('nk') + '"/>' +
      '<path d="' + ribs(neck, -1, 0.72, 2, -3) + '" stroke="#6b4f2a" stroke-width="1.3" fill="none"/>' +
      '<path d="' + line(neck, 0.72) + '" stroke="#4a3418" stroke-width="1.2" fill="none"/>';
    Q = 10;
    var scar = 'M216,192C230,212 248,232 276,252M278,194C262,212 246,234 218,256';
    out += '<path d="' + scar + '" stroke="#5b2416" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="' + scar + '" stroke="#e8a084" stroke-width="2" fill="none" stroke-linecap="round"/>';
    out += edges(neck, false, 1.4);
    out += '<ellipse cx="212" cy="194" rx="24" ry="18" fill="' + url('sd') + '"/>'; // the head's shadow on the neck
    // the front of the lower coil, over the neck's base
    out += use(gFront, 'fill="' + url('rg') + '"') + ringScales(FROM, TO) + use(gFront, 'fill="' + url('rs') + '"') + ringDetail(front, false);
    // the hands with their spiked bracelets
    var wl = armL[armL.length - 1], al = Math.atan2(wl.ty, wl.tx) * 180 / Math.PI - 90;
    out += '<ellipse cx="' + f(wl.x - 12) + '" cy="' + f(wl.y + 18) + '" rx="26" ry="12" fill="' + url('sd') + '"/>';
    out += '<g transform="translate(' + f(wl.x + wl.tx * 4) + ' ' + f(wl.y + wl.ty * 4) + ') rotate(' + f(al + 10) + ') scale(1.25)">' + hand(url) + '</g>';
    var wr = armR[armR.length - 1], ar = Math.atan2(wr.ty, wr.tx) * 180 / Math.PI - 90;
    out += '<ellipse cx="' + f(wr.x) + '" cy="' + f(wr.y + 26) + '" rx="26" ry="12" fill="' + url('sd') + '"/>';
    out += '<g transform="translate(' + f(wr.x + wr.tx * 4) + ' ' + f(wr.y + wr.ty * 4) + ') rotate(' + f(ar) + ') scale(1.25)">' + hand(url) + '</g>';
    // the mane behind the head, the head, the beard
    out += '<ellipse cx="' + HEAD[0] + '" cy="' + (HEAD[1] - 20) + '" rx="120" ry="110" fill="' + url('au') + '"/>';
    var gMane = '#' + id('mn');
    out += '<g class="dg-mane">' + rimmed('mn', maneCore + mane, 1.6) +
      '<path d="' + maneHi + '" fill="#776d9e" opacity=".55" clip-path="' + url('mc') + '"/></g>';
    defs += '<clipPath id="' + id('mc') + '">' + use(gMane, '') + '</clipPath>';
    out += '<g transform="translate(' + HEAD[0] + ' ' + HEAD[1] + ')"><g class="dg-head">' + head(url, geo, use) + '</g></g>';
    out += rimmed('bd', beardD, 1.6);
    out += flames(true);
    injectStyle();
    // a 6% margin all round so the mane, crest, flames and tuft never touch the edges
    return '<svg xmlns="http://www.w3.org/2000/svg" class="dragon ' + (cls || '') + '" viewBox="0 0 400 400" role="img" aria-label="Kaido\'s dragon form">' +
      '<defs>' + defs + '</defs><g transform="matrix(.94 0 0 .94 12 12)">' + out + '</g></svg>';
  };

  var CSS = '@keyframes dgFlick{0%{transform:scale(1,1);opacity:1}50%{transform:scale(.94,1.08);opacity:.92}100%{transform:scale(1.05,.9);opacity:.84}}' +
    '@keyframes dgSway{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}' +
    '@keyframes dgGlow{from{opacity:.45}to{opacity:1}}' +
    '@keyframes dgBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}' +
    '@media (prefers-reduced-motion: no-preference){' +
      '.dragon .dg-fl{transform-box:fill-box;transform-origin:50% 100%;animation:dgFlick 1.3s ease-in-out infinite alternate}' +
      '.dragon .dg-fl.f1{animation-duration:1.7s;animation-delay:-.6s}.dragon .dg-fl.f2{animation-duration:1.1s;animation-delay:-.3s}' +
      '.dragon .dg-mane{transform-box:fill-box;transform-origin:50% 80%;animation:dgSway 5s ease-in-out infinite alternate}' +
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
