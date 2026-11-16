#!/usr/bin/env python3
"""
Prepares the ASAP dataset (https://github.com/fosfrancesco/asap-dataset, CC BY-NC-SA 4.0: classical piano scores
aligned with real performances) for measuring Scorebook against the sheet music. Nothing from the dataset is
written into this repository: the output goes to a directory of your choice and is read by AsapEvalTest.

For every performance it writes one text file with
  - the notes that were played (from the instrument's MIDI): onset, key release, release with the pedal, pitch,
    velocity;
  - what the sheet says about each of them, found by aligning the score to the performance through the annotated
    beats: staff (right / left hand), the bar it is in, its place in the bar and its written length;
  - the beats, bar lines, time signatures and key signatures marked on the performance.

and an index with a split BY PIECE into a tuning set, a small development set and a held-out set. Pieces follow MAESTRO's own split when
they have MAESTRO recordings (train -> tune; validation and test -> held out, so the audio model has never heard
the held-out recordings either); the others are assigned by a hash of the piece's name.

usage: asap_prepare.py --asap /path/to/asap-dataset --out /path/to/prepared [--maestro-csv maestro-v3.0.0.csv]
"""
import argparse
import bisect
import csv
import hashlib
import json
import os

import mido


def tempo_map(mid):
    """[(tick, seconds, tempo)] change points of a MIDI file."""
    changes = []
    for track in mid.tracks:
        tick = 0
        for msg in track:
            tick += msg.time
            if msg.type == "set_tempo":
                changes.append((tick, msg.tempo))
    changes.sort()
    if not changes or changes[0][0] != 0:
        changes.insert(0, (0, 500000))
    out = []
    sec = 0.0
    for i, (tick, tempo) in enumerate(changes):
        if i > 0:
            ptick, _, ptempo = out[-1]
            sec += mido.tick2second(tick - ptick, mid.ticks_per_beat, ptempo)
        out.append((tick, sec, tempo))
    return out


def tick_to_sec(tm, tpb, tick):
    i = bisect.bisect_right([c[0] for c in tm], tick) - 1
    t0, s0, tempo = tm[i]
    return s0 + mido.tick2second(tick - t0, tpb, tempo)


def sec_to_tick(tm, tpb, sec):
    i = bisect.bisect_right([c[1] for c in tm], sec + 1e-9) - 1
    t0, s0, tempo = tm[max(i, 0)]
    return t0 + mido.second2tick(sec - s0, tpb, tempo)


def read_notes(mid, with_pedal=False):
    """Notes of a MIDI file as dicts (tick, end, pitch, vel, track); optionally the release with the sustain pedal."""
    notes = []
    pedal_down = []  # (tick_down, tick_up)
    for ti, track in enumerate(mid.tracks):
        tick = 0
        on = {}
        down = None
        for msg in track:
            tick += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                on.setdefault(msg.note, []).append((tick, msg.velocity))
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                if on.get(msg.note):
                    t0, v = on[msg.note].pop(0)
                    notes.append({"tick": t0, "end": max(tick, t0 + 1), "pitch": msg.note, "vel": v, "track": ti})
            elif msg.type == "control_change" and msg.control == 64:
                if msg.value >= 64 and down is None:
                    down = tick
                elif msg.value < 64 and down is not None:
                    pedal_down.append((down, tick))
                    down = None
    notes.sort(key=lambda n: (n["tick"], n["pitch"]))
    if with_pedal:
        pedal_down.sort()
        starts = [p[0] for p in pedal_down]
        by_pitch = {}
        for n in notes:
            by_pitch.setdefault(n["pitch"], []).append(n)
        for n in notes:
            end = n["end"]
            i = bisect.bisect_right(starts, end) - 1
            if i >= 0 and pedal_down[i][1] > end:  # the pedal is down when the key is released
                end = pedal_down[i][1]
            # the same key struck again ends the earlier note
            again = [m["tick"] for m in by_pitch[n["pitch"]] if m["tick"] > n["tick"]]
            if again:
                end = min(end, max(min(again), n["end"]))
            n["pedal_end"] = end
    return notes


