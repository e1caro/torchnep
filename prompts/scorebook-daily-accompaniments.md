# Prompt: daily accompaniment recommendations for Scorebook (and related features)

Add a **daily accompaniment recommendation** to Scorebook (the Android app in `android-scorebook/` that turns
piano playing into sheet music), and make accompaniments something the player can use on their own music.

## 1. Accompaniment of the day

Every day the app proposes one left-hand accompaniment pattern to try, shown on the Listen screen as a card
("Today's accompaniment") that opens a full screen.

- **A library of patterns**, each with a name, a style (classical, pop, jazz, latin, blues, waltz…), a level
  (easy / medium / hard), a meter (4/4, 3/4 or 6/8), a suggested tempo, two lines on what it is and where it is
  used, and one practical tip. At least: whole-note chords, pulsing chords, bass-and-chord, Alberti bass, pop
  ballad arpeggio (1-5-8-10), stride, octave pulse, habanera, tresillo (3+3+2), bossa nova, walking bass,
  boogie-woogie, waltz (oom-pah-pah), flowing 3/4 arpeggio, 6/8 barcarolle.
- **Personal:** written out in one of the keys the player uses most (from their library), over a chord
  progression that suits the style (I–V–vi–IV, ii–V–I, 12-bar blues, i–VI–III–VII, Andalusian cadence…), shown
  with its roman numerals and chord names.
- **Deterministic per day** (same pick all day, a different one tomorrow, levels alternating), and every pattern
  can also be browsed and opened any day.
- **On the screen:** the pattern engraved on the grand staff with chord symbols (the right-hand staff stays empty:
  that is where the player's melody goes), a play button with the built-in piano (notes light up), tempo and key
  controls, the description and the tip.

## 2. Use it on my own music

- **"Accompany my song":** take any recorded song, keep the right hand exactly as played, and replace the left
  hand with the chosen pattern following the chords Scorebook detected, bar by bar, on the take's own beat grid
  (so it follows the player's rubato). The result is saved as a new song ("… + Alberti bass"), with score, playback
  and exports like any other. Only patterns in the song's meter are offered.
- Reachable from the accompaniment screen ("Use it on my last song") and from a song's menu ("Add an
  accompaniment…").

## 3. More ideas in the same spirit (later, in this order)

1. **Play-along check:** play today's pattern; Scorebook listens and says how much of it was right (notes and
   rhythm), and keeps a streak of days practised.
2. **Lead sheet:** export only the melody with chord symbols.
3. **Warm-up of the day:** the scale, the three primary chords and a cadence in today's key.
4. **Reharmonize:** offer substitute chords for a song (relative minor, secondary dominants, tritone
   substitution) and hear the difference.
5. **Harmonize the melody:** add thirds or sixths below the right hand.
6. **Weekly recap:** minutes, keys, new patterns tried, best take.
7. **Daily notification** with the pattern of the day (optional).

## How to build it

- All the music logic goes in `core` (plain Kotlin, tested without Android): the pattern library, chord
  progressions, the daily pick, generating the notes of a pattern over chords, and applying a pattern to a
  transcription. Reuse what exists: `Chord`/`ChordQuality`, `Key`, `BeatGrid`, `Transcription`, `ScoreBuilder`,
  `Engraver`, `PianoSynth`, the library and take storage.
- The app adds the card, the accompaniment screen and the two entry points; the generated songs are ordinary
  takes.
- Tests: every pattern fills its bars exactly and stays on chord tones where it should; the daily pick is stable
  within a day and varied across days and uses the player's keys; applying a pattern to a real transcription
  keeps the right hand, replaces the left, and follows the detected chords.
- Keep the README and ARCHITECTURE current, check the screens on the emulator in CI, publish a release.
