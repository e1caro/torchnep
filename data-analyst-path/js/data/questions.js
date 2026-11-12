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
  Q('SQL', 'What does WHERE discount = NULL return?', 'No rows at all, even when discount is NULL', ['Only the rows where discount is NULL', 'All rows, because NULL matches any value', 'An error in every database: NULL is not a value'],
    'NULL is never equal to anything, not even NULL. Use WHERE discount IS NULL.');
  Q('SQL', 'customers has 4 rows. Customer 1 has 3 orders, customer 2 has 1 order, customers 3 and 4 have none. How many rows does customers LEFT JOIN orders return?', '6', ['4', '5', '8'],
    'Customer 1 gives 3 rows, customer 2 gives 1, and customers 3 and 4 each give one row with NULLs: 3 + 1 + 1 + 1 = 6.');
  Q('SQL', 'Same tables as before: how many rows does customers INNER JOIN orders return?', '4', ['6', '2', '8'],
    'Only customers with at least one matching order survive: 3 + 1 = 4 rows.');
  Q('SQL', 'In which order does SQL logically evaluate a query?', 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY',
    ['SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → SELECT → WHERE → GROUP BY → HAVING → ORDER BY', 'FROM → WHERE → SELECT → GROUP BY → ORDER BY → HAVING'],
    'That is why you cannot use a SELECT alias inside WHERE, and why HAVING can use aggregates.');
  Q('SQL', 'Each order row must keep its own line but also show its store\'s total revenue. Which tool fits?', 'SUM(revenue) OVER (PARTITION BY store_id)',
    ['SUM(revenue) with GROUP BY store_id', 'SUM(revenue) HAVING store_id IS NOT NULL', 'SELECT DISTINCT store_id, SUM(revenue)'],
    'A window function adds the group total to every row without collapsing rows. GROUP BY would return one row per store.');
  Q('SQL', 'What does COUNT(DISTINCT customer_id) over the orders table count?', 'How many different customers placed at least one order', ['The total number of orders in the orders table', 'Every customer in the customers table, ordered or not', 'The number of orders whose customer_id is not NULL'],
    'DISTINCT removes repeated values before counting.');
  Q('SQL', 'Which clause returns the 3 most expensive products?', 'ORDER BY price DESC LIMIT 3', ['ORDER BY price LIMIT 3', 'WHERE price = MAX(price) LIMIT 3', 'GROUP BY price LIMIT 3'],
    'Sort from high to low, then keep the first 3 rows. Without DESC you would get the cheapest.');
  Q('SQL', 'You join orders (one row per order, with an order_total column) to order_items (several rows per order) and then SUM(order_total). The total is far too high. Why?', 'Each order row repeats once per item, so its total is counted several times',
    ['SUM only works properly when the query also has a GROUP BY clause', 'order_items has NULL quantities, and SUM treats every NULL as a very large number', 'The INNER JOIN doubles the numbers of the left-hand table'],
    'This is a join fan-out. Aggregate at the right grain: sum the item-level values, or aggregate before joining.');
  Q('SQL', 'Which value matches name LIKE \'Ch%\'?', 'Chai Latte', ['Latte Chai', 'Cookie', 'Cappuccino'],
    '% means "any characters", so the text must START with Ch. Latte Chai does not.');
  Q('SQL', 'Which expression labels orders above 50 as \'big\' and the rest as \'small\'?', 'CASE WHEN total > 50 THEN \'big\' ELSE \'small\' END', ['IF (total > 50) THEN \'big\' ELSE \'small\' END IF;', 'SELECT \'big\' WHEN total > 50 OTHERWISE \'small\'', 'CASE total > 50 WHEN \'big\' ELSE \'small\' END'],
    'CASE WHEN … THEN … ELSE … END is the standard SQL way.');
  Q('SQL', 'How do you find duplicated email addresses in a customers table?', 'GROUP BY email HAVING COUNT(*) > 1', ['WHERE email = DISTINCT', 'ORDER BY email LIMIT 1', 'SELECT email WHERE COUNT(email) > 1'],
    'Group by the value, count the rows in each group, and keep the groups with more than one.');
  Q('SQL', 'What is the main benefit of a CTE (WITH … AS)?', 'It names a sub-query, so a long query reads as clear steps', ['It makes every query run faster, because results are cached', 'It stores the result permanently in the database as a table', 'It replaces JOINs, so tables no longer need matching keys'],
    'CTEs are mostly about readability and reuse within one query.');
  Q('SQL', 'LAG(revenue) OVER (ORDER BY month) returns, for each row…', 'the revenue of the previous row in month order', ['the largest revenue seen so far in month order', 'the revenue of the next row in month order', 'the average revenue of all the rows before it'],
    'LAG looks back one row (LEAD looks forward). Useful for month-over-month change.');
  Q('SQL', 'You combine two customer lists and want to keep duplicate rows. Which do you use?', 'UNION ALL', ['UNION', 'INTERSECT', 'JOIN'],
    'UNION removes duplicates, UNION ALL keeps every row (and is faster).');

  /* ---------- Python ---------- */
  Q('Python', 'What does df[df["qty"] > 2] return?', 'Only the rows where qty is greater than 2', ['The qty column, keeping only values above 2', 'The number of rows where qty is above 2', 'The whole table, with qty capped at 2'],
    'A boolean condition inside the brackets filters rows.', 'df[df["qty"] > 2]');
  Q('Python', 'What does df["price"].isna().sum() give you?', 'How many missing values the price column has', ['The total of all the prices in the price column', 'The rows where the price column is zero', 'The number of rows in the whole DataFrame'],
    'isna() gives True/False per row, and sum() counts the Trues.');
  Q('Python', 'What does this code compute?', 'One revenue total per city', ['The revenue of every row', 'The number of cities', 'The average revenue per row'],
    'groupby splits the rows by city, then sum() collapses each group to one number.', 'df.groupby("city")["revenue"].sum()');
  Q('Python', 'In pd.merge(a, b, on="id", how="left"), which rows are kept?', 'All rows of a, plus b\'s data where it matches (NaN where it does not)', ['Only the rows whose id appears in both a and b, with data from both', 'All rows of b, plus a\'s data where it matches (NaN where it does not)', 'All rows of a and of b, with NaN wherever one side has no match'],
    'It behaves like SQL LEFT JOIN.');
  Q('Python', 'What does df.dropna() do by default?', 'Drops every row that has at least one missing value', ['Drops every column that has at least one missing value', 'Fills every missing value with 0 and keeps all rows', 'Drops a row only when all of its values are missing'],
    'Check how many rows would go before dropping: it can remove a lot, and can bias your results.');
  Q('Python', 'What does pd.to_numeric(s, errors="coerce") do with the text "N/A"?', 'Turns it into NaN (a missing value) instead of raising an error', ['Turns it into 0, so the column can still be summed and averaged', 'Leaves it as the text N/A and converts the other values', 'Stops with an error, because N/A cannot be read as a number'],
    'coerce is handy for cleaning, but count the NaNs it creates so you know what was lost.');
  Q('Python', 'Which call shows count, mean, standard deviation, min, quartiles and max for numeric columns?', 'df.describe()', ['df.info()', 'df.shape', 'df.head()'],
    'describe() is the fastest numeric summary. info() shows types and non-null counts.');
  Q('Python', 'How do you sort a DataFrame by revenue, highest first?', 'df.sort_values("revenue", ascending=False)', ['df.sort("revenue", descending=True)', 'df.order_by("revenue", ascending=False)', 'df.sort_values("revenue", ascending=True)'],
    'sort_values sorts ascending by default, so set ascending=False.');

  /* ---------- Statistics ---------- */
  Q('Statistics', 'Order values: 2, 3, 4 and 100. Which statement is right?', 'The median (3.5) shows a typical order better than the mean (27.25)', ['The mean (27.25) is the best summary here, because it uses every value', 'The median is 27.25 and the mean is 3.5, so report the median', 'Mean and median are both about 27, so either one works'],
    'One huge value drags the mean up. The median is robust to outliers.');
  Q('Statistics', 'A 95% confidence interval for a conversion rate is 3.1% to 4.9%. The best reading?', 'The true rate is plausibly between 3.1% and 4.9%', ['95% of customers convert between 3.1% and 4.9%', 'The rate is exactly 4%', 'There is a 95% chance the next visitor converts'],
    'The interval describes uncertainty about the true rate, not the spread of individual customers.');
  Q('Statistics', 'An A/B test gives p = 0.20. The best conclusion?', 'The data fit no difference: you cannot claim an effect, nor prove there is none', ['B is 20% better than A, though the result is not quite significant yet', 'There is a 20% chance that the test is wrong, and an 80% chance that it is right', 'A and B are proven to perform the same, so you can stop testing'],
    'A large p-value means "not enough evidence", not "no effect". A bigger sample may tell more.');
  Q('Statistics', 'You check an A/B test every day and stop as soon as p < 0.05 appears. What is the problem?', 'It inflates false positives: with enough peeks, chance will cross 0.05', ['Nothing: checking every day is the correct and fastest way to run an A/B test', 'p-values cannot be calculated before the planned end date', 'It makes the test slower, because it needs a bigger sample'],
    'Decide the sample size or duration in advance, or use methods designed for sequential testing.');
  Q('Statistics', 'A 5-person survey says 80% like the product. What is the main problem?', 'The sample is tiny, so the uncertainty is huge', ['80% is too low a share to launch a new product', 'Surveys are not a valid way to measure product liking', 'Percentages cannot be used with only 5 people'],
    '4 of 5 could easily be 2 of 5 or 5 of 5 next time. Report the interval and get more data.');
  Q('Statistics', 'You survey only customers who answered a post-purchase email. What is the biggest risk?', 'Selection bias: people who answer differ from those who do not', ['Rounding errors in the percentages that the survey tool reports back', 'Too much data, which makes the results hard to interpret', 'Email surveys cannot measure an average satisfaction score'],
    'A big biased sample can be confidently wrong. Ask who is missing.');
  Q('Statistics', 'Price and demand have a correlation of r = −0.8. What does it mean?', 'A strong negative link: when price is higher, demand tends to be lower', ['A price increase makes demand fall by 80% every single time', 'A weak relationship: a negative r means the link between them is small', 'Demand is about 80% of the price, so they move together'],
    'Correlation measures association and direction. It says nothing about cause or the size of the effect.');
  Q('Statistics', 'Conversion goes from 4% to 5%. Which statement is correct?', 'Up 1 percentage point, or 25% in relative terms', ['Up 1%, or 1 percentage point in relative terms', 'Up 5 percentage points, or 25% in relative terms', 'Up 1 percentage point, or 20% in relative terms'],
    'Percentage points are absolute differences; relative change is (5 − 4) / 4 = 25%.');
  Q('Statistics', 'Most orders are €30 to €80, then you see one order of €50,000. What do you do first?', 'Investigate: is it a typo, a test order, or a real order?', ['Delete it immediately so that it does not distort the mean', 'Keep it and report the mean as usual for that period', 'Replace it with the average order value of the month'],
    'Errors are fixed, real values are kept (and reported with and without). Never delete blindly.');
  Q('Statistics', 'Two teams both average 70 points. Team A has a standard deviation of 2, Team B of 15. Which is true?', 'Team B\'s results vary much more from game to game', ['Team B is the better team, as its scores go higher', 'Team A scored fewer points over the whole season', 'Nothing: with equal means the deviation does not matter'],
    'Same centre, very different spread. Always look at both.');
  Q('Statistics', 'A treatment looks better than the control within every subgroup, yet looks worse overall. What can explain this?', 'The groups have very different sizes in each arm (Simpson\'s paradox)', ['The data must be fake, because this cannot happen with real numbers', 'The subgroups were too small for any test to be reliable', 'A mistake in the t-test formula used for the overall result'],
    'Aggregating over unevenly mixed groups can reverse a trend. Always check subgroups and confounders.');

  /* ---------- Spreadsheets ---------- */
  Q('Spreadsheets', 'What does =SUMIFS(C:C, A:A, "Madrid") do?', 'Adds the values of column C on the rows where column A equals Madrid', ['Counts the rows where column A equals Madrid, using column C', 'Adds all of column C, then filters the total by Madrid', 'Finds the first Madrid in column A and returns the matching value in C'],
    'SUMIFS(sum range, criteria range, criterion).');
  Q('Spreadsheets', 'In a pivot table showing revenue per month for each category, where do the fields go?', 'Month in rows, category in columns, revenue in values', ['Revenue in rows, month in values', 'Everything in filters', 'Category in values, month in columns, revenue in rows'],
    'Rows and columns are the dimensions you group by. Values is what you add up.');
  Q('Spreadsheets', 'Which setting makes VLOOKUP return only exact matches?', 'FALSE (or 0) as the last argument', ['TRUE (or 1) as the last argument', 'Sorting the lookup column first', 'Using a bigger range for the table'],
    'The default approximate match can silently return wrong values on unsorted data.');
  Q('Spreadsheets', 'A column of dates is left-aligned and cannot be grouped by month. The likely cause?', 'The dates are stored as text, not as real dates', ['The column is too narrow to show the full dates', 'The file is too large for the pivot to read', 'The pivot table needs to be refreshed first'],
    'Convert them (DATEVALUE, Text to Columns or Power Query) so the spreadsheet understands them.');
  Q('Spreadsheets', 'You copy a formula down and want one cell to stay fixed. How do you write it?', '$B$2', ['B2', '#B2#', 'B$2$'],
    '$ locks the column and/or row. $B$2 never moves when you copy the formula.');
  Q('Spreadsheets', 'Which layout is tidy?', 'One row per order with columns date, city, product and qty', ['One column per month (Jan, Feb, Mar…) with totals at the bottom', 'Merged header cells with colour-coded rows', 'Several small tables stacked on one sheet'],
    'Tidy data: one observation per row, one variable per column, one value per cell.');

  /* ---------- Visualization ---------- */
  Q('Visualization', 'You must compare revenue across 12 product categories. The best chart?', 'Horizontal bars sorted by value', ['A pie chart with one slice each', 'A 3D column chart by category', 'A line chart across categories'],
    'Bars on a common baseline are easy to compare, and sorting makes the ranking obvious.');
  Q('Visualization', 'You want to see how order values are distributed. The best chart?', 'A histogram', ['A pie chart', 'A line chart over time', 'A stacked bar by city'],
    'A histogram shows shape, skew and outliers.');
  Q('Visualization', 'Which chart shows the relationship between ad spend and sales per campaign?', 'A scatter plot', ['A pie chart', 'A stacked bar', 'A histogram'],
    'Two numeric variables per point call for a scatter plot.');
  Q('Visualization', 'Why should a bar chart start at zero?', 'Bar length encodes the value, so a cut axis exaggerates differences', ['Because most charting software refuses to draw the bars any other way', 'To leave room for the labels and the legend below the bars', 'Because zero is the average, and bars show distance from it'],
    'Line charts can use a non-zero axis because they show change, not length.');
  Q('Visualization', 'What is the best use of colour in a chart?', 'Grey for context and one accent colour for the point that matters', ['A different bright colour for every bar, so each one stands out', 'A rainbow gradient from low to high, so the order is easy to see', 'Red for everything important and green for everything else'],
    'Colour should carry meaning, not decoration.');
  Q('Visualization', 'Why are dual-axis charts risky?', 'The two scales can be set to suggest a link that is not there', ['They need twice as much data as a single-axis chart to be readable', 'They cannot show lines and bars in the same chart', 'Most tools cannot export them to slides or reports'],
    'Use two charts or index both series to 100 at the start instead.');
  Q('Visualization', 'Which chart title is best?', 'Delivery orders grew 40% in 2025 while margins fell', ['Orders by channel, 2025, all stores and all months', 'Chart 3: delivery and in-store orders compared', 'Sales data (2025) by channel, with margins added'],
    'A title that states the insight tells the reader what to see.');

  /* ---------- AI workflow ---------- */
  Q('AI workflow', 'AI wrote SQL that uses a column order_value that does not exist in your table. The most likely cause?', 'It guessed your schema. Give it the real table and column names', ['Your database is broken and lost the column overnight', 'SQL does not support column names with underscores', 'The AI is using an older version of SQL than the one your database runs'],
    'Models fill gaps with plausible guesses. The schema removes the gaps.');
  Q('AI workflow', 'What can you safely paste into a public AI chat?', 'Table and column names and a few invented example rows', ['A customer export, as long as you delete the emails', 'Your company\'s unreleased sales figures, if summarised', 'Patient or student records with the names removed'],
    'Share structure, not data. Anonymise or invent examples.');
  Q('AI workflow', 'An AI-written analysis says revenue grew 12%. What is the best first check?', 'Recalculate the figure independently (a pivot or SUM) and compare', ['Ask the AI whether it is sure, and to explain its working', 'Trust it, because the code ran from start to end without errors', 'Check that the formatting and the chart titles are correct'],
    'An independent calculation does not share the AI\'s blind spots.');
  Q('AI workflow', 'Why ask the AI to list its assumptions?', 'Hidden assumptions are where analyses go wrong, and a list lets you check', ['It makes the answer longer and more detailed, which usually makes it more accurate', 'Most AI tools need the list before they can run any code', 'It improves the grammar and the tone of the AI\'s writing'],
    'Assumptions you can see are assumptions you can test.');
  Q('AI workflow', 'You are stuck on an error. Which prompt helps you learn the most?', 'Here is my query and the error. Don\'t solve it: give a hint and explain the cause', ['Here is my query and the error. Please fix it and send the corrected version', 'Here is the task and the data. Write the whole solution for me, with comments in the code', 'Explain everything about SQL joins from the beginning, with many examples'],
    'Your own attempt plus a hint keeps the learning with you.');
  Q('AI workflow', 'You use AI to label 10,000 comments. What tells you whether it is good enough?', 'Its agreement with a sample you labelled yourself', ['How confident the AI sounds in its explanations', 'How fast it finishes labelling all the comments', 'The length and detail of each explanation it gives'],
    'Measure accuracy on a human-labelled sample before trusting the rest.');
  Q('AI workflow', 'What is an AI "hallucination"?', 'Confident output that is wrong or invented, like a made-up column', ['A slow, rambling response caused by too much data in the prompt', 'A formatting error that breaks the tables and code in the answer', 'A security warning shown when the prompt contains any sensitive data'],
    'It is why verification is part of the workflow.');

  /* ---------- Career ---------- */
  Q('Career', 'What is the best way to open a portfolio project README?', 'With the key finding in one sentence', ['With a list of the installed libraries', 'With your life story', 'With the raw data'],
    'Reviewers give you about two minutes. Show the result first.');
  Q('Career', 'What does STAR stand for in behavioural interviews?', 'Situation, Task, Action, Result', ['Skill, Team, Attitude, Reward', 'Start, Test, Adjust, Repeat', 'Strategy, Target, Analysis, Report'],
    'It gives your stories a clear shape. Always end with the result.');
  Q('Career', '"Sales dropped 10%. Why?" What is your first move in the interview?', 'Clarify the metric and time frame, then segment it and check data quality', ['Suggest a discount campaign right away to win the lost sales back', 'Say you need more data first and wait until someone provides it', 'Explain it by the economy and seasonality, then move on to the next question'],
    'Structure shows how you think. Solutions come last.');
  Q('Career', 'Which CV bullet is strongest for a junior analyst?', 'Built a weekly Excel sales report for 5 stores, cutting prep time from 4 h to 30 min', ['Responsible for weekly reporting and other data tasks across all of the stores', 'Good with numbers, with strong Excel skills and great attention to detail', 'Worked with spreadsheets and dashboards every single week for the sales and store teams'],
    'Action, tool, scale and a measurable result.');

  /* ---------- Learning ---------- */
  Q('Learning', 'Why does spaced repetition work?', 'Reviewing just before you forget makes memories last longer than cramming', ['Repeating the same item many times in a row is the fastest way to learn', 'It replaces practice tests, which tend to make learners anxious', 'It shows mostly easy questions, so motivation and confidence stay high'],
    'Each successful recall makes the next gap safely longer. That is what the review schedule here does.');
  Q('Learning', 'Which way of studying tests your understanding best?', 'Explaining the idea in your own words without your notes', ['Re-reading the lesson until it feels familiar and easy', 'Highlighting the key lines and reading them again later', 'Copying out the solution by hand so it sticks in memory'],
    'Retrieving something from memory is practice; re-reading only feels like it.');
  Q('Learning', 'Why keep an error log?', 'Patterns in your mistakes show what to practise next', ['To remember how many mistakes you have made so far', 'To show interviewers how hard you have worked on it', 'Because AI tutors need it before they can help you'],
    'A short log of cause and fix is a very efficient revision tool.');

  /* ---------- Extended Practice Bank (SQL, Python, Statistics, Spreadsheets, Visualization, AI, Career, Learning) ---------- */
  Q('SQL', 'What does COALESCE(discount, 0) return when discount is NULL?', '0', ['NULL', '1', 'An error message from the database engine'],
    'COALESCE returns its first non-null argument, which prevents NULL from wiping out arithmetic.');
  Q('SQL', 'In SQLite, what does 3 / 4 evaluate to when both numbers are integers?', '0', ['0.75', '1', '0.7500000000000001'],
    'Integer division truncates the decimal part. Write 3.0 / 4 or 1.0 * a / b to get a decimal.');
  Q('SQL', 'Which window function gives 1, 2, 2, 4 when two rows tie for second place?', 'RANK()', ['DENSE_RANK()', 'ROW_NUMBER()', 'NTILE(4)'],
    'RANK() skips the next number after a tie; DENSE_RANK() gives 1, 2, 2, 3; ROW_NUMBER() gives 1, 2, 3, 4.');
  Q('SQL', 'Which window function gives 1, 2, 2, 3 when two rows tie for second place?', 'DENSE_RANK()', ['RANK()', 'ROW_NUMBER()', 'PERCENT_RANK()'],
    'DENSE_RANK() leaves no gaps in the ranking numbers after a tie.');
  Q('SQL', 'Why can WHERE id NOT IN (SELECT parent_id FROM items) return 0 rows unexpectedly?', 'If parent_id contains even one NULL, NOT IN evaluates to unknown', ['Because subqueries inside WHERE are limited to 100 rows at most in SQL', 'Because NOT IN requires both tables to be sorted by id first', 'Because NOT IN only works on text columns and fails on integers'],
    'In three-valued SQL logic, x <> NULL is unknown. Filter WHERE parent_id IS NOT NULL in the subquery or use NOT EXISTS.');
  Q('SQL', 'How do you count orders placed in March 2025 when order_date is a timestamp with hours and minutes?', "WHERE order_date >= '2025-03-01' AND order_date < '2025-04-01'", ["WHERE order_date BETWEEN '2025-03-01' AND '2025-03-31 00:00:00'", "WHERE order_date = '2025-03'", "WHERE HAVING strftime('%m', order_date) = 3"],
    'A half-open interval (>= first day of month AND < first day of next month) includes all times on March 31.');
  Q('SQL', 'What does SUM(CASE WHEN status = \'paid\' THEN 1 ELSE 0 END) calculate?', 'The number of rows where status is paid', ['The total revenue of all rows where status is paid', 'A boolean flag showing whether every row is paid', 'The share of rows where status is paid as a ratio'],
    'Conditional aggregation with CASE inside SUM or COUNT lets you count specific subsets in a single pass.');
  Q('SQL', 'You want each customer\'s latest order row. Which pattern is cleanest?', 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) = 1', ['SELECT DISTINCT customer_id, order_date FROM orders ORDER BY order_date DESC', 'GROUP BY customer_id HAVING order_date = MAX(order_date)', 'ORDER BY customer_id, order_date DESC LIMIT 1'],
    'Numbering rows per customer from newest to oldest and filtering rn = 1 in a CTE keeps the exact latest row.');
  Q('SQL', 'What happens if you omit the ON clause in a JOIN in SQLite?', 'It produces a Cartesian product (every row paired with every row)', ['It automatically joins on all columns that share the exact same name', 'It returns zero rows and prints a warning about missing keys', 'It defaults to joining on the primary key of the first table'],
    'A join without a condition multiplies the row counts of both tables.');
  Q('SQL', 'Which query finds products that have not been ordered even once?', 'SELECT p.product_id FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id WHERE oi.product_id IS NULL', ['SELECT p.product_id FROM products p INNER JOIN order_items oi ON oi.product_id = p.product_id WHERE oi.qty IS NULL OR oi.qty = 0', 'SELECT product_id FROM order_items WHERE product_id IS NULL GROUP BY product_id', 'SELECT p.product_id FROM products p LEFT JOIN order_items oi ON oi.product_id = p.product_id WHERE oi.product_id = NULL'],
    'LEFT JOIN keeps unmatched products and fills the right-side columns with NULL, which you test with IS NULL.');
  Q('SQL', 'What does GROUP BY 1, 2 mean in a SELECT query?', 'Group by the first and second columns listed in SELECT', ['Group only the first two rows of the table together', 'Keep groups that have at least 1 or 2 matching rows', 'Round the grouped numbers to 1 and 2 decimal places'],
    'Positional shorthand refers to the 1st and 2nd expressions in the SELECT list.');
  Q('SQL', 'What does LEAD(price) OVER (ORDER BY day) return?', 'The price from the next row in day order', ['The highest price across the whole table', 'The price from the first row in the window', 'The price from the previous row in day order'],
    'LEAD looks forward one row; LAG looks back one row.');

  Q('Python', 'What does df["city"].value_counts(dropna=False) do?', 'Counts each unique city value, including NaN', ['Drops missing values and returns the city names sorted A to Z', 'Replaces missing cities with False and counts the remaining rows', 'Returns True if every city appears the same number of times'],
    'By default value_counts skips NaNs; dropna=False reveals how many values are missing.');
  Q('Python', 'Why pass validate="many_to_one" to pd.merge(orders, customers, on="customer_id")?', 'It raises an error if customer_id is duplicated in customers', ['It automatically deletes duplicate customer rows before merging', 'It speeds up the merge by skipping the index check on orders', 'It converts customer_id to an integer in both tables first'],
    'Validating join cardinality catches unexpected duplicates before they inflate sums.');
  Q('Python', 'What does df.duplicated(subset=["email"]).sum() return?', 'The number of duplicate rows sharing an earlier email', ['A list of all unique email addresses in the DataFrame', 'The DataFrame with duplicate email rows removed in place', 'The total number of non-null emails in the email column'],
    'duplicated() marks repeat occurrences as True, and .sum() counts them.');
  Q('Python', 'How do you extract the calendar month from a datetime column df["date"]?', 'df["date"].dt.month', ['df["date"].month()', 'df["date"].str.slice(0, 2)', 'pd.month(df["date"])'],
    'The .dt accessor exposes date and time properties on datetime Series.');
  Q('Python', 'What is the difference between df.loc[0:3] and df.iloc[0:3]?', 'iloc slices by integer position (3 rows); loc slices by label (inclusive)', ['loc is faster for numeric columns; iloc works only on text and date columns', 'iloc modifies the DataFrame in place; loc returns a read-only copy', 'There is no difference when the index is made of integers'],
    'iloc uses half-open Python positions [0, 1, 2]; loc matches index labels and includes both endpoints.');
  Q('Python', 'What does df.groupby("store")["sales"].transform("mean") return?', 'A Series of store means with the same length and index as df', ['A small summary table with one row per store and its mean sales', 'The overall mean of sales across all stores as one float', 'A boolean mask of rows where sales exceed the store mean'],
    'transform() broadcasts the group result back to every original row—just like a SQL window function.');
  Q('Python', 'Before trusting the output of a Jupyter notebook, what should you do?', 'Restart the kernel and Run All from top to bottom', ['Clear all cell outputs and save the file without running it', 'Run only the last three cells again to refresh the chart', 'Convert every code cell into a markdown cell for sharing'],
    'Running cells out of order leaves stale variables in memory that make results irreproducible.');
  Q('Python', 'What does df["price"].clip(lower=0, upper=100) do?', 'Caps values below 0 at 0 and values above 100 at 100', ['Deletes every row where price is below 0 or above 100', 'Selects only the rows where price sits between 0 and 100', 'Rescales the price column linearly so it spans 0 to 100'],
    'Clipping (winsorizing) bounds extreme values without dropping the row.');

  Q('Statistics', 'In an A/B test intended to be 50/50, group A has 52,400 users and group B has 47,600. What should you do?', 'Halt and investigate: a Sample Ratio Mismatch indicates a bug', ['Analyse as usual, since both groups have over 40,000 active users', 'Randomly delete 4,800 rows from group A so the sizes match', 'Weight group B by 1.10 and report the p-value as valid'],
    'An uneven split in a 50/50 test usually means a broken redirect, bot traffic or logging failure in one arm.');
  Q('Statistics', 'What does the 90th percentile (p90) of delivery time equal to 42 minutes mean?', '90% of deliveries arrive in 42 minutes or less, and 10% take longer', ['The average delivery takes 90% of 42 minutes, or about 38 minutes total', '90% of deliveries take exactly 42 minutes from order to door', 'Only 10% of deliveries arrive within the 42-minute target window'],
    'Percentiles show the experience at the tail without being distorted by a single 5-hour outlier.');
  Q('Statistics', 'You test 20 independent metrics at α = 0.05 when nothing actually changed. What is the chance of at least one "significant" result?', 'About 64% (nearly two in three)', ['Still 5%, because each test uses the same 0.05 threshold', 'Exactly 100%, because 20 times 0.05 equals 1.00 in total', 'About 0.25%, because testing more metrics lowers the risk'],
    'This is the multiple-testing problem: 1 − 0.95^20 ≈ 0.64. Pick one primary metric in advance.');
  Q('Statistics', 'Why do extreme top performers in week 1 often score closer to the average in week 2?', 'Regression to the mean: week 1 combined skill with good luck', ['Because top performers stop trying once they see the leaderboard', 'Because the measurement tool becomes less accurate in week 2', 'Because the overall average rises to match the top group in week 2'],
    'When any metric includes random noise, an extreme reading usually has luck that does not repeat next time.');
  Q('Statistics', 'Which measure of spread pairs naturally with the median for skewed data?', 'The interquartile range (IQR: 75th minus 25th percentile)', ['The standard deviation squared (the full sample variance)', 'The maximum minus the minimum across all rows', 'The standard error of the sample mean'],
    'Like the median, the IQR ignores extreme outliers in the tails.');
  Q('Statistics', 'A fraud detector is 99% accurate, but only 1 in 1,000 orders is actually fraud. If it flags an order, is it probably fraud?', 'No: false alarms from the 999 legitimate orders outnumber real frauds', ['Yes: there is a 99% probability that the flagged order is real fraud', 'Yes: only 1 in 1,000 flagged orders will turn out to be a mistake', 'It is 50/50, because the test either catches fraud or misses it'],
    'Base-rate neglect: 1% false positives on 999 good orders is ~10 false alarms for every ~1 true fraud.');
  Q('Statistics', 'What is a confounding variable?', 'A factor that affects both the exposure and the outcome, faking a link', ['A variable with too many missing values to include in a regression model', 'A random measurement error that makes the p-value larger than 0.05', 'A duplicate column that has been joined into the table twice'],
    'For example, warmer weather increases both ice-cream sales and swimming accidents.');
  Q('Statistics', 'When comparing monthly sales of a seasonal retail business, which comparison is fairest?', 'This October versus last October (Year-over-Year)', ['This October versus this September (Month-over-Month)', 'This October versus the average of July and August', 'This October annualized by multiplying the month by 12'],
    'Year-over-Year compares the same point in the seasonal cycle.');

  Q('Spreadsheets', 'Why do analysts prefer XLOOKUP or INDEX/MATCH over VLOOKUP?', 'Inserting a column does not break the column index, and it can look left', ['VLOOKUP is limited to 1,000 rows in modern desktop spreadsheet programs', 'XLOOKUP automatically removes duplicates from the source table', 'INDEX/MATCH works without needing a shared key between tables'],
    'Hard-coded column numbers in VLOOKUP break silently when someone adds a column.');
  Q('Spreadsheets', 'A lookup returns #N/A even though the text looks identical in both cells. What is the first thing to check?', 'Trailing spaces or numbers stored as text (use TRIM or VALUE)', ['Whether the font size and cell background colour match exactly', 'Whether the workbook file name contains spaces or hyphens', 'Whether the two sheets are in the right tab order at the bottom'],
    '"1042" as text does not match 1042 as a number, and "Paris " does not match "Paris".');
  Q('Spreadsheets', 'What does converting a range into a structured Table (Ctrl+T) prevent?', 'Formulas and pivots missing new rows added at the bottom later', ['Users typing numbers into cells that expect text category labels', 'Rounding differences between currencies in different columns', 'Accidental sorting of the whole table by a single column'],
    'Structured table references expand automatically when you append data.');
  Q('Spreadsheets', 'What does =COUNTIFS(A:A, "North", B:B, ">50") return?', 'The number of rows where column A is North AND column B is over 50', ['The number of rows where column A is North OR column B is over 50', 'The sum of column B on all rows where column A equals North', 'An error, because COUNTIFS only accepts one column at a time'],
    'COUNTIFS applies all conditions with AND logic.');
  Q('Spreadsheets', 'In a financial or operational model, why put assumptions (like tax rate = 21%) in dedicated cells instead of inside formulas?', 'So you can see, audit and update the assumption in one place', ['Because spreadsheet formulas cannot multiply by decimal literals', 'Because it makes the file size smaller when saved as .xlsx', 'Because pivot tables require every constant to have its own cell'],
    'Hard-coding magic numbers inside 40 formulas guarantees you will miss one when the rate changes.');

  Q('Visualization', 'A line chart has 11 overlapping coloured lines and a legend on the right. How do you make it readable?', 'Use small multiples, or grey out 10 lines and highlight + direct-label 1', ['Make every line thicker and add 3D drop shadows so they separate clearly', 'Switch to a 3D stacked area chart with a rainbow colour palette', 'Add data labels to every single point on all 11 lines at once'],
    'Highlighting the focal series in accent colour against grey context—or splitting into small panels—removes visual tangles.');
  Q('Visualization', 'Why put the label directly at the end of a line instead of in a separate legend box?', 'Readers see which line is which without jumping their eyes back and forth', ['It lets you fit twice as many gridlines onto the chart background canvas', 'It automatically scales the y-axis to start at the minimum value', 'Most business intelligence tools cannot export a separate legend'],
    'Direct labelling reduces cognitive load and survives black-and-white printing.');
  Q('Visualization', 'Which colour pair is safest for readers with red-green colour vision deficiency?', 'Blue and orange', ['Red and green', 'Light green and dark red', 'Lime and crimson'],
    'Blue and orange remain distinct across the most common forms of colour blindness.');
  Q('Visualization', 'You want to show how a $100M budget splits across 5 departments and their sub-teams. Which chart works well?', 'A sorted horizontal bar chart (or a treemap with clear labels)', ['A 3D exploding pie chart with 18 slices and a legend below it', 'A scatter plot with department name on the horizontal axis', 'A dual-axis line chart connecting the 5 departments in order'],
    'Aligned bars make comparisons effortless across both main groups and subgroups.');
  Q('Visualization', 'What is the main purpose of an annotation on a time-series chart?', 'To explain why a notable spike, drop or shift happened on that date', ['To repeat the axis numbers in a larger font above every data point', 'To fill empty whitespace in the corners of the chart canvas', 'To list all the SQL tables used to build the underlying query'],
    'Context right on the spike turns a decorative chart into an answer.');

  Q('AI workflow', 'How can you use an AI assistant to test a SQL query you just wrote?', 'Ask it to invent a 5-row edge-case table (NULLs, ties, 0s) that breaks it', ['Paste your production customer table and ask if the output looks right', 'Ask it to rate your query from 1 to 10 without showing the schema', 'Have it rewrite the query in three other languages to compare'],
    'Adversarial edge-case generation is one of the safest, highest-leverage uses of AI.');
  Q('AI workflow', 'Why include an "Unclear / Other" category when asking AI to classify customer tickets?', 'So the model is not forced to guess a wrong label on ambiguous text', ['Because language models require an odd number of categories to run', 'To make the prompt shorter and reduce the cost per thousand tokens', 'So you can delete all rows in that category without reading them'],
    'Forcing a confident guess on vague tickets pollutes your real categories.');
  Q('AI workflow', 'Two queries—yours and the AI\'s—disagree by 14 rows. What is the fastest way to find out why?', 'Inspect the 14 rows in one result but not the other (EXCEPT / anti-join)', ['Re-run the AI prompt three times and take the majority answer from those', 'Take the average of the two numbers so the error is halved', 'Assume the longer query is right because it has more clauses'],
    'Looking at the actual differing records immediately reveals the edge case (e.g. NULLs or boundary dates).');
  Q('AI workflow', 'When asking AI to help write a stakeholder summary, what must you provide yourself?', 'The verified numbers, the caveats, and the specific decision at stake', ['Only the raw database dump so the AI can choose the best story', 'A request to make the results sound as dramatic and certain as possible', 'Nothing: ask the AI what typical numbers in your industry look like'],
    'Let AI polish the prose, never invent or select the facts.');

  Q('Career', 'A manager asks: "Can you pull a quick list of all churned users?" What should you ask first?', '"How are we defining churned, and what action will we take with the list?"', ['"Which font and colour scheme would you like in the final spreadsheet?"', '"Should I use Python or SQL to export the CSV file for you?"', '"Can this wait until next month when the warehouse is faster?"'],
    'Clarifying the definition (e.g. cancelled subscription vs 30 days inactive) prevents building the wrong thing.');
  Q('Career', 'Your analysis shows a popular new feature actually reduced checkout conversion by 2%. What do you do?', 'Verify the data twice, then present the finding clearly and objectively', ['Filter out the worst days until the change looks positive or neutral', 'Keep quiet about conversion and only report the feature\'s click count', 'Wait a few months to see if the number improves on its own'],
    'An analyst\'s value is trustworthiness—especially when the data is inconvenient.');
  Q('Career', 'Why state the main limitation of your analysis on your own slide?', 'It builds credibility and prevents a stakeholder from derailing the meeting', ['It gives you an excuse if your SQL query had a join bug in it', 'It shows that the data team needs a bigger budget before deciding', 'It makes the presentation longer so there is less time for questions'],
    'Proactively noting scope and caveats shows rigour and keeps the discussion focused.');
  Q('Career', 'What makes a portfolio project stand out to a hiring manager?', 'A real question on messy data, a clear finding, and a concrete recommendation', ['Using ten different machine-learning libraries in a 2,000-line Jupyter notebook', 'Copying the standard Titanic or Iris tutorial with default charts', 'Building a dashboard with 25 charts and no written conclusion'],
    'Hiring managers look for sound judgement, clean code and business communication.');
  Q('Career', 'How do you sanity-check a surprisingly high total revenue figure before sending it?', 'Divide by orders or customers and compare with known per-unit averages', ['Format the number with two decimals and a bold currency symbol', 'Check that the SQL query ran in less than one second without errors', 'Ask a colleague if the font on the summary table looks professional'],
    'Back-of-the-envelope division catches join fan-outs and unit mistakes in seconds.');

  Q('Learning', 'You get stuck on a SQL challenge for 10 minutes. What is the most productive next step?', 'Run the inner SELECT first to inspect intermediate rows and column values', ['Delete the whole query and open the full reference solution right away', 'Switch to a completely different topic and skip SQL for the week', 'Add DISTINCT and GROUP BY at random until the error disappears'],
    'Building and inspecting a query one step at a time turns a big mystery into a small, visible step.');
  Q('Learning', 'Why is writing a 3-line summary at the end of a lesson worth the extra minute?', 'Translating an idea into your own words exposes gaps immediately', ['It counts as extra characters in your browser\'s local storage file', 'It lets you skip all the hands-on exercises in the next module', 'It is only useful if you plan to publish a textbook later on'],
    'Generation and synthesis lock concepts into long-term memory.');

  /* ================================================================ Excel & Google Sheets competence exercises */
  Q('Spreadsheets', 'What does this Excel formula return?',
    'A live array of unique cities sorted alphabetically',
    ['A single text string joining all city names with commas', 'The count of distinct city names in the range A2:A500', 'An error unless you press Ctrl+Shift+Enter in Excel 365'],
    'UNIQUE extracts distinct values and SORT orders the spilled dynamic array automatically.',
    '=SORT(UNIQUE(A2:A500))');

  Q('Spreadsheets', 'In Excel, what causes a #SPILL! error when using FILTER or UNIQUE?',
    'Non-empty cells or merged cells are blocking the output range below',
    ['The source table has more than 1,000 rows on another worksheet tab', 'The lookup column is positioned to the left of the return column', 'The formula references a structured Excel Table instead of A1 cells'],
    'Dynamic arrays need empty cells to spill into; clearing the blocking cells immediately restores the output.');

  Q('Spreadsheets', 'What does the 4th argument ("Not Found") do in this XLOOKUP formula?',
    'Returns "Not Found" instead of #N/A when the ID in E2 is missing',
    ['Searches for the literal text "Not Found" inside column A2:A500', 'Skips the first four rows of the table before starting the lookup', 'Forces an approximate match sorted in descending alphabetical order'],
    'XLOOKUP includes a built-in if_not_found parameter so you do not need an outer IFERROR wrapper.',
    '=XLOOKUP(E2, A2:A500, C2:C500, "Not Found", 0)');

  Q('Spreadsheets', 'How do you perform a two-way matrix lookup (matching both row and column headers) in Excel or Sheets?',
    'Combine INDEX with two MATCH functions—one for row, one for column',
    ['Use VLOOKUP with a negative column index number for the header row', 'Nest three HLOOKUP formulas inside a SUMIF across the whole table', 'Use COUNTIFS with the row name first and the column name second'],
    'INDEX(grid, MATCH(row_key, rows, 0), MATCH(col_key, cols, 0)) pinpoints the exact intersection cell.');

  Q('Spreadsheets', 'Why use LET(rev, SUM(B2:B99), cost, SUM(C2:C99), (rev - cost) / rev) in Excel?',
    'It calculates each sum once and gives it a clear name inside the formula',
    ['It locks the cells so other users cannot edit columns B and C in the sheet', 'It exports the variables rev and cost to a separate Python script file', 'It converts text numbers into currency format across the entire workbook'],
    'LET improves both readability and calculation speed by avoiding repeated evaluation of the same expression.');

  Q('Spreadsheets', 'In Excel Power Query, what does "Unpivot Other Columns" do to a wide table with Jan..Dec columns?',
    'Reshapes the 12 month columns into two columns: Attribute (Month) and Value',
    ['Deletes all twelve monthly columns and keeps only the final grand total column', 'Transposes the entire worksheet so product IDs become the top column header row', 'Merges all twelve monthly numeric columns into one comma-separated text column'],
    'Unpivoting converts human-readable wide cross-tabs into tidy long tables ready for PivotTables and Power BI.');

  Q('Spreadsheets', 'In Power Query, which Merge join kind finds rows in Table A that have NO match in Table B?',
    'Left Anti Join (rows only in first table)',
    ['Inner Join (only matching rows from both tables)', 'Full Outer Join (all rows from both tables combined)', 'Right Outer Join (all rows from second table plus matches)'],
    'A Left Anti Join is the fastest way to audit orphan invoices or uncategorized SKUs without writing VLOOKUPs.');

  Q('Spreadsheets', 'In Google Sheets, what does this QUERY formula return?',
    'Total sales per region (column B), sorted highest first',
    ['Every individual row where column B is greater than the sum of column D across rows', 'Only the top row of data because GROUP BY requires adding an explicit LIMIT 1 clause', 'A formula parse error because Google Sheets QUERY does not support GROUP BY clauses'],
    'Google Sheets QUERY() brings SQL-style SELECT, WHERE, GROUP BY, and ORDER BY directly into a cell.',
    '=QUERY(A1:E500, "SELECT B, SUM(D) WHERE E = \'Closed\' GROUP BY B ORDER BY SUM(D) DESC", 1)');

  Q('Spreadsheets', 'In Google Sheets, why wrap a calculation in =ARRAYFORMULA(IF(A2:A="", "", B2:B * C2:C))?',
    'One header formula computes every row and leaves empty rows blank',
    ['It locks the entire sheet so editors cannot sort or filter columns in the browser', 'It rounds every calculated number in columns B and C to the nearest whole integer', 'It duplicates the entire worksheet tab every time someone edits a cell in row 2'],
    'A single header-level ARRAYFORMULA cannot be accidentally skipped when new form responses or rows arrive.');

  Q('Spreadsheets', 'What does =REGEXEXTRACT(A2, "INV-(\\d+)") return when cell A2 contains "Order INV-4082 paid"?',
    'The captured digits "4082" as text',
    ['The boolean value TRUE because the pattern matches', 'The character position 7 where "INV-" starts in A2', 'The original string with "INV-4082" deleted from it'],
    'Parentheses in REGEXEXTRACT define a capture group, extracting just the number after INV-.');

  Q('Spreadsheets', 'In Excel financial modeling, what is Goal Seek used for?',
    'Finding the exact input value (like price) needed to hit a target formula output',
    ['Automatically fixing broken #REF! and #NAME? errors across all worksheet tabs', 'Importing live stock prices and currency exchange rates from an external web API', 'Highlighting duplicate customer email addresses in red across two worksheets'],
    'Goal Seek works backwards from a desired bottom-line result to solve for a single input assumption.');

  Q('Spreadsheets', 'What does =SUMPRODUCT(B2:B100, C2:C100) / SUM(B2:B100) compute when B is quantity and C is unit price?',
    'The quantity-weighted average unit price across all rows',
    ['The simple unweighted average of the unit prices in column C', 'The median order value excluding the highest and lowest rows', 'The ratio of total quantity sold to the number of distinct products'],
    'SUMPRODUCT multiplies each row\'s quantity by its unit price and sums the products in one step.');

  /* ================================================================ Python, pandas, seaborn & automation exercises */
  Q('Python', 'How do you compute each row\'s share of its category total in pandas without losing rows?',
    'df["rev"] / df.groupby("cat")["rev"].transform("sum")',
    ['df["rev"] / df.groupby("cat")["rev"].sum()', 'df.groupby("cat")["rev"].apply(lambda x: x.sum())', 'df["rev"].divide(df["cat"].value_counts(), axis=0)'],
    'transform("sum") returns a Series aligned with df\'s original index so element-wise division works directly.');

  Q('Python', 'What does df.sort_values("date").groupby("user_id")["spend"].shift(1) give you?',
    'Each user\'s previous order spend (like LAG in SQL)',
    ['Each user\'s first-ever order spend repeated on every row', 'The cumulative sum of spend for each user up to that date', 'A table shifted one column to the right with user_id dropped'],
    'Grouping before .shift(1) ensures the lag never leaks values across two different users.');

  Q('Python', 'Why pass min_periods=1 to df["sales"].rolling(7, min_periods=1).mean()?',
    'So the first 6 rows get a partial average instead of NaN',
    ['So the rolling window automatically skips every row where sales is equal to zero', 'So the moving window looks forward 7 calendar days instead of looking backward', 'So pandas resamples the index from daily transactions into weekly total buckets'],
    'By default rolling(7) needs 7 full points and returns NaN for the first 6 rows; min_periods=1 avoids leading NaNs.');

  Q('Python', 'Which pandas function is best for multi-condition tiering (like CASE WHEN in SQL) across 4 conditions?',
    'np.select(conditions, choices, default="Standard")',
    ['df.iterrows() with nested if/elif statements in a loop', 'pd.merge() with a cross join across all four condition lists', 'df.dropna() followed by four separate .replace() calls'],
    'np.select evaluates a list of boolean masks vectorized in C—much faster and cleaner than .apply(axis=1).');

  Q('Python', 'What does df.set_index("order_date").resample("MS")["revenue"].sum() do?',
    'Aggregates revenue by Month-Start, keeping empty months as 0',
    ['Filters the DataFrame to keep only orders placed on the very first day of a month', 'Computes the millisecond-level rolling average of revenue across all order rows', 'Sorts the DataFrame by total revenue descending within each calendar month'],
    'Resampling on a DatetimeIndex builds a continuous time grid so missing months are never silently skipped.');

  Q('Python', 'In a cohort retention matrix, why divide each row by cohort_pivot.iloc[:, 0]?',
    'Column 0 holds Month-0 cohort size, turning counts into retention %',
    ['Column 0 holds the overall company revenue across every user cohort combined', 'iloc[:, 0] deletes the oldest cohort column so the chart begins at Month 1', 'Dividing by column 0 sorts the customer cohorts from highest to lowest churn'],
    'Every cohort\'s subsequent active user counts are normalized by how many users started in that cohort at Month 0.');

  Q('Python', 'What does pd.qcut(df["monetary"], q=5, labels=[1, 2, 3, 4, 5]) do in RFM segmentation?',
    'Splits customers into 5 equal-count quantile bins (20% each)',
    ['Splits the dollar range into 5 equal-width currency intervals from min to max', 'Filters the DataFrame to retain only the top 5 highest-spending VIP customers', 'Rounds every monetary value upward to the nearest multiple of five dollars'],
    'qcut cuts by sample quantiles (equal counts per bin), whereas cut slices by equal numeric width.');

  Q('Python', 'In Seaborn, why add estimator="sum" and errorbar=None to sns.barplot(data=df, x="region", y="rev")?',
    'Seaborn defaults to the mean with CI bars; this plots clean sums',
    ['Seaborn throws a ValueError if you pass a numeric column without estimator="sum"', 'It converts a static bar chart into an interactive 3D Plotly scatter visualization', 'It automatically sorts categories alphabetically and hides all tick labels'],
    'Be explicit about whether your bar chart represents the mean or the sum of the rows in each category.');

  Q('Python', 'What does sns.despine() do to a Matplotlib / Seaborn chart?',
    'Removes the top and right border lines so the data stands out cleanly',
    ['Deletes outlier points that sit more than 3 standard deviations from the mean', 'Converts a vertical bar chart into a horizontal bar chart automatically', 'Removes the colour legend and replaces it with a greyscale palette'],
    'Stripping non-data ink (top/right spines and heavy gridlines) is a core principle of publication-quality charts.');

  Q('Python', 'You receive nested JSON from a REST API where each order has {"customer": {"id": 9, "tier": "Pro"}}. Which pandas function flattens it?',
    'pd.json_normalize(payload)',
    ['pd.read_fwf(payload, colspecs="infer")', 'pd.to_numeric(payload, errors="ignore")', 'pd.factorize(payload, sort=True)'],
    'pd.json_normalize expands nested dictionaries into flat dot-separated columns like customer.id and customer.tier.');

  Q('Python', 'How do you export three different DataFrames to three named tabs in a single .xlsx file in Python?',
    'Use pd.ExcelWriter("report.xlsx") with each df.to_excel(w, sheet_name=...)',
    ['Call df.to_excel("report.xlsx") three times in a row using mode="overwrite"', 'Concatenate the three DataFrames vertically into one table and save as a CSV file', 'Pass a Python list of DataFrames directly to pd.read_excel("report.xlsx")'],
    'pd.ExcelWriter keeps the workbook open while you write each DataFrame to its own sheet_name.');

  Q('Python', 'Why pass bbox_inches="tight" and dpi=300 when calling fig.savefig("chart.png")?',
    'Prevents clipped axis labels and saves at crisp 300-DPI resolution',
    ['Compresses the exported PNG image under 300 bytes for quick mobile messaging', 'Crops the output figure to a fixed 300x300 pixel square without axis titles', 'Embeds the chart inside an editable native Microsoft Excel workbook on save'],
    'Without bbox_inches="tight", Matplotlib often cuts off long horizontal bar labels or multi-line titles.');

  /* ================================================================ Power BI & Tableau competence exercises */
  Q('Visualization', 'In a Power BI Star Schema, what belongs in a Fact table versus a Dimension table?',
    'Fact tables hold numeric events and keys; Dimensions hold attributes',
    ['Fact tables store unique product names and descriptions; Dimension tables store daily sales rows', 'Fact tables must hold fewer than 100 summary rows; Dimension tables store millions of raw logs', 'Fact tables are only used for dropdown slicers; Dimension tables hold every DAX measure'],
    'Keeping narrow numeric Fact tables separate from wide descriptive Dimension tables makes DAX simple and fast.');

  Q('Visualization', 'Why do you mark a dedicated Calendar table and set Month Name\'s "Sort By Column" to Month Number in Power BI?',
    'So months sort chronologically (Jan, Feb) instead of A-Z (Apr, Aug)',
    ['Because Power BI visuals cannot render text category labels on horizontal bar axes', 'So the Calendar table automatically deletes weekend dates from FactSales on load', 'Because DAX time-intelligence functions only execute when month names are sorted A-Z'],
    'Sorting Month Name by Month Number (1–12) fixes alphabetical month ordering across every chart in the report.');

  Q('Visualization', 'In Power BI DAX, what is the critical difference between a Calculated Column and a Measure?',
    'Calculated Columns store row values in RAM; Measures compute dynamically',
    ['Calculated Columns support SUM() and AVERAGE(), whereas Measures evaluate one single row at a time', 'Measures increase the saved .pbix file size sharply, while Calculated Columns use zero RAM', 'Calculated Columns update interactively on every slicer click; Measures stay frozen until refresh'],
    'Always write ratios and percentages (like Margin %) as Measures so the numerator and denominator sum before dividing.');

  Q('Visualization', 'What does CALCULATE([Total Revenue], ALL(DimProduct)) return in Power BI DAX?',
    'Total revenue across all products, ignoring current product filters',
    ['Zero whenever a report viewer selects a single product category inside a page slicer', 'A list of product names that recorded zero revenue in the selected calendar quarter', 'Total revenue for the single top-selling product only, hiding every other item row'],
    'ALL(DimProduct) strips the product filter context inside CALCULATE, giving you the grand total denominator for % of Total.');

  Q('Visualization', 'In DAX, how does SUMX(FactSales, FactSales[Qty] * FactSales[UnitPrice]) work?',
    'It iterates row by row, multiplies Qty by UnitPrice on each row, and sums the results',
    ['It sums the entire Qty column first, sums UnitPrice second, and multiplies the two totals', 'It creates a permanent physical column in the SQL database before loading into Power BI', 'It returns the average unit price weighted by the number of distinct product categories'],
    'Functions ending in X (SUMX, AVERAGEX) are iterators that evaluate an expression row-by-row in the current filter context.');

  Q('Visualization', 'Why use DIVIDE([Profit], [Total Revenue], 0) in DAX instead of the slash operator [Profit] / [Total Revenue]?',
    'DIVIDE safely returns 0 (or BLANK) on zero denominators cleanly',
    ['The slash operator / is only allowed inside Power Query M and triggers a DAX syntax error', 'DIVIDE automatically multiplies the quotient by 100 and formats the result with a % sign', 'The slash operator rounds both numerator and denominator to whole integers before dividing'],
    'DIVIDE handles zero denominators gracefully without needing an verbose IF([Total Revenue] = 0, ...) check.');

  Q('Visualization', 'In Tableau, what do a Blue pill (Discrete) and a Green pill (Continuous) actually control on a shelf?',
    'Blue creates discrete headers; Green draws a continuous numeric/date axis',
    ['Blue pills originate from local CSV or Excel files, while Green pills come from SQL warehouses', 'Blue pills may only be placed on the Filters shelf; Green pills may only go on Rows or Columns', 'Blue pills represent dimensions that cannot be counted; Green pills represent string categories'],
    'Remember: Blue = Discrete headers (sortable buckets); Green = Continuous axis (unbroken scale).');

  Q('Visualization', 'In Tableau, how do you let the viewer switch a chart between Revenue, Profit, and Orders with one dropdown?',
    'Use a String Parameter inside a CASE calculated field on the shelf',
    ['Duplicate the entire dashboard tab three times and ask readers to switch workbook pages', 'Drag all three measures onto the Color shelf simultaneously and hide the colour legend', 'Write a custom SQL UNION stacking the table three times with an extra metric_name column'],
    'Parameters are user-driven variables that become interactive when wired into a Calculated Field or Reference Line.');

  Q('Visualization', 'What does the Tableau LOD expression { FIXED [Customer ID] : MIN([Order Date]) } compute?',
    'Each customer\'s first order date regardless of sheet dimensions',
    ['The single earliest order date across the entire company dataset for all customers combined', 'The most recent order date per customer restricted to the currently visible chart month', 'A boolean flag returning True whenever a customer places multiple orders on the same day'],
    'FIXED Level of Detail expressions compute at the exact dimension grain you list before the colon, enabling cohort analysis.');

  Q('Visualization', 'In Tableau\'s Order of Operations, why must you click "Add to Context" on a Region filter when using a FIXED LOD or Top 10 filter?',
    'Context filters run BEFORE FIXED LODs and Top N; normal filters run AFTER',
    ['Promoting a filter to Context converts a static Tableau extract into a live SQL connection', 'Without Context, Tableau permanently deletes rows outside that Region from the underlying CSV', 'Context filters switch the dashboard colour palette to a high-contrast greyscale appearance'],
    'Context filters execute before Top N sets and FIXED LOD expressions, scoping them to the filtered subset.');

  Q('Visualization', 'In a Tableau or Power BI executive dashboard, what happens if you turn every chart into a cross-filter without clear labels?',
    'Users accidentally click a bar, silently filter the whole page, and misread the KPIs',
    ['The BI tool automatically deletes all DAX measures and LOD expressions to save memory', 'The charts stop rendering bars and convert into raw comma-separated text tables', 'The database connection locks up permanently until an administrator restarts the server'],
    'Limit interactive filter actions to 1–2 obvious master visuals and display a dynamic subtitle showing what is currently filtered.');

  Q('Visualization', 'When comparing monthly revenue against a monthly target across 12 sales teams, which visual is clearest in Power BI or Tableau?',
    'Horizontal bars with target reference lines (or bullet charts)',
    ['Twelve separate 3D pie charts arranged in a circle using bright rainbow slice palettes', 'A word cloud where each sales team name is scaled by its ratio of revenue to target', 'A geographic office map placing spinning speedometer gauges over each regional city'],
    'Bullet charts and bars with reference lines let the eye compare actual vs target on a shared linear scale immediately.');

  DA.extraQuestions = list;
})();
