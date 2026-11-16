#!/usr/bin/env python3
"""
Trains Scorebook's rhythm network: a small recurrent network that reads the notes of a piano performance in order
and says, for every note, what a musician reading the score would know:

  - is it on a beat, is it on a bar line, and how long the beat is around it (the tempo and its level);
  - how many beats the bar has, and whether beats divide in three (6/8) or in two;
  - the key signature;
  - which hand plays it;
  - where inside the beat it is written, and how long it is written.

It learns from the tuning part of the ASAP dataset as prepared by asap_prepare.py (real performances aligned with
their scores; nothing of the dataset is in this repository) and writes the weights in a small binary file that
core/analysis/RhythmNet.kt reads. The inputs are made noisy on purpose (missed and extra notes, shifted onsets,
unreliable lengths, any tempo, any key) so that it also works on notes heard by the microphone.

usage: train_rhythm_net.py --data /path/to/prepared --out rhythm_net.bin [--epochs 24] [--hidden 128]
"""
import argparse
import bisect
import math
import os
import random
import struct
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# ---- what the network sees and says: keep in step with RhythmNet.kt ----------------------------------------------
EMBED = 24
N_FEAT = 5
PERIOD_BINS = 56
PERIOD_LO, PERIOD_HI = math.log2(0.15), math.log2(3.2)
BPB_CLASSES = [2, 3, 4, 5]  # beats in a bar (1 counts as 2, more than 5 as 4)
POS_CLASSES = 24  # 24ths of a beat
DUR_VALUES = [1 / 8, 1 / 6, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 2 / 3, 3 / 4, 1, 1.5, 2, 3, 4, 6, 8]  # beats


def features(on, dur, vel):
    """[n, 5] continuous inputs for notes sorted by onset."""
    n = len(on)
    prev = np.zeros(n)
    prev[1:] = on[1:] - on[:-1]
    nxt = np.zeros(n)
    nxt[:-1] = on[1:] - on[:-1]
    f = np.zeros((n, N_FEAT), dtype=np.float32)
    f[:, 0] = np.log1p(np.minimum(prev, 4.0) * 8) / math.log1p(32)
    f[:, 1] = np.log1p(np.minimum(nxt, 4.0) * 8) / math.log1p(32)
    f[:, 2] = np.log1p(np.clip(dur, 0.0, 4.0) * 4) / math.log1p(16)
    f[:, 3] = vel / 127.0
    f[:, 4] = (prev < 0.03).astype(np.float32)
    f[0, 4] = 0
    return f


class RhythmNet(nn.Module):
    def __init__(self, hidden=128, layers=2, dropout=0.2):
        super().__init__()
        self.embed = nn.Embedding(88, EMBED)
        self.gru = nn.GRU(EMBED + N_FEAT, hidden, layers, bidirectional=True, batch_first=True, dropout=dropout)
        h = 2 * hidden
        self.beat = nn.Linear(h, 2)  # beat, bar line
        self.period = nn.Linear(h, PERIOD_BINS)
        self.meter = nn.Linear(h, len(BPB_CLASSES) + 1)  # beats per bar, then "divides in three"
        self.key = nn.Linear(h, 12)
        self.hand = nn.Linear(h, 1)
        self.pos = nn.Linear(h, POS_CLASSES)
        self.dur = nn.Linear(h, len(DUR_VALUES))

    def forward(self, pitch, feat):
        x = torch.cat([self.embed(pitch), feat], dim=-1)
        y, _ = self.gru(x)
        return {k: getattr(self, k)(y) for k in ("beat", "period", "meter", "key", "hand", "pos", "dur")}


# ---- data ---------------------------------------------------------------------------------------------------------
class Perf:
    pass


def load(data_dir, splits):
    perfs = []
    rows = [l.rstrip("\n").split("\t") for l in open(os.path.join(data_dir, "index.tsv"))][1:]
    for r in rows:
        if r[3] not in splits:
            continue
        notes, beats, btype, ts, ks = [], [], [], [], []
        for line in open(os.path.join(data_dir, r[0] + ".txt")):
            f = line.rstrip("\n").split("\t")
            if f[0] == "N":
                notes.append([float(x) for x in f[1:]])
            elif f[0] == "B":
                beats.append(float(f[1]))
                btype.append(f[2])
            elif f[0] == "T":
                ts.append((float(f[1]), int(f[2]), int(f[3]), int(f[4])))
            elif f[0] == "K":
                ks.append((float(f[1]), int(f[2])))
        if len(notes) < 30 or len(beats) < 8 or not ts or not ks:
            continue
        p = Perf()
        p.name, p.piece, p.split = r[0], r[1] + "/" + r[2], r[3]
        a = np.array(notes)
        order = np.lexsort((a[:, 3], a[:, 0]))
        a = a[order]
        p.on, p.off, p.poff, p.pitch, p.vel = a[:, 0], a[:, 1], a[:, 2], a[:, 3].astype(int), a[:, 4]
        p.staff, p.bar, p.pos, p.sdur = a[:, 5].astype(int), a[:, 6].astype(int), a[:, 7], a[:, 8]
        p.beats = np.array(beats)
        p.down = np.array([b for b, t in zip(beats, btype) if t == "d"])
        p.rub = np.array([b for b, t in zip(beats, btype) if t == "r"])
        p.ts, p.ks = ts, ks
        targets(p)
        perfs.append(p)
    return perfs


