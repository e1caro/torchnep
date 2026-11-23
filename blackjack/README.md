# Blackjack Table

A blackjack table for the phone and the desktop: a free, static web app with no build step and no account. You pick
how much money you start with, how many decks are in the shoe and the house rules, then play at a felt table where
the cards are dealt out of the shoe, flipped and swept to the discard tray, and the chips fly between you and the
dealer.

Live (after a merge to `master`): **https://e1caro.github.io/torchnep/blackjack/**

## What you can set

**Money**
- Starting bankroll: type any amount up to 10,000,000, or tap 100, 500, 1,000, 5,000, 10,000 or 100,000.
- Currency: dollars, euros or pounds.
- Table limits: minimum bet (1 to 1,000) and maximum bet (50 to 50,000). The chip tray offers the chips that suit the
  table.

**Shoe and dealer**
- Decks: 1, 2, 4, 6 or 8.
- Reshuffle point (penetration): 50% to 90% of the shoe. The gauge beside the shoe shows the cards left and a red
  line for the cut card.
- Dealer stands on all 17s, or hits soft 17.
- Blackjack pays 3 to 2, 6 to 5 or 1 to 1.
- Insurance offered or not.

**Your options**
- Double down on any two cards, only on 9 to 11, only on 10 or 11, or never.
- Double after a split.
- Split up to 2, 3 or 4 hands (or no splits); resplit aces; hit split aces.
- Late surrender.

Five houses fill all of these in at once: **Vegas Strip**, **Downtown**, **Single deck**, **Player friendly** and
**Tourist 6:5**. The start button shows the house edge of the rules you chose (for someone playing perfect basic
strategy) so you can see what 6:5 or hitting soft 17 costs.

## At the table

- **Bet** with chips; **Clear**, **Rebet** and **Rebet ×2**. Tapping Deal while chips are still flying deals as
  soon as they land.
- **Hit, Stand, Double, Split, Surrender**, and **Insurance** or **Even money** when the dealer shows an ace. The
  dealer peeks for blackjack under an ace or a ten, as in American casinos.
- **Animations**: cards fly from the shoe and flip over in flight, the hole card turns over, the dealer lifts the
  corner of the hole card to peek, split cards slide apart into new hands, results pop up, chips are paid from the
  dealer and swept to your bankroll (or to the dealer), the cards are swept to the tray, and a fresh shoe is
  riffled. Speed: off, fast, normal or slow (off by default if your device asks for reduced motion).
- **Basic strategy hints** (optional): the move the chart recommends for these rules lights up, with the reason
  ("Hard 16 vs 10"), and a note tells you when you leave it.
- **Card count** (optional): the Hi-Lo running count and true count.
- **Statistics**: chips now, session result, peak, a line of your bankroll after every round, won/pushed/lost,
  blackjacks, busts, doubles, splits, best and worst rounds, return on bets and how often your moves matched the chart.
- **Out of chips**: rebuy at the starting bankroll, or start a new game.
- The game is saved in the browser after every step, so a reload (or closing the tab) carries on mid-round.
- Felt in green, blue or burgundy; red, blue or black card backs; sounds made with Web Audio (no sound files).
- Keys on a computer: `H` hit, `S` stand, `D` double, `P` split, `R` surrender, `Y`/`N` insurance, `Enter` deal
  (or deal again), `Backspace` clear the bet, `C` change the bet after a round, `Esc` close a sheet.

## Files

```
index.html             the page: table, controls and the three sheets (setup, menu, statistics)
css/style.css          the table, the cards and chips (drawn in CSS and SVG, no images) and the sheets
js/engine.js           the rules: shoe, round state machine, payouts, basic strategy, house edge (no DOM)
js/app.js              drawing, animations, input, saving
js/sound.js            the sounds
icons/, manifest.webmanifest   home-screen icon and app manifest (tools/make-icons.js draws the PNGs)
tests/unit.js          engine tests, Node only
tests/e2e.js           browser tests with Playwright
```

The engine keeps the whole game in one plain JSON object, with money in cents (3:2 on an odd bet pays half chips).
Player actions change it at once; everything the table does by itself (dealing, the peek, the dealer's turn,
paying) happens one visible step at a time through `BJ.step()`, which is what lets the page animate each step and
save between them.

## Run and test

```bash
cd blackjack
python3 -m http.server 8000          # then open http://localhost:8000
node tests/unit.js                   # 41 tests, Node only, about a second
BASE=http://localhost:8000 node tests/e2e.js   # 23 tests in Chromium (needs Playwright)
```

The unit tests stack the shoe to check every rule and payout, play thousands of random rounds under each house
checking that no money appears or disappears, and play 150,000 rounds of basic strategy to check the house edge
(about 0.42% for the Vegas Strip rules). The house edge shown in the app adds the usual published effect of each
rule to a base taken from 4 million simulated rounds of this engine; the five houses land within 0.05% of their own
simulations.

The deploy (`.github/workflows/docs.yml`) runs the unit tests and copies the app to `/blackjack/` on GitHub Pages.
