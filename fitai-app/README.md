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

## My routines

Build your own workouts by hand on the Plan screen: name a routine, add exercises from the library (search works in English and Spanish), set sets, reps (a number or a time like 30s) and rest, and reorder or remove them. Any exercise page has "Add to a routine". Routines start like any workout and give the same XP, quests and ranks. Code in `routines.js`.

## Sports Academy

Pick a sport (football, futsal, basketball, tennis, rugby, volleyball, running, combat sports) and a position (for example striker or goalkeeper in football). Each position has four drills built from your equipment, unlocking with career level. Drills raise six attributes (speed, power, stamina, agility, strength, core) and give normal XP plus a drill bonus. Your overall rating (OVR) weights the attributes by position and shows on a player card that changes from bronze to icon. Reach OVR milestones to open chests, and once a week, after two drills, play a match against an opponent whose result depends on your rating and your preparation. Everyday workouts also raise the attributes a little. Content and balance are in `sport.js`.

## Bets
On Ways to earn → **Bets** you stake coins on your own goals: train, clear a dungeon or the dungeon of the day, log sets, set a new record, earn XP, sleep 7 h+, eat your planned meals, hit your water goal, claim every daily quest, train N times or minutes or on N different days, defeat the weekly boss, win (or not lose) your Academy match, reach a training streak or the next level, lift N kg or do N reps, do N different exercises, train each muscle group (1.00 each, up to 2.00 today / 1.50 a week / 1.30 a month for muscles you rarely train; combining 2–6 muscles of the same day, week or month pays ×1.25–×3.6 today, up to ×1.6 a week and ×1.35 a month), do a 60-minute workout, train in the morning, at night or both weekend days, sleep 7 h on N nights, weigh in, lose or gain weight toward your goal, have a perfect nutrition day, unlock a badge, do Academy drills or raise your OVR. Goals are grouped into Training, Muscles, Health and Game. Once the slip has picks, each goal shows the total odds the bet would have with it added. One pick is a single bet. Two to five picks make a combined bet, and their odds multiply. Odds come from your own habits over the last four weeks: workouts, muscles, kg, times of day, and also how often you hit your water goal, sleep 7 h, claim every quest, eat your planned meals, have perfect nutrition days and weigh in (a goal you reach regularly pays little, one you rarely reach pays more, up to 3.00 for today, 2.00 for a week and 1.60 for a month, with weeks and months paying much less; combined bets up to 20.00), training picks in the same combined bet cut the odds by 15% each, and two picks that one workout would win together cannot be combined. Goals come in five tabs: today, this week, next week (open for bets until Sunday night), this month and next month (open until the end of this month). Bets settle on their own as soon as every pick comes true, or when one runs out of time. Tick **Repeat** on a bet whose picks are all daily, all weekly or all monthly and it is placed again for the next day, week or month when it ends (same goals and stake, fresh odds); stop it from My bets. Odds are kept low: easy goals pay 1.00 (stake back) and training once in a week or month never pays. Stakes are 5 to 300 coins, up to 8 open bets. Game coins only. Code in `bets.js`.

## Exercise ranks

Every exercise with weights or reps gets a rank from Iron through Bronze, Silver, Gold, Platinum and Diamond up to Legend, based on your best set. The Gold standard is a typical intermediate lifter, scaled to your age, height, weight and sex (lean mass is estimated from height and weight). Loaded lifts use an estimated one-rep max; bodyweight moves use reps. Ranks show on the exercise page, during workouts and on the Progress screen, and a rank-up in a workout gives bonus XP. Standards are rough estimates in `ranks.js`.

## Languages

English and Spanish. The language is picked from the phone on first run and can be switched at any time in the Hero screen (or on the first setup page). The app text is written in English; when Spanish is selected, `i18n.js` translates every piece of text as it reaches the screen, using `es-ui.js` (interface), `es-food.js` (ingredients, recipes, steps) and `data/es-exercises.json` (exercise names and instructions, loaded only in Spanish). Anything without a translation simply stays in English.

