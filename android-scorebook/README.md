# Scorebook for Android

Play the piano, get sheet music. Scorebook listens through the phone's microphone (or a USB / Bluetooth MIDI
keyboard), transcribes both hands, finds the key, tempo, meter and chords, fixes unclear notes using the musical
context, and writes an engraved score you can save as PDF, MIDI or MusicXML. Everything runs on the phone, offline.

The design — architecture, transcription model, and how note probabilities are combined with the musical
context — is in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## What version 1 does

- **You decide when it records.** Tap the red button to start a take and tap it again to stop and save; the
  microphone is off the rest of the time. Optional *hands-free* mode (Settings): a take starts when you start
  playing (keeping 1.5 s from before, so the first note is not lost) and ends after 5 s of silence (adjustable).
- **Piano commands.** Control Scorebook without touching the phone (Settings → Piano commands): after a 2-second
  pause, play a short note pattern on its own. Defaults: *Start recording* E7 C7 E7, *Stop and save* C7 E7 C7,
  *Start over* A1 C2 E2, *Favourite* C2 E2 G2, *Discard* C2 B1 C2 (the take being recorded, or the last saved one,
  which goes to the trash), *Undo* G2 E2 C2. Change any of them by playing new notes. Each command answers with
  its own short sound and a big flash; the command's notes are cut out of the score. Works with MIDI keyboards
  too. While it is on, the microphone listens between takes, but nothing is saved until a take starts.
- **Live grand staff.** Notes appear on a treble + bass staff as they are heard, spelled in the current key, with
  the detected key shown; lighter notes are the ones the AI had to decide.
- **On-device transcription, made for piano.** Onsets and Frames (Google Magenta, Apache-2.0, trained only on
  piano) on LiteRT, fully offline. It hears chords: on real piano recordings it finds 93 % of the notes that are
  struck together with others (the small general-purpose model used before found 55 %). The decoder keeps a
  probability for every candidate pitch of every note, and the key velocities.
- **Out-of-tune pianos.** Many home pianos are 10–40 cents flat as a whole, and the model starts missing chord
  notes from about 25 cents. Scorebook measures the piano's tuning on every take, remembers it, and feeds the
  audio to the model at concert pitch (Settings shows what it found).
- **Intelligent note correction.** Audio evidence × musical context (key posterior that follows modulations,
  chord, melodic line, repetition of earlier passages) with an ambiguity gate: clear audio always wins.
  The *Literal ↔ Musical* slider sets how much context may decide. Tap any note to see its alternatives with
  their probabilities and the reasons; one tap switches it; Scorebook learns from every switch.
- **Rhythm.** Tempo and beat tracking (follows rubato), meter (2/4, 3/4, 4/4, 6/8), quantization with a
  *Loose ↔ Strict* slider, ties across beats and bars, triplets.
- **Editing.** *Cut*: tap a bar, then another, to select bars, then keep only those, delete them (the gap closes)
  or copy them to a new song; every cut can be undone, or the original restored, and the recording is cut the
  same way. *Adjust*: fix a tempo read at double or half speed, choose the time signature or the key, besides the
  Literal ↔ Musical and rhythm sliders. Tap a note to switch its pitch, remove it or move it to the other hand.
- **Score.** Engraved with the Bravura music font: hands split automatically, key signatures (with key changes),
  chord symbols, accidentals, beams. One-tap transpose.
- **Exports.** A PDF is saved to *Downloads/Scorebook* after every take (can be turned off); PDF, MIDI and
  MusicXML can be shared or saved from any take.
