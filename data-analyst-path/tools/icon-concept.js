/* Icon concept B, "Dot on the chart": the single source for every icon (web, iOS, Android and the notification icon). */
'use strict';
const C = {
  gradient: [[0, '#1e3a8a'], [0.5, '#2563eb'], [1, '#0d9488']],
  bars: [[128, 300, 72, 112, 0.78], [220, 240, 72, 172, 0.9], [312, 196, 72, 216, 1]],
  radius: 20,
  dot: [348, 136, 54],
  dotColor: '#fbbf24',
  eyes: [[331, 130, 9], [365, 130, 9]],
  ink: '#172554',
  smile: 'M334 152 Q348 162 362 152',
};

const defs = () => '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' + C.gradient.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
const bars = (fill) => C.bars.map(([x, y, w, hh, op]) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="' + C.radius + '" fill="' + (fill || '#ffffff') + '"' + (fill ? '' : ' fill-opacity="' + op + '"') + '/>').join('');
const dot = (fill) => '<circle cx="' + C.dot[0] + '" cy="' + C.dot[1] + '" r="' + C.dot[2] + '" fill="' + (fill || C.dotColor) + '"/>';
const face = (ink, simple) => C.eyes.map(([x, y, r]) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + ink + '"/>').join('') +
  (simple ? '' : '<path d="' + C.smile + '" fill="none" stroke="' + ink + '" stroke-width="7" stroke-linecap="round"/>');
const art = (opts) => { opts = opts || {}; return bars(opts.mono) + dot(opts.mono) + (opts.noFace ? '' : face(opts.mono ? '#000' : C.ink, opts.mono)); };
const svg = (inner) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' + inner + '</svg>';
const scaled = (s, inner) => '<g transform="translate(256 256) scale(' + s + ') translate(-256 -256)">' + inner + '</g>';

module.exports = {
  C,
  any: () => svg('<defs>' + defs() + '</defs><rect width="512" height="512" rx="112" fill="url(#bg)"/>' + art()),
  favicon: () => svg('<defs>' + defs() + '</defs><rect width="512" height="512" rx="112" fill="url(#bg)"/>' + art({ noFace: true })),
  maskable: () => svg('<defs>' + defs() + '</defs><rect width="512" height="512" fill="url(#bg)"/>' + scaled(0.8, art())),
  background: () => svg('<defs>' + defs() + '</defs><rect width="512" height="512" fill="url(#bg)"/>'),
  foreground: () => svg(scaled(0.6, art())),
  monochrome: () => svg('<defs><mask id="m">' + scaled(0.6, art({ mono: '#fff' })) + '</mask></defs><rect width="512" height="512" fill="#fff" mask="url(#m)"/>'),
  // Android vector drawable for the status-bar notification: a white silhouette with the eyes cut out.
  notification: () => {
    const minX = C.bars[0][0], maxX = C.dot[0] + C.dot[2], minY = C.dot[1] - C.dot[2], maxY = Math.max(...C.bars.map((b) => b[1] + b[3]));
    const s = 20 / Math.max(maxX - minX, maxY - minY), ox = (24 - (maxX - minX) * s) / 2, oy = (24 - (maxY - minY) * s) / 2;
    const F = (n) => +n.toFixed(2), X = (x) => F(ox + (x - minX) * s), Y = (y) => F(oy + (y - minY) * s), R = (r) => F(r * s);
    const rr = ([x, y, w, hh]) => { const r = R(C.radius), a = X(x), b = Y(y), c = X(x + w), d = Y(y + hh), A = r + ',' + r + ' 0 0 1 ';
      return 'M' + F(a + r) + ',' + b + 'H' + F(c - r) + 'A' + A + c + ',' + F(b + r) + 'V' + F(d - r) + 'A' + A + F(c - r) + ',' + d +
        'H' + F(a + r) + 'A' + A + a + ',' + F(d - r) + 'V' + F(b + r) + 'A' + A + F(a + r) + ',' + b + 'Z'; };
    const circ = ([x, y, r]) => { const cx = X(x), cy = Y(y), q = R(r), A = q + ',' + q + ' 0 1 0 '; return 'M' + F(cx - q) + ',' + cy + 'A' + A + F(cx + q) + ',' + cy + 'A' + A + F(cx - q) + ',' + cy + 'Z'; };
    const path = C.bars.map(rr).join('') + circ(C.dot) + C.eyes.map(circ).join('');
    return '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n' +
      '    <path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="' + path + '"/>\n</vector>\n';
  },
};
