/* Practice datasets and SQL challenges.
 *
 * Both datasets are generated in the browser from a fixed random seed, so every learner
 * gets identical data and the answers can be checked by running a reference query.
 * Nothing here touches the DOM, so the file also runs under Node (used by the tests).
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  DA.gen = {};

  /* ---------- helpers ---------- */

  // mulberry32: small, fast, seedable.
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) {
    var u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateStr(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function addDays(iso, n) {
    var p = iso.split('-');
    return dateStr(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000);
  }
  function pickWeighted(r, weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var x = r() * total;
    for (i = 0; i < weights.length; i++) {
      x -= weights[i];
      if (x < 0) return i;
    }
    return weights.length - 1;
  }
  function round(v, d) { var k = Math.pow(10, d); return Math.round(v * k) / k; }
  function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(header, rows) {
    var out = [header.map(csvCell).join(',')];
    rows.forEach(function (row) { out.push(row.map(csvCell).join(',')); });
    return out.join('\n') + '\n';
  }

  /* ---------- retail dataset: a small café chain, 2025 ---------- */

  var cached = {};

  DA.gen.retail = function () {
    if (cached.retail) return cached.retail;
    var r = rng(42);
    var cities = ['London', 'Madrid', 'Berlin', 'Lisbon', 'Paris'];
    var stores = [[1, 'London', 2019], [2, 'Madrid', 2020], [3, 'Berlin', 2021], [4, 'Lisbon', 2022], [5, 'Paris', 2023]];
    var products = [
      [1, 'Espresso', 'Coffee', 2.5], [2, 'Americano', 'Coffee', 2.8], [3, 'Latte', 'Coffee', 4.2],
      [4, 'Cappuccino', 'Coffee', 4.0], [5, 'Flat White', 'Coffee', 4.3],
      [6, 'Green Tea', 'Tea', 2.9], [7, 'Chai Latte', 'Tea', 4.1], [8, 'Herbal Tea', 'Tea', 2.8],
      [9, 'Croissant', 'Bakery', 2.4], [10, 'Muffin', 'Bakery', 3.1], [11, 'Bagel', 'Bakery', 3.5],
      [12, 'Cookie', 'Bakery', 2.2], [13, 'Sandwich', 'Food', 7.5], [14, 'Salad', 'Food', 7.9],
    ];
    var popularity = [10, 9, 14, 12, 7, 4, 5, 2, 9, 6, 4, 5, 6, 3];
    var segments = ['student', 'professional', 'retired'];

    var customers = [];
    for (var c = 1; c <= 400; c++) {
      customers.push([
        c,
        addDays('2024-01-01', Math.floor(r() * 366)),
        cities[Math.floor(r() * cities.length)],
        segments[pickWeighted(r, [3, 6, 1])],
      ]);
    }
    // Customers whose id is a multiple of 4 never order: a realistic "signed up, never bought" group.
    var active = customers.filter(function (x) { return x[0] % 4 !== 0; });

    var monthWeight = [0.8, 0.8, 0.9, 1, 1.05, 1.1, 1.0, 0.9, 1.1, 1.15, 1.2, 1.3];
    var orders = [], items = [], oid = 0, itemId = 0;
    while (orders.length < 3200) {
      var day = Math.floor(r() * 365);
      var date = addDays('2025-01-01', day);
      if (r() * 1.3 > monthWeight[+date.slice(5, 7) - 1]) continue; // more orders in winter and December
      oid++;
      var cust = active[Math.floor(Math.pow(r(), 1.6) * active.length)];
      var store = stores[pickWeighted(r, [30, 25, 20, 15, 10])];
      var channel = ['in_store', 'pickup', 'delivery'][pickWeighted(r, [62, 23, 15])];
      orders.push([oid, cust[0], store[0], date, channel]);
      var n = 1 + Math.floor(r() * 3) + (r() < 0.2 ? 1 : 0);
      var used = {};
      for (var k = 0; k < n; k++) {
        var p = pickWeighted(r, popularity);
        if (used[p]) continue;
        used[p] = true;
        itemId++;
        items.push([itemId, oid, products[p][0], 1 + (r() < 0.25 ? 1 : 0) + (r() < 0.05 ? 1 : 0)]);
      }
    }
    cached.retail = { stores: stores, products: products, customers: customers, orders: orders, order_items: items };
    return cached.retail;
  };

  // One flat table (one row per item sold) for spreadsheet, Python and BI practice.
  DA.gen.retailCsv = function () {
    var d = DA.gen.retail();
    var store = {}, prod = {}, ord = {};
    d.stores.forEach(function (s) { store[s[0]] = s; });
    d.products.forEach(function (p) { prod[p[0]] = p; });
    d.orders.forEach(function (o) { ord[o[0]] = o; });
    var rows = d.order_items.map(function (it) {
      var o = ord[it[1]], p = prod[it[2]];
      return [o[0], o[3], store[o[2]][1], o[4], o[1], p[1], p[2], it[3], p[3].toFixed(2)];
    });
    return toCsv(['order_id', 'order_date', 'store_city', 'channel', 'customer_id', 'product', 'category', 'qty', 'unit_price'], rows);
  };

  /* ---------- lab dataset: a 12-week training study ---------- */

  DA.gen.lab = function () {
    if (cached.lab) return cached.lab;
    var r = rng(7);
    var noWeight = { 7: 1, 23: 1, 41: 1, 52: 1 }; // never had their weight recorded
    var badHr = [0, 250, 15, 188, 0, 0, 230, 12, 0];
    var participants = [], sessions = [], meas = [];
    var sid = 0, mid = 0, bad = 0;

    for (var i = 1; i <= 60; i++) {
      var group = i % 2 === 0 ? 'intervention' : 'control';
      participants.push([i, 18 + Math.floor(r() * 48), r() < 0.5 ? 'F' : 'M', group, r() < 0.5 ? 'North' : 'South']);
      var vo2 = 38 + normal(r) * 6, hr = 66 + normal(r) * 7, wt = 74 + normal(r) * 11;
      var slope = group === 'intervention' ? 0.35 + normal(r) * 0.08 : 0.04 + normal(r) * 0.06;
      var lastWeek = r() < 0.2 ? 4 + Math.floor(r() * 7) : 11; // about 20% drop out early
      for (var w = 0; w <= lastWeek; w++) {
        sid++;
        sessions.push([sid, i, addDays('2025-01-06', w * 7 + Math.floor(r() * 3)), w]);
        mid++;
        meas.push([mid, sid, 'vo2max', round(vo2 + slope * w + normal(r) * 1.2, 1)]);
        mid++;
        var hrVal = Math.round(hr - (group === 'intervention' ? 0.25 : 0.03) * w + normal(r) * 2.5);
        if (sid % 97 === 0) { hrVal = badHr[bad % badHr.length]; bad++; } // data-entry / sensor errors
        meas.push([mid, sid, 'resting_hr', hrVal]);
        if (!noWeight[i]) {
          mid++;
          meas.push([mid, sid, 'weight_kg', round(wt - (group === 'intervention' ? 0.08 : 0.01) * w + normal(r) * 0.6, 1)]);
        }
      }
    }
    cached.lab = { participants: participants, sessions: sessions, measurements: meas };
    return cached.lab;
  };

  /* ---------- messy CSV for the spreadsheet cleaning lesson ---------- */

  DA.gen.messyCsv = function () {
    var r = rng(2024);
    var dateFmt = [
      function (y, m, d) { return y + '-' + pad(m) + '-' + pad(d); },
      function (y, m, d) { return pad(d) + '/' + pad(m) + '/' + y; },
      function (y, m, d) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] + ' ' + d + ', ' + y; },
      function (y, m, d) { return y + '/' + m + '/' + d; },
    ];
    var customers = ['Ana López', 'Ben Carter', 'Chloé Martin', 'Dev Patel', 'Elena Rossi', 'Farid Haddad', 'Grace Kim', 'Hugo Silva'];
    var products = [['Latte', 4.2], ['Cappuccino', 4.0], ['Espresso', 2.5], ['Croissant', 2.4], ['Sandwich', 7.5]];
    var typos = { Latte: ['latte', 'Late', 'LATTE '], Cappuccino: ['capuccino', 'Cappucino'], Espresso: ['espresso', 'Expresso'], Croissant: ['croissant', 'Croisant'], Sandwich: ['sandwich', 'Sandwhich'] };
    var cities = [['Madrid', ['madrid ', 'MADRID', 'Madird']], ['London', ['london', ' London', 'Londn']], ['Berlin', ['berlin', 'BERLIN ']]];
    var words = { 1: 'one', 2: 'two', 3: 'three' };
    var rows = [];
    for (var i = 1; i <= 120; i++) {
      var m = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
      var date = dateFmt[Math.floor(r() * 4)](2025, m, d);
      var cust = customers[Math.floor(r() * customers.length)];
      if (r() < 0.25) cust = cust.toLowerCase();
      if (r() < 0.2) cust = cust + ' ';
      var pr = products[Math.floor(r() * products.length)], name = pr[0];
      if (r() < 0.25) name = typos[name][Math.floor(r() * typos[name].length)];
      var q = 1 + Math.floor(r() * 3), qty = q;
      var x = r();
      if (x < 0.08) qty = words[q]; else if (x < 0.12) qty = '';
      var price = pr[1].toFixed(2), y = r();
      if (y < 0.15) price = '$' + price; else if (y < 0.25) price = price.replace('.', ','); else if (y < 0.28) price = 'N/A';
      var city = cities[Math.floor(r() * cities.length)], cname = city[0];
      if (r() < 0.3) cname = city[1][Math.floor(r() * city[1].length)];
      rows.push([1000 + i, date, cust, name, qty, price, cname]);
    }
    [5, 40, 77, 101, 33, 66].forEach(function (idx) { rows.push(rows[idx].slice()); }); // duplicates
    rows.splice(30, 0, ['', '', '', '', '', '', '']); // an empty row
    rows.splice(90, 0, ['', '', '', '', '', '', '']);
    return toCsv(['Order ID', 'Date', 'Customer', 'Product', 'Qty', 'Price', 'City'], rows);
  };

  /* ---------- table definitions (single source of truth for DDL, UI and prompts) ---------- */

  DA.datasets = {
    retail: {
      id: 'retail',
      title: 'Café chain: sales 2025',
      short: 'Café sales',
      blurb: 'Five cafés, 14 products, 400 customers and 3,200 orders. Good for business, marketing, finance and operations questions.',
      tables: [
        { name: 'stores', note: 'one row per café', cols: [['store_id', 'INTEGER', 'primary key'], ['city', 'TEXT'], ['opened_year', 'INTEGER']] },
        { name: 'products', note: 'one row per product', cols: [['product_id', 'INTEGER', 'primary key'], ['name', 'TEXT'], ['category', 'TEXT', 'Coffee, Tea, Bakery, Food'], ['price', 'REAL']] },
        { name: 'customers', note: 'one row per registered customer', cols: [['customer_id', 'INTEGER', 'primary key'], ['signup_date', 'TEXT', 'YYYY-MM-DD'], ['city', 'TEXT'], ['segment', 'TEXT', 'student, professional, retired']] },
        { name: 'orders', note: 'one row per order', cols: [['order_id', 'INTEGER', 'primary key'], ['customer_id', 'INTEGER', '→ customers'], ['store_id', 'INTEGER', '→ stores'], ['order_date', 'TEXT', 'YYYY-MM-DD'], ['channel', 'TEXT', 'in_store, pickup, delivery']] },
        { name: 'order_items', note: 'one row per product in an order', cols: [['item_id', 'INTEGER', 'primary key'], ['order_id', 'INTEGER', '→ orders'], ['product_id', 'INTEGER', '→ products'], ['qty', 'INTEGER']] },
      ],
      data: function () { return DA.gen.retail(); },
    },
    lab: {
      id: 'lab',
      title: 'Training study: 12 weeks',
      short: 'Training study',
      blurb: 'A small trial: 60 participants, an intervention and a control group, weekly sessions with fitness measurements. Includes dropouts, missing data and sensor errors. Good for science, health, sport, education and engineering.',
      tables: [
        { name: 'participants', note: 'one row per participant', cols: [['participant_id', 'INTEGER', 'primary key'], ['age', 'INTEGER'], ['sex', 'TEXT', 'F or M'], ['group_name', 'TEXT', 'control or intervention'], ['site', 'TEXT', 'North or South']] },
        { name: 'sessions', note: 'one row per weekly session attended', cols: [['session_id', 'INTEGER', 'primary key'], ['participant_id', 'INTEGER', '→ participants'], ['session_date', 'TEXT', 'YYYY-MM-DD'], ['week', 'INTEGER', '0 to 11']] },
        { name: 'measurements', note: 'long format: one row per metric per session', cols: [['measurement_id', 'INTEGER', 'primary key'], ['session_id', 'INTEGER', '→ sessions'], ['metric', 'TEXT', 'vo2max, resting_hr, weight_kg'], ['value', 'REAL']] },
      ],
      data: function () { return DA.gen.lab(); },
    },
  };

  DA.ddl = function (ds) {
    return ds.tables.map(function (t) {
      return 'CREATE TABLE ' + t.name + ' (' + t.cols.map(function (c) {
        return c[0] + ' ' + c[1] + (c[2] === 'primary key' ? ' PRIMARY KEY' : '');
      }).join(', ') + ');';
    }).join('\n');
  };

  // Compact schema text for pasting into an AI prompt (structure only, never the data).
  DA.schemaText = function (dsId) {
    var ds = DA.datasets[dsId];
    return ds.tables.map(function (t) {
      return t.name + '(' + t.cols.map(function (c) { return c[0] + ' ' + c[1]; }).join(', ') + ')';
    }).join('\n');
  };

  // Builds an in-memory SQLite database. `SQL` is the sql.js module.
  DA.buildDb = function (SQL, dsId) {
    var ds = DA.datasets[dsId];
    var db = new SQL.Database();
    db.run(DA.ddl(ds));
    var data = ds.data();
    db.run('BEGIN');
    ds.tables.forEach(function (t) {
      var stmt = db.prepare('INSERT INTO ' + t.name + ' VALUES (' + t.cols.map(function () { return '?'; }).join(',') + ')');
      data[t.name].forEach(function (row) { stmt.run(row); });
      stmt.free();
    });
    db.run('COMMIT');
    return db;
  };

  /* ---------- SQL levels, worked examples & challenges ----------
   * The task text always names the output columns in order: the checker compares values, not names.
   * `decimals` is how many decimals numbers are compared to. */

  DA.sqlLevels = {
    1: 'Level 1: Foundations — SELECT, WHERE & ORDER BY',
    2: 'Level 2: Aggregations — COUNT, SUM, AVG & GROUP BY',
    3: 'Level 3: Multi-Table Joins & HAVING',
    4: 'Level 4: Dates, CASE WHEN & Conditional Metrics',
    5: 'Level 5: Subqueries, CTEs (WITH) & Anti-Joins',
    6: 'Level 6: Window Functions — Ranking & Running Totals',
    7: 'Level 7: Time-Series, LAG/LEAD & Repeat Behavior',
    8: 'Level 8: Staff Analyst & Executive Case Studies',
  };

  DA.sqlExamples = [
    // retail examples (Levels 1-8)
    { id: 'ex-r1', ds: 'retail', level: 1, title: 'Filter and sort rows', concept: 'SELECT, WHERE, ORDER BY, LIMIT',
      explain: 'Pick the columns you need, filter rows with WHERE, sort with ORDER BY (DESC for highest first), and cap the output with LIMIT.',
      sql: "SELECT name, category, price\nFROM products\nWHERE category = 'Coffee'\nORDER BY price DESC\nLIMIT 5;" },
    { id: 'ex-r2', ds: 'retail', level: 2, title: 'Group and summarise', concept: 'GROUP BY, COUNT, AVG, ROUND',
      explain: 'GROUP BY collapses rows with the same category into one summary row so you can count items and average prices.',
      sql: 'SELECT category,\n       COUNT(*) AS n_items,\n       ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY category\nORDER BY avg_price DESC;' },
    { id: 'ex-r3', ds: 'retail', level: 3, title: 'Join tables & filter groups', concept: 'JOIN, GROUP BY, HAVING',
      explain: 'JOIN connects orders to stores via store_id. WHERE filters individual rows before grouping; HAVING filters the aggregated groups afterwards.',
      sql: 'SELECT s.city, COUNT(*) AS total_orders\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nHAVING COUNT(*) >= 500\nORDER BY total_orders DESC;' },
    { id: 'ex-r4', ds: 'retail', level: 4, title: 'Conditional percentages with CASE', concept: 'CASE WHEN + strftime',
      explain: 'Inside SUM() or AVG(), CASE WHEN turns a condition into 1 or 0 so you can compute shares and conversion rates in a single pass.',
      sql: "SELECT s.city,\n       COUNT(*) AS orders,\n       ROUND(100.0 * SUM(CASE WHEN o.channel = 'pickup' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pickup_pct\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nORDER BY pickup_pct DESC;" },
    { id: 'ex-r5', ds: 'retail', level: 5, title: 'Readable pipelines with CTEs (WITH)', concept: 'WITH (CTE) + LEFT JOIN',
      explain: 'A Common Table Expression (WITH name AS (...)) gives a temporary name to a intermediate table so complex logic reads top-to-bottom.',
      sql: 'WITH customer_orders AS (\n  SELECT customer_id, COUNT(*) AS n_orders\n  FROM orders\n  GROUP BY customer_id\n)\nSELECT c.segment,\n       COUNT(*) AS registered,\n       COUNT(co.customer_id) AS active_buyers,\n       ROUND(AVG(COALESCE(co.n_orders, 0)), 2) AS avg_orders_per_person\nFROM customers c\nLEFT JOIN customer_orders co ON co.customer_id = c.customer_id\nGROUP BY c.segment\nORDER BY active_buyers DESC;' },
    { id: 'ex-r6', ds: 'retail', level: 6, title: 'Rank & share within each group', concept: 'RANK() & SUM() OVER (PARTITION BY)',
      explain: 'Window functions (OVER (...)) compute rankings or group totals without collapsing the rows.',
      sql: 'WITH prod_rev AS (\n  SELECT p.category, p.name,\n         ROUND(SUM(oi.qty * p.price), 2) AS revenue\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY p.category, p.name\n)\nSELECT category, name, revenue,\n       RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk_in_cat,\n       ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY category), 1) AS cat_share_pct\nFROM prod_rev\nORDER BY category, rnk_in_cat;' },
    { id: 'ex-r7', ds: 'retail', level: 7, title: 'Time-series & rolling comparisons', concept: 'LAG() OVER + moving average',
      explain: 'LAG() looks at the previous row in calendar order, while ROWS BETWEEN 2 PRECEDING AND CURRENT ROW computes a 3-month rolling average.',
      sql: "WITH m AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month,\n         SUM(oi.qty * p.price) AS rev\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY month\n)\nSELECT month,\n       ROUND(rev, 2) AS revenue,\n       ROUND(rev - LAG(rev) OVER (ORDER BY month), 2) AS mom_diff,\n       ROUND(AVG(rev) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS rolling_3m_avg\nFROM m\nORDER BY month;" },
    { id: 'ex-r8', ds: 'retail', level: 8, title: 'Customer RFM & pareto concentration', concept: 'Multi-CTE + NTILE / cumulative share',
      explain: 'Combine multiple CTEs with window functions to segment customers into spend tiers and measure how much revenue comes from the top decile.',
      sql: 'WITH spend AS (\n  SELECT o.customer_id,\n         COUNT(DISTINCT o.order_id) AS freq,\n         MAX(o.order_date) AS last_order,\n         SUM(oi.qty * p.price) AS monetary\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY o.customer_id\n), tiers AS (\n  SELECT customer_id, freq, last_order, monetary,\n         NTILE(5) OVER (ORDER BY monetary DESC) AS spend_quintile\n  FROM spend\n)\nSELECT spend_quintile,\n       COUNT(*) AS customers,\n       ROUND(AVG(freq), 1) AS avg_orders,\n       ROUND(SUM(monetary), 2) AS tier_revenue,\n       ROUND(100.0 * SUM(monetary) / SUM(SUM(monetary)) OVER (), 1) AS rev_share_pct\nFROM tiers\nGROUP BY spend_quintile\nORDER BY spend_quintile;' },

    // lab examples (Levels 1-8)
    { id: 'ex-s1', ds: 'lab', level: 1, title: 'Filter participants by criteria', concept: 'SELECT, WHERE, AND, ORDER BY',
      explain: 'Combine conditions with AND and sort deterministically by adding participant_id as a tie-breaker.',
      sql: "SELECT participant_id, age, sex, site\nFROM participants\nWHERE group_name = 'control' AND age BETWEEN 25 AND 45\nORDER BY age ASC, participant_id ASC\nLIMIT 10;" },
    { id: 'ex-s2', ds: 'lab', level: 2, title: 'Demographic summary by arm', concept: 'GROUP BY, COUNT, AVG, MIN, MAX',
      explain: 'Check balance between experimental groups before analysing outcomes.',
      sql: 'SELECT group_name, sex,\n       COUNT(*) AS n,\n       ROUND(AVG(age), 1) AS mean_age,\n       MIN(age) AS youngest,\n       MAX(age) AS oldest\nFROM participants\nGROUP BY group_name, sex\nORDER BY group_name, sex;' },
    { id: 'ex-s3', ds: 'lab', level: 3, title: 'Join sessions & measurements', concept: '3-table JOIN + WHERE',
      explain: 'Connect participants → sessions → measurements to inspect weekly physiological metrics by study arm.',
      sql: "SELECT p.group_name, s.week,\n       COUNT(*) AS n_obs,\n       ROUND(AVG(m.value), 2) AS mean_vo2max\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE m.metric = 'vo2max' AND s.week IN (0, 6, 11)\nGROUP BY p.group_name, s.week\nORDER BY p.group_name, s.week;" },
    { id: 'ex-s4', ds: 'lab', level: 4, title: 'Pivot long metrics into wide columns', concept: 'CASE WHEN pivot',
      explain: 'Clinical data is often stored in long format (metric, value). Use MAX(CASE WHEN ...) grouped by session to put metrics side by side.',
      sql: "SELECT s.participant_id, s.week,\n       MAX(CASE WHEN m.metric = 'vo2max' THEN m.value END) AS vo2max,\n       MAX(CASE WHEN m.metric = 'resting_hr' THEN m.value END) AS resting_hr,\n       MAX(CASE WHEN m.metric = 'weight_kg' THEN m.value END) AS weight_kg\nFROM sessions s\nJOIN measurements m ON m.session_id = s.session_id\nWHERE s.week = 0\nGROUP BY s.participant_id, s.week\nORDER BY s.participant_id\nLIMIT 10;" },
    { id: 'ex-s5', ds: 'lab', level: 5, title: 'Data quality & missingness audit', concept: 'CTE + LEFT JOIN + anti-join',
      explain: 'Find participants with missing metrics or sensor outliers before computing trial results.',
      sql: "WITH wt_counts AS (\n  SELECT s.participant_id, COUNT(m.measurement_id) AS wt_rows\n  FROM sessions s\n  LEFT JOIN measurements m ON m.session_id = s.session_id AND m.metric = 'weight_kg'\n  GROUP BY s.participant_id\n)\nSELECT p.participant_id, p.group_name, p.site, w.wt_rows\nFROM participants p\nJOIN wt_counts w ON w.participant_id = p.participant_id\nWHERE w.wt_rows = 0\nORDER BY p.participant_id;" },
    { id: 'ex-s6', ds: 'lab', level: 6, title: 'Baseline z-score & group ranking', concept: 'AVG() & RANK() OVER (PARTITION BY)',
      explain: 'Compare each participant against their own site and study group using partitioned window functions.',
      sql: "WITH w0 AS (\n  SELECT p.participant_id, p.group_name, p.site, m.value AS vo2max\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  JOIN participants p ON p.participant_id = s.participant_id\n  WHERE s.week = 0 AND m.metric = 'vo2max'\n)\nSELECT participant_id, group_name, site, vo2max,\n       ROUND(AVG(vo2max) OVER (PARTITION BY group_name), 1) AS group_mean,\n       ROUND(vo2max - AVG(vo2max) OVER (PARTITION BY group_name), 1) AS diff_from_mean,\n       RANK() OVER (PARTITION BY group_name ORDER BY vo2max DESC) AS group_rank\nFROM w0\nORDER BY group_name, group_rank\nLIMIT 12;" },
    { id: 'ex-s7', ds: 'lab', level: 7, title: 'Session-to-session delta with LAG', concept: 'LAG() OVER (PARTITION BY ... ORDER BY)',
      explain: 'Track each participant\'s week-to-week progression and spot sharp single-week jumps.',
      sql: "WITH series AS (\n  SELECT s.participant_id, s.week, m.value AS vo2,\n         LAG(m.value) OVER (PARTITION BY s.participant_id ORDER BY s.week) AS prev_vo2\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max'\n)\nSELECT participant_id, week, vo2, prev_vo2,\n       ROUND(vo2 - prev_vo2, 1) AS weekly_change\nFROM series\nWHERE prev_vo2 IS NOT NULL\nORDER BY weekly_change DESC\nLIMIT 10;" },
    { id: 'ex-s8', ds: 'lab', level: 8, title: 'Intent-to-treat vs per-protocol efficacy', concept: 'Multi-CTE longitudinal analysis',
      explain: 'Compare last-observation-carried-forward (all enrolled participants) with completers-only (week 11) across arms.',
      sql: "WITH ranked AS (\n  SELECT s.participant_id, s.week, m.value,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week ASC) AS r_first,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week DESC) AS r_last,\n         MAX(s.week) OVER (PARTITION BY s.participant_id) AS max_w\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max'\n), per_p AS (\n  SELECT participant_id, max_w,\n         MAX(CASE WHEN r_last = 1 THEN value END) - MAX(CASE WHEN r_first = 1 THEN value END) AS delta\n  FROM ranked\n  GROUP BY participant_id, max_w\n)\nSELECT p.group_name,\n       COUNT(*) AS n_itt,\n       ROUND(AVG(c.delta), 2) AS itt_mean_gain,\n       SUM(CASE WHEN c.max_w = 11 THEN 1 ELSE 0 END) AS n_completers,\n       ROUND(AVG(CASE WHEN c.max_w = 11 THEN c.delta END), 2) AS completer_mean_gain\nFROM per_p c\nJOIN participants p ON p.participant_id = c.participant_id\nGROUP BY p.group_name\nORDER BY p.group_name;" },
  ];

  DA.challenges = [
    // ==================== RETAIL (Levels 1 to 8) ====================
    // Level 1: Foundations — SELECT, WHERE & ORDER BY
    { id: 'r1', ds: 'retail', level: 1, title: 'Pricey products', concept: 'SELECT, WHERE, ORDER BY',
      task: 'List the products that cost more than 4.00. Return <code>name</code>, <code>category</code>, <code>price</code>, most expensive first (ties by name).',
      hint: 'SELECT the three columns FROM products, filter with WHERE price > 4, then ORDER BY price DESC, name.',
      solution: 'SELECT name, category, price\nFROM products\nWHERE price > 4\nORDER BY price DESC, name;' },
    { id: 'r2', ds: 'retail', level: 1, title: 'Delivery orders', concept: 'COUNT + WHERE',
      task: 'How many orders were placed with the <code>delivery</code> channel? Return one number.',
      hint: 'COUNT(*) FROM orders with a WHERE on channel. Text values go in single quotes.',
      solution: "SELECT COUNT(*) AS delivery_orders\nFROM orders\nWHERE channel = 'delivery';" },
    { id: 'r13', ds: 'retail', level: 1, title: 'December orders', concept: 'WHERE + date range',
      task: 'How many orders were placed in December 2025? Return a single number.',
      hint: "Filter WHERE order_date >= '2025-12-01' (or strftime('%m', order_date) = '12').",
      solution: "SELECT COUNT(*) AS dec_orders\nFROM orders\nWHERE order_date >= '2025-12-01';" },
    { id: 'r23', ds: 'retail', level: 1, title: 'Bakery & Tea menu', concept: 'WHERE IN + ORDER BY',
      task: 'List all products in the <code>Bakery</code> or <code>Tea</code> categories. Return <code>name</code>, <code>category</code> and <code>price</code>, ordered by price ascending, then name.',
      hint: "Use WHERE category IN ('Bakery', 'Tea') and ORDER BY price ASC, name ASC.",
      solution: "SELECT name, category, price\nFROM products\nWHERE category IN ('Bakery', 'Tea')\nORDER BY price ASC, name ASC;" },
    { id: 'r24', ds: 'retail', level: 1, title: 'Newest cafés', concept: 'WHERE + ORDER BY',
      task: 'List the stores opened in or after <code>2021</code>. Return <code>store_id</code>, <code>city</code> and <code>opened_year</code>, newest first (ties by store_id).',
      hint: 'Filter stores with WHERE opened_year >= 2021 and ORDER BY opened_year DESC, store_id.',
      solution: 'SELECT store_id, city, opened_year\nFROM stores\nWHERE opened_year >= 2021\nORDER BY opened_year DESC, store_id;' },

    // Level 2: Aggregations — COUNT, SUM, AVG & GROUP BY
    { id: 'r3', ds: 'retail', level: 2, title: 'Orders per channel', concept: 'GROUP BY + COUNT',
      task: 'Count the orders in each channel. Return <code>channel</code> and the count, busiest channel first.',
      hint: 'Every non-aggregated column in SELECT must appear in GROUP BY. Sort by the count, descending.',
      solution: 'SELECT channel, COUNT(*) AS n_orders\nFROM orders\nGROUP BY channel\nORDER BY n_orders DESC;' },
    { id: 'r11', ds: 'retail', level: 2, title: 'Customer segments by city', concept: 'GROUP BY two columns',
      task: 'Count registered customers for every <code>city</code> and <code>segment</code> combination. Return <code>city</code>, <code>segment</code> and the count, ordered by city then segment.',
      hint: 'SELECT city, segment, COUNT(*) FROM customers, then GROUP BY city, segment and ORDER BY city, segment.',
      solution: 'SELECT city, segment, COUNT(*) AS n_customers\nFROM customers\nGROUP BY city, segment\nORDER BY city, segment;' },
    { id: 'r12', ds: 'retail', level: 2, title: 'Menu price summary', concept: 'MIN, AVG, MAX',
      task: 'For each product <code>category</code>, return <code>category</code>, <code>min_price</code>, <code>avg_price</code> (rounded to 2 decimals) and <code>max_price</code>, ordered by category.',
      hint: 'Use MIN(price), ROUND(AVG(price), 2) and MAX(price) grouped by category.',
      solution: 'SELECT category, MIN(price) AS min_price, ROUND(AVG(price), 2) AS avg_price, MAX(price) AS max_price\nFROM products\nGROUP BY category\nORDER BY category;' },
    { id: 'r25', ds: 'retail', level: 2, title: 'Total units sold per product ID', concept: 'SUM + GROUP BY + LIMIT',
      task: 'From <code>order_items</code> alone, find the top 5 products by total units sold (<code>SUM(qty)</code>). Return <code>product_id</code> and <code>total_qty</code>, highest first.',
      hint: 'SELECT product_id, SUM(qty) AS total_qty FROM order_items GROUP BY product_id ORDER BY total_qty DESC LIMIT 5.',
      solution: 'SELECT product_id, SUM(qty) AS total_qty\nFROM order_items\nGROUP BY product_id\nORDER BY total_qty DESC, product_id\nLIMIT 5;' },

    // Level 3: Multi-Table Joins & HAVING
    { id: 'r4', ds: 'retail', level: 3, title: 'Revenue by category', concept: 'JOIN + SUM',
      task: 'Revenue per product category, where revenue = qty × price, rounded to 2 decimals. Return <code>category</code> and <code>revenue</code>, highest first.',
      hint: 'order_items has qty but not price, products has price but not qty: JOIN them on product_id, then SUM(qty * price) per category.',
      solution: 'SELECT p.category, ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY p.category\nORDER BY revenue DESC;' },
    { id: 'r5', ds: 'retail', level: 3, title: 'Busy stores', concept: 'JOIN + HAVING',
      task: 'Which stores handled more than 700 orders? Return the store <code>city</code> and the number of orders, most orders first.',
      hint: 'WHERE filters rows before grouping; HAVING filters groups after. You need HAVING COUNT(*) > 700.',
      solution: 'SELECT s.city, COUNT(*) AS n_orders\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nHAVING COUNT(*) > 700\nORDER BY n_orders DESC;' },
    { id: 'r7', ds: 'retail', level: 3, title: 'Top 5 customers', concept: '3-table JOIN + LIMIT',
      task: 'The 5 customers with the highest total spend. Return <code>customer_id</code> and <code>total_spent</code> (rounded to 2 decimals), biggest first.',
      hint: 'Join orders → order_items → products, group by customer, sort descending and LIMIT 5.',
      solution: 'SELECT o.customer_id, ROUND(SUM(oi.qty * p.price), 2) AS total_spent\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY o.customer_id\nORDER BY total_spent DESC, o.customer_id\nLIMIT 5;' },
    { id: 'r15', ds: 'retail', level: 3, title: 'Revenue by customer segment', concept: '4-table JOIN + GROUP BY',
      task: 'Total revenue generated by each customer <code>segment</code>, rounded to 2 decimals. Return <code>segment</code> and <code>revenue</code>, highest first.',
      hint: 'Join customers → orders → order_items → products, then group by c.segment.',
      solution: 'SELECT c.segment, ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.customer_id\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY c.segment\nORDER BY revenue DESC;' },
    { id: 'r26', ds: 'retail', level: 3, title: 'Revenue per store city', concept: '3-table JOIN + GROUP BY',
      task: 'Compute total revenue for each store <code>city</code>, rounded to 2 decimals. Return <code>city</code> and <code>revenue</code>, highest revenue first.',
      hint: 'Join stores → orders → order_items → products, group by s.city, and sum oi.qty * p.price.',
      solution: 'SELECT s.city, ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM stores s\nJOIN orders o ON o.store_id = s.store_id\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY s.city\nORDER BY revenue DESC;' },

    // Level 4: Dates, CASE WHEN & Conditional Metrics
    { id: 'r6', ds: 'retail', level: 4, title: 'Monthly revenue', concept: 'strftime + 3-table JOIN',
      task: 'Revenue per month, rounded to 2 decimals, in calendar order. Return <code>month</code> as text like <code>2025-03</code>, and <code>revenue</code>.',
      hint: "SQLite has strftime('%Y-%m', order_date) to cut a date down to year-month. Join orders, order_items and products.",
      solution: "SELECT strftime('%Y-%m', o.order_date) AS month,\n       ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY month\nORDER BY month;" },
    { id: 'r16', ds: 'retail', level: 4, title: 'Delivery share by store', concept: 'CASE WHEN + percentage',
      task: 'For each store <code>city</code>, compute the percentage of orders placed via <code>delivery</code>, rounded to 1 decimal. Return <code>city</code> and <code>delivery_pct</code>, highest percentage first.',
      decimals: 1,
      hint: "Join stores and orders. Use ROUND(100.0 * SUM(CASE WHEN o.channel = 'delivery' THEN 1 ELSE 0 END) / COUNT(*), 1).",
      solution: "SELECT s.city,\n       ROUND(100.0 * SUM(CASE WHEN o.channel = 'delivery' THEN 1 ELSE 0 END) / COUNT(*), 1) AS delivery_pct\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nORDER BY delivery_pct DESC;" },
    { id: 'r17', ds: 'retail', level: 4, title: 'Weekend vs weekday orders', concept: 'strftime + CASE WHEN',
      task: "Split all orders into <code>weekend</code> (Sunday='0' or Saturday='6') and <code>weekday</code>. Return <code>day_type</code> and the order count, largest first.",
      hint: "strftime('%w', order_date) returns '0' for Sunday and '6' for Saturday. Use CASE WHEN ... IN ('0','6') THEN 'weekend' ELSE 'weekday' END.",
      solution: "SELECT CASE WHEN strftime('%w', order_date) IN ('0', '6') THEN 'weekend' ELSE 'weekday' END AS day_type,\n       COUNT(*) AS n_orders\nFROM orders\nGROUP BY day_type\nORDER BY n_orders DESC;" },
    { id: 'r27', ds: 'retail', level: 4, title: 'Quarterly revenue pivot by channel', concept: 'CASE WHEN pivot',
      task: 'For each store <code>city</code>, return <code>city</code>, <code>in_store_orders</code>, <code>pickup_orders</code> and <code>delivery_orders</code> side by side as separate columns, ordered by city.',
      hint: "Use SUM(CASE WHEN o.channel = 'in_store' THEN 1 ELSE 0 END) and likewise for pickup and delivery, grouped by s.city.",
      solution: "SELECT s.city,\n       SUM(CASE WHEN o.channel = 'in_store' THEN 1 ELSE 0 END) AS in_store_orders,\n       SUM(CASE WHEN o.channel = 'pickup' THEN 1 ELSE 0 END) AS pickup_orders,\n       SUM(CASE WHEN o.channel = 'delivery' THEN 1 ELSE 0 END) AS delivery_orders\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nORDER BY s.city;" },

    // Level 5: Subqueries, CTEs (WITH) & Anti-Joins
    { id: 'r8', ds: 'retail', level: 5, title: 'Customers who never ordered', concept: 'LEFT JOIN anti-join',
      task: 'How many customers have never placed an order? Return one number.',
      hint: 'LEFT JOIN customers to orders keeps customers with no match; those rows have NULL in orders.order_id.',
      solution: 'SELECT COUNT(*) AS never_ordered\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;' },
    { id: 'r14', ds: 'retail', level: 5, title: 'Average basket value', concept: 'CTE + AVG',
      task: 'Calculate the average order value (total revenue of an order, averaged across all orders), rounded to 2 decimals. Return one number.',
      hint: 'First compute each order\'s total (SUM(qty * price) grouped by order_id) in a CTE, then take ROUND(AVG(order_total), 2).',
      solution: 'WITH baskets AS (\n  SELECT oi.order_id, SUM(oi.qty * p.price) AS order_total\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY oi.order_id\n)\nSELECT ROUND(AVG(order_total), 2) AS avg_basket\nFROM baskets;' },
    { id: 'r18', ds: 'retail', level: 5, title: 'Multi-item orders', concept: 'GROUP BY + HAVING + CTE',
      task: 'How many orders contain 3 or more distinct products? Return one number.',
      hint: 'In a CTE, find order_ids in order_items with HAVING COUNT(*) >= 3, then count those orders.',
      solution: 'WITH big AS (\n  SELECT order_id\n  FROM order_items\n  GROUP BY order_id\n  HAVING COUNT(*) >= 3\n)\nSELECT COUNT(*) AS n_orders FROM big;' },
    { id: 'r28', ds: 'retail', level: 5, title: 'Inactive rate by customer segment', concept: 'LEFT JOIN + conditional aggregation',
      task: 'For each customer <code>segment</code>, calculate the percentage of registered customers who have never placed an order, rounded to 1 decimal. Return <code>segment</code> and <code>inactive_pct</code>, ordered by segment.',
      decimals: 1,
      hint: 'Find distinct customer_ids in orders (or LEFT JOIN), then compute ROUND(100.0 * SUM(CASE WHEN o.customer_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) per segment.',
      solution: 'WITH buyers AS (\n  SELECT DISTINCT customer_id FROM orders\n)\nSELECT c.segment,\n       ROUND(100.0 * SUM(CASE WHEN b.customer_id IS NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS inactive_pct\nFROM customers c\nLEFT JOIN buyers b ON b.customer_id = c.customer_id\nGROUP BY c.segment\nORDER BY c.segment;' },
    { id: 'r29', ds: 'retail', level: 5, title: 'Orders above double the average basket', concept: 'CTE + scalar subquery',
      task: 'How many orders have a total value strictly greater than twice the overall average order value? Return one number.',
      hint: 'In a CTE `baskets`, compute each order_total. Then filter WHERE order_total > 2 * (SELECT AVG(order_total) FROM baskets).',
      solution: 'WITH baskets AS (\n  SELECT oi.order_id, SUM(oi.qty * p.price) AS order_total\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY oi.order_id\n)\nSELECT COUNT(*) AS big_baskets\nFROM baskets\nWHERE order_total > 2 * (SELECT AVG(order_total) FROM baskets);' },

    // Level 6: Window Functions — Ranking & Running Totals
    { id: 'r9', ds: 'retail', level: 6, title: 'Running total of revenue', concept: 'CTE + SUM() OVER (ORDER BY)',
      task: 'Extend the monthly revenue with a running total. Return <code>month</code>, <code>revenue</code> and <code>cumulative_revenue</code> (both rounded to 2 decimals), in calendar order.',
      hint: 'Put the monthly query in a WITH (CTE), then SUM(revenue) OVER (ORDER BY month) gives the running total.',
      solution: "WITH monthly AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month,\n         SUM(oi.qty * p.price) AS revenue\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY month\n)\nSELECT month,\n       ROUND(revenue, 2) AS revenue,\n       ROUND(SUM(revenue) OVER (ORDER BY month), 2) AS cumulative_revenue\nFROM monthly\nORDER BY month;" },
    { id: 'r10', ds: 'retail', level: 6, title: 'Best seller per category', concept: 'RANK() OVER (PARTITION BY)',
      task: 'For each category, find the product with the most units sold (sum of qty). Return <code>category</code>, <code>name</code>, <code>units</code>, ordered by category.',
      hint: 'Compute units per product in a CTE, add RANK() OVER (PARTITION BY category ORDER BY units DESC), keep rank 1.',
      solution: 'WITH units AS (\n  SELECT p.category, p.name, SUM(oi.qty) AS units\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY p.category, p.name\n), ranked AS (\n  SELECT category, name, units,\n         RANK() OVER (PARTITION BY category ORDER BY units DESC) AS rnk\n  FROM units\n)\nSELECT category, name, units\nFROM ranked\nWHERE rnk = 1\nORDER BY category;' },
    { id: 'r20', ds: 'retail', level: 6, title: 'Category share of total revenue', concept: 'SUM() OVER ()',
      task: 'For each product <code>category</code>, return <code>category</code>, <code>revenue</code> (rounded to 2 decimals) and <code>pct_of_total</code> (its percentage of overall revenue, rounded to 1 decimal), highest share first.',
      decimals: 1,
      hint: 'Compute revenue per category in a CTE, then divide 100.0 * rev by SUM(rev) OVER ().',
      solution: 'WITH cat AS (\n  SELECT p.category, SUM(oi.qty * p.price) AS rev\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY p.category\n)\nSELECT category,\n       ROUND(rev, 2) AS revenue,\n       ROUND(100.0 * rev / SUM(rev) OVER (), 1) AS pct_of_total\nFROM cat\nORDER BY pct_of_total DESC;' },
    { id: 'r30', ds: 'retail', level: 6, title: 'Top 2 customers per city', concept: 'ROW_NUMBER() OVER (PARTITION BY)',
      task: 'For each customer <code>city</code>, find the top 2 customers by total spend. Return <code>city</code>, <code>customer_id</code> and <code>total_spent</code> (rounded to 2 decimals), ordered by city, then total_spent descending.',
      hint: 'Compute spend per customer in a CTE (joining customers, orders, order_items, products), rank within each c.city with ROW_NUMBER() OVER (PARTITION BY city ORDER BY spend DESC, customer_id), and filter rnk <= 2.',
      solution: 'WITH spend AS (\n  SELECT c.city, c.customer_id, SUM(oi.qty * p.price) AS total_spent,\n         ROW_NUMBER() OVER (PARTITION BY c.city ORDER BY SUM(oi.qty * p.price) DESC, c.customer_id) AS rnk\n  FROM customers c\n  JOIN orders o ON o.customer_id = c.customer_id\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY c.city, c.customer_id\n)\nSELECT city, customer_id, ROUND(total_spent, 2) AS total_spent\nFROM spend\nWHERE rnk <= 2\nORDER BY city, total_spent DESC, customer_id;' },

    // Level 7: Time-Series, LAG/LEAD & Repeat Behavior
    { id: 'r19', ds: 'retail', level: 7, title: 'Month-over-month revenue growth', concept: 'CTE + LAG window function',
      task: 'For each month, return <code>month</code>, <code>revenue</code> (rounded to 2 decimals) and <code>mom_change</code> (revenue minus previous month\'s revenue, rounded to 2 decimals), in calendar order.',
      hint: 'Compute monthly revenue in a CTE, then use ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2).',
      solution: "WITH m AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month,\n         SUM(oi.qty * p.price) AS revenue\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY month\n)\nSELECT month,\n       ROUND(revenue, 2) AS revenue,\n       ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS mom_change\nFROM m\nORDER BY month;" },
    { id: 'r21', ds: 'retail', level: 7, title: 'Frequently bought together', concept: 'self-join on order_items',
      task: 'Find the top 5 pairs of products bought together in the same order. Return <code>first_product</code>, <code>second_product</code> (product names, with first_product.product_id &lt; second_product.product_id) and <code>orders_together</code>, highest count first (ties by first_product, second_product).',
      hint: 'Join order_items a to order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id, then join products twice for the names.',
      solution: 'SELECT p1.name AS first_product, p2.name AS second_product, COUNT(*) AS orders_together\nFROM order_items a\nJOIN order_items b ON b.order_id = a.order_id AND a.product_id < b.product_id\nJOIN products p1 ON p1.product_id = a.product_id\nJOIN products p2 ON p2.product_id = b.product_id\nGROUP BY p1.name, p2.name\nORDER BY orders_together DESC, first_product, second_product\nLIMIT 5;' },
    { id: 'r22', ds: 'retail', level: 7, title: 'Repeat buyers within 7 days', concept: 'LAG + julianday',
      task: 'How many distinct customers placed an order within 7 days of their own previous order? Return one number.',
      hint: 'Use LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) in a CTE, then filter julianday(order_date) - julianday(prev_date) <= 7 and count DISTINCT customer_id.',
      solution: 'WITH seq AS (\n  SELECT customer_id, order_date,\n         LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS prev_date\n  FROM orders\n)\nSELECT COUNT(DISTINCT customer_id) AS quick_repeaters\nFROM seq\nWHERE prev_date IS NOT NULL AND julianday(order_date) - julianday(prev_date) <= 7;' },
    { id: 'r31', ds: 'retail', level: 7, title: '3-month rolling average revenue', concept: 'AVG() OVER (ROWS BETWEEN)',
      task: 'For each month of 2025, return <code>month</code>, <code>revenue</code> (rounded to 2 decimals) and <code>rolling_3m</code> (average of the current month and up to 2 preceding months, rounded to 2 decimals), in calendar order.',
      hint: 'In a monthly revenue CTE, use ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2).',
      solution: "WITH m AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month,\n         SUM(oi.qty * p.price) AS revenue\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY month\n)\nSELECT month,\n       ROUND(revenue, 2) AS revenue,\n       ROUND(AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS rolling_3m\nFROM m\nORDER BY month;" },
    { id: 'r32', ds: 'retail', level: 7, title: 'Time to first order after signup', concept: 'MIN(order_date) + julianday',
      task: 'For each customer <code>segment</code>, compute the average number of days between <code>signup_date</code> and the customer\'s very first <code>order_date</code> (among active buyers), rounded to 1 decimal. Return <code>segment</code> and <code>avg_days_to_first</code>, ordered by segment.',
      decimals: 1,
      hint: 'Find MIN(order_date) per customer_id in a CTE, join to customers, and average julianday(first_order) - julianday(signup_date) grouped by segment.',
      solution: 'WITH first_ord AS (\n  SELECT customer_id, MIN(order_date) AS first_date\n  FROM orders\n  GROUP BY customer_id\n)\nSELECT c.segment,\n       ROUND(AVG(julianday(f.first_date) - julianday(c.signup_date)), 1) AS avg_days_to_first\nFROM customers c\nJOIN first_ord f ON f.customer_id = c.customer_id\nGROUP BY c.segment\nORDER BY c.segment;' },

    // Level 8: Staff Analyst & Executive Case Studies
    { id: 'r33', ds: 'retail', level: 8, title: 'Revenue quintiles (Pareto analysis)', concept: 'NTILE(5) + window share',
      task: 'Split active customers into 5 equal tiers (<code>quintile</code> 1 to 5, where 1 is highest spend) using <code>NTILE(5) OVER (ORDER BY spend DESC, customer_id)</code>. Return <code>quintile</code>, <code>customers</code> (count), <code>tier_revenue</code> (rounded to 2 decimals) and <code>share_pct</code> (percentage of total revenue, rounded to 1 decimal), ordered by quintile.',
      decimals: 1,
      hint: 'Compute spend per customer in CTE 1, assign NTILE(5) OVER (ORDER BY spend DESC, customer_id) in CTE 2, then group by quintile and divide tier_revenue by SUM(SUM(spend)) OVER ().',
      solution: 'WITH spend AS (\n  SELECT o.customer_id, SUM(oi.qty * p.price) AS total_spent\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY o.customer_id\n), q AS (\n  SELECT customer_id, total_spent,\n         NTILE(5) OVER (ORDER BY total_spent DESC, customer_id) AS quintile\n  FROM spend\n)\nSELECT quintile,\n       COUNT(*) AS customers,\n       ROUND(SUM(total_spent), 2) AS tier_revenue,\n       ROUND(100.0 * SUM(total_spent) / SUM(SUM(total_spent)) OVER (), 1) AS share_pct\nFROM q\nGROUP BY quintile\nORDER BY quintile;' },
    { id: 'r34', ds: 'retail', level: 8, title: 'Home-city vs travelling orders', concept: 'Multi-join + conditional revenue share',
      task: 'Compare orders placed in the customer\'s own <code>city</code> vs another city. For each store <code>city</code>, return <code>city</code>, <code>total_orders</code> and <code>local_pct</code> (percentage of orders where store city equals customer city, rounded to 1 decimal), ordered by local_pct descending.',
      decimals: 1,
      hint: 'Join orders to stores AND customers. Compare s.city = c.city inside CASE WHEN.',
      solution: 'SELECT s.city,\n       COUNT(*) AS total_orders,\n       ROUND(100.0 * SUM(CASE WHEN s.city = c.city THEN 1 ELSE 0 END) / COUNT(*), 1) AS local_pct\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nJOIN customers c ON c.customer_id = o.customer_id\nGROUP BY s.city\nORDER BY local_pct DESC;' },
    { id: 'r35', ds: 'retail', level: 8, title: 'Category breadth per customer', concept: 'COUNT(DISTINCT) + cohort aggregation',
      task: 'How many distinct product categories has each active customer bought from (1, 2, 3 or 4)? Return <code>categories_bought</code>, <code>n_customers</code> and <code>avg_spend</code> (average total spend of those customers, rounded to 2 decimals), ordered by categories_bought.',
      hint: 'In a CTE per customer_id, compute COUNT(DISTINCT p.category) AS categories_bought and SUM(oi.qty * p.price) AS spend. Then group by categories_bought.',
      solution: 'WITH cust_cat AS (\n  SELECT o.customer_id,\n         COUNT(DISTINCT p.category) AS categories_bought,\n         SUM(oi.qty * p.price) AS spend\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY o.customer_id\n)\nSELECT categories_bought,\n       COUNT(*) AS n_customers,\n       ROUND(AVG(spend), 2) AS avg_spend\nFROM cust_cat\nGROUP BY categories_bought\nORDER BY categories_bought;' },
    { id: 'r36', ds: 'retail', level: 8, title: 'First-order vs repeat-order basket size', concept: 'ROW_NUMBER() + conditional basket comparison',
      task: 'Number each customer\'s orders chronologically using <code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date, order_id)</code>. Compare <code>first_order</code> (rnk = 1) vs <code>repeat_order</code> (rnk &gt; 1): return <code>order_type</code>, <code>n_orders</code> and <code>avg_basket</code> (rounded to 2 decimals), ordered by order_type.',
      hint: 'Compute basket total per order_id first, join to orders with ROW_NUMBER() per customer, then group by CASE WHEN rnk = 1 THEN \'first_order\' ELSE \'repeat_order\' END.',
      solution: "WITH baskets AS (\n  SELECT o.order_id, o.customer_id, o.order_date,\n         SUM(oi.qty * p.price) AS basket,\n         ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.order_date, o.order_id) AS rnk\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY o.order_id, o.customer_id, o.order_date\n)\nSELECT CASE WHEN rnk = 1 THEN 'first_order' ELSE 'repeat_order' END AS order_type,\n       COUNT(*) AS n_orders,\n       ROUND(AVG(basket), 2) AS avg_basket\nFROM baskets\nGROUP BY order_type\nORDER BY order_type;" },

    // ==================== LAB (Levels 1 to 8) ====================
    // Level 1: Foundations — SELECT, WHERE & ORDER BY
    { id: 's1', ds: 'lab', level: 1, title: 'Older intervention participants', concept: 'SELECT, WHERE, ORDER BY',
      task: 'Participants in the <code>intervention</code> group who are older than 40. Return <code>participant_id</code>, <code>age</code>, <code>site</code>, youngest first (ties by participant_id).',
      hint: 'Two conditions joined with AND. Then ORDER BY age, participant_id.',
      solution: "SELECT participant_id, age, site\nFROM participants\nWHERE group_name = 'intervention' AND age > 40\nORDER BY age, participant_id;" },
    { id: 's17', ds: 'lab', level: 1, title: 'Young female participants at North site', concept: 'WHERE + multiple AND conditions',
      task: 'List participants at the <code>North</code> site with <code>sex = \'F\'</code> and <code>age &lt; 35</code>. Return <code>participant_id</code>, <code>age</code> and <code>group_name</code>, ordered by age ascending, then participant_id.',
      hint: "Filter WHERE site = 'North' AND sex = 'F' AND age < 35, then ORDER BY age, participant_id.",
      solution: "SELECT participant_id, age, group_name\nFROM participants\nWHERE site = 'North' AND sex = 'F' AND age < 35\nORDER BY age, participant_id;" },
    { id: 's18', ds: 'lab', level: 1, title: 'Final-week sessions', concept: 'WHERE + ORDER BY',
      task: 'List all sessions from <code>week = 11</code>. Return <code>session_id</code>, <code>participant_id</code> and <code>session_date</code>, ordered by participant_id.',
      hint: 'SELECT session_id, participant_id, session_date FROM sessions WHERE week = 11 ORDER BY participant_id.',
      solution: 'SELECT session_id, participant_id, session_date\nFROM sessions\nWHERE week = 11\nORDER BY participant_id;' },

    // Level 2: Aggregations — COUNT, SUM, AVG & GROUP BY
    { id: 's2', ds: 'lab', level: 2, title: 'Possible dropouts', concept: 'GROUP BY + HAVING',
      task: 'Every participant should attend 12 sessions (weeks 0 to 11). Return <code>participant_id</code> and the number of sessions attended for those with fewer than 12, fewest first (ties by participant_id).',
      hint: 'GROUP BY participant_id on sessions, COUNT(*), and HAVING COUNT(*) < 12.',
      solution: 'SELECT participant_id, COUNT(*) AS n_sessions\nFROM sessions\nGROUP BY participant_id\nHAVING COUNT(*) < 12\nORDER BY n_sessions, participant_id;' },
    { id: 's7', ds: 'lab', level: 2, title: 'Participants by site and sex', concept: 'GROUP BY + COUNT',
      task: 'Count participants for each <code>site</code> and <code>sex</code>. Return <code>site</code>, <code>sex</code> and the count, ordered by site then sex.',
      hint: 'GROUP BY site, sex on participants, then ORDER BY site, sex.',
      solution: 'SELECT site, sex, COUNT(*) AS n_participants\nFROM participants\nGROUP BY site, sex\nORDER BY site, sex;' },
    { id: 's8', ds: 'lab', level: 2, title: 'Age profile by group', concept: 'AVG, MIN, MAX',
      task: 'For each <code>group_name</code>, return <code>group_name</code>, <code>min_age</code>, <code>avg_age</code> (rounded to 1 decimal) and <code>max_age</code>, ordered by group_name.',
      decimals: 1,
      hint: 'Use MIN(age), ROUND(AVG(age), 1), MAX(age) grouped by group_name.',
      solution: 'SELECT group_name, MIN(age) AS min_age, ROUND(AVG(age), 1) AS avg_age, MAX(age) AS max_age\nFROM participants\nGROUP BY group_name\nORDER BY group_name;' },
    { id: 's9', ds: 'lab', level: 2, title: 'Attendance by week', concept: 'GROUP BY + ORDER BY',
      task: 'How many sessions were attended in each <code>week</code> (0 to 11)? Return <code>week</code> and <code>attended</code>, in week order.',
      hint: 'SELECT week, COUNT(*) FROM sessions GROUP BY week ORDER BY week.',
      solution: 'SELECT week, COUNT(*) AS attended\nFROM sessions\nGROUP BY week\nORDER BY week;' },

    // Level 3: Multi-Table Joins & HAVING
    { id: 's3', ds: 'lab', level: 3, title: 'Impossible heart rates', concept: 'JOIN + data quality',
      task: 'Find resting heart-rate measurements below 30 or above 120 (sensor or typing errors). Return <code>participant_id</code>, <code>session_id</code>, <code>value</code>, ordered by participant_id then session_id.',
      hint: "measurements knows the session, sessions knows the participant. Filter metric = 'resting_hr' AND (value < 30 OR value > 120): use brackets around the OR.",
      solution: "SELECT s.participant_id, s.session_id, m.value\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nWHERE m.metric = 'resting_hr' AND (m.value < 30 OR m.value > 120)\nORDER BY s.participant_id, s.session_id;" },
    { id: 's4', ds: 'lab', level: 3, title: 'Fitness trend by group', concept: '3-table JOIN + GROUP BY',
      task: 'Average <code>vo2max</code> per group and week, rounded to 1 decimal. Return <code>group_name</code>, <code>week</code>, <code>avg_vo2max</code>, ordered by group then week.',
      decimals: 1,
      hint: "Join measurements → sessions → participants, keep metric = 'vo2max', and GROUP BY group_name, week.",
      solution: "SELECT p.group_name, s.week, ROUND(AVG(m.value), 1) AS avg_vo2max\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE m.metric = 'vo2max'\nGROUP BY p.group_name, s.week\nORDER BY p.group_name, s.week;" },
    { id: 's10', ds: 'lab', level: 3, title: 'Baseline fitness by site', concept: '3-table JOIN + WHERE',
      task: 'In week 0 (baseline), what was the average <code>vo2max</code> at each <code>site</code>, rounded to 1 decimal? Return <code>site</code> and <code>baseline_vo2max</code>, ordered by site.',
      decimals: 1,
      hint: "Join participants, sessions and measurements, filter s.week = 0 AND m.metric = 'vo2max', and group by p.site.",
      solution: "SELECT p.site, ROUND(AVG(m.value), 1) AS baseline_vo2max\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE s.week = 0 AND m.metric = 'vo2max'\nGROUP BY p.site\nORDER BY p.site;" },
    { id: 's11', ds: 'lab', level: 3, title: 'Clean resting heart rate', concept: 'filtering sensor outliers',
      task: 'Excluding sensor errors (keep only resting_hr between 30 and 120 inclusive), return each <code>group_name</code> and its average clean resting heart rate in week 11, rounded to 1 decimal, ordered by group_name.',
      decimals: 1,
      hint: "Filter m.metric = 'resting_hr' AND m.value BETWEEN 30 AND 120 AND s.week = 11.",
      solution: "SELECT p.group_name, ROUND(AVG(m.value), 1) AS avg_hr_w11\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE m.metric = 'resting_hr' AND m.value BETWEEN 30 AND 120 AND s.week = 11\nGROUP BY p.group_name\nORDER BY p.group_name;" },

    // Level 4: Dates, CASE WHEN & Conditional Metrics
    { id: 's12', ds: 'lab', level: 4, title: 'Dropout rate by group', concept: 'CTE + conditional aggregation',
      task: 'A participant is a dropout if their maximum week attended is less than 11. For each <code>group_name</code>, return <code>group_name</code> and <code>dropout_pct</code> (percentage of dropouts, rounded to 1 decimal), ordered by group_name.',
      decimals: 1,
      hint: 'In a CTE, find MAX(week) per participant_id. Join to participants and compute ROUND(100.0 * SUM(CASE WHEN max_week < 11 THEN 1 ELSE 0 END) / COUNT(*), 1).',
      solution: 'WITH last_w AS (\n  SELECT participant_id, MAX(week) AS max_week\n  FROM sessions\n  GROUP BY participant_id\n)\nSELECT p.group_name,\n       ROUND(100.0 * SUM(CASE WHEN l.max_week < 11 THEN 1 ELSE 0 END) / COUNT(*), 1) AS dropout_pct\nFROM participants p\nJOIN last_w l ON l.participant_id = p.participant_id\nGROUP BY p.group_name\nORDER BY p.group_name;' },
    { id: 's13', ds: 'lab', level: 4, title: 'Pivot week-0 metrics into columns', concept: 'CASE WHEN pivot',
      task: 'For week 0, return one row per participant (for the first 10 participants by id) with <code>participant_id</code>, <code>vo2max</code> and <code>resting_hr</code> side by side, ordered by participant_id.',
      hint: "Filter s.week = 0, group by s.participant_id, and use MAX(CASE WHEN m.metric = 'vo2max' THEN m.value END). Limit to 10.",
      solution: "SELECT s.participant_id,\n       MAX(CASE WHEN m.metric = 'vo2max' THEN m.value END) AS vo2max,\n       MAX(CASE WHEN m.metric = 'resting_hr' THEN m.value END) AS resting_hr\nFROM sessions s\nJOIN measurements m ON m.session_id = s.session_id\nWHERE s.week = 0\nGROUP BY s.participant_id\nORDER BY s.participant_id\nLIMIT 10;" },
    { id: 's19', ds: 'lab', level: 4, title: 'Age brackets & baseline VO2max', concept: 'CASE WHEN age bucketing',
      task: "Group participants into age brackets: <code>'under_35'</code> (age &lt; 35), <code>'35_to_49'</code> (35 to 49) and <code>'50_plus'</code> (50+). Return <code>age_bracket</code>, <code>n_participants</code> and <code>avg_baseline_vo2</code> (week-0 average vo2max, rounded to 1 decimal), ordered by avg_baseline_vo2 descending.",
      decimals: 1,
      hint: "Join participants, sessions (week = 0) and measurements (metric = 'vo2max'), then group by the CASE WHEN expression.",
      solution: "SELECT CASE WHEN p.age < 35 THEN 'under_35'\n            WHEN p.age < 50 THEN '35_to_49'\n            ELSE '50_plus' END AS age_bracket,\n       COUNT(*) AS n_participants,\n       ROUND(AVG(m.value), 1) AS avg_baseline_vo2\nFROM participants p\nJOIN sessions s ON s.participant_id = p.participant_id\nJOIN measurements m ON m.session_id = s.session_id\nWHERE s.week = 0 AND m.metric = 'vo2max'\nGROUP BY age_bracket\nORDER BY avg_baseline_vo2 DESC;" },
    { id: 's20', ds: 'lab', level: 4, title: 'Sensor error rate by site', concept: 'CASE WHEN quality rate',
      task: 'For each <code>site</code>, calculate the percentage of <code>resting_hr</code> measurements that are sensor errors (&lt; 30 or &gt; 120), rounded to 2 decimals. Return <code>site</code> and <code>error_pct</code>, ordered by site.',
      decimals: 2,
      hint: "Join participants → sessions → measurements where metric = 'resting_hr', then compute ROUND(100.0 * SUM(CASE WHEN m.value < 30 OR m.value > 120 THEN 1 ELSE 0 END) / COUNT(*), 2).",
      solution: "SELECT p.site,\n       ROUND(100.0 * SUM(CASE WHEN m.value < 30 OR m.value > 120 THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_pct\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE m.metric = 'resting_hr'\nGROUP BY p.site\nORDER BY p.site;" },

    // Level 5: Subqueries, CTEs (WITH) & Anti-Joins
    { id: 's5', ds: 'lab', level: 5, title: 'Weight never measured', concept: 'anti-join (NOT IN / NOT EXISTS)',
      task: 'Which participants never had a <code>weight_kg</code> measurement in any session? Return <code>participant_id</code>, ordered ascending.',
      hint: "Build the list of participants that DO have weight_kg (join sessions and measurements), then keep participants NOT IN that list.",
      solution: "SELECT participant_id\nFROM participants\nWHERE participant_id NOT IN (\n  SELECT s.participant_id\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'weight_kg'\n)\nORDER BY participant_id;" },
    { id: 's16', ds: 'lab', level: 5, title: 'Weight change for completers', concept: 'CTE + filtering completers',
      task: 'For participants who completed week 11 AND have weight measurements, compute the average weight change (week 11 minus week 0) per <code>group_name</code>, rounded to 2 decimals. Return <code>group_name</code> and <code>avg_weight_change</code>, ordered by group_name.',
      decimals: 2,
      hint: "Pivot week 0 and week 11 weight_kg per participant, keep rows where both w0 and w11 are NOT NULL, then average (w11 - w0) by group_name.",
      solution: "WITH wt AS (\n  SELECT s.participant_id,\n         MAX(CASE WHEN s.week = 0  THEN m.value END) AS w0,\n         MAX(CASE WHEN s.week = 11 THEN m.value END) AS w11\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'weight_kg' AND s.week IN (0, 11)\n  GROUP BY s.participant_id\n)\nSELECT p.group_name, ROUND(AVG(wt.w11 - wt.w0), 2) AS avg_weight_change\nFROM wt\nJOIN participants p ON p.participant_id = wt.participant_id\nWHERE wt.w0 IS NOT NULL AND wt.w11 IS NOT NULL\nGROUP BY p.group_name\nORDER BY p.group_name;" },
    { id: 's21', ds: 'lab', level: 5, title: 'Consistent high VO2max performers', concept: 'CTE + MIN threshold',
      task: 'Find participants who completed all 12 sessions AND whose <code>vo2max</code> never dropped below 42.0 in any week. Return <code>participant_id</code>, <code>group_name</code> and <code>min_vo2max</code>, ordered by min_vo2max descending.',
      decimals: 1,
      hint: "Join sessions and measurements (metric = 'vo2max'), group by participant_id with HAVING COUNT(*) = 12 AND MIN(m.value) >= 42.0.",
      solution: "SELECT p.participant_id, p.group_name, MIN(m.value) AS min_vo2max\nFROM participants p\nJOIN sessions s ON s.participant_id = p.participant_id\nJOIN measurements m ON m.session_id = s.session_id\nWHERE m.metric = 'vo2max'\nGROUP BY p.participant_id, p.group_name\nHAVING COUNT(*) = 12 AND MIN(m.value) >= 42.0\nORDER BY min_vo2max DESC, p.participant_id;" },

    // Level 6: Window Functions — Ranking & Running Totals
    { id: 's14', ds: 'lab', level: 6, title: 'Top 3 most improved participants', concept: 'CTE + conditional pivot + LIMIT',
      task: 'Find the 3 participants whose <code>vo2max</code> increased the most from week 0 to week 11 (only among those who attended week 11). Return <code>participant_id</code>, <code>group_name</code> and <code>gain</code> (rounded to 1 decimal), highest gain first.',
      decimals: 1,
      hint: 'In a CTE, get week 0 and week 11 vo2max per participant using conditional MAX, filter where both exist, subtract and ORDER BY gain DESC LIMIT 3.',
      solution: "WITH ends AS (\n  SELECT s.participant_id,\n         MAX(CASE WHEN s.week = 0  THEN m.value END) AS w0,\n         MAX(CASE WHEN s.week = 11 THEN m.value END) AS w11\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max' AND s.week IN (0, 11)\n  GROUP BY s.participant_id\n)\nSELECT e.participant_id, p.group_name, ROUND(e.w11 - e.w0, 1) AS gain\nFROM ends e\nJOIN participants p ON p.participant_id = e.participant_id\nWHERE e.w11 IS NOT NULL\nORDER BY gain DESC, e.participant_id\nLIMIT 3;" },
    { id: 's15', ds: 'lab', level: 6, title: 'Above-group baseline fitness', concept: 'AVG() OVER (PARTITION BY)',
      task: 'In week 0, list participants whose <code>vo2max</code> was strictly higher than the average week-0 <code>vo2max</code> of their own <code>group_name</code>. Return <code>participant_id</code>, <code>group_name</code> and <code>vo2max</code>, ordered by participant_id.',
      decimals: 1,
      hint: 'In a CTE for week-0 vo2max, compute AVG(m.value) OVER (PARTITION BY p.group_name) AS grp_avg, then filter value > grp_avg.',
      solution: "WITH w0 AS (\n  SELECT p.participant_id, p.group_name, m.value AS vo2max,\n         AVG(m.value) OVER (PARTITION BY p.group_name) AS grp_avg\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  JOIN participants p ON p.participant_id = s.participant_id\n  WHERE s.week = 0 AND m.metric = 'vo2max'\n)\nSELECT participant_id, group_name, vo2max\nFROM w0\nWHERE vo2max > grp_avg\nORDER BY participant_id;" },
    { id: 's22', ds: 'lab', level: 6, title: 'Top 2 baseline VO2max per site & sex', concept: 'ROW_NUMBER() OVER (PARTITION BY)',
      task: 'In week 0, find the top 2 participants with the highest <code>vo2max</code> within each <code>(site, sex)</code> combination. Return <code>site</code>, <code>sex</code>, <code>participant_id</code> and <code>vo2max</code>, ordered by site, sex, and vo2max descending.',
      decimals: 1,
      hint: 'Use ROW_NUMBER() OVER (PARTITION BY p.site, p.sex ORDER BY m.value DESC, p.participant_id) on week-0 vo2max rows, then keep rnk <= 2.',
      solution: "WITH ranked AS (\n  SELECT p.site, p.sex, p.participant_id, m.value AS vo2max,\n         ROW_NUMBER() OVER (PARTITION BY p.site, p.sex ORDER BY m.value DESC, p.participant_id) AS rnk\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  JOIN participants p ON p.participant_id = s.participant_id\n  WHERE s.week = 0 AND m.metric = 'vo2max'\n)\nSELECT site, sex, participant_id, vo2max\nFROM ranked\nWHERE rnk <= 2\nORDER BY site, sex, vo2max DESC, participant_id;" },

    // Level 7: Time-Series, LAG/LEAD & Repeat Behavior
    { id: 's6', ds: 'lab', level: 7, title: 'Improvement by group (first vs last)', concept: 'ROW_NUMBER() ASC & DESC',
      task: 'For each participant, change in <code>vo2max</code> = value at their last session minus value at their first session. Return <code>group_name</code> and the average change, rounded to 1 decimal, ordered by group.',
      decimals: 1,
      hint: 'Number each participant\'s vo2max rows with ROW_NUMBER() twice (ASC and DESC by week). The first has rank 1 ascending, the last has rank 1 descending. Subtract, then average by group.',
      solution: "WITH v AS (\n  SELECT s.participant_id, m.value,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week ASC)  AS first_rank,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week DESC) AS last_rank\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  WHERE m.metric = 'vo2max'\n), change AS (\n  SELECT participant_id,\n         MAX(CASE WHEN last_rank = 1 THEN value END) -\n         MAX(CASE WHEN first_rank = 1 THEN value END) AS delta\n  FROM v\n  GROUP BY participant_id\n)\nSELECT p.group_name, ROUND(AVG(c.delta), 1) AS avg_change\nFROM change c\nJOIN participants p ON p.participant_id = c.participant_id\nGROUP BY p.group_name\nORDER BY p.group_name;" },
    { id: 's23', ds: 'lab', level: 7, title: 'Biggest single-week VO2max jump', concept: 'LAG() OVER (PARTITION BY)',
      task: 'Across the entire study, find the 5 largest single-week increases in <code>vo2max</code> (current week minus previous week for the same participant). Return <code>participant_id</code>, <code>week</code> and <code>weekly_jump</code> (rounded to 1 decimal), highest jump first (ties by participant_id, week).',
      decimals: 1,
      hint: 'Use LAG(m.value) OVER (PARTITION BY s.participant_id ORDER BY s.week) in a CTE, subtract, and ORDER BY weekly_jump DESC LIMIT 5.',
      solution: "WITH jumps AS (\n  SELECT s.participant_id, s.week,\n         m.value - LAG(m.value) OVER (PARTITION BY s.participant_id ORDER BY s.week) AS jump\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max'\n)\nSELECT participant_id, week, ROUND(jump, 1) AS weekly_jump\nFROM jumps\nWHERE jump IS NOT NULL\nORDER BY weekly_jump DESC, participant_id, week\nLIMIT 5;" },
    { id: 's24', ds: 'lab', level: 7, title: 'Weekly retention curve by group', concept: 'cohort retention percentage',
      task: 'For weeks 0, 4, 8 and 11, compute the percentage of enrolled participants in each <code>group_name</code> who attended that week, rounded to 1 decimal. Return <code>group_name</code>, <code>week</code> and <code>retention_pct</code>, ordered by group_name then week.',
      decimals: 1,
      hint: 'Each group starts with 30 participants (or compute group totals in a CTE), then divide 100.0 * COUNT(*) by group_total for weeks IN (0, 4, 8, 11).',
      solution: 'WITH totals AS (\n  SELECT group_name, COUNT(*) AS n_enrolled\n  FROM participants\n  GROUP BY group_name\n)\nSELECT p.group_name, s.week,\n       ROUND(100.0 * COUNT(*) / t.n_enrolled, 1) AS retention_pct\nFROM sessions s\nJOIN participants p ON p.participant_id = s.participant_id\nJOIN totals t ON t.group_name = p.group_name\nWHERE s.week IN (0, 4, 8, 11)\nGROUP BY p.group_name, s.week\nORDER BY p.group_name, s.week;' },

    // Level 8: Staff Analyst & Executive Case Studies
    { id: 's25', ds: 'lab', level: 8, title: 'Responder rate (≥ 3.0 VO2max gain)', concept: 'Multi-CTE clinical responder analysis',
      task: 'Among completers (those who attended week 11), a clinical "responder" is a participant whose <code>vo2max</code> increased by at least <code>3.0</code> from week 0 to week 11. For each <code>group_name</code>, return <code>group_name</code>, <code>completers</code>, <code>responders</code> and <code>responder_pct</code> (rounded to 1 decimal), ordered by group_name.',
      decimals: 1,
      hint: 'Pivot week 0 and week 11 vo2max per participant in a CTE, keep rows where w11 IS NOT NULL, then count completers and SUM(CASE WHEN w11 - w0 >= 3.0 THEN 1 ELSE 0 END) by group_name.',
      solution: "WITH ends AS (\n  SELECT s.participant_id,\n         MAX(CASE WHEN s.week = 0  THEN m.value END) AS w0,\n         MAX(CASE WHEN s.week = 11 THEN m.value END) AS w11\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max' AND s.week IN (0, 11)\n  GROUP BY s.participant_id\n)\nSELECT p.group_name,\n       COUNT(*) AS completers,\n       SUM(CASE WHEN e.w11 - e.w0 >= 3.0 THEN 1 ELSE 0 END) AS responders,\n       ROUND(100.0 * SUM(CASE WHEN e.w11 - e.w0 >= 3.0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS responder_pct\nFROM ends e\nJOIN participants p ON p.participant_id = e.participant_id\nWHERE e.w11 IS NOT NULL\nGROUP BY p.group_name\nORDER BY p.group_name;" },
    { id: 's26', ds: 'lab', level: 8, title: 'Heart-rate recovery vs VO2max gain', concept: 'Multi-metric longitudinal join',
      task: 'For each <code>group_name</code> among week-11 completers with clean resting heart rates (30 to 120 in both week 0 and week 11), return <code>group_name</code>, <code>avg_vo2_gain</code> (week 11 minus week 0, rounded to 2 decimals) and <code>avg_hr_change</code> (week 11 minus week 0, rounded to 2 decimals), ordered by group_name.',
      decimals: 2,
      hint: 'In a CTE, pivot week-0 and week-11 vo2max and clean resting_hr (between 30 and 120) per participant. Filter where all 4 values are NOT NULL, then average by group_name.',
      solution: "WITH panel AS (\n  SELECT s.participant_id,\n         MAX(CASE WHEN s.week = 0  AND m.metric = 'vo2max' THEN m.value END) AS v0,\n         MAX(CASE WHEN s.week = 11 AND m.metric = 'vo2max' THEN m.value END) AS v11,\n         MAX(CASE WHEN s.week = 0  AND m.metric = 'resting_hr' AND m.value BETWEEN 30 AND 120 THEN m.value END) AS hr0,\n         MAX(CASE WHEN s.week = 11 AND m.metric = 'resting_hr' AND m.value BETWEEN 30 AND 120 THEN m.value END) AS hr11\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE s.week IN (0, 11)\n  GROUP BY s.participant_id\n)\nSELECT p.group_name,\n       ROUND(AVG(pa.v11 - pa.v0), 2) AS avg_vo2_gain,\n       ROUND(AVG(pa.hr11 - pa.hr0), 2) AS avg_hr_change\nFROM panel pa\nJOIN participants p ON p.participant_id = pa.participant_id\nWHERE pa.v0 IS NOT NULL AND pa.v11 IS NOT NULL AND pa.hr0 IS NOT NULL AND pa.hr11 IS NOT NULL\nGROUP BY p.group_name\nORDER BY p.group_name;" },
    { id: 's27', ds: 'lab', level: 8, title: 'Personal peak VO2max week', concept: 'ROW_NUMBER() + peak timing',
      task: 'For each participant in the <code>intervention</code> group who completed week 11, find the week in which they reached their personal highest <code>vo2max</code> (break ties by earliest week). Return <code> without_peak_at_11</code>: the count of those completers whose peak occurred strictly before week 11.',
      hint: 'Rank each participant\'s vo2max rows by value DESC, week ASC using ROW_NUMBER(), keep only intervention completers (MAX(week) = 11) and rnk = 1, then count those with week < 11.',
      solution: "WITH ranked AS (\n  SELECT s.participant_id, s.week, m.value,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY m.value DESC, s.week ASC) AS rnk,\n         MAX(s.week) OVER (PARTITION BY s.participant_id) AS max_w\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'vo2max'\n)\nSELECT COUNT(*) AS peaked_before_w11\nFROM ranked r\nJOIN participants p ON p.participant_id = r.participant_id\nWHERE p.group_name = 'intervention' AND r.max_w = 11 AND r.rnk = 1 AND r.week < 11;" },
    { id: 's28', ds: 'lab', level: 8, title: 'Site-adjusted treatment effect', concept: 'Group × site two-way difference',
      task: 'For each <code>site</code>, compute the average last-minus-first <code>vo2max</code> change for <code>intervention</code> (`int_gain`), for <code>control</code> (`ctrl_gain`), and their difference (`net_effect = int_gain - ctrl_gain`), all rounded to 2 decimals. Return <code>site</code>, <code>int_gain</code>, <code>ctrl_gain</code> and <code>net_effect</code>, ordered by site.',
      decimals: 2,
      hint: 'Compute each participant\'s last-minus-first vo2max delta using ROW_NUMBER() ASC and DESC, then group by site and use AVG(CASE WHEN group_name = ... THEN delta END).',
      solution: "WITH v AS (\n  SELECT s.participant_id, m.value,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week ASC)  AS r_first,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week DESC) AS r_last\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  WHERE m.metric = 'vo2max'\n), deltas AS (\n  SELECT participant_id,\n         MAX(CASE WHEN r_last = 1 THEN value END) - MAX(CASE WHEN r_first = 1 THEN value END) AS delta\n  FROM v\n  GROUP BY participant_id\n), by_site AS (\n  SELECT p.site,\n         AVG(CASE WHEN p.group_name = 'intervention' THEN d.delta END) AS i_avg,\n         AVG(CASE WHEN p.group_name = 'control' THEN d.delta END) AS c_avg\n  FROM deltas d\n  JOIN participants p ON p.participant_id = d.participant_id\n  GROUP BY p.site\n)\nSELECT site,\n       ROUND(i_avg, 2) AS int_gain,\n       ROUND(c_avg, 2) AS ctrl_gain,\n       ROUND(i_avg - c_avg, 2) AS net_effect\nFROM by_site\nORDER BY site;" },
  ];

  /* ---------- checking an answer ---------- */

  function normCell(v, dec) {
    if (typeof v === 'number') return Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
    return v === undefined ? null : v;
  }
  function normRows(res, dec) {
    return (res.values || []).map(function (row) { return row.map(function (v) { return normCell(v, dec); }); });
  }

  // `got` and `want` are sql.js result objects ({columns, values}) or undefined (no result set).
  // Returns {ok: boolean, message: string}.
  DA.compareResults = function (got, want, opts) {
    opts = opts || {};
    var dec = opts.decimals === undefined ? 2 : opts.decimals;
    if (!got) return { ok: false, message: 'Your query did not return a table. Start with SELECT.' };
    if (got.columns.length !== want.columns.length) {
      return { ok: false, message: 'Your result has ' + got.columns.length + ' column(s); the task asks for ' + want.columns.length + '.' };
    }
    var a = normRows(got, dec), b = normRows(want, dec);
    if (a.length !== b.length) {
      return { ok: false, message: 'Your result has ' + a.length + ' row(s); expected ' + b.length + '. Check your filters, joins and GROUP BY.' };
    }
    var ordered = !!opts.ordered;
    var sa = a.map(function (x) { return JSON.stringify(x); });
    var sb = b.map(function (x) { return JSON.stringify(x); });
    if (!ordered) { sa.sort(); sb.sort(); }
    for (var i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) {
        return { ok: false, message: ordered && sa.slice().sort().join() === sb.slice().sort().join()
          ? 'The right rows, but in the wrong order. Check your ORDER BY.'
          : 'The number of rows is right, but some values differ. Check calculations and rounding.' };
      }
    }
    return { ok: true, message: 'Correct! Your result matches the expected table.' };
  };
})();