def targets(p):
    """What the score says about each note."""
    n = len(p.on)
    beats = p.beats
    i = np.clip(np.searchsorted(beats, p.on, side="right") - 1, 0, len(beats) - 2)
    ibi = beats[i + 1] - beats[i]
    p.ibi = ibi
    near = np.minimum(np.abs(p.on - beats[i]), np.abs(p.on - beats[i + 1]))
    tol = np.minimum(0.05, 0.2 * ibi)
    p.t_beat = (near <= tol).astype(np.float32)
    if len(p.down) >= 2:
        j = np.clip(np.searchsorted(p.down, p.on, side="right") - 1, 0, len(p.down) - 2)
        nd = np.minimum(np.abs(p.on - p.down[j]), np.abs(p.on - p.down[j + 1]))
    else:
        nd = np.full(n, 9.0)
    p.t_down = (nd <= tol).astype(np.float32)
    # places where the annotators could not say where the beat is, and anything outside the annotated span
    p.m_beat = ((p.on >= beats[0] - 0.05) & (p.on <= beats[-1] + 0.05)).astype(np.float32)
    if len(p.rub):
        k = np.clip(np.searchsorted(p.rub, p.on), 0, len(p.rub) - 1)
        k0 = np.clip(k - 1, 0, len(p.rub) - 1)
        p.m_beat *= (np.minimum(np.abs(p.on - p.rub[k]), np.abs(p.on - p.rub[k0])) > 1.5 * ibi).astype(np.float32)
    # time signature and key signature in force
    tt = [t[0] for t in p.ts]
    ti = np.clip(np.searchsorted(tt, p.on + 1e-6, side="right") - 1, 0, len(tt) - 1)
    bpb = np.array([t[3] for t in p.ts])[ti]
    num = np.array([t[1] for t in p.ts])[ti]
    den = np.array([t[2] for t in p.ts])[ti]
    quarters = num * 4.0 / den
    p.t_bpb = np.array([BPB_CLASSES.index(2 if b == 1 else (b if b in BPB_CLASSES else 4)) for b in bpb])
    p.t_comp = ((num % 3 == 0) & (num > 3) & (bpb * 3 == num)).astype(np.float32)
    kt = [k[0] for k in p.ks]
    ki = np.clip(np.searchsorted(kt, p.on + 1e-6, side="right") - 1, 0, len(kt) - 1)
    p.fifths = np.array([k[1] for k in p.ks])[ki]
    # written place in the beat and written length, in beats
    bq = quarters / bpb
    x = (p.pos / bq) % 1.0
    k24 = np.rint(x * POS_CLASSES)
    p.m_score = ((p.staff >= 0) & (np.abs(x * POS_CLASSES - k24) < 0.15)).astype(np.float32)
    p.t_pos = (k24.astype(int) % POS_CLASSES)
    db = np.maximum(p.sdur / bq, 1e-3)
    p.t_dur = np.argmin(np.abs(np.log(db[:, None] / np.array(DUR_VALUES)[None, :])), axis=1)
    p.t_hand = (p.staff == 1).astype(np.float32)  # 1 = left
    p.m_hand = (p.staff >= 0).astype(np.float32)


