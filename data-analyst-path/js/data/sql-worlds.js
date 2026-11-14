/* SQLab worlds 5 to 8: cleaning in SQL, the app funnel, subscriptions and retention, experiments and support. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  function Q(o) { DA.challenges.push(o); }
  function ex(wl, ds, title, sql, explain) { DA.sqlExamples.push({ wl: wl, ds: ds, level: +wl[0], title: title, sql: sql, explain: explain }); }
  var CONV = 'CASE WHEN c.user_id IS NOT NULL THEN 1.0 ELSE 0 END';

  /* ---------- World 5: clean data in SQL ---------- */
  ex('5-1', 'growth', 'COALESCE fills a gap', "SELECT ticket_id, COALESCE(category, 'unknown') AS category\nFROM tickets\nLIMIT 5;", 'COALESCE returns its first argument that is not NULL. AVG, SUM and COUNT(column) skip NULLs; COUNT(*) counts every row.');
  ex('5-2', 'growth', 'One spelling', "SELECT LOWER(TRIM(channel)) AS channel, COUNT(*) AS tickets\nFROM tickets\nGROUP BY 1;", 'TRIM removes spaces at both ends and LOWER fixes the case, so "Email", "email " and " EMAIL" become one group.');
  ex('5-3', 'retail', 'UNION and a self-join', 'SELECT city FROM stores\nUNION\nSELECT city FROM customers;', 'UNION stacks two results with the same columns and removes duplicates (UNION ALL keeps them). A self-join joins a table to itself with two aliases.');
  ex('5-4', 'growth', 'Read before you trust', "SELECT COUNT(*) FROM tickets\nWHERE created_at >= '2025-11-01' AND created_at < '2025-12-01';", 'Half-open date ranges (>= start and < next start) never miss the last day, even when the column holds a time.');

  Q({ id: 'g1', ds: 'growth', level: 5, wl: '5-1', title: 'Tickets without a category', concept: 'IS NULL',
    task: 'How many tickets have no category? Return one number.',
    hint: 'NULL is not a value, so <code>= NULL</code> never matches. Use <code>WHERE category IS NULL</code>.',
    solution: 'SELECT COUNT(*) AS tickets\nFROM tickets\nWHERE category IS NULL;' });
  Q({ id: 'g2', ds: 'growth', level: 5, wl: '5-1', title: 'Fill the gaps', concept: 'COALESCE + GROUP BY',
    task: 'Count tickets per category, showing missing categories as <code>unknown</code>. Return <code>category</code>, <code>tickets</code>, most tickets first (ties by category).',
    hint: "<code>COALESCE(category, 'unknown')</code>, then GROUP BY it.",
    solution: "SELECT COALESCE(category, 'unknown') AS category, COUNT(*) AS tickets\nFROM tickets\nGROUP BY 1\nORDER BY tickets DESC, category;" });
  Q({ id: 'g3', ds: 'growth', level: 5, wl: '5-1', title: 'Satisfaction, honestly', concept: 'AVG skips NULL',
    task: 'Return the average <code>csat</code> rounded to 2 decimals as <code>avg_csat</code>, and how many tickets were rated as <code>rated</code>.',
    hint: 'AVG and COUNT(csat) both skip the NULLs: <code>ROUND(AVG(csat), 2), COUNT(csat)</code>.',
    solution: 'SELECT ROUND(AVG(csat), 2) AS avg_csat, COUNT(csat) AS rated\nFROM tickets;' });
  Q({ id: 'g4', ds: 'growth', level: 5, wl: '5-2', title: 'One spelling per channel', concept: 'LOWER + TRIM',
    task: 'Count tickets per channel after cleaning the spelling (no spaces, lower case). Return <code>channel</code>, <code>tickets</code>, most first.',
    hint: 'Group by <code>LOWER(TRIM(channel))</code>.',
    solution: 'SELECT LOWER(TRIM(channel)) AS channel, COUNT(*) AS tickets\nFROM tickets\nGROUP BY 1\nORDER BY tickets DESC;' });
  Q({ id: 'g5', ds: 'growth', level: 5, wl: '5-2', title: 'Priority in one case', concept: 'LOWER',
    task: 'Some priorities were typed in capitals. Count tickets per priority in lower case. Return <code>priority</code>, <code>tickets</code>, most first.',
    hint: 'Group by <code>LOWER(priority)</code>.',
    solution: 'SELECT LOWER(priority) AS priority, COUNT(*) AS tickets\nFROM tickets\nGROUP BY 1\nORDER BY tickets DESC;' });
  Q({ id: 'g6', ds: 'growth', level: 5, wl: '5-2', title: 'Hours to resolve', concept: 'julianday',
    task: 'For resolved tickets, the average hours from <code>created_at</code> to <code>resolved_at</code> per priority (lower case), rounded to 1 decimal. Return <code>priority</code>, <code>avg_hours</code>, slowest first.',
    hint: 'In SQLite, <code>(julianday(resolved_at) - julianday(created_at)) * 24</code> is a number of hours. Keep only <code>resolved_at IS NOT NULL</code>.',
    solution: 'SELECT LOWER(priority) AS priority, ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 1) AS avg_hours\nFROM tickets\nWHERE resolved_at IS NOT NULL\nGROUP BY 1\nORDER BY avg_hours DESC;' });
  Q({ id: 'r37', ds: 'retail', level: 5, wl: '5-3', title: 'Every city we know', concept: 'UNION',
    task: 'List every city that appears in <code>stores</code> or in <code>customers</code>, once each, A to Z. Return <code>city</code>.',
    hint: 'Two SELECTs joined by UNION, then ORDER BY city.',
    solution: 'SELECT city FROM stores\nUNION\nSELECT city FROM customers\nORDER BY city;' });
  Q({ id: 'r38', ds: 'retail', level: 5, wl: '5-3', title: 'Twice on the same day', concept: 'self-join',
    task: 'How many customers placed two different orders on the same day? Return one number.',
    hint: 'Join <code>orders o1</code> to <code>orders o2</code> on the same customer and date, with <code>o1.order_id &lt; o2.order_id</code>, then COUNT(DISTINCT o1.customer_id).',
    solution: 'SELECT COUNT(DISTINCT o1.customer_id) AS customers\nFROM orders o1\nJOIN orders o2 ON o1.customer_id = o2.customer_id AND o1.order_date = o2.order_date AND o1.order_id < o2.order_id;' });
  Q({ id: 'r39', ds: 'retail', level: 5, wl: '5-3', title: 'Bought with a croissant', concept: 'self-join',
    task: 'Which 3 products appear most often in the same order as a Croissant? Return <code>name</code>, <code>orders</code>, most first (ties by name).',
    hint: 'Join order_items to itself on order_id (different item_id), find the croissant on one side with products, count the other side.',
    solution: "SELECT p2.name, COUNT(*) AS orders\nFROM order_items a\nJOIN products p1 ON p1.product_id = a.product_id\nJOIN order_items b ON b.order_id = a.order_id AND b.item_id <> a.item_id\nJOIN products p2 ON p2.product_id = b.product_id\nWHERE p1.name = 'Croissant'\nGROUP BY p2.name\nORDER BY orders DESC, p2.name\nLIMIT 3;" });
  Q({ id: 'g7', ds: 'growth', level: 5, wl: '5-4', type: 'bug', title: 'The AI undercounts', concept: 'COUNT(*) vs COUNT(column)',
    task: 'An AI assistant wrote this query to count all tickets per channel, but its totals look low. Fix it. Return <code>channel</code>, <code>tickets</code>.',
    hint: 'COUNT(category) skips tickets with no category. Count rows instead.',
    starter: 'SELECT LOWER(TRIM(channel)) AS channel, COUNT(category) AS tickets\nFROM tickets\nGROUP BY 1;',
    solution: 'SELECT LOWER(TRIM(channel)) AS channel, COUNT(*) AS tickets\nFROM tickets\nGROUP BY 1;' });
  Q({ id: 'g8', ds: 'growth', level: 5, wl: '5-4', type: 'bug', title: 'Tickets per team', concept: 'join keys',
    task: 'The AI joined tickets to agents to count tickets per team, and the numbers make no sense. Fix the join. Return <code>team</code>, <code>tickets</code>.',
    hint: 'A ticket belongs to an agent through <code>agent_id</code>, not through its own id.',
    starter: 'SELECT a.team, COUNT(*) AS tickets\nFROM tickets t\nJOIN agents a ON t.ticket_id = a.agent_id\nGROUP BY a.team;',
    solution: 'SELECT a.team, COUNT(*) AS tickets\nFROM tickets t\nJOIN agents a ON t.agent_id = a.agent_id\nGROUP BY a.team;' });
  Q({ id: 'g9', ds: 'growth', level: 5, wl: '5-4', type: 'bug', title: 'The missing last day', concept: 'date ranges',
    task: 'This query counts the tickets created in November, but it misses some. Fix it. Return one number.',
    hint: "<code>created_at</code> also holds a time, so '2025-11-30 14:05' is after '2025-11-30'. Use >= '2025-11-01' AND < '2025-12-01'.",
    starter: "SELECT COUNT(*) AS tickets\nFROM tickets\nWHERE created_at BETWEEN '2025-11-01' AND '2025-11-30';",
    solution: "SELECT COUNT(*) AS tickets\nFROM tickets\nWHERE created_at >= '2025-11-01' AND created_at < '2025-12-01';" });

  /* ---------- World 6: the app funnel ---------- */
  ex('6-1', 'app', 'Count events and sessions', 'SELECT event_name, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions\nFROM events\nGROUP BY event_name;', 'An event table has one row per action. A session groups the actions of one visit, so COUNT(DISTINCT session_id) counts visits.');
  ex('6-2', 'app', 'One row per session', "WITH s AS (\n  SELECT session_id, MAX(event_name = 'purchase') AS bought\n  FROM events GROUP BY session_id\n)\nSELECT AVG(bought) FROM s;", 'In SQLite a comparison is 1 or 0, so MAX(event_name = ...) flags whether a session reached a step. Average the flags to get a rate.');
  ex('6-3', 'app', 'Read a query', "SELECT COUNT(*) FROM events WHERE event_name = 'checkout';", 'Before you run a query, say what it will return. Then run it and compare: it is the fastest way to find a wrong mental model.');
  ex('6-4', 'app', 'Pin the question down', "SELECT COUNT(DISTINCT user_id) FROM events\nWHERE event_time >= '2025-12-01';", '"How many people use the app?" can mean signups, visitors or buyers. Ask first, then write the query for the definition you agreed on.');

  Q({ id: 'a1', ds: 'app', level: 6, wl: '6-1', title: 'Sessions', concept: 'COUNT DISTINCT',
    task: 'How many sessions are there in <code>events</code>? Return one number.',
    hint: 'One session has several events: <code>COUNT(DISTINCT session_id)</code>.',
    solution: 'SELECT COUNT(DISTINCT session_id) AS sessions\nFROM events;' });
  Q({ id: 'a2', ds: 'app', level: 6, wl: '6-1', title: 'Events per step', concept: 'GROUP BY',
    task: 'Count events per <code>event_name</code>. Return <code>event_name</code>, <code>events</code>, most first.',
    hint: 'GROUP BY event_name, ORDER BY the count descending.',
    solution: 'SELECT event_name, COUNT(*) AS events\nFROM events\nGROUP BY event_name\nORDER BY events DESC;' });
  Q({ id: 'a3', ds: 'app', level: 6, wl: '6-1', title: 'Purchases by platform', concept: 'JOIN + WHERE',
    task: 'Count purchase events per platform. Return <code>platform</code>, <code>purchases</code>, most first.',
    hint: "Join events to users on user_id, keep <code>event_name = 'purchase'</code>, group by platform.",
    solution: "SELECT u.platform, COUNT(*) AS purchases\nFROM events e\nJOIN users u ON u.user_id = e.user_id\nWHERE e.event_name = 'purchase'\nGROUP BY u.platform\nORDER BY purchases DESC;" });
  Q({ id: 'a4', ds: 'app', level: 6, wl: '6-2', title: 'Cart to purchase', concept: 'CTE + flags',
    task: 'Of the sessions with an <code>add_to_cart</code>, what share also has a <code>purchase</code>? Return one number rounded to 3 decimals.',
    hint: "Build one row per session with <code>MAX(event_name = 'add_to_cart') AS cart</code> and the same for purchase, then <code>1.0 * SUM(bought) / SUM(cart)</code>.",
    solution: "WITH s AS (\n  SELECT session_id, MAX(event_name = 'add_to_cart') AS cart, MAX(event_name = 'purchase') AS bought\n  FROM events GROUP BY session_id\n)\nSELECT ROUND(1.0 * SUM(bought) / SUM(cart), 3) AS cart_to_purchase\nFROM s;" });
  Q({ id: 'a5', ds: 'app', level: 6, wl: '6-2', title: 'Conversion by platform', concept: 'CTE + AVG of flags',
    task: 'Per platform, the share of sessions that end in a purchase, rounded to 3 decimals. Return <code>platform</code>, <code>conversion</code>, highest first.',
    hint: 'One row per session and platform with a purchase flag, then AVG(flag) per platform.',
    solution: "WITH s AS (\n  SELECT e.session_id, u.platform, MAX(e.event_name = 'purchase') AS bought\n  FROM events e JOIN users u ON u.user_id = e.user_id\n  GROUP BY e.session_id, u.platform\n)\nSELECT platform, ROUND(AVG(bought), 3) AS conversion\nFROM s\nGROUP BY platform\nORDER BY conversion DESC;" });
  Q({ id: 'a6', ds: 'app', level: 6, wl: '6-2', title: 'Where the web loses people', concept: 'step conversion',
    task: 'Per platform, the share of sessions with a cart that reach <code>checkout</code>, rounded to 3. Return <code>platform</code>, <code>cart_to_checkout</code>, lowest first.',
    hint: 'Two flags per session (cart, checkout), then <code>1.0 * SUM(checkout) / SUM(cart)</code> per platform.',
    solution: "WITH s AS (\n  SELECT e.session_id, u.platform, MAX(e.event_name = 'add_to_cart') AS cart, MAX(e.event_name = 'checkout') AS checkout\n  FROM events e JOIN users u ON u.user_id = e.user_id\n  GROUP BY e.session_id, u.platform\n)\nSELECT platform, ROUND(1.0 * SUM(checkout) / SUM(cart), 3) AS cart_to_checkout\nFROM s\nGROUP BY platform\nORDER BY cart_to_checkout;" });
  Q({ id: 'a7', ds: 'app', level: 6, wl: '6-3', type: 'predict', title: 'How many purchases?', concept: 'read a query',
    task: 'Without running it: what does this query return?', hint: 'It counts rows, one per purchase event.',
    code: "SELECT COUNT(*) FROM events WHERE event_name = 'purchase';", options: ['1027', '3099', '886', '9178'], answer: 2, why: 'One row per purchase event.',
    solution: "SELECT COUNT(*) FROM events WHERE event_name = 'purchase';" });
  Q({ id: 'a8', ds: 'app', level: 6, wl: '6-3', type: 'predict', title: 'Active members', concept: 'read a query',
    task: 'Without running it: what does this query return?', hint: 'Members without a cancel date are still in the club.',
    code: 'SELECT COUNT(*) FROM members WHERE cancel_date IS NULL;', options: ['436', '300', '136', '1200'], answer: 1, why: 'NULL cancel date means the member has not left.',
    solution: 'SELECT COUNT(*) FROM members WHERE cancel_date IS NULL;' });
  Q({ id: 'a9', ds: 'app', level: 6, wl: '6-3', type: 'predict', title: 'The priciest plan', concept: 'read a query',
    task: 'Without running it: what does this query return?', hint: 'Sorted from the highest price, then the first row only.',
    code: 'SELECT plan FROM plans ORDER BY monthly_price DESC LIMIT 1;', options: ['basic', 'plus', '14.99', 'family'], answer: 3, why: 'Family costs 14.99 a month.',
    solution: 'SELECT plan FROM plans ORDER BY monthly_price DESC LIMIT 1;' });
  Q({ id: 'a10', ds: 'app', level: 6, wl: '6-4', type: 'ask', title: 'How many people use the app?', concept: 'define the metric',
    ask: { who: 'Kai (app)', says: 'How many people actually use the app?', q: 'What do you ask or decide first?', answer: 1, why: '"Use" needs a time window and a unit: people (users), not events or signups.',
      options: ['Count every row in events', 'Agree on a window: users with at least one event in the last month of data', 'Count everyone who ever signed up', 'Count Dot Club members'] },
    task: 'Count the different users with at least one event in December 2025 (<code>event_time</code> from 2025-12-01). Return one number.',
    hint: "<code>COUNT(DISTINCT user_id)</code> with <code>WHERE event_time >= '2025-12-01'</code>.",
    solution: "SELECT COUNT(DISTINCT user_id) AS active_users\nFROM events\nWHERE event_time >= '2025-12-01';" });
  Q({ id: 'a11', ds: 'app', level: 6, wl: '6-4', type: 'ask', title: 'Which signup source brings buyers?', concept: 'rate per group',
    ask: { who: 'Theo (marketing)', says: 'Which signup source brings us buyers?', q: 'Which measure answers it fairly?', answer: 2, why: 'Sources have different sizes, so compare the share of users who bought, not the raw counts.',
      options: ['The number of users per source', 'The number of purchases per source', 'The share of users per source who bought at least once', 'The newest users per source'] },
    task: 'Per <code>referral</code>, the share of users with at least one purchase, rounded to 3. Return <code>referral</code>, <code>buyer_rate</code>, highest first.',
    hint: 'LEFT JOIN users to the distinct buyers, then average a 1/0 flag per referral.',
    solution: "SELECT u.referral, ROUND(AVG(CASE WHEN p.user_id IS NOT NULL THEN 1.0 ELSE 0 END), 3) AS buyer_rate\nFROM users u\nLEFT JOIN (SELECT DISTINCT user_id FROM events WHERE event_name = 'purchase') p ON p.user_id = u.user_id\nGROUP BY u.referral\nORDER BY buyer_rate DESC;" });
  Q({ id: 'a12', ds: 'app', level: 6, wl: '6-4', type: 'ask', title: 'Busier at the weekend?', concept: 'strftime',
    ask: { who: 'Rosa (operations)', says: 'Is the app busier at the weekend?', q: 'What should you count?', answer: 0, why: 'Sessions are visits. Compare weekdays and weekends, keeping in mind there are five weekdays for every two weekend days.',
      options: ['Sessions, split into weekday and weekend', 'Users who signed up on a Saturday', 'Purchases on Sundays only', 'Events per user'] },
    task: 'Count sessions by <code>day_type</code> (<code>weekend</code> or <code>weekday</code>, using the time of the first event). Return <code>day_type</code>, <code>sessions</code>, A to Z.',
    hint: "One row per session with MIN(event_time); <code>strftime('%w', t)</code> is '0' on Sunday and '6' on Saturday.",
    solution: "WITH s AS (SELECT session_id, MIN(event_time) AS t FROM events GROUP BY session_id)\nSELECT CASE WHEN strftime('%w', t) IN ('0', '6') THEN 'weekend' ELSE 'weekday' END AS day_type, COUNT(*) AS sessions\nFROM s\nGROUP BY day_type\nORDER BY day_type;" });

  /* ---------- World 7: subscriptions and retention ---------- */
  ex('7-1', 'app', 'Monthly recurring revenue', "SELECT month, SUM(amount) AS billed\nFROM invoices\nWHERE paid = 1\nGROUP BY month;", 'MRR is the revenue a subscription business can expect every month. Count only what was actually paid.');
  ex('7-2', 'app', 'Cohorts', 'SELECT substr(start_date, 1, 7) AS cohort, COUNT(*) AS members\nFROM members\nGROUP BY cohort;', 'A cohort is a group that started in the same period. Following each cohort over time shows retention without mixing old and new members.');
  ex('7-3', 'app', 'An interview pattern', 'SELECT plan FROM plans\nORDER BY monthly_price DESC\nLIMIT 1 OFFSET 1;', 'Classic interview questions: the second highest, rows with no match (NOT EXISTS) and top N per group. Say your plan out loud before you type.');
  ex('7-4', 'app', 'Churn by group', 'SELECT plan, AVG(cancel_date IS NOT NULL) AS churned\nFROM members\nGROUP BY plan;', 'Churn is the share of members who left. Compare it by group, and remember: a difference between groups is a lead, not a cause.');

  Q({ id: 'a13', ds: 'app', level: 7, wl: '7-1', title: 'Active members by plan', concept: 'IS NULL + GROUP BY',
    task: 'Count active members (no cancel date) per plan. Return <code>plan</code>, <code>active</code>, most first.',
    hint: 'WHERE cancel_date IS NULL, GROUP BY plan.',
    solution: 'SELECT plan, COUNT(*) AS active\nFROM members\nWHERE cancel_date IS NULL\nGROUP BY plan\nORDER BY active DESC;' });
  Q({ id: 'a14', ds: 'app', level: 7, wl: '7-1', title: 'MRR in December', concept: 'SUM + WHERE',
    task: 'The paid revenue of December 2025 (<code>month = \'2025-12\'</code>), rounded to 2. Return one number.',
    hint: "SUM(amount) WHERE month = '2025-12' AND paid = 1.",
    solution: "SELECT ROUND(SUM(amount), 2) AS mrr\nFROM invoices\nWHERE month = '2025-12' AND paid = 1;" });
  Q({ id: 'a15', ds: 'app', level: 7, wl: '7-1', title: 'Failed payments', concept: 'rate per month',
    task: 'Per month, the share of invoices that failed (<code>paid = 0</code>), rounded to 3. Return <code>month</code>, <code>failed_rate</code>, oldest first.',
    hint: '<code>1.0 * SUM(paid = 0) / COUNT(*)</code> per month.',
    solution: 'SELECT month, ROUND(1.0 * SUM(paid = 0) / COUNT(*), 3) AS failed_rate\nFROM invoices\nGROUP BY month\nORDER BY month;' });
  Q({ id: 'a16', ds: 'app', level: 7, wl: '7-2', title: 'Cohort sizes', concept: 'substr + GROUP BY',
    task: 'Count members per start month (<code>YYYY-MM</code>). Return <code>cohort</code>, <code>members</code>, oldest first.',
    hint: '<code>substr(start_date, 1, 7)</code> is the month.',
    solution: 'SELECT substr(start_date, 1, 7) AS cohort, COUNT(*) AS members\nFROM members\nGROUP BY cohort\nORDER BY cohort;' });
  Q({ id: 'a17', ds: 'app', level: 7, wl: '7-2', title: 'Still here', concept: 'AVG of a flag',
    task: 'Per start month, the share of members who are still active, rounded to 3. Return <code>cohort</code>, <code>still_active</code>, oldest first.',
    hint: 'AVG(cancel_date IS NULL) per cohort.',
    solution: 'SELECT substr(start_date, 1, 7) AS cohort, ROUND(AVG(cancel_date IS NULL), 3) AS still_active\nFROM members\nGROUP BY cohort\nORDER BY cohort;' });
  Q({ id: 'a18', ds: 'app', level: 7, wl: '7-2', title: 'Third-month retention', concept: 'cohort grid',
    task: 'For cohorts that started before October 2025, the share of members with an invoice exactly 3 months after their start month, rounded to 3. Return <code>cohort</code>, <code>retained_m3</code>, oldest first.',
    hint: 'Turn months into numbers (year × 12 + month) for members and invoices, then LEFT JOIN on invoice month = start month + 3.',
    solution: "WITH m AS (\n  SELECT member_id, substr(start_date, 1, 7) AS cohort, CAST(substr(start_date, 1, 4) AS INTEGER) * 12 + CAST(substr(start_date, 6, 2) AS INTEGER) AS k\n  FROM members WHERE start_date < '2025-10-01'\n), i AS (\n  SELECT DISTINCT member_id, CAST(substr(month, 1, 4) AS INTEGER) * 12 + CAST(substr(month, 6, 2) AS INTEGER) AS k\n  FROM invoices\n)\nSELECT m.cohort, ROUND(AVG(CASE WHEN i.member_id IS NOT NULL THEN 1.0 ELSE 0 END), 3) AS retained_m3\nFROM m LEFT JOIN i ON i.member_id = m.member_id AND i.k = m.k + 3\nGROUP BY m.cohort\nORDER BY m.cohort;" });
  Q({ id: 'a19', ds: 'app', level: 7, wl: '7-3', type: 'interview', title: 'The second priciest plan', concept: 'LIMIT OFFSET',
    task: 'Return the <code>plan</code> with the second highest monthly price.',
    hint: 'Sort by price descending, skip one: <code>LIMIT 1 OFFSET 1</code>.',
    solution: 'SELECT plan\nFROM plans\nORDER BY monthly_price DESC\nLIMIT 1 OFFSET 1;' });
  Q({ id: 'a20', ds: 'app', level: 7, wl: '7-3', type: 'interview', title: 'Never bought', concept: 'NOT EXISTS',
    task: 'How many users never had a purchase event? Return one number.',
    hint: "<code>WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.user_id AND e.event_name = 'purchase')</code>.",
    solution: "SELECT COUNT(*) AS users\nFROM users u\nWHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.user_id AND e.event_name = 'purchase');" });
  Q({ id: 'a21', ds: 'app', level: 7, wl: '7-3', type: 'interview', title: 'The most loyal users', concept: 'top N',
    task: 'The 3 users with the most sessions. Return <code>user_id</code>, <code>sessions</code>, most first (ties by user_id).',
    hint: 'COUNT(DISTINCT session_id) per user, ORDER BY it DESC, user_id, LIMIT 3.',
    solution: 'SELECT user_id, COUNT(DISTINCT session_id) AS sessions\nFROM events\nGROUP BY user_id\nORDER BY sessions DESC, user_id\nLIMIT 3;' });
  Q({ id: 'a22', ds: 'app', level: 7, wl: '7-4', type: 'case', title: 'Churn by plan', concept: 'AVG of a flag',
    task: 'Per plan, the share of members who cancelled, rounded to 3. Return <code>plan</code>, <code>churned</code>, highest first.',
    hint: 'AVG(cancel_date IS NOT NULL) per plan.',
    finding: { q: 'Which plan loses the largest share of its members?', options: ['basic', 'plus', 'family', 'They are all the same'], answer: 0, why: 'The cheapest plan churns the most: a lead for the team, not proof of why.' },
    solution: 'SELECT plan, ROUND(AVG(cancel_date IS NOT NULL), 3) AS churned\nFROM members\nGROUP BY plan\nORDER BY churned DESC;' });
  Q({ id: 'a23', ds: 'app', level: 7, wl: '7-4', type: 'case', title: 'Revenue walking out', concept: 'SUM + WHERE',
    task: 'The monthly price of all members who cancelled, added up and rounded to 2. Return one number.',
    hint: 'SUM(monthly_price) WHERE cancel_date IS NOT NULL.',
    solution: 'SELECT ROUND(SUM(monthly_price), 2) AS lost_mrr\nFROM members\nWHERE cancel_date IS NOT NULL;' });
  Q({ id: 'a24', ds: 'app', level: 7, wl: '7-4', type: 'case', title: 'Do app buyers stay?', concept: 'LEFT JOIN + CASE',
    task: 'Compare churn for members who bought in the app (<code>buyer</code>) and those who never did (<code>no purchase</code>), rounded to 3. Return <code>segment</code>, <code>churned</code>, A to Z.',
    hint: 'LEFT JOIN members to the distinct buyers, label with CASE, AVG(cancel_date IS NOT NULL).',
    finding: { q: 'Members who bought in the app cancel more often. What is the honest reading?', options: ['Buying in the app makes members cancel', 'The two go together: find out why before acting', 'The query must be wrong', 'Stop selling in the app'], answer: 1, why: 'A difference between groups is a lead. Maybe heavy users also try other cafés: talk to them, or test, before changing anything.' },
    solution: "SELECT CASE WHEN p.user_id IS NULL THEN 'no purchase' ELSE 'buyer' END AS segment, ROUND(AVG(m.cancel_date IS NOT NULL), 3) AS churned\nFROM members m\nLEFT JOIN (SELECT DISTINCT user_id FROM events WHERE event_name = 'purchase') p ON p.user_id = m.user_id\nGROUP BY segment\nORDER BY segment;" });

  /* ---------- World 8: experiments and support ---------- */
  ex('8-1', 'growth', 'Compare two versions', "SELECT a.variant, COUNT(*) AS users, COUNT(c.user_id) AS buyers\nFROM assignments a\nLEFT JOIN conversions c ON c.user_id = a.user_id AND c.campaign_id = a.campaign_id\nWHERE a.campaign_id = 1\nGROUP BY a.variant;", 'Start from everyone who was assigned (LEFT JOIN), not only from the buyers, or the rates will be wrong.');
  ex('8-2', 'growth', 'Service levels', "SELECT COUNT(*) FROM tickets\nWHERE resolved_at IS NULL;", 'Support teams track open tickets, time to resolve and satisfaction. Decide how to treat open tickets before averaging times.');
  ex('8-3', 'growth', 'Clean in one query', "SELECT LOWER(TRIM(channel)) AS channel,\n       COALESCE(category, 'unknown') AS category\nFROM tickets;", 'Do the cleaning steps in order inside one query (or a CTE per step), so anyone can re-run them.');
  ex('8-4', 'app', 'Monday numbers', "SELECT month, SUM(amount) AS revenue\nFROM invoices WHERE paid = 1\nGROUP BY month ORDER BY month;", 'A short list of numbers, the same every week, each with one line on what changed.');

  Q({ id: 'g10', ds: 'growth', level: 8, wl: '8-1', title: 'Who saw what', concept: 'GROUP BY',
    task: 'In campaign 1, how many users were assigned to each variant? Return <code>variant</code>, <code>users</code>, A to Z.',
    hint: 'WHERE campaign_id = 1, GROUP BY variant.',
    solution: 'SELECT variant, COUNT(*) AS users\nFROM assignments\nWHERE campaign_id = 1\nGROUP BY variant\nORDER BY variant;' });
  Q({ id: 'g11', ds: 'growth', level: 8, wl: '8-1', title: 'Conversion by variant', concept: 'LEFT JOIN + AVG',
    task: 'In campaign 1, the conversion rate per variant, rounded to 4. Return <code>variant</code>, <code>conversion</code>, A to Z.',
    hint: 'LEFT JOIN assignments to conversions on user and campaign, then AVG of a 1/0 flag.',
    solution: 'SELECT a.variant, ROUND(AVG(' + CONV + '), 4) AS conversion\nFROM assignments a\nLEFT JOIN conversions c ON c.user_id = a.user_id AND c.campaign_id = a.campaign_id\nWHERE a.campaign_id = 1\nGROUP BY a.variant\nORDER BY a.variant;' });
  Q({ id: 'g12', ds: 'growth', level: 8, wl: '8-1', title: 'Revenue per user', concept: 'COALESCE + division',
    task: 'In campaign 1, revenue per assigned user for each variant (non-buyers count as 0), rounded to 3. Return <code>variant</code>, <code>revenue_per_user</code>, A to Z.',
    hint: 'SUM(COALESCE(c.revenue, 0)) / COUNT(*) after the LEFT JOIN.',
    solution: 'SELECT a.variant, ROUND(SUM(COALESCE(c.revenue, 0)) / COUNT(*), 3) AS revenue_per_user\nFROM assignments a\nLEFT JOIN conversions c ON c.user_id = a.user_id AND c.campaign_id = a.campaign_id\nWHERE a.campaign_id = 1\nGROUP BY a.variant\nORDER BY a.variant;' });
  Q({ id: 'g13', ds: 'growth', level: 8, wl: '8-2', title: 'Open tickets by priority', concept: 'IS NULL + LOWER',
    task: 'Count open tickets (no <code>resolved_at</code>) per priority in lower case. Return <code>priority</code>, <code>open_tickets</code>, most first.',
    hint: 'WHERE resolved_at IS NULL, GROUP BY LOWER(priority).',
    solution: 'SELECT LOWER(priority) AS priority, COUNT(*) AS open_tickets\nFROM tickets\nWHERE resolved_at IS NULL\nGROUP BY 1\nORDER BY open_tickets DESC;' });
  Q({ id: 'g14', ds: 'growth', level: 8, wl: '8-2', title: 'Inside the SLA', concept: 'AVG of a condition',
    task: 'Of the resolved high-priority tickets, what share was resolved within 8 hours? Round to 3. Return one number.',
    hint: 'AVG of the condition <code>(julianday(resolved_at) - julianday(created_at)) * 24 &lt;= 8</code>.',
    solution: "SELECT ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24 <= 8), 3) AS within_sla\nFROM tickets\nWHERE LOWER(priority) = 'high' AND resolved_at IS NOT NULL;" });
  Q({ id: 'g15', ds: 'growth', level: 8, wl: '8-2', title: 'Agent leaderboard', concept: 'JOIN + several aggregates',
    task: 'The 5 agents with the most resolved tickets. Return <code>name</code>, <code>resolved</code>, <code>avg_csat</code> (rounded to 2), most resolved first (ties by name).',
    hint: 'COUNT(resolved_at) counts only resolved tickets; AVG(csat) skips unrated ones.',
    solution: 'SELECT a.name, COUNT(t.resolved_at) AS resolved, ROUND(AVG(t.csat), 2) AS avg_csat\nFROM tickets t\nJOIN agents a ON a.agent_id = t.agent_id\nGROUP BY a.name\nORDER BY resolved DESC, a.name\nLIMIT 5;' });
  Q({ id: 'g16', ds: 'growth', level: 8, wl: '8-3', type: 'gauntlet', title: 'The clean ticket table', concept: 'cleaning steps',
    steps: ['Trim and lower-case <code>channel</code>.', 'Show a missing <code>category</code> as <code>unknown</code>.', 'Keep resolved tickets only.', 'Count tickets per channel and category.'],
    task: 'Return <code>channel</code>, <code>category</code>, <code>tickets</code>, sorted by channel then category.',
    hint: 'All four steps fit in one SELECT with GROUP BY 1, 2.',
    solution: "SELECT LOWER(TRIM(channel)) AS channel, COALESCE(category, 'unknown') AS category, COUNT(*) AS tickets\nFROM tickets\nWHERE resolved_at IS NOT NULL\nGROUP BY 1, 2\nORDER BY 1, 2;" });
  Q({ id: 'g17', ds: 'growth', level: 8, wl: '8-3', type: 'gauntlet', title: 'Clean, then measure', concept: 'cleaning steps',
    steps: ['Trim and lower-case <code>channel</code>.', 'Keep resolved tickets only.', 'Compute hours to resolve.', 'Average them per channel.'],
    task: 'Return <code>channel</code>, <code>avg_hours</code> (rounded to 1), fastest first.',
    hint: 'Hours are <code>(julianday(resolved_at) - julianday(created_at)) * 24</code>.',
    solution: 'SELECT LOWER(TRIM(channel)) AS channel, ROUND(AVG((julianday(resolved_at) - julianday(created_at)) * 24), 1) AS avg_hours\nFROM tickets\nWHERE resolved_at IS NOT NULL\nGROUP BY 1\nORDER BY avg_hours;' });
  Q({ id: 'g18', ds: 'growth', level: 8, wl: '8-3', type: 'gauntlet', title: 'Satisfaction after cleaning', concept: 'cleaning steps',
    steps: ['Lower-case <code>priority</code>.', 'Keep rated tickets only.', 'Average <code>csat</code> and count the ratings per priority.'],
    task: 'Return <code>priority</code>, <code>avg_csat</code> (rounded to 2), <code>rated</code>, highest satisfaction first.',
    hint: 'WHERE csat IS NOT NULL, GROUP BY LOWER(priority).',
    solution: 'SELECT LOWER(priority) AS priority, ROUND(AVG(csat), 2) AS avg_csat, COUNT(*) AS rated\nFROM tickets\nWHERE csat IS NOT NULL\nGROUP BY 1\nORDER BY avg_csat DESC;' });
  Q({ id: 'a25', ds: 'app', level: 8, wl: '8-4', type: 'boss', title: 'Monday 1: paying members', concept: 'COUNT DISTINCT',
    task: 'How many different members paid an invoice in December 2025? Return one number.',
    hint: "COUNT(DISTINCT member_id) WHERE month = '2025-12' AND paid = 1.",
    solution: "SELECT COUNT(DISTINCT member_id) AS paying\nFROM invoices\nWHERE month = '2025-12' AND paid = 1;" });
  Q({ id: 'g19', ds: 'growth', level: 8, wl: '8-4', type: 'boss', title: 'Monday 2: last week\'s tickets', concept: 'date range',
    task: 'How many tickets were created from Monday 8 to Sunday 14 December 2025? Return one number.',
    hint: "created_at >= '2025-12-08' AND created_at < '2025-12-15'.",
    solution: "SELECT COUNT(*) AS tickets\nFROM tickets\nWHERE created_at >= '2025-12-08' AND created_at < '2025-12-15';" });
  Q({ id: 'a26', ds: 'app', level: 8, wl: '8-4', type: 'boss', title: 'Monday 3: the headline', concept: 'LAG',
    task: 'Paid revenue per month from October 2025, with the change from the month before. Return <code>month</code>, <code>revenue</code>, <code>change</code> (both rounded to 2), oldest first.',
    hint: 'A CTE with paid revenue per month, then <code>revenue - LAG(revenue) OVER (ORDER BY month)</code>. Filter months in the outer query.',
    finding: { q: 'What is the headline for December?', options: ['Paid revenue grew by 64.95', 'Paid revenue fell by 82.85 (about 3%) from November', 'Paid revenue was 2,481.08 lower', 'Revenue did not change'], answer: 1, why: 'Lead with the number and its direction, then look for the cause (cancellations, failed payments).' },
    solution: "WITH m AS (SELECT month, SUM(amount) AS revenue FROM invoices WHERE paid = 1 GROUP BY month)\nSELECT month, ROUND(revenue, 2) AS revenue, ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS change\nFROM m\nWHERE month >= '2025-10'\nORDER BY month;" });
})();
