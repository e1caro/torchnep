/* Kaidoneta effects: lightning on a win, sounds (made on the phone with Web Audio, no files), vibration, toasts. */
(function (root) {
  'use strict';
  var K = (root.K = root.K || {});
  var X = (K.fx = {});
  var doc = root.document;

  X.opts = function () { return (K.ui && K.ui.local) || { sound: true, buzz: true }; };
  X.still = function () { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; };

  /* ---------- vibration ---------- */
  X.buzz = function (pattern) {
    if (!X.opts().buzz || !root.navigator.vibrate) return;
    try { root.navigator.vibrate(pattern); } catch (e) { /* not allowed */ }
  };

  /* ---------- sound ---------- */
  var ctx = null;
  function audio() {
    if (!X.opts().sound) return null;
    try {
      ctx = ctx || new (root.AudioContext || root.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(a, freq, start, dur, type, vol) {
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, a.currentTime + start);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, a.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.05);
  }
  function thunder(a, start, dur, vol) {
    var n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.5; }
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(vol || 0.9, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + start);
  }
  X.sound = function (kind) {
    var a = audio();
    if (!a) return;
    if (kind === 'win') { thunder(a, 0, 1.4, 0.8); [523, 659, 784, 1047].forEach(function (f, i) { tone(a, f, 0.08 + i * 0.09, 0.32, 'triangle', 0.16); }); }
    else if (kind === 'loss') { tone(a, 392, 0, 0.3, 'sine', 0.16); tone(a, 330, 0.22, 0.3, 'sine', 0.16); tone(a, 262, 0.44, 0.6, 'sine', 0.16); }
    else if (kind === 'draw') { tone(a, 440, 0, 0.25, 'triangle', 0.14); tone(a, 440, 0.2, 0.3, 'triangle', 0.14); }
    else if (kind === 'rank') { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(a, f, i * 0.07, 0.4, 'square', 0.06); }); }
    else if (kind === 'tick') tone(a, 880, 0, 0.08, 'square', 0.05);
    else if (kind === 'alarm') { for (var i = 0; i < 6; i++) tone(a, i % 2 ? 660 : 880, i * 0.18, 0.16, 'square', 0.12); }
    else if (kind === 'dice') { for (var j = 0; j < 5; j++) tone(a, 200 + Math.random() * 300, j * 0.08, 0.05, 'square', 0.05); }
  };

  /* ---------- toasts ---------- */
  X.toast = function (msg, kind) {
    var box = doc.getElementById('toasts');
    if (!box) return;
    var t = doc.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  };

  /* ---------- the big moment after logging a round ---------- */
  // kind 'W' | 'L' | 'D'; info: { title, line, sub, rankUp }
  X.moment = function (kind, info) {
    var el = doc.getElementById('moment');
    if (!el) return;
    var bolts = '';
    if (kind === 'W') {
      for (var b = 0; b < 4; b++) {
        var x = 40 + Math.random() * 320;
        bolts += '<path d="' + K.art.boltPath(x, -10, x + (Math.random() - 0.5) * 160, 300 + Math.random() * 300, Math.floor(Math.random() * 999) + 1, 26) + '"/>';
      }
    }
    el.className = 'moment show res-' + kind + (X.still() ? ' still' : '');
    el.innerHTML = (kind === 'W' ? '<svg class="moment-bolts" viewBox="0 0 400 700" preserveAspectRatio="none">' + bolts + '</svg>' : '') +
      '<div class="moment-card">' +
        '<div class="moment-title">' + info.title + '</div>' +
        (info.line ? '<div class="moment-line">' + info.line + '</div>' : '') +
        (info.rankUp ? '<div class="moment-rank">' + info.rankUp + '</div>' : '') +
        (info.sub ? '<div class="moment-sub">' + info.sub + '</div>' : '') +
      '</div>';
    X.sound(kind === 'W' ? (info.rankUp ? 'rank' : 'win') : kind === 'L' ? 'loss' : 'draw');
    if (kind === 'W' && info.rankUp) setTimeout(function () { X.sound('win'); }, 450);
    X.buzz(kind === 'W' ? [40, 60, 40, 60, 120] : kind === 'L' ? [160] : [60, 60, 60]);
    clearTimeout(X._mt);
    var close = function () { el.className = 'moment'; el.innerHTML = ''; };
    el.onclick = close;
    X._mt = setTimeout(close, kind === 'W' ? 2600 : 2000);
  };
})(typeof window !== 'undefined' ? window : globalThis);
