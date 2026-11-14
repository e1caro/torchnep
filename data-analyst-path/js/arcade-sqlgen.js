/* SQL blocks: endless puzzles for each of the 16 levels (logic only, tested in Node against the real databases).
 * Each level has a few templates; a template picks a table, columns and values with a seeded random generator and
 * returns the tiles of a reference query plus tempting wrong tiles. Some puzzles start as a broken query to fix.
 * Answers are judged by running them, so any equivalent query passes (see A.blockCheck). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var Q = (DA.sqlgen = {});

  function rng(seed) { return DA.gen.util.rng(seed >>> 0); }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function q(v) { return typeof v === 'number' ? String(v) : "'" + v + "'"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var CITIES = ['Berlin', 'Lisbon', 'London', 'Madrid', 'Paris'];
  var MONTHS = [['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'], ['05', 'May'], ['06', 'June'], ['07', 'July'], ['08', 'August'], ['09', 'September'], ['10', 'October'], ['11', 'November']];

  // Tables the simple templates can use: a label column, numeric columns with safe thresholds, category columns.
  var ENT = [
    { ds: 'retail', t: 'products', one: 'product', many: 'products', n: 14, label: 'name', text: true,
      nums: [{ c: 'price', say: 'price', th: [2.5, 3, 3.5, 4] }], cats: [{ c: 'category', say: 'category', vals: ['Coffee', 'Tea', 'Bakery', 'Food'] }],
      letters: ['C', 'S', 'B', 'A', 'M'] },
    { ds: 'retail', t: 'stores', one: 'store', many: 'stores', n: 5, label: 'city', text: true, nums: [{ c: 'opened_year', say: 'opening year', th: [2019, 2020, 2021] }], cats: [], letters: ['L', 'M', 'B', 'P'] },
    { ds: 'retail', t: 'customers', one: 'customer', many: 'customers', n: 400, label: 'customer_id', nums: [],
      cats: [{ c: 'city', say: 'city', vals: CITIES }, { c: 'segment', say: 'segment', vals: ['student', 'professional', 'retired'] }] },
    { ds: 'retail', t: 'orders', one: 'order', many: 'orders', n: 3200, label: 'order_id', nums: [], cats: [{ c: 'channel', say: 'channel', vals: ['in_store', 'pickup', 'delivery'] }] },
    { ds: 'lab', t: 'participants', one: 'participant', many: 'participants', n: 60, label: 'participant_id',
      nums: [{ c: 'age', say: 'age', th: [25, 30, 40, 50] }],
      cats: [{ c: 'site', say: 'site', vals: ['North', 'South'] }, { c: 'group_name', say: 'group', vals: ['control', 'intervention'] }, { c: 'sex', say: 'sex', vals: ['F', 'M'] }] },
    { ds: 'app', t: 'users', one: 'user', many: 'users', n: 1200, label: 'user_id', nums: [],
      cats: [{ c: 'platform', say: 'platform', vals: ['ios', 'android', 'web'] }, { c: 'referral', say: 'referral source', vals: ['organic', 'friend', 'ads'] }, { c: 'city', say: 'city', vals: CITIES }] },
    { ds: 'app', t: 'members', one: 'member', many: 'members', n: 436, label: 'member_id', nums: [{ c: 'monthly_price', say: 'monthly price', th: [4.99, 8.99] }],
      cats: [{ c: 'plan', say: 'plan', vals: ['basic', 'plus', 'family'] }] },
    { ds: 'growth', t: 'agents', one: 'agent', many: 'agents', n: 12, label: 'name', text: true, nums: [], cats: [{ c: 'team', say: 'team', vals: ['Tier 1', 'Tier 2'] }], letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] },
    { ds: 'lab', t: 'sessions', one: 'session', many: 'sessions', n: 668, label: 'session_id', nums: [{ c: 'week', say: 'week', th: [2, 4, 6, 8] }], cats: [] },
  ];
  function ents(test) { return ENT.filter(test); }
  function withNum(e) { return e.nums.length > 0; }
  function withCat(e) { return e.cats.length > 0; }

  /* ---------------------------------------------------------------- templates per level */
  // A template returns { ds, ask, tiles, extra, why, bug: [index, wrong tile] (optional: the broken version) }.

  var T = {};

  T[1] = [
    function (r) { // sort everything
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), desc = r() < 0.5;
      var tiles = ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'ORDER BY', m.c].concat(desc ? ['DESC'] : []);
      return { ds: e.ds, ask: 'List every ' + e.one + ' with its ' + m.say + ', ' + (desc ? 'highest' : 'lowest') + ' first.', tiles: tiles,
        extra: desc ? ['ASC', 'GROUP BY'] : ['DESC', 'WHERE'], why: 'ORDER BY sorts from low to high; DESC turns it around.' };
    },
    function (r) { // top N
      var e = pick(r, ents(function (x) { return withNum(x) && x.n >= 10; })), m = pick(r, e.nums), desc = r() < 0.6, n = pick(r, [2, 3, 4]);
      var tiles = ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'ORDER BY', m.c, desc ? 'DESC' : 'ASC', 'LIMIT ' + n];
      return { ds: e.ds, ask: 'The ' + n + ' ' + e.many + ' with the ' + (desc ? 'highest' : 'lowest') + ' ' + m.say + ': ' + e.label + ' and ' + m.c + '.', tiles: tiles,
        extra: ['LIMIT ' + (n + 1), 'GROUP BY'], bug: [7, desc ? 'ASC' : 'DESC'], why: 'Sort first, then LIMIT keeps the first rows of the sorted result.' };
    },
    function (r) { // distinct
      var e = pick(r, ents(withCat)), c = pick(r, e.cats);
      return { ds: e.ds, ask: 'Which different ' + c.say + ' values appear in ' + e.t + '?', tiles: ['SELECT', 'DISTINCT', c.c, 'FROM', e.t],
        extra: ['COUNT(*)', 'ORDER BY', 'WHERE'], why: 'DISTINCT removes repeated values from the result.' };
    },
    function (r) { // alphabetical
      var e = pick(r, ents(function (x) { return x.text; })), desc = r() < 0.3;
      return { ds: e.ds, ask: 'List the ' + e.label + ' of every ' + e.one + ' in ' + (desc ? 'reverse ' : '') + 'alphabetical order.',
        tiles: ['SELECT', e.label, 'FROM', e.t, 'ORDER BY', e.label].concat(desc ? ['DESC'] : []), extra: desc ? ['ASC', 'GROUP BY'] : ['DESC', 'GROUP BY'],
        why: 'Text sorts alphabetically: A to Z, or Z to A with DESC.' };
    },
  ];

  T[2] = [
    function (r) { // number compared
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), up = r() < 0.6, v = pick(r, up ? m.th.slice(0, Math.max(1, m.th.length - 1)) : m.th.slice(1));
      var cond = m.c + (up ? ' > ' : ' < ') + v;
      return { ds: e.ds, ask: 'Which ' + e.many + ' have a ' + m.say + (up ? ' above ' : ' below ') + v + '? Show ' + e.label + ' and ' + m.c + '.',
        tiles: ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'WHERE', cond], extra: ['HAVING', m.c + (up ? ' < ' : ' > ') + v], bug: [6, m.c + (up ? ' < ' : ' > ') + v],
        why: 'WHERE keeps the rows where the condition is true.' };
    },
    function (r) { // text equals
      var e = pick(r, ents(withCat)), c = pick(r, e.cats), v = pick(r, c.vals);
      return { ds: e.ds, ask: 'List the ' + e.label + ' of the ' + e.many + ' whose ' + c.say + ' is ' + v + '.',
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)], extra: [c.c + ' = ' + v.replace(/ /g, '_'), 'HAVING'], bug: [5, c.c + ' = ' + v.replace(/ /g, '_')],
        why: 'Text values need single quotes; without them the database looks for a column with that name.' };
    },
    function (r) { // AND
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), v = pick(r, c.vals), th = m.th[0];
      return { ds: e.ds, ask: e.many.charAt(0).toUpperCase() + e.many.slice(1) + ' with ' + c.say + ' ' + v + ' AND a ' + m.say + ' of at least ' + th + ': ' + e.label + '.',
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v), 'AND', m.c + ' >= ' + th], extra: ['OR', m.c + ' > ' + (th + 0.5)], bug: [6, 'OR'],
        why: 'AND needs both conditions to be true; OR needs only one.' };
    },
    function (r) { // IN
      var e = pick(r, ents(function (x) { return x.cats.some(function (c) { return c.vals.length >= 3; }); }));
      var c = pick(r, e.cats.filter(function (x) { return x.vals.length >= 3; })), two = shuffle(r, c.vals).slice(0, 2);
      return { ds: e.ds, ask: 'How many ' + e.many + ' have ' + c.say + ' ' + two[0] + ' or ' + two[1] + '?',
        tiles: ['SELECT', 'COUNT(*)', 'FROM', e.t, 'WHERE', c.c + ' IN (' + q(two[0]) + ', ' + q(two[1]) + ')'], extra: [c.c + ' = ' + q(two[0]), 'AND'],
        why: 'IN (…) is a short way to write several OR conditions on one column.' };
    },
    function (r) { // LIKE
      var e = pick(r, ents(function (x) { return x.letters; })), L = pick(r, e.letters);
      return { ds: e.ds, ask: 'Which ' + e.many + ' have a ' + e.label + ' starting with ' + L + '?',
        tiles: ['SELECT', e.label, 'FROM', e.t, 'WHERE', e.label + " LIKE '" + L + "%'"], extra: [e.label + " = '" + L + "%'", e.label + " LIKE '%" + L + "'"],
        why: "In LIKE, % stands for any text: 'C%' means starts with C." };
    },
  ];

  T[3] = [
    function (r) { // count with a filter
      var e = pick(r, ents(withCat)), c = pick(r, e.cats), v = pick(r, c.vals);
      return { ds: e.ds, ask: 'How many ' + e.many + ' have ' + c.say + ' ' + v + '?', tiles: ['SELECT', 'COUNT(*)', 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)],
        extra: ['COUNT(DISTINCT ' + c.c + ')', 'GROUP BY'], bug: [1, 'COUNT(DISTINCT ' + c.c + ')'], why: 'COUNT(*) counts the rows left after WHERE.' };
    },
    function (r) { // an aggregate of a number
      var e = pick(r, ents(withNum)), m = pick(r, e.nums), k = pick(r, [['MAX', 'highest'], ['MIN', 'lowest'], ['AVG', 'average'], ['SUM', 'total']]);
      var others = ['MAX', 'MIN', 'AVG', 'SUM'].filter(function (x) { return x !== k[0]; });
      return { ds: e.ds, ask: 'What is the ' + k[1] + ' ' + m.say + ' across all ' + e.many + '?', tiles: ['SELECT', k[0] + '(' + m.c + ')', 'FROM', e.t],
        extra: shuffle(r, others).slice(0, 2).map(function (f) { return f + '(' + m.c + ')'; }), why: k[0] + ' squeezes the whole column into one number.' };
    },
    function (r) { // sum or average with a filter
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), v = pick(r, c.vals), avg = r() < 0.5;
      return { ds: e.ds, ask: 'What is the ' + (avg ? 'average' : 'total') + ' ' + m.say + ' of the ' + e.many + ' with ' + c.say + ' ' + v + '?',
        tiles: ['SELECT', (avg ? 'AVG(' : 'SUM(') + m.c + ')', 'FROM', e.t, 'WHERE', c.c + ' = ' + q(v)], extra: [(avg ? 'SUM(' : 'AVG(') + m.c + ')', 'HAVING'],
        bug: [1, (avg ? 'SUM(' : 'AVG(') + m.c + ')'], why: 'WHERE runs first, then the aggregate works on the rows that are left.' };
    },
    function (r) { // distinct count
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats);
      return { ds: e.ds, ask: 'How many different ' + c.say + ' values do the ' + e.many + ' have?', tiles: ['SELECT', 'COUNT(DISTINCT ' + c.c + ')', 'FROM', e.t],
        extra: ['COUNT(' + c.c + ')', 'COUNT(*)'], bug: [1, 'COUNT(' + c.c + ')'], why: 'COUNT(DISTINCT x) counts each value once.' };
    },
  ];

  T[4] = [
    function (r) { // count per group
      var e = pick(r, ents(withCat)), c = pick(r, e.cats);
      return { ds: e.ds, ask: 'How many ' + e.many + ' are there per ' + c.say + '?', tiles: ['SELECT', c.c + ' ,', 'COUNT(*)', 'FROM', e.t, 'GROUP BY', c.c],
        extra: ['ORDER BY', 'COUNT(DISTINCT ' + c.c + ')'], why: 'GROUP BY gives one row per value; COUNT(*) counts the rows in each group.' };
    },
    function (r) { // average per group
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x); })), m = pick(r, e.nums), c = pick(r, e.cats), f = pick(r, [['AVG', 'average'], ['MAX', 'highest'], ['SUM', 'total']]);
      return { ds: e.ds, ask: 'The ' + f[1] + ' ' + m.say + ' per ' + c.say + '.', tiles: ['SELECT', c.c + ' ,', f[0] + '(' + m.c + ')', 'FROM', e.t, 'GROUP BY', c.c],
        extra: [m.c + ' ,', 'WHERE'], why: 'With GROUP BY, every column you select is either grouped or aggregated.' };
    },
    function (r) { // HAVING
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats), k = Math.floor(e.n / c.vals.length * pick(r, [0.5, 0.8, 0.9]));
      return { ds: e.ds, ask: 'Which ' + c.say + ' values have more than ' + k + ' ' + e.many + '? Show the value and the count.',
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*)', 'FROM', e.t, 'GROUP BY', c.c, 'HAVING', 'COUNT(*) > ' + k], extra: ['WHERE', 'COUNT(*) < ' + k], bug: [7, 'WHERE'],
        why: 'WHERE filters rows before grouping; HAVING filters the groups after counting.' };
    },
    function (r) { // sorted groups
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats), desc = r() < 0.7;
      return { ds: e.ds, ask: c.say.charAt(0).toUpperCase() + c.say.slice(1) + ' values by number of ' + e.many + ', ' + (desc ? 'most' : 'fewest') + ' first.',
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*) AS n', 'FROM', e.t, 'GROUP BY', c.c, 'ORDER BY', 'n'].concat(desc ? ['DESC'] : []), extra: desc ? ['ASC', 'WHERE'] : ['DESC', 'WHERE'],
        why: 'An alias like n can be used in ORDER BY.' };
    },
  ];

  var JOINS = [
    { ds: 'retail', ask: 'orders per store city', g: 's.city', agg: 'COUNT(*)', from: 'orders o', join: 'stores s', on: 'ON o.store_id = s.store_id', wrong: 'ON o.order_id = s.store_id' },
    { ds: 'retail', ask: 'units sold per product category', g: 'p.category', agg: 'SUM(i.qty)', from: 'order_items i', join: 'products p', on: 'ON i.product_id = p.product_id', wrong: 'ON i.item_id = p.product_id' },
    { ds: 'lab', ask: 'sessions per site', g: 'p.site', agg: 'COUNT(*)', from: 'sessions s', join: 'participants p', on: 'ON s.participant_id = p.participant_id', wrong: 'ON s.session_id = p.participant_id' },
    { ds: 'lab', ask: 'sessions per study group', g: 'p.group_name', agg: 'COUNT(*)', from: 'sessions s', join: 'participants p', on: 'ON s.participant_id = p.participant_id', wrong: 'ON s.session_id = p.participant_id' },
    { ds: 'app', ask: 'members per platform', g: 'u.platform', agg: 'COUNT(*)', from: 'members m', join: 'users u', on: 'ON m.user_id = u.user_id', wrong: 'ON m.member_id = u.user_id' },
    { ds: 'growth', ask: 'tickets per agent team', g: 'a.team', agg: 'COUNT(*)', from: 'tickets t', join: 'agents a', on: 'ON t.agent_id = a.agent_id', wrong: 'ON t.ticket_id = a.agent_id' },
    { ds: 'growth', ask: 'tickets per agent name', g: 'a.name', agg: 'COUNT(*)', from: 'tickets t', join: 'agents a', on: 'ON t.agent_id = a.agent_id', wrong: 'ON t.ticket_id = a.agent_id' },
  ];
  T[5] = [
    function (r) { // join and group
      var j = pick(r, JOINS);
      return { ds: j.ds, ask: 'Count the ' + j.ask + '.', tiles: ['SELECT', j.g + ' ,', j.agg, 'FROM', j.from, 'JOIN', j.join, j.on, 'GROUP BY', j.g],
        extra: [j.wrong, 'WHERE'], bug: [7, j.wrong], why: 'ON says which columns match: usually a key in one table and the same id in the other.' };
    },
    function (r) { // join with a filter
      var c = pick(r, CITIES), ch = pick(r, ['in_store', 'pickup', 'delivery']);
      return { ds: 'retail', ask: 'How many ' + ch + ' orders did the ' + c + ' store take?',
        tiles: ['SELECT', 'COUNT(*)', 'FROM', 'orders o', 'JOIN', 'stores s', 'ON o.store_id = s.store_id', 'WHERE', "s.city = '" + c + "'", 'AND', "o.channel = '" + ch + "'"],
        extra: ['OR', 'ON o.order_id = s.store_id'], bug: [9, 'OR'], why: 'After a JOIN you can filter on columns from either table.' };
    },
    function (r) { // three tables
      var cat = pick(r, ['Coffee', 'Tea', 'Bakery', 'Food']), ch = pick(r, ['in_store', 'pickup', 'delivery']);
      return { ds: 'retail', ask: 'Units of ' + cat + ' products sold in ' + ch + ' orders.',
        tiles: ['SELECT', 'SUM(i.qty)', 'FROM', 'order_items i', 'JOIN', 'products p', 'ON i.product_id = p.product_id', 'JOIN', 'orders o', 'ON i.order_id = o.order_id', 'WHERE', "p.category = '" + cat + "'", 'AND', "o.channel = '" + ch + "'"],
        extra: ['COUNT(*)', 'ON i.order_id = o.customer_id'], bug: [1, 'COUNT(*)'], why: 'Each JOIN adds one table; order_items links products and orders.' };
    },
    function (r) { // left join keeps rows without a match
      var c = pick(r, CITIES);
      return { ds: 'retail', ask: 'Orders per customer in ' + c + ', including customers with no orders: customer_id and number of orders.',
        tiles: ['SELECT', 'c.customer_id ,', 'COUNT(o.order_id)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON o.customer_id = c.customer_id', 'WHERE', "c.city = '" + c + "'", 'GROUP BY', 'c.customer_id'],
        extra: ['JOIN', 'COUNT(*)'], bug: [5, 'JOIN'], why: 'LEFT JOIN keeps every customer; COUNT(o.order_id) gives 0 where there is no order.' };
    },
  ];

  var DATES = [
    { ds: 'retail', t: 'orders', d: 'order_date', many: 'orders' }, { ds: 'retail', t: 'customers', d: 'signup_date', many: 'customer sign-ups' },
    { ds: 'lab', t: 'sessions', d: 'session_date', many: 'sessions' }, { ds: 'app', t: 'users', d: 'signup_date', many: 'user sign-ups' },
  ];
  var BANDS = [
    { ds: 'retail', t: 'products', c: 'price', lo: 'cheap', hi: 'premium', th: [3, 3.5, 4], many: 'products' },
    { ds: 'lab', t: 'participants', c: 'age', lo: 'younger', hi: 'older', th: [30, 40, 50], many: 'participants' },
    { ds: 'app', t: 'members', c: 'monthly_price', lo: 'standard', hi: 'premium', th: [5, 9], many: 'members' },
  ];
  T[6] = [
    function (r) { // per month
      var d = pick(r, DATES);
      return { ds: d.ds, ask: 'How many ' + d.many + ' per month (YYYY-MM)?', tiles: ['SELECT', "strftime('%Y-%m', " + d.d + ') AS month ,', 'COUNT(*)', 'FROM', d.t, 'GROUP BY', 'month'],
        extra: ["strftime('%m', " + d.d + ') AS month ,', 'ORDER BY'], why: "strftime('%Y-%m', date) keeps the year and the month, so the same month of two years stays apart." };
    },
    function (r) { // one month
      var m = pick(r, MONTHS.slice(0, 11)), next = ('0' + (Number(m[0]) + 1)).slice(-2);
      return { ds: 'retail', ask: 'How many orders were placed in ' + m[1] + ' 2025?',
        tiles: ['SELECT', 'COUNT(*)', 'FROM', 'orders', 'WHERE', "order_date >= '2025-" + m[0] + "-01'", 'AND', "order_date < '2025-" + next + "-01'"],
        extra: ['OR', "order_date > '2025-" + m[0] + "-01'"], bug: [6, 'OR'], why: 'From the first day of the month up to, not including, the first day of the next month.' };
    },
    function (r) { // CASE bands
      var b = pick(r, BANDS), th = pick(r, b.th);
      return { ds: b.ds, ask: 'Label ' + b.many + " as '" + b.lo + "' (" + b.c + ' under ' + th + ") or '" + b.hi + "', and count each label.",
        tiles: ['SELECT', 'CASE WHEN ' + b.c + ' < ' + th + " THEN '" + b.lo + "'", "ELSE '" + b.hi + "' END AS band ,", 'COUNT(*)', 'FROM', b.t, 'GROUP BY', 'band'],
        extra: ['WHERE', 'CASE WHEN ' + b.c + ' > ' + th + " THEN '" + b.lo + "'"], bug: [1, 'CASE WHEN ' + b.c + ' > ' + th + " THEN '" + b.lo + "'"],
        why: 'CASE WHEN turns a number into a label you can group by.' };
    },
    function (r) { // weekday
      var d = pick(r, DATES);
      return { ds: d.ds, ask: 'How many ' + d.many + " per weekday? (strftime('%w') gives 0 for Sunday to 6 for Saturday)",
        tiles: ['SELECT', "strftime('%w', " + d.d + ') AS weekday ,', 'COUNT(*)', 'FROM', d.t, 'GROUP BY', 'weekday'], extra: ["strftime('%d', " + d.d + ') AS weekday ,', 'WHERE'],
        bug: [1, "strftime('%d', " + d.d + ') AS weekday ,'], why: "'%w' is the day of the week; '%d' would be the day of the month." };
    },
    function (r) { // days between two dates
      var pr = pick(r, ['low', 'medium', 'high']);
      return { ds: 'growth', ask: 'Average days from created_at to resolved_at for ' + pr + ' priority tickets, one decimal.',
        tiles: ['SELECT', 'ROUND(AVG(julianday(resolved_at) - julianday(created_at)), 1)', 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'"],
        extra: ['ROUND(AVG(julianday(created_at) - julianday(resolved_at)), 1)', 'resolved_at - created_at'], bug: [1, 'ROUND(AVG(julianday(created_at) - julianday(resolved_at)), 1)'],
        why: 'julianday turns a date into a number of days, so subtracting two of them gives the time in between. Open tickets (NULL) are skipped by AVG.' };
    },
  ];

  var PER = [
    { ds: 'retail', t: 'orders', k: 'customer_id', what: 'orders does a customer place' },
    { ds: 'lab', t: 'sessions', k: 'participant_id', what: 'sessions does a participant attend' },
    { ds: 'app', t: 'events', k: 'user_id', what: 'events does a user trigger' },
    { ds: 'growth', t: 'tickets', k: 'agent_id', what: 'tickets does an agent handle' },
    { ds: 'app', t: 'invoices', k: 'member_id', what: 'invoices does a member get' },
  ];
  var SUBIN = [
    { ds: 'retail', ask: 'Customers who placed at least one delivery order: customer_id and city.', sel: ['customer_id ,', 'city'], t: 'customers', k: 'customer_id', sub: "(SELECT customer_id FROM orders WHERE channel = 'delivery')" },
    { ds: 'app', ask: 'Users who made at least one purchase: user_id and platform.', sel: ['user_id ,', 'platform'], t: 'users', k: 'user_id', sub: "(SELECT user_id FROM events WHERE event_name = 'purchase')" },
    { ds: 'app', ask: 'Users who ever had a failed invoice: user_id and city.', sel: ['user_id ,', 'city'], t: 'users', k: 'user_id', sub: '(SELECT m.user_id FROM members m JOIN invoices i ON i.member_id = m.member_id WHERE i.paid = 0)' },
    { ds: 'growth', ask: 'Agents who handled at least one ticket with CSAT 1: name and team.', sel: ['name ,', 'team'], t: 'agents', k: 'agent_id', sub: '(SELECT agent_id FROM tickets WHERE csat = 1)' },
  ];
  T[7] = [
    function (r) { // above the average
      var e = pick(r, ents(function (x) { return withNum(x) && x.n >= 10; })), m = pick(r, e.nums), up = r() < 0.6;
      return { ds: e.ds, ask: cap(e.many) + ' with a ' + m.say + (up ? ' above' : ' below') + ' the average: ' + e.label + ' and ' + m.c + '.',
        tiles: ['SELECT', e.label + ' ,', m.c, 'FROM', e.t, 'WHERE', m.c + (up ? ' >' : ' <'), '(SELECT AVG(' + m.c + ') FROM ' + e.t + ')'],
        extra: ['AVG(' + m.c + ')', 'HAVING'], why: 'The subquery computes the average once; WHERE compares every row with it.' };
    },
    function (r) { // IN (subquery)
      var s = pick(r, SUBIN);
      return { ds: s.ds, ask: s.ask, tiles: ['SELECT'].concat(s.sel, ['FROM', s.t, 'WHERE', s.k + ' IN', s.sub]), extra: [s.k + ' NOT IN', 'JOIN'], bug: [s.sel.length + 4, s.k + ' NOT IN'],
        why: 'IN (SELECT …) tests membership without multiplying rows the way a JOIN can.' };
    },
    function (r) { // a CTE of counts
      var p = pick(r, PER), f = pick(r, [['AVG', 'On average, how many'], ['MAX', 'At most, how many']]);
      return { ds: p.ds, ask: f[1] + ' ' + p.what + '?', tiles: ['WITH c AS', '(SELECT ' + p.k + ' , COUNT(*) AS n FROM ' + p.t + ' GROUP BY ' + p.k + ')', 'SELECT', f[0] + '(n)', 'FROM', 'c'],
        extra: ['SUM(n)', 'COUNT(n)'], bug: [3, 'SUM(n)'], why: 'The CTE counts per ' + p.k.replace('_id', '') + ' first; the outer query summarises those counts.' };
    },
  ];

  T[8] = [
    function (r) { // rank
      var e = pick(r, ents(function (x) { return withNum(x) && x.n <= 100; })), m = pick(r, e.nums), dense = r() < 0.4;
      return { ds: e.ds, ask: (dense ? 'Dense-rank ' : 'Rank ') + e.many + ' by ' + m.say + ', highest first: ' + e.label + ', ' + m.c + ' and rnk.',
        tiles: ['SELECT', e.label + ' ,', m.c + ' ,', (dense ? 'DENSE_RANK()' : 'RANK()') + ' OVER', '(ORDER BY ' + m.c + ' DESC) AS rnk', 'FROM', e.t],
        extra: ['GROUP BY', '(ORDER BY ' + m.c + ') AS rnk'], bug: [4, '(ORDER BY ' + m.c + ') AS rnk'], why: 'A window function adds a value to every row without grouping them away.' };
    },
    function (r) { // partition average
      var e = pick(r, ents(function (x) { return withNum(x) && withCat(x) && x.n <= 100; })), m = pick(r, e.nums), c = pick(r, e.cats);
      return { ds: e.ds, ask: 'Each ' + e.one + "'s " + m.say + ' next to the average ' + m.say + ' of its ' + c.say + ': ' + e.label + ', ' + c.c + ', ' + m.c + ' and grp_avg.',
        tiles: ['SELECT', e.label + ' ,', c.c + ' ,', m.c + ' ,', 'AVG(' + m.c + ') OVER (PARTITION BY ' + c.c + ') AS grp_avg', 'FROM', e.t],
        extra: ['GROUP BY', 'AVG(' + m.c + ') AS grp_avg'], why: 'PARTITION BY computes the average per group but keeps every row.' };
    },
    function (r) { // running total or previous month
      var d = pick(r, DATES), lag = r() < 0.5;
      return { ds: d.ds, ask: cap(d.many) + ' per month with ' + (lag ? "the previous month's count" : 'a running total') + ': month, n and ' + (lag ? 'prev' : 'running') + '.',
        tiles: ['WITH m AS', "(SELECT strftime('%Y-%m', " + d.d + ') AS month , COUNT(*) AS n FROM ' + d.t + ' GROUP BY month)', 'SELECT', 'month ,', 'n ,',
          lag ? 'LAG(n) OVER (ORDER BY month) AS prev' : 'SUM(n) OVER (ORDER BY month) AS running', 'FROM', 'm'],
        extra: lag ? ['LEAD(n) OVER (ORDER BY month) AS prev', 'GROUP BY'] : ['SUM(n) AS running', 'GROUP BY'], bug: [5, lag ? 'LEAD(n) OVER (ORDER BY month) AS prev' : 'SUM(n) AS running'],
        why: lag ? 'LAG looks one row back in the order you give.' : 'SUM(...) OVER (ORDER BY month) adds up every month so far.' };
    },
    function (r) { // NTILE
      var e = pick(r, ents(function (x) { return withNum(x) && x.n <= 100 && x.n >= 10; })), m = pick(r, e.nums), k = pick(r, [2, 3, 4]);
      return { ds: e.ds, ask: 'Split the ' + e.many + ' into ' + k + ' equal groups by ' + m.say + ', lowest first: ' + e.label + ', ' + m.c + ' and grp.',
        tiles: ['SELECT', e.label + ' ,', m.c + ' ,', 'NTILE(' + k + ') OVER (ORDER BY ' + m.c + ') AS grp', 'FROM', e.t],
        extra: ['NTILE(' + k + ') OVER (ORDER BY ' + m.c + ' DESC) AS grp', 'GROUP BY'], bug: [3, 'NTILE(' + k + ') OVER (ORDER BY ' + m.c + ' DESC) AS grp'],
        why: 'NTILE(k) deals the sorted rows into k groups of (almost) the same size.' };
    },
    function (r) { // share of the total with a window over a group
      var e = pick(r, ents(function (x) { return withCat(x) && x.n >= 50; })), c = pick(r, e.cats);
      return { ds: e.ds, ask: 'Each ' + c.say + "'s share of all " + e.many + ' (%), one decimal: ' + c.c + ', n and pct.',
        tiles: ['SELECT', c.c + ' ,', 'COUNT(*) AS n ,', 'ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct', 'FROM', e.t, 'GROUP BY', c.c],
        extra: ['ROUND(100.0 * COUNT(*) / COUNT(*), 1) AS pct', 'WHERE'], bug: [3, 'ROUND(100.0 * COUNT(*) / COUNT(*), 1) AS pct'],
        why: 'SUM(COUNT(*)) OVER () adds up the group counts across the whole result: the total to divide by.' };
    },
  ];

  T[9] = [
    function (r) { // IS NULL
      var x = pick(r, [['growth', 'tickets', 'resolved_at', 'tickets are still open (no resolved_at)'], ['app', 'members', 'cancel_date', 'members are still active (no cancel_date)'], ['growth', 'tickets', 'category', 'tickets have no category']]);
      return { ds: x[0], ask: 'How many ' + x[3] + '?', tiles: ['SELECT', 'COUNT(*)', 'FROM', x[1], 'WHERE', x[2] + ' IS NULL'], extra: [x[2] + ' = NULL', x[2] + ' IS NOT NULL'],
        bug: [5, x[2] + ' = NULL'], why: 'NULL is not equal to anything, not even NULL: use IS NULL.' };
    },
    function (r) { // COUNT(column) skips NULLs
      var x = pick(r, [['csat', 'have a CSAT score'], ['category', 'have a category'], ['resolved_at', 'are resolved']]);
      return { ds: 'growth', ask: 'How many tickets ' + x[1] + '? Use one aggregate, no WHERE.', tiles: ['SELECT', 'COUNT(' + x[0] + ')', 'FROM', 'tickets'], extra: ['COUNT(*)', 'SUM(' + x[0] + ')'],
        bug: [1, 'COUNT(*)'], why: 'COUNT(column) counts the rows where the column is not NULL; COUNT(*) counts every row.' };
    },
    function (r) { // COALESCE label
      var by = pick(r, [['category', 'unknown'], ['category', 'not set']]);
      return { ds: 'growth', ask: "Tickets per category, with missing categories shown as '" + by[1] + "'.",
        tiles: ['SELECT', "COALESCE(category, '" + by[1] + "') AS cat ,", 'COUNT(*)', 'FROM', 'tickets', 'GROUP BY', 'cat'], extra: ['category AS cat ,', 'WHERE'],
        why: 'COALESCE returns the first value that is not NULL, so the gaps get a readable label.' };
    },
    function (r) { // AVG with or without the gaps
      var zero = r() < 0.5, pr = pick(r, ['low', 'medium', 'high']);
      var right = zero ? 'AVG(COALESCE(csat, 0))' : 'AVG(csat)', wrong = zero ? 'AVG(csat)' : 'AVG(COALESCE(csat, 0))';
      return { ds: 'growth', ask: 'Average CSAT of ' + pr + ' priority tickets ' + (zero ? 'if a missing score counts as 0.' : 'that have a score.'),
        tiles: ['SELECT', right, 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'"], extra: [wrong, 'COUNT(csat)'], bug: [1, wrong],
        why: 'AVG skips NULLs. Replacing them with 0 changes the answer, so decide what a missing score means.' };
    },
  ];

  T[10] = [
    function (r) { // clean then group
      var c = pick(r, [['channel', 'channel'], ['priority', 'priority']]);
      return { ds: 'growth', ask: 'Tickets per ' + c[1] + ', after cleaning the typing: ignore upper/lower case and extra spaces.',
        tiles: ['SELECT', 'LOWER(TRIM(' + c[0] + ')) AS v ,', 'COUNT(*)', 'FROM', 'tickets', 'GROUP BY', 'v'], extra: ['TRIM(' + c[0] + ') AS v ,', c[0] + ' AS v ,'], bug: [1, 'TRIM(' + c[0] + ') AS v ,'],
        why: 'TRIM removes the spaces at the ends; LOWER makes "Email" and "EMAIL" the same.' };
    },
    function (r) { // clean filter
      var v = pick(r, ['email', 'chat', 'phone']);
      return { ds: 'growth', ask: 'How many tickets came by ' + v + ', however it was typed?', tiles: ['SELECT', 'COUNT(*)', 'FROM', 'tickets', 'WHERE', "LOWER(TRIM(channel)) = '" + v + "'"],
        extra: ["channel = '" + v + "'", "LOWER(channel) = '" + v + "'"], bug: [5, "LOWER(channel) = '" + v + "'"], why: "LOWER alone misses '" + v + " ' with a trailing space; TRIM fixes that." };
    },
    function (r) { // contains
      var w = pick(r, [['Tea', 'products', 'name'], ['Latte', 'products', 'name'], ['Tier', 'agents', 'team']]);
      return { ds: w[1] === 'products' ? 'retail' : 'growth', ask: 'Which ' + w[1] + ' have "' + w[0] + '" anywhere in their ' + w[2] + '? Show the ' + w[2] + '.',
        tiles: ['SELECT', w[2], 'FROM', w[1], 'WHERE', w[2] + " LIKE '%" + w[0] + "%'"], extra: [w[2] + " = '" + w[0] + "'", w[2] + " LIKE '" + w[0] + "'"],
        why: "'%" + w[0] + "%' means: any text, then " + w[0] + ', then any text.' };
    },
    function (r) { // SUBSTR
      var day = r() < 0.5;
      return { ds: 'app', ask: 'Number of events per ' + (day ? 'day' : 'month') + ', taken from the first ' + (day ? '10' : '7') + ' characters of event_time.',
        tiles: ['SELECT', 'SUBSTR(event_time, 1, ' + (day ? 10 : 7) + ') AS d ,', 'COUNT(*)', 'FROM', 'events', 'GROUP BY', 'd'], extra: ['SUBSTR(event_time, 1, ' + (day ? 7 : 4) + ') AS d ,', 'ORDER BY'],
        bug: [1, 'SUBSTR(event_time, 1, ' + (day ? 7 : 4) + ') AS d ,'], why: 'SUBSTR(text, start, length) cuts out part of a text: positions start at 1.' };
    },
    function (r) { // LENGTH
      var more = r() < 0.5, k = pick(r, more ? [3, 4] : [3, 4, 5]);
      return { ds: 'growth', ask: 'Agents whose name has ' + (more ? 'more than ' : 'exactly ') + k + ' letters: name.',
        tiles: ['SELECT', 'name', 'FROM', 'agents', 'WHERE', 'LENGTH(name) ' + (more ? '> ' : '= ') + k], extra: ["name LIKE '" + '_'.repeat(k) + "'", 'LENGTH(name) < ' + k],
        why: 'LENGTH counts the characters of a text.' };
    },
    function (r) { // clean priority filter with a count per agent
      var pr = pick(r, ['low', 'medium', 'high']);
      return { ds: 'growth', ask: cap(pr) + ' priority tickets per agent_id, however the priority was typed.',
        tiles: ['SELECT', 'agent_id ,', 'COUNT(*)', 'FROM', 'tickets', 'WHERE', "LOWER(priority) = '" + pr + "'", 'GROUP BY', 'agent_id'],
        extra: ["priority = '" + pr + "'", "UPPER(priority) = '" + pr + "'"], bug: [6, "priority = '" + pr + "'"],
        why: "Some rows say '" + pr.toUpperCase() + "': compare LOWER(priority) with the lower-case word." };
    },
  ];

  T[11] = [
    function (r) { // rounded average
      var x = pick(r, [['retail', 'products', 'category', 'price', 2], ['lab', 'measurements', 'metric', 'value', 1], ['lab', 'participants', 'site', 'age', 1]]);
      return { ds: x[0], ask: 'The average ' + x[3] + ' per ' + x[2] + ', rounded to ' + x[4] + ' decimal' + (x[4] === 1 ? '' : 's') + '.',
        tiles: ['SELECT', x[2] + ' ,', 'ROUND(AVG(' + x[3] + '), ' + x[4] + ')', 'FROM', x[1], 'GROUP BY', x[2]], extra: ['AVG(ROUND(' + x[3] + '))', 'ROUND(' + x[3] + ', ' + x[4] + ')'],
        bug: [2, 'AVG(ROUND(' + x[3] + '))'], why: 'Round at the end: rounding each value first changes the average.' };
    },
    function (r) { // revenue
      var g = pick(r, [['p.category', 'product category'], ['p.name', 'product']]);
      return { ds: 'retail', ask: 'Revenue (qty × price) per ' + g[1] + ', rounded to 2 decimals.',
        tiles: ['SELECT', g[0] + ' ,', 'ROUND(SUM(i.qty * p.price), 2) AS revenue', 'FROM', 'order_items i', 'JOIN', 'products p', 'ON i.product_id = p.product_id', 'GROUP BY', g[0]],
        extra: ['ROUND(SUM(i.qty + p.price), 2) AS revenue', 'SUM(p.price)'], bug: [2, 'ROUND(SUM(i.qty + p.price), 2) AS revenue'], why: 'Multiply inside the SUM: each line is qty × price, then add the lines up.' };
    },
    function (r) { // a percentage
      var x = pick(r, [['retail', 'orders', "channel = 'delivery'", 'orders were delivery orders'], ['app', 'invoices', 'paid = 0', 'invoices failed (paid = 0)'], ['app', 'users', "referral = 'friend'", 'users came from a friend referral'], ['growth', 'tickets', 'resolved_at IS NULL', 'tickets are still open']]);
      return { ds: x[0], ask: 'What percentage of ' + x[3] + '? One decimal.', tiles: ['SELECT', 'ROUND(100.0 *', 'SUM(CASE WHEN ' + x[2] + ' THEN 1 ELSE 0 END)', '/ COUNT(*), 1)', 'FROM', x[1]],
        extra: ['ROUND(100 *', 'COUNT(*)'], bug: [1, 'ROUND(100 *'], why: 'Integer ÷ integer drops the decimals in SQL; 100.0 makes the division a decimal one.' };
    },
    function (r) { // integer division as a tool: age decades
      var w = pick(r, [10, 20]);
      return { ds: 'lab', ask: 'Participants per age band of ' + w + ' years (18 → ' + (w === 10 ? 10 : 0) + ', 25 → 20): band and count.',
        tiles: ['SELECT', '(age / ' + w + ') * ' + w + ' AS band ,', 'COUNT(*)', 'FROM', 'participants', 'GROUP BY', 'band'], extra: ['(age / ' + w + '.0) * ' + w + ' AS band ,', 'ROUND(age, -1) AS band ,'],
        bug: [1, '(age / ' + w + '.0) * ' + w + ' AS band ,'], why: 'Here the integer division is the point: age / ' + w + ' drops the remainder, so every age falls into its band.' };
    },
    function (r) { // money per month
      var paid = r() < 0.6;
      return { ds: 'app', ask: (paid ? 'Paid' : 'Failed') + ' invoice amounts per month, rounded to 2 decimals.',
        tiles: ['SELECT', 'month ,', 'ROUND(SUM(amount), 2)', 'FROM', 'invoices', 'WHERE', 'paid = ' + (paid ? 1 : 0), 'GROUP BY', 'month'], extra: ['paid = ' + (paid ? 0 : 1), 'ROUND(amount, 2)'],
        bug: [6, 'paid = ' + (paid ? 0 : 1)], why: 'Filter first, then add up the amounts of each month.' };
    },
  ];

  T[12] = [
    function (r) { // rows vs distinct
      var x = pick(r, [['retail', 'orders', 'customer_id', 'orders', 'customers placed them'], ['app', 'events', 'user_id', 'events', 'users triggered them'], ['lab', 'sessions', 'participant_id', 'sessions', 'participants attended them'], ['app', 'invoices', 'member_id', 'invoices', 'members received them']]);
      return { ds: x[0], ask: 'How many ' + x[3] + ' are there, and how many different ' + x[4] + '?', tiles: ['SELECT', 'COUNT(*) ,', 'COUNT(DISTINCT ' + x[2] + ')', 'FROM', x[1]],
        extra: ['COUNT(' + x[2] + ')', 'DISTINCT'], bug: [2, 'COUNT(' + x[2] + ')'], why: 'The same customer appears in many rows: COUNT(DISTINCT) counts each one once.' };
    },
    function (r) { // repeat customers
      var x = pick(r, [['retail', 'orders', 'customer_id', 'Customers', 'orders', [10, 12]], ['app', 'events', 'user_id', 'Users', 'events', [12, 15, 18]], ['lab', 'sessions', 'participant_id', 'Participants', 'sessions', [10, 11]]]), k = pick(r, x[5]);
      return { ds: x[0], ask: x[3] + ' with more than ' + k + ' ' + x[4] + ': ' + x[2] + ' and the count.',
        tiles: ['SELECT', x[2] + ' ,', 'COUNT(*)', 'FROM', x[1], 'GROUP BY', x[2], 'HAVING', 'COUNT(*) > ' + k], extra: ['WHERE', 'COUNT(DISTINCT ' + x[2] + ') > ' + k], bug: [7, 'WHERE'],
        why: 'GROUP BY + HAVING COUNT(*) > n finds the keys that repeat more than n times.' };
    },
    function (r) { // distinct pairs
      var x = pick(r, [['retail', 'customers', 'city', 'segment'], ['app', 'users', 'platform', 'referral'], ['lab', 'participants', 'site', 'group_name']]);
      return { ds: x[0], ask: 'Which ' + x[2] + ' and ' + x[3] + ' combinations exist among ' + x[1] + '? Each pair once.', tiles: ['SELECT', 'DISTINCT', x[2] + ' ,', x[3], 'FROM', x[1]],
        extra: ['COUNT(*)', 'ORDER BY'], why: 'DISTINCT works on the whole row: each combination appears once.' };
    },
    function (r) { // keys seen in more than one category
      var x = pick(r, [['retail', 'orders', 'customer_id', 'channel', 'customers ordered through more than one channel'], ['app', 'events', 'session_id', 'event_name', 'sessions had more than one kind of event'], ['retail', 'orders', 'customer_id', 'store_id', 'customers ordered from more than one store']]);
      return { ds: x[0], ask: 'How many ' + x[4] + '?',
        tiles: ['SELECT', 'COUNT(*)', 'FROM', '(SELECT ' + x[2] + ' FROM ' + x[1] + ' GROUP BY ' + x[2], 'HAVING', 'COUNT(DISTINCT ' + x[3] + ') > 1)'], extra: ['COUNT(' + x[3] + ') > 1)', 'WHERE'],
        bug: [5, 'COUNT(' + x[3] + ') > 1)'], why: 'COUNT(DISTINCT x) > 1 means at least two different values; COUNT(x) > 1 only means two rows.' };
    },
  ];

  T[13] = [
    function (r) { // a conditional count per group
      // [dataset, table, select tile, group by tile, condition, what is counted, what a row is]
      var x = pick(r, [
        ['retail', 'orders', 'store_id ,', 'store_id', "channel = 'delivery'", 'delivery orders', 'store_id', 'orders'],
        ['growth', 'tickets', 'LOWER(priority) AS prio ,', 'prio', 'resolved_at IS NULL', 'open tickets', 'priority (any case)', 'tickets'],
        ['app', 'members', 'plan ,', 'plan', 'cancel_date IS NOT NULL', 'cancelled members', 'plan', 'members'],
        ['app', 'users', 'platform ,', 'platform', "referral = 'friend'", 'friend referrals', 'platform', 'users'],
      ]);
      return { ds: x[0], ask: 'Per ' + x[6] + ': the number of ' + x[7] + ' and the number of ' + x[5] + '.',
        tiles: ['SELECT', x[2], 'COUNT(*) ,', 'SUM(CASE WHEN ' + x[4] + ' THEN 1 ELSE 0 END)', 'FROM', x[1], 'GROUP BY', x[3]],
        extra: ['SUM(CASE WHEN ' + x[4] + ' THEN 0 ELSE 1 END)', 'WHERE'], bug: [3, 'SUM(CASE WHEN ' + x[4] + ' THEN 0 ELSE 1 END)'],
        why: 'SUM(CASE WHEN … THEN 1 ELSE 0 END) counts the rows that match, next to the total, in one pass.' };
    },
    function (r) { // a rate per group
      var x = pick(r, [['app', 'invoices', 'month', 'paid = 1', 'payment success rate per month'], ['growth', 'tickets', 'agent_id', 'csat >= 4', 'share of tickets with CSAT 4 or 5 per agent'], ['retail', 'orders', 'channel', "order_date >= '2025-07-01'", 'share of orders in the second half of 2025 per channel']]);
      return { ds: x[0], ask: 'The ' + x[4] + ', rounded to 3 decimals.', tiles: ['SELECT', x[2] + ' ,', 'ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1.0 ELSE 0 END), 3)', 'FROM', x[1], 'GROUP BY', x[2]],
        extra: ['ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1 ELSE NULL END), 3)', 'HAVING'], bug: [2, 'ROUND(AVG(CASE WHEN ' + x[3] + ' THEN 1 ELSE NULL END), 3)'],
        why: 'The average of 1s and 0s is the share of 1s. With NULL instead of 0, AVG skips the misses and returns 1.' };
    },
  ];

  T[14] = [
    function (r) { // LEFT JOIN … IS NULL
      var x = pick(r, [
        ['retail', 'Customers who never placed an order: customer_id and city.', ['c.customer_id ,', 'c.city'], 'customers c', 'orders o', 'ON o.customer_id = c.customer_id', 'o.order_id'],
        ['app', 'Users who never became members: user_id and platform.', ['u.user_id ,', 'u.platform'], 'users u', 'members m', 'ON m.user_id = u.user_id', 'm.member_id'],
      ]);
      return { ds: x[0], ask: x[1], tiles: ['SELECT'].concat(x[2], ['FROM', x[3], 'LEFT JOIN', x[4], x[5], 'WHERE', x[6] + ' IS NULL']), extra: ['JOIN', x[6] + ' IS NOT NULL'],
        bug: [x[2].length + 3, 'JOIN'], why: 'LEFT JOIN keeps rows with no match and fills the other side with NULL; IS NULL keeps exactly those.' };
    },
    function (r) { // NOT IN
      var x = pick(r, [['app', 'How many users never became members?', 'users', 'user_id', '(SELECT user_id FROM members)'], ['retail', 'How many customers never ordered?', 'customers', 'customer_id', '(SELECT customer_id FROM orders)'], ['app', 'How many members never had a failed payment?', 'members', 'member_id', '(SELECT member_id FROM invoices WHERE paid = 0)']]);
      return { ds: x[0], ask: x[1], tiles: ['SELECT', 'COUNT(*)', 'FROM', x[2], 'WHERE', x[3] + ' NOT IN', x[4]], extra: [x[3] + ' IN', 'COUNT(DISTINCT ' + x[3] + ')'], bug: [5, x[3] + ' IN'],
        why: 'NOT IN keeps the keys that are missing from the other list. (Careful: a NULL in that list makes NOT IN return nothing.)' };
    },
    function (r) { // anti-join per group
      var c = pick(r, CITIES);
      return { ds: 'retail', ask: 'How many customers in each segment have never ordered? Only ' + c + '.',
        tiles: ['SELECT', 'c.segment ,', 'COUNT(*)', 'FROM', 'customers c', 'LEFT JOIN', 'orders o', 'ON o.customer_id = c.customer_id', 'WHERE', 'o.order_id IS NULL', 'AND', "c.city = '" + c + "'", 'GROUP BY', 'c.segment'],
        extra: ['JOIN', 'OR'], bug: [10, 'OR'], why: 'Both conditions must hold: no matching order, and the right city.' };
    },
  ];

  var TOPS = [
    { ds: 'retail', t: 'products', g: 'category', l: 'name', v: 'price', what: 'priciest products per category', desc: true },
    { ds: 'retail', t: 'products', g: 'category', l: 'name', v: 'price', what: 'cheapest products per category', desc: false },
    { ds: 'lab', t: 'participants', g: 'site', l: 'participant_id', v: 'age', what: 'oldest participants per site', desc: true },
    { ds: 'lab', t: 'participants', g: 'group_name', l: 'participant_id', v: 'age', what: 'youngest participants per group', desc: false },
    { ds: 'app', t: 'users', g: 'platform', l: 'user_id', v: 'signup_date', what: 'newest users per platform', desc: true },
  ];
  T[15] = [
    function (r) {
      var x = pick(r, TOPS), n = pick(r, [1, 2, 3]);
      return { ds: x.ds, ask: 'The ' + (n === 1 ? '' : n + ' ') + x.what.replace(/s per/, n === 1 ? ' per' : 's per') + ': ' + x.g + ', ' + x.l + ' and ' + x.v + '.',
        tiles: ['WITH r AS', '(SELECT ' + x.g + ' , ' + x.l + ' , ' + x.v + ' ,', 'ROW_NUMBER() OVER (PARTITION BY ' + x.g + ' ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn', 'FROM ' + x.t + ')',
          'SELECT', x.g + ' ,', x.l + ' ,', x.v, 'FROM', 'r', 'WHERE', 'rn <= ' + n],
        extra: ['ROW_NUMBER() OVER (ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn', 'rn = ' + (n + 1)], bug: [2, 'ROW_NUMBER() OVER (ORDER BY ' + x.v + (x.desc ? ' DESC' : '') + ') AS rn'],
        why: 'PARTITION BY restarts the numbering in every group, so rn <= N keeps the top N of each group.' };
    },
    function (r) { // best per group via aggregates
      var x = pick(r, [['retail', 'orders', 'channel', 'customer_id', 'customer with the most orders per channel']]);
      return { ds: x[0], ask: 'The ' + x[4] + ': channel, customer_id and n (ties may show more than one).',
        tiles: ['WITH c AS', '(SELECT channel , customer_id , COUNT(*) AS n FROM orders GROUP BY channel , customer_id)', ', r AS', '(SELECT * , RANK() OVER (PARTITION BY channel ORDER BY n DESC) AS rk FROM c)',
          'SELECT', 'channel ,', 'customer_id ,', 'n', 'FROM', 'r', 'WHERE', 'rk = 1'],
        extra: ['rk > 1', 'MAX(n)'], bug: [11, 'rk > 1'], why: 'Count per pair first, then rank inside each channel: RANK keeps ties.' };
    },
  ];

  var STEPS = ['open_app', 'view_menu', 'add_to_cart', 'checkout', 'purchase'];
  T[16] = [
    function (r) { // a funnel
      var a = Math.floor(r() * 3), b = a + 1 + Math.floor(r() * (4 - a)), s1 = STEPS[a], s2 = STEPS[Math.min(b, 4)];
      return { ds: 'app', ask: 'A funnel step: how many different users did ' + s1 + ', and how many did ' + s2 + '?',
        tiles: ['SELECT', "COUNT(DISTINCT CASE WHEN event_name = '" + s1 + "' THEN user_id END) AS step1 ,", "COUNT(DISTINCT CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2", 'FROM', 'events'],
        extra: ["COUNT(CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2", 'GROUP BY'], bug: [2, "COUNT(CASE WHEN event_name = '" + s2 + "' THEN user_id END) AS step2"],
        why: 'A funnel counts people, not events: DISTINCT counts each user once per step.' };
    },
    function (r) { // A/B conversion
      var k = pick(r, [[1, 'the welcome email test'], [4, 'the Black Friday subject line test']]);
      return { ds: 'growth', ask: 'Conversion rate (%) per variant in ' + k[1] + ' (campaign ' + k[0] + '), one decimal: variant and rate.',
        tiles: ['SELECT', 'a.variant ,', 'ROUND(100.0 * COUNT(c.user_id) / COUNT(*), 1) AS rate', 'FROM', 'assignments a', 'LEFT JOIN', 'conversions c', 'ON c.user_id = a.user_id AND c.campaign_id = a.campaign_id',
          'WHERE', 'a.campaign_id = ' + k[0], 'GROUP BY', 'a.variant'],
        extra: ['JOIN', 'ON c.user_id = a.user_id'], bug: [5, 'JOIN'], why: 'LEFT JOIN keeps everyone assigned; COUNT(c.user_id) counts only the ones who converted.' };
    },
    function (r) { // a rate per segment
      var g = pick(r, [['u.platform', 'platform'], ['u.referral', 'referral source'], ['u.city', 'city']]);
      return { ds: 'app', ask: 'Purchase rate per ' + g[1] + ': the % of users with at least one purchase, one decimal.',
        tiles: ['SELECT', g[0] + ' ,', "ROUND(100.0 * COUNT(DISTINCT CASE WHEN e.event_name = 'purchase' THEN e.user_id END) / COUNT(DISTINCT u.user_id), 1) AS rate",
          'FROM', 'users u', 'LEFT JOIN', 'events e', 'ON e.user_id = u.user_id', 'GROUP BY', g[0]],
        extra: ["ROUND(100.0 * COUNT(CASE WHEN e.event_name = 'purchase' THEN 1 END) / COUNT(*), 1) AS rate", 'WHERE'], bug: [2, "ROUND(100.0 * COUNT(CASE WHEN e.event_name = 'purchase' THEN 1 END) / COUNT(*), 1) AS rate"],
        why: 'Divide distinct buyers by distinct users: counting events instead mixes up people and clicks.' };
    },
  ];

  Q.LEVELS = 16;
  Q.templates = function (n) { return T[n] || []; };

  // One puzzle for level n from a seed. About one in four starts as a broken query to fix.
  Q.make = function (n, seed) {
    var r = rng(seed * 31 + n * 7919), list = T[n], t = list[Math.floor(r() * list.length)](r), fix = null;
    if (t.bug && r() < 0.28) {
      fix = t.tiles.slice();
      fix[t.bug[0]] = t.bug[1];
      if (fix.join(' ') === t.tiles.join(' ')) fix = null;
    }
    var extra = t.extra.filter(function (x, i, a) { return a.indexOf(x) === i && (!fix || x !== t.bug[1]) && t.tiles.indexOf(x) < 0; });
    return { id: 'g' + n + '-' + seed, gen: true, lv: n, ds: t.ds, ask: (fix ? 'Fix the bug: ' : '') + t.ask, tiles: t.tiles, fix: fix, extra: extra, sql: t.tiles.join(' '), why: t.why };
  };
})();
