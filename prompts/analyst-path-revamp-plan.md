# Analyst Path revamp: plan (Phase 0)

Date: 2026-11-13 · Branch `ccr-65118130-ok06d8` · Base commit `c25114d` (master, APK analyst-22)

The plan has five goals:
- **A.** One journey.
- **B.** Phone-first.
- **C.** A new icon.
- **D.** Bigger labs.
- **E.** Content gaps.

This file covers the design, the evidence behind it and the build order. Nothing in the app has changed yet.

Assets (in `prompts/analyst-path-revamp/`):

| File | What it shows |
|---|---|
| `icon-comparison.png` | The 3 icon concepts and today's icon, at 16/32/48/192 px on light and dark, in circle/squircle/rounded masks, plus the Android 13 monochrome layer |
| `icons/*.svg` | Each concept as an `any`, a `maskable` and a `mono` SVG |
| `before-fold-360x740.png` | Full-page captures of home, SQLab, DotPython and DotSheets with the fold (the top of the tab bar) marked in red, and the main buttons boxed |
| `before-360x740-light.png` | Home, path, lesson, practice, You, SQLab map and SQLab play |
| `before-360x740-dark-labs.png` | DotSheets, DotPython and DotBI, map and play, in dark mode |
| `before-390-412-mixed.png` | Home and path at 390×844 dark, path at 412×915 light, SQLab play at 390, DotPython play at 412 |

---

## 0. Audit summary

### Baseline

- `tests/unit.js`: 73 passed. It also runs `unit-more`, `unit-sync`, `unit-pwa`, `unit-native`, `unit-v3` and `unit-cloud`.
- `unit-labs`: 16 passed.
- `unit-python-bi`: 3 passed.
- The 4 `unit-sheets-*` suites: 16 passed.
- `e2e.js`: 115 passed, 1 failed. The failure ("Saved shows only the bookmarked card") also fails on master, so it predates this work.

### Content today

| Item | Count |
|---|---|
| Modules | 9 |
| Lessons | 41 (190 h) |
| SQL challenges | 64 |
| SQL examples | 16 |
| SQL blocks puzzles | 123 |
| Bank questions | 188 (41 lesson quizzes + 147 extra) |
| Discover cards | 223 |
| Badges | 75 |

The labs:

| Lab | Worlds | Levels | Challenges |
|---|---|---|---|
| DotSheets | 4 | 16 | 48 |
| DotPython | 4 | 16 | 48 |
| DotBI | 4 | 16 | 48 |
| SQLab | 4 | 16 | 64 |

### Saved state

- Fields: `done`, `quiz`, `notes`, `sql`, `sheets`, `labs{sheets,python,bi,sql}` (1–3 stars), the `xp` ledger with unique keys, `quests`, `srs`, `badges`, `stats`, `seen` (at most 100 keys, values `true` only), `cards`, `saved`, `blocks`, `repaired` and `boost`.
- The chest XP key is `module:<mid>`. It is awarded today in `game.js` when every lesson of a module is done.

### Phone measurements

These come from Playwright with a seeded user who has 12 lessons done. The usable fold is the viewport height minus the 61 px tab bar: 679 px at 360×740, 783 px at 390×844 and 854 px at 412×915.

| # | Screen | What happens | 360×740 | 390×844 | 412×915 | Screenshot |
|---|---|---|---|---|---|---|
| P1 | Home | The "Up next" card is the only way to continue, and it sits below the fold | top 878 (hidden) | 860 (hidden) | 843 (11 px visible) | before-fold, panel 1 |
| P2 | Path | The page is 12,105 px tall, and the current lesson (3.3) is 5 screens down, with no auto-scroll | node at 3,583 | 3,521 | 3,502 | before-360x740-light, panel 2 |
| P3 | Path | Each stop is 116–141 px tall, the unit banners take 180 px, and there is no way to collapse a unit | — | — | — | same |
| P4 | SQLab play | Run and Check are below the fold, and the editor starts at 586 | Run/Check at 832 (hidden) | 832 (hidden) | 809 | before-fold, panel 2 |
| P5 | DotPython play | Run and Check sit exactly under the tab bar | 684–725 (covered) | 684 | 651 | before-fold, panel 3 |
| P6 | DotSheets play | Check is 1.5 screens down, under the grid and the sheet tabs | 1,061 | 1,087 | 1,046 | before-fold, panel 4 |
| P7 | Lab maps | 2-column cards about 150 px wide, three grey dots instead of stars, and "Solve 2 in the level before" repeated on every locked card | doc 2,906 | 2,880 | 2,807 | before-360x740-dark-labs |
| P8 | Lab play | Snippet and table chip rows run off the right edge with no scroll hint | — | — | — | the same panels |
| P9 | Lesson | One long page for each lesson (3,835 px) with no steps; the quiz and the "Do it" task come last | doc 3,835 | 3,654 | 3,583 | before-360x740-light, panel 3 |
| P10 | You | 14,374 px at 360 (badges and calendar), and nothing folds | 14,374 | 9,429 | 9,255 | same, panel 5 |
| P11 | Deep screens | No back button or title: a breadcrumb "Roadmap ›" link about 20 px tall | — | — | — | panel 3 |
| P12 | Navigation | The labs, settings, prompts and AI toolbox are behind "More"; the Path tab is called "Path" | — | — | — | every panel |
| P13 | Android | The manifest has `windowSoftInputMode="adjustResize"`, but there is no `visualViewport` handling in the web code, so the editor and buttons can end up under the keyboard in the WebView | — | — | — | `AndroidManifest.xml` |