- **Playback.** Play any score with a built-in piano sound (or play the take's own recording) while the notes
  light up and the page follows; 0.5× / 0.75× / 1× speed for practice.
- **Library.** Every take is kept with its audio, auto-titled ("Idea in D minor, 14 Nov") with date, duration,
  key and tempo; search and favourites. Swipe a score left to delete it (with Undo), or select several or all and
  delete them at once; deleted scores stay in the Trash for 30 days (restore, delete for good, empty trash).
- **Accompaniment of the day.** Every day the Listen screen proposes one left-hand pattern to try (Alberti bass,
  pop ballad arpeggio, stride, bossa nova, boogie-woogie, waltz, barcarolle… 15 in all, easy to hard, in 4/4, 3/4
  and 6/8), written out on the staff in one of the keys you play most, over a chord progression that suits it,
  with what it is, a tip, playback, and tempo and key controls. Not in the mood for it? *Another one* gives a
  different recommendation, and all patterns can be browsed any day.
- **Motif of the day.** Not only chords: every day also brings a figure that musicians reuse, written out for
  both hands. Lament bass, line cliché, walking-bass turnaround, blues turnaround and lick, montuno with its
  tumbao bass, La Folia, pedal point, alternating bass with walk-ups, falling-fifths sequence, minimal ostinato,
  shuffle riff, tango marcato and síncopa. Each with where it comes from and how to practise it.
- **Play-along check.** *Check my playing* listens while you play the pattern or motif once, at your own tempo
  (microphone or MIDI keyboard; nothing is recorded), and tells you how it went: one to three stars, how many
  notes were there (the missing ones light up on the score), how steady the rhythm was and the tempo you played
  at. Swung eighths and playing in another octave are fine. A passed check counts for the day: the Listen screen
  shows how many days in a row you have practised, and each pattern keeps its best stars.
- **Accompany my song.** Take any song you recorded: your right hand stays exactly as you played it and the left
  hand is replaced by the pattern you choose, following the chord of each bar on your own beats (so it follows
  your rubato). The result is saved as a new song with its score, playback and exports. From the accompaniment
  screen ("Use it on my last song") or from a song's menu ("Add an accompaniment…").
- **Practice stats.** Minutes this week with a 7-day chart, day streak, totals, most played keys, average tempo.
- Dark stage theme, large score, screen stays on while listening.

What comes next (albums and multiple takes per song, more piano commands such as bookmarks and a metronome,
idea catcher, take comparison, a piano-specific model) is listed at the end of ARCHITECTURE.md.

## How well it works

**Real piano recordings** (8 pieces from the MAESTRO test set, 17 640 notes; a note counts if its pitch is right
and its start is within 50 ms). "Phone" is the same recording through a simulated phone on the music stand in a
living room (small-microphone band limits, reverb, noise, limiting). Reproduce with `tools/eval_real_piano.py`.

| | F1 | notes inside chords found | F1, phone | notes inside chords found, phone |
|---|---|---|---|---|
| Onsets and Frames (the app) | **0.964** | **94 %** | **0.955** | **92 %** |
| Basic Pitch (before; still the fallback) | 0.783 | 55 % | 0.730 | 47 % |

MAESTRO's concert grands are the kind of piano the model was trained on, so expect somewhat less on another
instrument. On a different, synthesized piano (the rendered test pieces in `core/src/test/resources/fixtures`):
F1 0.97–1.00, every chord note found, tempo, meter, key and the C → G modulation all right.

**A piano that is flat or sharp as a whole** (`tools/eval_real_piano.py --detune`):

| piano | in tune | −10 c | −20 c | −30 c | −40 c | −50 c | +20 c | +35 c |
|---|---|---|---|---|---|---|---|---|
| F1 as it is | 0.98 | 0.96 | 0.95 | 0.91 | 0.74 | 0.47 | 0.98 | 0.91 |
| F1 with tuning compensation | 0.98 | 0.98 | 0.97 | 0.98 | 0.98 | 0.97 | 0.97 | 0.97 |

The tuning itself is measured within about 1.5 cents (also through the phone simulation).

**Unevenly out of tune** (a third of the notes 35–60 cents off, each differently; much worse than a real
neglected piano): F1 0.84–0.86, tempo and keys still right. This is where the musical-context correction and
your own corrections matter most.

Not measured: a real phone in a real room. The numbers above are the best available stand-in.

## Build

CI does it: `.github/workflows/android-scorebook.yml` runs the core tests and builds the APK on every push that
touches `android-scorebook/` (download it from the run's artifacts); running the workflow by hand publishes a
release `scorebook-N`. A second job boots an Android emulator and runs `OnDeviceTest`: a rendered 42-second piano
recording goes through the real LiteRT model and the live session (on the emulator: about 1.3 s of compute),
key / tempo / meter are checked, the PDF is exported and rendered back, and screenshots of the take, note and
listening screens are saved (artifact `Scorebook-device-N`). `tools/device-test.sh` does the same on a phone
connected with adb. The piano model (109 MB) is not in git: `tools/fetch_model.sh` downloads it and checks its
SHA-256 (CI does this before building; without it the app builds with the small fallback model).

Locally, with the Android SDK and Gradle 8.13:

```bash
gradle -p android-scorebook :core:test          # the music engine; needs only a JDK (17+)
android-scorebook/tools/fetch_model.sh          # the piano model, once
gradle -p android-scorebook :app:assembleDebug  # the app; needs the Android SDK
```

Without an Android SDK the build leaves the app module out (see `settings.gradle.kts`), so the core can be
developed and tested anywhere.

To regenerate the test fixtures (FluidSynth with a GM soundfont, and
`pip install numpy scipy mido soundfile ai-edge-litert`):

```bash
python tools/make_fixtures.py --model app/src/main/assets/basic_pitch.tflite \
    --of-model app/src/main/assets/onsets_frames.tflite --out core/src/test/resources/fixtures
cd tools && python make_command_fixtures.py --of-model ../app/src/main/assets/onsets_frames.tflite --out ../core/src/test/resources/commands
```

`RenderTest` writes SVG pages, MusicXML and MIDI for every fixture when `SCOREBOOK_RENDER_DIR` is set.

## Layout

```
core/   plain Kotlin: transcribe/ (model stream, decoder), analysis/ (rhythm, key, chords), correct/ (fusion,
        learning, hands, pipeline), score/, engrave/ (layout, live staff, SVG), export/ (MusicXML, MIDI),
        live/ (auto start/stop, MIDI input, live session), library/, accompany/ (patterns, motifs, the
        daily picks, accompany my song), practice/ (play-along check, streak), commands/, play/ (piano sound)
app/    Android: audio capture, LiteRT model, MIDI devices, storage, PDF, Compose UI
tools/  fixture generator
```

## Credits

- Transcription model: [Onsets and Frames](https://magenta.tensorflow.org/onsets-frames) by Google Magenta
  (Hawthorne et al.), Apache License 2.0; the TFLite build published with Magenta's realtime demo.
- Fallback model: [Basic Pitch](https://github.com/spotify/basic-pitch) by Spotify, Apache License 2.0
  (`app/src/main/assets/licenses`).
- Evaluation recordings: [MAESTRO](https://magenta.tensorflow.org/datasets/maestro) (CC BY-NC-SA 4.0), downloaded
  by the evaluation script, not redistributed here.
- Music font: [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1.
