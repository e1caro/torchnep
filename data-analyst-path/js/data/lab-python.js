/* DotPython worlds, levels and challenges: each one is checked by running a reference solution and comparing result. */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var n = 0;
  function C(title, task, hint, solution, ordered) {
    n++;
    return { id: 'py' + (n < 10 ? '0' : '') + n, title: title, task: task + ' Store it in <code>result</code>.', hint: hint, solution: solution, ordered: !!ordered };
  }
  function ex(title, code, explain) { return { title: title, code: code, explain: explain }; }

  DA.labPython = {
    id: 'python', route: 'python', quest: 'lesson',
    tagline: 'Real pandas syntax in your browser: load, filter, group, join and clean data without installing anything.',
    help: 'Write Python with pandas (pd) and press Run (Ctrl+Enter). Tab indents. The data is already loaded: df (café order lines), customers, stores and messy (hand-typed orders). pd.read_csv("orders.csv") works too. Put your answer in a variable called result, then press Check. DotPython runs a safe subset of Python: no files on your computer, no internet.',
    xpKey: function (c) { return 'py:' + c.id; },
    xp: function (c) { return 15 * c.level.world.n; },
    worlds: [
      { icon: '🐼', title: 'First look at a DataFrame', about: 'Shape, columns, picking columns, filtering and sorting rows.', levels: [
        { title: 'Shape and columns', example: ex('Size of a table', 'rows, cols = df.shape\nprint(rows, "rows and", cols, "columns")\ndf.head()', 'df.shape is a property (no brackets): a tuple (rows, columns). head() shows the first 5 rows.'), challenges: [
          C('Count the rows', 'How many rows (order lines) does <code>df</code> have?', 'Use <code>len(df)</code> or <code>df.shape[0]</code>.', 'result = len(df)'),
          C('Count the columns', 'How many columns does <code>df</code> have?', '<code>df.shape</code> is (rows, columns): take item 1.', 'result = df.shape[1]'),
          C('List the columns', 'Make a Python list with the column names of <code>df</code>.', 'Wrap <code>df.columns</code> in <code>list()</code>.', 'result = list(df.columns)', true)] },
        { title: 'Pick columns', example: ex('One or several columns', 'df["product"]          # one column: a Series\ndf[["product", "qty"]]  # several: a DataFrame', 'One pair of brackets gives a Series. A list inside the brackets (two pairs) gives a smaller DataFrame.'), challenges: [
          C('One column', 'Select the <code>product</code> column of <code>df</code>.', 'Use <code>df["product"]</code>.', 'result = df["product"]', true),
          C('Two columns', 'Select the columns <code>store_city</code> and <code>qty</code>, in that order.', 'Two pairs of brackets: <code>df[["store_city", "qty"]]</code>.', 'result = df[["store_city", "qty"]]', true),
          C('Distinct values', 'Get the distinct categories in <code>df["category"]</code>.', 'Series have a <code>.unique()</code> method.', 'result = df["category"].unique()')] },
        { title: 'Filter rows', example: ex('A condition in brackets', 'df[df["channel"] == "delivery"]\ndf[(df["qty"] >= 2) & (df["store_city"] == "Berlin")]', 'The condition makes a True/False column; df[...] keeps the True rows. Combine conditions with & (and) or | (or), each in brackets.'), challenges: [
          C('Bigger lines', 'Keep the rows of <code>df</code> where <code>qty</code> is 2 or more.', 'Use <code>df[df["qty"] >= 2]</code>.', 'result = df[df["qty"] >= 2]'),
          C('Two conditions', 'Keep the rows sold in <code>Madrid</code> through the <code>delivery</code> channel.', 'Each condition in brackets, joined with &: <code>df[(df["store_city"] == "Madrid") & (df["channel"] == "delivery")]</code>.', 'result = df[(df["store_city"] == "Madrid") & (df["channel"] == "delivery")]'),
          C('A list of values', 'Keep the rows whose product is <code>Latte</code> or <code>Espresso</code>, using <code>isin</code>.', 'Use <code>df[df["product"].isin(["Latte", "Espresso"])]</code>.', 'result = df[df["product"].isin(["Latte", "Espresso"])]')] },
        { title: 'Sort and take the top', example: ex('sort_values', 'df.sort_values("unit_price", ascending=False).head(3)', 'ascending=False sorts from high to low. head(n) keeps the first n rows.'), challenges: [
          C('Most expensive lines', 'Sort <code>df</code> by <code>unit_price</code> from high to low and keep the first 5 rows.', 'Use <code>df.sort_values("unit_price", ascending=False).head(5)</code>.', 'result = df.sort_values("unit_price", ascending=False).head(5)', true),
          C('Two sort keys', 'Sort <code>df</code> by <code>store_city</code> (A to Z) and then by <code>qty</code> (high to low).', 'Pass lists: <code>sort_values(["store_city", "qty"], ascending=[True, False])</code>.', 'result = df.sort_values(["store_city", "qty"], ascending=[True, False])', true),
          C('Top 3, three columns', 'Show <code>order_id</code>, <code>product</code> and <code>qty</code> of the 3 rows with the highest <code>qty</code> (sort high to low, then take 3).', 'Sort, take 3, then pick the columns.', 'result = df.sort_values("qty", ascending=False).head(3)[["order_id", "product", "qty"]]', true)] },
      ] },
      { icon: '📊', title: 'Summaries', about: 'One number from a column, counting values and new columns.', levels: [
        { title: 'One number', example: ex('Column statistics', 'df["qty"].sum()\ndf["unit_price"].mean()', 'sum, mean, median, min, max and count turn a column into one number.'), challenges: [
          C('Units sold', 'Compute the total of the <code>qty</code> column.', 'Use <code>df["qty"].sum()</code>.', 'result = df["qty"].sum()'),
          C('Average price', 'Compute the average <code>unit_price</code>.', 'Use <code>.mean()</code>.', 'result = df["unit_price"].mean()'),
          C('Highest price', 'Find the highest <code>unit_price</code>.', 'Use <code>.max()</code>.', 'result = df["unit_price"].max()')] },
        { title: 'Counting', example: ex('value_counts', 'df["store_city"].value_counts()\ndf["store_city"].nunique()', 'value_counts() counts each value, biggest first. nunique() counts how many different values there are.'), challenges: [
          C('Lines per channel', 'Count the rows for each <code>channel</code>.', 'Use <code>df["channel"].value_counts()</code>.', 'result = df["channel"].value_counts()'),
          C('Distinct customers', 'How many different <code>customer_id</code> values are there?', 'Use <code>.nunique()</code>.', 'result = df["customer_id"].nunique()'),
          C('Shares per category', 'Compute the share of rows in each <code>category</code> (fractions that add up to 1).', 'Use <code>value_counts(normalize=True)</code>.', 'result = df["category"].value_counts(normalize=True)')] },
        { title: 'New columns', example: ex('Column arithmetic', 'df["revenue"] = df["qty"] * df["unit_price"]\ndf["revenue"].sum()', 'Arithmetic on columns works row by row. Assigning to df["name"] adds the column.'), challenges: [
          C('Total revenue', 'Add a <code>revenue</code> column (qty × unit_price) and compute its total.', 'Create the column, then <code>df["revenue"].sum()</code>.', 'df["revenue"] = df["qty"] * df["unit_price"]\nresult = df["revenue"].sum()'),
          C('Price with tax', 'Compute <code>unit_price</code> with 21% tax, rounded to 2 decimals (a Series).', 'Multiply by 1.21, then <code>.round(2)</code>.', 'result = (df["unit_price"] * 1.21).round(2)', true),
          C('Share of big lines', 'Add a True/False column <code>big</code> (qty of 2 or more) and compute the share of True rows.', 'The mean of a True/False column is the share of True.', 'df["big"] = df["qty"] >= 2\nresult = df["big"].mean()')] },
        { title: 'Answer a question', example: ex('Filter, then summarise', 'paris = df[df["store_city"] == "Paris"]\nparis["qty"].sum()', 'Most questions are a filter followed by a summary.'), challenges: [
          C('Delivery in Paris', 'How many rows are <code>delivery</code> orders from <code>Paris</code>?', 'Filter with two conditions, then <code>len(...)</code>.', 'result = len(df[(df["channel"] == "delivery") & (df["store_city"] == "Paris")])'),
          C('Coffee quantity', 'What is the average <code>qty</code> of the <code>Coffee</code> rows?', 'Filter on category, then take the mean of qty.', 'result = df[df["category"] == "Coffee"]["qty"].mean()'),
          C('Revenue in Berlin', 'What is the total revenue (qty × unit_price) of the <code>Berlin</code> rows?', 'Filter first, then multiply the two columns and sum.', 'b = df[df["store_city"] == "Berlin"]\nresult = (b["qty"] * b["unit_price"]).sum()')] },
      ] },
      { icon: '🧩', title: 'Group and aggregate', about: 'groupby, several statistics per group, sorting groups.', levels: [
        { title: 'groupby one column', example: ex('Split, apply, combine', 'df.groupby("store_city")["qty"].sum()', 'groupby splits the rows by a column, ["qty"] picks what to summarise, and sum() combines each group into one number.'), challenges: [
          C('Quantity per category', 'Compute the total <code>qty</code> for each <code>category</code>.', 'Use <code>df.groupby("category")["qty"].sum()</code>.', 'result = df.groupby("category")["qty"].sum()'),
          C('Average price per city', 'Compute the average <code>unit_price</code> for each <code>store_city</code>.', 'Use <code>.mean()</code> after the groupby.', 'result = df.groupby("store_city")["unit_price"].mean()'),
          C('Rows per channel', 'Count the rows in each <code>channel</code> with <code>groupby</code> and <code>size()</code>.', 'Use <code>df.groupby("channel").size()</code>.', 'result = df.groupby("channel").size()')] },
        { title: 'Several numbers per group', example: ex('Named aggregation', 'df.groupby("store_city").agg(\n    units=("qty", "sum"),\n    lines=("order_id", "count"),\n)', 'agg with name=("column", "function") makes one named column per statistic.'), challenges: [
          C('Units and customers', 'For each <code>store_city</code>, compute the total <code>qty</code> (column units) and the number of different customers (column customers).', 'Use <code>agg(units=("qty", "sum"), customers=("customer_id", "nunique"))</code>.', 'result = df.groupby("store_city").agg(units=("qty", "sum"), customers=("customer_id", "nunique"))'),
          C('Price range', 'For each <code>category</code>, compute the lowest (low) and highest (high) <code>unit_price</code>.', 'Use <code>agg(low=("unit_price", "min"), high=("unit_price", "max"))</code>.', 'result = df.groupby("category").agg(low=("unit_price", "min"), high=("unit_price", "max"))'),
          C('Two keys', 'Compute the total <code>qty</code> for each combination of <code>store_city</code> and <code>channel</code>.', 'Group by a list: <code>df.groupby(["store_city", "channel"])["qty"].sum()</code>.', 'result = df.groupby(["store_city", "channel"])["qty"].sum()')] },
        { title: 'Sort the groups', example: ex('Biggest groups first', 'df.groupby("product")["qty"].sum().sort_values(ascending=False)', 'A grouped result is a Series: sort it like any other, then head(n) for a top list.'), challenges: [
          C('Best-selling products', 'Total <code>qty</code> per <code>product</code>, sorted from highest to lowest.', 'Group, sum, then <code>sort_values(ascending=False)</code>.', 'result = df.groupby("product")["qty"].sum().sort_values(ascending=False)', true),
          C('Top 3 by revenue', 'The 3 products with the highest total revenue (qty × unit_price), highest first.', 'Create revenue, group by product, sum, sort, head(3).', 'df["revenue"] = df["qty"] * df["unit_price"]\nresult = df.groupby("product")["revenue"].sum().sort_values(ascending=False).head(3)', true),
          C('Big cities only', 'Total <code>qty</code> per <code>store_city</code>, keeping only cities above 1,000.', 'Save the grouped Series, then filter it: <code>s[s > 1000]</code>.', 's = df.groupby("store_city")["qty"].sum()\nresult = s[s > 1000]')] },
        { title: 'Back to a table', example: ex('reset_index and pivot_table', 'df.groupby("category")["qty"].sum().reset_index()\ndf.pivot_table(index="store_city", columns="channel", values="qty", aggfunc="sum")', 'reset_index turns the group names back into a column. pivot_table spreads a second key across the columns.'), challenges: [
          C('A flat table', 'Total <code>qty</code> per <code>category</code> as a DataFrame with two columns (use reset_index).', 'Add <code>.reset_index()</code> at the end.', 'result = df.groupby("category")["qty"].sum().reset_index()'),
          C('Pivot table', 'Total <code>qty</code> with <code>store_city</code> as rows and <code>channel</code> as columns.', 'Use <code>pivot_table(index="store_city", columns="channel", values="qty", aggfunc="sum")</code>.', 'result = df.pivot_table(index="store_city", columns="channel", values="qty", aggfunc="sum")'),
          C('Lines per order', 'On average, how many rows (lines) does an order have? Count rows per <code>order_id</code>, then average.', 'Use <code>df.groupby("order_id").size().mean()</code>.', 'result = df.groupby("order_id").size().mean()')] },
      ] },
      { icon: '🧹', title: 'Clean, join and dates', about: 'Missing values, messy text, merges and dates.', levels: [
        { title: 'Missing values', example: ex('Find and handle gaps', 'messy.isna().sum()\nmessy.dropna(subset=["Customer"])', 'isna() marks missing cells; .sum() counts them per column. dropna removes rows with gaps.'), challenges: [
          C('Gaps per column', 'Count the missing values in each column of <code>messy</code>.', 'Use <code>messy.isna().sum()</code>.', 'result = messy.isna().sum()'),
          C('Drop incomplete rows', 'Remove the rows of <code>messy</code> where <code>Customer</code> is missing.', 'Use <code>messy.dropna(subset=["Customer"])</code>.', 'result = messy.dropna(subset=["Customer"])'),
          C('Remove duplicates', 'How many rows does <code>messy</code> have after removing exact duplicate rows?', 'Use <code>len(messy.drop_duplicates())</code>.', 'result = len(messy.drop_duplicates())')] },
        { title: 'Fix text and numbers', example: ex('The .str accessor', 'messy["City"].str.strip().str.title()\npd.to_numeric(messy["Qty"], errors="coerce")', '.str applies text methods to every value. to_numeric with errors="coerce" turns text it cannot read into NaN.'), challenges: [
          C('Clean city names', 'Clean <code>messy["City"]</code>: remove spaces at both ends and use title case.', 'Chain <code>.str.strip().str.title()</code>.', 'result = messy["City"].str.strip().str.title()', true),
          C('Quantities as numbers', 'Convert <code>messy["Qty"]</code> to numbers; words like "three" become NaN.', 'Use <code>pd.to_numeric(..., errors="coerce")</code>.', 'result = pd.to_numeric(messy["Qty"], errors="coerce")', true),
          C('How many cities really', 'After cleaning <code>City</code> (strip + title), how many different cities are there?', 'Clean, then <code>.nunique()</code>.', 'result = messy["City"].str.strip().str.title().nunique()')] },
        { title: 'Join tables', example: ex('merge', 'df.merge(customers, on="customer_id", how="left")', 'merge matches rows on a key column. how="left" keeps every row of the left table.'), challenges: [
          C('Shape after a merge', 'Merge <code>df</code> with <code>customers</code> on <code>customer_id</code> (how="left") and give the shape of the result.', 'Use <code>.shape</code> (no brackets) on the merged DataFrame.', 'result = df.merge(customers, on="customer_id", how="left").shape'),
          C('Quantity per segment', 'Total <code>qty</code> per customer <code>segment</code> (merge with customers first).', 'Merge on customer_id, then groupby segment.', 'result = df.merge(customers, on="customer_id").groupby("segment")["qty"].sum()'),
          C('Older stores', 'How many rows of <code>df</code> come from stores opened before 2021? Join <code>stores</code> on the city (<code>store_city</code> = <code>city</code>).', 'Use <code>merge(stores, left_on="store_city", right_on="city")</code>, then filter <code>opened_year < 2021</code>.', 'm = df.merge(stores, left_on="store_city", right_on="city")\nresult = len(m[m["opened_year"] < 2021])')] },
        { title: 'Dates', example: ex('to_datetime and .dt', 'd = pd.to_datetime(df["order_date"])\nd.dt.month\nd.dt.day_name()', 'Text dates become real dates with to_datetime. The .dt accessor gives the parts: year, month, day, day_name().'), challenges: [
          C('December lines', 'How many rows have an <code>order_date</code> in December?', 'Convert with to_datetime, then count <code>.dt.month == 12</code> with sum().', 'd = pd.to_datetime(df["order_date"])\nresult = (d.dt.month == 12).sum()'),
          C('Quantity per month', 'Total <code>qty</code> per month number (1 to 12).', 'Add a month column from <code>.dt.month</code>, then groupby it.', 'df["month"] = pd.to_datetime(df["order_date"]).dt.month\nresult = df.groupby("month")["qty"].sum()'),
          C('Busiest weekday', 'Which weekday name has the most rows?', 'Make a weekday column with <code>.dt.day_name()</code>, then <code>value_counts().idxmax()</code>.', 'df["weekday"] = pd.to_datetime(df["order_date"]).dt.day_name()\nresult = df["weekday"].value_counts().idxmax()')] },
      ] },
    ],
  };
})();
