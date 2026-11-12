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
      id: 'm1', icon: '📊', cat: 'Spreadsheets', title: 'Spreadsheets and tidy data',
      goal: 'Clean a messy file and answer a question with formulas and a pivot table.',
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
      id: 'm3', icon: '🐍', cat: 'Python', title: 'Python and pandas',
      goal: 'Load, clean, summarise and plot data in a notebook, with AI as your pair-programmer.',
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
      id: 'm5', icon: '📈', cat: 'Visualization', title: 'Visualisation and dashboards',
      goal: 'Choose the right chart, build a clear dashboard and tell a story with data.',
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
