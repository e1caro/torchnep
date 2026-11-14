/* The Dot & Co. journey: chapter story, mission briefs, the lab levels each mission practises, and the chapter boss cases. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  DA.cast = {
    lena: { icon: '👩‍💼', name: 'Lena', role: 'Founder' },
    rosa: { icon: '🧑‍🍳', name: 'Rosa', role: 'Operations' },
    ana: { icon: '💼', name: 'Ana', role: 'Finance' },
    theo: { icon: '📣', name: 'Theo', role: 'Marketing' },
    sam: { icon: '🎧', name: 'Sam', role: 'Support' },
    kai: { icon: '📱', name: 'Kai', role: 'App product' },
    dot: { icon: '🔵', name: 'Dot', role: 'Your guide' },
  };

  DA.chapters = {
    m0: 'First week at Dot & Co.: meet the team and set up how you will work.',
    m1: 'The spreadsheet backlog lands on your desk.',
    m2: 'You get the keys to the sales database.',
    m3: 'The weekly report learns to build itself.',
    m4: 'Everyone has a theory. You find out what really worked.',
    m5: 'The board wants one dashboard they can trust.',
    m6: 'An AI assistant joins the team, and someone has to check its work.',
    m7: 'You turn your work into a case study of your own.',
    m8: 'Interview day, and the plan for your first 90 days.',
  };

  // who: a DA.cast key. try: "lab level level; lab level", where a level is "world-level"; the first three levels are the main Try targets.
  DA.missionData = {
    'l0-1': { who: 'lena', brief: 'Welcome to Dot & Co.! Before you open a single file, spend your first morning finding out what people here actually need from data.' },
    'l0-2': { who: 'dot', brief: 'The team uses an AI assistant for almost everything. Set up your own AI tutor so it speeds you up without doing your thinking for you.' },
    'l0-3': { who: 'lena', brief: 'Where do you want to be in six months? Write down your goal and your starting point, so we can both see how far you have come.' },
    'l1-1': { who: 'rosa', brief: 'The store managers send their orders in five different formats. Can you turn this mess into one clean table I can trust?', try: 'sheets 2-1 2-2 2-3' },
    'l1-2': { who: 'ana', brief: 'I need revenue by store and by product every week. Show me how to get it from the order sheet without copying numbers by hand.', try: 'sheets 1-1 1-2 3-1 4-1' },
    'l1-3': { who: 'rosa', brief: 'Which store sold the most last month, and why? One page, three numbers, one chart.', try: 'sheets 3-3 3-4 7-1 4-4 7-2' },
    'l1-4': { who: 'ana', brief: 'My lookup formulas break every time someone adds a column to the price sheet. Can you make them sturdy?', try: 'sheets 4-2 4-3' },
    'l1-5': { who: 'rosa', brief: 'Every Monday I clean the same export by hand. Build me a clean-up I can refresh with one click.', try: 'sheets 2-4 6-1 6-2 6-3' },
    'l1-6': { who: 'theo', brief: 'Our campaign tracker lives in Google Sheets. I want a summary tab that keeps itself up to date.', try: 'sheets 5-1 5-2 7-4' },
    'l1-7': { who: 'ana', brief: 'What happens to our margin if coffee beans cost 10% more? Build a model I can play with, and make it warn me when an input looks wrong.', try: 'sheets 1-3 5-3 8-1 1-4 3-2 5-4 8-2' },
    'l2-1': { who: 'kai', brief: 'You now have read access to the sales database. Start with a simple one: which products cost more than 4.00?', try: 'sql 1-1 1-2' },
    'l2-2': { who: 'ana', brief: 'I want monthly totals per store straight from the database, not from a spreadsheet someone emailed me.', try: 'sql 1-3 1-4' },
    'l2-3': { who: 'rosa', brief: 'Orders, stores and products live in different tables. Put them together, and make sure the totals do not quietly double.', try: 'sql 2-1 2-2 5-3' },
    'l2-4': { who: 'theo', brief: 'Rank our products inside each category, and show me the running total of sales over the year.', try: 'sql 3-1 3-3 4-1 3-2 3-4 4-2' },
    'l3-1': { who: 'kai', brief: 'The weekly report takes me a whole afternoon. Let us see if Python can read the data and give the same numbers in seconds.', try: 'python 1-1 1-3 1-4 1-2' },
    'l3-2': { who: 'sam', brief: 'Our exports have empty fields, odd spellings and numbers stored as text. Clean them in code, so the clean-up can be repeated.', try: 'python 4-1 4-2 2-3' },
    'l3-3': { who: 'rosa', brief: 'Combine the store list with the sales data, and give me the numbers for each region side by side.', try: 'python 4-3 5-1 5-2 5-3' },
    'l3-4': { who: 'ana', brief: 'I need each store\'s numbers summarised by group, sorted, and back in one tidy table I can paste into my report.', try: 'python 2-1 3-1 3-2 2-2 2-4 3-3 3-4 5-4' },
    'l3-5': { who: 'theo', brief: 'Which customers are loyal, which are slipping away, and how does each month\'s new group behave over time?', try: 'python 4-4 6-1 6-2 6-3' },
    'l3-6': { who: 'lena', brief: 'The board meets next week. Turn your findings into charts that someone can read in five seconds.', try: 'python 6-4' },
    'l3-7': { who: 'kai', brief: 'Make the weekly report build itself: read, clean, summarise and save it, without anyone touching it.', try: 'python 8-1 8-2' },
    'l4-1': { who: 'ana', brief: 'Is a typical order 8.00 or 12.00? The average and the median tell different stories. Which one should I report?' },
    'l4-2': { who: 'theo', brief: 'We surveyed 200 customers. How sure can we be about what all our customers think?' },
    'l4-3': { who: 'theo', brief: 'We tried two versions of the welcome email. Version B looks better, but is the difference real or just luck?', try: 'python 7-1 7-2; sql 8-1' },
    'l4-4': { who: 'rosa', brief: 'Stores with more staff sell more. Should we hire, or is something else going on?' },
    'l5-1': { who: 'lena', brief: 'Every team sends charts in a different style. Help us pick the right chart for each question.' },
    'l5-2': { who: 'ana', brief: 'I want one dashboard for sales, margin and top products that I can filter by store.', try: 'bi 1-1 1-3 4-1 1-2 1-4 4-2' },
    'l5-3': { who: 'lena', brief: 'You have the numbers. Now give me the story: what happened, why, and what we should do about it.', try: 'bi 6-4' },
    'l5-4': { who: 'kai', brief: 'Our BI model is one giant table, and it is slow and confusing. Design something cleaner.', try: 'bi 3-1 3-2 8-1 3-3 3-4' },
    'l5-5': { who: 'ana', brief: 'I need measures that respect the filters on the page, plus shares of the total that do not break when I slice by store.', try: 'bi 2-1 2-2 5-1 2-4 2-3 5-2 5-3 5-4' },
    'l5-6': { who: 'theo', brief: 'Marketing works in Tableau. Show me calculated fields I can trust, and dates I can group the way I like.', try: 'bi 4-4 7-1 7-3' },
    'l5-7': { who: 'theo', brief: 'What is each customer\'s total, whatever filter is on? And let me click a region to filter the whole dashboard.', try: 'bi 4-3 7-2 7-4' },
    'l6-1': { who: 'dot', brief: 'Good prompts give context, data and a clear format. Build a few patterns you can reuse every day.' },
    'l6-2': { who: 'sam', brief: 'The AI wrote a query that says complaints fell by 40%. Before I tell anyone, can you check it?', try: 'sql 5-4' },
    'l6-3': { who: 'sam', brief: 'We have 1,200 free-text ticket comments. Use AI to sort them into themes, then check that it sorted them well.' },
    'l7-1': { who: 'dot', brief: 'Turn what you have built at Dot & Co. into a portfolio. Start with projects from your own background.' },
    'l7-2': { who: 'lena', brief: 'Pick a real question and take it from raw data to a recommendation, documenting every step.', try: 'sql 4-3 7-4' },
    'l7-3': { who: 'dot', brief: 'Put your project online, and practise telling its story in two minutes.' },
    'l8-1': { who: 'dot', brief: 'Your past experience is an asset. Rewrite it in the language analyst job posts use.' },
    'l8-2': { who: 'lena', brief: 'Imagine I am interviewing you for this job. Let us practise SQL questions, case questions and your own story.', try: 'sql 7-3' },
    'l8-3': { who: 'dot', brief: 'Plan your applications, your network, and what you will do in your first 90 days in the new job.' },
    'l0-4': { who: 'rosa', brief: 'A store manager writes: "Sales feel slow lately, can you look into it?" Before you open any file, turn that into a question you can answer.', try: 'sheets 7-3; sql 6-4' },
    'l0-5': { who: 'sam', brief: 'Support wants to share a ticket export with an outside agency. Check what is personal data, and what must go before anything leaves the company.' },
    'l2-5': { who: 'sam', brief: 'The ticket table was typed by busy people: spaces, capitals, missing categories and timestamps. Clean it in SQL before anyone counts anything.', try: 'sql 5-1 5-2 2-3 2-4' },
    'l2-6': { who: 'kai', brief: 'Where do people drop out of the app, and do Dot Club members stay? Build the funnel and the cohort tables.', try: 'sql 6-1 6-2 7-2 6-3 7-1' },
    'l3-8': { who: 'sam', brief: 'Before we report anything from the support desk, prove the data can be trusted: keys, gaps, odd values.', try: 'python 8-3; sql 8-3 8-2' },
    'l4-5': { who: 'theo', brief: 'Marketing wants to test a new subject line next month. Plan the test so the result means something.', try: 'python 7-3' },
    'l5-8': { who: 'lena', brief: 'The board dashboard is ready. Publish it so each manager sees only their part, with data that refreshes by itself.', try: 'bi 8-2 8-3' },
    'l5-9': { who: 'kai', brief: 'The report takes ages to load and someone asked Copilot for a "top products" page. Make it fast, and check what the AI wrote.', try: 'bi 6-1 6-2 6-3' },
    'l5-10': { who: 'theo', brief: 'Marketing joined two tables in Tableau and the revenue doubled overnight. Find out why, and set up the data the right way.' },
    'l6-4': { who: 'dot', brief: 'AI is now built into the sheet, the notebook and the BI tool. Learn when to lean on it and how to check it.' },
  };

  // Try for missions without lab levels: short scenarios (pick the best move), with a small table when it helps.
  function S(q, options, answer, why, table) { return { q: q, options: options, answer: answer, why: why, table: table || null }; }
  DA.scenarios = {
    'l0-1': [
      S("Rosa asks: \"Can you make me a dashboard?\" What is your first move?", ["Open the BI tool and start building the first page", "Ask which decision the dashboard should support", "Copy last year's dashboard and update the dates", "Ask for access to every database the company has"], 1, "A dashboard serves decisions. Knowing the decision tells you which numbers matter."),
      S("Which task is most typical of a data analyst's week?", ["Cleaning data and answering business questions", "Training deep-learning models on millions of images", "Building and styling the pages of the company website", "Keeping the office laptops and printers running"], 0, "Analysts spend most of their time getting data ready and turning it into answers people can use."),
    ],
    'l0-2': [
      S("You ask an AI to explain a SQL error. What is the best way to use the answer?", ["Paste its fixed query in without reading it first", "Ask it to finish the whole exercise for you instead", "Ignore it and keep guessing until the query runs", "Read the explanation, then fix and run it yourself"], 3, "Use AI as a tutor: understand the fix, then do it yourself so the skill stays with you."),
      S("Which prompt gets the most useful help?", ["\"Please help me with my SQL homework right now.\"", "\"Fix my code and make it as fast as possible.\"", "\"Here is my table, query and error. Give me a hint.\"", "\"Make this better and explain nothing, just do it.\""], 2, "Context plus a clear request (a hint, not the answer) turns AI into a good tutor."),
    ],
    'l0-3': [
      S("Which goal is easiest to act on?", ["\"Get much better at data and analysis this year\"", "\"Finish chapter 2 and 12 SQLab challenges by the 30th\"", "\"Learn absolutely everything there is about SQL\"", "\"Become an expert analyst as soon as I possibly can\""], 1, "A specific, measurable goal with a date tells you what to do this week."),
      S("Why write down your starting point?", ["So you can see real progress and adjust the plan", "So you can rank yourself against the other learners", "Because the app needs it before you can start", "Because it makes the course take fewer hours"], 0, "A baseline turns \"I feel slow\" into evidence of how far you have come."),
    ],
    'l0-5': [
      S("You must send a ticket table to an outside agency. Which columns do you remove or pseudonymise first?", ["ticket_id and priority", "channel, category and priority level", "created_at and resolved_at timestamps", "customer name, email and phone"], 3, "Direct identifiers go first. Then check whether combinations of the rest could still single someone out.", {cols: ["ticket_id", "customer", "email", "channel", "priority"], rows: [[17, "J. Ortega", "j.ortega@mail.test", "chat", "high"], [18, "A. Weiss", "aw@mail.test", "email", "low"]]}),
      S("Only app users answered a satisfaction survey. What is the honest caveat?", ["None: a survey answer is the same from anyone", "The results are invalid and must be deleted", "They describe app users who chose to answer", "Satisfaction cannot be measured with a survey"], 2, "Who is in the data shapes the answer. Say who the results describe."),
    ],
    'l4-1': [
      S("Order values: most are 8 to 12, and a few office orders are over 200. Which number best describes a typical order?", ["The mean", "The median", "The maximum", "The sum"], 1, "A few huge orders pull the mean up; the median stays with the typical order.", {cols: ["order", "value"], rows: [[1, 9.5], [2, 11], [3, 8.2], [4, 240], [5, 10.4]]}),
      S("Two stores have the same average basket, but one has a much larger standard deviation. What does that tell you?", ["Its baskets vary much more from order to order", "Its customers buy more items in every single visit", "It sells more in total than the other store", "Its average was calculated in the wrong way"], 0, "The spread shows how much individual orders differ from the average."),
    ],
    'l4-2': [
      S("A survey of 200 customers gives 62% satisfied, with a 95% interval of 55% to 69%. What can you say?", ["Exactly 62% of all of our customers are satisfied today", "95% of the customers asked gave an answer", "The survey is too small to tell us anything", "The true share is plausibly between 55% and 69%"], 3, "The interval shows the uncertainty that comes from asking a sample, not everyone."),
      S("How do you make that interval narrower?", ["Round the result to whole numbers", "Ask only the customers who are happy", "Ask a larger random sample", "Show it in a different chart type"], 2, "More people (chosen at random) means less sampling uncertainty."),
    ],
    'l4-4': [
      S("Stores with more staff sell more. What is the most careful conclusion?", ["Hiring more staff in any store will raise its sales", "They move together; busy stores may need more staff", "Staff numbers make no difference to store sales", "High sales are what causes stores to hire staff"], 1, "Correlation is not causation: the store's size and location may drive both."),
      S("A scatter plot of temperature and iced-drink sales slopes upward. What is r most likely to be?", ["About -0.8", "About 0", "About 0.8", "Exactly 1"], 2, "An upward pattern with some scatter is a strong positive correlation, below a perfect 1."),
    ],
    'l5-1': [
      S("You want to show monthly revenue over two years. Which chart fits best?", ["A pie chart", "A table of 24 numbers only", "A 3D bar chart", "A line chart"], 3, "Change over time reads best as a line."),
      S("You want to compare the market share of 12 products. Which chart is clearest?", ["A pie with 12 slices", "A sorted bar chart", "A line chart", "A scatter plot"], 1, "Sorted bars make small differences easy to see; 12 slices do not."),
    ],
    'l5-10': [
      S("Orders (one row per order, with an order total) are joined to order lines. What happens to SUM(order total)?", ["It stays correct, since totals are per order", "It repeats per line, so the sum is inflated", "It becomes zero for orders with several lines", "Tableau removes the duplicate rows by itself"], 1, "A one-to-many join repeats the order row. Use a relationship, or aggregate at the right level.", {cols: ["order_id", "order_total", "line"], rows: [[1, 12, "Latte"], [1, 12, "Croissant"], [2, 4, "Espresso"]]}),
      S("Your sales data and your targets live in two different sources you cannot join. What can you use?", ["A blend on a shared field", "A pie chart with both sources", "Two separate dashboards only", "Copying the numbers by hand"], 0, "A blend links two sources on a common field, at the level of the view."),
    ],
    'l6-1': [
      S("Which prompt pattern gets a reliable analysis plan?", ["\"Analyse my data and tell me what you think of it.\"", "\"Be creative and find something surprising for me.\"", "\"Tell me something interesting about this file.\"", "\"Here are my columns and question. Plan steps and checks.\""], 3, "Context, a clear task and a requested structure make AI output useful and checkable."),
      S("The AI gives a confident number you did not ask it to compute from your data. What do you do?", ["Use it, since the AI sounded very confident", "Ask it again until it agrees with your guess", "Treat it as unverified and recompute it", "Round it so it looks less exact in the report"], 2, "Numbers must come from your data and your calculation, not from the model's memory."),
    ],
    'l6-3': [
      S("An AI sorted 1,200 ticket comments into themes. How do you check it?", ["Trust it, since it is faster and cheaper than people", "Read a random sample per theme and count misfits", "Ask the AI to give its own work a score out of ten", "Read the first ten comments and stop there"], 1, "A random sample tells you how often the themes are wrong, and where."),
      S("Which data should never be pasted into a public AI tool?", ["Customer names with their emails", "A list of the column names in a table", "A made-up example table with fake rows", "The SQL query you are trying to fix"], 0, "Personal data stays inside approved tools. Use made-up examples or the schema instead."),
    ],
    'l6-4': [
      S("Copilot drafts a report page that says \"Revenue up 12%\". What is your first check?", ["Whether the colours match the company style", "Whether the title font is large enough", "Whether the page looks full and finished", "Recompute the 12% and check the period"], 3, "Verify the number and its period before anything else."),
      S("Which is the best everyday use of AI inside a spreadsheet?", ["Inventing figures for the months that are missing", "Deciding the budget for next year on its own", "Drafting a formula you then test on a few rows", "Replacing every manual check you used to do"], 2, "Let it draft; you test and decide."),
    ],
    'l7-1': [
      S("Which portfolio project tells employers the most?", ["A copy of a famous tutorial with a new title", "A question from your field, answered end to end", "A list of all the courses you have completed", "A dashboard screenshot posted with no explanation"], 1, "Your own question shows judgement, domain knowledge and the full workflow."),
      S("How many projects should a first portfolio show?", ["Two or three finished, well explained projects", "One large project, even if it is still unfinished", "Twenty small exercises copied from courses", "None at all, since a good CV is enough"], 0, "A few complete projects with a clear story beat many fragments."),
    ],
    'l7-3': [
      S("You have two minutes to present your project. What comes first?", ["The data cleaning steps, in order", "The tools and libraries you used", "Your biography and education", "The question and the answer"], 3, "Lead with the question and the answer; details follow if asked."),
      S("Where should your project live so others can see it?", ["Only on your laptop, in a folder of its own", "In an email draft you can forward when asked", "A public repository with a short README", "Printed on paper and brought to interviews"], 2, "A public link with a clear README lets anyone check your work."),
    ],
    'l8-1': [
      S("Which CV bullet reads best to an analyst hiring manager?", ["\"Responsible for producing a range of reports\"", "\"Built a weekly Excel report that cut 4 hours to 30 min\"", "\"Hard-working team player with great attention to detail\"", "\"Good with computers and quick to learn new things\""], 1, "Action, tool and a measured result in one line."),
      S("You managed stock in a shop. How do you describe it for an analyst role?", ["\"Tracked stock levels and cut waste with reorder data\"", "\"Worked in retail for several years in a busy shop\"", "\"Moved boxes and kept the stockroom tidy every day\"", "Leave it out, since it has nothing to do with data"], 0, "Translate past work into the data you used and the decisions it improved."),
    ],
    'l8-3': [
      S("In your first 90 days as an analyst, what matters most early on?", ["Rebuilding every report your own way, quickly", "Working alone to show that you are independent", "Avoiding questions so you look experienced", "Learning the business, the data and who decides"], 3, "Understanding the context first makes every later analysis more useful."),
      S("You have sent 20 applications and heard nothing. What is a useful next step?", ["Send the same CV to another hundred companies", "Give up on data roles and try something else", "Ask for feedback and tailor each CV to the ad", "Remove your projects so the CV is a single page"], 2, "Tailoring and evidence of work change response rates more than volume."),
    ],
  };

  // Case questions for each boss (also part of the practice bank). The right answer is written first; rounds shuffle the options.
  var BQ = {
    m0: ["Learning", [
      ["\"Sales feel slow\" lands on your desk. Which question can you actually answer?", "Did October weekday orders fall versus September?", ["Why does everyone in the company feel that sales are slow?", "What is the highest sales number we could possibly reach?", "What does all of our data say about sales in general?"], "A specific period, metric and comparison make the question answerable."],
      ["Which metric definition avoids an argument later?", "Active user: at least one event in the last 30 days", ["Active user: someone who seems engaged with the app lately", "Active user: anyone who appears in the users table at all", "Active user: whoever the team agrees on when the report is due"], "Write the rule down, including the time window."],
      ["Who should you talk to before building a report?", "The people who will decide something with it", ["Only the database administrator who owns the tables", "Nobody: the data speaks for itself once it is clean", "Whoever built the previous version of the report"], "The decision tells you which numbers and detail matter."],
      ["A colleague asks for customer emails to \"look at the data\". What do you do?", "Share ids and totals instead, unless emails are truly needed", ["Send the complete export straight away so nothing is missing", "Post the file in the team chat so everyone can help", "Refuse to share any data with anyone, whatever the reason"], "Share the minimum needed, and protect personal data."],
      ["You use an AI tutor while learning. Which habit keeps the skill yours?", "Ask for hints, then write the solution yourself", ["Paste each exercise and copy the full answer it gives", "Use it only for the exercises with long answers", "Skip the explanations and keep only the final code"], "Doing the last step yourself is where learning happens."],
    ]],
    m1: ["Spreadsheets", [
      ["A sum of prices shows 0 although every cell shows a number. What is the likely cause?", "The prices are stored as text", ["The sheet needs to be closed and opened again", "SUM only adds whole numbers, not decimals", "The column is too narrow to display the result"], "Numbers typed as text (often with a $ or a space) are ignored by SUM. Convert them with VALUE."],
      ["Which formula still works after a column is inserted into the Prices table?", "=XLOOKUP(A2, Prices[product], Prices[price])", ["=VLOOKUP(A2, Prices, 3, FALSE)", "=VLOOKUP(A2, Prices[[product]:[price]], 3, FALSE)", "=INDEX(Prices, MATCH(A2, Prices[product], 0), 3)"], "XLOOKUP points at the columns by name. The others count columns by position, so an inserted column shifts them."],
      ["You copy =H2*$M$1 down one row. What does row 3 hold?", "=H3*$M$1", ["=H2*$M$2", "=H3*$M$2", "=H2*$M$1"], "The relative H2 moves; the locked $M$1 stays."],
      ["Which check catches a month-end total that silently dropped rows?", "Compare row count and total with the source", ["Make the total bold so it stands out in review", "Sort the sheet by date and scroll to the end", "Add a chart of the total next to the table"], "Reconcile counts and totals with an independent source."],
      ["The same cleaning runs every Monday. What is the best way to do it?", "Saved Power Query steps that you refresh", ["Clean it by hand each week, very carefully", "Ask a different colleague to do it each week", "Skip the cleaning in the weeks you are busy"], "Repeatable steps save time and remove copy mistakes."],
    ]],
    m2: ["SQL", [
      ["Revenue per city doubled after you joined orders to order lines. Why?", "The order value repeats once per order line", ["The database counted every order twice by mistake", "A JOIN doubles every number it touches", "Revenue really did double in that month"], "A one-to-many join repeats the one side; sum at the right level."],
      ["With created_at >= '2025-11-01', which upper bound keeps every November ticket, including the 30th?", "created_at < '2025-12-01'", ["created_at <= '2025-11-30'", "created_at < '2025-11-30'", "created_at <= '2025-11-30 00:00'"], "With times in the column, compare with the start of the next day."],
      ["How do you find customers who have no orders at all?", "LEFT JOIN orders, keep rows where the order id IS NULL", ["INNER JOIN orders and keep the rows with a count of zero", "GROUP BY customer and keep HAVING COUNT(*) > 0", "SELECT customers ORDER BY last order date, oldest first"], "An anti-join keeps the left rows without a match."],
      ["What does LAG(revenue) OVER (ORDER BY month) give each month?", "The previous month's revenue", ["The running total of revenue for the year", "The next month's revenue", "The average revenue across all months"], "LAG looks one row back in the order you give."],
      ["Monday numbers: why keep the same queries every week?", "So changes come from the business, not the method", ["So the report looks familiar to the people reading it", "Because saved SQL queries cannot be edited later", "To avoid having to learn any new SQL functions"], "A stable method makes week-to-week changes meaningful."],
    ]],
    m3: ["Python", [
      ["df.groupby(\"city\")[\"qty\"].mean() was used for \"total units per city\". What is wrong?", "A total needs sum(), not mean()", ["groupby cannot take a column name as a string", "It should be grouped by qty, not by city", "Nothing: mean() and sum() give the same totals"], "Code that runs can still answer a different question."],
      ["A channel column has \"Email\", \" email\" and \"EMAIL\". What fixes it?", "df[\"channel\"].str.strip().str.lower()", ["df[\"channel\"].unique()", "df[\"channel\"].dropna()", "df[\"channel\"].astype(str).sort_values()"], "Strip spaces and lower the case to get one spelling."],
      ["Why fill missing categories with \"unknown\" instead of dropping the rows?", "The rows still count, and you can see how many are unknown", ["Dropped rows come back on their own the next time you load", "pandas raises an error when you drop rows with missing values", "It makes the saved file smaller and quicker to open"], "Dropping hides the problem and changes every total."],
      ["What does df[\"resolved_at\"].isna().sum() tell the support lead?", "How many tickets are still open", ["How many tickets have been resolved", "The average time it takes to resolve a ticket", "How many agents are on duty this week"], "An empty resolved date means the ticket is open."],
      ["The weekly report script meets a broken file. What should it do?", "Stop with a clear message about what is wrong", ["Skip the bad rows quietly and finish the report", "Fill every gap with zeros and carry on as usual", "Send last week's report again so nobody waits"], "Fail loudly so nobody trusts a broken report."],
    ]],
    m4: ["Statistics", [
      ["B converts at 9.2% and A at 8.4%, with z about 0.9. What do you report?", "B is ahead, but the gap could easily be noise", ["B is the clear winner, so ship it to everyone", "A is better, because its result is more stable", "The test failed and its data should be deleted"], "A z below 2 is weak evidence: report the size and the uncertainty."],
      ["What makes a test more likely to detect a real small effect?", "More users in each group", ["Checking the result every hour and stopping early", "Stopping as soon as B takes the lead", "Tracking ten metrics instead of one"], "Power grows with sample size; peeking and many metrics add false alarms."],
      ["Buyers in the app churn more than non-buyers. What is the careful reading?", "They are related; look for the reason before acting", ["Buying causes people to cancel, so the shop is the problem", "Remove purchases from the app until churn goes down", "The data must be wrong, since buyers should be loyal"], "Correlation is a lead, not proof of cause."],
      ["For a typical order the mean is 14 and the median 10. Why the gap?", "A few very large orders pull the mean up", ["The median was calculated with the wrong formula", "Most orders are above 14, so the median is too low", "The data has no outliers, so the two should match"], "The mean is sensitive to extreme values; the median is not."],
      ["Before a test starts, what should be fixed in writing?", "The main metric, the sample size and the duration", ["The colours and layout of the final result slide", "Which variant you expect and hope will win the test", "Nothing yet: it is better to decide after looking"], "Deciding first protects you from fooling yourself."],
    ]],
    m5: ["Visualization", [
      ["A measure shows the same value on every row of a city matrix. Why?", "It removes the city filter, for example with ALL", ["The matrix visual is broken and needs to be rebuilt", "DAX measures cannot react to filters from rows", "Every city happens to have identical sales"], "ALL ignores the filter that the row would apply."],
      ["Which DAX gives last month's quantity on each month row?", "CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))", ["CALCULATE(SUM(Sales[qty]), DATESYTD(Sales[order_date]))", "CALCULATE(SUM(Sales[qty]), ALL(Sales[order_date]))", "CALCULATE(SUM(Sales[qty]), PREVIOUSDAY(Sales[order_date]))"], "DATEADD shifts the dates in the filter back one month."],
      ["Each plan manager must see only their plan. What do you set up?", "Row-level security roles filtered on the plan", ["One plan slicer at the top of the first page", "A separate copy of the report for each manager", "A note on the cover asking them to stay on their plan"], "RLS filters the data itself, per role."],
      ["A board dashboard has 14 charts. What usually helps most?", "Fewer, focused visuals that answer their questions", ["More colours so each chart is easy to tell apart", "A bigger screen in the boardroom so everything fits", "Smaller fonts and tighter spacing to fit more charts"], "Each visual should answer a question someone asked."],
      ["Tableau shows revenue doubled after a join. What do you check first?", "Whether the join repeats rows on the one side", ["Whether the colour palette makes bars look bigger", "Whether Tableau Desktop needs to be updated", "Whether the bars are wide enough to compare"], "Joins can multiply rows; relationships avoid it."],
    ]],
    m6: ["AI workflow", [
      ["An AI query reports complaints fell 40%. What do you check first?", "Recompute the count yourself and compare filters", ["Read the summary again to check its tone sounds sure", "Ask the AI to confirm that its answer is correct", "Decide whether 40% sounds plausible for this team"], "Verify against an independent calculation."],
      ["Which part of an AI-written query most often hides a bug?", "The joins and the filters", ["The SELECT keyword at the start", "The semicolon at the very end", "The capital letters in keywords"], "Wrong keys and filters change results without errors."],
      ["The AI uses COUNT(category) to count tickets. What happens?", "Tickets with no category are left out", ["Every ticket with a category is counted twice", "The query stops with a syntax error", "The categories are sorted alphabetically first"], "COUNT(column) skips NULLs."],
      ["How should you share data with an AI tool to get help?", "The schema and a made-up sample, not real records", ["The full customer export, so it sees everything", "Read access to the production database and its password", "Nothing at all: describe the tables from memory"], "Give structure, keep people's data out."],
      ["What makes an AI-assisted analysis trustworthy?", "Code you ran, checks you did and notes on changes", ["How confident and fluent the AI answer sounds", "How many words and charts the answer contains", "Using the newest model available for the analysis"], "Trust comes from verification and a record."],
    ]],
    m7: ["Portfolio", [
      ["What should the first lines of a project README say?", "The question, the answer and why it matters", ["The list of libraries and versions you installed", "A short biography and the courses you have taken", "The date you started and how long it took"], "Readers decide in seconds; lead with the result."],
      ["Which project shows the whole analyst workflow?", "Frame a question, clean, analyse and recommend", ["A tutorial notebook copied with a new title", "A striking chart posted without any explanation", "A long list of the SQL keywords you know well"], "End to end shows judgement, not just tools."],
      ["Your project uses public data. What must you add?", "The source, its date and the limits of the data", ["Nothing: public data needs no credit or notes", "Only the file size and the number of rows", "The logo of the organisation that published it"], "Sources and limits make your work checkable and honest."],
      ["You have two minutes in an interview to show a project. What do you show?", "The question, one key chart and the decision", ["Every cleaning step, in the order you did it", "The code, read out line by line from the start", "All twenty charts, quickly, so nothing is missed"], "A focused story beats completeness."],
      ["What makes a portfolio stand out for your background?", "A question from your own field, answered with data", ["The same project that most course graduates do", "Many projects started, even if few are finished", "A long list of certificates instead of projects"], "Domain knowledge is your edge."],
    ]],
    m8: ["Career", [
      ["\"Find the second highest salary\" in SQL. Which approach works?", "Sort distinct salaries descending, skip one, take one", ["Take MAX(salary) and subtract the average gap between staff", "Sort salaries ascending and take the second row", "GROUP BY salary and keep HAVING COUNT(*) = 2"], "Sort, skip one; DISTINCT handles ties at the top."],
      ["A case question: \"Sign-ups dropped 20% this week.\" What do you ask first?", "Did the tracking or the definition change?", ["Which chart would show the drop most clearly?", "Can we hire more marketers to win them back?", "Is a 20% drop large compared with competitors?"], "Rule out measurement changes before business explanations."],
      ["How do you answer \"Tell me about yourself\" for an analyst role?", "Your background, your data skills and why this role", ["Your whole life story, in order, from school onward", "Your hobbies, so they get to know you as a person", "A list of every course and certificate you have"], "Short, relevant and pointed at the job."],
      ["The interviewer asks about a mistake you made. What works best?", "What happened, how you fixed it, what you check now", ["Say you cannot recall making any real mistakes", "Explain how a colleague caused it, not you", "Talk about a strength instead and move on quickly"], "Show learning and a better habit."],
      ["In your first weeks, how do you earn trust with numbers?", "Match existing reports first, then explain gaps", ["Replace every existing report in your first month", "Leave out the numbers that disagree with others", "Wait several months before sharing any numbers"], "Agreeing with known numbers first makes new findings credible."],
    ]],
  };
  DA.extraQuestions = DA.extraQuestions || [];
  Object.keys(BQ).forEach(function (mid) {
    BQ[mid][1].forEach(function (x, i) {
      DA.extraQuestions.push({ id: 'b-' + mid + '-' + (i + 1), cat: BQ[mid][0], q: x[0], code: '', options: [x[1]].concat(x[2]), answer: 0, why: x[3] });
    });
  });
  function bq(mid) { return [1, 2, 3, 4, 5].map(function (i) { return 'b-' + mid + '-' + i; }); }

  // Chapter boss cases. They replace the unit chest and pay the same one-time bonus (XP key "module:<id>").
  DA.bossData = {
    m0: { icon: '🗂️', title: 'First-week brief', who: 'lena', brief: 'A manager writes: "Sales feel slow, can you look into it?" Show you can turn a vague request into a clear question, a metric and a plan.' , q: bq('m0') },
    m1: { icon: '📒', title: 'Month-end close', who: 'ana', brief: 'It is the last day of the month and the numbers are due tonight. Clean, calculate and check the month-end sheet.', try: 'sheets 6-4 8-3 8-4' , q: bq('m1') },
    m2: { icon: '🗄️', title: 'The Monday numbers', who: 'lena', brief: 'Every Monday the leadership team asks the same questions. Answer them straight from the database.', try: 'sql 4-4 8-4' , q: bq('m2') },
    m3: { icon: '🎧', title: 'Support desk review', who: 'sam', brief: 'Support wants to know where tickets get stuck. Load, clean and summarise the desk data in Python.', try: 'python 8-4' , q: bq('m3') },
    m4: { icon: '🧪', title: 'Was it a win?', who: 'theo', brief: 'The new email campaign is over. Decide, with evidence, whether it really beat the old one.', try: 'python 7-4' , q: bq('m4') },
    m5: { icon: '📊', title: 'Board dashboard', who: 'lena', brief: 'The board meets on Thursday. Build the measures behind a dashboard they can trust.', try: 'bi 8-4' , q: bq('m5') },
    m6: { icon: '🤖', title: 'Audit the AI report', who: 'sam', brief: 'An AI assistant drafted this week\'s report. Find what it got wrong before it reaches anyone.', try: 'sql 5-4' , q: bq('m6') },
    m7: { icon: '📁', title: 'Your case file', who: 'dot', brief: 'Show the whole workflow on one question: frame it, get the data, analyse it and present the answer.' , q: bq('m7') },
    m8: { icon: '🤝', title: 'Interview loop', who: 'lena', brief: 'A full interview loop: a SQL screen, a case question and your own story.' , q: bq('m8') },
  };
})();