---

## A. One journey: "Dot & Co."

### Story frame

- Dot & Co. is an original, fictional café chain with a small ordering app and a coffee club subscription ("Dot Club").
- You join as its first data analyst. Dot (the existing mascot) is your guide.
- Each chapter is a module, and each module keeps its colour from `DA.unitColor(mi)`.
- The characters are original and appear only as short request cards:
  - Rosa runs operations.
  - Theo leads marketing.
  - Ana is in finance.
  - Sam leads support.
  - Kai owns the app.

| Ch. | Module | Story beat | Boss case (replaces the chest, keeps the `module:<mid>` XP key) |
|---|---|---|---|
| 1 | m0 Orientation | First week: what the business needs and how you will work with AI | **First-week brief**: frame a vague request, pick a metric, and check ethics (case questions) |
| 2 | m1 Spreadsheets | The spreadsheet backlog lands on your desk | **Month-end close** (DotSheets 8.4 boss, 8.3 case file, 6.4 gauntlet) |
| 3 | m2 SQL | You get database access | **The Monday numbers** (SQLab 8.4 boss + 4.4) |
| 4 | m3 Python | You automate the weekly report | **Support desk review** (DotPython 8.4 boss) |
| 5 | m4 Statistics | "Did the new email campaign work?" | **Was it a win?** (DotPython 7.4 boss on the A/B dataset) |
| 6 | m5 BI | The board wants a dashboard | **Board dashboard** (DotBI 8.4 boss) |
| 7 | m6 AI | An AI assistant joins the team | **Audit the AI report** (bug hunt on SQLab 5.4 + case questions) |
| 8 | m7 Portfolio | Turn the work into your own case study | **Your case file** (one challenge from each lab + case questions) |
| 9 | m8 Career | Interview day | **Interview loop** (SQLab 7.3 interview set + questions) |

### Mission steps

Each lesson becomes a mission with the same id. Routes:
- `#/mission/<lessonId>` opens the mission.
- `#/lesson/<id>` stays as the full reference page, linked from Debrief.

| Step | What you do | Source | XP and quests |
|---|---|---|---|
| **Brief** | One story card: who asks, what they need, why it matters (`l.why` plus a request line) | new `DA.missions[id].brief` | none |
| **Learn** | One idea per card, swipeable: `l.concept`, each `l.learn` item and the `l.code` sample; every second card has a 1-tap check with instant feedback (Brilliant-style mechanic) | existing lesson fields + new `checks` | none (cannot be farmed) |
| **Try** | 1–3 lab challenges inline, with the lab engines and `L.page`. Where the lesson has no lab, it gets a scenario set (pick, order or spot-the-error on a small table) | the mapping table below | Lab XP through `L.record`, with the existing `sql:`/`sheet:`/`py:`/`bi:` keys; marks the **Code** quest |
| **Check** | The lesson quiz plus 2 spaced-repetition questions from the module's category | `l.quiz` + `DA.drill` | `quiz:<id>` as today, plus the drill's own XP; marks the **Practise** quest |
| **Debrief** | What you can now do, the real-world "Do it" task, notes, the AI prompt, "Mark complete", then Next mission | existing `l.doit`, notes, `l.ai` | `lesson:<id>` as today; marks the **Learn** quest |

On phones, Try defaults to a **no-typing variant** (Mimo-style mechanic):
- A token bank is built from the reference solution plus seeded distractors, the same idea as SQL blocks.
- A tap assembles the code, and the check runs it through the real engine, so any correct answer passes.
- "Type instead" switches to the editor.

**Test out:** every mission has a "I know this: test out" button.
- It runs Check with 3 extra bank questions.
- If every answer is right, the mission is marked complete and pays the same `lesson:<id>` key, so the XP is the same and there is no bonus to farm.
- If not, you get a "Here is what to review" list, and nothing is blocked.

**Locking:**
- Missions and boss cases are always open.
- Inside a mission, Try challenges are always playable, even if their level is locked in the Workshop.
- Solving one counts for the level (`solved > 0`), so it also opens the level in the Workshop. There is one source of truth: `state.labs`.

### Journey map

`#/journey` is a new tab. `#/roadmap` becomes an alias.
- Single-column road on phones, gentle snake on ≥ 720 px.
- Compact 56 px nodes with the label to the right.
- Real stars on missions that have Try challenges.
- Chapter header is sticky and holds the colour, "3/7" and a collapse toggle.
- Done chapters are collapsed; the current chapter is open.
- Future chapters are collapsed and show their first two missions.
- On open, the page auto-scrolls to the current mission (instantly if the user prefers reduced motion).
- A "Jump to current" button appears when the current node is off screen (IntersectionObserver).
- The boss node closes each chapter.
- ARIA:
  - Each node has a label like "Mission 3.3, JOINs: combining tables, step 3 of 5, 2 of 3 stars".
  - The current node has `aria-current="step"`.
  - The collapse buttons have `aria-expanded`.

### Home

- The first element under the greeting is one **Continue** button, for example "Continue · Mission 3.3 JOINs · Try (step 3 of 5)".
- Below it come Today's quests, then the rest of the page.
- The race, level and course cards fold into one compact "Your week" row.

