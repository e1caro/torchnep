/* Bloomdoku sound and touch feedback. Each value is a note of a pentatonic scale, so any row, column or plot is a
 * little melody. Web Audio starts suspended on iPhone until the first tap: BD.sound.unlock() is called from one. */
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

  // A soft plucked tone, like a kalimba.
  function pluck(freq, when, gain, len) {
    var a = audio();
    if (!a) return; // while the context is still waking up its clock stands still, so the note sounds as soon as it runs
    var t0 = a.currentTime + (when || 0), o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    o2.type = 'triangle'; o2.frequency.value = freq * 2;
    var g2 = a.createGain(); g2.gain.value = 0.18;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.16, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (len || 0.5));
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(a.destination);
    o.start(t0); o2.start(t0); o.stop(t0 + (len || 0.5) + 0.05); o2.stop(t0 + (len || 0.5) + 0.05);
  }

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
