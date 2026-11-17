/* The business base as a lab: challenges about the learner's own BizSim business (js/bizbase.js), one world per tool.
 *
 * Every reference answer is computed on whatever business is active, so the same task has a different answer for
 * each business. Nothing is locked. The SQL challenges open in SQLab on the "biz" database; the others open the
 * DotSheets, DotPython and DotBI editors with the business loaded (DA.labPages). */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var L = function (en, es) { return DA.L ? DA.L(en, es) : en; };
  function ex(title, code, explain) { return { title: title, code: code, explain: explain }; }

  /* ---------------------------------------------------------------- SQL */
  DA.bizSql = [];
  function Q(id, title, concept, task, hint, solution, decimals) {
    var c = { id: id, ds: 'biz', level: 5, title: title, concept: concept, task: task, hint: hint, solution: solution };
    if (decimals !== undefined) c.decimals = decimals;
    DA.bizSql.push(c);
    return { id: id, tool: 'sql', title: title, task: task, hint: hint, solution: solution, src: c };
  }
  var sqlWorld = { icon: '🗄️', tool: 'SQL', title: L('Your business in SQL', 'Tu negocio en SQL'), open: true,
    about: L('Real SQL on your business database: tickets, lines, products, customers and the daily summary.', 'SQL real sobre la base de datos de tu negocio: tiques, líneas, productos, clientes y el resumen diario.'), levels: [
      { title: L('Sales', 'Ventas'), example: ex(L('Tickets and their lines', 'Tiques y sus líneas'), 'SELECT channel, COUNT(*) AS tickets\nFROM transactions\nGROUP BY channel;', L('transactions has one row per ticket; transaction_items has one row per product in it. Money columns include VAT; categories.vat_rate tells you how much.', 'transactions tiene una fila por tique; transaction_items, una fila por producto del tique. Los importes incluyen IVA; categories.vat_rate dice cuánto.')), challenges: [
        Q('bz01', L('Tickets and takings', 'Tiques y recaudación'), 'COUNT + SUM',
          L('How many tickets are there, and how much was paid in total? Return <code>tickets</code>, <code>total</code> (rounded to 2).', '¿Cuántos tiques hay y cuánto se pagó en total? Devuelve <code>tickets</code>, <code>total</code> (redondeado a 2).'),
          L('One row from <code>transactions</code>: <code>COUNT(*)</code> and <code>ROUND(SUM(total), 2)</code>.', 'Una fila de <code>transactions</code>: <code>COUNT(*)</code> y <code>ROUND(SUM(total), 2)</code>.'),
          'SELECT COUNT(*) AS tickets, ROUND(SUM(total), 2) AS total\nFROM transactions;', 2),
        Q('bz02', L('Average ticket by channel', 'Tique medio por canal'), 'GROUP BY + AVG',
          L('For each <code>channel</code>: the number of tickets and the average <code>total</code> rounded to 2. Return <code>channel</code>, <code>tickets</code>, <code>avg_ticket</code>, ordered by channel.', 'Para cada <code>channel</code>: el número de tiques y la media de <code>total</code> redondeada a 2. Devuelve <code>channel</code>, <code>tickets</code>, <code>avg_ticket</code>, ordenado por canal.'),
          L('<code>GROUP BY channel</code> with <code>COUNT(*)</code> and <code>ROUND(AVG(total), 2)</code>.', '<code>GROUP BY channel</code> con <code>COUNT(*)</code> y <code>ROUND(AVG(total), 2)</code>.'),
          'SELECT channel, COUNT(*) AS tickets, ROUND(AVG(total), 2) AS avg_ticket\nFROM transactions\nGROUP BY channel\nORDER BY channel;', 2),
        Q('bz03', L('Busiest weekdays', 'Los días con más tiques'), 'JOIN calendar',
          L('Count the tickets of each day of the week. Return <code>weekday_name</code>, <code>tickets</code>, most tickets first (ties by name).', 'Cuenta los tiques de cada día de la semana. Devuelve <code>weekday_name</code>, <code>tickets</code>, de más a menos tiques (empates por nombre).'),
          L('Join <code>calendar</code> on <code>date</code> and group by <code>weekday_name</code>.', 'Une <code>calendar</code> por <code>date</code> y agrupa por <code>weekday_name</code>.'),
          'SELECT c.weekday_name, COUNT(*) AS tickets\nFROM transactions t\nJOIN calendar c ON c.date = t.date\nGROUP BY c.weekday_name\nORDER BY tickets DESC, c.weekday_name;')] },
      { title: L('Products and margin', 'Productos y margen'), example: ex(L('From a line to its category', 'De una línea a su categoría'), 'SELECT c.name, SUM(i.quantity) AS units\nFROM transaction_items i\nJOIN products p ON p.product_id = i.product_id\nJOIN categories c ON c.category_id = p.category_id\nGROUP BY c.name;', L('Two joins take a sale line to its product and then to the category.', 'Dos JOIN llevan una línea de venta a su producto y luego a la categoría.')), challenges: [
        Q('bz04', L('Top five products', 'Los cinco productos más vendidos'), 'JOIN + LIMIT',
          L('The five products with the most units sold. Return <code>name</code>, <code>units</code>, most units first (ties by name).', 'Los cinco productos con más unidades vendidas. Devuelve <code>name</code>, <code>units</code>, de más a menos unidades (empates por nombre).'),
          L('Join <code>transaction_items</code> to <code>products</code>, <code>SUM(quantity)</code>, then <code>LIMIT 5</code>.', 'Une <code>transaction_items</code> con <code>products</code>, <code>SUM(quantity)</code> y luego <code>LIMIT 5</code>.'),
          'SELECT p.name, SUM(i.quantity) AS units\nFROM transaction_items i\nJOIN products p ON p.product_id = i.product_id\nGROUP BY p.product_id, p.name\nORDER BY units DESC, p.name\nLIMIT 5;'),
        Q('bz05', L('Sales by category', 'Ventas por categoría'), 'Two joins',
          L('The amount paid per category (sum of <code>line_total</code>, rounded to 2). Return <code>category</code>, <code>sales</code>, highest first (ties by category).', 'El importe pagado por categoría (suma de <code>line_total</code>, redondeada a 2). Devuelve <code>category</code>, <code>sales</code>, de mayor a menor (empates por categoría).'),
          L('Lines → products → categories, then group by the category name.', 'Líneas → products → categories, y agrupa por el nombre de la categoría.'),
          'SELECT c.name AS category, ROUND(SUM(i.line_total), 2) AS sales\nFROM transaction_items i\nJOIN products p ON p.product_id = i.product_id\nJOIN categories c ON c.category_id = p.category_id\nGROUP BY c.name\nORDER BY sales DESC, category;', 2),
        Q('bz06', L('Margin by category', 'Margen por categoría'), 'Expressions inside SUM',
          L('The gross margin of each category as a percentage, rounded to 1. Revenue without VAT is <code>line_total / (1 + vat_rate)</code>; the cost is <code>quantity * unit_cost</code>. Return <code>category</code>, <code>margin_pct</code>, highest first (ties by category).', 'El margen bruto de cada categoría en porcentaje, redondeado a 1. El ingreso sin IVA es <code>line_total / (1 + vat_rate)</code>; el coste es <code>quantity * unit_cost</code>. Devuelve <code>category</code>, <code>margin_pct</code>, de mayor a menor (empates por categoría).'),
          L('100.0 * SUM(revenue − cost) / SUM(revenue), with the two expressions written out inside the SUMs.', '100.0 * SUM(ingreso − coste) / SUM(ingreso), con las dos expresiones escritas dentro de los SUM.'),
          'SELECT c.name AS category,\n       ROUND(100.0 * SUM(i.line_total / (1 + c.vat_rate) - i.quantity * i.unit_cost) / SUM(i.line_total / (1 + c.vat_rate)), 1) AS margin_pct\nFROM transaction_items i\nJOIN products p ON p.product_id = i.product_id\nJOIN categories c ON c.category_id = p.category_id\nGROUP BY c.name\nORDER BY margin_pct DESC, category;', 1)] },
      { title: L('Customers', 'Clientes'), example: ex(L('Known and anonymous buyers', 'Compradores conocidos y anónimos'), 'SELECT COUNT(*) AS tickets, COUNT(customer_id) AS identified\nFROM transactions;', L('customer_id is NULL when the buyer was not identified. COUNT(column) skips NULLs, COUNT(*) does not.', 'customer_id es NULL cuando no se identificó al comprador. COUNT(columna) salta los NULL; COUNT(*), no.')), challenges: [
        Q('bz07', L('Identified tickets', 'Tiques identificados'), 'COUNT(column)',
          L('What percentage of tickets has a known customer? Return one number, <code>identified_pct</code>, rounded to 1.', '¿Qué porcentaje de los tiques tiene un cliente conocido? Devuelve un número, <code>identified_pct</code>, redondeado a 1.'),
          L('<code>COUNT(customer_id)</code> skips the NULLs: divide it by <code>COUNT(*)</code> and multiply by 100.0.', '<code>COUNT(customer_id)</code> salta los NULL: divídelo entre <code>COUNT(*)</code> y multiplica por 100.0.'),
          'SELECT ROUND(100.0 * COUNT(customer_id) / COUNT(*), 1) AS identified_pct\nFROM transactions;', 1),
        Q('bz08', L('New customers per month', 'Clientes nuevos por mes'), 'SUBSTR + GROUP BY',
          L('How many customers were first seen each month? Return <code>month</code> (YYYY-MM), <code>new_customers</code>, oldest month first.', '¿Cuántos clientes se vieron por primera vez cada mes? Devuelve <code>month</code> (AAAA-MM), <code>new_customers</code>, del mes más antiguo al más reciente.'),
          L('<code>SUBSTR(first_seen, 1, 7)</code> is the month.', '<code>SUBSTR(first_seen, 1, 7)</code> es el mes.'),
          'SELECT SUBSTR(first_seen, 1, 7) AS month, COUNT(*) AS new_customers\nFROM customers\nGROUP BY month\nORDER BY month;'),
        Q('bz09', L('Customers who came back', 'Clientes que volvieron'), 'HAVING in a subquery',
          L('How many identified customers have two or more tickets in this data? Return one number, <code>repeat_customers</code>.', '¿Cuántos clientes identificados tienen dos o más tiques en estos datos? Devuelve un número, <code>repeat_customers</code>.'),
          L('Group the tickets by customer with <code>HAVING COUNT(*) >= 2</code>, then count the rows of that subquery.', 'Agrupa los tiques por cliente con <code>HAVING COUNT(*) >= 2</code> y cuenta las filas de esa subconsulta.'),
          'SELECT COUNT(*) AS repeat_customers\nFROM (\n  SELECT customer_id\n  FROM transactions\n  WHERE customer_id IS NOT NULL\n  GROUP BY customer_id\n  HAVING COUNT(*) >= 2\n);')] },
      { title: L('The owner asks', 'El dueño pregunta'), example: ex(L('The daily summary', 'El resumen diario'), 'SELECT date, revenue_net, net_profit\nFROM daily_summary\nORDER BY date DESC\nLIMIT 7;', L('daily_summary has one row per day with the headline numbers already added up.', 'daily_summary tiene una fila por día con las cifras principales ya sumadas.')), challenges: [
        Q('bz10', L('The monthly report', 'El informe mensual'), 'Monthly totals',
          L('For each month: net revenue and net profit, both rounded to 2. Return <code>month</code>, <code>revenue</code>, <code>profit</code>, oldest first.', 'Para cada mes: ingresos netos y beneficio neto, redondeados a 2. Devuelve <code>month</code>, <code>revenue</code>, <code>profit</code>, del más antiguo al más reciente.'),
          L('Use <code>daily_summary</code>: sum <code>revenue_net</code> and <code>net_profit</code> by <code>SUBSTR(date, 1, 7)</code>.', 'Usa <code>daily_summary</code>: suma <code>revenue_net</code> y <code>net_profit</code> por <code>SUBSTR(date, 1, 7)</code>.'),
          'SELECT SUBSTR(date, 1, 7) AS month, ROUND(SUM(revenue_net), 2) AS revenue, ROUND(SUM(net_profit), 2) AS profit\nFROM daily_summary\nGROUP BY month\nORDER BY month;', 2),
        Q('bz11', L('When do buyers walk out?', '¿Cuándo se van los compradores?'), 'JOIN + WHERE + AVG',
          L('On open days, the average number of <code>walkouts</code> (buyers lost because staff or seats were full) per day of the week, rounded to 1. Return <code>weekday_name</code>, <code>avg_walkouts</code>, highest first (ties by name).', 'En los días abiertos, la media de <code>walkouts</code> (compradores perdidos por falta de personal o de sitio) por día de la semana, redondeada a 1. Devuelve <code>weekday_name</code>, <code>avg_walkouts</code>, de mayor a menor (empates por nombre).'),
          L('Join <code>daily_summary</code> with <code>calendar</code>, keep <code>is_open = 1</code> from the summary, group by weekday.', 'Une <code>daily_summary</code> con <code>calendar</code>, quédate con <code>is_open = 1</code> del resumen y agrupa por día.'),
          'SELECT c.weekday_name, ROUND(AVG(d.walkouts), 1) AS avg_walkouts\nFROM daily_summary d\nJOIN calendar c ON c.date = d.date\nWHERE d.is_open = 1\nGROUP BY c.weekday_name\nORDER BY avg_walkouts DESC, c.weekday_name;', 1),
        Q('bz12', L('Seven-day average', 'Media de siete días'), 'Window frame',
          L('For the 14 most recent days: the date, its net revenue and the average of that day and the six before it, rounded to 2. Return <code>date</code>, <code>revenue_net</code>, <code>avg_7d</code>, newest first.', 'Para los 14 días más recientes: la fecha, sus ingresos netos y la media de ese día y los seis anteriores, redondeada a 2. Devuelve <code>date</code>, <code>revenue_net</code>, <code>avg_7d</code>, del más reciente al más antiguo.'),
          L('<code>AVG(revenue_net) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)</code>, then <code>ORDER BY date DESC LIMIT 14</code>.', '<code>AVG(revenue_net) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)</code> y después <code>ORDER BY date DESC LIMIT 14</code>.'),
          'SELECT date, revenue_net,\n       ROUND(AVG(revenue_net) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS avg_7d\nFROM daily_summary\nORDER BY date DESC\nLIMIT 14;', 2)] },
    ] };

  /* ---------------------------------------------------------------- spreadsheet */
  var COLS = L('Data: your business, one row per day. Columns: ', 'Datos: tu negocio, una fila por día. Columnas: ') + 'A date, B weekday, C is_open, D visitors, E transactions, F units, G revenue_net, H cogs, I gross_margin, J labour_cost, K net_profit, L new_customers, M returning_customers, N stockout_products.';
  function R(id, title, at, formula, task, hint) {
    var make = DA.sheets && DA.sheets.makeRef;
    var c = make ? make(id, 'biz', title, at, formula, COLS + ' ' + task, hint) : { id: id, ds: 'biz', title: title, task: COLS + ' ' + task, hint: hint, solution: at + ':  ' + formula, steps: [[at, formula]] };
    c.tool = 'sheets';
    return c;
  }
  var sheetsWorld = { icon: '📗', tool: 'DotSheets', title: L('Your business in a spreadsheet', 'Tu negocio en una hoja de cálculo'), open: true,
    about: L('The daily numbers of your business, one row per day, and the formulas an owner asks for.', 'Las cifras diarias de tu negocio, una fila por día, y las fórmulas que pide un dueño.'), levels: [
      { title: L('The daily sheet', 'La hoja diaria'), example: ex(L('One row per day', 'Una fila por día'), 'P1:  =SUM(E2:E401)', L('Each row is a day of your business. Ranges down to row 401 cover every day loaded; empty rows add nothing.', 'Cada fila es un día de tu negocio. Los rangos hasta la fila 401 cubren todos los días cargados; las filas vacías no suman.')), challenges: [
        R('bzs1', L('Revenue of the period', 'Ingresos del periodo'), 'P1', '=ROUND(SUM(G2:G401),2)', L('In <b>P1</b>, add up <code>revenue_net</code> (column G), rounded to 2.', 'En <b>P1</b>, suma <code>revenue_net</code> (columna G), redondeado a 2.'), L('Wrap the SUM in ROUND(..., 2).', 'Pon el SUM dentro de ROUND(..., 2).')),
        R('bzs2', L('The best day', 'El mejor día'), 'P2', '=MAX(G2:G401)', L('In <b>P2</b>, the highest daily <code>revenue_net</code>.', 'En <b>P2</b>, el mayor <code>revenue_net</code> de un día.'), L('MAX over column G.', 'MAX sobre la columna G.')),
        R('bzs3', L('Open days', 'Días abiertos'), 'P3', '=COUNTIF(C2:C401,1)', L('In <b>P3</b>, count the days the business opened (<code>is_open</code> is 1).', 'En <b>P3</b>, cuenta los días que abrió el negocio (<code>is_open</code> es 1).'), L('COUNTIF over column C with the condition 1.', 'COUNTIF sobre la columna C con la condición 1.'))] },
      { title: L('Conditions and ratios', 'Condiciones y ratios'), example: ex(L('Add up one weekday', 'Suma un día de la semana'), 'P4:  =SUMIF(B2:B401,"Friday",G2:G401)', L('SUMIF adds column G only on the rows where column B is that weekday. Weekday names are in English.', 'SUMIF suma la columna G solo en las filas donde la columna B es ese día. Los nombres de los días están en inglés.')), challenges: [
        R('bzs4', L('Saturday revenue', 'Ingresos de los sábados'), 'P4', '=ROUND(SUMIF(B2:B401,"Saturday",G2:G401),2)', L('In <b>P4</b>, the <code>revenue_net</code> of all Saturdays, rounded to 2.', 'En <b>P4</b>, el <code>revenue_net</code> de todos los sábados (<code>Saturday</code>), redondeado a 2.'), L('SUMIF(B2:B401, "Saturday", G2:G401) inside ROUND.', 'SUMIF(B2:B401; "Saturday"; G2:G401) dentro de ROUND.')),
        R('bzs5', L('Gross margin %', 'Margen bruto %'), 'P5', '=ROUND(SUM(I2:I401)/SUM(G2:G401)*100,1)', L('In <b>P5</b>, total <code>gross_margin</code> (I) divided by total <code>revenue_net</code> (G), times 100, rounded to 1.', 'En <b>P5</b>, el <code>gross_margin</code> total (I) dividido entre el <code>revenue_net</code> total (G), por 100, redondeado a 1.'), L('Divide two SUMs, multiply by 100, round to 1.', 'Divide dos SUM, multiplica por 100 y redondea a 1.')),
        R('bzs6', L('Days with a loss', 'Días con pérdidas'), 'P6', '=COUNTIF(K2:K401,"<0")', L('In <b>P6</b>, count the days whose <code>net_profit</code> (K) is below zero.', 'En <b>P6</b>, cuenta los días cuyo <code>net_profit</code> (K) es menor que cero.'), L('COUNTIF with the condition "&lt;0".', 'COUNTIF con la condición "&lt;0".'))] },
    ] };

  /* ---------------------------------------------------------------- pandas */
  var SALES = 'sales = pd.read_csv("biz_sales.csv")\n', DAYS = 'days = pd.read_csv("biz_days.csv")\n';
  function P(id, title, task, hint, solution, starter) { return { id: id, tool: 'python', title: title, task: task + L(' Store it in <code>result</code>.', ' Guárdalo en <code>result</code>.'), hint: hint, solution: solution, ordered: false, starter: starter + 'result = ' }; }
  var pythonWorld = { icon: '🐼', tool: 'DotPython', title: L('Your business in pandas', 'Tu negocio en pandas'), open: true,
    about: L('Load your sale lines and your daily summary as DataFrames and answer with pandas.', 'Carga tus líneas de venta y tu resumen diario como DataFrames y responde con pandas.'), levels: [
      { title: L('Load your sales', 'Carga tus ventas'), example: ex(L('Your sale lines', 'Tus líneas de venta'), SALES + 'sales.head()', L('biz_sales.csv has one row per product in a ticket, with the product, category and channel beside it.', 'biz_sales.csv tiene una fila por producto de cada tique, con el producto, la categoría y el canal al lado.')), challenges: [
        P('bzp1', L('How many lines', 'Cuántas líneas'), L('Load <code>biz_sales.csv</code> and count its rows.', 'Carga <code>biz_sales.csv</code> y cuenta sus filas.'), L('<code>len(sales)</code> after <code>pd.read_csv</code>.', '<code>len(sales)</code> después de <code>pd.read_csv</code>.'), SALES + 'result = len(sales)', SALES),
        P('bzp2', L('Units by category', 'Unidades por categoría'), L('The total <code>quantity</code> of each <code>category</code>.', 'El total de <code>quantity</code> de cada <code>category</code>.'), '<code>groupby("category")["quantity"].sum()</code>.', SALES + 'result = sales.groupby("category")["quantity"].sum()', SALES),
        P('bzp3', L('Sales by channel', 'Ventas por canal'), L('The sum of <code>line_total</code> for each <code>channel</code>.', 'La suma de <code>line_total</code> de cada <code>channel</code>.'), L('Group by channel and add up line_total.', 'Agrupa por channel y suma line_total.'), SALES + 'result = sales.groupby("channel")["line_total"].sum()', SALES)] },
      { title: L('Days and products', 'Días y productos'), example: ex(L('One row per day', 'Una fila por día'), DAYS + 'days[days["is_open"] == 1]["revenue_net"].mean()', L('biz_days.csv is the daily summary: filter the open days before averaging.', 'biz_days.csv es el resumen diario: filtra los días abiertos antes de hacer la media.')), challenges: [
        P('bzp4', L('Best sellers', 'Los más vendidos'), L('The total <code>quantity</code> per <code>product</code>, for the products that sold 20 units or more.', 'El total de <code>quantity</code> por <code>product</code>, para los productos que vendieron 20 unidades o más.'), L('Group and sum, then keep the values &gt;= 20: <code>u[u &gt;= 20]</code>.', 'Agrupa y suma, y quédate con los valores &gt;= 20: <code>u[u &gt;= 20]</code>.'), SALES + 'u = sales.groupby("product")["quantity"].sum()\nresult = u[u >= 20]', SALES),
        P('bzp5', L('An average open day', 'Un día abierto medio'), L('Load <code>biz_days.csv</code> and compute the average <code>revenue_net</code> of the days with <code>is_open</code> equal to 1.', 'Carga <code>biz_days.csv</code> y calcula la media de <code>revenue_net</code> de los días con <code>is_open</code> igual a 1.'), L('Filter with <code>days[days["is_open"] == 1]</code>, then <code>.mean()</code>.', 'Filtra con <code>days[days["is_open"] == 1]</code> y luego <code>.mean()</code>.'), DAYS + 'result = days[days["is_open"] == 1]["revenue_net"].mean()', DAYS),
        P('bzp6', L('Revenue by weekday', 'Ingresos por día de la semana'), L('From <code>biz_days.csv</code>: the average <code>revenue_net</code> for each <code>weekday</code>.', 'De <code>biz_days.csv</code>: la media de <code>revenue_net</code> de cada <code>weekday</code>.'), '<code>groupby("weekday")["revenue_net"].mean()</code>.', DAYS + 'result = days.groupby("weekday")["revenue_net"].mean()', DAYS)] },
    ] };

  /* ---------------------------------------------------------------- DAX */
  var CAT = 'Sales[category]', CH = 'Sales[channel]', MONTH = 'Sales[month]';
  function D(id, by, title, task, hint, solution) { return { id: id, tool: 'bi', mode: 'dax', by: by, model: 'biz', title: title, task: task, hint: hint, solution: solution }; }
  var biWorld = { icon: '📊', tool: 'DotBI', title: L('Your business in DAX', 'Tu negocio en DAX'), open: true,
    about: L('Power BI measures on your sale lines: see them by category, channel and month.', 'Medidas de Power BI sobre tus líneas de venta: míralas por categoría, canal y mes.'), levels: [
      { title: L('Your first measures', 'Tus primeras medidas'), example: ex(L('Units sold', 'Unidades vendidas'), 'SUM(Sales[quantity])', L('Sales is your business: one row per sale line. The matrix shows the measure for each category.', 'Sales es tu negocio: una fila por línea de venta. La matriz muestra la medida de cada categoría.')), challenges: [
        D('bzb1', CAT, L('Units', 'Unidades'), L('Write a measure for the units sold.', 'Escribe una medida con las unidades vendidas.'), L('Use <code>SUM(Sales[quantity])</code>.', 'Usa <code>SUM(Sales[quantity])</code>.'), 'SUM(Sales[quantity])'),
        D('bzb2', CAT, L('Sales', 'Ventas'), L('Write a measure for the amount paid: the sum of <code>line_total</code>.', 'Escribe una medida con el importe pagado: la suma de <code>line_total</code>.'), L('Use <code>SUM(Sales[line_total])</code>.', 'Usa <code>SUM(Sales[line_total])</code>.'), 'SUM(Sales[line_total])'),
        D('bzb3', CH, L('Tickets', 'Tiques'), L('Count the tickets (not the lines).', 'Cuenta los tiques (no las líneas).'), L('A ticket has several lines: <code>DISTINCTCOUNT(Sales[ticket_id])</code>.', 'Un tique tiene varias líneas: <code>DISTINCTCOUNT(Sales[ticket_id])</code>.'), 'DISTINCTCOUNT(Sales[ticket_id])')] },
      { title: L('Ratios and profit', 'Ratios y beneficio'), example: ex(L('Average ticket', 'Tique medio'), 'DIVIDE(SUM(Sales[line_total]), DISTINCTCOUNT(Sales[ticket_id]))', L('Sales divided by the number of tickets. DIVIDE returns a blank instead of an error when there are none.', 'Ventas divididas entre el número de tiques. DIVIDE devuelve un blanco en vez de un error cuando no hay ninguno.')), challenges: [
        D('bzb4', CH, L('Average ticket', 'Tique medio'), L('Sales divided by the number of tickets.', 'Ventas divididas entre el número de tiques.'), '<code>DIVIDE(SUM(Sales[line_total]), DISTINCTCOUNT(Sales[ticket_id]))</code>.', 'DIVIDE(SUM(Sales[line_total]), DISTINCTCOUNT(Sales[ticket_id]))'),
        D('bzb5', MONTH, L('Gross profit', 'Beneficio bruto'), L('For each line, <code>line_total</code> minus <code>quantity</code> × <code>unit_cost</code>, added up.', 'Para cada línea, <code>line_total</code> menos <code>quantity</code> × <code>unit_cost</code>, todo sumado.'), L('Row by row: <code>SUMX(Sales, ...)</code>.', 'Fila a fila: <code>SUMX(Sales, ...)</code>.'), 'SUMX(Sales, Sales[line_total] - Sales[quantity] * Sales[unit_cost])'),
        D('bzb6', CAT, L('Share of sales', 'Parte de las ventas'), L('Each category\'s sales divided by the sales of all categories.', 'Las ventas de cada categoría divididas entre las ventas de todas las categorías.'), L('The denominator ignores the filter: <code>CALCULATE(SUM(Sales[line_total]), ALL(Sales))</code>.', 'El denominador ignora el filtro: <code>CALCULATE(SUM(Sales[line_total]), ALL(Sales))</code>.'), 'DIVIDE(SUM(Sales[line_total]), CALCULATE(SUM(Sales[line_total]), ALL(Sales)))')] },
    ] };

  DA.labBiz = {
    id: 'biz', route: 'biz', quest: 'lesson', name: L('Business base', 'Base de negocios'),
    tagline: L('Challenges about your own BizSim business, in SQL, a spreadsheet, pandas and DAX. The answers change with the business you choose.', 'Retos sobre tu propio negocio de BizSim, en SQL, hoja de cálculo, pandas y DAX. Las respuestas cambian con el negocio que elijas.'),
    help: L('Nothing here is locked. Each challenge is checked against your active business, so solving it again with another business is new practice.', 'Aquí no hay nada bloqueado. Cada reto se comprueba con tu negocio activo, así que resolverlo otra vez con otro negocio es práctica nueva.'),
    playHref: function (c) { return c.tool === 'sql' ? '#/lab/biz/' + c.id : '#/biz/play/' + c.id; },
    xpKey: function (c) { return 'biz:' + c.id; },
    xp: function (c) { return c.tool === 'sql' ? 25 + 5 * c.level.n : 20 + 5 * c.level.n; },
    worlds: [sqlWorld, sheetsWorld, pythonWorld, biWorld],
  };
})();
