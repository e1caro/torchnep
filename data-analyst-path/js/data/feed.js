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
  // Where a card rests on documentation, src links to it (opened only when the reader taps it).
  function src(label, url) { cards[cards.length - 1].src = { label: label, url: url }; }

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

  /* ------------------------------------------------------------------ extended stories, ideas, tips, myths, quotes & glossary */
  story('s-minard-map', '🗺️', 'Six variables on one sheet of paper',
    ['In 1869 Charles Joseph Minard drew Napoleon\'s 1812 Russian campaign on a single map: army size, route, direction, rivers, dates and winter temperatures.',
     'The tan band starts at 422,000 men and returns as a thin black line of 10,000. Edward Tufte called it perhaps the best statistical graphic ever drawn.'],
    'Great visuals combine context and numbers so the cause is visible at a glance.', 'l5-3');
  story('s-cobra', '🐍', 'The cobra effect in Delhi',
    ['British officials in colonial Delhi reportedly offered a bounty for every dead cobra to reduce the snake population.',
     'Enterprising residents began breeding cobras for the reward. When the government cancelled the bounty, breeders released the worthless snakes, leaving more cobras than before.'],
    'Before launching a KPI incentive, ask how a rational person could game it.', 'l5-2');
  story('s-feynman', '🧊', 'A glass of ice water at a hearing',
    ['During the Challenger inquiry, physicist Richard Feynman dropped a piece of rubber O-ring into a glass of ice water in front of the cameras.',
     'It lost its resilience immediately. One clear physical demonstration cut through hundreds of pages of hedged management slides.'],
    'Anchor abstract numbers in one concrete, undeniable example.', 'l5-3');
  story('s-target', '🛒', 'When basket analysis knew too much',
    ['In 2012 the New York Times reported how Target\'s statistician Andrew Pole found 25 products—like unscented lotion and mineral supplements—that predicted a shopper\'s due date.',
     'The model worked so well that it sent baby coupons to a teenager before her family knew, sparking a national debate on privacy and predictive analytics.'],
    'Just because a pattern is predictive does not mean every use of it is wise.', 'l6-2');
  story('s-streetbump', '🕳️', 'The pothole map that skipped poor streets',
    ['Boston\'s Street Bump app used smartphone accelerometers to detect potholes automatically as residents drove around the city.',
     'At first it mostly mapped potholes in wealthier neighbourhoods—where more drivers owned smartphones in 2012. Working with researchers, the city corrected for device ownership.'],
    'Passive sensor data reflects who carries the sensor, not the whole population.', 'l4-2');
  story('s-ariane', '💥', '37 seconds and an overflow',
    ['In 1996 the maiden flight of the Ariane 5 rocket veered off course and self-destructed 37 seconds after launch.',
     'A 64-bit floating-point number for horizontal velocity was converted into a 16-bit signed integer reused from Ariane 4, triggering an overflow error.'],
    'Data types and numeric ranges matter: what fit yesterday\'s scale can break tomorrow\'s.', 'l1-1');
  story('s-london-whale', '🐋', 'Copy-paste in a multi-billion risk model',
    ['In 2012 JPMorgan\'s Chief Investment Office lost over $6 billion in the "London Whale" trades.',
     'An internal report later revealed that a value-at-risk Excel spreadsheet relied on manual copy-pasting and divided by a sum instead of an average, cutting perceived risk in half.'],
    'Critical models belong in tested, version-controlled code, not manual spreadsheets.', 'l1-2');
  story('s-bortkiewicz', '🐴', 'Horse kicks in the Prussian army',
    ['In 1898 Ladislaus Bortkiewicz studied how many soldiers died from horse kicks across 14 Prussian army corps over 20 years.',
     'Most corps had zero or one death a year, and the counts followed the Poisson distribution almost perfectly—showing that rare random events cluster by chance alone.'],
    'Small counts fluctuate wildly by chance; do not overreact to a single spike.', 'l4-2');
  story('s-quetelet', '📏', 'The invention of the "average man"',
    ['In the 1830s Belgian astronomer Adolphe Quetelet measured Scottish soldiers\' chests and French conscripts\' heights and noticed the bell-shaped normal curve.',
     'Later, US Air Force researcher Gilbert Daniels measured 4,063 pilots on 10 dimensions and found that zero pilots were within the middle 30% on all 10 at once.'],
    'Designing for the "average" user often fits nobody in particular.', 'l4-1');
  story('s-benford', '1️⃣', 'Dirty books caught by the first digit',
    ['In 1881 Simon Newcomb noticed that the first pages of logarithm books were far more worn than the last. Leading digit 1 appears about 30% of the time in many natural datasets, while 9 appears under 5%.',
     'Today auditors use Benford\'s law to flag invented expenses and invoice fraud, because humans guessing numbers spread digits too evenly.'],
    'Real data has fingerprints that invented numbers rarely reproduce.', 'l4-1');
  story('s-dr-fox', '🎭', 'Polished delivery, empty content',
    ['In a famous 1970 experiment, an actor introduced as "Dr Myron L. Fox" gave a charismatic lecture full of contradictions and invented jargon to a room of professionals.',
     'Audience ratings were glowing. Style and confidence had masked the lack of substance—until someone read the transcript closely.'],
    'A slick dashboard can hide a hollow metric; always check the logic underneath.', 'l5-2');
  story('s-pepsi', '🥤', 'One sip versus a whole can',
    ['In blind "Pepsi Challenge" taste tests, shoppers taking a single sip tended to prefer the sweeter cola.',
     'Author Malcolm Gladwell noted that drinking a whole can at home is a different experience from a single sip in a mall booth—a classic mismatch between test setup and real usage.'],
    'Make sure your test measures the real behaviour you care about, not a proxy.', 'l4-3');

  idea('i-pareto-8020', '⚖️', 'The 80/20 concentration check',
    ['Vilfredo Pareto noticed that roughly 80% of land in Italy was owned by 20% of the population. In business, a small share of products, customers or bugs often drives most of the total.',
     'Before treating all categories equally, sort them descending and plot cumulative share.'],
    'Focus your action where the volume actually lives.', 'l4-1');
  idea('i-mae-rmse', '🎯', 'MAE vs RMSE: how much do big misses hurt?',
    ['Mean Absolute Error (MAE) averages the size of your forecast misses. Root Mean Squared Error (RMSE) squares each miss before averaging, so one huge error dominates the score.',
     'Use MAE when a miss of 20 is twice as bad as 10; use RMSE when big misses are disastrous.'],
    'Pick the error metric that matches the real business cost of being wrong.', 'l4-1');
  idea('i-type12', '🚨', 'False alarms vs missed detections',
    ['A Type I error (false positive) cries wolf when nothing changed. A Type II error (false negative) misses a real effect because the sample was too noisy or small.',
     'Tightening one threshold loosens the other unless you collect more data.'],
    'Ask which mistake is costlier: acting on noise or missing a real shift.', 'l4-3');
  idea('i-seasonality', '🌦️', 'Seasonality vs real growth',
    ['Ice-cream sales rise every July and gym sign-ups spike every January. Comparing January to December mistakes the calendar for strategy.',
     'Compare each month with the same month last year (YoY) or use a 12-month rolling average.'],
    'Separate the rhythm of the calendar from the effect of your team\'s work.', 'l4-4');
  idea('i-novelty', '✨', 'The novelty effect in A/B tests',
    ['When you change a button\'s colour or move a menu, curious regular users click it more in the first few days—or struggle with the new layout at first.',
     'Segment results by new versus returning users and watch whether the lift fades in week two.'],
    'First-week excitement is not long-term habit.', 'l4-3');
  idea('i-ceiling', '🧱', 'Ceiling and floor effects',
    ['If 96% of customers already rate checkout 5 out of 5, no redesign can raise the score by 15%. If a metric sits near zero, it cannot fall much further.',
     'Check how much headroom a metric has before setting targets on it.'],
    'Always inspect the scale bounds before promising a percentage lift.', 'l4-1');
  idea('i-wide-long', '🔄', 'Wide tables vs long tables',
    ['A wide table puts each month in its own column (Jan, Feb, Mar) so humans can read across. A long table has one column for month and one for value.',
     'Databases, pivot tables and charting libraries almost always prefer long format.'],
    'Store and analyse data long; reshape to wide only for the final table.', 'l1-1');
  idea('i-quantile', '📊', 'Why p95 beats the average for speed',
    ['If 95% of pages load in 0.2 seconds and 5% take 12 seconds, the average looks fine while one in twenty visitors is stuck waiting.',
     'Engineering and operations teams track p90, p95 and p99 to see the worst real experience.'],
    'When tail delays hurt users, track the 90th or 95th percentile.', 'l4-1');

  tip('t-sql-coalesce', 'SQL', '🛟', 'Replace NULLs cleanly with COALESCE',
    ['COALESCE(discount, 0) returns the first non-null value. In arithmetic, 100 - NULL is NULL, so one missing discount can wipe out a whole formula.'],
    'Wrap nullable numbers in COALESCE before adding or subtracting them.', 'l2-1',
    'SELECT price - COALESCE(discount, 0) AS net_price\nFROM orders;');
  tip('t-sql-between', 'SQL', '📅', 'Be careful with BETWEEN on timestamps',
    ['WHERE created_at BETWEEN \'2025-01-01\' AND \'2025-01-31\' often stops at midnight on the 31st, dropping the whole last day of orders.',
     'Use >= start of the period and < start of the next period instead.'],
    'Half-open date ranges (>= start AND < next_start) never miss afternoon rows.', 'l2-1',
    "WHERE order_date >= '2025-01-01'\n  AND order_date <  '2025-02-01'");
  tip('t-sql-exists', 'SQL', '🔎', 'NOT EXISTS vs NOT IN with NULLs',
    ['If a subquery returns even one NULL, WHERE id NOT IN (subquery) returns zero rows in standard SQL because id <> NULL is unknown.',
     'Filter WHERE col IS NOT NULL inside the subquery, or use NOT EXISTS / LEFT JOIN.'],
    'Guard against NULLs whenever you write NOT IN.', 'l2-3');
  tip('t-sql-qualify', 'SQL', '🥇', 'Deduplicate rows with ROW_NUMBER()',
    ['When an export has duplicate customer rows, number them by latest update per customer_id and keep row_num = 1 in an outer query.'],
    'ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC) is the cleanest deduplicator.', 'l2-4',
    'WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (\n    PARTITION BY customer_id ORDER BY signup_date DESC\n  ) AS rn FROM customers\n)\nSELECT * FROM ranked WHERE rn = 1;');
  tip('t-sql-div-float', 'SQL', '➗', 'Avoid integer division traps',
    ['In SQLite and Postgres, 1 / 2 equals 0 because both numbers are integers. Multiply by 1.0 or 100.0 first so you keep the decimals.'],
    'Write 100.0 * part / total whenever you compute a percentage in SQL.', 'l2-2',
    'SELECT ROUND(100.0 * COUNT(shipped_at) / COUNT(*), 1)\nFROM orders;');
  tip('t-sql-order-null', 'SQL', '⬇️', 'Where do NULLs go when you sort?',
    ['Sorting DESC in SQLite puts numbers above NULLs, while other engines put NULLs first. Never assume: filter NULLs or push them explicitly with CASE.'],
    'When building a top-10 list, filter WHERE metric IS NOT NULL first.', 'l2-1');
  tip('t-sql-selfjoin', 'SQL', '🪞', 'Join a table to itself for pairs',
    ['To find products often bought together in the same order, join order_items a to order_items b on order_id with a.product_id < b.product_id.'],
    'Using a.id < b.id avoids pairing an item with itself or counting pairs twice.', 'l2-3',
    'SELECT a.product_id, b.product_id, COUNT(*) AS pairs\nFROM order_items a\nJOIN order_items b ON b.order_id = a.order_id\n  AND a.product_id < b.product_id\nGROUP BY 1, 2 ORDER BY pairs DESC;');

  tip('t-sh-index', 'Sheets', '🧭', 'XLOOKUP and INDEX/MATCH beat VLOOKUP',
    ['VLOOKUP breaks if someone inserts a column and cannot look to the left. XLOOKUP(key, lookup_col, return_col, "Missing") is safer and clearer.'],
    'Lookup by column reference, never by a hard-coded column count.', 'l1-2');
  tip('t-sh-trim', 'Sheets', '🧹', 'Invisible spaces break joins and lookups',
    ['"Madrid " with a trailing space does not match "Madrid". Wrap imported text keys in =TRIM(CLEAN(A2)) before matching or pivoting.'],
    'When a lookup says #N/A on a value you can see, check for trailing spaces.', 'l1-1');
  tip('t-sh-freeze', 'Sheets', '❄️', 'Freeze headers and colour inputs',
    ['Freeze row 1 so column names stay visible while scrolling. Financial analysts colour raw inputs blue and formulas black so nobody types over a formula.'],
    'Separate raw data, calculations and summary tabs in every workbook.', 'l1-2');
  tip('t-sh-named', 'Sheets', '🏷️', 'Use Tables (Ctrl+T) so ranges grow automatically',
    ['A formula pointing to A2:A500 silently misses row 501 next week. Converting the range to a Table makes formulas expand as new rows arrive.'],
    'Structured tables prevent the classic "forgot to drag the formula down" bug.', 'l1-2');
  tip('t-sh-paste', 'Sheets', '📋', 'Paste Values before sharing a snapshot',
    ['Live formulas linked to local files turn into #REF! on your manager\'s laptop. Keep your working file, and send a clean copy with values locked where needed.'],
    'Test opening your file on another machine before a big presentation.', 'l1-3');

  tip('t-py-valuecounts', 'Python', '🔢', 'normalize=True gives instant shares',
    ['df["channel"].value_counts(normalize=True, dropna=False) shows the proportion of each category—including missing values—in one line.'],
    'Add dropna=False so missing categories never hide.', 'l3-1',
    'df["channel"].value_counts(normalize=True, dropna=False).round(3)');
  tip('t-py-query-expr', 'Python', '⚡', 'Readable filtering with .query()',
    ['Instead of repeating df[df["age"] > 30 & (df["site"] == "North")], write df.query("age > 30 and site == \'North\'") for clean, SQL-like filters.'],
    'Readable code has fewer bracket bugs.', 'l3-1',
    'df.query("age > 30 and site == \'North\'")');
  tip('t-py-assign', 'Python', '⛓️', 'Chain steps cleanly with .assign()',
    ['Building a pipeline of .query().assign().groupby() avoids ten temporary df2, df3 variables that get out of sync when you re-run cells out of order.'],
    'Restart kernel and Run All before trusting any notebook result.', 'l3-2',
    ' clean = (\n    df.dropna(subset=["price"])\n      .assign(revenue=lambda x: x["qty"] * x["price"])\n)');
  tip('t-py-datetime', 'Python', '📆', 'Parse dates once with pd.to_datetime',
    ['Once a column is datetime, .dt.to_period("M"), .dt.day_name() and date filtering work vectorized without slow Python loops.'],
    'Convert date columns right after pd.read_csv.', 'l3-2',
    'df["month"] = pd.to_datetime(df["order_date"]).dt.to_period("M")');
  tip('t-py-mergevalidate', 'Python', '🛡️', 'Catch join explosions with validate=',
    ['pd.merge(orders, customers, on="customer_id", validate="many_to_one") raises an error immediately if customer_id is duplicated in customers.'],
    'One validate= argument saves hours of hunting inflated totals.', 'l3-2',
    'pd.merge(orders, customers, on="customer_id", validate="many_to_one")');
  tip('t-py-idxmax', 'Python', '🏆', 'Top row per group with sort + drop_duplicates',
    ['Sort by your metric descending, then .drop_duplicates("category") keeps the highest row in each category cleanly and fast.'],
    'Simple steps beat clever one-liners you cannot debug six months later.', 'l3-2',
    'df.sort_values("revenue", ascending=False).drop_duplicates("category")');

  tip('t-ch-direct', 'Charts', '🏷️', 'Label lines directly instead of using a legend',
    ['When a chart has three lines and a colour legend in the corner, the reader\'s eyes bounce back and forth. Put the series name right at the end of each line.'],
    'Direct labels cut eye travel and still work if printed in greyscale.', 'l5-1');
  tip('t-ch-smallmult', 'Charts', '🪟', 'Small multiples beat spaghetti charts',
    ['Ten overlapping lines on one plot look like tangled pasta. Draw ten small panels side by side on the same scale, each highlighting one series against grey context.'],
    'When a chart gets crowded, split it into small multiples.', 'l5-1');
  tip('t-ch-aspect', 'Charts', '📐', 'Aspect ratio changes how steep a trend looks',
    ['Stretching a line chart tall makes a gentle 2% rise look like a rocket; squashing it flat makes a crisis look calm. Aim for slopes around 45° ("banking to 45°").'],
    'Show the percent change in the subtitle so the geometry cannot mislead.', 'l5-1');
  tip('t-ch-annot', 'Charts', '🖊️', 'Annotate the spike right on the canvas',
    ['If orders jumped in November because a new store opened, write "Paris store opened" with a short pointer on the chart itself.'],
    'A chart with one clear annotation answers the first question before it is asked.', 'l5-3');
  tip('t-ch-colorblind', 'Charts', '🎨', 'Red-green palettes fail 1 in 12 men',
    ['About 8% of men have red-green colour vision deficiency. Pair blue with orange, or add symbols, patterns and direct value labels alongside colour.'],
    'Never rely on hue alone to tell "good" from "bad".', 'l5-1');

  tip('t-ai-tests', 'AI', '🧪', 'Ask AI for three edge-case tests',
    ['After writing a SQL query or Python function, ask: "Give me a tiny 5-row test table with NULLs, ties and zeros that could break this query."'],
    'Using AI as a ruthless QA tester makes your own code much stronger.', 'l6-2');
  tip('t-ai-rubric', 'AI', '📋', 'Give a strict rubric when classifying text',
    ['"Classify sentiment" is vague. Define each label in one sentence with two borderline examples, and include an "Unclear" bucket so the model is not forced to guess.'],
    'Clear category rules improve both human and AI agreement.', 'l6-3');
  tip('t-ai-diff', 'AI', '🔍', 'Ask AI to explain the difference between two queries',
    ['When two SQL queries return 3,180 and 3,200 rows, paste both schemas and queries and ask which 20 rows one keeps that the other drops.'],
    'Great analysts investigate every discrepancy down to concrete example rows.', 'l6-1');
  tip('t-ai-mock', 'AI', '🎤', 'Run a 10-minute mock interview with AI',
    ['Paste the job description and your project summary, then ask the AI to play a sceptical hiring manager asking one follow-up question at a time.'],
    'Practising out loud exposes weak explanations before the real interview.', 'l8-2');

  tip('t-ca-log', 'Career', '📓', 'Keep a "brag doc" of numbers you moved',
    ['Six months later you will forget how many hours your script saved or which decision your analysis changed. Write down one line every Friday with the metric.'],
    'Your future CV writes itself when you log impact as it happens.', 'l8-1');
  tip('t-ca-sanity', 'Career', '🧮', 'Do a back-of-the-envelope check first',
    ['If a café chain has 5 stores open 12 hours a day, €500 million in annual coffee sales means €27,000 an hour per store—impossible. Catching that takes 10 seconds of mental arithmetic.'],
    'Divide big totals by per-person or per-day units to see if they make physical sense.', 'l1-3');
  tip('t-ca-caveat', 'Career', '⚠️', 'State the main limitation yourself',
    ['Putting "Note: excludes refunded orders (1.8%)" on your slide builds instant trust. Waiting for someone in the room to point it out does the opposite.'],
    'Owning your data\'s limits makes stakeholders trust your conclusions more.', 'l5-3');

  myth('m-r2', 'Stats', 'A high correlation means you can accurately predict individual outcomes.', false,
    'Even at r = 0.7, half the variance is still unexplained noise—individuals scatter widely around the trend line.', 'l4-4');
  myth('m-normal', 'Stats', 'Most business metrics (spend, sessions, income) follow a normal bell curve.', false,
    'Most user metrics are heavily right-skewed: many small values and a long tail of power users.', 'l4-1');
  myth('m-distinct', 'SQL', 'Adding DISTINCT to every SELECT is a harmless safety habit.', false,
    'Blind DISTINCT hides duplicate-join bugs you need to know about and forces an expensive sort.', 'l2-3');
  myth('m-having-where', 'SQL', 'Putting a row filter in HAVING instead of WHERE gives the same speed and clarity.', false,
    'WHERE filters rows before grouping; HAVING is for group aggregates like COUNT(*) > 5.', 'l2-2');
  myth('m-3dchart', 'Charts', '3D bars and tilted pies make executive dashboards easier to read.', false,
    'Perspective distortion warps heights and angles, making accurate visual comparison harder.', 'l5-1');
  myth('m-moredata', 'Stats', 'Collecting ten times more rows fixes a biased sampling method.', false,
    'More rows only shrink random noise around the same biased average.', 'l4-2');
  myth('m-clean80', 'Career', 'Real analysts spend most of their time running complex machine-learning models.', false,
    'Most real impact comes from defining metrics, cleaning messy tables, joining data accurately and communicating clearly.', 'l0-1');
  myth('m-ab-peek', 'Stats', 'Stopping an A/B test the moment p drops below 0.05 keeps your false-positive rate at 5%.', false,
    'Repeatedly peeking and stopping early can push false positives above 20% or 30%.', 'l4-3');

  quote('q-tufte', 'Charts', 'Above all else show the data.', 'Edward Tufte, 1983',
    'Every drop of ink that does not help the reader understand the numbers is clutter to remove.');
  quote('q-nightingale', 'Stories', 'To understand God\'s thoughts we must study statistics, for these are the measure of His purpose.', 'Florence Nightingale',
    'She saw clear data not as dry bookkeeping, but as a moral tool to save lives.');
  quote('q-wald', 'Stats', 'You are counting the bullet holes on the planes that came home.', 'paraphrased from Abraham Wald, 1943',
    'Whenever you analyse active users or closed deals, ask what happened to the ones who left.');
  quote('q-feynman', 'AI', 'The first principle is that you must not fool yourself—and you are the easiest person to fool.', 'Richard Feynman, 1974',
    'Try half as hard to break your favourite finding as you did to find it.');
  quote('q-twain', 'Stats', 'Figures often beguile me, particularly when I have the arranging of them myself.', 'Mark Twain',
    'Selection of time window, baseline and denominator can flip a story without changing a single row.');
  quote('q-knuth', 'Python', 'Premature optimization is the root of all evil.', 'Donald Knuth, 1974',
    'Make your query or notebook right and readable first; optimise only when it is actually slow.');

  word('w-idempotent', 'Python', 'Idempotent', 'An operation or pipeline that produces the exact same result whether you run it once or five times in a row.',
    'A script that appends rows without checking duplicates is NOT idempotent.', 'l3-2');
  word('w-fanout', 'SQL', 'Join fan-out', 'When joining a one-row-per-order table to a many-rows-per-order table multiplies rows and inflates SUM(order_total).',
    'Always check COUNT(*) and SUM() before and after a JOIN.', 'l2-3');
  word('w-skew', 'Stats', 'Skewness', 'Asymmetry in a distribution. Right-skewed data has a long tail of high values that pulls the mean above the median.',
    'Customer spend and house prices are almost always right-skewed.', 'l4-1');
  word('w-attrition', 'Stats', 'Attrition bias', 'Distortion caused when participants or users drop out of a study or product non-randomly.',
    'If unhappy users leave in week 2, week 12 satisfaction looks artificially high.', 'l4-2');
  word('w-srm', 'Stats', 'Sample Ratio Mismatch', 'When a 50/50 A/B test ends up with, say, 52,000 users in A and 48,000 in B, signalling a tracking or redirect bug.',
    'Always check the split ratio before trusting any A/B test metric.', 'l4-3');
  word('w-granularity', 'SQL', 'Granularity', 'The level of detail in a table or chart: hourly vs daily vs monthly, or item-level vs order-level.',
    'Never mix two granularities in one sum without aggregating first.', 'l2-1');
  word('w-base-rate', 'Stats', 'Base rate', 'The overall prevalence of an event before you look at any subgroup or test result.',
    'A "99% accurate" fraud flag still produces mostly false alarms if only 1 in 10,000 orders is fraud.', 'l4-2');
  word('w-provenance', 'Career', 'Data lineage', 'Where a number came from: which source system recorded it, which scripts transformed it and which filters were applied.',
    'When two dashboards disagree, tracing lineage is how you find why.', 'l1-1');

  /* ------------------------------------------------------------------ Excel, Google Sheets, Power BI, Tableau & Python cards */
  tip('t-sh-spill', 'Sheets', '🌊', 'Spill dynamic arrays with FILTER and UNIQUE',
    ['In modern Excel and Google Sheets, one formula in the top cell can spill an entire live table that grows and shrinks automatically.'],
    'Reference a spilled range with a hash (#), like =COUNTA(F2#).', 'l1-4',
    '=SORT(UNIQUE(FILTER(Orders[City], Orders[Revenue] >= 1000, "None")))');
  tip('t-sh-let', 'Sheets', '🏷️', 'Name intermediate steps in Excel with LET()',
    ['Instead of repeating the same XLOOKUP or SUMIFS three times inside an IF formula, bind it to a short variable name with LET().'],
    'LET makes long spreadsheet formulas readable and twice as fast.', 'l1-4',
    '=LET(rev, SUM(B2:B100), cost, SUM(C2:C100), IF(rev=0, 0, (rev-cost)/rev))');
  tip('t-sh-pq-unpivot', 'Sheets', '🔄', 'Unpivot wide month columns in Power Query',
    ['When a finance report has Jan, Feb, Mar... across 12 columns, select the ID columns in Power Query and click "Unpivot Other Columns".'],
    'Never fix 12 monthly columns by hand—unpivot once and click Refresh next month.', 'l1-5');
  tip('t-sh-gs-query', 'Sheets', '🔍', 'Write SQL inside Google Sheets with QUERY()',
    ['Google Sheets has a built-in SQL engine: =QUERY(data, "SELECT B, SUM(D) WHERE E = \'Paid\' GROUP BY B ORDER BY SUM(D) DESC", 1).'],
    'Use PIVOT inside QUERY() to generate live cross-tabs in a single formula.', 'l1-6',
    '=QUERY(A1:F500, "SELECT B, SUM(D) WHERE C IS NOT NULL GROUP BY B PIVOT E", 1)');
  tip('t-sh-gs-array', 'Sheets', '⚡', 'Lock column logic with ARRAYFORMULA in Sheets',
    ['Put =ARRAYFORMULA(IF(A2:A="", "", B2:B * C2:C)) in row 2 so new rows added at the bottom are calculated automatically.'],
    'One header formula beats 5,000 dragged cells.', 'l1-6');
  tip('t-sh-sensitivity', 'Sheets', '🎛️', 'Stress-test assumptions with a 2-way table',
    ['Before presenting a revenue forecast, show a 5x5 matrix of outcomes across Price Change (-10% to +10%) and Churn Rate (2% to 6%).'],
    'Decision-makers trust a range of scenarios far more than a single point guess.', 'l1-7');

  tip('t-py-transform', 'Python', '🪞', 'Window functions in pandas with .transform()',
    ['df.groupby("region")["rev"].transform("sum") returns the regional total aligned with every original row—just like SUM() OVER (PARTITION BY region).'],
    'Divide a column by its .transform("sum") for instant within-group shares.', 'l3-4',
    'df["share"] = df["rev"] / df.groupby("region")["rev"].transform("sum")');
  tip('t-py-npselect', 'Python', '🗂️', 'Vectorized CASE WHEN in Python with np.select',
    ['Avoid slow df.apply(axis=1) loops for multi-condition tiers. Pass a list of boolean masks and labels to np.select(conds, choices, default="Other").'],
    'np.select runs at C speed and reads just like a SQL CASE statement.', 'l3-4',
    'df["tier"] = np.select([df["rev"]>=1000, df["rev"]>=250], ["VIP", "Core"], default="New")');
  tip('t-py-cohort', 'Python', '📅', 'Cohort retention heatmaps in 5 lines of pandas',
    ['Compare signup month with order month, pivot counts into a triangle matrix, and divide every column by column 0 (Month 0 cohort size).'],
    'Cohorts reveal whether product retention is improving for newer users.', 'l3-5');
  tip('t-py-seaborn', 'Python', '🎨', 'Highlight one bar and grey out the rest',
    ['Build a palette dictionary that colours your focal category in deep blue and every other bar in muted light grey, then call sns.despine().'],
    'Visual hierarchy turns a noisy chart into an instant story.', 'l3-6');
  tip('t-py-excelwriter', 'Python', '📤', 'Automate multi-tab Excel reports from Python',
    ['Use pd.ExcelWriter("weekly_kpi.xlsx") in a with-block to export Raw_Cleaned, Summary_By_Region and Exceptions tabs in one run.'],
    'Automating Monday reports frees your week for real analysis.', 'l3-7',
    'with pd.ExcelWriter("kpi_pack.xlsx") as w:\n    summary.to_excel(w, sheet_name="Summary", index=False)\n    raw.to_excel(w, sheet_name="Cleaned", index=False)');

  tip('t-ch-starschema', 'Charts', '⭐', 'Build a Star Schema before writing DAX',
    ['Split flat tables into a narrow numeric Fact table (orders) and clean Dimension tables (Calendar, Customer, Product) linked by 1-to-many relationships.'],
    'A clean Star Schema makes 90% of Power BI and Tableau calculations effortless.', 'l5-4');
  tip('t-ch-dax-calc', 'Charts', '🧮', 'CALCULATE is the superpower of Power BI DAX',
    ['CALCULATE([Total Revenue], ALL(DimProduct)) ignores the product filter in the current visual so you can divide each row by the grand total.'],
    'Always write ratios as Measures (DIVIDE), never as Calculated Columns.', 'l5-5',
    'Product Share % = DIVIDE([Total Revenue], CALCULATE([Total Revenue], ALL(DimProduct)), 0)');
  tip('t-ch-tab-pills', 'Charts', '💊', 'Tableau Blue vs Green pills: Discrete vs Continuous',
    ['Blue pills are Discrete (they draw distinct headers you can sort); Green pills are Continuous (they draw an unbroken axis).'],
    'Check pill colour first whenever a Tableau chart draws axes instead of bars.', 'l5-6');
  tip('t-ch-tab-lod', 'Charts', '🔒', 'Lock calculation grain in Tableau with FIXED LOD',
    ['{ FIXED [Customer ID] : MIN([Order Date]) } finds each customer\'s first order date regardless of which dimensions are on the sheet.'],
    'Right-click dimension filters and select "Add to Context" when they must filter a FIXED LOD.', 'l5-7',
    '{ FIXED [Customer ID] : MIN([Order Date]) }');

  myth('m-dax-col', 'Charts', 'Power BI Calculated Column ratios (Profit / Revenue) give the right total margin on a chart.', false,
    'A Calculated Column computes row by row and sums the ratios! You must write Margin % as a Measure: DIVIDE(SUM(Profit), SUM(Revenue)).', 'l5-5');
  myth('m-tab-context', 'Charts', 'In Tableau, a normal blue Dimension filter always filters rows before a { FIXED } LOD expression runs.', false,
    'FIXED LODs run BEFORE normal Dimension filters in Tableau\'s Order of Operations. Promote the filter to a grey Context Filter if it should apply first.', 'l5-7');

  word('w-star-schema', 'Charts', 'Star schema', 'A data model with a central Fact table of numeric events surrounded by Dimension tables of who, what, where and when.',
    'The gold standard for Power BI, Tableau and analytical warehouses.', 'l5-4');
  word('w-dax-context', 'Charts', 'Filter context', 'The active set of filters (from rows, columns, slicers and CALCULATE) applied before a Power BI DAX measure is evaluated.',
    'Every cell in a Power BI matrix has its own filter context.', 'l5-5');
  word('w-lod', 'Charts', 'LOD expression', 'Level of Detail expression in Tableau (FIXED, INCLUDE, EXCLUDE) that computes an aggregate at a grain different from the visual.',
    'Essential for customer acquisition cohorts and percent-of-total benchmarks.', 'l5-7');

  /* ------------------------------------------------------------------ added with the journey: course gaps, with sources */
  tip("tp-nullif", "SQL", "➗", "Divide safely with NULLIF", ["revenue / orders fails when orders is 0. revenue / NULLIF(orders, 0) returns NULL for those rows instead, and the rest of the query keeps going."], "Guard every ratio against a zero denominator.", "l2-5", "SELECT city, revenue / NULLIF(orders, 0) AS per_order\nFROM city_totals;");
  src("PostgreSQL docs: conditional expressions", "https://www.postgresql.org/docs/current/functions-conditional.html");
  tip("tp-date-trunc", "SQL", "📅", "Group by month without mixing the years", ["EXTRACT(month FROM d) gives 1 to 12, so January 2025 and January 2026 land in the same bucket. DATE_TRUNC('month', d) keeps the year. In SQLite, strftime('%Y-%m', d) does the same."], "A time bucket must include the year.", "l2-5", "SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)\nFROM tickets\nGROUP BY 1;");
  src("PostgreSQL docs: date/time functions", "https://www.postgresql.org/docs/current/functions-datetime.html");
  myth("m-union", "SQL", "UNION and UNION ALL return the same rows.", false, "UNION removes duplicate rows; UNION ALL keeps every row and is faster. Stacking two months of events? You want UNION ALL, or repeated events disappear.", "l2-5");
  tip("tp-retention-sql", "SQL", "📆", "Day-7 retention in one query", ["Find each user's first day, then check whether they came back exactly 7 days later. Divide the users who returned by the size of their starting group."], "Compare groups at the same age, not on the same calendar date.", "l2-6", "WITH f AS (SELECT user_id, MIN(day) AS d0 FROM events GROUP BY user_id)\nSELECT f.d0, COUNT(DISTINCT e.user_id) * 1.0 / COUNT(DISTINCT f.user_id) AS d7\nFROM f LEFT JOIN events e ON e.user_id = f.user_id AND e.day = f.d0 + 7\nGROUP BY f.d0;");
  tip("tp-funnel-sql", "SQL", "🔻", "Count a funnel with one row per user", ["Give each user one row with a 0/1 flag per step: visited, signed_up, paid. Then SUM each flag. Divide every step by the one before it to see where people leave."], "Step-to-step rates show the leak; the overall rate hides it.", "l2-6", "SELECT SUM(visited) AS visits, SUM(signed_up) AS signups, SUM(paid) AS buyers\nFROM user_steps;");
  tip("tp-trim-lower", "SQL", "🧽", "Normalise labels before you group them", ["\" Email\", \"email\" and \"EMAIL\" become three groups. GROUP BY LOWER(TRIM(channel)) merges them. Better still, clean the column once so every later query agrees."], "Clean labels before you count them.", "l2-5", "SELECT LOWER(TRIM(channel)) AS channel, COUNT(*)\nFROM tickets\nGROUP BY 1;");
  word("w-anti-join", "SQL", "Anti-join", "A join that keeps the rows of one table that have no match in the other: LEFT JOIN ... WHERE right.id IS NULL, or NOT EXISTS.", "Customers who never ordered, or tickets with no reply.", "l2-3");
  tip("tp-pq-steps", "Sheets", "🔁", "Clean once, refresh every month", ["Power Query records each cleaning step: remove columns, trim text, change types. Next month, drop in the new file and press Refresh, and the same steps run again with no copy and paste."], "If you clean the same file twice, record it as a query.", "l1-5");
  src("Microsoft Learn: what is Power Query?", "https://learn.microsoft.com/en-us/power-query/power-query-what-is-power-query");
  tip("tp-pq-types", "Sheets", "🔢", "Set data types as a step", ["Numbers stored as text add up to zero and sort wrongly. In Power Query, set each column's type as a step: whole number, decimal, date or text. Bad values then show up as errors you can count, not as silent zeros."], "Fix types where the data comes in.", "l1-5");
  src("Microsoft Learn: data types in Power Query", "https://learn.microsoft.com/en-us/power-query/data-types");
  tip("tp-countifs", "Sheets", "🎯", "COUNTIFS: every condition must hold", ["=COUNTIFS(B:B, \"chat\", C:C, \"high\") counts rows that are chat and high priority. For chat or email, add two COUNTIFS together, as long as no row can match both."], "Several conditions in one COUNTIFS mean AND.", "l1-2", "=COUNTIFS(B:B, \"chat\", C:C, \"high\")");
  tip("tp-sumifs-dates", "Sheets", "🗓️", "SUMIFS between two dates", ["=SUMIFS(C:C, A:A, \">=\"&F1, A:A, \"<\"&F2) adds revenue from the date in F1 up to, but not including, F2. Using < with the next start date keeps the last day whole, even when cells hold times."], "Join the operator and the cell with &.", "l1-2", "=SUMIFS(C:C, A:A, \">=\"&F1, A:A, \"<\"&F2)");
  tip("tp-pivot-share", "Sheets", "🥧", "Show shares inside the pivot", ["Open Value Field Settings, then Show Values As, and pick % of Grand Total or % of Column Total. You get shares without a helper column, and they stay right when a filter changes."], "Shares belong in the pivot, not in a hand-made column.", "l1-2");
  tip("tp-xl-dupes", "Sheets", "👯", "Look at duplicates before you delete them", ["=COUNTIF(A:A, A2) > 1 flags every ID that appears more than once. Filter on TRUE and read the pairs: true duplicates, or two real orders that share an ID by mistake?"], "Decide what a duplicate is before removing it.", "l1-1", "=COUNTIF(A:A, A2) > 1");
  myth("m-iferror", "Sheets", "Wrapping every formula in IFERROR makes a workbook safer.", false, "It hides real mistakes too, such as a wrong range. Use IFERROR only where a miss is expected, like a lookup that may find nothing, and show a clear message.", "l1-7");
  tip("tp-pivot-table", "Python", "🧮", "pivot_table: a spreadsheet pivot in one line", ["df.pivot_table(index=\"city\", columns=\"month\", values=\"revenue\", aggfunc=\"sum\", fill_value=0) gives cities as rows and months as columns. fill_value=0 shows empty months as 0 instead of NaN."], "index is the rows, columns the columns, aggfunc the how.", "l3-3");
  src("pandas docs: DataFrame.pivot_table", "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.pivot_table.html");
  tip("tp-errors-coerce", "Python", "🚫", "Count the values that failed to convert", ["pd.to_numeric(df[\"amount\"], errors=\"coerce\") turns values it cannot read into NaN. Find the ones that were not empty before, and read a few before you drop or fix them."], "A quiet conversion can hide bad rows: count them.", "l3-8", "bad = pd.to_numeric(df[\"amount\"], errors=\"coerce\").isna() & df[\"amount\"].notna()\ndf.loc[bad, \"amount\"].head()");
  src("pandas docs: to_numeric", "https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html");
  tip("tp-py-cut", "Python", "🪣", "Bucket numbers with pd.cut", ["pd.cut(df[\"age\"], bins=[0, 25, 40, 65, 120]) turns ages into groups you can count and chart. Each bin includes its right edge, so 25 falls in the first group. Add labels= to name them."], "Check which edge of each bin is included.", "l3-3", "df[\"band\"] = pd.cut(df[\"age\"], bins=[0, 25, 40, 65, 120], include_lowest=True)");
  src("pandas docs: cut", "https://pandas.pydata.org/docs/reference/api/pandas.cut.html");
  tip("tp-py-contains", "Python", "🔍", "Search text with .str.contains", ["df[df[\"comment\"].str.contains(\"refund\", case=False, na=False)] keeps comments that mention refund in any case. na=False treats missing comments as no match instead of an error."], "Set case and na on purpose when you search text.", "l3-4");
  tip("tp-py-shift", "Python", "⏮️", "Compare with last month using shift", ["After sorting by month, monthly[\"revenue\"].shift(1) puts last month next to this one, and .pct_change() gives the growth rate. Forget the sort and the comparison is meaningless."], "Sort first, then shift.", "l3-5", "monthly = monthly.sort_values(\"month\")\nmonthly[\"growth\"] = monthly[\"revenue\"].pct_change()");
  myth("m-dropna", "Python", "df.dropna() is a safe first cleaning step.", false, "It drops every row with any missing value, which can remove most of the data and bias what is left. Check df.isna().sum() first and decide column by column.", "l3-8");
  word("w-nan", "Python", "NaN", "Not a Number: pandas' marker for a missing numeric value. Most methods skip it, so sums and means quietly ignore those rows.", "df[\"qty\"].mean() averages only the rows that have a qty.", "l3-8");
  tip("tp-pbi-app", "Charts", "📦", "Share Power BI work with an app", ["Build in a workspace, then publish an app for readers. They get a stable, read-only version while you keep editing, and you update the app when the changes are ready."], "Workspaces are for builders; apps are for readers.", "l5-8");
  src("Microsoft Learn: publish an app in Power BI", "https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-create-distribute-apps");
  tip("tp-gateway", "Charts", "🌉", "Why scheduled refresh needs a gateway", ["The Power BI service runs in the cloud. To refresh data that lives inside your office network, it needs an on-premises data gateway: a small service on a machine that can reach both."], "Cloud sources refresh directly; on-premises ones need a gateway.", "l5-8");
  src("Microsoft Learn: on-premises data gateway", "https://learn.microsoft.com/en-us/power-bi/connect-data/service-gateway-onprem");
  tip("tp-rls", "Charts", "🛡️", "Row-level security in two steps", ["In Power BI Desktop, create a role with a DAX filter such as [plan] = \"Pro\" and test it with View as. In the service, add people or groups to the role.", "RLS limits Viewers only: workspace Admins, Members and Contributors still see every row."], "Test every role before you share, and keep readers as Viewers.", "l5-8");
  src("Microsoft Learn: row-level security with Power BI", "https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security");
  tip("tp-storage", "Charts", "💾", "Import or DirectQuery?", ["Import copies the data into the model: fast visuals, refreshed on a schedule. DirectQuery asks the source each time: current data, but slower and limited by the source. Dual lets a table act as either."], "Choose Import unless you truly need live data.", "l5-9");
  src("Microsoft Learn: storage mode in Power BI Desktop", "https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-storage-mode");
  tip("tp-perf", "Charts", "⏲️", "Find the slow visual", ["In Power BI Desktop, open Performance analyzer, start recording and refresh the visuals. Each one shows its DAX query time and render time. Fix the slowest first; often it is a table with too many rows."], "Measure before you optimise.", "l5-9");
  src("Microsoft Learn: Performance analyzer", "https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-performance-analyzer");
  tip("tp-rankx", "Charts", "🏅", "RANKX needs ALL", ["RANKX(ALL(Sales[city]), [Revenue]) ranks each city against every city. Without ALL, each row sees only its own city, so every rank comes out as 1."], "Rank against a table that ignores the row filter.", "l5-9", "City rank = RANKX(ALL(Sales[city]), [Revenue])");
  src("Microsoft Learn: RANKX", "https://learn.microsoft.com/en-us/dax/rankx-function-dax");
  tip("tp-relate", "Charts", "🔀", "Tableau: relate before you join", ["A relationship keeps tables separate and combines them only for the fields in the view, each at its own level. A join flattens them first, which can repeat rows and inflate sums."], "Relate by default; join only when you need one flat table.", "l5-10");
  src("Tableau Help: relate your data", "https://help.tableau.com/current/pro/desktop/en-us/relate_tables.htm");
  word("w-blend", "Charts", "Data blending", "Combining two Tableau data sources in one view on a shared field. The primary source sets the rows; the secondary adds matching, aggregated values.", "Sales from a database and targets from a spreadsheet, linked on month.", "l5-10");
  src("Tableau Help: blend your data", "https://help.tableau.com/current/pro/desktop/en-us/multiple_connections.htm");
  word("w-extract", "Charts", "Extract", "A saved snapshot of a data source in Tableau, refreshed on a schedule. Usually faster than a live connection, and it works without access to the source.", "A daily dashboard on an extract that refreshes every night.", "l5-10");
  src("Tableau Help: extract your data", "https://help.tableau.com/current/pro/desktop/en-us/extracting_data.htm");
  tip("tp-ai-check", "AI", "🔎", "Three checks for AI-written SQL", ["Read the joins: are the keys right, and could rows repeat? Read the filters: right dates, right statuses? Then compare one number with a source you trust. Running without errors proves only the syntax."], "Check joins, filters and one known number.", "l6-2");
  myth("m-ai-cite", "AI", "If an AI answer names a function, that function exists.", false, "Models can produce plausible names that do not exist. Check the official documentation, or run it on a tiny example, before you build on it.", "l6-2");
  tip("tp-ai-sample", "AI", "🎲", "Check AI labels with a random sample", ["When AI sorts comments into themes, read 20 random comments per theme and count the misfits. Five wrong out of 20 means about a quarter of that theme may be wrong, which changes how you report it."], "A counted sample beats a confident summary.", "l6-3");
  word("w-hallucination", "AI", "Hallucination", "An AI output that sounds right but is not backed by data or sources, such as an invented number, quote or function.", "\"Sales grew 12%\" with no query behind it.", "l6-2");
  tip("tp-ai-log", "AI", "📓", "Keep a two-line AI log", ["For each analysis, note what the AI drafted, what you changed and how you checked it. A reviewer can then trust the work, and you can repeat it next month."], "If you cannot say how you checked it, it is not checked.", "l6-4");
  tip("tp-ai-copilot", "AI", "🤖", "AI inside BI tools: draft, then verify", ["Assistants in Power BI and Tableau can draft a measure, a page or a summary of a chart. Treat each one as a colleague's first draft: test the measure against a known total and check the summary against the chart."], "Generated does not mean checked.", "l6-4");
  src("Microsoft Learn: Copilot in Power BI", "https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction");
  idea("i-power", "🔋", "Power: will your test see the effect?", ["Power is the chance that a test detects an effect that is really there. Many teams plan for 80%. Below that, a real improvement can easily end up looking like \"no difference\"."], "Work out the sample size before the test, not after.", "l4-5");
  src("Evan Miller: sample size calculator", "https://www.evanmiller.org/ab-testing/sample-size.html");
  idea("i-mde", "🔬", "Minimum detectable effect", ["Before a test, pick the smallest lift worth acting on, say 1 point of conversion. With your baseline rate and traffic, that choice sets how long the test must run. If the answer is six months, test a bolder change."], "Choose the effect you care about before you start.", "l4-5");
  idea("i-multiple", "🎰", "Twenty metrics, one lucky win", ["At a 5% false positive rate, checking 20 independent metrics gives about a 64% chance that at least one looks significant by luck alone. Name one primary metric in advance and treat the others as clues."], "More metrics, more false alarms.", "l4-5");
  idea("i-ci-width", "↔️", "Read the interval, not only the point", ["\"Conversion up 2 points (95% interval −1 to +5)\" means the true change could be a small loss or a big win. Report the interval so people can see how sure you are."], "An interval that crosses zero means \"not sure yet\".", "l4-2");
  idea("i-iqr", "📦", "The 1.5 × IQR rule", ["The interquartile range (IQR) is Q3 − Q1, the middle half of the data. Values below Q1 − 1.5×IQR or above Q3 + 1.5×IQR are flagged as possible outliers. Many box plots draw their whiskers this way."], "Flag, then investigate. Do not delete by rule.", "l4-1");
  idea("i-slope", "📈", "Reading a regression slope", ["In sales = 50 + 3 × spend, the slope says each extra unit of spend goes with 3 more units of sales, on average, in this data. It describes a link; only an experiment or a careful design can show cause."], "A slope is a rate of change, not proof of cause.", "l4-4");
  tip("tp-assume", "Career", "🗣️", "Say your assumptions out loud", ["In a live SQL task, unclear wording is often deliberate. Say \"I will treat cancelled orders as not revenue\", then solve it. You show judgement, and the interviewer can correct you early."], "A stated assumption beats a silent guess.", "l8-2");
  tip("tp-first-90", "Career", "🗓️", "Your first month as an analyst", ["Learn who decides what, where the data comes from and which reports people trust. Rebuild one existing number and match it before you publish new ones."], "Match the known numbers before you change them.", "l8-3");
  tip("tp-cv-numbers", "Career", "🔢", "Put a result in each CV bullet", ["\"Built a weekly report\" is a task. \"Built a weekly Excel report that cut preparation from 4 hours to 30 minutes\" is a result. Use time saved, errors caught, money or people reached."], "Action, tool, result: one line each.", "l8-1");

  DA.feedCards = cards;
  DA.feedById = {};
  cards.forEach(function (c) { DA.feedById[c.id] = c; });
  DA.feedCats = ['Stories', 'Stats', 'SQL', 'Sheets', 'Python', 'Charts', 'AI', 'Career'];
})();
