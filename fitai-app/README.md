# FitQuest

Free, offline-first workout app (PWA). Nothing to pay for, no accounts, no ads; all data stays on the device.

- **Profile and coach:** age, gender, height, weight, target weight, goal, experience, equipment, days, session length, focus muscles and limitations (knees, lower back, shoulders, wrists). An on-device coach turns that into BMI, calorie and macro targets and a split with exercises chosen for you. It is an algorithm, not a cloud AI model, so it works offline and sends nothing anywhere.
- **Plans:** full body, upper/lower or push/pull/legs, with extra sets for the muscles you want to bring up and low-impact choices for older users or higher BMI.
- **Workouts:** exercise demo loop, weight and reps per set (pre-filled from last time), rest timer.
- **Game layer:** XP and levels (every set, workout, record and quest earns XP), daily quests, a weekly boss that takes damage from each workout, coins, a daily check-in, badges and sound effects.
- **Two separate reward streams.** *Levels* unlock new **meals** (33 chef recipes, the last ones up to level 50), new **workouts** (29 dungeons, from Tabata Blitz at level 2 to the Pantheon at level 50) and **perks** such as XP and coin boosts, a fourth daily quest, a second daily spin, a rest-day shield for your streak, bigger boss loot and bigger record bonuses. **XP only comes from looking after yourself**: training (sets, workouts, records, Academy drills), meals, water, sleep, food logs and weighing in; quests, check-ins, the boss, the spin, matches and chests pay coins instead (badges pay nothing; all coin rewards were cut to 75% in version 155). The reward road shows every level up to 50. Levels also unlock **level-only looks** that cannot be bought or found in chests: prestige rings (bronze, silver and golden laurels at 5, 15 and 25, a platinum halo at 35) and particle rings in the style of game profile borders: Ember sparks 8, Frost crown 18, Arcane runes 28, Storm caller 38, Void rift 42, Phoenix ring 45, Celestial halo 47 and the Olympian aura at 50, with rising sparks, orbiting snow and runes, lightning flashes or golden motes; every level-only ring also wears a small emblem on top drawn by the current interface (a horned helmet for the Vikings, a shield for the castle, a torii for Japan, a skull for the pirates, a winged sun for Egypt, a crown for the baroque palace...; art in `tools/crest_art.py`), a fine line in the ring's metal with one small gem in its gem colour, so it changes with the interface, legend banners (Champion 10, Hall of Fame 20, Constellation 30, Borealis 40, Olympus 50), profile pictures (laurel crown 12, temple 22, treasure 33, infinity 48) and two themes (Champion 27, Olympus 44); the Change page of each look shows the ones still locked; on the reward road and in the Change pages, tap a level-only look to try it for a minute. The shop opens kind by kind over the first ten levels: nothing can be bought at level 1, then profile pictures at 2, banners at 3, rings at 4, themes at 5, panel styles at 7 and interfaces at 10 (boosts and chests from the start); locked kinds show when they open, and their looks can still come out of chests. *Coins* buy looks and boosts only: 30 more profile pictures (16 simple ones are free from the start), 6 animated rings, 8 banners, 12 app themes, an XP booster, extra spins and chests. Nothing can be bought with coins that levels give, and the other way round.
- **Profile editor:** tap your avatar or Hero → Edit profile and looks to pick your name, profile picture, ring, banner, theme and title from everything you own, and to edit your body data and training plan.
- **Icons:** profile pictures, quests, bosses, dungeons, badges and chests use minimalist icons from game-icons.net (credit below), tinted by the theme.
- **Halloween event (until 31 October 2026):** the Haunted Crypt is your own next plan workout with every exercise swapped for a similar one (same main muscle and kind, your equipment); it shows on Today › Train and on top of Dungeons, and closes at midnight on 1 November. Clearing it gives the Halloween Night interface; the jack-o'-lantern profile picture, the cobweb banner and the Witching Hour ring (a thin dark-violet ring with a pumpkin glow and a cute little ghost flying round with a trail of green ectoplasm) come one a day for completing all the daily quests; "See the workout" shows the whole crypt workout before entering (moon, graves, flying bats, cobweb corners, candy as money). Prizes never appear in the shop or in chests and stay yours after the event. Code in `halloween.js`.
- **Loot chests:** wooden, silver and golden chests drop from dungeons, the weekly boss and the daily bonus; every level-up brings a silver chest, and every 5th level a golden one too (chests give no XP: a wooden chest holds 8–19 coins, a silver one 11–30 and a golden one 30–75 when no look comes out) (players who levelled up before this got the chests they missed, to collect from Loot); and can contain coins or any look from the shop, interfaces included. Pricier looks are rarer, and better chests give them better odds (a golden chest gives an interface about once every 30 chests, a wooden one almost never). Coin and XP amounts stay the same, you never get something you already own, and "What can come out?" on Today shows each chest's exact odds.
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