def interp(x, xs, ys):
    """Piecewise linear through (xs, ys), extrapolated with the end slopes."""
    if x <= xs[0]:
        i = 0
    elif x >= xs[-1]:
        i = len(xs) - 2
    else:
        i = bisect.bisect_right(xs, x) - 1
    span = xs[i + 1] - xs[i]
    if span <= 0:
        return ys[i]
    return ys[i] + (x - xs[i]) * (ys[i + 1] - ys[i]) / span


def match(score, perf, tol):
    """Pairs score notes with performance notes of the same pitch, in order, within [tol](seconds at that place)."""
    pairs = {}
    by_pitch_s, by_pitch_p = {}, {}
    for i, n in enumerate(score):
        by_pitch_s.setdefault(n["pitch"], []).append(i)
    for j, n in enumerate(perf):
        by_pitch_p.setdefault(n["pitch"], []).append(j)
    for pitch, si in by_pitch_s.items():
        pj = by_pitch_p.get(pitch, [])
        a = b = 0
        while a < len(si) and b < len(pj):
            want = score[si[a]]["pred"]
            got = perf[pj[b]]["on"]
            if abs(got - want) <= tol(score[si[a]]):
                # a later performance note may be closer still
                if b + 1 < len(pj) and abs(perf[pj[b + 1]]["on"] - want) < abs(got - want) and (a + 1 >= len(si) or score[si[a + 1]]["pred"] - perf[pj[b + 1]]["on"] > perf[pj[b + 1]]["on"] - want):
                    b += 1
                    continue
                pairs[pj[b]] = si[a]
                a += 1
                b += 1
            elif got < want:
                b += 1
            else:
                a += 1
    return pairs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asap", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--maestro-csv", help="MAESTRO metadata, to follow its train/validation/test split")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    ann = json.load(open(os.path.join(args.asap, "asap_annotations.json")))
    rows = list(csv.DictReader(open(os.path.join(args.asap, "metadata.csv"))))
    maestro_split = {}
    if args.maestro_csv:
        for r in csv.DictReader(open(args.maestro_csv)):
            maestro_split[os.path.basename(r["midi_filename"])] = r["split"]

    # split by piece
    piece_split = {}
    for r in rows:
        piece = r["folder"]
        m = os.path.basename(r["maestro_midi_performance"]) if r["maestro_midi_performance"] else ""
        s = maestro_split.get(m)
        if s:
            piece_split.setdefault(piece, set()).add("tune" if s == "train" else "held")
    split = {}
    for r in rows:
        piece = r["folder"]
        ss = piece_split.get(piece)
        h = int(hashlib.sha1(piece.encode()).hexdigest(), 16) % 100
        if ss and len(ss) == 1:
            split[piece] = next(iter(ss))
        elif ss:
            split[piece] = "mixed"  # MAESTRO disagrees with itself: not used for either
        else:
            split[piece] = "held" if h < 30 else "tune"
        # part of the tuning set is kept aside to choose between methods while developing ("dev"); the held-out
        # set is only for the numbers that are reported
        if split[piece] == "tune" and (h * 7 + 3) % 100 < 15:
            split[piece] = "dev"

    score_cache = {}
    index = []
    done = 0
    for r in rows:
        key = r["midi_performance"]
        a = ann.get(key)
        if a is None or not a["score_and_performance_aligned"]:
            continue
        pb, sb = a["performance_beats"], a["midi_score_beats"]
        if len(pb) != len(sb) or len(pb) < 8:
            continue
        try:
            folder = r["folder"]
            if folder not in score_cache:
                sm = mido.MidiFile(os.path.join(args.asap, r["midi_score"]))
                tm = tempo_map(sm)
                sn = read_notes(sm)
                for n in sn:
                    n["sec"] = tick_to_sec(tm, sm.ticks_per_beat, n["tick"])
                score_cache = {folder: (sm, tm, sn)}  # keep one piece in memory
            sm, tm, sn = score_cache[folder]
            pm = mido.MidiFile(os.path.join(args.asap, key))
            ptm = tempo_map(pm)
            pn = read_notes(pm, with_pedal=True)
        except Exception as e:  # a few files are malformed
            print("skip", key, e)
            continue
        for n in pn:
            n["on"] = tick_to_sec(ptm, pm.ticks_per_beat, n["tick"])
            n["off"] = tick_to_sec(ptm, pm.ticks_per_beat, n["end"])
            n["poff"] = tick_to_sec(ptm, pm.ticks_per_beat, n["pedal_end"])
        # where each score note should sound in this performance
        score = [dict(n) for n in sn]
        for n in score:
            n["pred"] = interp(n["sec"], sb, pb)
            n["beat_len"] = interp(n["sec"] + 1e-3, sb, pb) - interp(n["sec"], sb, pb)

        def tol(n):
            i = min(max(bisect.bisect_right(sb, n["sec"]) - 1, 0), len(pb) - 2)
            return max(0.12, 0.45 * (pb[i + 1] - pb[i]))

        pairs = match(score, pn, tol)
        # bars and places in the bar, from the score's own bar lines
        sdb = a["midi_score_downbeats"]
        sdb_ticks = [sec_to_tick(tm, sm.ticks_per_beat, s) for s in sdb]
        tpb = sm.ticks_per_beat
        name = key.replace("/", "__").replace(".mid", "")
        with open(os.path.join(args.out, name + ".txt"), "w") as f:
            f.write(f"P\t{r['composer']}\t{r['title']}\t{key}\n")
            for t, (label, bpb) in sorted(a["perf_time_signatures"].items(), key=lambda kv: float(kv[0])):
                num, den = label.split("/")
                f.write(f"T\t{float(t):.4f}\t{num}\t{den}\t{bpb}\n")
            for t, (_, fifths) in sorted(a["perf_key_signatures"].items(), key=lambda kv: float(kv[0])):
                f.write(f"K\t{float(t):.4f}\t{fifths}\n")
            types = a["performance_beats_type"]
            for t in pb:
                ty = types.get(str(t), "b")
                f.write(f"B\t{t:.4f}\t{'d' if ty == 'db' else ('r' if ty == 'bR' else 'b')}\n")
            for j, n in enumerate(pn):
                si = pairs.get(j)
                if si is None:
                    f.write(f"N\t{n['on']:.4f}\t{n['off']:.4f}\t{n['poff']:.4f}\t{n['pitch']}\t{n['vel']}\t-1\t-1\t0\t0\n")
                    continue
                s = score[si]
                bar = bisect.bisect_right(sdb_ticks, s["tick"] + 2) - 1
                bar_tick = sdb_ticks[bar] if bar >= 0 else 0
                pos = (s["tick"] - bar_tick) / tpb  # quarter notes from the bar line
                dur = (s["end"] - s["tick"]) / tpb
                staff = 0 if s["track"] == 0 else 1
                f.write(f"N\t{n['on']:.4f}\t{n['off']:.4f}\t{n['poff']:.4f}\t{n['pitch']}\t{n['vel']}\t{staff}\t{bar}\t{pos:.4f}\t{dur:.4f}\n")
        matched = len(pairs)
        index.append([name, r["composer"], r["title"], split[r["folder"]], len(pn), matched, len(score),
                      r["maestro_audio_performance"].replace("{maestro}/", ""), r["start"] or "0", r["end"] or ""])
        done += 1
        if done % 100 == 0:
            print(done, "performances")
        if args.limit and done >= args.limit:
            break
    with open(os.path.join(args.out, "index.tsv"), "w") as f:
        f.write("name\tcomposer\ttitle\tsplit\tnotes\tmatched\tscore_notes\tmaestro_audio\tstart\tend\n")
        for row in index:
            f.write("\t".join(str(x) for x in row) + "\n")
    tot = sum(r[4] for r in index)
    mat = sum(r[5] for r in index)
    by = {}
    for r in index:
        by.setdefault(r[3], [0, set()])
        by[r[3]][0] += 1
        by[r[3]][1].add((r[1], r[2]))
    print(f"{len(index)} performances, {tot} notes, {100 * mat / tot:.1f}% matched to the score")
    for k, (n, pieces) in sorted(by.items()):
        print(f"  {k}: {n} performances of {len(pieces)} pieces")


if __name__ == "__main__":
    main()
