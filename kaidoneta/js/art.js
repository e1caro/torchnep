/* Kaidoneta art, drawn in SVG so it is sharp on every phone and works offline: lightning, the Clifton Suspension
 * Bridge at night with Balloon Fiesta balloons, the crew's crest and the app icon. Kaido's dragon form is in
 * art-dragon.js and Kaido's styles in kaido-*.js.
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
    var horn = '<path d="M82 76C58 84 30 74 21 50C15 34 18 16 30 2C28 20 32 34 42 43C52 52 66 55 84 54Z" fill="url(#ch' + i + ')" stroke="#2e1065" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M28 14C27 28 31 40 40 47" stroke="#fff" stroke-opacity=".8" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M58 54c-2 5-2 11 0 17M46 50c-3 5-3 11-1 17" stroke="#5d4a7c" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    var club = function (rot) {
      return '<g transform="rotate(' + rot + ' 100 112)"><path d="M96 196L96 120C92 96 90 60 100 34C110 60 108 96 104 120L104 196Z" fill="#2b2638" stroke="#cfc6e0" stroke-width="2"/>' +
        '<path d="M92 70l-6 3 6 3M92 88l-6 3 6 3M108 70l6 3-6 3M108 88l6 3-6 3M93 52l-5 3 5 3M107 52l5 3-5 3" fill="#cfc6e0"/></g>';
    };
    return '<defs>' +
        '<radialGradient id="cg' + i + '" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#a855f7"/><stop offset=".6" stop-color="#6d28d9"/><stop offset="1" stop-color="#2e1065"/></radialGradient>' +
        '<linearGradient id="ch' + i + '" x1=".8" y1="1" x2=".1" y2="0"><stop offset="0" stop-color="#8b7aa8"/><stop offset=".4" stop-color="#d9cfe9"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>' +
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
  // Kaido's horns: they grow from his temples, sweep OUT sideways, then curve UP into thick ivory crescents whose
  // tips turn slightly inward. Drawn for an avatar circle centred at (50, 50) of the 100 x 60 box.
  var hornN = 0;
  A.hornPath = 'M33 43C20 46 8 40 5 27C3 18 6 9 12 2C11 11 13 19 18 25C23 31 31 33 40 32Z';
  A.horns = function (cls) {
    var i = 'h' + (++hornN);
    var one = '<path d="' + A.hornPath + '" fill="url(#' + i + ')" stroke="#2e1065" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M10 9C9 17 11 23 16 28" stroke="#fff" stroke-opacity=".85" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M27 32.5c-1 3-1 6 0 9M21 30c-1.6 2.6-2 6-1 9.6" stroke="#6b5a86" stroke-opacity=".55" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    return '<svg class="horns ' + (cls || '') + '" viewBox="0 0 100 60" aria-hidden="true">' +
      '<defs><linearGradient id="' + i + '" x1=".7" y1="1" x2=".1" y2="0"><stop offset="0" stop-color="#8f7fa6"/><stop offset=".35" stop-color="#d8cde6"/><stop offset=".75" stop-color="#fbf6ea"/><stop offset="1" stop-color="#fffdf6"/></linearGradient></defs>' +
      one + '<g transform="translate(100 0) scale(-1 1)">' + one + '</g></svg>';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
})(typeof window !== 'undefined' ? window : globalThis);