### Lesson ↔ lab level mapping (every level is mapped)

Notation: `Sh` = DotSheets, `Py` = DotPython, `BI` = DotBI, `SQL` = SQLab. `world.level`; **bold** marks a new world (W5–W8).

| Mission | Try (lab levels) | Mission | Try (lab levels) |
|---|---|---|---|
| l0-1 What a data analyst does | scenario set | l3-1 First DataFrame | Py 1.1 1.2 1.3 1.4 |
| l0-2 Learn with AI | scenario set | l3-2 Cleaning and transforming | Py 2.3 4.1 4.2 |
| l0-3 Target and baseline | scenario set | l3-3 Merge, reshape, plot | Py 4.3 **5.1 5.2 5.3** |
| **l0-4 Ask the right question** (new) | Sh **7.3** · SQL **6.4** (stakeholder requests) | l3-4 Advanced pandas | Py 2.1 2.2 2.4 3.1 3.2 3.3 3.4 **5.4** |
| **l0-5 Data ethics, privacy, bias** (new) | scenario set | l3-5 Time series, cohorts, RFM | Py 4.4 **6.1 6.2 6.3** |
| l1-1 Tidy data and cleaning | Sh 2.1 2.2 2.3 | l3-6 Charts in Python | Py **6.4** (predict output) + scenario |
| l1-2 Formulas, lookups, pivots | Sh 1.1 1.2 3.1 4.1 | l3-7 Automating reports | Py **8.1 8.2** |
| l1-3 First mini-analysis | Sh 3.3 3.4 4.4 **7.1 7.2** | **l3-8 Validate before you trust** (new) | Py **8.3** · SQL **8.2 8.3** |
| l1-4 Dynamic arrays, XLOOKUP, LET | Sh 4.2 4.3 | l4-1 Describing data | scenario set |
| l1-5 Power Query, repeatable ETL | Sh 2.4 **6.1 6.2 6.3** | l4-2 Sampling and intervals | scenario set |
| l1-6 Sheets QUERY, ARRAYFORMULA | Sh **5.1 5.2 7.4** (Rosetta SQL → formula) | l4-3 Hypothesis tests, A/B | Py **7.1 7.2** · SQL **8.1** |
| l1-7 Modeling and error-proofing | Sh 1.3 1.4 3.2 **5.3 5.4 8.1 8.2** | l4-4 Correlation, regression | Guess-the-correlation round + scenario |
| l2-1 SELECT, WHERE, ORDER BY | SQL 1.1 1.2 | **l4-5 Design an experiment** (new) | Py **7.3** |
| l2-2 GROUP BY and HAVING | SQL 1.3 1.4 | l5-1 Choosing the right chart | scenario set |
| l2-3 JOINs | SQL 2.1 2.2 **5.3** | l5-2 Dashboards | BI 1.1 1.2 1.3 1.4 4.1 4.2 |
| l2-4 CTEs and windows | SQL 3.1 3.2 3.3 3.4 4.1 4.2 | l5-3 Data storytelling | BI **6.4** (stakeholder request) |
| **l2-5 Clean data in SQL** (new) | SQL 2.3 2.4 **5.1 5.2** | l5-4 Star schema | BI 3.1 3.2 3.3 3.4 **8.1** |
| **l2-6 Funnels, cohorts, retention** (new) | SQL **6.1 6.2 6.3 7.1 7.2** | l5-5 DAX CALCULATE, time intelligence | BI 2.1 2.2 2.3 2.4 **5.1 5.2 5.3 5.4** |
| l6-1 Prompt patterns | scenario set | l5-6 Tableau table calcs, parameters | BI 4.4 **7.1 7.3** |
| l6-2 Verify AI output | SQL **5.4** (bug hunt: "AI wrote this") | l5-7 Tableau LOD, actions | BI 4.3 **7.2 7.4** |
| l6-3 AI for messy text | scenario set | **l5-8 Power BI service, RLS, refresh** (new) | BI **8.2 8.3** |
| **l6-4 AI inside your tools** (new) | scenario set | **l5-9 Ranking, performance, storage modes** (new) | BI **6.1 6.2 6.3** |
| l7-1 Plan a portfolio | scenario set | **l5-10 Tableau data: relationships, blends, publishing** (new) | scenario set |
| l7-2 Build a project end to end | SQL 4.3 **7.4** (case file) | l8-2 Interview preparation | SQL **7.3** (interview set) |
| l7-3 Publish and present | scenario set | l8-1, l8-3 | scenario sets |

The bosses take the remaining levels:
- Sh **6.4 8.3 8.4**
- SQL 4.4 **8.4**
- Py **7.4 8.4**
- BI **8.4**

Coverage check:
- All 128 levels (4 labs × 8 worlds × 4 levels) appear exactly once as a mission or a boss.
- The m6, m7 and m8 bosses reuse levels that are already mapped, which is allowed.
- A test asserts both.

### Data model and migration

- **Mission data:** new `js/data/missions.js` holds `DA.missions[lessonId] = { brief, checks[], tryLevels[], scenario[] }` and `DA.bosses[mid] = { title, steps[] }`. Lesson ids are unchanged; new lessons are appended with new ids only.
- **State:**
  - New `journey: { <lessonId>: bits }`, where 1 = brief seen, 2 = learn done and 4 = tested out.
  - New `bosses: { <mid>: stars 1–3 }`.
  - Everything else is **derived** from fields that exist today:
    - Try progress comes from `labs` stars.
    - Check comes from `quiz[id]`.
    - Complete comes from `done[id]`.
    - A boss counts as won when the ledger holds `module:<mid>`.
  - So if an old client drops the new fields, the cost is at most re-showing Brief and Learn cards, and no XP, stars or completions are lost.
