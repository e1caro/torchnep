/* Bloomdoku sound and touch feedback. Each value is a note of a pentatonic scale, so any row, column or plot is a
 * little melody, played on the instrument chosen in the shop. Web Audio starts suspended on iPhone until the first tap: BD.sound.unlock() is called from one. */
(function () {
  'use strict';
  var BD = (window.BD = window.BD || {});
  var S = (BD.sound = {});
  var NOTES = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // C D E G A, then up an octave
  var ctx = null;

  function on() { return BD.state && BD.state.set.sound; }
  function audio() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }
  S.unlock = function () {
    if (!on()) return;
    var a = audio();
    if (a && a.state === 'suspended') a.resume().catch(function () { /* stays silent */ });
  };

  // The instruments of the musical garden (the shop's kind 'sound'). Each is a few partials (wave, multiple of the
  // note's frequency, share of the loudness), how sharply it starts, how long it rings, and an octave shift.
  var INSTRUMENTS = {
    kalimba: { parts: [['sine', 1, 1], ['triangle', 2, 0.18]], attack: 0.012, ring: 1, octave: 0, gain: 1 },
    marimba: { parts: [['sine', 1, 1], ['sine', 4, 0.22]], attack: 0.006, ring: 0.55, octave: 0, gain: 1.15 },
    musicbox: { parts: [['sine', 1, 1], ['sine', 3, 0.14], ['sine', 5.4, 0.05]], attack: 0.004, ring: 1.7, octave: 1, gain: 0.8 },
    harp: { parts: [['triangle', 1, 1], ['sine', 2, 0.3], ['sine', 3, 0.1]], attack: 0.018, ring: 2.2, octave: 0, gain: 0.9 },
    bells: { parts: [['sine', 1, 1], ['sine', 2.76, 0.35], ['sine', 5.4, 0.18]], attack: 0.003, ring: 2.6, octave: 1, gain: 0.6 },
    chiptune: { parts: [['square', 1, 1]], attack: 0.002, ring: 0.4, octave: 0, gain: 0.33 },
  };
  S.instruments = INSTRUMENTS;
  function instrument(name) { return INSTRUMENTS[name || (BD.shop && BD.state ? BD.shop.wearing(BD.state, 'sound') : 'kalimba')] || INSTRUMENTS.kalimba; }

  // One note: a short tone that starts at once and dies away.
  function pluck(freq, when, gain, len, name) {
    var a = audio();
    if (!a) return; // while the context is still waking up its clock stands still, so the note sounds as soon as it runs
    var ins = instrument(name), t0 = a.currentTime + (when || 0), dur = (len || 0.5) * ins.ring, g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((gain || 0.16) * ins.gain, t0 + ins.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(a.destination);
    ins.parts.forEach(function (p) {
      var o = a.createOscillator(), pg = a.createGain();
      o.type = p[0]; o.frequency.value = freq * p[1] * Math.pow(2, ins.octave);
      pg.gain.value = p[2];
      o.connect(pg); pg.connect(g);
      o.start(t0); o.stop(t0 + dur + 0.05);
    });
  }
  // A few notes of an instrument, to hear it in the shop.
  S.sample = function (name) { if (on()) [0, 2, 4, 5, 7].forEach(function (i, k) { pluck(NOTES[i], k * 0.13, 0.15, 0.6, name); }); };

  S.note = function (v) { if (on()) pluck(NOTES[v - 1], 0, 0.16, 0.5); };
  S.soft = function () { if (on()) pluck(196, 0, 0.06, 0.18); };            // a pencil note, undo
  S.wilt = function () { if (on()) { pluck(207.65, 0, 0.12, 0.35); pluck(155.56, 0.09, 0.1, 0.45); } };
  // The melody of a finished row, column or plot: its values in order.
  S.melody = function (values, delay) {
    if (!on()) return;
    values.forEach(function (v, i) { pluck(NOTES[v - 1], (delay || 0) + i * 0.075, 0.12, 0.45); });
  };
  S.win = function () {
    if (!on()) return;
    [0, 2, 3, 5, 7, 8].forEach(function (i, k) { pluck(NOTES[i], k * 0.11, 0.15, 0.9); });
    [5, 7, 8].forEach(function (i) { pluck(NOTES[i], 0.75, 0.12, 1.4); });
  };

  /* ---------- touch feedback ---------- */
  // Android vibrates. iPhone Safari has no vibration API, but toggling a switch-style checkbox gives a light tap
  // on recent iOS versions; where neither exists nothing happens.
  var sw = null, swLabel = null;
  S.tap = function () {
    if (!BD.state || !BD.state.set.haptic) return;
    try {
      if (BD.native && BD.native.vibrate) { BD.native.vibrate(8); return; } // the Android app
      if (navigator.vibrate) { navigator.vibrate(8); return; }
      if (!swLabel) {
        sw = document.createElement('input');
        sw.type = 'checkbox'; sw.id = 'bd-haptic'; sw.setAttribute('switch', ''); sw.setAttribute('aria-hidden', 'true'); sw.tabIndex = -1;
        swLabel = document.createElement('label');
        swLabel.htmlFor = 'bd-haptic'; swLabel.setAttribute('aria-hidden', 'true');
        var box = document.createElement('div');
        box.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
        box.appendChild(sw); box.appendChild(swLabel);
        document.body.appendChild(box);
      }
      swLabel.click();
    } catch (e) { /* no feedback on this phone */ }
  };
})();
