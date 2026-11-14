"""Render test pieces with a real piano sound, run the Basic Pitch model on them, save fixtures for the core tests.

The core library (android-scorebook/core) is tested on the exact model outputs the app sees on a phone:
the pieces below are rendered to audio with FluidSynth (General MIDI grand piano), the audio goes through
nmp.tflite with the same streaming windows the app uses (core: BasicPitchStream), and the onset and note
probability matrices are saved next to the ground truth.

Each piece is rendered twice:
  clean    - an in-tune piano
  detuned  - about a third of the notes are 35-60 cents out of tune, with some room noise, so the model hears
             them between two keys (F or F#?). This is where the musical-context prior has to decide.

Requirements: fluidsynth with a GM soundfont (apt-get install fluidsynth), and
  pip install numpy mido soundfile ai-edge-litert

Usage:
  python tools/make_fixtures.py --model app/src/main/assets/basic_pitch.tflite --out core/src/test/resources/fixtures
"""

import argparse
import gzip
import json
import os
import random
import subprocess
import tempfile

import mido
import numpy as np
import soundfile as sf

SR = 22050
HOP = 256
WINDOW = 43844  # model input samples
WINDOW_FRAMES = 172
EDGE = 15  # frames dropped at each end of a window
STRIDE_FRAMES = WINDOW_FRAMES - 2 * EDGE  # 142 frames kept per window
STRIDE = STRIDE_FRAMES * HOP  # 36352 samples between windows
LEAD = EDGE * HOP  # zeros in front of the stream, so kept frame 0 is time 0

Q, H, W, E, S, DQ, DH = 1.0, 2.0, 4.0, 0.5, 0.25, 1.5, 3.0


def piece_modulation():
    """C major for 8 bars (with a clear C# passing note), then G major (F# everywhere). 4/4, 96 BPM."""
    rh = [
        [(76, Q), (74, Q), (72, Q), (76, Q)],
        [(81, H), (79, Q), (76, Q)],
        [(77, Q), (81, Q), (84, Q), (81, Q)],
        [(79, DQ), (77, E), (74, H)],
        [(72, E), (74, E), (76, E), (77, E), (79, H)],
        [(81, Q), (77, Q), (79, Q), (74, Q)],
        [(72, Q), (73, Q), (74, Q), (76, Q)],
        [(74, H), (71, H)],
        [(78, Q), (81, Q), (86, Q), (84, Q)],
        [(83, H), (79, H)],
        [(76, Q), (79, Q), (83, Q), (79, Q)],
        [(81, Q), (79, Q), (76, Q), (72, Q)],
        [(74, E), (76, E), (78, E), (79, E), (81, H)],
        [(83, DQ), (81, E), (79, H)],
        [(84, Q), (81, Q), (78, Q), (74, Q)],
        [(79, W)],
    ]
    c, am, f, g7 = [48, 52, 55], [45, 52, 57], [41, 48, 53], [43, 50, 53]
    g, d7, em, am7, g7b = [43, 50, 55], [50, 54, 60], [40, 47, 52], [45, 52, 55], [43, 47, 53]
    lh = [
        [(c, W)], [(am, W)], [(f, W)], [(g7, W)], [(c, W)], [(f, H), (g, H)], [(c, W)], [(g7b, W)],
        [(d7, W)], [(g, W)], [(em, W)], [(c, W)], [(d7, W)], [(g, W)], [(am7, H), (d7, H)], [(g, W)],
    ]
    keys = [{"bar": 0, "key": "C major"}, {"bar": 8, "key": "G major"}]
    return dict(name="modulation", bpm=96, meter=[4, 4], rh=rh, lh=lh, keys=keys)


