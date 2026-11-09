# Data Analyst Path

A free, static web app that teaches you to become a data analyst **starting from your own background**, with AI tools as your tutor.

- **Personalised.** Pick your background (science, engineering, finance, marketing, healthcare, sport, teaching, software, operations, humanities, or describe your own). The examples, practice data, portfolio ideas, CV translations and every AI prompt adapt to it.
- **A realistic roadmap.** 9 modules, 29 lessons, about 130 hours: orientation, spreadsheets, SQL, Python/pandas, statistics, visualisation and dashboards, AI-powered analysis, portfolio projects, getting the job. Each lesson has key ideas, a hands-on task, an *AI move* (a ready-made prompt), a quiz and notes.
- **SQL Lab.** Real SQLite running in your browser (sql.js / WebAssembly) with two practice databases and 16 challenges. Answers are checked automatically by comparing your result with a reference query. It can build an AI prompt containing your schema, query and error (never data).
- **Prompt library.** 50 prompts (general ones plus one per lesson) with fill-in blanks, *Copy*, and *Open in ChatGPT / Claude*. Answers can be requested in any of 12 languages.
- **AI rules and toolbox.** Seven habits for learning with AI without fooling yourself (try first, verify, protect data, teach back…).
- **Private.** Progress, notes and quiz answers live in your browser's `localStorage` only. Export / import a JSON backup from the Profile page. There is no server, no tracking and no external request at runtime.

## Run it

It is plain HTML, CSS and JavaScript: no build step, no dependencies to install.

```bash
cd data-analyst-path
python3 -m http.server 8000
# open http://localhost:8000
```

Everything except the SQL Lab also works by double-clicking `index.html`. The SQL Lab needs a web server because browsers block WebAssembly on `file://` pages (the Lab explains this if you open it that way).

To publish it, upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket…).

## Layout

```
index.html              page shell and navigation
css/style.css           styles (light and dark, responsive, no external fonts)
js/ui.js                DOM helper, saved state, personalisation, prompt cards
js/app.js               pages (home, profile, roadmap, lesson, prompts, tools) and router
js/sqllab.js            the SQL Lab
js/data/backgrounds.js  background profiles: strengths, gaps, analogies, projects, CV examples
js/data/curriculum.js   modules and lessons
js/data/prompts.js      general prompt library, tools list, AI rules
js/data/datasets.js     seeded dataset generators, table definitions, SQL challenges, answer checker
vendor/sql.js/          sql.js 1.15.2 (MIT), SQLite compiled to WebAssembly
```

## Extending it

- **Add a background:** add one object to `js/data/backgrounds.js`. Nothing else changes.
- **Add or edit a lesson:** edit `js/data/curriculum.js`. The field list is documented at the top of the file. Roadmap, progress, prompt library and week estimates update automatically.
- **Add a SQL challenge:** add an entry to `DA.challenges` in `js/data/datasets.js`. The reference `solution` defines the expected result; the task text must name the output columns in order, because the checker compares values, not column names.
- **Add a dataset:** add its generator and table definitions to the same file. The DDL, schema browser and AI schema text are all derived from the table definitions.

The practice data is generated in the browser from a fixed random seed, so everyone gets identical data and the answers stay checkable. The same generators produce the downloadable `retail_orders.csv` and `messy_orders.csv` used in the spreadsheet and pandas lessons.

## Notes

- The "Open in ChatGPT / Claude" buttons also copy the prompt, because prefilling a chat from a link depends on the site and on prompt length.
- Third-party products, features and free tiers change quickly; the toolbox page says so and focuses on concepts.
- This is a learning plan, not a job guarantee.

sql.js is © its authors and distributed under the MIT licence (see `vendor/sql.js/LICENSE`).
