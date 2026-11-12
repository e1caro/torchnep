/* The curriculum: 9 modules, 29 lessons.
 *
 * Lesson fields:
 *   id, title, hours            required
 *   why                         one-sentence reason to care
 *   learn[]                     key ideas (may contain <b>, <code>)
 *   concept                     optional key of DA.backgrounds[].analogies: shows an "in your world" box
 *   code {lang,title,text}      optional example
 *   doit                        the hands-on exercise
 *   ai {title,text}             the "AI move": a prompt template ({{bg}}, {{lang}} are filled in; [[...]] are blanks to fill)
 *   quiz {q,options,answer,why} one multiple-choice check
 *   links[]                     {label,url}
 *   lab                         'retail' | 'lab': shows an "open the SQL Lab" button
 *   download                    'retail' | 'messy': shows a CSV download button
 *   showProjects / showResume   show the project ideas / CV translations for the chosen background
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  DA.modules = [
    /* ------------------------------------------------------------------ 0 */
    {
      id: 'm0', icon: '🧭', cat: 'Learning', title: 'Orientation',
      goal: 'Understand the job, set up your AI tutor and choose a concrete target.',
      lessons: [
        {
          id: 'l0-1', title: 'What a data analyst really does', hours: 1,
          why: 'Knowing the job tells you which skills to build first and which to ignore.',
          learn: [
            'The loop: <b>ask</b> a business question → <b>get</b> the data → <b>clean</b> it → <b>analyse</b> → <b>communicate</b> → help someone <b>decide</b>.',
            'Cleaning and understanding data usually takes more time than modelling. Expect to spend a big share of your time there.',
            'Roles overlap: <b>data analyst</b> (answers questions with SQL, spreadsheets, BI), <b>BI analyst</b> (dashboards), <b>data scientist</b> (models, more maths and code), <b>analytics engineer</b> (builds clean data tables). Analyst is the most direct door in.',
            'Your product is a <b>decision</b>, not a chart.',
          ],
          doit: 'Write down three decisions from your past work that better data would have improved. For each: what was the question, what data would you have needed, and what would you have done differently? These become your portfolio ideas.',
          ai: {
            title: 'Map my background to analyst tasks',
            text: "I'm learning to become a data analyst. My background: {{bg}}.\n\nList 8 tasks I probably already did in that background that are really data-analysis tasks in disguise (tracking, comparing, reporting, forecasting...). For each one, name the analyst skill it maps to (SQL, spreadsheets, statistics, visualisation, communication) and how I could describe it on a CV.\n{{lang}}",
          },
          quiz: {
            q: 'What is the main product of a data analyst\'s work?',
            options: ['A dashboard that the whole team can open every day', 'A decision or recommendation backed by evidence', 'A machine-learning model that predicts the next month', 'A clean, well-documented dataset ready for others'],
            answer: 1,
            why: 'Dashboards, models and clean data are means. They matter only if they change a decision.',
          },
          links: [{ label: 'Kaggle Learn: free micro-courses', url: 'https://www.kaggle.com/learn' }],
        },
        {
          id: 'l0-2', title: 'Learn with AI, not around it', hours: 1.5,
          why: 'AI can compress months of confusion into days, or let you fake understanding until the interview. The difference is how you use it.',
          learn: [
            '<b>Try first.</b> Spend 10 minutes on a problem, then paste your attempt and the error, not just the task.',
            '<b>Ask for hints and explanations</b>, not only answers: "Don\'t give me the solution yet, give me a hint."',
            '<b>Teach back.</b> After each lesson, explain it in your own words and ask the AI to find the gaps.',
            '<b>Verify.</b> AI is sometimes confidently wrong. Check numbers on a small sample by hand and run the code yourself.',
            '<b>Protect data.</b> Never paste personal, customer or confidential data. Paste the schema or 5 anonymised rows instead.',
            '<b>Keep an error log.</b> Each time you get stuck, write down the cause. It is your fastest revision tool before interviews.',
          ],
          doit: 'Pick one AI assistant (Claude, ChatGPT or Gemini: any works). Paste the tutor prompt below as the first message of a new chat, then answer its first question. Save it as a pinned chat or project so you can reuse it all through the course.',
          ai: {
            title: 'Set up my data-analytics tutor',
            text: "You are my patient data-analytics tutor. I'm becoming a data analyst. My background: {{bg}}.\n\nHow to teach me:\n1. Explain new ideas with analogies from my background.\n2. Before giving an answer, ask me to try first; give hints in small steps.\n3. After each explanation, ask one short question to check I understood.\n4. When I paste code or SQL, explain what it does line by line and point out mistakes without rewriting everything for me.\n5. Tell me when something you say is an assumption or might be wrong, and how I can verify it.\n6. Keep answers short unless I ask for depth.\n{{lang}}\nStart by asking what I already know about spreadsheets, SQL, Python and statistics (one question at a time).",
          },
          quiz: {
            q: 'You are stuck on a SQL error. What is the best use of AI?',
            options: ['Paste the task and copy the finished answer, to save time', 'Share the query and the error, and ask for a hint and the cause', 'Ask it to rewrite the whole project in a tool it knows better', 'Ask it to explain SQL from scratch before you look at the error'],
            answer: 1,
            why: 'You learn from your own attempt plus targeted feedback. Copying answers builds nothing you can show in an interview.',
          },
          links: [
            { label: 'Claude', url: 'https://claude.ai' },
            { label: 'ChatGPT', url: 'https://chatgpt.com' },
            { label: 'Gemini', url: 'https://gemini.google.com' },
          ],
        },
        {
          id: 'l0-3', title: 'Set your target and baseline', hours: 1.5,
          why: 'A concrete target ("junior analyst in healthcare") makes every later choice easier.',
          learn: [
            'Read 10 job ads for roles you would like and tally the skills. If 8 of 10 mention SQL, SQL is not optional.',
            'Typical junior requirements: Excel, SQL, one BI tool (Power BI or Tableau), basic Python or R, statistics basics and communication.',
            'Your <b>domain knowledge</b> is a differentiator. "Analyst who understands logistics" is more hireable than a generic analyst. Look for roles in your own industry first.',
            'Self-assess honestly (0 to 3) on each skill now and re-score in 8 weeks. Progress is motivating.',
          ],
          doit: 'Collect 10 job ads (copy the text into a document). Use the prompt below to extract and count the skills. Then write your top-5 skills to learn and a one-sentence target: "In 6 months I want to be a ___ in ___."',
          ai: {
            title: 'Extract skills from job ads',
            text: "Below are job ads for data-analyst roles I'm interested in.\n\n[[PASTE 5-10 JOB ADS]]\n\nExtract the required skills and tools, count how many ads mention each one, and group them into must-have, nice-to-have and rare. Then, given my background ({{bg}}), tell me which 3 skills I probably already have and the 3 biggest gaps. Output a table.\n{{lang}}",
          },
          quiz: {
            q: 'Why look for analyst jobs in your own industry first?',
            options: ['Industry roles usually pay more than general analyst roles', 'Your domain knowledge helps you ask better questions and stand out', 'Industry roles rarely ask for SQL, so you can skip that part', 'Recruiters in other industries do not consider candidates from outside'],
            answer: 1,
            why: 'Knowing why the numbers matter in a field is hard to teach and easy to value.',
          },
          links: [],
        },
      ],
    },

    /* ------------------------------------------------------------------ 1 */
    {
      id: 'm1', icon: '📊', cat: 'Spreadsheets', title: 'Excel, Google Sheets and tidy data',
      goal: 'Master Excel and Google Sheets: clean messy files, write XLOOKUP, dynamic arrays, QUERY(), Power Query ETL and build scenario models.',
      lessons: [
        {
          id: 'l1-1', title: 'Tidy data and cleaning', hours: 4, download: 'messy',
          why: 'Most analysis problems are data problems. A clean table makes everything downstream easy.',
          learn: [
            '<b>Tidy data</b>: one row per observation, one column per variable, one value per cell. No merged cells, no totals mixed with data, no colour as information.',
            'Keep the <b>raw data untouched</b> in its own sheet or file. Clean in new columns or a copy, so you can always trace back.',
            'Typical problems: inconsistent text (<code>Madrid</code>, <code>madrid </code>, <code>Madird</code>), mixed date formats, numbers stored as text, duplicates, empty rows, impossible values.',
            'Tools: <code>TRIM</code>, <code>PROPER</code>, <code>VALUE</code>, Remove Duplicates, Text to Columns, Find &amp; Replace, Data Validation, and Power Query for repeatable cleaning.',
            'Write every cleaning decision in a "changes" log: what you did, how many rows it touched and why.',
          ],
          code: {
            lang: 'excel', title: 'Handy cleaning formulas (use ; instead of , if your Excel is set that way)',
            text: '=TRIM(C2)                       -- remove stray spaces\n=PROPER(TRIM(C2))               -- "MADRID " becomes "Madrid"\n=VALUE(SUBSTITUTE(F2,"$",""))   -- "$3.50" becomes 3.5\n=IF(ISNUMBER(E2),E2,"")         -- keep only real numbers\n=COUNTIF(A:A,A2)>1              -- TRUE when the value is duplicated',
          },
          doit: 'Download the messy orders file, open it in Excel or Google Sheets and clean it: fix dates, names, products, quantities, prices and cities, then remove duplicates and empty rows. Write your own list of problems first. Then ask the AI to list the problems it sees in 15 sample rows and compare.',
          ai: {
            title: 'Spot data-quality problems',
            text: "I'm cleaning a messy spreadsheet. Here are 15 rows (anonymised):\n\n[[PASTE 15 ROWS]]\n\n1) List every data-quality problem you see, by column.\n2) For each one, give the Excel / Google Sheets formula or feature that fixes it.\n3) Tell me what to check afterwards to be sure the cleaning did not damage the data (row counts, totals).\nMy background: {{bg}}. Use one example from my world.\n{{lang}}",
          },
          quiz: {
            q: 'Where should you do your cleaning?',
            options: ['Directly over the raw data, so there is only one copy', 'In a copy or in new columns, keeping the raw data untouched', 'Only inside the BI tool, after all the data has been loaded into it', 'Nowhere: modern tools clean the data when you import it'],
            answer: 1,
            why: 'Untouched raw data lets you undo any decision and prove what you changed.',
          },
          links: [{ label: 'Exceljet: formula examples', url: 'https://exceljet.net' }],
        },
        {
          id: 'l1-2', title: 'Formulas, lookups and pivot tables', hours: 5, download: 'retail', concept: 'aggregate',
          why: 'These three tools answer a large share of everyday business questions and teach the thinking behind SQL.',
          learn: [
            '<b>Conditional aggregation</b>: <code>SUMIFS</code>, <code>COUNTIFS</code> and <code>AVERAGEIFS</code> answer "how much / how many where…" questions.',
            '<b>Lookups</b>: <code>XLOOKUP</code> (or <code>VLOOKUP</code> / <code>INDEX-MATCH</code>) attach information from another table. This is the idea behind a SQL JOIN.',
            '<b>Pivot tables</b> summarise thousands of rows in seconds: rows, columns, values, filters. Learn to group dates by month and show % of total.',
            'Convert your range to a <b>Table</b> (Ctrl+T) so formulas and pivots grow with the data.',
          ],
          code: {
            lang: 'excel', title: 'Three formulas to know',
            text: '=SUMIFS(Sales[revenue], Sales[city], "Madrid", Sales[category], "Coffee")\n=XLOOKUP(A2, Products[product_id], Products[price], "not found")\n=SUMPRODUCT(Sales[qty], Sales[unit_price])',
          },
          doit: 'Download the café sales CSV (about 6,500 rows, one per item sold). Add a revenue column (qty × unit_price). Build one pivot table: revenue by month (rows) and category (columns). Then answer with SUMIFS: what was the revenue of Coffee in London?',
          ai: {
            title: 'Pivot table or formula, step by step',
            text: "I'm using [[Excel / Google Sheets]]. My table has these columns: order_id, order_date, store_city, channel, customer_id, product, category, qty, unit_price.\n\nI want to answer: [[YOUR QUESTION, e.g. revenue by month and category]].\nGive me step-by-step instructions (pivot table or formulas), then explain each formula so I can reproduce it without you. Finish with one check I can do to confirm the result is right.\n{{lang}}",
          },
          quiz: {
            q: 'Which SQL idea is XLOOKUP most similar to?',
            options: ['GROUP BY', 'JOIN', 'ORDER BY', 'LIMIT'],
            answer: 1,
            why: 'Both fetch columns from another table using a matching key.',
          },
          links: [{ label: 'Exceljet', url: 'https://exceljet.net' }],
        },
        {
          id: 'l1-3', title: 'Your first mini-analysis', hours: 4,
          why: 'Analysis is a question, a method, a result and a recommendation. Practise the whole loop on a small scale.',
          learn: [
            'Start from a <b>question</b>, not from the data: "Which channel is growing fastest?" beats "let\'s explore".',
            'Structure: question → method (pivot) → result → <b>one-sentence insight</b> → recommended action.',
            'Sanity-check: do the totals match the source? Do row counts match? Does the result pass the smell test?',
            'Write the insight as a headline with numbers and a so-what.',
          ],
          doit: 'Using the café sales file (or your own data), answer: "Which category and which city should the owner focus on, and why?" Deliver one chart, a 3-sentence summary and one recommended action.',
          ai: {
            title: 'Challenge my conclusion',
            text: "Here is a summary of my analysis (numbers from my pivot table):\n\n[[PASTE YOUR NUMBERS AND CONCLUSION]]\n\nAct as a sceptical manager. 1) Ask me 3 questions I would face in the meeting. 2) Point out anything that looks wrong or missing (sample size, seasonality, double counting). 3) Rewrite my conclusion in 3 sentences so a busy person gets the point in 20 seconds.\nMy background: {{bg}}.\n{{lang}}",
          },
          quiz: {
            q: 'Which is the best insight headline?',
            options: ['Here is a pivot table of sales by category, month and store', 'Sales were different across the months of the year in all stores', 'Coffee earns nearly 3× bakery revenue: test a coffee + croissant bundle', 'Total revenue was 41,250 this year, split across four product categories'],
            answer: 2,
            why: 'It has a number, a comparison and a recommended action.',
          },
          links: [],
        },
        {
          id: 'l1-4', title: 'Excel Mastery: Dynamic Arrays, XLOOKUP, INDEX/MATCH and LET', hours: 4.5, download: 'retail',
          why: 'Modern Excel formulas spill entire tables from a single cell, replacing fragile copy-pasted formulas.',
          learn: [
            '<b>Dynamic array functions</b> spill results automatically: <code>UNIQUE</code> lists distinct values, <code>SORT</code> orders a range, and <code>FILTER</code> returns all matching rows.',
            '<code>XLOOKUP(lookup, key_range, return_range, "missing", match_mode, search_mode)</code> looks left or right, handles missing keys cleanly, and can search bottom-to-top (<code>search_mode = -1</code>) to find the latest order.',
            '<code>INDEX(return_range, MATCH(key, lookup_range, 0))</code> is the classic compatible equivalent that works in every spreadsheet version.',
            '<code>LET(name1, value1, calculation)</code> names intermediate steps inside a formula so it runs faster and reads like code.',
            'Reference a spilled range with the hash operator (e.g. <code>G2#</code>) so downstream charts and summaries resize automatically.',
          ],
          code: {
            lang: 'excel', title: 'Modern Excel dynamic array patterns',
            text: '=SORT(UNIQUE(Sales[store_city]))\n=FILTER(Sales, (Sales[store_city]="Madrid") * (Sales[qty]>=3), "No rows")\n=XLOOKUP(A2, Orders[customer_id], Orders[order_date], "None", 0, -1)  -- last order date\n=LET(rev, Sales[qty]*Sales[unit_price], AVG_REV, AVERAGE(rev), FILTER(Sales, rev > AVG_REV*2))',
          },
          doit: 'Open the café sales CSV in Excel. 1) In cell K2, use <code>=SORT(UNIQUE(Sales[product]))</code> to generate a live product list. 2) Next to it, use <code>=SUMIFS(Sales[revenue], Sales[product], K2#)</code> so one single formula spills totals for every product. 3) Build an interactive filter block using <code>=FILTER(...)</code> that shows all orders above €15 in a chosen city.',
          ai: {
            title: 'Upgrade my nested Excel formula with LET and Dynamic Arrays',
            text: "Here is a spreadsheet task or an old formula I wrote:\n[[PASTE FORMULA OR TASK]]\n\nShow me how to write it cleanly in modern Excel using XLOOKUP, FILTER, UNIQUE, SORT or LET, plus a classic INDEX/MATCH fallback. Explain how the spill range (#) works and how to verify there are no #SPILL! or #N/A bugs.\n{{lang}}",
          },
          quiz: {
            q: 'In FILTER(Sales, (Sales[city]="Madrid") * (Sales[qty]>2)), why multiply the two conditions?',
            options: ['Multiplication acts as AND logic on arrays of TRUE (1) and FALSE (0)', 'Excel requires multiplication whenever text and numbers are mixed', 'It multiplies the quantity column by the number of stores in Madrid', 'Addition (+) and multiplication (*) do the exact same thing in FILTER'],
            answer: 0,
            why: 'In array formulas, TRUE*TRUE = 1 (AND), whereas (cond1)+(cond2) > 0 acts as OR.',
          },
          links: [{ label: 'Exceljet: Dynamic Array Formulas', url: 'https://exceljet.net/dynamic-array-formulas-in-excel' }],
        },
        {
          id: 'l1-5', title: 'Excel Power Query: Repeatable ETL Without Code', hours: 4.5, download: 'messy',
          why: 'Power Query records every cleaning step as a recipe: next month you click Refresh instead of cleaning the file again.',
          learn: [
            '<b>Power Query</b> (Data → Get &amp; Transform Data) connects to CSVs, folders, databases and web pages, cleans the data in a staging pipeline, and loads a clean table or Pivot cache.',
            '<b>Unpivot Other Columns</b> turns wide report tables (<code>Jan, Feb, Mar…</code> columns) into tidy rows (<code>Month | Revenue</code>) in two clicks.',
            '<b>Merge Queries</b> is a visual SQL JOIN (Left Outer, Inner, Anti-join to find unmatched rows); <b>Append Queries</b> stacks monthly files like <code>UNION ALL</code>.',
            'Every click is recorded in the <b>Applied Steps</b> pane (backed by the M language). You can rename, reorder or delete any step without touching the source file.',
            'Set column types explicitly in the first steps and check the <b>Column Quality</b> bar (Valid / Error / Empty %) before loading.',
          ],
          code: {
            lang: 'powerquery', title: 'Typical Power Query M steps (generated by the UI)',
            text: 'let\n  Source = Csv.Document(File.Contents("messy_orders.csv"), [Delimiter=",", Encoding=65001]),\n  Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),\n  Trimmed = Table.TransformColumns(Promoted, {{"City", Text.Trim}, {"City", Text.Proper}}),\n  Unpivoted = Table.UnpivotOtherColumns(Trimmed, {"Store", "Category"}, "Month", "Revenue")\nin\n  Unpivoted',
          },
          doit: 'Import <code>messy_orders.csv</code> into Excel via Data → From Text/CSV → Transform Data. Clean whitespace, fix case, split or parse dates, filter out blank rows, and Close &amp; Load to a PivotTable. Then edit one row in the CSV file on disk, click Data → Refresh All in Excel, and watch the PivotTable update in 1 second.',
          ai: {
            title: 'Design a Power Query cleaning pipeline',
            text: "I receive a messy spreadsheet every week with this layout:\n[[DESCRIBE LAYOUT, e.g. merged headers, months across columns, totals at the bottom]]\n\nGive me the exact click-by-click Power Query steps to turn it into a clean, tidy table that updates on Refresh, including how to handle errors and new columns.\n{{lang}}",
          },
          quiz: {
            q: 'A report has Store in column A and 12 month columns (Jan to Dec). Which Power Query feature makes it tidy?',
            options: ['Transpose the whole table so stores become column headers', 'Select Store and click Unpivot Other Columns', 'Group By Store and sum each of the 12 month columns', 'Split Column by Delimiter on the twelve month headers'],
            answer: 1,
            why: 'Unpivot Other Columns keeps Store fixed and turns every month column into (Month, Value) rows.',
          },
          links: [{ label: 'Microsoft Learn: Power Query documentation', url: 'https://learn.microsoft.com/en-us/power-query/' }],
        },
        {
          id: 'l1-6', title: 'Google Sheets Mastery: QUERY(), ARRAYFORMULA and Regex', hours: 4.5, download: 'retail',
          why: 'Google Sheets has a built-in SQL engine (QUERY) and cloud connectors that make collaborative analytics effortless.',
          learn: [
            '<code>=QUERY(data, "SELECT C, SUM(H) WHERE G = \'Coffee\' GROUP BY C ORDER BY SUM(H) DESC LABEL SUM(H) \'Total\'", 1)</code> runs SQL-style aggregation directly inside a sheet.',
            '<code>ARRAYFORMULA(E2:E1000 * F2:F1000)</code> computes an entire column from a single top-cell formula so nadie can accidentally overwrite row 412.',
            'Text extraction at scale: <code>REGEXEXTRACT(A2, "ORD-(\\d+)")</code>, <code>REGEXMATCH</code> and <code>REGEXREPLACE</code> clean messy logs and URLs in one step.',
            '<code>IMPORTRANGE(spreadsheet_url, "Sales!A1:I5000")</code> links live tables across separate Google Sheets; combine it with <code>QUERY({Sheet1!A2:F; Sheet2!A2:F}, ...)</code> to stack tabs.',
          ],
          code: {
            lang: 'excel', title: 'Google Sheets superpower formulas',
            text: '=QUERY(A1:I6500, "SELECT C, G, SUM(H*I) WHERE C IS NOT NULL GROUP BY C, G PIVOT D", 1)\n=ARRAYFORMULA(IF(ROW(A2:A)=2, "Revenue", IF(A2:A="", "", H2:H * I2:I)))\n=REGEXEXTRACT(B2, "@([a-zA-Z0-9.-]+)")   -- extract email domain\n=SPARKLINE(B2:M2, {"charttype","column"; "highcolor","#2158d6"})',
          },
          doit: 'Import the café CSV into Google Sheets. 1) Use a single <code>=QUERY(...)</code> formula to build a summary of total quantity and average price by category, sorted highest first. 2) Use a second <code>=QUERY(...)</code> with <code>PIVOT</code> to cross-tabulate city vs. channel. 3) Add inline <code>=SPARKLINE(...)</code> mini-charts next to each store.',
          ai: {
            title: 'Translate my question into a Google Sheets QUERY() formula',
            text: "My Google Sheet tab 'Orders' has columns A (order_id), B (order_date), C (city), D (channel), E (customer_id), F (product), G (category), H (qty), I (unit_price).\n\nWrite a Google Sheets =QUERY() formula for: [[YOUR QUESTION]]. Explain every clause (SELECT, WHERE, GROUP BY, PIVOT, LABEL, FORMAT) and how date filtering works in QUERY().\n{{lang}}",
          },
          quiz: {
            q: 'What does the Google Sheets QUERY() function let you do inside a single cell?',
            options: ['Filter, group, aggregate and pivot a range using SQL-like syntax', 'Connect directly to a remote Oracle or PostgreSQL server without an add-on', 'Run Python pandas scripts directly inside the spreadsheet formula bar', 'Automatically fix spelling mistakes across all sheets in the workbook'],
            answer: 0,
            why: 'QUERY() uses the Google Visualization API Query Language (SELECT, WHERE, GROUP BY, PIVOT, ORDER BY, LIMIT).',
          },
          links: [{ label: 'Ben Collins: Google Sheets QUERY guide', url: 'https://www.benlcollins.com/spreadsheets/google-sheets-query-sql/' }],
        },
        {
          id: 'l1-7', title: 'Spreadsheet Modeling: Scenarios, Cohorts and Error-Proofing', hours: 4,
          why: 'Decision-makers ask "what if price rises 10% or churn drops 2 points?". A clean model answers live in the meeting.',
          learn: [
            'Separate <b>Inputs / Assumptions</b> (blue font, in one dedicated block), <b>Calculations</b> (black formulas) and <b>Outputs / KPIs</b> (summary cards and charts).',
            'Never hard-code constants inside formulas (<code>=B5*0.21</code>); point to an assumption cell (<code>=B5*$C$2</code> or a named range <code>TaxRate</code>).',
            'Use <b>What-If Data Tables</b>, <b>Scenario Manager</b> and <b>Goal Seek</b> ("what conversion rate do we need to break even?") to stress-test decisions.',
            'Build <b>reconciliation checks</b> right into the sheet: <code>=IF(ABS(SUM(G2:G12)-TotalRev)&gt;0.01, "⚠️ CHECK", "OK")</code> so broken totals are caught immediately.',
          ],
          code: {
            lang: 'excel', title: 'Scenario & reconciliation patterns',
            text: '=CHOOSE(ScenarioPick, BaseGrowth, UpsideGrowth, DownsideGrowth)\n=IFERROR(NetProfit / Revenue, 0)\n=IF(ABS(SUM(MonthlyRev) - AnnualTotal) < 0.01, "✓ Balanced", "⚠️ Off by " & TEXT(SUM(MonthlyRev)-AnnualTotal, "0.00"))',
          },
          doit: 'Build a 12-month coffee-shop profit model in Excel or Google Sheets with 3 adjustable inputs (monthly orders growth %, average basket €, gross margin %) and 3 scenarios (Base, Optimistic, Conservative). Use Goal Seek to find the minimum basket size needed to reach €10,000 monthly profit.',
          ai: {
            title: 'Audit my spreadsheet model for fragile formulas',
            text: "I built a spreadsheet model for [[PURPOSE]]. Here are my inputs, key formulas and layout:\n[[DESCRIBE MODEL]]\n\nAudit it like a senior financial/business analyst: 1) spot hard-coded assumptions or fragile references, 2) suggest 3 sanity/reconciliation check cells to add, 3) suggest a 2-variable sensitivity table that would help the decision-maker.\n{{lang}}",
          },
          quiz: {
            q: 'Which Excel tool finds the exact input value needed to hit a target formula result?',
            options: ['Goal Seek (under What-If Analysis)', 'Consolidate (under Data Tools)', 'Conditional Formatting Color Scales', 'Subtotals (under Outline)'],
            answer: 0,
            why: 'Goal Seek varies one input cell automatically until a dependent formula reaches your target number.',
          },
          links: [],
        },
      ],
    },

    /* ------------------------------------------------------------------ 2 */
    {
      id: 'm2', icon: '🗄️', cat: 'SQL', title: 'SQL',
      goal: 'Write queries with joins, grouping, CTEs and window functions. Practised in the built-in SQLab.',
      lessons: [
        {
          id: 'l2-1', title: 'SELECT, WHERE and ORDER BY', hours: 3, lab: 'auto',
          why: 'SQL is the most requested analyst skill. It is how you ask a database a question.',
          learn: [
            'A query reads like a sentence: <code>SELECT</code> columns <code>FROM</code> table <code>WHERE</code> condition <code>ORDER BY</code> column.',
            'Conditions: <code>=</code>, <code>&lt;&gt;</code>, <code>&gt;</code>, <code>AND</code>, <code>OR</code>, <code>IN</code>, <code>BETWEEN</code>, <code>LIKE</code>, <code>IS NULL</code>. Use brackets when mixing AND and OR.',
            'Text goes in single quotes; column names do not. <code>NULL</code> means unknown: it is never equal to anything, so use <code>IS NULL</code>.',
            'Use <code>LIMIT</code> while exploring so you never fetch millions of rows by accident.',
            'Format queries over several lines with consistent capitalisation. You will thank yourself later.',
          ],
          code: { lang: 'sql', title: 'Example', text: "SELECT name, category, price\nFROM products\nWHERE category = 'Coffee' AND price < 4\nORDER BY price DESC\nLIMIT 5;" },
          doit: 'Open SQLab and solve the Level 1 challenges. Then explore freely: what do the tables contain? Write 3 questions of your own and answer them.',
          ai: {
            title: 'Get a hint, not the solution',
            text: "I'm learning SQL. The task I'm trying to solve: [[TASK]]\nSchema:\n[[PASTE SCHEMA]]\nMy query:\n[[YOUR QUERY]]\nError or wrong result:\n[[ERROR]]\n\nDon't write the solution yet. 1) Explain what my query does in plain language. 2) Tell me what is wrong and why. 3) Give me one hint for the next step.\n{{lang}}",
          },
          quiz: {
            q: 'What does WHERE do?',
            options: ['Sorts the result', 'Filters rows before any grouping', 'Filters groups after aggregation', 'Chooses the columns'],
            answer: 1,
            why: 'WHERE works on individual rows. HAVING works on groups.',
          },
          links: [{ label: 'SQLBolt: interactive lessons', url: 'https://sqlbolt.com' }, { label: 'Mode SQL tutorial', url: 'https://mode.com/sql-tutorial/' }],
        },
        {
          id: 'l2-2', title: 'GROUP BY, aggregates and HAVING', hours: 4, lab: 'auto', concept: 'aggregate',
          why: 'Almost every business question is "how much / how many per ___". That is GROUP BY.',
          learn: [
            'Aggregate functions <code>COUNT</code>, <code>SUM</code>, <code>AVG</code>, <code>MIN</code>, <code>MAX</code> collapse many rows into one number.',
            '<code>GROUP BY</code> makes one result row per group. Every selected column must be grouped or aggregated.',
            '<b>WHERE filters rows before grouping; HAVING filters groups after.</b> This is the most common SQL interview question.',
            '<code>COUNT(*)</code> counts rows, <code>COUNT(col)</code> skips NULLs, <code>COUNT(DISTINCT col)</code> counts unique values.',
            'Logical order of a query: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.',
          ],
          code: { lang: 'sql', title: 'Example', text: "SELECT channel,\n       COUNT(*) AS n_orders,\n       COUNT(DISTINCT customer_id) AS n_customers\nFROM orders\nWHERE order_date >= '2025-06-01'\nGROUP BY channel\nHAVING COUNT(*) > 100\nORDER BY n_orders DESC;" },
          doit: 'Solve the GROUP BY challenges in the lab. Then write one query that gives the headline numbers of the whole dataset: totals, counts and the date range.',
          ai: {
            title: 'Explain GROUP BY in my world and drill me',
            text: "Explain GROUP BY and HAVING using an example from my background ({{bg}}). Then give me 5 practice questions of increasing difficulty on this schema (no answers, wait for my attempts):\n[[PASTE SCHEMA]]\n{{lang}}",
          },
          quiz: {
            q: 'Which clause filters groups after aggregation?',
            options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
            answer: 1,
            why: 'HAVING is evaluated after GROUP BY, so it can use aggregates such as COUNT(*).',
          },
          links: [{ label: 'SQLBolt', url: 'https://sqlbolt.com' }],
        },
        {
          id: 'l2-3', title: 'JOINs: combining tables', hours: 4, lab: 'auto', concept: 'join',
          why: 'Real data lives in several tables. Joins are what make SQL powerful, and the most common source of silent mistakes.',
          learn: [
            'Databases split data into tables to avoid repetition. A <b>JOIN</b> puts it back together through a shared key (<code>customer_id</code>, <code>product_id</code>).',
            '<code>INNER JOIN</code> keeps matches only. <code>LEFT JOIN</code> keeps every row from the left table, with NULLs where there is no match: perfect for "who has never…" questions.',
            'Always compare row counts before and after a join. A join on a non-unique key silently <b>multiplies rows</b> and inflates sums.',
            'Use short aliases (<code>o</code>, <code>p</code>) and name the table in each column: <code>o.order_id</code>.',
            'Draw the schema on paper before joining 3 or 4 tables.',
          ],
          code: { lang: 'sql', title: 'Example', text: 'SELECT p.category, SUM(oi.qty * p.price) AS revenue\nFROM order_items AS oi\nJOIN products AS p ON p.product_id = oi.product_id\nGROUP BY p.category;' },
          doit: 'Solve the JOIN challenges in the lab. For each one, first sketch which tables you need and which columns connect them. Then try the trap: join orders to order_items and sum something that lives on orders. What happens to the total, and why?',
          ai: {
            title: 'Diagnose a join that inflates my totals',
            text: "I joined these tables and my totals look too big.\nSchema:\n[[SCHEMA]]\nQuery:\n[[QUERY]]\n\nExplain how a join can duplicate rows (fan-out), show it with a tiny example, and tell me how to detect and fix it in my query. Then ask me one question to test whether I understood.\n{{lang}}",
          },
          quiz: {
            q: 'You need the customers who never ordered. Which approach?',
            options: ['INNER JOIN customers to orders, then keep rows where order_id IS NULL', 'LEFT JOIN customers to orders, then keep rows where orders.order_id IS NULL', 'CROSS JOIN customers and orders, then keep only the pairs whose ids do not match', 'UNION the customer ids and the order ids, then remove the duplicates'],
            answer: 1,
            why: 'LEFT JOIN keeps customers without orders and marks the missing side with NULL.',
          },
          links: [{ label: 'SQLZoo', url: 'https://sqlzoo.net' }],
        },
        {
          id: 'l2-4', title: 'CTEs and window functions', hours: 4, lab: 'auto',
          why: 'This is the level that separates "knows SQL" from "can do analyst work", and interviewers love it.',
          learn: [
            'A <b>CTE</b> (<code>WITH name AS (…)</code>) gives a sub-query a name so a complex query reads top to bottom, in steps.',
            '<b>Window functions</b> compute across related rows <i>without collapsing them</i>: <code>ROW_NUMBER()</code>, <code>RANK()</code>, <code>LAG()</code>, <code>SUM() OVER (…)</code>.',
            '<code>PARTITION BY</code> means "restart for each group". <code>ORDER BY</code> inside <code>OVER</code> means "in this order".',
            'Typical uses: running totals, month-over-month change, top-N per group, first and last event per user.',
          ],
          code: { lang: 'sql', title: 'Month-over-month change', text: "WITH monthly AS (\n  SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders\n  FROM orders GROUP BY month\n)\nSELECT month, orders,\n       orders - LAG(orders) OVER (ORDER BY month) AS change_vs_prev\nFROM monthly;" },
          doit: 'Solve the Level 3 challenges in the lab. Then write: month-over-month % change in revenue. Finally paste your hardest query into the review prompt below.',
          ai: {
            title: 'Review my SQL like a senior analyst',
            text: "Review my SQL like a senior analyst. Don't just fix it: tell me (1) correctness problems, (2) readability improvements (CTEs, naming), (3) a performance concern if any.\n\n[[YOUR QUERY]]\n\nSchema:\n[[SCHEMA]]\n{{lang}}",
          },
          quiz: {
            q: 'What does PARTITION BY do in a window function?',
            options: ['Collapses each group into a single row, as GROUP BY does', 'Restarts the calculation for each group, without collapsing rows', 'Splits the table into separate result sets, one per group', 'Sorts the rows inside each group before the final result is returned'],
            answer: 1,
            why: 'Unlike GROUP BY, a window function keeps every row and adds a computed column.',
          },
          links: [{ label: 'PG Exercises', url: 'https://pgexercises.com' }],
        },
      ],
    },

    /* ------------------------------------------------------------------ 3 */
    {
      id: 'm3', icon: '🐍', cat: 'Python', title: 'Python, pandas and automation',
      goal: 'Load, clean, model, visualise and automate data workflows in Python with pandas, seaborn and APIs.',
      lessons: [
        {
          id: 'l3-1', title: 'Notebooks and your first DataFrame', hours: 6, download: 'retail',
          why: 'Python handles data too big, too messy or too repetitive for spreadsheets, and a notebook is a document you can show.',
          learn: [
            'Use <b>Google Colab</b> (in the browser, free, nothing to install) or Jupyter. A notebook mixes code, results and notes.',
            '<b>pandas</b> is the spreadsheet of Python: a <code>DataFrame</code> is a table and a <code>Series</code> is one column.',
            'First five commands on any dataset: <code>df.head()</code>, <code>df.shape</code>, <code>df.info()</code>, <code>df.describe()</code>, <code>df.isna().sum()</code>.',
            'Select with <code>df["col"]</code>, filter with <code>df[df["price"] &gt; 4]</code>, sort with <code>sort_values</code>.',
            'Always ask: how many rows, what does one row represent, what is missing, what are the types?',
          ],
          code: { lang: 'python', title: 'First look at the café data', text: "import pandas as pd\n\ndf = pd.read_csv('retail_orders.csv', parse_dates=['order_date'])\nprint(df.shape)\ndf.info()\ndf['revenue'] = df['qty'] * df['unit_price']\ndf.sort_values('revenue', ascending=False).head(10)" },
          doit: 'Upload the café CSV to Colab and run the five first commands. In a markdown cell, write what one row represents, how many rows there are, the date range and any oddities. Reproduce your spreadsheet pivot table with one <code>groupby</code>.',
          ai: {
            title: 'Explain this pandas code, then test me',
            text: "I'm a beginner in pandas. Explain this code line by line, then give me a short exercise that uses the same ideas on a different question. Wait for my answer before showing the solution.\n\n[[PASTE CODE]]\n{{lang}}",
          },
          quiz: {
            q: 'What does df.shape return?',
            options: ['(number of columns, number of rows)', '(number of rows, number of columns)', 'The data type of every column', 'The number of missing values per column'],
            answer: 1,
            why: 'It is a quick way to check you loaded what you expected.',
          },
          links: [
            { label: 'Google Colab', url: 'https://colab.research.google.com' },
            { label: '10 minutes to pandas', url: 'https://pandas.pydata.org/docs/user_guide/10min.html' },
            { label: 'Kaggle Learn: Pandas', url: 'https://www.kaggle.com/learn/pandas' },
          ],
        },
        {
          id: 'l3-2', title: 'Cleaning and transforming', hours: 6, download: 'messy',
          why: 'Cleaning in code is repeatable: when new data arrives, you rerun one cell instead of redoing an afternoon of clicking.',
          learn: [
            'Fix types first: <code>pd.to_datetime</code>, <code>pd.to_numeric(errors="coerce")</code>, <code>astype</code>.',
            'Text: <code>df["city"].str.strip().str.title()</code>. Check with <code>value_counts()</code> to see the typos.',
            'Missing data: <code>isna()</code>, <code>dropna()</code>, <code>fillna()</code>. Decide per column and <b>document why</b>: dropping rows can bias your results.',
            'Duplicates: <code>df.duplicated().sum()</code>, <code>drop_duplicates()</code>.',
            'Mixed date formats can be ambiguous (04/03 is 4 March or 3 April?). Decide a rule and write it down.',
            'Put the cleaning in one re-runnable cell or function. You will rerun it often.',
          ],
          code: { lang: 'python', title: 'Cleaning the messy file', text: "df = pd.read_csv('messy_orders.csv')\ndf = df.dropna(how='all').drop_duplicates()\ndf['City'] = df['City'].str.strip().str.title()\ndf['Price'] = pd.to_numeric(\n    df['Price'].str.replace('$', '', regex=False).str.replace(',', '.'),\n    errors='coerce')\ndf['Date'] = pd.to_datetime(df['Date'], format='mixed', errors='coerce')\ndf['City'].value_counts()" },
          doit: 'Clean the messy orders file in pandas. For each fix, print the before and after counts. Compare with your spreadsheet cleaning: which was faster, and which is repeatable?',
          ai: {
            title: 'Cleaning plan with trade-offs',
            text: "Here is a pandas DataFrame's df.info() and 10 sample rows (anonymised):\n\n[[PASTE]]\n\nSuggest a cleaning plan: for each column, the problem, the pandas code and a check. Don't hide decisions: where there is a judgement call (drop vs. fill, ambiguous dates) tell me the options and the trade-offs.\n{{lang}}",
          },
          quiz: {
            q: 'A column has 5% missing values. What do you do first?',
            options: ['Drop those rows straight away, so no calculation is affected', 'Find out why they are missing, then drop, fill or flag them and note why', 'Fill them with zero, so that every calculation still works', 'Fill them with the column mean, which keeps the results unbiased'],
            answer: 1,
            why: 'Missing data is often missing for a reason, and the reason decides the right treatment.',
          },
          links: [{ label: 'Python Data Science Handbook (free)', url: 'https://jakevdp.github.io/PythonDataScienceHandbook/' }],
        },
        {
          id: 'l3-3', title: 'Merge, reshape and plot', hours: 6, concept: 'join',
          why: 'Combining tables and drawing a first chart turns data into something you can reason about.',
          learn: [
            '<code>pd.merge(a, b, on="key", how="left")</code> is SQL JOIN in pandas. Check <code>len()</code> before and after.',
            '<code>pivot_table</code> and <code>melt</code> reshape between wide and long formats.',
            'Plot to <b>look at data</b>, not only to present it: histograms, box plots, scatter and line charts with <code>df.plot()</code>, matplotlib or seaborn.',
            'Date features: <code>df["order_date"].dt.month</code>, <code>.dt.day_name()</code>.',
            'Save your notebook to GitHub early. It is portfolio raw material.',
          ],
          code: { lang: 'python', title: 'Monthly revenue by category', text: "monthly = (df.assign(month=df['order_date'].dt.to_period('M'))\n            .groupby(['month', 'category'])['revenue'].sum()\n            .unstack())\nmonthly.plot(kind='line', figsize=(9, 4), title='Revenue by month and category');" },
          doit: 'Compute monthly revenue by category, plot it and write 3 observations. Then merge a small table of your own (for example city → region) and check that no rows were lost or duplicated.',
          ai: {
            title: 'Critique and improve my chart code',
            text: "Look at this notebook cell and the chart it produces. [[PASTE CODE AND DESCRIBE THE CHART]]\n1) Is the chart type right for the question: [[QUESTION]]? 2) Suggest 3 improvements (labels, order, scale, colour). 3) Write the improved code and explain each change so I learn.\n{{lang}}",
          },
          quiz: {
            q: 'After a left merge your row count increased. The most likely cause?',
            options: ['A pandas bug that appears when the key columns are text', 'The right-hand table has duplicate keys, multiplying matches', 'Missing values in the key column create extra empty rows', 'A left merge adds the rows of both tables together, by design'],
            answer: 1,
            why: 'Same fan-out as in SQL joins: a key that is not unique on the right side repeats left rows.',
          },
          links: [{ label: 'Seaborn tutorial', url: 'https://seaborn.pydata.org/tutorial.html' }],
        },
        {
          id: 'l3-4', title: 'Advanced pandas: Window Functions, transform and Vectorised Logic', hours: 5, download: 'retail',
          why: 'Just like window functions in SQL, pandas transform, shift and rolling let you compare every row to its group or history at full speed.',
          learn: [
            '<code>df.groupby("store_city")["revenue"].transform("sum")</code> computes the group total and broadcasts it back to every row—perfect for computing each row\'s % share of its city.',
            '<code>.shift(1)</code> and <code>.pct_change()</code> are pandas\' <code>LAG</code> and period-over-period growth; <code>.rolling(7).mean()</code> smooths noisy daily series.',
            'Avoid slow <code>.iterrows()</code> loops: use vectorised <code>np.where(cond, a, b)</code> or <code>np.select([c1, c2], [v1, v2], default=v3)</code> (the pandas equivalent of <code>CASE WHEN</code>).',
            'Chain clean pipelines with <code>.assign(...)</code> and <code>.query(...)</code> so transformations don\'t mutate intermediate variables.',
          ],
          code: {
            lang: 'python', title: 'Window functions & vectorised segmentation in pandas',
            text: "import numpy as np\n\ndf['city_total'] = df.groupby('store_city')['revenue'].transform('sum')\ndf['share_of_city'] = df['revenue'] / df['city_total']\ndf['tier'] = np.select(\n    [df['revenue'] >= 20, df['revenue'] >= 10],\n    ['High', 'Medium'],\n    default='Standard'\n)\ndaily = df.groupby('order_date')['revenue'].sum().to_frame()\ndaily['rolling_7d'] = daily['revenue'].rolling(7, min_periods=1).mean()",
          },
          doit: 'Using the café CSV in Colab: 1) Add each customer\'s first order date using <code>groupby("customer_id")["order_date"].transform("min")</code>. 2) Flag every order as "New" or "Returning" using <code>np.where</code>. 3) Plot daily revenue alongside its 7-day rolling mean.',
          ai: {
            title: 'Refactor my slow pandas loop into vectorised code',
            text: "Here is my pandas code (or SQL query I want to write in pandas):\n[[PASTE CODE]]\n\nRewrite it using idiomatic vectorised pandas (.groupby().transform(), np.select, .rolling(), .shift(), method chaining). Explain why each step is faster and easier to verify.\n{{lang}}",
          },
          quiz: {
            q: 'Which pandas method works like SQL SUM(rev) OVER (PARTITION BY city), returning a Series aligned with df?',
            options: ['df.groupby("city")["rev"].transform("sum")', 'df.groupby("city")["rev"].agg("sum")', 'df.pivot_table(index="city", values="rev")', 'df.sort_values("city")["rev"].cumsum()'],
            answer: 0,
            why: 'transform() returns a Series with the same index and length as the original DataFrame.',
          },
          links: [{ label: 'pandas User Guide: GroupBy transform', url: 'https://pandas.pydata.org/docs/user_guide/groupby.html#transformation' }],
        },
        {
          id: 'l3-5', title: 'Time Series, Cohort Retention and RFM Segmentation in Python', hours: 5.5, download: 'retail',
          why: 'Retention cohorts and RFM customer segments are two of the highest-impact analyses in e-commerce, SaaS and retail.',
          learn: [
            '<b>Resampling time series</b>: set or use a datetime column with <code>df.resample("MS", on="order_date")["revenue"].sum()</code> to aggregate cleanly by month start, week or quarter.',
            '<b>Cohort analysis</b> groups customers by the month of their first purchase (<code>cohort_month</code>) and tracks what % return in month +1, +2, +3… using a pivot table.',
            '<b>RFM segmentation</b> scores every customer on <b>Recency</b> (days since last order), <b>Frequency</b> (order count) and <b>Monetary</b> (total spend) using <code>pd.qcut</code> quartiles.',
            'Visualise cohort retention triangles with <code>sns.heatmap(retention, annot=True, fmt=".0%", cmap="Blues")</code>.',
          ],
          code: {
            lang: 'python', title: 'Cohort retention matrix in 10 lines of pandas',
            text: "df['order_month'] = df['order_date'].dt.to_period('M')\ndf['cohort'] = df.groupby('customer_id')['order_month'].transform('min')\ndf['month_n'] = (df['order_month'] - df['cohort']).apply(lambda x: x.n)\ncohorts = df.groupby(['cohort', 'month_n'])['customer_id'].nunique().unstack()\nretention = cohorts.divide(cohorts[0], axis=0).round(3)",
          },
          doit: 'Run the cohort retention code on the café sales CSV in Colab and plot it as a seaborn heatmap. Then build an RFM table per <code>customer_id</code> (Recency in days, Frequency of distinct orders, Monetary total spend) and identify the top "Champions" segment vs. "At-Risk" high-spend customers who haven\'t ordered in 60+ days.',
          ai: {
            title: 'Interpret my cohort & RFM tables for a business team',
            text: "Here are my cohort retention numbers / RFM segment counts:\n[[PASTE TABLE]]\n\nHelp me interpret them for a marketing & operations team: 1) where is the biggest drop-off in retention, 2) what concrete campaign or action fits each RFM segment, 3) what data caveats should I check first.\n{{lang}}",
          },
          quiz: {
            q: 'In a customer cohort retention table, how is each row\'s cohort typically defined?',
            options: ['By the period of the customer\'s very first purchase or sign-up', 'By the main product category where the customer spent the most money', 'By the calendar month in which the customer last opened the mobile app', 'By the store city that recorded the highest average order value overall'],
            answer: 0,
            why: 'Grouping users by their start period lets you compare Month +1, +2, +3 retention fairly across cohorts.',
          },
          links: [],
        },
        {
          id: 'l3-6', title: 'Publication-Quality Charts in Python: Seaborn, Matplotlib and Plotly', hours: 5, download: 'retail',
          why: 'Default matplotlib plots look unfinished. A few lines of styling and annotation turn notebook output into executive-ready visuals.',
          learn: [
            '<b>Seaborn</b> handles statistical plots and small multiples in one call: <code>sns.relplot</code>, <code>sns.catplot</code>, <code>sns.boxplot</code> and <code>FacetGrid</code>.',
            'Use <code>fig, ax = plt.subplots(figsize=(9, 4.5), dpi=120)</code>, remove top/right spines with <code>sns.despine()</code>, and format axes with <code>matplotlib.ticker</code>.',
            'Highlight the story: plot comparison series in muted grey (<code>#94a3b8</code>) and the focal series in bold accent colour with <code>ax.annotate(...)</code>.',
            'Use <b>Plotly Express</b> (<code>px.line</code>, <code>px.bar</code>, <code>px.scatter</code>) when stakeholders want interactive hover tooltips and zoomable HTML charts.',
          ],
          code: {
            lang: 'python', title: 'Clean, annotated executive chart in matplotlib / seaborn',
            text: "import matplotlib.pyplot as plt\nimport seaborn as sns\n\nfig, ax = plt.subplots(figsize=(8.5, 4.2), dpi=120)\nfor cat, grp in monthly.groupby('category'):\n    is_top = (cat == 'Coffee')\n    ax.plot(grp['month'], grp['revenue'], lw=2.8 if is_top else 1.4,\n            color='#2158d6' if is_top else '#94a3b8', label=cat)\nax.set_title('Coffee drives 54% of revenue and peaks in Q4', loc='left', fontweight='bold')\nsns.despine()",
          },
          doit: 'Take one chart from your notebook and upgrade it to publication quality: remove top/right borders, grey out context series, highlight the key series in blue, add a direct label at the end of the line, and add a callout annotation pointing to the highest month.',
          ai: {
            title: 'Turn my basic matplotlib plot into an executive chart',
            text: "Here is my current Python plotting code:\n[[PASTE CODE]]\n\nThe main insight I want the reader to see in 5 seconds is: [[INSIGHT]].\nRewrite the code using matplotlib/seaborn so it uses a clear hierarchy (accent colour vs grey context, despine, direct labels, an annotation on the key point, and an insight title).\n{{lang}}",
          },
          quiz: {
            q: 'What does sns.despine() do to a matplotlib / seaborn chart?',
            options: ['Removes the top and right border lines to reduce visual clutter', 'Deletes outlier points that sit more than 3 standard deviations away', 'Converts a vertical bar chart into a horizontal bar chart', 'Normalises the y-axis so all series start at 100'],
            answer: 0,
            why: 'Removing unnecessary box borders (spines) keeps attention on the data.',
          },
          links: [{ label: 'Python Graph Gallery', url: 'https://python-graph-gallery.com' }],
        },
        {
          id: 'l3-7', title: 'Automating Reports, APIs and Excel Exports in Python', hours: 4.5,
          why: 'Turning a manual Monday-morning report into a one-click script saves hours every week and impresses every team.',
          learn: [
            'Fetch live data from web APIs with <code>requests.get(url, params=..., timeout=10).json()</code> and flatten nested JSON into a table with <code>pd.json_normalize(data)</code>.',
            'Combine multiple CSVs in a folder automatically with <code>pathlib.Path("data/").glob("*.csv")</code> and <code>pd.concat(..., ignore_index=True)</code>.',
            'Export multi-tab Excel workbooks with <code>pd.ExcelWriter("weekly_report.xlsx")</code>—writing Summary, By_Store and Raw_Clean sheets in one run.',
            'Add basic assertions (<code>assert df["order_id"].is_unique</code>, <code>assert df["revenue"].ge(0).all()</code>) so the script stops loudly if upstream data is corrupted.',
          ],
          code: {
            lang: 'python', title: 'Automated validation + multi-sheet Excel export',
            text: "from pathlib import Path\nimport pandas as pd\n\nfiles = sorted(Path('monthly_csvs').glob('*.csv'))\ndf = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)\nassert df['qty'].gt(0).all(), 'Found non-positive quantities!'\n\nwith pd.ExcelWriter('cafe_executive_report.xlsx') as writer:\n    summary.to_excel(writer, sheet_name='Summary', index=False)\n    by_store.to_excel(writer, sheet_name='By_Store', index=False)",
          },
          doit: 'Write a clean Python function <code>build_weekly_report(csv_path)</code> that loads the café CSV, runs 3 data-quality assertions, computes city and category summaries, and exports a 3-tab Excel file (<code>Executive_Summary</code>, <code>City_Breakdown</code>, <code>Data_Quality_Log</code>).',
          ai: {
            title: 'Write a repeatable Python reporting script with data assertions',
            text: "I want to automate a recurring report in Python. Source data: [[CSV / Excel / JSON API]]. Outputs needed: [[DESCRIBE TABLES / SHEETS]].\nWrite a clean, well-structured script with: 1) data loading, 2) 4 data-quality assertions, 3) summary tables, and 4) multi-sheet Excel export. Explain how I can schedule or run it safely every week.\n{{lang}}",
          },
          quiz: {
            q: 'Which pandas function flattens nested JSON records from an API into a flat DataFrame?',
            options: ['pd.json_normalize(data)', 'pd.read_html(data)', 'df.to_json(orient="records")', 'pd.melt(data)'],
            answer: 0,
            why: 'pd.json_normalize unpacks nested dictionaries into dot-separated columns.',
          },
          links: [],
        },
      ],
    },

    /* ------------------------------------------------------------------ 4 */
    {
      id: 'm4', icon: '📐', cat: 'Statistics', title: 'Statistics for analysts',
      goal: 'Describe data honestly, quantify uncertainty and avoid the classic traps.',
      lessons: [
        {
          id: 'l4-1', title: 'Describing data', hours: 4, concept: 'spread',
          why: 'Before any test, you need to know what your data looks like: centre, spread, shape and oddities.',
          learn: [
            '<b>Centre</b>: the mean is sensitive to outliers, the median is robust. Use the median for skewed data such as salaries or order values.',
            '<b>Spread</b>: standard deviation, IQR and percentiles. Always report spread next to the average.',
            '<b>Shape</b>: histograms reveal skew, several peaks and gaps that an average hides.',
            '<b>Outliers</b>: investigate first, then decide. Error → fix. Real → keep and report with and without.',
            'Know the difference between <b>percent</b> and <b>percentage points</b>, and between absolute and relative change.',
          ],
          code: { lang: 'python', title: 'Describe a column', text: "df['revenue'].describe()\ndf['revenue'].quantile([.5, .9, .99])\ndf['revenue'].plot(kind='hist', bins=30)" },
          doit: 'Compute mean, median, standard deviation and the 90th percentile of order value (SQL or pandas) and plot a histogram. Is the mean close to the median? What does that tell you? Find 3 outliers and write your decision for each.',
          ai: {
            title: 'Teach me with my own world',
            text: "Explain mean vs. median vs. standard deviation using an example from my background ({{bg}}). Then give me 3 small datasets (5 to 8 numbers each) and ask me which summary statistic is misleading for each, and why. Wait for my answers.\n{{lang}}",
          },
          quiz: {
            q: 'Order values are right-skewed with a few huge orders. The best "typical" value?',
            options: ['Mean', 'Median', 'Maximum', 'Sum'],
            answer: 1,
            why: 'A few huge values drag the mean up; the median stays with the typical order.',
          },
          links: [{ label: 'Khan Academy: statistics', url: 'https://www.khanacademy.org/math/statistics-probability' }, { label: 'OpenIntro Statistics (free book)', url: 'https://www.openintro.org/book/os/' }],
        },
        {
          id: 'l4-2', title: 'Sampling, uncertainty and confidence intervals', hours: 4, concept: 'sample',
          why: 'Every number you report is an estimate. Saying how uncertain it is makes you trustworthy.',
          learn: [
            'You almost never see the whole population, so you estimate from a <b>sample</b>. Estimates carry <b>uncertainty</b>.',
            'A <b>confidence interval</b> gives a plausible range for the true value: "conversion is 4.1% (95% CI 3.5% to 4.7%)". It narrows with more data.',
            'The standard error shrinks like 1/√n: to halve the uncertainty you need 4× the data.',
            '<b>Bias beats size.</b> A huge but non-random sample (volunteers, survivors) can be confidently wrong.',
            'Say "about" and give a range. Stakeholders respect honesty more than fake precision.',
          ],
          code: { lang: 'python', title: 'Approximate 95% confidence interval for a mean', text: "import numpy as np\nx = df['revenue']\nmean = x.mean()\nse = x.std(ddof=1) / np.sqrt(len(x))\nprint(mean - 1.96 * se, mean + 1.96 * se)" },
          doit: 'Compute a 95% CI for the mean order value of one store, then for a random sample of 50 of its orders. Compare the widths. Write one sentence you would use to explain this to a manager.',
          ai: {
            title: 'Confidence intervals without jargon',
            text: "Explain confidence intervals without jargon, with a story from my background ({{bg}}). Then explain the 3 most common misinterpretations (including \"there is a 95% chance the true value is in this interval\") and quiz me with 3 true/false statements.\n{{lang}}",
          },
          quiz: {
            q: 'You want a confidence interval half as wide. Roughly how much more data do you need?',
            options: ['2×', '4×', '10×', 'It cannot be done'],
            answer: 1,
            why: 'Width shrinks with the square root of the sample size, so halving it takes 4× the data.',
          },
          links: [{ label: 'OpenIntro Statistics', url: 'https://www.openintro.org/book/os/' }],
        },
        {
          id: 'l4-3', title: 'Hypothesis tests and A/B testing', hours: 5, lab: 'lab',
          why: 'Companies constantly ask "did this change work?". You need to answer without fooling yourself.',
          learn: [
            'Set-up: <b>H0</b> "no difference" vs. <b>H1</b>. The <b>p-value</b> is how surprising your data would be if H0 were true. It is <b>not</b> the probability that H0 is true.',
            'Report the <b>effect size</b> and its interval, not just "significant". A tiny, useless effect can be significant with enough data.',
            'Plan before you run: <b>sample size</b>, <b>power</b>, the metric and the duration. Do not peek and stop when it looks good.',
            'Testing many things inflates false positives (multiple comparisons).',
            'Common tests: t-test (means), chi-square (categories), proportion z-test (conversion rates).',
          ],
          code: { lang: 'python', title: 'Compare two groups', text: "from scipy import stats\na = control['change']\nb = intervention['change']\nprint(stats.ttest_ind(a, b, equal_var=False))\nprint(b.mean() - a.mean())   # effect size in original units" },
          doit: 'Use the training-study dataset: compute each participant\'s change in vo2max (the last Lab challenge does this in SQL), then compare the two groups. Report the effect size, a 95% CI, the p-value, your conclusion and 2 limitations (dropouts, sample size).',
          ai: {
            title: 'Statistician-mentor review of my A/B test',
            text: "I ran an A/B test: [[DESCRIBE GROUPS, SAMPLE SIZES AND RESULTS]]. Act as a statistician-mentor: 1) which test fits and why, 2) the assumptions I should check, 3) explain the result in plain language, 4) list what could make my conclusion wrong, 5) write a 3-sentence summary for a manager. Don't skip step 4.\n{{lang}}",
          },
          quiz: {
            q: 'A p-value of 0.03 means:',
            options: ['There is a 97% chance that the effect is real and not luck', 'With no real effect, data this extreme would turn up about 3% of the time', 'The effect is large and important enough to matter for the business decision', 'There is a 3% chance that there is no effect at all'],
            answer: 1,
            why: 'The p-value describes the data under H0. It says nothing about effect size or about the probability of H0.',
          },
          links: [{ label: 'Sample-size calculator for A/B tests', url: 'https://www.evanmiller.org/ab-testing/sample-size.html' }],
        },
        {
          id: 'l4-4', title: 'Correlation, regression and causation', hours: 5, concept: 'causation',
          why: '"X causes Y" is the most tempting and most dangerous sentence in analytics.',
          learn: [
            '<b>Correlation</b> (−1 to 1) measures how two variables move together. It says nothing about cause and only captures linear association.',
            '<b>Confounders</b> create fake relationships: ice-cream sales and drownings both rise with temperature.',
            '<b>Regression</b> estimates how an outcome changes with a predictor while holding others fixed. Read the coefficient in real units.',
            'Causal claims need a randomised experiment or a very careful design (comparison groups, before/after with a control).',
            'Always plot the scatter first: very different data can have identical correlations (Anscombe\'s quartet).',
          ],
          code: { lang: 'python', title: 'Correlation and a simple regression', text: "df[['temperature', 'sales']].corr()\nimport statsmodels.formula.api as smf\nmodel = smf.ols('sales ~ temperature + weekend', data=df).fit()\nprint(model.summary())" },
          doit: 'Pick two variables from any dataset, compute the correlation, plot the scatter, then write 3 possible explanations other than "A causes B". For each, what data would test it?',
          ai: {
            title: 'Devil\'s advocate on my correlation',
            text: "I found a correlation between [[A]] and [[B]] in my data. Play devil's advocate: list 5 alternative explanations (confounders, reverse causation, selection, coincidence, data issues) in my context ({{bg}}), and for each, how I could check it with data. Then tell me how an experiment could settle it.\n{{lang}}",
          },
          quiz: {
            q: 'Ice-cream sales correlate with drownings. The best explanation?',
            options: ['Ice cream causes drowning', 'A confounder (hot weather) drives both', 'Drowning makes people buy ice cream', 'The data must be fake'],
            answer: 1,
            why: 'Hot weather increases both swimming and ice-cream buying. Correlation does not need a causal link.',
          },
          links: [{ label: 'Spurious correlations (fun examples)', url: 'https://www.tylervigen.com/spurious-correlations' }],
        },
      ],
    },

    /* ------------------------------------------------------------------ 5 */
    {
      id: 'm5', icon: '📈', cat: 'Visualization', title: 'Power BI, Tableau and storytelling',
      goal: 'Choose the right chart, model star schemas, write DAX and Tableau LODs, and tell a clear story with data.',
      lessons: [
        {
          id: 'l5-1', title: 'Choosing the right chart', hours: 4,
          why: 'A good chart makes the insight obvious. A bad one hides it or misleads.',
          learn: [
            'Match the question to the chart: <b>compare</b> → bar, <b>trend over time</b> → line, <b>distribution</b> → histogram or box plot, <b>relationship</b> → scatter, <b>part-to-whole</b> → stacked bar (pie only for 2 or 3 slices).',
            'Bars start at zero. Lines do not have to. A truncated bar axis exaggerates differences.',
            'Reduce clutter: no 3D, light gridlines, direct labels instead of legends, and a title that states the insight.',
            'Colour is for meaning: grey for context and one accent colour for what you want people to see. Check it works for colour-blind readers.',
            'Sort bars by value unless the categories are ordered (like months).',
          ],
          doit: 'Take your monthly revenue analysis and make 3 versions of the same chart: a bad one (pie, 3D, rainbow), the default one and an improved one. Put them side by side with a one-line title stating the insight.',
          ai: {
            title: 'Chart choice and critique',
            text: "My data question: [[QUESTION]]. Data columns: [[COLUMNS]]. Suggest the best 3 chart types, ranked, and when each would be misleading. Then critique my current chart: [[DESCRIBE IT]] against these principles: clarity, honest axes, decluttering, emphasis, colour-blind accessibility.\n{{lang}}",
          },
          quiz: {
            q: 'Which chart best shows a revenue trend over 12 months?',
            options: ['Pie chart', 'Line chart', '3D bar chart', 'Treemap'],
            answer: 1,
            why: 'A line chart makes direction and change over ordered time obvious.',
          },
          links: [{ label: 'From Data to Viz', url: 'https://www.data-to-viz.com' }],
        },
        {
          id: 'l5-2', title: 'Dashboards in Power BI, Tableau or Looker Studio', hours: 5, download: 'retail',
          why: 'Dashboards are how most analytics reaches decision-makers every week.',
          learn: [
            'A dashboard answers a <b>recurring question for a specific audience</b>. Start by writing the 3 to 5 questions and the decision each supports.',
            'Layout: KPIs on top, trends in the middle, breakdowns below, filters at the side or top, and the most important thing top-left.',
            'The workflow is the same in every tool: connect → model (relationships) → measures (calculated fields) → visuals → filters → publish.',
            'Pick <b>one</b> tool and learn it well. Power BI is very common in Europe and Microsoft shops, Tableau in analytics teams, Looker Studio is free and web-based. Check job ads in your market.',
          ],
          doit: 'Build a one-page dashboard from the café CSV: 3 KPI cards (revenue, orders, average order value), revenue by month, revenue by category and a city filter. Write the question each visual answers. Test: can someone understand it in 30 seconds?',
          ai: {
            title: 'Design my dashboard',
            text: "I'm building a dashboard for [[AUDIENCE]] to decide [[DECISION]]. Available data columns: [[COLUMNS]]. Propose: 1) the 5 KPIs that matter, 2) a layout (what goes where), 3) the filters, 4) the calculated measures I need, written in [[Power BI DAX / Tableau calculated field / Looker Studio]], 5) common mistakes to avoid.\n{{lang}}",
          },
          quiz: {
            q: 'What is the first step when designing a dashboard?',
            options: ['Pick a colour palette, fonts and a layout that match the company brand', 'Define the audience, their questions and the decisions they make', 'Add as many charts as possible so nothing is left out', 'Choose a ready-made template from the BI tool gallery'],
            answer: 1,
            why: 'Design follows purpose. Without a decision in mind, a dashboard becomes decoration.',
          },
          links: [
            { label: 'Tableau Public (free)', url: 'https://public.tableau.com' },
            { label: 'Looker Studio (free)', url: 'https://lookerstudio.google.com' },
            { label: 'Power BI', url: 'https://powerbi.microsoft.com' },
          ],
        },
        {
          id: 'l5-3', title: 'Data storytelling', hours: 4,
          why: 'Insight that nobody understands changes nothing. Storytelling is what turns analysis into action.',
          learn: [
            'Structure: <b>context → insight → so what → recommendation</b>. Start with the answer, then support it.',
            'Know your audience: executives want the decision and the risk, peers want method and caveats. Make two versions if needed.',
            'One slide, one message: the title is the message ("Delivery grew 40% but cost us margin").',
            'Show the uncertainty and limitations in one honest line. It builds trust.',
            'Rehearse a 2-minute spoken version without slides.',
          ],
          doit: 'Turn your mini-analysis into a 3-slide story: (1) the answer, (2) the evidence (1 or 2 charts), (3) recommendation, risks and next steps. Present it in 2 minutes to an AI or a friend and ask for feedback.',
          ai: {
            title: 'Presentation coach',
            text: "Be my presentation coach. I'll give you my 3 slides (text only) and my audience: [[AUDIENCE]]. Check: is the answer first? Is each title a message? What is missing for the audience to act? Which 2 questions will they ask? Then rewrite the opening 30 seconds I would say aloud.\n\nSlides:\n[[PASTE SLIDES TEXT]]\n{{lang}}",
          },
          quiz: {
            q: 'Where should the conclusion go in a business presentation?',
            options: ['At the very end, after all the detail', 'At the start, followed by the evidence', 'Nowhere: let the audience decide', 'Only in the appendix'],
            answer: 1,
            why: 'Busy people need the answer first. The evidence is there to back it up.',
          },
          links: [{ label: 'Storytelling with Data', url: 'https://www.storytellingwithdata.com' }],
        },
        {
          id: 'l5-4', title: 'Power BI Deep Dive: Star Schema Data Modeling & Relationships', hours: 5, download: 'retail', concept: 'join',
          why: '90% of slow, broken DAX formulas are actually data-model problems. A clean Star Schema makes DAX simple and fast.',
          learn: [
            'A <b>Star Schema</b> separates <b>Fact tables</b> (events/transactions: <code>Orders</code>, <code>Order_Items</code>, many rows, numeric amounts and foreign keys) from <b>Dimension tables</b> (who/what/where/when: <code>Customers</code>, <code>Products</code>, <code>Stores</code>, <code>Calendar</code>, unique primary keys).',
            'Connect dimensions to facts with <b>1-to-many (1:*) single-direction relationships</b> so filters flow downhill from Dimension → Fact.',
            'Create a dedicated <b>Calendar (Date) table</b> with continuous dates, Year, Quarter, MonthName and MonthNumber, and click <b>Mark as date table</b>.',
            'Hide foreign keys on the fact table in Report View so users filter by Dimension columns instead of Fact keys.',
          ],
          code: {
            lang: 'dax', title: 'Power BI Calendar table in DAX',
            text: 'Calendar = \nADDCOLUMNS (\n    CALENDARAUTO(),\n    "Year", YEAR ( [Date] ),\n    "MonthNum", MONTH ( [Date] ),\n    "Month", FORMAT ( [Date], "yyyy-mm" ),\n    "Quarter", "Q" & FORMAT ( [Date], "q" )\n)',
          },
          doit: 'In Power BI Desktop, load the café dataset split into <code>Stores</code>, <code>Products</code>, <code>Customers</code> and <code>Sales</code> (or build the dimensions in Power Query via Remove Duplicates). Create a DAX <code>Calendar</code> table, connect all four dimensions 1:* to <code>Sales</code> in Model View, and verify that slicing by <code>Calendar[Month]</code> and <code>Stores[city]</code> filters revenue properly.',
          ai: {
            title: 'Turn my flat table into a Power BI Star Schema',
            text: "I have a flat dataset with these columns:\n[[PASTE COLUMNS]]\n\nShow me how to split it into Fact and Dimension tables for a Power BI Star Schema: 1) which tables to create and their primary keys, 2) the 1:* relationships and filter directions, 3) how to sort Month names chronologically using Sort By Column.\n{{lang}}",
          },
          quiz: {
            q: 'In a Power BI Star Schema, how should relationships between Dimension and Fact tables be set up?',
            options: ['One-to-many (1:*) from Dimension to Fact, with single-direction filtering', 'Many-to-many (*:*) between all tables, with bi-directional filtering on', 'One-to-one (1:1) from the Fact table directly to another Fact table', 'No relationships in the model: use VLOOKUP-style calculated columns instead'],
            answer: 0,
            why: '1:* single-direction relationships from dimensions to facts avoid ambiguous filter paths and keep DAX fast.',
          },
          links: [{ label: 'Microsoft Learn: Understand star schema in Power BI', url: 'https://learn.microsoft.com/en-us/power-bi/guidance/star-schema' }],
        },
        {
          id: 'l5-5', title: 'Power BI DAX Mastery: CALCULATE, Filter Context & Time Intelligence', hours: 5.5, download: 'retail',
          why: 'DAX is the formula language of Power BI, Excel Power Pivot and Analysis Services. Understanding Filter Context is the key to mastering it.',
          learn: [
            'Write <b>explicit measures</b> (<code>Total Revenue = SUM(Sales[revenue])</code>) instead of relying on implicit drag-and-drop sums, and use <code>DIVIDE(num, den)</code> to handle division by zero safely.',
            '<b>Row context</b> iterates row by row (calculated columns and <code>SUMX</code>); <b>Filter context</b> is the set of active slicers, rows and columns filtering a visual.',
            '<code>CALCULATE(expression, filter1, …)</code> is the most important function in DAX: it evaluates a measure inside a modified filter context.',
            'Use <code>ALL(TableOrCol)</code> inside <code>CALCULATE</code> to remove filters and compute <b>% of Grand Total</b>, and use Time Intelligence (<code>TOTALYTD</code>, <code>SAMEPERIODLASTYEAR</code>, <code>DATEADD</code>) for YoY growth.',
          ],
          code: {
            lang: 'dax', title: 'Essential DAX measures every analyst writes',
            text: 'Total Revenue = SUMX ( Sales, Sales[qty] * Sales[unit_price] )\n\nRevenue % of All Stores = \nDIVIDE (\n    [Total Revenue],\n    CALCULATE ( [Total Revenue], ALL ( Stores ) )\n)\n\nRevenue YoY % = \nVAR CurrRev = [Total Revenue]\nVAR PrevRev = CALCULATE ( [Total Revenue], SAMEPERIODLASTYEAR ( \'Calendar\'[Date] ) )\nRETURN DIVIDE ( CurrRev - PrevRev, PrevRev )',
          },
          doit: 'Add five explicit DAX measures to your Power BI café model: <code>Total Revenue</code>, <code>Total Orders</code> (<code>DISTINCTCOUNT</code>), <code>Avg Order Value</code> (<code>DIVIDE</code>), <code>Category Share %</code> (using <code>CALCULATE</code> + <code>ALL</code>), and <code>Month-over-Month Growth %</code> (using <code>DATEADD(\'Calendar\'[Date], -1, MONTH)</code>).',
          ai: {
            title: 'Write and explain a DAX measure (Filter vs Row Context)',
            text: "My Power BI model has Fact table [[FACT]] and Dimensions [[DIMENSIONS]].\nI need a DAX measure for: [[DESCRIBE METRIC, e.g. % of total, rolling 3-month average, returning customers]].\nWrite the DAX using VAR / RETURN, explain how Filter Context and CALCULATE work step by step, and tell me how to test that the total row of a matrix visual is right.\n{{lang}}",
          },
          quiz: {
            q: 'What does CALCULATE([Total Revenue], ALL(Products[Category])) return in a matrix visual?',
            options: ['Total revenue across all product categories, ignoring the category row filter', 'Zero on every single detail row except the Grand Total row at the bottom', 'The average revenue per product category across the whole published report', 'An error, because ALL() is restricted to Power Query M and cannot run in DAX'],
            answer: 0,
            why: 'ALL(Products[Category]) strips the filter on Category so you can divide row revenue by total revenue.',
          },
          links: [{ label: 'SQLBI: DAX Guide', url: 'https://dax.guide' }],
        },
        {
          id: 'l5-6', title: 'Tableau Deep Dive: Blue vs Green Pills, Table Calculations & Parameters', hours: 5, download: 'retail',
          why: 'Once you understand how Tableau thinks about Discrete (blue) vs Continuous (green) fields, you can build any visual in minutes.',
          learn: [
            '<b>Dimensions</b> slice and group the data (headers); <b>Measures</b> are aggregated (<code>SUM</code>, <code>AVG</code>, <code>COUNTD</code>).',
            '<b>Blue pills (Discrete)</b> create distinct headers and sortable categories; <b>Green pills (Continuous)</b> draw continuous numeric or date axes and colour gradients.',
            '<b>Quick Table Calculations</b> compute on the visual\'s table after aggregation: Running Total, Percent of Total, Difference, Rank and Moving Average. Check <b>Compute Using</b> (Table Across vs Pane Down).',
            '<b>Parameters</b> let the viewer dynamically switch the metric shown (e.g. Revenue vs Orders vs Margin) or adjust a top-N threshold across the whole dashboard.',
          ],
          code: {
            lang: 'sql', title: 'Tableau Calculated Fields & Parameter switcher',
            text: '// Dynamic Metric Switcher (linked to [Choose Metric] parameter)\nCASE [Choose Metric]\n  WHEN "Revenue" THEN SUM([qty] * [unit_price])\n  WHEN "Orders"  THEN COUNTD([order_id])\n  WHEN "AOV"     THEN SUM([qty] * [unit_price]) / COUNTD([order_id])\nEND\n\n// YoY Difference Table Calculation\n(ZN(SUM([Revenue])) - LOOKUP(ZN(SUM([Revenue])), -12)) / ABS(LOOKUP(ZN(SUM([Revenue])), -12))',
          },
          doit: 'In Tableau Public (free), load the café CSV. 1) Build a monthly trend using a Continuous (green) Month date axis. 2) Add a Quick Table Calculation for Running Total and Moving Average. 3) Create a string Parameter <code>Select Metric</code> ("Revenue", "Orders", "AOV") and a calculated field so one chart switches metrics on click.',
          ai: {
            title: 'Tableau calculated field & Table Calculation helper',
            text: "I'm building a view in Tableau with [[ROWS / COLUMNS / MARKS]].\nI want to calculate: [[YOUR GOAL]].\nTell me: 1) whether to use a basic calculated field, a Table Calculation or an LOD expression, 2) the exact formula, 3) how to set 'Compute Using' (addressing and partitioning) so the numbers are accurate.\n{{lang}}",
          },
          quiz: {
            q: 'In Tableau, what is the difference between a blue pill (Discrete) and a green pill (Continuous)?',
            options: ['Blue pills create distinct headers; green pills draw a continuous axis', 'Blue pills come from local CSV files; green pills come from SQL databases', 'Blue pills can only go on Rows; green pills can only go on the Marks card', 'Blue pills are raw database fields; green pills are table calculations only'],
            answer: 0,
            why: 'Discrete (blue) values are separate items with headers; Continuous (green) values form an unbroken axis.',
          },
          links: [{ label: 'Tableau Public (free)', url: 'https://public.tableau.com' }],
        },
        {
          id: 'l5-7', title: 'Tableau LOD Expressions (FIXED, INCLUDE, EXCLUDE) & Dashboard Actions', hours: 5, download: 'retail',
          why: 'Level of Detail (LOD) expressions let you compute at any granularity—like customer cohort dates—regardless of what is on the chart.',
          learn: [
            '<code>{ FIXED [customer_id] : MIN([order_date]) }</code> computes each customer\'s first order date at the customer grain, even on a monthly summary chart.',
            '<code>INCLUDE</code> computes at a finer grain than the view (e.g. average of customer totals per store); <code>EXCLUDE</code> omits a dimension from the view to compute a parent total.',
            '<b>Tableau\'s Order of Operations</b>: Context Filters (grey pills) run <b>before</b> <code>FIXED</code> LODs, while regular Dimension Filters (blue pills) run <b>after</b> <code>FIXED</code> LODs.',
            'Use <b>Dashboard Filter and Highlight Actions</b> so clicking a store bar filters the trend line and product breakdown below it.',
          ],
          code: {
            lang: 'sql', title: 'Classic Tableau LOD expressions',
            text: '// Customer First Order Date (Cohort)\n{ FIXED [customer_id] : MIN([order_date]) }\n\n// Is Repeat Customer?\n{ FIXED [customer_id] : COUNTD([order_id]) } > 1\n\n// Store Share of Overall Revenue (ignoring Store filter if not in Context)\nSUM([Revenue]) / SUM({ FIXED : SUM([Revenue]) })',
          },
          doit: 'In Tableau, write a <code>FIXED</code> LOD for <code>First Order Date</code> per customer, then build a stacked bar chart of monthly revenue split by New vs. Returning customers. Add a Store filter and test what happens to a <code>{ FIXED : SUM([Revenue]) }</code> calculation before and after clicking "Add to Context" on the filter.',
          ai: {
            title: 'Master Tableau LODs and Order of Operations',
            text: "Explain how to solve this in Tableau using a Level of Detail (LOD) expression: [[DESCRIBE QUESTION, e.g. customer lifetime value, cohort retention, % of parent category]].\nWrite the { FIXED / INCLUDE / EXCLUDE } formula, explain why it works at a different grain than the chart, and warn me if any filter needs 'Add to Context'.\n{{lang}}",
          },
          quiz: {
            q: 'In Tableau, a dimension filter is NOT affecting your { FIXED ... } LOD result. How do you make the filter apply before the FIXED LOD?',
            options: ['Right-click the filter pill and select Add to Context', 'Change the pill colour from Discrete blue to Continuous green', 'Move the dimension from the Filters shelf onto the Tooltip card', 'Replace the FIXED keyword with the TABLE_AVG() calculation'],
            answer: 0,
            why: 'In Tableau\'s Order of Operations, Context Filters execute before FIXED LOD expressions.',
          },
          links: [{ label: 'Tableau: Top 15 LOD Expressions', url: 'https://www.tableau.com/blog/LOD-expressions' }],
        },
      ],
    },

    /* ------------------------------------------------------------------ 6 */
    {
      id: 'm6', icon: '🤖', cat: 'AI workflow', title: 'AI-powered analysis',
      goal: 'Use AI to move faster and still produce analysis you can defend.',
      lessons: [
        {
          id: 'l6-1', title: 'Prompt patterns for analysis', hours: 3, lab: 'auto',
          why: 'The quality of AI help is mostly the quality of your question.',
          learn: [
            'A strong analysis prompt has a <b>role</b>, the <b>context</b> (business question and your background), a <b>data description</b> (the schema, not the data), the <b>task</b>, <b>constraints</b> (tool, dialect, assumptions) and the <b>output format</b>.',
            'Give the schema and 3 to 5 <i>anonymised</i> sample rows. The model can then write SQL or pandas that fits your real columns.',
            'Work <b>iteratively</b>: ask for a plan first, then code step by step, then a review.',
            'Ask the model to <b>state its assumptions</b> and list what could go wrong.',
            'Ask for explanations so that you can defend every line in an interview.',
          ],
          doit: 'Take a SQLab challenge you have not solved yet. Write a prompt with the structure below (SQLab can copy the schema for you) and run what the AI gives you in the lab: does it pass? Compare with a vague "write me a query" prompt.',
          ai: {
            title: 'The full analysis prompt',
            text: "ROLE: You are a senior data analyst helping a junior (me). My background: {{bg}}.\nCONTEXT: [[BUSINESS QUESTION AND WHO WILL USE THE ANSWER]]\nDATA: tables and columns (no real data):\n[[SCHEMA]]\nTASK: [[WHAT I WANT]]\nCONSTRAINTS: use [[SQLite / PostgreSQL / pandas]]; state your assumptions.\nOUTPUT: first a 3-step plan, then the code, then how I can verify the result.\n{{lang}}",
          },
          quiz: {
            q: 'Which input makes AI-generated SQL most reliable?',
            options: ['A general description of the goal, so the AI can be creative', 'The exact schema (tables, columns, keys) and a precise question', 'Only the business question, so the AI is not distracted by detail', 'A few hundred rows of the real customer data, pasted in'],
            answer: 1,
            why: 'With the schema the model does not have to guess names and relationships. Real personal data should never be pasted.',
          },
          links: [],
        },
        {
          id: 'l6-2', title: 'Verify AI output', hours: 4, lab: 'auto',
          why: 'This one habit separates analysts who use AI from analysts who are replaced by it.',
          learn: [
            'AI can produce confident, plausible and <b>wrong</b> analysis: invented columns, wrong joins, off-by-one dates, misstated statistics.',
            'Checklist: (1) Does it run on <i>your</i> data? (2) Row counts before and after each step. (3) Totals reconcile with an independent source (a pivot, a raw SUM). (4) Spot-check 3 rows by hand. (5) Edge cases: NULLs, duplicates, ties, time zones. (6) Does the number pass the smell test?',
            'Ask for a <b>second pass</b>: "review this code for bugs and wrong assumptions", or use another model.',
            'Keep a record: prompt, code and the check you performed. That is your reproducibility trail.',
            'Never paste personal or confidential data. Use synthetic or anonymised extracts, or tools your employer has approved.',
          ],
          doit: 'Ask AI for the "top 5 customers by total spend" query on the café data <i>without</i> giving it the schema, so it must guess. Run it: what goes wrong? Now give it the schema and verify the result against the lab\'s checker and by hand for 2 customers.',
          ai: {
            title: 'Sceptical reviewer',
            text: "Review the analysis below as a sceptical reviewer. List: (1) logical or code errors, (2) hidden assumptions, (3) edge cases not handled (NULLs, duplicates, ties, dates), (4) checks I should run to verify the totals independently, (5) anything stated as fact without evidence.\n\n[[PASTE QUERY / CODE AND RESULT]]\n{{lang}}",
          },
          quiz: {
            q: 'The fastest reliable check on an AI-written aggregation query?',
            options: ['Trust it once it runs without errors and the number looks plausible', 'Reconcile the total with an independent calculation and check row counts', 'Ask the same AI to review its own query carefully and confirm it is right', 'Check that the column names and the number formatting look tidy'],
            answer: 1,
            why: 'An independent calculation does not share the AI\'s blind spots. Asking the same AI is not independent.',
          },
          links: [],
        },
        {
          id: 'l6-3', title: 'AI for messy text and automation', hours: 4,
          why: 'Free text (reviews, tickets, survey comments) used to be unusable at scale. Now it is one of the best uses of AI.',
          learn: [
            'AI beats classical tools on messy text: <b>classify, tag themes, extract fields, summarise</b>.',
            'Pattern: define the <b>categories</b> and output format, test on 20 rows you labelled yourself, measure agreement, then run on everything.',
            'Always measure accuracy against a human-labelled sample, and report it.',
            'Mind cost and privacy: use approved tools, strip personal information and batch the work.',
            'Use AI for chores too: writing regex, converting formats, drafting documentation, generating test data.',
          ],
          doit: 'Take 30 short reviews (write them or use a public dataset). Label them yourself (positive / neutral / negative and a theme), ask the AI to label the same and compute the agreement. Where does it disagree, and why?',
          ai: {
            title: 'Classify comments into categories',
            text: "Classify each of the following customer comments. Categories: [[LIST YOUR CATEGORIES]]. For each comment return: id, category, sentiment (positive / neutral / negative) and a one-sentence reason. If it does not fit, return 'other' and say why. Return a table.\n\n[[PASTE 20 COMMENTS]]\n{{lang}}",
          },
          quiz: {
            q: 'Before running AI classification on 10,000 comments you should…',
            options: ['Run it on all the comments at once and read the summary it writes', 'Test on a small human-labelled sample and measure the agreement', 'Ask the AI to rate its own confidence and keep the high ones', 'Use only the first 10 comments, since they show the pattern'],
            answer: 1,
            why: 'You need evidence that the labels are good enough before you build conclusions on them.',
          },
          links: [{ label: 'NotebookLM: ask questions about your own documents', url: 'https://notebooklm.google.com' }],
        },
      ],
    },

    /* ------------------------------------------------------------------ 7 */
    {
      id: 'm7', icon: '🧩', cat: 'Portfolio', title: 'Portfolio projects',
      goal: 'Build and publish 3 projects that prove you can do the job.',
      lessons: [
        {
          id: 'l7-1', title: 'Plan a portfolio from your background', hours: 4, showProjects: true,
          why: 'Projects are your proof. Projects from your own field are proof nobody else can copy.',
          learn: [
            'A portfolio is <b>3 projects</b>, not 15. Each tells a story: question → data → method → findings → recommendation → limitations.',
            'Choose <b>domain-flavoured projects</b>: they show you understand the business and give you something unique to talk about.',
            'Cover the stack across projects: one SQL-heavy, one Python and statistics, one dashboard.',
            'Use public datasets (Kaggle, government portals, Our World in Data) or your own data if it is anonymised or synthetic.',
            'Write for a hiring manager who spends 2 minutes: the headline finding must be visible immediately.',
          ],
          doit: 'Choose your 3 projects (use the ideas for your background). For each: the question, the dataset (link), the tools, a one-sentence expected insight and a deadline.',
          ai: {
            title: 'Plan 3 portfolio projects',
            text: "Help me plan a data-analyst portfolio. My background: {{bg}}. Target role: [[TARGET ROLE / INDUSTRY]]. Propose 3 projects (one SQL-focused, one Python and statistics, one dashboard), each with: a business question, 2 candidate public datasets from well-known sources, the steps, the deliverable and the skill it proves. Make each doable in about 15 hours.\n{{lang}}",
          },
          quiz: {
            q: 'How many portfolio projects are ideal at the start?',
            options: ['15 or more small ones, to show range', 'About 3 polished ones that tell a story', 'One huge project, even if it is unfinished', 'None: a few certificates are enough at first'],
            answer: 1,
            why: 'Quality and clarity beat quantity. Reviewers rarely open more than three.',
          },
          links: [
            { label: 'Kaggle datasets', url: 'https://www.kaggle.com/datasets' },
            { label: 'Our World in Data', url: 'https://ourworldindata.org' },
            { label: 'Google Dataset Search', url: 'https://datasetsearch.research.google.com' },
            { label: 'EU Open Data Portal', url: 'https://data.europa.eu' },
          ],
        },
        {
          id: 'l7-2', title: 'Build a project end to end', hours: 15,
          why: 'Finishing one project teaches more than starting ten.',
          learn: [
            'Follow the loop: <b>question → data → clean → explore → analyse → communicate</b>. Keep a README and update it as you go.',
            'Define the <b>success criterion</b> up front: "which factor best explains X?" or "what should we do about Y?".',
            'Document cleaning decisions and assumptions. Show failed attempts briefly, which demonstrates judgement.',
            'Use AI as a pair-programmer but be able to explain every line. Add a section "How I used AI and how I verified it": employers increasingly like it.',
            'Finish with one clear chart, 3 findings, 1 recommendation, 2 limitations and next steps.',
          ],
          code: { lang: 'markdown', title: 'README template', text: '# Project title: the one-line insight\n\n## Question\nWho needs the answer and what decision will it support?\n\n## Data\nSource, size, period, licence, known problems.\n\n## Method\nTools (SQL / Python / BI), key steps, assumptions.\n\n## Findings\n1. …\n2. …\n3. …\n\n## Recommendation\nWhat should the reader do?\n\n## Limitations and next steps\n\n## How I used AI and how I verified it\n\n## Reproduce it\nFiles, environment, order to run.' },
          doit: 'Build project #1 from your plan. Time-box it to two weekends and commit to GitHub as you go. At the end, run the "verify AI output" checklist on your main numbers.',
          ai: {
            title: 'Review my README as a hiring manager',
            text: "Review my project README and notebook structure as a hiring manager for a junior data-analyst role. What is strong, what is missing, what would make you stop reading? Give me a prioritised list of 5 fixes.\n\n[[PASTE README]]\n{{lang}}",
          },
          quiz: {
            q: 'What should every portfolio project end with?',
            options: ['A complete list of the libraries and versions used', 'A clear recommendation, with its limitations', 'A link to download the full raw data set', 'A summary of every chart that appears in it'],
            answer: 1,
            why: 'Analysts exist to support decisions, so show that you can reach one and know its limits.',
          },
          links: [],
        },
        {
          id: 'l7-3', title: 'Publish and present', hours: 5,
          why: 'A finished project nobody can find or understand is invisible.',
          learn: [
            'Put code and README on <b>GitHub</b>. Add a one-page summary with the key chart at the top and pin your best 3 repositories.',
            'Optional: a simple portfolio page (GitHub Pages, Notion, or Tableau Public for dashboards) linking to the 3 projects.',
            'Record a 2 to 3 minute walkthrough. Explaining your work out loud is the best interview prep.',
            'Share on LinkedIn with the insight as the first sentence, not "I finished a course".',
            'Do not publish confidential or personal data.',
          ],
          doit: 'Publish project #1. Ask 2 people (one technical, one not) to read the summary and tell you the main finding in their own words. If they cannot, rewrite it.',
          ai: {
            title: 'Write the LinkedIn post',
            text: "Write a LinkedIn post of about 120 words about this project for a non-technical audience. First sentence = the insight. Then 2 sentences on the method, 1 on a limitation and a question for the readers. No buzzwords.\n\nProject summary:\n[[PASTE SUMMARY]]\n{{lang}}",
          },
          quiz: {
            q: 'What is the best first sentence of a project post?',
            options: ['"I completed a course"', 'The key finding', 'The list of tools', '"Please hire me"'],
            answer: 1,
            why: 'People scroll fast. Lead with what you found.',
          },
          links: [{ label: 'GitHub Pages', url: 'https://pages.github.com' }],
        },
      ],
    },

    /* ------------------------------------------------------------------ 8 */
    {
      id: 'm8', icon: '🎯', cat: 'Career', title: 'Getting the job',
      goal: 'Turn your background into an analyst story, pass the interviews and land the first role.',
      lessons: [
        {
          id: 'l8-1', title: 'Translate your background into analyst language', hours: 5, showResume: true,
          why: 'You are not starting from zero. You are changing the language you describe your experience in.',
          learn: [
            'Recruiters read a CV in about 30 seconds. Lead with a <b>headline</b>: "Data analyst in training | [your field] background | SQL · Python · Power BI".',
            'Rewrite old experience as <b>action → data or tools → result with a number</b>.',
            'If you are changing career, put <b>projects above education</b> and link your GitHub.',
            'Keywords from job ads matter (applicant tracking systems), but stay truthful.',
            'Your story: "I have spent N years in [field] making decisions with imperfect data. Now I do it full time."',
          ],
          doit: 'Rewrite 5 bullets from your CV with the pattern above. Make a one-page CV. Write your 30-second "why I am changing" story.',
          ai: {
            title: 'Rewrite my CV bullets',
            text: "Rewrite my CV bullets for a data-analyst application. Pattern: action verb + what data or tools + result with a number. Don't invent numbers: where I haven't given one, add a [?] placeholder and ask me. My background: {{bg}}.\n\nTarget job ad:\n[[PASTE JOB AD]]\n\nMy current bullets:\n[[PASTE BULLETS]]\n{{lang}}",
          },
          quiz: {
            q: 'Which is the best CV bullet for a career changer?',
            options: ['Responsible for weekly sales reporting and various data tasks across all of the company stores', 'Built a weekly sales report in Excel for 5 stores; cut preparation time from 4 h to 30 min', 'Strong team player with excellent communication skills and attention to detail', 'Hardworking, motivated professional with a real passion for data and Excel'],
            answer: 1,
            why: 'It has an action, a tool, scale and a measurable result.',
          },
          links: [],
        },
        {
          id: 'l8-2', title: 'Interview preparation', hours: 6, lab: 'auto',
          why: 'Analyst interviews are predictable. Practice makes them easy.',
          learn: [
            'Typical rounds: recruiter screen → technical (SQL, spreadsheet or Python, live) → case or take-home → stakeholder interview.',
            'SQL questions: JOINs, GROUP BY / HAVING, window functions, NULL handling, finding duplicates, second-highest value, month-over-month change.',
            'Statistics questions: mean vs. median, p-values, A/B test design, correlation vs. causation, sample size.',
            'Case questions ("sales dropped 10%, how do you investigate?"): clarify the metric → segment (time, region, product, channel) → check data quality → hypotheses → recommendation.',
            'Behavioural: tell stories with STAR (situation, task, action, result), including a data mistake and what you learned.',
          ],
          doit: 'Do a 30-minute mock interview with AI: 3 SQL, 2 statistics, 1 case and 1 behavioural question. Add your weak topics to your error log and drill them in SQLab.',
          ai: {
            title: 'Run a mock interview',
            text: "Run a realistic data-analyst interview for me for a junior role in [[INDUSTRY]]. My background: {{bg}}. Ask one question at a time: 3 SQL (on a schema you give me), 2 statistics, 1 business case and 1 behavioural. Wait for my answer before continuing. After each answer, grade it 1 to 5, say what a strong answer includes, then move on. At the end, summarise my weak topics and give me a 1-week study plan.\n{{lang}}",
          },
          quiz: {
            q: 'In a case question "sales dropped 10%", what is the first step?',
            options: ['Propose a discount campaign right away to win the lost sales back', 'Clarify the metric and time frame, then segment it and check the data quality', 'Ask which team was responsible for the drop and review their recent decisions', 'Ask for a bigger budget so you can run a full market study first'],
            answer: 1,
            why: 'Structure first, solutions last. It shows how you think.',
          },
          links: [],
        },
        {
          id: 'l8-3', title: 'Apply, network and your first 90 days', hours: 5,
          why: 'Skills get you interviews only if the right people see them.',
          learn: [
            'Apply in <b>batches</b> with tailored CVs: 5 good applications beat 50 random ones. Track them in a sheet (you are an analyst: analyse your own funnel).',
            '<b>Networking</b> works: message analysts in your target industry, ask for 15 minutes about their work, not for a job.',
            'Look for hybrid roles: "analyst in [your domain]" (sports analyst, clinical data analyst, operations analyst).',
            'First 90 days: learn the data and the business, deliver one small win quickly, document your work, ask many questions.',
            'Keep a learning routine: 1 hour a day, one new skill per quarter.',
          ],
          doit: 'Build your application tracker (company, role, date, status, what you learned). Send 5 networking messages. Write your 90-day learning plan.',
          ai: {
            title: 'Networking messages',
            text: "Write 3 short LinkedIn messages (under 70 words) to analysts at [[COMPANY / INDUSTRY]], asking for a 15-minute chat about their work. My background: {{bg}}. They must be specific, humble and not ask for a job. Then write a follow-up thank-you note template.\n{{lang}}",
          },
          quiz: {
            q: 'What is the best use of a networking message?',
            options: ['Ask directly whether they have a job opening for you', 'Ask for a short conversation about their work and path', 'Send your CV with no message and let it speak for itself', 'Offer to work for free for a month to prove what you can do'],
            answer: 1,
            why: 'People like to share their story, and conversations create referrals.',
          },
          links: [],
        },
      ],
    },
  ];

  // Flat list with back-references, used by the router and the progress bar.
  DA.lessons = [];
  DA.lessonById = {};
  DA.modules.forEach(function (m, mi) {
    m.lessons.forEach(function (l, li) {
      l.module = m;
      l.index = DA.lessons.length;
      l.number = (mi + 1) + '.' + (li + 1);
      DA.lessons.push(l);
      DA.lessonById[l.id] = l;
    });
  });
  DA.totalHours = DA.lessons.reduce(function (s, l) { return s + l.hours; }, 0);
})();
