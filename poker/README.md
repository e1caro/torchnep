# Poker Coach

A free, static web app (no build step, no account) for learning to play No-Limit Texas Hold'em well: ten lessons, six
drills, a six-player table where a coach grades every decision, and the tools a player studies with. It is also an
Android app (`../android-poker`) and a Windows program (`../desktop-poker`); all three are the same pages.

Live (after a merge to `master`): **https://e1caro.github.io/torchnep/poker/**

## What is in it

**Learn**: ten lessons in order, each a few short sections with cards, charts and tables drawn in the page, and a
check of three questions at the end: the hands; how a hand is played; position; starting hands; facing a raise; outs
and equity; pot odds; betting with a purpose; reading the board and the player; bankroll and mindset.

**Drills**: short questions one after another, passed by answering a number of them right in a row.

| Drill | The question | To pass |
|---|---|---|
| Which hand wins? | Two hands and a board: A, B or a split | 20 in a row |
| Open, call or fold | A seat, the raise before it if any, your hand: play it by the chart | 30 in a row |
| Count the outs | A draw on the flop or turn: how many cards complete it | 15 in a row |
| Pot odds | The pot and a bet: the share you need; or with your outs, call or fold | 20 in a row |
| Who is ahead? | Two hands all-in before the flop: favourite, coin flip or underdog | 15 in a row |
| Find the nuts | A board: which of four holdings is the best possible hand | 15 in a row |

The preflop drill deals hands near the edge of the chart two times in three, where the decisions are hard.

**Play**: a six-player cash table, 100 big blinds each, against five opponents of four kinds (regular, rock, calling
station, maniac; the mix is a setting). With hints on, before you act the coach shows the chart's play before the flop
and, after it, your share of the pot against the hands your opponents are likely to hold, the price of a call and the
play it suggests. After every action you get a grade (good, fine, mistake) with the reason. Each hand can be reviewed
decision by decision; your play (VPIP, PFR, showdowns, results per 100 hands, how often you played like the coach) and
your most frequent mistakes are under Tools, Your play. Keys on a computer: `F` fold, `C` check or call, `R` bet or
raise, `1` to `6` the bet sizes, `Enter` next hand; in a drill `1` to `5` answer and `Enter` moves on; `Esc` goes back.

**Tools**: every chart, an equity calculator (a hand against a hand or a range, on any board) and the table of outs.

## How the numbers are made

- **Hand ranking**: a seven-card evaluator; the tests rank all 2,598,960 five-card hands and find the textbook count
  of each kind.
- **Equity**: exact over every runout when the board has three or more cards and both hands are known, Monte Carlo
  otherwise. The equity of each starting hand against a random hand (`EQ_VS_RANDOM` in the engine) was computed with
  `tools/hand-equity.js` (400,000 runouts each); it orders the hands for "the top 10%" and for the opponents.
- **Charts**: six-max, 100 bb, opens of 2.5 bb. They are close to published solver output, rounded so that each hand
  has one action; they are not a solver's answer.
- **The coach and the opponents** guess each player's hand from what they did before the flop (a slice of the playing
  order: an under-the-gun raise is the best 18%, a big blind call much wider) and weigh it toward strong hands for
  every bet or raise after the flop. Your equity against those guesses, compared with the price, is the advice. It is
  a model, not a solver; close spots are marked as close.
- Every figure quoted in a lesson was worked out with the engine.

## Files

```
index.html             the page and the four sections
css/style.css          everything drawn: cards, the hand grid, the table, the sheets
js/engine.js           cards, evaluator, equity, ranges and charts, the table (blinds, betting, side pots, showdown),
                       the opponents, the coach and its grades, the drills (no DOM; also runs in Node)
js/lessons.js          the lessons and the list of drills
js/app.js              the views, the table loop, saving
icons/, manifest.webmanifest   the icon and the app manifest (tools/make-icons.js draws the PNGs, the Android
                       launcher icons and the Windows icon from icons/icon.svg)
tools/hand-equity.js   computes EQ_VS_RANDOM
tests/unit.js          engine tests, Node only
tests/e2e.js           browser tests with Playwright, at phone and desktop sizes
```

The browser keeps three things: your progress and settings (`poker.v1`), the table in play, saved after every action
(`poker.table.v1`), and the last 60 hands you played (`poker.hands.v1`).

## Run and test

```bash
cd poker
python3 -m http.server 8000          # then open http://localhost:8000
node tests/unit.js                   # 17 tests, Node only, about 10 seconds
BASE=http://localhost:8000 node tests/e2e.js   # 16 tests in Chromium (needs Playwright)
```

The unit tests count every five-card hand, check equities against known matchups and exact enumeration, read the
ranges and charts back, play 5,000 hands of random actions and 2,000 hands of the opponents with uneven stacks
checking that no chip appears or disappears, stack the deck for side pots, split pots with an odd chip, the minimum
raise and an all-in that does not reopen the betting, and check every drill against the evaluator.

The deploy (`.github/workflows/docs.yml`) runs the unit tests and copies the app to `/poker/` on GitHub Pages.
