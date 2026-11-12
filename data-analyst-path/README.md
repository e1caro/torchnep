# Data Analyst Path

A free, static web app that teaches you to become a data analyst **starting from your own background**, with AI tools as your tutor. It is built for a daily habit: ten minutes a day on your phone or computer, with streaks, XP and short practice rounds that keep you coming back.

## What you get

**Learn**
- **Personalised.** Pick your background (science, engineering, finance, marketing, healthcare, sport, teaching, software, operations, humanities, or describe your own). Analogies, practice data, portfolio ideas, CV examples and every AI prompt adapt to it.
- **A realistic roadmap.** 9 modules, 29 lessons, about 130 hours: spreadsheets, SQL, Python/pandas, statistics, dashboards, AI-assisted analysis, portfolio, job search. Each lesson has key ideas, a hands-on task, an AI prompt, a quiz and notes.
- **SQL Lab.** Real SQLite in the browser (sql.js / WebAssembly), two practice databases, 16 challenges checked automatically. On a phone it has a keyword/table/column toolbar so you rarely need the keyboard for syntax.
- **Prompt library and AI rules.** 50 prompts with fill-in blanks, *Copy*, *Open in ChatGPT / Claude*, and answers in any of 12 languages.

**Discover (the scroll feed)**
- A vertical, snap-scrolling feed of **131 short cards**: data stories (the missing bullet holes, the map that stopped cholera, the $125 million unit error, 15,841 COVID cases lost in a spreadsheet…), statistics ideas in 30 seconds, SQL / spreadsheet / pandas / AI tips with code, career advice, quotes and a glossary. Facts were checked against their sources; where a number is only reported or attributed, the card says so.
- Interactive cards: **myth or fact** (tap to answer), **chart crimes** (tap to see the fix), a **review question** every fourth card (it feeds the spaced-repetition schedule) and a quick **guess-the-correlation** round.
- Reading a card **collects** it (+2 XP once). Five new cards a day is the Discover goal (+10 XP), followed by a "you are caught up" card: a natural place to stop. Save with ♡ or a double-tap, share, or jump to the matching lesson.
- "For you" favours the topics you are studying, keeps the same picks all day, and never shows two cards of the same kind in a row.

**Come back every day**
- **Daily goal** (20, 40 or 80 XP) with a progress ring, and **three daily quests** (learn, practise, code). Finishing all three opens a surprise chest of bonus XP.
- **Practice rounds.** Five questions, about two minutes, from a bank of 91 (29 lesson quizzes plus 62 more). Combo bonus, a second chance for every miss, and a **spaced-repetition schedule**: a question you get right returns after 1, 3, 7, 14, then 30 days; a miss returns sooner. "Mastered" means you answered it right on several different days.
- **XP, levels and titles** (Curious Beginner → Query Cadet → Junior Analyst → Data Legend), **streaks** with freezes, a 12-week **activity calendar**, a weekly chart and **43 badges**.
- **Learning path.** Every lesson is a stop on a winding, colour-coded road: finished stops are ticked, the next one pulses, and each unit ends with practice and a +25 XP chest. Nothing is locked.
- **Arcade.** *Guess the correlation* (read a scatter plot, three lives) and *SQL blocks*.
- **SQL blocks: 95 puzzles in 8 levels** (pick and sort → filter rows → count and sum → groups → joins → dates and CASE → subqueries and CTEs → window functions). Build a query by tapping colour-coded tiles (keywords, functions, conditions, tables, columns, subqueries): no typing. Every answer is checked by running it on the practice database, so any equivalent query passes. 🐞 *Fix the bug* puzzles (two or more per level) start with a broken query: tap the wrong tile to take it out and tap the right one to drop it in at the cursor. Each puzzle shows the result to aim for, has a hint that points at the wrong tile or the next one, and earns 1 to 3 stars (each extra Check or hint costs one). A level map with stars per level, "Continue", replays that bring back low-star puzzles first, and a mixed review. XP: 6 per puzzle once, +3 for three stars, +15 per level cleared; badges for clearing a level, fixing 8 bugs and collecting 150 stars. A round counts for the daily "Code" quest.
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

Everything except the SQL Lab, offline mode and installing also works by double-clicking `index.html` (browsers block WebAssembly and service workers on `file://` pages; the Lab explains this).

## Put it on your phone

The repository's `docs` workflow publishes the app with the documentation: after the branch is merged to `master`, it is served at `<your GitHub Pages address>/analyst/` (for example `https://<user>.github.io/torchnep/analyst/`), next to `/fitcoach/`. Open that address on your phone and use *Install app* (Android) or Share → *Add to Home Screen* (iPhone, in Safari). The one-time Pages setting (Settings → Pages → Source: GitHub Actions) is the same one the docs already use. Any other static host works too: upload the folder.

