# Poker Coach

A free, static web app (no build step, no account) for learning to play No-Limit Texas Hold'em well: fifteen lessons,
eleven drills, a six-player table where a coach grades every decision, and the tools a player studies with. It is also an
Android app (`../android-poker`) and a Windows program (`../desktop-poker`); all three are the same pages.

Live (after a merge to `master`): **https://e1caro.github.io/torchnep/poker/**

## What is in it

**Learn**: fifteen lessons in order, each a few short sections with cards, charts and tables drawn in the page, and a
check of three questions at the end: the hands; how a hand is played; reading your own hand; position; starting hands;
facing a raise; outs and equity; pot odds; betting with a purpose; reading the board and the player; reading hands
street by street; counting combinations; bluffs and bluff-catchers; short stacks, push or fold; bankroll and mindset.

**Drills**: short questions one after another, passed by answering a number of them right in a row.

| Drill | The question | To pass |
|---|---|---|
| Which hand wins? | Two hands and a board: A, B or a split | 20 in a row |
| Name your hand | Your cards and an unpaired flop or turn: top pair, overpair, set, draw... | 20 in a row |
| Open, call or fold | A seat, the raise before it if any, your hand: play it by the chart | 30 in a row |
| Count the outs | A draw on the flop or turn: how many cards complete it | 15 in a row |
| Pot odds | The pot and a bet: the share you need; or with your outs, call or fold | 20 in a row |
| Who is ahead? | Two hands all-in before the flop: favourite, coin flip or underdog | 15 in a row |
| Find the nuts | A board: which of four holdings is the best possible hand | 15 in a row |
| Call or fold after the flop | You called a raise and they bet the flop: your equity against their betting range, against the price | 15 in a row |
| Count the combos | A board and maybe your cards: how many ways they can hold a hand, or a set | 15 in a row |
| River math | How often a bluff must work, how often to defend, how many bets can be bluffs | 15 in a row |
| Push or fold | Short-stacked in the blinds: push, call or fold by the solved chart | 25 in a row |

The preflop and push-or-fold drills deal hands near the edge of the chart most of the time, where the decisions are
hard; *Call or fold after the flop* leaves out spots within 5 points of the price, where either answer is fine.

**Play**: a six-player cash table, 100 big blinds each, against five opponents of four kinds (regular, rock, calling
station, maniac; the mix is a setting). With hints on, before you act the coach shows the chart's play before the flop
and, after it, your share of the pot against the hands your opponents are likely to hold, the price of a call and the
play it suggests. After every action you get a grade (good, fine, mistake) with the reason. Each hand can be reviewed
decision by decision; your play (VPIP, PFR, showdowns, results per 100 hands, how often you played like the coach) and
your most frequent mistakes are under Tools, Your play. Keys on a computer: `F` fold, `C` check or call, `R` bet or
raise, `1` to `6` the bet sizes, `Enter` next hand; in a drill `1` to `5` answer and `Enter` moves on; `Esc` goes back.

**Tools**: every chart, an equity calculator (a hand against a hand or a range, on any board), the table of outs, and
the push-or-fold ranges for every stack from 2 to 20 big blinds.

**The table** deals each hand from the middle, slides bets out as chips, sweeps them into the pot at the end of a
street, turns the cards over at a showdown and pushes the pot to the winner. Most of this motion is skipped at the
fast speed setting, and all of it when the device asks for reduced motion.

## How the numbers are made

- **Hand ranking**: a seven-card evaluator; the tests rank all 2,598,960 five-card hands and find the textbook count
  of each kind.
- **Equity**: exact over every runout when the board has three or more cards and both hands are known, Monte Carlo
  otherwise. The equity of each starting hand against a random hand (`EQ_VS_RANDOM` in the engine) was computed with
  `tools/hand-equity.js` (400,000 runouts each); it orders the hands for "the top 10%" and for the opponents.
- **Push or fold**: `tools/push-fold.js` works out every starting hand's all-in equity against every other (with
  the cards they share taken out), then solves the small blind's push-or-fold against the big blind's call-or-fold,
  no antes, by fictitious play at each stack from 1 to 20 bb. At 10 bb the small blind pushes 58% of hands and the
  big blind calls 37%, as published equilibrium charts have it.
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
tools/push-fold.js     computes PUSH_FOLD, the push-or-fold equilibrium
tests/unit.js          engine tests, Node only
tests/e2e.js           browser tests with Playwright, at phone and desktop sizes
```

The browser keeps three things: your progress and settings (`poker.v1`), the table in play, saved after every action
(`poker.table.v1`), and the last 60 hands you played (`poker.hands.v1`).

## Run and test

```bash
cd poker
python3 -m http.server 8000          # then open http://localhost:8000
node tests/unit.js                   # 20 tests, Node only, about 10 seconds
BASE=http://localhost:8000 node tests/e2e.js   # 18 tests in Chromium (needs Playwright)
```

The unit tests count every five-card hand, check equities against known matchups and exact enumeration, read the
ranges and charts back, play 5,000 hands of random actions and 2,000 hands of the opponents with uneven stacks
checking that no chip appears or disappears, stack the deck for side pots, split pots with an odd chip, the minimum
raise and an all-in that does not reopen the betting, and check every drill against the evaluator (the combinations by
brute force). They also hold the figures the lessons quote to the engine: if a change moved one, the test says which.

The deploy (`.github/workflows/docs.yml`) runs the unit tests and copies the app to `/poker/` on GitHub Pages.