- **Sanitize:**
  - `journey` holds integers 0–7 for known lesson ids only.
  - `bosses` holds integers 1–3 for known module ids only.
- **Merge (`sync.js`):**
  - `journey` uses bitwise OR and `bosses` uses max.
  - Both rules are idempotent, commutative and associative, like the other fields.
  - The XP ledger stays keyed, so there is no double counting.
- **Chest to boss:**
  - A boss win awards `module:<mid>` with the same amount (`ui.XP.module`).
  - New clients no longer award it when the last lesson is done.
  - Ledgers that already hold the key keep it, so totals do not change.
  - An old client may still award it on its own trigger, but the unique key prevents double counting.
- **Fixture test:**
  - `tests/fixtures/state-before-revamp.json` is captured from the current build. It has 14 lessons done, quizzes, notes, stars in all 4 labs, blocks, chests, badges, streak data and two awarded `module:` keys.
  - `tests/unit-journey.js` loads it and asserts identical XP total, done set, stars and badges.
  - It also checks the mission states derived from that save.
  - Finally it merges the save with a stripped "old client" copy in both orders and asserts the same result and the same XP total.

---

## B. Phone-first

### Navigation

- The tab bar becomes **Home · Journey · Practice · Discover · You**. "More" goes away.
- **Practice** gets three sections:
  - Quick rounds (the drill).
  - Workshop: the 4 lab tiles with stars and progress.
  - Arcade.
- **You** gets the profile, badges and streak, collectibles, and a "More" list: Settings, Prompt library and AI toolbox.
- On desktop, the sidebar keeps the same five groups with sub-links.
- Deep screens get a top app bar with ← Back (history back, falling back to the parent route), a title and an optional ⋯ button. This applies to missions, lessons, lab maps and play screens, boss cases, settings, prompts and tools. The ⋯ button holds Hint, Example and Solution. The tab bar is hidden on mission steps and challenge play (focus mode).

### Phone fixes tied to the screenshots

| Fix | Fixes | What changes |
|---|---|---|
| F1 Continue first | P1 | The Continue button is the first card on Home, visible above the fold at 360×740 (target: top < 360 px). |
| F2 Journey map | P2, P3 | Collapsible chapters, sticky header, 56 px nodes, auto-scroll, a "Jump to current" button. Target: at 360×740 the current mission is in view on open, and the page is under 4,000 px with chapters collapsed. |
| F3 Focus mode for challenges | P4, P5, P6 | The tab bar is hidden. A sticky bottom action bar (Run · Check · Hint) sits on `env(safe-area-inset-bottom)` and is always visible. Target: the action bar is fully visible at all 3 sizes and with the keyboard open. |
| F4 Editor | P4, P5 | It auto-grows from 4 lines up to 45 vh. The task card collapses to one line after the first Run (and can be tapped open again). |
| F5 Keyboard | P13 | A `visualViewport` listener sets `--kb` (the keyboard height), lifts the action bar above the keyboard and keeps the caret line in view. In tests the keyboard is simulated by shrinking the visual viewport to 420 px. |
| F6 Bottom sheets | P4–P6 | Hint, Example and Solution open as bottom sheets: focus is trapped, Esc closes them, and they have `role="dialog"`. |
| F7 Chip rows | P8 | Horizontal scroll with edge fades and `scroll-snap`, and the chips are at least 40 px tall. |
| F8 Level maps | P7 | A single-column road per world. Each node shows real stars (★★☆ plus text, so colour is not the only signal). Only the first locked level shows a lock message ("Solve 2 of 3 in 1.2 to open"); the rest show a 🔒 with `aria-label`. |
| F9 Mission steps | P9 | Horizontal swipe between steps (pointer events, with buttons as a fallback), progress dots with labels, and a primary button in the thumb zone. |
| F10 You page | P10 | Badges and the calendar fold into `details`, with the stats summary first. |
| F11 Back and title | P11 | The top app bar on every deep screen, with targets of at least 44 px. |
| F12 DotSheets on phone | P6 | The grid height is capped at 40 vh. The formula bar and chips stay above the grid, and Check moves to the action bar. |

Test matrix:
- Sizes: 360×740, 390×844, 412×915 and a desktop 1280×800, each in light and dark.
- The keyboard is simulated on play screens.
- e2e asserts the targets in F1, F2, F3 and F8.
- The Android WebView wrapper is checked statically: `adjustResize` stays, the insets are confirmed, and there is no release build unless you ask.

---

## C. New icon

Three original concepts are in `icon-comparison.png`:

| Concept | Idea | At 16 px | Masks | Monochrome | Notes |
|---|---|---|---|---|---|
| A · Winding road | The app's road map folded into a snake, with Dot at the finish | Reads as an "S" | Good in all 3 | Clear, with a ring milestone | Most "journey", but it reads as a letter |
| **B · Dot on the chart** | Three rising bars, with Dot (face) sitting on the tallest | Bars plus a yellow dot, very legible | Good in all 3 | Clear: bars plus a face with eye cut-outs | Continuity with today's bars, and gives the mascot an identity |
| C · Insight lens | A magnifier over a rising line ending in a bright dot | Very legible | Good | Clear | Generic: many analytics apps use a magnifier |

