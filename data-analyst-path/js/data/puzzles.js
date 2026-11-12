/* SQL blocks: build a query by tapping tiles in the right order (no typing: made for phones).
 *
 * Eight levels, from SELECT to window functions. Two kinds of puzzle:
 *   P(level, dataset, question, answer tiles in order, extra tiles that do not belong, why)
 *   F(level, dataset, question, answer tiles, BROKEN tiles, extra tiles, why)  -- "fix the bug": the broken query
 *     is already built; take the wrong tile out and put the right one in.
 * The tiles joined with spaces form the reference query. An answer is correct when it RETURNS THE SAME RESULT as the
 * reference on the practice database, so any equivalent arrangement is accepted.
 * tests/unit-v3.js runs every reference query (and checks that every broken query really is broken).
 *
 * Ids are permanent (they are saved progress): new puzzles are added at the end, whatever their level.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var list = [];

  DA.blockLevels = [
    { n: 1, icon: '🟢', name: 'Pick and sort', teaches: 'SELECT, ORDER BY, LIMIT, DISTINCT' },
    { n: 2, icon: '🔍', name: 'Filter rows', teaches: 'WHERE, AND / OR, IN, BETWEEN, LIKE' },
    { n: 3, icon: '🧮', name: 'Count and sum', teaches: 'COUNT, SUM, AVG, MIN, MAX' },
    { n: 4, icon: '📦', name: 'Groups', teaches: 'GROUP BY and HAVING' },
    { n: 5, icon: '🔗', name: 'Joins', teaches: 'JOIN, LEFT JOIN, three tables' },
    { n: 6, icon: '📅', name: 'Dates and CASE', teaches: 'strftime, date ranges, CASE WHEN' },
    { n: 7, icon: '🪆', name: 'Subqueries and CTEs', teaches: 'IN (SELECT …), WITH … AS' },
    { n: 8, icon: '🏆', name: 'Window functions', teaches: 'RANK, ROW_NUMBER, LAG, running totals' },
  ];

  function add(lv, ds, ask, tiles, broken, extra, why) {
    var n = list.length + 1;
    list.push({ id: 'b' + (n < 10 ? '0' : '') + n, lv: lv, ds: ds, ask: ask, tiles: tiles, fix: broken, extra: extra || [], sql: tiles.join(' '), why: why || '' });
  }
  function P(lv, ds, ask, tiles, extra, why) { add(lv, ds, ask, tiles, null, extra, why); }
  function F(lv, ds, ask, tiles, broken, extra, why) { add(lv, ds, ask, tiles, broken, extra, why); }

  /* ---------- the first twenty (b01-b20) ---------- */

  P(1, 'retail', 'List every product with its price, cheapest first.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price'], ['WHERE', 'GROUP BY'],
    'ORDER BY sorts from low to high unless you add DESC.');
  P(3, 'retail', 'How many orders are there?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders'], ['products', 'WHERE', 'SUM(*)'],
    'COUNT(*) counts rows.');
  P(2, 'retail', 'Which products cost more than 4?',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price > 4'], ['HAVING', 'ORDER BY'],
    'WHERE filters rows one by one.');
  P(4, 'retail', 'How many orders came through each channel?',
    ['SELECT', 'channel ,', 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'channel'], ['ORDER BY', 'WHERE'],
    'One result row per value of the GROUP BY column.');
  P(1, 'retail', 'Show the 3 most expensive products with their price.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price', 'DESC', 'LIMIT 3'], ['ASC', 'GROUP BY'],
    'Sort from high to low, then keep the first three rows.');
  P(2, 'retail', 'How many orders were delivery orders?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "channel = 'delivery'"], ['HAVING', 'channel = delivery'],
    'Text values need single quotes. Without them the database looks for a column called delivery.');
  P(1, 'retail', 'Which different channels exist?',
    ['SELECT', 'DISTINCT', 'channel', 'FROM', 'orders'], ['GROUP BY', 'COUNT(*)'],
    'DISTINCT removes repeated values.');
  P(3, 'retail', 'How many different customers have placed an order?',
    ['SELECT', 'COUNT(DISTINCT customer_id)', 'FROM', 'orders'], ['COUNT(*)', 'customers', 'GROUP BY'],
    'COUNT(DISTINCT …) counts each customer once, however many orders they made.');
  P(4, 'retail', 'Count the products in each category, biggest category first.',
    ['SELECT', 'category ,', 'COUNT(*) AS n', 'FROM', 'products', 'GROUP BY', 'category', 'ORDER BY', 'n DESC'], ['WHERE', 'HAVING'],
    'You can sort by an alias, because ORDER BY runs after SELECT.');
  P(4, 'retail', 'What is the cheapest price in each category?',
    ['SELECT', 'category ,', 'MIN(price)', 'FROM', 'products', 'GROUP BY', 'category'], ['MAX(price)', 'ORDER BY'],
    'MIN, MAX, SUM, AVG and COUNT all collapse a group into one number.');
  P(4, 'retail', 'Which categories have more than 3 products?',
    ['SELECT', 'category', 'FROM', 'products', 'GROUP BY', 'category', 'HAVING', 'COUNT(*) > 3'], ['WHERE', 'ORDER BY'],
    'A condition on a group goes in HAVING. WHERE runs before the groups exist.');
  P(4, 'retail', 'Which stores handled more than 700 orders? Return the store_id.',
    ['SELECT', 'store_id', 'FROM', 'orders', 'GROUP BY', 'store_id', 'HAVING', 'COUNT(*) > 700'], ['WHERE', 'LIMIT 700'],
    'HAVING filters the groups after counting.');
  P(4, 'lab', 'What is the average age in each group?',
    ['SELECT', 'group_name ,', 'AVG(age)', 'FROM', 'participants', 'GROUP BY', 'group_name'], ['SUM(age)', 'WHERE'],
    'AVG works per group, like every aggregate.');
  P(2, 'lab', 'Find the participants older than 50 in the intervention group.',
    ['SELECT', 'participant_id', 'FROM', 'participants', 'WHERE', 'age > 50', 'AND', "group_name = 'intervention'"], ['OR', 'HAVING'],
    'AND needs both conditions to be true. OR would also return every other intervention participant.');
  P(4, 'lab', 'Which participants attended fewer than 12 sessions? Return each one with the number attended.',
    ['SELECT', 'participant_id ,', 'COUNT(*)', 'FROM', 'sessions', 'GROUP BY', 'participant_id', 'HAVING', 'COUNT(*) < 12'], ['WHERE', 'ORDER BY'],
    'Count per participant, then keep the small groups.');
  P(5, 'retail', 'Show each product name with its total units sold.',
    ['SELECT', 'p.name ,', 'SUM(oi.qty)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'GROUP BY', 'p.name'], ['WHERE', 'p.name = oi.name'],
    'The quantity lives in order_items and the name in products: join them on the shared key.');
  P(5, 'retail', 'Revenue (qty × price) for each product category.',
    ['SELECT', 'p.category ,', 'SUM(oi.qty * p.price)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'GROUP BY', 'p.category'], ['SUM(p.price)', 'HAVING'],
    'Multiply inside the SUM, row by row, then add up per category.');
  P(5, 'retail', 'How many customers have never placed an order?',
    ['SELECT', 'COUNT(*)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL'], ['JOIN', 'o.order_id = NULL'],
    'LEFT JOIN keeps customers without orders; their order columns are NULL. "= NULL" never matches anything.');
  P(6, 'retail', 'Count the orders in each month (as YYYY-MM), in calendar order.',
    ['SELECT', "strftime('%Y-%m', order_date) AS month ,", 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'month', 'ORDER BY', 'month'], ['WHERE', 'DESC'],
    'Cut the date down to year and month, then group by it.');
  P(8, 'retail', 'Rank the products by price, with the most expensive as number 1.',
    ['SELECT', 'name ,', 'RANK() OVER', '(ORDER BY price DESC)', 'FROM', 'products'], ['GROUP BY', '(PARTITION BY price)'],
    'A window function adds a rank to every row without collapsing them.');

  /* ---------- level 1: pick and sort ---------- */

  P(1, 'retail', 'Show every store\'s city and the year it opened.',
    ['SELECT', 'city ,', 'opened_year', 'FROM', 'stores'], ['*', 'WHERE'],
    'List the columns you want, separated by commas. * would bring every column, including store_id.');
  P(1, 'retail', 'List the product names in alphabetical order (A to Z).',
    ['SELECT', 'name', 'FROM', 'products', 'ORDER BY', 'name'], ['DESC', 'GROUP BY'],
    'Text sorts alphabetically. ASC (A to Z) is the default.');
  P(1, 'retail', 'Show each product\'s name and its price with 10% tax added, as price_tax.',
    ['SELECT', 'name ,', 'price * 1.1 AS price_tax', 'FROM', 'products'], ['price + 10%', 'WHERE'],
    'You can calculate in SELECT. AS gives the new column a name.');
  P(1, 'retail', 'Show the 5 most recent orders (order_id and order_date). For the same day, the higher order_id first.',
    ['SELECT', 'order_id ,', 'order_date', 'FROM', 'orders', 'ORDER BY', 'order_date DESC ,', 'order_id DESC', 'LIMIT 5'], ['ASC', 'WHERE'],
    'A second sort column breaks ties, so the top 5 is always the same five rows.');
  P(1, 'retail', 'List each product category once, A to Z.',
    ['SELECT', 'DISTINCT', 'category', 'FROM', 'products', 'ORDER BY', 'category'], ['COUNT(*)', 'LIMIT 1'],
    'DISTINCT first removes the repeats, then ORDER BY sorts what is left.');
  P(1, 'retail', 'Show customer_id and segment for every customer, sorted by segment and then by customer_id.',
    ['SELECT', 'customer_id ,', 'segment', 'FROM', 'customers', 'ORDER BY', 'segment ,', 'customer_id'], ['DESC', 'GROUP BY'],
    'ORDER BY a, b sorts by a, and uses b only when a is the same.');
  F(1, 'retail', 'Fix the bug: this should show the 3 CHEAPEST products with their price.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price', 'LIMIT 3'],
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price', 'DESC', 'LIMIT 3'], ['ASC'],
    'DESC puts the most expensive first. Without it (or with ASC) the cheapest come first.');
  P(1, 'lab', 'Show every participant\'s id, age and site, oldest first.',
    ['SELECT', 'participant_id ,', 'age ,', 'site', 'FROM', 'participants', 'ORDER BY', 'age DESC'], ['age ASC', 'WHERE'],
    'DESC reverses the order: the biggest numbers first.');

  /* ---------- level 2: filter rows ---------- */

  P(2, 'retail', 'Which products are in the Tea category? Return the name.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', "category = 'Tea'"], ['category = Tea', 'HAVING'],
    'Compare text with = and single quotes. The values are case-sensitive: \'tea\' would find nothing.');
  P(2, 'retail', 'Products priced from 3 to 5 (both included): name and price.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'WHERE', 'price BETWEEN 3 AND 5'], ['price > 3 OR price < 5', 'HAVING'],
    'BETWEEN includes both ends. "> 3 OR < 5" is true for every price.');
  P(2, 'retail', 'Customers who live in Madrid or Lisbon: customer_id and city.',
    ['SELECT', 'customer_id ,', 'city', 'FROM', 'customers', 'WHERE', "city IN ('Madrid', 'Lisbon')"], ["city = 'Madrid' AND city = 'Lisbon'", 'LIKE'],
    'IN is a short way to write several ORs. A city cannot be Madrid AND Lisbon at the same time.');
  P(2, 'retail', 'Products with "Tea" anywhere in the name.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', "name LIKE '%Tea%'"], ["name = 'Tea'", "name LIKE 'Tea'"],
    '% means "any text here". \'%Tea%\' matches Tea at the start, middle or end.');
  P(2, 'retail', 'Products whose name starts with C.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', "name LIKE 'C%'"], ["name LIKE '%C'", "name = 'C'"],
    '\'C%\' means: C, then anything. \'%C\' would mean names that END with C.');
  P(2, 'retail', 'Every order that was NOT in store: order_id and channel.',
    ['SELECT', 'order_id ,', 'channel', 'FROM', 'orders', 'WHERE', "channel <> 'in_store'"], ["channel = 'in_store'", 'HAVING'],
    '<> means "not equal" (!= works too in SQLite).');
  P(2, 'retail', 'Students who signed up before March 2024: customer_id.',
    ['SELECT', 'customer_id', 'FROM', 'customers', 'WHERE', "segment = 'student'", 'AND', "signup_date < '2024-03-01'"], ['OR', 'HAVING'],
    'Dates stored as YYYY-MM-DD text sort correctly, so < works on them.');
  P(2, 'lab', 'Women at the North site: participant_id and age.',
    ['SELECT', 'participant_id ,', 'age', 'FROM', 'participants', 'WHERE', "sex = 'F'", 'AND', "site = 'North'"], ['OR', 'GROUP BY'],
    'Each extra AND narrows the result down.');
  F(2, 'retail', 'Fix the bug: we want Coffee products that cost more than 4.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price > 4', 'AND', "category = 'Coffee'"],
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price > 4', 'OR', "category = 'Coffee'"], ['NOT'],
    'OR returns rows where EITHER condition is true, so cheap coffees and expensive food sneak in.');
  F(2, 'lab', 'Fix the bug: heart-rate readings below 30 (sensor errors): measurement_id and value.',
    ['SELECT', 'measurement_id ,', 'value', 'FROM', 'measurements', 'WHERE', "metric = 'resting_hr'", 'AND', 'value < 30'],
    ['SELECT', 'measurement_id ,', 'value', 'FROM', 'measurements', 'WHERE', 'metric = resting_hr', 'AND', 'value < 30'], ['OR'],
    'Without quotes, resting_hr is read as a column name, and there is no such column.');
  P(2, 'lab', 'Participants aged 30 to 39: participant_id and age.',
    ['SELECT', 'participant_id ,', 'age', 'FROM', 'participants', 'WHERE', 'age >= 30', 'AND', 'age < 40'], ['OR', 'age > 30'],
    '">= 30 AND < 40" is a clean way to write a range with no gaps or overlaps.');

  /* ---------- level 3: count and sum ---------- */

  P(3, 'retail', 'The average product price, rounded to 2 decimals.',
    ['SELECT', 'ROUND(AVG(price), 2)', 'FROM', 'products'], ['AVG(price, 2)', 'SUM(price)'],
    'ROUND(value, 2) keeps two decimals. Wrap the AVG inside it.');
  P(3, 'retail', 'How many units were sold in total?',
    ['SELECT', 'SUM(qty)', 'FROM', 'order_items'], ['COUNT(qty)', 'orders'],
    'SUM adds the values. COUNT would count the rows, not the units.');
  P(3, 'retail', 'The highest price on the menu.',
    ['SELECT', 'MAX(price)', 'FROM', 'products'], ['MIN(price)', 'ORDER BY'],
    'MAX returns one number: the largest value in the column.');
  P(3, 'retail', 'How many customers are students?',
    ['SELECT', 'COUNT(*)', 'FROM', 'customers', 'WHERE', "segment = 'student'"], ['GROUP BY', 'SUM(*)'],
    'WHERE filters first, then COUNT counts what is left.');
  P(3, 'retail', 'The first and the last order date of the year.',
    ['SELECT', 'MIN(order_date) ,', 'MAX(order_date)', 'FROM', 'orders'], ['FIRST(order_date)', 'LIMIT 1'],
    'MIN and MAX work on dates too, because YYYY-MM-DD text sorts in date order.');
  P(3, 'lab', 'How many participants are in the study, and what is their average age?',
    ['SELECT', 'COUNT(*) ,', 'AVG(age)', 'FROM', 'participants'], ['GROUP BY', 'SUM(age)'],
    'Several aggregates can share one SELECT.');
  P(3, 'lab', 'The average of all vo2max measurements.',
    ['SELECT', 'AVG(value)', 'FROM', 'measurements', 'WHERE', "metric = 'vo2max'"], ['AVG(vo2max)', 'GROUP BY'],
    'In long format the metric name is a VALUE in a column, not a column itself: filter on it.');
  P(3, 'retail', 'How many order lines had more than one unit?',
    ['SELECT', 'COUNT(*)', 'FROM', 'order_items', 'WHERE', 'qty > 1'], ['SUM(qty)', 'HAVING'],
    'Filter the rows, then count them.');
  F(3, 'retail', 'Fix the bug: how many different cities do customers live in?',
    ['SELECT', 'COUNT(DISTINCT city)', 'FROM', 'customers'],
    ['SELECT', 'COUNT(city)', 'FROM', 'customers'], ['DISTINCT'],
    'COUNT(city) counts every customer that has a city. COUNT(DISTINCT city) counts each city once.');
  F(3, 'retail', 'Fix the bug: the average price of Bakery products.',
    ['SELECT', 'AVG(price)', 'FROM', 'products', 'WHERE', "category = 'Bakery'"],
    ['SELECT', 'SUM(price)', 'FROM', 'products', 'WHERE', "category = 'Bakery'"], ['MAX(price)'],
    'SUM adds the prices up; AVG divides that by how many there are.');

  /* ---------- level 4: groups ---------- */

  P(4, 'retail', 'How many customers are in each segment?',
    ['SELECT', 'segment ,', 'COUNT(*)', 'FROM', 'customers', 'GROUP BY', 'segment'], ['WHERE', 'DISTINCT'],
    'GROUP BY makes one row per segment; COUNT(*) counts the customers in each.');
  P(4, 'retail', 'Orders per store, busiest store first.',
    ['SELECT', 'store_id ,', 'COUNT(*) AS n', 'FROM', 'orders', 'GROUP BY', 'store_id', 'ORDER BY', 'n DESC'], ['HAVING', 'n ASC'],
    'Group, count, then sort by the count.');
  P(4, 'retail', 'The average price per category, only for categories averaging more than 3.',
    ['SELECT', 'category ,', 'AVG(price)', 'FROM', 'products', 'GROUP BY', 'category', 'HAVING', 'AVG(price) > 3'], ['WHERE', 'price > 3'],
    'HAVING can use any aggregate, even one that is not in the SELECT.');
  P(4, 'lab', 'How many sessions took place in each week, in week order?',
    ['SELECT', 'week ,', 'COUNT(*)', 'FROM', 'sessions', 'GROUP BY', 'week', 'ORDER BY', 'week'], ['DESC', 'HAVING'],
    'Watching the count fall week by week is how you spot drop-out.');
  F(4, 'retail', 'Fix the bug: the segments with more than 100 customers.',
    ['SELECT', 'segment', 'FROM', 'customers', 'GROUP BY', 'segment', 'HAVING', 'COUNT(*) > 100'],
    ['SELECT', 'segment', 'FROM', 'customers', 'WHERE', 'COUNT(*) > 100', 'GROUP BY', 'segment'], ['ORDER BY'],
    'WHERE runs before the groups exist, so it cannot count them. Conditions on groups go in HAVING, after GROUP BY.');
  F(4, 'lab', 'Fix the bug: the number of participants at each site.',
    ['SELECT', 'site ,', 'COUNT(*)', 'FROM', 'participants', 'GROUP BY', 'site'],
    ['SELECT', 'site ,', 'COUNT(*)', 'FROM', 'participants'], ['ORDER BY', 'DISTINCT'],
    'Without GROUP BY the whole table is one group: you get one row with the total and a random site.');

  /* ---------- level 5: joins ---------- */

  P(5, 'retail', 'Every order with the city of its store: order_id and city.',
    ['SELECT', 'o.order_id ,', 's.city', 'FROM', 'orders o', 'JOIN', 'stores s', 'ON', 's.store_id = o.store_id'], ['s.city = o.city', 'WHERE'],
    'JOIN … ON says which columns match. The aliases (o, s) keep the names short.');
  P(5, 'retail', 'The number of orders in each store city.',
    ['SELECT', 's.city ,', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'stores s', 'ON', 's.store_id = o.store_id', 'GROUP BY', 's.city'], ['HAVING', 'o.city'],
    'Join first, then group by a column from the other table.');
  P(5, 'retail', 'The number of orders from each customer segment.',
    ['SELECT', 'c.segment ,', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'customers c', 'ON', 'c.customer_id = o.customer_id', 'GROUP BY', 'c.segment'], ['c.customer_id = o.order_id', 'WHERE'],
    'The segment lives in customers and the orders in orders: customer_id links them.');
  P(5, 'retail', 'Revenue (qty × price) for each channel. Three tables!',
    ['SELECT', 'o.channel ,', 'SUM(oi.qty * p.price)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'JOIN', 'orders o', 'ON', 'o.order_id = oi.order_id', 'GROUP BY', 'o.channel'], ['SUM(p.price)', 'WHERE'],
    'Each JOIN adds one table with its own ON. Prices are in products, quantities in order_items, channels in orders.');
  P(5, 'lab', 'The number of sessions at each site.',
    ['SELECT', 'p.site ,', 'COUNT(*)', 'FROM', 'sessions s', 'JOIN', 'participants p', 'ON', 'p.participant_id = s.participant_id', 'GROUP BY', 'p.site'], ['WHERE', 's.site'],
    'Sessions do not know the site; participants do. Join to borrow the column.');
  P(5, 'lab', 'The average vo2max in each group (control and intervention).',
    ['SELECT', 'p.group_name ,', 'AVG(m.value)', 'FROM', 'measurements m', 'JOIN', 'sessions s', 'ON', 's.session_id = m.session_id', 'JOIN', 'participants p', 'ON', 'p.participant_id = s.participant_id', 'WHERE', "m.metric = 'vo2max'", 'GROUP BY', 'p.group_name'], ['HAVING', 'AVG(value)'],
    'Measurements → sessions → participants: follow the keys one step at a time.');
  F(5, 'retail', 'Fix the bug: the number of orders from customers of each city.',
    ['SELECT', 'c.city ,', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'customers c', 'ON', 'c.customer_id = o.customer_id', 'GROUP BY', 'c.city'],
    ['SELECT', 'c.city ,', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'customers c', 'ON', 'c.customer_id = o.store_id', 'GROUP BY', 'c.city'], ['WHERE'],
    'The join ran, but on the wrong key: store ids 1 to 5 matched customers 1 to 5. Always join a key to the SAME key.');
  F(5, 'retail', 'Fix the bug: the ids of the customers who never ordered.',
    ['SELECT', 'c.customer_id', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL'],
    ['SELECT', 'c.customer_id', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id = NULL'], ['JOIN'],
    'NULL is "unknown", so "= NULL" is never true. Use IS NULL.');

  /* ---------- level 6: dates and CASE ---------- */

  P(6, 'retail', 'How many orders were placed in December?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "strftime('%m', order_date) = '12'"], ['MONTH(order_date) = 12', "order_date = '12'"],
    'strftime cuts a piece out of a date: %Y year, %m month, %d day, %w weekday. It returns text, so compare with \'12\'.');
  P(6, 'retail', 'Orders per weekday (0 = Sunday … 6 = Saturday), in weekday order.',
    ['SELECT', "strftime('%w', order_date) AS weekday ,", 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'weekday', 'ORDER BY', 'weekday'], ['DESC', 'WHERE'],
    'Group by a piece of the date to see weekly patterns.');
  P(6, 'retail', 'Label each product \'cheap\' (under 3) or \'regular\': name and label.',
    ['SELECT', 'name ,', "CASE WHEN price < 3 THEN 'cheap'", "ELSE 'regular' END AS label", 'FROM', 'products'], ["IF(price < 3, 'cheap')", 'WHERE'],
    'CASE WHEN … THEN … ELSE … END is SQL\'s if/else. It creates a new column.');
  P(6, 'retail', 'Count the products in three price bands: under 3, 3 to 5, over 5.',
    ['SELECT', "CASE WHEN price < 3 THEN 'under 3'", "WHEN price <= 5 THEN '3 to 5'", "ELSE 'over 5' END AS band ,", 'COUNT(*)', 'FROM', 'products', 'GROUP BY', 'band'], ['WHERE', 'ORDER BY'],
    'CASE checks the WHENs in order and stops at the first true one, so "<= 5" only sees prices from 3 up.');
  P(6, 'retail', 'The share of delivery orders, as a percentage with 1 decimal.',
    ['SELECT', 'ROUND(100.0 *', "SUM(CASE WHEN channel = 'delivery' THEN 1 ELSE 0 END)", '/ COUNT(*) , 1)', 'FROM', 'orders'], ['ROUND(100 *', 'GROUP BY'],
    'SUM(CASE … 1 ELSE 0) counts the matches. 100.0 (not 100) avoids whole-number division, which would drop the decimals.');
  P(6, 'lab', 'Participants under 40 and 40 or older: band and count.',
    ['SELECT', "CASE WHEN age < 40 THEN 'under 40' ELSE '40 plus' END AS band ,", 'COUNT(*)', 'FROM', 'participants', 'GROUP BY', 'band'], ['WHERE', 'HAVING'],
    'Grouping by a CASE turns a number into categories.');
  P(6, 'lab', 'How many sessions took place in January 2025?',
    ['SELECT', 'COUNT(*)', 'FROM', 'sessions', 'WHERE', "session_date >= '2025-01-01'", 'AND', "session_date < '2025-02-01'"], ['session_date < 2025-02-01', 'OR'],
    'From the first day of the month up to, but not including, the first day of the next: no 30-or-31 to remember.');
  P(6, 'retail', 'Delivery orders per month (YYYY-MM), in calendar order.',
    ['SELECT', "strftime('%Y-%m', order_date) AS month ,", 'COUNT(*)', 'FROM', 'orders', 'WHERE', "channel = 'delivery'", 'GROUP BY', 'month', 'ORDER BY', 'month'], ['HAVING', 'DESC'],
    'WHERE comes before GROUP BY: filter the rows, then group what is left.');
  F(6, 'retail', 'Fix the bug: how many orders in the first half of the year (January to June)?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "order_date < '2025-07-01'"],
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "order_date < '2025-06-30'"], ["order_date < '2025-06-01'"],
    '"< June 30" loses June 30 itself. "< July 1" includes every day of June.');
  F(6, 'retail', 'Fix the bug: count the orders made at the weekend and on weekdays.',
    ['SELECT', "CASE WHEN strftime('%w', order_date) IN ('0', '6') THEN 'weekend'", "ELSE 'weekday' END AS day_type ,", 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'day_type'],
    ['SELECT', "CASE WHEN strftime('%w', order_date) IN ('0', '6') THEN 'weekend'", 'END AS day_type ,', 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'day_type'], ['WHERE'],
    'A CASE without ELSE returns NULL for everything else: the weekdays ended up in a NULL group.');

  /* ---------- level 7: subqueries and CTEs ---------- */

  P(7, 'retail', 'Products that cost more than the average product: name and price.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'WHERE', 'price >', '(SELECT AVG(price) FROM products)'], ['AVG(price)', 'HAVING'],
    'A subquery in brackets runs first and hands its single number to the outer query.');
  P(7, 'retail', 'The name of the most expensive product.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price =', '(SELECT MAX(price) FROM products)'], ['MAX(price)', 'GROUP BY'],
    'You cannot write WHERE price = MAX(price): the subquery finds the maximum first.');
  P(7, 'retail', 'How many customers have ordered at least once by delivery?',
    ['SELECT', 'COUNT(*)', 'FROM', 'customers', 'WHERE', 'customer_id IN', '(SELECT customer_id FROM orders', "WHERE channel = 'delivery')"], ['customer_id =', 'JOIN'],
    'IN (SELECT …) checks membership in a list. A JOIN here would count a customer once per delivery order.');
  P(7, 'lab', 'The participants who never had their weight recorded.',
    ['SELECT', 'participant_id', 'FROM', 'participants', 'WHERE', 'participant_id NOT IN', '(SELECT s.participant_id FROM sessions s', 'JOIN measurements m ON m.session_id = s.session_id', "WHERE m.metric = 'weight_kg')"], ['participant_id IN', 'GROUP BY'],
    'NOT IN finds who is missing from a list. Missing data is a finding: say it in your report.');
  P(7, 'retail', 'The average number of orders per customer (customers who ordered at least once).',
    ['WITH per AS', '(SELECT customer_id , COUNT(*) AS n FROM orders GROUP BY customer_id)', 'SELECT', 'AVG(n)', 'FROM', 'per'], ['COUNT(n)', 'orders'],
    'WITH … AS names a step. Count per customer first, then average those counts.');
  P(7, 'retail', 'Loyal customers: the ones with more than 20 orders, with their count.',
    ['WITH c AS', '(SELECT customer_id , COUNT(*) AS n FROM orders GROUP BY customer_id)', 'SELECT', 'customer_id ,', 'n', 'FROM', 'c', 'WHERE', 'n > 20'], ['HAVING', 'n < 20'],
    'After the CTE, n is an ordinary column, so plain WHERE works on it.');
  P(7, 'retail', 'Each product\'s price next to the average price of its category.',
    ['SELECT', 'name ,', 'price ,', '(SELECT AVG(p2.price) FROM products p2', 'WHERE p2.category = p.category)', 'FROM', 'products p'], ['GROUP BY', 'p.category = p.category)'],
    'A correlated subquery runs once per row and can use that row\'s values (p.category).');
  P(7, 'retail', 'The stores with more orders than the average store: store_id.',
    ['WITH s AS', '(SELECT store_id , COUNT(*) AS n FROM orders GROUP BY store_id)', 'SELECT', 'store_id', 'FROM', 's', 'WHERE', 'n >', '(SELECT AVG(n) FROM s)'], ['AVG(n)', 'HAVING'],
    'A CTE can be used more than once: here in the main query and inside the subquery.');
  P(7, 'lab', 'How many participants dropped out before the last week (week 11)?',
    ['WITH last AS', '(SELECT participant_id , MAX(week) AS w FROM sessions GROUP BY participant_id)', 'SELECT', 'COUNT(*)', 'FROM', 'last', 'WHERE', 'w < 11'], ['w = 11', 'GROUP BY'],
    'First find each participant\'s last week, then count the short ones.');
  F(7, 'retail', 'Fix the bug: products cheaper than the average product.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price <', '(SELECT AVG(price) FROM products)'],
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price <', 'AVG(price)'], ['HAVING'],
    'An aggregate cannot sit in WHERE ("misuse of aggregate"). Put it in a subquery.');
  F(7, 'retail', 'Fix the bug: how many customers have never ordered?',
    ['SELECT', 'COUNT(*)', 'FROM', 'customers', 'WHERE', 'customer_id NOT IN', '(SELECT customer_id FROM orders)'],
    ['SELECT', 'COUNT(*)', 'FROM', 'customers', 'WHERE', 'customer_id IN', '(SELECT customer_id FROM orders)'], ['NOT'],
    'IN counted the customers who DID order. NOT IN keeps the ones missing from the list.');

  /* ---------- level 8: window functions ---------- */

  P(8, 'retail', 'Rank the products by price inside each category (1 = most expensive): category, name, rank.',
    ['SELECT', 'category ,', 'name ,', 'RANK() OVER', '(PARTITION BY category ORDER BY price DESC) AS rnk', 'FROM', 'products'], ['GROUP BY', '(ORDER BY category)'],
    'PARTITION BY restarts the ranking for each category, like a GROUP BY that keeps every row.');
  P(8, 'retail', 'Orders per month and the running total so far.',
    ['WITH m AS', "(SELECT strftime('%Y-%m', order_date) AS month , COUNT(*) AS n FROM orders GROUP BY month)", 'SELECT', 'month ,', 'n ,', 'SUM(n) OVER (ORDER BY month) AS running', 'FROM', 'm', 'ORDER BY', 'month'], ['SUM(n)', 'GROUP BY'],
    'SUM … OVER (ORDER BY …) adds up everything up to the current row: a running total.');
  P(8, 'retail', 'Orders per month and the change from the month before.',
    ['WITH m AS', "(SELECT strftime('%Y-%m', order_date) AS month , COUNT(*) AS n FROM orders GROUP BY month)", 'SELECT', 'month ,', 'n -', 'LAG(n)', 'OVER (ORDER BY month) AS change', 'FROM', 'm', 'ORDER BY', 'month'], ['LEAD(n)', 'GROUP BY'],
    'LAG looks one row back, LEAD one row forward. The first month has no previous one, so its change is NULL.');
  P(8, 'retail', 'Number each customer\'s orders 1, 2, 3… by date (then by order_id): customer_id, order_id, nth.',
    ['SELECT', 'customer_id ,', 'order_id ,', 'ROW_NUMBER() OVER', '(PARTITION BY customer_id ORDER BY order_date , order_id) AS nth', 'FROM', 'orders'], ['GROUP BY', 'COUNT(*)'],
    'ROW_NUMBER numbers the rows of each partition. nth = 1 is each customer\'s first order.');
  P(8, 'retail', 'Each category\'s share of total revenue, as a percentage with 1 decimal.',
    ['WITH r AS', '(SELECT p.category , SUM(oi.qty * p.price) AS rev FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category)', 'SELECT', 'category ,', 'ROUND(100 * rev / SUM(rev) OVER () , 1) AS pct', 'FROM', 'r'], ['GROUP BY', 'SUM(rev)'],
    'OVER () with nothing inside means "over all rows": the grand total, repeated on every row.');
  P(8, 'retail', 'The top 2 products by units sold in each category: category and name.',
    ['WITH u AS', '(SELECT p.category , p.name , SUM(oi.qty) AS units FROM order_items oi JOIN products p ON p.product_id = oi.product_id GROUP BY p.category , p.name) ,', 'r AS', '(SELECT * , RANK() OVER (PARTITION BY category ORDER BY units DESC) AS k FROM u)', 'SELECT', 'category ,', 'name', 'FROM', 'r', 'WHERE', 'k <= 2'], ['k < 2', 'LIMIT 2'],
    'The classic "top N per group": rank inside each group, then keep ranks 1 and 2. LIMIT 2 would keep 2 rows in total.');
  P(8, 'retail', 'Every product with the average price of its category on the same row: name, category, cat_avg.',
    ['SELECT', 'name ,', 'category ,', 'AVG(price) OVER (PARTITION BY category) AS cat_avg', 'FROM', 'products'], ['GROUP BY', 'AVG(price)'],
    'GROUP BY would squash the products into one row per category. A window keeps every row.');
  P(8, 'retail', 'A 3-month moving average of monthly orders.',
    ['WITH m AS', "(SELECT strftime('%Y-%m', order_date) AS month , COUNT(*) AS n FROM orders GROUP BY month)", 'SELECT', 'month ,', 'AVG(n) OVER', '(ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg3', 'FROM', 'm', 'ORDER BY', 'month'], ['(PARTITION BY month)', 'GROUP BY'],
    'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW: this month and the two before. Moving averages smooth out noise.');
  P(8, 'lab', 'Number each participant\'s sessions 1, 2, 3… by week: participant_id, week, nth.',
    ['SELECT', 'participant_id ,', 'week ,', 'ROW_NUMBER() OVER', '(PARTITION BY participant_id ORDER BY week) AS nth', 'FROM', 'sessions'], ['GROUP BY', '(ORDER BY participant_id)'],
    'One numbering per participant, restarting at 1.');
  F(8, 'retail', 'Fix the bug: monthly orders with a RUNNING total.',
    ['WITH m AS', "(SELECT strftime('%Y-%m', order_date) AS month , COUNT(*) AS n FROM orders GROUP BY month)", 'SELECT', 'month ,', 'SUM(n) OVER (ORDER BY month) AS running', 'FROM', 'm', 'ORDER BY', 'month'],
    ['WITH m AS', "(SELECT strftime('%Y-%m', order_date) AS month , COUNT(*) AS n FROM orders GROUP BY month)", 'SELECT', 'month ,', 'SUM(n) OVER () AS running', 'FROM', 'm', 'ORDER BY', 'month'], ['GROUP BY'],
    'An empty OVER () sums ALL the rows: every month shows the year\'s total. ORDER BY inside OVER makes it a running sum.');
  F(8, 'retail', 'Fix the bug: rank the products by price INSIDE each category.',
    ['SELECT', 'category ,', 'name ,', 'RANK() OVER', '(PARTITION BY category ORDER BY price DESC) AS r', 'FROM', 'products'],
    ['SELECT', 'category ,', 'name ,', 'RANK() OVER', '(ORDER BY price DESC) AS r', 'FROM', 'products'], ['GROUP BY'],
    'Without PARTITION BY there is one ranking for the whole menu.');

  /* ---------- extended puzzles across all 8 levels (b95-b122) ---------- */

  P(1, 'retail', 'List all store cities in reverse alphabetical order (Z to A).',
    ['SELECT', 'city', 'FROM', 'stores', 'ORDER BY', 'city', 'DESC'], ['ASC', 'GROUP BY'],
    'DESC sorts text from Z down to A.');
  P(1, 'retail', 'Which different cities do registered customers live in, A to Z?',
    ['SELECT', 'DISTINCT', 'city', 'FROM', 'customers', 'ORDER BY', 'city'], ['COUNT(*)', 'LIMIT 5'],
    'DISTINCT keeps one row per unique city.');
  P(1, 'lab', 'Show the 5 youngest participants: participant_id and age (ties by participant_id).',
    ['SELECT', 'participant_id ,', 'age', 'FROM', 'participants', 'ORDER BY', 'age ,', 'participant_id', 'LIMIT 5'], ['DESC', 'WHERE'],
    'Ascending is the default sort, so the smallest ages come first.');
  F(1, 'retail', 'Fix the bug: show each customer segment once.',
    ['SELECT', 'DISTINCT', 'segment', 'FROM', 'customers'],
    ['SELECT', 'segment', 'FROM', 'customers'], ['ORDER BY'],
    'Without DISTINCT, segment is repeated 400 times—once for every customer row.');

  P(2, 'retail', 'Which stores opened in 2021 or later? Return city and opened_year.',
    ['SELECT', 'city ,', 'opened_year', 'FROM', 'stores', 'WHERE', 'opened_year >= 2021'], ['opened_year > 2021', 'HAVING'],
    '>= includes 2021 itself; > would start at 2022.');
  P(2, 'retail', 'Find products in the Bakery or Food categories: name and category.',
    ['SELECT', 'name ,', 'category', 'FROM', 'products', 'WHERE', "category IN ('Bakery', 'Food')"], ["category = 'Bakery' AND category = 'Food'", 'GROUP BY'],
    'IN checks whether a value matches any item in the list.');
  P(2, 'lab', 'Men in the control group at the South site: participant_id.',
    ['SELECT', 'participant_id', 'FROM', 'participants', 'WHERE', "sex = 'M'", 'AND', "group_name = 'control'", 'AND', "site = 'South'"], ['OR', 'HAVING'],
    'Chain three conditions with AND when all three must hold.');
  F(2, 'retail', 'Fix the bug: pickup orders placed at store 1: order_id.',
    ['SELECT', 'order_id', 'FROM', 'orders', 'WHERE', "channel = 'pickup'", 'AND', 'store_id = 1'],
    ['SELECT', 'order_id', 'FROM', 'orders', 'WHERE', "channel = 'pickup'", 'OR', 'store_id = 1'], ['HAVING'],
    'OR returns every pickup order everywhere PLUS every order at store 1.');

  P(3, 'retail', 'What is the lowest product price on the menu?',
    ['SELECT', 'MIN(price)', 'FROM', 'products'], ['MAX(price)', 'ORDER BY'],
    'MIN returns the smallest value in the column.');
  P(3, 'retail', 'How many orders were placed via pickup?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "channel = 'pickup'"], ['SUM(channel)', 'HAVING'],
    'Filter to pickup rows with WHERE, then count them.');
  P(3, 'lab', 'What are the youngest and oldest participant ages?',
    ['SELECT', 'MIN(age) ,', 'MAX(age)', 'FROM', 'participants'], ['AVG(age)', 'GROUP BY'],
    'MIN and MAX in one SELECT give the full range at a glance.');
  F(3, 'retail', 'Fix the bug: total units sold for product_id 1.',
    ['SELECT', 'SUM(qty)', 'FROM', 'order_items', 'WHERE', 'product_id = 1'],
    ['SELECT', 'COUNT(qty)', 'FROM', 'order_items', 'WHERE', 'product_id = 1'], ['GROUP BY'],
    'COUNT counts how many order lines included product 1, ignoring whether someone bought 2 or 3 units.');

  P(4, 'retail', 'How many stores opened in each year?',
    ['SELECT', 'opened_year ,', 'COUNT(*)', 'FROM', 'stores', 'GROUP BY', 'opened_year'], ['WHERE', 'SUM(opened_year)'],
    'GROUP BY opened_year creates one group per opening year.');
  P(4, 'retail', 'Total units sold per product_id, only for products with more than 600 units sold.',
    ['SELECT', 'product_id ,', 'SUM(qty)', 'FROM', 'order_items', 'GROUP BY', 'product_id', 'HAVING', 'SUM(qty) > 600'], ['WHERE', 'COUNT(qty) > 600'],
    'Filter the summed group total with HAVING SUM(qty) > 600.');
  P(4, 'lab', 'Average measurement value for each metric name.',
    ['SELECT', 'metric ,', 'AVG(value)', 'FROM', 'measurements', 'GROUP BY', 'metric'], ['WHERE', 'SUM(value)'],
    'Grouping by metric summarises vo2max, resting_hr and weight_kg separately.');
  F(4, 'retail', 'Fix the bug: highest price in each product category.',
    ['SELECT', 'category ,', 'MAX(price)', 'FROM', 'products', 'GROUP BY', 'category'],
    ['SELECT', 'category ,', 'MIN(price)', 'FROM', 'products', 'GROUP BY', 'category'], ['WHERE'],
    'MIN gives the cheapest price in each category; MAX gives the highest.');

  P(5, 'retail', 'Total units sold for each product category: category and units.',
    ['SELECT', 'p.category ,', 'SUM(oi.qty)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'GROUP BY', 'p.category'], ['COUNT(*)', 'WHERE'],
    'Join order_items to products on product_id, then sum qty by category.');
  P(5, 'retail', 'How many orders were placed at stores opened before 2021?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'stores s', 'ON', 's.store_id = o.store_id', 'WHERE', 's.opened_year < 2021'], ['HAVING', 's.opened_year > 2021'],
    'Join orders to stores so you can filter by stores.opened_year.');
  P(5, 'lab', 'Average resting_hr for each sex (F and M).',
    ['SELECT', 'p.sex ,', 'AVG(m.value)', 'FROM', 'measurements m', 'JOIN', 'sessions s', 'ON', 's.session_id = m.session_id', 'JOIN', 'participants p', 'ON', 'p.participant_id = s.participant_id', 'WHERE', "m.metric = 'resting_hr'", 'GROUP BY', 'p.sex'], ['HAVING', 'p.site'],
    'Link measurements → sessions → participants, filter to resting_hr, and group by sex.');
  F(5, 'lab', 'Fix the bug: show session_id and the participant\'s group_name for every session.',
    ['SELECT', 's.session_id ,', 'p.group_name', 'FROM', 'sessions s', 'JOIN', 'participants p', 'ON', 'p.participant_id = s.participant_id'],
    ['SELECT', 's.session_id ,', 'p.group_name', 'FROM', 'sessions s', 'JOIN', 'participants p', 'ON', 'p.participant_id = s.session_id'], ['WHERE'],
    'Join on the shared foreign key (participant_id), never on session_id = participant_id.');

  P(6, 'retail', 'How many customers signed up in each month of 2024 (as YYYY-MM), in calendar order?',
    ['SELECT', "strftime('%Y-%m', signup_date) AS m ,", 'COUNT(*)', 'FROM', 'customers', 'GROUP BY', 'm', 'ORDER BY', 'm'], ['WHERE', 'DESC'],
    'strftime(\'%Y-%m\', signup_date) extracts the year-month string.');
  P(6, 'retail', 'Label stores as \'early\' (opened before 2021) or \'recent\': city and era.',
    ['SELECT', 'city ,', "CASE WHEN opened_year < 2021 THEN 'early'", "ELSE 'recent' END AS era", 'FROM', 'stores'], ['WHERE', 'GROUP BY'],
    'CASE WHEN turns a year threshold into a clean two-value label.');
  P(6, 'lab', 'Count participants by age bracket: \'under 30\', \'30 to 49\', \'50 plus\'.',
    ['SELECT', "CASE WHEN age < 30 THEN 'under 30'", "WHEN age < 50 THEN '30 to 49'", "ELSE '50 plus' END AS bracket ,", 'COUNT(*)', 'FROM', 'participants', 'GROUP BY', 'bracket'], ['WHERE', 'HAVING'],
    'Each WHEN is checked in turn, so the second branch only sees ages 30 and above.');

  P(7, 'lab', 'Participants who are older than the average participant: participant_id and age.',
    ['SELECT', 'participant_id ,', 'age', 'FROM', 'participants', 'WHERE', 'age >', '(SELECT AVG(age) FROM participants)'], ['AVG(age)', 'HAVING'],
    'The scalar subquery computes the overall average age first.');
  P(7, 'retail', 'Products that have been ordered in a line of 3 units (qty = 3): name.',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'product_id IN', '(SELECT product_id FROM order_items', 'WHERE qty = 3)'], ['product_id NOT IN', 'GROUP BY'],
    'IN (SELECT …) tests whether the product appears in any 3-unit order line without multiplying rows.');
  F(7, 'lab', 'Fix the bug: average number of sessions attended per participant.',
    ['WITH c AS', '(SELECT participant_id , COUNT(*) AS n FROM sessions GROUP BY participant_id)', 'SELECT', 'AVG(n)', 'FROM', 'c'],
    ['WITH c AS', '(SELECT participant_id , COUNT(*) AS n FROM sessions GROUP BY participant_id)', 'SELECT', 'SUM(n)', 'FROM', 'c'], ['COUNT(n)'],
    'SUM(n) just adds all sessions back up; AVG(n) averages the per-participant counts.');

  P(8, 'retail', 'Dense-rank products by price from highest to lowest: name, price, drnk.',
    ['SELECT', 'name ,', 'price ,', 'DENSE_RANK() OVER', '(ORDER BY price DESC) AS drnk', 'FROM', 'products'], ['GROUP BY', '(PARTITION BY price)'],
    'DENSE_RANK leaves no gaps in the ranking numbers when two prices tie.');
  P(8, 'lab', 'Each participant\'s age alongside the average age at their site: participant_id, site, age, site_avg.',
    ['SELECT', 'participant_id ,', 'site ,', 'age ,', 'AVG(age) OVER (PARTITION BY site) AS site_avg', 'FROM', 'participants'], ['GROUP BY', 'AVG(age)'],
    'AVG(age) OVER (PARTITION BY site) attaches the site average to every participant row.');

  DA.puzzles = list;
  DA.puzzleById = {};
  list.forEach(function (p) { DA.puzzleById[p.id] = p; });
})();