def piece_waltz():
    """A minor waltz with G# leading tones. 3/4, 132 BPM."""
    rh = [
        [(72, H), (76, Q)], [(81, DH)], [(77, Q), (76, Q), (74, Q)], [(71, H), (68, Q)],
        [(69, Q), (72, Q), (76, Q)], [(77, H), (81, Q)], [(80, H), (76, Q)], [(81, DH)],
        [(79, Q), (76, Q), (72, Q)], [(74, H), (71, Q)], [(72, Q), (76, Q), (81, Q)], [(80, H), (83, Q)],
        [(81, Q), (77, Q), (74, Q)], [(76, H), (72, Q)], [(71, Q), (74, Q), (68, Q)], [(69, DH)],
    ]
    chords = {
        "Am": (45, [52, 57, 60]), "Dm": (50, [53, 57, 62]), "E": (40, [52, 56, 59]), "F": (41, [53, 57, 60]),
        "C": (48, [52, 55, 60]), "G": (43, [50, 55, 59]), "E7": (40, [50, 56, 59]),
    }
    prog = ["Am", "Am", "Dm", "E", "Am", "F", "E", "Am", "C", "G", "Am", "E", "Dm", "Am", "E7", "Am"]
    lh = [[([chords[ch][0]], Q), (chords[ch][1], Q), (chords[ch][1], Q)] for ch in prog]
    return dict(name="waltz", bpm=132, meter=[3, 4], rh=rh, lh=lh, keys=[{"bar": 0, "key": "A minor"}])


def piece_nocturne():
    """D minor, broken-chord eighths in the left hand, sixteenths and clear chromatic notes. 4/4, 72 BPM."""
    rh = [
        [(69, DQ), (74, E), (77, Q), (76, E), (74, E)],
        [(74, Q), (70, H), (69, E), (67, E)],
        [(69, Q), (73, Q), (76, Q), (79, Q)],
        [(77, DH), (76, S), (74, S), (73, S), (74, S)],
        [(77, DQ), (74, E), (70, Q), (74, Q)],
        [(79, Q), (77, E), (76, E), (74, Q), (70, Q)],
        [(69, E), (70, E), (69, E), (68, E), (69, Q), (73, Q)],
        [(74, W)],
    ]
    dm, gm, a7, bb = [38, 45, 50, 53, 57, 53, 50, 45], [43, 50, 55, 58, 62, 58, 55, 50], \
        [45, 52, 55, 61, 64, 61, 55, 52], [34, 41, 46, 50, 53, 50, 46, 41]
    broken = lambda ps: [([p], E) for p in ps]  # noqa: E731
    lh = [broken(dm), broken(gm), broken(a7), broken(dm), broken(bb), broken(gm), broken(a7), [([38, 50, 53, 57], W)]]
    return dict(name="nocturne", bpm=72, meter=[4, 4], rh=rh, lh=lh, keys=[{"bar": 0, "key": "D minor"}])


def events(piece, rng, detune):
    """Ground-truth notes in seconds, with a little human timing and velocity."""
    spb = 60.0 / piece["bpm"]
    bar_beats = piece["meter"][0] * 4.0 / piece["meter"][1]
    notes = []
    for hand, staff in (("R", piece["rh"]), ("L", piece["lh"])):
        for b, bar in enumerate(staff):
            t = b * bar_beats
            for pitches, dur in bar:
                pitches = pitches if isinstance(pitches, list) else [pitches]
                jitter = rng.gauss(0, 0.012)
                for p in pitches:
                    vel = int(np.clip(rng.gauss(88 if hand == "R" else 64, 6), 30, 120))
                    cents = 0.0
                    if detune and rng.random() < 0.35:
                        cents = rng.choice([-1, 1]) * rng.uniform(35, 60)
                    on = max(0.0, t * spb + jitter + rng.gauss(0, 0.004))
                    off = on + dur * spb * 0.92
                    notes.append(dict(pitch=p, on=round(on, 4), off=round(off, 4), vel=vel, hand=hand,
                                      beat=t, beats=dur, cents=round(cents, 1)))
                t += dur
    notes.sort(key=lambda n: (n["on"], n["pitch"]))
    return notes


