# Bloomdoku

A sudoku garden for iPhone: a free, static web app that you add to the Home Screen from Safari. Every number can be
a flower or a little animal, finished rows bloom, and the garden you grow is your progress. Built from
[`prompts/bloomdoku-sudoku-garden.md`](../prompts/bloomdoku-sudoku-garden.md).

## What you get

**3,200 gardens in 8 worlds**
- A map of **8 worlds × 4 levels × 100 numbered gardens**. Every world adds one rule, the levels of a world get
  harder, and every garden is made from a seed: the same for everyone, and after the 100th a level keeps making
  new ones.

  | World | Rule | Boards |
  |---|---|---|
  | 🌱 Sprout Nursery | Rows, columns and plots hold each flower once | 4×4, 6×6 |
  | 🌷 Tulip Meadow | The classic garden | 9×9 |
  | 🐝 Honeybee Crossing | The two diagonals (bee paths) too | 6×6, 9×9 |
  | 🐸 Lily Pond | Plots are wobbly lily pads (jigsaw) | 5×5, 6×6, 7×7, 9×9 |
  | 🌿 Vine Trellis | Numbers grow along each vine, from the bulb to the tip | 6×6, 9×9 |
  | 🐇 Bunny Hollow | The same flower is never a knight's move away | 9×9 |
  | 🌙 Firefly Night | Moon cells are even, sun cells odd | 6×6, 9×9 |
  | 🌈 Rainbow Summit | Boss gardens: two or three rules at once | 9×9 |

- **No guessing.** A garden is only kept if a step-by-step logic solver finishes it (singles in the easy levels;
  locked candidates and pairs in the hard ones), so it has exactly one answer and the hint can always explain the
  next step. Levels that promise a trick really need one.
- **Stars:** ★ the garden bloomed · ★ on your own (nothing revealed) · ★ not a petal out of place (no wrong
  flower). A level shows its best garden; a world gives its stamp when its four levels have a star. Every world is
  open from the start; inside a world a level opens when the one before has a star; inside a level any garden can
  be picked by number.

**Not the usual sudoku**
- **Numbers, flowers or critters**, each value with its own colour and drawing; switch at any time. What was
  planted from the start is in plain ink and what you plant comes up in colour, so the board blooms as you solve.
- **Hint** (🐝 the bee): shows a cell you can solve now and says why, without planting it. Free and unlimited.
  Ask again and it names the flower.
- **Helpers:** 🐛 the caterpillar writes or tidies the pencil notes, 🦉 the owl marks wrong flowers, 🐸 the frog
  plants one. The owl, the frog and a flower named by the bee cost the second star.
- **Butterfly bookmark:** leave it before trying an idea and fly back to that moment.
- **Musical garden:** each value is a note; a finished row, column or plot plays its melody.
- **Cozy:** no lives, no game over, no timer unless you turn the sundial on; *New seeds* swaps a garden for the
  next one at no cost. A wrong flower wilts (or, if you prefer, nothing is checked until you ask the owl).
- **Daily bouquet:** one garden a day, the same for everyone, with a different rule each weekday, a streak and a
  share card without spoilers.
- **My garden:** one flower per level that grows with its stars, the world stamps, and your gardens out of 3,200.
- **Two ways to plant:** tap a cell and then a flower, or hold a flower and tap every cell where it goes. The pad
  shows how many of each are still missing.

**iPhone**
- *Share → Add to Home Screen* in Safari: opens full screen, portrait, and works offline after the first visit.
- Safe areas, the pad in the thumb zone, touch targets of 44 px or more, no double-tap zoom, no page bounce while
  playing. Checked at 375×667, 390×844 and 430×932.
- The garden in progress is saved after every move, per level and for the daily.
- Day and night garden (auto, or your choice), English and Spanish (follows the phone the first time).
- Everything is stored on the phone: no account, no tracking, no network requests after loading.
- Written for iOS 16.2 or later (it sizes the board with container units and mixes colours with `color-mix`).

## Run it

Plain HTML, CSS and JavaScript: no build step, nothing to install.

```bash
cd bloomdoku
python3 -m http.server 8000      # then open http://localhost:8000
```

## Tests

```bash
node tests/unit.js                                   # 58 tests, Node only, a few seconds
node tests/unit.js --all                             # the same, over every one of the 3,200 gardens (about 40 s)
BASE=http://localhost:8000 node tests/e2e.js          # 32 tests in a real browser at iPhone sizes (needs Playwright)
```

- `tests/unit.js`: the catalog (8 × 4, keys and names that never move, 3,200 gardens); for every level, gardens
  with exactly one solution that the logic solver finishes within the level's techniques, whose solution obeys
  every rule of its world, the same from the same seed and all different; hints alone solving a garden of every
  level; the daily rule per weekday and the streak; stars, unlocking, stamps and Continue; saved state surviving
  garbage; every sentence having its Spanish; the offline file list being current.
- `tests/e2e.js`: no sideways scrolling and a play screen that fits at three iPhone sizes for 4×4 to 9×9 boards;
  solving a level through the pad, a wrong flower, undo and redo, notes, the butterfly, resuming after a reload,
  stars and unlocking on the map, picking a garden by number, flower-first planting, the hint (and hints alone
  finishing a garden), caterpillar, owl and frog, new seeds, every rule drawn on its board, a world stamp, skins,
  the daily bouquet and its share text, my garden, Spanish, night mode, settings, the keyboard, and opening with
  no network.

Sound, the tap feedback and *Add to Home Screen* cannot be checked in this test browser: they need a real iPhone.

## Editing

After editing **any** file, regenerate the service worker's file list and version so installed copies update
(`node tests/unit.js` fails if you forget):

```bash
python3 tools/update-sw.py
```

`node tools/make-icons.js` rebuilds the icons from the one drawing in that file, and `node tools/strings.js` lists
the sentences that still need Spanish.

## Layout

```
index.html              page shell: sky, view, tab bar, sheets
css/style.css           styles (day, night and auto; phone first; no external fonts)
manifest.webmanifest    install metadata             sw.js   offline cache (generated list)
js/engine.js            pure logic: seeded random numbers, board structure, search solver, logic solver (hints and
                        grading), lily pads, vines, the generator
js/worlds.js            pure logic: the 8 worlds and 32 levels with their generator settings, garden seeds, the daily
                        rule, stars, unlocking, Continue, totals
js/core.js              DOM helper, saved state (one localStorage key, sanitized on load), t() for languages, sheets
js/es.js                Spanish
js/art.js               the nine flowers, the nine critters, Pua the hedgehog and the garden plants (SVG)
js/sound.js             notes and melodies (Web Audio), tap feedback
js/game.js              the play screen: board, pad, notes, undo, butterfly, hint and helpers, blooming, win sheet
js/app.js               map, level sheet, daily bouquet, my garden, settings, router, sharing, service worker
tests/  tools/          unit and browser tests; service-worker, icon and translation tools (not published)
```

## Extending it

- **A level or a world:** add a level at the end of a world, or a world at the end, in `js/worlds.js`. Level keys
  and garden numbers are saved progress: never rename, reorder or re-seed them (`W.GEN` changes every garden).
- **A rule:** teach it to `E.build` (who sees whom, or an arc between cells), to `E.generate` (how the decoration
  is drawn from the full grid), to `underSvg` in `js/game.js` (how it looks) and to `RULES` (its name and
  sentence). The solvers work from the structure, so hints and grading follow.
- **A sentence:** write it in English inside `t('…')` and add its Spanish to `js/es.js`.