## Android app (APK)

`../android-analyst` wraps this same web app as a native Android app (see its README). The workflow
`.github/workflows/android-analyst.yml` builds it: run it by hand (Actions → *android-analyst* → Run workflow) and it
publishes a release `analyst-N` whose APK can be downloaded and installed straight from the phone. Inside the app, saving
files, copying, sharing and the calendar reminder go through a small native bridge (`ui.native()` in `js/ui.js`).

## Tests

```bash
node tests/unit.js                                   # 72 tests, Node only
BASE=http://localhost:8000 node tests/e2e.js          # real browser (needs: npm i -g playwright)
BASE=http://localhost:8000 node tests/e2e-cloud.js    # a computer and a phone syncing through a fake account service
```

- `tests/unit-cloud.js` (part of `unit.js`): sign up / sign in on two devices against a fake Supabase, nothing lost in either direction, no writes when nothing changed, one sync per burst of changes, expired and revoked sessions, offline, clear error messages, account deletion.
- `tests/unit-v3.js` (part of `unit.js`): feed content rules and sequencing, double XP, streak repair, week race, the correlation generator (the answer shown is the true correlation of the picture) and every SQL blocks puzzle executed on the practice database.
- `tests/unit.js`: XP, levels, streaks and freezes (with a fake clock and daylight-saving edges), quests, badges, the review schedule, the question bank, state merging (idempotent, commutative, no double-counted XP), transfer codes, the calendar file, and static checks that `sw.js`, the manifest and `index.html` agree with the files on disk.
- `tests/e2e.js`: plays a practice round, completes a lesson and a SQL challenge, checks quests, chest and badges, moves progress from a desktop to a phone profile, checks the phone layout (no sideways scrolling, tab bar, touch targets), then goes offline and checks the app, the SQL engine and practice still work.

## Editing the site

After editing **any** file, regenerate the service worker's file list and version so installed copies update:

```bash
python3 tools/update-sw.py
```

(`node tests/unit.js` fails if you forget.) Users see a small "A new version is ready. Reload" bar; each release is cached atomically, so nobody runs a mix of old and new files. `node tools/make-icons.js` re-renders the PNG icons from `icons/icon.svg`.

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
js/arcade.js            the two games
js/path.js              the learning path
js/drill-core.js        question picking and spaced repetition (pure logic)
js/drill.js             practice lobby and round screen
js/sync.js              merge, transfer code, calendar reminder (pure logic)
js/cloud.js             automatic sync with an account (Supabase REST)
js/pwa.js               service worker, install prompt, update notice
js/me.js                You page: level, streak calendar, weekly chart, badges
js/settings.js          daily goal, theme, reminder, devices, reset
js/sqllab.js            the SQL Lab         js/app.js   other pages and the router
js/data/                backgrounds, curriculum, prompts, questions, feed cards, SQL block puzzles, datasets and SQL challenges
vendor/sql.js/          sql.js 1.15.2 (MIT), SQLite compiled to WebAssembly
tests/  tools/          unit and browser tests; service-worker and icon generators (not published)
```

## Extending it

- **A background:** add one object to `js/data/backgrounds.js`.
- **A lesson:** edit `js/data/curriculum.js` (the fields are documented at the top). Roadmap, progress, prompt library, practice questions and badges update automatically.
- **Practice questions:** add `Q(category, question, right answer, [3 wrong ones], explanation)` to `js/data/questions.js`; options are shuffled for you.
- **A SQL challenge or dataset:** `js/data/datasets.js`. The reference `solution` defines the expected result; the task text must name the output columns in order, because the checker compares values, not column names.
- **A badge:** add an entry to the list in `js/game.js`.
- **A Discover card:** one line in `js/data/feed.js` (`story`, `idea`, `tip`, `myth`, `chart`, `quote` or `word`). Keep it under 70 words and check the facts; the tests enforce the length and the links.
- **A SQL blocks puzzle:** `P(level, dataset, question, answer tiles, extra tiles, why)`, or `F(level, dataset, question, answer tiles, broken tiles, extra tiles, why)` for a bug to fix, at the END of `js/data/puzzles.js` (ids are saved progress). The tests run every reference query on the practice data and check that every broken query really is broken.

The practice data is generated in the browser from a fixed seed, so everyone gets identical data and answers stay checkable.

## Notes

- "Open in ChatGPT / Claude" also copies the prompt, because prefilling a chat from a link depends on the site and the prompt length.
- Third-party products, features and free tiers change quickly; the toolbox page says so and focuses on concepts.
- This is a learning plan, not a job guarantee.

sql.js is © its authors and distributed under the MIT licence (see `vendor/sql.js/LICENSE`).