def sample(p, length, rng, augment):
    """A window of a performance as arrays, played a little differently every time."""
    n = len(p.on)
    a = rng.randrange(0, max(1, n - length + 1))
    idx = np.arange(a, min(n, a + length))
    on = p.on[idx].copy()
    key_dur = p.off[idx] - p.on[idx]
    ped_dur = p.poff[idx] - p.on[idx]
    vel = p.vel[idx].copy()
    pitch = p.pitch[idx].copy()
    shift = 0
    stretch = 1.0
    keep = np.ones(len(idx), dtype=bool)
    dur = key_dur
    if augment:
        stretch = math.exp(rng.uniform(math.log(0.75), math.log(1.33)))
        shift = rng.randint(-5, 6)
        mode = rng.random()
        if mode < 0.35:  # as from a MIDI keyboard
            dur = key_dur
        else:  # as heard: lengths somewhere between the key and the pedal, cut by the decay of the string
            mix = np.random.uniform(0.0, 1.0, len(idx))
            dur = np.minimum(key_dur + mix * (ped_dur - key_dur), np.random.uniform(0.6, 3.0, len(idx)))
            on = on + np.random.normal(0, rng.uniform(0.004, 0.018), len(idx))
            keep = np.random.uniform(size=len(idx)) > rng.uniform(0.0, 0.07)  # missed notes
            vel = np.clip(vel * rng.uniform(0.7, 1.2) + np.random.normal(0, 6, len(idx)), 1, 127)
        on = on * stretch
        dur = np.maximum(dur * stretch, 0.03)
    if shift:
        ok = (pitch + shift >= 21) & (pitch + shift <= 108)
        if ok.all():
            pitch = pitch + shift
        else:
            shift = 0
    sel = idx[keep]
    on, dur, vel, pitch = on[keep], dur[keep], vel[keep], pitch[keep]
    order = np.lexsort((pitch, on))
    sel, on, dur, vel, pitch = sel[order], on[order], dur[order], vel[order], pitch[order]
    period = np.clip((np.log2(p.ibi[sel] * stretch) - PERIOD_LO) / (PERIOD_HI - PERIOD_LO) * PERIOD_BINS, 0, PERIOD_BINS - 1).astype(int)
    key = (p.fifths[sel] * 7 + shift) % 12
    return dict(
        pitch=np.clip(pitch - 21, 0, 87), feat=features(on, dur, vel),
        beat=p.t_beat[sel], down=p.t_down[sel], m_beat=p.m_beat[sel], period=period, bpb=p.t_bpb[sel], comp=p.t_comp[sel],
        key=key, hand=p.t_hand[sel], m_hand=p.m_hand[sel], pos=p.t_pos[sel], dur=p.t_dur[sel], m_score=p.m_score[sel],
    )


def batch(items):
    n = max(len(it["pitch"]) for it in items)
    out = {}
    for k in items[0]:
        arr = np.zeros((len(items), n) + items[0][k].shape[1:], dtype=items[0][k].dtype)
        for i, it in enumerate(items):
            arr[i, : len(it[k])] = it[k]
        out[k] = torch.from_numpy(arr)
    mask = np.zeros((len(items), n), dtype=np.float32)
    for i, it in enumerate(items):
        mask[i, : len(it["pitch"])] = 1
    out["mask"] = torch.from_numpy(mask)
    return out


def losses(out, b):
    m = b["mask"]
    mb = m * b["m_beat"]
    ms = m * b["m_score"]
    mh = m * b["m_hand"]

    def mean(x, w):
        return (x * w).sum() / w.sum().clamp(min=1)

    def ce(logits, target, w):
        return mean(F.cross_entropy(logits.transpose(1, 2), target.long(), reduction="none"), w)

    l = {}
    l["beat"] = mean(F.binary_cross_entropy_with_logits(out["beat"][..., 0], b["beat"], reduction="none"), mb)
    l["down"] = mean(F.binary_cross_entropy_with_logits(out["beat"][..., 1], b["down"], reduction="none"), mb)
    l["period"] = ce(out["period"], b["period"], mb)
    l["bpb"] = ce(out["meter"][..., : len(BPB_CLASSES)], b["bpb"], m)
    l["comp"] = mean(F.binary_cross_entropy_with_logits(out["meter"][..., len(BPB_CLASSES)], b["comp"], reduction="none"), m)
    l["key"] = ce(out["key"], b["key"], m)
    l["hand"] = mean(F.binary_cross_entropy_with_logits(out["hand"][..., 0], b["hand"], reduction="none"), mh)
    l["pos"] = ce(out["pos"], b["pos"], ms)
    l["dur"] = ce(out["dur"], b["dur"], ms)
    total = l["beat"] + l["down"] + l["period"] + 0.4 * l["bpb"] + 0.4 * l["comp"] + 0.4 * l["key"] + 0.7 * l["hand"] + 0.7 * l["pos"] + 0.5 * l["dur"]
    return total, l


