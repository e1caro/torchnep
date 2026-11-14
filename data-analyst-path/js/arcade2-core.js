/* Four more arcade games, logic only (no DOM, tested in Node). Each puzzle is made from a seed and a level
 * (js/data/arcade-worlds.js), so every level has endless puzzles and later levels bring new concepts.
 *  - Formula X-ray (Excel): tap the cells a formula really uses.
 *  - Pandas pipeline (Python): chain operation cards until the table matches the target.
 *  - Slicer safe (Power BI): set the slicers so the KPI card shows the secret number.
 *  - Pill match (Tableau): put the right pills on the shelves to rebuild a chart.
 * Called without a level, each generator mixes its first kinds (the original free-play rounds). */
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
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  X.shuffle = shuffle;
  // Stars from attempts against par: on par 3, one over 2, more 1.
  X.stars = function (used, par) { return used <= par ? 3 : used === par + 1 ? 2 : 1; };
  function params(lv, dflt) { return (lv && lv.p) || dflt; }

  var CITIES = ['London', 'Madrid', 'Berlin', 'Paris', 'Lisbon'], CHANNELS = ['in_store', 'pickup', 'delivery'], PRICES = [2.5, 2.8, 3.5, 4.2, 7.5];
  function miniRows(r, n, three) {
    var cities = three === false ? CITIES.slice() : shuffle(r, CITIES).slice(0, 3), rows = [];
    for (var i = 0; i < n; i++) rows.push({ city: pick(r, cities), channel: pick(r, CHANNELS), qty: 1 + Math.floor(r() * 5), price: pick(r, PRICES) });
    return rows;
  }
  X.miniRows = miniRows;

  /* ================================================================ Formula X-ray */

  var COLS = { A: 'city', B: 'channel', C: 'qty', D: 'price' };
  X.COLS = COLS;
  function num(v) { return typeof v === 'number'; }

  // A small sheet: A city, B channel, C qty, D price in rows 2 to n+1 (F1 holds a limit for some formulas).
  // The answer is the set of cells the formula reads to get its result (or, for lookups, the cell it returns).
  X.xray = function (seed, lv) {
    var p = params(lv, { kinds: ['sum', 'countif', 'sumif', 'sumifs', 'countgt', 'avgif', 'countifs'], rows: 6 });
    var r = X.rng(seed), kind = pick(r, p.kinds), rows = miniRows(r, p.rows, !/wild|xlookup|vlookup|indexmatch/.test(kind));
    if (p.blanks) rows.forEach(function (x, i) { var k = r(); if (i > 0 && k < 0.22) x.qty = null; else if (i > 0 && k < 0.36) x.qty = 'n/a'; });
    var last = p.rows + 1, at = function (i) { return i + 2; }, row = pick(r, rows), city = row.city, ch = row.channel;
    var f, ask = 'Tap the cells this formula adds up.', cells = [], val, f1 = null;
    function idx(test) { var o = []; rows.forEach(function (x, i) { if (test(x)) o.push(i); }); return o; }
    function refs(col, list) { return list.map(function (i) { return col + at(i); }); }
    function sumOf(list, key) { return list.reduce(function (s, i) { return s + (num(rows[i][key]) ? rows[i][key] : 0); }, 0); }
    function rng2(col) { return col + '2:' + col + last; }
    var numCol = pick(r, ['C', 'C', 'D']), key = COLS[numCol];
    if (kind === 'sum' || kind === 'avg') {
      var a = Math.floor(r() * (p.rows - 2)), b = a + 1 + Math.floor(r() * (p.rows - 1 - a));
      f = '=' + (kind === 'sum' ? 'SUM' : 'AVERAGE') + '(' + numCol + at(a) + ':' + numCol + at(b) + ')';
      if (kind === 'avg') ask = 'Tap the cells this formula averages.';
      var li = []; for (var i = a; i <= b; i++) li.push(i);
      cells = refs(numCol, li); val = sumOf(li, key) / (kind === 'avg' ? li.length : 1);
    } else if (kind === 'sum2') {
      var a1 = Math.floor(r() * 2), b1 = a1 + Math.floor(r() * 2), a2 = b1 + 2 + Math.floor(r() * 1), b2 = Math.min(p.rows - 1, a2 + Math.floor(r() * 2));
      f = '=SUM(' + numCol + at(a1) + ':' + numCol + at(b1) + ', ' + numCol + at(a2) + ':' + numCol + at(b2) + ')';
      var l2 = []; for (var j = a1; j <= b1; j++) l2.push(j); for (j = a2; j <= b2; j++) l2.push(j);
      cells = refs(numCol, l2); val = sumOf(l2, key);
    } else if (kind === 'max' || kind === 'min' || kind === 'large2') {
      // a part of the column, so the range matters as much as the function
      var lo = Math.floor(r() * 2), hi = p.rows - 1 - Math.floor(r() * 2), inr = function (i) { return i >= lo && i <= hi; };
      var vals = rows.filter(function (x, i) { return inr(i); }).map(function (x) { return x[key]; }), sorted = vals.slice().sort(function (x, y) { return y - x; });
      val = kind === 'max' ? sorted[0] : kind === 'min' ? sorted[sorted.length - 1] : sorted[1];
      var rg = numCol + at(lo) + ':' + numCol + at(hi);
      f = kind === 'large2' ? '=LARGE(' + rg + ', 2)' : '=' + kind.toUpperCase() + '(' + rg + ')';
      ask = 'Tap every cell in the range that holds the value this formula returns.';
      cells = refs(numCol, idx(function (x) { return x[key] === val; }).filter(inr));
    } else if (kind === 'count' || kind === 'counta' || kind === 'countblank') {
      var c0 = Math.floor(r() * 2), c1 = p.rows - 1 - Math.floor(r() * 2), inc = function (i) { return i >= c0 && i <= c1; };
      f = '=' + kind.toUpperCase() + '(C' + at(c0) + ':C' + at(c1) + ')'; ask = 'Tap the cells this formula counts.';
      var ci = idx(function (x) { return kind === 'count' ? num(x.qty) : kind === 'counta' ? x.qty !== null : x.qty === null; }).filter(inc);
      if (!ci.length) { rows[c0 + 1].qty = kind === 'count' ? 2 : kind === 'counta' ? 'n/a' : null; ci = [c0 + 1]; }
      cells = refs('C', ci); val = ci.length;
    } else if (kind === 'countif' || kind === 'countne') {
      if (kind === 'countif') { f = '=COUNTIF(A2:A' + last + ', "' + city + '")'; cells = refs('A', idx(function (x) { return x.city === city; })); }
      else { f = '=COUNTIF(B2:B' + last + ', "<>' + ch + '")'; cells = refs('B', idx(function (x) { return x.channel !== ch; })); }
      ask = 'Tap the cells this formula counts.'; val = cells.length;
    } else if (kind === 'countgt' || kind === 'countge') {
      var lim = Math.max(1, Math.min(4, row.qty - (kind === 'countgt' ? 1 : 0))), op = kind === 'countgt' ? '>' : '>=';
      f = '=COUNTIF(C2:C' + last + ', "' + op + lim + '")'; ask = 'Tap the cells this formula counts.';
      cells = refs('C', idx(function (x) { return op === '>' ? x.qty > lim : x.qty >= lim; })); val = cells.length;
    } else if (kind === 'sumif' || kind === 'sumifne') {
      var si = kind === 'sumif' ? idx(function (x) { return x.city === city; }) : idx(function (x) { return x.channel !== ch; });
      f = kind === 'sumif' ? '=SUMIF(A2:A' + last + ', "' + city + '", ' + rng2(numCol) + ')' : '=SUMIF(B2:B' + last + ', "<>' + ch + '", ' + rng2(numCol) + ')';
      cells = refs(numCol, si); val = sumOf(si, key);
    } else if (kind === 'avgif') {
      var ai = idx(function (x) { return x.channel === ch; });
      f = '=AVERAGEIF(B2:B' + last + ', "' + ch + '", ' + rng2(numCol) + ')'; ask = 'Tap the cells this formula averages.';
      cells = refs(numCol, ai); val = sumOf(ai, key) / ai.length;
    } else if (kind === 'countifs') {
      if (r() < 0.5) {
        var low = Math.max(1, Math.min(4, row.qty - Math.floor(r() * 2)));
        f = '=COUNTIFS(B2:B' + last + ', "' + ch + '", C2:C' + last + ', ">=' + low + '")'; ask = 'Tap the B cells of the rows this formula counts.';
        cells = refs('B', idx(function (x) { return x.channel === ch && x.qty >= low; }));
      } else {
        f = '=COUNTIFS(A2:A' + last + ', "' + city + '", B2:B' + last + ', "' + ch + '")'; ask = 'Tap the A cells of the rows this formula counts.';
        cells = refs('A', idx(function (x) { return x.city === city && x.channel === ch; }));
      }
      val = cells.length;
    } else if (kind === 'sumifs' || kind === 'sumifsnum') {
      var bi;
      if (kind === 'sumifs') { f = '=SUMIFS(' + rng2(numCol) + ', A2:A' + last + ', "' + city + '", B2:B' + last + ', "' + ch + '")'; bi = idx(function (x) { return x.city === city && x.channel === ch; }); }
      else {
        var pr = row.price;
        f = '=SUMIFS(C2:C' + last + ', A2:A' + last + ', "' + city + '", D2:D' + last + ', ">=' + pr + '")'; numCol = 'C'; key = 'qty';
        bi = idx(function (x) { return x.city === city && x.price >= pr; });
      }
      cells = refs(numCol, bi); val = sumOf(bi, key);
    } else if (kind === 'wild' || kind === 'wildsum') {
      var pats = [['L*', function (c) { return c[0] === 'L'; }], ['*n', function (c) { return /n$/.test(c); }], ['*a*', function (c) { return /a/.test(c); }], ['M*', function (c) { return c[0] === 'M'; }], ['?a*', function (c) { return c[1] === 'a'; }], ['*on', function (c) { return /on$/.test(c); }]];
      var ok = pats.filter(function (pt) { var n = rows.filter(function (x) { return pt[1](x.city); }).length; return n > 0 && n < rows.length; }), pt = pick(r, ok.length ? ok : pats);
      var wi = idx(function (x) { return pt[1](x.city); });
      if (kind === 'wild') { f = '=COUNTIF(A2:A' + last + ', "' + pt[0] + '")'; ask = 'Tap the cells this formula counts.'; cells = refs('A', wi); val = wi.length; }
      else { f = '=SUMIF(A2:A' + last + ', "' + pt[0] + '", ' + rng2(numCol) + ')'; cells = refs(numCol, wi); val = sumOf(wi, key); }
    } else if (kind === 'cellcrit' || kind === 'cellsum') {
      var cop = pick(r, ['>=', '>', '<=']);
      f1 = cop === '>' ? Math.max(1, row.qty - 1) : row.qty;
      var gi = idx(function (x) { return cop === '>=' ? x.qty >= f1 : cop === '>' ? x.qty > f1 : x.qty <= f1; });
      if (!gi.length) { f1 = row.qty; cop = '>='; gi = idx(function (x) { return x.qty >= f1; }); }
      if (kind === 'cellcrit') { f = '=COUNTIF(C2:C' + last + ', "' + cop + '"&F1)'; ask = 'Tap the cells this formula counts. F1 holds ' + f1 + '.'; cells = refs('C', gi); val = gi.length; }
      else { f = '=SUMIF(C2:C' + last + ', "' + cop + '"&F1, D2:D' + last + ')'; ask = 'Tap the cells this formula adds up. F1 holds ' + f1 + '.'; cells = refs('D', gi); val = sumOf(gi, 'price'); }
    } else if (kind === 'xlookup' || kind === 'vlookup' || kind === 'indexmatch') {
      // look for a city that repeats when there is one, so the first-match rule matters
      var counts = {}; rows.forEach(function (x) { counts[x.city] = (counts[x.city] || 0) + 1; });
      var reps = Object.keys(counts).filter(function (c) { return counts[c] > 1; }), look = reps.length && r() < 0.8 ? pick(r, reps) : city;
      var first = idx(function (x) { return x.city === look; })[0], retCol = pick(r, ['B', 'C', 'D']);
      if (kind === 'xlookup') f = '=XLOOKUP("' + look + '", A2:A' + last + ', ' + rng2(retCol) + ')';
      else if (kind === 'vlookup') f = '=VLOOKUP("' + look + '", A2:D' + last + ', ' + ('ABCD'.indexOf(retCol) + 1) + ', FALSE)';
      else f = '=INDEX(' + rng2(retCol) + ', MATCH("' + look + '", A2:A' + last + ', 0))';
      ask = 'Tap the cell this formula returns.';
      cells = [retCol + at(first)]; val = rows[first][COLS[retCol]];
    } else if (kind === 'filter') {
      var fi = idx(function (x) { return x.channel === ch; });
      f = '=FILTER(' + rng2(numCol) + ', B2:B' + last + '="' + ch + '")'; ask = 'Tap the cells this formula returns (it spills a list).';
      cells = refs(numCol, fi); val = fi.map(function (i) { return rows[i][key]; }).join(', ');
    } else {
      var spi = idx(function (x) { return x.city === city && x.channel === ch; });
      f = '=SUMPRODUCT((A2:A' + last + '="' + city + '")*(B2:B' + last + '="' + ch + '")*' + rng2(numCol) + ')';
      cells = refs(numCol, spi); val = sumOf(spi, key);
    }
    return { kind: kind, rows: rows, formula: f, ask: ask, cells: cells, value: typeof val === 'number' ? Math.round(val * 100) / 100 : val, f1: f1 };
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

  var REGIONS = { London: 'UK', Madrid: 'Spain', Berlin: 'Germany', Paris: 'France', Lisbon: 'Portugal' };
  X.REGIONS_CSV = 'city,country\n' + Object.keys(REGIONS).map(function (c) { return c + ',' + REGIONS[c]; }).join('\n') + '\n';
  function csvOf(rows) { return 'city,channel,qty,price\n' + rows.map(function (x) { return [x.city, x.channel, x.qty === null ? '' : x.qty, x.price].join(','); }).join('\n') + '\n'; }
  function L(s) { return 't = ' + s; }

  // Each kind: a goal, the reference cards in order, and tempting wrong cards.
  function pipeKind(kind, r, rows) {
    var big = rows.filter(function (x) { return x.qty >= 2; }), some = pick(r, big.length ? big : rows), ch = some.channel;
    var other = pick(r, CHANNELS.filter(function (c) { return c !== ch; })), n = Math.max(1, Math.min(some.qty, 2 + Math.floor(r() * 2)));
    var cities = uniq(rows.map(function (x) { return x.city; })), c1 = cities[0], c2 = cities[1] || cities[0], k = pick(r, [2, 3]);
    var col = pick(r, ['qty', 'price']), prs = uniq(rows.map(function (x) { return x.price; })).sort(function (a, b) { return a - b; }), pr = prs.length > 1 ? pick(r, prs.slice(1)) : prs[0];
    switch (kind) {
      case 'sorttop': return { goal: 'The 3 lines with the most qty, most first.', ref: [L('t.sort_values("qty", ascending=False)'), L('t.head(3)')],
        decoys: [L('t.sort_values("qty")'), L('t.head(2)'), L('t.tail(3)'), L('t.sort_values("price", ascending=False)')] };
      case 'sortlow': return { goal: 'The 2 cheapest lines, cheapest first.', ref: [L('t.sort_values("price")'), L('t.head(2)')],
        decoys: [L('t.sort_values("price", ascending=False)'), L('t.tail(2)'), L('t.head(3)'), L('t.sort_values("qty")')] };
      case 'cols': return { goal: 'Only the city and qty columns, highest qty first.', ref: [L('t[["city", "qty"]]'), L('t.sort_values("qty", ascending=False)')],
        decoys: [L('t[["city", "price"]]'), L('t[["qty"]]'), L('t.sort_values("qty")'), L('t.head(3)')] };
      case 'nlargest': return { goal: 'The ' + k + ' lines with the highest ' + col + '.', ref: [L('t.nlargest(' + k + ', "' + col + '")')],
        decoys: [L('t.nsmallest(' + k + ', "' + col + '")'), L('t.head(' + k + ')'), L('t.sort_values("' + col + '")'), L('t.tail(' + k + ')')] };
      case 'nsmallest': return { goal: 'The ' + k + ' lines with the lowest ' + col + '.', ref: [L('t.nsmallest(' + k + ', "' + col + '")')],
        decoys: [L('t.nlargest(' + k + ', "' + col + '")'), L('t.head(' + k + ')'), L('t.sort_values("' + col + '", ascending=False)'), L('t.tail(' + k + ')')] };
      case 'cols3': return { goal: 'City and price of the 3 dearest lines, dearest first.', ref: [L('t[["city", "price"]]'), L('t.sort_values("price", ascending=False)'), L('t.head(3)')],
        decoys: [L('t[["city", "qty"]]'), L('t.sort_values("price")'), L('t.head(2)'), L('t.tail(3)')] };
      case 'eq': return { goal: 'Only the ' + ch + ' lines, most qty first.', ref: [L('t[t["channel"] == "' + ch + '"]'), L('t.sort_values("qty", ascending=False)')],
        decoys: [L('t[t["channel"] != "' + ch + '"]'), L('t[t["channel"] == "' + other + '"]'), L('t.sort_values("qty")'), L('t.head(2)')] };
      case 'ge': return { goal: 'Lines with qty of ' + n + ' or more, cheapest first.', ref: [L('t[t["qty"] >= ' + n + ']'), L('t.sort_values("price")')],
        decoys: [L('t[t["qty"] > ' + n + ']'), L('t[t["qty"] <= ' + n + ']'), L('t.sort_values("price", ascending=False)'), L('t.head(3)')] };
      case 'lt': return { goal: 'Lines with a price below ' + pr + ', most qty first.', ref: [L('t[t["price"] < ' + pr + ']'), L('t.sort_values("qty", ascending=False)')],
        decoys: [L('t[t["price"] <= ' + pr + ']'), L('t[t["price"] > ' + pr + ']'), L('t.sort_values("qty")'), L('t.head(2)')] };
      case 'isin': return { goal: 'Only the lines from ' + c1 + ' and ' + c2 + ', most qty first.', ref: [L('t[t["city"].isin(["' + c1 + '", "' + c2 + '"])]'), L('t.sort_values("qty", ascending=False)')],
        decoys: [L('t[t["city"] == "' + c1 + '"]'), L('t[~t["city"].isin(["' + c1 + '", "' + c2 + '"])]'), L('t.sort_values("qty")'), L('t.head(3)')] };
      case 'and': return { goal: 'Lines with qty of ' + n + ' or more AND channel ' + ch + ': city and qty only.', ref: [L('t[(t["qty"] >= ' + n + ') & (t["channel"] == "' + ch + '")]'), L('t[["city", "qty"]]')],
        decoys: [L('t[(t["qty"] >= ' + n + ') | (t["channel"] == "' + ch + '")]'), L('t[t["qty"] >= ' + n + ']'), L('t[["city", "price"]]'), L('t.head(2)'), L('t[(t["qty"] > ' + n + ') & (t["channel"] == "' + ch + '")]')] };
      case 'or': return { goal: 'Lines with qty of ' + n + ' or more OR channel ' + ch + ', cheapest first.', ref: [L('t[(t["qty"] >= ' + n + ') | (t["channel"] == "' + ch + '")]'), L('t.sort_values("price")')],
        decoys: [L('t[(t["qty"] >= ' + n + ') & (t["channel"] == "' + ch + '")]'), L('t[t["channel"] == "' + ch + '"]'), L('t.sort_values("price", ascending=False)'), L('t.head(3)'), L('t[(t["qty"] >= ' + n + ') | (t["channel"] != "' + ch + '")]')] };
      case 'gsum': case 'bycity': return { goal: 'Total qty per city, biggest first.', ref: [L('t.groupby("city")["qty"].sum()'), L('t.sort_values(ascending=False)')],
        decoys: [L('t.groupby("city")["qty"].mean()'), L('t.sort_values()'), L('t.head(2)'), L('t.groupby("channel")["qty"].sum()')] };
      case 'gmean': return { goal: 'Average price per channel, highest first.', ref: [L('t.groupby("channel")["price"].mean()'), L('t.sort_values(ascending=False)')],
        decoys: [L('t.groupby("channel")["price"].sum()'), L('t.sort_values()'), L('t.groupby("city")["price"].mean()'), L('t.head(2)')] };
      case 'gcount': return { goal: 'Number of lines per city, most first.', ref: [L('t.groupby("city")["qty"].count()'), L('t.sort_values(ascending=False)')],
        decoys: [L('t.groupby("city")["qty"].sum()'), L('t.sort_values()'), L('t.groupby("channel")["qty"].count()'), L('t.head(2)')] };
      case 'gmax': return { goal: 'The highest qty in each channel.', ref: [L('t.groupby("channel")["qty"].max()')],
        decoys: [L('t.groupby("channel")["qty"].min()'), L('t.groupby("channel")["qty"].sum()'), L('t.groupby("city")["qty"].max()'), L('t.sort_values("qty")')] };
      case 'fgroup': return { goal: 'Total qty per city, counting only ' + ch + ' lines, biggest first.', ref: [L('t[t["channel"] == "' + ch + '"]'), L('t.groupby("city")["qty"].sum()'), L('t.sort_values(ascending=False)')],
        decoys: [L('t[t["channel"] != "' + ch + '"]'), L('t.groupby("city")["qty"].mean()'), L('t.sort_values()'), L('t.head(2)')] };
      case 'vc': return { goal: 'How many lines per channel, most first.', ref: [L('t["channel"].value_counts()')],
        decoys: [L('t["city"].value_counts()'), L('t.groupby("channel")["qty"].sum()'), L('t["channel"].value_counts(normalize=True)'), L('t.sort_values("qty")'), L('t["channel"].nunique()')] };
      case 'vcnorm': return { goal: "Each city's share of the lines (0 to 1), biggest first.", ref: [L('t["city"].value_counts(normalize=True)')],
        decoys: [L('t["city"].value_counts()'), L('t["channel"].value_counts(normalize=True)'), L('t.groupby("city")["qty"].mean()'), L('t.head(3)'), L('t["city"].nunique()')] };
      case 'reset': return { goal: 'Total qty per channel as a table with two columns: channel and qty.', ref: [L('t.groupby("channel")["qty"].sum()'), L('t.reset_index()')],
        decoys: [L('t.groupby("channel")["qty"].mean()'), L('t.groupby("city")["qty"].sum()'), L('t.sort_values()'), L('t.head(2)'), L('t["channel"].value_counts()')] };
      case 'dropna': return { goal: 'Only the lines with a known qty, most qty first.', ref: [L('t.dropna(subset=["qty"])'), L('t.sort_values("qty", ascending=False)')],
        decoys: [L('t.fillna(0)'), L('t.sort_values("qty")'), L('t.head(3)'), L('t[t["qty"] > 1]')] };
      case 'fillna': return { goal: 'Average qty per city when a missing qty counts as 0.', ref: [L('t.fillna(0)'), L('t.groupby("city")["qty"].mean()')],
        decoys: [L('t.dropna()'), L('t.groupby("city")["qty"].sum()'), L('t.groupby("channel")["qty"].mean()'), L('t.sort_values("qty")')] };
      case 'dedupe': return { goal: 'Some lines were exported twice. Count the lines per channel, each line once.', ref: [L('t.drop_duplicates()'), L('t["channel"].value_counts()')],
        decoys: [L('t.dropna()'), L('t["city"].value_counts()'), L('t.groupby("channel")["qty"].sum()'), L('t.head(5)')] };
      case 'revenue': return { goal: 'Revenue (qty × price) per city, biggest first.', ref: [L('t.assign(revenue=t["qty"] * t["price"])'), L('t.groupby("city")["revenue"].sum()'), L('t.sort_values(ascending=False)')],
        decoys: [L('t.assign(revenue=t["qty"] + t["price"])'), L('t.groupby("city")["qty"].sum()'), L('t.sort_values()'), L('t.head(2)'), L('t.groupby("channel")["revenue"].sum()')] };
      case 'pivot': return { goal: 'Total qty with a row per city and a column per channel, 0 where there is nothing.',
        ref: [L('t.pivot_table(index="city", columns="channel", values="qty", aggfunc="sum", fill_value=0)')],
        decoys: [L('t.pivot_table(index="channel", columns="city", values="qty", aggfunc="sum", fill_value=0)'), L('t.pivot_table(index="city", columns="channel", values="qty", aggfunc="mean", fill_value=0)'), L('t.groupby("city")["qty"].sum()'), L('t.pivot_table(index="city", columns="channel", values="price", aggfunc="sum", fill_value=0)'), L('t.pivot_table(index="city", columns="channel", values="qty", aggfunc="sum")')] };
      default: return { goal: 'Total qty per country. The regions table links each city to its country.', ref: [L('t.merge(regions, on="city")'), L('t.groupby("country")["qty"].sum()')], extra: 'regions',
        decoys: [L('t.groupby("city")["qty"].sum()'), L('t.groupby("country")["qty"].mean()'), L('t.sort_values("qty")'), L('t.head(3)'), L('t.groupby("country")["qty"].count()')] };
    }
  }
  X.pipe = function (seed, lv) {
    var p = params(lv, { kinds: ['bycity', 'eq', 'sorttop', 'revenue', 'vc'], rows: 7, decoys: 3 });
    var r = X.rng(seed), kind = pick(r, p.kinds), rows = miniRows(r, p.rows);
    if (p.missing) { rows[1 + Math.floor(r() * (rows.length - 1))].qty = null; if (r() < 0.6) rows[Math.floor(r() * rows.length)].qty = null; }
    if (p.dupes) { rows.push(Object.assign({}, rows[1])); rows.splice(3, 0, Object.assign({}, rows[0])); }
    var k = pipeKind(kind, r, rows);
    var cards = k.ref.concat(shuffle(r, k.decoys.filter(function (d) { return k.ref.indexOf(d) < 0; })).slice(0, p.decoys || 3));
    return { kind: kind, rows: rows, csv: csvOf(rows), goal: k.goal, ref: k.ref, cards: shuffle(r, cards), par: k.ref.length, extra: k.extra || null };
  };
  X.pipeCode = function (lines) { return ['t = df'].concat(lines).concat(['result = t']).join('\n'); };
  X.pipeRun = function (p, lines) {
    var P = DA.python, data = { df: P.readCsvText(p.csv) };
    if (p.extra === 'regions') data.regions = P.readCsvText(X.REGIONS_CSV);
    return P.run(X.pipeCode(lines), { data: data });
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
    month: { col: 'month', label: 'Month', values: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'] },
  };
  X.SLICERS = SLICERS;
  var QTY = 'SUM(Sales[qty])';
  var MEASURES = {
    sum: { f: QTY, fmt: 'int', note: 'Every slicer filters the sum.' },
    rows: { f: 'COUNTROWS(Sales)', fmt: 'int', note: 'COUNTROWS counts the order lines the slicers leave.' },
    orders: { f: 'DISTINCTCOUNT(Sales[order_id])', fmt: 'int', note: 'Every slicer filters the orders it counts, and each order counts once.' },
    cust: { f: 'DISTINCTCOUNT(Sales[customer_id])', fmt: 'int', note: 'Each customer counts once, however many lines they bought.' },
    allch: { f: 'CALCULATE(' + QTY + ', ALL(Sales[channel]))', fmt: 'int', need: ['channel'], note: 'ALL(Sales[channel]) removes the channel filter, so the Channel slicer does nothing here.' },
    allcity: { f: 'CALCULATE(' + QTY + ', ALL(Sales[store_city]))', fmt: 'int', need: ['city'], note: 'ALL(Sales[store_city]) removes the city filter, so the City slicer does nothing here.' },
    fixch: { f: 'CALCULATE(' + QTY + ', Sales[channel] = "delivery")', fmt: 'int', need: ['channel'], note: 'The CALCULATE filter on channel replaces the slicer, so the Channel slicer does nothing here.' },
    fixcat: { f: 'CALCULATE(' + QTY + ', Sales[category] = "Coffee")', fmt: 'int', need: ['category'], note: 'The CALCULATE filter on category replaces the slicer, so the Category slicer does nothing here.' },
    rmcat: { f: 'CALCULATE(' + QTY + ', REMOVEFILTERS(Sales[category]))', fmt: 'int', need: ['category'], note: 'REMOVEFILTERS(Sales[category]) clears the category filter: the Category slicer is ignored.' },
    share: { f: 'DIVIDE(' + QTY + ', CALCULATE(' + QTY + ', ALL(Sales[store_city])))', fmt: 'pct', need: ['city'], note: 'A share of all cities: the City slicer moves the top of the fraction only.' },
    chshare: { f: 'DIVIDE(' + QTY + ', CALCULATE(' + QTY + ', ALL(Sales[channel])))', fmt: 'pct', need: ['channel'], note: 'A share of all channels: the Channel slicer moves only the top of the fraction, the other slicers move both.' },
    avgprice: { f: 'AVERAGE(Sales[unit_price])', fmt: 'money', note: 'An average price changes with the mix of products the slicers leave.' },
    avgline: { f: 'AVERAGEX(Sales, Sales[qty] * Sales[unit_price])', fmt: 'money', note: 'AVERAGEX works out qty × price on every line first, then averages those line values.' },
    rev: { f: 'SUMX(Sales, Sales[qty] * Sales[unit_price])', fmt: 'money', note: 'Revenue: every slicer filters the rows SUMX goes through.' },
    month: { f: QTY, fmt: 'int', need: ['month'], note: 'The Month slicer filters the order dates like any other column.' },
    prev: { f: 'CALCULATE(' + QTY + ', DATEADD(Sales[order_date], -1, MONTH))', fmt: 'int', need: ['month'], note: 'DATEADD moves the dates back a month: picking March shows February.' },
    ytd: { f: 'TOTALYTD(' + QTY + ', Sales[order_date])', fmt: 'int', need: ['month'], note: 'TOTALYTD adds up from January to the month you pick.' },
    rank: { f: 'RANKX(ALL(Sales[store_city]), CALCULATE(' + QTY + '))', fmt: 'int', need: ['city'], note: 'RANKX compares the city you pick with every city: 1 is the biggest.' },
  };
  X.MEASURES = Object.keys(MEASURES).map(function (k) { var m = MEASURES[k]; m.id = k; return m; });
  X.MEASURE = MEASURES;
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
  X.safe = function (seed, lv) {
    var p0 = params(lv, { measures: ['sum', 'orders', 'allch', 'fixch', 'share', 'avgprice', 'rev'], slicers: 2 });
    var r = X.rng(seed), avail = ['city', 'channel', 'category'];
    for (var tries = 0; tries < 60; tries++) {
      var m = MEASURES[pick(r, p0.measures)], need = uniq((m.need || []).concat(p0.need || []));
      var pool = avail.concat(need.indexOf('month') >= 0 ? ['month'] : []).filter(function (k) { return need.indexOf(k) < 0; });
      var keys = need.concat(shuffle(r, pool)).slice(0, p0.slicers), secret = {};
      keys = keys.sort(function (a, b) { return Object.keys(SLICERS).indexOf(a) - Object.keys(SLICERS).indexOf(b); });
      keys.forEach(function (k) { secret[k] = r() < 0.85 ? pick(r, SLICERS[k].values) : null; });
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
  // The fewest slicers to change from "All" to reach the target, looking at every part of the secret
  // (some slicers do nothing for some measures, so fewer moves can open the safe).
  X.safeMinMoves = function (p) {
    var set = p.slicers.filter(function (k) { return p.secret[k]; }), best = set.length;
    for (var mask = 0; mask < (1 << set.length); mask++) {
      var sel = {}, n = 0;
      set.forEach(function (k, i) { if (mask & (1 << i)) { sel[k] = p.secret[k]; n++; } });
      if (n < best && X.fmt(X.safeValue(p, sel), p.measure.fmt) === p.target) best = n;
    }
    return best;
  };
  X.safeCheck = function (p, sel) { return X.fmt(X.safeValue(p, sel), p.measure.fmt) === p.target; };

  /* ================================================================ Pill match */

  var DIMS = {
    city: ['Sales[store_city]', 'store_city'], channel: ['Sales[channel]', 'channel'], category: ['Sales[category]', 'category'], segment: ['Customers[segment]', 'segment'],
  };
  var MEAS = {
    sumqty: ['SUM([qty])', 'SUM(qty)', 'int'], avgqty: ['AVG([qty])', 'AVG(qty)', 'money'], minprice: ['MIN([unit_price])', 'MIN(unit_price)', 'money'],
    maxprice: ['MAX([unit_price])', 'MAX(unit_price)', 'money'], avgprice: ['AVG([unit_price])', 'AVG(unit_price)', 'money'], lines: ['COUNT([order_id])', 'COUNT(order_id)', 'int'],
    orders: ['COUNTD([order_id])', 'COUNTD(order_id)', 'int'], customers: ['COUNTD([customer_id])', 'COUNTD(customer_id)', 'int'], revenue: ['SUM([qty] * [unit_price])', 'SUM(revenue)', 'money'],
  };
  X.DIM = DIMS; X.MEA = MEAS;
  // Old names, kept for the free-play round and its tests.
  X.DIMS = ['city', 'channel', 'category', 'segment'].map(function (k) { return DIMS[k]; });
  X.MEAS = ['sumqty', 'avgprice', 'orders', 'customers', 'revenue'].map(function (k) { return MEAS[k]; });
  X.CALCS = { none: 'No calculation', pct: 'Percent of total', run: 'Running total', rank: 'Rank' };
  X.TOP = 3;

  var members = {};
  X.members = function (dimKey) {
    if (members[dimKey]) return members[dimKey];
    var d = DA.bi.dims[dimKey], seen = {};
    X.model().table(d.table).rows.forEach(function (r) { seen[r[d.col]] = 1; });
    return (members[dimKey] = Object.keys(seen).sort());
  };
  function rowFilter(f) {
    if (!f) return null;
    var d = DA.bi.dims[f.dim];
    if (d.table === 'Sales') return function (r) { return r[d.col] === f.value; };
    var ok = {}; X.model().table('Customers').rows.forEach(function (c) { if (c[d.col] === f.value) ok[c.customer_id] = 1; });
    return function (r) { return !!ok[r.customer_id]; };
  }
  function calcFormula(meas, calc) {
    if (calc === 'pct') return meas + ' / TOTAL(' + meas + ')';
    if (calc === 'run') return 'RUNNING_SUM(' + meas + ')';
    if (calc === 'rank') return 'RANK(' + meas + ')';
    return meas;
  }
  X.calcFmt = function (fmt, calc) { return calc === 'pct' ? 'pct' : calc === 'rank' ? 'int' : fmt; };
  // The bars of a view: { dim, meas, sort, filter: { dim, value }, top: n, calc }. Top N keeps the N biggest bars.
  X.bars = function (cfg) {
    var where = rowFilter(cfg.filter);
    var b = DA.bi.breakdown(X.model(), 'tableau', calcFormula(cfg.meas, cfg.calc), cfg.dim, where ? { where: where } : null);
    var rows = b.rows.filter(function (x) { return typeof x.value === 'number' && !isNaN(x.value); }).map(function (x) { return { member: x.member, value: x.value }; });
    if (cfg.top) {
      var keep = rows.slice().sort(function (a, c) { return c.value - a.value || (a.member < c.member ? -1 : 1); }).slice(0, cfg.top).map(function (x) { return x.member; });
      rows = rows.filter(function (x) { return keep.indexOf(x.member) >= 0; });
    }
    if (cfg.sort === 'desc') rows.sort(function (a, c) { return c.value - a.value; });
    if (cfg.sort === 'asc') rows.sort(function (a, c) { return a.value - c.value; });
    return rows;
  };
  X.chart = function (dim, meas, sort) { return X.bars({ dim: dim, meas: meas, sort: sort }); };

  X.pills = function (seed, lv) {
    var p = params(lv, null), r = X.rng(seed);
    if (!p) { // free play: the original mix
      var d0 = pick(r, X.DIMS), m0 = pick(r, X.MEAS), s0 = pick(r, ['none', 'desc', 'asc']);
      return { dim: d0[0], meas: m0[0], sort: s0, fmt: m0[2], rows: X.chart(d0[0], m0[0], s0), opts: { dims: X.DIMS, meas: X.MEAS } };
    }
    var dims = p.dims.map(function (k) { return DIMS[k]; }), meas = p.meas.map(function (k) { return MEAS[k]; });
    for (var tries = 0; tries < 30; tries++) {
      var d = pick(r, dims), m = pick(r, meas), calc = p.calc ? pick(r, p.calc) : 'none';
      var sort = p.sort && calc !== 'run' ? pick(r, ['none', 'desc', 'asc']) : 'none', filter = null, top = 0;
      if (p.filter) {
        var fd = pick(r, dims.filter(function (x) { return x !== d; }).concat(dims.length > 1 ? [] : [DIMS.channel]));
        if (fd && fd !== d) filter = { dim: fd[0], value: pick(r, X.members(fd[0])) };
      }
      if (p.top && X.members(d[0]).length > X.TOP) top = X.TOP;
      var cfg = { dim: d[0], meas: m[0], sort: sort, filter: filter, top: top, calc: calc === 'none' ? null : calc };
      if (p.top && !top) continue;
      var rows = X.bars(cfg);
      if (rows.length >= 2) {
        return { dim: d[0], meas: m[0], sort: sort, filter: filter, top: top, calc: cfg.calc, fmt: X.calcFmt(m[2], cfg.calc), rows: rows,
          opts: { dims: dims, meas: meas, sort: !!p.sort, filter: !!p.filter, top: !!p.top, calc: p.calc || null } };
      }
    }
    return null;
  };
  // Compare a configuration with the target chart and explain the first difference.
  X.pillCheck = function (p, dim, meas, sort, extra) {
    extra = extra || {};
    if (!dim || !meas) return { ok: false, why: 'Put one blue pill on Rows and one green pill on Columns.' };
    var cfg = { dim: dim, meas: meas, sort: sort || 'none', filter: extra.filter || null, top: extra.top ? X.TOP : 0, calc: extra.calc || null };
    var got = X.bars(cfg);
    var close = function (a, b) { return Math.abs(a - b) < 1e-9; };
    var same = got.length === p.rows.length && got.every(function (x, i) { return x.member === p.rows[i].member && close(x.value, p.rows[i].value); });
    if (same) return { ok: true };
    var sameSet = got.length === p.rows.length && got.every(function (x) { return p.rows.some(function (y) { return y.member === x.member && close(x.value, y.value); }); });
    if (sameSet) return { ok: false, why: 'Right bars, wrong order: look at the Sort button.' };
    if (dim !== p.dim) return { ok: false, why: 'The labels down the side are different: try another blue pill.' };
    if (got.length !== p.rows.length) return { ok: false, why: p.top && !extra.top ? 'The target shows fewer bars: is a Top N filter on?' : 'A different number of bars: check the Top N filter.' };
    if ((p.calc || null) !== (extra.calc || null)) return { ok: false, why: 'The labels match but the numbers do not: look at the table calculation.' };
    if (p.filter && (!extra.filter || extra.filter.dim !== p.filter.dim || extra.filter.value !== p.filter.value)) return { ok: false, why: 'The labels match but the bars are shorter or longer: is the right filter on?' };
    return { ok: false, why: 'The labels match, but the bar lengths do not: try another green pill.' };
  };
})();