Pick a sport (football, futsal, basketball, tennis, rugby, volleyball, running, combat sports) and a position (for example striker or goalkeeper in football). Each position has four drills built from your equipment, unlocking with career level. Drills raise six attributes (speed, power, stamina, agility, strength, core) and give normal XP plus a drill bonus. Your overall rating (OVR) weights the attributes by position and shows on a player card that changes from bronze to icon. Reach OVR milestones to open chests, and once a week, after two drills, play a match against an opponent whose result depends on your rating and your preparation. Everyday workouts also raise the attributes a little. Inside the Academy your player is a technical sheet drawn as a panel of the interface: the crest, your name, club and position, a table with rating, category (tier metal), career, career level, matches and wins-draws-losses, and your six attributes as bars in the interface's colours, with the key ones for your position starred. Your club has an invented name made for you ("Brimont Albion", "Atlético Valdoria"...); "Sign for another club" on the sheet opens a transfer window with three new offers (or more), or lets you found a club with your own name, and your rating, attributes and record come with you. On the Hero screen the Academy shows as a small club card: your club, with a crest showing your rating and position, ringed in the metal of your tier (bronze, silver, gold, icon), painted in the interface's colours and shaped by it (a heater shield for medieval, gothic and pirate, a round mon for China, Japan, Greece and the Vikings, a hexagon for sci-fi, steampunk, outrun and cosmic, a cartouche for Egypt, pixels for Arcade...), next to your six attributes; tap it to open the Academy. Content and balance are in `sport.js`.

