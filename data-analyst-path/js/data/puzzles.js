/* SQL blocks: build a query by tapping tiles in the right order (no typing: made for phones).
 *
 * P(dataset, question, tiles of the answer in order, extra tiles that do not belong)
 * The tiles joined with spaces form the reference query. An answer is correct when it RETURNS THE SAME RESULT
 * as the reference on the practice database, so any equivalent arrangement is accepted.
 * tests/unit-v3.js runs every reference query, so a puzzle cannot ship broken.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var list = [];
  function P(ds, ask, tiles, extra, why) {
    var n = list.length + 1;
    list.push({ id: 'b' + (n < 10 ? '0' : '') + n, ds: ds, ask: ask, tiles: tiles, extra: extra || [], sql: tiles.join(' '), why: why || '' });
  }

  P('retail', 'List every product with its price, cheapest first.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price'], ['WHERE', 'GROUP BY'],
    'ORDER BY sorts from low to high unless you add DESC.');
  P('retail', 'How many orders are there?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders'], ['products', 'WHERE', 'SUM(*)'],
    'COUNT(*) counts rows.');
  P('retail', 'Which products cost more than 4?',
    ['SELECT', 'name', 'FROM', 'products', 'WHERE', 'price > 4'], ['HAVING', 'ORDER BY'],
    'WHERE filters rows one by one.');
  P('retail', 'How many orders came through each channel?',
    ['SELECT', 'channel ,', 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'channel'], ['ORDER BY', 'WHERE'],
    'One result row per value of the GROUP BY column.');
  P('retail', 'Show the 3 most expensive products with their price.',
    ['SELECT', 'name ,', 'price', 'FROM', 'products', 'ORDER BY', 'price', 'DESC', 'LIMIT 3'], ['ASC', 'GROUP BY'],
    'Sort from high to low, then keep the first three rows.');
  P('retail', 'How many orders were delivery orders?',
    ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "channel = 'delivery'"], ['HAVING', 'channel = delivery'],
    'Text values need single quotes. Without them the database looks for a column called delivery.');
  P('retail', 'Which different channels exist?',
    ['SELECT', 'DISTINCT', 'channel', 'FROM', 'orders'], ['GROUP BY', 'COUNT(*)'],
    'DISTINCT removes repeated values.');
  P('retail', 'How many different customers have placed an order?',
    ['SELECT', 'COUNT(DISTINCT customer_id)', 'FROM', 'orders'], ['COUNT(*)', 'customers', 'GROUP BY'],
    'COUNT(DISTINCT …) counts each customer once, however many orders they made.');
  P('retail', 'Count the products in each category, biggest category first.',
    ['SELECT', 'category ,', 'COUNT(*) AS n', 'FROM', 'products', 'GROUP BY', 'category', 'ORDER BY', 'n DESC'], ['WHERE', 'HAVING'],
    'You can sort by an alias, because ORDER BY runs after SELECT.');
  P('retail', 'What is the cheapest price in each category?',
    ['SELECT', 'category ,', 'MIN(price)', 'FROM', 'products', 'GROUP BY', 'category'], ['MAX(price)', 'ORDER BY'],
    'MIN, MAX, SUM, AVG and COUNT all collapse a group into one number.');
  P('retail', 'Which categories have more than 3 products?',
    ['SELECT', 'category', 'FROM', 'products', 'GROUP BY', 'category', 'HAVING', 'COUNT(*) > 3'], ['WHERE', 'ORDER BY'],
    'A condition on a group goes in HAVING. WHERE runs before the groups exist.');
  P('retail', 'Which stores handled more than 700 orders? Return the store_id.',
    ['SELECT', 'store_id', 'FROM', 'orders', 'GROUP BY', 'store_id', 'HAVING', 'COUNT(*) > 700'], ['WHERE', 'LIMIT 700'],
    'HAVING filters the groups after counting.');
  P('lab', 'What is the average age in each group?',
    ['SELECT', 'group_name ,', 'AVG(age)', 'FROM', 'participants', 'GROUP BY', 'group_name'], ['SUM(age)', 'WHERE'],
    'AVG works per group, like every aggregate.');
  P('lab', 'Find the participants older than 50 in the intervention group.',
    ['SELECT', 'participant_id', 'FROM', 'participants', 'WHERE', 'age > 50', 'AND', "group_name = 'intervention'"], ['OR', 'HAVING'],
    'AND needs both conditions to be true. OR would also return every other intervention participant.');
  P('lab', 'Which participants attended fewer than 12 sessions? Return each one with the number attended.',
    ['SELECT', 'participant_id ,', 'COUNT(*)', 'FROM', 'sessions', 'GROUP BY', 'participant_id', 'HAVING', 'COUNT(*) < 12'], ['WHERE', 'ORDER BY'],
    'Count per participant, then keep the small groups.');
  P('retail', 'Show each product name with its total units sold.',
    ['SELECT', 'p.name ,', 'SUM(oi.qty)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'GROUP BY', 'p.name'], ['WHERE', 'p.name = oi.name'],
    'The quantity lives in order_items and the name in products: join them on the shared key.');
  P('retail', 'Revenue (qty × price) for each product category.',
    ['SELECT', 'p.category ,', 'SUM(oi.qty * p.price)', 'FROM', 'order_items oi', 'JOIN', 'products p', 'ON', 'p.product_id = oi.product_id', 'GROUP BY', 'p.category'], ['SUM(p.price)', 'HAVING'],
    'Multiply inside the SUM, row by row, then add up per category.');
  P('retail', 'How many customers have never placed an order?',
    ['SELECT', 'COUNT(*)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON', 'o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL'], ['JOIN', 'o.order_id = NULL'],
    'LEFT JOIN keeps customers without orders; their order columns are NULL. "= NULL" never matches anything.');
  P('retail', 'Count the orders in each month (as YYYY-MM), in calendar order.',
    ['SELECT', "strftime('%Y-%m', order_date) AS month ,", 'COUNT(*)', 'FROM', 'orders', 'GROUP BY', 'month', 'ORDER BY', 'month'], ['WHERE', 'DESC'],
    'Cut the date down to year and month, then group by it.');
  P('retail', 'Rank the products by price, with the most expensive as number 1.',
    ['SELECT', 'name ,', 'RANK() OVER', '(ORDER BY price DESC)', 'FROM', 'products'], ['GROUP BY', '(PARTITION BY price)'],
    'A window function adds a rank to every row without collapsing them.');

  DA.puzzles = list;
  DA.puzzleById = {};
  list.forEach(function (p) { DA.puzzleById[p.id] = p; });
})();
