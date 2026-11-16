# Prompt: make Scorebook's transcription close to perfect, measured against classical pieces with their sheets

Scorebook (`android-scorebook/`) listens to piano playing and writes the sheet music. Make what it writes as close
as possible to the real score, and prove it with numbers: use classical piano pieces for which we have both real
performances and the published sheet music, compare what Scorebook writes with the sheet, find where it goes
wrong, fix it, and repeat until the numbers stop moving.

## 1. The reference: performances with their sheets

- Use public datasets of classical piano that pair **recordings**, the **notes that were played** (MIDI from the
  instrument) and the **score** (MusicXML or score MIDI) with beats, bar lines, key and time signatures marked on
  the performance: ASAP (scores and annotations for Bach, Mozart, Beethoven, Schubert, Chopin, Liszt, Schumann,
  Debussy, Ravel, Rachmaninov and others) together with MAESTRO (the recordings).
- Nothing from the datasets is committed to the repository: only the tools that fetch them, the measurements and
  the settings learned from them. Respect their licences (non-commercial, attribution).
- Split **by piece**, never by performance: a tuning set to learn settings from, and a held-out test set that is
  only used to report results. Every number given to the user comes from the held-out set.

## 2. What to measure (each on the held-out set, per composer and overall)

1. **Notes heard** (from the audio): how many played notes are found and how many written notes are wrong, with
   chords and the low and high registers looked at separately; clean recordings and phone-like recordings.
2. **Beat and bars**: are the beats where the score has them, are the bar lines right, is the tempo right (not
   half or double), is the time signature right.
3. **Key**: is the key signature right, including pieces that change key.
4. **Rhythm as written**: for each note, is it written at the right place in its bar and with the right length
   (the note values on the page).
5. **Hands**: is each note on the right staff.
6. **The whole page**: the share of bars that come out exactly as in the sheet (right notes, right places, right
   staff), which is what a pianist reading the result actually experiences.

## 3. How to improve it

- Start with a baseline of all six, then always work on the largest source of error first.
- Learn the settings from the tuning set by search, not by hand: note detection thresholds and calibration,
  beat tracking, time signature and bar-line choice, rhythm rounding, key tracking, hand splitting, and the
  correction of unclear notes by musical context.
- The musical analysis (2 to 6) can be trained on the notes played in hundreds of performances without running
  the audio model; then confirm on real audio that the gains hold when notes are missed or misheard.
- When a setting cannot fix an error, change the method (for example a better beat tracker, a rhythm model that
  knows which note values are likely, a hand splitter that follows voices), and measure again.
- Keep every change that helps on the tuning set and does not hurt the held-out set; drop the rest.
- Do not make the app slower or larger without saying so; everything must still run on the phone, offline.

## 4. What to deliver

- The measuring tools in `android-scorebook/tools` and tests that run them, so the numbers can be reproduced.
- A before-and-after table of the six measurements on the held-out set, with the biggest remaining errors named
  and one or two worked examples (a page as written by Scorebook next to the real sheet).
- The improved app, checked on the emulator, released, with README and ARCHITECTURE updated.
- An honest statement of how close to perfect it is, where it still fails (fast runs, heavy pedal, very free
  rubato, many voices), and what would be needed to go further (for example training a new audio model, which
  needs a GPU and days of computing).