**Recommendation: B.**
- It is the most legible at 16 px on light and on dark.
- The swap keeps users' recognition, because the bars stay.
- It adds the mascot, which is unique to this app.
- It survives every mask and the monochrome themed-icon layer.

Delivery after your OK:
- `icons/icon.svg`.
- `icon-192.png` and `icon-512.png`.
- `icon-maskable-512.png`, with the artwork at 80 % inside the safe zone.
- `favicon.png` plus a new `favicon.svg`.
- An opaque `apple-touch-icon.png` (180 px, no transparency).
- `tools/make-icons.js` rewritten so that it builds every output from one concept file.
- Android:
  - Adaptive `ic_launcher_foreground` and `ic_launcher_background`.
  - A **new** `<monochrome>` layer (`ic_launcher_monochrome`) in both `mipmap-anydpi-v26` XML files.
  - Legacy square and round mipmaps for mdpi–xxxhdpi.
  - The notification icon `ic_stat_analyst.xml` as a white silhouette of B.
- The in-app logo in the top bar and sidebar.
- `theme_color`/`background_color` in `manifest.webmanifest`, `<meta name="theme-color">` for light and dark, and Android `colors.xml` (plus `values-night`).

---

## D. Labs: 8 worlds each

The new worlds are appended after W4; challenge ids are only ever appended. Each new world has 4 levels × 3 challenges, which makes **192 new challenges** in total:
- DotSheets: 48 more, 96 in all.
- DotPython: 48 more, 96 in all.
- DotBI: 48 more, 96 in all.
- SQLab: 48 more, 112 in all.

Each world has a theme (colour, emoji and pattern) and two intro cards on the first visit.

### Level types

