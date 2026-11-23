# Blackjack Table

A blackjack table for the phone and the desktop: a free, static web app with no build step and no account. Choose a
table in the lobby (casino floors and online games, each with its own limits and house rules), bring your buy-in,
and play at a felt table where the cards are dealt out of the shoe, flipped and swept to the discard tray, and the
chips fly between you and the dealer. Every visit to a table is a session with its own statistics, kept in a history.

Live (after a merge to `master`): **https://e1caro.github.io/torchnep/blackjack/**

## The lobby

Choose your **buy-in** (any amount up to 10,000,000) and **currency** ($, € or £), then a table. Each table card
shows its limits, its rules in short and its house edge for someone playing perfect basic strategy.

| Table | Kind | Limits | Decks | Soft 17 | Blackjack | Dealer's second card | Options | Side bets | Edge |
|---|---|---|---|---|---|---|---|---|---|
| Las Vegas Strip | Casino floor | 25–5,000 | 6 | Hits | 3:2 | Peeks | Double any 2, DAS, split to 4, surrender | 21+3 | 0.63% |
| High-limit salon | Casino floor | 100–10,000 | 6 | Stands | 3:2 | Peeks | Double any 2, DAS, split to 4, resplit aces, surrender | – | 0.34% |
| Downtown double deck | Casino floor | 10–1,000 | 2 | Hits | 3:2 | Peeks | Double any 2, DAS, split to 4 | – | 0.53% |
| Single deck 6:5 | Casino floor | 5–200 | 1 | Hits | 6:5 | Peeks | Double any 2, split to 2 | – | 1.82% |
| Low-limit 6:5 shoe | Casino floor | 5–500 | 6 | Hits | 6:5 | Peeks | Double any 2, DAS, split to 4 | Pairs, 21+3 | 2.11% |
| Atlantic City | Casino floor | 15–5,000 | 8 | Stands | 3:2 | Peeks | Double any 2, DAS, split to 4, surrender | Pairs | 0.44% |
| Reno | Casino floor | 10–1,000 | 6 | Hits | 3:2 | Peeks | Double 10–11, split to 4 | – | 1.04% |
| European casino | Casino floor | 5–500 | 6 | Stands | 3:2 | No hole card | Double 9–11, DAS, split to 2 | – | 0.75% |
| Online classic | Online | 1–500 | 6 | Stands | 3:2 | Peeks | Double any 2, DAS, split to 2, shuffled every hand | Pairs | 0.45% |
| Live dealer studio | Online | 5–2,500 | 8 | Stands | 3:2 | No hole card | Double any 2, DAS, split to 2 | Pairs, 21+3 | 0.68% |
| Six-card Charlie | Online | 1–250 | 6 | Stands | 3:2 | Peeks | Double any 2, DAS, split to 4, surrender, 6-card Charlie, shuffled every hand | – | 0.22% |
| Online VIP | Online | 50–20,000 | 8 | Stands | 3:2 | Peeks | Double any 2, DAS, split to 4, resplit aces, surrender, shuffled every hand | 21+3 | 0.26% |

The tables follow the rule sets commonly found in those kinds of places; they are not copies of any particular
casino or game provider. **Change the rules of this table** opens every rule of the chosen table:

- **Limits**: minimum bet (1 to 1,000), maximum bet (50 to 50,000). The chip tray offers the chips that suit them.
- **Shoe and dealer**: 1, 2, 4, 6 or 8 decks; shuffle every hand (as online games do) or a cut card at 50% to 90%;
  the dealer **peeks** for blackjack under an ace or a ten (American), or takes the second card **after you**
  (European: a dealer blackjack takes doubles and splits too), or after you but taking **only your first bet**;
  dealer stands or hits soft 17; blackjack pays 3 to 2, 6 to 5 or 1 to 1; insurance offered or not.
- **Your options**: double on any two cards, 9 to 11, 10 or 11, or never; double after split; split up to 2, 3 or 4
  hands; resplit aces; hit split aces; late surrender (without a hole card: not against an ace); a 5, 6 or 7-card
  **Charlie** (that many cards without busting win at once).
- **Side bets**: **Perfect Pairs** (your first two cards: mixed pair 6, coloured 12, perfect 25 to 1) and **21+3**
  (your two cards and the dealer's up card as a poker hand: flush 5, straight 10, three of a kind 30, straight
  flush 40, suited three of a kind 100 to 1), with a side bet maximum.

The changed table can be saved under a name in **My tables**, next to the casino ones.

## At the table

- **Bet** with chips; **Clear**, **Rebet** and **Rebet ×2** (side bets included). At a table with side bets, tap
  the small **Pairs** or **21+3** circle and the next chips go there; side bets are paid (or taken) as soon as the
  first cards are out, with the result on the circle. Tapping Deal while chips are still flying deals when they land.
