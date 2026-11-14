/* Arcade worlds: every arcade game is a map of 4 worlds × 4 levels. Each world introduces a few new concepts and its
 * levels get harder; every level makes new puzzles from a seed, so there is no end to the games in a level.
 *
 * Per game:  { name, icon, tool, blurb, worlds: [{ icon, name, intro, concepts: [...], levels: [{ name, teaches, p }] }] }
 * `p` holds the generator settings of a level (read by arcade-core.js, arcade2-core.js and arcade-sqlgen.js).
 * SQL blocks levels are numbered 1-16 (DA.blockLevels in puzzles.js); the other games use "world-level" keys like "2-3".
 * Level keys are saved progress (state.arcade['xray:2-3'] = best stars): never rename them, only add.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});

  function W(icon, name, intro, concepts, levels) { return { icon: icon, name: name, intro: intro, concepts: concepts, levels: levels }; }
  function L(name, teaches, p) { return { name: name, teaches: teaches, p: p || {} }; }

  DA.arcadeCatalog = {
    blocks: {
      name: 'SQL blocks', icon: '🧱', tool: 'SQL', blurb: 'Build real queries by tapping tiles: no typing.',
      // levels are DA.blockLevels[n - 1]; the worlds group them four by four
      worlds: [
        W('🟢', 'First queries', 'Every query starts with SELECT and FROM. Then you sort, filter, count and group.',
          ['SELECT and FROM', 'WHERE filters rows', 'COUNT, SUM, AVG', 'GROUP BY'], [1, 2, 3, 4]),
        W('🔗', 'Combine and reshape', 'Real questions need more than one table, dates, labels and running totals.',
          ['JOIN', 'Dates and CASE', 'Subqueries and CTEs', 'Window functions'], [5, 6, 7, 8]),
        W('🧽', 'Clean data', 'Real tables have gaps, messy text and duplicates. Clean them inside the query.',
          ['NULL and COALESCE', 'LOWER, TRIM, LIKE', 'ROUND and decimals', 'Duplicates'], [9, 10, 11, 12]),
        W('📈', 'Analyst patterns', 'The queries analysts write every week: rates, missing matches, top N per group and funnels.',
          ['SUM(CASE WHEN …)', 'Anti-joins', 'Top N per group', 'Conversion rates'], [13, 14, 15, 16]),
      ],
    },

    xray: {
      name: 'Formula X-ray', icon: '🩻', tool: 'Excel', blurb: 'Tap the cells a formula really uses, then see what it returns.',
      worlds: [
        W('📏', 'Ranges', 'A range is a block of cells, like C2:C5. Most formulas read a range and boil it down to one number.',
          ['Ranges like C2:C5', 'SUM and AVERAGE', 'MAX, MIN, LARGE', 'Blanks and text'], [
            L('Add a range', 'SUM over one range', { kinds: ['sum'], rows: 6 }),
            L('Two ranges and averages', 'SUM of two ranges, AVERAGE', { kinds: ['sum2', 'avg'], rows: 6 }),
            L('Who is the biggest?', 'MAX, MIN and LARGE pick one cell', { kinds: ['max', 'min', 'large2'], rows: 7 }),
            L('Counting cells', 'COUNT, COUNTA and COUNTBLANK', { kinds: ['count', 'counta', 'countblank'], rows: 7, blanks: true }),
          ]),
        W('🎯', 'One condition', 'Add a condition and the formula only reads the rows that pass it.',
          ['COUNTIF', 'SUMIF and AVERAGEIF', 'Criteria like ">2"', 'Not equal: "<>"'], [
            L('Count by text', 'COUNTIF with a word', { kinds: ['countif'], rows: 7 }),
            L('Count by number', 'COUNTIF with > and >=', { kinds: ['countgt', 'countge'], rows: 7 }),
            L('Add the matching rows', 'SUMIF and AVERAGEIF', { kinds: ['sumif', 'avgif'], rows: 7 }),
            L('Everything except', 'Criteria with <>', { kinds: ['countne', 'sumifne'], rows: 8 }),
          ]),
        W('🧩', 'Many conditions', 'Each extra criteria pair narrows the rows: every condition must be true.',
          ['COUNTIFS and SUMIFS', 'AND between criteria', 'Wildcards * and ?', 'A limit in a cell'], [
            L('Two conditions', 'COUNTIFS', { kinds: ['countifs'], rows: 8 }),
            L('Sum with two conditions', 'SUMIFS with text and numbers', { kinds: ['sumifs', 'sumifsnum'], rows: 8 }),
            L('Wildcards', '"L*" and "*on" in criteria', { kinds: ['wild', 'wildsum'], rows: 8 }),
            L('The limit lives in a cell', '">="&F1 builds the criteria', { kinds: ['cellcrit', 'cellsum'], rows: 8 }),
          ]),
        W('🔎', 'Lookups and arrays', 'A lookup returns one cell and an array formula many. Knowing which cell comes back is half of debugging.',
          ['XLOOKUP: the first match', 'VLOOKUP column numbers', 'INDEX and MATCH', 'FILTER and SUMPRODUCT'], [
            L('XLOOKUP', 'Which match comes back', { kinds: ['xlookup'], rows: 8 }),
            L('VLOOKUP', 'The column number counts from the left', { kinds: ['vlookup'], rows: 8 }),
            L('INDEX and MATCH', 'MATCH finds the row, INDEX reads it', { kinds: ['indexmatch'], rows: 8 }),
            L('Arrays', 'FILTER and SUMPRODUCT', { kinds: ['filter', 'sumproduct'], rows: 8 }),
          ]),
      ],
    },

    pipe: {
      name: 'Pandas pipeline', icon: '🐼', tool: 'Python', blurb: 'Chain operation cards until your table matches the target.',
      worlds: [
        W('👀', 'Look at the table', 'Sort, pick columns and keep the first rows: the moves you make on every new dataset.',
          ['sort_values', 'head and tail', 'Choosing columns', 'nlargest'], [
            L('Sort it', 'sort_values, then head', { kinds: ['sorttop', 'sortlow'], rows: 6, decoys: 3 }),
            L('Pick columns', 't[["a", "b"]]', { kinds: ['cols'], rows: 6, decoys: 3 }),
            L('Shortcuts', 'nlargest and nsmallest', { kinds: ['nlargest', 'nsmallest'], rows: 7, decoys: 4 }),
            L('Three steps', 'Columns, sort and head together', { kinds: ['cols3'], rows: 7, decoys: 4 }),
          ]),
        W('🔍', 'Filter rows', 'A condition inside t[...] keeps only the rows where it is True.',
          ['Boolean masks', '== and >=', 'isin', '& and |'], [
            L('Keep one value', 't[t["channel"] == "pickup"]', { kinds: ['eq'], rows: 7, decoys: 3 }),
            L('Numbers', '>=, < and friends', { kinds: ['ge', 'lt'], rows: 7, decoys: 4 }),
            L('One of several', 'isin([...])', { kinds: ['isin'], rows: 8, decoys: 4 }),
            L('Both or either', '& and | with brackets', { kinds: ['and', 'or'], rows: 8, decoys: 5 }),
          ]),
        W('📦', 'Group and summarise', 'groupby splits the table, a summary squeezes each group into one row.',
          ['groupby', 'sum, mean, count', 'value_counts', 'reset_index'], [
            L('Totals per group', 'groupby(...).sum()', { kinds: ['gsum'], rows: 7, decoys: 3 }),
            L('Other summaries', 'mean, count and max', { kinds: ['gmean', 'gcount', 'gmax'], rows: 8, decoys: 4 }),
            L('Filter, then group', 'Order of steps matters', { kinds: ['fgroup'], rows: 8, decoys: 4 }),
            L('Counts and shares', 'value_counts and reset_index', { kinds: ['vc', 'vcnorm', 'reset'], rows: 8, decoys: 5 }),
          ]),
        W('🧽', 'Clean and reshape', 'Fix gaps and duplicates first, then build new columns and reshape the table.',
          ['dropna and fillna', 'drop_duplicates', 'assign', 'pivot_table and merge'], [
            L('Missing values', 'dropna and fillna', { kinds: ['dropna', 'fillna'], rows: 8, decoys: 4, missing: true }),
            L('Duplicates', 'drop_duplicates before counting', { kinds: ['dedupe'], rows: 8, decoys: 4, dupes: true }),
            L('New columns', 'assign revenue, then group', { kinds: ['revenue'], rows: 8, decoys: 5 }),
            L('Reshape', 'pivot_table and merge', { kinds: ['pivot', 'merge'], rows: 8, decoys: 5 }),
          ]),
      ],
    },

    safe: {
      name: 'Slicer safe', icon: '🔐', tool: 'Power BI', blurb: 'Set the slicers so the KPI card shows the secret number.',
      worlds: [
        W('🎚️', 'Slicers filter', 'A slicer filters the rows a measure sees. Two slicers filter together.',
          ['Slicers', 'Filter context', 'SUM and DISTINCTCOUNT', 'Combinations'], [
            L('One slicer', 'A slicer filters the sum', { measures: ['sum'], slicers: 1 }),
            L('Two slicers', 'Both filters apply at once', { measures: ['sum', 'rows'], slicers: 2 }),
            L('Counting distinct', 'DISTINCTCOUNT of orders and customers', { measures: ['orders', 'cust'], slicers: 2 }),
            L('Three slicers', 'More slicers, more combinations', { measures: ['sum', 'orders'], slicers: 3 }),
          ]),
        W('🎛️', 'CALCULATE takes over', 'CALCULATE changes the filters before the measure runs: some slicers stop mattering.',
          ['CALCULATE', 'ALL removes a filter', 'A filter argument replaces the slicer', 'REMOVEFILTERS'], [
            L('ALL ignores a slicer', 'ALL(column) inside CALCULATE', { measures: ['allch', 'allcity'], slicers: 2 }),
            L('Fixed filters', 'Sales[channel] = "delivery" wins', { measures: ['fixch', 'fixcat'], slicers: 2 }),
            L('Remove filters', 'REMOVEFILTERS and ALL', { measures: ['rmcat', 'allch'], slicers: 3 }),
            L('Which slicers matter?', 'All of the above, three slicers', { measures: ['allch', 'allcity', 'fixch', 'fixcat', 'rmcat'], slicers: 3 }),
          ]),
        W('➗', 'Ratios and averages', 'DIVIDE turns two numbers into a share; an average depends on what it averages over.',
          ['DIVIDE', 'Share of a total', 'AVERAGE vs AVERAGEX', 'SUMX revenue'], [
            L('Share of all cities', 'DIVIDE with ALL(city)', { measures: ['share'], slicers: 2 }),
            L('Share within the city', 'DIVIDE with ALL(channel)', { measures: ['chshare'], slicers: 2 }),
            L('Averages', 'AVERAGE price, AVERAGEX of line values', { measures: ['avgprice', 'avgline'], slicers: 2 }),
            L('Revenue and shares', 'SUMX and DIVIDE, three slicers', { measures: ['rev', 'share', 'chshare'], slicers: 3 }),
          ]),
        W('📅', 'Time and ranking', 'Time intelligence moves the dates in the filter; RANKX compares one value with all the others.',
          ['A month slicer', 'DATEADD: last month', 'TOTALYTD: so far this year', 'RANKX'], [
            L('Pick a month', 'The month slicer', { measures: ['month'], slicers: 2, need: ['month'] }),
            L('Last month', 'DATEADD(…, -1, MONTH)', { measures: ['prev'], slicers: 2, need: ['month'] }),
            L('Year to date', 'TOTALYTD adds up to the month', { measures: ['ytd'], slicers: 2, need: ['month'] }),
            L('Rank the cities', 'RANKX(ALL(city), …)', { measures: ['rank'], slicers: 2, need: ['city'] }),
          ]),
      ],
    },

    pills: {
      name: 'Pill match', icon: '💊', tool: 'Tableau', blurb: 'Drop blue and green pills on the shelves to rebuild a chart.',
      worlds: [
        W('🔵', 'Blue and green', 'Blue pills (dimensions) cut the view into bars; green pills (measures) give each bar its length.',
          ['Dimensions are blue', 'Measures are green', 'Rows and Columns', 'Sorting'], [
            L('First chart', 'One dimension, one measure', { dims: ['city', 'channel'], meas: ['sumqty', 'orders'] }),
            L('More pills', 'Four dimensions to choose from', { dims: ['city', 'channel', 'category', 'segment'], meas: ['sumqty', 'orders', 'revenue'] }),
            L('Sort the bars', 'Largest first, smallest first', { dims: ['city', 'channel', 'category'], meas: ['sumqty', 'revenue'], sort: true }),
            L('Any chart', 'Every pill and every sort', { dims: ['city', 'channel', 'category', 'segment'], meas: ['sumqty', 'orders', 'customers', 'revenue', 'avgprice'], sort: true }),
          ]),
        W('🧮', 'Aggregations', 'The same field tells a different story with SUM, AVG, MIN, MAX or COUNTD.',
          ['SUM vs AVG', 'MIN and MAX', 'COUNT vs COUNTD', 'Same field, different story'], [
            L('Sum or average', 'SUM(qty) vs AVG(qty)', { dims: ['city', 'channel', 'category'], meas: ['sumqty', 'avgqty'] }),
            L('Min and max', 'The cheapest and dearest line', { dims: ['category', 'channel', 'city'], meas: ['minprice', 'maxprice', 'avgprice'] }),
            L('Distinct counts', 'Lines, orders or customers?', { dims: ['city', 'channel', 'segment'], meas: ['lines', 'orders', 'customers'] }),
            L('Every aggregation', 'All of them, with sorting', { dims: ['city', 'channel', 'category', 'segment'], meas: ['sumqty', 'avgqty', 'minprice', 'maxprice', 'lines', 'orders', 'customers'], sort: true }),
          ]),
        W('🧹', 'Filters', 'A filter removes rows before the bars are drawn, even a filter on a field that is not on the shelves.',
          ['The Filters shelf', 'Filter a hidden field', 'Top N', 'Filters change every bar'], [
            L('One filter', 'Keep one value of another field', { dims: ['city', 'category'], meas: ['sumqty', 'orders'], filter: true }),
            L('Filter and sort', 'A filter plus a sort', { dims: ['city', 'channel', 'category'], meas: ['sumqty', 'revenue', 'orders'], filter: true, sort: true }),
            L('Top N', 'Keep the top 3 bars', { dims: ['city', 'category', 'segment'], meas: ['sumqty', 'revenue', 'customers'], top: true }),
            L('Filter and Top N', 'Both at once', { dims: ['city', 'channel', 'category', 'segment'], meas: ['sumqty', 'revenue', 'orders', 'customers'], filter: true, top: true }),
          ]),
        W('📐', 'Table calculations', 'A quick table calculation works on the bars themselves: shares, running totals and ranks.',
          ['Percent of total', 'Running total', 'Rank', 'Calculations follow the sort'], [
            L('Percent of total', 'Each bar as a share of all bars', { dims: ['city', 'channel', 'category'], meas: ['sumqty', 'revenue'], calc: ['pct'] }),
            L('Running total', 'Each bar adds the ones before it', { dims: ['city', 'channel', 'category'], meas: ['sumqty', 'orders'], calc: ['run'] }),
            L('Rank', 'The biggest bar gets 1', { dims: ['city', 'category', 'segment'], meas: ['sumqty', 'revenue', 'customers'], calc: ['rank'] }),
            L('Any calculation', 'Calculation, filter and sort', { dims: ['city', 'channel', 'category', 'segment'], meas: ['sumqty', 'revenue', 'orders'], calc: ['pct', 'run', 'rank'], filter: true }),
          ]),
      ],
    },

    corr: {
      name: 'Guess the correlation', icon: '🎯', tool: 'Statistics', blurb: 'Read a scatter plot and estimate r.',
      worlds: [
        W('☁️', 'Read the cloud', 'r runs from −1 (a perfect falling line) to +1 (a perfect rising line). The tighter the cloud, the bigger |r|.',
          ['Direction: rising or falling', 'Strength: how tight', 'r from −1 to +1'], [
            L('Strong or weak?', 'Clear patterns first', { kind: 'strong', n: 50, tol: 0.15 }),
            L('Any direction', 'Rising, falling or neither', { kind: 'cloud', n: 50, tol: 0.15 }),
            L('Sharper eyes', 'Closer guesses for three stars', { kind: 'cloud', n: 50, tol: 0.1 }),
            L('Fewer points', '30 points per plot', { kind: 'cloud', n: 30, tol: 0.1 }),
          ]),
        W('🌫️', 'Weak relationships', 'Most real relationships are weak: 0.2 to 0.5 is common. Small samples make the picture noisy.',
          ['Weak is common', '0.2 to 0.5', 'Small samples are noisy'], [
            L('Moderate', 'r between 0.2 and 0.6, either sign', { kind: 'moderate', n: 60, tol: 0.12 }),
            L('Weak', 'r below 0.4', { kind: 'weak', n: 60, tol: 0.1 }),
            L('Close calls', 'Within 0.07 for three stars', { kind: 'moderate', n: 60, tol: 0.07 }),
            L('Only 12 points', 'Tiny samples', { kind: 'small', n: 12, tol: 0.12 }),
          ]),
        W('⚠️', 'Outliers', 'One unusual point can create a correlation, or hide one. Groups can fake a trend.',
          ['One point can create r', 'One point can hide r', 'Clusters'], [
            L('A lonely point', 'An outlier far from the cloud', { kind: 'outlier-make', n: 30, tol: 0.12 }),
            L('Against the trend', 'An outlier that fights the line', { kind: 'outlier-hide', n: 30, tol: 0.12 }),
            L('Two groups', 'Clusters with no trend inside', { kind: 'clusters', n: 40, tol: 0.12 }),
            L('Spot the trap', 'Any of the three', { kind: 'mix3', n: 30, tol: 0.1 }),
          ]),
        W('🌀', 'Shapes that fool r', 'r only measures straight lines. Curves, U-shapes and narrow ranges all mislead it.',
          ['Straight lines only', 'Curves and U-shapes', 'A narrow range shrinks r'], [
            L('Curves', 'Bending but always rising or falling', { kind: 'curve', n: 40, tol: 0.12 }),
            L('U-shapes', 'A clear pattern, r near 0', { kind: 'ushape', n: 40, tol: 0.12 }),
            L('Restricted range', 'Only a slice of the data', { kind: 'range', n: 40, tol: 0.12 }),
            L('Every trap', 'Anything goes', { kind: 'mix4', n: 35, tol: 0.1 }),
          ]),
      ],
    },
  };

  // Display order in the arcade.
  DA.arcadeOrder = ['blocks', 'xray', 'pipe', 'safe', 'pills', 'corr'];

  // Is "game:key" a level that exists? (used to validate saved progress)
  DA.arcadeKeyOk = function (game, key) {
    var g = DA.arcadeCatalog[game];
    if (!g) return false;
    if (game === 'blocks') { var n = Number(key); return String(n) === key && n >= 1 && n <= 16; }
    var m = /^(\d)-(\d)$/.exec(key);
    return !!m && !!g.worlds[m[1] - 1] && !!g.worlds[m[1] - 1].levels[m[2] - 1];
  };
})();