## Bets
On Ways to earn → **Bets** you stake coins on your own goals over the next **7 days** or the next **month**, counted from the day you bet (today is the first day), whatever the day of the week; there are no one-day bets. Goals: train N times, for N minutes or on N different days, clear N dungeons, log sets, set a new record, earn XP, reach a training streak or the next level, lift N kg or do N reps, do N different exercises, train each muscle group (1.00 each, up to 1.50 in 7 days and 1.30 in a month for muscles you rarely train; combining 2–6 muscles in one bet pays up to ×1.6 in 7 days and ×1.35 in a month), do a 60-minute workout, train in the morning, at night or both weekend days, sleep 7 h on N nights, hit your water goal on N days, claim every daily quest on N days, weigh in, lose or gain weight toward your goal, have a perfect nutrition day, unlock a badge, do Academy drills or raise your OVR. Goals tied to calendar weeks (the weekly boss, this week's meal plan, the Academy match) are not offered. Goals are grouped into Training, Muscles, Health and Game. Once the slip has picks, each goal shows the total odds the bet would have with it added. One pick is a single bet; two to five make a combined bet, and their odds multiply. Odds come from your own habits over the last four weeks (a goal you reach regularly pays little, one you rarely reach pays more, up to 2.00 for 7 days and 1.60 for a month; combined bets up to 20.00), training picks in the same combined bet cut the odds by 15% each, and two picks that one workout would win together cannot be combined. Bets settle on their own as soon as every pick comes true, or when one runs out of time. Tick **Repeat** and the same bet is placed again for the next 7 days or month when it ends (same goals and stake, fresh odds); stop it from My bets. Easy goals pay 1.00 (stake back) and training once never pays. Stakes are typed in or picked: 10 coins up to 30 on a 7-day bet and 100 on a one-month bet (a bet with any 7-day pick counts as 7 days), up to 8 open bets. Game coins only. Bets placed before this change (including one-day bets) still settle as they were. Code in `bets.js`.

## Exercise ranks

Every exercise with weights or reps gets a rank from Iron through Bronze, Silver, Gold, Platinum and Diamond up to Legend, based on your best set. The Gold standard is a typical intermediate lifter, scaled to your age, height, weight and sex (lean mass is estimated from height and weight). Loaded lifts use an estimated one-rep max; bodyweight moves use reps. Ranks show on the exercise page, during workouts and on the Progress screen, and a rank-up in a workout gives bonus XP. Standards are rough estimates in `ranks.js`.

## Languages

English and Spanish. The language is picked from the phone on first run and can be switched at any time in Settings (or on the first setup page). The app text is written in English; when Spanish is selected, `i18n.js` translates every piece of text as it reaches the screen, using `es-ui.js` (interface), `es-food.js` (ingredients, recipes, steps) and `data/es-exercises.json` (exercise names and instructions, loaded only in Spanish). Anything without a translation simply stays in English.

## Credits
Icons by Lorc, Delapouite, Skoll, Caro Asercion, Darkzaitzev, Sbed and Carl Olsen from [game-icons.net](https://game-icons.net), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Edited by removing the black background. Exercise photos from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain).

## Install on a phone
It is published with the docs site at `/fitcoach/` (repo Settings → Pages → Source: GitHub Actions; see `.github/workflows/docs.yml`).
Android: open the URL in Chrome → menu → **Install app**. iPhone/iPad: open it in **Safari** → Share → **Add to Home Screen** (the app shows these steps on the Today screen until it is installed or the hint is closed). Open it once online; viewed exercises then work offline.

Local test: `python3 -m http.server -d fitai-app 8000`.

## Swipe between sections

Swipe left or right to move between the tab bar's sections (Today, Plan, Shop, Progress, Hero); the page follows the finger and the next section slides in (`swipe.js`). Swipes inside sideways scrollers or text fields, with a Today panel, the weekly summary or a dialog open, during a workout, or from the screen edges are left alone.

## Today as circles

Today is six circles that fill the screen: Train in the middle (next workout and the dungeon of the day), with Quests (daily quests and the weekly boss), Loot (daily check-in and chests), Meals (meals and fuel), Earn (the ways to earn first, right inside the circle, and your bets last in a dropdown) and the Academy around it. Each circle shows a value and a progress ring, and a "!" when something is ready to claim. Tapping one grows it into a panel with what is inside; ✕, the back button or Esc shrink it back. Page titles are as wide as their words, with each interface's ornament running right under them. Every interface draws its own animated rings (turning gears, swaying vines and laurels, a rocking rope, flickering torchlight, neon, pixels...), a soft light runs over panel frames, and every avatar ring moves, built by `tools/build_skins.py` (code in `bubbles.js`).

## Meals that fuel the training

Daily calories come from your body (Mifflin-St Jeor BMR × 1.3 for daily life) plus what your workouts really burn, spread over the week: each session's minutes of warm-up, strength, cardio (by type) and stretching times their MET values. The meal plan always lands within about ±3% of that target: when one serving per meal falls short, training snacks are added (protein-rich ones when protein is short, up to 3, or 4 with three meals), and only then do servings grow, up to ×1.35; when even the smallest servings are too much, a snack is left out. Changing the training plan, your goal or your weight refits today and the days ahead.

## Change ingredients

In any recipe of the meal plan, each ingredient's ⋯ button offers up to four replacements (same aisle, allowed by your diet, closest in protein, carbs and fat balance and in calories per gram) or leaving it out, for that meal or ticked for all your meals. A replacement keeps the calories of what it replaces; calories, macros, the day's totals and the shopping list all follow the changes, and ↺ undoes one.

## Off-plan food judge

"Ate something off the plan?" (in the Meals circle on Today and on the Meals screen): describe it in your own words, in Spanish or English ("una hamburguesa con patatas fritas y una coca-cola", "grilled chicken with salad"), and FitQuest judges it offline (`foodlog.js`).
- It recognises about 130 foods and dishes, each with a health score from -3 to +3 and its calories for a usual portion. Words like fried or battered, grilled, baked or steamed, wholegrain, sugar-free or zero, homemade, a lot or a little, and numbers ("3 galletas") adjust them.
- The verdict (Excellent, Good, So-so, Not very healthy, Junk food) gives +20, +12, 0, -10 or -20 XP. It comes with the foods it found, the calories and a tip.
- At most +60 and -60 XP a day from this. The same description twice in a day gives no XP. Losing XP never takes away a level. Today's list can be undone item by item.

## Session length, cardio and stretching

Sessions last 30 minutes to 2 hours (30, 45, 60, 75, 90 or 120). The "Cardio and stretching" card on the Plan screen (and the Training step of the profile) sets:
- **Cardio:** none, at the start (it doubles as the warm-up) or at the end; its type (any, run or treadmill, bike, rowing, elliptical, stairs, jump rope, walking or sprints, matched to the exercises of that kind); and its minutes (auto: 8 to 25 with the session, or 5 to 45).
- **Stretching minutes:** auto (3 to 10 with the session) or 3 to 15. Each stretch is two 30-second holds (about 1.7 minutes with the change), picked for the muscles that day works most, then the rest of the day's muscles, without repeats.

Each strength exercise is timed at about 50 s per set plus its rest and 2.5 minutes to set up; warm-up, cardio and stretching are counted first and strength exercises fill the rest, going round the day's muscles again on long sessions. Short sessions that still run over shorten what is on auto, then take a set off. Older plans are trimmed to fit once.

**Time today:** some days there is more or less time at the gym. The next workout (on Today and on the Plan) has a row of times; picking one fits that workout to it for today only: it keeps the day's exercises and drops or adds strength exercises for the same muscles, and resizes cardio and stretching left on auto. Tomorrow it goes back to your usual time.

**Training options:** a card on the Plan screen with the answers from the start (goal, experience, days, session time, equipment, focus and limits). Change any of them and "Save and rebuild plan" makes a new plan, without going through the questionnaire again; history, levels and rewards stay. "Edit body data" opens the full profile.

## Weekly summary and coach

- **Weekly summary:** a story of the week, with full-screen slides that advance on their own or with a tap, animated numbers and bars, and comparisons with the week before. It covers workouts, minutes, kilos, sets and reps, the muscles worked, new records, the best workout, the training days and streak, XP, the boss, and a week grade (C to A+, or a golden S with confetti for an exceptional week: more workouts than the goal plus a new record or more kilos than the week before), and you can share it. It opens by itself the first time you use the app in a new week. Progress shows the week inline (training days, workouts against the goal, minutes, kilos, records and a grade, compared with the same point of last week) with buttons to play this week or last week as a story.
- **Coach:** a line on Today that changes with your day. It mentions your open bets (one pick of each, chosen at random among the ones still to do) and what they pay, the daily quests left or ready to claim, your training streak and the weekly boss, and ends with a short motivational line. Tap it for the next message; after the last one (✕) a tap folds it away and the circles glide back into the space. It greets you again the next time the app opens.

## Workout music (Spotify)

Works for everyone without linking an account: pick the genres you train to and/or paste your Spotify playlist links (Hero > Music, or Today > Train). Each workout suggests a different one: one of your playlists with Spotify's built-in player, or workout playlists of one of your genres opened in Spotify ("Rock gym", "Reggaeton training"...). "Something else" moves to the next suggestion.

Song of the day: a well-known energetic song (about 1000 in `data/songs.txt`, 23–109 per genre) from one of your genres, a different genre each day. "Play in Spotify" opens the song itself. Its Spotify id comes from `data/song_ids.json`, made ahead of time by `tools/resolve_song_ids.py` in a GitHub Action, from open music data (Wikidata, then MusicBrainz, which know about one song in five) or, if the repository has a Spotify app's keys saved as the secrets `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, from Spotify's own search, which finds almost all of them; for songs not in it, from Spotify's search when an account is linked, and otherwise from MusicBrainz in the browser. The lookup runs in the background when the card shows and is remembered; if it fails, the button opens Spotify's search for the song. "Another song" picks a different one.

Linking an account (optional) gives playlists made from your own songs: every workout gets its own private playlist of energetic songs you like plus about 30% new ones, long enough for the workout, warming up, peaking in the middle and easing off. Spotify no longer shares a song's energy with apps, so energy is judged from the artists' genres and the song title.

Linking needs a Spotify app Client ID, and Spotify now limits such apps to 5 accounts chosen by the owner (who needs Premium); open access is only for companies with 250k monthly users. Setup: create an app at developer.spotify.com (Web API), add the redirect URI shown in Hero > Music (on GitHub Pages: `https://e1caro.github.io/torchnep/fitcoach/`), add the accounts under User Management, and paste the Client ID in Hero > Music or set `SPOTIFY_CLIENT_ID` in `spotify.js` so users only tap "Link Spotify".

## Meal portions
Every recipe is one serving for one person: mains are capped at about 600 kcal, breakfasts at 500 and snacks at 280. The planner only makes a serving 15% lighter or heartier, and on each recipe you can pick how hungry you are (×0.75 to ×1.5, or −/+ in 10% steps); your choice changes kcal, macros, ingredients and the shopping list, and the planner keeps it. Bigger calorie targets are met with more meals a day, and the plan suggests adding a meal when one serving per meal falls short.

## HUD look and cosmetics
The app icon matches the HUD: a glowing hexagon with a weightlifter, a tick ring and corner brackets. Long explanations gather in one "How it works" dropdown at the end of each screen (on Today they stay in each panel), and the bottom bar uses bigger icons with a highlighted active section.

The interface is a sci-fi heads-up display (`hud.css`, layered over `style.css`):
- a dark grid background, glowing lines, panels with cut corners and corner brackets
- segmented progress bars, tick-ring gauges, angled buttons and a HUD bottom dock
- type in Orbitron, Exo 2 and Share Tech Mono (SIL Open Font License)

It is plain CSS inspired by open sci-fi UI projects such as [Arwes](https://github.com/arwes/arwes) (MIT) and augmented-ui; no images or libraries are added. Every theme recolours the same HUD.

Cosmetics in Rewards → Shop:
- **Themes:** 18, including the free default Basic (each interface's own colours), plus Hologram, Stealth Ops, Red Alert, Synthwave and Night City.
- **Rings:** 14, including Segment, Gauge, Reticle, Gear, Hex, Orbit, Radar and Glitch.
- **Banners:** 14, including Scanlines, Lattice, Circuit board, Radar sweep, Data stream and Hazard.
- **Interfaces (free Minimal, others 1000 to 1750 coins):** each is a whole new look, changing the palette, fonts, frames, buttons, bars, background scenery, ambient animation and the Today circle rings (`skins.css`, built by `tools/build_skins.py`). There are 18: Minimal (free: a calm, ordinary look with soft greys, one blue accent, rounded cards and the Inter font, no ornaments or animations), Sci-fi HUD (1000 coins; players from before keep it), Imperial China, Zen Japan, Fairy Tale Forest, Medieval Castle, Steampunk Works, Olympus, Ancient Egypt, Viking Saga, Pirate Seas, Outrun 80s, Arcade 8-bit, Classical Elegance, Art Deco, Gothic Cathedral, Baroque Palace, Mythical Realm and Cosmic Voyage. Each interface also has its own money, with its own name and icon wherever coins show: plain coins in Minimal, credits in the Sci-fi HUD, yuan in China, yen in Japan, acorns in the fairy forest, crowns in the castle, cogs in the steampunk works, drachmas on Olympus, scarabs in Egypt, runes for the Vikings, doubloons for the pirates, chips in Outrun, points in the arcade, florins, dollars, souls, ducats, gems and stars (names in `i18n.js`, swapped into the text as it reaches the screen; icons in `icons/gi/cur-*.svg`, made by `tools/currency_icons.py`). It is the same money: only its name and icon change. Each interface also has its own sounds (`sounds.js`, made live with Web Audio): its own instrument and scale for taps, rewards and level-ups, from a koto and a gong to an organ chord, a Viking horn with drums or an 8-bit chiptune. The profile shows only what you wear (profile picture, ring, banner, interface, panel style and theme), each with a Change button that opens a page with every look of that kind you own: tap one to use it. Its "more in the Shop" button opens the shop on just that kind of look (the other sections stay folded and can still be opened). Skin fonts only download when the skin is in use. With an app theme other than Cyber HUD, each interface gets a palette made for that pair (worked out in OKLCH): the theme's two colours lead, the interface's own second colour turns to the theme's hue as a detail colour (so a gold-and-red interface keeps a pair of related colours), the complement of the main colour marks small details, and light and dark shades make the gradients on frames, buttons, bars, chips and the Today circle rings; the background and glow take the theme's hue at the interface's own darkness. Every purchase asks for confirmation first, and any look you own can be sold back for 80% of its price, even the one you are wearing (you switch back to the free look of that kind); free looks cannot be sold. Every look in the shop can be tried for a minute, even one you can't buy yet, and one of each kind at a time (a picture, a ring, a banner, a panel style, a theme and an interface together); a bar shows each with its countdown, and your own looks are kept. Or get lucky with a chest: golden chests give the best chance.
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

## Simpler screens

- **Hero** shows your card, three stats, one tile per kind of look (tap to change it) and a Settings button.
- **Settings** holds your name, body and training plan, sound, language, music (Spotify), export and delete.
- **Plan** has three tabs: Training, Dungeons and Meals. Each training day folds to one line, and the next one starts open. Training options sit under "Adjust".
- **Dungeons** shows the ones you can enter and the next to unlock; the rest stay folded.
- **Bets**: each kind of goal is a dropdown, and "How bets work" sits at the end.
- **Meal setup** asks for diet, foods to avoid and meals per day; the rest is under "More options".

## Workouts

- **Kept until you finish:** the workout in progress is saved after every change. Leave it for another screen or app (or close the app) and a bar brings you back; it ends only with Finish or Discard.
- **Timers:** timed exercises (cardio, holds, stretches) have a countdown per set that ticks the set off by itself, even while you are elsewhere.
- **XP per exercise:** each exercise pays once, by a medal (bronze, silver, gold, platinum) from the sets and reps you did against the plan, with platinum for beating the target reps or your best weight. Lifting pays most and stretching far less; a cleared workout adds 40 XP.
- **Workout time** is estimated from the exercises you completed (the same estimate the plan uses), not the clock, so time quests and bets match what you did.
- **Muscle bets** count a workout for a muscle group only when that group has the most sets in it.
- **Sliders** set days, session time, today's time, cardio and stretching minutes and cooking time.
- **Today's meals** is one line per meal (tap to open its recipe); the one for the time of day is highlighted and eaten ones are ticked.
- **Appetite:** each "How hungry are you?" choice on a recipe is remembered (the last 12 meals). When you often pick less food than planned, the meal plan's calories go down, more the more often, up to 20% (or up to 10% more when you are often hungry); protein stays the same. The meal plan says when servings are adjusted.

## Tabs

Today, Plan (Training, Dungeons, Meals), Shop, Progress (Overview, Levels, Badges) and Hero. The reward road shows the next levels with only the workouts, level-only looks and perks they unlock (coins, chests and recipes come every level; shop sections show their own lock in the Shop). Nothing is shown twice: the hero card is on Today and Hero only, stats live in Progress, and the Shop, Bets and Earn screens show just your coins. The rest up to 50 are folded. Screens keep text to a minimum: numbers, names and buttons, with explanations only under "How it works".

- **Today fits the screen:** it doesn't scroll; the circles size themselves to the free space. Themes also recolour the tab bar.

## Android app (APK)

`android/` wraps the app as an Android app: the web files are packed inside the APK and shown full screen, so it works offline and keeps its data on the phone. The icon is a quest scroll carrying a blue dumbbell, on a dark tile in the Minimal look (also used by the web app; drawn by `tools/make_icons.js`).

- **Releases:** the `android` workflow (Actions > android > Run workflow) builds the APK and publishes it as a GitHub release "FitQuest 1.N" (tag `app-N`) with the APK attached. Pull requests that touch the app build the APK as a check.
- **Updates by themselves:** each release also carries `web.zip` (the whole web app). The installed app checks the releases when it opens or comes back to the screen, downloads a newer `web.zip` in the background and switches to it the next time it comes back to the screen; your data stays. Only when the native part changes (`fitquestShell` in `android/gradle.properties` goes up, marked by the release's `shell-S` asset) does a bar offer to download the new APK. It installs over the old one and keeps your data, because every release is signed with the same key, kept as the repository secret `FITQUEST_KEYSTORE` (never in the code).
- **First install:** open the release page on the phone, download the APK and allow installing from your browser when Android asks.
- **Time goals follow your session:** the daily quest asks for about two thirds of your usual session, and the "long workout" bet for about 90% of it; workout minutes are estimated from the exercises you finish.

## Accounts and friends (Supabase)

`cloud.js` adds accounts with a username and password: your data is saved online and syncs between the web app and the Android app (sign in on a new device, even from the first setup page, and everything comes over). Each account has a 6-character code; add a friend's code in the Friends tab, which ranks you and your friends by level, and tap one to see their profile (level, looks, workouts, minutes, streak, kg lifted, badges and Academy club). Friends only see that summary, never body data or history.

It runs on a free Supabase project: run `tools/supabase.sql` in its SQL editor, turn off "Confirm email", and put the project URL and publishable (anon) key in `cloud.js` (already set for this project).
- **Profile at a glance:** Hero shows four big numbers (day streak, weeks on goal, workouts, hours), this week's progress window and the badges earned; friends see exactly the same on your profile (`profile.js`). The Academy club stays in the Academy.
- **Podium:** the Friends tab opens with a podium of the three highest levels among you and your friends; when someone climbs onto it or overtakes someone, a toast says so and their step bounces. The steps rise in, a light sweeps across them, the winner sits under a spotlight with sparkles, and the avatars wear gold, silver and bronze rings. Every interface builds it from its own materials (three torii gates for Japan, Greek columns, pyramids, castle towers, tree stumps, rune stones, treasure chests, pagodas, stained-glass arches, an Art Deco ziggurat, neon blocks, pixel blocks, planets...; `PODIUM` in `tools/build_skins.py`).
- **Coins are scarcer:** levels and badges give no coins (levels still give chests); quests, check-ins, the spin, the boss (100), chests, matches, Academy milestones and workouts all pay less.
- **Shop:** three daily deals at 30% off (different kinds of look, the same all day, a countdown to the next ones), then one kind of item at a time from a row of tabs (pictures, rings, banners, themes, panel styles, interfaces, boosts). Every item is a card framed by its rarity from its price (common, rare, epic, legendary), with Try and Buy side by side. Selling gives back 80% of what you paid.
- **Exercise pictures without people:** every exercise is drawn as a muscle map of a man or a woman (from the gender set at the start), front and back, with its main muscles lit up and its helper muscles softer; lists show a small map of the side that matters. The exercise library opens on eight muscle groups (chest, back, shoulders, arms, legs, glutes, core, neck), each drawn on the body. Outlines from react-native-body-highlighter by ELABBASSI Hicham (MIT), built into `data/body.json` by `tools/body_map.py`. No open-licensed exercise videos with anatomy models exist, so these are still pictures.
- **Exercise picture backdrops:** each interface puts a quiet motif behind the muscle maps (a rising sun for Japan, columns for Greece, a pyramid for Egypt, a gear for steampunk, a gothic window, an Art Deco sunburst, a neon sunset, stars...; `BODYBG` in `tools/build_skins.py`).
