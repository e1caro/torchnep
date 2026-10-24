'use strict';
// Every interface has its own sound: an instrument and a scale for taps, rewards and level-ups, all made live with Web Audio.
// [voice, tick notes, claim notes, level notes, extras]  (notes in Hz)
const SND = {
  hud: ['blip', [880], [660, 990], [523, 784, 1047, 1568]],
  chinese: ['pluck', [784], [587, 784, 880], [523, 587, 659, 784, 1047], { gong: 1 }],
  japanese: ['koto', [659], [659, 698, 880], [440, 494, 523, 659, 880], { echo: .25 }],
  fairy: ['chime', [1568], [1319, 1760, 2093], [1047, 1319, 1568, 2093, 2637], { echo: .3 }],
  medieval: ['lute', [392], [392, 523, 659], [392, 523, 659, 784], { fanfare: 1 }],
  steampunk: ['clank', [440], [440, 660], [330, 440, 554, 660], { whistle: 1 }],
  greek: ['lyre', [587], [587, 740, 880], [440, 587, 659, 880, 1175]],
  egypt: ['harp', [659], [659, 698, 831], [330, 349, 415, 440, 494, 659], { shaker: 1 }],
  viking: ['horn', [196], [196, 294], [147, 196, 220, 294], { drum: 1 }],
  pirate: ['squeeze', [523], [523, 659, 784], [392, 494, 587, 784, 659, 784]],
  outrun: ['synth', [440], [440, 659], [330, 440, 554, 659, 880], { echo: .2 }],
  arcade: ['chip', [660], [523, 784], [523, 659, 784, 1047]],
  classical: ['harp', [1047], [784, 1047, 1319], [523, 659, 784, 1047, 1319, 1568]],
  artdeco: ['vibes', [698], [698, 880, 1047], [349, 440, 523, 659, 784]],
  gothic: ['organ', [440], [440, 523, 659], [220, 262, 330, 440], { chord: 1 }],
  baroque: ['harpsi', [988], [784, 988, 1175], [587, 740, 880, 1175, 880, 1175]],
  mythical: ['magic', [740], [554, 740, 1109], [370, 554, 740, 1109, 1480], { echo: .35 }],
  cosmic: ['space', [1200], [600, 900, 1200], [400, 600, 800, 1200, 1600], { echo: .45 }],
};

