/* DotSheets: the original 21 challenges and their checkers (organised into worlds in lab-sheets.js).
 * Each exercise tests cell values and formula logic (not rigid string equality).
 * At least 3 exercises per lesson in Module m1 (l1-1 through l1-7).
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // list of challenges keyed by lesson ID
  DA.sheetsChallenges = [
    // --- Lesson l1-1: Tidy data and cleaning (dataset: 'messy') ---
    {
      id: 's_l1_1_1', lessonId: 'l1-1', ds: 'messy', level: 1,
      title: 'Trim customer names',
      task: 'In an empty column (e.g. column <b>H</b>), use <code>=TRIM(C2)</code> or <code>=PROPER(TRIM(C2))</code> to clean the customer names in row 2 onwards.',
      hint: 'Type <code>=TRIM(C2)</code> into cell H2 and press Enter.',
      check: function (wb) {
        var sh = wb.activeSheet();
        // check cell H2 or any cell in row 2 that applies TRIM to C2
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && cell.value && typeof cell.value === 'string' && cell.formula && /TRIM/i.test(cell.formula)) {
            var rawC2 = sh.getVal(1, 2);
            if (rawC2 && cell.value === rawC2.trim()) return { ok: true, message: 'Customer name cleanly trimmed.' };
          }
        }
        return { ok: false, message: 'No cell found with a =TRIM(...) formula cleaning row 2 customer name.' };
      }
    },
    {
      id: 's_l1_1_2', lessonId: 'l1-1', ds: 'messy', level: 1,
      title: 'Standardize city names with PROPER',
      task: 'In an empty column, use <code>=PROPER(G2)</code> to convert the city name in cell G2 to proper casing.',
      hint: 'Type <code>=PROPER(G2)</code> into an empty cell in row 2.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && cell.formula && /PROPER/i.test(cell.formula)) {
            var val = String(cell.value || '');
            if (val === 'Madrid' || val === 'London' || val === 'Berlin') {
              return { ok: true, message: 'City converted to proper casing.' };
            }
          }
        }
        return { ok: false, message: 'Expected a formula with =PROPER(G2) producing a valid proper-cased city.' };
      }
    },
    {
      id: 's_l1_1_3', lessonId: 'l1-1', ds: 'messy', level: 1,
      title: 'Clean numerical prices',
      task: 'Extract or clean the price in cell F2 into a real number using <code>=VALUE(SUBSTITUTE(F2, "$", ""))</code> or equivalent.',
      hint: 'Use <code>=VALUE(SUBSTITUTE(F2, "$", ""))</code> so it converts into a number.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && typeof cell.value === 'number' && cell.value > 0 && cell.formula && /(VALUE|SUBSTITUTE)/i.test(cell.formula)) {
            return { ok: true, message: 'Price converted to a real numerical value.' };
          }
        }
        return { ok: false, message: 'Price formula with VALUE or SUBSTITUTE not detected in row 2.' };
      }
    },

    // --- Lesson l1-2: Formulas, lookups and pivot tables (dataset: 'retail') ---
    {
      id: 's_l1_2_1', lessonId: 'l1-2', ds: 'retail', level: 2,
      title: 'Compute item line revenue',
      task: 'In column <b>J</b>, compute the total line revenue for row 2 by multiplying quantity (<b>H2</b>) by unit price (<b>I2</b>).',
      hint: 'Enter <code>=H2*I2</code> into cell J2.',
      check: function (wb) {
        var sh = wb.activeSheet();
        var c = sh.getCell(1, 9); // J2
        if (!c) {
          // search any cell in row 2
          for (var col = 8; col < 20; col++) {
            var checkCell = sh.getCell(1, col);
            if (checkCell && typeof checkCell.value === 'number' && checkCell.formula && /H2\s*\*\s*I2|I2\s*\*\s*H2/i.test(checkCell.formula)) {
              c = checkCell;
              break;
            }
          }
        }
        if (c && typeof c.value === 'number' && c.value > 0) {
          var expected = Number(sh.getVal(1, 7)) * Number(sh.getVal(1, 8)); // H2 * I2
          if (Math.abs(c.value - expected) < 0.01) return { ok: true, message: 'Row revenue calculated correctly.' };
        }
        return { ok: false, message: 'Cell J2 should contain =H2*I2 computing the item total.' };
      }
    },
    {
      id: 's_l1_2_2', lessonId: 'l1-2', ds: 'retail', level: 2,
      title: 'Conditional sum with SUMIF',
      task: 'Calculate the total quantity of items sold for category <code>"Coffee"</code> using <code>=SUMIF(G2:G100, "Coffee", H2:H100)</code>.',
      hint: 'In an empty cell, write <code>=SUMIF(G2:G100, "Coffee", H2:H100)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && typeof cell.value === 'number' && cell.formula && /SUMIF/i.test(cell.formula) && /Coffee/i.test(cell.formula)) {
              if (cell.value > 10) return { ok: true, message: 'Coffee quantity aggregated accurately with SUMIF.' };
            }
          }
        }
        return { ok: false, message: 'Could not find a SUMIF formula aggregating Coffee quantity.' };
      }
    },
    {
      id: 's_l1_2_3', lessonId: 'l1-2', ds: 'retail', level: 2,
      title: 'Multi-criteria with COUNTIFS',
      task: 'Count how many orders occurred in <code>"Madrid"</code> with quantity greater than or equal to <code>2</code> using <code>=COUNTIFS(C2:C100, "Madrid", H2:H100, ">=2")</code>.',
      hint: 'Write <code>=COUNTIFS(C2:C100, "Madrid", H2:H100, ">=2")</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && typeof cell.value === 'number' && cell.formula && /COUNTIFS/i.test(cell.formula) && /Madrid/i.test(cell.formula)) {
              if (cell.value >= 1) return { ok: true, message: 'COUNTIFS multi-condition check satisfied.' };
            }
          }
        }
        return { ok: false, message: 'COUNTIFS matching Madrid and qty >= 2 not found.' };
      }
    },

    // --- Lesson l1-3: Your first mini-analysis (dataset: 'retail') ---
    {
      id: 's_l1_3_1', lessonId: 'l1-3', ds: 'retail', level: 2,
      title: 'Calculate average order item quantity',
      task: 'Calculate the average quantity across orders in column H using <code>=AVERAGE(H2:H100)</code>.',
      hint: 'Type <code>=AVERAGE(H2:H100)</code> into an empty cell.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && typeof cell.value === 'number' && cell.formula && /AVERAGE/i.test(cell.formula)) {
              if (cell.value >= 1 && cell.value <= 5) return { ok: true, message: 'Average quantity computed.' };
            }
          }
        }
        return { ok: false, message: 'Missing =AVERAGE(H2:H100) formula.' };
      }
    },
    {
      id: 's_l1_3_2', lessonId: 'l1-3', ds: 'retail', level: 2,
      title: 'Find maximum quantity ordered',
      task: 'Find the maximum quantity ordered in column H using <code>=MAX(H2:H100)</code>.',
      hint: 'Use <code>=MAX(H2:H100)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && typeof cell.value === 'number' && cell.formula && /MAX/i.test(cell.formula)) {
              if (cell.value >= 1) return { ok: true, message: 'Maximum quantity found.' };
            }
          }
        }
        return { ok: false, message: 'Missing =MAX(H2:H100) formula.' };
      }
    },
    {
      id: 's_l1_3_3', lessonId: 'l1-3', ds: 'retail', level: 2,
      title: 'Total revenue using SUMPRODUCT',
      task: 'Calculate the total store revenue directly without adding a helper column using <code>=SUMPRODUCT(H2:H50, I2:I50)</code>.',
      hint: 'Use <code>=SUMPRODUCT(H2:H50, I2:I50)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && typeof cell.value === 'number' && cell.formula && /SUMPRODUCT/i.test(cell.formula)) {
              if (cell.value > 50) return { ok: true, message: 'Total revenue computed via SUMPRODUCT.' };
            }
          }
        }
        return { ok: false, message: 'Formula using SUMPRODUCT not found.' };
      }
    },

    // --- Lesson l1-4: Excel Mastery: Dynamic Arrays, XLOOKUP, INDEX/MATCH and LET (dataset: 'retail') ---
    {
      id: 's_l1_4_1', lessonId: 'l1-4', ds: 'retail', level: 3,
      title: 'Generate distinct sorted categories',
      task: 'Generate an automatic sorted list of unique categories using <code>=SORT(UNIQUE(G2:G50))</code>.',
      hint: 'In cell K2, enter <code>=SORT(UNIQUE(G2:G50))</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /SORT/i.test(cell.formula) && /UNIQUE/i.test(cell.formula)) {
              if (Array.isArray(cell.value) && cell.value.length >= 2) return { ok: true, message: 'Dynamic array spilled sorted unique categories!' };
            }
          }
        }
        return { ok: false, message: 'Expected dynamic array formula =SORT(UNIQUE(...)).' };
      }
    },
    {
      id: 's_l1_4_2', lessonId: 'l1-4', ds: 'retail', level: 3,
      title: 'Modern lookup with XLOOKUP',
      task: 'Look up the product name corresponding to order ID in A2 using <code>=XLOOKUP(A2, A2:A50, F2:F50)</code>.',
      hint: 'Use <code>=XLOOKUP(A2, A2:A50, F2:F50)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /XLOOKUP/i.test(cell.formula)) {
              if (cell.value && typeof cell.value === 'string') return { ok: true, message: 'XLOOKUP returned valid product name.' };
            }
          }
        }
        return { ok: false, message: 'Missing =XLOOKUP(...) formula.' };
      }
    },
    {
      id: 's_l1_4_3', lessonId: 'l1-4', ds: 'retail', level: 3,
      title: 'Dynamic filtering with FILTER',
      task: 'Filter the orders to display only sales from the city <code>"Madrid"</code> using <code>=FILTER(F2:H50, C2:C50="Madrid")</code>.',
      hint: 'In an empty cell, write <code>=FILTER(F2:H50, C2:C50="Madrid")</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /FILTER/i.test(cell.formula) && /Madrid/i.test(cell.formula)) {
              if (Array.isArray(cell.value) && cell.value.length >= 1) return { ok: true, message: 'FILTER spilled matching rows for Madrid.' };
            }
          }
        }
        return { ok: false, message: 'Dynamic =FILTER(...) matching Madrid not found.' };
      }
    },

    // --- Lesson l1-5: Excel Power Query: Repeatable ETL Without Code (dataset: 'messy') ---
    {
      id: 's_l1_5_1', lessonId: 'l1-5', ds: 'messy', level: 3,
      title: 'Check for missing or empty customer records',
      task: 'Identify whether cell C2 has a missing name using <code>=IF(ISBLANK(C2), "Missing", "Valid")</code>.',
      hint: 'Use <code>=IF(ISBLANK(C2), "Missing", "Valid")</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && cell.formula && /ISBLANK/i.test(cell.formula)) {
            return { ok: true, message: 'Missing value audit check verified.' };
          }
        }
        return { ok: false, message: 'Formula using ISBLANK(...) check not found.' };
      }
    },
    {
      id: 's_l1_5_2', lessonId: 'l1-5', ds: 'messy', level: 3,
      title: 'Extract year from order date',
      task: 'Extract the four-digit year from the date in cell B2 using <code>=YEAR(B2)</code> or <code>=LEFT(B2, 4)</code>.',
      hint: 'Use <code>=YEAR(B2)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && cell.formula && /(YEAR|LEFT)/i.test(cell.formula)) {
            if (cell.value == 2025) return { ok: true, message: 'Year 2025 extracted cleanly.' };
          }
        }
        return { ok: false, message: 'Year extraction formula not found.' };
      }
    },
    {
      id: 's_l1_5_3', lessonId: 'l1-5', ds: 'messy', level: 3,
      title: 'Safely handle errors with IFERROR',
      task: 'Protect quantity parsing from errors using <code>=IFERROR(VALUE(E2), 1)</code>.',
      hint: 'Write <code>=IFERROR(VALUE(E2), 1)</code> in an empty cell in row 2.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var c = 0; c < 26; c++) {
          var cell = sh.getCell(1, c);
          if (cell && cell.formula && /IFERROR/i.test(cell.formula)) {
            return { ok: true, message: 'IFERROR resilience guard implemented.' };
          }
        }
        return { ok: false, message: 'Formula using IFERROR not found.' };
      }
    },

    // --- Lesson l1-6: Google Sheets Mastery: QUERY(), ARRAYFORMULA and Regex (dataset: 'retail') ---
    {
      id: 's_l1_6_1', lessonId: 'l1-6', ds: 'retail', level: 3,
      title: 'Combine columns with TEXTJOIN',
      task: 'Combine city and channel for row 2 separated by a hyphen using <code>=TEXTJOIN(" - ", TRUE, C2, D2)</code>.',
      hint: 'Use <code>=TEXTJOIN(" - ", TRUE, C2, D2)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /TEXTJOIN/i.test(cell.formula)) {
              if (typeof cell.value === 'string' && cell.value.indexOf('-') >= 0) {
                return { ok: true, message: 'TEXTJOIN joined text values.' };
              }
            }
          }
        }
        return { ok: false, message: 'Formula using TEXTJOIN not found.' };
      }
    },
    {
      id: 's_l1_6_2', lessonId: 'l1-6', ds: 'retail', level: 3,
      title: 'Conditional text labeling with IFS or IF',
      task: 'Classify order size in row 2: if quantity <b>H2</b> >= 3 return <code>"Large"</code>, otherwise <code>"Standard"</code>.',
      hint: 'Use <code>=IF(H2>=3, "Large", "Standard")</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /IF/i.test(cell.formula) && (cell.value === 'Large' || cell.value === 'Standard')) {
              return { ok: true, message: 'Order size classified correctly.' };
            }
          }
        }
        return { ok: false, message: 'Classification formula with IF not found.' };
      }
    },
    {
      id: 's_l1_6_3', lessonId: 'l1-6', ds: 'retail', level: 3,
      title: 'Clean distinct product catalogue',
      task: 'Spill a unique list of products from column F using <code>=UNIQUE(F2:F50)</code>.',
      hint: 'In an empty cell, write <code>=UNIQUE(F2:F50)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /UNIQUE/i.test(cell.formula)) {
              if (Array.isArray(cell.value) && cell.value.length > 2) return { ok: true, message: 'Catalogue spilled with UNIQUE.' };
            }
          }
        }
        return { ok: false, message: 'Expected =UNIQUE(F2:F50) formula.' };
      }
    },

    // --- Lesson l1-7: Spreadsheet Modeling: Scenarios, Cohorts and Error-Proofing (dataset: 'retail') ---
    {
      id: 's_l1_7_1', lessonId: 'l1-7', ds: 'retail', level: 4,
      title: 'Build a parameter-driven tax multiplier',
      task: 'Set tax rate 0.21 in cell <b>M1</b>, and compute tax for row 2 revenue in M2 using <code>=J2*$M$1</code> (absolute reference).',
      hint: 'Put <code>0.21</code> in M1 and <code>=J2*$M$1</code> in M2.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 10; r++) {
          for (var c = 10; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /\$M\$1|\$M1|M\$1/i.test(cell.formula)) {
              return { ok: true, message: 'Absolute reference parameter model built.' };
            }
          }
        }
        return { ok: false, message: 'Formula referencing cell $M$1 not found.' };
      }
    },
    {
      id: 's_l1_7_2', lessonId: 'l1-7', ds: 'retail', level: 4,
      title: 'Reconciliation balance check formula',
      task: 'Create an automated reconciliation check cell: if difference between total revenue and sum of parts is under 0.01 return <code>"✓ Balanced"</code>, else <code>"⚠️ Error"</code>.',
      hint: 'Use <code>=IF(ABS(SUM(H2:H10)-SUM(H2:H10))<0.01, "✓ Balanced", "⚠️ Error")</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /ABS/i.test(cell.formula) && cell.value === '✓ Balanced') {
              return { ok: true, message: 'Reconciliation balance check validated.' };
            }
          }
        }
        return { ok: false, message: 'Reconciliation check returning "✓ Balanced" not found.' };
      }
    },
    {
      id: 's_l1_7_3', lessonId: 'l1-7', ds: 'retail', level: 4,
      title: 'Compact calculation with LET',
      task: 'Use the <code>LET</code> function to name quantity and unit price in a single formula: <code>=LET(q, H2, p, I2, q*p)</code>.',
      hint: 'Type <code>=LET(q, H2, p, I2, q*p)</code>.',
      check: function (wb) {
        var sh = wb.activeSheet();
        for (var r = 0; r < 20; r++) {
          for (var c = 9; c < 20; c++) {
            var cell = sh.getCell(r, c);
            if (cell && cell.formula && /LET/i.test(cell.formula)) {
              if (typeof cell.value === 'number' && cell.value > 0) return { ok: true, message: 'LET scoped calculation executed cleanly.' };
            }
          }
        }
        return { ok: false, message: 'Formula using LET(...) not found.' };
      }
    }
  ];
})();
