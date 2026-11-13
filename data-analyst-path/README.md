# Data Analyst Path

A free, static web app that teaches you to become a data analyst **starting from your own background**, with AI tools as your tutor. It is built for a daily habit: ten minutes a day on your phone or computer, with streaks, XP and short practice rounds that keep you coming back.

## What you get

**Learn**
- **Personalised.** Pick your background (science, engineering, finance, marketing, healthcare, sport, teaching, software, operations, humanities, or describe your own). Analogies, practice data, portfolio ideas, CV examples and every AI prompt adapt to it.
- **One journey with Dot & Co.** 9 chapters, 51 missions, about 220 hours: asking good questions and data ethics, spreadsheets and Power Query, SQL (cleaning, funnels, cohorts and retention), Python/pandas and data validation, statistics and experiment design, Power BI (service, security, storage modes, Copilot) and Tableau (relationships, blends, publishing), AI-assisted analysis, portfolio and job search. Each mission has five steps: **Brief** (a request from someone at Dot & Co., a fictional café chain with an ordering app and a coffee club), **Learn** (swipeable key ideas), **Try** (lab levels, or a short case with decisions for the missions without a lab), **Check** (one question plus spaced review) and **Debrief** (the task, the AI prompt and your notes). Every mission is open; if you already know it, *Test out* with all answers right.
- **Boss cases.** Each chapter ends with a case for Dot & Co.: five questions, plus the chapter's hardest lab levels when it has any. Winning pays the chapter bonus once.
- **SQLab.** Real SQLite in the browser (sql.js / WebAssembly) with four practice databases (a café chain, a training study, the Dot & Co. app and Dot & Co. growth and support): 112 challenges in 8 worlds × 4 levels, with the same map, stars and unlocking as the other labs. Challenges solved before the worlds existed count as 1 star, and free exploration of each database is always open. On a phone it has a keyword/table/column toolbar so you rarely need the keyboard for syntax.
- **DotSheets, DotPython and DotBI.** Three more labs with the same layout as SQLab, each with 8 worlds × 4 levels × 3 challenges (96 each) and a world map. Worlds 5 to 8 use the Dot & Co. app and growth data (1,200 users, 9,178 events, 7,000 test assignments, 1,200 support tickets) and add level types: 🐞 bug hunt, 🔮 predict the output, 🧩 put in order, 🌐 Rosetta (the same idea in another tool), 🗂️ case file, 💬 stakeholder request, 🎤 interview, 🧽 cleaning gauntlet and 👾 boss levels. Each world has its own colour, intro and stamp. Solving 2 of the 3 challenges in a level opens the next one; each challenge earns 1 to 3 stars (★ solved, ★ no hint, ★ first try), XP once, and has a hint, a worked example per level and a solution shown after the first check. Progress is saved in the same state as everything else, so it syncs between devices.
  - **DotSheets** is a real spreadsheet on a canvas: click or arrow keys to move, Shift+arrows to select, type to replace a cell, F2 or double-click to edit, Enter/Tab to save and move, Escape to cancel, Delete, Ctrl+C/V/Z/Y, Ctrl+arrows to jump to the data edge, Home, Ctrl+Home, PageUp/PageDown. On a phone, tap to select and tap again to type. Checks compare your cell with the reference formula computed on the same data.
  - **DotPython** runs a safe subset of Python with real pandas syntax (`df.shape`, `sort_values("qty", ascending=False)`, `df[df["qty"] >= 2]`, groupby/agg, merge, `.str`, `.dt`, pivot_table). Tab indents, Ctrl+Enter runs. Your answer goes in `result` and is compared with the reference result.
  - **DotBI** evaluates DAX measures with real filter context (CALCULATE, FILTER, ALL, SUMX, RELATED, VAR/RETURN, relationships, time intelligence with DATEADD, DATESYTD and TOTALYTD, RANKX and TOPN) and Tableau calculations (IIF, DATEPART, `{ FIXED / INCLUDE / EXCLUDE ... }`, RUNNING_SUM, WINDOW_SUM, RANK, INDEX). The Rows shelf splits the measure into a matrix and a chart; the check compares your measure with the answer in total and in every row.
