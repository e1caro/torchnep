# Prompt: Kaidoneta, our One Piece regional tracker

Build **Kaidoneta**, a phone app for a crew of friends going to a **One Piece Card Game regional in Bristol**
(Saturday 21 November 2026), where I play the **Kaido leader from OP17 (purple)**. Put it in a new folder
`kaidoneta/`: a static PWA like `bloomdoku/` (plain HTML, CSS and JavaScript, no build step, no libraries, works
offline, added to the Home Screen from Safari or Chrome). It must be ready to use the next morning, in a busy venue
with bad signal, one-handed, between rounds.

It should feel like joining the Beasts Pirates for the day: purple and lightning, Kaido looming over the Clifton
Suspension Bridge, every win raising your bounty, and a ranking of the crew that everyone checks after each round.

## 1. What it does

1. **The crew (friends).** Add each friend: name, an emoji avatar, a colour, the leader they pilot (name + card
   colours + set, default *Kaido · OP17 · purple*) and an optional deck name. Choose who "me" is on this phone. Anyone
   can log a result for anyone (one captain can run the whole crew from one phone). Two profiles with the same name
   can be merged.
2. **Events.** The Bristol Regional is created on first launch (the same id on every phone, so crews never get two
   copies). More events (locals, store championships) can be added; the Swiss round count and the round length are
   settings of each event.
3. **Log a round in seconds.** Who, round (auto: next Swiss round; or a top-cut stage), opponent leader (colour chips
   + a searchable list of common leaders + "faced today" at the top + type any name), opponent's name (optional), or
   *a crew member* (friendly fire: the friend gets the opposite result automatically), **WIN / LOSS / DRAW** as big
   buttons, went 1st or 2nd, Bo1 or Bo3 (game score), the MVP card and notes. Every match can be edited or deleted.
4. **Bounty Board (the ranking).** Wanted-poster cards for the crew, ranked by Swiss points (win 3, draw 1), then
   win rate, then bounty; for this event or all time. Each pirate has a **bounty in berries** that only grows:
   wins, wins going second, win streaks, top-cut wins and beating a crewmate all pay. The bounty gives a **Beasts
   Pirates rank**: Waiter → Pleasure → Gifter → Headliner → Tobiroppo → All-Star → Emperor. Movement since the last
   round (▲▼) is shown.
5. **Live feed.** Every logged round becomes a card ("R3 · Javi beat Enel going 2nd ⚡"), and the crew can react to
   it (🔥 ⚡ 🐉 💀 🍶 😭).
6. **Stats.** Per pirate: record, win rate, going first vs second, current and best streak, the leaders faced with
   W-L each, a **Nemesis** (the leader they lose to most) and **Favourite prey**. For the crew, a **Bristol meta**
   page: which leaders and colours the crew met, and the crew's record against each.
7. **Achievements**, computed from the matches (nothing extra stored), Kaido and Bristol flavoured: Thunder Bagua
   (3 wins in a row), Boro Breath (win going second), Onigashima Raid (5 wins at one event), Emperor of the Sea
   (Swiss undefeated), Clifton Climber (top cut), Rocks Reunion (beat Big Mom), Dragon vs Dragon (win a Kaido mirror),
   Rainbow Rumble (beat all six colours), Comeback (lose round 1, then win 3 in a row), Gert Lush (4+ wins at one
   event), Gear 5 Trauma (lose to Luffy), Friendly Fire (beat a crewmate).
8. **Tools for the day:** a round timer (preset to the event's round length, warns at 5 minutes and at time, big
   enough to read across a table), a "who goes first" dragon dice roll, a tournament kit checklist (deck, DON!!,
   sleeves, playmat, decklist, ticket, charger...), and a short list of Bristol spots for after the event.
9. **Share.** A wanted-poster image (record, bounty, rank, leader, badges) to post in the group chat, made on the
   phone (canvas) and shared with the share sheet or downloaded.

## 2. Friends on different phones (sync)

- **Online crew:** a crew is a name + a crew password that the friends share. It is an account in the Supabase
  project the other apps already use (`kaido.<crew>@users.fitquest.app`, the existing `saves` table; **no new
  SQL**). Each phone keeps its own copy and every sync **merges** both copies record by record (newest edit wins,
  deletions kept as tombstones), so two phones logging at once never lose a round. Sync a few seconds after every
  change, when the app comes back to the screen and every ~20 s while it is open.
- **No signal?** Everything works offline and syncs later. As a backup, "Send by link" packs the crew's data into a
  link for WhatsApp; opening it on another phone merges it in.

## 3. Look and feel

- **Purple is the main colour** (Kaido's leader colour): deep Onigashima night, violet and royal purple, lightning
  gold and an oni-red accent; the six card colours only for leader chips.
- **Kaido art, original and well integrated** (hand-drawn SVG, no official artwork): Kaido in silhouette with his
  horns, mane and club on the home screen; his purple dragon form coiling over the Clifton Suspension Bridge;
  lightning when you log a win; horns on the crew's avatars; a crest for the app icon. Hot-air balloons (Balloon
  Fiesta) and the harbour skyline for Bristol. Optionally, set your own picture (e.g. a photo of your leader card)
  as the home hero, kept on that phone only.
- Bristolian and Spanish touches in the copy: "Gert lush!" on a win, "Proper gutted" on a loss, "¡Vamos Kaidoneta!".
- Strong type, big touch targets, animations that respect "reduce motion", sounds and vibration that can be turned
  off.

## 4. Phone

- Installable (Add to Home Screen), offline after the first visit, full screen, portrait; safe areas for the notch
  and home bar; the main actions in the thumb zone; 44 px+ touch targets; no sideways scrolling at 360–430 px wide.
- Saved after every change (iOS can close web apps at any time).
- Served from GitHub Pages at `/kaidoneta/` with the rest of the site (`.github/workflows/docs.yml`).

## 5. Done when

- Unit tests (`node kaidoneta/tests/unit.js`) cover merging, friendly-fire mirroring, rankings, bounties,
  achievements and the crew sync against a fake service.
- A Playwright run at 375×667 and 430×932 goes through onboarding, adding friends, logging rounds and the ranking,
  with screenshots, and no console errors.
