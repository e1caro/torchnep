# Bloomdoku

A sudoku garden for the phone: a free, static web app that you add to the Home Screen from Safari on iPhone, and an
Android app (`../android-bloomdoku`). Every number can be a flower or a little animal, finished rows bloom, and the
garden you grow is your progress. Built from
[`prompts/bloomdoku-sudoku-garden.md`](../prompts/bloomdoku-sudoku-garden.md).

## What you get

**4,400 gardens in 11 worlds**
- A map of **11 worlds × 4 levels × 100 numbered gardens**. Every world adds one rule, the levels of a world get
  harder, and every garden is made from a seed: the same for everyone, and after the 100th a level keeps making
  new ones.

  | World | Rule | Boards |
  |---|---|---|
  | 🌱 Sprout Nursery | Rows, columns and plots hold each flower once | 9×9, nearly full |
  | 🌷 Tulip Meadow | The classic garden | 9×9 |
  | 🐝 Honeybee Crossing | The two diagonals (bee paths) too | 6×6, 9×9 |
  | 🐸 Lily Pond | Plots are wobbly lily pads (jigsaw) | 5×5, 6×6, 7×7, 9×9 |
  | 🌿 Vine Trellis | Numbers grow along each vine, from the bulb to the tip | 6×6, 9×9 |
  | 🐇 Bunny Hollow | The same flower is never a knight's move away | 9×9 |
  | 🌙 Firefly Night | Moon cells are even, sun cells odd | 6×6, 9×9 |
  | 🌈 Rainbow Summit | Boss gardens: two or three rules at once | 9×9 |
  | 🐥 Twin Sprouts · 💃 Garden Ball · 🎩 Midnight Waltz | **Twin gardens** (below) | 9×9 |

- **The map starts with real 9×9 gardens.** Tiny 4×4 boards are only the **tutorial**: three lessons in which Pua
  first shows each step, then only where to look, then lets you do it alone (and two more for twin gardens). It is
  offered on the map to newcomers and is always in Settings; lessons are not saved as gardens.
