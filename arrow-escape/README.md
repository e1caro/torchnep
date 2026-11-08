# Bounce Arrows

An arrow-escape puzzle game for phones: slide every arrow off the board, but nothing may be in its way.
Built as a plain HTML5 / Canvas app (no build step, no dependencies), installable as a PWA and ready
to be wrapped as an Android app for Google Play.

> This folder is self-contained. To move it into its own repository:
> `git subtree split -P arrow-escape -b arrow-escape-only` and push that branch to a new repo.

## Play it

```bash
python3 -m http.server 8000 --directory arrow-escape   # then open http://localhost:8000 on your phone/PC
node arrow-escape/tests/levels.test.js                  # 400 levels + 120 daily boards must all be solvable
```

## Why it can stand out from the copies

The arrow-escape genre (Arrow Puzzle, Arrows - Puzzle Escape, Block Crush ...) is a crowded, copy-paste
market where every game is "tap the arrow, it slides out". This one keeps the part players already
understand and adds things the top games don't have:

| Feature | What it does | Why it matters for revenue |
|---|---|---|
| **Bounce arrows** (gold, dashed) | The arrow slides to the wall, turns 90 degrees and runs along it. Hold one to preview its path. | A real new puzzle mechanic, so ads/store listing can say "arrows that bounce", not just "another arrow game". |
| **Chain arrows** (white glow) | When they leave, every free neighbour leaves too, with a combo counter and bonus coins. | Satisfying cascades make good ad creatives (the video is the ad). |
| **Daily puzzle + share card** | Same seeded board for everyone each day, streak counter, Wordle-style share text. | Free organic installs: players post results. Streaks drive day-7 / day-30 retention. |
| **Provably solvable infinite levels** | Procedural generator, solvable by construction, deterministic across devices (tested). | Zero level-design cost, unlimited content, easy to A/B test the difficulty curve. |
| **Hearts + smart hints** | Blocked arrow = lost heart. Hint picks the free arrow that unblocks the most others. | Natural, non-annoying places for rewarded ads. |

## How it is meant to earn money

Puzzle games earn from ads, so revenue is roughly `installs x retention x ad impressions per user x eCPM`.

- **Rewarded video** (best revenue, players choose it): continue after losing all hearts (+2 hearts),
  free hint, x2 coins on level clear. Already wired in `game.js`.
- **Interstitial** between levels: from level 4, every 3rd level, at most once per 75 s. Tunable in
  `monetization.js` (`Ads.cfg`). Never shown to players who bought "Remove ads".
- **Remove ads** in-app purchase (`remove_ads`): the one IAP; typically a few percent of players buy it.
- Daily streak + share card for free growth.

Be realistic: **the code is the cheap part.** Hit games in this genre reach millions of installs through
paid user acquisition and constant testing of creatives and difficulty. Revenue only appears if
`lifetime ad revenue per player > cost to acquire that player`. Plan on:

1. Launch, watch **D1 / D7 retention, level-fail rate, rewarded opt-in rate, ad revenue per daily user**.
   Every one of these events is already logged through `Metrics.track(...)` (see below).
2. Tune the difficulty curve (`levelConfig` in `levels.js`) and ad frequency until D1 > ~35% and D7 > ~10%.
3. Only then spend small amounts on installs (test 3-5 gameplay-video ads, keep the ones with the lowest cost per install).

## What is a demo right now (and what you must do to ship)

| Piece | Now | To go live |
|---|---|---|
| Ads | `monetization.js` shows a fake 3-second "demo ad" | Install `@capacitor-community/admob` in the Android wrapper and call `Ads.setProvider({interstitial, rewarded})` with your AdMob unit IDs. |
| Remove-ads purchase | Fake alert | Add a Play Billing plugin (e.g. RevenueCat Capacitor SDK) and call `Billing.setProvider({purchase})`. |
| Analytics | Local ring buffer in `localStorage` (`ba.events`) | Define `window.BA_ANALYTICS = { track(name, params) {...} }` forwarding to Firebase Analytics / GameAnalytics. |
| Name / icon | Working title "Bounce Arrows", placeholder icon | Check the name is free on Google Play and replace `icons/`. |

Events already tracked: `app_open, level_start, level_win, level_fail, hint_used, rewarded_offer, rewarded_done,
rewarded_skipped, interstitial_show, purchase_start, purchase_done, purchase_cancel, share`.

## Publishing to Google Play

1. `npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android` inside a new repo containing this folder as `www/`.
2. `npx cap init "Bounce Arrows" com.yourname.bouncearrows --web-dir www && npx cap add android`
3. Add AdMob + billing plugins, set the providers above, `npx cap sync android`.
4. Open `android/` in Android Studio, build a signed **AAB**, upload it with your Google Play developer account
   (one-time 25 USD fee). New personal developer accounts have been required to run a closed test (about 12 testers for 14 days) before production; check the current Play Console rules.
5. Needed for the store listing: privacy policy URL (ads and analytics must be declared), 512 px icon, feature graphic, screenshots.

## Files

| File | Role |
|---|---|
| `levels.js` | Rules, difficulty curve, deterministic level generator (no DOM, also runs in Node) |
| `game.js` | Rendering (canvas), input, hearts/hints/coins, daily + streak, win/fail flow |
| `monetization.js` | Ads / purchases / analytics adapters (demo implementations) |
| `i18n.js` | English and Spanish strings |
| `tests/levels.test.js` | Solvability, determinism and cross-device fingerprint tests |

## Tuning cheat sheet (all in `levels.js`, `levelConfig`)

- Board grows from 5x5 to 11x11 by level ~24; snakes get longer up to 6 cells.
- Chain arrows appear from level 4, bounce arrows from level 8.
- `density` controls how packed the board is (more packed = more blocked arrows = harder).
- Changing the generator changes every level and the daily board: update the fingerprints in the test on purpose.
