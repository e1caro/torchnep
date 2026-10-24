# FitQuest

Free, offline-first workout app (PWA). Nothing to pay for, no accounts, no ads; all data stays on the device.

- **Profile and coach:** age, gender, height, weight, target weight, goal, experience, equipment, days, session length, focus muscles and limitations (knees, lower back, shoulders, wrists). An on-device coach turns that into BMI, calorie and macro targets and a split with exercises chosen for you. It is an algorithm, not a cloud AI model, so it works offline and sends nothing anywhere.
- **Plans:** full body, upper/lower or push/pull/legs, with extra sets for the muscles you want to bring up and low-impact choices for older users or higher BMI.
- **Workouts:** exercise demo loop, weight and reps per set (pre-filled from last time), rest timer.
- **Game layer:** XP and levels (every set, workout, record and quest earns XP), daily quests, a weekly boss that takes damage from each workout, coins, a daily check-in, badges and sound effects.
- **Rewards:** levelling up unlocks 21 **dungeons** (special workouts from Tabata Blitz at level 2 to the Olympian Gauntlet at level 28, built from your own equipment and limits, with a bonus-XP "dungeon of the day"), 12 app **themes**, 16 hero avatars, 6 animated avatar rings and titles earned from badges. Anything can also be unlocked early with coins.
- **Loot chests:** wooden, silver and golden chests drop from dungeons, the weekly boss, the daily bonus and every 5th level, and can contain coins, XP, cosmetics or an early dungeon unlock.
- **Progress:** body-weight chart against your target, volume per workout, personal records, history.

## Gym pass
The Hero tab and the Today screen have an **Open Synergym** button that launches the Synergym member app on Android (default app id `digifit.android.virtuagym.pro.synergym`, editable under "Wrong app opens?"). FitQuest never handles your Synergym login. If your gym's QR is fixed you can also save a screenshot of it and show it full screen; a code that changes each time cannot be saved.

## Install on a phone
It is published with the docs site at `/fitcoach/` (repo Settings → Pages → Source: GitHub Actions; see `.github/workflows/docs.yml`).
Open the URL in Chrome (Android) or Safari (iOS) → menu → **Install app / Add to Home Screen**. Open it once online; viewed exercises then work offline.

Local test: `python3 -m http.server -d fitai-app 8000`.

## Exercise media
876 exercises with instructions and start/end pose photos come from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db). The "video" is a looping animation of the two photos.
To use real video for an exercise, add `"<exercise id>": "<mp4 URL or 11-char YouTube id>"` to `data/videos.json`. Only use videos you have the rights to.
