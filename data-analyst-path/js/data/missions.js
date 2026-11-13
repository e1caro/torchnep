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
    'l1-3': { who: 'rosa', brief: 'Which store sold the most last month, and why? One page, three numbers, one chart.', try: 'sheets 3-3 3-4 4-4' },
    'l1-4': { who: 'ana', brief: 'My lookup formulas break every time someone adds a column to the price sheet. Can you make them sturdy?', try: 'sheets 4-2 4-3' },
    'l1-5': { who: 'rosa', brief: 'Every Monday I clean the same export by hand. Build me a clean-up I can refresh with one click.', try: 'sheets 2-4' },
    'l1-6': { who: 'theo', brief: 'Our campaign tracker lives in Google Sheets. I want a summary tab that keeps itself up to date.' },
    'l1-7': { who: 'ana', brief: 'What happens to our margin if coffee beans cost 10% more? Build a model I can play with, and make it warn me when an input looks wrong.', try: 'sheets 1-3 1-4 3-2' },
    'l2-1': { who: 'kai', brief: 'You now have read access to the sales database. Start with a simple one: which products cost more than 4.00?', try: 'sql 1-1 1-2' },
    'l2-2': { who: 'ana', brief: 'I want monthly totals per store straight from the database, not from a spreadsheet someone emailed me.', try: 'sql 1-3 1-4 2-3 2-4' },
    'l2-3': { who: 'rosa', brief: 'Orders, stores and products live in different tables. Put them together, and make sure the totals do not quietly double.', try: 'sql 2-1 2-2' },
    'l2-4': { who: 'theo', brief: 'Rank our products inside each category, and show me the running total of sales over the year.', try: 'sql 3-1 3-3 4-1 3-2 3-4 4-2' },
    'l3-1': { who: 'kai', brief: 'The weekly report takes me a whole afternoon. Let us see if Python can read the data and give the same numbers in seconds.', try: 'python 1-1 1-3 1-4 1-2' },
    'l3-2': { who: 'sam', brief: 'Our exports have empty fields, odd spellings and numbers stored as text. Clean them in code, so the clean-up can be repeated.', try: 'python 4-1 4-2 2-3' },
    'l3-3': { who: 'rosa', brief: 'Combine the store list with the sales data, and give me the numbers for each region side by side.', try: 'python 4-3' },
    'l3-4': { who: 'ana', brief: 'I need each store\'s numbers summarised by group, sorted, and back in one tidy table I can paste into my report.', try: 'python 2-1 3-1 3-2 2-2 2-4 3-3 3-4' },
    'l3-5': { who: 'theo', brief: 'Which customers are loyal, which are slipping away, and how does each month\'s new group behave over time?', try: 'python 4-4' },
    'l3-6': { who: 'lena', brief: 'The board meets next week. Turn your findings into charts that someone can read in five seconds.' },
    'l3-7': { who: 'kai', brief: 'Make the weekly report build itself: read, clean, summarise and save it, without anyone touching it.' },
    'l4-1': { who: 'ana', brief: 'Is a typical order 8.00 or 12.00? The average and the median tell different stories. Which one should I report?' },
    'l4-2': { who: 'theo', brief: 'We surveyed 200 customers. How sure can we be about what all our customers think?' },
    'l4-3': { who: 'theo', brief: 'We tried two versions of the welcome email. Version B looks better, but is the difference real or just luck?' },
    'l4-4': { who: 'rosa', brief: 'Stores with more staff sell more. Should we hire, or is something else going on?' },
    'l5-1': { who: 'lena', brief: 'Every team sends charts in a different style. Help us pick the right chart for each question.' },
    'l5-2': { who: 'ana', brief: 'I want one dashboard for sales, margin and top products that I can filter by store.', try: 'bi 1-1 1-3 4-1 1-2 1-4 4-2' },
    'l5-3': { who: 'lena', brief: 'You have the numbers. Now give me the story: what happened, why, and what we should do about it.' },
    'l5-4': { who: 'kai', brief: 'Our BI model is one giant table, and it is slow and confusing. Design something cleaner.', try: 'bi 3-1 3-2 3-3 3-4' },
    'l5-5': { who: 'ana', brief: 'I need measures that respect the filters on the page, plus shares of the total that do not break when I slice by store.', try: 'bi 2-1 2-2 2-4 2-3' },
    'l5-6': { who: 'theo', brief: 'Marketing works in Tableau. Show me calculated fields I can trust, and dates I can group the way I like.', try: 'bi 4-4' },
    'l5-7': { who: 'theo', brief: 'What is each customer\'s total, whatever filter is on? And let me click a region to filter the whole dashboard.', try: 'bi 4-3' },
    'l6-1': { who: 'dot', brief: 'Good prompts give context, data and a clear format. Build a few patterns you can reuse every day.' },
    'l6-2': { who: 'sam', brief: 'The AI wrote a query that says complaints fell by 40%. Before I tell anyone, can you check it?' },
    'l6-3': { who: 'sam', brief: 'We have 1,200 free-text ticket comments. Use AI to sort them into themes, then check that it sorted them well.' },
    'l7-1': { who: 'dot', brief: 'Turn what you have built at Dot & Co. into a portfolio. Start with projects from your own background.' },
    'l7-2': { who: 'lena', brief: 'Pick a real question and take it from raw data to a recommendation, documenting every step.', try: 'sql 4-3' },
    'l7-3': { who: 'dot', brief: 'Put your project online, and practise telling its story in two minutes.' },
    'l8-1': { who: 'dot', brief: 'Your past experience is an asset. Rewrite it in the language analyst job posts use.' },
    'l8-2': { who: 'lena', brief: 'Imagine I am interviewing you for this job. Let us practise SQL questions, case questions and your own story.' },
    'l8-3': { who: 'dot', brief: 'Plan your applications, your network, and what you will do in your first 90 days in the new job.' },
  };

  // Chapter boss cases. They replace the unit chest and pay the same one-time bonus (XP key "module:<id>").
  DA.bossData = {
    m0: { icon: '🗂️', title: 'First-week brief', who: 'lena', brief: 'A manager writes: "Sales feel slow, can you look into it?" Show you can turn a vague request into a clear question, a metric and a plan.' },
    m1: { icon: '📒', title: 'Month-end close', who: 'ana', brief: 'It is the last day of the month and the numbers are due tonight. Clean, calculate and check the month-end sheet.' },
    m2: { icon: '🗄️', title: 'The Monday numbers', who: 'lena', brief: 'Every Monday the leadership team asks the same questions. Answer them straight from the database.', try: 'sql 4-4' },
    m3: { icon: '🎧', title: 'Support desk review', who: 'sam', brief: 'Support wants to know where tickets get stuck. Load, clean and summarise the desk data in Python.' },
    m4: { icon: '🧪', title: 'Was it a win?', who: 'theo', brief: 'The new email campaign is over. Decide, with evidence, whether it really beat the old one.' },
    m5: { icon: '📊', title: 'Board dashboard', who: 'lena', brief: 'The board meets on Thursday. Build the measures behind a dashboard they can trust.' },
    m6: { icon: '🤖', title: 'Audit the AI report', who: 'sam', brief: 'An AI assistant drafted this week\'s report. Find what it got wrong before it reaches anyone.' },
    m7: { icon: '📁', title: 'Your case file', who: 'dot', brief: 'Show the whole workflow on one question: frame it, get the data, analyse it and present the answer.' },
    m8: { icon: '🤝', title: 'Interview loop', who: 'lena', brief: 'A full interview loop: a SQL screen, a case question and your own story.' },
  };
})();
