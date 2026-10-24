# FitQuest

Free, offline-first workout app (PWA). Nothing to pay for, no accounts, no ads; all data stays on the device.

- **Profile and coach:** age, gender, height, weight, target weight, goal, experience, equipment, days, session length, focus muscles and limitations (knees, lower back, shoulders, wrists). An on-device coach turns that into BMI, calorie and macro targets and a split with exercises chosen for you. It is an algorithm, not a cloud AI model, so it works offline and sends nothing anywhere.
- **Plans:** full body, upper/lower or push/pull/legs, with extra sets for the muscles you want to bring up and low-impact choices for older users or higher BMI.
- **Workouts:** exercise demo loop, weight and reps per set (pre-filled from last time), rest timer.
- **Game layer:** XP and levels (every set, workout, record and quest earns XP), daily quests, a weekly boss that takes damage from each workout, coins, a daily check-in, badges and sound effects.
- **Rewards:** levelling up unlocks 21 **dungeons** (special workouts from Tabata Blitz at level 2 to the Olympian Gauntlet at level 28, built from your own equipment and limits, with a bonus-XP "dungeon of the day"), 12 app **themes**, 16 hero avatars, 6 animated avatar rings and titles earned from badges. Anything can also be unlocked early with coins.
- **Loot chests:** wooden, silver and golden chests drop from dungeons, the weekly boss, the daily bonus and every 5th level, and can contain coins, XP, cosmetics or an early dungeon unlock.
- **Meal plan:** 56 everyday recipes plus 21 chef recipes you unlock with coins or levels (breakfast, lunch/dinner, snacks) with calories and macros worked out from ingredient weights. Pick your diet (vegan, vegetarian, pescatarian), allergies, meals per day and how long you can cook on each day (15, 30 or 60 minutes). Portions are scaled to hit your calorie target, there is a swap button per meal, a weekly shopping list, and logging a meal earns XP.
- **Cuisines:** pick one or more of Spanish, Italian, Chinese, Japanese, Mexican, Indian, Greek, Thai and Middle Eastern (about 150 recipes in total). Lunches and dinners come from your cuisines; if your diet or allergies leave too few, other cuisines fill in and the app says so.
- **Few ingredients:** the planner builds the whole week around the ingredients it already needs. A Variety setting (Simple, Balanced, Varied) trades shopping-list size for variety; Simple weeks use about 14 to 20 ingredients instead of about 50; a refinement step swaps meals one at a time to shorten the list, and chef recipes you have unlocked get fixed spots in the week and repeat meals so you can prep once and eat twice.
- **More ways to earn:** water and sleep logging, a daily spin, weekly quests, a check-in streak, perfect-nutrition-day bonus and more, listed on the Ways to earn screen.
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