- Classic levels keep the current rules.
- The new types below reuse the same `L.record`.
- Stars are calculated as 1 for solving + 1 for no hint + 1 for finishing **within par**.
- Par is the target number of Check attempts (default 1, which matches today's "first try"), so existing stars mean the same thing. There are no timers.

| Type | Mechanic | Pass check | "Fails with no work" test |
|---|---|---|---|
| Bug hunt | Starts with broken code (an AI-written or colleague's draft) | The result equals the reference | The starter code fails |
| Predict output | Read the code and pick 1 of 4 outputs; no typing | The chosen option equals the output evaluated at runtime | No selection fails; the reference option passes |
| Put in order | Tap the shuffled lines into order | The assembled code is run, so any valid order passes | The seeded shuffle fails |
| Rosetta | Given working SQL, write the pandas, formula or DAX version (or the reverse) | The result equals the reference | An empty answer fails |
| Case file | A short scenario, 2–3 linked sub-tasks, then a "finding" multiple-choice question | Every part passes | Empty fails |
| Stakeholder request | A vague ask from a character: first pick the right clarification or metric, then build it | The choice plus the result | Empty fails |
| Interview set | 3 classic interview patterns (duplicates, second highest, gaps), with par only | The result equals the reference | Empty fails |
| Cleaning gauntlet | 4–5 chained cleaning steps on one messy table, where each step feeds the next | The final table equals the reference | The raw table fails |
| Boss level | The last level of W8 (and some W6/W7 levels used by chapter bosses): a multi-part case mixing types | Every part passes | Empty fails |

### New worlds

| Lab | W5 | W6 | W7 | W8 |
|---|---|---|---|---|
| **DotSheets** | 📅 Dates and periods: YEAR, MONTH, WEEKDAY, EOMONTH, EDATE, TEXT, NETWORKDAYS; 5.3 bug hunt; 5.4 predict output | 🧽 Cleaning gauntlet (messy orders): TRIM, PROPER, SUBSTITUTE, VALUE, IFERROR; 6.3 put in order; 6.4 gauntlet | 📱 App funnel (events sample): COUNTIFS funnels and conversion rates; 7.3 stakeholder request; 7.4 Rosetta SQL → formula | ☕ Dot Club subscriptions: MRR with SUMIFS, churn, cohorts with FILTER/UNIQUE; 8.3 case file; 8.4 **boss: month-end close** |
| **DotPython** | 🧩 Reshape and combine: `pivot_table`, `concat`, `merge(how=)`; 5.3 Rosetta SQL → pandas; 5.4 bug hunt | ⏱ Time series: `.dt`, `shift`, `pct_change`, `rolling`, `cumsum`; 6.4 predict output | 🧪 Email A/B test: conversion by variant, lift, a two-proportion z-score by hand; 7.3 stakeholder request; 7.4 **boss: was it a win?** | 🎧 Support desk: 8.1 cleaning gauntlet (tickets), resolution times, SLA; 8.3 case file; 8.4 **boss: desk review** |
| **DotBI** | 📆 Time intelligence: DATESYTD/TOTALYTD, SAMEPERIODLASTYEAR, DATEADD, YoY % with VAR; 5.4 bug hunt | 🏅 Ranking and top N: RANKX, TOPN, share of total; 6.3 predict output; 6.4 stakeholder request | 🧮 Tableau table calcs and LOD: RUNNING_SUM, WINDOW_AVG, RANK, INCLUDE/EXCLUDE; 7.3 Rosetta DAX ↔ Tableau; 7.4 case file | ☕ Subscriptions model (second model): active members, churn %, plan mix; 8.3 put in order; 8.4 **boss: board dashboard** |
| **SQLab** | 🧹 Clean data in SQL (retail + growth db): COALESCE, NULLIF, CAST, TRIM/LOWER/REPLACE, UNION, self-join; 5.4 **bug hunt: "AI wrote this query"** | 📱 App funnel (`app` db): events per step, funnel with CTEs; 6.3 predict output; 6.4 stakeholder request | ☕ Subscriptions and retention (`app` db): active members, MRR, cohorts; 7.3 **interview set**; 7.4 case file | 🧪 Experiments and support (`growth` db): A/B results, ticket SLA; 8.3 cleaning gauntlet; 8.4 **boss: the Monday numbers** |

### Engine work needed

- **DotBI:**
  - DAX: `RANKX`, `TOPN`, `DATESYTD`/`TOTALYTD`, `SAMEPERIODLASTYEAR`, `DATEADD`, with a date table in the model.
  - Tableau: `INCLUDE`/`EXCLUDE` (the parser already recognises the words and reports them as unavailable) and the table calcs `RUNNING_SUM`, `WINDOW_AVG`, `RANK`.
- **DotSheets:** nothing new is needed. EOMONTH, WEEKDAY, TEXT, COUNTIFS, SUMIFS, TRIM, PROPER, SUBSTITUTE, VALUE, IFERROR, FILTER, UNIQUE, SORT, XLOOKUP, LET, EDATE and NETWORKDAYS already exist. REGEX*, QUERY and ARRAYFORMULA do not, so l1-6 maps to Rosetta and dates instead of those functions.
- **DotPython:** `pivot_table`, `concat`, `merge`, `.dt`, `shift`, `rolling`, `pct_change` and `cumsum` already exist. Gaps found while writing challenges get the same guarded-method treatment.
- **SQLab:** nothing; SQLite already supports all of it.

### Seeded datasets

Each dataset is deterministic, made from the existing PRNG pattern, and original:

| Dataset | Tables (rows) | Used by |
|---|---|---|
| `app`: Dot & Co. ordering app | `users` (≈1,500), `sessions` (≈6,000), `events` (≈18,000: view_menu, add_to_cart, checkout, purchase) | SQLab W6/W7, Sh W7 (300-row sample), Py `events.csv` |
| Dot Club (in `app`) | `members` (≈1,200), `plans` (3), `invoices` (≈9,000 monthly) | SQLab W7, Sh W8, BI W8 model, Py |
| `growth`: email A/B test | `campaigns`, `assignments` (≈4,000), `conversions` | SQLab W8, Py W7 (`ab_test.csv`) |
| `growth`: support desk | `tickets` (≈1,200, with deliberately messy channel and category text), `agents` (12) | SQLab W8, Py W8 (`tickets.csv`), cleaning gauntlets |

The Python and BI copies stay at 5,000 rows or fewer, so the interpreter stays fast on phones.

### Game feel, within the ethics rules

- **Animated world map:**
  - Dot walks from the last passed level to the next one (a CSS transform; disabled under `prefers-reduced-motion`).
  - A star burst plays on the existing `#fx` canvas when stars improve.
  - Completing a world gives a one-time "world stamp" collectible.
- **Collectibles:**
  - 32 world stamps and 9 chapter trophies, shown on the You page.
  - They are cosmetic and one-time only: they are derived from stars and the `module:` keys, so nothing new is stored and there is nothing to farm.
- **What we do not add:** timers, countdowns, guilt copy and hard locks on learning. Par is only a suggestion, and the hint, the example and the solution stay one tap away, as they are today.

---

## E. Course research and gap table

Checked on **2026-11-13**.

The session's network policy blocks direct page reads of the course sites (the DNS lookup is refused). The facts below were confirmed from the official pages as indexed by web search, with each official URL recorded. Items marked "(third-party)" could not be confirmed on an official page and should be treated as approximate.

| Programme | URL(s) | What it covers (topics only) |
|---|---|---|
| Google Data Analytics Professional Certificate (Coursera) | https://grow.google/certificates/data-analytics/ · https://www.coursera.org/professional-certificates/google-data-analytics · https://www.coursera.org/learn/google-data-analytics-capstone | 8 courses: Foundations; Ask questions; Prepare; Process (cleaning); Analyze; Share (visualisation, Tableau); R (one listing shows a Python variant); a capstone case study. Spreadsheets and SQL throughout. AI used for visualisation ideas, cleaning and structuring data. |
| IBM Data Analyst Professional Certificate | https://www.coursera.org/professional-certificates/ibm-data-analyst · https://www.coursera.org/learn/excel-basics-data-analysis-ibm · https://www.coursera.org/learn/ibm-data-analyst-capstone-project | An 11-course series: Excel (cleaning, lookups, pivots); visualisation and dashboards (Excel, Cognos); Python and pandas, Plotly; SQL, including SQL from Python; a capstone (collection, wrangling, EDA, statistics, dashboards); an optional GenAI course. |
| IBM Generative AI for Data Analysts (Specialization) | https://www.coursera.org/specializations/generative-ai-for-data-analysts · https://www.coursera.org/learn/generative-ai-enhance-your-data-analytics-career | 3 courses: GenAI essentials; prompt engineering; GenAI across data preparation, analysis, visualisation and storytelling, with ethics. |
| Microsoft PL-300 Power BI Data Analyst | https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300 | **Skills measured as of April 20, 2026** (confirmed). Weights: Prepare the data 25–30 %; Model the data 25–30 %; Visualize and analyze the data 25–30 %; Manage and secure Power BI 15–20 %. Per the change log, the April changes are minor (get or connect to data; enhance reports for usability and storytelling; create and manage workspaces and assets). Objectives include: choosing among Direct Lake, DirectQuery and Import; calculation groups with measures, CALCULATE and time intelligence; DAX visual calculations in reports; Copilot (a narrative visual, suggesting report pages, summarising the semantic model); row-level security and workspaces. |
| Salesforce Certified Tableau Data Analyst (Analytics-DA-201) | https://www.tableau.com/learn/certification/tableau-certified-data-analyst-exam-guide · https://trailhead.salesforce.com/content/learn/modules/cert-prep-tableau-data-analyst | Domains: Connect and transform data; Explore and analyze; Create content; Publish and manage. Weights 24 / 41 / 26 / 9 % (third-party, to confirm). Objectives: FIXED, INCLUDE and EXCLUDE (also nested) LODs; table calcs (running total, percent of total, moving average, rank, percentile, difference); parameters in calcs, filters and reference lines; sets, groups, bins and hierarchies; publishing. |
| DataCamp Data Analyst Associate | https://support.datacamp.com/hc/en-us/articles/7926305856919-Data-Analyst-Associate · https://www.datacamp.com/certification/data-analyst | The timed DA101 exam (2 h: data management, exploratory analysis, statistical experimentation in SQL, hypothesis testing concepts), plus a practical exam (business problem, **validate every column**, clean, calculate metrics; auto-graded and all-or-nothing). |
| Kaggle Learn | https://www.kaggle.com/learn · https://www.kaggle.com/learn/intro-to-sql · https://www.kaggle.com/learn/advanced-sql · https://www.kaggle.com/learn/pandas · https://www.kaggle.com/learn/data-cleaning | Intro to SQL (6 lessons, ending with joins); Advanced SQL (joins and unions, analytic functions, nested and repeated data, efficient queries); Pandas (read and write, indexing, summaries, grouping and sorting, types and missing values, combining); Data Cleaning (missing values, scaling, parsing dates, encodings, inconsistent entries); Data Visualization. |
| Mode SQL tutorial | https://mode.com/sql-tutorial/sql-window-functions/ · https://mode.com/sql-tutorial/sql-sub-queries · https://mode.com/resources/sql-tutorial/sql-pivot-table · https://mode.com/resources/sql-tutorial/sql-string-functions-for-cleaning · https://mode.com/resources/sql-tutorial/sql-datetime-format · https://mode.com/resources/sql-tutorial/sql-data-types | Basic, Intermediate (aggregates, CASE, DISTINCT, join types including self-joins, UNION), Advanced (data types and CAST, dates, string cleaning, subqueries, window functions including LAG/LEAD, pivoting with CASE) and Analytics Training. |

### Mechanics we take (idea only, no content)

- **Brilliant**
  - Source: https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/ · https://brilliant.org/help/features/what-is-a-streak
  - A short concept intro, then problems, with feedback that arrives while the learner is still reasoning.
  - Becomes: Learn cards with 1-tap checks.
- **Mimo**
  - Source: https://mimo.org/
  - Mobile-first, bite-size lessons with tap-to-build code.
  - Becomes: the no-typing Try variant on phones.
- **SQLBolt**
  - Source: https://sqlbolt.com/
  - Each lesson is one concept followed by an exercise against a visible table.
  - Becomes: Try shows a table preview next to the task, with a task checklist.
- **Select Star SQL**
  - Source: https://selectstarsql.com/
  - An interactive, narrative book where the learner investigates one dataset.
  - Becomes: the Dot & Co. chapters and case files, with an original story and seeded data. Its topic and data are not reused.

### Gap table

| # | Topic | Seen in | Today in the app | Action (all original text) |
|---|---|---|---|---|
| G1 | Framing questions, stakeholders, metric definitions | Google (Ask), DataCamp practical | Touched in l0-1 and l8 | **New mission l0-4**; stakeholder-request levels (Sh 7.3, SQL 6.4, BI 6.4, Py 7.3); 6 `Q()`; 3 cards |
| G2 | Data ethics, privacy, PII, bias, consent | Google, IBM GenAI (ethics) | One feed card | **New mission l0-5**; scenario set; 6 `Q()`; 4 cards |
| G3 | Validating data before analysis | DataCamp practical, Google (Process), Kaggle Data Cleaning | Cleaning only (l1-1, l3-2) | **New mission l3-8**; cleaning gauntlets (Sh 6.4, Py 8.1, SQL 8.3); 6 `Q()`; 3 cards |
| G4 | SQL cleaning: NULL handling, CAST, string functions, UNION, self-joins, CASE pivots | Mode, Kaggle Advanced SQL | CASE only | **New mission l2-5**; SQLab W5; 8 `Q()`; 3 cards |
| G5 | Product analytics: funnels, cohorts, retention | IBM capstone (EDA), Kaggle (analytic functions), job demand | Retention only in l3-5 (Python) | **New mission l2-6**; SQLab W6/W7, Sh W7; 6 `Q()`; 3 cards |
| G6 | Query efficiency | Kaggle Advanced SQL | none | One section in l2-5, an interview set, 3 `Q()`, 2 cards |
| G7 | Experiment design: power, sample size, peeking, novelty effect | DataCamp DA101 | Basics in l4-3 | **New mission l4-5**; Py W7; A/B dataset; 6 `Q()`; 3 cards |
| G8 | Power BI service: workspaces, apps, sharing, refresh, RLS | PL-300 (Manage and secure, 15–20 %) | none | **New mission l5-8**; BI 8.2–8.3; 6 `Q()`; 3 cards |
| G9 | Storage modes (Import, DirectQuery, Direct Lake), performance, calculation groups, visual calculations, Copilot in Power BI | PL-300, April 20, 2026 | none | **New mission l5-9**; BI W6 (ranking, performance mindset); 8 `Q()`; 4 cards (Copilot cards stress verification) |
| G10 | Tableau data: relationships vs joins vs blends; sets, groups, bins, hierarchies; publishing | Tableau DA-201 | Partly in l5-6 and l5-7 | **New mission l5-10**; BI W7 INCLUDE/EXCLUDE and table calcs; 8 `Q()`; 3 cards |
| G11 | Time intelligence and ranking in DAX | PL-300 (Model) | Named in l5-5, not practised | BI W5, W6 |
| G12 | Dates, parsing, encodings, inconsistent entries | Kaggle Data Cleaning, Mode (dates) | Partly | Sh W5, Py W6, SQL W5; 4 `Q()`; 2 cards |
| G13 | GenAI across the workflow, and where it fails | IBM GenAI, PL-300 Copilot, Google | m6 (3 lessons) | **New mission l6-4**; SQL 5.4 bug hunt; 5 `Q()`; 3 cards |
| G14 | R language | Google | none | **Out of scope** (Python covers the same ground). One card, "R or Python?" |
| G15 | Vendor-specific tools (Cognos, Looker Studio specifics) | IBM | Mentioned | Out of scope |

New content totals:
- 10 missions (lessons), about 36 h, taking the path from 190 h to about 226 h.
- About 100 `Q()` questions, with option lengths balanced as in PR #89.
- About 45 Discover cards, each under 70 words with a source link.
- 15 scenario sets, about 40 items in all.
- 9 boss cases.
- 192 lab challenges.
- 4 datasets.

---

## Build order

Each phase is committed with every test passing and `update-sw.py` run.

| Phase | Scope | Tests added |
|---|---|---|
| **1 · Journey and migration** | `missions.js` (all 51 missions and 9 bosses, with Try referencing existing levels; new-world references wait for Phase 4); the `#/journey`, `#/mission/<id>` and `#/boss/<mid>` views; the step engine (Brief, Learn, Try, Check, Debrief); test out; the Continue button on Home; quests wiring; `journey` and `bosses` state, sanitize and merge; chest → boss; Workshop section in Practice; `#/roadmap` alias | `unit-journey.js`: every mission step resolves; every *existing* level is mapped; the fixture migration; merge idempotent and commutative with an old client; no double XP. e2e: a mission flow at 390×844 |
| **2 · Phone UX** | New tab bar and the You "More" list; top app bar with Back and title; focus mode; sticky action bar; auto-grow editor; `visualViewport`; collapsible task card; bottom sheets; chip fades; single-column level maps with real stars and one lock message; journey map collapse, sticky header, auto-scroll and Jump button; swipe and progress dots; You folds | e2e at 360/390/412 × light/dark: F1 (Continue top < 360), F2 (current in view, page < 4,000 px), F3 (action bar visible with the keyboard simulated), F8 (stars and one lock message); a keyboard-only pass; dark mode on every screen |
| **3 · Icon** | Concept B everywhere: web icons, `make-icons.js`, Android adaptive + **monochrome** + legacy + notification, in-app logo, theme colours | `unit-pwa`: the icon files exist and the apple-touch icon is opaque; a check that the Android XML holds a `<monochrome>` layer |
| **4 · Worlds, level types, datasets** | The 4 datasets; the engine additions (DAX time intelligence and ranking, Tableau INCLUDE/EXCLUDE and table calcs); level-type components; W5–W8 for each lab (192 challenges); world themes, intro cards, Dot walking, stamps | Every new challenge fails with no work or starter code and passes with its reference; each type's own checks; **every lab level is mapped** (now 128/128); determinism of the datasets |
| **5 · Lessons, questions, cards** | 10 new missions (lessons appended), scenario sets, 9 boss cases filled in, about 100 `Q()`, about 45 cards with sources | Content lint: ids are unique and only appended; card length ≤ 70 words; each card has a source; option-length balance; every scenario resolves |
| **6 · Wrap-up** | README counts; `update-sw.py`; the full test run; "after" screenshots at the 3 sizes × light/dark and on desktop; push to `ccr-65118130-ok06d8` | Every suite |

There is no PR and no Android release build unless you ask.

## Decisions to confirm at the checkpoint

1. **Icon B** ("Dot on the chart").
2. The "More" tab goes away: Settings, Prompts and the AI toolbox move into the You page (desktop keeps the sidebar).
3. The chapter bonus (`module:<mid>`, same XP) now comes from winning the boss case instead of finishing the last lesson; bonuses already earned stay.
4. Scope: 192 new lab challenges and 10 new missions. Phase 4 is large, so it may land as two commits (datasets and engines first, then the worlds).
