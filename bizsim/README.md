# BizSim

Simulated businesses for data analysts to practise on. Create a clothing shop, restaurant, bookshop, café, pharmacy
or supermarket, tune it with sliders, watch the dashboards react and download the relational tables behind it.
One codebase runs as a web app on a computer and, wrapped with Capacitor, as an Android app; an account keeps both in sync.

Everything is synthetic: every person, product, supplier and company is invented.

## What it does

- **Six business templates**, each with its own catalogue, prices, margins, seasonality, opening hours and customer behaviour.
- **Big parameters** set at creation (size, location, price positioning, hours, investment, staff, online channel) and
  **small parameters** adjustable any day (foot traffic, products on sale, price level, promotions, marketing, staff per
  shift, safety stock, supplier cost, quality, individual product prices).
- **Every change is logged with its date** (`parameter_changes`) and applies from the next simulated day, so history is
  never rewritten and before/after analysis is clean. A dashed line shows the model's expectation for the next 30 days
  with the old and the new settings.
- **Two time modes**: 6 months to 3 years of history generated at creation, then play / pause / 1×, 7×, 30× days per
  second, or skip 30 or 90 days.
- **Reproducible**: the same seed and settings give the same data on any device.
- **Realism**: weekly and yearly seasonality, Spanish public holidays, commercial events (sales, Black Friday, Book Day…),
  weather, a ramp-up after opening, price elasticity, promotion lift, stockouts and lost sales, supplier lead times,
  spoilage, returns, repeat customers and churn, staff capacity and walkouts, and a few anomalies a year.
- **Dashboards**: revenue, margin, net profit, average ticket, conversion, new vs returning, retention, churn, CLV, CAC,
  inventory turnover, stockout rate, sales per m², labour cost, break-even, food cost and table turnover; time series
  with moving average, category and product rankings, weekday × hour heatmap, ABC curve, cohort retention, RFM
  segments, price vs quantity, P&L waterfall, forecast vs actual, and a comparison of several businesses.
- **Data**: about 20 related tables with primary and foreign keys (see `src/engine/schema.ts`), a table view with sort,
  filter and search, and exports to **CSV, Excel, SQLite and SQL dump**, always with a data dictionary. An optional
  **dirty-data** switch adds missing values, duplicates, outliers, mixed date formats and messy text, with an answer key.
- **English and Spanish**, dark and light themes.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, exports and sync (Vitest)
npm run build      # type-check and build into dist/
npm run e2e        # two browsers, one account: create on one, see it on the other (needs the build)
```

Android (needs the Android SDK and Java 21):

```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
```

CI does all of this: `.github/workflows/android-bizsim.yml` tests, builds and signs the APK on pull requests, and
publishes a release `bizsim-N` on master. The web version is published with the documentation site at `/bizsim/`
(`.github/workflows/docs.yml`).

## How it is built

| Folder | What is there |
|---|---|
| `src/engine/` | The simulation, pure TypeScript: seeded random numbers, schema, calendar, templates, the day-by-day `Sim`, analytics, the dirty-data pass. |
| `src/worker/` | A Web Worker that hosts one `Sim` per loaded business, so the interface stays smooth. |
| `src/export/` | CSV, XLSX (written directly with `fflate`), SQLite (`sql.js`) and SQL dump. |
| `src/cloud/` | Accounts and sync, and the merge rules. |
| `src/store/` | App state (Zustand), the play loop, persistence. |
| `src/ui/` | Screens, components and chart options (ECharts). |
| `android/` | The Capacitor Android project. |

**Sync.** Only the *recipe* of each business is saved and synced: its parameters, seed, change log and simulation day
(a few KB). Each device rebuilds the tables from it. Merging never loses anything: change logs are unioned, the clock
takes the further one, deletions stay deleted. Accounts use the same Supabase project as the other apps in this
repository (one private row per account in `saves`, see `fitai-app/tools/supabase.sql`), with usernames prefixed
`bizsim.` so they never mix. The app works without an account.

**Sizes.** History length is capped so the sale lines stay under about 1.6 million rows on a computer and 0.7 million
on a phone. Excel sheets split automatically past Excel's row limit.

## Checking it by hand

1. **Portfolio**: *New business* → pick a type → adjust the big parameters → choose history and seed → *Create*. A
   progress bar, then the dashboard.
2. **Overview**: move *Price level* in the controls: a second dashed line appears. Press **+30**: the data follows,
   a vertical marker shows the change, and `parameter_changes` (Data tab) has the row.
3. **Sales / Customers / Inventory / Staff & costs / Forecast**: each tab draws; the period, category and channel
   filters change the numbers.
4. **Data**: pick `transactions`, sort by `total`, filter `total` with `>100`, search a product in `products`. Turn
   *Dirty data* on and look for `∅` cells and duplicated ids.
5. **Export**: download Excel, CSV (ZIP), SQLite and SQL; open them. `data_dictionary` describes every column.
6. **Compare**: with two or more businesses, the weekly revenue lines and the KPI table.
7. **Settings**: switch language and theme. Create an account, then sign in on another device (or the Android app):
   the businesses appear there; a change on one arrives on the other after *Sync now* or within a couple of minutes.
