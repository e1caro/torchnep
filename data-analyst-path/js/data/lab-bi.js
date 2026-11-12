/* DotBI worlds, levels and challenges: DAX measures and Tableau calculations checked against a reference, in total and per member. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var n = 0;
  function C(mode, by, title, task, hint, solution) {
    n++;
    return { id: 'bi' + (n < 10 ? '0' : '') + n, mode: mode, by: by, title: title, task: task, hint: hint, solution: solution };
  }
  function D(by, title, task, hint, solution) { return C('dax', by, title, task, hint, solution); }
  function T(by, title, task, hint, solution) { return C('tableau', by, title, task, hint, solution); }
  function ex(title, code, explain) { return { title: title, code: code, explain: explain }; }
  var CITY = 'Sales[store_city]', CH = 'Sales[channel]', CAT = 'Sales[category]', PROD = 'Sales[product]', SEG = 'Customers[segment]';

  DA.labBI = {
    id: 'bi', route: 'bi', quest: 'lesson',
    tagline: 'Power BI measures (DAX) and Tableau calculations on a small café data model: see every result as a card, a matrix and a chart.',
    help: 'Type a measure and press Enter (or Evaluate). The model has two tables: Sales (one row per order line) and Customers, linked by customer_id. Choose a field in "Rows" to see the measure for each value, like a Power BI matrix: the chart follows. Check compares your measure with the answer in total and for every row of the matrix, so it must be right in every filter context. Tableau challenges use [field] names and { FIXED [dim] : ... }.',
    xpKey: function (c) { return 'bi:' + c.id; },
    xp: function (c) { return 15 * c.level.world.n; },
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
    ],
  };
})();