def write_midi(notes, path):
    """One note per channel at a time, so each note can carry its own pitch bend (its detuning)."""
    mid = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tempo = 500000  # 120 BPM in the file; times below are absolute seconds
    tr.append(mido.MetaMessage("set_tempo", tempo=tempo))
    chans = [c for c in range(16) if c != 9]
    msgs = []
    busy = {c: 0.0 for c in chans}
    for n in notes:
        ch = min(chans, key=lambda c: (busy[c] > n["on"], busy[c]))
        busy[ch] = n["off"] + 0.6  # release tail
        bend = int(np.clip(n["cents"] / 200.0 * 8192, -8192, 8191))
        msgs.append((n["on"] - 0.002, mido.Message("pitchwheel", channel=ch, pitch=bend)))
        msgs.append((n["on"], mido.Message("note_on", channel=ch, note=n["pitch"], velocity=n["vel"])))
        msgs.append((n["off"], mido.Message("note_off", channel=ch, note=n["pitch"], velocity=0)))
    for ch in chans:
        msgs.append((0.0, mido.Message("program_change", channel=ch, program=0)))
    msgs.sort(key=lambda m: (max(m[0], 0.0), m[1].type != "program_change", m[1].type != "pitchwheel"))
    now = 0.0
    for t, m in msgs:
        t = max(t, 0.0)
        ticks = int(round(mido.second2tick(t - now, 960, tempo)))
        now += mido.tick2second(ticks, 960, tempo)
        tr.append(m.copy(time=ticks))
    mid.save(path)


def render(midi_path, wav_path, sf2):
    subprocess.run(["fluidsynth", "-ni", "-q", "-F", wav_path, "-r", str(SR), "-g", "0.6", sf2, midi_path],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    audio, sr = sf.read(wav_path, dtype="float32")
    assert sr == SR
    return audio.mean(axis=1) if audio.ndim == 2 else audio


def run_model(model_path, audio):
    """Same windows as the app's streaming code: kept frame j of window k is global frame k*142 + j."""
    from ai_edge_litert.interpreter import Interpreter

    it = Interpreter(model_path=model_path)
    run = it.get_signature_runner()
    stream = np.concatenate([np.zeros(LEAD, np.float32), audio.astype(np.float32)])
    n_frames = int(np.ceil(len(audio) / HOP))
    onsets, frames = [], []
    for start in range(0, len(audio) + LEAD, STRIDE):
        win = stream[start:start + WINDOW]
        win = np.pad(win, (0, WINDOW - len(win)))
        out = run(input_2=win.reshape(1, WINDOW, 1))
        onsets.append(out["onset"][0, EDGE:EDGE + STRIDE_FRAMES])
        frames.append(out["note"][0, EDGE:EDGE + STRIDE_FRAMES])
    return np.concatenate(onsets)[:n_frames], np.concatenate(frames)[:n_frames]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sf2", default="/usr/share/sounds/sf2/FluidR3_GM.sf2")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for piece in (piece_modulation(), piece_waltz(), piece_nocturne()):
        for variant in ("clean", "detuned"):
            rng = random.Random(f"{args.seed}-{piece['name']}-{variant}")
            notes = events(piece, rng, detune=(variant == "detuned"))
            with tempfile.TemporaryDirectory() as tmp:
                mid, wav = os.path.join(tmp, "p.mid"), os.path.join(tmp, "p.wav")
                write_midi(notes, mid)
                audio = render(mid, wav, args.sf2)
            if variant == "detuned":
                audio = audio + np.random.default_rng(args.seed).normal(0, 10 ** (-48 / 20), len(audio)).astype(np.float32)
            onset, note = run_model(args.model, audio)
            name = f"{piece['name']}_{variant}"
            with gzip.open(os.path.join(args.out, name + ".probs.gz"), "wb") as f:
                # frames x 88 onset bytes, then frames x 88 note bytes; probability = byte / 255
                f.write(np.round(onset * 255).astype(np.uint8).tobytes())
                f.write(np.round(note * 255).astype(np.uint8).tobytes())
            meta = dict(name=name, frames=int(onset.shape[0]), fps=SR / HOP, bpm=piece["bpm"], meter=piece["meter"],
                        keys=piece["keys"], notes=notes, seconds=round(len(audio) / SR, 3))
            with open(os.path.join(args.out, name + ".json"), "w") as f:
                json.dump(meta, f, indent=1)
            print(f"{name}: {len(notes)} notes, {onset.shape[0]} frames, max onset {onset.max():.2f}")


if __name__ == "__main__":
    main()