- **Hit, Stand, Double, Split, Surrender**, and **Insurance** or **Even money** when the dealer shows an ace.
- **Animations**: cards fly from the shoe and flip over in flight, the dealer lifts the hole card to peek and turns
  it over, split cards slide apart into new hands, results pop up, chips are paid from the dealer and swept to your
  bankroll (or to the dealer), the cards are swept to the tray, a fresh shoe is riffled (a quick shuffle at tables
  that shuffle every hand). Speed: off, fast, normal or slow (off by default if your device asks for reduced motion).
- The felt is printed with the table's rules, the top bar shows the table and its limits, and each table has its
  felt colour (green, blue or burgundy; you can change it, and the card backs, in the menu).
- **Basic strategy hints** (optional): the move the chart recommends for these rules lights up, with the reason
  ("Hard 16 vs 10"), and a note tells you when you leave it. **Card count** (optional): Hi-Lo running and true count.
- **Out of chips**: rebuy at your buy-in, or leave the table.
- The game is saved in the browser after every step, so a reload (or closing the tab) carries on mid-round.
- Keys on a computer: `H` hit, `S` stand, `D` double, `P` split, `R` surrender, `Y`/`N` insurance, `Enter` deal
  (or deal again), `Backspace` clear the bet, `C` change the bet after a round, `Esc` close a sheet.

## Statistics

A **session** is one visit to a table: it starts when you sit down and ends when you **leave the table** (menu, or
statistics); then you see how it went and it joins your history. Statistics has four tabs:

- **Session**: result, chips, rounds, a line of your chips after every round, won/pushed/lost; money (buy-in,
  rebuys, total and average bet, biggest bet, best and worst round, peak, low, return on bets); play (hands, rounds
  per hour, blackjacks, busts, doubles won, splits, surrenders, Charlies, insurance taken and won, longest winning
  and losing runs, how often your moves matched the chart); the dealer (busts, blackjacks); side bets (bets, wins,
  result and their exact house edge for the deck count); the rules. Time played counts the gaps between your moves,
  leaving out breaks longer than ten minutes.
- **Hands**: the last 150 rounds of the session, newest first: your cards and the dealer's, totals, each hand's
  result, side bets and insurance, and what the round won or lost.
- **History**: every finished session (table, date, time, rounds, a small chip line, result), each one opening the
  full session view; copy the history as CSV, remove a session, or clear it all.
- **All time**: everything added up (result, sessions, time, rounds, total bet, return, sessions in profit, best
  and worst session, best round, blackjacks, chart accuracy, side bets) and a table of results by table.

## Files

```
index.html             the page: table, controls and the sheets (lobby, menu, statistics)
css/style.css          the table, the cards and chips (drawn in CSS and SVG, no images), the lobby and the sheets
js/engine.js           the rules: tables, shoe, round state machine, side bets, payouts, basic strategy, house edge,
                       per-session statistics and hand log (no DOM)
js/app.js              drawing, animations, input, lobby, sessions, statistics, saving
js/sound.js            the sounds
icons/, manifest.webmanifest   home-screen icon and app manifest (tools/make-icons.js draws the PNGs)
tests/unit.js          engine tests, Node only
tests/e2e.js           browser tests with Playwright
```

The engine keeps the whole game in one plain JSON object, with money in cents (3:2 on an odd bet pays half chips).
Player actions change it at once; everything the table does by itself (dealing, side bets, the peek, the dealer's
turn, paying) happens one visible step at a time through `BJ.step()`, which is what lets the page animate each step
and save between them. The browser keeps three things: the game in play (`blackjack.v1`), the finished sessions
(`blackjack.sessions.v1`, the last 200) and your saved tables (`blackjack.tables.v1`). A game saved by the first
version of the app opens at a table called "Your table".

## Run and test

```bash
cd blackjack
python3 -m http.server 8000          # then open http://localhost:8000
node tests/unit.js                   # 59 tests, Node only, about 2 seconds
BASE=http://localhost:8000 node tests/e2e.js   # 30 tests in Chromium (needs Playwright)
```

The unit tests stack the shoe to check every rule and payout (no hole card, first bet only, Charlie, continuous
shuffle, side bets), play thousands of random rounds at every table with random side bets checking that no money
appears or disappears, check that the chart plays every table, and play 150,000 rounds of basic strategy to check
the house edge (about 0.42% for 6 decks, stands on soft 17, late surrender).

The house edge of a table adds the usual published effect of each rule to a base taken from 4 million simulated
rounds of this engine; each table in the lobby lands within about 0.15% of 3 million simulated rounds of its own.
The side bet edges are exact (counted over every combination of cards) and match the published figures: Perfect
Pairs 4.10% and 21+3 3.70% with 8 decks.

The deploy (`.github/workflows/docs.yml`) runs the unit tests and copies the app to `/blackjack/` on GitHub Pages.
