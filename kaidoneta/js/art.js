/* Kaidoneta art: every picture is drawn here in SVG (original drawings, no official artwork), so it is sharp on
 * every phone and works offline. Kaido with his horns, mane and club; his dragon form, which slithers; the Clifton
 * Suspension Bridge at night with Balloon Fiesta balloons; the crew's crest; lightning.
 */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var A = (K.art = {});
  var uid = 0;
  function u() { return 'k' + (++uid); }
  function f(n) { return Math.round(n * 10) / 10; }
  function seeded(seed) { var s = seed % 2147483647 || 7; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  /* ---------- lightning ---------- */
  // A jagged bolt from (x1,y1) to (x2,y2), with an optional fork.
  A.boltPath = function (x1, y1, x2, y2, seed, jag) {
    var r = seeded(seed || 3), n = 7, d = 'M' + f(x1) + ',' + f(y1);
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), nx = -dy / len, ny = dx / len;
    jag = jag || len * 0.09;
    for (var i = 1; i < n; i++) {
      var t = i / n, off = (r() - 0.5) * 2 * jag;
      d += ' L' + f(x1 + dx * t + nx * off) + ',' + f(y1 + dy * t + ny * off);
    }
    return d + ' L' + f(x2) + ',' + f(y2);
  };
  A.bolt = function (cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 4 13.2h6.3L8.7 22.5 19.5 9.6h-6.6z" fill="currentColor"/></svg>';
  };

  /* ---------- Kaido ---------- */
  // Kaido's kanabo: an eight-sided iron club. Seen from the side it shows three faces (the middle one lit), iron
  // bands, rows of studs, spikes along its edges, and a cord-wrapped grip ending in a ring.
  function clubPath(ax, ay, bx, by, wHandle, wHead) {
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    var H0 = 0.3, H1 = 0.335;
    function W(s) { return s < H0 ? wHandle : s < H1 ? wHandle * 1.5 : wHead * (0.78 + 0.22 * (s - H1) / (1 - H1)); }
    function pt(s, k) { var w = W(s); return [ax + dx * s + nx * w * k, ay + dy * s + ny * w * k]; }
    function strip(s0, s1, k0, k1) {
      var L = [], R = [];
      for (var j = 0; j <= 10; j++) {
        var s = s0 + (s1 - s0) * j / 10, p = pt(s, k0), q = pt(s, k1);
        L.push(f(p[0]) + ',' + f(p[1])); R.unshift(f(q[0]) + ',' + f(q[1]));
      }
      return 'M' + L.join(' L') + ' L' + R.join(' L') + 'Z';
    }
    var studs = [], spikes = [], wrap = [], shine = [], spine = [];
    for (var r = 0, s = 0.38; s < 0.93; s += 0.047, r++) {
      (r % 2 ? [-0.62, 0, 0.62] : [-0.32, 0.32]).forEach(function (k) {
        var p = pt(s, k);
        studs.push('<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + f(2.4 + W(s) * 0.07) + '"/>');
        shine.push('<circle cx="' + f(p[0] - 0.8) + '" cy="' + f(p[1] - 0.8) + '" r=".9"/>');
      });
      [1, -1].forEach(function (side) {
        var b0 = pt(s - 0.016, side), b1 = pt(s + 0.016, side), tip = pt(s, side * 1.5);
        spikes.push('M' + f(b0[0]) + ',' + f(b0[1]) + ' L' + f(tip[0]) + ',' + f(tip[1]) + ' L' + f(b1[0]) + ',' + f(b1[1]) + 'Z');
      });
    }
    for (var g = 0.03; g < H0 - 0.02; g += 0.028) {
      var w0 = pt(g, -1), w1 = pt(g + 0.022, 1);
      wrap.push('M' + f(w0[0]) + ',' + f(w0[1]) + ' L' + f(w1[0]) + ',' + f(w1[1]));
    }
    for (var i = 0; i <= 24; i++) { var sp = i / 24, c = pt(sp, 0); spine.push([c[0], c[1], W(sp)]); }
    var tip = pt(1, 0);
    return {
      glow: strip(0, 1, -1.4, 1.4),
      handle: strip(0, H0, -1, 1), wrap: wrap.join(' '),
      band: strip(H0, H1, -1, 1), band2: strip(0.9, 0.925, -1.06, 1.06), cap: strip(0.975, 1, -0.9, 0.9),
      left: strip(H1, 0.975, -1, -0.36), mid: strip(H1, 0.975, -0.36, 0.36), right: strip(H1, 0.975, 0.36, 1),
      studs: studs.join(''), shine: shine.join(''), spikes: spikes.join(' '),
      pommel: [f(ax - ux * 5), f(ay - uy * 5)], tip: tip, spine: spine, n: [nx, ny], u: [ux, uy],
    };
  }
  // Electric arcs that crackle along the club (Thunder Bagua).
  function clubArcs(club, seed) {
    var r = seeded(seed), out = [];
    for (var k = 0; k < 4; k++) {
      var a = club.spine[10 + Math.floor(r() * 6)], b = club.spine[16 + Math.floor(r() * 9)];
      var side = r() > 0.5 ? 1 : -1, off = 14 + r() * 16;
      out.push(A.boltPath(a[0] + club.n[0] * a[2] * side, a[1] + club.n[1] * a[2] * side, b[0] + club.n[0] * (b[2] + off) * side, b[1] + club.n[1] * (b[2] + off) * side, seed * 7 + k, 7));
    }
    return out;
  }

  // Kaido's sacred rope belt: a thick twisted straw rope round his waist, tied in a big knot with heavy ends.
  function shimenawa(i) {
    var strands = '';
    for (var x = 114; x <= 290; x += 12) {
      var k = (x - 200) / 80, y = 341 + 11 * (1 - k * k) + 1;
      strands += '<ellipse cx="' + x + '" cy="' + f(y) + '" rx="7.5" ry="17" transform="rotate(38 ' + x + ' ' + f(y) + ')"/>';
    }
    var ends = ['M168 364C170 392 180 420 196 452', 'M184 366C194 390 210 412 230 438'];
    var endBase = ends.map(function (d) { return '<path d="' + d + '" stroke="#7a5a2e" stroke-width="17"/>'; }).join('');
    var endTwist = ends.map(function (d) { return '<path d="' + d + '" stroke="url(#ro' + i + ')" stroke-width="13" stroke-dasharray="7 4"/>'; }).join('');
    var fray = '<g stroke="#e9d3a2" stroke-width="2" stroke-linecap="round"><path d="M190 450l2 14M195 452l5 13M200 450l8 11M186 448l-2 13"/><path d="M224 436l6 12M229 434l9 9M233 430l11 6M220 438l1 13"/></g>';
    return {
      band: '<defs><clipPath id="rc' + i + '"><path d="M118 326Q200 348 282 326L282 358Q200 380 118 358Z"/></clipPath>' +
          '<linearGradient id="ro' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbefd2"/><stop offset=".55" stop-color="#e2c48c"/><stop offset="1" stop-color="#a47e45"/></linearGradient></defs>' +
        '<path d="M118 326Q200 348 282 326L282 358Q200 380 118 358Z" fill="#8a6a3a"/>' +
        '<g clip-path="url(#rc' + i + ')" fill="url(#ro' + i + ')" stroke="#6b4f26" stroke-width="1.4">' + strands + '</g>' +
        '<path d="M118 326Q200 348 282 326M118 358Q200 380 282 358" stroke="#4a3418" stroke-width="2" fill="none"/>',
      knot: '<g class="k-rope" fill="none" stroke-linecap="round">' + endBase + endTwist + '</g>' + fray +
        '<path d="M150 346C150 330 170 326 180 336C190 326 212 330 210 348C210 366 190 372 180 362C170 372 150 364 150 346Z" fill="url(#ro' + i + ')" stroke="#6b4f26" stroke-width="2"/>' +
        '<path d="M158 340C166 346 172 352 176 360M200 338C194 346 188 352 184 360M180 336V362" stroke="#8a6a3a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="180" cy="349" rx="10" ry="12" fill="#e2c48c" stroke="#6b4f26" stroke-width="2"/>',
    };
  }

  // Kaido, King of the Beasts: silhouetted against a purple moon, his dragon form coiling behind him, mane and coat
  // in the wind, club on his shoulder crackling with lightning. opts: bolts (sky lightning), dragon, cls.
  A.kaido = function (opts) {
    opts = opts || {};
    var i = u(), club = clubPath(268, 306, 394, 22, 8, 27);
    var mirror = 'transform="translate(400 0) scale(-1 1)"';
    var horn = '<path d="M174 102C150 82 134 46 146 2C152 28 166 54 198 86Z" fill="url(#hn' + i + ')" stroke="#2e1065" stroke-width="1.5"/>' +
      '<path d="M160 80q8-6 16 1M153 64q7-6 15 0M149 47q6-5 13 0M147 31q5-4 10 0M146 16q4-3 7 0" stroke="#2e1065" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 10C150 34 160 58 182 82" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>';
    var stache = '<path d="M198 148C184 148 173 158 168 178C164 194 164 212 172 228C174 208 178 190 186 175C190 164 195 156 201 152Z" fill="#0a0514" stroke="#a78bfa" stroke-opacity=".35" stroke-width="1"/>';
    var lapel = '<path d="M98 206C122 196 148 190 170 186C158 232 150 292 154 342C150 420 146 500 140 560L46 560C54 330 72 230 98 206Z" fill="url(#co' + i + ')" stroke="#c084fc" stroke-opacity=".7" stroke-width="2"/>';
    var rig = opts.dragon === false ? '' : (function () {
      var pts = [[430, 500], [372, 420], [384, 330], [340, 236], [276, 150], [190, 78], [104, 60], [52, 104]];
      var s = A.dragonShape(0.2, pts, 13);
      return '<g class="dragon-rig k-dragon" data-pts="' + JSON.stringify(pts) + '" data-w="13" data-scale=".72">' +
        '<path class="d-glow" d="' + s.body + '" fill="#c084fc" opacity=".35" filter="url(#bl' + i + ')"/>' +
        '<path class="d-spikes" d="' + s.spikes + '" fill="#1c0b38" stroke="#a78bfa" stroke-width=".8"/>' +
        '<path class="d-body" d="' + s.body + '" fill="url(#dk' + i + ')" stroke="#c4b5fd" stroke-width="1.2"/>' +
        '<path class="d-belly" d="' + s.belly + '" fill="#d8c7fb" opacity=".55"/>' +
        '<path class="d-rings" d="' + s.rings + '" stroke="#4c1d95" stroke-width="1.2" opacity=".7"/>' +
        '<g class="d-head" transform="translate(' + f(s.head.x) + ' ' + f(s.head.y) + ') rotate(' + f(s.head.angle) + ') scale(.72)">' + dragonHead(i, 'dk') + '</g>' +
      '</g>';
    })();
    var sky = opts.bolts === false ? '' :
      '<g class="k-sky" filter="url(#gl' + i + ')" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
        '<path class="k-flash1" d="' + A.boltPath(6, 176, 70, 320, 11, 14) + '" stroke="#fde68a" stroke-width="3"/>' +
        '<path class="k-flash2" d="' + A.boltPath(396, 170, 340, 300, 5, 12) + '" stroke="#f5f3ff" stroke-width="2.4"/>' +
      '</g>';
    var arcs = clubArcs(club, 4).map(function (d, k) { return '<path class="k-arc k-arc' + (k % 3) + '" d="' + d + '"/>'; }).join('');
    var rope = shimenawa(i);
    var embers = '';
    var er = seeded(77);
    for (var e = 0; e < 16; e++) {
      embers += '<circle class="k-ember" style="animation-delay:-' + f(er() * 6) + 's;animation-duration:' + f(4 + er() * 4) + 's" cx="' + f(20 + er() * 360) + '" cy="' + f(380 + er() * 160) + '" r="' + f(1 + er() * 2.4) + '"/>';
    }
    return '<svg class="kaido ' + (opts.cls || '') + '" viewBox="0 0 400 560" role="img" aria-label="Kaido, King of the Beasts">' +
      '<defs>' +
        '<radialGradient id="mn' + i + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fbf7ff"/><stop offset=".55" stop-color="#ddd0fb"/><stop offset=".85" stop-color="#a98af0"/><stop offset="1" stop-color="#7c3aed"/></radialGradient>' +
        '<radialGradient id="au' + i + '" cx="50%" cy="50%" r="50%"><stop offset=".45" stop-color="#a855f7" stop-opacity=".7"/><stop offset="1" stop-color="#6d28d9" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="sk' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2d78"/><stop offset=".5" stop-color="#2a1748"/><stop offset="1" stop-color="#160b28"/></linearGradient>' +
        '<linearGradient id="co' + i + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1676"/><stop offset=".45" stop-color="#1f0d3d"/><stop offset="1" stop-color="#0c0618"/></linearGradient>' +
        '<linearGradient id="hn' + i + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5d4a7c"/><stop offset=".5" stop-color="#d9cfe9"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>' +
        '<linearGradient id="cl' + i + '" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3d3650"/><stop offset=".5" stop-color="#6a6184"/><stop offset="1" stop-color="#3d3650"/></linearGradient>' +
        '<linearGradient id="rp' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe3ff"/><stop offset="1" stop-color="#9a7cc4"/></linearGradient>' +
        '<linearGradient id="dk' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#2e1065"/></linearGradient>' +
        '<linearGradient id="fd' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".74" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<mask id="mk' + i + '"><rect width="400" height="560" fill="url(#fd' + i + ')"/></mask>' +
        '<filter id="gl' + i + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<filter id="bl' + i + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '</defs>' +
      '<g mask="url(#mk' + i + ')">' +
        // the moon and its halo
        '<circle cx="206" cy="158" r="190" fill="url(#au' + i + ')"/>' +
        '<circle class="k-moon" cx="206" cy="158" r="122" fill="url(#mn' + i + ')"/>' +
        '<g fill="#a98af0" opacity=".28"><circle cx="160" cy="108" r="16"/><circle cx="262" cy="200" r="22"/><circle cx="252" cy="96" r="9"/><circle cx="150" cy="222" r="11"/></g>' +
        sky + rig +
        // the mane, streaming in the wind
        '<g class="k-hair">' +
          '<path d="M196 70L214 62L236 46L232 72L270 56L262 84L308 74L292 100L346 102L316 124L372 136L328 150L378 178L328 182L362 216L314 208L332 250L292 234L298 274L268 256L262 292L150 292L144 264L120 274L128 242L100 248L118 214L88 212L116 186L90 170L124 158L104 130L138 128L126 98L160 104L160 76L180 88Z" fill="#100720" stroke="#c4b5fd" stroke-opacity=".75" stroke-width="2" stroke-linejoin="round"/>' +
          '<path d="M300 112C330 108 356 116 392 104M318 160C346 160 368 172 396 166M304 196C330 204 350 220 372 214" stroke="#100720" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M300 112C330 108 356 116 392 104M318 160C346 160 368 172 396 166M304 196C330 204 350 220 372 214" stroke="#c4b5fd" stroke-opacity=".5" stroke-width="1" fill="none" stroke-linecap="round"/>' +
        '</g>' +
        // the coat, billowing to the right
        '<path class="k-coat" d="M100 204C70 236 58 330 48 560L400 560L400 452L382 440L400 416L370 404L392 376L356 364L378 336L344 326L356 300C336 256 322 224 300 204C280 192 252 186 228 184L172 184C148 186 120 192 100 204Z" fill="url(#co' + i + ')" stroke="#c084fc" stroke-opacity=".6" stroke-width="2" stroke-linejoin="round"/>' +
        // the club and its lightning
        '<path d="' + club.glow + '" fill="#a855f7" opacity=".6" filter="url(#bl' + i + ')"/>' +
        '<path d="' + club.spikes + '" fill="#cfc6e0" stroke="#4b4560" stroke-width=".8"/>' +
        '<path d="' + club.handle + '" fill="#3a2a24" stroke="#0c0618" stroke-width="1.5"/>' +
        '<path d="' + club.wrap + '" stroke="#c9a978" stroke-width="2.6" stroke-linecap="round"/>' +
        '<g stroke="#0c0618" stroke-width="1.2"><path d="' + club.left + '" fill="#1b1726"/><path d="' + club.right + '" fill="#272235"/><path d="' + club.mid + '" fill="url(#cl' + i + ')"/></g>' +
        '<path d="' + club.mid + '" fill="none" stroke="#e9d5ff" stroke-opacity=".35" stroke-width="1"/>' +
        '<g fill="#9d93b3" stroke="#0c0618" stroke-width=".8">' + club.studs + '</g><g fill="#fff" opacity=".8">' + club.shine + '</g>' +
        '<g fill="#bfb5d3" stroke="#0c0618" stroke-width="1.2"><path d="' + club.band + '"/><path d="' + club.band2 + '"/><path d="' + club.cap + '"/></g>' +
        '<circle cx="' + club.pommel[0] + '" cy="' + club.pommel[1] + '" r="9" fill="none" stroke="#bfb5d3" stroke-width="4"/>' +
        '<g class="k-arcs" filter="url(#gl' + i + ')" fill="none" stroke="#fef9c3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + arcs + '</g>' +
        // bare chest, with Oden's scar
        '<path d="M170 172L230 172C260 184 288 198 302 216C300 254 282 300 262 342L138 342C118 300 100 254 98 216C112 198 140 184 170 172Z" fill="url(#sk' + i + ')"/>' +
        '<g stroke="#b794f4" stroke-opacity=".5" stroke-width="2.2" fill="none" stroke-linecap="round">' +
          '<path d="M160 222C176 248 194 248 200 236M240 222C224 248 206 248 200 236M200 196V334M182 266Q191 272 200 266Q209 272 218 266M183 290Q191 296 200 290Q209 296 217 290M186 314Q193 319 200 314Q207 319 214 314"/>' +
        '</g>' +
        '<path d="M232 206C246 214 256 226 262 240" stroke="#e9d5ff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M166 200L236 284" stroke="#f0abfc" stroke-opacity=".75" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M178 206l-6 8M190 220l-6 8M202 234l-6 8M214 248l-6 8M226 262l-6 8" stroke="#f0abfc" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>' +
        // trousers, and the shimenawa rope around his waist (under the coat)
        '<path d="M138 352L262 352C268 420 274 500 280 560L120 560C126 500 132 420 138 352Z" fill="#0c0618"/>' +
        '<path d="M200 372V560" stroke="#2e1a4f" stroke-width="3"/>' +
        rope.band +
        // the open coat, both sides
        lapel + '<g ' + mirror + '>' + lapel + '</g>' +
        '<g fill="none" stroke="#c084fc" stroke-opacity=".3" stroke-width="3" stroke-linecap="round">' +
          '<path d="M70 420c8-14 26-14 30 0c6-10 22-8 22 4M88 480c8-12 24-12 28 0M290 430c8-14 26-14 30 0c6-10 22-8 22 4M272 494c8-12 24-12 28 0M80 300c6-10 18-10 22 0M298 300c6-10 18-10 22 0"/>' +
        '</g>' +
        // the rope's big knot and its heavy ends, in front of the coat
        rope.knot +
        // left arm, fist clenched, spiked bracelet
        '<path d="M104 204C70 220 56 276 62 318C66 350 72 380 78 404L126 402C122 372 121 342 124 316C129 282 136 246 132 216Z" fill="url(#sk' + i + ')" stroke="#c4b5fd" stroke-opacity=".6" stroke-width="1.5"/>' +
        '<path d="M74 262C86 250 100 252 110 262M70 300C82 292 96 294 104 304M98 320C96 340 100 356 104 366" stroke="#b794f4" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<rect x="72" y="368" width="56" height="16" rx="4" fill="#2b2638" stroke="#e4dcf2" stroke-width="2"/>' +
        '<path d="M76 368l5-10 5 10M90 368l5-10 5 10M104 368l5-10 5 10M118 368l4-10 4 10" fill="#e4dcf2"/>' +
        '<rect x="74" y="398" width="54" height="42" rx="16" fill="#3a2163" stroke="#c4b5fd" stroke-opacity=".6" stroke-width="1.5"/>' +
        '<path d="M80 412h42M80 424h42" stroke="#160b28" stroke-width="2" stroke-linecap="round"/>' +
        // right arm, gripping the club
        '<path d="M282 202C326 210 356 256 364 300C368 322 344 334 326 320C316 290 300 262 276 240Z" fill="url(#sk' + i + ')" stroke="#c4b5fd" stroke-opacity=".6" stroke-width="1.5"/>' +
        '<path d="M364 296C360 326 330 334 318 316C308 300 300 288 288 278L300 246C322 258 350 274 364 296Z" fill="#3a2163" stroke="#c4b5fd" stroke-opacity=".6" stroke-width="1.5"/>' +
        '<path d="M330 250C342 262 350 276 354 290" stroke="#e9d5ff" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<rect x="270" y="238" width="46" height="42" rx="16" fill="#3a2163" stroke="#c4b5fd" stroke-opacity=".6" stroke-width="1.5" transform="rotate(-24 293 259)"/>' +
        '<path d="M278 248l28-8M280 260l28-8M283 272l24-7" stroke="#160b28" stroke-width="2" stroke-linecap="round"/>' +
        // the spiked fur mantle over his shoulders
        '<path d="M60 238L78 212L66 196L96 198L92 176L118 190L124 166L146 184L158 164L174 184L226 184L242 164L254 184L276 166L282 190L308 176L304 198L334 196L322 212L340 238C312 222 282 212 252 208L148 208C118 212 88 222 60 238Z" fill="#140a26" stroke="#c4b5fd" stroke-opacity=".8" stroke-width="2" stroke-linejoin="round"/>' +
        // neck and head
        '<path d="M182 150L218 150L222 184L178 184Z" fill="#2a1748"/>' +
        '<path d="M176 98C171 118 171 140 179 156C187 170 213 170 221 156C229 140 229 118 224 98C214 89 186 89 176 98Z" fill="url(#sk' + i + ')" stroke="#c4b5fd" stroke-opacity=".5" stroke-width="1.2"/>' +
        horn + '<g ' + mirror + '>' + horn + '</g>' +
        '<path d="M170 106C178 84 222 84 230 106C214 94 186 94 170 106Z" fill="#100720"/>' +
        '<path d="M174 112L198 121L196 128L174 119Z" fill="#05020b"/><path d="M226 112L202 121L204 128L226 119Z" fill="#05020b"/>' +
        '<g class="k-eyes" filter="url(#gl' + i + ')">' +
          '<path d="M180 128L198 131L184 135Z" fill="#fde047"/><path d="M220 128L202 131L216 135Z" fill="#fde047"/>' +
          '<path d="M181 129L162 119M219 129L238 119" stroke="#fde047" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>' +
        '</g>' +
        '<path d="M200 130L197 145L203 145" stroke="#100720" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        // the grin
        '<path d="M184 151Q200 164 216 151Q212 160 200 162Q188 160 184 151Z" fill="#05020b"/>' +
        '<path d="M187 153L190 158L193 155L196 159L199 155L202 159L205 155L208 158L211 154L213 152Q200 158 187 153Z" fill="#fffaf0"/>' +
        '<path d="M188 153L190 160L192 154M212 153L210 160L208 154" fill="#fffaf0"/>' +
        stache + '<g ' + mirror + '>' + stache + '</g>' +
        '<path d="M192 163L208 163L205 182L200 194L195 182Z" fill="#0a0514"/>' +
        // rocks lifting off the ground, embers rising
        '<g fill="#1a0f30" stroke="#a78bfa" stroke-opacity=".5" stroke-width="1"><path class="k-rock" d="M24 470l14-6 8 10-6 12-14-2z"/><path class="k-rock k-rock2" d="M352 486l12-4 6 9-8 8-10-3z"/><path class="k-rock" d="M300 520l8-3 5 6-5 6-7-2z"/></g>' +
        '<g class="k-embers" fill="#e9d5ff">' + embers + '</g>' +
      '</g>' +
    '</svg>';
  };

  /* ---------- the dragon ---------- */
  function catmull(pts, n) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (var j = 0; j < n; j++) {
        var t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  A.DRAGON_PATH = [[-30, 196], [30, 150], [96, 186], [160, 128], [222, 172], [282, 104], [330, 128], [366, 84]];
  // The body, belly, spikes and the head's position for one moment of the slither (phase in turns).
  A.dragonShape = function (phase, pts, maxW) {
    pts = pts || A.DRAGON_PATH; maxW = maxW || 15;
    var c = catmull(pts, 18), n = c.length, P = [];
    for (var i = 0; i < n; i++) {
      var a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
      var t = i / (n - 1), nx = -dy / l, ny = dx / l;
      var wave = Math.sin((t * 3.2 - phase) * Math.PI * 2) * 6 * (1 - smooth(0.8, 1, t)) * (0.3 + t);
      P.push({ x: c[i][0] + nx * wave, y: c[i][1] + ny * wave, nx: nx, ny: ny, t: t, w: maxW * (0.1 + 0.9 * smooth(0, 0.55, t)) * (1 - 0.22 * smooth(0.86, 1, t)) });
    }
    var L = [], R = [], belly = [], bellyR = [], spikes = [], rings = [];
    P.forEach(function (p, k) {
      L.push(f(p.x + p.nx * p.w) + ',' + f(p.y + p.ny * p.w));
      R.unshift(f(p.x - p.nx * p.w) + ',' + f(p.y - p.ny * p.w));
      belly.push(f(p.x + p.nx * p.w * 0.95) + ',' + f(p.y + p.ny * p.w * 0.95));
      bellyR.unshift(f(p.x + p.nx * p.w * 0.25) + ',' + f(p.y + p.ny * p.w * 0.25));
      if (k % 4 === 2 && p.t > 0.08 && p.t < 0.97) {
        var q = P[Math.min(n - 1, k + 2)], s = p.w * (0.8 + 0.4 * p.t);
        spikes.push('M' + f(p.x - p.nx * p.w) + ',' + f(p.y - p.ny * p.w) + ' L' + f(p.x - p.nx * (p.w + s) + (q.x - p.x) * 0.8) + ',' + f(p.y - p.ny * (p.w + s) + (q.y - p.y) * 0.8) + ' L' + f(q.x - q.nx * q.w) + ',' + f(q.y - q.ny * q.w) + 'Z');
      }
      if (k % 3 === 0 && p.t > 0.05) rings.push('M' + f(p.x + p.nx * p.w * 0.95) + ',' + f(p.y + p.ny * p.w * 0.95) + ' L' + f(p.x + p.nx * p.w * 0.3) + ',' + f(p.y + p.ny * p.w * 0.3));
    });
    var end = P[n - 1], prev = P[n - 4];
    return {
      body: 'M' + L.join(' L') + ' L' + R.join(' L') + 'Z',
      belly: 'M' + belly.join(' L') + ' L' + bellyR.join(' L') + 'Z',
      spikes: spikes.join(' '), rings: rings.join(' '),
      head: { x: end.x, y: end.y, angle: Math.atan2(end.y - prev.y, end.x - prev.x) * 180 / Math.PI, w: end.w },
    };
  };
  function dragonHead(i, grad) {
    // drawn pointing right, neck at (0,0)
    return '<g class="dragon-head">' +
      '<path d="M-6 -12C-20 -30 -34 -40 -52 -44C-38 -34 -30 -24 -24 -14Z" fill="#e9d5ff"/>' +
      '<path d="M-2 -14C-10 -36 -18 -50 -34 -60C-24 -46 -18 -32 -16 -16Z" fill="#fffaf0"/>' +
      '<path d="M-14 -10L-30 -22L-24 -6L-40 -10L-26 4L-38 8L-18 12Z" fill="#2e1065"/>' +
      '<path d="M-10 -14C6 -20 24 -18 36 -12L56 -8C62 -6 62 0 56 2L38 4C30 6 20 6 12 6L-10 12Z" fill="url(#' + (grad || 'db') + i + ')" stroke="#c4b5fd" stroke-width="1.2"/>' +
      '<path d="M6 8C20 8 34 10 48 16C40 22 24 24 10 20L-8 16Z" fill="#5b21b6" stroke="#c4b5fd" stroke-width="1"/>' +
      '<path d="M18 6l3 5 3-5M28 6l3 5 3-5M38 5l3 5 3-5M22 12l2-4 2 4M32 13l2-4 2 4" fill="#fffaf0"/>' +
      '<path d="M8 -15C14 -19 22 -18 28 -14" stroke="#2e1065" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="20" cy="-9" rx="5" ry="3.2" fill="#fde047"/><ellipse cx="21" cy="-9" rx="1.2" ry="2.6" fill="#1a0b2e"/>' +
      '<circle cx="54" cy="-4" r="1.6" fill="#1a0b2e"/>' +
      '<g class="whiskers" fill="none" stroke="#e9d5ff" stroke-width="1.8" stroke-linecap="round" opacity=".9">' +
        '<path d="M50 -4C40 -30 10 -38 -24 -30C-46 -24 -60 -30 -70 -40"/>' +
        '<path d="M48 4C40 30 12 40 -20 34C-42 30 -58 36 -66 46"/>' +
      '</g>' +
    '</g>';
  }
  // A dragon in an SVG of its own. mountDragon() makes it slither.
  A.dragon = function (cls) {
    var i = u(), s = A.dragonShape(0);
    return '<svg class="dragon ' + (cls || '') + '" viewBox="0 0 400 240" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="db' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>' +
        '<filter id="ds' + i + '" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>' +
      '</defs>' +
      '<g class="dragon-rig" data-scale=".8">' +
        '<path class="d-glow" d="' + s.body + '" fill="#a855f7" opacity=".35" filter="url(#ds' + i + ')"/>' +
        '<path class="d-spikes" d="' + s.spikes + '" fill="#2e1065" stroke="#a78bfa" stroke-width=".8"/>' +
        '<path class="d-body" d="' + s.body + '" fill="url(#db' + i + ')" stroke="#c4b5fd" stroke-width="1.2"/>' +
        '<path class="d-belly" d="' + s.belly + '" fill="#e9d5ff" opacity=".85"/>' +
        '<path class="d-rings" d="' + s.rings + '" stroke="#7c3aed" stroke-width="1.2" opacity=".7"/>' +
        '<g class="d-head" transform="translate(' + f(s.head.x) + ' ' + f(s.head.y) + ') rotate(' + f(s.head.angle) + ') scale(.8)">' + dragonHead(i, 'db') + '</g>' +
      '</g>' +
    '</svg>';
  };
  // Makes every dragon inside `el` slither (not with "reduce motion"). Stops by itself when it leaves the page.
  A.mountDragon = function (el) {
    if (!el) return;
    var still = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) return;
    Array.prototype.forEach.call(el.querySelectorAll('.dragon-rig'), function (g) {
      if (g._mounted) return;
      g._mounted = true;
      var pts = g.getAttribute('data-pts') ? JSON.parse(g.getAttribute('data-pts')) : null;
      var w = Number(g.getAttribute('data-w')) || 15, sc = g.getAttribute('data-scale') || '.8';
      var body = g.querySelector('.d-body'), glow = g.querySelector('.d-glow'), belly = g.querySelector('.d-belly');
      var spikes = g.querySelector('.d-spikes'), rings = g.querySelector('.d-rings'), head = g.querySelector('.d-head');
      var t0 = 0, off = pts ? 0.2 : 0;
      (function frame(ts) {
        if (!g.isConnected) return;
        if (!root.document.hidden && ts - t0 > 40) {
          t0 = ts;
          var s = A.dragonShape(ts / 2600 + off, pts, w);
          body.setAttribute('d', s.body); glow.setAttribute('d', s.body); belly.setAttribute('d', s.belly);
          spikes.setAttribute('d', s.spikes); rings.setAttribute('d', s.rings);
          head.setAttribute('transform', 'translate(' + f(s.head.x) + ' ' + f(s.head.y) + ') rotate(' + f(s.head.angle + Math.sin(ts / 700) * 4) + ') scale(' + sc + ')');
        }
        root.requestAnimationFrame(frame);
      })(0);
    });
  };

  /* ---------- Bristol ---------- */
  // The Clifton Suspension Bridge over the Avon Gorge at night, with the coloured houses of the hillside.
  A.skyline = function (cls) {
    var i = u(), r = seeded(42), houses = '', windows = '';
    var pastel = ['#f9a8d4', '#fde68a', '#a7f3d0', '#93c5fd', '#fca5a5', '#c4b5fd', '#fdba74'];
    for (var x = 4; x < 400; x += 9 + Math.floor(r() * 5)) {
      var hill = 78 - 10 * Math.sin(x / 70) - 4 * Math.sin(x / 23), h = 8 + Math.floor(r() * 6), w = 7 + Math.floor(r() * 3);
      houses += '<rect x="' + x + '" y="' + f(hill - h + 6) + '" width="' + w + '" height="' + (h + 4) + '" fill="' + pastel[Math.floor(r() * pastel.length)] + '"/>';
      if (r() > 0.35) windows += '<rect x="' + (x + 2) + '" y="' + f(hill - h + 9) + '" width="2" height="2"/>';
      if (r() > 0.55) windows += '<rect x="' + (x + w - 4) + '" y="' + f(hill - h + 9) + '" width="2" height="2"/>';
    }
    var hangers = '';
    for (var hx = 92; hx < 310; hx += 8) {
      var t = (hx - 80) / 240, cy = (1 - t) * (1 - t) * 52 + 2 * (1 - t) * t * 108 + t * t * 52;
      hangers += 'M' + hx + ',' + f(cy) + 'V84';
    }
    var lights = '';
    for (var lx = 84; lx <= 316; lx += 12) {
      var tt = (lx - 80) / 240, ly = (1 - tt) * (1 - tt) * 52 + 2 * (1 - tt) * tt * 108 + tt * tt * 52;
      lights += '<circle cx="' + lx + '" cy="' + f(ly) + '" r="1.3"/>';
    }
    var tower = function (x) {
      return '<path d="M' + (x - 9) + ',96V52h18v44z M' + (x - 5) + ',96V66q5,-7 10,0v30z" fill="#2d1a52" stroke="#8b5cf6" stroke-opacity=".7" stroke-width=".8" fill-rule="evenodd"/><rect x="' + (x - 11) + '" y="48" width="22" height="5" fill="#3b2370" stroke="#8b5cf6" stroke-opacity=".7" stroke-width=".8"/>';
    };
    return '<svg class="skyline ' + (cls || '') + '" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="rv' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1d6e"/><stop offset="1" stop-color="#0b0614"/></linearGradient></defs>' +
      '<g opacity=".5">' + houses + '</g>' +
      '<path d="M0,86C60,66 130,84 200,74C270,64 340,82 400,70V140H0Z" fill="#160c2c" opacity=".7"/>' +
      '<g fill="#fde68a" opacity=".9">' + windows + '</g>' +
      '<rect x="0" y="118" width="400" height="22" fill="url(#rv' + i + ')"/>' +
      '<path d="M120,128h40M210,132h50M150,134h30M260,126h30" stroke="#c4b5fd" stroke-opacity=".35" stroke-width="1"/>' +
      '<path d="M0,96L64,94L78,104L92,140H0Z" fill="#0f0820"/><path d="M308,92L400,90V140H292L300,108Z" fill="#0f0820"/>' +
      '<g fill="#160c2c">' + [8, 22, 38, 52, 318, 334, 350, 366, 382].map(function (cx, k) { return '<circle cx="' + cx + '" cy="' + (93 - (k % 3) * 2) + '" r="' + (6 + (k % 2) * 2) + '"/>'; }).join('') + '</g>' +
      '<path d="M80,52L36,96M320,52L364,94" stroke="#6d4bb0" stroke-width="2"/>' +
      '<path d="M80,52Q200,108 320,52M80,55Q200,111 320,55" stroke="#8b6fd0" stroke-width="1.6" fill="none"/>' +
      '<path d="' + hangers + '" stroke="#5b4396" stroke-width=".8"/>' +
      '<rect x="64" y="83" width="272" height="4" fill="#3b2370" stroke="#8b5cf6" stroke-opacity=".6" stroke-width=".6"/>' +
      tower(80) + tower(320) +
      '<g fill="#fde68a" class="bridge-lights">' + lights + '</g>' +
    '</svg>';
  };
  A.balloon = function (c1, c2, cls) {
    var i = u();
    return '<svg class="balloon ' + (cls || '') + '" viewBox="0 0 40 58" aria-hidden="true">' +
      '<defs><clipPath id="bc' + i + '"><path d="M20 2C34 2 40 14 38 24C36 34 26 40 24 44H16C14 40 4 34 2 24C0 14 6 2 20 2Z"/></clipPath></defs>' +
      '<g clip-path="url(#bc' + i + ')"><rect width="40" height="46" fill="' + c1 + '"/><rect x="7" width="7" height="46" fill="' + c2 + '"/><rect x="26" width="7" height="46" fill="' + c2 + '"/><rect y="30" width="40" height="5" fill="#fff" opacity=".35"/></g>' +
      '<path d="M16 44L17 50M24 44L23 50" stroke="#2a1850" stroke-width="1"/><rect x="15" y="50" width="10" height="7" rx="1.5" fill="#7c4a1e"/>' +
    '</svg>';
  };

  /* ---------- crest, horns, icon ---------- */
  function crestArt(i, withText) {
    var horn = '<path d="M64 74C44 58 32 34 40 4C46 24 58 40 84 60Z" fill="url(#ch' + i + ')" stroke="#2e1065" stroke-width="2"/>';
    var club = function (rot) {
      return '<g transform="rotate(' + rot + ' 100 112)"><path d="M96 196L96 120C92 96 90 60 100 34C110 60 108 96 104 120L104 196Z" fill="#2b2638" stroke="#cfc6e0" stroke-width="2"/>' +
        '<path d="M92 70l-6 3 6 3M92 88l-6 3 6 3M108 70l6 3-6 3M108 88l6 3-6 3M93 52l-5 3 5 3M107 52l5 3-5 3" fill="#cfc6e0"/></g>';
    };
    return '<defs>' +
        '<radialGradient id="cg' + i + '" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#a855f7"/><stop offset=".6" stop-color="#6d28d9"/><stop offset="1" stop-color="#2e1065"/></radialGradient>' +
        '<linearGradient id="ch' + i + '" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8b7aa8"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>' +
        '<linearGradient id="cb' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>' +
      '</defs>' +
      club(-38) + club(38) +
      horn + '<g transform="translate(200 0) scale(-1 1)">' + horn + '</g>' +
      '<circle cx="100" cy="112" r="62" fill="url(#cg' + i + ')" stroke="#fbbf24" stroke-width="5"/>' +
      '<circle cx="100" cy="112" r="53" fill="none" stroke="#e9d5ff" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 5"/>' +
      '<path d="M108 66L76 120H98L88 160L126 102H104Z" fill="url(#cb' + i + ')" stroke="#7c2d12" stroke-width="2" stroke-linejoin="round"/>' +
      (withText ? '<path d="M38 160Q100 186 162 160L170 178Q100 206 30 178Z" fill="#fbbf24" stroke="#7c2d12" stroke-width="2"/>' +
        '<text x="100" y="186" text-anchor="middle" font-size="17" font-weight="900" fill="#2e1065" font-family="Avenir Next Condensed, Futura, Impact, Roboto Condensed, Arial Narrow, sans-serif" letter-spacing="2.5">KAIDONETA</text>' : '');
  }
  A.crest = function (cls, withText) {
    return '<svg class="crest ' + (cls || '') + '" viewBox="0 0 200 210" role="img" aria-label="Kaidoneta crest">' + crestArt(u(), withText !== false) + '</svg>';
  };
  // The app icon: the crest without its banner on a night-purple tile. scale < 1 keeps it inside the maskable zone.
  A.icon = function (rounded, scale) {
    var i = u();
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
      '<defs><radialGradient id="ib' + i + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3b1676"/><stop offset="1" stop-color="#12081f"/></radialGradient></defs>' +
      '<rect width="512" height="512" ' + (rounded ? 'rx="112"' : '') + ' fill="url(#ib' + i + ')"/>' +
      '<g transform="translate(256 258) scale(' + (2.3 * scale) + ') translate(-100 -99)">' + crestArt(i, false) + '</g>' +
    '</svg>';
  };
  // Little horns above an avatar.
  A.horns = function (cls) {
    var h = '<path d="M14 26C7 20 4 11 7 1C10 9 14 15 22 22Z" fill="#f5f0ff" stroke="#2e1065" stroke-width="1.5"/>';
    return '<svg class="horns ' + (cls || '') + '" viewBox="0 0 60 28" aria-hidden="true">' + h + '<g transform="translate(60 0) scale(-1 1)">' + h + '</g></svg>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
