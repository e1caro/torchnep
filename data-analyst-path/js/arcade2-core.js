/* Four more arcade games, logic only (no DOM, tested in Node). Each round makes fresh puzzles from a seed.
 *  - Formula X-ray (Excel): tap the cells a formula really uses.
 *  - Pandas pipeline (Python): chain operation cards until the table matches the target.
 *  - Slicer safe (Power BI): set the slicers so the KPI card shows the secret number.
 *  - Pill match (Tableau): put the right pills on Rows and Columns to rebuild a chart. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var X = (DA.arcade2 = {});

  X.ROUND = 5;
  X.GAMES = {
    xray: { icon: '🩻', name: 'Formula X-ray', tool: 'Excel', stat: 'xrayBest', plays: 'xrayGames', blurb: 'Tap the cells a formula really uses, then see what it returns.' },
    pipe: { icon: '🐼', name: 'Pandas pipeline', tool: 'Python', stat: 'pipeBest', plays: 'pipeGames', blurb: 'Chain operation cards until your table matches the target.' },
    safe: { icon: '🔐', name: 'Slicer safe', tool: 'Power BI', stat: 'safeBest', plays: 'safeGames', blurb: 'Set the slicers so the KPI card shows the secret number.' },
    pills: { icon: '💊', name: 'Pill match', tool: 'Tableau', stat: 'pillBest', plays: 'pillGames', blurb: 'Drop blue and green pills on the shelves to rebuild a chart.' },
  };

  X.rng = function (seed) { return DA.gen.util.rng(seed >>> 0); };
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  X.shuffle = shuffle;
  // Stars from attempts against par: on par 3, one over 2, more 1.
  X.stars = function (used, par) { return used <= par ? 3 : used === par + 1 ? 2 : 1; };

  var CITIES = ['London', 'Madrid', 'Berlin', 'Paris', 'Lisbon'], CHANNELS = ['in_store', 'pickup', 'delivery'], PRICES = [2.5, 2.8, 3.5, 4.2, 7.5];
  function miniRows(r, n) {
    var cities = shuffle(r, CITIES).slice(0, 3), rows = [];
    for (var i = 0; i < n; i++) rows.push({ city: pick(r, cities), channel: pick(r, CHANNELS), qty: 1 + Math.floor(r() * 5), price: pick(r, PRICES) });
    return rows;
  }
  X.miniRows = miniRows;

  /* ================================================================ Formula X-ray */

  // A 6-row sheet: A city, B channel, C qty in rows 2 to 7. The answer is the set of cells the formula reads to get its result.
  X.xray = function (seed) {
    var r = X.rng(seed), rows = miniRows(r, 6), at = function (i) { return i + 2; };
    var kinds = ['sum', 'countif', 'sumif', 'sumifs', 'countgt', 'avgif', 'countifs'], kind = pick(r, kinds);
    var row = pick(r, rows), city = row.city, ch = row.channel, n = 1 + Math.floor(r() * 3), f, ask, cells = [], val;
    function idx(test) { var o = []; rows.forEach(function (x, i) { if (test(x)) o.push(i); }); return o; }
    if (kind === 'sum') {
      var a = Math.floor(r() * 4), b = a + 1 + Math.floor(r() * (5 - a));
      f = '=SUM(C' + at(a) + ':C' + at(b) + ')'; ask = 'Tap the cells this formula adds up.';
      for (var i = a; i <= b; i++) cells.push('C' + at(i));
      val = rows.slice(a, b + 1).reduce(function (s, x) { return s + x.qty; }, 0);
    } else if (kind === 'countif') {
      f = '=COUNTIF(A2:A7, "' + city + '")'; ask = 'Tap the cells this formula counts.';
      var ci = idx(function (x) { return x.city === city; }); cells = ci.map(function (i) { return 'A' + at(i); }); val = ci.length;
    } else if (kind === 'sumif') {
      f = '=SUMIF(A2:A7, "' + city + '", C2:C7)'; ask = 'Tap the cells this formula adds up.';
      var si = idx(function (x) { return x.city === city; }); cells = si.map(function (i) { return 'C' + at(i); });
      val = si.reduce(function (s, i) { return s + rows[i].qty; }, 0);
    } else if (kind === 'sumifs') {
      f = '=SUMIFS(C2:C7, A2:A7, "' + city + '", B2:B7, "' + ch + '")'; ask = 'Tap the cells this formula adds up.';
      var bi = idx(function (x) { return x.city === city && x.channel === ch; }); cells = bi.map(function (i) { return 'C' + at(i); });
      val = bi.reduce(function (s, i) { return s + rows[i].qty; }, 0);
    } else if (kind === 'countgt') {
      var lim = Math.min(n, row.qty - 1);
      if (lim < 1) lim = 0;
      f = '=COUNTIF(C2:C7, ">' + lim + '")'; ask = 'Tap the cells this formula counts.';
      var gi = idx(function (x) { return x.qty > lim; }); cells = gi.map(function (i) { return 'C' + at(i); }); val = gi.length;
    } else if (kind === 'avgif') {
      f = '=AVERAGEIF(B2:B7, "' + ch + '", C2:C7)'; ask = 'Tap the cells this formula averages.';
      var ai = idx(function (x) { return x.channel === ch; }); cells = ai.map(function (i) { return 'C' + at(i); });
      val = ai.reduce(function (s, i) { return s + rows[i].qty; }, 0) / ai.length;
    } else {
      var low = Math.min(n, row.qty);
      f = '=COUNTIFS(B2:B7, "' + ch + '", C2:C7, ">=' + low + '")'; ask = 'Tap the B cells of the rows this formula counts.';
      var ki = idx(function (x) { return x.channel === ch && x.qty >= low; }); cells = ki.map(function (i) { return 'B' + at(i); }); val = ki.length;
    }
    return { kind: kind, rows: rows, formula: f, ask: ask, cells: cells, value: Math.round(val * 100) / 100 };
  };
  // Compare the tapped cells with the answer: which were missed and which were extra.
  X.xrayCheck = function (p, tapped) {
    var want = {}, got = {}, missed = [], extra = [];
    p.cells.forEach(function (c) { want[c] = 1; });
    tapped.forEach(function (c) { got[c] = 1; });
    p.cells.forEach(function (c) { if (!got[c]) missed.push(c); });
    tapped.forEach(function (c) { if (!want[c]) extra.push(c); });
    return { ok: !missed.length && !extra.length, missed: missed, extra: extra };
  };

  /* ================================================================ Pandas pipeline */

  function csvOf(rows) { return 'city,channel,qty,price\n' + rows.map(function (x) { return [x.city, x.channel, x.qty, x.price].join(','); }).join('\n') + '\n'; }
  // Each card is one line "t = ...". The reference cards, in order, turn the start table into the target.
  X.pipe = function (seed) {
    var r = X.rng(seed), rows = miniRows(r, 7), kind = pick(r, ['bycity', 'filter', 'top', 'revenue', 'count']), cards, ref, goal;
    var some = pick(r, rows), ch = some.channel, n = 1 + Math.floor(r() * 3);
    if (kind === 'bycity') {
      goal = 'Total qty per city, biggest first.';
      ref = ['t = t.groupby("city")["qty"].sum()', 't = t.sort_values(ascending=False)'];
      cards = ref.concat(['t = t.groupby("city")["qty"].mean()', 't = t.sort_values()', 't = t.head(2)']);
    } else if (kind === 'filter') {
      goal = 'Only the ' + ch + ' lines, then total qty per city.';
      ref = ['t = t[t["channel"] == "' + ch + '"]', 't = t.groupby("city")["qty"].sum()'];
      var other = pick(r, CHANNELS.filter(function (c) { return c !== ch; }));
      cards = ref.concat(['t = t[t["channel"] == "' + other + '"]', 't = t.groupby("city")["qty"].count()', 't = t.sort_values()']);
    } else if (kind === 'top') {
      goal = 'The 2 lines with the most qty, most first.';
      ref = ['t = t.sort_values("qty", ascending=False)', 't = t.head(2)'];
      cards = ref.concat(['t = t.sort_values("qty")', 't = t.head(3)', 't = t.tail(2)']);
    } else if (kind === 'revenue') {
      goal = 'Revenue (qty × price) per city.';
      ref = ['t = t.assign(revenue=t["qty"] * t["price"])', 't = t.groupby("city")["revenue"].sum()'];
      cards = ref.concat(['t = t.assign(revenue=t["qty"] + t["price"])', 't = t.groupby("city")["qty"].sum()', 't = t.head(2)']);
    } else {
      goal = 'Lines with qty of ' + n + ' or more, counted per channel.';
      ref = ['t = t[t["qty"] >= ' + n + ']', 't = t["channel"].value_counts()'];
      cards = ref.concat(['t = t[t["qty"] > ' + n + ']', 't = t.groupby("channel")["qty"].sum()', 't = t.sort_values("qty")']);
    }
    return { kind: kind, rows: rows, csv: csvOf(rows), goal: goal, ref: ref, cards: shuffle(r, cards), par: ref.length };
  };
  X.pipeCode = function (lines) { return ['t = df'].concat(lines).concat(['result = t']).join('\n'); };
  X.pipeRun = function (p, lines) {
    var P = DA.python;
    return P.run(X.pipeCode(lines), { data: { df: P.readCsvText(p.csv) } });
  };
  X.pipeTarget = function (p) { return X.pipeRun(p, p.ref).env.result; };
  X.pipeCheck = function (p, lines) {
    var got = X.pipeRun(p, lines);
    if (!got.ok) return { ok: false, error: got.error, line: got.line };
    return { ok: DA.python.compareResult(got.env.result, X.pipeTarget(p), true).ok, value: got.env.result };
  };

  /* ================================================================ Slicer safe */

  var SLICERS = {
    city: { col: 'store_city', label: 'City', values: CITIES.slice().sort() },
    channel: { col: 'channel', label: 'Channel', values: CHANNELS.slice() },
    category: { col: 'category', label: 'Category', values: ['Bakery', 'Coffee', 'Food', 'Tea'] },
  };
  X.SLICERS = SLICERS;
  var MEASURES = [
    { f: 'SUM(Sales[qty])', fmt: 'int', note: 'Every slicer filters the sum.' },
    { f: 'DISTINCTCOUNT(Sales[order_id])', fmt: 'int', note: 'Every slicer filters the orders it counts.' },
    { f: 'CALCULATE(SUM(Sales[qty]), ALL(Sales[channel]))', fmt: 'int', note: 'ALL(Sales[channel]) removes the channel filter, so the Channel slicer does nothing here.' },
    { f: 'CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery")', fmt: 'int', note: 'The CALCULATE filter on channel replaces the slicer, so the Channel slicer does nothing here.' },
    { f: 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales[store_city])))', fmt: 'pct', note: 'A share of all cities: the City slicer moves the top of the fraction only.' },
    { f: 'AVERAGE(Sales[unit_price])', fmt: 'money', note: 'An average price changes with the mix of products the slicers leave.' },
    { f: 'SUMX(Sales, Sales[qty] * Sales[unit_price])', fmt: 'money', note: 'Revenue: every slicer filters the rows SUMX goes through.' },
  ];
  X.MEASURES = MEASURES;
  var model = null;
  X.model = function () { return model || (model = DA.bi.retailModel()); };
  X.safeValue = function (p, sel) {
    var filters = {};
    p.slicers.forEach(function (k) { var v = sel[k]; if (v) filters['Sales|' + SLICERS[k].col] = function (x) { return x === v; }; });
    return DA.bi.evalDax(p.measure.f, X.model(), filters);
  };
  X.fmt = function (v, kind) {
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '(blank)';
    if (kind === 'pct') return (Math.round(v * 1000) / 10).toFixed(1) + '%';
    if (kind === 'money') return (Math.round(v * 100) / 100).toFixed(2);
    return String(Math.round(v));
  };
  X.safe = function (seed) {
    var r = X.rng(seed);
    for (var tries = 0; tries < 50; tries++) {
      var m = pick(r, MEASURES), keys = shuffle(r, Object.keys(SLICERS)).slice(0, 2), secret = {};
      keys.forEach(function (k) { secret[k] = r() < 0.8 ? pick(r, SLICERS[k].values) : null; });
      var p = { measure: m, slicers: keys, secret: secret };
      var target = X.fmt(X.safeValue(p, secret), m.fmt), start = X.fmt(X.safeValue(p, {}), m.fmt);
      if (target !== start && target !== '(blank)') {
        p.target = target;
        p.par = 2 + X.safeMinMoves(p);
        return p;
      }
    }
    return null;
  };
  // The fewest slicers to change from "All" to reach the target (some slicers do nothing for some measures).
  X.safeMinMoves = function (p) {
    var a = p.slicers[0], b = p.slicers[1], best = 9;
    [null].concat(SLICERS[a].values).forEach(function (va) {
      [null].concat(SLICERS[b].values).forEach(function (vb) {
        var sel = {}; sel[a] = va; sel[b] = vb;
        if (X.fmt(X.safeValue(p, sel), p.measure.fmt) === p.target) best = Math.min(best, (va ? 1 : 0) + (vb ? 1 : 0));
      });
    });
    return best;
  };
  X.safeCheck = function (p, sel) { return X.fmt(X.safeValue(p, sel), p.measure.fmt) === p.target; };

  /* ================================================================ Pill match */

  X.DIMS = [['Sales[store_city]', 'store_city'], ['Sales[channel]', 'channel'], ['Sales[category]', 'category'], ['Customers[segment]', 'segment']];
  X.MEAS = [['SUM([qty])', 'SUM(qty)', 'int'], ['AVG([unit_price])', 'AVG(unit_price)', 'money'], ['COUNTD([order_id])', 'COUNTD(order_id)', 'int'],
    ['COUNTD([customer_id])', 'COUNTD(customer_id)', 'int'], ['SUM([qty] * [unit_price])', 'SUM(revenue)', 'money']];
  X.chart = function (dim, meas, sort) {
    var b = DA.bi.breakdown(X.model(), 'tableau', meas, dim), rows = b.rows.map(function (x) { return { member: x.member, value: x.value }; });
    if (sort === 'desc') rows.sort(function (a, c) { return c.value - a.value; });
    if (sort === 'asc') rows.sort(function (a, c) { return a.value - c.value; });
    return rows;
  };
  X.pills = function (seed) {
    var r = X.rng(seed), d = pick(r, X.DIMS), m = pick(r, X.MEAS), sort = pick(r, ['none', 'desc', 'asc']);
    return { dim: d[0], meas: m[0], sort: sort, fmt: m[2], rows: X.chart(d[0], m[0], sort) };
  };
  X.pillCheck = function (p, dim, meas, sort) {
    if (!dim || !meas) return { ok: false, why: 'Put one blue pill on Rows and one green pill on Columns.' };
    var got = X.chart(dim, meas, sort || 'none');
    var same = got.length === p.rows.length && got.every(function (x, i) { return x.member === p.rows[i].member && Math.abs(x.value - p.rows[i].value) < 1e-9; });
    if (same) return { ok: true };
    var sameSet = got.length === p.rows.length && got.every(function (x) { return p.rows.some(function (y) { return y.member === x.member && Math.abs(x.value - y.value) < 1e-9; }); });
    if (sameSet) return { ok: false, why: 'Right bars, wrong order: look at the Sort button.' };
    if (dim !== p.dim) return { ok: false, why: 'The labels down the side are different: try another blue pill.' };
    return { ok: false, why: 'The labels match, but the bar lengths do not: try another green pill.' };
  };
})();