- **Prompt library and AI rules.** 50 prompts with fill-in blanks, *Copy*, *Open in ChatGPT / Claude*, and answers in any of 12 languages.

**Discover (the scroll feed)**
- A vertical, snap-scrolling feed of **268 short cards**: data stories (the missing bullet holes, the map that stopped cholera, the $125 million unit error, 15,841 COVID cases lost in a spreadsheet…), statistics ideas in 30 seconds, SQL / spreadsheet / pandas / AI tips with code, career advice, quotes and a glossary. Facts were checked against their sources; where a number is only reported or attributed, the card says so. Cards about tools link to the official documentation (🔗 Source, opened only when you tap it).
- Interactive cards: **myth or fact** (tap to answer), **chart crimes** (tap to see the fix), a **review question** every fourth card (it feeds the spaced-repetition schedule) and a quick **guess-the-correlation** round.
- Reading a card **collects** it (+2 XP once). Five new cards a day is the Discover goal (+10 XP), followed by a "you are caught up" card: a natural place to stop. Save with ♡ or a double-tap, share, or jump to the matching lesson.
- "For you" favours the topics you are studying, keeps the same picks all day, and never shows two cards of the same kind in a row.

**Come back every day**
- **Daily goal** (20, 40 or 80 XP) with a progress ring, and **three daily quests** (learn, practise, code). Finishing all three opens a surprise chest of bonus XP.
- **Practice rounds.** Five questions, about two minutes, from a bank of 298 (51 mission questions, 202 practice questions and 45 boss case questions). Combo bonus, a second chance for every miss, and a **spaced-repetition schedule**: a question you get right returns after 1, 3, 7, 14, then 30 days; a miss returns sooner. "Mastered" means you answered it right on several different days.
- **XP, levels and titles** (Curious Beginner → Query Cadet → Junior Analyst → Data Legend), **streaks** with freezes, a 12-week **activity calendar**, a weekly chart and **77 badges**.
- **The journey map.** Every mission is a stop on a winding, colour-coded road: finished stops are ticked, Dot stands on the current one, missions added later are marked *New* (they never pull you back to a chapter you already closed), and each chapter ends with its boss case. Nothing is locked.
- **Arcade: six games.** *Guess the correlation* (read a scatter plot, three lives), *SQL blocks*, and four tool games, each a round of five with stars against par: 🩻 *Formula X-ray* (Excel: tap the cells a formula really uses, then say what it returns), 🐼 *Pandas pipeline* (chain operation cards until your table matches the target), 🔐 *Slicer safe* (Power BI: set the slicers so the KPI card shows the secret number; some measures ignore a slicer on purpose) and 💊 *Pill match* (Tableau: put blue and green pills on the shelves to rebuild a chart). Every puzzle is generated from a seed and checked by the same engines as the labs; XP from games is capped per day.
- **SQL blocks: 123 puzzles in 8 levels** (pick and sort → filter rows → count and sum → groups → joins → dates and CASE → subqueries and CTEs → window functions). Build a query by tapping colour-coded tiles (keywords, functions, conditions, tables, columns, subqueries): no typing. Every answer is checked by running it on the practice database, so any equivalent query passes. 🐞 *Fix the bug* puzzles (two or more per level) start with a broken query: tap the wrong tile to take it out and tap the right one to drop it in at the cursor. Each puzzle shows the result to aim for, has a hint that points at the wrong tile or the next one, and earns 1 to 3 stars (each extra Check or hint costs one). A level map with stars per level, "Continue", replays that bring back low-star puzzles first, and a mixed review. XP: 6 per puzzle once, +3 for three stars, +15 per level cleared; badges for clearing a level, fixing 8 bugs and collecting 150 stars. A round counts for the daily "Code" quest.
- **Double XP.** Opening the quest chest starts 15 minutes of double XP.
- **Streak repair.** Losing a long streak to one missed day makes people quit, so the day after a miss you can win it back by earning twice your daily goal (once, the next day only, for runs of 3+ days).
- **You vs. last week.** An honest league: this week's XP against where you were at the same point last week. No invented rivals.
- **Dot**, the mascot, greets you with the single most useful next step and celebrates with you. Dot never nags or counts what you missed.
- **A daily notification** in the Android app (Settings; one a day, at your time, opt-in). On the web, a calendar reminder instead.
- Confetti, sounds (off by default) and a light vibration on phones, all optional and all respecting *reduced motion*.

