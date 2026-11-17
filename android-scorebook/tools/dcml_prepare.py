#!/usr/bin/env python3
"""
More scores for the rhythm network to learn notation from: turns the DCML corpora of keyboard music
(https://github.com/DCMLab: Mozart and Beethoven sonatas, Chopin mazurkas, Grieg, Scarlatti, Bach suites, C.P.E.
Bach and others; tables of notes with bars, key and time signatures; CC BY-NC-SA 4.0) into "performances" in the
same format as asap_prepare.py writes. Nothing from the corpora is stored in this repository.

A score has no timing of its own, so each piece is played by a simple model of a pianist: a tempo that matches
how dense real performances are, a tempo that drifts and slows at the ends of phrases, onsets that are never
exactly together, lengths shortened by the touch or lengthened by the pedal. These teach what real performances
of 124 pieces cannot: how music is usually written (which note value carries the beat, where bar lines fall,
which key signature goes with which notes) across several hundred more pieces. Pieces that are in the
development or held-out sets of the evaluation are left out.

usage: dcml_prepare.py --dcml /path/with/the/cloned/corpora --asap-prepared /path/to/prepared --out /path/to/synth
"""
import argparse
import csv
import math
import os
import random
from fractions import Fraction

CORPORA = [
    "mozart_piano_sonatas", "beethoven_piano_sonatas", "chopin_mazurkas", "grieg_lyric_pieces", "schumann_kinderszenen",
    "liszt_pelerinage", "tchaikovsky_seasons", "debussy_suite_bergamasque", "medtner_tales", "dvorak_silhouettes",
    "bach_en_fr_suites", "couperin_clavecin", "scarlatti_sonatas", "wf_bach_sonatas", "jc_bach_sonatas", "cpe_bach_keyboard",
    "handel_keyboard", "bartok_bagatelles", "poulenc_mouvements_perpetuels", "rachmaninoff_piano",
]
# Mozart sonata numbers as ASAP names them -> Köchel numbers as DCML names them
MOZART = {1: 279, 2: 280, 3: 281, 4: 282, 5: 283, 6: 284, 7: 309, 8: 310, 9: 311, 10: 330, 11: 331, 12: 332, 13: 333, 14: 457, 15: 533,
          16: 545, 17: 570, 18: 576}


def frac(s):
    return Fraction(s) if s not in ("", None) else None


def meter(timesig):
    """(numerator, denominator, beats per bar, beat length in quarters) with the beat a musician would count."""
    num, den = (int(x) for x in timesig.split("/"))
    if num in (6, 9, 12):
        return num, den, num // 3, Fraction(12, den)
    return num, den, num, Fraction(4, den)


def excluded(asap_prepared):
    """Names of DCML pieces that are in the development or held-out sets of the evaluation."""
    out = set()
    for line in list(open(os.path.join(asap_prepared, "index.tsv")))[1:]:
        f = line.rstrip("\n").split("\t")
        if f[3] == "tune":
            continue
        composer, title = f[1], f[2]
        if composer == "Beethoven" and title.startswith("Piano_Sonatas_"):
            n, m = title[len("Piano_Sonatas_"):].split("-")[:2]
            out.add(("beethoven_piano_sonatas", f"{int(n):02d}-{m[0]}"))
        if composer == "Mozart" and title.startswith("Piano_Sonatas_"):
            n, m = title[len("Piano_Sonatas_"):].split("-")[:2]
            out.add(("mozart_piano_sonatas", f"K{MOZART[int(n)]}-{m[0]}"))
    return out