let SND_OUT = null, SND_KEY = '';
function sndOut(echo) { // the output for this interface: straight, or through a short echo
  const key = String(echo || 0);
  if (SND_OUT && SND_KEY === key) return SND_OUT;
  const out = AC.createGain(); out.gain.value = 1; out.connect(AC.destination);
  if (echo) {
    const d = AC.createDelay(1), fb = AC.createGain(), wet = AC.createGain();
    d.delayTime.value = .18; fb.gain.value = echo; wet.gain.value = .5;
    out.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(AC.destination);
  }
  SND_OUT = out; SND_KEY = key;
  return out;
}
const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
function osc(type, f, t, d, peak, out, { a = .005, filter, q = 1, sweep, detune = 0, glide, lfo } = {}) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(glide ? f * glide : f, t); if (glide) o.frequency.exponentialRampToValueAtTime(f, t + Math.min(.12, d));
  o.detune.value = detune;
  let node = o;
  if (filter) { const fl = AC.createBiquadFilter(); fl.type = filter; fl.frequency.setValueAtTime(sweep ? sweep[0] : f * 4, t); if (sweep) fl.frequency.exponentialRampToValueAtTime(sweep[1], t + d); fl.Q.value = q; o.connect(fl); node = fl; }
  if (lfo) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = lfo[0]; lg.gain.value = lfo[1]; l.connect(lg); lg.connect(lfo[2] === 'amp' ? g.gain : o.frequency); l.start(t); l.stop(t + a + d + .05); }
  node.connect(g); g.connect(out); env(g, t, a, peak, d); o.start(t); o.stop(t + a + d + .05);
}
function noise(t, d, peak, out, type = 'bandpass', f = 2000, q = 1) {
  const n = AC.sampleRate * d, buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  s.connect(fl); fl.connect(g); g.connect(out); env(g, t, .003, peak, d); s.start(t); s.stop(t + d + .02);
}
// one note in an interface's instrument
const VOICES = {
  blip: (f, t, d, o) => osc('sine', f, t, d, .09, o, { glide: .8 }),
  chip: (f, t, d, o) => osc('square', f, t, d * .8, .05, o),
  pluck: (f, t, d, o) => { osc('triangle', f, t, .5, .1, o); osc('sawtooth', f, t, .25, .03, o, { filter: 'lowpass', sweep: [4000, 600] }); },
  koto: (f, t, d, o) => { osc('triangle', f, t, .6, .1, o); osc('sawtooth', f * 2, t, .15, .02, o, { filter: 'lowpass', sweep: [5000, 900] }); },
  chime: (f, t, d, o) => { osc('sine', f, t, .9, .06, o); osc('sine', f * 2.76, t, .5, .02, o); osc('sine', f * 5.4, t, .3, .01, o); },
  lute: (f, t, d, o) => osc('sawtooth', f, t, .45, .06, o, { filter: 'lowpass', sweep: [2600, 500], q: 2 }),
  clank: (f, t, d, o) => { osc('square', f, t, .1, .04, o, { filter: 'bandpass', q: 6 }); osc('square', f * 1.41, t, .14, .025, o, { filter: 'bandpass', q: 8 }); noise(t, .03, .05, o, 'highpass', 3000); },
  lyre: (f, t, d, o) => { osc('triangle', f, t, .7, .09, o); osc('sine', f * 2, t, .35, .025, o); },
  harp: (f, t, d, o) => { osc('triangle', f, t, .8, .09, o, { a: .004 }); osc('sine', f * 2, t, .4, .03, o); osc('sine', f * 3, t, .25, .012, o); },
  horn: (f, t, d, o) => osc('sawtooth', f, t, Math.max(.25, d), .07, o, { a: .05, filter: 'lowpass', sweep: [900, 500] }),
  squeeze: (f, t, d, o) => { osc('square', f, t, d + .05, .025, o, { a: .02, filter: 'lowpass', sweep: [1800, 1400], detune: -9 }); osc('square', f, t, d + .05, .025, o, { a: .02, filter: 'lowpass', sweep: [1800, 1400], detune: 9 }); },
  synth: (f, t, d, o) => { osc('sawtooth', f, t, d + .15, .035, o, { filter: 'lowpass', sweep: [300, 3200], q: 4, detune: -8 }); osc('sawtooth', f, t, d + .15, .035, o, { filter: 'lowpass', sweep: [300, 3200], q: 4, detune: 8 }); },
  vibes: (f, t, d, o) => { osc('sine', f, t, .9, .09, o, { lfo: [6, .04, 'amp'] }); osc('sine', f * 4, t, .2, .012, o); },
  organ: (f, t, d, o) => [1, 2, 3, 4].forEach((h, i) => osc('sine', f * h, t, Math.max(.3, d), [.03, .018, .012, .007][i], o, { a: .02 })),
  harpsi: (f, t, d, o) => { osc('sawtooth', f, t, .3, .045, o, { filter: 'highpass', q: .7, sweep: [500, 400] }); osc('square', f * 2, t, .15, .01, o); },
  magic: (f, t, d, o) => { osc('sine', f, t, .6, .07, o, { lfo: [5, 8] }); osc('sine', f * 2, t, .3, .02, o); },
  space: (f, t, d, o) => osc('sine', f, t, .45, .08, o, { glide: 1.5, lfo: [7, 6] }),
};
const STEP = { tick: .07, claim: .09, level: .11 };

sfx = function (kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === 'level' ? [60, 40, 120] : 25);
    if (!G.sound) return;
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const [v, tick, claim, level, x = {}] = SND[document.documentElement.dataset.skin] || SND.hud;
    const notes = { tick, claim, level }[kind] || tick, step = STEP[kind] || .08, out = sndOut(x.echo), play = VOICES[v];
    let t = AC.currentTime + .01;
    if (x.chord && kind === 'level') notes.forEach(f => play(f, t, .9, out)); // an organ chord
    else notes.forEach((f, i) => { play(f, t, i === notes.length - 1 ? step * 3 : step, out); t += step; });
    // the extras that make each place sound like itself
    if (kind === 'level') {
      if (x.gong) VOICES.chime(110, t, 1.5, out), osc('sine', 82, t, 1.8, .08, out);
      if (x.fanfare) [523, 659, 784].forEach(f => VOICES.horn(f, t, .5, out));
      if (x.whistle) osc('sine', 1760, t, .5, .03, out, { a: .05, lfo: [9, 25] }), noise(t, .5, .015, out, 'highpass', 4000);
      if (x.drum) [0, .14, .28].forEach(k => { osc('sine', 70, t + k, .25, .14, out, { glide: 2.2 }); noise(t + k, .06, .05, out, 'lowpass', 400); });
    }
    if (x.shaker && kind !== 'tick') [0, .06, .12].forEach(k => noise(AC.currentTime + .01 + k, .05, .025, out, 'highpass', 5000));
  } catch { /* audio blocked */ }
};

// hear an interface while trying it in the shop
if (typeof trySkin === 'function') { const _sndTry = trySkin; window.trySkin = trySkin = function (k) { _sndTry(k); setTimeout(() => sfx('level'), 150); }; }
