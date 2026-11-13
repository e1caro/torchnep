# Prompt: Analyst Path revamp (one journey, phone-first, new icon, more levels, more content)

You are working in the `torchnep` repository on **Data Analyst Path** (`data-analyst-path/`), a static, offline-first PWA
(plain HTML/CSS/JS, no build step) that teaches people to become data analysts, plus its Android wrapper
(`android-analyst/`). Your job is a substantial revamp with five goals:

1. **Merge "Learn" and the labs into one journey**, in a way that feels like a game rather than a menu.
2. **Make the app genuinely good on a phone.**
3. **Redesign the app icon.**
4. **Add many more levels to the labs and make them more fun.**
5. **Study comparable data-analyst courses and add the content they cover that we are missing.**

Work in phases, commit after each one with every test passing, and stop at the checkpoint after Phase 0.

---

## 1. What exists today (verify, don't trust blindly)

- **Learning path** (`js/path.js`, `js/data/curriculum.js`): 9 modules, 41 lessons (~190 h). The path is a winding road
  of lesson nodes per unit, ending in a "+25 XP chest". Nothing is locked. Lessons are long single pages (key ideas,
  "in your world" analogy, code example, hands-on task, AI prompt, quiz, notes). `app.js` `V.lesson` adds "Open in
  DotSheets / DotPython / DotBI / SQLab" buttons.
- **Four labs, each a separate world map** (`js/labgame.js` shared progression; data in `js/data/lab-*.js`):
  - SQLab (`sqllab.js`, `lab-sql.js` groups `DA.challenges` from `datasets.js`): 4 worlds × 4 levels, 64 challenges, real SQLite via sql.js.
  - DotSheets (`sheetslab.js`, `js/sheets/*`): 4 × 4 × 3 = 48, canvas spreadsheet with a formula engine.
  - DotPython (`pythonlab.js`, `js/python/*`): 48, safe Python subset with pandas syntax.
  - DotBI (`bilab.js`, `js/bi/engine.js`): 48, DAX with filter context and Tableau calcs/LOD.
  - Stars 1–3 (solved / no hint / first try); solving 2 of 3 opens the next level; XP keyed per challenge.
- **Also:** SQL blocks tap-tile puzzles (`arcade.js`, `js/data/puzzles.js`), practice rounds with spaced repetition
  (`drill*.js`, `js/data/questions.js`), the Discover feed (`feed*.js`, `js/data/feed.js`), daily quests
  (learn / practise / code), badges, the Dot mascot, account sync (`cloud.js`) and merge (`sync.js`).
- **How they connect today:** the path only shows "extra" stops in units m1/m2/m3/m5 that link to a lab's **home
  page**, not to a specific level. The labs are reachable from the side menu behind **More**. A learner has two separate
  progress systems (lessons done vs. lab stars) and has to decide on their own when to go to a lab.
- **Saved state:** `ui.state.done` (lessons), `ui.state.labs[labId][challengeId]` (stars), legacy `state.sql` /
  `state.sheets`, `state.blocks`, an XP ledger of unique award keys. `sync.js` merges states (must stay idempotent and
  commutative). **Challenge, puzzle, lesson and question ids are saved progress: never rename or renumber; only append.**
- **Icons:** `icons/icon.svg` (indigo→cyan rounded square, three bars + a yellow trend line with dots), PNGs rendered by
  `tools/make-icons.js`, Android adaptive icon in `android-analyst/app/src/main/res/` (foreground/background PNGs only,
  **no `<monochrome>` layer**), notification icon `drawable/ic_stat_analyst.xml`. The same SVG is the in-app logo.
- **README counts are stale** (it says 29 lessons and older totals). Fix them when you finish.

## 2. Problems already observed at phone size (Pixel 7, 412×915)

- The path page is ~11,900 px tall: every lesson is a large node with a wrapped label, and no unit collapses.
- On lab challenge screens the code editor is a fixed ~570 px block. **Run / Check sit at or under the tab bar**. In
  SQLab free exploration they are hidden behind it. Long placeholder text is clipped sideways. With the on-screen
  keyboard open it gets worse.
- Lab level maps use two narrow columns: titles wrap, star slots render as "· · ·", and every locked card repeats "Solve 2
  in the level before".
- Deep screens (lesson, lab play) have no back button and no page title in the top bar. The top bar only shows the
  logo and HUD chips.
- Lesson pages are ~3,200 px of continuous text on a phone.
- Labs, the prompt library, the AI toolbox, Arcade and Settings are all hidden behind **More**.

Re-check these yourself and add anything else you find.

