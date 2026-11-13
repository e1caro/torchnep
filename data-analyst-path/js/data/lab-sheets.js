/* DotSheets worlds, levels and challenges: the 21 original challenges plus new ones checked against a reference formula. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  S.ROWS_LOADED = 500;
  S.datasetCsv = function (ds) {
    if (ds === 'messy') return DA.gen.messyCsv();
    if (ds === 'funnel') return DA.gen.csv['funnel_sample.csv']();
    if (ds === 'members') return DA.gen.csv['members.csv']();
    return DA.gen.retailCsv();
  };
  S.datasetWorkbook = function (ds) {
    var wb = new S.Workbook();
    S.loadCsv(wb.activeSheet(), S.datasetCsv(ds), S.ROWS_LOADED);
    wb.recalc();
    return wb;
  };

  var refBooks = {};
  function refValue(ds, steps) {
    var wb = refBooks[ds] || (refBooks[ds] = S.datasetWorkbook(ds));
    var sh = wb.activeSheet();
    var keep = {};
    Object.keys(sh.cells).forEach(function (k) { if (!sh.cells[k].spillFrom) keep[k] = true; });
    steps.forEach(function (st) { var a = S.parseAddr(st[0]); S.setInput(sh, a.r, a.c, st[1]); });
    wb.recalc();
    var last = S.parseAddr(steps[steps.length - 1][0]), cell = sh.getCell(last.r, last.c), v = cell ? cell.value : null;
    Object.keys(sh.cells).forEach(function (k) { if (!keep[k]) delete sh.cells[k]; });
    steps.forEach(function (st) { var a = S.parseAddr(st[0]); if (keep[a.r + ',' + a.c]) S.restore(sh, a.r, a.c, S.snapshot(sh, a.r, a.c)); });
    wb.recalc();
    return v;
  }
  S.refValue = refValue;

  function same(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (a[i].length !== b[i].length) return false;
        for (var j = 0; j < a[i].length; j++) if (!same(a[i][j], b[i][j])) return false;
      }
      return true;
    }
    if (a instanceof S.Err || b instanceof S.Err) return a instanceof S.Err && b instanceof S.Err && a.code === b.code;
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
    return a === b;
  }
  S.sameValue = same;

  function show(v) {
    if (Array.isArray(v)) return 'a spilled list of ' + v.length + ' row' + (v.length === 1 ? '' : 's');
    if (v === null || v === undefined || v === '') return 'an empty cell';
    return '"' + S.formatValue(v, null) + '"';
  }

  // A challenge with extras (level type, starter cells, a first question, a finding) on top of R or G.
  function E(c, extra) { Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; }); return c; }
  // Several cells in order (a cleaning gauntlet): the last cell is checked against the reference chain.
  function G(id, ds, title, steps, task, hint, extra) {
    var c = R(id, ds, title, steps[steps.length - 1][0], steps[steps.length - 1][1], task, hint);
    var last = steps[steps.length - 1][0];
    c.steps = steps;
    c.solution = steps.map(function (st) { return st[0] + ':  ' + st[1]; }).join('\n');
    c.check = function (wb) {
      var sh = wb.activeSheet(), a = S.parseAddr(last), cell = sh.getCell(a.r, a.c);
      if (!cell || !cell.formula) return { ok: false, message: last + ' needs the formula of the last step. Build the steps from left to right.' };
      var want = refValue(ds, steps);
      if (same(cell.value, want)) return { ok: true, message: last + ' is right: ' + show(cell.value) + '.' };
      return { ok: false, message: last + ' gives ' + show(cell.value) + ', but the answer is different. Check each step on row 2.' };
    };
    return E(c, extra);
  }
  function PS(id, ds, title, formula, options, answer, why) {
    return E(R(id, ds, title, 'L1', formula, 'Without typing it: what does this formula return?', 'Work from the inside out.'), { type: 'predict', code: formula, options: options, answer: answer, why: why });
  }
  var FUNNEL = 'Data: the first 499 app events. Columns: A event_id, B user_id, C session_id, D event_time, E event_name, F platform.';
  var CLUB = 'Data: Dot Club members. Columns: A member_id, B user_id, C plan, D start_date, E cancel_date (empty while active), F monthly_price.';

  function R(id, ds, title, at, formula, task, hint) {
    return {
      id: id, ds: ds, title: title, task: task, hint: hint,
      solution: at + ':  ' + formula, steps: [[at, formula]],
      check: function (wb) {
        var sh = wb.activeSheet(), a = S.parseAddr(at), cell = sh.getCell(a.r, a.c);
        if (!cell || (cell.raw === null && !cell.formula)) return { ok: false, message: at + ' is empty. Put your formula in ' + at + '.' };
        if (!cell.formula) return { ok: false, message: at + ' holds a typed value. Use a formula that starts with = so it updates when the data changes.' };
        var want = refValue(ds, [[at, formula]]);
        if (same(cell.value, want)) return { ok: true, message: at + ' is right: ' + show(cell.value) + '.' };
        if (cell.value instanceof S.Err) return { ok: false, message: at + ' shows the error ' + cell.value.code + '. Check the ranges and the commas in the formula.' };
        return { ok: false, message: at + ' gives ' + show(cell.value) + ', but the answer is different. Check the ranges and the condition.' };
      },
    };
  }

  var OLD = {
    s_l1_1_1: [['H2', '=TRIM(C2)']], s_l1_1_2: [['H2', '=PROPER(G2)']], s_l1_1_3: [['H2', '=VALUE(SUBSTITUTE(F2, "$", ""))']],
    s_l1_2_1: [['J2', '=H2*I2']], s_l1_2_2: [['K2', '=SUMIF(G2:G100, "Coffee", H2:H100)']], s_l1_2_3: [['K2', '=COUNTIFS(C2:C100, "Madrid", H2:H100, ">=2")']],
    s_l1_3_1: [['K2', '=AVERAGE(H2:H100)']], s_l1_3_2: [['K2', '=MAX(H2:H100)']], s_l1_3_3: [['K2', '=SUMPRODUCT(H2:H50, I2:I50)']],
    s_l1_4_1: [['K2', '=SORT(UNIQUE(G2:G50))']], s_l1_4_2: [['K2', '=XLOOKUP(A2, A2:A50, F2:F50)']], s_l1_4_3: [['K2', '=FILTER(F2:H50, C2:C50="Madrid")']],
    s_l1_5_1: [['H2', '=IF(ISBLANK(C2), "Missing", "Valid")']], s_l1_5_2: [['H2', '=YEAR(B2)']], s_l1_5_3: [['H2', '=IFERROR(VALUE(E2), 1)']],
    s_l1_6_1: [['K2', '=TEXTJOIN(" - ", TRUE, C2, D2)']], s_l1_6_2: [['K2', '=IF(H2>=3, "Large", "Standard")']], s_l1_6_3: [['K2', '=UNIQUE(F2:F50)']],
    s_l1_7_1: [['J2', '=H2*I2'], ['M1', '0.21'], ['M2', '=J2*$M$1']], s_l1_7_2: [['K2', '=IF(ABS(SUM(H2:H10)-SUM(H2:H10))<0.01, "✓ Balanced", "⚠️ Error")']],
    s_l1_7_3: [['K2', '=LET(q, H2, p, I2, q*p)']],
  };
  function O(id) {
    var src = (DA.sheetsChallenges || []).filter(function (c) { return c.id === id; })[0];
    if (!src) return null;
    var steps = OLD[id];
    var formula = steps[steps.length - 1][1], fn = /([A-Z][A-Z.]+)\(/.exec(formula);
    var ref = /\$?([A-Z]{1,3})\$?(\d+)/.exec(formula);
    var need = fn ? new RegExp('\\b' + fn[1].replace('.', '\\.') + '\\(', 'i') : new RegExp('\\$?' + ref[1] + '\\$?' + ref[2] + '\\b', 'i');
    return { id: id, ds: src.ds, title: src.title, task: src.task, hint: src.hint, steps: steps, lessonId: src.lessonId,
      solution: steps.map(function (s) { return s[0] + ':  ' + s[1]; }).join('\n'),
      check: function (wb) {
        var want = refValue(src.ds, steps), sh = wb.activeSheet(), keys = Object.keys(sh.cells), found = false;
        for (var i = 0; i < keys.length; i++) {
          var cell = sh.cells[keys[i]];
          if (!cell.formula || !need.test(cell.formula)) continue;
          found = true;
          if (same(cell.value, want)) return { ok: true, message: 'Right: ' + show(cell.value) + '.' };
        }
        var orig = src.check(wb);
        return { ok: false, message: found ? 'Your formula runs, but its result is not the expected one. Check the cells and ranges in the task.' : orig.message };
      } };
  }

  var RETAIL = 'Columns: A order_id, B order_date, C store_city, D channel, E customer_id, F product, G category, H qty, I unit_price.';
  var MESSY = 'Columns: A Order ID, B Date, C Customer, D Product, E Qty, F Price, G City (typed by hand: spaces, typos, text in number columns).';

  function ex(title, code, explain) { return { title: title, code: code, explain: explain }; }

  DA.labSheets = {
    id: 'sheets', route: 'sheets', quest: 'lesson',
    tagline: 'A real spreadsheet in your browser: Excel-style formulas, lookups and dynamic arrays, on practice data.',
    help: 'Click a cell or move with the arrow keys. Type to replace a cell, F2 or double-click to edit it, Enter saves and moves down, Tab moves right, Escape cancels. Ctrl+C / Ctrl+V copy and paste, Ctrl+Z undoes. On a phone, tap a cell to select it and tap it again to type. ' + RETAIL,
    xpKey: function (c) { return 'sheet:' + c.id; },
    xp: function (c) { return DA.ui.XP.sheet(Math.min(6, c.level.world.n)); },
    worlds: [
      { icon: '🧮', title: 'Formula basics', about: 'Arithmetic, summaries, $ references and IF.', levels: [
        { title: 'First formulas', example: ex('Line revenue', 'J2:  =H2*I2', 'A formula starts with =. It refers to other cells, so it updates when they change.'), challenges: [
          O('s_l1_2_1'),
          R('sx_w1_1', 'retail', 'Price with 10% tax', 'K2', '=I2*1.1', 'In <b>K2</b>, show the unit price in <b>I2</b> with 10% tax added (multiply by 1.1).', 'Type <code>=I2*1.1</code> in K2.'),
          R('sx_w1_2', 'retail', 'Round the revenue', 'L2', '=ROUND(H2*I2, 1)', 'In <b>L2</b>, compute quantity × unit price for row 2, rounded to 1 decimal.', 'Wrap the product in ROUND: <code>=ROUND(H2*I2, 1)</code>.')] },
        { title: 'Summaries', example: ex('Total of a column', 'K1:  =SUM(H2:H100)', 'A range like H2:H100 covers every cell from H2 down to H100. SUM, AVERAGE, MIN and MAX turn it into one number.'), challenges: [
          O('s_l1_3_1'), O('s_l1_3_2'),
          R('sx_w1_3', 'retail', 'Total quantity', 'L1', '=SUM(H2:H100)', 'In <b>L1</b>, add up the quantities in <b>H2:H100</b>.', 'Use <code>=SUM(H2:H100)</code>.')] },
        { title: 'Absolute references', example: ex('Lock a cell with $', 'K2:  =H2/SUM($H$2:$H$100)', '$ locks a column or row, so the reference stays the same when you copy the formula down. F4 adds the $ signs for you.'), challenges: [
          O('s_l1_7_1'),
          R('sx_w1_4', 'retail', 'Share of the total', 'K2', '=H2/SUM($H$2:$H$100)', 'In <b>K2</b>, show row 2\'s quantity as a share of the total quantity in <b>H2:H100</b>. Lock the total range with $.', 'Divide by a locked total: <code>=H2/SUM($H$2:$H$100)</code>.'),
          R('sx_w1_5', 'retail', 'Running total', 'K3', '=SUM($H$2:H3)', 'In <b>K3</b>, compute the running total of quantity from H2 down to row 3. Lock only the start of the range.', 'Lock the start, not the end: <code>=SUM($H$2:H3)</code>.')] },
        { title: 'Logic', example: ex('IF', 'K2:  =IF(H2>=2, "Multi", "Single")', 'IF(test, value if true, value if false). Text answers go in double quotes.'), challenges: [
          O('s_l1_6_2'), O('s_l1_7_2'), O('s_l1_7_3')] },
      ] },
      { icon: '🧹', title: 'Clean data', about: 'Fix messy text, numbers stored as text, blanks and dates.', levels: [
        { title: 'Text cleanup', example: ex('Trim and fix case', 'H2:  =PROPER(TRIM(C2))', 'TRIM removes extra spaces; PROPER, UPPER and LOWER fix the capitals. Nest them: the inner one runs first.'), challenges: [
          O('s_l1_1_1'), O('s_l1_1_2'),
          R('sx_w2_1', 'messy', 'Product in capitals', 'H2', '=UPPER(TRIM(D2))', 'The data now is the messy file. ' + MESSY + ' In <b>H2</b>, show the product in <b>D2</b> without extra spaces and in capitals.', 'Nest them: <code>=UPPER(TRIM(D2))</code>.')] },
        { title: 'Numbers from text', example: ex('Text to number', 'H2:  =VALUE(SUBSTITUTE(F2, "$", ""))', 'SUBSTITUTE removes a character; VALUE turns the remaining text into a real number you can sum.'), challenges: [
          O('s_l1_1_3'), O('s_l1_5_3'),
          R('sx_w2_2', 'messy', 'Length of a name', 'H2', '=LEN(TRIM(C2))', 'In <b>H2</b>, count the characters of the customer name in <b>C2</b> after removing extra spaces.', 'LEN counts characters: <code>=LEN(TRIM(C2))</code>.')] },
        { title: 'Blanks and dates', example: ex('Count blanks', 'J1:  =COUNTBLANK(E2:E129)', 'COUNTBLANK counts empty cells: a quick data-quality check before any analysis.'), challenges: [
          O('s_l1_5_1'), O('s_l1_5_2'),
          R('sx_w2_3', 'messy', 'Count missing quantities', 'J1', '=COUNTBLANK(E2:E129)', 'In <b>J1</b>, count how many quantities in <b>E2:E129</b> are empty.', 'Use <code>=COUNTBLANK(E2:E129)</code>.')] },
        { title: 'Combine and split', example: ex('Join with &', 'K2:  =C2&" / "&D2', '& glues text together. TEXTJOIN does the same for many cells with one separator.'), challenges: [
          O('s_l1_6_1'),
          R('sx_w2_4', 'retail', 'Order label', 'K2', '=A2&"-"&C2', 'In <b>K2</b>, build a label like <code>1-London</code>: the order_id in A2, a hyphen, then the city in C2.', 'Use &: <code>=A2&"-"&C2</code>.'),
          R('sx_w2_5', 'retail', 'Month of the order', 'K2', '=MONTH(B2)', 'In <b>K2</b>, extract the month number (1 to 12) of the order date in <b>B2</b>.', 'Use <code>=MONTH(B2)</code>.')] },
      ] },
      { icon: '🎯', title: 'Conditional analysis', about: 'SUMIF, COUNTIFS, AVERAGEIFS and SUMPRODUCT.', levels: [
        { title: 'Count and sum by condition', example: ex('COUNTIF', 'K1:  =COUNTIF(C2:C100, "Paris")', 'COUNTIF(range, condition) counts matching cells. SUMIF adds a second range where the first one matches.'), challenges: [
          O('s_l1_2_2'), O('s_l1_2_3'),
          R('sx_w3_1', 'retail', 'Delivery lines', 'K1', '=COUNTIF(D2:D100, "delivery")', 'In <b>K1</b>, count the rows in <b>D2:D100</b> whose channel is <code>delivery</code>.', 'Use <code>=COUNTIF(D2:D100, "delivery")</code>.')] },
        { title: 'Several conditions', example: ex('SUMIFS', 'K1:  =SUMIFS(H2:H100, C2:C100, "Berlin", D2:D100, "pickup")', 'The IFS versions take the range to add first, then pairs of range and condition. Every condition must be true.'), challenges: [
          R('sx_w3_2', 'retail', 'Coffee in Madrid', 'K1', '=SUMIFS(H2:H100, G2:G100, "Coffee", C2:C100, "Madrid")', 'In <b>K1</b>, add up the quantity of <code>Coffee</code> sold in <code>Madrid</code> (rows 2 to 100).', 'SUMIFS takes the sum range first: <code>=SUMIFS(H2:H100, G2:G100, "Coffee", C2:C100, "Madrid")</code>.'),
          R('sx_w3_3', 'retail', 'Average quantity in London', 'K1', '=AVERAGEIFS(H2:H100, C2:C100, "London")', 'In <b>K1</b>, compute the average quantity of the London rows (rows 2 to 100).', 'Use <code>=AVERAGEIFS(H2:H100, C2:C100, "London")</code>.'),
          R('sx_w3_4', 'retail', 'Bakery pickups', 'K1', '=COUNTIFS(G2:G100, "Bakery", D2:D100, "pickup")', 'In <b>K1</b>, count the rows that are <code>Bakery</code> AND channel <code>pickup</code> (rows 2 to 100).', 'Two pairs: <code>=COUNTIFS(G2:G100, "Bakery", D2:D100, "pickup")</code>.')] },
        { title: 'Revenue', example: ex('SUMPRODUCT', 'K1:  =SUMPRODUCT(H2:H100, I2:I100)', 'SUMPRODUCT multiplies two ranges row by row and adds the results: revenue without a helper column.'), challenges: [
          O('s_l1_3_3'),
          R('sx_w3_5', 'retail', 'Average unit price', 'K1', '=AVERAGE(I2:I100)', 'In <b>K1</b>, compute the average unit price in <b>I2:I100</b>.', 'Use <code>=AVERAGE(I2:I100)</code>.'),
          R('sx_w3_6', 'retail', 'Revenue of the first 20 lines', 'K1', '=SUMPRODUCT(H2:H21, I2:I21)', 'In <b>K1</b>, compute the revenue (quantity × unit price, added up) of rows 2 to 21.', 'Use <code>=SUMPRODUCT(H2:H21, I2:I21)</code>.')] },
        { title: 'Ratios', example: ex('A share', 'K1:  =COUNTIF(D2:D100, "pickup")/COUNTA(D2:D100)', 'A share is a part divided by the whole. Format it as a percentage, or ROUND it.'), challenges: [
          R('sx_w3_7', 'retail', 'Coffee share of quantity', 'K1', '=SUMIF(G2:G100, "Coffee", H2:H100)/SUM(H2:H100)', 'In <b>K1</b>, compute the share of all quantity (rows 2 to 100) that is <code>Coffee</code>.', 'Part over whole: <code>=SUMIF(G2:G100, "Coffee", H2:H100)/SUM(H2:H100)</code>.'),
          R('sx_w3_8', 'retail', 'Delivery share, rounded', 'K1', '=ROUND(COUNTIF(D2:D100, "delivery")/COUNTA(D2:D100), 2)', 'In <b>K1</b>, compute the share of rows 2 to 100 whose channel is <code>delivery</code>, rounded to 2 decimals.', 'Wrap the share in ROUND: <code>=ROUND(COUNTIF(D2:D100, "delivery")/COUNTA(D2:D100), 2)</code>.'),
          R('sx_w3_9', 'retail', 'Distinct customers', 'K1', '=COUNTA(UNIQUE(E2:E100))', 'In <b>K1</b>, count how many different customer ids appear in <b>E2:E100</b>.', 'UNIQUE then count: <code>=COUNTA(UNIQUE(E2:E100))</code>.')] },
      ] },
      { icon: '🔎', title: 'Lookups and dynamic arrays', about: 'XLOOKUP, INDEX/MATCH, FILTER, SORT, UNIQUE.', levels: [
        { title: 'Lookups', example: ex('XLOOKUP', 'K1:  =XLOOKUP("Latte", F2:F100, I2:I100)', 'XLOOKUP(what, where to look, what to return). INDEX/MATCH and VLOOKUP do the same in older files.'), challenges: [
          O('s_l1_4_2'),
          R('sx_w4_1', 'retail', 'INDEX and MATCH', 'K1', '=INDEX(F2:F100, MATCH(5, A2:A100, 0))', 'In <b>K1</b>, return the product of the first row whose order_id is 5, using INDEX and MATCH.', 'MATCH finds the row, INDEX returns it: <code>=INDEX(F2:F100, MATCH(5, A2:A100, 0))</code>.'),
          R('sx_w4_2', 'retail', 'VLOOKUP', 'K1', '=VLOOKUP(10, A2:F100, 6, FALSE)', 'In <b>K1</b>, use VLOOKUP to return the product (6th column of A:F) of order_id 10, exact match.', 'FALSE means exact match: <code>=VLOOKUP(10, A2:F100, 6, FALSE)</code>.')] },
        { title: 'Dynamic arrays', example: ex('Spill', 'K2:  =SORT(UNIQUE(C2:C100))', 'One formula returns many values that spill into the cells below. Keep those cells empty, or you get #SPILL!.'), challenges: [
          O('s_l1_4_1'), O('s_l1_4_3'), O('s_l1_6_3')] },
        { title: 'Top values', example: ex('LARGE and SMALL', 'K1:  =LARGE(I2:I100, 1)', 'LARGE(range, k) returns the k-th biggest value; SMALL the k-th smallest. TAKE keeps the first rows of a list.'), challenges: [
          R('sx_w4_3', 'retail', 'Second-highest price', 'K1', '=LARGE(I2:I100, 2)', 'In <b>K1</b>, return the second-highest unit price in <b>I2:I100</b>.', 'Use <code>=LARGE(I2:I100, 2)</code>.'),
          R('sx_w4_4', 'retail', 'Cheapest price', 'K1', '=SMALL(I2:I100, 1)', 'In <b>K1</b>, return the lowest unit price in <b>I2:I100</b> using SMALL.', 'Use <code>=SMALL(I2:I100, 1)</code>.'),
          R('sx_w4_5', 'retail', 'First two cities', 'K2', '=TAKE(SORT(UNIQUE(C2:C100)), 2)', 'In <b>K2</b>, spill the first two city names in alphabetical order (from C2:C100, without repeats).', 'Sort the unique list and keep 2: <code>=TAKE(SORT(UNIQUE(C2:C100)), 2)</code>.')] },
        { title: 'Answer business questions', example: ex('FILTER with a condition', 'K2:  =FILTER(A2:A100, D2:D100="pickup")', 'FILTER returns only the rows where the condition is TRUE: a live, self-updating extract.'), challenges: [
          R('sx_w4_6', 'retail', 'Price of a Muffin', 'K1', '=XLOOKUP("Muffin", F2:F100, I2:I100)', 'In <b>K1</b>, look up the unit price of <code>Muffin</code> (product in F, price in I).', 'Use <code>=XLOOKUP("Muffin", F2:F100, I2:I100)</code>.'),
          R('sx_w4_7', 'retail', 'Big lines', 'K2', '=FILTER(A2:A100, H2:H100>=3)', 'In <b>K2</b>, spill the order_id of every row (2 to 100) with a quantity of 3 or more.', 'Use <code>=FILTER(A2:A100, H2:H100>=3)</code>.'),
          R('sx_w4_8', 'retail', 'How many delivery lines', 'K1', '=COUNTA(FILTER(F2:F100, D2:D100="delivery"))', 'In <b>K1</b>, count the delivery rows (2 to 100) by FILTERing the products and counting what comes back.', 'Count the filtered list: <code>=COUNTA(FILTER(F2:F100, D2:D100="delivery"))</code>.')] },
      ] },
      { icon: '📅', title: 'Dates and periods', about: 'Months, weekdays, month ends and labels, a bug hunt and a few dates to predict.', levels: [
        { title: 'Date parts', example: ex('Pieces of a date', 'L2:  =MONTH(B2)\nL3:  =WEEKDAY(B3, 2)', 'A date is a number of days, so it can be split: YEAR, MONTH, DAY, and WEEKDAY (with 2, Monday is 1 and Sunday 7).'), challenges: [
          R('sx_w5_1', 'retail', 'Month number', 'L2', '=MONTH(B2)', 'In <b>L2</b>, the month number (1 to 12) of the order date in <b>B2</b>.', 'Use <code>=MONTH(B2)</code>.'),
          R('sx_w5_2', 'retail', 'Day of the week', 'L2', '=WEEKDAY(B2, 2)', 'In <b>L2</b>, the weekday of <b>B2</b> with Monday as 1 and Sunday as 7.', 'WEEKDAY takes a second argument: <code>=WEEKDAY(B2, 2)</code>.'),
          R('sx_w5_3', 'retail', 'Units sold in March', 'L1', '=SUMPRODUCT((MONTH(B2:B500)=3)*H2:H500)', 'In <b>L1</b>, the total quantity (<b>H</b>) of the rows 2 to 500 dated in March.', 'SUMPRODUCT multiplies a TRUE/FALSE test by the quantities: <code>=SUMPRODUCT((MONTH(B2:B500)=3)*H2:H500)</code>.')] },
        { title: 'Month ends and labels', example: ex('EOMONTH and TEXT', 'L2:  =EOMONTH(B2, 0)\nL3:  =TEXT(B3, "yyyy-mm")', 'EOMONTH(date, 0) is the last day of that month (1 for the next one). TEXT turns a date into a label you choose.'), challenges: [
          R('sx_w5_4', 'retail', 'Days in the month', 'L2', '=DAY(EOMONTH(B2, 0))', 'In <b>L2</b>, how many days the month of <b>B2</b> has.', 'The day number of the month end: <code>=DAY(EOMONTH(B2, 0))</code>.'),
          R('sx_w5_5', 'retail', 'Month label', 'L2', '=TEXT(B2, "yyyy-mm")', 'In <b>L2</b>, a label like <code>2025-03</code> for the date in <b>B2</b>.', 'Use <code>=TEXT(B2, "yyyy-mm")</code>.'),
          R('sx_w5_6', 'retail', 'Days to month end', 'L2', '=EOMONTH(B2, 0)-B2', 'In <b>L2</b>, how many days are left from <b>B2</b> to the end of its month.', 'Dates subtract: <code>=EOMONTH(B2, 0)-B2</code>.')] },
        { title: 'Bug hunt', example: ex('Read the references', 'L2:  =MONTH(B2)   ✔\nL2:  =MONTH(C2)   ✘ C is a city', 'Most spreadsheet bugs are a wrong column or a range that stops too early. Click the formula and look at the coloured ranges.'), challenges: [
          E(R('sx_w5_7', 'retail', 'The wrong column', 'L2', '=MONTH(B2)', 'A colleague\'s formula in <b>L2</b> should give the order month, but shows an error. Fix it.', 'The date is in column B.'), { type: 'bug', starter: [['L2', '=MONTH(C2)']] }),
          E(R('sx_w5_8', 'retail', 'The short range', 'L1', '=SUM(H2:H500)', '<b>L1</b> should add up the quantity of all rows 2 to 500, but the total is too small. Fix it.', 'The range stops at row 50.'), { type: 'bug', starter: [['L1', '=SUM(H2:H50)']] }),
          E(R('sx_w5_9', 'retail', 'The wrong month end', 'L2', '=EOMONTH(B2, 0)-B2', '<b>L2</b> should count the days to the end of the order\'s own month, but it counts too many. Fix it.', 'EOMONTH(date, 1) is the end of the NEXT month.'), { type: 'bug', starter: [['L2', '=EOMONTH(B2, 1)-B2']] })] },
        { title: 'Predict the date', example: ex('Think first', '=EOMONTH(DATE(2025,1,15), 0)   → 31 January 2025', 'DATE(year, month, day) builds a date; the other functions take it apart.'), challenges: [
          PS('sx_w5_10', 'retail', 'February', '=DAY(EOMONTH(DATE(2025,2,10),0))', ['31', '28', '10', '29'], 1, '2025 is not a leap year, so February ends on the 28th.'),
          PS('sx_w5_11', 'retail', 'A Thursday', '=WEEKDAY(DATE(2025,11,13), 2)', ['5', '13', '4', '3'], 2, '13 November 2025 is a Thursday: Monday 1, so Thursday 4.'),
          PS('sx_w5_12', 'retail', 'New year', '=YEAR(DATE(2025,12,31)+1)', ['2025', '2026', '1', '366'], 1, 'One day after 31 December is 1 January of the next year.')] },
      ] },
      { icon: '🧽', title: 'Cleaning gauntlet', about: 'The messy file again: names, cities, prices and quantities, cleaned step by step.', levels: [
        { title: 'Text and case', example: ex('Nest the cleaners', 'H2:  =PROPER(TRIM(C2))', 'The inner function runs first: TRIM removes spaces, then PROPER capitalises each word.'), challenges: [
          R('sx_w6_1', 'messy', 'Clean customer name', 'H2', '=PROPER(TRIM(C2))', MESSY + ' In <b>H2</b>, the customer name in <b>C2</b> without extra spaces and with capitals at the start of each word.', 'Use <code>=PROPER(TRIM(C2))</code>.'),
          R('sx_w6_2', 'messy', 'One spelling per city', 'H2', '=LOWER(TRIM(G2))', 'In <b>H2</b>, the city in <b>G2</b> trimmed and in lower case.', 'Use <code>=LOWER(TRIM(G2))</code>.'),
          R('sx_w6_3', 'messy', 'How many extra spaces', 'H2', '=LEN(D2)-LEN(TRIM(D2))', 'In <b>H2</b>, how many characters TRIM removes from the product in <b>D2</b>.', 'Compare the lengths: <code>=LEN(D2)-LEN(TRIM(D2))</code>.')] },
        { title: 'Numbers and blanks', example: ex('Fix, then fall back', 'H2:  =IFERROR(VALUE(SUBSTITUTE(F2, "$", "")), 0)', 'SUBSTITUTE removes the $, VALUE makes a number, and IFERROR gives a safe value when the text is not a number at all.'), challenges: [
          R('sx_w6_4', 'messy', 'A clean price', 'H2', '=IFERROR(VALUE(SUBSTITUTE(F2, "$", "")), 0)', 'In <b>H2</b>, the price in <b>F2</b> as a number, without the $ sign, or 0 when it cannot be read.', 'Nest SUBSTITUTE in VALUE in IFERROR.'),
          R('sx_w6_5', 'messy', 'Filled-in names', 'J1', '=COUNTA(C2:C129)', 'In <b>J1</b>, count how many customer names in <b>C2:C129</b> are filled in.', 'COUNTA counts cells that are not empty.'),
          R('sx_w6_6', 'messy', 'A missing quantity', 'H2', '=IF(E2="", 1, E2)', 'In <b>H2</b>, the quantity in <b>E2</b>, or 1 when it is empty.', 'Use <code>=IF(E2="", 1, E2)</code>.')] },
        { title: 'Predict the cleaning', example: ex('What comes out', '=TRIM("  two  words ")   → "two words"', 'TRIM keeps one space between words and none at the ends.'), challenges: [
          PS('sx_w6_7', 'messy', 'Trimmed', '=TRIM("  Latte  ")', ['  Latte', 'Latte', 'Latte  ', '5'], 1, 'TRIM removes the spaces at both ends.'),
          PS('sx_w6_8', 'messy', 'Proper case', '=PROPER("oat LATTE")', ['OAT LATTE', 'Oat latte', 'Oat Latte', 'oat latte'], 2, 'PROPER capitalises the first letter of each word and lowers the rest.'),
          PS('sx_w6_9', 'messy', 'A price from text', '=VALUE(SUBSTITUTE("$4.50", "$", ""))', ['4.5', '$4.50', '450', '#VALUE!'], 0, 'Without the $ the text "4.50" becomes the number 4.5.')] },
        { title: 'The gauntlet', example: ex('One step per column', 'H2:  =TRIM(D2)\nI2:  =PROPER(H2)\nJ2:  =IF(I2="", "Unknown", I2)', 'Each step in its own column is easy to check, and easy to fix when the data changes.'), challenges: [
          G('sx_w6_10', 'messy', 'Clean product names', [['H2', '=TRIM(D2)'], ['I2', '=PROPER(H2)'], ['J2', '=IF(I2="", "Unknown", I2)']], 'Three steps on row 2: <b>H2</b> trims the product in D2, <b>I2</b> applies PROPER to H2, <b>J2</b> shows "Unknown" when I2 is empty.', 'One formula per cell, each using the cell before.',
            { type: 'gauntlet', checklist: ['H2: remove the extra spaces from D2.', 'I2: capitals at the start of each word.', 'J2: "Unknown" when the result is empty.'] }),
          G('sx_w6_11', 'messy', 'Price with tax', [['H2', '=SUBSTITUTE(F2, "$", "")'], ['I2', '=IFERROR(VALUE(H2), 0)'], ['J2', '=ROUND(I2*1.21, 2)']], '<b>H2</b> removes the $ from F2, <b>I2</b> turns it into a number (0 if it fails), <b>J2</b> adds 21% tax, rounded to 2 decimals.', 'SUBSTITUTE, then IFERROR(VALUE()), then ROUND(...*1.21, 2).',
            { type: 'gauntlet', checklist: ['H2: drop the $ sign.', 'I2: a number, or 0.', 'J2: add 21% and round to 2 decimals.'] }),
          G('sx_w6_12', 'messy', 'Line value', [['H2', '=IFERROR(VALUE(SUBSTITUTE(F2, "$", "")), 0)'], ['I2', '=IF(E2="", 1, E2)'], ['J2', '=H2*I2']], '<b>H2</b> is the clean price, <b>I2</b> the quantity with 1 when empty, <b>J2</b> the line value (price × quantity).', 'Reuse the two cleaning formulas, then multiply.',
            { type: 'gauntlet', checklist: ['H2: the clean price.', 'I2: the quantity, 1 when empty.', 'J2: price × quantity.'] })] },
      ] },
      { icon: '📱', title: 'The app funnel', about: 'App events in a sheet: count each step, compute conversion rates, answer the team and translate SQL.', levels: [
        { title: 'Count the steps', example: ex('COUNTIF and COUNTIFS', 'H1:  =COUNTIF(E2:E500, "purchase")\nH2:  =COUNTIFS(E2:E500, "purchase", F2:F500, "ios")', 'COUNTIF counts the rows that match one condition; COUNTIFS needs every condition to be true.'), challenges: [
          R('sx_w7_1', 'funnel', 'App opens', 'H1', '=COUNTIF(E2:E500, "open_app")', FUNNEL + ' In <b>H1</b>, count the <code>open_app</code> events.', 'Use <code>=COUNTIF(E2:E500, "open_app")</code>.'),
          R('sx_w7_2', 'funnel', 'Purchases', 'H2', '=COUNTIF(E2:E500, "purchase")', 'In <b>H2</b>, count the <code>purchase</code> events.', 'COUNTIF on column E.'),
          R('sx_w7_3', 'funnel', 'Web purchases', 'H3', '=COUNTIFS(E2:E500, "purchase", F2:F500, "web")', 'In <b>H3</b>, count the purchases made on the <code>web</code> platform.', 'Two conditions: COUNTIFS on E and F.')] },
        { title: 'Conversion rates', example: ex('A rate is a ratio', 'H4:  =ROUND(COUNTIF(E2:E500, "purchase") / COUNTIF(E2:E500, "open_app"), 3)', 'Divide the later step by the earlier one. Round only at the end.'), challenges: [
          R('sx_w7_4', 'funnel', 'Open to purchase', 'H4', '=ROUND(COUNTIF(E2:E500,"purchase")/COUNTIF(E2:E500,"open_app"),3)', 'In <b>H4</b>, purchases divided by app opens, rounded to 3 decimals.', 'Two COUNTIFs, divided, inside ROUND(..., 3).'),
          R('sx_w7_5', 'funnel', 'Cart to checkout', 'H5', '=ROUND(COUNTIF(E2:E500,"checkout")/COUNTIF(E2:E500,"add_to_cart"),3)', 'In <b>H5</b>, checkouts divided by add-to-cart events, rounded to 3.', 'The same pattern with the two middle steps.'),
          R('sx_w7_6', 'funnel', 'iOS conversion', 'H6', '=ROUND(COUNTIFS(E2:E500,"purchase",F2:F500,"ios")/COUNTIFS(E2:E500,"open_app",F2:F500,"ios"),3)', 'In <b>H6</b>, purchases divided by app opens for <code>ios</code> only, rounded to 3.', 'Use COUNTIFS on both sides of the division.')] },
        { title: 'Requests from the team', example: ex('People, not rows', 'H7:  =COUNTA(UNIQUE(B2:B500))', 'UNIQUE keeps one copy of each user id; COUNTA counts them. Events are not people.'), challenges: [
          E(R('sx_w7_7', 'funnel', 'How many people?', 'H7', '=COUNTA(UNIQUE(B2:B500))', 'In <b>H7</b>, count the different users in <b>B2:B500</b>.', 'Use <code>=COUNTA(UNIQUE(B2:B500))</code>.'),
            { type: 'ask', ask: { who: 'Kai (app)', says: 'How many people opened the app in this sample?', q: 'What should you count?', answer: 1, why: 'People are users: count each user id once, not every event.', options: ['Every row of the sheet', 'The different user ids', 'The open_app events', 'The sessions'] } }),
          E(R('sx_w7_8', 'funnel', 'Which platform buys?', 'H8', '=COUNTIFS(E2:E500, "purchase", F2:F500, "android")', 'In <b>H8</b>, count the purchases on <code>android</code>.', 'COUNTIFS on E and F.'),
            { type: 'ask', ask: { who: 'Theo (marketing)', says: 'Which platform buys the most?', q: 'Where do you start?', answer: 0, why: 'Count purchases per platform first; then compare with how many people use each one.', options: ['Count purchases per platform', 'Count all events per platform', 'Look at the first row only', 'Ask for more data first'] } }),
          E(R('sx_w7_9', 'funnel', 'Events per session', 'H9', '=ROUND(COUNTA(A2:A500)/COUNTA(UNIQUE(C2:C500)),2)', 'In <b>H9</b>, the number of events divided by the number of different sessions, rounded to 2.', 'COUNTA of the ids divided by COUNTA(UNIQUE()) of the sessions.'),
            { type: 'ask', ask: { who: 'Rosa (operations)', says: 'Are visits to the app long?', q: 'Which number answers it in this sheet?', answer: 2, why: 'With no durations, the number of steps per session is a fair measure of how long a visit is.', options: ['The latest event time', 'The number of users', 'Events per session', 'The number of purchases'] } })] },
        { title: 'Rosetta: SQL to formulas', example: ex('Same question', "SELECT COUNT(*) FROM events WHERE event_name = 'view_menu'\n=COUNTIF(E2:E500, \"view_menu\")", 'WHERE becomes a criterion, COUNT(*) becomes COUNTIF, AND becomes another pair in COUNTIFS.'), challenges: [
          E(R('sx_w7_10', 'funnel', 'Menu views', 'H10', '=COUNTIF(E2:E500, "view_menu")', 'In <b>H10</b>, write the formula version of the given SQL.', 'COUNT(*) with one WHERE is COUNTIF.'), { type: 'rosetta', given: { lang: 'SQL', code: "SELECT COUNT(*)\nFROM events\nWHERE event_name = 'view_menu';" } }),
          E(R('sx_w7_11', 'funnel', 'iOS purchases', 'H11', '=COUNTIFS(E2:E500, "purchase", F2:F500, "ios")', 'In <b>H11</b>, write the formula version of the given SQL.', 'Two WHERE conditions joined by AND: COUNTIFS.'), { type: 'rosetta', given: { lang: 'SQL', code: "SELECT COUNT(*)\nFROM events\nWHERE event_name = 'purchase' AND platform = 'ios';" } }),
          E(R('sx_w7_12', 'funnel', 'Last session', 'H12', '=MAX(C2:C500)', 'In <b>H12</b>, write the formula version of the given SQL.', 'MAX works the same way.'), { type: 'rosetta', given: { lang: 'SQL', code: 'SELECT MAX(session_id)\nFROM events;' } })] },
      ] },
      { icon: '☕', title: 'Dot Club', about: 'Members of the coffee subscription: MRR, churn, a case file and the month-end close.', levels: [
        { title: 'MRR and plans', example: ex('Sum with a condition', 'H1:  =SUMPRODUCT((E2:E437="")*F2:F437)', 'An empty cancel date means the member is active. (E2:E437="") is 1 or 0, so SUMPRODUCT adds the prices of active members only.'), challenges: [
          R('sx_w8_1', 'members', 'Monthly recurring revenue', 'H1', '=ROUND(SUMPRODUCT((E2:E437="")*F2:F437), 2)', CLUB + ' In <b>H1</b>, the monthly price of all active members added up, rounded to 2.', 'Use <code>=ROUND(SUMPRODUCT((E2:E437="")*F2:F437), 2)</code>.'),
          R('sx_w8_2', 'members', 'Family members', 'H2', '=COUNTIF(C2:C437, "family")', 'In <b>H2</b>, count the members on the <code>family</code> plan.', 'COUNTIF on column C.'),
          R('sx_w8_3', 'members', 'Basic members who left', 'H3', '=COUNTIFS(C2:C437, "basic", E2:E437, "<>")', 'In <b>H3</b>, count the <code>basic</code> members with a cancel date.', 'The criterion "&lt;&gt;" means "not empty".')] },
        { title: 'Churn', example: ex('Share who left', 'H4:  =ROUND(COUNTA(E2:E437)/COUNTA(A2:A437), 3)', 'COUNTA counts the filled cancel dates (members who left); divide by all members.'), challenges: [
          R('sx_w8_4', 'members', 'Churn rate', 'H4', '=ROUND(COUNTA(E2:E437)/COUNTA(A2:A437),3)', 'In <b>H4</b>, the share of members who cancelled, rounded to 3.', 'Filled cancel dates divided by all members.'),
          R('sx_w8_5', 'members', 'Basic churn', 'H5', '=ROUND(COUNTIFS(C2:C437,"basic",E2:E437,"<>")/COUNTIF(C2:C437,"basic"),3)', 'In <b>H5</b>, the churn rate of the <code>basic</code> plan, rounded to 3.', 'Basic members who left, divided by all basic members.'),
          R('sx_w8_6', 'members', 'Family churn', 'H6', '=ROUND(COUNTIFS(C2:C437,"family",E2:E437,"<>")/COUNTIF(C2:C437,"family"),3)', 'In <b>H6</b>, the churn rate of the <code>family</code> plan, rounded to 3.', 'The same pattern for family.')] },
        { title: 'Case file', example: ex('Compare, then conclude', 'H7:  =ROUND(COUNTIFS(C2:C437,"plus",E2:E437,"<>")/COUNTIF(C2:C437,"plus"), 3)', 'Put the three plans side by side before you say which one has a problem.'), challenges: [
          E(R('sx_w8_7', 'members', 'Plus churn', 'H7', '=ROUND(COUNTIFS(C2:C437,"plus",E2:E437,"<>")/COUNTIF(C2:C437,"plus"),3)', 'In <b>H7</b>, the churn rate of the <code>plus</code> plan, rounded to 3.', 'The same pattern as basic and family.'),
            { type: 'case', finding: { q: 'Comparing the three plans, which one loses the largest share of members?', options: ['basic', 'plus', 'family', 'All the same'], answer: 0, why: 'The cheapest plan churns the most. Next question: is it price, or who chooses that plan?' } }),
          E(R('sx_w8_8', 'members', 'Revenue that left', 'H8', '=ROUND(SUMPRODUCT((E2:E437<>"")*F2:F437), 2)', 'In <b>H8</b>, the monthly price of all members who cancelled, added up and rounded to 2.', 'The opposite condition: (E2:E437&lt;&gt;"").'), { type: 'case' }),
          E(R('sx_w8_9', 'members', 'November starters', 'H9', '=COUNTIFS(D2:D437, ">="&DATE(2025,11,1), D2:D437, "<"&DATE(2025,12,1))', 'In <b>H9</b>, count the members who started in November 2025.', 'Two date conditions: <code>">="&DATE(2025,11,1)</code> and <code>"&lt;"&DATE(2025,12,1)</code>.'), { type: 'case' })] },
        { title: 'Boss: month-end close', example: ex('Numbers for the close', 'H10:  =SUMPRODUCT((E2:E437="")*F2:F437)*12', 'Annual run rate is this month\'s recurring revenue times 12: a quick way to talk about scale.'), challenges: [
          E(R('sx_w8_10', 'members', 'Annual run rate', 'H10', '=ROUND(SUMPRODUCT((E2:E437="")*F2:F437)*12, 2)', 'In <b>H10</b>, the MRR of active members times 12, rounded to 2.', 'The MRR formula times 12, inside ROUND(..., 2).'), { type: 'boss' }),
          E(R('sx_w8_11', 'members', 'Revenue per active member', 'H11', '=ROUND(SUMPRODUCT((E2:E437="")*F2:F437)/COUNTBLANK(E2:E437),2)', 'In <b>H11</b>, MRR divided by the number of active members, rounded to 2.', 'COUNTBLANK counts the empty cancel dates.'), { type: 'boss' }),
          E(R('sx_w8_12', 'members', 'Family MRR', 'H12', '=ROUND(SUMPRODUCT((C2:C437="family")*(E2:E437="")*F2:F437),2)', 'In <b>H12</b>, the monthly price of active <code>family</code> members added up, rounded to 2.', 'Multiply two conditions and the price inside SUMPRODUCT.'),
            { type: 'boss', finding: { q: 'Family members are fewer than basic members. Why can the family MRR still be large?', options: ['Family members never cancel', 'Each family member pays the most per month', 'The formula counts members twice', 'Family has more members'], answer: 1, why: 'Revenue is members × price: a smaller group on a higher price can earn as much.' } })] },
      ] },
    ],
  };
})();