The habit layer is designed not to manipulate: everything is earned by learning (every award has a unique key, so nothing can be farmed), a streak freeze is earned every 7 days and quietly covers a missed day, there are no countdown timers, no guilt messages and no punishments, and reminders are opt-in through your own calendar.

**Phone and computer**
- **Installable and offline.** It is a PWA: *Install app* (Android/desktop Chrome and Edge) or *Add to Home Screen* (iPhone). After the first visit everything, including the SQL engine, works with no connection.
- **Phone layout.** Bottom tab bar, safe areas for notches, 44px touch targets, 16px inputs (no iOS zoom), focus mode during practice rounds, light/dark/auto theme.
- **Automatic sync between phone and computer.** Settings → *Sync phone and computer*: create an account (just a username and a password) on one device and sign in with it on the others, web or Android app. From then on progress syncs by itself: when the app opens, a few seconds after each change, when you come back to it and every two minutes while it is open. Every sync **merges** (the same merge as below), so working on two devices, even offline, never loses anything. It uses the free Supabase project that FitQuest's accounts already use (`js/cloud.js`, plain `fetch`, no library): only the progress is stored, in this account's row of the `saves` table that no one else can read (row-level security); accounts are separate from FitQuest's; the password is never stored on the device, and the account can be deleted from Settings.
- **Move progress without an account**: Settings → *Create code* on one device, paste it on the other and *Merge*. Merging keeps the best of both (lessons and SQL are unioned, XP is a ledger of uniquely keyed awards, the review schedule keeps whichever device reviewed a question last) and never deletes anything, so you can do it in either direction at any time. A backup file works too.
- **Daily reminder** as a repeating calendar event with an alarm (Settings → *Add to my calendar*).
- **Private.** Everything is stored in your browser. No tracking, and no external requests unless you turn on sync.

## Run it

Plain HTML, CSS and JavaScript: no build step, no dependencies to install.

```bash
cd data-analyst-path
python3 -m http.server 8000
# open http://localhost:8000
```

Everything except SQLab, offline mode and installing also works by double-clicking `index.html` (browsers block WebAssembly and service workers on `file://` pages; the Lab explains this).

## Put it on your phone

The repository's `docs` workflow publishes the app with the documentation: after the branch is merged to `master`, it is served at `<your GitHub Pages address>/analyst/` (for example `https://<user>.github.io/torchnep/analyst/`), next to `/fitcoach/`. Open that address on your phone and use *Install app* (Android) or Share → *Add to Home Screen* (iPhone, in Safari). The one-time Pages setting (Settings → Pages → Source: GitHub Actions) is the same one the docs already use. Any other static host works too: upload the folder.

## Android app (APK)

`../android-analyst` wraps this same web app as a native Android app (see its README). The workflow
`.github/workflows/android-analyst.yml` builds it: run it by hand (Actions → *android-analyst* → Run workflow) and it
publishes a release `analyst-N` whose APK can be downloaded and installed straight from the phone. Inside the app, saving
files, copying, sharing and the calendar reminder go through a small native bridge (`ui.native()` in `js/ui.js`).

## Tests