## 3. Goals in detail

### A. One journey: merge learning and labs

Recommended concept (improve it if you find something better, but keep its spirit):

- **The learner joins "Dot & Co."**, the café chain that the practice data already describes (`datasets.js` "Café chain:
  sales 2025"; the "Training study" dataset can be a partner client). Each module becomes a **chapter/district** on one
  journey map, with its own colour (reuse `DA.unitColor`), header art and icon.
- **Each lesson becomes a mission** with a short, consistent rhythm of steps on one screen you swipe or tap through:
  1. **Brief:** a stakeholder message with the business question ("Maya, Head of Ops: which store is slipping?").
  2. **Learn:** the lesson's `learn[]` split into bite-size cards, plus the "in your world" analogy and the code example.
  3. **Try:** the lab challenges for this concept, **embedded inline** using the existing engines and checkers (not a
     link to the lab home). On phones, offer the no-typing variant where one exists (SQL blocks, tap tiles).
  4. **Check:** the quiz plus 1–2 spaced-repetition questions.
  5. **Debrief:** XP and stars, the AI tutor prompt as an optional "level up with your tutor" step, notes.
- **Every lab level is attached to a lesson** (build an explicit mapping table, e.g. SQLab world 1 levels → lesson
  "SELECT, WHERE and ORDER BY"). Lessons with no lab yet (orientation, stats, AI, portfolio, career) get quiz-style or
  decision-style steps instead.
- **Each chapter ends in a boss case:** a multi-step, story-driven problem that uses that chapter's tools on the data.
  It replaces the chest node; keep the existing chest XP award key so no one earns it twice or loses it.
- **The labs remain as the "Workshop"**: free exploration, replaying any level, and the full world maps. They are
  reachable from the journey map and from every mission. Stars earned in either place are the same stars (one source
  of truth: `state.labs`).
- **Locking:** keep the app's promise that learning is never blocked. Missions are always open. Starting or finishing a
  mission opens its mapped lab levels in the Workshop, and a "test out" option lets people skip ahead. You never have to
  grind a lab to read a lesson.
- **Home** gets one big **Continue** button that opens the exact next step (read, try, quiz or boss), whatever its type.
  Quests keep working: a mission's Try step counts for "Code", its Check counts for "Practise".
- **Migration:** existing progress must carry over exactly. Done lessons stay done, lab stars and XP are unchanged, and
  chapters or missions already earned show as earned. Add a fixture of a current-version saved state and test it.

### B. Phone-first

- Rework navigation, for example: **Home · Journey · Practice (centre) · Discover · You**. Labs live inside Journey (Workshop),
  Arcade inside Practice, and prompts/toolbox/settings move into You or a top-bar menu. Deep screens get a back
  button and a title.
- **Challenge screens:** hide the tab bar (focus mode, like practice rounds), add a sticky bottom action bar (Run ·
  Check · Hint) that respects safe areas, make the editor auto-grow from ~6 lines, and soft-wrap or scroll the
  placeholder. Use `visualViewport` so the editor and the action bar stay visible above the on-screen keyboard. Make
  the task card collapsible, and show hint / worked example / solution in a bottom sheet.
- **Journey map:** auto-scroll to the current mission, collapse finished or far-away chapters, use a sticky chapter
  header, give nodes compact labels, and add a "jump to current" button. Target: the current mission is visible on
  the first screen at 360×740.
- **Level maps:** a single-column or horizontal "level road" with real star icons and one clear lock message.
- **Mission steps:** swipe between steps, keep progress dots at the top, and keep a thumb-reachable primary button at
  the bottom.
- Keep and extend what works: 44 px touch targets, 16 px inputs, safe areas, dark mode, reduced motion, vibration
  toggles. DotSheets should work in landscape.
- Test at 360×740, 390×844 and 412×915, light and dark, with the keyboard simulated, plus a desktop width so desktop
  doesn't regress. Check the Android WebView wrapper still works (file saving, sharing, reminders through `ui.native()`).

### C. New icon

- The current icon reads as a generic analytics/finance app. Its thin trend line and dots turn to mush at 48 px, and
  nothing ties it to Dot or to "path".
- Design **3 original concepts** as SVG. One seed idea: a route that becomes a rising line and ends in Dot as the
  final data point. Render each at 16, 32, 48 and 192 px on light and dark backgrounds, and inside Android circle,
  squircle and rounded-square masks. Put them side by side in one comparison image.
- At the checkpoint, show me the comparison image and your recommendation.
- Deliver the chosen icon everywhere:
  - `icons/icon.svg`, `icon-192/512`, maskable 512 (everything important inside the central 80%), `favicon.png`, and
    an opaque `apple-touch-icon`. Update `tools/make-icons.js` if needed.
  - Android: adaptive foreground (108 dp canvas, key shapes inside the 66 dp safe circle), background, a **new
    `<monochrome>` layer** for Android 13+ themed icons, legacy mipmaps, and a matching notification icon.
  - The in-app logo, plus the manifest `theme_color` and `background_color` if the palette changes.

### D. More levels, and cooler ones

- **Grow every lab to at least 8 worlds** (today: 4 each). Keep the existing worlds and ids, and append new ones.
- **Mix in new level types** that the existing engines can check:
  - 🐞 **Bug hunt:** start from a broken formula, query or code and fix it. SQL blocks already does this; bring it to
    all four labs.
  - 🔮 **Predict the output:** read the code and pick or type the result before running it.
  - 🧩 **Put it in order:** tap shuffled lines of a SQL query or pandas chain into the right order. Good on phones.
  - 🔁 **Rosetta:** the same business question solved in Sheets, then SQL, then pandas, then DAX, across labs.
  - 🕵️ **Case file:** a multi-step mystery on the data, where each answer is the clue for the next step. Write an
    original story (for example, the oat-milk revenue that vanished in one store).
  - 👔 **Stakeholder request:** a vague ask, then pick the right clarifying question, compute the number, choose the
    chart and pick the honest one-line takeaway.
  - 🎯 **Interview set:** classic analyst interview patterns (top-N per group, second highest, running totals,
    retention, funnel, dedupe, gaps and islands, median).
  - 🧹 **Cleaning gauntlet:** several chained fixes on a messy table, checked on the final table.
  - 🏆 **Boss level** at the end of each world: combines the world's skills, with no hint allowed for the third star.
- **Make it feel good:**
  - Each world gets a theme (colour, header illustration in inline SVG, icon set).
  - The map is animated, with Dot walking to the current level.
  - Each level opens with a short intro card.
  - A clear star burst on completion, and a skippable world-complete moment.
  - A collectible per world, shown on the You page.
  - Respect reduced motion throughout.
- **Add new seeded datasets**, generated in the browser so everyone gets identical data, as the existing ones are.
  Suggestions:
  - app/web events (funnels, conversion)
  - subscriptions (MRR, churn, cohorts, LTV)
  - marketing campaigns with an A/B test
  - support tickets with free text (text cleaning and AI classification)
- **Keep the ethics.** The README's habit-layer rules stay: no countdown timers, no guilt, nothing farmable, and nothing
  that blocks learning. Use "par" (few runs, no hints) instead of timers.

### E. Content from comparable courses

- **Research first.** Read the current official syllabi (record the URL and the date you checked) of at least:
  - Google Data Analytics Professional Certificate (Coursera)
  - IBM Data Analyst Professional Certificate, plus IBM's Generative AI for Data Analysts
  - Microsoft PL-300 Power BI Data Analyst study guide (third-party sources say the skills outline was updated in
    April 2026; confirm on Microsoft Learn)
  - Tableau Certified Data Analyst
  - DataCamp Data Analyst Associate certification
  - Kaggle Learn (Intro/Advanced SQL, Pandas, Data Cleaning, Data Visualization)
  - Mode's SQL tutorial
- **Look at interactive learning apps for mechanics only:** Brilliant, Mimo, SQLBolt, Select Star SQL.
- **Write a gap table:** topic → which programmes cover it → do we cover it (lesson / lab / questions)? → what to add.
  Gaps to check (confirm them, don't assume):
  - The **ask/define phase**: SMART-style questions, stakeholders, scoping, KPI trees, metric definitions.
  - **Data credibility, bias, ethics, privacy/GDPR basics, anonymisation.**
  - **Data validation and documentation:** data dictionary, changelog, reconciliation, data-quality dimensions.
  - **Business metrics:** funnels, retention/churn, cohorts, LTV, CAC, ARPU, MRR, unit economics, north-star metric.
  - **Experimentation in depth:** sample size and power, MDE, sample-ratio mismatch, peeking, guardrail metrics.
  - **SQL:** NULL logic, string/date functions, UNION, self-joins, CASE pivots, cleaning in SQL, views, indexes and
    query plans basics.
  - **Spreadsheets:** conditional formatting, data validation, charts, what-if / Goal Seek.
  - **Power BI (per PL-300):**
    - Power Query profiling, merge vs append
    - Cardinality and cross-filter direction, role-playing dates
    - Row-level security
    - Bookmarks, drillthrough, tooltips
    - Performance
    - Workspaces, apps, refresh
    - Copilot
  - **Tableau:** parameters, sets, actions, table calcs.
  - **Forecasting and time series basics:** moving averages, seasonality, YoY.
  - **Modern data stack literacy:** warehouses, ELT, dbt, Git for analysts.
  - **An optional R/tidyverse side quest** (Google's certificate uses R).
  - **Looker Studio.**
  - **Generative-AI features inside Excel, Sheets and Power BI**, kept vendor-neutral and date-stamped.
  - **A capstone and a take-home interview simulation.**
- **For each gap you add:**
  - a lesson in `curriculum.js` (same fields, same tone)
  - its mission steps and lab levels
  - practice questions with `Q(...)`
  - where it fits, Discover cards that follow the feed rules: ≤ 70 words, facts checked, sources linked
- **Write everything yourself.** Use other courses only to find topics and good mechanics. Do not copy their text,
  datasets, case studies or characters, and do not recreate a specific existing game.

## 4. Hard constraints

- **Keep the stack:**
  - Plain HTML/CSS/JS with no build step and no new runtime dependencies.
  - No external fonts or requests, except the existing opt-in sync.
  - Everything must work offline.
- **Never rename or renumber** lesson, challenge, puzzle or question ids. Only append.
  - Old saved states must load with identical XP, stars and done lessons.
  - `sync.js` merge must stay idempotent and commutative, with no double-counted XP.
  - Account sync must keep working between an old and a new client.
- **Tests:**
  - Every new challenge gets the same test treatment as the existing ones: it fails with no work and passes with its
    reference solution.
  - Add a test that every lab level is mapped to a mission or boss, and one that every mission's steps resolve.
- **After editing any file in `data-analyst-path/`**, run `python3 tools/update-sw.py`. `node tests/unit.js` fails if
  you forget.
- **Accessibility:** keyboard reachable, visible focus, ARIA labels on map nodes and steps, colour never the only
  signal, reduced motion respected, dark mode everywhere.
- Don't trigger an Android release build unless I ask.

## 5. How to work

**Phase 0: audit, research, design (no app code yet)**

1. Read `README.md`, `js/path.js`, `js/labgame.js`, `js/data/lab-*.js`, `js/app.js` (home, lesson, router),
   `js/ui.js` (state), `js/sync.js`, the lab screens and `css/style.css`. Run every test suite and note the baseline.
2. Serve the app (`python3 -m http.server` in `data-analyst-path/`) and take Playwright screenshots of home, path, a
   lesson, each lab map and play screen, practice and You, at the three phone sizes in light and dark mode.
3. Do the course research and write the gap table.
4. Write `prompts/analyst-path-revamp-plan.md` with:
   - the journey design (the map, mission steps, the lesson ↔ lab-level mapping table, boss cases, locking rules,
     migration)
   - the new navigation
   - the phone fixes, each tied to a screenshot
   - the three icon concepts (comparison image)
   - the new worlds and level types per lab with counts
   - the content to add, with sources
   - a phase-by-phase build order

**Checkpoint:** show me the plan summary, the icon comparison image and a few "before" screenshots. Wait for my OK
before building.

**Then build, committing after each phase with all tests passing:**

1. Journey merge + migration + tests
2. Phone UX
3. Icon (web + Android)
4. New worlds, level types and datasets
5. New lessons, questions and cards from the gap table
6. README with accurate counts, `update-sw.py`, full test run, "after" screenshots

Push to the working branch. Don't open a pull request unless I ask.

## 6. Done means

- From Home, one **Continue** tap always opens the right next step. No lab needs the **More** menu.
- Each lesson is a mission with steps, and its practice is inline.
- Lab stars and lesson progress show up in one journey.
- An existing user's progress (the fixture) carries over exactly.
- **At 360×740:**
  - no sideways scrolling
  - Run/Check/Continue visible without scrolling, with or without the keyboard
  - the current mission visible on the first screen of the journey
  - touch targets ≥ 44 px
  - the same holds in dark mode
- The new icon is legible at 16 and 48 px, fits the maskable safe zone, and the Android themed (monochrome) icon works.
- **Every lab has ≥ 8 worlds and at least 5 of the new level types appear.** Every new challenge is tested.
- Every gap in the table is either covered (lesson + practice + questions) or explicitly marked out of scope with a
  reason.
- All test suites pass, `sw.js` is regenerated, and the README is accurate.

**Final report:**

- what changed, per goal
- before/after screenshots at phone size
- new counts (missions, worlds, levels, challenges, questions, cards)
- anything you cut, and why
- known issues
