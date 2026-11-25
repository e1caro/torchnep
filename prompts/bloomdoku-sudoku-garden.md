# Prompt: Bloomdoku, a sudoku garden for iPhone

Build **Bloomdoku**, a sudoku web app for iPhone in a new folder `bloomdoku/`: a static PWA like
`data-analyst-path/` (plain HTML, CSS and JavaScript, no build step, works offline, added to the Home Screen from
Safari). It should feel like tending a small garden, not like filling in a spreadsheet: every number is a flower or
a little animal, finished rows bloom, and the garden you grow is your progress.

## 1. Worlds and levels (the same plan as the Analyst Path arcade and labs)

A map of **8 worlds × 4 levels**, and **100 numbered gardens in every level: 3,200 puzzles** (at least 3,000 was
asked for), the same for everyone. Every world introduces one new rule (shown on the map and on a short intro the
first time), the four levels of a world get harder, and every garden is made from a seed, so after the 100th a
level simply keeps making new ones. Level keys (`"3-2"`) and garden numbers are saved progress: never rename them,
only add at the end.

| # | World | New rule | Boards |
|---|---|---|---|
| 1 | 🌱 Sprout Nursery | Rows, columns and plots hold each flower once | 9×9, nearly full (4×4 only in the tutorial) |
| 2 | 🌷 Tulip Meadow | The classic garden; pencil notes, "only one place" and "only one fits" | 9×9 |
| 3 | 🐝 Honeybee Crossing | The two bee paths (diagonals) also hold each flower once | 6×6, then 9×9 |
| 4 | 🐸 Lily Pond | Plots are wobbly lily pads (jigsaw regions) | 5×5, 6×6, 7×7, 9×9 |
| 5 | 🌿 Vine Trellis | Numbers grow along each vine, from the bulb to the tip | 6×6, then 9×9 |
| 6 | 🐇 Bunny Hollow | The same flower is never one bunny hop (a chess knight's move) away | 9×9 |
| 7 | 🌙 Firefly Night | Moon cells hold even numbers, sun cells odd ones | 6×6, then 9×9 |
| 8 | 🌈 Rainbow Summit | Boss levels: two or three of the rules above in one garden | 9×9 |

- **Stars per garden, the level shows its best:** ★ the garden bloomed (solved) · ★ on your own (nothing
  revealed) · ★ not a petal out of place (never planted a wrong flower).
- **Unlocking:** every world is open from the start (pick the rule you like); inside a world, a level opens when
  the one before has a star; inside a level, any of the 100 gardens can be picked by number. *Continue* always
  goes to the garden in progress, or the next one without a star.
- **Each world has its own colour, icon, intro and stamp.** Finishing its four levels gives the world's critter
  stamp. Stamps and flowers are derived from stars; nothing extra is stored.
- **No guessing, ever.** The generator only keeps a puzzle that a step-by-step logic solver can finish (singles in
  the easy levels; locked candidates and pairs in the hard ones), so it has exactly one solution and a hint can
  always explain the next step.

## 2. What makes it different from other sudoku apps

1. **Flowers, critters or numbers.** Three skins for the nine values, each with its own colour and drawing
   (hand-made SVG, the same on every phone). Switch at any time; worlds where order matters (vines, fireflies)
   show a small number on each flower.
2. **Rule worlds**, as above: seven sudoku variants and their mixes, taught one at a time.
3. **Hints that explain, and critter helpers.** A *Hint* button is always on the board:
   - 🐝 **Bee (the hint)**: flies to a cell you can solve now and says why ("one flower has no other place left
     in this row"), without planting it. Free and unlimited. Asked again about the same cell, it names the flower
     (that costs the second star).
   - 🐛 **Caterpillar**: writes every pencil note for you, or tidies the ones that are no longer possible. Free.
   - 🦉 **Owl**: shows which flowers are wilted (wrong). Costs the second star.
   - 🐸 **Frog**: plants one flower for you. Costs the second star.
4. **Butterfly bookmark.** Leave a butterfly on the board before trying an idea; "fly back" returns the whole
   board to that moment.
5. **Musical garden.** Each value is a note of a pentatonic scale; a finished row, column or plot plays its own
   little melody, and the finished garden plays them all.
6. **It blooms.** Finished rows, columns and plots bloom in a wave; a wrong flower wilts instead of flashing red.
   Pua the hedgehog (the mascot) reacts to what happens and never nags.
7. **Cozy by default.** No lives, no game over, no timer unless you turn the sundial on. "New seeds" swaps the
   puzzle for another one of the same level at no cost.
8. **Daily bouquet.** One puzzle a day, the same for everyone, with the rule changing by weekday; a streak, and a
   share card (stars, slips, helpers used, no spoilers).
9. **My garden.** One flower per level that grows with its stars (seed, sprout, bud, bloom), the world stamps and
   a few numbers (gardens in bloom out of 3,200, stars, streak).
10. **Two ways to plant.** Tap a cell and then a flower, or tap a flower first and then every cell where it goes.
    The pad shows how many of each flower are still missing.

## 3. Interface

- Cute, calm and readable: a mint morning sky, plum ink, strawberry, leaf green and butter yellow; a night garden
  with fireflies in dark mode (auto, day or night). Rounded system type (`ui-rounded`, SF Rounded on iPhone), no
  external fonts.
- The board is the hero: big cells, soft plots, vines and lily pads drawn under the flowers. Everything else stays
  quiet.
- English and Spanish (follows the phone's language; switch in Settings).

## 4. iPhone

- Installable from Safari (*Share → Add to Home Screen*) with a short how-to in the app; offline after the first
  visit; opens full screen, portrait.
- Safe areas for the notch and the home bar, the pad in the thumb zone, touch targets of 44 px or more, no
  double-tap zoom, no text selection or callouts on the board, no page bounce while playing.
- Sizes: 375×667 (SE), 390×844, 430×932. No sideways scrolling anywhere.
- The puzzle in progress is saved after every move (iOS closes web apps in the background), per level and for the
  daily.
- Sound through Web Audio, unlocked on the first tap; a light tap feedback where the phone allows it; both can be
  turned off; reduced motion respected.

## 5. How to build it

- `js/engine.js` (pure logic, tested in Node): seeded random numbers, the board structure (groups, who sees whom,
  vines, parity), a search solver that counts solutions, the logic solver used for hints and for grading, jigsaw
  regions, and the generator (full grid → decorations → remove flowers while the logic solver still finishes it).
- `js/worlds.js` (pure logic): the catalog of worlds and levels with their generator settings, seeds, stars,
  unlocking, Continue, the daily rule, garden and stamps.
- The rest: saved state (one versioned `localStorage` key, sanitized on load), the SVG flowers, critters and Pua,
  sound, the play screen, the map, the daily, the garden, settings, i18n, and the service worker with its generated
  file list (`tools/update-sw.py`).
- Tests: for every level over several gardens (and all 3,200 with `--all`), the puzzle has exactly one solution,
  the logic solver finishes it within the level's techniques, the rules of its world hold in the solution, the
  same seed gives the same puzzle and no two gardens of a level are equal; following only the hints solves it;
  stars and unlocking; saved state; every interface sentence has its Spanish. In a real browser at iPhone sizes:
  solve a level through the pad, notes, undo, butterfly, the hint and each helper, the daily, skins, both
  languages, dark mode, resume after reload, no sideways scrolling.
- Publish it with the other apps (`docs.yml`, served at `/bloomdoku/`) and write its README.

## 6. Added on request: levels, chestnuts and a shop

- **Player level** and title, worked out from the progress (stars are worth more in bigger and harder levels), so
  friends can compare.
- **Chestnuts**, the game's money, earned by gardens, daily bouquets, world stamps and new levels; also worked out
  from the progress, so two devices can never count a garden twice. Only what was bought and used is stored.
- **A shop** with no real money: helper charges (frog, owl and a new ladybird that marks where a flower can still
  go; five of each to start), skins (critters, fruits), garden looks that recolour the whole app by day and by
  night, things for Pua to wear (friends see them) and effects for when a garden blooms.

## 7. Added on request: friends, like FitQuest's but better

- **An account** is a username and a password, no e-mail, in the Supabase project the other apps use, separate from
  their accounts. With it the progress syncs between devices by merging, so nothing is ever lost.
- **Friends:** a friend code and an invitation link, requests to accept or decline, a ranking of you and your
  friends by level with today's bouquet, and each friend's page with their level, numbers and garden.
- **Messages** between friends with flowers and critters as stickers, "seen" marks and taking a message back, and
  **garden challenges**: send the garden you just finished, with your stars and time, and the friend plays the same
  one (even in a level they have not opened yet).
- **Better than FitQuest's:** nobody can list players (a friend is found only by code), a profile is visible only
  to friends, only friends can write to each other, nothing can be forged or rewritten, there is a flood limit, a
  report button and "remove friend" stops messages at once. All of it as database rules (`tools/supabase.sql`),
  tested in a real PostgreSQL. Until that file is run in the project the app says friends are not switched on yet.

## 8. Added on request: twin gardens, a two-figure sudoku

- Every cell holds two figures. The first figures are a sudoku, the second figures are another, and **no couple
  (first, second) appears twice**: on the 9×9 board the 81 cells hold the 81 possible couples exactly once.
- Such pairs of sudokus exist for 4×4 and 9×9 and for no 6×6, so those are the sizes. Every garden is a shuffle of
  a base pair that keeps the three rules (renaming figures, moving rows, columns, bands and stacks, flipping,
  swapping the layers), with figures then removed while the logic solver still finishes it.
- **About 1,000 gardens of its own:** 3 worlds × 4 levels × 100 = 1,200, from nearly full 4×4 boards to a 9×9 with
  45 figures of 162, in their own part of the map.
- On the board: the left half of a cell is the first figure and the right half the second; notes are coloured dots
  in each half; hints say which half to look at and use the couples ("the cells that share a figure have different
  partners").

## 9. Added on request: an Android app

- `android-bloomdoku/`: the same shell as `android-analyst/` (the web app packed in the APK, shown from a secure
  local origin, self-updating from the releases' `web.zip`), with share, clipboard and vibration for the web side.
- `.github/workflows/android-bloomdoku.yml`: tests, builds, and publishes `Bloomdoku-1.N.apk` as release
  `bloomdoku-N`, signed with the repository's key.

## 10. Added on request: a bigger shop, animated helpers, self-update, a 9×9 start

- **The map starts with normal 9×9 sudokus.** World 1 is now 9×9 gardens with most flowers planted (56, 52, 48 and
  45 of 81), and the twin worlds are all 9×9. The 4×4 boards are only a **tutorial**: three lessons (Pua shows
  each step, then only where to look, then nothing) and two for twin gardens, not saved as gardens.
- **Fewer chestnuts:** 2, 3 or 4 for a garden by its stars, 6 to 10 for a daily bouquet, 25 for a world stamp, 10
  for a player level. The whole shop costs a bit over half of everything a player can earn.
- **A bigger, cooler shop** in four aisles (helpers, cells, looks, Pua) with a daily offer, rarities and a close-up
  to try things: 15 helper looks (four per helper), seven cell sets (gems, sweets and sea friends added), six
  instruments, ten garden looks with their own skies, seven board edges, eleven bloom effects, 16 hats, 9 coats and
  6 rings for Pua (95 things in all).
- **Every helper is animated** in its chosen look: the bee flies to its cell and hovers, the caterpillar crawls,
  the ladybird walks over the cells it marks, the owl lands and looks around, the frog jumps; wings flap, eyes
  blink, legs wiggle; reduced motion respected.
- **It updates itself, like the other apps:** the service worker checks on opening, on coming back and every half
  hour, and switches at a calm moment; the Android shell downloads new web files by itself and reports to Settings
  → Version (*Check for updates*, and a link when a release needs a new APK).

## Later, in this order

1. A daily reminder and a notification for new messages in the Android app.
2. Killer cages and "bigger than" signs as worlds 9 and 10.
3. A weekly giant garden (a 12×12 or five overlapping boards).
4. Seasonal skins (autumn leaves, snow animals).
