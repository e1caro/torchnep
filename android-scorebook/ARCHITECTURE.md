# Scorebook — architecture proposal

Scorebook listens to a piano (microphone, or USB/Bluetooth MIDI) and writes sheet music. Everything runs on the
phone, offline. This document covers the architecture, the transcription model, and how note probabilities are
combined with a musical-context prior. The last section says what version 1 includes and what comes after.

## 1. Overview

```
 ┌──────────── app (Android, Kotlin + Jetpack Compose) ─────────────┐   ┌──────────── core (plain Kotlin, JVM) ────────────┐
 │                                                                  │   │                                                  │
 │  Mic ─ AudioRecord 44.1 kHz ─ resample 22.05 kHz ─┐              │   │  BasicPitchStream   windows → probability grid   │
 │                                                   ├─ AudioEngine ┼──►│  NoteDecoder        grid → note events, each     │
 │  Level / auto start-stop (AutoRecorder) ──────────┘              │   │                     with a probability for every │
 │                                                                  │   │                     candidate pitch              │
 │  LiteRT interpreter: basic_pitch.tflite (204 KB) ◄── windows ────┼───┤                                                  │
 │                                                                  │   │  Rhythm             tempo, beats, meter,         │
 │  USB / BLE MIDI (android.media.midi) ── note on/off ─────────────┼──►│                     quantization                 │
 │                                                                  │   │  KeyTracker         24-key HMM, key changes      │
 │  UI: live grand staff, take review (tap a note → alternatives),  │   │  ChordTracker       chord labels                 │
 │      Literal↔Musical slider, rhythm strictness, library          │   │  ContextModel       scale / chord / melody /     │
 │                                                                  │   │                     repetition priors            │
 │  PDF (PdfDocument) ◄── display list ◄────────────────────────────┼───┤  NoteCorrector      audio × context fusion       │
 │  Share: PDF, MIDI, MusicXML                                      │   │  PersonalModel      learns from corrections      │
 │  Storage: JSON + WAV per take in app files                       │   │  ScoreBuilder       hands, voices, measures      │
 │                                                                  │   │  Engraver           layout → display list        │
 └──────────────────────────────────────────────────────────────────┘   │  MusicXmlWriter, MidiWriter, SvgRenderer         │
                                                                        └──────────────────────────────────────────────────┘
```

The split is deliberate. Everything musical lives in `core`, a plain Kotlin library with no Android dependency.
It is tested on a laptop or in CI against the real model's output on rendered piano recordings
(`core/src/test/resources/fixtures`, produced by `tools/make_fixtures.py`). The `app` module is a thin shell:
audio in, model calls, MIDI in, the UI, files and the PDF canvas.

The engraver does not draw. It produces a **display list** (glyphs from the Bravura music font, lines, beams, ties,
text, tap targets). The same list is drawn on screen (Compose canvas), into a PDF page (`android.graphics.pdf`) and
into SVG (tests). Screen, PDF and tests therefore show the same layout.

## 2. Transcription model

### Choice for version 1: Basic Pitch (Spotify, Apache-2.0)

| | Basic Pitch | Onsets & Frames (Magenta) | High-resolution piano (Kong et al.) | hFT-Transformer (Sony) |
|---|---|---|---|---|
| Size | 204 KB TFLite, ~17 k parameters | ~100 MB (wav-input TFLite ~ 50 MB) | ~170 MB | ~ 30 M parameters |
| Speed | 42 ms per 2 s window on a server CPU core pair (one window every 1.65 s, so a few % of real time; a phone is a few times slower) | near real time on new phones | not real time | not real time |
| Piano accuracy (MAESTRO note F1) | lower (instrument-agnostic) | ~0.95 | ~0.97 | ~0.97 |
| Outputs | per-frame **onset** and **note** probabilities for all 88 keys, plus a 3-bins-per-semitone pitch contour | onset, frame, offset, velocity | onset, offset, frame, velocity, pedal | onset, offset, frame, velocity |
| License / availability | Apache-2.0, ships in the `basic-pitch` package | Apache-2.0 | MIT, checkpoint on Zenodo | MIT |

Version 1 ships **Basic Pitch**. It is tiny, runs comfortably in real time on any phone, needs no download, and
already gives what the correction layer needs: a sigmoid probability for every key at every frame (86 frames per
second), separately for "a note starts here" (onset) and "a note sounds here" (note). Its weakness on piano
(octave and harmonic ghosts, softer recall on detuned or reverberant pianos) is exactly what the decoder's
calibration and the context prior are designed around (§3, §4).

