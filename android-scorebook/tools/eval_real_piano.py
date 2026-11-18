"""Evaluate the transcription models on real piano recordings (MAESTRO v3, test split).

Nothing from MAESTRO is stored in this repository (its licence is CC BY-NC-SA): this script pulls the first
80 seconds of a few recordings, and their MIDI ground truth, straight out of the public 108 GB zip with HTTP
range requests, runs the models with the app's windows, and writes one `<name>.json` + `<name>.probs.gz` pair per
recording for core's RealPianoEvalTest, which decodes them with the app's decoder and prints precision, recall,
F1 and the recall on notes that belong to a chord. Each recording is evaluated as it is ("clean") and through a
simulated phone on the music stand in a living room ("phone": small-microphone band limits, reverb, noise,
limiting).

  pip install numpy scipy mido soundfile ai-edge-litert
  tools/fetch_model.sh
  python tools/eval_real_piano.py --out /tmp/eval --pieces 8
  SCOREBOOK_EVAL_DIR=/tmp/eval gradle -p . :core:test --tests '*RealPianoEvalTest*' -i | grep -E "clean|phone"

Results (8 pieces: Rachmaninoff, Schubert, Chopin, Beethoven, Mozart, Liszt, Bach, Haydn; 17 640 notes):

                      F1 clean  chord notes found   F1 phone  chord notes found
  Onsets and Frames     0.964        0.939            0.955        0.924
  Basic Pitch           0.783        0.552            0.730        0.467

With --detune it instead shows what a piano that is flat or sharp as a whole does to Onsets and Frames (rendered
pieces from make_fixtures.py), and what feeding the audio at concert pitch (core: TuningCompensation) recovers.
"""
import argparse
import csv
import io
import json
import os
import random
import struct
import subprocess
import tempfile
import zipfile
from math import gcd

import mido
import numpy as np
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

import make_fixtures as mf

BASE = "https://storage.googleapis.com/magentadata/datasets/maestro/v3.0.0/"


class HttpFile(io.RawIOBase):
    """A remote file read with range requests (so one member of a huge zip can be extracted)."""

    def __init__(self, url, block=1 << 20):
        self.url, self.block, self.pos, self.cache = url, block, 0, {}
        head = subprocess.run(["curl", "-sSI", url], check=True, capture_output=True, text=True).stdout
        self.size = int([l.split(":")[1] for l in head.splitlines() if l.lower().startswith("content-length")][-1])

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def _get(self, b):
        if b not in self.cache:
            a = b * self.block
            z = min(self.size, a + self.block) - 1
            data = subprocess.run(["curl", "-sS", "--retry", "3", "-r", f"{a}-{z}", self.url], check=True, capture_output=True).stdout
            if len(self.cache) > 64:
                self.cache.pop(next(iter(self.cache)))
            self.cache[b] = data
        return self.cache[b]

    def read(self, n=-1):
        if n < 0:
            n = self.size - self.pos
        out = bytearray()
        while n > 0 and self.pos < self.size:
            chunk = self._get(self.pos // self.block)[self.pos % self.block:self.pos % self.block + n]
            out += chunk
            self.pos += len(chunk)
            n -= len(chunk)
        return bytes(out)

    def readinto(self, buf):
        d = self.read(len(buf))
        buf[:len(d)] = d
        return len(d)


def wav_prefix(data):
    pos, fmt = 12, None
    while pos + 8 <= len(data):
        cid, ln = data[pos:pos + 4], struct.unpack("<I", data[pos + 4:pos + 8])[0]
        if cid == b"fmt ":
            fmt = struct.unpack("<HHIIHH", data[pos + 8:pos + 24])
        if cid == b"data":
            ch, sr = fmt[1], fmt[2]
            raw = data[pos + 8:]
            n = len(raw) // (ch * 2) * ch * 2
            return np.frombuffer(raw[:n], dtype="<i2").astype(np.float32).reshape(-1, ch).mean(axis=1) / 32768, sr
        pos += 8 + ln + (ln & 1)
    raise ValueError("no data chunk")


def midi_notes(data, until):
    mid = mido.MidiFile(file=io.BytesIO(data))
    t, on, notes = 0.0, {}, []
    for msg in mid:
        t += msg.time
        if msg.type == "note_on" and msg.velocity > 0:
            on.setdefault(msg.note, []).append((t, msg.velocity))
        elif msg.type in ("note_off", "note_on") and on.get(getattr(msg, "note", -1)):
            s, v = on[msg.note].pop(0)
            notes.append(dict(pitch=msg.note, on=round(s, 4), off=round(t, 4), vel=v))
    return sorted([n for n in notes if n["on"] < until], key=lambda n: n["on"])


def phone(x, sr, seed=0, snr_db=32, rt60=0.45, wet=0.35):
    rng = np.random.default_rng(seed)
    n = int(rt60 * sr)
    ir = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / n)
    ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum())
    y = x + wet * fftconvolve(x, ir)[:len(x)]
    y = sosfilt(butter(2, 180, "hp", fs=sr, output="sos"), y)
    y = sosfilt(butter(4, 7500, "lp", fs=sr, output="sos"), y)
    y = y / (np.abs(y).max() + 1e-9) * 0.5
    y = np.tanh(2.2 * y) / 2.2
    return (y + rng.standard_normal(len(y)) * np.sqrt((y ** 2).mean()) * 10 ** (-snr_db / 20)).astype(np.float32)


