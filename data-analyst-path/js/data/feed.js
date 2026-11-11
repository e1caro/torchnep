/* Discover feed: short cards worth knowing on the way to becoming a data analyst.
 *
 * kinds: story (data history and disasters), idea (a concept in 30 seconds), tip (a practical trick),
 *        myth (true or false, interactive), chart (a "chart crime" and its fix, interactive),
 *        quote, word (glossary).
 * Each card: id, kind, cat (filter), icon, title, body (1-2 short paragraphs), take (the one-line lesson),
 *            lesson (optional lesson id to go deeper).
 * Facts were checked against their sources; where a number is only reported or attributed, the text says so.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var cards = [];
  function add(kind, id, cat, icon, title, body, take, lesson, extra) {
    var c = { id: id, kind: kind, cat: cat, icon: icon, title: title, body: [].concat(body), take: take || '', lesson: lesson || '' };
    if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
    cards.push(c);
  }
  function story(id, icon, title, body, take, lesson, cat) { add('story', id, cat || 'Stories', icon, title, body, take, lesson); }
  function idea(id, icon, title, body, take, lesson) { add('idea', id, 'Stats', icon, title, body, take, lesson); }
  function tip(id, cat, icon, title, body, take, lesson, code) { add('tip', id, cat, icon, title, body, take, lesson, code ? { code: code } : null); }
  function myth(id, cat, claim, isTrue, why, lesson) { add('myth', id, cat, '🤔', claim, [], why, lesson, { truth: isTrue }); }
  function chart(id, title, crime, body, take) { add('chart', id, 'Charts', '📊', title, body, take, 'l5-1', { chart: crime }); }
  function quote(id, cat, text, who, note) { add('quote', id, cat, '💬', text, note ? [note] : [], '', '', { who: who }); }
  function word(id, cat, term, def, example, lesson) { add('word', id, cat, '🔤', term, [def], example, lesson); }

  /* ------------------------------------------------------------------ data stories */
  story('s-wald', '✈️', 'The bullet holes that were missing',
    ['In World War II the US military mapped the bullet holes on bombers that returned from missions and planned to add armour where the holes clustered: wings and fuselage.',
     'Statistician Abraham Wald said to do the opposite. Armour the places with no holes, like the engines: planes hit there never made it back to be counted.'],
    'Always ask which data you are NOT seeing. This is survivorship bias.', 'l4-2');
  story('s-nightingale', '🌹', 'The nurse who won with a chart',
    ['After the Crimean War, Florence Nightingale had the numbers: far more soldiers died from preventable disease than from wounds. Tables did not move anyone.',
     'So in 1858 she drew her "rose" diagram, with wedges sized by cause of death. It helped push through sanitary reforms, and she became the first woman elected to the Statistical Society of London.'],
    'A clear chart can change a decision that a table cannot.', 'l5-3');
  story('s-snow', '🗺️', 'The map that stopped an epidemic',
    ['London, 1854: cholera was blamed on "bad air". Doctor John Snow marked every death on a street map of Soho.',
     'The dots piled up around one water pump on Broad Street. He took the map to the authorities, the pump handle was removed, and the outbreak faded.'],
    'Plot your data. Where something happens can tell you why.', 'l5-1');
  story('s-literary', '🗳️', 'Two million answers, wrong result',
    ['In 1936 the Literary Digest mailed 10 million ballots, got about 2.4 million back and predicted that Alf Landon would beat President Roosevelt. Roosevelt won 46 of 48 states.',
     'Its lists came from phone books, car registrations and its own subscribers: wealthier people, in the middle of the Depression. George Gallup got it right with about 50,000 well-chosen people.'],
    'A huge biased sample loses to a small representative one.', 'l4-2');
  story('s-berkeley', '🎓', 'The bias that vanished',
    ['In 1973, Berkeley graduate admissions looked biased: about 44% of men were admitted and 35% of women.',
     'Department by department, the gap disappeared, and several departments slightly favoured women. Women had applied more to the departments that rejected most applicants of either sex.'],
    'This is Simpson\'s paradox: always split a total before you trust it.', 'l4-4');
  story('s-anscombe', '🦖', 'Same numbers, different worlds',
    ['In 1973 Francis Anscombe built four small datasets with nearly the same mean, variance, correlation (0.816) and regression line. Plotted, one is a line, one a curve, one a line with an outlier, one a vertical stack.',
     'In 2017 researchers went further with the "Datasaurus Dozen": thirteen datasets with the same summary statistics, one of them shaped like a dinosaur.'],
    'Never trust summary statistics alone. Plot first.', 'l4-1');
  story('s-mars', '🚀', 'A $125 million unit error',
    ['In 1999 NASA\'s Mars Climate Orbiter flew too close to Mars and was lost.',
     'One team\'s software reported thruster impulse in pound-force seconds. The navigation software expected newton-seconds. Nobody had checked that the two sources meant the same thing.'],
    'When you join data from two sources, check units and definitions first.', 'l1-1');
  story('s-rr', '📉', 'The spreadsheet that shaped budgets',
    ['A famous 2010 economics paper reported that countries with public debt above 90% of GDP shrank on average (−0.1% growth). Politicians cited it to defend austerity.',
     'In 2013 a graduate student, Thomas Herndon, tried to reproduce it and found an Excel formula that left out five countries, among other choices. Corrected, the figure was +2.2%.'],
    'Share your workbook and let others check it. One wrong range can move policy.', 'l1-2');
  story('s-covid-xls', '🧾', '15,841 cases lost in a spreadsheet',
    ['In autumn 2020, England\'s daily COVID figures missed 15,841 positive cases recorded between 25 September and 2 October.',
     'The data files had outgrown a spreadsheet size limit (widely reported as the old .xls format, which stops at about 65,000 rows), so the extra rows were silently dropped. Contact tracing for those cases was delayed for days.'],
    'Know the limits of your tool, and check that rows in equals rows out.', 'l1-1');
  story('s-genes', '🧬', 'The genes Excel renamed',
    ['Excel kept turning gene names such as MARCH1 and SEPT1 into dates. A 2016 study found such errors in about a fifth of genetics papers that shared gene lists in Excel.',
     'In 2020 the scientists gave up and renamed 27 human genes instead: MARCH1 became MARCHF1 and SEPT1 became SEPTIN1.'],
    'Tools guess data types for you. Import as text and check what changed.', 'l1-1');
  story('s-bing', '💡', 'The idea nobody wanted',
    ['In 2012 a Bing employee suggested showing longer ad headlines. It was judged low priority and sat in a backlog for months.',
     'An engineer finally ran a quick A/B test. Revenue jumped 12%, worth more than $100 million a year in the US alone. It became one of Bing\'s best ideas ever.'],
    'Opinions are poor predictors, even expert ones. Test instead of guessing.', 'l4-3');
  story('s-41blue', '🔵', '41 shades of blue',
    ['Around 2009 Google could not agree on the blue for its links, so it tested 41 shades on real users. The winning shade reportedly brought in about $200 million more a year in ad revenue.',
     'Its lead visual designer quit soon after, tired of having to prove every design decision with data.'],
    'At scale, tiny effects are worth measuring. Not every question needs a test, though.', 'l4-3');
  story('s-challenger', '🛰️', 'The chart that hid the danger',
    ['The night before the Challenger launch in 1986, engineers warned that cold weather could make the O-ring seals fail. Their charts showed only the flights that had seal damage.',
     'Seen with all flights, the pattern was plain: the coldest launches all had damage, and launch morning was near freezing, far colder than any earlier flight (the coldest had been 53°F).'],
    'Show all the data, including the cases where nothing happened.', 'l5-3');
  story('s-flu', '🤒', 'When Google predicted the flu',
    ['In 2008 Google Flu Trends estimated flu levels from what people searched for, faster than official figures. It looked like the future.',
     'By early 2013 it was predicting more than double the doctor visits that health authorities recorded. It had latched onto seasonal search terms, and search behaviour kept changing under it.'],
    'Big data is not automatically good data. Models drift, so keep checking them.', 'l6-2');
  story('s-tanks', '🪖', 'Counting tanks with serial numbers',
    ['In World War II the Allies needed to know how many tanks Germany was building. Intelligence estimated about 1,400 a month.',
     'Statisticians looked at the serial numbers on captured tanks instead and estimated about 246 a month. After the war, German records showed 245.'],
    'A small, well-understood sample can beat a mountain of guesswork.', 'l4-2');
  story('s-monty', '🚪', 'The puzzle that fooled the PhDs',
    ['Three doors, one car. You pick a door, the host (who knows where the car is) opens another to show a goat, and offers a switch. In 1990 columnist Marilyn vos Savant said: switch, you win two times in three.',
     'She received about 10,000 letters, close to 1,000 of them from PhDs, saying she was wrong. She was right.'],
    'When intuition and maths disagree, simulate it. Ten lines of code settle it.', 'l4-2');
  story('s-hanoi', '🐀', 'The rat-tail bounty',
    ['In 1902 French colonial officials in Hanoi paid a bounty for every rat tail handed in. Tails arrived by the thousand.',
     'Then tail-less rats were seen running around the city: people cut the tails off and let the rats go to breed more. Some even farmed rats.'],
    'Goodhart\'s law: when a measure becomes a target, it stops being a good measure.', 'l5-2');
  story('s-moneyball', '⚾', 'Buying wins cheaply',
    ['The 2002 Oakland A\'s had one of the lowest payrolls in baseball. They could not afford stars, so they looked for a statistic the market undervalued: on-base percentage.',
     'They won 103 games, including 20 in a row, a league record at the time.'],
    'Find the measure that really drives the result, especially if others ignore it.', 'l4-4');
  story('s-netflix', '🎬', 'The million-dollar model nobody used',
    ['From 2006 to 2009 Netflix offered $1 million to anyone who could make its recommendations 10% more accurate. The winners blended hundreds of models.',
     'Netflix never put the full winning solution into production. The accuracy gain was not worth the engineering effort, and the business was moving to streaming.'],
    'The most accurate answer is not always the most useful one.', 'l7-2');
  story('s-zillow', '🏠', 'A good estimate, a bad bet',
    ['Zillow\'s home-price estimates were good enough that in 2018 it started buying houses with them, to resell at a profit.',
     'Forecasting prices months ahead proved much harder. In 2021 it shut the business down, wrote off more than $500 million and cut about a quarter of its staff.'],
    'Know the error bars of your numbers before anyone bets money on them.', 'l4-2');
  story('s-amazon-cv', '🤖', 'The hiring model that learned bias',
    ['Reuters reported in 2018 that Amazon had built a tool to score résumés, trained on ten years of past applications, mostly from men.',
     'It learned to mark down résumés that included the word "women\'s". Amazon scrapped the project.'],
    'A model learns the past, biases included. Look hard at what you train on.', 'l6-2');
  story('s-galton', '🐂', 'The wisdom of the crowd',
    ['At a country fair in 1906, 787 people paid to guess the weight of an ox. Francis Galton collected the tickets afterwards.',
     'The middle guess was 1,207 pounds. The ox weighed 1,198. The crowd was off by less than 1%, better than most of the experts in it.'],
    'Independent errors cancel out. Combining many estimates often beats the best one.', 'l4-1');
  story('s-gosset', '🍺', 'Statistics brewed at Guinness',
    ['William Gosset worked at the Guinness brewery and had to judge barley and beer from very small samples.',
     'He worked out how, and published it in 1908 under the pen name "Student", because Guinness did not let staff publish. That is why it is still called Student\'s t-test.'],
    'Statistics was invented to answer practical business questions with little data.', 'l4-3');
  story('s-playfair', '📈', 'The man who invented the chart',
    ['Before 1786, numbers lived in tables. That year William Playfair published the first line charts and bar charts, and in 1801 the first pie chart.',
     'Every dashboard you will ever build descends from one Scottish engineer\'s idea that the eye sees patterns faster than it reads numbers.'],
    'Charts are a technology. Use them on purpose.', 'l5-1');
  story('s-minard', '❄️', 'One line, a whole war',
    ['In 1869 Charles Minard drew Napoleon\'s 1812 march on Moscow as a single band: 422,000 soldiers wide at the start, 10,000 wide on the way back.',
     'One drawing shows the army\'s size, its route, its direction, the dates and the falling temperature during the retreat.'],
    'A great chart shows comparison and cause at a glance.', 'l5-3');
  story('s-semmelweis', '🧼', 'Right, and ignored',
    ['Vienna, 1847. In the ward run by doctors, far more mothers died of fever than in the ward run by midwives. Ignaz Semmelweis saw that doctors came straight from autopsies.',
     'He made them wash their hands in chlorine solution. Deaths fell from about 18% to about 2% within months. The medical establishment rejected him anyway.'],
    'Being right is not enough. You have to bring people with you.', 'l5-3');
  story('s-cage', '🎭', 'Nicolas Cage and the swimming pools',
    ['From 1999 to 2009, the number of films Nicolas Cage appeared in each year tracked the number of people who drowned in swimming pools (correlation about 0.67).',
     'Tyler Vigen collected hundreds of such matches by letting a computer compare thousands of unrelated statistics.'],
    'Compare enough things and some will correlate by pure chance.', 'l4-4', 'Stats');
  story('s-chocolate', '🍫', 'Chocolate and Nobel prizes',
    ['A 2012 note in a top medical journal showed that countries eating more chocolate per person win more Nobel prizes (correlation 0.79 across 23 countries).',
     'It was tongue in cheek. Rich countries eat more chocolate and also fund more research.'],
    'A strong correlation between countries says nothing about individuals, or about cause.', 'l4-4', 'Stats');
  story('s-sql-origin', '🗃️', 'SQL is older than the PC',
    ['In 1970 Edgar Codd proposed storing data in related tables. A few years later, two IBM researchers, Donald Chamberlin and Raymond Boyce, designed a language to query them: SEQUEL.',
     'A trademark problem shortened the name to SQL. Half a century later it is still one of the most requested skills in analyst job ads.'],
    'Time spent learning SQL keeps paying back.', 'l2-1', 'SQL');
  story('s-visicalc', '🖥️', 'The first killer app',
    ['In 1979 VisiCalc put a grid of cells that recalculated themselves on the Apple II. People bought the computer just to run it.',
     'Excel arrived in 1985, first on the Macintosh. Today a sheet holds 1,048,576 rows, and analysts still hit that limit.'],
    'The spreadsheet made everyone a little bit of an analyst.', 'l1-2', 'Sheets');
  story('s-python-name', '🐍', 'Named after a comedy show',
    ['Guido van Rossum named Python after the comedy group Monty Python, not the snake.',
     'pandas, the library analysts use every day, was started by Wes McKinney in 2008 while working at an investment firm. Its name comes from "panel data".'],
    'The tools you are learning were built by people solving their own data problems.', 'l3-1', 'Python');

  /* ------------------------------------------------------------------ ideas in 30 seconds */
  idea('i-base-rate', '🧪', 'The 99% test that is usually wrong',
    ['A test is 99% accurate. The disease affects 1 person in 1,000. You test positive. How worried should you be?',
     'Take 100,000 people: 100 are ill and 99 of them test positive. But 999 of the 99,900 healthy people test positive too. Your chance of being ill is 99 in 1,098: about 9%.'],
    'Always ask how rare the thing is before reading a "positive".', 'l4-3');
  idea('i-regression', '↩️', 'Why the great month never repeats',
    ['After an unusually good (or bad) result, the next one is usually closer to normal, even if nothing changed. Part of any extreme is luck, and luck does not repeat.',
     'It is why a "cursed" magazine cover follows a record season, and why a fix applied after the worst month always seems to work.'],
    'Before crediting a change, ask whether things were simply returning to normal.', 'l4-4');
  idea('i-birthday', '🎂', '23 people, one shared birthday',
    ['In a group of just 23 people, the chance that two share a birthday is a little over 50%.',
     'It feels wrong because you imagine matching your own birthday. But 23 people make 253 different pairs, and any pair can match.'],
    'Coincidences are far more common than intuition says, especially in big datasets.', 'l4-2');
  idea('i-benford', '1️⃣', 'The digit that shows up 30% of the time',
    ['In many real datasets (invoices, populations, river lengths) the first digit is 1 about 30% of the time, and 9 less than 5%. This is Benford\'s law.',
     'Invented numbers tend to spread the first digits evenly, so auditors use the pattern to flag accounts worth a closer look.'],
    'Real data has a shape. Knowing the shape helps you spot fakes and errors.', 'l4-1');
  idea('i-pareto', '⚖️', 'The 80/20 pattern',
    ['In 1896 Vilfredo Pareto noticed that about 20% of people owned 80% of the land in Italy. The same lopsided pattern appears everywhere: a few customers bring most revenue, a few bugs cause most crashes.',
     'It is a pattern, not a law. Check your own split.'],
    'Sort by size and add a cumulative % column. It tells you where to focus.', 'l1-3');
  idea('i-twyman', '🚨', 'Twyman\'s law',
    ['"Any figure that looks interesting or different is usually wrong."',
     'When a number surprises you, such as a 300% jump or a perfect score, suspect the data first: a duplicate join, a changed definition, a broken tracker. Celebrate later.'],
    'Check surprising results twice before you share them.', 'l6-2');
  idea('i-pp', '➗', 'Percent or percentage points?',
    ['A rate goes from 4% to 5%. That is +1 percentage point, and also +25% in relative terms. Both are true, and they sound very different.',
     'Headlines pick whichever sounds bigger.'],
    'Always say which one you mean, and give the two original numbers.', 'l4-1');
  idea('i-gates', '🍸', 'A billionaire walks into a bar',
    ['Ten people in a bar earn about 40,000 each. A billionaire walks in. The average income is now tens of millions. Nobody got richer.',
     'The median barely moves.'],
    'For skewed things (income, order value, time on page) report the median.', 'l4-1');
  idea('i-small-numbers', '🏘️', 'Why small towns top every list',
    ['The places with the lowest rates of a rare disease are small rural counties. So are the places with the highest rates.',
     'It is not the countryside. With few people, one case more or less swings the rate wildly.'],
    'Before ranking stores, schools or regions, look at how small the smallest are.', 'l4-2');
  idea('i-pvalue', '🎯', 'What p = 0.03 really says',
    ['It says: if there were truly no effect, data at least this extreme would turn up about 3% of the time.',
     'It does not say there is a 97% chance the effect is real, and it says nothing about how big the effect is.'],
    'Report the size of the effect and its range, not only "significant".', 'l4-3');
  idea('i-jelly', '🫘', 'Test 20 things, find one "effect"',
    ['At the usual 5% threshold, one test in twenty comes out "significant" by pure chance.',
     'Compare 20 colours of jelly bean against acne and one colour will look guilty. Slice an A/B test by enough segments and one will "win".'],
    'Decide what you will test before looking, and distrust the lone surprising segment.', 'l4-3');
  idea('i-r2', '🔗', 'How strong is 0.5?',
    ['A correlation of 0.5 sounds like "half". Square it: it explains only 25% of the variation. A correlation of 0.3 explains 9%.',
     'Plotted, a 0.3 looks like a shapeless cloud.'],
    'Square the correlation before you get excited.', 'l4-4');
  idea('i-4x', '📏', 'Twice as precise costs four times the data',
    ['The margin of error shrinks with the square root of the sample size. To cut it in half you need four times as many observations.',
     'Going from 100 to 400 answers helps a lot. Going from 10,000 to 10,300 does almost nothing.'],
    'More data has sharply diminishing returns. Less bias is usually worth more.', 'l4-2');
  idea('i-outliers', '🔍', 'Three kinds of outlier',
    ['An odd value is one of three things: a mistake (an extra zero), a rare but real event (Black Friday), or a different animal altogether (a business customer among shoppers).',
     'Each needs a different treatment: fix it, keep it, or analyse it separately.'],
    'Find out which kind it is before you delete anything.', 'l4-1');

  /* ------------------------------------------------------------------ SQL tips */
  tip('t-sql-order', 'SQL', '🔢', 'SQL does not run top to bottom',
    ['You write SELECT first, but the database works in this order: FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT.',
     'That is why you cannot use a column alias from SELECT inside WHERE, but you can in ORDER BY.'],
    'When a query confuses you, read it in execution order.', 'l2-2');
  tip('t-sql-notin', 'SQL', '🕳️', 'The NOT IN trap',
    ['If the list inside NOT IN contains a single NULL, the whole condition becomes "unknown" and the query returns no rows at all. No error, just nothing.'],
    'Use NOT EXISTS, or filter the NULLs out of the sub-query.', 'l2-3',
    'SELECT * FROM customers\nWHERE id NOT IN (SELECT customer_id FROM orders\n                 WHERE customer_id IS NOT NULL);');
  tip('t-sql-count', 'SQL', '🧮', 'Three counts, three answers',
    ['COUNT(*) counts rows. COUNT(email) counts rows where email is not NULL. COUNT(DISTINCT email) counts different emails.'],
    'Put all three side by side when you meet a new table. The gaps tell you about missing and repeated data.', 'l2-2',
    'SELECT COUNT(*), COUNT(email), COUNT(DISTINCT email)\nFROM customers;');
  tip('t-sql-fanout', 'SQL', '💥', 'The join that doubles your revenue',
    ['Join orders to order items and each order row repeats once per item. Sum an order-level column now and it is counted several times.'],
    'Count rows before and after every join. If the number grew, find out why before summing.', 'l2-3');
  tip('t-sql-cte', 'SQL', '🪜', 'Write queries as steps',
    ['A long query with sub-queries inside sub-queries is hard to read and harder to debug. WITH lets you name each step and read the query top to bottom.'],
    'One CTE per idea: clean, then aggregate, then compare.', 'l2-4',
    'WITH monthly AS (\n  SELECT month, SUM(revenue) AS revenue\n  FROM sales GROUP BY month\n)\nSELECT * FROM monthly WHERE revenue > 1000;');
  tip('t-sql-topn', 'SQL', '🏅', 'Top 3 per group',
    ['"The 3 best-selling products in each category" is a classic interview question. LIMIT cannot do it, because it cuts the whole result.'],
    'Number the rows inside each group with ROW_NUMBER, then keep the first three.', 'l2-4',
    'SELECT * FROM (\n  SELECT category, name, units,\n         ROW_NUMBER() OVER (PARTITION BY category\n                            ORDER BY units DESC) AS rn\n  FROM product_sales\n) WHERE rn <= 3;');
  tip('t-sql-lag', 'SQL', '⏮️', 'Compare with last month in one line',
    ['LAG() fetches a value from the previous row, so month-over-month change needs no self-join.'],
    'LAG looks back, LEAD looks forward.', 'l2-4',
    'SELECT month, revenue,\n       revenue - LAG(revenue) OVER (ORDER BY month) AS change\nFROM monthly;');
  tip('t-sql-case', 'SQL', '🧩', 'Pivot with CASE',
    ['Want one column per channel instead of one row per channel? Put a CASE inside the aggregate.'],
    'SUM(CASE WHEN … THEN 1 ELSE 0 END) counts only the rows you describe.', 'l2-2',
    "SELECT store_id,\n  SUM(CASE WHEN channel = 'delivery' THEN 1 ELSE 0 END) AS delivery,\n  SUM(CASE WHEN channel = 'pickup' THEN 1 ELSE 0 END) AS pickup\nFROM orders GROUP BY store_id;");
  tip('t-sql-grain', 'SQL', '🌾', 'First question: what is one row?',
    ['Before any analysis, say out loud what one row of the table represents: one order, one item in an order, one customer per day?',
     'Most wrong totals come from getting this wrong.'],
    'Run SELECT * … LIMIT 10 and COUNT(*) on every new table before anything else.', 'l2-1');
  tip('t-sql-intdiv', 'SQL', '➗', '1 / 2 = 0',
    ['In many databases (SQLite and PostgreSQL included) dividing two whole numbers gives a whole number. A conversion rate of 37 / 100 comes out as 0.'],
    'Multiply by 1.0 first.', 'l2-2',
    'SELECT 1.0 * conversions / visits AS rate FROM daily;');
  tip('t-sql-dates', 'SQL', '📅', 'Why dates are written 2025-03-07',
    ['Year-month-day sorts correctly even as plain text, and nobody has to guess whether 03/07 means March or July.'],
    'Store and exchange dates as YYYY-MM-DD. Format them nicely only at the very end.', 'l2-1');
  tip('t-sql-star', 'SQL', '⭐', 'SELECT * is for exploring',
    ['It is perfect for a first look. In a query you keep, name the columns: it documents what you use, and it does not break when someone adds a column.'],
    'Explore with *, deliver with names.', 'l2-1');

  /* ------------------------------------------------------------------ spreadsheet tips */
  tip('t-xl-table', 'Sheets', '🧱', 'Ctrl + T changes everything',
    ['Turn a range into a Table and formulas fill down by themselves, pivot tables pick up new rows, and you can write Sales[revenue] instead of C2:C5000.'],
    'Make it the first thing you do with any data in Excel.', 'l1-2');
  tip('t-xl-xlookup', 'Sheets', '🔎', 'XLOOKUP replaces VLOOKUP',
    ['XLOOKUP matches exactly by default, can look to the left, does not break when a column is inserted, and has a built-in "if not found" value.'],
    'If your Excel has it, stop counting columns.', 'l1-2',
    '=XLOOKUP(A2, Products[id], Products[price], "not found")');
  tip('t-xl-flash', 'Sheets', '⚡', 'Flash Fill reads your mind',
    ['Type the result you want for the first row or two (say, the first name taken from a full name), then press Ctrl + E. Excel works out the pattern and fills the rest.'],
    'Great for one-off clean-ups. For anything you will repeat, use a formula or Power Query.', 'l1-1');
  tip('t-xl-f4', 'Sheets', '🔒', 'F4 locks a cell',
    ['While editing a formula, press F4 on a reference to cycle through B2, $B$2, B$2 and $B2. The dollar signs keep the row or column from moving when you copy the formula.'],
    'Use $B$2 for a single fixed value, such as a tax rate.', 'l1-2');
  tip('t-xl-text', 'Sheets', '⬅️', 'Numbers that lean left are text',
    ['By default, real numbers and dates align to the right and text to the left. A "number" hugging the left edge will not add up and will not sort properly.'],
    'Check the alignment of a column before trusting any total.', 'l1-1');
  tip('t-xl-pct', 'Sheets', '🍰', 'Percent of total without a formula',
    ['In a pivot table, right-click a value and choose "Show values as" then "% of column total". The same menu gives running totals and difference from the previous month.'],
    'Pivot tables can do most of the arithmetic for you.', 'l1-2');
  tip('t-xl-raw', 'Sheets', '🧊', 'Freeze the raw data',
    ['Keep one sheet with the data exactly as it arrived and never edit it. Clean in a second sheet with formulas that point back to the first.'],
    'When someone asks "where does this number come from?", you can show them.', 'l1-1');

  /* ------------------------------------------------------------------ Python tips */
  tip('t-py-five', 'Python', '🖐️', 'Five commands for any new dataset',
    ['Run these before anything else. They tell you the size, the types, what is missing and what looks wrong.'],
    'Two minutes here saves hours later.', 'l3-1',
    'df.head()\ndf.shape\ndf.info()\ndf.describe()\ndf.isna().sum()');
  tip('t-py-vc', 'Python', '🗂️', 'value_counts finds the typos',
    ['Counting each distinct value shows "Madrid", "madrid " and "Madird" as three cities. Add dropna=False to see how many are missing as well.'],
    'Run it on every text column you plan to group by.', 'l3-2',
    "df['city'].value_counts(dropna=False)");
  tip('t-py-merge', 'Python', '🧷', 'Let merge check itself',
    ['validate raises an error if the keys are not as unique as you believe. indicator adds a column saying whether each row matched on both sides.'],
    'A merge that silently multiplies rows is the most common pandas bug.', 'l3-3',
    "pd.merge(orders, customers, on='customer_id',\n         how='left', validate='many_to_one',\n         indicator=True)");
  tip('t-py-vector', 'Python', '🏎️', 'Do not loop over rows',
    ['pandas works on whole columns at once. A column operation is usually far faster than a Python loop, and shorter to write.'],
    'If you are writing "for row in df", there is almost always a better way.', 'l3-2',
    "df['revenue'] = df['qty'] * df['unit_price']");
  tip('t-py-query', 'Python', '🔦', 'Filter in plain words',
    ['query() takes the condition as text, which reads better than nested brackets when there are several conditions.'],
    'Use whichever style you can read back in a month.', 'l3-1',
    "df.query(\"price > 4 and category == 'Coffee'\")");
  tip('t-py-chain', 'Python', '⛓️', 'One step per line',
    ['Wrap a chain of pandas steps in brackets and put each on its own line. It reads like a recipe, and you can comment a line out to debug.'],
    'Readable code is checked code.', 'l3-3',
    "(df[df['qty'] > 0]\n   .groupby('category')['revenue']\n   .sum()\n   .sort_values(ascending=False))");
  tip('t-py-copy', 'Python', '⚠️', 'The warning beginners ignore',
    ['"SettingWithCopyWarning" means pandas is not sure whether you are changing your table or a temporary copy of part of it. Your change may be silently lost.'],
    'Assign with .loc, or make an explicit copy first.', 'l3-2',
    "df.loc[df['qty'] < 0, 'qty'] = 0");

  /* ------------------------------------------------------------------ AI tips */
  tip('t-ai-schema', 'AI', '🧬', 'Give the schema, not the data',
    ['With the exact table and column names, an AI writes SQL that runs first time. Without them it invents plausible names. And the schema contains nothing private.'],
    'Paste the structure and three made-up rows. Never the real customer table.', 'l6-1');
  tip('t-ai-plan', 'AI', '🗺️', 'Ask for the plan first',
    ['"Before writing any code, give me a 3-step plan and your assumptions." You catch a misunderstanding in ten seconds instead of after fifty lines.'],
    'Plan, then code, then review. In that order.', 'l6-1');
  tip('t-ai-total', 'AI', '🧾', 'One check catches most AI mistakes',
    ['Reconcile one total against a number you calculated another way: a pivot table, a plain SUM, last month\'s report.'],
    'If the totals disagree, do not use anything else from that answer yet.', 'l6-2');
  tip('t-ai-hint', 'AI', '🧗', '"Do not give me the answer"',
    ['Paste your attempt and the error, then ask for a hint and the reason. You stay the one solving it.'],
    'Whatever the AI does for you, you cannot do in the interview.', 'l0-2');
  tip('t-ai-wrong', 'AI', '🧯', 'Ask what could be wrong',
    ['"List the assumptions you made and three ways this result could be wrong." Models are much better at criticising an analysis than at doubting it unprompted.'],
    'Make this the last message of every analysis chat.', 'l6-2');
  tip('t-ai-sources', 'AI', '🔗', 'AI can invent its sources',
    ['Language models can produce studies, statistics, links and dataset names that look right and do not exist.'],
    'Open every source yourself. No link, no fact.', 'l6-2');
  tip('t-ai-teach', 'AI', '🧑‍🏫', 'Explain it back',
    ['After a lesson, write your own explanation and ask the AI to find the gaps. It is the fastest way to discover what you only think you understand.'],
    'If you cannot explain it simply, you are not ready to use it at work.', 'l0-2');
  tip('t-ai-label', 'AI', '🏷️', 'Measure before you trust the labels',
    ['Before letting AI classify 10,000 comments, label 30 yourself and compare. Report the agreement along with the results.'],
    'An unmeasured classifier is an opinion.', 'l6-3');

  /* ------------------------------------------------------------------ career */
  tip('c-decision', 'Career', '🎯', 'The first question to ask',
    ['When someone asks you for numbers, ask: "What decision will this help you make?"',
     'The answer tells you which metric matters, how precise you need to be and when to stop.'],
    'Analysts who ask this question get remembered.', 'l0-1');
  tip('c-sowhat', 'Career', '➡️', 'End every analysis with "so…"',
    ['"Delivery orders grew 40%" is a finding. "…so we should check delivery margins before promoting it more" is analysis.'],
    'If you cannot finish the sentence, you are not done.', 'l1-3');
  tip('c-case', 'Career', '🔻', '"Sales dropped 10%. Why?"',
    ['The classic interview case. Do not guess a cause. Say: first I would confirm the number and the dates, then check whether tracking changed, then split by time, region, product, channel and customer type.'],
    'Interviewers grade your structure, not your guess.', 'l8-2');
  tip('c-star', 'Career', '⭐', 'Tell stories in four beats',
    ['Situation, Task, Action, Result. One or two sentences each, and the result should have a number.',
     'Prepare one story about a mistake with data and what you changed afterwards.'],
    'Have five stories ready and you can answer most behavioural questions.', 'l8-2');
  tip('c-readme', 'Career', '📄', 'The first line of your project',
    ['Most people start a project page with the tools they used. Start with what you found: "Late deliveries come mostly from one carrier on Mondays".'],
    'A reviewer gives you about two minutes. Put the result first.', 'l7-3');
  tip('c-cv', 'Career', '🔢', 'Put a number in every line',
    ['"Responsible for reports" becomes "Built a weekly sales report for 5 stores, cutting preparation from 4 hours to 30 minutes".'],
    'Action, tool, scale, result.', 'l8-1');
  tip('c-three', 'Career', '3️⃣', 'Three projects beat fifteen',
    ['One SQL project, one in Python with some statistics, one dashboard. Each with a question, a finding, a recommendation and its limits.'],
    'Finished and explained beats numerous and half-done.', 'l7-1');
  tip('c-define', 'Career', '📐', 'Define the metric before you count',
    ['What is an "active user"? Logged in once this month? Bought something? Two teams with two definitions will report two numbers and argue for a week.'],
    'Write the definition down and put it on the dashboard.', 'l5-2');
  tip('c-edge', 'Career', '🧭', 'Your old job is an advantage',
    ['Someone who knows why the numbers matter in a hospital, a warehouse or a classroom asks better questions than a generic analyst.'],
    'Look for analyst roles in the field you already know first.', 'l0-3');
  tip('c-askwhy', 'Career', '❓', 'Ask who collected the data, and why',
    ['Every dataset was created by a process: a form, a scanner, a person in a hurry. Knowing that process explains most of its oddities.'],
    'Ten minutes with the person who enters the data is worth a day of guessing.', 'l1-1');

  /* ------------------------------------------------------------------ chart crimes (interactive) */
  chart('h-truncate', 'The bar chart that exaggerates', 'truncate',
    ['Two products scored 96 and 100. With the axis starting at 95, one bar looks five times taller than the other.'],
    'Bars show value by their length, so a bar axis must start at zero.');
  chart('h-pie', 'Too many slices', 'pie',
    ['Which is bigger, the third slice or the fourth? With eight slices nobody can tell.'],
    'To compare parts, use sorted bars. Keep pies for two or three slices.');
  chart('h-sort', 'Alphabetical order hides the story', 'sort',
    ['The same bars, sorted by name and then by value.'],
    'Sort bars by value unless the categories have a natural order, like months.');
  chart('h-rainbow', 'Every bar a different colour', 'rainbow',
    ['Colour should mean something. Here it only decorates, and the eye does not know where to look.'],
    'Grey for context, one colour for the point you are making.');
  chart('h-dual', 'Two axes, any story you like', 'dual',
    ['With two different scales you can make any two lines cross, touch or move together.'],
    'Show two charts, one above the other, with the same time axis.');

  /* ------------------------------------------------------------------ myth or fact (interactive) */
  myth('m-avg', 'Stats', 'If the average salary went up, most people are earning more.', false,
    'A few very large raises can lift the average while most salaries stay the same. Look at the median.', 'l4-1');
  myth('m-cause', 'Stats', 'A correlation of 0.9 proves that one thing causes the other.', false,
    'Strength is not cause. Both may be driven by a third factor, or the cause may run the other way.', 'l4-4');
  myth('m-big', 'Stats', 'A sample of a million people is always better than a random sample of a thousand.', false,
    'Not if the million are a biased selection. In 1936, 2.4 million answers predicted the wrong president.', 'l4-2');
  myth('m-p', 'Stats', 'p = 0.05 means there is a 95% chance the effect is real.', false,
    'It means that with no real effect, data this extreme would appear 5% of the time. It is not the probability of the hypothesis.', 'l4-3');
  myth('m-median', 'Stats', 'One enormous outlier barely moves the median.', true,
    'The median only cares about the middle value. That is why it is the safe choice for skewed data.', 'l4-1');
  myth('m-nosig', 'Stats', 'A test found "no significant difference", so there is no difference.', false,
    'It may only mean the sample was too small to see it. Absence of evidence is not evidence of absence.', 'l4-3');
  myth('m-risk', 'Stats', 'A headline says a food "doubles your risk". So the risk must be high.', false,
    'Doubling 1 in 100,000 gives 2 in 100,000. Always ask for the absolute numbers.', 'l4-1');
  myth('m-4x', 'Stats', 'To halve the margin of error you need four times as much data.', true,
    'Precision improves with the square root of the sample size, so it gets expensive quickly.', 'l4-2');
  myth('m-null', 'SQL', 'In SQL, NULL is the same as zero or an empty text.', false,
    'NULL means "unknown". It is not equal to anything, not even to another NULL. Test it with IS NULL.', 'l2-1');
  myth('m-left', 'SQL', 'A LEFT JOIN can return more rows than the left table has.', true,
    'If a left row matches several rows on the right, it is repeated once for each match.', 'l2-3');
  myth('m-count', 'SQL', 'COUNT(*) and COUNT(column) always return the same number.', false,
    'COUNT(column) skips the rows where that column is NULL.', 'l2-2');
  myth('m-line0', 'Charts', 'A line chart must always start its axis at zero.', false,
    'Bars must, because their length is the value. A line shows change, so it may zoom in, as long as the axis is clearly labelled.', 'l5-1');
  myth('m-pie10', 'Charts', 'A pie chart is a good way to compare ten categories.', false,
    'The eye compares lengths far better than angles. Use sorted bars.', 'l5-1');
  myth('m-maths', 'Career', 'You need advanced mathematics to work as a data analyst.', false,
    'Most of the job is clear thinking, basic statistics, SQL and explaining results. The advanced maths lives mostly in data science and research roles.', 'l0-1');
  myth('m-airead', 'AI', 'If AI can write the SQL, you do not need to be able to read it.', false,
    'You are the one who must check it is right, and explain it. You cannot verify what you cannot read.', 'l6-2');

  /* ------------------------------------------------------------------ quotes */
  quote('q-box', 'Stats', 'All models are wrong, but some are useful.', 'George Box, statistician',
    'A forecast or a segmentation is a simplification. Judge it by whether it helps a decision, not by whether it is true.');
  quote('q-tukey1', 'Stats', 'Far better an approximate answer to the right question than an exact answer to the wrong question.', 'John Tukey, 1962',
    'Spend the first ten minutes on the question, not on the query.');
  quote('q-tukey2', 'Charts', 'The greatest value of a picture is when it forces us to notice what we never expected to see.', 'John Tukey, 1977',
    'Chart your data before you have a theory about it.');
  quote('q-goodhart', 'Career', 'When a measure becomes a target, it ceases to be a good measure.', 'Goodhart\'s law',
    'Remember it every time you are asked to build a KPI that people will be rewarded on.');
  quote('q-holmes', 'Stats', 'It is a capital mistake to theorize before one has data.', 'Sherlock Holmes (Arthur Conan Doyle)',
    'And once you have the data, the mistake is to stop looking for evidence against your theory.');
  quote('q-coase', 'Stats', 'If you torture the data long enough, it will confess.', 'attributed to Ronald Coase, economist',
    'Trying twenty cuts of the data until one "works" is not analysis.');
  quote('q-hopper', 'Career', 'One accurate measurement is worth a thousand expert opinions.', 'attributed to Grace Hopper',
    'The politest way to end an argument in a meeting: "we could test that".');
  quote('q-deming', 'Career', 'Without data, you are just another person with an opinion.', 'attributed to W. Edwards Deming',
    'And with data but no clear message, you are a person with a spreadsheet.');

  /* ------------------------------------------------------------------ words worth knowing */
  word('w-grain', 'SQL', 'Grain', 'What one row of a table represents: one order, one order line, one customer per day.',
    'Used like this: "The grain of this table is one row per product per order."', 'l2-1');
  word('w-cardinality', 'SQL', 'Cardinality', 'How many different values a column has. A country column has low cardinality; an email column has high cardinality.',
    'It also describes relationships: one customer to many orders.', 'l2-3');
  word('w-pk', 'SQL', 'Primary key', 'The column (or columns) whose value identifies each row uniquely, such as order_id.',
    'If your "key" repeats, your joins will multiply rows.', 'l2-3');
  word('w-schema', 'SQL', 'Schema', 'The structure of the data: which tables exist, their columns, types and how they connect.',
    'It is what you can safely share with an AI: structure, no data.', 'l6-1');
  word('w-kpi', 'Career', 'KPI', 'Key performance indicator: one of the few numbers a team has agreed to judge itself by.',
    'A dashboard with 40 KPIs has none.', 'l5-2');
  word('w-cohort', 'Stats', 'Cohort', 'A group of people who share a starting point, for example everyone who signed up in March.',
    'Cohort analysis follows each group over time instead of mixing old and new customers.', 'l4-4');
  word('w-funnel', 'Career', 'Funnel', 'The steps towards a goal, with the share of people who continue at each step: visit, add to basket, pay.',
    'The biggest drop between two steps is where to look first.', 'l5-2');
  word('w-churn', 'Career', 'Churn', 'The share of customers who leave in a period.',
    'Losing 5% a month sounds small. Over a year it is nearly half of them.', 'l4-4');
  word('w-etl', 'Python', 'ETL', 'Extract, transform, load: taking data out of a source, cleaning and reshaping it, and loading it somewhere it can be analysed.',
    'Your pandas cleaning notebook is a small ETL.', 'l3-2');
  word('w-warehouse', 'SQL', 'Data warehouse', 'A database built for analysis, where data from many company systems is gathered and kept over time.',
    'Snowflake, BigQuery and Redshift are data warehouses. Analysts query them with SQL.', 'l2-1');
  word('w-dimension', 'Charts', 'Dimension and measure', 'A measure is a number you add up or average (revenue). A dimension is what you split it by (city, month).',
    'Every chart is a measure shown by one or two dimensions.', 'l5-2');
  word('w-confounder', 'Stats', 'Confounder', 'A hidden factor that influences both things you are comparing and creates a false link between them.',
    'Hot weather drives both ice-cream sales and drownings.', 'l4-4');
  word('w-percentile', 'Stats', 'Percentile', 'The value below which a given share of the data falls. The 90th percentile of delivery time is the time that 90% of deliveries beat.',
    'The median is the 50th percentile.', 'l4-1');
  word('w-yoy', 'Career', 'YoY and MoM', 'Year over year and month over month: comparing a period with the same period a year earlier, or with the previous month.',
    'YoY removes seasonality. December against November tells you little.', 'l4-4');

  DA.feedCards = cards;
  DA.feedById = {};
  cards.forEach(function (c) { DA.feedById[c.id] = c; });
  DA.feedCats = ['Stories', 'Stats', 'SQL', 'Sheets', 'Python', 'Charts', 'AI', 'Career'];
})();