def read_piece(corpus_dir, name):
    """Notes and bars of one piece, in quarter notes of score time."""
    measures = list(csv.DictReader(open(os.path.join(corpus_dir, "measures", name + ".measures.tsv")), delimiter="\t"))
    notes = list(csv.DictReader(open(os.path.join(corpus_dir, "notes", name + ".notes.tsv")), delimiter="\t"))
    bars = []  # (start in quarters, numerator, denominator, beats per bar, beat length, key signature)
    bar_of_mc = {}
    for m in measures:
        start = frac(m.get("quarterbeats"))
        if start is None or not m.get("timesig"):
            continue  # second endings: only the first way through is used
        num, den, bpb, beat = meter(m["timesig"])
        offset = (frac(m.get("mc_offset")) or Fraction(0)) * 4
        if offset == 0 or not bars:
            bars.append((start - offset, num, den, bpb, beat, int(m["keysig"] or 0)))
        bar_of_mc[m["mc"]] = len(bars) - 1
    out = []
    for n in notes:
        q = frac(n.get("quarterbeats"))
        if q is None or n.get("gracenote") or n.get("tied") in ("0", "-1") or n["mc"] not in bar_of_mc or not n.get("midi"):
            continue
        pitch = int(n["midi"])
        if not 21 <= pitch <= 108:
            continue
        bar = bar_of_mc[n["mc"]]
        out.append((q, Fraction(n["duration_qb"]) if "/" in n["duration_qb"] else Fraction(float(n["duration_qb"])).limit_denominator(96),
                    pitch, 0 if n["staff"] == "1" else 1, bar))
    out.sort(key=lambda x: (x[0], x[2]))
    return bars, out