The model sits behind one interface (`core`'s `BasicPitchStream` + the app's `ModelRunner`): audio windows in,
onset and note probability frames out. The planned upgrade is a **piano-specific model distilled to phone size**:
a Kong-style CRNN (or hFT-Transformer) trained on MAESTRO v3 and MAPS, distilled to ~2–5 M parameters, int8
quantized, with the same two outputs plus velocity and sustain pedal. Swapping it changes no other code.

### Streaming

Audio is captured at 44.1 kHz (the one rate every Android device supports), low-pass filtered and decimated to
22.05 kHz. The model takes 43 844-sample windows (≈ 2 s, 172 frames). Windows advance by 142 frames
(36 352 samples), and the 15 frames at each edge of a window are discarded, so every kept frame comes from the
middle of some window and global frame *j* is exactly at *j* × 256 / 22050 s. The stream starts with 15 frames of
silence so frame 0 is time 0. Live latency is about two seconds; the MIDI path has none.

## 3. From probabilities to note events

`NoteDecoder` turns the probability grid into **note events**. Each event keeps its evidence instead of a single
answer.

1. **Candidates.** Every local maximum of the onset probability above a low threshold (0.25) is a candidate.
   Its end is where the note probability stays below 0.25 for 8 frames, or where the next accepted onset of the
   same key starts (a re-struck note).
2. **Calibrated audio probability.** The raw sigmoid outputs are not probabilities of "the pianist played this key".
   A logistic calibration maps features of the candidate to that probability:

   ```
   q = σ( 1.87·logit(onset peak) + 1.50·logit(mean note prob, first 170 ms) + 0.59·logit(max note prob)
          − 0.06·ln(1 + frames) − 6.48·(note prob just before the onset)
          − 3.35·(note prob an octave / twelfth / two octaves below) + 1.80·(onset prob there)
          + 3.35·(best onset prob one key up or down) + 1.41·(their note prob) − 0.45 + register bias )
   ```

   The coefficients were fitted by logistic regression on the fixture recordings, in tune and out of tune;
   leave-one-piece-out precision is 0.86–0.92 at recall 0.87–0.99 on the in-tune pieces, before any musical
   context. The "just before" term separates real re-strikes from flickers inside a held note; the harmonic terms
   separate overtones from real octaves; the neighbour terms recover out-of-tune notes whose energy is split
   between two keys. The register bias is learned per user (§6).
