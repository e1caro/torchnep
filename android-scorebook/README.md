# Scorebook for Android

Play the piano, get sheet music. Scorebook listens through the phone's microphone (or a USB / Bluetooth MIDI
keyboard), transcribes both hands, finds the key, tempo, meter and chords, fixes unclear notes using the musical
context, and writes an engraved score you can save as PDF, MIDI or MusicXML. Everything runs on the phone, offline.

The design — architecture, transcription model, and how note probabilities are combined with the musical
context — is in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## What version 1 does

- **Hands-free takes.** Open the app and play: a take starts when you start (keeping 1.5 s from before, so the
  first note is not lost) and ends after 5 s of silence (adjustable). The big button starts or ends one by hand.
- **Live grand staff.** Notes appear on a treble + bass staff as they are heard, spelled in the current key, with
  the detected key shown; lighter notes are the ones the AI had to decide.
- **On-device transcription.** Basic Pitch (Spotify, Apache-2.0, 204 KB) on LiteRT. The decoder keeps a
  probability for every candidate pitch of every note (the heard pitch, its semitone neighbours and its octaves).
- **Intelligent note correction.** Audio evidence × musical context (key posterior that follows modulations,
  chord, melodic line, repetition of earlier passages) with an ambiguity gate: clear audio always wins.
  The *Literal ↔ Musical* slider sets how much context may decide. Tap any note to see its alternatives with
  their probabilities and the reasons; one tap switches it; Scorebook learns from every switch.
- **Rhythm.** Tempo and beat tracking (follows rubato), meter (2/4, 3/4, 4/4, 6/8), quantization with a
  *Loose ↔ Strict* slider, ties across beats and bars, triplets.
- **Score.** Engraved with the Bravura music font: hands split automatically, key signatures (with key changes),
  chord symbols, accidentals, beams. One-tap transpose.
- **Exports.** A PDF is saved to *Downloads/Scorebook* after every take (can be turned off); PDF, MIDI and
  MusicXML can be shared or saved from any take.
- **Library.** Every take is kept with its audio, auto-titled ("Idea in D minor, 14 Nov") with date, duration,
  key and tempo; search, favourites, trash with 30-day recovery.
- Dark stage theme, large score, screen stays on while listening.

What comes next (albums and multiple takes per song, playback, hands-free piano commands, idea catcher, practice
statistics, take comparison, a piano-specific model) is listed at the end of ARCHITECTURE.md.

## How well it works

The core is tested on the real model's output for three rendered piano pieces (a C → G major modulation,
an A minor waltz, a D minor nocturne), each in tune and badly out of tune
(`core/src/test/resources/fixtures`, made by `tools/make_fixtures.py`):

| | in tune | out of tune (⅓ of notes 35–60 cents off) |
|---|---|---|
| Note F1 (pitch + onset within 50 ms) | 0.88 – 0.96 | 0.73 – 0.83 |
| Tempo, meter, key, modulation | all right | meters and keys right; one tempo read at double speed, and the C → G change is missed (most out-of-tune F♯s are not heard) |
| Hands | 93 – 100 % | |

On notes where the audio is torn between two pitches, the *Musical* end of the slider fixes 12 and gets 1
wrong; the default position fixes 6 and gets none wrong. Clearly heard chromatic notes (C♯ in C major,
G♯ in A minor) are never "corrected". A real phone recording will differ from these renders; the
calibration that learns from your corrections is there for that.

## Build

CI does it: `.github/workflows/android-scorebook.yml` runs the core tests and builds the APK on every push that
touches `android-scorebook/` (download it from the run's artifacts); running the workflow by hand publishes a
release `scorebook-N`.

Locally, with the Android SDK and Gradle 8.13:

```bash
gradle -p android-scorebook :core:test          # the music engine; needs only a JDK (17+)
gradle -p android-scorebook :app:assembleDebug  # the app; needs the Android SDK
```

Without an Android SDK the build leaves the app module out (see `settings.gradle.kts`), so the core can be
developed and tested anywhere.

To regenerate the test fixtures (FluidSynth with a GM soundfont, and `pip install numpy mido soundfile ai-edge-litert`):

```bash
python tools/make_fixtures.py --model app/src/main/assets/basic_pitch.tflite --out core/src/test/resources/fixtures
```

`RenderTest` writes SVG pages, MusicXML and MIDI for every fixture when `SCOREBOOK_RENDER_DIR` is set.

## Layout

```
core/   plain Kotlin: transcribe/ (model stream, decoder), analysis/ (rhythm, key, chords), correct/ (fusion,
        learning, hands, pipeline), score/, engrave/ (layout, live staff, SVG), export/ (MusicXML, MIDI),
        live/ (auto start/stop, MIDI input, live session), library/
app/    Android: audio capture, LiteRT model, MIDI devices, storage, PDF, Compose UI
tools/  fixture generator
```

## Credits

- Transcription model: [Basic Pitch](https://github.com/spotify/basic-pitch) by Spotify, Apache License 2.0
  (`app/src/main/assets/licenses`).
- Music font: [Bravura](https://github.com/steinbergmedia/bravura) by Steinberg, SIL Open Font License 1.1.