## Credits
Icons by Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from [game-icons.net](https://game-icons.net), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Edited by removing the black background. Exercise photos from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).

## Install on a phone
It is published with the docs site at `/fitcoach/` (repo Settings → Pages → Source: GitHub Actions; see `.github/workflows/docs.yml`).
Android: open the URL in Chrome → menu → **Install app**. iPhone/iPad: open it in **Safari** → Share → **Add to Home Screen** (the app shows these steps on the Today screen until it is installed or the hint is closed). Open it once online; viewed exercises then work offline.

Local test: `python3 -m http.server -d fitai-app 8000`.

## Today as circles

Today is six circles that fill the screen: Train in the middle (next workout and the dungeon of the day), with Quests (daily quests and the weekly boss), Loot (daily check-in and chests), Meals (meals and fuel), Earn (the bets and the ways to earn themselves, right inside the circle) and the Academy around it. Each circle shows a value and a progress ring, and a "!" when something is ready to claim. Tapping one grows it into a panel with what is inside; ✕, the back button or Esc shrink it back. Every interface draws its own animated rings (turning gears, swaying vines and laurels, a rocking rope, flickering torchlight, neon, pixels...), a soft light runs over panel frames, and every avatar ring moves, built by `tools/build_skins.py` (code in `bubbles.js`).

## Off-plan food judge

"Ate something off the plan?" (in the Meals circle on Today and on the Meals screen): describe it in your own words, in Spanish or English ("una hamburguesa con patatas fritas y una coca-cola", "grilled chicken with salad"), and FitQuest judges it offline (`foodlog.js`).
- It recognises about 130 foods and dishes, each with a health score from -3 to +3 and its calories for a usual portion. Words like fried or battered, grilled, baked or steamed, wholegrain, sugar-free or zero, homemade, a lot or a little, and numbers ("3 galletas") adjust them.
- The verdict (Excellent, Good, So-so, Not very healthy, Junk food) gives +20, +12, 0, -10 or -20 XP. It comes with the foods it found, the calories and a tip.
- At most +60 and -60 XP a day from this. The same description twice in a day gives no XP. Losing XP never takes away a level. Today's list can be undone item by item.

## Session length
Workouts fit the time you chose: each exercise is estimated at about 50 s per set plus its rest and 2.5 minutes to set up and move on, with 7 minutes of warm-up, the stretch and any cardio counted first; strength exercises fill the rest (at least 2). For example 45 min for muscle is 4 exercises and a stretch (~40 min). Older plans are trimmed to fit once.

## Weekly summary and coach

- **Weekly summary:** a story of the week, with full-screen slides that advance on their own or with a tap, animated numbers and bars, and comparisons with the week before. It covers workouts, minutes, kilos, sets and reps, the muscles worked, new records, the best workout, the training days and streak, XP, the boss, and a week grade (C to A+, or a golden S with confetti for an exceptional week: more workouts than the goal plus a new record or more kilos than the week before), and you can share it. It opens by itself the first time you use the app in a new week. Progress shows the week inline (training days, workouts against the goal, minutes, kilos, records and a grade, compared with the same point of last week) with buttons to play this week or last week as a story.
- **Coach:** a line on Today that changes with your day. It mentions bets ending tonight or still open and what they pay, the daily quests left or ready to claim, your training streak and the weekly boss, and ends with a short motivational line. Tap it for the next message; after the last one (✕) a tap folds it away and the circles glide back into the space. It greets you again the next time the app opens.

## Workout music (Spotify)

Works for everyone without linking an account: pick the genres you train to and/or paste your Spotify playlist links (Hero > Music, or Today > Train). Each workout suggests a different one: one of your playlists with Spotify's built-in player, or workout playlists of one of your genres opened in Spotify ("Rock gym", "Reggaeton training"...). "Something else" moves to the next suggestion.

Song of the day: a well-known energetic song (about 1000 in `data/songs.txt`, 23–109 per genre) from one of your genres, a different genre each day. "Play" opens the song in Spotify and "Song radio" opens Spotify on its "<song> Radio". Spotify shares song ids only with signed-in apps, so both open Spotify's own search, which puts the song or its radio first. "Another song" picks a different one.

Linking an account (optional) gives playlists made from your own songs: every workout gets its own private playlist of energetic songs you like plus about 30% new ones, long enough for the workout, warming up, peaking in the middle and easing off. Spotify no longer shares a song's energy with apps, so energy is judged from the artists' genres and the song title.

Linking needs a Spotify app Client ID, and Spotify now limits such apps to 5 accounts chosen by the owner (who needs Premium); open access is only for companies with 250k monthly users. Setup: create an app at developer.spotify.com (Web API), add the redirect URI shown in Hero > Music (on GitHub Pages: `https://e1caro.github.io/torchnep/fitcoach/`), add the accounts under User Management, and paste the Client ID in Hero > Music or set `SPOTIFY_CLIENT_ID` in `spotify.js` so users only tap "Link Spotify".

## Meal portions
Every recipe is one serving for one person: mains are capped at about 600 kcal, breakfasts at 500 and snacks at 280. The planner only makes a serving 15% lighter or heartier, and on each recipe you can pick how hungry you are (×0.75 to ×1.5, or −/+ in 10% steps); your choice changes kcal, macros, ingredients and the shopping list, and the planner keeps it. Bigger calorie targets are met with more meals a day, and the plan suggests adding a meal when one serving per meal falls short.

## HUD look and cosmetics
The app icon matches the HUD: a glowing hexagon with a weightlifter, a tick ring and corner brackets. Long explanations fold into a small "More info" dropdown on every screen, and the bottom bar uses bigger icons with a highlighted active section.

The interface is a sci-fi heads-up display (`hud.css`, layered over `style.css`):
- a dark grid background, glowing lines, panels with cut corners and corner brackets
- segmented progress bars, tick-ring gauges, angled buttons and a HUD bottom dock
- type in Orbitron, Exo 2 and Share Tech Mono (SIL Open Font License)

It is plain CSS inspired by open sci-fi UI projects such as [Arwes](https://github.com/arwes/arwes) (MIT) and augmented-ui; no images or libraries are added. Every theme recolours the same HUD.

Cosmetics in Rewards → Shop:
- **Themes:** 18, including the free default Cyber HUD, plus Hologram, Stealth Ops, Red Alert, Synthwave and Night City.
- **Rings:** 14, including Segment, Gauge, Reticle, Gear, Hex, Orbit, Radar and Glitch.
- **Banners:** 14, including Scanlines, Lattice, Circuit board, Radar sweep, Data stream and Hazard.
- **Interfaces (1000 to 1750 coins):** each is a whole new look, changing the palette, fonts, frames, buttons, bars, background scenery, ambient animation and the Today circle rings (`skins.css`, built by `tools/build_skins.py`). There are 17: Sci-fi HUD (free), Imperial China, Zen Japan, Fairy Tale Forest, Medieval Castle, Steampunk Works, Olympus, Ancient Egypt, Viking Saga, Pirate Seas, Outrun 80s, Arcade 8-bit, Classical Elegance, Art Deco, Gothic Cathedral, Baroque Palace, Mythical Realm and Cosmic Voyage. Each interface also has its own sounds (`sounds.js`, made live with Web Audio): its own instrument and scale for taps, rewards and level-ups, from a koto and a gong to an organ chord, a Viking horn with drums or an 8-bit chiptune. Skin fonts only download when the skin is in use. You can try one before buying, and chests never drop them.
  - Imperial China (2000): red lacquer, gold lattice corners and a hanging lantern
  - Zen Japan (2000): seigaiha waves, Mount Fuji, a red sun and falling cherry petals
  - Fairy Tale Forest (2500): moonlit pine forest, fireflies and vine-and-flower corners
  - Medieval Castle (2500): stone walls, iron corner plates, a shield emblem and torch light
  - Steampunk Works (3000): brass plates, a pressure-gauge title line and a turning gear
  - Olympus (2500): Greek key borders, laurel, the Parthenon under the stars
  - Ancient Egypt (2500): pyramids, a winged sun, lotus bands and ankh markers
  - Viking Saga (2800): northern lights, snowy mountains, knotwork and runes
  - Pirate Seas (2800): rope frames, brass rings, waves and a turning compass rose
  - Outrun 80s (3200): a striped sunset sun over a neon perspective grid, chrome titles
  - Arcade 8-bit (3500): pixel corners, Press Start / VT323 type, pixel hearts and CRT scanlines

  Each interface also has a title ornament and its own ambient touches (a swaying lantern, falling cherry petals, twinkling fireflies, torch light). They are built by `tools/build_skins.py` from small hand-written SVGs into `skins.css`; edit the script and run it again to change them. "Try" previews any interface for one minute across the app.
- **Panel styles:** a new type that changes the shape of every card in the Sci-fi HUD interface. The styles are Chamfered (free), Classic (free), Brackets, Octagon, Notch, Double line, Circuit and Hologram.

## Exercise media
876 exercises with instructions and start/end pose photos come from the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db). The "video" is a looping animation of the two photos. 41 extra shoulder exercises (ids starting with `x_`, flag `x: 1`: lateral raise variations, pike push-ups, landmine and Z presses, rear delt and rotator cuff work, band drills) were written for this app; they have no photos, so they show a shoulder icon and their step-by-step instructions (in English and Spanish).
To use real video for an exercise, add `"<exercise id>": "<mp4 URL or 11-char YouTube id>"` to `data/videos.json`. Only use videos you have the rights to.
