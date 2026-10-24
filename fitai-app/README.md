# FitQuest

Free, offline-first workout app (PWA). Nothing to pay for, no accounts, no ads; all data stays on the device.

- **Profile and coach:** age, gender, height, weight, target weight, goal, experience, equipment, days, session length, focus muscles and limitations (knees, lower back, shoulders, wrists). An on-device coach turns that into BMI, calorie and macro targets and a split with exercises chosen for you. It is an algorithm, not a cloud AI model, so it works offline and sends nothing anywhere.
- **Plans:** full body, upper/lower or push/pull/legs, with extra sets for the muscles you want to bring up and low-impact choices for older users or higher BMI.
- **Workouts:** exercise demo loop, weight and reps per set (pre-filled from last time), rest timer.
- **Game layer:** XP and levels (every set, workout, record and quest earns XP), daily quests, a weekly boss that takes damage from each workout, coins, a daily check-in, badges and sound effects.
- **Two separate reward streams.** *Levels* unlock new **meals** (21 chef recipes), new **workouts** (21 dungeons, from Tabata Blitz at level 2 to the Olympian Gauntlet at level 28) and **perks** such as XP and coin boosts, a fourth daily quest, a second daily spin, a rest-day shield for your streak, bigger boss loot and bigger record bonuses. *Coins* buy looks and boosts only: 30 more profile pictures (16 simple ones are free from the start), 6 animated rings, 8 banners, 12 app themes, an XP booster, extra spins and chests. Nothing can be bought with coins that levels give, and the other way round.
- **Profile editor:** tap your avatar or Hero → Edit profile and looks to pick your name, profile picture, ring, banner, theme and title from everything you own, and to edit your body data and training plan.
- **Icons:** profile pictures, quests, bosses, dungeons, badges and chests use minimalist icons from game-icons.net (credit below), tinted by the theme.
- **Loot chests:** wooden, silver and golden chests drop from dungeons, the weekly boss, the daily bonus and every 5th level, and can contain coins, XP, cosmetics or an early dungeon unlock.
- **Meal plan:** 56 everyday recipes plus 21 chef recipes you unlock with coins or levels (breakfast, lunch/dinner, snacks) with calories and macros worked out from ingredient weights. Pick your diet (vegan, vegetarian, pescatarian), allergies, meals per day and how long you can cook on each day (15, 30 or 60 minutes). Portions are scaled to hit your calorie target, there is a swap button per meal, a weekly shopping list, and logging a meal earns XP.
- **Anti-inflammatory style:** choose "Anti-inflammatory" under Eating style in the meal setup and the whole week is built from meals based on fatty fish, leafy greens, vegetables, berries, nuts, beans and olive oil, with no red meat, refined pasta or added sugar (about 90 recipes qualify, including 19 written for it). It combines with your diet, allergies, cuisine and cooking time. General nutrition guidance, not medical advice.
- **Cuisines:** pick one or more of Spanish, Italian, Chinese, Japanese, Mexican, Indian, Greek, Thai and Middle Eastern (about 150 recipes in total). Lunches and dinners come from your cuisines; if your diet or allergies leave too few, other cuisines fill in and the app says so.
- **Few ingredients:** the planner builds the whole week around the ingredients it already needs. A Variety setting (Simple, Balanced, Varied) trades shopping-list size for variety; Simple weeks use about 14 to 20 ingredients instead of about 50; a refinement step swaps meals one at a time to shorten the list, and chef recipes you have unlocked get fixed spots in the week and repeat meals so you can prep once and eat twice.
- **More ways to earn:** water and sleep logging, a daily spin (a real prize wheel with a drum roll, cymbal and fanfare made with Web Audio, and a jackpot slice), weekly quests, a check-in streak, perfect-nutrition-day bonus and more, listed on the Ways to earn screen.
- **Progress:** body-weight chart against your target, volume per workout, personal records, history.

## Gym pass
The Hero tab and the Today screen have an **Open Synergym** button that launches the Synergym member app on Android (default app id `digifit.android.virtuagym.pro.synergym`, editable under "Wrong app opens?"). FitQuest never handles your Synergym login. If your gym's QR is fixed you can also save a screenshot of it and show it full screen; a code that changes each time cannot be saved.

## My routines

Build your own workouts by hand on the Plan screen: name a routine, add exercises from the library (search works in English and Spanish), set sets, reps (a number or a time like 30s) and rest, and reorder or remove them. Any exercise page has "Add to a routine". Routines start like any workout and give the same XP, quests and ranks. Code in `routines.js`.