```bash
node tests/unit.js                                   # 75 tests, Node only
node tests/unit-labs.js                              # the four labs: rules, level types, all 400 challenge checkers
node tests/unit-journey.js                           # missions, boss cases, case Try, migration of old saves
node tests/unit-arcade2.js                           # the four tool games against the real engines
BASE=http://localhost:8000 node tests/e2e.js          # real browser (needs: npm i -g playwright)
BASE=http://localhost:8000 node tests/e2e-cloud.js    # a computer and a phone syncing through a fake account service
```

- `tests/unit-journey.js` (run on its own): every mission and boss case resolves, every lab level is practised by a mission or a boss, a saved state from before the journey loads with identical XP, stars, lessons, quizzes, notes and badges, the case Try, test out, and merging the new fields (idempotent, commutative, safe with an old client).
- `tests/unit-arcade2.js` (run on its own): every generated X-ray, pipeline, safe and pill puzzle is solvable and its answer is what the spreadsheet, pandas and DAX engines compute.
- `tests/unit-labs.js`, `unit-python-bi.js`, `unit-sheets*.js` (run on their own): unlock rules and stars, saving and merging lab progress, DotSheets navigation and editing (arrows, Ctrl+arrows, Enter/Tab, copy/paste with shifted references, undo/redo), the Python interpreter (pandas syntax, errors, sandbox), DAX and Tableau evaluation, and every challenge: each one fails without work and passes with its solution.
- `tests/unit-cloud.js` (part of `unit.js`): sign up / sign in on two devices against a fake Supabase, nothing lost in either direction, no writes when nothing changed, one sync per burst of changes, expired and revoked sessions, offline, clear error messages, account deletion.
- `tests/unit-v3.js` (part of `unit.js`): feed content rules and sequencing, double XP, streak repair, week race, the correlation generator (the answer shown is the true correlation of the picture) and every SQL blocks puzzle executed on the practice database.
- `tests/unit.js`: XP, levels, streaks and freezes (with a fake clock and daylight-saving edges), quests, badges, the review schedule, the question bank (including a check that the right answer does not give itself away by length), content rules (ids that never move, boss questions, case options, card sources), state merging (idempotent, commutative, no double-counted XP), transfer codes, the calendar file, and static checks that `sw.js`, the manifest and `index.html` agree with the files on disk.
- `tests/e2e.js`: plays a practice round, walks a mission from Brief to Debrief on a phone, solves a Try challenge in place, closes a case Try, tests out of a mission, wins a boss case, plays the four tool games, checks the journey and the four labs on three phone sizes in light and dark (thumb-zone buttons, no sideways scrolling), completes a lesson and a SQL challenge, checks quests, chest and badges, moves progress from a desktop to a phone profile, checks the phone layout (no sideways scrolling, tab bar, touch targets), opens the three labs (name, world map), types into DotSheets with the keyboard, solves two challenges in each lab and sees the next level open, reloads to check stars and XP, checks the labs at phone width in dark mode, then goes offline and checks the app, the SQL engine and practice still work.

## Editing the site

After editing **any** file, regenerate the service worker's file list and version so installed copies update:

```bash
python3 tools/update-sw.py
```

(`node tests/unit.js` fails if you forget.) Users see a small "A new version is ready. Reload" bar; each release is cached atomically, so nobody runs a mix of old and new files. `node tools/make-icons.js` rebuilds every icon (web, iOS, Android launcher, monochrome and notification) from the single concept in `tools/icon-concept.js`.

## Layout

