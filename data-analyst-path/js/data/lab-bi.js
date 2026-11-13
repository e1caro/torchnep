/* DotBI worlds, levels and challenges: DAX measures and Tableau calculations checked against a reference, in total and per member. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var n = 0;
  function C(mode, by, title, task, hint, solution, extra) {
    n++;
    var c = { id: 'bi' + (n < 10 ? '0' : '') + n, mode: mode, by: by, title: title, task: task, hint: hint, solution: solution };
    Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; });
    return c;
  }
  function X(by, title, task, hint, solution, extra) { return C('dax', by, title, task, hint, solution, extra); }
  function Y(by, title, task, hint, solution, extra) { return C('tableau', by, title, task, hint, solution, extra); }
  function K(by, title, task, hint, solution, extra) { var e = extra || {}; e.model = 'club'; return C('dax', by, title, task, hint, solution, e); }
  function PR(mode, title, code, options, answer, why) { return C(mode, null, title, 'Without evaluating it: what is the total of this ' + (mode === 'dax' ? 'measure' : 'calculation') + '?', 'Work it out from the inside.', code, { type: 'predict', code: code, options: options, answer: answer, why: why }); }
  var MONTH = 'Sales[month]', PLAN = 'Members[plan]', IMONTH = 'Invoices[month]', SMONTH = 'Members[start_month]';
  var REV = 'SUMX(Sales, Sales[qty] * Sales[unit_price])';
  function D(by, title, task, hint, solution) { return C('dax', by, title, task, hint, solution); }
  function T(by, title, task, hint, solution) { return C('tableau', by, title, task, hint, solution); }
  function ex(title, code, explain) { return { title: title, code: code, explain: explain }; }
  var CITY = 'Sales[store_city]', CH = 'Sales[channel]', CAT = 'Sales[category]', PROD = 'Sales[product]', SEG = 'Customers[segment]';

  DA.labBI = {
    id: 'bi', route: 'bi', quest: 'lesson',
    tagline: 'Power BI measures (DAX) and Tableau calculations on a small café data model: see every result as a card, a matrix and a chart.',
    help: 'Type a measure and press Enter (or Evaluate). The café model has two tables: Sales (one row per order line, with a month field) and Customers, linked by customer_id; World 8 uses the Dot Club model (Members and Invoices). Choose a field in "Rows" to see the measure for each value, like a Power BI matrix: the chart follows. Check compares your measure with the answer in total and for every row of the matrix, so it must be right in every filter context. Tableau challenges use [field] names and { FIXED [dim] : ... }.',
    xpKey: function (c) { return 'bi:' + c.id; },
    xp: function (c) { return 15 * Math.min(6, c.level.world.n); },
    worlds: [
      { icon: '📏', title: 'DAX measures', about: 'Aggregations, iterators like SUMX and safe ratios with DIVIDE.', levels: [
        { title: 'Aggregations', example: ex('A first measure', 'SUM(Sales[qty])', 'A measure aggregates a column. Power BI evaluates it again for every cell of a visual, using that cell as the filter.'), challenges: [
          D(CITY, 'Units sold', 'Write a measure for the total quantity sold.', 'Use <code>SUM(Sales[qty])</code>.', 'SUM(Sales[qty])'),
          D(CITY, 'Average price', 'Write a measure for the average unit price.', 'Use <code>AVERAGE(Sales[unit_price])</code>.', 'AVERAGE(Sales[unit_price])'),
          D(CITY, 'Order lines', 'Write a measure that counts the rows of the Sales table.', 'Use <code>COUNTROWS(Sales)</code>.', 'COUNTROWS(Sales)')] },
        { title: 'Distinct and extremes', example: ex('DISTINCTCOUNT', 'DISTINCTCOUNT(Sales[order_id])', 'One order has several lines: DISTINCTCOUNT counts each order once.'), challenges: [
          D(CITY, 'Customers', 'Count the different customers who bought.', 'Use <code>DISTINCTCOUNT(Sales[customer_id])</code>.', 'DISTINCTCOUNT(Sales[customer_id])'),
          D(CAT, 'Highest price', 'Write a measure for the highest unit price.', 'Use <code>MAX(Sales[unit_price])</code>.', 'MAX(Sales[unit_price])'),
          D(CITY, 'Orders', 'Count the orders (not the lines).', 'Count distinct order ids: <code>DISTINCTCOUNT(Sales[order_id])</code>.', 'DISTINCTCOUNT(Sales[order_id])')] },
        { title: 'Row by row: SUMX', example: ex('Revenue', 'SUMX(Sales, Sales[qty] * Sales[unit_price])', 'SUMX goes through every row, computes the expression, then adds up. SUM cannot multiply two columns.'), challenges: [
          D(CITY, 'Revenue', 'Write a revenue measure: quantity × unit price, added up.', 'Use <code>SUMX(Sales, Sales[qty] * Sales[unit_price])</code>.', 'SUMX(Sales, Sales[qty] * Sales[unit_price])'),
          D(CH, 'Average line revenue', 'Write the average revenue (qty × unit price) of a line.', 'The X version of AVERAGE: <code>AVERAGEX(Sales, ...)</code>.', 'AVERAGEX(Sales, Sales[qty] * Sales[unit_price])'),
          D(CITY, 'Revenue with tax', 'Write the revenue including 21% tax.', 'Multiply inside SUMX: <code>Sales[qty] * Sales[unit_price] * 1.21</code>.', 'SUMX(Sales, Sales[qty] * Sales[unit_price] * 1.21)')] },
        { title: 'Ratios with DIVIDE', example: ex('Safe division', 'DIVIDE(SUM(Sales[qty]), DISTINCTCOUNT(Sales[order_id]))', 'DIVIDE returns a blank instead of an error when the denominator is zero.'), challenges: [
          D(CITY, 'Units per order', 'Average units per order: total quantity divided by the number of orders.', 'Use <code>DIVIDE(SUM(Sales[qty]), DISTINCTCOUNT(Sales[order_id]))</code>.', 'DIVIDE(SUM(Sales[qty]), DISTINCTCOUNT(Sales[order_id]))'),
          D(CH, 'Average order value', 'Revenue divided by the number of orders.', 'Revenue is a SUMX; orders are a DISTINCTCOUNT.', 'DIVIDE(SUMX(Sales, Sales[qty] * Sales[unit_price]), DISTINCTCOUNT(Sales[order_id]))'),
          D(CITY, 'Lines per customer', 'Order lines divided by the number of different customers.', 'Use <code>DIVIDE(COUNTROWS(Sales), DISTINCTCOUNT(Sales[customer_id]))</code>.', 'DIVIDE(COUNTROWS(Sales), DISTINCTCOUNT(Sales[customer_id]))')] },
      ] },
      { icon: '🎛️', title: 'Filter context and CALCULATE', about: 'Change the filters a measure sees: conditions, FILTER and ALL.', levels: [
        { title: 'One filter', example: ex('CALCULATE', 'CALCULATE(SUM(Sales[qty]), Sales[channel] = "pickup")', 'CALCULATE evaluates a measure with changed filters. The condition replaces any filter on that column.'), challenges: [
          D(CITY, 'Delivery units', 'Total quantity of <code>delivery</code> orders, whatever channel the visual shows.', 'Use <code>CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery")</code>.', 'CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery")'),
          D(CITY, 'Coffee lines', 'Count the Sales rows of the <code>Coffee</code> category.', 'Use <code>CALCULATE(COUNTROWS(Sales), Sales[category] = "Coffee")</code>.', 'CALCULATE(COUNTROWS(Sales), Sales[category] = "Coffee")'),
          D(CH, 'Madrid units', 'Total quantity sold in <code>Madrid</code>, shown per channel.', 'Filter on store_city inside CALCULATE.', 'CALCULATE(SUM(Sales[qty]), Sales[store_city] = "Madrid")')] },
        { title: 'Several filters', example: ex('AND between filters', 'CALCULATE(SUM(Sales[qty]), Sales[category] = "Tea", Sales[channel] = "delivery")', 'Each extra filter argument narrows the rows (they are combined with AND).'), challenges: [
          D(CITY, 'Coffee by pickup', 'Total quantity of <code>Coffee</code> sold through <code>pickup</code>.', 'Two filter arguments in CALCULATE.', 'CALCULATE(SUM(Sales[qty]), Sales[category] = "Coffee", Sales[channel] = "pickup")'),
          D(CITY, 'Big lines', 'Count the Sales rows with a quantity of 2 or more.', 'Use <code>Sales[qty] >= 2</code> as the filter.', 'CALCULATE(COUNTROWS(Sales), Sales[qty] >= 2)'),
          D(CAT, 'Two cities', 'Total quantity sold in <code>Paris</code> or <code>Lisbon</code>.', 'Use IN: <code>Sales[store_city] IN {"Paris", "Lisbon"}</code>.', 'CALCULATE(SUM(Sales[qty]), Sales[store_city] IN {"Paris", "Lisbon"})')] },
        { title: 'FILTER tables', example: ex('FILTER', 'COUNTROWS(FILTER(Sales, Sales[qty] * Sales[unit_price] > 10))', 'FILTER returns the rows of a table that meet a condition: use it when the condition needs a calculation or several columns.'), challenges: [
          D(CITY, 'Units of pricier items', 'Total quantity of lines with a unit price above 4, using FILTER.', 'Use <code>CALCULATE(SUM(Sales[qty]), FILTER(Sales, Sales[unit_price] > 4))</code>.', 'CALCULATE(SUM(Sales[qty]), FILTER(Sales, Sales[unit_price] > 4))'),
          D(CH, 'Lines above 10', 'Count the lines whose revenue (qty × unit price) is above 10.', 'COUNTROWS of a FILTER with a calculated condition.', 'COUNTROWS(FILTER(Sales, Sales[qty] * Sales[unit_price] > 10))'),
          D(CITY, 'Delivery revenue', 'Revenue (qty × unit price) of the <code>delivery</code> lines only.', 'Iterate a filtered table: <code>SUMX(FILTER(Sales, ...), ...)</code>.', 'SUMX(FILTER(Sales, Sales[channel] = "delivery"), Sales[qty] * Sales[unit_price])')] },
        { title: 'Remove filters: ALL', example: ex('Share of total', 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales)))', 'ALL removes filters, so the denominator is always the grand total: the classic "% of total".'), challenges: [
          D(CITY, 'Share of all units', 'Each row\'s share of the grand total quantity (a fraction between 0 and 1).', 'Divide by <code>CALCULATE(SUM(Sales[qty]), ALL(Sales))</code>.', 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales)))'),
          D(CITY, 'Ignore the city', 'Total quantity that ignores any city filter (the same number on every row).', 'Use <code>ALL(Sales[store_city])</code> inside CALCULATE.', 'CALCULATE(SUM(Sales[qty]), ALL(Sales[store_city]))'),
          D(CITY, 'Coffee share', 'Within each row, the share of the quantity that is <code>Coffee</code>.', 'Coffee quantity divided by all quantity: <code>DIVIDE(CALCULATE(SUM(Sales[qty]), Sales[category] = "Coffee"), SUM(Sales[qty]))</code>.', 'DIVIDE(CALCULATE(SUM(Sales[qty]), Sales[category] = "Coffee"), SUM(Sales[qty]))')] },
      ] },
      { icon: '🔗', title: 'The data model', about: 'Relationships, RELATED, IF and variables.', levels: [
        { title: 'Filters follow relationships', example: ex('Slice by a dimension', 'SUM(Sales[qty])   with Rows = Customers[segment]', 'Customers filters Sales through customer_id: a measure on Sales can be split by any Customers column.'), challenges: [
          D(SEG, 'Units per segment', 'Total quantity, shown per customer segment.', 'Just <code>SUM(Sales[qty])</code>: the relationship does the work.', 'SUM(Sales[qty])'),
          D(SEG, 'Buyers per segment', 'Number of different customers who bought, per segment.', 'Use <code>DISTINCTCOUNT(Sales[customer_id])</code>.', 'DISTINCTCOUNT(Sales[customer_id])'),
          D(SEG, 'Registered customers', 'Number of rows of the Customers table, per segment.', 'Use <code>COUNTROWS(Customers)</code>.', 'COUNTROWS(Customers)')] },
        { title: 'RELATED in a row context', example: ex('RELATED', 'SUMX(Sales, IF(RELATED(Customers[segment]) = "student", Sales[qty], 0))', 'Inside SUMX or FILTER on Sales, RELATED fetches a value from the related Customers row.'), challenges: [
          D(CITY, 'Student units', 'Total quantity bought by <code>student</code> customers, using SUMX and RELATED.', 'Use <code>SUMX(Sales, IF(RELATED(Customers[segment]) = "student", Sales[qty], 0))</code>.', 'SUMX(Sales, IF(RELATED(Customers[segment]) = "student", Sales[qty], 0))'),
          D(CH, 'Buying at home', 'Count the lines where the customer\'s city equals the store city.', 'COUNTROWS(FILTER(Sales, RELATED(Customers[city]) = Sales[store_city])).', 'COUNTROWS(FILTER(Sales, RELATED(Customers[city]) = Sales[store_city]))'),
          D(CITY, 'Retired units', 'Total quantity bought by <code>retired</code> customers, using CALCULATE with a Customers filter.', 'Use <code>CALCULATE(SUM(Sales[qty]), Customers[segment] = "retired")</code>.', 'CALCULATE(SUM(Sales[qty]), Customers[segment] = "retired")')] },
        { title: 'IF and rounding', example: ex('IF on a measure', 'IF(SUM(Sales[qty]) > 1500, 1, 0)', 'IF works on measures too: useful for flags and thresholds.'), challenges: [
          D(CITY, 'Big city flag', 'Return 1 where the total quantity is above 1,500, otherwise 0.', 'Use <code>IF(SUM(Sales[qty]) > 1500, 1, 0)</code>.', 'IF(SUM(Sales[qty]) > 1500, 1, 0)'),
          D(CAT, 'Price per unit', 'Revenue divided by units, rounded to 2 decimals.', 'Use <code>ROUND(DIVIDE(SUMX(...), SUM(Sales[qty])), 2)</code>.', 'ROUND(DIVIDE(SUMX(Sales, Sales[qty] * Sales[unit_price]), SUM(Sales[qty])), 2)'),
          D(CH, 'Delivery or blank', 'The total quantity only for the delivery channel; blank for the others.', 'Compare the channel with an aggregation, e.g. <code>IF(MIN(Sales[channel]) = "delivery", SUM(Sales[qty]))</code>.', 'IF(MIN(Sales[channel]) = "delivery", SUM(Sales[qty]))')] },
        { title: 'Variables', example: ex('VAR and RETURN', 'VAR units = SUM(Sales[qty])\nVAR orders = DISTINCTCOUNT(Sales[order_id])\nRETURN DIVIDE(units, orders)', 'Variables name steps of a measure: easier to read and each one is computed once.'), challenges: [
          D(CITY, 'Order value with VAR', 'Average order value written with two variables (revenue and orders).', 'VAR rev = SUMX(...) VAR orders = DISTINCTCOUNT(...) RETURN DIVIDE(rev, orders).', 'VAR rev = SUMX(Sales, Sales[qty] * Sales[unit_price])\nVAR orders = DISTINCTCOUNT(Sales[order_id])\nRETURN DIVIDE(rev, orders)'),
          D(CAT, 'Share with VAR', 'Share of the grand total quantity, with the total in a variable.', 'VAR total = CALCULATE(SUM(Sales[qty]), ALL(Sales)) RETURN DIVIDE(SUM(Sales[qty]), total).', 'VAR total = CALCULATE(SUM(Sales[qty]), ALL(Sales))\nRETURN DIVIDE(SUM(Sales[qty]), total)'),
          D(CITY, 'Share of big lines', 'Share of the lines that have a quantity of 2 or more.', 'VAR big = COUNTROWS(FILTER(Sales, Sales[qty] >= 2)) RETURN DIVIDE(big, COUNTROWS(Sales)).', 'VAR big = COUNTROWS(FILTER(Sales, Sales[qty] >= 2))\nRETURN DIVIDE(big, COUNTROWS(Sales))')] },
      ] },
      { icon: '🧭', title: 'Tableau calculations and LOD', about: 'Calculated fields, IIF, dates and FIXED level of detail.', levels: [
        { title: 'Calculated fields', example: ex('Aggregate a field', 'SUM([qty] * [unit_price])', 'In Tableau, fields are written in brackets. Row-level arithmetic goes inside the aggregation.'), challenges: [
          T(CITY, 'Units (Tableau)', 'Total quantity as a Tableau calculation.', 'Use <code>SUM([qty])</code>.', 'SUM([qty])'),
          T(CITY, 'Revenue (Tableau)', 'Revenue: quantity × unit price, added up.', 'Use <code>SUM([qty] * [unit_price])</code>.', 'SUM([qty] * [unit_price])'),
          T(CH, 'Distinct customers', 'Count the different customers.', 'Tableau uses <code>COUNTD([customer_id])</code>.', 'COUNTD([customer_id])')] },
        { title: 'IIF and conditions', example: ex('Conditional sum', 'SUM(IIF([channel] = "pickup", [qty], 0))', 'IIF(test, then, else) works row by row; the aggregation then adds the results.'), challenges: [
          T(CITY, 'Delivery units', 'Total quantity of delivery lines.', 'Use <code>SUM(IIF([channel] = "delivery", [qty], 0))</code>.', 'SUM(IIF([channel] = "delivery", [qty], 0))'),
          T(CITY, 'Count big lines', 'Count the lines with a quantity of 2 or more.', 'Sum 1 for each big line: <code>SUM(IIF([qty] >= 2, 1, 0))</code>.', 'SUM(IIF([qty] >= 2, 1, 0))'),
          T(CH, 'Coffee price', 'Average unit price of the Coffee lines only.', 'NULL is ignored by AVG: <code>AVG(IIF([category] = "Coffee", [unit_price], NULL))</code>.', 'AVG(IIF([category] = "Coffee", [unit_price], NULL))')] },
        { title: 'FIXED level of detail', example: ex('{ FIXED }', 'AVG({ FIXED [customer_id] : SUM([qty]) })', 'FIXED computes a value per customer (or per any dimension), whatever the view shows. Wrap it in an aggregation to use it in the view.'), challenges: [
          T(CITY, 'Share of the grand total', 'Each city\'s quantity as a share of the grand total, using { FIXED : SUM([qty]) } for the total.', 'Use <code>SUM([qty]) / MIN({ FIXED : SUM([qty]) })</code>.', 'SUM([qty]) / MIN({ FIXED : SUM([qty]) })'),
          T(null, 'January cohort', 'Count the customers whose FIRST order was in January (cohort analysis).', 'First order per customer: <code>{ FIXED [customer_id] : MIN([order_date]) }</code>. Then <code>COUNTD(IIF(MONTH(...) = 1, [customer_id], NULL))</code>.', 'COUNTD(IIF(MONTH({ FIXED [customer_id] : MIN([order_date]) }) = 1, [customer_id], NULL))'),
          T(CITY, 'Biggest customer per city', 'In each city, the highest quantity that a single customer bought in that city. Fix the level of detail on customer AND city.', 'Two dimensions: <code>MAX({ FIXED [customer_id], [store_city] : SUM([qty]) })</code>.', 'MAX({ FIXED [customer_id], [store_city] : SUM([qty]) })')] },
        { title: 'Dates', example: ex('Date parts', "SUM(IIF(DATEPART('month', [order_date]) = 12, [qty], 0))", "DATEPART('month', date) or MONTH(date) give the month number; YEAR and DAY work the same way."), challenges: [
          T(CITY, 'December units', 'Total quantity sold in December.', 'Use <code>SUM(IIF(MONTH([order_date]) = 12, [qty], 0))</code>.', 'SUM(IIF(MONTH([order_date]) = 12, [qty], 0))'),
          T(CH, 'First-half orders', 'Count the different orders placed from January to June.', "Use <code>COUNTD(IIF(DATEPART('month', [order_date]) <= 6, [order_id], NULL))</code>.", "COUNTD(IIF(DATEPART('month', [order_date]) <= 6, [order_id], NULL))"),
          T(CAT, 'Average price in Q4', 'Average unit price of the lines in October, November and December.', 'AVG(IIF(MONTH([order_date]) >= 10, [unit_price], NULL)).', 'AVG(IIF(MONTH([order_date]) >= 10, [unit_price], NULL))')] },
      ] },
      { icon: '📆', title: 'Time intelligence', about: 'Year to date, the month before and month-over-month change, with Sales[month] on the rows.', levels: [
        { title: 'Year to date', example: ex('TOTALYTD', 'TOTALYTD(SUM(Sales[qty]), Sales[order_date])', 'Year to date adds everything from 1 January up to the last date in the current filter. In a matrix by month it grows month after month.'), challenges: [
          X(MONTH, 'Units year to date', 'Total quantity from 1 January to the end of each month.', 'Use <code>TOTALYTD(SUM(Sales[qty]), Sales[order_date])</code>.', 'TOTALYTD(SUM(Sales[qty]), Sales[order_date])'),
          X(MONTH, 'Revenue year to date', 'Revenue (quantity × unit price) year to date.', 'Put the SUMX inside TOTALYTD.', 'TOTALYTD(' + REV + ', Sales[order_date])'),
          X(MONTH, 'Orders year to date', 'The number of different orders year to date, written with CALCULATE and DATESYTD.', 'Use <code>CALCULATE(DISTINCTCOUNT(Sales[order_id]), DATESYTD(Sales[order_date]))</code>.', 'CALCULATE(DISTINCTCOUNT(Sales[order_id]), DATESYTD(Sales[order_date]))')] },
        { title: 'The month before', example: ex('DATEADD', 'CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))', 'DATEADD shifts the dates in the filter. Inside CALCULATE it replaces the month on the row with the month before.'), challenges: [
          X(MONTH, 'Units last month', 'For each month, the quantity of the month before.', 'Use <code>CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))</code>.', 'CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))'),
          X(MONTH, 'Revenue last month', 'For each month, the revenue of the month before, using PREVIOUSMONTH.', 'Use <code>CALCULATE(' + REV + ', PREVIOUSMONTH(Sales[order_date]))</code>.', 'CALCULATE(' + REV + ', PREVIOUSMONTH(Sales[order_date]))'),
          X(MONTH, 'Two months back', 'For each month, the quantity of two months before.', 'DATEADD with -2.', 'CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -2, MONTH))')] },
        { title: 'Month-over-month', example: ex('VAR for clarity', 'VAR cur = SUM(Sales[qty])\nVAR prev = CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))\nRETURN DIVIDE(cur - prev, prev)', 'Variables name each part of a calculation, so the final line reads like the business question.'), challenges: [
          X(MONTH, 'Change in units', 'This month\'s quantity minus last month\'s.', 'Two VARs (cur, prev), then <code>RETURN cur - prev</code>.', 'VAR cur = SUM(Sales[qty])\nVAR prev = CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))\nRETURN cur - prev'),
          X(MONTH, 'Change in %', 'Month-over-month change of quantity as a ratio of last month (blank when there is no month before).', 'RETURN <code>DIVIDE(cur - prev, prev)</code>.', 'VAR cur = SUM(Sales[qty])\nVAR prev = CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))\nRETURN DIVIDE(cur - prev, prev)'),
          X(MONTH, 'Share of the year so far', 'Each month\'s quantity as a share of the quantity year to date.', 'DIVIDE the month by TOTALYTD.', 'DIVIDE(SUM(Sales[qty]), TOTALYTD(SUM(Sales[qty]), Sales[order_date]))')] },
        { title: 'Bug hunt', example: ex('Signs and units', 'DATEADD(Sales[order_date], -1, MONTH)   -- back one month', 'Read time measures out loud: "minus one month" goes back, plus goes forward.'), challenges: [
          X(MONTH, 'Last month, not next', 'The measure should show the quantity of the month before, but it shows the month after. Fix it.', 'The sign of the shift decides the direction.', 'CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], -1, MONTH))', { type: 'bug', starter: 'CALCULATE(SUM(Sales[qty]), DATEADD(Sales[order_date], 1, MONTH))' }),
          X(MONTH, 'Units per order', 'Units per order by month. The AI divides by order lines instead of orders. Fix it.', 'Orders are DISTINCTCOUNT(Sales[order_id]).', 'DIVIDE(SUM(Sales[qty]), DISTINCTCOUNT(Sales[order_id]))', { type: 'bug', starter: 'DIVIDE(SUM(Sales[qty]), COUNTROWS(Sales))' }),
          X(MONTH, 'Revenue year to date', 'Revenue year to date. The AI adds up prices instead of revenue. Fix it.', 'Revenue is quantity × unit price, row by row.', 'TOTALYTD(' + REV + ', Sales[order_date])', { type: 'bug', starter: 'TOTALYTD(SUM(Sales[unit_price]), Sales[order_date])' })] },
      ] },
      { icon: '🏅', title: 'Ranking and top N', about: 'RANKX, TOPN and shares of the total, plus requests from the team.', levels: [
        { title: 'RANKX', example: ex('Rank in a matrix', 'RANKX(ALL(Sales[product]), SUM(Sales[qty]))', 'ALL(Sales[product]) is the list of every product. RANKX evaluates the measure for each one and gives the current product its position.'), challenges: [
          X(PROD, 'Rank products by units', 'The rank of each product by quantity sold (1 = best seller).', 'Use <code>RANKX(ALL(Sales[product]), SUM(Sales[qty]))</code>.', 'RANKX(ALL(Sales[product]), SUM(Sales[qty]))'),
          X(CITY, 'Rank cities by revenue', 'The rank of each city by revenue.', 'RANKX over ALL(Sales[store_city]) with the revenue SUMX.', 'RANKX(ALL(Sales[store_city]), ' + REV + ')'),
          X(CAT, 'Rank categories by orders', 'The rank of each category by its number of different orders.', 'RANKX over ALL(Sales[category]) with DISTINCTCOUNT(Sales[order_id]).', 'RANKX(ALL(Sales[category]), DISTINCTCOUNT(Sales[order_id]))')] },
        { title: 'TOPN and shares', example: ex('Top 3 as a filter', 'CALCULATE(SUM(Sales[qty]), TOPN(3, ALL(Sales[product]), SUM(Sales[qty])))', 'TOPN returns the best rows of a table; used inside CALCULATE it becomes a filter on those products.'), challenges: [
          X(CITY, 'Units of the top 3 products', 'Quantity sold of the 3 best-selling products overall, in each city.', 'CALCULATE with <code>TOPN(3, ALL(Sales[product]), SUM(Sales[qty]))</code>.', 'CALCULATE(SUM(Sales[qty]), TOPN(3, ALL(Sales[product]), SUM(Sales[qty])))'),
          X(PROD, 'Share of all products', 'Each product\'s quantity as a share of all products.', 'DIVIDE by <code>CALCULATE(SUM(Sales[qty]), ALL(Sales[product]))</code>.', 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales[product])))'),
          X(CITY, 'Top 3 share', 'In each city, the share of quantity that comes from the 3 best-selling products overall.', 'Top 3 units divided by all units of the city.', 'DIVIDE(CALCULATE(SUM(Sales[qty]), TOPN(3, ALL(Sales[product]), SUM(Sales[qty]))), CALCULATE(SUM(Sales[qty]), ALL(Sales[product])))')] },
        { title: 'Predict the total', example: ex('Read a measure', 'COUNTROWS(ALL(Sales[channel]))', 'ALL(column) is the list of its different values, whatever the filters.'), challenges: [
          PR('dax', 'How many rows?', 'COUNTROWS(TOPN(3, ALL(Sales[product]), SUM(Sales[qty])))', ['14', '1', '3', '5'], 2, 'TOPN keeps the 3 best products.'),
          PR('dax', 'A rank at the top', 'RANKX(ALL(Sales[store_city]), SUM(Sales[qty]))', ['5', '1', '0', '3'], 1, 'With no city filter the total beats every single city, so it ranks first.'),
          PR('dax', 'Different categories', 'COUNTROWS(ALL(Sales[category]))', ['4', '14', '3', '8552'], 0, 'Coffee, Tea, Bakery and Food.')] },
        { title: 'Requests from the team', example: ex('Choose the measure', 'RANKX(ALL(Sales[product]), ' + REV + ')', 'Units and revenue can rank products very differently: a sandwich sells less often than an espresso but earns more.'), challenges: [
          X(PROD, 'Which products matter?', 'Rank products by revenue (1 = highest).', 'RANKX over ALL(Sales[product]) with the revenue SUMX.', 'RANKX(ALL(Sales[product]), ' + REV + ')',
            { type: 'ask', ask: { who: 'Ana (finance)', says: 'Which products matter most to us?', q: 'Which ranking answers a finance question?', answer: 1, why: 'Finance cares about money: rank by revenue, and say so in the title.', options: ['By units sold', 'By revenue', 'By number of customers', 'Alphabetically'] } }),
          X(null, 'Our top 5', 'The share of revenue that comes from the 5 highest-revenue products.', 'Revenue of TOPN(5, ...) divided by all revenue.', 'DIVIDE(CALCULATE(' + REV + ', TOPN(5, ALL(Sales[product]), ' + REV + ')), CALCULATE(' + REV + ', ALL(Sales[product])))',
            { type: 'ask', ask: { who: 'Lena (founder)', says: 'Show me our top 5.', q: 'What makes "top 5" useful on a board slide?', answer: 2, why: 'Name the measure and give context: how much of the business those five carry.', options: ['A list of five names', 'The five cheapest products', 'Top 5 by revenue, as a share of all revenue', 'The five newest products'] } }),
          X(MONTH, 'Is delivery growing?', 'Delivery quantity this month minus delivery quantity last month.', 'Two CALCULATEs with Sales[channel] = "delivery"; the second also has DATEADD.', 'CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery") - CALCULATE(SUM(Sales[qty]), Sales[channel] = "delivery", DATEADD(Sales[order_date], -1, MONTH))',
            { type: 'ask', ask: { who: 'Theo (marketing)', says: 'Is delivery growing?', q: 'What would you show?', answer: 0, why: 'Growth is change over time: compare each month with the month before, for delivery only.', options: ['Delivery units each month against the month before', 'Total units of all channels', 'The share of delivery in December only', 'The number of delivery customers ever'] } })] },
      ] },
      { icon: '🧮', title: 'Tableau table calcs and LOD', about: 'Running sums, ranks, INCLUDE and EXCLUDE, translating DAX, and a case file.', levels: [
        { title: 'Table calculations', example: ex('Across the view', 'RUNNING_SUM(SUM([qty]))', 'A table calculation works on the marks in the view (here, months in order): running sums, window averages and ranks.'), challenges: [
          Y(MONTH, 'Running units', 'The running total of quantity, month by month.', 'Use <code>RUNNING_SUM(SUM([qty]))</code>.', 'RUNNING_SUM(SUM([qty]))'),
          Y(MONTH, 'The average month', 'The average monthly quantity, shown on every month.', 'Use <code>WINDOW_AVG(SUM([qty]))</code>.', 'WINDOW_AVG(SUM([qty]))'),
          Y(CITY, 'Rank cities', 'The rank of each city by quantity.', 'Use <code>RANK(SUM([qty]))</code>.', 'RANK(SUM([qty]))')] },
        { title: 'INCLUDE and EXCLUDE', example: ex('Finer and coarser', 'AVG({ INCLUDE [customer_id] : SUM([qty]) })', 'INCLUDE adds a dimension to the view (per customer inside each city); EXCLUDE removes one (the whole total behind each city).'), challenges: [
          Y(CITY, 'Units per customer', 'In each city, the average quantity per customer.', 'Use <code>AVG({ INCLUDE [customer_id] : SUM([qty]) })</code>.', 'AVG({ INCLUDE [customer_id] : SUM([qty]) })'),
          Y(CITY, 'Share of all cities', 'Each city\'s quantity as a share of all cities, using EXCLUDE.', 'Use <code>SUM([qty]) / MIN({ EXCLUDE [store_city] : SUM([qty]) })</code>.', 'SUM([qty]) / MIN({ EXCLUDE [store_city] : SUM([qty]) })'),
          Y(CH, 'Biggest order', 'In each channel, the largest quantity in a single order.', 'Use <code>MAX({ INCLUDE [order_id] : SUM([qty]) })</code>.', 'MAX({ INCLUDE [order_id] : SUM([qty]) })')] },
        { title: 'Rosetta: DAX and Tableau', example: ex('Same idea, two tools', 'DAX:     DISTINCTCOUNT(Sales[order_id])\nTableau: COUNTD([order_id])', 'Both tools aggregate columns; they differ in syntax and in how they handle context.'), challenges: [
          Y(CITY, 'Share of the total', 'Write the Tableau version of the given DAX measure.', 'A table calculation: <code>SUM([qty]) / TOTAL(SUM([qty]))</code>.', 'SUM([qty]) / TOTAL(SUM([qty]))', { type: 'rosetta', given: { lang: 'DAX', code: 'DIVIDE(SUM(Sales[qty]), CALCULATE(SUM(Sales[qty]), ALL(Sales[store_city])))' } }),
          X(CH, 'Orders', 'Write the DAX version of the given Tableau calculation.', 'COUNTD becomes DISTINCTCOUNT on Sales[order_id].', 'DISTINCTCOUNT(Sales[order_id])', { type: 'rosetta', given: { lang: 'Tableau', code: 'COUNTD([order_id])' } }),
          Y(CAT, 'Revenue', 'Write the Tableau version of the given DAX measure.', 'Multiply inside SUM: <code>SUM([qty] * [unit_price])</code>.', 'SUM([qty] * [unit_price])', { type: 'rosetta', given: { lang: 'DAX', code: REV } })] },
        { title: 'Case file', example: ex('Let the view answer', 'RANK(SUM([qty]))', 'Put the measure on the right dimension and the answer is one glance away.'), challenges: [
          Y(MONTH, 'Peak month', 'Rank the months by quantity.', 'Use <code>RANK(SUM([qty]))</code> with months on the rows.', 'RANK(SUM([qty]))',
            { type: 'case', finding: { q: 'Which month ranks first?', options: ['2025-01', '2025-06', '2025-12', '2025-08'], answer: 2, why: 'The busiest month is where staffing and stock planning start.' } }),
          Y(null, 'Loyal customers', 'The share of customers with 15 or more orders.', 'Orders per customer with FIXED, then a COUNTD of those who pass, divided by all customers.', 'COUNTD(IIF({ FIXED [customer_id] : COUNTD([order_id]) } >= 15, [customer_id], NULL)) / COUNTD([customer_id])', { type: 'case' }),
          Y(MONTH, 'Halfway point', 'The running share of the year\'s quantity, month by month.', 'RUNNING_SUM divided by TOTAL.', 'RUNNING_SUM(SUM([qty])) / TOTAL(SUM([qty]))',
            { type: 'case', finding: { q: 'In which month does the running share pass 50%?', options: ['2025-06', '2025-07', '2025-05', '2025-09'], answer: 1, why: 'Half the year\'s sales arrive later than half the year: the second half is busier.' } })] },
      ] },
      { icon: '☕', title: 'The Dot Club model', about: 'A second model: Members and their monthly Invoices. Active members, churn, revenue and a board dashboard.', levels: [
        { title: 'Members and invoices', example: ex('A new model', 'COUNTROWS(FILTER(Members, ISBLANK(Members[cancel_date])))', 'Members has one row per member; Invoices one row per member and month, linked by member_id. A filter on Members reaches the invoices.'), challenges: [
          K(PLAN, 'Members', 'Count the members.', 'Use <code>COUNTROWS(Members)</code>.', 'COUNTROWS(Members)'),
          K(PLAN, 'Active members', 'Count the members without a cancel date.', 'FILTER Members on <code>ISBLANK(Members[cancel_date])</code>, then COUNTROWS.', 'COUNTROWS(FILTER(Members, ISBLANK(Members[cancel_date])))'),
          K(IMONTH, 'Billed revenue', 'Total invoiced amount.', 'Use <code>SUM(Invoices[amount])</code>.', 'SUM(Invoices[amount])')] },
        { title: 'Paid revenue and churn', example: ex('Only what was paid', 'CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1)', 'Billed is not collected: failed payments are part of the story.'), challenges: [
          K(IMONTH, 'Paid revenue', 'Total amount of the paid invoices.', 'CALCULATE with <code>Invoices[paid] = 1</code>.', 'CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1)'),
          K(PLAN, 'Churn rate', 'The share of members who cancelled.', 'Cancelled (NOT ISBLANK) divided by all members.', 'DIVIDE(COUNTROWS(FILTER(Members, NOT(ISBLANK(Members[cancel_date])))), COUNTROWS(Members))'),
          K(IMONTH, 'Paying members', 'The number of different members with a paid invoice.', 'CALCULATE(DISTINCTCOUNT(Invoices[member_id]), Invoices[paid] = 1).', 'CALCULATE(DISTINCTCOUNT(Invoices[member_id]), Invoices[paid] = 1)')] },
        { title: 'Put in order', example: ex('Variables first', 'VAR a = ...\nVAR b = ...\nRETURN DIVIDE(a, b)', 'In DAX every VAR comes before RETURN, and a variable can only use the ones above it.'), challenges: [
          K(PLAN, 'Revenue per paying member', 'Tap the lines into a working measure: paid revenue per paying member.', 'Both VARs first, RETURN last.', 'VAR paid = CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1)\nVAR payers = CALCULATE(DISTINCTCOUNT(Invoices[member_id]), Invoices[paid] = 1)\nRETURN DIVIDE(paid, payers)',
            { type: 'order', lines: ['VAR paid = CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1)', 'VAR payers = CALCULATE(DISTINCTCOUNT(Invoices[member_id]), Invoices[paid] = 1)', 'RETURN DIVIDE(paid, payers)'] }),
          K(IMONTH, 'Failed payment rate', 'Tap the lines into a working measure: the share of invoices that failed.', 'Count all invoices, count the failed ones, then divide.', 'VAR billed = COUNTROWS(Invoices)\nVAR failed = CALCULATE(COUNTROWS(Invoices), Invoices[paid] = 0)\nRETURN DIVIDE(failed, billed)',
            { type: 'order', lines: ['VAR billed = COUNTROWS(Invoices)', 'VAR failed = CALCULATE(COUNTROWS(Invoices), Invoices[paid] = 0)', 'RETURN DIVIDE(failed, billed)'] }),
          K(PLAN, 'Price of an active plan', 'Tap the lines into a working measure: the average monthly price of active members.', 'Keep the active members in a VAR, then AVERAGEX over it.', 'VAR active = FILTER(Members, ISBLANK(Members[cancel_date]))\nRETURN AVERAGEX(active, Members[monthly_price])',
            { type: 'order', lines: ['VAR active = FILTER(Members, ISBLANK(Members[cancel_date]))', 'RETURN AVERAGEX(active, Members[monthly_price])'] })] },
        { title: 'Boss: the board dashboard', example: ex('One number per question', 'CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1, Invoices[month] = "2025-12")', 'A board dashboard answers a few fixed questions, the same way every month.'), challenges: [
          K(PLAN, 'MRR in December', 'Paid revenue in December 2025.', 'CALCULATE with two filters: paid = 1 and month = "2025-12".', 'CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1, Invoices[month] = "2025-12")', { type: 'boss' }),
          K(SMONTH, 'Cancellations by start month', 'The number of members who cancelled, by the month they started.', 'CALCULATE(COUNTROWS(Members), NOT(ISBLANK(Members[cancel_date]))).', 'CALCULATE(COUNTROWS(Members), NOT(ISBLANK(Members[cancel_date])))', { type: 'boss' }),
          K(PLAN, 'Revenue per member', 'Paid revenue divided by the number of different members who were invoiced.', 'DIVIDE(paid revenue, DISTINCTCOUNT(Invoices[member_id])).', 'DIVIDE(CALCULATE(SUM(Invoices[amount]), Invoices[paid] = 1), DISTINCTCOUNT(Invoices[member_id]))',
            { type: 'boss', finding: { q: 'Which plan brings the most revenue per member?', options: ['basic', 'plus', 'family', 'All the same'], answer: 2, why: 'The family plan costs the most each month, so it earns most per member even with fewer members.' } })] },
      ] },
    ],
  };
})();