@torch.no_grad()
def evaluate(model, perfs, rng):
    """Per-note accuracies on whole performances (no augmentation)."""
    model.eval()
    agg = {k: [0.0, 0.0] for k in ("beat_f", "down_f", "period", "bpb", "comp", "key", "hand", "pos", "dur")}
    tp = fp = fn = dtp = dfp = dfn = 0
    for p in perfs:
        it = sample(p, 10 ** 9, rng, False)
        b = batch([it])
        out = model(b["pitch"].long(), b["feat"])
        mb = b["m_beat"][0] > 0
        pb = torch.sigmoid(out["beat"][0, :, 0]) > 0.5
        pd = torch.sigmoid(out["beat"][0, :, 1]) > 0.5
        tb, td = b["beat"][0] > 0.5, b["down"][0] > 0.5
        tp += (pb & tb & mb).sum().item(); fp += (pb & ~tb & mb).sum().item(); fn += (~pb & tb & mb).sum().item()
        dtp += (pd & td & mb).sum().item(); dfp += (pd & ~td & mb).sum().item(); dfn += (~pd & td & mb).sum().item()

        def acc(name, pred, target, w):
            agg[name][0] += ((pred == target).float() * w).sum().item()
            agg[name][1] += w.sum().item()

        one = torch.ones_like(b["mask"][0])
        acc("period", (out["period"][0].argmax(-1) - b["period"][0]).abs() <= 3, torch.ones_like(tb), b["m_beat"][0])
        acc("bpb", out["meter"][0, :, : len(BPB_CLASSES)].argmax(-1), b["bpb"][0], one)
        acc("comp", (out["meter"][0, :, len(BPB_CLASSES)] > 0).float(), b["comp"][0], one)
        acc("key", out["key"][0].argmax(-1), b["key"][0], one)
        acc("hand", (out["hand"][0, :, 0] > 0).float(), b["hand"][0], b["m_hand"][0])
        acc("pos", out["pos"][0].argmax(-1), b["pos"][0], b["m_score"][0])
        acc("dur", out["dur"][0].argmax(-1), b["dur"][0], b["m_score"][0])
    res = {k: v[0] / max(v[1], 1) for k, v in agg.items() if v[1] > 0}
    res["beat_f"] = 2 * tp / max(2 * tp + fp + fn, 1)
    res["down_f"] = 2 * dtp / max(2 * dtp + dfp + dfn, 1)
    model.train()
    return res


def export(model, path):
    """Weights as: 'SBRN', version, count, then per tensor: name, shape, float32 data (little endian)."""
    sd = {k: v.detach().cpu().numpy().astype("<f4") for k, v in model.state_dict().items()}
    with open(path, "wb") as f:
        f.write(b"SBRN")
        f.write(struct.pack("<ii", 1, len(sd)))
        for name, arr in sd.items():
            nb = name.encode()
            f.write(struct.pack("<i", len(nb)))
            f.write(nb)
            f.write(struct.pack("<i", arr.ndim))
            for d in arr.shape:
                f.write(struct.pack("<i", d))
            f.write(arr.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--epochs", type=int, default=24)
    ap.add_argument("--hidden", type=int, default=128)
    ap.add_argument("--layers", type=int, default=2)
    ap.add_argument("--length", type=int, default=384)
    ap.add_argument("--batch", type=int, default=24)
    ap.add_argument("--lr", type=float, default=2e-3)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--resume")
    args = ap.parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    rng = random.Random(args.seed)
    t0 = time.time()
    train = load(args.data, {"tune"})
    dev = load(args.data, {"dev"})
    print(f"{len(train)} performances to learn from ({sum(len(p.on) for p in train)} notes), {len(dev)} to check on; loaded in {time.time() - t0:.0f} s", flush=True)
    model = RhythmNet(args.hidden, args.layers)
    if args.resume:
        model.load_state_dict(torch.load(args.resume))
    print(sum(p.numel() for p in model.parameters()), "parameters", flush=True)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    # every piece counts the same, however many times it was recorded
    by_piece = {}
    for p in train:
        by_piece.setdefault(p.piece, []).append(p)
    pieces = list(by_piece.values())
    steps_per_epoch = sum(len(p.on) for p in train) // (args.length * args.batch) // 2
    total = args.epochs * steps_per_epoch
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=args.lr, total_steps=total, pct_start=0.08)
    step = 0
    best = -1.0
    for epoch in range(args.epochs):
        run = {}
        for _ in range(steps_per_epoch):
            items = []
            for _ in range(args.batch):
                # half of the windows by piece (variety), half by performance length (coverage)
                p = rng.choice(rng.choice(pieces)) if rng.random() < 0.5 else rng.choices(train, weights=[len(q.on) for q in train])[0]
                items.append(sample(p, args.length, rng, True))
            b = batch(items)
            out = model(b["pitch"].long(), b["feat"])
            loss, parts = losses(out, b)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            step += 1
            for k, v in parts.items():
                run[k] = run.get(k, 0.0) + v.item() / steps_per_epoch
        res = evaluate(model, dev, rng)
        score = res["beat_f"] + res["down_f"] + res["pos"] + res["hand"]
        print(f"epoch {epoch + 1}/{args.epochs} {time.time() - t0:.0f}s loss " + " ".join(f"{k} {v:.3f}" for k, v in run.items())
              + " | dev " + " ".join(f"{k} {100 * v:.1f}" for k, v in res.items()), flush=True)
        if score > best:
            best = score
            export(model, args.out)
            torch.save(model.state_dict(), args.out + ".pt")
    print("best dev score", best, flush=True)


if __name__ == "__main__":
    main()