def perform(bars, notes, rng, beat_seconds):
    """
    One rendition at about [beat_seconds] per beat: returns (note rows, beats [(seconds, is bar line)], time
    signatures, key signatures).
    """
    end_q = max(q + d for q, d, *_ in notes)
    onsets = sorted({q for q, *_ in notes})
    per_quarter = len(onsets) / max(float(end_q - onsets[0]), 1.0)
    # all beats of the piece in score time
    beats = []
    for i, (start, num, den, bpb, beat, key) in enumerate(bars):
        nxt = bars[i + 1][0] if i + 1 < len(bars) else end_q + beat
        for k in range(bpb):
            b = start + k * beat
            if b < nxt and b >= onsets[0] - beat and b <= end_q + beat:
                beats.append((b, k == 0, beat))
    if len(beats) < 8:
        return None
    mean_beat = sum(float(b[2]) for b in beats) / len(beats)
    spq = beat_seconds / mean_beat
    # ... unless that makes the piece busier or emptier than any real performance (1.5 to 14 onsets per second)
    spq = min(max(spq, per_quarter / 14.0), per_quarter / 1.5)
    # the tempo drifts, and slows towards the ends of phrases and at the very end
    drift = rng.choice([0.0, 0.01, 0.02, 0.035, 0.05, 0.08])
    phrase = rng.choice([0, 4, 8]) * 1
    slow = rng.uniform(0.05, 0.35)
    x = 0.0
    times = [0.5]
    bar_count = 0
    for i in range(len(beats) - 1):
        if beats[i][1]:
            bar_count += 1
        x = 0.92 * x + rng.gauss(0, drift)
        f = math.exp(x)
        if phrase and bar_count % phrase == 0 and beats[i + 1][1] is False and rng.random() < 0.6:
            f *= 1 + slow * 0.5
        left = len(beats) - 1 - i
        if left < 6:
            f *= 1 + slow * (6 - left) / 6
        times.append(times[-1] + float(beats[i + 1][0] - beats[i][0]) * spq * f)
    bq = [float(b[0]) for b in beats]

    def sec(q):
        q = float(q)
        import bisect
        i = min(max(bisect.bisect_right(bq, q) - 1, 0), len(bq) - 2)
        return times[i] + (q - bq[i]) * (times[i + 1] - times[i]) / max(bq[i + 1] - bq[i], 1e-9)

    jitter = rng.uniform(0.003, 0.014)
    touch = rng.uniform(0.55, 1.0)
    pedal = rng.random() < 0.6
    group_shift = {}
    rows = []
    for q, d, pitch, staff, bar in notes:
        if q not in group_shift:
            group_shift[q] = rng.gauss(0, jitter)
        on = sec(q) + group_shift[q] + rng.uniform(0, 0.008) + (0.004 if staff == 1 else 0.0) * rng.random()
        length = (sec(q + d) - sec(q)) * min(1.0, rng.gauss(touch, 0.12))
        off = on + max(length, 0.04)
        poff = off + (rng.uniform(0, 1.2) if pedal and rng.random() < 0.7 else 0.0)
        start = bars[bar][0]
        vel = 62 + (9 if q == start else 0) + (5 if staff == 0 else 0) + rng.gauss(0, 9)
        rows.append((on, off, poff, pitch, int(min(max(vel, 20), 120)), staff, bar, float(q - start), float(d)))
    rows.sort(key=lambda r: (r[0], r[3]))
    ts, ks = [], []
    for start, num, den, bpb, beat, key in bars:
        t = max(sec(start), 0.0)
        if not ts or ts[-1][1:] != (num, den, bpb):
            ts.append((t, num, den, bpb))
        if not ks or ks[-1][1] != key:
            ks.append((t, key))
    return rows, [(t, b[1]) for t, b in zip(times, beats)], ts, ks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dcml", required=True)
    ap.add_argument("--asap-prepared", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--renditions", type=int, default=2)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    skip = excluded(args.asap_prepared)
    # How long the beat is in real performances, by time signature (tuning set): the tempo a piece is given is
    # drawn from the real ones of its time signature, so "3/4 goes about this fast" is learned as it really is.
    beat_by_ts, beat_all = {}, []
    for line in list(open(os.path.join(args.asap_prepared, "index.tsv")))[1:]:
        f = line.rstrip("\n").split("\t")
        if f[3] != "tune":
            continue
        beats, ts = [], None
        for l in open(os.path.join(args.asap_prepared, f[0] + ".txt")):
            if l.startswith("B"):
                beats.append(float(l.split("\t")[1]))
            elif l.startswith("T") and ts is None:
                ts = "/".join(l.split("\t")[2:4])
        gaps = sorted(b - a for a, b in zip(beats, beats[1:]))
        if gaps and ts:
            beat_by_ts.setdefault(ts, []).append(gaps[len(gaps) // 2])
            beat_all.append(gaps[len(gaps) // 2])
    print("beat length in real performances (median seconds):", {k: round(sorted(v)[len(v) // 2], 2) for k, v in sorted(beat_by_ts.items())})
    rng = random.Random(7)
    index = []
    for corpus in CORPORA:
        d = os.path.join(args.dcml, corpus)
        if not os.path.isdir(os.path.join(d, "notes")):
            continue
        n_ok = 0
        for fn in sorted(os.listdir(os.path.join(d, "notes"))):
            if not fn.endswith(".notes.tsv"):
                continue
            name = fn[: -len(".notes.tsv")]
            if (corpus, name) in skip:
                continue
            try:
                bars, notes = read_piece(d, name)
            except Exception as e:
                print("skip", corpus, name, e)
                continue
            if len(notes) < 60 or len(bars) < 6:
                continue
            for k in range(args.renditions):
                ts = f"{bars[len(bars) // 2][1]}/{bars[len(bars) // 2][2]}"
                pool = beat_by_ts.get(ts, [])
                res = perform(bars, notes, rng, rng.choice(pool if len(pool) >= 5 else beat_all) * math.exp(rng.gauss(0, 0.12)))
                if res is None:
                    continue
                rows, beats, ts, ks = res
                out_name = f"synth__{corpus}__{name}__{k}".replace(" ", "_").replace("/", "_")
                with open(os.path.join(args.out, out_name + ".txt"), "w") as f:
                    f.write(f"P\t{corpus}\t{name}\t{out_name}\n")
                    for t, num, den, bpb in ts:
                        f.write(f"T\t{t:.4f}\t{num}\t{den}\t{bpb}\n")
                    for t, key in ks:
                        f.write(f"K\t{t:.4f}\t{key}\n")
                    for t, down in beats:
                        f.write(f"B\t{t:.4f}\t{'d' if down else 'b'}\n")
                    for r in rows:
                        f.write(f"N\t{r[0]:.4f}\t{r[1]:.4f}\t{r[2]:.4f}\t{r[3]}\t{r[4]}\t{r[5]}\t{r[6]}\t{r[7]:.4f}\t{r[8]:.4f}\n")
                index.append([out_name, corpus, name, "synth", len(rows), len(rows), len(rows), "", "0", ""])
            n_ok += 1
        print(f"{corpus}: {n_ok} pieces")
    with open(os.path.join(args.out, "index.tsv"), "w") as f:
        f.write("name\tcomposer\ttitle\tsplit\tnotes\tmatched\tscore_notes\tmaestro_audio\tstart\tend\n")
        for row in index:
            f.write("\t".join(str(x) for x in row) + "\n")
    print(len(index), "renditions,", sum(r[4] for r in index), "notes;", len(skip), "pieces of the evaluation left out")


if __name__ == "__main__":
    main()
