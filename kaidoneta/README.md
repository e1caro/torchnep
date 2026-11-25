# Kaidoneta

The crew's tracker for the **One Piece Card Game Bristol Regional** (Saturday 21 November 2026), purple like the
OP17 Kaido leader. A free static web app for the phone: add it to the Home Screen and it works offline. Built from
[`prompts/kaidoneta-bristol-regional.md`](../prompts/kaidoneta-bristol-regional.md).

Live (after a merge to `master`): **https://e1caro.github.io/torchnep/kaidoneta/**

## What it does

- **The crew.** Add your friends (name, emblem, colour, the leader they pilot, a deck nickname) and choose who you
  are on this phone. Anyone can log for anyone, so one captain can run the whole crew from one phone.
- **Log a round in seconds.** Who, round (Swiss or top-cut stage), the opponent's leader (colour chips, a list of
  leaders, the ones already faced at the event) or a **crewmate** (friendly fire: the friend gets the opposite result
  automatically, and a round can't be logged twice), **WIN / LOSS / DRAW**, 1st or 2nd, plus Bo3 score, MVP card
  and notes. Every round can be edited or deleted.
- **Lightning when you win.** "GERT LUSH!", "BORO BREATH!" (won going second), "THUNDER BAGUA!" (3 in a row),
  the bounty you earned, rank-ups, thunder and vibration. "PROPER GUTTED" when you lose.
- **Bounty Board.** Wanted posters for the crew, ranked by points (win 3, draw 1), then win rate, then bounty;
  for this event or all time, with ▲▼ since the last round. A bounty only grows: a win pays ฿80M, more going second,
  on a streak, in the top cut and against a crewmate. The bounty gives a Beasts Pirates rank: Waiter → Pleasure →
  Gifter → Headliner → Tobiroppo → All-Star → Emperor.
- **Live feed** of every round, with reactions (🔥 ⚡ 🐉 💀 🍶 😭).
- **Pirate sheet**: record, points, win rate, going 1st vs 2nd, streaks, rank progress, nemesis and favourite prey,
  every matchup, 16 badges (Thunder Bagua, Onigashima Raid, Emperor of the Sea, Clifton Climber, Rocks Reunion,
  Dragon vs Dragon, Rainbow Rumble, Gear 5 Trauma…) and the rounds. **Share your wanted poster** as an image.
- **The Meta**: what the crew met at the event (leaders and colours) and how we did against each.
- **Tools for the day**: a round timer that keeps going when the app is closed (buzzes at 5 minutes and at time),
  the dragon dice for who goes first, a kit checklist and a little Bristol guide (and phrasebook).
- **Art**: original SVG drawings, no official artwork: Kaido standing in the storm, his dragon form, the Clifton
  Suspension Bridge at night with Balloon Fiesta balloons. You can put your own picture (e.g. your leader card) on
  the home screen; it stays on your phone.

## Friends on different phones

- **Online crew** (Crew tab → Create crew): a crew name and a password you share with your friends. It is an
  account in the Supabase project the other apps use (`kaido.<crew>@users.fitquest.app`, the existing `saves`
  table), so **there is nothing to set up**. Each phone keeps its own copy and every sync **merges** both copies
  record by record (newest edit wins, deletions are remembered), so two phones logging at the same moment never
  lose a round. It syncs a moment after every change, when the app comes back and every 20 s while it is open.
- **No signal?** Everything works offline and syncs later. Or Crew → *Send crew link*: the whole crew in one link
  for the group chat; opening it on another phone merges it in.

## Files

| File | What |
|---|---|
| `index.html`, `css/style.css` | The page and the purple theme |
| `js/core.js` | The crew's data: records, merging, rankings, bounties, ranks, matchups, the meta, badges, links |
| `js/cloud.js` | The online crew (Supabase REST with `fetch`, no library) |
| `js/art.js`, `js/art-kaido.js`, `js/art-dragon.js` | The drawings |
| `js/app.js` | State, header and tabs, HQ, Bounty Board, Meta, events |
| `js/log.js`, `js/player.js`, `js/tools.js`, `js/crew.js` | Log a round, pirate sheet and poster image, tools, crew page |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline and installable |
| `tests/unit.js` | Merging, friendly fire, rankings, bounties, badges, links and the online crew against a fake service |
| `tests/e2e.js` | Playwright at 375×667 and 430×932: onboarding, friends, rounds, every page, reload |
| `tools/make-icons.js`, `tools/update-sw.js` | Rebuild the icons; refresh the offline file list after any change |

```bash
node kaidoneta/tests/unit.js
node kaidoneta/tests/e2e.js
node kaidoneta/tools/update-sw.js   # after editing any file of the app
```

Fan-made for friends; not affiliated with Bandai, Shueisha or Toei Animation.
