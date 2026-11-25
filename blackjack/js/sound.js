/* Table sounds, made on the fly with Web Audio (no sound files): the snap of a dealt card, chips, a shuffle and
 * short chimes for the results. Everything is quiet and fails silently where audio is not allowed. */
(function (root) {
  'use strict';
  let ctx = null, on = true;
  function ac() {
    try {
      if (!ctx) { const A = root.AudioContext || root.webkitAudioContext; if (!A) return null; ctx = new A(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function noise(dur, freq, gain, when) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0), n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9; g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t);
  }
  function tone(freq, dur, type, gain, when, slideTo) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const play = (fn) => function () { if (!on) return; try { fn.apply(null, arguments); } catch (e) { /* no audio */ } };
  root.Sound = {
    set: (v) => { on = !!v; },
    unlock: () => { if (on) ac(); },
    card: play(() => noise(0.07, 2400, 0.35)),
    flip: play(() => { noise(0.05, 3600, 0.22); noise(0.04, 1800, 0.12, 0.05); }),
    chip: play(() => { tone(2500, 0.06, 'triangle', 0.07); tone(3300, 0.05, 'triangle', 0.05, 0.035); }),
    chips: play(() => { for (let i = 0; i < 4; i++) tone(2300 + Math.random() * 1400, 0.05, 'triangle', 0.05, i * 0.045); }),
    shuffle: play(() => { for (let i = 0; i < 16; i++) noise(0.035, 1800 + Math.random() * 1600, 0.14, i * 0.05); }),
    win: play(() => [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, i * 0.08))),
    blackjack: play(() => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.07))),
    push: play(() => tone(440, 0.14, 'sine', 0.05)),
    lose: play(() => tone(240, 0.3, 'sine', 0.07, 0, 150)),
  };
})(typeof window !== 'undefined' ? window : this);
