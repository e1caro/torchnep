# Hi-Lo trainer

A static web app (no build step) for learning to count cards at blackjack with the Hi-Lo system. Six stages, each
with a drill and a standard to meet before moving on:

1. **Basic strategy**: random hands until 100 are right in a row; the chart for the rules in force is one tap away.
2. **Running count**: cards flashed at 1 to 4 a second or tapped through; a deck of 51 in 30 seconds, three times.
3. **True count** and 4. **the bet ramp**: a running count and a discard tray; give the true count and the bet.
5. **Deviations**: insurance and the Illustrious 18 at counts near each index.
6. **Full table**: a dealt shoe with bets, doubles and splits, surprise checks of the running count, and a bankroll.

**Rules and bankroll** sets the table being trained for: decks (4, 6, 8), dealer hits or stands on soft 17, hole card
or none (European), double on any two cards / 9 to 11 / 10 or 11, double after split, how many hands a pair can become,
3 to 2 or 6 to 5, where the cut card goes, the buy-in (any number of extra buy-ins can be added at the table, each one
counted) and the biggest bet (5 to 20 units). The chart, the list of deviations, the practice table and the simulation
follow the rules. Presets: the standard shoe and **Sevilla casino**, the rules Andalusian casinos play by (Order of
4 February 2010, BOJA 39: six decks, no hole card, the dealer stands on every 17, double on any two cards and after a
split, split aces get one card, 3 to 2, no surrender). **The edge** runs a million simulated hands under those rules.

## Files

```
index.html     the page and its styles
engine.js      rules, chart, deviations, true count, bet ramp, Monte Carlo (no DOM; also runs in Node)
app.js         the drills, the practice table, the settings, saving (localStorage)
tests/sim.js             node tests/sim.js [hands]: the edge under several rule sets
tests/strategy_check.py  the chart against an independent expected-value calculation, for 8 mixes of rules
tests/exact6.js          exact six-deck values for the chart's close calls
```

The chart matches the calculation in every cell of every mix of rules except soft 13 v 5 and soft 15 v 4, which an
infinite deck calls a hit by under 0.01 units and six real decks call a double (`exact6.js`). The index numbers of
the deviations are the published ones, not re-derived. Standard rules, 60 million simulated hands: −0.42% playing
basic strategy with flat bets, +0.49% betting 1 to 12 units with the count, +0.74% with the deviations too.