3. **Alternatives.** For every event the decoder also scores its neighbours: one semitone down and up
   (F vs F#), and an octave down and up (the classic harmonic error, weighted down), with the same calibration
   evaluated on those keys around the same instant. When two neighbouring keys both fire at the same instant and are
   not both clearly present, they are merged into one event with two strong alternatives; a neighbour that is clearly
   a note of its own is not offered as an alternative. The result for each event:

   ```
   NoteEvent(onset, offset, velocity,
             presence  = P(a key was played here | audio),
             options   = [ (pitch, P(this pitch | audio)), … ])   // probabilities sum to 1
   ```

   The MIDI path creates the same events with presence 1 and a single option with probability 1: MIDI is never
   "corrected".

## 4. Combining audio evidence with the musical context

### 4.1 The score

For an event with candidate pitches *c* the corrector computes, in log space,

```
score(c) = log P_audio(c)  +  λ · g · Σᵢ wᵢ · log Pᵢ(c)          i ∈ {key, chord, melody, repetition}
P(c)     = softmax over the candidates of score(c)
```

* `P_audio(c)` — the decoder's alternative probabilities (§3), sharpened or flattened by a learned temperature.
* `Pᵢ(c)` — four context distributions over the same candidates (§4.2), each normalized.
* `wᵢ` — weights, initially key 1.0, chord 0.8, melody 0.5, repetition 1.2; learned per user (§6).
* `λ` — the **Literal ↔ Musical** slider, 0 … 1. At 0 the context term vanishes: pure audio.
* `g` — the **ambiguity gate**, the rule "clear audio always wins":

  ```
  m = log(P_audio(top) / P_audio(second))          audio margin between the two best pitches
  M = log 3 + λ · (log 12 − log 3)                 "clear" threshold: 75/25 when literal, 92/8 when musical
  g = max(0, 1 − m / M)
  ```

  A note heard clearly (margin above `M`) gets `g = 0`: the context cannot change it, whatever the key.
  A clearly played chromatic passing note, blue note or modulation therefore stays as played. Context only
  speaks when the audio is torn between candidates, and it speaks louder the more torn the audio is.
  The context term is also capped (±3 nats per event) so no prior can overwhelm moderate audio evidence.

**Presence** (is there a note at all?) uses the same idea: `logit P = logit(presence) + λ · g_p · C`, with
`g_p = max(0, 1 − |logit(presence)| / logit(0.85))` and `C` a bounded bonus (±1) when the best pitch fits key and
chord. A candidate that sits an octave, a twelfth or two octaves above a louder note struck at the same time gets
no bonus: it is most likely that note's harmonic, and context must not rescue it.

A note is marked **AI-decided** and drawn lighter when the context had a real say (λ·g ≥ 0.15 for the pitch or
the presence) or changed the answer. With the slider at Literal, notes whose audio is torn (worse than 75/25, or
presence between 30 and 70 %) are drawn lighter too, as *unclear*.
Tapping it shows each alternative with its final probability, its audio-only probability, and the reasons
("in D minor", "chord tone of A7", "same as bar 3"); one tap switches it.

### 4.2 The context distributions

* **Key / scale.** `P_key(pc) = Σₖ P(key = k | t) · profile_k(pc)` with the Temperley (Kostka–Payne) major/minor
  profiles. `P(key | t)` is the **posterior of the key tracker at that moment**, not one key for the whole piece.
* **Harmony.** The chord around the note (§4.4): chord tones share 60 % of the mass, the other pitch classes 40 %
  (weighted by the scale), so passing and neighbour tones stay possible.
* **Melody.** For the top note of the right hand and the bottom note of the left hand, the interval from the
  previous note and to the next clear note of the same line: `P(i) ∝ exp(−|i| / 3.5)` with bonuses for repeated
  notes, steps, thirds, fourths, fifths and octaves, and penalties for tritones, sevenths and leaps over an octave.
* **Repetition.** The clear notes within four beats around the event (pitches and beat positions, same hand) are
  compared with every earlier passage. If an earlier passage repeats them (≥ 75 % of the context, at least 4
  notes, same pitches), the note heard clearly *there* at the aligned position gets 80 % of the mass.
  (Transposed sequences are a later addition.)

### 4.3 Key tracking that follows modulations

`KeyTracker` is a hidden Markov model over the 24 major and minor keys. Time steps are beats (the beat tracker
runs first, on the audio-only notes). Each step's emission is the pitch-class content of the notes sounding in it, weighted
by **audio confidence squared**, so ambiguous notes barely vote: the key is decided by what was heard clearly,
which avoids the circle "context corrects the note, the corrected note confirms the context".
Transitions keep the key with probability 0.97 per beat and otherwise move to nearby keys on the circle of
fifths (relative and parallel keys close, distant keys unlikely). When the evidence for a change is thin, the
posterior splits between the two keys, which makes the scale prior neutral between them instead of pulling
notes back to the old key.

* Live, the **forward filter** gives the current key estimate.
* At the end of a take, **forward–backward** gives `P(key | t)` for the corrector and **Viterbi** gives key
  regions (shorter than two bars are merged) for key signatures.

A real modulation is played with clear notes (the new leading tone, the new accidentals), so the posterior
moves to the new key within a few beats, and from there on the scale prior favours the new key's notes. It is
not corrected back. The corrector runs twice: once with the key and chords from clear notes only, then again after
re-estimating them with the corrected notes.

### 4.4 Chords

`ChordTracker` scores 12 roots × 11 qualities (major, minor, diminished, augmented, 7, maj7, m7, m7♭5, dim7,
sus2, sus4) per beat against the weighted pitch classes, with a bonus when the bass note is the root, a prior for
chords that belong to the current key, and a Viterbi pass that prefers changes on strong beats. The labels
(C, G7, Am, F#m7♭5 …) are spelled in the current key and printed above the staff where the chord changes.

## 5. Rhythm

The same principle is used for time: the observed timing is the evidence, the meter is the prior.

* **Tempo.** Onset strength from the decoded notes (velocity and chord size), autocorrelation over 40–220 BPM,
  with a log-normal prior centred on 100 BPM.
* **Beats.** Dynamic-programming beat tracking (Ellis 2007), so rubato and gradual tempo changes are followed.
* **Meter.** 2/4, 3/4, 4/4 (and 6/8 when beats are mostly divided in three), chosen from the accent pattern on
  candidate downbeats — the lowest notes, long notes and loud notes; the number of notes counts only a little,
  so a waltz's "pah-pah" chords do not outvote its "oom" bass — with a prior for 4/4.
* **Quantization.** Each beat chooses its subdivision (1, 2, 3, 4, 6 or 8) by minimizing timing error plus a
  complexity cost. The **strictness** setting scales that cost: strict prefers eighths and simple rhythms, loose
  keeps sixteenths, triplets and thirty-seconds.
* **Durations.** Offsets of piano notes are unreliable (pedal, decay; the model's note activity for high notes
  fades after ~150 ms), so in the score a note lasts until the next note of the same hand (one voice per staff in
  version 1). Only when the next note is more than a bar away does the note keep its own length, chosen among
  notatable values by `log-likelihood(observed / value) + log P(value | meter)`, followed by rests. Ties across
  beats and bar lines are added where needed.
* **Hands.** A dynamic assignment per onset group keeps each hand's span under a tenth and follows each hand's
  moving centre, so the split point moves with the music instead of being fixed at middle C.

## 6. Learning from corrections

`PersonalModel` (JSON on the phone) adapts the fusion to one piano, one room and one player:

* Every switch is a labelled example: the features of all alternatives (audio log-probability, the four context
  log-probabilities, gate) and the one the player chose. One step of gradient descent on the soft-max
  cross-entropy updates the four context weights and the audio temperature, clamped to safe ranges.
* Per-key biases learn systematic confusions (this piano's F#3 is heard as F3) and per-register presence biases
  learn ghost notes (deleted notes) — a calibration layer on top of the network, not a fine-tuning of it, so it is
  cheap, stable and reversible ("Reset what Scorebook learned" in Settings).

## 7. Data

```
Library ─ Album* ─ Song* ─ Take*                       library.json
Take: id, date, duration, source (mic | midi), audio (take-<id>.wav, 22.05 kHz mono 16-bit),
      events (with all alternatives), user overrides, slider values,
      analysis cache: key regions, tempo, meter, chords, title
```

A take stores the decoder's events, not just the final notes, so moving a slider or switching a note re-runs the
analysis from the stored evidence instantly, and a better model later can re-transcribe the saved audio.

## 8. Engraving and exports

* `ScoreBuilder`: quantized notes → measures → two staves (treble, bass) → chords, rests, ties, triplets, key
  signature changes (with a double barline), pitch spelling from the local key (line-of-fifths spelling: sharps in
  sharp keys, raised leading tones in minor, direction-aware chromatic notes).
* `Engraver`: horizontal spacing proportional to log-duration, columns shared by both hands, greedy line breaking
  with justification, stems, beams per beat, flags, accidentals with per-bar memory, ledger lines, dots, ties across
  barlines and systems, brace, clefs, key and time signatures, chord symbols, measure numbers, title block.
  Bravura (SIL Open Font License) supplies the music glyphs.
* PDF: one display list per A4 page drawn on `PdfDocument`. MusicXML 4.0 (partwise, two staves, harmony elements,
  ties, tuplets, key changes). MIDI: type-1 file with the performance timing placed on the detected beat grid
  (one tempo event per beat), so it keeps the expression and still lines up with bars in a DAW.

## 9. Scope of version 1 and what comes next

**Version 1 (this branch):**

* Live listening through the microphone with automatic start and stop after 5 s of silence (1.5 s pre-roll so
  the first note is kept); MIDI input from USB devices and already-connected Bluetooth MIDI devices.
* On-device transcription (Basic Pitch via LiteRT), probability-preserving decoding.
* Key and mode detection with key changes; tempo, meter, quantization with adjustable strictness; chord labels;
  hand split.
* Intelligent note correction exactly as in §4, with AI-decided notes drawn lighter, tap for alternatives with
  probabilities, one-tap switch, the Literal ↔ Musical slider, and learning from corrections.
* Live grand staff while playing; engraved score for each take; PDF, MIDI and MusicXML export (share sheet).
* A simple library (songs and takes with auto-filled date, duration, key, tempo, and auto titles like
  "Idea in D minor, 14 Nov"), one-tap transpose, dark stage theme, large score, screen kept on while listening.

**Next:**

1. *Album:* albums, tags, favourites, search and filters by key and tempo; multiple takes per song; playback with
   a piano sound (sample-based synth) while the score scrolls; trash bin with 30-day recovery.
2. *Hands-free commands:* motif recording (3–5 notes), matching on the MIDI or decoded note stream only after
   ≥ 2 s of silence, register suggestions at the extremes of the keyboard, confirmation sound + full-screen
   flash, undo. Commands: discard, save and start new song, redo last section, favourite, bookmark, metronome,
   undo.
3. *Extras:* idea-catcher mode (foreground service, always listening, short sketches), practice statistics
   (minutes, keys, streaks), side-by-side take comparison (aligned by beats).
4. *Model:* the distilled piano-specific model (§2), tuning estimation from the pitch contour output (detuned
   pianos), sustain-pedal detection for better durations, two voices per staff.