- **Twin gardens: two figures in every cell** (3 worlds, 12 levels, 1,200 gardens). The first figures make a
  sudoku, the second figures make another, and no couple (first, second) appears in two cells: on the 9×9 board the
  81 cells hold the 81 possible couples, each exactly once. Tap the left half of a cell for its first figure and
  the right half for the second; pencil notes are coloured dots in each half. Such pairs of sudokus exist for 4×4
  and 9×9 and for no 6×6 at all (Euler's "36 officers"): the levels are 9×9, from nearly full to 46 figures of 162,
  and the 4×4 is the twin tutorial.
- **No guessing.** A garden is only kept if a step-by-step logic solver finishes it (singles in the easy levels;
  locked candidates and pairs in the hard ones; in twin gardens also "the cells that share a figure have different
  partners"), so it has exactly one answer and the hint can always explain the next step.
- **Stars:** ★ the garden bloomed · ★ on your own (nothing revealed) · ★ not a petal out of place (no wrong
  flower). A level shows its best garden; a world gives its stamp when its four levels have a star. Every world is
  open from the start; inside a world a level opens when the one before has a star (or when a friend challenges
  you in it); inside a level any garden can be picked by number.

**Not the usual sudoku**
- **Numbers, flowers, critters or fruits**, each value with its own colour and drawing. What was planted from the
  start is in plain ink and what you plant comes up in colour, so the board blooms as you solve.
- **Hint** (🐝 the bee): shows a cell you can solve now and says why, without planting it. Free and unlimited.
  Ask again and it names the flower.
- **Every helper is animated:** the bee flies from the Hint button and hovers over its cell, the caterpillar crawls
  along the board as the notes appear, the ladybird walks over the cells it marks, the owl lands and looks around,
  the frog jumps onto its cell. Wings flap, eyes blink, legs wiggle; "reduce motion" turns it into a simple fade.
- **Helpers:** 🐛 the caterpillar writes or tidies the pencil notes (free); 🐞 the ladybird marks every cell where
  one flower can still go, 🦉 the owl marks wrong flowers and 🐸 the frog plants one (five charges of each to
  start, more in the shop). The owl, the frog and a flower named by the bee cost the second star.
- **Butterfly bookmark**, **musical garden** (each value is a note; a finished row plays its melody), no lives, no
  game over, no timer unless you turn the sundial on, *New seeds* to swap a garden at no cost.
- **Daily bouquet:** one garden a day, the same for everyone, with a different rule each weekday, a streak and a
  share card without spoilers.

**Levels, chestnuts and the shop**
- **Player level** and title (Seed → Sprout → … → Meadow legend), worked out from the progress itself: every star
  is worth more in bigger and harder levels.
- **Chestnuts 🌰** are earned by blooming gardens (2, 3 or 4 by stars; 2 for each garden beyond the 100th),
  daily bouquets (6 to 10), world stamps (25) and player levels (10). They are worked out from the
  progress, so syncing devices never counts twice. Everything in the shop costs about half of what a player can
  earn, so it fills up over months, not days.
- **The shop** (no real money anywhere), in four aisles with a daily offer (40% off one thing), rarities and a
  close-up to try things before buying:
  - *Helpers:* charges for the frog, owl and ladybird, and **15 helper looks** (four per helper, the first one
    free): a bumblebee, a queen bee and a space bee; a rainbow, a bookworm and a candy caterpillar; golden, night
    and heart ladybirds; snowy, wizard and detective owls; a frog prince, a ninja frog and a dart frog.
  - *Cells:* seven sets for the values (numbers, flowers, critters, fruits, gems, sweets, sea friends) and six
    instruments for the musical garden.
  - *Looks:* ten garden looks that recolour the app by day and by night, each with its own sky (falling leaves,
    snow, bubbles, fireflies…); seven board edges; eleven effects for when a garden blooms.
  - *Pua:* 16 hats, 9 coats and 6 rings around your critter, all seen by your friends.

**Friends** (needs an account: a username and a password, no e-mail)
- **Sync:** the progress follows the account to every phone and computer. Every sync merges the two copies, so
  playing on two devices, even offline, never loses anything.
- **Friend codes and requests**, a **ranking** of you and your friends by level with today's bouquet, and each
  friend's page with their level, numbers and garden.
- **Messages** with flowers and critters as stickers, "seen" marks, taking a message back, and **garden
  challenges**: send the garden you just finished with your stars and time, and your friend plays the very same one.
- **Careful by design:** nobody can list players (a friend is found only by code), only friends can write to each
  other, a friend sees a summary and never your settings or gardens in progress, messages are shown as text, and
  there are *Report* and *Remove friend* (which stops messages at once). All of it is enforced in the database
  (`tools/supabase.sql`), not just in the app.

**Phone**
- iPhone: *Share → Add to Home Screen* in Safari: full screen, portrait, offline after the first visit. Written
  for iOS 16.2 or later. Android: the APK from the releases (`../android-bloomdoku`), which updates itself.
- Safe areas, the pad in the thumb zone, touch targets of 44 px or more, no double-tap zoom, no page bounce while
  playing. Checked at 375×667, 390×844 and 430×932.
- **It updates itself.** On iPhone and in the browser the service worker fetches a new version in the background
  (when the app opens, comes back to the screen, and every half hour) and switches at a calm moment: never in the
  middle of a garden. The Android app downloads each release's web files by itself, and Settings → Version shows
  the version, *Check for updates* and, on the rare release that needs a new APK, a link to it.
- The garden in progress is saved after every move. Day and night, English and Spanish.
- Without an account everything stays on the phone and nothing is sent anywhere. No tracking.

## One-time setup for friends

Accounts and sync work in the Supabase project the other apps already use. Friends and messages need their tables:
in Supabase, *SQL Editor → New query*, paste **`tools/supabase.sql`** and *Run* (it can be run again safely). Until
then the Friends tab says that friends are not switched on yet, and everything else works.

## Run it

Plain HTML, CSS and JavaScript: no build step, nothing to install.

```bash
cd bloomdoku
python3 -m http.server 8000      # then open http://localhost:8000
```

## Tests

```bash
node tests/unit.js                                   # 83 tests, Node only, a few seconds
node tests/unit.js --all                             # the same, over every one of the 4,400 gardens (about a minute)
node tests/unit-cloud.js                             # 10 tests: accounts, sync, friends and messages against a fake service
bash tests/sql.sh                                    # 51 checks of tools/supabase.sql in a throwaway local PostgreSQL
BASE=http://localhost:8000 node tests/e2e.js          # 49 tests in a real browser at iPhone sizes (needs Playwright)
```

- `tests/unit.js`: the catalog (11 × 4, keys and names that never move); for every level, gardens with exactly one
  solution that the logic solver finishes within the level's techniques, whose solution obeys every rule of its
  world, the same from the same seed and all different; twin gardens (both layers, every couple once, the couple
  rule in candidates and conflicts); hints alone solving a garden of every level; the daily rule and the streak;
  stars, unlocking, stamps and Continue; levels, chestnuts and the shop; merging two copies of the progress; what
  friends see; saved state surviving garbage; every sentence having its Spanish; the offline file list.
- `tests/unit-cloud.js`: sign up and sign in on several devices, two devices playing apart and merging, purchases
  following the account, friend codes and requests, privacy of profiles, messages (text, stickers, challenges,
  unread, seen, taking back, flooding), removing a friend, a project without the friends tables, no connection,
  expired and revoked sessions, deleting the account. `tests/fake-supabase.js` is the stand-in service.
- `tests/sql.sh`: who can read and write what, in real PostgreSQL: profiles nobody can list, requests, friends-only
  messages nobody can forge or rewrite, read marks, the flood limit, reports, ending a friendship, deleting an account.
- `tests/e2e.js`: layout at three iPhone sizes for every board (twin included), a whole level through the pad,
  notes, undo, butterfly, resume, the hint and every helper, every rule drawn, twin gardens (halves, dots, hints,
  win), the shop (earning, buying, wearing, effects), skins, the daily, my garden, Spanish, night mode, settings,
  the keyboard, friends between two phones (account, code, request, ranking, a friend's garden, messages, a
  challenge played by the friend, a third device, removing), and opening with no network. No test reaches the real
  account service.

Sound, the tap feedback, *Add to Home Screen* and the Android app itself cannot be checked in this test browser:
they need real phones.

## Editing

After editing **any** file, regenerate the service worker's file list and version so installed copies update
(`node tests/unit.js` fails if you forget):

```bash
python3 tools/update-sw.py
```

The helper looks, the gems, sweets and sea sets and Pua's newer hats live as JSON in `tools/packs/` and are
compiled into `js/packs.js` (which the builder checks for anything unsafe in an SVG):

```bash
node tools/draw-packs.js && node tools/build-packs.js     # --es prints their Spanish names for js/es.js
```

`node tools/make-icons.js` rebuilds the web and Android icons from the one drawing in that file, and
`node tools/strings.js` lists the sentences that still need Spanish.

## Layout

```
index.html              page shell: sky, view, tab bar, sheets
css/style.css           styles (day, night, six garden looks; phone first; no external fonts)
manifest.webmanifest    install metadata             sw.js   offline cache (generated list)
js/engine.js            pure logic: seeded random numbers, board structure (classic and twin), search solver, logic
                        solver (hints and grading), lily pads, vines, the generators
js/worlds.js            pure logic: the 11 worlds and 44 levels, garden seeds, the daily rule, stars, unlocking,
                        Continue, player level, merging progress, what friends see
js/shop.js              pure logic: chestnuts earned, the catalog, buying, helper charges, what is worn
js/core.js              DOM helper, saved state (one localStorage key, sanitized on load), t() for languages, sheets
js/es.js                Spanish
js/art.js               flowers, critters, fruits, Pua the hedgehog and its hats, the garden plants (SVG)
js/packs.js             generated: helper looks, more cell sets and hats (from tools/packs/)
js/fx.js                the helpers' flights, crawls and jumps over the board
js/update.js            self-update: service worker, the Android shell's reports, Settings → Version
js/sound.js             notes and melodies (Web Audio), tap feedback
js/cloud.js             accounts, sync, friends and messages (Supabase REST with fetch, no library)
js/game.js              the play screen: board, pad, notes, undo, butterfly, hint and helpers, blooming, win sheet
js/friends.js           account form, Friends tab, a friend's page and conversation, challenges
js/app.js               map, tutorial card, level sheet, daily bouquet, my garden, shop, settings, router, sharing
tests/  tools/          tests; the friends database (supabase.sql), service-worker, icon and translation tools
```

## Extending it

- **A level or a world:** add a level at the end of a world, or a world at the end, in `js/worlds.js`. Level keys
  and garden numbers are saved progress: never rename, reorder or re-seed them (`W.GEN` changes every garden).
- **A rule:** teach it to `E.build` (who sees whom, or an arc between cells), to `E.generate` (how the decoration
  is drawn from the full grid), to `underSvg` in `js/game.js` (how it looks) and to `RULES` (its name and
  sentence). The solvers work from the structure, so hints and grading follow.
- **Something for the shop:** one `add(…)` line in `js/shop.js`; a look also needs its `[data-garden]` block in
  the stylesheet, a hat, cell set or helper look its drawing in `tools/packs/`, an effect its entry in `EFFECTS`
  (`js/game.js`). The tests check that each exists. A helper look's parts can move: give them the classes `hw`
  (wings), `he` (eyes, they blink), `hp` (pupils), `hs` (body segments) or `hl` (legs).
- **A sentence:** write it in English inside `t('…')` and add its Spanish to `js/es.js`.
