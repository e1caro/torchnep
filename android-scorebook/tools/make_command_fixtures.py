"""Render the default piano-command motifs (and a piece that contains their notes) and save the model's output.

core's CommandsTest decodes these with the app's decoder and checks that each motif is recognized as its
command, and that the same notes inside music are not. Same requirements as make_fixtures.py.

  cd tools && python make_command_fixtures.py --of-model ../app/src/main/assets/onsets_frames.tflite --out ../core/src/test/resources/commands
"""
import argparse
import json
import os
import tempfile

import numpy as np

from make_fixtures import OF_HOP, OF_SR, SR, render, run_onsets_frames, save_planes, write_midi

# The defaults (core: CommandConfig.DEFAULTS). Chosen from what the model hears reliably: the top C7-E7 and
# the low A1-G2. The very bottom (A0-C1) comes out an octave or a twelfth too high and G7 / C8 are often
# missed, so they are avoided.
MOTIFS = {
    "START": [100, 96, 100],
    "STOP": [96, 100, 96],
    "RESTART": [33, 36, 40],
    "FAVORITE": [36, 40, 43],
    "DISCARD": [36, 35, 36],
    "UNDO": [43, 40, 36],
}
# alternatives tried for the low register and the favourite figure
CANDIDATES = {
    "low_c2_b1_c2": [36, 35, 36],
    "low_c2_e2_g2": [36, 40, 43],
    "low_g2_e2_c2": [43, 40, 36],
    "low_a1_c2_e2": [33, 36, 40],
    "high_g6_c7_e7_g7": [91, 96, 100, 103],
    "high_c7_g7_c7_g7": [96, 103, 96, 103],
    "high_e7_c7_e7": [100, 96, 100],
}


def notes_for(pitches, start, gap=0.33, vel=96):
    return [dict(pitch=p, on=round(start + i * gap, 4), off=round(start + i * gap + 0.3, 4), vel=vel, hand="R", cents=0.0)
            for i, p in enumerate(pitches)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--of-model", required=True, help="Onsets and Frames TFLite model (tools/fetch_model.sh)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--sf2", default="/usr/share/sounds/sf2/FluidR3_GM.sf2")
    ap.add_argument("--candidates", action="store_true", help="render the alternative motifs instead")
    ap.add_argument("--wav-out", help="also save the rendered audio of the start motif (for the on-device test)")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    cases = {f"motif_{k.lower()}": (notes_for(v, 2.5), k) for k, v in MOTIFS.items()}
    if args.candidates:
        cases = {f"cand_{k}": (notes_for(v, 2.5), k) for k, v in CANDIDATES.items()}
    # the start motif's notes (E7 C7 E7) inside a run of music, no silence before them: must not trigger
    run = [84, 86, 88, 91, 93, 96, 100, 96, 100, 98, 96, 93, 91, 88, 86, 84]  # E7 C7 E7 inside the run
    if not args.candidates:
        cases["music_with_motif_notes"] = (notes_for(run, 0.5, gap=0.25, vel=80) + notes_for([48, 55, 60], 0.5, gap=1.0, vel=60), None)
    for name, (notes, expect) in cases.items():
        notes = sorted(notes, key=lambda n: n["on"])
        with tempfile.TemporaryDirectory() as tmp:
            mid, wav = os.path.join(tmp, "p.mid"), os.path.join(tmp, "p.wav")
            write_midi(notes, mid)
            audio = render(mid, wav, args.sf2)
        audio = np.concatenate([audio, np.zeros(int(1.5 * SR), np.float32)])
        onset, note, vel = run_onsets_frames(args.of_model, audio)
        if args.wav_out and name == "motif_start":
            import soundfile as sf
            os.makedirs(args.wav_out, exist_ok=True)
            sf.write(os.path.join(args.wav_out, name + ".wav"), audio, SR, subtype="PCM_16")
        save_planes(os.path.join(args.out, name + ".probs.gz"), onset, note, vel)
        with open(os.path.join(args.out, name + ".json"), "w") as f:
            json.dump(dict(name=name, frames=int(onset.shape[0]), fps=OF_SR / OF_HOP, expect=expect, notes=notes), f, indent=1)
        peaks = {n["pitch"]: round(float(onset[:, n["pitch"] - 21].max()), 2) for n in notes}
        print(name, expect, "max onset per motif note:", peaks)


if __name__ == "__main__":
    main()
