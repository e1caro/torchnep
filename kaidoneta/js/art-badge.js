/* Kaidoneta – the crew badge "Road to Bristol · Kaidoneta", drawn as SVG.
 *   K.art.badge(opts)      the full 640 x 640 badge; opts.text === false leaves out the lettering, opts.cls adds classes
 *   K.art.badgeMark(cls)   the badge without lettering (header art, icon art)
 *   K.art.icon(rounded, s) the 512 x 512 phone app icon (replaces the crest icon of art.js; this file loads after it)
 * Kaido's dragon head (cyan, jaw wide open, orange antler horns) in front of Onigashima — the castle on the horned
 * skull rock under a pale full moon — inside a ring of purple lightning. */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = K.art || {});
  var n = 0; // unique id suffix per call

  function f(x) { return Math.round(x * 10) / 10; }
  function P(x, y) { return f(x) + ' ' + f(y); }
  function rng(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  // points along a chain of cubic segments [x0,y0, c1x,c1y, c2x,c2y, x1,y1, c1x,c1y, c2x,c2y, x2,y2, ...]
  function sample(p, steps) {
    var out = [], segs = (p.length - 2) / 6;
    for (var s = 0; s < segs; s++) {
      var o = s * 6;
      for (var i = s ? 1 : 0; i <= steps; i++) {
        var t = i / steps, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push([a * p[o] + b * p[o + 2] + c * p[o + 4] + d * p[o + 6], a * p[o + 1] + b * p[o + 3] + c * p[o + 5] + d * p[o + 7]]);
      }
    }
    return out;
  }
  // a ribbon along the chain, width w0 at the start tapering to w1 at the end (pw shapes the taper)
  function taper(p, w0, w1, pw) {
    var pts = sample(p, 12), L = [], R = [], N = pts.length - 1;
    for (var i = 0; i <= N; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
      var w = (w0 + (w1 - w0) * Math.pow(i / N, pw || 1)) / 2;
      L.push(P(pts[i][0] - dy / d * w, pts[i][1] + dx / d * w));
      R.push(P(pts[i][0] + dy / d * w, pts[i][1] - dx / d * w));
    }
    return 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
  }
  function pl(pts) { return 'M' + pts.map(function (q) { return P(q[0], q[1]); }).join('L'); }
  // a jagged lightning stroke from (x0,y0) to (x1,y1)
  function zap(r, x0, y0, x1, y1, jag, segs) {
    var pts = [[x0, y0]], dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / d, ny = dx / d;
    for (var i = 1; i < segs; i++) {
      var t = (i + (r() - 0.5) * 0.5) / segs, o = (r() - 0.5) * 2 * jag;
      pts.push([x0 + dx * t + nx * o, y0 + dy * t + ny * o]);
    }
    pts.push([x1, y1]);
    return pts;
  }
  // a Japanese cloud curl: a spiral winding inward
  function curl(cx, cy, r0, a0, turns, dir) {
    var pts = [];
    for (var i = 0; i <= 28; i++) {
      var t = i / 28, a = a0 + dir * t * turns * 2 * Math.PI, r = r0 * (1 - 0.8 * t);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pl(pts);
  }
  // puffy curl clouds: black under-circles give the merged outline, then the fill, then the curls
  function cloud(puffs, fill, curlCol, ink) {
    var back = '', front = '', curls = '';
    puffs.forEach(function (c, k) {
      back += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + (c[2] + ink) + '"/>';
      front += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>';
      curls += curl(c[0] + c[2] * 0.08, c[1] + c[2] * 0.02, c[2] * 0.66, k % 2 ? -2.4 : -0.7, 1.15, k % 2 ? 1 : -1);
    });
    return '<g fill="#07020f">' + back + '</g><g fill="' + fill + '">' + front + '</g>' +
      '<path d="' + curls + '" fill="none" stroke="' + curlCol + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  // a stack of needle fangs along a quadratic gum line
  function fangs(q, list, dir) {
    var s = '';
    list.forEach(function (tl) {
      var t = tl[0], L = tl[1], w = tl[2], u = 1 - t;
      var x = u * u * q[0] + 2 * u * t * q[2] + t * t * q[4], y = u * u * q[1] + 2 * u * t * q[3] + t * t * q[5];
      var gx = 2 * u * (q[2] - q[0]) + 2 * t * (q[4] - q[2]), gy = 2 * u * (q[3] - q[1]) + 2 * t * (q[5] - q[3]);
      var g = Math.sqrt(gx * gx + gy * gy); gx /= g; gy /= g;
      var dx = dir[0], dy = dir[1], d = Math.sqrt(dx * dx + dy * dy); dx /= d; dy /= d;
      var bx = x - dx * 4, by = y - dy * 4;
      s += 'M' + P(bx - gx * w / 2, by - gy * w / 2) + 'Q' + P(bx - gx * w * 0.3 + dx * L * 0.6, by - gy * w * 0.3 + dy * L * 0.6) + ' ' + P(x + dx * L + gx * 1.5, y + dy * L + gy * 1.5) +
        'Q' + P(bx + gx * w * 0.15 + dx * L * 0.5, by + gy * w * 0.15 + dy * L * 0.5) + ' ' + P(bx + gx * w / 2, by + gy * w / 2) + 'Z';
    });
    return s;
  }
  // a Japanese castle roof: upturned eaves at half-width w, ridge h above the eave line y
  function roof(cx, y, w, h) {
    return 'M' + P(cx - w, y - 5) + 'Q' + P(cx - w * 0.62, y - h * 0.3) + ' ' + P(cx - w * 0.4, y - h) + 'L' + P(cx + w * 0.4, y - h) +
      'Q' + P(cx + w * 0.62, y - h * 0.3) + ' ' + P(cx + w, y - 5) + 'Q' + P(cx + w * 0.6, y + 3) + ' ' + P(cx, y + 3) + 'Q' + P(cx - w * 0.6, y + 3) + ' ' + P(cx - w, y - 5) + 'Z' +
      'M' + P(cx - 9, y - h * 0.25) + 'L' + P(cx, y - h * 0.95) + 'L' + P(cx + 9, y - h * 0.25) + 'Z';
  }

  var SKIN = 'M196 214C236 214 290 232 324 248C338 240 362 242 374 256C386 268 386 284 376 294Q300 304 238 336Q296 362 352 398' +
    'C362 410 354 430 336 432C300 442 262 448 232 446C218 470 212 520 216 640L90 640C88 520 102 400 118 340C122 280 146 232 196 214Z';

  function art(i, o) {
    var lite = !!o.lite, ink = lite ? 6.5 : 5;
    var r = rng(11), s = '';
    var id = function (k) { return k + i; }, url = function (k) { return 'url(#' + k + i + ')'; };

    // ---- defs
    s += '<defs>' +
      '<clipPath id="' + id('bc') + '"><circle cx="320" cy="320" r="289"/></clipPath>' +
      '<clipPath id="' + id('dc') + '"><circle cx="320" cy="320" r="289"/><rect width="640" height="300"/></clipPath>' +
      '<clipPath id="' + id('sk') + '"><path d="' + SKIN + '"/></clipPath>' +
      '<radialGradient id="' + id('sky') + '" cx="470" cy="250" r="380" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5b21b6"/><stop offset=".35" stop-color="#2e0f5c"/><stop offset=".75" stop-color="#140630"/><stop offset="1" stop-color="#07020f"/></radialGradient>' +
      '<radialGradient id="' + id('halo') + '"><stop offset=".55" stop-color="#e9d5ff" stop-opacity=".5"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id('moon') + '" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fdfaff"/><stop offset=".55" stop-color="#ead8ff"/><stop offset="1" stop-color="#b58cf2"/></radialGradient>' +
      '<linearGradient id="' + id('skin') + '" x1="250" y1="210" x2="160" y2="600" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9be9ff"/><stop offset=".22" stop-color="#4fc3f7"/><stop offset=".5" stop-color="#29b6f6"/><stop offset=".78" stop-color="#0277bd"/><stop offset="1" stop-color="#123a8c"/></linearGradient>' +
      '<linearGradient id="' + id('horn') + '" x1="212" y1="234" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b84300"/><stop offset=".2" stop-color="#d35400"/><stop offset=".55" stop-color="#f39c12"/><stop offset="1" stop-color="#ffcf5c"/></linearGradient>' +
      '<linearGradient id="' + id('hornb') + '" x1="180" y1="235" x2="20" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7a2a00"/><stop offset=".4" stop-color="#b84a00"/><stop offset="1" stop-color="#e08a1e"/></linearGradient>' +
      '<linearGradient id="' + id('bone') + '" x1="0" y1="1" x2=".2" y2="0"><stop offset="0" stop-color="#6e5a8c"/><stop offset=".45" stop-color="#cbbce0"/><stop offset="1" stop-color="#fbf6ff"/></linearGradient>' +
      '<linearGradient id="' + id('rock') + '" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#8d7bb0"/><stop offset=".35" stop-color="#5a4682"/><stop offset="1" stop-color="#1e1236"/></linearGradient>' +
      '<radialGradient id="' + id('mouth') + '" cx="240" cy="336" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0010"/><stop offset=".45" stop-color="#b3122e"/><stop offset="1" stop-color="#ff5577"/></radialGradient>' +
      '<radialGradient id="' + id('eye') + '" cx=".55" cy=".45" r=".6"><stop offset="0" stop-color="#fff7b0"/><stop offset=".45" stop-color="#ffc21a"/><stop offset="1" stop-color="#e65100"/></radialGradient>' +
      '<linearGradient id="' + id('tooth') + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cdd3e6"/></linearGradient>' +
      '<linearGradient id="' + id('fin') + '" x1="160" y1="270" x2="80" y2="220" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#29b6f6"/><stop offset="1" stop-color="#1546a8"/></linearGradient>' +
      '<linearGradient id="' + id('cl1') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b6cf0"/><stop offset=".5" stop-color="#6d28d9"/><stop offset="1" stop-color="#2e0b63"/></linearGradient>' +
      '<linearGradient id="' + id('cl2') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3fb8"/><stop offset="1" stop-color="#22093f"/></linearGradient>' +
      '<pattern id="' + id('sc') + '" width="16" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">' +
        '<path d="M0 0A8 8 0 0 0 16 0M-8 6A8 8 0 0 0 8 6M8 6A8 8 0 0 0 24 6M0 12A8 8 0 0 0 16 12" fill="none" stroke="#0b3d91" stroke-width="1.3" stroke-opacity=".75"/>' +
        '<path d="M3 3.5A6 6 0 0 0 13 3.5M-5 9.5A6 6 0 0 0 5 9.5M11 9.5A6 6 0 0 0 21 9.5" fill="none" stroke="#c9f3ff" stroke-width="1" stroke-opacity=".45"/></pattern>' +
      '<filter id="' + id('gl') + '" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="' + (lite ? 7 : 5.5) + '"/></filter>' +
      '<filter id="' + id('ge') + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>' +
      '</defs>';

    // ---- lightning paths (ring + bolts into the corners)
    var ring = [], ring2 = [], a, rr;
    for (a = 0; a < 360; a += 4.5) {
      rr = 292 + (r() - 0.5) * 16;
      ring.push([320 + rr * Math.cos(a * Math.PI / 180), 320 + rr * Math.sin(a * Math.PI / 180)]);
    }
    for (a = 2; a < 362; a += 7) {
      rr = 294 + (r() - 0.5) * 22;
      ring2.push([320 + rr * Math.cos(a * Math.PI / 180), 320 + rr * Math.sin(a * Math.PI / 180)]);
    }
    var bolts = pl(ring) + 'Z' + pl(ring2) + 'Z';
    var angs = lite ? [-40, -10, 25, 50, 75, 105, 135, 160, 200] : [-62, -40, -18, 5, 25, 48, 72, 100, 128, 150, 172, 196, 250];
    angs.forEach(function (d) {
      var t = d * Math.PI / 180, r0 = 294, r1 = 370 + r() * 100;
      var main = zap(r, 320 + r0 * Math.cos(t), 320 + r0 * Math.sin(t), 320 + r1 * Math.cos(t + (r() - 0.5) * 0.25), 320 + r1 * Math.sin(t + (r() - 0.5) * 0.25), 12, 6);
      bolts += pl(main);
      var k = 2 + Math.floor(r() * 3), q = main[k], t2 = t + (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.3), l2 = 40 + r() * 50;
      bolts += pl(zap(r, q[0], q[1], q[0] + l2 * Math.cos(t2), q[1] + l2 * Math.sin(t2), 7, 4));
    });
    // bolts in the sky behind the castle
    var sky = pl(zap(r, 590, 150, 548, 330, 14, 7)) + pl(zap(r, 360, 95, 395, 300, 12, 7)) + pl(zap(r, 575, 210, 610, 280, 8, 4));

    // ---- background inside the circle
    s += '<rect width="640" height="640" fill="#050109"/>';
    s += '<g clip-path="' + url('bc') + '">' +
      '<rect width="640" height="640" fill="' + url('sky') + '"/>';
    if (!lite) {
      var st = '';
      for (var k = 0; k < 26; k++) st += '<circle cx="' + f(60 + r() * 520) + '" cy="' + f(50 + r() * 260) + '" r="' + f(0.6 + r() * 1.3) + '"/>';
      s += '<g fill="#f3e8ff" opacity=".8">' + st + '</g>';
    }
    s += '<circle cx="470" cy="240" r="165" fill="' + url('halo') + '"/>' +
      '<circle cx="470" cy="240" r="104" fill="' + url('moon') + '" stroke="#f5edff" stroke-width="2"/>' +
      '<g fill="#a77ee8" opacity=".32"><circle cx="430" cy="205" r="18"/><circle cx="505" cy="190" r="11"/><circle cx="520" cy="262" r="21"/><circle cx="452" cy="270" r="9"/><circle cx="410" cy="250" r="7"/></g>' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="' + sky + '" stroke="#a855f7" stroke-width="9" filter="' + url('gl') + '"/>' +
      '<path d="' + sky + '" stroke="#d8b4fe" stroke-width="2.6"/><path d="' + sky + '" stroke="#fff" stroke-width="1"/></g>';
    // clouds behind the castle rock
    s += cloud([[372, 470, 30], [600, 430, 30], [575, 470, 34], [405, 505, 34]], url('cl2'), '#8b5cf6', ink);
    // Onigashima: horned skull rock with the castle on top
    var hornL = taper([420, 394, 392, 396, 370, 380, 368, 350, 366, 326, 374, 310, 390, 296], 30, 3, 1.1);
    var hornR = taper([540, 394, 568, 396, 590, 380, 592, 350, 594, 326, 586, 310, 570, 296], 30, 3, 1.1);
    s += '<g stroke="#07020f" stroke-width="' + ink + '" stroke-linejoin="round">' +
      '<path d="' + hornL + hornR + '" fill="' + url('bone') + '"/>' +
      '<path d="M372 640C384 560 404 506 436 478L524 478C556 506 578 560 590 640Z" fill="#251542"/>' +
      '<path d="M420 440C404 410 408 365 440 350C465 340 500 340 522 350C552 365 558 410 540 440C534 452 528 462 526 476L434 476C432 462 426 452 420 440Z" fill="' + url('rock') + '"/>' +
      '<path d="M438 470L522 470C524 495 510 516 480 519C450 516 436 495 438 470Z" fill="#3b2a5e"/>' +
      '</g>' +
      '<path d="M436 352C452 344 470 341 490 342" fill="none" stroke="#d9c8f5" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M372 316C370 334 372 352 380 368M576 312C584 328 588 348 586 368" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' +
      (lite ? '' : '<path d="M420 430L432 438L428 452M540 428L530 440L534 452M470 342L466 352M500 520L506 540L498 560" fill="none" stroke="#1a0d30" stroke-width="2" stroke-linecap="round"/>') +
      // eyes, nose, grin
      '<g fill="#07020f"><ellipse cx="455" cy="405" rx="20" ry="16"/><ellipse cx="505" cy="405" rx="20" ry="16"/><path d="M480 420L471 441Q480 445 489 441Z"/></g>' +
      '<g fill="#ff8a00" filter="' + url('ge') + '"><ellipse cx="455" cy="406" rx="15" ry="11"/><ellipse cx="505" cy="406" rx="15" ry="11"/></g>' +
      '<g fill="#ffd54f"><ellipse cx="455" cy="406" rx="9" ry="6.5"/><ellipse cx="505" cy="406" rx="9" ry="6.5"/></g>' +
      '<path d="M440 460Q480 474 520 460L518 474Q480 486 442 474Z" fill="#f1e8ff" stroke="#07020f" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M452 465L452 478M466 468L466 481M480 469L480 482M494 468L494 481M508 465L508 478" stroke="#07020f" stroke-width="2.4"/>';
    // the castle
    var walls = '<rect x="450" y="316" width="60" height="24"/><rect x="458" y="288" width="44" height="14"/><rect x="465" y="262" width="30" height="13"/><rect x="471" y="238" width="18" height="12"/>';
    s += '<g stroke="#07020f" stroke-width="' + (ink - 1.5) + '" stroke-linejoin="round">' +
      '<path d="M440 358L520 358L512 336L448 336Z" fill="#4a3870"/>' +
      '<g fill="#2a1449">' + walls + '</g>' +
      '<path d="' + roof(480, 316, 52, 20) + roof(480, 288, 42, 17) + roof(480, 262, 33, 15) + roof(480, 238, 24, 13) + '" fill="#1b0b33"/>' +
      '</g>' +
      '<path d="M432 312Q452 300 460 297M528 312Q508 300 500 297M442 284Q458 274 463 270M518 284Q502 274 497 270" fill="none" stroke="#b47cff" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M480 226L480 206M474 226Q470 218 475 214M486 226Q490 218 485 214" fill="none" stroke="#07020f" stroke-width="3" stroke-linecap="round"/>' +
      '<g fill="#ffb02e" filter="' + url('ge') + '"><rect x="456" y="322" width="48" height="10"/><rect x="463" y="292" width="34" height="7"/><rect x="469" y="265" width="22" height="6"/></g>' +
      '<g fill="#ffe08a"><rect x="458" y="324" width="7" height="7"/><rect x="470" y="324" width="7" height="7"/><rect x="483" y="324" width="7" height="7"/><rect x="495" y="324" width="7" height="7"/>' +
      '<rect x="465" y="293" width="6" height="5"/><rect x="477" y="293" width="6" height="5"/><rect x="489" y="293" width="6" height="5"/><rect x="471" y="266" width="5" height="4"/><rect x="484" y="266" width="5" height="4"/></g>' +
      // lanterns at the eaves
      '<g stroke="#07020f" stroke-width="1.6"><path d="M430 313L430 320M530 313L530 320M440 285L440 291M520 285L520 291" fill="none"/>' +
      '<g fill="#ff5a1f"><ellipse cx="430" cy="325" rx="5" ry="6.5"/><ellipse cx="530" cy="325" rx="5" ry="6.5"/><ellipse cx="440" cy="295" rx="4" ry="5"/><ellipse cx="520" cy="295" rx="4" ry="5"/></g></g>' +
      '<g fill="#ff9a3c" opacity=".7" filter="' + url('ge') + '"><circle cx="430" cy="325" r="8"/><circle cx="530" cy="325" r="8"/></g>';
    // storm clouds at the rock's foot
    s += cloud([[392, 560, 44], [470, 548, 40], [548, 556, 46], [610, 520, 40], [330, 590, 40], [455, 600, 42]], url('cl1'), '#d8b4fe', ink);
    s += cloud([[52, 410, 36], [60, 470, 40]], url('cl2'), '#a78bfa', ink);
    s += '</g>';

    // ---- the lightning ring
    s += '<circle cx="320" cy="320" r="292" fill="none" stroke="#1d0838" stroke-width="12"/>' +
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="' + bolts + '" stroke="#9333ea" stroke-width="' + (lite ? 16 : 11) + '" filter="' + url('gl') + '"/>' +
      '<path d="' + bolts + '" stroke="#c084fc" stroke-width="' + (lite ? 5.5 : 3.6) + '"/>' +
      '<path d="' + bolts + '" stroke="#fff" stroke-width="' + (lite ? 2.2 : 1.3) + '"/></g>';

    // ---- the dragon
    // antler horns (far one first), unclipped: they sweep out of the circle
    var DT = ' transform="translate(-23 11) scale(1.1)"';
    var beamN = [212, 234, 196, 190, 168, 160, 130, 138, 92, 116, 58, 92, 30, 26], beamF = [186, 240, 150, 214, 112, 200, 74, 186, 46, 176, 22, 166, 0, 138];
    var hornFar = taper(beamF, 36, 4, 0.9) + taper([124, 204, 128, 186, 128, 168, 120, 148], 15, 2) + taper([74, 188, 74, 172, 70, 156, 60, 140], 12, 2);
    var hornNear = taper(beamN, 48, 5, 0.85) +
      taper([200, 200, 214, 190, 228, 178, 240, 156], 18, 2) + taper([172, 166, 184, 146, 194, 124, 196, 96], 21, 2.5) +
      taper([132, 142, 140, 120, 144, 98, 138, 70], 19, 2.5) + taper([90, 118, 92, 100, 92, 82, 84, 58], 15, 2);
    // ring grooves across a beam
    function grooves(ch, w0, w1, ts) {
      var pts = sample(ch, 12), N = pts.length - 1, d = '';
      ts.forEach(function (t) {
        var j = Math.round(t * N), a = pts[Math.max(0, j - 1)], b = pts[Math.min(N, j + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
        var w = (w0 + (w1 - w0) * Math.pow(t, 0.85)) * 0.32, c = pts[j];
        d += 'M' + P(c[0] - dy / l * w, c[1] + dx / l * w) + 'Q' + P(c[0] + dx / l * 4, c[1] + dy / l * 4) + ' ' + P(c[0] + dy / l * w, c[1] - dx / l * w);
      });
      return d;
    }
    s += '<g' + DT + ' stroke="#07020f" stroke-width="' + ink + '" stroke-linejoin="round">' +
      '<path d="' + hornFar + '" fill="' + url('hornb') + '"/>' +
      (lite ? '' : '<path d="' + grooves(beamF, 36, 4, [0.2, 0.36, 0.52, 0.68]) + '" fill="none" stroke="#4a1800" stroke-width="2.2" stroke-linecap="round"/>') +
      '</g>';
    // mane: black flame tongues behind head and neck (purple rim light = the stroke under the merged fill)
    var mane = '';
    [[192, 220, 34, 0], [168, 236, 42, 1], [146, 262, 46, 0], [130, 296, 48, 1], [120, 336, 50, 0], [112, 380, 50, 1], [106, 426, 48, 0], [100, 472, 44, 1], [96, 520, 40, 0], [98, 566, 40, 1]].forEach(function (m) {
      var x = m[0], y = m[1], up = m[3] ? 1 : 0.7;
      mane += taper([x + 8, y + 4, x - 30, y + 2, x - 70, y + 14, x - 92 - 10 * up, y - 26 * up], m[2], 0, 1.2);
    });
    [[186, 214, 30], [140, 282, 26], [116, 360, 28], [104, 450, 26], [98, 540, 24]].forEach(function (m) {
      mane += taper([m[0], m[1], m[0] - 22, m[1] - 12, m[0] - 40, m[1] - 34, m[0] - 44, m[1] - 62], m[2], 0, 1.1);
    });
    s += '<g clip-path="' + url('dc') + '"><g' + DT + '>' +
      '<path d="' + mane + '" fill="none" stroke="#8b3dff" stroke-width="' + (ink + 4) + '" stroke-linejoin="round"/>' +
      '<path d="' + mane + '" fill="#07020f"/>';
    s += '<path d="' + hornNear + '" fill="' + url('horn') + '" stroke="#07020f" stroke-width="' + ink + '" stroke-linejoin="round"/>' +
      '<path d="M198 200C186 176 162 154 128 136C98 120 72 102 52 70M190 160C194 144 196 124 196 104M140 132C142 114 142 96 140 80" fill="none" stroke="#ffe7b0" stroke-width="3" stroke-linecap="round" opacity=".9"/>' +
      (lite ? '' : '<path d="' + grooves(beamN, 48, 5, [0.14, 0.27, 0.4, 0.53, 0.66, 0.79]) + '" fill="none" stroke="#6b2200" stroke-width="2.4" stroke-linecap="round"/>');
    // mouth interior and tongue (behind the skin)
    s += '<path d="M230 337L380 290Q374 350 356 404Z" fill="' + url('mouth') + '" stroke="#07020f" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M246 343C285 352 318 372 340 362C352 356 358 370 346 378C316 394 280 372 244 351Z" fill="#ff6b95" stroke="#4a0014" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M262 350C290 358 314 370 334 368" fill="none" stroke="#c2185b" stroke-width="2" stroke-linecap="round"/>';
    // skin, scales, shading
    s += '<path d="' + SKIN + '" fill="' + url('skin') + '"/>' +
      '<g clip-path="' + url('sk') + '">' +
      '<path d="M88 640L240 640L240 430C200 400 160 360 130 330L88 330Z" fill="' + url('sc') + '"/>' +
      '<path d="M90 640C88 520 102 400 118 340L156 342C146 420 144 520 152 640Z" fill="#0d2f80" opacity=".55"/>' +
      '<path d="M200 376C250 420 300 440 342 432L342 470L200 470Z" fill="#0d3a99" opacity=".55"/>' +
      '<path d="M206 262C232 282 270 278 302 258L304 272C272 292 232 294 204 278Z" fill="#0d3a99" opacity=".45"/>' +
      '<path d="M210 220C250 224 300 238 330 252C345 246 360 248 372 260C356 254 342 256 332 264C300 252 252 236 210 230Z" fill="#effbff" opacity=".7"/>' +
      '<path d="M234 448C222 474 216 520 220 640L196 640C192 530 200 476 214 444Z" fill="#c8f0ff"/>' +
      '<path d="M200 468L230 472M198 494L226 496M197 520L224 520M197 546L223 546M197 572L223 572M198 598L224 598" stroke="#0b3d91" stroke-width="2.4" stroke-linecap="round"/>' +
      '</g>' +
      '<path d="' + SKIN + '" fill="none" stroke="#07020f" stroke-width="' + ink + '" stroke-linejoin="round"/>';
    // fangs over the gum lines
    s += '<path d="' + fangs([376, 294, 300, 304, 238, 336], [[0.05, 46, 13], [0.16, 22, 8], [0.26, 32, 10], [0.37, 20, 8], [0.47, 27, 9], [0.58, 18, 7], [0.68, 23, 8], [0.78, 15, 6], [0.87, 12, 6]], [-0.18, 1]) +
      fangs([238, 336, 296, 362, 352, 398], [[0.14, 10, 6], [0.26, 14, 7], [0.38, 19, 8], [0.5, 15, 7], [0.62, 23, 9], [0.73, 17, 8], [0.84, 27, 10], [0.95, 40, 12]], [0.28, -1]) +
      '" fill="' + url('tooth') + '" stroke="#07020f" stroke-width="2" stroke-linejoin="round"/>';
    // ear fin
    s += '<path d="M170 270C150 246 118 226 76 216C96 240 106 264 108 296C126 294 152 286 170 270Z" fill="' + url('fin') + '" stroke="#07020f" stroke-width="' + (ink - 1) + '" stroke-linejoin="round"/>' +
      '<path d="M162 272L92 224M156 279L100 254M150 285L108 282" stroke="#07020f" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M150 252C130 238 110 228 90 222" fill="none" stroke="#9be9ff" stroke-width="2" stroke-linecap="round" opacity=".8"/>';
    // brow ridge with its curl, eye
    s += '<g filter="' + url('ge') + '"><ellipse cx="244" cy="259" rx="34" ry="14" fill="#ff8a00" opacity=".8"/></g>' +
      '<path d="M214 262C228 248 256 246 276 256C260 271 232 275 214 262Z" fill="' + url('eye') + '" stroke="#07020f" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<ellipse cx="248" cy="259" rx="3.4" ry="10" fill="#07020f"/><circle cx="256" cy="254" r="2.2" fill="#fff"/>' +
      '<path d="M298 250C276 228 232 220 202 228C176 234 166 258 182 270C194 278 212 266 202 252C224 242 262 240 298 254Z" fill="#1e88e5" stroke="#07020f" stroke-width="' + (ink - 1) + '" stroke-linejoin="round"/>' +
      '<path d="M206 234C232 228 262 232 286 244" fill="none" stroke="#b3ecff" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="' + curl(190, 256, 13, -1.2, 1.1, -1) + '" fill="none" stroke="#07020f" stroke-width="2.6" stroke-linecap="round"/>';
    // ink details: snout ridges, nostril, wrinkles, jaw line, cloud curls on cheek and jaw hinge
    s += '<g fill="none" stroke="#07020f" stroke-linecap="round" stroke-width="3">' +
      '<path d="M318 250C322 258 324 266 322 276M302 244C307 252 308 262 305 272M286 262C292 268 296 276 296 286"/>' +
      '<path d="M338 430C300 420 250 398 214 364M236 336C226 330 220 322 222 310M214 266L196 270M216 272L202 284"/>' +
      '<path d="' + curl(190, 312, 22, -2.2, 1.2, 1) + curl(222, 372, 15, -0.5, 1.1, -1) + (lite ? '' : curl(160, 404, 14, -2, 1.1, 1)) + '" stroke-width="3.2"/>' +
      '</g>' +
      '<path d="M348 262C350 252 364 252 368 262C364 268 354 268 348 262Z" fill="#07020f"/>';
    // the long whisker looping down from the snout
    var whisk = taper([372, 276, 420, 268, 454, 318, 444, 380, 432, 440, 366, 482, 304, 474, 244, 466, 222, 424, 252, 398], 14, 2, 0.8);
    s += '<path d="' + whisk + '" fill="#07020f" stroke="#7c3aed" stroke-width="1.6" stroke-linejoin="round"/>' +
      (lite ? '' : '<path d="M366 412C392 430 400 460 384 486C372 504 352 508 338 500" fill="none" stroke="#07020f" stroke-width="5" stroke-linecap="round"/>');
    s += '</g></g>';
    // front clouds over the neck's foot
    s += '<g clip-path="' + url('bc') + '">' + cloud([[150, 600, 50], [70, 560, 44], [240, 612, 44], [20, 500, 40]], url('cl1'), '#e9d5ff', ink) + '</g>';
    return s;
  }

  function lettering(i) {
    var T = ' font-family="\'Kaido Dirt\', Impact, \'Arial Black\', sans-serif" font-weight="400" text-anchor="middle" lengthAdjust="spacingAndGlyphs" stroke-linejoin="round" paint-order="stroke"';
    function word(x, y, size, len, txt, fill, sw) {
      return '<text x="' + x + '" y="' + (y + 6) + '" font-size="' + size + '" textLength="' + len + '"' + T + ' fill="#000" stroke="#000" stroke-width="' + sw + '" transform="translate(4 0)">' + txt + '</text>' +
        '<text x="' + x + '" y="' + y + '" font-size="' + size + '" textLength="' + len + '"' + T + ' fill="none" stroke="#9333ea" stroke-opacity=".45" stroke-width="' + (sw + 7) + '">' + txt + '</text>' +
        '<text x="' + x + '" y="' + y + '" font-size="' + size + '" textLength="' + len + '"' + T + ' fill="' + fill + '" stroke="#07020f" stroke-width="' + sw + '">' + txt + '</text>';
    }
    return '<defs><linearGradient id="bt' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d4ff"/><stop offset=".28" stop-color="#c77dff"/><stop offset=".55" stop-color="#b14cff"/><stop offset="1" stop-color="#7b1fe8"/></linearGradient>' +
      '<linearGradient id="wt' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#dcd0f0"/></linearGradient></defs>' +
      '<g transform="rotate(-8 320 160)">' +
      word(338, 100, 54, 236, 'ROAD TO', 'url(#wt' + i + ')', 11) +
      word(320, 214, 128, 540, 'BRISTOL', 'url(#bt' + i + ')', 14) +
      '</g><g transform="rotate(-6 320 560)">' +
      word(322, 592, 112, 590, 'KAIDONETA', 'url(#wt' + i + ')', 14) +
      '</g>';
  }

  A.badge = function (opts) {
    opts = opts || {};
    var i = 'kb' + (++n);
    return '<svg xmlns="http://www.w3.org/2000/svg" class="badge ' + (opts.cls || '') + '" viewBox="0 0 640 640" role="img" aria-label="Road to Bristol · Kaidoneta">' +
      art(i, { lite: !!opts.lite }) + (opts.text === false ? '' : lettering(i)) + '</svg>';
  };
  A.badgeMark = function (cls) { return A.badge({ text: false, cls: cls }); };
  // The phone app icon: the emblem without lettering on a night-purple tile; scale < 1 keeps it in the maskable zone.
  A.icon = function (rounded, scale) {
    var i = 'ki' + (++n), k = 0.9 * (scale || 0.92);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
      '<defs><radialGradient id="tb' + i + '" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2a0d52"/><stop offset="1" stop-color="#0a0316"/></radialGradient>' +
      '<clipPath id="tc' + i + '"><rect width="512" height="512" ' + (rounded ? 'rx="112"' : '') + '/></clipPath></defs>' +
      '<rect width="512" height="512" ' + (rounded ? 'rx="112"' : '') + ' fill="url(#tb' + i + ')"/>' +
      '<g clip-path="url(#tc' + i + ')"><g transform="translate(256 256) scale(' + f(k * 100) / 100 + ') translate(-320 -320)">' + art(i, { lite: true }) + '</g></g>' +
      '</svg>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
