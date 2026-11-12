/* DotSheets worlds, levels and challenges: the 21 original challenges plus new ones checked against a reference formula. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  S.ROWS_LOADED = 500;
  S.datasetCsv = function (ds) { return ds === 'messy' ? DA.gen.messyCsv() : DA.gen.retailCsv(); };
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
    xp: function (c) { return DA.ui.XP.sheet(c.level.world.n); },
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
    ],
  };
})();
