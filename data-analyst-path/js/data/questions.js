/* Extra practice questions for the Practice section (the 29 lesson quizzes are added automatically).
 *
 * Q(category, question, correct answer, [three wrong answers], explanation, optional code)
 * The correct answer is written first here; the app shuffles the options every time a question is shown.
 * Categories match the module categories used by the prompt library.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var list = [];
  function Q(cat, q, right, wrong, why, code) {
    list.push({ id: 'x' + (list.length < 9 ? '0' : '') + (list.length + 1), cat: cat, q: q, code: code || '', options: [right].concat(wrong), answer: 0, why: why });
  }

  /* ---------- SQL ---------- */
  Q('SQL', 'A table has 5 rows and the column city is NULL in 2 of them. What does COUNT(city) return?', '3', ['5', '2', '0'],
    'COUNT(column) skips NULLs. COUNT(*) would return 5.');
  Q('SQL', 'Which query correctly lists the cities with more than 100 orders?', 'SELECT city, COUNT(*) FROM orders GROUP BY city HAVING COUNT(*) > 100;',
    ['SELECT city, COUNT(*) FROM orders WHERE COUNT(*) > 100 GROUP BY city;', 'SELECT city FROM orders HAVING city > 100;', 'SELECT city, COUNT(*) FROM orders ORDER BY COUNT(*) > 100;'],
    'Aggregates cannot be used in WHERE (it runs before grouping). Filter groups with HAVING.');
  Q('SQL', 'What does WHERE discount = NULL return?', 'No rows at all, even when discount is NULL', ['Only the rows where discount is NULL', 'All rows', 'An error in every database'],
    'NULL is never equal to anything, not even NULL. Use WHERE discount IS NULL.');
  Q('SQL', 'customers has 4 rows. Customer 1 has 3 orders, customer 2 has 1 order, customers 3 and 4 have none. How many rows does customers LEFT JOIN orders return?', '6', ['4', '5', '8'],
    'Customer 1 gives 3 rows, customer 2 gives 1, and customers 3 and 4 each give one row with NULLs: 3 + 1 + 1 + 1 = 6.');
  Q('SQL', 'Same tables as before: how many rows does customers INNER JOIN orders return?', '4', ['6', '2', '8'],
    'Only customers with at least one matching order survive: 3 + 1 = 4 rows.');
  Q('SQL', 'In which order does SQL logically evaluate a query?', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
    ['SELECT → FROM → WHERE → GROUP BY → ORDER BY', 'WHERE → FROM → SELECT → GROUP BY → HAVING', 'FROM → SELECT → WHERE → HAVING → GROUP BY'],
    'That is why you cannot use a SELECT alias inside WHERE, and why HAVING can use aggregates.');
  Q('SQL', 'Each order row must keep its own line but also show its store\'s total revenue. Which tool fits?', 'SUM(revenue) OVER (PARTITION BY store_id)',
    ['GROUP BY store_id', 'SELECT DISTINCT store_id', 'HAVING SUM(revenue)'],
    'A window function adds the group total to every row without collapsing rows. GROUP BY would return one row per store.');
  Q('SQL', 'What does COUNT(DISTINCT customer_id) over the orders table count?', 'How many different customers placed at least one order', ['The number of orders', 'The number of customers in the customers table', 'The number of NULL customer ids'],
    'DISTINCT removes repeated values before counting.');
  Q('SQL', 'Which clause returns the 3 most expensive products?', 'ORDER BY price DESC LIMIT 3', ['ORDER BY price LIMIT 3', 'WHERE price = MAX(price) LIMIT 3', 'GROUP BY price LIMIT 3'],
    'Sort from high to low, then keep the first 3 rows. Without DESC you would get the cheapest.');
  Q('SQL', 'You join orders (one row per order, with an order_total column) to order_items (several rows per order) and then SUM(order_total). The total is far too high. Why?', 'Each order row is repeated once per item, so its total is counted several times',
    ['SUM only works with GROUP BY', 'order_items has NULLs', 'INNER JOIN always doubles numbers'],
    'This is a join fan-out. Aggregate at the right grain: sum the item-level values, or aggregate before joining.');
  Q('SQL', 'Which value matches name LIKE \'Ch%\'?', 'Chai Latte', ['Latte Chai', 'Cookie', 'Cappuccino'],
    '% means "any characters", so the text must START with Ch. Latte Chai does not.');
  Q('SQL', 'Which expression labels orders above 50 as \'big\' and the rest as \'small\'?', "CASE WHEN total > 50 THEN 'big' ELSE 'small' END", ["IF total > 50 THEN 'big'", "SELECT 'big' WHEN total > 50", "total > 50 ? 'big' : 'small'"],
    'CASE WHEN … THEN … ELSE … END is the standard SQL way.');
  Q('SQL', 'How do you find duplicated email addresses in a customers table?', 'GROUP BY email HAVING COUNT(*) > 1', ['WHERE email = DISTINCT', 'ORDER BY email LIMIT 1', 'SELECT email WHERE COUNT(email) > 1'],
    'Group by the value, count the rows in each group, and keep the groups with more than one.');
  Q('SQL', 'What is the main benefit of a CTE (WITH … AS)?', 'It names a sub-query, so a long query reads as clear steps', ['It makes every query faster', 'It permanently stores the result in the database', 'It replaces JOINs'],
    'CTEs are mostly about readability and reuse within one query.');
  Q('SQL', 'LAG(revenue) OVER (ORDER BY month) returns, for each row…', 'the revenue of the previous row in month order', ['the largest revenue so far', 'the next month\'s revenue', 'the average revenue'],
    'LAG looks back one row (LEAD looks forward). Useful for month-over-month change.');
  Q('SQL', 'You combine two customer lists and want to keep duplicate rows. Which do you use?', 'UNION ALL', ['UNION', 'INTERSECT', 'JOIN'],
    'UNION removes duplicates, UNION ALL keeps every row (and is faster).');

  /* ---------- Python ---------- */
  Q('Python', 'What does df[df["qty"] > 2] return?', 'Only the rows where qty is greater than 2', ['The qty column with values above 2', 'The number of rows with qty above 2', 'It changes qty to 2'],
    'A boolean condition inside the brackets filters rows.', 'df[df["qty"] > 2]');
  Q('Python', 'What does df["price"].isna().sum() give you?', 'How many missing values the price column has', ['The total of all prices', 'The rows where price is zero', 'The column\'s data type'],
    'isna() gives True/False per row, and sum() counts the Trues.');
  Q('Python', 'What does this code compute?', 'One revenue total per city', ['The revenue of every row', 'The number of cities', 'The average revenue per row'],
    'groupby splits the rows by city, then sum() collapses each group to one number.', 'df.groupby("city")["revenue"].sum()');
  Q('Python', 'In pd.merge(a, b, on="id", how="left"), which rows are kept?', 'All rows of a, plus matching data from b (NaN when there is no match)', ['Only rows present in both', 'All rows of b', 'Rows of a that have no match'],
    'It behaves like SQL LEFT JOIN.');
  Q('Python', 'What does df.dropna() do by default?', 'Drops every row that has at least one missing value', ['Drops columns with missing values', 'Fills missing values with 0', 'Drops rows only if all values are missing'],
    'Check how many rows would go before dropping: it can remove a lot, and can bias your results.');
  Q('Python', 'What does pd.to_numeric(s, errors="coerce") do with the text "N/A"?', 'Turns it into NaN (a missing value) instead of raising an error', ['Turns it into 0', 'Leaves it as text', 'Stops the program with an error'],
    'coerce is handy for cleaning, but count the NaNs it creates so you know what was lost.');
  Q('Python', 'Which call shows count, mean, standard deviation, min, quartiles and max for numeric columns?', 'df.describe()', ['df.info()', 'df.shape', 'df.head()'],
    'describe() is the fastest numeric summary. info() shows types and non-null counts.');
  Q('Python', 'How do you sort a DataFrame by revenue, highest first?', 'df.sort_values("revenue", ascending=False)', ['df.sort("revenue", desc=True)', 'df.order_by("revenue")', 'df.sort_values("revenue")'],
    'sort_values sorts ascending by default, so set ascending=False.');

  /* ---------- Statistics ---------- */
  Q('Statistics', 'Order values: 2, 3, 4 and 100. Which statement is right?', 'The median (3.5) describes a typical order better than the mean (27.25)', ['The mean is always the best summary', 'The median is 27.25', 'Both are about 27'],
    'One huge value drags the mean up. The median is robust to outliers.');
  Q('Statistics', 'A 95% confidence interval for a conversion rate is 3.1% to 4.9%. The best reading?', 'The true rate is plausibly between 3.1% and 4.9%', ['95% of customers convert between 3.1% and 4.9%', 'The rate is exactly 4%', 'There is a 95% chance the next visitor converts'],
    'The interval describes uncertainty about the true rate, not the spread of individual customers.');
  Q('Statistics', 'An A/B test gives p = 0.20. The best conclusion?', 'The data are compatible with no difference: you cannot claim an effect (and it does not prove there is none)', ['B is 20% better', 'There is a 20% chance the test is wrong', 'A and B are proven identical'],
    'A large p-value means "not enough evidence", not "no effect". A bigger sample may tell more.');
  Q('Statistics', 'You check an A/B test every day and stop as soon as p < 0.05 appears. What is the problem?', 'It inflates false positives: with enough peeks, chance alone will cross 0.05', ['Nothing, this is the correct method', 'p-values cannot be calculated daily', 'It makes the test too slow'],
    'Decide the sample size or duration in advance, or use methods designed for sequential testing.');
  Q('Statistics', 'A 5-person survey says 80% like the product. What is the main problem?', 'The sample is tiny, so the uncertainty is huge', ['80% is too low', 'Surveys never work', 'Percentages cannot be used with 5 people'],
    '4 of 5 could easily be 2 of 5 or 5 of 5 next time. Report the interval and get more data.');
  Q('Statistics', 'You survey only customers who answered a post-purchase email. What is the biggest risk?', 'Selection (non-response) bias: people who answer differ from those who do not', ['Rounding errors', 'Too much data', 'The mean is not defined'],
    'A big biased sample can be confidently wrong. Ask who is missing.');
  Q('Statistics', 'Price and demand have a correlation of r = −0.8. What does it mean?', 'A strong negative linear relationship: when price is higher, demand tends to be lower', ['Price causes demand to fall by 80%', 'The relationship is weak', 'Demand is 80% of price'],
    'Correlation measures association and direction. It says nothing about cause or the size of the effect.');
  Q('Statistics', 'Conversion goes from 4% to 5%. Which statement is correct?', 'Up 1 percentage point, or 25% in relative terms', ['Up 1%', 'Up 5%', 'Up 20%'],
    'Percentage points are absolute differences; relative change is (5 − 4) / 4 = 25%.');
  Q('Statistics', 'Most orders are €30 to €80, then you see one order of €50,000. What do you do first?', 'Investigate: is it a typo, a test order, or a real order?', ['Delete it immediately', 'Keep it and report the mean', 'Replace it with the average'],
    'Errors are fixed, real values are kept (and reported with and without). Never delete blindly.');
  Q('Statistics', 'Two teams both average 70 points. Team A has a standard deviation of 2, Team B of 15. Which is true?', 'Team B\'s results vary much more from game to game', ['Team B is better', 'Team A scored fewer points', 'The standard deviation does not matter'],
    'Same centre, very different spread. Always look at both.');
  Q('Statistics', 'A treatment looks better than the control within every subgroup, yet looks worse overall. What can explain this?', 'The subgroups have very different sizes in each arm (Simpson\'s paradox)', ['The data must be fake', 'Statistics is unreliable', 'A mistake in the t-test'],
    'Aggregating over unevenly mixed groups can reverse a trend. Always check subgroups and confounders.');

  /* ---------- Spreadsheets ---------- */
  Q('Spreadsheets', 'What does =SUMIFS(C:C, A:A, "Madrid") do?', 'Adds the values of column C on the rows where column A equals Madrid', ['Counts the rows with Madrid', 'Adds all of column C', 'Finds the first Madrid in column A'],
    'SUMIFS(sum range, criteria range, criterion).');
  Q('Spreadsheets', 'In a pivot table showing revenue per month for each category, where do the fields go?', 'Month in rows, category in columns, revenue in values', ['Revenue in rows, month in values', 'Everything in filters', 'Category in values, month in columns, revenue in rows'],
    'Rows and columns are the dimensions you group by. Values is what you add up.');
  Q('Spreadsheets', 'Which setting makes VLOOKUP return only exact matches?', 'FALSE (or 0) as the last argument', ['TRUE as the last argument', 'Sorting the table', 'Using a bigger range'],
    'The default approximate match can silently return wrong values on unsorted data.');
  Q('Spreadsheets', 'A column of dates is left-aligned and cannot be grouped by month. The likely cause?', 'The dates are stored as text, not as real dates', ['The column is too narrow', 'The file is too large', 'The pivot table is broken'],
    'Convert them (DATEVALUE, Text to Columns or Power Query) so the spreadsheet understands them.');
  Q('Spreadsheets', 'You copy a formula down and want one cell to stay fixed. How do you write it?', '$B$2', ['B2', '#B2#', 'B$2$'],
    '$ locks the column and/or row. $B$2 never moves when you copy the formula.');
  Q('Spreadsheets', 'Which layout is tidy?', 'One row per order with columns date, city, product and qty', ['One column per month (Jan, Feb, Mar…) with totals at the bottom', 'Merged header cells with colour-coded rows', 'Several small tables stacked on one sheet'],
    'Tidy data: one observation per row, one variable per column, one value per cell.');

  /* ---------- Visualization ---------- */
  Q('Visualization', 'You must compare revenue across 12 product categories. The best chart?', 'Horizontal bars sorted by value', ['A pie chart with 12 slices', 'A 3D column chart', 'A line chart'],
    'Bars on a common baseline are easy to compare, and sorting makes the ranking obvious.');
  Q('Visualization', 'You want to see how order values are distributed. The best chart?', 'A histogram', ['A pie chart', 'A line chart over time', 'A stacked bar by city'],
    'A histogram shows shape, skew and outliers.');
  Q('Visualization', 'Which chart shows the relationship between ad spend and sales per campaign?', 'A scatter plot', ['A pie chart', 'A stacked bar', 'A histogram'],
    'Two numeric variables per point call for a scatter plot.');
  Q('Visualization', 'Why should a bar chart start at zero?', 'Bar length encodes the value, so a cut axis exaggerates differences', ['Because software requires it', 'To save space', 'Because bars must be blue'],
    'Line charts can use a non-zero axis because they show change, not length.');
  Q('Visualization', 'What is the best use of colour in a chart?', 'Grey for context and one accent colour for the point you want people to see', ['A different bright colour for every bar', 'A rainbow gradient', 'Red for everything important'],
    'Colour should carry meaning, not decoration.');
  Q('Visualization', 'Why are dual-axis charts risky?', 'The two scales can be chosen to suggest a relationship that is not there', ['They need more data', 'They cannot show lines', 'They are always wrong'],
    'Use two charts or index both series to 100 at the start instead.');
  Q('Visualization', 'Which chart title is best?', 'Delivery orders grew 40% in 2025 while margins fell', ['Orders by channel', 'Chart 3', 'Sales data (2025)'],
    'A title that states the insight tells the reader what to see.');

  /* ---------- AI workflow ---------- */
  Q('AI workflow', 'AI wrote SQL that uses a column order_value that does not exist in your table. The most likely cause?', 'It guessed your schema. Give it the real table and column names', ['Your database is broken', 'SQL does not support that column name', 'The AI is too old'],
    'Models fill gaps with plausible guesses. The schema removes the gaps.');
  Q('AI workflow', 'What can you safely paste into a public AI chat?', 'Table and column names and a few invented example rows', ['A customer export with names and emails', 'Your company\'s unreleased sales figures', 'Patient or student records'],
    'Share structure, not data. Anonymise or invent examples.');
  Q('AI workflow', 'An AI-written analysis says revenue grew 12%. What is the best first check?', 'Recalculate the figure independently (a pivot or a simple SUM) and compare', ['Ask the AI if it is sure', 'Trust it because it ran without errors', 'Check only the formatting'],
    'An independent calculation does not share the AI\'s blind spots.');
  Q('AI workflow', 'Why ask the AI to list its assumptions?', 'Hidden assumptions are where analyses go wrong, and listing them lets you check them', ['It makes the answer longer', 'It is required by the tool', 'It improves the AI\'s grammar'],
    'Assumptions you can see are assumptions you can test.');
  Q('AI workflow', 'You are stuck on an error. Which prompt helps you learn the most?', 'Here is my query and the error. Don\'t give the solution, give a hint and explain the cause', ['Fix this', 'Write the whole project for me', 'Why is SQL so hard?'],
    'Your own attempt plus a hint keeps the learning with you.');
  Q('AI workflow', 'You use AI to label 10,000 comments. What tells you whether it is good enough?', 'Its agreement with a sample you labelled yourself', ['How confident the AI sounds', 'How fast it finishes', 'The length of its explanations'],
    'Measure accuracy on a human-labelled sample before trusting the rest.');
  Q('AI workflow', 'What is an AI "hallucination"?', 'Confident output that is wrong or invented, such as a made-up column or statistic', ['A slow response', 'A formatting error', 'A security warning'],
    'It is why verification is part of the workflow.');

  /* ---------- Career ---------- */
  Q('Career', 'What is the best way to open a portfolio project README?', 'With the key finding in one sentence', ['With a list of installed libraries', 'With your life story', 'With the raw data'],
    'Reviewers give you about two minutes. Show the result first.');
  Q('Career', 'What does STAR stand for in behavioural interviews?', 'Situation, Task, Action, Result', ['Skill, Team, Attitude, Reward', 'Start, Test, Adjust, Repeat', 'Strategy, Target, Analysis, Report'],
    'It gives your stories a clear shape. Always end with the result.');
  Q('Career', '"Sales dropped 10%. Why?" What is your first move in the interview?', 'Clarify the metric and time frame, then segment (time, region, product, channel) and check data quality', ['Suggest a discount', 'Say you need more data and stop', 'Blame the economy'],
    'Structure shows how you think. Solutions come last.');
  Q('Career', 'Which CV bullet is strongest for a junior analyst?', 'Built a weekly sales report for 5 stores in Excel, cutting preparation time from 4 hours to 30 minutes', ['Responsible for reporting', 'Good with numbers', 'Worked with spreadsheets'],
    'Action, tool, scale and a measurable result.');

  /* ---------- Learning ---------- */
  Q('Learning', 'Why does spaced repetition work?', 'Reviewing just before you would forget strengthens memory more than repeating straight away', ['Because repeating faster is always better', 'Because it avoids practice', 'Because it only uses easy questions'],
    'Each successful recall makes the next gap safely longer. That is what the review schedule here does.');
  Q('Learning', 'Which way of studying tests your understanding best?', 'Explaining the idea in your own words without looking at your notes', ['Re-reading the lesson', 'Highlighting the key lines', 'Copying the solution'],
    'Retrieving something from memory is practice; re-reading only feels like it.');
  Q('Learning', 'Why keep an error log?', 'Patterns in your mistakes show exactly what to practise next', ['To feel bad about mistakes', 'To impress interviewers', 'Because AI tools require it'],
    'A short log of cause and fix is a very efficient revision tool.');

  DA.extraQuestions = list;
})();
