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

  /* ---------- SQL challenges ----------
   * The task text always names the output columns in order: the checker compares values, not names.
   * `decimals` is how many decimals numbers are compared to. */

  DA.challenges = [
    // retail
    { id: 'r1', ds: 'retail', level: 1, title: 'Pricey products', concept: 'SELECT, WHERE, ORDER BY',
      task: 'List the products that cost more than 4.00. Return <code>name</code>, <code>category</code>, <code>price</code>, most expensive first (ties by name).',
      hint: 'SELECT the three columns FROM products, filter with WHERE price > 4, then ORDER BY price DESC, name.',
      solution: 'SELECT name, category, price\nFROM products\nWHERE price > 4\nORDER BY price DESC, name;' },
    { id: 'r2', ds: 'retail', level: 1, title: 'Delivery orders', concept: 'COUNT',
      task: 'How many orders were placed with the <code>delivery</code> channel? Return one number.',
      hint: 'COUNT(*) FROM orders with a WHERE on channel. Text values go in single quotes.',
      solution: "SELECT COUNT(*) AS delivery_orders\nFROM orders\nWHERE channel = 'delivery';" },
    { id: 'r3', ds: 'retail', level: 1, title: 'Orders per channel', concept: 'GROUP BY',
      task: 'Count the orders in each channel. Return <code>channel</code> and the count, busiest channel first.',
      hint: 'Every non-aggregated column in SELECT must appear in GROUP BY. Sort by the count, descending.',
      solution: 'SELECT channel, COUNT(*) AS n_orders\nFROM orders\nGROUP BY channel\nORDER BY n_orders DESC;' },
    { id: 'r4', ds: 'retail', level: 2, title: 'Revenue by category', concept: 'JOIN + SUM',
      task: 'Revenue per product category, where revenue = qty × price, rounded to 2 decimals. Return <code>category</code> and <code>revenue</code>, highest first.',
      hint: 'order_items has qty but not price, products has price but not qty: JOIN them on product_id, then SUM(qty * price) per category.',
      solution: 'SELECT p.category, ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM order_items oi\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY p.category\nORDER BY revenue DESC;' },
    { id: 'r5', ds: 'retail', level: 2, title: 'Busy stores', concept: 'JOIN + HAVING',
      task: 'Which stores handled more than 700 orders? Return the store <code>city</code> and the number of orders, most orders first.',
      hint: 'WHERE filters rows before grouping; HAVING filters groups after. You need HAVING COUNT(*) > 700.',
      solution: 'SELECT s.city, COUNT(*) AS n_orders\nFROM orders o\nJOIN stores s ON s.store_id = o.store_id\nGROUP BY s.city\nHAVING COUNT(*) > 700\nORDER BY n_orders DESC;' },
    { id: 'r6', ds: 'retail', level: 2, title: 'Monthly revenue', concept: 'dates + 3-table JOIN',
      task: 'Revenue per month, rounded to 2 decimals, in calendar order. Return <code>month</code> as text like <code>2025-03</code>, and <code>revenue</code>.',
      hint: "SQLite has strftime('%Y-%m', order_date) to cut a date down to year-month. Join orders, order_items and products.",
      solution: "SELECT strftime('%Y-%m', o.order_date) AS month,\n       ROUND(SUM(oi.qty * p.price), 2) AS revenue\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY month\nORDER BY month;" },
    { id: 'r7', ds: 'retail', level: 2, title: 'Top 5 customers', concept: 'JOIN + ORDER BY + LIMIT',
      task: 'The 5 customers with the highest total spend. Return <code>customer_id</code> and <code>total_spent</code> (rounded to 2 decimals), biggest first.',
      hint: 'Join orders → order_items → products, group by customer, sort descending and LIMIT 5.',
      solution: 'SELECT o.customer_id, ROUND(SUM(oi.qty * p.price), 2) AS total_spent\nFROM orders o\nJOIN order_items oi ON oi.order_id = o.order_id\nJOIN products p ON p.product_id = oi.product_id\nGROUP BY o.customer_id\nORDER BY total_spent DESC, o.customer_id\nLIMIT 5;' },
    { id: 'r8', ds: 'retail', level: 3, title: 'Customers who never ordered', concept: 'LEFT JOIN',
      task: 'How many customers have never placed an order? Return one number.',
      hint: 'LEFT JOIN customers to orders keeps customers with no match; those rows have NULL in orders.order_id.',
      solution: 'SELECT COUNT(*) AS never_ordered\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.customer_id\nWHERE o.order_id IS NULL;' },
    { id: 'r9', ds: 'retail', level: 3, title: 'Running total of revenue', concept: 'CTE + window function',
      task: 'Extend the monthly revenue with a running total. Return <code>month</code>, <code>revenue</code> and <code>cumulative_revenue</code> (both rounded to 2 decimals), in calendar order.',
      hint: 'Put the monthly query in a WITH (CTE), then SUM(revenue) OVER (ORDER BY month) gives the running total.',
      solution: "WITH monthly AS (\n  SELECT strftime('%Y-%m', o.order_date) AS month,\n         SUM(oi.qty * p.price) AS revenue\n  FROM orders o\n  JOIN order_items oi ON oi.order_id = o.order_id\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY month\n)\nSELECT month,\n       ROUND(revenue, 2) AS revenue,\n       ROUND(SUM(revenue) OVER (ORDER BY month), 2) AS cumulative_revenue\nFROM monthly\nORDER BY month;" },
    { id: 'r10', ds: 'retail', level: 3, title: 'Best seller per category', concept: 'window function: RANK',
      task: 'For each category, find the product with the most units sold (sum of qty). Return <code>category</code>, <code>name</code>, <code>units</code>, ordered by category.',
      hint: 'Compute units per product in a CTE, add RANK() OVER (PARTITION BY category ORDER BY units DESC), keep rank 1.',
      solution: 'WITH units AS (\n  SELECT p.category, p.name, SUM(oi.qty) AS units\n  FROM order_items oi\n  JOIN products p ON p.product_id = oi.product_id\n  GROUP BY p.category, p.name\n), ranked AS (\n  SELECT category, name, units,\n         RANK() OVER (PARTITION BY category ORDER BY units DESC) AS rnk\n  FROM units\n)\nSELECT category, name, units\nFROM ranked\nWHERE rnk = 1\nORDER BY category;' },

    // lab
    { id: 's1', ds: 'lab', level: 1, title: 'Older intervention participants', concept: 'SELECT, WHERE, ORDER BY',
      task: 'Participants in the <code>intervention</code> group who are older than 40. Return <code>participant_id</code>, <code>age</code>, <code>site</code>, youngest first (ties by participant_id).',
      hint: 'Two conditions joined with AND. Then ORDER BY age, participant_id.',
      solution: "SELECT participant_id, age, site\nFROM participants\nWHERE group_name = 'intervention' AND age > 40\nORDER BY age, participant_id;" },
    { id: 's2', ds: 'lab', level: 2, title: 'Possible dropouts', concept: 'GROUP BY + HAVING',
      task: 'Every participant should attend 12 sessions (weeks 0 to 11). Return <code>participant_id</code> and the number of sessions attended for those with fewer than 12, fewest first (ties by participant_id).',
      hint: 'GROUP BY participant_id on sessions, COUNT(*), and HAVING COUNT(*) < 12.',
      solution: 'SELECT participant_id, COUNT(*) AS n_sessions\nFROM sessions\nGROUP BY participant_id\nHAVING COUNT(*) < 12\nORDER BY n_sessions, participant_id;' },
    { id: 's3', ds: 'lab', level: 2, title: 'Impossible heart rates', concept: 'JOIN + data quality',
      task: 'Find resting heart-rate measurements below 30 or above 120 (sensor or typing errors). Return <code>participant_id</code>, <code>session_id</code>, <code>value</code>, ordered by participant_id then session_id.',
      hint: "measurements knows the session, sessions knows the participant. Filter metric = 'resting_hr' AND (value < 30 OR value > 120): use brackets around the OR.",
      solution: "SELECT s.participant_id, s.session_id, m.value\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nWHERE m.metric = 'resting_hr' AND (m.value < 30 OR m.value > 120)\nORDER BY s.participant_id, s.session_id;" },
    { id: 's4', ds: 'lab', level: 2, title: 'Fitness trend by group', concept: '3-table JOIN + GROUP BY',
      task: 'Average <code>vo2max</code> per group and week, rounded to 1 decimal. Return <code>group_name</code>, <code>week</code>, <code>avg_vo2max</code>, ordered by group then week.',
      decimals: 1,
      hint: "Join measurements → sessions → participants, keep metric = 'vo2max', and GROUP BY group_name, week.",
      solution: "SELECT p.group_name, s.week, ROUND(AVG(m.value), 1) AS avg_vo2max\nFROM measurements m\nJOIN sessions s ON s.session_id = m.session_id\nJOIN participants p ON p.participant_id = s.participant_id\nWHERE m.metric = 'vo2max'\nGROUP BY p.group_name, s.week\nORDER BY p.group_name, s.week;" },
    { id: 's5', ds: 'lab', level: 3, title: 'Weight never measured', concept: 'anti-join (NOT IN / NOT EXISTS)',
      task: 'Which participants never had a <code>weight_kg</code> measurement in any session? Return <code>participant_id</code>, ordered ascending.',
      hint: "Build the list of participants that DO have weight_kg (join sessions and measurements), then keep participants NOT IN that list.",
      solution: "SELECT participant_id\nFROM participants\nWHERE participant_id NOT IN (\n  SELECT s.participant_id\n  FROM sessions s\n  JOIN measurements m ON m.session_id = s.session_id\n  WHERE m.metric = 'weight_kg'\n)\nORDER BY participant_id;" },
    { id: 's6', ds: 'lab', level: 3, title: 'Improvement by group', concept: 'CTE + window functions',
      task: 'For each participant, change in <code>vo2max</code> = value at their last session minus value at their first session. Return <code>group_name</code> and the average change, rounded to 1 decimal, ordered by group.',
      decimals: 1,
      hint: 'Number each participant\'s vo2max rows with ROW_NUMBER() twice (ASC and DESC by week). The first has rank 1 ascending, the last has rank 1 descending. Subtract, then average by group.',
      solution: "WITH v AS (\n  SELECT s.participant_id, m.value,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week ASC)  AS first_rank,\n         ROW_NUMBER() OVER (PARTITION BY s.participant_id ORDER BY s.week DESC) AS last_rank\n  FROM measurements m\n  JOIN sessions s ON s.session_id = m.session_id\n  WHERE m.metric = 'vo2max'\n), change AS (\n  SELECT participant_id,\n         MAX(CASE WHEN last_rank = 1 THEN value END) -\n         MAX(CASE WHEN first_rank = 1 THEN value END) AS delta\n  FROM v\n  GROUP BY participant_id\n)\nSELECT p.group_name, ROUND(AVG(c.delta), 1) AS avg_change\nFROM change c\nJOIN participants p ON p.participant_id = c.participant_id\nGROUP BY p.group_name\nORDER BY p.group_name;" },
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