## Sports Academy

Pick a sport (football, futsal, basketball, tennis, rugby, volleyball, running, combat sports) and a position (for example striker or goalkeeper in football). Each position has four drills built from your equipment, unlocking with career level. Drills raise six attributes (speed, power, stamina, agility, strength, core) and give normal XP plus a drill bonus. Your overall rating (OVR) weights the attributes by position and shows on a player card that changes from bronze to icon. Reach OVR milestones to open chests, and once a week, after two drills, play a match against an opponent whose result depends on your rating and your preparation. Everyday workouts also raise the attributes a little. Content and balance are in `sport.js`.

## Bets
On Ways to earn → **Bets** you stake coins on your own goals: train, clear a dungeon or the dungeon of the day, log sets, set a new record, earn XP, sleep 7 h+, eat your planned meals, hit your water goal, claim every daily quest, train N times or minutes or on N different days, defeat the weekly boss, win (or not lose) your Academy match, reach a training streak or the next level, lift N kg or do N reps, do N different exercises, train each muscle group (today: 1.00 each, combining 2–6 muscles pays ×1.5 to ×3.6), do a 60-minute workout, train in the morning, at night or both weekend days, sleep 7 h on N nights, weigh in, lose or gain weight toward your goal, have a perfect nutrition day, unlock a badge, do Academy drills or raise your OVR. Goals are grouped into Training, Muscles, Health and Game. One pick is a single bet. Two to five picks make a combined bet, and their odds multiply. Odds come from your last four weeks (a goal you rarely reach pays more, up to 4.00; combined bets up to 20.00), training picks in the same combined bet cut the odds by 15% each, and two picks that one workout would win together cannot be combined. Goals come in five tabs: today, this week, next week (open for bets until Sunday night), this month and next month (open until the end of this month). Bets settle on their own as soon as every pick comes true, or when one runs out of time. Tick **Repeat** on a bet whose picks are all daily, all weekly or all monthly and it is placed again for the next day, week or month when it ends (same goals and stake, fresh odds); stop it from My bets. Odds are kept low: easy goals pay 1.00 (stake back) and training once in a week or month never pays. Stakes are 5 to 300 coins, up to 8 open bets. Game coins only. Code in `bets.js`.

## Exercise ranks

Every exercise with weights or reps gets a rank from Iron through Bronze, Silver, Gold, Platinum and Diamond up to Legend, based on your best set. The Gold standard is a typical intermediate lifter, scaled to your age, height, weight and sex (lean mass is estimated from height and weight). Loaded lifts use an estimated one-rep max; bodyweight moves use reps. Ranks show on the exercise page, during workouts and on the Progress screen, and a rank-up in a workout gives bonus XP. Standards are rough estimates in `ranks.js`.

## Languages

English and Spanish. The language is picked from the phone on first run and can be switched at any time in the Hero screen (or on the first setup page). The app text is written in English; when Spanish is selected, `i18n.js` translates every piece of text as it reaches the screen, using `es-ui.js` (interface), `es-food.js` (ingredients, recipes, steps) and `data/es-exercises.json` (exercise names and instructions, loaded only in Spanish). Anything without a translation simply stays in English.

## Credits
Icons by Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from [game-icons.net](https://game-icons.net), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Edited by removing the black background. Exercise photos from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).

## Install on a phone
It is published with the docs site at `/fitcoach/` (repo Settings → Pages → Source: GitHub Actions; see `.github/workflows/docs.yml`).
Android: open the URL in Chrome → menu → **Install app**. iPhone/iPad: open it in **Safari** → Share → **Add to Home Screen** (the app shows these steps on the Today screen until it is installed or the hint is closed). Open it once online; viewed exercises then work offline. On iPhone the Synergym button opens the Synergym page in the App Store, which has an Open button when the app is installed (iOS does not let web apps launch other apps directly).

Local test: `python3 -m http.server -d fitai-app 8000`.

## Exercise media
876 exercises with instructions and start/end pose photos come from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db). The "video" is a looping animation of the two photos. 41 extra shoulder exercises (ids starting with `x_`, flag `x: 1`: lateral raise variations, pike push-ups, landmine and Z presses, rear delt and rotator cuff work, band drills) were written for this app; they have no photos, so they show a shoulder icon and their step-by-step instructions (in English and Spanish).
To use real video for an exercise, add `"<exercise id>": "<mp4 URL or 11-char YouTube id>"` to `data/videos.json`. Only use videos you have the rights to.