def resample(x, sr, to):
    g = gcd(sr, to)
    return resample_poly(x, to // g, sr // g).astype(np.float32)


def real_recordings(args):
    os.makedirs(args.out, exist_ok=True)
    rows = list(csv.DictReader(io.StringIO(subprocess.run(["curl", "-sS", BASE + "maestro-v3.0.0.csv"], check=True, capture_output=True, text=True).stdout)))
    rows = [r for r in rows if r["split"] == "test"]
    random.seed(11)
    random.shuffle(rows)
    seen, pick = set(), []
    for r in rows:  # one piece per composer
        if r["canonical_composer"] not in seen:
            seen.add(r["canonical_composer"])
            pick.append(r)
    zf = zipfile.ZipFile(io.BufferedReader(HttpFile(BASE + "maestro-v3.0.0.zip"), 1 << 20))
    for i, r in enumerate(pick[:args.pieces], 1):
        with zf.open("maestro-v3.0.0/" + r["audio_filename"]) as f:
            x, sr = wav_prefix(f.read(16_000_000))
        with zf.open("maestro-v3.0.0/" + r["midi_filename"]) as f:
            notes = midi_notes(f.read(), len(x) / sr - 1.0)
        print(i, r["canonical_composer"], "|", r["canonical_title"], len(notes), "notes", flush=True)
        for kind in ("clean", "phone"):
            a = phone(x, sr, seed=i) if kind == "phone" else x
            if args.of_model:
                o, f_, v = mf.run_onsets_frames(args.of_model, a, sr)
                mf.save_planes(os.path.join(args.out, f"of{i}_{kind}.probs.gz"), o, f_, v)
                json.dump(dict(frames=int(o.shape[0]), model="onsets_frames", notes=notes), open(os.path.join(args.out, f"of{i}_{kind}.json"), "w"))
            if args.model:
                o, n_ = mf.run_model(args.model, resample(a, sr, mf.SR))
                mf.save_planes(os.path.join(args.out, f"bp{i}_{kind}.probs.gz"), o, n_)
                json.dump(dict(frames=int(o.shape[0]), model="basic_pitch", notes=notes), open(os.path.join(args.out, f"bp{i}_{kind}.json"), "w"))


def detune(args):
    def f1(onset, notes, scale=1.0):
        det = [(t * 0.032 * scale, k + 21) for k in range(88) for t in range(len(onset)) if onset[t, k] >= 0.5 and (t == 0 or onset[t - 1, k] < 0.5)]
        used, tp = [False] * len(notes), 0
        for t, p in sorted(det):
            c = [i for i, n in enumerate(notes) if not used[i] and n["pitch"] == p and abs(n["on"] - t) <= 0.06]
            if c:
                used[min(c, key=lambda i: abs(notes[i]["on"] - t))] = True
                tp += 1
        return 2 * tp / max(1, len(det) + len(notes))

    for cents in (0, -10, -20, -30, -40, -50, 20, 35):
        plain, fixed = [], []
        for piece in (mf.piece_modulation(), mf.piece_waltz(), mf.piece_nocturne()):
            notes = mf.events(piece, random.Random(piece["name"]), detune=False)
            for n in notes:
                n["cents"] = float(cents)
            with tempfile.TemporaryDirectory() as tmp:
                mid, wav = os.path.join(tmp, "p.mid"), os.path.join(tmp, "p.wav")
                mf.write_midi(notes, mid)
                audio = mf.render(mid, wav, args.sf2)
            plain.append(f1(mf.run_onsets_frames(args.of_model, audio)[0], notes))
            den = int(round(1000 * 2 ** (-cents / 1200.0)))  # play it faster (flat piano) or slower (sharp)
            fixed.append(f1(mf.run_onsets_frames(args.of_model, resample_poly(audio, 1000, den).astype(np.float32))[0], notes, den / 1000))
        print(f"piano {cents:+3d} cents: F1 {np.mean(plain):.3f}   with tuning compensation {np.mean(fixed):.3f}", flush=True)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/scorebook-eval")
    ap.add_argument("--pieces", type=int, default=8)
    ap.add_argument("--of-model", default=os.path.join(here, "../app/src/main/assets/onsets_frames.tflite"))
    ap.add_argument("--model", default=os.path.join(here, "../app/src/main/assets/basic_pitch.tflite"), help="Basic Pitch, for comparison ('' to skip)")
    ap.add_argument("--detune", action="store_true")
    ap.add_argument("--sf2", default="/usr/share/sounds/sf2/FluidR3_GM.sf2")
    a = ap.parse_args()
    detune(a) if a.detune else real_recordings(a)