```
index.html              page shell: top bar, side menu, phone tab bar
css/style.css           styles (light, dark and auto; responsive; no external fonts)
manifest.webmanifest    install metadata and shortcuts      sw.js   offline cache (generated list)
js/ui.js                DOM helper, saved state (v2 ledger), personalisation, prompt cards
js/game.js              XP, levels, streaks, quests, badges, confetti, celebration modals, HUD
js/mascot.js            Dot: SVG character with moods, and what Dot says on the home page
js/feed-core.js         Discover: what to show next, collecting, daily five (pure logic)
js/feed.js              Discover feed screen, chart crimes, collection
js/arcade-core.js       correlation generator and scoring, SQL blocks checking (pure logic)
js/arcade.js            Guess the correlation and SQL blocks
js/path.js              the journey map
js/journey-core.js      missions, steps, case Try, test out and boss cases (pure logic)
js/mission.js           the mission and boss case screens
js/arcade2-core.js      the four tool games: puzzle generators and checks (pure logic)
js/arcade2.js           the four tool games
js/drill-core.js        question picking and spaced repetition (pure logic)
js/drill.js             practice lobby and round screen
js/sync.js              merge, transfer code, calendar reminder (pure logic)
js/cloud.js             automatic sync with an account (Supabase REST)
js/pwa.js               service worker, install prompt, update notice
js/me.js                You page: level, streak calendar, weekly chart, badges
js/settings.js          daily goal, theme, reminder, devices, reset
js/sqllab.js            SQLab               js/app.js   other pages and the router
js/labgame.js           shared progression of the four labs: worlds, levels, level types, stars, unlocks, map, task card
js/sheetslab.js js/sheets/   DotSheets (grid.js canvas grid, edit.js keyboard and editing logic, engine.js formulas)
js/pythonlab.js js/python/   DotPython (interp.js Python subset, engine.js pandas subset)
js/bilab.js js/bi/           DotBI (engine.js DAX and Tableau)
js/data/lab-*.js        the worlds, levels and challenges of the labs (lab-sql.js groups SQLab's existing challenges)
js/data/                backgrounds, curriculum, missions (cast, briefs, Try mapping, cases, boss cases), prompts, questions,
                        feed cards, SQL block puzzles, datasets (datasets-dotco.js: the Dot & Co. data) and SQL challenges
vendor/sql.js/          sql.js 1.15.2 (MIT), SQLite compiled to WebAssembly
tests/  tools/          unit and browser tests; service-worker and icon generators (not published)
```

## Extending it

- **A background:** add one object to `js/data/backgrounds.js`.
- **A lesson:** add it with `more(chapter, {...})` in `js/data/curriculum.js` (the fields are documented at the top), never in the middle: ids and numbers are saved progress. Then give it a mission in `js/data/missions.js`: who asks, the brief, and either lab levels for Try or two decisions in `DA.scenarios`. The tests fail until every lesson has a mission and every lab level is used by one.
- **Practice questions:** add `Q(category, question, right answer, [3 wrong ones], explanation)` to `js/data/questions.js`; options are shuffled for you.
- **A SQL challenge or dataset:** `js/data/datasets.js`. The reference `solution` defines the expected result; the task text must name the output columns in order, because the checker compares values, not column names.
- **A badge:** add an entry to the list in `js/game.js`.
- **A Discover card:** one line in `js/data/feed.js` (`story`, `idea`, `tip`, `myth`, `chart`, `quote` or `word`), followed by `src(label, url)` when it rests on official documentation. Keep it under 70 words and check the facts; the tests enforce the length and the links.
- **A SQL blocks puzzle:** `P(level, dataset, question, answer tiles, extra tiles, why)`, or `F(level, dataset, question, answer tiles, broken tiles, extra tiles, why)` for a bug to fix, at the END of `js/data/puzzles.js` (ids are saved progress). The tests run every reference query on the practice data and check that every broken query really is broken.

The practice data is generated in the browser from a fixed seed, so everyone gets identical data and answers stay checkable.

## Notes

- "Open in ChatGPT / Claude" also copies the prompt, because prefilling a chat from a link depends on the site and the prompt length.
- Third-party products, features and free tiers change quickly; the toolbox page says so and focuses on concepts.
- This is a learning plan, not a job guarantee.

sql.js is © its authors and distributed under the MIT licence (see `vendor/sql.js/LICENSE`).
