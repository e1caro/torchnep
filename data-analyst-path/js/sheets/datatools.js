(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var S = (DA.sheets = DA.sheets || {});

  // Data Tools: Sort, Filter, Dedupe, Text-to-Columns, Validation, Pivot Tables, Goal Seek & Scenarios

  // 1. Sort Range / Sheet Table
  S.sortRange = function (sheet, r1, c1, r2, c2, colIdx, ascending) {
    var rows = [];
    for (var r = r1; r <= r2; r++) {
      var row = [];
      for (var c = c1; c <= c2; c++) {
        var cell = sheet.getCell(r, c);
        row.push(cell ? { raw: cell.raw, formula: cell.formula, val: cell.value, fmt: cell.fmt } : null);
      }
      rows.push(row);
    }

    var targetCol = colIdx - c1;
    rows.sort(function (a, b) {
      var va = a[targetCol] ? a[targetCol].val : null;
      var vb = b[targetCol] ? b[targetCol].val : null;
      var cmp = S.sortCmp(va, vb);
      return ascending ? cmp : -cmp;
    });

    for (var i = 0; i < rows.length; i++) {
      for (var j = 0; j < rows[i].length; j++) {
        var tr = r1 + i, tc = c1 + j;
        var target = sheet.ensureCell(tr, tc);
        if (rows[i][j]) {
          target.raw = rows[i][j].raw;
          target.formula = rows[i][j].formula;
          target.value = rows[i][j].val;
          target.fmt = rows[i][j].fmt;
        } else {
          target.raw = null; target.formula = null; target.value = null;
        }
      }
    }
  };

  // 2. Remove Duplicates
  S.removeDuplicates = function (sheet, r1, c1, r2, c2, keyCols) {
    keyCols = keyCols || [c1];
    var seen = new Set();
    var keep = [];

    for (var r = r1; r <= r2; r++) {
      var key = keyCols.map(function (c) { return String(sheet.getVal(r, c)); }).join('||');
      if (!seen.has(key)) {
        seen.add(key);
        var row = [];
        for (var c = c1; c <= c2; c++) {
          var cell = sheet.getCell(r, c);
          row.push(cell ? { raw: cell.raw, formula: cell.formula, val: cell.value, fmt: cell.fmt } : null);
        }
        keep.push(row);
      }
    }

    // clear range and rewrite kept rows
    for (var clrR = r1; clrR <= r2; clrR++) {
      for (var clrC = c1; clrC <= c2; clrC++) {
        var clearTarget = sheet.ensureCell(clrR, clrC);
        clearTarget.raw = null; clearTarget.formula = null; clearTarget.value = null;
      }
    }

    for (var i = 0; i < keep.length; i++) {
      for (var j = 0; j < keep[i].length; j++) {
        var tCell = sheet.ensureCell(r1 + i, c1 + j);
        if (keep[i][j]) {
          tCell.raw = keep[i][j].raw;
          tCell.formula = keep[i][j].formula;
          tCell.value = keep[i][j].val;
          tCell.fmt = keep[i][j].fmt;
        }
      }
    }
    return { before: r2 - r1 + 1, after: keep.length, removed: (r2 - r1 + 1) - keep.length };
  };

  // 3. Text to Columns
  S.textToColumns = function (sheet, r1, c1, r2, delimiter) {
    delimiter = delimiter || ',';
    for (var r = r1; r <= r2; r++) {
      var val = sheet.getVal(r, c1);
      if (typeof val === 'string') {
        var parts = val.split(delimiter);
        for (var p = 0; p < parts.length; p++) {
          var target = sheet.ensureCell(r, c1 + p);
          target.raw = S.parseInput(parts[p].trim());
          target.value = target.raw;
          target.formula = null;
        }
      }
    }
  };

  // 4. Pivot Table Engine
  // config: { rowCol, valCol, aggFn: 'SUM' | 'COUNT' | 'AVERAGE' }
  S.buildPivot = function (sheet, r1, c1, r2, c2, config) {
    var rowKeyCol = config.rowCol;
    var valKeyCol = config.valCol;
    var agg = config.aggFn || 'SUM';

    var groups = {}; // rowKey -> [vals]
    for (var r = r1 + 1; r <= r2; r++) { // skip header
      var rk = String(sheet.getVal(r, rowKeyCol) || '');
      var v = sheet.getVal(r, valKeyCol);
      if (typeof v === 'number') {
        groups[rk] = groups[rk] || [];
        groups[rk].push(v);
      }
    }

    var result = [['Row Labels', agg + ' of Value']];
    var keys = Object.keys(groups).sort();
    var grandTotal = 0, grandCount = 0;

    for (var i = 0; i < keys.length; i++) {
      var arr = groups[keys[i]];
      var sum = arr.reduce(function (a, b) { return a + b; }, 0);
      var calculated = (agg === 'COUNT') ? arr.length : (agg === 'AVERAGE') ? sum / arr.length : sum;
      result.push([keys[i], calculated]);
      grandTotal += sum;
      grandCount += arr.length;
    }

    var totalVal = (agg === 'COUNT') ? grandCount : (agg === 'AVERAGE') ? grandTotal / grandCount : grandTotal;
    result.push(['Grand Total', totalVal]);
    return result;
  };

  // 5. Goal Seek
  // Iteratively tweaks inputCell until targetFormulaCell reaches targetValue
  S.goalSeek = function (wb, targetR, targetC, targetValue, inputR, inputC, maxIter, tol) {
    maxIter = maxIter || 100;
    tol = tol || 0.001;
    var sh = wb.activeSheet();
    var inputCell = sh.ensureCell(inputR, inputC);
    var targetCell = sh.ensureCell(targetR, targetC);

    var currentX = Number(inputCell.value) || 1;
    var step = 0.1;

    for (var iter = 0; iter < maxIter; iter++) {
      inputCell.raw = currentX;
      inputCell.value = currentX;
      wb.recalc();

      var currentY = Number(targetCell.value);
      var diff = currentY - targetValue;
      if (Math.abs(diff) <= tol) {
        return { success: true, iterations: iter, value: currentX };
      }

      // numerical gradient approximation
      inputCell.raw = currentX + step;
      inputCell.value = currentX + step;
      wb.recalc();
      var grad = (Number(targetCell.value) - currentY) / step;

      if (Math.abs(grad) < 1e-9) {
        currentX += (Math.random() - 0.5) * 2;
      } else {
        currentX = currentX - diff / grad;
      }
    }

    return { success: false, iterations: maxIter, value: currentX };
  };

  // 6. Clean Data Steps Pipeline (Power Query-style recorded recipes)
  function Pipeline() {
    this.steps = []; // [{ id, name, type, params }]
  }

  Pipeline.prototype.addStep = function (name, type, params) {
    this.steps.push({ id: Date.now() + Math.random(), name: name, type: type, params: params });
  };

  Pipeline.prototype.removeStep = function (idx) {
    this.steps.splice(idx, 1);
  };

  Pipeline.prototype.apply = function (sheet, r1, c1, r2, c2) {
    for (var i = 0; i < this.steps.length; i++) {
      var st = this.steps[i];
      if (st.type === 'TRIM') {
        for (var r = r1; r <= r2; r++) {
          var v = sheet.getVal(r, st.params.col);
          if (typeof v === 'string') {
            var c = sheet.ensureCell(r, st.params.col);
            c.value = v.trim();
            c.raw = c.value;
          }
        }
      } else if (st.type === 'PROPER') {
        for (var pr = r1; pr <= r2; pr++) {
          var pv = sheet.getVal(pr, st.params.col);
          if (typeof pv === 'string') {
            var pc = sheet.ensureCell(pr, st.params.col);
            pc.value = pv.toLowerCase().replace(/\b\w/g, function (l) { return l.toUpperCase(); });
            pc.raw = pc.value;
          }
        }
      } else if (st.type === 'DEDUPE') {
        S.removeDuplicates(sheet, r1, c1, r2, c2, st.params.keys);
      }
    }
  };

  S.Pipeline = Pipeline;
})();
